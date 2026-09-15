import test from "node:test";
import assert from "node:assert/strict";
import { fixture, group } from "./helpers.mjs";

test("Search advances through encrypted nonmatching windows and keeps an insert-stable cursor", async t => {
  const f = await fixture(t); await f.login(101);
  const older = f.feed.create(101, { text: "Ｃａｔ café", mediaIds: [] });
  for (let i = 0; i < 201; i++) f.feed.create(101, { text: `Other ${i}`, mediaIds: [] });
  const first = await f.ok("GET", "/v1/feed?q=cat&limit=20");
  assert.deepEqual(first.items, []); assert.ok(first.nextCursor > older.id);
  f.feed.create(101, { text: "Cat new", mediaIds: [] });
  const next = await f.ok("GET", `/v1/feed?q=cat&limit=20&cursor=${first.nextCursor}`);
  assert.deepEqual(next.items.map(p => p.id), [older.id]); assert.equal(next.nextCursor, null);
  assert.ok(!Buffer.from(f.db.get("SELECT payload FROM posts WHERE id=?", older.id).payload).includes(Buffer.from("café")));
  assert.deepEqual((await f.ok("GET", "/v1/feed?q=%2399999999999999999999999")).items, []);
});
test("Search and comment counts exclude blocked, removed and disabled authors", async t => {
  const f = await fixture(t); await f.login(101); await f.login(202); await f.login(303);
  const p = f.feed.create(101, { text: "sunset", mediaIds: [] });
  f.feed.create(202, { text: "sunset private", mediaIds: [] });
  f.feed.create(303, { text: "sunset disabled", mediaIds: [] });
  f.feed.comment(202, p.id, "hidden comment"); f.feed.comment(101, p.id, "visible comment");
  await f.ok("PUT", "/v1/blocks/101", {}, 202, 204);
  f.db.run("UPDATE users SET disabled=1 WHERE member_number=303");
  const result = await f.ok("GET", "/v1/feed?q=sunset");
  assert.deepEqual(result.items.map(x => x.author), [101]); assert.equal(result.items[0].commentCount, 1);
  assert.deepEqual((await f.ok("GET", "/v1/feed?q=%23202")).items, []);
  await f.ok("DELETE", `/v1/feed/${p.id}`, undefined, 101, 204);
  assert.deepEqual((await f.ok("GET", "/v1/feed?q=sunset")).items, []);
});
test("Seven emoji reactions replace one another without losing old reaction compatibility", async t => {
  const f = await fixture(t); await f.login(101);
  const p = f.feed.create(101, { text: "hello", mediaIds: [] });
  const features = (await f.ok("GET", "/v1/me")).features;
  assert.equal(features.feedSearch, true);
  for (const reaction of ["heart", "like", "laugh", "support", "dislike", "wow", "sad"]) {
    assert.ok(features.reactions.includes(reaction));
    const value = await f.ok("PUT", `/v1/reactions/post/${p.id}`, { reaction });
    assert.equal(value.mine, reaction); assert.deepEqual(value.counts, [{ reaction, count: 1 }]);
  }
  assert.equal((await f.request("PUT", `/v1/reactions/post/${p.id}`, { reaction: "arbitrary" }, 101)).statusCode, 400);
  assert.equal((await f.ok("PUT", `/v1/reactions/post/${p.id}`, { reaction: null })).mine, null);
});
test("Group refresh returns removal IDs for an accepted member's visible history only", async t => {
  const f = await fixture(t), g = await group(f);
  const message = await f.ok("POST", `/v1/conversations/${g.conversationId}/messages`, {
    text: "Visible then removed", clientId: crypto.randomUUID(), membershipVersion: g.membershipVersion,
    keyVersion: g.keyVersion, schemaVersion: 1, encryption: "server-aes-256-gcm",
  }, 101, 201);
  await f.ok("DELETE", `/v1/conversations/${g.conversationId}/messages/${message.id}`, undefined, 101, 204);
  const path = `/v1/conversations/${g.conversationId}/messages?direction=forward&cursor=${message.sequence}&knownFrom=1`;
  const result = await f.ok("GET", path, undefined, 202);
  assert.deepEqual(result.items, []); assert.deepEqual(result.removedIds, [message.id]);
  assert.equal((await f.request("GET", path, undefined, 404)).statusCode, 404);
  await f.ok("PUT", "/v1/blocks/101", {}, 202, 204);
  assert.deepEqual((await f.ok("GET", path, undefined, 202)).removedIds, []);
});
