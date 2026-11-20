import { archivedChatAttachments, type ArchivedChatAttachments } from '../core/chat-attachments';
import { scopePersistenceName } from '../core/storage-scope';
import type { ChatImportRules } from './chat-import-model';
import { chatFileId, type ChatFileKind } from './chat-file-model';

export interface ChatFileWitness { id: string; peer: number; sentAt: number }
export interface ChatFileCandidate {
  id: string; kind: ChatFileKind; assetId: string; sources: ChatFileWitness[];
}
interface Message extends ChatFileWitness { refs: ArchivedChatAttachments | undefined }
export interface ChatFileHistorySnapshot {
  candidates: ChatFileCandidate[]; messages: number; excluded: number;
}
const MAX_ROWS = 20000;
const member = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const time = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 8640000000000000;
const object = (v: unknown): Record<string, unknown> | undefined => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : undefined;

function message(value: unknown, key: IDBValidKey): Message | undefined {
  const m = object(value);
  if (!m || typeof m.id !== 'string' || !m.id || m.id.length > 256 || m.id !== key || !member(m.peerNumber) || !time(m.sentAt) ||
    !['incoming','outgoing'].includes(String(m.direction))) return;
  const live = m.cloudMediaIds !== undefined || m.cloudAudioIds !== undefined;
  const refs = m.delivery !== undefined && !['sent','delivered','read'].includes(String(m.delivery)) ? undefined : live ? archivedChatAttachments({version:1,images:m.cloudMediaIds ?? [],audio:m.cloudAudioIds ?? []}) :
    m.cloudId === undefined ? archivedChatAttachments(m.archivedAttachments) : undefined;
  return {id:m.id,peer:m.peerNumber,sentAt:m.sentAt,refs};
}

function policy(rules: ChatImportRules, now: number): (m: ChatFileWitness) => boolean {
  const p = rules.policy;
  if (!rules.saveHistory) throw new Error('Enable saved chat history before reviewing its files.');
  if (!Number.isFinite(rules.retentionDays) || rules.retentionDays <= 0 || !member(rules.maxMessages) || !p || !time(p.clearedAt) || !time(p.prunedBefore) ||
    !Array.isArray(p.deletedPeers) || !Array.isArray(p.prunedPeers) || [...p.deletedPeers,...p.prunedPeers].some(row => !Array.isArray(row) || row.length !== 2 || !member(row[0]) || !time(row[1])))
    throw new Error('The saved chat history policy is unsupported.');
  const deleted = new Map(p.deletedPeers), pruned = new Map(p.prunedPeers), oldest = now-rules.retentionDays*86400000;
  return m => m.sentAt >= oldest && m.sentAt <= now+300000 && m.sentAt > p.clearedAt && m.sentAt >= p.prunedBefore &&
    m.sentAt > (deleted.get(m.peer) ?? 0) && m.sentAt >= (pruned.get(m.peer) ?? 0);
}

/** Selects references only. Message text, archived URLs and actions are never copied. */
export function collectChatFileCandidates(rows: {key:IDBValidKey;value:unknown}[], conversations: {key:IDBValidKey;value:unknown}[], rules: ChatImportRules, now: number): ChatFileHistorySnapshot {
  if (rows.length+conversations.length > MAX_ROWS) throw new Error('There are too many saved chat records for one file review.');
  const allowed = policy(rules,now), visible = new Set<number>(), parsed: Message[] = [];
  let excluded = 0;
  for (const row of conversations) { const c = object(row.value); if (c && member(c.peerNumber) && c.peerNumber === row.key && c.hiddenAt === undefined) visible.add(c.peerNumber); }
  for (const row of rows) { const m = message(row.value,row.key); if (m && visible.has(m.peer) && allowed(m)) parsed.push(m); else excluded++; }
  parsed.sort((a,b) => b.sentAt-a.sentAt || a.id.localeCompare(b.id));
  const perPeer = new Map<number,number>(), files = new Map<string,ChatFileCandidate>();
  for (const m of parsed) {
    const count = (perPeer.get(m.peer) ?? 0)+1; perPeer.set(m.peer,count);
    if (count > rules.maxMessages) { excluded++; continue; }
    if (!m.refs) continue;
    for (const [kind,ids] of [['image',m.refs.images],['audio',m.refs.audio]] as const) for (const assetId of ids) {
      const id = chatFileId(kind,assetId), candidate = files.get(id) ?? {id,kind,assetId,sources:[]};
      candidate.sources.push({id:m.id,peer:m.peer,sentAt:m.sentAt}); files.set(id,candidate);
    }
  }
  return {candidates:[...files.values()],messages:rows.length,excluded};
}

/** Native readonly access, with no implicit creation, upgrades, history repair or receipts. */
export class ChatFileBatchSource {
  readonly name: string;
  constructor(readonly owner: number, readonly factory: IDBFactory = indexedDB) {
    if (!member(owner)) throw new Error('A signed-in account is required.');
    this.name = scopePersistenceName(`kikilink-account-${owner}`);
  }
  async snapshot(rules: ChatImportRules, current: () => boolean, signal: AbortSignal): Promise<ChatFileHistorySnapshot> {
    const check = this.#check(rules,current,signal); policy(rules,Date.now());
    const db = await this.#open(check,signal); if (!db) return {candidates:[],messages:0,excluded:0};
    try {
      return await this.#transaction<ChatFileHistorySnapshot>(db,check,signal,(tx,done) => {
        const rows: {key:IDBValidKey;value:unknown}[] = [], conversations: typeof rows = []; let finished = 0;
        for (const name of ['messages','conversations']) {
          const request = tx.objectStore(name).openCursor();
          request.onsuccess = () => {
            try {
              check(); const cursor = request.result;
              if (!cursor) { if (++finished === 2) done(collectChatFileCandidates(rows,conversations,rules,Date.now())); return; }
              if (rows.length+conversations.length >= MAX_ROWS) throw new Error('There are too many saved chat records for one file review.');
              // Do not retain message bodies or unrelated native values while scanning.
              const raw = object(cursor.value), value = name === 'messages' && raw ? {
                id:raw.id,peerNumber:raw.peerNumber,sentAt:raw.sentAt,direction:raw.direction,delivery:raw.delivery,
                archivedAttachments:message(raw,cursor.primaryKey)?.refs,
              } : raw ? {peerNumber:raw.peerNumber,hiddenAt:raw.hiddenAt} : undefined;
              (name === 'messages' ? rows : conversations).push({key:cursor.primaryKey,value}); cursor.continue();
            } catch(e) { done(undefined,e); }
          };
        }
      });
    } finally { db.close(); }
  }
  async witness(candidate: ChatFileCandidate, rules: ChatImportRules, current: () => boolean, signal: AbortSignal): Promise<ChatFileWitness | undefined> {
    const check = this.#check(rules,current,signal), allowed = policy(rules,Date.now());
    const db = await this.#open(check,signal); if (!db) return;
    try {
      return await this.#transaction<ChatFileWitness | undefined>(db,check,signal,(tx,done) => {
        let index = 0;
        const next = () => {
          try {
            check(); const expected = candidate.sources[index++]; if (!expected) { done(undefined); return; }
            const request = tx.objectStore('messages').get(expected.id);
            request.onsuccess = () => {
              try {
                check(); const m = message(request.result,expected.id);
                if (!m || m.peer !== expected.peer || m.sentAt !== expected.sentAt || !allowed(m) || !m.refs?.[candidate.kind === 'image' ? 'images' : 'audio'].includes(candidate.assetId)) { next(); return; }
                const conversation = tx.objectStore('conversations').get(m.peer);
                conversation.onsuccess = () => {
                  try { check(); const c = object(conversation.result); if (c?.peerNumber === m.peer && c.hiddenAt === undefined) done({id:m.id,peer:m.peer,sentAt:m.sentAt}); else next(); }
                  catch(e) { done(undefined,e); }
                };
              } catch(e) { done(undefined,e); }
            };
          } catch(e) { done(undefined,e); }
        }; next();
      });
    } finally { db.close(); }
  }
  #check(rules: ChatImportRules, current: () => boolean, signal: AbortSignal): () => void {
    if (rules.database !== this.name) throw new Error('Chat storage does not match this account.');
    return () => { if (signal.aborted || !current()) throw new Error('Chat file review cancelled.'); };
  }
  async #open(check: () => void, signal: AbortSignal): Promise<IDBDatabase | undefined> {
    check(); if (typeof this.factory.databases !== 'function') throw new Error('This browser cannot safely inspect saved chat history.');
    const entry = (await this.factory.databases()).find(d => d.name === this.name); check(); if (!entry) return;
    if (entry.version !== 1) throw new Error('Saved chat history needs a newer KikiLink version.');
    return new Promise((resolve,reject) => {
      let settled = false; const request = this.factory.open(this.name);
      const clean = () => { clearTimeout(timer); signal.removeEventListener('abort',fail); };
      const fail = () => { if (settled) return; settled = true; clean(); reject(new Error('Saved chat history could not be opened safely.')); };
      const timer = setTimeout(fail,10000); signal.addEventListener('abort',fail,{once:true});
      request.onerror = request.onblocked = fail;
      request.onupgradeneeded = () => { request.transaction?.abort(); fail(); };
      request.onsuccess = () => {
        const db = request.result; if (settled) { db.close(); return; }
        try { check(); if (db.version !== 1 || [...db.objectStoreNames].sort().join(',') !== 'conversations,messages') throw new Error(); }
        catch { db.close(); fail(); return; }
        settled = true; clean(); db.onversionchange = () => db.close(); resolve(db);
      };
    });
  }
  #transaction<T>(db: IDBDatabase, check: () => void, signal: AbortSignal, start: (tx: IDBTransaction, done: (result: T | undefined, error?: unknown) => void) => void): Promise<T> {
    return new Promise((resolve,reject) => {
      check(); const tx = db.transaction(['messages','conversations'],'readonly'); let value: T | undefined, ready = false, error: unknown;
      const abort = () => { try { tx.abort(); } catch { /* Already complete. */ } };
      const timer = setTimeout(abort,30000); signal.addEventListener('abort',abort,{once:true}); db.onversionchange = abort;
      const clean = () => { clearTimeout(timer); signal.removeEventListener('abort',abort); };
      tx.onabort = () => { clean(); reject(error ?? new Error('Saved chat history could not be read completely.')); };
      tx.oncomplete = () => { clean(); try { check(); if (!ready) throw new Error('Saved chat history review was incomplete.'); resolve(value!); } catch(e) { reject(e); } };
      try {
        for (const name of ['messages','conversations']) { const store = tx.objectStore(name); if (store.keyPath !== (name === 'messages' ? 'id' : 'peerNumber') || store.autoIncrement) throw new Error('The saved chat history layout is unsupported.'); }
        start(tx,(result,reason) => { if (reason !== undefined) { error = reason; abort(); } else { value = result; ready = true; } });
      } catch(e) { error = e; abort(); }
    });
  }
}
