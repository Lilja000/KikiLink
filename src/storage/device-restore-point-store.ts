import {checkRestorePoint,restorePointDatabaseName,restorePointDigest,restorePointInfo,sameRestorePoint,RESTORE_POINT_COUNT,RESTORE_POINT_TOTAL,RESTORE_POINT_OPERATIONS,
 type DeviceRestorePoint,type RestorePointInfo,type RestorePointToken,type RestoreAction} from './device-restore-point-model';
const STORE='points';
export interface RestorePointStore {
 list(current:()=>boolean,signal:AbortSignal):Promise<RestorePointInfo[]>;
 add(point:DeviceRestorePoint,current:()=>boolean,signal:AbortSignal):Promise<void>;
 get(token:RestorePointToken,current:()=>boolean,signal:AbortSignal):Promise<DeviceRestorePoint>;
 begin(token:RestorePointToken,action:RestoreAction,current:()=>boolean,signal:AbortSignal):Promise<number>;
 finish(token:RestorePointToken,id:number,state:'complete'|'uncertain',current:()=>boolean,signal:AbortSignal):Promise<void>;
 remove(token:RestorePointToken,current:()=>boolean,signal:AbortSignal):Promise<void>;
}
export class NativeRestorePointStore implements RestorePointStore {
 readonly name:string;
 constructor(readonly owner:number,readonly factory:IDBFactory=globalThis.indexedDB){this.name=restorePointDatabaseName(owner);}
 #check(current:()=>boolean,signal:AbortSignal):()=>void {return()=>{if(signal.aborted||!current())throw new Error('Restore point operation cancelled.');};}
 async #inventory(check:()=>void,signal:AbortSignal):Promise<boolean> {
  check();if(typeof this.factory?.databases!=='function')throw new Error('This browser cannot safely inspect restore points.');
  const entries=await this.#wait(this.factory.databases(),signal);check();const matches=entries.filter(d=>d.name===this.name);
  if(matches.length>1||matches[0]&&matches[0].version!==1)throw new Error('Restore points need a compatible KikiLink version.');return matches.length===1;
 }
 #wait<T>(task:Promise<T>,signal:AbortSignal):Promise<T> {return new Promise((resolve,reject)=>{
  let done=false;const end=(error?:unknown,value?:T)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);error?reject(error):resolve(value!);};
  const abort=()=>end(new Error('Restore point operation cancelled.')),timer=setTimeout(()=>end(new Error('Restore point storage timed out.')),10000);
  signal.addEventListener('abort',abort,{once:true});task.then(v=>end(undefined,v),e=>end(e??new Error('Restore point storage failed.')));if(signal.aborted)abort();
 });}
 #open(create:boolean,check:()=>void,signal:AbortSignal):Promise<IDBDatabase> {check();return new Promise((resolve,reject)=>{
  let settled=false;const request=create?this.factory.open(this.name,1):this.factory.open(this.name),fail=()=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',fail);reject(new Error('Restore point storage could not be opened safely.'));};
  const timer=setTimeout(fail,10000);signal.addEventListener('abort',fail,{once:true});request.onerror=request.onblocked=fail;
  request.onupgradeneeded=event=>{try{check();if(settled||!create||event.oldVersion!==0)throw new Error();request.result.createObjectStore(STORE,{keyPath:'id'});}catch{request.transaction?.abort();fail();}};
  request.onsuccess=()=>{const db=request.result;if(settled){db.close();return;}try{check();if(db.version!==1||db.objectStoreNames.length!==1||!db.objectStoreNames.contains(STORE))throw new Error();const s=db.transaction(STORE,'readonly').objectStore(STORE);if(s.keyPath!=='id'||s.autoIncrement||s.indexNames.length)throw new Error();}catch{db.close();fail();return;}
   settled=true;clearTimeout(timer);signal.removeEventListener('abort',fail);db.onversionchange=()=>db.close();resolve(db);};
 });}
 async #transaction<T>(create:boolean,mode:IDBTransactionMode,current:()=>boolean,signal:AbortSignal,operation:(points:DeviceRestorePoint[],store:IDBObjectStore|undefined)=>T):Promise<T> {
  const check=this.#check(current,signal),exists=await this.#inventory(check,signal);if(!exists&&!create)return operation([],undefined);
  const db=await this.#open(create,check,signal);
  try{return await new Promise<T>((resolve,reject)=>{
   const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE),rows:DeviceRestorePoint[]=[];let result:T,bytes=0,reason='Restore point storage could not be read or written completely.';
   const abort=()=>{try{tx.abort();}catch{}},timer=setTimeout(abort,20000),finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);};signal.addEventListener('abort',abort,{once:true});db.onversionchange=abort;
   tx.onabort=()=>{finish();reject(new Error(reason));};tx.oncomplete=()=>{finish();try{check();resolve(result);}catch(e){reject(e);}};
   const cursor=store.openCursor();cursor.onerror=abort;cursor.onsuccess=()=>{try{check();const c=cursor.result;if(c){checkRestorePoint(c.value,this.owner);const p=c.value;bytes+=p.bytes;if(c.key!==p.id||rows.some(r=>r.id===p.id)||rows.length>=RESTORE_POINT_COUNT||bytes>RESTORE_POINT_TOTAL)throw new Error('Restore point storage exceeds supported limits.');rows.push(p);c.continue();}else result=operation(rows,store);}catch(e){reason=e instanceof Error?e.message:reason;abort();}};
  });}finally{db.close();}
 }
 async list(current:()=>boolean,signal:AbortSignal):Promise<RestorePointInfo[]> {return this.#transaction(false,'readonly',current,signal,rows=>rows.map(restorePointInfo).sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id)));}
 async get(token:RestorePointToken,current:()=>boolean,signal:AbortSignal):Promise<DeviceRestorePoint> {
  const p=await this.#transaction(false,'readonly',current,signal,rows=>rows.find(p=>sameRestorePoint(p,token)));if(!p)throw new Error('This restore point changed or is no longer saved. Select the ZIP again.');
  const check=this.#check(current,signal);if(await restorePointDigest(p.before,check)!==p.beforeHash||await restorePointDigest(p.source,check)!==p.sourceHash)throw new Error('A saved restore point is damaged. It has not been used.');check();return p;
 }
 async add(point:DeviceRestorePoint,current:()=>boolean,signal:AbortSignal):Promise<void> {
  checkRestorePoint(point,this.owner);const check=this.#check(current,signal);if(point.operations.length||await restorePointDigest(point.before,check)!==point.beforeHash||await restorePointDigest(point.source,check)!==point.sourceHash)throw new Error('The restore point changed before saving.');
  await this.#transaction(true,'readwrite',current,signal,(rows,store)=>{if(rows.length>=RESTORE_POINT_COUNT||rows.reduce((n,r)=>n+r.bytes,point.bytes)>RESTORE_POINT_TOTAL)throw new Error('Restore point storage is full (5 copies / 1 GiB). Download and remove a copy before importing.');if(rows.some(r=>r.id===point.id))throw new Error('A restore point with this ID already exists.');store!.add(point);});
  try{const saved=await this.get(point,current,signal);if(JSON.stringify(restorePointInfo(saved))!==JSON.stringify(restorePointInfo(point)))throw new Error();}catch{throw new Error('Restore point save could not be confirmed. No import was started. Check saved restore points and select the ZIP again.');}
 }
 async begin(token:RestorePointToken,action:RestoreAction,current:()=>boolean,signal:AbortSignal):Promise<number> {
  const id=await this.#transaction(false,'readwrite',current,signal,(rows,store)=>{
   const point=rows.find(p=>sameRestorePoint(p,token));if(!point||!store)throw new Error('Restore point changed. Select the ZIP again.');if(point.operations.length>=RESTORE_POINT_OPERATIONS)throw new Error('This restore point has reached 32 operations. Select the ZIP again.');
   const id=point.operations.length+1;point.operations.push({id,action,state:'pending',startedAt:Math.max(Date.now(),point.createdAt),finishedAt:null});checkRestorePoint(point,this.owner);store.put(point);return id;
  });
  const saved=await this.get(token,current,signal),op=saved.operations.find(o=>o.id===id);if(!op||op.action!==action||op.state!=='pending')throw new Error('Import intent could not be confirmed. No import was started.');return id;
 }
 async finish(token:RestorePointToken,id:number,state:'complete'|'uncertain',current:()=>boolean,signal:AbortSignal):Promise<void> {
  await this.#transaction(false,'readwrite',current,signal,(rows,store)=>{const p=rows.find(p=>sameRestorePoint(p,token)),op=p?.operations.find(o=>o.id===id);if(!p||!op||op.state!=='pending'||!store)throw new Error('Import status changed. Check the saved restore point.');op.state=state;op.finishedAt=Math.max(Date.now(),op.startedAt);checkRestorePoint(p,this.owner);store.put(p);});
  const p=await this.get(token,current,signal);if(p.operations.find(o=>o.id===id)?.state!==state)throw new Error('Import status could not be confirmed. Check saved restore points before retrying.');
 }
 async remove(token:RestorePointToken,current:()=>boolean,signal:AbortSignal):Promise<void> {
  await this.#transaction(false,'readwrite',current,signal,(rows,store)=>{if(!store||!rows.some(p=>sameRestorePoint(p,token)))throw new Error('Restore point changed. Refresh the list.');store.delete(token.id);});
  if((await this.list(current,signal)).some(p=>p.id===token.id))throw new Error('Restore point removal could not be confirmed. Refresh the list.');
 }
}
