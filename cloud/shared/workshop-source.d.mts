export interface WorkshopSource {readonly required:boolean;readonly generation?:string;readonly restored?:boolean;}
export class WorkshopGenerationError extends Error {}
export function checkedWorkshopSource(value:unknown):WorkshopSource;
export function workshopSource(value:unknown):WorkshopSource;
export function sameWorkshopSource(a:WorkshopSource|undefined,b:WorkshopSource|undefined):boolean;
export function requireWorkshopSource(original:WorkshopSource|undefined,fresh:WorkshopSource):void;
