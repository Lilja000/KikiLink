import type { CloudClient } from './client';
import type { LinkMessage } from '../core/types';
import { archivedChatAttachments, validChatAttachmentIds } from '../core/chat-attachments';
import { CHAT_IMPORT_SOURCE_LIMIT } from '../storage/chat-import-model';
import { deviceDataDatabases, exportValueEncoder } from '../storage/device-data-export';

export const CLOUD_ARCHIVE_MESSAGES = 200, CLOUD_ARCHIVE_REFERENCES = 100, CLOUD_ARCHIVE_PAGES = 5;
export const CLOUD_ARCHIVE_METADATA = CHAT_IMPORT_SOURCE_LIMIT-16384;
export interface ArchiveEnvelope {
  id:string; clientMessageId:string; sequence:number; sender:number; recipient:number; createdAt:number;
  text:string; mediaIds:string[]; audioIds:string[]; roomName?:string;
}
export interface ArchivePage { items:ArchiveEnvelope[]; cursor:number; nextCursor:number|null }
export interface CloudHistoryArchiveAccess {
  readonly owner:number; readonly peer:number; readonly peerName:string; readonly cutoff:number; readonly client:CloudClient;
  readonly recoveryGeneration?:string|null;
  current():boolean;
  read(cursor:number,current:()=>boolean,signal:AbortSignal):Promise<ArchivePage>;
}
/** Bound a read even when its underlying client transport cannot abort. Late results are discarded. */
export function archiveWait<T>(task:Promise<T>,signal:AbortSignal):Promise<T> {
  return new Promise((resolve,reject)=>{
    const abort=()=>finish(new Error('Cloud history operation stopped.'));
    const timer=setTimeout(()=>finish(new Error('Cloud history request timed out. Retry explicitly when connected.')),30000);
    let settled=false;
    const finish=(error?:unknown,value?:T)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(error)reject(error);else resolve(value!);};
    signal.addEventListener('abort',abort,{once:true});task.then(value=>finish(undefined,value),error=>finish(error));if(signal.aborted)abort();
  });
}
const number=(v:unknown,minimum=0):v is number=>Number.isSafeInteger(v)&&Number(v)>=minimum&&Number(v)<Number.MAX_SAFE_INTEGER;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function fail():never {throw new Error('Cloud returned unsupported or inconsistent chat history.');}

/** Validate exclusive backward paging and project known data only; no server actions or URLs survive. */
export function archiveHistoryPage(value:unknown,owner:number,peer:number,cursor:number):ArchivePage {
  if(!number(owner,1)||!number(peer,1)||owner===peer||!number(cursor)||!object(value)||!Array.isArray(value.items)||value.items.length>40||
    !number(value.cursor)||!number(value.readCursor)||!number(value.peerReadCursor)||
    value.nextCursor!==null&&(!number(value.nextCursor,1)||value.nextCursor!==value.cursor||!value.items.length))fail();
  const ids=new Set<string>(),clients=new Set<string>();
  const items=value.items.map((raw:unknown,index:number):ArchiveEnvelope=>{
    if(!object(raw)||!validChatAttachmentIds([raw.id],1)||!validChatAttachmentIds([raw.clientMessageId],1)||
      !number(raw.sequence,1)||!number(raw.createdAt,1)||Number(raw.createdAt)>Date.now()+300000||
      typeof raw.text!=='string'||raw.text.length>4000||!['sent','delivered'].includes(String(raw.state))||
      !(raw.sender===owner&&raw.recipient===peer||raw.sender===peer&&raw.recipient===owner)||
      cursor>0&&raw.sequence>=cursor||index>0&&raw.sequence<=Number((value.items as Record<string,unknown>[])[index-1]!.sequence)||
      raw.roomName!==undefined&&(typeof raw.roomName!=='string'||raw.roomName.length>1000)||
      !validChatAttachmentIds(raw.mediaIds??[],4)||!validChatAttachmentIds(raw.audioIds??[],1))fail();
    const images=(raw.mediaIds as string[]|undefined)??[],audio=(raw.audioIds as string[]|undefined)??[];
    if(ids.has(String(raw.id))||clients.has(String(raw.clientMessageId))||images.some(id=>audio.includes(id))||!raw.text&&!images.length&&!audio.length)fail();
    ids.add(String(raw.id));clients.add(String(raw.clientMessageId));
    return {id:String(raw.id),clientMessageId:String(raw.clientMessageId),sequence:Number(raw.sequence),sender:Number(raw.sender),recipient:Number(raw.recipient),
      createdAt:Number(raw.createdAt),text:raw.text as string,mediaIds:[...images],audioIds:[...audio],...(raw.roomName!==undefined?{roomName:raw.roomName as string}:{})};
  });
  if(value.cursor!==(items.length?items[0]!.sequence:cursor))fail();
  return {items,cursor:Number(value.cursor),nextCursor:value.nextCursor as number|null};
}

export function archiveMessage(e:ArchiveEnvelope,owner:number,peer:number,peerName:string):LinkMessage {
  const outgoing=e.sender===owner,refs=archivedChatAttachments({version:1,images:e.mediaIds,audio:e.audioIds});
  return {id:outgoing?`cloud-out:${e.clientMessageId}`:`cloud-in:${e.id}`,peerNumber:peer,peerName,content:e.text,sentAt:e.createdAt,
    direction:outgoing?'outgoing':'incoming',read:true,includeRoom:!!e.roomName,...(e.roomName?{roomName:e.roomName}:{}),...(refs?{archivedAttachments:refs}:{})};
}
export function archiveMessageBytes(message:LinkMessage):number {
  const encode=exportValueEncoder([],()=>{});return new TextEncoder().encode(JSON.stringify({key:encode(message.id),value:encode(message)})).length+1;
}
export function archiveChatSnapshot(owner:number,peer:number,peerName:string,messages:readonly LinkMessage[],check:()=>void):unknown {
  const encode=exportValueEncoder([],check),newest=[...messages].sort((a,b)=>b.sentAt-a.sentAt)[0];
  const conversation={peerNumber:peer,peerName,lastMessage:newest?.content??'',lastMessageAt:newest?.sentAt??0,lastDirection:newest?.direction??'incoming',unread:0,draft:'',pinned:false};
  return {name:deviceDataDatabases(owner)[0]!.name,version:1,stores:[
    {name:'messages',keyPath:'id',autoIncrement:false,indexes:[],records:messages.map(m=>({key:encode(m.id),value:encode(m)}))},
    {name:'conversations',keyPath:'peerNumber',autoIncrement:false,indexes:[],records:messages.length?[{key:encode(peer),value:encode(conversation)}]:[]},
  ]};
}
