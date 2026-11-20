import type {KeyValueStorage} from '../../core/settings';
import {checkedLocalWorkshopDraft,type LocalWorkshopDraft} from './workshop-drafts';
import {workshopId,workshopVersion,type WorkshopDraft} from './workshop-model';
import {checkedWorkshopSource,sameWorkshopSource,type WorkshopSource} from './workshop-generation';

export interface WorkshopSaveReceipt {packageId:string;revision?:number;deleted?:true;operationId?:string;action?:string;applied?:true;recoveryGeneration?:string;}
export interface WorkshopPendingSave {
 format:1|2;method:'PUT'|'POST';path:string;createdAt:number;source?:WorkshopSource;label?:string;
 body:{operationId:string;revision?:number;version?:string;draft?:WorkshopDraft};
 checkpoint:LocalWorkshopDraft|null;receipt:WorkshopSaveReceipt|null;
}
type Lock=(key:string,work:()=>Promise<unknown>)=>Promise<unknown>;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const positive=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
function route(path:string):{id?:string;action:string}{
 if(path==='/v1/workshop')return{action:'create'};
 const parts=path.split('/');if(parts.length!==5||parts[0]!==''||parts[1]!=='v1'||parts[2]!=='workshop'||!workshopId(parts[3])||!['draft','remix','publish','archive','discard'].includes(parts[4]!))throw new Error('Invalid saved Workshop route.');
 return{id:parts[3],action:parts[4]!};
}
export function checkedWorkshopReceipt(value:unknown,pending:WorkshopPendingSave):WorkshopSaveReceipt {
 const {id,action}=route(pending.path);
 if(!object(value)||!workshopId(value.packageId)||id&&action!=='remix'&&value.packageId!==id||action==='remix'&&value.packageId===id)throw new Error('Invalid Workshop receipt.');
 const bound=pending.format===2&&pending.source?.required,extra=bound?['operationId','action','applied','recoveryGeneration']:[];
 if(bound&&(value.operationId!==pending.body.operationId||value.action!==action||value.applied!==true||value.recoveryGeneration!==pending.source!.generation))throw new Error('Invalid Workshop receipt.');
 if(value.deleted===true){if(action!=='discard'||!exact(value,['packageId','deleted',...extra]))throw new Error('Invalid Workshop receipt.');}
 else if(!exact(value,['packageId','revision',...extra])||!positive(value.revision)||bound&&value.revision!==(pending.body.revision??0)+1)throw new Error('Invalid Workshop receipt.');
 return structuredClone(value) as unknown as WorkshopSaveReceipt;
}
export function checkedWorkshopPendingSave(value:unknown):WorkshopPendingSave {
 try{
  if(!object(value)||value.format!==1&&value.format!==2||!exact(value,['format','method','path','createdAt','body','checkpoint','receipt',...value.format===2?['source','label']:[]])||typeof value.path!=='string'||!positive(value.createdAt)||!object(value.body)||!workshopId(value.body.operationId))throw new Error();
  if(value.format===2){checkedWorkshopSource(value.source);if(typeof value.label!=='string'||!value.label.trim()||value.label.length>240)throw new Error();}
  const {id,action}=route(value.path),body=value.body,hasDraft=['create','remix','draft'].includes(action);
  if(value.method!==(action==='draft'?'PUT':'POST')||!exact(body,['operationId',...hasDraft?['draft']:[],...action==='remix'?['version']:[],...['draft','publish','archive','discard'].includes(action)?['revision']:[]]))throw new Error();
  if(action==='remix'&&!workshopVersion(body.version)||['draft','publish','archive','discard'].includes(action)&&!positive(body.revision))throw new Error();
  if(hasDraft)checkedLocalWorkshopDraft({id:body.operationId,context:{fixedType:false,packageId:null,revision:null,remix:null},draft:body.draft,variants:{},step:3});
  if(value.checkpoint!==null){
   const c=checkedLocalWorkshopDraft(value.checkpoint).context;
   if(!hasDraft||action==='draft'&&(c.packageId!==id||c.revision!==body.revision)||action==='remix'&&(c.remix?.id!==id||c.remix?.version!==body.version)||action==='create'&&(c.packageId!==null||c.remix!==null))throw new Error();
   if(value.format===2&&c.source&&!sameWorkshopSource(c.source,value.source as WorkshopSource))throw new Error();
  }
  if(value.receipt!==null)checkedWorkshopReceipt(value.receipt,value as unknown as WorkshopPendingSave);
  if(JSON.stringify(value).length>600000)throw new Error();
  return structuredClone(value) as unknown as WorkshopPendingSave;
 }catch{throw new Error('The pending Workshop save contains unsupported data. It has been kept unchanged.');}
}
export function workshopSaveLabel(pending:WorkshopPendingSave):string {
 return({create:'Create private draft',draft:'Save private draft',remix:'Create private remix',publish:'Publish version',archive:'Archive creation',discard:'Discard saved draft'} as Record<string,string>)[route(pending.path).action]!;
}
const retiredRequest=(value:unknown):value is {body:{operationId:string}}=>object(value)&&object(value.body)&&workshopId(value.body.operationId)&&object(value.body.draft)&&['Scene pack','Automation preset'].includes(String(value.body.draft.type));
const sameRequest=(a:WorkshopPendingSave,b:WorkshopPendingSave)=>JSON.stringify({...a,receipt:null})===JSON.stringify({...b,receipt:null});
const knownReceipts=new WeakMap<object,Map<string,{raw:string;pending:WorkshopPendingSave}>>();

/** One frozen request per account/origin. Nothing is sent by reading this store. */
export class WorkshopOutbox {
 readonly key:string;
 constructor(readonly storage:KeyValueStorage,owner:number,origin:string,readonly current:()=>boolean,readonly lock?:Lock,readonly lifetime:object=storage){
  if(!positive(owner)||!origin)throw new Error('A Workshop account is required.');
  this.key=`kikilink:workshop-outbox:${encodeURIComponent(origin)}:${owner}:v1`;
 }
 #guard(valid:()=>boolean):void{if(!this.current()||!valid())throw new Error('Your account or Workshop view changed. The pending request is kept.');}
 #raw():string|null {
  this.#guard(()=>true);let raw:string|null;
  try{const result=this.storage.getItemResult?.(this.key);if(result&&!result.ok)throw new Error();raw=result?result.value:this.storage.getItem(this.key);}catch{throw new Error('The pending Workshop save could not be read. Nothing has been replaced.');}
  return raw;
 }
 read():WorkshopPendingSave|null {
  const raw=this.#raw();if(raw===null||raw==='null')return null;
  try{if(raw.length>600000)throw new Error();const parsed:unknown=JSON.parse(raw);if(retiredRequest(parsed))return null;const value=checkedWorkshopPendingSave(parsed),known=knownReceipts.get(this.lifetime)?.get(this.key);return known?.raw===raw&&sameRequest(known.pending,value)?structuredClone(known.pending):value;}catch{throw new Error('The pending Workshop save contains unsupported data. It has been kept unchanged.');}
 }
 #unchanged(raw:string|null):void{if(this.#raw()!==raw)throw new Error('The pending Workshop save changed in another tab. Reopen Workshop.');}
 #write(value:WorkshopPendingSave|null,valid:()=>boolean,expected:string|null):void {
  this.#guard(valid);this.#unchanged(expected);const raw=JSON.stringify(value);
  try{
   // Preserve a retired request only when replacing it with a supported save.
   // Reading it never retries the request or changes device storage.
   if(expected){const previous:unknown=JSON.parse(expected);if(retiredRequest(previous)){const key=this.key+':retired:'+previous.body.operationId;this.storage.setItem(key,expected);const saved=this.storage.getItemResult?.(key);if(saved?!saved.ok||saved.value!==expected:this.storage.getItem(key)!==expected)throw new Error();this.#guard(valid);this.#unchanged(expected);}}
   this.storage.setItem(this.key,raw);const result=this.storage.getItemResult?.(this.key);if(result?!result.ok||result.value!==raw:this.storage.getItem(this.key)!==raw)throw new Error();}catch{throw new Error('The pending Workshop save could not be confirmed on this device. Reopen Workshop before starting another save.');}
 }
 async #locked(work:()=>Promise<unknown>):Promise<void>{
  if(this.lock)await this.lock(this.key,work);
  else if(globalThis.navigator?.locks)await navigator.locks.request(this.key,work);
  else throw new Error('This browser needs Web Locks to save Workshop requests safely.');
 }
 async prepare(value:WorkshopPendingSave,valid:()=>boolean):Promise<void>{
  const next=checkedWorkshopPendingSave(value);if(next.receipt!==null)throw new Error('A new request cannot include a receipt.');
  await this.#locked(async()=>{this.#guard(valid);const raw=this.#raw(),old=this.read();if(old){if(!sameRequest(old,next))throw new Error('Another Workshop save is pending. Finish it before starting another.');return;}this.#write(next,valid,raw);});
 }
 async run(value:WorkshopPendingSave,valid:()=>boolean,send:(pending:WorkshopPendingSave,unchanged:()=>void)=>Promise<unknown>,finish:(pending:WorkshopPendingSave,unchanged:()=>void)=>Promise<string>):Promise<{receipt:WorkshopSaveReceipt;warning:string}>{
  const expected=checkedWorkshopPendingSave(value);let result:{receipt:WorkshopSaveReceipt;warning:string}|undefined;
  // Hold one account/origin Web Lock through send and acknowledgement. A second
  // tab must reread after this request, never send an already-cleared snapshot.
  await this.#locked(async()=>{
   this.#guard(valid);let raw=this.#raw(),pending=this.read();if(!pending||!sameRequest(pending,expected))throw new Error('The pending Workshop save changed in another tab. Reopen Workshop.');
   if(!pending.receipt){
    const receipt=checkedWorkshopReceipt(await send(structuredClone(pending),()=>{this.#guard(valid);this.#unchanged(raw);}),pending);
    this.#guard(()=>true);this.#unchanged(raw);pending={...pending,receipt};
    let known=knownReceipts.get(this.lifetime);if(!known)knownReceipts.set(this.lifetime,known=new Map());known.set(this.key,{raw:raw!,pending:structuredClone(pending)});
    // A verified late ACK belongs to this request even when its view has closed.
    this.#write(pending,()=>true,raw);raw=this.#raw();
   }
   this.#guard(valid);this.#unchanged(raw);const warning=await finish(structuredClone(pending),()=>{this.#guard(valid);this.#unchanged(raw);});this.#guard(valid);this.#write(null,valid,raw);knownReceipts.get(this.lifetime)?.delete(this.key);
   result={receipt:pending.receipt!,warning};
  });
  return result!;
 }
 async forget(value:WorkshopPendingSave,valid:()=>boolean):Promise<void>{
  const expected=checkedWorkshopPendingSave(value);
  await this.#locked(async()=>{this.#guard(valid);const raw=this.#raw(),pending=this.read();if(!pending||!sameRequest(pending,expected))throw new Error('The pending Workshop save changed in another tab. Reopen Workshop.');if(pending.receipt)throw new Error('Cloud already confirmed this request. Retry recovery to finish the local cleanup.');this.#write(null,valid,raw);});
 }
}
