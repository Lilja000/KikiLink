import {CloudError,type CloudClient} from '../../cloud/client';
import {element} from '../../cloud/dom';
import {moderationDialog} from '../../cloud/moderation-dialog';
import {ModerationGeneration,ModerationGenerationError,moderationGenerationConflict} from '../../cloud/moderation-generation';

export interface CommunityManagementAction {
  title:string; description:string|HTMLElement; communityId:string; channelId?:string|undefined;
  path:string; revision:number; data:Record<string,unknown>;
  generation?:string|undefined; reasonRequired?:boolean; membership?:boolean; memberRequired?:boolean;
  authorized?:()=>boolean;
  ready?:()=>boolean;
  returnAction?:string;
  reviewBody?:()=>HTMLElement;
  presentation?:'leave-community'|'manager-review';
  submitLabel?:string;
  backLabel?:string;
  danger?:boolean;
  roles?:ReadonlyArray<{value:string;label:string}>;
}
interface Draft {action:CommunityManagementAction;reason:string;member:string;pending?:Record<string,unknown>;held:boolean;status:string;}

/** One volatile, account-bound action. Closing a view cannot retarget an uncertain write. */
export class CommunityManagementDialog {
  readonly #owner:number;readonly #origin:string;
  readonly #recovery:ModerationGeneration;
  readonly #membershipRecovery:ModerationGeneration;
  #draft:Draft|undefined;#dialog:HTMLDialogElement|undefined;#busy=false;#disposed=false;#epoch=0;
  constructor(readonly client:CloudClient,readonly host:HTMLElement,readonly options:{current():boolean;changed():void;applied(action:CommunityManagementAction):void;focusAfterClose?(action:CommunityManagementAction,applied:boolean):void}) {
    this.#owner=client.memberNumber;this.#origin=client.origin;
    this.#recovery=new ModerationGeneration(client,'communityManagementRecoveryGeneration');
    this.#membershipRecovery=new ModerationGeneration(client,'communityMembershipRecoveryGeneration');
  }
  get busy():boolean{return this.#busy;}
  get visible():boolean{return !!this.#dialog?.open;}
  get unfinished():boolean{return !!this.#draft&&this.#identity();}
  #identity():boolean{return !this.#disposed&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
  #current():boolean{return this.#identity()&&this.options.current()&&!!this.#dialog?.isConnected&&this.#dialog.open;}
  open(action?:CommunityManagementAction):void {
    if(!this.#identity()||!this.options.current())return;
    // An existing draft or uncertain request must be reviewed or explicitly discarded first.
    if(!this.#draft&&action&&action.authorized?.()!==false)this.#draft={action:{...action,data:structuredClone(action.data)},reason:'',member:'',held:false,status:''};
    if(!this.#draft)return;
    this.#render();
  }
  hide():void{++this.#epoch;this.#removeDialog();}
  invalidateUnauthorized():void {
    const draft=this.#draft;
    if(!draft||this.#busy||this.#authorize(draft))return;
    if(!draft.pending)this.#draft=undefined;
    this.hide();this.options.changed();
  }
  destroy():void{this.hide();this.#disposed=true;this.#draft=undefined;}
  #removeDialog():void{const d=this.#dialog;this.#dialog=undefined;if(d?.open)d.close();d?.remove();}
  #restoreFocus(action:CommunityManagementAction,applied:boolean):void {
    if(this.#identity()&&this.options.current()&&!this.#dialog)this.options.focusAfterClose?.(action,applied);
  }
  #authorize(draft:Draft):boolean {
    if(draft.action.authorized?.()!==false)return true;
    draft.held=true;
    draft.status='Your access or the community changed. Review the current community before starting a new action.';
    return false;
  }
  #ready(draft:Draft):boolean {
    if(draft.action.ready?.()!==false)return true;
    draft.status='Wait for the latest community information to load, then try again.';
    return false;
  }
  #render():void {
    const draft=this.#draft;if(!draft||!this.#identity()||!this.options.current())return;
    this.#removeDialog();
    const leave=draft.action.presentation==='leave-community';
    const body=element('div',{className:'kl-mod-dialog-body'}),footer=element('footer',{className:'kl-mod-dialog-footer'}),discard=element('section',{hidden:true});
    const button=(label:string,action:string,run:()=>void)=>{const b=element('button',{type:'button',className:'kl-text-button',text:label});b.dataset.communityAction=action;b.disabled=this.#busy;b.addEventListener('click',()=>{if(b.isConnected&&this.#current()&&!this.#busy)run();});return b;};
    const dismiss=()=>{this.hide();this.options.changed();this.#restoreFocus(draft.action,false);};
    const clear=()=>{if(!this.#current()||this.#busy)return;this.#draft=undefined;dismiss();};
    const cancel=()=>{if(!this.#current()||this.#busy)return;if(!draft.pending&&!draft.reason&&!draft.member){clear();return;}
      discard.replaceChildren(element('p',{text:draft.pending?'This action may already have completed. Discard this local attempt without retrying?':'Discard this action draft?'}),button('Keep editing','keep-management',()=>{discard.hidden=true;}),button('Close and keep','keep-management-later',dismiss),button('Discard action','discard-management',clear));discard.hidden=false;};
    const description=draft.action.description;
    body.append(draft.action.reviewBody?.()??(typeof description==='string'?element('p',{text:description}):description));
    if(draft.action.roles){
      const choices=draft.action.roles;
      const select=element('select',{ariaLabel:'Community role'});
      for(const choice of choices)select.append(element('option',{value:choice.value,text:choice.label}));
      select.value=String(draft.action.data.role);
      select.disabled=this.#busy||!!draft.pending||draft.held;
      select.addEventListener('change',()=>{
        if(this.#current()&&select.isConnected&&!this.#busy&&!draft.pending&&!draft.held&&choices.some(role=>role.value===select.value))draft.action.data.role=select.value;
      });
      body.append(element('label',{className:'kl-cm-review-role'},element('span',{text:'Community role'}),select),
        element('p',{className:'kl-cm-manager-note',text:'Permission changes take effect immediately in community management, moderation and restricted channels.'}));
    }
    if(draft.action.memberRequired){
      const input=element('input',{type:'text',ariaLabel:'Member Number'});input.dataset.communityField='memberNumber';input.inputMode='numeric';input.autofocus=true;input.maxLength=16;input.value=draft.member;input.readOnly=!!draft.pending;input.disabled=this.#busy;
      input.addEventListener('input',()=>{if(input.isConnected&&this.#current()&&this.#draft===draft&&!draft.pending)draft.member=input.value;});
      body.append(element('label',{},element('span',{text:'Member Number'}),input));
    }
    if(draft.action.reasonRequired){
      const input=element('textarea',{ariaLabel:'Reason'});input.value=draft.reason;input.maxLength=1000;input.placeholder='Reason (at least 5 characters)';input.readOnly=!!draft.pending;input.disabled=this.#busy;
      input.addEventListener('input',()=>{if(this.#draft===draft&&!draft.pending)draft.reason=input.value;});
      body.append(element('label',{},element('span',{text:'Reason'}),input));
    }
    const status=element('p',{className:'kl-mod-note',text:draft.status});status.setAttribute('role','status');body.append(status,discard);
    const submit=button(this.#busy?'Sending…':draft.pending?'Retry action':draft.action.submitLabel??(leave?'Leave community':draft.action.memberRequired?'Send invitation':'Confirm'),draft.action.memberRequired?'save':draft.action.reasonRequired?'reason-confirm':'confirm',()=>void this.#submit(draft));submit.disabled=this.#busy||draft.held;
    if(leave||draft.action.danger)submit.classList.add('kl-text-button--danger');
    else if(draft.action.presentation==='manager-review')submit.classList.add('kl-text-button--primary');
    footer.append(button(draft.action.backLabel??(leave?'Back':'Cancel'),draft.action.memberRequired?'cancel-editor':draft.action.reasonRequired?'reason-cancel':'cancel-confirm',cancel),submit);
    const dialog=moderationDialog(draft.action.title,body,footer,cancel);dialog.classList.add('kl-community-management-dialog');this.#dialog=dialog;dialog.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')!.disabled=this.#busy;
    if(leave||draft.action.presentation==='manager-review')dialog.classList.add('kl-cm-leave-dialog');
    if(draft.action.presentation==='manager-review')dialog.classList.add('kl-cm-manager-review');
    this.host.append(dialog);dialog.showModal();this.options.changed();
  }
  async #submit(draft:Draft):Promise<void> {
    if(!this.#current()||this.#busy||draft!==this.#draft||draft.held)return;
    if(!this.#authorize(draft)||!this.#ready(draft)){this.#render();return;}
    if(draft.action.reasonRequired&&!draft.pending&&draft.reason.trim().length<5){draft.status='Enter at least 5 characters.';this.#render();return;}
    if(draft.action.memberRequired&&!draft.pending&&(!Number.isSafeInteger(Number(draft.member))||Number(draft.member)<=0)){draft.status='Enter a valid Member Number.';this.#render();return;}
    const retrying=!!draft.pending;
    draft.pending??={...draft.action.data,...(draft.action.memberRequired?{memberNumber:Number(draft.member)}:{}),revision:draft.action.revision,operationId:crypto.randomUUID(),...(draft.action.reasonRequired?{reason:draft.reason.trim()}:{})};
    const epoch=this.#epoch,current=()=>this.#current()&&this.#draft===draft&&epoch===this.#epoch;
    this.#busy=true;draft.status='';this.#render();
    let applied=false;
    try {
      if(!this.client.connected)throw new CloudError('cloud_temporarily_unavailable');
      const me=await this.client.request<{memberNumber?:number;directRecovery?:{generation?:unknown;restored?:unknown}}>('GET','/v1/me');
      if(!current())return;
      if(!this.#authorize(draft)||!this.#ready(draft)){if(!retrying)delete draft.pending;return;}
      if(me.memberNumber!==undefined&&me.memberNumber!==this.#owner)throw new ModerationGenerationError();
      const recovery=draft.action.membership?this.#membershipRecovery:this.#recovery;recovery.accept(me);const access=recovery.capture(),generation=draft.action.generation;
      if(generation&&me.directRecovery?.generation!==generation||access.generation&&access.generation!==generation||!access.generation&&me.directRecovery?.restored===true)throw new ModerationGenerationError();
      const receipt=await access.request<{communityId:string;channelId?:string;revision?:number}>('POST',draft.action.path,draft.pending);
      if(!current())return;
      if(receipt?.communityId!==draft.action.communityId||draft.action.channelId!==undefined&&receipt.channelId!==draft.action.channelId)throw new ModerationGenerationError();
      this.#draft=undefined;this.hide();applied=true;this.options.applied(draft.action);
    }catch(error){
      if(!this.#identity()||this.#draft!==draft)return;
      if(moderationGenerationConflict(error)&&(this.client.connected||error instanceof CloudError))draft.held=true;
      draft.status=draft.held?'This action belongs to an earlier or unverified community state. Its details are kept here. Discard this local attempt and refresh the community before starting a new action.':error instanceof CloudError&&error.code==='revision_conflict'?'This community changed. The original action and reason are kept here. Review the current community before starting a new action.':'The action could not be confirmed. Its original details and reason are kept; retry when connected.';
    }finally{
      this.#busy=false;
      if(current())this.#render();
      else if(!this.#disposed){this.options.changed();if(applied)this.#restoreFocus(draft.action,true);}
    }
  }
}
