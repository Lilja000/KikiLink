# KikiLink

KikiLink is a standalone, modular quality-of-life addon for Bondage Club. It is
not connected to Velvet District or any previous Kiki project.

## Install

[**Install KikiLink**](https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js)

Open the link in a browser with Tampermonkey or Violentmonkey, confirm the
installation, then reload Bondage Club. The userscript checks this same address
for future KikiLink updates.

Version `0.12.1` receives Beeps and online-friend state directly from Bondage Club's active
connection, recovers safely across addon-hook conflicts and reconnects, and keeps the smooth
bounded message feed introduced in 0.12.0.

## Link Deck

- The floating emblem opens a clear feature home instead of dropping straight into chat
- Guided Home surfaces one useful next step: read unread Beeps, begin a first chat, view
  the current room, or continue the most recent conversation
- Four action-first cards use familiar names and visible verbs: Chat, Players, Activities,
  and Settings
- Current connection, room, unread-chat, and room-player context at a glance
- Your KikiLink presence is always one quiet top-bar control away
- Four clear primary destinations: Home, Chat, Players, and Activities
- Persistent feature rail on desktop and a focused four-item bottom bar on phones
- Players and Activities now stay inside the workspace instead of opening blocking dialogs
- Settings is a full workspace with Appearance, Navigation, Chat, Players, and Activities categories
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
  saved activities, and all five Settings categories
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
- Status notes and optional automatic Idle with an explicit presence on/off control
- Direct HTTPS image messages that remain ordinary usable links for players without KikiLink
- Privacy-aware inline image previews: ask before loading, always show, or links only
- `Reply` and `Copy` actions on messages, with plain-text quotes compatible with native Beeps
- Enter-to-send with Shift+Enter for a new line, or an optional classic multiline mode
- Right-click on desktop or hold on touch to open one player action menu from recent chats,
  the active chat, known contacts, and Players
- Context actions for Message, Whisper, native Profile, favorites, notes, pinning,
  marking unread, and copying the member ID
- New-chat dialog with known-contact search and direct member-number entry
- Editable Quick Actions with `{name}`, `{member}`, and `{me}` variables
- Optional room information on outgoing Beeps
- Immediate outgoing-message display independent of the compatibility hook
- Reliable live incoming-message capture across Bondage Club's null and empty normal Beep types
- Smooth bounded rendering: 120 recent messages at once, incremental live append, and on-demand older history
- Responsive desktop and mobile interface
- Configurable history retention and a clear-history action

## LinkActivities

- Optional `✦` Activities destination, disabled by default
- Current-room target picker with nickname and member-number search
- Five original starter activities with live room preview
- Editable activity library with up to 20 custom actions
- `{target}`, `{member}`, and `{source}` template variables
- Standard Bondage Club room emotes that remain visible to players without KikiLink
- Safe target revalidation immediately before an action is sent

LinkActivities sends descriptive roleplay emotes only. It does not alter another
character's items, pose, permissions, or game state.

## Interface

- Embedded KikiLink wolf, red moon, gold ring, and sakura emblem
- Dark lacquer, light paper, and follow-system appearance modes
- Red and gold design tokens shared by every LinkChat surface
- Link Deck home with a context-aware next step, live feature status, and clear action labels
- Desktop side navigation that becomes a four-destination mobile bottom bar
- Custom accent color and configurable launcher destination
- Comfortable/Compact/Super compact density, three text sizes, and Guided/Focused Home layouts
- A calmer Super compact presentation that removes secondary chrome without hiding primary actions
- Draggable launcher with a saved position, button-based reset, configurable side, and reduced-motion mode
- Full-page categorized settings that remember the last category
- LinkFinder for immediate access to chats, players, activities, and deeply nested settings
- Accessible current-location, focus, live-status, and error semantics
- Full-width mobile conversation list with a clear back-to-list flow
- Live Bondage Club connection status without blocking an available native Beep function

The emblem is bundled into the userscript, so KikiLink does not fetch visual
assets from a remote server while the game is running.

Standard Beeps use Bondage Club's own `ServerSendBeepMessage` path. LinkRoster
uses the game's native Whisper and profile controls, and LinkActivities uses the
native room-emote path. Image messages are ordinary HTTPS links, so other players
do not need KikiLink to open them. No remote KikiLink server is used; message
history, player notes, settings, and custom templates remain in the current browser
profile. Presence uses small validated compatibility packets through Bondage Club:
one hidden room handshake when needed and a point-to-point request for an opened chat,
never a background Beep broadcast to every friend.

## Architecture

```text
src/
  bc/                 Bondage Club compatibility adapter
  core/               Event bus, settings, lifecycle, module registry
  modules/link-activities/  Activity templates and native room action service
  modules/link-chat/  LinkChat service and Shadow DOM interface
  modules/link-presence/ Presence state, native-online merge, and compatibility protocol
  modules/link-roster/ Room roster, encounter tracking, and notebook service
  storage/            IndexedDB, player notebook, and in-memory repositories
  utils/              Small dependency-free helpers
design/references/     Selected original KikiLink visual source
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

- Activity packs, categories, favorites, and import/export
- LinkReactions with configurable event rules
- Privacy-reviewed optional media upload service for local files
- Per-conversation notification controls and configurable hotkeys
- Import/export of settings and activity packs
- Stable/dev release channels and FUSAM listing

## License

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.
