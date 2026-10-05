import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { ConversationMeta, LinkMessage } from "../src/core/types";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { IndexedDbChatRepository } from "../src/storage/indexeddb-chat-repository";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";
import { ResilientChatRepository } from "../src/storage/resilient-chat-repository";

const event = { direction: "incoming" as const, peerNumber: 303, peerName: "Friend", content: "Please receive this", sentAt: 100, includeRoom: false };
const metadata = { id: "cloud:received-1", cloudId: "received-1", cloudSequence: 1 };

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("chat capture storage failures", () => {
  it.each(["conversation", "cursor", "synchronous"] as const)("keeps message and conversation together when a %s failure falls back to memory", async failure => {
    const database = installTransactionalDatabase();
    const primary = new IndexedDbChatRepository("capture-failure");
    const fallback = new MemoryChatRepository();
    const repository = new ResilientChatRepository(primary, fallback);
    const service = new ChatService(repository, new SettingsStore(new MemoryKeyValueStorage()));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    database.failNextCapture(failure);

    await expect(service.captureCloud(event, metadata, false)).resolves.toMatchObject({ fresh: true });

    expect(repository.canSafelyCapturePortableSnapshot()).toBe(false);
    expect(await fallback.getMessages(303)).toMatchObject([{ id: metadata.id, content: event.content }]);
    expect(await fallback.getConversation(303)).toMatchObject({ lastMessage: event.content, unread: 1 });
    expect(database.messages.size).toBe(0);
    expect(database.conversations.size).toBe(0);
    await expect(service.captureCloud(event, metadata, false)).resolves.toMatchObject({ fresh: false });
    expect(await service.getMessages(303)).toHaveLength(1);
    expect(await service.totalUnread()).toBe(1);
    repository.close();
  });

  it("rolls back both records on failure and accepts an identical Cloud retry exactly once", async () => {
    const database = installTransactionalDatabase();
    const repository = new IndexedDbChatRepository("capture-rollback");
    const service = new ChatService(repository, new SettingsStore(new MemoryKeyValueStorage()));
    database.failNextCapture("conversation");
    await expect(service.captureCloud(event, metadata, false)).rejects.toThrow("Conversation write failed");
    expect(database.messages.size).toBe(0);
    expect(database.conversations.size).toBe(0);
    await expect(service.captureCloud(event, metadata, false)).resolves.toMatchObject({ fresh: true });
    await expect(service.captureCloud(event, metadata, false)).resolves.toMatchObject({ fresh: false });
    expect(await service.getMessages(303)).toHaveLength(1);
    expect(await service.totalUnread()).toBe(1);
    repository.close();
  });

  it("replays an in-flight successful primary capture if another peer switches the active store", async () => {
    const primary = new MemoryChatRepository();
    const fallback = new MemoryChatRepository();
    const repository = new ResilientChatRepository(primary, fallback);
    const service = new ChatService(repository, new SettingsStore(new MemoryKeyValueStorage()));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let entered!: () => void;
    let release!: () => void;
    const pending = new Promise<void>(resolve => { entered = resolve; });
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const capture = primary.captureMessage.bind(primary);
    vi.spyOn(primary, "captureMessage").mockImplementationOnce(async (...args) => {
      entered();
      await barrier;
      return capture(...args);
    });
    const incoming = service.captureCloud(event, metadata, false);
    await pending;
    vi.spyOn(primary, "getConversation").mockRejectedValueOnce(new Error("Other peer lost storage"));
    await repository.getConversation(404);
    release();

    await expect(incoming).resolves.toMatchObject({ fresh: true });
    expect(await fallback.getMessages(303)).toMatchObject([{ id: metadata.id }]);
    expect(await fallback.getConversation(303)).toMatchObject({ unread: 1 });
    repository.close();
  });

  it("commits retention with the captured pair without pruning another peer", async () => {
    installTransactionalDatabase();
    const repository = new IndexedDbChatRepository("capture-retention");
    const conversation: ConversationMeta = { peerNumber: 303, peerName: "Friend", lastMessage: "Latest", lastMessageAt: 300, lastDirection: "incoming", unread: 3, pinned: false, draft: "" };
    await repository.addMessage({ ...event, id: "old", sentAt: 100, read: false });
    await repository.addMessage({ ...event, id: "kept", sentAt: 200, read: false });
    await repository.addMessage({ ...event, peerNumber: 404, id: "other-peer", sentAt: 1, read: false });
    await expect(repository.captureMessage({ ...event, id: "new", sentAt: 300, read: false }, conversation, 2))
      .resolves.toEqual({ removed: 1, oldestRetainedAt: 200 });
    expect((await repository.getMessages(303)).map(row => row.id)).toEqual(["kept", "new"]);
    expect(await repository.getMessages(404)).toMatchObject([{ id: "other-peer" }]);
    expect(await repository.getConversation(303)).toEqual(conversation);
    repository.close();
  });
});

/** Minimal transactional IDB fixture: writes become durable only on completion, and aborts
 * discard all pending writes. Failures are injected in the object store, below repository APIs. */
function installTransactionalDatabase(): {
  messages: Map<IDBValidKey, LinkMessage>;
  conversations: Map<IDBValidKey, ConversationMeta>;
  failNextCapture: (failure: "conversation" | "cursor" | "synchronous") => void;
} {
  const messages = new Map<IDBValidKey, LinkMessage>();
  const conversations = new Map<IDBValidKey, ConversationMeta>();
  let failure: "conversation" | "cursor" | "synchronous" | undefined;
  const stores = { messages, conversations } as Record<string, Map<IDBValidKey, unknown>>;
  vi.stubGlobal("IDBKeyRange", { bound: (lower: number[], upper: number[]) => ({ lower, upper }) });
  const database = {
    close: vi.fn(),
    onversionchange: null,
    transaction(names: string | string[], mode: string) {
      const selected = typeof names === "string" ? [names] : names;
      const staged = Object.fromEntries(selected.map(name => [name, new Map(stores[name])])) as Record<string, Map<IDBValidKey, unknown>>;
      let aborted = false;
      let completed = false;
      let pending = 0;
      const transaction = {
        error: null as DOMException | null,
        oncomplete: null as ((event: Event) => void) | null,
        onabort: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        abort() {
          if (aborted) return;
          aborted = true;
          queueMicrotask(() => transaction.onabort?.(new Event("abort")));
        },
        objectStore(name: string) {
          if (!selected.includes(name)) throw new DOMException("Store outside transaction", "NotFoundError");
          return {
            put(value: LinkMessage | ConversationMeta) {
              if (name === "conversations" && failure === "synchronous") {
                failure = undefined;
                throw new DOMException("Conversation clone failed", "DataCloneError");
              }
              return request(() => {
                if (name === "conversations" && failure === "conversation") {
                  failure = undefined;
                  throw new DOMException("Conversation write failed", "QuotaExceededError");
                }
                staged[name]!.set(name === "messages" ? (value as LinkMessage).id : value.peerNumber, structuredClone(value));
              });
            },
            get(key: IDBValidKey) { return request(() => structuredClone(staged[name]!.get(key))); },
            getAll() { return request(() => [...staged[name]!.values()].map(value => structuredClone(value))); },
            index() {
              return {
                openCursor(range: { lower: number[]; upper: number[] }, direction: string) {
                  let rows: LinkMessage[] | undefined;
                  let index = 0;
                  const cursorRequest = request(next);
                  function next(): unknown {
                    if (failure === "cursor" && mode === "readwrite") {
                      failure = undefined;
                      throw new DOMException("Retention cursor failed", "UnknownError");
                    }
                    rows ??= [...staged[name]!.values() as Iterable<LinkMessage>]
                      .filter(value => value.peerNumber === range.lower[0] && value.sentAt >= range.lower[1]! && value.sentAt <= range.upper[1]!)
                      .sort((a, b) => direction === "prev" ? b.sentAt - a.sentAt : a.sentAt - b.sentAt);
                    const value = rows[index++];
                    return value ? {
                      value: structuredClone(value),
                      delete: () => staged[name]!.delete(value.id),
                      continue: () => schedule(cursorRequest, next),
                    } : null;
                  }
                  return cursorRequest;
                },
              };
            },
          };
        },
      };
      type Request = { result?: unknown; error: unknown; onsuccess: ((event: Event) => void) | null; onerror: ((event: Event) => void) | null };
      function request(operation: () => unknown): Request {
        const result: Request = { error: null, onsuccess: null, onerror: null };
        schedule(result, operation);
        return result;
      }
      function schedule(result: Request, operation: () => unknown): void {
        pending++;
        queueMicrotask(() => {
          if (!aborted) {
            try {
              result.result = operation();
              result.onsuccess?.(new Event("success"));
            } catch (error) {
              result.error = error;
              transaction.error = error as DOMException;
              result.onerror?.(new Event("error"));
              transaction.onerror?.(new Event("error"));
              transaction.abort();
            }
          }
          pending--;
          queueMicrotask(() => {
            if (pending || aborted || completed) return;
            completed = true;
            if (mode === "readwrite") for (const name of selected) {
              stores[name]!.clear();
              for (const [key, value] of staged[name]!) stores[name]!.set(key, value);
            }
            transaction.oncomplete?.(new Event("complete"));
          });
        });
      }
      return transaction;
    },
  };
  vi.stubGlobal("indexedDB", {
    open() {
      const request = { result: database, onsuccess: null as ((event: Event) => void) | null };
      queueMicrotask(() => request.onsuccess?.(new Event("success")));
      return request;
    },
  });
  return { messages, conversations, failNextCapture: value => { failure = value; } };
}
