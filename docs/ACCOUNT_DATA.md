# Account-scoped data and device sync

KikiLink treats the authenticated Bondage Club `Player.MemberNumber` as the owner of its persistent
state. It does not use a separate KikiLink identity. Account scoping prevents accidental mixing inside
KikiLink; it is not encryption or a confidentiality boundary against Bondage Club, same-origin code,
browser extensions with suitable access, or another person using the same browser/account.

## Local isolation

- localStorage keys use the prefix `kikilink:account:<MemberNumber>:`;
- chat history uses the IndexedDB database `kikilink-account-<MemberNumber>`;
- LinkRoster receives the same account-scoped storage as Settings;
- the bounded public-profile cache uses the same account-prefixed local storage and KikiLink does not
  expose it when a different MemberNumber is signed in;
- logout stops modules, hooks, intervals, and repositories and removes the KikiLink host; and
- an in-page account change completes that teardown before mounting the next account.

Startup also waits until Bondage Club has populated the authenticated player's `ExtensionSettings`.
The account namespace is therefore opened at the same post-login boundary as its server-backed data,
instead of letting an earlier empty login state overwrite it.

Versions before 0.20.2 wrote unscoped keys such as `kikilink:settings:v1` and used one `kikilink`
IndexedDB database. Those records contain no owner MemberNumber. KikiLink therefore does not import
them automatically: assigning them to the next login would risk exposing one account's chats or
notes to another account. The old keys are left untouched as a quarantined legacy copy.

## Bondage Club account mirror

The current account's portable state is serialized under `Player.ExtensionSettings.KikiLink` and
saved with Bondage Club's native `ServerPlayerExtensionSettingsSync` API. It is readable JSON or
reversibly compressed/base64-encoded JSON, not encrypted. The payload contains:

- validated settings, including profile, AFK, Alerts, Custom Activities, and Blossom position;
- LinkRoster records and private notebook fields; and
- at most 100 recent direct conversations and 600 recent direct messages, with at most 100 messages
  from one conversation; and
- bounded monotonic markers for direct-conversation deletion, history clearing, and retention.

Group-chat history, device Gallery/Music/custom-sound blobs, fetched remote-image blobs, live presence,
and typing signals are not part of this mirror. Some metadata that points to a remote media URL can be
part of settings even though the media bytes are not.

The encoded payload is capped at 120,000 characters. If it approaches the cap, oldest mirrored chat
messages are removed first, followed by the mirrored chat section. Notebook records are reduced only
after chat data, with favorites, notes, tags, and recent encounters receiving priority. Settings are
never selectively truncated. The complete account-local stores remain unchanged by this fitting
process.

The mirror carries its owner MemberNumber and is rejected if it does not match the current Player.
A same-device mirror and the server copy carry update timestamps; the newer valid copy wins at
startup. Remote chats merge into the local account database. Deletion and retention markers are
merged monotonically and applied before messages so an older portable snapshot cannot simply restore
rows that a newer KikiLink instance removed. A genuinely newer direct message may create a removed
conversation again.

The public-profile cache is deliberately not part of this Bondage Club account mirror. It remains a
device-local convenience containing at most 200 profiles for 90 days, with least-recently-used pruning.
Only public presentation data can enter it: the BC-known display name; voluntarily shared avatar
URL/frame, card style, banner, short bio, outline, gradient, and addon version; plus local receipt/access times. Current status,
current room, private notebook data, relationship state, protocol bookkeeping, and fetched image blobs
are excluded. Banner, bio, outline, and gradient carry their own receipt time and expire independently;
basic presence packets cannot renew their age. A peer's explicit profile-withdrawal packet removes
that peer's saved record.

## Scope and privacy

KikiLink operates no account or sync server. The portable copy uses the Bondage Club account data
already returned with `Player.ExtensionSettings`. Image uploads and direct avatar/image URLs retain
their separate behavior documented in `LOCAL_IMAGE_UPLOADS.md`; their remote files are not embedded
in the KikiLink account snapshot. A saved public profile or saved-details subset is labeled as such in
the UI and is never used as proof that someone is currently online or in a particular room.

Deleting browser data or uninstalling a loader does not necessarily remove the already synchronized
`ExtensionSettings` value. KikiLink's in-app chat/notebook controls update their corresponding local
and portable state, but no deletion can retract data already delivered to another player or stored by
Bondage Club or a media provider. See the complete [privacy model](../PRIVACY.md).
