import type {KeyValueStorage} from '../core/settings';
import type {CloudClient} from './client';
import {ModerationGeneration,ModerationGenerationError,type ModerationAccess} from './moderation-generation';

export type RestrictionType='community'|'creation'|'review'|'space';
export interface RestrictionReview {type:RestrictionType;targetId:string;revision:number;restrictedAt:number;title:string;}
export interface AppealReview {id:number;type:RestrictionType;targetId:string;revision:number;status:'open'|'upheld'|'restored';createdAt:number;updatedAt:number;message:string;response:string|null;currentRestriction:boolean;restriction?:RestrictionReview|null;}
interface PendingIntent {path:string;createdAt:number;body:{operationId:string;revision:number;message:string;restrictedAt?:number;action?:'uphold'|'restore'};confirmed:boolean;}
export type ModerationPending=PendingIntent&({format:1}|{format:2;recoveryGeneration:string});
export type ModerationLock=(key:string,run:()=>Promise<void>)=>Promise<unknown>;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const positive=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<Number.MAX_SAFE_INTEGER;
const date=(v:unknown):v is number=>positive(v)&&v<=8640000000000000;
const exact=(v:unknown,keys:string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys.sort().join(',');
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(v);
const target=(type:unknown,id:unknown)=>['community','creation','review','space'].includes(String(type))&&(type==='review'?typeof id==='string'&&String(Number(id))===id&&positive(Number(id)):uuid(id));
export function checkedRestriction(v:unknown):RestrictionReview {
 if(!exact(v,['type','targetId','revision','restrictedAt','title'])||!target(v.type,v.targetId)||!positive(v.revision)||!date(v.restrictedAt)||!text(v.title,200))throw new Error('The restriction review is invalid. Refresh before continuing.');
 return structuredClone(v) as unknown as RestrictionReview;
}
export function checkedAppeal(v:unknown,moderator:boolean):AppealReview {
 if(!exact(v,['id','type','targetId','revision','status','createdAt','updatedAt','message','response','currentRestriction',...moderator?['restriction']:[]])||!positive(v.id)||!target(v.type,v.targetId)||!positive(v.revision)||!['open','upheld','restored'].includes(String(v.status))||!date(v.createdAt)||!date(v.updatedAt)||!text(v.message,1000)||v.response!==null&&!text(v.response,1000)||typeof v.currentRestriction!=='boolean')throw new Error('The appeal review is invalid. Refresh before continuing.');
 if(moderator){if(v.restriction!==null){const r=checkedRestriction(v.restriction);if(!v.currentRestriction||r.type!==v.type||r.targetId!==v.targetId)throw new Error('The restriction no longer matches this appeal.');}else if(v.currentRestriction)throw new Error('The restriction review is missing.');}
 return structuredClone(v) as unknown as AppealReview;
}
export function checkedModerationPending(v:unknown):ModerationPending {
 const error=()=>{throw new Error('The pending moderation request contains unsupported data. It has been kept unchanged.');};
 const bound=!!v&&typeof v==='object'&&'format'in v&&v.format===2;
 if(!exact(v,['format','path','createdAt','body','confirmed',...bound?['recoveryGeneration']:[]])||(!bound&&v.format!==1)||bound&&(typeof v.recoveryGeneration!=='string'||!/^[a-f0-9]{32}$/u.test(v.recoveryGeneration))||!date(v.createdAt)||typeof v.confirmed!=='boolean'||typeof v.path!=='string')return error();
 const restriction=/^\/v1\/(me|moderation)\/restrictions\/(community|creation|review|space)\/([^/]+)\/(appeal|restore)$/.exec(v.path),decision=/^\/v1\/moderation\/appeals\/([1-9]\d*)\/decision$/.exec(v.path);
 if(restriction){if(!target(restriction[2],restriction[3])||(restriction[1]==='me')!==(restriction[4]==='appeal')||!exact(v.body,['operationId','revision','restrictedAt','message'])||!date(v.body.restrictedAt))return error();}
 else if(decision){if(!positive(Number(decision[1]))||!exact(v.body,['operationId','revision','action','message'])||!['uphold','restore'].includes(String(v.body.action)))return error();}
 else return error();
 const b=v.body as Record<string,unknown>;if(!uuid(b.operationId)||!positive(b.revision)||!text(b.message,1000)||!(b.message as string).trim()||JSON.stringify(v).length>8192)return error();
 return structuredClone(v) as unknown as ModerationPending;
}
const equal=(a:ModerationPending,b:ModerationPending)=>JSON.stringify({...a,confirmed:false})===JSON.stringify({...b,confirmed:false});
/** One durable intent per account. Opening, refreshing and reconnecting only read it. */
export class ModerationRecovery {
 readonly owner:number;readonly origin:string;readonly key:string;readonly generation:ModerationGeneration;#restored=false;#spaceReports=false;
 get spaceReports():boolean{return this.#spaceReports;}
 constructor(readonly client:CloudClient,readonly storage:KeyValueStorage,readonly current:()=>boolean,readonly lock?:ModerationLock){this.generation=new ModerationGeneration(client,'restorationRecoveryGeneration');this.owner=client.memberNumber;this.origin=client.origin;if(!positive(this.owner)||!this.origin)throw new Error('A Cloud account is required.');this.key=`kikilink:moderation-recovery:${encodeURIComponent(this.origin)}:${this.owner}:v1`;}
 #guard(valid:()=>boolean):void{if(!this.current()||!valid()||this.client.memberNumber!==this.owner||this.client.origin!==this.origin)throw new Error('Your account or moderation view changed. The saved request is kept.');}
 async gate(valid:()=>boolean,moderator:boolean):Promise<ModerationAccess>{
  this.#spaceReports=false;this.#guard(valid);if(!this.client.connected)throw new Error('Reconnect to review moderation.');
  const me=await this.client.request<{memberNumber:number;moderator:boolean;features?:{moderationAppeals?:boolean;spaceReports?:boolean};directRecovery?:{restored?:boolean}}>('GET','/v1/me');
  this.#guard(valid);if(me.memberNumber!==this.owner||me.features?.moderationAppeals!==true||moderator&&!me.moderator)throw new Error('This moderation view is not available to this account.');
  this.#spaceReports=me.features?.spaceReports===true;this.generation.accept(me);this.#restored=me.directRecovery?.restored===true;return this.generation.capture();
 }
 async review<T>(access:ModerationAccess,path:string):Promise<T>{return this.#unwrap(await access.request<T>('GET',path),access);}
 #unwrap<T>(value:T,access:ModerationAccess):T{if(!access.generation)return value;const {recoveryGeneration:_,...result}=value as Record<string,unknown>;return result as T;}

 read():ModerationPending|null{this.#guard(()=>true);let raw:string|null;try{const r=this.storage.getItemResult?.(this.key);if(r&&!r.ok)throw new Error();raw=r?r.value:this.storage.getItem(this.key);}catch{throw new Error('The saved moderation request could not be read. Nothing has been replaced.');}if(raw===null||raw==='null')return null;if(raw.length>8192)throw new Error('The saved moderation request is too large. It has been kept.');return checkedModerationPending(JSON.parse(raw));}
 #write(v:ModerationPending|null,valid:()=>boolean):void{this.#guard(valid);const raw=JSON.stringify(v);try{this.storage.setItem(this.key,raw);const r=this.storage.getItemResult?.(this.key);if(r?!r.ok||r.value!==raw:this.storage.getItem(this.key)!==raw)throw new Error();}catch{throw new Error('The saved request could not be confirmed on this device. Reopen Restrictions & appeals to check it.');}}
 async #locked(run:()=>Promise<void>):Promise<void>{if(this.lock)await this.lock(this.key,run);else if(globalThis.navigator?.locks)await navigator.locks.request(this.key,run);else throw new Error('This browser needs Web Locks to save moderation requests safely.');}
 async prepare(v:ModerationPending,valid:()=>boolean):Promise<void>{const next=checkedModerationPending(v);if(next.confirmed)throw new Error('A new request cannot already be confirmed.');await this.#locked(async()=>{this.#guard(valid);const old=this.read();if(old){if(!equal(old,next))throw new Error('Another moderation request is pending. Recover it first.');return;}this.#write(next,valid);});}
 async run(v:ModerationPending,valid:()=>boolean):Promise<void>{const expected=checkedModerationPending(v);await this.#locked(async()=>{this.#guard(valid);const pending=this.read();if(!pending||!equal(pending,expected))throw new Error('The saved request changed in another tab. Reopen this view.');if(!pending.confirmed){const access=await this.gate(valid,pending.path.startsWith('/v1/moderation/'));
   if(/\/restrictions\/space\//.test(pending.path)&&!this.#spaceReports)throw new Error('Space restriction actions are not available on this Cloud. The saved request is kept.');
   if(pending.format===2&&access.generation!==pending.recoveryGeneration)throw new ModerationGenerationError();
   if(pending.format===1&&this.#restored)throw new Error('This saved request predates recovery protection. It has been kept unchanged and cannot be sent to a restored database. Check the current history before explicitly forgetting it.');
   // Legacy bytes are never upgraded or rebound. Bound receipts must echo the captured generation.
   const receipt=pending.format===2?this.#unwrap(await access.request<unknown>('POST',pending.path,pending.body),access):await this.client.request<unknown>('POST',pending.path,pending.body);this.#guard(valid);
   const appeal=pending.path.endsWith('/appeal'),decision=pending.path.endsWith('/decision');
   if(!exact(receipt,['operationId','revision',...appeal||decision?['id']:[]])||receipt.operationId!==pending.body.operationId||receipt.revision!==(appeal?1:pending.body.revision+1)||appeal&&!positive(receipt.id)||decision&&receipt.id!==Number(pending.path.split('/')[4]))throw new Error('The result was not confirmed. Retry the saved request to check it.');
   this.#write({...pending,confirmed:true},valid);
  }this.#write(null,valid);});}
 async forget(v:ModerationPending,valid:()=>boolean):Promise<void>{const expected=checkedModerationPending(v);await this.#locked(async()=>{this.#guard(valid);const pending=this.read();if(!pending||!equal(pending,expected)||pending.confirmed)throw new Error('The saved request changed or is already confirmed. Reopen this view.');this.#write(null,valid);});}
}
