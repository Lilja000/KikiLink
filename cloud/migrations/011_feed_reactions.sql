-- Extend the Feed vocabulary without changing existing votes or their dates.
CREATE TABLE reactions_next (
  target_type TEXT NOT NULL CHECK(target_type IN ('post','comment')),
  target_id INTEGER NOT NULL,
  member_number INTEGER NOT NULL REFERENCES users(member_number),
  reaction TEXT NOT NULL CHECK(reaction IN ('heart','like','laugh','support','dislike','wow','sad','fire','sparkles','celebrate','eyes','thinking','hug','kiss','smirk','cry','angry','skull','clap','star')),
  created_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(target_type,target_id,member_number)
) STRICT;
INSERT INTO reactions_next(target_type,target_id,member_number,reaction,created_at)
  SELECT target_type,target_id,member_number,reaction,created_at FROM reactions;
DROP TABLE reactions;
ALTER TABLE reactions_next RENAME TO reactions;
CREATE INDEX reactions_recent ON reactions(target_type,created_at,target_id);
