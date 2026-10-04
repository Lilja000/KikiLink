import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { fixture } from "./helpers.mjs";

async function setup(t, config) {
  const f = await fixture(t, config);
  for (const member of [101, 202, 303, 404, 606]) await f.login(member);
  return f;
}
const create = (f, author = 101, extra = {}) => f.ok("POST", "/v1/feed", { text: "A Feed post", ...extra }, author, 201);
const comment = (f, post, author, text = "A comment", parentId) => f.ok("POST", `/v1/feed/${post.id}/comments`, { text, ...(parentId ? { parentId } : {}) }, author, 201);
const ids = page => page.items.map(p => p.id);

test("Saved/Hidden are private, persist, paginate, filter search/promotions, and send recipient-only events", async t => {
  const f = await setup(t);
  const a = await create(f, 202, { text: "find first" }), b = await create(f, 303, { text: "find second" });
  await f.ok("PUT", `/v1/feed/${b.id}/pin`, { pinned: true }, 606);
  const events = []; f.events.on("change", event => events.push(event));
  for (const p of [a,b]) await f.ok("PUT", `/v1/feed/${p.id}/bookmark`, { bookmarked: true });
  assert.deepEqual(events.map(e => e.recipients), [[101],[101]]);
  assert.equal((await f.ok("GET", `/v1/feed/${a.id}`, undefined, 202)).bookmarked, false);
  const page = await f.ok("GET", "/v1/feed?filter=saved&limit=1");
  assert.deepEqual(ids(page), [b.id]);
  assert.deepEqual(ids(await f.ok("GET", `/v1/feed?filter=saved&cursor=${page.nextCursor}`)), [a.id]);
  await f.ok("GET", "/v1/feed/unread");
  const newest = await create(f, 202);
  assert.equal((await f.ok("GET", "/v1/feed/unread")).unread, 1);
  await f.ok("PUT", `/v1/feed/${newest.id}/hide`, { hidden: true });
  assert.equal((await f.ok("GET", "/v1/feed/unread")).unread, 0);
  await f.ok("PUT", `/v1/feed/${b.id}/hide`, { hidden: true });
  assert.deepEqual(ids(await f.ok("GET", "/v1/feed?filter=saved")), [a.id]);
  assert.deepEqual(ids(await f.ok("GET", "/v1/feed?q=find")), [a.id]);
  assert.deepEqual((await f.ok("GET", "/v1/feed")).promoted, []);
  assert.deepEqual(ids(await f.ok("GET", "/v1/feed?filter=hidden")), [newest.id, b.id]);
  assert.equal((await f.ok("GET", `/v1/feed/${b.id}`)).hidden, true, "Hiding is not an access ban");
  await f.ok("PUT", `/v1/feed/${b.id}/hide`, { hidden: false });
  assert.deepEqual(ids(await f.ok("GET", "/v1/feed?filter=saved")), [b.id,a.id]);
  await f.ok("PUT", "/v1/blocks/202", {}, 101, 204);
  assert.deepEqual(ids(await f.ok("GET", "/v1/feed?filter=saved")), [b.id]);
});

test("Friends/Mine use authenticated existing friendships and remain filtered in search", async t => {
  const f = await setup(t);
  const own = await create(f), friend = await create(f, 202), stranger = await create(f, 303);
  for (const member of [101,202]) await f.ok("PUT", "/v1/capabilities/me", { friendRequests: true, directMessages: true }, member);
  await f.ok("POST", "/v1/relationships/confirm", { members: [202] }, 101);
  assert.deepEqual(ids(await f.ok("GET", "/v1/feed?filter=friends")), []);
  await f.ok("POST", "/v1/relationships/confirm", { members: [101] }, 202);
  assert.deepEqual(ids(await f.ok("GET", "/v1/feed?filter=friends&q=Feed")), [friend.id]);
  assert.deepEqual(ids(await f.ok("GET", "/v1/feed?filter=mine")), [own.id]);
  assert.ok(ids(await f.ok("GET", "/v1/feed")).includes(stranger.id));
  await f.ok("DELETE", "/v1/relationships/202", undefined, 101, 204);
  assert.deepEqual(ids(await f.ok("GET", "/v1/feed?filter=friends")), []);
});

test("Replies preserve parent context across pages, reject inaccessible/cross-post parents, and redact deleted/blocked parents", async t => {
  const f = await setup(t), p = await create(f), other = await create(f);
  const parent = await comment(f, p, 202, "Private parent content");
  const reply = await comment(f, p, 303, "Reply", parent.id);
  assert.equal(reply.parentId, parent.id); assert.equal(reply.replyTo.text, parent.text);
  assert.equal((await f.ok("GET", `/v1/feed/${p.id}/comments?cursor=${parent.id}`)).items[0].replyTo.text, parent.text);
  assert.equal((await f.request("POST", `/v1/feed/${other.id}/comments`, { text: "Cross post", parentId: parent.id }, 303)).statusCode, 400);
  await f.ok("PUT", "/v1/blocks/202", {}, 404, 204);
  const hiddenParent = await f.ok("GET", `/v1/comments/${reply.id}`, undefined, 404);
  assert.equal(hiddenParent.parentId, parent.id); assert.equal(hiddenParent.replyTo, null);
  assert.ok(!JSON.stringify(hiddenParent).includes(parent.text));
  assert.equal((await f.request("POST", `/v1/feed/${p.id}/comments`, { text: "Forbidden", parentId: parent.id }, 404)).statusCode, 404);
  await f.ok("DELETE", `/v1/comments/${parent.id}`, undefined, 202, 204);
  assert.equal((await f.ok("GET", `/v1/comments/${reply.id}`)).replyTo, null);
});

test("Watch/reply notifications dedupe recipients and coalesce unread comments; hidden/unsubscribed/blocked recipients stop receiving", async t => {
  const f = await setup(t), p = await create(f);
  const parent = await comment(f, p, 202);
  for (const actor of [101,202,404]) await f.ok("PUT", `/v1/feed/${p.id}/watch`, { watching: true }, actor);
  const events = []; f.events.on("change", event => { if (event.kind === "mailbox") events.push(event); });
  const reply = await comment(f, p, 303, "First reply", parent.id);
  const mine = member => f.ok("GET", "/v1/mailbox", undefined, member);
  assert.equal((await mine(101)).items.filter(i => i.targetId === String(reply.id)).length, 1);
  assert.equal((await mine(202)).items[0].kind, "comment_reply");
  const watched = (await mine(404)).items[0];
  assert.equal(watched.kind, "post_comment"); assert.equal(watched.targetId, String(p.id));
  const firstEvents = events.filter(e => e.recipients.includes(404)).length;
  await comment(f, p, 303, "Another reply", parent.id);
  assert.equal((await mine(404)).items.length, 1); assert.equal((await mine(404)).items[0].count, 2);
  assert.equal(events.filter(e => e.recipients.includes(404)).length, firstEvents);
  await f.ok("POST", "/v1/mailbox/read", { id: watched.id }, 404, 204);
  await comment(f, p, 303);
  assert.equal((await mine(404)).items[0].read, false);
  assert.equal((await mine(404)).items[0].count, 1);
  assert.ok((await mine(404)).items[0].id > watched.id, "A new comment batch returns to the top of Mailbox");
  await f.ok("PUT", `/v1/feed/${p.id}/hide`, { hidden: true }, 404);
  assert.equal((await f.ok("GET", `/v1/feed/${p.id}`, undefined, 404)).watching, false);
  await comment(f, p, 303);
  assert.deepEqual((await mine(404)).items, []);
  await f.ok("PUT", `/v1/feed/${p.id}/hide`, { hidden: false }, 404);
  await f.ok("PUT", `/v1/feed/${p.id}/watch`, { watching: true }, 404);
  await f.ok("PUT", "/v1/blocks/303", {}, 404, 204);
  await comment(f, p, 303); assert.deepEqual((await mine(404)).items, []);
  await f.ok("PUT", `/v1/feed/${p.id}/watch`, { watching: false }, 404);
  await comment(f, p, 202); assert.deepEqual((await mine(404)).items, []);
});

test("Aging watch subscriptions start a fresh notification batch after the mailbox retention window", async t => {
  const f = await setup(t), p = await create(f);
  await f.ok("PUT", `/v1/feed/${p.id}/watch`, { watching: true }, 404);
  await comment(f, p, 202);
  const first = (await f.ok("GET", "/v1/mailbox", undefined, 404)).items[0];
  f.db.run("UPDATE mailbox SET created_at=created_at-?,updated_at=updated_at-? WHERE id=?", 31 * 86400000, 31 * 86400000, first.id);
  await comment(f, p, 202);
  const next = (await f.ok("GET", "/v1/mailbox", undefined, 404)).items[0];
  assert.ok(next.id > first.id); assert.equal(next.read, false); assert.equal(next.count, 1);
});

test("Polls validate inputs, encrypt question/options, retain immutable definitions and idempotent create, and count distinct voters", async t => {
  const f = await setup(t), closesAt = Date.now() + 3600000;
  const input = { text: "", clientId: crypto.randomUUID(), poll: { question: "Choose our next event", options: ["Night garden", "Ocean lounge", "Mountaintop"], multiple: true, closesAt } };
  const p = await create(f, 101, input);
  assert.equal(p.poll.options.length, 3); assert.equal(p.poll.totalVoters, 0);
  assert.equal((await create(f, 101, input)).id, p.id);
  assert.ok(!f.db.get("SELECT payload FROM feed_polls WHERE post_id=?", p.id).payload.includes(input.poll.question));
  assert.deepEqual(ids(await f.ok("GET", "/v1/feed?q=Mountaintop")), [p.id]);
  const vote = (member, optionIds) => f.ok("PUT", `/v1/feed/${p.id}/poll/vote`, { optionIds }, member);
  const first = await vote(202, [1,2]);
  assert.equal(first.poll.totalVoters, 1); assert.deepEqual(first.poll.myVotes, [1,2]);
  assert.deepEqual(first.poll.options.map(o => o.votes), [1,1,0]);
  await vote(202, [1,2]); await vote(303, [2]);
  let seen = await f.ok("GET", `/v1/feed/${p.id}`);
  assert.equal(seen.poll.totalVoters, 2); assert.deepEqual(seen.poll.myVotes, []);
  assert.deepEqual(seen.poll.options.map(o => o.votes), [1,2,0]);
  assert.ok(!JSON.stringify(seen.poll).includes("202"));
  const edit = await f.ok("PATCH", `/v1/feed/${p.id}`, { text: "Updated intro", mediaIds: [], revision: p.revision });
  assert.deepEqual(edit.poll, seen.poll);
  assert.equal((await f.request("PATCH", `/v1/feed/${p.id}`, { text: "Change", revision: edit.revision, poll: input.poll }, 101)).statusCode, 400);
  for (const optionIds of [[1,1],[6],[0], [1.5]]) assert.equal((await f.request("PUT", `/v1/feed/${p.id}/poll/vote`, { optionIds }, 202)).statusCode, 400);
  await vote(202, []); assert.equal((await f.ok("GET", `/v1/feed/${p.id}`)).poll.totalVoters, 1);
  await f.ok("PUT", "/v1/blocks/303", {}, 101, 204);
  assert.equal((await f.ok("GET", `/v1/feed/${p.id}`)).poll.totalVoters, 0);
  assert.equal((await f.request("PUT", `/v1/feed/${p.id}/poll/vote`, { optionIds: [1] }, 303)).statusCode, 404);
  f.advance(3601000);
  await f.login(101); await f.login(202);
  assert.equal((await f.request("PUT", `/v1/feed/${p.id}/poll/vote`, { optionIds: [] }, 202)).statusCode, 409);
  assert.equal((await f.ok("GET", `/v1/feed/${p.id}`)).poll.closed, true);
});

test("Reported poll-only posts expose question/options to moderation without voter identities", async t => {
  const f = await setup(t);
  const p = await create(f, 101, { text: "", poll: { question: "Reported poll question", options: ["First option", "Second option"], multiple: false, closesAt: Date.now() + 3600000 } });
  const report = await f.ok("POST", "/v1/reports", { targetType: "post", targetId: String(p.id), reason: "A reported poll" }, 202, 201);
  const detail = await f.ok("GET", `/v1/moderation/reports/${report.id}`, undefined, 606);
  assert.match(detail.text, /Reported poll question/u);
  assert.match(detail.text, /First option/u);
  assert.match(detail.text, /Second option/u);
  assert.equal((await f.request("GET", `/v1/moderation/reports/${report.id}`, undefined, 202)).statusCode, 403);
});

test("Invalid and expired polls rollback creation; single choice cannot accept multiple options", async t => {
  const f = await setup(t);
  const base = { question: "Where?", options: ["One", "Two"], multiple: false, closesAt: Date.now() + 3600000 };
  for (const patch of [{ options: ["One"] }, { options: ["One"," one "] }, { options: ["", "Two"] }, { closesAt: Date.now() }, { closesAt: Date.now() + 8 * 86400000 }, { options: Array.from({ length: 7 }, (_, i) => String(i)) }]) {
    assert.equal((await f.request("POST", "/v1/feed", { text: "", poll: { ...base, ...patch } }, 101)).statusCode, 400);
  }
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM posts").n, 0);
  const p = await create(f, 101, { poll: base });
  assert.equal((await f.request("PUT", `/v1/feed/${p.id}/poll/vote`, { optionIds: [1,2] }, 202)).statusCode, 400);
  await f.ok("PUT", `/v1/feed/${p.id}/poll/vote`, { optionIds: [1] }, 202);
  assert.deepEqual((await f.ok("PUT", `/v1/feed/${p.id}/poll/vote`, { optionIds: [2] }, 202)).poll.myVotes, [2]);
  await f.ok("DELETE", `/v1/feed/${p.id}`, undefined, 101, 204);
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM feed_polls").n, 0);
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM feed_poll_votes").n, 0);
});

test("Spoiler attachments validate membership and survive edits from old clients; text syntax is preserved", async t => {
  const f = await setup(t);
  const bytes = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#775599" } }).png().toBuffer();
  const upload = await f.request("POST", "/v1/media/feed", bytes, 101, { "content-type": "image/png" });
  assert.equal(upload.statusCode, 201, upload.body);
  const image = upload.json();
  const p = await create(f, 101, { text: "Reveal ||a surprise||", mediaIds: [image.id], spoilerMediaIds: [image.id] });
  assert.deepEqual(p.spoilerMediaIds, [image.id]);
  assert.equal(p.text, "Reveal ||a surprise||");
  assert.equal((await f.request("POST", "/v1/feed", { text: "Invalid", spoilerMediaIds: [image.id] }, 101)).statusCode, 400);
  const edited = await f.ok("PATCH", `/v1/feed/${p.id}`, { text: "Legacy client edit", mediaIds: [image.id], revision: p.revision });
  assert.deepEqual(edited.spoilerMediaIds, [image.id]);
  assert.deepEqual((await f.ok("GET", "/v1/feed")).items[0].spoilerMediaIds, [image.id]);
  const cleared = await f.ok("PATCH", `/v1/feed/${p.id}`, { text: "Clear", mediaIds: [image.id], spoilerMediaIds: [], revision: edited.revision });
  assert.deepEqual(cleared.spoilerMediaIds, []);
});
