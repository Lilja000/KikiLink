export const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024;
/** Bounds a single decoded axis before an untrusted blob URL reaches an <img>. */
export const MAX_REMOTE_IMAGE_DIMENSION = 4_096;
/** Roughly 32 MiB at four decoded bytes per pixel, before browser-internal overhead. */
export const MAX_REMOTE_IMAGE_PIXELS = 8 * 1024 * 1024;
export const MAX_REMOTE_ANIMATION_FRAMES = 240;
export const MAX_REMOTE_ANIMATION_PIXELS = 64 * 1024 * 1024;
// With the view retaining at most six rich previews, this caps their aggregate declared
// compositing rate near 192 MP/s. Static image quality is unaffected.
export const MAX_REMOTE_ANIMATION_PIXELS_PER_SECOND = 32 * 1024 * 1024;

const DEFAULT_CACHE_ENTRIES = 24;
const DEFAULT_CACHE_BYTES = 40 * 1024 * 1024;
const MAX_CONCURRENT_REQUESTS = 4;
const MAX_CONCURRENT_DECODES = 4;
const MAX_IN_FLIGHT_REQUESTS = 32;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const MAX_REQUEST_TIMEOUT_MS = 30_000;
const MAX_REMOTE_URL_LENGTH = 4_096;

// AVIF stays fail-closed here: ISO-BMFF `ispe` properties alone do not prove the dimensions of the
// primary AV1 bitstream. Supporting it safely requires a bounded AV1 sequence-header validator.
const ALLOWED_IMAGE_MIME_TYPES = new Set([
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
  /** May lower, but never raise, the production decoded width/height limit. */
  maxImageDimension?: number;
  /** May lower, but never raise, the production decoded pixel-count limit. */
  maxImagePixels?: number;
  /** May lower, but never raise, the production animation-frame limit. */
  maxAnimationFrames?: number;
  /** May lower, but never raise, the aggregate decoded animation-pixel budget. */
  maxAnimationPixels?: number;
  /** May lower, but never raise, the composited animation-pixel-rate budget. */
  maxAnimationPixelsPerSecond?: number;
  /** May lower, but never raise, the production concurrent network-request limit. */
  maxConcurrentRequests?: number;
  /** May lower, but never raise, the concurrent leased browser-decode limit. */
  maxConcurrentDecodes?: number;
  /** May lower, but never raise, the production active-plus-queued request limit. */
  maxInFlightRequests?: number;
  /** Bounds total time spent queued or fetching. May lower the production timeout. */
  requestTimeoutMs?: number;
}

export type RemoteImageLoadErrorCode =
  | "dimensions"
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
  leases: number;
  resident: boolean;
  revoked: boolean;
}

interface InFlightImage {
  key: string;
  controller: AbortController;
  promise: Promise<CachedImage>;
  resolve: (image: CachedImage) => void;
  reject: (error: unknown) => void;
  consumers: number;
  image?: CachedImage;
  settled: boolean;
  state: "queued" | "active" | "done";
  requestSlotHeld: boolean;
  networkSettled?: Promise<void>;
  timeout: ReturnType<typeof setTimeout>;
}

interface LoadedImage {
  blob: Blob;
  bytes: Uint8Array;
  mime: string;
  size: number;
}

interface DecodeWaiter {
  resolve: (release: () => void) => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
  timeout: ReturnType<typeof setTimeout>;
  settled: boolean;
}

export interface RemoteImageLease {
  readonly url: string;
  /** Releases the URL hold and browser-decode slot. Call on image load/error; idempotent. */
  release(): void;
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
  readonly #maxImageDimension: number;
  readonly #maxImagePixels: number;
  readonly #maxAnimationFrames: number;
  readonly #maxAnimationPixels: number;
  readonly #maxAnimationPixelsPerSecond: number;
  readonly #maxConcurrentRequests: number;
  readonly #maxConcurrentDecodes: number;
  readonly #maxInFlightRequests: number;
  readonly #requestTimeoutMs: number;
  readonly #cache = new Map<string, CachedImage>();
  readonly #images = new Set<CachedImage>();
  readonly #inFlight = new Map<string, InFlightImage>();
  readonly #entries = new Set<InFlightImage>();
  readonly #queue: InFlightImage[] = [];
  readonly #decodeQueue: DecodeWaiter[] = [];
  readonly #rawDeliveryTimers = new Set<ReturnType<typeof setTimeout>>();
  #cacheBytes = 0;
  #activeRequests = 0;
  #activeDecodes = 0;
  #activeSubscriptions = 0;
  #destroyed = false;

  constructor(options: RemoteImageLoaderOptions = {}) {
    this.#maxImageBytes = boundedInteger(
      options.maxImageBytes ?? MAX_REMOTE_IMAGE_BYTES,
      1,
      MAX_REMOTE_IMAGE_BYTES,
      "maxImageBytes",
    );
    this.#maxImageDimension = boundedInteger(
      options.maxImageDimension ?? MAX_REMOTE_IMAGE_DIMENSION,
      1,
      MAX_REMOTE_IMAGE_DIMENSION,
      "maxImageDimension",
    );
    this.#maxImagePixels = boundedInteger(
      options.maxImagePixels ?? MAX_REMOTE_IMAGE_PIXELS,
      1,
      MAX_REMOTE_IMAGE_PIXELS,
      "maxImagePixels",
    );
    this.#maxAnimationFrames = boundedInteger(
      options.maxAnimationFrames ?? MAX_REMOTE_ANIMATION_FRAMES,
      1,
      MAX_REMOTE_ANIMATION_FRAMES,
      "maxAnimationFrames",
    );
    this.#maxAnimationPixels = boundedInteger(
      options.maxAnimationPixels ?? MAX_REMOTE_ANIMATION_PIXELS,
      1,
      MAX_REMOTE_ANIMATION_PIXELS,
      "maxAnimationPixels",
    );
    this.#maxAnimationPixelsPerSecond = boundedInteger(
      options.maxAnimationPixelsPerSecond ?? MAX_REMOTE_ANIMATION_PIXELS_PER_SECOND,
      1,
      MAX_REMOTE_ANIMATION_PIXELS_PER_SECOND,
      "maxAnimationPixelsPerSecond",
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
    this.#maxConcurrentDecodes = boundedInteger(
      options.maxConcurrentDecodes ?? MAX_CONCURRENT_DECODES,
      1,
      MAX_CONCURRENT_DECODES,
      "maxConcurrentDecodes",
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
    return this.#load(url, signal, false) as Promise<string>;
  }

  /** Keeps the returned object URL valid until release() or loader teardown. */
  loadLease(url: string, signal?: AbortSignal): Promise<RemoteImageLease> {
    return this.#load(url, signal, true) as Promise<RemoteImageLease>;
  }

  #load(
    url: string,
    signal: AbortSignal | undefined,
    lease: boolean,
  ): Promise<string | RemoteImageLease> {
    if (this.#destroyed) {
      return Promise.reject(
        destroyedError(),
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
    if (!lease && this.#rawDeliveryTimers.size >= this.#maxInFlightRequests) {
      return Promise.reject(
        new RemoteImageLoadError(
          "overloaded",
          "Too many raw remote-image URLs are waiting to be delivered",
        ),
      );
    }

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
      return lease
        ? this.#createCachedLease(cached, signal)
        : this.#deliverCachedUrl(cached);
    }
    if (this.#activeSubscriptions >= this.#maxInFlightRequests * 2) {
      return Promise.reject(
        new RemoteImageLoadError(
          "overloaded",
          "Too many remote-image consumers are already waiting",
        ),
      );
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

    if (entry.consumers >= this.#maxInFlightRequests) {
      return Promise.reject(
        new RemoteImageLoadError(
          "overloaded",
          "Too many consumers are already waiting for this remote image",
        ),
      );
    }
    const subscription = this.#subscribe(entry, signal, lease);
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
      entry.requestSlotHeld = false;
      if (!entry.settled) {
        entry.settled = true;
        entry.reject(abortError());
      }
    }
    this.#inFlight.clear();
    this.#entries.clear();
    this.#queue.length = 0;
    this.#activeRequests = 0;
    this.#activeSubscriptions = 0;
    for (const waiter of this.#decodeQueue) {
      if (waiter.settled) continue;
      waiter.settled = true;
      clearTimeout(waiter.timeout);
      if (waiter.signal && waiter.onAbort) {
        waiter.signal.removeEventListener("abort", waiter.onAbort);
      }
      waiter.reject(destroyedError());
    }
    this.#decodeQueue.length = 0;
    this.#activeDecodes = 0;
    for (const timer of this.#rawDeliveryTimers) clearTimeout(timer);
    this.#rawDeliveryTimers.clear();
    for (const image of [...this.#images]) this.#revokeImage(image);
    this.#cache.clear();
    this.#cacheBytes = 0;
  }

  #createEntry(key: string): InFlightImage {
    let resolve!: (image: CachedImage) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<CachedImage>((resolvePromise, rejectPromise) => {
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
      requestSlotHeld: false,
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
      entry.requestSlotHeld = true;
      this.#activeRequests += 1;
      void this.#fetchAndCache(entry).then(
        (image) => {
          this.#finishEntry(entry, image);
          this.#releaseRequestSlotAfterNetwork(entry);
        },
        (error: unknown) => {
          this.#finishEntry(entry, undefined, error);
          this.#releaseRequestSlotAfterNetwork(entry);
        },
      );
    }
  }

  #finishEntry(entry: InFlightImage, image?: CachedImage, error?: unknown): void {
    if (entry.state === "done") return;
    clearTimeout(entry.timeout);
    entry.state = "done";
    this.#entries.delete(entry);
    if (this.#inFlight.get(entry.key) === entry) this.#inFlight.delete(entry.key);
    if (!entry.settled) {
      entry.settled = true;
      if (error !== undefined) entry.reject(error);
      else if (image !== undefined) entry.resolve(image);
      else entry.reject(new RemoteImageLoadError("response", "The image request had no result"));
    }
    this.#drainQueue();
  }

  #releaseRequestSlot(entry: InFlightImage): void {
    if (!entry.requestSlotHeld) return;
    entry.requestSlotHeld = false;
    this.#activeRequests = Math.max(0, this.#activeRequests - 1);
    this.#drainQueue();
  }

  #releaseRequestSlotAfterNetwork(entry: InFlightImage): void {
    const networkSettled = entry.networkSettled;
    if (!networkSettled) {
      this.#releaseRequestSlot(entry);
      return;
    }
    void networkSettled.then(() => this.#releaseRequestSlot(entry));
  }

  async #fetchAndCache(entry: InFlightImage): Promise<CachedImage> {
    const objectUrls = this.#objectUrls;
    if (!objectUrls) {
      throw new RemoteImageLoadError("unsupported", "Object URLs are unavailable");
    }
    const { signal } = entry.controller;
    const loaded = await this.#fetchImage(entry, signal);
    if (signal.aborted || this.#destroyed) throw abortError();

    // Object URLs make the browser's image decoder reachable. Validate all container-declared
    // canvases/frames first, while this request still occupies a bounded concurrency slot. The
    // eventual <img> decode happens outside this class, but its decoded surface is now capped.
    validateImagePayload(
      loaded.bytes,
      loaded.mime,
      this.#maxImageDimension,
      this.#maxImagePixels,
      this.#maxAnimationFrames,
      this.#maxAnimationPixels,
      this.#maxAnimationPixelsPerSecond,
    );
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
      this.#revokeObjectUrl(objectUrl);
      throw abortError();
    }

    const image: CachedImage = {
      objectUrl,
      size: loaded.size,
      // Every pending delivery pins the URL until it reaches its subscriber. Lease consumers keep
      // that hold through browser decode; raw load() consumers receive a one-task delivery grace.
      leases: entry.consumers,
      resident: false,
      revoked: false,
    };
    entry.image = image;
    this.#images.add(image);
    this.#cacheImage(entry.key, image);
    return image;
  }

  async #fetchImage(entry: InFlightImage, signal: AbortSignal): Promise<LoadedImage> {
    const fetchImpl = this.#fetch;
    if (!fetchImpl) {
      throw new RemoteImageLoadError("unsupported", "Fetch is unavailable");
    }

    let response: Response;
    try {
      const request = fetchImpl(entry.key, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
        signal,
      });
      entry.networkSettled = request.then(
        async (lateResponse) => {
          if (signal.aborted) await cancelResponseBody(lateResponse);
        },
        () => undefined,
      );
      response = await withAbort(
        request,
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

  #subscribe(
    entry: InFlightImage,
    signal: AbortSignal | undefined,
    lease: boolean,
  ): Promise<string | RemoteImageLease> {
    entry.consumers += 1;
    this.#activeSubscriptions += 1;
    // A consumer can subscribe in the microtask-sized window between object-URL creation and
    // in-flight settlement, after the initial delivery-reservation count was copied to the image.
    if (entry.image && !entry.image.revoked) entry.image.leases += 1;
    return new Promise<string | RemoteImageLease>((resolve, reject) => {
      let finished = false;
      let leaseReserved = lease;
      let imageReservation = true;

      const releaseImageReservation = (): void => {
        if (!imageReservation) return;
        imageReservation = false;
        if (entry.image) this.#releaseImageLease(entry.image);
      };

      const releaseConsumer = (aborted: boolean): void => {
        entry.consumers = Math.max(0, entry.consumers - 1);
        this.#activeSubscriptions = Math.max(0, this.#activeSubscriptions - 1);
        if (aborted && entry.consumers === 0 && !entry.settled) {
          entry.controller.abort();
          this.#finishEntry(entry, undefined, abortError());
        }
      };
      const onAbort = (): void => {
        if (finished) return;
        finished = true;
        signal?.removeEventListener("abort", onAbort);
        leaseReserved = false;
        releaseImageReservation();
        releaseConsumer(true);
        reject(abortError());
      };

      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }

      entry.promise.then(
        (image) => {
          if (finished) return;
          if (!leaseReserved) {
            finished = true;
            signal?.removeEventListener("abort", onAbort);
            releaseConsumer(false);
            if (this.#destroyed || image.revoked) {
              releaseImageReservation();
              reject(destroyedError());
            } else {
              resolve(image.objectUrl);
              this.#releaseRawDeliveryAfterCurrentTask(releaseImageReservation);
            }
            return;
          }

          void this.#acquireDecodePermit(signal).then(
            (releaseDecode) => {
              if (finished) {
                releaseDecode();
                return;
              }
              finished = true;
              signal?.removeEventListener("abort", onAbort);
              if (this.#destroyed || image.revoked) {
                releaseDecode();
                leaseReserved = false;
                releaseImageReservation();
                releaseConsumer(false);
                reject(destroyedError());
                return;
              }
              leaseReserved = false;
              imageReservation = false;
              releaseConsumer(false);
              resolve(this.#createLease(image, true, releaseDecode));
            },
            (error: unknown) => {
              if (finished) return;
              finished = true;
              signal?.removeEventListener("abort", onAbort);
              leaseReserved = false;
              releaseImageReservation();
              releaseConsumer(false);
              reject(error);
            },
          );
        },
        (error: unknown) => {
          if (finished) return;
          finished = true;
          signal?.removeEventListener("abort", onAbort);
          leaseReserved = false;
          releaseImageReservation();
          releaseConsumer(false);
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
      this.#retireImage(previous);
    }
    image.resident = true;
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
      this.#retireImage(oldest);
    }
  }

  #deliverCachedUrl(image: CachedImage): Promise<string> {
    if (this.#rawDeliveryTimers.size >= this.#maxInFlightRequests) {
      return Promise.reject(
        new RemoteImageLoadError(
          "overloaded",
          "Too many cached remote images are waiting to be delivered",
        ),
      );
    }
    image.leases += 1;
    return new Promise<string>((resolve) => {
      resolve(image.objectUrl);
      this.#releaseRawDeliveryAfterCurrentTask(() => this.#releaseImageLease(image));
    });
  }

  #releaseRawDeliveryAfterCurrentTask(release: () => void): void {
    const timer = setTimeout(() => {
      this.#rawDeliveryTimers.delete(timer);
      release();
    }, 0);
    this.#rawDeliveryTimers.add(timer);
  }

  async #createCachedLease(
    image: CachedImage,
    signal: AbortSignal | undefined,
  ): Promise<RemoteImageLease> {
    image.leases += 1;
    try {
      const releaseDecode = await this.#acquireDecodePermit(signal);
      if (signal?.aborted) {
        releaseDecode();
        throw abortError();
      }
      if (this.#destroyed || image.revoked) {
        releaseDecode();
        throw destroyedError();
      }
      return this.#createLease(image, true, releaseDecode);
    } catch (error) {
      this.#releaseImageLease(image);
      throw error;
    }
  }

  #acquireDecodePermit(signal: AbortSignal | undefined): Promise<() => void> {
    if (this.#destroyed) return Promise.reject(destroyedError());
    if (signal?.aborted) return Promise.reject(abortError());
    if (this.#activeDecodes < this.#maxConcurrentDecodes) {
      this.#activeDecodes += 1;
      return Promise.resolve(this.#createDecodeRelease());
    }
    if (this.#decodeQueue.length >= this.#maxInFlightRequests) {
      return Promise.reject(
        new RemoteImageLoadError(
          "overloaded",
          "Too many remote images are already waiting for a browser decode",
        ),
      );
    }

    return new Promise<() => void>((resolve, reject) => {
      let waiter!: DecodeWaiter;
      waiter = {
        resolve,
        reject,
        settled: false,
        timeout: setTimeout(() => {
          this.#rejectDecodeWaiter(
            waiter,
            new RemoteImageLoadError(
              "timeout",
              "The remote image waited too long for a browser decode",
            ),
          );
        }, this.#requestTimeoutMs),
      };
      if (signal) {
        const onAbort = (): void => this.#rejectDecodeWaiter(waiter, abortError());
        waiter.signal = signal;
        waiter.onAbort = onAbort;
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) {
          onAbort();
          return;
        }
      }
      this.#decodeQueue.push(waiter);
    });
  }

  #rejectDecodeWaiter(waiter: DecodeWaiter, error: unknown): void {
    if (waiter.settled) return;
    waiter.settled = true;
    clearTimeout(waiter.timeout);
    if (waiter.signal && waiter.onAbort) {
      waiter.signal.removeEventListener("abort", waiter.onAbort);
    }
    const index = this.#decodeQueue.indexOf(waiter);
    if (index >= 0) this.#decodeQueue.splice(index, 1);
    waiter.reject(error);
  }

  #drainDecodeQueue(): void {
    if (this.#destroyed) return;
    while (
      this.#activeDecodes < this.#maxConcurrentDecodes &&
      this.#decodeQueue.length > 0
    ) {
      const waiter = this.#decodeQueue.shift();
      if (!waiter || waiter.settled) continue;
      if (waiter.signal?.aborted) {
        this.#rejectDecodeWaiter(waiter, abortError());
        continue;
      }
      waiter.settled = true;
      clearTimeout(waiter.timeout);
      if (waiter.signal && waiter.onAbort) {
        waiter.signal.removeEventListener("abort", waiter.onAbort);
      }
      this.#activeDecodes += 1;
      waiter.resolve(this.#createDecodeRelease());
    }
  }

  #createDecodeRelease(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#activeDecodes = Math.max(0, this.#activeDecodes - 1);
      this.#drainDecodeQueue();
    };
  }

  #createLease(
    image: CachedImage,
    reserved: boolean,
    releaseDecode: () => void,
  ): RemoteImageLease {
    if (!reserved) image.leases += 1;
    let released = false;
    return {
      url: image.objectUrl,
      release: () => {
        if (released) return;
        released = true;
        this.#releaseImageLease(image);
        releaseDecode();
      },
    };
  }

  #releaseImageLease(image: CachedImage): void {
    image.leases = Math.max(0, image.leases - 1);
    if (!image.resident && image.leases === 0) this.#revokeImage(image);
  }

  #retireImage(image: CachedImage): void {
    image.resident = false;
    if (image.leases === 0) this.#revokeImage(image);
  }

  #revokeImage(image: CachedImage): void {
    if (image.revoked) return;
    image.revoked = true;
    this.#images.delete(image);
    this.#revokeObjectUrl(image.objectUrl);
  }

  #revokeObjectUrl(objectUrl: string): void {
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
    const bytes = new Uint8Array(await withAbort(blob.arrayBuffer(), signal));
    if (signal.aborted) throw abortError();
    if (bytes.byteLength !== blob.size || bytes.byteLength > maxBytes) {
      throw tooLargeError(maxBytes);
    }
    return {
      blob: blob.type === mime ? blob : createInspectedBlob(bytes, mime),
      bytes,
      mime,
      size: bytes.byteLength,
    };
  }

  const chunks: Uint8Array[] = [];
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
  const bytes = concatenateImageChunks(chunks, size);
  return { blob: createInspectedBlob(bytes, mime), bytes, mime, size };
}

function createInspectedBlob(bytes: Uint8Array, mime: string): Blob {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: mime });
}

function concatenateImageChunks(chunks: Uint8Array[], size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  if (offset !== size) {
    throw invalidImageError("The image response changed while it was being read");
  }
  return bytes;
}

type DimensionValidator = (width: number, height: number, surface: string) => void;

interface ImageValidators {
  dimensions: DimensionValidator;
  animationFrame(width: number, height: number, surface: string, durationMs: number): void;
  declaredAnimationFrames(
    count: number,
    surface: string,
    canvasWidth?: number,
    canvasHeight?: number,
  ): void;
}

function validateImagePayload(
  bytes: Uint8Array,
  mime: string,
  maxDimension: number,
  maxPixels: number,
  maxAnimationFrames: number,
  maxAnimationPixels: number,
  maxAnimationPixelsPerSecond: number,
): void {
  let animationFrames = 0;
  let animationPixels = 0;
  const validateDimensions: DimensionValidator = (width, height, surface) => {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
      throw invalidImageError(`The ${surface} has invalid dimensions`);
    }
    if (
      width > maxDimension ||
      height > maxDimension ||
      width > Math.floor(maxPixels / height)
    ) {
      throw new RemoteImageLoadError(
        "dimensions",
        `Remote image dimensions cannot exceed ${maxDimension}px or ${maxPixels} pixels`,
      );
    }
  };
  const validators: ImageValidators = {
    dimensions: validateDimensions,
    animationFrame: (width, height, surface, declaredDurationMs) => {
      validateDimensions(width, height, surface);
      const pixels = width * height;
      // Sub-20ms delays are interpreted differently across image formats and browsers. Reject
      // them instead of assuming a decoder clamp that could understate the actual playback rate.
      if (!Number.isFinite(declaredDurationMs) || declaredDurationMs < 20) {
        throw new RemoteImageLoadError(
          "dimensions",
          "Remote animation frame delays must be at least 20ms",
        );
      }
      if (
        animationFrames >= maxAnimationFrames ||
        pixels > maxAnimationPixels - animationPixels ||
        pixels > Math.floor(maxAnimationPixelsPerSecond * declaredDurationMs / 1_000)
      ) {
        throw new RemoteImageLoadError(
          "dimensions",
          `Remote animations exceed the safe frame, decoded-pixel, or playback-rate budget`,
        );
      }
      animationFrames += 1;
      animationPixels += pixels;
    },
    declaredAnimationFrames: (count, surface, canvasWidth, canvasHeight) => {
      if (!Number.isSafeInteger(count) || count <= 0) {
        throw invalidImageError(`The ${surface} has an invalid frame count`);
      }
      const canvasPixels =
        canvasWidth !== undefined && canvasHeight !== undefined
          ? canvasWidth * canvasHeight
          : 0;
      if (
        count > maxAnimationFrames ||
        (canvasPixels > 0 && count > Math.floor(maxAnimationPixels / canvasPixels))
      ) {
        throw new RemoteImageLoadError(
          "dimensions",
          `Remote animations cannot exceed ${maxAnimationFrames} frames`,
        );
      }
    },
  };

  switch (mime) {
    case "image/png":
      validatePng(bytes, validators);
      break;
    case "image/gif":
      validateGif(bytes, validators);
      break;
    case "image/jpeg":
      validateJpeg(bytes, validateDimensions);
      break;
    case "image/webp":
      validateWebp(bytes, validators);
      break;
    default:
      throw invalidImageError("The image type cannot be inspected safely");
  }
}

function validatePng(bytes: Uint8Array, validators: ImageValidators): void {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!matchesBytes(bytes, 0, signature)) {
    throw invalidImageError("The PNG signature is invalid");
  }

  let offset = signature.length;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let sawHeader = false;
  let sawImageData = false;
  let sawEnd = false;
  let declaredAnimationFrames: number | undefined;
  let animationFrameHeaders = 0;
  let chunks = 0;
  while (offset < bytes.byteLength) {
    if (++chunks > 4_096) throw invalidImageError("The PNG has too many chunks");
    requireRange(bytes, offset, 12, "PNG chunk");
    const length = readUint32Be(bytes, offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (!Number.isSafeInteger(chunkEnd) || chunkEnd > bytes.byteLength) {
      throw invalidImageError("A PNG chunk is truncated");
    }
    const type = readAscii(bytes, offset + 4, 4);
    if (!sawHeader && type !== "IHDR") {
      throw invalidImageError("The PNG header must be the first chunk");
    }

    if (type === "IHDR") {
      if (sawHeader || length !== 13) {
        throw invalidImageError("The PNG header is malformed");
      }
      canvasWidth = readUint32Be(bytes, dataStart);
      canvasHeight = readUint32Be(bytes, dataStart + 4);
      validators.dimensions(canvasWidth, canvasHeight, "PNG canvas");
      const bitDepth = byteAt(bytes, dataStart + 8);
      const colorType = byteAt(bytes, dataStart + 9);
      const validDepths = pngBitDepths(colorType);
      if (
        !validDepths.includes(bitDepth) ||
        byteAt(bytes, dataStart + 10) !== 0 ||
        byteAt(bytes, dataStart + 11) !== 0 ||
        byteAt(bytes, dataStart + 12) > 1
      ) {
        throw invalidImageError("The PNG header uses unsupported encoding fields");
      }
      sawHeader = true;
    } else if (type === "acTL") {
      if (!sawHeader || length !== 8 || sawImageData || declaredAnimationFrames !== undefined) {
        throw invalidImageError("The animated PNG control header is malformed");
      }
      declaredAnimationFrames = readUint32Be(bytes, dataStart);
      validators.declaredAnimationFrames(
        declaredAnimationFrames,
        "animated PNG",
        canvasWidth,
        canvasHeight,
      );
    } else if (type === "fcTL") {
      if (!sawHeader || length !== 26 || declaredAnimationFrames === undefined) {
        throw invalidImageError("The animated PNG frame header is malformed");
      }
      const width = readUint32Be(bytes, dataStart + 4);
      const height = readUint32Be(bytes, dataStart + 8);
      const x = readUint32Be(bytes, dataStart + 12);
      const y = readUint32Be(bytes, dataStart + 16);
      const delayNumerator = readUint16Be(bytes, dataStart + 20);
      const delayDenominator = readUint16Be(bytes, dataStart + 22) || 100;
      const durationMs = delayNumerator * 1_000 / delayDenominator;
      validators.dimensions(width, height, "animated PNG frame");
      if (declaredAnimationFrames > 1) {
        validators.animationFrame(
          canvasWidth,
          canvasHeight,
          "animated PNG composited frame",
          durationMs,
        );
      }
      assertFrameFits(x, y, width, height, canvasWidth, canvasHeight, "animated PNG frame");
      animationFrameHeaders += 1;
    } else if (type === "IDAT") {
      sawImageData = true;
    } else if (type === "IEND") {
      if (length !== 0 || !sawImageData || chunkEnd !== bytes.byteLength) {
        throw invalidImageError("The PNG end marker is malformed");
      }
      sawEnd = true;
    }
    offset = chunkEnd;
    if (sawEnd) break;
  }
  if (!sawHeader || !sawEnd) {
    throw invalidImageError("The PNG image is incomplete");
  }
  if (
    declaredAnimationFrames !== undefined &&
    animationFrameHeaders !== declaredAnimationFrames
  ) {
    throw invalidImageError("The animated PNG frame count does not match its control header");
  }
}

function pngBitDepths(colorType: number): readonly number[] {
  switch (colorType) {
    case 0:
      return [1, 2, 4, 8, 16];
    case 2:
      return [8, 16];
    case 3:
      return [1, 2, 4, 8];
    case 4:
    case 6:
      return [8, 16];
    default:
      return [];
  }
}

function validateGif(bytes: Uint8Array, validators: ImageValidators): void {
  const signature = readAsciiSafe(bytes, 0, 6);
  if (signature !== "GIF87a" && signature !== "GIF89a") {
    throw invalidImageError("The GIF signature is invalid");
  }
  requireRange(bytes, 0, 13, "GIF logical screen descriptor");
  const canvasWidth = readUint16Le(bytes, 6);
  const canvasHeight = readUint16Le(bytes, 8);
  validators.dimensions(canvasWidth, canvasHeight, "GIF canvas");

  const packed = byteAt(bytes, 10);
  let offset = 13;
  if ((packed & 0x80) !== 0) {
    offset += 3 * (1 << ((packed & 0x07) + 1));
    requireRange(bytes, 0, offset, "GIF global color table");
  }

  let frames = 0;
  const frameDurations: number[] = [];
  let pendingFrameDurationMs = 0;
  let sawTrailer = false;
  let blocks = 0;
  while (offset < bytes.byteLength) {
    if (++blocks > 4_096) throw invalidImageError("The GIF has too many blocks");
    const introducer = byteAt(bytes, offset);
    if (introducer === 0x3b) {
      if (offset + 1 !== bytes.byteLength) {
        throw invalidImageError("The GIF has data after its trailer");
      }
      sawTrailer = true;
      break;
    }
    if (introducer === 0x21) {
      requireRange(bytes, offset, 2, "GIF extension");
      if (byteAt(bytes, offset + 1) === 0xf9) {
        requireRange(bytes, offset, 8, "GIF graphics control extension");
        if (byteAt(bytes, offset + 2) !== 4 || byteAt(bytes, offset + 7) !== 0) {
          throw invalidImageError("The GIF graphics control extension is malformed");
        }
        pendingFrameDurationMs = readUint16Le(bytes, offset + 4) * 10;
        offset += 8;
      } else {
        offset = skipGifSubBlocks(bytes, offset + 2);
      }
      continue;
    }
    if (introducer !== 0x2c) {
      throw invalidImageError("The GIF block stream is malformed");
    }

    requireRange(bytes, offset, 10, "GIF image descriptor");
    const x = readUint16Le(bytes, offset + 1);
    const y = readUint16Le(bytes, offset + 3);
    const width = readUint16Le(bytes, offset + 5);
    const height = readUint16Le(bytes, offset + 7);
    validators.dimensions(width, height, "GIF frame");
    assertFrameFits(x, y, width, height, canvasWidth, canvasHeight, "GIF frame");
    const framePacked = byteAt(bytes, offset + 9);
    offset += 10;
    if ((framePacked & 0x80) !== 0) {
      offset += 3 * (1 << ((framePacked & 0x07) + 1));
      requireRange(bytes, 0, offset, "GIF local color table");
    }
    requireRange(bytes, offset, 1, "GIF LZW header");
    const minimumCodeSize = byteAt(bytes, offset);
    if (minimumCodeSize < 2 || minimumCodeSize > 8) {
      throw invalidImageError("The GIF LZW header is malformed");
    }
    offset = skipGifSubBlocks(bytes, offset + 1);
    frames += 1;
    validators.declaredAnimationFrames(frames, "GIF");
    frameDurations.push(pendingFrameDurationMs);
    pendingFrameDurationMs = 0;
  }
  if (!sawTrailer || frames === 0) {
    throw invalidImageError("The GIF image is incomplete");
  }
  if (frames > 1) {
    for (const durationMs of frameDurations) {
      validators.animationFrame(
        canvasWidth,
        canvasHeight,
        "GIF composited frame",
        durationMs,
      );
    }
  }
}

function skipGifSubBlocks(bytes: Uint8Array, start: number): number {
  let offset = start;
  let blocks = 0;
  while (true) {
    if (++blocks > 4_096) throw invalidImageError("The GIF extension has too many data blocks");
    requireRange(bytes, offset, 1, "GIF data block");
    const length = byteAt(bytes, offset);
    offset += 1;
    if (length === 0) return offset;
    requireRange(bytes, offset, length, "GIF data block");
    offset += length;
  }
}

function validateJpeg(bytes: Uint8Array, validate: DimensionValidator): void {
  if (!matchesBytes(bytes, 0, [0xff, 0xd8])) {
    throw invalidImageError("The JPEG signature is invalid");
  }
  let offset = 2;
  let markers = 0;
  let sawFrame = false;
  let sawScan = false;
  let inEntropyData = false;
  while (offset < bytes.byteLength) {
    if (inEntropyData) {
      while (offset < bytes.byteLength) {
        if (byteAt(bytes, offset) !== 0xff) {
          offset += 1;
          continue;
        }
        const markerStart = offset;
        while (byteAt(bytes, offset) === 0xff) offset += 1;
        requireRange(bytes, offset, 1, "JPEG entropy marker");
        const entropyMarker = byteAt(bytes, offset);
        if (entropyMarker === 0x00 || (entropyMarker >= 0xd0 && entropyMarker <= 0xd7)) {
          offset += 1;
          continue;
        }
        offset = markerStart;
        inEntropyData = false;
        break;
      }
      if (inEntropyData) break;
      continue;
    }
    if (++markers > 4_096) throw invalidImageError("The JPEG has too many marker segments");
    if (byteAt(bytes, offset) !== 0xff) {
      throw invalidImageError("The JPEG marker stream is malformed");
    }
    while (byteAt(bytes, offset) === 0xff) offset += 1;
    requireRange(bytes, offset, 1, "JPEG marker");
    const marker = byteAt(bytes, offset);
    offset += 1;
    if (marker === 0xd9) {
      if (!sawFrame || !sawScan || offset !== bytes.byteLength) {
        throw invalidImageError("The JPEG end marker is malformed");
      }
      return;
    }
    if (marker === 0x00 || marker === 0xd8) {
      throw invalidImageError("The JPEG marker stream is malformed");
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      throw invalidImageError("A standalone JPEG marker appears outside entropy data");
    }

    requireRange(bytes, offset, 2, "JPEG segment length");
    const segmentLength = readUint16Be(bytes, offset);
    if (segmentLength < 2) {
      throw invalidImageError("A JPEG segment has an invalid length");
    }
    const segmentEnd = offset + segmentLength;
    if (segmentEnd > bytes.byteLength) {
      throw invalidImageError("A JPEG segment is truncated");
    }
    if (isJpegStartOfFrame(marker)) {
      if (sawFrame || segmentLength < 8) {
        throw invalidImageError("The JPEG has a duplicate or truncated frame header");
      }
      const precision = byteAt(bytes, offset + 2);
      const height = readUint16Be(bytes, offset + 3);
      const width = readUint16Be(bytes, offset + 5);
      const components = byteAt(bytes, offset + 7);
      if (
        (precision !== 8 && precision !== 12) ||
        components < 1 ||
        components > 4 ||
        segmentLength !== 8 + components * 3
      ) {
        throw invalidImageError("The JPEG frame header is malformed");
      }
      validate(width, height, "JPEG frame");
      sawFrame = true;
    } else if (marker === 0xda) {
      const scanComponents = byteAt(bytes, offset + 2);
      if (
        !sawFrame ||
        scanComponents < 1 ||
        scanComponents > 4 ||
        segmentLength !== 6 + scanComponents * 2
      ) {
        throw invalidImageError("The JPEG scan header is malformed");
      }
      sawScan = true;
      inEntropyData = true;
    }
    offset = segmentEnd;
  }
  throw invalidImageError("The JPEG marker stream is incomplete");
}

function isJpegStartOfFrame(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

function validateWebp(bytes: Uint8Array, validators: ImageValidators): void {
  if (readAsciiSafe(bytes, 0, 4) !== "RIFF" || readAsciiSafe(bytes, 8, 4) !== "WEBP") {
    throw invalidImageError("The WebP signature is invalid");
  }
  requireRange(bytes, 0, 12, "WebP RIFF header");
  if (readUint32Le(bytes, 4) + 8 !== bytes.byteLength) {
    throw invalidImageError("The WebP RIFF size is invalid");
  }

  let canvas: { width: number; height: number } | undefined;
  let extendedFlags = 0;
  let staticImages = 0;
  let animatedFrames = 0;
  let sawAnimationControl = false;
  let offset = 12;
  let chunks = 0;
  while (offset < bytes.byteLength) {
    if (++chunks > 4_096) throw invalidImageError("The WebP has too many chunks");
    const chunk = readWebpChunk(bytes, offset, bytes.byteLength);
    if (chunk.type === "VP8X") {
      if (offset !== 12 || canvas || chunk.length !== 10) {
        throw invalidImageError("The WebP extended header is malformed");
      }
      if (
        (byteAt(bytes, chunk.dataStart) & 0xc1) !== 0 ||
        byteAt(bytes, chunk.dataStart + 1) !== 0 ||
        byteAt(bytes, chunk.dataStart + 2) !== 0 ||
        byteAt(bytes, chunk.dataStart + 3) !== 0
      ) {
        throw invalidImageError("The WebP extended header uses reserved fields");
      }
      extendedFlags = byteAt(bytes, chunk.dataStart);
      canvas = {
        width: readUint24Le(bytes, chunk.dataStart + 4) + 1,
        height: readUint24Le(bytes, chunk.dataStart + 7) + 1,
      };
      validators.dimensions(canvas.width, canvas.height, "WebP canvas");
    } else if (chunk.type === "VP8 ") {
      const dimensions = readVp8Dimensions(bytes, chunk.dataStart, chunk.dataEnd);
      validators.dimensions(dimensions.width, dimensions.height, "WebP VP8 frame");
      assertWebpStaticDimensions(canvas, dimensions);
      staticImages += 1;
    } else if (chunk.type === "VP8L") {
      const dimensions = readVp8lDimensions(bytes, chunk.dataStart, chunk.dataEnd);
      validators.dimensions(dimensions.width, dimensions.height, "WebP lossless frame");
      assertWebpStaticDimensions(canvas, dimensions);
      staticImages += 1;
    } else if (chunk.type === "ANIM") {
      if (!canvas || chunk.length !== 6 || sawAnimationControl) {
        throw invalidImageError("The animated WebP control chunk is malformed");
      }
      sawAnimationControl = true;
    } else if (chunk.type === "ANMF") {
      if (!canvas || (extendedFlags & 0x02) === 0 || chunk.length < 16) {
        throw invalidImageError("The animated WebP frame header is malformed");
      }
      const x = readUint24Le(bytes, chunk.dataStart) * 2;
      const y = readUint24Le(bytes, chunk.dataStart + 3) * 2;
      const width = readUint24Le(bytes, chunk.dataStart + 6) + 1;
      const height = readUint24Le(bytes, chunk.dataStart + 9) + 1;
      const durationMs = readUint24Le(bytes, chunk.dataStart + 12);
      validators.dimensions(width, height, "animated WebP frame");
      validators.animationFrame(
        canvas.width,
        canvas.height,
        "animated WebP composited frame",
        durationMs,
      );
      assertFrameFits(x, y, width, height, canvas.width, canvas.height, "animated WebP frame");
      const payloadDimensions = validateWebpFrameChunks(
        bytes,
        chunk.dataStart + 16,
        chunk.dataEnd,
        validators.dimensions,
      );
      if (!payloadDimensions) {
        throw invalidImageError("The animated WebP frame has no image payload");
      }
      if (payloadDimensions.width !== width || payloadDimensions.height !== height) {
        throw invalidImageError("The animated WebP payload dimensions do not match its frame");
      }
      animatedFrames += 1;
    }
    offset = chunk.next;
  }
  if (offset !== bytes.byteLength) {
    throw invalidImageError("The WebP image is incomplete");
  }
  const animationFlag = (extendedFlags & 0x02) !== 0;
  if (animatedFrames > 0) {
    if (!animationFlag || !sawAnimationControl || staticImages !== 0) {
      throw invalidImageError("The animated WebP chunk structure is inconsistent");
    }
  } else if (animationFlag || sawAnimationControl || staticImages !== 1) {
    throw invalidImageError("The WebP image payload is incomplete or ambiguous");
  }
}

function assertWebpStaticDimensions(
  canvas: { width: number; height: number } | undefined,
  payload: { width: number; height: number },
): void {
  if (canvas && (canvas.width !== payload.width || canvas.height !== payload.height)) {
    throw invalidImageError("The WebP payload dimensions do not match its canvas");
  }
}

interface WebpChunk {
  type: string;
  length: number;
  dataStart: number;
  dataEnd: number;
  next: number;
}

function readWebpChunk(bytes: Uint8Array, offset: number, limit: number): WebpChunk {
  requireRangeWithin(bytes, offset, 8, limit, "WebP chunk header");
  const type = readAscii(bytes, offset, 4);
  const length = readUint32Le(bytes, offset + 4);
  const dataStart = offset + 8;
  const dataEnd = dataStart + length;
  const next = dataEnd + (length & 1);
  if (!Number.isSafeInteger(next) || next > limit) {
    throw invalidImageError("A WebP chunk is truncated");
  }
  if ((length & 1) !== 0 && byteAt(bytes, dataEnd) !== 0) {
    throw invalidImageError("A WebP chunk has invalid padding");
  }
  return { type, length, dataStart, dataEnd, next };
}

function validateWebpFrameChunks(
  bytes: Uint8Array,
  start: number,
  end: number,
  validate: DimensionValidator,
): { width: number; height: number } | undefined {
  let offset = start;
  let dimensions: { width: number; height: number } | undefined;
  let chunks = 0;
  while (offset < end) {
    if (++chunks > 32) throw invalidImageError("A WebP frame has too many chunks");
    const chunk = readWebpChunk(bytes, offset, end);
    if (chunk.type === "VP8 ") {
      if (dimensions) throw invalidImageError("A WebP frame has multiple image payloads");
      dimensions = readVp8Dimensions(bytes, chunk.dataStart, chunk.dataEnd);
      validate(dimensions.width, dimensions.height, "animated WebP VP8 payload");
    } else if (chunk.type === "VP8L") {
      if (dimensions) throw invalidImageError("A WebP frame has multiple image payloads");
      dimensions = readVp8lDimensions(bytes, chunk.dataStart, chunk.dataEnd);
      validate(dimensions.width, dimensions.height, "animated WebP lossless payload");
    } else if (chunk.type !== "ALPH") {
      throw invalidImageError("An animated WebP frame contains an invalid chunk");
    }
    offset = chunk.next;
  }
  if (offset !== end) {
    throw invalidImageError("The animated WebP frame payload is malformed");
  }
  return dimensions;
}

function readVp8Dimensions(
  bytes: Uint8Array,
  start: number,
  end: number,
): { width: number; height: number } {
  requireRangeWithin(bytes, start, 10, end, "WebP VP8 frame header");
  if (
    (byteAt(bytes, start) & 1) !== 0 ||
    !matchesBytes(bytes, start + 3, [0x9d, 0x01, 0x2a])
  ) {
    throw invalidImageError("The WebP VP8 key-frame header is invalid");
  }
  return {
    width: readUint16Le(bytes, start + 6) & 0x3fff,
    height: readUint16Le(bytes, start + 8) & 0x3fff,
  };
}

function readVp8lDimensions(
  bytes: Uint8Array,
  start: number,
  end: number,
): { width: number; height: number } {
  requireRangeWithin(bytes, start, 5, end, "WebP lossless frame header");
  if (byteAt(bytes, start) !== 0x2f) {
    throw invalidImageError("The WebP lossless signature is invalid");
  }
  const packed = readUint32Le(bytes, start + 1);
  if ((packed >>> 29) !== 0) {
    throw invalidImageError("The WebP lossless version is unsupported");
  }
  return {
    width: (packed & 0x3fff) + 1,
    height: ((packed >>> 14) & 0x3fff) + 1,
  };
}

function assertFrameFits(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number,
  surface: string,
): void {
  if (
    x > canvasWidth ||
    y > canvasHeight ||
    width > canvasWidth - x ||
    height > canvasHeight - y
  ) {
    throw invalidImageError(`The ${surface} lies outside its canvas`);
  }
}

function matchesBytes(bytes: Uint8Array, offset: number, expected: readonly number[]): boolean {
  if (!hasRange(bytes, offset, expected.length)) return false;
  return expected.every((value, index) => byteAt(bytes, offset + index) === value);
}

function readAsciiSafe(bytes: Uint8Array, offset: number, length: number): string | undefined {
  return hasRange(bytes, offset, length) ? readAscii(bytes, offset, length) : undefined;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  requireRange(bytes, offset, length, "image header");
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(byteAt(bytes, offset + index));
  }
  return value;
}

function byteAt(bytes: Uint8Array, offset: number): number {
  return bytes[offset] ?? -1;
}

function readUint16Be(bytes: Uint8Array, offset: number): number {
  requireRange(bytes, offset, 2, "image header");
  return byteAt(bytes, offset) * 0x100 + byteAt(bytes, offset + 1);
}

function readUint16Le(bytes: Uint8Array, offset: number): number {
  requireRange(bytes, offset, 2, "image header");
  return byteAt(bytes, offset) + byteAt(bytes, offset + 1) * 0x100;
}

function readUint24Le(bytes: Uint8Array, offset: number): number {
  requireRange(bytes, offset, 3, "image header");
  return (
    byteAt(bytes, offset) +
    byteAt(bytes, offset + 1) * 0x100 +
    byteAt(bytes, offset + 2) * 0x1_0000
  );
}

function readUint32Be(bytes: Uint8Array, offset: number): number {
  requireRange(bytes, offset, 4, "image header");
  return (
    byteAt(bytes, offset) * 0x1_000000 +
    byteAt(bytes, offset + 1) * 0x1_0000 +
    byteAt(bytes, offset + 2) * 0x100 +
    byteAt(bytes, offset + 3)
  );
}

function readUint32Le(bytes: Uint8Array, offset: number): number {
  requireRange(bytes, offset, 4, "image header");
  return (
    byteAt(bytes, offset) +
    byteAt(bytes, offset + 1) * 0x100 +
    byteAt(bytes, offset + 2) * 0x1_0000 +
    byteAt(bytes, offset + 3) * 0x1_000000
  );
}

function hasRange(bytes: Uint8Array, offset: number, length: number): boolean {
  return (
    Number.isSafeInteger(offset) &&
    Number.isSafeInteger(length) &&
    offset >= 0 &&
    length >= 0 &&
    offset <= bytes.byteLength - length
  );
}

function requireRange(
  bytes: Uint8Array,
  offset: number,
  length: number,
  context: string,
): void {
  if (!hasRange(bytes, offset, length)) {
    throw invalidImageError(`The ${context} is truncated`);
  }
}

function requireRangeWithin(
  bytes: Uint8Array,
  offset: number,
  length: number,
  limit: number,
  context: string,
): void {
  if (offset > limit || length > limit - offset || !hasRange(bytes, offset, length)) {
    throw invalidImageError(`The ${context} is truncated`);
  }
}

function invalidImageError(message: string): RemoteImageLoadError {
  return new RemoteImageLoadError("response", message);
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

function destroyedError(): RemoteImageLoadError {
  return new RemoteImageLoadError(
    "destroyed",
    "The remote image loader has been destroyed",
  );
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
