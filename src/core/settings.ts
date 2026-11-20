import { workshopPaletteReadable } from "./workshop-destinations";
import { scopePersistenceName, scopedBrowserStorage } from "./storage-scope";
import { activeAvatarFrame, normalizeAvatarDecoration, effectiveProfileStyle, publicProfileTags, DEFAULT_AVATAR_DECORATION } from "./profile-appearance";
import type { KikiLinkSettings, QuickAction, MusicPlaylist, TabAlerts } from "./types";
import {
  migrateLegacyCustomActivities,
  sanitizeCustomActivities,
} from "../modules/link-activities/custom-activity-library";
import { sanitizeReactionRules } from "../modules/link-reactions/reaction-rules";
import { normalizeImageUrl } from "../modules/link-chat/media";
import { copyRoomMap } from "./room-map";
import { SettingsPersistence, SETTINGS_SOURCE_LIMIT } from "./settings-persistence";
import { importedSoundSettings, isNotificationSoundPreset, type SoundSettings } from './sound-settings-import';
import { SettingsArchivedSources, type SettingsSourcesPlan } from './settings-archived-sources';

export type KeyValueStorageReadResult =
  | { ok: true; value: string | null }
  | { ok: false };

export interface KeyValueStorage {
  getItem(key: string): string | null;
  /** Distinguishes an absent key from a contained browser-storage read failure. */
  getItemResult?(key: string): KeyValueStorageReadResult;
  /** Read the device copy, bypassing an in-memory or portable mirror, for verified saves. */
  getPersistedItemResult?(key: string): KeyValueStorageReadResult;
  /** Device-only revision of a key; detects intervening writes even when its bytes return. */
  getMutationVersion?(key: string): string | null;
  /** A device write must succeed before updating any portable mirror. */
  setItemVerified?(key: string, value: string): void;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_SETTINGS: KikiLinkSettings = {
  schemaVersion: 30,
  ui: {
    accent: "#d71932",
    workshopPalette: null,
    theme: "dark",
    density: "comfortable",
    timeFormat: "12-hour",
    textScale: "normal",
    homeLayout: "showcase",
    launcherSide: "right",
    launcherOpen: "last",
    launcherSize: 58,
    notificationsMutedUntil: 0,
    unreadBadges: true,
    hiddenTabs: [],
    tabAlerts: { feed: { mode: "all", mutedUntil: 0 }, chat: { mode: "all", mutedUntil: 0 } },
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
    directEnabled: true,
    saveHistory: true,
    includeRoomByDefault: false,
    retentionDays: 90,
    maxMessagesPerConversation: 500,
    openOnIncoming: false,
    enterToSend: true,
    typingIndicators: true,
    imagePreviews: "always",
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
    bio: "",
    profileImagePreviews: "always",
    avatarUrl: "",
    bannerUrl: "",
    avatarFrame: "none",
    avatarDecoration: { ...DEFAULT_AVATAR_DECORATION },
    publicTags: [],
    profileStyle: "classic",
    profileOutlineColor: "",
    profileGradient: {
      enabled: false,
      primary: "#d71932",
      secondary: "#d8b65d",
      angle: 135,
    },
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
      chat: "kiki",
      friendOnline: "sparkle",
      roomJoin: "pop",
    },
    enabled: false,
    rules: [],
  },
  linkRoom: {
    presets: [],
    favoriteRoomNames: [],
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

const RECOVERY_SECTIONS = { ui: 'Appearance & navigation', linkChat: 'Chat preferences & saved links',
  linkPresence: 'Local profile', linkActivities: 'Custom activities', linkRoster: 'Players',
  linkReactions: 'Alerts & automatic rules', linkRoom: 'Room presets', linkMusic: 'Music & playlists' } as const;
export interface SettingsRestoreReview {
  readonly copyId: number; readonly createdAt: number; readonly changedSections: readonly string[];
  readonly archivedDataChanged?: boolean;
  readonly activities: number; readonly playlists: number; readonly rules: number;
}
export interface SettingsImportReview {
  readonly archivedDataChanged?: boolean;
  readonly changedSections: readonly string[]; readonly activities: number; readonly rules: number;
  readonly previousCopyId: number | null; readonly importedCopyId: number;
}
export interface SoundSettingsReview {
  readonly archivedDataChanged?: boolean;
  readonly before: Readonly<SoundSettings>; readonly after: Readonly<SoundSettings>; readonly changed: boolean;
  readonly previousCopyId: number | null; readonly importedCopyId: number;
}

function recoverySettings(raw: string): KikiLinkSettings {
  if (raw.length > SETTINGS_SOURCE_LIMIT || new TextEncoder().encode(raw).length > SETTINGS_SOURCE_LIMIT)
    throw new Error('This copy is too large for this KikiLink version.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('This copy is unreadable. It has not been changed.'); }
  if (!isRecord(value) || (value.schemaVersion !== undefined && (!Number.isSafeInteger(value.schemaVersion) || Number(value.schemaVersion) < 1)))
    throw new Error('This copy has an unsupported settings format.');
  if (Number(value.schemaVersion) > DEFAULT_SETTINGS.schemaVersion) throw new Error('This copy needs a newer KikiLink version.');
  const keys = Object.keys(RECOVERY_SECTIONS);
  if (!keys.some(key => isRecord(value[key])) || keys.some(key => value[key] !== undefined && !isRecord(value[key])))
    throw new Error('This copy does not contain supported settings sections.');
  return sanitizeSettings(value);
}

export interface MusicSettingsBaseline { readonly canonical: string; readonly saved: string | null }

export class SettingsStore {
  #settings: KikiLinkSettings;
  #archived: SettingsArchivedSources | undefined;
  readonly #storage: KeyValueStorage;
  readonly persistence: SettingsPersistence;
  readonly #listeners = new Set<(settings: KikiLinkSettings) => void>();
  #restoreReview: { review: SettingsRestoreReview; before: string; next: KikiLinkSettings; archived: SettingsSourcesPlan;
    source: ReturnType<SettingsPersistence['reviewCopy']> } | undefined;
  #importReview: { review: SettingsImportReview; before: string; next: KikiLinkSettings; raw: string; archived: SettingsSourcesPlan;
    baseline: ReturnType<SettingsPersistence['reviewImport']> } | undefined;
  #soundReview: {review: SoundSettingsReview; canonical: string; raw: string; archived: SettingsSourcesPlan;
    baseline: ReturnType<SettingsPersistence['reviewImport']>} | undefined;

  constructor(storage?: KeyValueStorage) {
    this.#storage = storage ?? getDefaultStorage();
    this.persistence = new SettingsPersistence(this.#storage, SETTINGS_KEY, DEFAULT_SETTINGS.schemaVersion);
    const saved = this.persistence.load();
    this.#settings = saved === undefined ? structuredClone(DEFAULT_SETTINGS) : sanitizeSettings(saved);
    try {
      const raw = this.persistence.loadedSource();
      this.#archived = new SettingsArchivedSources(this.#storage, DEFAULT_SETTINGS.schemaVersion,
        saved !== undefined && raw !== null ? { raw, active: this.#settings } : undefined);
    } catch (error) { this.persistence.blockWrites(error instanceof Error ? error.message : 'Additional settings data is unavailable.'); }
    if (isRecord(saved) && isRecord(saved.ui) && !Object.hasOwn(saved.ui, "unreadBadges")) {
      // Local347 omitted this default. Compare against its exact canonical bytes so an
      // ordinary preference edit can still be saved with a full recovery journal.
      const { unreadBadges, ...previousUi } = this.#settings.ui;
      this.persistence.comparedWith(JSON.stringify({ ...this.#settings, ui: previousUi }));
    } else {
      this.persistence.comparedWith(JSON.stringify(this.#settings));
    }
  }

  #archivePlan(raw?: string, imported?: string): SettingsSourcesPlan {
    this.persistence.checkedSource();
    if (!this.#archived) throw new Error('Additional settings data is unavailable. Reload before saving.');
    return this.#archived.review(raw === undefined ? undefined : { raw, active: sanitizeSettings(JSON.parse(raw)) }, imported);
  }
  #preserveArchive(plan: SettingsSourcesPlan): void {
    if (!this.#archived) throw new Error('Additional settings data is unavailable.');
    this.#archived.persist(plan);
  }

  get(): KikiLinkSettings {
    return structuredClone(this.#settings);
  }

  /** Read one independent section without cloning unrelated activity/appearance payloads. */
  getSection<K extends keyof KikiLinkSettings>(section: K): KikiLinkSettings[K] {
    return structuredClone(this.#settings[section]);
  }
  getField<K extends keyof KikiLinkSettings, P extends keyof KikiLinkSettings[K]>(section: K, field: P): KikiLinkSettings[K][P] {
    return structuredClone(this.#settings[section][field]);
  }

  update(mutator: (draft: KikiLinkSettings) => void, options?: { requirePersistence?: boolean }): KikiLinkSettings {
    const draft = this.get();
    mutator(draft);
    const previous = this.#settings;
    const next = sanitizeSettings(draft);
    try {
      const archived = this.#archivePlan();
      this.persistence.write(JSON.stringify(next), false, undefined, () => this.#preserveArchive(archived));
    } catch (error) {
      if (options?.requirePersistence) {
        this.#settings = previous;
        throw error;
      }
      // Keep the validated in-memory settings if persistent storage is unavailable.
    }
    this.#settings = next;
    const settings = this.get();
    this.#notify(settings);
    return settings;
  }

  reset(): KikiLinkSettings {
    const next = structuredClone(DEFAULT_SETTINGS);
    const archived = this.#archivePlan();
    this.persistence.write(JSON.stringify(next), true, undefined, () => this.#preserveArchive(archived));
    this.#settings = next;
    const settings = this.get();
    this.#notify(settings);
    return settings;
  }

  reviewRecoveryCopy(id: number): SettingsRestoreReview {
    this.#restoreReview = undefined;
    const source = this.persistence.reviewCopy(id), next = recoverySettings(source.copy.source), current = this.get();
    const archived = this.#archivePlan(source.copy.source);
    // Restoring preferences must not trim history or start automatic outgoing actions.
    next.linkChat.saveHistory = current.linkChat.saveHistory;
    next.linkChat.retentionDays = current.linkChat.retentionDays;
    next.linkChat.maxMessagesPerConversation = current.linkChat.maxMessagesPerConversation;
    next.linkRoster.retentionDays = current.linkRoster.retentionDays;
    next.linkRoster.trackEncounters = current.linkRoster.trackEncounters;
    next.linkPresence.afkAutoReply.enabled = false;
    next.linkReactions.enabled = false;
    for (const rule of next.linkReactions.rules) rule.enabled = false;
    next.ui.settingsSection = current.ui.settingsSection;
    const changed = (Object.keys(RECOVERY_SECTIONS) as Array<keyof typeof RECOVERY_SECTIONS>)
      .filter(key => JSON.stringify(current[key]) !== JSON.stringify(next[key])).map(key => RECOVERY_SECTIONS[key]);
    const review = Object.freeze({ copyId: id, createdAt: source.copy.createdAt, changedSections: Object.freeze(changed), archivedDataChanged: archived.changed,
      activities: next.linkActivities.customActivities.length, playlists: next.linkMusic.playlists.length, rules: next.linkReactions.rules.length });
    this.#restoreReview = { review, before: JSON.stringify(current), next, source, archived }; return review;
  }

  cancelRecoveryReview(): void { this.#restoreReview = undefined; }

  reviewImportedSettings(raw: string, archivedSource?: string): SettingsImportReview {
    this.#importReview = undefined;
    const imported = recoverySettings(raw), source = JSON.parse(raw) as Record<string,unknown>, current = this.get(), next = this.get();
    const keys = (Object.keys(RECOVERY_SECTIONS) as Array<keyof typeof RECOVERY_SECTIONS>).filter(key => key !== 'linkMusic');
    if (!keys.some(key => isRecord(source[key]))) throw new Error('This archive has no settings sections that can be restored here.');
    // Absent sections remain current. Device media is restored separately; never activate missing locators.
    for (const key of keys) if (isRecord(source[key])) Object.assign(next,{[key]:imported[key]});
    next.linkMusic = current.linkMusic; next.linkReactions.sounds = current.linkReactions.sounds;
    next.linkChat.saveHistory = current.linkChat.saveHistory; next.linkChat.retentionDays = current.linkChat.retentionDays;
    next.linkChat.maxMessagesPerConversation = current.linkChat.maxMessagesPerConversation;
    next.linkRoster.retentionDays = current.linkRoster.retentionDays; next.linkRoster.trackEncounters = current.linkRoster.trackEncounters;
    next.ui.settingsSection = current.ui.settingsSection; next.linkPresence.afkAutoReply.enabled = false;
    next.linkReactions.enabled = false; for (const rule of next.linkReactions.rules) rule.enabled = false;
    const baseline = this.persistence.reviewImport(raw);
    const archived = this.#archivePlan(raw, archivedSource);
    const changedSections = keys.filter(key => JSON.stringify(current[key]) !== JSON.stringify(next[key])).map(key => RECOVERY_SECTIONS[key]);
    const review = Object.freeze({changedSections:Object.freeze(changedSections),archivedDataChanged:archived.changed,activities:next.linkActivities.customActivities.length,rules:next.linkReactions.rules.length,previousCopyId:baseline.previousCopyId,importedCopyId:baseline.importedCopyId});
    this.#importReview = {review,before:JSON.stringify(current),next,raw,baseline,archived}; return review;
  }
  cancelImportedSettingsReview(review?: SettingsImportReview): void {
    if (!review || this.#importReview?.review === review) this.#importReview = undefined;
  }
  reviewImportedSoundSettings(raw: string, archivedSource?: string): SoundSettingsReview {
    this.#soundReview = undefined;
    const after = importedSoundSettings(raw,DEFAULT_SETTINGS.schemaVersion), before = Object.freeze(this.getField('linkReactions','sounds'));
    const canonical = JSON.stringify(this.#settings), saved = this.persistence.checkedSource();
    const durable = saved === null ? DEFAULT_SETTINGS : sanitizeSettings(JSON.parse(saved));
    if (JSON.stringify(durable) !== canonical) throw new Error('Save your current settings or reload before restoring sound choices.');
    const baseline = this.persistence.reviewImport(raw);
    const archived = this.#archivePlan(raw, archivedSource);
    const review = Object.freeze({before,after,changed:JSON.stringify(before)!==JSON.stringify(after)||archived.changed,archivedDataChanged:archived.changed,
      previousCopyId:baseline.previousCopyId,importedCopyId:baseline.importedCopyId});
    this.#soundReview = {review,canonical,raw,baseline,archived}; return review;
  }
  cancelImportedSoundSettingsReview(): void { this.#soundReview = undefined; }
  /** Caller has just rechecked the referenced durable custom files. No audio is played here. */
  restoreImportedSoundSettings(review: SoundSettingsReview, current: () => boolean): void {
    const pending = this.#soundReview; this.#soundReview = undefined;
    if (!current() || !pending || pending.review !== review || pending.canonical !== JSON.stringify(this.#settings))
      throw new Error('Settings changed or this sound review expired. Review the archive again.');
    if (!review.changed) return;
    const next = this.get(); next.linkReactions.sounds = {...review.after};
    this.persistence.writeImport(JSON.stringify(next),pending.raw,pending.baseline,() => this.#preserveArchive(pending.archived));
    this.#settings = next; this.#notify(this.get());
  }
  restoreImportedSettings(review: SettingsImportReview): KikiLinkSettings {
    const pending = this.#importReview; this.#importReview = undefined;
    if (!pending || pending.review !== review || pending.before !== JSON.stringify(this.#settings))
      throw new Error('Settings changed or this review expired. Review the archive settings again.');
    this.persistence.writeImport(JSON.stringify(pending.next),pending.raw,pending.baseline,() => this.#preserveArchive(pending.archived));
    this.#settings = pending.next; const saved = this.get(); this.#notify(saved); return saved;
  }

  restoreRecoveryCopy(review: SettingsRestoreReview): KikiLinkSettings {
    const pending = this.#restoreReview;
    if (!pending || pending.review !== review || pending.before !== JSON.stringify(this.#settings) || pending.source.saved !== this.persistence.savedSource())
      throw new Error('Settings changed or this review expired. Review the copy again before restoring.');
    this.persistence.write(JSON.stringify(pending.next), true, pending.source.journal, () => this.#preserveArchive(pending.archived), pending.source.journalVersion);
    this.#settings = pending.next; this.#restoreReview = undefined;
    const saved = this.get(); this.#notify(saved); return saved;
  }

  musicImportSnapshot(): MusicSettingsBaseline {
    this.#archivePlan();
    const saved = this.persistence.checkedSource(), canonical = JSON.stringify(this.#settings);
    const durable = saved === null ? structuredClone(DEFAULT_SETTINGS) : sanitizeSettings(JSON.parse(saved));
    if (JSON.stringify(durable) !== canonical) throw new Error('Save your current settings or reload before importing music.');
    return Object.freeze({canonical,saved});
  }
  /** The caller must first commit the native music pre-copy and protected files. */
  applyImportedMusic(playlists: MusicPlaylist[], baseline: MusicSettingsBaseline, current: () => boolean): void {
    const fresh = this.musicImportSnapshot();
    if (!current() || fresh.canonical !== baseline.canonical || fresh.saved !== baseline.saved) throw new Error('Settings changed. Review the music import again.');
    const draft = this.get(); draft.linkMusic.playlists = structuredClone(playlists);
    const next = sanitizeSettings(draft);
    if (JSON.stringify(next.linkMusic.playlists) !== JSON.stringify(playlists) || next.linkMusic.activePlaylistId !== draft.linkMusic.activePlaylistId) throw new Error('These playlists cannot be saved without changing current music settings.');
    if (!current()) throw new Error('Music import cancelled.');
    // Verified device persistence precedes memory/listeners/portable settings updates.
    const archived = this.#archivePlan();
    this.persistence.write(JSON.stringify(next), false, undefined, () => this.#preserveArchive(archived)); this.#settings = next; this.#notify(this.get());
  }

  /** Unreadable/future sources throw: callers must skip automatic file cleanup. */
  recoveryMusicTrackIds(): Set<string> {
    const current = this.persistence.savedSource(), sources = this.persistence.recoveryCopies().map(copy => copy.source);
    sources.push(...this.#archivePlan().sources);
    if (current !== null) sources.push(current);
    const ids = new Set<string>();
    for (const source of sources) {
      recoverySettings(source); // Reject unreadable/future sources before allowing cleanup.
      // Keep raw locators too: normalization can omit a damaged/unknown track record.
      const pending: unknown[] = [JSON.parse(source).linkMusic];
      while (pending.length) {
        const value = pending.pop();
        if (Array.isArray(value)) { for (const child of value) pending.push(child); }
        else if (isRecord(value)) {
          if (typeof value.locator === 'string') ids.add(value.locator);
          for (const child of Object.values(value)) if (child && typeof child === 'object') pending.push(child);
        }
      }
    }
    return ids;
  }

  subscribe(listener: (settings: KikiLinkSettings) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify(settings: KikiLinkSettings): void {
    for (const listener of [...this.#listeners]) listener(structuredClone(settings));
  }

}

export class MemoryKeyValueStorage implements KeyValueStorage {
  readonly #values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  getItemResult(key: string): KeyValueStorageReadResult {
    try {
      return { ok: true, value: this.getItem(key) };
    } catch {
      return { ok: false };
    }
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }
}

/** Session fallback must not report that unavailable browser storage is durable. */
export class UnavailableKeyValueStorage extends MemoryKeyValueStorage {
  override getItemResult(_key: string): KeyValueStorageReadResult { return { ok: false }; }
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
    schemaVersion: 30,
    ui: {
      accent: validColor(ui.accent) ? ui.accent : DEFAULT_SETTINGS.ui.accent,
      workshopPalette: isRecord(ui.workshopPalette) && typeof ui.workshopPalette.packageId==='string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(ui.workshopPalette.packageId) && typeof ui.workshopPalette.version==='string' && /^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})$/.test(ui.workshopPalette.version) && typeof ui.workshopPalette.primary==='string' && typeof ui.workshopPalette.secondary==='string' && workshopPaletteReadable({primary:ui.workshopPalette.primary,secondary:ui.workshopPalette.secondary,accent:'#d71932'})
        ? {packageId:ui.workshopPalette.packageId,version:ui.workshopPalette.version,label:cleanBoundedText(ui.workshopPalette.label,80),primary:ui.workshopPalette.primary,secondary:ui.workshopPalette.secondary} : null,
      theme:
        ui.theme === "light" || ui.theme === "system" || ui.theme === "dark"
          ? ui.theme
          : DEFAULT_SETTINGS.ui.theme,
      density:
        ui.density === "compact" || ui.density === "super-compact"
          ? ui.density
          : DEFAULT_SETTINGS.ui.density,
      timeFormat: ui.timeFormat === "24-hour" ? "24-hour" : "12-hour",
      textScale:
        ui.textScale === "large" || ui.textScale === "extra-large"
          ? ui.textScale
          : DEFAULT_SETTINGS.ui.textScale,
      homeLayout:
        ui.homeLayout === "compact" ? "compact" : DEFAULT_SETTINGS.ui.homeLayout,
      launcherSide: ui.launcherSide === "left" ? "left" : "right",
      launcherOpen:
        ui.launcherOpen === "last" || ui.launcherOpen === "chat" || ui.launcherOpen === "explore" || (sourceSchema >= 29 && ui.launcherOpen === "home")
          ? ui.launcherOpen
          : DEFAULT_SETTINGS.ui.launcherOpen,
      launcherSize: integerInRange(ui.launcherSize, 40, 88, DEFAULT_SETTINGS.ui.launcherSize),
      notificationsMutedUntil: integerInRange(ui.notificationsMutedUntil, -1, Number.MAX_SAFE_INTEGER, 0),
      unreadBadges: booleanOr(ui.unreadBadges, DEFAULT_SETTINGS.ui.unreadBadges),
      hiddenTabs: Array.isArray(ui.hiddenTabs) ? [...new Set(ui.hiddenTabs.filter((tab): tab is KikiLinkSettings["ui"]["hiddenTabs"][number] =>
        ["home", "cloud", "chat", "roster", "room", "music", "activities", "explore", "create", "game", "you"].includes(tab)))] : [],
      tabAlerts: sanitizeTabAlerts(ui.tabAlerts),
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
      directEnabled: booleanOr(linkChat.directEnabled, DEFAULT_SETTINGS.linkChat.directEnabled),
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
        linkChat.imagePreviews === "always" || linkChat.imagePreviews === "never" || (sourceSchema >= 29 && linkChat.imagePreviews === "ask")
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
          ? cleanBoundedText(linkPresence.statusMessage, 80)
          : DEFAULT_SETTINGS.linkPresence.statusMessage,
      bio:
        typeof linkPresence.bio === "string"
          ? cleanBoundedPublicBio(linkPresence.bio)
          : DEFAULT_SETTINGS.linkPresence.bio,
      profileImagePreviews:
        linkPresence.profileImagePreviews === "always" ||
        linkPresence.profileImagePreviews === "never" ||
        (sourceSchema >= 29 && linkPresence.profileImagePreviews === "ask")
          ? linkPresence.profileImagePreviews
          : DEFAULT_SETTINGS.linkPresence.profileImagePreviews,
      avatarUrl: sanitizeAvatarUrl(linkPresence.avatarUrl),
      bannerUrl: sanitizeAvatarUrl(linkPresence.bannerUrl),
      avatarFrame: activeAvatarFrame(normalizeAvatarDecoration(linkPresence.avatarDecoration, linkPresence.avatarFrame)),
      avatarDecoration: normalizeAvatarDecoration(linkPresence.avatarDecoration, linkPresence.avatarFrame),
      publicTags: publicProfileTags(linkPresence.publicTags),
      profileStyle: effectiveProfileStyle(linkPresence.profileStyle, sanitizeProfileGradient(linkPresence.profileGradient)),
      profileOutlineColor: sanitizeOptionalColor(linkPresence.profileOutlineColor),
      profileGradient: sanitizeProfileGradient(linkPresence.profileGradient),
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
      favoriteRoomNames: sanitizeFavoriteRoomNames(linkRoom.favoriteRoomNames),
    },
    linkMusic: sanitizeMusicSettings(linkMusic, sourceSchema),
  };
}

function sanitizeFavoriteRoomNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  const keys = new Set<string>();
  for (const candidate of value) {
    const name = cleanBoundedText(candidate, 80);
    const key = name.replace(/\s+/gu, " ").toLocaleLowerCase();
    if (!name || keys.has(key)) continue;
    keys.add(key);
    names.push(name);
    if (names.length >= 50) break;
  }
  return names;
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
        description: cleanBoundedText(room.description, 300),
        ...(copyRoomMap(room.mapData) ? { mapData: copyRoomMap(room.mapData)! } : {}),
        background: cleanBoundedText(room.background, 120),
        limit: integerInRange(room.limit, 2, 50, 10),
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
          sizeMode: integerInRange(custom.sizeMode, 1, 3, 2),
          musicSync: booleanOr(custom.musicSync, false),
        },
      },
    });
    ids.add(id);
  }
  return presets.sort((left, right) => right.savedAt - left.savedAt);
}

export function isMusicDurationSeconds(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
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
            ...(isMusicDurationSeconds(track.durationSeconds) ? { durationSeconds: track.durationSeconds } : {}),
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
  const savedByUrl = new Map<
    string,
    { url: string; addedAt: number; expiresAt?: number }
  >();
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
      const expiresAt =
        typeof candidate.expiresAt === "number" &&
        Number.isFinite(candidate.expiresAt) &&
        candidate.expiresAt > addedAt &&
        candidate.expiresAt <= 8_640_000_000_000_000
          ? Math.round(candidate.expiresAt)
          : undefined;
      savedByUrl.set(url, {
        url,
        addedAt,
        ...(expiresAt === undefined ? {} : { expiresAt }),
      });
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
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (!candidate || candidate.length > 500) return "";
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return "";
  }
  const normalized = normalizeImageUrl(candidate);
  return normalized && normalized === parsed.href && normalized.length <= 500 ? normalized : "";
}

function sanitizeOptionalColor(value: unknown): string {
  return validColor(value) ? value.toLowerCase() : "";
}

function sanitizeProfileGradient(
  value: unknown,
): KikiLinkSettings["linkPresence"]["profileGradient"] {
  if (!isRecord(value)) return structuredClone(DEFAULT_SETTINGS.linkPresence.profileGradient);
  const primary = sanitizeOptionalColor(value.primary);
  const secondary = sanitizeOptionalColor(value.secondary);
  const validPair = Boolean(primary && secondary);
  return {
    enabled: value.enabled === true && validPair,
    primary: validPair ? primary : DEFAULT_SETTINGS.linkPresence.profileGradient.primary,
    secondary: validPair ? secondary : DEFAULT_SETTINGS.linkPresence.profileGradient.secondary,
    angle: typeof value.angle === "number" && Number.isFinite(value.angle)
      ? ((Math.round(value.angle / 45) * 45 % 360) + 360) % 360
      : DEFAULT_SETTINGS.linkPresence.profileGradient.angle ?? 135,
  };
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
  return isNotificationSoundPreset(value) ||
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
    ? value
        .replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, " ")
        .replace(/\s+/gu, " ")
        .trim()
        .slice(0, maxLength)
    : "";
}

function cleanBoundedPublicBio(value: string): string {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return [...cleaned].slice(0, 160).join("");
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

function sanitizeTabAlerts(value: unknown): KikiLinkSettings["ui"]["tabAlerts"] {
  const source = isRecord(value) ? value : {};
  const read = (tab: "feed" | "chat"): TabAlerts => {
    const item = isRecord(source[tab]) ? source[tab] : {};
    return { mode: item.mode === "off" ? "off" : item.mode === "personal" ? "personal" : "all",
      mutedUntil: integerInRange(item.mutedUntil, -1, Number.MAX_SAFE_INTEGER, 0) };
  };
  const feed = read("feed"), chat = read("chat");
  const overrides = isRecord(source.chat) ? source.chat : {};
  return {
    feed: isRecord(source.feed) && source.feed.mode === "mentions" ? { ...feed, mode: "mentions" } : feed,
    chat: { ...chat,
      ...(typeof overrides.direct === "boolean" ? { direct: overrides.direct } : {}),
      ...(typeof overrides.groups === "boolean" ? { groups: overrides.groups } : {}),
    },
  };
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
      localStorage.getItem(scopePersistenceName("kikilink:storage-probe"));
      return scopedBrowserStorage(localStorage);
    }
  } catch {
    // Some browser privacy modes expose localStorage but deny access to it.
  }
  return new UnavailableKeyValueStorage();
}
