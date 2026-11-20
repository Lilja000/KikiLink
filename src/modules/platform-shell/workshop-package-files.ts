import {CloudError,type CloudClient} from '../../cloud/client';
import {workshopId,type WorkshopDetail,type WorkshopRelease} from './workshop-model';
import {assertWorkshopIdentity,checkedWorkshopRelease,compareWorkshopVersions,validateInstalledGraph,workshopReleaseFingerprint,type InstalledWorkshopPackage,type WorkshopIdentity,type WorkshopInstallationPlan,type WorkshopPlanEntry} from './workshop-installation-model';
export const WORKSHOP_FILE_MAX_BYTES=256*1024;
const metadata=(identity:WorkshopIdentity):WorkshopIdentity=>({id:identity.id,author:identity.author,authorName:identity.authorName});
const installed=(entry:WorkshopPlanEntry):InstalledWorkshopPackage=>({...entry.meta,release:entry.release,previous:null,enabled:true,grantedPermissions:[...entry.release.permissions],installedAt:1});
const record=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const only=(value:object,keys:string[])=>Object.keys(value).every(key=>keys.includes(key));
const validOrigin=(value:unknown):value is string=>{try{if(typeof value!=='string'||value.length>300)return false;const url=new URL(value);return url.origin===value&&['https:','http:'].includes(url.protocol);}catch{return false;}};
export interface WorkshopPackageFile {format:1;kind:'kikilink-workshop';origin:string;rootId:string;packages:Array<WorkshopIdentity&{release:WorkshopRelease}>;}
export function parseWorkshopPackageFile(raw:string,origin:string):WorkshopPackageFile {
  if(new TextEncoder().encode(raw).byteLength>WORKSHOP_FILE_MAX_BYTES)throw new Error('Package files must be at most 256 KiB.');let data:unknown;try{data=JSON.parse(raw);}catch{throw new Error('Choose a valid Workshop JSON package file.');}
  if(!record(data)||!only(data,['format','kind','origin','rootId','packages'])||data.format!==1||data.kind!=='kikilink-workshop'||!validOrigin(data.origin)||data.origin!==origin||!workshopId(data.rootId)||!Array.isArray(data.packages)||!data.packages.length||data.packages.length>32)throw new Error('Unsupported package file or a different Cloud service.');
  const entries:WorkshopPlanEntry[]=data.packages.map(item=>{if(!record(item)||!only(item,['id','author','authorName','release']))throw new Error('Unsupported package metadata.');assertWorkshopIdentity(item as WorkshopIdentity);return{meta:metadata(item as WorkshopIdentity),release:checkedWorkshopRelease(item.release),remote:true};});
  const ids=new Set(entries.map(entry=>entry.meta.id));if(ids.size!==entries.length||!ids.has(data.rootId))throw new Error('Duplicate package IDs or a missing root.');validateInstalledGraph(entries.map(installed));
  const reachable=new Set<string>(),visit=(id:string)=>{if(reachable.has(id))return;reachable.add(id);for(const dep of entries.find(entry=>entry.meta.id===id)!.release.deps??[])visit(dep.id);};visit(data.rootId);if(reachable.size!==entries.length)throw new Error('The file contains packages unrelated to this creation.');
  return{format:1,kind:'kikilink-workshop',origin:data.origin,rootId:data.rootId,packages:entries.map(entry=>({...entry.meta,release:entry.release}))};
}
export function exportWorkshopPackageFile(origin:string,rootId:string,items:InstalledWorkshopPackage[]):string {
  const packages:WorkshopPackageFile['packages']=[],seen=new Set<string>(),visit=(id:string)=>{if(seen.has(id))return;seen.add(id);if(seen.size>32)throw new Error('A portable package can contain up to 32 creations.');const item=items.find(entry=>entry.id===id);if(!item)throw new Error('A required dependency is missing.');for(const dep of item.release.deps??[])visit(dep.id);packages.push({...metadata(item),release:item.release});};visit(rootId);
  const file:WorkshopPackageFile={format:1,kind:'kikilink-workshop',origin,rootId,packages},raw=JSON.stringify(file,null,2);parseWorkshopPackageFile(raw,origin);return raw;
}
export function workshopFilePlan(file:WorkshopPackageFile,items:InstalledWorkshopPackage[]):WorkshopInstallationPlan {
  const checked=parseWorkshopPackageFile(JSON.stringify(file),file.origin);return{rootId:checked.rootId,expectedState:JSON.stringify(items),entries:checked.packages.map(item=>({meta:metadata(item),release:item.release,remote:true}))};
}
export async function resolveWorkshopPlan(client:Pick<CloudClient,'request'>,root:WorkshopIdentity,release:WorkshopRelease,remote:boolean,items:InstalledWorkshopPackage[],current:()=>boolean):Promise<WorkshopInstallationPlan> {
  const entries:WorkshopPlanEntry[]=[],visiting=new Set<string>(),resolved=new Map<string,WorkshopPlanEntry>();let count=0;const check=()=>{if(!current())throw new Error('Review closed.');};
  const visit=async(identity:WorkshopIdentity,version:WorkshopRelease,fromCloud:boolean)=>{
    check();assertWorkshopIdentity(identity);version=checkedWorkshopRelease(version);if(visiting.has(identity.id))throw new Error('Dependency cycle. No packages were changed.');if(resolved.has(identity.id))return;if(++count>32)throw new Error('A dependency plan can contain up to 32 packages.');visiting.add(identity.id);
    for(const dep of version.deps??[]){
      if(visiting.has(dep.id))throw new Error('Dependency cycle. No packages were changed.');const earlier=resolved.get(dep.id);if(earlier){if(compareWorkshopVersions(earlier.release.version,dep.minVersion)<0)throw new Error('Dependency version requirements conflict. Review the dependency first.');continue;}
      const saved=items.find(item=>item.id===dep.id);let chosen:WorkshopPlanEntry|undefined;
      try{const detail=await client.request<WorkshopDetail>('GET','/v1/workshop/'+dep.id);check();if(detail.id!==dep.id||saved&&(detail.author!==saved.author||detail.type!==saved.release.type))throw new Error('Package identity changed.');if(detail.status==='published'){const versions=detail.versions.map(checkedWorkshopRelease).filter(candidate=>candidate.type===detail.type&&compareWorkshopVersions(candidate.version,dep.minVersion)>=0).sort((a,b)=>compareWorkshopVersions(b.version,a.version));if(versions[0])chosen={meta:metadata(detail),release:versions[0],remote:true};}}
      catch(error){if(!(error instanceof CloudError&&[403,404].includes(error.status)))throw error;}
      check();if(saved&&compareWorkshopVersions(saved.release.version,dep.minVersion)>=0&&(!chosen||compareWorkshopVersions(saved.release.version,chosen.release.version)>=0))chosen={meta:metadata(saved),release:saved.release,remote:false};if(!chosen)throw new Error(`Dependency ${dep.id} needs an accessible version ${dep.minVersion} or later.`);await visit(chosen.meta,chosen.release,chosen.remote);
    }
    visiting.delete(identity.id);const entry={meta:metadata(identity),release:version,remote:fromCloud};resolved.set(identity.id,entry);entries.push(entry);
  };
  await visit(root,release,remote);const projected=items.filter(item=>!resolved.has(item.id)).concat(entries.map(installed));validateInstalledGraph(projected);return{rootId:root.id,entries,expectedState:JSON.stringify(items)};
}
export async function verifyWorkshopPlan(client:Pick<CloudClient,'request'>,plan:WorkshopInstallationPlan,current:()=>boolean):Promise<void> {
  for(const entry of plan.entries){
    if(!current())throw new Error('Review closed.');if(!entry.remote)continue;const detail=await client.request<WorkshopDetail>('GET','/v1/workshop/'+entry.meta.id);if(!current())throw new Error('Review closed.');const release=detail.versions?.find(candidate=>candidate.version===entry.release.version);
    if(detail.id!==entry.meta.id||detail.author!==entry.meta.author||detail.type!==entry.release.type||detail.status!=='published'||!release||workshopReleaseFingerprint(release)!==workshopReleaseFingerprint(entry.release))throw new Error('This publication changed or is no longer accessible. Review it again.');assertWorkshopIdentity(detail);entry.meta.authorName=detail.authorName;
  }
}
export function downloadWorkshopPackageFile(raw:string,id:string):void {
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),anchor=document.createElement('a');anchor.href=url;anchor.download=`KikiLink-Workshop-${id}.json`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
