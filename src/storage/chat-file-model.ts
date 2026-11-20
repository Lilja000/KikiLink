import { scopePersistenceName } from '../core/storage-scope';
import { validateLocalImageFile } from '../modules/link-chat/image-upload';
import { readAudioDurationMs } from './device-notification-sound-store';
import { exportValueEncoder } from './device-data-export';
import type { ZipFile } from '../utils/stored-zip';
import { inspectChatMp3 } from './chat-file-mp3';

export const CHAT_FILE_LIMIT = 100, CHAT_FILE_TOTAL = 128*1024*1024;
export const CHAT_FILE_METADATA_LIMIT = 2*1024*1024, CHAT_FILE_RECOVERY_LIMIT = 768*1024*1024;
export type ChatFileKind = 'image'|'audio';
export interface ChatFile { id:string; kind:ChatFileKind; assetId:string; mimeType:string; createdAt:number; sha256:string; blob:Blob }
export interface ChatFileSource { readonly metadata:string; readonly files:readonly Readonly<ZipFile>[] }
export interface ChatFileRow { key:IDBValidKey; value:unknown }
export interface ChatFileCopy { format:1; id:number; createdAt:number; owner:number; before:ChatFileRow[]; source:ChatFileSource; added:ChatFile[]; bytes:number }
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const need=(ok:unknown):void=>{if(!ok)throw new Error('Saved chat files are unsupported or inconsistent.');};
export const chatFileDatabaseName=(owner:number):string=>{need(Number.isSafeInteger(owner)&&owner>0);return scopePersistenceName(`kikilink-chat-files-${owner}`);};
export function chatFileId(kind:ChatFileKind,assetId:string):string {need((kind==='image'||kind==='audio')&&typeof assetId==='string'&&UUID.test(assetId));return `${kind}:${assetId}`;}
export function checkChatFile(value:unknown): asserts value is ChatFile {
 const f=value as ChatFile;need(f&&typeof f==='object'&&f.id===chatFileId(f.kind,f.assetId));
 need(f.blob instanceof Blob&&f.blob.size>0&&f.blob.size<=(f.kind==='image'?3:16)*1024*1024);
 need(f.mimeType===(f.kind==='image'?'image/webp':'audio/mpeg')&&f.blob.type===f.mimeType);
 need(Number.isSafeInteger(f.createdAt)&&f.createdAt>=0&&f.createdAt<=8640000000000000&&/^[a-f0-9]{64}$/.test(f.sha256));
}
export async function chatFileHash(blob:Blob,check:()=>void):Promise<string> {
 check();const bytes=await blob.arrayBuffer();check();const digest=await crypto.subtle.digest('SHA-256',bytes);check();
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
/** Decode without playback, re-encoding, or remote requests. */
export async function inspectChatFile(blob:Blob,kind:ChatFileKind,signal:AbortSignal):Promise<void> {
 if(signal.aborted)throw new Error('Chat file operation cancelled.');
 if(kind==='audio') {const measured=inspectChatMp3(new Uint8Array(await blob.arrayBuffer()));if(signal.aborted)throw new Error('Audio inspection cancelled.');const duration=await readAudioDurationMs(blob,signal);need(measured>0&&measured<=7200000&&duration>0&&duration<=7200000);return;}
 await validateLocalImageFile(new File([blob],'chat.webp',{type:'image/webp'}));
 if(typeof createImageBitmap!=='function')throw new Error('This browser cannot safely check saved images.');
 const bitmap=await new Promise<ImageBitmap>((resolve,reject)=>{
  let settled=false;const finish=(error?:unknown,image?:ImageBitmap)=>{if(settled){image?.close();return;}settled=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(error)reject(error);else resolve(image!);};
  const abort=()=>finish(new Error('Chat image decoding cancelled.'));
  const timer=setTimeout(()=>finish(new Error('Chat image decoding timed out.')),10000);signal.addEventListener('abort',abort,{once:true});
  createImageBitmap(blob).then(image=>finish(undefined,image),error=>finish(error));
 });
 try{need(bitmap.width>0&&bitmap.height>0&&bitmap.width*bitmap.height<=32000000);}finally{bitmap.close();}
}
export async function makeChatFile(kind:ChatFileKind,assetId:string,blob:Blob,check:()=>void,signal:AbortSignal,inspect=inspectChatFile):Promise<ChatFile> {
 const file:ChatFile={id:chatFileId(kind,assetId),kind,assetId,mimeType:blob.type,createdAt:Date.now(),sha256:'0'.repeat(64),blob};
 checkChatFile(file);check();await inspect(blob,kind,signal);check();file.sha256=await chatFileHash(blob,check);return file;
}
export const chatFileKeys=(rows:ChatFileRow[]):string=>{
 need(rows.length<=CHAT_FILE_LIMIT);let bytes=0;const ids=new Set<string>();
 const keys=rows.map(row=>{checkChatFile(row.value);need(row.key===row.value.id&&!ids.has(row.value.id));ids.add(row.value.id);bytes+=row.value.blob.size;return [row.value.id,row.value.sha256,row.value.blob.size];});
 need(bytes<=CHAT_FILE_TOTAL);return JSON.stringify(keys.sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
};
export async function prepareChatFiles(source:ChatFileSource,owner:number,check:()=>void,signal:AbortSignal,inspect=inspectChatFile):Promise<ChatFile[]> {
 check();need(new TextEncoder().encode(source.metadata).length<=CHAT_FILE_METADATA_LIMIT);
 const snapshot=JSON.parse(source.metadata);need(snapshot.name===chatFileDatabaseName(owner)&&snapshot.version===1&&Array.isArray(snapshot.stores)&&snapshot.stores.length===1);
 const store=snapshot.stores[0];need(store.name==='files'&&store.keyPath==='id'&&store.autoIncrement===false&&Array.isArray(store.indexes)&&!store.indexes.length&&Array.isArray(store.records)&&store.records.length<=CHAT_FILE_LIMIT);
 const payload=new Map(source.files.map(f=>[f.name,f.blob]));need(payload.size===source.files.length&&source.files.reduce((n,f)=>n+f.blob.size,0)<=CHAT_FILE_TOTAL);
 const scalar=(node:any):any=>{need(node&&(node.type==='value'||node.type==='number'));return node.value;};
 const result:ChatFile[]=[];
 for(const row of store.records){
  check();need(row.value?.type==='object'&&Array.isArray(row.value.entries));const fields=new Map<string,any>(row.value.entries);need(fields.size===row.value.entries.length);
  const tag=fields.get('blob');need(tag&&['blob','file'].includes(tag.type));const raw=payload.get(tag.path);need(raw instanceof Blob);
  const file:ChatFile={id:scalar(fields.get('id')),kind:scalar(fields.get('kind')),assetId:scalar(fields.get('assetId')),mimeType:scalar(fields.get('mimeType')),createdAt:scalar(fields.get('createdAt')),sha256:scalar(fields.get('sha256')),blob:raw!.slice(0,raw!.size,tag.mimeType)};
  checkChatFile(file);need(scalar(row.key)===file.id);await inspect(file.blob,file.kind,signal);check();need(await chatFileHash(file.blob,check)===file.sha256);result.push(file);
 }
 chatFileKeys(result.map(file=>({key:file.id,value:file})));return result;
}
export function planChatFiles(files:ChatFile[],rows:ChatFileRow[]):{added:ChatFile[];kept:number;excluded:number;bytes:number} {
 chatFileKeys(rows);const ids=new Set(rows.map(r=>r.key));let total=rows.reduce((n,r)=>n+(r.value as ChatFile).blob.size,0),kept=0,excluded=0;const added:ChatFile[]=[];
 for(const file of [...files].sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id))){checkChatFile(file);if(ids.has(file.id)){kept++;continue;}if(rows.length+added.length>=CHAT_FILE_LIMIT||total+file.blob.size>CHAT_FILE_TOTAL){excluded++;continue;}ids.add(file.id);added.push(file);total+=file.blob.size;}
 return {added,kept,excluded,bytes:added.reduce((n,f)=>n+f.blob.size,0)};
}
export function chatFileCopyBytes(value:unknown):number {const files:ZipFile[]=[],encode=exportValueEncoder(files,()=>{});return new TextEncoder().encode(JSON.stringify(encode(value))).length+files.reduce((n,f)=>n+f.blob.size,0);}
export function checkChatFileCopies(copies:ChatFileCopy[],owner:number):void {
 const ids=new Set<number>();let total=0;need(copies.length<=3);
 for(const copy of copies){need(copy?.format===1&&copy.owner===owner&&Number.isSafeInteger(copy.id)&&copy.id>0&&!ids.has(copy.id)&&Number.isSafeInteger(copy.createdAt)&&Array.isArray(copy.before)&&Array.isArray(copy.added)&&copy.added.length>0&&copy.source&&typeof copy.source.metadata==='string'&&Array.isArray(copy.source.files));
  chatFileKeys(copy.before);chatFileKeys(copy.added.map(f=>({key:f.id,value:f})));need(copy.source.files.every(f=>typeof f.name==='string'&&f.blob instanceof Blob));ids.add(copy.id);
  const bytes=chatFileCopyBytes({before:copy.before,source:copy.source,added:copy.added});need(bytes===copy.bytes);total+=bytes;
 }need(total<=CHAT_FILE_RECOVERY_LIMIT);
}
export function prepareChatFileCopy(copies:ChatFileCopy[],owner:number,before:ChatFileRow[],source:ChatFileSource,added:ChatFile[]):ChatFileCopy {
 checkChatFileCopies(copies,owner);const bytes=chatFileCopyBytes({before,source,added}),id=Math.max(0,...copies.map(c=>c.id))+1;
 if(!added.length||!Number.isSafeInteger(id)||copies.length>=3||bytes+copies.reduce((n,c)=>n+c.bytes,0)>CHAT_FILE_RECOVERY_LIMIT)throw new Error('Chat file recovery storage is full. No files were changed.');
 return {format:1,id,createdAt:Date.now(),owner,before,source,added,bytes};
}
