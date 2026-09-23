import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";

test("Only administrators can pin, and promoted posts do not disturb chronological pagination", async t => {
  const f = await fixture(t); for (const n of [101,202,606]) await f.login(n);
  const oldest = f.feed.create(101, { text: "Pinned old post", mediaIds: [] });
  const middle = f.feed.create(202, { text: "Middle", mediaIds: [] });
  const latest = f.feed.create(101, { text: "Latest", mediaIds: [] });
  assert.equal((await f.request("PUT", `/v1/feed/${oldest.id}/pin`, { pinned:true },101)).statusCode,403);
  const pinned = await f.ok("PUT", `/v1/feed/${oldest.id}/pin`, { pinned:true },606);
  assert.ok(pinned.pinnedAt);
  const repeat = await f.ok("PUT", `/v1/feed/${oldest.id}/pin`, { pinned:true },606);
  assert.equal(repeat.pinnedAt,pinned.pinnedAt);
  const first = await f.ok("GET", "/v1/feed?limit=1");
  assert.deepEqual(first.items.map(p=>p.id),[latest.id]);
  assert.deepEqual(first.promoted.map(p=>p.id),[oldest.id]);
  assert.equal(first.nextCursor,latest.id);
  const next = await f.ok("GET", `/v1/feed?limit=1&cursor=${first.nextCursor}`);
  assert.deepEqual(next.items.map(p=>p.id),[middle.id]); assert.equal(next.promoted,undefined);
  assert.equal((await f.ok("PUT", `/v1/feed/${oldest.id}/pin`, { pinned:false },606)).pinnedAt,null);
});

test("Featured chooses recent distinct reactions, persists for twelve hours, and never repeats", async t => {
  const f = await fixture(t); for (const n of [101,202,303,404]) await f.login(n);
  const a=f.feed.create(101,{text:"Most reactions",mediaIds:[]}),b=f.feed.create(101,{text:"Next",mediaIds:[]});
  f.feed.react(202,"post",a.id,"heart"); f.feed.react(303,"post",a.id,"wow"); f.feed.react(404,"post",b.id,"like");
  assert.equal(f.feed.highlights.refresh(),true);
  const feature=f.feed.highlights.metadata(a.id); assert.equal(feature.featuredUntil-feature.featuredAt,12*3600000);
  f.feed.react(202,"post",b.id,"laugh"); f.feed.react(303,"post",b.id,"support");
  f.advance(12*3600000-1); assert.equal(f.feed.highlights.refresh(),false);
  assert.deepEqual(f.feed.highlights.promoted(101).map(p=>p.id),[a.id]);
  f.advance(1); assert.equal(f.feed.highlights.refresh(),true);
  assert.deepEqual(f.feed.highlights.promoted(101).map(p=>p.id),[b.id]);
  f.advance(12*3600000); f.feed.react(202,"post",a.id,null); f.feed.react(202,"post",a.id,"heart");
  assert.equal(f.feed.highlights.refresh(),false); assert.deepEqual(f.feed.highlights.promoted(101),[]);
  assert.equal(f.db.get("SELECT count(*) AS n FROM feed_features").n,2);
});

test("Expired reactions, self votes, disabled members and pins cannot become Featured", async t => {
  const f=await fixture(t); for(const n of [101,202,303,404,606]) await f.login(n);
  const stale=f.feed.create(101,{text:"Old votes",mediaIds:[]});f.feed.react(202,"post",stale.id,"heart");
  f.advance(86400001);f.feed.react(202,"post",stale.id,"wow");
  const own=f.feed.create(101,{text:"Own vote",mediaIds:[]});f.feed.react(101,"post",own.id,"like");
  const disabled=f.feed.create(101,{text:"Disabled vote",mediaIds:[]});f.feed.react(303,"post",disabled.id,"like");
  f.db.run("UPDATE users SET disabled=1 WHERE member_number=303");
  const pin=f.feed.create(101,{text:"Pin",mediaIds:[]});f.feed.react(404,"post",pin.id,"heart");f.feed.highlights.pin(606,pin.id,true);
  assert.equal(f.feed.highlights.refresh(),false);
  assert.deepEqual(f.feed.highlights.promoted(101).map(p=>p.id),[pin.id]);
});

test("Reaction details are paginated and respect target access, blocks, disabled and deleted content", async t => {
  const f=await fixture(t);for(const n of [101,202,303,404,606])await f.login(n);
  const post=f.feed.create(101,{text:"Post",mediaIds:[]}),comment=f.feed.comment(101,post.id,"Comment");
  for(const n of [202,303,404]){f.feed.react(n,"post",post.id,"heart");f.feed.react(n,"comment",comment.id,"wow");}
  let page=await f.ok("GET",`/v1/reactions/post/${post.id}?limit=1`);
  assert.equal(page.items[0].memberNumber,202);assert.equal(page.items[0].reaction,"heart");assert.equal(page.nextCursor,202);
  page=await f.ok("GET",`/v1/reactions/post/${post.id}?limit=1&cursor=${page.nextCursor}`);
  assert.equal(page.items[0].memberNumber,303);
  f.social.block(303,101,true);f.db.run("UPDATE users SET disabled=1 WHERE member_number=404");
  page=await f.ok("GET",`/v1/reactions/comment/${comment.id}`);
  assert.deepEqual(page.items.map(r=>r.memberNumber),[202]);
  assert.equal(page.items[0].reaction,"wow");assert.equal(page.items[0].profile.memberNumber,202);
  assert.equal((await f.request("GET",`/v1/reactions/post/${post.id}`,undefined,303)).statusCode,404);
  f.feed.removePost(101,post.id);
  assert.equal((await f.request("GET",`/v1/reactions/comment/${comment.id}`,undefined,101)).statusCode,404);
});

test("Promotions remain invisible across a block and after deleting or disabling their author", async t=>{
  const f=await fixture(t);for(const n of [101,202,606])await f.login(n);
  const p=f.feed.create(101,{text:"Private from blocked viewer",mediaIds:[]});f.feed.highlights.pin(606,p.id,true);
  f.social.block(101,202,true);assert.deepEqual(f.feed.highlights.promoted(202),[]);
  f.db.run("UPDATE users SET disabled=1 WHERE member_number=101");assert.deepEqual(f.feed.highlights.promoted(606),[]);
  f.db.run("UPDATE users SET disabled=0 WHERE member_number=101");f.feed.removePost(101,p.id);assert.deepEqual(f.feed.highlights.promoted(606),[]);
});
