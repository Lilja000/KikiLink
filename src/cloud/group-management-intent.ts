import {CloudError,type CloudClient} from './client';
import {ModerationGeneration,ModerationGenerationError,moderationGenerationConflict} from './moderation-generation';
import {element} from './dom';
import type {SocialUI} from './social-ui';

export interface GroupManagementSource {generation?:string|undefined;required:boolean;}
export interface GroupManagementTarget {
  action:'settings'|'pin'|'invite'|'accept'|'decline'|'remove'|'role'|'delete';
  groupId:string;memberNumber?:number;membershipVersion?:number;invitedAt?:number;
  label:string;
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function groupManagementSource(metadata:unknown):GroupManagementSource {
  if(!object(metadata))throw new ModerationGenerationError();
  const flag=object(metadata.features)?metadata.features.groupManagementRecoveryGeneration:undefined,recovery=metadata.directRecovery;
  if(flag!==undefined&&typeof flag!=='boolean')throw new ModerationGenerationError();
  if(recovery!==undefined&&(!object(recovery)||typeof recovery.generation!=='string'||!/^[a-f0-9]{32}$/u.test(recovery.generation)||typeof recovery.restored!=='boolean'))throw new ModerationGenerationError();
  if(flag===true&&!object(recovery))throw new ModerationGenerationError();
  return {generation:object(recovery)?recovery.generation as string:undefined,required:flag===true};
}

/** Original descriptor, membership/invitation and form values survive ambiguous
 * outcomes. A receipt retry never becomes a new command or adopts a new branch. */
export class GroupManagementIntent {
  readonly #owner:number;readonly #origin:string;readonly #guard:ModerationGeneration;
  readonly target:Readonly<GroupManagementTarget>;readonly source:Readonly<GroupManagementSource>;
  #pending:Record<string,unknown>|undefined;#busy=false;#held=false;notice='';
  constructor(readonly client:CloudClient,target:GroupManagementTarget,source:GroupManagementSource){
    this.#owner=client.memberNumber;this.#origin=client.origin;this.target=Object.freeze({...target});this.source=Object.freeze({...source});
    this.#guard=new ModerationGeneration(client,'groupManagementRecoveryGeneration');
  }
  get pending():Readonly<Record<string,unknown>>|undefined{return this.#pending&&structuredClone(this.#pending);}
  get busy():boolean{return this.#busy;}
  get held():boolean{return this.#held;}
  identity():boolean{return this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
  hold():void{this.#held=true;this.notice='This group action needs review. The group or invitation may have changed. Its original details are kept; discard it before starting a new action.';}
  observe(source:GroupManagementSource):void{if(source.generation!==this.source.generation||source.required!==this.source.required)this.hold();}
  async send(data:Record<string,unknown>,current:()=>boolean):Promise<{value:unknown}|undefined>{
    if(!this.identity()||!current()||this.held||this.busy)return;
    const t=this.target,invitation=t.action==='accept'||t.action==='decline';
    this.#pending??={...structuredClone(data),...t.action==='invite'&&typeof data.memberNumber==='string'?{memberNumber:Number(data.memberNumber)}:{},...this.source.required?{operationId:crypto.randomUUID(),...invitation?{invitedAt:t.invitedAt}:{membershipVersion:t.membershipVersion}}:{}};
    this.#busy=true;
    try{
      if(!this.client.connected)throw new CloudError('cloud_temporarily_unavailable');
      const me=await this.client.request<unknown>('GET','/v1/me');
      if(!current())return;
      if(!this.identity()||!object(me)||me.memberNumber!==undefined&&me.memberNumber!==this.#owner)throw new ModerationGenerationError();
      this.observe(groupManagementSource(me));this.#guard.accept(me);const access=this.#guard.capture();
      if(this.held||this.source.required&&!access.generation||access.generation!==undefined&&access.generation!==this.source.generation||!access.generation&&object(me.directRecovery)&&me.directRecovery.restored===true)throw new ModerationGenerationError();
      const suffix=t.action==='settings'||t.action==='delete'?'':t.action==='pin'?'/pin':t.action==='invite'?'/invitations':t.action==='accept'?'/accept':t.action==='decline'?'/invitation':`/members/${t.memberNumber}${t.action==='role'?'/role':''}`;
      const method=t.action==='settings'?'PATCH':t.action==='delete'||t.action==='decline'||t.action==='remove'?'DELETE':t.action==='pin'||t.action==='role'?'PUT':'POST';
      const value=await access.request<unknown>(method,`/v1/groups/${encodeURIComponent(t.groupId)}${suffix}`,method==='DELETE'&&!access.generation?undefined:structuredClone(this.#pending));
      if(!current()){this.notice='The result arrived after leaving this view. The original action is kept for an explicit retry.';return;}
      if(this.held||!this.identity())throw new ModerationGenerationError();
      if(access.generation&&(!object(value)||value.applied!==true||value.groupId!==t.groupId||value.action!==t.action||value.operationId!==this.#pending.operationId||t.memberNumber!==undefined&&value.memberNumber!==t.memberNumber||t.action==='pin'&&value.pinRevision!==Number(this.#pending.revision)+1||t.action==='settings'&&value.revision!==Number(this.#pending.revision)+1))throw new ModerationGenerationError();
      this.notice='';return {value};
    }catch(error){
      if(this.identity()&&(moderationGenerationConflict(error)||error instanceof CloudError&&error.status>=400&&error.status<500&&error.status!==429))this.hold();
      else this.notice='Could not confirm the result. The original action is kept. Retry it when connected or explicitly discard it.';
      throw error;
    }finally{this.#busy=false;}
  }
}

export interface GroupManagementDraft {readonly key:string;readonly intent:GroupManagementIntent;data:Record<string,unknown>;dirty:boolean;discarded:boolean;preparing:boolean;}
/** Volatile, account-owned review queue, shared by group settings, pins and
 * invitations. A fresh descriptor cannot overwrite a retained dirty editor. */
export class GroupManagementActions {
  readonly #entries=new Map<string,GroupManagementDraft>();
  readonly #views=new Map<string,{root:HTMLElement;ui:SocialUI;current():boolean;applied(confirmed?:GroupManagementDraft):Promise<void>;filter(entry:GroupManagementDraft):boolean}>();
  constructor(readonly client:CloudClient){}
  capture(key:string,target:GroupManagementTarget,source:GroupManagementSource,data:Record<string,unknown>={}):GroupManagementDraft{
    const existing=this.#entries.get(key);
    if(existing){existing.intent.observe(source);return existing;}
    return {key,intent:new GroupManagementIntent(this.client,target,source),data:structuredClone(data),dirty:false,discarded:false,preparing:false};
  }
  available(entry:GroupManagementDraft):boolean{return !entry.discarded&&entry.intent.identity()&&(!this.#entries.has(entry.key)||this.#entries.get(entry.key)===entry);}
  edit(entry:GroupManagementDraft,data:Record<string,unknown>):boolean{
    if(!this.available(entry)||entry.intent.pending||entry.intent.held)return false;
    entry.data=structuredClone(data);entry.dirty=true;this.#entries.set(entry.key,entry);this.#render();return true;
  }
  prepare(entry:GroupManagementDraft,preparing:boolean):void{if(!this.available(entry))return;entry.preparing=preparing;if(preparing){entry.dirty=true;this.#entries.set(entry.key,entry);}this.#render();}
  attachment(entry:GroupManagementDraft,id:string):void{if(!this.available(entry)||entry.intent.pending)return;entry.data={...entry.data,avatarId:id};entry.preparing=false;this.#render();}
  observe(source:GroupManagementSource):void{for(const entry of this.#entries.values())entry.intent.observe(source);this.#render();}
  clear():void{for(const entry of this.#entries.values())entry.discarded=true;this.#entries.clear();this.#render();}
  async perform(entry:GroupManagementDraft,current:()=>boolean):Promise<boolean>{
    if(!this.available(entry)||!current()||entry.preparing)return false;
    entry.dirty=true;this.#entries.set(entry.key,entry);
    const task=entry.intent.send(entry.data,()=>this.available(entry)&&current());this.#render();
    try{const result=await task;if(!result)return false;this.#entries.delete(entry.key);entry.discarded=true;return true;}
    finally{this.#render();}
  }
  surface(slot:string,ui:SocialUI,current:()=>boolean,applied:(confirmed?:GroupManagementDraft)=>Promise<void>,filter:(entry:GroupManagementDraft)=>boolean=()=>true):HTMLElement{
    const previous=this.#views.get(slot);
    const root=previous?.root??element('section',{className:'kl-group-management-pending',ariaLabel:'Unfinished group changes'});
    if(previous&&previous.current()!==current())delete root.dataset.signature;
    this.#views.set(slot,{root,ui,current,applied,filter});this.#render();return root;
  }
  #render():void{
    for(const view of this.#views.values()){
      const {root,ui,current,applied}=view;
      const entries=[...this.#entries.values()].filter(e=>e.intent.identity()&&view.filter(e));
      const signature=JSON.stringify([current(),entries.map(e=>[e.key,e.data,e.intent.pending,e.preparing,e.intent.busy,e.intent.held,e.intent.notice])]);
      if(root.dataset.signature===signature)continue;
      const open=new Map([...root.querySelectorAll<HTMLDetailsElement>('details[data-group-change]')].map(d=>[d.dataset.groupChange,d.open]));
      root.dataset.signature=signature;root.replaceChildren();root.hidden=!entries.length;
      if(!entries.length)continue;
      root.append(element('h4',{text:'Unfinished group changes'}));
      for(const entry of entries){
        const {intent}=entry,t=intent.target,details=element('details',{},element('summary',{text:t.label}));details.dataset.groupChange=entry.key;details.open=open.get(entry.key)??true;
        const values=Object.entries(intent.pending??entry.data).filter(([k])=>!['operationId','membershipVersion','revision','invitedAt'].includes(k));
        details.append(element('p',{text:intent.notice||'These changes are kept until you apply or discard them.'}),element('small',{text:`Group: ${t.groupId}${t.memberNumber?` · Member: #${t.memberNumber}`:''}`}));
        if(values.length){const original=element('textarea',{ariaLabel:'Original group changes'});original.readOnly=true;original.rows=Math.min(5,values.length+1);original.value=values.map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v===null?'Remove':String(v)}`).join('\n');details.append(original);}
        const controls=element('div',{className:'kl-setting-tool-buttons'});
        if(!intent.held&&!(t.action==='settings'&&t.label.endsWith('change avatar')&&!('avatarId' in entry.data))){const retry=ui.button(intent.pending?'Retry original group change':'Apply original group changes',async()=>{if(retry.isConnected&&await this.perform(entry,current))await applied(entry);},'refresh');retry.disabled=intent.busy||entry.preparing||!current();controls.append(retry);}
        const discard=ui.button('Discard group change',()=>{if(!discard.isConnected||!current()||intent.busy||entry.preparing||!this.available(entry))return;ui.confirm(details,'Discard these saved details? This does not undo a change that may already have reached the server.',async()=>{if(!details.isConnected||!current()||intent.busy||entry.preparing||!this.available(entry))return;entry.discarded=true;this.#entries.delete(entry.key);this.#render();await applied();},'Discard');},'close');
        discard.disabled=intent.busy||entry.preparing||!current();controls.append(discard);details.append(controls);root.append(details);
      }
    }
  }
}
