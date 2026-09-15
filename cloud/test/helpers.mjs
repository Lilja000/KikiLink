import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const sourceRoot = process.env.CLOUD_TEST_API_ROOT
  ? pathToFileURL(process.env.CLOUD_TEST_API_ROOT + "/")
  : new URL("../src/", import.meta.url);
const [{ Database }, { KeyRing, token }, { createApp, createVerifier }] =
  await Promise.all([
    import(new URL("db.mjs", sourceRoot)),
    import(new URL("crypto.mjs", sourceRoot)),
    import(new URL("app.mjs", sourceRoot)),
  ]);

export class MemoryObjects {
  objects = new Map();
  fail = false;
  async put(key, body) {
    if (this.fail) throw new Error("object store offline");
    this.objects.set(key, Buffer.from(body));
  }
  async get(key) {
    if (this.fail) throw new Error("object store offline");
    const b = this.objects.get(key);
    if (!b) throw new Error("missing");
    return Buffer.from(b);
  }
  async delete(key) {
    if (this.fail) throw new Error("object store offline");
    this.objects.delete(key);
  }
  async healthy() {
    if (this.fail) throw new Error("object store offline");
    return true;
  }
}
export async function fixture(t, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "kikilink-cloud-"));
  let clock = Date.now();
  const config = {
    mode: "development",
    origin: "https://cloud.example.test",
    allowedOrigins: new Set(["https://bondageprojects.elementfx.com"]),
    testMembers: new Set([101, 202, 303, 404, 505, 606]),
    moderators: new Set([606]),
    verifierMember: 909,
    verifierSecret: token(),
    rateSecret: token(),
    limits: {
      userBytes: 128 * 1024 ** 2,
      globalBytes: 8 * 1024 ** 3,
      userAssets: 200,
      uploadsPerDay: 30,
      maxImageBytes: 5 * 1024 ** 2,
      maxOutputBytes: 3 * 1024 ** 2,
      maxDatabaseBytes: 1024 ** 3,
    },
    ...overrides,
  };
  const path = join(dir, "test.sqlite"),
    db = new Database(path, { migrate: true }),
    keys = new KeyRing({ test: randomBytes(32).toString("base64") }, "test"),
    storage = new MemoryObjects();
  const cloud = createApp({ db, keys, storage, config, now: () => clock });
  const verifier = createVerifier({ auth: cloud.auth, config });
  await cloud.app.ready();
  await verifier.ready();
  const sessions = new Map(),
    origin = [...config.allowedOrigins][0];
  const request = async (method, url, body, member, headers = {}) =>
    cloud.app.inject({
      method,
      url,
      headers: {
        origin,
        ...(member && sessions.has(member)
          ? { authorization: `Bearer ${sessions.get(member)}` }
          : {}),
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      ...(body !== undefined ? { payload: body } : {}),
    });
  const verify = (body) =>
    verifier.inject({
      method: "POST",
      url: "/verify",
      headers: {
        authorization: `Bearer ${config.verifierSecret}`,
        "content-type": "application/json",
      },
      payload: body,
    });
  async function login(member) {
    const start = await request("POST", "/v1/auth/challenges", {
      memberNumber: member,
    });
    assert.equal(start.statusCode, 201, start.body);
    const c = start.json();
    const v = await verify({
      challengeId: c.challengeId,
      proof: c.proof,
      sender: member,
    });
    assert.equal(v.statusCode, 200, v.body);
    const exchange = await request("POST", "/v1/auth/exchange", {
      challengeId: c.challengeId,
      exchange: c.exchange,
    });
    assert.equal(exchange.statusCode, 200, exchange.body);
    sessions.set(member, exchange.json().token);
    return exchange.json();
  }
  const ok = async (method, url, body, member = 101, status = 200) => {
    const r = await request(method, url, body, member);
    assert.equal(r.statusCode, status, r.body);
    return r.statusCode === 204 ? null : r.json();
  };
  t.after(async () => {
    await cloud.app.close();
    await verifier.close();
    try {
      db.close();
    } catch {}
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    ...cloud,
    verifier,
    dir,
    path,
    db,
    keys,
    storage,
    config,
    origin,
    sessions,
    request,
    verify,
    login,
    ok,
    advance: (ms) => {
      clock += ms;
    },
  };
}
export async function group(f) {
  for (const m of [101, 202, 303, 404]) await f.login(m);
  const g = await f.ok(
    "POST",
    "/v1/groups",
    { title: "Friends in different rooms", members: [202, 303] },
    101,
    201,
  );
  await f.ok("POST", `/v1/groups/${g.id}/accept`, {}, 202);
  return f.ok("POST", `/v1/groups/${g.id}/accept`, {}, 303);
}
