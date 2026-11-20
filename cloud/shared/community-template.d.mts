export interface CommunityTemplateChannel {name:string;description:string;}
export interface CommunityTemplatePayload {name:string;description:string;visibility:'Public'|'Request only'|'Private';tags:string[];rules:string[];channels:CommunityTemplateChannel[];}
export function checkedInitialCommunityChannels(value:unknown):CommunityTemplateChannel[];
export function checkedCommunityTemplate(value:unknown):CommunityTemplatePayload;
