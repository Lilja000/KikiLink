import {remainingDraftAfterSend} from '../utils/sent-draft';
import {CloudError,type CloudClient} from './client';
import {AccountKeyValueStorage} from '../storage/account-data-storage';
import type {KeyValueStorage} from '../core/settings';
import {element} from './dom';
import type {SocialUI} from './social-ui';
export interface FeedContentSource {required:boolean;generation?:string;}
export interface FeedContentTarget {action:'create'|'edit'|'delete';type:'post'|'comment';targetId:number|null;postId:number|null;preview?:string;}
export interface FeedContentReceipt {applied:true;action:FeedContentTarget['action'];targetType:FeedContentTarget['type'];targetId:number;postId:number;revision:number;operationId:string;recoveryGeneration?:string;}
export interface FeedContentEntry extends FeedContentTarget {key:string;source:FeedContentSource;data:Record<string,unknown>;pending?:{operationId:string;payload:Record<string,unknown>;prepared:boolean;receipt?:FeedContentReceipt};}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const positive=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu.test(v);
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
interface FeedContentSurface {
  root: HTMLElement;
  ui: SocialUI;
  current(): boolean;
  refresh(): Promise<void>;
  discarded(e: FeedContentEntry, confirmed: boolean): Promise<void>;
}
export class FeedContentError extends Error {constructor(message='This saved Feed draft needs review. Its original text and request have been kept.'){super(message);}}
export function checkedFeedContentSource(v:unknown):FeedContentSource {
 if(!object(v)||typeof v.required!=='boolean'||Object.keys(v).some(k=>!['required','generation'].includes(k))||v.generation!==undefined&&(typeof v.generation!=='string'||!/^[a-f0-9]{32}$/u.test(v.generation))||v.required&&!v.generation)throw new FeedContentError();
 return clone(v) as unknown as FeedContentSource;
}
export function feedContentSource(metadata:unknown):FeedContentSource {
 if(!object(metadata))throw new FeedContentError();
 const flag=object(metadata.features)?metadata.features.feedContentRecoveryGeneration:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||typeof r.generation!=='string'||!/^[a-f0-9]{32}$/u.test(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new FeedContentError();
 return {required:flag===true,...object(r)?{generation:r.generation as string}:{}};
}
function checkedReceipt(v:unknown,e:FeedContentEntry):FeedContentReceipt {
 const p=e.pending;
 if(!p||!object(v)||v.applied!==true||v.action!==e.action||v.targetType!==e.type||!positive(v.targetId)||!positive(v.postId)||!positive(v.revision)||v.operationId!==p.operationId||e.source.required&&v.recoveryGeneration!==e.source.generation||!e.source.required&&v.recoveryGeneration!==undefined||Object.keys(v).sort().join(',')!==(e.source.required?'action,applied,operationId,postId,recoveryGeneration,revision,targetId,targetType':'action,applied,operationId,postId,revision,targetId,targetType'))throw new FeedContentError();
 if(e.action!=='create'&&v.targetId!==e.targetId||e.postId!==null&&v.postId!==e.postId||e.type==='post'&&v.postId!==v.targetId||e.action==='edit'&&v.revision!==Number(p.payload.revision)+1||e.action==='delete'&&v.revision!==p.payload.revision)throw new FeedContentError();
 return clone(v) as unknown as FeedContentReceipt;
}
function checkedEntry(v:unknown):FeedContentEntry {
 if(!object(v)||Object.keys(v).some(k=>!['key','action','type','targetId','postId','preview','source','data','pending'].includes(k))||typeof v.key!=='string'||!v.key||v.key.length>200||!['create','edit','delete'].includes(String(v.action))||!['post','comment'].includes(String(v.type))||v.targetId!==null&&!positive(v.targetId)||v.postId!==null&&!positive(v.postId)||v.preview!==undefined&&(typeof v.preview!=='string'||v.preview.length>4000)||!object(v.data))throw new FeedContentError();
 if(v.type==='post'?(v.action==='create'?(v.targetId!==null||v.postId!==null):(!positive(v.targetId)||v.postId!==v.targetId)):(!positive(v.targetId)||!positive(v.postId)||v.action==='create'&&v.targetId!==v.postId))throw new FeedContentError();
 checkedFeedContentSource(v.source);
 if(v.pending!==undefined){if(!object(v.pending)||Object.keys(v.pending).some(k=>!['operationId','payload','prepared','receipt'].includes(k))||!uuid(v.pending.operationId)||!object(v.pending.payload)||typeof v.pending.prepared!=='boolean')throw new FeedContentError();if(v.pending.receipt!==undefined)checkedReceipt(v.pending.receipt,v as unknown as FeedContentEntry);}
 return clone(v) as unknown as FeedContentEntry;
}
/** Account/origin local drafts. Loading never writes, sends or adopts a new source.
 * Storage is checked before and after awaits; Web Locks serialize cooperative tabs. */
export class FeedContentDrafts {
 readonly owner:number;readonly origin:string;readonly storage:KeyValueStorage;readonly key:string;
 #raw:string|null=null;#entries:FeedContentEntry[]=[];#busy=new Set<string>();#held=new Set<string>();#notice=new Map<string,string>();#closed=false;#error='';#observed:FeedContentSource|undefined;
 readonly #views = new Map<HTMLElement, FeedContentSurface>();
 constructor(readonly client:CloudClient,storage?:KeyValueStorage){
  this.owner=client.memberNumber;if(!positive(this.owner))throw new FeedContentError();this.origin=client.origin??'';this.key=`kikilink:feed-content:v1:${encodeURIComponent(this.origin)}`;this.storage=storage??new AccountKeyValueStorage(this.owner);
  try{this.#raw=this.storage.getItem(this.key);if(this.#raw!==null){if(this.#raw.length>200000)throw new FeedContentError();const v:unknown=JSON.parse(this.#raw);if(!object(v)||Object.keys(v).sort().join(',')!=='entries,format,origin,owner'||v.format!==1||v.owner!==this.owner||v.origin!==this.origin||!Array.isArray(v.entries)||v.entries.length>64)throw new FeedContentError();this.#entries=v.entries.map(checkedEntry);if(new Set(this.#entries.map(e=>e.key)).size!==this.#entries.length)throw new FeedContentError();}}
  catch{this.#error='Saved Feed drafts could not be read. Their original bytes have been kept; do not clear browser storage.';}
 }
 get error():string{return this.#error;}
 identity():boolean{return !this.#closed&&this.client.memberNumber===this.owner&&(this.client.origin??'')===this.origin;}
 close():void{this.#closed=true;this.#views.clear();}
 entries():FeedContentEntry[]{return this.identity()?clone(this.#entries):[];}
 get(key:string):FeedContentEntry|undefined{return this.entries().find(e=>e.key===key);}
 blocked(key:string):boolean{return !!this.#error||this.#held.has(key);}
 observe(source:FeedContentSource):void{this.#observed=clone(source);for(const e of this.#entries)if(!same(e.source,source))this.#held.add(e.key);this.#render();}
 hold():void{for(const e of this.#entries)this.#held.add(e.key);this.#render();}
 #check():void{if(!this.identity()||this.#error)throw new FeedContentError(this.#error||undefined);if(this.storage.getItem(this.key)!==this.#raw){this.#error='These Feed drafts changed in another tab. Reload before sending; the saved drafts have been kept.';this.#render();throw new FeedContentError(this.#error);}}
 #write(entries:FeedContentEntry[]):void{
  this.#check();const raw=JSON.stringify({format:1,owner:this.owner,origin:this.origin,entries});if(raw.length>200000||entries.length>64)throw new FeedContentError('Too many saved Feed drafts. Resolve an unfinished draft before starting another.');entries.forEach(checkedEntry);
  try{this.storage.setItem(this.key,raw);if(this.storage.getItem(this.key)!==raw)throw new Error();this.#raw=raw;this.#entries=clone(entries);}
  catch{this.#error='Saving the Feed draft could not be confirmed. Keep this page open and reload before sending.';throw new FeedContentError(this.#error);}
  finally{this.#render();}
 }
 save(key:string,target:FeedContentTarget,source:FeedContentSource,data:Record<string,unknown>):FeedContentEntry {
  this.#check();const old=this.get(key);if(old&&(!same(old.source,source)||old.action!==target.action||old.type!==target.type||old.targetId!==target.targetId||old.postId!==target.postId))throw new FeedContentError();
  const entry:FeedContentEntry={...clone(target),key,source:clone(source),data:clone(data),...old?.pending?{pending:old.pending}:{}};
  this.#write([...this.#entries.filter(e=>e.key!==key),entry]);if(this.#observed&&!same(source,this.#observed))this.#held.add(key);return clone(entry);
 }
 async discard(key:string):Promise<FeedContentEntry|undefined>{this.#check();if(this.#busy.has(key))return;const entry=this.get(key);if(!entry)return;this.#write(this.#entries.filter(e=>e.key!==key));this.#held.delete(key);this.#notice.delete(key);return entry;}
 async #preflight(e:FeedContentEntry,current:()=>boolean):Promise<void>{
  this.#check();if(!current()||this.blocked(e.key)||!this.client.connected||e.source.required&&!this.origin)throw new FeedContentError();
  const metadata=await this.client.request<unknown>('GET','/v1/me');this.#check();if(!current())throw new Error('The original Feed request is kept after leaving this view.');
  if(!object(metadata)||(e.source.required?metadata.memberNumber!==this.owner:metadata.memberNumber!==undefined&&metadata.memberNumber!==this.owner)||!same(feedContentSource(metadata),e.source)||!e.source.required&&object(metadata.directRecovery)&&metadata.directRecovery.restored===true){this.#held.add(e.key);throw new FeedContentError();}
 }
 async send<T>(key:string,current:()=>boolean,prepare?:(payload:Record<string,unknown>,source:FeedContentSource)=>Promise<Record<string,unknown>>):Promise<T|undefined>{
  if(this.#busy.has(key)||!current())return;this.#check();if(this.blocked(key))throw new FeedContentError();this.stage(key,this.get(key)!.data,!prepare);this.#busy.add(key);this.#render();
  let result:T|undefined;
  const run=async()=>{
   let e=this.get(key);if(!e)throw new FeedContentError();
   if(!e.pending){e.pending={operationId:crypto.randomUUID(),payload:clone(e.data),prepared:!prepare};this.#replace(e);}
   try{
    await this.#preflight(e,current);
    if(!e.pending.prepared){if(!prepare)throw new FeedContentError('Open the original post draft to finish its attachments.');const payload=await prepare(clone(e.pending.payload),clone(e.source));this.#check();if(!current()||this.blocked(key))throw new FeedContentError();e.pending.payload=clone(payload);e.pending.prepared=true;this.#replace(e);await this.#preflight(e,current);}
    if(!e.pending.receipt){
     this.#check();if(!current()||this.blocked(key))throw new FeedContentError();
     const path=e.type==='post'?`/v1/feed${e.action==='create'?'':'/'+e.targetId}`:e.action==='create'?`/v1/feed/${e.postId}/comments`:`/v1/comments/${e.targetId}`;
     const method=e.action==='create'?'POST':e.action==='edit'?'PATCH':'DELETE';
     const payload=e.source.required?{...e.pending.payload,operationId:e.pending.operationId,recoveryGeneration:e.source.generation}:e.action==='delete'?undefined:e.pending.payload;
     const value=payload===undefined?await this.client.request<unknown>(method,path):await this.client.request<unknown>(method,path,payload);this.#check();if(this.blocked(key))throw new FeedContentError();
     if(e.source.required)e.pending.receipt=checkedReceipt(value,e);
     else{
      if(e.action!=='delete'&&(!object(value)||!positive(value.id)||!positive(value.revision)||e.type==='comment'&&value.postId!==e.postId))throw new FeedContentError();
      const v=object(value)?value:{};e.pending.receipt={applied:true,action:e.action,targetType:e.type,targetId:e.action==='delete'?e.targetId!:v.id as number,postId:e.postId??v.id as number,revision:e.action==='delete'?Number(e.pending.payload.revision):v.revision as number,operationId:e.pending.operationId};
     }
     this.#replace(e);
     if(!e.source.required&&current()){result=(e.action==='delete'?{deleted:true}:value) as T;return;}
    }
    if(!current())return;
    if(e.action==='delete'){result={deleted:true} as T;return;}
    const receipt=e.pending.receipt,value=await this.client.request<unknown>('GET',`/v1/${e.type==='post'?'feed':'comments'}/${receipt.targetId}${e.source.required?'?recoveryGeneration='+e.source.generation:''}`);this.#check();if(!current()||this.blocked(key))return;
    if(!object(value)||value.id!==receipt.targetId||e.source.required&&value.recoveryGeneration!==e.source.generation||e.type==='comment'&&value.postId!==receipt.postId||!positive(value.revision))throw new FeedContentError();
    result=value as T;this.#notice.delete(key);
   }catch(error){
    if(error instanceof FeedContentError||error instanceof CloudError&&error.status>=400&&error.status<500&&![408,429].includes(error.status))this.#held.add(key);
    this.#notice.set(key,e.pending?.receipt?'The change was confirmed. Retry only reads its current result.':'The original request is kept. Retry repeats the same text and operation.');throw error;
   }
  };
  try{const locks=typeof navigator!=='undefined'?navigator.locks:undefined;if(locks)await locks.request(`kikilink-feed-content:${this.owner}:${this.origin}`,run);else await run();return result;}
  finally{this.#busy.delete(key);this.#render();}
 }
 #replace(entry:FeedContentEntry):void{this.#write(this.#entries.map(e=>e.key===entry.key?{...entry,data:e.data}:e));}
 stage(key:string,payload:Record<string,unknown>,prepared=true):void{this.#check();const e=this.get(key);if(!e||this.blocked(key))throw new FeedContentError();if(e.pending)return;e.pending={operationId:crypto.randomUUID(),payload:clone(payload),prepared};this.#replace(e);}
 complete(key:string):void{
  this.#check();const e=this.get(key);if(!e?.pending?.receipt)throw new FeedContentError();
  if(e.type==='comment'&&e.action==='create'){
   const remaining=remainingDraftAfterSend(String(e.data.text??''),String(e.pending.payload.text??''));
   if(remaining){const {pending,...draft}=e;draft.data={...draft.data,text:remaining,...draft.data.clientId!==undefined?{clientId:crypto.randomUUID()}:{}};if(draft.data.parentId===pending.payload.parentId)delete draft.data.parentId;this.#write(this.#entries.map(v=>v.key===key?draft:v));return;}
  }
  if(e.action==='edit'&&!same(e.data,e.pending.payload)){const {pending,...draft}=e;this.#write(this.#entries.map(v=>v.key===key?draft:v));return;}
  this.#write(this.#entries.filter(v=>v.key!==key));this.#notice.delete(key);this.#held.delete(key);
 }
 surface(owner:HTMLElement,ui:SocialUI,current:()=>boolean,refresh:()=>Promise<void>,discarded:(e:FeedContentEntry,confirmed:boolean)=>Promise<void>):HTMLElement {
  const root=this.#views.get(owner)?.root??element('section',{className:'kl-feed-content-pending kl-cloud-card',ariaLabel:'Saved Feed drafts and requests'});
  this.#views.set(owner,{root,ui,current,refresh,discarded});
  delete root.dataset.signature;
  this.#render();
  return root;
 }
 releaseSurface(owner:HTMLElement):void{this.#views.delete(owner);}
 refreshSurfaces():void{this.#render();}
 #render():void{
  for(const view of this.#views.values())this.#renderSurface(view);
 }
 #renderSurface({root,ui,current,refresh,discarded}:FeedContentSurface):void{
  const entries=this.entries().filter(e=>e.pending||this.#held.has(e.key));const signature=JSON.stringify([this.#error,current(),entries,[...this.#busy],[...this.#held],[...this.#notice]]);if(root.dataset.signature===signature)return;root.dataset.signature=signature;root.replaceChildren();root.hidden=!entries.length&&!this.#error;if(root.hidden)return;
  root.append(element('h4',{text:'Saved Feed drafts and requests'}));if(this.#error)root.append(element('p',{role:'alert',text:this.#error}));
  for(const e of entries){const item=element('div',{},element('strong',{text:`${e.action==='create'?'Publish':e.action==='edit'?'Edit':'Delete'} ${e.type}${e.targetId?' #'+e.targetId:''}`}),element('p',{className:'kl-cloud-note',text:this.#held.has(e.key)?'This draft belongs to an earlier Feed or needs review. Copy its text before discarding the request.':this.#notice.get(e.key)||'The original request is saved on this device.'}));
   const text=element('textarea',{ariaLabel:'Original Feed draft',value:String(e.pending?.payload.text??e.data.text??e.preview??'')});text.readOnly=true;text.rows=3;item.append(text);
   const controls=element('div',{className:'kl-setting-tool-buttons'}),post=e.type==='post'&&e.action==='create';
   const retry=ui.button(post?'Open original post draft':e.pending?.receipt?'Read confirmed result':'Retry original request',async()=>{if(!retry.isConnected||!current())return;if(post){await refresh();return;}const value=await this.send(e.key,current);if(value!==undefined){await discarded(this.get(e.key)??e,true);this.complete(e.key);await refresh();}},'refresh');retry.disabled=this.blocked(e.key)||this.#busy.has(e.key)||!current();controls.append(retry);
   const discard=ui.button('Discard saved request',()=>{if(!discard.isConnected||!current()||this.#busy.has(e.key))return;ui.confirm(item,'Discard this local request? This does not undo a change that may already be on the server. Copy any text you want to keep.',async()=>{if(!item.isConnected||!current()||this.#busy.has(e.key))return;await discarded(this.get(e.key)??e,false);await this.discard(e.key);await refresh();},'Discard');},'close');discard.disabled=!!this.#error||this.#busy.has(e.key)||!current();controls.append(discard);item.append(controls);root.append(item);
  }
 }
}
