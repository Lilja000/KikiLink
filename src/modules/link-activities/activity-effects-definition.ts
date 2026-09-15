import type { CustomActivityEffects, CustomActivityStep, CustomActivityTransferDirection } from "../../core/types";
import { sanitizeClothingTemplate, type ClothingTemplate } from "../../core/appearance-template";

export const MAX_SEQUENCE_STEPS = 8;
export const MAX_STEP_TIME_MS = 15_000;
export const MAX_SEQUENCE_TIME_MS = 120_000;
const MAX_CHANGES = 16;
// Asset names supplied by compatible addons need not be ASCII identifiers.
const capabilityName = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 100 &&
  !/[\u0000-\u001f\u007f]/u.test(value) && !["__proto__", "prototype", "constructor"].includes(value);

export function blankActivityStep(): CustomActivityStep {
  return { delayMs: 0, durationMs: 3000, expressions: [], poses: [], removeClothing: [] };
}

export function sanitizeActivityEffects(value: unknown): CustomActivityEffects | undefined {
  if (!record(value) || !Array.isArray(value.steps)) return undefined;
  const steps: CustomActivityStep[] = [];
  let remaining = MAX_SEQUENCE_TIME_MS;
  for (const input of value.steps.slice(0, MAX_SEQUENCE_STEPS)) {
    if (!record(input) || remaining <= 0) continue;
    const expressions = new Map<string, string | null>();
    if (Array.isArray(input.expressions)) {
      for (const expression of input.expressions.slice(0, MAX_CHANGES)) {
        if (record(expression) && capabilityName(expression.group) &&
            (expression.value === null || capabilityName(expression.value))) {
          expressions.set(expression.group, expression.value);
        }
      }
    }
    const delayMs = Math.min(time(input.delayMs, 0), remaining);
    remaining -= delayMs;
    const durationMs = Math.min(time(input.durationMs, 3000), remaining);
    remaining -= durationMs;
    const wearClothing: ClothingTemplate[] = [];
    const transfer = record(input.transferClothing) ? input.transferClothing : undefined;
    const slots = transfer && typeof transfer.direction === "string" && ["self-to-target", "target-to-self", "swap"].includes(transfer.direction) ? names(transfer.slots) : [];
    for (const value of Array.isArray(input.wearClothing) ? input.wearClothing.slice(0, MAX_CHANGES) : []) {
      const item = sanitizeClothingTemplate(value);
      if (item && !slots.includes(item.Group) && !wearClothing.some(other => other.Group === item.Group)) wearClothing.push(item);
    }
    steps.push({ delayMs, durationMs, expressions: [...expressions].map(([group, value]) => ({ group, value })),
      poses: names(input.poses), removeClothing: names(input.removeClothing).filter(group => !slots.includes(group) && !wearClothing.some(item => item.Group === group)),
      ...(slots.length ? { transferClothing: { direction: transfer!.direction as CustomActivityTransferDirection, slots } } : {}),
      ...(wearClothing.length ? { wearClothing } : {}) });
  }
  if (!steps.some(step => step.expressions.length || step.poses.length || step.removeClothing.length || step.wearClothing?.length || step.transferClothing?.slots.length)) return undefined;
  return { subject: value.subject === "target" ? "target" : "actor", restore: value.restore !== false, steps };
}

function time(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_STEP_TIME_MS, Math.round(value))) : fallback;
}
function names(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.slice(0, MAX_CHANGES).filter(capabilityName))] : [];
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
