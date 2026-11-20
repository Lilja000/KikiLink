export interface EventOutline {offsetMinutes:number;label:string}
export function eventTags(value:string):string[]{return value.split(',').map(v=>v.trim()).filter(Boolean);}
export function eventOutline(value:string):EventOutline[]{
 return value.split('\n').filter(v=>v.trim()).map(line=>{const match=/^\s*(\d{1,4})\s*[:·-]\s*(.+?)\s*$/u.exec(line);if(!match)throw new Error('Use one line per activity: minutes after start · description.');return{offsetMinutes:Number(match[1]),label:match[2]!};});
}
export function eventDetailsError(tags:string,outline:string,duration:number):string{
 const list=eventTags(tags);if(list.length>6||list.some(t=>t.length>24)||new Set(list.map(t=>t.toLowerCase())).size!==list.length)return 'Use up to 6 different tags, each within 24 characters.';
 try{const agenda=eventOutline(outline);if(agenda.length>12||agenda.some((a,i)=>a.label.length>140||a.offsetMinutes>=duration||i>0&&a.offsetMinutes<=agenda[i-1]!.offsetMinutes))return 'Use up to 12 activities in time order, before the event ends. Keep each description within 140 characters.';}catch(e){return (e as Error).message;}
 return '';
}
const eventId=/^[A-Za-z0-9_-]{1,64}$/u;
/** The fragment carries identifiers only and cannot change the configured Cloud. */
export function eventShareUrl(base:string,id:string,cloud:string):string{
 if(!eventId.test(id))throw new Error('Invalid event link');const url=new URL(base),origin=new URL(cloud);if(!['http:','https:'].includes(url.protocol)||!['http:','https:'].includes(origin.protocol)||origin.username||origin.password)throw new Error('Invalid event link');url.username='';url.password='';url.search='';url.hash=`kikilink/event/${id}?cloud=${encodeURIComponent(cloud)}`;return url.href;
}
export function sharedEventId(hash:string,cloud:string):string|undefined{
 const match=/^#kikilink\/event\/([A-Za-z0-9_-]{1,64})\?cloud=([^&]+)$/u.exec(hash);if(!match)return;try{if(decodeURIComponent(match[2]!)===cloud)return match[1];}catch{}return;
}
