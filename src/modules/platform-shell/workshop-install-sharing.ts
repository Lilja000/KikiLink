import {engagementReview,engagementWrite,engagementReceipt,workshopAccessAt,requireWorkshopSource,type WorkshopSource} from './workshop-engagement';
import {checkedWorkshopSource} from './workshop-generation';
import type {KeyValueStorage} from '../../core/settings';
import {CloudError,type CloudClient} from '../../cloud/client';
import {workshopId,workshopVersion} from './workshop-model';
export interface InstallationReport {packageId:string;version:string;}
export interface SharedInstallations {source?:WorkshopSource;owner:number;revision:number;updatedAt:number|null;limit:1000;entries:Array<InstallationReport&{reportedAt:number}>;}
export interface PendingInstallationReport {format:1|2;source?:WorkshopSource;operationId:string;createdAt:number;action:'share'|'clear';revision:number;entries:InstallationReport[];confirmed:boolean;}
export type InstallSharingLock=(key:string,fn:()=>Promise<void>)=>Promise<unknown>;
const exact=(v:unknown,keys:string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const integer=(v:unknown,min=0):v is number=>Number.isSafeInteger(v)&&Number(v)>=min;
const time=(v:unknown):v is number=>integer(v,1)&&v<=8640000000000000;
const entries=(v:unknown,max=32):v is InstallationReport[]=>Array.isArray(v)&&v.length<=max&&new Set(v.map(e=>e?.packageId)).size===v.length&&v.every(e=>exact(e,['packageId','version'])&&workshopId(e.packageId)&&workshopVersion(e.version));
export function checkedInstallPending(v:unknown):PendingInstallationReport{
 const version=(v as PendingInstallationReport)?.format;
 if(!exact(v,['format','operationId','createdAt','action','revision','entries','confirmed',...version===2?['source']:[]])||![1,2].includes(Number(v.format))||!workshopId(v.operationId)||!time(v.createdAt)||v.action!=='share'&&v.action!=='clear'||!integer(v.revision)||v.revision>=Number.MAX_SAFE_INTEGER||!entries(v.entries)||v.action==='share'&&!v.entries.length||v.action==='clear'&&v.entries.length!==0||typeof v.confirmed!=='boolean')throw new Error('Installation sharing queue contains unsupported data. It is kept unchanged.');
 if(version===2)checkedWorkshopSource(v.source);return structuredClone(v) as unknown as PendingInstallationReport;
}
export function checkedSharedInstallations(v:unknown,owner:number):SharedInstallations{
 if(!exact(v,['owner','revision','updatedAt','limit','entries',...(v as SharedInstallations)?.source===undefined?[]:['source']])||v.owner!==owner||!integer(v.revision)||v.limit!==1000||!Array.isArray(v.entries)||v.entries.length>1000||new Set(v.entries.map(e=>e?.packageId)).size!==v.entries.length||v.entries.some(e=>!exact(e,['packageId','version','reportedAt'])||!workshopId(e.packageId)||!workshopVersion(e.version)||!time(e.reportedAt))||v.revision===0&&(v.updatedAt!==null||v.entries.length!==0)||v.revision>0&&!time(v.updatedAt))throw new Error('Invalid shared installation history.');
 if(v.source!==undefined)checkedWorkshopSource(v.source);return structuredClone(v) as unknown as SharedInstallations;
}
const acknowledgements=new WeakMap<CloudClient,Map<string,{raw:string|null;pending:PendingInstallationReport}>>();
/** Optional reporting after a confirmed local install. Reads and reconnects never send a queue. */
export class WorkshopInstallSharing {
 readonly owner:number;readonly origin:string;readonly key:string;readonly #known:Map<string,{raw:string|null;pending:PendingInstallationReport}>;
 constructor(readonly client:CloudClient,readonly storage:KeyValueStorage,readonly account:()=>boolean,readonly lock?:InstallSharingLock){this.owner=client.memberNumber;this.origin=client.origin;if(!integer(this.owner,1)||!this.origin)throw new Error('A Workshop account is required.');this.key=`kikilink:workshop-install-sharing:${encodeURIComponent(this.origin)}:${this.owner}:v1`;let known=acknowledgements.get(client);if(!known)acknowledgements.set(client,known=new Map());this.#known=known;}
 current():boolean{return this.account()&&this.client.memberNumber===this.owner&&this.client.origin===this.origin;}
 #check(valid:()=>boolean,online=false):void{if(!this.current()||!valid())throw new Error('Your installation sharing view or account changed.');if(online&&!this.client.connected)throw new Error('Reconnect to share installations. Installed copies are kept.');}
 async load(valid:()=>boolean):Promise<SharedInstallations>{this.#check(valid,true);const source=await engagementReview(this.client,valid,'workshopDiscovery'),value=await workshopAccessAt(this.client,source,valid).request<unknown>('GET','/v1/workshop/installs');this.#check(valid,true);return {...checkedSharedInstallations(value,this.owner),source};}
 #raw():string|null{const r=this.storage.getItemResult?.(this.key);if(r&&!r.ok)throw new Error('Installation sharing queue could not be read. It is kept unchanged.');return r?r.value:this.storage.getItem(this.key);}
 read():PendingInstallationReport|null{
  this.#check(()=>true);try{const raw=this.#raw();if(raw===null||raw==='null')return null;if(raw.length>16384)throw new Error();const pending=checkedInstallPending(JSON.parse(raw)),known=this.#known.get(this.key);return known?.raw===raw?structuredClone(known.pending):pending;}catch{throw new Error('Installation sharing queue could not be read. It is kept unchanged.');}
 }
 async #locked(action:()=>Promise<void>):Promise<void>{if(this.lock)await this.lock(this.key,action);else if(globalThis.navigator?.locks)await navigator.locks.request(this.key,action);else throw new Error('Web Locks are required for installation sharing.');}
 #unchanged(raw:string|null):void{if(this.#raw()!==raw)throw new Error('The pending installation report changed in another tab.');}
 #write(value:PendingInstallationReport|null,before:string|null):string{this.#unchanged(before);const raw=JSON.stringify(value===null?null:checkedInstallPending(value));try{this.storage.setItem(this.key,raw);if(this.#raw()!==raw)throw new Error();}catch{throw new Error('Installation sharing save could not be confirmed. Review the queue before retrying.');}return raw;}
 async prepare(review:SharedInstallations,values:InstallationReport[],valid:()=>boolean,clear=false):Promise<PendingInstallationReport>{
  checkedSharedInstallations(review,this.owner);const pending=checkedInstallPending({format:review.source?2:1,...review.source?{source:review.source}:{},operationId:crypto.randomUUID(),createdAt:Date.now(),action:clear?'clear':'share',revision:review.revision,entries:values,confirmed:false});
  await this.#locked(async()=>{this.#check(valid);const raw=this.#raw();if(this.read())throw new Error('Finish the pending installation report first. Installed copies are kept.');this.#write(pending,raw);});return pending;
 }
 async run(value:PendingInstallationReport,valid:()=>boolean):Promise<void>{
  const expected=checkedInstallPending(value),same=(v:PendingInstallationReport|null)=>!!v&&JSON.stringify({...v,confirmed:false})===JSON.stringify({...expected,confirmed:false});
  await this.#locked(async()=>{
   this.#check(valid);const raw=this.#raw(),pending=this.read();if(!pending||!same(pending))throw new Error('The pending installation report changed in another tab.');
   let cleanupRaw=raw;
   if(!pending.confirmed){
    const receipt=await engagementWrite(this.client,pending.source,()=>{this.#check(valid,true);this.#unchanged(raw);return true;},'workshopDiscovery',pending.action==='share'?'POST':'DELETE','/v1/workshop/installs',{operationId:pending.operationId,revision:pending.revision,...pending.action==='share'?{entries:pending.entries}:{}}).catch(e=>{if(e instanceof CloudError&&e.status===409)throw new Error('Shared installation history changed. Review the pending report before continuing.');throw e;});
    if(!engagementReceipt(receipt,{owner:this.owner,revision:pending.revision+1,operationId:pending.operationId},pending.source,pending.operationId,'install-'+pending.action))throw new Error('Installation report result could not be confirmed. The exact request is kept.');
    this.#unchanged(raw);const confirmed={...pending,confirmed:true};this.#known.set(this.key,{raw,pending:confirmed});cleanupRaw=this.#write(confirmed,raw);
   }
   this.#check(valid);this.#write(null,cleanupRaw);this.#known.delete(this.key);
  });
 }
 async shareReview(source:WorkshopSource|undefined,valid:()=>boolean):Promise<SharedInstallations>{const review=await this.load(valid);requireWorkshopSource(source,review.source!);return review;}
 async share(values:InstallationReport[],valid:()=>boolean,source?:WorkshopSource,review?:SharedInstallations):Promise<void>{if(this.read())throw new Error('An installation report is pending. Open Install sharing to recover it.');const original=review??await this.shareReview(source,valid);requireWorkshopSource(source,original.source!);const pending=await this.prepare(original,values,valid);await this.run(pending,valid);}
 async forget(value:PendingInstallationReport,valid:()=>boolean):Promise<void>{const expected=checkedInstallPending(value);await this.#locked(async()=>{this.#check(valid);const raw=this.#raw(),pending=this.read();if(!pending||JSON.stringify(pending)!==JSON.stringify(expected)||pending.confirmed)throw new Error('The installation report changed or is confirmed. Review it again.');this.#write(null,raw);});}
}
