CREATE TABLE users (
  member_number INTEGER PRIMARY KEY CHECK(member_number BETWEEN 1 AND 9007199254740991),
  created_at INTEGER NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0 CHECK(disabled IN (0,1))
) STRICT;
CREATE TABLE auth_challenges (
  id TEXT PRIMARY KEY,
  member_number INTEGER NOT NULL,
  origin TEXT NOT NULL,
  proof_hash TEXT NOT NULL UNIQUE,
  exchange_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  verified_at INTEGER
) STRICT;
CREATE INDEX challenges_expiry ON auth_challenges(expires_at);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  member_number INTEGER NOT NULL REFERENCES users(member_number),
  origin TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT;
CREATE INDEX sessions_user ON sessions(member_number, expires_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL) STRICT;
CREATE INDEX rate_expiry ON rate_limits(expires_at);
CREATE TABLE storage_assets (
  id TEXT PRIMARY KEY,
  owner INTEGER NOT NULL REFERENCES users(member_number),
  kind TEXT NOT NULL CHECK(kind IN ('avatar','banner','feed')),
  object_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK(state IN ('pending','ready','deleting')),
  bytes INTEGER NOT NULL CHECK(bytes >= 0),
  sha256 TEXT,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT;
CREATE INDEX storage_owner ON storage_assets(owner, state);
CREATE INDEX storage_expiry ON storage_assets(expires_at);
CREATE TABLE profiles (
  member_number INTEGER PRIMARY KEY REFERENCES users(member_number),
  payload TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  visible INTEGER NOT NULL DEFAULT 1 CHECK(visible IN (0,1)),
  updated_at INTEGER NOT NULL
) STRICT;
CREATE TABLE profile_media (
  member_number INTEGER NOT NULL REFERENCES profiles(member_number) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK(slot IN ('avatar','banner')),
  asset_id TEXT NOT NULL UNIQUE REFERENCES storage_assets(id),
  PRIMARY KEY(member_number,slot)
) STRICT;
CREATE TABLE blocks (
  owner INTEGER NOT NULL REFERENCES users(member_number),
  target INTEGER NOT NULL REFERENCES users(member_number),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(owner,target), CHECK(owner<>target)
) STRICT;
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  owner INTEGER NOT NULL REFERENCES users(member_number),
  title TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  legacy_id TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(owner,legacy_id)
) STRICT;
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL UNIQUE REFERENCES groups(id) ON DELETE CASCADE,
  membership_version INTEGER NOT NULL DEFAULT 1,
  key_version INTEGER NOT NULL DEFAULT 1,
  next_sequence INTEGER NOT NULL DEFAULT 1
) STRICT;
CREATE TABLE group_members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_number INTEGER NOT NULL REFERENCES users(member_number),
  role TEXT NOT NULL CHECK(role IN ('owner','admin','member')),
  status TEXT NOT NULL CHECK(status IN ('invited','active','removed')),
  joined_sequence INTEGER NOT NULL DEFAULT 1,
  invited_at INTEGER NOT NULL,
  PRIMARY KEY(group_id,member_number)
) STRICT;
CREATE INDEX group_members_lookup ON group_members(member_number,status);
CREATE TABLE conversation_keys (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  wrapped_key TEXT NOT NULL,
  PRIMARY KEY(conversation_id,version)
) STRICT;
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender INTEGER NOT NULL REFERENCES users(member_number),
  sequence INTEGER NOT NULL,
  client_id TEXT NOT NULL,
  membership_version INTEGER NOT NULL,
  key_version INTEGER NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  encryption TEXT NOT NULL CHECK(encryption='server-aes-256-gcm'),
  envelope TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  UNIQUE(conversation_id,sequence),
  UNIQUE(conversation_id,sender,client_id)
) STRICT;
CREATE INDEX messages_retention ON messages(created_at);
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author INTEGER NOT NULL REFERENCES users(member_number),
  client_id TEXT,
  request_hash TEXT,
  payload TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  UNIQUE(author,client_id)
) STRICT;
CREATE INDEX posts_author ON posts(author,deleted_at);
CREATE INDEX posts_feed ON posts(deleted_at,id DESC);
CREATE TABLE feed_media (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL UNIQUE REFERENCES storage_assets(id),
  position INTEGER NOT NULL,
  PRIMARY KEY(post_id,position)
) STRICT;
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author INTEGER NOT NULL REFERENCES users(member_number),
  payload TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
) STRICT;
CREATE INDEX comments_post ON comments(post_id,id);
CREATE TABLE reactions (
  target_type TEXT NOT NULL CHECK(target_type IN ('post','comment')),
  target_id INTEGER NOT NULL,
  member_number INTEGER NOT NULL REFERENCES users(member_number),
  reaction TEXT NOT NULL CHECK(reaction IN ('heart','like','laugh','support')),
  PRIMARY KEY(target_type,target_id,member_number)
) STRICT;
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter INTEGER NOT NULL REFERENCES users(member_number),
  target_type TEXT NOT NULL CHECK(target_type IN ('profile','post','comment','group','message')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')),
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
) STRICT;
CREATE INDEX reports_queue ON reports(status,id);
CREATE TABLE moderation_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  moderator INTEGER NOT NULL REFERENCES users(member_number),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE presence (
  member_number INTEGER PRIMARY KEY REFERENCES users(member_number),
  status TEXT NOT NULL CHECK(status IN ('online','idle','dnd')),
  expires_at INTEGER NOT NULL
) STRICT;
