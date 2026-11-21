import { describe, expect, it, vi } from "vitest";
import { requestExternalFile } from "../src/modules/link-chat/external-file-request";
import { uploadTemporaryFile } from "../src/modules/link-chat/temporary-file-host";

vi.mock("../src/modules/link-chat/external-file-request", () => ({ requestExternalFile: vi.fn() }));

const id = "14e1435a-da15-40d1-9b19-e7157dd62a8d";
const url = `https://waifuvault.moe/f/${id}/kikilink-media.webp`;
const webp = new File(["local bytes"], "Private original name.webp", { type: "image/webp" });

describe("temporary WaifuVault media", () => {
  it.each(["1h", "12h", "24h", "72h"] as const)("requests %s and confirms the returned public link and lifetime", async retention => {
    const hours = Number.parseInt(retention, 10);
    const uploadOptions = vi.mocked(requestExternalFile);
    uploadOptions.mockClear();
    uploadOptions.mockResolvedValueOnce(JSON.stringify({ url, retentionPeriod: hours * 3_600_000 - 10 }));
    const signal = new AbortController().signal;
    const progress = vi.fn();
    await expect(uploadTemporaryFile(webp, "webp", retention, progress, signal)).resolves.toBe(url);
    expect(uploadOptions).toHaveBeenCalledWith(expect.objectContaining({
      method: "PUT", url: `https://waifuvault.moe/rest?expires=${retention}&formatted=false`,
      body: expect.any(FormData), onProgress: progress, signal,
    }));
    const form = uploadOptions.mock.calls.at(-1)?.[0].body as FormData;
    const prepared = form.get("file");
    expect(prepared).toBeInstanceOf(File);
    expect((prepared as File).name).toBe("kikilink-media.webp");
    expect(await (prepared as File).text()).toBe("local bytes");
    expect([...form.keys()]).toEqual(["file"]);
  });

  it.each([null, "1 hour", 30_000, 3_600_001])("rejects a missing or mismatched reported lifetime %s", async retentionPeriod => {
    vi.mocked(requestExternalFile).mockResolvedValueOnce(JSON.stringify({ url, retentionPeriod }));
    await expect(uploadTemporaryFile(webp, "webp", "1h")).rejects.toThrow("different lifetime");
  });

  it.each([
    `https://waifuvault.moe.example/f/${id}/kikilink-media.webp`,
    `https://waifuvault.moe/p/${id}/kikilink-media.webp`,
    `https://waifuvault.moe/f/${id}/kikilink-media.png`,
    `https://waifuvault.moe/f/${id}/kikilink-media.webp?other=1`,
    `https://waifuvault.moe/f/${id}/Original-name.webp`,
  ])("rejects an unexpected returned link", async returned => {
    vi.mocked(requestExternalFile).mockResolvedValueOnce(JSON.stringify({ url: returned, retentionPeriod: 3_600_000 }));
    await expect(uploadTemporaryFile(webp, "webp", "1h")).rejects.toThrow("unexpected file link");
  });

  it("allows MP3 and MP4 only for temporary audio and bounds it independently from images", async () => {
    const request = vi.mocked(requestExternalFile);
    request.mockClear();
    const audio = new Blob(["audio bytes"]);
    Object.defineProperty(audio, "size", { value: 20 * 1024 ** 2 });
    const mp3Url = `https://waifuvault.moe/f/${id}/kikilink-media.mp3`;
    request.mockResolvedValueOnce(JSON.stringify({ url: mp3Url, retentionPeriod: 3_600_000 }));
    await expect(uploadTemporaryFile(audio, "mp3", "1h")).resolves.toBe(mp3Url);
    await expect(uploadTemporaryFile(audio, "flac", "1h")).rejects.toThrow("an MP3, or an MP4");
    const oversized = new Blob(["audio bytes"]);
    Object.defineProperty(oversized, "size", { value: 20 * 1024 ** 2 + 1 });
    await expect(uploadTemporaryFile(oversized, "mp4", "1h")).rejects.toThrow("up to 20 MB");
    expect(request).toHaveBeenCalledOnce();
  });
});
