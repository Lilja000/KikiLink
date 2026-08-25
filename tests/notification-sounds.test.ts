import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NOTIFICATION_SOUND_LABELS,
  NOTIFICATION_SOUND_PATTERNS,
  NotificationSoundService,
} from "../src/modules/link-reactions/notification-sounds";

afterEach(() => {
  Reflect.deleteProperty(globalThis, "AudioContext");
});

describe("NotificationSoundService", () => {
  it("provides three short, distinct built-in notification sounds", () => {
    expect(Object.keys(NOTIFICATION_SOUND_LABELS)).toEqual(["chime", "sparkle", "pop"]);
    expect(NOTIFICATION_SOUND_PATTERNS.chime).toHaveLength(2);
    expect(NOTIFICATION_SOUND_PATTERNS.sparkle).toHaveLength(3);
    expect(NOTIFICATION_SOUND_PATTERNS.pop.some((note) => note.endFrequency)).toBe(true);
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
  readonly decodeAudioData = vi.fn(async () => ({ duration: 4.2 }) as AudioBuffer);
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
