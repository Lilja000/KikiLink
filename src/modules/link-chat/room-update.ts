import type { BCRoomAdminSnapshot } from "../../bc/adapter";
import type { RoomPresetData } from "../../core/types";

/** Observe native room synchronization; cancellation and timeout never become a success toast. */
export function waitForRoomSettings(read: () => BCRoomAdminSnapshot | undefined, before: RoomPresetData,
  expected: RoomPresetData, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const expires = Date.now() + 10_000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error): void => {
      if (timer !== undefined) clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      error ? reject(error) : resolve();
    };
    const abort = (): void => finish(new Error("Room update cancelled"));
    signal.addEventListener("abort", abort, { once: true });
    const poll = (): void => {
      if (signal.aborted) { abort(); return; }
      try {
        const current = read();
        if (!current || ![before.name, expected.name].includes(current.roomName) || ![before.space, expected.space].includes(current.settings.space)) {
          finish(new Error("You left the room before the update was confirmed")); return;
        }
        if (roomSettingsMatch(current.settings, expected)) { finish(); return; }
        if (!current.isAdmin) { finish(new Error("Administrator rights were removed before the update was confirmed")); return; }
        if (Date.now() >= expires) { finish(new Error("BC did not confirm this update. Check room rights and settings, then try again.")); return; }
        timer = setTimeout(poll, 150);
      } catch { finish(new Error("BC room data is temporarily unavailable. Refresh and try again.")); }
    };
    poll();
  });
}

export function roomSettingsMatch(actual: RoomPresetData, expected: RoomPresetData): boolean {
  for (const key of ["name", "description", "background", "limit", "game", "space", "language"] as const)
    if (actual[key] !== expected[key]) return false;
  for (const key of ["access", "visibility", "blockCategory", "admins", "whitelist", "blacklist"] as const)
    if (JSON.stringify([...actual[key]].sort()) !== JSON.stringify([...expected[key]].sort())) return false;
  if (expected.mapData) {
    for (const key of ["Type", "Tiles", "Objects", "Effects", "Fog"] as const)
      if (actual.mapData?.[key] !== expected.mapData[key]) return false;
  }
  for (const key of ["imageUrl", "imageFilter", "musicUrl", "sizeMode", "musicSync"] as const)
    if (actual.custom[key] !== expected.custom[key]) return false;
  return true;
}
