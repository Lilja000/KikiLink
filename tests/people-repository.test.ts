import { describe, expect, it } from "vitest";
import { MemoryKeyValueStorage } from "../src/core/settings";
import type { PersonRecord } from "../src/core/types";
import { PEOPLE_KEY, PeopleRepository } from "../src/storage/people-repository";

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

  it("rewrites successfully loaded records in their canonical bounded form", () => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem(PEOPLE_KEY, JSON.stringify([
      {
        ...person(123),
        displayName: "  Reina  ",
        tags: [" Trusted ", "trusted"],
        unknownPrivateField: "must not survive",
      },
      { memberNumber: -1, note: "discard invalid row" },
    ]));

    expect(new PeopleRepository(storage).get(123)).toMatchObject({
      displayName: "Reina",
      tags: ["Trusted"],
    });
    const persisted = JSON.parse(storage.getItem(PEOPLE_KEY) ?? "null") as unknown[];
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).not.toHaveProperty("unknownPrivateField");
    expect(JSON.stringify(persisted)).not.toContain("discard invalid row");
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

  it("exports a versioned notebook and safely merges it without overwriting local notes", () => {
    const source = new PeopleRepository(new MemoryKeyValueStorage());
    source.put(
      person(123, {
        displayName: "Reina",
        favorite: true,
        note: "Backup note",
        tags: ["Trusted"],
        firstSeenAt: 40,
        lastSeenAt: 200,
        encounterCount: 8,
      }),
    );
    const backup = source.exportBackup(500);
    expect(backup).toMatchObject({
      format: "kikilink-player-notebook",
      version: 1,
      exportedAt: 500,
    });

    const target = new PeopleRepository(new MemoryKeyValueStorage());
    target.put(
      person(123, {
        displayName: "Old nickname",
        note: "Keep my current note",
        tags: ["Local"],
        firstSeenAt: 20,
        lastSeenAt: 100,
        encounterCount: 3,
      }),
    );
    const result = target.importBackup(JSON.stringify(backup));

    expect(result).toEqual({ imported: 1, skipped: 0, total: 1 });
    expect(target.get(123)).toMatchObject({
      displayName: "Reina",
      favorite: true,
      note: "Keep my current note",
      tags: ["Local", "Trusted"],
      firstSeenAt: 20,
      lastSeenAt: 200,
      encounterCount: 8,
    });
    expect(() => target.importBackup("not-json")).toThrow("not valid JSON");
    expect(() => target.importBackup({ records: [] })).toThrow(
      "not a KikiLink player notebook backup",
    );
  });

  it("prunes only expired encounter-only players and protects notebook content", () => {
    const now = 200 * 24 * 60 * 60 * 1000;
    const old = now - 31 * 24 * 60 * 60 * 1000;
    const recent = now - 5 * 24 * 60 * 60 * 1000;
    const repository = new PeopleRepository(new MemoryKeyValueStorage());
    repository.putMany([
      person(1, { lastSeenAt: old }),
      person(2, { lastSeenAt: old, favorite: true }),
      person(3, { lastSeenAt: old, note: "Remember this" }),
      person(4, { lastSeenAt: old, tags: ["Friend"] }),
      person(5, { lastSeenAt: recent }),
    ]);

    expect(repository.pruneEncounterHistory(30, now)).toBe(1);
    expect(repository.get(1)).toBeUndefined();
    expect(repository.list().map((record) => record.memberNumber).sort()).toEqual([2, 3, 4, 5]);
    expect(repository.pruneEncounterHistory(0, now)).toBe(0);
  });
});
