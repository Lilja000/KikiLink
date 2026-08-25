import type { BCAdapter } from "../../bc/adapter";
import type { SettingsStore } from "../../core/settings";
import type { PersonRecord, RoomCharacter, RosterEntry } from "../../core/types";
import type {
  PeopleRepository,
  PlayerNotebookBackup,
  PlayerNotebookImportResult,
} from "../../storage/people-repository";

export type RosterScope = "current" | "known" | "favorites";

export interface RosterSyncResult {
  changed: boolean;
  presentCount: number;
  joined: number[];
  left: number[];
}

const HEARTBEAT_MS = 30_000;

export class LinkRosterService {
  readonly #present = new Map<number, RoomCharacter>();
  #roomName = "";
  #lastHeartbeatAt = 0;

  constructor(
    private readonly adapter: BCAdapter,
    private readonly repository: PeopleRepository,
    private readonly settings: SettingsStore,
  ) {}

  sync(now = Date.now()): RosterSyncResult {
    if (!this.adapter.isInChatRoom()) {
      const left = [...this.#present.keys()];
      this.#present.clear();
      this.#roomName = "";
      return { changed: left.length > 0, presentCount: 0, joined: [], left };
    }

    const roomName = this.adapter.getCurrentRoomName() ?? "Unnamed room";
    const roomChanged = roomName !== this.#roomName;
    if (roomChanged) this.#present.clear();
    this.#roomName = roomName;

    const current = this.adapter.getRoomCharacters();
    const currentNumbers = new Set(current.map((character) => character.memberNumber));
    const joined = current
      .filter((character) => !this.#present.has(character.memberNumber))
      .map((character) => character.memberNumber);
    const left = [...this.#present.keys()].filter((memberNumber) => !currentNumbers.has(memberNumber));
    const heartbeat = now - this.#lastHeartbeatAt >= HEARTBEAT_MS;
    const tracking = this.settings.get().linkRoster.trackEncounters;
    const updates: PersonRecord[] = [];

    if (tracking) {
      for (const character of current) {
        const existing = this.repository.get(character.memberNumber);
        const isNewEncounter = !this.#present.has(character.memberNumber);
        const nameChanged = existing?.displayName !== character.memberName;
        if (!existing || isNewEncounter || nameChanged || heartbeat) {
          updates.push(
            mergeObservedPerson(existing, character, roomName, now, isNewEncounter),
          );
        }
      }
      for (const memberNumber of left) {
        const existing = this.repository.get(memberNumber);
        const previous = this.#present.get(memberNumber);
        if (existing && previous) {
          updates.push({ ...existing, displayName: previous.memberName, lastSeenAt: now });
        }
      }
      if (updates.length > 0) this.repository.putMany(updates);
    }

    this.#present.clear();
    for (const character of current) this.#present.set(character.memberNumber, character);
    if (heartbeat) this.#lastHeartbeatAt = now;
    if (heartbeat) this.prune(now);

    return {
      changed: roomChanged || joined.length > 0 || left.length > 0,
      presentCount: current.length,
      joined,
      left,
    };
  }

  observePerson(memberNumber: number, displayName: string, now = Date.now()): void {
    if (!Number.isSafeInteger(memberNumber) || memberNumber < 0) return;
    const existing = this.repository.get(memberNumber);
    this.repository.put({
      ...(existing ?? emptyPerson(memberNumber, displayName)),
      displayName: displayName.trim() || existing?.displayName || `Member ${memberNumber}`,
      firstSeenAt: existing?.firstSeenAt || now,
      lastSeenAt: Math.max(existing?.lastSeenAt ?? 0, now),
    });
  }

  list(scope: RosterScope, query = ""): RosterEntry[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const records = new Map(
      this.repository.list().map((record) => [record.memberNumber, record] as const),
    );
    const current = new Map(
      this.adapter.getRoomCharacters().map((character) => [character.memberNumber, character] as const),
    );
    const memberNumbers =
      scope === "current"
        ? [...current.keys()]
        : [...new Set([...records.keys(), ...current.keys()])];

    return memberNumbers
      .map((memberNumber): RosterEntry => {
        const character = current.get(memberNumber);
        const record =
          records.get(memberNumber) ??
          emptyPerson(memberNumber, character?.memberName ?? `Member ${memberNumber}`);
        return {
          ...record,
          displayName: character?.memberName ?? record.displayName,
          present: character !== undefined,
          isFriend:
            character?.isFriend === true ||
            (typeof this.adapter.isKnownFriend === "function" &&
              this.adapter.isKnownFriend(memberNumber)),
          relationships:
            typeof this.adapter.getPlayerRelationships === "function"
              ? this.adapter.getPlayerRelationships(memberNumber)
              : [],
        };
      })
      .filter((entry) => scope !== "favorites" || entry.favorite)
      .filter(
        (entry) =>
          !normalizedQuery ||
          entry.displayName.toLocaleLowerCase().includes(normalizedQuery) ||
          entry.memberNumber.toString().includes(normalizedQuery) ||
          entry.note.toLocaleLowerCase().includes(normalizedQuery) ||
          entry.tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedQuery)) ||
          entry.relationships.some((relationship) => relationship.includes(normalizedQuery)),
      )
      .sort(compareRosterEntries);
  }

  get(memberNumber: number, fallbackName?: string): PersonRecord {
    return (
      this.repository.get(memberNumber) ??
      emptyPerson(memberNumber, fallbackName?.trim() || `Member ${memberNumber}`)
    );
  }

  saveNotebook(
    memberNumber: number,
    displayName: string,
    note: string,
    tags: string[],
  ): PersonRecord {
    const existing = this.get(memberNumber, displayName);
    return this.repository.put({
      ...existing,
      displayName: displayName.trim() || existing.displayName,
      note: note.trim().slice(0, 2000),
      tags,
    });
  }

  toggleFavorite(memberNumber: number, displayName: string): PersonRecord {
    const existing = this.get(memberNumber, displayName);
    return this.repository.put({
      ...existing,
      displayName: displayName.trim() || existing.displayName,
      favorite: !existing.favorite,
    });
  }

  notebookCount(): number {
    return this.repository.count();
  }

  exportNotebook(exportedAt = Date.now()): PlayerNotebookBackup {
    return this.repository.exportBackup(exportedAt);
  }

  importNotebook(value: unknown): PlayerNotebookImportResult {
    return this.repository.importBackup(value);
  }

  prune(now = Date.now()): number {
    return this.repository.pruneEncounterHistory(
      this.settings.get().linkRoster.retentionDays,
      now,
    );
  }

  clear(): void {
    this.repository.clear();
  }
}

function mergeObservedPerson(
  existing: PersonRecord | undefined,
  character: RoomCharacter,
  roomName: string,
  now: number,
  newEncounter: boolean,
): PersonRecord {
  const base = existing ?? emptyPerson(character.memberNumber, character.memberName);
  return {
    ...base,
    displayName: character.memberName,
    firstSeenAt: base.firstSeenAt || now,
    lastSeenAt: now,
    lastRoomName: roomName,
    encounterCount: base.encounterCount + (newEncounter ? 1 : 0),
  };
}

function emptyPerson(memberNumber: number, displayName: string): PersonRecord {
  return {
    memberNumber,
    displayName,
    favorite: false,
    note: "",
    tags: [],
    firstSeenAt: 0,
    lastSeenAt: 0,
    lastRoomName: "",
    encounterCount: 0,
  };
}

function compareRosterEntries(left: RosterEntry, right: RosterEntry): number {
  if (left.present !== right.present) return left.present ? -1 : 1;
  if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
  if (left.isFriend !== right.isFriend) return left.isFriend ? -1 : 1;
  if (left.lastSeenAt !== right.lastSeenAt) return right.lastSeenAt - left.lastSeenAt;
  return left.displayName.localeCompare(right.displayName);
}
