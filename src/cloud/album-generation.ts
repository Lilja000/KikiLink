import type { CloudClient } from './client';
import { AlbumGenerationError, albumSource, requireAlbumSource, type AlbumSource } from '../../cloud/shared/album-source.mjs';
export * from '../../cloud/shared/album-source.mjs';

type Client = Pick<CloudClient, 'memberNumber' | 'origin' | 'connected' | 'request'>;
export interface AlbumReview<T> { value: T; source: AlbumSource; }
export function albumGuard(client: Client, owner: number, origin: string, valid: () => boolean): void {
  if (!valid() || client.memberNumber !== owner || client.origin !== origin) throw new Error('Your account or album view changed. Your original choices are kept.');
}
export async function albumMetadata(client: Client, valid: () => boolean): Promise<AlbumSource> {
  const owner = client.memberNumber, origin = client.origin;
  albumGuard(client, owner, origin, valid);
  if (!client.connected) throw new Error('Reconnect to review your Cloud albums.');
  const me = await client.request<{memberNumber: number}>('GET', '/v1/me');
  albumGuard(client, owner, origin, valid);
  if (!me || me.memberNumber !== owner || !Number.isSafeInteger(owner) || owner < 1) throw new Error('Cloud account changed.');
  return albumSource(me);
}
export const albumPath = (path: string, source: AlbumSource): string => source.required ? path + (path.includes('?') ? '&' : '?') + 'recoveryGeneration=' + source.generation : path;
export function albumRead(value: unknown, source: AlbumSource): unknown {
  if (!source.required) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value as Record<string, unknown>).recoveryGeneration !== source.generation) throw new AlbumGenerationError();
  const {recoveryGeneration, ...rest} = value as Record<string, unknown>; return rest;
}
export async function reviewAlbum<T>(client: Client, path: string, valid: () => boolean, original?: AlbumSource): Promise<AlbumReview<T>> {
  const owner = client.memberNumber, origin = client.origin, source = await albumMetadata(client, valid);
  if (original) requireAlbumSource(original, source);
  const value = await client.request('GET', albumPath(path, source));
  albumGuard(client, owner, origin, valid);
  return {value: albumRead(value, source) as T, source};
}
export function albumBody(body: Record<string,unknown>,source:AlbumSource):Record<string,unknown>{return {...body,...source.required?{recoveryGeneration:source.generation}:{}};}
export function albumReceipt(value:unknown,source:AlbumSource,owner:number,operationId:string,action:'create'|'save'|'delete',albumId:string|undefined,revision:number):{albumId:string;revision:number}{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('The album result was not confirmed. Retry the same request.');
 const r=value as Record<string,unknown>,uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u;
 if(typeof r.albumId!=='string'||!r.albumId||source.required&&!uuid.test(r.albumId)||albumId!==undefined&&r.albumId!==albumId||r.revision!==revision||!Number.isSafeInteger(r.revision))throw new Error('The album result was not confirmed. Retry the same request.');
 if(source.required&&(Object.keys(r).sort().join(',')!==['action','albumId','applied','memberNumber','operationId','recoveryGeneration','revision'].sort().join(',')||r.recoveryGeneration!==source.generation||r.memberNumber!==owner||r.operationId!==operationId||r.action!==action||r.applied!==true))throw new Error('The album result was not confirmed. Retry the same request.');
 return {albumId:r.albumId,revision:r.revision as number};
}
