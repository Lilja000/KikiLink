// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryKeyValueStorage, type KeyValueStorage } from "../src/core/settings";
import {
  FeedDraftStore,
  type FeedDraft,
  type FeedDraftAttachment,
  type FeedDraftAttachmentStorage,
} from "../src/cloud/feed-drafts";

class MemoryAttachments implements FeedDraftAttachmentStorage {
  records = new Map<string, FeedDraftAttachment>();
  failure: Error | undefined;
  wait: Promise<void> | undefined;
  load = vi.fn(async (ids: readonly string[]) => ids.map(id => this.records.get(id)));
  update = vi.fn(async (added: readonly FeedDraftAttachment[], keepIds: readonly string[]) => {
    await this.wait;
    if (this.failure) throw this.failure;
    for (const record of added) this.records.set(record.id, record);
    for (const id of this.records.keys()) if (!keepIds.includes(id)) this.records.delete(id);
  });
  close = vi.fn();
}

function draft(overrides: Partial<FeedDraft> = {}): FeedDraft {
  return { text: "A post for tomorrow", clientId: "stable-post-id", files: [], poll: null, ...overrides };
}
function image(name = "photo.png", contents = "image bytes"): File {
  return new File([contents], name, { type: "image/png", lastModified: 12345 });
}
function setup() {
  const metadata = new MemoryKeyValueStorage();
  const attachments = new MemoryAttachments();
  const backing = { metadata, attachments };
  const store = new FeedDraftStore(123, backing);
  return { metadata, attachments, backing, store };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("FeedDraftStore", () => {
  it("saves text, an incomplete poll and the idempotency key synchronously for immediate restart", async () => {
    const { store, backing, attachments } = setup();
    const poll = { question: "Which room?", options: ["", ""], multiple: true, closesAt: 1_800_000_000_000 };
    store.save(draft({ poll }));
    poll.question = "Not yet saved";
    poll.options[0] = "Changed later";
    const restored = await new FeedDraftStore(123, backing).load();
    expect(restored).toEqual(draft({ poll: { question: "Which room?", options: ["", ""], multiple: true, closesAt: 1_800_000_000_000 } }));
    expect(attachments.update).not.toHaveBeenCalled();
    expect(store.status).toBe("saved");
  });

  it("reconstructs image files, filenames, spoiler flags and metadata after restart", async () => {
    const { store, backing } = setup();
    store.save(draft({ files: [{ file: image(), spoiler: true }, { file: image("second.png", "second bytes"), spoiler: false }] }));
    expect(store.status).toBe("pending");
    await store.flush();
    store.close();
    const loaded = await new FeedDraftStore(123, backing).load();
    expect(loaded?.files).toHaveLength(2);
    expect(loaded?.files[0]?.file).toBeInstanceOf(File);
    expect(loaded?.files[0]?.file.name).toBe("photo.png");
    expect(loaded?.files[0]?.file.lastModified).toBe(12345);
    expect(await loaded?.files[0]?.file.text()).toBe("image bytes");
    expect(loaded?.files.map(entry => entry.spoiler)).toEqual([true, false]);
    expect(loaded?.clientId).toBe("stable-post-id");
  });

  it("isolates account metadata and refuses shared guest storage", async () => {
    const { store, metadata } = setup();
    store.save(draft());
    const other = new FeedDraftStore(456, { metadata, attachments: new MemoryAttachments() });
    expect(await other.load()).toBeUndefined();
    other.save(draft({ text: "Another account", clientId: "other-id" }));
    expect((await new FeedDraftStore(123, { metadata }).load())?.text).toBe("A post for tomorrow");
    expect((await new FeedDraftStore(456, { metadata }).load())?.text).toBe("Another account");
    for (const member of [0, -1, 0.5, Infinity, NaN]) expect(() => new FeedDraftStore(member)).toThrow("valid BC account");
  });

  it("uses different production IndexedDB names for each account", async () => {
    const open = vi.fn(() => { throw new Error("unavailable"); });
    vi.stubGlobal("indexedDB", { open });
    for (const member of [123, 456]) {
      const store = new FeedDraftStore(member, { metadata: new MemoryKeyValueStorage() });
      store.save(draft({ files: [{ file: image(), spoiler: false }] }));
      await expect(store.flush()).rejects.toThrow("unavailable");
    }
    expect(open.mock.calls).toEqual([["kikilink-feed-drafts-123", 1], ["kikilink-feed-drafts-456", 1]]);
  });

  it("does not rewrite blobs for text, spoiler or poll edits, including after a restore", async () => {
    const { store, backing, attachments } = setup();
    const file = image();
    store.save(draft({ files: [{ file, spoiler: false }] }));
    await store.flush();
    for (const text of ["a", "ab", "abc"]) store.save(draft({ text, files: [{ file, spoiler: true }] }));
    await store.flush();
    const reopened = new FeedDraftStore(123, backing);
    const loaded = (await reopened.load())!;
    reopened.save({ ...loaded, text: "More typing", poll: { question: "", options: ["", ""], multiple: false, closesAt: 1_800_000_000_000 } });
    await reopened.flush();
    expect(attachments.update).toHaveBeenCalledTimes(1);
    expect(attachments.update.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it("writes only newly added files and removes attachments no longer in the draft", async () => {
    const { store, attachments } = setup();
    const first = image(), second = image("second.png");
    store.save(draft({ files: [{ file: first, spoiler: false }] }));
    await store.flush();
    store.save(draft({ files: [{ file: first, spoiler: true }, { file: second, spoiler: false }] }));
    await store.flush();
    expect(attachments.update.mock.calls[1]?.[0].map(entry => entry.file)).toEqual([second]);
    store.save(draft({ files: [{ file: second, spoiler: false }] }));
    await store.flush();
    expect(attachments.records.size).toBe(1);
    expect(attachments.update.mock.calls[2]?.[0]).toEqual([]);
    store.save(draft());
    await store.flush();
    expect(attachments.records.size).toBe(0);
  });

  it("tombstones a successful publish before an older image write can finish", async () => {
    const { store, backing, attachments } = setup();
    const pending = deferred();
    attachments.wait = pending.promise;
    store.save(draft({ files: [{ file: image(), spoiler: false }] }));
    await Promise.resolve();
    expect(attachments.update).toHaveBeenCalledTimes(1);
    const clear = store.clear();
    expect(await new FeedDraftStore(123, backing).load()).toBeUndefined();
    pending.resolve();
    await clear;
    expect(attachments.records.size).toBe(0);
    expect(await new FeedDraftStore(123, backing).load()).toBeUndefined();
  });

  it("keeps a newer draft when clear and an older write are still pending", async () => {
    const { store, backing, attachments } = setup();
    const pending = deferred();
    attachments.wait = pending.promise;
    store.save(draft({ files: [{ file: image("old.png"), spoiler: false }] }));
    await Promise.resolve();
    const clear = store.clear();
    store.save(draft({ text: "A new post", clientId: "new-id", files: [{ file: image("new.png"), spoiler: true }] }));
    pending.resolve();
    await clear;
    await store.flush();
    const loaded = await new FeedDraftStore(123, backing).load();
    expect(loaded?.text).toBe("A new post");
    expect(loaded?.clientId).toBe("new-id");
    expect(loaded?.files.map(entry => entry.file.name)).toEqual(["new.png"]);
    expect(attachments.records.size).toBe(1);
  });

  it("never restores an old draft when blob cleanup fails after a clear", async () => {
    const { store, backing, attachments } = setup();
    store.save(draft({ files: [{ file: image(), spoiler: false }] }));
    await store.flush();
    attachments.failure = new Error("Disk unavailable");
    await expect(store.clear()).rejects.toThrow("Disk unavailable");
    expect(attachments.records.size).toBe(1);
    expect(await new FeedDraftStore(123, backing).load()).toBeUndefined();
  });

  it("ignores a late image restore once the user has started a newer draft", async () => {
    const { store, backing, attachments } = setup();
    store.save(draft({ files: [{ file: image(), spoiler: false }] }));
    await store.flush();
    const pending = deferred();
    attachments.load.mockImplementation(async ids => { await pending.promise; return ids.map(id => attachments.records.get(id)); });
    const reopened = new FeedDraftStore(123, backing);
    const load = reopened.load();
    reopened.save(draft({ text: "Typed while loading", clientId: "new-id" }));
    pending.resolve();
    expect(await load).toBeUndefined();
    await reopened.flush();
    expect((await new FeedDraftStore(123, backing).load())?.text).toBe("Typed while loading");
  });

  it("reports quota failure, preserves available text and retries the same image on a later save", async () => {
    const { store, backing, attachments } = setup();
    const statuses: string[] = [];
    store.subscribe(status => statuses.push(status));
    attachments.failure = new Error("Quota exceeded");
    const value = draft({ files: [{ file: image(), spoiler: true }] });
    store.save(value);
    await expect(store.flush()).rejects.toThrow("Quota exceeded");
    expect(store.status).toBe("error");
    const reopened = new FeedDraftStore(123, backing);
    const partial = await reopened.load();
    expect(partial?.text).toBe(value.text);
    expect(partial?.files).toEqual([]);
    expect(reopened.status).toBe("error");
    expect(reopened.error?.message).toContain("attach them again");
    attachments.failure = undefined;
    store.save(value);
    await store.flush();
    expect(store.status).toBe("saved");
    expect(statuses).toContain("pending");
    expect(statuses).toContain("error");
    expect(statuses.at(-1)).toBe("saved");
    expect((await new FeedDraftStore(123, backing).load())?.files).toHaveLength(1);
  });

  it("preserves the previous complete snapshot if metadata hits quota", async () => {
    const { store, metadata, attachments } = setup();
    store.save(draft({ files: [{ file: image("saved.png"), spoiler: false }] }));
    await store.flush();
    const unavailable: KeyValueStorage = {
      getItem: key => metadata.getItem(key),
      setItem() { throw new Error("Metadata quota exceeded"); },
      removeItem() { throw new Error("Metadata quota exceeded"); },
    };
    const reopened = new FeedDraftStore(123, { metadata: unavailable, attachments });
    await reopened.load();
    reopened.save(draft({ text: "Cannot persist", files: [{ file: image("new.png"), spoiler: false }] }));
    await expect(reopened.flush()).rejects.toThrow("Metadata quota exceeded");
    expect(reopened.status).toBe("error");
    const loaded = await new FeedDraftStore(123, { metadata, attachments }).load();
    expect(loaded?.text).toBe("A post for tomorrow");
    expect(loaded?.files[0]?.file.name).toBe("saved.png");
    expect(attachments.update).toHaveBeenCalledTimes(1);
  });

  it("saves and clears text without IndexedDB, but never claims unavailable images are saved", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const metadata = new MemoryKeyValueStorage();
    const textOnly = new FeedDraftStore(123, { metadata });
    textOnly.save(draft());
    await textOnly.flush();
    await textOnly.clear();
    expect(await textOnly.load()).toBeUndefined();
    textOnly.save(draft({ files: [{ file: image(), spoiler: false }] }));
    await expect(textOnly.flush()).rejects.toThrow("image storage is unavailable");
    expect(textOnly.status).toBe("error");
  });

  it("does not silently fall back to in-memory metadata when permanent storage is unavailable", async () => {
    vi.stubGlobal("localStorage", undefined);
    const store = new FeedDraftStore(123);
    expect(await store.load()).toBeUndefined();
    expect(store.status).toBe("error");
    store.save(draft());
    await expect(store.flush()).rejects.toThrow("storage is unavailable");
  });

  it("finishes already queued writes when the account session closes", async () => {
    const { store, backing, attachments } = setup();
    const pending = deferred();
    attachments.wait = pending.promise;
    store.save(draft({ files: [{ file: image(), spoiler: false }] }));
    store.close();
    expect(() => store.save(draft())).toThrow("closed account");
    expect(attachments.close).not.toHaveBeenCalled();
    pending.resolve();
    await store.flush();
    expect(attachments.close).toHaveBeenCalledTimes(1);
    expect((await new FeedDraftStore(123, backing).load())?.files).toHaveLength(1);
  });

  it("rejects invalid or oversized image snapshots before changing saved metadata", async () => {
    const { store, backing } = setup();
    store.save(draft());
    expect(() => store.save(draft({ files: Array.from({ length: 5 }, () => ({ file: image(), spoiler: false })) }))).toThrow("invalid");
    expect(() => store.save(draft({ files: [{ file: new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }), spoiler: false }] }))).toThrow("5 MB");
    expect(() => store.save(draft({ files: [{ file: new File(["hello"], "hello.txt", { type: "text/plain" }), spoiler: false }] }))).toThrow("5 MB");
    expect((await new FeedDraftStore(123, backing).load())?.text).toBe("A post for tomorrow");
  });

  it("restores an exact frozen POST independently of newer typing and reuses shared file objects", async () => {
    const { store, backing, attachments } = setup();
    const file = image();
    const poll = { question: "Original question", options: ["A", "B"], multiple: false, closesAt: 1_800_000_000_000 };
    store.save(draft({ text: "Original plus new typing", files: [{ file, spoiler: false }],
      pending: { ...draft({ text: "Original", files: [{ file, spoiler: true }], poll }), mediaIds: ["uploaded-media-id"], spoilerMediaIds: ["uploaded-media-id"] },
    }));
    await store.flush();
    const restored = (await new FeedDraftStore(123, backing).load())!;
    expect(restored.pending?.text).toBe("Original");
    expect(restored.text).toBe("Original plus new typing");
    expect(restored.pending?.poll).toEqual(poll);
    expect(restored.pending?.mediaIds).toEqual(["uploaded-media-id"]);
    expect(restored.pending?.spoilerMediaIds).toEqual(["uploaded-media-id"]);
    expect(restored.files[0]?.file).toBe(restored.pending?.files[0]?.file);
    expect(restored.files[0]?.spoiler).toBe(false);
    expect(restored.pending?.files[0]?.spoiler).toBe(true);
    expect(attachments.update.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it("retains frozen uploaded IDs even if device image data disappears, for an exact retry", async () => {
    const { store, backing, attachments } = setup();
    store.save(draft({ pending: { ...draft({ files: [{ file: image(), spoiler: true }] }), mediaIds: ["asset-id"], spoilerMediaIds: ["asset-id"] } }));
    await store.flush();
    attachments.records.clear();
    const reopened = new FeedDraftStore(123, backing);
    const restored = await reopened.load();
    expect(restored?.pending?.mediaIds).toEqual(["asset-id"]);
    expect(restored?.pending?.spoilerMediaIds).toEqual(["asset-id"]);
    expect(restored?.pending?.clientId).toBe("stable-post-id");
    expect(restored?.pending?.files).toEqual([]);
    expect(reopened.status).toBe("error");
  });

  it("keeps files from an uncertain attempt when the editable draft uses different images", async () => {
    const { store, backing, attachments } = setup();
    const oldFiles = Array.from({ length: 4 }, (_, index) => ({ file: image(`original-${index}.png`), spoiler: false }));
    const newFiles = Array.from({ length: 4 }, (_, index) => ({ file: image(`new-${index}.png`), spoiler: true }));
    store.save(draft({ files: newFiles, pending: { ...draft({ files: oldFiles }), mediaIds: ["a", "b", "c", "d"], spoilerMediaIds: [] } }));
    await store.flush();
    expect(attachments.records.size).toBe(8);
    const reopened = new FeedDraftStore(123, backing);
    const restored = (await reopened.load())!;
    expect(restored.pending?.files.map(item => item.file.name)).toEqual(oldFiles.map(item => item.file.name));
    const { pending: _pending, ...withoutPending } = restored;
    reopened.save(withoutPending);
    await reopened.flush();
    expect(attachments.records.size).toBe(4);
    expect([...attachments.records.values()].map(item => (item.file as File).name)).toEqual(newFiles.map(item => item.file.name));
  });

  it("re-persists a tab's files after another tab replaced and pruned its previous snapshot", async () => {
    const { store, backing, attachments } = setup();
    const original = draft({ files: [{ file: image("first-tab.png"), spoiler: false }] });
    store.save(original);
    await store.flush();
    const second = new FeedDraftStore(123, backing);
    await second.load();
    second.save(draft({ text: "Second tab", files: [{ file: image("second-tab.png"), spoiler: false }] }));
    await second.flush();
    store.save({ ...original, text: "Typing again in first tab" });
    await store.flush();
    const restored = await new FeedDraftStore(123, backing).load();
    expect(restored?.files[0]?.file.name).toBe("first-tab.png");
    expect(restored?.text).toBe("Typing again in first tab");
    expect(attachments.records.size).toBe(1);
  });
});
