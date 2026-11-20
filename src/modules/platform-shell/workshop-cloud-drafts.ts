import {workshopAccessAt,workshopSource,requireWorkshopSource,type WorkshopSource} from './workshop-generation';
import {needsRoomOpening} from '../../../cloud/shared/room-contract.mjs';
import {checkedLocalWorkshopDraft,workshopDraftValue,workshopId,WORKSHOP_TYPES,type LocalWorkshopDraft,type WorkshopType} from '../../../cloud/shared/workshop-drafts.mjs';
import {CloudError,type CloudClient} from '../../cloud/client';
import {element} from '../../cloud/dom';
import {WorkshopDrafts} from './workshop-drafts';
import {workshopNote as note,workshopPayloadView} from './workshop-model';
export interface CloudWorkshopDraft {owner:number;id:string;revision:number;updatedAt:number|null;snapshot:LocalWorkshopDraft|null;source?:WorkshopSource;}
export interface CloudWorkshopDraftItem {id:string;revision:number;updatedAt:number;title:string;type:WorkshopType;}
export interface WorkshopDraftCloudAccess {
 list(current:()=>boolean):Promise<CloudWorkshopDraftItem[]>;
 get(id:string,current:()=>boolean):Promise<CloudWorkshopDraft>;
 write(review:CloudWorkshopDraft,snapshot:LocalWorkshopDraft|null,operationId:string,current:()=>boolean):Promise<void>;
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:unknown,keys:string[]):v is Record<string,unknown>=>object(v)&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const positive=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const time=(v:unknown):v is number=>positive(v)&&Number(v)<=8640000000000000;
export class WorkshopDraftCloud implements WorkshopDraftCloudAccess {
 readonly #owner:number;readonly #origin:string;
 constructor(readonly client:CloudClient,readonly current:()=>boolean){this.#owner=client.memberNumber;this.#origin=client.origin;}
 #check(current:()=>boolean):void{if(!current()||!this.current()||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin)throw new Error('Your account or draft review changed.');if(!this.client.connected)throw new Error('Reconnect to Cloud. Local drafts are kept.');}
 async #request(method:string,path:string,body:unknown,current:()=>boolean,source?:WorkshopSource):Promise<unknown>{
  this.#check(current);
  try{const value=source?await workshopAccessAt(this.client,source,()=>{this.#check(current);return true;}).request<unknown>(method,path,body):await this.client.request<unknown>(method,path,body);this.#check(current);return value;}
  catch(error){this.#check(current);if(error instanceof CloudError){
   if(error.code==='workshop_editor_conflict'||error.code==='workshop_editor_operation_conflict')throw new Error('The Cloud copy changed on another device. Refresh and review both copies again.');
   if(error.code==='workshop_editor_full')throw new Error('Cloud drafts are full. Delete a Cloud copy before saving more.');
   if(error.code==='workshop_editor_identity_limit')throw new Error('This account has reached its Cloud draft identity limit. Existing copies are kept.');
   if(error.status===404)throw new Error('Cloud draft sync is not available on this server yet.');
  }throw error;}
 }
 async #gate(current:()=>boolean,extended=false):Promise<WorkshopSource>{const me=await this.#request('GET','/v1/me',undefined,current);if(!object(me)||me.memberNumber!==this.#owner||!object(me.features)||me.features.workshopDraftSync!==true)throw new Error('This Cloud account or server does not support private draft sync yet.');if(extended&&me.features.roomOpening!==true)throw new Error('These room settings need the pending Cloud update. The local copy is kept.');return workshopSource(me);}
 async list(current:()=>boolean):Promise<CloudWorkshopDraftItem[]>{
  const source=await this.#gate(current);const v=await this.#request('GET','/v1/workshop-editor-drafts',undefined,current,source);
  if(!exact(v,['owner','limit','items'])||v.owner!==this.#owner||v.limit!==20||!Array.isArray(v.items)||v.items.length>20)throw new Error('Invalid private Cloud draft list.');
  const items=v.items.filter((item:unknown)=>!object(item)||!['Scene pack','Automation preset'].includes(String(item.type)));
  const ids=new Set<string>();for(const item of items){if(!exact(item,['id','revision','updatedAt','title','type'])||!workshopId(item.id)||ids.has(item.id)||!positive(item.revision)||!time(item.updatedAt)||typeof item.title!=='string'||item.title.length>80||!(WORKSHOP_TYPES as readonly unknown[]).includes(item.type))throw new Error('Invalid private Cloud draft list.');ids.add(item.id);}
  return structuredClone(items) as CloudWorkshopDraftItem[];
 }
 async get(id:string,current:()=>boolean):Promise<CloudWorkshopDraft>{
  if(!workshopId(id))throw new Error('Invalid draft ID.');const source=await this.#gate(current);const v=await this.#request('GET',`/v1/workshop-editor-drafts/${id}`,undefined,current,source);
  if(!exact(v,['owner','id','revision','updatedAt','snapshot'])||v.owner!==this.#owner||v.id!==id||!Number.isSafeInteger(v.revision)||Number(v.revision)<0||v.revision===0&&(v.snapshot!==null||v.updatedAt!==null)||v.revision!==0&&!time(v.updatedAt))throw new Error('Invalid private Cloud draft.');
  const snapshot=v.snapshot===null?null:checkedLocalWorkshopDraft(v.snapshot);if(snapshot&&snapshot.id!==id)throw new Error('Cloud returned a different draft.');
  return{owner:this.#owner,id,revision:Number(v.revision),updatedAt:v.updatedAt as number|null,snapshot,...source.required||source.generation?{source}:{}};
 }
 async write(review:CloudWorkshopDraft,value:LocalWorkshopDraft|null,operationId:string,current:()=>boolean):Promise<void>{
  if(review.owner!==this.#owner||!workshopId(review.id)||!workshopId(operationId)||!Number.isSafeInteger(review.revision)||review.revision<0||review.revision>=Number.MAX_SAFE_INTEGER||value===null&&review.revision===0)throw new Error('Invalid Cloud draft review.');
  const snapshot=value===null?null:checkedLocalWorkshopDraft(value);if(snapshot&&snapshot.id!==review.id)throw new Error('The draft identity changed.');
  const source=await this.#gate(current,needsRoomOpening(snapshot));requireWorkshopSource(review.source,source);const receipt=await this.#request(snapshot?'PUT':'DELETE',`/v1/workshop-editor-drafts/${review.id}`,{operationId,revision:review.revision,...snapshot?{snapshot}:{}},current,source);
  if(!exact(receipt,['owner','id','revision','deleted',...source.required?['operationId','applied']:[]])||source.required&&(receipt.operationId!==operationId||receipt.applied!==true)||receipt.owner!==this.#owner||receipt.id!==review.id||receipt.revision!==review.revision+1||receipt.deleted!==(snapshot===null))throw new Error('The Cloud result could not be confirmed. Refresh Cloud drafts to check it.');
 }
}
interface Review {local:LocalWorkshopDraft|null;cloud:CloudWorkshopDraft;}
/** Explicit two-way snapshot synchronization; local autosave never uploads implicitly. */
export class WorkshopCloudDraftPanel {
 readonly element=element('section',{className:'kl-workshop-cloud-drafts',ariaLabel:'Private Cloud drafts'});
 #visible=false;#busy=false;#generation=0;#message='';#items:CloudWorkshopDraftItem[]|undefined;#review:Review|undefined;
 #confirmation:'upload'|'restore'|'copy'|'delete'|'link'|undefined;
 #pending:{review:Review;snapshot:LocalWorkshopDraft|null;operationId:string}|undefined;
 constructor(readonly drafts:WorkshopDrafts,readonly access:WorkshopDraftCloudAccess,readonly current:()=>boolean,readonly sync?:{link(review:CloudWorkshopDraft,local:LocalWorkshopDraft,valid:()=>boolean):Promise<void>}){}
 get reviewing():boolean{return this.#visible;}
 hide():void{this.#visible=false;this.#generation++;this.#busy=false;this.#review=undefined;this.#pending=undefined;this.#confirmation=undefined;this.#items=undefined;this.element.replaceChildren();}
 open(id?:string):void{this.hide();this.#visible=true;this.#message='';if(id)this.#loadReview(id);else this.#load();}
 #guard():()=>boolean{const generation=this.#generation;return()=>this.#visible&&this.current()&&generation===this.#generation;}
 #button(label:string,action:()=>void):HTMLButtonElement{const valid=this.#guard(),button=element('button',{type:'button',className:'kl-text-button',text:label});button.disabled=this.#busy;button.onclick=()=>{if(this.element.contains(button)&&valid()&&!this.#busy)action();};return button;}
 #run(action:(valid:()=>boolean)=>Promise<void>):void{
  const valid=this.#guard();this.#busy=true;this.#render();
  void action(valid).then(()=>{if(valid()){this.#busy=false;this.#render();}}).catch(error=>{if(valid()){this.#busy=false;this.#confirmation=undefined;this.#message=(error instanceof Error?error.message:'Draft sync failed.')+' Local copies are kept. If a response was lost, refresh Cloud drafts to check the result.';this.#render();}});
 }
 #load():void{this.#review=undefined;this.#pending=undefined;this.#confirmation=undefined;this.#run(async valid=>{const items=await this.access.list(valid);if(valid())this.#items=items;});}
 #loadReview(id:string):void{
  this.#pending=undefined;this.#confirmation=undefined;
  this.#run(async valid=>{const local=this.drafts.list().find(v=>v.id===id)??null,cloud=await this.access.get(id,valid);if(valid()){this.#review={local,cloud};this.#items=undefined;this.#message='';}});
 }
 #localMatches(review:Review):boolean{const actual=this.drafts.list().find(v=>v.id===review.cloud.id)??null;return workshopDraftValue(actual)===workshopDraftValue(review.local);}
 #upload(deleting=false):void{
  const review=this.#review!;this.#pending??={review:structuredClone(review),snapshot:deleting?null:structuredClone(review.local),operationId:crypto.randomUUID()};const pending=this.#pending;
  this.#run(async valid=>{
   if(!this.#localMatches(pending.review))throw new Error('The local draft changed in another tab. Review it again before syncing.');
   await this.access.write(pending.review.cloud,pending.snapshot,pending.operationId,valid);
   if(valid()){this.#pending=undefined;this.#confirmation=undefined;this.#review=undefined;this.#message=deleting?'Cloud copy deleted. Local copies were kept.':'Private Cloud copy saved. Nothing was published.';this.#items=await this.access.list(valid);}
  });
 }
 #restore(copy=false):void{
  const review=this.#review!,cloud=review.cloud;this.#run(async valid=>{
   const fresh=await this.access.get(cloud.id,valid);if(workshopDraftValue(fresh)!==workshopDraftValue(cloud))throw new Error('The Cloud copy changed. Review it again before restoring.');
   const snapshot=checkedLocalWorkshopDraft(cloud.snapshot),id=copy?crypto.randomUUID():cloud.id;const restored={...snapshot,id};
   await this.drafts.put(restored,id,copy?null:review.local?JSON.stringify(review.local):null,valid);
   if(valid()){this.#review=undefined;this.#confirmation=undefined;this.#message=copy?'An independent local copy was saved. Both originals were kept.':'Draft restored on this device. Open Local drafts to continue editing.';this.#items=await this.access.list(valid);}
  });
 }
 #preview(title:string,value:LocalWorkshopDraft|null):HTMLElement{
  const card=element('article',{className:'kl-workshop-card'},element('h3',{text:title}));if(!value){card.append(note('No saved copy.'));return card;}
  const d=value.draft,details=element('details',{},element('summary',{text:'Preview draft content'}));
  details.append(note(d.summary),note(d.description),note(`Version ${d.version||'(unfinished)'} · ${d.visibility} · ${d.tags.join(', ')}`),note(d.changelog),workshopPayloadView(d));
  for(const [type,payload]of Object.entries(value.variants).filter(([type])=>WORKSHOP_TYPES.includes(type as WorkshopType)))details.append(element('h4',{text:`Saved variant: ${type}`}),workshopPayloadView({...d,type:type as WorkshopType,payload}));
  card.append(element('strong',{text:d.title||'Untitled draft'}),note(`${d.type} · editor step ${value.step} of 3`),details);return card;
 }
 #render():void{
  if(!this.#visible)return;
  this.element.replaceChildren(element('h2',{text:'Private Cloud drafts'}),note('Sync unfinished drafts between your devices. Only your account can access these copies. Use the actions below to transfer changes, or link matching copies and choose automatic transfers in Sync settings.'),element('div',{role:'status'},note(this.#busy?'Checking draft sync…':this.#message)),this.#button('Refresh Cloud drafts',()=>{this.#message='';this.#load();}));
  if(this.#pending){this.element.append(note('This submitted sync may already have completed. Retry keeps the same reviewed content and operation.'),this.#button('Retry draft sync',()=>this.#upload(this.#pending!.snapshot===null)));return;}
  const review=this.#review;
  if(review){
   const {local,cloud}=review;this.element.append(this.#preview('On this device',local),this.#preview('In Cloud',cloud.snapshot));
   const identical=!!local&&!!cloud.snapshot&&workshopDraftValue(local)===workshopDraftValue(cloud.snapshot);
   if(identical)this.element.append(note('Both copies are identical.'));
   else this.element.append(note('Copies are transferred in full, including saved type variants. No fields are merged automatically.'));
   if(this.#confirmation){const kind=this.#confirmation,label=kind==='link'?'Confirm sync link':kind==='upload'?'Confirm save Cloud copy':kind==='restore'?'Confirm restore local draft':kind==='copy'?'Confirm keep both copies':'Confirm delete Cloud copy';
    this.element.append(note(kind==='link'?'Link these matching private copies? Automatic transfers follow Sync settings on this device. Deletions and publication stay separate.':kind==='upload'?'Save this device’s reviewed draft to Cloud? Any existing Cloud copy will be replaced.':kind==='restore'?'Restore this Cloud draft on this device? An existing local copy will be replaced.':kind==='copy'?'Keep the existing local draft and restore Cloud as a separate local copy?':'Delete only this reviewed Cloud copy? Local copies on your devices remain.'),this.#button(label,()=>{if(kind==='link')this.#run(async valid=>{await this.sync!.link(cloud,local!,valid);if(valid()){this.#confirmation=undefined;this.#message='Draft linked. Choose automatic transfers in Sync settings.';}});else if(kind==='upload'||kind==='delete')this.#upload(kind==='delete');else this.#restore(kind==='copy');}),this.#button('Keep reviewing',()=>{this.#confirmation=undefined;this.#render();}));return;
   }
   const confirm=(kind:'upload'|'restore'|'copy'|'delete'|'link')=>{this.#confirmation=kind;this.#render();};
   if(identical&&this.sync)this.element.append(this.#button('Link automatic sync',()=>confirm('link')));
   if(local&&!identical)this.element.append(this.#button(cloud.snapshot?'Replace Cloud copy':'Save private Cloud copy',()=>confirm('upload')));
   if(cloud.snapshot&&!identical)this.element.append(this.#button(local?'Replace local draft':'Restore on this device',()=>confirm('restore')));
   if(local&&cloud.snapshot&&!identical)this.element.append(this.#button('Keep both as local drafts',()=>confirm('copy')));
   if(cloud.snapshot)this.element.append(this.#button('Delete Cloud copy',()=>confirm('delete')));
   return;
  }
  if(this.#items){if(!this.#items.length)this.element.append(note('No Cloud drafts yet. Open Local drafts and choose Review Cloud sync.'));
   for(const item of this.#items)this.element.append(element('article',{className:'kl-workshop-card'},element('h3',{text:item.title||'Untitled draft'}),note(`${item.type} · updated ${new Date(item.updatedAt).toLocaleString()}`),this.#button('Review Cloud draft',()=>this.#loadReview(item.id))));}
 }
}
