import { describe, expect, it } from "vitest";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

const WCE_LIKO_MAT_SUFFIX =
  '\uf124{"messageType":"Message","messageColor":"#C60000"}\u2063LikoMAT:en\u2063';

function setup(): {
  service: ChatService;
  repository: MemoryChatRepository;
  settings: SettingsStore;
} {
  const repository = new MemoryChatRepository();
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  return {
    service: new ChatService(repository, settings),
    repository,
    settings,
  };
}

describe("ChatService", () => {
  it("stores incoming Beeps and increments unread state", async () => {
    const { service } = setup();
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 123,
        peerName: "Reina",
        content: "Hello",
        sentAt: 100,
        includeRoom: false,
      },
      false,
    );

    expect(await service.getMessages(123)).toMatchObject([
      { peerName: "Reina", content: "Hello", direction: "incoming", read: false },
    ]);
    expect(await service.getConversation(123)).toMatchObject({ unread: 1, lastMessage: "Hello" });
  });

  it("marks an active conversation as read", async () => {
    const { service } = setup();
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 123,
        peerName: "Reina",
        content: "One",
        sentAt: 100,
        includeRoom: false,
      },
      false,
    );
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 123,
        peerName: "Reina",
        content: "Two",
        sentAt: 200,
        includeRoom: false,
      },
      true,
    );

    expect(await service.getConversation(123)).toMatchObject({ unread: 0, lastMessage: "Two" });
  });

  it("keeps disabled history only for the current session", async () => {
    const { service, repository, settings } = setup();
    settings.update((draft) => {
      draft.linkChat.saveHistory = false;
    });

    await service.capture(
      {
        direction: "outgoing",
        peerNumber: 456,
        peerName: "Sidney",
        content: "Temporary",
        sentAt: 300,
        includeRoom: true,
        roomName: "Main Hall",
      },
      true,
    );

    expect(await service.getMessages(456)).toHaveLength(1);
    expect(await repository.getMessages(456)).toHaveLength(0);
  });

  it("sorts pinned conversations before recent conversations", async () => {
    const { service } = setup();
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 1,
        peerName: "Older",
        content: "First",
        sentAt: 100,
        includeRoom: false,
      },
      false,
    );
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 2,
        peerName: "Newer",
        content: "Second",
        sentAt: 200,
        includeRoom: false,
      },
      false,
    );
    await service.togglePinned(1);

    expect((await service.listConversations()).map((item) => item.peerNumber)).toEqual([1, 2]);
  });

  it("imports native recent Beeps without duplicating messages already captured", async () => {
    const { service } = setup();
    const event = {
      direction: "outgoing" as const,
      peerNumber: 88,
      peerName: "Pup",
      content: "Already sent",
      sentAt: 1000,
      includeRoom: false,
    };

    expect(await service.captureRecent(event)).toBe(true);
    expect(await service.captureRecent({ ...event, sentAt: 1750 })).toBe(false);
    expect(await service.getMessages(88)).toHaveLength(1);
  });

  it("canonicalizes transport suffixes before storing and deduplicating native recent Beeps", async () => {
    const { service, repository } = setup();
    const event = {
      direction: "incoming" as const,
      peerNumber: 89,
      peerName: "Liko user",
      content: `Я не сохраняла ${WCE_LIKO_MAT_SUFFIX}`,
      sentAt: 1_000,
      includeRoom: false,
    };

    expect(await service.captureRecent(event)).toBe(true);
    expect(
      await service.captureRecent({
        ...event,
        content: "Я не сохраняла",
        sentAt: 1_750,
      }),
    ).toBe(false);

    expect(await repository.getMessages(89)).toMatchObject([{ content: "Я не сохраняла" }]);
    expect(await repository.getConversation(89)).toMatchObject({
      lastMessage: "Я не сохраняла",
    });
  });

  it("deduplicates a clean recent Beep against a legacy raw row while repairing it in place", async () => {
    const { service, repository } = setup();
    await repository.addMessage({
      id: "legacy-native-beep",
      direction: "incoming",
      peerNumber: 90,
      peerName: "Liko user",
      content: `Уже было ${WCE_LIKO_MAT_SUFFIX}`,
      sentAt: 1_000,
      includeRoom: false,
      read: true,
    });
    await repository.putConversation({
      peerNumber: 90,
      peerName: "Liko user",
      lastMessage: `Уже было ${WCE_LIKO_MAT_SUFFIX}`,
      lastMessageAt: 1_000,
      lastDirection: "incoming",
      unread: 0,
      pinned: false,
      draft: "",
    });

    expect(await service.captureRecent({
      direction: "incoming",
      peerNumber: 90,
      peerName: "Liko user",
      content: "Уже было",
      sentAt: 1_750,
      includeRoom: false,
    })).toBe(false);
    expect(await repository.getMessages(90)).toMatchObject([
      { id: "legacy-native-beep", content: "Уже было" },
    ]);
  });

  it("cleans old message reads and repairs previews while preserving authored near-matches", async () => {
    const { service, repository } = setup();
    const rawTransportContent = `Stored message ${WCE_LIKO_MAT_SUFFIX}`;
    const authoredNearMatch =
      'Keep this \uf124{"messageType":"Message","messageColor":"not-a-color"}';
    await repository.addMessage({
      id: "old-wire-message",
      direction: "incoming",
      peerNumber: 501,
      peerName: "Old client",
      content: rawTransportContent,
      sentAt: 100,
      includeRoom: false,
      read: true,
    });
    await repository.putConversation({
      peerNumber: 501,
      peerName: "Old client",
      lastMessage: rawTransportContent,
      lastMessageAt: 100,
      lastDirection: "incoming",
      unread: 0,
      pinned: false,
      draft: "",
    });
    await repository.addMessage({
      id: "authored-near-match",
      direction: "incoming",
      peerNumber: 502,
      peerName: "Author",
      content: authoredNearMatch,
      sentAt: 200,
      includeRoom: false,
      read: true,
    });
    await repository.putConversation({
      peerNumber: 502,
      peerName: "Author",
      lastMessage: authoredNearMatch,
      lastMessageAt: 200,
      lastDirection: "incoming",
      unread: 0,
      pinned: false,
      draft: "",
    });

    expect(await service.getMessages(501)).toMatchObject([{ content: "Stored message" }]);
    expect(await service.getMessages(502)).toMatchObject([{ content: authoredNearMatch }]);
    expect(await service.listConversations()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ peerNumber: 501, lastMessage: "Stored message" }),
        expect.objectContaining({ peerNumber: 502, lastMessage: authoredNearMatch }),
      ]),
    );
    expect(await repository.getConversation(501)).toMatchObject({
      lastMessage: "Stored message",
    });
    expect(await repository.getConversation(502)).toMatchObject({
      lastMessage: authoredNearMatch,
    });
    expect(await repository.getMessages(501)).toMatchObject([{ content: "Stored message" }]);
    expect(await repository.getMessages(502)).toMatchObject([{ content: authoredNearMatch }]);
  });

  it("replaces an account name with an explicitly resolved nickname", async () => {
    const { service } = setup();
    await service.ensureConversation(77, "AccountName");
    await service.setPeerName(77, "Nickname");

    expect(await service.getConversation(77)).toMatchObject({ peerName: "Nickname" });
  });

  it("builds a newest-first, deduplicated media gallery across all chats", async () => {
    const { service } = setup();
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 11,
        peerName: "Litterbox friend",
        content: "https://litter.catbox.moe/flower.webp",
        sentAt: 100,
        includeRoom: false,
      },
      false,
    );
    await service.capture(
      {
        direction: "outgoing",
        peerNumber: 22,
        peerName: "Other host friend",
        content: "Again https://litter.catbox.moe/flower.webp and https://images.example/new.png",
        sentAt: 200,
        includeRoom: false,
      },
      true,
    );

    expect(await service.listMedia()).toMatchObject([
      {
        url: "https://litter.catbox.moe/flower.webp",
        provider: "litterbox",
        peerNumber: 22,
        direction: "outgoing",
      },
      {
        url: "https://images.example/new.png",
        provider: "other",
        peerNumber: 22,
      },
    ]);
  });

  it("keeps a private local alias while the native nickname is refreshed", async () => {
    const { service } = setup();
    await service.ensureConversation(77, "AccountName");
    await service.setLocalAlias(77, "  My Reina  ");
    await service.setPeerName(77, "Reina");
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 77,
        peerName: "New native nickname",
        content: "Hello",
        sentAt: 500,
        includeRoom: false,
      },
      false,
    );

    expect(await service.getConversation(77)).toMatchObject({
      peerName: "Reina",
      localAlias: "My Reina",
    });
  });

  it("removes one recent chat and its local messages", async () => {
    const { service, repository, settings } = setup();
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 77,
        peerName: "Reina",
        content: "Remove me",
        sentAt: 500,
        includeRoom: false,
      },
      false,
    );
    await service.capture(
      {
        direction: "incoming",
        peerNumber: 88,
        peerName: "Sidney",
        content: "Keep me",
        sentAt: 600,
        includeRoom: false,
      },
      false,
    );

    await service.removeConversation(77);

    expect(await service.getConversation(77)).toBeUndefined();
    expect(await service.getMessages(77)).toEqual([]);
    expect((await service.listConversations()).map((conversation) => conversation.peerNumber)).toEqual([88]);

    const restarted = new ChatService(repository, settings);
    expect(
      await restarted.captureRecent({
        direction: "incoming",
        peerNumber: 77,
        peerName: "Reina",
        content: "Remove me",
        sentAt: 500,
        includeRoom: false,
      }),
    ).toBe(false);
    expect(await restarted.listConversations()).toHaveLength(1);

    expect(
      await restarted.captureRecent({
        direction: "incoming",
        peerNumber: 77,
        peerName: "Reina",
        content: "A genuinely new message",
        sentAt: Date.now() + 10,
        includeRoom: false,
      }),
    ).toBe(true);
    expect((await restarted.listConversations()).map((conversation) => conversation.peerNumber)).toEqual([77, 88]);
  });
});
