// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import type { KikiLinkEvents } from "../src/core/types";
import { copyRoomMap } from "../src/core/room-map";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { roomOptions } from "../src/bc/room-options";

let adapter: BCAdapter;
const map = { Type: "Hybrid" as const, Tiles: "tiles+/=exact", Objects: "objects+/=exact", Effects: "binary-effects+/=exact", Fog: true };
beforeEach(() => {
  vi.stubGlobal("Player", { ID: 0, MemberNumber: 101, Name: "Kiki", FriendNames: new Map() });
  vi.stubGlobal("CurrentScreen", "ChatRoom"); vi.stubGlobal("ChatRoomCharacter", [Player]); vi.stubGlobal("ChatRoomPlayerIsAdmin", () => true);
  vi.stubGlobal("ChatRoomData", { Name: "Saved room", Description: "long ".repeat(59).trim(), Background: "Boudoir", Limit: 8,
    Game: "", Language: "EN", Space: "X", Admin: [101, 202], Whitelist: [303], Ban: [404], Access: ["Admin", "Whitelist"],
    Visibility: [], BlockCategory: ["Extreme"], MapData: structuredClone(map), Custom: { SizeMode: 2 } });
  vi.stubGlobal("ChatRoomGetSettings", (value: BCChatRoomData) => structuredClone(value));
  vi.stubGlobal("ServerSend", vi.fn());
  adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.29.0");
});
afterEach(() => vi.unstubAllGlobals());

describe("room presets save / reload / native apply", () => {
  it("defaults missing background modes to crop across settings, presets and native updates while keeping explicit modes", () => {
    ChatRoomData!.Custom = {};
    expect(adapter.getRoomAdminSnapshot()!.customization.sizeMode).toBe(2);
    const room = adapter.getRoomAdminSnapshot()!.settings;
    adapter.applyRoomPreset(room);
    expect(ServerSend).toHaveBeenLastCalledWith("ChatRoomAdmin", expect.objectContaining({ Room: expect.objectContaining({ Custom: expect.objectContaining({ SizeMode: 2 }) }) }));
    for (const mode of [1, 2, 3]) {
      room.custom.sizeMode = mode;
      const storage = new MemoryKeyValueStorage(), store = new SettingsStore(storage);
      store.update(draft => { draft.linkRoom.presets = [{ id: "mode", label: "Mode", savedAt: 1, room }]; });
      const saved = new SettingsStore(storage).get().linkRoom.presets[0]!.room;
      expect(adapter.applyRoomPreset(saved).custom.sizeMode).toBe(mode);
    }
  });
  it("round-trips the full map and a 300-character description through persistent settings", () => {
    const snapshot = adapter.getRoomAdminSnapshot()!;
    expect(snapshot.settings.mapData).toEqual(map);
    const storage = new MemoryKeyValueStorage(), settings = new SettingsStore(storage);
    settings.update(draft => { draft.linkRoom.presets = [{ id: "map-room", label: "Map room", savedAt: 10, room: snapshot.settings }]; }, { requirePersistence: true });
    (ChatRoomData!.MapData as typeof map).Tiles = "changed";
    const reloaded = new SettingsStore(storage).get().linkRoom.presets[0]!;
    expect(reloaded.room.mapData).toEqual(map);
    expect(reloaded.room.description).toBe("long ".repeat(59).trim());
    const applied = adapter.applyRoomPreset(reloaded.room);
    expect(applied.mapData).toEqual(map);
    expect(ServerSend).toHaveBeenCalledWith("ChatRoomAdmin", { Action: "Update", MemberNumber: 0, Room: expect.objectContaining({
      Name: "Saved room", MapData: map, Access: ["Admin", "Whitelist"], Visibility: [], Admin: [101, 202], Whitelist: [303], Ban: [404] }) });
    expect((ChatRoomData!.MapData as typeof map).Tiles).toBe("changed"); // Only native server sync updates live state.
  });
  it("loads legacy presets without wiping the destination map and applies explicitly saved classic rooms", () => {
    const saved = adapter.getRoomAdminSnapshot()!.settings;
    delete saved.mapData; adapter.applyRoomPreset(saved);
    expect(ServerSend).toHaveBeenLastCalledWith("ChatRoomAdmin", expect.objectContaining({ Room: expect.objectContaining({ MapData: map }) }));
    saved.mapData = { Type: "Never" }; adapter.applyRoomPreset(saved);
    expect(ServerSend).toHaveBeenLastCalledWith("ChatRoomAdmin", expect.objectContaining({ Room: expect.objectContaining({ MapData: { Type: "Never" } }) }));
  });
  it("does not claim persistent success or replace existing presets when storage is full", () => {
    const storage = new MemoryKeyValueStorage(), settings = new SettingsStore(storage);
    settings.update(draft => { draft.linkRoom.presets = [{ id: "old", label: "Old", savedAt: 1, room: adapter.getRoomAdminSnapshot()!.settings }]; });
    const listener = vi.fn(); settings.subscribe(listener); listener.mockClear();
    storage.setItem = () => { throw new Error("QuotaExceededError"); };
    expect(() => settings.update(draft => { draft.linkRoom.presets = []; }, { requirePersistence: true })).toThrow("Could not save");
    expect(settings.get().linkRoom.presets[0]!.id).toBe("old"); expect(listener).not.toHaveBeenCalled();
  });
  it("keeps the current admin within the list limit and validates native permissions and values", () => {
    const room = adapter.getRoomAdminSnapshot()!.settings;
    room.admins = Array.from({ length: 20 }, (_, i) => i + 200);
    const applied = adapter.applyRoomPreset(room);
    expect(applied.admins).toHaveLength(20); expect(applied.admins[0]).toBe(101);
    expect(() => adapter.applyRoomPreset({ ...room, game: "FakeGame" })).toThrow("not available");
    expect(() => adapter.applyRoomPreset({ ...room, blacklist: [101] })).toThrow("yourself");
    vi.stubGlobal("ChatRoomPlayerIsAdmin", () => false); ChatRoomData!.Admin = [202];
    expect(() => adapter.applyRoomPreset(room)).toThrow("administrator");
  });
  it("preserves encoded map bytes and rejects malformed or oversized maps", () => {
    expect(copyRoomMap(map)).toEqual(map); expect(copyRoomMap({ Type: "map" })).toBeUndefined();
    expect(copyRoomMap({ ...map, Effects: [] })).toBeUndefined();
    const bad = { ...map, Tiles: "x".repeat(524289) };
    expect(copyRoomMap(bad)).toBeUndefined();
    expect(() => adapter.applyRoomPreset({ ...adapter.getRoomAdminSnapshot()!.settings, mapData: bad })).toThrow("invalid");
  });
  it("uses the current native room catalogs and exposes real access / visibility modes", () => {
    vi.stubGlobal("ChatAdminGameList", ["", "ClubCard"]);
    vi.stubGlobal("BackgroundsList", [{ Name: "Boudoir", Tag: ["Indoor"] }, { Name: "Garden", Tag: ["Outdoor"] }]);
    vi.stubGlobal("BackgroundsTextGet", (name: string) => `Room ${name}`);
    const options = roomOptions();
    expect(options.games.map(value => value.value)).toEqual(["", "ClubCard"]);
    expect(options.backgrounds[0]).toEqual({ name: "Boudoir", label: "Room Boudoir", tags: ["Indoor"] });
    expect(options.visibility).toContainEqual({ value: [], label: "Unlisted" });
    expect(options.access).toContainEqual({ value: ["Admin"], label: "Admins only" });
  });
  it("uses BC's media validators for saved vanilla media rather than the upload form's suffix rules", () => {
    const native = vi.fn((value: string) => value.startsWith("https:") ? value : undefined);
    vi.stubGlobal("ServerChatRoomDataValidate", { Custom: { ImageURL: native, MusicURL: native } });
    const saved = adapter.getRoomAdminSnapshot()!.settings;
    saved.custom.imageUrl = "https://example.test/media?id=123";
    expect(adapter.applyRoomPreset(saved).custom.imageUrl).toBe(saved.custom.imageUrl);
    expect(native).toHaveBeenCalledWith(saved.custom.imageUrl);
    saved.custom.imageUrl = "javascript:bad";
    expect(() => adapter.applyRoomPreset(saved)).toThrow("no longer accepts");
  });
});
