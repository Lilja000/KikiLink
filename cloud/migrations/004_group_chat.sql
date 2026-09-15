-- Group avatars share the existing validated avatar image format and lifecycle.
CREATE TABLE group_media (
  group_id TEXT PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES storage_assets(id)
) STRICT;
CREATE INDEX group_media_asset ON group_media(asset_id);

-- An explicit profile deletion must survive sign-in on another device.
CREATE TABLE profile_preferences (
  member_number INTEGER PRIMARY KEY REFERENCES users(member_number) ON DELETE CASCADE,
  automatic_disabled INTEGER NOT NULL CHECK(automatic_disabled IN (0,1))
) STRICT;
