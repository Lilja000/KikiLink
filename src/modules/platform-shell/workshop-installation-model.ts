import {checkedCommunityTemplate} from '../../../cloud/shared/community-template.mjs';
import { checkedWorkshopDestination, WORKSHOP_DESTINATION_TYPES } from '../../core/workshop-destinations';
import type {KeyValueStorage,SettingsStore} from '../../core/settings';
import type {CustomActivityDefinition,KikiLinkSettings} from '../../core/types';
import {createBlankCustomActivity,MAX_CUSTOM_ACTIVITIES,sanitizeCustomActivities} from '../link-activities/custom-activity-library';
import {checkedWorkshopDependencies,workshopId,workshopVersion,type WorkshopRelease,type WorkshopType} from './workshop-model';

export const WORKSHOP_PERMISSIONS={
  'Community template':{id:'community-template',label:'Community template',description:'Prepare a separate editable community draft. You choose whether to create it; no members or roles are imported.'},
  'Room preset':{id:'space-presets',label:'Space presets',description:'Add a saved room preset to a Space you manage after a separate review.'},
  'Background':{id:'space-background',label:'Space background',description:'Change a managed Space’s background and room preview palette after your review.'},
  'UI theme':{id:'interface-appearance',label:'Interface appearance',description:'Change local panel colours, accent and spacing after your review.'},
  'Activity pack':{id:'activity-library',label:'Custom activities',description:'Add separate copies to your activity library when you choose Apply.'},
  'Profile theme':{id:'profile-appearance',label:'Profile appearance',description:'Prepare profile colours and avatar decoration for your review in the profile editor.'},
  'Status & emoji':{id:'status-library',label:'Status collection',description:'Choose a saved line for your profile editor. Emoji are text previews in this release.'},
} as const;
const styles=['classic','garden','midnight','glacier','sage','dusty-rose','amber','gradient'];
const motifs=['blossom','rose','starlight','laurel','thorn','moon','ribbon','wings','lotus','constellation','crest'];
const icons=['heart','moon','cup','brush','leaf','sparkles','clock','users','home','check'];
// JSON is untrusted at this boundary; every accepted field is checked below.
const record=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const only=(value:object,keys:string[])=>Object.keys(value).every(key=>keys.includes(key));
const text=(value:unknown,min:number,max:number):value is string=>typeof value==='string'&&value.trim().length>=min&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value);
const color=(value:unknown)=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value);
const angle=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=315&&value%45===0;
const positive=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>0;
export function checkedWorkshopRelease(value:unknown):WorkshopRelease {
  if(!record(value)||!only(value,['type','title','summary','description','visibility','tags','version','changelog','payload','permissions','publishedAt','deps'])||!Object.hasOwn(WORKSHOP_PERMISSIONS,value.type)||!text(value.title,3,80)||!text(value.summary,0,180)||!text(value.description,0,1200)||!text(value.changelog,0,600)||!['public','unlisted'].includes(value.visibility)||!workshopVersion(value.version)||!Array.isArray(value.tags)||value.tags.length>6||value.tags.some(tag=>!text(tag,1,24))||!positive(value.publishedAt)||!Array.isArray(value.permissions)||value.permissions.length!==1||value.permissions[0]!==WORKSHOP_PERMISSIONS[value.type as WorkshopType].id||!record(value.payload))throw new Error('This package version contains unsupported data or permissions.');
  checkedWorkshopDependencies(value.deps);
  const p=value.payload;
  if((WORKSHOP_DESTINATION_TYPES as readonly string[]).includes(value.type))checkedWorkshopDestination(value.type,p);
  else if(value.type==='Community template')checkedCommunityTemplate(p);
  else if(value.type==='Activity pack'){
    if(!only(p,['activities'])||!Array.isArray(p.activities)||!p.activities.length||p.activities.length>12||p.activities.some(item=>!record(item)||!only(item,['id','title','text','target'])||!text(item.id,1,64)||!/^[A-Za-z0-9_-]+$/.test(item.id)||!text(item.title,1,64)||!text(item.text,1,240)||!['Self','Other'].includes(item.target))||new Set(p.activities.map(item=>item.id)).size!==p.activities.length)throw new Error('Invalid activities in this version.');
  }else if(value.type==='Profile theme'){
    const g=p.gradient,d=p.decoration;
    if(!only(p,['profileStyle','gradient','decoration'])||!styles.includes(p.profileStyle)||!record(g)||!only(g,['primary','secondary','angle'])||!color(g.primary)||!color(g.secondary)||!angle(g.angle)||!record(d)||!only(d,['mode','preset','primary','secondary','angle'])||!['none','solid','gradient','preset'].includes(d.mode)||!motifs.includes(d.preset)||!color(d.primary)||!color(d.secondary)||!angle(d.angle))throw new Error('Invalid profile theme in this version.');
  }else if(!only(p,['statuses','emojis'])||!Array.isArray(p.statuses)||p.statuses.length>12||!Array.isArray(p.emojis)||p.emojis.length>12||!p.statuses.length&&!p.emojis.length||p.statuses.some(item=>!record(item)||!only(item,['text','icon'])||!text(item.text,1,80)||!icons.includes(item.icon))||p.emojis.some(item=>!record(item)||!only(item,['label','symbol'])||!text(item.label,1,32)||!text(item.symbol,1,12)))throw new Error('Invalid status collection in this version.');
  return structuredClone(value) as WorkshopRelease;
}
export const installedFingerprint=(value:InstalledWorkshopPackage|undefined)=>JSON.stringify(value??null);
export function compareWorkshopVersions(a:string,b:string):number {const left=a.split('.').map(Number),right=b.split('.').map(Number);for(let n=0;n<3;n++)if(left[n]!==right[n])return left[n]!-right[n]!;return 0;}
export interface WorkshopIdentity {id:string;author:number;authorName:string;}
export interface InstalledWorkshopPackage extends WorkshopIdentity {release:WorkshopRelease;previous:WorkshopRelease|null;enabled:boolean;grantedPermissions:string[];installedAt:number;}
interface InstalledRecord {format:1;owner:number;origin:string;items:InstalledWorkshopPackage[];}
export type WorkshopLock=(key:string,mutate:()=>void)=>Promise<unknown>;
export class WorkshopLibrary {
  readonly key:string;
  #retiredItems:unknown[]=[];
  constructor(readonly storage:KeyValueStorage,readonly owner:number,readonly origin:string,readonly current:()=>boolean,readonly lock?:WorkshopLock){if(!positive(owner)||!origin)throw new Error('A Workshop account is required.');this.key=`kikilink:workshop-installed:${encodeURIComponent(origin)}:${owner}:v1`;}
  #check():void {if(!this.current())throw new Error('Your account or connection changed. Reopen Workshop.');}
  #read():InstalledRecord {
    this.#check();this.#retiredItems=[];let raw:string|null;
    try{const result=this.storage.getItemResult?.(this.key);if(result&&!result.ok)throw new Error();raw=result?result.value:this.storage.getItem(this.key);}catch{throw new Error('Your installed library could not be read. It has been kept unchanged.');}
    if(raw===null)return{format:1,owner:this.owner,origin:this.origin,items:[]};
    try{
      if(raw.length>3e6)throw new Error();const data:unknown=JSON.parse(raw);
      if(!record(data)||!only(data,['format','owner','origin','items'])||data.format!==1||data.owner!==this.owner||data.origin!==this.origin||!Array.isArray(data.items)||data.items.length>200)throw new Error();
      const active=data.items.filter((item:unknown)=>{if(record(item)&&record(item.release)&&['Scene pack','Automation preset'].includes(item.release.type)){this.#retiredItems.push(item);return false;}return true;});
      if(active.length>100||this.#retiredItems.length>100)throw new Error();
      const seen=new Set<string>();for(const item of active){
        if(!record(item)||!only(item,['id','author','authorName','release','previous','enabled','grantedPermissions','installedAt'])||!workshopId(item.id)||seen.has(item.id)||!positive(item.author)||!text(item.authorName,1,80)||typeof item.enabled!=='boolean'||!positive(item.installedAt)||!Array.isArray(item.grantedPermissions))throw new Error();
        const release=checkedWorkshopRelease(item.release);if(item.previous!==null&&checkedWorkshopRelease(item.previous).type!==release.type)throw new Error();if(item.grantedPermissions.length>1||item.grantedPermissions.some(permission=>permission!==release.permissions[0]))throw new Error();seen.add(item.id);
      }return {...data,items:active} as InstalledRecord;
    }catch{throw new Error('Your installed library contains unsupported data. It has been kept unchanged.');}
  }
  list():InstalledWorkshopPackage[]{return structuredClone(this.#read().items);}
  async activityCopyTitles(): Promise<Map<string, string>> {
    const titles = new Map<string, string>();
    for (const item of this.list()) {
      for (const release of [item.release, item.previous]) {
        if (release?.type !== 'Activity pack') continue;
        const copies = await workshopActivityCopies(this.origin, item.id, release);
        for (const copy of copies) titles.set(copy.id, release.title);
      }
    }
    this.#check();
    return titles;
  }
  get(id:string):InstalledWorkshopPackage|undefined{return this.list().find(item=>item.id===id);}
  snapshot():string{return JSON.stringify(this.list());}
  usable(id:string,fingerprint:string):InstalledWorkshopPackage {
    const items=this.list(),root=items.find(item=>item.id===id);if(!root||installedFingerprint(root)!==fingerprint)throw new Error('This installation changed or is disabled. Review it again.');
    const done=new Set<string>(),visit=(item:InstalledWorkshopPackage,path:Set<string>)=>{
      if(path.has(item.id)||!item.enabled||item.release.permissions.some(permission=>!item.grantedPermissions.includes(permission)))throw new Error('This installation or a dependency is disabled or invalid. Review it again.');if(done.has(item.id))return;
      const next=new Set(path).add(item.id);for(const dep of item.release.deps??[]){const child=items.find(candidate=>candidate.id===dep.id);if(!child||compareWorkshopVersions(child.release.version,dep.minVersion)<0)throw new Error('A required dependency is missing or too old.');visit(child,next);}done.add(item.id);
    };visit(root,new Set());return root;
  }
  async #mutate(update:(data:InstalledRecord)=>void,review:()=>boolean):Promise<void>{
    this.#check();const commit=()=>{
      if(!review())throw new Error('Review closed. Reopen the installation.');const data=this.#read();update(data);if(data.items.length>100)throw new Error('Your installed library holds up to 100 packages.');
      const raw=JSON.stringify({...data,items:[...data.items,...this.#retiredItems]});if(raw.length>3e6)throw new Error('Your installed library is full.');this.#check();if(!review())throw new Error('Review closed.');
      try{this.storage.setItem(this.key,raw);const result=this.storage.getItemResult?.(this.key);if(result?!result.ok||result.value!==raw:this.storage.getItem(this.key)!==raw)throw new Error();}catch{throw new Error('The library save could not be confirmed. Refresh Installed before retrying.');}
    };
    if(this.lock)await this.lock(this.key,commit);else if(globalThis.navigator?.locks)await navigator.locks.request(this.key,commit);else throw new Error('This browser cannot coordinate changes between tabs. Web Locks support is required.');
  }
  #entry(identity:WorkshopIdentity,release:WorkshopRelease,old:InstalledWorkshopPackage|undefined):InstalledWorkshopPackage {
    const checked=checkedWorkshopRelease(release);assertWorkshopIdentity(identity);
    if(old&&(old.author!==identity.author||old.release.type!==checked.type))throw new Error('Package identity changed.');if(old?.release.version===checked.version&&workshopReleaseFingerprint(old.release)!==workshopReleaseFingerprint(checked))throw new Error('A published version changed unexpectedly.');
    return{id:identity.id,author:identity.author,authorName:identity.authorName,release:checked,previous:old&&old.release.version!==checked.version?old.release:old?.previous??null,enabled:true,grantedPermissions:[...checked.permissions],installedAt:Date.now()};
  }
  async install(identity:WorkshopIdentity,release:WorkshopRelease,fingerprint:string,review:()=>boolean=()=>true):Promise<void>{
    identity=structuredClone(identity);release=checkedWorkshopRelease(release);
    await this.#mutate(data=>{const index=data.items.findIndex(item=>item.id===identity.id),old=data.items[index];if(installedFingerprint(old)!==fingerprint)throw new Error('Another tab changed this installation. Review it again.');const next=this.#entry(identity,release,old);if(index<0)data.items.push(next);else data.items[index]=next;validateInstalledGraph(data.items);},review);
  }
  async installPlan(plan:WorkshopInstallationPlan,review:()=>boolean=()=>true):Promise<void>{
    const captured=structuredClone(plan);await this.#mutate(data=>{
      if(JSON.stringify(data.items)!==captured.expectedState)throw new Error('Another tab changed your installed library. Review it again.');if(!captured.entries.length||captured.entries.length>32||new Set(captured.entries.map(entry=>entry.meta.id)).size!==captured.entries.length||!captured.entries.some(entry=>entry.meta.id===captured.rootId))throw new Error('Invalid installation plan.');
      for(const entry of captured.entries){const index=data.items.findIndex(item=>item.id===entry.meta.id),old=data.items[index],next=this.#entry(entry.meta,entry.release,old);if(index<0)data.items.push(next);else data.items[index]=next;}validateInstalledGraph(data.items);
    },review);
  }
  async disable(id:string,fingerprint:string,review:()=>boolean=()=>true):Promise<void>{await this.#remove(id,fingerprint,false,review);}
  async uninstall(id:string,fingerprint:string,review:()=>boolean=()=>true):Promise<void>{await this.#remove(id,fingerprint,true,review);}
  async #remove(id:string,fingerprint:string,uninstall:boolean,review:()=>boolean):Promise<void>{
    await this.#mutate(data=>{
      const index=data.items.findIndex(item=>item.id===id),old=data.items[index];if(installedFingerprint(old)!==fingerprint)throw new Error('Another tab changed this installation. Review it again.');const dependents=data.items.filter(item=>item.id!==id&&(uninstall||item.enabled)&&item.release.deps?.some(dep=>dep.id===id));
      if(dependents.length)throw new Error(`${dependents.map(item=>item.release.title).join(', ')} requires this package. ${uninstall?'Uninstall':'Disable'} the dependent package first.`);
      if(uninstall){if(index>=0)data.items.splice(index,1);}else{if(!old)throw new Error('Package is no longer installed.');data.items[index]={...old,enabled:false,grantedPermissions:[]};}
    },review);
  }
}
export interface WorkshopPlanEntry {meta:WorkshopIdentity;release:WorkshopRelease;remote:boolean;}
export interface WorkshopInstallationPlan {rootId:string;entries:WorkshopPlanEntry[];expectedState:string;}
export function assertWorkshopIdentity(identity:WorkshopIdentity):void {if(!identity||!workshopId(identity.id)||!positive(identity.author)||!text(identity.authorName,1,80))throw new Error('Invalid package identity.');}
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):record(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const workshopReleaseFingerprint=(release:WorkshopRelease):string=>JSON.stringify(canonical({...checkedWorkshopRelease(release),deps:release.deps??[]}));
export function validateInstalledGraph(items:InstalledWorkshopPackage[]):void {
  const entries=new Map(items.map(item=>[item.id,item])),done=new Set<string>(),visit=(item:InstalledWorkshopPackage,path:Set<string>)=>{
    if(path.has(item.id))throw new Error('Dependency cycle. No packages were changed.');if(done.has(item.id))return;const next=new Set(path).add(item.id);
    for(const dep of item.release.deps??[]){const child=entries.get(dep.id);if(!child||compareWorkshopVersions(child.release.version,dep.minVersion)<0)throw new Error(`${item.release.title} requires dependency ${dep.id} at version ${dep.minVersion} or later.`);if(item.enabled&&(!child.enabled||child.release.permissions.some(permission=>!child.grantedPermissions.includes(permission))))throw new Error(`${item.release.title} requires an enabled dependency with reviewed permissions.`);visit(child,next);}done.add(item.id);
  };for(const item of items)visit(item,new Set());
}

export type WorkshopProfilePatch=Partial<Pick<KikiLinkSettings['linkPresence'],'statusMessage'|'profileStyle'|'profileGradient'|'avatarDecoration'>>;
export function workshopProfilePatch(release:WorkshopRelease,index?:number):WorkshopProfilePatch {
  const checked=checkedWorkshopRelease(release),p=checked.payload;
  if(checked.type==='Status & emoji'){if(!Number.isInteger(index)||!p.statuses?.[index!])throw new Error('Choose a status line first.');return{statusMessage:p.statuses[index!]!.text};}
  if(checked.type!=='Profile theme')throw new Error('This package cannot change a profile.');return{profileStyle:p.profileStyle!,profileGradient:{enabled:p.profileStyle==='gradient',...p.gradient!},avatarDecoration:p.decoration} as WorkshopProfilePatch;
}
export async function workshopActivityCopies(origin:string,id:string,release:WorkshopRelease):Promise<CustomActivityDefinition[]> {
  const checked=checkedWorkshopRelease(release);if(checked.type!=='Activity pack'||!workshopId(id))throw new Error('Invalid activity package.');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${origin}:${id}:${checked.version}`)),prefix='wk-'+Array.from(new Uint8Array(digest).slice(0,16),byte=>byte.toString(16).padStart(2,'0')).join('');
  return sanitizeCustomActivities(checked.payload.activities!.map((item,index)=>({...createBlankCustomActivity(`${prefix}-${index}`),name:item.title,template:item.text,targetMode:item.target==='Self'?'self':'other'})));
}
export function addWorkshopActivities(settings:SettingsStore,copies:CustomActivityDefinition[],current:()=>boolean):{added:number;kept:number}{
  if(!current())throw new Error('Your account or installation changed.');let added=0,kept=0;
  settings.update(draft=>{const ids=new Set(draft.linkActivities.customActivities.map(item=>item.id)),fresh=copies.filter(item=>!ids.has(item.id));added=fresh.length;kept=copies.length-added;if(draft.linkActivities.customActivities.length+added>MAX_CUSTOM_ACTIVITIES)throw new Error(`Your library has room for ${MAX_CUSTOM_ACTIVITIES-draft.linkActivities.customActivities.length} more activities. Nothing was added.`);draft.linkActivities.customActivities.push(...structuredClone(fresh));},{requirePersistence:true});return{added,kept};
}
