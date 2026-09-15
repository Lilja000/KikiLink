import { CloudClient, CloudError } from "./client";
import type { CloudMedia, CloudProfile } from "./types";
import type { KikiLinkSettings } from "../core/types";
import type { KeyValueStorage } from "../core/settings";
import { readProfileImage } from "./profile-image";

/** Publish existing public profile fields once. Returning devices load Cloud's revision. */
export async function syncInitialProfile(client: CloudClient, settings: KikiLinkSettings, name: string,
  current: CloudProfile | undefined, storage: KeyValueStorage | undefined, valid: () => boolean): Promise<CloudProfile | undefined> {
  if (current?.autoPublishAllowed === false) return current;
  const key = `kikilink:profile-sync:${client.memberNumber}:v1`;
  let migrated = false;
  let pendingImages = false;
  try { migrated = storage?.getItem(key) === "1"; pendingImages = storage?.getItem(key) === "images-pending"; } catch { /* Revision guards remain. */ }
  if (current && !current.isDefault && !pendingImages && current.statusMessage !== undefined) return current;
  const info = await client.request<{ features?: { fullProfile?: boolean } }>("GET", "/v1/me");
  if (!info?.features?.fullProfile || !valid()) return current;
  const saved = current?.isDefault ? undefined : current, local = settings.linkPresence;
  const authoritative = saved?.statusMessage !== undefined;
  const legacy = !migrated && !authoritative;
  const input = {
    displayName: saved?.displayName ?? (name.trim().slice(0, 80) || `Member ${client.memberNumber}`),
    bio: saved?.bio || (legacy ? local.bio : ""),
    statusMessage: saved?.statusMessage ?? local.statusMessage,
    avatarFrame: saved && (authoritative || migrated || saved.avatarFrame !== "none") ? saved.avatarFrame : local.avatarFrame,
    profileStyle: saved && (authoritative || migrated || saved.profileStyle !== "classic") ? saved.profileStyle : local.profileStyle,
    profileOutlineColor: saved?.profileOutlineColor || (legacy ? local.profileOutlineColor || undefined : undefined),
    profileGradient: saved?.profileGradient ?? (legacy && local.profileGradient.enabled ? { start: local.profileGradient.primary, end: local.profileGradient.secondary } : undefined),
    visible: saved?.visible ?? local.enabled, revision: saved?.revision ?? 0,
    avatarId: saved?.avatarId ?? null, bannerId: saved?.bannerId ?? null,
  };
  let imagesComplete = true;
  for (const kind of ["avatar", "banner"] as const) {
    const id = kind === "avatar" ? "avatarId" : "bannerId", url = kind === "avatar" ? local.avatarUrl : local.bannerUrl;
    if (!input[id] && (legacy || pendingImages) && url) {
      try {
        const blob = await readProfileImage(url, kind);
        if (!valid()) return current;
        input[id] = (await client.request<CloudMedia>("POST", `/v1/media/${kind}`, blob)).id;
      } catch { imagesComplete = false; }
    }
  }
  if (!valid()) return current;
  try {
    const profile = await client.request<CloudProfile>("PUT", "/v1/profiles/me", input);
    if (valid()) try { storage?.setItem(key, imagesComplete ? "1" : "images-pending"); } catch { /* Cloud is saved. */ }
    return profile;
  } catch (error) {
    // Another device/editor may have saved while images were importing. Never overwrite it.
    if (error instanceof CloudError && error.status === 409 && valid()) return client.profile(client.memberNumber, true);
    throw error;
  }
}
