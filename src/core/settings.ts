import type { KikiLinkSettings, QuickAction } from "./types";
import {
  migrateLegacyCustomActivities,
  sanitizeCustomActivities,
} from "../modules/link-activities/custom-activity-library";
import { sanitizeReactionRules } from "../modules/link-reactions/reaction-rules";
import { normalizeImageUrl } from "../modules/link-chat/media";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_SETTINGS: KikiLinkSettings = {
  schemaVersion: 22,
  ui: {
    accent: "#d71932",
    theme: "dark",
    density: "comfortable",
    textScale: "normal",
    homeLayout: "showcase",
    launcherSide: "right",
    launcherOpen: "home",
    launcherPosition: null,
    panelPosition: null,
    roomBadge: {
      enabled: true,
      position: null,
    },
    reducedMotion: false,
    settingsSection: "appearance",
  },
  linkChat: {
    enabled: true,
    saveHistory: true,
    includeRoomByDefault: false,
    retentionDays: 90,
    maxMessagesPerConversation: 500,
    openOnIncoming: false,
    enterToSend: true,
    typingIndicators: true,
    imagePreviews: "ask",
    imageUploads: {
      enabled: true,
      retention: "24h",
    },
    gallery: {
      saved: [],
      hiddenUrls: [],
    },
    quickActions: [
      { label: "Wave", template: "*waves to {name}*" },
      { label: "Hug", template: "*hugs {name} warmly*" },
      { label: "Boop", template: "*gently boops {name}*" },
    ],
  },
  linkPresence: {
    enabled: true,
    status: "online",
    statusMessage: "",
    avatarUrl: "",
    autoIdleMinutes: 10,
    afkAutoReply: {
      enabled: false,
      message: "Hi, I'm AFK. Message me later!",
    },
  },
  linkActivities: {
    enabled: true,
    customActivities: [],
  },
  linkRoster: {
    enabled: true,
    trackEncounters: true,
    retentionDays: 365,
  },
  linkReactions: {
    quickAlerts: {
      friendOnline: false,
      roomJoin: false,
    },
    sounds: {
      enabled: false,
      volume: 65,
      chat: "chime",
      friendOnline: "sparkle",
      roomJoin: "pop",
    },
    enabled: false,
    rules: [],
  },
  linkRoom: {
    presets: [],
  },
  linkMusic: {
    playlists: [{ id: "main", name: "My playlist", tracks: [] }],
    activePlaylistId: "main",
    repeatMode: "off",
    shuffle: false,
    volume: 70,
  },
};

export const SETTINGS_KEY = "kikilink:settings:v1";

export class SettingsStore {
  #settings: KikiLinkSettings;
  readonly #storage: KeyValueStorage;
  readonly #listeners = new Set<(settings: KikiLinkSettings) => void>();

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
    const settings = this.get();
    this.#notify(settings);
    return settings;
  }

  reset(): KikiLinkSettings {
    this.#settings = structuredClone(DEFAULT_SETTINGS);
    try {
      this.#storage.removeItem(SETTINGS_KEY);
    } catch {
      // The in-memory reset still succeeds.
    }
    const settings = this.get();
    this.#notify(settings);
    return settings;
  }

  subscribe(listener: (settings: KikiLinkSettings) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify(settings: KikiLinkSettings): void {
    for (const listener of [...this.#listeners]) listener(structuredClone(settings));
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
  const sourceSchema =
    typeof source.schemaVersion === "number" && Number.isFinite(source.schemaVersion)
      ? source.schemaVersion
      : 1;
  const ui = isRecord(source.ui) ? source.ui : {};
  const linkChat = isRecord(source.linkChat) ? source.linkChat : {};
  const imageUploads = isRecord(linkChat.imageUploads) ? linkChat.imageUploads : {};
  const linkPresence = isRecord(source.linkPresence) ? source.linkPresence : {};
  const linkActivities = isRecord(source.linkActivities) ? source.linkActivities : {};
  const linkRoster = isRecord(source.linkRoster) ? source.linkRoster : {};
  const linkReactions = isRecord(source.linkReactions) ? source.linkReactions : {};
  const linkRoom = isRecord(source.linkRoom) ? source.linkRoom : {};
  const linkMusic = isRecord(source.linkMusic) ? source.linkMusic : {};

  return {
    schemaVersion: 22,
    ui: {
      accent: validColor(ui.accent) ? ui.accent : DEFAULT_SETTINGS.ui.accent,
      theme:
        ui.theme === "light" || ui.theme === "system" || ui.theme === "dark"
          ? ui.theme
          : DEFAULT_SETTINGS.ui.theme,
      density:
        ui.density === "compact" || ui.density === "super-compact"
          ? ui.density
          : DEFAULT_SETTINGS.ui.density,
      textScale:
        ui.textScale === "large" || ui.textScale === "extra-large"
          ? ui.textScale
          : DEFAULT_SETTINGS.ui.textScale,
      homeLayout:
        ui.homeLayout === "compact" ? "compact" : DEFAULT_SETTINGS.ui.homeLayout,
      launcherSide: ui.launcherSide === "left" ? "left" : "right",
      launcherOpen:
        ui.launcherOpen === "last" || ui.launcherOpen === "chat"
          ? ui.launcherOpen
          : DEFAULT_SETTINGS.ui.launcherOpen,
      launcherPosition: sanitizeLauncherPosition(ui.launcherPosition),
      panelPosition: sanitizeLauncherPosition(ui.panelPosition),
      roomBadge: sanitizeRoomBadge(ui.roomBadge, sourceSchema),
      reducedMotion: booleanOr(ui.reducedMotion, DEFAULT_SETTINGS.ui.reducedMotion),
      settingsSection: isSettingsSection(ui.settingsSection)
        ? ui.settingsSection
        : DEFAULT_SETTINGS.ui.settingsSection,
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
      enterToSend: booleanOr(linkChat.enterToSend, DEFAULT_SETTINGS.linkChat.enterToSend),
      typingIndicators: booleanOr(
        linkChat.typingIndicators,
        DEFAULT_SETTINGS.linkChat.typingIndicators,
      ),
      imagePreviews:
        linkChat.imagePreviews === "always" || linkChat.imagePreviews === "never"
          ? linkChat.imagePreviews
          : DEFAULT_SETTINGS.linkChat.imagePreviews,
      imageUploads: sanitizeImageUploads(imageUploads, sourceSchema),
      gallery: sanitizeGallery(linkChat.gallery),
      quickActions: sanitizeQuickActions(linkChat.quickActions),
    },
    linkPresence: {
      enabled: booleanOr(linkPresence.enabled, DEFAULT_SETTINGS.linkPresence.enabled),
      status:
        linkPresence.status === "idle" ||
        linkPresence.status === "dnd" ||
        linkPresence.status === "offline"
          ? linkPresence.status
          : DEFAULT_SETTINGS.linkPresence.status,
      statusMessage:
        typeof linkPresence.statusMessage === "string"
          ? linkPresence.statusMessage.trim().slice(0, 80)
          : DEFAULT_SETTINGS.linkPresence.statusMessage,
      avatarUrl: sanitizeAvatarUrl(linkPresence.avatarUrl),
      autoIdleMinutes: integerInRange(
        linkPresence.autoIdleMinutes,
        0,
        120,
        DEFAULT_SETTINGS.linkPresence.autoIdleMinutes,
      ),
      afkAutoReply: sanitizeAfkAutoReply(linkPresence.afkAutoReply, sourceSchema),
    },
    linkActivities: {
      enabled:
        sourceSchema < 13
          ? true
          : booleanOr(linkActivities.enabled, DEFAULT_SETTINGS.linkActivities.enabled),
      customActivities:
        sourceSchema < 13
          ? migrateLegacyCustomActivities(linkActivities.activities)
          : sanitizeCustomActivities(linkActivities.customActivities),
    },
    linkRoster: {
      enabled: booleanOr(linkRoster.enabled, DEFAULT_SETTINGS.linkRoster.enabled),
      trackEncounters: booleanOr(
        linkRoster.trackEncounters,
        DEFAULT_SETTINGS.linkRoster.trackEncounters,
      ),
      retentionDays: rosterRetentionDaysOr(linkRoster.retentionDays),
    },
    linkReactions: {
      quickAlerts: sanitizeQuickAlerts(linkReactions.quickAlerts),
      sounds: sanitizeNotificationSounds(linkReactions.sounds),
      enabled: booleanOr(linkReactions.enabled, DEFAULT_SETTINGS.linkReactions.enabled),
      rules: sanitizeReactionRules(linkReactions.rules),
    },
    linkRoom: {
      presets: sanitizeRoomPresets(linkRoom.presets),
    },
    linkMusic: sanitizeMusicSettings(linkMusic, sourceSchema),
  };
}

function sanitizeRoomPresets(value: unknown): KikiLinkSettings["linkRoom"]["presets"] {
  if (!Array.isArray(value)) return [];
  const presets: KikiLinkSettings["linkRoom"]["presets"] = [];
  const ids = new Set<string>();
  for (const candidate of value.slice(0, 12)) {
    if (!isRecord(candidate) || !isRecord(candidate.room)) continue;
    const id = safeLocalId(candidate.id);
    const label = cleanBoundedText(candidate.label, 60);
    if (!id || !label || ids.has(id)) continue;
    const room = candidate.room;
    const custom = isRecord(room.custom) ? room.custom : {};
    const savedAt = finiteTimestamp(candidate.savedAt);
    presets.push({
      id,
      label,
      savedAt,
      room: {
        name: cleanBoundedText(room.name, 80),
        description: cleanBoundedText(room.description, 200),
        background: cleanBoundedText(room.background, 120),
        limit: integerInRange(room.limit, 2, 20, 10),
        game: cleanBoundedText(room.game, 40),
        space: cleanBoundedText(room.space, 20),
        language: cleanBoundedText(room.language, 12),
        visibility: sanitizeShortStringList(room.visibility, 8, 30),
        access: sanitizeShortStringList(room.access, 8, 30),
        blockCategory: sanitizeShortStringList(room.blockCategory, 24, 40),
        admins: sanitizeMemberNumbers(room.admins, 20),
        whitelist: sanitizeMemberNumbers(room.whitelist, 100),
        blacklist: sanitizeMemberNumbers(room.blacklist, 100),
        custom: {
          imageUrl: sanitizeHttpsUrl(custom.imageUrl),
          imageFilter: cleanBoundedText(custom.imageFilter, 120),
          musicUrl: sanitizeHttpsUrl(custom.musicUrl),
          sizeMode: integerInRange(custom.sizeMode, 1, 3, 1),
          musicSync: booleanOr(custom.musicSync, false),
        },
      },
    });
    ids.add(id);
  }
  return presets.sort((left, right) => right.savedAt - left.savedAt);
}

function sanitizeMusicSettings(
  value: Record<string, unknown>,
  sourceSchema: number,
): KikiLinkSettings["linkMusic"] {
  const playlists: KikiLinkSettings["linkMusic"]["playlists"] = [];
  const playlistIds = new Set<string>();
  let trackBudget = 100;
  if (Array.isArray(value.playlists)) {
    for (const candidate of value.playlists.slice(0, 8)) {
      if (!isRecord(candidate)) continue;
      const id = safeLocalId(candidate.id);
      const name = cleanBoundedText(candidate.name, 60);
      if (!id || !name || playlistIds.has(id)) continue;
      const tracks: KikiLinkSettings["linkMusic"]["playlists"][number]["tracks"] = [];
      const trackIds = new Set<string>();
      if (Array.isArray(candidate.tracks)) {
        for (const track of candidate.tracks) {
          if (trackBudget <= 0 || !isRecord(track)) break;
          const trackId = safeLocalId(track.id);
          const title = cleanBoundedText(track.title, 80);
          const source = track.source === "local"
            ? "local"
            : track.source === "catbox" ||
                track.source === "hosted" ||
                (sourceSchema < 20 && typeof track.source === "string" && track.source !== "url")
              ? "catbox"
              : "url";
          const locator = source === "local" ? safeLocalId(track.locator) : sanitizeAudioUrl(track.locator);
          if (!trackId || !title || !locator || trackIds.has(trackId)) continue;
          tracks.push({
            id: trackId,
            title,
            source,
            locator,
            addedAt: finiteTimestamp(track.addedAt),
          });
          trackIds.add(trackId);
          trackBudget -= 1;
        }
      }
      playlists.push({ id, name, tracks });
      playlistIds.add(id);
    }
  }
  if (playlists.length === 0) playlists.push(structuredClone(DEFAULT_SETTINGS.linkMusic.playlists[0]!));
  const requestedActiveId = safeLocalId(value.activePlaylistId);
  const activePlaylistId = playlists.some((playlist) => playlist.id === requestedActiveId)
    ? requestedActiveId!
    : playlists[0]!.id;
  return {
    playlists,
    activePlaylistId,
    repeatMode: value.repeatMode === "all" || value.repeatMode === "one" ? value.repeatMode : "off",
    shuffle: booleanOr(value.shuffle, DEFAULT_SETTINGS.linkMusic.shuffle),
    volume: integerInRange(value.volume, 0, 100, DEFAULT_SETTINGS.linkMusic.volume),
  };
}

function sanitizeImageUploads(
  value: Record<string, unknown>,
  sourceSchema: number,
): KikiLinkSettings["linkChat"]["imageUploads"] {
  return {
    // Schema 13 stored Cloudinary credentials. Do not silently reinterpret its enabled switch as
    // consent to upload to a different third-party provider after upgrading.
    enabled:
      sourceSchema < 14
        ? false
        : booleanOr(value.enabled, DEFAULT_SETTINGS.linkChat.imageUploads.enabled),
    retention: sanitizeLitterboxRetention(value.retention),
  };
}

function sanitizeLitterboxRetention(
  value: unknown,
): KikiLinkSettings["linkChat"]["imageUploads"]["retention"] {
  if (value === "1h" || value === "12h" || value === "24h" || value === "72h") return value;
  // Preserve the nearest supported lifetime when returning from WaifuVault settings.
  if (value === "1d") return "24h";
  if (value === "3d" || value === "7d" || value === "30d") return "72h";
  return DEFAULT_SETTINGS.linkChat.imageUploads.retention;
}

function sanitizeGallery(value: unknown): KikiLinkSettings["linkChat"]["gallery"] {
  const source = isRecord(value) ? value : {};
  const hiddenUrls = sanitizeImageUrlList(source.hiddenUrls, 80);
  const hidden = new Set(hiddenUrls);
  const savedByUrl = new Map<string, { url: string; addedAt: number }>();
  if (Array.isArray(source.saved)) {
    for (const candidate of source.saved.slice(0, 80)) {
      if (!isRecord(candidate)) continue;
      const url = sanitizeDirectImageUrl(candidate.url);
      if (!url || hidden.has(url) || savedByUrl.has(url)) continue;
      const addedAt =
        typeof candidate.addedAt === "number" &&
        Number.isFinite(candidate.addedAt) &&
        candidate.addedAt > 0
          ? Math.min(Date.now(), Math.round(candidate.addedAt))
          : Date.now();
      savedByUrl.set(url, { url, addedAt });
      if (savedByUrl.size >= 40) break;
    }
  }
  return {
    saved: [...savedByUrl.values()].sort((left, right) => right.addedAt - left.addedAt),
    hiddenUrls,
  };
}

function sanitizeImageUrlList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const urls = new Set<string>();
  for (const candidate of value) {
    const url = sanitizeDirectImageUrl(candidate);
    if (!url) continue;
    urls.add(url);
    if (urls.size >= limit) break;
  }
  return [...urls];
}

function sanitizeDirectImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length > 500) return undefined;
  const url = normalizeImageUrl(value);
  return url && url.length <= 500 ? url : undefined;
}

function sanitizeAfkAutoReply(
  value: unknown,
  sourceSchema: number,
): KikiLinkSettings["linkPresence"]["afkAutoReply"] {
  const source = isRecord(value) ? value : {};
  let message =
    typeof source.message === "string"
      ? source.message.trim().slice(0, 500)
      : DEFAULT_SETTINGS.linkPresence.afkAutoReply.message;
  if (sourceSchema < 15 && message === "Привет, я АФК, напишите мне позже!") {
    message = DEFAULT_SETTINGS.linkPresence.afkAutoReply.message;
  }
  return {
    enabled: booleanOr(source.enabled, DEFAULT_SETTINGS.linkPresence.afkAutoReply.enabled),
    message: message || DEFAULT_SETTINGS.linkPresence.afkAutoReply.message,
  };
}

function sanitizeAvatarUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim().length > 500) return "";
  const normalized = normalizeImageUrl(value);
  return normalized && normalized.length <= 500 ? normalized : "";
}

function sanitizeRoomBadge(
  value: unknown,
  sourceSchema: number,
): KikiLinkSettings["ui"]["roomBadge"] {
  const source = isRecord(value) ? value : {};
  return {
    enabled: booleanOr(source.enabled, DEFAULT_SETTINGS.ui.roomBadge.enabled),
    // v15 stored viewport coordinates. They cannot be assigned safely to a character, so the
    // first canvas-native release deliberately returns the flower to its documented icon row.
    position: sourceSchema >= 16 ? sanitizeLauncherPosition(source.position) : null,
  };
}

function sanitizeQuickAlerts(value: unknown): KikiLinkSettings["linkReactions"]["quickAlerts"] {
  const source = isRecord(value) ? value : {};
  return {
    friendOnline: booleanOr(
      source.friendOnline,
      DEFAULT_SETTINGS.linkReactions.quickAlerts.friendOnline,
    ),
    roomJoin: booleanOr(
      source.roomJoin,
      DEFAULT_SETTINGS.linkReactions.quickAlerts.roomJoin,
    ),
  };
}

function sanitizeNotificationSounds(
  value: unknown,
): KikiLinkSettings["linkReactions"]["sounds"] {
  const source = isRecord(value) ? value : {};
  return {
    enabled: booleanOr(source.enabled, DEFAULT_SETTINGS.linkReactions.sounds.enabled),
    volume: integerInRange(
      source.volume,
      0,
      100,
      DEFAULT_SETTINGS.linkReactions.sounds.volume,
    ),
    chat: notificationSoundOr(source.chat, DEFAULT_SETTINGS.linkReactions.sounds.chat),
    friendOnline: notificationSoundOr(
      source.friendOnline,
      DEFAULT_SETTINGS.linkReactions.sounds.friendOnline,
    ),
    roomJoin: notificationSoundOr(
      source.roomJoin,
      DEFAULT_SETTINGS.linkReactions.sounds.roomJoin,
    ),
  };
}

function notificationSoundOr(
  value: unknown,
  fallback: KikiLinkSettings["linkReactions"]["sounds"]["chat"],
): KikiLinkSettings["linkReactions"]["sounds"]["chat"] {
  return value === "sparkle" ||
    value === "pop" ||
    value === "chime" ||
    (typeof value === "string" && /^custom:[a-z0-9_-]{1,64}$/iu.test(value))
    ? value as KikiLinkSettings["linkReactions"]["sounds"]["chat"]
    : fallback;
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

function safeLocalId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim().toLocaleLowerCase();
  return /^[a-z0-9_-]{1,64}$/u.test(id) ? id : undefined;
}

function cleanBoundedText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/gu, " ").trim().slice(0, maxLength)
    : "";
}

function finiteTimestamp(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(Date.now(), Math.round(value))
    : Date.now();
}

function sanitizeShortStringList(value: unknown, limit: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const result = new Set<string>();
  for (const candidate of value) {
    const text = cleanBoundedText(candidate, maxLength);
    if (text) result.add(text);
    if (result.size >= limit) break;
  }
  return [...result];
}

function sanitizeMemberNumbers(value: unknown, limit: number): number[] {
  if (!Array.isArray(value)) return [];
  const result = new Set<number>();
  for (const candidate of value) {
    if (typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0) {
      result.add(candidate);
    }
    if (result.size >= limit) break;
  }
  return [...result];
}

function sanitizeHttpsUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim().length > 500) return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.href.slice(0, 500);
  } catch {
    return "";
  }
}

function sanitizeAudioUrl(value: unknown): string | undefined {
  const url = sanitizeHttpsUrl(value);
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return /\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(parsed.pathname)
      ? url
      : undefined;
  } catch {
    return undefined;
  }
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

function rosterRetentionDaysOr(value: unknown): number {
  return value === 0 || value === 30 || value === 90 || value === 180 || value === 365 || value === 730
    ? value
    : DEFAULT_SETTINGS.linkRoster.retentionDays;
}

function finiteNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function validColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value);
}

function isSettingsSection(
  value: unknown,
): value is KikiLinkSettings["ui"]["settingsSection"] {
  return (
    value === "appearance" ||
    value === "navigation" ||
    value === "chat" ||
    value === "players" ||
    value === "activities" ||
    value === "reactions" ||
    value === "about"
  );
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
