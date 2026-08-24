// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import type { KikiLinkEvents } from "../src/core/types";

afterEach(() => {
  vi.useRealTimers();
  for (const key of [
    "Player",
    "ChatRoomData",
    "ChatRoomCharacter",
    "FriendListBeepLog",
    "FriendListLoadFriendList",
    "ServerAccountBeep",
    "ServerAccountQueryResult",
    "ServerSocket",
    "ServerSendBeepMessage",
    "ChatRoomSendEmote",
    "ChatRoomSetTarget",
    "InformationSheetLoadCharacter",
    "ServerSend",
    "ServerIsLoggedIn",
    "ServerPlayerIsInChatRoom",
    "CurrentScreen",
  ]) {
    Reflect.deleteProperty(globalThis, key);
  }
  document.body.replaceChildren();
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
        Message:
          'Recent hello\n\n\uf124{"messageType":"Message","messageColor":"#ffffff"}',
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
      {
        memberNumber: 123,
        memberName: "Reina",
        accountName: "AccountReina",
        isFriend: false,
      },
    ]);
    adapter.sendRoomEmote("  bows to Reina.  ");
    expect(nativeEmote).toHaveBeenCalledWith("bows to Reina.");
  });

  it("opens native Whisper and profile actions for a current-room nickname", () => {
    const setTarget = vi.fn();
    const openProfile = vi.fn();
    globalThis.CurrentScreen = "ChatRoom";
    globalThis.ChatRoomData = { Name: "Moon Garden" };
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      Nickname: "Kiki",
      FriendNames: new Map([[123, "AccountReina"]]),
    };
    const reina = { MemberNumber: 123, Name: "AccountReina", Nickname: "Reina" };
    globalThis.ChatRoomCharacter = [globalThis.Player, reina];
    globalThis.ChatRoomSetTarget = setTarget;
    globalThis.InformationSheetLoadCharacter = openProfile;
    const input = document.createElement("textarea");
    input.id = "InputChat";
    document.body.append(input);

    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.5.0");
    expect(adapter.getCurrentRoomName()).toBe("Moon Garden");
    expect(adapter.getRoomCharacters()[0]).toMatchObject({
      memberName: "Reina",
      accountName: "AccountReina",
      isFriend: true,
    });

    adapter.startWhisper(123);
    expect(setTarget).toHaveBeenCalledWith(123);
    expect(document.activeElement).toBe(input);

    adapter.openProfile(123);
    expect(openProfile).toHaveBeenCalledWith(reina);
  });

  it("keeps the current room while a native room subscreen is open", () => {
    globalThis.CurrentScreen = "InformationSheet";
    globalThis.ServerPlayerIsInChatRoom = () => true;
    globalThis.ChatRoomData = { Name: "Moon Garden" };
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomCharacter = [globalThis.Player];

    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.13.0");

    expect(adapter.isInChatRoom()).toBe(true);
    expect(adapter.getCurrentRoomName()).toBe("Moon Garden");
  });

  it("uses hidden room packets for KikiLink peers and private typed Beeps elsewhere", () => {
    const serverSend = vi.fn();
    globalThis.ServerSend = serverSend;
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      Nickname: "Kiki",
      FriendNames: new Map([[123, "AccountReina"]]),
    };
    globalThis.CurrentScreen = "ChatRoom";
    globalThis.ChatRoomCharacter = [
      globalThis.Player,
      { MemberNumber: 123, Name: "AccountReina", Nickname: "Reina" },
    ];
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.11.0");

    expect(adapter.sendKikiLinkProtocol(123, '{"t":"pq","i":"one"}')).toBe("room");
    expect(serverSend).toHaveBeenLastCalledWith(
      "ChatRoomChat",
      expect.objectContaining({ Type: "Hidden", Target: 123 }),
    );

    globalThis.CurrentScreen = "FriendList";
    expect(adapter.sendKikiLinkProtocol(123, '{"t":"pq","i":"two"}')).toBe("beep");
    expect(serverSend).toHaveBeenLastCalledWith(
      "AccountBeep",
      expect.objectContaining({
        MemberNumber: 123,
        BeepType: "KikiLink",
        IsSecret: true,
      }),
    );
  });

  it("captures null-type incoming Beeps and native online friends before BC mutates them", async () => {
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      Nickname: "Kiki",
      FriendNames: new Map([[123, "AccountReina"]]),
      FriendList: [123],
    };
    globalThis.ServerIsLoggedIn = () => true;
    globalThis.ServerSendBeepMessage = vi.fn();
    globalThis.ServerSend = vi.fn();
    globalThis.ServerAccountBeep = vi.fn();
    globalThis.ServerAccountQueryResult = vi.fn();
    globalThis.FriendListLoadFriendList = vi.fn();

    const bus = new EventBus<KikiLinkEvents>();
    const incoming = vi.fn();
    bus.on("beep:received", incoming);
    const adapter = new BCAdapter(bus, "0.12.0");
    await adapter.start();

    globalThis.ServerAccountBeep({
      MemberNumber: 123,
      MemberName: "AccountReina",
      BeepType: null,
      Message:
        'A live incoming Beep\n\n\uf124{"messageType":"Message","messageColor":"#ffffff"}',
    });
    expect(incoming).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "incoming",
        peerNumber: 123,
        content: "A live incoming Beep",
      }),
    );

    globalThis.ServerAccountQueryResult({
      Query: "OnlineFriends",
      Result: [
        {
          Type: "Friend",
          MemberNumber: 123,
          MemberName: "AccountReina",
          MemberNickname: "Reina",
          ChatRoomName: "Moon Garden",
          ChatRoomSpace: "MainHall",
        },
      ],
    });
    expect(adapter.getOnlineFriends()).toEqual([
      {
        memberNumber: 123,
        memberName: "Reina",
        roomName: "Moon Garden",
        roomSpace: "MainHall",
        privateRoom: false,
      },
    ]);
    expect(adapter.isKnownFriend(123)).toBe(true);
    adapter.stop();
  });

  it("uses the live BC socket for incoming Beeps and OnlineFriends even when hooks are unavailable", async () => {
    vi.useFakeTimers();
    const listeners = new Map<string, Set<(data: unknown) => void>>();
    const socket = {
      connected: true,
      on: vi.fn((event: string, listener: (data: unknown) => void) => {
        const eventListeners = listeners.get(event) ?? new Set();
        eventListeners.add(listener);
        listeners.set(event, eventListeners);
      }),
      off: vi.fn((event: string, listener: (data: unknown) => void) => {
        listeners.get(event)?.delete(listener);
      }),
    };
    const emit = (event: string, data: unknown): void => {
      for (const listener of listeners.get(event) ?? []) listener(data);
    };
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      Nickname: "Kiki",
      FriendNames: new Map([[123, "AccountReina"]]),
      FriendList: [123],
    };
    globalThis.ServerIsLoggedIn = () => false;
    globalThis.ServerSendBeepMessage = vi.fn();
    globalThis.ServerSend = vi.fn();
    globalThis.ServerSocket = socket as unknown as BCServerSocket;
    globalThis.FriendListBeepLog = [];

    const bus = new EventBus<KikiLinkEvents>();
    const incoming = vi.fn();
    const online = vi.fn();
    bus.on("beep:received", incoming);
    bus.on("bc:online-friends", online);
    const adapter = new BCAdapter(bus, "0.13.0");
    await adapter.start();

    expect(adapter.isReady()).toBe(true);
    emit("AccountQueryResult", {
      Query: "OnlineFriends",
      Result: [
        {
          Type: "Friend",
          MemberNumber: 123,
          MemberName: "AccountReina",
          MemberNickname: "Reina",
        },
      ],
    });
    expect(adapter.getOnlineFriends()).toMatchObject([
      { memberNumber: 123, memberName: "Reina" },
    ]);
    expect(online).toHaveBeenCalledOnce();

    emit("AccountBeep", {
      MemberNumber: 123,
      MemberName: "AccountReina",
      BeepType: null,
      Message: "Captured from the live socket",
    });
    expect(incoming).toHaveBeenCalledWith(
      expect.objectContaining({
        peerNumber: 123,
        content: "Captured from the live socket",
      }),
    );

    const replacementListeners = new Map<string, Set<(data: unknown) => void>>();
    const replacementSocket = {
      connected: true,
      on: vi.fn((event: string, listener: (data: unknown) => void) => {
        const eventListeners = replacementListeners.get(event) ?? new Set();
        eventListeners.add(listener);
        replacementListeners.set(event, eventListeners);
      }),
      off: vi.fn((event: string, listener: (data: unknown) => void) => {
        replacementListeners.get(event)?.delete(listener);
      }),
    };
    globalThis.ServerSocket = replacementSocket as unknown as BCServerSocket;
    vi.advanceTimersByTime(2_001);
    expect(socket.off).toHaveBeenCalledTimes(2);
    for (const listener of replacementListeners.get("AccountBeep") ?? []) {
      listener({
        MemberNumber: 123,
        MemberName: "AccountReina",
        BeepType: null,
        Message: "Captured after reconnect",
      });
    }
    expect(incoming).toHaveBeenCalledTimes(2);

    adapter.stop();
    expect(replacementSocket.off).toHaveBeenCalledTimes(2);
  });

  it("recovers incoming Beeps from the native Beep log without duplicating a socket event", async () => {
    vi.useFakeTimers();
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map([[123, "AccountReina"]]),
      FriendList: [123],
    };
    globalThis.ServerSendBeepMessage = vi.fn();
    globalThis.ServerSend = vi.fn();
    globalThis.ServerAccountBeep = vi.fn();
    globalThis.FriendListBeepLog = [];

    const bus = new EventBus<KikiLinkEvents>();
    const incoming = vi.fn();
    bus.on("beep:received", incoming);
    const adapter = new BCAdapter(bus, "0.13.0");
    await adapter.start();

    const first = {
      MemberNumber: 123,
      MemberName: "AccountReina",
      Sent: false,
      Time: new Date(),
      Message: "Recovered from the native log",
    };
    globalThis.FriendListBeepLog.push(first);
    vi.advanceTimersByTime(1_001);
    expect(incoming).toHaveBeenCalledOnce();
    expect(incoming).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: "Recovered from the native log" }),
    );

    const duplicatePayload = {
      MemberNumber: 123,
      MemberName: "AccountReina",
      BeepType: null,
      Message: 'Only once\n\n\uf124{"messageType":"Message","messageColor":"#ffffff"}',
    };
    globalThis.ServerAccountBeep?.(duplicatePayload);
    globalThis.FriendListBeepLog.push({
      MemberNumber: 123,
      MemberName: "AccountReina",
      Sent: false,
      Time: new Date(),
      Message: 'Only once\n\n\uf124{"messageType":"Message","messageColor":"#ffffff"}',
    });
    vi.advanceTimersByTime(1_001);
    expect(incoming).toHaveBeenCalledTimes(2);

    adapter.stop();
    vi.useRealTimers();
  });
});
