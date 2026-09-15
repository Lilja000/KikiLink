import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.ts";

const context = { waitUntil() {} };
const emptyEnv = {};

test("ships with uploads disabled and exposes no configuration details", async () => {
  const health = await worker.fetch(
    new Request("https://relay.example/healthz"),
    emptyEnv,
    context,
  );
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "disabled" });

  const authorize = await worker.fetch(
    new Request("https://relay.example/authorize"),
    emptyEnv,
    context,
  );
  assert.equal(authorize.status, 503);
  assert.match(await authorize.text(), /Uploads are not enabled/u);
  assert.equal(authorize.headers.get("cache-control"), "no-store, max-age=0");
});

test("rejects authorization query data so state cannot enter request logs", async () => {
  const response = await worker.fetch(
    new Request("https://relay.example/authorize?state=secret"),
    emptyEnv,
    context,
  );
  assert.equal(response.status, 400);
});

test("fails closed when required abuse-control bindings are missing", async () => {
  const base = {
    UPLOADS_ENABLED: "true",
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET: "s".repeat(32),
    IP_HASH_SECRET: "h".repeat(32),
    UPLOAD_SESSIONS: {},
    GLOBAL_UPLOAD_LEDGER: {},
  };
  const response = await worker.fetch(
    new Request("https://relay.example/healthz"),
    base,
    context,
  );
  assert.deepEqual(await response.json(), { status: "misconfigured" });

  const invalidCap = await worker.fetch(
    new Request("https://relay.example/healthz"),
    {
      ...base,
      GLOBAL_DAILY_UPLOADS: "0",
      SESSION_RATE_LIMITER: { limit: async () => ({ success: true }) },
      UPLOAD_RATE_LIMITER: { limit: async () => ({ success: true }) },
    },
    context,
  );
  assert.deepEqual(await invalidCap.json(), { status: "misconfigured" });
});

test("returns narrow preflight CORS only to an exact allowed origin", async () => {
  const origin = "https://www.bondageprojects.com";
  const allowed = await worker.fetch(
    new Request("https://relay.example/v1/upload", {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers":
          "authorization, content-type, x-kikilink-file-extension, x-kikilink-upload-kind",
      },
    }),
    emptyEnv,
    context,
  );
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), origin);
  assert.equal(allowed.headers.get("access-control-allow-credentials"), null);
  assert.equal(allowed.headers.get("vary"), "Origin");

  const rejected = await worker.fetch(
    new Request("https://relay.example/v1/upload", {
      method: "OPTIONS",
      headers: {
        Origin: "https://www.bondageprojects.com.evil.example",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers":
          "authorization, content-type, x-kikilink-file-extension, x-kikilink-upload-kind",
      },
    }),
    emptyEnv,
    context,
  );
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get("access-control-allow-origin"), null);
});

test("does not allow additional preflight headers", async () => {
  const response = await worker.fetch(
    new Request("https://relay.example/v1/upload", {
      method: "OPTIONS",
      headers: {
        Origin: "https://www.bondageprojects.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers":
          "authorization, content-type, cookie, x-kikilink-file-extension, x-kikilink-upload-kind",
      },
    }),
    emptyEnv,
    context,
  );
  assert.equal(response.status, 400);
});

test("mints a bounded session only after exact Turnstile verification", async () => {
  const originalFetch = globalThis.fetch;
  const ledgerCalls = [];
  const limiter = { limit: async () => ({ success: true }) };
  const namespace = {
    idFromName(name) {
      assert.equal(name, "sessions-v1");
      return name;
    },
    get() {
      return {
        async fetch(request) {
          ledgerCalls.push(await request.json());
          return Response.json({ ok: true }, { status: 201 });
        },
      };
    },
  };
  const env = {
    UPLOADS_ENABLED: "true",
    RELAY_CANONICAL_ORIGIN: "https://relay.example",
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET: "s".repeat(32),
    IP_HASH_SECRET: "h".repeat(32),
    UPLOAD_SESSIONS: namespace,
    GLOBAL_UPLOAD_LEDGER: namespace,
    SESSION_RATE_LIMITER: limiter,
    UPLOAD_RATE_LIMITER: limiter,
  };
  const state = "S".repeat(43);
  let expectedCdata = state;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(init.redirect, "error");
    const form = new URLSearchParams(init.body);
    assert.equal(form.get("remoteip"), "203.0.113.10");
    assert.equal(form.get("response"), "turnstile-proof");
    return Response.json({
      success: true,
      hostname: "relay.example",
      action: "kikilink_upload",
      cdata: expectedCdata,
    });
  };

  const sessionRequest = () => new Request("https://relay.example/v1/session", {
    method: "POST",
    headers: {
      "CF-Connecting-IP": "203.0.113.10",
      "Content-Type": "application/json",
      Origin: "https://relay.example",
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify({
      origin: "https://www.bondageprojects.com",
      state,
      turnstileToken: "turnstile-proof",
    }),
  });

  try {
    const before = Date.now();
    const response = await worker.fetch(sessionRequest(), env, context);
    const payload = await response.json();
    assert.equal(response.status, 201);
    assert.match(payload.token, /^[A-Za-z0-9_-]{43}$/u);
    assert.equal(payload.expiresAt >= before + 9 * 60_000, true);
    assert.equal(payload.expiresAt <= Date.now() + 11 * 60_000, true);
    assert.equal(ledgerCalls.length, 1);
    assert.match(ledgerCalls[0].tokenHash, /^[A-Za-z0-9_-]{43}$/u);
    assert.notEqual(ledgerCalls[0].tokenHash, payload.token);
    assert.equal(ledgerCalls[0].origin, "https://www.bondageprojects.com");
    assert.match(ledgerCalls[0].ipHash, /^[A-Za-z0-9_-]{43}$/u);

    expectedCdata = "wrong-state";
    const rejected = await worker.fetch(sessionRequest(), env, context);
    assert.equal(rejected.status, 403);
    assert.equal(ledgerCalls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("applies one absolute deadline while waiting for the first upload bytes", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let bodyCancelled = false;
  let admitted;
  const admittedCall = new Promise((resolve) => {
    admitted = resolve;
  });
  const namespace = {
    idFromName: (name) => name,
    get: () => ({
      async fetch(request) {
        if (new URL(request.url).pathname === "/admit") admitted();
        return Response.json({ ok: true });
      },
    }),
  };
  const limiter = { limit: async () => ({ success: true }) };
  const env = {
    UPLOADS_ENABLED: "true",
    RELAY_CANONICAL_ORIGIN: "https://relay.example",
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET: "s".repeat(32),
    IP_HASH_SECRET: "h".repeat(32),
    UPLOAD_SESSIONS: namespace,
    GLOBAL_UPLOAD_LEDGER: namespace,
    SESSION_RATE_LIMITER: limiter,
    UPLOAD_RATE_LIMITER: limiter,
  };
  const body = new ReadableStream({
    start() {
      // Deliberately leave the first read pending until the Worker's deadline cancels it.
    },
    cancel() {
      bodyCancelled = true;
    },
  });
  const operation = worker.fetch(
    new Request("https://relay.example/v1/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${"a".repeat(43)}`,
        "CF-Connecting-IP": "203.0.113.10",
        "Content-Length": "12",
        "Content-Type": "image/webp",
        Origin: "https://www.bondageprojects.com",
        "X-KikiLink-File-Extension": "webp",
        "X-KikiLink-Upload-Kind": "image",
      },
      body,
      duplex: "half",
    }),
    env,
    context,
  );
  await admittedCall;
  await new Promise((resolve) => setImmediate(resolve));
  t.mock.timers.tick(5 * 60_000);
  const response = await operation;
  assert.equal(response.status, 504);
  assert.equal(bodyCancelled, true);
});

test("rejects short and long bodies, then streams an exact body without forwarding client headers", async () => {
  const fixedLengthDescriptor = Object.getOwnPropertyDescriptor(globalThis, "FixedLengthStream");
  const originalFetch = globalThis.fetch;
  let catboxCalls = 0;
  const ledgerNames = [];
  const rateKeys = [];
  Object.defineProperty(globalThis, "FixedLengthStream", {
    configurable: true,
    value: class {
      constructor() {
        const stream = new TransformStream();
        this.readable = stream.readable;
        this.writable = stream.writable;
      }
    },
  });
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://catbox.moe/user/api.php");
    catboxCalls += 1;
    assert.equal(new Headers(init.headers).has("authorization"), false);
    assert.equal(new Headers(init.headers).has("cookie"), false);
    assert.equal(new Headers(init.headers).has("content-length"), false);
    assert.equal(init.redirect, "manual");
    const reader = init.body.getReader();
    while (!(await reader.read()).done) {
      // Drain the multipart stream to exercise backpressure and final length validation.
    }
    return new Response("https://files.catbox.moe/abc123.webp\n");
  };

  const namespace = {
    idFromName: (name) => {
      ledgerNames.push(name);
      return name;
    },
    get: () => ({
      fetch: async () =>
        new Response('{"ok":true}', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    }),
  };
  const rateLimiter = {
    async limit({ key }) {
      rateKeys.push(key);
      return { success: true };
    },
  };
  const env = {
    UPLOADS_ENABLED: "true",
    RELAY_CANONICAL_ORIGIN: "https://relay.example",
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET: "s".repeat(32),
    IP_HASH_SECRET: "h".repeat(32),
    UPLOAD_SESSIONS: namespace,
    GLOBAL_UPLOAD_LEDGER: namespace,
    SESSION_RATE_LIMITER: rateLimiter,
    UPLOAD_RATE_LIMITER: rateLimiter,
  };

  try {
    const tooLong = await uploadRequest(env, ascii("RIFFxxxxWEBP!"), 12);
    assert.equal(tooLong.status, 400);
    assert.equal(catboxCalls, 0);

    const tooShort = await uploadRequest(env, ascii("RIFFxxxxWEBP"), 13);
    assert.equal(tooShort.status, 400);
    assert.equal(catboxCalls, 0);

    const exact = await uploadRequest(env, ascii("RIFFxxxxWEBP"), 12);
    assert.equal(exact.status, 200);
    assert.deepEqual(await exact.json(), { url: "https://files.catbox.moe/abc123.webp" });
    assert.equal(catboxCalls, 1);
    assert.equal(ledgerNames.includes("sessions-v1"), true);
    assert.equal(ledgerNames.includes("global-v1"), true);
    assert.deepEqual(
      [...new Set(ledgerNames)].sort(),
      ["global-v1", "sessions-v1"],
    );
    const tokenDigest = await sha256Base64Url("a".repeat(43));
    assert.equal(rateKeys.every((key) => key.startsWith("upload:")), true);
    assert.equal(rateKeys.includes(`upload:${tokenDigest}`), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (fixedLengthDescriptor) {
      Object.defineProperty(globalThis, "FixedLengthStream", fixedLengthDescriptor);
    } else {
      delete globalThis.FixedLengthStream;
    }
  }
});

async function uploadRequest(env, bytes, declaredLength) {
  return worker.fetch(
    new Request("https://relay.example/v1/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${"a".repeat(43)}`,
        "CF-Connecting-IP": "203.0.113.10",
        "Content-Length": String(declaredLength),
        "Content-Type": "image/webp",
        Origin: "https://www.bondageprojects.com",
        "X-KikiLink-File-Extension": "webp",
        "X-KikiLink-Upload-Kind": "image",
      },
      body: bytes,
      duplex: "half",
    }),
    env,
    context,
  );
}

function ascii(value) {
  return new TextEncoder().encode(value);
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("base64url");
}
