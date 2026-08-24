import type { BCAdapter } from "../../bc/adapter";
import type { BeepEvent, PresenceStatus } from "../../core/types";

const SENDER_COOLDOWN_MS = 30 * 60_000;
const GLOBAL_WINDOW_MS = 60_000;
const MAX_REPLIES_PER_WINDOW = 5;
const MAX_REPLY_LENGTH = 1_000;

export interface AfkAutoReplyConfig {
  enabled: boolean;
  message: string;
}

export interface AfkAutoReplyCallbacks {
  getStatus(): PresenceStatus;
  getConfig(): AfkAutoReplyConfig;
  now?(): number;
}

type BeepSender = Pick<BCAdapter, "sendBeep">;

/**
 * Sends a bounded plain Beep response while the local KikiLink presence is Idle.
 *
 * Call `syncStatus` whenever local presence changes. `handleIncoming` also synchronizes status,
 * but the explicit call is what lets the service observe an Online -> Idle transition that occurs
 * between incoming messages.
 */
export class AfkAutoReplyService {
  readonly #repliedThisIdle = new Set<number>();
  readonly #lastReplyAt = new Map<number, number>();
  readonly #recentReplyTimes: number[] = [];
  readonly #now: () => number;
  #idleSessionActive = false;

  constructor(
    private readonly adapter: BeepSender,
    private readonly callbacks: AfkAutoReplyCallbacks,
  ) {
    const clock = callbacks.now;
    this.#now = clock ? () => clock.call(callbacks) : Date.now;
  }

  syncStatus(): void {
    try {
      this.#applyStatus(this.callbacks.getStatus());
    } catch {
      this.#applyStatus("online");
    }
  }

  handleIncoming(event: BeepEvent): BeepEvent | undefined {
    if (event.direction !== "incoming" || !validMemberNumber(event.peerNumber)) return undefined;

    let status: PresenceStatus;
    let config: AfkAutoReplyConfig;
    try {
      status = this.callbacks.getStatus();
      config = this.callbacks.getConfig();
    } catch {
      return undefined;
    }
    this.#applyStatus(status);
    if (status !== "idle" || config.enabled !== true) return undefined;

    const message = normalizeReplyMessage(config.message);
    if (!message || this.#repliedThisIdle.has(event.peerNumber)) return undefined;

    const now = this.#safeNow();
    this.#prune(now);
    const lastReplyAt = this.#lastReplyAt.get(event.peerNumber);
    if (lastReplyAt !== undefined && now - lastReplyAt < SENDER_COOLDOWN_MS) return undefined;
    if (this.#recentReplyTimes.length >= MAX_REPLIES_PER_WINDOW) return undefined;

    // Reserve synchronously so re-entrant delivery cannot produce duplicate replies.
    this.#repliedThisIdle.add(event.peerNumber);
    try {
      const sent = this.adapter.sendBeep(event.peerNumber, message, false);
      this.#lastReplyAt.set(event.peerNumber, now);
      this.#recentReplyTimes.push(now);
      return sent;
    } catch {
      this.#repliedThisIdle.delete(event.peerNumber);
      return undefined;
    }
  }

  reset(): void {
    this.#idleSessionActive = false;
    this.#repliedThisIdle.clear();
    this.#lastReplyAt.clear();
    this.#recentReplyTimes.splice(0);
  }

  #applyStatus(status: PresenceStatus): void {
    const idle = status === "idle";
    if (idle === this.#idleSessionActive) return;
    this.#idleSessionActive = idle;
    this.#repliedThisIdle.clear();
  }

  #safeNow(): number {
    const now = this.#now();
    return Number.isFinite(now) && now >= 0 ? now : Date.now();
  }

  #prune(now: number): void {
    while (
      this.#recentReplyTimes.length > 0 &&
      now - (this.#recentReplyTimes[0] ?? now) >= GLOBAL_WINDOW_MS
    ) {
      this.#recentReplyTimes.shift();
    }
    for (const [memberNumber, repliedAt] of this.#lastReplyAt) {
      if (now - repliedAt >= SENDER_COOLDOWN_MS) this.#lastReplyAt.delete(memberNumber);
    }
  }
}

function normalizeReplyMessage(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_REPLY_LENGTH);
}

function validMemberNumber(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
