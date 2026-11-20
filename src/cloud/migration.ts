import type { KikiLinkSettings } from "../core/types";
import type { CloudProfile } from "./types";

// Historical unscoped marker: retained for exports, never rewritten by the new flow.
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
            angle: p.profileGradient.angle ?? 135,
          },
        }
      : {}),
  };
}
