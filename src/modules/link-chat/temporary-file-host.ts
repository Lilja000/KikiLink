import { requestExternalFile } from "./external-file-request";
import { MAX_LOCAL_ROOM_AUDIO_BYTES, MAX_PREPARED_IMAGE_BYTES } from "./image-upload";
import type { LitterboxRetention, UploadProgress } from "./image-upload";

const ORIGIN = "https://waifuvault.moe";
const PUBLIC_PREFIX = `${ORIGIN}/f/`;
const FILE_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const MIME = new Map([
  ["webp", "image/webp"], ["mp3", "audio/mpeg"], ["mp4", "video/mp4"],
]);
const RETENTION_HOURS = new Map<LitterboxRetention, number>([
  ["1h", 1], ["12h", 12], ["24h", 24], ["72h", 72],
]);

interface UploadResponse {
  url?: unknown;
  retentionPeriod?: unknown;
}

export async function uploadTemporaryFile(
  file: Blob,
  format: string,
  retention: LitterboxRetention,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<string> {
  const mime = MIME.get(format);
  const hours = RETENTION_HOURS.get(retention);
  if (!hours) throw new Error("Choose a valid temporary file lifetime.");
  if (!mime || (format === "webp" && file.type !== mime))
    throw new Error("Choose a prepared WebP image, an MP3, or an MP4 file.");
  const limit = format === "webp" ? MAX_PREPARED_IMAGE_BYTES : MAX_LOCAL_ROOM_AUDIO_BYTES;
  if (!file.size || file.size > limit)
    throw new Error(`Choose a non-empty file up to ${limit / 1024 ** 2} MB.`);

  const fileName = `kikilink-media.${format}`;
  const form = new FormData();
  form.set("file", file.slice(0, file.size, mime), fileName);
  // WaifuVault formats the remaining lifetime as a string unless requested in milliseconds.
  const uploadUrl = `${ORIGIN}/rest?${new URLSearchParams({ expires: retention, formatted: "false" })}`;
  const raw = await requestExternalFile({
    url: uploadUrl, method: "PUT", body: form, timeoutMs: 60_000,
    ...(signal ? { signal } : {}), ...(onProgress ? { onProgress } : {}),
  });
  let response: UploadResponse | null;
  try { response = JSON.parse(raw) as UploadResponse | null; }
  catch { throw new Error("WaifuVault returned an invalid upload response."); }
  const url = response?.url;
  if (typeof url !== "string" || !url.startsWith(PUBLIC_PREFIX))
    throw new Error("WaifuVault returned an unexpected file link.");
  const [id, name, extra] = url.slice(PUBLIC_PREFIX.length).split("/");
  if (!id || !FILE_ID.test(id) || name !== fileName || extra !== undefined)
    throw new Error("WaifuVault returned an unexpected file link.");

  // Identical bytes previously uploaded by this client can return an existing URL and expiry.
  // Check the reported lifetime before reusing it, without changing the life of a previous link.
  const requestedMs = hours * 60 * 60_000;
  const remainingMs = response?.retentionPeriod;
  if (typeof remainingMs !== "number" || !Number.isSafeInteger(remainingMs) ||
      remainingMs > requestedMs || remainingMs < requestedMs - 60_000)
    throw new Error("WaifuVault returned a file with a different lifetime. Choose another file or a direct link.");
  return url;
}
