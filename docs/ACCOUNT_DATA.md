# Account-scoped data and device sync

KikiLink 0.20.5 treats the authenticated Bondage Club `Player.MemberNumber` as the owner of every
piece of state. It does not use a shared browser-wide KikiLink identity.

## Local isolation

- localStorage keys use the prefix `kikilink:account:<MemberNumber>:`;
- chat history uses the IndexedDB database `kikilink-account-<MemberNumber>`;
- LinkRoster receives the same account-scoped storage as Settings;
- the bounded public-profile cache uses the same account-prefixed local storage and is never visible
  to a different signed-in MemberNumber;
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
saved with Bondage Club's native `ServerPlayerExtensionSettingsSync` API. The payload contains:

- validated settings, including profile, AFK, Alerts, Custom Activities, and Blossom position;
- LinkRoster records and private notebook fields; and
- at most 100 recent conversations and 600 recent messages, with at most 100 messages from one
  conversation.

The encoded payload is capped at 120,000 characters. If it approaches the cap, oldest mirrored chat
messages are removed first, followed by the mirrored chat section. Notebook records are reduced only
after chat data, with favorites, notes, tags, and recent encounters receiving priority. Settings are
never selectively truncated. The complete account-local stores remain unchanged by this fitting
process.

The mirror carries its owner MemberNumber and is rejected if it does not match the current Player.
A same-device mirror and the server copy carry update timestamps; the newer valid copy wins at
startup. Remote chats merge into the local account database rather than clearing newer local data.

The public-profile cache is deliberately not part of this Bondage Club account mirror. It remains a
device-local convenience containing at most 200 profiles for 90 days, with least-recently-used pruning.
Only public presentation data can enter it: the BC-known display name; voluntarily shared avatar
URL/frame, card style, banner, outline, gradient, and addon version; plus local receipt/access times. Current status,
current room, private notebook data, relationship state, protocol bookkeeping, and fetched image blobs
are excluded. Banner, outline, and gradient carry their own receipt time and expire independently;
basic presence packets cannot renew their age. A peer's explicit profile-withdrawal packet removes
that peer's saved record.

## Scope and privacy

KikiLink operates no account or sync server. The portable copy uses the Bondage Club account data
already returned with `Player.ExtensionSettings`. Image uploads and direct avatar/image URLs retain
their separate behavior documented in `LOCAL_IMAGE_UPLOADS.md`; their remote files are not embedded
in the KikiLink account snapshot. A saved public profile or saved-details subset is labeled as such in
the UI and is never used as proof that someone is currently online or in a particular room.
