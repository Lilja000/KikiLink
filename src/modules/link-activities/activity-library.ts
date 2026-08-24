import type { RoomActivity } from "../../core/types";

export const MAX_ROOM_ACTIVITIES = 100;
export const ACTIVITY_LIBRARY_FORMAT = "kikilink-activity-library";
export const ACTIVITY_LIBRARY_VERSION = 1;

export interface ActivityLibraryBackup {
  format: typeof ACTIVITY_LIBRARY_FORMAT;
  version: typeof ACTIVITY_LIBRARY_VERSION;
  exportedAt: number;
  activities: RoomActivity[];
}

export interface ActivityImportResult {
  activities: RoomActivity[];
  imported: number;
  duplicates: number;
  skipped: number;
}

export interface ActivityPackPreset {
  id: string;
  name: string;
  description: string;
  activities: RoomActivity[];
}

export const ACTIVITY_PACK_PRESETS: readonly ActivityPackPreset[] = [
  {
    id: "kikilink-starter",
    name: "KikiLink Starter",
    description: "The five original KikiLink room activities.",
    activities: [
      roomActivity(
        "Sakura bow",
        "bows gracefully to {target}, as if sakura petals drifted between them.",
        "Greetings",
        "KikiLink Starter",
        true,
      ),
      roomActivity(
        "Wolf greeting",
        "greets {target} with a warm, playful wolfish grin.",
        "Greetings",
        "KikiLink Starter",
        true,
      ),
      roomActivity(
        "Inspect knots",
        "circles {target}, carefully inspecting every knot.",
        "Scene",
        "KikiLink Starter",
      ),
      roomActivity(
        "Offer hand",
        "offers {target} a hand with an inviting smile.",
        "Care",
        "KikiLink Starter",
      ),
      roomActivity(
        "Moonlit promise",
        "touches two fingers to their heart, then gestures solemnly toward {target}.",
        "Roleplay",
        "KikiLink Starter",
      ),
    ],
  },
  {
    id: "social-gestures",
    name: "Social Gestures",
    description: "Warm greetings and small social flourishes for a busy room.",
    activities: [
      roomActivity("Friendly wave", "waves warmly to {target}.", "Greetings", "Social Gestures"),
      roomActivity(
        "Playful wink",
        "gives {target} a quick, playful wink.",
        "Greetings",
        "Social Gestures",
      ),
      roomActivity(
        "Formal curtsey",
        "offers {target} a graceful, carefully measured curtsey.",
        "Greetings",
        "Social Gestures",
      ),
      roomActivity(
        "Welcome smile",
        "welcomes {target} with a bright, reassuring smile.",
        "Care",
        "Social Gestures",
      ),
      roomActivity(
        "Quiet toast",
        "raises an imaginary glass toward {target} in a quiet toast.",
        "Roleplay",
        "Social Gestures",
      ),
    ],
  },
  {
    id: "scene-flourishes",
    name: "Scene Flourishes",
    description: "Reusable movements for adding atmosphere without changing game state.",
    activities: [
      roomActivity(
        "Check comfort",
        "pauses beside {target}, carefully checking that everything still looks comfortable.",
        "Care",
        "Scene Flourishes",
      ),
      roomActivity(
        "Stand guard",
        "takes position beside {target}, watching the room attentively.",
        "Scene",
        "Scene Flourishes",
      ),
      roomActivity(
        "Slow circle",
        "walks a slow circle around {target}, studying their expression.",
        "Scene",
        "Scene Flourishes",
      ),
      roomActivity(
        "Measured nod",
        "meets {target}'s gaze and gives a slow, deliberate nod.",
        "Roleplay",
        "Scene Flourishes",
      ),
      roomActivity(
        "Quiet reassurance",
        "leans closer to {target} and offers a few quiet words of reassurance.",
        "Care",
        "Scene Flourishes",
      ),
    ],
  },
];

export function sanitizeRoomActivities(value: unknown): RoomActivity[] {
  if (!Array.isArray(value)) return [];

  const activities: RoomActivity[] = [];
  for (const entry of value.slice(0, MAX_ROOM_ACTIVITIES)) {
    const activity = sanitizeRoomActivity(entry);
    if (activity) activities.push(activity);
  }
  return activities;
}

export function migrateLegacyRoomActivities(value: unknown): RoomActivity[] {
  const starterActivities = ACTIVITY_PACK_PRESETS[0]?.activities ?? [];
  return sanitizeRoomActivities(value).map((activity) => {
    const starter = starterActivities.find(
      (candidate) => activityFingerprint(candidate) === activityFingerprint(activity),
    );
    return starter
      ? {
          ...activity,
          category: starter.category,
          pack: starter.pack,
          favorite: activity.favorite || starter.favorite,
        }
      : activity;
  });
}

export function exportActivityLibrary(
  activities: RoomActivity[],
  exportedAt = Date.now(),
): ActivityLibraryBackup {
  return {
    format: ACTIVITY_LIBRARY_FORMAT,
    version: ACTIVITY_LIBRARY_VERSION,
    exportedAt,
    activities: sanitizeRoomActivities(activities),
  };
}

export function importActivityLibrary(
  value: unknown,
  existing: RoomActivity[],
): ActivityImportResult {
  const parsed = parseActivityLibrary(value);
  return mergeActivities(existing, parsed.activities);
}

export function installActivityPack(
  existing: RoomActivity[],
  packId: string,
): ActivityImportResult {
  const pack = ACTIVITY_PACK_PRESETS.find((candidate) => candidate.id === packId);
  if (!pack) throw new Error("That KikiLink activity pack is not available.");
  return mergeActivities(existing, pack.activities);
}

function mergeActivities(existing: RoomActivity[], candidates: unknown[]): ActivityImportResult {
  const activities = sanitizeRoomActivities(existing);
  const fingerprints = new Map(
    activities.map((activity, index) => [activityFingerprint(activity), index]),
  );
  let imported = 0;
  let duplicates = 0;
  let skipped = Math.max(0, candidates.length - MAX_ROOM_ACTIVITIES);

  for (const candidate of candidates.slice(0, MAX_ROOM_ACTIVITIES)) {
    const activity = sanitizeRoomActivity(candidate);
    if (!activity) {
      skipped += 1;
      continue;
    }
    const fingerprint = activityFingerprint(activity);
    const existingIndex = fingerprints.get(fingerprint);
    if (existingIndex !== undefined) {
      const current = activities[existingIndex];
      if (current) current.favorite ||= activity.favorite;
      duplicates += 1;
      continue;
    }
    if (activities.length >= MAX_ROOM_ACTIVITIES) {
      skipped += 1;
      continue;
    }
    fingerprints.set(fingerprint, activities.length);
    activities.push(activity);
    imported += 1;
  }

  return { activities, imported, duplicates, skipped };
}

function parseActivityLibrary(value: unknown): { activities: unknown[] } {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("This file is not valid JSON.");
    }
  }
  if (
    !isRecord(parsed) ||
    parsed.format !== ACTIVITY_LIBRARY_FORMAT ||
    parsed.version !== ACTIVITY_LIBRARY_VERSION ||
    !Array.isArray(parsed.activities)
  ) {
    throw new Error("This is not a KikiLink activity library backup.");
  }
  return { activities: parsed.activities };
}

function sanitizeRoomActivity(value: unknown): RoomActivity | undefined {
  if (!isRecord(value)) return undefined;
  const label = cleanText(value.label, 32);
  const template = cleanText(value.template, 500);
  if (!label || !template) return undefined;
  return {
    label,
    template,
    category: cleanText(value.category, 24) || "Uncategorized",
    pack: cleanText(value.pack, 32) || "My Activities",
    favorite: value.favorite === true,
  };
}

function activityFingerprint(activity: RoomActivity): string {
  return `${activity.label.trim().toLocaleLowerCase()}\u0000${activity.template
    .trim()
    .toLocaleLowerCase()}`;
}

function roomActivity(
  label: string,
  template: string,
  category: string,
  pack: string,
  favorite = false,
): RoomActivity {
  return { label, template, category, pack, favorite };
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, maxLength)
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
