/** Serializable BC ServerItemBundle. Never persist Asset/Group object references. */
export interface ClothingTemplate {
  Group: string;
  Name: string;
  Color?: string | string[];
  Difficulty?: number;
  Property?: Record<string, unknown>;
  Craft?: Record<string, unknown>;
}

const name = (value: unknown): value is string => typeof value === "string" &&
  value.length > 0 && value.length <= 100 && !/[\u0000-\u001f\u007f]/u.test(value) &&
  !["__proto__", "constructor", "prototype"].includes(value);

/** Keep complete native property trees, with a finite JSON budget and no prototypes. */
export function sanitizeClothingTemplate(value: unknown): ClothingTemplate | undefined {
  if (!record(value) || !name(value.Group) || !name(value.Name)) return undefined;
  try {
    const copy: ClothingTemplate = { Group: value.Group, Name: value.Name };
    if (typeof value.Color === "string") copy.Color = value.Color;
    else if (Array.isArray(value.Color) && value.Color.every(color => typeof color === "string")) copy.Color = [...value.Color];
    if (typeof value.Difficulty === "number" && Number.isFinite(value.Difficulty)) copy.Difficulty = value.Difficulty;
    if (record(value.Property)) copy.Property = cloneJson(value.Property) as Record<string, unknown>;
    if (record(value.Craft)) copy.Craft = cloneJson(value.Craft) as Record<string, unknown>;
    return JSON.stringify(copy).length <= 16_384 ? copy : undefined;
  } catch { return undefined; }
}

function cloneJson(value: unknown, depth = 0, budget = { left: 2048 }): unknown {
  if (--budget.left < 0 || depth > 12) throw new Error("Appearance template is too large");
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(item => cloneJson(item, depth + 1, budget));
  if (!record(value)) throw new Error("Appearance template must be JSON");
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Invalid appearance key");
    if (item !== undefined) copy[key] = cloneJson(item, depth + 1, budget);
  }
  return copy;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
