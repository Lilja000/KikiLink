// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CloudinaryImageUploader,
  detectLocalImageType,
  WaifuVaultImageUploader,
  normalizeCloudinaryUploadConfig,
  normalizeWaifuVaultUploadConfig,
  uploadRoomAudioToWaifuVault,
  uploadMusicToWaifuVault,
  validateLocalImageFile,
  type PreparedLocalImage,
} from "../src/modules/link-chat/image-upload";

afterEach(() => {
  Reflect.deleteProperty(globalThis, "GM_xmlhttpRequest");
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

  it("accepts only supported WaifuVault lifetimes", () => {
    expect(normalizeWaifuVaultUploadConfig({ retention: "1d" })).toEqual({ retention: "1d" });
    expect(normalizeWaifuVaultUploadConfig({ retention: "30d" })).toEqual({ retention: "30d" });
    expect(normalizeWaifuVaultUploadConfig({ retention: "12h" })).toBeNull();
    expect(normalizeWaifuVaultUploadConfig({ retention: 7 })).toBeNull();
  });

  it("uploads a prepared generic WebP to WaifuVault with an explicit retention", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response(waifuResponse("https://waifuvault.moe/f/abc_123.webp"), { status: 200 }),
    );
    const uploader = new WaifuVaultImageUploader(request as typeof fetch);
    const image: PreparedLocalImage = {
      blob: new Blob([bytes(1, 2, 3)], { type: "image/webp" }),
      width: 640,
      height: 480,
      sourceBytes: 1234,
    };

    await expect(uploader.upload(image, { retention: "7d" })).resolves.toBe(
      "https://waifuvault.moe/f/abc_123.webp",
    );

    expect(request).toHaveBeenCalledOnce();
    const [endpoint, options] = request.mock.calls[0] ?? [];
    expect(endpoint).toBe("https://waifuvault.moe/rest?expires=7d&hide_filename=true");
    expect(options).toMatchObject({
      method: "PUT",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    const form = options?.body as FormData;
    const uploaded = form.get("file");
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name).toBe("kikilink-image.webp");
    expect((uploaded as File).type).toBe("image/webp");
  });

  it("rejects WaifuVault responses outside the exact direct-file host and shape", async () => {
    const image: PreparedLocalImage = {
      blob: new Blob([bytes(1)], { type: "image/webp" }),
      width: 1,
      height: 1,
      sourceBytes: 1,
    };

    for (const responseBody of [
      waifuResponse("https://evil.example/f/photo.webp"),
      waifuResponse("https://waifuvault.moe/f/photo.png"),
      waifuResponse("https://waifuvault.moe/f/photo.webp?tracking=1"),
      JSON.stringify({ url: "https://waifuvault.moe/f/photo.webp" }),
      "not json",
    ]) {
      const uploader = new WaifuVaultImageUploader(
        vi.fn<typeof fetch>(async () => new Response(responseBody, { status: 200 })) as typeof fetch,
      );
      await expect(uploader.upload(image, { retention: "3d" })).rejects.toThrow(
        "unexpected link",
      );
    }
  });

  it("uploads renamed room music to an exact temporary audio URL", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response(waifuResponse("https://waifuvault.moe/f/room_song.mp3"), { status: 200 }),
    );
    const file = new File([bytes(1, 2, 3)], "private-scene-name.mp3", {
      type: "audio/mpeg",
    });

    await expect(uploadRoomAudioToWaifuVault(file, { retention: "30d" }, request)).resolves.toBe(
      "https://waifuvault.moe/f/room_song.mp3",
    );
    const form = request.mock.calls[0]?.[1]?.body as FormData;
    const uploaded = form.get("file") as File;
    expect(uploaded.name).toBe("kikilink-room-music.mp3");
    expect(request.mock.calls[0]?.[0]).toBe(
      "https://waifuvault.moe/rest?expires=30d&hide_filename=true",
    );
  });

  it("matches Bondage Club's MP3/MP4 room-music allowlist", async () => {
    const request = vi.fn<typeof fetch>();
    await expect(
      uploadRoomAudioToWaifuVault(
        new File([bytes(1, 2, 3)], "unsupported.ogg", { type: "audio/ogg" }),
        { retention: "1d" },
        request as typeof fetch,
      ),
    ).rejects.toThrow("MP3 or MP4");
    expect(request).not.toHaveBeenCalled();
  });

  it("uploads a generically named expiring playlist track to WaifuVault", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      new Response(waifuResponse("https://waifuvault.moe/f/track_123.ogg"), { status: 200 }),
    );
    const file = new File([bytes(1, 2, 3)], "private title.ogg", { type: "audio/ogg" });

    await expect(uploadMusicToWaifuVault(file, { retention: "7d" }, request)).resolves.toBe(
      "https://waifuvault.moe/f/track_123.ogg",
    );
    expect(request.mock.calls[0]?.[0]).toBe(
      "https://waifuvault.moe/rest?expires=7d&hide_filename=true",
    );
    const form = request.mock.calls[0]?.[1]?.body as FormData;
    expect((form.get("file") as File).name).toBe("kikilink-track.ogg");
  });

  it("uses Tampermonkey's background request for WaifuVault and reports upload progress", async () => {
    const progress = vi.fn();
    let details: KikiLinkGmXhrDetails | undefined;
    globalThis.GM_xmlhttpRequest = vi.fn((requestDetails: KikiLinkGmXhrDetails) => {
      details = requestDetails;
      queueMicrotask(() => {
        requestDetails.onprogress?.({ loaded: 50, total: 100, lengthComputable: true });
        requestDetails.onload({
          status: 200,
          responseText: waifuResponse("https://waifuvault.moe/f/firefox_track.mp3"),
        });
      });
      return { abort: vi.fn() };
    });
    const file = new File([bytes(1, 2, 3)], "private title.mp3", { type: "audio/mpeg" });

    await expect(uploadMusicToWaifuVault(file, { retention: "3d" }, undefined, progress)).resolves.toBe(
      "https://waifuvault.moe/f/firefox_track.mp3",
    );
    expect(details).toMatchObject({
      method: "PUT",
      url: "https://waifuvault.moe/rest?expires=3d&hide_filename=true",
      anonymous: true,
      timeout: 300_000,
    });
    expect((details?.data as FormData).get("file")).toBeInstanceOf(File);
    expect(progress).toHaveBeenCalledWith({ loaded: 50, total: 100, percent: 50 });
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

function waifuResponse(url: string): string {
  return JSON.stringify({
    url,
    token: "delete-token",
    retentionPeriod: Date.now() + 86_400_000,
    options: { protected: false, oneTimeDownload: false, hideFilename: true },
  });
}
