import { normalizeImageUrl } from "./media";
import { uploadMultipartViaUserscriptBridge } from "../../userscript-upload-client";
import { KIKILINK_DISTRIBUTION } from "../../core/distribution";

export { supportsLongLivedCatboxUploads } from "../../core/distribution";

export const MAX_LOCAL_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_LOCAL_IMAGE_EDGE = 2_560;
export const MAX_LOCAL_IMAGE_PIXELS = 32_000_000;
export const PROFILE_BANNER_WIDTH = 1_200;
export const PROFILE_BANNER_HEIGHT = 400;
export const MAX_PROFILE_BANNER_BYTES = 2 * 1024 * 1024;
export const MAX_LOCAL_ROOM_AUDIO_BYTES = 20 * 1024 * 1024;
export const MAX_CATBOX_MUSIC_BYTES = 80 * 1024 * 1024;

const MAX_PREPARED_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_LOCAL_ANIMATION_FRAMES = 240;
const MAX_LOCAL_ANIMATION_PIXELS = 64 * 1024 * 1024;
const PROFILE_BANNER_WEBP_QUALITIES = [0.88, 0.76, 0.64, 0.52, 0.4] as const;
const IMAGE_UPLOAD_TIMEOUT_MS = 60_000;
const PROFILE_BANNER_UPLOAD_TIMEOUT_MS = 180_000;
export const MAX_UPLOAD_RESPONSE_BYTES = 4 * 1024;
const MAX_UPLOAD_RESPONSE_READS = 128;
const TEMPORARY_UPLOAD_STATUSES = new Set([500, 502, 503, 504]);
const LITTERBOX_UPLOAD_ENDPOINT =
  "https://litterbox.catbox.moe/resources/internals/api.php";
const CATBOX_UPLOAD_ENDPOINT =
  typeof __KIKILINK_DISTRIBUTION__ === "string" &&
    __KIKILINK_DISTRIBUTION__ === "fusam"
    ? ""
    : "https://catbox.moe/user/api.php";
const FUSAM_CATBOX_UPLOAD_ERROR =
  "Long-lived Catbox uploads are unavailable in FUSAM. Use a temporary upload or install KikiLink as a userscript.";
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
  upload(image: PreparedLocalImage, config: Config, signal?: AbortSignal): Promise<string>;
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

  async upload(
    image: PreparedLocalImage,
    config: LitterboxUploadConfig,
    signal?: AbortSignal,
  ): Promise<string> {
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
      undefined,
      signal,
    );
    if (!response.ok) {
      throw new Error(providerUploadError("Litterbox", response));
    }

    const directUrl = normalizeImageUrl(response.body.trim());
    if (!directUrl || !isExpectedLitterboxUrl(directUrl)) {
      throw new Error("The temporary image host returned an unexpected link");
    }
    return directUrl;
  }
}

/** Uploads a privacy-prepared image to Catbox's long-lived public storage. */
export async function uploadPreparedImageToCatbox(
  image: PreparedLocalImage,
  request?: typeof fetch,
  onProgress?: UploadProgressListener,
  signal?: AbortSignal,
): Promise<string> {
  // Keep this compile-time branch inside the exported entry point. The FUSAM UI does not expose
  // this action, and esbuild can now discard the endpoint, form construction, and privileged
  // userscript transport from the dedicated page-realm artifact altogether.
  if (
    typeof __KIKILINK_DISTRIBUTION__ === "string"
      ? __KIKILINK_DISTRIBUTION__ === "fusam"
      : KIKILINK_DISTRIBUTION === "fusam"
  ) {
    throw new Error(FUSAM_CATBOX_UPLOAD_ERROR);
  }
  validatePreparedImage(image);
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", preparedImageFile(image));
  const response = await uploadMultipart(
    CATBOX_UPLOAD_ENDPOINT,
    form,
    PROFILE_BANNER_UPLOAD_TIMEOUT_MS,
    request,
    onProgress,
    signal,
  );
  if (!response.ok) throw new Error(providerUploadError("Catbox", response));
  const directUrl = normalizeImageUrl(response.body.trim());
  if (!directUrl || !isExpectedCatboxImageUrl(directUrl)) {
    throw new Error("Catbox returned an unexpected image link");
  }
  return directUrl;
}

export async function uploadLocalRoomAudio(
  file: File,
  config: LitterboxUploadConfig,
  request?: typeof fetch,
  signal?: AbortSignal,
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
    undefined,
    signal,
  );
  if (!response.ok) {
    throw new Error(providerUploadError("Litterbox", response));
  }
  const url = normalizeLitterboxAudioUrl(response.body.trim());
  if (!url) throw new Error("The temporary audio host returned an unexpected link");
  return url;
}

/** Uploads an explicitly selected track to long-lived public Catbox storage. */
export async function uploadMusicToCatbox(
  file: File,
  request?: typeof fetch,
  onProgress?: UploadProgressListener,
  signal?: AbortSignal,
): Promise<string> {
  if (
    typeof __KIKILINK_DISTRIBUTION__ === "string"
      ? __KIKILINK_DISTRIBUTION__ === "fusam"
      : KIKILINK_DISTRIBUTION === "fusam"
  ) {
    throw new Error(FUSAM_CATBOX_UPLOAD_ERROR);
  }
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
    signal,
  );
  if (!response.ok) {
    throw new Error(providerUploadError("Catbox", response));
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

  async upload(
    image: PreparedLocalImage,
    config: CloudinaryUploadConfig,
    signal?: AbortSignal,
  ): Promise<string> {
    const normalizedConfig = normalizeCloudinaryUploadConfig(config);
    if (!normalizedConfig) throw new Error("Complete the local image upload setup first");
    validatePreparedImage(image);

    const form = new FormData();
    form.append("file", preparedImageFile(image));
    form.append("upload_preset", normalizedConfig.uploadPreset);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_UPLOAD_TIMEOUT_MS);
    const cancel = (): void => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });

    try {
      if (signal?.aborted) throw new DOMException("cancelled", "AbortError");
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
        throw new Error(signal?.aborted ? "The upload was cancelled" : "The image upload timed out");
      }
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
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

/**
 * Re-encodes a local image as an exact 3:1 profile banner without carrying source metadata.
 *
 * A successful result is always a WebP no larger than 2 MiB, which also keeps it comfortably
 * below the remote image loader's limit. The existing gallery preparation path intentionally
 * remains separate so banner cropping and its stricter byte budget cannot affect gallery images.
 */
export async function prepareProfileBanner(file: File): Promise<PreparedLocalImage> {
  await validateLocalImageFile(file);

  const decoded = await decodeLocalImage(file);
  try {
    if (
      !Number.isSafeInteger(decoded.width) ||
      !Number.isSafeInteger(decoded.height) ||
      decoded.width <= 0 ||
      decoded.height <= 0 ||
      decoded.width * decoded.height > MAX_LOCAL_IMAGE_PIXELS
    ) {
      throw new Error("This image has too many pixels to prepare safely");
    }

    const canvas = document.createElement("canvas");
    canvas.width = PROFILE_BANNER_WIDTH;
    canvas.height = PROFILE_BANNER_HEIGHT;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Your browser could not prepare this image");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const targetAspect = PROFILE_BANNER_WIDTH / PROFILE_BANNER_HEIGHT;
    const sourceAspect = decoded.width / decoded.height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = decoded.width;
    let sourceHeight = decoded.height;
    if (sourceAspect > targetAspect) {
      sourceWidth = decoded.height * targetAspect;
      sourceX = (decoded.width - sourceWidth) / 2;
    } else if (sourceAspect < targetAspect) {
      sourceHeight = decoded.width / targetAspect;
      sourceY = (decoded.height - sourceHeight) / 2;
    }

    context.drawImage(
      decoded.source,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      PROFILE_BANNER_WIDTH,
      PROFILE_BANNER_HEIGHT,
    );

    const blob = await canvasToWebpWithinLimit(canvas, MAX_PROFILE_BANNER_BYTES);
    return {
      blob,
      width: PROFILE_BANNER_WIDTH,
      height: PROFILE_BANNER_HEIGHT,
      sourceBytes: file.size,
    };
  } finally {
    decoded.dispose();
  }
}

export async function validateLocalImageFile(file: File): Promise<void> {
  if (file.size <= 0) throw new Error("Choose a non-empty image file");
  if (file.size > MAX_LOCAL_IMAGE_BYTES) throw new Error("Choose an image up to 10 MB");

  // Inspect declared dimensions before handing attacker-controlled bytes to a browser decoder.
  // Reading the bounded encoded file costs at most 10 MiB and avoids a compressed image with an
  // enormous canvas allocating far more memory inside createImageBitmap/Image first.
  const contents = await file.arrayBuffer();
  const detectedType = detectLocalImageType(contents);
  if (!detectedType) throw new Error("Use a real JPG, PNG, or WebP image");
  const declaredType = file.type.toLocaleLowerCase();
  if (
    declaredType &&
    declaredType !== detectedType &&
    !(detectedType === "image/png" && declaredType === "image/apng")
  ) {
    throw new Error("The file contents do not match its image type");
  }
  validateDeclaredLocalImageDimensions(new Uint8Array(contents), detectedType);
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

type LocalImageType = Exclude<ReturnType<typeof detectLocalImageType>, null>;

function validateDeclaredLocalImageDimensions(
  bytes: Uint8Array,
  type: LocalImageType,
): void {
  if (type === "image/png") {
    validatePngDimensions(bytes);
    return;
  }
  if (type === "image/jpeg") {
    validateJpegDimensions(bytes);
    return;
  }
  validateWebpDimensions(bytes);
}

function validatePngDimensions(bytes: Uint8Array): void {
  if (
    !hasByteRange(bytes, 8, 25) ||
    readUint32Be(bytes, 8) !== 13 ||
    readAscii(bytes, 12, 4) !== "IHDR"
  ) {
    throw localImageHeaderError();
  }
  const canvasWidth = readUint32Be(bytes, 16);
  const canvasHeight = readUint32Be(bytes, 20);
  assertSafeLocalDimensions(canvasWidth, canvasHeight);

  // APNG frame-control chunks can declare additional decoded surfaces. Walk the bounded chunk
  // envelope so a small canvas cannot conceal an oversized animated frame from the preflight.
  let offset = 8;
  let chunks = 0;
  let declaredAnimationFrames: number | undefined;
  let animationFrameHeaders = 0;
  while (offset < bytes.byteLength) {
    if (++chunks > 4_096 || !hasByteRange(bytes, offset, 12)) {
      throw localImageHeaderError();
    }
    const length = readUint32Be(bytes, offset);
    const dataStart = offset + 8;
    const chunkEnd = dataStart + length + 4;
    if (!Number.isSafeInteger(chunkEnd) || chunkEnd > bytes.byteLength) {
      throw localImageHeaderError();
    }
    const chunkType = readAscii(bytes, offset + 4, 4);
    if (offset === 8 && (chunkType !== "IHDR" || length !== 13)) {
      throw localImageHeaderError();
    }
    if (offset !== 8 && chunkType === "IHDR") throw localImageHeaderError();
    if (chunkType === "acTL") {
      if (length !== 8 || declaredAnimationFrames !== undefined) {
        throw localImageHeaderError();
      }
      declaredAnimationFrames = readUint32Be(bytes, dataStart);
      assertSafeLocalAnimation(
        declaredAnimationFrames,
        canvasWidth,
        canvasHeight,
      );
    } else if (chunkType === "fcTL") {
      if (declaredAnimationFrames === undefined) throw localImageHeaderError();
      if (length !== 26) throw localImageHeaderError();
      const width = readUint32Be(bytes, dataStart + 4);
      const height = readUint32Be(bytes, dataStart + 8);
      const x = readUint32Be(bytes, dataStart + 12);
      const y = readUint32Be(bytes, dataStart + 16);
      assertSafeLocalDimensions(width, height);
      if (
        x > canvasWidth ||
        y > canvasHeight ||
        width > canvasWidth - x ||
        height > canvasHeight - y
      ) {
        throw localImageHeaderError();
      }
      animationFrameHeaders += 1;
      if (animationFrameHeaders > declaredAnimationFrames) throw localImageHeaderError();
    }
    offset = chunkEnd;
  }
  if (
    declaredAnimationFrames !== undefined &&
    animationFrameHeaders !== declaredAnimationFrames
  ) {
    throw localImageHeaderError();
  }
}

function validateJpegDimensions(bytes: Uint8Array): void {
  if (!hasByteRange(bytes, 0, 4) || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw localImageHeaderError();
  }
  let offset = 2;
  let markers = 0;
  let sawFrame = false;
  let sawScan = false;
  let inEntropyData = false;
  while (offset < bytes.byteLength) {
    if (inEntropyData) {
      while (offset < bytes.byteLength) {
        if (bytes[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const markerStart = offset;
        while (offset < bytes.byteLength && bytes[offset] === 0xff) offset += 1;
        if (!hasByteRange(bytes, offset, 1)) throw localImageHeaderError();
        const entropyMarker = bytes[offset] ?? -1;
        if (entropyMarker === 0x00 || (entropyMarker >= 0xd0 && entropyMarker <= 0xd7)) {
          offset += 1;
          continue;
        }
        offset = markerStart;
        inEntropyData = false;
        break;
      }
      if (inEntropyData) break;
      continue;
    }
    if (++markers > 4_096 || bytes[offset] !== 0xff) throw localImageHeaderError();
    while (offset < bytes.byteLength && bytes[offset] === 0xff) offset += 1;
    if (!hasByteRange(bytes, offset, 1)) throw localImageHeaderError();
    const marker = bytes[offset] ?? -1;
    offset += 1;
    if (marker === 0xd9) {
      if (!sawFrame || !sawScan || offset !== bytes.byteLength) throw localImageHeaderError();
      return;
    }
    if (marker === 0x00 || marker === 0xd8) {
      throw localImageHeaderError();
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      throw localImageHeaderError();
    }
    if (!hasByteRange(bytes, offset, 2)) throw localImageHeaderError();
    const segmentLength = readUint16Be(bytes, offset);
    const segmentEnd = offset + segmentLength;
    if (segmentLength < 2 || segmentEnd > bytes.byteLength) throw localImageHeaderError();
    if (isJpegFrameMarker(marker)) {
      if (sawFrame || segmentLength < 8) throw localImageHeaderError();
      assertSafeLocalDimensions(
        readUint16Be(bytes, offset + 5),
        readUint16Be(bytes, offset + 3),
      );
      sawFrame = true;
    } else if (marker === 0xda) {
      const scanComponents = bytes[offset + 2] ?? 0;
      if (!sawFrame || scanComponents < 1 || segmentLength !== 6 + scanComponents * 2) {
        throw localImageHeaderError();
      }
      sawScan = true;
      inEntropyData = true;
    }
    offset = segmentEnd;
  }
  throw localImageHeaderError();
}

function isJpegFrameMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function validateWebpDimensions(bytes: Uint8Array): void {
  if (
    !hasByteRange(bytes, 0, 12) ||
    readAscii(bytes, 0, 4) !== "RIFF" ||
    readAscii(bytes, 8, 4) !== "WEBP" ||
    readUint32Le(bytes, 4) + 8 !== bytes.byteLength
  ) {
    throw localImageHeaderError();
  }

  let offset = 12;
  let chunks = 0;
  let sawDimensions = false;
  let canvas: { width: number; height: number } | undefined;
  let staticImages = 0;
  let animatedFrames = 0;
  while (offset < bytes.byteLength) {
    if (++chunks > 4_096 || !hasByteRange(bytes, offset, 8)) {
      throw localImageHeaderError();
    }
    const type = readAscii(bytes, offset, 4);
    const length = readUint32Le(bytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const next = dataEnd + (length & 1);
    if (!Number.isSafeInteger(next) || next > bytes.byteLength) throw localImageHeaderError();
    if (type === "VP8X") {
      if (offset !== 12 || canvas || length !== 10) throw localImageHeaderError();
      canvas = {
        width: readUint24Le(bytes, dataStart + 4) + 1,
        height: readUint24Le(bytes, dataStart + 7) + 1,
      };
      assertSafeLocalDimensions(canvas.width, canvas.height);
      sawDimensions = true;
    } else if (type === "VP8 ") {
      const dimensions = validateVp8Dimensions(bytes, dataStart, dataEnd);
      assertMatchingWebpDimensions(canvas, dimensions);
      staticImages += 1;
      if (staticImages > 1) throw localImageHeaderError();
      sawDimensions = true;
    } else if (type === "VP8L") {
      const dimensions = validateVp8lDimensions(bytes, dataStart, dataEnd);
      assertMatchingWebpDimensions(canvas, dimensions);
      staticImages += 1;
      if (staticImages > 1) throw localImageHeaderError();
      sawDimensions = true;
    } else if (type === "ANMF") {
      if (!canvas || length < 16) throw localImageHeaderError();
      const x = readUint24Le(bytes, dataStart) * 2;
      const y = readUint24Le(bytes, dataStart + 3) * 2;
      const frame = {
        width: readUint24Le(bytes, dataStart + 6) + 1,
        height: readUint24Le(bytes, dataStart + 9) + 1,
      };
      assertSafeLocalDimensions(frame.width, frame.height);
      if (
        x > canvas.width ||
        y > canvas.height ||
        frame.width > canvas.width - x ||
        frame.height > canvas.height - y
      ) {
        throw localImageHeaderError();
      }
      const payload = validateWebpFramePayloadDimensions(bytes, dataStart + 16, dataEnd);
      if (payload.width !== frame.width || payload.height !== frame.height) {
        throw localImageHeaderError();
      }
      animatedFrames += 1;
      assertSafeLocalAnimation(animatedFrames, canvas.width, canvas.height);
      sawDimensions = true;
    }
    offset = next;
  }
  if (
    !sawDimensions ||
    offset !== bytes.byteLength ||
    (animatedFrames > 0 ? staticImages !== 0 : staticImages !== 1)
  ) {
    throw localImageHeaderError();
  }
}

function validateWebpFramePayloadDimensions(
  bytes: Uint8Array,
  start: number,
  end: number,
): { width: number; height: number } {
  let offset = start;
  let chunks = 0;
  let dimensions: { width: number; height: number } | undefined;
  while (offset < end) {
    if (++chunks > 4_096 || offset > end - 8 || !hasByteRange(bytes, offset, 8)) {
      throw localImageHeaderError();
    }
    const type = readAscii(bytes, offset, 4);
    const length = readUint32Le(bytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const next = dataEnd + (length & 1);
    if (!Number.isSafeInteger(next) || next > end) throw localImageHeaderError();
    if (type === "VP8 ") {
      if (dimensions) throw localImageHeaderError();
      dimensions = validateVp8Dimensions(bytes, dataStart, dataEnd);
    } else if (type === "VP8L") {
      if (dimensions) throw localImageHeaderError();
      dimensions = validateVp8lDimensions(bytes, dataStart, dataEnd);
    }
    offset = next;
  }
  if (!dimensions || offset !== end) throw localImageHeaderError();
  return dimensions;
}

function validateVp8Dimensions(
  bytes: Uint8Array,
  start: number,
  end: number,
): { width: number; height: number } {
  if (
    start > end - 10 ||
    !hasByteRange(bytes, start, 10) ||
    bytes[start + 3] !== 0x9d ||
    bytes[start + 4] !== 0x01 ||
    bytes[start + 5] !== 0x2a
  ) {
    throw localImageHeaderError();
  }
  const dimensions = {
    width: readUint16Le(bytes, start + 6) & 0x3fff,
    height: readUint16Le(bytes, start + 8) & 0x3fff,
  };
  assertSafeLocalDimensions(dimensions.width, dimensions.height);
  return dimensions;
}

function validateVp8lDimensions(
  bytes: Uint8Array,
  start: number,
  end: number,
): { width: number; height: number } {
  if (start > end - 5 || !hasByteRange(bytes, start, 5) || bytes[start] !== 0x2f) {
    throw localImageHeaderError();
  }
  const packed = readUint32Le(bytes, start + 1);
  if ((packed >>> 29) !== 0) throw localImageHeaderError();
  const dimensions = {
    width: (packed & 0x3fff) + 1,
    height: ((packed >>> 14) & 0x3fff) + 1,
  };
  assertSafeLocalDimensions(dimensions.width, dimensions.height);
  return dimensions;
}

function assertMatchingWebpDimensions(
  canvas: { width: number; height: number } | undefined,
  payload: { width: number; height: number },
): void {
  if (canvas && (canvas.width !== payload.width || canvas.height !== payload.height)) {
    throw localImageHeaderError();
  }
}

function assertSafeLocalDimensions(width: number, height: number): void {
  const pixels = width * height;
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isSafeInteger(pixels) ||
    pixels > MAX_LOCAL_IMAGE_PIXELS
  ) {
    throw new Error("This image has too many pixels to prepare safely");
  }
}

function assertSafeLocalAnimation(frames: number, width: number, height: number): void {
  const compositedPixels = frames * width * height;
  if (
    !Number.isSafeInteger(frames) ||
    frames < 1 ||
    frames > MAX_LOCAL_ANIMATION_FRAMES ||
    !Number.isSafeInteger(compositedPixels) ||
    compositedPixels > MAX_LOCAL_ANIMATION_PIXELS
  ) {
    throw new Error("This animated image is too complex to prepare safely");
  }
}

function hasByteRange(bytes: Uint8Array, offset: number, length: number): boolean {
  return Number.isSafeInteger(offset) && Number.isSafeInteger(length) &&
    offset >= 0 && length >= 0 && offset <= bytes.byteLength - length;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  if (!hasByteRange(bytes, offset, length)) throw localImageHeaderError();
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(bytes[offset + index] ?? 0);
  }
  return value;
}

function readUint16Be(bytes: Uint8Array, offset: number): number {
  if (!hasByteRange(bytes, offset, 2)) throw localImageHeaderError();
  return (bytes[offset] ?? 0) * 0x100 + (bytes[offset + 1] ?? 0);
}

function readUint16Le(bytes: Uint8Array, offset: number): number {
  if (!hasByteRange(bytes, offset, 2)) throw localImageHeaderError();
  return (bytes[offset] ?? 0) + (bytes[offset + 1] ?? 0) * 0x100;
}

function readUint24Le(bytes: Uint8Array, offset: number): number {
  if (!hasByteRange(bytes, offset, 3)) throw localImageHeaderError();
  return (bytes[offset] ?? 0) +
    (bytes[offset + 1] ?? 0) * 0x100 +
    (bytes[offset + 2] ?? 0) * 0x1_0000;
}

function readUint32Be(bytes: Uint8Array, offset: number): number {
  if (!hasByteRange(bytes, offset, 4)) throw localImageHeaderError();
  return (bytes[offset] ?? 0) * 0x1_000000 +
    (bytes[offset + 1] ?? 0) * 0x1_0000 +
    (bytes[offset + 2] ?? 0) * 0x100 +
    (bytes[offset + 3] ?? 0);
}

function readUint32Le(bytes: Uint8Array, offset: number): number {
  if (!hasByteRange(bytes, offset, 4)) throw localImageHeaderError();
  return (bytes[offset] ?? 0) +
    (bytes[offset + 1] ?? 0) * 0x100 +
    (bytes[offset + 2] ?? 0) * 0x1_0000 +
    (bytes[offset + 3] ?? 0) * 0x1_000000;
}

function localImageHeaderError(): Error {
  return new Error("This image header could not be inspected safely");
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
  return canvasToWebpAtQuality(canvas, 0.88);
}

async function canvasToWebpWithinLimit(
  canvas: HTMLCanvasElement,
  maxBytes: number,
): Promise<Blob> {
  for (const quality of PROFILE_BANNER_WEBP_QUALITIES) {
    const blob = await canvasToWebpAtQuality(canvas, quality);
    if (blob.size <= 0) {
      throw new Error("Your browser could not create a privacy-safe WebP image");
    }
    if (blob.size <= maxBytes) return blob;
  }
  throw new Error("The privacy-prepared profile banner is still larger than 2 MB");
}

function canvasToWebpAtQuality(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
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
      quality,
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

function isExpectedCatboxImageUrl(value: string): boolean {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    url.hostname === "files.catbox.moe" &&
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
  signal?: AbortSignal,
): Promise<MultipartUploadResponse> {
  // Upload POSTs are not idempotent and neither provider accepts an idempotency key. Even a 5xx
  // can be returned after the public file was stored, so an automatic retry could create a second
  // untracked bearer URL. Leave retries to an explicit user action.
  return uploadMultipartOnce(
    endpoint,
    form,
    timeoutMs,
    request,
    onProgress,
    signal,
  );
}

async function uploadMultipartOnce(
  endpoint: string,
  form: FormData,
  timeoutMs: number,
  request?: typeof fetch,
  onProgress?: UploadProgressListener,
  signal?: AbortSignal,
): Promise<MultipartUploadResponse> {
  if (signal?.aborted) throw new Error("The upload was cancelled");
  if (
    typeof __KIKILINK_DISTRIBUTION__ === "string"
      ? __KIKILINK_DISTRIBUTION__ === "fusam"
      : KIKILINK_DISTRIBUTION === "fusam"
  ) {
    if (endpoint !== LITTERBOX_UPLOAD_ENDPOINT) {
      throw new Error(FUSAM_CATBOX_UPLOAD_ERROR);
    }
    const directRequest = currentFetch();
    if (!directRequest) {
      throw new Error("The temporary upload service is unavailable in this browser");
    }
    return uploadMultipartWithFetch(endpoint, form, timeoutMs, directRequest, signal);
  } else {
    if (request) return uploadMultipartWithFetch(endpoint, form, timeoutMs, request, signal);
    const bridged = await uploadMultipartViaUserscriptBridge(
      endpoint,
      form,
      timeoutMs,
      onProgress,
      signal,
    );
    if (bridged) return bridged;
    if (typeof GM_xmlhttpRequest === "function") {
      return uploadMultipartWithGmRequest(endpoint, form, timeoutMs, onProgress, signal);
    }
    throw new Error(
      "KikiLink's local upload service is unavailable on this page. Reload Bondage Club and try again.",
    );
  }
}

function uploadMultipartWithGmRequest(
  endpoint: string,
  form: FormData,
  timeoutMs: number,
  onProgress?: UploadProgressListener,
  signal?: AbortSignal,
): Promise<MultipartUploadResponse> {
  if (signal?.aborted) return Promise.reject(new Error("The upload was cancelled"));
  return new Promise((resolve, reject) => {
    let settled = false;
    let transport: { abort(): void } | undefined;
    let abortReason: "cancelled" | "timeout" | undefined;
    const finish = (run: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      signal?.removeEventListener("abort", handleAbort);
      run();
    };
    const abort = (reason: "cancelled" | "timeout"): void => {
      if (settled) return;
      abortReason = reason;
      try {
        transport?.abort();
      } finally {
        finish(() => reject(new Error(
          reason === "timeout" ? "The upload timed out" : "The upload was cancelled",
        )));
      }
    };
    const handleAbort = (): void => abort("cancelled");
    const watchdog = setTimeout(() => abort("timeout"), timeoutMs);
    signal?.addEventListener("abort", handleAbort, { once: true });
    try {
      const requestOptions: KikiLinkGmXhrDetails = {
        method: "POST",
        url: endpoint,
        data: form,
        ...(endpoint === CATBOX_UPLOAD_ENDPOINT ? {} : { anonymous: true }),
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
        onload: (response) => finish(() => resolve({
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          body: response.responseText ?? "",
        })),
        onerror: (response) => finish(() => reject(new Error(
          abortReason === "timeout"
            ? "The upload timed out"
            : abortReason === "cancelled"
              ? "The upload was cancelled"
              : response.status
                ? `Upload network request failed with HTTP ${response.status}`
                : "The upload host could not be reached",
        ))),
        onabort: () => finish(() => reject(new Error(
          abortReason === "timeout" ? "The upload timed out" : "The upload was cancelled",
        ))),
        ontimeout: () => finish(() => reject(new Error("The upload timed out"))),
      };
      transport = GM_xmlhttpRequest(requestOptions);
      if (signal?.aborted) abort("cancelled");
    } catch (error) {
      finish(() => reject(error instanceof Error
        ? error
        : new Error("The upload bridge could not prepare this file")));
    }
  });
}

async function uploadMultipartWithFetch(
  endpoint: string,
  form: FormData,
  timeoutMs: number,
  request: typeof fetch,
  signal?: AbortSignal,
): Promise<MultipartUploadResponse> {
  if (signal?.aborted) throw new Error("The upload was cancelled");
  const controller = new AbortController();
  let timedOut = false;
  const handleAbort = (): void => controller.abort();
  signal?.addEventListener("abort", handleAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await request(endpoint, {
      method: "POST",
      body: form,
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    const body = await readBoundedUploadResponse(response, controller.signal);
    if (timedOut) throw new Error("The upload timed out");
    if (signal?.aborted) throw new Error("The upload was cancelled");
    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch (error) {
    if (timedOut) throw new Error("The upload timed out");
    if (signal?.aborted) throw new Error("The upload was cancelled");
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The upload was cancelled");
    }
    if (error instanceof TypeError) {
      throw new Error("The upload was blocked by the browser network policy");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", handleAbort);
  }
}

function currentFetch(): typeof fetch | undefined {
  try {
    if (typeof globalThis.fetch !== "function") return undefined;
    return (input, init) => globalThis.fetch(input, init);
  } catch {
    return undefined;
  }
}

async function readBoundedUploadResponse(
  response: Response,
  signal: AbortSignal,
): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^\d+$/u.test(declaredLength) &&
    Number(declaredLength) > MAX_UPLOAD_RESPONSE_BYTES
  ) {
    await response.body?.cancel().catch(() => undefined);
    return "";
  }

  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  let reads = 0;
  let complete = false;
  const cancel = (): void => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });

  try {
    while (!signal.aborted && reads < MAX_UPLOAD_RESPONSE_READS) {
      reads += 1;
      const { done, value } = await reader.read();
      if (done) {
        complete = true;
        break;
      }
      if (!(value instanceof Uint8Array)) {
        await reader.cancel();
        return "";
      }
      total += value.byteLength;
      if (total > MAX_UPLOAD_RESPONSE_BYTES) {
        await reader.cancel();
        return "";
      }
      chunks.push(value);
    }
    if (signal.aborted || !complete) {
      await reader.cancel().catch(() => undefined);
      return "";
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    await reader.cancel().catch(() => undefined);
    return "";
  } finally {
    signal.removeEventListener("abort", cancel);
    try {
      reader.releaseLock();
    } catch {
      // The stream may already be detached after cancellation.
    }
  }
}

function cleanProviderError(value: string): string {
  if (/<(?:!doctype|html|head|body|meta|title)\b/iu.test(value)) return "";
  return value.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 180);
}

function providerUploadError(
  provider: "Catbox" | "Litterbox",
  response: MultipartUploadResponse,
): string {
  if (TEMPORARY_UPLOAD_STATUSES.has(response.status)) {
    return `${provider} is temporarily unavailable (HTTP ${response.status}). Try again in a moment.`;
  }
  return cleanProviderError(response.body) || `${provider} returned HTTP ${response.status}`;
}
