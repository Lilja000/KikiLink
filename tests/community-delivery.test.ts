// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { CloudDirect } from "../src/cloud/direct";
import { CloudError } from "../src/cloud/client";
import { directReceiptState, messageReceiptIndicator, updateMessageReceipt } from "../src/modules/link-chat/message-receipt";
import type { CommunityService } from "../src/cloud/community";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";

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
  return { repository, settings, chat, request, community, options, direct, storage, hint: (kind: string) => eventListener(kind) };
}
it("keeps an ambiguous send unchecked, shows one check on confirmed retry after restart and waits for Read", async () => {
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
  expect(indicator.dataset.state).toBe("sent");
  expect(indicator.title).toBe("Sent to Cloud");
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
  await expect(h.direct.sync()).rejects.toThrow("offline"); failAck = false; await h.direct.sync();
  expect(await h.chat.getMessages(202)).toHaveLength(1); expect((await h.chat.getConversation(202))?.unread).toBe(1);
  h.direct.destroy();
});
it("removes a queue entry if local capture fails before network transmission", async () => {
  const h = setup(); vi.spyOn(h.chat, "captureCloud").mockRejectedValue(new Error("disk full"));
  await expect(h.direct.send(202, "Friend", "Cannot save")).rejects.toThrow("has not been sent");
  await h.direct.sync(); expect(h.request.mock.calls.some(([method, path]) => method === "POST" && path.endsWith("messages"))).toBe(false); h.direct.destroy();
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
