import { describe, expect, it, vi } from "vitest";
import {
  MemoryKeyValueStorage,
  type KeyValueStorage,
} from "../src/core/settings";
import {
  GROUP_CHAT_STORAGE_KEY,
  GROUP_INVITE_RATE_BURST,
  GROUP_INVITE_RATE_REFILL_MS,
  GROUP_MAX_COUNT,
  GROUP_MAX_MESSAGES,
  GROUP_MESSAGE_MAX_CONTENT,
  GROUP_MEMBER_NAME_MAX_CHARS,
  GROUP_PACKET_MAX_CHARS,
  GROUP_PERSISTENCE_MAX_WAIT_MS,
  GROUP_RELAY_INTERVAL_MS,
  GROUP_RELAY_QUEUE_CAPACITY,
  GROUP_RELAY_TTL_MS,
  GroupChatService,
  type GroupChatTransport,
  parseGroupChatPacket,
  serializeGroupChatPacket,
} from "../src/modules/link-chat/group-chat-service";
import { AccountDataStorage } from "../src/storage/account-data-storage";

interface SentPacket {
  target: number;
  payload: string;
}

class ControlledStorage extends MemoryKeyValueStorage {
  writes = 0;
  available = true;
  readable = true;
  silentFailure = false;

  override getItem(key: string): string | null {
    if (!this.readable) throw new Error("storage read denied");
    return super.getItem(key);
  }

  override setItem(key: string, value: string): void {
    this.writes += 1;
    if (this.available) {
      super.setItem(key, value);
      return;
    }
    if (!this.silentFailure) throw new Error("storage denied");
  }

  override removeItem(key: string): void {
    if (this.available) {
      super.removeItem(key);
      return;
    }
    if (!this.silentFailure) throw new Error("storage denied");
  }
}

interface TestHarness {
  service: GroupChatService;
  storage: KeyValueStorage;
  sent: SentPacket[];
  friends: Set<number>;
  room: Set<number>;
  blocked: Set<number>;
  failed: Set<number>;
  setRelationshipReadFailure(value: boolean): void;
  setNow(value: number): void;
  setOwnMemberNumber(value: number): void;
  setOwnMemberReadFailure(value: boolean): void;
}

function setup(
  storage: KeyValueStorage = new MemoryKeyValueStorage(),
  ownMemberNumber = 10,
  persistenceDelayMs?: number,
): TestHarness {
  const sent: SentPacket[] = [];
  const friends = new Set<number>([20, 30, 40, 50]);
  const room = new Set<number>();
  const blocked = new Set<number>();
  const failed = new Set<number>();
  let currentOwnMemberNumber = ownMemberNumber;
  let ownMemberReadFails = false;
  let relationshipReadFails = false;
  let now = 1_000_000;
  let id = 0;
  const transport: GroupChatTransport = {
    getOwnMemberNumber: () => {
      if (ownMemberReadFails) throw new Error("guarded account identity");
      return currentOwnMemberNumber;
    },
    getMemberName: (memberNumber) =>
      new Map([
        [10, "Kiki"],
        [20, "Reina"],
        [30, "Mina"],
        [40, "Luna"],
        [50, "Sara"],
      ]).get(memberNumber) ?? `Member ${memberNumber}`,
    sendKikiLinkProtocol: (target, payload) => {
      sent.push({ target, payload });
      if (failed.has(target)) throw new Error(`Member ${target} is offline`);
      return "beep";
    },
    isKnownFriend: (memberNumber) => friends.has(memberNumber),
    isMemberInCurrentRoom: (memberNumber) => room.has(memberNumber),
    getPlayerRelationships: (memberNumber) => {
      if (relationshipReadFails) throw new Error("guarded relationship object");
      return blocked.has(memberNumber) ? ["blacklist"] : [];
    },
  };
  return {
    service: new GroupChatService(transport, storage, {
      now: () => now,
      idFactory: (prefix) => `${prefix}_${(++id).toString(36).padStart(8, "0")}`,
      ...(persistenceDelayMs === undefined ? {} : { persistenceDelayMs }),
    }),
    storage,
    sent,
    friends,
    room,
    blocked,
    failed,
    setRelationshipReadFailure(value) {
      relationshipReadFails = value;
    },
    setNow(value) {
      now = value;
    },
    setOwnMemberNumber(value) {
      currentOwnMemberNumber = value;
    },
    setOwnMemberReadFailure(value) {
      ownMemberReadFails = value;
    },
  };
}

function invite(
  groupId = "group_aaaaaaaa",
  members = [10, 20, 30],
  title = "Garden friends",
  sentAt = 1_000_000,
): string {
  return serializeGroupChatPacket({
    t: "gi",
    v: 1,
    g: groupId,
    m: members,
    n: title,
    u: sentAt,
  });
}

function message(
  groupId: string,
  id: string,
  content: string,
  sentAt = 1_000_000,
): string {
  return serializeGroupChatPacket({
    t: "gm",
    v: 1,
    g: groupId,
    i: id,
    c: content,
    u: sentAt,
  });
}

function relay(
  groupId: string,
  origin: number,
  id: string,
  content: string,
  sentAt = 1_000_000,
): string {
  return serializeGroupChatPacket({
    t: "gr",
    v: 1,
    g: groupId,
    o: origin,
    i: id,
    c: content,
    u: sentAt,
  });
}

function names(
  groupId = "group_aaaaaaaa",
  entries: Array<[number, string]> = [[10, "Kiki"], [20, "Reina"], [30, "Mina"]],
  sentAt = 1_000_000,
): string {
  return serializeGroupChatPacket({ t: "gn", v: 1, g: groupId, d: entries, u: sentAt });
}

interface NetworkPacket extends SentPacket {
  sender: number;
}

interface NetworkClient {
  service: GroupChatService;
  friends: Set<number>;
  blocked: Set<number>;
  roomId: string;
}

class TestGroupNetwork {
  readonly clients = new Map<number, NetworkClient>();
  readonly queued: NetworkPacket[] = [];
  readonly handedOff: NetworkPacket[] = [];
  now = 1_000_000;
  #id = 0;

  addClient(
    memberNumber: number,
    friends: Iterable<number>,
    roomId: string,
  ): NetworkClient {
    const friendSet = new Set(friends);
    const blocked = new Set<number>();
    const storage = new MemoryKeyValueStorage();
    const namesByNumber = new Map([
      [10, "Creator"],
      [20, "Birch"],
      [30, "Clover"],
      [40, "Dahlia"],
      [50, "Elm"],
    ]);
    const transport: GroupChatTransport = {
      getOwnMemberNumber: () => memberNumber,
      // A client intentionally knows only itself and its friends. The creator's gn extension fills
      // display names for otherwise unrelated participants.
      getMemberName: (target) =>
        target === memberNumber || friendSet.has(target)
          ? namesByNumber.get(target) ?? `Member ${target}`
          : `Member ${target}`,
      sendKikiLinkProtocol: (target, payload) => {
        const packet = { sender: memberNumber, target, payload };
        this.handedOff.push(packet);
        this.queued.push(packet);
      },
      isKnownFriend: (target) => friendSet.has(target),
      isMemberInCurrentRoom: (target) => this.clients.get(target)?.roomId === roomId,
      getPlayerRelationships: (target) => blocked.has(target) ? ["ghost"] : [],
    };
    const client: NetworkClient = {
      service: new GroupChatService(transport, storage, {
        now: () => this.now,
        idFactory: (prefix) =>
          `${prefix}_${(++this.#id).toString(36).padStart(8, "0")}`,
        persistenceDelayMs: 0,
      }),
      friends: friendSet,
      blocked,
      roomId,
    };
    this.clients.set(memberNumber, client);
    return client;
  }

  /** Models BC: room-hidden packets share a room; outside-room AccountBeeps need receiver trust. */
  async flush(): Promise<void> {
    while (this.queued.length > 0) {
      const batch = this.queued.splice(0);
      for (const packet of batch) {
        const sender = this.clients.get(packet.sender);
        const recipient = this.clients.get(packet.target);
        if (!sender || !recipient) continue;
        const sameRoom = sender.roomId === recipient.roomId;
        if (!sameRoom && !recipient.friends.has(packet.sender)) continue;
        await recipient.service.receiveProtocol({
          senderNumber: packet.sender,
          payload: packet.payload,
        });
      }
    }
  }

  packets(type: "gi" | "gm" | "gr" | "gn"): NetworkPacket[] {
    return this.handedOff.filter(({ payload }) => parseGroupChatPacket(payload)?.t === type);
  }

  async destroy(): Promise<void> {
    await Promise.all([...this.clients.values()].map(({ service }) => service.destroy()));
  }
}

describe("group chat wire protocol", () => {
  it("derives a content limit that remains below the 700-character packet cap", () => {
    const payload = serializeGroupChatPacket({
      t: "gr",
      v: 1,
      g: `group_${"a".repeat(58)}`,
      o: Number.MAX_SAFE_INTEGER,
      i: `gmsg_${"b".repeat(57)}`,
      c: "\\".repeat(GROUP_MESSAGE_MAX_CONTENT),
      u: 8_640_000_000_000_000,
    });

    expect(payload.length).toBeLessThanOrEqual(GROUP_PACKET_MAX_CHARS);
    expect(parseGroupChatPacket(payload)).toMatchObject({ t: "gr" });
    expect(() =>
      serializeGroupChatPacket({
        t: "gr",
        v: 1,
        g: "group_aaaaaaaa",
        o: 20,
        i: "gmsg_aaaaaaaa",
        c: "x".repeat(GROUP_MESSAGE_MAX_CONTENT + 1),
        u: 1,
      }),
    ).toThrow(/transport bounds/u);
  });

  it("accepts only exact, canonical v1 packet shapes and keeps legacy gm readable", () => {
    expect(parseGroupChatPacket(invite())).toEqual({
      t: "gi",
      v: 1,
      g: "group_aaaaaaaa",
      m: [10, 20, 30],
      n: "Garden friends",
      u: 1_000_000,
    });
    expect(parseGroupChatPacket(message("group_aaaaaaaa", "gmsg_aaaaaaaa", "Hello"))).toMatchObject({
      t: "gm",
      c: "Hello",
    });
    expect(parseGroupChatPacket(relay(
      "group_aaaaaaaa",
      20,
      "gmsg_bbbbbbbb",
      "Relayed",
    ))).toMatchObject({ t: "gr", o: 20, c: "Relayed" });
    expect(parseGroupChatPacket(names())).toMatchObject({
      t: "gn",
      d: [[10, "Kiki"], [20, "Reina"], [30, "Mina"]],
    });

    // 0.24 could author a direct gm slightly larger than the relay-safe extension bound.
    const legacyDirect = message(
      "group_aaaaaaaa",
      "gmsg_legacyold",
      "x".repeat(GROUP_MESSAGE_MAX_CONTENT + 1),
    );
    expect(parseGroupChatPacket(legacyDirect)).toMatchObject({ t: "gm" });

    expect(parseGroupChatPacket("not json")).toBeNull();
    expect(parseGroupChatPacket("x".repeat(GROUP_PACKET_MAX_CHARS + 1))).toBeNull();
    expect(parseGroupChatPacket(JSON.stringify({
      t: "gi",
      v: 1,
      g: "group_aaaaaaaa",
      m: [20, 10, 30],
      n: "Unsorted",
      u: 1,
    }))).toBeNull();
    expect(parseGroupChatPacket(JSON.stringify({
      t: "gr",
      v: 1,
      g: "group_aaaaaaaa",
      o: 20,
      i: "gmsg_aaaaaaaa",
      c: "x".repeat(GROUP_MESSAGE_MAX_CONTENT + 1),
      u: 1,
    }))).toBeNull();
    expect(parseGroupChatPacket(JSON.stringify({
      t: "gn",
      v: 1,
      g: "group_aaaaaaaa",
      d: [[20, "Reina"], [10, "Kiki"], [30, "Mina"]],
      u: 1,
    }))).toBeNull();
    expect(parseGroupChatPacket(JSON.stringify({
      t: "gn",
      v: 1,
      g: "group_aaaaaaaa",
      d: [[10, "Kiki"], [20, `x${" ".repeat(GROUP_MEMBER_NAME_MAX_CHARS)}`], [30, "Mina"]],
      u: 1,
    }))).toBeNull();
    expect(parseGroupChatPacket(JSON.stringify({
      t: "gi",
      v: 1,
      g: "group_aaaaaaaa",
      m: [10, 20, 30],
      n: "x".repeat(61),
      u: 1,
    }))).toBeNull();
    expect(parseGroupChatPacket(JSON.stringify({
      t: "gm",
      v: 1,
      g: "group_aaaaaaaa",
      i: "gmsg_aaaaaaaa",
      c: "Hello",
      u: 1,
      action: "run",
    }))).toBeNull();
    expect(parseGroupChatPacket(JSON.stringify({
      t: "gm",
      v: 1,
      g: "group_aaaaaaaa",
      i: "gmsg_aaaaaaaa",
      c: "bad\u0000content",
      u: 1,
    }))).toBeNull();
    expect(parseGroupChatPacket(JSON.stringify({
      t: "gm",
      v: 1,
      g: "group_aaaaaaaa",
      i: "gmsg_aaaaaaaa",
      c: "Beyond the JavaScript Date range",
      u: 8_640_000_000_000_001,
    }))).toBeNull();
    expect(parseGroupChatPacket(JSON.stringify({
      t: "gm",
      v: 1,
      g: "group_aaaaaaaa",
      i: "gmsg_aaaaaaaa",
      c: "bad\ud800",
      u: 1,
    }))).toBeNull();
    expect(parseGroupChatPacket(JSON.stringify({
      t: "gm",
      v: 1,
      g: "group_aaaaaaaa",
      i: "gmsg_aaaaaaaa",
      c: "safe\u202egnimda",
      u: 1,
    }))).toBeNull();
  });
});

describe("GroupChatService", () => {
  it("creates a 3-5 member group, sends one identical hidden packet per peer, and reloads it", async () => {
    const harness = setup();
    const updates = vi.fn();
    harness.service.subscribe(updates);

    const result = await harness.service.createGroup([30, 20, 20], "  Core   Team  ");

    expect(result.group).toMatchObject({
      title: "Core Team",
      creatorNumber: 10,
      memberNumbers: [10, 20, 30],
      memberNames: { 10: "Kiki", 20: "Reina", 30: "Mina" },
    });
    expect(result.handedOffTo).toEqual([20, 30]);
    expect(result.failed).toEqual([]);
    expect(harness.sent).toHaveLength(4);
    const invitePackets = harness.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gi");
    const namePackets = harness.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gn");
    expect(invitePackets).toHaveLength(2);
    expect(namePackets).toHaveLength(2);
    expect(invitePackets[0]?.payload).toBe(invitePackets[1]?.payload);
    expect(namePackets[0]?.payload).toBe(namePackets[1]?.payload);
    expect(parseGroupChatPacket(invitePackets[0]!.payload)).toMatchObject({
      t: "gi",
      m: [10, 20, 30],
    });
    expect(updates).toHaveBeenCalledWith(expect.objectContaining({
      kind: "group-added",
      incoming: false,
    }));
    await harness.service.flush();
    expect(harness.storage.getItem(GROUP_CHAT_STORAGE_KEY)).not.toBeNull();

    result.group.memberNumbers.push(999);
    expect(harness.service.getGroup(result.group.groupId)?.memberNumbers).toEqual([10, 20, 30]);

    const reloaded = setup(harness.storage).service;
    expect(reloaded.listGroups()).toMatchObject([
      { title: "Core Team", memberNumbers: [10, 20, 30] },
    ]);
  });

  it("creates and delivers a group with five total members", async () => {
    const harness = setup();

    const result = await harness.service.createGroup([50, 30, 20, 40], "Full group");

    expect(result.group.memberNumbers).toEqual([10, 20, 30, 40, 50]);
    expect(result.handedOffTo).toEqual([20, 30, 40, 50]);
    expect(result.failed).toEqual([]);
    expect(harness.sent).toHaveLength(8);
    const invitePackets = harness.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gi");
    const namePackets = harness.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gn");
    expect(invitePackets).toHaveLength(4);
    expect(namePackets).toHaveLength(4);
    expect(invitePackets.every(({ payload }) => payload === invitePackets[0]?.payload)).toBe(true);
    expect(namePackets.every(({ payload }) => payload === namePackets[0]?.payload)).toBe(true);
    expect(parseGroupChatPacket(invitePackets[0]!.payload)).toMatchObject({
      t: "gi",
      m: [10, 20, 30, 40, 50],
    });
  });

  it("truncates a title without splitting an astral Unicode character", async () => {
    const harness = setup();
    const prefix = "a".repeat(59);

    const result = await harness.service.createGroup([20, 30], `${prefix}🌸`);

    expect(result.group.title).toBe(prefix);
    expect(result.group.title).not.toMatch(/[\ud800-\udfff]$/u);
    expect(parseGroupChatPacket(harness.sent[0]!.payload)).toMatchObject({ n: prefix });
  });

  it("enforces total membership bounds, valid members, and local block state", async () => {
    const harness = setup();

    await expect(harness.service.createGroup([20])).rejects.toThrow(/3-5 total/u);
    await expect(harness.service.createGroup([20, 20])).rejects.toThrow(/3-5 total/u);
    await expect(harness.service.createGroup([20, 30, 40, 50, 60])).rejects.toThrow(/3-5 total/u);
    await expect(harness.service.createGroup([20, -1])).rejects.toThrow(/valid BC member/u);
    harness.blocked.add(30);
    await expect(harness.service.createGroup([20, 30])).rejects.toThrow(/blocked or ghosted/u);
  });

  it("fails closed when outbound relationship state is guarded", async () => {
    const guardedCreation = setup();
    guardedCreation.setRelationshipReadFailure(true);

    await expect(guardedCreation.service.createGroup([20, 30], "Guarded relationships"))
      .rejects.toThrow(/blocked or ghosted/u);
    expect(guardedCreation.sent).toEqual([]);
    expect(guardedCreation.service.listGroups()).toEqual([]);

    const guardedSend = setup();
    const creation = await guardedSend.service.createGroup([20, 30], "Existing group");
    guardedSend.sent.splice(0);
    guardedSend.setRelationshipReadFailure(true);

    const result = await guardedSend.service.sendMessage(
      creation.group.groupId,
      "Do not cross a guarded privacy boundary",
    );

    expect(result).toMatchObject({
      persisted: false,
      handedOffTo: [],
      unreachable: [20, 30],
      failed: [
        { memberNumber: 20, message: "Member is blocked or ghosted" },
        { memberNumber: 30, message: "Member is blocked or ghosted" },
      ],
    });
    expect(guardedSend.sent).toEqual([]);
    expect(guardedSend.service.getMessages(creation.group.groupId)).toEqual([]);

    await guardedCreation.service.destroy();
    await guardedSend.service.destroy();
  });

  it("fails closed when the outbound relationship callback is unavailable", async () => {
    const sent: SentPacket[] = [];
    const transport: GroupChatTransport = {
      getOwnMemberNumber: () => 10,
      getMemberName: (memberNumber) => `Member ${memberNumber}`,
      sendKikiLinkProtocol: (target, payload) => sent.push({ target, payload }),
      isKnownFriend: () => true,
      isMemberInCurrentRoom: () => true,
      getPlayerRelationships: () => [],
    };
    const service = new GroupChatService(transport, new MemoryKeyValueStorage(), {
      now: () => 1_000_000,
      idFactory: (prefix) => `${prefix}_missingrel`,
    });
    const creation = await service.createGroup([20, 30], "Known relationships");
    sent.splice(0);
    delete transport.getPlayerRelationships;

    const result = await service.sendMessage(
      creation.group.groupId,
      "Missing relationship data must not leave this browser",
    );

    expect(result.persisted).toBe(false);
    expect(result.handedOffTo).toEqual([]);
    expect(result.unreachable).toEqual([20, 30]);
    expect(sent).toEqual([]);
    expect(service.getMessages(creation.group.groupId)).toEqual([]);

    const missingAtCreation = new GroupChatService(transport, new MemoryKeyValueStorage(), {
      now: () => 1_000_000,
      idFactory: (prefix) => `${prefix}_missingcreate`,
    });
    await expect(missingAtCreation.createGroup([20, 30], "No relationship reader"))
      .rejects.toThrow(/blocked or ghosted/u);
    expect(sent).toEqual([]);

    await service.destroy();
    await missingAtCreation.destroy();
  });

  it("requires every remote creator selection to be a known friend at the service boundary", async () => {
    const roomOnly = setup();
    roomOnly.friends.delete(30);
    roomOnly.room.add(30);
    await expect(roomOnly.service.createGroup([20, 30], "Room is not trust"))
      .rejects.toThrow(/known BC friend/u);

    const withoutFriendSignal = new GroupChatService({
      getOwnMemberNumber: () => 10,
      getMemberName: (memberNumber) => `Member ${memberNumber}`,
      sendKikiLinkProtocol: () => undefined,
      isMemberInCurrentRoom: () => true,
      getPlayerRelationships: () => [],
    }, new MemoryKeyValueStorage());
    await expect(withoutFriendSignal.createGroup([20, 30], "Missing trust callback"))
      .rejects.toThrow(/known BC friend/u);

    const guardedFriendSignal = new GroupChatService({
      getOwnMemberNumber: () => 10,
      getMemberName: (memberNumber) => `Member ${memberNumber}`,
      sendKikiLinkProtocol: () => undefined,
      isKnownFriend: () => {
        throw new Error("guarded friend object");
      },
      isMemberInCurrentRoom: () => true,
      getPlayerRelationships: () => [],
    }, new MemoryKeyValueStorage());
    await expect(guardedFriendSignal.createGroup([20, 30], "Guarded trust callback"))
      .rejects.toThrow(/known BC friend/u);

    await withoutFriendSignal.destroy();
    await guardedFriendSignal.destroy();
  });

  it("auto-accepts invitations only from known friends and fails closed on relationship guards", async () => {
    const harness = setup();
    harness.friends.delete(30);

    expect(await harness.service.receiveProtocol({ senderNumber: 30, payload: invite() })).toBe(false);
    expect(harness.service.listGroups()).toEqual([]);

    harness.room.add(30);
    expect(await harness.service.receiveProtocol({ senderNumber: 30, payload: invite() })).toBe(false);
    expect(harness.service.listGroups()).toEqual([]);

    for (let index = 0; index < GROUP_MAX_COUNT; index += 1) {
      const senderNumber = 100 + index;
      harness.room.add(senderNumber);
      expect(await harness.service.receiveProtocol({
        senderNumber,
        payload: invite(
          `group_room${index.toString(36).padStart(8, "0")}`,
          [10, 30, senderNumber],
        ),
      })).toBe(false);
    }
    expect(harness.service.listGroups()).toEqual([]);

    const friendHarness = setup();
    expect(await friendHarness.service.receiveProtocol({ senderNumber: 20, payload: invite() })).toBe(true);

    const guardedHarness = setup();
    guardedHarness.setRelationshipReadFailure(true);
    expect(await guardedHarness.service.receiveProtocol({ senderNumber: 20, payload: invite() }))
      .toBe(false);
    expect(guardedHarness.service.listGroups()).toEqual([]);
  });

  it("permanently fails closed if the adapter changes accounts", async () => {
    const harness = setup();
    const updates = vi.fn();
    harness.service.subscribe(updates);
    const creation = await harness.service.createGroup([20, 30], "Bound account");
    const storedBeforeSwitch = harness.storage.getItem(GROUP_CHAT_STORAGE_KEY);
    updates.mockClear();

    harness.setOwnMemberNumber(99);

    expect(harness.service.listGroups()).toEqual([]);
    expect(harness.service.getGroup(creation.group.groupId)).toBeUndefined();
    expect(harness.service.getMessages(creation.group.groupId)).toEqual([]);
    expect(harness.service.totalUnread()).toBe(0);
    expect(await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: invite("group_accountxx"),
    })).toBe(false);
    await expect(harness.service.sendMessage(creation.group.groupId, "Must not cross accounts"))
      .rejects.toThrow(/different BC account/u);
    await expect(harness.service.createGroup([20, 30], "Wrong account"))
      .rejects.toThrow(/different BC account/u);
    expect(harness.storage.getItem(GROUP_CHAT_STORAGE_KEY)).toBe(storedBeforeSwitch);
    expect(updates).not.toHaveBeenCalled();

    harness.setOwnMemberNumber(10);
    expect(harness.service.listGroups()).toEqual([]);
  });

  it("fails closed for a transient guarded identity read and recovers for the bound account", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Recoverable identity");

    harness.setOwnMemberReadFailure(true);
    expect(harness.service.listGroups()).toEqual([]);
    expect(harness.service.getGroup(creation.group.groupId)).toBeUndefined();
    await expect(harness.service.sendMessage(creation.group.groupId, "Wait for identity"))
      .rejects.toThrow(/different BC account/u);

    harness.setOwnMemberReadFailure(false);
    expect(harness.service.getGroup(creation.group.groupId)).toMatchObject({
      title: "Recoverable identity",
    });
    await expect(harness.service.sendMessage(creation.group.groupId, "Identity restored"))
      .resolves.toMatchObject({ message: { content: "Identity restored" } });
  });

  it("rate-limits invites and messages before storage writes or UI updates, then refills", async () => {
    const invitesHarness = setup();
    const inviteUpdates = vi.fn();
    invitesHarness.service.subscribe(inviteUpdates);
    for (let index = 0; index < GROUP_INVITE_RATE_BURST; index += 1) {
      expect(await invitesHarness.service.receiveProtocol({
        senderNumber: 20,
        payload: invite(`group_rate${index.toString(36).padStart(8, "0")}`),
      })).toBe(true);
    }
    const blockedInvite = invite(
      `group_rate${GROUP_INVITE_RATE_BURST.toString(36).padStart(8, "0")}`,
    );
    const inviteStorageAtLimit = invitesHarness.storage.getItem(GROUP_CHAT_STORAGE_KEY);
    const inviteUpdatesAtLimit = inviteUpdates.mock.calls.length;
    expect(await invitesHarness.service.receiveProtocol({
      senderNumber: 20,
      payload: blockedInvite,
    })).toBe(false);
    expect(invitesHarness.storage.getItem(GROUP_CHAT_STORAGE_KEY)).toBe(inviteStorageAtLimit);
    expect(inviteUpdates).toHaveBeenCalledTimes(inviteUpdatesAtLimit);

    invitesHarness.setNow(1_000_000 + GROUP_INVITE_RATE_REFILL_MS);
    expect(await invitesHarness.service.receiveProtocol({
      senderNumber: 20,
      payload: blockedInvite,
    })).toBe(true);

    const messagesHarness = setup();
    await messagesHarness.service.receiveProtocol({ senderNumber: 20, payload: invite() });
    const messageUpdates = vi.fn();
    messagesHarness.service.subscribe(messageUpdates);
    const perOriginBurst = 12;
    for (let index = 0; index < perOriginBurst; index += 1) {
      expect(await messagesHarness.service.receiveProtocol({
        senderNumber: 20,
        payload: message(
          "group_aaaaaaaa",
          `gmsg_rate${index.toString(36).padStart(8, "0")}`,
          `Burst ${index}`,
        ),
      })).toBe(true);
    }
    const blockedMessage = message(
      "group_aaaaaaaa",
      `gmsg_rate${perOriginBurst.toString(36).padStart(8, "0")}`,
      "Over the burst",
    );
    const messageStorageAtLimit = messagesHarness.storage.getItem(GROUP_CHAT_STORAGE_KEY);
    const messageUpdatesAtLimit = messageUpdates.mock.calls.length;
    expect(await messagesHarness.service.receiveProtocol({
      senderNumber: 20,
      payload: blockedMessage,
    })).toBe(false);
    expect(messagesHarness.storage.getItem(GROUP_CHAT_STORAGE_KEY)).toBe(messageStorageAtLimit);
    expect(messageUpdates).toHaveBeenCalledTimes(messageUpdatesAtLimit);

    messagesHarness.setNow(1_000_000 + 500);
    expect(await messagesHarness.service.receiveProtocol({
      senderNumber: 20,
      payload: blockedMessage,
    })).toBe(true);
  });

  it("rejects spoofed, foreign, mutated, blocked, and ghosted group packets", async () => {
    const harness = setup();

    const thirdPartyBlocked = setup();
    thirdPartyBlocked.blocked.add(30);
    expect(await thirdPartyBlocked.service.receiveProtocol({
      senderNumber: 20,
      payload: invite(),
    })).toBe(false);
    expect(thirdPartyBlocked.service.listGroups()).toEqual([]);

    expect(await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: invite("group_bbbbbbbb", [10, 30, 40]),
    })).toBe(false);
    expect(await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: invite("group_bbbbbbbb", [20, 30, 40]),
    })).toBe(false);
    harness.blocked.add(20);
    expect(await harness.service.receiveProtocol({ senderNumber: 20, payload: invite() })).toBe(false);
    harness.blocked.delete(20);
    expect(await harness.service.receiveProtocol({ senderNumber: 20, payload: invite() })).toBe(true);

    expect(await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: invite("group_aaaaaaaa", [10, 20, 40], "Changed membership"),
    })).toBe(false);
    expect(await harness.service.receiveProtocol({
      senderNumber: 99,
      payload: message("group_aaaaaaaa", "gmsg_bbbbbbbb", "Not a member"),
    })).toBe(false);
    harness.blocked.add(30);
    expect(await harness.service.receiveProtocol({
      senderNumber: 30,
      payload: message("group_aaaaaaaa", "gmsg_cccccccc", "Blocked member"),
    })).toBe(false);
  });

  it("accepts creator-authoritative display names but rejects name and relay spoofing", async () => {
    const recipient = setup(new MemoryKeyValueStorage(), 30);
    expect(await recipient.service.receiveProtocol({
      senderNumber: 20,
      payload: invite(),
    })).toBe(true);

    expect(await recipient.service.receiveProtocol({
      senderNumber: 10,
      payload: names(),
    })).toBe(false);
    expect(await recipient.service.receiveProtocol({
      senderNumber: 20,
      payload: names("group_aaaaaaaa", [[10, "Kiki"], [20, "Reina"], [40, "Luna"]]),
    })).toBe(false);
    expect(await recipient.service.receiveProtocol({
      senderNumber: 20,
      payload: names("group_aaaaaaaa", [[10, "Spruce"], [20, "Rose"], [30, "Violet"]]),
    })).toBe(true);
    expect(recipient.service.getGroup("group_aaaaaaaa")?.memberNames).toEqual({
      10: "Spruce",
      20: "Rose",
      30: "Violet",
    });

    expect(await recipient.service.receiveProtocol({
      senderNumber: 10,
      payload: relay("group_aaaaaaaa", 20, "gmsg_spoof001", "Wrong relay sender"),
    })).toBe(false);
    expect(await recipient.service.receiveProtocol({
      senderNumber: 20,
      payload: relay("group_aaaaaaaa", 20, "gmsg_spoof002", "Creator cannot be origin"),
    })).toBe(false);
    expect(await recipient.service.receiveProtocol({
      senderNumber: 20,
      payload: relay("group_aaaaaaaa", 99, "gmsg_spoof003", "Foreign origin"),
    })).toBe(false);
    expect(await recipient.service.receiveProtocol({
      senderNumber: 20,
      payload: relay("group_aaaaaaaa", 30, "gmsg_spoof004", "Local origin"),
    })).toBe(false);
    recipient.blocked.add(10);
    expect(await recipient.service.receiveProtocol({
      senderNumber: 20,
      payload: relay("group_aaaaaaaa", 10, "gmsg_spoof005", "Blocked origin"),
    })).toBe(false);
    recipient.blocked.delete(10);
    expect(await recipient.service.receiveProtocol({
      senderNumber: 20,
      payload: relay("group_aaaaaaaa", 10, "gmsg_relay001", "Valid relay"),
    })).toBe(true);
    expect(await recipient.service.receiveProtocol({
      senderNumber: 20,
      payload: relay("group_aaaaaaaa", 10, "gmsg_relay001", "Replay"),
    })).toBe(false);
    expect(recipient.service.getMessages("group_aaaaaaaa")).toMatchObject([
      { id: "gmsg_relay001", senderNumber: 10, content: "Valid relay" },
    ]);
    expect(recipient.sent).toEqual([]);
  });

  it("reports creator relay as best-effort and distinguishes unreachable recipients", async () => {
    const participant = setup(new MemoryKeyValueStorage(), 20);
    participant.friends.clear();
    participant.friends.add(10);
    expect(await participant.service.receiveProtocol({
      senderNumber: 10,
      payload: invite(),
    })).toBe(true);
    participant.sent.splice(0);

    const routed = await participant.service.sendMessage("group_aaaaaaaa", "Across rooms");
    expect(routed).toMatchObject({
      persisted: true,
      handedOffTo: [10],
      failed: [],
      relayViaCreator: 10,
      relayTargets: [30],
      unreachable: [],
    });
    expect(participant.sent).toHaveLength(1);
    expect(parseGroupChatPacket(participant.sent[0]!.payload)).toMatchObject({ t: "gm" });

    participant.failed.add(10);
    const unreachable = await participant.service.sendMessage("group_aaaaaaaa", "Creator offline");
    expect(unreachable.persisted).toBe(false);
    expect(unreachable.relayViaCreator).toBeUndefined();
    expect(unreachable.relayTargets).toBeUndefined();
    expect(unreachable.unreachable).toEqual([10, 30]);
    expect(unreachable.failed).toEqual(expect.arrayContaining([
      expect.objectContaining({ memberNumber: 10 }),
      expect.objectContaining({ memberNumber: 30, message: expect.stringMatching(/could not relay/u) }),
    ]));
  });

  it("does not let creator relay bypass an author's local block", async () => {
    const participant = setup(new MemoryKeyValueStorage(), 20);
    participant.friends.clear();
    participant.friends.add(10);
    expect(await participant.service.receiveProtocol({ senderNumber: 10, payload: invite() }))
      .toBe(true);
    participant.sent.splice(0);
    participant.blocked.add(30);

    const result = await participant.service.sendMessage(
      "group_aaaaaaaa",
      "Must not reach the blocked participant",
    );

    expect(result.persisted).toBe(false);
    expect(result.handedOffTo).toEqual([]);
    expect(result.relayTargets).toBeUndefined();
    expect(result.unreachable).toEqual([10, 30]);
    expect(result.failed).toEqual(expect.arrayContaining([
      expect.objectContaining({ memberNumber: 10, message: expect.stringMatching(/relay is disabled/u) }),
      expect.objectContaining({ memberNumber: 30, message: expect.stringMatching(/blocked or ghosted/u) }),
    ]));
    expect(participant.sent).toEqual([]);
  });

  it("delivers between nonfriends outside the room through one creator hop and shares names", async () => {
    vi.useFakeTimers();
    const network = new TestGroupNetwork();
    try {
      const creator = network.addClient(10, [20, 30], "creator-room");
      const birch = network.addClient(20, [10], "birch-room");
      const clover = network.addClient(30, [10], "clover-room");
      const creation = await creator.service.createGroup([20, 30], "Relay garden");
      await network.flush();

      expect(birch.service.getGroup(creation.group.groupId)?.memberNames[30]).toBe("Clover");
      expect(clover.service.getGroup(creation.group.groupId)?.memberNames[20]).toBe("Birch");
      network.handedOff.splice(0);

      const sent = await birch.service.sendMessage(creation.group.groupId, "Hello, Clover");
      expect(sent).toMatchObject({
        persisted: true,
        handedOffTo: [10],
        relayViaCreator: 10,
        relayTargets: [30],
        unreachable: [],
      });
      await network.flush();
      expect(creator.service.getMessages(creation.group.groupId)).toMatchObject([
        { senderNumber: 20, content: "Hello, Clover" },
      ]);
      expect(clover.service.getMessages(creation.group.groupId)).toEqual([]);

      await vi.advanceTimersByTimeAsync(GROUP_RELAY_INTERVAL_MS);
      await network.flush();
      expect(clover.service.getMessages(creation.group.groupId)).toMatchObject([
        { id: sent.message.id, senderNumber: 20, senderName: "Birch", content: "Hello, Clover" },
      ]);
      expect(network.packets("gm")).toHaveLength(1);
      expect(network.packets("gr")).toHaveLength(1);
      expect(network.packets("gr")[0]).toMatchObject({ sender: 10, target: 30 });
      expect(parseGroupChatPacket(network.packets("gr")[0]!.payload)).toMatchObject({
        t: "gr",
        o: 20,
        i: sent.message.id,
      });
      expect(network.queued).toEqual([]);
    } finally {
      await network.destroy();
      vi.useRealTimers();
    }
  });

  it("deduplicates a same-room direct message against the creator relay without loops", async () => {
    vi.useFakeTimers();
    const network = new TestGroupNetwork();
    try {
      const creator = network.addClient(10, [20, 30], "creator-room");
      const birch = network.addClient(20, [10], "shared-room");
      const clover = network.addClient(30, [10], "shared-room");
      const creation = await creator.service.createGroup([20, 30], "Dedupe garden");
      await network.flush();
      network.handedOff.splice(0);

      const sent = await birch.service.sendMessage(creation.group.groupId, "One logical message");
      expect(sent.handedOffTo).toEqual([10, 30]);
      expect(sent.relayTargets).toBeUndefined();
      await network.flush();
      expect(clover.service.getMessages(creation.group.groupId)).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(GROUP_RELAY_INTERVAL_MS);
      await network.flush();
      expect(network.packets("gr")).toHaveLength(1);
      expect(clover.service.getMessages(creation.group.groupId)).toMatchObject([
        { id: sent.message.id, content: "One logical message" },
      ]);
      expect(network.queued).toEqual([]);
    } finally {
      await network.destroy();
      vi.useRealTimers();
    }
  });

  it("bounds and rate-limits the creator relay queue", async () => {
    vi.useFakeTimers();
    try {
      const creator = setup();
      const creation = await creator.service.createGroup([20, 30, 40, 50], "Busy relay");
      creator.sent.splice(0);

      for (let index = 0; index < 20; index += 1) {
        const origin = index % 2 === 0 ? 20 : 30;
        expect(await creator.service.receiveProtocol({
          senderNumber: origin,
          payload: message(
            creation.group.groupId,
            `gmsg_queue${index.toString(36).padStart(8, "0")}`,
            `Queued ${index}`,
          ),
        })).toBe(true);
      }
      expect(await creator.service.receiveProtocol({
        senderNumber: 40,
        payload: message(creation.group.groupId, "gmsg_queuefull", "Over aggregate limit"),
      })).toBe(false);
      expect(creator.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gr"))
        .toHaveLength(0);

      expect(GROUP_RELAY_INTERVAL_MS).toBeGreaterThanOrEqual(200);
      await vi.advanceTimersByTimeAsync(GROUP_RELAY_INTERVAL_MS - 1);
      expect(creator.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gr"))
        .toHaveLength(0);
      await vi.advanceTimersByTimeAsync(1);
      expect(creator.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gr"))
        .toHaveLength(1);
      await vi.advanceTimersByTimeAsync(GROUP_RELAY_INTERVAL_MS - 1);
      expect(creator.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gr"))
        .toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(creator.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gr"))
        .toHaveLength(2);
      await vi.advanceTimersByTimeAsync(GROUP_RELAY_INTERVAL_MS * (GROUP_RELAY_QUEUE_CAPACITY - 2));

      const relays = creator.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gr");
      expect(relays).toHaveLength(GROUP_RELAY_QUEUE_CAPACITY);
      expect(relays.every(({ payload }) => payload.length <= GROUP_PACKET_MAX_CHARS)).toBe(true);
      expect(relays.every(({ target, payload }) => {
        const packet = parseGroupChatPacket(payload);
        return packet?.t === "gr" && packet.o !== target;
      })).toBe(true);
      await creator.service.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("expires queued relays and cancels them synchronously on destroy", async () => {
    vi.useFakeTimers();
    try {
      const expired = setup();
      const expiredGroup = await expired.service.createGroup([20, 30], "Expiry");
      expired.sent.splice(0);
      expect(await expired.service.receiveProtocol({
        senderNumber: 20,
        payload: message(expiredGroup.group.groupId, "gmsg_expires01", "Too old to relay"),
      })).toBe(true);
      expired.setNow(1_000_000 + GROUP_RELAY_TTL_MS);
      await vi.advanceTimersByTimeAsync(GROUP_RELAY_INTERVAL_MS);
      expect(expired.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gr"))
        .toHaveLength(0);
      await expired.service.destroy();

      const closing = setup();
      const closingGroup = await closing.service.createGroup([20, 30], "Closing");
      closing.sent.splice(0);
      expect(await closing.service.receiveProtocol({
        senderNumber: 20,
        payload: message(closingGroup.group.groupId, "gmsg_destroy1", "Cancelled"),
      })).toBe(true);
      await closing.service.destroy();
      await vi.advanceTimersByTimeAsync(GROUP_RELAY_INTERVAL_MS * 2);
      expect(closing.sent.filter(({ payload }) => parseGroupChatPacket(payload)?.t === "gr"))
        .toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("never relays a relay packet or amplifies it at the creator", async () => {
    vi.useFakeTimers();
    try {
      const creator = setup();
      const creation = await creator.service.createGroup([20, 30], "No loops");
      creator.sent.splice(0);
      expect(await creator.service.receiveProtocol({
        senderNumber: 20,
        payload: relay(
          creation.group.groupId,
          30,
          "gmsg_noloop01",
          "A participant cannot submit relay envelopes",
        ),
      })).toBe(false);
      await vi.advanceTimersByTimeAsync(GROUP_RELAY_INTERVAL_MS * 2);
      expect(creator.sent).toEqual([]);
      await creator.service.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("deduplicates messages, clamps hostile time, and respects the active group", async () => {
    const harness = setup();
    await harness.service.receiveProtocol({ senderNumber: 20, payload: invite() });

    expect(await harness.service.receiveProtocol({
      senderNumber: 30,
      payload: message("group_aaaaaaaa", "gmsg_aaaaaaaa", "First", 8_640_000_000_000_000),
    })).toBe(true);
    expect(await harness.service.receiveProtocol({
      senderNumber: 30,
      payload: message("group_aaaaaaaa", "gmsg_aaaaaaaa", "Replay", 1_000_000),
    })).toBe(false);
    expect(harness.service.getMessages("group_aaaaaaaa")).toMatchObject([
      { content: "First", sentAt: 1_000_000, senderNumber: 30, read: false },
    ]);
    expect(harness.service.getGroup("group_aaaaaaaa")?.unread).toBe(1);

    expect(await harness.service.receiveProtocol(
      {
        senderNumber: 20,
        payload: message("group_aaaaaaaa", "gmsg_bbbbbbbb", "While open", 1_000_001),
      },
      "group_aaaaaaaa",
    )).toBe(true);
    expect(harness.service.getGroup("group_aaaaaaaa")?.unread).toBe(1);
  });

  it("serializes concurrent senders without losing messages or unread counts", async () => {
    const harness = setup();
    await harness.service.receiveProtocol({ senderNumber: 20, payload: invite() });
    const receives = Array.from({ length: 20 }, (_, index) =>
      harness.service.receiveProtocol({
        senderNumber: index % 2 === 0 ? 20 : 30,
        payload: message(
          "group_aaaaaaaa",
          `gmsg_${index.toString(36).padStart(8, "0")}`,
          `Message ${index}`,
          1_000_000 + index,
        ),
      }),
    );

    expect((await Promise.all(receives)).every(Boolean)).toBe(true);
    expect(harness.service.getMessages("group_aaaaaaaa")).toHaveLength(20);
    expect(harness.service.getGroup("group_aaaaaaaa")).toMatchObject({
      unread: 20,
      lastMessage: "Message 19",
      lastSenderNumber: 30,
    });
  });

  it("multicasts one stable message ID and reports partial delivery honestly", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Core Team");
    harness.sent.splice(0);
    harness.failed.add(30);

    const result = await harness.service.sendMessage(creation.group.groupId, "Hello everyone");

    expect(result.persisted).toBe(true);
    expect(result.handedOffTo).toEqual([20]);
    expect(result.failed).toEqual([{ memberNumber: 30, message: "Member 30 is offline" }]);
    expect(harness.sent).toHaveLength(5);
    const messagePackets = harness.sent.filter(
      (packet) => parseGroupChatPacket(packet.payload)?.t === "gm",
    );
    expect(messagePackets).toHaveLength(2);
    expect(messagePackets[0]?.payload).toBe(messagePackets[1]?.payload);
    expect(parseGroupChatPacket(messagePackets[0]!.payload)).toMatchObject({
      t: "gm",
      i: result.message.id,
      c: "Hello everyone",
    });
    expect(harness.service.getMessages(creation.group.groupId)).toMatchObject([
      { id: result.message.id, direction: "outgoing", content: "Hello everyone" },
    ]);
  });

  it("lets only the creator periodically resend the immutable invite before a message", async () => {
    const creator = setup();
    const creation = await creator.service.createGroup([20, 30], "Repair group");
    creator.sent.splice(0);

    await creator.service.sendMessage(creation.group.groupId, "First");
    expect(creator.sent.map((packet) => parseGroupChatPacket(packet.payload)?.t)).toEqual([
      "gi", "gi", "gn", "gn", "gm", "gm",
    ]);

    creator.sent.splice(0);
    await creator.service.sendMessage(creation.group.groupId, "Second");
    expect(creator.sent.map((packet) => parseGroupChatPacket(packet.payload)?.t)).toEqual([
      "gm", "gm",
    ]);

    creator.setNow(1_060_000);
    creator.sent.splice(0);
    await creator.service.sendMessage(creation.group.groupId, "After repair interval");
    expect(creator.sent.map((packet) => parseGroupChatPacket(packet.payload)?.t)).toEqual([
      "gi", "gi", "gn", "gn", "gm", "gm",
    ]);

    const participant = setup();
    await participant.service.receiveProtocol({ senderNumber: 20, payload: invite() });
    participant.sent.splice(0);
    await participant.service.sendMessage("group_aaaaaaaa", "Participant message");
    expect(participant.sent.map((packet) => parseGroupChatPacket(packet.payload)?.t)).toEqual([
      "gm", "gm",
    ]);
  });

  it("does not add an outgoing message when every recipient delivery fails", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30]);
    harness.failed.add(20);
    harness.failed.add(30);

    const result = await harness.service.sendMessage(creation.group.groupId, "Nobody receives this");

    expect(result.persisted).toBe(false);
    expect(result.handedOffTo).toEqual([]);
    expect(result.failed).toHaveLength(2);
    expect(harness.service.getMessages(creation.group.groupId)).toEqual([]);
  });

  it("supports read, draft, pin, prune, remove tombstones, and clear", async () => {
    const harness = setup();
    const updates = vi.fn();
    harness.service.subscribe(updates);
    await harness.service.receiveProtocol({ senderNumber: 20, payload: invite() });
    await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: message("group_aaaaaaaa", "gmsg_aaaaaaaa", "Old", 999_999),
    });
    harness.setNow(1_000_010);
    await harness.service.receiveProtocol({
      senderNumber: 30,
      payload: message("group_aaaaaaaa", "gmsg_bbbbbbbb", "New", 1_000_010),
    });

    expect(await harness.service.setDraft("group_aaaaaaaa", "  draft\ntext  ")).toBe("  draft\ntext  ");
    expect(await harness.service.togglePinned("group_aaaaaaaa")).toBe(true);
    await harness.service.markRead("group_aaaaaaaa");
    expect(harness.service.getGroup("group_aaaaaaaa")).toMatchObject({
      draft: "  draft\ntext  ",
      pinned: true,
      unread: 0,
    });
    expect(harness.service.getMessages("group_aaaaaaaa").every((item) => item.read)).toBe(true);

    expect(await harness.service.prune(1_000_000)).toBe(1);
    expect(harness.service.getMessages("group_aaaaaaaa")).toMatchObject([{ content: "New" }]);
    expect(await harness.service.removeGroup("group_aaaaaaaa")).toBe(true);
    expect(harness.service.getGroup("group_aaaaaaaa")).toBeUndefined();
    expect(await harness.service.receiveProtocol({ senderNumber: 20, payload: invite() })).toBe(false);

    const reloaded = setup(harness.storage).service;
    expect(await reloaded.receiveProtocol({ senderNumber: 20, payload: invite() })).toBe(false);
    await expect(reloaded.clear()).resolves.toBe(true);
    expect(await reloaded.receiveProtocol({ senderNumber: 20, payload: invite() })).toBe(true);
    expect(updates).toHaveBeenCalledWith(expect.objectContaining({ kind: "group-removed" }));
  });

  it("trailing-debounces a burst of high-frequency mutations into one storage write", async () => {
    vi.useFakeTimers();
    try {
      const storage = new ControlledStorage();
      const harness = setup(storage, 10, 300);
      const creation = await harness.service.createGroup([20, 30], "Busy group");

      for (let index = 0; index < 80; index += 1) {
        await harness.service.setDraft(creation.group.groupId, `draft ${index}`);
      }

      expect(storage.writes).toBe(0);
      expect(harness.service.getPersistenceState()).toEqual({
        degraded: false,
        pendingChanges: true,
      });
      await vi.advanceTimersByTimeAsync(250);
      await harness.service.setDraft(creation.group.groupId, "last trailing draft");
      await vi.advanceTimersByTimeAsync(299);
      expect(storage.writes).toBe(0);
      await vi.advanceTimersByTimeAsync(1);
      expect(storage.writes).toBe(1);
      expect(JSON.parse(storage.getItem(GROUP_CHAT_STORAGE_KEY)!) as unknown).toMatchObject({
        groups: [expect.objectContaining({ draft: "last trailing draft" })],
      });
      expect(harness.service.getPersistenceState()).toEqual({
        degraded: false,
        pendingChanges: false,
      });
      await harness.service.destroy();
      expect(storage.writes).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("bounds a continuously extended persistence debounce by the max-wait deadline", async () => {
    vi.useFakeTimers();
    try {
      const storage = new ControlledStorage();
      const harness = setup(storage, 10, 300);
      const creation = await harness.service.createGroup([20, 30], "Continuous group");

      for (let index = 1; index <= 7; index += 1) {
        await vi.advanceTimersByTimeAsync(250);
        await harness.service.setDraft(creation.group.groupId, `continuous ${index}`);
        expect(storage.writes).toBe(0);
      }

      await vi.advanceTimersByTimeAsync(GROUP_PERSISTENCE_MAX_WAIT_MS - 1_750 - 1);
      expect(storage.writes).toBe(0);
      await vi.advanceTimersByTimeAsync(1);
      expect(storage.writes).toBe(1);
      expect(JSON.parse(storage.getItem(GROUP_CHAT_STORAGE_KEY)!) as unknown).toMatchObject({
        groups: [expect.objectContaining({ draft: "continuous 7" })],
      });

      // The max-wait flush must cancel the still-pending trailing callback.
      await vi.advanceTimersByTimeAsync(300);
      expect(storage.writes).toBe(1);
      await harness.service.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps failed pagehide state dirty for a later lifecycle flush without stale timers", async () => {
    vi.useFakeTimers();
    try {
      const storage = new ControlledStorage();
      storage.available = false;
      storage.silentFailure = true;
      const harness = setup(storage, 10, 300);
      const creation = await harness.service.createGroup([20, 30], "Lifecycle retry");
      await harness.service.setDraft(creation.group.groupId, "must survive");

      expect(harness.service.flushNow()).toEqual({
        degraded: true,
        pendingChanges: true,
      });
      expect(storage.writes).toBe(1);
      await vi.advanceTimersByTimeAsync(GROUP_PERSISTENCE_MAX_WAIT_MS + 300);
      expect(storage.writes).toBe(1);

      storage.available = true;
      await expect(harness.service.destroy()).resolves.toEqual({
        degraded: false,
        pendingChanges: false,
      });
      expect(storage.writes).toBe(2);
      expect(storage.getItem(GROUP_CHAT_STORAGE_KEY)).toContain("must survive");
      await vi.advanceTimersByTimeAsync(GROUP_PERSISTENCE_MAX_WAIT_MS + 300);
      expect(storage.writes).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("flushes pending state on destroy and closes the service to later mutations", async () => {
    const storage = new MemoryKeyValueStorage();
    const harness = setup(storage, 10, 5_000);
    await harness.service.createGroup([20, 30], "Lifecycle group");
    expect(storage.getItem(GROUP_CHAT_STORAGE_KEY)).toBeNull();

    await expect(harness.service.destroy()).resolves.toEqual({
      degraded: false,
      pendingChanges: false,
    });
    expect(storage.getItem(GROUP_CHAT_STORAGE_KEY)).not.toBeNull();
    await expect(harness.service.createGroup([20, 30], "Too late")).rejects.toThrow(/closed/u);
  });

  it("surfaces silent storage denial and reports recovery without throwing", async () => {
    const storage = new ControlledStorage();
    storage.available = false;
    storage.silentFailure = true;
    const harness = setup(storage, 10, 5_000);
    const updates = vi.fn();
    harness.service.subscribe(updates);
    const creation = await harness.service.createGroup([20, 30], "Session only");

    expect(() => harness.service.flushNow()).not.toThrow();
    expect(harness.service.getPersistenceState()).toEqual({
      degraded: true,
      pendingChanges: true,
    });
    expect(updates).toHaveBeenCalledWith({
      kind: "persistence",
      state: { degraded: true, pendingChanges: true },
    });

    storage.available = true;
    await harness.service.setDraft(creation.group.groupId, "retry this");
    await expect(harness.service.flush()).resolves.toEqual({
      degraded: false,
      pendingChanges: false,
    });
    expect(updates).toHaveBeenCalledWith({
      kind: "persistence",
      state: { degraded: false, pendingChanges: false },
    });
    expect(storage.getItem(GROUP_CHAT_STORAGE_KEY)).toContain("retry this");
    await harness.service.destroy();
  });

  it.each([
    ["malformed", "{not valid json"],
    ["unsupported", JSON.stringify({
      version: 2,
      groups: [],
      messages: [],
      tombstones: [],
      messageTombstones: [],
    })],
    ["oversized collection", JSON.stringify({
      version: 1,
      groups: [],
      messages: [],
      tombstones: Array.from({ length: 61 }, (_, index) => ({
        groupId: `group_${index.toString(36).padStart(8, "0")}`,
        removedAt: 1_000_000 + index,
      })),
      messageTombstones: [],
    })],
    ["out-of-range timestamp", JSON.stringify({
      version: 1,
      groups: [{
        groupId: "group_aaaaaaaa",
        title: "Impossible date",
        creatorNumber: 10,
        memberNumbers: [10, 20, 30],
        memberNames: { 10: "Kiki", 20: "Reina", 30: "Mina" },
        createdAt: 8_640_000_000_000_001,
        updatedAt: 8_640_000_000_000_001,
        lastMessage: "",
        lastMessageAt: 0,
        unread: 0,
        pinned: false,
        draft: "",
      }],
      messages: [],
      tombstones: [],
      messageTombstones: [],
    })],
  ])("preserves %s nonempty storage until an explicit clear", async (_kind, raw) => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem(GROUP_CHAT_STORAGE_KEY, raw);
    const harness = setup(storage);

    expect(harness.service.getPersistenceState()).toEqual({
      degraded: true,
      pendingChanges: false,
    });
    await expect(harness.service.createGroup([20, 30], "Session group")).rejects.toThrow(
      /storage is unavailable or unsupported/u,
    );
    await expect(harness.service.flush()).resolves.toEqual({
      degraded: true,
      pendingChanges: false,
    });
    expect(storage.getItem(GROUP_CHAT_STORAGE_KEY)).toBe(raw);

    await expect(harness.service.clear()).resolves.toBe(true);
    expect(storage.getItem(GROUP_CHAT_STORAGE_KEY)).toBeNull();
    expect(harness.service.getPersistenceState()).toEqual({
      degraded: false,
      pendingChanges: false,
    });
  });

  it("restores valid old state before mutations resume after an account-storage read failure", async () => {
    const backing = new ControlledStorage();
    const account = new AccountDataStorage(10, backing);
    const seeded = setup(account, 10, 5_000);
    const existing = await seeded.service.createGroup([20, 30], "Existing history");
    await seeded.service.flush();
    await seeded.service.destroy();
    const scopedKey = `kikilink:account:10:${GROUP_CHAT_STORAGE_KEY}`;
    const storedBeforeFailure = backing.getItem(scopedKey);
    const writesBeforeFailure = backing.writes;

    backing.readable = false;
    const harness = setup(account, 10, 5_000);

    expect(harness.service.getPersistenceState()).toEqual({
      degraded: true,
      pendingChanges: false,
    });
    await expect(harness.service.createGroup([20, 40], "Must wait")).rejects.toThrow(
      /storage is unavailable or unsupported/u,
    );
    expect(backing.writes).toBe(writesBeforeFailure);

    backing.readable = true;
    await expect(harness.service.flush()).resolves.toEqual({
      degraded: false,
      pendingChanges: false,
    });
    expect(harness.service.getGroup(existing.group.groupId)).toMatchObject({
      title: "Existing history",
    });
    expect(backing.getItem(scopedKey)).toBe(storedBeforeFailure);

    await harness.service.createGroup([20, 40], "After recovery");
    await harness.service.flush();
    const recovered = JSON.parse(backing.getItem(scopedKey)!) as {
      groups: Array<{ title: string }>;
    };
    expect(recovered.groups.map(({ title }) => title).sort()).toEqual([
      "After recovery",
      "Existing history",
    ]);
    await harness.service.destroy();
    await account.destroy();
  });

  it("reports a silent clear failure, survives reload honestly, and retries an empty state", async () => {
    const storage = new ControlledStorage();
    const initial = setup(storage);
    const creation = await initial.service.createGroup([20, 30], "Saved group");
    await initial.service.flush();
    const storedBeforeClear = storage.getItem(GROUP_CHAT_STORAGE_KEY);

    storage.available = false;
    storage.silentFailure = true;
    const clearing = setup(storage).service;
    expect(clearing.getGroup(creation.group.groupId)).toBeDefined();
    await expect(clearing.clear()).resolves.toBe(false);
    expect(clearing.listGroups()).toEqual([]);
    expect(clearing.getPersistenceState()).toEqual({
      degraded: true,
      pendingChanges: true,
    });
    expect(storage.getItem(GROUP_CHAT_STORAGE_KEY)).toBe(storedBeforeClear);
    expect(setup(storage).service.getGroup(creation.group.groupId)).toBeDefined();

    storage.available = true;
    await expect(clearing.flush()).resolves.toEqual({
      degraded: false,
      pendingChanges: false,
    });
    expect(setup(storage).service.listGroups()).toEqual([]);
  });

  it("persists replay IDs only after their visible messages are pruned", async () => {
    const storage = new MemoryKeyValueStorage();
    const harness = setup(storage);
    await harness.service.receiveProtocol({ senderNumber: 20, payload: invite() });
    await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: message("group_aaaaaaaa", "gmsg_aaaaaaaa", "Old", 999_999),
    });
    await harness.service.receiveProtocol({
      senderNumber: 30,
      payload: message("group_aaaaaaaa", "gmsg_bbbbbbbb", "Current", 1_000_000),
    });
    await harness.service.flush();

    const beforePrune = JSON.parse(storage.getItem(GROUP_CHAT_STORAGE_KEY)!) as {
      messageTombstones: Array<{ messageId: string }>;
    };
    expect(beforePrune.messageTombstones).toEqual([]);

    expect(await harness.service.prune(1_000_000)).toBe(1);
    const afterPrune = JSON.parse(storage.getItem(GROUP_CHAT_STORAGE_KEY)!) as {
      messages: Array<{ id: string }>;
      messageTombstones: Array<{ messageId: string }>;
    };
    expect(afterPrune.messages.map(({ id }) => id)).toEqual(["gmsg_bbbbbbbb"]);
    expect(afterPrune.messageTombstones).toEqual([
      expect.objectContaining({ messageId: "gmsg_aaaaaaaa" }),
    ]);
    expect(await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: message("group_aaaaaaaa", "gmsg_aaaaaaaa", "Replay"),
    })).toBe(false);
  });

  it("caps stored groups and messages without disturbing immutable membership", async () => {
    const harness = setup();
    for (let index = 0; index < GROUP_MAX_COUNT; index += 1) {
      await harness.service.createGroup([20, 30], `Group ${index}`);
    }
    expect(harness.service.listGroups()).toHaveLength(GROUP_MAX_COUNT);
    await expect(harness.service.createGroup([20, 30], "One too many")).rejects.toThrow(/up to 30/u);

    const storage = new MemoryKeyValueStorage();
    const initial = setup(storage);
    await initial.service.receiveProtocol({ senderNumber: 20, payload: invite() });
    await initial.service.flush();
    const state = JSON.parse(storage.getItem(GROUP_CHAT_STORAGE_KEY)!) as {
      messages: unknown[];
    };
    state.messages = Array.from({ length: GROUP_MAX_MESSAGES + 12 }, (_, index) => ({
      id: `gmsg_${index.toString(36).padStart(8, "0")}`,
      groupId: "group_aaaaaaaa",
      senderNumber: 20,
      senderName: "Reina",
      direction: "incoming",
      content: `Stored ${index}`,
      sentAt: index + 1,
      read: false,
    }));
    storage.setItem(GROUP_CHAT_STORAGE_KEY, JSON.stringify(state));

    const reloaded = setup(storage).service;
    expect(reloaded.getMessages("group_aaaaaaaa")).toHaveLength(GROUP_MAX_MESSAGES);
    expect(reloaded.getGroup("group_aaaaaaaa")?.memberNumbers).toEqual([10, 20, 30]);
    expect(reloaded.getMessages("group_aaaaaaaa")[0]?.content).toBe("Stored 12");

    const evictedMessageId = `gmsg_${(12).toString(36).padStart(8, "0")}`;
    expect(await reloaded.receiveProtocol({
      senderNumber: 20,
      payload: message("group_aaaaaaaa", "gmsg_zzzzzzzz", "Evicts stored 12"),
    })).toBe(true);
    expect(reloaded.getMessages("group_aaaaaaaa").some(({ id }) => id === evictedMessageId)).toBe(false);
    expect(await reloaded.receiveProtocol({
      senderNumber: 20,
      payload: message("group_aaaaaaaa", evictedMessageId, "Replay after eviction"),
    })).toBe(false);

    await reloaded.flush();
    const reloadedAgain = setup(storage).service;
    expect(await reloadedAgain.receiveProtocol({
      senderNumber: 20,
      payload: message("group_aaaaaaaa", evictedMessageId, "Replay after reload"),
    })).toBe(false);
  });
});
