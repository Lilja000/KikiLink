# KikiLink

KikiLink is a standalone, modular quality-of-life addon for Bondage Club. It is
not connected to Velvet District or any previous Kiki project.

## Install

[**Install KikiLink**](https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js)

Open the link in a browser with Tampermonkey or Violentmonkey, confirm the
installation, then reload Bondage Club. The userscript checks this same address
for future KikiLink updates.

Version `0.27.0` runs all Bondage Club and ModSDK integration in the page realm without reading
`unsafeWindow`. Only structured upload fields cross into the DOM-only userscript sandbox for the narrowly
granted Catbox/Litterbox request. This release adds creator-managed groups with mutable membership,
group identity controls, image messages, and a compact accessible action menu; it also fixes the Catbox
banner transport, profile/contact layout edges, and several chat rendering, upload, and concurrency races.
It does not change the proven
Blossom integration: the flower still joins the same BC-native status-icon boundary as Echo and WCE
exactly once and sits directly below Echo's clothing icon, clear of the chat edge. It is
shown only for the authenticated character and protocol-confirmed KikiLink peers, independently of
optional Presence profile sharing. KikiLink never wraps BCX's outer overlay or polls the character
draw loop during normal play. If BC is still decoding the SVG, a cached vector copy renders the
Blossom immediately in the same canvas frame.
The running version remains visible as tiny translucent digits in the
lower-left corner.

## Link Deck

- The floating emblem opens a clear feature home instead of dropping straight into chat
- Guided Home surfaces one useful next step: read unread Beeps, begin a first chat, view
  the current room, or continue the most recent conversation
- Action-first cards use familiar names and visible verbs for Chat, Players, Custom Activities,
  Gallery, and Settings
- Current connection, room, unread-chat, and room-player context at a glance
- Your avatar, name, presence, custom status, and local time remain visible in the top bar
- A News tab beside the KikiLink brand keeps the current release and recent changelog inside the addon
- Six clear primary destinations: Home, Chat, Players, Room, Music, and Custom Activities
- Persistent feature rail on desktop and a focused six-item bottom bar on phones
- Players and Custom Activities stay inside the workspace instead of opening blocking dialogs
- Settings is a full workspace with Appearance, Navigation, Chat, Players, Activities, Alerts, and About categories
- Configurable launcher behavior: open Home, the last section, or LinkChat directly
- Dark lacquer, light paper, and system themes with five accent presets or any custom color
- Comfortable, Compact, or Super compact spacing, three text sizes, and Guided or Focused Home styles
- Contrast-aware text on every custom accent color
- Larger mobile tap targets, visible focus states, current-page semantics, and keyboard-friendly settings
- A button to reset the launcher position without dragging it
- Drag the desktop window from the brand or any empty top-bar space; controls never steal a drag
- Disabled optional features remain discoverable and lead directly to the correct setting

## LinkFinder

- A visible `Find` control in the top bar, available from every KikiLink workspace
- Local search across destinations, recent chats, current and recorded players, known contacts,
  saved activities, and all seven Settings categories
- Useful suggestions before typing, prioritized unread/recent conversations, and immediate
  result refinement while typing
- Direct member-number actions such as `#12345` even when no conversation exists yet
- Results show their category and destination instead of presenting one ambiguous flat list
- Mouse, touch, `Arrow Up`/`Arrow Down`, `Enter`, and `Escape` support with combobox semantics
- Optional `Ctrl+K` / `Cmd+K` shortcut when focus is not inside an editor
- No search server: the Finder index is rebuilt in memory from the active account's KikiLink data

## LinkRoster

- Live list of everyone else in the current chat room, using character nicknames first
- Presence dots and KikiLink status labels in player lists and detail cards
- Visible player lists discover compatible KikiLink Presence through a quiet rate-limited queue that
  targets only current-room players or reachable online BC friends
- Profile avatars use the same explicit `Ask first`, `Always show`, or `Links only` privacy choice;
  initials and decorative frames remain available without requesting the remote image
- Account-derived Friend, Owner, Sub, Lover, Whitelist, Blacklist, and Ghosted badges
- `Whisper`, `Beep`, `Profile`, and `Copy ID` actions without retyping member numbers
- KikiLink profile cards opened from compatible avatars or player action menus, with name, presence,
  custom status, observable room, addon version, and relationship badges in one compact view
- Up to 200 last-shared public profile records stay in a 90-day account-local LRU cache. Saved cards
  open immediately with a visible `SAVED PROFILE` label, or `SAVED DETAILS` when current status is live,
  and revalidate on an explicit open; live status and room, private notebook fields, relationships,
  and fetched image blobs are never cached. Banner/outline/gradient age is updated only by an actual
  profile-details reply, not by an unrelated presence heartbeat
- Public profile banners can be prepared locally as an exact 1200×400 metadata-free WebP, capped at
  2 MiB, and uploaded through an explicitly labeled action to long-lived public Catbox storage;
  progress is visible, slow connections get up to 180 seconds, and Cancel or dialog close aborts the
  real upload request
- Remote profile banners follow the same `Ask first`, `Always show`, or `Links only` privacy choice
  and guarded image loader as avatars
- Optional Sakura blossoms, Scarlet rose ring, Violet starlight, Golden laurel, Poison thorns,
  Silver moon orbit, or Jade ribbons avatar decorations; Classic, Garden, or Midnight profile styles;
  a strict custom HEX outline; and an optional contrast-aware two-color profile gradient
- Room and Players list/detail avatars are keyboard-focusable KikiLink profile buttons, clickable
  avatars expose a pointer cursor, and the presence dot stays above every decoration
- A clearly separated `Only visible to you` section for the private note, tags, last recorded room,
  and encounter count
- Private notes and searchable tags for individual players
- Favorites that remain easy to find after leaving the room
- Per-account last-seen time, last room, and encounter count
- `In room`, `Known`, and `Favorites` views with name, number, tag, and note search
- Optional encounter tracking and a one-click local-data clear action
- Versioned local JSON export and merge-safe import for moving the notebook between browsers
- Configurable cleanup of old encounter-only records while notes, tags, and favorites stay protected
- Responsive two-pane desktop view and compact phone layout inside the main Link Deck

LinkRoster notes, tags, favorites, and encounter history belong only to the current BC MemberNumber.
They are kept in an account-scoped browser copy and included in KikiLink's bounded BC account mirror
so they can follow that same account to another device.

## LinkChat

- Conversation list instead of one isolated Beep at a time
- One chronological, searchable conversation list for direct Beeps and separate 3–5-member addon
  groups; group rows use participant-avatar stacks and an explicit `GROUP` badge
- Group and direct transports/history remain isolated while sharing familiar previews, pins, times,
  unread counts, Gallery access, and new-chat actions
- Choose 2–4 known BC friends that recently advertised managed-group support and confirm the complete
  participant list before invitations are sent. The creator is visibly identified and can rename a
  managed group, upload a privacy-prepared avatar to explicitly labeled public Catbox storage, set a
  direct avatar link and outline color, and add or kick compatible members while keeping the total at
  3–5 people
- Existing fixed-membership groups remain readable and usable as legacy groups. Their creator can choose
  an explicit conversion to a new creator-bound managed ID; KikiLink never infers admin rights from an
  old ambiguous group packet
- Right-click, keyboard Context Menu/Shift+F10, or touch-and-hold a group to open one accessible menu
  for details, pinning, local removal, and close. The compact header leaves more room for messages
- Clickable participant chips, creation/confirmation members, and message-author avatars open KikiLink
  profiles with the same mouse, keyboard, context-menu, and touch behavior as other player avatars
- The newest 120 group messages render first, with older history added in bounded 100-message pages;
  slightly larger author avatars and a keyed transcript avoid unnecessary replacement while names update
- Group composers accept the same direct HTTPS image links and explicit privacy-prepared local uploads as
  direct chats. Group images use the existing protected preview policy and also appear in the lazy Gallery
- Custom group avatars follow the same `Ask first`, `Always show`, or `Links only` image policy. Under
  `Ask first`, `Show group avatar` in the group menu reveals only that exact creator-and-URL for the session
- Group drafts, removal, and honest per-recipient local BC handoff feedback; the protocol does not
  claim delivery receipts
- Incoming group invitations auto-accept only from known BC friends; sharing a room alone never lets
  another participant create local group records
- When BC has no direct route between two members, the author may hand the packet to the group creator
  for one-hop forwarding. This works only while the creator is online, running the compatible addon,
  reachable, and able to reach the recipient; there is no offline queue, retry service, or confirmation
- Creator relay is rate-bounded, short-lived, block-aware, restricted to the authenticated current
  membership and epoch, and never relays a relayed packet. The creator remains the trust root, so groups
  should be created only with a trusted creator
- Creator-supplied display names help identify participants without becoming authority: authenticated
  MemberNumbers still control sender identity, membership, replay checks, and rate limits
- Replay identity combines the authenticated original MemberNumber with the message ID, so another
  member cannot suppress an authentic direct or creator-relayed message by racing the same visible ID
- Every group packet stays within its validated versioned bound (700 UTF-16 characters for legacy,
  700 UTF-8 bytes for managed), including worst-case escaping; managed state uses monotonic revisions
  and a fresh epoch whenever membership changes
- Native recent Beeps imported from the current game session without duplicates
- Persistent message history in a separate local database for each BC account
- A bounded mirror of up to 600 recent messages follows the same BC account to another device
- Search by player name, member number, or message text
- Unread counters and pinned conversations
- Drafts saved per conversation
- Real Online/Offline information for BC friends plus Online, Idle, Do not disturb, and
  Offline status shared between compatible KikiLink users
- Short-lived typing indicators between compatible KikiLink users, with a private on/off preference
- The friend's observable current room beside their identity in the active chat
- Status notes, a direct-link profile avatar, and configurable automatic Idle with an explicit
  presence on/off control
- Do not disturb suppresses local alert toasts and sounds and prevents automatic chat opening while
  unread messages continue to be stored normally
- Optional editable auto-reply while Idle or DND, limited to one private reply per person per session
- Direct HTTPS image messages that remain ordinary usable links for players without KikiLink
- Pasted Markdown, BBCode, and color wrappers are reduced to the direct image URL before sending
- Privacy-aware uncropped full-width image previews: ask before loading, always show, or links only
- Image previews hide the repeated raw URL; `Show original` is the only outbound link on the card
- Account-free temporary JPG, PNG, and WebP sharing through Litterbox, with selectable
  1, 12, 24, or 72 hour retention and generic source filenames
- Local privacy preparation before upload: validate the real file signature, declared JPG/PNG/WebP
  dimensions, and bounded APNG/WebP animation cycle before browser decode; remove the original
  filename and embedded metadata, convert to WebP, and resize the longest edge to at most 2560 px
- Choosing a file never starts a network request; only the explicit `Upload & send` action uploads it
- Compact `Reply` and `Copy` icons beside messages, with plain-text quotes compatible with native Beeps
- Private local nicknames for chats that never change outgoing content or another player's view
- Remove one conversation from KikiLink recents and local history without unfriending the player
  or changing Bondage Club's native Beep log; a genuinely new message brings the chat back
- Enter-to-send with Shift+Enter for a new line, or an optional classic multiline mode
- Right-click on desktop or hold on touch to open one player action menu from recent chats,
  the active chat, known contacts, and Players
- Context actions for Message, Whisper, KikiLink Profile, native Profile, favorites, notes, local nicknames,
  pinning, marking unread, per-chat removal, and copying the member ID
- New-chat dialog with known-contact search, direct member-number entry, All/Online/In-room filters,
  and Online-first or A–Z sorting
- Editable Quick Actions with `{name}`, `{member}`, and `{me}` variables
- Optional room information on outgoing Beeps
- Immediate outgoing-message display independent of the compatibility hook
- Reliable live incoming-message capture across Bondage Club's null and empty normal Beep types
- Strict removal of the known trailing `{"messageType":"Message","messageColor":"#ffffff"}`
  compatibility envelope and anchored LikoMAT language trailer, including lazy cleanup of saved
  previews/history, without stripping malformed or ordinary JSON-like user text
- Smooth bounded rendering: 120 recent messages at once, incremental live append, stable image-card
  geometry, and on-demand older history
- Keyed mixed-chat rows, cached summaries, coalesced animation-frame updates, and leased remote-image
  object URLs keep the chat list responsive without dropping features or image quality
- Guarded remote previews validate format and decoded/animated resource bounds before display, start
  only near visible UI, cap concurrent requests and decodes, and retain only a small bounded set of rich
  message previews; AVIF stays link-only because it cannot yet be bounded safely before browser decode
- Stable scrolling without viewport-triggered message paint; older history is prepended without replacing
  messages already on screen
- Softly grouped incoming and outgoing bubbles with a very light one-pixel top gradient
- Responsive desktop and mobile interface
- Configurable history retention and a durability-aware clear-history action that warns when browser
  storage could clear only the current session

## Room Tools & Media Gallery

- A Room destination that reads the current room and enables editing only for native room admins
- Background URL, native resize mode, music URL, and synchronized playback controls
- Compact `Room`, `Lobbies`, and `Presets` subtools without another primary navigation tab
- Manual native room-directory refresh, local filtering, current-room first then favorite- and
  friend-first ordering, clear Character/Map view labels, and up to five friend avatars per lobby
- The current room remains visible at the top through filters and directory failures, and replaces
  its Join button with a non-interactive `Current room` badge
- Lobby Join checks the native leave permission, waits for BC to finish leaving, performs the native
  room join, and reports success only after the requested room becomes current
- Account-scoped favorite room names with gold cards; friend rooms use the selected accent color
- Account-scoped room presets for name, description, native/custom backgrounds, music, size,
  language, access, limits, admins, whitelist, blacklist, and blocked categories
- Applying a preset requires current room-admin rights and always preserves the current user as an admin;
  passwords and large map layouts are deliberately excluded
- Explicit native Kick, Promote/Demote, and room Whitelist/Unwhitelist actions; Kick asks for confirmation
- Every player avatar in Room opens that member's KikiLink profile as a separate accessible action
- Local image preparation and temporary Litterbox sharing can fill the room background field;
  renamed MP3/MP4 room audio up to 20 MB can fill the music field
- A device-local Music track has a `Share & use as room music` action that creates and reuses a
  temporary Litterbox link, then opens the same review-and-apply Room Tools flow as Gallery
- A lazy all-chat gallery deduplicates direct and group images across saved conversations and labels Catbox/Litterbox media
- A visible Gallery Home card and labeled Chat button open the library without adding another main tab
- Direct image links can be saved without sending a chat message; privacy-prepared local additions are
  either kept indefinitely in account-isolated IndexedDB on that device, uploaded to public Catbox
  without automatic expiry, or uploaded to public Litterbox for a chosen 1–72 hour lifetime
- Gallery Remove permanently deletes device-local images; removing a linked/chat card leaves its chat
  and remote file untouched
- Gallery cards keep full image proportions, expose only `Show original`, reopen the source chat, and
  can fill the room background field for administrators

## Music & Playlists

- A lacquer-and-gold now-playing card with a searchable queue, seek bar, previous/next, shuffle,
  repeat-one/repeat-all, independent volume, mute, playback speed, and a sleep timer
- Rename, duplicate, clear, and delete playlists; rename, reorder, open, or remove individual tracks
- Select several local files in one pass and see live progress during sequential Catbox uploads
- Browser/OS Media Session controls for play, pause, seeking, and previous/next where supported
- Direct HTTPS tracks, local browser-only files up to 80 MB, or explicitly uploaded long-lived
  Catbox tracks with generic filenames
- Anonymous Catbox tracks are retained until two years of inactivity; KikiLink does not send a
  Catbox account token, so it does not describe those uploads as strictly permanent
- Playlist actions live in one compact Manage menu, and the library/player switch to a single
  scrollable column before controls can overlap on medium or narrow screens
- Local blobs stay in an account-isolated IndexedDB on the current device; playlist metadata and
  remote URLs follow the signed-in BC account within KikiLink's bounded settings mirror
- Missing local files are clearly marked after moving to another device instead of silently failing
- A session-only Room switch lets an administrator make compatible remote or device-local MP3/MP4
  tracks follow the current playlist. Local tracks are shared temporarily only when first needed,
  and the same live link is reused while it remains valid

## About

- A translucent KikiLink wolf emblem and compact project card inside Settings
- Creator Kiki (`Member 0`), the current stable version, MIT license, and account-data scope
- Official repository and KikiLink Discord: <https://discord.gg/6sgGTnptht>

## Custom Activities

- A dedicated Custom Activities destination, visible by default and optional in Settings
- An intentionally empty starting library: KikiLink does not make choices for the player
- A focused creator that renders the current character and keeps the selected body slot in one
  compact row; `Show all` expands the complete tap-friendly selection grid only when needed
- A canonical set of 33 unique vanilla Bondage Club activity pictures, without LSCG assets,
  item-action icons, or visual duplicates
- Mobile layouts keep the character, expandable two-column slot grid, horizontally scrolling
  picture gallery, and save controls usable inside one predictable scroll area
- Quick `{me}`, `{source}`, `{target}`, `{target's}`, and `{target's gender}` variables with a live
  preview; known variables tolerate capitalization and accidental inner spacing
- Other-character targeting by default; self-only and both modes live inside `Advanced`
- Optional arousal is off by default and exposes a bounded `1–20` base-amount slider only when enabled
- Saved actions wait for Bondage Club's live registry and stay registered beside vanilla activities
  on the selected body slot even if the game rebuilds that registry
- Labels, selected pictures, and clicks are repaired directly on the native activity card, so
  Custom Activities still work when page-function hooks are isolated or replaced
- Every native custom-activity button carries KikiLink's 12 px cartoon Blossom marker in its upper-left corner
- Other players receive one ordinary finished action sentence, including players without KikiLink
- Compatible KikiLink recipients validate sender, target, body group, amount, and nonce before handing
  optional arousal to Bondage Club's own preference-aware activity system
- Up to 100 account-owned actions; invalid names, paths, amounts, duplicate IDs, and oversized fields are sanitized
- Schema-13 migration preserves user-written legacy actions while removing the old bundled starter pack

Custom Activities never change items, poses, or permissions. Optional arousal is the only gameplay
effect and must be enabled per activity; a recipient without KikiLink still sees the action text but
does not process the KikiLink arousal metadata.

## LinkReactions

- Dedicated Alerts category with one switch for friends coming online and one for players joining the room
- Private local notices that remain visible beside the launcher while the panel is closed
- Optional notification sounds, disabled by default
- Adjustable 0–100 alert volume for every notification sound
- Distinct built-in Soft chime, Sakura sparkle, and Gentle pop sounds for chats, friends, and room joins
- Custom audio files up to five seconds and 10 MB, validated and stored only in this browser's IndexedDB
- Sound choices and preview controls stay inside a compact optional disclosure
- The complete event-rule editor remains available inside Advanced instead of filling the main screen
- Advanced triggers for incoming Beeps, room joins/leaves, and friends online, with scopes, text matching,
  cooldowns, templates, private notices, or explicitly enabled room emotes
- Public room emotes keep the global 10-second guard and never substitute private `{message}` content
- Quiet room and online baselines prevent a new session from reacting to everyone already present
- Advanced alert rules never send automatic Beep replies and use no remote rules service or
  background network polling; the separate AFK profile option is the only guarded auto-reply path

Alert choices and rules belong to the current BC account and use the same bounded account mirror.
Built-in sounds are synthesized locally. Custom sound files never enter BC account sync and are
decoded once per session for efficient replay. Advanced room-emote rules use the same native Bondage
Club emote path and are visible to everyone in the room.

## Interface

- The original wolf-and-red-moon KikiLink emblem is restored in the launcher and workspace
- A separate upright cartoon Blossom uses the native character canvas at a small 35-unit scale,
  follows each character's position and zoom, and respects hidden icons and vanilla subscreens
- The flower ignores ordinary gameplay input and can be dragged only after choosing `Move flower`
  in Appearance while the authenticated character is visible in a room
- Original dependency-free SVG icons with one consistent rounded line style across navigation,
  chat controls, favorites, pins, images, dialogs, and player actions
- Dark lacquer, light paper, and follow-system appearance modes
- Red and gold design tokens shared by every LinkChat surface
- Link Deck home with a context-aware next step, live feature status, and clear action labels
- Desktop side navigation that becomes a six-destination mobile bottom bar
- Custom accent color and configurable launcher destination
- Comfortable/Compact/Super compact density, three text sizes, and Guided/Focused Home layouts
- A calmer Super compact presentation that removes secondary chrome without hiding primary actions
- Draggable launcher with a saved position, button-based reset, configurable side, and reduced-motion mode
- Launcher appears only after Bondage Club has authenticated an account
- Full-page categorized settings that remember the last category
- LinkFinder for immediate access to chats, players, activities, and deeply nested settings
- Accessible current-location, focus, live-status, and error semantics
- Full-width mobile conversation list with a clear back-to-list flow
- Live Bondage Club connection status without blocking an available native Beep function

The wolf emblem and Blossom marker are both bundled inside the userscript, so KikiLink does not
fetch branding assets from a remote server while the game is running.

KikiLink's own Beeps use Bondage Club's `ServerSendBeepMessage` path, while its history listener
captures normal `AccountBeep` sends from native BC and messenger addons such as LianChat. LinkRoster
uses the game's native Whisper and profile controls, and Custom Activities extend
the game's native activity registry and action path. Image messages are ordinary HTTPS links, so other players
do not need KikiLink to open them. Optional local-file sharing sends a privacy-prepared WebP
directly to Litterbox only after `Upload & send`; it never passes through a KikiLink server.
Manually added Gallery files stay device-local by default; Catbox and Litterbox require an explicit
public-storage choice and final upload action. Profile avatars are user-supplied direct HTTPS links. No remote KikiLink server is
used. Full data is stored locally under the authenticated MemberNumber; a bounded portable snapshot
is stored in that same player's Bondage Club `ExtensionSettings` so settings, activities, profile
preferences, notebook data, and recent chats can follow the account to another device. Presence uses
small validated compatibility packets through Bondage Club: a hidden room handshake on entry,
a compact hidden presence heartbeat for late-loading peers, and a point-to-point request for an
opened chat—never a background Beep broadcast to every friend. Expanded banner and outline details use
a separate bounded response requested only when a compatible profile is explicitly opened. Addon group
chats use direct validated packets where BC provides a route; otherwise an authored packet may take one
best-effort hop through the online group creator. KikiLink has no group server or offline relay queue.

## Account data and switching

- Every localStorage key and IndexedDB database is derived from the authenticated BC MemberNumber.
- Logout removes the entire KikiLink interface and stops its timers, hooks, and repositories.
- Switching accounts without reloading tears down the old instance before creating the new one.
- Legacy unscoped KikiLink data is quarantined, not silently assigned to whichever account logs in first.
- The portable snapshot is bounded to 120,000 encoded characters. Settings are retained first;
  recent chats are trimmed before notebook data if the account approaches that safety bound.
- Group chats use a separate account-scoped browser record bounded to 30 groups, 500 messages per
  group, 3,000 group messages overall, and 512 small removal/revocation tombstones.
- Cloud-mirror writes are batched, and a temporary sync failure leaves the complete local copy and
  pending changes available for a later retry.
- The complete local account copy remains available even when BC account sync is temporarily unavailable.

## Architecture

```text
src/
  bc/                 Bondage Club compatibility adapter
  core/               Event bus, settings, lifecycle, module registry
  modules/link-activities/  Native custom-activity registry, editor, migration, and safety
  modules/link-chat/  Direct/group chat services, protocols, and Shadow DOM interface
  modules/link-presence/ Presence state, native-online merge, and compatibility protocol
  modules/link-reactions/ Local event rules and guarded reaction execution
  modules/link-roster/ Room roster, encounter tracking, and notebook service
  storage/            IndexedDB, player notebook, and in-memory repositories
  utils/              Small dependency-free helpers
design/branding/       Shipping KikiLink wolf emblem and Blossom marker
design/references/     Full-resolution KikiLink visual reference
docs/                  UX principles, accessibility decisions, and protocol notes
```

KikiLink listens to the native Bondage Club socket for Beeps and friend presence, and uses
ModSDK only for isolated compatibility fallbacks around native functions. All KikiLink
application logic, storage, UI, and module contracts are original.

## Development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run check
```

Build output:

```text
dist/KikiLink.user.js
```

Install that file through Tampermonkey or Violentmonkey while developing
locally. The public build is available through the installation link above.

## Public API

After startup, KikiLink exposes a deliberately small API:

```js
KikiLink.open();
KikiLink.openChat(123456);
KikiLink.openRoster();
KikiLink.openActivities();
KikiLink.close();
KikiLink.getVersion();
```

## Planned modules

- Per-conversation notification controls and configurable hotkeys
- Import/export of remaining settings
- Stable/dev release channels and FUSAM listing

## License

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.
