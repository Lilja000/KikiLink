import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BCRoomAdminSnapshot } from "../src/bc/adapter";
import type { RoomPresetData } from "../src/core/types";
import { waitForRoomSettings } from "../src/modules/link-chat/room-update";

const room = (): RoomPresetData => ({ name: "Room", description: "", background: "Garden", limit: 10, game: "", space: "X", language: "EN",
  access: ["All"], visibility: ["All"], admins: [101], whitelist: [], blacklist: [], blockCategory: [], mapData: { Type: "Always", Tiles: "old" },
  custom: { imageUrl: "", imageFilter: "", musicUrl: "", musicSync: false, sizeMode: 1 } });
let state: BCRoomAdminSnapshot | undefined;
beforeEach(() => { vi.useFakeTimers(); const settings = room(); state = { roomName: "Room", isAdmin: true, settings, players: [], customization: settings.custom }; });
afterEach(() => { expect(vi.getTimerCount()).toBe(0); vi.useRealTimers(); });
describe("native room update confirmation", () => {
  it("waits for the map as well as general settings, tolerates key order and cleans up after success", async () => {
    const expected = room(); expected.mapData!.Tiles = "new"; expected.description = "Changed";
    const done = vi.fn(); const promise = waitForRoomSettings(() => state, room(), expected, new AbortController().signal).then(done);
    state!.settings.description = "Changed";
    await vi.advanceTimersByTimeAsync(300); expect(done).not.toHaveBeenCalled();
    state!.settings.mapData = { Tiles: "new", Type: "Always" };
    await vi.advanceTimersByTimeAsync(150); await promise; expect(done).toHaveBeenCalledOnce();
  });
  it.each(["abort", "leave", "permission", "read error", "timeout"])("rejects %s without a stale success or pending timers", async failure => {
    const expected = room(); expected.description = "New"; const controller = new AbortController();
    let broken = false;
    const result = waitForRoomSettings(() => { if (broken) throw new Error("revoked wrapper"); return state; }, room(), expected, controller.signal).catch(error => error);
    if (failure === "abort") controller.abort();
    if (failure === "leave") state = undefined;
    if (failure === "permission") state!.isAdmin = false;
    if (failure === "read error") broken = true;
    await vi.advanceTimersByTimeAsync(10200);
    expect(await result).toBeInstanceOf(Error);
  });
});
