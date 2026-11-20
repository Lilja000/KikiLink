import {checkedWorkshopSource,requireWorkshopSource,WorkshopGenerationError,type WorkshopSource} from './workshop-generation';
import type {KeyValueStorage} from '../../core/settings';
import {WorkshopDrafts,type LocalWorkshopDraft} from './workshop-drafts';
import {workshopDraftValue,workshopId} from '../../../cloud/shared/workshop-drafts.mjs';
import type {CloudWorkshopDraft,WorkshopDraftCloudAccess} from './workshop-cloud-drafts';

type WorkshopSyncLock=(key:string,action:()=>Promise<void>|void)=>Promise<unknown>;
export type WorkshopSyncReason='conflict'|'cloud-missing'|'local-missing'|'error'|null;
export interface WorkshopSyncLink {id:string;token:string;revision:number;fingerprint:string;reason:WorkshopSyncReason;source?:WorkshopSource;}
export interface WorkshopSyncPolicy {format:1;mode:'manual'|'automatic';epoch:number;links:WorkshopSyncLink[];}
const exact=(v:unknown,keys:string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const same=(a:unknown,b:unknown):boolean=>JSON.stringify(a)===JSON.stringify(b);
const policyError=()=>new Error('Sync settings could not be read or contain unsupported data. They have been kept unchanged.');
function checked(value:unknown):WorkshopSyncPolicy{
 if(!exact(value,['format','mode','epoch','links'])||value.format!==1||value.mode!=='manual'&&value.mode!=='automatic'||!Number.isSafeInteger(value.epoch)||Number(value.epoch)<0||!Array.isArray(value.links)||value.links.length>20)throw policyError();
 const ids=new Set<string>();for(const link of value.links){if(!exact(link,['id','token','revision','fingerprint','reason',...link&&typeof link==='object'&&'source'in link?['source']:[]])||!workshopId(link.id)||ids.has(link.id)||!workshopId(link.token)||!Number.isSafeInteger(link.revision)||Number(link.revision)<=0||typeof link.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(link.fingerprint)||![null,'conflict','cloud-missing','local-missing','error'].includes(link.reason as WorkshopSyncReason))throw policyError();if(link.source!==undefined)checkedWorkshopSource(link.source);ids.add(link.id);}
 return structuredClone(value) as unknown as WorkshopSyncPolicy;
}
export async function workshopDraftFingerprint(value:LocalWorkshopDraft):Promise<string>{
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(workshopDraftValue(value)));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
/** Consent and common-copy fingerprints only. Draft content remains in its existing stores. */
export class WorkshopSyncSettings {
 readonly key:string;
 constructor(readonly storage:KeyValueStorage,owner:number,origin:string,readonly current:()=>boolean,readonly lock?:WorkshopSyncLock){
  if(!Number.isSafeInteger(owner)||owner<=0||!origin)throw new Error('A Workshop account is required.');this.key=`kikilink:workshop-sync:${encodeURIComponent(origin)}:${owner}:v1`;
 }
 read():WorkshopSyncPolicy{
  if(!this.current())throw new Error('Your account changed. Reopen Workshop.');
  try{const result=this.storage.getItemResult?.(this.key);if(result&&!result.ok)throw policyError();const raw=result?result.value:this.storage.getItem(this.key);if(raw===null)return{format:1,mode:'manual',epoch:0,links:[]};if(raw.length>16384)throw policyError();return checked(JSON.parse(raw));}catch{throw policyError();}
 }
 async withLock(name:string,action:()=>Promise<void>|void):Promise<void>{
  if(this.lock){await this.lock(name,action);return;}
  if(globalThis.navigator?.locks){await navigator.locks.request(name,action);return;}
  throw new Error('This browser needs Web Locks to sync drafts safely.');
 }
 async change(action:(state:WorkshopSyncPolicy)=>void,valid:()=>boolean):Promise<void>{
  await this.withLock(this.key,()=>{if(!this.current()||!valid())throw new Error('Your sync settings view changed.');const state=this.read();action(state);const raw=JSON.stringify(checked(state));if(!this.current()||!valid())throw new Error('Your sync settings view changed.');
   try{this.storage.setItem(this.key,raw);const check=this.storage.getItemResult?.(this.key);if(check?!check.ok||check.value!==raw:this.storage.getItem(this.key)!==raw)throw new Error();}catch{throw new Error('The sync settings save could not be confirmed. Reopen Sync settings to check it.');}
  });
 }
 async mode(mode:WorkshopSyncPolicy['mode'],expected:WorkshopSyncPolicy,valid:()=>boolean):Promise<void>{
  await this.change(state=>{if(state.mode!==expected.mode||state.epoch!==expected.epoch||mode==='automatic'&&!same(state.links,expected.links)||state.epoch>=Number.MAX_SAFE_INTEGER)throw new Error('Sync settings changed in another tab. Reopen them.');state.mode=mode;state.epoch++;},valid);
 }
 async unlink(link:WorkshopSyncLink,valid:()=>boolean):Promise<void>{
  await this.change(state=>{if(!same(state.links.find(v=>v.id===link.id),link))throw new Error('This sync link changed. Reopen Sync settings.');state.links=state.links.filter(v=>v.id!==link.id);},valid);
 }
}

/** Three-way synchronization of explicitly linked copies. Never propagates deletion. */
export class WorkshopAutomaticSync {
 #generation=0;#timer:ReturnType<typeof setTimeout>|undefined;#running:Promise<void>|undefined;#suspended=false;
 message='';
 constructor(readonly settings:WorkshopSyncSettings,readonly drafts:WorkshopDrafts,readonly access:WorkshopDraftCloudAccess,readonly options:{current():boolean;editing(id:string):boolean;updated(localChanged?:boolean):void}){}
 cancel():void{this.#generation++;clearTimeout(this.#timer);this.#timer=undefined;}
 suspend():void{this.#suspended=true;this.cancel();}
 settingsChanged():void{this.#suspended=false;this.schedule();}
 schedule():void{clearTimeout(this.#timer);if(!this.options.current())return;this.#timer=setTimeout(()=>{this.#timer=undefined;void this.run();},2000);}
 async link(review:CloudWorkshopDraft,local:LocalWorkshopDraft,valid:()=>boolean):Promise<void>{
  const before=this.settings.read(),previous=before.links.find(v=>v.id===local.id),snapshot=workshopDraftValue(local);
  const unchanged=()=>valid()&&this.settings.current()&&workshopDraftValue(this.drafts.list().find(v=>v.id===local.id)??null)===snapshot;
  if(!unchanged()||!review.snapshot||review.revision<=0||review.id!==local.id||workshopDraftValue(review.snapshot)!==snapshot)throw new Error('Review matching local and Cloud copies before linking sync.');
  const fresh=await this.access.get(local.id,unchanged);if(workshopDraftValue(fresh)!==workshopDraftValue(review))throw new Error('The Cloud copy changed. Review both copies again.');
  const fingerprint=await workshopDraftFingerprint(local);
  await this.settings.change(state=>{if(state.epoch!==before.epoch||!same(state.links.find(v=>v.id===local.id),previous))throw new Error('Sync settings changed while linking. Review again.');state.links=state.links.filter(v=>v.id!==local.id);state.links.push({id:local.id,token:crypto.randomUUID(),revision:review.revision,fingerprint,reason:null,...review.source?{source:review.source}:{}});},unchanged);
  this.message='Draft linked. Transfers follow this device’s Sync settings.';this.options.updated();
 }
 run(manual=false):Promise<void>{
  if(this.#suspended&&!manual)return Promise.resolve();
  if(this.#running)return this.#running;
  const generation=this.#generation,current=()=>generation===this.#generation&&this.options.current();
  this.#running=this.settings.withLock(this.settings.key+':run',async()=>{
   if(!current())return;const policy=this.settings.read();if(!manual&&policy.mode!=='automatic')return;
   let uploaded=0,downloaded=0,waiting=0,localChanged=false;
   for(const link of policy.links){
    if(!current())return;if(link.reason){waiting++;continue;}
    const valid=()=>{if(!current())return false;const state=this.settings.read();return state.epoch===policy.epoch&&(manual||state.mode==='automatic')&&same(state.links.find(v=>v.id===link.id),link);};
    const update=async(next:WorkshopSyncLink)=>{await this.settings.change(state=>{const index=state.links.findIndex(v=>v.id===link.id);if(index<0||!same(state.links[index],link))throw new Error('Sync link changed.');state.links[index]=next;},valid);};
    try{
     if(!valid())continue;
     const local=this.drafts.list().find(v=>v.id===link.id);if(!local){await update({...link,reason:'local-missing'});waiting++;continue;}
     const localRaw=JSON.stringify(local),localHash=await workshopDraftFingerprint(local);if(!valid())continue;
     const cloud=await this.access.get(link.id,valid);if(!valid())continue;requireWorkshopSource(link.source,cloud.source??{required:false});
     if(!cloud.snapshot){await update({...link,reason:'cloud-missing'});waiting++;continue;}
     const cloudHash=await workshopDraftFingerprint(cloud.snapshot);if(!valid())continue;
     const localCurrent=()=>valid()&&JSON.stringify(this.drafts.list().find(v=>v.id===link.id))===localRaw;
     if(!localCurrent())continue;
     if(cloud.revision<link.revision){await update({...link,reason:'conflict'});waiting++;continue;}
     if(localHash===cloudHash){if(cloud.revision!==link.revision||localHash!==link.fingerprint)await update({...link,revision:cloud.revision,fingerprint:localHash});continue;}
     if(cloud.revision===link.revision&&cloudHash===link.fingerprint){
      await this.access.write(cloud,local,crypto.randomUUID(),()=>valid()&&this.drafts.list().some(v=>v.id===link.id));
      if(!valid())return;await update({...link,revision:cloud.revision+1,fingerprint:localHash});uploaded++;
     }else if(localHash===link.fingerprint&&cloud.revision>link.revision){
      // Never replace a checkpoint underneath an editor, even before its debounce commits.
      if(this.options.editing(link.id)){waiting++;continue;}
      const fresh=await this.access.get(link.id,localCurrent);if(workshopDraftValue(fresh)!==workshopDraftValue(cloud)){waiting++;continue;}
      await this.drafts.put(cloud.snapshot,link.id,localRaw,()=>localCurrent()&&!this.options.editing(link.id));
      localChanged=true;if(!valid())return;await update({...link,revision:cloud.revision,fingerprint:cloudHash});downloaded++;
     }else{await update({...link,reason:'conflict'});waiting++;}
    }catch(error){
     if(!current())return;
     // An uncertain result never retries a mutation automatically. Fresh manual review reconciles it.
     try{if(valid()&&!(error instanceof WorkshopGenerationError))await update({...link,reason:'error'});}catch{/* Preserve unreadable/unconfirmed state. */}
     this.message=(error instanceof Error?error.message:'Sync failed.')+' Automatic sync paused for this draft. Review both copies.';this.options.updated(localChanged);return;
    }
   }
   if(current()){this.message=`Sync checked: ${uploaded} sent, ${downloaded} restored${waiting?`, ${waiting} waiting for review or a closed editor`:''}.`;this.options.updated(localChanged);}
  }).catch(error=>{if(current()){this.message=error instanceof Error?error.message:'Sync settings unavailable.';this.options.updated();}}).finally(()=>{this.#running=undefined;});
  return this.#running;
 }
}
