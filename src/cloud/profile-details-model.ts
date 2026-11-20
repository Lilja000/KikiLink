import { getTimeFormatPreference } from '../core/time-format';

export const PROFILE_LANGUAGES = ['English','Russian','Finnish','French','German','Spanish','Portuguese','Italian','Japanese','Korean','Chinese'] as const;
export const LEGACY_PROFILE_LANGUAGE = 'Estonian';
export interface ProfileDetailsValue { languages:string[]; utcOffsetMinutes:number|null; }
export function validProfileLanguages(value:unknown):value is string[] {
  return Array.isArray(value)&&value.length<=6&&new Set(value).size===value.length&&value.every(v=>v===LEGACY_PROFILE_LANGUAGE||(PROFILE_LANGUAGES as readonly string[]).includes(v));
}
export function validProfileOffset(value:unknown):value is number|null {
  return value===null||typeof value==='number'&&Number.isInteger(value)&&value>=-720&&value<=840&&value%15===0;
}
export function profileOffsetLabel(value:number):string {
  const absolute=Math.abs(value);
  return `UTC${value<0?'-':'+'}${String(Math.floor(absolute/60)).padStart(2,'0')}:${String(absolute%60).padStart(2,'0')}`;
}
const clocks={
  '12-hour':new Intl.DateTimeFormat('en-US',{timeZone:'UTC',hour:'numeric',minute:'2-digit',hour12:true}),
  '24-hour':new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),
};
export function profileLocalTime(offset:number,now=Date.now()):string {
  return validProfileOffset(offset)?`${clocks[getTimeFormatPreference()].format(now+offset*60_000)} · ${profileOffsetLabel(offset)}`:'Not shared';
}
export function refreshProfileClocks(root:ParentNode,now=Date.now()):void {
  for(const node of root.querySelectorAll<HTMLElement>('[data-profile-utc-offset]')){
    const offset=Number(node.dataset.profileUtcOffset);
    if(validProfileOffset(offset))node.textContent=profileLocalTime(offset,now);
  }
}
