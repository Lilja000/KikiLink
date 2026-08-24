import type { NotificationSoundPreset } from "../../core/types";

interface SoundNote {
  offset: number;
  duration: number;
  frequency: number;
  endFrequency?: number;
  gain: number;
  wave: OscillatorType;
}

export const NOTIFICATION_SOUND_LABELS: Record<NotificationSoundPreset, string> = {
  chime: "Soft chime",
  sparkle: "Sakura sparkle",
  pop: "Gentle pop",
};

export const NOTIFICATION_SOUND_PATTERNS: Record<
  NotificationSoundPreset,
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

export class NotificationSoundService {
  #context: AudioContext | undefined;
  #lastPlayedAt = Number.NEGATIVE_INFINITY;

  async unlock(): Promise<boolean> {
    const context = this.#getContext();
    if (!context) return false;
    try {
      if (context.state === "suspended") await context.resume();
      return context.state !== "closed";
    } catch {
      return false;
    }
  }

  async play(preset: NotificationSoundPreset, now = Date.now()): Promise<boolean> {
    if (now - this.#lastPlayedAt < SOUND_THROTTLE_MS) return false;
    if (!(await this.unlock())) return false;
    const context = this.#context;
    if (!context) return false;

    try {
      const startAt = context.currentTime + 0.01;
      for (const note of NOTIFICATION_SOUND_PATTERNS[preset]) {
        scheduleNote(context, startAt, note);
      }
      this.#lastPlayedAt = now;
      return true;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    const context = this.#context;
    this.#context = undefined;
    if (context && context.state !== "closed") {
      try {
        await context.close();
      } catch {
        // Releasing the view still succeeds when a browser refuses to close the audio context.
      }
    }
  }

  #getContext(): AudioContext | undefined {
    if (this.#context && this.#context.state !== "closed") return this.#context;
    const scope = globalThis as typeof globalThis & {
      webkitAudioContext?: AudioContextConstructor;
    };
    const Constructor = globalThis.AudioContext ?? scope.webkitAudioContext;
    if (!Constructor) return undefined;
    try {
      this.#context = new Constructor();
      return this.#context;
    } catch {
      return undefined;
    }
  }
}

function scheduleNote(context: AudioContext, startAt: number, note: SoundNote): void {
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
  gain.gain.exponentialRampToValueAtTime(note.gain, start + Math.min(0.018, note.duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}
