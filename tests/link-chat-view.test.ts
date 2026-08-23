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

    shadow
      ?.querySelector<HTMLButtonElement>('button[title="Customize KikiLink"]')
      ?.click();
    const selects = shadow?.querySelectorAll<HTMLSelectElement>(".kl-select");
    const themeSelect = selects?.item(0);
    const sideSelect = selects?.item(1);
    const reducedMotion = shadow?.querySelector<HTMLInputElement>(
      ".kl-setting-section .kl-switch input",
    );
    if (!themeSelect || !sideSelect || !reducedMotion) {
      throw new Error("Missing appearance controls");
    }
    themeSelect.value = "light";
    sideSelect.value = "left";
    reducedMotion.checked = true;
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-dialog-actions .kl-text-button--primary")
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
    expect(shadow?.querySelector('.kl-nav-item[data-target="home"]')?.getAttribute("data-active")).toBe(
      "true",
    );

    shadow?.querySelector<HTMLButtonElement>('button[title="LinkChat"]')?.click();
    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
      "chat",
    );

    shadow?.querySelector<HTMLButtonElement>('button[title="Customize KikiLink"]')?.click();
    const dialog = shadow?.querySelector<HTMLDialogElement>(".kl-dialog");
    const selects = dialog?.querySelectorAll<HTMLSelectElement>(".kl-select");
    const launcherOpen = selects?.item(2);
    const accent = dialog?.querySelector<HTMLInputElement>(".kl-color-input");
    if (!launcherOpen || !accent) throw new Error("Missing Link Deck customization controls");
    launcherOpen.value = "chat";
    accent.value = "#247f7a";
    dialog?.querySelector<HTMLButtonElement>(".kl-dialog-actions .kl-text-button--primary")?.click();

    expect(settings.get().ui.launcherOpen).toBe("chat");
    expect(settings.get().ui.accent).toBe("#247f7a");
    expect(host?.style.getPropertyValue("--kl-accent")).toBe("#247f7a");

    view.close();
    shadow?.querySelector<HTMLButtonElement>(".kl-launcher")?.click();
    await vi.waitFor(() => {
      expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.workspace).toBe(
        "chat",
      );
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

  it("lets the launcher be dragged and persists its position", () => {
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

    expect(shadow?.querySelector<HTMLDialogElement>(".kl-activities-dialog")?.open).toBe(true);
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
    expect(shadow?.querySelector<HTMLDialogElement>(".kl-roster-dialog")?.open).toBe(true);
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
    expect(shadow?.querySelector<HTMLDialogElement>(".kl-roster-dialog")?.open).toBe(false);

    view.destroy();
  });
});
