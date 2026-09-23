-- Existing reactions keep their values; their historical dates are unknown.
ALTER TABLE reactions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX reactions_recent ON reactions(target_type,created_at,target_id);
CREATE TABLE feed_pins (
  post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  pinned_by INTEGER NOT NULL REFERENCES users(member_number),
  pinned_at INTEGER NOT NULL
) STRICT;
CREATE TABLE feed_features (
  post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  featured_at INTEGER NOT NULL,
  featured_until INTEGER NOT NULL CHECK(featured_until>featured_at)
) STRICT;
CREATE INDEX feed_features_expiry ON feed_features(featured_until);
CREATE TABLE feed_feature_state (
  id INTEGER PRIMARY KEY CHECK(id=1),
  next_check_at INTEGER NOT NULL
) STRICT;
INSERT INTO feed_feature_state VALUES(1,0);
