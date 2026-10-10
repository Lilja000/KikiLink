import BLOSSOM_AVATAR_DATA_URL from "../../../design/branding/kikilink-blossom.png";
import BLOSSOM_ROOM_DATA_URL from "../../../design/branding/kikilink-blossom.svg";
import GOLD_BLOSSOM_AVATAR_DATA_URL from "../../../design/branding/kikilink-blossom-gold.png";
import GOLD_BLOSSOM_ROOM_DATA_URL from "../../../design/branding/kikilink-blossom-gold.svg";

const BLOSSOMS = Object.freeze({
  pink: Object.freeze({
    avatar: BLOSSOM_AVATAR_DATA_URL,
    room: BLOSSOM_ROOM_DATA_URL,
    palette: Object.freeze({ petals: "#ef6078", outline: "#5f1b2a", highlights: "#ffb2bf", center: "#f3b63f", glint: "#ffe6a1" }),
  }),
  gold: Object.freeze({
    avatar: GOLD_BLOSSOM_AVATAR_DATA_URL,
    room: GOLD_BLOSSOM_ROOM_DATA_URL,
    // Match the bundled sprites: brighter warm gold petals and a cream center.
    palette: Object.freeze({ petals: "#e4b34e", outline: "#5f451b", highlights: "#ffe0a0", center: "#d9c6a3", glint: "#ffe6a1" }),
  }),
});

/** A member's badge color is independent of the viewer's account and theme. */
export function isGoldBlossomMember(memberNumber: number | undefined): boolean {
  return memberNumber === 72385;
}

function blossomForMember(memberNumber: number | undefined) {
  return BLOSSOMS[isGoldBlossomMember(memberNumber) ? "gold" : "pink"];
}

/** Select one complete sprite; never tint or layer the shared pink artwork. */
export function blossomImageForMember(
  memberNumber: number | undefined,
  variant: "avatar" | "room" = "avatar",
): string {
  return blossomForMember(memberNumber)[variant];
}

export function blossomPaletteForMember(memberNumber: number | undefined) {
  return blossomForMember(memberNumber).palette;
}
