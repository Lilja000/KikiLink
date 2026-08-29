// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installUserscriptUploadHost,
  USERSCRIPT_UPLOAD_BUDGET_COOLDOWN_MS,
  USERSCRIPT_UPLOAD_BUDGET_WINDOW_MS,
  USERSCRIPT_UPLOAD_MAX_BYTES_PER_WINDOW,
  USERSCRIPT_UPLOAD_MAX_FILE_BYTES,
  USERSCRIPT_UPLOAD_MAX_REQUESTS_PER_WINDOW,
} from "../src/userscript-upload-host";
import {
  KIKILINK_UPLOAD_ACCEPTED,
  KIKILINK_UPLOAD_BRIDGE_MARKER_ID,
  KIKILINK_UPLOAD_CANCEL,
  KIKILINK_UPLOAD_REQUEST,
  KIKILINK_UPLOAD_RESPONSE,
  type KikiLinkUploadRequestMessage,
} from "../src/userscript-upload-protocol";

const CAPABILITY = "b".repeat(64);
const cleanups = new Set<() => void>();

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups.clear();
  document.getElementById(KIKILINK_UPLOAD_BRIDGE_MARKER_ID)?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("userscript upload host", () => {
  it("requires its per-load capability and exact origin across isolated-world sources", () => {
    const request = vi.fn((details: KikiLinkGmXhrDetails) => {
      details.onload({ status: 200, responseText: "https://files.catbox.moe/test.webp" });
      return { abort: vi.fn() };
    });
    vi.stubGlobal("GM_xmlhttpRequest", request);
    installHost();

    dispatchRequest(uploadRequest("wrong-origin"), "https://evil.example", window);
    dispatchRequest(
      uploadRequest("wrong-cap", new Blob(["x"]), "c".repeat(64)),
      window.location.origin,
      null,
    );
    expect(request).not.toHaveBeenCalled();

    const guardedEvent = new MessageEvent("message", {
      data: uploadRequest("guarded-source"),
      origin: window.location.origin,
    });
    Object.defineProperty(guardedEvent, "source", {
      get: () => {
        throw new DOMException("Denied", "SecurityError");
      },
    });
    expect(() => window.dispatchEvent(guardedEvent)).not.toThrow();
    expect(request).toHaveBeenCalledOnce();

    dispatchRequest(uploadRequest("null-source"), window.location.origin, null);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("uses GM XHR for Catbox while Litterbox retains credential-omitting fetch mode", async () => {
    const request = successfulRequest();
    vi.stubGlobal("GM_xmlhttpRequest", request);
    installHost();

    dispatchRequest(uploadRequest("catbox-xhr"), window.location.origin, window);
    await Promise.resolve();
    dispatchRequest(litterboxUploadRequest("litterbox-fetch"), window.location.origin, window);

    const catbox = request.mock.calls[0]?.[0] as KikiLinkGmXhrDetails | undefined;
    const litterbox = request.mock.calls[1]?.[0] as KikiLinkGmXhrDetails | undefined;
    expect(catbox?.url).toBe("https://catbox.moe/user/api.php");
    expect(catbox?.anonymous).toBeUndefined();
    expect((catbox?.data as FormData).has("userhash")).toBe(false);
    expect(litterbox?.url).toBe(
      "https://litterbox.catbox.moe/resources/internals/api.php",
    );
    expect(litterbox?.anonymous).toBe(true);
  });

  it("authenticates accepted, progress, and response messages", () => {
    const messages: Array<Record<string, unknown>> = [];
    vi.spyOn(window, "postMessage").mockImplementation((message) => {
      messages.push(message as Record<string, unknown>);
    });
    const request = vi.fn((details: KikiLinkGmXhrDetails) => {
      details.onprogress?.({ loaded: 1, total: 2, lengthComputable: true });
      details.onload({ status: 200, responseText: "https://files.catbox.moe/test.webp" });
      return { abort: vi.fn() };
    });
    vi.stubGlobal("GM_xmlhttpRequest", request);
    installHost();

    dispatchRequest(uploadRequest("authenticated-output"), window.location.origin, window);

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: KIKILINK_UPLOAD_ACCEPTED,
        capability: CAPABILITY,
        id: "authenticated-output",
      }),
      expect.objectContaining({
        type: "kikilink:upload-progress:v1",
        capability: CAPABILITY,
        id: "authenticated-output",
      }),
      expect.objectContaining({
        type: KIKILINK_UPLOAD_RESPONSE,
        capability: CAPABILITY,
        id: "authenticated-output",
      }),
    ]));
  });

  it("fails closed after the rolling request budget and admits again after the window", async () => {
    let now = 1_800_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const request = successfulRequest();
    vi.stubGlobal("GM_xmlhttpRequest", request);
    installHost();

    for (let index = 0; index < USERSCRIPT_UPLOAD_MAX_REQUESTS_PER_WINDOW; index += 1) {
      dispatchRequest(uploadRequest(`request-${index}`), window.location.origin, window);
      await Promise.resolve();
    }
    expect(request).toHaveBeenCalledTimes(USERSCRIPT_UPLOAD_MAX_REQUESTS_PER_WINDOW);

    dispatchRequest(uploadRequest("request-blocked"), window.location.origin, window);
    expect(request).toHaveBeenCalledTimes(USERSCRIPT_UPLOAD_MAX_REQUESTS_PER_WINDOW);

    now += USERSCRIPT_UPLOAD_BUDGET_WINDOW_MS + USERSCRIPT_UPLOAD_BUDGET_COOLDOWN_MS + 1;
    dispatchRequest(uploadRequest("request-renewed"), window.location.origin, window);
    expect(request).toHaveBeenCalledTimes(USERSCRIPT_UPLOAD_MAX_REQUESTS_PER_WINDOW + 1);
  });

  it("counts admitted bytes and blocks requests that exceed the rolling byte budget", async () => {
    const request = successfulRequest();
    vi.stubGlobal("GM_xmlhttpRequest", request);
    installHost();
    const first = sizedBlob(USERSCRIPT_UPLOAD_MAX_FILE_BYTES);
    const second = sizedBlob(
      USERSCRIPT_UPLOAD_MAX_BYTES_PER_WINDOW - USERSCRIPT_UPLOAD_MAX_FILE_BYTES,
    );

    dispatchRequest(uploadRequest("bytes-first", first), window.location.origin, window);
    await Promise.resolve();
    dispatchRequest(uploadRequest("bytes-second", second), window.location.origin, window);
    await Promise.resolve();
    dispatchRequest(uploadRequest("bytes-blocked"), window.location.origin, window);

    expect(request).toHaveBeenCalledTimes(2);
  });

  it("aborts active transports and removes all bridge state on cleanup", () => {
    const abort = vi.fn();
    const request = vi.fn((_details: KikiLinkGmXhrDetails) => ({ abort }));
    vi.stubGlobal("GM_xmlhttpRequest", request);
    const cleanup = installHost();

    dispatchRequest(uploadRequest("active-upload"), window.location.origin, window);
    expect(request).toHaveBeenCalledOnce();
    cleanup();
    cleanups.delete(cleanup);

    expect(abort).toHaveBeenCalledOnce();
    expect(document.getElementById(KIKILINK_UPLOAD_BRIDGE_MARKER_ID)).toBeNull();
    dispatchRequest(uploadRequest("after-cleanup"), window.location.origin, window);
    expect(request).toHaveBeenCalledOnce();
  });

  it("accepts cancellation from an isolated world only with exact origin and capability", async () => {
    const abort = vi.fn();
    const request = vi.fn((_details: KikiLinkGmXhrDetails) => ({ abort }));
    vi.stubGlobal("GM_xmlhttpRequest", request);
    installHost();

    dispatchRequest(uploadRequest("active-cancel"), window.location.origin, window);
    dispatchCancel("active-cancel", "c".repeat(64), window.location.origin, null);
    dispatchCancel("active-cancel", CAPABILITY, "https://evil.example", window);
    expect(abort).not.toHaveBeenCalled();

    dispatchCancel("active-cancel", CAPABILITY, window.location.origin, null);
    await Promise.resolve();
    expect(abort).toHaveBeenCalledOnce();

    dispatchRequest(uploadRequest("after-cancel"), window.location.origin, null);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("uses its own watchdog to abort a transport and release the active slot", async () => {
    vi.useFakeTimers();
    const aborts: Array<ReturnType<typeof vi.fn>> = [];
    const request = vi.fn((details: KikiLinkGmXhrDetails) => {
      const abort = vi.fn(() => details.onabort());
      aborts.push(abort);
      return { abort };
    });
    const messages: unknown[] = [];
    vi.spyOn(window, "postMessage").mockImplementation((message) => {
      messages.push(message);
    });
    vi.stubGlobal("GM_xmlhttpRequest", request);
    installHost();

    dispatchRequest(uploadRequest("watchdog-one"), window.location.origin, window);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(aborts[0]).toHaveBeenCalledOnce();
    expect(messages).toContainEqual(expect.objectContaining({
      id: "watchdog-one",
      error: "The upload timed out",
    }));

    dispatchRequest(uploadRequest("watchdog-two"), window.location.origin, window);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("releases its active slot when posting a completed response throws", async () => {
    const request = successfulRequest();
    vi.stubGlobal("GM_xmlhttpRequest", request);
    vi.spyOn(window, "postMessage").mockImplementation((message) => {
      if ((message as Record<string, unknown>).type === KIKILINK_UPLOAD_RESPONSE) {
        throw new DOMException("page is unloading", "InvalidStateError");
      }
    });
    installHost();

    expect(() => {
      dispatchRequest(uploadRequest("throwing-response"), window.location.origin, window);
    }).not.toThrow();
    await Promise.resolve();

    expect(() => {
      dispatchRequest(uploadRequest("after-throwing-response"), window.location.origin, window);
    }).not.toThrow();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("refuses to install with a missing or predictable capability", () => {
    expect(() => installUserscriptUploadHost("")).toThrow("secure per-load capability");
    expect(() => installUserscriptUploadHost("predictable")).toThrow(
      "secure per-load capability",
    );
    expect(document.getElementById(KIKILINK_UPLOAD_BRIDGE_MARKER_ID)).toBeNull();
  });
});

function installHost(): () => void {
  const cleanup = installUserscriptUploadHost(CAPABILITY);
  cleanups.add(cleanup);
  return cleanup;
}

function successfulRequest(): ReturnType<typeof vi.fn> {
  return vi.fn((details: KikiLinkGmXhrDetails) => {
    details.onload({ status: 200, responseText: "https://files.catbox.moe/test.webp" });
    return { abort: vi.fn() };
  });
}

function uploadRequest(
  id: string,
  blob: Blob = new Blob(["x"], { type: "image/webp" }),
  capability = CAPABILITY,
): KikiLinkUploadRequestMessage {
  return {
    type: KIKILINK_UPLOAD_REQUEST,
    capability,
    id,
    endpoint: "https://catbox.moe/user/api.php",
    timeoutMs: 30_000,
    fields: [
      { kind: "text", name: "reqtype", value: "fileupload" },
      {
        kind: "file",
        name: "fileToUpload",
        blob,
        fileName: "kikilink-image.webp",
        mimeType: "image/webp",
      },
    ],
  };
}

function litterboxUploadRequest(id: string): KikiLinkUploadRequestMessage {
  const request = uploadRequest(id);
  return {
    ...request,
    endpoint: "https://litterbox.catbox.moe/resources/internals/api.php",
    fields: [
      request.fields[0]!,
      { kind: "text", name: "time", value: "24h" },
      request.fields[1]!,
    ],
  };
}

function dispatchRequest(
  request: KikiLinkUploadRequestMessage,
  origin: string,
  source: MessageEventSource | null,
): void {
  window.dispatchEvent(new MessageEvent("message", { data: request, origin, source }));
}

function dispatchCancel(
  id: string,
  capability: string,
  origin: string,
  source: MessageEventSource | null,
): void {
  window.dispatchEvent(new MessageEvent("message", {
    data: { type: KIKILINK_UPLOAD_CANCEL, capability, id },
    origin,
    source,
  }));
}

function sizedBlob(size: number): Blob {
  const blob = new Blob(["x"], { type: "image/webp" });
  Object.defineProperty(blob, "size", { configurable: true, value: size });
  return blob;
}
