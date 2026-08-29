# KikiLink group chat protocol

Protocol version 1 ships with KikiLink 0.24.0. It provides small addon-only group conversations
without a KikiLink account, central group server, or mutable remote participant list. Direct 1-to-1
Beeps remain a separate feature and keep their existing format.

## Product contract

- A group contains 3-5 total BC members, including the creator. The creation dialog therefore asks
  for 2-4 known BC friends that recently advertised group-chat v1 through `g: 1` and presents the complete
  list for confirmation before sending.
- Membership is canonical, sorted by numeric BC MemberNumber, unique, and immutable. To add or remove
  a participant, users create a new group.
- A title is 1-60 characters after whitespace normalization. Display names are resolved locally for
  presentation and are never used as identity or authorization.
- A group message is 1-257 UTF-16 characters after line-ending normalization and outer trimming.
  This limit is derived from the largest valid message envelope and the exact worst case where JSON
  escaping doubles every accepted character.

## Transport and limits

The common BC adapter carries one payload to each remote participant. It uses a targeted hidden room
message when that member is in the same room; otherwise it uses a secret account packet with Beep type
`KikiLink`. The adapter adds its `KIKILINK/1 ` marker, and the JSON payload following that marker must
be 1-700 characters.

KikiLink does not add end-to-end encryption. Group packets receive the privacy and delivery properties
of the selected Bondage Club transport. They are hidden from the ordinary chat/Beep interface, but
users should not treat them as a separate encrypted channel.

Version 1 has exactly two packet shapes:

### Invitation

```json
{"t":"gi","v":1,"g":"group_example123","m":[123,456,789],"n":"Garden friends","u":1787875200000}
```

| Field | Meaning |
| --- | --- |
| `t` | Exact type `gi`. |
| `v` | Exact protocol version `1`. |
| `g` | Group ID matching `group_[a-z0-9_-]{8,58}`. |
| `m` | Canonical sorted list of 3-5 unique, positive safe-integer MemberNumbers. |
| `n` | Normalized title, 1-60 characters. |
| `u` | Non-negative finite creation time in milliseconds. |

### Message

```json
{"t":"gm","v":1,"g":"group_example123","i":"gmsg_example456","c":"Hello!","u":1787875205000}
```

| Field | Meaning |
| --- | --- |
| `t` | Exact type `gm`. |
| `v` | Exact protocol version `1`. |
| `g` | Valid ID of a locally known group. |
| `i` | Message ID matching `gmsg_[a-z0-9_-]{8,57}`. |
| `c` | Normalized non-empty content, at most 257 characters. |
| `u` | Non-negative finite sender time in milliseconds. |

Both parsers require the exact keys shown. Extra keys, missing keys, unknown versions or types,
duplicate or unsorted member numbers, invalid IDs, disallowed control or directional characters,
and unpaired UTF-16 surrogates cause the whole packet to be ignored.

## Invitation trust boundary

An incoming invitation is accepted only when all of these checks pass:

1. The service is still attached to the same authenticated MemberNumber it captured at construction;
   any detected adapter account change permanently invalidates that service instance.
2. The BC transport identifies a valid remote sender.
3. The canonical member list contains both that sender and the local account.
4. The sender is a known BC friend. Sharing the current room is deliberately not a trust signal:
   an unrelated room participant cannot silently consume the 30-group local limit.
5. The sender is not locally Blacklisted or Ghosted.
6. The group ID has not been removed locally and is not blocked by a retained tombstone.
7. If the group already exists, the sender is its recorded creator and the membership is byte-for-byte
   equivalent after canonical parsing. The invitation cannot rewrite the creator or participant list.

The trust check only permits creation of a bounded local conversation record. It does not grant room
permissions, run UI commands, modify player notes, or change native BC relationships.

## Message authorization and replay handling

- The local account must already know the group; a message cannot create one implicitly.
- The sender must be one of that group's immutable members and must not be locally blocked or ghosted.
- A visible message ID is checked directly in bounded history. Only IDs whose visible messages are
  evicted or pruned move into the separate replay-tombstone ledger, avoiding a duplicate copy of every
  retained ID. Within the ledger's 1,000-per-group/3,000-total horizon, an evicted ID remains rejected
  and survives reloads.
- A remote timestamp more than five minutes away from receipt time is replaced with receipt time.
  The sender therefore cannot push a conversation arbitrarily far forward or backward in the UI.
- Incoming content passes the same strict control-character, surrogate, content-length, and envelope
  limits used for local serialization before it reaches storage or rendering.

Inbound limits are applied before mutation queues, storage writes, and UI notifications. Each sender has
separate bounded token buckets: invitations allow a burst of 4 and refill one token every 15 seconds;
messages allow a burst of 60 and refill one token every 250 milliseconds. At most 128 inactive/active
sender states are retained, and idle states expire. Dropped over-budget packets create no conversation,
message, unread count, storage write, or update event.

## Delivery semantics

Invitations and messages are multicast as individual point-to-point sends, one per remote member.
One member's synchronous transport failure does not prevent attempts to the others, and the interface
reports partial failures. A newly written outgoing message is added to local history only when at
least one call is handed to the local BC adapter without throwing; if all local handoffs fail, the
text is not presented as a saved message.

There are no protocol-level delivery receipts. “Handed off” means only that KikiLink called the local
Bondage Club send path without a synchronous error, not that the server queued it or any remote browser
displayed it. Participants can also be offline or running an
older addon, so version 1 makes no claim of global ordering or guaranteed delivery.

As a bounded best-effort repair, only the original creator may resend the group's exact immutable
invitation before an outgoing message, at most once per minute. This can repair a missed invitation when
the creator still satisfies the recipient's known-friend trust boundary. Participants never relay an
invitation, because doing so would give a previously uninitialized recipient the wrong creator identity.
The repair has no ACK and does not change the meaning of “sent.”

## Account-scoped bounded storage

Group state is stored under `kikilink:group-chats:v1` through the authenticated account's KikiLink
storage. A stored group is discarded on load unless it still contains the local MemberNumber and its
creator, canonical 3-5 member list, valid ID, title, and timestamps.

| Record | Bound |
| --- | ---: |
| Group conversations | 30 |
| Messages in one group | 500 |
| Messages across all groups | 3,000 |
| Removed-group tombstones | 60 |
| Replay message IDs | 1,000 per group; 3,000 total |
| Draft length | 257 characters |

Older messages are trimmed first when a bound is crossed and their IDs enter the bounded replay ledger.
Removing a group deletes its local history and message-ID ledger, then records a bounded group tombstone
so a replayed invitation does not immediately restore it. Clearing all group data also clears those
tombstones.

Ordinary message, read, pin, and draft mutations share a 300 ms bounded persistence window, so a packet
burst or typing session serializes once instead of rewriting the complete snapshot per mutation. Remove,
prune, clear, module shutdown, and browser `pagehide` boundaries flush immediately or await queued work.
Every read and write is diagnosed because the account-storage facade may contain browser exceptions. A
missing key is a healthy empty state, but an unreadable key or nonempty malformed/unsupported snapshot
puts the service into degraded mode and blocks mutations without replacing the original bytes. Once a
read succeeds again, a supported old snapshot is restored before mutations resume. Clear is the explicit
override: it may remove or replace unknown bytes, reports whether the empty state is durable, and leaves
an unsuccessful clear empty in memory but dirty for a later retry. Failed write verification likewise
retains dirty state and reports recovery after a later successful flush. No storage failure escapes as an
unhandled callback exception. Removing one group also checks that immediate flush: on failure the group
stays removed only in memory, remains dirty for retry, and the UI explicitly warns that it may reappear
after reload.

## Compatibility

Only peers whose recent KikiLink `pc` or `ps` capability packet advertised `g: 1` are offered by the
creation interface. A legacy packet without `g` can still confirm the addon for Blossom, direct chat,
and profiles, but it does not claim group-chat support. Players without group-chat v1 support do not
receive or display these addon group conversations. Future protocol changes must use a new version or
packet type; version 1 receivers fail closed on unknown shapes instead of guessing their meaning.
