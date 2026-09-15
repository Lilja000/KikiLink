import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fixture } from "./helpers.mjs";
import { VerifierConnection } from "../verifier/connection.mjs";
import { PublicRecipients } from "../verifier/public-recipients.mjs";

class Socket extends EventEmitter {
  connected = false;
  sent = [];
  connect() { return this; }
  disconnect() { this.connected = false; return this; }
  emit(type, body) { this.sent.push({ type, body }); return true; }
  receive(type, body) { return super.emit(type, body); }
}
async function flush() { for (let i = 0; i < 6; i++) await new Promise(setImmediate); }
async function rig(t) {
  const f = await fixture(t, { mode: "production" });
  const stateDir = mkdtempSync(join(tmpdir(), "kiki-public-receive-"));
  const socket = new Socket(), tasks = new Map(), requests = [];
  let now = 0, next = 0, offline = false;
  const config = { mode: "production", member: 909, allowedMembers: new Set([101, 202]),
    receiveMembers: new Set([101]), endpoint: "http://127.0.0.1:8792/verify", secret: f.config.verifierSecret,
    username: "Verifier", password: "FixtureOnly", stateDir, serverUrl: "https://example.invalid", origin: f.origin };
  const schedule = (fn, delay) => { const id = ++next; tasks.set(id, { at: now + delay, fn }); return id; };
  const cancel = (id) => tasks.delete(id);
  const fetchImpl = async (url, init) => {
    if (offline) throw new Error("fixture outage");
    requests.push({ path: new URL(url).pathname, method: init.method });
    const result = await f.verifier.inject({ url: new URL(url).pathname, method: init.method,
      headers: init.headers, ...(init.body ? { payload: init.body } : {}) });
    return new Response(result.body, { status: result.statusCode });
  };
  const connection = new VerifierConnection(config, { socketFactory: () => socket, fetchImpl,
    now: () => now, schedule, cancel, random: () => 0.5 });
  const login = { MemberNumber: 909, AccountName: "Verifier", ID: "fixture-id", Name: "Verifier",
    FriendList: [101, 808], BlackList: [303], GhostList: [404] };
  function enter(data = login) {
    connection.start(); socket.connected = true; socket.receive("connect"); socket.receive("LoginResponse", data);
  }
  async function advance(ms) {
    const until = now + ms;
    while (true) {
      const task = [...tasks.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!task || task[1].at > until) break;
      f.advance(task[1].at - now); now = task[1].at; tasks.delete(task[0]); task[1].fn(); await flush();
    }
    f.advance(until - now); now = until; await flush();
  }
  t.after(() => { connection.stop(); rmSync(stateDir, { recursive: true, force: true }); });
  enter(); await flush();
  return { f, socket, connection, tasks, requests, config, login, enter, advance, fetchImpl, schedule, cancel,
    offline: (value) => { offline = value; } };
}

test("An unlisted member enrolls through native BC envelope after bounded receive preparation; duplicate events forward once", async (t) => {
  const r = await rig(t);
  const c = (await r.f.request("POST", "/v1/auth/challenges", { memberNumber: 707 })).json();
  const packet = { MemberNumber: 707, BeepType: "KikiLink", Message: "KIKILINK/1 " +
    JSON.stringify({ t: "cloud-verify", v: 1, challengeId: c.challengeId, proof: c.proof }) };
  r.socket.receive("AccountBeep", packet); await flush();
  assert.equal(r.requests.filter((r) => r.path === "/verify").length, 0);
  await r.advance(2500);
  assert.deepEqual(r.socket.sent.filter((p) => p.type === "AccountUpdate"),
    [{ type: "AccountUpdate", body: { FriendList: [101, 808, 707] } }]);
  const ready = await r.f.request("POST", "/v1/auth/proof-ready", { challengeId: c.challengeId, exchange: c.exchange });
  assert.deepEqual(ready.json(), { ready: true });
  r.socket.receive("AccountBeep", { ...packet, MemberNumber: 708 });
  r.socket.receive("AccountBeep", packet);
  r.socket.receive("AccountBeep", packet);
  r.socket.receive("ChatRoomMessage", { Sender: 707, Type: "Hidden", Content: packet.Message });
  await flush();
  assert.equal(r.requests.filter((r) => r.path === "/verify").length, 1);
  const session = await r.f.request("POST", "/v1/auth/exchange", { challengeId: c.challengeId, exchange: c.exchange });
  assert.equal(session.statusCode, 200, session.body);
  assert.equal(session.json().memberNumber, 707);
  await r.advance(2500);
  assert.deepEqual(r.socket.sent.filter((p) => p.type === "AccountUpdate").at(-1).body, { FriendList: [101, 808] });
  const count = r.socket.sent.length;
  await r.advance(300000);
  assert.equal(r.socket.sent.length, count, "five minutes idle must send zero BC packets");
  r.connection.stop(); await flush();
  assert.equal(r.tasks.size, 0);
  assert.equal(r.socket.listenerCount("AccountBeep"), 0);
});

test("Explicit blocks and ghosts are preserved and never gain receive readiness", async (t) => {
  const r = await rig(t);
  for (const memberNumber of [303, 404])
    assert.equal((await r.f.request("POST", "/v1/auth/challenges", { memberNumber })).statusCode, 201);
  await r.advance(5000);
  assert.equal(r.socket.sent.filter((p) => p.type === "AccountUpdate").length, 0);
  assert.deepEqual([...r.connection.recipients.allowed], []);
  assert.deepEqual(r.login.BlackList, [303]);
  assert.deepEqual(r.login.GhostList, [404]);
});

test("Existing DevTest clients can send their first proof immediately on the already configured native path", async (t) => {
  const r = await rig(t);
  const c = (await r.f.request("POST", "/v1/auth/challenges", { memberNumber: 101 })).json();
  r.socket.receive("AccountBeep", { MemberNumber: 101, BeepType: "KikiLink", Message: "KIKILINK/1 " +
    JSON.stringify({ t: "cloud-verify", v: 1, challengeId: c.challengeId, proof: c.proof }) });
  await flush();
  const result = await r.f.request("POST", "/v1/auth/exchange", { challengeId: c.challengeId, exchange: c.exchange });
  assert.equal(result.statusCode, 200, result.body);
  assert.equal(r.socket.sent.filter((p) => p.type === "AccountUpdate").length, 0);
});

test("API outage revokes pending receive entries once, preserves friends, and expires readiness", async (t) => {
  const r = await rig(t);
  await r.f.request("POST", "/v1/auth/challenges", { memberNumber: 707 });
  await r.advance(2500);
  assert.equal(r.connection.recipients.allowed.has(707), true);
  r.offline(true);
  await r.advance(10000);
  assert.deepEqual([...r.connection.recipients.allowed], []);
  assert.deepEqual(r.socket.sent.filter((p) => p.type === "AccountUpdate").map((p) => p.body.FriendList),
    [[101, 808, 707], [101, 808]]);
  assert.equal((await r.f.request("POST", "/v1/auth/challenges", { memberNumber: 708 })).statusCode, 503);
  await r.advance(30000);
  assert.equal(r.socket.sent.filter((p) => p.type === "AccountUpdate").length, 2);
});

test("Reconstruction cleans only persisted managed entries; malformed or symlink state fails closed", async (t) => {
  const r = await rig(t);
  await r.f.request("POST", "/v1/auth/challenges", { memberNumber: 707 });
  await r.advance(2500);
  const path = join(r.config.stateDir, "beep-recipients.json");
  assert.deepEqual(JSON.parse(readFileSync(path)), { verifier: 909, members: [707] });
  r.connection.stop(); await flush();
  r.f.advance(180001); r.f.auth.cleanup();
  r.enter({ ...r.login, FriendList: [101, 808, 707] }); await flush(); await r.advance(500);
  assert.deepEqual(r.socket.sent.filter((p) => p.type === "AccountUpdate").at(-1).body, { FriendList: [101, 808] });
  assert.equal(r.socket.listenerCount("AccountBeep"), 1);
  r.connection.stop(); await flush();
  r.socket.connected = true;
  writeFileSync(path, JSON.stringify({ verifier: 909, members: ["707"] }), { mode: 0o600 });
  assert.throws(() => new PublicRecipients(r.socket, r.login, r.config), /receive_state_invalid/);
  rmSync(path); symlinkSync("/dev/null", path);
  assert.throws(() => new PublicRecipients(r.socket, r.login, r.config));
});

test("Oversized or malformed local API responses cannot authorize peers or cause BC sends", async (t) => {
  const r = await rig(t);
  r.connection.stop(); await flush();
  r.socket.connected = true;
  for (const data of [{ members: Array(65).fill(707), snapshot: crypto.randomUUID() },
    { members: [707], snapshot: "bad" }, { members: ["707"], snapshot: crypto.randomUUID() },
    { members: [], snapshot: crypto.randomUUID(), extra: "x".repeat(5000) }]) {
    const before = r.socket.sent.length;
    const manager = new PublicRecipients(r.socket, r.login, r.config, { fetchImpl: async () => new Response(JSON.stringify(data)),
      schedule: r.schedule, cancel: r.cancel });
    manager.start(); await flush(); manager.stop();
    assert.equal(manager.allowed.size, 0); assert.equal(r.socket.sent.length, before);
  }
});

test("Repeated interrupted updates keep the receive ownership journal bounded by the authoritative login", async (t) => {
  const r = await rig(t);
  r.connection.stop(); await flush(); r.socket.connected = true;
  const path = join(r.config.stateDir, "beep-recipients.json");
  const prior = Array.from({ length: 128 }, (_, i) => 10000 + i);
  writeFileSync(path, JSON.stringify({ verifier: 909, members: prior }), { mode: 0o600 });
  const authoritative = { ...r.login, FriendList: [...r.login.FriendList, ...prior.slice(0, 64)] };
  const manager = new PublicRecipients(r.socket, authoritative, r.config);
  manager.stopped = false;
  manager.reconcile([707]);
  assert.deepEqual(JSON.parse(readFileSync(path)), { verifier: 909, members: [707] });
  assert.deepEqual(r.socket.sent.at(-1).body, { FriendList: [101, 808, 707] });
  manager.stop();
});
