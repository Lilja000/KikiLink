// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeviceNotificationSoundStore,
  MAX_NOTIFICATION_SOUND_DURATION_MS,
} from "../src/storage/device-notification-sound-store";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DeviceNotificationSoundStore", () => {
  it("keeps a short custom sound in device-only storage and supports deletion", async () => {
    installMetadataAudio(4.2);
    const store = new DeviceNotificationSoundStore(999);
    const saved = await store.add(
      new File([new Uint8Array([1, 2, 3])], "soft-bell.ogg", { type: "audio/ogg" }),
    );

    expect(saved).toMatchObject({ name: "soft-bell", durationMs: 4_200 });
    expect((await store.get(saved.id))?.blob.size).toBe(3);
    expect(await store.list()).toHaveLength(1);

    await store.delete(saved.id);
    expect(await store.list()).toHaveLength(0);
    store.close();
  });

  it("rejects audio longer than five seconds before saving it", async () => {
    installMetadataAudio(MAX_NOTIFICATION_SOUND_DURATION_MS / 1_000 + 0.1);
    const store = new DeviceNotificationSoundStore(999);

    await expect(
      store.add(new File(["long"], "long.mp3", { type: "audio/mpeg" })),
    ).rejects.toThrow("at most 5 seconds");
    expect(await store.list()).toHaveLength(0);
    store.close();
  });
});

function installMetadataAudio(duration: number): void {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:kikilink-test");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  class MetadataAudio extends EventTarget {
    readonly duration = duration;
    preload = "";
    src = "";

    load(): void {
      queueMicrotask(() => this.dispatchEvent(new Event("loadedmetadata")));
    }

    removeAttribute(): void {
      this.src = "";
    }
  }
  vi.stubGlobal("Audio", MetadataAudio);
}
