import {CloudError, type CloudClient} from './client';
import type {CloudMedia, CloudProfile} from './types';
import {ProfileGenerationError, profileSource, requireProfileSource, type ProfileSource} from '../../cloud/shared/profile-source.mjs';
export * from '../../cloud/shared/profile-source.mjs';
type Client = Pick<CloudClient,'memberNumber'|'origin'|'connected'|'request'>;
export interface ProfileMetadata {source:ProfileSource; features:Record<string,boolean|undefined>;}
export function profileGuard(client:Client,owner:number,origin:string,valid:()=>boolean):void {
  if(!valid()||client.memberNumber!==owner||client.origin!==origin)throw new CloudError('session_changed');
}
export async function profileMetadata(client:Client,valid:()=>boolean):Promise<ProfileMetadata> {
  const owner=client.memberNumber,origin=client.origin;profileGuard(client,owner,origin,valid);
  if(!client.connected)throw new CloudError('authentication_required',401);
  const me=await client.request<{memberNumber:number;features?:Record<string,boolean|undefined>}>('GET','/v1/me');
  profileGuard(client,owner,origin,valid);
  if(!me||me.memberNumber!==owner||!Number.isSafeInteger(owner)||owner<1)throw new CloudError('session_changed');
  return {source:profileSource(me),features:me.features??{}};
}
export const profilePath=(path:string,source:ProfileSource|undefined):string=>source?.required?path+(path.includes('?')?'&':'?')+'recoveryGeneration='+source.generation:path;
export function profileRead(value:unknown,source:ProfileSource):CloudProfile {
  if(!source.required)return value as CloudProfile;
  if(!value||typeof value!=='object'||Array.isArray(value)||(value as Record<string,unknown>).recoveryGeneration!==source.generation)throw new ProfileGenerationError();
  const {recoveryGeneration,...rest}=value as Record<string,unknown>;return rest as unknown as CloudProfile;
}
export async function reviewProfile(client:Client&Pick<CloudClient,'profile'>,valid:()=>boolean,original?:ProfileSource):Promise<ProfileMetadata & { value: CloudProfile | undefined }> {
  const owner=client.memberNumber,origin=client.origin,metadata=await profileMetadata(client,valid),{source}=metadata;
  if(original)requireProfileSource(original,source);
  let value:CloudProfile|undefined;
  try{value=source.required?profileRead(await client.request('GET',profilePath('/v1/profiles/'+owner,source)),source):await client.profile(owner,true);}
  catch(error){if(source.required||!(error instanceof CloudError)||error.status!==404)throw error;}
  profileGuard(client,owner,origin,valid);
  if(value&&(value.memberNumber!==owner||!Number.isSafeInteger(value.revision)||value.revision<0))throw new CloudError('invalid_response');
  return {value,...metadata};
}
export const profileBody=(body:Record<string,unknown>,source:ProfileSource|undefined,operationId:string):Record<string,unknown>=>({...body,...source?.required?{operationId,recoveryGeneration:source.generation}:{}});
export function profileReceipt(value:unknown,source:ProfileSource|undefined,owner:number,operationId:string,action:'profile-put'|'profile-delete',revision:number):CloudProfile {
  if(!source?.required)return value as CloudProfile;
  if(!value||typeof value!=='object'||Array.isArray(value))throw new CloudError('invalid_response');
  const {recoveryGeneration,operationId:op,action:resultAction,applied,...rest}=value as Record<string,unknown>;
  if(recoveryGeneration!==source.generation||op!==operationId||resultAction!==action||applied!==true||rest.memberNumber!==owner||rest.revision!==(action==='profile-put'?revision+1:revision)||!Number.isSafeInteger(rest.revision))throw new CloudError('invalid_response');
  if(action==='profile-delete'&&(rest.removed!==true||Object.keys(rest).sort().join(',')!=='memberNumber,removed,revision'))throw new CloudError('invalid_response');
  if(action==='profile-put'&&(typeof rest.displayName!=='string'||typeof rest.visible!=='boolean'))throw new CloudError('invalid_response');
  return rest as unknown as CloudProfile;
}
export function profileUploadReceipt(value:CloudMedia&{recoveryGeneration?:string},source:ProfileSource,kind:'avatar'|'banner'):CloudMedia {
  if(source.required&&(value?.recoveryGeneration!==source.generation||value.kind!==kind||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u.test(value.id)||!['bytes','width','height'].every(k=>Number.isSafeInteger(value[k as 'bytes'])&&value[k as 'bytes']>0)))throw new CloudError('invalid_response');
  return value;
}
export function profileError(error:unknown):unknown {return (error as {code?:string})?.code==='recovery_generation_required'?new ProfileGenerationError():error;}
