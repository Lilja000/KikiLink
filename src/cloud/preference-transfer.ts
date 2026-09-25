import { catalog, catalogById, normalizePreferenceLevel, type PreferenceLevel } from "./preference-model";

export const MAX_PREFERENCES_FILE_BYTES = 65_536;
const VALID_ID = /^[a-z][a-z0-9.-]{1,79}$/;

export function exportPreferences(ratings: Record<string, PreferenceLevel>): string {
  return JSON.stringify({ format: "kikilink-preferences", version: 1, catalogVersion: catalog.version,
    ratings: Object.fromEntries(Object.entries(ratings).filter(([id, level]) => VALID_ID.test(id) && normalizePreferenceLevel(level))),
  }, null, 2) + "\n";
}

export function importPreferences(text: string): { ratings: Record<string, PreferenceLevel>; skipped: number } {
  if (text.length > MAX_PREFERENCES_FILE_BYTES) throw new Error("That preferences file is too large (maximum 64 KB).");
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error("Choose a valid KikiLink preferences JSON file."); }
  if (!data || typeof data !== "object" || Array.isArray(data) ||
    !("format" in data) || data.format !== "kikilink-preferences" || !("version" in data) || data.version !== 1 ||
    !("ratings" in data) || !data.ratings || typeof data.ratings !== "object" || Array.isArray(data.ratings))
    throw new Error("Choose a KikiLink preferences export (version 1).");
  const entries = Object.entries(data.ratings);
  if (entries.length > 500) throw new Error("That preferences file contains too many entries.");
  const ratings: Record<string, PreferenceLevel> = {};
  let skipped = 0;
  for (const [id, raw] of entries) {
    const level = normalizePreferenceLevel(raw);
    if (!VALID_ID.test(id) || !level) throw new Error("That preferences file contains an invalid rating.");
    if (!catalogById.has(id)) { skipped++; continue; }
    ratings[id] = level;
  }
  return { ratings, skipped };
}
