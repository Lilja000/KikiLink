export interface KikiLinkNewsRelease {
  version: string;
  date: string;
  title: string;
  summary: string;
  highlights: readonly string[];
}

/** A compact, curated changelog for the in-addon News page. */
export const KIKILINK_NEWS: readonly KikiLinkNewsRelease[] = [
  {
    version: "0.24.0",
    date: "2026-08-29",
    title: "Group chats and addon profiles",
    summary: "Small-group conversations, richer profiles, and safer room navigation arrive together.",
    highlights: [
      "Create a separate addon group with 2–4 group-compatible KikiLink friends (3–5 people total) and a fixed, clearly confirmed participant list.",
      "Accept incoming groups only from known BC friends, with coalesced local saves and visible storage-retry feedback.",
      "Keep your current room first in Lobbies through directory omissions, filters, and refresh failures, with a Current room badge and a native leave-then-join flow.",
      "Open a compatible player's KikiLink profile from their avatar or action menu, with optional decorations and an Only visible to you notes, tags, room, and encounter section.",
      "Keep profile-avatar loading under Ask first, Always show, or Links only privacy control, with bounded and cancellable requests.",
      "Benefit from tighter packet validation, bounded account data, and more resilient storage without changing the proven Blossom hook.",
    ],
  },
  {
    version: "0.23.0",
    date: "2026-08-27",
    title: "Rooms, contacts, and Gallery control",
    summary: "A quality-of-life release focused on finding people and places faster.",
    highlights: [
      "Favorite live room names, keep them first, and distinguish favorites from rooms with friends.",
      "Filter new chats to online or in-room contacts, then sort online-first or A–Z.",
      "Choose private device storage, Catbox without automatic expiry, or expiring Litterbox when adding a Gallery file.",
      "Recognize your BC submissives with the missing Sub relationship tag.",
      "Move KikiLink from any empty part of the desktop top bar without stealing clicks from controls.",
    ],
  },
  {
    version: "0.22.12",
    date: "2026-08-27",
    title: "Blossom compatibility hardening",
    summary: "The room Blossom now has a stable home beneath Echo's skirt icon.",
    highlights: [
      "Show the Blossom only for confirmed KikiLink users, even when Presence sharing is disabled.",
      "Keep native room drawing lightweight and avoid cross-realm Firefox permission failures.",
      "Preserve custom Blossom positions while improving the default addon-icon stack.",
    ],
  },
  {
    version: "0.22.0",
    date: "2026-08-26",
    title: "Music and room workflows",
    summary: "Playlists, durable Catbox tracks, and room tools became one cohesive workspace.",
    highlights: [
      "Build playlists from links, local files, and long-lived Catbox uploads.",
      "Synchronize compatible tracks with room music and keep temporary room uploads explicit.",
      "Save reusable room presets without copying passwords or oversized map data.",
    ],
  },
];
