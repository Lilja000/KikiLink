import type { KeyValueStorage } from "../core/settings";
import { MemoryKeyValueStorage } from "../core/settings";
import type { PersonRecord } from "../core/types";

export const PEOPLE_KEY = "kikilink:people:v1";
const MAX_PEOPLE = 2000;
const NOTEBOOK_FORMAT = "kikilink-player-notebook";
const NOTEBOOK_VERSION = 1;

export interface PlayerNotebookBackup {
  format: typeof NOTEBOOK_FORMAT;
  version: typeof NOTEBOOK_VERSION;
  exportedAt: number;
  records: PersonRecord[];
}

export interface PlayerNotebookImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export class PeopleRepository {
  readonly #records = new Map<number, PersonRecord>();

  constructor(private readonly storage: KeyValueStorage = getDefaultStorage()) {
    this.#load();
  }

  get(memberNumber: number): PersonRecord | undefined {
    const record = this.#records.get(memberNumber);
    return record ? structuredClone(record) : undefined;
  }

  list(): PersonRecord[] {
    return [...this.#records.values()]
      .map((record) => structuredClone(record))
      .sort((left, right) => right.lastSeenAt - left.lastSeenAt);
  }

  count(): number {
    return this.#records.size;
  }

  put(record: PersonRecord): PersonRecord {
    const sanitized = sanitizePerson(record);
    if (!sanitized) throw new Error("Invalid player record");
    this.#records.set(sanitized.memberNumber, sanitized);
    this.#prune();
    this.#persist();
    return structuredClone(sanitized);
  }

  putMany(records: PersonRecord[]): void {
    for (const record of records) {
      const sanitized = sanitizePerson(record);
      if (sanitized) this.#records.set(sanitized.memberNumber, sanitized);
    }
    this.#prune();
    this.#persist();
  }

  exportBackup(exportedAt = Date.now()): PlayerNotebookBackup {
    return {
      format: NOTEBOOK_FORMAT,
      version: NOTEBOOK_VERSION,
      exportedAt,
      records: this.list(),
    };
  }

  importBackup(value: unknown): PlayerNotebookImportResult {
    const backup = parseBackup(value);
    const imported = new Map<number, PersonRecord>();
    let skipped = Math.max(0, backup.records.length - MAX_PEOPLE);

    for (const candidate of backup.records.slice(0, MAX_PEOPLE)) {
      const record = sanitizePerson(candidate);
      if (!record) {
        skipped += 1;
        continue;
      }
      imported.set(record.memberNumber, record);
    }

    for (const record of imported.values()) {
      const existing = this.#records.get(record.memberNumber);
      this.#records.set(record.memberNumber, existing ? mergePeople(existing, record) : record);
    }
    this.#prune();
    this.#persist();

    return { imported: imported.size, skipped, total: this.#records.size };
  }

  pruneEncounterHistory(retentionDays: number, now = Date.now()): number {
    if (!Number.isInteger(retentionDays) || retentionDays <= 0) return 0;
    const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
    let removed = 0;
    for (const record of this.#records.values()) {
      const protectedNotebook = record.favorite || record.note.length > 0 || record.tags.length > 0;
      if (protectedNotebook || record.lastSeenAt <= 0 || record.lastSeenAt >= cutoff) continue;
      this.#records.delete(record.memberNumber);
      removed += 1;
    }
    if (removed > 0) this.#persist();
    return removed;
  }

  clear(): void {
    this.#records.clear();
    try {
      this.storage.removeItem(PEOPLE_KEY);
    } catch {
      // Clearing the in-memory copy is still useful when storage is unavailable.
    }
  }

  #load(): void {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(PEOPLE_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      for (const value of parsed.slice(0, MAX_PEOPLE)) {
        const record = sanitizePerson(value);
        if (record) this.#records.set(record.memberNumber, record);
      }
      this.#prune();
      const canonical = JSON.stringify(this.list());
      if (canonical !== raw) this.#persist();
    } catch {
      // Ignore malformed old data instead of breaking KikiLink startup.
    }
  }

  #persist(): void {
    try {
      this.storage.setItem(PEOPLE_KEY, JSON.stringify(this.list()));
    } catch {
      // Keep the current session usable if the browser storage quota is unavailable.
    }
  }

  #prune(): void {
    if (this.#records.size <= MAX_PEOPLE) return;
    const removable = [...this.#records.values()]
      .filter((record) => !record.favorite && !record.note && record.tags.length === 0)
      .sort((left, right) => left.lastSeenAt - right.lastSeenAt);
    for (const record of removable) {
      if (this.#records.size <= MAX_PEOPLE) break;
      this.#records.delete(record.memberNumber);
    }

    if (this.#records.size <= MAX_PEOPLE) return;
    const oldestRemaining = [...this.#records.values()].sort(
      (left, right) => left.lastSeenAt - right.lastSeenAt,
    );
    for (const record of oldestRemaining) {
      if (this.#records.size <= MAX_PEOPLE) break;
      this.#records.delete(record.memberNumber);
    }
  }
}

function sanitizePerson(value: unknown): PersonRecord | undefined {
  if (!isRecord(value) || !validMemberNumber(value.memberNumber)) return undefined;
  const now = Date.now();
  const lastSeenAt = validTime(value.lastSeenAt) ? value.lastSeenAt : 0;
  const firstSeenAt = validTime(value.firstSeenAt)
    ? Math.min(value.firstSeenAt, lastSeenAt || now)
    : lastSeenAt;
  const displayName = cleanText(value.displayName, 80) || `Member ${value.memberNumber}`;
  const note = cleanText(value.note, 2000);
  const lastRoomName = cleanText(value.lastRoomName, 100);
  const encounterCount =
    typeof value.encounterCount === "number" &&
    Number.isInteger(value.encounterCount) &&
    value.encounterCount >= 0
      ? Math.min(value.encounterCount, 1_000_000)
      : 0;

  const tags: string[] = [];
  if (Array.isArray(value.tags)) {
    const seen = new Set<string>();
    for (const rawTag of value.tags.slice(0, 16)) {
      const tag = cleanText(rawTag, 24);
      const key = tag.toLocaleLowerCase();
      if (!tag || seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
      if (tags.length >= 8) break;
    }
  }

  return {
    memberNumber: value.memberNumber,
    displayName,
    favorite: value.favorite === true,
    note,
    tags,
    firstSeenAt,
    lastSeenAt,
    lastRoomName,
    encounterCount,
  };
}

function parseBackup(value: unknown): { records: unknown[] } {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("This file is not valid JSON.");
    }
  }
  if (
    !isRecord(parsed) ||
    parsed.format !== NOTEBOOK_FORMAT ||
    parsed.version !== NOTEBOOK_VERSION ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("This is not a KikiLink player notebook backup.");
  }
  return { records: parsed.records };
}

function mergePeople(existing: PersonRecord, imported: PersonRecord): PersonRecord {
  const importedIsNewer = imported.lastSeenAt > existing.lastSeenAt;
  return {
    memberNumber: existing.memberNumber,
    displayName: importedIsNewer ? imported.displayName : existing.displayName,
    favorite: existing.favorite || imported.favorite,
    note: existing.note || imported.note,
    tags: mergeTags(existing.tags, imported.tags),
    firstSeenAt: earliestPositive(existing.firstSeenAt, imported.firstSeenAt),
    lastSeenAt: Math.max(existing.lastSeenAt, imported.lastSeenAt),
    lastRoomName:
      (importedIsNewer ? imported.lastRoomName : existing.lastRoomName) ||
      existing.lastRoomName ||
      imported.lastRoomName,
    encounterCount: Math.max(existing.encounterCount, imported.encounterCount),
  };
}

function mergeTags(existing: string[], imported: string[]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const tag of [...existing, ...imported]) {
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(tag);
    if (merged.length >= 8) break;
  }
  return merged;
}

function earliestPositive(left: number, right: number): number {
  if (left <= 0) return right;
  if (right <= 0) return left;
  return Math.min(left, right);
}

function getDefaultStorage(): KeyValueStorage {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.getItem("kikilink:people-storage-probe");
      return localStorage;
    }
  } catch {
    // Fall through to an in-memory store for privacy modes that deny localStorage access.
  }
  return new MemoryKeyValueStorage();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validMemberNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
