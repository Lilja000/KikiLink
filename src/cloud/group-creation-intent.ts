import {CloudError,type CloudClient} from './client';
import {matchExact as exact,matchUuid as uuid} from '../../cloud/shared/matching.mjs';

export type GroupCreationClient=Pick<CloudClient,'memberNumber'|'origin'|'connected'|'request'>;
export interface GroupCreationSource {required:boolean;generation?:string}
export interface GroupCreationBody {title:string;members:number[];legacyId?:string}
export interface GroupCreationDestination {groupId:string;generation?:string}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export class GroupCreationRecoveryError extends Error {
  constructor(){super('This group request needs review after a Cloud change. Its original name and invitees are kept. Dismiss it before starting a new request.');}
}
export function checkedGroupCreationSource(value:unknown):GroupCreationSource {
  if(!object(value)||!exact(value,['required',...value.generation===undefined?[]:['generation']])||typeof value.required!=='boolean'||
    value.generation!==undefined&&(typeof value.generation!=='string'||!/^[a-f0-9]{32}$/u.test(value.generation))||value.required&&value.generation===undefined)throw new GroupCreationRecoveryError();
  return {required:value.required,...typeof value.generation==='string'?{generation:value.generation}:{}};
}
export function groupCreationSource(me:unknown):GroupCreationSource {
  if(!object(me))throw new GroupCreationRecoveryError();
  const flag=object(me.features)?me.features.groupCreationRecoveryGeneration:undefined,r=me.directRecovery;
  if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||typeof r.generation!=='string'||!/^[a-f0-9]{32}$/u.test(r.generation)||typeof r.restored!=='boolean'))throw new GroupCreationRecoveryError();
  return checkedGroupCreationSource({required:flag===true,...object(r)?{generation:r.generation}:{}});
}
export const sameGroupCreationSource=(a:GroupCreationSource,b:GroupCreationSource)=>a.required===b.required&&a.generation===b.generation;
export function checkGroupCreationSource(source:GroupCreationSource|undefined,me:unknown):GroupCreationSource {
  const next=groupCreationSource(me);
  // An older durable pending request has no source identity. Never silently
  // upgrade it into a request for the database observed at retry time.
  if(source?!sameGroupCreationSource(source,next):next.required)throw new GroupCreationRecoveryError();
  if(!next.required&&object(me)&&object(me.directRecovery)&&me.directRecovery.restored===true)throw new GroupCreationRecoveryError();
  return next;
}
export function validateGroupCreation(body:GroupCreationBody,owner:number,isBlocked:(n:number)=>boolean):void {
  if(!body.title.trim()||body.title.length>60||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(body.title))throw new Error('Enter a group name of up to 60 characters.');
  if(body.members.length<2||body.members.length>4||new Set(body.members).size!==body.members.length||body.members.some(n=>!Number.isSafeInteger(n)||n<=0||n===owner||isBlocked(n)))throw new Error('Choose 2–4 different, unblocked Member Numbers.');
}
export async function sendGroupCreation(client:GroupCreationClient,action:'create'|'migrate',source:GroupCreationSource|undefined,
  input:GroupCreationBody,operationId:string|undefined,valid:()=>boolean,beforeSend:()=>void=()=>{}):Promise<GroupCreationDestination> {
  const owner=client.memberNumber,origin=client.origin,body=structuredClone(input);
  const check=()=>{if(!valid()||client.memberNumber!==owner||client.origin!==origin)throw new Error('The account or group view changed. The original request is kept.');};
  check();if(!client.connected)throw new Error('Reconnect to retry the original group request.');
  const me=await client.request<unknown>('GET','/v1/me');check();
  if(!object(me)||(action==='migrate'||me.memberNumber!==undefined)&&me.memberNumber!==owner)throw new GroupCreationRecoveryError();
  const accepted=checkGroupCreationSource(source,me);
  if(action==='migrate'&&(!object(me.features)||me.features.legacyGroupMigration!==true))throw new Error('Group migration needs the pending Cloud update. Your saved request is kept.');
  if(accepted.required&&!uuid(operationId))throw new GroupCreationRecoveryError();
  beforeSend();check();
  const response=await client.request<unknown>('POST',action==='create'?'/v1/groups':'/v1/group-migrations',
    {...body,...accepted.required?{operationId,recoveryGeneration:accepted.generation}:{}});
  check();
  let groupId:unknown;
  if(accepted.required){
    if(!exact(response,['applied','action','groupId','operationId','recoveryGeneration',...body.legacyId?['legacyId']:[]])||
      response.applied!==true||response.action!==action||response.operationId!==operationId||response.recoveryGeneration!==accepted.generation||
      body.legacyId!==undefined&&response.legacyId!==body.legacyId)throw new GroupCreationRecoveryError();
    groupId=response.groupId;
  }else if(action==='migrate'){
    if(!exact(response,['legacyId','groupId'])||response.legacyId!==body.legacyId)throw new Error('The migration result could not be confirmed. Retry the saved request to check it.');
    groupId=response.groupId;
  }else groupId=object(response)?response.id:undefined;
  if(!uuid(groupId)){if(accepted.required)throw new GroupCreationRecoveryError();throw new Error('The group result could not be confirmed. The original request is kept.');}
  return {groupId:groupId as string,...accepted.generation?{generation:accepted.generation}:{}};
}

/** Volatile new-group editor; an uncertain create never becomes a second one. */
export class GroupCreationDraft {
  readonly owner:number;readonly origin:string;readonly source:Readonly<GroupCreationSource>;
  title='';members='';dirty=false;busy=false;held=false;notice='';
  #pending:{body:GroupCreationBody;operationId?:string}|undefined;
  confirmed:GroupCreationDestination|undefined;
  constructor(readonly client:GroupCreationClient,source:GroupCreationSource){this.owner=client.memberNumber;this.origin=client.origin;this.source=Object.freeze(checkedGroupCreationSource(source));}
  identity():boolean{return this.owner===this.client.memberNumber&&this.origin===this.client.origin;}
  get pending(){return this.#pending&&structuredClone(this.#pending);}
  hold():void{this.held=true;this.notice=new GroupCreationRecoveryError().message;}
  observe(source:GroupCreationSource):void{if(!sameGroupCreationSource(this.source,source)&&this.dirty)this.hold();}
  edit(title:string,members:string):boolean{
    if(!this.identity()||this.#pending||this.held||this.confirmed)return false;
    this.title=title;this.members=members;this.dirty=true;return true;
  }
  async send(current:()=>boolean,isBlocked:(n:number)=>boolean):Promise<GroupCreationDestination|undefined>{
    if(!this.identity()||!current()||this.busy||this.held)return;
    if(this.confirmed)return this.confirmed;
    const body=this.#pending?.body??{title:this.title,members:this.members.split(',').map(n=>Number(n.trim()))};
    validateGroupCreation(body,this.owner,isBlocked);
    this.#pending??={body:structuredClone(body),...this.source.required?{operationId:crypto.randomUUID()}:{}};
    this.dirty=true;this.busy=true;
    try{
      const result=await sendGroupCreation(this.client,'create',this.source,this.#pending.body,this.#pending.operationId,()=>this.identity()&&current(),()=>validateGroupCreation(body,this.owner,isBlocked));
      if(this.held)throw new GroupCreationRecoveryError();
      this.confirmed=result;this.notice='Group creation confirmed. Open the group to check its current membership.';return result;
    }catch(error){
      if(error instanceof GroupCreationRecoveryError||error instanceof CloudError&&error.status>=400&&error.status<500&&error.status!==429)this.hold();
      else this.notice='Could not confirm group creation. The original name and invitees are kept for an exact retry.';
      throw error;
    }finally{this.busy=false;}
  }
}
