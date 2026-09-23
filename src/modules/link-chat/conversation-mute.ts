import { formatNumericDateTime } from "../../core/time-format";

export const MUTE_DURATIONS = [
  ["15 minutes", 15 * 60_000], ["1 hour", 3_600_000], ["8 hours", 8 * 3_600_000],
  ["24 hours", 24 * 3_600_000], ["Until I turn it back on", -1],
] as const;
export function conversationMuted(until?: number, now = Date.now()): boolean {
  return until === -1 || (Number.isFinite(until) && (until ?? 0) > now);
}
export function muteDescription(until?: number): string {
  return until === -1 ? "Muted until you turn it back on" : conversationMuted(until) ? `Muted until ${formatNumericDateTime(until!)}` : "Notifications on";
}
