export const MUSIC_LEASE_MS: number;
export const MUSIC_SESSION_MS: number;
export const MUSIC_PARTICIPANTS: number;
export const MUSIC_QUEUE_LIMIT: number;
export interface SessionTrack {id:string;title:string;durationMs:number;}
export interface MusicSession {
 id:string;space:{id:string;name:string};host:{memberNumber:number;name:string|null};
 revision:number;state:'paused'|'playing'|'ended';createdAt:number;expiresAt:number;serverNow:number;
 participantCount:number;joined:boolean;memberRevision:number;leaseUntil:number|null;hostConnected:boolean;
 canControl:boolean;canEnd:boolean;queue:SessionTrack[]|null;trackId:string|null;positionMs:number|null;
}
export function musicPosition(queue:Pick<SessionTrack,'id'|'durationMs'>[],trackId:string|null,positionMs:number,elapsedMs:number):{trackId:string|null;positionMs:number;ended:boolean};
