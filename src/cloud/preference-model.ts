import catalogJson from "../../cloud/shared/preferences-catalog.json";

export const PREFERENCE_LEVELS = [
  "hate",
  "dislike",
  "neutral",
  "like",
  "love",
  "hard_limit",
] as const;

export type PreferenceLevel = (typeof PREFERENCE_LEVELS)[number];
export type PreferenceMode = "private" | "score" | "friends" | "public";

/** Only the quick Like/Dislike choices toggle off; other levels stay explicit. */
export function preferenceLevelAfterTap(current: PreferenceLevel | undefined, selected: PreferenceLevel): PreferenceLevel | undefined {
  return current === selected && (selected === "like" || selected === "dislike") ? undefined : selected;
}

export interface PreferenceCatalogItem {
  id: string;
  label: string;
  category: string;
  aliases: string[];
  sources: string[];
  popular?: boolean;
  edge?: boolean;
}

export interface PreferenceCatalog {
  version: string;
  audience: string;
  items: PreferenceCatalogItem[];
}

export interface Preferences {
  mode: PreferenceMode;
  ratings: Record<string, PreferenceLevel>;
  revision: number;
  catalogVersion: string;
}

export interface SharedPreference {
  id: string;
  yours: PreferenceLevel;
  theirs: PreferenceLevel;
}

export interface Compatibility {
  status: "available" | "insufficient" | "private" | "opt_in_required";
  count?: number;
  score?: number;
  hardLimitConflictCount?: number;
  shared?: SharedPreference[];
}

export type CompatibilitySection =
  | "strong"
  | "match"
  | "minor"
  | "conflict"
  | "hard_limit";

export const catalog = catalogJson as PreferenceCatalog;
export const catalogById = new Map(catalog.items.map(item => [item.id, item]));
export const PREFERENCE_CATEGORIES = [...new Set(catalog.items.map(item => item.category))];

export const PREFERENCE_LEVEL_LABELS: Record<PreferenceLevel, string> = {
  hate: "Hate",
  dislike: "Dislike",
  neutral: "Neutral",
  like: "Like",
  love: "Love",
  hard_limit: "Hard Limit",
};

export const PREFERENCE_LEVEL_SHORT_LABELS: Record<PreferenceLevel, string> = {
  hate: "Hate",
  dislike: "Dislike",
  neutral: "Neutral",
  like: "Like",
  love: "Love",
  hard_limit: "Limit",
};

const LEGACY_LEVELS: Record<number, PreferenceLevel> = {
  [-2]: "hate",
  [-1]: "dislike",
  0: "neutral",
  1: "like",
  2: "love",
};

const SCORES: Record<Exclude<PreferenceLevel, "hard_limit">, number> = {
  hate: -2,
  dislike: -1,
  neutral: 0,
  like: 1,
  love: 2,
};

export function normalizePreferenceLevel(value: unknown): PreferenceLevel | undefined {
  if (typeof value === "number" && Number.isInteger(value)) return LEGACY_LEVELS[value];
  return typeof value === "string" && PREFERENCE_LEVELS.includes(value as PreferenceLevel)
    ? value as PreferenceLevel
    : undefined;
}

export function normalizePreferenceRatings(value: unknown): Record<string, PreferenceLevel> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, PreferenceLevel> = {};
  for (const [id, raw] of Object.entries(value)) {
    const level = normalizePreferenceLevel(raw);
    if (level) result[id] = level;
  }
  return result;
}

export function normalizePreferenceSearch(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

export function preferenceMatchesSearch(item: PreferenceCatalogItem, rawQuery: string): boolean {
  const query = normalizePreferenceSearch(rawQuery);
  return !query || [item.label, ...item.aliases].some(value => normalizePreferenceSearch(value).includes(query));
}

export function isHardLimitConflict(left: PreferenceLevel, right: PreferenceLevel): boolean {
  return left === "hard_limit" && (right === "like" || right === "love") ||
    right === "hard_limit" && (left === "like" || left === "love");
}

/** Symmetric similarity. Hard limits remain a separate, explicit compatibility signal. */
export function preferenceSimilarity(left: PreferenceLevel, right: PreferenceLevel): number {
  if (left === "hard_limit" || right === "hard_limit") {
    if (left === right) return 1;
    const other = left === "hard_limit" ? right : left;
    if (other === "hate") return 1;
    if (other === "dislike") return 0.75;
    if (other === "neutral") return 0.5;
    return 0;
  }
  return 1 - Math.abs(SCORES[left] - SCORES[right]) / 4;
}

export function compatibilitySection(entry: SharedPreference): CompatibilitySection {
  if (isHardLimitConflict(entry.yours, entry.theirs)) return "hard_limit";
  if (entry.yours === "neutral" || entry.theirs === "neutral") return "minor";
  const similarity = preferenceSimilarity(entry.yours, entry.theirs);
  if (similarity >= 0.9) return "strong";
  if (similarity >= 0.7) return "match";
  if (similarity >= 0.45) return "minor";
  return "conflict";
}

export function configuredPreferenceGroups(ratings: Record<string, PreferenceLevel>): Array<{
  level: PreferenceLevel;
  label: string;
  items: PreferenceCatalogItem[];
}> {
  const order: PreferenceLevel[] = ["love", "like", "neutral", "dislike", "hate", "hard_limit"];
  const labels: Record<PreferenceLevel, string> = {
    love: "Loves",
    like: "Likes",
    neutral: "Neutral",
    dislike: "Dislikes",
    hate: "Hates",
    hard_limit: "Hard Limits",
  };
  return order.map(level => ({
    level,
    label: labels[level],
    items: catalog.items.filter(item => ratings[item.id] === level),
  })).filter(group => group.items.length > 0);
}
