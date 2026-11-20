// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { CloudGroupInbox } from "../src/cloud/group-inbox";
import { SocialUI } from "../src/cloud/social-ui";
import type { CloudClient } from "../src/cloud/client";
import { CloudError } from "../src/cloud/client";
import type { CloudGroup, CloudMessage } from "../src/cloud/types";
import { MemoryKeyValueStorage } from "../src/core/settings";
import type { MailItem } from "../src/cloud/community";

it("keeps a failed group read cursor for retry and reports failure to explicit mark-all", async () => {
  let fail = true;
  const writes: unknown[] = [];
  const h = setup(async (method, path, body) => {
    if (path === '/v1/groups') return { items: [{ ...group('g'), lastMessage: message(4), lastIncomingSequence: 4, unreadMessages: 4, readCursor: 0 }] };
    if (method === 'PUT' && path === '/v1/read-cursors') { writes.push(body); if (fail) throw new Error('offline'); return {}; }
    return { items: [] };
  });
  await expect(h.inbox.markAllRead()).rejects.toThrow('offline');
  fail = false; await h.inbox.flushReadCursors();
  expect(writes.at(-1)).toEqual({ items: [{ scope: 'group:g', cursor: 4 }] });
  const done = writes.length; await h.inbox.flushReadCursors(); expect(writes).toHaveLength(done);
  h.inbox.destroy();
});

const group = (id: string): CloudGroup => ({ id, title: `Group ${id}`, owner: 101, conversationId: id, revision: 1,
  membershipVersion: 1, keyVersion: 1, createdAt: 1, legacyId: null, members: [{ memberNumber: 101, status: "active", role: "owner" }] });
const message = (sequence: number, sender = 202): CloudMessage => ({ id: `m${sequence}`, conversationId: "g", sequence,
  sender, text: `Message ${sequence}`, createdAt: sequence * 100, deletedAt: null, clientId: `c${sequence}`,
  encryption: "server-aes-256-gcm", schemaVersion: 1, membershipVersion: 1, keyVersion: 1 });
function setup(handler: (method: string, path: string, body?: unknown) => Promise<unknown>, storage = new MemoryKeyValueStorage(), member = 101, platformPreview = false, origin?: string) {
  let connected = true;
  const request = vi.fn(handler);
  const client = { memberNumber: member, origin, get connected() { return connected; }, request, subscribe: () => () => {} } as unknown as CloudClient;
  const ui = new SocialUI({ client, run: async action => { await action(); }, image: () => document.createElement("div"), openProfile: vi.fn(), isBlocked: n => n === 303 });
  const select = vi.fn(), changed = vi.fn();
  const inbox = new CloudGroupInbox(client, ui, storage, { platformPreview, select, changed, inviteChanged: async () => {} });
  return { inbox, client, request, select, changed, disconnect: () => { connected = false; inbox.clear(); }, reconnect: () => { connected = true; } };
}

it("only exposes a pending invitation title from the matching fetched generation", async () => {
  const generation = "a".repeat(32);
  const source = { required: true, generation };
  const invitation = { id: "g", title: "Current invitation", owner: 202, invitedAt: 100 };
  let bound = false;
  const { inbox } = setup(async (_method, path) => {
    if (path === "/v1/me") return bound
      ? { features: { groupReadRecoveryGeneration: true, groupManagementRecoveryGeneration: true }, directRecovery: { generation, restored: false } }
      : { features: {} };
    if (path.startsWith("/v1/group-invitations")) return bound
      ? { items: [invitation], recoveryGeneration: generation }
      : { items: [{ ...invitation, title: "Previous invitation" }] };
    return { items: [], ...(bound ? { recoveryGeneration: generation } : {}) };
  }, undefined, 101, false, "https://cloud.example.test");
  try {
    await inbox.refresh();
    expect(inbox.pendingInvitation("g")?.title).toBe("Previous invitation");

    bound = true;
    await inbox.historyAccess();
    expect(inbox.invitations[0]?.title).toBe("Previous invitation");
    expect(inbox.pendingInvitation("g", source)).toBeUndefined();

    await inbox.refresh(true);
    expect(inbox.pendingInvitation("g", source)).toEqual(invitation);
    expect(inbox.pendingInvitation("g")).toBeUndefined();
  } finally {
    inbox.destroy();
  }
});

describe("group invitation review", () => {
  const invitation = { id: "g", title: "Night Garden", owner: 202, invitedAt: 100 };
  const mail = (changes: Partial<MailItem> = {}): MailItem => ({
    id: 1, actor: 303, kind: "group_invitation", targetType: "group", targetId: "g",
    pending: true, read: true, count: 1, createdAt: 100, updatedAt: 100, groupInvitedAt: 100, ...changes,
  });
  const control = (card: HTMLElement, label: string): HTMLButtonElement => {
    const button = card.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
    if (!button) throw new Error(`Missing invitation action ${label}`);
    return button;
  };

  it.each(["accept", "decline"] as const)("confirms %s once and refreshes before notifying the caller", async action => {
    let invited = true;
    let finish!: () => void;
    const response = new Promise<void>(resolve => { finish = resolve; });
    const h = setup(async (method, path) => {
      if (path === "/v1/group-invitations") return { items: invited ? [invitation] : [] };
      if (path === "/v1/groups") return { items: !invited && action === "accept" ? [group("g")] : [] };
      if ((method === "POST" && path.endsWith("/accept")) || (method === "DELETE" && path.endsWith("/invitation"))) {
        await response;
        invited = false;
        return {};
      }
      return { items: [] };
    }, undefined, 101, true);
    const accepted = vi.fn(), declined = vi.fn();
    const inviteChanged = vi.fn(async () => {
      expect(h.inbox.invitations).toEqual([]);
      expect(h.inbox.groups.map(row => row.id)).toEqual(action === "accept" ? ["g"] : []);
    });
    h.inbox.options.inviteChanged = inviteChanged;
    await h.inbox.refresh();
    const card = h.inbox.reviewInvitation(mail(), { current: () => true, accepted, declined, inviter: "Delegated inviter" })!;
    document.body.append(card);
    try {
      expect(card.textContent).toContain("Night Garden");
      expect(card.textContent).toContain("Delegated inviter");
      const choose = control(card, action === "accept" ? "Accept invitation" : "Decline");
      choose.click();
      choose.click();
      await vi.waitFor(() => expect(h.request.mock.calls.filter(([method]) => method === "POST" || method === "DELETE")).toHaveLength(1));
      expect(accepted).not.toHaveBeenCalled();
      expect(declined).not.toHaveBeenCalled();
      finish();
      await vi.waitFor(() => expect(action === "accept" ? accepted : declined).toHaveBeenCalledOnce());
      if (action === "accept") expect(accepted).toHaveBeenCalledWith(invitation.title);
      expect(action === "accept" ? declined : accepted).not.toHaveBeenCalled();
      expect(inviteChanged).toHaveBeenCalledOnce();
      expect(h.select).not.toHaveBeenCalled();
    } finally {
      finish();
      card.remove();
      h.inbox.destroy();
    }
  });

  it.each([
    { pending: false }, { kind: "comment" }, { targetType: "post" },
    { targetId: "other" }, { groupInvitedAt: 200 },
    { groupManagementSource: { required: true, generation: "a".repeat(32) } },
  ])("does not expose actions for unavailable invitation details (%o)", async changes => {
    const h = setup(async (_method, path) => ({ items: path === "/v1/group-invitations" ? [invitation] : [] }));
    try {
      await h.inbox.refresh();
      expect(h.inbox.reviewInvitation(mail(changes), { current: () => true, accepted: vi.fn(), declined: vi.fn() })).toBeUndefined();
      expect(h.request.mock.calls.filter(([method]) => method === "POST" || method === "DELETE")).toHaveLength(0);
    } finally {
      h.inbox.destroy();
    }
  });

  it("blocks a reviewed invitation replaced before the user chooses an action", async () => {
    let currentInvitation = invitation;
    const h = setup(async (_method, path) => ({ items: path === "/v1/group-invitations" ? [currentInvitation] : [] }));
    await h.inbox.refresh();
    const accepted = vi.fn(), declined = vi.fn();
    const card = h.inbox.reviewInvitation(mail(), { current: () => true, accepted, declined })!;
    document.body.append(card);
    try {
      currentInvitation = { ...invitation, invitedAt: 200 };
      await h.inbox.refresh(true);
      control(card, "Accept invitation").click();
      await Promise.resolve(); await Promise.resolve();
      expect(h.request.mock.calls.filter(([method]) => method === "POST" || method === "DELETE")).toHaveLength(0);
      expect(accepted).not.toHaveBeenCalled();
      expect(declined).not.toHaveBeenCalled();
    } finally {
      card.remove();
      h.inbox.destroy();
    }
  });

  it("does not navigate after leaving the review while an acceptance is pending", async () => {
    let current = true;
    let finish!: () => void;
    const response = new Promise<void>(resolve => { finish = resolve; });
    const h = setup(async (method, path) => {
      if (path === "/v1/group-invitations") return { items: [invitation] };
      if (method === "POST" && path.endsWith("/accept")) { await response; return {}; }
      return { items: [] };
    });
    await h.inbox.refresh();
    const accepted = vi.fn(), declined = vi.fn();
    const card = h.inbox.reviewInvitation(mail(), { current: () => current, accepted, declined })!;
    document.body.append(card);
    try {
      control(card, "Accept invitation").click();
      await vi.waitFor(() => expect(h.request.mock.calls.some(([method]) => method === "POST")).toBe(true));
      current = false;
      finish();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(accepted).not.toHaveBeenCalled();
      expect(declined).not.toHaveBeenCalled();
    } finally {
      finish();
      card.remove();
      h.inbox.destroy();
    }
  });

  it("retries refresh after a confirmed acceptance without sending the acceptance twice", async () => {
    let acceptedByServer = false, failRefresh = true;
    const h = setup(async (method, path) => {
      if (method === "POST" && path.endsWith("/accept")) { acceptedByServer = true; return {}; }
      if (path === "/v1/group-invitations") {
        if (acceptedByServer && failRefresh) throw new Error("Refresh unavailable");
        return { items: acceptedByServer ? [] : [invitation] };
      }
      if (path === "/v1/groups") return { items: acceptedByServer ? [group("g")] : [] };
      return { items: [] };
    });
    await h.inbox.refresh();
    const accepted = vi.fn(), declined = vi.fn();
    const card = h.inbox.reviewInvitation(mail(), { current: () => true, accepted, declined })!;
    document.body.append(card);
    try {
      control(card, "Accept invitation").click();
      await vi.waitFor(() => expect(card.textContent).toContain("Refresh unavailable"));
      expect(accepted).not.toHaveBeenCalled();
      failRefresh = false;
      control(card, "Retry refresh").click();
      await vi.waitFor(() => expect(accepted).toHaveBeenCalledOnce());
      expect(h.request.mock.calls.filter(([method]) => method === "POST")).toHaveLength(1);
      expect(declined).not.toHaveBeenCalled();
    } finally {
      card.remove();
      h.inbox.destroy();
    }
  });

  it("preserves a confirmed response across closing and reopening after a refresh failure", async () => {
    let acceptedByServer = false, failRefresh = true;
    const h = setup(async (method, path) => {
      if (method === "POST" && path.endsWith("/accept")) { acceptedByServer = true; return {}; }
      if (path === "/v1/groups" && acceptedByServer && failRefresh) throw new Error("Refresh unavailable");
      if (path === "/v1/group-invitations") return { items: acceptedByServer ? [] : [invitation] };
      return { items: acceptedByServer ? [group("g")] : [] };
    });
    await h.inbox.refresh();
    const accepted = vi.fn(), declined = vi.fn();
    const options = { current: () => true, accepted, declined };
    const first = h.inbox.reviewInvitation(mail(), options)!;
    document.body.append(first);
    let reopened: HTMLElement | undefined;
    try {
      control(first, "Accept invitation").click();
      await vi.waitFor(() => expect(first.textContent).toContain("Refresh unavailable"));
      first.remove();
      reopened = h.inbox.reviewInvitation(mail(), options);
      expect(reopened).toBeDefined();
      document.body.append(reopened!);
      expect(reopened!.querySelector('[aria-label="Accept invitation"]')).toBeNull();
      expect(reopened!.querySelector('[aria-label="Decline"]')).toBeNull();
      failRefresh = false;
      control(reopened!, "Retry refresh").click();
      await vi.waitFor(() => expect(accepted).toHaveBeenCalledOnce());
      expect(h.request.mock.calls.filter(([method]) => method === "POST")).toHaveLength(1);
      expect(declined).not.toHaveBeenCalled();
    } finally {
      first.remove();
      reopened?.remove();
      h.inbox.destroy();
    }
  });

  it("retries an ambiguous acceptance with the same captured operation and invitation", async () => {
    const generation = "a".repeat(32), source = { required: true, generation };
    let invited = true, loseResponse = true;
    const h = setup(async (method, path, body) => {
      if (path === "/v1/me") return { memberNumber: 101,
        features: { groupReadRecoveryGeneration: true, groupManagementRecoveryGeneration: true },
        directRecovery: { generation, restored: false } };
      if (method === "POST" && path.endsWith("/accept")) {
        if (loseResponse) { loseResponse = false; throw new CloudError("cloud_temporarily_unavailable"); }
        invited = false;
        return { recoveryGeneration: generation, applied: true, groupId: "g", action: "accept",
          operationId: (body as Record<string, unknown>).operationId };
      }
      if (path.startsWith("/v1/group-invitations")) return { items: invited ? [invitation] : [], recoveryGeneration: generation };
      return { items: invited ? [] : [group("g")], recoveryGeneration: generation };
    }, undefined, 101, true, "https://cloud.example.test");
    await h.inbox.refresh();
    const accepted = vi.fn(), declined = vi.fn();
    const card = h.inbox.reviewInvitation(mail({ groupManagementSource: source, recoveryGeneration: generation }),
      { current: () => true, accepted, declined })!;
    document.body.append(card);
    try {
      control(card, "Accept invitation").click();
      await vi.waitFor(() => expect(card.textContent).toContain("Retry original group change"));
      expect(accepted).not.toHaveBeenCalled();
      const original = h.request.mock.calls.find(([method]) => method === "POST")?.[2];
      expect(original).toMatchObject({ invitedAt: 100, recoveryGeneration: generation, operationId: expect.any(String) });
      control(card, "Retry original group change").click();
      await vi.waitFor(() => expect(accepted).toHaveBeenCalledOnce());
      const writes = h.request.mock.calls.filter(([method]) => method === "POST");
      expect(writes).toHaveLength(2);
      expect(writes[1]?.[2]).toEqual(original);
      expect(declined).not.toHaveBeenCalled();
    } finally {
      card.remove();
      h.inbox.destroy();
    }
  });
});

it("persists only pending group receipt IDs offline and upgrades delivery to read on reconnect", async () => {
  const storage = new MemoryKeyValueStorage();
  const bodies: unknown[] = [];
  let fail = true;
  const { inbox, disconnect, reconnect } = setup(async (method, path, body) => {
    if (method === "PUT" && path === "/v1/conversations/c/receipts") {
      bodies.push(body);
      if (fail) throw new CloudError("offline");
      return { acknowledged: ["m1"] };
    }
    return { items: [] };
  }, storage);
  inbox.enableMessageReceipts(true);
  disconnect();
  inbox.acknowledgeReceipts("g", "c", ["m1"], []);
  inbox.acknowledgeReceipts("g", "c", [], ["m1"]);
  expect(storage.getItem("kikilink:cloud:group-receipts:101:v1")).toContain('"state":"read"');
  expect(bodies).toHaveLength(0);
  reconnect();
  await expect(inbox.flushReceipts()).rejects.toMatchObject({ code: "offline" });
  expect(storage.getItem("kikilink:cloud:group-receipts:101:v1")).toContain('"m1"');
  fail = false;
  await inbox.flushReceipts();
  expect(bodies.at(-1)).toEqual({ deliveredIds: [], readIds: ["m1"] });
  expect(storage.getItem("kikilink:cloud:group-receipts:101:v1")).toBe("[]");
  const completed = bodies.length;
  inbox.acknowledgeReceipts("g", "c", ["m1"], ["m1"]);
  await inbox.flushReceipts();
  expect(bodies).toHaveLength(completed);
  inbox.destroy();
});
it("opens group row actions without selecting the conversation in the platform list", async () => {
  const { inbox, select } = setup(async (_method, path) => path === "/v1/groups"
    ? { items: [{ ...group("g"), lastMessage: message(2), lastIncomingSequence: 2, unreadMessages: 2, readCursor: 0 }] }
    : { items: [] }, undefined, 101, true);
  document.body.append(inbox.element);
  try {
    await inbox.refresh();
    const options = inbox.element.querySelector<HTMLButtonElement>('[aria-label="Conversation options for Group g"]')!;
    expect(inbox.element.querySelector(".kl-unread")?.textContent).toBe("2");
    options.click();
    const menu = inbox.element.querySelector<HTMLDialogElement>("dialog")!;
    expect(menu.open).toBe(true);
    expect(options.getAttribute("aria-expanded")).toBe("true");
    expect(select).not.toHaveBeenCalled();
    expect([...menu.querySelectorAll('[role="menuitem"]')].map(item => item.textContent))
      .toEqual(["Pin conversation", "Mute conversation", "Mark as read"]);
    menu.querySelector<HTMLButtonElement>('[aria-label="Pin conversation"]')!.click();
    expect(inbox.isPinned("g")).toBe(true);
    expect(options.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(options);
    options.click();
    menu.querySelector<HTMLButtonElement>('[aria-label="Mark as read"]')!.click();
    expect(inbox.unreadCount("g")).toBe(0);
    expect(select).not.toHaveBeenCalled();
  } finally {
    inbox.destroy();
    inbox.element.remove();
  }
});

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
    expect(client.request).toHaveBeenCalledTimes(6); expect(peak).toBeLessThanOrEqual(2);
    const row = inbox.element.querySelector<HTMLButtonElement>('[data-group-id="a"]')!;
    inbox.search("Group a"); inbox.select("a"); inbox.draft("a", "My draft"); await inbox.refresh();
    expect(client.request).toHaveBeenCalledTimes(6); expect(inbox.element.querySelector('[data-group-id="a"]')).toBe(row);
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
    delayed = true; const load = inbox.refresh(true); await vi.waitFor(() => expect(typeof complete).toBe("function")); disconnect();
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
