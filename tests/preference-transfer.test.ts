import { expect, it } from "vitest";
import { exportPreferences, importPreferences, MAX_PREFERENCES_FILE_BYTES } from "../src/cloud/preference-transfer";

it("round-trips configured ratings and hard limits without exporting identity or privacy settings", () => {
  const ratings = { "restraint.zip-ties": "hard_limit", "interest.rope": "love" } as const;
  const text = exportPreferences(ratings);
  expect(importPreferences(text)).toEqual({ ratings, skipped: 0 });
  expect(Object.keys(JSON.parse(text)).sort()).toEqual(["catalogVersion", "format", "ratings", "version"]);
});

it("preserves retired ratings in the export and reports them as skipped on import", () => {
  const text = exportPreferences({ "retired.example": "like", "interest.rope": "neutral" });
  expect(JSON.parse(text).ratings["retired.example"]).toBe("like");
  expect(importPreferences(text)).toEqual({ ratings: { "interest.rope": "neutral" }, skipped: 1 });
});

it("validates the whole file before returning any ratings", () => {
  const valid = JSON.parse(exportPreferences({ "interest.rope": "like" }));
  for (const input of [null, [], {}, { ...valid, version: 2 }, { ...valid, ratings: [] },
    { ...valid, ratings: { "interest.rope": "like", "restraint.zip-ties": "invalid" } },
    { ...valid, ratings: JSON.parse('{"__proto__":"love"}') }])
    expect(() => importPreferences(JSON.stringify(input))).toThrow();
  expect(() => importPreferences("{" )).toThrow();
  expect(() => importPreferences(" ".repeat(MAX_PREFERENCES_FILE_BYTES + 1))).toThrow("too large");
  expect(() => importPreferences(JSON.stringify({ ...valid,
    ratings: Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`retired.item${i}`, "like"])) }))).toThrow("too many");
});
