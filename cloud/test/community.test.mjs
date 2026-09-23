import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";

async function setup(t) {
  const f = await fixture(t);
  for (const n of [101, 202, 303, 606]) await f.login(n);
  for (const n of [101, 202]) await f.ok("PUT", "/v1/capabilities/me", { friendRequests: true, directMessages: true }, n);
  return f;
}
async function friends(f) {
  await f.ok("POST", "/v1/relationships/202/request", {}, 101);
  await f.ok("POST", "/v1/relationships/confirm", { members: [202] }, 101);
  await f.ok("POST", "/v1/relationships/101/accept", {}, 202);
  await f.ok("POST", "/v1/relationships/confirm", { members: [101] }, 202);
}
test("Requests require capabilities, handle crossing/idempotency, and retain separate native grants", async t => {
  const f = await setup(t);
  assert.equal((await f.request("POST", "/v1/relationships/303/request", {}, 101)).statusCode, 409);
  assert.equal((await f.ok("POST", "/v1/relationships/202/request", {}, 101)).state, "sent");
  assert.equal((await f.ok("POST", "/v1/relationships/101/request", {}, 202)).state, "received");
  assert.equal(f.db.get("SELECT count(*) AS n FROM relationships").n, 1);
  assert.equal((await f.ok("GET", "/v1/mailbox", undefined, 202)).items.length, 1);
  assert.equal((await f.request("POST", "/v1/relationships/202/accept", {}, 101)).statusCode, 403);
  const accepted = await f.ok("POST", "/v1/relationships/101/accept", {}, 202);
  assert.equal(accepted.canMessage, false); assert.equal(accepted.nativeSyncRequired, true);
  assert.equal((await f.ok("POST", "/v1/relationships/101/accept", {}, 202)).revision, accepted.revision);
  for (const [actor, peer] of [[101,202],[202,101]]) await f.ok("POST", "/v1/relationships/confirm", { members: [peer] }, actor);
  assert.equal((await f.ok("GET", "/v1/relationships/202", undefined, 101)).canMessage, true);
  await f.ok("DELETE", "/v1/relationships/202", undefined, 101, 204);
  assert.deepEqual((await f.ok("POST", "/v1/relationships/confirm", { members: [202] }, 101)).confirmed, []);
  assert.equal((await f.ok("GET", "/v1/relationships/202", undefined, 101)).state, "revoked");
});
test("Existing friends bootstrap silently and only with both authenticated grants", async t => {
  const f = await setup(t);
  await f.ok("POST", "/v1/relationships/confirm", { members: [202,303] }, 101);
  assert.equal((await f.ok("GET", "/v1/relationships/202", undefined, 101)).canMessage, false);
  await f.ok("POST", "/v1/relationships/confirm", { members: [101] }, 202);
  assert.equal((await f.ok("GET", "/v1/relationships/202", undefined, 101)).canMessage, true);
  assert.equal(f.db.get("SELECT count(*) AS n FROM mailbox").n, 0);
});
test("Offline DM persists without sender, retries once, and Delivered follows recipient acknowledgment", async t => {
  const f = await setup(t); await friends(f);
  const input = { clientMessageId: crypto.randomUUID(), text: "Offline message", createdAt: Date.now() };
  const sent = await f.ok("POST", "/v1/direct/202/messages", input, 101, 201);
  assert.equal(sent.state, "sent"); assert.equal(sent.deliveredAt, null);
  assert.deepEqual(await f.ok("POST", "/v1/direct/202/messages", input, 101, 201), sent);
  assert.equal(f.db.get("SELECT count(*) AS n FROM direct_messages").n, 1);
  assert.ok(!f.db.get("SELECT payload FROM direct_messages").payload.includes(input.text));
  assert.equal((await f.request("POST", "/v1/direct/acknowledge", { ids: [sent.id] }, 303)).statusCode, 404);
  await f.ok("POST", "/v1/auth/logout", {}, 101, 204);
  const inbox = await f.ok("GET", "/v1/direct/inbox", undefined, 202);
  assert.equal(inbox.items[0].text, input.text);
  assert.equal(f.db.get("SELECT state FROM direct_messages").state, "sent");
  await f.ok("POST", "/v1/direct/acknowledge", { ids: [sent.id] }, 202);
  await f.ok("POST", "/v1/direct/acknowledge", { ids: [sent.id] }, 202);
  assert.equal(f.db.get("SELECT count(*) AS n FROM direct_receipts").n, 1);
  await f.ok("PUT", "/v1/read-cursors", { items: [{ scope: "direct:101", cursor: sent.sequence }] }, 202);
  assert.equal(f.db.get("SELECT count(*) AS n FROM direct_receipts").n, 2);
  await f.login(101);
  const receipts = (await f.ok("GET", "/v1/direct/receipts", undefined, 101)).items;
  assert.deepEqual(receipts.map(item => item.state), ["delivered", "read"]);
  assert.ok(receipts.every(item => item.recipient === 202));

  const second = await f.ok("POST", "/v1/direct/202/messages", {
    clientMessageId: crypto.randomUUID(), text: "Read cursor arrived first", createdAt: Date.now(),
  }, 101, 201);
  await f.ok("PUT", "/v1/read-cursors", { items: [{ scope: "direct:101", cursor: second.sequence }] }, 202);
  assert.equal(f.db.get("SELECT count(*) AS n FROM direct_receipts WHERE message_id=?", second.id).n, 0);
  await f.ok("POST", "/v1/direct/acknowledge", { ids: [second.id] }, 202);
  assert.deepEqual(f.db.all("SELECT state FROM direct_receipts WHERE message_id=? ORDER BY sequence", second.id).map(row => row.state), ["delivered", "read"]);
  assert.deepEqual((await f.ok("GET", "/v1/direct/inbox", undefined, 303)).items, []);
});
test("Blocking before retrieval revokes pending delivery and cannot be undone by bootstrap", async t => {
  const f = await setup(t); await friends(f);
  const sent = await f.ok("POST", "/v1/direct/202/messages", { clientMessageId: crypto.randomUUID(), text: "Do not deliver", createdAt: Date.now() }, 101, 201);
  await f.ok("PUT", "/v1/blocks/101", {}, 202, 204);
  assert.deepEqual((await f.ok("GET", "/v1/direct/inbox", undefined, 202)).items, []);
  assert.equal((await f.request("POST", "/v1/direct/acknowledge", { ids: [sent.id] }, 202)).statusCode, 403);
  assert.equal(f.db.get("SELECT payload FROM direct_messages").payload, null);
  await f.ok("DELETE", "/v1/blocks/101", undefined, 202, 204);
  await f.ok("POST", "/v1/relationships/confirm", { members: [101] }, 202);
  assert.equal((await f.ok("GET", "/v1/relationships/101", undefined, 202)).canMessage, false);
});
test("Cancel and decline resolve requests without adding rejection notifications", async t => {
  const f = await setup(t);
  await f.ok("POST", "/v1/relationships/202/request", {}, 101);
  await f.ok("POST", "/v1/relationships/101/decline", {}, 202);
  assert.equal((await f.ok("GET", "/v1/mailbox", undefined, 101)).items.length, 0);
  assert.equal((await f.ok("GET", "/v1/mailbox", undefined, 202)).items[0].pending, false);
  f.advance(61_000);
  await f.ok("POST", "/v1/relationships/202/request", {}, 101);
  await f.ok("POST", "/v1/relationships/202/cancel", {}, 101);
  assert.equal((await f.ok("GET", "/v1/relationships/101", undefined, 202)).state, "cancelled");
});
test("Feed cursor baseline, self exclusion, mailbox aggregation and private reads", async t => {
  const f = await setup(t);
  const post = await f.ok("POST", "/v1/feed", { text: "Hello", mediaIds: [], clientId: crypto.randomUUID() }, 101, 201);
  assert.equal((await f.ok("GET", "/v1/feed/unread", undefined, 202)).unread, 0);
  const second = await f.ok("POST", "/v1/feed", { text: "New", mediaIds: [], clientId: crypto.randomUUID() }, 101, 201);
  assert.equal((await f.ok("GET", "/v1/feed/unread", undefined, 202)).unread, 1);
  await f.ok("PUT", "/v1/read-cursors/feed", { cursor: second.id }, 202);
  await f.ok("PUT", "/v1/read-cursors/feed", { cursor: post.id }, 202);
  assert.equal((await f.ok("GET", "/v1/feed/unread", undefined, 202)).unread, 0);
  await f.ok("POST", `/v1/feed/${post.id}/comments`, { text: "Comment" }, 202, 201);
  for (const n of [202,303]) await f.ok("PUT", `/v1/reactions/post/${post.id}`, { reaction: "heart" }, n);
  const box = await f.ok("GET", "/v1/mailbox", undefined, 101);
  assert.equal(box.unread, 2); assert.equal(box.items.find(i => i.kind === "reaction").count, 2);
  assert.equal((await f.request("POST", "/v1/mailbox/read", { id: box.items[0].id }, 202)).statusCode, 404);
  await f.ok("POST", "/v1/mailbox/read", {}, 101, 204);
  await f.ok("PUT", `/v1/reactions/post/${post.id}`, { reaction: "heart" }, 303);
  assert.equal((await f.ok("GET", "/v1/mailbox", undefined, 101)).unread, 0);
});

test("Feed unread survives logout and includes posts created while the reader was offline", async t => {
  const f = await setup(t);
  await f.ok("POST", "/v1/feed", { text: "Previously seen", mediaIds: [], clientId: crypto.randomUUID() }, 202, 201);
  assert.equal((await f.ok("GET", "/v1/feed/unread", undefined, 101)).unread, 0);
  await f.ok("POST", "/v1/auth/logout", {}, 101, 204);
  let latest;
  for (const author of [202, 303, 202]) latest = await f.ok("POST", "/v1/feed", {
    text: "Posted while offline", mediaIds: [], clientId: crypto.randomUUID(),
  }, author, 201);
  await f.login(101);
  assert.equal((await f.ok("GET", "/v1/feed/unread", undefined, 101)).unread, 3);
  await f.ok("GET", "/v1/feed", undefined, 101);
  assert.equal((await f.ok("GET", "/v1/feed/unread", undefined, 101)).unread, 3, "fetching a page does not mark it read");
  await f.ok("PUT", "/v1/read-cursors/feed", { cursor: latest.id }, 101);
  assert.equal((await f.ok("GET", "/v1/feed/unread", undefined, 101)).unread, 0);
  await f.ok("POST", "/v1/auth/logout", {}, 101, 204); await f.login(101);
  assert.equal((await f.ok("GET", "/v1/feed/unread", undefined, 101)).unread, 0);
});
