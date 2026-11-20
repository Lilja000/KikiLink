import {WORKSHOP_TYPES,newWorkshopDraft,workshopId,workshopVersion,type WorkshopType,type WorkshopPayload,type WorkshopDraft,type WorkshopDependency} from '../../../cloud/shared/workshop-drafts.mjs';
export {WORKSHOP_TYPES,newWorkshopDraft,workshopId,workshopVersion};
export type {WorkshopType,WorkshopPayload,WorkshopDraft,WorkshopDependency};
import {checkedCommunityTemplate} from '../../../cloud/shared/community-template.mjs';
import { checkedWorkshopDestination, WORKSHOP_DESTINATION_TYPES } from '../../core/workshop-destinations';
import { element } from '../../cloud/dom';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
export interface WorkshopRelease extends WorkshopDraft {permissions:string[];publishedAt:number;}
export interface WorkshopDiscoveryInfo {installs:number;featured:boolean;featuredUntil:number|null;recommended?:boolean;}
export interface WorkshopSummary {discovery?:WorkshopDiscoveryInfo;rating?:{count:number;average:number|null};id:string;author:number;authorName:string;type:WorkshopType;status:'draft'|'published'|'archived';visibility:'public'|'unlisted';title:string;summary:string;tags:string[];version:string|null;createdAt:number;publishedAt:number|null;revision?:number;hasDraft?:boolean;}
export interface WorkshopPage {items:WorkshopSummary[];nextCursor:number|null;}
export type WorkshopRemixSource=null|{available:false}|{available:true;packageId:string;version:string;title:string;author:number;authorName:string};
export interface WorkshopDetail extends WorkshopSummary {versions:WorkshopRelease[];draft?:WorkshopDraft|null;remixSource?:WorkshopRemixSource;}
export function checkedWorkshopDependencies(value:unknown):WorkshopDependency[] {
  if(value===undefined)return[];
  if(!Array.isArray(value)||value.length>4||value.some(item=>!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!['id','minVersion'].includes(key))||!workshopId(item.id)||!workshopVersion(item.minVersion))||new Set(value.map(item=>item.id)).size!==value.length)throw new Error('Use up to 4 different package IDs with minimum versions.');return structuredClone(value);
}
export const workshopNote=(text:string)=>element('p',{className:'kl-profile-section-note',text});
export function checkedWorkshopPage(page:WorkshopPage,cursor=0,limit=20,owner?:number,publicOnly=false):WorkshopPage {
  if(!page||!Array.isArray(page.items)||page.items.length>limit||page.nextCursor!==null&&(!Number.isSafeInteger(page.nextCursor)||page.nextCursor<=0||cursor>0&&page.nextCursor>=cursor||!page.items.length))throw new Error('Invalid Workshop page');
  page.items.splice(0,page.items.length,...page.items.filter(item=>!item||!['Scene pack','Automation preset'].includes(item.type)));
  const seen=new Set<string>();
  for(const item of page.items){
    if(!item||!workshopId(item.id)||seen.has(item.id)||!Number.isSafeInteger(item.author)||item.author<=0||owner!==undefined&&item.author!==owner||typeof item.authorName!=='string'||!item.authorName||item.authorName.length>80||!WORKSHOP_TYPES.includes(item.type)||!['draft','published','archived'].includes(item.status)||!['public','unlisted'].includes(item.visibility)||publicOnly&&(item.status!=='published'||item.visibility!=='public')||typeof item.title!=='string'||item.title.length<3||item.title.length>80||typeof item.summary!=='string'||item.summary.length>180||!Array.isArray(item.tags)||item.tags.length>6||item.tags.some(tag=>typeof tag!=='string'||!tag||tag.length>24)||!Number.isSafeInteger(item.createdAt)||item.createdAt<=0||item.version!==null&&!workshopVersion(item.version)||item.status!=='draft'&&(!item.version||!Number.isSafeInteger(item.publishedAt)||item.publishedAt!<=0)||item.revision!==undefined&&(!Number.isSafeInteger(item.revision)||item.revision<=0)||item.hasDraft!==undefined&&typeof item.hasDraft!=='boolean')throw new Error('Invalid Workshop creation');
    if(item.rating&&(!Number.isSafeInteger(item.rating.count)||item.rating.count<0||item.rating.count===0&&item.rating.average!==null||item.rating.count>0&&(typeof item.rating.average!=='number'||!Number.isFinite(item.rating.average)||item.rating.average<1||item.rating.average>5)))throw new Error('Invalid rating');
    const d=item.discovery;if(d!==undefined&&(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!['installs','featured','featuredUntil','recommended'].includes(k))||!Number.isSafeInteger(d.installs)||d.installs<0||typeof d.featured!=='boolean'||(d.featured?(!Number.isSafeInteger(d.featuredUntil)||d.featuredUntil!<=0||item.visibility!=='public'||item.status!=='published'):d.featuredUntil!==null)||d.recommended!==undefined&&typeof d.recommended!=='boolean'))throw new Error('Invalid discovery information');
    seen.add(item.id);
  }
  return page;
}
export const workshopTypeIcons:Readonly<Record<WorkshopType,KikiLinkIconName>>={'Activity pack':'activities','Status & emoji':'chat','Profile theme':'appearance','Community template':'users','Room preset':'door','Background':'image','UI theme':'settings'};
export function workshopTypePreview(type:WorkshopType):HTMLElement {
  return element('div',{className:`kl-workshop-type-preview kl-workshop-type-${type.toLowerCase().replace(/[^a-z]+/g,'-')}`,ariaHidden:'true'},kikiIcon(workshopTypeIcons[type]),element('span',{text:type}));
}
export function workshopCard(item:WorkshopSummary,open?:()=>void,detailsLabel='View creation'):HTMLElement {
  const title=open?element('button',{type:'button',className:'kl-workshop-title',text:item.title,title:item.title}):element('strong',{className:'kl-workshop-title',text:item.title});
  if(open)title.addEventListener('click',open);
  const tags=element('div',{className:'kl-workshop-tags'});
  if(item.discovery?.featured)tags.append(element('span',{className:'kl-workshop-badge kl-workshop-badge--featured',text:'Featured'}));
  if(item.status!=='published')tags.append(element('span',{className:'kl-workshop-badge',text:item.status==='draft'?'Draft':'Archived'}));
  if(item.hasDraft)tags.append(element('span',{className:'kl-workshop-badge',text:'Unpublished edits'}));
  tags.append(...item.tags.slice(0,2).map(text=>element('span',{className:'kl-workshop-tag',text})));
  const meta=element('div',{className:'kl-workshop-meta'});
  if(item.rating)meta.append(element('span',{},kikiIcon('star'),item.rating.count?`${item.rating.average!.toFixed(1)} / 5 · ${item.rating.count} ${item.rating.count===1?'review':'reviews'}`:'No reviews yet.'));
  if(item.discovery)meta.append(element('span',{text:`${item.discovery.installs} reported installs`}));
  const footer=element('footer',{className:'kl-workshop-card-footer'});
  if(open){const button=element('button',{type:'button',className:'kl-text-button',text:detailsLabel});button.addEventListener('click',open);footer.append(button);}
  const body=element('div',{className:'kl-workshop-card-body'},element('span',{className:'kl-workshop-sr-only',text:item.type}),element('div',{className:'kl-workshop-card-heading'},title),element('small',{className:'kl-workshop-author',text:`By ${item.authorName} · ${item.version?`v${item.version}`:'Draft'}`}),element('p',{className:'kl-workshop-summary',text:item.summary}),meta,tags,footer);
  return element('article',{className:'kl-workshop-card kl-profile-activity-row'},workshopTypePreview(item.type),body);
}
export function nextWorkshopVersion(version:string):string {
  const parts=version.split('.').map(Number);for(let i=2;i>=0;i--)if(parts[i]!<999){parts[i]=parts[i]!+1;for(let j=i+1;j<3;j++)parts[j]=0;return parts.join('.');}return version;
}
export function workshopPayloadView(draft:WorkshopDraft):HTMLElement {
  const section=element('section',{className:'kl-workshop-payload'},element('h3',{text:'Package content'})),payload=draft.payload;
  if(draft.deps?.length)section.append(element('h4',{text:'Required packages'}),...draft.deps.map(dep=>workshopNote(`${dep.id} · ${dep.minVersion} or later`)));
  if(draft.type==='Activity pack')for(const item of payload.activities??[])section.append(element('article',{},element('strong',{text:item.title}),workshopNote(`${item.target} · ${item.text}`)));
  if(draft.type==='Status & emoji'){for(const item of payload.statuses??[])section.append(workshopNote(`${item.icon} · ${item.text}`));for(const item of payload.emojis??[])section.append(workshopNote(`${item.symbol} · ${item.label}`));}
  if(draft.type==='Profile theme'){const g=payload.gradient,d=payload.decoration;section.append(workshopNote(`Profile style: ${payload.profileStyle}`),workshopNote(`Gradient: ${g?.primary} → ${g?.secondary} · ${g?.angle}°`),workshopNote(`Decoration: ${d?.mode} · ${d?.preset} · ${d?.primary} → ${d?.secondary} · ${d?.angle}°`));}
  if(draft.type==='Community template'){section.append(element('h4',{text:payload.name??''}),workshopNote(payload.description??''),workshopNote(`${payload.visibility} · ${(payload.tags??[]).join(' · ')}`),element('h4',{text:'Rules'}),element('ol',{},...(payload.rules??[]).map(text=>element('li',{text}))),element('h4',{text:'Initial channels'}));for(const channel of payload.channels??[])section.append(element('strong',{text:channel.name}),workshopNote(channel.description));if(!payload.channels?.length)section.append(workshopNote('A general channel will be created.'));}
  if(draft.type==='Room preset')section.append(workshopNote(`${payload.name} · ${payload.capacity} planned places · ${payload.background}`),workshopNote(payload.description??''),workshopNote(`On room setup: ${payload.restoreOnOpen!==false?'restore saved settings':'fresh defaults'}.`));
  if(draft.type==='Background')section.append(workshopNote(`${payload.background} · ${payload.primary} → ${payload.secondary}`));
  if(draft.type==='UI theme')section.append(workshopNote(`Panels: ${payload.primary} / ${payload.secondary} · Accent: ${payload.accent} · ${payload.density}`));
  return section;
}
export const copyWorkshopDraft=(draft:WorkshopDraft):WorkshopDraft=>({type:draft.type,title:draft.title,summary:draft.summary,description:draft.description,visibility:draft.visibility,tags:structuredClone(draft.tags),version:draft.version,changelog:draft.changelog,...draft.deps?{deps:structuredClone(draft.deps)}:{},payload:structuredClone(draft.payload)});
export function checkedWorkshopDetail(detail:WorkshopDetail):WorkshopDetail {
  if(!detail||!WORKSHOP_TYPES.includes(detail.type))throw new Error('This creation type is no longer supported.');
  checkedWorkshopPage({items:[detail],nextCursor:null});
  const source=detail.remixSource;
  if(source!==undefined&&source!==null){
    if(typeof source!=='object'||Array.isArray(source)||typeof source.available!=='boolean')throw new Error('Invalid remix source');
    const keys=Object.keys(source).sort().join(',');
    if(source.available){
      if(keys!=='author,authorName,available,packageId,title,version'||!workshopId(source.packageId)||source.packageId===detail.id||!workshopVersion(source.version)||!Number.isSafeInteger(source.author)||source.author<=0||typeof source.authorName!=='string'||!source.authorName||source.authorName.length>80||typeof source.title!=='string'||source.title.length<3||source.title.length>80||/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(source.title+source.authorName))throw new Error('Invalid remix source');
    }else if(keys!=='available')throw new Error('Invalid unavailable remix source');
  }
  if(!Array.isArray(detail.versions)||detail.versions.length>10||detail.status!=='draft'&&!detail.versions.some(release=>release.version===detail.version)||new Set(detail.versions.map(release=>release.version)).size!==detail.versions.length)throw new Error('Invalid release history');
  for(const release of [...detail.versions,...detail.draft?[detail.draft]:[]]){
    if(!release||release.type!==detail.type||typeof release.title!=='string'||release.title.length<3||release.title.length>80||typeof release.summary!=='string'||release.summary.length>180||typeof release.description!=='string'||release.description.length>1200||!workshopVersion(release.version)||!['public','unlisted'].includes(release.visibility)||typeof release.changelog!=='string'||release.changelog.length>600||!Array.isArray(release.tags)||release.tags.length>6||!release.payload||typeof release.payload!=='object')throw new Error('Invalid release');
    checkedWorkshopDependencies(release.deps);
    const payload=release.payload;
    if(release.type==='Community template')checkedCommunityTemplate(payload);
    if((WORKSHOP_DESTINATION_TYPES as readonly string[]).includes(release.type))checkedWorkshopDestination(release.type,payload);
    if(release.type==='Activity pack'&&(!Array.isArray(payload.activities)||!payload.activities.length||payload.activities.length>12||payload.activities.some(item=>typeof item.title!=='string'||item.title.length>64||typeof item.text!=='string'||item.text.length>240||!['Self','Other'].includes(item.target))))throw new Error('Invalid activities');
    if(release.type==='Status & emoji'&&(!Array.isArray(payload.statuses)||payload.statuses.length>12||!Array.isArray(payload.emojis)||payload.emojis.length>12||payload.statuses.some(item=>typeof item.text!=='string'||item.text.length>80||typeof item.icon!=='string')||payload.emojis.some(item=>typeof item.label!=='string'||item.label.length>32||typeof item.symbol!=='string'||item.symbol.length>12)))throw new Error('Invalid status pack');
    if(release.type==='Profile theme'&&(typeof payload.profileStyle!=='string'||!payload.gradient||!payload.decoration||[payload.gradient.primary,payload.gradient.secondary,payload.decoration.primary,payload.decoration.secondary].some(color=>!/^#[a-f0-9]{6}$/i.test(color))))throw new Error('Invalid profile theme');
  }
  return detail;
}
