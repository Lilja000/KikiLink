import { ExternalFileHttpError, requestExternalFile } from "./external-file-request";
import { MAX_PREPARED_IMAGE_BYTES, type UploadProgress } from "./image-upload";

const ORIGIN = "https://anondrop.net";
const MAX_TRACK_BYTES = 80 * 1024 ** 2;
const MIME = new Map([
  ["webp", "image/webp"], ["mp3", "audio/mpeg"], ["mp4", "video/mp4"],
  ["m4a", "audio/mp4"], ["ogg", "audio/ogg"], ["wav", "audio/wav"],
  ["flac", "audio/flac"], ["aac", "audio/aac"], ["webm", "audio/webm"],
]);

function shareId(result: string, key: string): string | undefined {
  const shares = result.matchAll(/(?:^|[\s"'>(])https:\/\/anondrop\.net\/([A-Za-z0-9]{6,128})(?=$|[\s"'<>])/gu);
  const ids = new Set(Array.from(shares, match => match[1]));
  return ids.size === 1 && !ids.has(key) ? [...ids][0] : undefined;
}

function listedFileId(result: string, name: string, key: string): string | undefined {
  // This listing belongs exclusively to this upload's freshly issued key. Only
  // entries naming the file sent by this call are eligible for recovery.
  const ids = new Set<string>();
  for (const anchor of result.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>([^<]*)/giu)) {
    const href = anchor[1];
    if (!href || (!href.startsWith("/") && !href.startsWith(ORIGIN + "/"))) continue;
    let link: URL;
    try { link = new URL(href, ORIGIN); } catch { continue; }
    if (link.origin !== ORIGIN || link.username || link.password || link.hash) continue;
    const [, id, filename, extra] = link.pathname.split("/");
    if (!id || !/^[A-Za-z0-9]{6,128}$/u.test(id) || extra !== undefined) continue;
    if ((filename === name && (!link.search || link.search === "?download=true")) ||
        (filename === undefined && !link.search && anchor[2]?.trim() === name)) ids.add(id);
  }
  if (result.trimStart().startsWith("[") || result.trimStart().startsWith("{")) {
    let list: unknown;
    try { list = JSON.parse(result); } catch { return undefined; }
    if (list && typeof list === "object" && "files" in list) list = list.files;
    if (Array.isArray(list)) for (const entry of list) {
      if (!entry || typeof entry !== "object" || (entry.filename ?? entry.fileName ?? entry.name) !== name) continue;
      const id: unknown = entry.id ?? entry.fileId ?? entry.file_id;
      if (typeof id === "string" && /^[A-Za-z0-9]{6,128}$/u.test(id)) ids.add(id);
    }
  }
  return ids.size === 1 && !ids.has(key) ? [...ids][0] : undefined;
}

async function verifyFileBytes(url: string, file: Blob, signal?: AbortSignal): Promise<void> {
  const controller = new AbortController();
  const cancel = () => controller.abort(new DOMException("The upload was cancelled.", "AbortError"));
  const expired = () => controller.abort(new DOMException("The media link check timed out.", "TimeoutError"));
  if (signal?.aborted) cancel();
  controller.signal.throwIfAborted();
  signal?.addEventListener("abort", cancel, { once: true });
  const deadline = setTimeout(expired, 30_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const stopReading = () => { if (reader) void reader.cancel().catch(() => {}); };
  controller.signal.addEventListener("abort", stopReading, { once: true });
  try {
    const expected = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    controller.signal.throwIfAborted();
    const response = await fetch(url, {
      method: "GET", headers: { Range: `bytes=0-${expected.length - 1}` }, signal: controller.signal,
      credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", mode: "cors", cache: "no-store",
    });
    const invalid = "AnonDrop could not confirm the direct media link.";
    if (![200, 206].includes(response.status) || response.redirected || (response.url && response.url !== url) ||
        !response.body || /^text\//iu.test(response.headers.get("content-type") ?? "")) throw new Error(invalid);
    reader = response.body.getReader();
    let verified = 0;
    while (verified < expected.length) {
      const { done, value } = await reader.read();
      controller.signal.throwIfAborted();
      if (done || !value?.length) throw new Error(invalid);
      const count = Math.min(value.byteLength, expected.length - verified);
      for (let offset = 0; offset < count; offset++) {
        if (value[offset] !== expected[verified + offset]) throw new Error(invalid);
      }
      verified += count;
    }
  } catch (error) {
    controller.signal.throwIfAborted();
    throw error;
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", stopReading);
    stopReading();
    controller.abort();
  }
}

export async function uploadDurableFile(
  file: Blob,
  format: string,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<string> {
  const mime = MIME.get(format);
  if (!mime || (format === "webp" && file.type !== mime))
    throw new Error("Choose a prepared WebP image or a supported audio track.");
  const limit = format === "webp" ? MAX_PREPARED_IMAGE_BYTES : MAX_TRACK_BYTES;
  if (!file.size || file.size > limit)
    throw new Error(`Choose a non-empty file up to ${limit / 1024 ** 2} MB.`);

  // The documented registration response provides a new anonymous management key
  // in a localStorage assignment. Read the value without executing the host's HTML.
  const registration = await requestExternalFile({
    url: `${ORIGIN}/register?nonce=${crypto.randomUUID()}`, method: "GET", timeoutMs: 30_000, signal,
  });
  const key = /\blocalStorage\.setItem\(\s*['"]userkey['"]\s*,\s*['"]([A-Za-z0-9]{8,256})['"]\s*\)/u.exec(registration)?.[1];
  if (!key) throw new Error("AnonDrop could not start the upload.");

  const name = `kikilink-media.${format}`;
  const form = new FormData();
  form.set("file", file.slice(0, file.size, mime), name);
  let id: string | undefined;
  try {
    const result = await requestExternalFile({
      url: `${ORIGIN}/upload?key=${key}`, method: "POST", body: form,
      timeoutMs: 300_000, signal, onProgress,
    });
    id = shareId(result, key);
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) throw error;
    if (error instanceof ExternalFileHttpError && error.status < 500) throw error;
    // A redirect or lost response can occur after the host stores the bytes.
    // Consult the key's single-file list once, without submitting a second copy.
  }
  if (!id) {
    try {
      const list = await requestExternalFile({
        url: `${ORIGIN}/files?key=${key}`, method: "GET", timeoutMs: 30_000, signal,
      });
      id = listedFileId(list, name, key);
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) throw error;
      // Transport errors for management URLs may include the key in their text.
    }
  }
  if (!id) throw new Error("AnonDrop could not confirm the uploaded file.");
  // AnonDrop's share player links to /<id>/<filename>. The bare ID returns HTML.
  const url = `${ORIGIN}/${id}/${name}`;
  await verifyFileBytes(url, file, signal);
  return url;
}
