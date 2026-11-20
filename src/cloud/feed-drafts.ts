import { scopePersistenceName } from "../core/storage-scope";
import type { KeyValueStorage } from "../core/settings";
import { AccountKeyValueStorage } from "../storage/account-data-storage";
import type { CloudPollDraft } from "./types";

import { FEED_DRAFT_METADATA_KEY as METADATA_KEY, parseMetadata, metadataFiles, validPoll, validMediaIds, type DraftMetadata, type SnapshotMetadata } from "./feed-draft-metadata";
import { openFeedDatabase, FEED_ATTACHMENTS, FEED_IMPORTS } from "../storage/feed-database";
import { feedRecoveryHoldIds } from "../storage/feed-import-recovery";
import { feedRowsKey, FEED_CURRENT_BYTES_LIMIT } from "../storage/feed-import-model";
import { readArchivedFeedFields } from "../storage/feed-archived-fields";
import { prepareFeedDraftFields } from '../storage/feed-draft-archived-fields';
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
  archivedFields?: string;
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
  readonly #archivedFields = new WeakMap<File, string>();
  readonly #listeners = new Set<(status: FeedDraftStatus) => void>();
  #committedIds = new Set<string>();
  #requestedSignature: string | undefined;
  #lastMetadata: string | null | undefined;
  #archivedMetadata: string | undefined;
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
    this.#attachments = backing.attachments ?? new IndexedDbFeedDraftAttachments(memberNumber);
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
    let archivedMetadata: string | undefined;
    try {
      raw = this.#metadata.getItem(METADATA_KEY);
      metadata = parseMetadata(raw);
      archivedMetadata = metadata ? prepareFeedDraftFields(metadata) : undefined;
      this.#metadataError = undefined;
    } catch (error) {
      this.#metadataError = storageError(error);
      this.#notify();
      return undefined;
    }
    if (!metadata) { this.#archivedMetadata = undefined; return undefined; }
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
          if (record.archivedFields !== undefined) {
            readArchivedFeedFields(record.archivedFields);
            this.#archivedFields.set(file, record.archivedFields);
          }
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
    this.#archivedMetadata = archivedMetadata;
    this.#committedIds = new Set(restoredFiles.keys());
    this.#requestedSignature = fileMetadata.map(file => file.id).join("|");
    this.#notify();
    const restore = (snapshot: SnapshotMetadata): FeedDraftSnapshot => ({
      text: snapshot.text, clientId: snapshot.clientId, poll: knownPoll(snapshot.poll),
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
    let archivedMetadata = this.#archivedMetadata;
    try {
      // Another tab may have replaced this draft and pruned our old image records.
      // Re-saving this tab's composition must re-persist its actual File objects.
      const raw = this.#metadata.getItem(METADATA_KEY), saved = parseMetadata(raw);
      if (saved) archivedMetadata = prepareFeedDraftFields(saved, archivedMetadata);
      if (raw !== this.#lastMetadata) {
        this.#committedIds.clear();
        this.#requestedSignature = undefined;
      }
    } catch (error) { this.#metadataError = storageError(error); this.#notify(); return; }
    const files = new Map<string, FeedDraftAttachment>();
    const snapshot = (draft: FeedDraftSnapshot): SnapshotMetadata => ({
      text: draft.text, clientId: draft.clientId,
      files: draft.files.map(({ file, spoiler }) => {
        let id = this.#fileIds.get(file);
        if (!id) { id = createId(); this.#fileIds.set(file, id); }
        const archivedFields = this.#archivedFields.get(file);
        files.set(id, { id, file, ...(archivedFields !== undefined ? { archivedFields } : {}) });
        return { id, name: file.name, type: file.type, size: file.size, lastModified: file.lastModified, spoiler };
      }),
      poll: knownPoll(draft.poll),
    });
    const metadata: DraftMetadata = {
      version: 1,
      revision: createId(),
      ...snapshot(draft),
      ...(archivedMetadata !== undefined ? { archivedFields: archivedMetadata } : {}),
    };
    if (draft.pending) metadata.pending = { ...snapshot(draft.pending),
      ...(draft.pending.mediaIds ? { mediaIds: [...draft.pending.mediaIds] } : {}),
      ...(draft.pending.spoilerMediaIds ? { spoilerMediaIds: [...draft.pending.spoilerMediaIds] } : {}),
    };
    this.#mutation++;
    this.#writeMetadata(metadata);
    if (this.#metadataError) return;
    this.#archivedMetadata = archivedMetadata;
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
    if (this.#metadataError) return this.flush();
    this.#archivedMetadata = undefined;
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
      parseMetadata(raw); // Bound the combined active metadata and inactive fields before writing.
      this.#metadata.setItem(METADATA_KEY, raw);
      if (this.#metadata.getItem(METADATA_KEY) !== raw) throw new Error('Saving the Feed draft could not be confirmed. Reload and check the saved draft.');
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

const knownPoll = (poll: CloudPollDraft | null): CloudPollDraft | null => poll ?
  { question: poll.question, options: [...poll.options], multiple: poll.multiple, closesAt: poll.closesAt } : null;

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

function storageError(error: unknown): Error {
  return error instanceof Error ? error : new Error("The draft could not be saved on this device");
}

function createId(): string {
  return typeof crypto === "object" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

class IndexedDbFeedDraftAttachments implements FeedDraftAttachmentStorage {
  constructor(private readonly memberNumber: number) {}

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

  async update(added: readonly FeedDraftAttachment[], _keepIds: readonly string[]): Promise<void> {
    return this.#transaction("readwrite", (store,_result,tx,fail) => {
      const copies = tx.objectStore(FEED_IMPORTS).getAll(), rows = store.getAll(); let ready = 0;
      const write = () => {
        if (++ready !== 2) return;
        try {
          const held = feedRecoveryHoldIds(copies.result,this.memberNumber);
          const current = rows.result as FeedDraftAttachment[];
          feedRowsKey(current.map(value => ({key:value.id,value})));
          const existing = new Map(current.map(file => [file.id,file]));
          const missing = added.filter(file => !existing.has(file.id));
          if (new Set(added.map(file => file.id)).size !== added.length ||
            current.length + missing.length > 32 ||
            [...current,...missing].reduce((n,file) => n+file.file.size,0) > FEED_CURRENT_BYTES_LIMIT)
            throw new Error("Saved Feed files are full. Download or remove unused files in Settings → Data & about → Saved device files.");
          for (const file of added) {
            if (held.has(file.id)) throw new Error("Finish the saved Feed import before replacing its image.");
            const previous = existing.get(file.id);
            if (previous) {
              if (previous.file.size !== file.file.size || previous.file.type !== file.file.type || previous.archivedFields !== file.archivedFields)
                throw new Error("A different saved Feed image already uses this ID. Its original bytes were kept.");
              continue; // Immutable file IDs: no rewriting another writer's existing bytes.
            }
            store.add(file);
          }
          // Metadata and files live in separate stores. A stale keep-list cannot
          // prove that another editor no longer needs an image. Removal is explicit.
        } catch (error) { fail(error); }
      };
      copies.onsuccess = rows.onsuccess = write;
    });
  }

  async #open(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") throw new Error("Permanent draft image storage is unavailable in this browser");
    return openFeedDatabase(scopePersistenceName(`kikilink-feed-drafts-${this.memberNumber}`),indexedDB,true,()=>{});
  }

  async #transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore, result: (value: T) => void, tx: IDBTransaction, fail: (error: unknown) => void) => void): Promise<T> {
    const db = await this.#open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction([FEED_ATTACHMENTS,FEED_IMPORTS], mode);
        let value!: T, reason: unknown;
        const fail = () => {
          clearTimeout(timer);
          reject(reason ?? tx.error ?? new Error("Draft image storage failed. Please keep this page open and try again."));
        };
        const timer = setTimeout(() => {
          try { tx.abort(); } catch { /* The transaction may have just completed. */ }
          fail();
        }, STORAGE_TIMEOUT_MS);
        tx.oncomplete = () => { clearTimeout(timer); resolve(value); };
        tx.onerror = tx.onabort = fail;
        try { work(tx.objectStore(ATTACHMENT_STORE), result => { value = result; }, tx, error => { reason = error; try { tx.abort(); } catch {} }); }
        catch (error) {
          clearTimeout(timer);
          try { tx.abort(); } catch { /* Already aborted. */ }
          reject(error);
        }
      });
    } finally { db.close(); }
  }
}
