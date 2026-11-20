import {checkThreadCopy,threadCopyDatabaseName,THREAD_COPY_COUNT,THREAD_COPY_TOTAL,type ThreadHistoryCopy} from './thread-history-copy-model';

const STORE='archives';

/** Account-scoped native I/O shared by conversation views and reviewed device imports. */
export class ThreadHistoryCopyRepository {
 readonly name:string;
 constructor(readonly owner:number,readonly current:()=>boolean,readonly factory:IDBFactory=globalThis.indexedDB){this.name=threadCopyDatabaseName(owner);}
 #check(signal:AbortSignal):()=>void {return()=>{if(signal.aborted||!this.current())throw new Error('Saved history operation stopped.');};}
 #wait<T>(task:Promise<T>,signal:AbortSignal):Promise<T>{return new Promise((resolve,reject)=>{
  let done=false;const end=(error?:unknown,value?:T)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);error?reject(error):resolve(value!);};
  const abort=()=>end(new Error('Saved history operation stopped.')),timer=setTimeout(()=>end(new Error('Saved history storage timed out.')),10000);
  signal.addEventListener('abort',abort,{once:true});task.then(v=>end(undefined,v),e=>end(e??new Error('Saved history storage failed.')));if(signal.aborted)abort();
 });}
 async #inventory(check:()=>void,signal:AbortSignal):Promise<boolean>{
  check();if(typeof this.factory?.databases!=='function')throw new Error('This browser cannot safely inspect saved history.');
  const entries=await this.#wait(this.factory.databases(),signal);check();const matches=entries.filter(d=>d.name===this.name);
  if(matches.length>1||matches[0]&&matches[0].version!==1)throw new Error('Saved history needs a compatible KikiLink version.');return matches.length===1;
 }
 #open(create:boolean,check:()=>void,signal:AbortSignal):Promise<IDBDatabase>{check();return new Promise((resolve,reject)=>{
  let settled=false;const request=create?this.factory.open(this.name,1):this.factory.open(this.name);
  const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',fail);reject(new Error('Saved history storage could not be opened safely.'));};
  const timer=setTimeout(fail,10000);signal.addEventListener('abort',fail,{once:true});request.onerror=request.onblocked=fail;
  request.onupgradeneeded=e=>{try{check();if(settled||!create||e.oldVersion!==0)throw new Error();request.result.createObjectStore(STORE,{keyPath:'id'});}catch{request.transaction?.abort();fail();}};
  request.onsuccess=()=>{const db=request.result;if(settled){db.close();return;}try{check();if(db.version!==1||db.objectStoreNames.length!==1||!db.objectStoreNames.contains(STORE))throw new Error();const s=db.transaction(STORE,'readonly').objectStore(STORE);if(s.keyPath!=='id'||s.autoIncrement||s.indexNames.length)throw new Error();}catch{db.close();fail();return;}
   settled=true;clearTimeout(timer);signal.removeEventListener('abort',fail);db.onversionchange=()=>db.close();resolve(db);};
 });}
 async transaction<T>(create:boolean,mode:IDBTransactionMode,signal:AbortSignal,operation:(copies:ThreadHistoryCopy[],store:IDBObjectStore|undefined)=>T):Promise<T>{
  const check=this.#check(signal),exists=await this.#inventory(check,signal);if(!exists&&!create)return operation([],undefined);
  const db=await this.#open(create,check,signal);
  try{return await new Promise<T>((resolve,reject)=>{
   const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE),rows:ThreadHistoryCopy[]=[];let result:T,bytes=0,reason='Saved history could not be read or written completely.';
   const abort=()=>{try{tx.abort();}catch{}},timer=setTimeout(abort,20000),finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);};signal.addEventListener('abort',abort,{once:true});db.onversionchange=abort;
   tx.onabort=()=>{finish();reject(new Error(reason));};tx.oncomplete=()=>{finish();try{check();resolve(result);}catch(e){reject(e);}};
   const request=store.openCursor();request.onerror=abort;request.onsuccess=()=>{try{
    check();const c=request.result;if(c){checkThreadCopy(c.value,this.owner);const p=c.value;bytes+=p.zip.size;
     if(c.key!==p.id||rows.some(r=>r.id===p.id)||rows.length>=THREAD_COPY_COUNT||bytes>THREAD_COPY_TOTAL)throw new Error('Saved history storage exceeds supported limits.');rows.push(p);c.continue();
    }else result=operation(rows,store);
   }catch(e){reason=e instanceof Error?e.message:reason;abort();}};
  });}finally{db.close();}
 }
 async read(signal:AbortSignal):Promise<ThreadHistoryCopy[]>{return this.transaction(false,'readonly',signal,rows=>rows);}
}
