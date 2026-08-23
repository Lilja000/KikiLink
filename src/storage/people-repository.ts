import type { KeyValueStorage } from "../core/settings";
import { MemoryKeyValueStorage } from "../core/settings";
import type { PersonRecord } from "../core/types";

const PEOPLE_KEY = "kikilink:people:v1";
const MAX_PEOPLE = 2000;

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
