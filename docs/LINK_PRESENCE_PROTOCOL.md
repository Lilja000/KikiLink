# KikiLink presence protocol

KikiLink 0.11 introduced peer presence without a KikiLink account or remote database.
KikiLink 0.12 added ephemeral typing state, and 0.20 added an optional direct avatar URL.
KikiLink 0.24 extends the voluntary profile with an avatar frame, a profile-card style, and the
remote addon's version. KikiLink 0.25 adds an on-demand profile banner and strict hexadecimal card
outline without putting either field in room broadcasts. KikiLink 0.26 adds an optional two-color
profile gradient to the same on-demand details exchange. KikiLink 0.28 adds a separately negotiated
short bio without changing the older exact-key details packet. It deliberately keeps Bondage
Club-observable facts separate from profile details a player chooses to share.

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
- Explicitly opening a compatible KikiLink profile sets `p: 1` on its targeted query. The peer may
  answer with its ordinary presence plus one separate `pf` packet containing the current banner and
  outline. A 0.26 requester also sets `e: 1` to negotiate extended details; only then may the response
  include the two gradient endpoints. A 0.28 requester sets `d: 1`; a supporting responder then sends
  the optional short bio in its own correlated `pb` packet before the legacy-compatible `pf`. This
  keeps the exact-key 0.25 `pf` parser compatible: an older
  requester never receives unknown gradient keys, while an older responder safely ignores `e` and
  `d` and returns the original details shape. Ordinary discovery never requests these heavier details.
  Profile-detail request and
  response cooldowns are independent from ordinary discovery, so opening a profile immediately
  after a roster query still works without permitting repeated clicks to create an unbounded burst.
- A `pf` response echoes the request ID and is accepted only for the matching outstanding explicit
  lookup. An exact-key empty `pf` response clears previously cached banner, outline, and gradient
  values. A `pb` response is accepted only for the same live request when `d: 1` was sent; an empty
  exact-key response clears a stale bio. Either response order is handled, while a pre-0.28 peer that
  sends only `pf` remains usable and the unmatched bookkeeping simply expires.
- Requests are throttled per member, responses are rate-limited, remote state expires, and stale
  request/response bookkeeping is pruned.
- Quiet list discovery is fail-closed to routes Bondage Club can currently reach: the same room or an
  online-friend record. A newly online friend gets one bounded, deduplicated background discovery
  attempt; explicit profile opens remain targeted and cooldown-bounded. KikiLink never polls every
  stored profile or every friend on a fixed profile-refresh loop.
- Status changes may announce once to the current room. KikiLink never loops over the entire friend
  list to broadcast heartbeat Beeps.
- Typing starts are point-to-point, throttled while input continues, stopped on pause, blur, send,
  conversation change, or close, and expire automatically if a stop packet is lost.

Packets use a compact JSON envelope carried under the adapter's `KIKILINK/1 ` marker. Six packet
shapes are recognized:

| Type | Required fields | Optional fields | Purpose |
| --- | --- | --- | --- |
| `pq` | `t`, request `i` | broadcast hint `b`, explicit profile-details request `p`, extended-details capability `e`, bio capability `d` | Ask a compatible peer to identify itself and, if enabled, share presence. |
| `pc` | `t`, addon version `v` | group support `g` | Confirm KikiLink capability without sharing a profile. |
| `ps` | `t`, status `s`, time `u`, version `v` | request `i`, note `m`, avatar `a`, frame `f`, style `c`, group support `g` | Share voluntary presence/profile state. |
| `pf` | `t`, echoed request `i` | banner `h`, outline `o`, gradient primary `x` and secondary `y` | Return on-demand profile details to one explicit requester; omitted details deliberately clear stale values. Gradient colors are accepted only as a complete pair. |
| `pb` | `t`, echoed request `i` | short bio `b` | Return a negotiated on-demand bio without adding an unknown key to the legacy `pf` shape; omission deliberately clears stale bio. |
| `ty` | `t`, active flag `a` | none | Start or stop an ephemeral typing indicator. |

The decoration values are intentionally closed sets: `f` is `none`, `blossom`, `rose`, `starlight`,
`laurel`, `thorn`, `moon`, or `ribbon`; `c` is `classic`, `garden`, or `midnight`. Unknown values are
ignored rather than interpreted as markup or asset paths. `o` is either omitted or exactly one
`#RRGGBB` color; `x` and `y` are either both omitted or both strict `#RRGGBB` colors. Colors are
normalized to lowercase and can never contain CSS syntax.

`g: 1` advertises legacy group-chat protocol v1, `g: 2` advertises the relay-capable fixed-membership
protocol, and `g: 3` advertises creator-managed groups. Stored v1 groups remain recognizable, but a
new managed group or an explicit legacy conversion requires every selected peer to have recently
advertised `g: 3`. An addition rechecks the candidate and all remaining remote members before the
owner changes membership; a kick does not require the removed member to remain compatible. A valid
packet without `g` still confirms the addon for Blossom, direct chat, and profile discovery without
claiming group support.

Every JSON payload is capped at 700 UTF-8 bytes before it reaches the common KikiLink transport.
For a local presence state, status, timestamp, and addon version take priority; if optional content
would exceed the limit, the serializer drops avatar, status note, decoration, style, and request ID
in that order until the packet fits. A `pf` packet accepts only the exact `t`, `i`, `h`, and `o`
keys plus the negotiated `x` and `y` pair; its direct HTTPS banner is at most 500 characters, so a
valid packet remains below the same ceiling. If optional fields ever exceed the ceiling, the
serializer drops both gradient colors together rather than exposing a partial theme. Remote packet
text also removes control characters and Unicode directional controls. The separate exact-key `pb`
packet limits its cleaned single-line bio to 160 Unicode code points and the same 700-byte ceiling;
it is never appended to `ps` room presence. All displayed text collapses whitespace and applies its
field limit before display.

Packets cannot invoke UI actions, edit settings, access notes, or run arbitrary code. Malformed
JSON, unsupported values, invalid member identity from the transport, and oversized payloads are
ignored. Blacklist/Ghost relationship reads are fail-closed: a guarded or throwing BC adapter cannot
accidentally permit a profile reply or managed-group capability route.

## Capability and the Blossom

Addon detection is separate from optional profile sharing. With Presence disabled, KikiLink still
answers discovery with the small `pc` capability packet and occasionally refreshes that capability
inside the current room. This is enough to confirm a compatible peer for the Blossom without
revealing status notes, avatar URLs, frames, or card styles.

The room Blossom renderer itself remains unchanged since 0.24: it uses the single existing
`ChatRoomDrawCharacterStatusIcons` ModSDK hook and never adds an outer character-overlay or
character-loop hook.

## Privacy and accuracy

- A Presence service instance is pinned to the positive authenticated MemberNumber available when it
  is constructed. A confirmed account change permanently invalidates that instance and clears its
  remote profile, capability, typing, request, timer, and listener state before any old-account packet
  can cross the new account. A temporarily guarded or revoked Player wrapper fails silent without
  changing the pin, so the same account can recover after a Firefox cross-realm transition.
- Turning Presence off first publishes an Offline state without optional profile fields, then stops
  publishing or replying with `ps` profile state. It never sends or accepts `pf`/`pb` details while
  disabled and immediately hides live and saved remote voluntary profile fields from that Presence
  instance. Capability-only discovery remains active as described above.
- `Appear Offline` changes KikiLink presence only. Bondage Club may still expose the player's native
  online state to friends.
- Status notes are limited to 80 characters. Avatar and banner URLs are limited to 500 characters
  and must pass the same direct HTTPS image validation as chat previews. Avatar state follows normal
  presence exchange; a banner or bio is sent only to the member who explicitly opened the profile.
- Remote avatars and banners load without credentials or referrer data. The remote host still receives
  the viewer's network IP address and request time. The loader refuses redirects and
  local/private/reserved IP literals, then validates the HTTPS response URL, supported image MIME,
  and a 5 MiB limit before exposing only a local blob URL to the image element. It permits at most
  four active fetches and 32 active-plus-queued requests, applies a 15-second deadline across queueing
  and transfer, and cancels work when its last consumer closes or replaces the image. Profile art has
  a dedicated preference and defaults to `Ask before loading`, which keeps initials or the built-in
  banner until the user reveals that exact member-and-normalized-URL pair for the session; a changed
  URL asks again. `Always show` opts into contacting each art host automatically;
  `Links only` never requests it. Frames, card styles, and outline colors contain no remote image URL
  and can render without loading remote pixels. The two optional gradient colors follow the same
  explicit-open boundary as the banner and outline and are never included in room broadcasts.
- A displayed current room comes from Bondage Club's room or online-friend state, not from an
  arbitrary room name in the peer's profile packet.
- The optional AFK response is an ordinary private Beep, not a presence packet. It is sent only while
  the effective local status is Idle, at most once per sender per Idle session, with a 30-minute
  per-sender cooldown and a five-replies-per-minute global cap. It never includes the current room.
- Typing indicators have a separate Chat preference. They contain no draft text and are never
  written to IndexedDB.
- Live presence and typing history is never stored, and there is no KikiLink presence server. KikiLink
  may retain only the last voluntarily shared public profile fields in an account-local, device-local
  cache capped at 200 records and 90 days. Status, room, notes, relationships, protocol state, and image
  blobs are excluded. Cached cards carry a visible `SAVED PROFILE` label; when a current live packet is
  combined only with cached optional visuals, the narrower `SAVED DETAILS` label keeps that distinction
  explicit. Cached fields never manufacture live status. An owner withdrawal deletes that owner's
  record, while an explicit open attempts a fresh targeted lookup when Bondage Club can route it.
  Banner, bio, outline, and gradient keep a separate details-receipt timestamp: ordinary `ps` heartbeats
  may refresh basic profile fields but cannot renew the 90-day lifetime of old rich visuals.
