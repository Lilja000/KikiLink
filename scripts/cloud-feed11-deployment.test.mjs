// Copied into the generated API package and executed by the offline candidate
// gate. All mutations below are confined to a new disposable temp directory.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import reactions from "../shared/feed-reactions.json" with { type: "json" };
import {
  probeDatabase, checkpointDatabase, migrateDatabase, restoreCheckpoint, discardCheckpoint,
} from "../ops/private-community-upgrade.mjs";

async function schema9(t) {
  const directory = await mkdtemp(join(tmpdir(), "feed11-deployment-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "disposable.sqlite");
  const raw = new DatabaseSync(path);
  raw.exec("PRAGMA foreign_keys=ON; CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL,applied_at INTEGER NOT NULL) STRICT");
  const root = new URL("../migrations/", import.meta.url);
  const names = (await readdir(root)).filter(name => /^00[1-9]_.*\.sql$/.test(name)).sort();
  assert.equal(names.length, 9);
  for (const name of names) {
    const sql = await readFile(new URL(name, root), "utf8");
    raw.exec(sql);
    raw.prepare("INSERT INTO schema_migrations VALUES(?,?,123)").run(name, createHash("sha256").update(sql).digest("hex"));
  }
  raw.exec(`INSERT INTO users VALUES(101,123,0);
    INSERT INTO profiles VALUES(101,'opaque-profile-canary',7,1,123);
    INSERT INTO posts(id,author,payload,created_at,updated_at) VALUES(48,101,'opaque-post-canary',123,456);
    INSERT INTO comments(id,post_id,author,payload,created_at,updated_at) VALUES(55,48,101,'opaque-comment-canary',123,456);
    INSERT INTO reactions VALUES('post',48,101,'heart',789),('comment',55,101,'support',0);
    INSERT INTO feed_features VALUES(48,123,456);`);
  raw.close();
  return path;
}

function state(path) {
  const raw = new DatabaseSync(path, { readOnly: true });
  try {
    return {
      schema: raw.prepare("SELECT count(*) AS n FROM schema_migrations").get().n,
      profile: raw.prepare("SELECT payload,revision FROM profiles").get(),
      comment: raw.prepare("SELECT payload,revision FROM comments").get(),
      reactions: raw.prepare("SELECT target_type,target_id,member_number,reaction,created_at FROM reactions ORDER BY target_type").all(),
      feature: raw.prepare("SELECT post_id,featured_at,featured_until FROM feed_features").get(),
    };
  } finally { raw.close(); }
}

test("Deployment probe preserves schema9; direct upgrade to11 and offline recovery preserve both reaction targets and Feed data", async t => {
  const path = await schema9(t), before = state(path);
  const probe = await probeDatabase(path);
  assert.equal(probe.schemaVersion, 11);
  assert.equal(probe.migrationIdempotent, true);
  assert.equal(probe.dataPreserved, true);
  assert.deepEqual(state(path), before);
  const checkpoint = await checkpointDatabase(path);
  assert.equal(checkpoint.schemaVersion, 9);
  await assert.rejects(migrateDatabase(path, "0".repeat(64)), /checkpoint_hash_mismatch/);
  assert.deepEqual(state(path), before);
  await migrateDatabase(path, checkpoint.checkpointHash);
  assert.deepEqual(state(path), { ...before, schema: 11 });
  const upgraded = new DatabaseSync(path);
  try {
    upgraded.exec("PRAGMA foreign_keys=ON; BEGIN");
    assert.equal(reactions.length, 20);
    for (const { id } of reactions) {
      for (const type of ["post", "comment"]) {
        upgraded.prepare("UPDATE reactions SET reaction=? WHERE target_type=?").run(id, type);
        assert.equal(upgraded.prepare("SELECT reaction FROM reactions WHERE target_type=?").get(type).reaction, id);
      }
    }
    assert.throws(() => upgraded.prepare("UPDATE reactions SET reaction='arbitrary'").run(), /CHECK/);
    assert.deepEqual(upgraded.prepare("PRAGMA index_info('reactions_recent')").all().map(row => row.name),
      ["target_type", "created_at", "target_id"]);
    assert.deepEqual(upgraded.prepare("PRAGMA foreign_key_check").all(), []);
    upgraded.exec("ROLLBACK");
  } finally { upgraded.close(); }
  assert.deepEqual(state(path), { ...before, schema: 11 });
  await assert.rejects(checkpointDatabase(path), /checkpoint_collision/);
  await restoreCheckpoint(path, checkpoint.checkpointHash);
  assert.deepEqual(state(path), before);
  await migrateDatabase(path, checkpoint.checkpointHash);
  await discardCheckpoint(path, checkpoint.checkpointHash);
  await assert.rejects(restoreCheckpoint(path, checkpoint.checkpointHash), /ENOENT/);
});

test("Deployment refuses to migrate a database modified after the offline checkpoint", async t => {
  const path = await schema9(t), checkpoint = await checkpointDatabase(path);
  const raw = new DatabaseSync(path);
  raw.prepare("UPDATE reactions SET created_at=created_at+1").run();
  raw.close();
  const changed = state(path);
  await assert.rejects(migrateDatabase(path, checkpoint.checkpointHash), /live_database_differs_from_checkpoint/);
  assert.deepEqual(state(path), changed);
});

test("Deployment refuses an unknown migration history without modifying the source", async t => {
  const path = await schema9(t);
  const raw = new DatabaseSync(path);
  raw.prepare("UPDATE schema_migrations SET hash=? WHERE name='009_feed_highlights.sql'").run("f".repeat(64));
  raw.close();
  const before = await readFile(path);
  await assert.rejects(probeDatabase(path), /migration_checksum_mismatch/);
  assert.deepEqual(await readFile(path), before);
});
