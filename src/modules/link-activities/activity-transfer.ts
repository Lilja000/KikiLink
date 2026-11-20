import type { CustomActivityDefinition } from "../../core/types";
import { createCustomActivityId, MAX_CUSTOM_ACTIVITIES, sanitizeCustomActivities } from "./custom-activity-library";

export const MAX_ACTIVITY_IMPORT_BYTES = 2 * 1024 * 1024;
const FORMAT = "kikilink-custom-activities";

export function activityExport(activities: readonly CustomActivityDefinition[]): string {
  return JSON.stringify({ format: FORMAT, version: 1, activities }, null, 2);
}

/** Reject lossy/unsupported imports as a whole, instead of silently trimming old steps. */
export function readActivityImport(text: string): CustomActivityDefinition[] {
  if (new TextEncoder().encode(text).byteLength > MAX_ACTIVITY_IMPORT_BYTES) throw new Error("Activity files must be smaller than 2 MiB.");
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error("Choose a valid activity JSON file."); }
  const envelope = data as { format?: unknown; version?: unknown; activities?: unknown } | null;
  const input = Array.isArray(data) ? data : envelope?.format === FORMAT && envelope.version === 1 ? envelope.activities : undefined;
  if (!Array.isArray(input) || !input.length) throw new Error("This file does not contain a supported activity library.");
  if (input.length > MAX_CUSTOM_ACTIVITIES) throw new Error(`An activity file may contain up to ${MAX_CUSTOM_ACTIVITIES} activities.`);
  const normalized = sanitizeCustomActivities(input);
  if (normalized.length !== input.length || canonical(normalized) !== canonical(input)) {
    throw new Error("This file contains unsupported or invalid activity data. Nothing was imported; keep the original export.");
  }
  return normalized;
}

export function mergeActivityImport(current: readonly CustomActivityDefinition[], imported: readonly CustomActivityDefinition[]): { activities: CustomActivityDefinition[]; added: number; skipped: number; renamed: number } {
  const activities = structuredClone([...current]), ids = new Set(activities.map(value => value.id));
  const contents = new Set(activities.map(fingerprint)); let added = 0, skipped = 0, renamed = 0;
  for (const source of imported) {
    if (contents.has(fingerprint(source))) { skipped++; continue; }
    if (activities.length >= MAX_CUSTOM_ACTIVITIES) throw new Error(`Your library holds up to ${MAX_CUSTOM_ACTIVITIES} activities. Nothing was imported.`);
    const copy = structuredClone(source);
    if (ids.has(copy.id)) { const base = createCustomActivityId(); copy.id = base; let suffix = 2; while (ids.has(copy.id)) copy.id = `${base}-${suffix++}`; renamed++; }
    ids.add(copy.id); contents.add(fingerprint(copy)); activities.push(copy); added++;
  }
  return { activities, added, skipped, renamed };
}

function fingerprint(value: CustomActivityDefinition): string { const { id: _id, ...content } = value; return canonical(content); }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
