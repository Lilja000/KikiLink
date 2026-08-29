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
    version: "0.26.0",
    date: "2026-08-29",
    title: "Cleaner chats and profiles that last",
    summary: "Direct and group chats now share one clear list, while profile themes, uploads, and saved public cards become more dependable.",
    highlights: [
      "Find direct and group conversations in one chronological searchable list, with unmistakable GROUP badges and no nested header scrollbar.",
      "Read clean direct messages across WCE and LikoMAT, including old saved previews, without stripping ordinary lookalike text.",
      "Cancel a stuck profile-banner upload for real and see progress while it runs; transport timers and active slots now clean up deterministically.",
      "Choose two strict colors for a contrast-aware profile gradient, negotiated only with compatible profile requests.",
      "Open saved voluntary public profiles immediately, with honest SAVED PROFILE or SAVED DETAILS labels and bounded route-aware refresh instead of global polling.",
      "Open KikiLink profiles directly from Room and Players avatars, with safer long-name spacing and distinctly recolored existing decorations.",
    ],
  },
  {
    version: "0.25.0",
    date: "2026-08-29",
    title: "Group clarity and expressive profiles",
    summary: "Group chats are easier to follow, while profile banners and decorations gain careful privacy controls.",
    highlights: [
      "Find groups in their own prominent searchable section, with aggregate unread, avatar stacks, clickable participants and message authors, and incremental history loading.",
      "Reach non-friend group members across rooms through a bounded one-hop creator relay when a direct BC route is unavailable; relay remains online-only, rate-bounded, best-effort, and unconfirmed.",
      "Use creator-supplied display names without weakening identity checks: authenticated MemberNumbers remain authoritative.",
      "Upload a privacy-prepared 1200×400 WebP profile banner to public Catbox storage, then view remote banners under Ask first, Always show, or Links only.",
      "Choose a strict HEX profile outline plus Golden laurel, Crimson thorns, Moonlit orbit, or Silk ribbons, with corrected status-dot layering and clearly clickable avatars.",
      "Keep expanded profile details bounded and on demand under settings schema 25, without changing the proven Blossom hook.",
    ],
  },
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
