import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { fixture } from "./helpers.mjs";

async function clientFixture(t) {
  const f = await fixture(t);
  const file = join(f.dir, "client.mjs");
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
  let offline = false;
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({
      url,
      method: options.method,
      credentials: options.credentials,
      redirect: options.redirect,
    });
    if (offline) throw new TypeError("network offline");
    let payload = options.body;
    if (payload instanceof Blob)
      payload = Buffer.from(await payload.arrayBuffer());
    const response = await f.app.inject({
      method: options.method ?? "GET",
      url: new URL(url).pathname + new URL(url).search,
      headers: { origin: f.origin, ...options.headers },
      ...(payload !== undefined ? { payload } : {}),
    });
    return new Response(
      response.statusCode === 204 ? null : response.rawPayload,
      { status: response.statusCode, headers: response.headers },
    );
  };
  const make = (member) => {
    let current = member;
    const proofs = [];
    const client = new CloudClient({
      origin: f.config.origin,
      memberNumber: member,
      getMemberNumber: () => current,
      isBlocked: () => false,
      fetchImpl,
      sendProof: (_target, payload) => {
        const p = JSON.parse(payload);
        proofs.push(
          f.verify({
            challengeId: p.challengeId,
            proof: p.proof,
            sender: member,
          }),
        );
      },
    });
    t.after(() => client.destroy());
    return {
      client,
      switchAccount: (m) => {
        current = m;
      },
      login: async () => {
        await client.beginIdentity();
        await Promise.all(proofs);
        await client.finishIdentity();
      },
    };
  };
  return {
    ...f,
    make,
    calls,
    setOffline: (value) => {
      offline = value;
    },
  };
}
test("Three real addon clients use API profiles and groups without BC rooms or friend lists", async (t) => {
  const f = await clientFixture(t),
    a = f.make(101),
    b = f.make(202),
    c = f.make(303);
  assert.equal(f.calls.length, 0);
  for (const x of [a, b, c]) await x.login();
  await a.client.request("PUT", "/v1/profiles/me", {
    displayName: "Cloud Kiki",
    bio: "No encounter required",
    revision: 0,
  });
  assert.equal((await b.client.profile(101)).displayName, "Cloud Kiki");
  let g = await a.client.request("POST", "/v1/groups", {
    title: "Cross-room group",
    members: [202, 303],
  });
  await b.client.request("POST", `/v1/groups/${g.id}/accept`, {});
  g = await c.client.request("POST", `/v1/groups/${g.id}/accept`, {});
  const input = {
    clientId: randomUUID(),
    text: "Across rooms and devices",
    membershipVersion: g.membershipVersion,
    keyVersion: g.keyVersion,
    schemaVersion: 1,
    encryption: "server-aes-256-gcm",
  };
  await b.client.request(
    "POST",
    `/v1/conversations/${g.conversationId}/messages`,
    input,
  );
  const reloaded = f.make(303);
  await reloaded.login();
  assert.equal(
    (
      await reloaded.client.request(
        "GET",
        `/v1/conversations/${g.conversationId}/messages`,
      )
    ).items[0].text,
    input.text,
  );
  assert.ok(
    f.calls.every((r) => r.credentials === "omit" && r.redirect === "error"),
  );
  f.setOffline(true);
  await assert.rejects(
    () => a.client.request("GET", "/v1/feed"),
    (e) => e.status === 503,
  );
  await assert.rejects(
    () => a.client.request("POST", "/v1/feed", { text: "unsent" }),
    (e) => e.status === 503,
  );
  const before = f.calls.length;
  await assert.rejects(() => a.client.request("GET", "/v1/feed"));
  assert.equal(
    f.calls.length,
    before,
    "circuit breaker avoids repeated backend requests",
  );
});
test("Client profile cache deduplicates reads, clears removed data, and cannot cross BC accounts", async (t) => {
  const f = await clientFixture(t),
    a = f.make(101),
    b = f.make(202);
  await a.login();
  await b.login();
  await a.client.request("PUT", "/v1/profiles/me", {
    displayName: "Cached Kiki",
    revision: 0,
  });
  const before = f.calls.length;
  await Promise.all([
    b.client.profile(101),
    b.client.profile(101),
    b.client.profile(101),
  ]);
  assert.equal(f.calls.length - before, 1);
  await b.client.profile(101);
  assert.equal(f.calls.length - before, 1);
  await a.client.request("DELETE", "/v1/profiles/me");
  const fallback = await b.client.profile(101, true);
  assert.equal(fallback.isDefault, true);
  assert.equal(fallback.avatarId, null);
  assert.equal(fallback.bio, "");
  assert.equal(fallback.displayName, "Member 101");
  assert.deepEqual(await b.client.profile(101), fallback);
  b.switchAccount(303);
  await assert.rejects(
    () => b.client.request("GET", "/v1/feed"),
    /account_changed/,
  );
  assert.equal(b.client.connected, false);
});
test("Feed retries are idempotent and conflicting request reuse cannot overwrite acknowledged content", async (t) => {
  const f = await clientFixture(t),
    a = f.make(101);
  await a.login();
  const input = {
    clientId: randomUUID(),
    text: "Exactly one post",
    mediaIds: [],
  };
  const first = await a.client.request("POST", "/v1/feed", input);
  const second = await a.client.request("POST", "/v1/feed", input);
  assert.equal(first.id, second.id);
  await assert.rejects(
    () =>
      a.client.request("POST", "/v1/feed", {
        ...input,
        text: "A different post",
      }),
    (e) => e.code === "idempotency_conflict",
  );
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM posts").n, 1);
});
