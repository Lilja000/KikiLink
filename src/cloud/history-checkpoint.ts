import {KIKILINK_PLATFORM_PREVIEW} from '../core/distribution';
import {archiveHistoryPage,archiveMessage,archiveMessageBytes,CLOUD_ARCHIVE_METADATA,type ArchiveEnvelope} from './history-archive-model';
import {readThreadFiles,threadFilePayload,threadFileReferences,THREAD_FILES_METADATA,type ThreadHistoryMedia} from './thread-history-files';
import type {ThreadHistoryRow} from './thread-history-format';
import {storedZip} from '../utils/stored-zip';
import {readStoredZip,verifyEntry} from '../utils/read-stored-zip';

export interface HistoryCheckpointIdentity {owner:number;peer:number;origin:string;cutoff:number}
export interface HistoryCheckpoint {generation:string|null;startedAt:string;from:number;next:number|null;hidden:number;rows:ArchiveEnvelope[];media:ThreadHistoryMedia}
export const HISTORY_CHECKPOINT_BYTES=131*1024*1024;
const MESSAGE_BYTES=2*1024*1024,distribution=()=>KIKILINK_PLATFORM_PREVIEW?'platform-preview':'stable';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<Number.MAX_SAFE_INTEGER;
const keys=(v:Record<string,unknown>,names:string[])=>Object.keys(v).sort().join(',')===names.sort().join(',');
export const validHistoryGeneration=(v:unknown):v is string|null=>v===null||typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
function fail():never{throw new Error('This progress ZIP is unsupported or inconsistent. Keep the original file; the previous batch is unchanged.');}
export function checkHistoryCheckpointIdentity(v:HistoryCheckpointIdentity):void{
 if(!integer(v.owner,1)||!integer(v.peer,1)||v.owner===v.peer||!integer(v.cutoff)||typeof v.origin!=='string'||!v.origin||v.origin.length>2048)fail();
}
function rows(value:unknown,identity:HistoryCheckpointIdentity,from:number,next:unknown,hidden:unknown):ArchiveEnvelope[]{
 if(!Array.isArray(value)||value.length>200||!integer(from)||!integer(hidden)||hidden+value.length>200||next!==null&&(!integer(next,1)||from>0&&next>=from))fail();
 const ids=new Set<string>(),clients=new Set<string>();let bytes=0;
 const result=value.map((v:unknown,i:number)=>{
  if(!object(v)||!Array.isArray(v.mediaIds)||!Array.isArray(v.audioIds)||!keys(v,['id','clientMessageId','sequence','sender','recipient','createdAt','text','mediaIds','audioIds',...(v.roomName!==undefined?['roomName']:[])]))fail();
  const e=archiveHistoryPage({items:[{...v,state:'sent'}],cursor:v.sequence,nextCursor:null,readCursor:0,peerReadCursor:0},identity.owner,identity.peer,from).items[0]!;
  if(e.createdAt<=identity.cutoff||ids.has(e.id)||clients.has(e.clientMessageId)||i>0&&e.sequence<=Number((value[i-1] as ArchiveEnvelope).sequence)||next!==null&&e.sequence<next)fail();
  ids.add(e.id);clients.add(e.clientMessageId);bytes+=archiveMessageBytes(archiveMessage(e,identity.owner,identity.peer,''));return e;
 });
 if(bytes>CLOUD_ARCHIVE_METADATA||!result.length&&next!==null&&!hidden||next!==null&&!hidden&&next!==result[0]?.sequence||threadFileReferences(mediaRows(result)).size>100)fail();
 return result;
}
const mediaRows=(rows:ArchiveEnvelope[]):ThreadHistoryRow[]=>rows.map(r=>({id:r.id,sequence:r.sequence,sender:r.sender,createdAt:r.createdAt,text:r.text,deletedAt:null,mediaIds:r.mediaIds,audioIds:r.audioIds}));
const README=`KikiLink direct-chat export progress, format 2. Private, unencrypted ZIP.\nChoose this progress ZIP in Save Cloud history for the same account, server and peer. Older paging and pending-file requests require the same known database generation. A different or unknown generation allows local export of captured messages and files only; explicitly read current history to start a separate batch. Old format1 ZIPs remain readable locally but cannot resume a server cursor. Selection makes no network request, restores no live messages and sends no acknowledgements or pending actions. Current clear/delete policy must match.\nmessages.json contains the known server envelope, including inert original message/client IDs needed to recheck file witnesses. attachments.json records saved, pending, unavailable, changed or over-limit files. Payloads are original WebP/MP3 bytes. URLs, tickets, credentials, settings, unknown fields and other chats are excluded. CRC/SHA detect damage, not authenticity.\nThis progress ZIP is not a device restore ZIP. After selecting it, use Download history ZIP to make the existing device-format2 copy for separate reviewed restore in Settings. Existing device ZIPs remain restorable but contain no supported progress checkpoint. Keep every batch; a browser download request is not proof of a saved file. This is not a full-account or atomic Cloud backup.\n`;
export async function makeHistoryCheckpoint(identity:HistoryCheckpointIdentity,batch:HistoryCheckpoint,check:()=>void):Promise<Blob>{
 check();checkHistoryCheckpointIdentity(identity);const checked=rows(batch.rows,identity,batch.from,batch.next,batch.hidden),payload=threadFilePayload(mediaRows(checked),batch.media);
 const messages=new Blob([JSON.stringify(checked)]);if(messages.size>MESSAGE_BYTES||!validDate(batch.startedAt)||!validHistoryGeneration(batch.generation))fail();
 const manifest={format:'kikilink-direct-history-progress',version:2,...identity,generation:batch.generation,distribution:distribution(),startedAt:batch.startedAt,from:batch.from,next:batch.next,hidden:batch.hidden,messages:checked.length,files:payload.files,fileBytes:payload.bytes};
 const zip=await storedZip([{name:'manifest.json',blob:new Blob([JSON.stringify(manifest)])},{name:'messages.json',blob:messages},{name:'README.txt',blob:new Blob([README])},...payload.entries],check);
 check();if(zip.size>HISTORY_CHECKPOINT_BYTES)fail();return zip;
}
const validDate=(v:unknown):v is string=>typeof v==='string'&&v.length===24&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v&&Date.parse(v)<=Date.now()+300000;
/** Strict local decoding. No storage, transport, playback or restoration of active state. */
export async function readHistoryCheckpoint(file:Blob,identity:HistoryCheckpointIdentity,check:()=>void,signal:AbortSignal):Promise<HistoryCheckpoint>{
 check();checkHistoryCheckpointIdentity(identity);if(!(file instanceof Blob)||file.size>HISTORY_CHECKPOINT_BYTES)fail();
 const entries=await readStoredZip(file,check);if(entries.size>104||entries.size<4)fail();
 for(const [name,e]of entries){
  const max=name==='manifest.json'?16384:name==='messages.json'?MESSAGE_BYTES:name==='attachments.json'?THREAD_FILES_METADATA:name==='README.txt'?4096:name.startsWith('attachments/image/')?3*1024*1024:name.startsWith('attachments/audio/')?16*1024*1024:0;
  if(!max||e.blob.size>max)fail();await verifyEntry(e,check);check();
 }
 const json=async(name:string):Promise<unknown>=>{const e=entries.get(name);if(!e)fail();const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await e.blob.arrayBuffer()));check();return data;};
 const m=await json('manifest.json');
 if(!object(m)||!keys(m,['format','version','owner','peer','origin','cutoff','distribution','startedAt','from','next','hidden','messages','files','fileBytes',...(m.version===2?['generation']:[])])||m.format!=='kikilink-direct-history-progress'||![1,2].includes(m.version as number)||!validDate(m.startedAt)||m.version===2&&!validHistoryGeneration(m.generation))fail();
 if(m.owner!==identity.owner||m.peer!==identity.peer||m.origin!==identity.origin||m.cutoff!==identity.cutoff||m.distribution!==distribution())throw new Error('This progress ZIP belongs to another account, server, chat, build scope or clear/delete boundary.');
 const checked=rows(await json('messages.json'),identity,m.from as number,m.next,m.hidden);if(m.messages!==checked.length)fail();
 const media=await readThreadFiles(entries,mediaRows(checked),m.files,m.fileBytes,check,signal);check();
 return {generation:m.version===2?m.generation as string|null:null,startedAt:m.startedAt,from:m.from as number,next:m.next as number|null,hidden:m.hidden as number,rows:checked,media};
}
