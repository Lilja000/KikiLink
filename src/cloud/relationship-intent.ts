import {CloudError,type CloudClient} from './client';
import type {BCAdapter} from '../bc/adapter';
import type {KeyValueStorage} from '../core/settings';
import type {Relationship} from './community';

export interface RelationshipSource {required:boolean;generation?:string;}
export type RelationshipAction='request'|'accept'|'decline'|'cancel'|'sync'|'remove';
export interface RelationshipReceipt {applied:true;action:RelationshipAction;memberNumber:number;revision:number;state:Relationship['state'];operationId:string;recoveryGeneration:string;}
export interface RelationshipIntent {memberNumber:number;action:RelationshipAction;revision:number;state:Relationship['state'];source:RelationshipSource;operationId:string;syncOperationId:string;receipt?:RelationshipReceipt;syncReceipt?:RelationshipReceipt;nativeDone:boolean;syncSubmitted:boolean;}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=0;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu.test(v);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const states=['none','sent','received','accepted','declined','cancelled','revoked'];
const actions=['request','accept','decline','cancel','sync','remove'];
export class RelationshipRecoveryError extends Error {constructor(message='This friend action needs review. Its original request has been kept.'){super(message);}}
export function relationshipSource(metadata:unknown):RelationshipSource {
 if(!object(metadata))throw new RelationshipRecoveryError();
 const flag=object(metadata.features)?metadata.features.relationshipRecoveryGeneration:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||typeof r.generation!=='string'||!/^[a-f0-9]{32}$/u.test(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new RelationshipRecoveryError();
 return {required:flag===true,...object(r)?{generation:r.generation as string}:{}};
}
export function checkedRelationship(value:unknown,source:RelationshipSource,member?:number):Relationship {
 if(!object(value)||!integer(value.memberNumber)||value.memberNumber<1||member!==undefined&&value.memberNumber!==member||!integer(value.revision)||!states.includes(String(value.state))||['supported','directMessages','canMessage','nativeSyncRequired'].some(k=>typeof value[k]!=='boolean')||source.required&&value.recoveryGeneration!==source.generation)throw new RelationshipRecoveryError();
 return {...value,friendSource:Object.freeze({...source})} as unknown as Relationship;
}
function receipt(value:unknown,e:RelationshipIntent,sync=false):RelationshipReceipt {
 const action=sync?'sync':e.action,operation=sync?e.syncOperationId:e.operationId;
 if(!object(value)||Object.keys(value).sort().join(',')!=='action,applied,memberNumber,operationId,recoveryGeneration,revision,state'||value.applied!==true||value.action!==action||value.memberNumber!==e.memberNumber||value.operationId!==operation||value.recoveryGeneration!==e.source.generation||!integer(value.revision)||!states.includes(String(value.state)))throw new RelationshipRecoveryError();
 const minimum=sync?e.receipt?.revision??e.revision:e.revision;
 if(value.revision<minimum||value.revision>minimum+1||['accept','decline','cancel','remove'].includes(action)&&value.state!==({accept:'accepted',decline:'declined',cancel:'cancelled',remove:'revoked'} as Record<string,string>)[action]||action==='request'&&!['sent','received','accepted'].includes(String(value.state))||action==='sync'&&!['none','sent','received','accepted'].includes(String(value.state)))throw new RelationshipRecoveryError();
 return clone(value) as unknown as RelationshipReceipt;
}
function checkedIntent(v:unknown):RelationshipIntent {
 if(!object(v)||Object.keys(v).some(k=>!['memberNumber','action','revision','state','source','operationId','syncOperationId','receipt','syncReceipt','nativeDone','syncSubmitted'].includes(k))||!integer(v.memberNumber)||v.memberNumber<1||!integer(v.revision)||!states.includes(String(v.state))||!actions.includes(String(v.action))||!uuid(v.operationId)||!uuid(v.syncOperationId)||typeof v.nativeDone!=='boolean'||typeof v.syncSubmitted!=='boolean'||!object(v.source)||v.source.required!==true||typeof v.source.generation!=='string'||!/^[a-f0-9]{32}$/u.test(v.source.generation)||Object.keys(v.source).sort().join(',')!=='generation,required')throw new RelationshipRecoveryError();
 const e=v as unknown as RelationshipIntent;
 if(e.receipt!==undefined)receipt(e.receipt,e);
 if(e.syncReceipt!==undefined)receipt(e.syncReceipt,e,true);
 if(e.syncSubmitted&&!e.nativeDone||e.syncReceipt&&!e.syncSubmitted||e.action==='sync'&&e.receipt||['decline','cancel','remove'].includes(e.action)&&(e.syncSubmitted||e.syncReceipt)||['request','accept'].includes(e.action)&&e.nativeDone&&!e.receipt)throw new RelationshipRecoveryError();
 return clone(e);
}

/** Device/account/origin originals; receipt persistence precedes native side effects.
 * Server and BC are separate systems: no distributed atomicity is claimed. */
export class RelationshipActions {
 readonly owner:number;readonly origin:string;readonly key:string;
 #raw:string|null=null;#entries:RelationshipIntent[]=[];#error='';#held=new Set<number>();#busy=new Set<number>();#closed=false;#observed:RelationshipSource|undefined;
 constructor(readonly client:CloudClient,readonly adapter:BCAdapter,readonly storage:KeyValueStorage,readonly changed:()=>void,readonly native:(peer:number,friend:boolean)=>void){
  this.owner=client.memberNumber;this.origin=client.origin??'';this.key=`kikilink:friend-actions:v1:${this.owner}:${encodeURIComponent(this.origin)}`;
  try{this.#raw=storage.getItem(this.key);if(this.#raw!==null){if(this.#raw.length>100000)throw new Error();const v:unknown=JSON.parse(this.#raw);if(!object(v)||Object.keys(v).sort().join(',')!=='entries,format,origin,owner'||v.format!==1||v.owner!==this.owner||v.origin!==this.origin||!Array.isArray(v.entries)||v.entries.length>64)throw new Error();this.#entries=v.entries.map(checkedIntent);if(new Set(this.#entries.map(e=>e.memberNumber)).size!==this.#entries.length)throw new Error();}}
  catch{this.#error='Saved friend requests could not be read. Their original bytes have been kept.';}
 }
 get error():string{return this.#error;}
 identity():boolean{return !this.#closed&&this.owner>0&&this.client.memberNumber===this.owner&&(this.client.origin??'')===this.origin&&(this.adapter.getOwnMemberNumber?.()??this.owner)===this.owner;}
 close():void{this.#closed=true;}
 entries():RelationshipIntent[]{return this.identity()?clone(this.#entries):[];}
 get(peer:number):RelationshipIntent|undefined{return this.entries().find(e=>e.memberNumber===peer);}
 busy(peer:number):boolean{return this.#busy.has(peer);}
 held(peer:number):boolean{return !!this.#error||this.#held.has(peer);}
 observe(source:RelationshipSource):void{this.#observed=clone(source);for(const e of this.#entries)if(!same(e.source,source))this.#held.add(e.memberNumber);}
 hold():void{for(const e of this.#entries)this.#held.add(e.memberNumber);}
 #check():void{if(!this.identity()||this.#error)throw new RelationshipRecoveryError(this.#error||undefined);if(this.storage.getItem(this.key)!==this.#raw){this.#error='Saved friend requests changed in another tab. Reload before continuing.';throw new RelationshipRecoveryError(this.#error);}}
 #write(entries:RelationshipIntent[]):void{
  this.#check();entries.forEach(checkedIntent);const raw=JSON.stringify({format:1,owner:this.owner,origin:this.origin,entries});if(entries.length>64||raw.length>100000)throw new RelationshipRecoveryError('Resolve a saved friend request before starting another.');
  try{this.storage.setItem(this.key,raw);if(this.storage.getItem(this.key)!==raw)throw new Error();this.#raw=raw;this.#entries=clone(entries);}
  catch{this.#error='Saving the original friend request could not be confirmed. Keep this page open.';throw new RelationshipRecoveryError(this.#error);}
  finally{this.changed();}
 }
 #save(e:RelationshipIntent):void{this.#write([...this.#entries.filter(v=>v.memberNumber!==e.memberNumber),e]);}
 capture(action:RelationshipAction,row:Pick<Relationship,'memberNumber'|'revision'|'state'|'friendSource'>):RelationshipIntent {
  this.#check();const old=this.get(row.memberNumber);
  if(old){if(old.action!==action||!same(old.source,row.friendSource))throw new RelationshipRecoveryError();return old;}
  if(!row.friendSource?.required||row.memberNumber===this.owner)throw new RelationshipRecoveryError();
  const e:RelationshipIntent={memberNumber:row.memberNumber,revision:row.revision,state:row.state,source:clone(row.friendSource),action,operationId:crypto.randomUUID(),syncOperationId:crypto.randomUUID(),nativeDone:false,syncSubmitted:false};this.#save(e);if(this.#observed&&!same(e.source,this.#observed))this.#held.add(e.memberNumber);return clone(e);
 }
 discard(peer:number):void{this.#check();if(this.busy(peer))return;this.#write(this.#entries.filter(e=>e.memberNumber!==peer));this.#held.delete(peer);this.changed();}
 async #preflight(e:RelationshipIntent,current:()=>boolean):Promise<void>{
  this.#check();if(!current()||this.held(e.memberNumber)||!this.client.connected||!this.origin)throw new RelationshipRecoveryError();
  const me=await this.client.request<unknown>('GET','/v1/me');this.#check();
  if(!current())throw new Error('The original friend request is kept after leaving this view.');
  if(!object(me)||me.memberNumber!==this.owner||!same(relationshipSource(me),e.source))throw new RelationshipRecoveryError();
 }
 async #read(e:RelationshipIntent,current:()=>boolean):Promise<Relationship>{
  const value=await this.client.request<unknown>('GET',`/v1/relationships/${e.memberNumber}?recoveryGeneration=${e.source.generation}`);this.#check();if(!current()||this.held(e.memberNumber))throw new Error('The original friend request is kept after leaving this view.');return checkedRelationship(value,e.source,e.memberNumber);
 }
 async send(peer:number,current:()=>boolean):Promise<Relationship|undefined>{
  if(this.busy(peer)||!current())return;this.#check();let e=this.get(peer);if(!e)throw new RelationshipRecoveryError();this.#busy.add(peer);this.changed();
  const run=async()=>{
   e=this.get(peer)!;await this.#preflight(e,current);
   if(e.action!=='sync'&&!e.receipt){
    const value=await this.client.request<unknown>(e.action==='remove'?'DELETE':'POST',`/v1/relationships/${peer}${e.action==='remove'?'':'/'+e.action}`,{revision:e.revision,operationId:e.operationId,recoveryGeneration:e.source.generation});this.#check();e.receipt=receipt(value,e);this.#save(e);
   }
   if(!current())return;
   const sync=['request','accept','sync'].includes(e.action),desired=e.action!=='remove';
   if(sync||e.action==='remove'){
    if(!e.nativeDone){
     const fresh=await this.#read(e,current),expected=e.receipt??{revision:e.revision,state:e.state};
     if(fresh.revision!==expected.revision||fresh.state!==expected.state)throw new RelationshipRecoveryError();
     await this.#preflight(e,current);if(this.adapter.isKnownFriend?.(peer)!==desired)this.native(peer,desired);
     this.#check();if(!current())return;if(this.adapter.isKnownFriend&&this.adapter.isKnownFriend(peer)!==desired)throw new Error('BC friend sync did not finish. Retry the saved action.');
     e.nativeDone=true;this.#save(e);
    }else if(this.adapter.isKnownFriend&&this.adapter.isKnownFriend(peer)!==desired)throw new RelationshipRecoveryError('The BC friend list changed after this request. Review the saved action.');
    if(sync&&!e.syncReceipt){
     await this.#preflight(e,current);if(!e.syncSubmitted){e.syncSubmitted=true;this.#save(e);}
     const value=await this.client.request<unknown>('POST','/v1/relationships/confirm',{members:[peer],revision:e.receipt?.revision??e.revision,operationId:e.syncOperationId,recoveryGeneration:e.source.generation});this.#check();e.syncReceipt=receipt(value,e,true);this.#save(e);
    }
   }
   if(!current())return;
   const value=await this.#read(e,current);this.#write(this.#entries.filter(v=>v.memberNumber!==peer));this.#held.delete(peer);return value;
  };
  try{const locks=typeof navigator!=='undefined'?navigator.locks:undefined;return locks?await locks.request(`kikilink-friend-actions:${this.owner}:${this.origin}`,run):await run();}
  catch(error){if(error instanceof RelationshipRecoveryError||error instanceof CloudError&&error.status>=400&&error.status<500&&![408,429].includes(error.status))this.#held.add(peer);throw error;}
  finally{this.#busy.delete(peer);this.changed();}
 }
}
