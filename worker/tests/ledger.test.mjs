import assert from "node:assert/strict";
import test from "node:test";

import {
  GlobalUploadLedger,
  UploadSessionLedger,
  admitSessionRecord,
  releaseSessionLease,
} from "../src/ledger.ts";

const NOW = 1_800_000_000_000;

test("atomically admits two concurrent uploads and counts a rejected third attempt", () => {
  let record = session();
  const first = admitSessionRecord(record, input("a", 1024));
  assert.equal(first.ok, true);
  record = first.record;
  const second = admitSessionRecord(record, input("b", 1024));
  assert.equal(second.ok, true);
  record = second.record;

  const third = admitSessionRecord(record, input("c", 1024));
  assert.equal(third.ok, false);
  assert.equal(third.error, "concurrency_quota");
  assert.equal(third.record.attempts, 3);
  assert.equal(third.record.reservedBytes, 2048);
});

test("release frees concurrency but never refunds request or byte quota", () => {
  const admitted = admitSessionRecord(session(), input("a", 4096));
  assert.equal(admitted.ok, true);
  const released = releaseSessionLease(admitted.record, token("a"), NOW + 1);
  assert.equal(released.leases.length, 0);
  assert.equal(released.attempts, 1);
  assert.equal(released.reservedBytes, 4096);

  const next = admitSessionRecord(released, { ...input("b", 1024), now: NOW + 2 });
  assert.equal(next.ok, true);
  assert.equal(next.record.attempts, 2);
  assert.equal(next.record.reservedBytes, 5120);
});

test("enforces cumulative bytes and preserves failure accounting", () => {
  const record = {
    ...session(),
    attempts: 4,
    reservedBytes: 159 * 1024 * 1024,
  };
  const denied = admitSessionRecord(record, input("a", 2 * 1024 * 1024));
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "byte_quota");
  assert.equal(denied.record.attempts, 5);
  assert.equal(denied.record.reservedBytes, 159 * 1024 * 1024);
});

test("enforces the attempt cap and rejects expired or mismatched sessions", () => {
  const capped = admitSessionRecord({ ...session(), attempts: 12 }, input("a", 1));
  assert.equal(capped.ok, false);
  assert.equal(capped.error, "attempt_quota");

  const expired = admitSessionRecord({ ...session(), expiresAt: NOW }, input("a", 1));
  assert.equal(expired.ok, false);
  assert.equal(expired.status, 401);

  const mismatch = admitSessionRecord(session(), { ...input("a", 1), ipHash: "other" });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.error, "session_mismatch");
});

test("prunes abandoned six-minute leases before concurrency admission", () => {
  const record = {
    ...session(),
    leases: [
      { id: token("x"), expiresAt: NOW - 1 },
      { id: token("y"), expiresAt: NOW + 10_000 },
    ],
  };
  const admitted = admitSessionRecord(record, input("z", 1024));
  assert.equal(admitted.ok, true);
  assert.deepEqual(
    admitted.record.leases.map((lease) => lease.id),
    [token("y"), token("z")],
  );
});

test("stores multiple tokens in one ledger and removes only expired session rows", async () => {
  const database = createSessionDatabase();
  const ledger = new UploadSessionLedger(database.state, {});
  const originalNow = Date.now;
  let now = NOW;
  Date.now = () => now;
  try {
    const firstExpiry = NOW + 600_000;
    const secondExpiry = NOW + 900_000;
    assert.equal((await createStoredSession(ledger, hash("a"), firstExpiry)).status, 201);
    assert.equal((await createStoredSession(ledger, hash("b"), secondExpiry)).status, 201);
    assert.equal(database.rows.size, 2);
    assert.equal(database.alarmAt, firstExpiry + 60_000);

    const unknown = await ledger.fetch(
      new Request("https://ledger.internal/admit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input("late", 1024), tokenHash: hash("z") }),
      }),
    );
    assert.equal(unknown.status, 401);
    assert.equal(database.rows.size, 2);

    now = firstExpiry + 60_000;
    database.alarmAt = null;
    await ledger.alarm();
    assert.equal(database.rows.has(hash("a")), false);
    assert.equal(database.rows.has(hash("b")), true);
    assert.equal(database.alarmAt, secondExpiry + 60_000);

    now = secondExpiry + 60_000;
    database.alarmAt = null;
    await ledger.alarm();
    assert.equal(database.rows.size, 0);
    assert.equal(database.alarmAt, null);
  } finally {
    Date.now = originalNow;
  }
});

test("global quota derives UTC day inside the ledger and never rolls back to an older day", async () => {
  const database = createGlobalDatabase();
  const ledger = new GlobalUploadLedger(database.state, {});
  const originalNow = Date.now;
  const firstDay = Date.UTC(2026, 8, 2, 23, 59, 59);
  const secondDay = Date.UTC(2026, 8, 3, 0, 0, 1);
  let requestIndex = 0;
  const request = () => new Request("https://ledger.internal/admit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bytes: 1,
      maxAttempts: 1,
      maxBytes: 1024,
      maxConcurrent: 10,
      leaseId: token(String(++requestIndex)),
      now: Date.now(),
    }),
  });
  try {
    Date.now = () => firstDay;
    assert.equal((await ledger.fetch(request())).status, 200);
    assert.equal(database.row.utc_day, "2026-09-02");

    Date.now = () => secondDay;
    assert.equal((await ledger.fetch(request())).status, 200);
    assert.equal(database.row.utc_day, "2026-09-03");

    Date.now = () => firstDay;
    assert.equal((await ledger.fetch(request())).status, 429);
    assert.equal(database.row.utc_day, "2026-09-03");
  } finally {
    Date.now = originalNow;
  }
});

test("global quota bounds aggregate in-flight uploads and releases leases", async () => {
  const database = createGlobalDatabase();
  const ledger = new GlobalUploadLedger(database.state, {});
  const body = (seed) => ({
    bytes: 1024,
    maxAttempts: 10,
    maxBytes: 10_000,
    maxConcurrent: 1,
    leaseId: token(seed),
    now: NOW,
  });
  const request = (path, value) => new Request(`https://ledger.internal${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });

  assert.equal((await ledger.fetch(request("/admit", body("a")))).status, 200);
  assert.equal((await ledger.fetch(request("/admit", body("b")))).status, 429);
  assert.equal(database.row.attempts, 1);
  assert.equal(database.row.reserved_bytes, 1024);

  assert.equal((await ledger.fetch(request("/release", {
    leaseId: token("a"),
    now: NOW + 1,
  }))).status, 200);
  assert.equal((await ledger.fetch(request("/admit", {
    ...body("c"),
    now: NOW + 2,
  }))).status, 200);
  assert.equal(database.row.reserved_bytes, 2048);
});

async function createStoredSession(ledger, tokenHash, expiresAt) {
  return ledger.fetch(
    new Request("https://ledger.internal/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenHash,
        origin: "https://www.bondageprojects.com",
        ipHash: "daily-hmac",
        expiresAt,
      }),
    }),
  );
}

function session() {
  return {
    origin: "https://www.bondageprojects.com",
    ipHash: "ip-hash",
    expiresAt: NOW + 600_000,
    attempts: 0,
    reservedBytes: 0,
    leases: [],
  };
}

function input(seed, bytes) {
  return {
    origin: "https://www.bondageprojects.com",
    ipHash: "ip-hash",
    bytes,
    leaseId: token(seed),
    now: NOW,
  };
}

function token(seed) {
  return seed.repeat(43).slice(0, 43);
}

function hash(seed) {
  return token(seed);
}

function createSessionDatabase() {
  const database = {
    rows: new Map(),
    alarmAt: null,
    state: null,
  };
  const sql = {
    exec(query, ...bindings) {
      const normalized = query.replace(/\s+/gu, " ").trim();
      let rows = [];
      if (normalized.startsWith("SELECT token_hash")) {
        const row = database.rows.get(bindings[0]);
        rows = row ? [row] : [];
      } else if (normalized.startsWith("SELECT MIN(expires_at)")) {
        const expiries = [...database.rows.values()].map((row) => row.expires_at);
        rows = [{ expires_at: expiries.length ? Math.min(...expiries) : null }];
      } else if (normalized.startsWith("INSERT INTO")) {
        database.rows.set(bindings[0], {
          token_hash: bindings[0],
          origin: bindings[1],
          ip_hash: bindings[2],
          expires_at: bindings[3],
          attempts: bindings[4],
          reserved_bytes: bindings[5],
          leases_json: bindings[6],
        });
      } else if (normalized === "DELETE FROM upload_session WHERE token_hash = ?") {
        database.rows.delete(bindings[0]);
      } else if (normalized === "DELETE FROM upload_session WHERE expires_at <= ?") {
        for (const [key, row] of database.rows) {
          if (row.expires_at <= bindings[0]) database.rows.delete(key);
        }
      }
      return {
        toArray: () => rows,
        *[Symbol.iterator]() {
          yield* rows;
        },
      };
    },
  };
  const storage = {
    sql,
    async setAlarm(value) {
      database.alarmAt = value;
    },
  };
  database.state = {
    storage,
    blockConcurrencyWhile(callback) {
      return callback();
    },
  };
  return database;
}

function createGlobalDatabase() {
  const database = { row: null, state: null };
  const storage = {
    sql: {
      exec(query, ...bindings) {
        const normalized = query.replace(/\s+/gu, " ").trim();
        let rows = [];
        if (normalized.startsWith("SELECT singleton")) {
          rows = database.row ? [database.row] : [];
        } else if (normalized.startsWith("INSERT INTO")) {
          database.row = {
            singleton: 1,
            utc_day: bindings[0],
            attempts: bindings[1],
            reserved_bytes: bindings[2],
            leases_json: bindings[3],
          };
        }
        return {
          toArray: () => rows,
          *[Symbol.iterator]() {
            yield* rows;
          },
        };
      },
    },
    async setAlarm() {},
  };
  database.state = {
    storage,
    blockConcurrencyWhile(callback) {
      return callback();
    },
  };
  return database;
}
