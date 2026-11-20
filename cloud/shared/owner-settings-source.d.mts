export interface OwnerSettingsSource {readonly required:boolean;readonly generation?:string;readonly restored?:boolean;}
export class OwnerSettingsGenerationError extends Error {}
export function checkedOwnerSettingsSource(value:unknown):OwnerSettingsSource;
export function ownerSettingsSource(value:unknown):OwnerSettingsSource;
export function sameOwnerSettingsSource(a:OwnerSettingsSource|undefined,b:OwnerSettingsSource|undefined):boolean;
export function requireOwnerSettingsSource(original:OwnerSettingsSource|undefined,fresh:OwnerSettingsSource):void;
