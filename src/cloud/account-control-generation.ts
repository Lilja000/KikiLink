import {CloudError, type CloudClient} from './client';
import {accountControlSource, requireAccountControlSource, AccountControlGenerationError, type AccountControlSource} from '../../cloud/shared/account-control-source.mjs';
export * from '../../cloud/shared/account-control-source.mjs';
type Client=Pick<CloudClient,'memberNumber'|'origin'|'connected'|'request'>;
export interface AccountControlReview {readonly owner:number;readonly origin:string;readonly source:AccountControlSource;}
export type AccountControlTarget={action:'block'|'unblock';member:number}|{action:'session-revoke';kind:'device'|'session';id:string};
export class AccountControlUnconfirmedError extends Error {constructor(){super('This action was already sent and its result may be unknown. Close it and review current account details before choosing again.');}}
export function accountControlGuard(client:Client,review:AccountControlReview,valid:()=>boolean):void {
 if(!valid()||client.memberNumber!==review.owner||client.origin!==review.origin||!client.connected)throw new CloudError('session_changed');
}
export function captureAccountControl(client:Client,metadata:unknown):AccountControlReview {
 if(!metadata||typeof metadata!=='object'||(metadata as {memberNumber?:unknown}).memberNumber!==client.memberNumber||!Number.isSafeInteger(client.memberNumber)||client.memberNumber<1)throw new CloudError('session_changed');
 return Object.freeze({owner:client.memberNumber,origin:client.origin,source:accountControlSource(metadata)});
}
export async function reviewAccountControl(client:Client,valid:()=>boolean):Promise<AccountControlReview> {
 const owner=client.memberNumber,origin=client.origin;if(!valid()||!client.connected)throw new CloudError('session_changed');
 const metadata=await client.request('GET','/v1/me');if(!valid()||client.memberNumber!==owner||client.origin!==origin)throw new CloudError('session_changed');return captureAccountControl(client,metadata);
}
export async function preflightAccountControl(client:Client,review:AccountControlReview,valid:()=>boolean):Promise<void> {
 accountControlGuard(client,review,valid);const fresh=await reviewAccountControl(client,valid);accountControlGuard(client,review,valid);requireAccountControlSource(review.source,fresh.source);
}
export const accountControlPath=(path:string,review:AccountControlReview):string=>review.source.required?path+(path.includes('?')?'&':'?')+'recoveryGeneration='+review.source.generation:path;
export const accountControlBody=(review:AccountControlReview,operationId:string):Record<string,unknown>=>review.source.required?{operationId,recoveryGeneration:review.source.generation}:{};
export function accountControlRead<T>(value:unknown,review:AccountControlReview):T {
 if(!review.source.required)return value as T;
 if(!value||typeof value!=='object'||Array.isArray(value)||(value as any).recoveryGeneration!==review.source.generation||(value as any).memberNumber!==review.owner)throw new AccountControlGenerationError();
 const {recoveryGeneration,...rest}=value as Record<string,unknown>;return rest as T;
}
export function accountControlReceipt(value:unknown,review:AccountControlReview,operationId:string,action:string,expected:Record<string,unknown>):void {
 if(!review.source.required)return;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new CloudError('invalid_response');
 const actual=value as Record<string,unknown>,receipt={...expected,memberNumber:review.owner,operationId,action,applied:true,recoveryGeneration:review.source.generation};
 if(Object.keys(actual).sort().join(',')!==Object.keys(receipt).sort().join(',')||Object.entries(receipt).some(([key,v])=>actual[key]!==v))throw new CloudError('invalid_response');
}
export function accountControlError(error:unknown):unknown{return (error as {code?:string})?.code==='recovery_generation_required'?new AccountControlGenerationError():error;}
/** One volatile confirmation; never resend a mutation after an uncertain result. */
export class AccountControlIntent {
 readonly review:AccountControlReview;readonly target:AccountControlTarget;readonly operationId=crypto.randomUUID();#attempted=false;#busy=false;
 constructor(readonly client:Client,review:AccountControlReview,target:AccountControlTarget){
  this.review=Object.freeze({...review,source:Object.freeze(structuredClone(review.source))});this.target=Object.freeze({...target});
  if('member' in target){if(!Number.isSafeInteger(target.member)||target.member<1||target.member===review.owner)throw new CloudError('invalid_member_number');}
  else if(!(target.kind==='device'?/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u:/^[a-f0-9]{32}$/u).test(target.id))throw new CloudError('invalid_session');
 }
 get attempted():boolean{return this.#attempted;}
 async run(valid:()=>boolean):Promise<void>{
  if(this.#attempted||this.#busy)throw new AccountControlUnconfirmedError();this.#busy=true;
  try{
   await preflightAccountControl(this.client,this.review,valid);accountControlGuard(this.client,this.review,valid);
   const t=this.target,path='member' in t?'/v1/blocks/'+t.member:'/v1/account/sessions/'+t.kind+'/'+t.id,method=t.action==='block'?'PUT':'DELETE';
   this.#attempted=true;
   const result=this.review.source.required?await this.client.request(method,path,accountControlBody(this.review,this.operationId)):method==='PUT'?await this.client.request(method,path,{}):await this.client.request(method,path);
   accountControlReceipt(result,this.review,this.operationId,t.action,'member' in t?{target:t.member,blocked:t.action==='block'}:{kind:t.kind,id:t.id,revoked:true});
   accountControlGuard(this.client,this.review,valid);
  }catch(error){throw accountControlError(error);}finally{this.#busy=false;}
 }
}
