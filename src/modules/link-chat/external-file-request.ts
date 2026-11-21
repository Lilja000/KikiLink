import type { UploadProgress } from "./image-upload";

interface ExternalFileRequest {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: Blob | FormData | string | undefined;
  timeoutMs?: number | undefined;
  signal?: AbortSignal | undefined;
  onProgress?: ((progress: UploadProgress) => void) | undefined;
  headers?: Record<string, string> | undefined;
}

export class ExternalFileHttpError extends Error {
  constructor(readonly status: number) {
    super(`The file host returned HTTP ${status}.`);
    this.name = "ExternalFileHttpError";
  }
}

/** Count file payload bytes. Form fields and multipart delimiters are transport overhead. */
function payloadBytes(body: NonNullable<ExternalFileRequest["body"]>): number {
  if (typeof body === "string") return new TextEncoder().encode(body).byteLength;
  if (body instanceof Blob) return body.size;
  let sum = 0;
  for (const value of body.values()) if (typeof value !== "string") sum += value.size;
  return sum;
}

// Responses contain upload receipts or provider HTML, never the uploaded media.
const MAX_RESPONSE_BYTES = 1024 * 1024;

async function readResponse(response: Response, signal: AbortSignal): Promise<string> {
  const length = response.headers.get("content-length");
  const tooLarge = () => new Error("The file host response exceeds 1 MiB.");
  if (length && /^\d+$/u.test(length) && Number(length) > MAX_RESPONSE_BYTES) {
    void response.body?.cancel().catch(() => {});
    throw tooLarge();
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const decoder = new TextDecoder();
    let received = 0, text = "";
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) return text + decoder.decode();
      received += chunk.value.byteLength;
      if (received > MAX_RESPONSE_BYTES) { cancel(); throw tooLarge(); }
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

export async function requestExternalFile(options: ExternalFileRequest): Promise<string> {
  const { body, method, signal, onProgress, timeoutMs = 180_000 } = options;
  const url = new URL(options.url);
  if (url.protocol !== "https:" || url.username || url.password || url.hash)
    throw new Error("The file host requires an HTTPS URL without credentials or a fragment.");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647)
    throw new RangeError("Invalid file request timeout.");
  const headers = new Headers(options.headers);
  for (const name of ["authorization", "proxy-authorization", "cookie", "cookie2", "referer", "origin"]) {
    if (headers.has(name)) throw new Error("Unexpected credentials or page identity in file request headers.");
  }

  const controller = new AbortController();
  const cancel = () => controller.abort(new DOMException("The upload was cancelled.", "AbortError"));
  if (signal?.aborted) cancel();
  controller.signal.throwIfAborted();
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("The file request timed out.", "TimeoutError")), timeoutMs);
  try {
    // Fetch has no network upload progress events. A completed request confirms
    // delivery of the file bytes; reading a local stream cannot confirm delivery.
    const total = body === undefined || !onProgress ? 0 : payloadBytes(body);
    if (total) onProgress?.({ loaded: 0, total, percent: 0 });
    controller.signal.throwIfAborted();
    const response = await fetch(url.href, {
      method, headers, ...(body === undefined ? {} : { body }), signal: controller.signal,
      credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", mode: "cors", cache: "no-store",
    });
    if (response.redirected || (response.url && new URL(response.url).origin !== url.origin)) {
      void response.body?.cancel().catch(() => {});
      throw new Error("The file host returned an unexpected redirect.");
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new ExternalFileHttpError(response.status);
    }
    const result = await readResponse(response, controller.signal);
    controller.signal.throwIfAborted();
    if (total) onProgress?.({ loaded: total, total, percent: 100 });
    return result;
  } catch (error) {
    controller.signal.throwIfAborted();
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
