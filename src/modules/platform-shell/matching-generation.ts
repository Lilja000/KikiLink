import type {CloudClient} from '../../cloud/client';

export interface MatchingSource {readonly required:boolean;readonly generation?:string;readonly restored?:boolean;}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class MatchingGenerationError extends Error {constructor(){super('Matching changed after recovery. The original request is kept for review; forget it before starting a new action.');}}
export function checkedMatchingSource(v:unknown):MatchingSource {
 if(!object(v)||Object.keys(v).some(k=>!['required','generation','restored'].includes(k))||typeof v.required!=='boolean'||v.generation!==undefined&&!generation(v.generation)||v.restored!==undefined&&typeof v.restored!=='boolean'||v.required&&(!generation(v.generation)||typeof v.restored!=='boolean'))throw new MatchingGenerationError();
 return structuredClone(v) as unknown as MatchingSource;
}
function matchingSource(metadata:unknown,feature:string):MatchingSource {
 if(!object(metadata))throw new MatchingGenerationError();
 const flag=object(metadata.features)?metadata.features[feature]:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new MatchingGenerationError();
 return Object.freeze(checkedMatchingSource({required:flag===true,...object(r)?{generation:r.generation,restored:r.restored}:{}}));
}
export const matchingGroupSource=(metadata:unknown)=>matchingSource(metadata,'matchingGroupRecoveryGeneration');
export const matchingPeopleSource=(metadata:unknown)=>matchingSource(metadata,'matchingPeopleRecoveryGeneration');
export const sameMatchingSource=(a:MatchingSource,b:MatchingSource)=>a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;
/** Strip only the verified transport echo before strict domain parsing. */
export function matchingReadAt(client:CloudClient,source:MatchingSource){
 const original=checkedMatchingSource(source),owner=client.memberNumber,origin=client.origin;
 const guard=()=>{if(!client.connected||client.memberNumber!==owner||client.origin!==origin)throw new MatchingGenerationError();};
 return async<T>(path:string):Promise<T>=>{
  guard();const result=await client.request<unknown>('GET',path+(original.required?`${path.includes('?')?'&':'?'}recoveryGeneration=${original.generation}`:''));guard();
  if(!original.required)return result as T;
  if(!object(result)||result.recoveryGeneration!==original.generation)throw new MatchingGenerationError();
  const {recoveryGeneration,...value}=result;return value as T;
 };
}
export const matchingResourceMutation=(path:string)=>/^\/v1\/matching\/(groups|group-requests|resource-choices)(?:\/|$)/u.test(path);
export function matchingAction(path:string):string {
 if(!matchingResourceMutation(path))return path==='/v1/matching/me'?'person-signal':path.startsWith('/v1/matching/choices/')?'person-choice':path==='/v1/matching/requests'?'person-request':'person-decision';
 return path==='/v1/matching/groups'?'group-create':path.startsWith('/v1/matching/groups/')?'group-save':path.startsWith('/v1/matching/resource-choices/')?'resource-choice':path==='/v1/matching/group-requests'?'group-request':'group-decision';
}
/** Original values, without UUIDs, revisions or transport internals. */
export function matchingPendingText(body:Record<string,unknown>):string {
 const labels:Record<string,string>={group:'Group',signal:'Signal',title:'Title',description:'Description',capacity:'Places',published:'Published',visibility:'Audience',availability:'Availability',intent:'Intent',intents:'Intents',message:'Message',action:'Decision',saved:'Saved',hidden:'Hidden',languages:'Languages',interests:'Interests',days:'Days (Monday = 0)',from:'From',to:'Until',utcOffset:'UTC offset',duration:'Duration (minutes)',target:'Member number'};
 const lines=(v:Record<string,unknown>,indent=''):string[]=>Object.entries(v).filter(([k])=>!['operationId','revision','groupRevision','senderRevision','ownRevision','peerRevision','groupId','communityId','recoveryGeneration'].includes(k)).flatMap(([k,v])=>object(v)?[indent+(labels[k]??k)+':',...lines(v,indent+'  ')]:[indent+(labels[k]??k)+': '+(Array.isArray(v)?v.join(', '):typeof v==='boolean'?v?'Yes':'No':v===null?'None':String(v))]);
 return lines(body).join('\n');
}
