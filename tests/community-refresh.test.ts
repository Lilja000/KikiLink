// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { CommunityService } from "../src/cloud/community";
import type { CloudClient } from "../src/cloud/client";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage } from "../src/core/settings";

const dispose: Array<() => void> = [];
afterEach(() => { dispose.splice(0).forEach(fn => fn()); vi.restoreAllMocks(); });
function setup(completeMailbox = false) {
  let hint!: (kind: string) => void;
  const state = { community: true, unread: 0, failMe: false, failMail: false, failRelationships: false };
  const request = vi.fn(async (_method: string, path: string): Promise<unknown> => {
    if (path === "/v1/me") { if (state.failMe) throw new Error("offline"); return { features: { community: state.community } }; }
    if (path === "/v1/feed/unread") return { unread: state.unread, latest: 20 };
    if (path.startsWith("/v1/mailbox")) { if (state.failMail) throw new Error("mailbox unavailable"); return { items: [], unread: 0, nextCursor: null }; }
    if (path.startsWith("/v1/relationships?")) { if (state.failRelationships) throw new Error("relationships unavailable"); return { items: [], nextCursor: null }; }
    return {};
  });
  const release = vi.fn();
  const client = { connected: false, memberNumber: 101, request,
    subscribe: (fn: typeof hint) => { hint = fn; return vi.fn(); }, retainEvents: () => release };
  const service = new CommunityService(client as unknown as CloudClient,
    { ownFriends: () => [] } as unknown as BCAdapter, new MemoryKeyValueStorage(), { completeMailbox });
  dispose.push(() => service.destroy());
  client.connected = true;
  return { state, client, request, service, hint: (kind: string) => hint(kind), release };
}
it.each([{generation:'bad',restored:true},{generation:'a'.repeat(32),restored:'yes'}])('rejects invalid recovery metadata before enabling Direct: %j',async recovery=>{
  const h=setup();h.request.mockResolvedValue({features:{community:true},directRecovery:recovery});await h.service.start();
  expect(h.service.supported).toBe(false);expect(h.service.directEnabled).toBe(false);expect(h.service.directRecovery).toBeUndefined();
  expect(h.request.mock.calls.every(([,path])=>path==='/v1/me')).toBe(true);
});
it("restores Feed unread after online and foreground events without an SSE hint", async () => {
  const h = setup(); await h.service.start();
  h.state.unread = 3; window.dispatchEvent(new Event("online"));
  await vi.waitFor(() => expect(h.service.feedUnread).toBe(3));
  h.state.unread = 5; document.dispatchEvent(new Event("visibilitychange"));
  await vi.waitFor(() => expect(h.service.feedUnread).toBe(5));
  expect(h.request.mock.calls.some(([, path]) => path === "/v1/read-cursors/feed")).toBe(false);
  h.service.destroy(); h.request.mockClear(); window.dispatchEvent(new Event("online"));
  expect(h.request).not.toHaveBeenCalled();
});
it.each(["failMail", "failRelationships"] as const)("does not lose the Feed counter if %s fails", async failure => {
  const h = setup(); await h.service.start();
  h.state[failure] = true; h.state.unread = 4;
  await expect(h.service.refresh()).rejects.toThrow();
  expect(h.service.feedUnread).toBe(4);
  expect(h.service.error).not.toBe("");
});
it("retries a failed bootstrap when connectivity returns", async () => {
  const h = setup(); h.state.failMe = true; await h.service.start();
  expect(h.service.supported).toBe(false);
  h.state.failMe = false; h.state.unread = 2; window.dispatchEvent(new Event("online"));
  await vi.waitFor(() => expect(h.service.feedUnread).toBe(2));
  expect(h.service.directEnabled).toBe(true);
});
it("does not bypass an explicitly disabled Community feature", async () => {
  const h = setup(); h.state.community = false; await h.service.start();
  expect(h.service.supported).toBe(false); expect(h.service.directEnabled).toBe(false);
  expect(h.service.error).toContain("disabled");
  window.dispatchEvent(new Event("online")); h.hint("ready");
  expect(h.request.mock.calls.every(([, path]) => path === "/v1/me")).toBe(true);
});
it("clears account-specific counters and capability flags on logout", async () => {
  const h = setup(); h.state.unread = 3; await h.service.start();
  h.client.connected = false; h.hint("session");
  expect(h.service.feedUnread).toBe(0); expect(h.service.feedLatest).toBe(0);
  expect(h.service.directEnabled).toBe(false); expect(h.release).toHaveBeenCalledOnce();
});

it("does not let an older unread fetch restore the Feed badge after a read acknowledgement", async () => {
  const h = setup(); h.state.unread = 4; await h.service.start();
  let resolve!: (value: unknown) => void;
  h.request.mockImplementationOnce(async () => ({ items: [], nextCursor: null }));
  h.request.mockImplementationOnce(async () => ({ items: [], unread: 0, nextCursor: null }));
  h.request.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const observed: number[] = [];
  h.service.subscribe(() => observed.push(h.service.feedUnread));
  const old = h.service.refresh();
  h.state.unread = 0;
  const read = h.service.readFeed(20);
  await Promise.resolve();
  resolve({ unread: 4, latest: 20 });
  await Promise.all([old, read]);
  expect(h.service.feedUnread).toBe(0);
  expect(observed.slice(observed.indexOf(0))).not.toContain(4);
  expect(h.request.mock.calls.filter(([method, path]) => method === "GET" && path === "/v1/feed/unread")).toHaveLength(3);
});

it("mark-all uses the latest server post rather than a stale displayed count, and reports failures", async () => {
  const h = setup(); await h.service.start();
  h.service.feedLatest = 5;
  await h.service.markAllFeedRead();
  expect(h.request).toHaveBeenCalledWith("PUT", "/v1/read-cursors/feed", { cursor: 20 });
  h.client.connected = false;
  await expect(h.service.markAllFeedRead()).rejects.toThrow("not connected");
});

it("loads beyond the former 400-row cutoff before committing a complete relationship snapshot", async () => {
  const h = setup();
  const base = h.request.getMockImplementation()!;
  h.request.mockImplementation(async (method, path) => {
    if (!path.startsWith('/v1/relationships?')) return base(method, path);
    const cursor = Number(new URL(path, 'https://fixture.invalid').searchParams.get('cursor'));
    return { items: [{ memberNumber: cursor + 1, state: 'received' }], nextCursor: cursor < 440 ? cursor + 40 : null };
  });
  await h.service.start();
  expect(h.service.relationships.size).toBe(12); expect(h.service.relationships.has(441)).toBe(true);
  expect(h.service.relationshipsLoaded).toBe(true); expect(h.service.relationshipsLoading).toBe(false);
});
it("keeps the previous snapshot on broken pagination and clears the error after retry", async () => {
  const h = setup(); await h.service.start();
  h.service.relationships.set(202, { memberNumber: 202, state: 'received' } as any);
  const base = h.request.getMockImplementation()!;
  h.request.mockImplementation(async (method, path) => path.startsWith('/v1/relationships?') ? { items: [], nextCursor: 0 } : base(method, path));
  await expect(h.service.refresh()).rejects.toThrow('pagination');
  expect(h.service.relationships.has(202)).toBe(true); expect(h.service.relationshipsError).toContain('Try again');
  h.request.mockImplementation(base); await h.service.refresh();
  expect(h.service.relationships.size).toBe(0); expect(h.service.relationshipsError).toBe('');
});
it("does not repopulate a cleared session from an older relationship refresh", async () => {
  const h = setup(); await h.service.start();
  let finish!: (value: unknown) => void; const base = h.request.getMockImplementation()!;
  h.request.mockImplementation(async (method, path) => path.startsWith('/v1/relationships?') ? new Promise(done => { finish = done; }) : base(method, path));
  const refreshing = h.service.refresh();
  h.client.connected = false; h.hint('session');
  finish({ items: [{ memberNumber: 202, state: 'received' }], nextCursor: null }); await refreshing;
  expect(h.service.relationships.size).toBe(0); expect(h.service.relationshipsLoaded).toBe(false);
  expect(h.service.relationshipsError).toBe(''); expect(h.service.relationshipsLoading).toBe(false);
});
it("does not restore a pending request from a snapshot started before a confirmed decline", async () => {
  const h = setup(); await h.service.start();
  const base = h.request.getMockImplementation()!;
  const pending = { memberNumber: 202, state: 'received', supported: true };
  h.service.relationships.set(202, pending as any);
  let finish!: (value: unknown) => void, first = true;
  h.request.mockImplementation(async (method, path) => {
    if (path.startsWith('/v1/relationships?') && first) { first = false; return new Promise(done => { finish = done; }); }
    if (path === '/v1/relationships/202/decline') return { ...pending, state: 'declined' };
    return base(method, path);
  });
  const refreshing = h.service.refresh(), action = h.service.action(202, 'decline');
  await vi.waitFor(() => expect(h.service.relationships.get(202)?.state).toBe('declined'));
  const seen: string[] = []; h.service.subscribe(() => { const state = h.service.relationships.get(202)?.state; if (state) seen.push(state); });
  finish({ items: [pending], nextCursor: null }); await Promise.all([refreshing, action]);
  await vi.waitFor(() => expect(h.service.relationships.size).toBe(0));
  expect(seen).not.toContain('received');
});

it("loads all 500 mailbox rows atomically, reuses unchanged pages and invalidates them on an SSE hint", async () => {
  const h = setup(true), base = h.request.getMockImplementation()!;
  let olderRead = false;
  h.request.mockImplementation(async (method, path) => {
    if (!path.startsWith('/v1/mailbox?')) return base(method, path);
    const cursor = Number(new URL(path, 'https://fixture.invalid').searchParams.get('cursor')) || 501;
    const ids = Array.from({ length: Math.min(40, cursor - 1) }, (_, i) => cursor - 1 - i);
    return { items: ids.map(id => ({ id, read: id === 1 ? olderRead : id === 2 ? !olderRead : false })), unread: 499, nextCursor: ids.at(-1)! > 1 ? ids.at(-1) : null };
  });
  await h.service.start(); expect(h.service.mailbox.items).toHaveLength(500); expect(h.service.mailbox.unread).toBe(499);
  const pages = () => h.request.mock.calls.filter(([, path]) => path.startsWith('/v1/mailbox?')).length;
  expect(pages()).toBe(13);
  await h.service.refresh(false); expect(pages()).toBe(14);
  olderRead = true; h.hint('mailbox');
  await vi.waitFor(() => expect(h.service.mailbox.items.find(item => item.id === 1)?.read).toBe(true));
  expect(pages()).toBe(27); expect(h.service.mailbox.unread).toBe(499);
});

it("keeps the complete mailbox snapshot if a later page fails", async () => {
  const h = setup(true); await h.service.start();
  const old = h.service.mailbox;
  const base = h.request.getMockImplementation()!;
  h.request.mockImplementation(async (method, path) => {
    if (path.includes('mailbox?limit=40&cursor=')) throw new Error('page unavailable');
    if (path.startsWith('/v1/mailbox?')) return { items: [{ id: 100, read: false }], unread: 2, nextCursor: 100 };
    return base(method, path);
  });
  await expect(h.service.refresh()).rejects.toThrow('page unavailable'); expect(h.service.mailbox).toBe(old);
});

it("does not resurrect read mail from an older refresh, and ignores pagination after logout", async () => {
  const h = setup(true); await h.service.start();
  h.service.mailbox = { items: [{ id: 1, read: false } as any], unread: 1, nextCursor: null };
  let finish!: (value: unknown) => void; let first = true; const base = h.request.getMockImplementation()!;
  h.request.mockImplementation(async (method, path) => {
    if (path.startsWith('/v1/mailbox?') && first) { first = false; return new Promise(done => { finish = done; }); }
    return base(method, path);
  });
  const old = h.service.refresh(), reading = h.service.readMail(1);
  await vi.waitFor(() => expect(h.service.mailbox.unread).toBe(0));
  const counts: number[] = []; h.service.subscribe(() => counts.push(h.service.mailbox.unread));
  finish({ items: [{ id: 1, read: false }], unread: 1, nextCursor: null }); await Promise.all([old, reading]);
  expect(counts).not.toContain(1);
  first = true; const late = h.service.refresh(); h.client.connected = false; h.hint('session');
  finish({ items: [{ id: 2, read: false }], unread: 1, nextCursor: null }); await late;
  expect(h.service.mailbox.items).toEqual([]); expect(h.service.mailboxLoaded).toBe(false);
});

it("marks only the captured Feed notifications and leaves invitations and new arrivals alone", async () => {
  const h = setup(true); await h.service.start();
  h.service.mailbox.items = [{ id: 1, targetType: 'post', read: false }, { id: 2, targetType: 'comment', read: false }, { id: 3, targetType: 'profile', read: false }] as any;
  await h.service.readFeedMail();
  expect(h.request.mock.calls.filter(([method, path]) => method === 'POST' && path === '/v1/mailbox/read')).toHaveLength(2);
  expect(h.request).toHaveBeenCalledWith('POST', '/v1/mailbox/read', { id: 1 });
  expect(h.request).toHaveBeenCalledWith('POST', '/v1/mailbox/read', { id: 2 });
});
