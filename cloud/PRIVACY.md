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
