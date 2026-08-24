import type { CustomActivityDefinition, RoomActivity } from "../../core/types";

export const MAX_CUSTOM_ACTIVITIES = 100;
export const DEFAULT_CUSTOM_ACTIVITY_GROUP = "ItemArms";
export const DEFAULT_CUSTOM_ACTIVITY_IMAGE = "Caress";

const SAFE_ASSET_NAME = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;
const OLD_STARTER_FINGERPRINTS = new Set([
  "sakura bow\u0000bows gracefully to {target}, as if sakura petals drifted between them.",
  "wolf greeting\u0000greets {target} with a warm, playful wolfish grin.",
  "inspect knots\u0000circles {target}, carefully inspecting every knot.",
  "offer hand\u0000offers {target} a hand with an inviting smile.",
  "moonlit promise\u0000touches two fingers to their heart, then gestures solemnly toward {target}.",
]);

export function createCustomActivityId(now = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `activity-${now.toString(36)}-${random}`;
}

export function createBlankCustomActivity(id = createCustomActivityId()): CustomActivityDefinition {
  return {
    id,
    name: "",
    targetGroup: DEFAULT_CUSTOM_ACTIVITY_GROUP,
    targetMode: "other",
    template: "{me} touches {target's} arm.",
    image: DEFAULT_CUSTOM_ACTIVITY_IMAGE,
    arousal: 0,
  };
}

export function sanitizeCustomActivities(value: unknown): CustomActivityDefinition[] {
  if (!Array.isArray(value)) return [];
  const result: CustomActivityDefinition[] = [];
  const usedIds = new Set<string>();
  for (const entry of value.slice(0, MAX_CUSTOM_ACTIVITIES)) {
    const activity = sanitizeCustomActivity(entry, result.length);
    if (!activity) continue;
    let id = activity.id;
    let suffix = 2;
    while (usedIds.has(id)) {
      const ending = `-${suffix++}`;
      id = `${activity.id.slice(0, 64 - ending.length)}${ending}`;
    }
    usedIds.add(id);
    result.push({ ...activity, id });
  }
  return result;
}

/**
 * Converts only user-created legacy emotes. The old bundled starter pack is intentionally
 * discarded so a freshly upgraded user gets the requested empty custom library.
 */
export function migrateLegacyCustomActivities(value: unknown): CustomActivityDefinition[] {
  const legacy = sanitizeLegacyRoomActivities(value).filter(
    (activity) =>
      activity.pack !== "KikiLink Starter" &&
      !OLD_STARTER_FINGERPRINTS.has(roomActivityFingerprint(activity)),
  );
  return sanitizeCustomActivities(
    legacy.map((activity, index) => ({
      id: legacyActivityId(activity, index),
      name: activity.label,
      targetGroup: DEFAULT_CUSTOM_ACTIVITY_GROUP,
      targetMode: "other",
      template: activity.template
        .replaceAll("{source}", "{me}")
        .replaceAll("{target}", "{target}"),
      image: DEFAULT_CUSTOM_ACTIVITY_IMAGE,
      arousal: 0,
    })),
  );
}

function sanitizeCustomActivity(value: unknown, index: number): CustomActivityDefinition | undefined {
  if (!isRecord(value)) return undefined;
  const name = cleanText(value.name, 40);
  const template = cleanText(value.template, 500);
  if (!name || !template) return undefined;
  const sourceId = cleanId(value.id) || `activity-${index + 1}`;
  const targetGroup = safeAssetName(value.targetGroup, DEFAULT_CUSTOM_ACTIVITY_GROUP);
  const image = safeAssetName(value.image, DEFAULT_CUSTOM_ACTIVITY_IMAGE);
  return {
    id: sourceId,
    name,
    targetGroup,
    targetMode:
      value.targetMode === "self" || value.targetMode === "both" ? value.targetMode : "other",
    template,
    image,
    arousal: integerInRange(value.arousal, 0, 20, 0),
  };
}

function roomActivityFingerprint(activity: RoomActivity): string {
  return `${activity.label.trim().toLocaleLowerCase()}\u0000${activity.template.trim().toLocaleLowerCase()}`;
}

function sanitizeLegacyRoomActivities(value: unknown): RoomActivity[] {
  if (!Array.isArray(value)) return [];
  const activities: RoomActivity[] = [];
  for (const entry of value.slice(0, MAX_CUSTOM_ACTIVITIES)) {
    if (!isRecord(entry)) continue;
    const label = cleanText(entry.label, 32);
    const template = cleanText(entry.template, 500);
    if (!label || !template) continue;
    activities.push({
      label,
      template,
      category: cleanText(entry.category, 24) || "Uncategorized",
      pack: cleanText(entry.pack, 32) || "My Activities",
      favorite: entry.favorite === true,
    });
  }
  return activities;
}

function legacyActivityId(activity: RoomActivity, index: number): string {
  const slug = activity.label
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return `legacy-${slug || index + 1}`;
}

function cleanText(value: unknown, limit: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit)
    : "";
}

function cleanId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 64);
}

function safeAssetName(value: unknown, fallback: string): string {
  return typeof value === "string" && SAFE_ASSET_NAME.test(value) ? value : fallback;
}

function integerInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
