import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkForKikiLinkUpdate,
  KIKILINK_RELEASE_PACKAGE_URL,
  KIKILINK_UPDATE_MAX_RESPONSE_BYTES,
  KIKILINK_UPDATE_TIMEOUT_MS,
  KIKILINK_USERSCRIPT_INSTALL_URL,
  type KikiLinkUpdateFetch,
} from "../src/core/version-update-checker";

const PRODUCTION_HOST = "www.bondageprojects.com";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("KikiLink version update checker", () => {
  it("performs one bounded credentialless request to the official release package", async () => {
    const fetchImpl = vi.fn<KikiLinkUpdateFetch>(async () =>
      packageResponse("0.22.10"));

    await expect(checkForKikiLinkUpdate("0.22.9", {
      hostname: PRODUCTION_HOST,
      fetchImpl,
    })).resolves.toBe("0.22.10");

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      KIKILINK_RELEASE_PACKAGE_URL,
      expect.objectContaining({
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(KIKILINK_RELEASE_PACKAGE_URL).toBe(
      "https://raw.githubusercontent.com/Lilja000/KikiLink/main/package.json",
    );
    expect(KIKILINK_USERSCRIPT_INSTALL_URL).toBe(
      "https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js",
    );
  });

  it("never requests a release outside the production Bondage Club hosts", async () => {
    const fetchImpl = vi.fn<KikiLinkUpdateFetch>(async () => packageResponse("9.0.0"));

    for (const hostname of [
      "localhost",
      "bondageprojects.com.evil.example",
      "evilbondage-europe.com",
      "www.example.com",
    ]) {
      await expect(checkForKikiLinkUpdate("1.0.0", {
        hostname,
        fetchImpl,
      })).resolves.toBeUndefined();
    }

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses strict SemVer precedence and reports only a genuinely newer version", async () => {
    const cases = [
      ["0.22.9", "0.22.10", "0.22.10"],
      ["1.0.0-alpha.2", "1.0.0-alpha.10", "1.0.0-alpha.10"],
      ["1.0.0-rc.1", "1.0.0", "1.0.0"],
      ["1.0.0", "1.0.0+published", undefined],
      ["2.0.0", "1.99.99", undefined],
      ["1.0.0", "1.0.0-rc.2", undefined],
    ] as const;

    for (const [currentVersion, latestVersion, expected] of cases) {
      const fetchImpl = vi.fn<KikiLinkUpdateFetch>(async () =>
        packageResponse(latestVersion));
      await expect(checkForKikiLinkUpdate(currentVersion, {
        hostname: PRODUCTION_HOST,
        fetchImpl,
      })).resolves.toBe(expected);
      expect(fetchImpl).toHaveBeenCalledOnce();
    }
  });

  it("silently rejects malformed versions, payloads, HTTP failures, and network errors", async () => {
    for (const version of ["v1.2.3", "1.2", "1.02.3", "1.2.3-alpha.01", " 1.2.3"] as const) {
      const fetchImpl = vi.fn<KikiLinkUpdateFetch>(async () => packageResponse(version));
      await expect(checkForKikiLinkUpdate("1.0.0", {
        hostname: PRODUCTION_HOST,
        fetchImpl,
      })).resolves.toBeUndefined();
    }

    await expect(checkForKikiLinkUpdate("not-semver", {
      hostname: PRODUCTION_HOST,
      fetchImpl: vi.fn<KikiLinkUpdateFetch>(),
    })).resolves.toBeUndefined();
    await expect(checkForKikiLinkUpdate("1.0.0", {
      hostname: PRODUCTION_HOST,
      fetchImpl: vi.fn<KikiLinkUpdateFetch>(async () => new Response("nope")),
    })).resolves.toBeUndefined();
    await expect(checkForKikiLinkUpdate("1.0.0", {
      hostname: PRODUCTION_HOST,
      fetchImpl: vi.fn<KikiLinkUpdateFetch>(async () => new Response("unavailable", {
        status: 503,
      })),
    })).resolves.toBeUndefined();
    await expect(checkForKikiLinkUpdate("1.0.0", {
      hostname: PRODUCTION_HOST,
      fetchImpl: vi.fn<KikiLinkUpdateFetch>(async () => {
        throw new Error("offline");
      }),
    })).resolves.toBeUndefined();
  });

  it("does not accept an inherited package version", async () => {
    Object.defineProperty(Object.prototype, "version", {
      configurable: true,
      value: "9.0.0",
    });
    try {
      await expect(checkForKikiLinkUpdate("1.0.0", {
        hostname: PRODUCTION_HOST,
        fetchImpl: vi.fn<KikiLinkUpdateFetch>(async () => new Response("{}")),
      })).resolves.toBeUndefined();
    } finally {
      Reflect.deleteProperty(Object.prototype, "version");
    }
  });

  it("cancels a response as soon as its streamed or declared size exceeds the cap", async () => {
    const streamCancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(KIKILINK_UPDATE_MAX_RESPONSE_BYTES + 1));
      },
      cancel: streamCancel,
    });
    const declaredCancel = vi.fn();
    const declaredStream = new ReadableStream<Uint8Array>({ cancel: declaredCancel });
    const fetchImpl = vi
      .fn<KikiLinkUpdateFetch>()
      .mockResolvedValueOnce(new Response(stream))
      .mockResolvedValueOnce(new Response(declaredStream, {
        headers: {
          "content-length": String(KIKILINK_UPDATE_MAX_RESPONSE_BYTES + 1),
        },
      }));

    await expect(checkForKikiLinkUpdate("1.0.0", {
      hostname: PRODUCTION_HOST,
      fetchImpl,
    })).resolves.toBeUndefined();
    await expect(checkForKikiLinkUpdate("1.0.0", {
      hostname: PRODUCTION_HOST,
      fetchImpl,
    })).resolves.toBeUndefined();

    expect(streamCancel).toHaveBeenCalledOnce();
    expect(declaredCancel).toHaveBeenCalledOnce();
  });

  it("aborts a stalled request at the short deadline and releases its timer", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetchImpl = vi.fn<KikiLinkUpdateFetch>(async (_input, init) => {
      requestSignal = init?.signal ?? undefined;
      await new Promise<void>((_resolve, reject) => {
        requestSignal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      });
      throw new Error("unreachable");
    });

    const check = checkForKikiLinkUpdate("1.0.0", {
      hostname: PRODUCTION_HOST,
      fetchImpl,
    });
    await vi.advanceTimersByTimeAsync(KIKILINK_UPDATE_TIMEOUT_MS);

    await expect(check).resolves.toBeUndefined();
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("bounds a response that continually yields empty chunks", async () => {
    const streamCancel = vi.fn();
    let reads = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        reads += 1;
        if (reads <= 10_000) {
          controller.enqueue(new Uint8Array());
          return;
        }
        controller.enqueue(new TextEncoder().encode('{"version":"9.0.0"}'));
        controller.close();
      },
      cancel: streamCancel,
    });

    await expect(checkForKikiLinkUpdate("1.0.0", {
      hostname: PRODUCTION_HOST,
      fetchImpl: vi.fn<KikiLinkUpdateFetch>(async () => new Response(stream)),
      timeoutMs: 1,
    })).resolves.toBeUndefined();

    expect(reads).toBeLessThan(10_000);
    expect(streamCancel).toHaveBeenCalledOnce();
  });
});

function packageResponse(version: string): Response {
  return new Response(JSON.stringify({ name: "kikilink", version }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
