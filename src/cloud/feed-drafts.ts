import type { KeyValueStorage } from "../core/settings";
import { AccountKeyValueStorage } from "../storage/account-data-storage";
import type { CloudPollDraft } from "./types";

const METADATA_KEY = "kikilink:feed-draft:v1";
const ATTACHMENT_STORE = "attachments";
const MAX_FILES = 4;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const STORAGE_TIMEOUT_MS = 5_000;

export interface FeedDraftSnapshot {
  text: string;
  clientId: string;
  files: Array<{ file: File; spoiler: boolean }>;
  poll: CloudPollDraft | null;
}
export interface FeedPendingPost extends FeedDraftSnapshot {
  mediaIds?: string[];
  spoilerMediaIds?: string[];
}
export interface FeedDraft extends FeedDraftSnapshot { pending?: FeedPendingPost }
export type FeedDraftStatus = "pending" | "saved" | "error";
export interface FeedDraftAttachment {
  id: string;
  file: Blob;
}
/** Injectable storage boundary; production uses a database for this account only. */
export interface FeedDraftAttachmentStorage {
  load(ids: readonly string[]): Promise<Array<FeedDraftAttachment | undefined>>;
  update(added: readonly FeedDraftAttachment[], keepIds: readonly string[]): Promise<void>;
  close(): void;
}
export interface FeedDraftBacking {
  metadata?: KeyValueStorage;
  attachments?: FeedDraftAttachmentStorage;
}
interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  spoiler: boolean;
}
interface SnapshotMetadata {
  text: string;
  clientId: string;
  files: FileMetadata[];
  poll: CloudPollDraft | null;
}
interface DraftMetadata extends SnapshotMetadata {
  version: 1;
  revision: string;
  pending?: SnapshotMetadata & { mediaIds?: string[]; spoilerMediaIds?: string[] };
}

/**
 * Device-only Feed drafts, never mirrored into BC or sent to Cloud. Small text/poll
 * metadata is committed synchronously. Blobs are written only when files change.
 * The synchronous metadata is authoritative: an old IndexedDB write cannot revive
 * a published/discarded draft, even when the page exits before blob cleanup ends.
 */
export class FeedDraftStore {
  readonly #metadata: AccountKeyValueStorage;
  readonly #attachments: FeedDraftAttachmentStorage;
  readonly #fileIds = new WeakMap<File, string>();
  readonly #listeners = new Set<(status: FeedDraftStatus) => void>();
  #committedIds = new Set<string>();
  #requestedSignature: string | undefined;
  #lastMetadata: string | null | undefined;
  #mutation = 0;
  #attachmentMutation = 0;
  #pending = 0;
  #tail = Promise.resolve();
  #metadataError: Error | undefined;
  #attachmentError: Error | undefined;
  #closed = false;
  #status: FeedDraftStatus = "saved";

  constructor(memberNumber: number, backing: FeedDraftBacking = {}) {
    // AccountKeyValueStorage also validates; do not create shared guest databases.
    if (!Number.isSafeInteger(memberNumber) || memberNumber <= 0) {
      throw new Error("A valid BC account is required to save a Feed draft");
    }
    this.#metadata = new AccountKeyValueStorage(memberNumber, backing.metadata ?? browserMetadataStorage);
    this.#attachments = backing.attachments ?? new IndexedDbFeedDraftAttachments(memberNumber, this.#metadata);
  }

  get status(): FeedDraftStatus { return this.#status; }
  get error(): Error | undefined { return this.#metadataError ?? this.#attachmentError; }

  subscribe(listener: (status: FeedDraftStatus) => void): () => void {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  }

  async load(): Promise<FeedDraft | undefined> {
    this.#assertOpen();
    const mutation = this.#mutation;
    let raw: string | null;
    let metadata: DraftMetadata | undefined;
    try {
      raw = this.#metadata.getItem(METADATA_KEY);
      metadata = parseMetadata(raw);
      this.#metadataError = undefined;
    } catch (error) {
      this.#metadataError = storageError(error);
      this.#notify();
      return undefined;
    }
    if (!metadata) return undefined;
    const fileMetadata = metadataFiles(metadata);
    const restoredFiles = new Map<string, File>();
    let attachmentError: Error | undefined;
    if (fileMetadata.length) {
      this.#pending++;
      this.#notify();
      try {
        const records = await this.#attachments.load(fileMetadata.map(file => file.id));
        for (const entry of fileMetadata) {
          const record = records.find(record => record?.id === entry.id);
          if (!record || !(record.file instanceof Blob) || record.file.size !== entry.size || record.file.type !== entry.type) {
            attachmentError = new Error("Some draft images could not be restored. Please attach them again.");
            continue;
          }
          const file = new File([record.file], entry.name, { type: entry.type, lastModified: entry.lastModified });
          this.#fileIds.set(file, entry.id);
          restoredFiles.set(entry.id, file);
        }
      } catch (error) {
        attachmentError = storageError(error);
      } finally {
        this.#pending--;
      }
    }
    // Do not return an older snapshot after save/clear, or after another tab changed
    // the metadata while IndexedDB was loading. The UI also guards user edits.
    if (this.#closed || mutation !== this.#mutation) { this.#notify(); return undefined; }
    try {
      if (raw !== this.#metadata.getItem(METADATA_KEY)) { this.#notify(); return undefined; }
    } catch (error) {
      this.#metadataError = storageError(error);
    }
    this.#attachmentError = attachmentError;
    this.#lastMetadata = raw;
    this.#committedIds = new Set(restoredFiles.keys());
    this.#requestedSignature = fileMetadata.map(file => file.id).join("|");
    this.#notify();
    const restore = (snapshot: SnapshotMetadata): FeedDraftSnapshot => ({
      text: snapshot.text, clientId: snapshot.clientId, poll: snapshot.poll,
      files: snapshot.files.flatMap(entry => {
        const file = restoredFiles.get(entry.id);
        return file ? [{ file, spoiler: entry.spoiler }] : [];
      }),
    });
    const draft: FeedDraft = restore(metadata);
    if (metadata.pending) {
      draft.pending = { ...restore(metadata.pending),
        ...(metadata.pending.mediaIds ? { mediaIds: [...metadata.pending.mediaIds] } : {}),
        ...(metadata.pending.spoilerMediaIds ? { spoilerMediaIds: [...metadata.pending.spoilerMediaIds] } : {}),
      };
    }
    return draft;
  }

  save(draft: FeedDraft): void {
    this.#assertOpen();
    validateDraft(draft);
    if (draft.pending) {
      validateDraft(draft.pending);
      if (!validMediaIds(draft.pending.mediaIds) || !validMediaIds(draft.pending.spoilerMediaIds) ||
        draft.pending.spoilerMediaIds?.some(id => !draft.pending!.mediaIds?.includes(id))) {
        throw new Error("The pending Feed post has invalid media data");
      }
    }
    try {
      // Another tab may have replaced this draft and pruned our old image records.
      // Re-saving this tab's composition must re-persist its actual File objects.
      if (this.#metadata.getItem(METADATA_KEY) !== this.#lastMetadata) {
        this.#committedIds.clear();
        this.#requestedSignature = undefined;
      }
    } catch { /* The following write reports an unavailable metadata store. */ }
    const files = new Map<string, FeedDraftAttachment>();
    const snapshot = (draft: FeedDraftSnapshot): SnapshotMetadata => ({
      text: draft.text, clientId: draft.clientId,
      files: draft.files.map(({ file, spoiler }) => {
        let id = this.#fileIds.get(file);
        if (!id) { id = createId(); this.#fileIds.set(file, id); }
        files.set(id, { id, file });
        return { id, name: file.name, type: file.type, size: file.size, lastModified: file.lastModified, spoiler };
      }),
      poll: draft.poll ? { ...draft.poll, options: [...draft.poll.options] } : null,
    });
    const metadata: DraftMetadata = {
      version: 1,
      revision: createId(),
      ...snapshot(draft),
    };
    if (draft.pending) metadata.pending = { ...snapshot(draft.pending),
      ...(draft.pending.mediaIds ? { mediaIds: [...draft.pending.mediaIds] } : {}),
      ...(draft.pending.spoilerMediaIds ? { spoilerMediaIds: [...draft.pending.spoilerMediaIds] } : {}),
    };
    this.#mutation++;
    this.#writeMetadata(metadata);
    if (this.#metadataError) return;
    this.#queueFiles([...files.values()]);
  }

  async flush(): Promise<void> {
    // Follow new writes queued while an older one is in flight.
    let tail: Promise<void>;
    do { tail = this.#tail; await tail; } while (tail !== this.#tail);
    if (this.error) throw this.error;
  }

  clear(): Promise<void> {
    this.#assertOpen();
    this.#mutation++;
    // Keep a tiny tombstone rather than restoring anything from a stale blob record.
    this.#writeMetadata({ version: 1, revision: createId(), cleared: true });
    this.#queueFiles([], true);
    return this.flush();
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#listeners.clear();
    // Account switches finish pending writes; they do not discard the user's draft.
    void this.#tail.finally(() => this.#attachments.close());
  }

  #assertOpen(): void {
    if (this.#closed) throw new Error("This Feed draft belongs to a closed account session");
  }

  #writeMetadata(value: object): void {
    try {
      const raw = JSON.stringify(value);
      this.#metadata.setItem(METADATA_KEY, raw);
      this.#lastMetadata = raw;
      this.#metadataError = undefined;
    } catch (error) {
      this.#metadataError = storageError(error);
    }
    this.#notify();
  }

  #queueFiles(files: readonly FeedDraftAttachment[], force = false): void {
    const ids = files.map(file => file.id);
    const signature = ids.join("|");
    if (!force && signature === this.#requestedSignature && !this.#attachmentError) { this.#notify(); return; }
    // Text-only drafts work even on browsers without IndexedDB.
    if (!files.length && !this.#pending && !this.#committedIds.size && !this.#attachmentError &&
      (this.#requestedSignature === "" || (!force && this.#requestedSignature === undefined))) {
      this.#requestedSignature = signature;
      this.#notify();
      return;
    }
    this.#requestedSignature = signature;
    const mutation = ++this.#attachmentMutation;
    this.#pending++;
    this.#notify();
    this.#tail = this.#tail.then(async () => {
      try {
        if (mutation !== this.#attachmentMutation) return;
        const added = files.filter(file => !this.#committedIds.has(file.id));
        await this.#attachments.update(added, ids);
        this.#committedIds = new Set(ids);
        if (mutation === this.#attachmentMutation) this.#attachmentError = undefined;
      } catch (error) {
        if (mutation === this.#attachmentMutation) this.#attachmentError = storageError(error);
      } finally {
        this.#pending--;
        this.#notify();
      }
    });
  }

  #notify(): void {
    const status = this.error ? "error" : this.#pending ? "pending" : "saved";
    if (status === this.#status) return;
    this.#status = status;
    for (const listener of this.#listeners) {
      try { listener(status); } catch { /* UI listeners cannot interrupt storage. */ }
    }
  }
}

const browserMetadataStorage: KeyValueStorage = {
  getItem(key) { return requiredLocalStorage().getItem(key); },
  setItem(key, value) { requiredLocalStorage().setItem(key, value); },
  removeItem(key) { requiredLocalStorage().removeItem(key); },
};

function requiredLocalStorage(): Storage {
  if (typeof localStorage === "undefined") throw new Error("Permanent draft storage is unavailable in this browser");
  return localStorage;
}

function validateDraft(draft: FeedDraft): void {
  if (typeof draft.text !== "string" || draft.text.length > 4000 ||
    typeof draft.clientId !== "string" || !/^[a-z0-9_-]{1,128}$/iu.test(draft.clientId) ||
    !Array.isArray(draft.files) || draft.files.length > MAX_FILES ||
    new Set(draft.files.map(entry => entry.file)).size !== draft.files.length || !validPoll(draft.poll)) {
    throw new Error("The Feed draft has invalid text or poll data");
  }
  for (const { file, spoiler } of draft.files) {
    if (!(file instanceof File) || !file.type.startsWith("image/") || file.size <= 0 || file.size > MAX_FILE_BYTES ||
      typeof spoiler !== "boolean" || file.name.length > 1024 || !Number.isSafeInteger(file.lastModified) || file.lastModified < 0) {
      throw new Error("Feed draft images must be no larger than 5 MB each");
    }
  }
}

function validPoll(value: unknown): value is CloudPollDraft | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const poll = value as CloudPollDraft;
  return typeof poll.question === "string" && poll.question.length <= 200 && Array.isArray(poll.options) &&
    poll.options.length <= 6 && poll.options.every(option => typeof option === "string" && option.length <= 100) &&
    typeof poll.multiple === "boolean" && Number.isSafeInteger(poll.closesAt) && poll.closesAt > 0;
}

function parseMetadata(raw: string | null): DraftMetadata | undefined {
  if (raw === null) return undefined;
  if (raw.length > 32_000) throw new Error("The saved Feed draft is invalid");
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("The saved Feed draft is invalid");
  const entry = value as DraftMetadata & { cleared?: boolean };
  if (entry.version === 1 && entry.cleared === true) return undefined;
  if (entry.version !== 1 || typeof entry.revision !== "string" || !validSnapshot(entry) ||
    (entry.pending !== undefined && (!validSnapshot(entry.pending) || !validMediaIds(entry.pending.mediaIds) ||
      !validMediaIds(entry.pending.spoilerMediaIds) || entry.pending.spoilerMediaIds?.some(id => !entry.pending!.mediaIds?.includes(id))))) {
    throw new Error("The saved Feed draft is invalid");
  }
  return entry;
}

function validSnapshot(entry: SnapshotMetadata): boolean {
  return Boolean(entry && typeof entry.text === "string" && entry.text.length <= 4000 &&
    typeof entry.clientId === "string" && /^[a-z0-9_-]{1,128}$/iu.test(entry.clientId) && validPoll(entry.poll) &&
    Array.isArray(entry.files) && entry.files.length <= MAX_FILES && entry.files.every(file =>
      file && typeof file.id === "string" && /^[a-z0-9_-]{1,128}$/iu.test(file.id) && typeof file.name === "string" && file.name.length <= 1024 &&
      typeof file.type === "string" && file.type.startsWith("image/") && Number.isSafeInteger(file.size) && file.size > 0 && file.size <= MAX_FILE_BYTES &&
      Number.isSafeInteger(file.lastModified) && file.lastModified >= 0 && typeof file.spoiler === "boolean") &&
    new Set(entry.files.map(file => file.id)).size === entry.files.length);
}

function validMediaIds(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.length <= MAX_FILES &&
    value.every(id => typeof id === "string" && /^[a-z0-9_-]{1,128}$/iu.test(id)) && new Set(value).size === value.length);
}

function metadataFiles(metadata: DraftMetadata): FileMetadata[] {
  return [...new Map([...metadata.files, ...metadata.pending?.files ?? []].map(file => [file.id, file])).values()];
}

function storageError(error: unknown): Error {
  return error instanceof Error ? error : new Error("The draft could not be saved on this device");
}

function createId(): string {
  return typeof crypto === "object" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

class IndexedDbFeedDraftAttachments implements FeedDraftAttachmentStorage {
  constructor(private readonly memberNumber: number, private readonly metadata: AccountKeyValueStorage) {}

  close(): void { /* Every transaction closes its connection, including failures. */ }

  async load(ids: readonly string[]): Promise<Array<FeedDraftAttachment | undefined>> {
    return this.#transaction("readonly", (store, result) => {
      const files: Array<FeedDraftAttachment | undefined> = new Array(ids.length);
      ids.forEach((id, index) => {
        const request = store.get(id);
        request.onsuccess = () => { files[index] = request.result as FeedDraftAttachment | undefined; };
      });
      result(files);
    });
  }

  async update(added: readonly FeedDraftAttachment[], keepIds: readonly string[]): Promise<void> {
    return this.#transaction("readwrite", store => {
      const keep = new Set(keepIds);
      for (const file of added) store.put(file);
      const request = store.getAllKeys();
      request.onsuccess = () => {
        // A late write from another open tab must never prune the active draft's
        // files. Stale, unreferenced records are removed on the next image update.
        try {
          const current = parseMetadata(this.metadata.getItem(METADATA_KEY));
          for (const file of current ? metadataFiles(current) : []) keep.add(file.id);
        } catch { return; /* Retain blobs when the authoritative metadata cannot be read. */ }
        for (const id of request.result) if (typeof id !== "string" || !keep.has(id)) store.delete(id);
      };
    });
  }

  async #open(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") throw new Error("Permanent draft image storage is unavailable in this browser");
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`kikilink-feed-drafts-${this.memberNumber}`, 1);
      let settled = false;
      const fail = () => {
        settled = true;
        clearTimeout(timer);
        reject(new Error("Permanent draft image storage is unavailable"));
      };
      const timer = setTimeout(fail, STORAGE_TIMEOUT_MS);
      request.onupgradeneeded = () => {
        if (settled) request.transaction?.abort();
        else if (!request.result.objectStoreNames.contains(ATTACHMENT_STORE)) {
          request.result.createObjectStore(ATTACHMENT_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        if (settled) { request.result.close(); return; }
        settled = true;
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = request.onblocked = fail;
    });
  }

  async #transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> {
    const db = await this.#open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction(ATTACHMENT_STORE, mode);
        let value!: T;
        const fail = () => {
          clearTimeout(timer);
          reject(tx.error ?? new Error("Draft image storage failed. Please keep this page open and try again."));
        };
        const timer = setTimeout(() => {
          try { tx.abort(); } catch { /* The transaction may have just completed. */ }
          fail();
        }, STORAGE_TIMEOUT_MS);
        tx.oncomplete = () => { clearTimeout(timer); resolve(value); };
        tx.onerror = tx.onabort = fail;
        try { work(tx.objectStore(ATTACHMENT_STORE), result => { value = result; }); }
        catch (error) {
          clearTimeout(timer);
          try { tx.abort(); } catch { /* Already aborted. */ }
          reject(error);
        }
      });
    } finally { db.close(); }
  }
}
