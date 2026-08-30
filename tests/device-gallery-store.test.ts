// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  DeviceGalleryStore,
  MAX_DEVICE_GALLERY_IMAGE_BYTES,
  deviceGalleryDatabaseName,
} from "../src/storage/device-gallery-store";

describe("DeviceGalleryStore", () => {
  it("uses a different durable IndexedDB database for every BC account", () => {
    expect(deviceGalleryDatabaseName(123456)).toBe("kikilink-device-gallery-123456");
    expect(deviceGalleryDatabaseName(211876)).toBe("kikilink-device-gallery-211876");
    expect(deviceGalleryDatabaseName(123456)).not.toBe(deviceGalleryDatabaseName(211876));
  });

  it("does not pretend a Gallery save is permanent when IndexedDB is unavailable", async () => {
    const store = new DeviceGalleryStore(123456);
    await expect(store.add({
      blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/webp" }),
      width: 640,
      height: 480,
    })).rejects.toThrow("Permanent Gallery storage is unavailable");
    store.close();
  });

  it("rejects invalid or oversized records before writing", async () => {
    const store = new DeviceGalleryStore(500001);
    await expect(store.add({
      blob: new Blob(["not webp"], { type: "text/plain" }),
      width: 1,
      height: 1,
    })).rejects.toThrow("WebP");
    await expect(store.add({
      blob: new Blob([new Uint8Array(MAX_DEVICE_GALLERY_IMAGE_BYTES + 1)], {
        type: "image/webp",
      }),
      width: 1,
      height: 1,
    })).rejects.toThrow("smaller than 8 MB");
    store.close();
  });
});
