// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeviceNotificationSoundStore,
  readAudioDurationMs,
  MAX_NOTIFICATION_SOUND_DURATION_MS,
  MAX_NOTIFICATION_SOUND_TOTAL_BYTES,
  MAX_NOTIFICATION_SOUNDS,
  assertNotificationSoundStorageCapacity,
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

  it("enforces bounded custom-sound count and aggregate bytes", () => {
    expect(() => assertNotificationSoundStorageCapacity(MAX_NOTIFICATION_SOUNDS - 1, 0, 1))
      .not.toThrow();
    expect(() => assertNotificationSoundStorageCapacity(MAX_NOTIFICATION_SOUNDS, 0, 1))
      .toThrow("24 custom sounds");
    expect(() => assertNotificationSoundStorageCapacity(
      0,
      MAX_NOTIFICATION_SOUND_TOTAL_BYTES - 1,
      1,
    )).not.toThrow();
    expect(() => assertNotificationSoundStorageCapacity(
      0,
      MAX_NOTIFICATION_SOUND_TOTAL_BYTES,
      1,
    )).toThrow("40 MB");
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

const metadataHarness=(kind='manual',duration=1)=>{
 const audio=new class extends EventTarget {duration=duration;preload='';src='';play=vi.fn();removeAttribute=vi.fn(()=>{this.src='';});load=vi.fn(()=>{if(kind==='throw')throw Error('load failure');if(kind==='metadata'&&this.src)queueMicrotask(()=>this.dispatchEvent(new Event('loadedmetadata')));});}();
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:metadata');const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});const create=vi.fn(function(){return audio;});vi.stubGlobal('Audio',create);return {audio,revoke,create};
};
it('metadata inspection releases resources without playback on completion',async()=>{const f=metadataHarness('metadata',0.5);await expect(readAudioDurationMs(new Blob(['x']))).resolves.toBe(500);expect(f.audio.play).not.toHaveBeenCalled();expect(f.revoke).toHaveBeenCalledOnce();expect(f.audio.src).toBe('');});
it('cancellation before inspection creates no audio or object URL',async()=>{const f=metadataHarness(),abort=new AbortController();abort.abort();await expect(readAudioDurationMs(new Blob(['x']),abort.signal)).rejects.toThrow('cancelled');expect(f.create).not.toHaveBeenCalled();expect(URL.createObjectURL).not.toHaveBeenCalled();});
it('cancels pending metadata, unloads the source and ignores a late event',async()=>{const f=metadataHarness(),abort=new AbortController(),pending=readAudioDurationMs(new Blob(['x']),abort.signal);abort.abort();await expect(pending).rejects.toThrow('cancelled');f.audio.dispatchEvent(new Event('loadedmetadata'));expect(f.revoke).toHaveBeenCalledOnce();expect(f.audio.src).toBe('');expect(f.audio.play).not.toHaveBeenCalled();});
it('times out a stalled metadata read and releases it exactly once',async()=>{vi.useFakeTimers();try{const f=metadataHarness(),pending=readAudioDurationMs(new Blob(['x'])),failed=expect(pending).rejects.toThrow('too long');await vi.advanceTimersByTimeAsync(12001);await failed;f.audio.dispatchEvent(new Event('loadedmetadata'));expect(f.revoke).toHaveBeenCalledOnce();}finally{vi.useRealTimers();}});
it.each([0,NaN,Infinity])('rejects unreadable duration %s and releases its URL',async duration=>{const f=metadataHarness('metadata',duration);await expect(readAudioDurationMs(new Blob(['x']))).rejects.toThrow('readable duration');expect(f.revoke).toHaveBeenCalledOnce();});
it('releases resources when load throws synchronously',async()=>{const f=metadataHarness('throw');await expect(readAudioDurationMs(new Blob(['x']))).rejects.toThrow('not supported');expect(f.revoke).toHaveBeenCalledOnce();});
