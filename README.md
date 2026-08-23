# KikiLink

KikiLink is a standalone, modular quality-of-life addon for Bondage Club. It is
not connected to Velvet District or any previous Kiki project.

## Install

[**Install KikiLink**](https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js)

Open the link in a browser with Tampermonkey or Violentmonkey, confirm the
installation, then reload Bondage Club. The userscript checks this same address
for future KikiLink updates.

Version `0.4.0` introduces LinkActivities: an original Activity Studio for
choosing someone in the current room, previewing a custom action, and sending it
through Bondage Club's standard room-emote path.

## LinkChat

- Conversation list instead of one isolated Beep at a time
- Native recent Beeps imported from the current game session without duplicates
- Persistent local message history
- Search by player name, member number, or message text
- Unread counters and pinned conversations
- Drafts saved per conversation
- New-chat dialog with known-contact search and direct member-number entry
- Editable Quick Actions with `{name}`, `{member}`, and `{me}` variables
- Optional room information on outgoing Beeps
- Immediate outgoing-message display independent of the compatibility hook
- Responsive desktop and mobile interface
- Configurable history retention and a clear-history action

## LinkActivities

- Dedicated `✦` Activity Studio button in the KikiLink toolbar
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
- Draggable launcher with a saved position, configurable side, and reduced-motion mode
- Full-width mobile conversation list with a clear back-to-list flow
- Live Bondage Club connection status without blocking an available native Beep function

The emblem is bundled into the userscript, so KikiLink does not fetch visual
assets from a remote server while the game is running.

Standard Beeps use Bondage Club's own `ServerSendBeepMessage` path, and
LinkActivities uses the native room-emote path, so recipients do not need
KikiLink. No remote KikiLink server is used. Message history, settings, and
custom activity templates remain in the current browser profile.

## Architecture

```text
src/
  bc/                 Bondage Club compatibility adapter
  core/               Event bus, settings, lifecycle, module registry
  modules/link-activities/  Activity templates and native room action service
  modules/link-chat/  LinkChat service and Shadow DOM interface
  storage/            IndexedDB and in-memory repositories
  utils/              Small dependency-free helpers
design/references/     Selected original KikiLink visual source
```

KikiLink uses ModSDK only as the shared compatibility layer for function hooks.
All KikiLink application logic, storage, UI, and module contracts are original.

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
KikiLink.openActivities();
KikiLink.close();
KikiLink.getVersion();
```

## Planned modules

- Activity packs, categories, favorites, and import/export
- LinkSocial contacts, notes, and encounter history
- LinkReactions with configurable event rules
- Command palette, hotkeys, and improved room roster
- Import/export of settings and activity packs
- Stable/dev release channels and FUSAM listing

## License

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.
