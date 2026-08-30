// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { ConversationMeta, KikiLinkEvents } from "../src/core/types";
import { LinkActivitiesService } from "../src/modules/link-activities/link-activities-service";
import { ChatService } from "../src/modules/link-chat/chat-service";
import type {
  LitterboxUploadConfig,
  LocalImageUploader,
  PreparedLocalImage,
  UploadProgress,
} from "../src/modules/link-chat/image-upload";
import {
  GroupChatService,
  serializeGroupChatPacket,
} from "../src/modules/link-chat/group-chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { LinkRosterService } from "../src/modules/link-roster/link-roster-service";
import { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";
import { PeopleRepository } from "../src/storage/people-repository";
import { ProfileCacheRepository } from "../src/storage/profile-cache-repository";
import type { DeviceGalleryImage, GalleryStore } from "../src/storage/device-gallery-store";
import type { DeviceMusicTrack, MusicStore } from "../src/storage/device-music-store";

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function deferred<Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
} {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("LinkChatView", () => {
  it("keeps Blossom out of fixed DOM and exposes settings-only character placement", () => {
    let renderOverlay: ((character: BCCharacter, x: number, y: number, zoom: number) => void) | undefined;
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      canSendBeep: () => true,
      isReady: () => true,
      isInChatRoom: () => false,
      registerCharacterOverlay: (renderer: typeof renderOverlay) => {
        renderOverlay = renderer;
        return () => {
          renderOverlay = undefined;
        };
      },
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.20.0",
    );

    view.mount();
    const shadow = document.querySelector("#kikilink-root")?.shadowRoot;
    const blossom = shadow?.querySelector<HTMLElement>(".kl-room-blossom");
    const blossomSettings = shadow?.querySelector<HTMLElement>(".kl-room-badge-settings");

    expect(blossom).toBeNull();
    expect(renderOverlay).toBeTypeOf("function");
    expect(blossomSettings?.textContent).toContain("Move flower");
    expect(blossomSettings?.textContent).toContain("Normal gameplay cannot move it");
    expect(shadow?.querySelector('select[aria-label="Room Blossom position"]')).toBeNull();
    expect(shadow?.querySelector(".kl-room-badge-advanced")).toBeNull();
    expect(
      shadow?.querySelector<HTMLSelectElement>('select[aria-label="Profile image previews"]')
        ?.value,
    ).toBe("ask");
    expect(shadow?.querySelector<HTMLElement>(".kl-home-update")?.hidden).toBe(true);
    expect(shadow?.querySelector<HTMLAnchorElement>(".kl-home-update-button")?.href).toBe(
      "https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js",
    );
    expect(blossomSettings?.textContent).not.toMatch(/WCE|BCX|Before addon|Between WCE/i);
    const moveFlower = [...(blossomSettings?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
      .find((button) => button.textContent.includes("Move flower"));
    moveFlower?.click();
    expect(shadow?.querySelector(".kl-toast")?.textContent).toContain("Enter a chat room");
    expect(
      shadow?.querySelector<HTMLTextAreaElement>(".kl-afk-reply-message")?.placeholder,
    ).toBe("Hi, I'm AFK. Message me later!");

    view.destroy();
    expect(renderOverlay).toBeUndefined();
    expect(shadow?.querySelector(".kl-room-blossom")).toBeNull();
  });

  it("mounts, displays a conversation, and sends through the BC adapter", async () => {
    const sendBeep = vi.fn((peerNumber: number, content: string, includeRoom: boolean) => ({
      direction: "outgoing" as const,
      peerNumber,
      peerName: "Reina",
      content,
      sentAt: 500,
      includeRoom,
    }));
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep,
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    const view = new LinkChatView(adapter, service, settings, "0.3.1");

    view.mount();
    await view.openChat(123, "Reina");

    const host = document.querySelector("#kikilink-root");
    const shadow = host?.shadowRoot;
    expect((host as HTMLElement | null)?.dataset.theme).toBe("dark");
    const brandEmblem = shadow?.querySelector<HTMLImageElement>(
      ".kl-brand-emblem .kl-emblem-image",
    );
    const launcherEmblem = shadow?.querySelector<HTMLImageElement>(
      ".kl-launcher-emblem .kl-emblem-image",
    );
    expect(brandEmblem?.src).toContain("design/branding/kikilink-emblem.webp");
    expect(launcherEmblem?.src).toContain("design/branding/kikilink-emblem.webp");
    expect(shadow?.querySelector(".kl-panel")?.hasAttribute("hidden")).toBe(false);
    expect(shadow?.querySelector(".kl-chat-name")?.textContent).toBe("Reina");
    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.mobileView).toBe(
      "chat",
    );

    shadow?.querySelector<HTMLButtonElement>(".kl-action-chip")?.click();
    expect(shadow?.querySelector<HTMLTextAreaElement>(".kl-composer-input")?.value).toBe(
      "*waves to Reina*",
    );

    shadow?.querySelector<HTMLButtonElement>(".kl-back")?.click();
    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.mobileView).toBe(
      "list",
    );

    const composer = shadow?.querySelector<HTMLTextAreaElement>(".kl-composer-input");
    if (!composer) throw new Error("Missing LinkChat composer");
    composer.value = "Hello from KikiLink";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    shadow?.querySelector<HTMLButtonElement>(".kl-send")?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-message-bubble")?.textContent).toContain(
        "Hello from KikiLink",
      );
    });

    expect(sendBeep).toHaveBeenCalledWith(123, "Hello from KikiLink", false);
    const messageRow = shadow?.querySelector<HTMLElement>(".kl-message-row:last-child");
    expect(messageRow?.querySelector(".kl-message-side-actions")).not.toBeNull();
    expect(messageRow?.querySelector(".kl-message-bubble .kl-message-action")).toBeNull();
    expect(messageRow?.querySelector('[aria-label="Reply to message"] svg')).not.toBeNull();
    messageRow?.querySelector<HTMLButtonElement>('[aria-label="Reply to message"]')?.click();
    expect(composer.value).toBe("> Reply to Kiki: Hello from KikiLink\n");
    composer.value += "*Acknowledged*";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    shadow?.querySelector<HTMLButtonElement>(".kl-send")?.click();
    await vi.waitFor(() => expect(sendBeep).toHaveBeenCalledTimes(2));
    expect(sendBeep).toHaveBeenLastCalledWith(
      123,
      "> Reply to Kiki: Hello from KikiLink\n*Acknowledged*",
      false,
    );
    await vi.waitFor(() => {
      const replyRow = shadow?.querySelector<HTMLElement>(".kl-message-row:last-child");
      expect(replyRow?.querySelector(".kl-message-reply-author")?.textContent).toBe(
        "Quoted as Kiki",
      );
      expect(replyRow?.querySelector(".kl-message-reply-warning")?.textContent).toBe(
        "Unverified quote",
      );
      expect(replyRow?.querySelector(".kl-message-reply-excerpt")?.textContent).toBe(
        "Hello from KikiLink",
      );
      expect(replyRow?.querySelector(".kl-message-content")?.textContent).not.toContain(
        "> Reply to",
      );
      const action = replyRow?.querySelector("em.kl-message-action-text");
      expect(action?.textContent).toBe("*Acknowledged*");
      expect(action?.closest(".kl-message-content")?.lastChild).toBe(action);
    });
    expect(shadow?.querySelector(".kl-conversation-preview")?.textContent).toContain(
      "Acknowledged",
    );
    expect(shadow?.querySelector(".kl-conversation-preview")?.textContent).not.toContain(
      "Reply to",
    );
    composer.value = "*shares https://example.com/page * https://cdn.example/picture.png";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    shadow?.querySelector<HTMLButtonElement>(".kl-send")?.click();
    await vi.waitFor(() => expect(sendBeep).toHaveBeenCalledTimes(3));
    await vi.waitFor(() => {
      expect(
        shadow?.querySelector<HTMLElement>(".kl-message-row:last-child")
          ?.querySelector("em.kl-message-action-text")?.textContent,
      ).toBe("*shares https://example.com/page *");
    });
    const richActionRow = shadow?.querySelector<HTMLElement>(".kl-message-row:last-child");
    const richAction = richActionRow?.querySelector("em.kl-message-action-text");
    expect(richAction?.textContent).toBe("*shares https://example.com/page *");
    expect(richAction?.querySelector<HTMLAnchorElement>(".kl-message-link")?.href).toBe(
      "https://example.com/page",
    );
    expect(richActionRow?.querySelector(".kl-image-card")).not.toBeNull();
    expect(shadow?.querySelector(".kl-sidebar-heading span")?.textContent).toBe("Chats");

    shadow?.querySelector<HTMLButtonElement>('button[title="KikiLink settings"]')?.click();
    const themeSelect = shadow?.querySelector<HTMLSelectElement>('[data-setting="theme"]');
    const sideSelect = shadow?.querySelector<HTMLSelectElement>('[data-setting="launcher-side"]');
    const reducedMotion = shadow?.querySelector<HTMLInputElement>(
      'input[aria-label="Reduced motion"]',
    );
    if (!themeSelect || !sideSelect || !reducedMotion) {
      throw new Error("Missing appearance controls");
    }
    themeSelect.value = "light";
    sideSelect.value = "left";
    reducedMotion.checked = true;
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-settings-actions .kl-text-button--primary")
      ?.click();

    expect((host as HTMLElement | null)?.dataset.theme).toBe("light");
    expect((host as HTMLElement | null)?.dataset.reducedMotion).toBe("true");
    expect((shadow?.querySelector(".kl-launcher") as HTMLElement | null)?.dataset.side).toBe(
      "left",
    );

    view.destroy();
    expect(document.querySelector("#kikilink-root")).toBeNull();
  });

  it("reuses one direct-conversation snapshot throughout a refresh", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getOnlineFriends: () => [],
      canSendBeep: () => true,
      isReady: () => true,
      isInChatRoom: () => false,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    const listConversations = vi.spyOn(service, "listConversations");
    const view = new LinkChatView(adapter, service, settings, "0.27.0");

    view.mount();
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    await vi.waitFor(() => {
      expect(listConversations).toHaveBeenCalledOnce();
      expect(shadow?.querySelector(".kl-empty-copy")?.textContent).toContain("No chats yet");
    });
    listConversations.mockClear();

    await view.refresh();

    expect(listConversations).toHaveBeenCalledOnce();
    view.destroy();
  });

  it("does not rebuild detached DOM after a late conversation refresh resolves", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getOnlineFriends: () => [],
      canSendBeep: () => true,
      isReady: () => true,
      isInChatRoom: () => false,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    const lateConversations = deferred<ConversationMeta[]>();
    const listConversations = vi.spyOn(service, "listConversations")
      .mockImplementationOnce(() => lateConversations.promise);
    const view = new LinkChatView(adapter, service, settings, "0.27.0");

    view.mount();
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    expect(listConversations).toHaveBeenCalledOnce();
    view.destroy();
    lateConversations.resolve([{
      peerNumber: 123,
      peerName: "Late Reina",
      lastMessage: "This must never enter detached UI",
      lastMessageAt: 1_000,
      lastDirection: "incoming",
      unread: 1,
      pinned: false,
      draft: "",
    }]);
    await lateConversations.promise;
    await Promise.resolve();

    expect(shadow?.querySelector(".kl-conversation")).toBeNull();
    expect(shadow?.textContent).not.toContain("Late Reina");
  });

  it("unifies group and direct chats with clear group identity, shared search, and exact profile targets", async () => {
    const names = new Map<number, string>([
      [10, "Kiki"],
      [20, "Reina"],
      [30, "Mina"],
      [40, "Solitary Echo"],
    ]);
    const adapter = {
      getOwnMemberNumber: () => 10,
      getOwnName: () => "Kiki",
      getMemberName: (memberNumber: number) => names.get(memberNumber) ?? `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getKnownContacts: () => [20, 30, 40].map((memberNumber) => ({
        memberNumber,
        memberName: names.get(memberNumber) ?? `Member ${memberNumber}`,
      })),
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => true),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const presenceBus = new EventBus<KikiLinkEvents>();
    const presence = new LinkPresenceService(adapter, settings, presenceBus, "0.25.0");
    presence.start();
    for (const memberNumber of [20, 30]) {
      presenceBus.emit("bc:protocol", {
        senderNumber: memberNumber,
        channel: "beep",
        payload: JSON.stringify({
          t: "ps",
          s: "online",
          u: Date.now(),
          v: "0.25.0",
          g: 3,
        }),
      });
    }

    const directChats = new ChatService(new MemoryChatRepository(), settings);
    await directChats.capture({
      direction: "incoming",
      peerNumber: 40,
      peerName: "Solitary Echo",
      content: "A direct-only result",
      sentAt: 900,
      includeRoom: false,
    }, false);
    const groups = new GroupChatService(adapter, new MemoryKeyValueStorage(), {
      now: () => 1_000,
      idFactory: (prefix) => `${prefix}_00000001`,
    });
    const created = await groups.createGroup([20, 30], "Moon Garden Circle");
    await groups.receiveProtocol({
      senderNumber: 30,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: created.group.groupId,
        i: "gmsg_00000002",
        c: "A message from Mina: *waves*",
        u: 1_100,
      }),
    });

    const view = new LinkChatView(
      adapter,
      directChats,
      settings,
      "0.25.0",
      undefined,
      undefined,
      presence,
    );
    view.attachGroupChatService(groups);
    view.mount();
    await view.openChat(40, "Solitary Echo");

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    if (!shadow) throw new Error("Missing KikiLink shadow root");
    const chatList = shadow.querySelector<HTMLElement>(".kl-conversations");
    const heading = shadow.querySelector<HTMLElement>(".kl-sidebar-heading");
    if (!chatList || !heading) throw new Error("Missing unified chat list");
    expect(heading.textContent).toContain("Chats");
    expect(chatList.textContent).toContain("Moon Garden Circle");
    expect(chatList.textContent).toContain("Solitary Echo");
    const firstChat = chatList.querySelector<HTMLElement>(".kl-conversation");
    expect(firstChat?.classList.contains("kl-group-conversation")).toBe(true);
    expect(firstChat?.textContent).toContain("GROUP");
    const groupAvatar = firstChat?.querySelector<HTMLElement>(
      ".kl-group-conversation-avatar",
    );
    expect(groupAvatar?.dataset.avatarCount).toBe("2");
    expect(groupAvatar?.querySelectorAll(".kl-group-conversation-avatar-item")).toHaveLength(2);
    const unifiedStyles = shadow.querySelector("style")?.textContent ?? "";
    expect(unifiedStyles).toMatch(
      /\.kl-group-conversation-avatar\[data-avatar-count="2"\] \.kl-group-conversation-avatar-item\s*\{[^}]*grid-row: 1 \/ -1;/,
    );
    expect(unifiedStyles).toContain(
      ':host([data-density="super-compact"]) .kl-group-conversation-avatar { width: 36px; height: 36px;',
    );
    expect(unifiedStyles).toMatch(
      /\.kl-finder-result\s*\{[^}]*grid-template-columns: 42px minmax\(0, 1fr\) auto;[^}]*cursor: pointer;/,
    );
    expect(unifiedStyles).toMatch(
      /\.kl-roster-entry\s*\{[^}]*grid-template-columns: 42px minmax\(0, 1fr\);[^}]*cursor: default;/,
    );

    const sharedSearch = shadow.querySelector<HTMLInputElement>(".kl-search-wrap > .kl-search");
    if (!sharedSearch) throw new Error("Missing shared direct/group search");
    sharedSearch.value = "Moon Garden";
    sharedSearch.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => {
      expect(shadow.querySelector(".kl-group-conversation")?.textContent).toContain(
        "Moon Garden Circle",
      );
      expect(chatList.querySelector('.kl-conversation[data-member-number="40"]')).toBeNull();
    });

    sharedSearch.value = "Solitary Echo";
    sharedSearch.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => {
      expect(shadow.querySelector(".kl-group-conversation")).toBeNull();
      expect(shadow.querySelector(".kl-conversation")?.textContent).toContain("Solitary Echo");
    });

    sharedSearch.value = "";
    sharedSearch.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => expect(shadow.querySelector(".kl-group-conversation")).not.toBeNull());
    shadow.querySelector<HTMLButtonElement>(
      `[data-group-id="${created.group.groupId}"]`,
    )?.click();
    await vi.waitFor(() => {
      expect(view.getActiveGroupId()).toBe(created.group.groupId);
      expect(shadow.querySelector<HTMLElement>(".kl-group-pane")?.hidden).toBe(false);
    });

    const participant = shadow.querySelector<HTMLButtonElement>(
      '.kl-group-participant[data-group-member-number="20"]',
    );
    if (!participant) throw new Error("Missing Reina group participant profile button");
    expect(participant.type).toBe("button");
    expect(participant.getAttribute("aria-label")).toContain("Open KikiLink profile for Reina");
    expect(participant.querySelector('[data-group-member-avatar="true"]')).not.toBeNull();
    participant.click();
    await vi.waitFor(() => {
      expect(shadow.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
      expect(shadow.querySelector<HTMLElement>(".kl-addon-profile-card")?.dataset.memberNumber)
        .toBe("20");
    });
    shadow.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();

    const messageAvatar = shadow.querySelector<HTMLButtonElement>(
      '.kl-group-message-profile[data-group-member-number="30"]',
    );
    if (!messageAvatar) throw new Error("Missing Mina group-message profile button");
    expect(messageAvatar.type).toBe("button");
    expect(messageAvatar.getAttribute("aria-label")).toContain("Open KikiLink profile for Mina");
    expect(messageAvatar.closest(".kl-group-message")?.textContent).toContain(
      "A message from Mina",
    );
    expect(
      messageAvatar.closest(".kl-group-message")
        ?.querySelector("em.kl-message-action-text")?.textContent,
    ).toBe("*waves*");
    messageAvatar.click();
    await vi.waitFor(() => {
      expect(shadow.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
      expect(shadow.querySelector<HTMLElement>(".kl-addon-profile-card")?.dataset.memberNumber)
        .toBe("30");
    });
    shadow.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();

    shadow.querySelector<HTMLButtonElement>(".kl-group-new")?.click();
    const groupDialog = shadow.querySelector<HTMLDialogElement>(".kl-group-dialog");
    const contactProfile = groupDialog?.querySelector<HTMLButtonElement>(
      '.kl-group-contact-profile[data-group-member-number="20"]',
    );
    if (!groupDialog?.open || !contactProfile) {
      throw new Error("Missing modal group-contact profile target");
    }
    contactProfile.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 64, clientY: 72 }),
    );
    const menuLayer = shadow.querySelector<HTMLDialogElement>(".kl-profile-menu-layer");
    await vi.waitFor(() => {
      expect(menuLayer?.open).toBe(true);
      expect(menuLayer?.querySelector(".kl-profile-menu")?.textContent).toContain(
        "KikiLink Profile",
      );
      expect(groupDialog.open).toBe(true);
    });
    menuLayer?.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(menuLayer?.open).toBe(false);

    contactProfile.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "F10", shiftKey: true }),
    );
    await vi.waitFor(() => expect(menuLayer?.open).toBe(true));
    const addonProfileAction = [...(
      menuLayer?.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action") ?? []
    )].find((button) => button.textContent?.includes("KikiLink Profile"));
    if (!addonProfileAction) throw new Error("Missing modal KikiLink Profile action");
    addonProfileAction.click();
    await vi.waitFor(() => {
      expect(menuLayer?.open).toBe(false);
      expect(shadow.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
      expect(shadow.querySelector<HTMLElement>(".kl-addon-profile-card")?.dataset.memberNumber)
        .toBe("20");
    });

    let replacement = groupDialog.querySelector<HTMLButtonElement>(
      '.kl-group-contact-profile[data-group-member-number="20"]',
    );
    if (replacement === contactProfile) {
      replacement = contactProfile.cloneNode(true) as HTMLButtonElement;
      contactProfile.replaceWith(replacement);
    }
    if (!replacement) throw new Error("Missing rebuilt group-contact profile target");
    shadow.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();
    expect(shadow.activeElement).toBe(replacement);

    view.destroy();
    presence.stop();
    await groups.destroy();
  });

  it("keeps mixed chat rows keyed and exposes unclipped, contextual managed-group actions", async () => {
    const names = new Map<number, string>([
      [10, "Kiki"],
      [20, "Reina"],
      [30, "Mina"],
      [40, "Direct Echo"],
    ]);
    const adapter = {
      getOwnMemberNumber: () => 10,
      getOwnName: () => "Kiki",
      getMemberName: (memberNumber: number) => names.get(memberNumber) ?? `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getKnownContacts: () => [20, 30, 40].map((memberNumber) => ({
        memberNumber,
        memberName: names.get(memberNumber) ?? `Member ${memberNumber}`,
      })),
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => true),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const storage = new MemoryKeyValueStorage();
    const settings = new SettingsStore(storage);
    settings.update((draft) => {
      draft.linkChat.imagePreviews = "ask";
    });
    const presenceBus = new EventBus<KikiLinkEvents>();
    const presence = new LinkPresenceService(adapter, settings, presenceBus, "0.27.0");
    presence.start();
    for (const memberNumber of [20, 30]) {
      presenceBus.emit("bc:protocol", {
        senderNumber: memberNumber,
        channel: "beep",
        payload: JSON.stringify({
          t: "ps",
          s: "online",
          u: Date.now(),
          v: "0.27.0",
          g: 3,
        }),
      });
    }

    const directChats = new ChatService(new MemoryChatRepository(), settings);
    await directChats.capture({
      direction: "incoming",
      peerNumber: 40,
      peerName: "Direct Echo",
      content: "A direct conversation",
      sentAt: 900,
      includeRoom: false,
    }, false);
    let nextId = 0;
    const groups = new GroupChatService(adapter, storage, {
      now: () => 1_000 + nextId,
      idFactory: (prefix) => `${prefix}_${String(++nextId).padStart(8, "0")}`,
      hasManagedPeer: (memberNumber) => presence.hasGroupManagedPeer(memberNumber),
    });
    const created = await groups.createManagedGroup([20, 30], "Moon Garden Circle");
    const avatarUploads: Array<{
      signal: AbortSignal | undefined;
      resolve: (url: string) => void;
      reject: (reason?: unknown) => void;
    }> = [];
    const avatarImageUploader: LocalImageUploader<LitterboxUploadConfig> = {
      prepare: vi.fn(async () => ({
        blob: new Blob([Uint8Array.of(1, 2, 3)], { type: "image/webp" }),
        width: 256,
        height: 256,
        sourceBytes: 3,
      })),
      upload: vi.fn(async () => "https://litter.catbox.moe/not-used.webp"),
    };
    const avatarCatboxUpload = vi.fn(
      (
        _image: PreparedLocalImage,
        _onProgress?: (progress: UploadProgress) => void,
        signal?: AbortSignal,
      ) => new Promise<string>((resolve, reject) => {
        avatarUploads.push({ signal, resolve, reject });
        signal?.addEventListener(
          "abort",
          () => reject(new Error("The upload was cancelled")),
          { once: true },
        );
      }),
    );
    const view = new LinkChatView(
      adapter,
      directChats,
      settings,
      "0.27.0",
      undefined,
      undefined,
      presence,
      avatarImageUploader,
      undefined,
      undefined,
      undefined,
      avatarCatboxUpload,
    );
    view.attachGroupChatService(groups);
    view.mount();
    await view.openChat(40, "Direct Echo");

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    if (!shadow) throw new Error("Missing KikiLink shadow root");
    const toolbarGroupButton = shadow.querySelector<HTMLButtonElement>(".kl-toolbar-group-button");
    expect(toolbarGroupButton?.classList.contains("kl-sidebar-new-group")).toBe(true);
    expect(toolbarGroupButton?.title).toBe("Create group chat (3–5 people)");
    expect(toolbarGroupButton?.getAttribute("aria-label")).toBe(
      "Create group chat with 3–5 people",
    );

    const groupSelector = `[data-conversation-key="group:${created.group.groupId}"]`;
    const directSelector = '[data-conversation-key="direct:40"]';
    await vi.waitFor(() => {
      expect(shadow.querySelector(groupSelector)).not.toBeNull();
      expect(shadow.querySelector(directSelector)).not.toBeNull();
    });
    const groupRow = shadow.querySelector<HTMLButtonElement>(groupSelector);
    const directRow = shadow.querySelector<HTMLButtonElement>(directSelector);
    const groupAvatar = groupRow?.querySelector<HTMLElement>(".kl-group-conversation-avatar");
    const groupAvatarInner = groupAvatar?.querySelector<HTMLElement>(
      ".kl-group-conversation-avatar-inner",
    );
    const groupMark = groupAvatar?.querySelector<HTMLElement>(".kl-group-conversation-mark");
    const directAvatar = directRow?.querySelector<HTMLElement>(".kl-avatar");
    if (!groupRow || !directRow || !groupAvatar || !groupAvatarInner || !groupMark || !directAvatar) {
      throw new Error("Missing keyed mixed-chat rows");
    }
    expect(groupMark.parentElement).toBe(groupAvatar);
    expect(groupAvatarInner.contains(groupMark)).toBe(false);

    groupRow.focus();
    const listConversations = vi.spyOn(directChats, "listConversations");
    await groups.setDraft(created.group.groupId, "A keyed group draft");
    await vi.waitFor(() => {
      expect(groupRow.querySelector(".kl-conversation-preview")?.textContent).toContain(
        "Draft: A keyed group draft",
      );
    });
    expect(shadow.querySelector(groupSelector)).toBe(groupRow);
    expect(groupRow.querySelector(".kl-group-conversation-avatar")).toBe(groupAvatar);
    expect(groupAvatar.querySelector(".kl-group-conversation-avatar-inner")).toBe(
      groupAvatarInner,
    );
    expect(shadow.querySelector(directSelector)).toBe(directRow);
    expect(directRow.querySelector(".kl-avatar")).toBe(directAvatar);
    expect(shadow.activeElement).toBe(groupRow);
    expect(listConversations).not.toHaveBeenCalled();

    groupRow.click();
    await vi.waitFor(() => expect(view.getActiveGroupId()).toBe(created.group.groupId));
    groupRow.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 72, clientY: 84 }),
    );
    const groupMenu = shadow.querySelector<HTMLDialogElement>(".kl-group-menu-layer");
    await vi.waitFor(() => expect(groupMenu?.open).toBe(true));
    expect(groupMenu?.querySelector(".kl-group-menu")?.textContent).toContain("Manage group");
    expect(groupMenu?.querySelector(".kl-group-menu")?.textContent).toContain("Attach image");
    expect(groupMenu?.querySelector(".kl-group-menu")?.textContent).toContain("Pin group");
    expect(groupMenu?.querySelector(".kl-group-menu")?.textContent).toContain("Close chat");
    expect(groupMenu?.querySelector(".kl-group-menu")?.textContent).toContain(
      "Remove from this device",
    );

    groupMenu
      ?.querySelector<HTMLButtonElement>('[data-group-action="details"]')
      ?.click();
    const groupDetails = shadow.querySelector<HTMLDialogElement>(".kl-group-details-dialog");
    await vi.waitFor(() => expect(groupDetails?.open).toBe(true));
    const chooseAvatar = groupDetails?.querySelector<HTMLButtonElement>(
      '[data-group-details-action="pick-avatar"]',
    );
    const avatarFileInput = shadow.querySelector<HTMLInputElement>(
      ".kl-group-avatar-file-input",
    );
    if (!chooseAvatar || !avatarFileInput) throw new Error("Missing group avatar picker");
    chooseAvatar.focus();
    chooseAvatar.click();
    avatarFileInput.dispatchEvent(new Event("cancel"));
    expect(shadow.activeElement).toBe(chooseAvatar);

    chooseAvatar.click();
    const guardedIdentity = vi.spyOn(adapter, "getOwnMemberNumber").mockImplementation(() => {
      throw new Error("BC identity proxy is guarded");
    });
    const guardedAvatarFile = new File([Uint8Array.of(1, 2, 3)], "guarded-avatar.png", {
      type: "image/png",
    });
    Object.defineProperty(avatarFileInput, "files", {
      configurable: true,
      value: [guardedAvatarFile],
    });
    avatarFileInput.dispatchEvent(new Event("change", { bubbles: true }));
    guardedIdentity.mockRestore();
    await vi.waitFor(() => {
      expect(shadow.querySelector(".kl-toast")?.textContent).toContain(
        "identity could not be verified",
      );
    });
    expect(avatarUploads).toHaveLength(0);

    chooseAvatar.click();
    const firstAvatarFile = new File([Uint8Array.of(1, 2, 3)], "first-avatar.png", {
      type: "image/png",
    });
    Object.defineProperty(avatarFileInput, "files", {
      configurable: true,
      value: [firstAvatarFile],
    });
    avatarFileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(avatarUploads).toHaveLength(1));
    expect(avatarUploads[0]?.signal?.aborted).toBe(false);
    await groups.setGroupAvatar(
      created.group.groupId,
      "https://files.catbox.moe/newer-manual-avatar.webp",
    );
    avatarUploads[0]?.resolve("https://files.catbox.moe/stale-upload-avatar.webp");
    await vi.waitFor(() => {
      expect(groups.getGroup(created.group.groupId)?.avatarUrl).toBe(
        "https://files.catbox.moe/newer-manual-avatar.webp",
      );
      expect(shadow.querySelector(".kl-toast")?.textContent).toContain("newer avatar was kept");
    });
    groupDetails
      ?.querySelector<HTMLButtonElement>('[data-group-details-action="close"]')
      ?.click();

    groupRow.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 72, clientY: 84 }),
    );
    await vi.waitFor(() => expect(groupMenu?.open).toBe(true));

    groupMenu
      ?.querySelector<HTMLButtonElement>('[data-group-action="attach-image"]')
      ?.click();
    const imageDialog = shadow.querySelector<HTMLDialogElement>(".kl-image-dialog");
    await vi.waitFor(() => expect(imageDialog?.open).toBe(true));
    expect(imageDialog?.textContent).toContain(
      "Share a direct image link with every current group member.",
    );
    const imageUrl = imageDialog?.querySelector<HTMLInputElement>(".kl-image-url");
    if (!imageUrl) throw new Error("Missing managed-group image URL control");
    imageUrl.value = "https://files.catbox.moe/group-picture.webp";
    imageUrl.dispatchEvent(new Event("input", { bubbles: true }));
    const imageSendGate = deferred<void>();
    const originalGroupSend = groups.sendMessage.bind(groups);
    const sendGroupMessage = vi.spyOn(groups, "sendMessage").mockImplementationOnce(
      async (groupId, content) => {
        await imageSendGate.promise;
        return originalGroupSend(groupId, content);
      },
    );
    const imageSend = imageDialog?.querySelector<HTMLButtonElement>(
      ".kl-text-button--primary",
    );
    imageSend?.click();
    imageSend?.click();
    expect(imageSend?.disabled).toBe(true);
    expect(sendGroupMessage).toHaveBeenCalledOnce();
    expect(sendGroupMessage).toHaveBeenCalledWith(
      created.group.groupId,
      "https://files.catbox.moe/group-picture.webp",
    );
    imageSendGate.resolve();
    await vi.waitFor(() => {
      expect(imageDialog?.open).toBe(false);
      expect(shadow.querySelector(".kl-group-message .kl-image-card")).not.toBeNull();
    });
    const originalImage = shadow.querySelector<HTMLAnchorElement>(
      ".kl-group-message .kl-image-open",
    );
    expect(originalImage?.href).toBe("https://files.catbox.moe/group-picture.webp");
    expect(originalImage?.target).toBe("_blank");
    expect(originalImage?.rel).toContain("noopener");
    expect(originalImage?.referrerPolicy).toBe("no-referrer");

    const search = shadow.querySelector<HTMLInputElement>(".kl-search-wrap > .kl-search");
    if (!search) throw new Error("Missing mixed-chat search");
    search.value = "Direct Echo";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => expect(shadow.querySelector(groupSelector)).toBeNull());
    expect(groupRow.isConnected).toBe(false);
    groupRow.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 72, clientY: 84 }),
    );
    expect(groupMenu?.open).toBe(false);

    shadow.querySelector<HTMLButtonElement>(".kl-group-pane-menu-trigger")?.click();
    await vi.waitFor(() => expect(groupMenu?.open).toBe(true));
    groupMenu
      ?.querySelector<HTMLButtonElement>('[data-group-action="details"]')
      ?.click();
    await vi.waitFor(() => expect(groupDetails?.open).toBe(true));
    const secondChooseAvatar = groupDetails?.querySelector<HTMLButtonElement>(
      '[data-group-details-action="pick-avatar"]',
    );
    if (!secondChooseAvatar) throw new Error("Missing rebuilt group avatar picker");
    secondChooseAvatar.click();
    const secondAvatarFile = new File([Uint8Array.of(4, 5, 6)], "second-avatar.png", {
      type: "image/png",
    });
    Object.defineProperty(avatarFileInput, "files", {
      configurable: true,
      value: [secondAvatarFile],
    });
    avatarFileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(avatarUploads).toHaveLength(2));

    view.close();

    expect(avatarUploads[1]?.signal?.aborted).toBe(true);
    expect(groupDetails?.open).toBe(false);
    expect(groupMenu?.open).toBe(false);
    expect(groups.getGroup(created.group.groupId)?.avatarUrl).toBe(
      "https://files.catbox.moe/newer-manual-avatar.webp",
    );

    view.destroy();
    presence.stop();
    await groups.destroy();
  });

  it("deduplicates a deferred direct send and keeps a newly selected peer draft intact", async () => {
    const names = new Map<number, string>([
      [20, "Reina"],
      [30, "Mina"],
    ]);
    const sendBeep = vi.fn((peerNumber: number, content: string, includeRoom: boolean) => ({
      direction: "outgoing" as const,
      peerNumber,
      peerName: names.get(peerNumber) ?? `Member ${peerNumber}`,
      content,
      sentAt: 1_000,
      includeRoom,
    }));
    const adapter = {
      getOwnMemberNumber: () => 10,
      getOwnName: () => "Kiki",
      getMemberName: (memberNumber: number) => names.get(memberNumber) ?? `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getKnownContacts: () => [20, 30].map((memberNumber) => ({
        memberNumber,
        memberName: names.get(memberNumber) ?? `Member ${memberNumber}`,
      })),
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep,
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const chats = new ChatService(new MemoryChatRepository(), settings);
    await chats.ensureConversation(20, "Reina");
    await chats.ensureConversation(30, "Mina");
    await chats.setDraft(30, "Mina", "Mina's preserved draft");
    const captureGate = deferred<void>();
    const originalCapture = chats.capture.bind(chats);
    const capture = vi.spyOn(chats, "capture").mockImplementationOnce(async (event, markRead) => {
      await captureGate.promise;
      return originalCapture(event, markRead);
    });
    const view = new LinkChatView(adapter, chats, settings, "0.27.0");
    view.mount();
    await view.openChat(20, "Reina");

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    const composer = shadow?.querySelector<HTMLTextAreaElement>(".kl-composer-input");
    const send = shadow?.querySelector<HTMLButtonElement>(".kl-send");
    if (!shadow || !composer || !send) throw new Error("Missing direct-chat composer");
    composer.value = "One deferred message";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    send.click();
    send.click();
    await vi.waitFor(() => {
      expect(sendBeep).toHaveBeenCalledOnce();
      expect(capture).toHaveBeenCalledOnce();
      expect(send.disabled).toBe(true);
    });

    await view.openChat(30, "Mina");
    expect(shadow.querySelector(".kl-chat-name")?.textContent).toBe("Mina");
    expect(composer.value).toBe("Mina's preserved draft");
    captureGate.resolve();
    await vi.waitFor(async () => {
      expect((await chats.getMessages(20)).at(-1)?.content).toBe("One deferred message");
      expect(send.disabled).toBe(false);
    });
    expect(shadow.querySelector(".kl-chat-name")?.textContent).toBe("Mina");
    expect(composer.value).toBe("Mina's preserved draft");
    expect((await chats.getConversation(20))?.draft).toBe("");
    expect((await chats.getConversation(30))?.draft).toBe("Mina's preserved draft");

    view.destroy();
  });

  it("opens a saved public profile immediately and labels it as a non-live snapshot", async () => {
    const storage = new MemoryKeyValueStorage();
    const settings = new SettingsStore(storage);
    settings.update((draft) => {
      draft.linkChat.imagePreviews = "never";
    });
    const cache = new ProfileCacheRepository(storage);
    cache.upsert({
      memberNumber: 123,
      displayName: "Reina",
      avatarUrl: "https://files.catbox.moe/reina-avatar.webp",
      avatarFrame: "rose",
      profileStyle: "garden",
      bannerUrl: "https://files.catbox.moe/reina-banner.webp",
      profileOutlineColor: "#a11234",
      profileGradient: { enabled: true, primary: "#8a1538", secondary: "#2a9d8f" },
      addonVersion: "0.26.0",
    }, Date.now() - 1_000);
    const sendKikiLinkProtocol = vi.fn(
      (_memberNumber: number, _payload: string) => "beep" as const,
    );
    const adapter = {
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getMemberName: () => "Reina",
      getMemberNickname: () => undefined,
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => false,
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      getPlayerRelationships: () => [],
      refreshOnlineFriends: vi.fn(() => false),
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol,
      broadcastKikiLinkProtocol: vi.fn(() => false),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const bus = new EventBus<KikiLinkEvents>();
    const presence = new LinkPresenceService(adapter, settings, bus, "0.26.0", cache);
    presence.start();
    const chats = new ChatService(new MemoryChatRepository(), settings);
    await chats.ensureConversation(123, "Reina");
    const view = new LinkChatView(
      adapter,
      chats,
      settings,
      "0.27.0",
      undefined,
      undefined,
      presence,
    );
    view.mount();
    await view.openChat(123, "Reina");

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLElement>(".kl-chat-header > .kl-avatar")?.click();
    await vi.waitFor(() => {
      const card = shadow?.querySelector<HTMLElement>(".kl-addon-profile-card");
      expect(card?.textContent).toContain("SAVED PROFILE");
      expect(card?.textContent).toContain("Saved ·");
      expect(card?.textContent).toContain("Status unavailable");
      expect(card?.dataset.customGradient).toBe("true");
      expect(card?.dataset.profileStyle).toBe("garden");
      expect(card?.querySelector<HTMLElement>(".kl-addon-profile-avatar-shell")?.dataset.frame)
        .toBe("rose");
    });
    expect(
      sendKikiLinkProtocol.mock.calls
        .map(([, payload]) => JSON.parse(payload) as Record<string, unknown>)
        .some((packet) => packet.t === "pq" && packet.p === 1),
    ).toBe(true);

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://files.catbox.moe/reina-avatar.webp",
        f: "rose",
        c: "garden",
        u: Date.now(),
        v: "0.26.1",
      }),
    });
    await vi.waitFor(() => {
      const card = shadow?.querySelector<HTMLElement>(".kl-addon-profile-card");
      expect(card?.textContent).toContain("SAVED DETAILS");
      expect(card?.textContent).not.toContain("SAVED PROFILE");
      expect(card?.textContent).toContain("Live v0.26.1 · details saved");
      expect(card?.textContent).toContain("Online");
    });

    view.destroy();
    presence.stop();
  });

  it("keeps a newer group activation authoritative across pending direct-chat awaits", async () => {
    const names = new Map<number, string>([
      [10, "Kiki"],
      [20, "Reina"],
      [30, "Mina"],
      [40, "Solitary Echo"],
    ]);
    const adapter = {
      getOwnMemberNumber: () => 10,
      getOwnName: () => "Kiki",
      getMemberName: (memberNumber: number) => names.get(memberNumber) ?? `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getKnownContacts: () => [20, 30, 40].map((memberNumber) => ({
        memberNumber,
        memberName: names.get(memberNumber) ?? `Member ${memberNumber}`,
      })),
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => true),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const directChats = new ChatService(new MemoryChatRepository(), settings);
    await directChats.capture({
      direction: "incoming",
      peerNumber: 40,
      peerName: "Solitary Echo",
      content: "Existing direct chat",
      sentAt: 900,
      includeRoom: false,
    }, true);
    const groups = new GroupChatService(adapter, new MemoryKeyValueStorage(), {
      now: () => 1_000,
      idFactory: (prefix) => `${prefix}_00000001`,
    });
    const created = await groups.createGroup([20, 30], "Moon Garden Circle");
    const presenceBus = new EventBus<KikiLinkEvents>();
    const presence = new LinkPresenceService(adapter, settings, presenceBus, "0.25.0");
    presence.start();
    const view = new LinkChatView(
      adapter,
      directChats,
      settings,
      "0.25.0",
      undefined,
      undefined,
      presence,
    );
    view.attachGroupChatService(groups);
    view.mount();
    await view.openChat(40, "Solitary Echo");

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    if (!shadow) throw new Error("Missing KikiLink shadow root");
    const activateGroup = (): void => {
      const target = shadow.querySelector<HTMLButtonElement>(
        `[data-group-id="${created.group.groupId}"]`,
      );
      if (!target) throw new Error("Missing group navigation target");
      target.click();
    };
    const expectOnlyGroupVisible = (): void => {
      expect(view.getActiveGroupId()).toBe(created.group.groupId);
      expect(shadow.querySelector<HTMLElement>(".kl-group-pane")?.hidden).toBe(false);
      expect(shadow.querySelector<HTMLElement>(".kl-chat")?.hidden).toBe(true);
    };

    // Public openChat has multiple awaits before #selectConversation. A group click during the
    // first lookup must invalidate the whole older direct intent.
    const conversationLookup = deferred<ConversationMeta | undefined>();
    const getConversation = vi.spyOn(directChats, "getConversation")
      .mockImplementationOnce(() => conversationLookup.promise);
    const pendingLookupSelection = view.openChat(20, "Reina");
    expect(getConversation).toHaveBeenCalledWith(20);
    activateGroup();
    await vi.waitFor(expectOnlyGroupVisible);
    conversationLookup.resolve(undefined);
    await pendingLookupSelection;
    expectOnlyGroupVisible();
    getConversation.mockRestore();

    // The same intent must survive into #selectConversation, where a later group click can race
    // the second ensureConversation await.
    const storedConversation = await directChats.getConversation(40);
    if (!storedConversation) throw new Error("Missing stored direct conversation");
    const selectionLookup = deferred<ConversationMeta>();
    const originalEnsureConversation = directChats.ensureConversation.bind(directChats);
    let ensureCalls = 0;
    const ensureConversation = vi.spyOn(directChats, "ensureConversation")
      .mockImplementation((peerNumber, peerName) => {
        ensureCalls += 1;
        return ensureCalls === 2
          ? selectionLookup.promise
          : originalEnsureConversation(peerNumber, peerName);
      });
    const pendingInnerSelection = view.openChat(40, "Solitary Echo");
    await vi.waitFor(() => expect(ensureCalls).toBe(2));
    activateGroup();
    await vi.waitFor(expectOnlyGroupVisible);
    selectionLookup.resolve(storedConversation);
    await pendingInnerSelection;
    expectOnlyGroupVisible();
    ensureConversation.mockRestore();

    // Closing the deck is also a newer navigation intent: a pending public open must not reopen it.
    const closeLookup = deferred<ConversationMeta | undefined>();
    const closeGetConversation = vi.spyOn(directChats, "getConversation")
      .mockImplementationOnce(() => closeLookup.promise);
    const pendingClosedSelection = view.openChat(20, "Reina");
    expect(closeGetConversation).toHaveBeenCalledWith(20);
    view.close();
    closeLookup.resolve(undefined);
    await pendingClosedSelection;
    expect(shadow.querySelector<HTMLElement>(".kl-panel")?.hidden).toBe(true);
    closeGetConversation.mockRestore();

    view.destroy();
    presence.stop();
    await groups.destroy();
  });

  it("avoids detached group-sidebar avatar work and cancels unified-list loads on teardown", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const names = new Map<number, string>([
      [10, "Kiki"],
      [20, "Reina"],
      [30, "Mina"],
      [40, "Aya"],
      [50, "Nora"],
    ]);
    const adapter = {
      getOwnMemberNumber: () => 10,
      getOwnName: () => "Kiki",
      getMemberName: (memberNumber: number) => names.get(memberNumber) ?? `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getKnownContacts: () => [...names]
        .filter(([memberNumber]) => memberNumber !== 10)
        .map(([memberNumber, memberName]) => ({ memberNumber, memberName })),
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => true),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkChat.imagePreviews = "always";
      draft.linkPresence.profileImagePreviews = "always";
    });
    const presenceBus = new EventBus<KikiLinkEvents>();
    const presence = new LinkPresenceService(adapter, settings, presenceBus, "0.25.0");
    presence.start();
    for (const memberNumber of [20, 30, 40, 50]) {
      presenceBus.emit("bc:protocol", {
        senderNumber: memberNumber,
        channel: "beep",
        payload: JSON.stringify({
          t: "ps",
          s: "online",
          a: `https://cdn.example/avatar-${memberNumber}.webp`,
          u: Date.now(),
          v: "0.25.0",
          g: 3,
        }),
      });
    }
    const firstGroups = new GroupChatService(adapter, new MemoryKeyValueStorage(), {
      idFactory: (prefix) => `${prefix}_00000001`,
    });
    const secondGroups = new GroupChatService(adapter, new MemoryKeyValueStorage(), {
      idFactory: (prefix) => `${prefix}_00000002`,
    });
    await firstGroups.createGroup([20, 30], "First garden");
    await secondGroups.createGroup([40, 50], "Second garden");

    const loads: Array<{ url: string; signal: AbortSignal }> = [];
    const remoteImageLoader = {
      load: vi.fn((url: string, signal?: AbortSignal) => {
        if (!signal) throw new Error("Missing avatar abort signal");
        loads.push({ url, signal });
        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("cancelled", "AbortError")),
            { once: true },
          );
        });
      }),
      destroy: vi.fn(),
    };
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.25.0",
      undefined,
      undefined,
      presence,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      remoteImageLoader,
    );

    view.attachGroupChatService(firstGroups);
    expect(loads).toHaveLength(0);

    view.attachGroupChatService(secondGroups);
    expect(loads).toHaveLength(0);

    view.mount();
    await vi.waitFor(() => {
      expect(loads.filter(({ url }) => /avatar-(40|50)\.webp$/u.test(url))).toHaveLength(2);
    });
    const retainedLoads = loads.filter(({ url }) => /avatar-(40|50)\.webp$/u.test(url));
    expect(retainedLoads.every(({ signal }) => !signal.aborted)).toBe(true);
    view.destroy();
    expect(retainedLoads.every(({ signal }) => signal.aborted)).toBe(true);
    expect(remoteImageLoader.destroy).toHaveBeenCalledOnce();
    presence.stop();
    await firstGroups.destroy();
    await secondGroups.destroy();
  });

  it("gates remote avatars by visibility and bounds their decoded residency without thrash", async () => {
    let visibilityCallback: IntersectionObserverCallback | undefined;
    const observe = vi.fn();
    const unobserve = vi.fn();
    class TestIntersectionObserver {
      readonly root = null;
      readonly rootMargin = "240px 0px";
      readonly thresholds = [0.01];

      constructor(callback: IntersectionObserverCallback) {
        visibilityCallback = callback;
      }

      observe = observe;
      unobserve = unobserve;
      disconnect = vi.fn();
      takeRecords = (): IntersectionObserverEntry[] => [];
    }
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);

    const peerNumbers = Array.from({ length: 13 }, (_, index) => 20 + index);
    const names = new Map<number, string>([
      [10, "Kiki"],
      ...peerNumbers.map((memberNumber) => [memberNumber, `Member ${memberNumber}`] as const),
    ]);
    const adapter = {
      getOwnMemberNumber: () => 10,
      getOwnName: () => "Kiki",
      getMemberName: (memberNumber: number) => names.get(memberNumber) ?? `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getKnownContacts: () => peerNumbers.map((memberNumber) => ({
        memberNumber,
        memberName: names.get(memberNumber) ?? `Member ${memberNumber}`,
      })),
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => true),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkChat.imagePreviews = "always";
      draft.linkPresence.profileImagePreviews = "always";
    });
    const chats = new ChatService(new MemoryChatRepository(), settings);
    for (const memberNumber of peerNumbers) {
      await chats.ensureConversation(memberNumber, names.get(memberNumber)!);
    }
    const presenceBus = new EventBus<KikiLinkEvents>();
    const presence = new LinkPresenceService(adapter, settings, presenceBus, "0.27.0");
    presence.start();
    for (const memberNumber of peerNumbers) {
      presenceBus.emit("bc:protocol", {
        senderNumber: memberNumber,
        channel: "beep",
        payload: JSON.stringify({
          t: "ps",
          s: "online",
          a: `https://cdn.example/avatar-${memberNumber}.webp`,
          u: Date.now() + memberNumber,
          v: "0.27.0",
          g: 3,
        }),
      });
    }
    const groups = new GroupChatService(adapter, new MemoryKeyValueStorage(), {
      idFactory: (prefix) => `${prefix}_avatar_visibility`,
      hasManagedPeer: () => true,
    });
    const created = await groups.createManagedGroup([20, 21], "Visible garden");
    const groupAvatarUrl = "https://cdn.example/visible-group.webp";
    await groups.setGroupAvatar(created.group.groupId, groupAvatarUrl);

    const pendingSignals: AbortSignal[] = [];
    const pendingAvatarUrl = "https://cdn.example/avatar-20.webp";
    const failedAvatarUrl = "https://cdn.example/avatar-22.webp";
    let failedAvatarAttempts = 0;
    const remoteImageLoader = {
      load: vi.fn((url: string, signal?: AbortSignal) => {
        if (!signal) throw new Error("Missing decoration abort signal");
        if (url === failedAvatarUrl && failedAvatarAttempts++ === 0) {
          return Promise.reject(new Error("blocked remote avatar"));
        }
        if (url !== pendingAvatarUrl) {
          return Promise.resolve(`blob:kikilink/${encodeURIComponent(url)}`);
        }
        pendingSignals.push(signal);
        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("cancelled", "AbortError")),
            { once: true },
          );
        });
      }),
      destroy: vi.fn(),
    };
    const view = new LinkChatView(
      adapter,
      chats,
      settings,
      "0.27.0",
      undefined,
      undefined,
      presence,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      remoteImageLoader,
    );
    view.attachGroupChatService(groups);
    view.mount();
    await view.openChat(21, names.get(21));
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    if (!shadow) throw new Error("Missing LinkChat shadow root");
    const directAvatars = peerNumbers.map((memberNumber) => {
      const target = shadow.querySelector<HTMLElement>(
        `.kl-conversation[data-member-number="${memberNumber}"] .kl-avatar`,
      );
      if (!target) throw new Error(`Missing avatar for member ${memberNumber}`);
      return target;
    });
    const groupAvatar = shadow.querySelector<HTMLElement>(
      `.kl-group-conversation[data-group-id="${created.group.groupId}"] ` +
      ".kl-group-conversation-avatar-inner",
    );
    if (!groupAvatar) throw new Error("Missing custom group avatar");
    const chatHeaderAvatar = shadow.querySelector<HTMLElement>(".kl-chat-header > .kl-avatar");
    if (!chatHeaderAvatar) throw new Error("Missing active chat avatar");
    const visibleTargets = [...directAvatars, groupAvatar, chatHeaderAvatar];

    expect(remoteImageLoader.load).not.toHaveBeenCalled();
    visibilityCallback?.(
      visibleTargets.map(
        (target) => ({ target, isIntersecting: true }) as unknown as IntersectionObserverEntry,
      ),
      {} as IntersectionObserver,
    );
    await vi.waitFor(() => expect(remoteImageLoader.load).toHaveBeenCalledTimes(15));
    expect(remoteImageLoader.load).toHaveBeenCalledWith(
      groupAvatarUrl,
      expect.any(AbortSignal),
    );

    directAvatars[0]?.remove();
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await vi.waitFor(() => expect(pendingSignals[0]?.aborted).toBe(true));

    const connectedTargets = visibleTargets.filter((target) => target.isConnected);
    await vi.waitFor(() => {
      expect(connectedTargets.filter((target) => target.querySelector("img"))).toHaveLength(13);
    });
    for (const target of connectedTargets) {
      const image = target.querySelector<HTMLImageElement>("img");
      if (!image) continue;
      expect(image.loading).toBe("eager");
      image.dispatchEvent(new Event("load"));
    }
    await vi.waitFor(() => {
      expect(connectedTargets.filter((target) => target.querySelector("img"))).toHaveLength(12);
    });
    expect(chatHeaderAvatar.querySelector("img")).not.toBeNull();
    const failedAvatar = directAvatars[2];
    if (!failedAvatar) throw new Error("Missing failed-avatar target");
    await vi.waitFor(() => expect(failedAvatar.dataset.avatarState).toBe("error"));

    await view.openChat(21, names.get(21));
    await Promise.resolve();
    expect(remoteImageLoader.load).toHaveBeenCalledTimes(15);
    visibilityCallback?.(
      [{ target: failedAvatar, isIntersecting: true } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await Promise.resolve();
    expect(remoteImageLoader.load).toHaveBeenCalledTimes(15);
    visibilityCallback?.(
      [{ target: failedAvatar, isIntersecting: false } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(remoteImageLoader.load).toHaveBeenCalledTimes(15);
    visibilityCallback?.(
      [{ target: failedAvatar, isIntersecting: true } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await vi.waitFor(() => expect(remoteImageLoader.load).toHaveBeenCalledTimes(16));
    const retriedImage = await vi.waitFor(() => {
      const image = failedAvatar.querySelector<HTMLImageElement>("img");
      expect(image).not.toBeNull();
      return image!;
    });
    retriedImage.dispatchEvent(new Event("load"));

    const capacityPaused = connectedTargets.find(
      (target) => target.dataset.avatarState === "paused" && !target.querySelector("img"),
    );
    if (!capacityPaused) throw new Error("Missing capacity-paused remote avatar");

    await view.openChat(21, names.get(21));
    await Promise.resolve();
    expect(capacityPaused.dataset.avatarState).toBe("paused");
    expect(remoteImageLoader.load).toHaveBeenCalledTimes(16);

    visibilityCallback?.(
      [{ target: capacityPaused, isIntersecting: true } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await Promise.resolve();
    expect(remoteImageLoader.load).toHaveBeenCalledTimes(16);

    visibilityCallback?.(
      [{ target: capacityPaused, isIntersecting: false } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(remoteImageLoader.load).toHaveBeenCalledTimes(16);
    visibilityCallback?.(
      [{ target: capacityPaused, isIntersecting: true } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await vi.waitFor(() => expect(remoteImageLoader.load).toHaveBeenCalledTimes(17));

    const resumedImage = await vi.waitFor(() => {
      const image = capacityPaused.querySelector<HTMLImageElement>("img");
      expect(image).not.toBeNull();
      return image!;
    });
    resumedImage.dispatchEvent(new Event("load"));
    view.close();
    await vi.waitFor(() => {
      expect(connectedTargets.every((target) => target.querySelector("img") === null)).toBe(true);
    });

    await view.openChat(21, names.get(21));
    const reopenedHeaderAvatar = shadow.querySelector<HTMLElement>(".kl-chat-header > .kl-avatar");
    if (!reopenedHeaderAvatar) throw new Error("Missing reopened chat avatar");
    await vi.waitFor(() => {
      expect(reopenedHeaderAvatar.dataset.avatarState).toBe("waiting");
      expect(reopenedHeaderAvatar.hasAttribute("data-kl-remote-image-track")).toBe(true);
    });
    visibilityCallback?.(
      [{ target: reopenedHeaderAvatar, isIntersecting: true } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await vi.waitFor(() => expect(remoteImageLoader.load).toHaveBeenCalledTimes(18));
    const reopenedImage = await vi.waitFor(() => {
      const image = reopenedHeaderAvatar.querySelector<HTMLImageElement>("img");
      expect(image).not.toBeNull();
      return image!;
    });
    reopenedImage.dispatchEvent(new Event("load"));

    view.destroy();
    expect(remoteImageLoader.destroy).toHaveBeenCalledOnce();
    presence.stop();
    await groups.destroy();
  });

  it("renders native Room Tools and an all-chat image gallery", async () => {
    let roomAdmin = true;
    const updateRoomCustomization = vi.fn();
    const runRoomMemberAction = vi.fn();
    const applyRoomPreset = vi.fn();
    let rejectRoomJoin: ((reason?: unknown) => void) | undefined;
    const joinRoom = vi.fn(() => new Promise<void>((_resolve, reject) => {
      rejectRoomJoin = reject;
    }));
    const isInChatRoom = vi.fn(() => true);
    let currentRoomName: string | undefined;
    let currentLobbyRoomAvailable = true;
    const currentLobbyRoom = {
      name: "Moon Garden",
      description: "The room currently open in Bondage Club",
      language: "EN",
      memberCount: 3,
      memberLimit: 10,
      canJoin: false,
      locked: false,
      privateRoom: false,
      mapType: "Never" as const,
      friends: [{ memberNumber: 456, memberName: "Sidney" }],
    };
    const searchRooms = vi.fn(async () => [
      {
        name: "Friends Lounge",
        description: "Meet friends",
        language: "EN",
        memberCount: 4,
        memberLimit: 10,
        canJoin: true,
        locked: false,
        privateRoom: false,
        mapType: "Never",
        friends: [{ memberNumber: 123, memberName: "Reina" }],
      },
      {
        name: "Golden Den",
        description: "A recurring room",
        language: "EN",
        memberCount: 2,
        memberLimit: 8,
        canJoin: true,
        locked: false,
        privateRoom: false,
        mapType: "Always",
        friends: [],
      },
    ]);
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [
        { memberNumber: 123, memberName: "Reina", accountName: "AccountReina", isFriend: true },
      ],
      getRoomAdminSnapshot: () => ({
        roomName: "Moon Garden",
        isAdmin: roomAdmin,
        customization: {
          imageUrl: "https://litter.catbox.moe/old.webp",
          musicUrl: "https://cdn.example/old.mp3",
          sizeMode: 2,
          musicSync: false,
        },
        settings: {
          name: "Moon Garden",
          description: "Quiet room",
          background: "Boudoir",
          limit: 10,
          game: "",
          space: "X",
          language: "EN",
          visibility: ["All"],
          access: ["All"],
          blockCategory: [],
          admins: [999],
          whitelist: [123],
          blacklist: [],
          custom: {
            imageUrl: "https://litter.catbox.moe/old.webp",
            imageFilter: "",
            musicUrl: "https://cdn.example/old.mp3",
            sizeMode: 2,
            musicSync: false,
          },
        },
        players: [
          {
            memberNumber: 123,
            memberName: "Reina",
            accountName: "AccountReina",
            isFriend: true,
            admin: false,
            whitelisted: true,
          },
        ],
      }),
      updateRoomCustomization,
      runRoomMemberAction,
      applyRoomPreset,
      getRoomSearchSpace: () => "X",
      searchRooms,
      joinRoom,
      canSendBeep: () => true,
      isReady: () => true,
      isInChatRoom,
      getCurrentRoomName: () => currentRoomName,
      getCurrentLobbyRoom: () => currentLobbyRoomAvailable ? currentLobbyRoom : undefined,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 123,
        peerName: "Reina",
        content: "https://litter.catbox.moe/gallery.webp",
        sentAt: 1_000,
        includeRoom: false,
      },
      false,
    );
    const view = new LinkChatView(adapter, service, settings, "0.21.0");
    const confirmJoin = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmJoin);
    view.mount();
    await view.open();
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;

    shadow?.querySelector<HTMLButtonElement>('[data-target="room"]')?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-room-page")?.hidden).toBe(false);
      expect(shadow?.querySelector(".kl-room-admin-status")?.textContent).toContain(
        "room administrator",
      );
    });
    const roomAvatar = shadow?.querySelector<HTMLButtonElement>(".kl-room-player-avatar-button");
    expect(roomAvatar?.type).toBe("button");
    expect(roomAvatar?.getAttribute("aria-label")).toBe("Open KikiLink profile for Reina");
    roomAvatar?.click();
    expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
    shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();
    const imageUrl = shadow?.querySelector<HTMLInputElement>(".kl-room-media input[type=url]");
    if (!imageUrl) throw new Error("Missing room background control");
    imageUrl.value = "https://litter.catbox.moe/new.webp";
    shadow?.querySelector<HTMLButtonElement>(".kl-room-media .kl-text-button--primary")?.click();
    expect(updateRoomCustomization).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: "https://litter.catbox.moe/new.webp", sizeMode: 2 }),
    );
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-room-player-actions button") ?? [])]
      .find((button) => button.textContent === "Make admin")
      ?.click();
    expect(runRoomMemberAction).toHaveBeenCalledWith(123, "promote");

    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-room-subnav-button") ?? [])]
      .find((button) => button.textContent === "Lobbies")
      ?.click();
    await vi.waitFor(() => {
      expect(searchRooms).toHaveBeenCalledOnce();
      expect(searchRooms).toHaveBeenCalledWith("", "X");
      expect(shadow?.querySelector(".kl-lobby-list")?.textContent).toContain("Friends Lounge");
      const friendsCard = [...(shadow?.querySelectorAll<HTMLElement>(".kl-lobby-card") ?? [])]
        .find((card) => card.textContent?.includes("Friends Lounge"));
      expect(friendsCard?.querySelector(".kl-lobby-friend-avatar")?.getAttribute("title")).toContain("Reina");
      expect(shadow?.querySelector(".kl-lobby-list")?.textContent).toContain("Character view");
      expect(shadow?.querySelector(".kl-lobby-list")?.textContent).toContain("Map view");
      expect(shadow?.querySelector(".kl-lobby-list")?.textContent).not.toContain("Never");
    });
    const currentCard = shadow?.querySelector<HTMLElement>('.kl-lobby-card[data-current="true"]');
    expect(currentCard?.querySelector(".kl-lobby-name")?.textContent).toBe("Moon Garden");
    expect(currentCard).toBe(shadow?.querySelector(".kl-lobby-card"));
    expect(currentCard?.querySelector(".kl-lobby-current")?.textContent).toBe("Current room");
    expect(currentCard?.querySelector(".kl-lobby-join")).toBeNull();
    expect(currentCard?.textContent).not.toContain("Unavailable");
    const lobbyStyles = shadow?.querySelector("style")?.textContent ?? "";
    expect(lobbyStyles).toMatch(
      /\.kl-lobby-card\[data-favorite="true"\]\s*\{[^}]*var\(--kl-gold\)/,
    );
    expect(lobbyStyles).toMatch(
      /\.kl-lobby-card\[data-has-friends="true"\]\s*\{[^}]*var\(--kl-accent\)/,
    );
    const lobbyQuery = shadow?.querySelector<HTMLInputElement>(".kl-lobby-search");
    if (!lobbyQuery) throw new Error("Missing lobby filter");
    lobbyQuery.value = "does not match the current room";
    lobbyQuery.dispatchEvent(new Event("input", { bubbles: true }));
    expect(shadow?.querySelectorAll(".kl-lobby-card")).toHaveLength(1);
    expect(shadow?.querySelector(".kl-lobby-card")?.getAttribute("data-current")).toBe("true");
    expect(shadow?.querySelector(".kl-lobby-card .kl-lobby-join")).toBeNull();
    lobbyQuery.value = "";
    lobbyQuery.dispatchEvent(new Event("input", { bubbles: true }));
    const goldenCard = [...(shadow?.querySelectorAll<HTMLElement>(".kl-lobby-card") ?? [])]
      .find((card) => card.textContent?.includes("Golden Den"));
    goldenCard?.querySelector<HTMLButtonElement>(".kl-lobby-favorite")?.click();
    expect(settings.get().linkRoom.favoriteRoomNames).toEqual(["Golden Den"]);
    expect(shadow?.querySelector(".kl-lobby-name")?.textContent).toBe("Moon Garden");
    const rerenderedGoldenCard = [...(shadow?.querySelectorAll<HTMLElement>(".kl-lobby-card") ?? [])]
      .find((card) => card.textContent?.includes("Golden Den"));
    expect(rerenderedGoldenCard?.dataset.favorite).toBe("true");
    expect(rerenderedGoldenCard).toBe(shadow?.querySelectorAll(".kl-lobby-card")[1]);
    const goldenJoin = rerenderedGoldenCard?.querySelector<HTMLButtonElement>(".kl-lobby-join");
    goldenJoin?.click();
    goldenJoin?.click();
    expect(confirmJoin).toHaveBeenCalledOnce();
    expect(joinRoom).toHaveBeenCalledOnce();
    expect(joinRoom).toHaveBeenCalledWith("Golden Den");
    expect(
      [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-lobby-join") ?? [])]
        .every((button) => button.disabled),
    ).toBe(true);
    rejectRoomJoin?.(new Error("That room became full"));
    await vi.waitFor(() => {
      const failedCard = [...(shadow?.querySelectorAll<HTMLElement>(".kl-lobby-card") ?? [])]
        .find((card) => card.textContent?.includes("Golden Den"));
      expect(failedCard?.querySelector<HTMLButtonElement>(".kl-lobby-join")?.disabled).toBe(false);
      expect(shadow?.querySelector<HTMLElement>(".kl-room-page")?.hidden).toBe(false);
    });
    isInChatRoom.mockImplementationOnce(() => {
      throw new Error("revoked native room observation");
    });
    const retryCard = [...(shadow?.querySelectorAll<HTMLElement>(".kl-lobby-card") ?? [])]
      .find((card) => card.textContent?.includes("Golden Den"));
    retryCard?.querySelector<HTMLButtonElement>(".kl-lobby-join")?.click();
    expect(joinRoom).toHaveBeenCalledTimes(2);
    expect(confirmJoin).toHaveBeenCalledTimes(2);
    expect(confirmJoin).toHaveBeenLastCalledWith(
      expect.stringContaining("could not verify the current room state"),
    );
    rejectRoomJoin?.(new Error("That room became full again"));
    await vi.waitFor(() => {
      const retriedCard = [...(shadow?.querySelectorAll<HTMLElement>(".kl-lobby-card") ?? [])]
        .find((card) => card.textContent?.includes("Golden Den"));
      expect(retriedCard?.querySelector<HTMLButtonElement>(".kl-lobby-join")?.disabled).toBe(false);
    });
    const friendCard = [...(shadow?.querySelectorAll<HTMLElement>(".kl-lobby-card") ?? [])]
      .find((card) => card.textContent?.includes("Friends Lounge"));
    expect(friendCard?.dataset.hasFriends).toBe("true");
    expect(friendCard?.dataset.favorite).toBe("false");
    searchRooms.mockImplementationOnce(async () => {
      throw new Error("Room directory unavailable");
    });
    currentRoomName = "Moon Garden";
    currentLobbyRoomAvailable = false;
    lobbyQuery.value = "still no match";
    shadow?.querySelector<HTMLButtonElement>(".kl-lobby-refresh")?.click();
    await vi.waitFor(() => {
      expect(searchRooms).toHaveBeenCalledTimes(2);
      expect(shadow?.querySelector(".kl-room-directory-status")?.textContent).toContain(
        "Your current room is still shown",
      );
      const fallbackCard = shadow?.querySelector<HTMLElement>(".kl-lobby-card");
      expect(shadow?.querySelectorAll(".kl-lobby-card")).toHaveLength(1);
      expect(fallbackCard?.dataset.current).toBe("true");
      expect(fallbackCard?.querySelector(".kl-lobby-current")?.textContent).toBe("Current room");
      expect(fallbackCard?.querySelector(".kl-lobby-join")).toBeNull();
      expect(fallbackCard?.textContent).toContain("Live room details are temporarily unavailable");
    });
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-room-subnav-button") ?? [])]
      .find((button) => button.textContent === "Presets")
      ?.click();
    const presetName = shadow?.querySelector<HTMLInputElement>(".kl-preset-name");
    if (!presetName) throw new Error("Missing room preset name");
    presetName.value = "Saved Garden";
    shadow?.querySelector<HTMLButtonElement>(".kl-room-preset-create .kl-text-button--primary")?.click();
    expect(settings.get().linkRoom.presets[0]?.label).toBe("Saved Garden");
    shadow?.querySelector<HTMLButtonElement>(".kl-room-preset-card .kl-text-button--primary")?.click();
    expect(applyRoomPreset).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Moon Garden", admins: [999] }),
    );

    shadow?.querySelector<HTMLButtonElement>('.kl-nav-item[data-target="chat"]')?.click();
    shadow?.querySelector<HTMLButtonElement>(".kl-sidebar-heading-actions button")?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-gallery-page")?.hidden).toBe(false);
      expect(shadow?.querySelector(".kl-gallery-item")?.textContent).toContain("Litterbox");
      expect(shadow?.querySelector(".kl-gallery-item")?.textContent).toContain("Show original");
      expect(shadow?.querySelector(".kl-gallery-item")?.textContent).toContain(
        "Use as room background",
      );
    });
    const failedChatOpen = vi.spyOn(service, "getConversation").mockRejectedValueOnce(
      new Error("Chat history is temporarily unavailable"),
    );
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-gallery-actions button") ?? [])]
      .find((button) => button.textContent === "Open chat")
      ?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-toast")?.textContent).toContain(
        "Chat history is temporarily unavailable",
      );
    });
    failedChatOpen.mockRestore();

    const guardedRoomSnapshot = vi
      .spyOn(adapter, "getRoomAdminSnapshot")
      .mockImplementationOnce(() => {
        throw new Error("Room details are temporarily guarded");
      });
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-gallery-actions button") ?? [])]
      .find((button) => button.textContent === "Use as room background")
      ?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-toast")?.textContent).toContain(
        "Room details are temporarily guarded",
      );
    });
    expect(
      [...(shadow?.querySelectorAll(".kl-toast") ?? [])].some((toast) =>
        toast.textContent?.includes("Image selected"),
      ),
    ).toBe(false);
    guardedRoomSnapshot.mockRestore();

    roomAdmin = false;
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-gallery-header-actions button") ?? [])]
      .find((button) => button.textContent === "Refresh")
      ?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-gallery-grid")?.textContent).not.toContain(
        "Use as room background",
      );
    });

    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-gallery-header-actions button") ?? [])]
      .find((button) => button.textContent === "Add image")
      ?.click();
    const galleryUrl = shadow?.querySelector<HTMLInputElement>(".kl-image-url");
    if (!galleryUrl) throw new Error("Missing Gallery image URL field");
    galleryUrl.value = "https://litter.catbox.moe/direct-gallery.png";
    galleryUrl.dispatchEvent(new Event("input", { bubbles: true }));
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-image-dialog .kl-text-button--primary")
      ?.click();
    await vi.waitFor(() => {
      expect(settings.get().linkChat.gallery.saved).toMatchObject([
        { url: "https://litter.catbox.moe/direct-gallery.png" },
      ]);
      expect(
        shadow?.querySelector<HTMLElement>(
          '[data-gallery-url="https://litter.catbox.moe/direct-gallery.png"]',
        ),
      ).not.toBeNull();
    });

    shadow
      ?.querySelector<HTMLElement>(
        '[data-gallery-url="https://litter.catbox.moe/direct-gallery.png"]',
      )
      ?.querySelector<HTMLButtonElement>(".kl-gallery-remove")
      ?.click();
    await vi.waitFor(() => {
      expect(settings.get().linkChat.gallery.saved).toEqual([]);
      expect(settings.get().linkChat.gallery.hiddenUrls).toContain(
        "https://litter.catbox.moe/direct-gallery.png",
      );
    });

    view.destroy();
    vi.unstubAllGlobals();
  });

  it("shows a branded About panel with the release and community links", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [],
      canSendBeep: () => true,
      isReady: () => true,
      isInChatRoom: () => false,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.21.1",
    );
    view.mount();
    await view.open();

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('[data-target="settings"]')?.click();
    shadow?.querySelector<HTMLButtonElement>('[data-section="about"]')?.click();
    const about = shadow?.querySelector<HTMLElement>("#kikilink-settings-panel-about");
    expect(about?.hidden).toBe(false);
    expect(about?.textContent).toContain("Kiki");
    expect(about?.textContent).not.toMatch(/Member \d+/u);
    expect(about?.textContent).toContain("0.21.1");
    expect(about?.textContent).not.toMatch(/artificial intelligence|\bAI\b/iu);
    expect(about?.querySelector<HTMLImageElement>(".kl-about-watermark")?.src).toContain(
      "design/branding/kikilink-emblem.webp",
    );
    expect(about?.querySelector<HTMLAnchorElement>(".kl-about-link--discord")?.href).toBe(
      "https://discord.gg/6sgGTnptht",
    );

    view.destroy();
  });

  it("opens a feature deck by default and lets the launcher behavior and accent be customized", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getCurrentRoomName: () => "Moon Garden",
      getRoomCharacters: () => [],
      isInChatRoom: () => true,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.6.0",
    );
    view.mount();

    const host = document.querySelector<HTMLElement>("#kikilink-root");
    const shadow = host?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>(".kl-launcher")?.click();
    await vi.waitFor(() => {
      expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
        "home",
      );
      expect(shadow?.querySelector(".kl-home-title")?.textContent).toContain("Kiki");
    });
    expect(shadow?.querySelector(".kl-home-statuses")?.textContent).toContain("Moon Garden");
    expect(shadow?.querySelectorAll(".kl-feature-card")).toHaveLength(5);
    expect(shadow?.querySelector(".kl-home-next-title")?.textContent).toBe(
      "Start your first chat",
    );
    expect(shadow?.querySelector(".kl-home-next-button")?.textContent).toBe("Start a chat");
    expect(
      [...(shadow?.querySelectorAll(".kl-feature-card-title") ?? [])].map(
        (title) => title.textContent,
      ),
    ).toEqual(["Chat", "Players", "Custom Activities", "Gallery", "Settings"]);
    expect(
      [...(shadow?.querySelectorAll(".kl-feature-card-action") ?? [])].map(
        (action) => action.textContent,
      ),
    ).toEqual(["Open Chat", "View players", "Manage activities", "Open gallery", "Customize"]);
    expect(shadow?.querySelector('.kl-nav-item[data-target="home"]')?.getAttribute("data-active")).toBe(
      "true",
    );
    expect(shadow?.querySelector('.kl-nav-item[data-target="home"]')?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      shadow?.querySelectorAll('.kl-feature-nav .kl-nav-item:not([data-target="settings"])'),
    ).toHaveLength(6);
    expect(shadow?.querySelector('.kl-nav-item[data-target="home"] svg.kl-nav-icon')).not.toBeNull();
    expect(shadow?.querySelector(".kl-presence-trigger-name")?.textContent).toBe("Kiki");
    expect(shadow?.querySelector(".kl-local-clock")?.textContent).toMatch(/\d/);

    shadow?.querySelector<HTMLButtonElement>('.kl-nav-item[data-target="music"]')?.click();
    const musicTitle = shadow?.querySelector<HTMLInputElement>(".kl-music-add input[type=text]");
    const musicUrl = shadow?.querySelector<HTMLInputElement>(".kl-music-add input[type=url]");
    if (!musicTitle || !musicUrl) throw new Error("Missing music controls");
    expect(shadow?.querySelector<HTMLInputElement>(".kl-music-add input[type=file]")?.multiple).toBe(true);
    expect(shadow?.querySelector(".kl-music-artwork")).not.toBeNull();
    expect(shadow?.querySelector(".kl-music-queue-search")).not.toBeNull();
    expect(shadow?.querySelector(".kl-music-rate")).not.toBeNull();
    expect(shadow?.querySelector(".kl-music-sleep")).not.toBeNull();
    expect(shadow?.querySelector(".kl-music-playlist-menu > summary")?.textContent).toBe("Manage");
    expect(shadow?.querySelector(".kl-music-playlist-actions")?.textContent).toContain("Duplicate");
    expect(shadow?.querySelector("style")?.textContent).toContain("@media (max-width: 900px)");
    const musicFileMode = shadow?.querySelector<HTMLSelectElement>(".kl-music-file-mode");
    if (!musicFileMode) throw new Error("Missing Music sharing controls");
    expect([...musicFileMode.options].map((option) => [option.value, option.text])).toContainEqual([
      "catbox",
      "Upload to long-lived Catbox",
    ]);
    expect(shadow?.querySelector(".kl-music-upload-retention")).toBeNull();
    expect(settings.get().linkChat.imageUploads.retention).toBe("24h");
    musicTitle.value = "Moon Song";
    musicUrl.value = "https://files.catbox.moe/moon.mp3";
    shadow?.querySelector<HTMLButtonElement>(".kl-music-add .kl-text-button--primary")?.click();
    await vi.waitFor(() => {
      expect(settings.get().linkMusic.playlists[0]?.tracks[0]).toMatchObject({
        title: "Moon Song",
        source: "url",
        locator: "https://files.catbox.moe/moon.mp3",
      });
    });
    const queueSearch = shadow?.querySelector<HTMLInputElement>(".kl-music-queue-search");
    if (!queueSearch) throw new Error("Missing queue search");
    queueSearch.value = "moon";
    queueSearch.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-music-queue-summary")?.textContent).toBe("1 of 1 tracks");
    });
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-music-playlist-actions button") ?? [])]
      .find((button) => button.textContent === "Duplicate")
      ?.click();
    await vi.waitFor(() => {
      expect(settings.get().linkMusic.playlists).toHaveLength(2);
      expect(settings.get().linkMusic.playlists[1]?.tracks[0]?.title).toBe("Moon Song");
    });
    const speed = shadow?.querySelector<HTMLSelectElement>(".kl-music-rate");
    if (!speed) throw new Error("Missing music speed");
    speed.value = "1.5";
    speed.dispatchEvent(new Event("change", { bubbles: true }));
    expect(speed.value).toBe("1.5");
    const sleep = shadow?.querySelector<HTMLSelectElement>(".kl-music-sleep");
    if (!sleep) throw new Error("Missing music sleep timer");
    sleep.value = "end";
    sleep.dispatchEvent(new Event("change", { bubbles: true }));
    expect(shadow?.querySelector(".kl-music-sleep-status")?.textContent).toContain("after this track");

    shadow?.querySelector<HTMLButtonElement>('button[title="LinkChat"]')?.click();
    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
      "chat",
    );
    expect(shadow?.querySelector('.kl-nav-item[data-target="chat"]')?.getAttribute("aria-current")).toBe(
      "page",
    );

    shadow?.querySelector<HTMLButtonElement>('button[title="KikiLink settings"]')?.click();
    const settingsPage = shadow?.querySelector<HTMLElement>(".kl-settings-page");
    expect(settingsPage?.hidden).toBe(false);
    expect(settingsPage?.querySelectorAll('[role="tab"]')).toHaveLength(7);
    const navigationTab = settingsPage?.querySelector<HTMLButtonElement>(
      '[role="tab"][data-section="navigation"]',
    );
    navigationTab?.click();
    expect(navigationTab?.getAttribute("aria-selected")).toBe("true");
    expect(settings.get().ui.settingsSection).toBe("navigation");
    const launcherOpen = settingsPage?.querySelector<HTMLSelectElement>(
      '[data-setting="launcher-open"]',
    );
    const accent = settingsPage?.querySelector<HTMLInputElement>('[data-setting="accent"]');
    const density = settingsPage?.querySelector<HTMLSelectElement>('[data-setting="density"]');
    const textScale = settingsPage?.querySelector<HTMLSelectElement>('[data-setting="text-scale"]');
    if (!launcherOpen || !accent || !density || !textScale) {
      throw new Error("Missing Link Deck customization controls");
    }
    launcherOpen.value = "chat";
    accent.value = "#247f7a";
    expect([...density.options].map((option) => option.value)).toContain("super-compact");
    density.value = "super-compact";
    textScale.value = "large";
    settingsPage
      ?.querySelector<HTMLButtonElement>(".kl-settings-actions .kl-text-button--primary")
      ?.click();

    expect(settings.get().ui.launcherOpen).toBe("chat");
    expect(settings.get().ui.accent).toBe("#247f7a");
    expect(settings.get().ui.density).toBe("super-compact");
    expect(settings.get().ui.textScale).toBe("large");
    expect(host?.style.getPropertyValue("--kl-accent")).toBe("#247f7a");
    expect(host?.style.getPropertyValue("--kl-accent-foreground")).not.toBe("");
    expect(host?.dataset.density).toBe("super-compact");
    expect(host?.dataset.textScale).toBe("large");

    view.close();
    shadow?.querySelector<HTMLButtonElement>(".kl-launcher")?.click();
    await vi.waitFor(() => {
      expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
        "chat",
      );
    });
    view.destroy();
  });

  it("keeps notebook backup and safe encounter retention easy to find", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getCurrentRoomName: () => undefined,
      getRoomCharacters: () => [],
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const people = new PeopleRepository(new MemoryKeyValueStorage());
    people.put({
      memberNumber: 123,
      displayName: "Reina",
      favorite: true,
      note: "Trusted",
      tags: ["Friend"],
      firstSeenAt: 100,
      lastSeenAt: 200,
      lastRoomName: "Moon Garden",
      encounterCount: 2,
    });
    const roster = new LinkRosterService(adapter, people, settings);
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.10.0",
      new LinkActivitiesService(adapter),
      roster,
    );
    view.mount();
    const host = document.querySelector<HTMLElement>("#kikilink-root");
    const shadow = host?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('button[title="KikiLink settings"]')?.click();
    shadow?.querySelector<HTMLButtonElement>('[data-section="players"]')?.click();
    expect(shadow?.querySelector(".kl-data-tools")?.textContent).toContain("1 saved player");
    expect(
      [
        ...(shadow?.querySelectorAll<HTMLButtonElement>(
          "#kikilink-settings-panel-players .kl-data-tools-actions button",
        ) ?? []),
      ].map((button) => button.textContent),
    ).toEqual(["Export", "Import"]);

    const retention = shadow?.querySelector<HTMLSelectElement>(
      '[data-setting="roster-retention"]',
    );
    if (!retention) throw new Error("Missing player retention setting");
    retention.value = "90";
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-settings-actions .kl-text-button--primary")
      ?.click();
    expect(settings.get().linkRoster.retentionDays).toBe(90);
    view.destroy();
  });

  it("starts Custom Activities empty and creates a body-slot action with optional arousal", () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getCurrentRoomName: () => "Moon Garden",
      getRoomCharacters: () => [],
      isInChatRoom: () => true,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.14.0",
    );
    view.mount();

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('button[title="Custom Activities"]')?.click();
    expect(shadow?.querySelector(".kl-custom-activity-empty")?.textContent).toContain(
      "Make an activity your own",
    );
    expect(settings.get().linkActivities.customActivities).toEqual([]);

    shadow?.querySelector<HTMLButtonElement>(".kl-custom-activity-empty button")?.click();
    const name = shadow?.querySelector<HTMLInputElement>('[data-field="name"]');
    const template = shadow?.querySelector<HTMLTextAreaElement>(".kl-custom-activity-template");
    const slot = shadow?.querySelector<HTMLSelectElement>(".kl-custom-slot-select");
    const arousal = shadow?.querySelector<HTMLInputElement>('input[aria-label="Trigger arousal"]');
    const amount = shadow?.querySelector<HTMLInputElement>('input[aria-label="Arousal amount"]');
    if (!name || !template || !slot || !arousal || !amount) {
      throw new Error("Missing custom activity editor controls");
    }
    name.value = "Elbow touch";
    template.value = "{me} touches {target's} arm and {target's gender} elbow.";
    template.dispatchEvent(new Event("input", { bubbles: true }));
    slot.value = "ItemArms";
    slot.dispatchEvent(new Event("change", { bubbles: true }));
    arousal.checked = true;
    arousal.dispatchEvent(new Event("change", { bubbles: true }));
    amount.value = "7";
    amount.dispatchEvent(new Event("input", { bubbles: true }));

    expect(shadow?.querySelector(".kl-custom-activity-live-preview")?.textContent).toBe(
      "Kiki touches Alex's arm and their elbow.",
    );
    expect(shadow?.querySelector(".kl-custom-activity-advanced")?.hasAttribute("open")).toBe(
      false,
    );
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-custom-activity-footer .kl-text-button--primary")
      ?.click();

    expect(settings.get().linkActivities.customActivities).toMatchObject([
      {
        name: "Elbow touch",
        targetGroup: "ItemArms",
        targetMode: "other",
        template: "{me} touches {target's} arm and {target's gender} elbow.",
        image: "Caress",
        arousal: 7,
      },
    ]);
    expect(shadow?.querySelector(".kl-custom-activity-card")?.textContent).toContain("Elbow touch");
    expect(shadow?.querySelector(".kl-custom-activity-blossom")).not.toBeNull();
    view.destroy();
  });

  it("keeps alerts simple while preserving optional advanced rules and private notices", () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getCurrentRoomName: () => undefined,
      getRoomCharacters: () => [],
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.16.0",
    );
    view.mount();

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('button[title="KikiLink settings"]')?.click();
    shadow?.querySelector<HTMLButtonElement>('[data-section="reactions"]')?.click();
    const panel = shadow?.querySelector<HTMLElement>("#kikilink-settings-panel-reactions");
    expect(panel?.querySelector(".kl-settings-panel-title")?.textContent).toBe(
      "Notifications",
    );
    const advanced = panel?.querySelector<HTMLDetailsElement>(".kl-reaction-advanced");
    expect(advanced?.open).toBe(false);
    expect(advanced?.querySelector("summary")?.textContent).toContain("Optional");
    const friendAlert = panel?.querySelector<HTMLInputElement>(
      'input[aria-label="Friend online alerts"]',
    );
    const roomAlert = panel?.querySelector<HTMLInputElement>(
      'input[aria-label="Room join alerts"]',
    );
    const sounds = panel?.querySelector<HTMLInputElement>(
      'input[aria-label="Notification sounds"]',
    );
    const chatSound = panel?.querySelector<HTMLSelectElement>(
      'select[aria-label="Chat notification sound"]',
    );
    if (!advanced || !friendAlert || !roomAlert || !sounds || !chatSound) {
      throw new Error("Missing simple notification controls");
    }
    friendAlert.checked = true;
    roomAlert.checked = true;
    sounds.checked = true;
    chatSound.value = "sparkle";
    advanced.open = true;
    [...(panel?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
      .find((button) => button.textContent === "+ Add event rule")
      ?.click();

    const row = panel?.querySelector<HTMLElement>(".kl-reaction-rule");
    const trigger = row?.querySelector<HTMLSelectElement>('[data-field="trigger"]');
    const scope = row?.querySelector<HTMLSelectElement>('[data-field="scope"]');
    const members = row?.querySelector<HTMLInputElement>('[data-field="members"]');
    const match = row?.querySelector<HTMLInputElement>('[data-field="text-match"]');
    const template = row?.querySelector<HTMLTextAreaElement>('[data-field="template"]');
    if (!row || !trigger || !scope || !members || !match || !template) {
      throw new Error("Missing LinkReactions editor controls");
    }
    trigger.value = "beep-received";
    trigger.dispatchEvent(new Event("change", { bubbles: true }));
    scope.value = "members";
    scope.dispatchEvent(new Event("change", { bubbles: true }));
    members.value = "#123";
    match.value = "urgent";
    template.value = "{name}: {message}";
    const globalToggle = panel?.querySelector<HTMLInputElement>(
      'input[aria-label="Enable advanced reaction rules"]',
    );
    if (!globalToggle) throw new Error("Missing LinkReactions toggle");
    globalToggle.checked = true;
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-settings-actions .kl-text-button--primary")
      ?.click();

    expect(settings.get().linkReactions).toMatchObject({
      quickAlerts: { friendOnline: true, roomJoin: true },
      sounds: { enabled: true, chat: "sparkle" },
      enabled: true,
      rules: [
        {
          trigger: "beep-received",
          scope: "members",
          memberNumbers: [123],
          textMatch: "urgent",
          action: "notice",
          template: "{name}: {message}",
        },
      ],
    });
    view.close();
    view.onNotification({
      kind: "friend-online",
      message: "Mina is online.",
      showToast: true,
      memberNumber: 456,
      occurredAt: 900,
    });
    expect(
      [...(shadow?.querySelectorAll(".kl-toast--floating") ?? [])].some((toast) =>
        toast.textContent?.includes("Mina is online."),
      ),
    ).toBe(true);
    view.onReaction({
      ruleId: "test",
      ruleLabel: "Urgent Beep",
      action: "notice",
      message: "Reina: urgent hello",
      event: {
        trigger: "beep-received",
        memberNumber: 123,
        memberName: "Reina",
        isFriend: true,
        occurredAt: 1_000,
        content: "urgent hello",
      },
      firedAt: 1_000,
    });
    expect(
      [...(shadow?.querySelectorAll(".kl-toast--floating") ?? [])].some((toast) =>
        toast.textContent?.includes("Reina: urgent hello"),
      ),
    ).toBe(true);
    view.destroy();
  });

  it("edits profile decoration controls and safely reveals remote banners independently", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    let currentTime = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => currentTime);
    const sendKikiLinkProtocol = vi.fn((_target: number, _payload: string) => "beep" as const);
    const adapter = {
      getMemberName: (memberNumber: number) => memberNumber === 123 ? "Reina" : "Kiki",
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      getCurrentRoomName: () => undefined,
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol,
      broadcastKikiLinkProtocol: vi.fn(() => true),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkPresence.profileImagePreviews = "ask";
    });
    const presenceBus = new EventBus<KikiLinkEvents>();
    const presence = new LinkPresenceService(adapter, settings, presenceBus, "0.25.0");
    presence.start();
    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        m: "Open to chat",
        a: "https://cdn.example/reina-avatar.webp",
        f: "ribbon",
        c: "garden",
        u: Date.now(),
        v: "0.25.0",
        g: 1,
      }),
    });
    expect(presence.request(123, false, true)).toBe(true);
    const initialProfileRequest = sendKikiLinkProtocol.mock.calls
      .map(([, payload]) => JSON.parse(payload) as Record<string, unknown>)
      .find((packet) => packet.t === "pq" && packet.p === 1);
    if (typeof initialProfileRequest?.i !== "string") {
      throw new Error("Missing initial profile-details request id");
    }
    const remoteBannerUrl = "https://cdn.example/reina-banner.webp";
    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "pb",
        i: initialProfileRequest.i,
        b: "Tea, stories, and quiet rooms.",
      }),
    });
    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: initialProfileRequest.i,
        h: remoteBannerUrl,
        o: "#12AB34",
      }),
    });

    const remoteImageLoader = {
      load: vi.fn((url: string, _signal?: AbortSignal) =>
        Promise.resolve(`blob:kikilink/${encodeURIComponent(url)}`)),
      destroy: vi.fn(),
    };
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.25.0",
      undefined,
      undefined,
      presence,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      remoteImageLoader,
    );
    view.mount();
    await view.openChat(123, "Reina");
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    if (!shadow) throw new Error("Missing KikiLink shadow root");

    shadow.querySelector<HTMLButtonElement>(".kl-presence-trigger")?.click();
    const frameSelect = shadow.querySelector<HTMLSelectElement>(".kl-profile-frame-select");
    const bannerUrl = shadow.querySelector<HTMLInputElement>(".kl-presence-banner-url");
    const bio = shadow.querySelector<HTMLTextAreaElement>(".kl-profile-bio-input");
    const bannerUpload = [...shadow.querySelectorAll<HTMLButtonElement>(
      ".kl-profile-banner-actions button",
    )].find((button) => button.textContent === "Upload banner");
    const bannerRemove = [...shadow.querySelectorAll<HTMLButtonElement>(
      ".kl-profile-banner-actions button",
    )].find((button) => button.textContent === "Remove");
    const bannerFile = shadow.querySelector<HTMLInputElement>(
      '.kl-profile-banner-actions input[type="file"]',
    );
    const outlineEnabled = shadow.querySelector<HTMLInputElement>(
      'input[aria-label="Use a custom profile outline color"]',
    );
    const outlineColor = shadow.querySelector<HTMLInputElement>(
      'input[aria-label="Profile outline color"]',
    );
    if (
      !frameSelect ||
      !bannerUrl ||
      !bio ||
      !bannerUpload ||
      !bannerRemove ||
      !bannerFile ||
      !outlineEnabled ||
      !outlineColor
    ) {
      throw new Error("Missing profile decoration editor controls");
    }
    expect([...frameSelect.options].map((option) => option.value)).toEqual([
      "none",
      "blossom",
      "rose",
      "starlight",
      "laurel",
      "thorn",
      "moon",
      "ribbon",
    ]);
    expect([...frameSelect.options].filter((option) => option.value !== "none")).toHaveLength(7);
    expect(shadow.querySelector(".kl-profile-banner-field")?.textContent).toContain(
      "1200 × 400 px (3:1)",
    );
    expect(bannerUrl.type).toBe("url");
    expect(bio.maxLength).toBe(160);
    expect(bannerUrl.getAttribute("aria-label")).toBe("Direct profile banner URL");
    expect(bannerFile.hidden).toBe(true);
    expect(bannerFile.accept).toContain("image/webp");
    const fileInputClick = vi.spyOn(bannerFile, "click");
    bannerUpload.click();
    expect(fileInputClick).toHaveBeenCalledOnce();
    bannerUrl.value = "https://files.catbox.moe/draft.webp";
    bannerRemove.click();
    expect(bannerUrl.value).toBe("");
    expect(shadow.querySelector(".kl-profile-banner-status")?.textContent).toContain(
      "Banner removed",
    );
    expect(outlineEnabled.type).toBe("checkbox");
    expect(outlineColor.type).toBe("color");
    expect(outlineColor.disabled).toBe(true);
    outlineEnabled.checked = true;
    outlineEnabled.dispatchEvent(new Event("change", { bubbles: true }));
    expect(outlineColor.disabled).toBe(false);
    bannerUrl.value = "https://files.catbox.moe/kiki-banner.webp";
    bio.value = "Sakura tea and quiet rooms.";
    outlineColor.value = "#445566";
    shadow.querySelector<HTMLButtonElement>(".kl-presence-dialog .kl-text-button--primary")
      ?.click();
    expect(settings.get().linkPresence).toMatchObject({
      bannerUrl: "https://files.catbox.moe/kiki-banner.webp",
      bio: "Sakura tea and quiet rooms.",
      profileOutlineColor: "#445566",
    });

    remoteImageLoader.load.mockClear();
    currentTime += 2_001;
    const explicitProfileRefresh = vi.spyOn(presence, "request");
    explicitProfileRefresh.mockClear();
    shadow.querySelector<HTMLElement>(".kl-chat-header > .kl-avatar")?.click();
    await vi.waitFor(() => {
      expect(shadow.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
      expect(shadow.querySelector<HTMLElement>(".kl-addon-profile-card")?.dataset.memberNumber)
        .toBe("123");
    });
    expect(explicitProfileRefresh).toHaveBeenCalledWith(123, true, true);
    const explicitProfileRequest = sendKikiLinkProtocol.mock.calls
      .map(([, payload]) => JSON.parse(payload) as Record<string, unknown>)
      .filter((packet) => packet.t === "pq" && packet.p === 1)
      .at(-1);
    if (typeof explicitProfileRequest?.i !== "string") {
      throw new Error("Missing explicit profile-details request id");
    }

    const initialCard = shadow.querySelector<HTMLElement>(".kl-addon-profile-card");
    if (!initialCard) throw new Error("Missing remote addon profile card");
    expect(initialCard.dataset.customOutline).toBe("true");
    expect(initialCard.style.length).toBe(1);
    expect(initialCard.style.item(0)).toBe("--kl-profile-outline");
    expect(initialCard.style.getPropertyValue("--kl-profile-outline")).toBe("#12ab34");
    expect(initialCard.style.cssText).not.toMatch(/url\(|background|position|display/iu);
    expect(initialCard.querySelector(".kl-addon-profile-bio")?.textContent).toContain(
      "Tea, stories, and quiet rooms.",
    );
    expect(initialCard.querySelector(".kl-addon-profile-banner img")).toBeNull();
    expect(initialCard.querySelector(".kl-addon-profile-show-avatar")).not.toBeNull();
    expect(initialCard.querySelector(".kl-addon-profile-show-banner")).not.toBeNull();

    shadow.querySelector<HTMLButtonElement>(".kl-addon-profile-show-avatar")?.click();
    await vi.waitFor(() => {
      expect(shadow.querySelector<HTMLImageElement>(".kl-addon-profile-avatar img")?.src)
        .toContain("blob:kikilink/");
    });
    expect(
      remoteImageLoader.load.mock.calls.some(([url]) => url === remoteBannerUrl),
    ).toBe(false);
    expect(shadow.querySelector(".kl-addon-profile-show-banner")).not.toBeNull();
    expect(shadow.querySelector(".kl-addon-profile-banner img")).toBeNull();

    shadow.querySelector<HTMLButtonElement>(".kl-addon-profile-show-banner")?.click();
    await vi.waitFor(() => {
      const image = shadow.querySelector<HTMLImageElement>(".kl-addon-profile-banner img");
      expect(image?.src).toBe(`blob:kikilink/${encodeURIComponent(remoteBannerUrl)}`);
      expect(image?.src).not.toBe(remoteBannerUrl);
    });
    expect(remoteImageLoader.load).toHaveBeenCalledWith(
      remoteBannerUrl,
      expect.any(AbortSignal),
    );
    const revealedCard = shadow.querySelector<HTMLElement>(".kl-addon-profile-card");
    if (!revealedCard) throw new Error("Missing revealed remote addon profile card");
    expect(
      [...revealedCard.querySelectorAll<HTMLImageElement>("img")].some(
        (image) => image.src === remoteBannerUrl,
      ),
    ).toBe(false);
    shadow.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();

    const pendingBannerUrl = "https://cdn.example/reina-banner-pending.webp";
    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: explicitProfileRequest.i,
        h: pendingBannerUrl,
        o: "#12ab34",
      }),
    });
    expect(presence.get(123).bannerUrl).toBe(pendingBannerUrl);
    let pendingBannerSignal: AbortSignal | undefined;
    remoteImageLoader.load.mockImplementation((url: string, signal?: AbortSignal) => {
      if (url !== pendingBannerUrl) {
        return Promise.resolve(`blob:kikilink/${encodeURIComponent(url)}`);
      }
      if (!signal) throw new Error("Missing profile banner abort signal");
      pendingBannerSignal = signal;
      return new Promise<string>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("cancelled", "AbortError")),
          { once: true },
        );
      });
    });
    shadow.querySelector<HTMLElement>(".kl-chat-header > .kl-avatar")?.click();
    await vi.waitFor(() => {
      expect(shadow.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
      expect(shadow.querySelector(".kl-addon-profile-show-banner")).not.toBeNull();
    });
    expect(
      remoteImageLoader.load.mock.calls.some(([url]) => url === pendingBannerUrl),
    ).toBe(false);
    shadow.querySelector<HTMLButtonElement>(".kl-addon-profile-show-banner")?.click();
    await vi.waitFor(() => expect(pendingBannerSignal).toBeDefined());
    expect(pendingBannerSignal?.aborted).toBe(false);
    shadow.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();
    expect(pendingBannerSignal?.aborted).toBe(true);
    expect(shadow.querySelector(".kl-addon-profile-body")?.childElementCount).toBe(0);

    explicitProfileRefresh.mockRestore();
    view.destroy();
    expect(remoteImageLoader.destroy).toHaveBeenCalledOnce();
    presence.stop();
  });

  it("cancels a closed profile-banner upload without clearing a newer upload timer", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => true),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const bitmap = { width: 1200, height: 400, close: vi.fn() } as unknown as ImageBitmap;
    vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
    const context = {
      drawImage: vi.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob([Uint8Array.of(1, 2, 3)], { type: "image/webp" }));
    });
    const pendingUploads: Array<{
      signal: AbortSignal | undefined;
      resolve(url: string): void;
      reject(error: Error): void;
    }> = [];
    const catboxImageUpload = vi.fn((
      _image: unknown,
      _onProgress: unknown,
      signal?: AbortSignal,
    ) => new Promise<string>((resolve, reject) => {
      pendingUploads.push({ signal, resolve, reject });
    }));
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const remoteImageLoader = {
      load: vi.fn(async (url: string) => `blob:kikilink/${encodeURIComponent(url)}`),
      destroy: vi.fn(),
    };
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.25.0",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      catboxImageUpload,
      remoteImageLoader,
    );
    view.mount();
    await view.open();
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    if (!shadow) throw new Error("Missing KikiLink shadow root");
    shadow.querySelector<HTMLButtonElement>(".kl-presence-trigger")?.click();
    const dialog = shadow.querySelector<HTMLDialogElement>(".kl-presence-dialog");
    const fileInput = dialog?.querySelector<HTMLInputElement>(
      '.kl-profile-banner-actions input[type="file"]',
    );
    const headerClose = dialog?.querySelector<HTMLButtonElement>(
      ".kl-dialog-header .kl-icon-button",
    );
    if (!dialog?.open || !fileInput || !headerClose) {
      throw new Error("Missing Presence banner-upload controls");
    }
    const bannerHeader = new Uint8Array(33);
    bannerHeader.set([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x04, 0xb0,
      0x00, 0x00, 0x01, 0x90,
      0x08, 0x06, 0x00, 0x00, 0x00,
    ]);
    const banner = new File([bannerHeader], "banner.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", { configurable: true, value: [banner] });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => {
      expect(catboxImageUpload).toHaveBeenCalledOnce();
      expect(dialog.querySelector(".kl-profile-banner-status")?.textContent).toContain(
        "Uploading to public Catbox",
      );
    });

    headerClose.click();
    await vi.waitFor(() => {
      expect(pendingUploads[0]?.signal?.aborted).toBe(true);
      expect(dialog.open).toBe(false);
    });

    shadow.querySelector<HTMLButtonElement>(".kl-presence-trigger")?.click();
    expect(dialog.open).toBe(true);
    Object.defineProperty(fileInput, "files", { configurable: true, value: [banner] });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(catboxImageUpload).toHaveBeenCalledTimes(2));
    const secondTimer = setIntervalSpy.mock.results.at(-1)?.value;
    expect(secondTimer).toBeDefined();

    pendingUploads[0]?.reject(new Error("The upload was cancelled"));
    await Promise.resolve();
    await Promise.resolve();
    expect(
      clearIntervalSpy.mock.calls.some(([timer]) => timer === secondTimer),
    ).toBe(false);
    expect(dialog.querySelector(".kl-profile-banner-status")?.textContent).toContain(
      "Uploading to public Catbox",
    );

    pendingUploads[1]?.resolve("https://files.catbox.moe/reopened-banner.webp");
    await vi.waitFor(() => {
      expect(dialog.querySelector(".kl-profile-banner-status")?.textContent).toContain(
        "Banner uploaded",
      );
    });
    view.close();
    expect(shadow.querySelector<HTMLElement>(".kl-panel")?.hidden).toBe(true);
    view.destroy();
    expect(remoteImageLoader.destroy).toHaveBeenCalledOnce();
  });

  it("keeps profile targets clickable and status dots above all avatar decorations", () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      canSendBeep: () => true,
      isReady: () => true,
      isInChatRoom: () => false,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.25.0",
    );
    view.mount();
    const css = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot
      ?.querySelector("style")?.textContent ?? "";
    const declaration = (selector: string): string => {
      const start = css.indexOf(`${selector} {`);
      if (start < 0) throw new Error(`Missing stylesheet selector: ${selector}`);
      const bodyStart = css.indexOf("{", start) + 1;
      const end = css.indexOf("}", bodyStart);
      return css.slice(bodyStart, end);
    };
    const zIndex = (selector: string): number => {
      const match = declaration(selector).match(/z-index:\s*(\d+)/u);
      if (!match) throw new Error(`Missing numeric z-index for ${selector}`);
      return Number(match[1]);
    };

    expect(declaration(".kl-profile-menu-target")).toMatch(/cursor:\s*pointer/u);
    expect(declaration("button.kl-group-member-target")).toMatch(/cursor:\s*pointer/u);
    for (const frame of ["blossom", "rose", "starlight", "laurel", "thorn", "moon", "ribbon"]) {
      expect(css).toContain(`.kl-addon-profile-avatar-shell[data-frame="${frame}"]`);
      expect(css).toContain(
        `.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="${frame}"]`,
      );
    }
    expect(zIndex('.kl-addon-profile-avatar-shell > .kl-presence-dot')).toBeGreaterThan(
      zIndex('.kl-addon-profile-avatar-shell[data-frame="ribbon"]::after'),
    );
    expect(zIndex(".kl-group-member-presence")).toBeGreaterThan(
      zIndex('.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="ribbon"]::after'),
    );

    view.destroy();
  });

  it("renders privacy-aware images, presence controls, and contextual player actions", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const sendBeep = vi.fn((peerNumber: number, content: string, includeRoom: boolean) => ({
      direction: "outgoing" as const,
      peerNumber,
      peerName: "Reina",
      content,
      sentAt: Date.now(),
      includeRoom,
    }));
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [
        {
          memberNumber: 123,
          memberName: "Reina",
          roomName: "Moon Garden",
          privateRoom: false,
        },
      ],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => true,
      getRoomCharacters: () => [
        { memberNumber: 123, memberName: "Reina", isFriend: true },
      ],
      getCurrentRoomName: () => "Moon Garden",
      isInChatRoom: () => true,
      refreshOnlineFriends: vi.fn(() => true),
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol: vi.fn(() => "room" as const),
      broadcastKikiLinkProtocol: vi.fn(() => true),
      sendBeep,
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkPresence.profileImagePreviews = "ask";
    });
    const presenceBus = new EventBus<KikiLinkEvents>();
    const presence = new LinkPresenceService(adapter, settings, presenceBus, "0.20.0");
    presence.start();
    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "room",
      payload: JSON.stringify({
        t: "ps",
        s: "dnd",
        m: "In a scene",
        a: "https://i.imgur.com/reina.png",
        f: "starlight",
        c: "midnight",
        u: Date.now(),
        v: "0.24.0",
      }),
    });
    const service = new ChatService(new MemoryChatRepository(), settings);
    const people = new PeopleRepository(new MemoryKeyValueStorage());
    people.put({
      memberNumber: 123,
      displayName: "Reina",
      favorite: true,
      note: "Met during a calm rope scene.",
      tags: ["trusted", "rope"],
      firstSeenAt: 50,
      lastSeenAt: 75,
      lastRoomName: "Rose Conservatory",
      encounterCount: 4,
    });
    const roster = new LinkRosterService(adapter, people, settings);
    const remoteImageLoader = {
      load: vi.fn(async (url: string, _signal?: AbortSignal) =>
        `blob:kikilink/${encodeURIComponent(url)}`),
      destroy: vi.fn(),
    };
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 123,
        peerName: "Reina",
        content: "https://cdn.example/picture.webp",
        sentAt: 100,
        includeRoom: false,
      },
      true,
    );
    const view = new LinkChatView(
      adapter,
      service,
      settings,
      "0.20.0",
      undefined,
      roster,
      presence,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      remoteImageLoader,
    );
    view.mount();
    await view.openChat(123, "Reina");

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    expect(shadow?.querySelector(".kl-chat-presence")?.textContent).toContain("Do not disturb");
    expect(shadow?.querySelector(".kl-chat-room")?.textContent).toContain("Moon Garden");
    expect(shadow?.querySelector(".kl-image-load")?.textContent).toBe("Show image");
    expect(shadow?.querySelector(".kl-message-link")).toBeNull();
    const showOriginal = shadow?.querySelector<HTMLAnchorElement>(".kl-image-open");
    expect(showOriginal?.textContent).toBe("Show original ↗");
    expect(showOriginal?.href).toBe("https://cdn.example/picture.webp");
    expect(shadow?.querySelector(".kl-message-bubble")?.getAttribute("data-media")).toBe("true");
    expect(shadow?.querySelector("style")?.textContent).toMatch(
      /\.kl-image-preview img \{[^}]*width: 100%;[^}]*height: auto;/,
    );
    const remoteAvatar = shadow?.querySelector<HTMLElement>(".kl-chat-header > .kl-avatar");
    expect(remoteAvatar?.querySelector<HTMLImageElement>("img")).toBeNull();
    expect(remoteAvatar?.getAttribute("aria-label")).toBe("Open KikiLink profile for Reina");
    const explicitProfileRefresh = vi.spyOn(presence, "request");
    explicitProfileRefresh.mockClear();
    remoteAvatar?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
      const profileCard = shadow?.querySelector<HTMLElement>(".kl-addon-profile-card");
      expect(profileCard?.textContent).toContain("Reina");
      expect(profileCard?.textContent).toContain("Moon Garden");
      expect(profileCard?.textContent).toContain("Do not disturb");
      expect(profileCard?.textContent).toContain("In a scene");
      expect(profileCard?.textContent).toContain("v0.24.0");
      expect(profileCard?.dataset.profileStyle).toBe("midnight");
      expect(profileCard?.querySelector<HTMLElement>(".kl-addon-profile-avatar-shell")?.dataset.frame).toBe(
        "starlight",
      );
      expect(profileCard?.querySelector(".kl-addon-profile-facts")?.textContent).not.toContain(
        "Encounter",
      );
      const privateProfile = profileCard?.querySelector(".kl-addon-profile-private");
      expect(privateProfile?.textContent).toContain("Only visible to you");
      expect(privateProfile?.textContent).toContain(
        "Private note · Met during a calm rope scene.",
      );
      expect(privateProfile?.textContent).toContain("Private tags · trusted · rope");
      expect(privateProfile?.textContent).toContain("Last recorded room · Rose Conservatory");
      expect(privateProfile?.textContent).toContain("Encounter count · 4");
      expect(shadow?.querySelector(".kl-addon-profile-avatar img")).toBeNull();
    });
    expect(explicitProfileRefresh).toHaveBeenCalledWith(123, true, true);
    const richProfileQuery = [...vi.mocked(adapter.sendKikiLinkProtocol).mock.calls]
      .reverse()
      .map(([, payload]) => JSON.parse(payload) as Record<string, unknown>)
      .find((packet) => packet.t === "pq" && packet.p === 1);
    if (!richProfileQuery || typeof richProfileQuery.i !== "string") {
      throw new Error("Missing rich profile request");
    }
    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "room",
      payload: JSON.stringify({
        t: "pf",
        i: richProfileQuery.i,
        x: "#8a1538",
        y: "#2a9d8f",
      }),
    });
    await vi.waitFor(() => {
      const gradientCard = shadow?.querySelector<HTMLElement>(".kl-addon-profile-card");
      expect(gradientCard?.dataset.customGradient).toBe("true");
      expect(gradientCard?.style.getPropertyValue("--kl-profile-gradient-primary")).toBe("#8a1538");
      expect(gradientCard?.style.getPropertyValue("--kl-profile-gradient-secondary")).toBe("#2a9d8f");
      const styles = shadow?.querySelector("style")?.textContent ?? "";
      expect(styles).toContain("--kl-profile-gradient-primary-safe: color-mix(");
      expect(styles).toContain("var(--kl-profile-gradient-tone) 62%");
      expect(styles).toContain(
        "var(--kl-profile-gradient-primary-safe),\n    var(--kl-profile-gradient-secondary-safe)",
      );
    });
    explicitProfileRefresh.mockRestore();
    shadow?.querySelector<HTMLButtonElement>(".kl-addon-profile-show-avatar")?.click();
    await vi.waitFor(() => {
      expect(
        shadow?.querySelector<HTMLImageElement>(".kl-addon-profile-avatar img")?.src,
      ).toContain("blob:kikilink/");
    });
    expect(remoteImageLoader.load).toHaveBeenCalledWith(
      "https://i.imgur.com/reina.png",
      expect.any(AbortSignal),
    );
    const stableProfileCard = shadow?.querySelector(".kl-addon-profile-card");
    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "room",
      payload: JSON.stringify({ t: "ty", a: 1 }),
    });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(shadow?.querySelector(".kl-addon-profile-card")).toBe(stableProfileCard);
    shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();

    const normalProfileTarget = shadow?.querySelector<HTMLElement>(".kl-chat-person");
    if (!normalProfileTarget) throw new Error("Missing regular profile-menu target");
    shadow?.querySelector<HTMLInputElement>(".kl-search-wrap > .kl-search")?.focus();
    normalProfileTarget.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    const normalMenuLayer = shadow?.querySelector<HTMLDialogElement>(".kl-profile-menu-layer");
    await vi.waitFor(() => {
      expect(normalMenuLayer?.open).toBe(true);
      expect(shadow?.querySelector(".kl-profile-menu")?.textContent).toContain("KikiLink Profile");
    });
    normalMenuLayer?.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(normalMenuLayer?.open).toBe(false);
    expect(shadow?.activeElement).toBe(normalProfileTarget);
    normalProfileTarget.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    await vi.waitFor(() => expect(normalMenuLayer?.open).toBe(true));
    const addonProfileAction = [...(
      shadow?.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action") ?? []
    )].find((button) => button.textContent?.includes("KikiLink Profile"));
    if (!addonProfileAction) throw new Error("Missing KikiLink Profile action");
    addonProfileAction.click();
    await vi.waitFor(() => {
      expect(normalMenuLayer?.open).toBe(false);
      expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
      expect(shadow?.querySelector(".kl-addon-profile-private")?.textContent).toContain(
        "Private note · Met during a calm rope scene.",
      );
    });
    shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();
    expect(shadow?.activeElement).toBe(normalProfileTarget);

    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "room",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://tracker.example/new-avatar.png",
        u: Date.now(),
        v: "0.24.0",
      }),
    });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(remoteAvatar?.querySelector("img")).toBeNull();
    expect(
      remoteImageLoader.load.mock.calls.some(
        ([url]) => url === "https://tracker.example/new-avatar.png",
      ),
    ).toBe(false);

    let pendingProfileSignal: AbortSignal | undefined;
    remoteImageLoader.load.mockImplementationOnce((_url: string, signal?: AbortSignal) => {
      if (!signal) throw new Error("Missing profile avatar abort signal");
      pendingProfileSignal = signal;
      return new Promise<string>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("cancelled", "AbortError")),
          { once: true },
        );
      });
    });
    remoteAvatar?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
      expect(shadow?.querySelector(".kl-addon-profile-show-avatar")).not.toBeNull();
    });
    shadow?.querySelector<HTMLButtonElement>(".kl-addon-profile-show-avatar")?.click();
    await vi.waitFor(() => expect(pendingProfileSignal).toBeDefined());
    expect(pendingProfileSignal?.aborted).toBe(false);
    shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();
    expect(pendingProfileSignal?.aborted).toBe(true);
    expect(shadow?.querySelector(".kl-addon-profile-body")?.childElementCount).toBe(0);

    shadow?.querySelector<HTMLButtonElement>(".kl-attach-image")?.click();
    const imageInput = shadow?.querySelector<HTMLInputElement>(".kl-image-url");
    if (!imageInput) throw new Error("Missing image URL input");
    imageInput.value = "[color=#ff66aa]https://cdn.example/new-image.png[/color]";
    imageInput.dispatchEvent(new Event("input", { bubbles: true }));
    shadow?.querySelector<HTMLButtonElement>(".kl-image-dialog .kl-text-button--primary")?.click();
    await vi.waitFor(() => {
      expect(sendBeep).toHaveBeenCalledWith(123, "https://cdn.example/new-image.png", false);
    });

    shadow?.querySelector<HTMLElement>(".kl-chat-person")?.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-profile-menu")?.textContent).toContain("Whisper");
      expect(shadow?.querySelector(".kl-profile-menu")?.textContent).toContain("Player note");
      expect(shadow?.querySelector(".kl-profile-menu")?.textContent).not.toContain(
        "Show profile avatar",
      );
    });
    const allowedAvatarImage = remoteAvatar?.querySelector("img");
    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "room",
      payload: JSON.stringify({ t: "ty", a: 1 }),
    });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(remoteAvatar?.querySelector("img")).toBe(allowedAvatarImage);

    const guardedOwnMember = vi.spyOn(adapter, "getOwnMemberNumber").mockImplementation(() => {
      throw new Error("Permission denied to access object");
    });
    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "room",
      payload: JSON.stringify({ t: "ty", a: 0 }),
    });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(shadow?.querySelector(".kl-chat-name")?.textContent).toBe("Reina");
    guardedOwnMember.mockRestore();

    shadow?.querySelector<HTMLButtonElement>(".kl-presence-trigger")?.click();
    shadow?.querySelector<HTMLButtonElement>('[data-status="dnd"]')?.click();
    expect(settings.get().linkPresence.status).toBe("dnd");
    expect(shadow?.querySelector(".kl-presence-trigger")?.textContent).toContain("Do not disturb");
    view.onNotification({
      kind: "chat",
      message: "This DND alert must stay silent",
      showToast: true,
      memberNumber: 123,
      occurredAt: Date.now(),
    });
    expect(shadow?.textContent).not.toContain("This DND alert must stay silent");

    const avatarUrl = shadow?.querySelector<HTMLInputElement>(".kl-presence-avatar-url");
    const idleMinutes = shadow?.querySelector<HTMLInputElement>(
      'input[aria-label="Minutes before automatic Idle"]',
    );
    const afkToggle = shadow?.querySelector<HTMLInputElement>(
      'input[aria-label="Send an automatic reply while Idle or DND"]',
    );
    const afkMessage = shadow?.querySelector<HTMLTextAreaElement>(".kl-afk-reply-message");
    const gradientToggle = shadow?.querySelector<HTMLInputElement>(
      'input[aria-label="Use a two-color profile gradient"]',
    );
    const gradientPrimary = shadow?.querySelector<HTMLInputElement>(
      'input[aria-label="First profile gradient color"]',
    );
    const gradientSecondary = shadow?.querySelector<HTMLInputElement>(
      'input[aria-label="Second profile gradient color"]',
    );
    if (
      !avatarUrl ||
      !idleMinutes ||
      !afkToggle ||
      !afkMessage ||
      !gradientToggle ||
      !gradientPrimary ||
      !gradientSecondary
    ) {
      throw new Error("Missing KikiLink profile controls");
    }
    avatarUrl.value = "https://i.imgur.com/kiki.png";
    avatarUrl.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => {
      expect(
        shadow?.querySelector<HTMLImageElement>(".kl-profile-avatar-preview img")?.src,
      ).toContain("blob:kikilink/");
    });
    idleMinutes.value = "7";
    afkToggle.checked = true;
    afkToggle.dispatchEvent(new Event("change", { bubbles: true }));
    afkMessage.value = "Back later!";
    gradientToggle.checked = true;
    gradientToggle.dispatchEvent(new Event("change", { bubbles: true }));
    gradientPrimary.value = "#8a1538";
    gradientSecondary.value = "#2a9d8f";
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-presence-dialog .kl-text-button--primary")
      ?.click();
    expect(settings.get().linkPresence).toMatchObject({
      avatarUrl: "https://i.imgur.com/kiki.png",
      autoIdleMinutes: 7,
      afkAutoReply: { enabled: true, message: "Back later!" },
      profileGradient: { enabled: true, primary: "#8a1538", secondary: "#2a9d8f" },
    });

    settings.update((draft) => {
      draft.linkChat.imagePreviews = "never";
    });
    view.close();
    await view.openChat(123, "Reina");
    expect(shadow?.querySelector(".kl-image-load")).toBeNull();
    expect(shadow?.querySelector(".kl-image-preview")).toBeNull();
    expect(shadow?.querySelector<HTMLAnchorElement>(".kl-message-link")?.href).toBe(
      "https://cdn.example/picture.webp",
    );

    view.destroy();
    expect(remoteImageLoader.destroy).toHaveBeenCalledOnce();
    presence.stop();
  });

  it("cancels detached and destroyed remote-image targets", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      getRoomCharacters: () => [],
      getCurrentRoomName: () => undefined,
      isInChatRoom: () => false,
      refreshOnlineFriends: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => false),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkChat.imagePreviews = "always";
    });
    const service = new ChatService(new MemoryChatRepository(), settings);
    await service.capture({
      direction: "incoming",
      peerNumber: 123,
      peerName: "Reina",
      content: "https://cdn.example/pending-image.png",
      sentAt: 100,
      includeRoom: false,
    }, true);
    const signals: AbortSignal[] = [];
    const remoteImageLoader = {
      load: vi.fn((_url: string, signal?: AbortSignal) => {
        if (!signal) throw new Error("Missing per-target abort signal");
        signals.push(signal);
        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("cancelled", "AbortError")),
            { once: true },
          );
        });
      }),
      destroy: vi.fn(),
    };
    const view = new LinkChatView(
      adapter,
      service,
      settings,
      "0.25.0",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      remoteImageLoader,
    );

    view.mount();
    await view.openChat(123, "Reina");
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    expect(shadow?.querySelector(".kl-conversation .kl-avatar")?.textContent).toBe("R");
    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(false);

    const activePreview = shadow?.querySelector<HTMLElement>(".kl-image-preview");
    if (!shadow || !activePreview) throw new Error("Missing active remote-image target");
    let activeConnectivityReads = 0;
    Object.defineProperty(activePreview, "isConnected", {
      configurable: true,
      get: () => {
        activeConnectivityReads += 1;
        return true;
      },
    });
    const unrelated = document.createElement("span");
    shadow.append(unrelated);
    unrelated.remove();
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(activeConnectivityReads).toBe(0);
    expect(signals[0]?.aborted).toBe(false);

    await view.openChat(123, "Reina");
    await vi.waitFor(() => expect(signals[0]?.aborted).toBe(true));
    expect(signals).toHaveLength(2);
    expect(signals[1]?.aborted).toBe(false);

    view.close();
    expect(signals[1]?.aborted).toBe(true);
    await view.openChat(123, "Reina");
    expect(signals).toHaveLength(3);
    expect(signals[2]?.aborted).toBe(false);

    view.destroy();
    expect(signals[2]?.aborted).toBe(true);
    expect(remoteImageLoader.destroy).toHaveBeenCalledOnce();
  });

  it("bounds seven visible Always previews without capacity reload thrash", async () => {
    let visibilityCallback: IntersectionObserverCallback | undefined;
    const observe = vi.fn();
    const unobserve = vi.fn();
    class TestIntersectionObserver {
      readonly root = null;
      readonly rootMargin = "240px 0px";
      readonly thresholds = [0.01];

      constructor(callback: IntersectionObserverCallback) {
        visibilityCallback = callback;
      }

      observe = observe;
      unobserve = unobserve;
      disconnect = vi.fn();
      takeRecords = (): IntersectionObserverEntry[] => [];
    }
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => false,
      isMemberInCurrentRoom: () => false,
      getRoomCharacters: () => [],
      getCurrentRoomName: () => undefined,
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkChat.imagePreviews = "always";
      draft.linkChat.gallery.saved = Array.from({ length: 40 }, (_, index) => ({
        url: `https://images.example/gallery-${index}.png`,
        addedAt: Date.now() - index,
      }));
    });
    const galleryStore: GalleryStore = {
      list: vi.fn(async () => []),
      get: vi.fn(async () => undefined),
      add: vi.fn(async () => { throw new Error("not used"); }),
      delete: vi.fn(async () => undefined),
      close: vi.fn(),
    };
    const pending: Array<{
      signal: AbortSignal;
      resolve: (url: string) => void;
    }> = [];
    const remoteImageLoader = {
      load: vi.fn((_url: string, signal?: AbortSignal) => {
        if (!signal) throw new Error("Missing preview abort signal");
        return new Promise<string>((resolve, reject) => {
          pending.push({ signal, resolve });
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("cancelled", "AbortError")),
            { once: true },
          );
        });
      }),
      destroy: vi.fn(),
    };
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.24.0",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      galleryStore,
      undefined,
      remoteImageLoader,
    );
    view.mount();
    await view.open();
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>(".kl-sidebar-gallery")?.click();

    await vi.waitFor(() => {
      expect(shadow?.querySelectorAll(".kl-gallery-item")).toHaveLength(40);
      expect(observe).toHaveBeenCalledTimes(40);
    });
    expect(remoteImageLoader.load).not.toHaveBeenCalled();
    expect(shadow?.querySelectorAll('.kl-image-preview[data-state="waiting"]')).toHaveLength(40);
    const nearViewport = [...(shadow?.querySelectorAll<HTMLElement>(".kl-image-preview") ?? [])]
      .slice(0, 7);
    visibilityCallback?.(
      nearViewport.map(
        (target) => ({ target, isIntersecting: true }) as unknown as IntersectionObserverEntry,
      ),
      {} as IntersectionObserver,
    );
    await vi.waitFor(() => expect(remoteImageLoader.load).toHaveBeenCalledTimes(4));
    expect(shadow?.querySelectorAll('.kl-image-preview[data-state="loading"]')).toHaveLength(4);
    expect(shadow?.querySelectorAll('.kl-image-preview[data-state="queued"]')).toHaveLength(3);
    expect(shadow?.querySelectorAll('.kl-image-preview[data-state="waiting"]')).toHaveLength(33);

    for (let index = 0; index < nearViewport.length; index += 1) {
      await vi.waitFor(() => expect(pending[index]).toBeDefined());
      pending[index]?.resolve(`blob:kikilink/visible-${index}`);
      const image = await vi.waitFor(() => {
        const candidate = nearViewport[index]?.querySelector<HTMLImageElement>("img");
        expect(candidate).not.toBeNull();
        return candidate!;
      });
      expect(image.loading).toBe("eager");
      image.dispatchEvent(new Event("load"));
    }
    await vi.waitFor(() => {
      expect(remoteImageLoader.load).toHaveBeenCalledTimes(7);
      expect(shadow?.querySelectorAll('.kl-image-preview[data-state="loaded"]')).toHaveLength(6);
    });
    expect(nearViewport[0]?.dataset.state).toBe("paused");
    expect(nearViewport[0]?.querySelector("img")).toBeNull();

    // A capacity-paused target is deliberately not re-armed while it remains visible.
    visibilityCallback?.(
      [{ target: nearViewport[0], isIntersecting: true } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await Promise.resolve();
    expect(remoteImageLoader.load).toHaveBeenCalledTimes(7);

    visibilityCallback?.(
      [{ target: nearViewport[1], isIntersecting: false } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(nearViewport[1]?.dataset.state).toBe("waiting");
    expect(nearViewport[1]?.querySelector("img")).toBeNull();
    visibilityCallback?.(
      [{ target: nearViewport[1], isIntersecting: true } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await vi.waitFor(() => expect(remoteImageLoader.load).toHaveBeenCalledTimes(8));
    view.close();
    await vi.waitFor(() => expect(pending[7]?.signal.aborted).toBe(true));
    await Promise.resolve();
    expect(remoteImageLoader.load).toHaveBeenCalledTimes(8);

    view.destroy();
    expect(remoteImageLoader.destroy).toHaveBeenCalledOnce();

    vi.stubGlobal("IntersectionObserver", undefined);
    const fallbackLoader = {
      load: vi.fn(async (_url: string, _signal?: AbortSignal) => "blob:kikilink/fallback"),
      destroy: vi.fn(),
    };
    const fallbackView = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.24.0",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      galleryStore,
      undefined,
      fallbackLoader,
    );
    fallbackView.mount();
    await fallbackView.open();
    const fallbackShadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    fallbackShadow?.querySelector<HTMLButtonElement>(".kl-sidebar-gallery")?.click();
    await vi.waitFor(() => expect(fallbackLoader.load).toHaveBeenCalledTimes(4));
    for (const expectedCalls of [8, 12]) {
      for (const image of fallbackShadow?.querySelectorAll<HTMLImageElement>(
        '.kl-image-preview[data-state="loading"] img',
      ) ?? []) {
        expect(image.loading).toBe("eager");
        image.dispatchEvent(new Event("load"));
      }
      await vi.waitFor(() => expect(fallbackLoader.load).toHaveBeenCalledTimes(expectedCalls));
    }
    for (const image of fallbackShadow?.querySelectorAll<HTMLImageElement>(
      '.kl-image-preview[data-state="loading"] img',
    ) ?? []) {
      expect(image.loading).toBe("eager");
      image.dispatchEvent(new Event("load"));
    }
    expect(
      fallbackShadow?.querySelectorAll('.kl-image-preview[data-state="paused"]'),
    ).toHaveLength(34);
    expect(
      fallbackShadow?.querySelectorAll('.kl-image-preview[data-state="loaded"]'),
    ).toHaveLength(6);
    fallbackView.destroy();
    expect(fallbackLoader.destroy).toHaveBeenCalledOnce();
  });

  it("invalidates a pending Gallery read on navigation and reports device-store failures", async () => {
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => false,
      isMemberInCurrentRoom: () => false,
      getRoomCharacters: () => [],
      getCurrentRoomName: () => undefined,
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    let resolveDeviceRead: ((images: DeviceGalleryImage[]) => void) | undefined;
    const pendingDeviceRead = new Promise<DeviceGalleryImage[]>((resolve) => {
      resolveDeviceRead = resolve;
    });
    let resolveDestroyedRead: ((images: DeviceGalleryImage[]) => void) | undefined;
    const destroyedDeviceRead = new Promise<DeviceGalleryImage[]>((resolve) => {
      resolveDestroyedRead = resolve;
    });
    const galleryStore: GalleryStore = {
      list: vi
        .fn<GalleryStore["list"]>()
        .mockImplementationOnce(() => pendingDeviceRead)
        .mockRejectedValueOnce(new Error("IndexedDB became unavailable"))
        .mockImplementationOnce(() => destroyedDeviceRead),
      get: vi.fn(async () => undefined),
      add: vi.fn(async () => { throw new Error("not used"); }),
      delete: vi.fn(async () => undefined),
      close: vi.fn(),
    };
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:kikilink/late");
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.24.0",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      galleryStore,
    );
    view.mount();
    await view.open();
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>(".kl-sidebar-gallery")?.click();
    await vi.waitFor(() => expect(galleryStore.list).toHaveBeenCalledOnce());
    shadow?.querySelector<HTMLButtonElement>('[data-target="home"]')?.click();
    resolveDeviceRead?.([{
      id: "late-device-image",
      name: "KikiLink image",
      mimeType: "image/webp",
      width: 320,
      height: 200,
      createdAt: Date.now(),
      blob: new Blob([Uint8Array.of(1)], { type: "image/webp" }),
    }]);
    await Promise.resolve();
    await Promise.resolve();
    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(shadow?.querySelector<HTMLElement>(".kl-gallery-page")?.hidden).toBe(true);

    shadow?.querySelector<HTMLButtonElement>(".kl-sidebar-gallery")?.click();
    await vi.waitFor(() => {
      expect(galleryStore.list).toHaveBeenCalledTimes(2);
      expect(shadow?.querySelector(".kl-gallery-storage-error")?.textContent).toContain(
        "Device Gallery could not be read",
      );
    });
    expect(shadow?.querySelector(".kl-gallery-grid")?.textContent).not.toContain(
      "Your Gallery is empty",
    );
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-gallery-header-actions button") ?? [])]
      .find((button) => button.textContent === "Refresh")
      ?.click();
    await vi.waitFor(() => expect(galleryStore.list).toHaveBeenCalledTimes(3));
    view.destroy();
    resolveDestroyedRead?.([{
      id: "destroyed-device-image",
      name: "KikiLink image",
      mimeType: "image/webp",
      width: 320,
      height: 200,
      createdAt: Date.now(),
      blob: new Blob([Uint8Array.of(2)], { type: "image/webp" }),
    }]);
    await Promise.resolve();
    await Promise.resolve();
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it("never reopens a delayed addon profile after the Link Deck is closed", async () => {
    vi.useFakeTimers();
    const adapter = {
      getMemberName: () => "Unknown player",
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 321, memberName: "Unknown player" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      refreshOnlineFriends: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => false),
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.24.0",
    );
    view.mount();
    await view.openChat(321, "Unknown player");
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;

    shadow?.querySelector<HTMLElement>(".kl-chat-header > .kl-avatar")?.click();
    expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
    expect(shadow?.querySelector(".kl-addon-profile-loading")?.textContent).toContain("Checking");

    view.close();
    await vi.advanceTimersByTimeAsync(1_700);

    expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(false);
    view.destroy();
    vi.useRealTimers();
  });

  it("contains profile-menu presence and storage failures instead of leaking rejections", async () => {
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => "Reina",
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      refreshOnlineFriends: () => false,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => false),
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
      getRoomCharacters: () => [],
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    const presence = new LinkPresenceService(
      adapter,
      settings,
      new EventBus<KikiLinkEvents>(),
      "0.24.0",
    );
    const view = new LinkChatView(
      adapter,
      service,
      settings,
      "0.24.0",
      undefined,
      undefined,
      presence,
    );
    view.mount();
    await view.openChat(123, "Reina");
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    const target = shadow?.querySelector<HTMLElement>(".kl-chat-person");
    if (!target) throw new Error("Missing profile-menu target");

    const presenceRequest = vi.spyOn(presence, "request").mockImplementationOnce(() => {
      throw new Error("revoked presence proxy");
    });
    target.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-toast")?.textContent).toContain(
        "Player actions could not be loaded",
      );
      expect(shadow?.querySelector<HTMLElement>(".kl-profile-menu")?.hidden).toBe(true);
    });
    presenceRequest.mockRestore();

    const conversationRead = vi.spyOn(service, "getConversation").mockRejectedValueOnce(
      new Error("private storage unavailable"),
    );
    target.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-profile-menu")?.hidden).toBe(true);
      expect(shadow?.querySelector(".kl-toast")?.textContent).toContain(
        "Player actions could not be loaded",
      );
    });

    vi.spyOn(presence, "hasCompatiblePeer").mockReturnValue(true);
    conversationRead.mockRejectedValueOnce(new Error("profile storage unavailable"));
    const avatar = shadow?.querySelector<HTMLElement>(".kl-chat-header > .kl-avatar");
    if (!avatar) throw new Error("Missing addon-profile avatar target");
    avatar.click();
    expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
    expect(shadow?.querySelector(".kl-addon-profile-loading")?.textContent).toContain("Checking");
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(false);
      expect(shadow?.querySelector(".kl-toast")?.textContent).toContain(
        "This KikiLink profile could not be read right now",
      );
    });

    avatar.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
      expect(shadow?.querySelector(".kl-addon-profile-card")?.textContent).toContain("Reina");
    });

    const unhandled: unknown[] = [];
    const captureUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", captureUnhandled);
    try {
      const openChat = vi.spyOn(view, "openChat");
      openChat.mockRejectedValueOnce(new Error("profile message unavailable"));
      shadow?.querySelector<HTMLButtonElement>(".kl-addon-profile-action--primary")?.click();
      await vi.waitFor(() => {
        expect(shadow?.querySelector(".kl-toast")?.getAttribute("role")).toBe("alert");
        expect(shadow?.querySelector(".kl-toast")?.textContent).toContain(
          "profile message unavailable",
        );
      });

      target.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
      );
      await vi.waitFor(() => {
        expect(shadow?.querySelector<HTMLElement>(".kl-profile-menu")?.hidden).toBe(false);
      });
      openChat.mockRejectedValueOnce(new Error("context message unavailable"));
      const contextMessage = [...(
        shadow?.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action") ?? []
      )].find((button) => button.querySelector(".kl-profile-menu-label")?.textContent === "Message");
      if (!contextMessage) throw new Error("Missing context Message action");
      contextMessage.click();
      await vi.waitFor(() => {
        expect(shadow?.querySelector(".kl-toast")?.textContent).toContain(
          "context message unavailable",
        );
      });

      vi.spyOn(service, "togglePinned").mockRejectedValueOnce(new Error("pin unavailable"));
      target.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
      );
      await vi.waitFor(() => {
        expect(shadow?.querySelector<HTMLElement>(".kl-profile-menu")?.hidden).toBe(false);
      });
      const pin = [...(
        shadow?.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action") ?? []
      )].find((button) => button.querySelector(".kl-profile-menu-label")?.textContent === "Pin chat");
      if (!pin) throw new Error("Missing context Pin chat action");
      pin.click();
      await vi.waitFor(() => {
        expect(shadow?.querySelector(".kl-toast")?.textContent).toContain("pin unavailable");
      });

      vi.spyOn(service, "markUnread").mockRejectedValueOnce(new Error("mark unread unavailable"));
      target.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
      );
      await vi.waitFor(() => {
        expect(shadow?.querySelector<HTMLElement>(".kl-profile-menu")?.hidden).toBe(false);
      });
      const markUnread = [...(
        shadow?.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action") ?? []
      )].find((button) => button.querySelector(".kl-profile-menu-label")?.textContent === "Mark unread");
      if (!markUnread) throw new Error("Missing context Mark unread action");
      markUnread.click();
      await vi.waitFor(() => {
        expect(shadow?.querySelector(".kl-toast")?.textContent).toContain(
          "mark unread unavailable",
        );
      });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", captureUnhandled);
      view.destroy();
    }
  });

  it("invalidates an in-flight profile menu when the Link Deck is destroyed", async () => {
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => "Reina",
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      refreshOnlineFriends: () => false,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => false),
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
      getRoomCharacters: () => [],
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    const view = new LinkChatView(adapter, service, settings, "0.24.0");
    view.mount();
    await view.openChat(123, "Reina");
    const target = document
      .querySelector<HTMLElement>("#kikilink-root")
      ?.shadowRoot?.querySelector<HTMLElement>(".kl-chat-person");
    if (!target) throw new Error("Missing profile-menu target");
    let rejectRead: ((reason?: unknown) => void) | undefined;
    vi.spyOn(service, "getConversation").mockImplementationOnce(
      () => new Promise((_resolve, reject) => {
        rejectRead = reject;
      }),
    );

    target.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    await Promise.resolve();
    view.destroy();
    rejectRead?.(new Error("late storage rejection"));
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector("#kikilink-root")).toBeNull();
  });

  it("cancels profile long-press work on close and account teardown", async () => {
    vi.useFakeTimers();
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => "Reina",
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      refreshOnlineFriends: () => false,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => false),
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
      getRoomCharacters: () => [],
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    const view = new LinkChatView(adapter, service, settings, "0.24.0");
    view.mount();
    await view.openChat(123, "Reina");
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    const target = shadow?.querySelector<HTMLElement>(".kl-chat-person");
    if (!target) throw new Error("Missing profile-menu target");
    const getConversation = vi.spyOn(service, "getConversation");
    const touchStart = (): void => {
      const event = new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 40,
        clientY: 40,
      });
      Object.defineProperty(event, "pointerType", { value: "touch" });
      target.dispatchEvent(event);
    };

    touchStart();
    view.close();
    await vi.advanceTimersByTimeAsync(600);
    expect(getConversation).not.toHaveBeenCalled();

    await view.openChat(123, "Reina");
    getConversation.mockClear();
    touchStart();
    view.destroy();
    await vi.advanceTimersByTimeAsync(600);
    expect(getConversation).not.toHaveBeenCalled();
  });

  it("keeps a selected local image offline until Upload & send is clicked", async () => {
    const sendBeep = vi.fn((peerNumber: number, content: string, includeRoom: boolean) => ({
      direction: "outgoing" as const,
      peerNumber,
      peerName: "Reina",
      content,
      sentAt: Date.now(),
      includeRoom,
    }));
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      isMemberInCurrentRoom: () => false,
      getRoomCharacters: () => [],
      getCurrentRoomName: () => undefined,
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep,
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkChat.imageUploads = {
        enabled: true,
        retention: "24h",
      };
    });
    const service = new ChatService(new MemoryChatRepository(), settings);
    const preparedBlob = new Blob([Uint8Array.of(1, 2, 3)], { type: "image/webp" });
    const imageUploader: LocalImageUploader<LitterboxUploadConfig> = {
      prepare: vi.fn(async () => ({
        blob: preparedBlob,
        width: 640,
        height: 480,
        sourceBytes: 10,
      })),
      upload: vi.fn(async () =>
        "https://litter.catbox.moe/photo.webp"),
    };
    const localGallery: DeviceGalleryImage[] = [];
    const galleryStore: GalleryStore = {
      list: vi.fn(async () => [...localGallery]),
      get: vi.fn(async (id) => localGallery.find((image) => image.id === id)),
      add: vi.fn(async (image) => {
        const saved: DeviceGalleryImage = {
          id: "gallery-one",
          name: "KikiLink image",
          mimeType: "image/webp",
          width: image.width,
          height: image.height,
          createdAt: Date.now(),
          blob: image.blob,
        };
        localGallery.push(saved);
        return saved;
      }),
      delete: vi.fn(async (id) => {
        const index = localGallery.findIndex((image) => image.id === id);
        if (index >= 0) localGallery.splice(index, 1);
      }),
      close: vi.fn(),
    };
    const catboxImageUpload = vi.fn(async () =>
      "https://files.catbox.moe/permanent-gallery.webp");
    const view = new LinkChatView(
      adapter,
      service,
      settings,
      "0.17.0",
      undefined,
      undefined,
      undefined,
      imageUploader,
      undefined,
      undefined,
      galleryStore,
      catboxImageUpload,
    );
    view.mount();
    await view.openChat(123, "Reina");

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>(".kl-attach-image")?.click();
    shadow?.querySelector<HTMLButtonElement>("#kikilink-image-source-file")?.click();
    const fileInput = shadow?.querySelector<HTMLInputElement>(
      "#kikilink-image-file-panel input[type=file]",
    );
    if (!fileInput) throw new Error("Missing local image input");
    const selected = new File([Uint8Array.of(0xff, 0xd8, 0xff)], "personal-name.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(fileInput, "files", { configurable: true, value: [selected] });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => {
      expect(imageUploader.prepare).toHaveBeenCalledWith(selected);
      expect(shadow?.querySelector(".kl-local-image-status")?.textContent).toContain(
        "Prepared locally",
      );
    });
    expect(imageUploader.upload).not.toHaveBeenCalled();
    expect(sendBeep).not.toHaveBeenCalled();

    shadow
      ?.querySelector<HTMLButtonElement>(".kl-image-dialog .kl-text-button--primary")
      ?.click();
    await vi.waitFor(() => {
      expect(imageUploader.upload).toHaveBeenCalledWith(
        expect.objectContaining({ blob: preparedBlob, width: 640, height: 480 }),
        { retention: "24h" },
        expect.any(AbortSignal),
      );
      expect(sendBeep).toHaveBeenCalledWith(
        123,
        "https://litter.catbox.moe/photo.webp",
        false,
      );
    });

    vi.mocked(imageUploader.prepare).mockClear();
    vi.mocked(imageUploader.upload).mockClear();
    sendBeep.mockClear();
    shadow?.querySelector<HTMLButtonElement>(".kl-sidebar-gallery")?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-gallery-page")?.hidden).toBe(false);
    });
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-gallery-header-actions button") ?? [])]
      .find((button) => button.textContent === "Add image")
      ?.click();
    shadow?.querySelector<HTMLButtonElement>("#kikilink-image-source-file")?.click();
    const galleryFileInput = shadow?.querySelector<HTMLInputElement>(
      "#kikilink-image-file-panel input[type=file]",
    );
    if (!galleryFileInput) throw new Error("Missing Gallery local image input");
    const galleryFile = new File([Uint8Array.of(0xff, 0xd8, 0xff)], "gallery.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(galleryFileInput, "files", {
      configurable: true,
      value: [galleryFile],
    });
    galleryFileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => {
      expect(imageUploader.prepare).toHaveBeenCalledWith(galleryFile);
    });
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-image-dialog .kl-text-button--primary")
      ?.click();
    await vi.waitFor(() => {
      expect(galleryStore.add).toHaveBeenCalledWith(
        expect.objectContaining({ blob: preparedBlob, width: 640, height: 480 }),
      );
      expect(settings.get().linkChat.gallery.saved).toEqual([]);
      expect(shadow?.querySelector(".kl-gallery-item")?.textContent).toContain(
        "Stored permanently on this device",
      );
    });
    expect(imageUploader.upload).not.toHaveBeenCalled();
    expect(sendBeep).not.toHaveBeenCalled();

    vi.mocked(imageUploader.prepare).mockClear();
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-gallery-header-actions button") ?? [])]
      .find((button) => button.textContent === "Add image")
      ?.click();
    shadow?.querySelector<HTMLButtonElement>("#kikilink-image-source-file")?.click();
    const catboxFileInput = shadow?.querySelector<HTMLInputElement>(
      "#kikilink-image-file-panel input[type=file]",
    );
    if (!catboxFileInput) throw new Error("Missing Catbox Gallery file input");
    const catboxFile = new File([Uint8Array.of(0xff, 0xd8, 0xff)], "catbox.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(catboxFileInput, "files", { configurable: true, value: [catboxFile] });
    catboxFileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(imageUploader.prepare).toHaveBeenCalledWith(catboxFile));
    const catboxStorage = shadow?.querySelector<HTMLInputElement>(
      'input[name="kikilink-gallery-storage"][value="catbox"]',
    );
    if (!catboxStorage) throw new Error("Missing Catbox Gallery choice");
    catboxStorage.checked = true;
    catboxStorage.dispatchEvent(new Event("change", { bubbles: true }));
    expect(shadow?.querySelector(".kl-image-dialog .kl-text-button--primary")?.textContent).toBe(
      "Upload to Catbox",
    );
    expect(shadow?.querySelector(".kl-local-image-status")?.textContent).toContain(
      "no automatic expiry",
    );
    expect(shadow?.querySelector<HTMLElement>(".kl-gallery-retention-field")?.hidden).toBe(true);
    shadow?.querySelector<HTMLButtonElement>(".kl-image-dialog .kl-text-button--primary")?.click();
    await vi.waitFor(() => {
      expect(catboxImageUpload).toHaveBeenCalledWith(
        expect.objectContaining({ blob: preparedBlob }),
        undefined,
        expect.any(AbortSignal),
      );
      expect(settings.get().linkChat.gallery.saved[0]?.url).toBe(
        "https://files.catbox.moe/permanent-gallery.webp",
      );
      expect(shadow?.querySelector(".kl-gallery-grid")?.textContent).toContain("Catbox");
    });

    vi.mocked(imageUploader.prepare).mockClear();
    vi.mocked(imageUploader.upload).mockClear();
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-gallery-header-actions button") ?? [])]
      .find((button) => button.textContent === "Add image")
      ?.click();
    shadow?.querySelector<HTMLButtonElement>("#kikilink-image-source-file")?.click();
    const litterboxFileInput = shadow?.querySelector<HTMLInputElement>(
      "#kikilink-image-file-panel input[type=file]",
    );
    if (!litterboxFileInput) throw new Error("Missing Litterbox Gallery file input");
    const litterboxFile = new File([Uint8Array.of(0xff, 0xd8, 0xff)], "temporary.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(litterboxFileInput, "files", {
      configurable: true,
      value: [litterboxFile],
    });
    litterboxFileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(imageUploader.prepare).toHaveBeenCalledWith(litterboxFile));
    const litterboxStorage = shadow?.querySelector<HTMLInputElement>(
      'input[name="kikilink-gallery-storage"][value="litterbox"]',
    );
    const galleryRetention = shadow?.querySelector<HTMLSelectElement>(".kl-gallery-retention");
    if (!litterboxStorage || !galleryRetention) throw new Error("Missing Litterbox Gallery controls");
    litterboxStorage.checked = true;
    litterboxStorage.dispatchEvent(new Event("change", { bubbles: true }));
    galleryRetention.value = "72h";
    galleryRetention.dispatchEvent(new Event("change", { bubbles: true }));
    expect(shadow?.querySelector<HTMLElement>(".kl-gallery-retention-field")?.hidden).toBe(false);
    let resolveLitterboxUpload: ((url: string) => void) | undefined;
    vi.mocked(imageUploader.upload).mockImplementationOnce(
      () => new Promise<string>((resolve) => {
        resolveLitterboxUpload = resolve;
      }),
    );
    const uploadStartedAt = Date.now();
    shadow?.querySelector<HTMLButtonElement>(".kl-image-dialog .kl-text-button--primary")?.click();
    await vi.waitFor(() => {
      expect(imageUploader.upload).toHaveBeenCalledWith(
        expect.objectContaining({ blob: preparedBlob }),
        { retention: "72h" },
        expect.any(AbortSignal),
      );
    });
    expect(galleryRetention.disabled).toBe(true);
    expect(
      [...(shadow?.querySelectorAll<HTMLInputElement>(
        'input[name="kikilink-gallery-storage"]',
      ) ?? [])].every((input) => input.disabled),
    ).toBe(true);
    galleryRetention.value = "1h";
    resolveLitterboxUpload?.("https://litter.catbox.moe/gallery-temporary.webp");
    await vi.waitFor(() => {
      const saved = settings.get().linkChat.gallery.saved.find(
        ({ url }) => url === "https://litter.catbox.moe/gallery-temporary.webp",
      );
      expect(saved?.expiresAt).toBeGreaterThanOrEqual(uploadStartedAt + 72 * 60 * 60 * 1_000);
      expect(saved?.expiresAt).toBeLessThanOrEqual(Date.now() + 72 * 60 * 60 * 1_000);
      expect(shadow?.querySelector(".kl-gallery-grid")?.textContent).toContain("Expires");
      expect(shadow?.querySelector(".kl-toast")?.textContent).toContain("3 days");
    });
    settings.update((draft) => {
      const saved = draft.linkChat.gallery.saved.find(
        ({ url }) => url === "https://litter.catbox.moe/gallery-temporary.webp",
      );
      if (!saved) throw new Error("Missing temporary Gallery entry");
      saved.addedAt = Date.now() - 2_000;
      saved.expiresAt = Date.now() - 1_000;
    });
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-gallery-header-actions button") ?? [])]
      .find((button) => button.textContent === "Refresh")
      ?.click();
    await vi.waitFor(() => {
      expect(settings.get().linkChat.gallery.saved).not.toContainEqual(
        expect.objectContaining({ url: "https://litter.catbox.moe/gallery-temporary.webp" }),
      );
      expect(settings.get().linkChat.gallery.hiddenUrls).toContain(
        "https://litter.catbox.moe/gallery-temporary.webp",
      );
    });
    expect(sendBeep).not.toHaveBeenCalled();
    view.destroy();
  });

  it("aborts and clears a pending Litterbox image operation when the Link Deck closes", async () => {
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      isMemberInCurrentRoom: () => false,
      getRoomCharacters: () => [],
      getCurrentRoomName: () => undefined,
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkChat.imageUploads = { enabled: true, retention: "24h" };
    });
    const preparedBlob = new Blob([Uint8Array.of(1, 2, 3)], { type: "image/webp" });
    let uploadSignal: AbortSignal | undefined;
    const imageUploader: LocalImageUploader<LitterboxUploadConfig> = {
      prepare: vi.fn(async () => ({
        blob: preparedBlob,
        width: 320,
        height: 240,
        sourceBytes: 3,
      })),
      upload: vi.fn((_image, _config, signal) => {
        uploadSignal = signal;
        return new Promise<string>((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new Error("The upload was cancelled")),
            { once: true },
          );
        });
      }),
    };
    const service = new ChatService(new MemoryChatRepository(), settings);
    const view = new LinkChatView(
      adapter,
      service,
      settings,
      "0.27.0",
      undefined,
      undefined,
      undefined,
      imageUploader,
    );
    view.mount();
    await view.openChat(123, "Reina");

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>(".kl-attach-image")?.click();
    shadow?.querySelector<HTMLButtonElement>("#kikilink-image-source-file")?.click();
    const fileInput = shadow?.querySelector<HTMLInputElement>(
      "#kikilink-image-file-panel input[type=file]",
    );
    if (!fileInput) throw new Error("Missing local image input");
    const file = new File([Uint8Array.of(0xff, 0xd8, 0xff)], "private.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(fileInput, "files", { configurable: true, value: [file] });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(imageUploader.prepare).toHaveBeenCalledWith(file));
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-image-dialog .kl-text-button--primary")
      ?.click();
    await vi.waitFor(() => expect(uploadSignal).toBeInstanceOf(AbortSignal));

    view.close();

    expect(uploadSignal?.aborted).toBe(true);
    expect(shadow?.querySelector<HTMLDialogElement>(".kl-image-dialog")?.open).toBe(false);
    await Promise.resolve();
    view.destroy();
  });

  it("aborts hidden room-media and playlist uploads while preserving latest-operation signals", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [],
      getCurrentRoomName: () => "Moon Garden",
      isInChatRoom: () => true,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
      getRoomAdminSnapshot: () => ({
        roomName: "Moon Garden",
        isAdmin: true,
        customization: {
          imageUrl: "",
          musicUrl: "",
          sizeMode: 2,
          musicSync: false,
        },
        players: [],
      }),
      updateRoomCustomization: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkChat.imageUploads = { enabled: true, retention: "24h" };
    });
    const roomImageSignals: AbortSignal[] = [];
    const imageUploader: LocalImageUploader<LitterboxUploadConfig> = {
      prepare: vi.fn(async () => ({
        blob: new Blob([Uint8Array.of(1, 2, 3)], { type: "image/webp" }),
        width: 640,
        height: 480,
        sourceBytes: 3,
      })),
      upload: vi.fn((_image, _config, signal) => {
        if (!signal) throw new Error("Missing room-image lifecycle signal");
        roomImageSignals.push(signal);
        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new Error("The upload was cancelled")),
            { once: true },
          );
        });
      }),
    };
    const musicStore: MusicStore = {
      list: vi.fn(async () => []),
      get: vi.fn(async () => undefined),
      add: vi.fn(async () => { throw new Error("not used"); }),
      delete: vi.fn(async () => undefined),
      close: vi.fn(),
    };
    const privilegedUploads: Array<{
      details: KikiLinkGmXhrDetails;
      abort: ReturnType<typeof vi.fn>;
    }> = [];
    vi.stubGlobal("GM_xmlhttpRequest", vi.fn((details: KikiLinkGmXhrDetails) => {
      const abort = vi.fn();
      privilegedUploads.push({ details, abort });
      return { abort };
    }));
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.27.0",
      undefined,
      undefined,
      undefined,
      imageUploader,
      undefined,
      musicStore,
    );
    view.mount();
    await view.open();
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;

    shadow?.querySelector<HTMLButtonElement>('[data-target="room"]')?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-room-page")?.hidden).toBe(false);
    });
    const roomImageInput = shadow?.querySelector<HTMLInputElement>(
      '.kl-room-media input[type="file"][accept="image/*"]',
    );
    if (!roomImageInput) throw new Error("Missing room background file input");
    const backgroundFile = new File([Uint8Array.of(1, 2, 3)], "room.png", {
      type: "image/png",
    });
    Object.defineProperty(roomImageInput, "files", {
      configurable: true,
      value: [backgroundFile],
    });
    roomImageInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(roomImageSignals).toHaveLength(1));
    Object.defineProperty(roomImageInput, "files", {
      configurable: true,
      value: [new File([Uint8Array.of(9, 9, 9)], "newer-room.png", { type: "image/png" })],
    });
    roomImageInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(roomImageSignals).toHaveLength(2));
    expect(roomImageSignals[0]?.aborted).toBe(true);
    expect(roomImageSignals[1]?.aborted).toBe(false);
    view.close();
    expect(roomImageSignals[1]?.aborted).toBe(true);

    await view.open();
    shadow?.querySelector<HTMLButtonElement>('[data-target="room"]')?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-room-page")?.hidden).toBe(false);
    });
    const roomMusicInput = shadow?.querySelector<HTMLInputElement>(
      '.kl-room-media input[type="file"][accept^="audio/mpeg"]',
    );
    if (!roomMusicInput) throw new Error("Missing room music file input");
    Object.defineProperty(roomMusicInput, "files", {
      configurable: true,
      value: [new File([Uint8Array.of(4, 5, 6)], "room.mp3", { type: "audio/mpeg" })],
    });
    roomMusicInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(privilegedUploads).toHaveLength(1));
    Object.defineProperty(roomMusicInput, "files", {
      configurable: true,
      value: [new File([Uint8Array.of(6, 5, 4)], "newer-room.mp3", { type: "audio/mpeg" })],
    });
    roomMusicInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(privilegedUploads).toHaveLength(2));
    expect(privilegedUploads[0]?.abort).toHaveBeenCalledOnce();
    view.close();
    expect(privilegedUploads[1]?.abort).toHaveBeenCalledOnce();

    await view.open();
    shadow?.querySelector<HTMLButtonElement>('[data-target="music"]')?.click();
    const playlistFile = shadow?.querySelector<HTMLInputElement>(
      ".kl-music-add input[type=file]",
    );
    const playlistMode = shadow?.querySelector<HTMLSelectElement>(".kl-music-file-mode");
    if (!playlistFile || !playlistMode) throw new Error("Missing playlist upload controls");
    Object.defineProperty(playlistFile, "files", {
      configurable: true,
      value: [new File([Uint8Array.of(7, 8, 9)], "playlist.mp3", { type: "audio/mpeg" })],
    });
    playlistMode.value = "catbox";
    shadow?.querySelector<HTMLButtonElement>(".kl-music-add .kl-text-button--primary")?.click();
    await vi.waitFor(() => expect(privilegedUploads).toHaveLength(3));
    view.close();
    expect(privilegedUploads[2]?.abort).toHaveBeenCalledOnce();
    expect(settings.get().linkMusic.playlists[0]?.tracks).toEqual([]);

    await Promise.resolve();
    view.destroy();
  });

  it("keeps late room-media upload results out of a different room", async () => {
    let roomName = "Moon Garden";
    const roomSnapshot = () => ({
      roomName,
      isAdmin: true,
      customization: {
        imageUrl: "https://litter.catbox.moe/original.webp",
        musicUrl: "https://cdn.example/original.mp3",
        sizeMode: 2,
        musicSync: false,
      },
      settings: {
        name: roomName,
        description: "",
        background: "Boudoir",
        limit: 10,
        game: "",
        space: "X",
        language: "EN",
        visibility: ["All"],
        access: ["All"],
        blockCategory: [],
        admins: [999],
        whitelist: [],
        blacklist: [],
        custom: {
          imageUrl: "https://litter.catbox.moe/original.webp",
          imageFilter: "",
          musicUrl: "https://cdn.example/original.mp3",
          sizeMode: 2,
          musicSync: false,
        },
      },
      players: [],
    });
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [],
      getCurrentRoomName: () => roomName,
      isInChatRoom: () => true,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
      getRoomAdminSnapshot: roomSnapshot,
      updateRoomCustomization: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkChat.imageUploads = { enabled: true, retention: "24h" };
    });
    const backgroundUpload = deferred<string>();
    const imageUploader: LocalImageUploader<LitterboxUploadConfig> = {
      prepare: vi.fn(async () => ({
        blob: new Blob([Uint8Array.of(1, 2, 3)], { type: "image/webp" }),
        width: 640,
        height: 480,
        sourceBytes: 3,
      })),
      upload: vi.fn(() => backgroundUpload.promise),
    };
    let roomMusicRequest: KikiLinkGmXhrDetails | undefined;
    vi.stubGlobal("GM_xmlhttpRequest", vi.fn((details: KikiLinkGmXhrDetails) => {
      roomMusicRequest = details;
      return { abort: vi.fn() };
    }));
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.27.0",
      undefined,
      undefined,
      undefined,
      imageUploader,
    );
    view.mount();
    await view.open();
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    if (!shadow) throw new Error("Missing KikiLink shadow root");
    shadow?.querySelector<HTMLButtonElement>('[data-target="room"]')?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-room-page")?.hidden).toBe(false);
    });

    const roomImageInput = shadow?.querySelector<HTMLInputElement>(
      '.kl-room-media input[type="file"][accept="image/*"]',
    );
    const roomUrls = shadow?.querySelectorAll<HTMLInputElement>(
      ".kl-room-media input[type=url]",
    );
    if (!roomImageInput || !roomUrls?.[0] || !roomUrls[1]) {
      throw new Error("Missing room media controls");
    }
    Object.defineProperty(roomImageInput, "files", {
      configurable: true,
      value: [new File([Uint8Array.of(1)], "late-room.png", { type: "image/png" })],
    });
    roomImageInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(imageUploader.upload).toHaveBeenCalledOnce());
    roomName = "Sun Garden";
    backgroundUpload.resolve("https://litter.catbox.moe/wrong-room.webp");
    await Promise.resolve();
    await Promise.resolve();
    expect(roomUrls[0].value).toBe("https://litter.catbox.moe/original.webp");

    const roomMusicInput = shadow.querySelector<HTMLInputElement>(
      '.kl-room-media input[type="file"][accept^="audio/mpeg"]',
    );
    if (!roomMusicInput) throw new Error("Missing room music control");
    Object.defineProperty(roomMusicInput, "files", {
      configurable: true,
      value: [new File([Uint8Array.of(2)], "late-room.mp3", { type: "audio/mpeg" })],
    });
    roomMusicInput.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(roomMusicRequest).toBeDefined());
    roomName = "Star Garden";
    roomMusicRequest?.onload({
      status: 200,
      responseText: "https://litter.catbox.moe/wrong-room.mp3\n",
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(roomUrls[1].value).toBe("https://cdn.example/original.mp3");

    view.destroy();
  });

  it("does not finish playlist-follow synchronization in a different room", async () => {
    let roomName = "Moon Garden";
    const updateRoomCustomization = vi.fn();
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [],
      getCurrentRoomName: () => roomName,
      isInChatRoom: () => true,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
      getRoomAdminSnapshot: () => ({
        roomName,
        isAdmin: true,
        customization: { imageUrl: "", musicUrl: "", sizeMode: 2, musicSync: false },
        settings: {
          name: roomName,
          description: "",
          background: "Boudoir",
          limit: 10,
          game: "",
          space: "X",
          language: "EN",
          visibility: ["All"],
          access: ["All"],
          blockCategory: [],
          admins: [999],
          whitelist: [],
          blacklist: [],
          custom: {
            imageUrl: "",
            imageFilter: "",
            musicUrl: "",
            sizeMode: 2,
            musicSync: false,
          },
        },
        players: [],
      }),
      updateRoomCustomization,
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkChat.imageUploads = { enabled: true, retention: "24h" };
      draft.linkMusic.playlists[0]!.tracks = [{
        id: "track-room-race",
        title: "Slow Moon Song",
        source: "local",
        locator: "device-room-race",
        addedAt: 1,
      }];
    });
    const stored: DeviceMusicTrack = {
      id: "device-room-race",
      name: "Slow Moon Song",
      mimeType: "audio/mpeg",
      roomExtension: "mp3",
      createdAt: 1,
      blob: new Blob([Uint8Array.of(1, 2, 3)], { type: "audio/mpeg" }),
    };
    const musicStore: MusicStore = {
      list: vi.fn(async () => [stored]),
      get: vi.fn(async (id) => id === stored.id ? stored : undefined),
      add: vi.fn(async () => stored),
      delete: vi.fn(async () => undefined),
      close: vi.fn(),
    };
    let uploadRequest: KikiLinkGmXhrDetails | undefined;
    vi.stubGlobal("GM_xmlhttpRequest", vi.fn((details: KikiLinkGmXhrDetails) => {
      uploadRequest = details;
      return { abort: vi.fn() };
    }));
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.27.0",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      musicStore,
    );
    view.mount();
    await view.open();
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('[data-target="room"]')?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-room-page")?.hidden).toBe(false);
    });
    const roomSwitches = shadow?.querySelectorAll<HTMLInputElement>(
      ".kl-room-media input[type=checkbox]",
    );
    const followPlaylist = roomSwitches?.[1];
    if (!followPlaylist) throw new Error("Missing room playlist-follow switch");
    followPlaylist.checked = true;
    followPlaylist.dispatchEvent(new Event("change", { bubbles: true }));

    shadow?.querySelector<HTMLButtonElement>('[data-target="music"]')?.click();
    const play = await vi.waitFor(() => {
      const button = shadow?.querySelector<HTMLButtonElement>(".kl-music-track-play");
      expect(button?.disabled).toBe(false);
      return button!;
    });
    play.click();
    await vi.waitFor(() => expect(uploadRequest).toBeDefined());
    roomName = "Sun Garden";
    uploadRequest?.onload({
      status: 200,
      responseText: "https://litter.catbox.moe/old-room-track.mp3\n",
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(updateRoomCustomization).not.toHaveBeenCalled();

    view.destroy();
  });

  it("shares a device MP3 once and selects it as room music", async () => {
    const updateRoomCustomization = vi.fn();
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [],
      getCurrentRoomName: () => "Moon Garden",
      isInChatRoom: () => true,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
      getRoomAdminSnapshot: () => ({
        roomName: "Moon Garden",
        isAdmin: true,
        customization: {
          imageUrl: "https://litter.catbox.moe/background.webp",
          musicUrl: "",
          sizeMode: 2,
          musicSync: false,
        },
        players: [],
      }),
      updateRoomCustomization,
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkChat.imageUploads = { enabled: true, retention: "24h" };
      draft.linkMusic.playlists[0]!.tracks = [{
        id: "track-local-room",
        title: "Device Moon Song",
        source: "local",
        locator: "device-track-one",
        addedAt: 1,
      }];
    });
    const stored: DeviceMusicTrack = {
      id: "device-track-one",
      name: "Device Moon Song",
      mimeType: "audio/mpeg",
      roomExtension: "mp3",
      createdAt: 1,
      blob: new Blob([Uint8Array.of(1, 2, 3)], { type: "audio/mpeg" }),
    };
    const musicStore: MusicStore = {
      list: vi.fn(async () => [stored]),
      get: vi.fn(async (id) => id === stored.id ? stored : undefined),
      add: vi.fn(async () => stored),
      delete: vi.fn(async () => undefined),
      close: vi.fn(),
    };
    let uploadDetails: KikiLinkGmXhrDetails | undefined;
    const uploadRequest = vi.fn((details: KikiLinkGmXhrDetails) => {
      uploadDetails = details;
      queueMicrotask(() => details.onload({
        status: 200,
        responseText: "https://litter.catbox.moe/device_room_song.mp3\n",
      }));
      return { abort: vi.fn() };
    });
    vi.stubGlobal("GM_xmlhttpRequest", uploadRequest);
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.22.6",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      musicStore,
    );
    view.mount();
    await view.open();
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;

    shadow?.querySelector<HTMLButtonElement>('[data-target="music"]')?.click();
    const roomAction = await vi.waitFor(() => {
      const action = [...(shadow?.querySelectorAll<HTMLButtonElement>(
        ".kl-music-track-menu-popover button",
      ) ?? [])].find((button) => button.textContent === "Share & use as room music");
      expect(action).toBeDefined();
      return action!;
    });
    roomAction.click();

    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-room-page")?.hidden).toBe(false);
      const roomUrls = shadow?.querySelectorAll<HTMLInputElement>(
        ".kl-room-media input[type=url]",
      );
      expect(roomUrls?.[1]?.value).toBe("https://litter.catbox.moe/device_room_song.mp3");
    });
    expect(uploadRequest).toHaveBeenCalledOnce();
    expect(uploadDetails?.url).toBe(
      "https://litterbox.catbox.moe/resources/internals/api.php",
    );
    const uploadForm = uploadDetails?.data as FormData;
    expect(uploadForm.get("time")).toBe("24h");
    expect((uploadForm.get("fileToUpload") as File).name).toBe("kikilink-room-music.mp3");
    expect(updateRoomCustomization).not.toHaveBeenCalled();

    shadow?.querySelector<HTMLButtonElement>(".kl-room-media .kl-text-button--primary")?.click();
    expect(updateRoomCustomization).toHaveBeenCalledWith(expect.objectContaining({
      musicUrl: "https://litter.catbox.moe/device_room_song.mp3",
    }));

    shadow?.querySelector<HTMLButtonElement>('[data-target="music"]')?.click();
    const cachedRoomAction = await vi.waitFor(() => {
      const action = [...(shadow?.querySelectorAll<HTMLButtonElement>(
        ".kl-music-track-menu-popover button",
      ) ?? [])].find((button) => button.textContent === "Share & use as room music");
      expect(action).toBeDefined();
      return action!;
    });
    cachedRoomAction.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-room-page")?.hidden).toBe(false);
    });
    expect(uploadRequest).toHaveBeenCalledOnce();

    const roomSwitches = shadow?.querySelectorAll<HTMLInputElement>(
      ".kl-room-media input[type=checkbox]",
    );
    const followPlaylist = roomSwitches?.[1];
    if (!followPlaylist) throw new Error("Missing room playlist-follow switch");
    followPlaylist.checked = true;
    followPlaylist.dispatchEvent(new Event("change", { bubbles: true }));
    shadow?.querySelector<HTMLButtonElement>('[data-target="music"]')?.click();
    const play = await vi.waitFor(() => {
      const button = shadow?.querySelector<HTMLButtonElement>(".kl-music-track-play");
      expect(button?.disabled).toBe(false);
      return button!;
    });
    play.click();
    await vi.waitFor(() => {
      expect(updateRoomCustomization).toHaveBeenCalledTimes(2);
      expect(updateRoomCustomization).toHaveBeenLastCalledWith(expect.objectContaining({
        musicUrl: "https://litter.catbox.moe/device_room_song.mp3",
        musicSync: true,
      }));
    });
    expect(uploadRequest).toHaveBeenCalledOnce();
    view.destroy();
  });

  it("keeps local chat nicknames private and removes only the selected recent chat", async () => {
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      isMemberInCurrentRoom: () => false,
      getRoomCharacters: () => [],
      getCurrentRoomName: () => undefined,
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 123,
        peerName: "Reina",
        content: "Hello",
        sentAt: 100,
        includeRoom: false,
      },
      true,
    );
    const view = new LinkChatView(adapter, service, settings, "0.13.0");
    view.mount();
    await view.openChat(123, "Reina");
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;

    shadow?.querySelector<HTMLElement>(".kl-chat-person")?.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-profile-menu")?.textContent).toContain(
        "Set local nickname",
      );
    });
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action") ?? [])]
      .find((button) => button.textContent.includes("Set local nickname"))
      ?.click();
    const aliasInput = shadow?.querySelector<HTMLInputElement>(".kl-alias-input");
    if (!aliasInput) throw new Error("Missing local nickname input");
    aliasInput.value = "My friend";
    shadow?.querySelector<HTMLButtonElement>(".kl-alias-dialog .kl-text-button--primary")?.click();
    await vi.waitFor(async () => {
      expect(await service.getConversation(123)).toMatchObject({
        peerName: "Reina",
        localAlias: "My friend",
      });
      expect(shadow?.querySelector(".kl-chat-name")?.textContent).toBe("My friend");
    });

    await view.openChat(123, "My friend");

    const composer = shadow?.querySelector<HTMLTextAreaElement>(".kl-composer-input");
    if (!composer) throw new Error("Missing composer");
    composer.value = "";
    shadow?.querySelector<HTMLButtonElement>(".kl-action-chip")?.click();
    expect(composer.value).toBe("*waves to Reina*");

    shadow?.querySelector<HTMLElement>(".kl-chat-person")?.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-profile-menu")?.textContent).toContain(
        "Remove from recent chats",
      );
    });
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action") ?? [])]
      .find((button) => button.textContent.includes("Remove from recent chats"))
      ?.click();
    expect(shadow?.querySelector<HTMLDialogElement>(".kl-remove-chat-dialog")?.open).toBe(true);
    shadow?.querySelector<HTMLButtonElement>(".kl-remove-chat-dialog .kl-text-button--danger")?.click();
    await vi.waitFor(async () => {
      expect(await service.getConversation(123)).toBeUndefined();
      expect(shadow?.querySelector<HTMLElement>(".kl-chat")?.hidden).toBe(true);
    });

    view.destroy();
  });

  it("prioritizes unread Beeps on Home and opens the suggested conversation", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: (memberNumber: number) => (memberNumber === 123 ? "Reina" : undefined),
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getCurrentRoomName: () => undefined,
      getRoomCharacters: () => [],
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 123,
        peerName: "Reina",
        content: "Hello",
        sentAt: Date.now(),
        includeRoom: false,
      },
      false,
    );
    const view = new LinkChatView(adapter, service, settings, "0.8.0");
    view.mount();

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>(".kl-launcher")?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-home-next-title")?.textContent).toBe("1 unread Beep");
    });
    expect(shadow?.querySelector(".kl-home-next-description")?.textContent).toContain("Reina");
    expect(shadow?.querySelector(".kl-home-next-button")?.textContent).toBe("Read message");

    shadow?.querySelector<HTMLButtonElement>(".kl-home-next-button")?.click();
    await vi.waitFor(() => {
      expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
        "chat",
      );
      expect(shadow?.querySelector(".kl-chat-name")?.textContent).toBe("Reina");
    });
    expect(await service.totalUnread()).toBe(0);
    view.destroy();
  });

  it("opens LinkFinder with accessible suggestions and jumps to a setting by keyboard", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [],
      getCurrentRoomName: () => undefined,
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.9.0",
    );
    view.mount();
    await view.open();

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>(".kl-finder-trigger")?.click();
    const finder = shadow?.querySelector<HTMLDialogElement>(".kl-finder-dialog");
    const query = shadow?.querySelector<HTMLInputElement>(".kl-finder-query");
    await vi.waitFor(() => {
      expect(finder?.open).toBe(true);
      expect(shadow?.querySelectorAll(".kl-finder-result")).toHaveLength(7);
    });
    expect(query?.getAttribute("role")).toBe("combobox");
    expect(query?.getAttribute("aria-expanded")).toBe("true");
    expect(query?.getAttribute("aria-activedescendant")).not.toBeNull();
    expect(shadow?.querySelector(".kl-finder-trigger")?.getAttribute("aria-keyshortcuts")).toBe(
      "Control+K Meta+K",
    );

    if (!query) throw new Error("Missing LinkFinder query");
    const firstSuggestion = query.getAttribute("aria-activedescendant");
    query.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    expect(query.getAttribute("aria-activedescendant")).not.toBe(firstSuggestion);
    query.value = "appearance";
    query.dispatchEvent(new Event("input", { bubbles: true }));
    expect(shadow?.querySelectorAll(".kl-finder-result")).toHaveLength(1);
    expect(shadow?.querySelector(".kl-finder-result-title")?.textContent).toBe(
      "Appearance & comfort",
    );
    query.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await vi.waitFor(() => {
      expect(finder?.open).toBe(false);
      expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
        "settings",
      );
    });
    expect(
      shadow
        ?.querySelector('[role="tab"][data-section="appearance"]')
        ?.getAttribute("aria-selected"),
    ).toBe("true");
    view.destroy();
  });

  it("finds a current-room player and opens the exact notebook entry", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) =>
        memberNumber === 123 ? "Reina" : `Member ${memberNumber}`,
      getMemberNickname: (memberNumber: number) =>
        memberNumber === 123 ? "Reina" : undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getRoomCharacters: () => [
        { memberNumber: 123, memberName: "Reina", accountName: "AccountReina", isFriend: true },
      ],
      isKnownFriend: () => true,
      getPlayerRelationships: () => ["owner", "sub", "lover", "whitelist", "blacklist", "ghosted"],
      getCurrentRoomName: () => "Moon Garden",
      isInChatRoom: () => true,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.9.0",
    );
    view.mount();
    await view.open();

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>(".kl-finder-trigger")?.click();
    const query = shadow?.querySelector<HTMLInputElement>(".kl-finder-query");
    await vi.waitFor(() => expect(shadow?.querySelector(".kl-finder-result")).not.toBeNull());
    if (!query) throw new Error("Missing LinkFinder query");
    query.value = "Reina";
    query.dispatchEvent(new Event("input", { bubbles: true }));
    const player = shadow?.querySelector<HTMLButtonElement>('[data-finder-kind="player"]');
    expect(player?.textContent).toContain("Reina");
    expect(player?.textContent).toContain("In room");
    player?.click();

    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
      "roster",
    );
    expect(
      shadow
        ?.querySelector('[data-member-number="123"]')
        ?.getAttribute("data-selected"),
    ).toBe("true");
    expect(shadow?.querySelector(".kl-roster-name")?.textContent).toBe("Reina");
    const rosterBadges = shadow?.querySelector('[data-member-number="123"]')?.textContent ?? "";
    expect(rosterBadges).toContain("HERE");
    expect(rosterBadges).toContain("FRIEND");
    expect(rosterBadges).toContain("OWNER");
    expect(rosterBadges).toContain("SUB");
    expect(rosterBadges).toContain("LOVER");
    expect(rosterBadges).toContain("WHITELIST");
    expect(rosterBadges).toContain("BLACKLIST");
    expect(rosterBadges).toContain("GHOSTED");
    view.destroy();
  });

  it("finds a saved custom activity and opens it in the editor", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: (memberNumber: number) =>
        memberNumber === 123 ? "Reina" : undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [{ memberNumber: 123, memberName: "Reina" }],
      getCurrentRoomName: () => "Moon Garden",
      isInChatRoom: () => true,
      canSendRoomEmote: () => true,
      sendRoomEmote: vi.fn(),
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkActivities.enabled = true;
      draft.linkActivities.customActivities.push({
        id: "wolf-greeting",
        name: "Wolf greeting",
        targetGroup: "ItemHead",
        targetMode: "other",
        template: "{me} greets {target} with a wolfish grin.",
        image: "Pet",
        arousal: 0,
      });
    });
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.9.0",
    );
    view.mount();
    await view.open();

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>(".kl-finder-trigger")?.click();
    const query = shadow?.querySelector<HTMLInputElement>(".kl-finder-query");
    await vi.waitFor(() => expect(shadow?.querySelector(".kl-finder-result")).not.toBeNull());
    if (!query) throw new Error("Missing LinkFinder query");
    query.value = "wolf greeting";
    query.dispatchEvent(new Event("input", { bubbles: true }));
    const activity = shadow?.querySelector<HTMLButtonElement>('[data-finder-kind="activity"]');
    expect(activity?.textContent).toContain("Wolf greeting");
    activity?.click();

    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
      "activities",
    );
    expect(shadow?.querySelector<HTMLInputElement>('[data-field="name"]')?.value).toBe(
      "Wolf greeting",
    );
    view.destroy();
  });

  it("starts a Beep chat directly from a member number in LinkFinder", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [],
      getCurrentRoomName: () => undefined,
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.9.0",
    );
    view.mount();
    await view.open();

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>(".kl-finder-trigger")?.click();
    const query = shadow?.querySelector<HTMLInputElement>(".kl-finder-query");
    await vi.waitFor(() => expect(shadow?.querySelector(".kl-finder-result")).not.toBeNull());
    if (!query) throw new Error("Missing LinkFinder query");
    query.value = "#0";
    query.dispatchEvent(new Event("input", { bubbles: true }));
    expect(shadow?.querySelector(".kl-finder-result")?.textContent ?? "").not.toContain(
      "Start chat with #0",
    );
    query.value = "456";
    query.dispatchEvent(new Event("input", { bubbles: true }));
    const direct = shadow?.querySelector<HTMLButtonElement>('[data-finder-kind="conversation"]');
    expect(direct?.textContent).toContain("Start chat with #456");
    direct?.click();

    await vi.waitFor(() => {
      expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
        "chat",
      );
      expect(shadow?.querySelector(".kl-chat-name")?.textContent).toBe("Member 456");
    });
    view.destroy();
  });

  it("opens a known contact without using a browser prompt", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 321, memberName: "Mina" }],
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.3.1",
    );

    view.mount();
    const shadow = document.querySelector("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('button[title="New Beep chat"]')?.click();
    const contact = shadow?.querySelector<HTMLButtonElement>(".kl-contact");
    expect(contact?.textContent).toContain("Mina");
    contact?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-chat-name")?.textContent).toBe("Mina");
    });
    view.destroy();
  });

  it("filters new chats by native availability and can sort contacts A–Z", () => {
    const getKnownContacts = vi.fn(() => [
      { memberNumber: 1, memberName: "Amy" },
      { memberNumber: 2, memberName: "Zed" },
      { memberNumber: 3, memberName: "Bea" },
    ]);
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts,
      getOnlineFriends: () => [{
        memberNumber: 2,
        memberName: "Zed",
        privateRoom: false,
      }],
      getRoomCharacters: () => [{ memberNumber: 3, memberName: "Bea" }],
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.24.0",
    );
    view.mount();
    const shadow = document.querySelector("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('button[title="New Beep chat"]')?.click();

    expect([...shadow!.querySelectorAll(".kl-contact-name")].map((node) => node.textContent)).toEqual([
      "Bea",
      "Zed",
      "Amy",
    ]);
    const filter = shadow?.querySelector<HTMLSelectElement>(".kl-new-chat-filter");
    const sort = shadow?.querySelector<HTMLSelectElement>(".kl-new-chat-sort");
    if (!filter || !sort) throw new Error("Missing new-chat contact controls");
    filter.value = "online";
    filter.dispatchEvent(new Event("change", { bubbles: true }));
    expect(shadow?.querySelectorAll(".kl-contact")).toHaveLength(2);
    expect(shadow?.querySelector(".kl-contact-native-state")?.textContent).toBe("In this room");

    filter.value = "room";
    filter.dispatchEvent(new Event("change", { bubbles: true }));
    expect(shadow?.querySelectorAll(".kl-contact")).toHaveLength(1);
    expect(shadow?.querySelector(".kl-contact-name")?.textContent).toBe("Bea");

    filter.value = "all";
    sort.value = "alphabetical";
    sort.dispatchEvent(new Event("change", { bubbles: true }));
    expect(shadow?.querySelector(".kl-contact-name")?.textContent).toBe("Amy");

    const dialog = shadow?.querySelector<HTMLDialogElement>(".kl-new-chat-dialog");
    dialog?.close();
    getKnownContacts.mockImplementationOnce(() => {
      throw new Error("Permission denied to access object");
    });
    expect(() =>
      shadow?.querySelector<HTMLButtonElement>('button[title="New Beep chat"]')?.click()
    ).not.toThrow();
    expect(dialog?.open).toBe(true);
    expect(shadow?.querySelector(".kl-contact-empty")?.textContent).toContain(
      "contacts could not be read",
    );

    const query = shadow?.querySelector<HTMLInputElement>(".kl-new-chat-query");
    const open = [...(dialog?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
      .find((button) => button.textContent === "Open chat");
    if (!query || !open) throw new Error("Missing guarded new-chat controls");
    query.value = "";
    open.click();
    expect(dialog?.open).toBe(true);
    expect(shadow?.querySelector(".kl-toast")?.textContent).toContain("valid member number");
    query.value = "#0";
    open.click();
    expect(dialog?.open).toBe(true);
    expect(shadow?.querySelector(".kl-chat-name")?.textContent).not.toBe("Member 0");
    view.destroy();
  });

  it("opens News beside the brand and drags only from non-interactive top-bar space", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.27.0",
    );
    view.mount();
    await view.open();
    const shadow = document.querySelector("#kikilink-root")?.shadowRoot;
    const brand = shadow?.querySelector(".kl-brand");
    const news = shadow?.querySelector<HTMLButtonElement>(".kl-news-trigger");
    expect(brand?.nextElementSibling).toBe(news);
    news?.click();
    expect(shadow?.querySelector<HTMLElement>(".kl-panel")?.dataset.workspace).toBe("news");
    expect(shadow?.querySelector<HTMLElement>(".kl-news-page")?.hidden).toBe(false);
    const currentRelease = shadow?.querySelector<HTMLElement>('[data-version="0.27.0"]');
    expect(currentRelease?.textContent).toContain("Current");
    expect(currentRelease?.querySelector("time")?.getAttribute("datetime")).toBe("2026-08-29");
    expect(currentRelease?.textContent).toContain("Groups you can truly manage");
    expect(currentRelease?.textContent).toContain(
      "privacy-prepared local images",
    );

    const topbar = shadow?.querySelector<HTMLElement>(".kl-topbar");
    if (!topbar || !news) throw new Error("Missing top-bar controls");
    topbar.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 8, clientX: 10, clientY: 10 }),
    );
    topbar.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, pointerId: 8, clientX: 120, clientY: 100 }),
    );
    topbar.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 8, clientX: 120, clientY: 100 }),
    );
    expect(settings.get().ui.panelPosition).not.toBeNull();

    settings.update((draft) => {
      draft.ui.panelPosition = null;
    });
    const blockedTargets = [
      news,
      shadow?.querySelector<HTMLElement>(".kl-presence-trigger"),
      shadow?.querySelector<HTMLElement>(".kl-finder-trigger"),
      shadow?.querySelector<HTMLElement>(".kl-topbar-settings"),
      shadow?.querySelector<HTMLElement>('[aria-label="Close KikiLink"]'),
      shadow?.querySelector<HTMLElement>(".kl-local-clock"),
      shadow?.querySelector<HTMLElement>(".kl-topbar-context"),
    ];
    blockedTargets.forEach((target, index) => {
      if (!target) throw new Error("Missing an interactive top-bar drag blocker");
      const pointerId = 9 + index;
      target.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerId, clientX: 10, clientY: 10 }),
      );
      target.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, pointerId, clientX: 140, clientY: 120 }),
      );
      target.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, pointerId, clientX: 140, clientY: 120 }),
      );
      expect(settings.get().ui.panelPosition).toBeNull();
    });
    view.destroy();
  });

  it("lets the launcher be dragged and provides a button alternative to reset it", async () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.3.1",
    );
    view.mount();

    const launcher = document
      .querySelector("#kikilink-root")
      ?.shadowRoot?.querySelector<HTMLButtonElement>(".kl-launcher");
    if (!launcher) throw new Error("Missing launcher");
    launcher.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, clientX: 10, clientY: 10 }),
    );
    launcher.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, pointerId: 1, clientX: 120, clientY: 180 }),
    );
    launcher.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 1, clientX: 120, clientY: 180 }),
    );

    expect(launcher.style.left).not.toBe("");
    expect(settings.get().ui.launcherPosition).not.toBeNull();

    await view.open();
    const shadow = document.querySelector("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('button[title="KikiLink settings"]')?.click();
    shadow
      ?.querySelector<HTMLButtonElement>('[role="tab"][data-section="navigation"]')
      ?.click();
    [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-settings-panel .kl-text-button") ?? [])]
      .find((button) => button.textContent === "Reset launcher position")
      ?.click();
    expect(settings.get().ui.launcherPosition).toBeNull();
    expect(shadow?.querySelector(".kl-toast")?.getAttribute("role")).toBe("status");
    view.destroy();
  });

  it("edits an existing custom activity and keeps advanced targeting out of the way", () => {
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: (memberNumber: number) =>
        memberNumber === 123 ? "Reina" : undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [{ memberNumber: 123, memberName: "Reina" }],
      isInChatRoom: () => true,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkActivities.customActivities.push({
        id: "gentle-pat",
        name: "Gentle pat",
        targetGroup: "ItemHead",
        targetMode: "other",
        template: "{me} gently pats {target}.",
        image: "Pet",
        arousal: 0,
      });
    });
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.4.0",
    );
    view.mount();

    const shadow = document.querySelector("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('button[title="Custom Activities"]')?.click();

    expect(shadow?.querySelector<HTMLElement>(".kl-activities-page")?.hidden).toBe(false);
    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
      "activities",
    );
    expect(shadow?.querySelectorAll(".kl-custom-activity-card")).toHaveLength(1);
    shadow?.querySelector<HTMLButtonElement>('[data-activity-id="gentle-pat"]')?.click();
    const advanced = shadow?.querySelector<HTMLDetailsElement>(".kl-custom-activity-advanced");
    expect(advanced?.open).toBe(false);
    advanced?.setAttribute("open", "");
    const mode = advanced?.querySelector<HTMLSelectElement>(".kl-custom-target-mode");
    if (!mode) throw new Error("Missing advanced target selector");
    mode.value = "both";
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-custom-activity-footer .kl-text-button--primary")
      ?.click();
    expect(settings.get().linkActivities.customActivities[0]?.targetMode).toBe("both");
    view.destroy();
  });

  it("turns the current room into a nickname-first player notebook with native actions", async () => {
    const startWhisper = vi.fn();
    const openProfile = vi.fn();
    const adapter = {
      getMemberName: (memberNumber: number) =>
        memberNumber === 123 ? "Reina" : `Member ${memberNumber}`,
      getMemberNickname: (memberNumber: number) =>
        memberNumber === 123 ? "Reina" : undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getRoomCharacters: () => [
        { memberNumber: 123, memberName: "Reina", accountName: "AccountReina", isFriend: true },
      ],
      getCurrentRoomName: () => "Moon Garden",
      isInChatRoom: () => true,
      startWhisper,
      openProfile,
      canSendRoomEmote: () => true,
      sendRoomEmote: vi.fn(),
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const people = new PeopleRepository(new MemoryKeyValueStorage());
    const roster = new LinkRosterService(adapter, people, settings);
    const chatService = new ChatService(new MemoryChatRepository(), settings);
    const view = new LinkChatView(
      adapter,
      chatService,
      settings,
      "0.5.0",
      new LinkActivitiesService(adapter),
      roster,
    );
    view.mount();
    await view.open();

    const shadow = document.querySelector("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('button[title="LinkRoster"]')?.click();
    expect(shadow?.querySelector<HTMLElement>(".kl-roster-page")?.hidden).toBe(false);
    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
      "roster",
    );
    expect(shadow?.querySelector(".kl-roster-entry-name")?.textContent).toBe("Reina");
    expect(shadow?.querySelector(".kl-roster-friend")?.textContent).toBe("FRIEND");
    expect(shadow?.querySelector(".kl-roster-number")?.textContent).toContain("Member 123");
    const listAvatar = shadow?.querySelector<HTMLButtonElement>(".kl-roster-entry-avatar-button");
    const detailAvatar = shadow?.querySelector<HTMLButtonElement>(".kl-roster-detail-avatar-button");
    expect(listAvatar?.getAttribute("aria-label")).toBe("Open KikiLink profile for Reina");
    expect(detailAvatar?.getAttribute("aria-label")).toBe("Open KikiLink profile for Reina");
    listAvatar?.click();
    expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
    shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();

    if (!shadow || !detailAvatar) throw new Error("Missing player detail avatar");
    const menuLayer = shadow.querySelector<HTMLDialogElement>(".kl-profile-menu-layer");
    if (!menuLayer) throw new Error("Missing player action menu");
    const getConversation = vi.spyOn(chatService, "getConversation");

    detailAvatar.focus();
    detailAvatar.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 40, clientY: 40 }),
    );
    await vi.waitFor(() => expect(menuLayer.open).toBe(true));
    expect(getConversation).toHaveBeenCalledTimes(1);
    menuLayer.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(menuLayer.open).toBe(false);
    expect(shadow.activeElement).toBe(detailAvatar);

    getConversation.mockClear();
    vi.useFakeTimers();
    const touchStart = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 48,
      clientY: 48,
    });
    Object.defineProperty(touchStart, "pointerType", { value: "touch" });
    detailAvatar.dispatchEvent(touchStart);
    await vi.advanceTimersByTimeAsync(600);
    expect(getConversation).toHaveBeenCalledTimes(1);
    expect(menuLayer.open).toBe(true);
    menuLayer.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(menuLayer.open).toBe(false);
    expect(shadow.activeElement).toBe(detailAvatar);
    vi.useRealTimers();

    const note = shadow?.querySelector<HTMLTextAreaElement>(".kl-roster-note");
    const tags = shadow?.querySelector<HTMLInputElement>(".kl-roster-tags");
    if (!note || !tags) throw new Error("Missing player notebook controls");
    note.value = "Met during a calm rope scene.";
    note.dispatchEvent(new Event("input", { bubbles: true }));
    tags.value = "trusted, roleplay";
    tags.dispatchEvent(new Event("input", { bubbles: true }));
    shadow?.querySelector<HTMLButtonElement>(".kl-save-notebook")?.click();

    expect(people.get(123)).toMatchObject({
      displayName: "Reina",
      note: "Met during a calm rope scene.",
      tags: ["trusted", "roleplay"],
    });

    shadow?.querySelector<HTMLButtonElement>(".kl-roster-star")?.click();
    expect(people.get(123)?.favorite).toBe(true);
    const actionButtons = [
      ...((shadow?.querySelectorAll<HTMLButtonElement>(".kl-roster-quick-actions button") ?? [])),
    ];
    actionButtons.find((button) => button.textContent === "Whisper")?.click();
    expect(startWhisper).toHaveBeenCalledWith(123);
    expect(shadow?.querySelector<HTMLElement>(".kl-panel")?.hidden).toBe(true);

    view.destroy();
  });

  it("shows compatible typing signals and sends them without creating chat messages", async () => {
    const sendKikiLinkProtocol = vi.fn(() => "beep" as const);
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => "Reina",
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [
        { memberNumber: 123, memberName: "Reina", privateRoom: false },
      ],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      refreshOnlineFriends: vi.fn(() => true),
      sendKikiLinkProtocol,
      broadcastKikiLinkProtocol: vi.fn(() => false),
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
      getRoomCharacters: () => [],
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const bus = new EventBus<KikiLinkEvents>();
    const presence = new LinkPresenceService(adapter, settings, bus, "0.12.0");
    presence.start();
    const chatService = new ChatService(new MemoryChatRepository(), settings);
    const view = new LinkChatView(
      adapter,
      chatService,
      settings,
      "0.12.0",
      new LinkActivitiesService(adapter),
      new LinkRosterService(
        adapter,
        new PeopleRepository(new MemoryKeyValueStorage()),
        settings,
      ),
      presence,
    );
    view.mount();
    await view.openChat(123, "Reina");

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "ty", a: 1 }),
    });
    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLElement>(".kl-typing-indicator")?.hidden).toBe(false);
      expect(shadow?.querySelector(".kl-typing-indicator")?.textContent).toContain(
        "Reina is typing",
      );
    });

    const composer = shadow?.querySelector<HTMLTextAreaElement>(".kl-composer-input");
    if (!composer) throw new Error("Missing composer");
    composer.value = "A local draft";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    expect(sendKikiLinkProtocol).toHaveBeenCalledWith(
      123,
      JSON.stringify({ t: "ty", a: 1 }),
    );
    expect(await chatService.getMessages(123)).toEqual([]);

    composer.dispatchEvent(new Event("blur", { bubbles: true }));
    view.destroy();
    presence.stop();
  });

  it("keeps a bounded message DOM and appends live messages without rebuilding the feed", async () => {
    const adapter = {
      getMemberName: () => "Reina",
      getMemberNickname: () => "Reina",
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: () => true,
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
      getRoomCharacters: () => [],
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    for (let index = 0; index < 170; index += 1) {
      await service.capture(
        {
          direction: index % 2 === 0 ? "incoming" : "outgoing",
          peerNumber: 123,
          peerName: "Reina",
          content: `Message ${index}`,
          sentAt: index + 1,
          includeRoom: false,
        },
        true,
      );
    }
    const view = new LinkChatView(adapter, service, settings, "0.12.0");
    view.mount();
    await view.openChat(123, "Reina");

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    const initialRows = shadow?.querySelectorAll<HTMLElement>(".kl-message-row") ?? [];
    expect(initialRows).toHaveLength(120);
    expect(shadow?.querySelector(".kl-load-older")?.textContent).toContain("Load earlier");
    const preservedRow = initialRows[2];
    const styles = shadow?.querySelector("style")?.textContent ?? "";
    expect(styles).not.toContain("content-visibility");
    expect(styles).toContain("overflow-anchor: none");
    expect(styles).toContain("contain: paint");
    expect(styles).toContain(".kl-message-bubble::before");
    expect(styles).toContain("max-width: 720px");
    expect(styles).toContain("height: auto; max-height: none");

    const messageScroller = shadow?.querySelector<HTMLElement>(".kl-messages");
    const oldestRow = initialRows[0];
    if (!messageScroller || !oldestRow) throw new Error("Missing bounded message feed");
    let syntheticScrollHeight = 1_200;
    Object.defineProperty(messageScroller, "scrollHeight", {
      configurable: true,
      get: () => syntheticScrollHeight,
    });
    Object.defineProperty(messageScroller, "clientHeight", {
      configurable: true,
      get: () => 300,
    });
    messageScroller.scrollTop = 600;
    const removeOldest = oldestRow.remove.bind(oldestRow);
    vi.spyOn(oldestRow, "remove").mockImplementation(() => {
      syntheticScrollHeight -= 10;
      removeOldest();
    });

    const liveMessage = await service.capture(
      {
        direction: "incoming",
        peerNumber: 123,
        peerName: "Reina",
        content: "Live message 170",
        sentAt: 171,
        includeRoom: false,
      },
      true,
    );
    await view.onMessage(123, true, liveMessage);

    expect(shadow?.querySelectorAll(".kl-message-row")).toHaveLength(120);
    expect(messageScroller.scrollTop).toBe(590);
    expect(preservedRow?.isConnected).toBe(true);
    expect(shadow?.querySelector(".kl-message-row:last-child")?.textContent).toContain(
      "Live message 170",
    );

    const nextLiveMessage = await service.capture(
      {
        direction: "incoming",
        peerNumber: 123,
        peerName: "Reina",
        content: "Live message 171",
        sentAt: 172,
        includeRoom: false,
      },
      true,
    );
    await view.onMessage(123, true, nextLiveMessage);

    const groupedTail = [...(shadow?.querySelectorAll<HTMLElement>(".kl-message-row") ?? [])].slice(-2);
    expect(groupedTail.map((row) => row.dataset.group)).toEqual(["start", "end"]);
    expect(shadow?.querySelectorAll(".kl-message-row")).toHaveLength(120);
    expect(preservedRow?.isConnected).toBe(true);

    shadow?.querySelector<HTMLButtonElement>(".kl-load-older button")?.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelectorAll(".kl-message-row")).toHaveLength(172);
    });
    expect(preservedRow?.isConnected).toBe(true);
    expect(shadow?.querySelector(".kl-load-older")).toBeNull();
    view.destroy();
  });
});
