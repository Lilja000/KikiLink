-- Preserve existing reactions while extending the common emoji vocabulary.
CREATE TABLE reactions_next (
  target_type TEXT NOT NULL CHECK(target_type IN ('post','comment')),
  target_id INTEGER NOT NULL,
  member_number INTEGER NOT NULL REFERENCES users(member_number),
  reaction TEXT NOT NULL CHECK(reaction IN ('heart','like','laugh','support','dislike','wow','sad')),
  PRIMARY KEY(target_type,target_id,member_number)
) STRICT;
INSERT INTO reactions_next SELECT * FROM reactions;
DROP TABLE reactions;
ALTER TABLE reactions_next RENAME TO reactions;
