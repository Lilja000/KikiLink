import type {KeyValueStorage} from '../../core/settings';
import type {WorkshopLock} from './workshop-installation-model';
import {checkedLocalWorkshopDraft,workshopId,type LocalWorkshopDraft} from '../../../cloud/shared/workshop-drafts.mjs';
export {checkedLocalWorkshopDraft};
export type {LocalWorkshopDraft,WorkshopDraftState} from '../../../cloud/shared/workshop-drafts.mjs';
export class WorkshopDrafts {
 readonly key:string;
 #retired:unknown[]=[];
 constructor(readonly storage:KeyValueStorage,owner:number,origin:string,readonly current:()=>boolean,readonly lock?:WorkshopLock){if(!Number.isSafeInteger(owner)||owner<=0||!origin)throw new Error('A Workshop account is required.');this.key=`kikilink:workshop-drafts:${encodeURIComponent(origin)}:${owner}:v1`;}
 list():LocalWorkshopDraft[]{
  this.#retired=[];if(!this.current())throw new Error('Your account changed. Reopen Workshop.');let raw:string|null;
  try{const r=this.storage.getItemResult?.(this.key);if(r&&!r.ok)throw new Error();raw=r?r.value:this.storage.getItem(this.key);}catch{throw new Error('Local drafts could not be read. They have been kept unchanged.');}
  if(raw===null)return[];
  try{if(raw.length>2e6)throw new Error();const values:unknown=JSON.parse(raw);if(!Array.isArray(values)||values.length>40)throw new Error();const active=values.filter((v:unknown)=>{if(v&&typeof v==='object'&&!Array.isArray(v)&&'draft' in v&&v.draft&&typeof v.draft==='object'&&'type' in v.draft&&['Scene pack','Automation preset'].includes(String(v.draft.type))){this.#retired.push(v);return false;}return true;});if(active.length>20||this.#retired.length>20)throw new Error();const checked=active.map(checkedLocalWorkshopDraft);if(new Set(checked.map(v=>v.id)).size!==checked.length)throw new Error();return checked;}catch{throw new Error('Local drafts contain unsupported data. They have been kept unchanged.');}
 }
 async put(value:LocalWorkshopDraft|null,id:string,expected:string|null,valid:()=>boolean=()=>true):Promise<void>{
  const next=value===null?null:checkedLocalWorkshopDraft(value);if(!workshopId(id)||next&&next.id!==id)throw new Error('Invalid draft ID.');
  const commit=()=>{if(!valid())throw new Error('Your Workshop view changed.');const items=this.list(),old=items.find(v=>v.id===id);if((old?JSON.stringify(old):null)!==expected)throw new Error('Another tab changed this local draft. Reopen Local drafts.');const result=items.filter(v=>v.id!==id);if(next)result.unshift(next);if(result.length>20)throw new Error('You can keep up to 20 local drafts.');const raw=JSON.stringify([...result,...this.#retired]);if(raw.length>2e6)throw new Error('Local draft storage is full.');if(!this.current()||!valid())throw new Error('Your account or Workshop view changed.');
   try{this.storage.setItem(this.key,raw);const r=this.storage.getItemResult?.(this.key);if(r?!r.ok||r.value!==raw:this.storage.getItem(this.key)!==raw)throw new Error();}catch{throw new Error('The local save could not be confirmed. Your editor is still open.');}
  };
  if(this.lock)await this.lock(this.key,commit);else if(globalThis.navigator?.locks)await navigator.locks.request(this.key,commit);else throw new Error('This browser needs Web Locks to save drafts safely.');
 }
}
