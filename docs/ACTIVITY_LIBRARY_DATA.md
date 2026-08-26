# Custom Activities data and compatibility

KikiLink 0.20.5 stores user-created activities under the authenticated BC MemberNumber and registers
them beside Bondage Club's vanilla activities at runtime. There is no public activity library or
remote index; the private library is also included in that account's bounded `ExtensionSettings`
snapshot so it can follow the same account to another device.

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

KikiLink derives a private runtime name from the owning MemberNumber and each local ID, then waits
until Bondage Club exposes its populated live `ActivityFemale3DCG` registry and ordering list before
appending the definition. Each native object explicitly provides `ActivityID`, `Target`, and
`TargetSelf`, matching the registration shape used by Echo's activity manager. A lightweight
lifecycle check detects replaced or rebuilt registry arrays and restores every saved definition
exactly once. Before every sync and during unload, all names under KikiLink's prefix are removed
from both the tracked and current registries. This keeps edits idempotent without load-order races.

KikiLink also extends both `ActivityAllowedForGroup` and the final `DialogActivity` list used to
create the native button grid. This redundant path prevents a late userscript load, a rebuilt
registry, or a replaced ModSDK entrypoint from leaving a saved definition invisible. Existing
native results are preserved, a matching custom action can populate an otherwise empty native list,
and duplicate runtime names are never appended.

If the native activity grid is already open when a definition is saved or restored, KikiLink asks
Bondage Club to rebuild that grid immediately; otherwise the next ordinary menu open discovers it.

The activity uses `MaxProgress: 0`; optional arousal is not delegated to the vanilla activity cap.
KikiLink intercepts only its own runtime names, reuses the chosen vanilla picture, and appends the
upper-left Blossom marker after Bondage Club creates the native button. Other activities and hook
handlers keep their normal chain.

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

All processing remains local. Persistence is separated by MemberNumber and uses the private,
bounded BC account snapshot described in `ACCOUNT_DATA.md` for same-account device transfer.

Schema 14 adds only profile, AFK, temporary-upload, and the former room-badge preferences. Existing custom
activities remain intact. The former Cloudinary upload switch is reset to off once during migration
so it is not silently treated as consent to send files to a replacement public host.

Schema 15 replaces the old badge presets with one normalized draggable position and changes only the
untouched accidental Russian AFK default to English. User-edited AFK messages remain unchanged.

Schema 16 changes that flower position from a viewport coordinate to a character-relative canvas
offset. The obsolete v15 coordinate alone is reset to the addon-icon row.
