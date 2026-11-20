import { scopePersistenceName } from '../core/storage-scope';
import { parseMetadata, type DraftMetadata } from '../cloud/feed-draft-metadata';
import type { ZipFile } from '../utils/stored-zip';
import { archiveBinaryPath, archiveFieldEntries, archivedFieldBytes, INERT_ARCHIVED_FIELDS_TOTAL, prepareInertArchivedFields } from './inert-archived-fields';
import { feedFieldPolicy } from './feed-archived-fields';
import { prepareFeedDraftFields } from './feed-draft-archived-fields';
export const FEED_SOURCE_METADATA_LIMIT = 2*1024*1024;
export const FEED_SOURCE_BYTES_LIMIT = 40*1024*1024;
export const FEED_CURRENT_BYTES_LIMIT = 160*1024*1024;
export interface FeedArchiveSource { readonly metadata: string; readonly draft: string; readonly files: readonly Readonly<ZipFile>[] }
export interface FeedAttachment { id:string; file:Blob; archivedFields?:string }
export interface FeedRow { key:IDBValidKey; value:unknown }
export interface PreparedFeed { added:FeedAttachment[]; target:string; text:string; images:number; pendingExcluded:boolean }
export const feedDatabaseName = (owner:number) => scopePersistenceName(`kikilink-feed-drafts-${owner}`);
export const validFeedId = (id:unknown): id is string => typeof id==='string' && /^[a-z0-9_-]{1,128}$/i.test(id);
const requireValue = (ok:unknown):void => { if (!ok) throw new Error('The archived Feed draft is unsupported or inconsistent.'); };
const object = (v:any):Record<string,any> => { requireValue(v && typeof v==='object' && !Array.isArray(v)); return v; };
const scalar = (v:any):any => { requireValue(v && ['value','number'].includes(v.type)); return v.value; };
export function emptyFeedDraft(raw:string|null):boolean {
  const draft=parseMetadata(raw); return !draft || (!draft.text && !draft.files.length && !draft.poll && !draft.pending);
}
export function snapshotFeedSource(source:FeedArchiveSource):FeedArchiveSource {
  requireValue(typeof source.metadata==='string' && typeof source.draft==='string' && Array.isArray(source.files));
  return Object.freeze({metadata:source.metadata,draft:source.draft,files:Object.freeze(source.files.map(file=>Object.freeze({name:file.name,blob:file.blob})))});
}
export function feedRowsKey(rows:FeedRow[]):string {
  if (rows.length>32 || rows.some(row=>!validFeedId(row.key) || object(row.value).id!==row.key || !(object(row.value).file instanceof Blob)) || rows.reduce((n,row)=>n+(row.value as FeedAttachment).file.size,0)>FEED_CURRENT_BYTES_LIMIT) throw new Error('Current Feed image storage is unsupported or exceeds its snapshot limit.');
  return JSON.stringify(rows.map(row=>row.key).sort());
}
export async function checkFeedImage(blob:Blob,signal:AbortSignal):Promise<void> {
  if (signal.aborted) throw new Error('Feed import cancelled.');
  const bytes=new Uint8Array(await blob.slice(0,12).arrayBuffer()),text=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
  const valid=blob.type==='image/png' ? [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v) : blob.type==='image/jpeg' ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255 : blob.type==='image/webp' && text(0,4)==='RIFF' && text(8,12)==='WEBP';
  requireValue(valid); if (typeof createImageBitmap!=='function') throw new Error('This browser cannot inspect saved Feed images.');
  const image=await new Promise<ImageBitmap>((resolve,reject)=>{
    let settled=false;
    const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',fail);reject(new Error('Feed image inspection was cancelled or timed out.'));};
    const timer=setTimeout(fail,10000);signal.addEventListener('abort',fail,{once:true});
    if(signal.aborted){fail();return;}
    createImageBitmap(blob).then(bitmap=>{if(settled){bitmap.close();return;}settled=true;clearTimeout(timer);signal.removeEventListener('abort',fail);resolve(bitmap);},()=>fail());
  });
  try { requireValue(image.width>0 && image.height>0 && image.width<=16384 && image.height<=16384 && image.width*image.height<=32000000); if(signal.aborted)throw new Error('Feed import cancelled.'); }
  finally { image.close(); }
}
export async function prepareFeedSource(source:FeedArchiveSource,owner:number,current:FeedRow[],check:()=>void,signal:AbortSignal,inspect=checkFeedImage,createId=()=>crypto.randomUUID() as string,retainedFields?:string):Promise<PreparedFeed> {
  check();source=snapshotFeedSource(source);requireValue(source.metadata.length<=FEED_SOURCE_METADATA_LIMIT && archivedFieldBytes(source.metadata)<=FEED_SOURCE_METADATA_LIMIT && source.draft.length<=128000 && archivedFieldBytes(source.draft)<=128000);
  const currentKeys=feedRowsKey(current),currentCount=current.length,currentBytes=current.reduce((n,r)=>n+(r.value as FeedAttachment).file.size,0);
  const draft=parseMetadata(source.draft);requireValue(draft && (draft.text || draft.files.length || draft.poll));
  const draftFields=prepareFeedDraftFields(draft!,retainedFields);
  const snapshot=object(JSON.parse(source.metadata));requireValue(snapshot.name===feedDatabaseName(owner) && [1,2].includes(snapshot.version) && Array.isArray(snapshot.stores) && snapshot.stores.length===1);
  const store=object(snapshot.stores[0]);requireValue(store.name==='attachments' && store.keyPath==='id' && store.autoIncrement===false && Array.isArray(store.indexes) && !store.indexes.length && Array.isArray(store.records) && store.records.length<=32);
  const payloads=new Map(source.files.map(file=>{requireValue(file.blob instanceof Blob);return [archiveBinaryPath(file.name),file.blob] as const;}));requireValue(payloads.size===source.files.length && source.files.reduce((n,f)=>n+f.blob.size,0)<=FEED_SOURCE_BYTES_LIMIT);
  const records=new Map<string,any>();
  for(const row of store.records){const key=scalar(row.key);requireValue(validFeedId(key) && !records.has(key));records.set(key,row.value);}
  const occupied=new Set<string>(JSON.parse(currentKeys)),fresh=()=>{const id=createId();requireValue(validFeedId(id) && !occupied.has(id));occupied.add(id);return id;};
  const added:FeedAttachment[]=[],files:DraftMetadata['files']=[];let archivedBytes=0;
  for(const entry of draft!.files){
    check();const node=object(records.get(entry.id));requireValue(node.type==='object' && Array.isArray(node.entries));const entries=archiveFieldEntries(node.entries),fields=new Map<string,any>(entries);requireValue(scalar(fields.get('id'))===entry.id);
    const tag=object(fields.get('file')),raw=payloads.get(tag.path);requireValue(['blob','file'].includes(tag.type) && tag.mimeType===entry.type && raw instanceof Blob && raw.size===entry.size && ['image/png','image/jpeg','image/webp'].includes(entry.type));
    const archivedFields=await prepareInertArchivedFields(entries,payloads,feedFieldPolicy,check);
    if(archivedFields!==undefined){archivedBytes+=archivedFieldBytes(archivedFields);requireValue(archivedBytes<=INERT_ARCHIVED_FIELDS_TOTAL);}
    const file=raw!.slice(0,raw!.size,entry.type);await inspect(file,signal);check();const id=fresh();added.push({id,file,...(archivedFields!==undefined?{archivedFields}:{})});files.push({id,name:entry.name,type:entry.type,size:entry.size,lastModified:entry.lastModified,spoiler:entry.spoiler});
  }
  requireValue(currentCount+added.length<=32 && currentBytes+added.reduce((n,f)=>n+f.file.size,0)<=FEED_CURRENT_BYTES_LIMIT);
  const poll=draft!.poll ? {question:draft!.poll.question,options:[...draft!.poll.options],multiple:draft!.poll.multiple,closesAt:draft!.poll.closesAt}:null;
  const target=JSON.stringify({version:1,revision:fresh(),text:draft!.text,clientId:fresh(),files,poll,...(draftFields!==undefined?{archivedFields:draftFields}:{})});parseMetadata(target);
  return {added,target,text:draft!.text,images:files.length,pendingExcluded:Boolean(draft!.pending)};
}
