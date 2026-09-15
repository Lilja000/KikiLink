// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/core/distribution", () => ({
  KIKILINK_CATBOX_RELAY_URL: "https://uploads.kikilink.example",
  KIKILINK_DISTRIBUTION: "fusam",
  supportsLongLivedCatboxUploads: () => true,
}));

import { checkForKikiLinkUpdate } from "../src/core/version-update-checker";
import {
  LitterboxImageUploader,
  MAX_UPLOAD_RESPONSE_BYTES,
  supportsLongLivedCatboxUploads,
  uploadMusicToCatbox,
  uploadPreparedImageToCatbox,
  type PreparedLocalImage,
} from "../src/modules/link-chat/image-upload";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(globalThis, "GM_xmlhttpRequest");
});

beforeEach(() => {
  (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(
    "https://www.bondageprojects.com/R104/BondageClub",
  );
});

describe("FUSAM page-realm runtime", () => {
  it("uses one credentialless CORS request for a temporary Litterbox upload", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response("https://litter.catbox.moe/fusam.webp\n", { status: 200 }));
    vi.stubGlobal("fetch", request);

    await expect(new LitterboxImageUploader().upload(preparedImage(), {
      retention: "24h",
    })).resolves.toBe("https://litter.catbox.moe/fusam.webp");

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      "https://litterbox.catbox.moe/resources/internals/api.php",
      expect.objectContaining({
        method: "POST",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("caps upload-host responses at four KiB", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_UPLOAD_RESPONSE_BYTES + 1));
      },
      cancel,
    });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => new Response(body, { status: 200 })));

    expect(MAX_UPLOAD_RESPONSE_BYTES).toBe(4 * 1024);
    await expect(new LitterboxImageUploader().upload(preparedImage(), {
      retention: "12h",
    })).rejects.toThrow("unexpected link");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("routes every long-lived Catbox upload only through the fixed relay", async () => {
    const pageFetch = vi.fn<typeof fetch>();
    const injectedFetch = vi.fn<typeof fetch>(async (_input, init) => {
      const kind = new Headers(init?.headers).get("X-KikiLink-Upload-Kind");
      return Response.json({
        url: kind === "image"
          ? "https://files.catbox.moe/fusam-image.webp"
          : "https://files.catbox.moe/fusam-track.mp3",
      });
    });
    const gmRequest = vi.fn();
    vi.stubGlobal("fetch", pageFetch);
    globalThis.GM_xmlhttpRequest = gmRequest;
    mockRelayAuthorization();

    expect(supportsLongLivedCatboxUploads()).toBe(true);
    await expect(uploadPreparedImageToCatbox(
      preparedImage(),
      injectedFetch,
    )).resolves.toBe("https://files.catbox.moe/fusam-image.webp");
    await expect(uploadMusicToCatbox(
      new File([new Uint8Array([1])], "track.mp3", { type: "audio/mpeg" }),
      injectedFetch,
    )).resolves.toBe("https://files.catbox.moe/fusam-track.mp3");

    expect(injectedFetch).toHaveBeenCalledTimes(2);
    for (const [url, init] of injectedFetch.mock.calls) {
      expect(url).toBe("https://uploads.kikilink.example/v1/upload");
      expect(init).toEqual(expect.objectContaining({
        method: "POST",
        mode: "cors",
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        body: expect.any(File),
      }));
      expect(init).not.toHaveProperty("cache");
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toMatch(/^Bearer [A-Za-z0-9_-]{43}$/u);
      expect(["image", "audio"]).toContain(headers.get("X-KikiLink-Upload-Kind"));
    }
    expect(pageFetch).not.toHaveBeenCalled();
    expect(gmRequest).not.toHaveBeenCalled();
  });

  it("suppresses the direct-userscript update request", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(checkForKikiLinkUpdate("0.1.0", {
      hostname: "www.bondageprojects.com",
      fetchImpl,
    })).resolves.toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

function preparedImage(): PreparedLocalImage {
  return {
    blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" }),
    width: 2,
    height: 2,
    sourceBytes: 3,
  };
}

function mockRelayAuthorization(): void {
  vi.spyOn(window, "open").mockImplementation((value) => {
    const popup = {
      closed: false,
      close: vi.fn(),
    } as unknown as Window;
    const authorizeUrl = new URL(String(value));
    const state = new URLSearchParams(authorizeUrl.hash.slice(1)).get("state");
    queueMicrotask(() => {
      window.dispatchEvent(new MessageEvent("message", {
        origin: authorizeUrl.origin,
        source: popup,
        data: {
          type: "kikilink:catbox-relay-session:v1",
          state,
          token: "A".repeat(43),
          expiresAt: Date.now() + 10 * 60_000,
        },
      }));
    });
    return popup;
  });
}
