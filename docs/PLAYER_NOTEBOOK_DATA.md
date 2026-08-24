# Player notebook data

KikiLink 0.10.0 makes the local Player notebook portable without adding an account,
cloud service, or remote index.

## Backup format

- Export creates a readable JSON file with format `kikilink-player-notebook` and version `1`.
- The backup contains player numbers, display names, favorites, notes, tags, first/last seen
  times, last room names, and encounter counts.
- Import accepts only the versioned KikiLink format and rejects files larger than 2 MB in the UI.
- At most 2,000 sanitized player records are retained, matching the existing local-store bound.

## Merge rules

- An imported member number is merged with the matching local record instead of duplicated.
- Existing non-empty local notes win so an import cannot silently erase current writing.
- Tags are combined without case-insensitive duplicates, up to the normal eight-tag limit.
- Favorites are preserved if either copy is favorite.
- The newest observation supplies the display name and room; first seen uses the earliest
  known time, while last seen and encounter count use the larger values.

## Retention

The user may keep encounter-only records forever or automatically forget them after
30, 90, 180, 365, or 730 days. A favorite or any record with a note or tag is protected
from automatic retention cleanup regardless of age.

All processing happens in the browser. Export writes only to the file the user chooses;
KikiLink does not upload the backup or notebook contents.
