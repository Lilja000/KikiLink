import { describe, expect, it, vi } from "vitest";
import {
  MAX_REMOTE_IMAGE_BYTES,
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
    const bytes = new Uint8Array([1, 2, 3, 4]);
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

  it("times out a never-settling fetch and advances the bounded queue", async () => {
    vi.useFakeTimers();
    try {
      let firstSignal: AbortSignal | undefined;
      const secondResponse = deferred<Response>();
      const fetchImpl = vi
        .fn<FetchLike>()
        .mockImplementationOnce((_input, init) => {
          firstSignal = init?.signal ?? undefined;
          return new Promise<Response>(() => undefined);
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
      const size = String(input).includes("large-d")
        ? 7
        : String(input).includes("large")
          ? 6
          : 4;
      return imageResponse({ url: String(input), chunks: [new Uint8Array(size)] });
    });
    const objectUrls = objectUrlPlatform();
    const loader = new RemoteImageLoader({
      fetchImpl,
      objectUrls,
      maxImageBytes: 10,
      maxCacheEntries: 2,
      maxCacheBytes: 10,
    });

    await loader.load("https://images.example/a.png");
    await loader.load("https://images.example/large-b.png");
    await loader.load("https://images.example/a.png"); // a is now most recently used
    await loader.load("https://images.example/c.png");

    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-2");
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    await loader.load("https://images.example/large-d.png");
    // The byte budget leaves only the six-byte newest entry and revokes both older four-byte URLs.
    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-1");
    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:kikilink-3");
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

  it("never permits configuration above the five MiB production limit", () => {
    expect(
      () => new RemoteImageLoader({ maxImageBytes: MAX_REMOTE_IMAGE_BYTES + 1 }),
    ).toThrow(RangeError);
  });
});

function imageResponse(options: TestResponseOptions = {}): Response {
  const status = options.status ?? 200;
  const mime = options.mime ?? "image/png";
  const chunks = options.chunks ?? [new Uint8Array([1, 2, 3])];
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
  const blobParts: BlobPart[] = chunks.map((chunk) => {
    const copy = new Uint8Array(chunk.byteLength);
    copy.set(chunk);
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
