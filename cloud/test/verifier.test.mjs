import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { createServer } from "node:http";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  symlinkSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { pathToFileURL } from "node:url";
const verifierRoot = process.env.CLOUD_TEST_VERIFIER_ROOT
  ? pathToFileURL(process.env.CLOUD_TEST_VERIFIER_ROOT + "/")
  : new URL("../verifier/", import.meta.url);
const [
  { VerifierConnection },
  { loadVerifierConfig, BC_SERVER, BC_ORIGIN },
  { readSuspension, suspendPermanently, writeStatus },
] = await Promise.all([
  import(new URL("connection.mjs", verifierRoot)),
  import(new URL("config.mjs", verifierRoot)),
  import(new URL("state.mjs", verifierRoot)),
]);
import { fixture } from "./helpers.mjs";

const config = {
  member: 909,
  allowedMembers: new Set([101, 202]),
  username: "VerifierTest1",
  password: "PrivateTestCanary2",
  secret: "s".repeat(43),
  endpoint: "http://127.0.0.1:8792/verify",
  serverUrl: BC_SERVER,
  origin: BC_ORIGIN,
};
const login = {
  MemberNumber: 909,
  AccountName: config.username,
  ID: "server-character-id",
  Name: "Verifier",
};
const wire = (
  challenge = { challengeId: randomUUID(), proof: "p".repeat(43) },
) =>
  "KIKILINK/1 " +
  JSON.stringify({
    t: "cloud-verify",
    v: 1,
    challengeId: challenge.challengeId,
    proof: challenge.proof,
  });
const tick = () => new Promise(setImmediate);

class Socket extends EventEmitter {
  connected = false;
  sent = [];
  connects = 0;
  connect() {
    this.connects++;
    return this;
  }
  disconnect() {
    const connected = this.connected;
    this.connected = false;
    if (connected) this.receive("disconnect", "io client disconnect");
    return this;
  }
  emit(event, body) {
    this.sent.push({ event, body });
    return true;
  }
  receive(event, body) {
    if (event === "connect") this.connected = true;
    if (event === "disconnect") this.connected = false;
    return super.emit(event, body);
  }
}

function rig(t, fetchImpl = async () => ({ body: null })) {
  const socket = new Socket(),
    tasks = new Map(),
    states = [];
  let time = 0,
    next = 1,
    options;
  const connection = new VerifierConnection(config, {
    socketFactory: (_url, value) => {
      options = value;
      return socket;
    },
    fetchImpl,
    now: () => time,
    random: () => 0.5,
    schedule: (fn, delay) => {
      const id = next++;
      tasks.set(id, { fn, at: time + delay });
      return id;
    },
    cancel: (id) => tasks.delete(id),
  });
  connection.on("state", (state) => states.push(state));
  t.after(() => connection.stop());
  function advance(ms) {
    const target = time + ms;
    while (true) {
      const nextTask = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (!nextTask || nextTask[1].at > target) break;
      time = nextTask[1].at;
      tasks.delete(nextTask[0]);
      nextTask[1].fn();
    }
    time = target;
  }
  return { socket, connection, tasks, states, options, advance };
}

test("Verifier authenticates the pinned account before accepting any native proof", async (t) => {
  const forwarded = [];
  const r = rig(t, async (_url, request) => {
    forwarded.push(JSON.parse(request.body));
    return { body: null };
  });
  r.connection.start();
  r.socket.receive("AccountBeep", {
    MemberNumber: 101,
    BeepType: "KikiLink",
    Message: wire(),
  });
  assert.equal(r.socket.sent.length, 0);
  r.socket.receive("connect");
  assert.deepEqual(r.socket.sent, [
    {
      event: "AccountLogin",
      body: { AccountName: config.username, Password: config.password },
    },
  ]);
  r.socket.receive("LoginResponse", login);
  r.socket.receive("LoginResponse", login);
  assert.equal(r.socket.listenerCount("AccountBeep"), 1);
  r.socket.receive("AccountBeep", {
    MemberNumber: 303,
    BeepType: "KikiLink",
    Message: wire(),
  });
  r.socket.receive("ChatRoomChat", {
    Sender: 101,
    Type: "Hidden",
    Content: wire(),
  });
  r.socket.receive("ChatRoomMessage", {
    Sender: 101,
    Type: "Hidden",
    Content: wire(),
  });
  await tick();
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].sender, 101);
  assert.equal(r.connection.state, "online");
  assert.equal(r.options.reconnection, false);
  assert.equal(r.options.rejectUnauthorized, true);
  assert.equal(
    r.options.transportOptions.websocket.maxPayload,
    2 * 1024 * 1024,
  );
  assert.ok(r.socket.sent.every((packet) => packet.event === "AccountLogin"));
  assert.ok(!JSON.stringify(r.states).includes(config.password));
});

test("Wrong credentials, account identity and forced disconnect latch without relogin", (t) => {
  for (const [event, data, reason] of [
    ["LoginResponse", "InvalidNamePassword", "login_rejected"],
    ["LoginResponse", { ...login, MemberNumber: 101 }, "identity_mismatch"],
    [
      "LoginResponse",
      { ...login, AccountName: "OtherAccount" },
      "identity_mismatch",
    ],
    ["LoginResponse", { ...login, ID: null }, "protocol_error"],
    ["ForceDisconnect", { private: config.password }, "server_disconnect"],
  ]) {
    const r = rig(t);
    r.connection.start();
    r.socket.receive("connect");
    r.socket.receive(event, data);
    assert.equal(r.connection.suspendedReason, reason);
    assert.equal(r.connection.member, null);
    assert.equal(r.connection.start(), false);
    r.advance(600_000);
    assert.equal(r.socket.connects, 1);
    assert.equal(r.tasks.size, 0);
    assert.ok(!JSON.stringify(r.states).includes(config.password));
  }
});

test("A disconnect removes identity and aborts pending verification before retry", async (t) => {
  const requests = [];
  const r = rig(t, (_url, request) => {
    requests.push(request);
    return new Promise((resolve) =>
      request.signal.addEventListener("abort", () => resolve({ body: null }), {
        once: true,
      }),
    );
  });
  r.connection.start();
  r.socket.receive("connect");
  r.socket.receive("LoginResponse", login);
  r.socket.receive("AccountBeep", {
    MemberNumber: 101,
    BeepType: "KikiLink",
    Message: wire(),
  });
  await tick();
  r.socket.receive("disconnect", "transport close");
  assert.equal(r.connection.member, null);
  assert.ok(requests[0].signal.aborted);
  r.socket.receive("AccountBeep", {
    MemberNumber: 101,
    BeepType: "KikiLink",
    Message: wire(),
  });
  await tick();
  assert.equal(requests.length, 1);
  r.advance(2000);
  assert.equal(r.socket.connects, 2);
  r.socket.receive("connect");
  r.socket.receive("LoginResponse", login);
  assert.equal(r.connection.state, "online");
  assert.equal(r.socket.listenerCount("AccountBeep"), 1);
});

test("Queued login has a fixed deadline and network retries have a finite budget", (t) => {
  const queued = rig(t);
  queued.connection.start();
  queued.socket.receive("connect");
  queued.advance(89_000);
  queued.socket.receive("LoginQueue", 100);
  queued.advance(1000);
  assert.equal(queued.connection.suspendedReason, "login_timeout");
  const r = rig(t);
  r.connection.start();
  for (let n = 0; n < 5; n++) {
    r.socket.receive("connect_error", new Error(config.password));
    r.advance(60_000);
  }
  assert.equal(r.connection.suspendedReason, "retry_budget_exhausted");
  assert.equal(r.socket.connects, 5);
  assert.equal(r.tasks.size, 0);
});

test("State-write failure can stop connection before any credential emission", (t) => {
  const r = rig(t);
  r.connection.on("state", (state) => {
    if (state === "authenticating") r.connection.stop();
  });
  r.connection.start();
  r.socket.receive("connect");
  assert.equal(r.socket.sent.length, 0);
  assert.equal(r.tasks.size, 0);
});

test("Private verifier config rejects unapproved destinations, broad files and service/tester overlap", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cloud-verifier-config-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const credentials = join(dir, "bc.json"),
    state = join(dir, "state");
  mkdirSync(state, { mode: 0o700 });
  writeFileSync(
    credentials,
    JSON.stringify({ username: config.username, password: config.password }),
    { mode: 0o600 },
  );
  const env = {
    CLOUD_VERIFIER_MODE: "staging",
    CLOUD_VERIFIER_MEMBER: "909",
    CLOUD_TEST_MEMBERS: "101,202",
    CLOUD_VERIFIER_SECRET: config.secret,
    CLOUD_BC_ACCOUNT_FILE: credentials,
    CLOUD_VERIFIER_STATE: state,
  };
  const loaded = loadVerifierConfig(env);
  assert.equal(loaded.serverUrl, BC_SERVER);
  assert.equal(loadVerifierConfig({ ...env, CLOUD_VERIFIER_MODE: "production" }).mode, "production");
  for (const extra of [
    { CLOUD_VERIFIER_MODE: "public" },
    { CLOUD_TEST_MEMBERS: "909" },
    { CLOUD_VERIFIER_ENDPOINT: "https://attacker.invalid/verify" },
    { CLOUD_VERIFIER_ENDPOINT: "http://127.0.0.1:8792/verify?x=1" },
  ])
    assert.throws(() => loadVerifierConfig({ ...env, ...extra }));
  chmodSync(credentials, 0o644);
  assert.throws(() => loadVerifierConfig(env));
  chmodSync(credentials, 0o600);
  const link = join(dir, "link.json");
  symlinkSync(credentials, link);
  assert.throws(() =>
    loadVerifierConfig({ ...env, CLOUD_BC_ACCOUNT_FILE: link }),
  );
});

test("Terminal suspension survives process reconstruction and state remains bounded", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cloud-verifier-state-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.equal(readSuspension(dir), null);
  suspendPermanently(dir, "identity_mismatch");
  assert.equal(readSuspension(dir), "identity_mismatch");
  assert.throws(() => suspendPermanently(dir, "login_rejected"));
  for (let n = 0; n < 20; n++) writeStatus(dir, "suspended");
  assert.deepEqual(readdirSync(dir).sort(), ["status.json", "suspended.json"]);
});

test("Refused Beep permissions persist as a terminal suspension", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cloud-verifier-state-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  suspendPermanently(dir, "beep_permissions_refused");
  assert.equal(readSuspension(dir), "beep_permissions_refused");
});

test(
  "Real Socket.IO transport delivers native BC events into Cloud authentication",
  { timeout: 5000 },
  async (t) => {
    const f = await fixture(t),
      http = createServer(),
      server = new Server(http, { serveClient: false });
    await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    let native;
    const forwarded = new EventEmitter();
    server.on("connection", (socket) => {
      native = socket;
      socket.on("AccountLogin", (data) => {
        assert.deepEqual(data, {
          AccountName: config.username,
          Password: config.password,
        });
        socket.emit("LoginResponse", login);
      });
    });
    const connection = new VerifierConnection(
      { ...config, secret: f.config.verifierSecret,
        serverUrl: `http://127.0.0.1:${http.address().port}` },
      {
        fetchImpl: async (_url, request) => {
          await f.verify(JSON.parse(request.body));
          forwarded.emit("verified");
          return { body: null };
        },
      },
    );
    t.after(() => connection.stop());
    const online = new Promise((resolve) =>
      connection.on("state", (state) => {
        if (state === "online") resolve();
      }),
    );
    connection.start();
    await online;
    for (const event of ["AccountBeep", "ChatRoomMessage"]) {
      const challenge = await f.ok(
        "POST",
        "/v1/auth/challenges",
        { memberNumber: 101 },
        undefined,
        201,
      );
      const verified = once(forwarded, "verified");
      native.emit(
        event,
        event === "AccountBeep"
          ? {
              MemberNumber: 101,
              BeepType: "KikiLink",
              Message: wire(challenge),
            }
          : { Sender: 101, Type: "Hidden", Content: wire(challenge) },
      );
      await verified;
      const exchanged = await f.request("POST", "/v1/auth/exchange", {
        challengeId: challenge.challengeId,
        exchange: challenge.exchange,
      });
      assert.equal(exchanged.statusCode, 200);
      assert.equal(exchanged.json().memberNumber, 101);
    }
    const stopped = once(connection, "suspended");
    native.emit("ForceDisconnect", "ServerDecides");
    await stopped;
    assert.equal(connection.member, null);
    assert.equal(connection.socket.connected, false);
  },
);
