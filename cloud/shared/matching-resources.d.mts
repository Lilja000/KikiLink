import type {MatchSignal,MatchPerson,MatchCandidate} from './matching.mjs';
export type MatchResourceKind='groups'|'rooms'|'events';
export interface MatchGroup extends Pick<MatchSignal,'published'|'intents'|'languages'|'interests'|'availability'|'days'|'from'|'to'|'utcOffset'|'duration'>{title:string;description:string;communityId:string|null;visibility:'public'|'members';capacity:number;}
export interface ResourceFilters {query:string;scope:'all'|'saved'|'hidden';intent:string;language:string;interest:string;community:string;available:boolean;timezone:'any'|'same'|'near';sort:'recommended'|'time'|'name';priority:'balanced'|'time';}
export interface MatchResource {kind:MatchResourceKind;id:string;title:string;description:string;host:MatchPerson;revision:number;community:{id:string;name:string;joined:boolean}|null;intents:string[];languages:string[];interests:string[];capacity:number|null;members:number|null;available:boolean|null;availability:'Available now'|'Planning ahead'|'Not looking'|null;overlapMinutes:number|null;utcOffset:number|null;startsAt:number|null;endsAt:number|null;saved:boolean;hidden:boolean;choiceRevision:number;canRequest:boolean;membership:'owner'|'none'|'Pending'|'Accepted'|'Declined'|'Cancelled'|'Expired';score:number;coverage:number;breakdown:MatchCandidate['breakdown'];reasons:string[];}
export interface OwnedMatchGroup {id:string;revision:number;group:MatchGroup;members:number;publishable:boolean;}
export interface GroupMatchRequest {id:string;groupId:string;direction:'Incoming'|'Outgoing';state:'Pending'|'Accepted'|'Declined'|'Cancelled'|'Expired';revision:number;createdAt:number;expiresAt:number;updatedAt:number;group:{id:string;title:string;revision:number;capacity:number;members:number}|null;peer:MatchPerson|null;intent:string|null;message:string|null;senderRevision:number|null;canAccept:boolean;canDecline:boolean;canCancel:boolean;}
export interface ResourceChoice {kind:MatchResourceKind;id:string;revision:number;saved:boolean;hidden:boolean;title:string|null;host:number|null;}
export const MATCH_RESOURCE_KINDS:MatchResourceKind[];
export const DEFAULT_MATCH_GROUP:MatchGroup;
export const DEFAULT_RESOURCE_FILTERS:ResourceFilters;
export function checkedMatchGroup(v:unknown):MatchGroup;
export function checkedResourceFilters(v:unknown):ResourceFilters;
export function tagMatchInterests(tags:string[]):string[];
export function matchingEventOverlap(signal:MatchSignal,start:number,end:number):number|null;
export function rankResource(v:any,own:MatchSignal,priority?:string):MatchResource;
export function filterResource(c:MatchResource,f:ResourceFilters,own:MatchSignal):boolean;
export function compareResources(a:MatchResource,b:MatchResource,sort:string):number;
