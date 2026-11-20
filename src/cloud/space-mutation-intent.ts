import {CloudError,type CloudClient} from './client';

export interface SpaceRecoverySource {readonly generation?:string|undefined;readonly required:boolean;readonly restored?:boolean|undefined;}
export interface SpaceReceipt {spaceId:string;revision?:number;preferencesRevision?:number;}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class SpaceRecoveryError extends Error {constructor(){super('This Space changed after recovery. Review the original action before starting another one.');}}
export function spaceRecoverySource(metadata:unknown):SpaceRecoverySource {
  if(!object(metadata))throw new SpaceRecoveryError();
  const flag=object(metadata.features)?metadata.features.spaceMutationRecoveryGeneration:undefined,r=metadata.directRecovery;
  if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new SpaceRecoveryError();
  return Object.freeze({required:flag===true,generation:object(r)?r.generation as string:undefined,restored:object(r)?r.restored as boolean:undefined});
}
export function sameSpaceSource(a:SpaceRecoverySource,b:SpaceRecoverySource):boolean{return a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;}
export function spaceReadAt(client:CloudClient,source:SpaceRecoverySource={required:false}) {
  const owner=client.memberNumber,origin=client.origin;
  return async <T>(path:string):Promise<T>=>{
    if(!client.connected||client.memberNumber!==owner||client.origin!==origin||source.required&&!generation(source.generation))throw new SpaceRecoveryError();
    const result=await client.request<T>('GET',path+(source.required?`${path.includes('?')?'&':'?'}recoveryGeneration=${source.generation}`:''));
    if(!client.connected||client.memberNumber!==owner||client.origin!==origin||source.required&&(!generation(source.generation)||!object(result)||result.recoveryGeneration!==source.generation))throw new SpaceRecoveryError();
    return result;
  };
}
export function spaceRead(client:CloudClient,metadata:unknown){
  const source=spaceRecoverySource(metadata);
  if(source.required&&(!client.origin||!object(metadata)||metadata.memberNumber!==client.memberNumber))throw new SpaceRecoveryError();
  return {source,request:spaceReadAt(client,source)};
}

const labels:Record<string,string>={name:'Name',description:'Description',language:'Language',tags:'Tags',access:'Access',discoverable:'Listed in Spaces',announcement:'Welcome announcement',rules:'House rules',room:'Linked room',presets:'Room presets',memberNumber:'Member number',action:'Decision',role:'New role',saved:'Saved',archived:'Archived',communityId:'Community',searchSpace:'BC search space',background:'Background',capacity:'Planned places',restoreOnOpen:'Restore on opening',palette:'Palette',primary:'Primary colour',secondary:'Secondary colour',label:'Preset name'};
/** Human-readable original values; transport identifiers are not user controls. */
export function spaceChangeText(body:Record<string,unknown>):string{
  const lines=(data:Record<string,unknown>,indent=''):string[]=>Object.entries(data).filter(([key])=>!['operationId','revision','recoveryGeneration','id'].includes(key)).flatMap(([key,value])=>{
    const label=labels[key]??key,prefix=indent+label+': ';
    if(Array.isArray(value))return value.every(v=>typeof v==='string')?[prefix+value.join(', ')]:[prefix,...value.flatMap((v,i)=>object(v)?[indent+`  ${i+1}.`,...lines(v,indent+'    ')]:[indent+'  '+String(v)])];
    if(object(value))return [prefix,...lines(value,indent+'  ')];
    return [prefix+(value===null?'None':typeof value==='boolean'?value?'Yes':'No':key==='memberNumber'?'#'+String(value):String(value))];
  });return lines(body).join('\n');
}

const outstanding=new WeakMap<CloudClient,Set<SpaceMutationIntent>>();
export function pendingSpaceChanges(client:CloudClient):SpaceMutationIntent[]{const entries=outstanding.get(client);if(!entries)return [];for(const intent of entries)if(!intent.identity())intent.release();return [...entries];}
export function clearSpaceChanges(client:CloudClient):void{for(const intent of outstanding.get(client)??[])intent.release();outstanding.delete(client);}
/** Volatile, account-owned original command. The UUID, form values, target,
 * revision and source are captured before preflight. A known ACK is never sent again. */
export class SpaceMutationIntent {
  readonly #owner:number;readonly #origin:string;readonly #body:Record<string,unknown>;
  readonly source:SpaceRecoverySource;readonly action:string;readonly spaceId:string|undefined;
  #busy=false;#held=false;#released=false;#receipt:SpaceReceipt|undefined;notice='';
  constructor(readonly client:CloudClient,readonly method:'POST'|'PUT',readonly path:string,body:Record<string,unknown>,source:SpaceRecoverySource,readonly label='Space change'){
    this.#owner=client.memberNumber;this.#origin=client.origin;this.source=Object.freeze({...source});
    this.#body=structuredClone({...body,operationId:body.operationId??crypto.randomUUID()});
    const match=/^\/v1\/spaces(?:\/([^/]+)(?:\/(join|leave|invite|ownership|archive|preferences|members\/[1-9]\d*))?)?$/u.exec(path);
    if(!match)throw new SpaceRecoveryError();
    const entries=outstanding.get(client)??new Set<SpaceMutationIntent>();entries.add(this);outstanding.set(client,entries);
    this.spaceId=match[1];this.action=!this.spaceId?'create':!match[2]?'settings':match[2].startsWith('members/')?'member':match[2];
  }
  release():void{this.#released=true;outstanding.get(this.client)?.delete(this);}
  get active():boolean{return !this.#released&&this.identity();}
  get body():Record<string,unknown>{return structuredClone(this.#body);}
  get busy():boolean{return this.#busy;}
  get held():boolean{return this.#held;}
  get confirmed():boolean{return !!this.#receipt;}
  identity():boolean{return this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
  hold():void{this.#held=true;this.notice=this.confirmed?'This change was confirmed, but the Space changed afterwards. Its original details are kept for review.':'This Space action needs review. Its original details are kept; discard it before starting a new action.';}
  observe(source:SpaceRecoverySource):void{if(!sameSpaceSource(source,this.source))this.hold();}
  #accept(value:unknown):SpaceReceipt {
    if(!object(value)||typeof value.spaceId!=='string'||this.spaceId&&value.spaceId!==this.spaceId)throw new SpaceRecoveryError();
    if(this.source.required){
      const revision=Number(this.#body.revision),member=this.action==='member'?Number(this.path.split('/').at(-1)):this.#body.memberNumber;
      const allowed=['applied','action','spaceId','operationId','recoveryGeneration',this.action==='preferences'?'preferencesRevision':'revision',...member!==undefined?['memberNumber']:[],...this.action==='member'?['decision']:[]];
      if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu.test(value.spaceId)||Object.keys(value).length!==allowed.length||Object.keys(value).some(k=>!allowed.includes(k))||value.applied!==true||value.action!==this.action||value.operationId!==this.#body.operationId||value.recoveryGeneration!==this.source.generation||member!==undefined&&value.memberNumber!==member||this.action==='member'&&value.decision!==this.#body.action)throw new SpaceRecoveryError();
      const validRevision=this.action==='preferences'?value.preferencesRevision===revision+1:this.action==='create'?value.revision===1:Number.isSafeInteger(value.revision)&&(value.revision===revision+1||['join','invite'].includes(this.action)&&value.revision===revision);
      if(!validRevision)throw new SpaceRecoveryError();
    }
    return structuredClone(value) as unknown as SpaceReceipt;
  }
  async send(current:()=>boolean):Promise<SpaceReceipt|undefined>{
    if(!this.active||!current()||this.busy||this.held)return;
    this.#busy=true;
    try{
      if(!this.client.connected)throw new CloudError('cloud_temporarily_unavailable');
      const me=await this.client.request<unknown>('GET','/v1/me');
      if(!this.identity()||!object(me)||me.memberNumber!==undefined&&me.memberNumber!==this.#owner)throw new SpaceRecoveryError();
      this.observe(spaceRecoverySource(me));
      if(this.held||this.source.required&&(!this.#origin||me.memberNumber!==this.#owner||!generation(this.source.generation))||this.source.restored&&!this.source.required)throw new SpaceRecoveryError();
      if(!current())return;
      if(!this.#receipt){
        const value=await this.client.request<unknown>(this.method,this.path,{...this.body,...this.source.required?{recoveryGeneration:this.source.generation}:{}});
        if(!this.active)return;
        this.#receipt=this.#accept(value);
      }
      if(!current()){this.notice='The change was confirmed after leaving this view. Refresh to review its result.';return;}
      if(this.held)return;
      this.notice='';return structuredClone(this.#receipt);
    }catch(error){
      if(this.identity()&&(error instanceof SpaceRecoveryError||error instanceof CloudError&&error.status>=400&&error.status<500&&![408,429].includes(error.status)))this.hold();
      else this.notice='The result is not confirmed. Retry the original action when connected, or explicitly discard it.';
      throw error;
    }finally{this.#busy=false;}
  }
}
