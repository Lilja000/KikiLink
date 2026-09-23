import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";

test("Reports survive retries and are visible only to a server-authorized moderator", async t => {
  const f = await fixture(t);
  for (const member of [101, 202, 606]) await f.login(member);
  const p = await f.ok("POST", "/v1/feed", { clientId: crypto.randomUUID(), text: "Test post", mediaIds: [] }, 101, 201);
  const body = { targetType: "post", targetId: String(p.id), reason: "Spam", reasonCode: "spam", clientId: crypto.randomUUID() };
  const first = await f.ok("POST", "/v1/reports", body, 202, 201);
  assert.deepEqual(await f.ok("POST", "/v1/reports", body, 202, 201), first);
  assert.equal((await f.request("GET", "/v1/moderation/reports", undefined, 202)).statusCode, 403);
  const page = await f.ok("GET", "/v1/moderation/reports?limit=1", undefined, 606);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].reason_code, "spam");
  assert.equal(page.items[0].status, "open");
  assert.equal(page.items[0].reporter, 202);
  assert.ok(!f.db.get("SELECT reason FROM reports").reason.includes(body.reason));
  await f.ok("POST", `/v1/moderation/reports/${first.id}/dismiss`, {}, 606, 204);
  assert.deepEqual(await f.ok("POST", "/v1/reports", body, 202, 201), first);
  assert.equal(f.db.get("SELECT count(*) AS n FROM reports").n, 1);
  assert.equal((await f.request("POST", "/v1/reports", { ...body, targetId: "999" }, 202)).statusCode, 409);
});

test("Report categories validate Other and retain legacy free text", async t => {
  const f = await fixture(t);
  for (const member of [101, 202, 606]) await f.login(member);
  const p = await f.ok("POST", "/v1/feed", { clientId: crypto.randomUUID(), text: "Another test post", mediaIds: [] }, 101, 201);
  const target = { targetType: "post", targetId: String(p.id) };
  assert.equal((await f.request("POST", "/v1/reports", { ...target, reason: "Other", reasonCode: "other" }, 202)).statusCode, 400);
  const r = await f.ok("POST", "/v1/reports", { ...target, reason: "Existing free-text client" }, 202, 201);
  const page = await f.ok("GET", "/v1/moderation/reports", undefined, 606);
  assert.equal(page.items[0].id, r.id);
  assert.equal(page.items[0].reason, "Existing free-text client");
  assert.equal(page.items[0].reason_code, null);
});
