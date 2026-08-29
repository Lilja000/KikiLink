// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import bcModSDK from "bondage-club-mod-sdk";
import { BCAdapter, type BCCustomActivityIntegration } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import type { KikiLinkEvents } from "../src/core/types";

afterEach(() => {
  vi.useRealTimers();
  for (const key of [
    "alert",
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
    "ChatRoomMessage",
    "ActivityDictionaryText",
    "ActivityAllowedForGroup",
    "DialogBuildActivities",
    "DialogActivity",
    "DialogMenuMapping",
    "DialogMenuMode",
    "ActivityRun",
    "PreferenceGetActivityFactor",
    "ElementButton",
    "ChatRoomDrawCharacterStatusIcons",
    "ChatRoomCharacterViewDrawOverlay",
    "ChatRoomHideIconState",
    "ChatRoomSetTarget",
    "InformationSheetLoadCharacter",
    "ServerSend",
    "ServerRoomSearch",
    "ServerRoomJoin",
    "ChatRoomCanLeave",
    "ChatRoomIsLeavingSlowly",
    "ChatRoomAttemptLeave",
    "ChatSearchJoin",
    "ServerIsLoggedIn",
    "ServerPlayerIsInChatRoom",
    "ChatRoomPlayerIsAdmin",
    "ChatRoomGetSettings",
    "CurrentScreen",
    "CurrentTime",
    "MainCanvas",
    "unsafeWindow",
  ]) {
    Reflect.deleteProperty(globalThis, key);
    Reflect.deleteProperty(window, key);
  }
  document.body.replaceChildren();
});

describe("BCAdapter", () => {
  it("fails closed instead of throwing when Firefox revokes the local player proxy", () => {
    const guardedPlayer = Proxy.revocable<BCPlayer>({
      MemberNumber: 999,
      Name: "AccountKiki",
      Nickname: "Kiki",
      FriendNames: new Map(),
    }, {});
    globalThis.Player = guardedPlayer.proxy;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    expect(adapter.getOwnMemberNumber()).toBe(999);
    expect(adapter.getOwnName()).toBe("Kiki");
    guardedPlayer.revoke();
    expect(() => adapter.getOwnMemberNumber()).not.toThrow();
    expect(adapter.getOwnMemberNumber()).toBe(-1);
    expect(adapter.getOwnName()).toBe("me");
  });

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

  it("captures direct AccountBeep sends from other messenger addons exactly once", async () => {
    const nativeServerSend = vi.fn();
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      Nickname: "Kiki",
      FriendNames: new Map([[123, "AccountReina"]]),
    };
    globalThis.ServerIsLoggedIn = () => true;
    globalThis.ServerSend = nativeServerSend;
    globalThis.FriendListBeepLog = [];
    globalThis.ServerSendBeepMessage = (target, message, options) => {
      ServerSend("AccountBeep", {
        MemberNumber: target,
        BeepType: "",
        IsSecret: !options?.includeRoom,
        Message: message,
      });
      FriendListBeepLog.push({
        MemberNumber: target,
        MemberName: "AccountReina",
        Sent: true,
        Time: new Date(),
        ...(message !== undefined ? { Message: message } : {}),
      });
    };

    const bus = new EventBus<KikiLinkEvents>();
    const sent = vi.fn();
    bus.on("beep:sent", sent);
    const adapter = new BCAdapter(bus, "0.20.9");
    await adapter.start();

    // LianChat uses this low-level path instead of ServerSendBeepMessage.
    ServerSend("AccountBeep", {
      MemberNumber: 123,
      BeepType: "",
      IsSecret: true,
      Message: "Sent through LianChat",
    });
    expect(sent).toHaveBeenCalledOnce();
    expect(sent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        direction: "outgoing",
        peerNumber: 123,
        content: "Sent through LianChat",
        includeRoom: false,
      }),
    );

    // Two intentional identical sends still count as two messages.
    ServerSend("AccountBeep", {
      MemberNumber: 123,
      BeepType: "",
      IsSecret: true,
      Message: "Sent through LianChat",
    });
    expect(sent).toHaveBeenCalledTimes(2);

    // The native wrapper also reaches ServerSend, but must not create a second copy.
    ServerSendBeepMessage(123, "Sent through native Beep", { includeRoom: false });
    expect(sent).toHaveBeenCalledTimes(3);

    // LinkChat persists its returned event itself, so its own send stays off the event bus.
    adapter.sendBeep(123, "Sent through KikiLink", false);
    expect(sent).toHaveBeenCalledTimes(3);
    adapter.stop();
  });

  it("reads account relationship labels from the current BC player", () => {
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map(),
      WhiteList: [123],
      BlackList: [456],
      GhostList: [789],
      Ownership: { MemberNumber: 123, Name: "Reina", Stage: 1 },
      Lovership: [
        { MemberNumber: 123, Name: "Reina", Stage: 2 },
        { MemberNumber: 321, Name: "Mina", Stage: 1 },
      ],
    };
    globalThis.ChatRoomCharacter = [
      {
        MemberNumber: 654,
        Name: "AccountSub",
        Ownership: { MemberNumber: 999, Name: "AccountKiki", Stage: 1 },
      },
    ];

    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.20.9");
    expect(adapter.getPlayerRelationships(123)).toEqual(["owner", "lover", "whitelist"]);
    expect(adapter.getPlayerRelationships(321)).toEqual(["lover"]);
    expect(adapter.getPlayerRelationships(456)).toEqual(["blacklist"]);
    expect(adapter.getPlayerRelationships(789)).toEqual(["ghosted"]);
    expect(adapter.getPlayerRelationships(654)).toEqual(["sub"]);
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

  it("skips an inaccessible recent Beep without losing later startup history", () => {
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map([[123, "AccountReina"]]),
    };
    const guarded = Proxy.revocable<BCFriendListBeepLogMessage>({
      MemberNumber: 555,
      MemberName: "Guarded",
      Sent: false,
      Time: new Date(10),
      Message: "Unreadable",
    }, {});
    guarded.revoke();
    globalThis.FriendListBeepLog = [
      guarded.proxy,
      {
        MemberNumber: 123,
        MemberName: "AccountReina",
        Sent: false,
        Time: new Date(20),
        Message: "Still imported",
      },
    ];
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    try {
      expect(adapter.getRecentBeeps()).toMatchObject([
        {
          direction: "incoming",
          peerNumber: 123,
          peerName: "AccountReina",
          content: "Still imported",
          sentAt: 20,
        },
      ]);
      expect(warning).toHaveBeenCalledWith(
        expect.stringContaining("recent native Beep log entry"),
        expect.any(Error),
      );
    } finally {
      warning.mockRestore();
    }
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

  it("uses native room-admin packets for media, roles, whitelist, and kick", () => {
    const send = vi.fn();
    globalThis.CurrentScreen = "ChatRoom";
    globalThis.Player = {
      ID: 0,
      MemberNumber: 999,
      Name: "AccountKiki",
      Nickname: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = {
      Name: "Moon Garden",
      Admin: [999],
      Whitelist: [123],
      Custom: {
        ImageURL: "https://litter.catbox.moe/old.webp",
        MusicURL: "https://cdn.example/old.mp3",
        SizeMode: 1,
      },
    };
    globalThis.ChatRoomCharacter = [
      { MemberNumber: 999, Name: "AccountKiki", Nickname: "Kiki" },
      { MemberNumber: 123, Name: "AccountReina", Nickname: "Reina" },
    ];
    globalThis.ChatRoomPlayerIsAdmin = () => true;
    globalThis.CurrentTime = 123_456;
    globalThis.ChatRoomGetSettings = (room) => structuredClone(room);
    globalThis.ServerSend = send;

    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.21.0");
    expect(adapter.getRoomAdminSnapshot()).toMatchObject({
      roomName: "Moon Garden",
      isAdmin: true,
      players: [{ memberNumber: 123, admin: false, whitelisted: true }],
    });

    adapter.updateRoomCustomization({
      imageUrl: "https://litter.catbox.moe/new.webp",
      musicUrl: "https://cdn.example/new.mp3",
      sizeMode: 2,
      musicSync: true,
    });
    expect(send).toHaveBeenCalledWith(
      "ChatRoomAdmin",
      expect.objectContaining({
        MemberNumber: 0,
        Action: "Update",
        Room: expect.objectContaining({
          Custom: expect.objectContaining({
            ImageURL: "https://litter.catbox.moe/new.webp",
            MusicURL: "https://cdn.example/new.mp3",
            SizeMode: 2,
            MusicStart: 123_456,
          }),
        }),
      }),
    );
    adapter.runRoomMemberAction(123, "promote");
    adapter.runRoomMemberAction(123, "unwhitelist");
    adapter.runRoomMemberAction(123, "kick");
    expect(send).toHaveBeenCalledWith("ChatRoomAdmin", { MemberNumber: 123, Action: "Promote" });
    expect(send).toHaveBeenCalledWith("ChatRoomAdmin", { MemberNumber: 123, Action: "Unwhitelist" });
    expect(send).toHaveBeenCalledWith("ChatRoomAdmin", {
      MemberNumber: 123,
      Action: "Kick",
      Publish: true,
    });
  });

  it("captures and applies bounded room presets while preserving the current admin", () => {
    const send = vi.fn();
    globalThis.CurrentScreen = "ChatRoom";
    globalThis.Player = {
      ID: 0,
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = {
      Name: "Old room",
      Description: "Old",
      Admin: [999],
      Whitelist: [],
      Ban: [],
      Limit: 10,
      Custom: {},
    };
    globalThis.ChatRoomCharacter = [globalThis.Player];
    globalThis.ChatRoomPlayerIsAdmin = () => true;
    globalThis.ChatRoomGetSettings = (room) => structuredClone(room);
    globalThis.ServerSend = send;
    globalThis.CurrentTime = 321;

    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.22.0");
    expect(adapter.getRoomAdminSnapshot()?.settings).toMatchObject({
      name: "Old room",
      admins: [999],
      blacklist: [],
    });
    adapter.applyRoomPreset({
      name: "Moon Garden",
      description: "Quiet",
      background: "Boudoir",
      limit: 8,
      game: "",
      space: "X",
      language: "EN",
      visibility: ["All"],
      access: ["All"],
      blockCategory: ["Extreme"],
      admins: [123],
      whitelist: [456],
      blacklist: [789],
      custom: {
        imageUrl: "https://litter.catbox.moe/moon.webp",
        imageFilter: "",
        musicUrl: "https://litter.catbox.moe/song.mp3",
        sizeMode: 2,
        musicSync: true,
      },
    });
    expect(send).toHaveBeenCalledWith("ChatRoomAdmin", expect.objectContaining({
      MemberNumber: 0,
      Action: "Update",
      Room: expect.objectContaining({
        Name: "Moon Garden",
        Admin: [999, 123],
        Whitelist: [456],
        Ban: [789],
        Custom: expect.objectContaining({ MusicStart: 321, SizeMode: 2 }),
      }),
    }));
  });

  it("reads the native lobby directory and sorts rooms containing friends first", async () => {
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = { Space: "X" };
    const roomSearch = vi.fn(async (_query: string, _request: BCServerRoomSearchRequest) => ({
      value: [
        {
          Name: "Open room",
          Language: "EN",
          MapType: "map",
          MemberCount: 2,
          MemberLimit: 10,
          Description: "Public",
          Friends: [],
          CanJoin: true,
        },
        {
          Name: "Friends room",
          Language: "EN",
          MemberCount: 5,
          MemberLimit: 10,
          Description: "Known people",
          Friends: [{
            Type: "Friend",
            MemberNumber: 123,
            MemberName: "AccountReina",
            MemberNickname: "Reina",
          }],
          CanJoin: true,
        },
      ],
    }));
    globalThis.ServerRoomSearch = roomSearch as unknown as typeof ServerRoomSearch;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.22.0");

    const rooms = await adapter.searchRooms("moon");

    expect(roomSearch).toHaveBeenCalledWith("MOON", expect.objectContaining({
      Query: "MOON",
      Space: "X",
      Game: "",
      FullRooms: true,
      ShowLocked: true,
    }));
    expect(rooms.map((room) => room.name)).toEqual(["Friends room", "Open room"]);
    expect(rooms[0]?.friends).toEqual([{ memberNumber: 123, memberName: "Reina" }]);
    expect(rooms[1]?.mapType).toBe("Always");
  });

  it("normalizes the current room for the lobby and fails closed for guarded room data", () => {
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      Nickname: "Kiki",
      FriendNames: new Map([[123, "AccountReina"]]),
      FriendList: [123],
    };
    globalThis.ChatRoomData = {
      Name: "  Moon Garden  ",
      Description: "\u0000Quiet\troom\n",
      Language: "  EN  ",
      Limit: 0,
      Visibility: ["Invite"],
      Access: [],
      MapData: { Type: "grid" },
    };
    globalThis.ChatRoomCharacter = [
      globalThis.Player,
      { MemberNumber: 123, Name: "AccountReina", Nickname: "  Reina  " },
      { MemberNumber: 456, Name: "AccountMina", Nickname: "Mina" },
    ];
    globalThis.ServerPlayerIsInChatRoom = () => true;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    expect(adapter.getCurrentLobbyRoom()).toEqual({
      name: "Moon Garden",
      description: "Quiet room",
      language: "EN",
      memberCount: 3,
      memberLimit: 3,
      canJoin: true,
      locked: false,
      privateRoom: true,
      mapType: "Always",
      friends: [{ memberNumber: 123, memberName: "Reina" }],
    });

    globalThis.ChatRoomData.Visibility = ["All"];
    globalThis.ChatRoomData.Access = ["All"];
    expect(adapter.getCurrentLobbyRoom()).toMatchObject({
      locked: false,
      privateRoom: false,
    });

    const guardedRoom = Proxy.revocable<BCChatRoomData>({ Name: "Hidden room" }, {});
    globalThis.ChatRoomData = guardedRoom.proxy;
    guardedRoom.revoke();
    let summary: ReturnType<BCAdapter["getCurrentLobbyRoom"]>;
    expect(() => {
      summary = adapter.getCurrentLobbyRoom();
    }).not.toThrow();
    expect(summary!).toBeUndefined();
  });

  it("treats a normalized current-room join as a no-op", async () => {
    const serverSend = vi.fn();
    const canLeave = vi.fn(() => true);
    const attemptLeave = vi.fn();
    const serverRoomJoin = vi.fn();
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = { Name: "Moon   Garden" };
    globalThis.ChatRoomCharacter = [globalThis.Player];
    globalThis.ServerSend = serverSend;
    globalThis.ServerPlayerIsInChatRoom = () => true;
    globalThis.ChatRoomCanLeave = canLeave;
    globalThis.ChatRoomAttemptLeave = attemptLeave;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    await adapter.joinRoom("  moon garden  ");

    expect(canLeave).not.toHaveBeenCalled();
    expect(attemptLeave).not.toHaveBeenCalled();
    expect(serverRoomJoin).not.toHaveBeenCalled();
    expect(serverSend).not.toHaveBeenCalled();
  });

  it("falls back safely when a patched native room observation throws during a join", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.CurrentScreen = "ChatSearch";
    globalThis.ChatRoomData = null;
    globalThis.ChatRoomCharacter = [];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => {
      throw new Error("Permission denied to access object");
    };
    globalThis.ServerRoomJoin = vi.fn(async (roomName: string) => {
      globalThis.CurrentScreen = "ChatRoom";
      globalThis.ChatRoomData = { Name: roomName };
      return { ok: true, value: roomName, error: null, err: false };
    });
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    try {
      expect(() => adapter.isInChatRoom()).not.toThrow();
      expect(adapter.isInChatRoom()).toBe(false);
      await expect(adapter.joinRoom("Golden Den")).resolves.toBeUndefined();

      expect(adapter.isInChatRoom()).toBe(true);
      expect(adapter.getCurrentRoomName()).toBe("Golden Den");
      expect(warning).toHaveBeenCalledTimes(1);
    } finally {
      warning.mockRestore();
    }
  });

  it("does not start a join when Bondage Club prevents leaving", async () => {
    const attemptLeave = vi.fn();
    const serverRoomJoin = vi.fn();
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = { Name: "Moon Garden" };
    globalThis.ChatRoomCharacter = [globalThis.Player];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => true;
    globalThis.ChatRoomCanLeave = () => false;
    globalThis.ChatRoomAttemptLeave = attemptLeave;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    await expect(adapter.joinRoom("Golden Den")).rejects.toThrow(
      "Bondage Club currently prevents you from leaving this room",
    );

    expect(attemptLeave).not.toHaveBeenCalled();
    expect(serverRoomJoin).not.toHaveBeenCalled();
  });

  it("deduplicates only the same concurrent target and rejects a different target", async () => {
    vi.useFakeTimers();
    const order: string[] = [];
    let inRoom = true;
    const attemptLeave = vi.fn(() => {
      order.push("attempt-leave");
    });
    const serverRoomJoin = vi.fn(async (roomName: string) => {
      order.push("server-join");
      expect(inRoom).toBe(false);
      expect(globalThis.ChatRoomData).toBeNull();
      globalThis.ChatRoomData = { Name: roomName };
      inRoom = true;
      return { ok: true, value: roomName };
    });
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = { Name: "Moon Garden" };
    globalThis.ChatRoomCharacter = [globalThis.Player];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => inRoom;
    globalThis.ChatRoomCanLeave = () => true;
    globalThis.ChatRoomAttemptLeave = attemptLeave;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    const first = adapter.joinRoom("Golden Den");
    const second = adapter.joinRoom("  golden   den  ");

    expect(second).toBe(first);
    expect(attemptLeave).toHaveBeenCalledOnce();
    expect(serverRoomJoin).not.toHaveBeenCalled();
    await expect(adapter.joinRoom("Rose Hall")).rejects.toThrow(
      "Already joining another room",
    );
    await expect(adapter.joinRoom("Moon Garden")).rejects.toThrow(
      "Already joining another room",
    );
    expect(serverRoomJoin).not.toHaveBeenCalled();

    globalThis.ChatRoomData = null;
    inRoom = false;
    await vi.advanceTimersByTimeAsync(100);
    await Promise.all([first, second]);

    expect(attemptLeave).toHaveBeenCalledOnce();
    expect(serverRoomJoin).toHaveBeenCalledOnce();
    expect(serverRoomJoin).toHaveBeenCalledWith("Golden Den");
    expect(order).toEqual(["attempt-leave", "server-join"]);
  });

  it("waits for stale ChatRoomData to clear even after BC reports no active room", async () => {
    vi.useFakeTimers();
    let inRoom = false;
    const serverRoomJoin = vi.fn(async (roomName: string) => {
      expect(globalThis.ChatRoomData).toBeNull();
      globalThis.ChatRoomData = { Name: roomName };
      inRoom = true;
      return { ok: true, value: roomName, error: null, err: false };
    });
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = { Name: "Previous room" };
    globalThis.ChatRoomCharacter = [];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => inRoom;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    const joining = adapter.joinRoom("Golden Den");
    await vi.advanceTimersByTimeAsync(500);
    expect(serverRoomJoin).not.toHaveBeenCalled();

    globalThis.ChatRoomData = null;
    await vi.advanceTimersByTimeAsync(100);
    await joining;

    expect(serverRoomJoin).toHaveBeenCalledOnce();
    expect(serverRoomJoin).toHaveBeenCalledWith("Golden Den");
  });

  it("waits for an existing native slow leave without cancelling it", async () => {
    vi.useFakeTimers();
    let inRoom = true;
    let leavingSlowly = true;
    const attemptLeave = vi.fn();
    const serverRoomJoin = vi.fn(async (roomName: string) => {
      globalThis.ChatRoomData = { Name: roomName };
      inRoom = true;
      return { ok: true, value: roomName, error: null, err: false };
    });
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = { Name: "Moon Garden" };
    globalThis.ChatRoomCharacter = [globalThis.Player];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => inRoom;
    globalThis.ChatRoomIsLeavingSlowly = () => leavingSlowly;
    globalThis.ChatRoomCanLeave = () => false;
    globalThis.ChatRoomAttemptLeave = attemptLeave;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    const joining = adapter.joinRoom("Golden Den");
    expect(attemptLeave).not.toHaveBeenCalled();
    expect(serverRoomJoin).not.toHaveBeenCalled();

    leavingSlowly = false;
    inRoom = false;
    globalThis.ChatRoomData = null;
    await vi.advanceTimersByTimeAsync(100);
    await joining;

    expect(attemptLeave).not.toHaveBeenCalled();
    expect(serverRoomJoin).toHaveBeenCalledOnce();
  });

  it("cancels a pending room transition when the adapter stops", async () => {
    const attemptLeave = vi.fn();
    const serverRoomJoin = vi.fn();
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = { Name: "Moon Garden" };
    globalThis.ChatRoomCharacter = [globalThis.Player];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => true;
    globalThis.ChatRoomCanLeave = () => true;
    globalThis.ChatRoomAttemptLeave = attemptLeave;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    const joining = adapter.joinRoom("Golden Den");
    adapter.stop();

    await expect(joining).rejects.toThrow("Room join was cancelled");
    expect(attemptLeave).toHaveBeenCalledOnce();
    expect(serverRoomJoin).not.toHaveBeenCalled();
  });

  it("cancels a pending native join response on stop and consumes its late rejection", async () => {
    let rejectNative: ((reason?: unknown) => void) | undefined;
    const serverRoomJoin = vi.fn(
      () => new Promise<BCServerResult<string>>((_resolve, reject) => {
        rejectNative = reject;
      }),
    );
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = null;
    globalThis.ChatRoomCharacter = [];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => false;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    const joining = adapter.joinRoom("Golden Den");
    const failure = expect(joining).rejects.toThrow("Room join was cancelled");
    await vi.waitFor(() => expect(serverRoomJoin).toHaveBeenCalledOnce());
    adapter.stop();
    await failure;

    rejectNative?.(new Error("Late native wrapper failure"));
    await Promise.resolve();
    await Promise.resolve();
  });

  it("surfaces native join failures without reporting a successful room sync", async () => {
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = null;
    globalThis.ChatRoomCharacter = [];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => false;
    globalThis.ServerRoomJoin = vi.fn(async () => ({
      ok: false,
      error: { name: "RoomFull" },
    }));
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    await expect(adapter.joinRoom("Golden Den")).rejects.toThrow("That room is full");
  });

  it("waits for the selected room's actual sync after the join response succeeds", async () => {
    vi.useFakeTimers();
    let inRoom = false;
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = null;
    globalThis.ChatRoomCharacter = [];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => inRoom;
    globalThis.ServerRoomJoin = vi.fn(async (roomName: string) => ({
      ok: true,
      value: roomName,
    }));
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");
    let settled = false;

    const joining = adapter.joinRoom("Golden Den").then(() => {
      settled = true;
    });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(500);
    expect(settled).toBe(false);

    globalThis.ChatRoomData = { Name: "Golden Den" };
    inRoom = true;
    await vi.advanceTimersByTimeAsync(100);
    await joining;

    expect(settled).toBe(true);
  });

  it("accepts Bondage Club's native successful Result shape", async () => {
    let inRoom = false;
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = null;
    globalThis.ChatRoomCharacter = [];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => inRoom;
    globalThis.ServerRoomJoin = vi.fn(async (roomName: string) => {
      globalThis.ChatRoomData = { Name: roomName };
      inRoom = true;
      return {
        ok: true,
        value: roomName,
        error: null,
        get err() {
          return false;
        },
      };
    });
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    await expect(adapter.joinRoom("Golden Den")).resolves.toBeUndefined();

    expect(globalThis.ServerRoomJoin).toHaveBeenCalledOnce();
    expect(adapter.getCurrentRoomName()).toBe("Golden Den");
  });

  it("bounds an unresolved native join response and keeps the exact-sync quarantine", async () => {
    vi.useFakeTimers();
    let inRoom = false;
    let rejectNative: ((reason?: unknown) => void) | undefined;
    const serverRoomJoin = vi.fn(
      () => new Promise<BCServerResult<string>>((_resolve, reject) => {
        rejectNative = reject;
      }),
    );
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = null;
    globalThis.ChatRoomCharacter = [];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => inRoom;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    const firstJoin = adapter.joinRoom("Golden Den");
    const firstFailure = expect(firstJoin).rejects.toThrow(
      "Bondage Club timed out while joining that room",
    );
    await vi.advanceTimersByTimeAsync(8_000);
    await firstFailure;

    await expect(adapter.joinRoom("Rose Hall")).rejects.toThrow(
      "still finishing the previous room join",
    );
    const originalTarget = adapter.joinRoom("Golden Den");
    expect(serverRoomJoin).toHaveBeenCalledOnce();

    globalThis.ChatRoomData = { Name: "Golden Den" };
    inRoom = true;
    await vi.advanceTimersByTimeAsync(100);
    await expect(originalTarget).resolves.toBeUndefined();

    // The abandoned native promise can still reject after the exact sync. Its rejection is
    // observed by the bounded waiter and must not surface as an unhandled test/runtime error.
    rejectNative?.(new Error("Late native wrapper failure"));
    await Promise.resolve();
    await Promise.resolve();
  });

  it("releases an unresolved native response after the documented 8s plus 7s bound", async () => {
    vi.useFakeTimers();
    let inRoom = false;
    let rejectOriginal: ((reason?: unknown) => void) | undefined;
    const serverRoomJoin = vi.fn((roomName: string) => {
      if (roomName === "Golden Den") {
        return new Promise<BCServerResult<string>>((_resolve, reject) => {
          rejectOriginal = reject;
        });
      }
      globalThis.ChatRoomData = { Name: roomName };
      inRoom = true;
      return Promise.resolve({ ok: true, value: roomName, error: null, err: false });
    });
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = null;
    globalThis.ChatRoomCharacter = [];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => inRoom;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    const firstJoin = adapter.joinRoom("Golden Den");
    const firstFailure = expect(firstJoin).rejects.toThrow(
      "Bondage Club timed out while joining that room",
    );
    await vi.advanceTimersByTimeAsync(8_000);
    await firstFailure;

    await vi.advanceTimersByTimeAsync(6_900);
    await expect(adapter.joinRoom("Rose Hall")).rejects.toThrow(
      "still finishing the previous room join",
    );
    await vi.advanceTimersByTimeAsync(100);
    await expect(adapter.joinRoom("Rose Hall")).resolves.toBeUndefined();

    expect(serverRoomJoin.mock.calls.map(([roomName]) => roomName)).toEqual([
      "Golden Den",
      "Rose Hall",
    ]);
    rejectOriginal?.(new Error("Original wrapper rejected after the full 15s bound"));
    await Promise.resolve();
    await Promise.resolve();
  });

  it("quarantines a timed-out native join before allowing a different target", async () => {
    vi.useFakeTimers();
    let inRoom = false;
    const serverRoomJoin = vi.fn(async (roomName: string) => {
      if (roomName === "Golden Den") {
        // Prove that the 8s public timeout plus 7s quarantine starts after BC's successful
        // native response, rather than when the user first clicked Join.
        await new Promise<void>((resolve) => setTimeout(resolve, 2_000));
      }
      if (roomName === "Rose Hall") {
        globalThis.ChatRoomData = { Name: roomName };
        inRoom = true;
      }
      return { ok: true, value: roomName, error: null, err: false };
    });
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = null;
    globalThis.ChatRoomCharacter = [];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => inRoom;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    const firstJoin = adapter.joinRoom("Golden Den");
    const firstFailure = expect(firstJoin).rejects.toThrow(
      "Bondage Club did not finish loading “Golden Den”",
    );
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(8_000);
    await firstFailure;

    await expect(adapter.joinRoom("Rose Hall")).rejects.toThrow(
      "still finishing the previous room join",
    );
    expect(serverRoomJoin).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(6_900);
    await expect(adapter.joinRoom("Rose Hall")).rejects.toThrow(
      "still finishing the previous room join",
    );
    expect(serverRoomJoin).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    await expect(adapter.joinRoom("Rose Hall")).resolves.toBeUndefined();

    expect(serverRoomJoin.mock.calls.map(([roomName]) => roomName)).toEqual([
      "Golden Den",
      "Rose Hall",
    ]);
  });

  it("releases the post-timeout quarantine when the original room sync arrives late", async () => {
    vi.useFakeTimers();
    let inRoom = false;
    const serverRoomJoin = vi.fn(async (roomName: string) => {
      if (roomName === "Rose Hall") {
        globalThis.ChatRoomData = { Name: roomName };
        inRoom = true;
      }
      return { ok: true, value: roomName, error: null, err: false };
    });
    globalThis.Player = {
      MemberNumber: 999,
      Name: "Kiki",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomData = null;
    globalThis.ChatRoomCharacter = [];
    globalThis.ServerSend = vi.fn();
    globalThis.ServerPlayerIsInChatRoom = () => inRoom;
    globalThis.ServerRoomJoin = serverRoomJoin;
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    const firstJoin = adapter.joinRoom("Golden Den");
    const firstFailure = expect(firstJoin).rejects.toThrow(
      "Bondage Club did not finish loading “Golden Den”",
    );
    await vi.advanceTimersByTimeAsync(8_000);
    await firstFailure;

    await vi.advanceTimersByTimeAsync(2_000);
    globalThis.ChatRoomData = { Name: "Golden Den" };
    inRoom = true;
    await vi.advanceTimersByTimeAsync(100);

    // Simulate leaving the late-arriving target before choosing another room. The important part
    // is that no stale first-operation guard survives the observed exact sync.
    globalThis.ChatRoomData = null;
    inRoom = false;
    await expect(adapter.joinRoom("Rose Hall")).resolves.toBeUndefined();

    expect(serverRoomJoin.mock.calls.map(([roomName]) => roomName)).toEqual([
      "Golden Den",
      "Rose Hall",
    ]);
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
        {
          Type: "Submissive",
          MemberNumber: 321,
          MemberName: "AccountMina",
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
      {
        memberNumber: 321,
        memberName: "AccountMina",
        privateRoom: false,
        relationship: "sub",
      },
    ]);
    expect(adapter.getPlayerRelationships(321)).toContain("sub");
    expect(adapter.isKnownFriend(123)).toBe(true);
    adapter.stop();
  });

  it("returns a defensive clone for an individual online friend", async () => {
    let onlineFriendsListener: ((data: unknown) => void) | undefined;
    const socket = {
      connected: true,
      on: vi.fn((event: string, listener: (data: unknown) => void) => {
        if (event === "AccountQueryResult") onlineFriendsListener = listener;
      }),
      off: vi.fn(),
    };
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map([[123, "AccountReina"]]),
      FriendList: [123],
    };
    globalThis.ServerSocket = socket as unknown as BCServerSocket;
    globalThis.ServerSendBeepMessage = vi.fn();
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    try {
      await adapter.start();
      if (!onlineFriendsListener) throw new Error("Expected the online-friends listener to be installed");
      onlineFriendsListener({
        Query: "OnlineFriends",
        Result: [{
          Type: "Friend",
          MemberNumber: 123,
          MemberName: "AccountReina",
          MemberNickname: "Reina",
          ChatRoomName: "Moon Garden",
          ChatRoomSpace: "MainHall",
        }],
      });

      const returned = adapter.getOnlineFriend(123);
      expect(returned).toEqual({
        memberNumber: 123,
        memberName: "Reina",
        roomName: "Moon Garden",
        roomSpace: "MainHall",
        privateRoom: false,
      });
      if (!returned) throw new Error("Expected the online friend to be available");
      returned.memberName = "Mutated outside the adapter";
      returned.roomName = "Different room";
      returned.privateRoom = true;

      expect(adapter.getOnlineFriend(123)).toEqual({
        memberNumber: 123,
        memberName: "Reina",
        roomName: "Moon Garden",
        roomSpace: "MainHall",
        privateRoom: false,
      });
      expect(adapter.getOnlineFriend(456)).toBeUndefined();
    } finally {
      adapter.stop();
    }
  });

  it("lets native hooks and socket dispatch continue for inaccessible cross-compartment payloads", async () => {
    type CapturedHook = (
      args: any[],
      next: (args: any[]) => unknown,
    ) => unknown;
    const hooks = new Map<string, CapturedHook>();
    const socketListeners = new Map<string, (data: unknown) => void>();
    const socket = {
      connected: true,
      on: vi.fn((event: string, listener: (data: unknown) => void) => {
        socketListeners.set(event, listener);
      }),
      off: vi.fn(),
    };
    const liveSdk = (window as unknown as { bcModSdk?: unknown }).bcModSdk;
    Object.defineProperty(window, "bcModSdk", {
      configurable: true,
      value: {
        registerMod: () => ({
          hookFunction: (name: string, _priority: number, hook: CapturedHook) => {
            hooks.set(name, hook);
            return vi.fn();
          },
          unload: vi.fn(),
        }),
      },
    });
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map(),
    };
    globalThis.ServerSocket = socket as unknown as BCServerSocket;
    globalThis.ServerSendBeepMessage = vi.fn();
    globalThis.ServerAccountBeep = vi.fn();
    globalThis.ServerAccountQueryResult = vi.fn();
    globalThis.ChatRoomMessage = vi.fn();
    globalThis.ServerSend = vi.fn();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    const revokedProxy = (): object => {
      const guarded = Proxy.revocable<Record<string, unknown>>({}, {});
      guarded.revoke();
      return guarded.proxy;
    };

    try {
      await adapter.start();

      for (const event of ["AccountBeep", "AccountQueryResult", "ChatRoomMessage"]) {
        const listener = socketListeners.get(event);
        if (!listener) throw new Error(`Expected the ${event} socket listener to be installed`);
        expect(() => listener(revokedProxy())).not.toThrow();
      }

      for (const name of [
        "ServerAccountBeep",
        "ServerAccountQueryResult",
        "ChatRoomMessage",
        "ServerSend",
      ]) {
        const hook = hooks.get(name);
        if (!hook) throw new Error(`Expected the ${name} hook to be installed`);
        const payload = revokedProxy();
        const args = name === "ServerSend" ? ["AccountBeep", payload] : [payload];
        const next = vi.fn<(args: any[]) => unknown>(() => "native result");
        let result: unknown;
        expect(() => {
          result = hook(args, next);
        }).not.toThrow();
        expect(result!).toBe("native result");
        expect(next).toHaveBeenCalledOnce();
        expect(next.mock.calls[0]?.[0]).toBe(args);
      }
      expect(warning).toHaveBeenCalled();
    } finally {
      adapter.stop();
      warning.mockRestore();
      Object.defineProperty(window, "bcModSdk", { configurable: true, value: liveSdk });
    }
  });

  it("keeps valid online friends when one snapshot entry is inaccessible", async () => {
    const socketListeners = new Map<string, (data: unknown) => void>();
    const socket = {
      connected: true,
      on: vi.fn((event: string, listener: (data: unknown) => void) => {
        socketListeners.set(event, listener);
      }),
      off: vi.fn(),
    };
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map([[123, "AccountReina"]]),
    };
    globalThis.ServerSocket = socket as unknown as BCServerSocket;
    globalThis.ServerSendBeepMessage = vi.fn();
    globalThis.ServerSend = vi.fn();
    const guarded = Proxy.revocable<BCOnlineFriendInfo>({
      Type: "Friend",
      MemberNumber: 555,
      MemberName: "Guarded",
    }, {});
    guarded.revoke();
    const bus = new EventBus<KikiLinkEvents>();
    const online = vi.fn();
    bus.on("bc:online-friends", online);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const adapter = new BCAdapter(bus, "0.24.0");

    try {
      await adapter.start();
      const listener = socketListeners.get("AccountQueryResult");
      if (!listener) throw new Error("Expected the online-friends socket listener to be installed");
      expect(() =>
        listener({
          Query: "OnlineFriends",
          Result: [
            guarded.proxy,
            {
              Type: "Friend",
              MemberNumber: 123,
              MemberName: "AccountReina",
              MemberNickname: "Reina",
              ChatRoomName: "Moon Garden",
            },
          ],
        }),
      ).not.toThrow();

      expect(adapter.getOnlineFriends()).toEqual([
        {
          memberNumber: 123,
          memberName: "Reina",
          roomName: "Moon Garden",
          privateRoom: false,
        },
      ]);
      expect(online).toHaveBeenCalledOnce();
      expect(warning).toHaveBeenCalledWith(
        expect.stringContaining("online friend entry"),
        expect.any(Error),
      );
    } finally {
      adapter.stop();
      warning.mockRestore();
    }
  });

  it("falls back to removeListener when socket.off cannot detach an event", async () => {
    const off = vi.fn((event: string) => {
      if (event === "AccountBeep") throw new Error("cross-compartment off failure");
    });
    const removeListener = vi.fn();
    const socket = {
      connected: true,
      on: vi.fn(),
      off,
      removeListener,
    };
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map(),
    };
    globalThis.ServerSocket = socket as unknown as BCServerSocket;
    globalThis.ServerSendBeepMessage = vi.fn();
    globalThis.ServerSend = vi.fn();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    try {
      await adapter.start();
      adapter.stop();

      expect(off).toHaveBeenCalledTimes(3);
      expect(removeListener).toHaveBeenCalledOnce();
      expect(removeListener).toHaveBeenCalledWith("AccountBeep", expect.any(Function));
      expect(warning).toHaveBeenCalledWith(
        expect.stringContaining("socket.off"),
        expect.any(Error),
      );
    } finally {
      adapter.stop();
      warning.mockRestore();
    }
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
    const protocol = vi.fn();
    bus.on("beep:received", incoming);
    bus.on("bc:online-friends", online);
    bus.on("bc:protocol", protocol);
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

    emit("ChatRoomMessage", {
      Sender: 123,
      Type: "Hidden",
      Content: 'KIKILINK/1 {"t":"ps","s":"online","u":1,"v":"0.20.9"}',
    });
    expect(protocol).toHaveBeenCalledWith(
      expect.objectContaining({ senderNumber: 123, channel: "room" }),
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
    expect(socket.off).toHaveBeenCalledTimes(3);
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
    expect(replacementSocket.off).toHaveBeenCalledTimes(3);
  });

  it("continues removing socket listeners and ModSDK hooks after individual cleanup failures", async () => {
    vi.useFakeTimers();
    type CapturedHook = (args: any[], next: (args: any[]) => unknown) => unknown;
    const detachedEvents: string[] = [];
    const socket = {
      connected: true,
      on: vi.fn(),
      off: vi.fn((event: string) => {
        detachedEvents.push(event);
        if (event === "AccountBeep") throw new Error("stale socket listener");
      }),
    };
    const removals: Array<{ name: string; remove: ReturnType<typeof vi.fn> }> = [];
    const unload = vi.fn();
    const liveSdk = (window as unknown as { bcModSdk?: unknown }).bcModSdk;
    Object.defineProperty(window, "bcModSdk", {
      configurable: true,
      value: {
        registerMod: () => ({
          hookFunction: (name: string, _priority: number, _hook: CapturedHook) => {
            const remove = vi.fn(() => {
              if (name === "ServerSend") throw new Error("stale ModSDK hook");
            });
            removals.push({ name, remove });
            return remove;
          },
          unload,
        }),
      },
    });
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map(),
    };
    globalThis.ServerSocket = socket as unknown as BCServerSocket;
    globalThis.ServerSendBeepMessage = vi.fn();
    globalThis.ServerAccountBeep = vi.fn();
    globalThis.ServerAccountQueryResult = vi.fn();
    globalThis.FriendListLoadFriendList = vi.fn();
    globalThis.ChatRoomMessage = vi.fn();
    globalThis.ServerSend = vi.fn();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.24.0");

    try {
      await adapter.start();
      expect(removals.some(({ name }) => name === "ServerSend")).toBe(true);

      expect(() => adapter.stop()).not.toThrow();

      expect(detachedEvents).toEqual([
        "AccountBeep",
        "AccountQueryResult",
        "ChatRoomMessage",
      ]);
      expect(socket.off).toHaveBeenCalledTimes(3);
      expect(removals.length).toBeGreaterThanOrEqual(5);
      for (const { remove } of removals) expect(remove).toHaveBeenCalledOnce();
      expect(unload).toHaveBeenCalledOnce();
      expect(warning).toHaveBeenCalled();
    } finally {
      adapter.stop();
      warning.mockRestore();
      Object.defineProperty(window, "bcModSdk", { configurable: true, value: liveSdk });
    }
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
      Message:
        'Only once\n\n\uf124{"messageType":"Message","messageColor":"#ffffff"}\u2063LikoMAT:en\u2063',
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
    expect(incoming).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: "Only once" }),
    );

    adapter.stop();
    vi.useRealTimers();
  });

  it("skips a revoked native Beep-log entry without losing later valid entries", async () => {
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
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const adapter = new BCAdapter(bus, "0.24.0");
    await adapter.start();

    const guarded = Proxy.revocable<BCFriendListBeepLogMessage>({
      MemberNumber: 555,
      MemberName: "Guarded",
      Sent: false,
      Time: new Date(),
      Message: "Unreadable",
    }, {});
    guarded.revoke();
    globalThis.FriendListBeepLog.push(
      guarded.proxy,
      {
        MemberNumber: 123,
        MemberName: "AccountReina",
        Sent: false,
        Time: new Date(),
        Message: "Still recovered",
      },
    );

    await vi.advanceTimersByTimeAsync(1_001);

    expect(incoming).toHaveBeenCalledOnce();
    expect(incoming).toHaveBeenCalledWith(expect.objectContaining({ content: "Still recovered" }));
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("native Beep log entry"),
      expect.any(Error),
    );
    adapter.stop();
    warning.mockRestore();
  });

  it("shares the native character overlay without replacing other addon drawing", async () => {
    const nativeOverlay = vi.fn();
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map(),
    };
    globalThis.ServerSendBeepMessage = vi.fn();
    globalThis.ChatRoomDrawCharacterStatusIcons = nativeOverlay;

    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.18.0");
    const renderer = vi.fn();
    adapter.registerCharacterOverlay(renderer);
    await adapter.start();

    const character = { MemberNumber: 999, Name: "AccountKiki" };
    globalThis.ChatRoomDrawCharacterStatusIcons(character, 120, 30, 0.75);
    globalThis.ChatRoomDrawCharacterStatusIcons(character, 120, 30, 0.75);

    expect(nativeOverlay).toHaveBeenCalledTimes(2);
    expect(renderer).toHaveBeenCalledTimes(2);
    expect(renderer).toHaveBeenLastCalledWith(character, 120, 30, 0.75);
    adapter.stop();
  });

  it("shares Echo/WCE status icons inside BCX's outer overlay chain", async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const hookRequests: Array<{ mod: string; name: string; priority: number }> = [];
    type Hook = {
      mod: string;
      priority: number;
      run: (args: any[], next: (args: any[]) => any) => any;
    };
    type HookState = {
      original: (...args: any[]) => any;
      router: (...args: any[]) => any;
      hooks: Hook[];
    };
    const states = new Map<string, HookState>();
    const liveSdk = (window as unknown as { bcModSdk?: unknown }).bcModSdk;

    const registerMod = (info: { name: string }) => {
      const ownedHooks = new Set<Hook>();
      const unload = (): void => {
        for (const hook of ownedHooks) {
          for (const state of states.values()) {
            const index = state.hooks.indexOf(hook);
            if (index >= 0) state.hooks.splice(index, 1);
          }
        }
        ownedHooks.clear();
      };
      return {
        hookFunction(
          name: string,
          priority: number,
          run: (args: any[], next: (args: any[]) => any) => any,
        ) {
          let state = states.get(name);
          if (!state) {
            const original = (window as unknown as Record<string, any>)[name];
            if (typeof original !== "function") throw new Error(`${name} is unavailable`);
            const hooks: Hook[] = [];
            const nextAt = (
              index: number,
              args: any[],
              thisArg: unknown,
            ): any => {
              const ordered = [...hooks].sort((left, right) => right.priority - left.priority);
              const hook = ordered[index];
              if (!hook) return original.apply(thisArg, args);
              return hook.run(args, (nextArgs) => nextAt(index + 1, nextArgs, thisArg));
            };
            const router = function (this: unknown, ...args: any[]): any {
              return nextAt(0, args, this);
            };
            state = { original, router, hooks };
            states.set(name, state);
            (window as unknown as Record<string, any>)[name] = router;
          }
          const hook = { mod: info.name, priority, run };
          state.hooks.push(hook);
          ownedHooks.add(hook);
          hookRequests.push({ mod: info.name, name, priority });
          return () => {
            const index = state!.hooks.indexOf(hook);
            if (index >= 0) state!.hooks.splice(index, 1);
            ownedHooks.delete(hook);
          };
        },
        unload,
      };
    };

    Object.defineProperty(window, "bcModSdk", {
      configurable: true,
      value: Object.freeze({ registerMod }),
    });
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map(),
    };
    globalThis.ServerSendBeepMessage = vi.fn();
    globalThis.ChatRoomDrawCharacterStatusIcons = vi.fn(() => {
      calls.push("native status");
    });
    globalThis.ChatRoomCharacterViewDrawOverlay = vi.fn((...args: any[]) => {
      calls.push("native outer");
      return globalThis.ChatRoomDrawCharacterStatusIcons(...args as Parameters<
        typeof globalThis.ChatRoomDrawCharacterStatusIcons
      >);
    });

    const echoLike = registerMod({ name: "动作拓展" });
    const wceLike = registerMod({ name: "WCE" });
    const bcxLike = registerMod({ name: "BCX" });
    const afcLike = registerMod({ name: "AbundantiaFlorumChromatica" });
    echoLike.hookFunction("ChatRoomDrawCharacterStatusIcons", 10, (args, next) => {
      calls.push("echo");
      return next(args);
    });
    afcLike.hookFunction("ChatRoomDrawCharacterStatusIcons", 0, (args, next) => {
      calls.push("afc");
      return next(args);
    });
    wceLike.hookFunction("ChatRoomDrawCharacterStatusIcons", 0, (args, next) => {
      calls.push("wce");
      return next(args);
    });
    bcxLike.hookFunction("ChatRoomCharacterViewDrawOverlay", 0, (args, next) => {
      calls.push("bcx");
      return next(args);
    });
    const sharedRouter = globalThis.ChatRoomDrawCharacterStatusIcons;
    const sharedOuterRouter = globalThis.ChatRoomCharacterViewDrawOverlay;

    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.20.7");
    const renderer = vi.fn(() => calls.push("kikilink"));
    adapter.registerCharacterOverlay(renderer);
    try {
      await adapter.start();
      const character = { MemberNumber: 999, Name: "AccountKiki" };
      expect(() =>
        globalThis.ChatRoomCharacterViewDrawOverlay(character, 120, 30, 0.75),
      ).not.toThrow();
      expect(calls).toContain("echo");
      expect(calls).toContain("wce");
      expect(calls).toContain("bcx");
      expect(calls).toContain("afc");
      expect(calls).toContain("native outer");
      expect(calls).toContain("native status");
      expect(calls).toContain("kikilink");
      expect(calls.filter((entry) => entry === "native outer")).toHaveLength(1);
      expect(calls.filter((entry) => entry === "native status")).toHaveLength(1);
      expect(globalThis.ChatRoomDrawCharacterStatusIcons).toBe(sharedRouter);
      expect(globalThis.ChatRoomCharacterViewDrawOverlay).toBe(sharedOuterRouter);
      expect(hookRequests).toContainEqual({
        mod: "KikiLink",
        name: "ChatRoomDrawCharacterStatusIcons",
        priority: 10,
      });
      expect(hookRequests).not.toContainEqual(
        expect.objectContaining({
          mod: "KikiLink",
          name: "ChatRoomCharacterViewDrawOverlay",
        }),
      );
      expect(hookRequests).not.toContainEqual(
        expect.objectContaining({
          mod: "KikiLink",
          name: "ChatRoomCharacterViewLoopCharacters",
        }),
      );

    } finally {
      adapter.stop();
      echoLike.unload();
      wceLike.unload();
      bcxLike.unload();
      afcLike.unload();
      Object.defineProperty(window, "bcModSdk", { configurable: true, value: liveSdk });
      vi.useRealTimers();
    }
  });

  it("leaves shared functions untouched when ModSDK registration is unavailable", async () => {
    const nativeOverlay = vi.fn();
    const nativeAllowed = vi.fn((_character: BCCharacter, groupName: string) => [
      {
        Activity: { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: [groupName] },
        Group: groupName,
      },
    ]);
    globalThis.ChatRoomCharacterViewDrawOverlay = nativeOverlay;
    globalThis.ChatRoomDrawCharacterStatusIcons = nativeOverlay;
    globalThis.ActivityAllowedForGroup = nativeAllowed;
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map(),
    };
    globalThis.ServerSendBeepMessage = vi.fn();
    const liveSdk = (window as unknown as { bcModSdk?: unknown }).bcModSdk;
    Object.defineProperty(window, "bcModSdk", {
      configurable: true,
      value: Object.freeze({
        registerMod: () => {
          throw new Error("ModSDK registration unavailable for fallback test");
        },
      }),
    });
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.20.5");
    const renderer = vi.fn();
    const customName = "KikiLinkCustom_direct";
    const integration: BCCustomActivityIntegration = {
      isCustomActivity: (name) => name === customName,
      extendAllowedActivities: (_character, groupName, activities) => [
        ...activities,
        {
          Activity: {
            Name: customName,
            MaxProgress: 0,
            Prerequisite: [],
            Target: [groupName],
          },
          Group: groupName,
        },
      ],
      resolveText: () => undefined,
      resolveImage: () => undefined,
      run: () => false,
      decorateButton: () => undefined,
      onRoomMessage: () => undefined,
    };

    try {
      adapter.registerCharacterOverlay(renderer);
      adapter.registerCustomActivityIntegration(integration);
      await adapter.start();
      const character = { MemberNumber: 999, Name: "AccountKiki" };
      globalThis.ChatRoomDrawCharacterStatusIcons(character, 100, 20, 0.5);
      const allowed = globalThis.ActivityAllowedForGroup(character, "ItemArms");

      expect(globalThis.ChatRoomDrawCharacterStatusIcons).toBe(nativeOverlay);
      expect(globalThis.ActivityAllowedForGroup).toBe(nativeAllowed);
      expect(nativeOverlay).toHaveBeenCalledWith(character, 100, 20, 0.5);
      expect(renderer).not.toHaveBeenCalled();
      expect(nativeAllowed).toHaveBeenCalledWith(character, "ItemArms");
      expect(allowed.map((item) => item.Activity.Name)).toEqual(["Caress"]);
      adapter.stop();
    } finally {
      Object.defineProperty(window, "bcModSdk", { configurable: true, value: liveSdk });
    }
  });

  it("does not wrap late BC functions when another KikiLink registration blocks ModSDK", async () => {
    vi.useFakeTimers();
    globalThis.alert = vi.fn();
    const blocker = bcModSDK.registerMod({
      name: "KikiLink",
      fullName: "Blocked KikiLink test registration",
      version: "0.0.0",
    });
    try {
      globalThis.Player = {
        MemberNumber: 999,
        Name: "AccountKiki",
        FriendNames: new Map(),
      };
      globalThis.ServerSendBeepMessage = vi.fn();
      const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.20.5");
      const renderer = vi.fn();
      const customName = "KikiLinkCustom_late_direct";
      adapter.registerCharacterOverlay(renderer);
      adapter.registerCustomActivityIntegration({
        isCustomActivity: (name) => name === customName,
        extendAllowedActivities: (_character, groupName, activities) => [
          ...activities,
          {
            Activity: {
              Name: customName,
              MaxProgress: 0,
              Prerequisite: [],
              Target: [groupName],
            },
            Group: groupName,
          },
        ],
        resolveText: () => undefined,
        resolveImage: () => undefined,
        run: () => false,
        decorateButton: () => undefined,
        onRoomMessage: () => undefined,
      });
      await adapter.start();

      const nativeOverlay = vi.fn();
      const nativeAllowed = vi.fn(() => [] as BCItemActivity[]);
      globalThis.ChatRoomDrawCharacterStatusIcons = nativeOverlay;
      globalThis.ActivityAllowedForGroup = nativeAllowed;
      await vi.advanceTimersByTimeAsync(500);

      const character = { MemberNumber: 999, Name: "AccountKiki" };
      globalThis.ChatRoomDrawCharacterStatusIcons(character, 80, 10, 0.6);
      const allowed = globalThis.ActivityAllowedForGroup(character, "ItemArms");
      expect(globalThis.ChatRoomDrawCharacterStatusIcons).toBe(nativeOverlay);
      expect(globalThis.ActivityAllowedForGroup).toBe(nativeAllowed);
      expect(nativeOverlay).toHaveBeenCalledOnce();
      expect(renderer).not.toHaveBeenCalled();
      expect(allowed).toEqual([]);
      adapter.stop();
    } finally {
      blocker.unload();
    }
  });

  it("shares native activity hooks and handles only registered custom actions", async () => {
    vi.useFakeTimers();
    const nativeMessage = vi.fn();
    const nativeDictionary = vi.fn((keyword: string) => `native:${keyword}`);
    const nativeRun = vi.fn();
    const nativeAllowed = vi.fn((_character: BCCharacter, groupName: string) => [
      {
        Activity: { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: [groupName] },
        Group: groupName,
      },
    ]);
    const nativePreference = vi.fn(() => 0);
    const nativeDialogBuild = vi.fn(() => {
      globalThis.DialogActivity = [];
    });
    const reloadActivities = vi.fn(() => Promise.resolve());
    const nativeCreateButton = vi.fn(
      (
        _idPrefix: string | null,
        _activity: BCItemActivity,
        _character: BCCharacter,
        _onClick: (this: HTMLButtonElement, event: PointerEvent) => unknown,
        options?: { image?: string } | null,
      ) => {
        const button = document.createElement("button");
        button.dataset.image = options?.image ?? "native";
        return button;
      },
    );
    globalThis.Player = {
      MemberNumber: 999,
      Name: "AccountKiki",
      FriendNames: new Map(),
    };
    globalThis.ServerSendBeepMessage = vi.fn();
    globalThis.ChatRoomMessage = nativeMessage;
    globalThis.ActivityDictionaryText = nativeDictionary;
    globalThis.ActivityRun = nativeRun;
    globalThis.ActivityAllowedForGroup = nativeAllowed;
    globalThis.DialogBuildActivities = nativeDialogBuild;
    globalThis.DialogActivity = [];
    globalThis.DialogMenuMode = "activities";
    globalThis.DialogMenuMapping = { activities: { Reload: reloadActivities } };
    Object.assign(globalThis, {
      ElementButton: { CreateForActivity: nativeCreateButton },
    });

    const customName = "KikiLinkCustom_test";
    const customLabel = `Label-ChatSelf-ItemArms-${customName}`;
    const integration: BCCustomActivityIntegration = {
      isCustomActivity: vi.fn((activityName) => activityName === customName),
      extendAllowedActivities: vi.fn((_character, groupName, activities) => [
        ...activities,
        {
          Activity: {
            Name: customName,
            MaxProgress: 0,
            Prerequisite: [],
            Target: [groupName],
          },
          Group: groupName,
        },
      ]),
      resolveText: vi.fn((keyword) =>
        keyword === `Activity${customName}` || keyword === customLabel
          ? "Elbow touch"
          : undefined,
      ),
      resolveImage: vi.fn((activityName) =>
        activityName === customName ? "./Assets/Female3DCG/Activity/Caress.png" : undefined,
      ),
      run: vi.fn((_actor, _acted, _group, itemActivity) =>
        itemActivity.Activity.Name === customName,
      ),
      decorateButton: vi.fn((button, itemActivity) => {
        if (itemActivity.Activity.Name === customName) button.dataset.blossom = "true";
      }),
      onRoomMessage: vi.fn(),
    };
    const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), "0.19.0");
    adapter.registerCustomActivityIntegration(integration);
    await adapter.start();
    globalThis.PreferenceGetActivityFactor = nativePreference;
    vi.advanceTimersByTime(500);

    expect(globalThis.ActivityDictionaryText(`Activity${customName}`)).toBe("Elbow touch");
    expect(globalThis.ActivityDictionaryText(customLabel)).toBe("Elbow touch");
    expect(globalThis.ActivityDictionaryText("ActivityCaress")).toBe("native:ActivityCaress");
    expect(globalThis.PreferenceGetActivityFactor(globalThis.Player, customName, false)).toBe(2);
    expect(globalThis.PreferenceGetActivityFactor(globalThis.Player, "Caress", false)).toBe(0);
    expect(nativePreference).toHaveBeenCalledOnce();

    const actor = globalThis.Player;
    const acted = { MemberNumber: 123, Name: "Reina" };
    const group = { Name: "ItemArms", Description: "Arms", Category: "Item" as const };
    const custom = {
      Activity: { Name: customName, MaxProgress: 0, Prerequisite: [], Target: ["ItemArms"] },
      Group: "ItemArms",
    };
    const vanilla = {
      Activity: { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] },
      Group: "ItemArms",
    };
    expect(globalThis.ActivityAllowedForGroup(acted, "ItemArms").map((item) => item.Activity.Name)).toEqual([
      "Caress",
      customName,
    ]);
    expect(integration.extendAllowedActivities).toHaveBeenCalledOnce();
    const dialogTarget = {
      ...acted,
      FocusGroup: { Name: "ItemArms", Description: "Arms", Category: "Item" as const },
    };
    globalThis.DialogBuildActivities(dialogTarget, true);
    expect(globalThis.DialogActivity.map((item) => item.Activity.Name)).toEqual([customName]);
    expect(reloadActivities).toHaveBeenCalledWith(null, {
      reset: true,
      resetDialogItems: false,
    });
    globalThis.ActivityRun(actor, acted, group, custom);
    globalThis.ActivityRun(actor, acted, group, vanilla);
    expect(integration.run).toHaveBeenCalledTimes(2);
    expect(nativeRun).toHaveBeenCalledOnce();

    const customButton = globalThis.ElementButton.CreateForActivity(
      null,
      custom,
      acted,
      () => undefined,
    );
    expect(customButton.dataset.image).toBe("./Assets/Female3DCG/Activity/Caress.png");
    expect(customButton.dataset.blossom).toBe("true");

    const message = { Type: "Action", Content: "KikiLinkCustomActivity", Sender: 123 };
    globalThis.ChatRoomMessage(message);
    expect(integration.onRoomMessage).toHaveBeenCalledWith(message);
    expect(nativeMessage).toHaveBeenCalledWith(message);

    // A late addon or BC hot reload can replace a live ModSDK router. KikiLink must leave that
    // replacement untouched instead of layering a direct wrapper around another addon's chain.
    const replacementDictionary = vi.fn((keyword: string) => `replacement:${keyword}`);
    const replacementRun = vi.fn();
    const replacementCreateButton = vi.fn(
      (
        _idPrefix: string | null,
        _activity: BCItemActivity,
        _character: BCCharacter,
        _onClick: (this: HTMLButtonElement, event: PointerEvent) => unknown,
        options?: { image?: string } | null,
      ) => {
        const button = document.createElement("button");
        button.dataset.image = options?.image ?? "replacement";
        return button;
      },
    );
    globalThis.ActivityDictionaryText = replacementDictionary;
    globalThis.ActivityRun = replacementRun;
    globalThis.ElementButton.CreateForActivity = replacementCreateButton;
    await vi.advanceTimersByTimeAsync(500);

    expect(globalThis.ActivityDictionaryText).toBe(replacementDictionary);
    expect(globalThis.ActivityRun).toBe(replacementRun);
    expect(globalThis.ElementButton.CreateForActivity).toBe(replacementCreateButton);
    expect(globalThis.ActivityDictionaryText(customLabel)).toBe(`replacement:${customLabel}`);
    expect(globalThis.ActivityDictionaryText("ActivityKiss")).toBe("replacement:ActivityKiss");
    expect(replacementDictionary).toHaveBeenCalledTimes(2);
    globalThis.ActivityRun(actor, acted, group, custom);
    globalThis.ActivityRun(actor, acted, group, vanilla);
    expect(replacementRun).toHaveBeenCalledTimes(2);
    const replacementButton = globalThis.ElementButton.CreateForActivity(
      null,
      custom,
      acted,
      () => undefined,
    );
    expect(replacementButton.dataset.image).toBe("replacement");
    expect(replacementButton.dataset.blossom).toBeUndefined();
    adapter.stop();
  });
});
