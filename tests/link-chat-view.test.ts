// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { KikiLinkEvents } from "../src/core/types";
import { LinkActivitiesService } from "../src/modules/link-activities/link-activities-service";
import { ChatService } from "../src/modules/link-chat/chat-service";
import type {
  LitterboxUploadConfig,
  LocalImageUploader,
} from "../src/modules/link-chat/image-upload";
import { LinkChatView } from "../src/modules/link-chat/view";
import { LinkRosterService } from "../src/modules/link-roster/link-roster-service";
import { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";
import { PeopleRepository } from "../src/storage/people-repository";

afterEach(() => {
  document.body.replaceChildren();
});

describe("LinkChatView", () => {
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
    expect(shadow?.querySelector(".kl-sidebar-heading span")?.textContent).toBe("Recent chats");

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
    expect(shadow?.querySelectorAll(".kl-feature-card")).toHaveLength(4);
    expect(shadow?.querySelector(".kl-home-next-title")?.textContent).toBe(
      "Start your first chat",
    );
    expect(shadow?.querySelector(".kl-home-next-button")?.textContent).toBe("Start a chat");
    expect(
      [...(shadow?.querySelectorAll(".kl-feature-card-title") ?? [])].map(
        (title) => title.textContent,
      ),
    ).toEqual(["Chat", "Players", "Custom Activities", "Settings"]);
    expect(
      [...(shadow?.querySelectorAll(".kl-feature-card-action") ?? [])].map(
        (action) => action.textContent,
      ),
    ).toEqual(["Open Chat", "View players", "Manage activities", "Customize"]);
    expect(shadow?.querySelector('.kl-nav-item[data-target="home"]')?.getAttribute("data-active")).toBe(
      "true",
    );
    expect(shadow?.querySelector('.kl-nav-item[data-target="home"]')?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      shadow?.querySelectorAll('.kl-feature-nav .kl-nav-item:not([data-target="settings"])'),
    ).toHaveLength(4);
    expect(shadow?.querySelector('.kl-nav-item[data-target="home"] svg.kl-nav-icon')).not.toBeNull();

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
    expect(settingsPage?.querySelectorAll('[role="tab"]')).toHaveLength(6);
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

  it("renders privacy-aware images, presence controls, and contextual player actions", async () => {
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
    const presenceBus = new EventBus<KikiLinkEvents>();
    const presence = new LinkPresenceService(adapter, settings, presenceBus, "0.20.0");
    presence.start();
    presenceBus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "room",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://i.imgur.com/reina.png",
        u: Date.now(),
        v: "0.20.0",
      }),
    });
    const service = new ChatService(new MemoryChatRepository(), settings);
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
      undefined,
      presence,
    );
    view.mount();
    await view.openChat(123, "Reina");

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    expect(shadow?.querySelector(".kl-chat-presence")?.textContent).toContain("Online");
    expect(shadow?.querySelector(".kl-chat-room")?.textContent).toContain("Moon Garden");
    expect(shadow?.querySelector(".kl-image-load")?.textContent).toBe("Show image");
    const remoteAvatar = shadow?.querySelector<HTMLElement>(".kl-chat-header > .kl-avatar");
    expect(remoteAvatar?.querySelector("img")).toBeNull();

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
      expect(shadow?.querySelector(".kl-profile-menu")?.textContent).toContain(
        "Show profile avatar",
      );
    });
    const showAvatar = [...(shadow?.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action") ?? [])]
      .find((button) => button.textContent?.includes("Show profile avatar"));
    showAvatar?.click();
    await vi.waitFor(() => {
      expect(remoteAvatar?.querySelector<HTMLImageElement>("img")?.src).toBe(
        "https://i.imgur.com/reina.png",
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

    shadow?.querySelector<HTMLButtonElement>(".kl-presence-trigger")?.click();
    shadow?.querySelector<HTMLButtonElement>('[data-status="dnd"]')?.click();
    expect(settings.get().linkPresence.status).toBe("dnd");
    expect(shadow?.querySelector(".kl-presence-trigger")?.textContent).toContain("Do not disturb");

    const avatarUrl = shadow?.querySelector<HTMLInputElement>(".kl-presence-avatar-url");
    const idleMinutes = shadow?.querySelector<HTMLInputElement>(
      'input[aria-label="Minutes before automatic Idle"]',
    );
    const afkToggle = shadow?.querySelector<HTMLInputElement>(
      'input[aria-label="Send an automatic reply while Idle"]',
    );
    const afkMessage = shadow?.querySelector<HTMLTextAreaElement>(".kl-afk-reply-message");
    if (!avatarUrl || !idleMinutes || !afkToggle || !afkMessage) {
      throw new Error("Missing KikiLink profile controls");
    }
    avatarUrl.value = "https://i.imgur.com/kiki.png";
    avatarUrl.dispatchEvent(new Event("input", { bubbles: true }));
    expect(
      shadow?.querySelector<HTMLImageElement>(".kl-profile-avatar-preview img")?.src,
    ).toBe("https://i.imgur.com/kiki.png");
    idleMinutes.value = "7";
    afkToggle.checked = true;
    afkToggle.dispatchEvent(new Event("change", { bubbles: true }));
    afkMessage.value = "Back later!";
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-presence-dialog .kl-text-button--primary")
      ?.click();
    expect(settings.get().linkPresence).toMatchObject({
      avatarUrl: "https://i.imgur.com/kiki.png",
      autoIdleMinutes: 7,
      afkAutoReply: { enabled: true, message: "Back later!" },
    });

    view.destroy();
    presence.stop();
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
    const view = new LinkChatView(
      adapter,
      service,
      settings,
      "0.17.0",
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
      );
      expect(sendBeep).toHaveBeenCalledWith(
        123,
        "https://litter.catbox.moe/photo.webp",
        false,
      );
    });
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
      expect(shadow?.querySelectorAll(".kl-finder-result")).toHaveLength(5);
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

  it("turns the current room into a nickname-first player notebook with native actions", () => {
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
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.5.0",
      new LinkActivitiesService(adapter),
      roster,
    );
    view.mount();

    const shadow = document.querySelector("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('button[title="LinkRoster"]')?.click();
    expect(shadow?.querySelector<HTMLElement>(".kl-roster-page")?.hidden).toBe(false);
    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
      "roster",
    );
    expect(shadow?.querySelector(".kl-roster-entry-name")?.textContent).toBe("Reina");
    expect(shadow?.querySelector(".kl-roster-friend")?.textContent).toBe("FRIEND");
    expect(shadow?.querySelector(".kl-roster-number")?.textContent).toContain("Member 123");

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
    expect(styles).toContain("aspect-ratio: 16 / 10");

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
