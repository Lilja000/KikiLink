# KikiLink

KikiLink is a standalone, modular quality-of-life addon for Bondage Club. It is
not connected to Velvet District or any previous Kiki project.

## Install

[**Install KikiLink**](https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js)

Open the link in a browser with Tampermonkey or Violentmonkey, confirm the
installation, then reload Bondage Club. The userscript checks this same address
for future KikiLink updates.

Version `0.20.0` adds AFK replies, temporary Litterbox image uploads, profile avatars, a separate
configurable room Blossom, smoother chat rendering, and a phone-friendly Custom Activities editor.

## Link Deck

- The floating emblem opens a clear feature home instead of dropping straight into chat
- Guided Home surfaces one useful next step: read unread Beeps, begin a first chat, view
  the current room, or continue the most recent conversation
- Four action-first cards use familiar names and visible verbs: Chat, Players, Custom Activities,
  and Settings
- Current connection, room, unread-chat, and room-player context at a glance
- Your KikiLink presence is always one quiet top-bar control away
- Four clear primary destinations: Home, Chat, Players, and Custom Activities
- Persistent feature rail on desktop and a focused four-item bottom bar on phones
- Players and Custom Activities stay inside the workspace instead of opening blocking dialogs
- Settings is a full workspace with Appearance, Navigation, Chat, Players, Activities, and Alerts categories
- Configurable launcher behavior: open Home, the last section, or LinkChat directly
- Dark lacquer, light paper, and system themes with five accent presets or any custom color
- Comfortable, Compact, or Super compact spacing, three text sizes, and Guided or Focused Home styles
- Contrast-aware text on every custom accent color
- Larger mobile tap targets, visible focus states, current-page semantics, and keyboard-friendly settings
- A button to reset the launcher position without dragging it
- Disabled optional features remain discoverable and lead directly to the correct setting

## LinkFinder

- A visible `Find` control in the top bar, available from every KikiLink workspace
- Local search across destinations, recent chats, current and recorded players, known contacts,
  saved activities, and all six Settings categories
- Useful suggestions before typing, prioritized unread/recent conversations, and immediate
  result refinement while typing
- Direct member-number actions such as `#12345` even when no conversation exists yet
- Results show their category and destination instead of presenting one ambiguous flat list
- Mouse, touch, `Arrow Up`/`Arrow Down`, `Enter`, and `Escape` support with combobox semantics
- Optional `Ctrl+K` / `Cmd+K` shortcut when focus is not inside an editor
- No server index: chat previews, notes, contacts, and preferences never leave this browser

## LinkRoster

- Live list of everyone else in the current chat room, using character nicknames first
- Presence dots and KikiLink status labels in player lists and detail cards
- `Whisper`, `Beep`, `Profile`, and `Copy ID` actions without retyping member numbers
- Private notes and searchable tags for individual players
- Favorites that remain easy to find after leaving the room
- Local last-seen time, last room, and encounter count
- `In room`, `Known`, and `Favorites` views with name, number, tag, and note search
- Optional encounter tracking and a one-click local-data clear action
- Versioned local JSON export and merge-safe import for moving the notebook between browsers
- Configurable cleanup of old encounter-only records while notes, tags, and favorites stay protected
- Responsive two-pane desktop view and compact phone layout inside the main Link Deck

LinkRoster notes, tags, favorites, and encounter history stay in the current
browser profile. KikiLink does not upload them to a server.

## LinkChat

- Conversation list instead of one isolated Beep at a time
- Native recent Beeps imported from the current game session without duplicates
- Persistent local message history
- Search by player name, member number, or message text
- Unread counters and pinned conversations
- Drafts saved per conversation
- Real Online/Offline information for BC friends plus Online, Idle, Do not disturb, and
  Offline status shared between compatible KikiLink users
- Short-lived typing indicators between compatible KikiLink users, with a private on/off preference
- The friend's observable current room beside their identity in the active chat
- Status notes, a direct-link profile avatar, and configurable automatic Idle with an explicit
  presence on/off control
- Optional editable AFK auto-reply while Idle, limited to one private reply per person per Idle session
- Direct HTTPS image messages that remain ordinary usable links for players without KikiLink
- Pasted Markdown, BBCode, and color wrappers are reduced to the direct image URL before sending
- Privacy-aware inline image previews: ask before loading, always show, or links only
- Account-free temporary JPG, PNG, and WebP uploads through Catbox's Litterbox, with selectable
  1, 12, 24, or 72 hour retention
- Local privacy preparation before upload: validate the real file signature, remove the original
  filename and embedded metadata, convert to WebP, and resize the longest edge to at most 2560 px
- Choosing a file never starts a network request; only the explicit `Upload & send` action uploads it
- Compact `Reply` and `Copy` icons beside messages, with plain-text quotes compatible with native Beeps
- Private local nicknames for chats that never change outgoing content or another player's view
- Remove one conversation from KikiLink recents and local history without unfriending the player
  or changing Bondage Club's native Beep log; a genuinely new message brings the chat back
- Enter-to-send with Shift+Enter for a new line, or an optional classic multiline mode
- Right-click on desktop or hold on touch to open one player action menu from recent chats,
  the active chat, known contacts, and Players
- Context actions for Message, Whisper, native Profile, favorites, notes, local nicknames,
  pinning, marking unread, per-chat removal, and copying the member ID
- New-chat dialog with known-contact search and direct member-number entry
- Editable Quick Actions with `{name}`, `{member}`, and `{me}` variables
- Optional room information on outgoing Beeps
- Immediate outgoing-message display independent of the compatibility hook
- Reliable live incoming-message capture across Bondage Club's null and empty normal Beep types
- Strict removal of the known trailing `{"messageType":"Message","messageColor":"#ffffff"}`
  compatibility envelope without stripping ordinary JSON-like user text
- Smooth bounded rendering: 120 recent messages at once, incremental live append, stable image-card
  geometry, and on-demand older history
- Stable scrolling without viewport-triggered message paint; older history is prepended without replacing
  messages already on screen
- Softly grouped incoming and outgoing bubbles with a very light one-pixel top gradient
- Responsive desktop and mobile interface
- Configurable history retention and a clear-history action

## Custom Activities

- A dedicated Custom Activities destination, visible by default and optional in Settings
- An intentionally empty starting library: KikiLink does not make choices for the player
- A focused creator that renders the current character and keeps every body slot visible in a
  tap-friendly selection grid
- A canonical set of 33 unique vanilla Bondage Club activity pictures, without LSCG assets,
  item-action icons, or visual duplicates
- Mobile layouts keep the character, two-column slot grid, horizontally scrolling picture gallery,
  and save controls usable inside one predictable scroll area
- Quick `{me}`, `{target}`, `{target's}`, and `{target's gender}` variables with a live preview
- Other-character targeting by default; self-only and both modes live inside `Advanced`
- Optional arousal is off by default and exposes a bounded `1–20` base-amount slider only when enabled
- Saved actions are registered beside vanilla activities on the selected body slot
- Every native custom-activity button carries KikiLink's translucent Blossom marker
- Other players receive one ordinary finished action sentence, including players without KikiLink
- Compatible KikiLink recipients validate sender, target, body group, amount, and nonce before handing
  optional arousal to Bondage Club's own preference-aware activity system
- Up to 100 local actions; invalid names, paths, amounts, duplicate IDs, and oversized fields are sanitized
- Schema-13 migration preserves user-written legacy actions while removing the old bundled starter pack

Custom Activities never change items, poses, or permissions. Optional arousal is the only gameplay
effect and must be enabled per activity; a recipient without KikiLink still sees the action text but
does not process the KikiLink arousal metadata.

## LinkReactions

- Dedicated Alerts category with one switch for friends coming online and one for players joining the room
- Private local notices that remain visible beside the launcher while the panel is closed
- Optional notification sounds, disabled by default
- Distinct built-in Soft chime, Sakura sparkle, and Gentle pop sounds for chats, friends, and room joins
- Sound choices and preview controls stay inside a compact optional disclosure
- The complete event-rule editor remains available inside Advanced instead of filling the main screen
- Advanced triggers for incoming Beeps, room joins/leaves, and friends online, with scopes, text matching,
  cooldowns, templates, private notices, or explicitly enabled room emotes
- Public room emotes keep the global 10-second guard and never substitute private `{message}` content
- Quiet room and online baselines prevent a new session from reacting to everyone already present
- Advanced alert rules never send automatic Beep replies and use no remote rules service or
  background network polling; the separate AFK profile option is the only guarded auto-reply path

Alert choices and rules stay in the current browser profile. Sounds are synthesized locally with
the browser audio API, so KikiLink downloads no audio files. Advanced room-emote rules use the
same native Bondage Club emote path and are visible to everyone in the room.

## Interface

- The original wolf-and-red-moon KikiLink emblem is restored in the launcher and workspace
- A separate quiet translucent Blossom appears in the room addon-icon row for your own character and
  confirmed compatible KikiLink peers; its preset position and fine offsets are configurable, it
  respects Bondage Club's native icon-visibility control, and it adds no new presence traffic
- Original dependency-free SVG icons with one consistent rounded line style across navigation,
  chat controls, favorites, pins, images, dialogs, and player actions
- Dark lacquer, light paper, and follow-system appearance modes
- Red and gold design tokens shared by every LinkChat surface
- Link Deck home with a context-aware next step, live feature status, and clear action labels
- Desktop side navigation that becomes a four-destination mobile bottom bar
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

Standard Beeps use Bondage Club's own `ServerSendBeepMessage` path. LinkRoster
uses the game's native Whisper and profile controls, and Custom Activities extend
the game's native activity registry and action path. Image messages are ordinary HTTPS links, so other players
do not need KikiLink to open them. Optional local-file upload sends a privacy-prepared WebP
directly to Catbox's temporary Litterbox service only after `Upload & send`; it never passes through
a KikiLink server. Profile avatars are user-supplied direct HTTPS links. Otherwise no remote KikiLink server is used; message
history, player notes, settings, and custom templates remain in the current browser
profile. Presence uses small validated compatibility packets through Bondage Club:
one hidden room handshake when needed and a point-to-point request for an opened chat,
never a background Beep broadcast to every friend.

## Architecture

```text
src/
  bc/                 Bondage Club compatibility adapter
  core/               Event bus, settings, lifecycle, module registry
  modules/link-activities/  Native custom-activity registry, editor, migration, and safety
  modules/link-chat/  LinkChat service and Shadow DOM interface
  modules/link-presence/ Presence state, native-online merge, and compatibility protocol
  modules/link-reactions/ Local event rules and guarded reaction execution
  modules/link-roster/ Room roster, encounter tracking, and notebook service
  storage/            IndexedDB, player notebook, and in-memory repositories
  utils/              Small dependency-free helpers
design/branding/       Shipping KikiLink wolf emblem and Blossom marker
design/references/     Full-resolution KikiLink visual reference
docs/                  UX principles and accessibility decisions
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
