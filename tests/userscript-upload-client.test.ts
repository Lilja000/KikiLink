// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadMultipartViaUserscriptBridge } from "../src/userscript-upload-client";
import {
  KIKILINK_UPLOAD_BRIDGE_MARKER_ID,
  KIKILINK_UPLOAD_CANCEL,
  KIKILINK_UPLOAD_REQUEST,
  KIKILINK_UPLOAD_RESPONSE,
} from "../src/userscript-upload-protocol";

const CAPABILITY = "a".repeat(64);
const ENDPOINT = "https://catbox.moe/user/api.php";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "__KIKILINK_UPLOAD_CAPABILITY__");
  document.getElementById(KIKILINK_UPLOAD_BRIDGE_MARKER_ID)?.remove();
});

describe("userscript upload client", () => {
  it("sends one authenticated cancel and settles once when its fallback timer expires", async () => {
    vi.useFakeTimers();
    installBridgeMarker();
    installCapability();
    const messages: Array<Record<string, unknown>> = [];
    vi.spyOn(window, "postMessage").mockImplementation((message) => {
      messages.push(message as Record<string, unknown>);
    });

    const upload = uploadMultipartViaUserscriptBridge(ENDPOINT, uploadForm(), 1_000);
    const errorPromise = upload.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(3_000);
    const error = await errorPromise;

    const request = messages.find((message) => message.type === KIKILINK_UPLOAD_REQUEST);
    const cancels = messages.filter((message) => message.type === KIKILINK_UPLOAD_CANCEL);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("The upload timed out");
    expect(request?.id).toEqual(expect.any(String));
    expect(cancels).toEqual([{
      type: KIKILINK_UPLOAD_CANCEL,
      capability: CAPABILITY,
      id: request?.id,
    }]);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(messages.filter((message) => message.type === KIKILINK_UPLOAD_CANCEL)).toHaveLength(1);
  });

  it("propagates AbortSignal cancellation and removes its timeout listener", async () => {
    vi.useFakeTimers();
    installBridgeMarker();
    installCapability();
    const messages: Array<Record<string, unknown>> = [];
    vi.spyOn(window, "postMessage").mockImplementation((message) => {
      messages.push(message as Record<string, unknown>);
    });
    const controller = new AbortController();

    const upload = uploadMultipartViaUserscriptBridge(
      ENDPOINT,
      uploadForm(),
      1_000,
      undefined,
      controller.signal,
    );
    const errorPromise = upload.catch((error: unknown) => error);
    controller.abort();
    const error = await errorPromise;

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("The upload was cancelled");
    expect(messages.filter((message) => message.type === KIKILINK_UPLOAD_CANCEL)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(messages.filter((message) => message.type === KIKILINK_UPLOAD_CANCEL)).toHaveLength(1);
  });

  it("cleans the abort and timeout paths after a successful response", async () => {
    vi.useFakeTimers();
    installBridgeMarker();
    installCapability();
    const messages: Array<Record<string, unknown>> = [];
    vi.spyOn(window, "postMessage").mockImplementation((message) => {
      const outgoing = message as Record<string, unknown>;
      messages.push(outgoing);
      if (outgoing.type !== KIKILINK_UPLOAD_REQUEST) return;
      window.dispatchEvent(new MessageEvent("message", {
        data: {
          type: KIKILINK_UPLOAD_RESPONSE,
          id: outgoing.id,
          ok: true,
          status: 200,
          body: "https://files.catbox.moe/banner.webp",
        },
        origin: window.location.origin,
        source: window,
      }));
    });
    const controller = new AbortController();

    await expect(uploadMultipartViaUserscriptBridge(
      ENDPOINT,
      uploadForm(),
      1_000,
      undefined,
      controller.signal,
    )).resolves.toEqual({
      ok: true,
      status: 200,
      body: "https://files.catbox.moe/banner.webp",
    });

    controller.abort();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(messages.filter((message) => message.type === KIKILINK_UPLOAD_CANCEL)).toHaveLength(0);
  });
});

function installBridgeMarker(): void {
  const marker = document.createElement("meta");
  marker.id = KIKILINK_UPLOAD_BRIDGE_MARKER_ID;
  document.head.append(marker);
}

function installCapability(): void {
  Object.defineProperty(globalThis, "__KIKILINK_UPLOAD_CAPABILITY__", {
    configurable: true,
    value: CAPABILITY,
  });
}

function uploadForm(): FormData {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append(
    "fileToUpload",
    new File([Uint8Array.of(1, 2, 3)], "kikilink-image.webp", { type: "image/webp" }),
  );
  return form;
}
