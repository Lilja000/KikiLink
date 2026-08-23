import type { KikiLinkSettings, QuickAction, RoomActivity } from "./types";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_SETTINGS: KikiLinkSettings = {
  schemaVersion: 2,
  ui: {
    accent: "#d71932",
    theme: "dark",
    launcherSide: "right",
    launcherPosition: null,
    reducedMotion: false,
  },
  linkChat: {
    enabled: true,
    saveHistory: true,
    includeRoomByDefault: false,
    retentionDays: 90,
    maxMessagesPerConversation: 500,
    openOnIncoming: false,
    quickActions: [
      { label: "Wave", template: "*waves to {name}*" },
      { label: "Hug", template: "*hugs {name} warmly*" },
      { label: "Boop", template: "*gently boops {name}*" },
    ],
  },
  linkActivities: {
    enabled: true,
    activities: [
      {
        label: "Sakura bow",
        template: "bows gracefully to {target}, as if sakura petals drifted between them.",
      },
      {
        label: "Wolf greeting",
        template: "greets {target} with a warm, playful wolfish grin.",
      },
      {
        label: "Inspect knots",
        template: "circles {target}, carefully inspecting every knot.",
      },
      {
        label: "Offer hand",
        template: "offers {target} a hand with an inviting smile.",
      },
      {
        label: "Moonlit promise",
        template: "touches two fingers to their heart, then gestures solemnly toward {target}.",
      },
    ],
  },
};

const SETTINGS_KEY = "kikilink:settings:v1";

export class SettingsStore {
  #settings: KikiLinkSettings;
  readonly #storage: KeyValueStorage;

  constructor(storage?: KeyValueStorage) {
    this.#storage = storage ?? getDefaultStorage();
    this.#settings = this.#load();
  }

  get(): KikiLinkSettings {
    return structuredClone(this.#settings);
  }

  update(mutator: (draft: KikiLinkSettings) => void): KikiLinkSettings {
    const draft = this.get();
    mutator(draft);
    this.#settings = sanitizeSettings(draft);
    try {
      this.#storage.setItem(SETTINGS_KEY, JSON.stringify(this.#settings));
    } catch {
      // Keep the validated in-memory settings if persistent storage is unavailable.
    }
    return this.get();
  }

  reset(): KikiLinkSettings {
    this.#settings = structuredClone(DEFAULT_SETTINGS);
    try {
      this.#storage.removeItem(SETTINGS_KEY);
    } catch {
      // The in-memory reset still succeeds.
    }
    return this.get();
  }

  #load(): KikiLinkSettings {
    let raw: string | null = null;
    try {
      raw = this.#storage.getItem(SETTINGS_KEY);
    } catch {
      return structuredClone(DEFAULT_SETTINGS);
    }
    if (!raw) return structuredClone(DEFAULT_SETTINGS);

    try {
      return sanitizeSettings(JSON.parse(raw) as unknown);
    } catch {
      return structuredClone(DEFAULT_SETTINGS);
    }
  }
}

export class MemoryKeyValueStorage implements KeyValueStorage {
  readonly #values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }
}

export function sanitizeSettings(input: unknown): KikiLinkSettings {
  const source = isRecord(input) ? input : {};
  const ui = isRecord(source.ui) ? source.ui : {};
  const linkChat = isRecord(source.linkChat) ? source.linkChat : {};
  const linkActivities = isRecord(source.linkActivities) ? source.linkActivities : {};

  return {
    schemaVersion: 2,
    ui: {
      accent: validColor(ui.accent) ? ui.accent : DEFAULT_SETTINGS.ui.accent,
      theme:
        ui.theme === "light" || ui.theme === "system" || ui.theme === "dark"
          ? ui.theme
          : DEFAULT_SETTINGS.ui.theme,
      launcherSide: ui.launcherSide === "left" ? "left" : "right",
      launcherPosition: sanitizeLauncherPosition(ui.launcherPosition),
      reducedMotion: booleanOr(ui.reducedMotion, DEFAULT_SETTINGS.ui.reducedMotion),
    },
    linkChat: {
      enabled: booleanOr(linkChat.enabled, DEFAULT_SETTINGS.linkChat.enabled),
      saveHistory: booleanOr(linkChat.saveHistory, DEFAULT_SETTINGS.linkChat.saveHistory),
      includeRoomByDefault: booleanOr(
        linkChat.includeRoomByDefault,
        DEFAULT_SETTINGS.linkChat.includeRoomByDefault,
      ),
      retentionDays: integerInRange(
        linkChat.retentionDays,
        1,
        3650,
        DEFAULT_SETTINGS.linkChat.retentionDays,
      ),
      maxMessagesPerConversation: integerInRange(
        linkChat.maxMessagesPerConversation,
        50,
        5000,
        DEFAULT_SETTINGS.linkChat.maxMessagesPerConversation,
      ),
      openOnIncoming: booleanOr(
        linkChat.openOnIncoming,
        DEFAULT_SETTINGS.linkChat.openOnIncoming,
      ),
      quickActions: sanitizeQuickActions(linkChat.quickActions),
    },
    linkActivities: {
      enabled: booleanOr(linkActivities.enabled, DEFAULT_SETTINGS.linkActivities.enabled),
      activities: sanitizeRoomActivities(linkActivities.activities),
    },
  };
}

function sanitizeQuickActions(value: unknown): QuickAction[] {
  if (value === undefined) return structuredClone(DEFAULT_SETTINGS.linkChat.quickActions);
  if (!Array.isArray(value)) return structuredClone(DEFAULT_SETTINGS.linkChat.quickActions);

  const actions: QuickAction[] = [];
  for (const entry of value.slice(0, 12)) {
    if (!isRecord(entry)) continue;
    const label = typeof entry.label === "string" ? entry.label.trim().slice(0, 24) : "";
    const template =
      typeof entry.template === "string" ? entry.template.trim().slice(0, 500) : "";
    if (label && template) actions.push({ label, template });
  }
  return actions;
}

function sanitizeRoomActivities(value: unknown): RoomActivity[] {
  if (value === undefined) return structuredClone(DEFAULT_SETTINGS.linkActivities.activities);
  if (!Array.isArray(value)) return structuredClone(DEFAULT_SETTINGS.linkActivities.activities);

  const activities: RoomActivity[] = [];
  for (const entry of value.slice(0, 20)) {
    if (!isRecord(entry)) continue;
    const label = typeof entry.label === "string" ? entry.label.trim().slice(0, 32) : "";
    const template =
      typeof entry.template === "string" ? entry.template.trim().slice(0, 500) : "";
    if (label && template) activities.push({ label, template });
  }
  return activities;
}

function sanitizeLauncherPosition(value: unknown): { x: number; y: number } | null {
  if (!isRecord(value)) return null;
  if (!finiteNumberInRange(value.x, 0, 1) || !finiteNumberInRange(value.y, 0, 1)) return null;
  return { x: value.x, y: value.y };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function integerInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function finiteNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function validColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value);
}

function getDefaultStorage(): KeyValueStorage {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.getItem("kikilink:storage-probe");
      return localStorage;
    }
  } catch {
    // Some browser privacy modes expose localStorage but deny access to it.
  }
  return new MemoryKeyValueStorage();
}
