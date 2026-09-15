import test from "node:test";
import assert from "node:assert/strict";
import { fixture, group } from "./helpers.mjs";
const message = (g, text) => ({ text, clientId: crypto.randomUUID(), membershipVersion: g.membershipVersion, keyVersion: g.keyVersion, schemaVersion: 1, encryption: "server-aes-256-gcm" });

test("Pins are shared, versioned, owner/admin only, and never duplicate message content", async t => {
  const f = await fixture(t), g = await group(f), path = `/v1/groups/${g.id}/pin`;
  const sent = await f.ok("POST", `/v1/conversations/${g.conversationId}/messages`, message(g, "Pinned text"), 101, 201);
  assert.equal((await f.request("PUT", path, { messageId: sent.id, revision: 0 }, 202)).statusCode, 403);
  const pinned = await f.ok("PUT", path, { messageId: sent.id, revision: 0 });
  assert.equal(pinned.pinRevision, 1); assert.equal(pinned.pinnedMessage.text, "Pinned text");
  assert.equal((await f.ok("GET", `/v1/groups/${g.id}`, undefined, 202)).pinnedMessage.id, sent.id);
  assert.equal((await f.ok("GET", `/v1/conversations/${g.conversationId}/messages/${sent.id}`, undefined, 202)).text, "Pinned text");
  assert.equal((await f.request("PUT", path, { messageId: null, revision: 0 }, 101)).statusCode, 409);
  await f.ok("PUT", `/v1/groups/${g.id}/members/202/role`, { role: "admin" }, 101, 204);
  assert.equal((await f.ok("PUT", path, { messageId: null, revision: 1 }, 202)).pinnedMessage, null);
  assert.deepEqual(Object.keys(f.db.get("SELECT * FROM group_pins WHERE group_id=?", g.id)).sort(), ["group_id", "message_id", "revision"]);
});

test("Pins and direct message lookup retain membership, block and join-history boundaries", async t => {
  const f = await fixture(t), g = await group(f), path = `/v1/groups/${g.id}/pin`;
  const sent = await f.ok("POST", `/v1/conversations/${g.conversationId}/messages`, message(g, "Private"), 101, 201);
  await f.ok("PUT", path, { messageId: sent.id, revision: 0 });
  assert.equal((await f.request("GET", `/v1/conversations/${g.conversationId}/messages/${sent.id}`, undefined, 404)).statusCode, 404);
  await f.ok("PUT", "/v1/blocks/101", {}, 202, 204);
  assert.equal((await f.ok("GET", `/v1/groups/${g.id}`, undefined, 202)).pinnedMessage, null);
  assert.equal((await f.request("GET", `/v1/conversations/${g.conversationId}/messages/${sent.id}`, undefined, 202)).statusCode, 404);
  await f.ok("DELETE", "/v1/blocks/101", undefined, 202, 204);
  await f.ok("DELETE", `/v1/groups/${g.id}/members/202`, undefined, 101, 204);
  assert.equal((await f.request("GET", `/v1/conversations/${g.conversationId}/messages/${sent.id}`, undefined, 202)).statusCode, 404);
  await f.ok("POST", `/v1/groups/${g.id}/invitations`, { memberNumber: 202 }, 101, 204);
  await f.ok("POST", `/v1/groups/${g.id}/accept`, {}, 202);
  assert.equal((await f.ok("GET", `/v1/groups/${g.id}`, undefined, 202)).pinnedMessage, null);
  assert.equal((await f.request("GET", `/v1/conversations/${g.conversationId}/messages/${sent.id}`, undefined, 202)).statusCode, 404);
});

test("Deletion/retention cannot be bypassed through pins and a stale pin can be replaced", async t => {
  const f = await fixture(t), g = await group(f), path = `/v1/groups/${g.id}/pin`;
  const sent = await f.ok("POST", `/v1/conversations/${g.conversationId}/messages`, message(g, "Soon removed"), 101, 201);
  await f.ok("PUT", path, { messageId: sent.id, revision: 0 });
  await f.ok("DELETE", `/v1/conversations/${g.conversationId}/messages/${sent.id}`, undefined, 101, 204);
  assert.equal((await f.ok("GET", `/v1/groups/${g.id}`)).pinnedMessage.text, null);
  assert.equal((await f.request("PUT", path, { messageId: sent.id, revision: 1 }, 101)).statusCode, 404);
  f.db.run("DELETE FROM messages WHERE id=?", sent.id);
  const missing = await f.ok("GET", `/v1/groups/${g.id}`);
  assert.equal(missing.pinnedMessage, null); assert.equal(missing.pinRevision, 1);
  const next = await f.ok("POST", `/v1/conversations/${g.conversationId}/messages`, message(g, "New pin"), 101, 201);
  await f.ok("PUT", path, { messageId: next.id, revision: 1 });
  f.db.run("UPDATE messages SET created_at=? WHERE id=?", Date.now() - 31 * 86400000, next.id);
  assert.equal((await f.ok("GET", `/v1/groups/${g.id}`)).pinnedMessage, null);
  assert.equal((await f.request("GET", `/v1/conversations/${g.conversationId}/messages/${next.id}`, undefined, 101)).statusCode, 404);
});
