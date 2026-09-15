// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CatboxRelayClient,
  isAllowedBondageClubOrigin,
  normalizeRelayUploadResponse,
} from "../src/modules/link-chat/catbox-relay-client";

const RELAY_ORIGIN = "https://uploads.kikilink.example";

beforeEach(() => {
  (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(
    "https://www.bondageprojects.com/R104/BondageClub",
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CatboxRelayClient", () => {
  it("keeps its short-lived bearer only in memory and reuses it", async () => {
    const open = mockRelayAuthorization();
    const request = vi.fn<typeof fetch>(async () =>
      Response.json({ url: "https://files.catbox.moe/safe.webp" }));
    const client = new CatboxRelayClient(RELAY_ORIGIN, request);
    const file = webpFile();

    await expect(client.upload(file, imageOptions())).resolves.toBe(
      "https://files.catbox.moe/safe.webp",
    );
    await expect(client.upload(file, imageOptions())).resolves.toBe(
      "https://files.catbox.moe/safe.webp",
    );

    expect(open).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
    const [, init] = request.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${"A".repeat(43)}`);
    expect(init).toEqual(expect.objectContaining({
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      body: file,
    }));
    expect(init).not.toHaveProperty("cache");
  });

  it("requires a new explicit upload action after a pre-forward 401 and never retries failures", async () => {
    const open = mockRelayAuthorization();
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ error: "Verification expired" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ url: "https://files.catbox.moe/fresh.webp" }));
    const client = new CatboxRelayClient(RELAY_ORIGIN, request);

    await expect(client.upload(webpFile(), imageOptions())).rejects.toThrow(
      "Press Upload again",
    );
    expect(open).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledOnce();

    await expect(client.upload(webpFile(), imageOptions())).resolves.toBe(
      "https://files.catbox.moe/fresh.webp",
    );
    expect(open).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledTimes(2);

    const failedRequest = vi.fn<typeof fetch>(async () =>
      Response.json({ error: "Relay unavailable" }, { status: 502 }));
    const failedClient = new CatboxRelayClient(RELAY_ORIGIN, failedRequest);
    await expect(failedClient.upload(webpFile(), imageOptions())).rejects.toThrow(
      "result is unconfirmed",
    );
    expect(failedRequest).toHaveBeenCalledOnce();

    const timedOutRequest = vi.fn<typeof fetch>(async () =>
      Response.json({ error: "The upload timed out" }, { status: 504 }));
    const timedOutClient = new CatboxRelayClient(RELAY_ORIGIN, timedOutRequest);
    await expect(timedOutClient.upload(webpFile(), imageOptions())).rejects.toThrow(
      "file may already be public",
    );
    expect(timedOutRequest).toHaveBeenCalledOnce();

    const unknownFailure = new CatboxRelayClient(
      RELAY_ORIGIN,
      vi.fn<typeof fetch>(async () => { throw new Error("stream failed"); }),
    );
    await expect(unknownFailure.upload(webpFile(), imageOptions())).rejects.toThrow(
      "file may already be public",
    );

    const serverFailure = new CatboxRelayClient(
      RELAY_ORIGIN,
      vi.fn<typeof fetch>(async () => new Response(null, { status: 503 })),
    );
    await expect(serverFailure.upload(webpFile(), imageOptions())).rejects.toThrow(
      "file may already be public",
    );
  });

  it("rejects oversized responses, unexpected URLs, bad origins, and mismatched files", async () => {
    mockRelayAuthorization();
    const oversized = new CatboxRelayClient(
      RELAY_ORIGIN,
      vi.fn<typeof fetch>(async () => new Response("x".repeat(4_097))),
    );
    await expect(oversized.upload(webpFile(), imageOptions())).rejects.toThrow(
      "file may already be public",
    );

    expect(normalizeRelayUploadResponse(JSON.stringify({
      url: "https://files.catbox.moe/file.webp?token=secret",
    }))).toBeNull();
    expect(normalizeRelayUploadResponse(JSON.stringify({
      url: "https://evil.example/file.webp",
    }))).toBeNull();
    expect(normalizeRelayUploadResponse(JSON.stringify({
      url: "https://files.catbox.moe:444/file.webp",
    }))).toBeNull();
    const wrongExtension = new CatboxRelayClient(
      RELAY_ORIGIN,
      vi.fn<typeof fetch>(async () =>
        Response.json({ url: "https://files.catbox.moe/track.ogg" })),
    );
    await expect(wrongExtension.upload(
      new File([Uint8Array.of(1)], "track.mp3", { type: "audio/mpeg" }),
      { kind: "audio", extension: "mp3", timeoutMs: 30_000 },
    )).rejects.toThrow("unexpected link");
    await expect(new CatboxRelayClient(RELAY_ORIGIN).upload(
      new File([Uint8Array.of(1)], "fake.webp", { type: "image/png" }),
      imageOptions(),
    )).rejects.toThrow("prepared image is invalid");
  });

  it("does no work when already cancelled and rejects a blocked verification popup", async () => {
    const request = vi.fn<typeof fetch>();
    const open = vi.spyOn(window, "open");
    const controller = new AbortController();
    controller.abort();

    await expect(new CatboxRelayClient(RELAY_ORIGIN, request).upload(
      webpFile(),
      { ...imageOptions(), signal: controller.signal },
    )).rejects.toThrow("upload was cancelled");
    expect(open).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();

    open.mockReturnValue(null);
    await expect(new CatboxRelayClient(RELAY_ORIGIN, request).upload(
      webpFile(),
      imageOptions(),
    )).rejects.toThrow("Allow the KikiLink verification popup");
    expect(request).not.toHaveBeenCalled();
  });

  it("ignores session messages with the wrong origin, popup, or state", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      Response.json({ url: "https://files.catbox.moe/safe.webp" }));
    vi.spyOn(window, "open").mockImplementation((value) => {
      const popup = { closed: false, close: vi.fn() } as unknown as Window;
      const otherPopup = { closed: false, close: vi.fn() } as unknown as Window;
      const authorizeUrl = new URL(String(value));
      const state = new URLSearchParams(authorizeUrl.hash.slice(1)).get("state");
      const message = {
        type: "kikilink:catbox-relay-session:v1",
        state,
        token: "A".repeat(43),
        expiresAt: Date.now() + 10 * 60_000,
      };
      queueMicrotask(() => {
        window.dispatchEvent(new MessageEvent("message", {
          origin: "https://evil.example",
          source: popup,
          data: message,
        }));
        window.dispatchEvent(new MessageEvent("message", {
          origin: authorizeUrl.origin,
          source: otherPopup,
          data: message,
        }));
        window.dispatchEvent(new MessageEvent("message", {
          origin: authorizeUrl.origin,
          source: popup,
          data: { ...message, state: "B".repeat(43) },
        }));
        window.dispatchEvent(new MessageEvent("message", {
          origin: authorizeUrl.origin,
          source: popup,
          data: message,
        }));
      });
      return popup;
    });

    await expect(new CatboxRelayClient(RELAY_ORIGIN, request).upload(
      webpFile(),
      imageOptions(),
    )).resolves.toBe("https://files.catbox.moe/safe.webp");
    expect(request).toHaveBeenCalledOnce();
  });

  it("closes the verification popup when the caller cancels", async () => {
    const close = vi.fn();
    vi.spyOn(window, "open").mockReturnValue({ closed: false, close } as unknown as Window);
    const request = vi.fn<typeof fetch>();
    const controller = new AbortController();
    const upload = new CatboxRelayClient(RELAY_ORIGIN, request).upload(
      webpFile(),
      { ...imageOptions(), signal: controller.signal },
    );
    const result = expect(upload).rejects.toThrow("upload was cancelled");

    controller.abort();
    await result;
    expect(close).toHaveBeenCalledOnce();
    expect(request).not.toHaveBeenCalled();
  });

  it("keeps timeout and cancellation active while reading the relay response", async () => {
    vi.useFakeTimers();
    try {
      mockRelayAuthorization();
      const cancelled = vi.fn();
      const request = vi.fn<typeof fetch>(async () => new Response(
        new ReadableStream<Uint8Array>({ cancel: cancelled }),
        { status: 200 },
      ));
      const client = new CatboxRelayClient(RELAY_ORIGIN, request);

      const controller = new AbortController();
      const cancelledUpload = client.upload(webpFile(), {
        ...imageOptions(),
        signal: controller.signal,
      });
      const cancelledResult = expect(cancelledUpload).rejects.toThrow("upload was cancelled");
      await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
      controller.abort();
      await cancelledResult;
      expect(cancelled).toHaveBeenCalledOnce();

      const timedOut = vi.fn();
      request.mockResolvedValueOnce(new Response(
        new ReadableStream<Uint8Array>({ cancel: timedOut }),
        { status: 200 },
      ));
      const timedUpload = client.upload(webpFile(), {
        ...imageOptions(),
        timeoutMs: 1_000,
      });
      const timedResult = expect(timedUpload).rejects.toThrow("upload timed out");
      await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
      await vi.advanceTimersByTimeAsync(1_000);
      await timedResult;
      expect(timedOut).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects an overlong session and closes a verification popup on timeout", async () => {
    vi.useFakeTimers();
    try {
      const close = vi.fn();
      vi.spyOn(window, "open").mockImplementation((value) => {
        const popup = { closed: false, close } as unknown as Window;
        const authorizeUrl = new URL(String(value));
        const state = new URLSearchParams(authorizeUrl.hash.slice(1)).get("state");
        queueMicrotask(() => {
          window.dispatchEvent(new MessageEvent("message", {
            origin: authorizeUrl.origin,
            source: popup,
            data: {
              type: "kikilink:catbox-relay-session:v1",
              state,
              token: "A".repeat(43),
              expiresAt: Date.now() + 12 * 60_000,
            },
          }));
        });
        return popup;
      });
      const request = vi.fn<typeof fetch>();
      const upload = new CatboxRelayClient(RELAY_ORIGIN, request).upload(
        webpFile(),
        imageOptions(),
      );
      const result = expect(upload).rejects.toThrow("verification timed out");
      await vi.advanceTimersByTimeAsync(2 * 60_000);
      await result;
      expect(close).toHaveBeenCalledOnce();
      expect(request).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails closed before popup or network work when the relay is disabled", async () => {
    const open = vi.spyOn(window, "open");
    const request = vi.fn<typeof fetch>();

    await expect(new CatboxRelayClient("", request).upload(
      webpFile(),
      imageOptions(),
    )).rejects.toThrow("unavailable in FUSAM");
    await expect(new CatboxRelayClient(`${RELAY_ORIGIN}:444`, request).upload(
      webpFile(),
      imageOptions(),
    )).rejects.toThrow("unavailable in FUSAM");
    expect(open).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("accepts only exact HTTPS Bondage Club origins without custom ports", () => {
    expect(isAllowedBondageClubOrigin("https://www.bondageprojects.com")).toBe(true);
    expect(isAllowedBondageClubOrigin("https://bc.bondage-europe.com")).toBe(true);
    expect(isAllowedBondageClubOrigin("https://www.bondageeurope.com")).toBe(true);
    expect(isAllowedBondageClubOrigin("https://www.bondage-asia.com")).toBe(true);
    expect(isAllowedBondageClubOrigin("http://www.bondageprojects.com")).toBe(false);
    expect(isAllowedBondageClubOrigin("https://bondageprojects.com")).toBe(false);
    expect(isAllowedBondageClubOrigin("https://www.bondageprojects.com:444")).toBe(false);
    expect(isAllowedBondageClubOrigin("https://www.bondageprojects.com.evil.example")).toBe(false);
  });
});

function imageOptions(): {
  kind: "image";
  extension: "webp";
  timeoutMs: number;
} {
  return { kind: "image", extension: "webp", timeoutMs: 30_000 };
}

function webpFile(): File {
  return new File([Uint8Array.of(0x52, 0x49, 0x46, 0x46)], "kikilink-image.webp", {
    type: "image/webp",
  });
}

function mockRelayAuthorization(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(window, "open").mockImplementation((value) => {
    const popup = {
      closed: false,
      close: vi.fn(),
    } as unknown as Window;
    const authorizeUrl = new URL(String(value));
    const hash = new URLSearchParams(authorizeUrl.hash.slice(1));
    expect(hash.get("origin")).toBe(window.location.origin);
    const state = hash.get("state");
    queueMicrotask(() => {
      window.dispatchEvent(new MessageEvent("message", {
        origin: authorizeUrl.origin,
        source: popup,
        data: {
          type: "kikilink:catbox-relay-session:v1",
          state,
          token: "A".repeat(43),
          expiresAt: Date.now() + 10 * 60_000,
        },
      }));
    });
    return popup;
  });
}
