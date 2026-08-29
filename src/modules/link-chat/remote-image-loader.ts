export const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024;

const DEFAULT_CACHE_ENTRIES = 24;
const DEFAULT_CACHE_BYTES = 40 * 1024 * 1024;
const MAX_CONCURRENT_REQUESTS = 4;
const MAX_IN_FLIGHT_REQUESTS = 32;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const MAX_REQUEST_TIMEOUT_MS = 30_000;
const MAX_REMOTE_URL_LENGTH = 4_096;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type RemoteImageFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

interface ObjectUrlPlatform {
  create(blob: Blob): string;
  revoke(url: string): void;
}

export interface RemoteImageLoaderOptions {
  /** Pass null to deliberately disable network loading, primarily for constrained runtimes/tests. */
  fetchImpl?: RemoteImageFetch | null;
  /** Pass null when this runtime cannot safely create and revoke object URLs. */
  objectUrls?: ObjectUrlPlatform | null;
  maxCacheEntries?: number;
  maxCacheBytes?: number;
  /** May lower, but never raise, the production five MiB limit. */
  maxImageBytes?: number;
  /** May lower, but never raise, the production concurrent network-request limit. */
  maxConcurrentRequests?: number;
  /** May lower, but never raise, the production active-plus-queued request limit. */
  maxInFlightRequests?: number;
  /** Bounds total time spent queued or fetching. May lower the production timeout. */
  requestTimeoutMs?: number;
}

export type RemoteImageLoadErrorCode =
  | "destroyed"
  | "invalid-url"
  | "mime"
  | "network"
  | "overloaded"
  | "response"
  | "timeout"
  | "too-large"
  | "unsupported";

export class RemoteImageLoadError extends Error {
  override readonly name = "RemoteImageLoadError";

  constructor(
    readonly code: RemoteImageLoadErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

interface CachedImage {
  objectUrl: string;
  size: number;
}

interface InFlightImage {
  key: string;
  controller: AbortController;
  promise: Promise<string>;
  resolve: (objectUrl: string) => void;
  reject: (error: unknown) => void;
  consumers: number;
  settled: boolean;
  state: "queued" | "active" | "done";
  timeout: ReturnType<typeof setTimeout>;
}

interface LoadedImage {
  blob: Blob;
  size: number;
}

/**
 * Fetches untrusted remote images without cookies or referrer data and exposes only local blob URLs.
 * One instance should be owned by the view that consumes it and destroyed with that view.
 */
export class RemoteImageLoader {
  readonly #fetch: RemoteImageFetch | undefined;
  readonly #objectUrls: ObjectUrlPlatform | undefined;
  readonly #maxCacheEntries: number;
  readonly #maxCacheBytes: number;
  readonly #maxImageBytes: number;
  readonly #maxConcurrentRequests: number;
  readonly #maxInFlightRequests: number;
  readonly #requestTimeoutMs: number;
  readonly #cache = new Map<string, CachedImage>();
  readonly #inFlight = new Map<string, InFlightImage>();
  readonly #entries = new Set<InFlightImage>();
  readonly #queue: InFlightImage[] = [];
  #cacheBytes = 0;
  #activeRequests = 0;
  #destroyed = false;

  constructor(options: RemoteImageLoaderOptions = {}) {
    this.#maxImageBytes = boundedInteger(
      options.maxImageBytes ?? MAX_REMOTE_IMAGE_BYTES,
      1,
      MAX_REMOTE_IMAGE_BYTES,
      "maxImageBytes",
    );
    this.#maxCacheEntries = boundedInteger(
      options.maxCacheEntries ?? DEFAULT_CACHE_ENTRIES,
      1,
      512,
      "maxCacheEntries",
    );
    this.#maxCacheBytes = boundedInteger(
      options.maxCacheBytes ?? DEFAULT_CACHE_BYTES,
      this.#maxImageBytes,
      512 * 1024 * 1024,
      "maxCacheBytes",
    );
    this.#maxConcurrentRequests = boundedInteger(
      options.maxConcurrentRequests ?? MAX_CONCURRENT_REQUESTS,
      1,
      MAX_CONCURRENT_REQUESTS,
      "maxConcurrentRequests",
    );
    this.#maxInFlightRequests = boundedInteger(
      options.maxInFlightRequests ?? MAX_IN_FLIGHT_REQUESTS,
      this.#maxConcurrentRequests,
      MAX_IN_FLIGHT_REQUESTS,
      "maxInFlightRequests",
    );
    this.#requestTimeoutMs = boundedInteger(
      options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      100,
      MAX_REQUEST_TIMEOUT_MS,
      "requestTimeoutMs",
    );

    this.#fetch = Object.hasOwn(options, "fetchImpl")
      ? options.fetchImpl ?? undefined
      : defaultFetch();
    this.#objectUrls = Object.hasOwn(options, "objectUrls")
      ? options.objectUrls ?? undefined
      : defaultObjectUrlPlatform();
  }

  load(url: string, signal?: AbortSignal): Promise<string> {
    if (this.#destroyed) {
      return Promise.reject(
        new RemoteImageLoadError("destroyed", "The remote image loader has been destroyed"),
      );
    }
    if (!this.#fetch || !this.#objectUrls || typeof AbortController !== "function") {
      return Promise.reject(
        new RemoteImageLoadError(
          "unsupported",
          "This browser cannot safely load remote images",
        ),
      );
    }
    if (signal?.aborted) return Promise.reject(abortError());

    let key: string;
    try {
      key = normalizeHttpsUrl(url);
    } catch (error) {
      return Promise.reject(error);
    }

    const cached = this.#cache.get(key);
    if (cached) {
      this.#cache.delete(key);
      this.#cache.set(key, cached);
      return Promise.resolve(cached.objectUrl);
    }

    let entry = this.#inFlight.get(key);
    if (!entry) {
      if (this.#entries.size >= this.#maxInFlightRequests) {
        return Promise.reject(
          new RemoteImageLoadError(
            "overloaded",
            "Too many remote images are already waiting to load",
          ),
        );
      }
      entry = this.#createEntry(key);
      this.#inFlight.set(key, entry);
      this.#entries.add(entry);
      this.#queue.push(entry);
    }

    const subscription = this.#subscribe(entry, signal);
    this.#drainQueue();
    return subscription;
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;

    for (const entry of this.#entries) {
      clearTimeout(entry.timeout);
      entry.controller.abort();
      entry.state = "done";
      if (!entry.settled) {
        entry.settled = true;
        entry.reject(abortError());
      }
    }
    this.#inFlight.clear();
    this.#entries.clear();
    this.#queue.length = 0;
    this.#activeRequests = 0;
    for (const cached of this.#cache.values()) this.#revoke(cached.objectUrl);
    this.#cache.clear();
    this.#cacheBytes = 0;
  }

  #createEntry(key: string): InFlightImage {
    let resolve!: (objectUrl: string) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<string>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    let entry!: InFlightImage;
    entry = {
      key,
      controller: new AbortController(),
      promise,
      resolve,
      reject,
      consumers: 0,
      settled: false,
      state: "queued",
      timeout: setTimeout(() => {
        entry.controller.abort();
        this.#finishEntry(
          entry,
          undefined,
          new RemoteImageLoadError("timeout", "The remote image request timed out"),
        );
      }, this.#requestTimeoutMs),
    };
    return entry;
  }

  #drainQueue(): void {
    if (this.#destroyed) return;
    while (
      this.#activeRequests < this.#maxConcurrentRequests &&
      this.#queue.length > 0
    ) {
      const entry = this.#queue.shift();
      if (!entry || entry.state !== "queued") continue;
      if (entry.consumers === 0 || entry.controller.signal.aborted) {
        this.#finishEntry(entry, undefined, abortError());
        continue;
      }
      entry.state = "active";
      this.#activeRequests += 1;
      void this.#fetchAndCache(entry.key, entry.controller.signal).then(
        (objectUrl) => this.#finishEntry(entry, objectUrl),
        (error: unknown) => this.#finishEntry(entry, undefined, error),
      );
    }
  }

  #finishEntry(entry: InFlightImage, objectUrl?: string, error?: unknown): void {
    if (entry.state === "done") return;
    clearTimeout(entry.timeout);
    if (entry.state === "active") {
      this.#activeRequests = Math.max(0, this.#activeRequests - 1);
    }
    entry.state = "done";
    this.#entries.delete(entry);
    if (this.#inFlight.get(entry.key) === entry) this.#inFlight.delete(entry.key);
    if (!entry.settled) {
      entry.settled = true;
      if (error !== undefined) entry.reject(error);
      else if (objectUrl !== undefined) entry.resolve(objectUrl);
      else entry.reject(new RemoteImageLoadError("response", "The image request had no result"));
    }
    this.#drainQueue();
  }

  async #fetchAndCache(key: string, signal: AbortSignal): Promise<string> {
    const objectUrls = this.#objectUrls;
    if (!objectUrls) {
      throw new RemoteImageLoadError("unsupported", "Object URLs are unavailable");
    }
    const loaded = await this.#fetchImage(key, signal);
    if (signal.aborted || this.#destroyed) throw abortError();

    let objectUrl: string;
    try {
      objectUrl = objectUrls.create(loaded.blob);
    } catch (error) {
      throw new RemoteImageLoadError(
        "unsupported",
        "The browser could not create a local image URL",
        { cause: error },
      );
    }
    if (!objectUrl) {
      throw new RemoteImageLoadError(
        "unsupported",
        "The browser returned an invalid local image URL",
      );
    }
    if (signal.aborted || this.#destroyed) {
      this.#revoke(objectUrl);
      throw abortError();
    }

    this.#cacheImage(key, { objectUrl, size: loaded.size });
    return objectUrl;
  }

  async #fetchImage(url: string, signal: AbortSignal): Promise<LoadedImage> {
    const fetchImpl = this.#fetch;
    if (!fetchImpl) {
      throw new RemoteImageLoadError("unsupported", "Fetch is unavailable");
    }

    let response: Response;
    try {
      response = await withAbort(
        fetchImpl(url, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          redirect: "error",
          signal,
        }),
        signal,
      );
    } catch (error) {
      if (signal.aborted || isAbortError(error)) throw abortError();
      throw new RemoteImageLoadError("network", "The remote image request failed", {
        cause: error,
      });
    }
    if (signal.aborted) {
      await cancelResponseBody(response);
      throw abortError();
    }
    if (!response.ok) {
      await cancelResponseBody(response);
      throw new RemoteImageLoadError(
        "response",
        `The image host returned HTTP ${response.status}`,
      );
    }

    // Redirects are refused above, but validate the URL reported by custom/polyfilled fetch
    // implementations too so an HTTPS input cannot terminate on an unsafe location.
    try {
      normalizeHttpsUrl(response.url);
    } catch (error) {
      await cancelResponseBody(response);
      throw error;
    }

    const mime = normalizeImageMime(response.headers.get("content-type"));
    if (!mime) {
      await cancelResponseBody(response);
      throw new RemoteImageLoadError(
        "mime",
        "The response is not a supported image type",
      );
    }

    let declaredLength: number | undefined;
    try {
      declaredLength = parseContentLength(response.headers.get("content-length"));
    } catch (error) {
      await cancelResponseBody(response);
      throw error;
    }
    if (declaredLength !== undefined && declaredLength > this.#maxImageBytes) {
      await cancelResponseBody(response);
      throw tooLargeError(this.#maxImageBytes);
    }

    return readBoundedImage(response, mime, this.#maxImageBytes, signal);
  }

  #subscribe(entry: InFlightImage, signal?: AbortSignal): Promise<string> {
    entry.consumers += 1;
    return new Promise<string>((resolve, reject) => {
      let finished = false;

      const release = (aborted: boolean): void => {
        entry.consumers = Math.max(0, entry.consumers - 1);
        if (aborted && entry.consumers === 0 && !entry.settled) {
          entry.controller.abort();
          this.#finishEntry(entry, undefined, abortError());
        }
      };
      const onAbort = (): void => {
        if (finished) return;
        finished = true;
        signal?.removeEventListener("abort", onAbort);
        release(true);
        reject(abortError());
      };

      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }

      entry.promise.then(
        (objectUrl) => {
          if (finished) return;
          finished = true;
          signal?.removeEventListener("abort", onAbort);
          release(false);
          resolve(objectUrl);
        },
        (error: unknown) => {
          if (finished) return;
          finished = true;
          signal?.removeEventListener("abort", onAbort);
          release(false);
          reject(error);
        },
      );
    });
  }

  #cacheImage(key: string, image: CachedImage): void {
    const previous = this.#cache.get(key);
    if (previous) {
      this.#cache.delete(key);
      this.#cacheBytes -= previous.size;
      this.#revoke(previous.objectUrl);
    }
    this.#cache.set(key, image);
    this.#cacheBytes += image.size;

    while (
      this.#cache.size > this.#maxCacheEntries ||
      this.#cacheBytes > this.#maxCacheBytes
    ) {
      const oldestKey = this.#cache.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      const oldest = this.#cache.get(oldestKey);
      this.#cache.delete(oldestKey);
      if (!oldest) continue;
      this.#cacheBytes -= oldest.size;
      this.#revoke(oldest.objectUrl);
    }
  }

  #revoke(objectUrl: string): void {
    try {
      this.#objectUrls?.revoke(objectUrl);
    } catch {
      // Revocation is best-effort during eviction/teardown and must never break the host page.
    }
  }
}

async function readBoundedImage(
  response: Response,
  mime: string,
  maxBytes: number,
  signal: AbortSignal,
): Promise<LoadedImage> {
  const reader = response.body?.getReader();
  if (!reader) {
    if (typeof response.blob !== "function") {
      throw new RemoteImageLoadError("response", "The image response has no readable body");
    }
    const blob = await withAbort(response.blob(), signal);
    if (signal.aborted) throw abortError();
    if (blob.size > maxBytes) throw tooLargeError(maxBytes);
    return { blob: blob.type === mime ? blob : new Blob([blob], { type: mime }), size: blob.size };
  }

  const chunks: BlobPart[] = [];
  let size = 0;
  let completed = false;
  try {
    while (true) {
      if (signal.aborted) throw abortError();
      const result = await withAbort(reader.read(), signal);
      if (result.done) {
        completed = true;
        break;
      }
      const chunk = result.value;
      size += chunk.byteLength;
      if (size > maxBytes) throw tooLargeError(maxBytes);
      const copy = new Uint8Array(chunk.byteLength);
      copy.set(chunk);
      chunks.push(copy);
    }
  } finally {
    if (!completed) {
      try {
        await reader.cancel();
      } catch {
        // The fetch abort may already have errored/cancelled the stream.
      }
    }
    reader.releaseLock();
  }
  if (signal.aborted) throw abortError();
  return { blob: new Blob(chunks, { type: mime }), size };
}

function normalizeHttpsUrl(value: string): string {
  if (typeof value !== "string" || !value || value.length > MAX_REMOTE_URL_LENGTH) {
    throw new RemoteImageLoadError("invalid-url", "Use a valid HTTPS image URL");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new RemoteImageLoadError("invalid-url", "Use a valid HTTPS image URL", {
      cause: error,
    });
  }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
    throw new RemoteImageLoadError(
      "invalid-url",
      "Remote images must use HTTPS without embedded credentials",
    );
  }
  if (isPrivateOrReservedHostname(parsed.hostname)) {
    throw new RemoteImageLoadError(
      "invalid-url",
      "Remote images cannot use local, private, or reserved network addresses",
    );
  }
  parsed.hash = "";
  return parsed.href;
}

function isPrivateOrReservedHostname(hostname: string): boolean {
  const normalized = hostname
    .toLocaleLowerCase()
    .replace(/^\[|\]$/gu, "")
    .replace(/\.+$/gu, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (isIpv4Address(normalized)) return isPrivateOrReservedIpv4(normalized);
  if (normalized.includes(":")) return isPrivateOrReservedIpv6(normalized);
  return false;
}

function isIpv4Address(hostname: string): boolean {
  const parts = hostname.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/u.test(part));
}

function isPrivateOrReservedIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => octet < 0 || octet > 255)) return true;
  const [first = 0, second = 0, third = 0] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function isPrivateOrReservedIpv6(hostname: string): boolean {
  const [firstRaw = "", secondRaw = ""] = hostname.split(":", 2);
  const firstHextet = Number.parseInt(firstRaw, 16);
  const secondHextet = secondRaw ? Number.parseInt(secondRaw, 16) : 0;
  // Globally routable unicast IPv6 currently occupies 2000::/3. Everything outside that range is
  // local, multicast, mapped, unspecified, or otherwise special-purpose and should not be fetched.
  if (!Number.isFinite(firstHextet) || firstHextet < 0x2000 || firstHextet > 0x3fff) return true;
  if (!Number.isFinite(secondHextet)) return true;
  return (
    (firstHextet === 0x2001 && (secondHextet <= 0x01ff || secondHextet === 0x0db8)) ||
    firstHextet === 0x2002 ||
    (firstHextet === 0x3fff && secondHextet <= 0x0fff)
  );
}

function normalizeImageMime(value: string | null): string | undefined {
  const mime = value?.split(";", 1)[0]?.trim().toLocaleLowerCase();
  return mime && ALLOWED_IMAGE_MIME_TYPES.has(mime) ? mime : undefined;
}

function parseContentLength(value: string | null): number | undefined {
  if (value === null) return undefined;
  const normalized = value.trim();
  if (!/^\d+$/u.test(normalized)) {
    throw new RemoteImageLoadError("response", "The image host returned an invalid size header");
  }
  const length = Number(normalized);
  if (!Number.isSafeInteger(length)) {
    throw new RemoteImageLoadError("response", "The image host returned an invalid size header");
  }
  return length;
}

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The browser may have already closed the body after rejecting its declared size.
  }
}

function tooLargeError(maxBytes: number): RemoteImageLoadError {
  return new RemoteImageLoadError(
    "too-large",
    `Remote images cannot exceed ${Math.floor(maxBytes / (1024 * 1024)) || maxBytes} ${
      maxBytes >= 1024 * 1024 ? "MiB" : "bytes"
    }`,
  );
}

function defaultFetch(): RemoteImageFetch | undefined {
  return typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : undefined;
}

function defaultObjectUrlPlatform(): ObjectUrlPlatform | undefined {
  const url = globalThis.URL;
  if (
    typeof url !== "function" ||
    typeof url.createObjectURL !== "function" ||
    typeof url.revokeObjectURL !== "function"
  ) {
    return undefined;
  }
  return {
    create: (blob) => url.createObjectURL(blob),
    revoke: (objectUrl) => url.revokeObjectURL(objectUrl),
  };
}

function boundedInteger(value: number, minimum: number, maximum: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = (): void => {
      if (settled) return;
      settled = true;
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function abortError(): Error {
  if (typeof DOMException === "function") {
    return new DOMException("The remote image request was cancelled", "AbortError");
  }
  const error = new Error("The remote image request was cancelled");
  error.name = "AbortError";
  return error;
}
