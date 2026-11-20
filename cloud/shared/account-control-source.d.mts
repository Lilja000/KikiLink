export interface AccountControlSource {readonly required:boolean;readonly generation?:string;readonly restored?:boolean;}
export class AccountControlGenerationError extends Error {}
export function checkedAccountControlSource(value:unknown):AccountControlSource;
export function accountControlSource(value:unknown):AccountControlSource;
export function sameAccountControlSource(a:AccountControlSource|undefined,b:AccountControlSource|undefined):boolean;
export function requireAccountControlSource(original:AccountControlSource|undefined,fresh:AccountControlSource):void;
