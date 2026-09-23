// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { CommunityService } from "../src/cloud/community";
import type { CloudClient } from "../src/cloud/client";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage } from "../src/core/settings";

const dispose: Array<() => void> = [];
afterEach(() => { dispose.splice(0).forEach(fn => fn()); vi.restoreAllMocks(); });
function setup() {
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
    { ownFriends: () => [] } as unknown as BCAdapter, new MemoryKeyValueStorage());
  dispose.push(() => service.destroy());
  client.connected = true;
  return { state, client, request, service, hint: (kind: string) => hint(kind), release };
}
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
