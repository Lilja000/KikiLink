// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import type { KikiLinkEvents } from "../src/core/types";

afterEach(() => {
  for (const key of [
    "Player",
    "ChatRoomData",
    "ChatRoomCharacter",
    "FriendListBeepLog",
    "ServerSendBeepMessage",
    "ChatRoomSendEmote",
    "CurrentScreen",
  ]) {
    Reflect.deleteProperty(globalThis, key);
  }
});

describe("BCAdapter", () => {
  it("sends through the native Beep function even before hook registration completes", () => {
    const nativeSend = vi.fn();
    globalThis.ServerSendBeepMessage = nativeSend;
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      Nickname: "Kiki",
      FriendNames: new Map([[123, "AccountReina"]]),
    };
    globalThis.ChatRoomData = { Name: "Moon Garden", Visibility: ["All"] };
    globalThis.ChatRoomCharacter = [
      { MemberNumber: 123, Name: "AccountReina", Nickname: "Reina" },
    ];

    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.3.1");
    const event = adapter.sendBeep(123, " Hello ", true);

    expect(nativeSend).toHaveBeenCalledWith(123, "Hello", { includeRoom: true });
    expect(event).toMatchObject({
      direction: "outgoing",
      peerName: "Reina",
      content: "Hello",
      roomName: "Moon Garden",
    });
  });

  it("uses room nicknames and exposes the native session Beep history", () => {
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map([[123, "AccountReina"]]),
    };
    globalThis.ChatRoomCharacter = [
      { MemberNumber: 123, Name: "AccountReina", Nickname: "Reina" },
    ];
    globalThis.FriendListBeepLog = [
      {
        MemberNumber: 123,
        MemberName: "AccountReina",
        Sent: false,
        Time: new Date(1000),
        Message: "Recent hello",
      },
    ];

    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.3.1");

    expect(adapter.getMemberName(123)).toBe("Reina");
    expect(adapter.getKnownContacts()).toContainEqual({ memberNumber: 123, memberName: "Reina" });
    expect(adapter.getRecentBeeps()).toMatchObject([
      { peerNumber: 123, peerName: "Reina", content: "Recent hello", sentAt: 1000 },
    ]);
  });

  it("lists room targets by nickname and sends through the native Emote path", () => {
    const nativeEmote = vi.fn();
    globalThis.CurrentScreen = "ChatRoom";
    globalThis.ChatRoomSendEmote = nativeEmote;
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      Nickname: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomCharacter = [
      { MemberNumber: 999, Name: "AccountKiki", Nickname: "Kiki" },
      { MemberNumber: 123, Name: "AccountReina", Nickname: "Reina" },
    ];

    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.4.0");

    expect(adapter.canSendRoomEmote()).toBe(true);
    expect(adapter.getRoomCharacters()).toEqual([
      { memberNumber: 123, memberName: "Reina" },
    ]);
    adapter.sendRoomEmote("  bows to Reina.  ");
    expect(nativeEmote).toHaveBeenCalledWith("bows to Reina.");
  });
});
