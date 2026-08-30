// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/core/distribution", () => ({
  KIKILINK_DISTRIBUTION: "fusam",
  supportsLongLivedCatboxUploads: () => false,
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

  it("rejects every long-lived Catbox upload before any network transport", async () => {
    const pageFetch = vi.fn<typeof fetch>();
    const injectedFetch = vi.fn<typeof fetch>();
    const gmRequest = vi.fn();
    vi.stubGlobal("fetch", pageFetch);
    globalThis.GM_xmlhttpRequest = gmRequest;

    expect(supportsLongLivedCatboxUploads()).toBe(false);
    await expect(uploadPreparedImageToCatbox(
      preparedImage(),
      injectedFetch,
    )).rejects.toThrow("Long-lived Catbox uploads are unavailable in FUSAM");
    await expect(uploadMusicToCatbox(
      new File([new Uint8Array([1])], "track.mp3", { type: "audio/mpeg" }),
      injectedFetch,
    )).rejects.toThrow("Long-lived Catbox uploads are unavailable in FUSAM");
    expect(injectedFetch).not.toHaveBeenCalled();
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
