// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { CloudGroupInbox } from "../src/cloud/group-inbox";
import { SocialUI } from "../src/cloud/social-ui";
import type { CloudClient } from "../src/cloud/client";
import type { CloudGroup, CloudMessage } from "../src/cloud/types";
import { MemoryKeyValueStorage } from "../src/core/settings";

const group = (id: string): CloudGroup => ({ id, title: `Group ${id}`, owner: 101, conversationId: id, revision: 1,
  membershipVersion: 1, keyVersion: 1, createdAt: 1, legacyId: null, members: [{ memberNumber: 101, status: "active", role: "owner" }] });
const message = (sequence: number, sender = 202): CloudMessage => ({ id: `m${sequence}`, conversationId: "g", sequence,
  sender, text: `Message ${sequence}`, createdAt: sequence * 100, deletedAt: null, clientId: `c${sequence}`,
  encryption: "server-aes-256-gcm", schemaVersion: 1, membershipVersion: 1, keyVersion: 1 });
function setup(handler: (method: string, path: string) => Promise<unknown>, storage = new MemoryKeyValueStorage(), member = 101) {
  let connected = true;
  const client = { memberNumber: member, get connected() { return connected; }, request: vi.fn(handler), subscribe: () => () => {} } as unknown as CloudClient;
  const ui = new SocialUI({ client, run: async action => { await action(); }, image: () => document.createElement("div"), openProfile: vi.fn(), isBlocked: n => n === 303 });
  const select = vi.fn(), changed = vi.fn();
  const inbox = new CloudGroupInbox(client, ui, storage, { select, changed, inviteChanged: async () => {} });
  return { inbox, client, select, changed, disconnect: () => { connected = false; inbox.clear(); } };
}
it("pins and mutes through contextual actions, persists per account, and keeps unread groups visible", async () => {
  const storage = new MemoryKeyValueStorage();
  let groups = [{ ...group("a"), lastMessage: message(1), lastIncomingSequence: 1 }, { ...group("b"), lastMessage: message(5), lastIncomingSequence: 5 }];
  const handler = async (_method: string, path: string) => path === "/v1/groups" ? { items: structuredClone(groups) } : { items: [] };
  const { inbox, select } = setup(handler, storage); const incoming = vi.fn(); inbox.options.incoming = incoming;
  document.body.append(inbox.element);
  try {
    await inbox.refresh(); expect(incoming).not.toHaveBeenCalled();
    const row = inbox.element.querySelector<HTMLElement>('[data-group-id="a"]')!;
    row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    const menu = inbox.element.querySelector<HTMLDialogElement>("dialog")!; expect(menu.open).toBe(true);
    menu.querySelector<HTMLButtonElement>('[aria-label="Pin group"]')!.click();
    expect(inbox.element.querySelector<HTMLElement>("[data-group-id]")!.dataset.groupId).toBe("a");
    vi.useFakeTimers();
    row.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", button: 0, bubbles: true }));
    vi.advanceTimersByTime(550); expect(menu.open).toBe(true); row.click(); expect(select).not.toHaveBeenCalled();
    menu.querySelector<HTMLButtonElement>('[aria-label="Mute group"]')!.click(); expect(inbox.isMuted("a")).toBe(true);
    vi.useRealTimers();
    groups = groups.map(g => ({ ...g, lastMessage: message(g.id === "a" ? 7 : 8), lastIncomingSequence: 8 }));
    await inbox.refresh(true); expect(incoming).toHaveBeenCalledTimes(1); expect(incoming.mock.calls[0]![0].id).toBe("b");
    inbox.unreadOnly(true); expect(inbox.element.querySelector('[data-group-id="a"]')).not.toBeNull();
    const same = setup(handler, storage).inbox, other = setup(handler, storage, 202).inbox;
    expect(same.isPinned("a")).toBe(true); expect(same.isMuted("a")).toBe(true); expect(other.isMuted("a")).toBe(false);
    same.destroy(); other.destroy();
    row.dispatchEvent(new KeyboardEvent("keydown", { key: "F10", shiftKey: true, bubbles: true }));
    expect(menu.querySelector('[aria-label="Unmute group"]')).not.toBeNull();
  } finally { vi.useRealTimers(); inbox.destroy(); inbox.element.remove(); }
});
describe("Cloud inbox state and bounded requests", () => {
  it("keeps the loaded avatar node through typing, read and pin changes", async () => {
    const { inbox } = setup(async (_method, path) => path === "/v1/groups"
      ? { items: [{ ...group("g"), avatarId: "avatar", lastMessage: message(1), lastIncomingSequence: 1 }] } : { items: [] });
    try {
      await inbox.refresh();
      const row = inbox.element.querySelector('[data-group-id="g"]')!;
      const avatar = row.querySelector(".kl-group-inbox-avatar");
      for (let i = 0; i < 30; i++) inbox.draft("g", `Draft ${i}`);
      inbox.markRead("g", 1); inbox.togglePinned("g");
      expect(row.querySelector(".kl-group-inbox-avatar")).toBe(avatar);
    } finally { inbox.destroy(); }
  });
  it("reads only the first page of previews and loads the next groups on demand", async () => {
    const { inbox, client } = setup(async (_m, path) => path === "/v1/groups" ? { items: Array.from({ length: 23 }, (_, i) => group(String(i))) }
      : path === "/v1/group-invitations" ? { items: [] } : { items: [message(1)], nextCursor: null });
    await inbox.refresh();
    expect(inbox.element.querySelectorAll(".kl-cloud-group-row")).toHaveLength(20);
    expect(vi.mocked(client.request).mock.calls.filter(call => call[1].includes("/messages?"))).toHaveLength(20);
    const more = [...inbox.element.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.includes("Load more groups"))!;
    more.click(); await vi.waitFor(() => expect(inbox.element.querySelectorAll(".kl-cloud-group-row")).toHaveLength(23));
    await inbox.refresh();
    expect(vi.mocked(client.request).mock.calls.filter(call => call[1].includes("/messages?"))).toHaveLength(23);
    inbox.destroy();
  });
  it("coalesces refreshes, limits preview concurrency and does not refetch on search or selection", async () => {
    let active = 0, peak = 0;
    const { inbox, client, select } = setup(async (_m, path) => {
      if (path === "/v1/groups") return { items: [group("a"), group("b"), group("c")] };
      if (path === "/v1/group-invitations") return { items: [] };
      active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 5)); active--;
      return { items: [message(1)], nextCursor: null };
    });
    await Promise.all([inbox.refresh(), inbox.refresh(), inbox.refresh()]);
    expect(client.request).toHaveBeenCalledTimes(5); expect(peak).toBeLessThanOrEqual(2);
    const row = inbox.element.querySelector<HTMLButtonElement>('[data-group-id="a"]')!;
    inbox.search("Group a"); inbox.select("a"); inbox.draft("a", "My draft"); await inbox.refresh();
    expect(client.request).toHaveBeenCalledTimes(5); expect(inbox.element.querySelector('[data-group-id="a"]')).toBe(row);
    expect(row.textContent).toContain("Draft · My draft"); row.click(); expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
    inbox.destroy();
  });
  it("tracks unread by received sequence, preserves account-local cursors and never stores message text", async () => {
    const storage = new MemoryKeyValueStorage();
    const handler = async (_m: string, path: string) => path === "/v1/groups" ? { items: [group("g")] } : { items: [] };
    const { inbox } = setup(handler, storage); await inbox.refresh();
    inbox.observe("g", [message(1), message(2, 101), message(3, 303)]);
    expect(inbox.unreadGroups).toBe(1);
    inbox.markRead("g", 1); expect(inbox.unreadGroups).toBe(0);
    inbox.observe("g", [message(4)]); expect(inbox.unreadGroups).toBe(1);
    inbox.markRead("g", 4);
    expect(storage.getItem("kikilink:cloud:group-reads:101:v1")).toBe('{"g":4}');
    const same = setup(handler, storage).inbox; await same.refresh(); same.observe("g", [message(4)]); expect(same.unreadGroups).toBe(0);
    const other = setup(handler, storage, 909).inbox; await other.refresh(); other.observe("g", [message(4)]); expect(other.unreadGroups).toBe(1);
    inbox.destroy(); same.destroy(); other.destroy();
  });
  it("removes revoked groups and ignores an in-flight response after disconnect", async () => {
    let groups = [group("g")]; let complete!: (value: unknown) => void;
    let delayed = false;
    const { inbox, disconnect } = setup(async (_m, path) => path === "/v1/groups" ? delayed ? new Promise(resolve => { complete = resolve; }) : { items: groups } : { items: [] });
    await inbox.refresh(); inbox.observe("g", [message(1)]); expect(inbox.unreadGroups).toBe(1);
    groups = []; await inbox.refresh(true); expect(inbox.unreadGroups).toBe(0); expect(inbox.element.querySelector(".kl-cloud-group-row")).toBeNull();
    delayed = true; const load = inbox.refresh(true); await Promise.resolve(); disconnect();
    complete({ items: [group("private")] }); await load;
    expect(inbox.groups).toEqual([]); expect(inbox.element.textContent).not.toContain("private"); inbox.destroy();
  });
});

it("uses all group summaries for Unread, hides blocked senders and marks even unrendered groups read", async () => {
  const groups = Array.from({length:25},(_,i)=>({...group(String(i)),lastMessage:message(i+1),lastIncomingSequence:i+1,incomingSequences:[{memberNumber:i===0?303:202,sequence:i+1}]}));
  const {inbox,client}=setup(async(_method,path)=>path==="/v1/groups"?{items:groups}:{items:[]});
  await inbox.refresh();inbox.unreadOnly(true);
  expect(inbox.unreadGroups).toBe(24);expect(inbox.element.querySelectorAll(".kl-cloud-group-row")).toHaveLength(20);
  expect(vi.mocked(client.request).mock.calls.some(c=>c[1].includes("messages"))).toBe(false);
  await inbox.markAllRead();expect(inbox.unreadGroups).toBe(0);expect(inbox.element.querySelectorAll(".kl-cloud-group-row")).toHaveLength(0);inbox.destroy();
});
