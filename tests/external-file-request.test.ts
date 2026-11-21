import { afterEach, describe, expect, it, vi } from "vitest";
import { requestExternalFile } from "../src/modules/link-chat/external-file-request";

const url = "https://upload.example/file";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("external file request", () => {
  it.each(["POST", "PUT"] as const)("sends one credentialless %s, with confirmed payload progress", async method => {
    const send = vi.fn(async () => new Response("uploaded"));
    vi.stubGlobal("fetch", send);
    const body = new Blob(["12345"]), progress = vi.fn();
    expect(await requestExternalFile({ url, method, body, onProgress:progress })).toBe("uploaded");
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(url, expect.objectContaining({
      method, body, credentials:"omit", redirect:"error", referrerPolicy:"no-referrer", mode:"cors",
    }));
    expect(progress.mock.calls).toEqual([[{ loaded:0, total:5, percent:0 }], [{ loaded:5, total:5, percent:100 }]]);
    const init = (send.mock.calls as unknown as Array<[string, RequestInit]>)[0]![1];
    expect([...new Headers(init.headers)]).toEqual([]);
  });

  it.each(["GET", "DELETE"] as const)("supports bodyless %s with explicit provider headers", async method => {
    const send = vi.fn<typeof fetch>(async () => new Response(null, { status:204 }));
    vi.stubGlobal("fetch", send);
    const progress = vi.fn();
    expect(await requestExternalFile({ url, method, headers:{ Accept:"application/json" }, onProgress:progress })).toBe("");
    const [, options] = send.mock.calls[0]!;
    expect(new Headers(options?.headers).get("Accept")).toBe("application/json");
    expect(options?.body).toBeUndefined();
    expect(progress).not.toHaveBeenCalled();
  });

  it("counts multipart file bytes independently of text fields and never sets its boundary", async () => {
    const send = vi.fn<typeof fetch>(async () => new Response("ok"));
    vi.stubGlobal("fetch", send);
    const form = new FormData(); form.set("destination","shared"); form.set("file",new Blob(["123"]), "file.webp");
    const progress = vi.fn();
    await requestExternalFile({ url, method:"POST", body:form, onProgress:progress });
    const bodyOptions=send.mock.calls[0]![1];
    expect(bodyOptions?.body).toBe(form);
    expect(new Headers(bodyOptions?.headers).get("Content-Type")).toBeNull();
    expect(progress).toHaveBeenLastCalledWith({ loaded:3, total:3, percent:100 });
  });

  it("sends UTF-8 strings and rejects a non-2xx response without reporting completion or retrying", async () => {
    const send = vi.fn(async () => new Response("unexpected contents", { status:413 }));
    vi.stubGlobal("fetch", send);
    const progress = vi.fn();
    await expect(requestExternalFile({ url, method:"POST", body:"ñ", onProgress:progress })).rejects.toMatchObject({ status:413 });
    expect(progress.mock.calls).toEqual([[{ loaded:0, total:2, percent:0 }]]);
    expect(send).toHaveBeenCalledOnce();
  });

  it("refuses credentials and unsafe URLs before sending", async () => {
    const send = vi.fn(); vi.stubGlobal("fetch", send);
    for (const address of ["http://upload.example/a", "https://x:y@upload.example/a", url+"#token"]) {
      await expect(requestExternalFile({ url:address, method:"GET" })).rejects.toThrow();
    }
    for (const name of ["Cookie","Authorization","Referer"]) {
      await expect(requestExternalFile({ url, method:"GET", headers:{ [name]:"private" } })).rejects.toThrow("Unexpected credentials");
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a redirected response even if a service worker supplied the final URL", async () => {
    const response = new Response("unexpected");
    Object.defineProperty(response, "url", { value:"https://somewhere.example/path" });
    const send = vi.fn(async () => response); vi.stubGlobal("fetch", send);
    await expect(requestExternalFile({ url, method:"GET" })).rejects.toThrow("redirect");
    expect(send).toHaveBeenCalledOnce();
  });

  it("rejects an excessive declared response length before reading it", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { headers: { "Content-Length": "1048577" } })));
    await expect(requestExternalFile({ url, method: "GET" })).rejects.toThrow("exceeds 1 MiB");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each([{}, { "Content-Length": "2" }])("limits streamed bytes even when headers omit or underreport the length", async headers => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024));
        controller.enqueue(new Uint8Array(1));
      },
      cancel,
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { headers: headers as Record<string,string> })));
    await expect(requestExternalFile({ url, method: "GET" })).rejects.toThrow("exceeds 1 MiB");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("accepts the full limit and decodes characters spanning chunks", async () => {
    const encoded=new TextEncoder().encode("ñ");
    const body=new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024 - 2).fill(120));
        controller.enqueue(encoded.subarray(0,1));
        controller.enqueue(encoded.subarray(1)); controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body)));
    const result=await requestExternalFile({ url, method:"GET" });
    expect(result.length).toBe(1024 * 1024 - 1);
    expect(result.endsWith("ñ")).toBe(true);
  });

  it("cancels before and during an upload, and separately reports timeout", async () => {
    vi.useFakeTimers();
    const send = vi.fn<typeof fetch>((_, options) => new Promise((_, reject) => {
      options?.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once:true });
    }));
    vi.stubGlobal("fetch", send);
    await expect(requestExternalFile({ url, method:"PUT", signal:AbortSignal.abort() })).rejects.toMatchObject({ name:"AbortError" });
    expect(send).not.toHaveBeenCalled();
    const controller=new AbortController();
    const sending=requestExternalFile({ url, method:"PUT", body:new Blob(["x"]), signal:controller.signal });
    controller.abort();
    await expect(sending).rejects.toMatchObject({ name:"AbortError" });
    const waiting=expect(requestExternalFile({ url, method:"GET", timeoutMs:25 })).rejects.toMatchObject({ name:"TimeoutError" });
    await vi.advanceTimersByTimeAsync(25); await waiting;
    expect(send).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
