# KikiLink

KikiLink is a standalone, modular quality-of-life addon for Bondage Club. It is
not connected to Velvet District or any previous Kiki project.

## Install

[**Install KikiLink**](https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js)

Open the link in a browser with Tampermonkey or Violentmonkey, confirm the
installation, then reload Bondage Club. The userscript checks this same address
for future KikiLink updates.

Version `0.2.1` keeps the original core and LinkChat foundation, then adds the
first complete KikiLink visual system: the wolf-and-sakura emblem, lacquer-dark
and warm-paper themes, and a dedicated phone navigation flow.

## LinkChat

- Conversation list instead of one isolated Beep at a time
- Persistent local message history
- Search by player name, member number, or message text
- Unread counters and pinned conversations
- Drafts saved per conversation
- Quick new chat by member number
- Optional room information on outgoing Beeps
- Responsive desktop and mobile interface
- Configurable history retention and a clear-history action

## Interface in 0.2.1

- Embedded KikiLink wolf, red moon, gold ring, and sakura emblem
- Dark lacquer, light paper, and follow-system appearance modes
- Red and gold design tokens shared by every LinkChat surface
- Configurable launcher side and reduced-motion mode
- Full-width mobile conversation list with a clear back-to-list flow

The emblem is bundled into the userscript, so KikiLink does not fetch visual
assets from a remote server while the game is running.

Standard Beeps still use Bondage Club's own `ServerSendBeepMessage` path, so the
recipient does not need KikiLink. No remote KikiLink server is used. Message
history and settings remain in the current browser profile.

## Architecture

```text
src/
  bc/                 Bondage Club compatibility adapter
  core/               Event bus, settings, lifecycle, module registry
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
KikiLink.close();
KikiLink.getVersion();
```

## Planned modules

- LinkActivities and declarative Activity Studio
- LinkSocial contacts, notes, and encounter history
- LinkReactions with configurable event rules
- Command palette, hotkeys, and improved room roster
- Import/export of settings and activity packs
- Stable/dev release channels and FUSAM listing

## License

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.
