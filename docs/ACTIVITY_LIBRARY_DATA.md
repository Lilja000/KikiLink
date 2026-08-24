# Custom Activities data and compatibility

KikiLink 0.20.0 stores user-created activities locally and registers them beside Bondage Club's
vanilla activities at runtime. No account, cloud library, or remote activity index is involved.

## Local model

Each complete activity contains:

- a stable local ID and display name;
- one native target body group;
- an `other`, `self`, or `both` target mode;
- a text template of at most 500 characters;
- the name of a vanilla activity picture to reuse; and
- an optional arousal base amount from `0` (off) through `20`.

The library starts empty and is limited to 100 complete entries. Text controls are normalized,
asset and image names must be simple Bondage Club identifiers, duplicate IDs are made unique, and
invalid target modes or amounts fall back to safe defaults.

The editor exposes every available body group in a visible selection grid. Its picture gallery is
a static canonical manifest of 33 unique vanilla activity images; live addon registries, LSCG images,
item-action images, and duplicate vanilla aliases are never offered. Older saved aliases are mapped
to their canonical vanilla image during editing and sanitation.

## Runtime registration

KikiLink derives a private runtime name from each local ID, then appends an activity definition to
Bondage Club's `ActivityFemale3DCG` registry and ordering list. Before every sync and during unload,
all names under KikiLink's prefix are removed first. This makes updates idempotent and prevents
duplicates after editing, reconnecting, or reloading the addon.

The activity uses `MaxProgress: 0`; optional arousal is not delegated to the vanilla activity cap.
KikiLink intercepts only its own runtime names, reuses the chosen vanilla picture, and appends the
Blossom marker after Bondage Club creates the native button. Other activities and hook handlers keep
their normal chain.

## Visible action and optional effect

The sender expands the template into one finished sentence before publishing it as a normal custom
Bondage Club action. A missing-interface dictionary entry contains that human-readable sentence, so
players without KikiLink can still read it. Variables and configuration objects are never used as
the visible chat text.

When arousal is enabled, a second dictionary entry carries a compact metadata object containing the
protocol version, server sender, intended recipient, body group, base amount, and one-time nonce. A
receiving KikiLink instance checks all fields, confirms the sender is in the current room, enforces
the `0–20` bound, and rejects replayed nonces before calling Bondage Club's preference-aware
`ActivityEffectFlat` API. Players without KikiLink simply ignore this metadata.

## Settings migrations

The former KikiLink Starter pack is intentionally discarded so the new library honors the empty
default. Legacy user-written room actions are preserved and converted with:

- their label as the new name;
- `ItemArms` as an editable initial body group;
- other-character targeting;
- the vanilla `Caress` picture;
- arousal off; and
- legacy `{source}` changed to `{me}`.

All processing and persistence remain in the current browser profile.

Schema 14 adds only profile, AFK, temporary-upload, and room-badge preferences. Existing custom
activities remain intact. The former Cloudinary upload switch is reset to off once during migration
so it is not silently treated as consent to send files to Litterbox.
