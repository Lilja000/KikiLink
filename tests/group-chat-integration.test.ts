// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { ChatService } from "../src/modules/link-chat/chat-service";
import {
  GroupChatService,
  serializeGroupChatPacket,
} from "../src/modules/link-chat/group-chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

class SilentlyDeniedGroupStorage extends MemoryKeyValueStorage {
  denied = false;

  override setItem(key: string, value: string): void {
    if (!this.denied) super.setItem(key, value);
  }

  override removeItem(key: string): void {
    if (!this.denied) super.removeItem(key);
  }
}

function setupClearHistoryView(groupStorage = new MemoryKeyValueStorage()): {
  directChats: ChatService;
  groups: GroupChatService;
  view: LinkChatView;
  shadow: ShadowRoot;
} {
  const names = new Map([
    [10, "Kiki"],
    [20, "Reina"],
    [30, "Mina"],
  ]);
  const adapter = {
    getOwnMemberNumber: () => 10,
    getOwnName: () => "Kiki",
    getMemberName: (memberNumber: number) => names.get(memberNumber) ?? `Member ${memberNumber}`,
    getMemberNickname: () => undefined,
    getKnownContacts: () => [
      { memberNumber: 20, memberName: "Reina" },
      { memberNumber: 30, memberName: "Mina" },
    ],
    getOnlineFriends: () => [],
    hasOnlineFriendSnapshot: () => true,
    isKnownFriend: () => true,
    isMemberInCurrentRoom: () => false,
    isInChatRoom: () => false,
    getCurrentRoomName: () => undefined,
    canSendBeep: () => true,
    isReady: () => true,
    sendKikiLinkProtocol: vi.fn(() => "beep" as const),
    sendBeep: vi.fn(),
  } as unknown as BCAdapter;
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  const directChats = new ChatService(new MemoryChatRepository(), settings);
  const groups = new GroupChatService(adapter, groupStorage, {
    now: () => 1_000,
    idFactory: (prefix) => `${prefix}_00000001`,
  });
  const view = new LinkChatView(adapter, directChats, settings, "0.24.0");
  view.attachGroupChatService(groups);
  view.mount();
  const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
  if (!shadow) throw new Error("Missing KikiLink shadow root");
  return { directChats, groups, view, shadow };
}

function clearHistoryButton(shadow: ShadowRoot): HTMLButtonElement {
  const button = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.includes("Clear all LinkChat history"));
  if (!button) throw new Error("Missing clear-history button");
  return button;
}

describe("group chat integration", () => {
  it("keeps groups separate from direct Beeps and switches panes without mixing state", async () => {
    const names = new Map([
      [10, "Kiki"],
      [20, "Reina"],
      [30, "Mina"],
    ]);
    const adapter = {
      getOwnMemberNumber: () => 10,
      getOwnName: () => "Kiki",
      getMemberName: (memberNumber: number) => names.get(memberNumber) ?? `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getKnownContacts: () => [
        { memberNumber: 20, memberName: "Reina" },
        { memberNumber: 30, memberName: "Mina" },
      ],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const directChats = new ChatService(new MemoryChatRepository(), settings);
    const groups = new GroupChatService(adapter, new MemoryKeyValueStorage(), {
      now: () => 1_000,
      idFactory: (prefix) => `${prefix}_00000001`,
    });
    const view = new LinkChatView(adapter, directChats, settings, "0.24.0");
    view.attachGroupChatService(groups);
    view.mount();

    const created = await groups.createGroup([20, 30], "Garden crew");
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-group-sidebar")?.textContent).toContain("Garden crew");
    });
    expect(shadow?.querySelector(".kl-conversations")).not.toBeNull();
    expect(shadow?.querySelector(".kl-group-list")).not.toBeNull();

    await view.openChat(20, "Reina");
    expect(view.isActiveConversation(20)).toBe(true);

    shadow
      ?.querySelector<HTMLButtonElement>(`[data-group-id="${created.group.groupId}"]`)
      ?.click();
    await vi.waitFor(() => {
      expect(view.getActiveGroupId()).toBe(created.group.groupId);
      expect(shadow?.querySelector<HTMLElement>(".kl-group-pane")?.hidden).toBe(false);
      expect(shadow?.querySelector<HTMLElement>(".kl-chat")?.hidden).toBe(true);
    });
    expect(view.isActiveConversation(20)).toBe(false);
    await directChats.capture({
      direction: "incoming",
      peerNumber: 20,
      peerName: "Reina",
      content: "Hidden behind the group",
      sentAt: 1_050,
      includeRoom: false,
    }, view.isActiveConversation(20));
    expect((await directChats.getConversation(20))?.unread).toBe(1);

    view.close();
    expect(view.getActiveGroupId()).toBeUndefined();
    await groups.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: created.group.groupId,
        i: "gmsg_hidden01",
        c: "Read me after reopening",
        u: 1_100,
      }),
    }, view.getActiveGroupId());
    expect(groups.getGroup(created.group.groupId)?.unread).toBe(1);

    await view.open();
    expect(view.getActiveGroupId()).toBeUndefined();
    shadow?.querySelector<HTMLButtonElement>('[data-target="chat"]')?.click();
    await vi.waitFor(() => {
      expect(view.getActiveGroupId()).toBe(created.group.groupId);
      expect(groups.getGroup(created.group.groupId)?.unread).toBe(0);
    });

    await view.openChat(20, "Reina");
    expect(view.getActiveGroupId()).toBeUndefined();
    expect(shadow?.querySelector<HTMLElement>(".kl-group-pane")?.hidden).toBe(true);
    expect(shadow?.querySelector<HTMLElement>(".kl-chat")?.hidden).toBe(false);

    vi.stubGlobal("confirm", vi.fn(() => true));
    shadow?.querySelector<HTMLButtonElement>('[data-target="settings"]')?.click();
    const clearHistory = [...(shadow?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
      .find((button) => button.textContent?.includes("Clear all LinkChat history"));
    clearHistory?.click();
    await vi.waitFor(async () => {
      expect(groups.listGroups()).toEqual([]);
      expect(await directChats.listConversations()).toEqual([]);
    });
    expect(shadow?.querySelector(".kl-group-list-item")).toBeNull();

    view.destroy();
  });

  it("warns when group history is cleared only for the session after silent storage denial", async () => {
    const storage = new SilentlyDeniedGroupStorage();
    const { groups, view, shadow } = setupClearHistoryView(storage);
    await groups.createGroup([20, 30], "Stored group");
    await groups.flush();
    storage.denied = true;

    vi.stubGlobal("confirm", vi.fn(() => true));
    await view.open();
    shadow.querySelector<HTMLButtonElement>('[data-target="settings"]')?.click();
    clearHistoryButton(shadow).click();

    await vi.waitFor(() => {
      const toast = shadow.querySelector<HTMLElement>(".kl-toast");
      expect(groups.listGroups()).toEqual([]);
      expect(toast?.getAttribute("role")).toBe("alert");
      expect(toast?.textContent).toContain("cleared for this session");
      expect(toast?.textContent).toContain("browser storage did not retain the change");
      expect(toast?.textContent).not.toContain("Direct and group chat history cleared");
    });

    view.destroy();
  });

  it("warns instead of claiming success when direct-chat storage clears only for the session", async () => {
    const { directChats, view, shadow } = setupClearHistoryView();
    vi.spyOn(directChats, "clearHistory").mockResolvedValueOnce(false);

    vi.stubGlobal("confirm", vi.fn(() => true));
    await view.open();
    shadow.querySelector<HTMLButtonElement>('[data-target="settings"]')?.click();
    clearHistoryButton(shadow).click();

    await vi.waitFor(() => {
      const toast = shadow.querySelector<HTMLElement>(".kl-toast");
      expect(toast?.getAttribute("role")).toBe("alert");
      expect(toast?.textContent).toContain("Direct chats are cleared for this session");
      expect(toast?.textContent).toContain("may reappear after reload");
      expect(toast?.textContent).not.toContain("Direct and group chat history cleared");
    });

    view.destroy();
  });

  it.each(["direct", "group"] as const)(
    "handles a rejected %s-history clear without an unhandled rejection or success toast",
    async (failure) => {
      const { directChats, groups, view, shadow } = setupClearHistoryView();
      const reason = new Error(`${failure} clear denied`);
      const clearOperation = failure === "direct"
        ? vi.spyOn(directChats, "clearHistory").mockRejectedValueOnce(reason)
        : vi.spyOn(groups, "clear").mockRejectedValueOnce(reason);
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const unhandled: unknown[] = [];
      const captureUnhandled = (unhandledReason: unknown): void => {
        unhandled.push(unhandledReason);
      };
      process.on("unhandledRejection", captureUnhandled);

      try {
        vi.stubGlobal("confirm", vi.fn(() => true));
        await view.open();
        shadow.querySelector<HTMLButtonElement>('[data-target="settings"]')?.click();
        clearHistoryButton(shadow).click();

        await vi.waitFor(() => {
          const toast = shadow.querySelector<HTMLElement>(".kl-toast");
          expect(clearOperation).toHaveBeenCalledOnce();
          expect(toast?.getAttribute("role")).toBe("alert");
          expect(toast?.textContent).toContain(
            "could not verify that all chat history was cleared",
          );
          expect(toast?.textContent).not.toContain("Direct and group chat history cleared");
        });
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(unhandled).toEqual([]);
      } finally {
        process.off("unhandledRejection", captureUnhandled);
        view.destroy();
      }
    },
  );
});
