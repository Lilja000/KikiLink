import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import { fixture, group } from "./helpers.mjs";
import { attachCloudVerifier } from "../verifier/bc-adapter.mjs";
import { KeyRing } from "../src/crypto.mjs";
import { loadConfig } from "../src/config.mjs";

test("Member Number alone never yields a session; wrong sender/proof/origin and replay are rejected", async (t) => {
  const f = await fixture(t),
    c = await f.ok(
      "POST",
      "/v1/auth/challenges",
      { memberNumber: 101 },
      undefined,
      201,
    );
  assert.equal(
    (
      await f.request("POST", "/v1/auth/exchange", {
        challengeId: c.challengeId,
        exchange: c.exchange,
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await f.verify({
        challengeId: c.challengeId,
        proof: c.proof,
        sender: 202,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await f.verify({
        challengeId: c.challengeId,
        proof: "a".repeat(43),
        sender: 101,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await f.request("POST", "/verify", {
        challengeId: c.challengeId,
        proof: c.proof,
        sender: 101,
      })
    ).statusCode,
    401,
  );
  assert.equal(
    (
      await f.verifier.inject({
        method: "POST",
        url: "/verify",
        payload: { challengeId: c.challengeId, proof: c.proof, sender: 101 },
      })
    ).statusCode,
    403,
  );
  await f.verify({ challengeId: c.challengeId, proof: c.proof, sender: 101 });
  const exchange = { challengeId: c.challengeId, exchange: c.exchange };
  assert.equal(
    (
      await f.request("POST", "/v1/auth/exchange", exchange, undefined, {
        origin: "https://evil.test",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (await f.request("POST", "/v1/auth/exchange", exchange)).statusCode,
    200,
  );
  assert.equal(
    (await f.request("POST", "/v1/auth/exchange", exchange)).statusCode,
    401,
  );
});
test("Expiry, allowlist, logout, server-side session revocation, and no cookies", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.request("POST", "/v1/auth/challenges", { memberNumber: 999 }))
      .statusCode,
    403,
  );
  const c = await f.ok(
    "POST",
    "/v1/auth/challenges",
    { memberNumber: 101 },
    undefined,
    201,
  );
  f.advance(180001);
  assert.equal(
    (
      await f.verify({
        challengeId: c.challengeId,
        proof: c.proof,
        sender: 101,
      })
    ).statusCode,
    403,
  );
  await f.login(101);
  assert.equal(
    (await f.request("GET", "/v1/me", undefined, 101)).headers["set-cookie"],
    undefined,
  );
  await f.ok("POST", "/v1/auth/logout", {}, 101, 204);
  assert.equal(
    (await f.request("GET", "/v1/me", undefined, 101)).statusCode,
    401,
  );
  await f.login(101);
  f.advance(3600001);
  assert.equal(
    (await f.request("GET", "/v1/me", undefined, 101)).statusCode,
    401,
  );
});
test("Profile reads need no room encounter; all writes bind the session and use optimistic revisions", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  await f.login(202);
  const own = {
    displayName: "Kiki",
    bio: "private database canary",
    revision: 0,
  };
  const p = await f.ok("PUT", "/v1/profiles/me", own);
  assert.equal(p.revision, 1);
  const other = await f.ok("GET", "/v1/profiles/101", undefined, 202);
  assert.equal(other.displayName, "Kiki");
  assert.equal(
    (await f.request("PUT", "/v1/profiles/101", own, 202)).statusCode,
    404,
  );
  assert.equal(
    (
      await f.request(
        "PUT",
        "/v1/profiles/me",
        { ...own, memberNumber: 101 },
        202,
      )
    ).statusCode,
    400,
  );
  assert.equal(
    (await f.request("PUT", "/v1/profiles/me", own, 101)).statusCode,
    409,
  );
  assert.equal(
    (
      await f.request(
        "PUT",
        "/v1/profiles/me",
        { ...own, revision: 1, profileOutlineColor: "url(javascript:evil)" },
        101,
      )
    ).statusCode,
    400,
  );
  assert.equal((await f.request("GET", "/v1/profiles/101")).statusCode, 401);
  const row = f.db.get("SELECT payload FROM profiles WHERE member_number=101");
  assert.ok(!row.payload.includes(own.bio));
  await f.ok("PUT", "/v1/profiles/me", { ...own, revision: 1, visible: false });
  assert.equal(
    (await f.request("GET", "/v1/profiles/101", undefined, 202)).statusCode,
    404,
  );
});
test("Group invitation is not membership; native friendships/rooms do not enter Cloud authorization", async (t) => {
  const f = await fixture(t);
  for (const m of [101, 202, 303, 404]) await f.login(m);
  const g = await f.ok(
    "POST",
    "/v1/groups",
    { title: "Across rooms", members: [202, 303] },
    101,
    201,
  );
  assert.equal(
    (await f.request("GET", `/v1/groups/${g.id}`, undefined, 202)).statusCode,
    404,
  );
  assert.equal(
    (
      await f.request(
        "GET",
        `/v1/conversations/${g.conversationId}/messages`,
        undefined,
        404,
      )
    ).statusCode,
    404,
  );
  await f.ok("POST", `/v1/groups/${g.id}/accept`, {}, 202);
  assert.equal(
    (
      await f.request(
        "POST",
        `/v1/groups/${g.id}/invitations`,
        { memberNumber: 404 },
        202,
      )
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await f.request(
        "PUT",
        `/v1/groups/${g.id}/members/202/role`,
        { role: "owner" },
        202,
      )
    ).statusCode,
    403,
  );
  assert.equal(
    (await f.request("POST", `/v1/groups/${g.id}/accept`, {}, 404)).statusCode,
    404,
  );
  const p = await f.ok("GET", `/v1/groups/${g.id}`, undefined, 202);
  assert.equal(p.title, "Across rooms");
});
test("Membership changes rotate keys, reject stale writes, prevent removed/re-added history access", async (t) => {
  const f = await fixture(t);
  let g = await group(f);
  const envelope = {
    clientId: randomUUID(),
    text: "encrypted message canary",
    membershipVersion: g.membershipVersion,
    keyVersion: g.keyVersion,
    schemaVersion: 1,
    encryption: "server-aes-256-gcm",
  };
  const first = await f.ok(
    "POST",
    `/v1/conversations/${g.conversationId}/messages`,
    envelope,
    202,
    201,
  );
  const repeated = await f.ok(
    "POST",
    `/v1/conversations/${g.conversationId}/messages`,
    envelope,
    202,
    201,
  );
  assert.equal(first.id, repeated.id);
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM messages").n, 1);
  assert.ok(
    !f.db.get("SELECT envelope FROM messages").envelope.includes(envelope.text),
  );
  await f.ok("DELETE", `/v1/groups/${g.id}/members/202`, undefined, 101, 204);
  assert.equal(
    (
      await f.request(
        "GET",
        `/v1/conversations/${g.conversationId}/messages`,
        undefined,
        202,
      )
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await f.request(
        "POST",
        `/v1/conversations/${g.conversationId}/messages`,
        { ...envelope, clientId: randomUUID() },
        101,
      )
    ).statusCode,
    409,
  );
  await f.ok(
    "POST",
    `/v1/groups/${g.id}/invitations`,
    { memberNumber: 202 },
    101,
    204,
  );
  g = await f.ok("POST", `/v1/groups/${g.id}/accept`, {}, 202);
  assert.ok(g.keyVersion > envelope.keyVersion);
  assert.deepEqual(
    (
      await f.ok(
        "GET",
        `/v1/conversations/${g.conversationId}/messages`,
        undefined,
        202,
      )
    ).items,
    [],
  );
  assert.equal(
    (
      await f.request(
        "POST",
        `/v1/conversations/${g.conversationId}/messages`,
        envelope,
        202,
      )
    ).statusCode,
    404,
  );
  await f.ok(
    "POST",
    `/v1/conversations/${g.conversationId}/messages`,
    {
      ...envelope,
      clientId: randomUUID(),
      membershipVersion: g.membershipVersion,
      keyVersion: g.keyVersion,
    },
    202,
    201,
  );
  assert.equal(
    (
      await f.ok(
        "GET",
        `/v1/conversations/${g.conversationId}/messages`,
        undefined,
        202,
      )
    ).items.length,
    1,
  );
});
test("Message encryption refuses envelope tampering and invented E2EE modes", async (t) => {
  const f = await fixture(t);
  const g = await group(f);
  const input = {
    clientId: randomUUID(),
    text: "hello",
    membershipVersion: g.membershipVersion,
    keyVersion: g.keyVersion,
    schemaVersion: 1,
    encryption: "e2ee",
  };
  assert.equal(
    (
      await f.request(
        "POST",
        `/v1/conversations/${g.conversationId}/messages`,
        input,
        101,
      )
    ).statusCode,
    400,
  );
  const msg = await f.ok(
    "POST",
    `/v1/conversations/${g.conversationId}/messages`,
    { ...input, encryption: "server-aes-256-gcm" },
    101,
    201,
  );
  const row = f.db.get("SELECT envelope FROM messages WHERE id=?", msg.id),
    e = JSON.parse(row.envelope);
  e.tag = "a".repeat(22);
  f.db.run(
    "UPDATE messages SET envelope=? WHERE id=?",
    JSON.stringify(e),
    msg.id,
  );
  assert.equal(
    (
      await f.request(
        "GET",
        `/v1/conversations/${g.conversationId}/messages`,
        undefined,
        202,
      )
    ).statusCode,
    503,
  );
});
test("Blocks are bidirectional for profile/feed/media/presence; presence accepts no room history", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  await f.login(202);
  await f.ok("PUT", "/v1/profiles/me", { displayName: "Kiki", revision: 0 });
  await f.ok("POST", "/v1/feed", { text: "visible before block" }, 101, 201);
  assert.equal(
    (
      await f.request(
        "PUT",
        "/v1/presence",
        { status: "online", room: "do not store this" },
        101,
      )
    ).statusCode,
    400,
  );
  await f.ok("PUT", "/v1/presence", { status: "online" }, 101, 204);
  await f.ok("PUT", "/v1/blocks/101", {}, 202, 204);
  assert.equal(
    (await f.request("GET", "/v1/profiles/101", undefined, 202)).statusCode,
    404,
  );
  assert.deepEqual((await f.ok("GET", "/v1/feed", undefined, 202)).items, []);
  assert.equal(
    (await f.request("GET", "/v1/presence/101", undefined, 202)).statusCode,
    404,
  );
  f.advance(180001);
  await f.cleanup();
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM presence").n, 0);
});
test("Exact CORS, content type, size, unknown fields and persistent request limits", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  const pre = await f.request("OPTIONS", "/v1/feed", undefined, undefined, {
    "access-control-request-method": "POST",
    "access-control-request-headers": "authorization, content-type",
  });
  assert.equal(pre.statusCode, 204);
  assert.equal(pre.headers["access-control-allow-credentials"], undefined);
  assert.equal(
    (
      await f.request("GET", "/v1/feed", undefined, 101, {
        origin: "https://bondageprojects.elementfx.com.evil.test",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await f.request("POST", "/v1/feed", "text", 101, {
        "content-type": "text/plain",
      })
    ).statusCode,
    415,
  );
  assert.equal(
    (await f.request("POST", "/v1/feed", { text: "x".repeat(20000) }, 101))
      .statusCode,
    413,
  );
  assert.equal(
    (await f.request("GET", "/v1/feed?limit=999", undefined, 101)).statusCode,
    400,
  );
  for (let i = 0; i < 5; i++)
    await f.request("POST", "/v1/auth/challenges", { memberNumber: 202 });
  assert.equal(
    (await f.request("POST", "/v1/auth/challenges", { memberNumber: 202 }))
      .statusCode,
    429,
  );
  f.advance(600001);
  assert.equal(
    (await f.request("POST", "/v1/auth/challenges", { memberNumber: 202 }))
      .statusCode,
    201,
  );
});
test("Trusted verifier uses BC server envelope identity and ignores forged body/relays", async (t) => {
  const f = await fixture(t);
  const c = await f.ok(
      "POST",
      "/v1/auth/challenges",
      { memberNumber: 101 },
      undefined,
      201,
    ),
    socket = new EventEmitter();
  socket.connected = true;
  let identity = 909,
    forwarded = [];
  const stop = attachCloudVerifier(socket, {
    expectedVerifierMember: 909,
    allowedMembers: f.config.testMembers,
    getAuthenticatedMemberNumber: () => {
      if (identity === -1) throw new Error("socket account unavailable");
      return identity;
    },
    endpoint: "http://127.0.0.1:8792/verify",
    secret: f.config.verifierSecret,
    fetchImpl: async (_url, req) => {
      forwarded.push(JSON.parse(req.body));
      await f.verify(JSON.parse(req.body));
      return { body: null };
    },
  });
  t.after(stop);
  const data = {
    t: "cloud-verify",
    v: 1,
    challengeId: c.challengeId,
    proof: c.proof,
  };
  socket.emit("AccountBeep", {
    MemberNumber: 202,
    BeepType: "KikiLink",
    Message: "KIKILINK/1 " + JSON.stringify({ ...data, sender: 101 }),
  });
  socket.emit("AccountBeep", {
    MemberNumber: 202,
    BeepType: "KikiLink",
    Message: "KIKILINK/1 " + JSON.stringify(data),
  });
  await new Promise(setImmediate);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].sender, 202);
  assert.equal(
    (
      await f.request("POST", "/v1/auth/exchange", {
        challengeId: c.challengeId,
        exchange: c.exchange,
      })
    ).statusCode,
    409,
  );
  identity = -1;
  assert.doesNotThrow(() =>
    socket.emit("ChatRoomMessage", {
      Sender: 101,
      Type: "Hidden",
      Content: "KIKILINK/1 " + JSON.stringify(data),
    }),
  );
  identity = 999;
  socket.emit("ChatRoomMessage", {
    Sender: 101,
    Type: "Hidden",
    Content: "KIKILINK/1 " + JSON.stringify(data),
  });
  await new Promise(setImmediate);
  assert.equal(forwarded.length, 1);
  identity = 909;
  socket.emit("ChatRoomMessage", {
    Sender: 101,
    Type: "Hidden",
    Content: "KIKILINK/1 " + JSON.stringify(data),
  });
  await new Promise(setImmediate);
  assert.equal(
    (
      await f.request("POST", "/v1/auth/exchange", {
        challengeId: c.challengeId,
        exchange: c.exchange,
      })
    ).statusCode,
    200,
  );
});
test("Key rotation retains old decrypt capability; wrong context and missing keys fail closed", async (t) => {
  const f = await fixture(t),
    sealed = f.keys.seal({ message: "sensitive" }, "resource:one");
  assert.throws(() => f.keys.open(sealed, "resource:two"));
  const rotated = new KeyRing(
    {
      old: f.keys.keys.get("test").toString("base64"),
      test: f.keys.keys.get("test").toString("base64"),
    },
    "old",
  );
  assert.deepEqual(rotated.open(sealed, "resource:one"), {
    message: "sensitive",
  });
  assert.throws(() =>
    new KeyRing(
      { new: f.keys.keys.get("test").toString("base64") },
      "new",
    ).open(sealed, "resource:one"),
  );
  assert.throws(() => loadConfig({}));
  assert.ok(
    !readFileSync(
      new URL("../src/config.mjs", import.meta.url),
      "utf8",
    ).includes("0.0.0.0"),
  );
});
