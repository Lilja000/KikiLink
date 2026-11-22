import { normalizeAvatarDecoration, publicProfileTags } from "../core/profile-appearance";
import type { PresenceSnapshot } from "../core/types";
import type { CloudProfile } from "./types";
import type { CommunityService } from "./community";

/** Keep the account number separate from the name when BC only knows an ID. */
export function memberDisplayName(member: number, nativeName: string | undefined, profile?: CloudProfile, viewer?: number): string {
  const visible = profile?.memberNumber === member && !profile.isDefault && (profile.visible || member === viewer);
  for (const value of [visible ? profile.displayName : undefined, nativeName]) {
    const name = value?.trim();
    if (name && name !== `Member ${member}` && name !== `Member #${member}` && name !== `#${member}` && name !== String(member)) return name;
  }
  return "Member";
}

export function knownMemberName(community: CommunityService, member: number, senderName?: string): string {
  if (community.client.isProfileBlocked?.(member)) return "Member";
  return memberDisplayName(member, senderName?.trim() || community.adapter.getMemberName(member),
    community.client.peekProfile?.(member), community.client.memberNumber);
}

/** Cloud supplies saved details; native presence remains the source of live status. */
export function withCloudProfile(native: PresenceSnapshot, profile: CloudProfile, preserveLegacy = false): PresenceSnapshot {
  const legacyAppearance = preserveLegacy && profile.avatarFrame === "none" && profile.profileStyle === "classic" &&
    !profile.profileOutlineColor && !profile.profileGradient;
  if (profile.isDefault) return native;
  const result: PresenceSnapshot = { ...native, bio: profile.bio, publicTags: publicProfileTags(profile.publicTags) };
  if (profile.statusMessage !== undefined) result.statusMessage = profile.statusMessage;
  if (!legacyAppearance) {
    result.avatarFrame = profile.avatarFrame; result.profileStyle = profile.profileStyle;
    result.avatarDecoration = normalizeAvatarDecoration(profile.avatarDecoration, profile.avatarFrame);
    result.publicTags = publicProfileTags(profile.publicTags);
    if (profile.profileOutlineColor) result.profileOutlineColor = profile.profileOutlineColor; else delete result.profileOutlineColor;
    if (profile.profileGradient) result.profileGradient = { enabled: profile.profileGradient.enabled !== false, primary: profile.profileGradient.start, secondary: profile.profileGradient.end, angle: profile.profileGradient.angle ?? 135 };
    else delete result.profileGradient;
  }
  return result;
}
