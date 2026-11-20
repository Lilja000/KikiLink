import { scopePersistenceName } from "../core/storage-scope";
import { openMusicDatabase, MUSIC_IMPORTS } from "./music-database";
import { musicRecoveryHoldIds, type MusicImportCopy } from "./music-import-recovery";

export const MAX_LOCAL_MUSIC_BYTES = 80 * 1024 * 1024;
export const MAX_LOCAL_MUSIC_TRACKS = 100;
export const MAX_LOCAL_MUSIC_TOTAL_BYTES = 512 * 1024 * 1024;

const STORE_NAME = "tracks";

export interface DeviceMusicTrack {
  id: string;
  name: string;
  mimeType: string;
  /** Retained locally so extension-only MP3/MP4 files can later be shared as BC room music. */
  roomExtension?: "mp3" | "mp4";
  createdAt: number;
  blob: Blob;
  /** Inactive archive fields and related playlist metadata; never playback actions. */
  archivedFields?: string;
}

export interface MusicStore {
  /** Only native, account-owned storage can receive durable archive imports. */
  archiveImportDestination?(owner: number): boolean;
  list(): Promise<DeviceMusicTrack[]>;
  get(id: string): Promise<DeviceMusicTrack | undefined>;
  add(file: File): Promise<DeviceMusicTrack>;
  delete(id: string): Promise<void>;
  /** Reconciles session-only files. Durable unlinked files require explicit removal. */
  reconcile?(
    referencedIds: ReadonlySet<string>,
    protectedIds?: ReadonlySet<string>,
  ): Promise<string[]>;
  /** Releases add() results once their playlist references are committed or abandoned. */
  releaseStaged?(ids: ReadonlySet<string>): void;
  close(): void;
}

/** Device-only full-length music storage, isolated by Bondage Club MemberNumber. */
export class DeviceMusicStore implements MusicStore {
  readonly #memory = new Map<string, DeviceMusicTrack>();
  readonly #stagedIds = new Set<string>();
  #databasePromise: Promise<IDBDatabase> | undefined;
  #databaseUnavailable = false;

  constructor(private readonly memberNumber: number) {}

  archiveImportDestination(owner: number): boolean {
    return owner === this.memberNumber && !this.#databaseUnavailable && typeof indexedDB !== "undefined";
  }

  async list(): Promise<DeviceMusicTrack[]> {
    const database = await this.#database().catch(() => undefined);
    const tracks = database
      ? await requestResult(
          database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll(),
        ) as DeviceMusicTrack[]
      : [...this.#memory.values()];
    return tracks.sort((left, right) => right.createdAt - left.createdAt);
  }

  async get(id: string): Promise<DeviceMusicTrack | undefined> {
    if (!validId(id)) return undefined;
    const database = await this.#database().catch(() => undefined);
    if (!database) return this.#memory.get(id);
    return await requestResult(
      database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id),
    ) as DeviceMusicTrack | undefined;
  }

  async add(file: File): Promise<DeviceMusicTrack> {
    validateMusicFile(file);
    const roomExtension = roomMusicExtension(file);
    const record: DeviceMusicTrack = {
      id: createId(),
      name: cleanName(file.name),
      mimeType: file.type || "application/octet-stream",
      ...(roomExtension ? { roomExtension } : {}),
      createdAt: Date.now(),
      blob: file.slice(0, file.size, file.type),
    };
    this.#stagedIds.add(record.id);
    try {
      const database = await this.#database().catch(() => undefined);
      if (!database) {
        assertMusicStorageCapacity(
          this.#memory.size,
          totalBlobBytes(this.#memory.values()),
          record.blob.size,
        );
        this.#memory.set(record.id, record);
        return record;
      }
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const existing = await requestResult(store.getAll()) as DeviceMusicTrack[];
      assertMusicStorageCapacity(existing.length, totalBlobBytes(existing), record.blob.size);
      store.add(record);
      await transactionDone(transaction);
      return record;
    } catch (error) {
      this.#stagedIds.delete(record.id);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    if (!validId(id)) return;
    this.#stagedIds.delete(id);
    this.#memory.delete(id);
    const database = await this.#database().catch(() => undefined);
    if (!database) return;
    await guardedDelete(database,this.memberNumber,new Set([id]),true);
  }

  async reconcile(
    referencedIds: ReadonlySet<string>,
    protectedIds: ReadonlySet<string> = new Set(),
  ): Promise<string[]> {
    const keep = new Set(
      [...referencedIds, ...protectedIds, ...this.#stagedIds].filter((id) => validId(id)),
    );
    const database = await this.#database().catch(() => undefined);
    if (!database) {
      const removed: string[] = [];
      for (const id of this.#memory.keys()) {
        if (keep.has(id)) continue;
        this.#memory.delete(id);
        removed.push(id);
      }
      return removed;
    }
    musicRecoveryHoldIds(await requestResult(database.transaction(MUSIC_IMPORTS,'readonly').objectStore(MUSIC_IMPORTS).getAll()),this.memberNumber);
    // Other tabs can be between their file write and playlist commit. Absence
    // from this caller's snapshot is never authority to delete durable bytes.
    return [];
  }

  releaseStaged(ids: ReadonlySet<string>): void {
    for (const id of ids) this.#stagedIds.delete(id);
  }

  close(): void {
    this.#stagedIds.clear();
    void this.#databasePromise?.then((database) => database.close()).catch(() => undefined);
    this.#databasePromise = undefined;
  }

  #database(): Promise<IDBDatabase> {
    if (this.#databaseUnavailable || typeof indexedDB === "undefined") {
      this.#databaseUnavailable = true;
      return Promise.reject(new Error("IndexedDB is unavailable"));
    }
    this.#databasePromise ??= openMusicDatabase(deviceMusicDatabaseName(this.memberNumber),indexedDB,true,() => {}).then(database => {
      database.onversionchange = () => { database.close(); this.#databasePromise = undefined; };
      return database;
    }).catch((error) => {
      this.#databaseUnavailable = true;
      this.#databasePromise = undefined;
      throw error;
    });
    return this.#databasePromise;
  }
}

export function validateMusicFile(file: File): void {
  if (!(file instanceof Blob) || file.size <= 0) throw new Error("Choose a non-empty audio file");
  if (file.size > MAX_LOCAL_MUSIC_BYTES) throw new Error("Local tracks must be smaller than 80 MB");
  const supportedMime = file.type.toLocaleLowerCase().startsWith("audio/") || file.type === "video/mp4";
  const supportedName = /\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(file.name);
  if (!supportedMime && !supportedName) throw new Error("Choose an audio file supported by your browser");
}

export function assertMusicStorageCapacity(
  existingCount: number,
  existingBytes: number,
  incomingBytes: number,
): void {
  if (existingCount >= MAX_LOCAL_MUSIC_TRACKS) {
    throw new Error(`This device can hold up to ${MAX_LOCAL_MUSIC_TRACKS} local tracks`);
  }
  if (existingBytes + incomingBytes > MAX_LOCAL_MUSIC_TOTAL_BYTES) {
    throw new Error("Local tracks can use up to 512 MB on this device");
  }
}

export function deviceMusicDatabaseName(memberNumber: number): string {
  const account = Number.isSafeInteger(memberNumber) && memberNumber > 0 ? memberNumber : "guest";
  return scopePersistenceName(`kikilink-device-music-${account}`);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local music storage request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local music storage failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local music storage was cancelled"));
  });
}

/** The journal and tracks share one transaction, so a stale cleanup cannot race an import. */
function guardedDelete(database: IDBDatabase, owner: number, ids: ReadonlySet<string>, explicit: boolean): Promise<string[]> {
  return new Promise((resolve,reject) => {
    const transaction = database.transaction([STORE_NAME,MUSIC_IMPORTS],"readwrite"), store = transaction.objectStore(STORE_NAME);
    const journal = transaction.objectStore(MUSIC_IMPORTS).getAll(), keys = store.getAllKeys(); let done = 0, reason = 'Local music cleanup could not be confirmed.';
    const removed: string[] = [];
    const ready = () => {
      if (++done !== 2) return;
      try {
        const holds = musicRecoveryHoldIds(journal.result as MusicImportCopy[],owner,explicit);
        if (explicit && [...ids].some(id => holds.has(id))) throw new Error('Finish the music import before removing its files.');
        for (const key of keys.result) {
          const id = typeof key === 'string' ? key : '';
          if (explicit ? !ids.has(id) : ids.has(id) || holds.has(id)) continue;
          store.delete(key); if (id) removed.push(id);
        }
      } catch(e) { reason = e instanceof Error ? e.message : reason; transaction.abort(); }
    };
    journal.onsuccess = keys.onsuccess = ready;
    transaction.oncomplete = () => resolve(removed);
    transaction.onabort = () => reject(new Error(reason));
  });
}

function totalBlobBytes(records: Iterable<{ blob?: unknown }>): number {
  let total = 0;
  for (const record of records) {
    if (record.blob instanceof Blob) total += record.blob.size;
  }
  return total;
}

function createId(): string {
  const random = typeof crypto === "object" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return random.toLocaleLowerCase().replace(/[^a-z0-9_-]/gu, "").slice(0, 64);
}

function validId(value: string): boolean {
  return /^[a-z0-9_-]{1,64}$/iu.test(value);
}

function cleanName(value: string): string {
  const name = value.replace(/\.[^.]+$/u, "").replace(/[\u0000-\u001f\u007f]/gu, " ").trim();
  return (name || "Local track").slice(0, 80);
}

function roomMusicExtension(file: File): "mp3" | "mp4" | undefined {
  const named = file.name.toLocaleLowerCase().match(/\.(mp3|mp4)$/u)?.[1];
  if (named === "mp3" || named === "mp4") return named;
  const mime = file.type.toLocaleLowerCase().split(";", 1)[0];
  if (mime === "audio/mpeg") return "mp3";
  if (mime === "audio/mp4" || mime === "video/mp4") return "mp4";
  return undefined;
}
