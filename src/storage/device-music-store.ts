export const MAX_LOCAL_MUSIC_BYTES = 80 * 1024 * 1024;
export const MAX_LOCAL_MUSIC_TRACKS = 100;
export const MAX_LOCAL_MUSIC_TOTAL_BYTES = 512 * 1024 * 1024;

const DATABASE_VERSION = 1;
const STORE_NAME = "tracks";

export interface DeviceMusicTrack {
  id: string;
  name: string;
  mimeType: string;
  /** Retained locally so extension-only MP3/MP4 files can later be shared as BC room music. */
  roomExtension?: "mp3" | "mp4";
  createdAt: number;
  blob: Blob;
}

export interface MusicStore {
  list(): Promise<DeviceMusicTrack[]>;
  get(id: string): Promise<DeviceMusicTrack | undefined>;
  add(file: File): Promise<DeviceMusicTrack>;
  delete(id: string): Promise<void>;
  /** Removes device blobs that no longer have a playlist reference. */
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
      store.put(record);
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
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionDone(transaction);
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
    return await deleteUnreferencedRecords(database, keep);
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
    this.#databasePromise ??= openDatabase(databaseName(this.memberNumber)).catch((error) => {
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

function databaseName(memberNumber: number): string {
  const account = Number.isSafeInteger(memberNumber) && memberNumber > 0 ? memberNumber : "guest";
  return `kikilink-device-music-${account}`;
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local music storage"));
    request.onblocked = () => reject(new Error("Local music storage is blocked by another tab"));
  });
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

function deleteUnreferencedRecords(
  database: IDBDatabase,
  keep: ReadonlySet<string>,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    const removed: string[] = [];
    request.onsuccess = () => {
      for (const key of request.result) {
        const id = typeof key === "string" ? key : "";
        if (id && keep.has(id)) continue;
        store.delete(key);
        if (id) removed.push(id);
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Local music storage request failed"));
    transaction.oncomplete = () => resolve(removed);
    transaction.onerror = () => reject(transaction.error ?? new Error("Local music storage failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local music storage was cancelled"));
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
