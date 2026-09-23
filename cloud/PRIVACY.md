# KikiLink Cloud privacy information

The official KikiLink build connects automatically with the currently signed-in BC
account. A native BC message proves the Member Number to a separate verifier; a
number typed into a request is not identity proof. Cloud never asks for your BC password.
A browser-local signing key can remember a verified device for up to 30 days. Signing
out revokes its Cloud grant and pauses automatic connection until you connect again.
Different browsers or BC origins may need a new verification.

## Profiles and social content

On first connection, KikiLink synchronizes the public profile fields you already
configured: name, bio, custom status, decorations, style, colors and supported avatar/
banner images. Existing Cloud revisions take precedence over an older local copy.
Deleting a Cloud profile prevents automatic republishing of that deleted profile.
Visible profiles can be found by Member Number without previously meeting in a room.
Feed posts, images, comments and reactions are visible to connected users, subject to
blocking and moderation.

Cloud stores groups, roles and accepted membership, plus encrypted group messages.
Messages use HTTPS and server encryption; they are **not end-to-end encrypted** because
the service holds decryption keys. Moderators can review reported content; a report
alone does not authorize access to the surrounding conversation. Members explicitly
accept invitations and cannot read messages from before their admission or readmission.

Native chat/group histories, private notes, room/movement history, Gallery and Music
files are not automatically uploaded. Profile/feed images use KikiLink-managed private
object storage, with size limits, metadata removal and image re-encoding. Importing a
supported existing profile image can read its original host; that host can observe the
request. Other existing media stays at its chosen host or in device storage.

Availability stores only current Online/Idle/DND/Offline state with a three-minute
expiry and no room location. Group typing is temporary and expires without a stop
packet. Connected clients receive bounded events to refresh relevant content.

## Storage and retention

| Data | Retention |
| --- | --- |
| Published profile/feed content | Until owner deletion or moderation, subject to quotas |
| Group messages | At most 30 days and 5,000 retained messages per group |
| Outstanding invitations | 7 days |
| Presence | 180 seconds; no history |
| Identity challenge / access session | 3 minutes / at most 1 hour |
| Remembered device grant | At most 30 days, without sliding extension |
| Unattached ready media | Eligible for cleanup after 24 hours |
| Failed/pending uploads | Eligible for cleanup after 1 hour |
| Reports/moderation records | 30 days |
| Encrypted database backups | At most 14 days / 14 snapshots under the production backup policy |

The Cloud operator, host and object-storage provider necessarily process network and
storage metadata. Application logs omit message bodies, raw IP addresses and
credentials; expiring IP pseudonyms support rate limits. The production log policy
bounds sanitized operational logs to 7 days / 64 MiB. Reports store a resource reference
and an encrypted reason.

Deletion removes access through the API immediately. Deleted Feed rows and unreferenced
objects are removed by periodic cleanup, which can be delayed by service/storage outages.
Older encrypted backups can contain deleted content until expiry. Viewers may have saved
copies. Blocking prevents subsequent Cloud reads/interactions in both directions;
cached content can remain until refresh. Native BC block/ghost settings still apply.

## Controls and limitations

You can edit/delete your profile, posts, comments and own messages, remove reactions,
leave groups where permitted, sign out, and report/block users. Clearing local chat
history or uninstalling KikiLink does not delete Cloud content. There is currently no
single self-service full-account export/erasure command. For an account-level request,
contact the project maintainer using the Discord link in About; do not post private
content or credentials in a public issue. Security-sensitive reports belong in
[private vulnerability reporting](../SECURITY.md).

Browser storage and the page runtime are not isolated from trusted co-installed addons.
See the [main privacy information](../PRIVACY.md) for native BC data, external media hosts
and the page-realm trust boundary.

## Optional social delivery and Preferences

These features are available in KikiLink 1.0. A self-hosted server must explicitly enable
`CLOUD_COMMUNITY_ENABLED=true` after migration; the example configuration defaults to `false`.

Friend requests apply only to authenticated accounts advertising the capability. Cloud
stores each side's explicit friendship grant separately from the request. On first use,
an account confirms its own existing native friends without sending new requests to all
of them. Two authenticated grants are required for offline delivery. The server cannot
independently inspect a BC FriendList or verify an offline native-list change; it relies
on each authenticated client reporting its own grants and removals. A revocation creates
a tombstone, so startup does not silently restore a removed relationship. Blocking and
revocation invalidate pending delivery. Native and Cloud synchronization can fail
separately; the UI offers retry and does not report both steps as successful prematurely.

Offline Direct is **enabled automatically** when the authenticated client connects to a
compatible Cloud server. Both accounts must advertise support and have confirmed bilateral
friendship grants. The old development opt-out value is no longer a delivery switch;
signing out pauses Cloud on that browser. Only newly sent messages on an eligible route
use Cloud, whether either user is online or offline. No old history is imported.
The message body and optional, explicitly
included room name are encrypted with the existing server key ring; HTTPS protects
transport. This is **not E2EE**. Media remains a reference to its current host, whose
availability and signed-URL expiry are independent of message delivery.

The browser stores a bounded retry queue for Cloud delivery even when ordinary
history saving is disabled. The queue contains the unsent/waiting message text, stable
message ID, recipient and original timestamp; at most 100 pending entries are retained.
Delivery acknowledgment removes the queue entry. Expired entries fail on the next sync;
Clear history and Remove chat also stop corresponding local retries. Stopping retries
cannot recall a request already accepted by the server. Save message history separately
controls the local conversation archive. New incoming content with history disabled
stays in memory; acknowledgment still means receipt by that client, not durable storage
on another device and not that the person read it.

Read receipts are separate from delivery acknowledgments. They share a read timestamp with
the sender for Direct messages and a bounded member read position inside an authorized group.
Reaction details reveal each eligible reactor and emoji to users allowed to view the post or
comment. Feed promotion stores pin metadata and a past-winner record to avoid featuring a
post repeatedly; blocking and moderation still restrict access to its content.

| Additional data | Retention / access |
| --- | --- |
| Direct message payload | Up to 30 days after server acceptance; permission checked on retrieval |
| Direct stable-ID metadata | Up to 60 days after acceptance, for bounded deduplication |
| Delivery receipts | Up to 30 days after the receipt |
| Mailbox | Up to 30 days, at most 500 entries per account; recipient only |
| Relationships and read cursors | Until changed or account erasure; account scoped |
| Preferences | Until user editing, clearing, or deletion; independent encrypted storage |

Mailbox excludes normal Direct/Group messages and online/typing noise. Similar reactions
are aggregated. Reading a notification does not accept or decline its friend request.
Reports remain visible only through existing server-authorized moderation routes; SSE
contains addressed invalidations, not private report reasons or preference ratings.

Preferences are optional self-entered interests between consenting adults. They are not
inferred from messages, activity or equipment and never change BC permissions. Default
**Private** shares neither ratings nor a score. **Compatibility only** returns a server
calculated score and count without the hidden ratings. Even a score can reveal clues;
Private is the choice for avoiding that disclosure. **Friends only** requires bilateral
Cloud grants. **Public in KikiLink** means eligible authenticated KikiLink accounts, not
an unauthenticated web page. Both sides must enable an appropriate sharing mode.

Ratings are excluded from public profile payloads, BC presence, ExtensionSettings,
shared events, analytics and request logs. The editor holds them in memory and accesses
separate authenticated endpoints. The bundled catalog makes no runtime requests to
external sources. Clear ratings retains a saved empty document; Delete saved preferences
removes the ratings and restores Private while retaining an empty encrypted record and
monotonic revision to reject stale device writes. Backups expire under the existing
14-day policy. Neither operation erases copies another allowed viewer already saved.

Compatibility uses only catalog entries that both people explicitly configured. An
absent entry means **Not Set**, is not converted to Neutral, and is excluded from both
matches and differences. Explicit Neutral is retained and compared. At least five
shared configured entries are required before a percentage is returned. Ordinary
levels use a symmetric distance from Hate through Love; Hard Limit uses separate
boundary-aware similarity rules. A Like/Love versus Hard Limit pairing is also returned
as an explicit hard-limit conflict and shown separately from the percentage. Boundaries
always take precedence over a score.

The result is a comparison of expressed interests, not a scientific measure,
complementary-role model, ranking of people, or consent. Requests are limited to the
authenticated actor's own pair, rate limited and cached by revisions; permission is
checked before returning a cached value. It is still not a guarantee against all
inference by a motivated viewer.
