import {CHAT_FILE_LIMIT,CHAT_FILE_TOTAL,chatFileId,checkChatFile,chatFileHash,inspectChatFile,type ChatFile,type ChatFileKind} from '../storage/chat-file-model';
import type {ZipFile} from '../utils/stored-zip';
import type {StoredZipEntry} from '../utils/read-stored-zip';
import type {ThreadHistoryRow} from './thread-history-format';

export const THREAD_FILES_METADATA=512*1024;
export type ThreadFileOutcome='unavailable'|'changed'|'limit';
export interface ThreadHistoryMedia {files:ChatFile[];outcomes:Map<string,ThreadFileOutcome>}
export interface ThreadFileReference {kind:ChatFileKind;assetId:string;witness:ThreadHistoryRow}
interface FileRecord {kind:ChatFileKind;assetId:string;status:'pending'|'saved'|ThreadFileOutcome;path?:string;bytes?:number;sha256?:string;mimeType?:string;createdAt?:number}
function fail():never{throw new Error('History attachment metadata or file bytes are unsupported or inconsistent.');}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,expected:string[])=>Object.keys(v).sort().join(',')===expected.sort().join(',');
export const threadFilePath=(kind:ChatFileKind,id:string):string=>{chatFileId(kind,id);return `attachments/${kind}/${id}.${kind==='image'?'webp':'mp3'}`;};
/** Newest references first; only the first 100 unique files may be prepared in this batch. */
export function threadFileReferences(rows:readonly ThreadHistoryRow[]):Map<string,ThreadFileReference>{
 const result=new Map<string,ThreadFileReference>();
 for(const witness of [...rows].reverse())for(const kind of ['image','audio'] as const)for(const assetId of kind==='image'?witness.mediaIds:witness.audioIds){
  const key=chatFileId(kind,assetId);if(!result.has(key))result.set(key,{kind,assetId,witness});
 }
 return result;
}
export function threadFileInventory(rows:readonly ThreadHistoryRow[],media:ThreadHistoryMedia):FileRecord[]{
 const refs=threadFileReferences(rows),files=new Map<string,ChatFile>();let bytes=0;
 for(const file of media.files){checkChatFile(file);if(files.has(file.id)||!refs.has(file.id)||media.outcomes.has(file.id))fail();files.set(file.id,file);bytes+=file.blob.size;}
 if(files.size>CHAT_FILE_LIMIT||bytes>CHAT_FILE_TOTAL||[...media.outcomes].some(([id,outcome])=>!refs.has(id)||!['unavailable','changed','limit'].includes(outcome)))fail();
 return [...refs].map(([key,ref],index)=>{
  const file=files.get(key);if(index>=CHAT_FILE_LIMIT&&file)fail();
  return file?{kind:file.kind,assetId:file.assetId,status:'saved',path:threadFilePath(file.kind,file.assetId),bytes:file.blob.size,sha256:file.sha256,mimeType:file.mimeType,createdAt:file.createdAt}:
   {kind:ref.kind,assetId:ref.assetId,status:index>=CHAT_FILE_LIMIT?'limit':media.outcomes.get(key)??'pending'};
 });
}
export function threadFilePayload(rows:readonly ThreadHistoryRow[],media:ThreadHistoryMedia):{entries:ZipFile[];files:number;bytes:number}{
 const inventory=threadFileInventory(rows,media),metadata=new Blob([JSON.stringify(inventory)]);if(metadata.size>THREAD_FILES_METADATA)fail();
 return {entries:[{name:'attachments.json',blob:metadata},...media.files.map(file=>({name:threadFilePath(file.kind,file.assetId),blob:file.blob}))],files:media.files.length,bytes:media.files.reduce((n,f)=>n+f.blob.size,0)};
}
/** Original payload bytes are retained. No URL, server lookup, playback or storage mutation. */
export async function readThreadFiles(entries:Map<string,StoredZipEntry>,rows:ThreadHistoryRow[],count:unknown,bytes:unknown,check:()=>void,signal:AbortSignal,inspect=inspectChatFile):Promise<ThreadHistoryMedia>{
 check();const entry=entries.get('attachments.json');if(!entry||entry.blob.size>THREAD_FILES_METADATA)fail();
 const raw:unknown=JSON.parse(await entry.blob.text());check();const refs=threadFileReferences(rows),allowed=[...refs.keys()].slice(0,CHAT_FILE_LIMIT),seen=new Set<string>();
 if(!Array.isArray(raw)||raw.length!==refs.size||raw.length>1000)fail();
 const files:ChatFile[]=[],outcomes=new Map<string,ThreadFileOutcome>(),paths=new Set(['manifest.json','messages.json','README.txt','attachments.json']);let total=0;
 for(const value of raw){
  check();if(!object(value)||!['image','audio'].includes(String(value.kind))||typeof value.assetId!=='string')fail();
  const kind=value.kind as ChatFileKind,key=chatFileId(kind,value.assetId);if(!refs.has(key)||seen.has(key))fail();seen.add(key);
  if(value.status==='saved'){
   if(!allowed.includes(key)||!keys(value,['kind','assetId','status','path','bytes','sha256','mimeType','createdAt'])||value.path!==threadFilePath(kind,value.assetId))fail();
   const payload=entries.get(String(value.path));if(!payload||value.bytes!==payload.blob.size||!Number.isSafeInteger(value.createdAt)||Number(value.createdAt)>Date.now()+300000)fail();
   const file:ChatFile={id:key,kind,assetId:value.assetId,mimeType:value.mimeType as string,sha256:value.sha256 as string,createdAt:value.createdAt as number,blob:payload.blob.slice(0,payload.blob.size,value.mimeType as string)};
   checkChatFile(file);total+=file.blob.size;if(total>CHAT_FILE_TOTAL||files.length>=CHAT_FILE_LIMIT)fail();
   if(await chatFileHash(file.blob,check)!==file.sha256)fail();await inspect(file.blob,kind,signal);check();files.push(file);paths.add(String(value.path));
  }else{
   if(!keys(value,['kind','assetId','status'])||!['pending','unavailable','changed','limit'].includes(String(value.status))||!allowed.includes(key)&&value.status!=='limit')fail();
   if(value.status!=='pending')outcomes.set(key,value.status as ThreadFileOutcome);
  }
 }
 if(count!==files.length||bytes!==total||entries.size!==paths.size||[...entries.keys()].some(path=>!paths.has(path)))fail();
 check();return {files,outcomes};
}
