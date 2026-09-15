# KikiLink local development — 2026-09-07

This work is on `local/fusam-qol-20260907`, based on the existing unpublished
Catbox preparation commit `1ebc5b0`. The package version stays `0.29.0`.
No push, release, version change, tag change, or FUSAM manifest change is authorized.
The checked-out release files in `dist/` are preserved exactly as they were at that base.
The prepared Catbox relay remains disabled.

## Changes in this local build

- Online friends outside a room show **Lobby**. Private rooms remain private; offline
  friends are not presented as being in the Lobby.
- The launcher returns to the last tab, including Settings and an open group chat.
  The first launcher opening after a page reload starts at Home. Existing navigation
  preferences remain available, with “last tab” as the new default.
- A small Blossom badge on avatars means **KikiLink detected** from recent peer traffic.
  An absent badge means detection is unavailable, not proof that the addon is uninstalled.
- Group creation finds online addon friends in other rooms and the Lobby, refreshes
  expired capabilities promptly, and excludes offline friends even when old peer data
  remains cached. Participants do not need to be mutual friends. Groups have 3–5 members.
  The creator must stay online with KikiLink to forward messages between non-friends.
- Hold the launcher for about half a second, right-click it, or press Shift+F10 while
  it is focused to open **Quick actions**: mark all chats as read, mute notifications
  for 15 minutes / 1 hour / 8 hours / until resumed, and resize the icon from 40 to 88 px.
  Muting retains unread counts; marking read retains messages and drafts. Do Not Disturb
  remains respected. Dragging cancels the hold gesture.
- Chat images, avatars, banners, and group art show automatically by default.
  Settings still offer **Ask before loading** and **Links only**. The migration updates
  the old ask-first default once and preserves an existing Links only preference.
  Internal settings schema 29 is a data migration, not a package/release version bump.
- Chat has **All / Unread / Groups** filters and visible draft previews. Relay labels
  and delivery feedback are shorter; unverified relayed authors remain identified.
- Discovery now completes both directions when startup queries race another client's
  hooks. Startup failures retry with bounded backoff; logout during storage initialization
  no longer risks an endless transition loop. Account data remains isolated.

## Build and run in FUSAM

Run from this repository on the computer whose browser will run Bondage Club:

```sh
node scripts/build.mjs --local
node scripts/serve-local.mjs
```

The local server serves `.local-dev/dist/KikiLink.fusam.js` at
`http://localhost:3001/KikiLink.fusam.js`, with no caching. It binds only to loopback.
`KIKILINK_DEV_PORT` can select another port.

For that test session, disable the ordinary KikiLink FUSAM entry and any standalone
KikiLink userscript to avoid loading two copies. Add the following query to the normal
Bondage Club game URL, then reload and enable **Local Development** in FUSAM:

```text
?fusam=http://localhost:3001/KikiLink.fusam.js&fusamType=script
```

If the game URL already has query parameters, append these with `&` instead of `?`.
Use the same port in the URL if it was changed. Rebuild with `--local` and reload the
page after source edits. No manifest editing is needed.

Running the release build without `--local` on a `local/` branch deliberately stops
before writing files. Therefore use the checks below instead of `npm test` or
`npm run check`, whose pretest hook runs a release build.

## Automated verification

```sh
npm run typecheck
KIKILINK_TEST_DIST=.local-dev/dist npx vitest run
KIKILINK_FUSAM_SOURCE=/absolute/path/to/FUSAM node scripts/check-local-fusam.mjs
KIKILINK_FUSAM_SOURCE=/absolute/path/to/FUSAM node scripts/check-local-fusam.mjs --mixed
```

The FUSAM source checkout must have its original Local Development implementation.
The check uses its `manifest.js` and `loader.js`; it does not alter them or publish a
manifest. The checkout tested here was `017d19232a27b67367daa228cf7d9c2d98ec7910`.
`--mixed` reads the friends' build directly from Git tag `v0.29.0`, without overwriting
any release artifact. Set `KIKILINK_RELEASE_REF` to test a different existing Git ref.

Verified on 2026-09-07:

- TypeScript: passed. Vitest: **582 tests passed in 45 files**.
- Three local builds loaded by the original FUSAM Local Development script loader:
  creator in Lobby, two non-mutual friends in separate rooms, invitations and messages
  in both directions, Lobby label, avatar badge, offline-creator draft retention: passed.
- Local creator with both friends on the public `v0.29.0` artifact: invitations and
  bidirectional cross-room group messages passed.
- Both FUSAM scenarios made **zero GitHub update requests**.
- Package, lockfile, and `dist/` unchanged against the development base; FUSAM checkout
  clean; the release-build guard stopped accidental writes.
- Public `main` and `v0.29.0` remained at `82885c09d2be1cf22dd5423555557e96c1c1c7a3`.

These integration checks run built scripts in three separate Happy DOM window realms
with synthetic BC transport. They are not live Bondage Club sessions or visual browser
checks. The available browser blocked the localhost test URL with
`net::ERR_BLOCKED_BY_CLIENT`, so live BC behavior and desktop/phone rendering still
need a manual FUSAM pass before any release.

For a browser fixture with three synthetic clients, run:

```sh
KIKILINK_FUSAM_SOURCE=/absolute/path/to/FUSAM node scripts/serve-local.mjs
```

Then open `http://localhost:3001/kikilink-test.html`. The original FUSAM checkout's
`config.js` must already target that localhost origin. The fixture can switch clients,
use a phone-sized viewport, and take the creator offline; it uses no real BC accounts.
