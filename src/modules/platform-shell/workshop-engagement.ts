import type {CloudClient} from '../../cloud/client';
import {workshopSource,requireWorkshopSource,WorkshopGenerationError,type WorkshopSource} from './workshop-generation';
export {workshopAccessAt,requireWorkshopSource,type WorkshopSource} from './workshop-generation';
/** Separate negotiation: Local173 did not bind reviews, sharing or curation. */
export function workshopEngagementSource(metadata:unknown):WorkshopSource {
 if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))throw new WorkshopGenerationError();
 const me=metadata as {features?:Record<string,unknown>};
 return workshopSource({...me,features:{...me?.features,workshopMutationRecoveryGeneration:me?.features?.workshopEngagementRecoveryGeneration}});
}
export async function engagementReview(client:CloudClient,current:()=>boolean,feature:'workshopReviews'|'workshopDiscovery',moderator=false):Promise<WorkshopSource>{
 const owner=client.memberNumber,origin=client.origin;
 const check=()=>{if(!current()||!client.connected||client.memberNumber!==owner||client.origin!==origin)throw new Error('Your Workshop view or account changed.');};
 check();const me=await client.request<{memberNumber:number;moderator?:boolean;features?:Record<string,unknown>}>('GET','/v1/me');check();
 if(me.memberNumber!==owner||me.features?.[feature]!==true||moderator&&me.moderator!==true)throw new Error(moderator?'Featured curation requires a moderator and the pending Workshop update.':'This action needs the pending Workshop update.');
 const source=workshopEngagementSource(me);if(source.restored&&!source.required)throw new WorkshopGenerationError();return source;
}
/** A verified late ACK belongs to the original request even after its view closes. */
export async function engagementWrite(client:CloudClient,source:WorkshopSource|undefined,current:()=>boolean,feature:'workshopReviews'|'workshopDiscovery',method:string,path:string,body:Record<string,unknown>,moderator=false):Promise<unknown>{
 const fresh=await engagementReview(client,current,feature,moderator);requireWorkshopSource(source,fresh);
 if(!current())throw new Error('Your Workshop view changed.');
 return client.request(method,path,{...body,...source?.required?{recoveryGeneration:source.generation}:{}});
}
export function engagementReceipt(value:unknown,expected:Record<string,unknown>,source:WorkshopSource|undefined,operationId:string,action:string):boolean{
 const wanted={...expected,...source?.required?{operationId,action,applied:true,recoveryGeneration:source.generation}:{}};
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===Object.keys(wanted).length&&Object.entries(wanted).every(([k,v])=>(value as Record<string,unknown>)[k]===v);
}
