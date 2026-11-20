export interface MediaSource {readonly required:boolean;readonly generation?:string;readonly restored?:boolean;}
export class MediaGenerationError extends Error {}
export function checkedMediaSource(value:unknown):MediaSource;
export function mediaSource(value:unknown):MediaSource;
export function sameMediaSource(a:MediaSource|undefined,b:MediaSource|undefined):boolean;
export function requireMediaSource(original:MediaSource|undefined,fresh:MediaSource):void;
