import test from "node:test";
import assert from "node:assert/strict";
import { fixture, group } from "./helpers.mjs";

test("Ownership transfers cannot bypass the owner's group quota", async t => {
  const f = await fixture(t); await group(f);
  for (let i = 0; i < 20; i++) f.social.createGroup(202, { title: `Owned ${i}`, members: [303, 404] });
  const extra = f.social.createGroup(101, { title: "Transfer", members: [202, 303] });
  f.social.accept(202, extra.id);
  const before = f.social.group(101, extra.id);
  const result = await f.request("PUT", `/v1/groups/${extra.id}/members/202/role`, { role: "owner" }, 101);
  assert.equal(result.statusCode, 409); assert.equal(result.json().error, "group_quota");
  assert.deepEqual(f.social.group(101, extra.id), before);
});

test("Creation respects the same total membership capacity as invitations", async t => {
  const f = await fixture(t); await group(f);
  // Populate an existing full account without exercising unrelated HTTP rate limits.
  await f.login(505); await f.login(606);
  for (const owner of [202, 303, 404, 505, 606]) {
    for (let i = 0; i < 20 && f.db.get("SELECT COUNT(*) AS n FROM group_members WHERE member_number=101 AND status<>'removed'").n < 100; i++)
      f.social.createGroup(owner, { title: `Existing ${owner}/${i}`, members: [101, owner === 202 ? 505 : 202] });
  }
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM group_members WHERE member_number=101 AND status<>'removed'").n, 100);
  const result = await f.request("POST", "/v1/groups", { title: "One too many", members: [303, 404] }, 101);
  assert.equal(result.statusCode, 409); assert.equal(result.json().error, "membership_quota");
});

test("A disabled member cannot be promoted or made owner", async t => {
  const f = await fixture(t), g = await group(f);
  await f.ok("PUT", `/v1/groups/${g.id}/members/202/role`, { role: "admin" }, 101, 204);
  f.db.run("UPDATE users SET disabled=1 WHERE member_number=202");
  for (const role of ["admin", "owner"]) {
    assert.equal((await f.request("PUT", `/v1/groups/${g.id}/members/202/role`, { role }, 101)).statusCode, 404);
    assert.equal(f.social.group(101, g.id).owner, 101);
  }
  // Removing privileges remains possible even when the member is no longer visible.
  await f.ok("PUT", `/v1/groups/${g.id}/members/202/role`, { role: "member" }, 101, 204);
  assert.equal(f.db.get("SELECT role FROM group_members WHERE group_id=? AND member_number=202", g.id).role, "member");
});
