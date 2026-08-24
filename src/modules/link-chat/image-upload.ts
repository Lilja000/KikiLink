import { normalizeImageUrl } from "./media";

export const MAX_LOCAL_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_LOCAL_IMAGE_EDGE = 2_560;
export const MAX_LOCAL_IMAGE_PIXELS = 32_000_000;

const MAX_PREPARED_IMAGE_BYTES = 8 * 1024 * 1024;
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 60_000;
const CLOUD_NAME_PATTERN = /^[a-z0-9_-]{1,64}$/iu;
const UPLOAD_PRESET_PATTERN = /^[a-z0-9_-]{1,128}$/iu;

export interface CloudinaryUploadConfig {
  cloudName: string;
  uploadPreset: string;
}

export interface PreparedLocalImage {
  blob: Blob;
  width: number;
  height: number;
  sourceBytes: number;
}

export interface LocalImageUploader {
  prepare(file: File): Promise<PreparedLocalImage>;
  upload(image: PreparedLocalImage, config: CloudinaryUploadConfig): Promise<string>;
}

interface CloudinaryUploadResponse {
  secure_url?: unknown;
  error?: { message?: unknown };
}

export class CloudinaryImageUploader implements LocalImageUploader {
  constructor(private readonly request: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  async prepare(file: File): Promise<PreparedLocalImage> {
    await validateLocalImageFile(file);

    const decoded = await decodeLocalImage(file);
    try {
      if (
        decoded.width <= 0 ||
        decoded.height <= 0 ||
        decoded.width * decoded.height > MAX_LOCAL_IMAGE_PIXELS
      ) {
        throw new Error("This image has too many pixels to prepare safely");
      }

      const scale = Math.min(1, MAX_LOCAL_IMAGE_EDGE / Math.max(decoded.width, decoded.height));
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Your browser could not prepare this image");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded.source, 0, 0, width, height);

      const blob = await canvasToWebp(canvas);
      if (blob.size > MAX_PREPARED_IMAGE_BYTES) {
        throw new Error("The privacy-prepared image is still larger than 8 MB");
      }
      return { blob, width, height, sourceBytes: file.size };
    } finally {
      decoded.dispose();
    }
  }

  async upload(image: PreparedLocalImage, config: CloudinaryUploadConfig): Promise<string> {
    const normalizedConfig = normalizeCloudinaryUploadConfig(config);
    if (!normalizedConfig) throw new Error("Complete the local image upload setup first");
    if (image.blob.type !== "image/webp" || image.blob.size <= 0) {
      throw new Error("The prepared image is invalid");
    }

    const form = new FormData();
    form.append(
      "file",
      new File([image.blob], "kikilink-image.webp", {
        type: "image/webp",
        lastModified: 0,
      }),
    );
    form.append("upload_preset", normalizedConfig.uploadPreset);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLOUDINARY_UPLOAD_TIMEOUT_MS);

    try {
      const response = await this.request(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(normalizedConfig.cloudName)}/image/upload`,
        {
          method: "POST",
          body: form,
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        },
      );
      const payload = (await response.json().catch(() => ({}))) as CloudinaryUploadResponse;
      if (!response.ok) {
        const providerMessage =
          typeof payload.error?.message === "string" ? payload.error.message : undefined;
        throw new Error(providerMessage ?? `Image host returned HTTP ${response.status}`);
      }

      const directUrl =
        typeof payload.secure_url === "string" ? normalizeImageUrl(payload.secure_url) : null;
      if (!directUrl || !isExpectedCloudinaryUrl(directUrl, normalizedConfig.cloudName)) {
        throw new Error("The image host returned an unexpected link");
      }
      return directUrl;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("The image upload timed out");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function normalizeCloudinaryUploadConfig(value: unknown): CloudinaryUploadConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const cloudName = typeof source.cloudName === "string" ? source.cloudName.trim() : "";
  const uploadPreset =
    typeof source.uploadPreset === "string" ? source.uploadPreset.trim() : "";
  if (!CLOUD_NAME_PATTERN.test(cloudName) || !UPLOAD_PRESET_PATTERN.test(uploadPreset)) {
    return null;
  }
  return { cloudName, uploadPreset };
}

export async function validateLocalImageFile(file: File): Promise<void> {
  if (file.size <= 0) throw new Error("Choose a non-empty image file");
  if (file.size > MAX_LOCAL_IMAGE_BYTES) throw new Error("Choose an image up to 10 MB");

  const detectedType = detectLocalImageType(await file.slice(0, 16).arrayBuffer());
  if (!detectedType) throw new Error("Use a real JPG, PNG, or WebP image");
  if (file.type && file.type.toLocaleLowerCase() !== detectedType) {
    throw new Error("The file contents do not match its image type");
  }
}

export function detectLocalImageType(header: ArrayBuffer): "image/jpeg" | "image/png" | "image/webp" | null {
  const bytes = new Uint8Array(header);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function decodeLocalImage(
  file: File,
): Promise<{ source: CanvasImageSource; width: number; height: number; dispose: () => void }> {
  if (typeof globalThis.createImageBitmap === "function") {
    const bitmap = await globalThis.createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => reject(new Error("This image could not be decoded")), {
        once: true,
      });
      image.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== "image/webp") {
          reject(new Error("Your browser could not create a privacy-safe WebP image"));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      0.88,
    );
  });
}

function isExpectedCloudinaryUrl(value: string, cloudName: string): boolean {
  const url = new URL(value);
  return (
    url.hostname === "res.cloudinary.com" &&
    url.pathname.startsWith(`/${cloudName}/image/upload/`)
  );
}
