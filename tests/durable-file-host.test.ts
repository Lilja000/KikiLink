import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadDurableFile } from "../src/modules/link-chat/durable-file-host";

const origin = "https://anondrop.net";
const key = "SyntheticOwnerKey01";
const id = "SyntheticPublicId02";
const registration = `<script>localStorage.setItem('userkey', '${key}')</script>`;
const share = `${origin}/${id}`;
const uploadResponse = `<a href="${share}">${share}</a>`;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("AnonDrop durable media", () => {
  it.each([["webp", "image/webp"], ["mp3", "audio/mpeg"], ["m4a", "audio/mp4"], ["ogg", "audio/ogg"]])(
    "returns the player URL for %s with its extension and no management key", async (format, mime) => {
      const rawPath = `/${id}/kikilink-media.${format}`;
      const progress = vi.fn();
      const source = new File(["media bytes"], `a private original name.${format}`, { type: mime });
      const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
        const endpoint = new URL(url);
        expect(endpoint.origin).toBe(origin);
        expect(init.credentials).toBe("omit");
        expect(init.redirect).toBe("error");
        if (endpoint.pathname === "/register") {
          expect(init.method).toBe("GET");
          expect(endpoint.searchParams.has("nonce")).toBe(true);
          return new Response(registration);
        }
        if (endpoint.pathname === "/upload") {
          expect(init.method).toBe("POST");
          expect(endpoint.searchParams.get("key")).toBe(key);
          const form = init.body as FormData;
          const file = form.get("file") as File;
          expect(Array.from(form.keys())).toEqual(["file"]);
          expect(file.name).toBe(`kikilink-media.${format}`);
          expect(file.type).toBe(mime);
          expect(await file.text()).toBe("media bytes");
          return new Response(uploadResponse);
        }
        expect(url).toBe(origin + rawPath);
        expect(init.method).toBe("GET");
        expect(init.referrerPolicy).toBe("no-referrer");
        expect(new Headers(init.headers).get("Range")).toBe("bytes=0-10");
        return new Response("media bytes", { status: 206, headers: { "Content-Type": mime } });
      });
      vi.stubGlobal("fetch", fetchMock);
      await expect(uploadDurableFile(source, format, progress)).resolves.toBe(origin + rawPath);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(progress).toHaveBeenLastCalledWith({ loaded: source.size, total: source.size, percent: 100 });
    },
  );

  it.each([
    `https://third-party.example/${id}`,
    `https://third-party.example/?url=${share}`,
    `${share}?key=${key}`,
    `${origin}/${key}`,
    `${share}\n${origin}/DifferentFile99`,
  ])("rejects invalid responses without reading an unexpected file URL", async badResponse => {
    const transport = vi.fn()
      .mockResolvedValueOnce(new Response(registration))
      .mockResolvedValueOnce(new Response(badResponse))
      .mockResolvedValueOnce(new Response("[]"));
    vi.stubGlobal("fetch", transport);
    await expect(uploadDurableFile(new Blob(["music"]), "mp3")).rejects.toThrow("could not confirm the uploaded file");
    expect(transport).toHaveBeenCalledTimes(3);
    expect(transport.mock.calls[2]?.[0]).toBe(origin + "/files?key=" + key);
  });

  it.each([
    new Response("media bytes", { headers: { "Content-Type": "text/html" } }),
    new Response("wrong bytes", { headers: { "Content-Type": "audio/mpeg" } }),
    new Response("med", { headers: { "Content-Type": "audio/mpeg" } }),
    new Response("", { status: 410 }),
  ])("rejects HTML, a mismatched prefix, truncated data and expired content", async response => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(registration))
      .mockResolvedValueOnce(new Response(uploadResponse))
      .mockResolvedValueOnce(response));
    await expect(uploadDurableFile(new Blob(["media bytes"]), "mp3")).rejects.toThrow("direct media link");
  });

  it.each([
    JSON.stringify({files: [{fileName: "kikilink-media.mp3", id}]}),
    `<a href="/${id}/kikilink-media.mp3">Download</a>`,
    `<a href="${share}">kikilink-media.mp3</a>`,
  ])("recovers a stored upload from its own file listing without uploading again", async list => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(registration))
      .mockRejectedValueOnce(new TypeError("Unexpected redirect"))
      .mockResolvedValueOnce(new Response(list))
      .mockResolvedValueOnce(new Response("music", {headers: {"Content-Type": "audio/mpeg"}}));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadDurableFile(new Blob(["music"]), "mp3")).resolves.toBe(share + "/kikilink-media.mp3");
    expect(fetchMock.mock.calls.map(call => call[1].method)).toEqual(["GET", "POST", "GET", "GET"]);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(origin + "/files?key=" + key);
  });

  it("stops reading after 16 verified bytes when the host ignores Range", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("01234567"));
        controller.enqueue(new TextEncoder().encode("89abcdef and additional track bytes"));
      }, cancel,
    });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(registration))
      .mockResolvedValueOnce(new Response(uploadResponse))
      .mockResolvedValueOnce(new Response(stream)));
    await expect(uploadDurableFile(new Blob(["0123456789abcdef remainder"]), "flac")).resolves.toBe(share + "/kikilink-media.flac");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each(["cancel", "timeout"])("aborts a stalled media read on %s", async mode => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const cancel = vi.fn();
    let started: () => void = () => {};
    const reading = new Promise<void>(resolve => { started = resolve; });
    const stream = new ReadableStream<Uint8Array>({ pull() { started(); }, cancel }, {highWaterMark: 0});
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(registration))
      .mockResolvedValueOnce(new Response(uploadResponse))
      .mockResolvedValueOnce(new Response(stream)));
    const check = expect(uploadDurableFile(new Blob(["music"]), "mp3", undefined, controller.signal))
      .rejects.toMatchObject({name: mode === "cancel" ? "AbortError" : "TimeoutError"});
    await reading;
    if (mode === "cancel") controller.abort();
    else await vi.advanceTimersByTimeAsync(30_001);
    await check;
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("redacts errors containing the owner key even if recovery also fails", async () => {
    const error = new Error(`Fetch failed using key=${key}`);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(registration))
      .mockRejectedValueOnce(error).mockRejectedValueOnce(error));
    await expect(uploadDurableFile(new Blob(["music"]), "aac")).rejects.toThrow(/^AnonDrop could not confirm the uploaded file\.$/u);
  });

  it("checks input and cancellation before any host request", async () => {
    const transport = vi.fn();
    vi.stubGlobal("fetch", transport);
    await expect(uploadDurableFile(new Blob(), "mp3")).rejects.toThrow("non-empty");
    await expect(uploadDurableFile(new Blob(["x"]), "html")).rejects.toThrow("supported audio");
    await expect(uploadDurableFile(new Blob(["x"], { type: "image/png" }), "webp")).rejects.toThrow("prepared WebP");
    await expect(uploadDurableFile(new Blob(["x"]), "mp3", undefined, AbortSignal.abort())).rejects.toMatchObject({ name: "AbortError" });
    expect(transport).not.toHaveBeenCalled();
  });
});
