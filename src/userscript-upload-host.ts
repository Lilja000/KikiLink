import {
  KIKILINK_ALLOWED_UPLOAD_ENDPOINTS,
  KIKILINK_UPLOAD_BRIDGE_MARKER_ID,
  KIKILINK_UPLOAD_PROGRESS,
  KIKILINK_UPLOAD_REQUEST,
  KIKILINK_UPLOAD_RESPONSE,
  type KikiLinkUploadField,
  type KikiLinkUploadRequestMessage,
} from "./userscript-upload-protocol";

const MAX_UPLOAD_BYTES = 80 * 1024 * 1024;
const MAX_ACTIVE_UPLOADS = 2;
const ID_PATTERN = /^[a-z0-9-]{8,80}$/iu;
const FILE_NAME_PATTERN = /^kikilink-(?:image\.webp|room-music\.(?:mp3|mp4)|track\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm))$/u;
const activeUploads = new Set<string>();

export function installUserscriptUploadHost(): () => void {
  ensureReadyMarker();
  const handleMessage = (event: MessageEvent<unknown>): void => {
    if (event.origin && event.origin !== window.location.origin) return;
    const request = validateRequest(event.data);
    if (!request) return;
    if (activeUploads.has(request.id)) {
      postError(request.id, "An upload with this identifier is already in progress");
      return;
    }
    if (activeUploads.size >= MAX_ACTIVE_UPLOADS) {
      postError(request.id, "Another upload is already in progress");
      return;
    }
    activeUploads.add(request.id);
    void runUpload(request).finally(() => activeUploads.delete(request.id));
  };
  window.addEventListener("message", handleMessage);
  return () => {
    window.removeEventListener("message", handleMessage);
    document.getElementById(KIKILINK_UPLOAD_BRIDGE_MARKER_ID)?.remove();
  };
}

function runUpload(request: KikiLinkUploadRequestMessage): Promise<void> {
  return new Promise((resolve) => {
    try {
      const form = new FormData();
      for (const field of request.fields) {
        if (field.kind === "text") {
          form.append(field.name, field.value);
        } else {
          form.append(
            field.name,
            new File([field.blob], field.fileName, {
              type: field.mimeType || field.blob.type || "application/octet-stream",
              lastModified: 0,
            }),
          );
        }
      }
      let settled = false;
      const settle = (send: () => void): void => {
        if (settled) return;
        settled = true;
        send();
        resolve();
      };
      GM_xmlhttpRequest({
        method: "POST",
        url: request.endpoint,
        data: form,
        anonymous: true,
        timeout: request.timeoutMs,
        onprogress: (event) => {
          if (settled) return;
          const loaded = finiteNonNegative(event.loaded);
          const total = finitePositive(event.total);
          window.postMessage(
            {
              type: KIKILINK_UPLOAD_PROGRESS,
              id: request.id,
              loaded,
              ...(total === undefined ? {} : { total }),
            },
            window.location.origin,
          );
        },
        onload: (response) => settle(() => {
          window.postMessage(
            {
              type: KIKILINK_UPLOAD_RESPONSE,
              id: request.id,
              ok: response.status >= 200 && response.status < 300,
              status: response.status,
              body: (response.responseText ?? "").slice(0, 4_096),
            },
            window.location.origin,
          );
        }),
        onerror: (response) => settle(() => postError(
          request.id,
          response.status
            ? `Upload network request failed with HTTP ${response.status}`
            : "The upload host could not be reached",
        )),
        onabort: () => settle(() => postError(request.id, "The upload was cancelled")),
        ontimeout: () => settle(() => postError(request.id, "The upload timed out")),
      });
    } catch {
      postError(request.id, "The upload bridge could not prepare this file");
      resolve();
    }
  });
}

function validateRequest(value: unknown): KikiLinkUploadRequestMessage | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<KikiLinkUploadRequestMessage>;
  if (
    source.type !== KIKILINK_UPLOAD_REQUEST ||
    typeof source.id !== "string" ||
    !ID_PATTERN.test(source.id) ||
    typeof source.endpoint !== "string" ||
    !KIKILINK_ALLOWED_UPLOAD_ENDPOINTS.has(source.endpoint) ||
    typeof source.timeoutMs !== "number" ||
    !Number.isInteger(source.timeoutMs) ||
    source.timeoutMs < 1_000 ||
    source.timeoutMs > 300_000 ||
    !Array.isArray(source.fields)
  ) {
    return null;
  }
  const fields = source.fields.map(validateField);
  if (fields.some((field) => field === null)) {
    postError(source.id, "The upload bridge rejected malformed form data");
    return null;
  }
  const validFields = fields as KikiLinkUploadField[];
  if (!validForm(source.endpoint, validFields)) {
    postError(source.id, "The upload bridge rejected unsupported form data");
    return null;
  }
  return {
    type: KIKILINK_UPLOAD_REQUEST,
    id: source.id,
    endpoint: source.endpoint,
    timeoutMs: source.timeoutMs,
    fields: validFields,
  };
}

function validateField(value: unknown): KikiLinkUploadField | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<KikiLinkUploadField>;
  if (source.kind === "text") {
    return typeof source.name === "string" && source.name.length <= 40 &&
      typeof source.value === "string" && source.value.length <= 128
      ? { kind: "text", name: source.name, value: source.value }
      : null;
  }
  if (
    source.kind !== "file" ||
    typeof source.name !== "string" ||
    source.name !== "fileToUpload" ||
    !(source.blob instanceof Blob) ||
    source.blob.size <= 0 ||
    source.blob.size > MAX_UPLOAD_BYTES ||
    typeof source.fileName !== "string" ||
    !FILE_NAME_PATTERN.test(source.fileName) ||
    typeof source.mimeType !== "string" ||
    source.mimeType.length > 100
  ) {
    return null;
  }
  return {
    kind: "file",
    name: source.name,
    blob: source.blob,
    fileName: source.fileName,
    mimeType: source.mimeType,
  };
}

function validForm(endpoint: string, fields: KikiLinkUploadField[]): boolean {
  const text = new Map(
    fields.filter((field): field is Extract<KikiLinkUploadField, { kind: "text" }> => field.kind === "text")
      .map((field) => [field.name, field.value]),
  );
  const files = fields.filter((field) => field.kind === "file");
  if (files.length !== 1 || text.get("reqtype") !== "fileupload") return false;
  if (endpoint === "https://catbox.moe/user/api.php") {
    return fields.length === 2 && !text.has("time");
  }
  return fields.length === 3 && ["1h", "12h", "24h", "72h"].includes(text.get("time") ?? "");
}

function ensureReadyMarker(): void {
  if (document.getElementById(KIKILINK_UPLOAD_BRIDGE_MARKER_ID)) return;
  const marker = document.createElement("meta");
  marker.id = KIKILINK_UPLOAD_BRIDGE_MARKER_ID;
  marker.setAttribute("content", "ready");
  (document.head ?? document.documentElement).append(marker);
}

function postError(id: string, error: string): void {
  window.postMessage(
    { type: KIKILINK_UPLOAD_RESPONSE, id, ok: false, status: 0, body: "", error },
    window.location.origin,
  );
}

function finiteNonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function finitePositive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
