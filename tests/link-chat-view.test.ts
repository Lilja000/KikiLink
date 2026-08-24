// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { LinkActivitiesService } from "../src/modules/link-activities/link-activities-service";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { LinkRosterService } from "../src/modules/link-roster/link-roster-service";
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
    expect(shadow?.querySelector(".kl-brand-emblem .kl-emblem-image")).not.toBeNull();
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
    ).toEqual(["Chat", "Players", "Activities", "Settings"]);
    expect(
      [...(shadow?.querySelectorAll(".kl-feature-card-action") ?? [])].map(
        (action) => action.textContent,
      ),
    ).toEqual(["Open Chat", "View players", "Turn on Activities", "Customize"]);
    expect(shadow?.querySelector('.kl-nav-item[data-target="home"]')?.getAttribute("data-active")).toBe(
      "true",
    );
    expect(shadow?.querySelector('.kl-nav-item[data-target="home"]')?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      shadow?.querySelectorAll('.kl-feature-nav .kl-nav-item:not([data-target="settings"])'),
    ).toHaveLength(4);

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
    expect(settingsPage?.querySelectorAll('[role="tab"]')).toHaveLength(5);
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
    density.value = "compact";
    textScale.value = "large";
    settingsPage
      ?.querySelector<HTMLButtonElement>(".kl-settings-actions .kl-text-button--primary")
      ?.click();

    expect(settings.get().ui.launcherOpen).toBe("chat");
    expect(settings.get().ui.accent).toBe("#247f7a");
    expect(settings.get().ui.density).toBe("compact");
    expect(settings.get().ui.textScale).toBe("large");
    expect(host?.style.getPropertyValue("--kl-accent")).toBe("#247f7a");
    expect(host?.style.getPropertyValue("--kl-accent-foreground")).not.toBe("");
    expect(host?.dataset.density).toBe("compact");
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

  it("opens Activity Studio and performs a custom action toward a room nickname", () => {
    const sendRoomEmote = vi.fn();
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: (memberNumber: number) =>
        memberNumber === 123 ? "Reina" : undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [{ memberNumber: 123, memberName: "Reina" }],
      isInChatRoom: () => true,
      canSendRoomEmote: () => true,
      sendRoomEmote,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkActivities.enabled = true;
    });
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.4.0",
    );
    view.mount();

    const shadow = document.querySelector("#kikilink-root")?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('button[title="LinkActivities"]')?.click();

    expect(shadow?.querySelector<HTMLElement>(".kl-activities-page")?.hidden).toBe(false);
    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
      "activities",
    );
    expect(shadow?.querySelector('.kl-activity-target[data-selected="true"]')?.textContent).toContain(
      "Reina",
    );
    expect(shadow?.querySelector(".kl-activity-preview")?.textContent).toContain(
      "Kiki bows gracefully to Reina",
    );

    shadow?.querySelector<HTMLButtonElement>(".kl-perform-activity")?.click();
    expect(sendRoomEmote).toHaveBeenCalledWith(
      "bows gracefully to Reina, as if sakura petals drifted between them.",
    );
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
});
