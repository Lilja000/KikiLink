import { CloudError } from "./client";

export async function readProfileImage(source: string, kind: "avatar" | "banner"): Promise<Blob> {
  const url = new URL(source);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
    !url.hostname.includes(".") || /(^\d+\.\d+\.\d+\.\d+$|:|\.local$|\.localhost$)/iu.test(url.hostname)) throw new CloudError("invalid_image_url");
  const max = (kind === "avatar" ? 2 : 5) * 1024 ** 2;
  try {
    const response = await fetch(url, { credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(15000) });
    const type = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !/^image\/(png|jpeg|webp)$/u.test(type)) throw new Error("image");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("empty");
    const parts: Uint8Array<ArrayBuffer>[] = []; let bytes = 0;
    try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > max) throw new Error("large"); parts.push(part.value); } }
    finally { await reader.cancel().catch(() => {}); }
    return new Blob(parts, { type });
  } catch { throw new CloudError("image_import_failed"); }
}
