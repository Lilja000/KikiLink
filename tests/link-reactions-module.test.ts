import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => {
  vi.stubGlobal("Player", {
    MemberNumber: 999,
    Name: "Kiki",
    FriendNames: new Map<number, string>(),
  });
  vi.stubGlobal("ServerIsLoggedIn", () => true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
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
    context.settings.update((draft) => {
      draft.linkReactions.quickAlerts.roomJoin = true;
    });
    const fired = vi.fn();
    const notified = vi.fn();
    bus.on("link-reactions:fired", fired);
    bus.on("link-reactions:notification", notified);
    const module = new LinkReactionsModule();
    module.start(context);

    expect(fired).not.toHaveBeenCalled();
    expect(notified).not.toHaveBeenCalled();
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
    expect(notified).toHaveBeenCalledWith({
      kind: "room-join",
      message: "Mina joined Moon Garden.",
      showToast: true,
      memberNumber: 456,
      occurredAt: 3_000,
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
    context.settings.update((draft) => {
      draft.linkReactions.quickAlerts.friendOnline = true;
    });
    const fired = vi.fn();
    const notified = vi.fn();
    bus.on("link-reactions:fired", fired);
    bus.on("link-reactions:notification", notified);
    const module = new LinkReactionsModule();
    module.start(context);

    bus.emit("bc:online-friends", {
      friends: [{ memberNumber: 123, memberName: "Reina", privateRoom: false }],
      receivedAt: 1_000,
    });
    expect(fired).not.toHaveBeenCalled();
    expect(notified).not.toHaveBeenCalled();
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
    expect(notified).toHaveBeenCalledWith({
      kind: "friend-online",
      message: "Mina is online.",
      showToast: true,
      memberNumber: 456,
      occurredAt: 2_000,
    });
    module.stop();
  });

  it("emits a sound-only notification for an incoming chat when sounds are enabled", () => {
    const adapter = reactionAdapter({ isKnownFriend: () => true });
    const { context, bus } = reactionContext(
      adapter,
      reactionRule({ trigger: "room-join" }),
    );
    context.settings.update((draft) => {
      draft.linkReactions.sounds.enabled = true;
    });
    const notified = vi.fn();
    bus.on("link-reactions:notification", notified);
    const module = new LinkReactionsModule();
    module.start(context);

    bus.emit("beep:received", {
      direction: "incoming",
      peerNumber: 123,
      peerName: "Reina",
      content: "hello",
      sentAt: 4_000,
      includeRoom: false,
    });

    expect(notified).toHaveBeenCalledWith({
      kind: "chat",
      message: "New Beep from Reina.",
      showToast: false,
      memberNumber: 123,
      occurredAt: 4_000,
    });
    module.stop();
  });

  it("fails closed on Beep, friend, and room-timer paths immediately after an account switch", () => {
    vi.useFakeTimers({ now: 1_000 });
    let characters: RoomCharacter[] = [
      { memberNumber: 123, memberName: "Reina", isFriend: true },
    ];
    const getRoomCharacters = vi.fn(() => characters);
    const sendRoomEmote = vi.fn();
    const adapter = reactionAdapter({
      isInChatRoom: () => true,
      getCurrentRoomName: () => "Moon Garden",
      getRoomCharacters,
      isKnownFriend: () => true,
      canSendRoomEmote: () => true,
      sendRoomEmote,
    });
    const { context, bus } = reactionContext(
      adapter,
      reactionRule({ trigger: "room-join", action: "room-emote", template: "hello" }),
    );
    context.settings.update((draft) => {
      draft.linkReactions.quickAlerts.roomJoin = true;
      draft.linkReactions.quickAlerts.friendOnline = true;
      draft.linkReactions.sounds.enabled = true;
      draft.linkReactions.rules = [
        reactionRule({ id: "join", trigger: "room-join", action: "room-emote" }),
        reactionRule({ id: "online", trigger: "friend-online" }),
        reactionRule({ id: "beep", trigger: "beep-received" }),
      ];
    });
    const fired = vi.fn();
    const notified = vi.fn();
    bus.on("link-reactions:fired", fired);
    bus.on("link-reactions:notification", notified);
    const module = new LinkReactionsModule();
    module.start(context);
    bus.emit("bc:online-friends", {
      friends: [{ memberNumber: 123, memberName: "Reina", privateRoom: false }],
      receivedAt: 1_000,
    });
    const roomReadsBeforeSwitch = getRoomCharacters.mock.calls.length;

    globalThis.Player.MemberNumber = 1_000;
    characters = [
      ...characters,
      { memberNumber: 456, memberName: "Mina", isFriend: false },
    ];
    bus.emit("beep:received", {
      direction: "incoming",
      peerNumber: 456,
      peerName: "Mina",
      content: "hello",
      sentAt: 1_500,
      includeRoom: false,
    });
    bus.emit("bc:online-friends", {
      friends: [
        { memberNumber: 123, memberName: "Reina", privateRoom: false },
        { memberNumber: 456, memberName: "Mina", privateRoom: false },
      ],
      receivedAt: 1_500,
    });
    bus.emit("bc:ready", { memberNumber: 1_000 });
    vi.advanceTimersByTime(2_000);

    expect(getRoomCharacters).toHaveBeenCalledTimes(roomReadsBeforeSwitch);
    expect(sendRoomEmote).not.toHaveBeenCalled();
    expect(fired).not.toHaveBeenCalled();
    expect(notified).not.toHaveBeenCalled();
    module.stop();
  });

  it("does not publish a rule result if the account changes during evaluation", () => {
    const adapter = reactionAdapter({
      getOwnName: () => {
        globalThis.Player.MemberNumber = 1_000;
        return "Kiki";
      },
    });
    const { context, bus } = reactionContext(
      adapter,
      reactionRule({ trigger: "beep-received", action: "notice" }),
    );
    const fired = vi.fn();
    bus.on("link-reactions:fired", fired);
    const module = new LinkReactionsModule();
    module.start(context);

    bus.emit("beep:received", {
      direction: "incoming",
      peerNumber: 123,
      peerName: "Reina",
      content: "hello",
      sentAt: 4_000,
      includeRoom: false,
    });

    expect(fired).not.toHaveBeenCalled();
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
      memberNumber: 999,
      version: "0.16.0",
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
