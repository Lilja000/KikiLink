import {matchExact as exact,matchInteger as int,matchUuid as uuid,matchText as text} from '../../../cloud/shared/matching.mjs';
import type {MusicSession,SessionTrack} from '../../../cloud/shared/music-sessions.mjs';
const fail=():never=>{throw new Error('Listening session data could not be verified. Refresh to try again.');};
const date=(v:unknown)=>int(v,1,8640000000000000);
export function checkedMusicSession(v:unknown):MusicSession{
 if(!exact(v,['id','space','host','revision','state','createdAt','expiresAt','serverNow','participantCount','joined','memberRevision','leaseUntil','hostConnected','canControl','canEnd','queue','trackId','positionMs'])||!uuid(v.id)||!exact(v.space,['id','name'])||!uuid(v.space.id)||!text(v.space.name,64)||!exact(v.host,['memberNumber','name'])||!int(v.host.memberNumber,1)||v.host.name!==null&&!text(v.host.name,80)||!int(v.revision,1)||!['paused','playing','ended'].includes(String(v.state))||!date(v.createdAt)||!date(v.expiresAt)||Number(v.expiresAt)!==Number(v.createdAt)+43200000||!date(v.serverNow)||!int(v.participantCount,0,50)||!int(v.memberRevision)||!['joined','hostConnected','canControl','canEnd'].every(k=>typeof v[k]==='boolean'))return fail();
 if(v.leaseUntil!==null&&!date(v.leaseUntil)||v.joined&&(v.leaseUntil===null||Number(v.leaseUntil)<=Number(v.serverNow)||!v.memberRevision||v.state==='ended')||!v.joined&&v.leaseUntil!==null||v.canControl&&(!v.joined||!v.canEnd)||v.state==='ended'&&(v.canControl||v.canEnd||v.hostConnected||v.participantCount))return fail();
 if(v.queue===null){if(v.trackId!==null||v.positionMs!==null||v.joined||v.canControl)return fail();}
 else{
  if(!Array.isArray(v.queue)||v.queue.length>20||v.queue.some(t=>!exact(t,['id','title','durationMs'])||!uuid(t.id)||!text(t.title,100)||!t.title.trim()||!int(t.durationMs,1,86400000))||new Set(v.queue.map(t=>t.id)).size!==v.queue.length||!int(v.positionMs,0,86400000))return fail();
  const current=(v.queue as unknown as SessionTrack[]).find(t=>t.id===v.trackId);if(v.trackId!==null&&(!uuid(v.trackId)||!current)||current&&Number(v.positionMs)>current.durationMs||v.trackId===null&&Number(v.positionMs)!==0)return fail();
 }
 return structuredClone(v) as unknown as MusicSession;
}
export function checkedMusicSessions(v:unknown):{items:MusicSession[];nextCursor:number|null;serverNow:number}{if(!exact(v,['items','nextCursor','serverNow'])||!Array.isArray(v.items)||v.items.length>20||v.nextCursor!==null&&!int(v.nextCursor,1)||!date(v.serverNow))return fail();const items=v.items.map(checkedMusicSession);if(new Set(items.map(s=>s.id)).size!==items.length)return fail();return {...v,items} as {items:MusicSession[];nextCursor:number|null;serverNow:number};}
export function checkedMusicHeartbeat(v:unknown,sid:string,revision:number):{leaseUntil:number;serverNow:number}{if(!exact(v,['sessionId','memberRevision','leaseUntil','serverNow'])||v.sessionId!==sid||v.memberRevision!==revision||!date(v.serverNow)||Number(v.leaseUntil)!==Number(v.serverNow)+90000)return fail();return v as unknown as {leaseUntil:number;serverNow:number};}
