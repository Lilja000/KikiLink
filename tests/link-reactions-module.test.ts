import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type {
  KikiLinkContext,
  KikiLinkEvents,
  ReactionRule,
  RoomCharacter,
} from "../src/core/types";
import { LinkReactionsModule } from "../src/modules/link-reactions/link-reactions-module";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

afterEach(() => {
  vi.useRealTimers();
});

describe("LinkReactionsModule", () => {
  it("takes a quiet room baseline and reacts only to a later join", () => {
    vi.useFakeTimers({ now: 1_000 });
    let characters: RoomCharacter[] = [
      { memberNumber: 123, memberName: "Reina", isFriend: true },
    ];
    const adapter = reactionAdapter({
      isInChatRoom: () => true,
      getCurrentRoomName: () => "Moon Garden",
      getRoomCharacters: () => characters,
    });
    const { context, bus } = reactionContext(
      adapter,
      reactionRule({ trigger: "room-join", template: "{name} joined {room}." }),
    );
    const fired = vi.fn();
    bus.on("link-reactions:fired", fired);
    const module = new LinkReactionsModule();
    module.start(context);

    expect(fired).not.toHaveBeenCalled();
    characters = [
      ...characters,
      { memberNumber: 456, memberName: "Mina", isFriend: false },
    ];
    vi.advanceTimersByTime(2_000);

    expect(fired).toHaveBeenCalledTimes(1);
    expect(fired.mock.calls[0]?.[0]).toMatchObject({
      message: "Mina joined Moon Garden.",
      event: { trigger: "room-join", memberNumber: 456 },
    });
    context.settings.update((draft) => {
      draft.linkReactions.rules = [
        reactionRule({ trigger: "room-leave", template: "{name} left {room}." }),
      ];
    });
    characters = characters.filter((character) => character.memberNumber !== 456);
    vi.advanceTimersByTime(2_000);
    expect(fired).toHaveBeenCalledTimes(2);
    expect(fired.mock.calls[1]?.[0]).toMatchObject({
      message: "Mina left Moon Garden.",
      event: { trigger: "room-leave", memberNumber: 456 },
    });
    module.stop();
  });

  it("suppresses the first online snapshot and reacts when a friend appears later", () => {
    vi.useFakeTimers({ now: 1_000 });
    const adapter = reactionAdapter({ isInChatRoom: () => false });
    const { context, bus } = reactionContext(
      adapter,
      reactionRule({ trigger: "friend-online", template: "{name} came online." }),
    );
    const fired = vi.fn();
    bus.on("link-reactions:fired", fired);
    const module = new LinkReactionsModule();
    module.start(context);

    bus.emit("bc:online-friends", {
      friends: [{ memberNumber: 123, memberName: "Reina", privateRoom: false }],
      receivedAt: 1_000,
    });
    expect(fired).not.toHaveBeenCalled();
    bus.emit("bc:online-friends", {
      friends: [
        { memberNumber: 123, memberName: "Reina", privateRoom: false },
        { memberNumber: 456, memberName: "Mina", privateRoom: false },
      ],
      receivedAt: 2_000,
    });

    expect(fired).toHaveBeenCalledTimes(1);
    expect(fired.mock.calls[0]?.[0]).toMatchObject({
      message: "Mina came online.",
      event: { trigger: "friend-online", memberNumber: 456, isFriend: true },
    });
    module.stop();
  });
});

function reactionContext(
  adapter: BCAdapter,
  rule: ReactionRule,
): { context: KikiLinkContext; bus: EventBus<KikiLinkEvents> } {
  const bus = new EventBus<KikiLinkEvents>();
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  settings.update((draft) => {
    draft.linkReactions.enabled = true;
    draft.linkReactions.rules = [rule];
  });
  return {
    bus,
    context: {
      adapter,
      bus,
      repository: new MemoryChatRepository(),
      settings,
      version: "0.15.0",
    },
  };
}

function reactionAdapter(overrides: Partial<BCAdapter>): BCAdapter {
  return {
    isInChatRoom: () => false,
    getCurrentRoomName: () => undefined,
    getRoomCharacters: () => [],
    isKnownFriend: () => false,
    getOwnName: () => "Kiki",
    canSendRoomEmote: () => false,
    sendRoomEmote: vi.fn(),
    ...overrides,
  } as unknown as BCAdapter;
}

function reactionRule(overrides: Partial<ReactionRule> = {}): ReactionRule {
  return {
    id: "rule",
    label: "Rule",
    enabled: true,
    trigger: "room-join",
    scope: "anyone",
    memberNumbers: [],
    textMatch: "",
    action: "notice",
    template: "{name} {event}.",
    cooldownSeconds: 0,
    ...overrides,
  };
}
