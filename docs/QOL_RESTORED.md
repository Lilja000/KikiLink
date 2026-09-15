# QoL rollback and compatibility fixes — 2026-09-07

The user requested a full return to the existing QoL build, followed by the
flower indicator and previously identified technical fixes. This branch starts
from `cb8aee3e902eb1eee9576221cc95fdb8887de429` and keeps its Home, navigation,
profiles, settings, chats, groups, and visual design. Pulse and the subsequent
interface redesign are not part of this build. The original LinkFinder already
present at that checkpoint remains available.

## Local references

- Restored baseline: `local/fusam-qol-20260907`, commit
  `cb8aee3e902eb1eee9576221cc95fdb8887de429`.
- Development branch: `local/fusam-qol-restored-fixes-20260907`.
- Preserved pre-rollback work: `checkpoint/pre-qol-rollback-20260907`, commit
  `bd2d1b70a6a11319f9bc0151b5062e1f2e88beb5`.
- Public stable reference remains `82885c09d2be1cf22dd5423555557e96c1c1c7a3`
  (`main`, `v0.29.0`).

## Focused fixes

- The confirmed-presence flower uses the bundled SVG as a normal image, avoiding
  CSS URL parsing failures. Avatar edges no longer clip the badge. Group composite
  avatars anchor each small flower to its own participant; the status dot keeps
  its separate position. Existing portraits and frames remain in place.
- Addon detection survives native offline/unknown states only while its proof is
  fresh. Expired proof permits one rediscovery, then returns to the normal backoff
  if unanswered. Capability changes refresh eligible group contacts immediately.
- Native online-friend snapshots expire after 90 seconds. Stale snapshots no
  longer establish offline status or cross-room delivery eligibility. Malformed
  locations remain unknown; empty native room names show Lobby; private room
  labels remain redacted.
- Group edits restore focus to the exact control after asynchronous updates;
  temporary or detached native focus targets are guarded. A hidden mobile group
  inbox does not mark the selected conversation read.
- Existing LinkFinder keyboard events stay inside KikiLink; Escape closes only
  the finder and respects text composition. Player actions remain available when
  the conversation lookup fails. Short composer input avoids a border-induced
  scrollbar. On phones, the expanded addon hides its launcher so it does not
  cover navigation.
- A separately named, manually installed **KikiLink - DevTest** build supports
  phone testing. It disables automatic updates without changing version numbers,
  production artifacts, storage keys, or protocol identity.

The baseline's long-press launcher menu, automatic image-preview preference,
same-page last-tab restoration, and cross-room groups are preserved. Group
communication between non-mutual BC friends still requires the creator online.
No settings, profile, chat, group, database, or saved-cache migration was added.

## Verification

The local build, TypeScript, the 593-test suite, and the 19 built-DevTest/runtime
tests pass. Coverage includes existing settings/profile/chat/group behavior,
account isolation, presence expiry, native Lobby/unknown/private states,
cross-room eligibility, group editing focus, hidden mobile unread state,
storage-failure player actions, and the existing finder keyboard workflow.

`scripts/check-local-fusam.mjs` uses the unmodified FUSAM Local Development
loader and the exact `.local-dev/dist/KikiLink.fusam.js` bundle. The three-client
scenario passes with all development clients and with two stable `v0.29.0`
peers: creator in Lobby, two non-mutual friends in separate rooms, invitations
and bidirectional relaying. Development clients also check Lobby display,
the bundled flower resource, and preservation of drafts when the creator goes
offline. Neither run requests GitHub update metadata.

These are synthetic BC clients in isolated DOM realms, not live BC accounts.
The supervised browser preview was running, but browser navigation was blocked
by the environment. A visual desktop/phone review and live BC testing could not
be completed here; DOM tests do not verify pixel layout or actual SVG painting.

No push, public release, version bump, production `dist/` change, FUSAM manifest
change, or Catbox relay deployment was performed. Installation and rollback
instructions are in [DEVTEST.md](DEVTEST.md).
