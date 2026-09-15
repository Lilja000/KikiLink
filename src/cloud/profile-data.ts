import type { PresenceSnapshot } from "../core/types";
import type { CloudProfile } from "./types";

/** Cloud supplies saved details; native presence remains the source of live status. */
export function withCloudProfile(native: PresenceSnapshot, profile: CloudProfile, preserveLegacy = false): PresenceSnapshot {
  const legacyAppearance = preserveLegacy && profile.avatarFrame === "none" && profile.profileStyle === "classic" &&
    !profile.profileOutlineColor && !profile.profileGradient;
  if (profile.isDefault) return native;
  const result: PresenceSnapshot = { ...native, bio: profile.bio };
  if (profile.statusMessage !== undefined) result.statusMessage = profile.statusMessage;
  if (!legacyAppearance) {
    result.avatarFrame = profile.avatarFrame; result.profileStyle = profile.profileStyle;
    if (profile.profileOutlineColor) result.profileOutlineColor = profile.profileOutlineColor; else delete result.profileOutlineColor;
    if (profile.profileGradient) result.profileGradient = { enabled: true, primary: profile.profileGradient.start, secondary: profile.profileGradient.end };
    else delete result.profileGradient;
  }
  return result;
}
