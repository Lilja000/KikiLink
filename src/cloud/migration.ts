import type { KikiLinkSettings } from "../core/types";
import type { KeyValueStorage } from "../core/settings";
import type { CloudProfile } from "./types";

export const CLOUD_MIGRATION_KEY = "kikilink:cloud:migration:v1";
/** Explicit copy only. No writes to old profiles, chats, groups, Catbox URLs or BC mirrors. */
export function profileImportDraft(
  settings: KikiLinkSettings,
  displayName: string,
): Partial<CloudProfile> {
  const p = settings.linkPresence;
  return {
    displayName,
    bio: p.bio,
    avatarFrame: p.avatarFrame,
    profileStyle: p.profileStyle,
    ...(/^#[0-9a-f]{6}$/iu.test(p.profileOutlineColor)
      ? { profileOutlineColor: p.profileOutlineColor }
      : {}),
    ...(p.profileGradient.enabled
      ? {
          profileGradient: {
            start: p.profileGradient.primary,
            end: p.profileGradient.secondary,
          },
        }
      : {}),
  };
}
export function recordCloudMigration(
  storage: KeyValueStorage,
  memberNumber: number,
  legacyId: string,
  cloudId: string,
): void {
  let current: {
    version: number;
    memberNumber: number;
    groups: Record<string, string>;
  } = { version: 1, memberNumber, groups: {} };
  try {
    const old = JSON.parse(storage.getItem(CLOUD_MIGRATION_KEY) ?? "null") as
      typeof current | null;
    if (
      old?.version === 1 &&
      old.memberNumber === memberNumber &&
      old.groups &&
      typeof old.groups === "object"
    )
      current = old;
  } catch {
    /* A malformed Cloud marker never changes legacy state. */
  }
  if (Object.keys(current.groups).length >= 100 && !current.groups[legacyId])
    throw new Error("Cloud migration mapping limit reached");
  current.groups[legacyId] = cloudId;
  storage.setItem(CLOUD_MIGRATION_KEY, JSON.stringify(current));
}
