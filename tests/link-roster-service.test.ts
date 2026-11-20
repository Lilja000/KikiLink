import { describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { RoomCharacter } from "../src/core/types";
import { LinkRosterService } from "../src/modules/link-roster/link-roster-service";
import { PeopleRepository } from "../src/storage/people-repository";

describe("LinkRosterService", () => {
  it("resolves individual and in-room entries without loading the entire notebook", () => {
    const repository = new PeopleRepository(new MemoryKeyValueStorage());
    const getPlayerRelationships = vi.fn((member: number) => member === 101 ? ["lover"] : []);
    const adapter = {
      getRoomCharacters: () => [{ memberNumber: 101, memberName: "Current room name", isFriend: true }],
      isKnownFriend: (member: number) => member === 102 || member === 104,
      getKnownContacts: () => [
        { memberNumber: 102, memberName: "Native contact name" },
        { memberNumber: 104, memberName: "Other native name" },
      ],
      getMemberName: (member: number) => `Native ${member}`,
      getPlayerRelationships,
    } as unknown as BCAdapter;
    const service = new LinkRosterService(adapter, repository, new SettingsStore(new MemoryKeyValueStorage()));
    service.saveNotebook(101, "Stored room name", "Room note", ["tag"]);
    service.toggleFavorite(103, "Saved Cloud bookmark", true);
    service.saveNotebook(104, "Notebook contact name", "Private note", []);
    service.saveNotebook(999, "Unrelated player", "Unrelated note", []);

    const listNotebook = vi.spyOn(repository, "list");
    expect(service.getEntry(101)).toMatchObject({
      displayName: "Current room name", present: true, isFriend: true, note: "Room note",
      tags: ["tag"], relationships: ["lover"],
    });
    expect(service.getEntry(102)).toMatchObject({ displayName: "Native contact name", present: false, isFriend: true });
    expect(service.getEntry(103)).toMatchObject({ displayName: "Saved Cloud bookmark", favorite: true, directoryBookmark: true });
    expect(service.getEntry(104)).toMatchObject({ displayName: "Notebook contact name", isFriend: true, note: "Private note" });
    expect(service.getEntry(105)).toMatchObject({ displayName: "Native 105", present: false, isFriend: false });
    expect(service.list("current", "lover").map((entry) => entry.memberNumber)).toEqual([101]);
    expect(getPlayerRelationships.mock.calls).toEqual([[101], [102], [103], [104], [105], [101]]);
    expect(listNotebook).not.toHaveBeenCalled();
  });

  it("includes every actual BC friend without recording unseen people or treating other contacts as friends", () => {
    const storage = new MemoryKeyValueStorage();
    const repository = new PeopleRepository(storage);
    const adapter = {
      getRoomCharacters: () => [],
      getKnownContacts: () => [
        { memberNumber: 1, memberName: "Remote friend" },
        { memberNumber: 2, memberName: "Offline friend" },
        { memberNumber: 3, memberName: "Other contact" },
      ],
      isKnownFriend: (member: number) => member === 1 || member === 2,
    } as unknown as BCAdapter;
    const service = new LinkRosterService(adapter, repository, new SettingsStore(new MemoryKeyValueStorage()));
    expect(service.list("friends").map(entry => entry.memberNumber).sort()).toEqual([1, 2]);
    expect(service.list("known")).toEqual([]);
    expect(repository.list()).toEqual([]);
    service.saveNotebook(1, "Remote friend", "Existing private note", ["trusted"]);
    expect(service.list("friends").find(entry => entry.memberNumber === 1)?.note).toBe("Existing private note");
    expect(service.list("known")).toHaveLength(1);
  });

  it("keeps directory-only bookmarks out of native lists after a reload or import until a real encounter", () => {
    const storage = new MemoryKeyValueStorage(), settings = new SettingsStore(storage);
    const characters: RoomCharacter[] = [];
    const adapter = {getRoomCharacters: () => characters, isInChatRoom: () => true, getCurrentRoomName: () => "Garden"} as unknown as BCAdapter;
    const initial = new LinkRosterService(adapter, new PeopleRepository(storage), settings);
    initial.toggleFavorite(707, "Juniper", true);
    const restored = new LinkRosterService(adapter, new PeopleRepository(storage), settings);
    expect(restored.list("known")).toEqual([]);
    expect(restored.list("people")).toMatchObject([{memberNumber: 707, directoryBookmark: true}]);
    const imported = new LinkRosterService(adapter, new PeopleRepository(new MemoryKeyValueStorage()), settings);
    imported.importNotebook(restored.exportNotebook());
    expect(imported.list("known")).toEqual([]);
    characters.push({memberNumber: 707, memberName: "Juniper", isFriend: false});
    imported.sync(1_000);
    expect(imported.list("known")).toMatchObject([{memberNumber: 707, favorite: true, encounterCount: 1}]);
    expect(imported.get(707).directoryBookmark).toBeUndefined();
  });

  it("tracks room encounters and combines them with favorites, tags, and private notes", () => {
    let inRoom = true;
    let roomName = "Moon Garden";
    let characters: RoomCharacter[] = [
      { memberNumber: 123, memberName: "Reina", isFriend: true },
      { memberNumber: 456, memberName: "Mina", isFriend: false },
    ];
    const adapter = {
      isInChatRoom: () => inRoom,
      getCurrentRoomName: () => roomName,
      getRoomCharacters: () => characters,
    } as unknown as BCAdapter;
    const repository = new PeopleRepository(new MemoryKeyValueStorage());
    const service = new LinkRosterService(
      adapter,
      repository,
      new SettingsStore(new MemoryKeyValueStorage()),
    );

    expect(service.sync(1_000)).toEqual({
      changed: true,
      presentCount: 2,
      joined: [123, 456],
      left: [],
    });
    expect(service.list("current").map((entry) => entry.displayName)).toEqual(["Reina", "Mina"]);
    expect(repository.get(123)).toMatchObject({
      displayName: "Reina",
      firstSeenAt: 1_000,
      lastSeenAt: 1_000,
      lastRoomName: "Moon Garden",
      encounterCount: 1,
    });

    service.saveNotebook(123, "Reina", "Enjoys careful rope scenes", ["trusted", "rope"]);
    service.toggleFavorite(123, "Reina");
    expect(service.list("favorites")).toHaveLength(1);
    expect(service.list("known", "careful")[0]?.memberNumber).toBe(123);
    expect(service.list("known", "rope")[0]?.memberNumber).toBe(123);

    characters = [{ memberNumber: 456, memberName: "Mina", isFriend: false }];
    expect(service.sync(2_000).left).toEqual([123]);
    expect(repository.get(123)?.lastSeenAt).toBe(2_000);

    characters = [
      { memberNumber: 123, memberName: "Reina", isFriend: true },
      { memberNumber: 456, memberName: "Mina", isFriend: false },
    ];
    expect(service.sync(3_000).joined).toEqual([123]);
    expect(repository.get(123)?.encounterCount).toBe(2);
    expect(repository.get(123)?.note).toBe("Enjoys careful rope scenes");

    roomName = "Library";
    expect(service.sync(4_000).changed).toBe(true);
    inRoom = false;
    expect(service.sync(5_000)).toMatchObject({ changed: true, presentCount: 0 });
  });

  it("shows the live roster without recording encounters when tracking is disabled", () => {
    const adapter = {
      isInChatRoom: () => true,
      getCurrentRoomName: () => "Quiet Room",
      getRoomCharacters: () => [{ memberNumber: 777, memberName: "Nova" }],
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkRoster.trackEncounters = false;
    });
    const repository = new PeopleRepository(new MemoryKeyValueStorage());
    const service = new LinkRosterService(adapter, repository, settings);

    service.sync(1_000);
    expect(service.list("current")).toMatchObject([
      { memberNumber: 777, displayName: "Nova", present: true },
    ]);
    expect(repository.list()).toEqual([]);
  });
});
