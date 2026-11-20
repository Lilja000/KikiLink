import {INERT_ARCHIVED_FIELDS_LIMIT,INERT_ARCHIVED_FIELDS_TOTAL,archivedFieldBytes,archiveFieldEntries,archiveBinaryPath,prepareInertArchivedFields,readInertArchivedFields} from './inert-archived-fields';
export const CHAT_ARCHIVED_FIELDS_LIMIT=INERT_ARCHIVED_FIELDS_LIMIT;
export const CHAT_ARCHIVED_FIELDS_TOTAL=INERT_ARCHIVED_FIELDS_TOTAL;
export interface ChatArchiveSource {readonly metadata:string;readonly files:readonly Readonly<{name:string;blob:Blob}>[]}
export interface PreparedChatArchiveFields {messages:Map<string,string>;conversations:Map<number,string>}
type Kind='message'|'conversation';
const known={message:new Set(['id','peerNumber','peerName','content','sentAt','direction','includeRoom','roomName','read','archivedAttachments','clientMessageId','cloudMediaIds','cloudAudioIds','cloudMentions','cloudId','cloudSequence','cloudGeneration','delivery','deliveryError','archivedFields']),conversation:new Set(['peerNumber','peerName','localAlias','hiddenAt','lastMessage','lastMessageAt','lastDirection','unread','pinned','draft','muteUntil','archivedFields'])};

const policy=(kind:Kind)=>({format:'kikilink-inert-chat-fields',kind,knownFields:known[kind]});
export const readArchivedChatFields=(raw:string,kind:Kind,check:()=>void=()=>{})=>readInertArchivedFields(raw,policy(kind),check);
function fail():never{throw new Error('Additional archived chat fields are unsupported or too large. Keep the original ZIP; no history was changed.');}
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail();
const array=(v:unknown):unknown[]=>Array.isArray(v)?v:fail();
/** Capture source metadata and file references before awaiting binary reads. */
export async function prepareChatArchiveFields(source:string|ChatArchiveSource,check:()=>void):Promise<{source:string;fields:PreparedChatArchiveFields}>{
 check();const raw=typeof source==='string'?source:source.metadata;if(typeof raw!=='string'||raw.length>2*1024*1024||archivedFieldBytes(raw)>2*1024*1024)fail();
 const files=new Map<string,Blob>();if(typeof source!=='string')for(const f of source.files){if(files.has(f.name)||!(f.blob instanceof Blob))fail();files.set(archiveBinaryPath(f.name),f.blob);}
 const db=object(JSON.parse(raw)),stores=array(db.stores),fields:PreparedChatArchiveFields={messages:new Map(),conversations:new Map()};let total=0;if(stores.length>32)fail();
 const selected=new Set<string>();
 for(const value of stores){const store=object(value);if(store.name!=='messages'&&store.name!=='conversations')continue;if(selected.has(store.name))fail();selected.add(store.name);const kind:Kind=store.name==='messages'?'message':'conversation';
  const records=array(store.records);if(records.length>10000)fail();for(const value of records){
   check();const row=object(value),node=object(row.value);if(node.type!=='object')fail();const entries=archiveFieldEntries(node.entries),byName=new Map(entries);
   const payload=await prepareInertArchivedFields(entries,files,policy(kind),check);
   if(payload!==undefined){total+=archivedFieldBytes(payload);if(total>CHAT_ARCHIVED_FIELDS_TOTAL)fail();const identity=object(byName.get(kind==='message'?'id':'peerNumber'));
    if(kind==='message'){if(identity.type!=='value'||typeof identity.value!=='string'||fields.messages.has(identity.value))fail();fields.messages.set(identity.value,payload);}
    else{if(identity.type!=='number'||typeof identity.value!=='number'||!Number.isSafeInteger(identity.value)||identity.value<=0||fields.conversations.has(identity.value))fail();fields.conversations.set(identity.value,payload);}
   }
  }
 }
 check();return {source:raw,fields};
}
