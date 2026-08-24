// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import {
  CloudinaryImageUploader,
  detectLocalImageType,
  normalizeCloudinaryUploadConfig,
  validateLocalImageFile,
  type PreparedLocalImage,
} from "../src/modules/link-chat/image-upload";

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
