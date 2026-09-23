# Preferences catalog source registry

Catalog `2026.09.23-1`, updated 2026-09-23. Source of truth:
`cloud/shared/preferences-catalog.json`. The addon and API bundle this same reviewed file.
There are **225 unique semantic IDs** in 11 browsable categories. Twenty-four common
entries are marked for Quick Setup; this flag controls presentation only and has no
effect on compatibility. These are category choices for browsing, not claims about the
popularity or psychology of an item.

| Category | Entries |
| --- | ---: |
| Dynamics | 18 |
| Bondage & Restraints | 52 |
| Impact & Pain | 11 |
| Control | 10 |
| Psychological | 10 |
| Roleplay | 21 |
| Sensory | 11 |
| Fetishes | 23 |
| Physical / Sexual | 50 |
| Exhibition / Attention | 2 |
| Edge / Taboo | 17 |

Edge / Taboo is visually separated in the browser. Fantasy and roleplay labels are
explicit where needed; every catalog entry is scoped to consenting adults.

## Primary sources

| Source | Exact origin | Use and reuse boundary |
| --- | --- | --- |
| Bondage Club R131 | [Female3DCG.js, commit 0de770190c9e72790d3be6be70e7901d68cc78a0](https://gitgud.io/BondageProjects/Bondage-College/-/blob/0de770190c9e72790d3be6be70e7901d68cc78a0/BondageClub/Assets/Female3DCG/Female3DCG.js): `FetishFemale3DCG`, `ActivityFemale3DCG` | 19 of 20 native fetish definitions; 18 selected activities split into giving and receiving. Short semantic names and provenance only; no BC source code or artwork is bundled. |
| BC item vocabulary | [Female3DCG.csv at the same commit](https://gitgud.io/BondageProjects/Bondage-College/-/blob/0de770190c9e72790d3be6be70e7901d68cc78a0/BondageClub/Assets/Female3DCG/Female3DCG.csv) | 30 curated item concepts, grouped across asset variants. References use exact `group/asset` keys. No color/asset-by-asset expansion. |
| BC behavior/labels audit | [Scripts/Preference.js](https://gitgud.io/BondageProjects/Bondage-College/-/blob/0de770190c9e72790d3be6be70e7901d68cc78a0/BondageClub/Scripts/Preference.js), [Scripts/Activity.js](https://gitgud.io/BondageProjects/Bondage-College/-/blob/0de770190c9e72790d3be6be70e7901d68cc78a0/BondageClub/Scripts/Activity.js) | Checked how native names/activities relate to the displayed vocabulary. The new ratings are independent, never imported from native permissions. |
| F-List | [Public kink-list endpoint](https://www.f-list.net/json/api/kink-list.php), [Terms](https://www.f-list.net/doc/tos.php) | Public endpoint and terms were accessible. Cross-references use source IDs; only common short concepts are normalized. Its complete catalog, hierarchy, descriptions, profiles and images are not redistributed. Terms are restrictive; this is not represented as a licensed copy of the database. |
| Scarleteen, Heather Corinna and CJ Turett | [Yes, No, Maybe So: A Sexual Inventory Stocklist](https://www.scarleteen.com/read/relationships/yes-no-maybe-so-sexual-inventory-stocklist), [guidelines/privacy](https://www.scarleteen.com/about/user-guidelines-privacy-policy) | Public first-party checklist, updated March 12, 2025, checked on the date above. Selected concepts provide cross-checks for touch and separate leading/following roles. No prose, checklist structure or images are copied. This source's audience does not define KikiLink's adult-only scope. |

The BC repository's license was not established from the inspected root path (the
candidate LICENSE path returned 404). No permission to redistribute BC code or art is
asserted. The catalog contains normalized short common concepts and source metadata.
FetLife was not required or scraped; two accessible external primary sources were used.
Source availability and term review do not imply external endorsement.

## Normalization and exclusions

- IDs name stable meanings; labels and aliases can change without moving a user's rating.
  Renaming or sorting is not a migration between concepts. Giving and receiving have
  distinct IDs, and the score does not treat opposite roles as automatically compatible.
- Exact synonyms are represented as search aliases and are never scored separately.
  Material preferences such as latex, rubber and PVC remain distinct because users can
  meaningfully configure them differently. Aliases are empty where no meaningful
  additional synonym was verified.
- Generic concepts and meaningful subtypes may remain distinct (for example restraint
  interest versus rope material, or generic gagging versus a ball gag). Each explicit
  rating counts once; there is no hidden weighting or auto-fill of the subtype.
- BC equipment is provenance, not evidence about the owner's interests. Colors,
  addon-only assets, names of unrelated addons and equipment permissions are not ratings.
- The catalog excludes the ambiguous ABDL/child-coded family, minors, real animals,
  nonconsensual/illegal categories and unrelated violent content. Adult pet/pony roleplay
  is explicitly roleplay. Source presence alone never authorizes importing a category.
- Manual review corrected loose substring matches to concrete assets, including cuffs,
  mittens, collars, chastity belts/cages, padlocks and corsets. The provisional glove and
  chair entries were removed before this catalog's first publication because their
  BC references were not precise enough. Those IDs have never shipped in stable KikiLink.
- `scripts/build-preferences-catalog.py` generates the expanded catalog while asserting
  that every ID from the first private prototype remains present. New labels and search
  aliases do not create duplicate scoring entries.
- There are no runtime third-party catalog requests. Source fetches were developer
  research only. No personal source-site data or private ratings were collected.

## Updates and retired ratings

Change the catalog version when its contents change. Keep an existing ID only when its
meaning is unchanged. Add genuinely new interests with no rating (Not set), never Neutral.
Move retired IDs to `retiredIds`; do not recycle them. The API preserves already saved
unknown/retired IDs on edits but will not accept arbitrary new unknown IDs. Retired values
remain visible as a retained count in the editor, are excluded from Compatibility, and
can be removed using Clear ratings or Delete saved preferences. `retiredIds` is empty in
this initial version. `tests/preferences-catalog.test.ts` checks uniqueness, provenance,
category validity, directional pairs and absence of active/retired collisions.

Saved levels use stable string values: `hate`, `dislike`, `neutral`, `like`, `love`, and
`hard_limit`. Absence is **Not Set** and is never materialized as Neutral. Legacy integer
values from the private prototype are accepted only as an in-place read/write upgrade;
responses and new writes are canonical strings.

The editor applies a choice immediately in memory, batches small partial `PATCH` updates,
and uses revision compare-and-swap to prevent silent overwrites. If another client saved
first, untouched remote fields are merged with the local pending fields and retried.
Removing a choice sends `null` for that ID and restores Not Set. Preference writes use
their own encrypted record and cannot replace unrelated profile fields.

Compatibility includes only IDs explicitly configured by both people, including an
explicit Neutral. Unknown, retired, and Not Set entries do not contribute. Like/Love
versus Hard Limit is reported separately as a hard-limit conflict in addition to the
ordinary score; a numerical result never overrides a boundary.
