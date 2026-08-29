import { describe, expect, it, vi } from "vitest";
import {
  MAX_REMOTE_ANIMATION_FRAMES,
  MAX_REMOTE_ANIMATION_PIXELS,
  MAX_REMOTE_ANIMATION_PIXELS_PER_SECOND,
  MAX_REMOTE_IMAGE_BYTES,
  MAX_REMOTE_IMAGE_DIMENSION,
  MAX_REMOTE_IMAGE_PIXELS,
  RemoteImageLoader,
} from "../src/modules/link-chat/remote-image-loader";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

interface TestResponseOptions {
  url?: string;
  status?: number;
  mime?: string;
  chunks?: Uint8Array[];
  contentLength?: string;
  stream?: boolean;
  cancel?: () => void;
}

describe("RemoteImageLoader", () => {
  it("fetches through a credentialless no-referrer CORS request and returns a local blob URL", async () => {
    const bytes = pngBytes(2, 3);
    const fetchImpl = vi.fn<FetchLike>(async () => imageResponse({ chunks: [bytes] }));
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({ fetchImpl, objectUrls });

    await expect(loader.load("https://images.example/avatar.png#profile")).resolves.toBe(
      "blob:kikilink-1",
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://images.example/avatar.png",
      expect.objectContaining({
        method: "GET",
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
        signal: expect.any(AbortSignal),
      }),
    );
    const blob = objectUrls.create.mock.calls[0]?.[0];
    if (!blob) throw new Error("Remote image loader did not create a Blob");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob).toMatchObject({ size: bytes.byteLength, type: "image/png" });
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);

    loader.destroy();
    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-1");
  });

  it("rejects insecure inputs and insecure or credential-bearing final redirect URLs", async () => {
    const fetchImpl = vi.fn<FetchLike>();
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({ fetchImpl, objectUrls });

    await expect(loader.load("http://images.example/avatar.png")).rejects.toMatchObject({
      code: "invalid-url",
    });
    await expect(loader.load("https://user:secret@images.example/avatar.png")).rejects.toMatchObject({
      code: "invalid-url",
    });
    expect(fetchImpl).not.toHaveBeenCalled();

    const cancel = vi.fn();
    fetchImpl.mockResolvedValueOnce(
      imageResponse({ url: "http://redirect.example/avatar.png", cancel }),
    );
    await expect(loader.load("https://images.example/redirect.png")).rejects.toMatchObject({
      code: "invalid-url",
    });
    expect(cancel).toHaveBeenCalledTimes(1);

    fetchImpl.mockResolvedValueOnce(
      imageResponse({ url: "https://user:secret@redirect.example/avatar.png" }),
    );
    await expect(loader.load("https://images.example/credentials.png")).rejects.toMatchObject({
      code: "invalid-url",
    });
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("rejects local, private, and reserved literal hosts before starting a request", async () => {
    const fetchImpl = vi.fn<FetchLike>();
    const loader = new RemoteImageLoader({ fetchImpl, objectUrls: objectUrlPlatform() });

    for (const url of [
      "https://localhost/avatar.png",
      "https://localhost./avatar.png",
      "https://images.localhost/avatar.png",
      "https://images.localhost./avatar.png",
      "https://127.0.0.1/avatar.png",
      "https://10.1.2.3/avatar.png",
      "https://169.254.169.254/avatar.png",
      "https://192.168.1.20/avatar.png",
      "https://[::1]/avatar.png",
      "https://[fc00::1]/avatar.png",
      "https://[fe80::1]/avatar.png",
      "https://[2001:2::1]/avatar.png",
      "https://[2001:db8::1]/avatar.png",
      "https://[3fff::1]/avatar.png",
    ]) {
      await expect(loader.load(url)).rejects.toMatchObject({ code: "invalid-url" });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when fetch refuses an HTTP redirect", async () => {
    const fetchImpl = vi.fn<FetchLike>(async (_input, init) => {
      expect(init?.redirect).toBe("error");
      throw new TypeError("Fetch refused a redirect");
    });
    const loader = new RemoteImageLoader({ fetchImpl, objectUrls: objectUrlPlatform() });

    await expect(loader.load("https://images.example/redirect.png")).rejects.toMatchObject({
      code: "network",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("accepts only allowlisted image MIME types and rejects oversized Content-Length before reading", async () => {
    const cancelMime = vi.fn();
    const cancelLength = vi.fn();
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(imageResponse({ mime: "image/svg+xml", cancel: cancelMime }))
      .mockResolvedValueOnce(
        imageResponse({ contentLength: "11", cancel: cancelLength }),
      );
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({
      fetchImpl,
      objectUrls,
      maxImageBytes: 10,
      maxCacheBytes: 20,
    });

    await expect(loader.load("https://images.example/vector.svg")).rejects.toMatchObject({
      code: "mime",
    });
    await expect(loader.load("https://images.example/declared.png")).rejects.toMatchObject({
      code: "too-large",
    });
    expect(cancelMime).toHaveBeenCalledTimes(1);
    expect(cancelLength).toHaveBeenCalledTimes(1);
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("enforces the byte limit while streaming and in the non-streaming Blob fallback", async () => {
    const cancel = vi.fn();
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        imageResponse({
          chunks: [new Uint8Array(6), new Uint8Array(5), new Uint8Array(1)],
          cancel,
        }),
      )
      .mockResolvedValueOnce(
        imageResponse({ chunks: [new Uint8Array(11)], stream: false }),
      );
    const loader = new RemoteImageLoader({
      fetchImpl,
      objectUrls: objectUrlPlatform(),
      maxImageBytes: 10,
      maxCacheBytes: 20,
    });

    await expect(loader.load("https://images.example/stream.png")).rejects.toMatchObject({
      code: "too-large",
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    await expect(loader.load("https://images.example/blob.png")).rejects.toMatchObject({
      code: "too-large",
    });
  });

  it("inspects bounded PNG, JPEG, GIF, and WebP containers before exposing them", async () => {
    const fixtures = [
      { mime: "image/png", extension: "png", bytes: pngBytes(320, 180) },
      { mime: "image/jpeg", extension: "jpg", bytes: jpegBytes(320, 180) },
      { mime: "image/gif", extension: "gif", bytes: gifBytes(320, 180) },
      { mime: "image/webp", extension: "webp", bytes: webpLosslessBytes(320, 180) },
    ] as const;
    const objectUrls = objectUrlPlatform();
    const fetchImpl = vi.fn<FetchLike>(async (input) => {
      const fixture = fixtures.find(({ extension }) => String(input).endsWith(`.${extension}`));
      if (!fixture) throw new Error("Missing image fixture");
      return imageResponse({ mime: fixture.mime, chunks: [fixture.bytes], url: String(input) });
    });
    const loader = new RemoteImageLoader({ fetchImpl, objectUrls });

    await expect(
      Promise.all(
        fixtures.map(({ extension }) => loader.load(`https://images.example/safe.${extension}`)),
      ),
    ).resolves.toEqual([
      "blob:kikilink-1",
      "blob:kikilink-2",
      "blob:kikilink-3",
      "blob:kikilink-4",
    ]);
    expect(objectUrls.create).toHaveBeenCalledTimes(4);
    loader.destroy();
  });

  it("rejects oversized decoded surfaces for every supported container before creating a URL", async () => {
    const fixtures = [
      { mime: "image/png", bytes: pngBytes(65, 1) },
      { mime: "image/jpeg", bytes: jpegBytes(65, 1) },
      { mime: "image/gif", bytes: gifBytes(65, 1) },
      { mime: "image/webp", bytes: webpLosslessBytes(65, 1) },
    ] as const;
    const objectUrls = objectUrlPlatform();
    let index = 0;
    const loader = new RemoteImageLoader({
      fetchImpl: async () => {
        const fixture = fixtures[index++];
        if (!fixture) throw new Error("Missing image fixture");
        return imageResponse({ mime: fixture.mime, chunks: [fixture.bytes] });
      },
      objectUrls,
      maxImageDimension: 64,
      maxImagePixels: 4_096,
    });

    for (let fixtureIndex = 0; fixtureIndex < fixtures.length; fixtureIndex += 1) {
      await expect(
        loader.load(`https://images.example/bomb-${fixtureIndex}`),
      ).rejects.toMatchObject({ code: "dimensions" });
    }
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("enforces pixel count independently of either axis", async () => {
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({
      fetchImpl: async () => imageResponse({ chunks: [pngBytes(11, 10)] }),
      objectUrls,
      maxImageDimension: 100,
      maxImagePixels: 100,
    });

    await expect(loader.load("https://images.example/pixel-bomb.png")).rejects.toMatchObject({
      code: "dimensions",
    });
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("rejects oversized nested animation/frame declarations hidden behind safe canvases", async () => {
    const fixtures = [
      {
        mime: "image/png",
        bytes: animatedPngBytes(64, 64, 65, 1),
      },
      {
        mime: "image/gif",
        bytes: gifBytes(64, 64, 65, 1),
      },
      {
        mime: "image/webp",
        bytes: animatedWebpBytes(64, 64, 65, 1),
      },
    ] as const;
    const objectUrls = objectUrlPlatform();
    let index = 0;
    const loader = new RemoteImageLoader({
      fetchImpl: async () => {
        const fixture = fixtures[index++];
        if (!fixture) throw new Error("Missing image fixture");
        return imageResponse({ mime: fixture.mime, chunks: [fixture.bytes] });
      },
      objectUrls,
      maxImageDimension: 64,
      maxImagePixels: 4_096,
    });

    for (let fixtureIndex = 0; fixtureIndex < fixtures.length; fixtureIndex += 1) {
      await expect(
        loader.load(`https://images.example/nested-bomb-${fixtureIndex}`),
      ).rejects.toMatchObject({ code: "dimensions" });
    }
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("charges every APNG, GIF, and WebP frame against its full composited canvas budget", async () => {
    const tinyFrames = Array.from(
      { length: 3 },
      () => ({ width: 1, height: 1, durationMs: 20 }),
    );
    const fixtures = [
      { mime: "image/png", bytes: animatedPngFrames(2, 2, tinyFrames) },
      { mime: "image/gif", bytes: gifAnimationBytes(2, 2, tinyFrames) },
      { mime: "image/webp", bytes: animatedWebpFrames(2, 2, tinyFrames) },
    ] as const;
    const objectUrls = objectUrlPlatform();
    let index = 0;
    const loader = new RemoteImageLoader({
      fetchImpl: async () => {
        const fixture = fixtures[index++];
        if (!fixture) throw new Error("Missing image fixture");
        return imageResponse({ mime: fixture.mime, chunks: [fixture.bytes] });
      },
      objectUrls,
      maxAnimationFrames: 10,
      maxAnimationPixels: 8,
    });

    for (let fixtureIndex = 0; fixtureIndex < fixtures.length; fixtureIndex += 1) {
      await expect(
        loader.load(`https://images.example/animation-bomb-${fixtureIndex}`),
      ).rejects.toMatchObject({ code: "dimensions" });
    }
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("rejects an APNG-declared frame count before walking attacker-controlled frame chunks", async () => {
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({
      fetchImpl: async () => imageResponse({
        chunks: [animatedPngFrames(1, 1, Array.from({ length: 3 }, () => ({ width: 1, height: 1 })))],
      }),
      objectUrls,
      maxAnimationFrames: 2,
    });

    await expect(loader.load("https://images.example/declared-animation-bomb.png"))
      .rejects.toMatchObject({ code: "dimensions" });
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("rejects zero-delay animation playback rates without penalizing a static GIF", async () => {
    const twoFrames = [{ width: 10, height: 10 }, { width: 10, height: 10 }];
    const fixtures = [
      { mime: "image/png", bytes: animatedPngFrames(10, 10, twoFrames) },
      { mime: "image/gif", bytes: gifAnimationBytes(10, 10, twoFrames) },
      { mime: "image/webp", bytes: animatedWebpFrames(10, 10, twoFrames) },
    ] as const;
    const objectUrls = objectUrlPlatform();
    let index = 0;
    const loader = new RemoteImageLoader({
      fetchImpl: async () => {
        const fixture = fixtures[index++];
        if (!fixture) return imageResponse({ mime: "image/gif", chunks: [gifBytes(10, 10)] });
        return imageResponse({ mime: fixture.mime, chunks: [fixture.bytes] });
      },
      objectUrls,
      maxAnimationPixelsPerSecond: 100,
    });

    for (let fixtureIndex = 0; fixtureIndex < fixtures.length; fixtureIndex += 1) {
      await expect(loader.load(`https://images.example/hot-loop-${fixtureIndex}`))
        .rejects.toMatchObject({ code: "dimensions" });
    }
    await expect(loader.load("https://images.example/static.gif")).resolves.toBe(
      "blob:kikilink-1",
    );
    loader.destroy();
  });

  it("rejects 11ms APNG and WebP frames instead of assuming a slower browser clamp", async () => {
    const frames = [
      { width: 800, height: 800, durationMs: 11 },
      { width: 800, height: 800, durationMs: 11 },
    ];
    const fixtures = [
      { mime: "image/png", bytes: animatedPngFrames(800, 800, frames) },
      { mime: "image/webp", bytes: animatedWebpFrames(800, 800, frames) },
    ] as const;
    const objectUrls = objectUrlPlatform();
    let index = 0;
    const loader = new RemoteImageLoader({
      fetchImpl: async () => {
        const fixture = fixtures[index++];
        if (!fixture) throw new Error("Missing image fixture");
        return imageResponse({ mime: fixture.mime, chunks: [fixture.bytes] });
      },
      objectUrls,
    });

    for (let fixtureIndex = 0; fixtureIndex < fixtures.length; fixtureIndex += 1) {
      await expect(loader.load(`https://images.example/fast-animation-${fixtureIndex}`))
        .rejects.toMatchObject({ code: "dimensions" });
    }
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("fails closed on MIME spoofing and truncated container metadata", async () => {
    const objectUrls = objectUrlPlatform();
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(imageResponse({ mime: "image/png", chunks: [gifBytes(1, 1)] }))
      .mockResolvedValueOnce(
        imageResponse({ mime: "image/jpeg", chunks: [new Uint8Array([0xff, 0xd8, 0xff])] }),
      )
      .mockResolvedValueOnce(
        imageResponse({ mime: "image/webp", chunks: [new Uint8Array([0x52, 0x49, 0x46, 0x46])] }),
      );
    const loader = new RemoteImageLoader({ fetchImpl, objectUrls });

    for (const name of ["spoof.png", "short.jpg", "short.webp"]) {
      await expect(loader.load(`https://images.example/${name}`)).rejects.toMatchObject({
        code: "response",
      });
    }
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("rejects AVIF fail-closed because container extents do not bound the primary AV1 bitstream", async () => {
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({
      fetchImpl: async () => imageResponse({
        mime: "image/avif",
        chunks: [avifBytes(1, 1)],
      }),
      objectUrls,
    });

    await expect(loader.load("https://images.example/decoy-extents.avif")).rejects.toMatchObject({
      code: "mime",
    });
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("rejects a JPEG with a small decoy SOF before a second frame declaration", async () => {
    const ordinary = jpegBytes(1, 1);
    const secondFrame = jpegBytes(4_096, 4_096).slice(2, 15);
    const decoy = concatenate([ordinary.slice(0, 15), secondFrame, ordinary.slice(15)]);
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({
      fetchImpl: async () => imageResponse({ mime: "image/jpeg", chunks: [decoy] }),
      objectUrls,
    });

    await expect(loader.load("https://images.example/decoy-frame.jpg")).rejects.toMatchObject({
      code: "response",
    });
    expect(objectUrls.create).not.toHaveBeenCalled();
  });

  it("deduplicates in-flight requests and serves later reads from its LRU cache", async () => {
    const pending = deferred<Response>();
    const fetchImpl = vi.fn<FetchLike>(() => pending.promise);
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({ fetchImpl, objectUrls });

    const first = loader.load("https://images.example/shared.png");
    const second = loader.load("https://images.example/shared.png#same-request");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    pending.resolve(imageResponse());

    await expect(Promise.all([first, second])).resolves.toEqual([
      "blob:kikilink-1",
      "blob:kikilink-1",
    ]);
    await expect(loader.load("https://images.example/shared.png")).resolves.toBe(
      "blob:kikilink-1",
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(objectUrls.create).toHaveBeenCalledTimes(1);
  });

  it("pins raw URL deliveries through their subscriber turn during concurrent eviction", async () => {
    vi.useFakeTimers();
    try {
      const objectUrls = objectUrlPlatform();
      const loader = new RemoteImageLoader({
        fetchImpl: async (input) => imageResponse({ url: String(input) }),
        objectUrls,
        maxCacheEntries: 1,
      });

      await expect(Promise.all([
        loader.load("https://images.example/race-first.png"),
        loader.load("https://images.example/race-second.png"),
      ])).resolves.toEqual(["blob:kikilink-1", "blob:kikilink-2"]);
      expect(objectUrls.revoke).not.toHaveBeenCalledWith("blob:kikilink-1");

      await vi.runOnlyPendingTimersAsync();
      expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-1");
      loader.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("caps deduplicated subscriptions instead of allowing an unbounded waiter fan-out", async () => {
    const pending = deferred<Response>();
    const loader = new RemoteImageLoader({
      fetchImpl: () => pending.promise,
      objectUrls: objectUrlPlatform(),
      maxConcurrentRequests: 1,
      maxInFlightRequests: 2,
    });

    const first = loader.load("https://images.example/fanout.png");
    const second = loader.load("https://images.example/fanout.png#second");
    await expect(loader.load("https://images.example/fanout.png#third"))
      .rejects.toMatchObject({ code: "overloaded" });
    pending.resolve(imageResponse());
    await expect(Promise.all([first, second])).resolves.toEqual([
      "blob:kikilink-1",
      "blob:kikilink-1",
    ]);
    loader.destroy();
  });

  it("caps synchronous cached raw deliveries until their one-task URL holds expire", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => imageResponse());
    const loader = new RemoteImageLoader({
      fetchImpl,
      objectUrls: objectUrlPlatform(),
      maxConcurrentRequests: 1,
      maxInFlightRequests: 2,
    });
    await loader.load("https://images.example/cached-fanout.png");
    await nextTask();

    const first = loader.load("https://images.example/cached-fanout.png");
    const second = loader.load("https://images.example/cached-fanout.png");
    await expect(loader.load("https://images.example/cached-fanout.png"))
      .rejects.toMatchObject({ code: "overloaded" });
    await expect(Promise.all([first, second])).resolves.toEqual([
      "blob:kikilink-1",
      "blob:kikilink-1",
    ]);
    expect(fetchImpl).toHaveBeenCalledOnce();
    loader.destroy();
  });

  it("bounds active and queued requests while still admitting deduplicated consumers", async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockImplementationOnce(() => firstResponse.promise)
      .mockImplementationOnce(() => secondResponse.promise);
    const loader = new RemoteImageLoader({
      fetchImpl,
      objectUrls: objectUrlPlatform(),
      maxConcurrentRequests: 1,
      maxInFlightRequests: 2,
    });

    const first = loader.load("https://images.example/first.png");
    const second = loader.load("https://images.example/second.png");
    const duplicateSecond = loader.load("https://images.example/second.png#duplicate");
    await expect(loader.load("https://images.example/rejected.png")).rejects.toMatchObject({
      code: "overloaded",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    firstResponse.resolve(imageResponse({ url: "https://images.example/first.png" }));
    await expect(first).resolves.toBe("blob:kikilink-1");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    secondResponse.resolve(imageResponse({ url: "https://images.example/second.png" }));
    await expect(Promise.all([second, duplicateSecond])).resolves.toEqual([
      "blob:kikilink-2",
      "blob:kikilink-2",
    ]);
    loader.destroy();
  });

  it("removes a cancelled queued request without fetching it or blocking a replacement", async () => {
    const activeResponse = deferred<Response>();
    const replacementResponse = deferred<Response>();
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockImplementationOnce(() => activeResponse.promise)
      .mockImplementationOnce(() => replacementResponse.promise);
    const loader = new RemoteImageLoader({
      fetchImpl,
      objectUrls: objectUrlPlatform(),
      maxConcurrentRequests: 1,
      maxInFlightRequests: 2,
    });
    const queuedController = new AbortController();

    const active = loader.load("https://images.example/active.png");
    const cancelled = loader.load(
      "https://images.example/cancelled.png",
      queuedController.signal,
    );
    queuedController.abort();
    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });

    const replacement = loader.load("https://images.example/replacement.png");
    activeResponse.resolve(imageResponse({ url: "https://images.example/active.png" }));
    await active;
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]?.[0]).toBe("https://images.example/replacement.png");
    replacementResponse.resolve(
      imageResponse({ url: "https://images.example/replacement.png" }),
    );
    await replacement;
    loader.destroy();
  });

  it("times out a fetch that honors AbortSignal and advances the bounded queue", async () => {
    vi.useFakeTimers();
    try {
      let firstSignal: AbortSignal | undefined;
      const secondResponse = deferred<Response>();
      const fetchImpl = vi
        .fn<FetchLike>()
        .mockImplementationOnce((_input, init) => {
          firstSignal = init?.signal ?? undefined;
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(testAbortError()), {
              once: true,
            });
          });
        })
        .mockImplementationOnce(() => secondResponse.promise);
      const loader = new RemoteImageLoader({
        fetchImpl,
        objectUrls: objectUrlPlatform(),
        maxConcurrentRequests: 1,
        maxInFlightRequests: 2,
        requestTimeoutMs: 200,
      });

      const neverSettles = loader.load("https://images.example/never.png");
      const timedOut = expect(neverSettles).rejects.toMatchObject({ code: "timeout" });
      await vi.advanceTimersByTimeAsync(100);
      const queued = loader.load("https://images.example/queued.png");
      await vi.advanceTimersByTimeAsync(100);

      await timedOut;
      expect(firstSignal?.aborted).toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      secondResponse.resolve(imageResponse({ url: "https://images.example/queued.png" }));
      await expect(queued).resolves.toBe("blob:kikilink-1");
      loader.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not start unbounded replacements while a noncooperative timed-out fetch still runs", async () => {
    vi.useFakeTimers();
    try {
      const ignoredAbortResponse = deferred<Response>();
      const replacementResponse = deferred<Response>();
      const lateCancel = vi.fn();
      const fetchImpl = vi
        .fn<FetchLike>()
        .mockImplementationOnce(() => ignoredAbortResponse.promise)
        .mockImplementationOnce(() => replacementResponse.promise);
      const loader = new RemoteImageLoader({
        fetchImpl,
        objectUrls: objectUrlPlatform(),
        maxConcurrentRequests: 1,
        maxInFlightRequests: 2,
        requestTimeoutMs: 200,
      });

      const ignoredAbort = loader.load("https://images.example/ignores-abort.png");
      const timedOut = expect(ignoredAbort).rejects.toMatchObject({ code: "timeout" });
      await vi.advanceTimersByTimeAsync(100);
      const queued = loader.load("https://images.example/after-ignored-abort.png");
      await vi.advanceTimersByTimeAsync(100);

      await timedOut;
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      ignoredAbortResponse.resolve(imageResponse({ cancel: lateCancel }));
      await vi.advanceTimersByTimeAsync(0);
      expect(lateCancel).toHaveBeenCalledOnce();
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      replacementResponse.resolve(
        imageResponse({ url: "https://images.example/after-ignored-abort.png" }),
      );
      await expect(queued).resolves.toBe("blob:kikilink-1");
      loader.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("lets one deduplicated consumer abort without cancelling the remaining consumer", async () => {
    const pending = deferred<Response>();
    let fetchSignal: AbortSignal | undefined;
    const fetchImpl = vi.fn<FetchLike>((_input, init) => {
      fetchSignal = init?.signal ?? undefined;
      return pending.promise;
    });
    const loader = new RemoteImageLoader({ fetchImpl, objectUrls: objectUrlPlatform() });
    const controller = new AbortController();

    const cancelled = loader.load("https://images.example/shared.png", controller.signal);
    const remaining = loader.load("https://images.example/shared.png");
    controller.abort();

    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchSignal?.aborted).toBe(false);
    pending.resolve(imageResponse());
    await expect(remaining).resolves.toBe("blob:kikilink-1");
  });

  it("aborts the underlying request when its final consumer cancels", async () => {
    let fetchSignal: AbortSignal | undefined;
    const fetchImpl = vi.fn<FetchLike>((_input, init) => {
      fetchSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => undefined);
    });
    const loader = new RemoteImageLoader({ fetchImpl, objectUrls: objectUrlPlatform() });
    const controller = new AbortController();
    const pending = loader.load("https://images.example/pending.png", controller.signal);

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchSignal?.aborted).toBe(true);
  });

  it("evicts the least-recently-used object URL and also respects the cache byte budget", async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) => {
      const ancillaryBytes = String(input).includes("large-d")
        ? 31
        : String(input).includes("large")
          ? 10
          : 0;
      return imageResponse({
        url: String(input),
        chunks: [pngBytes(1, 1, ancillaryBytes)],
      });
    });
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({
      fetchImpl,
      objectUrls,
      maxImageBytes: 128,
      maxCacheEntries: 2,
      maxCacheBytes: 150,
    });

    await loader.load("https://images.example/a.png");
    await loader.load("https://images.example/large-b.png");
    await loader.load("https://images.example/a.png"); // a is now most recently used
    await loader.load("https://images.example/c.png");
    await nextTask();

    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-2");
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    await loader.load("https://images.example/large-d.png");
    await nextTask();
    // The byte budget leaves only the newest 100-byte entry and revokes both older 57-byte URLs.
    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-1");
    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-3");
  });

  it("keeps an evicted object URL alive until its final lease is released", async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) =>
      imageResponse({ url: String(input) }),
    );
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({
      fetchImpl,
      objectUrls,
      maxCacheEntries: 1,
    });

    const firstLease = await loader.loadLease("https://images.example/first.png");
    const secondLease = await loader.loadLease("https://images.example/first.png#cached");
    await expect(loader.load("https://images.example/second.png")).resolves.toBe(
      "blob:kikilink-2",
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(objectUrls.revoke).not.toHaveBeenCalledWith("blob:kikilink-1");
    firstLease.release();
    firstLease.release();
    expect(objectUrls.revoke).not.toHaveBeenCalledWith("blob:kikilink-1");
    secondLease.release();
    secondLease.release();
    expect(objectUrls.revoke).toHaveBeenCalledTimes(1);
    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-1");

    loader.destroy();
    expect(objectUrls.revoke).toHaveBeenCalledTimes(2);
    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-2");
  });

  it("does not expose more leased image URLs than the browser-decode concurrency cap", async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) =>
      imageResponse({ url: String(input) }),
    );
    const loader = new RemoteImageLoader({
      fetchImpl,
      objectUrls: objectUrlPlatform(),
      maxConcurrentDecodes: 1,
    });

    const first = await loader.loadLease("https://images.example/decode-first.png");
    let secondResolved = false;
    const secondPromise = loader
      .loadLease("https://images.example/decode-second.png")
      .then((lease) => {
        secondResolved = true;
        return lease;
      });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(secondResolved).toBe(false);

    first.release();
    const second = await secondPromise;
    expect(secondResolved).toBe(true);
    second.release();
    loader.destroy();
  });

  it("removes an aborted cached decode waiter without consuming the next permit", async () => {
    const loader = new RemoteImageLoader({
      fetchImpl: async () => imageResponse(),
      objectUrls: objectUrlPlatform(),
      maxConcurrentDecodes: 1,
    });
    const active = await loader.loadLease("https://images.example/decode-shared.png");
    const controller = new AbortController();
    const cancelled = loader.loadLease(
      "https://images.example/decode-shared.png",
      controller.signal,
    );
    controller.abort();

    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
    active.release();
    const replacement = await loader.loadLease("https://images.example/decode-shared.png");
    replacement.release();
    loader.destroy();
  });

  it("rejects a queued decode lease and clears its timeout when destroyed", async () => {
    vi.useFakeTimers();
    try {
      const loader = new RemoteImageLoader({
        fetchImpl: async () => imageResponse(),
        objectUrls: objectUrlPlatform(),
        maxConcurrentDecodes: 1,
        requestTimeoutMs: 200,
      });
      const active = await loader.loadLease("https://images.example/decode-live.png");
      const queued = loader.loadLease("https://images.example/decode-queued.png");
      await vi.advanceTimersByTimeAsync(0);

      loader.destroy();
      await expect(queued).rejects.toMatchObject({ code: "destroyed" });
      active.release();
      await vi.advanceTimersByTimeAsync(500);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops an aborted in-flight lease reservation without affecting another consumer", async () => {
    const pending = deferred<Response>();
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockImplementationOnce(() => pending.promise)
      .mockImplementation(async (input) => imageResponse({ url: String(input) }));
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({
      fetchImpl,
      objectUrls,
      maxCacheEntries: 1,
    });
    const controller = new AbortController();

    const cancelled = loader.loadLease(
      "https://images.example/shared-lease.png",
      controller.signal,
    );
    const remaining = loader.loadLease("https://images.example/shared-lease.png");
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
    pending.resolve(imageResponse({ url: "https://images.example/shared-lease.png" }));
    const lease = await remaining;

    await loader.load("https://images.example/evicts-shared.png");
    expect(objectUrls.revoke).not.toHaveBeenCalledWith("blob:kikilink-1");
    lease.release();
    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-1");
    expect(
      objectUrls.revoke.mock.calls.filter(([url]) => url === "blob:kikilink-1"),
    ).toHaveLength(1);
    loader.destroy();
  });

  it("revokes a live leased URL exactly once when destroyed", async () => {
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({
      fetchImpl: async () => imageResponse(),
      objectUrls,
    });
    const lease = await loader.loadLease("https://images.example/leased.png");

    loader.destroy();
    loader.destroy();
    lease.release();
    lease.release();

    expect(objectUrls.revoke).toHaveBeenCalledTimes(1);
    expect(objectUrls.revoke).toHaveBeenCalledWith(lease.url);
  });

  it("aborts in-flight work and revokes every cached URL exactly once on destroy", async () => {
    const pending = deferred<Response>();
    let pendingSignal: AbortSignal | undefined;
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(imageResponse())
      .mockImplementationOnce((_input, init) => {
        pendingSignal = init?.signal ?? undefined;
        return pending.promise;
      });
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({ fetchImpl, objectUrls });

    await loader.load("https://images.example/cached.png");
    const inFlight = loader.load("https://images.example/pending.png");
    loader.destroy();
    loader.destroy();

    await expect(inFlight).rejects.toMatchObject({ name: "AbortError" });
    expect(pendingSignal?.aborted).toBe(true);
    expect(objectUrls.revoke).toHaveBeenCalledTimes(1);
    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-1");
    await expect(loader.load("https://images.example/after.png")).rejects.toMatchObject({
      code: "destroyed",
    });
  });

  it("fails closed when fetch or object-URL support is unavailable", async () => {
    const objectUrls = objectUrlPlatform();
    const noFetch = new RemoteImageLoader({ fetchImpl: null, objectUrls });
    await expect(noFetch.load("https://images.example/avatar.png")).rejects.toMatchObject({
      code: "unsupported",
    });

    const fetchImpl = vi.fn<FetchLike>(async () => imageResponse());
    const noObjectUrls = new RemoteImageLoader({ fetchImpl, objectUrls: null });
    await expect(noObjectUrls.load("https://images.example/avatar.png")).rejects.toMatchObject({
      code: "unsupported",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never permits configuration above production byte or decoded-surface limits", () => {
    expect(
      () => new RemoteImageLoader({ maxImageBytes: MAX_REMOTE_IMAGE_BYTES + 1 }),
    ).toThrow(RangeError);
    expect(
      () => new RemoteImageLoader({ maxImageDimension: MAX_REMOTE_IMAGE_DIMENSION + 1 }),
    ).toThrow(RangeError);
    expect(
      () => new RemoteImageLoader({ maxImagePixels: MAX_REMOTE_IMAGE_PIXELS + 1 }),
    ).toThrow(RangeError);
    expect(
      () => new RemoteImageLoader({ maxAnimationFrames: MAX_REMOTE_ANIMATION_FRAMES + 1 }),
    ).toThrow(RangeError);
    expect(
      () => new RemoteImageLoader({ maxAnimationPixels: MAX_REMOTE_ANIMATION_PIXELS + 1 }),
    ).toThrow(RangeError);
    expect(
      () => new RemoteImageLoader({
        maxAnimationPixelsPerSecond: MAX_REMOTE_ANIMATION_PIXELS_PER_SECOND + 1,
      }),
    ).toThrow(RangeError);
  });
});

function imageBytesForMime(mime: string): Uint8Array {
  switch (mime) {
    case "image/gif":
      return gifBytes(1, 1);
    case "image/jpeg":
      return jpegBytes(1, 1);
    case "image/webp":
      return webpLosslessBytes(1, 1);
    case "image/avif":
      return avifBytes(1, 1);
    default:
      return pngBytes(1, 1);
  }
}

function pngBytes(width: number, height: number, ancillaryBytes = 0): Uint8Array {
  const header = new Uint8Array(13);
  writeUint32Be(header, 0, width);
  writeUint32Be(header, 4, height);
  header.set([8, 6, 0, 0, 0], 8);
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
  ];
  if (ancillaryBytes > 0) parts.push(pngChunk("tEXt", new Uint8Array(ancillaryBytes)));
  parts.push(pngChunk("IDAT", new Uint8Array()), pngChunk("IEND", new Uint8Array()));
  return concatenate(parts);
}

function animatedPngBytes(
  canvasWidth: number,
  canvasHeight: number,
  frameWidth: number,
  frameHeight: number,
): Uint8Array {
  return animatedPngFrames(canvasWidth, canvasHeight, [
    { width: frameWidth, height: frameHeight },
  ]);
}

function animatedPngFrames(
  canvasWidth: number,
  canvasHeight: number,
  frames: readonly { width: number; height: number; durationMs?: number }[],
): Uint8Array {
  const base = pngBytes(canvasWidth, canvasHeight);
  const animationControl = new Uint8Array(8);
  writeUint32Be(animationControl, 0, frames.length);
  const frameChunks = frames.map(({ width, height, durationMs = 0 }, index) => {
    const frame = new Uint8Array(26);
    writeUint32Be(frame, 0, index);
    writeUint32Be(frame, 4, width);
    writeUint32Be(frame, 8, height);
    writeUint16Be(frame, 20, durationMs);
    writeUint16Be(frame, 22, 1_000);
    return pngChunk("fcTL", frame);
  });
  return concatenate([
    base.slice(0, 33),
    pngChunk("acTL", animationControl),
    ...frameChunks,
    base.slice(33),
  ]);
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.byteLength);
  writeUint32Be(chunk, 0, data.byteLength);
  chunk.set(asciiBytes(type), 4);
  chunk.set(data, 8);
  // CRC bytes intentionally remain zero: the loader validates the bounded container structure,
  // while the native decoder remains responsible for compressed-data and checksum validity.
  return chunk;
}

function jpegBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(28);
  bytes.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08], 0);
  writeUint16Be(bytes, 7, height);
  writeUint16Be(bytes, 9, width);
  bytes.set(
    [
      0x01, 0x01, 0x11, 0x00,
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
      0x01, 0xff, 0xd9,
    ],
    11,
  );
  return bytes;
}

function gifBytes(
  canvasWidth: number,
  canvasHeight: number,
  frameWidth = canvasWidth,
  frameHeight = canvasHeight,
): Uint8Array {
  return gifAnimationBytes(canvasWidth, canvasHeight, [
    { width: frameWidth, height: frameHeight },
  ]);
}

function gifAnimationBytes(
  canvasWidth: number,
  canvasHeight: number,
  frames: readonly { width: number; height: number; durationMs?: number }[],
): Uint8Array {
  const header = new Uint8Array(13);
  header.set(asciiBytes("GIF89a"), 0);
  writeUint16Le(header, 6, canvasWidth);
  writeUint16Le(header, 8, canvasHeight);
  const frameBlocks = frames.flatMap(({ width, height, durationMs }) => {
    const frame = new Uint8Array(15);
    frame[0] = 0x2c;
    writeUint16Le(frame, 5, width);
    writeUint16Le(frame, 7, height);
    frame.set([0, 2, 2, 0x44, 0x01, 0], 9);
    if (durationMs === undefined) return [frame];
    const graphicsControl = new Uint8Array([0x21, 0xf9, 4, 0, 0, 0, 0, 0]);
    writeUint16Le(graphicsControl, 4, Math.floor(durationMs / 10));
    return [graphicsControl, frame];
  });
  return concatenate([header, ...frameBlocks, new Uint8Array([0x3b])]);
}

function webpLosslessBytes(width: number, height: number): Uint8Array {
  return webpRiff([webpChunk("VP8L", vp8lPayload(width, height))]);
}

function animatedWebpBytes(
  canvasWidth: number,
  canvasHeight: number,
  frameWidth: number,
  frameHeight: number,
): Uint8Array {
  return animatedWebpFrames(canvasWidth, canvasHeight, [
    { width: frameWidth, height: frameHeight },
  ]);
}

function animatedWebpFrames(
  canvasWidth: number,
  canvasHeight: number,
  frames: readonly { width: number; height: number; durationMs?: number }[],
): Uint8Array {
  const extended = new Uint8Array(10);
  extended[0] = 0x02;
  writeUint24Le(extended, 4, canvasWidth - 1);
  writeUint24Le(extended, 7, canvasHeight - 1);
  const frameChunks = frames.map(({ width, height, durationMs = 0 }) => {
    const frameHeader = new Uint8Array(16);
    writeUint24Le(frameHeader, 6, width - 1);
    writeUint24Le(frameHeader, 9, height - 1);
    writeUint24Le(frameHeader, 12, durationMs);
    return webpChunk(
      "ANMF",
      concatenate([frameHeader, webpChunk("VP8L", vp8lPayload(width, height))]),
    );
  });
  return webpRiff([
    webpChunk("VP8X", extended),
    webpChunk("ANIM", new Uint8Array(6)),
    ...frameChunks,
  ]);
}

function vp8lPayload(width: number, height: number): Uint8Array {
  const payload = new Uint8Array(5);
  payload[0] = 0x2f;
  const packed = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  writeUint32Le(payload, 1, packed >>> 0);
  return payload;
}

function webpRiff(chunks: Uint8Array[]): Uint8Array {
  const payload = concatenate([asciiBytes("WEBP"), ...chunks]);
  const bytes = new Uint8Array(8 + payload.byteLength);
  bytes.set(asciiBytes("RIFF"), 0);
  writeUint32Le(bytes, 4, payload.byteLength);
  bytes.set(payload, 8);
  return bytes;
}

function webpChunk(type: string, data: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(8 + data.byteLength + (data.byteLength & 1));
  bytes.set(asciiBytes(type), 0);
  writeUint32Le(bytes, 4, data.byteLength);
  bytes.set(data, 8);
  return bytes;
}

function avifBytes(width: number, height: number): Uint8Array {
  const fileType = isoBox(
    "ftyp",
    concatenate([
      asciiBytes("avif"),
      new Uint8Array(4),
      asciiBytes("mif1"),
      asciiBytes("avif"),
    ]),
  );
  const spatialExtents = new Uint8Array(12);
  writeUint32Be(spatialExtents, 4, width);
  writeUint32Be(spatialExtents, 8, height);
  const propertyContainer = isoBox("ipco", isoBox("ispe", spatialExtents));
  const itemProperties = isoBox("iprp", propertyContainer);
  const meta = isoBox("meta", concatenate([new Uint8Array(4), itemProperties]));
  return concatenate([fileType, meta]);
}

function isoBox(type: string, payload: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(8 + payload.byteLength);
  writeUint32Be(bytes, 0, bytes.byteLength);
  bytes.set(asciiBytes(type), 4);
  bytes.set(payload, 8);
  return bytes;
}

function asciiBytes(value: string): Uint8Array {
  return Uint8Array.from(value, (character) => character.charCodeAt(0));
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
  const size = parts.reduce((total, part) => total + part.byteLength, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

function writeUint16Be(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 8) & 0xff;
  bytes[offset + 1] = value & 0xff;
}

function writeUint16Le(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint24Le(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
}

function writeUint32Be(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function writeUint32Le(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function imageResponse(options: TestResponseOptions = {}): Response {
  const status = options.status ?? 200;
  const mime = options.mime ?? "image/png";
  const chunks = options.chunks ?? [imageBytesForMime(mime)];
  const cancel = options.cancel ?? (() => undefined);
  const headers = new Headers({ "content-type": mime });
  if (options.contentLength !== undefined) headers.set("content-length", options.contentLength);
  let chunkIndex = 0;
  const body = options.stream === false
    ? null
    : new ReadableStream<Uint8Array>({
        pull(controller) {
          const chunk = chunks[chunkIndex++];
          if (chunk) controller.enqueue(chunk);
          else controller.close();
        },
        cancel,
      });
  const blobParts: ArrayBuffer[] = chunks.map((chunk) => {
    const copy = new ArrayBuffer(chunk.byteLength);
    new Uint8Array(copy).set(chunk);
    return copy;
  });
  const blob = new Blob(blobParts, { type: mime });
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    url: options.url ?? "https://images.example/avatar.png",
    headers,
    body,
    blob: vi.fn(async () => blob),
  } as unknown as Response;
}

function objectUrlPlatform(): {
  create: ReturnType<typeof vi.fn<(blob: Blob) => string>>;
  revoke: ReturnType<typeof vi.fn<(url: string) => void>>;
} {
  let next = 0;
  return {
    create: vi.fn((_blob: Blob) => `blob:kikilink-${++next}`),
    revoke: vi.fn((_url: string) => undefined),
  };
}

function deferred<Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: Value) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function testAbortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}
