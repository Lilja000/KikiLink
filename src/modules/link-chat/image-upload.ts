import { normalizeImageUrl } from "./media";

export const MAX_LOCAL_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_LOCAL_IMAGE_EDGE = 2_560;
export const MAX_LOCAL_IMAGE_PIXELS = 32_000_000;
export const MAX_LOCAL_ROOM_AUDIO_BYTES = 20 * 1024 * 1024;
export const MAX_CATBOX_MUSIC_BYTES = 80 * 1024 * 1024;

const MAX_PREPARED_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_UPLOAD_TIMEOUT_MS = 60_000;
const LITTERBOX_UPLOAD_ENDPOINT =
  "https://litterbox.catbox.moe/resources/internals/api.php";
const CATBOX_UPLOAD_ENDPOINT = "https://catbox.moe/user/api.php";
const CLOUD_NAME_PATTERN = /^[a-z0-9_-]{1,64}$/iu;
const UPLOAD_PRESET_PATTERN = /^[a-z0-9_-]{1,128}$/iu;

export interface UploadProgress {
  loaded: number;
  total?: number;
  percent?: number;
}

type UploadProgressListener = (progress: UploadProgress) => void;

interface MultipartUploadResponse {
  ok: boolean;
  status: number;
  body: string;
}

export type LitterboxRetention = "1h" | "12h" | "24h" | "72h";

export interface LitterboxUploadConfig {
  retention: LitterboxRetention;
}

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

export interface LocalImageUploader<Config = LitterboxUploadConfig> {
  prepare(file: File): Promise<PreparedLocalImage>;
  upload(image: PreparedLocalImage, config: Config): Promise<string>;
}

interface CloudinaryUploadResponse {
  secure_url?: unknown;
  error?: { message?: unknown };
}

/**
 * A zero-account temporary uploader backed by Litterbox.
 *
 * File selection and preparation remain fully local. The prepared, generically named WebP is sent
 * only when `upload` is called explicitly.
 */
export class LitterboxImageUploader implements LocalImageUploader<LitterboxUploadConfig> {
  constructor(private readonly request?: typeof fetch) {}

  prepare(file: File): Promise<PreparedLocalImage> {
    return prepareLocalImage(file);
  }

  async upload(image: PreparedLocalImage, config: LitterboxUploadConfig): Promise<string> {
    const normalizedConfig = normalizeLitterboxUploadConfig(config);
    if (!normalizedConfig) throw new Error("Choose a valid temporary image lifetime");
    validatePreparedImage(image);

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("time", normalizedConfig.retention);
    form.append("fileToUpload", preparedImageFile(image));
    const response = await uploadMultipart(
      LITTERBOX_UPLOAD_ENDPOINT,
      form,
      IMAGE_UPLOAD_TIMEOUT_MS,
      this.request,
    );
    if (!response.ok) {
      throw new Error(cleanProviderError(response.body) || `Image host returned HTTP ${response.status}`);
    }

    const directUrl = normalizeImageUrl(response.body.trim());
    if (!directUrl || !isExpectedLitterboxUrl(directUrl)) {
      throw new Error("The temporary image host returned an unexpected link");
    }
    return directUrl;
  }
}

export async function uploadLocalRoomAudio(
  file: File,
  config: LitterboxUploadConfig,
  request?: typeof fetch,
): Promise<string> {
  const normalizedConfig = normalizeLitterboxUploadConfig(config);
  if (!normalizedConfig) throw new Error("Choose a valid temporary music lifetime");
  if (file.size <= 0) throw new Error("Choose a non-empty audio file");
  if (file.size > MAX_LOCAL_ROOM_AUDIO_BYTES) throw new Error("Choose room music up to 20 MB");
  const extension = roomAudioExtension(file);
  if (!extension) throw new Error("Bondage Club room music must be an MP3 or MP4 file");

  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("time", normalizedConfig.retention);
  form.append(
    "fileToUpload",
    new File([file], `kikilink-room-music.${extension}`, {
      type: file.type || `audio/${extension}`,
      lastModified: 0,
    }),
  );
  const response = await uploadMultipart(
    LITTERBOX_UPLOAD_ENDPOINT,
    form,
    IMAGE_UPLOAD_TIMEOUT_MS,
    request,
  );
  if (!response.ok) {
    throw new Error(cleanProviderError(response.body) || `Audio host returned HTTP ${response.status}`);
  }
  const url = normalizeLitterboxAudioUrl(response.body.trim());
  if (!url) throw new Error("The temporary audio host returned an unexpected link");
  return url;
}

/** Uploads an explicitly selected track to permanent, public Catbox storage. */
export async function uploadMusicToCatbox(
  file: File,
  request?: typeof fetch,
  onProgress?: UploadProgressListener,
): Promise<string> {
  if (file.size <= 0) throw new Error("Choose a non-empty audio file");
  if (file.size > MAX_CATBOX_MUSIC_BYTES) throw new Error("Choose a track up to 80 MB");
  const extension = playlistAudioExtension(file);
  if (!extension) throw new Error("Choose an MP3, MP4, M4A, OGG, WAV, FLAC, AAC, or WebM track");

  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append(
    "fileToUpload",
    new File([file], `kikilink-track.${extension}`, {
      type: file.type || "application/octet-stream",
      lastModified: 0,
    }),
  );
  const response = await uploadMultipart(
    CATBOX_UPLOAD_ENDPOINT,
    form,
    300_000,
    request,
    onProgress,
  );
  if (!response.ok) {
    throw new Error(cleanProviderError(response.body) || `Audio host returned HTTP ${response.status}`);
  }
  const url = normalizeCatboxAudioUrl(response.body.trim());
  if (!url) throw new Error("Catbox returned an unexpected track link");
  return url;
}

export class CloudinaryImageUploader implements LocalImageUploader<CloudinaryUploadConfig> {
  constructor(private readonly request: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  prepare(file: File): Promise<PreparedLocalImage> {
    return prepareLocalImage(file);
  }

  async upload(image: PreparedLocalImage, config: CloudinaryUploadConfig): Promise<string> {
    const normalizedConfig = normalizeCloudinaryUploadConfig(config);
    if (!normalizedConfig) throw new Error("Complete the local image upload setup first");
    validatePreparedImage(image);

    const form = new FormData();
    form.append("file", preparedImageFile(image));
    form.append("upload_preset", normalizedConfig.uploadPreset);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_UPLOAD_TIMEOUT_MS);

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

export function normalizeLitterboxUploadConfig(value: unknown): LitterboxUploadConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const retention = (value as Record<string, unknown>).retention;
  return retention === "1h" ||
    retention === "12h" ||
    retention === "24h" ||
    retention === "72h"
    ? { retention }
    : null;
}

export async function prepareLocalImage(file: File): Promise<PreparedLocalImage> {
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

function isExpectedLitterboxUrl(value: string): boolean {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    url.hostname === "litter.catbox.moe" &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    /^\/[a-z0-9_-]+\.webp$/iu.test(url.pathname)
  );
}

function normalizeLitterboxAudioUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "litter.catbox.moe" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/[a-z0-9_-]+\.(?:mp3|mp4)$/iu.test(url.pathname)
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function roomAudioExtension(file: File): string | undefined {
  const named = file.name.toLocaleLowerCase().match(/\.([a-z0-9]+)$/u)?.[1];
  if (named && /^(?:mp3|mp4)$/u.test(named)) return named;
  const mime = file.type.toLocaleLowerCase().split(";", 1)[0];
  const byMime: Record<string, string> = {
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "video/mp4": "mp4",
  };
  return mime ? byMime[mime] : undefined;
}

function playlistAudioExtension(file: File): string | undefined {
  const named = file.name.toLocaleLowerCase().match(/\.(aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/u)?.[1];
  if (named) return named;
  const mime = file.type.toLocaleLowerCase().split(";", 1)[0];
  const byMime: Record<string, string> = {
    "audio/aac": "aac",
    "audio/flac": "flac",
    "audio/mp4": "m4a",
    "video/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
  };
  return mime ? byMime[mime] : undefined;
}

function normalizeCatboxAudioUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "files.catbox.moe" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/[a-z0-9_-]+\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(url.pathname)
    ) {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}

function validatePreparedImage(image: PreparedLocalImage): void {
  if (
    image.blob.type !== "image/webp" ||
    image.blob.size <= 0 ||
    image.blob.size > MAX_PREPARED_IMAGE_BYTES ||
    !Number.isSafeInteger(image.width) ||
    image.width <= 0 ||
    !Number.isSafeInteger(image.height) ||
    image.height <= 0
  ) {
    throw new Error("The prepared image is invalid");
  }
}

function preparedImageFile(image: PreparedLocalImage): File {
  return new File([image.blob], "kikilink-image.webp", {
    type: "image/webp",
    lastModified: 0,
  });
}

async function uploadMultipart(
  endpoint: string,
  form: FormData,
  timeoutMs: number,
  request?: typeof fetch,
  onProgress?: UploadProgressListener,
): Promise<MultipartUploadResponse> {
  if (request) return uploadMultipartWithFetch(endpoint, form, timeoutMs, request);
  if (typeof GM_xmlhttpRequest === "function") {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: endpoint,
        data: form,
        anonymous: true,
        timeout: timeoutMs,
        onprogress: (event) => {
          const loaded = Number.isFinite(event.loaded) ? Math.max(0, event.loaded) : 0;
          const total = Number.isFinite(event.total) && (event.total ?? 0) > 0
            ? event.total
            : undefined;
          onProgress?.({
            loaded,
            ...(total === undefined
              ? {}
              : { total, percent: Math.min(100, Math.round((loaded / total) * 100)) }),
          });
        },
        onload: (response) => resolve({
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          body: response.responseText ?? "",
        }),
        onerror: (response) => reject(
          new Error(response.status
            ? `Upload network request failed with HTTP ${response.status}`
            : "The upload host could not be reached"),
        ),
        onabort: () => reject(new Error("The upload was cancelled")),
        ontimeout: () => reject(new Error("The upload timed out")),
      });
    });
  }
  return uploadMultipartWithFetch(endpoint, form, timeoutMs, globalThis.fetch.bind(globalThis));
}

async function uploadMultipartWithFetch(
  endpoint: string,
  form: FormData,
  timeoutMs: number,
  request: typeof fetch,
): Promise<MultipartUploadResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await request(endpoint, {
      method: "POST",
      body: form,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text().catch(() => ""),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The upload timed out");
    }
    if (error instanceof TypeError) {
      throw new Error("The upload was blocked by the browser network policy");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function cleanProviderError(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 180);
}
