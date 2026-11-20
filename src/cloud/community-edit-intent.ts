import {CloudError,type CloudClient} from './client';
import {ModerationGeneration,ModerationGenerationError,moderationGenerationConflict,type ModerationAccess} from './moderation-generation';

export interface CommunityEditSource {generation?:string|undefined;required:boolean;}
export interface CommunityEditTarget {method:'POST'|'PUT';path:string;communityId?:string|undefined;channelId?:string|undefined;channel?:boolean;revision?:number|undefined;}
export interface CommunityEditReceipt {communityId:string;channelId?:string;revision?:number;}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** Capture at draft opening, never at the first write or retry. */
export function communityEditSource(metadata:unknown):CommunityEditSource {
  if(!object(metadata))throw new ModerationGenerationError();
  const flag=object(metadata.features)?metadata.features.communityEditingRecoveryGeneration:undefined,recovery=metadata.directRecovery;
  if(flag!==undefined&&typeof flag!=='boolean')throw new ModerationGenerationError();
  if(recovery!==undefined&&(!object(recovery)||typeof recovery.generation!=='string'||!/^[a-f0-9]{32}$/u.test(recovery.generation)||typeof recovery.restored!=='boolean'))throw new ModerationGenerationError();
  if(flag===true&&!object(recovery))throw new ModerationGenerationError();
  return {generation:object(recovery)?recovery.generation as string:undefined,required:flag===true};
}

/** One source-bound volatile editor attempt. Unknown outcomes keep the exact body. */
export class CommunityEditIntent {
  readonly #owner:number;readonly #origin:string;readonly #recovery:ModerationGeneration;
  readonly target:CommunityEditTarget;readonly source:CommunityEditSource;
  #pending:Record<string,unknown>|undefined;#held=false;
  constructor(readonly client:CloudClient,target:CommunityEditTarget,source:CommunityEditSource) {
    this.#owner=client.memberNumber;this.#origin=client.origin;this.target=Object.freeze({...target});this.source=Object.freeze({...source});
    this.#recovery=new ModerationGeneration(client,'communityEditingRecoveryGeneration');
  }
  get pending():Readonly<Record<string,unknown>>|undefined{return this.#pending;}
  get held():boolean{return this.#held;}
  identity():boolean{return this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
  hold():void{this.#held=true;}
  observe(source:CommunityEditSource):void{if(source.generation!==this.source.generation||this.source.required&&!source.required)this.hold();}
  revised(revision:number):CommunityEditIntent {
    if(!this.identity()||this.held||!Number.isSafeInteger(revision)||revision<1)throw new ModerationGenerationError();
    return new CommunityEditIntent(this.client,{...this.target,revision},{...this.source,required:this.source.required||!!this.#recovery.generation});
  }
  async #access(current:()=>boolean):Promise<ModerationAccess|undefined> {
    if(!this.identity()||this.held)throw new ModerationGenerationError();
    if(!this.client.connected)throw new CloudError('cloud_temporarily_unavailable');
    const me=await this.client.request<{memberNumber?:number;directRecovery?:{generation?:unknown;restored?:unknown}}>('GET','/v1/me');
    if(!current())return;
    if(!this.identity()||me.memberNumber!==undefined&&me.memberNumber!==this.#owner)throw new ModerationGenerationError();
    communityEditSource(me);this.#recovery.accept(me);const access=this.#recovery.capture(),source=this.source;
    if(source.required&&!access.generation||source.generation&&me.directRecovery?.generation!==source.generation||access.generation&&access.generation!==source.generation||!access.generation&&me.directRecovery?.restored===true)throw new ModerationGenerationError();
    return access;
  }
  async send(data:Record<string,unknown>,current:()=>boolean):Promise<CommunityEditReceipt|undefined> {
    if(!this.identity()||!current()||this.held)return;
    this.#pending??={...structuredClone(data),...(this.target.revision===undefined?{}:{revision:this.target.revision}),operationId:crypto.randomUUID()};
    try {
      const access=await this.#access(current);if(!access)return;if(this.held)throw new ModerationGenerationError();
      const r=await access.request<CommunityEditReceipt>(this.target.method,this.target.path,this.#pending);if(!current())return;if(this.held)throw new ModerationGenerationError();
      const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(v);
      if(!r||typeof r.communityId!=='string'||!r.communityId||this.target.communityId&&r.communityId!==this.target.communityId||this.target.channelId&&r.channelId!==this.target.channelId||this.target.channel&&(!r.channelId||typeof r.channelId!=='string')||access.generation&&(!Number.isSafeInteger(r.revision)||r.revision! < 1||!this.target.communityId&&!uuid(r.communityId)||this.target.channel&&!this.target.channelId&&!uuid(r.channelId)))throw new ModerationGenerationError();
      return r;
    }catch(error){if(this.identity()&&moderationGenerationConflict(error)&&(this.client.connected||error instanceof CloudError))this.hold();throw error;}
  }
  async latest<T>(current:()=>boolean):Promise<T|undefined> {
    try{const access=await this.#access(current);if(!access)return;if(this.held)throw new ModerationGenerationError();const result=await access.request<T>('GET',this.target.path);if(this.held)throw new ModerationGenerationError();return current()?result:undefined;}
    catch(error){if(this.identity()&&moderationGenerationConflict(error)&&(this.client.connected||error instanceof CloudError))this.hold();throw error;}
  }
}
