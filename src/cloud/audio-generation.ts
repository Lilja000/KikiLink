import {CloudError,type CloudClient} from './client';
import {audioSource,requireAudioSource,AudioGenerationError,type AudioSource} from '../../cloud/shared/audio-source.mjs';
export * from '../../cloud/shared/audio-source.mjs';
type Client=Pick<CloudClient,'memberNumber'|'origin'|'connected'|'request'>;
export interface AudioReview {readonly owner:number;readonly origin:string;readonly source:AudioSource;}
export function audioGuard(client:Client,review:AudioReview,valid:()=>boolean):void{
 if(!valid()||!client.connected||client.memberNumber!==review.owner||client.origin!==review.origin)throw new CloudError('audio_library_changed');
}
export async function audioMetadata(client:Client,valid:()=>boolean):Promise<AudioReview>{
 const owner=client.memberNumber,origin=client.origin;if(!valid()||!client.connected)throw new CloudError('audio_library_changed');
 const me=await client.request<{memberNumber:number}>('GET','/v1/me');
 if(!valid()||client.memberNumber!==owner||client.origin!==origin||!client.connected||!me||me.memberNumber!==owner||!Number.isSafeInteger(owner)||owner<1)throw new CloudError('audio_library_changed');
 return Object.freeze({owner,origin,source:audioSource(me)});
}
export async function audioPreflight(client:Client,review:AudioReview,valid:()=>boolean):Promise<void>{
 audioGuard(client,review,valid);const fresh=await audioMetadata(client,valid);audioGuard(client,review,valid);requireAudioSource(review.source,fresh.source);
}
export function audioExpected(review:AudioReview,generation:string|undefined):void{
 if(review.source.required&&review.source.generation!==generation)throw new AudioGenerationError();
}
export const audioPath=(path:string,review:AudioReview):string=>review.source.required?path+(path.includes('?')?'&':'?')+'recoveryGeneration='+review.source.generation:path;
export const audioBody=(review:AudioReview):Record<string,unknown>=>review.source.required?{recoveryGeneration:review.source.generation}:{};
export function audioRead<T>(value:unknown,review:AudioReview):T{
 if(!review.source.required)return value as T;
 if(!value||typeof value!=='object'||Array.isArray(value)||(value as any).recoveryGeneration!==review.source.generation||(value as any).memberNumber!==review.owner)throw new AudioGenerationError();
 const {recoveryGeneration,memberNumber,...rest}=value as Record<string,unknown>;return rest as T;
}
export function audioUploadReceipt(value:unknown,review:AudioReview,clientId:string,purpose:'library'|'message',title:string,maxBytes:number):void{
 if(!review.source.required)return;
 const r=value as Record<string,unknown>;
 if(!r||Array.isArray(r)||Object.keys(r).sort().join(',')!==['id','title','mime','bytes','createdAt','memberNumber','clientId','purpose','recoveryGeneration'].sort().join(',')||r.memberNumber!==review.owner||r.recoveryGeneration!==review.source.generation||r.clientId!==clientId||r.purpose!==purpose||r.title!==title||r.mime!=='audio/mpeg'||typeof r.id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(r.id)||!Number.isSafeInteger(r.bytes)||Number(r.bytes)<1||Number(r.bytes)>maxBytes||!Number.isSafeInteger(r.createdAt)||Number(r.createdAt)<1)throw new CloudError('invalid_audio_item');
}
export function audioDeleteReceipt(value:unknown,review:AudioReview,operationId:string,id:string):void{
 if(!review.source.required)return;const expected={memberNumber:review.owner,operationId,action:'audio-delete',id,deleted:true,recoveryGeneration:review.source.generation};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==Object.keys(expected).sort().join(',')||Object.entries(expected).some(([k,v])=>(value as any)[k]!==v))throw new CloudError('invalid_audio_item');
}
export function audioError(error:unknown):unknown{return (error as {code?:string})?.code==='recovery_generation_required'?new AudioGenerationError():error;}
