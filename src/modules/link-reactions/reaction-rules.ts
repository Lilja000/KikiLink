import type { ReactionRule } from "../../core/types";

export const MAX_REACTION_RULES = 20;
export const MAX_REACTION_MEMBERS = 20;
export const MAX_REACTION_COOLDOWN_SECONDS = 3_600;

export function createDefaultReactionRule(id: string): ReactionRule {
  return {
    id,
    label: "Friend joined",
    enabled: true,
    trigger: "room-join",
    scope: "friends",
    memberNumbers: [],
    textMatch: "",
    action: "notice",
    template: "{name} joined {room}.",
    cooldownSeconds: 30,
  };
}

export function sanitizeReactionRules(value: unknown): ReactionRule[] {
  if (!Array.isArray(value)) return [];

  const rules: ReactionRule[] = [];
  const ids = new Set<string>();
  for (const [index, entry] of value.slice(0, MAX_REACTION_RULES).entries()) {
    if (!isRecord(entry)) continue;
    const label = cleanText(entry.label, 32);
    const template = cleanText(entry.template, 500);
    if (!label || !template) continue;

    const scope =
      entry.scope === "friends" || entry.scope === "members" ? entry.scope : "anyone";
    const memberNumbers = sanitizeMemberNumbers(entry.memberNumbers);
    if (scope === "members" && memberNumbers.length === 0) continue;

    const baseId = cleanIdentifier(entry.id) || `reaction-${index + 1}`;
    const id = uniqueId(baseId, ids);
    ids.add(id);
    rules.push({
      id,
      label,
      enabled: entry.enabled !== false,
      trigger:
        entry.trigger === "room-join" ||
        entry.trigger === "room-leave" ||
        entry.trigger === "friend-online"
          ? entry.trigger
          : "beep-received",
      scope,
      memberNumbers,
      textMatch: cleanText(entry.textMatch, 80),
      action: entry.action === "room-emote" ? "room-emote" : "notice",
      template,
      cooldownSeconds: integerInRange(
        entry.cooldownSeconds,
        0,
        MAX_REACTION_COOLDOWN_SECONDS,
        30,
      ),
    });
  }
  return rules;
}

function sanitizeMemberNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (memberNumber): memberNumber is number =>
          typeof memberNumber === "number" &&
          Number.isSafeInteger(memberNumber) &&
          memberNumber >= 0,
      ),
    ),
  ].slice(0, MAX_REACTION_MEMBERS);
}

function uniqueId(base: string, ids: Set<string>): string {
  if (!ids.has(base)) return base;
  for (let suffix = 2; suffix <= MAX_REACTION_RULES + 1; suffix += 1) {
    const candidate = `${base.slice(0, Math.max(1, 47 - suffix.toString().length))}-${suffix}`;
    if (!ids.has(candidate)) return candidate;
  }
  return `reaction-${ids.size + 1}`;
}

function cleanIdentifier(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLocaleLowerCase().replace(/[^a-z0-9_-]/gu, "-").slice(0, 48)
    : "";
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u001f\u007f]/gu, " ")
        .replace(/\s+/gu, " ")
        .trim()
        .slice(0, maxLength)
    : "";
}

function integerInRange(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
