import { formatClockTime } from '../../core/time-format';

export function localDateInput(timestamp: number): string {
  const d = new Date(timestamp), pad = (n: number) => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** Reject DST gaps instead of silently shifting the host's chosen local time. */
export function parseLocalDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && localDateInput(timestamp) === value ? timestamp : null;
}
export function localZone(timestamp = Date.now()): string {
  const offset = -new Date(timestamp).getTimezoneOffset();
  if (offset === 0) return 'UTC';
  const minutes = Math.abs(offset);
  const remainder = minutes % 60;
  return 'UTC' + (offset < 0 ? '−' : '+') + Math.floor(minutes / 60) +
    (remainder ? ':' + String(remainder).padStart(2, '0') : '');
}
const editorDate = new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', year:'numeric'});

export function eventEditorDateTime(timestamp: number): string {
  return editorDate.format(timestamp) + ' · ' + formatClockTime(timestamp);
}
export function eventClockContext(start: number, end: number): string {
  const localDay = (timestamp: number): number => {
    const date = new Date(timestamp);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  const days = (localDay(end) - localDay(start)) / 86_400_000;
  const rollover = days > 0 ? ` (+${days} ${days === 1 ? 'day' : 'days'})` : '';
  const startZone = localZone(start), endZone = localZone(end);
  return `${rollover} · ${startZone}${startZone === endZone ? '' : ` → ${endZone}`}`;
}
export function eventRange(start: number,end: number): string {
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
  const startZone = localZone(start), endZone = localZone(end);
  return eventEditorDateTime(start) + ' → ' + (sameDay ? formatClockTime(end) : eventEditorDateTime(end)) +
    ' · ' + startZone + (startZone === endZone ? '' : ' → ' + endZone);
}
export function eventCalendar(event: {id:string;title:string;description:string;room:string;startsAt:number;endsAt:number;status:string;revision:number}, now=Date.now()): string {
  const clean=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r\n|[\r\n]/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const stamp=(n:number)=>new Date(n).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const fold=(line:string)=>{const parts:string[]=[];let part='',bytes=0;for(const char of line){const n=new TextEncoder().encode(char).length;if(bytes+n>75){parts.push(part);part=' ';bytes=1;}part+=char;bytes+=n;}parts.push(part);return parts.join('\r\n');};
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KikiLink//Events//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${clean(event.id)}@kikilink`, `DTSTAMP:${stamp(now)}`,`SEQUENCE:${event.revision}`,`DTSTART:${stamp(event.startsAt)}`,`DTEND:${stamp(event.endsAt)}`,`SUMMARY:${clean(event.title)}`,`DESCRIPTION:${clean(event.description)}`,`LOCATION:${clean(event.room)}`,`STATUS:${event.status==='cancelled'?'CANCELLED':'CONFIRMED'}`,'END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
