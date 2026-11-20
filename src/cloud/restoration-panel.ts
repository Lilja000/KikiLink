import {CloudError,type CloudClient} from './client';
import {ModerationGenerationError,moderationGenerationConflict,type ModerationAccess} from './moderation-generation';
import type {KeyValueStorage} from '../core/settings';
import {element} from './dom';
import {bindClockText} from '../core/time-format';
import {moderationDialog} from './moderation-dialog';
import {kikiIcon} from '../modules/link-chat/icons';
import {ModerationRecovery,checkedRestriction,checkedAppeal,type RestrictionType,type RestrictionReview,type AppealReview,type ModerationPending,type ModerationLock} from './moderation-recovery';

const effects:Record<RestrictionType,string>={
 community:'Lift the platform restriction. The community stays archived until its owner explicitly restores it.',
 creation:'Restore server access to the retained publication under its existing visibility and privacy rules. Local copies and drafts stay unchanged. Featured requires a new selection.',
 space:'Lift the platform restriction and restore access under the existing visibility and membership rules. An archived Space stays archived.',
 review:'Allow a new review under the usual access rules. The deleted rating and comment stay deleted.',
};
const names:Record<RestrictionType,string>={community:'Community',creation:'Workshop creation',review:'Workshop review',space:'Space'};
export class RestorationPanel {
 readonly element=element('section',{className:'kl-mod-page kl-restoration',ariaLabel:'Restrictions and appeals'});
 #active=false;#epoch=0;#busy=false;#error='';#status='';#mode:'restrictions'|'appeals'='restrictions';#type:RestrictionType='creation';#cursor=0;#next:number|null=null;
 #restrictions:RestrictionReview[]=[];#appeals:AppealReview[]=[];#restriction:RestrictionReview|undefined;#appeal:AppealReview|undefined;
 #access:ModerationAccess|undefined;#savedNote='';#pendingHistory:AppealReview[]|undefined;
 #message='';#action:'uphold'|'restore'='uphold';#confirm=false;#forget=false;#pending:ModerationPending|null=null;#recovery:ModerationRecovery|undefined;
 constructor(readonly client:CloudClient,readonly moderator:boolean,readonly options:{current():boolean;back():void;storage?:KeyValueStorage;lock?:ModerationLock}){}
 #current(epoch=this.#epoch):boolean{return this.#active&&epoch===this.#epoch&&this.options.current()&&this.element.isConnected;}
 destroy():void{++this.#epoch;this.#active=false;this.#pending=null;this.#recovery=undefined;this.#restrictions=[];this.#appeals=[];this.#restriction=undefined;this.#appeal=undefined;this.#message='';this.#access=undefined;this.#savedNote='';this.#pendingHistory=undefined;this.element.replaceChildren();}
 async show():Promise<void>{this.#active=true;try{if(!this.options.storage)throw new Error('Saved request storage is unavailable.');this.#recovery=new ModerationRecovery(this.client,this.options.storage,()=>this.#current(),this.options.lock);await this.refresh();}catch(e){this.#error=this.#errorText(e);this.#render();}}
 #errorText(e:unknown):string{
  if(moderationGenerationConflict(e))return 'The database was recovered. Refresh and review the current restriction or appeal before deciding. Any saved request is kept and will not be moved to the recovered database.';
  if(e instanceof CloudError){
   if(e.code==='appeal_already_submitted')return 'An appeal is already recorded for this restriction. Check Appeal history. Forget the saved request before starting another review.';
   if(e.status===409)return 'The restriction or appeal changed. Check its current state before making a new decision. A saved request is kept until you retry or explicitly forget it.';
   if([401,403,404].includes(e.status))return 'This review is no longer available to your account. A saved request is kept for recovery.';
   return 'The server result could not be confirmed. Retry the saved request to check it.';
  }
  return e instanceof Error?e.message:'Could not load this view. Refresh to try again.';
 }
 #prefix():string{return this.moderator?'/v1/moderation':'/v1/me';}
 #path(r:RestrictionReview):string{return `${this.#prefix()}/restrictions/${r.type}/${r.targetId}`;}
 #hold(note=this.#message):void{if(note)this.#savedNote=note;this.#reset();this.#restrictions=[];this.#appeals=[];this.#cursor=0;this.#next=null;this.#access=undefined;}
 #reset():void{this.#pendingHistory=undefined;this.#restriction=undefined;this.#appeal=undefined;this.#message='';this.#confirm=false;this.#forget=false;}
 async refresh():Promise<void>{
  if(!this.#current()||this.#busy||!this.#recovery)return;const epoch=++this.#epoch,valid=()=>this.#current(epoch);this.#busy=true;this.#error='';const note=this.#message,previous=this.#access;this.#reset();this.#restrictions=[];this.#appeals=[];this.#next=null;
  try{this.#pending=this.#recovery.read();this.#render();if(this.#pending)return;
   const access=await this.#recovery.gate(valid,this.moderator);
   if(previous&&previous.generation!==access.generation){this.#hold(note);this.#status='The database was recovered. Review the current entries again.';}this.#access=access;
   if(this.#type==='space'&&!this.#recovery.spaceReports){this.#type='creation';this.#cursor=0;}
   const path=this.#mode==='restrictions'?`${this.#prefix()}/restrictions?type=${this.#type}&limit=20&cursor=${this.#cursor}`:`${this.#prefix()}/appeals?limit=20&cursor=${this.#cursor}`;
   const p=await this.#recovery.review<{items:unknown[];nextCursor:number|null}>(access,path);if(!valid())return;
   if(!Array.isArray(p.items)||p.items.length>20||p.nextCursor!==null&&(!Number.isSafeInteger(p.nextCursor)||p.nextCursor<=0))throw new Error('The page is invalid. Refresh to try again.');
   if(this.#mode==='restrictions')this.#restrictions=p.items.map(checkedRestriction);else this.#appeals=p.items.map(v=>checkedAppeal(v,this.moderator));this.#next=p.nextCursor;
  }catch(e){if(valid()){if(moderationGenerationConflict(e))this.#hold(note);this.#error=this.#errorText(e);}}finally{if(valid()){this.#busy=false;this.#render();}}
 }
 async #open(r:RestrictionReview|AppealReview):Promise<void>{
  if(!this.#current()||this.#busy||this.#pending||!this.#recovery||!this.#access)return;const listed=this.#access;const epoch=++this.#epoch,valid=()=>this.#current(epoch);this.#busy=true;this.#error='';this.#status='';this.#reset();this.#render();
  try{const access=await this.#recovery.gate(valid,this.moderator);if(!listed.current())throw new ModerationGenerationError();this.#access=access;const a='id'in r;const fresh=await this.#recovery.review<unknown>(access,a?`${this.#prefix()}/appeals/${r.id}`:this.#path(r));if(!valid())return;
   if(a){const detail=checkedAppeal(fresh,this.moderator);if(detail.id!==r.id||detail.type!==r.type||detail.targetId!==r.targetId)throw new Error('The appeal no longer matches this review.');this.#appeal=detail;this.#action='uphold';}else {const detail=checkedRestriction(fresh);if(detail.type!==r.type||detail.targetId!==r.targetId)throw new Error('The restriction no longer matches this review.');this.#restriction=detail;}
  }catch(e){if(valid()){if(moderationGenerationConflict(e))this.#hold();this.#error=this.#errorText(e);}}finally{if(valid()){this.#busy=false;this.#render();}}
 }
 #button(label:string,run:()=>void):HTMLButtonElement{const b=element('button',{type:'button',className:'kl-text-button',text:label});b.disabled=this.#busy;b.addEventListener('click',()=>{if(this.#current()&&this.element.contains(b)&&!this.#busy)run();});return b;}
 #note(text:string):HTMLElement{return element('p',{className:'kl-mod-note',text});}
 #render():void{
  if(!this.#active)return;this.element.setAttribute('aria-busy',String(this.#busy));this.element.replaceChildren(element('header',{className:'kl-mod-header'},element('div',{},element('h1',{text:'Restrictions & appeals'}),this.#note(this.moderator?'Review restrictions and owner appeals.':'Request a review of restrictions on your own content.')),element('div',{className:'kl-mod-actions'},this.#button('Back',this.options.back),this.#button('Refresh',()=>void this.refresh()))));
  if(this.#error)this.element.append(element('p',{className:'kl-mod-notice',role:'alert',text:this.#error}));if(this.#status)this.element.append(element('p',{role:'status',text:this.#status}));
  if(this.#savedNote){const note=element('textarea',{ariaLabel:'Previous review message'});note.readOnly=true;note.value=this.#savedNote;this.element.append(this.#note('Your previous message is kept separately. Review the current entry before writing a new decision.'),note);}
  if(this.#pending){this.#renderPending();return;}if(this.#busy){this.element.append(this.#note('Checking access…'));return;}if(this.#error)return;
  const nav=element('nav',{className:'kl-mod-tabs',ariaLabel:'Restriction views'});for(const [mode,label]of [['restrictions','Current restrictions'],['appeals','Appeal history']]as const){const b=this.#button(label,()=>{this.#mode=mode;this.#cursor=0;this.#status='';void this.refresh();});b.setAttribute('aria-pressed',String(this.#mode===mode));nav.append(b);}this.element.append(nav);
  if(this.#restriction||this.#appeal){this.#renderDetail();return;}
  const rows=element('div',{className:'kl-mod-list'});
  if(this.#mode==='restrictions'){
   const select=element('select',{ariaLabel:'Restriction type'});for(const t of ['creation','community','review',...(this.#recovery?.spaceReports?['space' as const]:[])]as const){const o=element('option',{value:t,text:names[t]});o.selected=t===this.#type;select.append(o);}select.addEventListener('change',()=>{if(!this.#current()||!this.element.contains(select)||this.#busy)return;this.#type=select.value as RestrictionType;this.#cursor=0;void this.refresh();});this.element.append(element('div',{className:'kl-mod-toolbar'},select));
   for(const r of this.#restrictions)rows.append(element('article',{className:'kl-mod-row'},element('div',{className:'kl-mod-main'},
    element('div',{className:'kl-mod-status'},element('span',{className:'kl-mod-badge',text:'Restricted'}),element('small',{text:names[r.type]})),
    element('h3',{text:r.title}),bindClockText(element('time'),r.restrictedAt,'numeric-date-time')),
    element('div',{className:'kl-mod-row-actions'},this.#button('Review restriction',()=>void this.#open(r)))));
   if(!this.#restrictions.length)rows.append(element('section',{className:'kl-mod-empty'},kikiIcon('shield'),element('h2',{text:'No restrictions of this type.'})));
  }else{
   this.element.append(this.#note('Appeals are kept for 30 days from submission. One appeal per restriction during that period.'));
   for(const a of this.#appeals)rows.append(element('article',{className:'kl-mod-row'},element('div',{className:'kl-mod-main'},
    element('div',{className:'kl-mod-status'},element('span',{className:'kl-mod-badge',text:a.status==='upheld'?'Restriction upheld':a.status==='restored'?'Restriction lifted':'Awaiting review'})),
    element('h3',{text:names[a.type]}),element('p',{className:'kl-mod-copy',text:a.message}),bindClockText(element('time'),a.createdAt,'numeric-date-time')),
    element('div',{className:'kl-mod-row-actions'},this.#button('Review appeal',()=>void this.#open(a)))));
   if(!this.#appeals.length)rows.append(element('section',{className:'kl-mod-empty'},kikiIcon('shield'),element('h2',{text:'No appeals to show.'})));
  }
  this.element.append(rows);
  if(this.#next!==null||this.#cursor){const pages=element('div',{className:'kl-mod-actions'});if(this.#next!==null)pages.append(this.#button('Older entries',()=>{this.#cursor=this.#next!;void this.refresh();}));if(this.#cursor)pages.append(this.#button('First page',()=>{this.#cursor=0;void this.refresh();}));this.element.append(pages);}
 }
 #renderDetail():void{
  const r=this.#restriction,a=this.#appeal;
  const back=this.#button('Back to list',()=>void this.refresh());back.classList.add('kl-mod-back');back.prepend(kikiIcon('back'));
  const card=element('section',{className:'kl-mod-detail'});this.element.append(back,card);
  if(a){card.append(element('h2',{text:`${names[a.type]} appeal`}),element('p',{className:'kl-mod-copy',text:a.message}));if(a.response)card.append(element('h3',{text:'Decision message'}),element('p',{className:'kl-mod-copy',text:a.response}));
   if(a.status!=='open'||!a.currentRestriction||!this.moderator){card.append(this.#note(a.status!=='open'?'This appeal is closed.':!a.currentRestriction?'The restriction changed or was lifted. This appeal cannot change a newer restriction.':'Your appeal is waiting for a platform moderator.'));return;}
  }else if(r)card.append(element('h2',{text:r.title}),this.#note(effects[r.type]));
  if(this.moderator&&a){const select=element('select',{ariaLabel:'Appeal decision'});for(const [value,label]of [['uphold','Keep restriction'],['restore','Lift restriction']]as const){const o=element('option',{value,text:label});o.selected=value===this.#action;select.append(o);}select.disabled=this.#confirm;select.addEventListener('change',()=>{if(this.element.contains(select)&&!this.#busy&&!this.#confirm){this.#action=select.value as 'uphold'|'restore';this.#confirm=false;}});card.append(select,this.#note(effects[a.type]));}
  const label=this.moderator?'Message to the owner':'Appeal message',input=element('textarea',{ariaLabel:label,maxLength:1000,value:this.#message});input.disabled=this.#confirm;input.addEventListener('input',()=>{if(this.element.contains(input)&&!this.#busy&&!this.#confirm){this.#message=input.value;input.setCustomValidity('');}});
  card.append(element('label',{className:'kl-restoration-message'},element('span',{text:label}),input),this.#note(this.moderator?'The owner will see this message. Reporter identities and private decision notes are not included.':'Only platform moderators can read your appeal. Submitting does not lift the restriction.'),element('div',{className:'kl-mod-actions'},this.#button(this.moderator?'Review decision':'Review appeal',()=>{if(!this.#message.trim()){input.setCustomValidity('Add a message.');input.reportValidity();return;}this.#confirm=true;this.#render();})));
  if(this.#confirm){const body=element('div',{className:'kl-mod-dialog-body'},element('h3',{text:this.moderator?(r||this.#action==='restore'?'Lift restriction':'Keep restriction'):'Submit appeal'}),element('p',{className:'kl-mod-copy',text:this.#message.trim()}),this.#note(this.moderator?(r||this.#action==='restore'?effects[(r??a)!.type]:'The current restriction stays in place. This closes the appeal.'):'Submit this message for review?'));
   const close=()=>{
    const epoch=this.#epoch;this.#confirm=false;this.#render();
    queueMicrotask(()=>{if(this.#current(epoch)&&!this.#confirm)this.element.querySelector<HTMLTextAreaElement>('.kl-restoration-message textarea')?.focus({preventScroll:true});});
   };this.element.append(moderationDialog('Confirm',body,element('footer',{className:'kl-mod-actions kl-mod-dialog-footer'},this.#button('Confirm',()=>void this.#submit()),this.#button('Keep editing',close)),close));}
 }
 #renderPending():void{const p=this.#pending!,action=p.path.endsWith('/appeal')?'Submit appeal':p.body.action==='uphold'?'Keep restriction':'Lift restriction';this.element.append(element('h2',{text:'Saved request'}),element('h3',{text:action}),element('p',{className:'kl-mod-copy',text:p.body.message}),this.#note(p.confirmed?'The server confirmed this request. Finish recovery to clear the local copy.':'The result is not confirmed. Retry sends the exact saved request. Reload and reconnect never send it automatically.'),this.#button(p.confirmed?'Finish recovery':'Retry saved request',()=>void this.#send()));
  if(!p.confirmed)this.element.append(this.#button('View current history',()=>void this.#inspectPending()),this.#button('Forget saved request',()=>{this.#forget=true;this.#render();}));
  if(this.#pendingHistory){this.element.append(element('h3',{text:'Current appeal history'}),this.#note('Latest 20 entries from the current database. The saved request above stays unchanged. Matching numbers do not prove that an older request belongs to this database.'));for(const a of this.#pendingHistory)this.element.append(element('article',{className:'kl-mod-row'},element('p',{text:a.message}),this.#note(a.status),...a.response?[element('p',{text:a.response})]:[]));}
  if(this.#forget){const close=()=>{this.#forget=false;this.#render();};this.element.append(moderationDialog('Forget saved request?',element('div',{className:'kl-mod-dialog-body'},this.#note('This clears only this device’s saved request. A decision already accepted by the server is not cancelled. Check Appeal history after refreshing.')),element('footer',{className:'kl-mod-actions kl-mod-dialog-footer'},this.#button('Confirm forget',()=>void this.#send(true)),this.#button('Cancel',close)),close));}
 }
 async #inspectPending():Promise<void>{
  if(!this.#current()||this.#busy||!this.#pending||!this.#recovery)return;
  const epoch=this.#epoch,valid=()=>this.#current(epoch);this.#busy=true;this.#error='';this.#pendingHistory=undefined;this.#render();
  try{const access=await this.#recovery.gate(valid,this.moderator),page=await this.#recovery.review<{items:unknown[]}>(access,this.#prefix()+'/appeals?limit=20&cursor=0');if(!valid())return;if(!Array.isArray(page.items)||page.items.length>20)throw new Error('The current history is invalid.');this.#pendingHistory=page.items.map(a=>checkedAppeal(a,this.moderator));}
  catch(e){if(valid())this.#error=this.#errorText(e);}finally{if(valid()){this.#busy=false;this.#render();}}
 }
 async #submit():Promise<void>{if(!this.#current()||this.#busy||!this.#confirm||!this.#recovery||!this.#access?.current())return;const r=this.#restriction,a=this.#appeal;if(!r&&!a)return;
  const body={operationId:crypto.randomUUID(),revision:(r??a)!.revision,message:this.#message.trim(),...(r?{restrictedAt:r.restrictedAt}:{action:this.#action})};
  const pending:ModerationPending={...(this.#access.generation?{format:2,recoveryGeneration:this.#access.generation}as const:{format:1}as const),createdAt:Date.now(),path:r?this.#path(r)+(this.moderator?'/restore':'/appeal'):`/v1/moderation/appeals/${a!.id}/decision`,body,confirmed:false};
  const epoch=this.#epoch,valid=()=>this.#current(epoch);this.#busy=true;this.#error='';this.#render();
  try{await this.#recovery.prepare(pending,valid);if(!valid())return;this.#pending=this.#recovery.read();this.#reset();}catch(e){if(valid()){this.#error=this.#errorText(e);try{this.#pending=this.#recovery.read();}catch{}}}finally{if(valid()){this.#busy=false;this.#render();}}
  if(valid()&&this.#pending&&!this.#error)await this.#send();
 }
 async #send(forget=false):Promise<void>{if(!this.#current()||this.#busy||!this.#pending||!this.#recovery)return;const epoch=this.#epoch,valid=()=>this.#current(epoch);this.#busy=true;this.#error='';this.#render();let done=false;
  try{if(forget)await this.#recovery.forget(this.#pending,valid);else await this.#recovery.run(this.#pending,valid);if(!valid())return;this.#pending=null;this.#status=forget?'Saved request forgotten. Refresh the history to check the server result.':'Request confirmed.';this.#reset();done=true;}
  catch(e){if(valid()){this.#error=this.#errorText(e);try{this.#pending=this.#recovery.read();}catch{}}}finally{if(valid()){this.#busy=false;this.#render();}}
  if(done&&valid()){this.#mode='appeals';this.#cursor=0;await this.refresh();}
 }
}
