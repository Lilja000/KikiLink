-- Private per-account Feed choices; no preference is visible to other viewers.
CREATE TABLE feed_preferences (
  owner INTEGER NOT NULL REFERENCES users(member_number),
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  bookmarked INTEGER NOT NULL DEFAULT 0 CHECK(bookmarked IN (0,1)),
  hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)),
  watching INTEGER NOT NULL DEFAULT 0 CHECK(watching IN (0,1)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(owner,post_id)
) STRICT;
CREATE INDEX feed_watchers ON feed_preferences(post_id,watching,owner);
ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE SET NULL;
CREATE INDEX comments_parent ON comments(parent_id,id);
ALTER TABLE feed_media ADD COLUMN spoiler INTEGER NOT NULL DEFAULT 0 CHECK(spoiler IN (0,1));
CREATE TABLE feed_polls (
  post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  payload TEXT NOT NULL,
  multiple INTEGER NOT NULL CHECK(multiple IN (0,1)),
  closes_at INTEGER NOT NULL
) STRICT;
CREATE TABLE feed_poll_votes (
  post_id INTEGER NOT NULL REFERENCES feed_polls(post_id) ON DELETE CASCADE,
  member_number INTEGER NOT NULL REFERENCES users(member_number),
  option_id INTEGER NOT NULL CHECK(option_id BETWEEN 1 AND 6),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(post_id,member_number,option_id)
) STRICT;
