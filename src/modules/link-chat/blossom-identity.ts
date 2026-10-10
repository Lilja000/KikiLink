import BLOSSOM_AVATAR_DATA_URL from "../../../design/branding/kikilink-blossom.png";
import BLOSSOM_ROOM_DATA_URL from "../../../design/branding/kikilink-blossom.svg";
import GOLD_BLOSSOM_DATA_URL from "../../../design/branding/kikilink-blossom-gold.svg";

/** A member's badge color is independent of the viewer's account and theme. */
export function isGoldBlossomMember(memberNumber: number | undefined): boolean {
  return memberNumber === 72385;
}

/** Select one complete sprite; never tint or layer the shared pink artwork. */
export function blossomImageForMember(
  memberNumber: number | undefined,
  variant: "avatar" | "room" = "avatar",
): string {
  if (isGoldBlossomMember(memberNumber)) return GOLD_BLOSSOM_DATA_URL;
  return variant === "room" ? BLOSSOM_ROOM_DATA_URL : BLOSSOM_AVATAR_DATA_URL;
}

const PINK_PALETTE = Object.freeze({ petals: "#ef6078", outline: "#5f1b2a", highlights: "#ffb2bf", center: "#f3b63f", glint: "#ffe6a1" });
// Match the bundled gold sprite and the addon's existing --kl-gold colors.
const GOLD_PALETTE = Object.freeze({ petals: "#d6a24b", outline: "#5f451b", highlights: "#f1d69f", center: "#ad7624", glint: "#ffe6a1" });

export function blossomPaletteForMember(memberNumber: number | undefined) {
  return isGoldBlossomMember(memberNumber) ? GOLD_PALETTE : PINK_PALETTE;
}
