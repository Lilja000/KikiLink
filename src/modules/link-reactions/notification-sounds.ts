import type { NotificationSoundChoice, NotificationSoundPreset } from "../../core/types";
import { isNotificationSoundPreset } from "../../core/sound-settings-import";
import kikiSoundDataUrl from "./01_Kiki.mp3?inline";

interface SoundNote {
  offset: number;
  duration: number;
  frequency: number;
  endFrequency?: number;
  gain: number;
  wave: OscillatorType;
}

export const NOTIFICATION_SOUND_LABELS: Record<NotificationSoundPreset, string> = {
  kiki: "Kiki",
  chime: "Soft chime",
  sparkle: "Sakura sparkle",
  pop: "Gentle pop",
};

export const NOTIFICATION_SOUND_PATTERNS: Record<
  Exclude<NotificationSoundPreset, "kiki">,
  readonly SoundNote[]
> = {
  chime: [
    { offset: 0, duration: 0.22, frequency: 659.25, gain: 0.055, wave: "sine" },
    { offset: 0.11, duration: 0.32, frequency: 987.77, gain: 0.045, wave: "sine" },
  ],
  sparkle: [
    { offset: 0, duration: 0.13, frequency: 523.25, gain: 0.04, wave: "triangle" },
    { offset: 0.08, duration: 0.15, frequency: 659.25, gain: 0.045, wave: "triangle" },
    { offset: 0.16, duration: 0.2, frequency: 1046.5, gain: 0.04, wave: "sine" },
  ],
  pop: [
    {
      offset: 0,
      duration: 0.11,
      frequency: 330,
      endFrequency: 190,
      gain: 0.06,
      wave: "sine",
    },
    {
      offset: 0.13,
      duration: 0.09,
      frequency: 280,
      endFrequency: 170,
      gain: 0.045,
      wave: "sine",
    },
  ],
};

const SOUND_THROTTLE_MS = 350;

type AudioContextConstructor = new () => AudioContext;

export interface NotificationSoundPlayOptions {
  volume?: number;
  now?: number;
  /** Automatic alerts never wait for a future browser gesture. */
  requireUnlocked?: boolean;
  valid?: () => boolean;
}

export type CustomNotificationSoundResolver = (id: string) => Promise<Blob | undefined>;

export class NotificationSoundService {
  #context: AudioContext | undefined;
  #lastPlayedAt = Number.NEGATIVE_INFINITY;
  #busy = false;
  #destroyed = false;
  #kikiBuffer: Promise<AudioBuffer | undefined> | undefined;
  readonly #customBuffers = new Map<string, Promise<AudioBuffer | undefined>>();

  constructor(private readonly resolveCustomSound?: CustomNotificationSoundResolver) {}

  async unlock(): Promise<boolean> {
    const context = this.#getContext();
    if (!context) return false;
    try {
      if (context.state === "suspended") await context.resume();
      return !this.#destroyed && this.#context === context && context.state === "running";
    } catch {
      return false;
    }
  }

  async play(
    choice: NotificationSoundChoice,
    nowOrOptions: number | NotificationSoundPlayOptions = {},
  ): Promise<boolean> {
    const options = typeof nowOrOptions === "number" ? { now: nowOrOptions } : nowOrOptions;
    const now = options.now ?? Date.now();
    const volume = normalizedVolume(options.volume);
    const valid = () => !this.#destroyed && (options.valid?.() ?? true);
    if (!valid() || this.#busy || options.requireUnlocked && this.#context?.state !== "running") return false;
    if (now - this.#lastPlayedAt < SOUND_THROTTLE_MS) return false;
    if (volume === 0) return false;
    this.#busy = true;
    try {
      if (!isNotificationSoundPreset(choice)) return await this.#playCustom(choice.slice("custom:".length), volume, now, valid);
      if (!(await this.unlock()) || !valid()) return false;
      const context = this.#context;
      if (!context || context.state !== "running") return false;
      const buffer = choice === "kiki" ? await this.#getKikiBuffer(context) : undefined;
      if (!valid() || this.#context !== context || context.state !== "running") return false;
      if (buffer) {
        scheduleBuffer(context, buffer, volume / 100);
      } else {
        const startAt = context.currentTime + 0.01;
        for (const note of NOTIFICATION_SOUND_PATTERNS[choice === "kiki" ? "chime" : choice]) {
          scheduleNote(context, startAt, note, volume / 100);
        }
      }
      this.#lastPlayedAt = now;
      return true;
    } catch {
      return false;
    } finally { this.#busy = false; }
  }

  clearCustomCache(): void { this.#customBuffers.clear(); }

  async destroy(): Promise<void> {
    this.#destroyed = true;
    const context = this.#context;
    this.#context = undefined;
    this.#kikiBuffer = undefined;
    this.#customBuffers.clear();
    if (context && context.state !== "closed") {
      try {
        await context.close();
      } catch {
        // Releasing the view still succeeds when a browser refuses to close the audio context.
      }
    }
  }

  #getContext(): AudioContext | undefined {
    if (this.#destroyed) return undefined;
    if (this.#context && this.#context.state !== "closed") return this.#context;
    const scope = globalThis as typeof globalThis & {
      webkitAudioContext?: AudioContextConstructor;
    };
    const Constructor = globalThis.AudioContext ?? scope.webkitAudioContext;
    if (!Constructor) return undefined;
    try {
      this.#context = new Constructor();
      this.#kikiBuffer = undefined;
      return this.#context;
    } catch {
      return undefined;
    }
  }

  #getKikiBuffer(context: AudioContext): Promise<AudioBuffer | undefined> {
    this.#kikiBuffer ??= Promise.resolve().then(() => {
      const base64 = kikiSoundDataUrl.slice(kikiSoundDataUrl.indexOf(",") + 1);
      const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
      return context.decodeAudioData(bytes.buffer);
    }).catch(() => undefined);
    return this.#kikiBuffer;
  }

  async #playCustom(id: string, volume: number, now: number, valid: () => boolean): Promise<boolean> {
    if (!this.resolveCustomSound || !(await this.unlock())) return false;
    const context = this.#context;
    if (!context || typeof context.decodeAudioData !== "function") return false;
    try {
      const buffer = await this.#customBuffer(id, context);
      if (!buffer || !valid() || this.#context !== context || context.state !== "running") return false;
      scheduleBuffer(context, buffer, volume / 100);
      this.#lastPlayedAt = now;
      return true;
    } catch {
      return false;
    }
  }

  #customBuffer(id: string, context: AudioContext): Promise<AudioBuffer | undefined> {
    let pending = this.#customBuffers.get(id);
    if (!pending) {
      pending = this.resolveCustomSound!(id)
        .then(async (blob) =>
          blob ? context.decodeAudioData(await blob.arrayBuffer()) : undefined,
        )
        .catch(() => undefined);
      this.#customBuffers.set(id, pending);
    }
    return pending;
  }
}

function scheduleBuffer(context: AudioContext, buffer: AudioBuffer, volume: number): void {
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, context.currentTime);
  source.connect(gain);
  gain.connect(context.destination);
  source.onended = () => { source.disconnect(); gain.disconnect(); };
  source.start(context.currentTime + 0.01);
}

function scheduleNote(
  context: AudioContext,
  startAt: number,
  note: SoundNote,
  volume: number,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = startAt + note.offset;
  const end = start + note.duration;

  oscillator.type = note.wave;
  oscillator.frequency.setValueAtTime(note.frequency, start);
  if (note.endFrequency !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, end);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, note.gain * volume),
    start + Math.min(0.018, note.duration / 3),
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function normalizedVolume(value: number | undefined): number {
  if (value === undefined) return 100;
  if (!Number.isFinite(value)) return 100;
  return Math.min(100, Math.max(0, value));
}
