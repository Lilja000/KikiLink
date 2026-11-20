import { scopePersistenceName } from "../core/storage-scope";
import type { ConversationMeta, LinkMessage } from "../core/types";
import type { ChatCaptureResult, ChatRepository } from "./chat-repository";
import { sortConversations } from "./memory-chat-repository";
import {hydratePortableMessage,hydratePortableConversation,preparePortableChatRecords,type PortableChatRecords} from './portable-chat-records';

const DATABASE_NAME = scopePersistenceName("kikilink");
const DATABASE_VERSION = 1;
const MESSAGE_STORE = "messages";
const CONVERSATION_STORE = "conversations";
const PEER_TIME_INDEX = "peer-time";
const TIME_INDEX = "time";

export class IndexedDbChatRepository implements ChatRepository {
  #databasePromise: Promise<IDBDatabase> | undefined;
  #hydrationGeneration=0;

  constructor(private readonly databaseName = DATABASE_NAME) {}

  deviceHistoryDatabase(owner: number): string | undefined {
    return this.databaseName === scopePersistenceName(`kikilink-account-${owner}`) ? this.databaseName : undefined;
  }

  async hydratePortableChats(records:PortableChatRecords,current:()=>boolean=()=>true):Promise<void> {
    const generation=this.#hydrationGeneration,check=()=>{if(generation!==this.#hydrationGeneration||!current())throw new Error('Portable chat restoration cancelled.');};
    check();const prepared=preparePortableChatRecords(records);if(!prepared.messages.length&&!prepared.conversations.length)return;
    const database=await this.#database();check();
    await new Promise<void>((resolve,reject)=>{
      const tx=database.transaction([MESSAGE_STORE,CONVERSATION_STORE],'readwrite');let reason:unknown;
      const abort=(error:unknown)=>{reason??=error;try{tx.abort();}catch{}};
      const timer=setTimeout(()=>abort(new Error('Portable chat restoration timed out.')),20000);
      tx.onabort=()=>{clearTimeout(timer);reject(reason??tx.error??new Error('Portable chat restoration transaction failed.'));};
      tx.onerror=()=>{reason??=tx.error??new Error('Portable chat restoration request failed.');};
      tx.oncomplete=()=>{clearTimeout(timer);try{check();resolve();}catch(e){reject(e);}};
      try{
        const messages=tx.objectStore(MESSAGE_STORE),conversations=tx.objectStore(CONVERSATION_STORE);
        if(messages.keyPath!=='id'||conversations.keyPath!=='peerNumber'||messages.autoIncrement||conversations.autoIncrement)throw new Error('Portable chat restoration requires a compatible native layout.');
        for(const row of prepared.messages){const request=messages.get(row.id);request.onerror=()=>abort(request.error);request.onsuccess=()=>{try{check();const next=hydratePortableMessage(request.result,row);if(next)messages.put(next);}catch(e){abort(e);}};}
        for(const row of prepared.conversations){const request=conversations.get(row.peerNumber);request.onerror=()=>abort(request.error);request.onsuccess=()=>{try{check();const next=hydratePortableConversation(request.result,row);if(next)conversations.put(next);}catch(e){abort(e);}};}
      }catch(e){abort(e);}
    });
  }

  async captureMessage(message: LinkMessage, conversation: ConversationMeta, keepNewest: number): Promise<ChatCaptureResult> {
    const database = await this.#database();
    const transaction = database.transaction([MESSAGE_STORE, CONVERSATION_STORE], "readwrite");
    const done = transactionDone(transaction);
    try {
      const messages = transaction.objectStore(MESSAGE_STORE);
      messages.put(message);
      transaction.objectStore(CONVERSATION_STORE).put(conversation);
      const range = IDBKeyRange.bound([message.peerNumber, 0], [message.peerNumber, Number.MAX_SAFE_INTEGER]);
      let visited = 0;
      let removed = 0;
      let oldestRetainedAt: number | undefined;
      const cursor = iterateCursor(messages.index(PEER_TIME_INDEX).openCursor(range, "prev"), cursor => {
        visited += 1;
        if (visited > keepNewest) {
          cursor.delete();
          removed += 1;
        } else {
          oldestRetainedAt = (cursor.value as LinkMessage).sentAt;
        }
        return true;
      });
      await Promise.all([cursor, done]);
      return { removed, oldestRetainedAt };
    } catch (error) {
      // A synchronous put/cursor failure must also roll back already queued writes.
      try { transaction.abort(); } catch { /* The transaction has already finished/aborted. */ }
      await done.catch(() => undefined);
      throw error;
    }
  }

  async addMessage(message: LinkMessage): Promise<void> {
    const database = await this.#database();
    const transaction = database.transaction(MESSAGE_STORE, "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(MESSAGE_STORE).put(message);
    await done;
  }

  async getMessages(peerNumber: number, limit = 200): Promise<LinkMessage[]> {
    const database = await this.#database();
    const transaction = database.transaction(MESSAGE_STORE, "readonly");
    const done = transactionDone(transaction);
    const index = transaction.objectStore(MESSAGE_STORE).index(PEER_TIME_INDEX);
    const range = IDBKeyRange.bound([peerNumber, 0], [peerNumber, Number.MAX_SAFE_INTEGER]);
    const messages: LinkMessage[] = [];

    const cursor = iterateCursor(index.openCursor(range, "prev"), (cursor) => {
      messages.push(cursor.value as LinkMessage);
      return messages.length < limit;
    });
    await Promise.all([cursor, done]);
    return messages.reverse();
  }

  async getConversation(peerNumber: number): Promise<ConversationMeta | undefined> {
    const database = await this.#database();
    const transaction = database.transaction(CONVERSATION_STORE, "readonly");
    const done = transactionDone(transaction);
    const value = requestResult<ConversationMeta | undefined>(
      transaction.objectStore(CONVERSATION_STORE).get(peerNumber),
    );
    const [conversation] = await Promise.all([value, done]);
    return conversation;
  }

  async listConversations(): Promise<ConversationMeta[]> {
    const database = await this.#database();
    const transaction = database.transaction(CONVERSATION_STORE, "readonly");
    const done = transactionDone(transaction);
    const values = requestResult<ConversationMeta[]>(
      transaction.objectStore(CONVERSATION_STORE).getAll(),
    );
    const [conversations] = await Promise.all([values, done]);
    return conversations.sort(sortConversations);
  }

  async putConversation(conversation: ConversationMeta): Promise<void> {
    const database = await this.#database();
    const transaction = database.transaction(CONVERSATION_STORE, "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(CONVERSATION_STORE).put(conversation);
    await done;
  }

  async deleteConversation(peerNumber: number): Promise<void> {
    const database = await this.#database();
    const transaction = database.transaction([MESSAGE_STORE, CONVERSATION_STORE], "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(CONVERSATION_STORE).delete(peerNumber);
    const index = transaction.objectStore(MESSAGE_STORE).index(PEER_TIME_INDEX);
    const range = IDBKeyRange.bound([peerNumber, 0], [peerNumber, Number.MAX_SAFE_INTEGER]);
    const cursor = iterateCursor(index.openCursor(range), (cursor) => {
      cursor.delete();
      return true;
    });
    await Promise.all([cursor, done]);
  }

  async deleteMessagesOlderThan(timestamp: number): Promise<number> {
    const database = await this.#database();
    const transaction = database.transaction(MESSAGE_STORE, "readwrite");
    const done = transactionDone(transaction);
    const index = transaction.objectStore(MESSAGE_STORE).index(TIME_INDEX);
    const range = IDBKeyRange.upperBound(timestamp, true);
    let removed = 0;

    const cursor = iterateCursor(index.openCursor(range), (cursor) => {
      cursor.delete();
      removed += 1;
      return true;
    });
    await Promise.all([cursor, done]);
    return removed;
  }

  async deleteMessagesForConversationAtOrBefore(
    peerNumber: number,
    timestamp: number,
  ): Promise<number> {
    const database = await this.#database();
    const transaction = database.transaction(MESSAGE_STORE, "readwrite");
    const done = transactionDone(transaction);
    const index = transaction.objectStore(MESSAGE_STORE).index(PEER_TIME_INDEX);
    const range = IDBKeyRange.bound([peerNumber, 0], [peerNumber, timestamp]);
    let removed = 0;

    const cursor = iterateCursor(index.openCursor(range), (cursor) => {
      cursor.delete();
      removed += 1;
      return true;
    });
    await Promise.all([cursor, done]);
    return removed;
  }

  async trimConversation(peerNumber: number, keepNewest: number): Promise<number> {
    const database = await this.#database();
    const transaction = database.transaction(MESSAGE_STORE, "readwrite");
    const done = transactionDone(transaction);
    const index = transaction.objectStore(MESSAGE_STORE).index(PEER_TIME_INDEX);
    const range = IDBKeyRange.bound([peerNumber, 0], [peerNumber, Number.MAX_SAFE_INTEGER]);
    let visited = 0;
    let removed = 0;

    const cursor = iterateCursor(index.openCursor(range, "prev"), (cursor) => {
      visited += 1;
      if (visited > keepNewest) {
        cursor.delete();
        removed += 1;
      }
      return true;
    });
    await Promise.all([cursor, done]);
    return removed;
  }

  async clearAll(): Promise<void> {
    const database = await this.#database();
    const transaction = database.transaction([MESSAGE_STORE, CONVERSATION_STORE], "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(MESSAGE_STORE).clear();
    transaction.objectStore(CONVERSATION_STORE).clear();
    await done;
  }

  close(): void {
    ++this.#hydrationGeneration;
    if (!this.#databasePromise) return;
    void this.#databasePromise.then((database) => database.close()).catch(() => undefined);
    this.#databasePromise = undefined;
  }

  #database(): Promise<IDBDatabase> {
    this.#databasePromise ??= openDatabase(this.databaseName);
    return this.#databasePromise;
  }
}

function openDatabase(databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION);
    let settled = false;
    const rejectOnce = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    request.onerror = () =>
      rejectOnce(request.error ?? new Error("Unable to open KikiLink storage"));
    request.onblocked = () => rejectOnce(new Error("KikiLink storage upgrade is blocked"));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(MESSAGE_STORE)) {
        const messages = database.createObjectStore(MESSAGE_STORE, { keyPath: "id" });
        messages.createIndex(PEER_TIME_INDEX, ["peerNumber", "sentAt"], { unique: false });
        messages.createIndex(TIME_INDEX, "sentAt", { unique: false });
      }
      if (!database.objectStoreNames.contains(CONVERSATION_STORE)) {
        database.createObjectStore(CONVERSATION_STORE, { keyPath: "peerNumber" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      if (settled) {
        // A blocked request may still succeed after the caller has already switched to the
        // memory fallback. Do not leak that late database connection.
        database.close();
        return;
      }
      settled = true;
      resolve(database);
    };
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("KikiLink storage request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("KikiLink transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("KikiLink transaction failed"));
  });
}

function iterateCursor(
  request: IDBRequest<IDBCursorWithValue | null>,
  visitor: (cursor: IDBCursorWithValue) => boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("KikiLink cursor failed"));
    request.onsuccess = () => {
      try {
        const cursor = request.result;
        if (!cursor || !visitor(cursor)) {
          resolve();
          return;
        }
        cursor.continue();
      } catch (error) {
        reject(error);
      }
    };
  });
}
