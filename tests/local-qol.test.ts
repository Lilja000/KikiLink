// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, sanitizeSettings, SettingsStore, type KeyValueStorage } from "../src/core/settings";
import type { KikiLinkEvents, OnlineFriend } from "../src/core/types";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { GroupChatService, serializeGroupChatPacket } from "../src/modules/link-chat/group-chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";
import { AccountKeyValueStorage } from "../src/storage/account-data-storage";

const disposers: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const dispose of disposers.splice(0).reverse()) await dispose();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup(settings = new SettingsStore(new MemoryKeyValueStorage()), navigationStorage: KeyValueStorage = new MemoryKeyValueStorage()) {
  const online: OnlineFriend[] = [20, 30].map((memberNumber) => ({ memberNumber, memberName: `Friend ${memberNumber}`, privateRoom: false }));
  const adapter = {
    getOwnMemberNumber: () => 10, getOwnName: () => "Kiki",
    getMemberName: (id: number) => `Friend ${id}`, getMemberNickname: () => undefined,
    getKnownContacts: () => online,
    getOnlineFriends: () => online, getOnlineFriend: (id: number) => online.find((friend) => friend.memberNumber === id),
    hasOnlineFriendSnapshot: () => true, isKnownFriend: (id: number) => id === 20 || id === 30,
    isMemberInCurrentRoom: () => false, getPlayerRelationships: () => [],
    isInChatRoom: () => false, getCurrentRoomName: () => undefined,
    canSendBeep: () => true, isReady: () => true,
    refreshOnlineFriends: vi.fn(() => true), sendKikiLinkProtocol: vi.fn(() => "beep"),
    broadcastKikiLinkProtocol: vi.fn(() => false),
  } as unknown as BCAdapter;
  const bus = new EventBus<KikiLinkEvents>();
  const presence = new LinkPresenceService(adapter, settings, bus, "0.29.0");
  const direct = new ChatService(new MemoryChatRepository(), settings);
  const groups = new GroupChatService(adapter, new MemoryKeyValueStorage(), {
    hasManagedPeer: () => true,
    isPeerReachable: (memberNumber) => Boolean(adapter.getOnlineFriend(memberNumber)),
  });
  const view = new LinkChatView(adapter, direct, settings, "0.29.0", undefined, undefined, presence);
  view.attachNavigationStorage(navigationStorage);
  view.attachGroupChatService(groups); view.mount();
  disposers.push(() => presence.stop(), async () => { await groups.destroy(); }, () => view.destroy());
  const shadow = document.querySelector("#kikilink-root")!.shadowRoot!;
  return { view, direct, groups, shadow, settings, presence, bus, adapter, online };
}

function required<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector); if (!node) throw new Error(`Missing ${selector}`); return node;
}
const incoming = (peerNumber = 20) => ({ direction: "incoming" as const, peerNumber, peerName: `Friend ${peerNumber}`, content: "Unread test", sentAt: Date.now(), includeRoom: false });

describe("local FUSAM QoL", () => {
  it("migrates automatic image defaults once and preserves later ask/never choices", () => {
    const migrated = sanitizeSettings({ schemaVersion: 28, ui: { launcherOpen: "home" }, linkChat: { imagePreviews: "ask" }, linkPresence: { profileImagePreviews: "ask" } });
    expect(migrated.ui.launcherOpen).toBe("last");
    expect(migrated.linkChat.imagePreviews).toBe("always");
    expect(migrated.linkPresence.profileImagePreviews).toBe("always");
    for (const policy of ["ask", "never"] as const) {
      const custom = sanitizeSettings({ ...migrated, linkChat: { imagePreviews: policy }, linkPresence: { profileImagePreviews: policy } });
      expect(custom.linkChat.imagePreviews).toBe(policy);
      expect(custom.linkPresence.profileImagePreviews).toBe(policy);
    }
    const hidden = sanitizeSettings({ schemaVersion: 28, linkChat: { imagePreviews: "never" }, linkPresence: { profileImagePreviews: "never" } });
    expect(hidden.linkChat.imagePreviews).toBe("never");
    expect(hidden.linkPresence.profileImagePreviews).toBe("never");
  });

  it("restores the last section across page/browser restarts and keeps accounts separate", async () => {
    const backing = new MemoryKeyValueStorage(), storage = new AccountKeyValueStorage(10, backing);
    const h = setup(new SettingsStore(storage), storage); await h.view.open();
    const panel = required(h.shadow, ".kl-panel"); expect(panel.dataset.workspace).toBe("home");
    required(h.shadow, '[data-target="music"]').click();
    h.view.close(); await h.view.open(); expect(panel.dataset.workspace).toBe("music");
    required(h.shadow, '[data-target="settings"]').click();
    h.view.close(); await h.view.open(); expect(panel.dataset.workspace).toBe("settings");
    h.view.destroy();
    const otherStorage = new AccountKeyValueStorage(11, backing);
    const other = setup(new SettingsStore(otherStorage), otherStorage); await other.view.open();
    expect(required(other.shadow, ".kl-panel").dataset.workspace).toBe("home"); other.view.destroy();
    const restoredStorage = new AccountKeyValueStorage(10, backing);
    const second = setup(new SettingsStore(restoredStorage), restoredStorage); await second.view.open();
    expect(required(second.shadow, ".kl-panel").dataset.workspace).toBe("settings");
    const select = required<HTMLSelectElement>(second.shadow, '[data-setting="launcher-open"]');
    expect([...select.options].map(option => option.value)).toEqual(["last", "home", "chat"]);
    expect(select.value).toBe("last");
    expect(select.closest('.kl-setting-row')?.textContent).not.toContain("always starts at Home");
  });

  it.each(["last", "chat", "home"] as const)("honors the %s launcher preference on the first open after a reload", async preference => {
    const storage = new MemoryKeyValueStorage(), settings = new SettingsStore(storage);
    settings.update(draft => { draft.ui.launcherOpen = preference; });
    const first = setup(settings, storage); await first.view.open();
    required(first.shadow, '[data-target="music"]').click(); first.view.destroy();
    const restored = setup(new SettingsStore(storage), storage); await restored.view.open();
    expect(required(restored.shadow, '.kl-panel').dataset.workspace).toBe(preference === "last" ? "music" : preference);
    expect(restored.settings.getSection("ui").launcherOpen).toBe(preference);
  });

  it("keeps navigation usable when persistence fails and skips writes for reopening the same section", async () => {
    const storage = { getItem: vi.fn(() => { throw new Error("unavailable"); }), setItem: vi.fn(() => { throw new Error("quota"); }), removeItem: vi.fn() };
    const h = setup(undefined, storage); await h.view.open();
    required(h.shadow, '[data-target="music"]').click();
    h.view.close(); await h.view.open();
    expect(required(h.shadow, '.kl-panel').dataset.workspace).toBe("music");
    expect(storage.setItem).toHaveBeenCalledOnce();
  });

  it.each(["__proto__", "toString", "cloud", "activities", "roster"])("safely falls back from an invalid or unavailable saved section: %s", async saved => {
    const storage = new MemoryKeyValueStorage(), settings = new SettingsStore(storage);
    storage.setItem("kikilink:launcher:last-section:v1", saved);
    settings.update(draft => { draft.linkActivities.enabled = false; draft.linkRoster.enabled = false; });
    const h = setup(settings, storage); await h.view.open();
    expect(required(h.shadow, '.kl-panel').dataset.workspace).toBe("home");
  });

  it.each(["touch", "pen"])("opens quick actions on a %s hold without accidentally toggling the panel", async pointerType => {
    const h = setup(); await h.view.refresh();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const launcher = required(h.shadow, ".kl-launcher");
    launcher.dispatchEvent(new PointerEvent("pointerdown", { button: 0, pointerId: 1, pointerType, clientX: 20, clientY: 20 }));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(required<HTMLDialogElement>(h.shadow, ".kl-launcher-menu").open).toBe(true);
    launcher.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 })); launcher.click();
    expect(required(h.shadow, ".kl-panel").hidden).toBe(true);
    expect(required<HTMLDialogElement>(h.shadow, ".kl-launcher-menu").open).toBe(true);
  });

  it("cancels the hold when dragging and supports keyboard quick actions", async () => {
    const h = setup(); await h.view.refresh();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const launcher = required(h.shadow, ".kl-launcher");
    launcher.dispatchEvent(new PointerEvent("pointerdown", { button: 0, pointerId: 2, pointerType: "touch", clientX: 20, clientY: 20 }));
    launcher.dispatchEvent(new PointerEvent("pointermove", { pointerId: 2, clientX: 50, clientY: 50 }));
    await vi.advanceTimersByTimeAsync(600);
    expect(required<HTMLDialogElement>(h.shadow, ".kl-launcher-menu").open).toBe(false);
    launcher.dispatchEvent(new PointerEvent("pointerup", { pointerId: 2 }));
    launcher.dispatchEvent(new KeyboardEvent("keydown", { key: "F10", shiftKey: true }));
    expect(required<HTMLDialogElement>(h.shadow, ".kl-launcher-menu").open).toBe(true);
  });

  it("lets the mouse pause before a drag without opening quick actions or toggling the panel", async () => {
    const h = setup(); await h.view.refresh();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const launcher = required(h.shadow, ".kl-launcher");
    const menu = required<HTMLDialogElement>(h.shadow, ".kl-launcher-menu");
    launcher.dispatchEvent(new PointerEvent("pointerdown", { button: 0, pointerId: 3, pointerType: "mouse", clientX: 20, clientY: 20 }));
    launcher.dispatchEvent(new PointerEvent("pointermove", { pointerId: 3, pointerType: "mouse", clientX: 22, clientY: 21 }));
    await vi.advanceTimersByTimeAsync(1_200);
    expect(menu.open).toBe(false);
    launcher.dispatchEvent(new PointerEvent("pointermove", { pointerId: 3, pointerType: "mouse", clientX: 70, clientY: 80 }));
    expect(launcher.dataset.dragging).toBe("true");
    expect(launcher.style.left).toBe("50px");
    launcher.dispatchEvent(new MouseEvent("contextmenu", { button: 2, cancelable: true }));
    expect(menu.open).toBe(false);
    launcher.dispatchEvent(new PointerEvent("pointerup", { pointerId: 3, pointerType: "mouse" }));
    launcher.click();
    expect(required(h.shadow, ".kl-panel").hidden).toBe(true);
    expect(h.settings.getSection("ui").launcherPosition).toBeDefined();
    launcher.dispatchEvent(new MouseEvent("contextmenu", { button: 2, cancelable: true }));
    expect(menu.open).toBe(true);
  });

  it.each(["pointercancel", "lostpointercapture"])("cancels the launcher hold on %s", async eventType => {
    const h = setup(); await h.view.refresh();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const launcher = required(h.shadow, ".kl-launcher");
    launcher.dispatchEvent(new PointerEvent("pointerdown", { button: 0, pointerId: 4, pointerType: "touch" }));
    launcher.dispatchEvent(new PointerEvent(eventType, { pointerId: 4, pointerType: "touch" }));
    await vi.advanceTimersByTimeAsync(600);
    expect(required<HTMLDialogElement>(h.shadow, ".kl-launcher-menu").open).toBe(false);
    expect(launcher.dataset.dragging).toBe("false");
  });

  it("does not replace or cancel a launcher gesture when another pointer touches the icon", async () => {
    const h = setup(); await h.view.refresh();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const launcher = required(h.shadow, ".kl-launcher");
    launcher.dispatchEvent(new PointerEvent("pointerdown", { button: 0, pointerId: 5, pointerType: "touch" }));
    await vi.advanceTimersByTimeAsync(300);
    launcher.dispatchEvent(new PointerEvent("pointerdown", { button: 0, pointerId: 6, pointerType: "touch" }));
    launcher.dispatchEvent(new PointerEvent("pointerup", { pointerId: 6, pointerType: "touch" }));
    await vi.advanceTimersByTimeAsync(250);
    expect(required<HTMLDialogElement>(h.shadow, ".kl-launcher-menu").open).toBe(true);
  });

  it("marks direct and group chats read without deleting messages or drafts", async () => {
    const h = setup(); await h.direct.capture(incoming(), false); await h.direct.setDraft(20, "Friend 20", "Unsent draft");
    const { group } = await h.groups.createManagedGroup([20, 30], "Friends");
    await h.groups.receiveProtocol({ senderNumber: 20, payload: serializeGroupChatPacket({ t: "gm", v: 2, g: group.groupId, e: group.epochId!, i: "gmsg_unreadtest", c: "Group unread", u: Date.now() }) });
    await h.view.refresh();
    required(h.shadow, ".kl-launcher").dispatchEvent(new MouseEvent("contextmenu"));
    required(h.shadow, ".kl-launcher-read-all").click();
    await vi.waitFor(async () => { expect(await h.direct.totalUnread()).toBe(0); expect(h.groups.totalUnread()).toBe(0); });
    expect((await h.direct.getMessages(20))).toHaveLength(1);
    expect((await h.direct.getConversation(20))?.draft).toBe("Unsent draft");
    expect(h.groups.getMessages(group.groupId)).toHaveLength(1);
    await h.direct.capture(incoming(), false);
    expect(await h.direct.totalUnread()).toBe(1);
  });

  it("mutes alerts without losing unread counts and resumes automatically", async () => {
    const h = setup(); await h.view.refresh();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    h.settings.update((draft) => { draft.ui.notificationsMutedUntil = Date.now() + 1_000; });
    const notice = { kind: "chat" as const, message: "Test alert", showToast: true, memberNumber: 20, occurredAt: Date.now() };
    h.view.onNotification(notice);
    expect(h.shadow.querySelector(".kl-toast")).toBeNull();
    await h.direct.capture(incoming(), false); expect(await h.direct.totalUnread()).toBe(1);
    await vi.advanceTimersByTimeAsync(1_002);
    h.view.onNotification(notice);
    await vi.advanceTimersByTimeAsync(0);
    expect(h.shadow.querySelector(".kl-toast")?.textContent).toContain("Test alert");
    expect(required(h.shadow, ".kl-launcher").dataset.muted).toBe("false");
  });

  it("resizes the launcher within safe bounds without modifying another account", () => {
    const h = setup(); const other = new SettingsStore(new MemoryKeyValueStorage());
    h.settings.update((draft) => { draft.ui.launcherSize = 500; draft.ui.notificationsMutedUntil = -1; });
    expect(h.settings.get().ui.launcherSize).toBe(58);
    h.settings.update((draft) => { draft.ui.launcherSize = 88; });
    expect(h.settings.get().ui.launcherSize).toBe(88);
    expect(document.querySelector<HTMLElement>("#kikilink-root")?.style.getPropertyValue("--kl-launcher-size")).toBe("88px");
    expect(other.get().ui.launcherSize).toBe(58); expect(other.get().ui.notificationsMutedUntil).toBe(0);
  });

  it("keeps groups open in the mobile chat view on reopening", async () => {
    const h = setup(); const { group } = await h.groups.createManagedGroup([20, 30], "Friends");
    await h.view.open(); required(h.shadow, '[data-target="chat"]').click(); await h.view.refresh();
    required(h.shadow, `[data-group-id="${group.groupId}"]`).click();
    await vi.waitFor(() => expect(h.view.getActiveGroupId()).toBe(group.groupId));
    h.view.close(); await h.view.open();
    expect(h.view.getActiveGroupId()).toBe(group.groupId);
    expect(required(h.shadow, ".kl-panel").dataset.mobileView).toBe("chat");
  });

  it("filters unread and group chats and exposes direct drafts", async () => {
    const h = setup(); await h.direct.capture(incoming(20), false); await h.direct.ensureConversation(30, "Read friend");
    await h.direct.setDraft(30, "Read friend", "Still writing"); await h.groups.createManagedGroup([20, 30], "Friends");
    await h.view.open(); required(h.shadow, '[data-target="chat"]').click(); await h.view.refresh();
    expect(required(h.shadow, '[data-conversation-key="direct:30"]').textContent).toContain("Draft: Still writing");
    required(h.shadow, '[data-chat-filter="unread"]').click();
    await vi.waitFor(() => expect(h.shadow.querySelectorAll(".kl-conversations > .kl-conversation")).toHaveLength(1));
    required(h.shadow, '[data-chat-filter="groups"]').click();
    await vi.waitFor(() => expect(h.shadow.querySelectorAll(".kl-conversations > .kl-group-conversation")).toHaveLength(1));
    expect(h.shadow.querySelector('[data-conversation-key="direct:20"]')).toBeNull();
  });

  it("shows Lobby for online friends but keeps hidden rooms private and offline separate", () => {
    const h = setup(); expect(h.presence.get(20)).toMatchObject({ status: "online", roomName: "Lobby" });
    h.online[0]!.privateRoom = true;
    expect(h.presence.get(20).roomName).toBe("Private room");
    h.online.splice(0, 1);
    expect(h.presence.get(20)).toMatchObject({ status: "offline" });
    expect(h.presence.get(20).roomName).toBeUndefined();
  });

  it("refreshes expired group support from other rooms without a 15-minute wait or bursts", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-07T10:00:00Z"));
    const h = setup(); h.presence.start();
    h.presence.requestMany([20]);
    h.bus.emit("bc:protocol", { senderNumber: 20, channel: "beep", payload: JSON.stringify({ t: "pc", v: "0.29.0", g: 3 }) });
    expect(h.presence.hasGroupManagedPeer(20)).toBe(true);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1);
    expect(h.presence.hasGroupManagedPeer(20)).toBe(false);
    const send = vi.mocked(h.adapter.sendKikiLinkProtocol); send.mockClear();
    expect(h.presence.requestMany([20], { interactive: true })).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(h.presence.requestMany([20], { interactive: true })).toBe(1);
    expect(h.presence.requestMany([20], { interactive: true })).toBe(0);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("rejects a recently offline friend even while their addon capability remains cached", async () => {
    const h = setup(); h.presence.start();
    h.bus.emit("bc:protocol", { senderNumber: 20, channel: "beep", payload: JSON.stringify({ t: "pc", v: "0.29.0", g: 3 }) });
    expect(h.presence.hasGroupManagedPeer(20)).toBe(true);
    h.online.splice(0, 1);
    await h.view.open(); required(h.shadow, '[data-target="chat"]').click();
    required(h.shadow, '.kl-toolbar-group-button').click();
    // Keep the native friend in the picker, with an explicitly offline row.
    h.adapter.getKnownContacts = () => [20, 30].map((memberNumber) => ({ memberNumber, memberName: `Friend ${memberNumber}` }));
    const search = required<HTMLInputElement>(h.shadow, ".kl-new-chat-query");
    search.value = "Friend 20"; search.dispatchEvent(new Event("input", { bubbles: true }));
    expect(h.shadow.querySelector('.kl-contact[data-member-number="20"]')).toBeNull();
    await expect(h.groups.createManagedGroup([20, 30], "No stale invitations")).rejects.toThrow("unavailable");
    expect(h.groups.listGroups()).toHaveLength(0);
  });
});

describe("navigation tab actions", () => {
  function menu(h: ReturnType<typeof setup>, tab: string) {
    required(h.shadow, `.kl-nav-item[data-target="${tab}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 40 }));
    return required(h.shadow, ".kl-profile-menu");
  }
  function action(root: ParentNode, label: string) {
    const item = [...root.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action")].find(button => button.querySelector(".kl-profile-menu-label")?.textContent === label);
    if (!item) throw new Error(`Missing action: ${label}`); return item;
  }
  it("offers read/mute/hide only on Chat, hide on other tabs, and no hide action on Settings", async () => {
    const h = setup(); await h.view.open();
    expect([...menu(h, "chat").querySelectorAll(".kl-profile-menu-label")].map(n => n.textContent)).toEqual(["Mark all as read", "Mute tab", "Hide tab"]);
    required<HTMLDialogElement>(h.shadow, ".kl-profile-menu-layer").dispatchEvent(new Event("cancel"));
    for (const tab of ["home", "roster", "room", "music", "activities"]) {
      expect([...menu(h, tab).querySelectorAll(".kl-profile-menu-label")].map(n => n.textContent)).toEqual(["Hide tab"]);
    }
    required<HTMLDialogElement>(h.shadow, ".kl-profile-menu-layer").dispatchEvent(new Event("cancel"));
    required(h.shadow, '.kl-nav-item[data-target="settings"]').dispatchEvent(new MouseEvent("contextmenu", { cancelable: true }));
    expect(required(h.shadow, ".kl-profile-menu").hidden).toBe(true);
  });
  it("hides the active tab, persists it per account, and restores it from Navigation settings", async () => {
    const storage = new MemoryKeyValueStorage(), h = setup(new SettingsStore(storage), storage); await h.view.open();
    required(h.shadow, '.kl-nav-item[data-target="music"]').click();
    action(menu(h, "music"), "Hide tab").click();
    expect(required(h.shadow, '.kl-nav-item[data-target="music"]').hidden).toBe(true);
    expect(required(h.shadow, ".kl-panel").dataset.workspace).toBe("home");
    expect(new SettingsStore(storage).get().ui.hiddenTabs).toEqual(["music"]);
    expect(new SettingsStore(new MemoryKeyValueStorage()).get().ui.hiddenTabs).toEqual([]);
    required(h.shadow, '.kl-nav-item[data-target="settings"]').click();
    const toggle = required<HTMLInputElement>(h.shadow, '[data-navigation-tab="music"]');
    expect(toggle.checked).toBe(false); toggle.checked = true;
    [...h.shadow.querySelectorAll<HTMLButtonElement>(".kl-settings-page button")].find(b => b.textContent === "Save changes")!.click();
    expect(required(h.shadow, '.kl-nav-item[data-target="music"]').hidden).toBe(false);
    expect(h.settings.get().ui.hiddenTabs).toEqual([]);
  });
  it("leaves Settings reachable even when every optional tab is hidden", async () => {
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update(draft => { draft.ui.hiddenTabs = ["home", "cloud", "chat", "roster", "room", "music", "activities"]; });
    const h = setup(settings); await h.view.open();
    expect(required(h.shadow, ".kl-panel").dataset.workspace).toBe("settings");
    expect(required(h.shadow, '.kl-nav-item[data-target="settings"]').hidden).toBe(false);
    expect(sanitizeSettings({ ui: { hiddenTabs: ["settings", "chat", "chat", "__proto__", 42] } }).ui.hiddenTabs).toEqual(["chat"]);
  });
  it("marks all chats read without deleting messages or drafts", async () => {
    const h = setup(); await h.direct.capture(incoming(), false); await h.direct.setDraft(20, "Friend 20", "Keep this draft"); await h.view.open();
    action(menu(h, "chat"), "Mark all as read").click();
    await vi.waitFor(async () => expect(await h.direct.totalUnread()).toBe(0));
    expect(await h.direct.getMessages(20)).toHaveLength(1);
    expect((await h.direct.getMessages(20))[0]?.read).toBe(true);
    expect((await h.direct.getConversation(20))?.draft).toBe("Keep this draft");
  });
  it("reuses the direct-chat mute choices, preserves unread data, and restores alerts on unmute", async () => {
    const h = setup(); await h.direct.capture(incoming(), false); await h.view.open();
    action(menu(h, "chat"), "Mute tab").click();
    expect([...h.shadow.querySelectorAll(".kl-mute-choice strong")].map(n => n.textContent)).toEqual(["15 minutes", "1 hour", "8 hours", "24 hours", "Until I turn it back on"]);
    [...h.shadow.querySelectorAll<HTMLButtonElement>(".kl-mute-choice")].at(-1)!.click();
    await vi.waitFor(() => expect(h.settings.get().ui.tabAlerts.chat.mutedUntil).toBe(-1));
    expect(await h.direct.totalUnread()).toBe(1);
    expect(required(h.shadow, ".kl-launcher .kl-badge").hidden).toBe(true);
    h.shadow.querySelectorAll(".kl-toast").forEach(node => node.remove());
    const notice = { kind: "chat" as const, message: "Tab mute test", showToast: true, memberNumber: 20, occurredAt: Date.now() };
    h.view.onNotification(notice); await Promise.resolve(); expect(h.shadow.querySelector(".kl-toast")).toBeNull();
    action(menu(h, "chat"), "Unmute tab").click();
    h.view.onNotification(notice);
    await vi.waitFor(() => expect(h.shadow.querySelector(".kl-toast")?.textContent).toContain("Tab mute test"));
    expect(h.settings.get().ui.tabAlerts.chat.mutedUntil).toBe(0);
  });
  it("supports keyboard and touch actions while a mouse hold remains a normal click", async () => {
    const h = setup(); await h.view.open();
    const tab = required(h.shadow, '.kl-nav-item[data-target="music"]');
    tab.dispatchEvent(new KeyboardEvent("keydown", { key: "F10", shiftKey: true, bubbles: true, cancelable: true }));
    expect(required(h.shadow, ".kl-profile-menu").textContent).toContain("Hide tab");
    required<HTMLDialogElement>(h.shadow, ".kl-profile-menu-layer").dispatchEvent(new Event("cancel"));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    tab.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "mouse", button: 0 }));
    await vi.advanceTimersByTimeAsync(600);
    expect(required(h.shadow, ".kl-profile-menu").hidden).toBe(true);
    tab.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", button: 0 }));
    await vi.advanceTimersByTimeAsync(600); tab.dispatchEvent(new PointerEvent("pointerup")); tab.click();
    expect(required(h.shadow, ".kl-profile-menu").hidden).toBe(false);
    expect(required(h.shadow, ".kl-panel").dataset.workspace).toBe("home");
  });
  it("persists Alerts choices, suppresses groups in direct-only mode, and expires timed tab mutes", async () => {
    const storage = new MemoryKeyValueStorage(), h = setup(new SettingsStore(storage)); await h.view.open();
    required(h.shadow, '.kl-nav-item[data-target="settings"]').click();
    required<HTMLSelectElement>(h.shadow, '[data-tab-alerts="chat"]').value = "personal";
    [...h.shadow.querySelectorAll<HTMLButtonElement>(".kl-settings-page button")].find(b => b.textContent === "Save changes")!.click();
    expect(new SettingsStore(storage).get().ui.tabAlerts.chat.mode).toBe("personal");
    h.shadow.querySelectorAll(".kl-toast").forEach(node => node.remove());
    const notice = { kind: "chat" as const, message: "Personal only", showToast: true, memberNumber: 20, occurredAt: Date.now() };
    h.view.onNotification(notice, true); await Promise.resolve(); expect(h.shadow.querySelector(".kl-toast")).toBeNull();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    h.settings.update(draft => { draft.ui.tabAlerts.chat.mutedUntil = Date.now() + 1000; });
    h.view.onNotification(notice); await vi.advanceTimersByTimeAsync(0); expect(h.shadow.querySelector(".kl-toast")).toBeNull();
    await vi.advanceTimersByTimeAsync(1002);
    h.view.onNotification(notice); await vi.advanceTimersByTimeAsync(0);
    expect(h.shadow.querySelector(".kl-toast")?.textContent).toContain("Personal only");
  });
});
