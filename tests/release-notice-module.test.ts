// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

const viewSpies = vi.hoisted(() => ({
  onMessage: vi.fn(async () => undefined),
  setConnectionState: vi.fn(),
}));

vi.mock("../src/modules/link-chat/view", () => ({
  LinkChatView: class {
    attachGroupChatService(): void {}
    mount(): void {}
    destroy(): void {}
    open(): Promise<void> { return Promise.resolve(); }
    close(): void {}
    openChat(): Promise<void> { return Promise.resolve(); }
    openRoster(): void {}
    openActivities(): void {}
    flushGroupStateForPageHide(): void {}
    isActiveConversation(): boolean { return false; }
    getActiveGroupId(): undefined { return undefined; }
    setConnectionState = viewSpies.setConnectionState;
    onMessage = viewSpies.onMessage;
    onRosterSync(): void {}
    onNotification(): void {}
    onReaction(): void {}
    refresh(): Promise<void> { return Promise.resolve(); }
  },
}));

vi.mock("../src/modules/link-activities/link-activities-service", () => ({
  LinkActivitiesService: class {
    start(): void {}
    stop(): void {}
    syncFromSettings(): void {}
  },
}));

vi.mock("../src/modules/link-roster/link-roster-service", () => ({
  LinkRosterService: class {
    prune(): void {}
    observePerson(): void {}
    sync(): { changed: false; presentCount: 0; joined: []; left: [] } {
      return { changed: false, presentCount: 0, joined: [], left: [] };
    }
  },
}));

vi.mock("../src/modules/link-chat/group-chat-service", () => ({
  GroupChatService: class {
    receiveProtocol(): Promise<void> { return Promise.resolve(); }
    destroy(): Promise<{ degraded: false; pendingChanges: false }> {
      return Promise.resolve({ degraded: false, pendingChanges: false });
    }
  },
}));

import type { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { BeepEvent, KikiLinkContext, KikiLinkEvents } from "../src/core/types";
import { LinkChatModule } from "../src/modules/link-chat/link-chat-module";
import { releaseNoticeMessage } from "../src/modules/link-chat/release-notice-service";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

afterEach(() => {
  viewSpies.onMessage.mockClear();
  viewSpies.setConnectionState.mockClear();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("LinkChatModule release-notice integration", () => {
  it("captures the caller-owned outgoing Beep exactly once in normal LinkChat history", async () => {
    const bus = new EventBus<KikiLinkEvents>();
    const repository = new MemoryChatRepository();
    const accountStorage = new MemoryKeyValueStorage();
    const sendBeep = vi.fn(
      (memberNumber: number, content: string, includeRoom: boolean): BeepEvent => ({
        direction: "outgoing",
        peerNumber: memberNumber,
        peerName: "Reina",
        content,
        sentAt: 10_000,
        includeRoom,
      }),
    );
    const adapter = {
      canSendBeep: () => true,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getMemberName: () => "Reina",
      getMemberNickname: () => undefined,
      getPlayerRelationships: () => [],
      getOnlineFriend: (memberNumber: number) => memberNumber === 123
        ? { memberNumber, memberName: "Reina", privateRoom: false }
        : undefined,
      getOnlineFriends: () => [
        { memberNumber: 123, memberName: "Reina", privateRoom: false },
      ],
      hasOnlineFriendSnapshot: () => true,
      isKnownFriend: (memberNumber: number) => memberNumber === 123,
      refreshOnlineFriends: () => true,
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => false),
      sendBeep,
      isReady: () => true,
      getRecentBeeps: () => [],
    } as unknown as BCAdapter;
    const context: KikiLinkContext = {
      adapter,
      bus,
      repository,
      settings: new SettingsStore(accountStorage),
      accountStorage,
      memberNumber: 999,
      version: "0.27.0",
    };
    const module = new LinkChatModule();
    module.start(context);

    try {
      bus.emit("bc:protocol", {
        senderNumber: 123,
        channel: "beep",
        payload: JSON.stringify({ t: "pc", v: "0.26.0", g: 3 }),
      });

      await vi.waitFor(async () => {
        expect(await repository.getMessages(123, 10)).toHaveLength(1);
      });
      const messages = await repository.getMessages(123, 10);
      expect(messages[0]).toMatchObject({
        direction: "outgoing",
        peerNumber: 123,
        peerName: "Reina",
        content: releaseNoticeMessage("0.27.0"),
        includeRoom: false,
        read: true,
      });
      expect(sendBeep).toHaveBeenCalledOnce();
      expect(viewSpies.onMessage).toHaveBeenCalledOnce();

      bus.emit("bc:protocol", {
        senderNumber: 123,
        channel: "beep",
        payload: JSON.stringify({ t: "pc", v: "0.26.0", g: 3 }),
      });
      await Promise.resolve();
      expect(await repository.getMessages(123, 10)).toHaveLength(1);
      expect(sendBeep).toHaveBeenCalledOnce();
      expect(viewSpies.onMessage).toHaveBeenCalledOnce();
    } finally {
      await module.stop();
    }
  });
});
