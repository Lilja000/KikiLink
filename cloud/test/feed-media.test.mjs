import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { fixture } from "./helpers.mjs";

const image = async (color = "#aa2233") =>
  sharp({ create: { width: 80, height: 60, channels: 3, background: color } })
    .png()
    .toBuffer();
async function upload(f, kind = "feed", member = 101, color) {
  const bytes = await image(color);
  const r = await f.request("POST", `/v1/media/${kind}`, bytes, member, {
    "content-type": "image/png",
    "content-length": String(bytes.length),
  });
  assert.equal(r.statusCode, 201, r.body);
  return r.json();
}
test("Feed text/image posts, stable keyset pagination during insert, edits and deletion permissions", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  await f.login(202);
  const media = await upload(f);
  const first = await f.ok(
    "POST",
    "/v1/feed",
    { text: "image caption", mediaIds: [media.id] },
    101,
    201,
  );
  assert.deepEqual(first.mediaIds, [media.id]);
  for (let i = 0; i < 5; i++)
    await f.ok("POST", "/v1/feed", { text: `post ${i}` }, 101, 201);
  const page = await f.ok("GET", "/v1/feed?limit=2", undefined, 202);
  assert.equal(page.items.length, 2);
  await f.ok("POST", "/v1/feed", { text: "arrived during scroll" }, 101, 201);
  const second = await f.ok(
    "GET",
    `/v1/feed?limit=2&cursor=${page.nextCursor}`,
    undefined,
    202,
  );
  assert.ok(second.items.every((p) => p.id < page.nextCursor));
  assert.equal(
    (
      await f.request(
        "PATCH",
        `/v1/feed/${first.id}`,
        { text: "stolen", mediaIds: [], revision: 1 },
        202,
      )
    ).statusCode,
    403,
  );
  const edited = await f.ok("PATCH", `/v1/feed/${first.id}`, {
    text: "edited",
    mediaIds: [media.id],
    revision: 1,
  });
  assert.equal(edited.revision, 2);
  assert.equal(
    (
      await f.request(
        "PATCH",
        `/v1/feed/${first.id}`,
        { text: "stale", mediaIds: [], revision: 1 },
        101,
      )
    ).statusCode,
    409,
  );
  assert.equal(
    (await f.request("DELETE", `/v1/feed/${first.id}`, undefined, 202))
      .statusCode,
    403,
  );
  await f.ok("DELETE", `/v1/feed/${first.id}`, undefined, 101, 204);
  assert.equal(
    (await f.request("GET", `/v1/media/${media.id}`, undefined, 202))
      .statusCode,
    404,
  );
  assert.equal(
    (await f.request("GET", `/v1/feed/${first.id}`, undefined, 202)).statusCode,
    404,
  );
});
test("Comments, reactions and moderation enforce parent visibility, ownership and roles", async (t) => {
  const f = await fixture(t);
  for (const m of [101, 202, 303, 606]) await f.login(m);
  const p = await f.ok("POST", "/v1/feed", { text: "discussion" }, 101, 201);
  const c = await f.ok(
    "POST",
    `/v1/feed/${p.id}/comments`,
    { text: "comment from member 202" },
    202,
    201,
  );
  await f.ok("PUT", `/v1/reactions/post/${p.id}`, { reaction: "heart" }, 202);
  await f.ok("PUT", `/v1/reactions/post/${p.id}`, { reaction: "like" }, 202);
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM reactions").n, 1);
  await f.ok(
    "PUT",
    `/v1/reactions/comment/${c.id}`,
    { reaction: "support" },
    101,
  );
  assert.equal(
    (
      await f.request(
        "PATCH",
        `/v1/comments/${c.id}`,
        { text: "stolen", revision: 1 },
        303,
      )
    ).statusCode,
    403,
  );
  await f.ok(
    "PATCH",
    `/v1/comments/${c.id}`,
    { text: "edited comment", revision: 1 },
    202,
  );
  assert.equal(
    (await f.request("DELETE", `/v1/comments/${c.id}`, undefined, 303))
      .statusCode,
    403,
  );
  const report = await f.ok(
    "POST",
    "/v1/reports",
    {
      targetType: "comment",
      targetId: String(c.id),
      reason: "Please review this comment",
    },
    303,
    201,
  );
  assert.ok(report.id);
  assert.equal(
    (await f.request("GET", "/v1/moderation/reports", undefined, 303))
      .statusCode,
    403,
  );
  assert.equal(
    (await f.ok("GET", "/v1/moderation/reports", undefined, 606)).items.length,
    1,
  );
  await f.ok(
    "POST",
    "/v1/moderation/remove",
    {
      targetType: "comment",
      targetId: String(c.id),
      reason: "Removed after review",
    },
    606,
    204,
  );
  assert.equal(
    (await f.ok("GET", `/v1/feed/${p.id}/comments`, undefined, 101)).items
      .length,
    0,
  );
  assert.equal(
    (
      await f.request(
        "PUT",
        `/v1/reactions/comment/${c.id}`,
        { reaction: "heart" },
        101,
      )
    ).statusCode,
    404,
  );
  await f.ok("DELETE", `/v1/feed/${p.id}`, undefined, 101, 204);
  assert.equal(
    (
      await f.request(
        "POST",
        `/v1/feed/${p.id}/comments`,
        { text: "orphan" },
        202,
      )
    ).statusCode,
    404,
  );
});
test("Uploaded image is decoded/reencoded WebP with no EXIF; other owners cannot attach or read abandoned objects", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  await f.login(202);
  const a = await upload(f, "avatar");
  assert.equal(a.width, 80);
  const r = await f.request("GET", `/v1/media/${a.id}`, undefined, 101);
  assert.equal(r.statusCode, 200);
  assert.equal(r.headers["content-type"], "image/webp");
  assert.equal(r.headers["x-content-type-options"], "nosniff");
  const info = await sharp(r.rawPayload).metadata();
  assert.equal(info.format, "webp");
  assert.equal(info.exif, undefined);
  assert.equal(
    (await f.request("GET", `/v1/media/${a.id}`, undefined, 202)).statusCode,
    404,
  );
  assert.equal(
    (
      await f.request(
        "PUT",
        "/v1/profiles/me",
        { displayName: "thief", revision: 0, avatarId: a.id },
        202,
      )
    ).statusCode,
    400,
  );
  await f.ok("PUT", "/v1/profiles/me", {
    displayName: "Kiki",
    revision: 0,
    avatarId: a.id,
  });
  assert.equal(
    (await f.request("GET", `/v1/media/${a.id}`, undefined, 202)).statusCode,
    200,
  );
  assert.equal(
    (await f.request("DELETE", `/v1/media/${a.id}`, undefined, 101)).statusCode,
    409,
  );
  await f.ok("PUT", "/v1/blocks/101", {}, 202, 204);
  assert.equal(
    (await f.request("GET", `/v1/media/${a.id}`, undefined, 202)).statusCode,
    404,
  );
});
test("Reject fake, mismatched, oversized, SVG, animated and pixel-bomb uploads", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  const frames = Buffer.alloc(32 * 64 * 3, 30);
  frames.fill(230, 32 * 32 * 3);
  const animated = await sharp(frames, {
    raw: { width: 32, height: 64, channels: 3, pageHeight: 32 },
  })
    .webp({ loop: 0, delay: [50, 50] })
    .toBuffer();
  const cases = [
    [Buffer.from('<svg onload="alert(1)"></svg>'), "image/png", 415],
    [await image(), "image/jpeg", 415],
    [Buffer.alloc(5 * 1024 ** 2 + 1), "image/png", 413],
    [Buffer.from("<svg/>"), "image/svg+xml", 415],
    [animated, "image/webp", 415],
    [
      await sharp({
        create: {
          width: 5001,
          height: 5001,
          channels: 3,
          background: "#ffffff",
        },
      })
        .png()
        .toBuffer(),
      "image/png",
      415,
    ],
  ];
  for (const [bytes, mime, status] of cases) {
    const r = await f.request("POST", "/v1/media/feed", bytes, 101, {
      "content-type": mime,
      "content-length": String(bytes.length),
    });
    assert.equal(r.statusCode, status, r.body);
  }
  assert.equal(f.storage.objects.size, 0);
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM storage_assets").n, 0);
});
test("Quota reservations prevent parallel abuse; invalid attempts consume daily budget", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  f.config.limits.userBytes = f.config.limits.maxOutputBytes;
  const original = f.storage.put.bind(f.storage);
  let release;
  let arrived;
  const started = new Promise((r) => (arrived = r));
  f.storage.put = async (...args) => {
    arrived();
    await new Promise((r) => (release = r));
    return original(...args);
  };
  const bytes = await image();
  const pending = f.request("POST", "/v1/media/feed", bytes, 101, {
    "content-type": "image/png",
    "content-length": String(bytes.length),
  });
  await started;
  const second = await f.request("POST", "/v1/media/feed", bytes, 101, {
    "content-type": "image/png",
    "content-length": String(bytes.length),
  });
  assert.equal(second.statusCode, 413);
  assert.equal(second.json().error, "storage_quota");
  release();
  assert.equal((await pending).statusCode, 201);
  f.config.limits.uploadsPerDay = 2;
  assert.equal(
    (
      await f.request("POST", "/v1/media/feed", bytes, 101, {
        "content-type": "image/png",
        "content-length": String(bytes.length),
      })
    ).statusCode,
    429,
  );
});
test("Unreferenced dedup, abandoned upload cleanup, storage failures and deletion quota accounting", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  const a = await upload(f);
  const b = await upload(f);
  assert.equal(a.id, b.id);
  assert.equal(f.storage.objects.size, 1);
  f.storage.fail = true;
  const bytes = await image("#001122");
  assert.equal(
    (
      await f.request("POST", "/v1/media/feed", bytes, 101, {
        "content-type": "image/png",
        "content-length": String(bytes.length),
      })
    ).statusCode,
    503,
  );
  assert.equal(
    f.db.get("SELECT COUNT(*) AS n FROM storage_assets WHERE state='pending'")
      .n,
    1,
  );
  f.advance(25 * 3600000);
  await f.cleanup();
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM storage_assets").n, 2);
  f.storage.fail = false;
  await f.cleanup();
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM storage_assets").n, 0);
  assert.equal(f.storage.objects.size, 0);
});
test("Media attachment transaction rolls back without partial posts or cross-purpose media", async (t) => {
  const f = await fixture(t);
  await f.login(101);
  await f.login(202);
  const a = await upload(f, "avatar");
  assert.equal(
    (
      await f.request(
        "POST",
        "/v1/feed",
        { text: "wrong media", mediaIds: [a.id] },
        101,
      )
    ).statusCode,
    400,
  );
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM posts").n, 0);
  const b = await upload(f);
  await f.ok("POST", "/v1/feed", { text: "first", mediaIds: [b.id] }, 101, 201);
  assert.equal(
    (
      await f.request(
        "POST",
        "/v1/feed",
        { text: "second", mediaIds: [b.id] },
        101,
      )
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await f.request(
        "POST",
        "/v1/feed",
        { text: "theft", mediaIds: [b.id] },
        202,
      )
    ).statusCode,
    400,
  );
  assert.equal(f.db.get("SELECT COUNT(*) AS n FROM posts").n, 1);
});

test("Only moderators can review one reported resource; closing the report revokes image review", async (t) => {
  const f = await fixture(t);
  for (const n of [101, 202, 606]) await f.login(n);
  const bytes = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#666699" },
  })
    .png()
    .toBuffer();
  const upload = await f.request("POST", "/v1/media/feed", bytes, 101, {
    "content-type": "image/png",
    "content-length": String(bytes.length),
  });
  assert.equal(upload.statusCode, 201, upload.body);
  const asset = upload.json().id;
  const post = await f.ok(
    "POST",
    "/v1/feed",
    { text: "Reported content", mediaIds: [asset] },
    101,
    201,
  );
  const report = await f.ok(
    "POST",
    "/v1/reports",
    {
      targetType: "post",
      targetId: String(post.id),
      reason: "Please review this test content",
    },
    202,
    201,
  );
  assert.equal(
    (
      await f.request(
        "GET",
        `/v1/moderation/reports/${report.id}`,
        undefined,
        101,
      )
    ).statusCode,
    403,
  );
  const detail = await f.ok(
    "GET",
    `/v1/moderation/reports/${report.id}`,
    undefined,
    606,
  );
  assert.equal(detail.text, "Reported content");
  assert.deepEqual(detail.mediaIds, [asset]);
  assert.equal(
    (
      await f.request(
        "GET",
        `/v1/moderation/reports/${report.id}/media/${asset}`,
        undefined,
        606,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await f.request(
        "GET",
        `/v1/moderation/reports/${report.id}/media/${crypto.randomUUID()}`,
        undefined,
        606,
      )
    ).statusCode,
    404,
  );
  await f.ok(
    "POST",
    `/v1/moderation/reports/${report.id}/dismiss`,
    {},
    606,
    204,
  );
  assert.equal(
    (
      await f.request(
        "GET",
        `/v1/moderation/reports/${report.id}/media/${asset}`,
        undefined,
        606,
      )
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await f.request(
        "POST",
        "/v1/moderation/users/101/suspend",
        { reason: "Confirmed abusive test account" },
        202,
      )
    ).statusCode,
    403,
  );
  await f.ok(
    "POST",
    "/v1/moderation/users/101/suspend",
    { reason: "Confirmed abusive test account" },
    606,
    204,
  );
  assert.equal(
    (await f.request("GET", "/v1/me", undefined, 101)).statusCode,
    401,
  );
});
