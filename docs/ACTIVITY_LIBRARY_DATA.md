# Activity library data

KikiLink 0.14.0 makes LinkActivities portable without adding an account, cloud service,
or remote activity index.

## Library model

Every activity has a label, room-emote template, category, pack name, and local favorite flag.
The editor keeps at most 100 complete activities. Existing activities from older KikiLink
versions are migrated safely; the five original defaults are recognized as the `KikiLink Starter`
pack, while other legacy entries become `Uncategorized` activities in `My Activities`.

Built-in packs are merged into the current editor and are not saved until the user chooses
`Save changes`. Installing the same pack again does not duplicate its activities.

## Backup format

- Export creates readable JSON with format `kikilink-activity-library` and version `1`.
- The backup contains an export timestamp and the sanitized activity fields only.
- Import accepts only that versioned KikiLink format and rejects files larger than 1 MB in the UI.
- At most 100 sanitized activities are retained, matching the editor and settings bound.

## Merge rules

- Label and template, compared without surrounding whitespace or letter case, identify duplicates.
- A matching local activity remains in place, so its category and pack are not silently overwritten.
- A favorite is preserved when either the local or imported copy is favorite.
- New valid activities are appended until the 100-activity bound is reached.
- Invalid, excess, and duplicate entries are counted and reported after import.

All processing happens in the browser. Export writes only to the file the user chooses;
KikiLink does not upload activity templates, categories, packs, or favorites.
