export const MUSIC_LEASE_MS = 90000;
export const MUSIC_SESSION_MS = 12 * 3600000;
export const MUSIC_PARTICIPANTS = 50;
export const MUSIC_QUEUE_LIMIT = 20;
/** Project the authoritative server anchor through a finite queue; no client wall clock. */
export function musicPosition(queue, trackId, positionMs, elapsedMs) {
  let index = queue.findIndex(t => t.id === trackId);
  if (index < 0 || !queue.length) return {trackId: null, positionMs: 0, ended: true};
  let position = Math.max(0, positionMs + elapsedMs);
  while (position >= queue[index].durationMs && index < queue.length - 1) {
    position -= queue[index].durationMs;
    index++;
  }
  const track = queue[index];
  return {trackId: track.id, positionMs: Math.min(track.durationMs, Math.floor(position)), ended: position >= track.durationMs};
}
