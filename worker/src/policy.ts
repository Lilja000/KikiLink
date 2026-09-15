export const CATBOX_ENDPOINT = "https://catbox.moe/user/api.php";
export const SESSION_TTL_MS = 10 * 60_000;
export const SESSION_MAX_ATTEMPTS = 12;
export const SESSION_MAX_BYTES = 160 * 1024 * 1024;
export const SESSION_MAX_CONCURRENT = 2;
export const LEASE_TTL_MS = 6 * 60_000;
export const MAX_CATBOX_RESPONSE_BYTES = 4 * 1024;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
export const STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const AUDIO_MAX_BYTES = 80 * 1024 * 1024;
const HOST_FAMILIES = [
  "bondageprojects.elementfx.com",
  "bondageprojects.com",
  "bondage-europe.com",
  "bondageeurope.com",
  "bondage-asia.com",
] as const;

const AUDIO_MIME_TYPES = {
  aac: ["audio/aac", "audio/x-aac"],
  flac: ["audio/flac", "audio/x-flac"],
  m4a: ["audio/mp4", "audio/x-m4a", "application/mp4"],
  mp3: ["audio/mpeg", "audio/mp3"],
  mp4: ["audio/mp4", "video/mp4", "application/mp4"],
  oga: ["audio/ogg", "application/ogg"],
  ogg: ["audio/ogg", "application/ogg"],
  opus: ["audio/ogg", "audio/opus", "application/ogg"],
  wav: ["audio/wav", "audio/wave", "audio/x-wav"],
  webm: ["audio/webm"],
} as const;

export type AudioExtension = keyof typeof AUDIO_MIME_TYPES;
export type UploadExtension = "webp" | AudioExtension;

export interface UploadDescriptor {
  readonly kind: "image" | "audio";
  readonly extension: UploadExtension;
  readonly mime: string;
  readonly bytes: number;
  readonly filename: string;
}

export type PolicyResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly status: number; readonly error: string };

export function normalizeBondageClubOrigin(value: string | null): string | null {
  if (!value || value === "null") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.origin !== value ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }
    const hostname = url.hostname.toLocaleLowerCase();
    if (!HOST_FAMILIES.some((family) => hostname.endsWith(`.${family}`))) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function parseUploadDescriptor(headers: Headers): PolicyResult<UploadDescriptor> {
  if (headers.has("content-encoding")) {
    return policyError(400, "Compressed request bodies are not accepted");
  }
  const rawLength = headers.get("content-length");
  if (!rawLength || !/^[1-9][0-9]{0,8}$/u.test(rawLength)) {
    return policyError(411, "A valid Content-Length header is required");
  }
  const bytes = Number(rawLength);
  if (!Number.isSafeInteger(bytes)) {
    return policyError(400, "The declared file size is invalid");
  }

  const kind = headers.get("x-kikilink-upload-kind");
  const extension = headers.get("x-kikilink-file-extension")?.toLocaleLowerCase() ?? "";
  const rawMime = headers.get("content-type") ?? "";
  const mime = rawMime.toLocaleLowerCase();
  if (!mime || mime !== rawMime || mime.includes(";")) {
    return policyError(415, "The file MIME type is invalid");
  }

  if (kind === "image") {
    if (extension !== "webp" || mime !== "image/webp") {
      return policyError(415, "Only prepared WebP images are accepted");
    }
    if (bytes < 12 || bytes > IMAGE_MAX_BYTES) {
      return policyError(413, "The prepared image size is invalid");
    }
    return {
      ok: true,
      value: { kind, extension, mime, bytes, filename: "kikilink-image.webp" },
    };
  }

  if (kind !== "audio" || !isAudioExtension(extension)) {
    return policyError(415, "The track type is not accepted");
  }
  const acceptedMimes = AUDIO_MIME_TYPES[extension] as readonly string[];
  if (!acceptedMimes.includes(mime)) {
    return policyError(415, "The track MIME type does not match its extension");
  }
  if (bytes < minimumMagicBytes(extension) || bytes > AUDIO_MAX_BYTES) {
    return policyError(413, "The track size is invalid");
  }
  return {
    ok: true,
    value: {
      kind,
      extension,
      mime,
      bytes,
      filename: `kikilink-track.${extension}`,
    },
  };
}

export function hasExpectedMagic(bytes: Uint8Array, extension: UploadExtension): boolean {
  switch (extension) {
    case "webp":
      return asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WEBP");
    case "aac":
      return (
        asciiAt(bytes, 0, "ADIF") ||
        asciiAt(bytes, 0, "ID3") ||
        (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1]! & 0xf6) === 0xf0)
      );
    case "flac":
      return asciiAt(bytes, 0, "fLaC");
    case "m4a":
    case "mp4":
      return asciiAt(bytes, 4, "ftyp");
    case "mp3":
      return asciiAt(bytes, 0, "ID3") || isMpegAudioFrame(bytes);
    case "oga":
    case "ogg":
      return asciiAt(bytes, 0, "OggS");
    case "opus":
      return asciiAt(bytes, 0, "OggS") && includesAscii(bytes, "OpusHead");
    case "wav":
      return asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WAVE");
    case "webm":
      return (
        bytes.length >= 4 &&
        bytes[0] === 0x1a &&
        bytes[1] === 0x45 &&
        bytes[2] === 0xdf &&
        bytes[3] === 0xa3
      );
  }
}

export function normalizeCatboxResponse(
  value: string,
  expectedExtension: UploadExtension,
): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_CATBOX_RESPONSE_BYTES) return null;
  try {
    const url = new URL(trimmed);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "files.catbox.moe" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !new RegExp(`^/[a-z0-9_-]+\\.${expectedExtension}$`, "iu").test(url.pathname)
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export function createMultipartPreamble(
  boundary: string,
  descriptor: UploadDescriptor,
): Uint8Array {
  const value =
    `--${boundary}\r\n` +
    'Content-Disposition: form-data; name="reqtype"\r\n\r\n' +
    "fileupload\r\n" +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="fileToUpload"; filename="${descriptor.filename}"\r\n` +
    `Content-Type: ${descriptor.mime}\r\n\r\n`;
  return new TextEncoder().encode(value);
}

export function createMultipartSuffix(boundary: string): Uint8Array {
  return new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
}

function policyError(status: number, error: string): PolicyResult<never> {
  return { ok: false, status, error };
}

function isAudioExtension(value: string): value is AudioExtension {
  return Object.hasOwn(AUDIO_MIME_TYPES, value);
}

function minimumMagicBytes(extension: AudioExtension): number {
  if (extension === "m4a" || extension === "mp4" || extension === "wav") return 12;
  return 4;
}

function asciiAt(bytes: Uint8Array, offset: number, expected: string): boolean {
  if (offset < 0 || bytes.length < offset + expected.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (bytes[offset + index] !== expected.charCodeAt(index)) return false;
  }
  return true;
}

function includesAscii(bytes: Uint8Array, expected: string): boolean {
  for (let offset = 0; offset <= bytes.length - expected.length; offset += 1) {
    if (asciiAt(bytes, offset, expected)) return true;
  }
  return false;
}

function isMpegAudioFrame(bytes: Uint8Array): boolean {
  if (bytes.length < 2 || bytes[0] !== 0xff || (bytes[1]! & 0xe0) !== 0xe0) return false;
  const version = (bytes[1]! >> 3) & 0x03;
  const layer = (bytes[1]! >> 1) & 0x03;
  return version !== 0x01 && layer !== 0x00;
}
