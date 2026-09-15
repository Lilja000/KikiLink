import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { EventEmitter } from "node:events";
import { fixture } from "./helpers.mjs";
import { attachCloudVerifier } from "../verifier/bc-adapter.mjs";
import { Database } from "../src/db.mjs";
import { encryptedBackup, restoreBackup } from "../ops/backup.mjs";

async function rig(t, { drop = false } = {}) {
  const f = await fixture(t);
  let clock = Date.now();
  const file = join(f.dir, "automatic-client.mjs");
  await build({
    entryPoints: [
      new URL("../../src/cloud/client.ts", import.meta.url).pathname,
    ],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: file,
  });
  const { CloudClient } = await import(pathToFileURL(file));
  const wire = [],
    requests = [],
    stores = new Map();
  const socket = new EventEmitter();
  socket.connected = true;
  const detach = attachCloudVerifier(socket, {
    expectedVerifierMember: 909,
    allowedMembers: f.config.testMembers,
    getAuthenticatedMemberNumber: () => 909,
    endpoint: "http://127.0.0.1:8792/verify",
    secret: f.config.verifierSecret,
    fetchImpl: async (_url, init) => {
      const r = await f.verifier.inject({
        method: "POST",
        url: "/verify",
        headers: init.headers,
        payload: init.body,
      });
      return new Response(r.body, { status: r.statusCode });
    },
  });
  t.after(detach);
  let offline = false;
  const fetchImpl = async (url, init = {}) => {
    const path = new URL(url).pathname;
    requests.push({
      path,
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
      credentials: init.credentials,
    });
    if (offline) throw new Error("offline");
    const r = await f.app.inject({
      method: init.method ?? "GET",
      url: path,
      headers: { origin: f.origin, ...init.headers },
      ...(init.body ? { payload: init.body } : {}),
    });
    return new Response(r.statusCode === 204 ? null : r.body, {
      status: r.statusCode,
      headers: r.headers,
    });
  };
  function make(memberNumber) {
    let current = memberNumber;
    const store = {
      load: async () => structuredClone(stores.get(memberNumber)),
      save: async (key) => {
        stores.set(memberNumber, structuredClone(key));
      },
      pause: async () => {
        stores.set(memberNumber, "paused");
      },
    };
    const client = new CloudClient({
      origin: f.config.origin,
      memberNumber,
      getMemberNumber: () => current,
      isBlocked: () => false,
      deviceStore: store,
      pageOrigin: f.origin,
      verificationDelays: [0, 5, 10, 20],
      fetchImpl,
      now: () => clock,
      sendProof: (target, payload) => {
        wire.push({ sender: memberNumber, target, payload });
        if (!drop)
          socket.emit("AccountBeep", {
            MemberNumber: memberNumber,
            BeepType: "KikiLink",
            Message: "KIKILINK/1 " + payload,
          });
      },
    });
    t.after(() => client.destroy());
    return {
      client,
      switchAccount: (n) => {
        current = n;
      },
      store,
    };
  }
  return {
    ...f,
    make,
    stores,
    wire,
    requests,
    offline: () => {
      offline = true;
    },
    advance: (ms) => {
      clock += ms;
      f.advance(ms);
    },
  };
}

test("Automatic lobby identity uses one native proof; a fresh addon instance resumes by non-exportable key", async (t) => {
  const r = await rig(t),
    first = r.make(101);
  assert.equal(r.requests.length, 0);
  await Promise.all([first.client.connect(true), first.client.connect(true)]);
  assert.equal(first.client.connected, true);
  assert.equal(r.wire.length, 1);
  assert.equal(r.wire[0].target, 909);
  const stored = r.stores.get(101);
  assert.equal(stored.privateKey.extractable, false);
  await assert.rejects(crypto.subtle.exportKey("jwk", stored.privateKey));
  assert.equal(Object.hasOwn(stored, "token"), false);
  assert.equal(Object.hasOwn(stored, "exchange"), false);
  assert.ok(stored.device.id);
  first.client.destroy();
  const second = r.make(101);
  await second.client.connect(true);
  assert.equal(second.client.connected, true);
  assert.equal(r.wire.length, 1);
  assert.equal(
    r.requests.filter((x) => x.path === "/v1/auth/device-exchange").length,
    1,
  );
  assert.ok(r.requests.every((x) => x.credentials === "omit"));
  assert.ok(r.requests.every((x) => x.path.startsWith("/v1/auth/")));
  assert.equal(
    (await second.client.request("GET", "/v1/me")).memberNumber,
    101,
  );
});

test("A device key alone cannot enroll or authorize a claimed BC identity", async (t) => {
  const r = await rig(t, { drop: true }),
    a = r.make(101);
  await assert.rejects(a.client.connect(true), /verification_unavailable/);
  assert.equal(a.client.connected, false);
  assert.equal(a.client.connectionState, "unavailable");
  assert.equal(r.wire.length, 1);
  assert.equal(r.db.get("SELECT COUNT(*) AS n FROM auth_devices").n, 0);
  assert.equal(r.db.get("SELECT COUNT(*) AS n FROM sessions").n, 0);
  assert.equal(
    r.requests.filter((x) => x.path === "/v1/auth/exchange").length,
    4,
  );
  assert.equal(r.stores.size, 0);
});

test("Device challenges bind identity and origin, require possession, and refuse replay", async (t) => {
  const r = await rig(t),
    a = r.make(101);
  await a.client.connect(true);
  a.client.destroy();
  await r.make(101).client.connect(true);
  const exchange = r.requests.find(
    (x) => x.path === "/v1/auth/device-exchange",
  ).body;
  const replay = await r.request("POST", "/v1/auth/device-exchange", exchange);
  assert.equal(replay.statusCode, 401);
  const stored = r.stores.get(101);
  const start = await r.request("POST", "/v1/auth/device-challenges", {
    deviceId: stored.device.id,
    memberNumber: 202,
  });
  assert.equal(start.statusCode, 401);
  const good = await r.request("POST", "/v1/auth/device-challenges", {
    deviceId: stored.device.id,
    memberNumber: 101,
  });
  const c = good.json();
  const forged = { ...exchange, challengeId: c.challengeId, nonce: c.nonce };
  assert.equal(
    (await r.request("POST", "/v1/auth/device-exchange", forged)).statusCode,
    401,
  );
  const foreignOrigin = "https://bondage-europe.com";
  r.config.allowedOrigins.add(foreignOrigin);
  assert.equal(
    (
      await r.request(
        "POST",
        "/v1/auth/device-challenges",
        { deviceId: stored.device.id, memberNumber: 101 },
        undefined,
        { origin: foreignOrigin },
      )
    ).statusCode,
    401,
  );
});

test("Disconnect revokes device sessions and pauses automatic login; another BC account stays isolated", async (t) => {
  const r = await rig(t),
    a = r.make(101),
    b = r.make(202);
  await a.client.connect(true);
  await b.client.connect(true);
  const stored = r.stores.get(101);
  const resumed = r.make(101);
  await resumed.client.connect(true);
  await a.client.logout();
  assert.equal(r.stores.get(101), "paused");
  assert.equal(
    (
      await r.request("POST", "/v1/auth/device-challenges", {
        deviceId: stored.device.id,
        memberNumber: 101,
      })
    ).statusCode,
    401,
  );
  await assert.rejects(
    resumed.client.request("GET", "/v1/me"),
    /session_expired/,
  );
  const proofCount = r.wire.length;
  await resumed.client.connect(true);
  assert.equal(resumed.client.connected, false);
  assert.equal(r.wire.length, proofCount);
  assert.equal((await b.client.request("GET", "/v1/me")).memberNumber, 202);
  const requests = r.requests.length,
    reload = r.make(101);
  await reload.client.connect(true);
  assert.equal(reload.client.connected, false);
  assert.equal(r.requests.length, requests);
  b.switchAccount(101);
  await assert.rejects(b.client.request("GET", "/v1/me"), /account_changed/);
});

test("Signing out after access expiry still revokes the remembered device without another BC proof", async (t) => {
  const r = await rig(t),
    a = r.make(101);
  await a.client.connect(true);
  r.advance(2 * 3600000);
  assert.equal(a.client.connected, false);
  await a.client.logout();
  assert.equal(r.wire.length, 1);
  assert.equal(r.db.get("SELECT COUNT(*) AS n FROM auth_devices").n, 0);
  assert.equal(r.db.get("SELECT COUNT(*) AS n FROM sessions").n, 0);
  assert.equal(r.stores.get(101), "paused");
});

test("Expired or revoked grants do not renew forever and Cloud outages send no new BC proof", async (t) => {
  const r = await rig(t),
    a = r.make(101);
  await a.client.connect(true);
  const device = r.stores.get(101).device;
  r.db.run("UPDATE auth_devices SET expires_at=0 WHERE id=?", device.id);
  assert.equal(
    (
      await r.request("POST", "/v1/auth/device-challenges", {
        deviceId: device.id,
        memberNumber: 101,
      })
    ).statusCode,
    401,
  );
  // Removing the service does not cause a storm of fresh proof messages.
  r.offline();
  await assert.rejects(
    r.make(101).client.connect(true),
    /cloud_temporarily_unavailable/,
  );
  assert.equal(r.wire.length, 1);
});

test("Sign out on all devices revokes separate keys, and a restored backup never resurrects a remembered login", async (t) => {
  const r = await rig(t),
    first = r.make(101);
  await first.client.connect(true);
  r.stores.delete(101);
  const second = r.make(101);
  await second.client.connect(true);
  assert.equal(r.db.get("SELECT COUNT(*) AS n FROM auth_devices").n, 2);
  const backup = await encryptedBackup(r.db, r.keys, r.dir);
  t.after(backup.dispose);
  const target = join(r.dir, "restored-devices.sqlite");
  await restoreBackup(
    backup.path,
    r.keys,
    target,
    r.config.limits.maxDatabaseBytes,
  );
  const restored = new Database(target);
  try {
    assert.equal(restored.get("SELECT COUNT(*) AS n FROM auth_devices").n, 0);
    assert.equal(restored.get("SELECT COUNT(*) AS n FROM sessions").n, 0);
    assert.equal(restored.get("SELECT COUNT(*) AS n FROM users").n, 1);
  } finally {
    restored.close();
  }
  await first.client.logout(true);
  await assert.rejects(
    second.client.request("GET", "/v1/me"),
    /session_expired/,
  );
  assert.equal(r.db.get("SELECT COUNT(*) AS n FROM auth_devices").n, 0);
});
