import { CloudError, type CloudClient } from './client';
import { checkedOwnerSettingsSource, requireOwnerSettingsSource, ownerSettingsGuard, ownerSettingsPath, ownerSettingsRead, type OwnerSettingsSource } from './owner-settings-generation';

export type CommunityNotificationMode = 'important' | 'all';
export interface CommunityNotificationInput { communityId:string; mode:CommunityNotificationMode; revision:number }
export interface CommunityNotificationPreference extends CommunityNotificationInput { memberNumber:number; communityName:string; canWrite:boolean }
type Client = Pick<CloudClient,'request'|'memberNumber'|'origin'|'connected'>;
export const notificationPreferencePath = (id:string):string => `/v1/communities/${id}/notification-preferences`;
export const notificationModeLabel = (mode:CommunityNotificationMode):string => mode==='all'?'All activity':'Important only';
export async function communityNotificationMetadata(client:Client,valid:()=>boolean):Promise<OwnerSettingsSource> {
  const owner=client.memberNumber,origin=client.origin;
  ownerSettingsGuard(client,owner,origin,valid);
  if(!client.connected)throw new CloudError('authentication_required',401);
  const me=await client.request<{memberNumber:number;directRecovery?:{generation:string;restored:boolean};features?:{communityNotificationPreferences?:boolean}}>('GET','/v1/me');
  ownerSettingsGuard(client,owner,origin,valid);
  if(me?.memberNumber!==owner)throw new CloudError('session_changed');
  if(me.features?.communityNotificationPreferences!==true)throw new CloudError('community_notifications_unavailable');
  return checkedOwnerSettingsSource({required:true,generation:me.directRecovery?.generation,restored:me.directRecovery?.restored});
}
export async function readCommunityNotifications(client:Client,cid:string,source:OwnerSettingsSource,valid:()=>boolean):Promise<CommunityNotificationPreference> {
  const owner=client.memberNumber,origin=client.origin;
  requireOwnerSettingsSource(source,await communityNotificationMetadata(client,valid));
  const value=ownerSettingsRead(await client.request('GET',ownerSettingsPath(notificationPreferencePath(cid),source)),source) as CommunityNotificationPreference;
  ownerSettingsGuard(client,owner,origin,valid);
  if(!value||value.communityId!==cid||value.memberNumber!==owner||!Number.isSafeInteger(value.revision)||value.revision<0||
    !['important','all'].includes(value.mode)||typeof value.communityName!=='string'||typeof value.canWrite!=='boolean')throw new CloudError('invalid_response');
  return value;
}
export function communityNotificationReceipt(value:unknown,source:OwnerSettingsSource,owner:number,op:string,input:CommunityNotificationInput):CommunityNotificationInput {
  const result=ownerSettingsRead(value,source) as Record<string,unknown>;
  if(!result||result.applied!==true||result.action!=='community-notifications'||result.operationId!==op||result.memberNumber!==owner||
    result.communityId!==input.communityId||result.revision!==input.revision+1||result.mode!==input.mode)throw new CloudError('invalid_response');
  return {communityId:input.communityId,mode:input.mode,revision:input.revision+1};
}
