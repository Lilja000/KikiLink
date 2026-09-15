import { afterEach, expect, it, vi } from "vitest";
import { IndexedDbCloudDeviceStore } from "../src/cloud/device-key";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("abandons a stalled device database and closes a late connection", async () => {
  vi.useFakeTimers();
  const close = vi.fn();
  const request = { result: { close } } as unknown as IDBOpenDBRequest;
  vi.stubGlobal("indexedDB", { open: () => request });
  const store = new IndexedDbCloudDeviceStore(
    "https://cloud.example.test",
    101,
  );
  const result = expect(store.load()).rejects.toThrow(
    "device_storage_unavailable",
  );
  await vi.advanceTimersByTimeAsync(2001);
  await result;
  request.onsuccess?.call(request, new Event("success"));
  expect(close).toHaveBeenCalledTimes(1);
});

it("aborts a stalled device transaction so storage cannot hold up automatic login", async () => {
  vi.useFakeTimers();
  const abort = vi.fn(),
    close = vi.fn();
  const tx = { abort, objectStore: () => ({ get: () => ({}) }) };
  const request = {
    result: { close, transaction: () => tx },
  } as unknown as IDBOpenDBRequest;
  vi.stubGlobal("indexedDB", {
    open: () => {
      queueMicrotask(() =>
        request.onsuccess?.call(request, new Event("success")),
      );
      return request;
    },
  });
  const store = new IndexedDbCloudDeviceStore(
    "https://cloud.example.test",
    101,
  );
  const result = expect(store.load()).rejects.toThrow(
    "device_storage_unavailable",
  );
  await vi.advanceTimersByTimeAsync(2001);
  await result;
  expect(abort).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
});
