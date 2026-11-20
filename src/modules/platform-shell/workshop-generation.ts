import type {CloudClient} from '../../cloud/client';
import {checkedWorkshopSource,WorkshopGenerationError,type WorkshopSource} from '../../../cloud/shared/workshop-source.mjs';
export * from '../../../cloud/shared/workshop-source.mjs';
/** The source belongs to the reviewed content, never to the moment of retry. */
export function workshopAccessAt(client:CloudClient,source:WorkshopSource,current:()=>boolean=()=>true){
 const original=checkedWorkshopSource(source),owner=client.memberNumber,origin=client.origin;
 const guard=()=>{if(!current()||!client.connected||client.memberNumber!==owner||client.origin!==origin||original.restored&&!original.required)throw new WorkshopGenerationError();};
 return {request:async<T>(method:string,path:string,body?:unknown):Promise<T>=>{
  guard();const value=await client.request<unknown>(method,path+(method==='GET'&&original.required?`${path.includes('?')?'&':'?'}recoveryGeneration=${original.generation}`:''),method==='GET'?undefined:{...body as object,...original.required?{recoveryGeneration:original.generation}:{}});guard();
  if(!original.required)return value as T;
  if(!value||typeof value!=='object'||Array.isArray(value)||!('recoveryGeneration'in value)||value.recoveryGeneration!==original.generation)throw new WorkshopGenerationError();
  const {recoveryGeneration,...rest}=value;return rest as T;
 }};
}
