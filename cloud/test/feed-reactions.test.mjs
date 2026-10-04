import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Database } from "../src/db.mjs";
import reactions from "../shared/feed-reactions.json" with { type: "json" };
import { fixture } from "./helpers.mjs";

test("Schema 011 preserves both reaction targets, original dates and the Featured index", t => {
  const dir = mkdtempSync(join(tmpdir(), "kikilink-reactions-upgrade-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "schema10.sqlite"), raw = new DatabaseSync(path);
  const migrationDir = new URL("../migrations/", import.meta.url);
  raw.exec("PRAGMA foreign_keys=ON; CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL,applied_at INTEGER NOT NULL) STRICT");
  for (const name of readdirSync(migrationDir).filter(name => /^\d{3}_.*\.sql$/.test(name) && name < "011_").sort()) {
    const sql = readFileSync(new URL(name, migrationDir), "utf8");
    raw.exec(sql);
    raw.prepare("INSERT INTO schema_migrations VALUES(?,?,?)").run(name, createHash("sha256").update(sql).digest("hex"), 123);
  }
  raw.exec("INSERT INTO users VALUES(101,123,0),(202,123,0)");
  raw.exec("INSERT INTO reactions VALUES('post',5,101,'heart',0),('comment',6,202,'support',1791100000123)");
  const original = raw.prepare("SELECT * FROM reactions ORDER BY target_type").all();
  raw.close();
  assert.throws(() => new Database(path), /explicit migration/);
  const db = new Database(path, { migrate: true });
  try {
    assert.deepEqual(db.all("SELECT * FROM reactions ORDER BY target_type"), original);
    assert.deepEqual(db.all("PRAGMA index_info('reactions_recent')").map(column => column.name), ["target_type", "created_at", "target_id"]);
    assert.deepEqual(db.all("PRAGMA foreign_key_check"), []);
    assert.throws(() => db.run("INSERT INTO reactions VALUES('post',5,101,'fire',123)"), /UNIQUE/);
    assert.throws(() => db.run("INSERT INTO reactions VALUES('post',6,101,'arbitrary',123)"), /CHECK/);
    db.migrate();
    assert.equal(db.get("SELECT COUNT(*) AS count FROM schema_migrations").count, 11);
    assert.deepEqual(db.all("SELECT * FROM reactions ORDER BY target_type"), original);
  } finally { db.close(); }
});

test("The advertised Feed catalog accepts every reaction on posts and comments with one choice per account", async t => {
  const f = await fixture(t); await f.login(101); await f.login(202);
  const p = f.feed.create(101, { text: "A shared reaction vocabulary", mediaIds: [] });
  const c = f.feed.comment(202, p.id, "Same reactions on replies");
  const ids = reactions.map(reaction => reaction.id);
  assert.equal(new Set(ids).size, 20);
  assert.deepEqual((await f.ok("GET", "/v1/me")).features.reactions, ids);
  for (const reaction of ids) {
    for (const [type, id, actor] of [["post", p.id, 202], ["comment", c.id, 101]]) {
      const result = await f.ok("PUT", `/v1/reactions/${type}/${id}`, { reaction }, actor);
      assert.deepEqual(result, { mine: reaction, counts: [{ reaction, count: 1 }] });
    }
  }
  assert.equal((await f.ok("PUT", `/v1/reactions/post/${p.id}`, { reaction: null }, 202)).mine, null);
  assert.deepEqual((await f.ok("PUT", `/v1/reactions/comment/${c.id}`, { reaction: null }, 101)).counts, []);
  assert.equal((await f.request("PUT", `/v1/reactions/post/${p.id}`, { reaction: "arbitrary" }, 202)).statusCode, 400);
});

test("Expanded reactions keep blocked and disabled accounts out of counts and reactor lists", async t => {
  const f = await fixture(t);
  for (const member of [101, 202, 303, 404]) await f.login(member);
  const p = f.feed.create(101, { text: "Private reaction details", mediaIds: [] });
  const c = f.feed.comment(101, p.id, "Private reply reactions");
  for (const [type, id] of [["post", p.id], ["comment", c.id]]) {
    await f.ok("PUT", `/v1/reactions/${type}/${id}`, { reaction: "fire" }, 202);
    await f.ok("PUT", `/v1/reactions/${type}/${id}`, { reaction: "fire" }, 303);
    await f.ok("PUT", `/v1/reactions/${type}/${id}`, { reaction: "star" }, 404);
  }
  await f.ok("PUT", "/v1/blocks/303", {}, 101, 204);
  f.db.run("UPDATE users SET disabled=1 WHERE member_number=404");
  for (const [type, id] of [["post", p.id], ["comment", c.id]]) {
    const result = await f.ok("GET", type === "post" ? `/v1/feed/${id}` : `/v1/comments/${id}`);
    assert.deepEqual(result.reactions, { mine: null, counts: [{ reaction: "fire", count: 1 }] });
    const details = await f.ok("GET", `/v1/reactions/${type}/${id}`);
    assert.deepEqual(details.items.map(item => [item.memberNumber, item.reaction]), [[202, "fire"]]);
    assert.equal((await f.request("PUT", `/v1/reactions/${type}/${id}`, { reaction: "sparkles" }, 303)).statusCode, 404);
  }
});
