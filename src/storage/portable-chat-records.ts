import {cleanBeepMessageContent} from '../bc/message-content';
import {archivedChatAttachments} from '../core/chat-attachments';
import type {ConversationMeta,LinkMessage} from '../core/types';

export interface PortableChatRecords {conversations:ConversationMeta[];messages:LinkMessage[]}
const CONVERSATION_FIELDS=['peerNumber','peerName','localAlias','hiddenAt','lastMessage','lastMessageAt','lastDirection','unread','pinned','draft','muteUntil'] as const;
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const validMemberNumber=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const validTime=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const integerInRange=(value:unknown,min:number,max:number,fallback:number):number=>typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=max?value:fallback;
const cleanText=(value:unknown,limit:number):string=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit):'';

/** Copy only the established portable format before awaiting or touching storage. */
export function preparePortableChatRecords(records:PortableChatRecords):PortableChatRecords {
 if(!Array.isArray(records.messages)||!Array.isArray(records.conversations)||records.messages.length>600||records.conversations.length>100)throw new Error('Portable chat records exceed supported limits.');
 const conversations=records.conversations.map(sanitizePortableConversation),messages=records.messages.map(sanitizePortableMessage);
 if(conversations.some(row=>!row)||messages.some(row=>!row))throw new Error('Portable chat records are invalid.');
 const checked={conversations:conversations as ConversationMeta[],messages:messages as LinkMessage[]},peers=new Set(checked.conversations.map(row=>row.peerNumber));
 if(peers.size!==checked.conversations.length||new Set(checked.messages.map(row=>row.id)).size!==checked.messages.length||checked.messages.some(row=>!peers.has(row.peerNumber)))throw new Error('Portable chat identities are inconsistent.');
 return structuredClone(checked);
}

/** Existing native messages are authoritative; only matching unread -> read can advance.
 * Never replace text, delivery/Cloud metadata or unknown structured fields from an older,
 * bounded portable copy. A conflicting ID is retained without being marked read. */
export function hydratePortableMessage(current:unknown,incoming:LinkMessage):LinkMessage|undefined {
 if(current===undefined)return incoming;
 if(!isRecord(current)||current.id!==incoming.id||current.peerNumber!==incoming.peerNumber||current.sentAt!==incoming.sentAt||current.direction!==incoming.direction||
   cleanText(cleanBeepMessageContent(current.content),1000)!==incoming.content||current.includeRoom!==incoming.includeRoom||cleanText(current.roomName,100)!==(incoming.roomName??''))return undefined;
 if(current.read!==false||!incoming.read)return undefined;
 const kept=structuredClone(current);kept.read=true;return kept as unknown as LinkMessage;
}

/** Keep the existing timestamp rule and known-field replacement, preserving every native
 * field outside the portable conversation schema. Read and write must share one transaction. */
export function hydratePortableConversation(current:unknown,incoming:ConversationMeta):ConversationMeta|undefined {
 if(current===undefined)return incoming;
 if(!isRecord(current)||current.peerNumber!==incoming.peerNumber||!validTime(current.lastMessageAt)||incoming.lastMessageAt<current.lastMessageAt)return undefined;
 let changed=false;
 for(const key of CONVERSATION_FIELDS){
  if(Object.prototype.hasOwnProperty.call(incoming,key)){if(!Object.prototype.hasOwnProperty.call(current,key)||!Object.is(current[key],incoming[key]))changed=true;}
  else if(Object.prototype.hasOwnProperty.call(current,key))changed=true;
 }
 if(!changed)return undefined;
 const kept=structuredClone(current);
 for(const key of CONVERSATION_FIELDS){if(Object.prototype.hasOwnProperty.call(incoming,key))kept[key]=incoming[key];else delete kept[key];}
 return kept as unknown as ConversationMeta;
}

export function sanitizePortableConversation(value: unknown): ConversationMeta | undefined {
  if (!isRecord(value) || !validMemberNumber(value.peerNumber)) return undefined;
  const peerName = cleanText(value.peerName, 80) || `Member ${value.peerNumber}`;
  const lastDirection = value.lastDirection === "outgoing" ? "outgoing" : "incoming";
  const localAlias = cleanText(value.localAlias, 80);
  const hiddenAt = validTime(value.hiddenAt) ? value.hiddenAt : undefined;
  return {
    peerNumber: value.peerNumber,
    peerName,
    ...(localAlias ? { localAlias } : {}),
    ...(hiddenAt !== undefined ? { hiddenAt } : {}),
    lastMessage: cleanText(cleanBeepMessageContent(value.lastMessage), 1000),
    lastMessageAt: validTime(value.lastMessageAt) ? value.lastMessageAt : 0,
    lastDirection,
    unread: integerInRange(value.unread, 0, 100_000, 0),
    pinned: value.pinned === true,
    ...(typeof value.muteUntil === "number" && Number.isSafeInteger(value.muteUntil) && value.muteUntil >= -1 ? { muteUntil: value.muteUntil } : {}),
    draft: cleanText(value.draft, 1000),
  };
}

export function sanitizePortableMessage(value: unknown): LinkMessage | undefined {
  if (
    !isRecord(value) ||
    !validMemberNumber(value.peerNumber) ||
    typeof value.id !== "string" ||
    !value.id.trim() ||
    value.id.length > 200 ||
    !validTime(value.sentAt)
  ) {
    return undefined;
  }
  const roomName = cleanText(value.roomName, 100);
  const archivedAttachments = archivedChatAttachments(value.archivedAttachments);
  return {
    id: value.id,
    direction: value.direction === "outgoing" ? "outgoing" : "incoming",
    peerNumber: value.peerNumber,
    peerName: cleanText(value.peerName, 80) || `Member ${value.peerNumber}`,
    content: cleanText(cleanBeepMessageContent(value.content), 1000),
    sentAt: value.sentAt,
    includeRoom: value.includeRoom === true,
    ...(roomName ? { roomName } : {}),
    read: value.read === true,
    ...(archivedAttachments ? { archivedAttachments } : {}),
    ...(typeof value.clientMessageId === "string" && /^[a-f0-9-]{36}$/u.test(value.clientMessageId) ? { clientMessageId: value.clientMessageId } : {}),
    ...(Array.isArray(value.cloudMediaIds) && value.cloudMediaIds.length <= 4 && value.cloudMediaIds.every(id => typeof id === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(id)) ? { cloudMediaIds: [...new Set(value.cloudMediaIds)] as string[] } : {}),
    ...(Array.isArray(value.cloudAudioIds) && value.cloudAudioIds.length <= 1 && value.cloudAudioIds.every(id => typeof id === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(id)) ? { cloudAudioIds: [...new Set(value.cloudAudioIds)] as string[] } : {}),
    ...(typeof value.cloudId === "string" && /^[a-f0-9-]{36}$/u.test(value.cloudId) ? { cloudId: value.cloudId } : {}),
    ...(typeof value.cloudGeneration === "string" && /^[a-f0-9]{32}$/u.test(value.cloudGeneration) ? { cloudGeneration: value.cloudGeneration } : {}),
    ...(typeof value.cloudSequence === "number" && Number.isSafeInteger(value.cloudSequence) && value.cloudSequence > 0 ? { cloudSequence: value.cloudSequence } : {}),
    ...(["waiting", "sent", "delivered", "read", "failed"].includes(String(value.delivery)) ? { delivery: value.delivery as NonNullable<LinkMessage["delivery"]> } : {}),
    ...(typeof value.deliveryError === "string" ? { deliveryError: cleanText(value.deliveryError, 100) } : {}),
  };
}

