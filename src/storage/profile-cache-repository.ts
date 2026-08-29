import type { KeyValueStorage } from "../core/settings";
import type { AvatarFrame, ProfileCardStyle, ProfileGradient } from "../core/types";

export const PUBLIC_PROFILE_CACHE_KEY = "kikilink:public-profile-cache:v1";
export const MAX_CACHED_PUBLIC_PROFILES = 200;
export const MAX_CACHED_PUBLIC_PROFILE_AGE_MS = 90 * 24 * 60 * 60 * 1000;
export const MAX_CACHED_PUBLIC_PROFILE_RICH_AGE_MS = MAX_CACHED_PUBLIC_PROFILE_AGE_MS;

const CACHE_FORMAT_VERSION = 2;
const LEGACY_CACHE_FORMAT_VERSION = 1;
const MAX_LOAD_CANDIDATES = MAX_CACHED_PUBLIC_PROFILES * 4;
const MAX_STORED_CACHE_CHARS = 512_000;
const ACCESS_PERSIST_INTERVAL_MS = 5 * 60 * 1000;
const MAX_PROFILE_IMAGE_URL_LENGTH = 500;
const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_PROFILE_REVISION_LENGTH = 64;
const MAX_ADDON_VERSION_LENGTH = 24;

const DIRECT_IMAGE_PATH = /\.(?:gif|jpe?g|png|webp)$/iu;
const SAFE_REVISION = /^[a-z0-9_-]{1,64}$/iu;
const SAFE_VERSION = /^[a-z0-9][a-z0-9._+-]{0,23}$/iu;
const HEX_COLOR = /^#[0-9a-f]{6}$/iu;
const UNSAFE_URL_TEXT = /[\u0000-\u0020\u007f-\u009f]/u;
const UNSAFE_PUBLIC_TEXT =
  /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;

/**
 * A bounded cache of profile fields that a remote player voluntarily shared.
 *
 * Live status, room presence, private notes, relationships, and fetched image blobs deliberately do
 * not belong here. Callers must keep those values in their existing ephemeral/private stores.
 */
export interface CachedPublicProfileRecord {
  memberNumber: number;
  displayName: string;
  avatarUrl?: string;
  avatarFrame?: AvatarFrame;
  profileStyle?: ProfileCardStyle;
  bannerUrl?: string;
  profileOutlineColor?: string;
  profileGradient?: ProfileGradient;
  /** Receipt time of banner/outline/gradient. Basic PS heartbeats must never renew this age. */
  richSyncedAt?: number;
  profileRevision?: string;
  addonVersion?: string;
  syncedAt: number;
  lastAccessedAt: number;
}

/** Complete public snapshot accepted from a newly received, already authenticated packet. */
export type CachedPublicProfileInput = Omit<
  CachedPublicProfileRecord,
  "syncedAt" | "lastAccessedAt"
>;

interface StoredPublicProfileCache {
  version: typeof CACHE_FORMAT_VERSION;
  records: CachedPublicProfileRecord[];
}

/**
 * Local public-profile cache. Account isolation is inherited from the injected KeyValueStorage;
 * production callers must pass the current account's AccountDataStorage/AccountKeyValueStorage.
 */
export class ProfileCacheRepository {
  readonly #records = new Map<number, CachedPublicProfileRecord>();
  readonly #accessOrder = new Map<number, number>();
  readonly #persistedAccessAt = new Map<number, number>();
  #nextAccessOrder = 0;

  constructor(private readonly storage: KeyValueStorage) {
    this.#load();
  }

  get(memberNumber: number, now = Date.now()): CachedPublicProfileRecord | undefined {
    return this.#read(memberNumber, now, true);
  }

  /** Reads a record for protocol merge/deduplication without promoting it in the user's LRU. */
  peek(memberNumber: number, now = Date.now()): CachedPublicProfileRecord | undefined {
    return this.#read(memberNumber, now, false);
  }

  #read(
    memberNumber: number,
    now: number,
    touch: boolean,
  ): CachedPublicProfileRecord | undefined {
    if (!validMemberNumber(memberNumber)) return undefined;
    const record = this.#records.get(memberNumber);
    if (!record) return undefined;

    const currentTime = normalizeNow(now);
    if (isExpired(record, currentTime)) {
      this.#deleteInMemory(memberNumber);
      this.#persist();
      return undefined;
    }

    const richExpired = expireRichProfileFields(record, currentTime);
    if (!touch) {
      if (richExpired) this.#persist();
      return structuredClone(record);
    }
    this.#markAccess(memberNumber);
    if (currentTime > record.lastAccessedAt) {
      record.lastAccessedAt = currentTime;
    }
    const persistedAccessAt = this.#persistedAccessAt.get(memberNumber) ?? 0;
    if (
      richExpired ||
      record.lastAccessedAt - persistedAccessAt >= ACCESS_PERSIST_INTERVAL_MS
    ) {
      this.#persist();
    }
    return structuredClone(record);
  }

  list(now = Date.now()): CachedPublicProfileRecord[] {
    this.prune(now);
    return this.#orderedRecords().map((record) => structuredClone(record));
  }

  upsert(
    profile: CachedPublicProfileInput,
    now = Date.now(),
  ): CachedPublicProfileRecord {
    const currentTime = normalizeNow(now);
    const sanitized = sanitizePublicProfileInput(profile, currentTime);
    if (!sanitized) throw new Error("Invalid cached public profile record");

    const existing = this.#records.get(sanitized.memberNumber);
    if (existing && existing.syncedAt > currentTime) {
      return structuredClone(existing);
    }

    this.#records.set(sanitized.memberNumber, sanitized);
    this.#markAccess(sanitized.memberNumber);
    this.#pruneInMemory(currentTime);
    this.#persist();
    return structuredClone(sanitized);
  }

  remove(memberNumber: number): boolean {
    if (!validMemberNumber(memberNumber) || !this.#records.has(memberNumber)) return false;
    this.#deleteInMemory(memberNumber);
    this.#persist();
    return true;
  }

  clear(): void {
    this.#records.clear();
    this.#accessOrder.clear();
    this.#persistedAccessAt.clear();
    this.#persist();
  }

  prune(now = Date.now()): number {
    const result = this.#pruneInMemory(normalizeNow(now));
    if (result.changed) this.#persist();
    return result.removed;
  }

  #load(): void {
    let raw: string | null;
    try {
      raw = this.storage.getItem(PUBLIC_PROFILE_CACHE_KEY);
    } catch {
      return;
    }
    if (!raw || raw.length > MAX_STORED_CACHE_CHARS) return;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        !isRecord(parsed) ||
        (parsed.version !== CACHE_FORMAT_VERSION &&
          parsed.version !== LEGACY_CACHE_FORMAT_VERSION) ||
        !Array.isArray(parsed.records)
      ) {
        return;
      }

      const now = Date.now();
      const loaded = new Map<number, { record: CachedPublicProfileRecord; index: number }>();
      for (const [index, candidate] of parsed.records.slice(0, MAX_LOAD_CANDIDATES).entries()) {
        const record = sanitizeStoredPublicProfile(
          candidate,
          now,
          parsed.version === LEGACY_CACHE_FORMAT_VERSION,
        );
        if (!record || isExpired(record, now)) continue;
        const existing = loaded.get(record.memberNumber);
        if (!existing || isNewerCacheRecord(record, existing.record)) {
          loaded.set(record.memberNumber, { record, index });
        }
      }

      // Persisted rows are newest-first. Rebuild a monotonic access order so same-millisecond
      // touches remain exact after a reload instead of falling back to a member-number tie.
      const oldestFirst = [...loaded.values()].sort((left, right) =>
        compareOldestFirst(left.record, right.record) || right.index - left.index
      );
      for (const { record } of oldestFirst) {
        this.#records.set(record.memberNumber, record);
        this.#markAccess(record.memberNumber);
        this.#persistedAccessAt.set(record.memberNumber, record.lastAccessedAt);
      }
      const pruned = this.#pruneInMemory(now);
      if (parsed.version === LEGACY_CACHE_FORMAT_VERSION || pruned.changed) this.#persist();
    } catch {
      // Malformed or inaccessible old data must never block KikiLink startup.
    }
  }

  #persist(): boolean {
    try {
      if (this.#records.size === 0) {
        this.storage.removeItem(PUBLIC_PROFILE_CACHE_KEY);
        this.#persistedAccessAt.clear();
        return true;
      }
      const value: StoredPublicProfileCache = {
        version: CACHE_FORMAT_VERSION,
        records: this.#orderedRecords(),
      };
      this.storage.setItem(PUBLIC_PROFILE_CACHE_KEY, JSON.stringify(value));
      for (const record of this.#records.values()) {
        this.#persistedAccessAt.set(record.memberNumber, record.lastAccessedAt);
      }
      return true;
    } catch {
      // Retain the bounded in-memory copy when storage is denied or its quota is exhausted.
      return false;
    }
  }

  #pruneInMemory(now: number): { removed: number; changed: boolean } {
    const initialSize = this.#records.size;
    let changed = false;
    for (const [memberNumber, record] of this.#records) {
      if (isExpired(record, now)) {
        this.#deleteInMemory(memberNumber);
        changed = true;
      } else if (expireRichProfileFields(record, now)) {
        changed = true;
      }
    }

    if (this.#records.size > MAX_CACHED_PUBLIC_PROFILES) {
      const leastRecentlyUsed = [...this.#records.values()].sort((left, right) =>
        compareOldestFirst(left, right) ||
        (this.#accessOrder.get(left.memberNumber) ?? 0) -
          (this.#accessOrder.get(right.memberNumber) ?? 0)
      );
      for (const record of leastRecentlyUsed) {
        if (this.#records.size <= MAX_CACHED_PUBLIC_PROFILES) break;
        this.#deleteInMemory(record.memberNumber);
        changed = true;
      }
    }
    return { removed: initialSize - this.#records.size, changed };
  }

  #orderedRecords(): CachedPublicProfileRecord[] {
    return [...this.#records.values()].sort((left, right) =>
      compareNewestFirst(left, right) ||
      (this.#accessOrder.get(right.memberNumber) ?? 0) -
        (this.#accessOrder.get(left.memberNumber) ?? 0)
    );
  }

  #markAccess(memberNumber: number): void {
    this.#nextAccessOrder += 1;
    this.#accessOrder.set(memberNumber, this.#nextAccessOrder);
  }

  #deleteInMemory(memberNumber: number): void {
    this.#records.delete(memberNumber);
    this.#accessOrder.delete(memberNumber);
    this.#persistedAccessAt.delete(memberNumber);
  }
}

function sanitizePublicProfileInput(
  value: unknown,
  now: number,
): CachedPublicProfileRecord | undefined {
  const fields = sanitizePublicProfileFields(value);
  if (!fields) return undefined;
  const richSyncedAt = hasRichProfileFields(fields)
    ? isRecord(value) && validTime(value.richSyncedAt) && value.richSyncedAt <= now
      ? value.richSyncedAt
      : now
    : undefined;
  const record: CachedPublicProfileRecord = {
    ...fields,
    ...(richSyncedAt !== undefined ? { richSyncedAt } : {}),
    syncedAt: now,
    lastAccessedAt: now,
  };
  expireRichProfileFields(record, now);
  return record;
}

function sanitizeStoredPublicProfile(
  value: unknown,
  now: number,
  legacy: boolean,
): CachedPublicProfileRecord | undefined {
  const fields = sanitizePublicProfileFields(value);
  if (
    !fields ||
    !isRecord(value) ||
    !validTime(value.syncedAt) ||
    !validTime(value.lastAccessedAt) ||
    value.syncedAt > now ||
    value.lastAccessedAt > now ||
    value.lastAccessedAt < value.syncedAt
  ) {
    return undefined;
  }
  let richSyncedAt: number | undefined;
  if (hasRichProfileFields(fields)) {
    const candidate = legacy ? value.syncedAt : value.richSyncedAt;
    if (
      validTime(candidate) &&
      candidate <= value.syncedAt &&
      candidate <= now
    ) {
      richSyncedAt = candidate;
    } else {
      clearRichProfileFields(fields);
    }
  }
  const record: CachedPublicProfileRecord = {
    ...fields,
    ...(richSyncedAt !== undefined ? { richSyncedAt } : {}),
    syncedAt: value.syncedAt,
    lastAccessedAt: value.lastAccessedAt,
  };
  expireRichProfileFields(record, now);
  return record;
}

function sanitizePublicProfileFields(value: unknown): CachedPublicProfileInput | undefined {
  if (!isRecord(value) || !validMemberNumber(value.memberNumber)) return undefined;
  const displayName = cleanPublicText(value.displayName, MAX_DISPLAY_NAME_LENGTH) ||
    `Member ${value.memberNumber}`;
  const avatarUrl = sanitizeDirectImageUrl(value.avatarUrl);
  const bannerUrl = sanitizeDirectImageUrl(value.bannerUrl);
  const avatarFrame = sanitizeAvatarFrame(value.avatarFrame);
  const profileStyle = sanitizeProfileStyle(value.profileStyle);
  const profileOutlineColor = sanitizeColor(value.profileOutlineColor);
  const profileGradient = sanitizeGradient(value.profileGradient);
  const profileRevision = sanitizeRevision(value.profileRevision);
  const addonVersion = sanitizeVersion(value.addonVersion);

  return {
    memberNumber: value.memberNumber,
    displayName,
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(avatarFrame ? { avatarFrame } : {}),
    ...(profileStyle ? { profileStyle } : {}),
    ...(bannerUrl ? { bannerUrl } : {}),
    ...(profileOutlineColor ? { profileOutlineColor } : {}),
    ...(profileGradient ? { profileGradient } : {}),
    ...(profileRevision ? { profileRevision } : {}),
    ...(addonVersion ? { addonVersion } : {}),
  };
}

function sanitizeDirectImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const candidate = value.trim();
  if (
    !candidate ||
    candidate.length > MAX_PROFILE_IMAGE_URL_LENGTH ||
    UNSAFE_URL_TEXT.test(candidate)
  ) {
    return undefined;
  }
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname ||
      !DIRECT_IMAGE_PATH.test(url.pathname) ||
      url.href.length > MAX_PROFILE_IMAGE_URL_LENGTH
    ) {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}

function sanitizeAvatarFrame(value: unknown): AvatarFrame | undefined {
  return value === "none" ||
      value === "blossom" ||
      value === "rose" ||
      value === "starlight" ||
      value === "laurel" ||
      value === "thorn" ||
      value === "moon" ||
      value === "ribbon"
    ? value
    : undefined;
}

function sanitizeProfileStyle(value: unknown): ProfileCardStyle | undefined {
  return value === "classic" || value === "garden" || value === "midnight"
    ? value
    : undefined;
}

function sanitizeGradient(value: unknown): ProfileGradient | undefined {
  if (!isRecord(value)) return undefined;
  const primary = sanitizeColor(value.primary);
  const secondary = sanitizeColor(value.secondary);
  return value.enabled === true && primary && secondary
    ? { enabled: true, primary, secondary }
    : undefined;
}

function sanitizeColor(value: unknown): string | undefined {
  return typeof value === "string" && HEX_COLOR.test(value)
    ? value.toLowerCase()
    : undefined;
}

function sanitizeRevision(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const revision = value.trim();
  return revision.length <= MAX_PROFILE_REVISION_LENGTH && SAFE_REVISION.test(revision)
    ? revision
    : undefined;
}

function sanitizeVersion(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const version = value.trim();
  return version.length <= MAX_ADDON_VERSION_LENGTH && SAFE_VERSION.test(version)
    ? version
    : undefined;
}

function cleanPublicText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const cleaned = value
    .replace(UNSAFE_PUBLIC_TEXT, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return [...cleaned].slice(0, maxLength).join("");
}

function hasRichProfileFields(
  record: Pick<
    CachedPublicProfileRecord,
    "bannerUrl" | "profileOutlineColor" | "profileGradient"
  >,
): boolean {
  return Boolean(record.bannerUrl || record.profileOutlineColor || record.profileGradient);
}

function clearRichProfileFields(
  record: Pick<
    CachedPublicProfileRecord,
    "bannerUrl" | "profileOutlineColor" | "profileGradient" | "richSyncedAt"
  >,
): void {
  delete record.bannerUrl;
  delete record.profileOutlineColor;
  delete record.profileGradient;
  delete record.richSyncedAt;
}

function expireRichProfileFields(record: CachedPublicProfileRecord, now: number): boolean {
  if (!hasRichProfileFields(record)) {
    if (record.richSyncedAt === undefined) return false;
    delete record.richSyncedAt;
    return true;
  }
  if (
    record.richSyncedAt !== undefined &&
    now - record.richSyncedAt <= MAX_CACHED_PUBLIC_PROFILE_RICH_AGE_MS
  ) {
    return false;
  }
  clearRichProfileFields(record);
  return true;
}

function isExpired(record: CachedPublicProfileRecord, now: number): boolean {
  return now - record.syncedAt > MAX_CACHED_PUBLIC_PROFILE_AGE_MS;
}

function isNewerCacheRecord(
  candidate: CachedPublicProfileRecord,
  existing: CachedPublicProfileRecord,
): boolean {
  return candidate.syncedAt > existing.syncedAt ||
    (candidate.syncedAt === existing.syncedAt &&
      candidate.lastAccessedAt > existing.lastAccessedAt);
}

function compareNewestFirst(
  left: CachedPublicProfileRecord,
  right: CachedPublicProfileRecord,
): number {
  return right.lastAccessedAt - left.lastAccessedAt ||
    right.syncedAt - left.syncedAt;
}

function compareOldestFirst(
  left: CachedPublicProfileRecord,
  right: CachedPublicProfileRecord,
): number {
  return left.lastAccessedAt - right.lastAccessedAt ||
    left.syncedAt - right.syncedAt;
}

function normalizeNow(value: number): number {
  return Number.isSafeInteger(value) && value >= 0 ? value : Date.now();
}

function validMemberNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validTime(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
