import {CloudError,type CloudClient} from './client';
import {mediaSource,requireMediaSource,MediaGenerationError,type MediaSource} from '../../cloud/shared/media-source.mjs';
import type {CloudMedia} from './types';
export {MediaGenerationError};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u.test(v);
const integer=(v:unknown,max:number)=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<=max;
export const mediaUploadError=(e:unknown):unknown=>(e as {code?:string})?.code==='recovery_generation_required'?new MediaGenerationError():e;

/** A volatile upload attempt owns one file and its original conversation source.
 * Explicit retries keep the correlation ID; the server's existing content dedup
 * is not an exactly-once ledger. No uploads or metadata reads on construction. */
export class MediaUploadIntent {
 readonly owner:number;readonly origin:string;readonly operationId=crypto.randomUUID();
 #source:MediaSource|undefined;#asset:CloudMedia|undefined;#busy=false;
 constructor(readonly client:CloudClient,readonly file:Blob,readonly expectedGeneration:string|undefined){this.owner=client.memberNumber;this.origin=client.origin;}
 #guard(current:()=>boolean):void{
  if(!current()||!this.client.connected||this.client.memberNumber!==this.owner||this.client.origin!==this.origin)throw new CloudError('media_changed');
 }
 async preflight(current:()=>boolean):Promise<void>{
  this.#guard(current);const me=await this.client.request<unknown>('GET','/v1/me');this.#guard(current);
  if(!object(me)||me.memberNumber!==this.owner||!Number.isSafeInteger(this.owner)||this.owner<1)throw new CloudError('media_changed');
  const source=mediaSource(me);
  if((source.required||this.expectedGeneration!==undefined)&&source.generation!==this.expectedGeneration||source.restored&&!source.required&&!this.expectedGeneration)throw new MediaGenerationError();
  if(this.#source)requireMediaSource(this.#source,source);else this.#source=source;
 }
 async send(current:()=>boolean,options:{signal?:AbortSignal;onProgress?:(n:number)=>void;transport?:'request'|'upload'}={}):Promise<CloudMedia>{
  if(this.#busy)throw new CloudError('media_upload_in_progress');this.#busy=true;
  const valid=()=>current()&&!options.signal?.aborted;
  try{
   await this.preflight(valid);if(this.#asset)return {...this.#asset};
   const source=this.#source!,binding=source.required||this.expectedGeneration!==undefined?source.generation:undefined;
   const path='/v1/media/feed'+(binding?'?recoveryGeneration='+binding+(source.required?'&operationId='+this.operationId:''):'');
   const value=options.transport==='request'?await this.client.request<unknown>('POST',path,this.file):await this.client.upload<unknown>(path,this.file,{...(options.signal?{signal:options.signal}:{}),...(options.onProgress?{onProgress:options.onProgress}:{})});
   this.#guard(valid);
   if(!object(value)||!uuid(value.id))throw new CloudError('invalid_media_receipt');
   if(binding&&value.recoveryGeneration!==binding)throw new MediaGenerationError();
   if(source.required&&(Object.keys(value).sort().join(',')!==['id','kind','bytes','width','height','memberNumber','operationId','recoveryGeneration'].sort().join(',')||value.memberNumber!==this.owner||value.operationId!==this.operationId||value.kind!=='feed'||!integer(value.bytes,3*1024**2)||!integer(value.width,1920)||!integer(value.height,1920)))throw new CloudError('invalid_media_receipt');
   this.#asset={...value} as unknown as CloudMedia;
   await this.preflight(valid);return {...this.#asset};
  }catch(error){throw mediaUploadError(error);}finally{this.#busy=false;}
 }
}
