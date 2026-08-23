import { describe, expect, it } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { RoomCharacter } from "../src/core/types";
import { LinkRosterService } from "../src/modules/link-roster/link-roster-service";
import { PeopleRepository } from "../src/storage/people-repository";

describe("LinkRosterService", () => {
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
