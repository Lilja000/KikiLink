import type {CloudClient} from '../../cloud/client';

export interface MusicSource {readonly required:boolean;readonly generation?:string;readonly restored?:boolean;}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class MusicGenerationError extends Error {constructor(){super('Listening sessions changed after recovery. The original request is kept for review; forget it before starting a new action.');}}
export function checkedMusicSource(v:unknown):MusicSource {
 if(!object(v)||Object.keys(v).some(k=>!['required','generation','restored'].includes(k))||typeof v.required!=='boolean'||v.generation!==undefined&&!generation(v.generation)||v.restored!==undefined&&typeof v.restored!=='boolean'||v.required&&(!generation(v.generation)||typeof v.restored!=='boolean'))throw new MusicGenerationError();
 return structuredClone(v) as unknown as MusicSource;
}
export function musicSource(metadata:unknown):MusicSource {
 if(!object(metadata))throw new MusicGenerationError();
 const flag=object(metadata.features)?metadata.features.musicSessionRecoveryGeneration:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new MusicGenerationError();
 return Object.freeze(checkedMusicSource({required:flag===true,...object(r)?{generation:r.generation,restored:r.restored}:{}}));
}
export const sameMusicSource=(a:MusicSource,b:MusicSource)=>a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;
/** Capture admission once; verify and strip only the transport echo before strict parsing. */
export function musicAccessAt(client:CloudClient,source:MusicSource,current:()=>boolean=()=>true){
 const original=checkedMusicSource(source),owner=client.memberNumber,origin=client.origin;
 const valid=()=>client.connected&&client.memberNumber===owner&&client.origin===origin&&current();
 const guard=()=>{if(!valid()||original.restored&&!original.required)throw new MusicGenerationError();};
 return {current:valid,request:async<T>(method:'GET'|'POST',path:string,body?:Record<string,unknown>):Promise<T>=>{
  guard();const result=await client.request<unknown>(method,path+(method==='GET'&&original.required?`${path.includes('?')?'&':'?'}recoveryGeneration=${original.generation}`:''),method==='POST'?{...body,...original.required?{recoveryGeneration:original.generation}:{}}:undefined);guard();
  if(!original.required)return result as T;
  if(!object(result)||result.recoveryGeneration!==original.generation)throw new MusicGenerationError();
  const {recoveryGeneration,...value}=result;return value as T;
 }};
}
export const musicAction=(path:string,body:Record<string,unknown>)=>path==='/v1/music-sessions'?'create':String(body.action);
