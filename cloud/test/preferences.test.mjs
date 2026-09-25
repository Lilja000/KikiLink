import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";
import { comparePreferences } from "../src/preferences.mjs";
import catalog from "../shared/preferences-catalog.json" with { type: "json" };

const ids = catalog.items.slice(0, 8).map(item => item.id);
const ratings = level => Object.fromEntries(ids.map(id => [id, level]));
async function setup(t) { const f = await fixture(t); for (const n of [101, 202, 303]) await f.login(n); return f; }
async function save(f, member, mode, scores = ratings("love"), revision = 0) { return f.ok("PUT", "/v1/preferences/me", { mode, ratings: scores, revision }, member); }

test("a person can fill the whole catalog while autosaving without an hour-long lockout", async t => {
  const f = await setup(t);
  let revision = 0;
  for (const item of catalog.items) {
    const saved = await f.ok("PATCH", "/v1/preferences/me", { updates: { [item.id]: "like" }, revision });
    revision = saved.revision;
    f.advance(3_000);
  }
  const saved = await f.ok("GET", "/v1/preferences/me");
  assert.equal(Object.keys(saved.ratings).length, catalog.items.length);
  assert.equal(saved.mode, "private");
});

test("exhausted preference writes report the actual cooldown and leave saved ratings intact", async t => {
  const f = await setup(t);
  await save(f, 101, "private");
  f.db.run("UPDATE rate_limits SET count=600 WHERE key=?", "preferences-save:101");
  f.advance(125_000);
  const response = await f.request("PATCH", "/v1/preferences/me", { updates: { [ids[0]]: "hate" }, revision: 1 }, 101);
  assert.equal(response.statusCode, 429);
  assert.equal(response.json().error, "rate_limited");
  assert.equal(response.headers["retry-after"], "3475");
  assert.equal((await f.ok("GET", "/v1/preferences/me")).ratings[ids[0]], "love");
  f.advance(3_475_000);
  await f.login(101);
  const saved = await f.ok("PATCH", "/v1/preferences/me", { updates: { [ids[0]]: "hate" }, revision: 1 });
  assert.equal(saved.ratings[ids[0]], "hate");
});

test("Compatibility is symmetric, distinguishes Not Set from Neutral, and reports hard-limit conflicts", () => {
  assert.deepEqual(comparePreferences(ratings("love"), ratings("love")), { status: "available", count: 8, score: 100 });
  assert.equal(comparePreferences(ratings("love"), ratings("hate")).score, 0);
  assert.equal(comparePreferences(ratings("like"), ratings("dislike")).score, 50);
  assert.deepEqual(comparePreferences(ratings("dislike"), ratings("hate")), { status: "available", count: 8, score: 75 });
  assert.deepEqual(comparePreferences(ratings("neutral"), ratings("neutral")), { status: "available", count: 8, score: 100 });
  assert.deepEqual(comparePreferences(ratings("love"), {}), { status: "insufficient", count: 0 });
  const four = Object.fromEntries(ids.slice(0, 4).map(id => [id, "like"]));
  assert.deepEqual(comparePreferences(four, ratings("like")), { status: "insufficient", count: 4 });
  const varied = Object.fromEntries(ids.map((id, i) => [id, ["hate", "dislike", "neutral", "like", "love", "hard_limit"][i % 6]]));
  assert.deepEqual(comparePreferences(varied, ratings("like")), comparePreferences(ratings("like"), varied));
  assert.deepEqual(comparePreferences(ratings("hard_limit"), ratings("love")), {
    status: "available", count: 8, score: 0, hardLimitConflictCount: 8,
  });
  assert.deepEqual(comparePreferences(ratings("hard_limit"), ratings("dislike")), { status: "available", count: 8, score: 75 });
  assert.equal(comparePreferences({ ...ratings("like"), retired: "love" }, { ...ratings("like"), retired: "love" }).count, 8);
});
test("Private defaults, consent, encrypted isolation and score-only responses", async t => {
  const f = await setup(t);
  assert.deepEqual((await f.ok("GET", "/v1/preferences/me")).ratings, {});
  assert.equal((await f.ok("GET", "/v1/preferences/me")).mode, "private");
  assert.equal((await f.request("GET", "/v1/preferences/me", undefined)).statusCode, 401);
  await save(f, 101, "score"); await save(f, 202, "private");
  assert.deepEqual(await f.ok("GET", "/v1/compatibility/202"), { status: "private" });
  await save(f, 202, "score", ratings("love"), 1);
  assert.deepEqual(await f.ok("GET", "/v1/compatibility/202"), { status: "available", count: 8, score: 100 });
  assert.equal((await f.request("GET", "/v1/preferences/202", undefined, 101)).statusCode, 403);
  assert.equal((await f.request("GET", "/v1/compatibility/101", undefined, 101)).statusCode, 400);
  assert.deepEqual(await f.ok("GET", "/v1/compatibility/202", undefined, 303), { status: "opt_in_required" });
  const stored = f.db.get("SELECT ratings FROM interest_preferences WHERE owner=202").ratings;
  assert.ok(!stored.includes(ids[0]));
  const profile = await f.ok("GET", "/v1/profiles/202");
  assert.ok(!JSON.stringify(profile).includes(ids[0]));
  await save(f, 202, "private", ratings("love"), 2);
  assert.deepEqual(await f.ok("GET", "/v1/compatibility/202"), { status: "private" });
});
test("Friends access requires both grants, revokes before cached scores, and public means authenticated users", async t => {
  const f = await setup(t);
  await save(f, 101, "public"); await save(f, 202, "friends");
  assert.deepEqual(await f.ok("GET", "/v1/compatibility/202"), { status: "private" });
  for (const [actor, peer] of [[101,202],[202,101]]) {
    await f.ok("PUT", "/v1/capabilities/me", { friendRequests: true, directMessages: false }, actor);
    await f.ok("POST", "/v1/relationships/confirm", { members: [peer] }, actor);
  }
  const result = await f.ok("GET", "/v1/compatibility/202"); assert.equal(result.shared.length, 8);
  assert.equal((await f.ok("GET", "/v1/preferences/202")).mode, "friends");
  await f.ok("DELETE", "/v1/relationships/202", undefined, 101, 204);
  assert.deepEqual(await f.ok("GET", "/v1/compatibility/202"), { status: "private" });
  assert.equal((await f.request("GET", "/v1/preferences/202", undefined, 303)).statusCode, 403);
  await save(f, 202, "public", ratings("love"), 1);
  assert.equal((await f.ok("GET", "/v1/preferences/202", undefined, 303)).mode, "public");
  assert.equal((await f.request("GET", "/v1/preferences/202", undefined)).statusCode, 401);
  await f.ok("PUT", "/v1/blocks/101", {}, 202, 204);
  assert.equal((await f.request("GET", "/v1/compatibility/202", undefined, 101)).statusCode, 404);
});
test("Revision guards, unknown IDs, retirement retention, clearing and deletion preserve privacy", async t => {
  const f = await setup(t); await save(f, 101, "public");
  assert.equal((await f.request("PUT", "/v1/preferences/me", { mode: "public", revision: 0, ratings: ratings("like") }, 101)).statusCode, 409);
  assert.equal((await f.request("PUT", "/v1/preferences/me", { mode: "public", revision: 1, ratings: { invented: "love" } }, 101)).statusCode, 400);
  assert.equal((await f.request("PUT", "/v1/preferences/me", { mode: "public", revision: 1, ratings: { [ids[0]]: 3 } }, 101)).statusCode, 400);
  f.db.run("UPDATE interest_preferences SET ratings=? WHERE owner=101", f.keys.seal({ ...ratings(2), "retired.example": 1 }, "preferences:101"));
  const old = await f.ok("GET", "/v1/preferences/me");
  await save(f, 101, "private", old.ratings, old.revision);
  assert.equal((await f.ok("GET", "/v1/preferences/me")).ratings["retired.example"], "like");
  await f.ok("DELETE", "/v1/preferences/me", undefined, 101, 204);
  const cleared = await f.ok("GET", "/v1/preferences/me");
  assert.deepEqual(cleared.ratings, {}); assert.equal(cleared.mode, "private"); assert.ok(cleared.revision > old.revision);
});
test("Pair recalculation budget bounds inference attempts while cache reads remain stable", async t => {
  const f = await setup(t); await save(f, 101, "score"); await save(f, 202, "score");
  for (let n = 0; n < 4; n++) {
    await save(f, 101, "score", ratings(n % 2 ? "love" : "like"), n + 1);
    assert.equal((await f.request("GET", "/v1/compatibility/202", undefined, 101)).statusCode, 200);
  }
  await save(f, 101, "score", ratings("love"), 5);
  assert.equal((await f.request("GET", "/v1/compatibility/202", undefined, 101)).statusCode, 429);
});

test("Partial preference updates survive reload and cannot overwrite unrelated profile fields", async t => {
  const f = await setup(t);
  await f.ok("PUT", "/v1/profiles/me", {
    displayName: "Kiki", bio: "Keep this bio", statusMessage: "Still here", visible: true, revision: 0,
  }, 101);
  const initial = await save(f, 101, "public", {
    [ids[0]]: "like", [ids[1]]: "dislike", [ids[2]]: "neutral",
  });
  const updated = await f.ok("PATCH", "/v1/preferences/me", {
    mode: "friends",
    updates: { [ids[0]]: "love", [ids[1]]: null, [ids[3]]: "hard_limit" },
    revision: initial.revision,
  }, 101);
  assert.deepEqual(updated.ratings, {
    [ids[0]]: "love", [ids[2]]: "neutral", [ids[3]]: "hard_limit",
  });
  assert.equal(updated.mode, "friends");
  assert.deepEqual((await f.ok("GET", "/v1/preferences/me", undefined, 101)).ratings, updated.ratings);
  const profile = await f.ok("GET", "/v1/profiles/101", undefined, 202);
  assert.equal(profile.bio, "Keep this bio");
  assert.equal(profile.statusMessage, "Still here");
});

test("Expanded catalog saves all additions, preserves renamed IDs and excludes cleared ratings from Compatibility", async t => {
  const f = await setup(t);
  const additions = ["roleplay.abdl", "edge.watersports", "fetish.body-modification", "roleplay.transformation", "edge.scat",
    "restraint.stuffing-gags", "sensory.sweat", "edge.race-play", "restraint.nose-hooks", "sensory.smell", "roleplay.foxy",
    "physical.milking", "fetish.socks", "roleplay.magic", "roleplay.sci-fi", "physical.spitting",
    "dynamics.maledom", "dynamics.femdom", "dynamics.lezdom", "fetish.futanari"];
  const renamed = ["roleplay.kidnap-fantasy", "interest.hypnosis", "edge.cnc-fantasy", "edge.forced-fantasy", "edge.somnophilia-fantasy"];
  const initial = Object.fromEntries(renamed.map(id => [id, "neutral"]));
  await save(f, 101, "public", initial);
  const updates = Object.fromEntries(additions.map((id, i) => [id, i % 2 ? "like" : "dislike"]));
  const saved = await f.ok("PATCH", "/v1/preferences/me", { updates, revision: 1 });
  assert.deepEqual(saved.ratings, { ...initial, ...updates });
  assert.equal(saved.catalogVersion, catalog.version);
  await save(f, 202, "public", saved.ratings);
  assert.deepEqual((await f.ok("GET", "/v1/preferences/me")).ratings, saved.ratings);
  assert.equal((await f.ok("GET", "/v1/compatibility/202")).count, additions.length + renamed.length);
  const cleared = await f.ok("PATCH", "/v1/preferences/me", { updates: { [additions[0]]: null, [additions[1]]: null }, revision: saved.revision });
  assert.ok(!Object.hasOwn(cleared.ratings, additions[0]));
  assert.ok(!Object.hasOwn(cleared.ratings, additions[1]));
  for (const id of renamed) assert.equal(cleared.ratings[id], "neutral");
  const compared = await f.ok("GET", "/v1/compatibility/202");
  assert.equal(compared.count, additions.length + renamed.length - 2);
  assert.ok(!compared.shared.some(item => additions.slice(0, 2).includes(item.id)));
  assert.deepEqual((await f.ok("GET", "/v1/preferences/me")).ratings, cleared.ratings);
});
