import {checkThreadCopy,threadCopyDatabaseName,threadCopyInfo,threadCopySummary,THREAD_COPY_COUNT,THREAD_COPY_TOTAL,type ThreadHistoryCopy} from './thread-history-copy-model';
import {deviceDataDigest} from './device-data-digest';
import {readThreadHistoryZip} from '../cloud/thread-history-format';
import type {ZipFile} from '../utils/stored-zip';

export const THREAD_SOURCE_METADATA=2*1024*1024;
export interface ThreadHistoryDeviceSource {readonly metadata:string;readonly files:readonly Readonly<ZipFile>[]}
const need=(ok:unknown):void=>{if(!ok)throw new Error('The saved group/channel history is unsupported or inconsistent. Keep the original ZIP.');};
type Data=Record<string,unknown>;
const object=(v:unknown):Data=>{need(v&&typeof v==='object'&&!Array.isArray(v));return v as Data;};
const exact=(v:unknown,keys:string[]):Data=>{const o=object(v);need(Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k)));return o;};

/** Immutable ZIP bytes plus strict known record metadata; no arbitrary tagged object activation. */
export async function prepareThreadCopies(source:ThreadHistoryDeviceSource,owner:number,check:()=>void,signal:AbortSignal):Promise<ThreadHistoryCopy[]> {
 check();need(typeof source.metadata==='string'&&source.metadata.length<=THREAD_SOURCE_METADATA&&new TextEncoder().encode(source.metadata).length<=THREAD_SOURCE_METADATA);
 const files=new Map(source.files.map(f=>{need(/^binary\/[0-9]{5}\.bin$/.test(f.name)&&f.blob instanceof Blob);return [f.name,f.blob] as const;}));
 need(files.size===source.files.length&&files.size<=THREAD_COPY_COUNT&&[...files.values()].reduce((n,b)=>n+b.size,0)<=THREAD_COPY_TOTAL);
 const snapshot=exact(JSON.parse(source.metadata),['name','version','stores']);need(snapshot.name===threadCopyDatabaseName(owner)&&snapshot.version===1&&Array.isArray(snapshot.stores)&&snapshot.stores.length===1);
 const store=exact((snapshot.stores as unknown[])[0],['name','keyPath','autoIncrement','indexes','records']);
 need(store.name==='archives'&&store.keyPath==='id'&&store.autoIncrement===false&&Array.isArray(store.indexes)&&!store.indexes.length&&Array.isArray(store.records)&&store.records.length<=THREAD_COPY_COUNT);
 let nodes=0;const used=new Set<string>(),ids=new Set<string>();
 const decode=(value:unknown,depth=0):unknown=>{
  check();need(++nodes<=4096&&depth<=8);const tag=object(value);
  if(tag.type==='value'){exact(tag,['type','value']);need(tag.value===null||typeof tag.value==='string'||typeof tag.value==='boolean');return tag.value;}
  if(tag.type==='number'){exact(tag,['type','value']);need(typeof tag.value==='number'&&Number.isFinite(tag.value));return tag.value;}
  if(tag.type==='object'){
   exact(tag,['type','entries']);need(Array.isArray(tag.entries));const result=Object.create(null) as Data;
   for(const pair of tag.entries as unknown[]){need(Array.isArray(pair)&&pair.length===2);const [key,item]=pair as unknown[];need(typeof key==='string'&&!Object.hasOwn(result,key));result[key as string]=decode(item,depth+1);}return result;
  }
  need(tag.type==='blob'||tag.type==='file');exact(tag,tag.type==='blob'?['type','path','mimeType']:['type','path','mimeType','name','lastModified']);
  need(typeof tag.path==='string'&&typeof tag.mimeType==='string'&&tag.mimeType.length<=256&&!used.has(tag.path));
  const blob=files.get(tag.path as string);need(blob);used.add(tag.path as string);
  if(tag.type==='file'){need(typeof tag.name==='string'&&tag.name.length<=4096&&Number.isSafeInteger(tag.lastModified)&&Number(tag.lastModified)>=0);return new File([blob!],tag.name as string,{type:tag.mimeType as string,lastModified:tag.lastModified as number});}
  return blob!.slice(0,blob!.size,tag.mimeType as string);
 };
 const copies:ThreadHistoryCopy[]=[];
 for(const raw of store.records as unknown[]){
  const row=exact(raw,['key','value']),key=decode(row.key),copy=decode(row.value);checkThreadCopy(copy,owner);need(key===copy.id&&!ids.has(copy.id));ids.add(copy.id);
  await verifyThreadCopy(copy,owner,check,signal);copies.push(copy);
 }
 need(used.size===files.size);check();return copies;
}

export async function verifyThreadCopy(copy:ThreadHistoryCopy,owner:number,check:()=>void,signal:AbortSignal):Promise<void>{
 check();checkThreadCopy(copy,owner);need(await deviceDataDigest(copy.zip,check)===copy.id);
 const batch=await readThreadHistoryZip(copy.zip,copy.identity,check,signal);need(JSON.stringify(threadCopySummary(batch))===JSON.stringify(copy.summary));check();
}
export const threadCopiesToken=(rows:ThreadHistoryCopy[]):string=>JSON.stringify(rows.map(p=>[threadCopyInfo(p),p.zip.type,typeof File!=='undefined'&&p.zip instanceof File?[p.zip.name,p.zip.lastModified]:null]).sort((a,b)=>String((a[0] as {id:string}).id).localeCompare((b[0] as {id:string}).id)));
