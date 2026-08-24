# Account-scoped data and device sync

KikiLink 0.20.2 treats the authenticated Bondage Club `Player.MemberNumber` as the owner of every
piece of state. It does not use a shared browser-wide KikiLink identity.

## Local isolation

- localStorage keys use the prefix `kikilink:account:<MemberNumber>:`;
- chat history uses the IndexedDB database `kikilink-account-<MemberNumber>`;
- LinkRoster receives the same account-scoped storage as Settings;
- logout stops modules, hooks, intervals, and repositories and removes the KikiLink host; and
- an in-page account change completes that teardown before mounting the next account.

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

## Scope and privacy

KikiLink operates no account or sync server. The portable copy uses the Bondage Club account data
already returned with `Player.ExtensionSettings`. Image uploads and direct avatar/image URLs retain
their separate behavior documented in `LOCAL_IMAGE_UPLOADS.md`; their remote files are not embedded
in the KikiLink account snapshot.
