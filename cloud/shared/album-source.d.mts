export interface AlbumSource {readonly required:boolean;readonly generation?:string;readonly restored?:boolean;}
export class AlbumGenerationError extends Error {}
export function checkedAlbumSource(value:unknown):AlbumSource;
export function albumSource(value:unknown):AlbumSource;
export function sameAlbumSource(a:AlbumSource|undefined,b:AlbumSource|undefined):boolean;
export function requireAlbumSource(original:AlbumSource|undefined,fresh:AlbumSource):void;
