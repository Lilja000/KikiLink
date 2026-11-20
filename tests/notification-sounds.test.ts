import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  NOTIFICATION_SOUND_LABELS,
  NOTIFICATION_SOUND_PATTERNS,
  NotificationSoundService,
} from "../src/modules/link-reactions/notification-sounds";

afterEach(() => {
  Reflect.deleteProperty(globalThis, "AudioContext");
});

describe("NotificationSoundService", () => {
  it("drops a locked automatic alert instead of playing it after a future gesture", async () => {
    const context = new FakeAudioContext();
    Reflect.defineProperty(globalThis, "AudioContext", { configurable: true, value: class { constructor() { return context; } } });
    const sounds = new NotificationSoundService();
    await expect(sounds.play("chime", { requireUnlocked: true })).resolves.toBe(false);
    expect(context.resume).not.toHaveBeenCalled();
    await sounds.unlock(); expect(context.createOscillator).not.toHaveBeenCalled();
    await expect(sounds.play("chime", { requireUnlocked: true })).resolves.toBe(true);
    await sounds.destroy();
  });
  it("coalesces concurrent audio attempts and cancels a late custom decode when muted", async () => {
    const context = new FakeAudioContext();
    Reflect.defineProperty(globalThis, "AudioContext", { configurable: true, value: class { constructor() { return context; } } });
    let finish!: (value: AudioBuffer) => void, valid = true;
    context.decodeAudioData.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const sounds = new NotificationSoundService(async () => new Blob([new Uint8Array([1])]));
    const first = sounds.play("custom:bell", { valid: () => valid });
    await vi.waitFor(() => expect(context.decodeAudioData).toHaveBeenCalledOnce());
    await expect(sounds.play("pop")).resolves.toBe(false);
    valid = false; finish({ duration: 1 } as AudioBuffer); await expect(first).resolves.toBe(false);
    expect(context.createBufferSource).not.toHaveBeenCalled(); await sounds.destroy();
  });
  it("does not create audio after destroy while a custom sound is loading", async () => {
    const context = new FakeAudioContext();
    Reflect.defineProperty(globalThis, "AudioContext", { configurable: true, value: class { constructor() { return context; } } });
    let finish!: (value: Blob) => void;
    const sounds = new NotificationSoundService(() => new Promise(resolve => { finish = resolve; }));
    const pending = sounds.play("custom:bell"); await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    await sounds.destroy(); finish(new Blob([new Uint8Array([1])])); await expect(pending).resolves.toBe(false);
    expect(context.createBufferSource).not.toHaveBeenCalled(); await expect(sounds.unlock()).resolves.toBe(false);
  });
  it("offers the Kiki recording alongside the synthesized presets", () => {
    expect(Object.keys(NOTIFICATION_SOUND_LABELS)).toEqual(["kiki", "chime", "sparkle", "pop"]);
    expect(NOTIFICATION_SOUND_PATTERNS.chime).toHaveLength(2);
    expect(NOTIFICATION_SOUND_PATTERNS.sparkle).toHaveLength(3);
    expect(NOTIFICATION_SOUND_PATTERNS.pop.some((note) => note.endFrequency)).toBe(true);
  });

  it("decodes the supplied Kiki recording once and plays it at the selected volume", async () => {
    const context = new FakeAudioContext();
    Reflect.defineProperty(globalThis, "AudioContext", { configurable: true, value: class { constructor() { return context; } } });
    const sounds = new NotificationSoundService();

    await sounds.unlock();
    expect(context.decodeAudioData).not.toHaveBeenCalled();
    await expect(sounds.play("kiki", { volume: 35, now: 1_000, requireUnlocked: true })).resolves.toBe(true);
    await expect(sounds.play("kiki", { volume: 50, now: 1_500, requireUnlocked: true })).resolves.toBe(true);
    expect(context.decodeAudioData).toHaveBeenCalledOnce();
    const [bytes] = context.decodeAudioData.mock.calls[0]!;
    expect(createHash("sha256").update(new Uint8Array(bytes)).digest("hex"))
      .toBe("16e6889df428ef52181bbf6acfa18118d7aaa4515e253f6903c9b7fcaf7eb721");
    expect(context.createBufferSource).toHaveBeenCalledTimes(2);
    expect(context.gainParams[0]?.setValueAtTime).toHaveBeenCalledWith(0.35, 2);
    expect(context.gainParams[1]?.setValueAtTime).toHaveBeenCalledWith(0.5, 2);
    expect(context.createOscillator).not.toHaveBeenCalled();
    await sounds.destroy();
  });

  it("uses the soft chime if the built-in recording cannot be decoded", async () => {
    const context = new FakeAudioContext();
    Reflect.defineProperty(globalThis, "AudioContext", { configurable: true, value: class { constructor() { return context; } } });
    context.decodeAudioData.mockRejectedValue(new Error("Unsupported"));
    const sounds = new NotificationSoundService();
    await expect(sounds.play("kiki")).resolves.toBe(true);
    expect(context.createBufferSource).not.toHaveBeenCalled();
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
    await sounds.destroy();
  });

  it("unlocks Web Audio, schedules a preset, and throttles rapid repeats", async () => {
    const context = new FakeAudioContext();
    Reflect.defineProperty(globalThis, "AudioContext", {
      configurable: true,
      value: class {
        constructor() {
          return context;
        }
      },
    });
    const sounds = new NotificationSoundService();

    await expect(sounds.play("sparkle", 1_000)).resolves.toBe(true);
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
    await expect(sounds.play("chime", 1_200)).resolves.toBe(false);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
    await expect(sounds.play("chime", 1_400)).resolves.toBe(true);
    expect(context.createOscillator).toHaveBeenCalledTimes(5);

    await sounds.destroy();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it("decodes a device sound once and applies the configured alert volume", async () => {
    const context = new FakeAudioContext();
    Reflect.defineProperty(globalThis, "AudioContext", {
      configurable: true,
      value: class {
        constructor() {
          return context;
        }
      },
    });
    const resolver = vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])], { type: "audio/ogg" }));
    const sounds = new NotificationSoundService(resolver);

    await expect(
      sounds.play("custom:soft-bell", { volume: 40, now: 1_000 }),
    ).resolves.toBe(true);
    expect(resolver).toHaveBeenCalledOnce();
    expect(context.decodeAudioData).toHaveBeenCalledOnce();
    expect(context.createBufferSource).toHaveBeenCalledOnce();
    expect(context.gainParams.at(-1)?.setValueAtTime).toHaveBeenCalledWith(0.4, 2);
  });
});

it('invalidates a cached missing custom file after import without starting playback',async()=>{const context=new FakeAudioContext();vi.stubGlobal('AudioContext',class{constructor(){return context;}});let available=false;const resolve=vi.fn(async()=>available?new Blob(['sound']):undefined),sounds=new NotificationSoundService(resolve);await expect(sounds.play('custom:restored',1000)).resolves.toBe(false);available=true;await expect(sounds.play('custom:restored',2000)).resolves.toBe(false);expect(resolve).toHaveBeenCalledOnce();sounds.clearCustomCache();expect(context.createBufferSource).not.toHaveBeenCalled();expect(context.createOscillator).not.toHaveBeenCalled();await expect(sounds.play('custom:restored',3000)).resolves.toBe(true);expect(resolve).toHaveBeenCalledTimes(2);expect(context.createBufferSource).toHaveBeenCalledOnce();await sounds.destroy();vi.unstubAllGlobals();});

class FakeAudioContext {
  state: AudioContextState = "suspended";
  currentTime = 2;
  destination = {} as AudioDestinationNode;
  readonly resume = vi.fn(async () => {
    this.state = "running";
  });
  readonly close = vi.fn(async () => {
    this.state = "closed";
  });
  readonly gainParams: AudioParam[] = [];
  readonly decodeAudioData = vi.fn(async (_bytes: ArrayBuffer) => ({ duration: 4.2 }) as AudioBuffer);
  readonly createBufferSource = vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  })) as unknown as AudioContext["createBufferSource"];
  readonly createOscillator = vi.fn(() => ({
    type: "sine" as OscillatorType,
    frequency: fakeAudioParam(),
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })) as unknown as AudioContext["createOscillator"];
  readonly createGain = vi.fn(() => {
    const gain = fakeAudioParam();
    this.gainParams.push(gain);
    return { gain, connect: vi.fn() };
  }) as unknown as AudioContext["createGain"];
}

function fakeAudioParam(): AudioParam {
  return {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  } as unknown as AudioParam;
}
