import type { ConversationMeta, LinkMessage } from '../core/types';
import { exportValueEncoder } from './device-data-export';
import {readArchivedChatFields,type PreparedChatArchiveFields} from './chat-archived-fields';

export interface ChatImportPolicy { clearedAt: number; prunedBefore: number; deletedPeers: Array<[number,number]>; prunedPeers: Array<[number,number]> }
export interface ChatImportRules { database: string; saveHistory: boolean; retentionDays: number; maxMessages: number; policy: ChatImportPolicy }
export interface ChatRows { messages: Array<{key: IDBValidKey; value: unknown}>; conversations: Array<{key: IDBValidKey; value: unknown}> }
export interface ChatImportPlan {
  messages: LinkMessage[]; conversations: ConversationMeta[]; source: string; before: string;
  duplicates: number; conflicts: number; excluded: number;
}
export const CHAT_IMPORT_RECOVERY_KEY = 'kikilink:chat-import-recovery:v1';
export const CHAT_IMPORT_SOURCE_LIMIT = 2*1024*1024;
export const CHAT_IMPORT_RECOVERY_LIMIT = 4*1024*1024;
const bytes = (s: string) => new TextEncoder().encode(s).length;
const fail = (): never => { throw new Error('This chat history has unsupported records. No history was changed.'); };
const object = (v: unknown): Record<string,any> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string,any> : fail();
const member = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const time = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 8640000000000000;
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

// Only known fields are decoded. Unknown tagged values remain in the preserved source.
function fields(node: unknown): Map<string,unknown> {
  const n = object(node); if (n.type !== 'object' || !Array.isArray(n.entries)) fail();
  return new Map(n.entries);
}
function scalar(node: unknown): any {
  if (node === undefined) return undefined;
  const n = object(node);
  if (n.type === 'value' && (n.value === null || typeof n.value === 'string' || typeof n.value === 'boolean')) return n.value;
  if (n.type === 'number' && typeof n.value === 'number' && Number.isFinite(n.value)) return n.value;
  if (n.type === 'undefined') return undefined;
  return fail();
}
function message(raw: unknown): LinkMessage {
  const m = object(raw);
  if (!text(m.id,256) || !m.id || !member(m.peerNumber) || !text(m.peerName,1000) || !text(m.content,100000) ||
    !time(m.sentAt) || !['incoming','outgoing'].includes(m.direction) || typeof m.includeRoom !== 'boolean' ||
    (m.roomName !== undefined && !text(m.roomName,1000))) fail();
  // Imported history is local text, never a retry, reaction target or forged Cloud read receipt.
  if(m.archivedFields!==undefined){if(typeof m.archivedFields!=='string')fail();readArchivedChatFields(m.archivedFields,'message');}
  return {id:m.id,peerNumber:m.peerNumber,peerName:m.peerName,content:m.content,sentAt:m.sentAt,
    direction:m.direction,includeRoom:m.includeRoom,...(m.roomName !== undefined ? {roomName:m.roomName} : {}),read:true,...(m.archivedFields!==undefined?{archivedFields:m.archivedFields}:{})};
}
const messageKeys = ['id','peerNumber','peerName','content','sentAt','direction','includeRoom','roomName'];
const conversationKeys = ['peerNumber','peerName','localAlias','hiddenAt','pinned','muteUntil'];
export function parseChatImportSource(source: string): {database: string; messages: LinkMessage[]; hints: Map<number,Record<string,any>>} {
  if (bytes(source) > CHAT_IMPORT_SOURCE_LIMIT) throw new Error('The archived chat history is too large for this restore.');
  const db = object(JSON.parse(source)); if (db.version !== 1 || typeof db.name !== 'string' || !Array.isArray(db.stores)) fail();
  const stores = new Map<string,Record<string,any>>(db.stores.map((s: unknown) => [object(s).name,object(s)]));
  const messages = stores.get('messages'), conversations = stores.get('conversations');
  if (!messages || !conversations || messages.keyPath !== 'id' || conversations.keyPath !== 'peerNumber' || messages.autoIncrement || conversations.autoIncrement ||
    !Array.isArray(messages.records) || !Array.isArray(conversations.records) || messages.records.length > 10000 || conversations.records.length > 10000) fail();
  const seen = new Set<string>(), hints = new Map<number,Record<string,any>>();
  const result = messages!.records.map((r: any) => {
    const f = fields(r.value), m = message(Object.fromEntries(messageKeys.map(k => [k,scalar(f.get(k))])));
    if (scalar(r.key) !== m.id || seen.has(m.id)) fail(); seen.add(m.id); return m;
  });
  for (const r of conversations!.records) {
    const f = fields(r.value), c = Object.fromEntries(conversationKeys.map(k => [k,scalar(f.get(k))]));
    if (!member(c.peerNumber) || scalar(r.key) !== c.peerNumber || hints.has(c.peerNumber)) fail();
    if (c.hiddenAt !== undefined && !time(c.hiddenAt)) fail(); hints.set(c.peerNumber,c);
  }
  return {database:db.name,messages:result,hints};
}
export function chatRowsFingerprint(rows: ChatRows): string {
  const files: any[] = [], encoded = exportValueEncoder(files,() => {})(rows);
  if (files.length) throw new Error('The current chat history contains binary data that this recovery copy cannot preserve.');
  const raw = JSON.stringify(encoded); if (bytes(raw) > CHAT_IMPORT_RECOVERY_LIMIT) throw new Error('The current chat history is too large to preserve before import.');
  return raw;
}
export function chatMessageAllowed(m: LinkMessage, rules: ChatImportRules, now: number): boolean {
  const p = rules.policy;
  return m.sentAt >= now-rules.retentionDays*86400000 && m.sentAt <= now+300000 && m.sentAt > p.clearedAt && m.sentAt >= p.prunedBefore &&
    m.sentAt > (new Map(p.deletedPeers).get(m.peerNumber) ?? 0) && m.sentAt >= (new Map(p.prunedPeers).get(m.peerNumber) ?? 0);
}
export function planChatImport(source: string, rows: ChatRows, rules: ChatImportRules, now: number, archived?:PreparedChatArchiveFields): ChatImportPlan {
  if (!rules.saveHistory) throw new Error('Enable saved message history before importing chats.');
  const parsed = parseChatImportSource(source), before = chatRowsFingerprint(rows), existing = new Map<string,LinkMessage>(), conversations = new Map<number,Record<string,any>>();
  if (parsed.database !== rules.database) throw new Error('The archived chat destination does not match this account.');
  for (const r of rows.messages) { const m = message(r.value); if (r.key !== m.id || existing.has(m.id)) fail(); existing.set(m.id,m); }
  for (const r of rows.conversations) { const c = object(r.value); if (!member(c.peerNumber) || r.key !== c.peerNumber || conversations.has(c.peerNumber) || c.hiddenAt !== undefined && !time(c.hiddenAt)) fail(); conversations.set(c.peerNumber,c); }
  const counts = new Map<number,number>(); for (const m of existing.values()) counts.set(m.peerNumber,(counts.get(m.peerNumber) ?? 0)+1);
  const plan: ChatImportPlan = {messages:[],conversations:[],source,before,duplicates:0,conflicts:0,excluded:0};
  for (const m of parsed.messages.sort((a,b) => b.sentAt-a.sentAt || a.id.localeCompare(b.id))) {
    const payload=archived?.messages.get(m.id);if(payload!==undefined){readArchivedChatFields(payload,'message');m.archivedFields=payload;}
    const old = existing.get(m.id);
    if (old) { if (JSON.stringify(old) === JSON.stringify(m)) plan.duplicates++; else plan.conflicts++; continue; }
    if (!m.content || !chatMessageAllowed(m,rules,now) || conversations.get(m.peerNumber)?.hiddenAt !== undefined || parsed.hints.get(m.peerNumber)?.hiddenAt !== undefined || (counts.get(m.peerNumber) ?? 0) >= rules.maxMessages) { plan.excluded++; continue; }
    plan.messages.push(m); counts.set(m.peerNumber,(counts.get(m.peerNumber) ?? 0)+1);
  }
  const peers = new Set(plan.messages.map(m => m.peerNumber));
  for (const peer of peers) if (!conversations.has(peer)) {
    const newest = [...plan.messages,...existing.values()].filter(m => m.peerNumber === peer).sort((a,b) => b.sentAt-a.sentAt)[0]!, hint = parsed.hints.get(peer);
    const payload=archived?.conversations.get(peer);if(payload!==undefined)readArchivedChatFields(payload,'conversation');
    plan.conversations.push({peerNumber:peer,peerName:newest.peerName,lastMessage:newest.content,lastMessageAt:newest.sentAt,lastDirection:newest.direction,unread:0,draft:'',pinned:hint?.pinned === true,...(payload!==undefined?{archivedFields:payload}:{}),
      ...(text(hint?.localAlias,100) ? {localAlias:hint!.localAlias} : {}),...(hint?.muteUntil === -1 || time(hint?.muteUntil) ? {muteUntil:hint!.muteUntil} : {})});
  }
  return plan;
}
export interface ChatRecoveryCopy { id: number; createdAt: number; before: string; source: string; added: string }
export function readChatRecovery(raw: string | null): ChatRecoveryCopy[] {
  if (raw === null) return [];
  if (bytes(raw) > CHAT_IMPORT_RECOVERY_LIMIT) throw new Error('Chat recovery copies exceed the supported limit. They have been kept.');
  try {
    const d = object(JSON.parse(raw));
    if (d.format !== 1 || Object.keys(d).sort().join(',') !== 'copies,format' || !Array.isArray(d.copies) || d.copies.length > 3) fail();
    const ids = new Set<number>();
    for (const c of d.copies) {
      if (Object.keys(c).sort().join(',') !== 'added,before,createdAt,id,source' || !member(c.id) || c.id >= Number.MAX_SAFE_INTEGER || ids.has(c.id) || !time(c.createdAt) || c.createdAt < 1 ||
        typeof c.before !== 'string' || typeof c.source !== 'string' || typeof c.added !== 'string') fail();
      ids.add(c.id); JSON.parse(c.before); parseChatImportSource(c.source);
      const added = JSON.parse(c.added); if (!Array.isArray(added.messages) || !Array.isArray(added.conversations)) fail();
      for (const m of added.messages) message(m);
      for (const c of added.conversations){if (!member(c.peerNumber)) fail();if(c.archivedFields!==undefined){if(typeof c.archivedFields!=='string')fail();readArchivedChatFields(c.archivedFields,'conversation');}}
    }
    return d.copies;
  } catch { throw new Error('Chat recovery copies are unreadable or unsupported. They have been kept unchanged.'); }
}
export function prepareChatRecovery(raw: string | null, plan: ChatImportPlan): {raw: string; copy: ChatRecoveryCopy} {
  const copies = readChatRecovery(raw), added = JSON.stringify({messages:plan.messages,conversations:plan.conversations});
  const known = copies.find(c => c.before === plan.before && c.source === plan.source && c.added === added);
  if (known) return {raw:raw!,copy:known};
  if (copies.length >= 3) throw new Error('Three chat recovery copies are already kept. No history was changed.');
  const id = Math.max(0,...copies.map(c => c.id))+1; if (id >= Number.MAX_SAFE_INTEGER) throw new Error('The chat recovery copy limit has been reached.');
  const copy = {id,createdAt:Date.now(),before:plan.before,source:plan.source,added}; copies.push(copy);
  const next = JSON.stringify({format:1,copies}); if (bytes(next) > CHAT_IMPORT_RECOVERY_LIMIT) throw new Error('There is not enough room for the chat recovery copy. No history was changed.');
  return {raw:next,copy};
}
