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
import type { DeviceGalleryImage, GalleryStore } from "../src/storage/device-gallery-store";
import type { DeviceMusicTrack, MusicStore } from "../src/storage/device-music-store";

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

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
    expect(about?.textContent).toContain("Member 0");
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
    expect(explicitProfileRefresh).toHaveBeenCalledWith(123, true);
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

    shadow?.querySelector<HTMLElement>(".kl-chat-person")?.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".kl-profile-menu")?.textContent).toContain("KikiLink Profile");
    });
    const addonProfileAction = [...(
      shadow?.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action") ?? []
    )].find((button) => button.textContent?.includes("KikiLink Profile"));
    if (!addonProfileAction) throw new Error("Missing KikiLink Profile action");
    addonProfileAction.click();
    await vi.waitFor(() => {
      expect(shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.open).toBe(true);
      expect(shadow?.querySelector(".kl-addon-profile-private")?.textContent).toContain(
        "Private note · Met during a calm rope scene.",
      );
    });
    shadow?.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")?.close();

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
    if (!avatarUrl || !idleMinutes || !afkToggle || !afkMessage) {
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
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-presence-dialog .kl-text-button--primary")
      ?.click();
    expect(settings.get().linkPresence).toMatchObject({
      avatarUrl: "https://i.imgur.com/kiki.png",
      autoIdleMinutes: 7,
      afkAutoReply: { enabled: true, message: "Back later!" },
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
      "0.24.0",
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

  it("serializes more than 32 Always previews and cancels the hidden queue on close", async () => {
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
      .slice(0, 6);
    visibilityCallback?.(
      nearViewport.map(
        (target) => ({ target, isIntersecting: true }) as unknown as IntersectionObserverEntry,
      ),
      {} as IntersectionObserver,
    );
    await vi.waitFor(() => expect(remoteImageLoader.load).toHaveBeenCalledTimes(4));
    expect(shadow?.querySelectorAll('.kl-image-preview[data-state="loading"]')).toHaveLength(4);
    expect(shadow?.querySelectorAll('.kl-image-preview[data-state="queued"]')).toHaveLength(2);
    expect(shadow?.querySelectorAll('.kl-image-preview[data-state="waiting"]')).toHaveLength(34);

    pending[0]?.resolve("blob:kikilink/first");
    await vi.waitFor(() => expect(remoteImageLoader.load).toHaveBeenCalledTimes(5));
    view.close();
    await vi.waitFor(() => {
      expect(pending.slice(1).filter(({ signal }) => signal.aborted)).toHaveLength(4);
    });
    await Promise.resolve();
    expect(remoteImageLoader.load).toHaveBeenCalledTimes(5);

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
    await vi.waitFor(() => expect(fallbackLoader.load).toHaveBeenCalledTimes(12));
    expect(
      fallbackShadow?.querySelectorAll('.kl-image-preview[data-state="paused"]'),
    ).toHaveLength(28);
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
      expect(catboxImageUpload).toHaveBeenCalledWith(expect.objectContaining({ blob: preparedBlob }));
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
      "0.24.0",
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
    const currentRelease = shadow?.querySelector<HTMLElement>('[data-version="0.24.0"]');
    expect(currentRelease?.textContent).toContain("Current");
    expect(currentRelease?.querySelector("time")?.getAttribute("datetime")).toBe("2026-08-29");
    expect(currentRelease?.textContent).toContain("Group chats and addon profiles");
    expect(currentRelease?.textContent).toContain(
      "2–4 group-compatible KikiLink friends (3–5 people total)",
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
