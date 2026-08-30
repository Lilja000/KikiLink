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
import { ResilientChatRepository } from "../src/storage/resilient-chat-repository";
import { ChatService } from "../src/modules/link-chat/chat-service";

class ReadControlledStorage extends MemoryKeyValueStorage {
  readable = true;

  override getItem(key: string): string | null {
    if (!this.readable) throw new Error("storage read denied");
    return super.getItem(key);
  }
}

class WriteControlledStorage extends MemoryKeyValueStorage {
  writable = true;

  override setItem(key: string, value: string): void {
    if (this.writable) super.setItem(key, value);
  }

  override removeItem(key: string): void {
    if (this.writable) super.removeItem(key);
  }
}

afterEach(() => {
  vi.useRealTimers();
  for (const key of ["Player", "ServerPlayerExtensionSettingsSync", "LZString"]) {
    Reflect.deleteProperty(globalThis, key);
  }
});

describe("BC account-scoped KikiLink storage", () => {
  it("serves a newer cloud profile from memory when browser restoration is write-denied", async () => {
    const browser = new WriteControlledStorage();
    browser.setItem(
      `kikilink:account:101:${SETTINGS_KEY}`,
      JSON.stringify({ ui: { accent: "#111111" } }),
    );
    browser.writable = false;
    const remoteState = {
      version: 1,
      owner: 101,
      updatedAt: 50,
      settings: { ui: { accent: "#abcdef" } },
    };
    globalThis.Player = {
      MemberNumber: 101,
      Name: "CloudKiki",
      FriendNames: new Map(),
      ExtensionSettings: { KikiLink: `JSON:${JSON.stringify(remoteState)}` },
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();

    const account = new AccountDataStorage(101, browser);
    const settings = new SettingsStore(account);
    expect(settings.get().ui.accent).toBe("#abcdef");
    expect(browser.getItem(`kikilink:account:101:${SETTINGS_KEY}`)).toContain("#111111");

    settings.update((draft) => {
      draft.ui.density = "compact";
    });
    await account.flush();
    expect(globalThis.Player.ExtensionSettings?.KikiLink).toContain("#abcdef");
    await account.destroy();
  });

  it("diagnoses a backing read failure separately from an absent account key", async () => {
    const browser = new ReadControlledStorage();
    const account = new AccountDataStorage(101, browser);

    expect(account.getItemResult("missing")).toEqual({ ok: true, value: null });
    browser.readable = false;
    expect(account.getItem("missing")).toBeNull();
    expect(account.getItemResult("missing")).toEqual({ ok: false });

    browser.readable = true;
    expect(account.getItemResult("missing")).toEqual({ ok: true, value: null });
    await account.destroy();
  });

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
      draft.linkPresence.bannerUrl = "https://files.catbox.moe/kiki-banner.webp";
      draft.linkPresence.profileOutlineColor = "#a14fd6";
      draft.linkPresence.profileGradient = {
        enabled: true,
        primary: "#8A1538",
        secondary: "#2A9D8F",
      };
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
    expect(mobileSettings.linkPresence.bannerUrl).toBe(
      "https://files.catbox.moe/kiki-banner.webp",
    );
    expect(mobileSettings.linkPresence.profileOutlineColor).toBe("#a14fd6");
    expect(mobileSettings.linkPresence.profileGradient).toEqual({
      enabled: true,
      primary: "#8a1538",
      secondary: "#2a9d8f",
    });
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

  it("sanitizes recognized transport suffixes in portable chats without altering near-matches", async () => {
    const rawTransportContent =
      'Portable message \uf124{"messageType":"Message","messageColor":"#C60000"}' +
      "\u2063LikoMAT:en\u2063";
    const authoredNearMatch =
      'Keep this \uf124{"messageType":"Message","messageColor":"red"}';
    const remoteState = {
      version: 1,
      owner: 101,
      updatedAt: 50,
      chats: {
        conversations: [{ ...conversation(), lastMessage: rawTransportContent }],
        messages: [
          { ...message(), content: rawTransportContent },
          {
            ...message(),
            id: "303:21:authored",
            content: authoredNearMatch,
            sentAt: 21,
          },
        ],
      },
    };
    globalThis.Player = {
      MemberNumber: 101,
      Name: "PortableKiki",
      FriendNames: new Map(),
      ExtensionSettings: { KikiLink: `JSON:${JSON.stringify(remoteState)}` },
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const account = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const repository = new MemoryChatRepository();

    await account.attachChatRepository(repository);

    expect(await repository.getConversation(303)).toMatchObject({
      lastMessage: "Portable message",
    });
    expect(await repository.getMessages(303)).toMatchObject([
      { content: "Portable message" },
      { content: authoredNearMatch },
    ]);
    await account.destroy();
  });

  it("never exports legacy transport envelopes from unsanitized local repository rows", async () => {
    const rawTransportContent =
      'Portable message \uf124{"messageType":"Message"}' +
      "\u2063LikoMAT:en\u2063";
    globalThis.Player = {
      MemberNumber: 101,
      Name: "PortableKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const account = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const repository = new MemoryChatRepository();
    await repository.addMessage({ ...message(), content: rawTransportContent });
    await repository.putConversation({ ...conversation(), lastMessage: rawTransportContent });
    await account.attachChatRepository(repository);

    account.markChatChanged();
    await account.flush();

    expect(readCloudChatState()).toMatchObject({
      conversations: [{ lastMessage: "Portable message" }],
      messages: [{ content: "Portable message" }],
    });
    // Export safety does not need to mutate a repository that may be read-only or in fallback.
    expect(await repository.getMessages(303)).toMatchObject([{ content: rawTransportContent }]);
    await account.destroy();
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

  it("recaptures a chat change that finishes while a portable snapshot is pending", async () => {
    globalThis.Player = {
      MemberNumber: 101,
      Name: "ConcurrentKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const account = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const repository = new MemoryChatRepository();
    const oldConversation = { ...conversation(), lastMessage: "Old", lastMessageAt: 20 };
    await repository.putConversation(oldConversation);
    await account.attachChatRepository(repository);

    const captureStarted = deferred<void>();
    const releaseCapture = deferred<void>();
    const staleSnapshot = await repository.listConversations();
    const listConversations = vi
      .spyOn(repository, "listConversations")
      .mockImplementationOnce(async () => {
        captureStarted.resolve();
        await releaseCapture.promise;
        return staleSnapshot;
      });

    account.markChatChanged();
    const firstFlush = account.flush();
    await captureStarted.promise;
    await repository.putConversation({
      ...conversation(),
      lastMessage: "Changed during capture",
      lastMessageAt: 30,
    });
    account.markChatChanged();
    releaseCapture.resolve();
    await firstFlush;
    await account.flush();

    expect(listConversations).toHaveBeenCalledTimes(2);
    expect(readCloudChatState().conversations).toMatchObject([
      { peerNumber: 303, lastMessage: "Changed during capture", lastMessageAt: 30 },
    ]);
    await account.destroy();
  });

  it("keeps a transient snapshot failure visible but allows the next flush to recover", async () => {
    globalThis.Player = {
      MemberNumber: 101,
      Name: "ReliableKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const account = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const repository = new MemoryChatRepository();
    await repository.putConversation(conversation());
    await account.attachChatRepository(repository);
    const listConversations = vi
      .spyOn(repository, "listConversations")
      .mockRejectedValueOnce(new Error("temporary snapshot failure"));

    account.markChatChanged();
    await expect(account.flush()).rejects.toThrow("temporary snapshot failure");
    await expect(account.flush()).resolves.toBeUndefined();

    expect(listConversations).toHaveBeenCalledTimes(2);
    expect(readCloudChatState().conversations).toMatchObject([
      { peerNumber: 303, lastMessage: "Hello from desktop" },
    ]);
    expect(warning).toHaveBeenCalledWith(
      "[KikiLink:storage] Account sync failed; local account data is safe",
      expect.any(Error),
    );
    await account.destroy();
    warning.mockRestore();
  });

  it("finishes teardown and cancels later sync work when the final snapshot fails", async () => {
    vi.useFakeTimers();
    globalThis.Player = {
      MemberNumber: 101,
      Name: "ReloadingKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const account = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const repository = new MemoryChatRepository();
    await account.attachChatRepository(repository);
    const listConversations = vi
      .spyOn(repository, "listConversations")
      .mockRejectedValue(new Error("storage closing"));

    account.markChatChanged();
    await expect(account.destroy()).resolves.toBeUndefined();
    account.markChatChanged();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(listConversations).toHaveBeenCalledOnce();
    expect(globalThis.ServerPlayerExtensionSettingsSync).not.toHaveBeenCalled();
    warning.mockRestore();
  });

  it("preserves the last portable chats when IndexedDB falls back during capture", async () => {
    const existingState = {
      version: 1,
      owner: 101,
      updatedAt: 20,
      chats: {
        conversations: [conversation()],
        messages: [message()],
      },
    };
    globalThis.Player = {
      MemberNumber: 101,
      Name: "FallbackKiki",
      FriendNames: new Map(),
      ExtensionSettings: { KikiLink: `JSON:${JSON.stringify(existingState)}` },
    };
    const sync = vi.fn();
    globalThis.ServerPlayerExtensionSettingsSync = sync;
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const account = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const primary = new MemoryChatRepository();
    const fallback = new MemoryChatRepository();
    const repository = new ResilientChatRepository(primary, fallback);
    await account.attachChatRepository(repository);
    vi.spyOn(primary, "listConversations").mockRejectedValueOnce(
      new Error("IndexedDB connection lost"),
    );

    account.markChatChanged();
    await expect(account.flush()).resolves.toBeUndefined();

    expect(repository.canSafelyCapturePortableSnapshot()).toBe(false);
    expect(await fallback.listConversations()).toEqual([]);
    expect(readCloudChatState()).toMatchObject({
      conversations: [{ peerNumber: 303, lastMessage: "Hello from desktop" }],
      messages: [{ id: "303:20:desktop", content: "Hello from desktop" }],
    });
    expect(sync).toHaveBeenCalledWith("KikiLink");
    expect(warning).toHaveBeenCalledWith(
      "[KikiLink:storage] Session fallback is active; preserving the last portable chat snapshot",
    );

    await account.destroy();
    repository.close();
    warning.mockRestore();
  });

  it("recaptures committed chat rows after a reload interrupts the debounce", async () => {
    vi.useFakeTimers();
    globalThis.Player = {
      MemberNumber: 101,
      Name: "ReloadedKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    const sync = vi.fn();
    globalThis.ServerPlayerExtensionSettingsSync = sync;
    const browser = new MemoryKeyValueStorage();
    const persistentChats = new MemoryChatRepository();
    const beforeReload = new AccountDataStorage(101, browser);
    await beforeReload.attachChatRepository(persistentChats);
    const chat = new AccountSyncedChatRepository(persistentChats, beforeReload);
    await chat.addMessage(message());
    await chat.putConversation(conversation());

    // Simulate the page disappearing before its five-second timer can run. IndexedDB and local
    // account storage survive, while JavaScript timers do not.
    vi.clearAllTimers();
    const afterReload = new AccountDataStorage(101, browser);
    await afterReload.attachChatRepository(persistentChats);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(sync).toHaveBeenCalledTimes(1);
    expect(readCloudChatState()).toMatchObject({
      conversations: [{ peerNumber: 303, lastMessage: "Hello from desktop" }],
      messages: [{ id: "303:20:desktop", content: "Hello from desktop" }],
    });

    const afterSuccessfulCapture = new AccountDataStorage(101, browser);
    await afterSuccessfulCapture.attachChatRepository(persistentChats);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(sync).toHaveBeenCalledTimes(1);

    await afterSuccessfulCapture.destroy();
    await afterReload.destroy();
    await beforeReload.destroy();
  });

  it("keeps an explicit chat clear ahead of a stale cloud snapshot on immediate reload", async () => {
    globalThis.Player = {
      MemberNumber: 101,
      Name: "ClearingKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const browser = new MemoryKeyValueStorage();
    const repository = new MemoryChatRepository();
    const beforeReload = new AccountDataStorage(101, browser);
    await beforeReload.attachChatRepository(repository);
    const chats = new AccountSyncedChatRepository(repository, beforeReload);
    await chats.addMessage(message());
    await chats.putConversation(conversation());
    await beforeReload.flush();
    const staleCloud = globalThis.Player.ExtensionSettings?.KikiLink;

    await expect(chats.clearAllDurably()).resolves.toBe(true);
    expect(await repository.listConversations()).toEqual([]);
    globalThis.Player.ExtensionSettings = { KikiLink: staleCloud };

    const afterReload = new AccountDataStorage(101, browser);
    await afterReload.attachChatRepository(repository);
    expect(await repository.listConversations()).toEqual([]);
    expect(await repository.getMessages(303)).toEqual([]);

    await afterReload.destroy();
    await beforeReload.destroy();
  });

  it("keeps a per-conversation deletion ahead of a stale cloud snapshot on immediate reload", async () => {
    globalThis.Player = {
      MemberNumber: 101,
      Name: "DeletingKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const browser = new MemoryKeyValueStorage();
    const repository = new MemoryChatRepository();
    const beforeReload = new AccountDataStorage(101, browser);
    await beforeReload.attachChatRepository(repository);
    const chats = new AccountSyncedChatRepository(repository, beforeReload);
    await chats.addMessage(message());
    await chats.putConversation(conversation());
    await beforeReload.flush();
    const staleCloud = globalThis.Player.ExtensionSettings?.KikiLink;

    await chats.deleteConversation(303);
    vi.clearAllTimers();
    globalThis.Player.ExtensionSettings = { KikiLink: staleCloud };

    const afterReload = new AccountDataStorage(101, browser);
    await afterReload.attachChatRepository(repository);
    expect(await repository.getConversation(303)).toBeUndefined();
    expect(await repository.getMessages(303)).toEqual([]);

    await afterReload.destroy();
    await beforeReload.destroy();
  });

  it("applies a portable peer deletion to stale rows on another device", async () => {
    globalThis.Player = {
      MemberNumber: 101,
      Name: "DeletingKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const first = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const firstLocal = new MemoryChatRepository();
    await first.attachChatRepository(firstLocal);
    const firstChats = new AccountSyncedChatRepository(firstLocal, first);
    await firstChats.addMessage(message());
    await firstChats.putConversation(conversation());
    await first.flush();
    await firstChats.deleteConversation(303);
    await first.flush();

    const staleSecondLocal = new MemoryChatRepository();
    await staleSecondLocal.addMessage(message());
    await staleSecondLocal.putConversation(conversation());
    const second = new AccountDataStorage(101, new MemoryKeyValueStorage());
    await second.attachChatRepository(staleSecondLocal);

    expect(await staleSecondLocal.getConversation(303)).toBeUndefined();
    expect(await staleSecondLocal.getMessages(303)).toEqual([]);
    second.markChatChanged();
    await second.flush();
    expect(readCloudChatState()).toEqual({ conversations: [], messages: [] });

    await second.destroy();
    await first.destroy();
  });

  it("applies a portable all-chat clear to stale rows on another device", async () => {
    globalThis.Player = {
      MemberNumber: 101,
      Name: "ClearingKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const first = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const firstLocal = new MemoryChatRepository();
    await first.attachChatRepository(firstLocal);
    const firstChats = new AccountSyncedChatRepository(firstLocal, first);
    await firstChats.addMessage(message());
    await firstChats.putConversation(conversation());
    await first.flush();
    await firstChats.clearAllDurably();

    const staleSecondLocal = new MemoryChatRepository();
    await staleSecondLocal.addMessage(message());
    await staleSecondLocal.putConversation(conversation());
    const second = new AccountDataStorage(101, new MemoryKeyValueStorage());
    await second.attachChatRepository(staleSecondLocal);

    expect(await staleSecondLocal.listConversations()).toEqual([]);
    expect(await staleSecondLocal.getMessages(303)).toEqual([]);

    await second.destroy();
    await first.destroy();
  });

  it("keeps a per-conversation trim from being undone by stale device rows", async () => {
    globalThis.Player = {
      MemberNumber: 101,
      Name: "TrimmingKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const first = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const firstLocal = new MemoryChatRepository();
    await first.attachChatRepository(firstLocal);
    const firstChats = new AccountSyncedChatRepository(firstLocal, first);
    const allMessages = Array.from({ length: 60 }, (_, index): LinkMessage => ({
      ...message(),
      id: `303:${index + 1}:trim`,
      content: `Message ${index + 1}`,
      sentAt: index + 1,
    }));
    for (const item of allMessages) await firstChats.addMessage(item);
    await firstChats.putConversation({
      ...conversation(),
      lastMessage: "Message 60",
      lastMessageAt: 60,
    });
    await first.flush();
    expect(await firstChats.trimConversation(303, 50)).toBe(10);
    await first.flush();

    const staleSecondLocal = new MemoryChatRepository();
    for (const item of allMessages) await staleSecondLocal.addMessage(item);
    await staleSecondLocal.putConversation({
      ...conversation(),
      lastMessage: "Message 60",
      lastMessageAt: 60,
    });
    const second = new AccountDataStorage(101, new MemoryKeyValueStorage());
    await second.attachChatRepository(staleSecondLocal);

    const retained = await staleSecondLocal.getMessages(303, 100);
    expect(retained).toHaveLength(50);
    expect(retained[0]?.content).toBe("Message 11");

    await second.destroy();
    await first.destroy();
  });

  it("removes expired message text from conversation previews and account sync", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    globalThis.Player = {
      MemberNumber: 101,
      Name: "PruningKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const account = new AccountDataStorage(101, new MemoryKeyValueStorage());
    const local = new MemoryChatRepository();
    await account.attachChatRepository(local);
    const repository = new AccountSyncedChatRepository(local, account);
    const settings = new SettingsStore(account);
    settings.update((draft) => {
      draft.linkChat.retentionDays = 1;
    });
    const secret = "expired-private-preview";
    const oldTime = Date.now() - 2 * 24 * 60 * 60 * 1000;
    await repository.addMessage({ ...message(), content: secret, sentAt: oldTime });
    await repository.putConversation({
      ...conversation(),
      lastMessage: secret,
      lastMessageAt: oldTime,
    });

    await new ChatService(repository, settings).prune();
    await account.flush();

    expect(await local.getMessages(303)).toEqual([]);
    expect(await local.getConversation(303)).toMatchObject({
      lastMessage: "",
      lastMessageAt: 0,
      unread: 0,
    });
    expect(globalThis.Player.ExtensionSettings?.KikiLink).not.toContain(secret);
    await account.destroy();
  });

  it("does not let an older in-flight snapshot resurrect chats after an explicit clear", async () => {
    globalThis.Player = {
      MemberNumber: 101,
      Name: "ConcurrentClearKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    globalThis.ServerPlayerExtensionSettingsSync = vi.fn();
    const browser = new MemoryKeyValueStorage();
    const repository = new MemoryChatRepository();
    const account = new AccountDataStorage(101, browser);
    await account.attachChatRepository(repository);
    const chats = new AccountSyncedChatRepository(repository, account);
    await chats.addMessage(message());
    await chats.putConversation(conversation());
    await account.flush();
    const staleCloud = globalThis.Player.ExtensionSettings?.KikiLink;

    const captureStarted = deferred<void>();
    const releaseCapture = deferred<void>();
    const staleConversations = await repository.listConversations();
    vi.spyOn(repository, "listConversations").mockImplementationOnce(async () => {
      captureStarted.resolve();
      await releaseCapture.promise;
      return staleConversations;
    });
    account.markChatChanged();
    const staleFlush = account.flush();
    await captureStarted.promise;
    const clearing = chats.clearAllDurably();
    releaseCapture.resolve();

    await expect(Promise.all([staleFlush, clearing])).resolves.toEqual([undefined, true]);
    globalThis.Player.ExtensionSettings = { KikiLink: staleCloud };
    const afterReload = new AccountDataStorage(101, browser);
    await afterReload.attachChatRepository(repository);
    expect(await repository.listConversations()).toEqual([]);
    expect(await repository.getMessages(303)).toEqual([]);

    await afterReload.destroy();
    await account.destroy();
  });

  it("reports a session-only clear when IndexedDB falls back instead of erasing durable rows", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const primary = new MemoryChatRepository();
    const fallback = new MemoryChatRepository();
    await primary.putConversation(conversation());
    await fallback.putConversation(conversation());
    vi.spyOn(primary, "clearAll").mockRejectedValueOnce(new Error("IndexedDB clear failed"));
    const repository = new ResilientChatRepository(primary, fallback);

    await expect(repository.clearAllDurably()).resolves.toBe(false);
    expect(await fallback.listConversations()).toEqual([]);
    expect(await primary.listConversations()).toHaveLength(1);
    warning.mockRestore();
  });

  it("debounces account cloud sync until changes have been quiet for five seconds", async () => {
    vi.useFakeTimers();
    globalThis.Player = {
      MemberNumber: 101,
      Name: "PatientKiki",
      FriendNames: new Map(),
      ExtensionSettings: {},
    };
    const sync = vi.fn();
    globalThis.ServerPlayerExtensionSettingsSync = sync;
    const account = new AccountDataStorage(101, new MemoryKeyValueStorage());

    account.setItem(SETTINGS_KEY, JSON.stringify({ ui: { accent: "#111111" } }));
    await vi.advanceTimersByTimeAsync(4_000);
    account.setItem(SETTINGS_KEY, JSON.stringify({ ui: { accent: "#222222" } }));
    await vi.advanceTimersByTimeAsync(4_999);
    expect(sync).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(globalThis.Player.ExtensionSettings?.KikiLink).toContain("#222222");
    await account.destroy();
  });
});

function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function readCloudChatState(): { conversations: ConversationMeta[]; messages: LinkMessage[] } {
  const encoded = globalThis.Player.ExtensionSettings?.KikiLink;
  if (typeof encoded !== "string" || !encoded.startsWith("JSON:")) {
    throw new Error("Expected an uncompressed portable account snapshot");
  }
  const parsed = JSON.parse(encoded.slice("JSON:".length)) as {
    chats?: { conversations?: ConversationMeta[]; messages?: LinkMessage[] };
  };
  return {
    conversations: parsed.chats?.conversations ?? [],
    messages: parsed.chats?.messages ?? [],
  };
}

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
