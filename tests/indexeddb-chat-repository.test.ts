import { afterEach, describe, expect, it, vi } from "vitest";
import { IndexedDbChatRepository } from "../src/storage/indexeddb-chat-repository";

const originalIndexedDb = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
const originalIdbKeyRange = Object.getOwnPropertyDescriptor(globalThis, "IDBKeyRange");

afterEach(() => {
  if (originalIndexedDb) {
    Object.defineProperty(globalThis, "indexedDB", originalIndexedDb);
  } else {
    Reflect.deleteProperty(globalThis, "indexedDB");
  }
  if (originalIdbKeyRange) {
    Object.defineProperty(globalThis, "IDBKeyRange", originalIdbKeyRange);
  } else {
    Reflect.deleteProperty(globalThis, "IDBKeyRange");
  }
});

describe("IndexedDbChatRepository lifecycle", () => {
  it("closes an open connection when another tab requests a database version change", async () => {
    const database = readableDatabase();
    const request = openRequest(database.value);
    installIndexedDbOpen(request, () => invoke(request.onsuccess, "success"));
    const repository = new IndexedDbChatRepository("kikilink-versionchange-test");

    await expect(repository.listConversations()).resolves.toEqual([]);
    expect(database.value.onversionchange).toEqual(expect.any(Function));

    invoke(database.value.onversionchange, "versionchange");
    expect(database.close).toHaveBeenCalledTimes(1);
    repository.close();
    await Promise.resolve();
    expect(database.close).toHaveBeenCalledTimes(2);
  });

  it("closes a late connection after a blocked open has already fallen back", async () => {
    const close = vi.fn();
    const database = { close, onversionchange: null } as unknown as IDBDatabase;
    const request = openRequest(database);
    installIndexedDbOpen(request, () => invoke(request.onblocked, "blocked"));
    const repository = new IndexedDbChatRepository("kikilink-blocked-test");

    await expect(repository.listConversations()).rejects.toThrow("upgrade is blocked");
    repository.close();
    invoke(request.onsuccess, "success");
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("does not emit an unhandled rejection when closed after opening fails", async () => {
    const database = { close: vi.fn(), onversionchange: null } as unknown as IDBDatabase;
    const request = openRequest(database);
    request.error = new DOMException("storage denied", "UnknownError");
    installIndexedDbOpen(request, () => invoke(request.onerror, "error"));
    const repository = new IndexedDbChatRepository("kikilink-failed-open-test");
    const unhandled: unknown[] = [];
    const captureUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", captureUnhandled);

    try {
      await expect(repository.listConversations()).rejects.toThrow("storage denied");
      repository.close();
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", captureUnhandled);
    }
  });

  it("observes both request and transaction failures from the same read", async () => {
    const database = failingReadDatabase("request");
    const request = openRequest(database);
    installIndexedDbOpen(request, () => invoke(request.onsuccess, "success"));
    const repository = new IndexedDbChatRepository("kikilink-request-failure-test");

    await expectNoUnhandledRejection(async () => {
      await expect(repository.listConversations()).rejects.toThrow("request failed");
    });
    repository.close();
  });

  it("observes both cursor and transaction failures from the same read", async () => {
    const database = failingReadDatabase("cursor");
    const request = openRequest(database);
    installIndexedDbOpen(request, () => invoke(request.onsuccess, "success"));
    Object.defineProperty(globalThis, "IDBKeyRange", {
      configurable: true,
      value: { bound: vi.fn(() => ({ lower: 303 })) },
    });
    const repository = new IndexedDbChatRepository("kikilink-cursor-failure-test");

    await expectNoUnhandledRejection(async () => {
      await expect(repository.getMessages(303)).rejects.toThrow("cursor failed");
    });
    repository.close();
  });
});

async function expectNoUnhandledRejection(action: () => Promise<void>): Promise<void> {
  const unhandled: unknown[] = [];
  const captureUnhandled = (reason: unknown): void => {
    unhandled.push(reason);
  };
  process.on("unhandledRejection", captureUnhandled);
  try {
    await action();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(unhandled).toEqual([]);
  } finally {
    process.off("unhandledRejection", captureUnhandled);
  }
}

interface MutableOpenRequest {
  result: IDBDatabase;
  error: DOMException | null;
  onsuccess: IDBOpenDBRequest["onsuccess"];
  onerror: IDBOpenDBRequest["onerror"];
  onblocked: IDBOpenDBRequest["onblocked"];
  onupgradeneeded: IDBOpenDBRequest["onupgradeneeded"];
}

function openRequest(database: IDBDatabase): MutableOpenRequest {
  return {
    result: database,
    error: null,
    onsuccess: null,
    onerror: null,
    onblocked: null,
    onupgradeneeded: null,
  };
}

function installIndexedDbOpen(
  request: MutableOpenRequest,
  complete: () => void,
): void {
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: {
      open: vi.fn(() => {
        queueMicrotask(complete);
        return request as unknown as IDBOpenDBRequest;
      }),
    } as unknown as IDBFactory,
  });
}

function readableDatabase(): {
  value: IDBDatabase;
  close: ReturnType<typeof vi.fn>;
} {
  const close = vi.fn();
  const resultRequest = {
    result: [] as unknown[],
    error: null,
    onsuccess: null as IDBRequest<unknown[]>["onsuccess"],
    onerror: null as IDBRequest<unknown[]>["onerror"],
  };
  const transaction = {
    error: null,
    oncomplete: null as IDBTransaction["oncomplete"],
    onabort: null as IDBTransaction["onabort"],
    onerror: null as IDBTransaction["onerror"],
    objectStore: vi.fn(),
  };
  transaction.objectStore.mockReturnValue({
    getAll: vi.fn(() => {
      queueMicrotask(() => {
        invoke(resultRequest.onsuccess, "success");
        queueMicrotask(() => invoke(transaction.oncomplete, "complete"));
      });
      return resultRequest as unknown as IDBRequest<unknown[]>;
    }),
  });
  const value = {
    close,
    onversionchange: null as IDBDatabase["onversionchange"],
    transaction: vi.fn(() => transaction as unknown as IDBTransaction),
  } as unknown as IDBDatabase;
  return { value, close };
}

function failingReadDatabase(kind: "request" | "cursor"): IDBDatabase {
  const operationRequest = {
    result: kind === "request" ? [] : null,
    error: new DOMException(`${kind} failed`, "UnknownError"),
    onsuccess: null as IDBRequest<unknown>["onsuccess"],
    onerror: null as IDBRequest<unknown>["onerror"],
  };
  const transaction = {
    error: new DOMException("transaction failed", "UnknownError"),
    oncomplete: null as IDBTransaction["oncomplete"],
    onabort: null as IDBTransaction["onabort"],
    onerror: null as IDBTransaction["onerror"],
    objectStore: vi.fn(),
  };
  const startFailures = (): void => {
    queueMicrotask(() => {
      invoke(operationRequest.onerror, "error");
      queueMicrotask(() => invoke(transaction.onerror, "error"));
    });
  };
  transaction.objectStore.mockReturnValue(
    kind === "request"
      ? {
          getAll: vi.fn(() => {
            startFailures();
            return operationRequest as unknown as IDBRequest<unknown[]>;
          }),
        }
      : {
          index: vi.fn(() => ({
            openCursor: vi.fn(() => {
              startFailures();
              return operationRequest as unknown as IDBRequest<IDBCursorWithValue | null>;
            }),
          })),
        },
  );
  return {
    close: vi.fn(),
    onversionchange: null,
    transaction: vi.fn(() => transaction as unknown as IDBTransaction),
  } as unknown as IDBDatabase;
}

function invoke(
  handler: unknown,
  eventName: string,
): void {
  if (typeof handler === "function") {
    (handler as (event: Event) => void)(new Event(eventName));
  }
}
