import type { BCAdapter } from "./adapter";

export const NATIVE_FRIEND_FRESH_MS = 90_000;

/** An old native friend list proves neither current reachability nor an offline transition. */
export function nativeFriendSnapshotIsFresh(
  adapter: Partial<Pick<BCAdapter, "hasOnlineFriendSnapshot" | "getOnlineFriendsUpdatedAt" | "isReady">>,
  now = Date.now(),
): boolean {
  try {
    if (adapter.isReady?.() === false || adapter.hasOnlineFriendSnapshot?.() === false) return false;
    const at = adapter.getOnlineFriendsUpdatedAt?.();
    // Older adapter hosts without timestamps retain their existing snapshot behavior.
    return at === undefined || (at > 0 && now - at <= NATIVE_FRIEND_FRESH_MS);
  } catch { return false; }
}
