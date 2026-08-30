// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  DeviceMusicStore,
  MAX_LOCAL_MUSIC_TOTAL_BYTES,
  MAX_LOCAL_MUSIC_TRACKS,
  assertMusicStorageCapacity,
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

  it("remembers whether a local file can later be shared as BC room music", async () => {
    const store = new DeviceMusicStore(987655);
    const mp3 = await store.add(
      new File([new Uint8Array([1, 2, 3])], "private-song.mp3", { type: "" }),
    );
    const ogg = await store.add(
      new File([new Uint8Array([4, 5, 6])], "other-song.ogg", { type: "audio/ogg" }),
    );

    expect(mp3.roomExtension).toBe("mp3");
    expect(ogg.roomExtension).toBeUndefined();
    store.close();
  });

  it("removes unreferenced blobs while preserving referenced and staged tracks", async () => {
    const store = new DeviceMusicStore(987656);
    const referenced = await store.add(
      new File([new Uint8Array([1])], "referenced.ogg", { type: "audio/ogg" }),
    );
    const orphaned = await store.add(
      new File([new Uint8Array([2])], "orphaned.ogg", { type: "audio/ogg" }),
    );
    const staged = await store.add(
      new File([new Uint8Array([3])], "staged.ogg", { type: "audio/ogg" }),
    );
    store.releaseStaged(new Set([referenced.id, orphaned.id]));

    await expect(store.reconcile(
      new Set([referenced.id]),
      new Set([staged.id]),
    )).resolves.toEqual([orphaned.id]);
    expect((await store.list()).map((track) => track.id)).toEqual(
      expect.arrayContaining([referenced.id, staged.id]),
    );

    store.releaseStaged(new Set([staged.id]));
    await store.reconcile(new Set([referenced.id]));
    expect((await store.list()).map((track) => track.id)).toEqual([referenced.id]);
    store.close();
  });

  it("enforces aggregate count and byte quotas without changing the per-file limit", () => {
    expect(() => assertMusicStorageCapacity(MAX_LOCAL_MUSIC_TRACKS - 1, 0, 1))
      .not.toThrow();
    expect(() => assertMusicStorageCapacity(MAX_LOCAL_MUSIC_TRACKS, 0, 1))
      .toThrow("100 local tracks");
    expect(() => assertMusicStorageCapacity(0, MAX_LOCAL_MUSIC_TOTAL_BYTES - 1, 1))
      .not.toThrow();
    expect(() => assertMusicStorageCapacity(0, MAX_LOCAL_MUSIC_TOTAL_BYTES, 1))
      .toThrow("512 MB");
  });

  it("rejects non-audio files", () => {
    expect(() => validateMusicFile(new File(["text"], "notes.txt", { type: "text/plain" })))
      .toThrow("audio file");
  });
});
