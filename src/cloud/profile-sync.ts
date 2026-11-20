import {profileMetadata,profileGuard,profilePath,profileBody,profileReceipt,profileUploadReceipt,profileError,requireProfileSource,type ProfileSource} from './profile-generation';
import { CloudClient, CloudError } from "./client";
import type { CloudMedia, CloudProfile } from "./types";
import type { KikiLinkSettings } from "../core/types";
import type { KeyValueStorage } from "../core/settings";
import { readProfileImage } from "./profile-image";
import type { CloudSyncQueue } from "./sync-queue";

/** Publish existing public profile fields once. Returning devices load Cloud's revision. */
export async function syncInitialProfile(client: CloudClient, settings: KikiLinkSettings, name: string,
  current: CloudProfile | undefined, storage: KeyValueStorage | undefined, valid: () => boolean, queue?: CloudSyncQueue, source?: ProfileSource): Promise<CloudProfile | undefined> {
  if(!valid())return current;
  const owner=client.memberNumber,origin=client.origin;
  const guard=()=>{profileGuard(client,owner,origin,valid);return true;};
  const sync = queue?.snapshot();
  if (sync?.paused || sync?.error || sync?.entries.some(i => i.kind === "Profile" && ["Pending", "Failed", "Conflict"].includes(i.status))) return current;
  if (current?.autoPublishAllowed === false) return current;
  const key = `kikilink:profile-sync:${client.memberNumber}:v1`;
  let migrated = false;
  let pendingImages = false;
  let reviewRequired=false;
  try { migrated = storage?.getItem(key) === "1"; pendingImages = storage?.getItem(key) === "images-pending"; reviewRequired=storage?.getItem(key)==='images-review'; } catch { /* Revision guards remain. */ }
  if(reviewRequired)return current;
  if (current && !current.isDefault && !pendingImages && current.statusMessage !== undefined) return current;
  const info = await profileMetadata(client,guard);
  if (!info.features.fullProfile || !valid()) return current;
  // Restore never republishes device-local legacy fields or retries image imports automatically.
  if(info.source.restored)return current;
  requireProfileSource(source,info.source);
  const saved = current?.isDefault ? undefined : current, local = settings.linkPresence;
  const authoritative = saved?.statusMessage !== undefined;
  const legacy = !migrated && !authoritative;
  const input = {
    displayName: saved?.displayName ?? (name.trim().slice(0, 80) || `Member ${client.memberNumber}`),
    bio: saved?.bio || (legacy ? local.bio : ""),
    statusMessage: saved?.statusMessage ?? local.statusMessage,
    avatarFrame: saved && (authoritative || migrated || saved.avatarFrame !== "none") ? saved.avatarFrame : local.avatarFrame,
    avatarDecoration: saved?.avatarDecoration ?? local.avatarDecoration,
    publicTags: saved?.publicTags ?? local.publicTags,
    profileStyle: saved && (authoritative || migrated || saved.profileStyle !== "classic") ? saved.profileStyle : local.profileStyle,
    profileOutlineColor: saved?.profileOutlineColor || (legacy ? local.profileOutlineColor || undefined : undefined),
    profileGradient: saved?.profileGradient ?? (legacy ? {
      start: local.profileGradient.primary,
      end: local.profileGradient.secondary,
      ...(info.features?.profileGradientAngle ? { angle: local.profileGradient.angle ?? 135 } : {}),
      enabled: local.profileGradient.enabled,
    } : undefined),
    visible: saved?.visible ?? local.enabled, revision: saved?.revision ?? 0,
    avatarId: saved?.avatarId ?? null, bannerId: saved?.bannerId ?? null,
  };
  let imagesComplete = true;
  // A durable hold is written before an automatic binary upload. A lost reply must
  // require an explicit editor decision instead of the background retry timer.
  const hold=()=>{
    if(!info.source.required)return;
    if(!storage)throw new Error('Open your profile to review the image import.');
    storage.setItem(key,'images-review');
    if(storage.getItem(key)!=='images-review')throw new Error('Profile import could not be recorded.');
  };
  for (const kind of ["avatar", "banner"] as const) {
    const id = kind === "avatar" ? "avatarId" : "bannerId", url = kind === "avatar" ? local.avatarUrl : local.bannerUrl;
    if (!input[id] && (legacy || pendingImages) && url) {
      try {
        guard();hold();
        const blob = await readProfileImage(url, kind);
        if (!valid()) return current;
        guard();input[id] = profileUploadReceipt(await client.request<CloudMedia>("POST", profilePath(`/v1/media/${kind}`,source), blob),info.source,kind).id;guard();
      } catch(error) {if(info.source.required)throw profileError(error);imagesComplete = false;}
    }
  }
  if (!valid()) return current;
  try {
    guard();
    const operationId=crypto.randomUUID();
    if(!queue)hold();
    const profile = queue ? await queue.write<CloudProfile>('Profile','PUT',input,current,source)
      : profileReceipt(await client.request<CloudProfile>("PUT", "/v1/profiles/me", profileBody(input,source,operationId)),source,owner,operationId,'profile-put',input.revision);
    if (valid()) try { storage?.setItem(key, imagesComplete ? "1" : "images-pending"); } catch { /* Cloud is saved. */ }
    return profile;
  } catch (error) {
    // Another device/editor may have saved while images were importing. Never overwrite it.
    if (error instanceof CloudError && error.code === 'revision_conflict' && !info.source.required && valid()) return client.profile(client.memberNumber, true);
    throw profileError(error);
  }
}
