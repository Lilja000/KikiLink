import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fixture, group } from "./helpers.mjs";
import { Database } from "../src/db.mjs";
import { createApp } from "../src/app.mjs";
import { encryptedBackup, restoreBackup } from "../ops/backup.mjs";
import { DatabaseSync, backup as sqliteBackup } from "node:sqlite";
import { createHash } from "node:crypto";
import { chmod } from "node:fs/promises";

test("Schema-1 data requires an explicit upgrade and its old backup restores into a new current-schema candidate", async (t) => {
  const f = await fixture(t);
  const path = join(f.dir, "legacy.sqlite"),
    raw = new DatabaseSync(path);
  const sql = await readFile(
    new URL("../migrations/001_foundation.sql", import.meta.url),
    "utf8",
  );
  raw.exec(sql);
  raw.exec(
    "CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL,applied_at INTEGER NOT NULL) STRICT",
  );
  raw
    .prepare("INSERT INTO schema_migrations VALUES(?,?,?)")
    .run(
      "001_foundation.sql",
      createHash("sha256").update(sql).digest("hex"),
      Date.now(),
    );
  raw
    .prepare("INSERT INTO users(member_number,created_at) VALUES(?,?)")
    .run(101, Date.now());
  raw
    .prepare("INSERT INTO sessions VALUES(?,?,?,?,?)")
    .run("f".repeat(64), 101, f.origin, Date.now(), Date.now() + 3600000);
  const backup = await encryptedBackup(
    {
      backup: async (target) => {
        await sqliteBackup(raw, target);
        await chmod(target, 0o600);
      },
    },
    f.keys,
    f.dir,
  );
  raw.close();
  t.after(backup.dispose);
  assert.throws(() => new Database(path), /Schema mismatch/);
  const upgraded = new Database(path, { migrate: true });
  try {
    assert.equal(upgraded.get("SELECT COUNT(*) AS n FROM users").n, 1);
    assert.equal(
      upgraded.get("SELECT device_id FROM sessions").device_id,
      null,
    );
  } finally {
    upgraded.close();
  }
  const target = join(f.dir, "legacy-restored.sqlite");
  await restoreBackup(
    backup.path,
    f.keys,
    target,
    f.config.limits.maxDatabaseBytes,
  );
  const restored = new Database(target);
  try {
    assert.equal(
      restored.get("SELECT COUNT(*) AS n FROM schema_migrations").n,
      Database.prototype.migrations.call({}).length,
    );
    assert.equal(restored.get("SELECT COUNT(*) AS n FROM users").n, 1);
    assert.equal(restored.get("SELECT COUNT(*) AS n FROM sessions").n, 0);
  } finally {
    restored.close();
  }
});

test("Database/service restart preserves profile, groups, membership and auth revocation", async (t) => {
  const f = await fixture(t);
  const g = await group(f);
  await f.ok("PUT", "/v1/profiles/me", {
    displayName: "Persistent Kiki",
    revision: 0,
  });
  await f.ok("POST", "/v1/auth/logout", {}, 202, 204);
  await f.app.close();
  f.db.close();
  const db = new Database(f.path);
  const reboot = createApp({
    db,
    keys: f.keys,
    storage: f.storage,
    config: f.config,
  });
  t.after(async () => {
    await reboot.app.close();
    db.close();
  });
  const headers = {
    origin: f.origin,
    authorization: `Bearer ${f.sessions.get(101)}`,
  };
  const response = await reboot.app.inject({
    method: "GET",
    url: `/v1/groups/${g.id}`,
    headers,
  });
  assert.equal(response.statusCode, 200);
  assert.equal(
    response.json().members.filter((x) => x.status === "active").length,
    3,
  );
  const profile = await reboot.app.inject({
    method: "GET",
    url: "/v1/profiles/101",
    headers,
  });
  assert.equal(profile.json().displayName, "Persistent Kiki");
  const revoked = await reboot.app.inject({
    method: "GET",
    url: "/v1/me",
    headers: { ...headers, authorization: `Bearer ${f.sessions.get(202)}` },
  });
  assert.equal(revoked.statusCode, 401);
});
test("Encrypted backup and restored candidate retain content but invalidate sessions; tampering never activates", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  await f.ok("PUT", "/v1/profiles/me", {
    displayName: "backup canary",
    revision: 0,
  });
  const backup = await encryptedBackup(f.db, f.keys, f.dir);
  t.after(backup.dispose);
  const bytes = await readFile(backup.path);
  assert.ok(!bytes.includes(Buffer.from("SQLite format")));
  assert.ok(!bytes.includes(Buffer.from("backup canary")));
  const target = join(f.dir, "restored.sqlite");
  await restoreBackup(
    backup.path,
    f.keys,
    target,
    f.config.limits.maxDatabaseBytes,
  );
  const restored = new Database(target);
  try {
    assert.equal(restored.healthy(), true);
    assert.equal(restored.get("SELECT COUNT(*) AS n FROM profiles").n, 1);
    assert.equal(restored.get("SELECT COUNT(*) AS n FROM sessions").n, 0);
  } finally {
    restored.close();
  }
  await assert.rejects(
    () =>
      restoreBackup(
        backup.path,
        f.keys,
        target,
        f.config.limits.maxDatabaseBytes,
      ),
    /exists/,
  );
  bytes[bytes.length - 5] ^= 1;
  const corrupt = join(f.dir, "corrupt.klbackup");
  await writeFile(corrupt, bytes);
  await assert.rejects(() =>
    restoreBackup(
      corrupt,
      f.keys,
      join(f.dir, "must-not-exist.sqlite"),
      f.config.limits.maxDatabaseBytes,
    ),
  );
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM sessions").n, 1);
});
test("Checksummed migrations detect drift and roll back failed migrations atomically", async (t) => {
  const f = await fixture(t);
  assert.equal(f.db.get("PRAGMA user_version").user_version, 0);
  f.db.run("UPDATE schema_migrations SET hash='tampered'");
  assert.throws(() => new Database(f.path), /Schema mismatch/);
  assert.throws(() =>
    f.db.transaction(() => {
      f.db.run("INSERT INTO users VALUES(707,?,0)", Date.now());
      throw new Error("injected failure");
    }),
  );
  assert.equal(
    f.db.get("SELECT 1 FROM users WHERE member_number=707"),
    undefined,
  );
});
test("Real HTTP SSE sends invalidations and expires revoked sessions; no message payload is broadcast", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  await f.login(202);
  const address = await f.app.listen({ host: "127.0.0.1", port: 0 });
  const controller = new AbortController();
  t.after(() => controller.abort());
  const response = await fetch(address + "/v1/events", {
    headers: {
      origin: f.origin,
      authorization: `Bearer ${f.sessions.get(202)}`,
    },
    signal: controller.signal,
  });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const initial = await reader.read();
  assert.match(Buffer.from(initial.value).toString(), /event: ready/);
  await f.ok(
    "POST",
    "/v1/feed",
    { text: "SSE must not broadcast this message" },
    101,
    201,
  );
  const update = await reader.read();
  const body = Buffer.from(update.value).toString();
  assert.match(body, /event: feed/);
  assert.ok(!body.includes("SSE must not"));
  await f.ok("POST", "/v1/auth/logout", {}, 202, 204);
  assert.equal((await reader.read()).done, true);
});

test("Abrupt SQLite writer SIGKILL recovers committed WAL state and discards the open transaction", async (t) => {
  const { fork } = await import("node:child_process");
  const { once } = await import("node:events");
  const f = await fixture(t);
  const worker = join(f.dir, "crash-writer.mjs");
  await writeFile(
    worker,
    `import {Database} from ${JSON.stringify(new URL("../src/db.mjs", import.meta.url).href)};\nconst db=new Database(process.argv[2]);db.run('INSERT INTO users VALUES(707,?,0)',Date.now());db.raw.exec('BEGIN IMMEDIATE');db.run('INSERT INTO users VALUES(808,?,0)',Date.now());process.send('ready');setInterval(()=>{},1000);`,
  );
  const child = fork(worker, [f.path], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  t.after(() => child.kill("SIGKILL"));
  await once(child, "message", { signal: AbortSignal.timeout(5000) });
  const exited = once(child, "exit");
  child.kill("SIGKILL");
  await exited;
  const reboot = new Database(f.path);
  try {
    assert.equal(reboot.healthy(), true);
    assert.equal(
      reboot.get("SELECT member_number FROM users WHERE member_number=707")
        .member_number,
      707,
    );
    assert.equal(
      reboot.get("SELECT 1 FROM users WHERE member_number=808"),
      undefined,
    );
  } finally {
    reboot.close();
  }
});
