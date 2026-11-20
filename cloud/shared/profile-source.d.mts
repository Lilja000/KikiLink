export interface ProfileSource {readonly required:boolean;readonly generation?:string;readonly restored?:boolean;}
export class ProfileGenerationError extends Error {}
export function checkedProfileSource(value:unknown):ProfileSource;
export function profileSource(value:unknown):ProfileSource;
export function sameProfileSource(a:ProfileSource|undefined,b:ProfileSource|undefined):boolean;
export function requireProfileSource(original:ProfileSource|undefined,fresh:ProfileSource):void;
