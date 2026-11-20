import {CloudError,type CloudClient} from './client';
import {ModerationGeneration,ModerationGenerationError,moderationGenerationConflict} from './moderation-generation';

export interface GroupMutationSource {generation?:string|undefined;required:boolean;}
export interface GroupMutationTarget {
  kind:'send'|'delete'|'reaction'|'query';path:string;groupId:string;conversationId:string;
  messageId?:string;membershipVersion?:number;keyVersion?:number;label?:string;preview?:string;
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function groupMutationSource(metadata:unknown):GroupMutationSource {
  if(!object(metadata))throw new ModerationGenerationError();
  const flag=object(metadata.features)?metadata.features.groupMutationRecoveryGeneration:undefined,recovery=metadata.directRecovery;
  if(flag!==undefined&&typeof flag!=='boolean')throw new ModerationGenerationError();
  if(recovery!==undefined&&(!object(recovery)||typeof recovery.generation!=='string'||!/^[a-f0-9]{32}$/u.test(recovery.generation)||typeof recovery.restored!=='boolean'))throw new ModerationGenerationError();
  if(flag===true&&!object(recovery))throw new ModerationGenerationError();
  return {generation:object(recovery)?recovery.generation as string:undefined,required:flag===true};
}

/** Keep the original group, branch, key/membership versions and exact payload.
 * The panel supplies source from its bound descriptor read. Undefined source is
 * only the legacy internal view contract: unbound writes fail after any restore. */
export class GroupMutationIntent {
  readonly #owner:number;readonly #origin:string;readonly #guard:ModerationGeneration;
  readonly target:Readonly<GroupMutationTarget>;readonly source:Readonly<GroupMutationSource>|undefined;
  #pending:Record<string,unknown>|undefined;#held=false;#busy=false;
  notice='';
  constructor(readonly client:CloudClient,target:GroupMutationTarget,source:GroupMutationSource|undefined){
    this.#owner=client.memberNumber;this.#origin=client.origin;this.target=Object.freeze({...target});this.source=source&&Object.freeze({...source});
    this.#guard=new ModerationGeneration(client,'groupMutationRecoveryGeneration');
  }
  get pending():Readonly<Record<string,unknown>>|undefined{return this.#pending&&structuredClone(this.#pending);}
  get held():boolean{return this.#held;}
  get busy():boolean{return this.#busy;}
  identity():boolean{return this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
  hold():void{this.#held=true;this.notice='This action belongs to an earlier or unverified group state. Its original details are kept. Discard it and open current information before starting another action.';}
  observe(source:GroupMutationSource|undefined):void{if(source?.generation!==this.source?.generation||this.source?.required&&!source?.required)this.hold();}
  async send<T=Record<string,unknown>>(data:Record<string,unknown>,current:()=>boolean):Promise<T|undefined>{
    if(!this.identity()||!current()||this.held||this.busy)return;
    const kind=this.target.kind,method=kind==='delete'?'DELETE':kind==='reaction'?'PUT':'POST';
    this.#pending??={...structuredClone(data),...(kind==='send'?{membershipVersion:this.target.membershipVersion,keyVersion:this.target.keyVersion}: {})};
    this.#busy=true;
    try{
      if(!this.client.connected)throw new CloudError('cloud_temporarily_unavailable');
      // Older isolated views retain their unbound wire shapes. They cannot adopt
      // a generation at retry time; the server rejects them on restored databases.
      if(!this.source){
        const result=kind==='delete'?await this.client.request<T>(method,this.target.path):await this.client.request<T>(method,this.target.path,structuredClone(this.#pending));
        if(!this.identity())throw new ModerationGenerationError();
        this.notice='';return result;
      }
      const me=await this.client.request<unknown>('GET','/v1/me');
      if(!current())return;
      if(!this.identity()||!object(me)||me.memberNumber!==undefined&&me.memberNumber!==this.#owner)throw new ModerationGenerationError();
      const source=groupMutationSource(me);this.observe(source);this.#guard.accept(me);const access=this.#guard.capture();
      if(this.held||this.source.required&&!access.generation||access.generation!==undefined&&access.generation!==this.source.generation||!access.generation&&object(me.directRecovery)&&me.directRecovery.restored===true)throw new ModerationGenerationError();
      const result=await access.request<Record<string,unknown>>(method,this.target.path,structuredClone(this.#pending));
      if(!current()){this.notice='The result arrived after leaving this view. The original action is kept for an explicit retry.';return;}
      if(this.held||!this.identity())throw new ModerationGenerationError();
      if(access.generation){
        if(!object(result)||result.groupId!==this.target.groupId||result.conversationId!==this.target.conversationId||this.target.messageId&&result.messageId!==this.target.messageId)throw new ModerationGenerationError();
        if(kind==='send'&&(typeof result.id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(result.id)||!Number.isSafeInteger(result.sequence)||(result.sequence as number)<1||result.sender!==this.#owner||result.clientId!==this.#pending.clientId||result.text!==this.#pending.text||result.membershipVersion!==this.#pending.membershipVersion||result.keyVersion!==this.#pending.keyVersion||result.schemaVersion!==this.#pending.schemaVersion||result.encryption!==this.#pending.encryption||JSON.stringify(result.mediaIds??[])!==JSON.stringify(this.#pending.mediaIds??[])||JSON.stringify(result.audioIds??[])!==JSON.stringify(this.#pending.audioIds??[])))throw new ModerationGenerationError();
        if(kind==='delete'&&result.deleted!==true)throw new ModerationGenerationError();
        if(kind==='reaction'&&(result.available!==true||!Number.isSafeInteger(result.revision)||(result.revision as number)<0||(typeof this.#pending.selected==='boolean'?(!Array.isArray(result.mineReactions)||result.mineReactions.includes(this.#pending.reaction)!==this.#pending.selected):result.mine!==this.#pending.reaction)||!Array.isArray(result.counts)))throw new ModerationGenerationError();
        if(kind==='query'&&(!Array.isArray(result.items)||result.items.some(item=>!object(item)||!Array.isArray(this.#pending?.ids)||!this.#pending.ids.includes(item.messageId))))throw new ModerationGenerationError();
      }
      this.notice='';return result as T;
    }catch(error){
      if(this.identity()&&(moderationGenerationConflict(error)||error instanceof CloudError&&error.status>=400&&error.status<500&&error.status!==429))this.hold();
      else this.notice='Could not complete the request. The original action is kept; retry when connected or explicitly discard it.';
      throw error;
    }finally{this.#busy=false;}
  }
}
