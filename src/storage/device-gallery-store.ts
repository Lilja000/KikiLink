import { openGalleryDatabase } from "./gallery-database";
import { scopePersistenceName } from "../core/storage-scope";

export const MAX_DEVICE_GALLERY_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_DEVICE_GALLERY_IMAGES = 80;

const STORE_NAME = "images";

export interface DeviceGalleryImage {
  id: string;
  name: string;
  mimeType: "image/webp";
  width: number;
  height: number;
  createdAt: number;
  blob: Blob;
  /** Inactive original archive values; never spread onto live image properties. */
  archivedFields?: string;
}

export interface DeviceGalleryImageInput {
  blob: Blob;
  width: number;
  height: number;
}

export interface GalleryStore {
  list(): Promise<DeviceGalleryImage[]>;
  get(id: string): Promise<DeviceGalleryImage | undefined>;
  add(image: DeviceGalleryImageInput): Promise<DeviceGalleryImage>;
  delete(id: string): Promise<void>;
  close(): void;
}

/** Durable, device-only Gallery storage isolated by Bondage Club MemberNumber. */
export class DeviceGalleryStore implements GalleryStore {
  #databasePromise: Promise<IDBDatabase> | undefined;
  #persistenceRequest: Promise<boolean> | undefined;

  constructor(private readonly memberNumber: number) {}

  async list(): Promise<DeviceGalleryImage[]> {
    const database = await this.#database();
    const records = await requestResult(
      database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll(),
    ) as DeviceGalleryImage[];
    return records.sort((left, right) => right.createdAt - left.createdAt);
  }

  async get(id: string): Promise<DeviceGalleryImage | undefined> {
    if (!validId(id)) return undefined;
    const database = await this.#database();
    return await requestResult(
      database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id),
    ) as DeviceGalleryImage | undefined;
  }

  async add(image: DeviceGalleryImageInput): Promise<DeviceGalleryImage> {
    validateImage(image);
    this.#persistenceRequest ??= requestPersistentStorage();
    await this.#persistenceRequest;
    const database = await this.#database();
    const record: DeviceGalleryImage = {
      id: createId(),
      name: "KikiLink image",
      mimeType: "image/webp",
      width: image.width,
      height: image.height,
      createdAt: Date.now(),
      blob: image.blob.slice(0, image.blob.size, "image/webp"),
    };
    await new Promise<void>((resolve,reject) => {
      const transaction = database.transaction(STORE_NAME,"readwrite"), store = transaction.objectStore(STORE_NAME);
      let reason = "Gallery storage failed";
      const count = store.count();
      count.onsuccess = () => {
        try {
          if (count.result >= MAX_DEVICE_GALLERY_IMAGES) throw new Error(`Your device Gallery can hold up to ${MAX_DEVICE_GALLERY_IMAGES} images`);
          store.add(record);
        } catch(e) { reason = e instanceof Error ? e.message : reason; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(reason));
    });
    return record;
  }

  async delete(id: string): Promise<void> {
    if (!validId(id)) return;
    const database = await this.#database();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionDone(transaction);
  }

  close(): void {
    void this.#databasePromise?.then((database) => database.close()).catch(() => undefined);
    this.#databasePromise = undefined;
  }

  #database(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("Permanent Gallery storage is unavailable in this browser"));
    }
    this.#databasePromise ??= openGalleryDatabase(deviceGalleryDatabaseName(this.memberNumber),indexedDB,true,() => {}).then(database => {
      database.onversionchange = () => { database.close(); this.#databasePromise = undefined; }; return database;
    }).catch((error) => {
      this.#databasePromise = undefined;
      throw error;
    });
    return this.#databasePromise;
  }
}

function validateImage(image: DeviceGalleryImageInput): void {
  if (!(image.blob instanceof Blob) || image.blob.type !== "image/webp") {
    throw new Error("Only privacy-prepared WebP images can be stored in Gallery");
  }
  if (image.blob.size <= 0 || image.blob.size > MAX_DEVICE_GALLERY_IMAGE_BYTES) {
    throw new Error("The prepared Gallery image must be smaller than 8 MB");
  }
  if (
    !Number.isSafeInteger(image.width) || image.width <= 0 ||
    !Number.isSafeInteger(image.height) || image.height <= 0
  ) {
    throw new Error("The prepared Gallery image has invalid dimensions");
  }
}

async function requestPersistentStorage(): Promise<boolean> {
  try {
    const storage = navigator.storage;
    if (!storage) return false;
    if (typeof storage.persisted === "function" && await storage.persisted()) return true;
    return typeof storage.persist === "function" ? await storage.persist() : false;
  } catch {
    return false;
  }
}

export function deviceGalleryDatabaseName(memberNumber: number): string {
  const account = Number.isSafeInteger(memberNumber) && memberNumber > 0 ? memberNumber : "guest";
  return scopePersistenceName(`kikilink-device-gallery-${account}`);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Gallery storage request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Gallery storage failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Gallery storage was cancelled"));
  });
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
