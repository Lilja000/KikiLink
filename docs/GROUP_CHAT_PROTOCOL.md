# KikiLink group chat protocol

KikiLink group chat uses a small addon-only protocol over Bondage Club's existing point-to-point
transport. The base v1 invitation (`gi`) and message (`gm`) packets shipped in KikiLink 0.24.0.
KikiLink 0.25.0 keeps those packets byte-compatible and adds optional v1 packet types for a bounded
creator relay (`gr`) and creator-authoritative display names (`gn`). There is no KikiLink account,
central group server, mutable remote participant list, or offline queue.

## Product contract and capability selection

- A group contains 3-5 total BC members, including the creator. Membership is a canonical, sorted,
  unique list of numeric MemberNumbers and is immutable. Adding or removing somebody requires a new
  group.
- The 0.25 creation UI offers 2-4 known BC friends whose recent presence advertised `g: 2`. The
  service independently fails closed unless every selected remote member is reported as a known
  friend; merely sharing the current room is insufficient.
- `g: 1` remains recognized for already stored 0.24 groups, but a g1-only peer is not selectable for
  a new relay-capable group. A missing `g` does not claim group-chat support.
- Titles are 1-60 UTF-16 characters after normalization. Newly authored messages are 1-246 UTF-16
  characters so the same content and ID fit both `gm` and the larger `gr` envelope under the common
  700-character transport bound.
  The receiver and storage loader continue to accept legacy direct `gm` content up to 257 characters.
- Display names are presentation data only. MemberNumber is the sole identity and authorization key.

## BC transport and its delivery limit

The common adapter sends a targeted hidden room message when the target is in the same room. Outside
the room it sends a secret `AccountBeep` with Beep type `KikiLink`. The adapter adds its
`KIKILINK/1 ` marker; the JSON payload after that marker must be 1-700 characters.

An outside-room AccountBeep is useful only while both accounts are online and the receiving account
accepts the sender through BC's friend path. Calling the local send API without an exception is not a
delivery receipt. KikiLink therefore describes all direct and relayed sends as *handed off* or
*best-effort*, never delivered. A relayed send is especially offline-sensitive because it needs two
live hops.

KikiLink does not add end-to-end encryption, signatures, acknowledgements, or server persistence.
Packets inherit BC's privacy and delivery properties. They are hidden from the ordinary chat/Beep UI,
but users must not treat them as a separately encrypted channel.

## Packet shapes

Every packet retains `v: 1`. Each parser requires the exact keys shown and rejects extra or missing
keys, unknown versions/types, invalid IDs or timestamps, disallowed control/directional characters,
and unpaired UTF-16 surrogates.

### Invitation (`gi`, 0.24+)

```json
{"t":"gi","v":1,"g":"group_example123","m":[123,456,789],"n":"Garden friends","u":1787875200000}
```

| Field | Meaning |
| --- | --- |
| `g` | Group ID matching `group_[a-z0-9_-]{8,58}`. |
| `m` | Sorted list of 3-5 unique, positive safe-integer MemberNumbers. |
| `n` | Normalized title, 1-60 characters. |
| `u` | Non-negative finite creation time in milliseconds. |

### Direct message (`gm`, 0.24+)

```json
{"t":"gm","v":1,"g":"group_example123","i":"gmsg_example456","c":"Hello!","u":1787875205000}
```

| Field | Meaning |
| --- | --- |
| `g` | Valid ID of a locally known group. |
| `i` | Message ID matching `gmsg_[a-z0-9_-]{8,57}`. |
| `c` | Normalized non-empty content; new maximum 246, legacy receive maximum 257 characters. |
| `u` | Non-negative finite author time in milliseconds. |

The immediate BC sender is the logical author of `gm`; no author field is accepted from the payload.

### Creator relay (`gr`, 0.25 extension)

```json
{"t":"gr","v":1,"g":"group_example123","o":456,"i":"gmsg_example456","c":"Hello!","u":1787875205000}
```

| Field | Meaning |
| --- | --- |
| `g` | Valid ID of a locally known group. |
| `o` | Original author's positive safe-integer MemberNumber. |
| `i` | The exact message ID from the author's `gm`. |
| `c` | The exact normalized content from that `gm`, at most 246 characters. |
| `u` | The original author timestamp, clamped independently on receipt. |

Only the recorded group creator may send `gr`. A recipient rejects it when the local account is the
creator, `o` is the creator or local account, `o` is not an immutable group member, `o` is locally
blocked/ghosted, or the `(group, message ID)` was already seen. A recipient never relays `gr`, so the
protocol has exactly one relay hop and cannot recursively amplify itself.

BC authenticates the creator as the immediate sender, not the asserted `o`. The creator learned `o`
from an authenticated direct `gm`, but a malicious creator could forge attribution. Relay author names
and numbers are therefore display identity, not cryptographic proof.

### Member display names (`gn`, 0.25 extension)

```json
{"t":"gn","v":1,"g":"group_example123","d":[[123,"Aster"],[456,"Birch"],[789,"Clover"]],"u":1787875200000}
```

| Field | Meaning |
| --- | --- |
| `g` | Valid ID of a locally known group. |
| `d` | Sorted tuples for the exact immutable membership; each normalized name is 1-40 characters. |
| `u` | The creator's group creation time. |

Only the recorded creator may update this display-only map, and the tuple MemberNumbers must exactly
match local immutable membership. Names cannot authorize packets or change membership. A locally
resolved non-fallback BC name is preferred when attributing a received message. The creator sends `gn`
after each successfully handed-off initial or repair invitation so a participant can eventually label
unrelated members without needing them in the local friend list.

## Invitation trust boundary

An incoming invitation is accepted only when all of these checks pass:

1. The service is still attached to the authenticated MemberNumber captured at construction. A
   detected account switch permanently invalidates that service instance.
2. The canonical member list contains both the authenticated sender and local account.
3. The sender is a known BC friend. Current-room visibility is deliberately not invitation trust.
4. No remote member in the proposed group is locally Blacklisted or Ghosted. Guarded relationship
   reads fail closed during invitation validation.
5. The group ID is not protected by a local removal tombstone and the 30-group limit is not full.
6. For an existing ID, the sender is its recorded creator and membership is exactly unchanged.

Creating a group has a matching service-boundary invariant: every remote member must be a locally known
friend, with missing, throwing, or false friend checks rejected. This is what gives the creator a
potential direct AccountBeep route to every participant. UI capability filtering is an additional
compatibility requirement, not a substitute for this trust check.

## Direct and creator-relay routing

The service attempts a direct `gm` only when the target is currently in the same room or is reported as
a known friend. It does not spray AccountBeeps at unrelated MemberNumbers.

For a message authored by a noncreator:

1. The author directly hands the same `gm` and message ID to every currently direct-routable member.
2. When the creator handoff succeeds, nonblocked members without a successful direct handoff are
   reported as relay targets. This status is unconfirmed and offline-sensitive.
3. The creator authenticates the incoming `gm`, stores it once, and queues one `gr` with the same ID for
   each other valid, direct-routable participant.
4. A recipient that already got the direct `gm` rejects the later `gr` as a duplicate. A recipient that
   missed the direct path stores the relay under logical author `o`.

If the author has locally blocked or ghosted another noncreator member, KikiLink does not hand that
message to the creator: without exposing the author's relationship list in the packet, the creator
could not know to exclude that target. Direct sends to other allowed peers may still proceed. This
conservative rule prevents the relay from bypassing the author's local block.

The creator's own messages are direct sends to the selected friends. If a participant cannot hand a
message to the creator, unrelated outside-room members are reported as unreachable; there is no hidden
claim that the message was delivered. `GroupSendResult` distinguishes successful local handoffs,
`relayViaCreator`, unconfirmed `relayTargets`, and `unreachable` members. Local history is written only
when at least one direct handoff succeeds.

## Relay bounds, spam control, and lifecycle

- The creator queue holds at most 60 target jobs.
- At most one relay job is attempted every 210 ms (fewer than 5 attempts/second).
- Jobs expire after 15 seconds and are never retried after their one attempt.
- Dispatch revalidates group, immutable origin/target membership, creator role, local block/ghost state,
  and the same-room/friend route. Removing a group removes its jobs; clear and destroy cancel the queue
  and timer immediately, while an account mismatch drops the queue at the next guarded drain.
- A logical group has an aggregate incoming-message burst of 20 with one token refilled every 250 ms.
  Each logical origin has a burst of 12 with one token refilled every 500 ms. These limits cover direct
  and relayed copies under the same author identity.
- The outer authenticated sender also has bounded buckets before mutation work: invitation/name packets
  share a burst of 4 and refill one token every 15 seconds; message/relay packets share a burst of 60
  and refill one token every 250 ms. At most 128 sender states are retained and idle state expires.

Over-budget, expired, replayed, blocked, malformed, or spoofed packets create no message, unread count,
storage write, relay job, or UI notification.

## Invitation repair

Only the original creator may resend the exact immutable `gi` before an outgoing message, at most once
per minute. Each successfully handed-off repair invitation is followed by `gn`. This can repair missed
state while the creator still satisfies the recipient's friend trust boundary. Participants never relay
an invitation, because that would assign the wrong creator. Repair has no acknowledgement.

## Account-scoped bounded storage

Group state remains stored under `kikilink:group-chats:v1` through account-scoped KikiLink storage.
Stored groups require the local account and creator, canonical membership, valid IDs, title, and
timestamps. Legacy stored messages up to 257 characters remain loadable; new drafts and authored
messages are capped at 246.

| Record | Bound |
| --- | ---: |
| Group conversations | 30 |
| Messages in one group | 500 |
| Messages across all groups | 3,000 |
| Removed-group tombstones | 60 |
| Replay message IDs | 1,000 per group; 3,000 total |
| New draft length | 246 characters |

Evicted/pruned visible IDs enter the bounded replay ledger. Removing a group deletes its history,
message-ID ledger, inbound logical-rate state, and relay jobs, then records a tombstone. Ordinary
persistence mutations use a 300 ms trailing debounce with a hard 1.8-second max wait; remove, prune,
clear, explicit flush, pagehide, and destroy cancel pending timers and flush immediately. Every write
is still read back for verification, and failed writes remain dirty/degraded for a later lifecycle retry.

## Mixed-version compatibility

`gi` and `gm` remain compatible with KikiLink 0.24.0. KikiLink 0.24 ignores unknown `gr` and `gn`
packets, so an old peer can continue a legacy group over routes where direct `gm` already worked, but it
does not gain relay delivery or creator-supplied names. Best-effort nonfriend cross-room delivery needs
the creator and receiving peers on KikiLink 0.25 (`g: 2`); the new-group picker therefore requires g2
for every selected peer. This is still not a delivery guarantee because BC provides no offline queue or
protocol receipt.

Future incompatible semantics must use a new capability/version. New optional packet types may extend
v1 only when older receivers can safely ignore them, as 0.24 does with `gr` and `gn`.
