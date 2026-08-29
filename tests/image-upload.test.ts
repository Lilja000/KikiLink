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
    const realPng = new File(
      [bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
      "private-name.png",
      { type: "image/png" },
    );
    const disguisedText = new File(["not an image"], "photo.png", { type: "image/png" });

    await expect(validateLocalImageFile(realPng)).resolves.toBeUndefined();
    await expect(validateLocalImageFile(disguisedText)).rejects.toThrow(
      "Use a real JPG, PNG, or WebP image",
    );
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

  it("retries one temporary Litterbox 500 response and succeeds without exposing HTML", async () => {
    let attempts = 0;
    const request = vi.fn<typeof fetch>(async () => {
      attempts += 1;
      return attempts === 1
        ? new Response(
            '<!doctype html><html><title>500 | Internal Server Error</title></html>',
            { status: 500 },
          )
        : new Response("https://litter.catbox.moe/recovered.webp\n", { status: 200 });
    });
    const uploader = new LitterboxImageUploader(request as typeof fetch);
    const image: PreparedLocalImage = {
      blob: new Blob([bytes(1, 2, 3)], { type: "image/webp" }),
      width: 2,
      height: 2,
      sourceBytes: 3,
    };

    await expect(uploader.upload(image, { retention: "24h" })).resolves.toBe(
      "https://litter.catbox.moe/recovered.webp",
    );
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("turns a repeated host-side HTML 500 into a short actionable error", async () => {
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
    expect(request).toHaveBeenCalledTimes(2);
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
      anonymous: true,
      timeout: 300_000,
    });
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
        anonymous: true,
        timeout: 300_000,
      });
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

function pngFile(name = "banner.png"): File {
  return new File(
    [bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
    name,
    { type: "image/png" },
  );
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
