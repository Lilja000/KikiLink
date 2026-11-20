import {ThreadHistoryCopyRepository} from './thread-history-copy-repository';
import {prepareThreadCopies,verifyThreadCopy,threadCopiesToken,type ThreadHistoryDeviceSource} from './thread-history-device-source';
import {threadCopyScope,THREAD_COPY_COUNT,THREAD_COPY_TOTAL,type ThreadHistoryCopy} from './thread-history-copy-model';

export interface ThreadHistoryImportReview {readonly copies:number;readonly kept:number;readonly bytes:number;readonly entries:readonly Readonly<{kind:string;label:string;origin:string;messages:number;files:number;bytes:number}>[]}
export class ThreadHistoryDeviceImporter {
 #epoch=0;#pending:{review:ThreadHistoryImportReview;copies:ThreadHistoryCopy[];before:string}|undefined;
 constructor(readonly owner:number,readonly factory:IDBFactory=globalThis.indexedDB){}
 cancel():void{this.#epoch++;this.#pending=undefined;}
 async review(source:ThreadHistoryDeviceSource,current:()=>boolean,signal:AbortSignal):Promise<ThreadHistoryImportReview>{
  this.cancel();const epoch=this.#epoch,valid=()=>current()&&epoch===this.#epoch,check=()=>{if(signal.aborted||!valid())throw new Error('Saved history import cancelled.');};check();
  const copies=await prepareThreadCopies(source,this.owner,check,signal),repo=new ThreadHistoryCopyRepository(this.owner,valid,this.factory),before=await repo.read(signal);check();
  for(const copy of before)await verifyThreadCopy(copy,this.owner,check,signal);
  const additions=this.#additions(copies,before);check();
  const review=Object.freeze({copies:additions.length,kept:copies.length-additions.length,bytes:additions.reduce((n,p)=>n+p.zip.size,0),entries:Object.freeze(additions.map(p=>Object.freeze({kind:p.identity.scope.kind,label:p.identity.scope.label,origin:p.identity.origin,messages:p.summary.messages,files:p.summary.files,bytes:p.zip.size})))});
  this.#pending={review,copies,before:threadCopiesToken(before)};return review;
 }
 #additions(copies:ThreadHistoryCopy[],before:ThreadHistoryCopy[]):ThreadHistoryCopy[]{
  const current=new Map(before.map(p=>[p.id,p]));
  for(const p of copies){const old=current.get(p.id);if(old&&threadCopyScope(old.identity)!==threadCopyScope(p.identity))throw new Error('Saved history conflicts with another conversation. No copies were changed.');}
  const additions=copies.filter(p=>!current.has(p.id));
  if(before.length+additions.length>THREAD_COPY_COUNT||[...before,...additions].reduce((n,p)=>n+p.zip.size,0)>THREAD_COPY_TOTAL)throw new Error('Saved history would exceed 8 batches / 256 MiB. Download and remove an unwanted copy before reviewing again.');
  return additions;
 }
 async apply(review:ThreadHistoryImportReview,current:()=>boolean,signal:AbortSignal):Promise<number>{
  const pending=this.#pending;this.#pending=undefined;const epoch=this.#epoch,valid=()=>current()&&epoch===this.#epoch,check=()=>{if(signal.aborted||!valid())throw new Error('Saved history import cancelled.');};check();
  if(!pending||pending.review!==review||!review.copies)throw new Error('Review this account’s saved history again before importing.');
  const repo=new ThreadHistoryCopyRepository(this.owner,valid,this.factory),before=await repo.read(signal);check();
  if(threadCopiesToken(before)!==pending.before)throw new Error('Saved history changed. Review the ZIP again before importing.');
  for(const p of before)await verifyThreadCopy(p,this.owner,check,signal);
  for(const p of pending.copies)await verifyThreadCopy(p,this.owner,check,signal);
  const additions=this.#additions(pending.copies,before);check();
  await repo.transaction(true,'readwrite',signal,(rows,store)=>{
   if(threadCopiesToken(rows)!==pending.before)throw new Error('Saved history changed. Review the ZIP again before importing.');
   const planned=this.#additions(pending.copies,rows);for(const p of planned)store!.add(p);
  });
  try{
   const saved=await repo.read(signal);for(const p of additions){const found=saved.find(r=>r.id===p.id);if(!found||threadCopiesToken([found])!==threadCopiesToken([p]))throw new Error();await verifyThreadCopy(found,this.owner,check,signal);}check();
  }catch{throw new Error('Saved history import could not be confirmed. Check saved batches and restore points before reviewing again.');}
  return additions.length;
 }
}
