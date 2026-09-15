import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { fixture } from "./helpers.mjs";
import { deviceMessage } from "../src/device-auth.mjs";

function privateRequest(f, method, body, headers = {}) {
  return f.verifier.inject({ method, url: "/enrollment", headers: {
    authorization: `Bearer ${f.config.verifierSecret}`,
    ...(body ? { "content-type": "application/json" } : {}), ...headers,
  }, ...(body ? { payload: body } : {}) });
}
async function prepared(f, members) {
  const pending = await privateRequest(f, "GET");
  assert.equal(pending.statusCode, 200, pending.body);
  const value = pending.json();
  assert.deepEqual(Object.keys(value).sort(), ["members", "snapshot"]);
  const result = await privateRequest(f, "POST", { ...value, members: members ?? value.members });
  assert.equal(result.statusCode, 200, result.body);
  return value;
}
const start = (f, memberNumber = 707, more = {}) => f.request("POST", "/v1/auth/challenges", { memberNumber, ...more });
const exchange = (f, c) => f.request("POST", "/v1/auth/exchange", { challengeId: c.challengeId, exchange: c.exchange });

test("Production admits an ordinary member only after native identity verification, never by claimed number or receive readiness", async (t) => {
  const f = await fixture(t, { mode: "production" });
  assert.equal((await start(f)).statusCode, 503);
  for (const headers of [{ authorization: "Bearer forged" }, { origin: f.origin }])
    assert.equal((await privateRequest(f, "GET", undefined, headers)).statusCode, 403);
  await prepared(f);
  const c = (await start(f)).json();
  assert.equal(c.delivery, "pending");
  const ready = () => f.request("POST", "/v1/auth/proof-ready", { challengeId: c.challengeId, exchange: c.exchange });
  assert.deepEqual((await ready()).json(), { ready: false });
  await prepared(f);
  assert.deepEqual((await ready()).json(), { ready: true });
  assert.equal((await exchange(f, c)).statusCode, 409);
  assert.equal((await f.verify({ challengeId: c.challengeId, proof: c.proof, sender: 101 })).statusCode, 403);
  assert.equal((await f.request("POST", "/v1/auth/proof-ready", { challengeId: c.challengeId, exchange: "x".repeat(43) })).statusCode, 401);
  assert.equal((await f.verify({ challengeId: c.challengeId, proof: c.proof, sender: 707, memberNumber: 101 })).statusCode, 400);
  assert.equal((await f.verify({ challengeId: c.challengeId, proof: c.proof, sender: 707 })).statusCode, 200);
  const session = await exchange(f, c);
  assert.equal(session.statusCode, 200, session.body);
  assert.equal(session.json().memberNumber, 707);
  f.sessions.set(707, session.json().token);
  const me = await f.ok("GET", "/v1/me", undefined, 707);
  assert.equal(me.memberNumber, 707);
  assert.equal(me.moderator, false);
  assert.equal((await exchange(f, c)).statusCode, 401);
  assert.equal((await start(f, 909)).statusCode, 403);
});

test("Staging stays closed and production does not make a member an owner or admin", async (t) => {
  const staging = await fixture(t);
  assert.equal((await start(staging)).statusCode, 403);
  assert.equal((await privateRequest(staging, "GET")).statusCode, 404);
  const f = await fixture(t, { mode: "production" });
  await prepared(f);
  await f.login(101);
  await f.login(707);
  await f.login(202);
  const group = await f.ok("POST", "/v1/groups", { title: "Owner group", members: [707, 202] }, 101, 201);
  await f.ok("POST", `/v1/groups/${group.id}/accept`, {}, 707);
  const denied = await f.request("PATCH", `/v1/groups/${group.id}`, { title: "Forged edit", revision: group.revision }, 707);
  assert.equal(denied.statusCode, 403, denied.body);
});

test("Receive readiness expires, snapshots cannot be replayed, and pending lists contain no authentication secrets", async (t) => {
  const f = await fixture(t, { mode: "production" });
  const snapshot = await prepared(f);
  assert.equal((await privateRequest(f, "POST", snapshot)).statusCode, 409);
  const c = (await start(f)).json();
  const pending = await prepared(f);
  assert.deepEqual(pending.members, [707]);
  for (const secret of [c.proof, c.exchange, c.challengeId, f.config.verifierSecret])
    assert.ok(!JSON.stringify(pending).includes(secret));
  f.advance(8001);
  const readiness = await f.request("POST", "/v1/auth/proof-ready", { challengeId: c.challengeId, exchange: c.exchange });
  assert.deepEqual(readiness.json(), { ready: false });
  assert.equal((await start(f, 708)).statusCode, 503);
});

test("Production challenge admission bounds concurrent work and refuses disabled accounts", async (t) => {
  const f = await fixture(t, { mode: "production" });
  await prepared(f);
  for (let i = 0; i < 3; i++) assert.equal((await start(f)).statusCode, 201);
  assert.equal((await start(f)).statusCode, 429);
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM auth_challenges").n, 3);
  await f.login(101);
  f.db.run("UPDATE users SET disabled=1 WHERE member_number=101");
  assert.equal((await start(f, 101)).statusCode, 403);
  for (let i = 0; i < 36; i++) await start(f, 1000 + i);
  assert.equal((await start(f, 2000)).statusCode, 429);
  f.advance(180001);
  f.auth.cleanup();
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM auth_challenges").n, 0);
  await prepared(f);
  assert.equal((await start(f, 2000)).statusCode, 201);
});

test("An ordinary production member can resume only its own verified device, with replay and revocation enforced", async (t) => {
  const f = await fixture(t, { mode: "production" });
  await prepared(f);
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const c = (await start(f, 707, { publicKey: publicKey.export({ format: "jwk" }) })).json();
  await f.verify({ challengeId: c.challengeId, proof: c.proof, sender: 707 });
  const session = (await exchange(f, c)).json();
  const device = session.device;
  const begin = await f.request("POST", "/v1/auth/device-challenges", { deviceId: device.id, memberNumber: 707 });
  assert.equal(begin.statusCode, 201, begin.body);
  const d = begin.json();
  const signature = sign("sha256", Buffer.from(deviceMessage(d.challengeId, d.nonce, device.id, 707, f.origin)),
    { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  const payload = { challengeId: d.challengeId, nonce: d.nonce, deviceId: device.id, memberNumber: 707, signature };
  assert.equal((await f.request("POST", "/v1/auth/device-exchange", { ...payload, memberNumber: 101 })).statusCode, 401);
  assert.equal((await f.request("POST", "/v1/auth/device-exchange", payload)).statusCode, 200);
  assert.equal((await f.request("POST", "/v1/auth/device-exchange", payload)).statusCode, 401);
  f.auth.logoutAll(707);
  assert.equal((await f.request("POST", "/v1/auth/device-challenges", { deviceId: device.id, memberNumber: 707 })).statusCode, 401);
});
