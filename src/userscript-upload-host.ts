import {
  KIKILINK_ALLOWED_UPLOAD_ENDPOINTS,
  KIKILINK_UPLOAD_ACCEPTED,
  KIKILINK_UPLOAD_BRIDGE_MARKER_ID,
  KIKILINK_UPLOAD_CANCEL,
  KIKILINK_UPLOAD_PROGRESS,
  KIKILINK_UPLOAD_REQUEST,
  KIKILINK_UPLOAD_RESPONSE,
  type KikiLinkUploadField,
  type KikiLinkUploadRequestMessage,
} from "./userscript-upload-protocol";

export const USERSCRIPT_UPLOAD_MAX_FILE_BYTES = 80 * 1024 * 1024;
export const USERSCRIPT_UPLOAD_BUDGET_WINDOW_MS = 10 * 60_000;
export const USERSCRIPT_UPLOAD_BUDGET_COOLDOWN_MS = 60_000;
export const USERSCRIPT_UPLOAD_MAX_REQUESTS_PER_WINDOW = 12;
export const USERSCRIPT_UPLOAD_MAX_BYTES_PER_WINDOW =
  2 * USERSCRIPT_UPLOAD_MAX_FILE_BYTES;

const MAX_ACTIVE_UPLOADS = 2;
const CATBOX_UPLOAD_ENDPOINT = "https://catbox.moe/user/api.php";
const ID_PATTERN = /^[a-z0-9-]{8,80}$/iu;
const CAPABILITY_PATTERN = /^[a-f0-9]{64}$/u;
const FILE_NAME_PATTERN = /^kikilink-(?:image\.webp|room-music\.(?:mp3|mp4)|track\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm))$/u;

interface UploadBudgetEntry {
  startedAt: number;
  bytes: number;
}

export function installUserscriptUploadHost(capability: string): () => void {
  if (!CAPABILITY_PATTERN.test(capability)) {
    throw new Error("KikiLink upload bridge requires a secure per-load capability");
  }
  const activeUploads = new Set<string>();
  const activeRequests = new Map<string, () => void>();
  const budget: UploadBudgetEntry[] = [];
  let cooldownUntil = 0;
  let disposed = false;
  ensureReadyMarker();
  const handleMessage = (event: MessageEvent<unknown>): void => {
    if (disposed || !isSameOriginMessage(event)) return;
    const cancelId = validateCancel(event.data, capability);
    if (cancelId) {
      activeRequests.get(cancelId)?.();
      return;
    }
    const request = validateRequest(event.data, capability);
    if (!request) return;
    if (activeUploads.has(request.id)) {
      postError(request.id, capability, "An upload with this identifier is already in progress");
      return;
    }
    if (activeUploads.size >= MAX_ACTIVE_UPLOADS) {
      postError(request.id, capability, "Another upload is already in progress");
      return;
    }
    const admission = admitUpload(budget, requestBytes(request), cooldownUntil);
    cooldownUntil = admission.cooldownUntil;
    if (!admission.allowed) {
      postError(
        request.id,
        capability,
        "Upload safety limit reached. Please wait before trying again",
      );
      return;
    }
    if (!postAccepted(request.id, capability)) return;
    activeUploads.add(request.id);
    void runUpload(
      request,
      activeRequests,
      () => !disposed,
    ).finally(() => activeUploads.delete(request.id));
  };
  window.addEventListener("message", handleMessage);
  return () => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener("message", handleMessage);
    document.getElementById(KIKILINK_UPLOAD_BRIDGE_MARKER_ID)?.remove();
    for (const cancel of [...activeRequests.values()]) {
      try {
        cancel();
      } catch {
        // Cleanup is best-effort; all bridge state is still dropped below.
      }
    }
    activeRequests.clear();
    activeUploads.clear();
    budget.length = 0;
    cooldownUntil = 0;
  };
}

function isSameOriginMessage(event: MessageEvent<unknown>): boolean {
  try {
    // Tampermonkey's isolated world may deliberately expose postMessage's source as null or as a
    // different WindowProxy wrapper. Exact origin plus the unguessable per-load capability still
    // authenticates requests without depending on cross-realm wrapper identity.
    return event.origin === window.location.origin;
  } catch {
    return false;
  }
}

function runUpload(
  request: KikiLinkUploadRequestMessage,
  activeRequests: Map<string, () => void>,
  canRespond: () => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let transport: { abort(): void } | undefined;
    let abortReason: "cancelled" | "timeout" | undefined;
    const settle = (send: () => void): void => {
      if (settled) return;
      settled = true;
      if (watchdog !== undefined) clearTimeout(watchdog);
      activeRequests.delete(request.id);
      try {
        if (canRespond()) send();
      } catch {
        // A page can begin tearing down between canRespond() and postMessage(). The privileged
        // transport is already settled, so always release the slot even when the response cannot
        // be delivered.
      } finally {
        resolve();
      }
    };
    const abort = (reason: "cancelled" | "timeout"): void => {
      if (settled) return;
      abortReason = reason;
      try {
        transport?.abort();
      } finally {
        settle(() => postError(
          request.id,
          request.capability,
          reason === "timeout" ? "The upload timed out" : "The upload was cancelled",
        ));
      }
    };
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
      const requestOptions: KikiLinkGmXhrDetails = {
        method: "POST",
        url: request.endpoint,
        data: form,
        // Catbox's API calls an upload anonymous when `userhash` is omitted. Tampermonkey's
        // unrelated `anonymous` flag forces fetch mode in Chromium, disabling reliable native
        // progress/timeout behavior. Keep Catbox on GM's XHR transport; Litterbox retains its
        // credential-omitting fetch transport.
        ...(request.endpoint === CATBOX_UPLOAD_ENDPOINT ? {} : { anonymous: true }),
        timeout: request.timeoutMs,
        onprogress: (event) => {
          if (settled || !canRespond()) return;
          const loaded = finiteNonNegative(event.loaded);
          const total = finitePositive(event.total);
          try {
            window.postMessage({
              type: KIKILINK_UPLOAD_PROGRESS,
              capability: request.capability,
              id: request.id,
              loaded,
              ...(total === undefined ? {} : { total }),
            }, window.location.origin);
          } catch {
            // The request watchdog and final response still own transport cleanup.
          }
        },
        onload: (response) => settle(() => {
          window.postMessage(
            {
              type: KIKILINK_UPLOAD_RESPONSE,
              capability: request.capability,
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
          request.capability,
          abortReason === "timeout"
            ? "The upload timed out"
            : abortReason === "cancelled"
              ? "The upload was cancelled"
              : response.status
                ? `Upload network request failed with HTTP ${response.status}`
                : "The upload host could not be reached",
        )),
        onabort: () => settle(() => postError(
          request.id,
          request.capability,
          abortReason === "timeout" ? "The upload timed out" : "The upload was cancelled",
        )),
        ontimeout: () => settle(() => postError(
          request.id,
          request.capability,
          "The upload timed out",
        )),
      };
      transport = GM_xmlhttpRequest(requestOptions);
      if (!settled) {
        activeRequests.set(request.id, () => abort("cancelled"));
        watchdog = setTimeout(() => abort("timeout"), request.timeoutMs);
      }
    } catch {
      settle(() => postError(
        request.id,
        request.capability,
        "The upload bridge could not prepare this file",
      ));
    }
  });
}

function validateCancel(value: unknown, capability: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  return source.type === KIKILINK_UPLOAD_CANCEL &&
      source.capability === capability &&
      typeof source.id === "string" &&
      ID_PATTERN.test(source.id)
    ? source.id
    : null;
}

function validateRequest(
  value: unknown,
  capability: string,
): KikiLinkUploadRequestMessage | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<KikiLinkUploadRequestMessage>;
  if (
    source.type !== KIKILINK_UPLOAD_REQUEST ||
    source.capability !== capability ||
    typeof source.id !== "string" ||
    !ID_PATTERN.test(source.id) ||
    typeof source.endpoint !== "string" ||
    !KIKILINK_ALLOWED_UPLOAD_ENDPOINTS.has(source.endpoint) ||
    typeof source.timeoutMs !== "number" ||
    !Number.isInteger(source.timeoutMs) ||
    source.timeoutMs < 1_000 ||
    source.timeoutMs > 300_000 ||
    !Array.isArray(source.fields) ||
    source.fields.length < 2 ||
    source.fields.length > 3
  ) {
    return null;
  }
  const fields = source.fields.map(validateField);
  if (fields.some((field) => field === null)) {
    postError(source.id, capability, "The upload bridge rejected malformed form data");
    return null;
  }
  const validFields = fields as KikiLinkUploadField[];
  if (!validForm(source.endpoint, validFields)) {
    postError(source.id, capability, "The upload bridge rejected unsupported form data");
    return null;
  }
  return {
    type: KIKILINK_UPLOAD_REQUEST,
    capability,
    id: source.id,
    endpoint: source.endpoint,
    timeoutMs: source.timeoutMs,
    fields: validFields,
  };
}

function requestBytes(request: KikiLinkUploadRequestMessage): number {
  return request.fields.reduce(
    (total, field) => total + (field.kind === "file" ? field.blob.size : 0),
    0,
  );
}

function admitUpload(
  budget: UploadBudgetEntry[],
  bytes: number,
  cooldownUntil: number,
): { allowed: boolean; cooldownUntil: number } {
  const now = Date.now();
  while (
    budget.length > 0 &&
    now - (budget[0]?.startedAt ?? now) >= USERSCRIPT_UPLOAD_BUDGET_WINDOW_MS
  ) {
    budget.shift();
  }
  if (now < cooldownUntil) return { allowed: false, cooldownUntil };
  const usedBytes = budget.reduce((total, entry) => total + entry.bytes, 0);
  if (
    budget.length >= USERSCRIPT_UPLOAD_MAX_REQUESTS_PER_WINDOW ||
    usedBytes + bytes > USERSCRIPT_UPLOAD_MAX_BYTES_PER_WINDOW
  ) {
    return {
      allowed: false,
      cooldownUntil: now + USERSCRIPT_UPLOAD_BUDGET_COOLDOWN_MS,
    };
  }
  budget.push({ startedAt: now, bytes });
  return { allowed: true, cooldownUntil };
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
    source.blob.size > USERSCRIPT_UPLOAD_MAX_FILE_BYTES ||
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

function postAccepted(id: string, capability: string): boolean {
  try {
    window.postMessage(
      { type: KIKILINK_UPLOAD_ACCEPTED, capability, id },
      window.location.origin,
    );
    return true;
  } catch {
    return false;
  }
}

function postError(id: string, capability: string, error: string): void {
  window.postMessage(
    {
      type: KIKILINK_UPLOAD_RESPONSE,
      capability,
      id,
      ok: false,
      status: 0,
      body: "",
      error,
    },
    window.location.origin,
  );
}

function finiteNonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function finitePositive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
