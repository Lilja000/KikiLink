CREATE TABLE auth_devices (
  id TEXT PRIMARY KEY,
  member_number INTEGER NOT NULL REFERENCES users(member_number),
  origin TEXT NOT NULL,
  public_key TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE(member_number, origin, key_hash)
) STRICT;
CREATE INDEX devices_expiry ON auth_devices(expires_at);
ALTER TABLE auth_challenges ADD COLUMN device_public_key TEXT;
ALTER TABLE sessions ADD COLUMN device_id TEXT REFERENCES auth_devices(id) ON DELETE CASCADE;
CREATE INDEX sessions_device ON sessions(device_id);
CREATE TABLE device_challenges (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES auth_devices(id) ON DELETE CASCADE,
  nonce_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT;
CREATE INDEX device_challenges_expiry ON device_challenges(expires_at);
