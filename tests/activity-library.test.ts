import { describe, expect, it } from "vitest";
import {
  ACTIVITY_LIBRARY_FORMAT,
  ACTIVITY_LIBRARY_VERSION,
  MAX_ROOM_ACTIVITIES,
  exportActivityLibrary,
  importActivityLibrary,
  installActivityPack,
  sanitizeRoomActivities,
} from "../src/modules/link-activities/activity-library";

describe("activity library", () => {
  it("migrates old flat activities into safe local metadata", () => {
    expect(
      sanitizeRoomActivities([
        { label: "  Greeting  ", template: "  waves to {target}.  " },
        { label: "", template: "ignored" },
      ]),
    ).toEqual([
      {
        label: "Greeting",
        template: "waves to {target}.",
        category: "Uncategorized",
        pack: "My Activities",
        favorite: false,
      },
    ]);
  });

  it("exports a versioned library with categories, packs, and favorites", () => {
    const backup = exportActivityLibrary(
      [
        {
          label: "Greeting",
          template: "waves to {target}.",
          category: "Greetings",
          pack: "Social",
          favorite: true,
        },
      ],
      123,
    );

    expect(backup).toEqual({
      format: ACTIVITY_LIBRARY_FORMAT,
      version: ACTIVITY_LIBRARY_VERSION,
      exportedAt: 123,
      activities: [
        {
          label: "Greeting",
          template: "waves to {target}.",
          category: "Greetings",
          pack: "Social",
          favorite: true,
        },
      ],
    });
  });

  it("merges imports without duplicating activities or clearing favorites", () => {
    const existing = [
      {
        label: "Greeting",
        template: "waves to {target}.",
        category: "Custom",
        pack: "Mine",
        favorite: false,
      },
    ];
    const result = importActivityLibrary(
      {
        format: ACTIVITY_LIBRARY_FORMAT,
        version: ACTIVITY_LIBRARY_VERSION,
        exportedAt: 123,
        activities: [
          {
            label: "Greeting",
            template: "waves to {target}.",
            category: "Greetings",
            pack: "Imported",
            favorite: true,
          },
          {
            label: "Curtsey",
            template: "curtsies to {target}.",
            category: "Greetings",
            pack: "Imported",
            favorite: false,
          },
          { label: "Broken" },
        ],
      },
      existing,
    );

    expect(result).toMatchObject({ imported: 1, duplicates: 1, skipped: 1 });
    expect(result.activities).toHaveLength(2);
    expect(result.activities[0]).toMatchObject({ pack: "Mine", favorite: true });
    expect(result.activities[1]).toMatchObject({ label: "Curtsey", pack: "Imported" });
  });

  it("installs built-in packs idempotently", () => {
    const first = installActivityPack([], "social-gestures");
    const second = installActivityPack(first.activities, "social-gestures");

    expect(first.imported).toBeGreaterThan(0);
    expect(second.imported).toBe(0);
    expect(second.duplicates).toBe(first.activities.length);
    expect(second.activities).toEqual(first.activities);
  });

  it("rejects unversioned or malformed backups", () => {
    expect(() => importActivityLibrary("not json", [])).toThrow("not valid JSON");
    expect(() => importActivityLibrary({ activities: [] }, [])).toThrow(
      "not a KikiLink activity library backup",
    );
  });

  it("keeps imported libraries inside the 100-activity bound", () => {
    const activities = Array.from({ length: MAX_ROOM_ACTIVITIES + 5 }, (_, index) => ({
      label: `Activity ${index}`,
      template: `waves to {target} ${index}.`,
      category: "Test",
      pack: "Large pack",
      favorite: false,
    }));
    const result = importActivityLibrary(
      {
        format: ACTIVITY_LIBRARY_FORMAT,
        version: ACTIVITY_LIBRARY_VERSION,
        exportedAt: 123,
        activities,
      },
      [],
    );

    expect(result.activities).toHaveLength(MAX_ROOM_ACTIVITIES);
    expect(result).toMatchObject({ imported: MAX_ROOM_ACTIVITIES, skipped: 5 });
  });
});
