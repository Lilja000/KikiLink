import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MemoryKeyValueStorage,
  SETTINGS_KEY,
  SettingsStore,
} from "../src/core/settings";
import type { ConversationMeta, LinkMessage } from "../src/core/types";
import {
  AccountDataStorage,
  AccountSyncedChatRepository,
  accountChatDatabaseName,
} from "../src/storage/account-data-storage";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";
import { PeopleRepository } from "../src/storage/people-repository";

afterEach(() => {
  vi.useRealTimers();
  for (const key of ["Player", "ServerPlayerExtensionSettingsSync", "LZString"]) {
    Reflect.deleteProperty(globalThis, key);
  }
});

describe("BC account-scoped KikiLink storage", () => {
  it("never reads legacy unscoped data and keeps local accounts separated", async () => {
    vi.useFakeTimers();
    const browser = new MemoryKeyValueStorage();
    browser.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ui: { accent: "#00ff00" } }),
    );

    const first = new AccountDataStorage(101, browser);
    const firstSettings = new SettingsStore(first);
    expect(firstSettings.get().ui.accent).not.toBe("#00ff00");
    firstSettings.update((draft) => {
      draft.ui.accent = "#112233";
    });

    const second = new AccountDataStorage(202, browser);
    expect(new SettingsStore(second).get().ui.accent).not.toBe("#112233");
    const firstAgain = new AccountDataStorage(101, browser);
    expect(new SettingsStore(firstAgain).get().ui.accent).toBe("#112233");

    await first.destroy();
    await second.destroy();
    await firstAgain.destroy();
  });

  it("mirrors settings, Custom Activities, notebook data, and recent chats to the same BC account", async () => {
    globalThis.Player = {
      MemberNumber: 101,
      Name: "DesktopKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    globalThis.LZString = {
      compressToBase64: (value) => value,
      decompressFromBase64: (value) => value,
    };
    const desktopBrowser = new MemoryKeyValueStorage();
    const desktop = new AccountDataStorage(101, desktopBrowser);
    const settings = new SettingsStore(desktop);
    settings.update((draft) => {
      draft.ui.accent = "#123456";
      draft.linkPresence.avatarUrl = "https://example.com/kiki.png";
      draft.linkActivities.customActivities.push({
        id: "elbow-touch",
        name: "Elbow touch",
        targetGroup: "ItemArms",
        targetMode: "other",
        template: "{me} touches {target's} elbow.",
        image: "Caress",
        arousal: 4,
      });
    });
    const people = new PeopleRepository(desktop);
    people.put({
      memberNumber: 303,
      displayName: "Reina",
      favorite: true,
      note: "Met in the garden",
      tags: ["Friend"],
      firstSeenAt: 10,
      lastSeenAt: 20,
      lastRoomName: "Moon Garden",
      encounterCount: 2,
    });

    const desktopLocalChat = new MemoryChatRepository();
    await desktop.attachChatRepository(desktopLocalChat);
    const desktopChat = new AccountSyncedChatRepository(desktopLocalChat, desktop);
    await desktopChat.addMessage(message());
    await desktopChat.putConversation(conversation());
    await desktop.flush();

    expect(globalThis.ServerPlayerExtensionSettingsSync).toHaveBeenCalledWith("KikiLink");
    expect(typeof globalThis.Player.ExtensionSettings?.KikiLink).toBe("string");

    const mobile = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const mobileSettings = new SettingsStore(mobile).get();
    expect(mobileSettings.ui.accent).toBe("#123456");
    expect(mobileSettings.linkPresence.avatarUrl).toBe("https://example.com/kiki.png");
    expect(mobileSettings.linkActivities.customActivities).toMatchObject([
      { id: "elbow-touch", targetGroup: "ItemArms", arousal: 4 },
    ]);
    expect(new PeopleRepository(mobile).get(303)).toMatchObject({
      displayName: "Reina",
      favorite: true,
      note: "Met in the garden",
    });
    const mobileChat = new MemoryChatRepository();
    await mobile.attachChatRepository(mobileChat);
    expect(await mobileChat.getMessages(303)).toMatchObject([
      { content: "Hello from desktop", direction: "outgoing" },
    ]);
    expect(await mobileChat.getConversation(303)).toMatchObject({
      peerName: "Reina",
      lastMessage: "Hello from desktop",
    });

    await desktop.destroy();
    await mobile.destroy();
  });

  it("rejects a portable payload when Player changes to another MemberNumber", async () => {
    globalThis.Player = {
      MemberNumber: 101,
      Name: "First",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const first = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const settings = new SettingsStore(first);
    settings.update((draft) => {
      draft.ui.accent = "#abcdef";
    });
    await first.flush();

    globalThis.Player.MemberNumber = 202;
    globalThis.Player.Name = "Second";
    const second = new AccountDataStorage(202, new MemoryKeyValueStorage());
    expect(new SettingsStore(second).get().ui.accent).not.toBe("#abcdef");
    await first.destroy();
    await second.destroy();
  });

  it("derives a different IndexedDB database name for every account", () => {
    expect(accountChatDatabaseName(101)).toBe("kikilink-account-101");
    expect(accountChatDatabaseName(202)).toBe("kikilink-account-202");
    expect(() => accountChatDatabaseName(0)).toThrow("valid BC account");
  });
});

function message(): LinkMessage {
  return {
    id: "303:20:desktop",
    direction: "outgoing",
    peerNumber: 303,
    peerName: "Reina",
    content: "Hello from desktop",
    sentAt: 20,
    includeRoom: false,
    read: true,
  };
}

function conversation(): ConversationMeta {
  return {
    peerNumber: 303,
    peerName: "Reina",
    lastMessage: "Hello from desktop",
    lastMessageAt: 20,
    lastDirection: "outgoing",
    unread: 0,
    pinned: false,
    draft: "",
  };
}
