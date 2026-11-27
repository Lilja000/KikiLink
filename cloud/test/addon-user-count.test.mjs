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
