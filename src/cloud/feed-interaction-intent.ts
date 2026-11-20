import {CloudError,type CloudClient} from './client';
import {element} from './dom';
import type {SocialUI} from './social-ui';
export interface FeedInteractionSource {required:boolean;generation?:string|undefined;}
export interface FeedInteractionTarget {action:'bookmark'|'hide'|'watch'|'vote'|'closePoll'|'pin'|'reaction';type:'post'|'comment';id:number;label:string;choiceLabel?:string;}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export class FeedInteractionError extends Error {
  constructor(){super('This Feed action needs review. Its original choice is kept; discard it before starting a new action.');}
}
export function feedInteractionSource(metadata:unknown):FeedInteractionSource {
  if(!object(metadata))throw new FeedInteractionError();
  const flag=object(metadata.features)?metadata.features.feedMutationRecoveryGeneration:undefined,r=metadata.directRecovery;
  if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||typeof r.generation!=='string'||!/^[a-f0-9]{32}$/u.test(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new FeedInteractionError();
  return {required:flag===true,generation:object(r)?r.generation as string:undefined};
}
/** A choice is frozen before metadata preflight. A known receipt is never sent
 * again just because the fresh, separately authorized read failed. */
export class FeedInteractionIntent {
  readonly #owner:number;readonly #origin:string;
  readonly target:Readonly<FeedInteractionTarget>;readonly source:Readonly<FeedInteractionSource>;
  readonly #data:Record<string,unknown>;readonly #operationId:string;
  #busy=false;#held=false;#acknowledged=false;notice='';
  constructor(readonly client:CloudClient,target:FeedInteractionTarget,source:FeedInteractionSource,data:Record<string,unknown>){
    this.#owner=client.memberNumber;this.#origin=client.origin;this.target=Object.freeze({...target});this.source=Object.freeze({...source});
    this.#data=structuredClone(data);this.#operationId=crypto.randomUUID();
  }
  get data():Record<string,unknown>{return structuredClone(this.#data);}
  get busy():boolean{return this.#busy;}
  get held():boolean{return this.#held;}
  get acknowledged():boolean{return this.#acknowledged;}
  identity():boolean{return this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
  hold():void{this.#held=true;this.notice=new FeedInteractionError().message;}
  observe(source:FeedInteractionSource):void{if(source.required!==this.source.required||source.generation!==this.source.generation)this.hold();}
  async send(current:()=>boolean):Promise<{value:unknown}|undefined>{
    if(this.busy||this.held||!current()||!this.identity())return;
    this.#busy=true;
    const check=()=>{if(!this.identity()||this.held)throw new FeedInteractionError();if(!current())throw new Error("The result arrived after leaving this view. Its original choice is kept.");};
    try{
      if(!this.client.connected)throw new CloudError('cloud_temporarily_unavailable');
      const metadata=await this.client.request<unknown>('GET','/v1/me');check();
      if(!object(metadata)||metadata.memberNumber!==undefined&&metadata.memberNumber!==this.#owner)throw new FeedInteractionError();
      this.observe(feedInteractionSource(metadata));check();
      if(!this.source.required&&object(metadata.directRecovery)&&metadata.directRecovery.restored===true)throw new FeedInteractionError();
      const t=this.target,path=t.action==='reaction'?`/v1/reactions/${t.type}/${t.id}`:`/v1/feed/${t.id}/${t.action==='vote'?'poll/vote':t.action==='closePoll'?'poll/close':t.action}`;
      if(!this.#acknowledged){
        const value=await this.client.request<unknown>('PUT',path,{...this.data,...this.source.required?{operationId:this.#operationId,recoveryGeneration:this.source.generation}:{}});check();
        if(!this.source.required){this.notice='';return {value};}
        if(!object(value)||value.applied!==true||value.action!==t.action||value.targetType!==t.type||value.targetId!==t.id||value.operationId!==this.#operationId||value.recoveryGeneration!==this.source.generation||Object.keys(value).sort().join(',')!=='action,applied,operationId,recoveryGeneration,targetId,targetType')throw new FeedInteractionError();
        this.#acknowledged=true;
      }
      const value=await this.client.request<unknown>('GET',`/v1/${t.type==='post'?'feed':'comments'}/${t.id}?recoveryGeneration=${this.source.generation}`);check();
      if(!object(value)||value.id!==t.id||value.recoveryGeneration!==this.source.generation)throw new FeedInteractionError();
      if(t.action==='reaction'&&(!object(value.reactions)||!Array.isArray(value.reactions.counts)||value.reactions.mine!==null&&typeof value.reactions.mine!=='string'))throw new FeedInteractionError();
      this.notice='';return {value:t.action==='reaction'?value.reactions:value};
    }catch(error){
      if(this.identity()&&(error instanceof FeedInteractionError||error instanceof CloudError&&error.status>=400&&error.status<500&&error.status!==429))this.hold();
      else this.notice=this.#acknowledged?'The change was confirmed, but its current result could not be read. Retry reads the result without repeating the change.':'Could not confirm the result. The original choice is kept for an exact retry.';
      throw error;
    }finally{this.#busy=false;}
  }
}
interface Entry {key:string;intent:FeedInteractionIntent;discarded:boolean;}
/** Volatile, account-owned actions survive navigation but not account teardown. */
export class FeedInteractionActions {
  readonly #entries=new Map<string,Entry>();
  #view:{root:HTMLElement;ui:SocialUI;current():boolean;refreshed():Promise<void>}|undefined;
  constructor(readonly client:CloudClient){}
  observe(source:FeedInteractionSource):void{for(const entry of this.#entries.values())entry.intent.observe(source);this.#render();}
  hold():void{for(const entry of this.#entries.values())entry.intent.hold();this.#render();}
  clear():void{for(const entry of this.#entries.values())entry.discarded=true;this.#entries.clear();this.#render();}
  async perform<T>(target:FeedInteractionTarget,source:FeedInteractionSource,data:Record<string,unknown>,current:()=>boolean):Promise<T|undefined>{
    if(!current())return;
    const key=`${target.action}:${target.type}:${target.id}`;let entry=this.#entries.get(key);
    if(entry){entry.intent.observe(source);if(JSON.stringify(entry.intent.data)!==JSON.stringify(data))throw new FeedInteractionError();}
    else {entry={key,intent:new FeedInteractionIntent(this.client,target,source,data),discarded:false};this.#entries.set(key,entry);}
    return this.#send<T>(entry,current);
  }
  async #send<T>(entry:Entry,current:()=>boolean):Promise<T|undefined>{
    const valid=()=>!entry.discarded&&this.#entries.get(entry.key)===entry&&current();
    const task=entry.intent.send(valid);this.#render();
    try{const result=await task;if(!result||!valid())return;this.#entries.delete(entry.key);entry.discarded=true;return result.value as T;}
    finally{this.#render();}
  }
  surface(ui:SocialUI,current:()=>boolean,refreshed:()=>Promise<void>):HTMLElement{
    const root=this.#view?.root??element('section',{className:'kl-feed-interactions-pending kl-cloud-card',ariaLabel:'Unfinished Feed actions'});
    this.#view={root,ui,current,refreshed};this.#render();return root;
  }
  #render():void{
    if(!this.#view)return;const {root,ui,current,refreshed}=this.#view;
    const entries=[...this.#entries.values()].filter(e=>e.intent.identity());
    const signature=JSON.stringify([current(),entries.map(e=>[e.key,e.intent.data,e.intent.busy,e.intent.held,e.intent.acknowledged,e.intent.notice])]);
    if(root.dataset.signature===signature)return;
    root.dataset.signature=signature;root.replaceChildren();root.hidden=!entries.length;
    if(!entries.length)return;root.append(element('h4',{text:'Unfinished Feed actions'}));
    for(const entry of entries){const intent=entry.intent,t=intent.target;
      const item=element('div',{},element('strong',{text:t.label}),element('p',{className:'kl-cloud-note',text:intent.notice||'Your original choice is kept until the result is confirmed.'}));
      const data=element('textarea',{ariaLabel:'Original Feed choice'});data.readOnly=true;data.rows=2;const labels:Record<string,string>={bookmarked:'Save post',hidden:'Hide post',watching:'Follow comments',pinned:'Pin post',optionIds:'Answer numbers',reaction:'Reaction'};data.value=`${t.type} #${t.id}\n`+(t.choiceLabel??Object.entries(intent.data).map(([k,v])=>`${labels[k]??'Choice'}: ${v===null?'Remove':v===true?'Yes':v===false?'No':Array.isArray(v)?v.join(', '):String(v)}`).join('\n'));item.append(data);
      const controls=element('div',{className:'kl-setting-tool-buttons'});
      const retry=ui.button(intent.acknowledged?'Read confirmed Feed result':'Retry original Feed action',async()=>{if(!retry.isConnected||!current())return;const result=await this.#send(entry,current);if(result!==undefined)await refreshed();},'refresh');retry.disabled=intent.busy||intent.held||!current();controls.append(retry);
      const discard=ui.button('Discard Feed action',()=>{if(!discard.isConnected||!current()||intent.busy||entry.discarded)return;ui.confirm(item,'Discard this saved choice? This does not undo a change that may already have reached the server.',async()=>{if(!item.isConnected||!current()||intent.busy||entry.discarded)return;entry.discarded=true;this.#entries.delete(entry.key);this.#render();await refreshed();},'Discard');},'close');discard.disabled=intent.busy||!current();controls.append(discard);item.append(controls);root.append(item);
    }
  }
}
