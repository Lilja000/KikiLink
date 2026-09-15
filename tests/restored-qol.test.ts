// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { GroupChatService, serializeGroupChatPacket } from "../src/modules/link-chat/group-chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup() {
  const adapter = {
    getOwnMemberNumber: () => 10,
    getOwnName: () => "Kiki",
    getMemberName: (id: number) => id === 20 ? "Reina" : "Mina",
    getMemberNickname: () => undefined,
    getKnownContacts: () => [{ memberNumber: 20, memberName: "Reina" }, { memberNumber: 30, memberName: "Mina" }],
    getOnlineFriends: () => [],
    getRoomCharacters: () => [],
    getCurrentRoomName: () => undefined,
    getPlayerRelationships: () => [],
    isInChatRoom: () => false,
    isMemberInCurrentRoom: () => false,
    isKnownFriend: () => true,
    isReady: () => true,
    canSendBeep: () => true,
    sendBeep: vi.fn(),
    sendKikiLinkProtocol: vi.fn(() => "beep" as const),
  } as unknown as BCAdapter;
  const storage = new MemoryKeyValueStorage();
  const settings = new SettingsStore(storage);
  const chats = new ChatService(new MemoryChatRepository(), settings);
  const view = new LinkChatView(adapter, chats, settings, "0.29.0");
  return { adapter, storage, chats, view };
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}

describe("Restored QoL compatibility fixes", () => {
  it("keeps player actions available when conversation storage cannot be read", async () => {
    const h = setup();
    h.view.mount();
    await h.view.openChat(20, "Reina");
    const root = required<HTMLElement>(document, "#kikilink-root").shadowRoot!;
    vi.spyOn(h.chats, "getConversation").mockRejectedValueOnce(new Error("Storage unavailable"));
    required<HTMLButtonElement>(root, ".kl-profile-more").click();
    await vi.waitFor(() => {
      const menu = required<HTMLDialogElement>(root, ".kl-profile-menu-layer");
      expect(menu.open).toBe(true);
      expect(menu.textContent).toContain("Reina");
      expect(menu.querySelector("button:not(:disabled)")).not.toBeNull();
    });
    h.view.destroy();
  });

  it("does not read a selected group while the mobile host is showing its inbox", async () => {
    vi.stubGlobal("innerWidth", 390);
    const h = setup();
    const groups = new GroupChatService(h.adapter, h.storage, {
      now: () => 1_000,
      idFactory: (prefix) => `${prefix}_00000001`,
    });
    const created = await groups.createGroup([20, 30], "Saved group");
    h.view.attachGroupChatService(groups);
    h.view.mount();
    await h.view.open();
    const root = required<HTMLElement>(document, "#kikilink-root").shadowRoot!;
    required<HTMLButtonElement>(root, '.kl-nav-item[data-target="chat"]').click();
    const rowSelector = `[data-conversation-key="group:${created.group.groupId}"]`;
    await vi.waitFor(() => expect(root.querySelector(rowSelector)).not.toBeNull());
    required<HTMLButtonElement>(root, rowSelector).click();
    await vi.waitFor(() => expect(h.view.getActiveGroupId()).toBe(created.group.groupId));
    h.view.close();
    await groups.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({ t: "gm", v: 1, g: created.group.groupId, i: "gmsg_00000002", c: "Still unread", u: 1_100 }),
    });
    expect(groups.getGroup(created.group.groupId)?.unread).toBe(1);
    const panel = required<HTMLElement>(root, ".kl-panel");
    // Exercise the host's existing inbox state separately from the selected group identity.
    panel.dataset.mobileView = "list";
    await h.view.open();
    expect(groups.getGroup(created.group.groupId)?.unread).toBe(1);
    required<HTMLButtonElement>(root, rowSelector).click();
    await vi.waitFor(() => expect(groups.getGroup(created.group.groupId)?.unread).toBe(0));
    h.view.destroy();
    await groups.destroy();
  });
});
