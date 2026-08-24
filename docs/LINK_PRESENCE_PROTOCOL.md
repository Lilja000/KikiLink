# KikiLink presence protocol

KikiLink 0.11 adds peer presence without introducing a KikiLink account or remote
database. It deliberately separates facts supplied by Bondage Club from voluntary
KikiLink status.

## Presence sources

1. A character in the current room is online.
2. Bondage Club's `OnlineFriends` account query supplies online friends and, when
   permitted by the room, their current room name.
3. A compatible KikiLink peer can answer with Online, Idle, Do not disturb, or Offline
   plus an optional status note.
4. A non-friend outside the current room is `Status unavailable`; KikiLink does not
   pretend that absence from an observable list proves they are offline.

## Transport

- In a room, KikiLink sends a single hidden query when joining or changing rooms.
  Compatible peers answer with a targeted hidden packet.
- Outside a shared room, opening a conversation may send one typed `KikiLink` account
  packet to that member. The standard client ignores this type, so it is not shown,
  logged as a normal Beep, or announced with a Beep sound.
- Requests are throttled per member, responses are rate-limited, remote state expires,
  and packet size is capped.
- Status changes may announce once to the current room. KikiLink never loops over the
  entire friend list to broadcast heartbeat Beeps.

Packets use a small JSON envelope prefixed with `KIKILINK/1 `. Only the presence query
and presence state shapes are accepted. Remote packets cannot invoke UI actions, edit
settings, access notes, or run arbitrary code.

## Privacy and accuracy

- Turning presence sharing off stops queries and replies. KikiLink first announces an
  Offline state to the current room so peers do not keep a stale Online badge.
- `Appear Offline` changes KikiLink presence only. Bondage Club may still expose the
  player's native online state to friends.
- Status notes are limited to 80 characters and are shared only with compatible peers
  reached through the transports above.
- No presence history is written to IndexedDB and there is no KikiLink presence server.

