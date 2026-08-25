export const MAX_NOTIFICATION_SOUND_DURATION_MS = 5_000;
export const MAX_NOTIFICATION_SOUND_BYTES = 10 * 1024 * 1024;

const DATABASE_VERSION = 1;
const STORE_NAME = "sounds";
const METADATA_TIMEOUT_MS = 12_000;

export interface DeviceNotificationSound {
  id: string;
  name: string;
  mimeType: string;
  durationMs: number;
  createdAt: number;
  blob: Blob;
}

export interface NotificationSoundStore {
  list(): Promise<DeviceNotificationSound[]>;
  get(id: string): Promise<DeviceNotificationSound | undefined>;
  add(file: File): Promise<DeviceNotificationSound>;
  delete(id: string): Promise<void>;
  close(): void;
}

/** Device-only audio storage. Nothing in this database is synchronized through BC settings. */
export class DeviceNotificationSoundStore implements NotificationSoundStore {
  readonly #memory = new Map<string, DeviceNotificationSound>();
  #databasePromise: Promise<IDBDatabase> | undefined;
  #databaseUnavailable = false;

  constructor(private readonly memberNumber: number) {}

  async list(): Promise<DeviceNotificationSound[]> {
    const database = await this.#database().catch(() => undefined);
    if (!database) return sortSounds([...this.#memory.values()]);
    const records = await requestResult(
      database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll(),
    );
    return sortSounds(records as DeviceNotificationSound[]);
  }

  async get(id: string): Promise<DeviceNotificationSound | undefined> {
    if (!validSoundId(id)) return undefined;
    const database = await this.#database().catch(() => undefined);
    if (!database) return this.#memory.get(id);
    return (await requestResult(
      database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id),
    )) as DeviceNotificationSound | undefined;
  }

  async add(file: File): Promise<DeviceNotificationSound> {
    validateNotificationSoundFile(file);
    const durationMs = await readAudioDurationMs(file);
    if (durationMs > MAX_NOTIFICATION_SOUND_DURATION_MS) {
      throw new Error("Notification sounds can be at most 5 seconds long");
    }
    const record: DeviceNotificationSound = {
      id: createSoundId(),
      name: cleanSoundName(file.name),
      mimeType: file.type,
      durationMs,
      createdAt: Date.now(),
      blob: file.slice(0, file.size, file.type),
    };
    const database = await this.#database().catch(() => undefined);
    if (!database) {
      this.#memory.set(record.id, record);
      return record;
    }
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    await transactionDone(transaction);
    return record;
  }

  async delete(id: string): Promise<void> {
    if (!validSoundId(id)) return;
    this.#memory.delete(id);
    const database = await this.#database().catch(() => undefined);
    if (!database) return;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionDone(transaction);
  }

  close(): void {
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

export function validateNotificationSoundFile(file: File): void {
  if (!(file instanceof Blob) || file.size <= 0) throw new Error("Choose a non-empty audio file");
  if (file.size > MAX_NOTIFICATION_SOUND_BYTES) {
    throw new Error("Notification sounds must be smaller than 10 MB");
  }
  const audioMime = file.type.toLocaleLowerCase().startsWith("audio/");
  const audioName = /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav|webm)$/iu.test(file.name);
  if (!audioMime && !audioName) {
    throw new Error("Choose an audio file supported by your browser");
  }
}

export function readAudioDurationMs(file: Blob): Promise<number> {
  if (typeof Audio !== "function" || typeof URL.createObjectURL !== "function") {
    return Promise.reject(new Error("This browser cannot inspect local audio files"));
  }
  return new Promise<number>((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => finish(undefined, "The audio file took too long to read"), METADATA_TIMEOUT_MS);
    const finish = (duration?: number, error?: string): void => {
      clearTimeout(timer);
      audio.removeEventListener("loadedmetadata", loaded);
      audio.removeEventListener("error", failed);
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
      if (duration !== undefined) resolve(duration);
      else reject(new Error(error ?? "The audio file could not be read"));
    };
    const loaded = (): void => {
      const milliseconds = Math.round(audio.duration * 1_000);
      if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
        finish(undefined, "The audio file has no readable duration");
        return;
      }
      finish(milliseconds);
    };
    const failed = (): void => finish(undefined, "This audio format is not supported by your browser");
    audio.addEventListener("loadedmetadata", loaded, { once: true });
    audio.addEventListener("error", failed, { once: true });
    audio.preload = "metadata";
    audio.src = url;
    audio.load();
  });
}

function databaseName(memberNumber: number): string {
  const account = Number.isSafeInteger(memberNumber) && memberNumber > 0 ? memberNumber : "guest";
  return `kikilink-device-sounds-${account}`;
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local sound storage"));
    request.onblocked = () => reject(new Error("Local sound storage is blocked by another tab"));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local sound storage request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local sound storage failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local sound storage was cancelled"));
  });
}

function sortSounds(sounds: DeviceNotificationSound[]): DeviceNotificationSound[] {
  return sounds.sort((left, right) => right.createdAt - left.createdAt || left.name.localeCompare(right.name));
}

function createSoundId(): string {
  const random = typeof crypto === "object" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return random.toLocaleLowerCase().replace(/[^a-z0-9_-]/gu, "").slice(0, 64);
}

function validSoundId(value: string): boolean {
  return /^[a-z0-9_-]{1,64}$/iu.test(value);
}

function cleanSoundName(value: string): string {
  const name = value.replace(/\.[^.]+$/u, "").replace(/[\u0000-\u001f\u007f]/gu, "").trim();
  return (name || "Custom sound").slice(0, 60);
}
