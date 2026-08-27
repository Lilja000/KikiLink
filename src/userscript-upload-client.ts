import type { UploadProgress } from "./modules/link-chat/image-upload";
import {
  KIKILINK_ALLOWED_UPLOAD_ENDPOINTS,
  KIKILINK_UPLOAD_BRIDGE_MARKER_ID,
  KIKILINK_UPLOAD_PROGRESS,
  KIKILINK_UPLOAD_REQUEST,
  KIKILINK_UPLOAD_RESPONSE,
  type KikiLinkUploadField,
} from "./userscript-upload-protocol";

export interface UserscriptMultipartResponse {
  ok: boolean;
  status: number;
  body: string;
}

interface PendingUpload {
  resolve(response: UserscriptMultipartResponse): void;
  reject(error: Error): void;
  onProgress?: (progress: UploadProgress) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface IncomingUploadMessage {
  type?: unknown;
  id?: unknown;
  loaded?: unknown;
  total?: unknown;
  ok?: unknown;
  status?: unknown;
  body?: unknown;
  error?: unknown;
}

const pendingUploads = new Map<string, PendingUpload>();
let listening = false;

/**
 * Sends only structured-cloneable upload data to the userscript sandbox.
 * Bondage Club characters, callbacks, canvas objects, and ModSDK values never cross this boundary.
 */
export async function uploadMultipartViaUserscriptBridge(
  endpoint: string,
  form: FormData,
  timeoutMs: number,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UserscriptMultipartResponse | null> {
  if (
    !KIKILINK_ALLOWED_UPLOAD_ENDPOINTS.has(endpoint) ||
    !document.getElementById(KIKILINK_UPLOAD_BRIDGE_MARKER_ID)
  ) {
    return null;
  }

  installResponseListener();
  const fields: KikiLinkUploadField[] = [];
  for (const [name, value] of form.entries()) {
    if (typeof value === "string") {
      fields.push({ kind: "text", name, value });
    } else {
      fields.push({
        kind: "file",
        name,
        blob: value,
        fileName: value.name,
        mimeType: value.type,
      });
    }
  }

  const id = uploadId();
  return new Promise<UserscriptMultipartResponse>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingUploads.delete(id);
      reject(new Error("The upload timed out"));
    }, timeoutMs + 2_000);
    pendingUploads.set(id, {
      resolve,
      reject,
      ...(onProgress ? { onProgress } : {}),
      timer,
    });
    window.postMessage(
      {
        type: KIKILINK_UPLOAD_REQUEST,
        id,
        endpoint,
        timeoutMs,
        fields,
      },
      window.location.origin,
    );
  });
}

function installResponseListener(): void {
  if (listening) return;
  listening = true;
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.origin && event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const source = data as IncomingUploadMessage;
    if (typeof source.id !== "string") return;
    const pending = pendingUploads.get(source.id);
    if (!pending) return;

    if (source.type === KIKILINK_UPLOAD_PROGRESS) {
      const loaded = finiteNonNegative(source.loaded);
      const total = finitePositive(source.total);
      pending.onProgress?.({
        loaded,
        ...(total === undefined
          ? {}
          : { total, percent: Math.min(100, Math.round((loaded / total) * 100)) }),
      });
      return;
    }
    if (source.type !== KIKILINK_UPLOAD_RESPONSE) return;

    pendingUploads.delete(source.id);
    clearTimeout(pending.timer);
    if (typeof source.error === "string" && source.error) {
      pending.reject(new Error(source.error));
      return;
    }
    pending.resolve({
      ok: source.ok === true,
      status: Number.isInteger(source.status) ? Number(source.status) : 0,
      body: typeof source.body === "string" ? source.body : "",
    });
  });
}

function uploadId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function finiteNonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function finitePositive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
