// Copied into the generated API package and executed by the offline candidate
// gate. All mutations below are confined to a new disposable temp directory.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  probeDatabase, checkpointDatabase, migrateDatabase, restoreCheckpoint, discardCheckpoint,
} from "../ops/private-community-upgrade.mjs";

async function schema9(t) {
  const directory = await mkdtemp(join(tmpdir(), "feed10-deployment-"));
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
    INSERT INTO reactions VALUES('post',48,101,'heart',789);
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
      reaction: raw.prepare("SELECT reaction,created_at FROM reactions").get(),
      feature: raw.prepare("SELECT post_id,featured_at,featured_until FROM feed_features").get(),
    };
  } finally { raw.close(); }
}

test("Deployment probe preserves the live schema9 database; checkpoint, migration and offline recovery preserve existing Feed data", async t => {
  const path = await schema9(t), before = state(path);
  const probe = await probeDatabase(path);
  assert.equal(probe.schemaVersion, 10);
  assert.equal(probe.migrationIdempotent, true);
  assert.equal(probe.dataPreserved, true);
  assert.deepEqual(state(path), before);
  const checkpoint = await checkpointDatabase(path);
  assert.equal(checkpoint.schemaVersion, 9);
  await assert.rejects(migrateDatabase(path, "0".repeat(64)), /checkpoint_hash_mismatch/);
  assert.deepEqual(state(path), before);
  await migrateDatabase(path, checkpoint.checkpointHash);
  assert.deepEqual(state(path), { ...before, schema: 10 });
  await assert.rejects(checkpointDatabase(path), /checkpoint_collision/);
  await restoreCheckpoint(path, checkpoint.checkpointHash);
  assert.deepEqual(state(path), before);
  await migrateDatabase(path, checkpoint.checkpointHash);
  await discardCheckpoint(path, checkpoint.checkpointHash);
  await assert.rejects(restoreCheckpoint(path, checkpoint.checkpointHash), /ENOENT/);
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
