# Rooms and Players — local development, 2026-09-07

## Checkpoint and scope

- Previous tested build: `9b08c8b204d8574f4854cabd40167a1a9de45da6`.
- Rollback branch: `checkpoint/pre-rooms-players-20260907`.
- Development branch: `local/rooms-players-20260907`.
- Public stable stays at `82885c09d2be1cf22dd5423555557e96c1c1c7a3`, version `0.29.0`.

This continues the restored QoL addon and the three screenshot fixes. It reorganizes
the existing Room/Players pages. Home, LinkFinder, chats, groups, profiles and their
customization remain in place. No Pulse, extra primary tab, storage migration, or
new tracking/history collection was added. Production artifacts, manifest, version,
public refs, and the Catbox deployment gate are unchanged.

## Browsing and management

Rooms opens Browse. A small current-room card appears once above the directory;
it offers Players and Manage instead of Join. One All/Favorites/Friends filter
controls a deduplicated list: favorites first, friend count next, then names.
Full rooms stay visible with a disabled Full action. Existing native search and
join permission checks are reused. Searches refresh on entry, Enter, or Refresh;
typing filters the loaded list without network requests.

The existing room media editor and native member administration live in Manage.
A disclosure shows the current room settings and access; it is a read-only summary,
not a new BC access editor. Existing Presets remain available outside a room, while
Apply requires current administrator rights. Existing gallery/music actions open
Manage with the selected media and preserve their guarded asynchronous behavior.

Players starts with browsing, not an automatically selected notebook. In room,
Friends, and Known are scopes; favorites, online, and fresh KikiLink detection are
composable filters. Friends includes actual BC friends outside the room without
creating encounter records for them. Confirmed online players sort before unknown,
then offline, with favorites/names within each tier. Exact name or number matches
come first. Notebook rooms are labeled historical in details, never used as live
locations. Lobby and unknown location remain distinct.

Clickable avatars open existing addon profiles. Rows expose Message, eligible
Join, and the existing player action menu. Notes/tags/history stay in explicit
details. Native Kick/Promote remain in Manage. A desktop pane shares space with
the list; at narrow container widths it replaces the list and provides Back to list.
Mobile action targets are at least 44px where practical, while desktop rows remain
compact. Existing avatar cover crops, decorations, and transparent PNG flowers stay.

Room/player links use a bounded runtime back stack and preserve query, filters,
selection, directory state, and scroll. Popup close/reopen keeps this session state;
a full website reload starts at Home. Data labels update in place, while row order
and removal wait for pointer/touch/keyboard interaction to finish. Keyed rows reuse
avatar nodes. There is no new polling or broad DOM observer. A fresh native friend
snapshot updates social room counts locally; room availability remains an explicitly
refreshed snapshot. Failed room searches keep the previous list with an error label.

## Verification

- `node scripts/build.mjs --local` and `./node_modules/.bin/tsc --noEmit` pass.
- `KIKILINK_TEST_DIST=.local-dev/dist ./node_modules/.bin/vitest run`: 636 tests pass.
- Exact DevTest build: 19 userscript/runtime/update checks pass.
- Original FUSAM Local Development loader checks `KikiLink.fusam.js` in three
  simulated page realms, including Rooms/Players navigation, remote friends,
  flower detection, same-session restoration, non-mutual cross-room groups,
  bidirectional relay, and offline draft preservation. Mixed stable `v0.29.0`
  peers also pass. No GitHub update request occurs.
- CSS resolution checks cover widths 320–1280, all densities, large text,
  desktop detail panes, mobile back navigation/tap targets, and existing chat crops.

The running local preview was blocked by the available browser with
`net::ERR_BLOCKED_BY_CLIENT`. These DOM/CSS checks do not establish painted geometry,
container-query rendering, or live BC behavior. Desktop and phone visual review in
real BC remains necessary before release. The installer is development-only.

For manual review, open Rooms and use each filter, then enter a room via its player
link and return. In Players, test a long name, Lobby/offline/no-addon friends, open
details, and return while retaining a search. Check mouse, keyboard, phone touch,
small popup widths, all densities, and zoom. Inspect both the narrow detail view
and the adjacent desktop pane. Installation/rollback: [DEVTEST.md](DEVTEST.md).
