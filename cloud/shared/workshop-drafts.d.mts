import type {WorkshopSource} from './workshop-source.mjs';
import type {CommunityTemplateChannel} from './community-template.mjs';
export const WORKSHOP_TYPES:readonly ['Activity pack','Profile theme','Status & emoji','Room preset','Background','UI theme','Community template'];
export type WorkshopType=typeof WORKSHOP_TYPES[number];
export interface WorkshopPayload {
  visibility?:'Public'|'Request only'|'Private';tags?:string[];rules?:string[];channels?:CommunityTemplateChannel[];
  name?:string;description?:string;background?:string;capacity?:number;restoreOnOpen?:boolean;primary?:string;secondary?:string;accent?:string;density?:'Compact'|'Comfortable';
  activities?:Array<{id:string;title:string;text:string;target:'Self'|'Other'}>;
  profileStyle?:string;
  gradient?:{primary:string;secondary:string;angle:number};
  decoration?:{mode:string;preset:string;primary:string;secondary:string;angle:number};
  statuses?:Array<{text:string;icon:string}>;
  emojis?:Array<{label:string;symbol:string}>;
}
export interface WorkshopDependency {id:string;minVersion:string;}
export interface WorkshopDraft {deps?:WorkshopDependency[];type:WorkshopType;title:string;summary:string;description:string;visibility:'public'|'unlisted';tags:string[];version:string;changelog:string;payload:WorkshopPayload;}
export interface WorkshopDraftState {draft:WorkshopDraft;variants:Partial<Record<WorkshopType,WorkshopPayload>>;step:number;}
export interface LocalWorkshopDraft extends WorkshopDraftState {id:string;context:{fixedType:boolean;packageId:string|null;revision:number|null;remix:{id:string;version:string}|null;source?:WorkshopSource};}
export function newWorkshopDraft(type?:WorkshopType):WorkshopDraft;
export function workshopId(value:unknown):value is string;
export function workshopVersion(value:unknown):value is string;
export function checkedLocalWorkshopDraft(value:unknown):LocalWorkshopDraft;
export function workshopDraftValue(value:unknown):string;
