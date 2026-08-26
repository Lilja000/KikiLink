// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  DeviceMusicStore,
  validateMusicFile,
} from "../src/storage/device-music-store";

describe("DeviceMusicStore", () => {
  it("stores full-length tracks only on the current device and supports deletion", async () => {
    const store = new DeviceMusicStore(987654);
    const saved = await store.add(
      new File([new Uint8Array([1, 2, 3, 4])], "private-song.ogg", { type: "audio/ogg" }),
    );

    expect(saved).toMatchObject({ name: "private-song", mimeType: "audio/ogg" });
    expect((await store.get(saved.id))?.blob.size).toBe(4);
    expect(await store.list()).toHaveLength(1);
    await store.delete(saved.id);
    expect(await store.list()).toHaveLength(0);
    store.close();
  });

  it("rejects non-audio files", () => {
    expect(() => validateMusicFile(new File(["text"], "notes.txt", { type: "text/plain" })))
      .toThrow("audio file");
  });
});
