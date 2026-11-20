import {ThreadHistoryCopyRepository} from './thread-history-copy-repository';
import {readThreadHistoryZip,type ThreadHistoryIdentity,type ThreadHistoryBatch} from '../cloud/thread-history-format';
import {deviceDataDigest} from './device-data-digest';
import {checkThreadCopy,threadCopyScope,threadCopySummary,threadCopyInfo,THREAD_COPY_COUNT,THREAD_COPY_TOTAL,THREAD_COPY_ZIP,type ThreadHistoryCopy,type ThreadHistoryCopyInfo} from './thread-history-copy-model';

export interface OpenThreadCopy {info:ThreadHistoryCopyInfo;batch:ThreadHistoryBatch;zip:Blob}
/** Immutable original ZIPs. Never merge their IDs into live messages, receipts or outboxes. */
export class ThreadHistoryCopyStore {
 readonly name:string;readonly identity:ThreadHistoryIdentity;
 #selection:ThreadHistoryCopy|undefined;#closed=false;readonly #repository:ThreadHistoryCopyRepository;
 constructor(identity:ThreadHistoryIdentity,readonly current:()=>boolean,readonly factory:IDBFactory=globalThis.indexedDB){
  threadCopyScope(identity);this.identity=Object.freeze({...identity,scope:Object.freeze({...identity.scope})});this.#repository=new ThreadHistoryCopyRepository(identity.owner,()=>!this.#closed&&this.current(),factory);this.name=this.#repository.name;
 }
 #check(signal:AbortSignal):()=>void {return()=>{if(this.#closed||signal.aborted||!this.current())throw new Error('Saved history operation stopped.');};}
 #matches(p:ThreadHistoryCopy):boolean{return threadCopyScope(p.identity)===threadCopyScope(this.identity);}
 async list(signal:AbortSignal):Promise<ThreadHistoryCopyInfo[]>{return this.#repository.transaction(false,'readonly',signal,rows=>rows.filter(p=>this.#matches(p)).map(threadCopyInfo).sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id)));}
 async review(zip:Blob,signal:AbortSignal):Promise<OpenThreadCopy>{
  const check=this.#check(signal);check();if(zip.size>THREAD_COPY_ZIP)throw new Error('History ZIP exceeds the 130 MiB limit.');
  const batch=await readThreadHistoryZip(zip,this.identity,check,signal),id=await deviceDataDigest(zip,check);check();
  const point:ThreadHistoryCopy={format:1,id,identity:this.identity,createdAt:Date.now(),summary:threadCopySummary(batch),zip};checkThreadCopy(point,this.identity.owner);this.#selection=point;
  return {info:threadCopyInfo(point),batch,zip};
 }
 async restore(signal:AbortSignal):Promise<OpenThreadCopy>{
  const check=this.#check(signal);check();const point=this.#selection;if(!point)throw new Error('Choose and review a history ZIP first.');
  await this.#repository.transaction(true,'readwrite',signal,(rows,store)=>{
   if(rows.some(p=>p.id===point.id&&this.#matches(p)))return;
   if(rows.some(p=>p.id===point.id))throw new Error('Saved history identity conflicts with another copy.');
   if(rows.length>=THREAD_COPY_COUNT||rows.reduce((n,p)=>n+p.zip.size,point.zip.size)>THREAD_COPY_TOTAL)throw new Error('Saved history is full (8 batches / 256 MiB per account). Download and remove a saved batch first.');
   store!.add(point);
  });
  // The immutable original must survive a fresh read before the UI reports success.
  try{return await this.get(point.id,signal);}catch{throw new Error('Saving could not be confirmed. Refresh saved history before retrying.');}
 }
 async get(id:string,signal:AbortSignal):Promise<OpenThreadCopy>{
  const point=await this.#repository.transaction(false,'readonly',signal,rows=>rows.find(p=>p.id===id&&this.#matches(p)));if(!point)throw new Error('This saved batch is no longer available. Refresh the list.');
  const check=this.#check(signal);if(await deviceDataDigest(point.zip,check)!==point.id)throw new Error('This saved ZIP is damaged. Keep your original file.');
  const batch=await readThreadHistoryZip(point.zip,this.identity,check,signal);if(JSON.stringify(threadCopySummary(batch))!==JSON.stringify(point.summary))throw new Error('Saved history metadata changed. Keep the original ZIP.');check();
  return {info:threadCopyInfo(point),batch,zip:point.zip};
 }
 async remove(id:string,signal:AbortSignal):Promise<void>{
  await this.#repository.transaction(false,'readwrite',signal,(rows,store)=>{if(!store||!rows.some(p=>p.id===id&&this.#matches(p)))throw new Error('Saved history changed. Refresh the list.');store.delete(id);});
  if((await this.list(signal)).some(p=>p.id===id))throw new Error('Removal could not be confirmed. Refresh the list.');
 }
 close():void{this.#closed=true;this.#selection=undefined;}
}
