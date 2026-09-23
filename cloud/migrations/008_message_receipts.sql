-- Explicit client acknowledgements. Saving a message is never treated as delivery.
CREATE TABLE message_receipts (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient INTEGER NOT NULL REFERENCES users(member_number),
  delivered_at INTEGER NOT NULL,
  read_at INTEGER,
  PRIMARY KEY(message_id,recipient)
) STRICT;
CREATE INDEX message_receipts_recipient ON message_receipts(recipient,message_id);
