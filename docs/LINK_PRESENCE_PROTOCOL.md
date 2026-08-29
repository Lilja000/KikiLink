# KikiLink presence protocol

KikiLink 0.11 introduced peer presence without a KikiLink account or remote database.
KikiLink 0.12 added ephemeral typing state, and 0.20 added an optional direct avatar URL.
KikiLink 0.24 extends the voluntary profile with an avatar frame, a profile-card style, and the
remote addon's version. It deliberately keeps Bondage Club-observable facts separate from profile
details a player chooses to share.

## Presence sources

1. A character in the current room is online.
2. Bondage Club's `OnlineFriends` account query supplies online friends and, when permitted by the
   room, their current room name.
3. A compatible KikiLink peer can answer with Online, Idle, Do not disturb, or Offline plus an
   optional status note, direct HTTPS avatar URL, avatar frame, and profile-card style.
4. A non-friend outside the current room is `Status unavailable`; KikiLink does not pretend that
   absence from an observable list proves the player is offline.

KikiLink receives the query result from the active Bondage Club socket and reattaches when that
socket is replaced. `Player.FriendList` and `Player.FriendNames` identify known friends; only the
server's mutual `OnlineFriends` result is treated as proof that a friend is online. KikiLink profile
cards may combine that observable state with private local notebook facts, but private notes, tags,
last recorded room, and encounter history are never added to a presence packet.

## Transport

- In a room, KikiLink sends one hidden query when joining or changing rooms. Compatible peers answer
  with a targeted hidden packet.
- Outside a shared room, opening a conversation may send one typed `KikiLink` account packet to that
  member. The standard client ignores this type, so it is not shown, logged as a normal Beep, or
  announced with a Beep sound.
- Explicitly opening a compatible KikiLink profile asks once more for current voluntary fields,
  including when capability was already known; a separate two-second forced-request cooldown prevents
  repeated clicks from producing an unbounded packet burst.
- Requests are throttled per member, responses are rate-limited, remote state expires, and stale
  request/response bookkeeping is pruned.
- Status changes may announce once to the current room. KikiLink never loops over the entire friend
  list to broadcast heartbeat Beeps.
- Typing starts are point-to-point, throttled while input continues, stopped on pause, blur, send,
  conversation change, or close, and expire automatically if a stop packet is lost.

Packets use a compact JSON envelope carried under the adapter's `KIKILINK/1 ` marker. Four packet
shapes are recognized:

| Type | Required fields | Optional fields | Purpose |
| --- | --- | --- | --- |
| `pq` | `t`, request `i` | broadcast hint `b` | Ask a compatible peer to identify itself and, if enabled, share presence. |
| `pc` | `t`, addon version `v` | group support `g` | Confirm KikiLink capability without sharing a profile. |
| `ps` | `t`, status `s`, time `u`, version `v` | request `i`, note `m`, avatar `a`, frame `f`, style `c`, group support `g` | Share voluntary presence/profile state. |
| `ty` | `t`, active flag `a` | none | Start or stop an ephemeral typing indicator. |

The 0.24 decoration values are intentionally closed sets: `f` is `none`, `blossom`, `rose`, or
`starlight`; `c` is `classic`, `garden`, or `midnight`. Unknown values are ignored rather than
interpreted as markup or asset paths.

`g: 1` explicitly advertises group-chat protocol v1. A valid packet without `g` still confirms the
addon for Blossom, direct chat, and profile discovery, but that older peer is not offered in the New
group picker. The picker also requires a known BC friend, matching the recipient-side invitation
trust boundary. This keeps group creation from silently selecting people or addon versions that will
reject or cannot understand group invitations.

Every JSON payload is capped at 700 characters before it reaches the common KikiLink transport.
For a local presence state, status, timestamp, and addon version take priority; if optional content
would exceed the limit, the serializer drops avatar, status note, decoration, style, and request ID
in that order until the packet fits. Remote packet text also removes control characters and Unicode
directional controls, collapses whitespace, and applies its field limit before display.

Packets cannot invoke UI actions, edit settings, access notes, or run arbitrary code. Malformed
JSON, unsupported values, invalid member identity from the transport, and oversized payloads are
ignored.

## Capability and the Blossom

Addon detection is separate from optional profile sharing. With Presence disabled, KikiLink still
answers discovery with the small `pc` capability packet and occasionally refreshes that capability
inside the current room. This is enough to confirm a compatible peer for the Blossom without
revealing status notes, avatar URLs, frames, or card styles.

The room Blossom renderer itself is unchanged in 0.24: it uses the single existing
`ChatRoomDrawCharacterStatusIcons` ModSDK hook and never adds an outer character-overlay or
character-loop hook.

## Privacy and accuracy

- Turning Presence off first publishes an Offline state without optional profile fields, then stops
  publishing or replying with `ps` profile state. It also clears cached remote voluntary profile
  fields immediately, keeping reciprocal profile privacy independent of cache timing. Capability-only
  discovery remains active as described above.
- `Appear Offline` changes KikiLink presence only. Bondage Club may still expose the player's native
  online state to friends.
- Status notes are limited to 80 characters. Avatar URLs are limited to 500 characters, must pass
  the same direct HTTPS image validation as chat previews, and are shared only with compatible peers
  reached through the transports above.
- Remote avatars load without credentials or referrer data. The loader refuses redirects and
  local/private/reserved IP literals, then validates the HTTPS response URL, supported image MIME,
  and a 5 MiB limit before exposing only a local blob URL to the image element. It permits at most
  four active fetches and 32 active-plus-queued requests, applies a 15-second deadline across queueing
  and transfer, and cancels work when its last consumer closes or replaces the image. `Always show`
  loads automatically; `Ask before loading` keeps initials until
  the user reveals that exact member-and-normalized-URL pair for the session, and a changed URL asks
  again; `Links only` never requests it. Frames and card styles contain no remote image URL and can
  render around initials.
- A displayed current room comes from Bondage Club's room or online-friend state, not from an
  arbitrary room name in the peer's profile packet.
- The optional AFK response is an ordinary private Beep, not a presence packet. It is sent only while
  the effective local status is Idle, at most once per sender per Idle session, with a 30-minute
  per-sender cooldown and a five-replies-per-minute global cap. It never includes the current room.
- Typing indicators have a separate Chat preference. They contain no draft text and are never
  written to IndexedDB.
- No presence or typing history is stored, and there is no KikiLink presence server.
