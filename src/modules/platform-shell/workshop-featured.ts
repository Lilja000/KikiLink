import {engagementReview,engagementWrite,engagementReceipt,workshopAccessAt,type WorkshopSource} from './workshop-engagement';
import {element} from '../../cloud/dom';
import {type CloudClient} from '../../cloud/client';
import {workshopVersion,workshopId,workshopNote as note} from './workshop-model';
export interface WorkshopFeatureReview {packageId:string;version:string|null;revision:number;featured:boolean;expiresAt:number|null;canFeature:boolean;}
export function checkedFeature(value:WorkshopFeatureReview,id:string):WorkshopFeatureReview{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='canFeature,expiresAt,featured,packageId,revision,version'||value.packageId!==id||!workshopId(id)||value.version!==null&&!workshopVersion(value.version)||!Number.isSafeInteger(value.revision)||value.revision<0||value.revision>=Number.MAX_SAFE_INTEGER||typeof value.featured!=='boolean'||typeof value.canFeature!=='boolean'||(value.canFeature||value.featured)&&value.version===null||(value.featured?(!Number.isSafeInteger(value.expiresAt)||value.expiresAt!<=0):value.expiresAt!==null))throw new Error('Invalid Featured review.');
 return structuredClone(value);
}
interface FeatureIntent {review?:WorkshopFeatureReview;source?:WorkshopSource;pending?:{operationId:string;version:string;revision:number;featured:boolean};confirmed?:boolean;sending?:boolean;}
const intents=new WeakMap<CloudClient,Map<string,FeatureIntent>>();
/** Volatile session intent survives navigation; no reload persistence is claimed. */
export class WorkshopFeaturedPanel {
 readonly element=element('section',{ariaLabel:'Featured curation'});
 #alive=true;#busy=false;#generation=0;#view=0;#forget=false;readonly #state:FeatureIntent;readonly #owner:number;readonly #origin:string;
 get reviewing():boolean{return this.#busy||!!this.#state.review;}
 constructor(readonly client:CloudClient,readonly id:string,readonly current:()=>boolean){this.#owner=client.memberNumber;this.#origin=client.origin;let map=intents.get(client);if(!map)intents.set(client,map=new Map());const key=JSON.stringify([this.#origin,this.#owner,id]);this.#state=map.get(key)??{};map.set(key,this.#state);this.#render();}
 dispose():void{this.#alive=false;this.#generation++;this.element.replaceChildren();}
 #valid():()=>boolean{const g=this.#generation;return()=>this.#alive&&this.current()&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin&&this.#generation===g;}
 #button(text:string,action:()=>void):HTMLButtonElement{const valid=this.#valid(),view=this.#view,b=element('button',{type:'button',className:'kl-text-button',text});b.disabled=this.#busy;b.onclick=()=>{if(valid()&&view===this.#view&&this.element.isConnected&&this.element.contains(b)&&!this.#busy&&!this.#state.sending)action();};return b;}
 #clear():void{delete this.#state.review;delete this.#state.source;delete this.#state.pending;this.#state.confirmed=false;this.#forget=false;}
 #run(action:(valid:()=>boolean)=>Promise<void>):void{const valid=this.#valid();this.#busy=true;this.#state.sending=true;this.#render();void action(valid).catch(e=>{if(valid()){this.#busy=false;this.#render();this.element.append(note(e instanceof Error?e.message:'Featured could not finish.'));}}).finally(()=>{this.#state.sending=false;if(valid()&&this.#busy){this.#busy=false;this.#render();}});}
 #render():void{
  this.#view++;this.element.replaceChildren(element('h3',{text:'Featured curation'}),note('Moderator selection for this exact public version, for 7 days. Up to 20 current versions. A new publication requires a new selection.'));
  const state=this.#state;
  if(!state.review){this.element.append(this.#button('Review Featured selection',()=>this.#run(async valid=>{const source=await engagementReview(this.client,valid,'workshopDiscovery',true),review=checkedFeature(await workshopAccessAt(this.client,source,valid).request<WorkshopFeatureReview>('GET',`/v1/workshop/${this.id}/featured`),this.id);if(valid()){if(!review.canFeature)throw new Error('This creation is no longer eligible.');state.review=review;state.source=source;}})));return;}
  const review=state.review;this.element.append(note(`Version ${review.version} · ${review.featured?'currently Featured':'not Featured'}`),...(state.confirmed?[note('Cloud confirmed this request. Finish without sending it again.')]:[]),this.#button(state.confirmed?'Finish Featured change':state.pending?'Retry Featured change':review.featured?'Confirm remove Featured':'Confirm feature for 7 days',()=>this.#run(async valid=>{
   const input=state.pending??={operationId:crypto.randomUUID(),version:review.version!,revision:review.revision,featured:!review.featured};
   if(!state.confirmed){const result=await engagementWrite(this.client,state.source,valid,'workshopDiscovery','PUT',`/v1/workshop/${this.id}/featured`,input,true);
    if(!engagementReceipt(result,{packageId:this.id,revision:input.revision+1},state.source,input.operationId,'feature'))throw new Error('Featured result was not confirmed. Retry the same request.');
    if(state.pending===input)state.confirmed=true;}
   if(!valid()||state.pending!==input)return;
   this.#clear();this.#busy=false;this.#render();this.element.append(note('Featured selection updated. Refresh Workshop to see the current catalogue.'));
  })),this.#button('Cancel Featured review',()=>{if(state.pending&&!state.confirmed){this.#forget=true;this.#render();}else{this.#clear();this.#generation++;this.#render();}}));
  if(this.#forget)this.element.append(note('Forgetting cannot undo a Featured change already committed in Cloud.'),this.#button('Confirm forget Featured change',()=>{this.#clear();this.#generation++;this.#render();}),this.#button('Keep Featured change',()=>{this.#forget=false;this.#render();}));
 }
}
