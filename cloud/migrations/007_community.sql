-- All additions are account-scoped. No existing profile or message is rewritten.
CREATE TABLE social_capabilities (
  member_number INTEGER PRIMARY KEY REFERENCES users(member_number),
  friend_requests INTEGER NOT NULL DEFAULT 0,
  direct_messages INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE TABLE relationships (
  low_member INTEGER NOT NULL REFERENCES users(member_number),
  high_member INTEGER NOT NULL REFERENCES users(member_number),
  sender INTEGER NOT NULL REFERENCES users(member_number),
  state TEXT NOT NULL CHECK(state IN ('pending','accepted','declined','cancelled','revoked')),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(low_member,high_member), CHECK(low_member<high_member)
) STRICT;
CREATE INDEX relationships_recipient ON relationships(high_member,state);
CREATE TABLE relationship_grants (
  owner INTEGER NOT NULL REFERENCES users(member_number),
  peer INTEGER NOT NULL REFERENCES users(member_number),
  updated_at INTEGER NOT NULL, PRIMARY KEY(owner,peer), CHECK(owner<>peer)
) STRICT;
CREATE TABLE mailbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient INTEGER NOT NULL REFERENCES users(member_number),
  actor INTEGER REFERENCES users(member_number),
  kind TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  read_at INTEGER,
  UNIQUE(recipient,dedupe_key)
) STRICT;
CREATE INDEX mailbox_recipient ON mailbox(recipient,id DESC);
CREATE TABLE social_cursors (
  owner INTEGER NOT NULL REFERENCES users(member_number),
  scope TEXT NOT NULL,
  cursor INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(owner,scope)
) STRICT;
CREATE TABLE direct_messages (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  sender INTEGER NOT NULL REFERENCES users(member_number),
  recipient INTEGER NOT NULL REFERENCES users(member_number),
  payload TEXT,
  sent_at INTEGER NOT NULL,
  stored_at INTEGER NOT NULL,
  delivered_at INTEGER,
  expires_at INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'sent' CHECK(state IN ('sent','delivered','revoked','expired')),
  UNIQUE(sender,client_id), CHECK(sender<>recipient)
) STRICT;
CREATE INDEX direct_inbox ON direct_messages(recipient,sequence);
CREATE INDEX direct_outbox ON direct_messages(sender,sequence);
CREATE TABLE direct_receipts (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  sender INTEGER NOT NULL REFERENCES users(member_number),
  message_id TEXT NOT NULL,
  state TEXT NOT NULL,
  occurred_at INTEGER NOT NULL
) STRICT;
CREATE INDEX direct_receipts_sender ON direct_receipts(sender,sequence);
CREATE TABLE interest_preferences (
  owner INTEGER PRIMARY KEY REFERENCES users(member_number),
  mode TEXT NOT NULL DEFAULT 'private' CHECK(mode IN ('private','score','friends','public')),
  ratings TEXT NOT NULL,
  catalog_version TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
) STRICT;
