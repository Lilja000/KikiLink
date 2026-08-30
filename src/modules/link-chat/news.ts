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
    version: "0.29.0",
    date: "2026-08-30",
    title: "FUSAM release and privacy hardening",
    summary: "KikiLink now has a dedicated FUSAM build, consent-first remote profile art, durable history controls, and tighter protocol and device-storage bounds.",
    highlights: [
      "Install through FUSAM with a purpose-built page-realm bundle; temporary Litterbox uploads remain available, while privileged Catbox uploads and standalone update checks stay disabled there.",
      "Choose before loading remote profile art by default, with clearer disclosure that an image host can observe the viewer's IP address and request time.",
      "Keep direct-message deletion, clearing, and retention effective across account-data synchronization, and apply group history and retention settings to durable content.",
      "Resist replay and flooding more predictably through bounded presence, typing, and activity processing, unverified quote and relay labels, and immediate account-switch shutdown.",
      "Prevent runaway device media with aggregate storage quotas, transactional checks, and orphan cleanup.",
    ],
  },
  {
    version: "0.28.1",
    date: "2026-08-29",
    title: "Quiet updates, clearer actions",
    summary: "Update discovery stays local, chat actions read naturally, and Custom Activities are easier to recognize and edit on desktop.",
    highlights: [
      "Keep update discovery inside Home: KikiLink no longer sends addon-authored update Beeps to other players, while the bounded local check and Update button remain.",
      "Read matched *action* spans in italics across direct and group chats without changing unmatched text or the guarded link, image, and Reply paths.",
      "Recognize native Custom Activity cards through an 18 px desktop Blossom marker while mobile keeps its compact 12 px size.",
      "Scroll the keyboard-accessible desktop character map to reach lower body slots; the established mobile creator layout remains unchanged.",
    ],
  },
  {
    version: "0.28.0",
    date: "2026-08-29",
    title: "Smoother groups, visible profiles",
    summary: "Group conversations now feel like direct chats, profile art is visible by default, and updates are easier to discover without adding background polling.",
    highlights: [
      "Upload profile banners and managed-group avatars to public Catbox again: the authenticated bridge now works across isolated userscript realms without a separate permission ritual.",
      "Use a compact direct-chat-sized group composer, aligned confirmation avatars, larger group identities, and a real inline Reply context instead of duplicated quote text.",
      "See profile avatars, banners, and group art by default under a dedicated Players preference while chat-message previews keep their separate privacy setting.",
      "Add a short optional bio to your KikiProfile; it travels only in a negotiated, targeted profile request and is sanitized, bounded, and cached like other saved details.",
      "Find an official Update button on Home only when a newer strict release is available through one bounded check with no polling.",
    ],
  },
  {
    version: "0.27.0",
    date: "2026-08-29",
    title: "Groups you can truly manage",
    summary: "Creator-managed groups gain identity, membership, images, and a compact menu, with faster chat rendering and a repaired banner uploader.",
    highlights: [
      "Rename your managed group, upload a clearly labeled public Catbox avatar, choose its outline, add compatible people, or kick non-owners while the group stays within 3–5 members.",
      "Right-click, use the keyboard menu key, or hold a group for one compact action menu; the shorter header leaves more room for chat.",
      "Send guarded HTTPS or privacy-prepared local images to groups and find them later in the shared lazy Gallery.",
      "Keep older fixed-member groups as honest legacy records, with an explicit creator-only conversion before any management rights exist.",
      "Upload Catbox profile banners without the fetch-mode hang, with authenticated bridge acceptance, one total deadline, and deterministic cancellation.",
      "Enjoy keyed chat rows, origin-safe replay checks, visibility-bounded remote images, safer drafts and peer switching, larger group avatars, and repaired profile/contact spacing.",
    ],
  },
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
