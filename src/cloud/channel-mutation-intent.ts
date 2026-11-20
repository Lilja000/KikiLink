import {CloudError,type CloudClient} from './client';
import {ModerationGeneration,ModerationGenerationError,moderationGenerationConflict} from './moderation-generation';

export interface ChannelMutationSource {generation?:string|undefined;required:boolean;}
export interface ChannelMutationTarget {
  kind:'send'|'delete'|'reaction'|'preferences'|'query';path:string;communityId:string;channelId:string;
  messageId?:string;revision?:number;label?:string;preview?:string;
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function channelMutationSource(metadata:unknown):ChannelMutationSource {
  if(!object(metadata))throw new ModerationGenerationError();
  const flag=object(metadata.features)?metadata.features.channelMutationRecoveryGeneration:undefined,recovery=metadata.directRecovery;
  if(flag!==undefined&&typeof flag!=='boolean')throw new ModerationGenerationError();
  if(recovery!==undefined&&(!object(recovery)||typeof recovery.generation!=='string'||!/^[a-f0-9]{32}$/u.test(recovery.generation)||typeof recovery.restored!=='boolean'))throw new ModerationGenerationError();
  if(flag===true&&!object(recovery))throw new ModerationGenerationError();
  return {generation:object(recovery)?recovery.generation as string:undefined,required:flag===true};
}

/** Source is captured from the displayed channel/message, before the user acts.
 * CAS-only mutations retain their set/remove value; operation mutations retain their UUID too. */
export class ChannelMutationIntent {
  readonly #owner:number;readonly #origin:string;readonly #guard:ModerationGeneration;
  readonly target:Readonly<ChannelMutationTarget>;readonly source:Readonly<ChannelMutationSource>;
  #pending:Record<string,unknown>|undefined;#held=false;#busy=false;
  notice='';
  constructor(readonly client:CloudClient,target:ChannelMutationTarget,source:ChannelMutationSource){
    this.#owner=client.memberNumber;this.#origin=client.origin;this.target=Object.freeze({...target});this.source=Object.freeze({...source});
    this.#guard=new ModerationGeneration(client,'channelMutationRecoveryGeneration');
  }
  get pending():Readonly<Record<string,unknown>>|undefined{return this.#pending;}
  get held():boolean{return this.#held;}
  get busy():boolean{return this.#busy;}
  identity():boolean{return this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
  hold():void{this.#held=true;this.notice='This action belongs to an earlier or unverified channel state. Its original details are kept. Discard it and open current information before starting another action.';}
  observe(source:ChannelMutationSource):void{if(source.generation!==this.source.generation||this.source.required&&!source.required)this.hold();}
  async send<T=Record<string,unknown>>(data:Record<string,unknown>,current:()=>boolean):Promise<T|undefined>{
    if(!this.identity()||!current()||this.held||this.busy)return;
    const kind=this.target.kind;
    this.#pending??={...structuredClone(data),...(this.target.revision===undefined?{}:{revision:this.target.revision}),...(['send','delete'].includes(kind)?{operationId:crypto.randomUUID()}: {})};
    this.#busy=true;
    try{
      if(!this.client.connected)throw new CloudError('cloud_temporarily_unavailable');
      const me=await this.client.request<unknown>('GET','/v1/me');
      if(!current())return;
      if(!this.identity()||!object(me)||me.memberNumber!==undefined&&me.memberNumber!==this.#owner)throw new ModerationGenerationError();
      const source=channelMutationSource(me);this.observe(source);this.#guard.accept(me);const access=this.#guard.capture();
      if(this.held||this.source.required&&!access.generation||access.generation!==undefined&&access.generation!==this.source.generation||!access.generation&&object(me.directRecovery)&&me.directRecovery.restored===true)throw new ModerationGenerationError();
      const result=await access.request<Record<string,unknown>>(['send','delete','query'].includes(kind)?'POST':'PUT',this.target.path,this.#pending);
      if(!current())return;
      if(this.held||!this.identity())throw new ModerationGenerationError();
      if(access.generation){
        if(!object(result)||result.communityId!==this.target.communityId||result.channelId!==this.target.channelId||this.target.messageId&&result.messageId!==this.target.messageId)throw new ModerationGenerationError();
        if(kind==='send'&&(typeof result.messageId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(result.messageId)))throw new ModerationGenerationError();
        if(['send','delete','preferences'].includes(kind)&&(!Number.isSafeInteger(result.revision)||(result.revision as number)<0))throw new ModerationGenerationError();
        if(kind==='preferences'&&result.mode!==this.#pending.mode)throw new ModerationGenerationError();
        if(kind==='reaction'&&(result.available!==true||!Number.isSafeInteger(result.revision)||(result.revision as number)<0||result.mine!==this.#pending.reaction||!Array.isArray(result.counts)))throw new ModerationGenerationError();
        if(kind==='query'&&!Array.isArray(result.items))throw new ModerationGenerationError();
      }
      this.notice='';return result as T;
    }catch(error){
      if(this.identity()&&(moderationGenerationConflict(error)||error instanceof CloudError&&error.status>=400&&error.status<500&&error.status!==429))this.hold();
      else this.notice='Could not complete the request. The original action is kept; retry when connected or explicitly discard it.';
      throw error;
    }finally{this.#busy=false;}
  }
}
