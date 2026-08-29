# KikiLink group chat protocol

KikiLink group chat is an addon-only protocol carried by Bondage Club's existing targeted
point-to-point transport. The current implementation has two wire families:

- **managed wire v2**, advertised by Presence capability `g: 3`, for creator-owned mutable groups;
- **legacy wire v1**, retained exactly for existing `g: 1`/`g: 2` groups and explicit conversion.

There is no KikiLink account, central group server, delivery receipt, offline message/relay queue, or
separate end-to-end encryption layer. A small bounded owner-side control outbox retries pending kick
notices; it never stores user messages. A successful local send means only that the packet was handed
to BC's transport. Every relay, metadata update, removal, and repair remains best-effort.

## Capability selection

Presence capability is carried as `g` in KikiLink `pc` and `ps` packets. A capability observation is
usable for five minutes.

| Capability | Meaning in the current client |
| --- | --- |
| missing | The peer has not claimed group support. |
| `g: 1` | Legacy invitation and direct message support (`gi`/`gm`, wire v1). |
| `g: 2` | Legacy v1 plus creator relay and display names (`gr`/`gn`). |
| `g: 3` | Managed wire v2, including creator-owned membership and appearance; it also satisfies the g2 relay check. |

The normal creation path uses managed groups and requires every selected remote member to have a
fresh `g: 3` observation. The service checks this again below the UI. Every selected remote member
must also be a known BC friend and must not be locally blocked or ghosted. Sharing a room alone is not
invitation trust.

The legacy creation API remains available for compatibility. A g3 client continues to parse wire v1;
older g1/g2 clients do not understand managed wire v2. A missing or expired capability never implies
support.

## Common transport and parser rules

The BC adapter targets a hidden room message when the recipient is in the same room, or a secret
`AccountBeep` of type `KikiLink` on the friend route outside the room. It prefixes the payload with
`KIKILINK/1 `. The JSON group payload is bounded to 700 characters; managed v2 additionally requires
the serialized payload to fit 700 UTF-8 bytes.

All packet parsers:

- require exactly the keys documented for that packet and reject extra or missing keys;
- reject unknown types or versions, invalid IDs, invalid timestamps, disallowed control/directional
  characters, and unpaired UTF-16 surrogates;
- require MemberNumbers to be positive safe integers;
- require member lists and name tuples to be strictly increasing, unique, and 3-5 entries long;
- treat MemberNumber and the authenticated immediate BC sender as authorization data; display names
  never authorize anything.

Timestamps must be finite, non-negative, and within the JavaScript `Date` range. Remote creation and
message times are retained only when they are not in the future and are at most five minutes old;
otherwise the local receipt time is used. Calling BC's send API without an exception is not an
acknowledgement from the recipient.

For existing managed state and managed `ga`/`gn`/`gx`, `u` is not a freshness or authorization
counter. Owner binding, epoch, and the relevant revision perform those checks; `u` supplies the group
creation timestamp when a new managed group is first accepted.

## Managed wire v2 (`g: 3`)

### Managed identity and state

A managed group ID has this form:

```text
group2_<owner MemberNumber>_<8-31 lowercase a-z/0-9/_/- characters>
```

The full ID is at most 64 characters. The parser requires the owner encoded in the ID to equal every
owner field `o`. Receivers additionally require creator control packets to arrive directly from that
same MemberNumber. This is an authorization check over the sender identity supplied by BC; it is not
a cryptographic signature.

Each managed group stores three revision domains:

| Field | Purpose |
| --- | --- |
| `stateRevision` | Title and authoritative membership; starts at 1 and increases monotonically. |
| `appearanceRevision` | Avatar URL and outline color; starts at 1 and increases independently. |
| `memberNamesRevision` | Last accepted creator display-name bundle, tied to a state revision. |

The current membership generation is a cryptographically random epoch ID matching
`ge_[a-z0-9_-]{8,40}`. Managed creation and membership mutation fail closed if the browser exposes
neither `crypto.randomUUID` nor `crypto.getRandomValues`. Adding or kicking a member rotates the epoch
before new state is sent. Renaming does not need to rotate it. A higher state revision with an
unchanged local member list may still carry a new epoch: the receiver may have missed an intermediate
add-then-kick sequence.

Managed creation starts at state, appearance, and names revision 1. Membership always contains the
owner and the local account at every recipient.

### Authoritative state (`gs`)

```json
{"t":"gs","v":2,"g":"group2_123_gardenabcd","o":123,"e":"ge_epochabcd","r":1,"m":[123,456,789],"n":"Garden friends","p":"","u":1787875200000}
```

| Field | Meaning |
| --- | --- |
| `g` | Creator-bound managed group ID. |
| `o` | Owner; must equal the owner encoded in `g` and the immediate BC sender. |
| `e` | Current membership epoch. |
| `r` | Positive state revision. |
| `m` | Complete canonical membership of 3-5 MemberNumbers, including `o` and the recipient. |
| `n` | Normalized non-empty title, at most 60 UTF-16 code units. |
| `p` | Empty for normal create/update/repair; a legacy v1 group ID only during explicit conversion. |
| `u` | Group creation time. |

For an existing managed group, the receiver requires the recorded owner to be the immediate sender
and `p` to be empty. Lower revisions are rejected. An equal revision is accepted only as an exact
idempotent replay of epoch, title, and membership. A higher revision replaces title and membership;
if membership differs, the epoch must differ too. A state update clears queued relays and logical
rate state when membership changes.

For a new incoming managed group, the owner must be a known friend. Every listed remote member must
pass the local block/ghost check; missing or throwing relationship data fails closed. The fresh group
is also subject to the bounded remote-group quotas described below.

### Appearance (`ga`)

```json
{"t":"ga","v":2,"g":"group2_123_gardenabcd","o":123,"e":"ge_epochabcd","r":2,"a":"https://files.catbox.moe/group.webp","c":"#c60000","u":1787875200000}
```

| Field | Meaning |
| --- | --- |
| `g`, `o` | Managed group and owner. The owner must be the immediate sender. |
| `e` | Must equal the recipient's current membership epoch. |
| `r` | Positive appearance revision, independent of state revision. |
| `a` | Canonical direct HTTPS image URL, at most 450 characters; empty clears it. |
| `c` | Lowercase six-digit HEX outline color; empty restores the default. |
| `u` | Group creation time. |

An avatar URL must have a direct image path ending in `gif`, `jpg`, `jpeg`, `png`, or `webp`,
must not contain URL credentials, and must normalize back to exactly the transmitted value. The
packet always carries both current appearance values. Lower appearance revisions are rejected; an
equal revision is accepted only when both values exactly match local state. Binding `ga` to the
current epoch prevents an old appearance packet from being replayed after a kick or later re-add.

### Creator display names (`gn`)

```json
{"t":"gn","v":2,"g":"group2_123_gardenabcd","o":123,"e":"ge_epochabcd","r":1,"d":[[123,"Aster"],[456,"Birch"],[789,"Clover"]],"u":1787875200000}
```

| Field | Meaning |
| --- | --- |
| `g`, `o` | Managed group and owner. The owner must be the immediate sender. |
| `e` | Must equal the recipient's current epoch. |
| `r` | Must equal the recipient's current state revision. |
| `d` | Canonical tuples for the exact current membership; each name is 1-40 UTF-16 units. |
| `u` | Group creation time. |

Names are presentation data only. A locally resolved non-fallback BC name is preferred when a
message is attributed. The owner bundle helps label members who are not direct friends; it cannot
change identity, membership, ownership, or packet authorization.

The sender first tries the full 40-code-unit display-name limit. If a multi-name bundle would exceed
the managed 700-byte UTF-8 envelope, it lowers the per-name UTF-16-unit ceiling until the exact
serialized packet fits, without leaving an unpaired surrogate. `gn` is optional display repair;
authoritative `gs` delivery does not depend on it.

### Removal (`gx`)

```json
{"t":"gx","v":2,"g":"group2_123_gardenabcd","o":123,"e":"ge_oldepoch","r":3,"u":1787875200000}
```

| Field | Meaning |
| --- | --- |
| `g`, `o` | Managed group and owner. The owner must be the immediate sender. |
| `e` | Epoch currently held by the removed recipient. |
| `r` | New state revision after the removal; must be higher than the recipient's current revision. |
| `u` | Group creation time. |

`gx` is sent only to the removed participant. On acceptance, that client deletes the group and its
local history and records a revoked tombstone containing owner, old epoch, and new state revision.
The owner separately sends `gs` with the rotated epoch and reduced membership to remaining members.

### Direct message (`gm`)

```json
{"t":"gm","v":2,"g":"group2_123_gardenabcd","e":"ge_epochabcd","i":"gmsg_message01","c":"Hello!","u":1787875205000}
```

| Field | Meaning |
| --- | --- |
| `g` | Locally known managed group. |
| `e` | Must equal the current membership epoch. |
| `i` | Message ID matching `gmsg_[a-z0-9_-]{8,57}`. |
| `c` | Normalized non-empty message content. |
| `u` | Author time. |

The immediate BC sender is the logical author and must be in current membership. There is no author
field in `gm`. Managed content has a 226-UTF-16-unit ceiling, and the final packet must still fit the
700-byte UTF-8 bound; some non-ASCII content can therefore hit the byte limit earlier.

### Creator relay (`gr`)

```json
{"t":"gr","v":2,"g":"group2_123_gardenabcd","e":"ge_epochabcd","o":456,"i":"gmsg_message01","c":"Hello!","u":1787875205000}
```

| Field | Meaning |
| --- | --- |
| `g`, `e` | Managed group and current epoch. |
| `o` | Original logical author's MemberNumber. |
| `i`, `c`, `u` | Message ID, normalized content, and author time copied from `gm`. |

Only the recorded creator may be the immediate sender of `gr`. The recipient rejects a relay when it
is the creator, when `o` is the creator or the local account, when `o` is not a current member, when
`o` is locally blocked/ghosted, or when the same `(o, message ID)` has already been seen. Direct and
relayed copies from the same original author therefore deduplicate, while another member cannot
suppress the message by racing the same ID. A `gr` is never relayed again.

BC identifies the immediate creator sender, not the asserted original author `o`. The creator learned
`o` from an incoming direct `gm`, but a modified creator client could forge relay attribution. Relay
author identity is consequently display attribution, not cryptographic proof.

## Managed owner operations

Only the locally recorded owner can invoke owner controls.

| Operation | State transition and packets |
| --- | --- |
| Create | Requires 3-5 total members and fresh g3 support from every remote member. Creates a new owner-bound ID and epoch at revision 1, then sends `gs`, `ga`, and `gn`. |
| Rename | Normalizes a non-empty title, increments `stateRevision`, keeps the epoch, and sends `gs`. |
| Set/clear avatar | Increments `appearanceRevision` and sends the complete, current-epoch `ga` bundle. |
| Set/reset outline | Increments `appearanceRevision` and sends the complete, current-epoch `ga` bundle. |
| Add member | Requires capacity below five and revalidates every remote member as a known, unblocked g3 peer. Rotates epoch, increments state revision, then sends `gs`, `ga`, and `gn` to the new membership. |
| Kick member | Cannot remove the owner or leave fewer than three members. Rotates epoch, increments state revision, sends `gs`/`ga`/`gn` to remaining members, and sends old-epoch `gx` to the removed member. |

Re-adding the same MemberNumber deletes any pending `gx` for that target in the same durable commit as
the new membership and epoch. If an already handed-off old `gx` arrives after the re-add state, its
old epoch no longer matches and the recipient rejects it.

A state or appearance handoff is not a receipt. The owner may have updated local state even when some
targets are offline. Before an owner-authored message, the service can resend current state at most
once per minute; a successful managed repair handoff is followed by `ga` and `gn`. Repair has no
acknowledgement.

Before any local managed create, conversion, rename, appearance change, add, or kick, the service
flushes the preceding durable state. It then writes and verifies the new authoritative state before
emitting the UI update or sending any control packet. If that commit fails, the in-memory mutation is
rolled back and no packet is sent. This ordering prevents an owner from advertising state that the
same client already knows it could not persist.

### Explicit conversion from legacy v1

Legacy ownership is not upgraded in place because a v1 group ID does not bind its creator. Only the
locally recorded legacy creator can request conversion, and all remote members must currently pass
the managed g3/friend/block checks.

Conversion creates a new `group2_<owner>_...` ID, a new epoch, and revision 1. The old local group is
removed and locally tombstoned; messages, draft, pin, and replay IDs are moved to the new ID. The first
`gs` carries the old legacy ID in `p`.

A receiver accepts that conversion only if `p` names a locally existing wire-v1 group with the same
recorded creator and exact same membership. It then migrates its matching local history to the new ID.
If the predecessor is absent or does not match, the packet is rejected rather than treating it as a
fresh managed invitation. Subsequent packets for the managed group require `p: ""`.

## Message and image routing

The service attempts a direct `gm` only when a target is in the current room or is a known friend. It
does not send AccountBeeps to unrelated MemberNumbers.

For a non-owner author:

1. The author hands the same `gm` and message ID to every currently direct-routable, nonblocked member.
2. If the owner handoff succeeds, other nonblocked members without a successful direct handoff are
   reported locally as possible relay targets; this is not confirmation.
3. The owner authenticates and stores the direct `gm`, then queues one `gr` for each other valid,
   direct-routable participant.
4. A recipient that already stored the direct message rejects the later relay by original author and
   message ID.

If the author has blocked/ghosted another non-owner, KikiLink does not hand that message to the owner,
because the owner cannot infer which relay target must be excluded. Direct sends to other allowed
members can still proceed. Local outgoing history is written only when at least one direct handoff
succeeds.

Group images do not introduce another wire packet. An uploaded image is sent as its short direct
HTTPS URL in ordinary `c` content, subject to the same length, epoch, routing, deduplication, and block
rules as text. Image detection and preview are recipient UI policy; the group protocol does not carry
the image bytes or hide a later fetch from the external image host.

## Relay and revocation lifecycle

- The creator relay queue holds at most 60 target jobs, attempts at most one every 210 ms, and expires
  each job after 15 seconds. Jobs receive no second relay attempt.
- Dispatch revalidates the group, epoch, owner role, origin and target membership, local block state,
  and current direct route. A membership update, local removal, clear, or destroy removes affected
  jobs and timers.
- The pending `gx` record is committed with the kick before the first removal send. A failed handoff
  remains in the bounded, persisted `pendingRevocations` outbox and is restored after reload.
- One lifecycle timer services the outbox. Retry delay starts at 30 seconds, doubles after each
  attempt, and is capped at six hours. An entry is retired after 36 attempts or seven days, whichever
  comes first. Due entries can also be retried during managed activity for the same group.
- A successful local handoff removes the outbox entry; this still does not prove remote receipt.
- The outbox holds at most 120 entries. On overflow, entries associated with the oldest stored group
  creation times are discarded first.
- A revoked tombstone rejects stale state. Re-add is possible only through a fully valid `gs` from the
  same owner with a higher revision and a different epoch; the tombstone is cleared only after that
  state has passed all normal acceptance checks.
- A user-initiated local removal sends no leave/kick packet and creates a local tombstone. Remote
  state cannot clear it while that tombstone remains in the bounded ledger.

Epoch rotation prevents packets for an old membership generation from being accepted by clients that
have received current state. It does not make the epoch secret, provide a delivery receipt, or force an
offline removed client to erase state before `gx` reaches it.

The kick itself does not depend on a `gx` acknowledgement: the owner durably commits the reduced
membership and new epoch first, and current-state members no longer authorize the removed
MemberNumber. `gx` is the best-effort cleanup that tells the removed client to erase its stale local
copy; clients that have not yet received the new state remain subject to BC's delivery limitations.

## Legacy wire v1 (`g: 1` / `g: 2`)

Legacy groups use IDs matching `group_[a-z0-9_-]{8,58}`. Membership is canonical and immutable; there
are no revisions, epochs, avatar/outline packets, or owner controls. Adding/removing members or safely
establishing managed ownership requires a new group ID (normally through explicit conversion).

### Legacy invitation (`gi`)

```json
{"t":"gi","v":1,"g":"group_example123","m":[123,456,789],"n":"Garden friends","u":1787875200000}
```

Exact keys are `t,v,g,m,n,u`. The authenticated sender becomes the locally recorded creator. The
membership must include both sender and recipient. The sender must be a known friend, every listed
remote member must pass local block/ghost checks, the ID must not have a local tombstone, and capacity
must remain. A repeated invitation is accepted only when sender still equals the recorded creator and
membership is exactly unchanged.

### Legacy direct message (`gm`)

```json
{"t":"gm","v":1,"g":"group_example123","i":"gmsg_example456","c":"Hello!","u":1787875205000}
```

Exact keys are `t,v,g,i,c,u`. The immediate sender is the author and must be an immutable member. New
authored content is limited to 246 UTF-16 units so it also fits the larger relay envelope. Receivers
and storage retain compatibility with old direct v1 `gm` content up to 257 units.

### Legacy creator relay (`gr`, g2 extension)

```json
{"t":"gr","v":1,"g":"group_example123","o":456,"i":"gmsg_example456","c":"Hello!","u":1787875205000}
```

Exact keys are `t,v,g,o,i,c,u`; content is at most 246 units. Authorization, duplicate handling,
one-hop behavior, and the attribution limitation are the same as managed `gr`, except there is no
epoch and membership cannot change.

### Legacy display names (`gn`, g2 extension)

```json
{"t":"gn","v":1,"g":"group_example123","d":[[123,"Aster"],[456,"Birch"],[789,"Clover"]],"u":1787875200000}
```

Exact keys are `t,v,g,d,u`. Only the recorded creator may send it; tuples must exactly match immutable
membership, each name is 1-40 UTF-16 units, and `u` must be within five minutes of the locally stored
creation time. Names remain display-only. A g1 client can ignore the optional g2 `gr`/`gn` extensions
and continue direct legacy messaging where a direct route exists.

The legacy creator may repair a missed invitation by resending the exact `gi` before an outgoing
message, at most once per minute, followed by `gn` after successful local handoff. Participants never
relay invitations because that would cause a receiver to record the wrong immediate sender as creator.

## Bounded rate state

Malformed, blocked, replayed, stale-epoch, or over-budget packets do not mutate group history, unread
counts, persistence, relay queues, or UI state.

| Scope | Burst | Refill |
| --- | ---: | ---: |
| Immediate sender: `gi`, `gs`, `gx` | 5 | 1 token / 15 s |
| Immediate sender: `ga`, `gn` | 12 | 1 token / 5 s |
| Immediate sender: `gm`, `gr` | 60 | 1 token / 250 ms |
| Logical group, all message origins | 20 | 1 token / 250 ms |
| Logical group, one message origin | 12 | 1 token / 500 ms |

At most 128 immediate-sender rate records are kept. Idle sender and logical-group rate state expires
after ten minutes. Direct and relayed copies consume logical rate under the same original author.

## Account-scoped storage version 3

The key remains `kikilink:group-chats:v1` for continuity, but the serialized object now has
`version: 3`. It stores both legacy and managed groups, messages, group tombstones, origin-bound
evicted-message ID tombstones, and the pending revocation outbox.

| Record | Bound |
| --- | ---: |
| All active groups | 30 |
| Members in one group | 3-5 |
| Messages in one group | 500 |
| Messages across all groups | 3,000 |
| Legacy / managed draft | 246 / 226 UTF-16 units |
| Local/revoked group tombstones | 512 |
| Evicted/pruned author + message IDs | 1,000 per group; 3,000 total |
| Pending revocations | 120 |
| Fresh incoming managed groups from one remote owner | 5 |
| Slots reserved from all fresh remote invitations | 5 of 30 |

Fresh incoming legacy `gi` and fresh remote managed `gs` are rejected once 25 active groups are
present, preserving five slots for local creation. Explicit matching legacy conversion does not
consume a new logical slot. The per-owner limit independently rejects a sixth fresh managed group from
the same remote creator.

Stored state version 1 is read as legacy protocol state: revisions become zero, appearance is empty,
old tombstones become local tombstones, and the pending revocation outbox starts empty. Version 2
managed state is also read directly. Because both older formats recorded only a bare message ID,
their replay tombstones migrate conservatively as origin wildcards; new version-3 tombstones record
the original MemberNumber. The next successful persistence write emits storage version 3. Conversion
to managed wire v2 is still explicit and still creates a new owner-bound ID; storage migration alone
never changes wire ownership.

The loader validates collection bounds, canonical IDs/members, account membership, ownership,
revisions, epochs, timestamps, duplicate IDs, tombstone consistency, and pending-revocation linkage.
Managed-group historical messages from a member who was later kicked remain loadable with their
stored display name; current membership is used for new managed-packet authorization, not for erasing
valid history. Stored legacy-v1 messages still require their sender to belong to the legacy group's
immutable membership.

Visible messages evicted by per-group/global limits or explicit pruning enter the bounded replay-ID
ledger. Removing a group deletes its history, message-ID ledger, logical rate state, queued relays,
and pending revocations, then records a group tombstone. Tombstones themselves are bounded; their
replay protection is not permanent after eviction from the ledger.

Mutations outside the local authoritative-commit path normally use a 300 ms trailing persistence
delay with a hard 1.8-second maximum wait. Remove, prune, clear, explicit flush, pagehide, and destroy
force a synchronous best effort. Writes are read back for verification. If the initial store cannot
be read or parsed, ordinary mutations and overwrites remain blocked until the state can be recovered
or the user explicitly clears it.

## Privacy and security limits

- A service instance pins the local MemberNumber read at construction. An unreadable guarded identity
  fails closed for that call; a readable switch to another valid account invalidates the old instance.
- Incoming invitations/state require a known-friend owner. Current-room visibility is useful for
  routing and display but is not invitation trust.
- Local blacklist/ghost relationships are checked before incoming protocol handling and during
  membership, relay, and route decisions. Missing or guarded relationship data fails closed at these
  boundaries.
- Owner-bound IDs, monotonic revisions, epochs, exact packet parsing, and tombstones constrain the
  state transitions accepted by this client. They are validation rules, not signatures or encryption.
- Display names, group titles, avatar URLs, outline colors, and relay origin fields can be supplied by
  the recorded owner. They must not be treated as independently verified BC account data.
- Every participant receives the group's membership and owner-supplied metadata. Membership and
  content traverse BC's transport and inherit its availability and privacy properties. Group avatar
  and message-image URLs additionally identify an external host that recipients may contact when
  previewing the image.
- There are no protocol acknowledgements. UI terms such as *handed off*, *relay target*, or
  *unreachable* deliberately avoid claiming remote delivery.
