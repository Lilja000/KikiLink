import { describe, expect, it } from "vitest";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

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

  it("replaces an account name with an explicitly resolved nickname", async () => {
    const { service } = setup();
    await service.ensureConversation(77, "AccountName");
    await service.setPeerName(77, "Nickname");

    expect(await service.getConversation(77)).toMatchObject({ peerName: "Nickname" });
  });
});
