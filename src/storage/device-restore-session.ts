import {observeAccountWrites,type AccountWriteObservation} from './account-write-version';
import {exportDeviceData} from './device-data-export';
import {reviewDeviceArchive} from './device-data-review';
import {NativeRestorePointStore,type RestorePointStore} from './device-restore-point-store';
import {awaitRestorePoint,restorePointDigest,restorePointPayloadDigest,restorePointLockName,RESTORE_POINT_ARCHIVE,RESTORE_POINT_COUNT,RESTORE_POINT_TOTAL,
 type DeviceRestorePoint,type RestorePointToken,type RestoreAction} from './device-restore-point-model';

export async function withRestorePointLock<T>(owner:number,current:()=>boolean,signal:AbortSignal,task:()=>Promise<T>):Promise<T> {
 if(signal.aborted||!current())throw new Error('Device import cancelled.');
 if(typeof navigator==='undefined'||!navigator.locks?.request)throw new Error('This browser cannot coordinate saved-device imports. No import was started.');
 return navigator.locks.request(restorePointLockName(owner),{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock)throw new Error('Another device import is running for this account. Retry after it finishes.');
  if(signal.aborted||!current())throw new Error('Device import cancelled.');return task();
 });
}
/** Two matching captures; each holds existing IDB scopes together, without a global localStorage/Cloud transaction. */
export async function captureDeviceRestorePoint(owner:number,version:string,source:Blob,current:()=>boolean,signal:AbortSignal,
 capture=exportDeviceData):Promise<DeviceRestorePoint> {
 const check=()=>{if(signal.aborted||!current())throw new Error('Restore point capture cancelled.');};check();
 if(!(source instanceof Blob)||source.size>RESTORE_POINT_ARCHIVE)throw new Error('The source ZIP exceeds the 512 MiB restore point limit.');
 await reviewDeviceArchive(source,{owner,current,signal});check();
 const sourceHash=await restorePointDigest(source,check);
 const first=await capture({owner,version,current,signal,maximumBytes:RESTORE_POINT_ARCHIVE});check();if(first.blob.size>RESTORE_POINT_ARCHIVE)throw new Error('Saved device data exceeds the 512 MiB restore point limit.');
 await reviewDeviceArchive(first.blob,{owner,current,signal});const firstPayload=await restorePointPayloadDigest(first.blob,check);
 const second=await capture({owner,version,current,signal,maximumBytes:RESTORE_POINT_ARCHIVE});check();if(second.blob.size>RESTORE_POINT_ARCHIVE)throw new Error('Saved device data exceeds the 512 MiB restore point limit.');
 await reviewDeviceArchive(second.blob,{owner,current,signal});
 if(firstPayload!==await restorePointPayloadDigest(second.blob,check))throw new Error('Saved data changed while preparing the restore point. No import was started. Select the ZIP again when changes have settled.');
 const beforeHash=await restorePointDigest(second.blob,check);check();
 return {format:1,id:crypto.randomUUID(),owner,createdAt:Date.now(),version,before:second.blob,source,beforeHash,sourceHash,bytes:second.blob.size+source.size,operations:[]};
}

/** One verified before/source pair per selected ZIP; never executes recorded pending operations. */
export class DeviceRestoreSession {
 #token:RestorePointToken|undefined;#busy=false;#closed=false;#failed=false;
 readonly store:RestorePointStore;readonly capture:typeof captureDeviceRestorePoint;readonly lock:typeof withRestorePointLock;readonly observe:(owner:number)=>AccountWriteObservation;
 constructor(readonly owner:number,readonly version:string,readonly source:Blob,dependencies:{store?:RestorePointStore;capture?:typeof captureDeviceRestorePoint;lock?:typeof withRestorePointLock;observe?:(owner:number)=>AccountWriteObservation}={}) {
  this.store=dependencies.store??new NativeRestorePointStore(owner);this.capture=dependencies.capture??captureDeviceRestorePoint;this.lock=dependencies.lock??withRestorePointLock;this.observe=dependencies.observe??observeAccountWrites;
 }
 close():void {this.#closed=true;}
 async run<T>(action:RestoreAction,current:()=>boolean,signal:AbortSignal,apply:(current:()=>boolean)=>Promise<T>|T):Promise<T> {
  if(this.#busy)throw new Error('An import is already running for this ZIP.');
  if(this.#failed)throw new Error('Check saved restore points and select the ZIP again before retrying.');
  const valid=()=>!this.#closed&&current(),check=()=>{if(!valid()||signal.aborted)throw new Error('Device import cancelled.');};check();this.#busy=true;
  try{return await this.lock(this.owner,valid,signal,async()=>{
   const observation=this.observe(this.owner);let applying=false;
   const checked=()=>{check();observation.check(applying);};
   const guarded=()=>{try{checked();return true;}catch{return false;}};
   try {
   checked();if(!this.#token){
    const points=await this.store.list(guarded,signal);checked();if(points.length>=RESTORE_POINT_COUNT||points.reduce((n,p)=>n+p.bytes,0)+this.source.size>=RESTORE_POINT_TOTAL)throw new Error('Restore point storage is full. Download and remove a copy before importing.');
    const captureSignal=AbortSignal.any([signal,AbortSignal.timeout(120000)]),point=await awaitRestorePoint(this.capture(this.owner,this.version,this.source,guarded,captureSignal),captureSignal);checked();
    await this.store.add(point,guarded,signal);checked();this.#token={id:point.id,beforeHash:point.beforeHash,sourceHash:point.sourceHash};
   }
   await this.store.get(this.#token,guarded,signal);checked();const operation=await this.store.begin(this.#token,action,guarded,signal);checked();
   let result:T;
   try{applying=true;result=await apply(guarded);checked();}
   catch(error){try{observation.check(applying);}catch(conflict){error=conflict;}if(valid()&&!signal.aborted){try{await this.store.finish(this.#token,operation,'uncertain',valid,signal);}catch{const detail=error instanceof Error?error.message:'The section import failed.';throw new Error(`${detail} The import result and its restore-point status could not be confirmed. Check saved restore points and the section recovery before retrying.`);}}throw error;}
   checked();await this.store.finish(this.#token,operation,'complete',guarded,signal);checked();return result;
   } finally { observation.close(); }
  });}catch(error){this.#failed=true;throw error;}finally{this.#busy=false;}
 }
}
