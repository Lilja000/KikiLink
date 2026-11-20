export interface AudioSource {readonly required:boolean;readonly generation?:string;readonly restored?:boolean;}
export class AudioGenerationError extends Error {}
export function checkedAudioSource(value:unknown):AudioSource;
export function audioSource(value:unknown):AudioSource;
export function sameAudioSource(a:AudioSource|undefined,b:AudioSource|undefined):boolean;
export function requireAudioSource(original:AudioSource|undefined,fresh:AudioSource):void;
