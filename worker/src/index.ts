import { renderAuthorizePage, renderDisabledPage } from "./authorize-page.ts";
import { GlobalUploadLedger, UploadSessionLedger } from "./ledger.ts";
import {
  CATBOX_ENDPOINT,
  MAX_CATBOX_RESPONSE_BYTES,
  SESSION_TTL_MS,
  STATE_PATTERN,
  TOKEN_PATTERN,
  createMultipartPreamble,
  createMultipartSuffix,
  hasExpectedMagic,
  normalizeBondageClubOrigin,
  normalizeCatboxResponse,
  parseUploadDescriptor,
  type UploadDescriptor,
} from "./policy.ts";
import type {
  DurableObjectNamespace,
  Env,
  ExecutionContext,
  RateLimitBinding,
} from "./runtime-types.ts";

export { GlobalUploadLedger, UploadSessionLedger };
export type { Env };

const TURNSTILE_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SESSION_ACTION = "kikilink_upload";
const MAX_SESSION_BODY_BYTES = 4 * 1024;
const MAGIC_PREFIX_BYTES = 64;
const DEFAULT_GLOBAL_DAILY_UPLOADS = 100;
const DEFAULT_GLOBAL_DAILY_BYTES = 2 * 1024 * 1024 * 1024;
const DEFAULT_GLOBAL_MAX_CONCURRENT = 2;
const CATBOX_TIMEOUT_MS = 5 * 60_000;
const SESSION_BODY_TIMEOUT_MS = 10_000;
const SESSION_LEDGER_NAME = "sessions-v1";
const ALLOWED_PREFLIGHT_HEADERS = new Set([
  "authorization",
  "content-type",
  "x-kikilink-file-extension",
  "x-kikilink-upload-kind",
]);

interface SessionRequestBody {
  origin: string;
  state: string;
  turnstileToken: string;
}

interface TurnstileResult {
  success?: unknown;
  hostname?: unknown;
  action?: unknown;
  cdata?: unknown;
}

interface LedgerResult {
  ok: boolean;
  error?: string;
}

interface InitialBody {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  chunks: Uint8Array[];
  prefix: Uint8Array;
  bytesRead: number;
  done: boolean;
}

export default {
  async fetch(request: Request, env: Env, _context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsOrigin = normalizeBondageClubOrigin(request.headers.get("origin"));
    try {
      if (
        uploadsEnabled(env) &&
        relayConfigured(env) &&
        url.origin !== normalizeRelayOrigin(env.RELAY_CANONICAL_ORIGIN)
      ) {
        return jsonResponse({ error: "Not found" }, 404);
      }
      if (url.pathname === "/healthz") return handleHealth(request, env, url);
      if (url.pathname === "/authorize") return handleAuthorize(request, env, url);
      if (url.pathname === "/v1/session") return handleSession(request, env, url);
      if (url.pathname === "/v1/upload") return handleUpload(request, env, url, corsOrigin);
      return jsonResponse({ error: "Not found" }, 404);
    } catch {
      return jsonResponse(
        { error: "The Catbox relay is temporarily unavailable" },
        500,
        url.pathname === "/v1/upload" ? corsOrigin : null,
      );
    }
  },
};

function handleHealth(request: Request, env: Env, url: URL): Response {
  if (request.method !== "GET" || url.search) return jsonResponse({ error: "Not found" }, 404);
  const status = !uploadsEnabled(env)
    ? "disabled"
    : relayConfigured(env)
      ? "ready"
      : "misconfigured";
  return jsonResponse({ status }, 200);
}

function handleAuthorize(request: Request, env: Env, url: URL): Response {
  if (request.method !== "GET") return methodNotAllowed("GET");
  if (url.search) return jsonResponse({ error: "Authorization data must not be in the query" }, 400);
  if (!uploadsEnabled(env)) return htmlResponse(renderDisabledPage(), 503, null);
  if (!relayConfigured(env)) return htmlResponse(renderDisabledPage(), 503, null);
  const nonce = randomBase64Url(18);
  return htmlResponse(renderAuthorizePage(env.TURNSTILE_SITE_KEY!, nonce), 200, nonce);
}

async function handleSession(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (url.search) return jsonResponse({ error: "Invalid session request" }, 400);
  if (!uploadsEnabled(env)) return jsonResponse({ error: "Long-lived uploads are disabled" }, 503);
  if (!relayConfigured(env)) {
    return jsonResponse({ error: "The Catbox relay is temporarily unavailable" }, 503);
  }
  if (
    request.headers.get("origin") !== url.origin ||
    (request.headers.has("sec-fetch-site") &&
      request.headers.get("sec-fetch-site") !== "same-origin")
  ) {
    return jsonResponse({ error: "Invalid session origin" }, 403);
  }
  if (request.headers.get("content-type") !== "application/json") {
    return jsonResponse({ error: "Invalid session request" }, 415);
  }

  const ip = clientIp(request);
  if (!ip) return jsonResponse({ error: "The client network could not be verified" }, 403);
  const ipHash = await dailyIpHash(env.IP_HASH_SECRET!, ip, new Date());
  if (!(await passRateLimit(env.SESSION_RATE_LIMITER, `session:${ipHash}`))) {
    return jsonResponse({ error: "Too many verification attempts" }, 429);
  }

  const rawBody = await readBoundedTextWithTimeout(
    request.body,
    MAX_SESSION_BODY_BYTES,
    SESSION_BODY_TIMEOUT_MS,
  );
  const body = parseSessionRequest(rawBody);
  if (!body) return jsonResponse({ error: "Invalid session request" }, 400);
  const origin = normalizeBondageClubOrigin(body.origin);
  if (!origin || origin !== body.origin) {
    return jsonResponse({ error: "Invalid Bondage Club origin" }, 403);
  }
  const turnstileValid = await verifyTurnstile(
    env.TURNSTILE_SECRET!,
    body.turnstileToken,
    ip,
    url.hostname,
    body.state,
  );
  if (!turnstileValid) return jsonResponse({ error: "Verification was rejected" }, 403);

  const token = randomBase64Url(32);
  const tokenHash = await sha256Base64Url(token);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const created = await callLedger(env.UPLOAD_SESSIONS, SESSION_LEDGER_NAME, "/create", {
    tokenHash,
    origin,
    ipHash,
    expiresAt,
  });
  if (!created.ok) {
    return jsonResponse({ error: "The Catbox relay is temporarily unavailable" }, 503);
  }
  return jsonResponse({ token, expiresAt }, 201);
}

async function handleUpload(
  request: Request,
  env: Env,
  url: URL,
  corsOrigin: string | null,
): Promise<Response> {
  if (request.method === "OPTIONS") return handleUploadPreflight(request, corsOrigin);
  if (request.method !== "POST") return methodNotAllowed("POST, OPTIONS", corsOrigin);
  if (!corsOrigin) return jsonResponse({ error: "Invalid Bondage Club origin" }, 403);
  if (url.search) return jsonResponse({ error: "Invalid upload request" }, 400, corsOrigin);
  if (!uploadsEnabled(env)) {
    return jsonResponse({ error: "Long-lived uploads are disabled" }, 503, corsOrigin);
  }
  if (!relayConfigured(env)) {
    return jsonResponse({ error: "The Catbox relay is temporarily unavailable" }, 503, corsOrigin);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/u.exec(authorization);
  if (!match || !TOKEN_PATTERN.test(match[1]!)) {
    return jsonResponse({ error: "Upload verification expired" }, 401, corsOrigin);
  }
  const tokenHash = await sha256Base64Url(match[1]!);
  const ip = clientIp(request);
  if (!ip) {
    return jsonResponse({ error: "The client network could not be verified" }, 403, corsOrigin);
  }
  const ipHash = await dailyIpHash(env.IP_HASH_SECRET!, ip, new Date());
  if (!(await passRateLimit(env.UPLOAD_RATE_LIMITER, `upload:${ipHash}`))) {
    return jsonResponse({ error: "Too many uploads" }, 429, corsOrigin);
  }

  const descriptorResult = parseUploadDescriptor(request.headers);
  if (!descriptorResult.ok) {
    return jsonResponse(
      { error: descriptorResult.error },
      descriptorResult.status,
      corsOrigin,
    );
  }
  if (!request.body) return jsonResponse({ error: "The file body is missing" }, 400, corsOrigin);
  const globalDailyUploads = boundedInteger(
    env.GLOBAL_DAILY_UPLOADS,
    DEFAULT_GLOBAL_DAILY_UPLOADS,
    1,
    5_000,
  );
  const globalDailyBytes = boundedInteger(
    env.GLOBAL_DAILY_BYTES,
    DEFAULT_GLOBAL_DAILY_BYTES,
    1024 * 1024,
    100 * 1024 * 1024 * 1024,
  );
  const globalMaxConcurrent = boundedInteger(
    env.GLOBAL_MAX_CONCURRENT,
    DEFAULT_GLOBAL_MAX_CONCURRENT,
    1,
    20,
  );
  if (
    globalDailyUploads === null ||
    globalDailyBytes === null ||
    globalMaxConcurrent === null
  ) {
    return jsonResponse({ error: "The Catbox relay is temporarily unavailable" }, 503, corsOrigin);
  }

  const leaseId = randomBase64Url(32);
  const sessionAdmission = await callLedger(env.UPLOAD_SESSIONS, SESSION_LEDGER_NAME, "/admit", {
    tokenHash,
    origin: corsOrigin,
    ipHash,
    bytes: descriptorResult.value.bytes,
    leaseId,
    now: Date.now(),
  });
  if (!sessionAdmission.ok) {
    const status = sessionAdmission.status === 401 ? 401 : sessionAdmission.status === 429 ? 429 : 503;
    const error = status === 401 ? "Upload verification expired" : status === 429 ? "Upload quota reached" : "The Catbox relay is temporarily unavailable";
    return jsonResponse({ error }, status, corsOrigin);
  }

  let initial: InitialBody | undefined;
  let globalLeaseAdmitted = false;
  const uploadController = new AbortController();
  let uploadTimedOut = false;
  const abortUpload = (): void => uploadController.abort();
  request.signal.addEventListener("abort", abortUpload, { once: true });
  if (request.signal.aborted) uploadController.abort();
  const uploadTimeout = setTimeout(() => {
    uploadTimedOut = true;
    uploadController.abort();
  }, CATBOX_TIMEOUT_MS);
  try {
    initial = await readInitialBody(
      request.body,
      descriptorResult.value.bytes,
      uploadController.signal,
    );
    if (!hasExpectedMagic(initial.prefix, descriptorResult.value.extension)) {
      await initial.reader.cancel().catch(() => undefined);
      return jsonResponse({ error: "The file signature does not match its type" }, 415, corsOrigin);
    }

    const globalAdmission = await callLedger(
      env.GLOBAL_UPLOAD_LEDGER,
      "global-v1",
      "/admit",
      {
        bytes: descriptorResult.value.bytes,
        maxAttempts: globalDailyUploads,
        maxBytes: globalDailyBytes,
        maxConcurrent: globalMaxConcurrent,
        leaseId,
        now: Date.now(),
      },
    );
    if (!globalAdmission.ok) {
      await initial.reader.cancel().catch(() => undefined);
      const status = globalAdmission.status === 429 ? 429 : 503;
      const busy = status === 429 && globalAdmission.error === "global_concurrency";
      const error = busy
        ? "The relay is busy. Wait a moment and try again."
        : status === 429
          ? "The relay daily upload limit was reached"
          : "The Catbox relay is temporarily unavailable";
      const response = jsonResponse({ error }, status, corsOrigin);
      if (busy) response.headers.set("Retry-After", "10");
      return response;
    }
    globalLeaseAdmitted = true;

    const catboxUrl = await forwardToCatbox(
      initial,
      descriptorResult.value,
      uploadController.signal,
    );
    return jsonResponse({ url: catboxUrl }, 200, corsOrigin);
  } catch (error) {
    if (initial) await initial.reader.cancel().catch(() => undefined);
    if (error instanceof BodyLengthError) {
      return jsonResponse({ error: "The file length did not match Content-Length" }, 400, corsOrigin);
    }
    if (uploadTimedOut) {
      return jsonResponse({ error: "The upload timed out" }, 504, corsOrigin);
    }
    return jsonResponse({ error: "Catbox could not accept the upload" }, 502, corsOrigin);
  } finally {
    clearTimeout(uploadTimeout);
    request.signal.removeEventListener("abort", abortUpload);
    if (globalLeaseAdmitted) {
      await releaseGlobalLedgerLease(env.GLOBAL_UPLOAD_LEDGER, leaseId);
    }
    await releaseLedgerLease(env.UPLOAD_SESSIONS, tokenHash, leaseId);
  }
}

function handleUploadPreflight(request: Request, corsOrigin: string | null): Response {
  if (!corsOrigin) return jsonResponse({ error: "Invalid Bondage Club origin" }, 403);
  if (request.headers.get("access-control-request-method") !== "POST") {
    return jsonResponse({ error: "Invalid preflight request" }, 400, corsOrigin);
  }
  const rawHeaders = request.headers.get("access-control-request-headers") ?? "";
  const requestedHeaders = rawHeaders
    .split(",")
    .map((value) => value.trim().toLocaleLowerCase())
    .filter(Boolean);
  if (
    requestedHeaders.length !== ALLOWED_PREFLIGHT_HEADERS.size ||
    new Set(requestedHeaders).size !== requestedHeaders.length ||
    requestedHeaders.some((header) => !ALLOWED_PREFLIGHT_HEADERS.has(header))
  ) {
    return jsonResponse({ error: "Invalid preflight headers" }, 400, corsOrigin);
  }
  const headers = responseHeaders(corsOrigin);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", [...ALLOWED_PREFLIGHT_HEADERS].join(", "));
  headers.set("Access-Control-Max-Age", "600");
  return new Response(null, { status: 204, headers });
}

async function forwardToCatbox(
  initial: InitialBody,
  descriptor: UploadDescriptor,
  signal: AbortSignal,
): Promise<string> {
  const boundary = `KikiLink-${randomBase64Url(24)}`;
  const preamble = createMultipartPreamble(boundary, descriptor);
  const suffix = createMultipartSuffix(boundary);
  const totalLength = preamble.byteLength + descriptor.bytes + suffix.byteLength;
  const stream = new FixedLengthStream(totalLength);
  const pumping = pumpMultipart(
    stream.writable,
    initial,
    preamble,
    suffix,
    descriptor.bytes,
    signal,
  );

  let response: Response;
  try {
    response = await fetch(CATBOX_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "text/plain",
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "User-Agent": "KikiLink-Catbox-Relay/0.1 (+https://github.com/Lilja000/KikiLink)",
      },
      body: stream.readable,
      credentials: "omit",
      redirect: "manual",
      referrerPolicy: "no-referrer",
      signal,
    });
    await pumping;
  } catch (error) {
    await pumping.catch(() => undefined);
    throw error;
  }

  if (response.status < 200 || response.status >= 300) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Catbox rejected the upload");
  }
  const responseText = await readBoundedText(response.body, MAX_CATBOX_RESPONSE_BYTES, signal);
  const url = normalizeCatboxResponse(responseText, descriptor.extension);
  if (!url) throw new Error("Catbox returned an invalid link");
  return url;
}

async function pumpMultipart(
  writable: WritableStream<Uint8Array>,
  initial: InitialBody,
  preamble: Uint8Array,
  suffix: Uint8Array,
  expectedBytes: number,
  signal: AbortSignal,
): Promise<void> {
  const writer = writable.getWriter();
  const abortError = new DOMException("Aborted", "AbortError");
  const abort = (): void => {
    void initial.reader.cancel(abortError).catch(() => undefined);
    void writer.abort(abortError).catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  let fileBytes = 0;
  const writeFileChunk = async (chunk: Uint8Array): Promise<void> => {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    fileBytes += chunk.byteLength;
    if (fileBytes > expectedBytes) throw new BodyLengthError();
    await writer.write(chunk);
  };
  try {
    await writer.write(preamble);
    for (const chunk of initial.chunks) await writeFileChunk(chunk);
    while (!initial.done) {
      const next = await initial.reader.read();
      if (next.done) break;
      if (next.value.byteLength > 0) await writeFileChunk(next.value);
    }
    if (fileBytes !== expectedBytes) throw new BodyLengthError();
    await writer.write(suffix);
    await writer.close();
  } catch (error) {
    await writer.abort(error).catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    try {
      writer.releaseLock();
    } catch {
      // The fixed-length stream can already be errored and detached.
    }
    try {
      initial.reader.releaseLock();
    } catch {
      // The incoming stream can already be cancelled.
    }
  }
}

async function readInitialBody(
  body: ReadableStream<Uint8Array>,
  declaredBytes: number,
  signal: AbortSignal,
): Promise<InitialBody> {
  const reader = body.getReader();
  const abort = (): void => {
    void reader.cancel(new DOMException("Aborted", "AbortError")).catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    let done = false;
    while (total < MAGIC_PREFIX_BYTES) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const next = await reader.read();
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (next.done) {
        done = true;
        break;
      }
      if (next.value.byteLength === 0) continue;
      chunks.push(next.value);
      total += next.value.byteLength;
      if (total > declaredBytes) throw new BodyLengthError();
    }
    if (done && total !== declaredBytes) throw new BodyLengthError();
    const prefixLength = Math.min(total, MAGIC_PREFIX_BYTES);
    const prefix = new Uint8Array(prefixLength);
    let offset = 0;
    for (const chunk of chunks) {
      if (offset >= prefixLength) break;
      const copy = chunk.subarray(0, Math.min(chunk.byteLength, prefixLength - offset));
      prefix.set(copy, offset);
      offset += copy.byteLength;
    }
    return { reader, chunks, prefix, bytesRead: total, done };
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    try {
      reader.releaseLock();
    } catch {
      // The incoming stream can already be detached.
    }
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string,
  expectedHostname: string,
  expectedState: string,
): Promise<boolean> {
  const form = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
    idempotency_key: crypto.randomUUID(),
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(TURNSTILE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const raw = await readBoundedText(
      response.body,
      MAX_SESSION_BODY_BYTES,
      controller.signal,
    );
    let result: TurnstileResult;
    try {
      result = JSON.parse(raw) as TurnstileResult;
    } catch {
      return false;
    }
    return (
      result.success === true &&
      result.hostname === expectedHostname.toLocaleLowerCase() &&
      result.action === SESSION_ACTION &&
      result.cdata === expectedState
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function parseSessionRequest(value: string): SessionRequestBody | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const origin = Reflect.get(parsed, "origin");
    const state = Reflect.get(parsed, "state");
    const turnstileToken = Reflect.get(parsed, "turnstileToken");
    if (
      typeof origin !== "string" ||
      typeof state !== "string" ||
      !STATE_PATTERN.test(state) ||
      typeof turnstileToken !== "string" ||
      turnstileToken.length < 1 ||
      turnstileToken.length > 2_048 ||
      /[\u0000-\u001f\u007f]/u.test(turnstileToken)
    ) {
      return null;
    }
    return { origin, state, turnstileToken };
  } catch {
    return null;
  }
}

async function callLedger(
  namespace: DurableObjectNamespace,
  name: string,
  path: string,
  body: object,
): Promise<LedgerResult & { status: number }> {
  try {
    const id = namespace.idFromName(name);
    const response = await namespace.get(id).fetch(
      new Request(`https://ledger.internal${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    const raw = await readBoundedText(response.body, MAX_SESSION_BODY_BYTES);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Reflect.get(parsed, "ok") !== true) {
      const error = parsed && typeof parsed === "object" ? Reflect.get(parsed, "error") : undefined;
      return {
        ok: false,
        status: response.status,
        ...(typeof error === "string" ? { error } : {}),
      };
    }
    return { ok: true, status: response.status };
  } catch {
    return { ok: false, status: 503 };
  }
}

async function releaseLedgerLease(
  namespace: DurableObjectNamespace,
  tokenHash: string,
  leaseId: string,
): Promise<void> {
  await callLedger(namespace, SESSION_LEDGER_NAME, "/release", {
    tokenHash,
    leaseId,
    now: Date.now(),
  }).catch(() => undefined);
}

async function releaseGlobalLedgerLease(
  namespace: DurableObjectNamespace,
  leaseId: string,
): Promise<void> {
  await callLedger(namespace, "global-v1", "/release", {
    leaseId,
    now: Date.now(),
  }).catch(() => undefined);
}

async function passRateLimit(binding: RateLimitBinding | undefined, key: string): Promise<boolean> {
  if (!binding) return false;
  return (await binding.limit({ key })).success;
}

function clientIp(request: Request): string | null {
  const value = request.headers.get("cf-connecting-ip") ?? "";
  if (value.length < 3 || value.length > 64 || !/^[0-9a-f:.]+$/iu.test(value)) return null;
  return value.toLocaleLowerCase();
}

async function dailyIpHash(secret: string, ip: string, date: Date): Promise<string> {
  const day = date.toISOString().slice(0, 10);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${day}\u0000${ip}`),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

function randomBase64Url(byteLength: number): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

async function readBoundedText(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  signal?: AbortSignal,
): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const abort = (): void => {
    void reader.cancel(new DOMException("Aborted", "AbortError")).catch(() => undefined);
  };
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      if (signal?.aborted) return "";
      const next = await reader.read();
      if (signal?.aborted) return "";
      if (next.done) break;
      total += next.value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        return "";
      }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return "";
  } finally {
    signal?.removeEventListener("abort", abort);
    try {
      reader.releaseLock();
    } catch {
      // The stream can already be cancelled.
    }
  }
}

async function readBoundedTextWithTimeout(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await readBoundedText(body, limit, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function uploadsEnabled(env: Env): boolean {
  return env.UPLOADS_ENABLED === "true";
}

function relayConfigured(env: Env): boolean {
  return Boolean(
    normalizeRelayOrigin(env.RELAY_CANONICAL_ORIGIN) &&
      env.TURNSTILE_SITE_KEY &&
      env.TURNSTILE_SITE_KEY.length <= 256 &&
      env.TURNSTILE_SECRET &&
      env.TURNSTILE_SECRET.length >= 16 &&
      env.IP_HASH_SECRET &&
      env.IP_HASH_SECRET.length >= 32 &&
      env.UPLOAD_SESSIONS &&
      env.GLOBAL_UPLOAD_LEDGER &&
      env.SESSION_RATE_LIMITER &&
      env.UPLOAD_RATE_LIMITER &&
      boundedInteger(env.GLOBAL_DAILY_UPLOADS, DEFAULT_GLOBAL_DAILY_UPLOADS, 1, 5_000) !== null &&
      boundedInteger(
        env.GLOBAL_DAILY_BYTES,
        DEFAULT_GLOBAL_DAILY_BYTES,
        1024 * 1024,
        100 * 1024 * 1024 * 1024,
      ) !== null &&
      boundedInteger(
        env.GLOBAL_MAX_CONCURRENT,
        DEFAULT_GLOBAL_MAX_CONCURRENT,
        1,
        20,
      ) !== null,
  );
}

function normalizeRelayOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.origin !== value ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function boundedInteger(
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number | null {
  if (raw === undefined) return fallback;
  if (!/^[1-9][0-9]*$/u.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function methodNotAllowed(allow: string, origin: string | null = null): Response {
  const response = jsonResponse({ error: "Method not allowed" }, 405, origin);
  response.headers.set("Allow", allow);
  return response;
}

function jsonResponse(value: object, status: number, origin: string | null = null): Response {
  const headers = responseHeaders(origin);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(value), { status, headers });
}

function htmlResponse(value: string, status: number, nonce: string | null): Response {
  const headers = responseHeaders(null);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set(
    "Content-Security-Policy",
    nonce
      ? `default-src 'none'; script-src 'nonce-${nonce}' https://challenges.cloudflare.com; style-src 'nonce-${nonce}'; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`
      : "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  );
  return new Response(value, { status, headers });
}

function responseHeaders(origin: string | null): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store, max-age=0",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return headers;
}

class BodyLengthError extends Error {}
