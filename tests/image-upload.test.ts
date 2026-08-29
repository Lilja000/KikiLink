// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CloudinaryImageUploader,
  detectLocalImageType,
  LitterboxImageUploader,
  MAX_PROFILE_BANNER_BYTES,
  normalizeCloudinaryUploadConfig,
  normalizeLitterboxUploadConfig,
  prepareProfileBanner,
  PROFILE_BANNER_HEIGHT,
  PROFILE_BANNER_WIDTH,
  uploadLocalRoomAudio,
  uploadMusicToCatbox,
  uploadPreparedImageToCatbox,
  validateLocalImageFile,
  type PreparedLocalImage,
} from "../src/modules/link-chat/image-upload";
import { installUserscriptUploadHost } from "../src/userscript-upload-host";

const TEST_UPLOAD_CAPABILITY = "a".repeat(64);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(globalThis, "GM_xmlhttpRequest");
  Reflect.deleteProperty(globalThis, "__KIKILINK_UPLOAD_CAPABILITY__");
  document.getElementById("kikilink-upload-bridge-v1")?.remove();
});

describe("local image uploads", () => {
  it("recognizes only supported image signatures", () => {
    expect(detectLocalImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(
      detectLocalImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe("image/png");
    expect(
      detectLocalImageType(
        bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50),
      ),
    ).toBe("image/webp");
    expect(detectLocalImageType(bytes(0x3c, 0x73, 0x76, 0x67))).toBeNull();
  });

  it("checks file contents instead of trusting its filename", async () => {
    const realPng = pngFile("private-name.png");
    const disguisedText = new File(["not an image"], "photo.png", { type: "image/png" });

    await expect(validateLocalImageFile(realPng)).resolves.toBeUndefined();
    await expect(validateLocalImageFile(disguisedText)).rejects.toThrow(
      "Use a real JPG, PNG, or WebP image",
    );
  });

  it("preflights ordinary JPG, PNG, and WebP dimensions from their encoded headers", async () => {
    await expect(validateLocalImageFile(jpegFile(640, 480))).resolves.toBeUndefined();
    await expect(validateLocalImageFile(pngFile("ordinary.png", 640, 480))).resolves.toBeUndefined();
    await expect(
      validateLocalImageFile(apngFrameFile(640, 480, 640, 480, "image/apng")),
    ).resolves.toBeUndefined();
    await expect(validateLocalImageFile(webpFile(640, 480))).resolves.toBeUndefined();
  });

  it("rejects oversized declared canvases before invoking a browser image decoder", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);

    for (const file of [
      jpegFile(65_535, 65_535),
      pngFile("oversized.png", 65_535, 65_535),
      apngFrameFile(1, 1, 65_535, 65_535),
      webpFile(65_535, 65_535),
      webpNestedFrameFile(1, 1, 16_383, 16_383),
    ]) {
      await expect(prepareProfileBanner(file)).rejects.toThrow(
        "This image has too many pixels to prepare safely",
      );
    }
    await expect(
      prepareProfileBanner(jpegFileWithFrames([[1, 1], [65_535, 65_535]])),
    ).rejects.toThrow("This image header could not be inspected safely");
    await expect(
      prepareProfileBanner(pngFileWithDuplicateHeader(1, 1, 65_535, 65_535)),
    ).rejects.toThrow("This image header could not be inspected safely");
    await expect(
      prepareProfileBanner(webpNestedFrameFile(1, 1, 1, 1, 33_554_428, 0)),
    ).rejects.toThrow("This image header could not be inspected safely");
    await expect(
      prepareProfileBanner(apngFrameFile(512, 512, 512, 512, "image/png", 241)),
    ).rejects.toThrow("This animated image is too complex to prepare safely");
    await expect(
      prepareProfileBanner(webpManyFramesFile(4_096, 4_096, 5)),
    ).rejects.toThrow("This animated image is too complex to prepare safely");
    expect(decode).not.toHaveBeenCalled();
  });

  it("privacy-prepares a centered, exact 3:1 profile banner", async () => {
    const preparedBlob = new Blob([bytes(1, 2, 3)], { type: "image/webp" });
    const harness = installImagePreparationHarness(2_400, 1_200, [preparedBlob]);
    const file = pngFile("private-banner-name.png");

    await expect(prepareProfileBanner(file)).resolves.toEqual({
      blob: preparedBlob,
      width: PROFILE_BANNER_WIDTH,
      height: PROFILE_BANNER_HEIGHT,
      sourceBytes: file.size,
    });

    expect(harness.drawImage).toHaveBeenCalledWith(
      harness.bitmap,
      0,
      200,
      2_400,
      800,
      0,
      0,
      1_200,
      400,
    );
    expect(harness.context.imageSmoothingEnabled).toBe(true);
    expect(harness.context.imageSmoothingQuality).toBe("high");
    expect(harness.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.88);
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it("lowers WebP quality until a profile banner fits the 2 MiB limit", async () => {
    const oversized = new Blob([new Uint8Array(MAX_PROFILE_BANNER_BYTES + 1)], {
      type: "image/webp",
    });
    const compact = new Blob([bytes(1, 2, 3)], { type: "image/webp" });
    const harness = installImagePreparationHarness(1_200, 400, [oversized, compact]);

    const prepared = await prepareProfileBanner(pngFile());

    expect(prepared.blob).toBe(compact);
    expect(prepared.blob.size).toBeLessThanOrEqual(MAX_PROFILE_BANNER_BYTES);
    expect(harness.toBlob.mock.calls.map((call) => call[2])).toEqual([0.88, 0.76]);
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it("fails closed when a profile banner cannot be encoded below 2 MiB", async () => {
    const oversized = new Blob([new Uint8Array(MAX_PROFILE_BANNER_BYTES + 1)], {
      type: "image/webp",
    });
    const harness = installImagePreparationHarness(1_200, 400, [oversized]);

    await expect(prepareProfileBanner(pngFile())).rejects.toThrow(
      "profile banner is still larger than 2 MB",
    );
    expect(harness.toBlob).toHaveBeenCalledTimes(5);
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it("accepts only compact Cloudinary public identifiers", () => {
    expect(
      normalizeCloudinaryUploadConfig({
        cloudName: "  sakura-cloud ",
        uploadPreset: " kikilink_unsigned ",
      }),
    ).toEqual({ cloudName: "sakura-cloud", uploadPreset: "kikilink_unsigned" });
    expect(
      normalizeCloudinaryUploadConfig({ cloudName: "https://evil.example", uploadPreset: "x" }),
    ).toBeNull();
  });

  it("accepts only supported temporary Litterbox lifetimes", () => {
    expect(normalizeLitterboxUploadConfig({ retention: "1h" })).toEqual({ retention: "1h" });
    expect(normalizeLitterboxUploadConfig({ retention: "24h" })).toEqual({ retention: "24h" });
    expect(normalizeLitterboxUploadConfig({ retention: "7d" })).toBeNull();
    expect(normalizeLitterboxUploadConfig({ retention: 24 })).toBeNull();
  });

  it("uploads a prepared generic WebP to Litterbox with an explicit retention", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response("  https://litter.catbox.moe/abc_123.webp\n", { status: 200 }),
    );
    const uploader = new LitterboxImageUploader(request as typeof fetch);
    const image: PreparedLocalImage = {
      blob: new Blob([bytes(1, 2, 3)], { type: "image/webp" }),
      width: 640,
      height: 480,
      sourceBytes: 1234,
    };

    await expect(uploader.upload(image, { retention: "24h" })).resolves.toBe(
      "https://litter.catbox.moe/abc_123.webp",
    );

    expect(request).toHaveBeenCalledOnce();
    const [endpoint, options] = request.mock.calls[0] ?? [];
    expect(endpoint).toBe("https://litterbox.catbox.moe/resources/internals/api.php");
    expect(options).toMatchObject({
      method: "POST",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    const form = options?.body as FormData;
    expect(form.get("reqtype")).toBe("fileupload");
    expect(form.get("time")).toBe("24h");
    const uploaded = form.get("fileToUpload");
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name).toBe("kikilink-image.webp");
    expect((uploaded as File).type).toBe("image/webp");
  });

  it("cancels an in-flight Litterbox upload through the caller lifecycle signal", async () => {
    const controller = new AbortController();
    const request = vi.fn<typeof fetch>((_endpoint, options) =>
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("cancelled", "AbortError")),
          { once: true },
        );
      }));
    const uploader = new LitterboxImageUploader(request as typeof fetch);

    const upload = uploader.upload(
      preparedImage(),
      { retention: "24h" },
      controller.signal,
    );
    controller.abort();

    await expect(upload).rejects.toThrow("The upload was cancelled");
    expect(request).toHaveBeenCalledOnce();
  });

  it("uploads a prepared generic WebP to long-lived Catbox storage", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response("https://files.catbox.moe/gallery_123.webp\n", { status: 200 }));
    const image: PreparedLocalImage = {
      blob: new Blob([bytes(1, 2, 3)], { type: "image/webp" }),
      width: 640,
      height: 480,
      sourceBytes: 1234,
    };

    await expect(uploadPreparedImageToCatbox(image, request)).resolves.toBe(
      "https://files.catbox.moe/gallery_123.webp",
    );
    expect(request.mock.calls[0]?.[0]).toBe("https://catbox.moe/user/api.php");
    const form = request.mock.calls[0]?.[1]?.body as FormData;
    expect(form.get("reqtype")).toBe("fileupload");
    const uploaded = form.get("fileToUpload") as File;
    expect(uploaded.name).toBe("kikilink-image.webp");
    expect(uploaded.type).toBe("image/webp");
  });

  it("reports Catbox image progress through the privileged request path", async () => {
    const progress = vi.fn();
    let requestDetails: KikiLinkGmXhrDetails | undefined;
    globalThis.GM_xmlhttpRequest = vi.fn((details: KikiLinkGmXhrDetails) => {
      requestDetails = details;
      queueMicrotask(() => {
        details.onprogress?.({ loaded: 2, total: 4, lengthComputable: true });
        details.onload({
          status: 200,
          responseText: "https://files.catbox.moe/banner_progress.webp",
        });
      });
      return { abort: vi.fn() };
    });

    await expect(uploadPreparedImageToCatbox(preparedImage(), undefined, progress)).resolves.toBe(
      "https://files.catbox.moe/banner_progress.webp",
    );
    expect(progress).toHaveBeenCalledWith({ loaded: 2, total: 4, percent: 50 });
    expect(requestDetails?.timeout).toBe(180_000);
    expect(requestDetails?.anonymous).toBeUndefined();
    expect((requestDetails?.data as FormData).has("userhash")).toBe(false);
  });

  it("keeps Litterbox on the credential-omitting GM transport", async () => {
    let requestDetails: KikiLinkGmXhrDetails | undefined;
    globalThis.GM_xmlhttpRequest = vi.fn((details: KikiLinkGmXhrDetails) => {
      requestDetails = details;
      queueMicrotask(() => details.onload({
        status: 200,
        responseText: "https://litter.catbox.moe/temporary.webp",
      }));
      return { abort: vi.fn() };
    });

    await expect(new LitterboxImageUploader().upload(preparedImage(), {
      retention: "24h",
    })).resolves.toBe("https://litter.catbox.moe/temporary.webp");
    expect(requestDetails?.anonymous).toBe(true);
  });

  it("does not automatically retry an ambiguous Catbox 503 upload", async () => {
    const attemptTimeouts: number[] = [];
    globalThis.GM_xmlhttpRequest = vi.fn((details: KikiLinkGmXhrDetails) => {
      attemptTimeouts.push(details.timeout ?? 0);
      details.onload({ status: 503, responseText: "temporarily unavailable" });
      return { abort: vi.fn() };
    });

    await expect(uploadPreparedImageToCatbox(preparedImage())).rejects.toThrow(
      "Catbox is temporarily unavailable (HTTP 503). Try again in a moment.",
    );
    expect(attemptTimeouts).toEqual([180_000]);
  });

  it("cancels an injected fetch upload without retrying it", async () => {
    const controller = new AbortController();
    const request = vi.fn<typeof fetch>((_endpoint, options) =>
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("cancelled", "AbortError")),
          { once: true },
        );
      }));

    const upload = uploadPreparedImageToCatbox(
      preparedImage(),
      request,
      undefined,
      controller.signal,
    );
    controller.abort();

    await expect(upload).rejects.toThrow("The upload was cancelled");
    expect(request).toHaveBeenCalledOnce();
  });

  it("does not retry an ambiguous network failure", async () => {
    const request = vi.fn<typeof fetch>(async () => {
      throw new TypeError("network failed");
    });

    await expect(uploadPreparedImageToCatbox(preparedImage(), request)).rejects.toThrow(
      "blocked by the browser network policy",
    );
    expect(request).toHaveBeenCalledOnce();
  });

  it("fails clearly when the production upload bridge is unavailable", async () => {
    const pageFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", pageFetch);

    await expect(uploadPreparedImageToCatbox(preparedImage())).rejects.toThrow(
      "KikiLink's local upload service is unavailable",
    );
    expect(pageFetch).not.toHaveBeenCalled();
  });

  it("does not automatically retry an ambiguous Litterbox 500 upload", async () => {
    const request = vi.fn<typeof fetch>(async () => new Response(
      '<!doctype html><html><title>500 | Internal Server Error</title></html>',
      { status: 500 },
    ));
    const uploader = new LitterboxImageUploader(request as typeof fetch);
    const image: PreparedLocalImage = {
      blob: new Blob([bytes(1, 2, 3)], { type: "image/webp" }),
      width: 2,
      height: 2,
      sourceBytes: 3,
    };

    await expect(uploader.upload(image, { retention: "24h" })).rejects.toThrow(
      "Litterbox is temporarily unavailable (HTTP 500). Try again in a moment.",
    );
    expect(request).toHaveBeenCalledOnce();
  });

  it("turns a host-side HTML 500 into a short actionable error", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response(
        '<!doctype html><html lang="en"><meta charset="UTF-8"><title>500 | Internal Server Error</title>',
        { status: 500 },
      ));
    const uploader = new LitterboxImageUploader(request as typeof fetch);
    const image: PreparedLocalImage = {
      blob: new Blob([bytes(1)], { type: "image/webp" }),
      width: 1,
      height: 1,
      sourceBytes: 1,
    };

    const error = await uploader.upload(image, { retention: "12h" }).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Litterbox is temporarily unavailable (HTTP 500). Try again in a moment.",
    );
    expect((error as Error).message).not.toMatch(/doctype|<html|<meta/iu);
    expect(request).toHaveBeenCalledOnce();
  });

  it("rejects Litterbox responses outside the exact temporary WebP host and shape", async () => {
    const image: PreparedLocalImage = {
      blob: new Blob([bytes(1)], { type: "image/webp" }),
      width: 1,
      height: 1,
      sourceBytes: 1,
    };

    for (const responseBody of [
      "https://files.catbox.moe/photo.webp",
      "https://litter.catbox.moe/photo.png",
      "https://litter.catbox.moe/folder/photo.webp",
      "https://litter.catbox.moe/photo.webp?tracking=1",
    ]) {
      const uploader = new LitterboxImageUploader(
        vi.fn<typeof fetch>(async () => new Response(responseBody, { status: 200 })) as typeof fetch,
      );
      await expect(uploader.upload(image, { retention: "12h" })).rejects.toThrow(
        "unexpected link",
      );
    }
  });

  it("uploads renamed room music to an exact temporary audio URL", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response("https://litter.catbox.moe/room_song.mp3\n", { status: 200 }),
    );
    const file = new File([bytes(1, 2, 3)], "private-scene-name.mp3", {
      type: "audio/mpeg",
    });

    await expect(uploadLocalRoomAudio(file, { retention: "72h" }, request)).resolves.toBe(
      "https://litter.catbox.moe/room_song.mp3",
    );
    const form = request.mock.calls[0]?.[1]?.body as FormData;
    const uploaded = form.get("fileToUpload") as File;
    expect(uploaded.name).toBe("kikilink-room-music.mp3");
    expect(form.get("time")).toBe("72h");
  });

  it("cancels room-music upload transport through its lifecycle signal", async () => {
    const controller = new AbortController();
    const request = vi.fn<typeof fetch>((_endpoint, options) =>
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("cancelled", "AbortError")),
          { once: true },
        );
      }));
    const file = new File([bytes(1, 2, 3)], "private-room.mp3", {
      type: "audio/mpeg",
    });

    const upload = uploadLocalRoomAudio(
      file,
      { retention: "24h" },
      request,
      controller.signal,
    );
    controller.abort();

    await expect(upload).rejects.toThrow("The upload was cancelled");
    expect(request).toHaveBeenCalledOnce();
  });

  it("matches Bondage Club's MP3/MP4 room-music allowlist", async () => {
    const request = vi.fn<typeof fetch>();
    await expect(
      uploadLocalRoomAudio(
        new File([bytes(1, 2, 3)], "unsupported.ogg", { type: "audio/ogg" }),
        { retention: "1h" },
        request as typeof fetch,
      ),
    ).rejects.toThrow("MP3 or MP4");
    expect(request).not.toHaveBeenCalled();
  });

  it("uploads a generically named long-lived playlist track to Catbox", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response("https://files.catbox.moe/track_123.ogg\n", { status: 200 }),
    );
    const file = new File([bytes(1, 2, 3)], "private title.ogg", { type: "audio/ogg" });

    await expect(uploadMusicToCatbox(file, request)).resolves.toBe(
      "https://files.catbox.moe/track_123.ogg",
    );
    expect(request.mock.calls[0]?.[0]).toBe("https://catbox.moe/user/api.php");
    const form = request.mock.calls[0]?.[1]?.body as FormData;
    expect(form.get("reqtype")).toBe("fileupload");
    expect((form.get("fileToUpload") as File).name).toBe("kikilink-track.ogg");
  });

  it("uses Tampermonkey's background request for Catbox and reports upload progress", async () => {
    const progress = vi.fn();
    let details: KikiLinkGmXhrDetails | undefined;
    globalThis.GM_xmlhttpRequest = vi.fn((requestDetails: KikiLinkGmXhrDetails) => {
      details = requestDetails;
      queueMicrotask(() => {
        requestDetails.onprogress?.({ loaded: 50, total: 100, lengthComputable: true });
        requestDetails.onload({
          status: 200,
          responseText: "https://files.catbox.moe/firefox_track.mp3\n",
        });
      });
      return { abort: vi.fn() };
    });
    const file = new File([bytes(1, 2, 3)], "private title.mp3", { type: "audio/mpeg" });

    await expect(uploadMusicToCatbox(file, undefined, progress)).resolves.toBe(
      "https://files.catbox.moe/firefox_track.mp3",
    );
    expect(details).toMatchObject({
      method: "POST",
      url: "https://catbox.moe/user/api.php",
      timeout: 300_000,
    });
    expect(details?.anonymous).toBeUndefined();
    expect((details?.data as FormData).get("fileToUpload")).toBeInstanceOf(File);
    expect(progress).toHaveBeenCalledWith({ loaded: 50, total: 100, percent: 50 });
  });

  it("uploads across the page/sandbox bridge using only cloned multipart data", async () => {
    const progress = vi.fn();
    let details: KikiLinkGmXhrDetails | undefined;
    globalThis.GM_xmlhttpRequest = vi.fn((requestDetails: KikiLinkGmXhrDetails) => {
      details = requestDetails;
      queueMicrotask(() => {
        requestDetails.onprogress?.({ loaded: 3, total: 4, lengthComputable: true });
        requestDetails.onload({
          status: 200,
          responseText: "https://files.catbox.moe/bridged_track.ogg\n",
        });
      });
      return { abort: vi.fn() };
    });
    Object.defineProperty(globalThis, "__KIKILINK_UPLOAD_CAPABILITY__", {
      configurable: true,
      value: TEST_UPLOAD_CAPABILITY,
    });
    const uninstallHost = installUserscriptUploadHost(TEST_UPLOAD_CAPABILITY);
    // happy-dom exposes a distinct internal Window as MessageEvent.source. Real browsers preserve
    // the same WindowProxy identity; dispatch exact metadata here so this remains an integration
    // test for the client/host capability rather than a happy-dom identity quirk.
    const postMessage = vi.spyOn(window, "postMessage").mockImplementation((data) => {
      window.dispatchEvent(new MessageEvent("message", {
        data,
        origin: window.location.origin,
        source: window,
      }));
    });
    const file = new File([bytes(1, 2, 3, 4)], "private title.ogg", {
      type: "audio/ogg",
    });

    try {
      await expect(uploadMusicToCatbox(file, undefined, progress)).resolves.toBe(
        "https://files.catbox.moe/bridged_track.ogg",
      );
      expect(details).toMatchObject({
        method: "POST",
        url: "https://catbox.moe/user/api.php",
        timeout: 300_000,
      });
      expect(details?.anonymous).toBeUndefined();
      const form = details?.data as FormData;
      expect(form.get("reqtype")).toBe("fileupload");
      expect((form.get("fileToUpload") as File).name).toBe("kikilink-track.ogg");
      expect(progress).toHaveBeenCalledWith({ loaded: 3, total: 4, percent: 75 });
    } finally {
      postMessage.mockRestore();
      uninstallHost();
    }
  });

  it("uploads only the prepared generic WebP and validates the returned direct URL", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          secure_url:
            "https://res.cloudinary.com/sakura-cloud/image/upload/v123/kikilink/abc.webp",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const uploader = new CloudinaryImageUploader(request as typeof fetch);
    const image: PreparedLocalImage = {
      blob: new Blob([bytes(1, 2, 3)], { type: "image/webp" }),
      width: 640,
      height: 480,
      sourceBytes: 1234,
    };

    await expect(
      uploader.upload(image, {
        cloudName: "sakura-cloud",
        uploadPreset: "kikilink_unsigned",
      }),
    ).resolves.toBe(
      "https://res.cloudinary.com/sakura-cloud/image/upload/v123/kikilink/abc.webp",
    );

    expect(request).toHaveBeenCalledOnce();
    const [endpoint, options] = request.mock.calls[0] ?? [];
    expect(endpoint).toBe("https://api.cloudinary.com/v1_1/sakura-cloud/image/upload");
    expect(options).toMatchObject({
      method: "POST",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    const form = options?.body as FormData;
    expect(form.get("upload_preset")).toBe("kikilink_unsigned");
    const uploaded = form.get("file");
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name).toBe("kikilink-image.webp");
  });

  it("rejects a successful provider response that points outside the configured cloud", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ secure_url: "https://evil.example/tracker.webp" }), {
        status: 200,
      }),
    );
    const uploader = new CloudinaryImageUploader(request as typeof fetch);

    await expect(
      uploader.upload(
        {
          blob: new Blob([bytes(1)], { type: "image/webp" }),
          width: 1,
          height: 1,
          sourceBytes: 1,
        },
        { cloudName: "sakura-cloud", uploadPreset: "kikilink_unsigned" },
      ),
    ).rejects.toThrow("unexpected link");
  });
});

function bytes(...values: number[]): ArrayBuffer {
  return Uint8Array.from(values).buffer;
}

function preparedImage(): PreparedLocalImage {
  return {
    blob: new Blob([bytes(1, 2, 3)], { type: "image/webp" }),
    width: PROFILE_BANNER_WIDTH,
    height: PROFILE_BANNER_HEIGHT,
    sourceBytes: 1234,
  };
}

function pngFile(name = "banner.png", width = 1_200, height = 400): File {
  return new File([pngHeader(width, height)], name, { type: "image/png" });
}

function pngHeader(width: number, height: number): Uint8Array<ArrayBuffer> {
  const contents = new Uint8Array(33);
  contents.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  writeUint32Be(contents, 8, 13);
  writeAscii(contents, 12, "IHDR");
  writeUint32Be(contents, 16, width);
  writeUint32Be(contents, 20, height);
  contents[24] = 8;
  contents[25] = 6;
  return contents;
}

function apngFrameFile(
  canvasWidth: number,
  canvasHeight: number,
  frameWidth: number,
  frameHeight: number,
  type = "image/png",
  declaredFrames = 1,
): File {
  const contents = new Uint8Array(33 + 20 + 38);
  contents.set(pngHeader(canvasWidth, canvasHeight));
  writeUint32Be(contents, 33, 8);
  writeAscii(contents, 37, "acTL");
  writeUint32Be(contents, 41, declaredFrames);
  writeUint32Be(contents, 53, 26);
  writeAscii(contents, 57, "fcTL");
  writeUint32Be(contents, 65, frameWidth);
  writeUint32Be(contents, 69, frameHeight);
  return new File([contents], "animated.png", { type });
}

function pngFileWithDuplicateHeader(
  firstWidth: number,
  firstHeight: number,
  secondWidth: number,
  secondHeight: number,
): File {
  const contents = new Uint8Array(58);
  contents.set(pngHeader(firstWidth, firstHeight));
  writeUint32Be(contents, 33, 13);
  writeAscii(contents, 37, "IHDR");
  writeUint32Be(contents, 41, secondWidth);
  writeUint32Be(contents, 45, secondHeight);
  return new File([contents], "decoy.png", { type: "image/png" });
}

function jpegFile(width: number, height: number): File {
  return jpegFileWithFrames([[width, height]]);
}

function jpegFileWithFrames(dimensions: readonly (readonly [number, number])[]): File {
  const contents = new Uint8Array(2 + dimensions.length * 13 + 12);
  contents.set([0xff, 0xd8]);
  let offset = 2;
  for (const [width, height] of dimensions) {
    contents.set([0xff, 0xc0, 0x00, 0x0b, 0x08], offset);
    writeUint16Be(contents, offset + 5, height);
    writeUint16Be(contents, offset + 7, width);
    contents.set([0x01, 0x01, 0x11, 0x00], offset + 9);
    offset += 13;
  }
  contents.set([
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0xff, 0xd9,
  ], offset);
  return new File([contents], "local.jpg", { type: "image/jpeg" });
}

function webpFile(width: number, height: number): File {
  const contents = new Uint8Array(48);
  writeAscii(contents, 0, "RIFF");
  writeUint32Le(contents, 4, contents.byteLength - 8);
  writeAscii(contents, 8, "WEBP");
  writeAscii(contents, 12, "VP8X");
  writeUint32Le(contents, 16, 10);
  writeUint24Le(contents, 24, width - 1);
  writeUint24Le(contents, 27, height - 1);
  writeAscii(contents, 30, "VP8 ");
  writeUint32Le(contents, 34, 10);
  contents.set([0, 0, 0, 0x9d, 0x01, 0x2a], 38);
  writeUint16Le(contents, 44, width);
  writeUint16Le(contents, 46, height);
  return new File([contents], "local.webp", { type: "image/webp" });
}

function webpNestedFrameFile(
  canvasWidth: number,
  canvasHeight: number,
  payloadWidth: number,
  payloadHeight: number,
  frameX = 0,
  frameY = 0,
): File {
  const contents = new Uint8Array(72);
  writeAscii(contents, 0, "RIFF");
  writeUint32Le(contents, 4, contents.byteLength - 8);
  writeAscii(contents, 8, "WEBP");
  writeAscii(contents, 12, "VP8X");
  writeUint32Le(contents, 16, 10);
  writeUint24Le(contents, 24, canvasWidth - 1);
  writeUint24Le(contents, 27, canvasHeight - 1);
  writeAscii(contents, 30, "ANMF");
  writeUint32Le(contents, 34, 34);
  writeUint24Le(contents, 38, frameX / 2);
  writeUint24Le(contents, 41, frameY / 2);
  // Keep the frame rectangle small; the nested VP8 payload is the concealed oversized surface.
  writeAscii(contents, 54, "VP8 ");
  writeUint32Le(contents, 58, 10);
  contents.set([0, 0, 0, 0x9d, 0x01, 0x2a], 62);
  writeUint16Le(contents, 68, payloadWidth);
  writeUint16Le(contents, 70, payloadHeight);
  return new File([contents], "animated.webp", { type: "image/webp" });
}

function webpManyFramesFile(width: number, height: number, frameCount: number): File {
  const contents = new Uint8Array(30 + frameCount * 42);
  writeAscii(contents, 0, "RIFF");
  writeUint32Le(contents, 4, contents.byteLength - 8);
  writeAscii(contents, 8, "WEBP");
  writeAscii(contents, 12, "VP8X");
  writeUint32Le(contents, 16, 10);
  contents[20] = 0x02;
  writeUint24Le(contents, 24, width - 1);
  writeUint24Le(contents, 27, height - 1);
  for (let index = 0; index < frameCount; index += 1) {
    const offset = 30 + index * 42;
    writeAscii(contents, offset, "ANMF");
    writeUint32Le(contents, offset + 4, 34);
    writeAscii(contents, offset + 24, "VP8 ");
    writeUint32Le(contents, offset + 28, 10);
    contents.set([0, 0, 0, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00], offset + 32);
  }
  return new File([contents], "many-frames.webp", { type: "image/webp" });
}

function writeAscii(target: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    target[offset + index] = value.charCodeAt(index);
  }
}

function writeUint16Be(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 8) & 0xff;
  target[offset + 1] = value & 0xff;
}

function writeUint16Le(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint24Le(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
}

function writeUint32Be(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function writeUint32Le(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function installImagePreparationHarness(
  width: number,
  height: number,
  encodedBlobs: readonly Blob[],
) {
  const close = vi.fn();
  const bitmap = { width, height, close } as unknown as ImageBitmap;
  vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));

  const drawImage = vi.fn();
  const context = {
    drawImage,
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  let encodeIndex = 0;
  const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
    const blob = encodedBlobs[Math.min(encodeIndex, encodedBlobs.length - 1)] ?? null;
    encodeIndex += 1;
    callback(blob);
  });
  return { bitmap, close, context, drawImage, toBlob };
}
