import { describe, expect, it } from "vitest";
import { MemoryKeyValueStorage } from "../src/core/settings";
import type { PersonRecord } from "../src/core/types";
import { PeopleRepository } from "../src/storage/people-repository";

function person(memberNumber: number, overrides: Partial<PersonRecord> = {}): PersonRecord {
  return {
    memberNumber,
    displayName: `Player ${memberNumber}`,
    favorite: false,
    note: "",
    tags: [],
    firstSeenAt: memberNumber,
    lastSeenAt: memberNumber,
    lastRoomName: "Test Room",
    encounterCount: 1,
    ...overrides,
  };
}

describe("PeopleRepository", () => {
  it("persists and sanitizes private player records", () => {
    const storage = new MemoryKeyValueStorage();
    const first = new PeopleRepository(storage);
    first.put(
      person(123, {
        displayName: "  Reina  ",
        note: "  A private note  ",
        tags: [" Trusted ", "trusted", "Roleplay", ""],
        favorite: true,
      }),
    );

    const second = new PeopleRepository(storage);
    expect(second.get(123)).toEqual(
      person(123, {
        displayName: "Reina",
        note: "A private note",
        tags: ["Trusted", "Roleplay"],
        favorite: true,
      }),
    );
  });

  it("ignores malformed storage and keeps the collection strictly bounded", () => {
    const malformed = new MemoryKeyValueStorage();
    malformed.setItem("kikilink:people:v1", "not-json");
    expect(new PeopleRepository(malformed).list()).toEqual([]);

    const repository = new PeopleRepository(new MemoryKeyValueStorage());
    repository.putMany(
      Array.from({ length: 2005 }, (_, index) =>
        person(index + 1, {
          favorite: index < 3,
          note: index === 3 ? "keep this newer notebook" : "",
        }),
      ),
    );

    expect(repository.list()).toHaveLength(2000);
    expect(repository.get(1)?.favorite).toBe(true);
    expect(repository.get(4)?.note).toBe("keep this newer notebook");
    expect(repository.get(5)).toBeUndefined();
  });

  it("clears both memory and persistent storage", () => {
    const storage = new MemoryKeyValueStorage();
    const repository = new PeopleRepository(storage);
    repository.put(person(123));
    repository.clear();

    expect(repository.list()).toEqual([]);
    expect(new PeopleRepository(storage).list()).toEqual([]);
  });
});
