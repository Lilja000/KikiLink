-- Pin references use the existing message encryption, retention and membership boundary.
-- No duplicate message body is retained. A group has one compact shared pin.
CREATE TABLE group_pins (
  group_id TEXT PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  message_id TEXT,
  revision INTEGER NOT NULL CHECK(revision > 0)
) STRICT;
