import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareSharedImage, uploadSharedAudio, uploadSharedImage } from "../src/cloud/public-files";
import { prepareLocalImage, type PreparedLocalImage } from "../src/modules/link-chat/image-upload";
import { uploadDurableFile } from "../src/modules/link-chat/durable-file-host";
import { uploadTemporaryFile } from "../src/modules/link-chat/temporary-file-host";

vi.mock("../src/modules/link-chat/durable-file-host", () => ({ uploadDurableFile: vi.fn() }));
vi.mock("../src/modules/link-chat/temporary-file-host", () => ({ uploadTemporaryFile: vi.fn() }));

const image: PreparedLocalImage = { blob: new Blob(["picture"], { type: "image/webp" }), width: 10, height: 10, sourceBytes: 7 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(uploadDurableFile).mockResolvedValue("https://durable.example/image.webp");
  vi.mocked(uploadTemporaryFile).mockResolvedValue("https://temporary.example/file");
});

describe("shared external files", () => {
  it.each(["1h", "12h", "24h", "72h"] as const)("routes %s images and room music without a Cloud session", async retention => {
    const progress = vi.fn(), signal = new AbortController().signal;
    await expect(uploadSharedImage(image, retention, progress, signal)).resolves.toContain("temporary.example");
    expect(uploadTemporaryFile).toHaveBeenLastCalledWith(image.blob, "webp", retention, progress, signal);
    const file = new File(["audio"], "music.mp3", { type: "audio/mpeg" });
    await uploadSharedAudio(file, retention, progress, signal);
    expect(uploadTemporaryFile).toHaveBeenLastCalledWith(file, "mp3", retention, progress, signal);
    expect(uploadDurableFile).not.toHaveBeenCalled();
  });

  it("preserves image preparation and routes permanent images and playlist audio to the durable host", async () => {
    expect(prepareSharedImage).toBe(prepareLocalImage);
    const progress = vi.fn(), signal = new AbortController().signal;
    await expect(uploadSharedImage(image, "durable", progress, signal)).resolves.toContain("durable.example");
    expect(uploadDurableFile).toHaveBeenLastCalledWith(image.blob, "webp", progress, signal);
    const ogg = new File(["audio"], "file.oga", { type: "audio/ogg" });
    await uploadSharedAudio(ogg, "durable", progress, signal);
    expect(uploadDurableFile).toHaveBeenLastCalledWith(ogg, "ogg", progress, signal);
    expect(uploadTemporaryFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported types and oversize files before contacting either host", async () => {
    const mp3 = new File(["x"], "track.mp3");
    const oversized = (size: number) => Object.defineProperty(mp3, "size", { value:size, configurable:true });
    await expect(uploadSharedAudio(oversized(20 * 1024 ** 2 + 1), "1h")).rejects.toThrow("20 MB");
    await expect(uploadSharedAudio(oversized(80 * 1024 ** 2 + 1), "durable")).rejects.toThrow("80 MB");
    await expect(uploadSharedAudio(new File(["x"], "track.flac"), "24h")).rejects.toThrow("MP3 or MP4");
    await expect(uploadSharedAudio(new File([], "file.mp3"), "durable")).rejects.toThrow("non-empty");
    for (const blob of [new Blob(["x"], { type:"image/png" }), new Blob([], { type:"image/webp" }),
      Object.defineProperty(new Blob(["x"], { type:"image/webp" }), "size", { value:8 * 1024 ** 2 + 1 })]) {
      await expect(uploadSharedImage({ ...image, blob }, "durable")).rejects.toThrow("WebP");
    }
    expect(uploadTemporaryFile).not.toHaveBeenCalled();
    expect(uploadDurableFile).not.toHaveBeenCalled();
  });

  it("accepts files exactly at each supported size limit", async () => {
    const imageBlob = Object.defineProperty(new Blob(["x"], { type: "image/webp" }), "size", { value: 8 * 1024 ** 2 });
    const temporary = Object.defineProperty(new File(["audio"], "room.mp4"), "size", { value: 20 * 1024 ** 2 });
    const durable = Object.defineProperty(new File(["track"], "song.flac"), "size", { value: 80 * 1024 ** 2 });
    await uploadSharedImage({ ...image, blob: imageBlob }, "1h");
    expect(uploadTemporaryFile).toHaveBeenCalledWith(imageBlob, "webp", "1h", undefined, undefined);
    await uploadSharedAudio(temporary, "72h");
    expect(uploadTemporaryFile).toHaveBeenCalledWith(temporary, "mp4", "72h", undefined, undefined);
    await uploadSharedAudio(durable, "durable");
    expect(uploadDurableFile).toHaveBeenCalledWith(durable, "flac", undefined, undefined);
  });

  it("preserves cancelled and failed uploads without sending to a second location", async () => {
    await expect(uploadSharedImage(image, "durable", undefined, AbortSignal.abort())).rejects.toMatchObject({ name:"AbortError" });
    expect(uploadDurableFile).not.toHaveBeenCalled();
    const problem = new Error("Temporary upload unavailable");
    vi.mocked(uploadTemporaryFile).mockRejectedValueOnce(problem);
    await expect(uploadSharedImage(image, "12h")).rejects.toBe(problem);
    expect(uploadTemporaryFile).toHaveBeenCalledOnce();
    expect(uploadDurableFile).not.toHaveBeenCalled();
  });
});
