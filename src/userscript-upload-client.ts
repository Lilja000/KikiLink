import type { UploadProgress } from "./modules/link-chat/image-upload";
import {
  KIKILINK_ALLOWED_UPLOAD_ENDPOINTS,
  KIKILINK_UPLOAD_ACCEPTED,
  KIKILINK_UPLOAD_BRIDGE_MARKER_ID,
  KIKILINK_UPLOAD_CANCEL,
  KIKILINK_UPLOAD_PROGRESS,
  KIKILINK_UPLOAD_REQUEST,
  KIKILINK_UPLOAD_RESPONSE,
  type KikiLinkUploadField,
} from "./userscript-upload-protocol";

declare const __KIKILINK_UPLOAD_CAPABILITY__: string;

const UPLOAD_CAPABILITY_PATTERN = /^[a-f0-9]{64}$/u;
const UPLOAD_ACCEPT_TIMEOUT_MS = 3_000;

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
  acceptTimer: ReturnType<typeof setTimeout>;
  accepted: boolean;
  capability: string;
  signal?: AbortSignal;
  abortListener?: () => void;
}

interface IncomingUploadMessage {
  type?: unknown;
  capability?: unknown;
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
  signal?: AbortSignal,
): Promise<UserscriptMultipartResponse | null> {
  const capability = uploadCapability();
  if (
    !capability ||
    !KIKILINK_ALLOWED_UPLOAD_ENDPOINTS.has(endpoint) ||
    !document.getElementById(KIKILINK_UPLOAD_BRIDGE_MARKER_ID)
  ) {
    return null;
  }
  if (signal?.aborted) throw new Error("The upload was cancelled");

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
      const pending = takePendingUpload(id);
      if (!pending) return;
      postCancel(id, pending.capability);
      pending.reject(new Error("The upload timed out"));
    }, timeoutMs + 2_000);
    const acceptTimer = setTimeout(() => {
      const pending = takePendingUpload(id);
      if (!pending) return;
      postCancel(id, pending.capability);
      pending.reject(new Error(
        "KikiLink upload bridge did not accept the request. Reload Bondage Club and check the Catbox/Litterbox permission in your userscript manager.",
      ));
    }, Math.min(UPLOAD_ACCEPT_TIMEOUT_MS, timeoutMs));
    const pending: PendingUpload = {
      resolve,
      reject,
      ...(onProgress ? { onProgress } : {}),
      timer,
      acceptTimer,
      accepted: false,
      capability,
      ...(signal ? { signal } : {}),
    };
    if (signal) {
      pending.abortListener = () => {
        const active = takePendingUpload(id);
        if (!active) return;
        postCancel(id, active.capability);
        active.reject(new Error("The upload was cancelled"));
      };
      signal.addEventListener("abort", pending.abortListener, { once: true });
    }
    pendingUploads.set(id, pending);
    try {
      window.postMessage(
        {
          type: KIKILINK_UPLOAD_REQUEST,
          capability,
          id,
          endpoint,
          timeoutMs,
          fields,
        },
        window.location.origin,
      );
    } catch (error) {
      const active = takePendingUpload(id);
      active?.reject(error instanceof Error
        ? error
        : new Error("The upload bridge could not send this file"));
    }
  });
}

function installResponseListener(): void {
  if (listening) return;
  listening = true;
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (!isSameWindowMessage(event)) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const source = data as IncomingUploadMessage;
    if (typeof source.id !== "string") return;
    const pending = pendingUploads.get(source.id);
    if (!pending || source.capability !== pending.capability) return;

    if (source.type === KIKILINK_UPLOAD_ACCEPTED) {
      if (!pending.accepted) {
        pending.accepted = true;
        clearTimeout(pending.acceptTimer);
      }
      return;
    }

    if (source.type === KIKILINK_UPLOAD_PROGRESS) {
      if (!pending.accepted) return;
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
    const isAuthenticatedError = typeof source.error === "string" && source.error.length > 0;
    if (!pending.accepted && !isAuthenticatedError) return;

    const completed = takePendingUpload(source.id);
    if (!completed) return;
    if (typeof source.error === "string" && source.error) {
      completed.reject(new Error(source.error));
      return;
    }
    completed.resolve({
      ok: source.ok === true,
      status: Number.isInteger(source.status) ? Number(source.status) : 0,
      body: typeof source.body === "string" ? source.body : "",
    });
  });
}

function takePendingUpload(id: string): PendingUpload | undefined {
  const pending = pendingUploads.get(id);
  if (!pending) return undefined;
  pendingUploads.delete(id);
  clearTimeout(pending.timer);
  clearTimeout(pending.acceptTimer);
  if (pending.signal && pending.abortListener) {
    pending.signal.removeEventListener("abort", pending.abortListener);
  }
  return pending;
}

function postCancel(id: string, capability: string): void {
  try {
    window.postMessage(
      { type: KIKILINK_UPLOAD_CANCEL, capability, id },
      window.location.origin,
    );
  } catch {
    // The local Promise is still settled and cleaned even if the page is already tearing down.
  }
}

function isSameWindowMessage(event: MessageEvent<unknown>): boolean {
  try {
    return event.source === window && event.origin === window.location.origin;
  } catch {
    return false;
  }
}

function uploadCapability(): string | undefined {
  try {
    return typeof __KIKILINK_UPLOAD_CAPABILITY__ === "string" &&
      UPLOAD_CAPABILITY_PATTERN.test(__KIKILINK_UPLOAD_CAPABILITY__)
      ? __KIKILINK_UPLOAD_CAPABILITY__
      : undefined;
  } catch {
    return undefined;
  }
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
