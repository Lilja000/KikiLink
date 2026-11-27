import assert from "node:assert/strict";
import { test } from "node:test";
import { fixture } from "./helpers.mjs";

test("the shell count includes each enabled verified account once, independent of profiles or sessions", async t => {
  const f = await fixture(t);
  await f.login(101);
  await f.login(101);
  await f.login(202);
  f.db.run("DELETE FROM sessions WHERE member_number=202");
  const count = async () => (await f.ok("GET", "/v1/me", undefined, 101)).addonUsers;
  assert.equal(await count(), 2);
  await f.login(303);
  assert.equal(await count(), 2);
  f.advance(300_000);
  assert.equal(await count(), 3);
  f.db.run("UPDATE users SET disabled=1 WHERE member_number=303");
  f.advance(300_000);
  assert.equal(await count(), 2);
});


test("an allowed Club origin can read only the aggregate before signing in", async t => {
  const f = await fixture(t);
  const route = "/v1/stats/users";
  const count = () => f.request("GET", route);
  assert.deepEqual((await count()).json(), { addonUsers: 0 });
  assert.equal((await f.request("GET", route, undefined, undefined, { origin: "https://untrusted.example" })).statusCode, 403);
  assert.equal((await f.request("GET", "/v1/me")).statusCode, 401);
  await f.login(101);
  f.advance(300_000);
  const updated = await count();
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.headers["access-control-allow-origin"], "https://bondageprojects.elementfx.com");
  assert.deepEqual(updated.json(), { addonUsers: 1 });
});
