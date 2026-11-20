import type {CloudClient} from './client';

export type SafetyAction='report_submitted'|'report_appealed'|'moderation_triage'|'moderation_decision'|'moderation_restored'|'moderation_appeal'|'moderation_member'|'moderation_channel';
export interface SafetyEvent {id:string;action:SafetyAction;generation:string;scope:string;}
const sinks=new WeakMap<object,Set<(event:SafetyEvent)=>void>>();
export function observeSafetyActivity(client:object,sink:(event:SafetyEvent)=>void):()=>void {
  let set=sinks.get(client);if(!set)sinks.set(client,set=new Set());set.add(sink);return()=>set!.delete(sink);
}
const positive=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
/** Called only after the existing source/identity guard accepts an HTTP reply.
 * Receipt projections are checked again; free text never leaves this function. */
export async function confirmedSafetyActivity(client:CloudClient,method:string,path:string,body:Record<string,unknown>|undefined,value:unknown,generation:string|undefined,current=()=>true):Promise<void>{
  if(!sinks.get(client)?.size||method!=='POST'||!generation||!/^[a-f0-9]{32}$/.test(generation)||!body||!value||typeof value!=='object')return;
  const receipt=value as Record<string,unknown>,owner=client.memberNumber,origin=client.origin;
  if(receipt.recoveryGeneration!==generation)return;
  const fields=(...names:string[])=>Object.keys(receipt).sort().join(',')===[...names,'recoveryGeneration'].sort().join(',');
  let action:SafetyAction|undefined,scope='platform',key=body.operationId;
  const channelReport=/^\/v1\/communities\/([^/]+)\/channels\/[^/]+\/messages\/[^/]+\/reports$/.exec(path);
  const report=/^\/v1\/(?:moderation|communities\/([^/]+))\/reports\/([1-9]\d*)\/(triage|decision|resolve)$/.exec(path);
  const restore=/^\/v1\/(me|moderation)\/restrictions\/(community|creation|review)\/[^/]+\/(appeal|restore)$/.exec(path);
  const appeal=/^\/v1\/moderation\/appeals\/([1-9]\d*)\/decision$/.exec(path);
  const oldRestore=/^\/v1\/moderation\/community-restrictions\/([^/]+)\/restore$/.exec(path);
  const member=/^\/v1\/communities\/([^/]+)\/members\/[1-9]\d*$/.exec(path);
  const channel=/^\/v1\/communities\/([^/]+)\/channels\/([^/]+)\/archive$/.exec(path);
  if((path==='/v1/reports'||channelReport)&&positive(receipt.id)&&fields('id')){
    action='report_submitted';scope=channelReport?.[1]??'platform';key=`report:${scope}:${receipt.id}`;
  }else if(report&&uuid(key)&&receipt.id===Number(report[2])&&positive(body.revision)&&
    (report[3]==='resolve'?fields('id','status')&&['removed','dismissed','unavailable'].includes(String(receipt.status)):
      fields('id','revision')&&(receipt.revision===body.revision+1||report[3]==='triage'&&receipt.revision===body.revision))){
    action=report[3]==='triage'?'moderation_triage':'moderation_decision';scope=report[1]??'platform';
  }else if((restore||appeal)&&uuid(key)&&receipt.operationId===key&&positive(body.revision)&&
    fields('operationId','revision',...(restore?.[3]==='appeal'||appeal?['id']:[]))&&receipt.revision===(restore?.[3]==='appeal'?1:body.revision+1)&&
    (appeal?receipt.id===Number(appeal[1]):restore?.[3]!=='appeal'||positive(receipt.id))){
    action=restore?.[1]==='me'?'report_appealed':appeal?'moderation_appeal':'moderation_restored';
  }else if(oldRestore&&uuid(key)&&fields('communityId','revision')&&receipt.communityId===oldRestore[1]&&positive(body.revision)&&receipt.revision===body.revision+1){
    action='moderation_restored';
  }else if(member&&fields('communityId','revision')&&uuid(key)&&receipt.communityId===member[1]&&positive(body.revision)&&receipt.revision===body.revision+1&&
    ['role','remove','ban','unban','approve','reject'].includes(String(body.action))){action='moderation_member';scope=member[1]!;
  }else if(channel&&fields('communityId','channelId')&&uuid(key)&&receipt.communityId===channel[1]&&receipt.channelId===channel[2]&&typeof body.archived==='boolean'){
    action='moderation_channel';scope=channel[1]!;
  }
  if(!action||scope!=='platform'&&!uuid(scope))return;
  try{
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([owner,origin,generation,action,key])));
    if(!current()||!client.connected||client.memberNumber!==owner||client.origin!==origin)return;
    const id=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
    for(const sink of sinks.get(client)??[])try{sink({id,action,generation,scope});}catch{/* Local audit cannot change an acknowledged Cloud action. */}
  }catch{/* Auditing is optional; never turn a confirmed action into an unsafe retry. */}
}
