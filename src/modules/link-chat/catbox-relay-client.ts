import { KIKILINK_CATBOX_RELAY_URL } from "../../core/distribution";

const RELAY_MESSAGE_TYPE = "kikilink:catbox-relay-session:v1";
const RELAY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const RELAY_STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const MAX_RELAY_RESPONSE_BYTES = 4 * 1024;
const SESSION_TIMEOUT_MS = 2 * 60_000;
const MAX_RELAY_SESSION_LIFETIME_MS = 11 * 60_000;
const MAX_RELAY_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_RELAY_AUDIO_BYTES = 80 * 1024 * 1024;
const BONDAGE_CLUB_HOST_SUFFIXES = [
  ".bondageprojects.elementfx.com",
  ".bondageprojects.com",
  ".bondage-europe.com",
  ".bondageeurope.com",
  ".bondage-asia.com",
] as const;
const RELAY_AUDIO_MIME_TYPES: Readonly<Record<string, string>> = {
  aac: "audio/aac",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  webm: "audio/webm",
};

export type CatboxRelayUploadKind = "image" | "audio";

export interface CatboxRelayUploadOptions {
  kind: CatboxRelayUploadKind;
  extension: string;
  timeoutMs: number;
  signal?: AbortSignal;
}

interface RelaySession {
  token: string;
  expiresAt: number;
  relayOrigin: string;
  pageOrigin: string;
}

interface RelaySessionMessage {
  type: typeof RELAY_MESSAGE_TYPE;
  state: string;
  token: string;
  expiresAt: number;
}

interface RelayUploadResponse {
  response: Response;
  body: string;
}

export class CatboxRelayClient {
  #memorySession: RelaySession | undefined;

  constructor(
    private readonly relayUrl = KIKILINK_CATBOX_RELAY_URL,
    private readonly request: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {}

  get available(): boolean {
    return Boolean(normalizeRelayOrigin(this.relayUrl));
  }

  async upload(file: File, options: CatboxRelayUploadOptions): Promise<string> {
    if (options.signal?.aborted) throw new Error("The upload was cancelled");
    const relayOrigin = normalizeRelayOrigin(this.relayUrl);
    if (!relayOrigin) throw new Error("Long-lived Catbox uploads are unavailable in FUSAM");
    validateRelayFile(file, options);

    const session = await this.#session(relayOrigin, options.signal);
    const { response, body } = await this.#uploadOnce(relayOrigin, session, file, options);
    if (response.status === 401) {
      this.#forgetSession();
      throw new Error("Catbox relay verification expired. Press Upload again to verify and retry.");
    }
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(unconfirmedUploadError("Catbox did not return a usable result"));
      }
      throw new Error(cleanRelayError(body) || relayStatusError(response.status));
    }
    const url = normalizeRelayUploadResponse(body);
    if (
      !url ||
      !new URL(url).pathname.toLocaleLowerCase().endsWith(`.${options.extension.toLocaleLowerCase()}`)
    ) {
      throw new Error(unconfirmedUploadError("The Catbox relay returned an unexpected link"));
    }
    return url;
  }

  async #uploadOnce(
    relayOrigin: string,
    session: RelaySession,
    file: File,
    options: CatboxRelayUploadOptions,
  ): Promise<RelayUploadResponse> {
    const controller = new AbortController();
    let timedOut = false;
    const abort = (): void => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs);
    try {
      const response = await this.request(`${relayOrigin}/v1/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": file.type,
          "X-KikiLink-Upload-Kind": options.kind,
          "X-KikiLink-File-Extension": options.extension,
        },
        body: file,
        mode: "cors",
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
      const body = await readBoundedText(response, MAX_RELAY_RESPONSE_BYTES, controller.signal);
      return { response, body };
    } catch (error) {
      if (timedOut) throw new Error(unconfirmedUploadError("The upload timed out"));
      if (options.signal?.aborted) throw new Error(unconfirmedUploadError("The upload was cancelled"));
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(unconfirmedUploadError("The upload was interrupted"));
      }
      if (error instanceof TypeError) {
        throw new Error(unconfirmedUploadError("The Catbox relay could not be reached"));
      }
      throw new Error(unconfirmedUploadError(
        error instanceof Error && error.message.trim()
          ? error.message.trim().slice(0, 120)
          : "The Catbox relay upload failed",
      ));
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }

  async #session(relayOrigin: string, signal?: AbortSignal): Promise<RelaySession> {
    const pageOrigin = currentPageOrigin();
    const current = this.#memorySession;
    if (
      current &&
      current.relayOrigin === relayOrigin &&
      current.pageOrigin === pageOrigin &&
      current.expiresAt > Date.now() + 60_000 &&
      RELAY_TOKEN_PATTERN.test(current.token)
    ) {
      this.#memorySession = current;
      return current;
    }
    this.#forgetSession();
    const created = await requestRelaySession(relayOrigin, pageOrigin, signal);
    this.#memorySession = created;
    return created;
  }

  #forgetSession(): void {
    this.#memorySession = undefined;
  }
}

export function normalizeRelayUploadResponse(value: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const urlValue = Reflect.get(parsed, "url");
  if (typeof urlValue !== "string") return null;
  try {
    const url = new URL(urlValue);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "files.catbox.moe" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/[a-z0-9_-]+\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm|webp)$/iu.test(url.pathname)
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

async function requestRelaySession(
  relayOrigin: string,
  pageOrigin: string,
  signal?: AbortSignal,
): Promise<RelaySession> {
  if (signal?.aborted) throw new Error("The upload was cancelled");
  const state = randomBase64Url(32);
  const authorizeUrl = new URL("/authorize", relayOrigin);
  authorizeUrl.hash = new URLSearchParams({ origin: pageOrigin, state }).toString();
  const popup = window.open(
    authorizeUrl.href,
    "kikilink-catbox-relay",
    "popup=yes,width=480,height=680,resizable=yes,scrollbars=yes",
  );
  if (!popup) {
    throw new Error("Allow the KikiLink verification popup, then try the upload again");
  }

  return new Promise<RelaySession>((resolve, reject) => {
    let settled = false;
    const finish = (run: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearInterval(closedPoll);
      window.removeEventListener("message", onMessage);
      signal?.removeEventListener("abort", onAbort);
      try {
        popup.close();
      } catch {
        // Ignore a browser refusing to close an already detached popup.
      }
      run();
    };
    const fail = (message: string): void => finish(() => reject(new Error(message)));
    const onAbort = (): void => fail("The upload was cancelled");
    const onMessage = (event: MessageEvent): void => {
      if (event.origin !== relayOrigin || event.source !== popup) return;
      const message = normalizeSessionMessage(event.data, state);
      if (!message) return;
      const session: RelaySession = {
        token: message.token,
        expiresAt: message.expiresAt,
        relayOrigin,
        pageOrigin,
      };
      finish(() => resolve(session));
    };
    const timeout = setTimeout(() => fail("Catbox relay verification timed out"), SESSION_TIMEOUT_MS);
    const closedPoll = setInterval(() => {
      try {
        if (popup.closed) fail("Catbox relay verification was cancelled");
      } catch {
        // Cross-origin popup state can be temporarily unavailable during navigation.
      }
    }, 500);
    window.addEventListener("message", onMessage);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function normalizeSessionMessage(value: unknown, state: string): RelaySessionMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const message = value as Partial<RelaySessionMessage>;
  if (
    message.type !== RELAY_MESSAGE_TYPE ||
    message.state !== state ||
    !RELAY_STATE_PATTERN.test(message.state) ||
    typeof message.token !== "string" ||
    !RELAY_TOKEN_PATTERN.test(message.token) ||
    typeof message.expiresAt !== "number" ||
    !Number.isSafeInteger(message.expiresAt) ||
    message.expiresAt <= Date.now() + 60_000 ||
    message.expiresAt > Date.now() + MAX_RELAY_SESSION_LIFETIME_MS
  ) {
    return null;
  }
  return message as RelaySessionMessage;
}

function validateRelayFile(file: File, options: CatboxRelayUploadOptions): void {
  const extension = options.extension.toLocaleLowerCase();
  if (!/^[a-z0-9]{2,5}$/u.test(extension)) throw new Error("The upload file type is invalid");
  if (options.kind === "image") {
    if (
      extension !== "webp" ||
      file.type !== "image/webp" ||
      file.size <= 0 ||
      file.size > MAX_RELAY_IMAGE_BYTES
    ) {
      throw new Error("The prepared image is invalid");
    }
  } else {
    const expectedMime = RELAY_AUDIO_MIME_TYPES[extension];
    if (
      !expectedMime ||
      file.type !== expectedMime ||
      file.size <= 0 ||
      file.size > MAX_RELAY_AUDIO_BYTES
    ) {
      throw new Error("The track type is invalid");
    }
  }
  if (
    !Number.isSafeInteger(options.timeoutMs) ||
    options.timeoutMs < 1_000 ||
    options.timeoutMs > 300_000
  ) {
    throw new Error("The upload timeout is invalid");
  }
}

function normalizeRelayOrigin(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && url.origin === value ? url.origin : null;
  } catch {
    return null;
  }
}

function currentPageOrigin(): string {
  const origin = window.location.origin;
  if (!isAllowedBondageClubOrigin(origin)) {
    throw new Error("Catbox relay verification requires an official Bondage Club page");
  }
  return origin;
}

export function isAllowedBondageClubOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.port &&
      url.origin === value &&
      BONDAGE_CLUB_HOST_SUFFIXES.some((suffix) =>
        url.hostname.endsWith(suffix) && url.hostname.length > suffix.length)
    );
  } catch {
    return false;
  }
}

function randomBase64Url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

async function readBoundedText(
  response: Response,
  limit: number,
  signal: AbortSignal,
): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) > limit) {
    await response.body?.cancel().catch(() => undefined);
    return "";
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const abort = (): void => {
    void reader.cancel(new DOMException("Aborted", "AbortError")).catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        return "";
      }
      chunks.push(value);
    }
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return "";
    }
  } finally {
    signal.removeEventListener("abort", abort);
    try {
      reader.releaseLock();
    } catch {
      // The stream may have been cancelled.
    }
  }
}

function cleanRelayError(value: string): string {
  if (!value || /<(?:!doctype|html|head|body|meta|title)\b/iu.test(value)) return "";
  try {
    const parsed = JSON.parse(value) as { error?: unknown };
    if (typeof parsed.error !== "string") return "";
    return parsed.error.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 180);
  } catch {
    return "";
  }
}

function relayStatusError(status: number): string {
  if (status === 401) return "Catbox relay verification expired";
  if (status === 413) return "The file is too large for the Catbox relay";
  if (status === 429) return "Too many uploads. Wait a moment and try again.";
  if (status >= 500) return "The Catbox relay is temporarily unavailable";
  return `The Catbox relay returned HTTP ${status}`;
}

function unconfirmedUploadError(reason: string): string {
  return `${reason}. The result is unconfirmed: the file may already be public, and retrying can create a duplicate.`;
}
