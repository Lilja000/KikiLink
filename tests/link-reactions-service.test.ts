import { describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { LinkReactionEvent, ReactionRule } from "../src/core/types";
import {
  LinkReactionsService,
  matchesRule,
  MIN_ROOM_REACTION_INTERVAL_MS,
} from "../src/modules/link-reactions/link-reactions-service";

describe("LinkReactionsService", () => {
  it("matches a scoped incoming Beep, expands private variables, and enforces cooldown", () => {
    const settings = settingsWithRules([
      reactionRule({
        id: "urgent-reina",
        label: "Urgent Reina Beep",
        trigger: "beep-received",
        scope: "members",
        memberNumbers: [123],
        textMatch: "urgent",
        template: "{name} #{member}: {message} — {event}",
        cooldownSeconds: 30,
      }),
    ]);
    const adapter = {
      getOwnName: () => "Kiki",
      canSendRoomEmote: () => true,
      sendRoomEmote: vi.fn(),
    } as unknown as BCAdapter;
    const service = new LinkReactionsService(adapter, settings, () => true);
    const event = reactionEvent({ content: "URGENT\nplease look" });

    expect(service.react(event, 1_000)).toMatchObject({
      ruleId: "urgent-reina",
      action: "notice",
      message: "Reina #123: URGENT please look — sent a Beep",
    });
    expect(service.react(event, 20_000)).toBeUndefined();
    expect(service.react(event, 31_000)).toMatchObject({ ruleId: "urgent-reina" });
    expect(
      matchesRule(settings.get().linkReactions.rules[0]!, reactionEvent({ memberNumber: 456 })),
    ).toBe(false);
  });

  it("never copies private Beep content into a public room emote and rate-limits sending", () => {
    const sendRoomEmote = vi.fn();
    const settings = settingsWithRules([
      reactionRule({
        id: "public-welcome",
        label: "Public welcome",
        trigger: "room-join",
        action: "room-emote",
        template: "welcomes {name} after {message} in {room}.",
        cooldownSeconds: 0,
      }),
    ]);
    const adapter = {
      getOwnName: () => "Kiki",
      canSendRoomEmote: () => true,
      sendRoomEmote,
    } as unknown as BCAdapter;
    const service = new LinkReactionsService(adapter, settings, () => true);
    const event = reactionEvent({
      trigger: "room-join",
      content: "PRIVATE SECRET",
      roomName: "Moon Garden",
    });

    expect(service.react(event, 1_000)?.action).toBe("room-emote");
    expect(sendRoomEmote).toHaveBeenLastCalledWith("welcomes Reina after in Moon Garden.");
    expect(sendRoomEmote.mock.calls.flat().join(" ")).not.toContain("PRIVATE SECRET");
    expect(service.react(event, 1_000 + MIN_ROOM_REACTION_INTERVAL_MS - 1)).toBeUndefined();
    expect(service.react(event, 1_000 + MIN_ROOM_REACTION_INTERVAL_MS)?.action).toBe(
      "room-emote",
    );
    expect(sendRoomEmote).toHaveBeenCalledTimes(2);
  });

  it("uses the first enabled and eligible rule in editor order", () => {
    const settings = settingsWithRules([
      reactionRule({ id: "disabled", enabled: false, template: "disabled" }),
      reactionRule({ id: "friends", scope: "friends", template: "friend" }),
      reactionRule({ id: "fallback", template: "fallback for {name}" }),
    ]);
    const adapter = {
      getOwnName: () => "Kiki",
      canSendRoomEmote: () => false,
      sendRoomEmote: vi.fn(),
    } as unknown as BCAdapter;

    expect(
      new LinkReactionsService(adapter, settings, () => true).react(reactionEvent(), 1_000),
    ).toMatchObject({
      ruleId: "fallback",
      message: "fallback for Reina",
    });
  });

  it("rechecks the account boundary immediately before sending a room emote", () => {
    let currentAccount = true;
    const sendRoomEmote = vi.fn();
    const settings = settingsWithRules([
      reactionRule({ trigger: "room-join", action: "room-emote", template: "hello" }),
    ]);
    const adapter = {
      getOwnName: () => "Kiki",
      canSendRoomEmote: () => {
        currentAccount = false;
        return true;
      },
      sendRoomEmote,
    } as unknown as BCAdapter;

    const result = new LinkReactionsService(
      adapter,
      settings,
      () => currentAccount,
    ).react(reactionEvent({ trigger: "room-join" }), 1_000);

    expect(result).toBeUndefined();
    expect(sendRoomEmote).not.toHaveBeenCalled();
  });

  it("rechecks the account boundary before returning a notice action", () => {
    let currentAccount = true;
    const settings = settingsWithRules([reactionRule({ action: "notice" })]);
    const adapter = {
      getOwnName: () => {
        currentAccount = false;
        return "Kiki";
      },
      canSendRoomEmote: () => true,
      sendRoomEmote: vi.fn(),
    } as unknown as BCAdapter;

    expect(
      new LinkReactionsService(adapter, settings, () => currentAccount).react(
        reactionEvent(),
        1_000,
      ),
    ).toBeUndefined();
  });
});

function settingsWithRules(rules: ReactionRule[]): SettingsStore {
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  settings.update((draft) => {
    draft.linkReactions.enabled = true;
    draft.linkReactions.rules = rules;
  });
  return settings;
}

function reactionRule(overrides: Partial<ReactionRule> = {}): ReactionRule {
  return {
    id: "notice",
    label: "Notice",
    enabled: true,
    trigger: "beep-received",
    scope: "anyone",
    memberNumbers: [],
    textMatch: "",
    action: "notice",
    template: "{name} {event}.",
    cooldownSeconds: 0,
    ...overrides,
  };
}

function reactionEvent(overrides: Partial<LinkReactionEvent> = {}): LinkReactionEvent {
  return {
    trigger: "beep-received",
    memberNumber: 123,
    memberName: "Reina",
    isFriend: false,
    occurredAt: 1_000,
    content: "hello",
    ...overrides,
  };
}
