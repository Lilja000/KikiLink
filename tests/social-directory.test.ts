import { describe, expect, it } from "vitest";
import type { BCLobbyRoom } from "../src/bc/adapter";
import type { PresenceState } from "../src/core/types";
import { playerLocation, playerRoom, selectPeople, selectRooms, type DirectoryPlayer } from "../src/modules/link-chat/social-directory";

const filters = { favorites: false, online: false, addon: false };
function player(id: number, name: string, status: PresenceState, favorite = false): DirectoryPlayer {
  return { entry: { memberNumber: id, displayName: name, favorite, note: "", tags: [],
    firstSeenAt: 0, lastSeenAt: 0, lastRoomName: "Old private meeting", encounterCount: 1,
    present: false, isFriend: true, relationships: [] },
  presence: { memberNumber: id, status, source: "friend-list", updatedAt: 1 } };
}
const room = (name: string, friendCount = 0): BCLobbyRoom => ({ name, description: "", language: "EN",
  memberCount: 5, memberLimit: 5, canJoin: false, privateRoom: false, locked: false, mapType: "",
  friends: Array.from({ length: friendCount }, (_, i) => ({ memberNumber: i + 1, memberName: `Friend ${i}` })) });

describe("Social directory selectors", () => {
  it("shows Lobby only when observed, never borrowing a notebook location", () => {
    const unknown = player(1, "Nikki", "unknown");
    expect(playerLocation(unknown)).toBe("Status unknown");
    unknown.presence.status = "online";
    expect(playerLocation(unknown)).toBe("Location unknown");
    unknown.presence.roomName = "Lobby";
    expect(playerLocation(unknown)).toBe("Lobby");
    expect(playerRoom(unknown)).toBeUndefined();
    unknown.presence.roomName = "Private room";
    expect(playerRoom(unknown)).toBeUndefined();
    unknown.presence.roomName = "Dungeon";
    expect(playerRoom(unknown)).toBe("Dungeon");
    unknown.presence.status = "offline";
    expect(playerRoom(unknown)).toBeUndefined();
    expect(playerLocation(unknown)).toBe("Offline");
  });

  it("orders online, unknown, offline; favorites and names within each, with exact matches first", () => {
    const people = [player(1, "Zoe", "online"), player(2, "Nikki", "offline", true),
      player(3, "Nikki Two", "online"), player(4, "Ava", "unknown", true), player(5, "Lia", "online", true)];
    const ids = (query = "") => selectPeople(people, query, filters).map(({ entry }) => entry.memberNumber);
    expect(ids()).toEqual([5, 3, 1, 4, 2]);
    expect(ids("nikki")).toEqual([2, 3]);
    expect(ids("#2")).toEqual([2]);
    people[2]!.entry.note = "2 can also match a note";
    expect(ids("2")).toEqual([2, 3]);
  });

  it("uses the same composable filters in every list, with fresh addon proof", () => {
    const people = [player(1, "Anna", "online", true), player(2, "Bea", "idle", true), player(3, "Cora", "online")];
    people[0]!.presence.addonInstalled = true;
    people[1]!.presence.addonInstalled = false;
    people[1]!.presence.addonVersion = "0.29.0"; // cached version is not proof
    people[2]!.presence.addonInstalled = true;
    expect(selectPeople(people, "", { favorites: true, online: true, addon: true }).map(p => p.entry.memberNumber)).toEqual([1]);
    people[0]!.presence.addonInstalled = false;
    expect(selectPeople(people, "", { favorites: true, online: true, addon: true })).toEqual([]);
    people[2]!.presence.roomName = "Dungeon";
    expect(selectPeople(people, "", filters, false, "dungeon").map(p => p.entry.memberNumber)).toEqual([3]);
    expect(selectPeople([], "", filters)).toEqual([]);
  });

  it("sorts current-room players by favorites and name, without status churn", () => {
    const people = [player(1, "Zoe", "offline", true), player(2, "Anna", "online"), player(3, "Bea", "unknown")];
    people.forEach(p => p.entry.present = true);
    expect(selectPeople(people, "", filters, true).map(p => p.entry.memberNumber)).toEqual([1, 2, 3]);
  });

  it("sorts Players by favorites and name, and matches shared usernames with or without @", () => {
    const people = [player(1, "Anna", "online"), player(2, "Zoe", "offline", true), player(3, "Bay", "offline")];
    people[2]!.directoryUsername = "EveningTea";
    const ids = (query: string) => selectPeople(people, query, filters, false, undefined, true).map(({entry}) => entry.memberNumber);
    expect(ids("")).toEqual([2, 1, 3]);
    expect(ids("@evening")).toEqual([3]);
    expect(ids("tea")).toEqual([3]);
  });

  it("ranks a single deduplicated room directory and keeps full rooms", () => {
    const rooms = [room("Zebra", 3), room("Amber"), room("Current", 8), room("Fav B"), room("Fav A", 1), room("ZEBRA", 3)];
    const result = selectRooms(rooms, ["Fav A", "Fav B"], "", "all", "current");
    expect(result.map(r => r.name)).toEqual(["Fav A", "Fav B", "Zebra", "Amber"]);
    expect(result.every(r => r.memberCount === r.memberLimit)).toBe(true);
    expect(selectRooms(rooms, ["Fav B"], "", "favorites", "current").map(r => r.name)).toEqual(["Fav B"]);
    expect(selectRooms(rooms, ["Fav A"], "", "friends", "current").map(r => r.name)).toEqual(["Fav A", "Zebra"]);
    expect(selectRooms(rooms, [], "missing", "all")).toEqual([]);
  });

  it("handles many people without mutating input records or saved history", () => {
    const people = Array.from({ length: 600 }, (_, i) => player(i + 1, `Friend ${i}`, "online", i % 5 === 0));
    const before = JSON.stringify(people);
    expect(selectPeople(people, "", { ...filters, favorites: true })).toHaveLength(120);
    expect(JSON.stringify(people)).toBe(before);
  });
});

describe('Lobbies language and access selection', () => {
  const room = (name: string, extra: Partial<BCLobbyRoom> = {}): BCLobbyRoom => ({ name, description: 'tea', language: 'EN', memberCount: 2, memberLimit: 10, privateRoom: false, canJoin: true, locked: false, mapType: '', friends: [], ...extra });
  it('normalizes language and separates privacy from Locked, Full and join permission', () => {
    const source = [room('Public locked', { locked: true, canJoin: false, language: ' en ' }), room('Private full', { privateRoom: true, memberCount: 10 }), room('Russian', { language: 'RU' })];
    expect(selectRooms(source, [], 'tea', 'all', '', { language: 'EN', access: 'public' }).map(r => r.name)).toEqual(['Public locked']);
    expect(selectRooms(source, [], '', 'all', '', { language: 'en', access: 'private' }).map(r => r.name)).toEqual(['Private full']);
    expect(source[0]!.canJoin).toBe(false);
  });
  it('intersects every filter, excludes the pinned room, deduplicates and never generates unavailable favorites', () => {
    const source = [room('Here', { privateRoom: true, friends: [{ memberNumber: 1, memberName: 'Friend' }] }), room('Private', { privateRoom: true }), room('Private', { privateRoom: false })];
    const before = JSON.stringify(source);
    expect(selectRooms(source, ['Unavailable'], '', 'favorites', '', { language: null, access: 'private' })).toEqual([]);
    expect(selectRooms(source, [], '', 'friends', 'Here', { language: null, access: 'private' })).toEqual([]);
    expect(selectRooms(source, ['Private'], '', 'favorites', 'Here', { language: null, access: 'private' }).map(r => r.name)).toEqual(['Private']);
    expect(JSON.stringify(source)).toBe(before);
  });
  it("ranks available lobbies by occupancy and accepts the displayed language in platform search", () => {
    const source = [room("At capacity", { memberCount: 10, memberLimit: 10, canJoin: false }),
      room("Quiet", { memberCount: 1, memberLimit: 10, canJoin: true }),
      room("Busy", { memberCount: 7, memberLimit: 10, canJoin: true }),
      room("Favorite", { memberCount: 0, memberLimit: 10, canJoin: true })];
    expect(selectRooms(source, ["Favorite"], "English", "all", "", undefined, true).map(item => item.name))
      .toEqual(["Favorite", "Busy", "Quiet", "At capacity"]);
  });
  it('keeps unknown language distinct from all and respects the existing 500-row snapshot bound', () => {
    expect(selectRooms([room('Unknown', { language: '' }), room('English')], [], '', 'all', '', { language: '', access: 'all' }).map(r => r.name)).toEqual(['Unknown']);
    const source = Array.from({ length: 500 }, (_, i) => room(String(i)));
    source.push(room('Not in bounded snapshot', { privateRoom: true }));
    expect(selectRooms(source, [], '', 'all', '', { language: null, access: 'private' })).toEqual([]);
  });
});
