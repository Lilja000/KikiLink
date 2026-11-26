import { pageAction } from './page-action';
import { markAvatarPresence } from "../link-chat/avatar-presence";
import {engagementReview,engagementWrite,engagementReceipt,workshopAccessAt,type WorkshopSource} from './workshop-engagement';
import {element} from '../../cloud/dom';
import {CloudError,type CloudClient} from '../../cloud/client';
import {kikiIcon} from '../link-chat/icons';
import {workshopVersion,workshopNote as note} from './workshop-model';
export interface Review {sequence:number;reviewer:number;authorName:string;rating:number;comment:string;version:string;revision:number;createdAt:number;updatedAt:number;}
export interface Reviews {packageId:string;count:number;average:number|null;items:Review[];nextCursor:number|null;mine:Review|null;myRevision:number;canReview:boolean;}
const positive=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0;
export function checkedReviews(value:Reviews,id:string,member:number,cursor=0):Reviews{
 const valid=(r:Review)=>r&&positive(r.sequence)&&positive(r.reviewer)&&typeof r.authorName==='string'&&r.authorName.length>0&&r.authorName.length<=80&&Number.isInteger(r.rating)&&r.rating>=1&&r.rating<=5&&typeof r.comment==='string'&&r.comment.length<=600&&workshopVersion(r.version)&&positive(r.revision)&&positive(r.createdAt)&&positive(r.updatedAt);
 if(!value||value.packageId!==id||!Number.isSafeInteger(value.count)||value.count<0||value.count===0&&value.average!==null||value.count>0&&(typeof value.average!=='number'||!Number.isFinite(value.average)||value.average<1||value.average>5)||!Array.isArray(value.items)||value.items.length>20||value.items.length>value.count||value.items.some(r=>!valid(r)||cursor>0&&r.sequence>=cursor)||new Set(value.items.map(r=>r.sequence)).size!==value.items.length||value.items.some((r,i)=>i>0&&r.sequence>=value.items[i-1]!.sequence)||value.nextCursor!==null&&(!positive(value.nextCursor)||value.nextCursor!==value.items.at(-1)?.sequence)||value.mine!==null&&(!valid(value.mine)||value.mine.reviewer!==member)||!Number.isSafeInteger(value.myRevision)||value.myRevision<0||value.myRevision>=Number.MAX_SAFE_INTEGER||value.mine!==null&&value.myRevision!==value.mine.revision||typeof value.canReview!=='boolean')throw new Error('Invalid reviews response.');return value;
}
interface ReviewIntent {draft?:{rating:number;comment:string;revision:number;initial:string;source:WorkshopSource};retry?:{method:'PUT'|'POST';path:string;body:{operationId:string;revision:number;rating?:number;comment?:string};source:WorkshopSource;confirmed?:boolean};sending?:boolean;}
// In-memory only, scoped to this authenticated client. Reload durability is not claimed.
const intents=new WeakMap<CloudClient,Map<string,ReviewIntent>>();
export class WorkshopReviews {
 readonly element=element('section',{className:'kl-workshop-reviews',ariaLabel:'Reviews'});
 #token=0;#view=0;#disposed=false;#data:Reviews|undefined;#items:Review[]=[];#busy=false;#source:WorkshopSource|undefined;readonly #state:ReviewIntent;readonly #owner:number;readonly #origin:string;
 constructor(readonly client:CloudClient,readonly id:string,readonly active:()=>boolean,readonly report?:((review:Review)=>void)){this.#owner=client.memberNumber;this.#origin=client.origin;let map=intents.get(client);if(!map)intents.set(client,map=new Map());const key=JSON.stringify([this.#origin,this.#owner,id]);this.#state=map.get(key)??{};map.set(key,this.#state);if(this.reviewing)this.#render();else void this.refresh();}
 get reviewing():boolean{return !!this.#state.draft||!!this.#state.retry;}
 pause():void{this.#token++;this.#busy=false;if(this.#state.retry){this.element.replaceChildren(note('Save result must be confirmed.'),this.#button('Retry review save',()=>void this.#send()));}else if(this.#state.draft)this.#render();}
 dispose():void{this.#disposed=true;this.#token++;this.element.replaceChildren();}
 #current(token:number):boolean{return !this.#disposed&&this.active()&&token===this.#token&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
 #button(label:string,fn:()=>void):HTMLButtonElement{const view=this.#view,b=element('button',{type:'button',className:'kl-text-button',text:label});b.addEventListener('click',()=>{if(this.#current(this.#token)&&view===this.#view&&this.element.isConnected&&this.element.contains(b)&&!this.#busy&&!this.#state.sending)fn();});return b;}
 #error(e:unknown):void{this.element.append(element('p',{role:'alert',text:e instanceof CloudError&&[403,404].includes(e.status)?'This creation or its reviews are no longer available.':e instanceof Error?e.message:'Reviews could not be loaded.'}));}
 confirmLeave(action:()=>void):void{if(!this.reviewing){action();return;}this.element.append(note(this.#state.retry?'Discard this pending review and leave? This cannot undo a review already saved in Cloud.':'Discard this review and leave?'),this.#button('Keep editing',()=>this.#render()),this.#button('Discard review and leave',()=>{delete this.#state.draft;delete this.#state.retry;action();}));}
 invalidate():void{this.#data=undefined;this.#items=[];if(this.#busy)return;if(!this.reviewing)void this.refresh();else {this.#render();this.element.append(note('Workshop changed. Saving checks current access and revision.'));}}
 async refresh(more=false):Promise<void>{if(this.#state.draft||this.#state.retry||this.#disposed||!this.active())return;const cursor=more?this.#data?.nextCursor??0:0,token=++this.#token;this.#busy=true;if(!more){this.#items=[];this.element.replaceChildren(note('Loading reviews…'));}try{const source=await engagementReview(this.client,()=>this.#current(token),'workshopReviews'),data=checkedReviews(await workshopAccessAt(this.client,source,()=>this.#current(token)).request<Reviews>('GET',`/v1/workshop/${this.id}/reviews?limit=20&cursor=${cursor}`),this.id,this.client.memberNumber,cursor);if(!this.#current(token))return;if(more&&data.items.some(r=>this.#items.some(old=>old.sequence===r.sequence)))throw new Error('Reviews changed. Refresh the list.');this.#source=source;this.#data=data;this.#items=[...(more?this.#items:[]),...data.items];this.#busy=false;this.#render();}catch(e){if(!this.#current(token))return;this.#busy=false;this.#data=undefined;this.#items=[];this.element.replaceChildren(this.#button('Retry reviews',()=>void this.refresh()));this.#error(e);}finally{if(token===this.#token)this.#busy=false;}}
 #render():void{
  this.#view++;
  const heading=element('header',{className:'kl-workshop-review-heading'},element('h2',{text:'A little feedback'}));
  this.element.replaceChildren(heading);
  if(this.#state.retry){this.element.append(note(this.#state.retry.confirmed?'Cloud confirmed this request. Finish without sending it again.':'The result has not been confirmed. The original rating and text are kept for this session.'),...(this.#state.draft?[note(`${this.#state.draft.rating} / 5`),Object.assign(element('textarea',{ariaLabel:'Unsaved review text',value:this.#state.draft.comment}),{readOnly:true})]:[]),this.#button('Retry review save',()=>void this.#send()),this.#button('Forget pending review',()=>this.confirmLeave(()=>{this.#data=undefined;this.#items=[];void this.refresh();})));return;}if(this.#state.draft){this.#editor();return;}
  const data=this.#data;if(!data){this.element.append(this.#button('Refresh reviews',()=>void this.refresh()));return;}
  const refresh=this.#button('Refresh reviews',()=>void this.refresh());
  refresh.classList.add('kl-workshop-review-refresh');
  refresh.title='Refresh reviews';
  refresh.replaceChildren(kikiIcon('refresh'),element('span',{className:'kl-workshop-sr-only',text:'Refresh reviews'}));
  const actions=element('div',{className:'kl-workshop-review-actions'});
  if(data.canReview)actions.append(this.#button(data.mine?'Edit review':'Write review',()=>{
   const rating=data.mine?.rating??0,comment=data.mine?.comment??'';
   this.#state.draft={rating,comment,revision:data.myRevision,initial:JSON.stringify([rating,comment]),source:this.#source!};
   this.#render();
   const field=this.element.querySelector('.kl-workshop-review-rating');
   (field?.querySelector<HTMLInputElement>('input:checked')??field?.querySelector<HTMLInputElement>('input'))?.focus();
  }));
  if(data.mine)actions.append(this.#button('Remove review',()=>{this.element.append(note('Remove your rating and review?'),this.#button('Keep review',()=>this.#render()),this.#button('Confirm remove review',()=>{this.#state.retry={source:this.#source!,method:'POST',path:`/v1/workshop/${this.id}/review/remove`,body:{operationId:crypto.randomUUID(),revision:data.myRevision}};void this.#send();}));}));
  actions.append(refresh);
  heading.append(actions);
  this.element.append(note(data.count?`${data.average!.toFixed(1)} / 5 · ${data.count} ${data.count===1?'review':'reviews'}`:'No reviews yet.'));
  for(const review of this.#items){
   const own=review.reviewer===this.client.memberNumber;
   const copy=element('div',{className:'kl-workshop-review-copy'},element('div',{className:'kl-workshop-review-byline'},
    element('strong',{text:review.authorName}),element('span',{className:'kl-workshop-review-score',ariaLabel:`${review.rating} out of 5`,text:'★'.repeat(review.rating)+'☆'.repeat(5-review.rating)})),
    review.comment?note(review.comment):undefined,element('small',{text:`v${review.version} · ${new Date(review.updatedAt).toLocaleDateString()}${own?' · You':''}`}));
   if(this.report&&!own)copy.append(this.#button('Report review',()=>this.report!(review)));
   this.element.append(element('article',{className:'kl-workshop-card kl-workshop-review-row'},
    markAvatarPresence(element('span',{className:'kl-workshop-review-avatar',ariaHidden:'true'},kikiIcon('profile')),review.reviewer),copy));
  }
  if(data.nextCursor)this.element.append(pageAction(this.#button('Load more reviews',()=>void this.refresh(true))));
 }
 #editor():void{
  const draft=this.#state.draft!;
  this.element.append(note('Your rating and optional review are visible to people who can access this creation.'));
  const group=element('fieldset',{className:'kl-workshop-review-rating'},element('legend',{text:'Your rating'}));
  const save=this.#button('Save review',()=>{
   if(draft.rating<1||draft.rating>5)return;
   this.#state.retry={source:draft.source,method:'PUT',path:`/v1/workshop/${this.id}/review`,
    body:{operationId:crypto.randomUUID(),revision:draft.revision,rating:draft.rating,comment:draft.comment.trim()}};
   void this.#send();
  });
  save.disabled=draft.rating===0;
  const current=()=>this.#state.draft===draft&&!this.#busy&&!this.#state.retry&&this.#current(this.#token);
  for(let rating=1;rating<=5;rating++){
   const radio=element('input',{type:'radio',className:'kl-workshop-sr-only',value:String(rating),ariaLabel:`${rating} out of 5`});
   radio.name='workshop-rating';radio.checked=draft.rating===rating;
   radio.addEventListener('change',()=>{if(current()){draft.rating=rating;save.disabled=false;}});
   group.append(element('label',{},radio,kikiIcon('star')));
  }
  const input=element('textarea',{ariaLabel:'Your review (optional)',maxLength:600,value:draft.comment});
  const counter=note(`${draft.comment.length} / 600`);
  input.addEventListener('input',()=>{if(current()){draft.comment=input.value;counter.textContent=`${draft.comment.length} / 600`;}});
  const cancel=this.#button('Cancel review',()=>{
   if(JSON.stringify([draft.rating,draft.comment])===draft.initial){delete this.#state.draft;void this.refresh();return;}
   this.element.append(note('Discard your unsaved review?'),this.#button('Keep editing',()=>this.#render()),
    this.#button('Discard review',()=>{delete this.#state.draft;delete this.#state.retry;void this.refresh();}));
  });
  save.classList.add('kl-workshop-action-primary');
  this.element.append(group,element('label',{className:'kl-workshop-review-comment'},'Your review (optional)',input),counter,
   element('div',{className:'kl-workshop-review-actions'},cancel,save));
 }
 async #send():Promise<void>{const retry=this.#state.retry;if(!retry||this.#busy||this.#state.sending)return;const token=++this.#token,member=this.client.memberNumber;this.#busy=true;this.#state.sending=true;for(const control of this.element.querySelectorAll<HTMLInputElement>('button,input,textarea'))control.disabled=true;
  try{if(!retry.confirmed){const result=await engagementWrite(this.client,retry.source,()=>this.#current(token),'workshopReviews',retry.method,retry.path,retry.body);
   if(!engagementReceipt(result,{packageId:this.id,revision:retry.body.revision+1,deleted:retry.method==='POST'},retry.source,retry.body.operationId,retry.method==='POST'?'review-remove':'review-save'))throw new Error('Invalid save receipt. Retry to confirm the same operation.');
   if(this.#state.retry===retry)retry.confirmed=true;}
   if(!this.#current(token)||member!==this.client.memberNumber||this.#state.retry!==retry)return;
   delete this.#state.retry;delete this.#state.draft;this.#busy=false;this.#state.sending=false;if(this.client.connected)await this.refresh();else this.element.replaceChildren(note('Review confirmed. Reconnect to load current reviews.'));}

  catch(e){if(!this.#current(token))return;this.#busy=false;if(!retry.source.required&&e instanceof CloudError&&[400,403,404,409].includes(e.status)){delete this.#state.retry;this.#data=undefined;this.#items=[];this.element.replaceChildren(note('The review was not saved. Your text is kept below; copy it before reloading the current review.'),...(this.#state.draft?[Object.assign(element('textarea',{ariaLabel:'Unsaved review text',value:this.#state.draft.comment}),{readOnly:true})]:[]),this.#button('Reload current review',()=>{delete this.#state.draft;void this.refresh();}));}else{this.#render();}this.#error(e);}
  finally{this.#state.sending=false;if(token===this.#token)this.#busy=false;}
 }
}
