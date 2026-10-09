// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { CloudDirect } from "../src/cloud/direct";
import { CloudClient, CloudError } from "../src/cloud/client";
import { createDeviceKey } from "../src/cloud/device-key";
import { directReceiptState, messageReceiptIndicator, updateMessageReceipt } from "../src/modules/link-chat/message-receipt";
import type { CommunityService } from "../src/cloud/community";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";

const cleanup: Array<() => void> = [];
afterEach(() => { for (const dispose of cleanup.splice(0)) dispose(); vi.useRealTimers(); });

function setup(storage = new MemoryKeyValueStorage(), memberNumber = 101) {
  const repository = new MemoryChatRepository(), settings = new SettingsStore(storage), chat = new ChatService(repository, settings);
  const request = vi.fn(async (_method: string, path: string, _input?: unknown): Promise<unknown> => {
    if (path === "/v1/read-cursors") return { items: [] };
    return { items: [], cursor: 0, nextCursor: null };
  });
  let eventListener: (kind: string) => void = () => {};
  const community = { supported: true, directEnabled: true, relationships: new Map([[202, { directMessages: true, canMessage: true }]]),
    client: { memberNumber, connected: true, request, subscribe: (fn: (kind: string) => void) => { eventListener = fn; return () => {}; } },
    adapter: { getMemberName: (peer: number) => `Member ${peer}` }, subscribe: () => () => {} } as unknown as CommunityService;
  const options = { active: () => false, changed: vi.fn(), incoming: vi.fn() };
  const direct = new CloudDirect(community, chat, storage, options);
  cleanup.push(() => direct.destroy());
  return { repository, settings, chat, request, community, options, direct, storage, hint: (kind: string) => eventListener(kind) };
}
it("keeps Cloud acceptance unchecked and shows checks only for recipient delivery and Read", async () => {
  const h = setup(); let input: { clientMessageId: string } | undefined;
  h.request.mockImplementation(async (method, path, body) => {
    if (method === "POST" && path.endsWith("/messages")) { input = body as typeof input; throw new CloudError("network_unavailable"); }
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  const outgoing = await h.direct.send(202, "Friend", "One message");
  await vi.waitFor(async () => expect((await h.chat.getMessages(202))[0]?.deliveryError).toContain("Not confirmed"));
  expect(outgoing.delivery).toBe("waiting");
  const indicator = messageReceiptIndicator(directReceiptState((await h.chat.getMessages(202))[0]?.delivery));
  expect(indicator.dataset.state).toBe("pending");
  expect(indicator.getAttribute("aria-hidden")).toBe("true");
  h.direct.destroy();
  let receipt: "none" | "delivered" | "read" = "none";
  h.request.mockImplementation(async (method, path, body) => {
    if (method === "POST" && path.endsWith("/messages")) { expect((body as typeof input)?.clientMessageId).toBe(input?.clientMessageId); return { id: "saved", sequence: 1, state: "sent" }; }
    if (path.includes("/receipts")) return {
      items: receipt === "none" ? [] : [{ messageId: "saved", recipient: 202, state: receipt }],
      cursor: receipt === "none" ? 0 : receipt === "delivered" ? 1 : 2,
      nextCursor: null,
    };
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  const reopened = new CloudDirect(h.community, h.chat, h.storage, h.options);
  h.community.relationships.clear(); expect(reopened.shouldUse(202)).toBe(true);
  await reopened.sync(); expect(await h.chat.getMessages(202)).toHaveLength(1);
  expect((await h.chat.getMessages(202))[0]?.delivery).toBe("sent");
  updateMessageReceipt(indicator, directReceiptState((await h.chat.getMessages(202))[0]?.delivery));
  expect(indicator.dataset.state).toBe("pending");
  expect(indicator.hasAttribute("title")).toBe(false);
  receipt = "delivered"; await reopened.sync(); expect((await h.chat.getMessages(202))[0]?.delivery).toBe("delivered");
  updateMessageReceipt(indicator, directReceiptState((await h.chat.getMessages(202))[0]?.delivery));
  expect(indicator.dataset.state).toBe("sent");
  receipt = "read"; await reopened.sync(); expect((await h.chat.getMessages(202))[0]?.delivery).toBe("read");
  updateMessageReceipt(indicator, directReceiptState((await h.chat.getMessages(202))[0]?.delivery));
  expect(indicator.dataset.state).toBe("read");
  expect(h.request.mock.calls.filter(([method, path]) => method === "POST" && path.endsWith("/messages"))).toHaveLength(2);
  const other = setup(h.storage, 303); other.community.relationships.clear(); expect(other.direct.shouldUse(202)).toBe(false);
  reopened.destroy(); other.direct.destroy();
});
it("does not acknowledge before local storage and deduplicates a replay after an acknowledgment failure", async () => {
  const h = setup(); const capture = vi.spyOn(h.chat, "captureCloud"); let acknowledged = false, failAck = true;
  h.request.mockImplementation(async (method, path) => {
    if (path.includes("/inbox")) return { items: acknowledged ? [] : [{ id: "remote", clientMessageId: crypto.randomUUID(), sequence: 5, sender: 202, recipient: 101, text: "Offline delivery", createdAt: Date.now() }], cursor: 5, nextCursor: null };
    if (method === "POST" && path.endsWith("acknowledge")) { expect((await h.chat.getMessages(202))[0]?.id).toBe("cloud-in:remote"); if (failAck) throw new CloudError("offline"); acknowledged = true; return {}; }
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  capture.mockRejectedValueOnce(new Error("disk full")); await expect(h.direct.sync()).rejects.toThrow("disk full");
  expect(h.request.mock.calls.some(([, path]) => path.endsWith("acknowledge"))).toBe(false);
  await expect(h.direct.sync()).rejects.toThrow("offline");
  // Local delivery is visible even when its acknowledgement cannot reach Cloud.
  expect(h.options.incoming).toHaveBeenCalledOnce();
  expect(h.options.changed).toHaveBeenCalledWith(202, expect.objectContaining({ id: "cloud-in:remote" }));
  failAck = false; await h.direct.sync();
  expect(h.options.incoming).toHaveBeenCalledOnce();
  expect(await h.chat.getMessages(202)).toHaveLength(1); expect((await h.chat.getConversation(202))?.unread).toBe(1);
  h.direct.destroy();
});

it.each([
  { status: 503, retryAfterMs: 0, cooldown: 0, delay: 5000 },
  { status: 429, retryAfterMs: 45000, cooldown: 0, delay: 45000 },
  { status: 503, retryAfterMs: 0, cooldown: 30000, delay: 30000 },
])("recovers an ambiguous send without a new event, respecting backoff: %j", async ({ status, retryAfterMs, cooldown, delay }) => {
  vi.useFakeTimers();
  const h = setup(); let attempts = 0;
  Object.defineProperty(h.community.client, "retryDelay", { get: () => cooldown });
  h.request.mockImplementation(async (method, path) => {
    if (method === "POST" && path.endsWith("/messages")) {
      if (++attempts === 1) throw new CloudError("temporarily_unavailable", status, retryAfterMs);
      return { id: "accepted-once", sequence: 1, state: "sent" };
    }
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  await h.direct.send(202, "Friend", "Keep this exact message");
  await vi.advanceTimersByTimeAsync(0);
  expect(attempts).toBe(1);
  await vi.advanceTimersByTimeAsync(delay - 1); expect(attempts).toBe(1);
  await vi.advanceTimersByTimeAsync(1); expect(attempts).toBe(2);
  const posts = h.request.mock.calls.filter(([method, path]) => method === "POST" && path.endsWith("/messages"));
  expect(posts[1]![2]).toEqual(posts[0]![2]);
  expect(await h.chat.getMessages(202)).toHaveLength(1);
  expect((await h.chat.getMessages(202))[0]?.delivery).toBe("sent");
  const calls = h.request.mock.calls.length;
  await vi.advanceTimersByTimeAsync(120000);
  expect(h.request).toHaveBeenCalledTimes(calls);
});

it("recovers a failed inbox read without waiting for another message or tab switch", async () => {
  vi.useFakeTimers();
  const h = setup(); let reads = 0;
  h.request.mockImplementation(async (_method, path) => {
    if (path.includes("/inbox")) {
      if (++reads === 1) throw new CloudError("offline", 503);
      return { items: [{ id: "missed-hint", clientMessageId: crypto.randomUUID(), sequence: 1, sender: 202, recipient: 101, text: "Recovered", createdAt: Date.now() }], cursor: 1, nextCursor: null };
    }
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  await expect(h.direct.sync()).rejects.toThrow("offline");
  await vi.advanceTimersByTimeAsync(5000);
  expect((await h.chat.getMessages(202))[0]?.content).toBe("Recovered");
  expect(h.options.incoming).toHaveBeenCalledOnce();
});

it("resumes a pending Direct send after its access token is rejected without changing its ID", async () => {
  vi.useFakeTimers();
  const h = setup(); h.direct.destroy();
  const key = await createDeviceKey();
  key.device = { id: crypto.randomUUID(), expiresAt: Date.now() + 86400000 };
  const posts: unknown[] = [];
  let exchanges = 0;
  const sendProof = vi.fn();
  const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    let body: unknown;
    if (path === "/v1/auth/device-challenges") body = { challengeId: crypto.randomUUID(), nonce: "n".repeat(43), expiresAt: Date.now() + 60000 };
    else if (path === "/v1/auth/device-exchange") body = { memberNumber: 101, token: (++exchanges === 1 ? "a" : "b").repeat(43), expiresAt: Date.now() + 3600000, device: key.device };
    else if (path === "/v1/direct/202/messages") {
      posts.push(JSON.parse(String(init!.body)));
      if (posts.length === 1) return new Response(JSON.stringify({ error: "session_expired" }), { status: 401 });
      body = { id: "after-renewal", sequence: 1, state: "sent" };
    } else body = path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
    return new Response(JSON.stringify(body));
  });
  const client = new CloudClient({ origin: "https://cloud.example.test", memberNumber: 101, getMemberNumber: () => 101, isBlocked: () => false,
    sendProof, fetchImpl, pageOrigin: "https://bc.example.test", deviceStore: { load: async () => key, save: async () => {}, pause: async () => {} } });
  cleanup.push(() => client.destroy());
  await client.connect();
  const direct = new CloudDirect({ ...h.community, client } as CommunityService, h.chat, h.storage, h.options);
  cleanup.push(() => direct.destroy());
  await direct.send(202, "Friend", "Retry after authentication renewal");
  await vi.advanceTimersByTimeAsync(1000);
  await vi.waitFor(() => expect(posts).toHaveLength(2));
  expect(posts[1]).toEqual(posts[0]);
  expect(await h.chat.getMessages(202)).toHaveLength(1);
  expect((await h.chat.getMessages(202))[0]?.delivery).toBe("sent");
  expect(sendProof).not.toHaveBeenCalled();
  const calls = fetchImpl.mock.calls.length;
  await vi.advanceTimersByTimeAsync(120000);
  expect(fetchImpl).toHaveBeenCalledTimes(calls);
});

it.each(["denied", "destroyed", "stopped"])("does not retry a %s send", async mode => {
  vi.useFakeTimers();
  const h = setup();
  h.request.mockImplementation(async (method, path) => {
    if (method === "POST" && path.endsWith("/messages")) throw new CloudError("unavailable", mode === "denied" ? 403 : 503);
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  const message = await h.direct.send(202, "Friend", "Do not retry");
  await vi.advanceTimersByTimeAsync(0);
  if (mode === "destroyed") h.direct.destroy();
  if (mode === "stopped") await h.direct.stopRetrying(message.id);
  await vi.advanceTimersByTimeAsync(120000);
  expect(h.request.mock.calls.filter(([method, path]) => method === "POST" && path.endsWith("/messages"))).toHaveLength(1);
});
it("removes a queue entry if local capture fails before network transmission", async () => {
  const h = setup(); vi.spyOn(h.chat, "captureCloud").mockRejectedValue(new Error("disk full"));
  await expect(h.direct.send(202, "Friend", "Cannot save")).rejects.toThrow("has not been sent");
  await h.direct.sync(); expect(h.request.mock.calls.some(([method, path]) => method === "POST" && path.endsWith("messages"))).toBe(false); h.direct.destroy();
});
it("does not reject an accepted Direct send when its view observer throws", async () => {
  const h = setup();
  h.options.changed.mockImplementation(() => { throw new Error("view unavailable"); });
  h.request.mockImplementation(async (method, path) => method === "POST" && path.endsWith("/messages")
    ? { id: "accepted-despite-view", sequence: 1, state: "sent" }
    : path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null });
  const message = await h.direct.send(202, "Friend", "Accept exactly once");
  await h.direct.sync();
  expect((await h.chat.getMessages(202)).map(m => m.id)).toEqual([message.id]);
  expect((await h.chat.getMessages(202))[0]?.delivery).toBe("sent");
  const posts = h.request.mock.calls.filter(([method, path]) => method === "POST" && path.endsWith("/messages"));
  expect(posts).toHaveLength(1);
  expect(posts[0]![2]).toMatchObject({ clientMessageId: message.clientMessageId });
});
it("retains the accepted ID when both local capture and durable queue rollback fail", async () => {
  const h = setup();
  const setItem = h.storage.setItem.bind(h.storage);
  let queueWrites = 0;
  vi.spyOn(h.storage, "setItem").mockImplementation((key, value) => {
    if (key.includes("direct-queue") && ++queueWrites === 2) throw new Error("cannot remove queued message");
    setItem(key, value);
  });
  const capture = vi.spyOn(h.chat, "captureCloud").mockRejectedValue(new Error("chat storage unavailable"));
  const message = await h.direct.send(202, "Friend", "Already in the durable queue");
  expect(message.delivery).toBe("waiting");
  expect(h.direct.retryable(message.id)).toBe(true);
  expect(h.request.mock.calls.some(([method, path]) => method === "POST" && path.endsWith("/messages"))).toBe(false);
  h.direct.destroy(); capture.mockRestore();
  h.request.mockImplementation(async (method, path) => method === "POST" && path.endsWith("/messages")
    ? { id: "same-accepted-id", sequence: 1, state: "sent" }
    : path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null });
  const reopened = new CloudDirect(h.community, h.chat, h.storage, h.options);
  cleanup.push(() => reopened.destroy());
  await reopened.sync();
  expect((await h.chat.getMessages(202)).map(m => m.id)).toEqual([message.id]);
  const posts = h.request.mock.calls.filter(([method, path]) => method === "POST" && path.endsWith("/messages"));
  expect(posts).toHaveLength(1);
  expect(posts[0]![2]).toMatchObject({ clientMessageId: message.clientMessageId });
});
it("does not let concurrent sync transmit a send while initial capture can still roll back", async () => {
  const h = setup();
  let failCapture!: (error: Error) => void;
  vi.spyOn(h.chat, "captureCloud").mockImplementationOnce(() => new Promise((_resolve, reject) => { failCapture = reject; }));
  h.request.mockImplementation(async (method, path) => method === "POST" && path.endsWith("/messages")
    ? { id: "must-not-send", sequence: 1, state: "sent" }
    : path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null });
  const pending = h.direct.send(202, "Friend", "Capture has not committed");
  const rejected = expect(pending).rejects.toThrow("has not been sent");
  await h.direct.sync();
  expect(h.request.mock.calls.some(([method, path]) => method === "POST" && path.endsWith("/messages"))).toBe(false);
  failCapture(new Error("capture aborted")); await rejected;
  await h.direct.sync();
  expect(h.request.mock.calls.some(([method, path]) => method === "POST" && path.endsWith("/messages"))).toBe(false);
});
it("transmits once after a slow initial capture succeeds despite a concurrent sync", async () => {
  const h = setup();
  const capture = h.chat.captureCloud.bind(h.chat);
  let finishCapture!: () => void;
  vi.spyOn(h.chat, "captureCloud").mockImplementationOnce(async (...args) => {
    await new Promise<void>(resolve => { finishCapture = resolve; });
    return capture(...args);
  });
  h.request.mockImplementation(async (method, path) => method === "POST" && path.endsWith("/messages")
    ? { id: "captured-before-send", sequence: 1, state: "sent" }
    : path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null });
  const pending = h.direct.send(202, "Friend", "Wait for capture");
  await h.direct.sync();
  expect(h.request.mock.calls.some(([method, path]) => method === "POST" && path.endsWith("/messages"))).toBe(false);
  finishCapture(); const message = await pending;
  await h.direct.sync();
  expect((await h.chat.getMessages(202)).map(m => m.id)).toEqual([message.id]);
  expect(h.request.mock.calls.filter(([method, path]) => method === "POST" && path.endsWith("/messages"))).toHaveLength(1);
});
it("acknowledges captured inbox messages even when view and notification observers throw", async () => {
  const h = setup();
  h.options.changed.mockImplementation(() => { throw new Error("view unavailable"); });
  h.options.incoming.mockImplementation(() => { throw new Error("notifications unavailable"); });
  h.request.mockImplementation(async (_method, path) => {
    if (path.includes("/inbox")) return { items: path.endsWith("cursor=0")
      ? [{ id: "received-despite-view", clientMessageId: crypto.randomUUID(), sequence: 1, sender: 202, recipient: 101, text: "Durably received", createdAt: Date.now() }]
      : [], cursor: 1, nextCursor: null };
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  await h.direct.sync(); await h.direct.sync();
  expect(await h.chat.getMessages(202)).toHaveLength(1);
  expect(h.options.incoming).toHaveBeenCalledOnce();
  expect(h.request.mock.calls.filter(([method, path]) => method === "POST" && path.endsWith("/acknowledge"))).toHaveLength(1);
});
it("reconciles read markers without writing ephemeral message bodies to history", async () => {
  const h = setup(); h.settings.update(draft => { draft.linkChat.saveHistory = false; });
  await h.chat.captureCloud({ direction: "incoming", peerNumber: 202, peerName: "Friend", content: "Ephemeral", sentAt: Date.now(), includeRoom: false }, { id: "cloud-in:x", cloudSequence: 4 }, false);
  const write = vi.spyOn(h.repository, "addMessage"); await h.chat.reconcileCloudRead(202, 4);
  expect(write).not.toHaveBeenCalled(); expect((await h.chat.getConversation(202))?.unread).toBe(0); h.direct.destroy();
});
it("batches catch-up read cursors and retains failed writes for reconnect", async () => {
  const h = setup(); h.options.active = () => true; let first = true, fail = true;
  h.request.mockImplementation(async (method, path, body) => {
    if (path.includes('/inbox')) { const items = first ? Array.from({length:40}, (_, i) => ({ id:`received-${i}`, clientMessageId:crypto.randomUUID(), sequence:i+1, sender:202, recipient:101, text:`Message ${i}`, createdAt:Date.now() })) : []; first = false; return {items,cursor:40,nextCursor:null}; }
    if (method === 'PUT' && path === '/v1/read-cursors') { expect(body).toEqual({items:[{scope:'direct:202',cursor:40}]}); if (fail) throw new CloudError('offline'); return {}; }
    return path === '/v1/read-cursors' ? {items:[]} : {items:[],cursor:0,nextCursor:null};
  });
  await expect(h.direct.sync()).rejects.toThrow(); expect(h.request.mock.calls.filter(([method]) => method === 'PUT')).toHaveLength(1);
  h.direct.destroy(); fail = false;
  const reopened = new CloudDirect(h.community,h.chat,h.storage,h.options); await reopened.sync();
  expect(h.request.mock.calls.filter(([method]) => method === 'PUT')).toHaveLength(2); expect((await h.chat.getConversation(202))?.unread).toBe(0); reopened.destroy();
});
it("history deletion stops pending local retries without promising recall from the server", async () => {
  const h = setup(); h.request.mockImplementation(async (method,path) => { if(method === 'POST' && path.endsWith('messages')) throw new CloudError('offline'); return path === '/v1/read-cursors' ? {items:[]} : {items:[],cursor:0,nextCursor:null}; });
  const message = await h.direct.send(202,'Friend','Queued'); await vi.waitFor(async () => expect((await h.chat.getMessages(202))[0]?.deliveryError).toContain('Not confirmed'));
  h.direct.clearPending(); await h.chat.clearHistory(); h.request.mockClear(); await h.direct.sync();
  expect(h.direct.retryable(message.id)).toBe(false); expect(await h.chat.getMessages(202)).toHaveLength(0);
  expect(h.request.mock.calls.some(([method,path]) => method === 'POST' && path.endsWith('messages'))).toBe(false); h.direct.destroy();
});

it("does not lose a delivery event arriving while catch-up is already in flight", async () => {
  const h = setup(); let sentHint = false, inboxReads = 0;
  h.request.mockImplementation(async (_method, path) => {
    if (path.includes('/inbox')) { inboxReads++; return { items: inboxReads === 2 ? [{ id:'during-sync', clientMessageId:crypto.randomUUID(), sequence:1, sender:202, recipient:101, text:'Arrived during refresh', createdAt:Date.now() }] : [], cursor:inboxReads === 1 ? 0 : 1, nextCursor:null }; }
    if (path.includes('/receipts') && !sentHint) { sentHint = true; h.hint('direct'); }
    return path === '/v1/read-cursors' ? {items:[]} : {items:[],cursor:0,nextCursor:null};
  });
  await h.direct.sync(); expect(inboxReads).toBe(2); expect((await h.chat.getMessages(202))[0]?.content).toBe('Arrived during refresh'); h.direct.destroy();
});

it("reconciles a read receipt that arrives before the send response", async () => {
  const h = setup(); let finish!: (value: unknown) => void;
  h.request.mockImplementation(async (method, path) => {
    if (method === "POST" && path.endsWith("/messages")) return new Promise(resolve => { finish = resolve; });
    if (path.includes("/receipts")) return { items: [{ messageId: "fast-read", recipient: 202, state: "read" }], cursor: 1, nextCursor: null };
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  await h.direct.send(202, "Friend", "Fast recipient");
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  const sync = h.direct.sync();
  // Let the inbox and receipt requests race the still-unresolved send.
  await new Promise(resolve => setTimeout(resolve, 10));
  finish({ id: "fast-read", sequence: 1, state: "sent" });
  await sync;
  await vi.waitFor(async () => expect((await h.chat.getMessages(202))[0]?.delivery).toBe("read"));
  h.direct.destroy();
});

it("replays an ambiguous send before consuming its offline receipts", async () => {
  const h = setup(); let available = false;
  h.request.mockImplementation(async (method, path) => {
    if (method === "POST" && path.endsWith("/messages")) {
      if (!available) throw new CloudError("network_unavailable");
      return { id: "offline-read", sequence: 1, state: "delivered" };
    }
    if (path.includes("/receipts")) return { items: [{ messageId: "offline-read", recipient: 202, state: "read" }], cursor: 1, nextCursor: null };
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  await h.direct.send(202, "Friend", "Accepted before the connection broke");
  await vi.waitFor(async () => expect((await h.chat.getMessages(202))[0]?.deliveryError).toContain("Not confirmed"));
  available = true;
  await h.direct.sync();
  expect((await h.chat.getMessages(202))[0]?.delivery).toBe("read");
  h.direct.destroy();
});

it("patches an identified read receipt while an unrelated outgoing POST is still pending", async () => {
  const h = setup();
  h.community.relationships.set(303, { ...h.community.relationships.get(202)! });
  await h.chat.captureCloud({ direction: "outgoing", peerNumber: 202, peerName: "Friend", content: "Already delivered",
    sentAt: Date.now(), includeRoom: false }, { id: "known-local", cloudId: "known-server", cloudSequence: 1, delivery: "delivered" }, false);
  let finish!: (value: unknown) => void;
  h.request.mockImplementation(async (method, path) => {
    if (method === "POST" && path.endsWith("/messages")) return new Promise(resolve => { finish = resolve; });
    if (path.includes("/receipts")) return { items: [{ messageId: "known-server", recipient: 202, state: "read" }], cursor: 1, nextCursor: null };
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  await h.direct.send(303, "Other friend", "Slow send");
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  const sync = h.direct.sync();
  try {
    await vi.waitFor(async () => expect((await h.chat.getMessages(202))[0]?.delivery).toBe("read"));
    expect(h.options.changed).toHaveBeenCalledWith(202, expect.objectContaining({ delivery: "read" }));
  } finally {
    finish({ id: "slow-server", sequence: 2, state: "sent" }); await sync;
  }
});

it("handles a read hint promptly while an earlier inbox request is still pending", async () => {
  const h = setup();
  await h.chat.captureCloud({ direction: "outgoing", peerNumber: 202, peerName: "Friend", content: "Already delivered",
    sentAt: Date.now(), includeRoom: false }, { id: "known-local", cloudId: "known-server", cloudSequence: 1, delivery: "delivered" }, false);
  let read = false, finishInbox!: (value: unknown) => void;
  h.request.mockImplementation(async (_method, path) => {
    if (path.includes("/inbox") && !finishInbox) return new Promise(resolve => { finishInbox = resolve; });
    if (path.includes("/receipts")) return { items: read ? [{ messageId: "known-server", recipient: 202, state: "read" }] : [], cursor: read ? 1 : 0, nextCursor: null };
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  const sync = h.direct.sync();
  await vi.waitFor(() => expect(finishInbox).toBeTypeOf("function"));
  read = true; h.hint("direct");
  try {
    await vi.waitFor(async () => expect((await h.chat.getMessages(202))[0]?.delivery).toBe("read"));
  } finally {
    finishInbox({ items: [], cursor: 0, nextCursor: null }); await sync;
  }
});

it("bounds read batching latency during a continuous stream of visible messages", async () => {
  vi.useFakeTimers();
  const h = setup();
  const receive = async (sequence: number) => h.chat.captureCloud({ direction: "incoming", peerNumber: 202, peerName: "Friend",
    content: `Visible ${sequence}`, sentAt: Date.now(), includeRoom: false }, { id: `visible-${sequence}`, cloudSequence: sequence }, true);
  await receive(1); await vi.advanceTimersByTimeAsync(100);
  await receive(2); await vi.advanceTimersByTimeAsync(100);
  expect(h.request).toHaveBeenCalledWith("PUT", "/v1/read-cursors", { items: [{ scope: "direct:202", cursor: 2 }] });
  await receive(3); await vi.advanceTimersByTimeAsync(200);
  expect(h.request).toHaveBeenCalledWith("PUT", "/v1/read-cursors", { items: [{ scope: "direct:202", cursor: 3 }] });
});

it("keeps a racing receipt follow-up behind server backoff and retains retry across inbox completion", async () => {
  vi.useFakeTimers();
  const h = setup();
  let receiptReads = 0, finishInbox!: (value: unknown) => void, failReceipt!: (reason: unknown) => void;
  h.request.mockImplementation(async (_method, path) => {
    if (path.includes("/inbox") && !finishInbox) return new Promise(resolve => { finishInbox = resolve; });
    if (path.includes("/receipts")) {
      if (++receiptReads === 2) return new Promise((_resolve, reject) => { failReceipt = reject; });
      return { items: [], cursor: 0, nextCursor: null };
    }
    return path === "/v1/read-cursors" ? { items: [] } : { items: [], cursor: 0, nextCursor: null };
  });
  const sync = h.direct.sync(); await vi.advanceTimersByTimeAsync(0);
  h.hint("direct"); await vi.advanceTimersByTimeAsync(0);
  h.hint("direct"); // This races the pending receipt response and asks for a bounded follow-up.
  failReceipt(new CloudError("rate_limited", 429, 45000));
  await vi.advanceTimersByTimeAsync(0);
  const callsBeforeInboxCompletes = h.request.mock.calls.length;
  finishInbox({ items: [], cursor: 0, nextCursor: null }); await sync;
  expect(receiptReads).toBe(2);
  expect(h.request).toHaveBeenCalledTimes(callsBeforeInboxCompletes);
  await vi.advanceTimersByTimeAsync(44999);
  expect(receiptReads).toBe(2);
  expect(h.request).toHaveBeenCalledTimes(callsBeforeInboxCompletes);
  await vi.advanceTimersByTimeAsync(1); expect(receiptReads).toBe(3);
});
