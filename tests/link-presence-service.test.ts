// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { KikiLinkEvents } from "../src/core/types";
import {
  LinkPresenceService,
  serializeProfileBioPacket,
  serializeProfileDetailsPacket,
  serializePresencePacket,
} from "../src/modules/link-presence/link-presence-service";
import {
  MAX_CACHED_PUBLIC_PROFILE_RICH_AGE_MS,
  PUBLIC_PROFILE_CACHE_KEY,
  ProfileCacheRepository,
} from "../src/storage/profile-cache-repository";

function setup(options: {
  inRoom?: boolean;
  getOwnMemberNumber?: () => number;
  getOnlineFriendNumbers?: () => number[];
  expectedOwnMemberNumber?: number;
  storage?: MemoryKeyValueStorage;
  relationshipReader?: ((memberNumber: number) => string[]) | null;
} = {}) {
  const inRoom = options.inRoom === true;
  const storage = options.storage ?? new MemoryKeyValueStorage();
  const getOwnMemberNumber = options.getOwnMemberNumber ?? (() => 999);
  const relationshipReader = options.relationshipReader === null
    ? undefined
    : options.relationshipReader ?? (() => []);
  const sendKikiLinkProtocol = vi.fn((_memberNumber: number, _payload: string) => "beep" as const);
  const broadcastKikiLinkProtocol = vi.fn((_payload: string) => false);
  const adapter = {
    getOwnMemberNumber,
    getMemberName: (memberNumber: number) => memberNumber === 123 ? "Reina" : `Member ${memberNumber}`,
    refreshOnlineFriends: vi.fn(() => true),
    getOnlineFriends: () => (options.getOnlineFriendNumbers?.() ?? [123]).map(
      (memberNumber) => ({
        memberNumber,
        memberName: memberNumber === 123 ? "Reina" : `Member ${memberNumber}`,
        roomName: "Moon Garden",
        privateRoom: false,
      }),
    ),
    hasOnlineFriendSnapshot: () => true,
    isKnownFriend: (memberNumber: number) => memberNumber === 123 || memberNumber === 456,
    ...(relationshipReader ? { getPlayerRelationships: relationshipReader } : {}),
    isMemberInCurrentRoom: () => inRoom,
    isInChatRoom: () => inRoom,
    getCurrentRoomName: () => (inRoom ? "Moon Garden" : undefined),
    sendKikiLinkProtocol,
    broadcastKikiLinkProtocol,
  } as unknown as BCAdapter;
  const settings = new SettingsStore(storage);
  const bus = new EventBus<KikiLinkEvents>();
  const service = new LinkPresenceService(
    adapter,
    settings,
    bus,
    "0.11.0",
    new ProfileCacheRepository(storage),
    options.expectedOwnMemberNumber,
  );
  return {
    adapter,
    settings,
    bus,
    service,
    sendKikiLinkProtocol,
    broadcastKikiLinkProtocol,
  };
}

afterEach(() => vi.useRealTimers());

describe("LinkPresenceService", () => {
  it("combines native online friends with a truthful offline fallback", () => {
    const { service } = setup();

    expect(service.get(123)).toMatchObject({ status: "online", source: "friend-list" });
    expect(service.get(456)).toMatchObject({ status: "offline", source: "friend-list" });
    expect(service.get(777)).toMatchObject({ status: "unknown", source: "unknown" });
  });

  it("answers compatible presence queries and accepts remote DND state", () => {
    const { bus, service, sendKikiLinkProtocol } = setup();
    service.start();

    expect(service.hasCompatiblePeer(999)).toBe(true);
    expect(service.hasGroupChatPeer(999)).toBe(true);
    expect(service.hasGroupRelayPeer(999)).toBe(true);
    expect(service.hasGroupManagedPeer(999)).toBe(true);
    expect(service.hasCompatiblePeer(123)).toBe(false);

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "request-1" }),
    });
    expect(sendKikiLinkProtocol).toHaveBeenCalledWith(
      123,
      expect.stringContaining('"t":"ps"'),
    );

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "dnd",
        m: "In a scene",
        a: "https://i.imgur.com/reina.png",
        u: Date.now(),
        v: "0.11.0",
      }),
    });
    expect(service.get(123)).toMatchObject({
      status: "dnd",
      source: "kikilink",
      statusMessage: "In a scene",
      avatarUrl: "https://i.imgur.com/reina.png",
    });
    expect(service.get(123).profileFromCache).toBeUndefined();
    expect(service.hasCompatiblePeer(123)).toBe(true);
    expect(service.hasGroupChatPeer(123)).toBe(false);
    expect(service.hasGroupManagedPeer(123)).toBe(false);
    expect(service.hasCompatiblePeer(123, Date.now() + 5 * 60_000 + 1)).toBe(false);
    service.stop();
  });

  it("does not answer a blacklisted peer and purges its live and cached profile state", () => {
    const blocked = new Set<number>();
    const { bus, service, sendKikiLinkProtocol } = setup({
      relationshipReader: (memberNumber) => blocked.has(memberNumber) ? ["blacklist"] : [],
    });
    service.start();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://files.catbox.moe/blocked-profile.webp",
        u: Date.now(),
        v: "0.27.0",
        g: 3,
      }),
    });
    expect(service.hasCompatiblePeer(123)).toBe(true);
    expect(service.hasCachedProfile(123)).toBe(true);

    blocked.add(123);
    sendKikiLinkProtocol.mockClear();
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "blocked-query", p: 1 }),
    });

    expect(sendKikiLinkProtocol).not.toHaveBeenCalled();
    expect(service.hasCompatiblePeer(123)).toBe(false);
    expect(service.hasGroupManagedPeer(123)).toBe(false);
    expect(service.hasCachedProfile(123)).toBe(false);
    expect(service.get(123).avatarUrl).toBeUndefined();
    service.stop();
  });

  it("fails closed and purges newly blocked profiles from read APIs without another packet", () => {
    const blocked = new Set<number>();
    const { bus, service } = setup({
      relationshipReader: (memberNumber) => blocked.has(memberNumber) ? ["ghosted"] : [],
    });
    service.start();
    for (const memberNumber of [123, 456]) {
      bus.emit("bc:protocol", {
        senderNumber: memberNumber,
        channel: "beep",
        payload: JSON.stringify({
          t: "ps",
          s: "online",
          a: `https://files.catbox.moe/${memberNumber}.webp`,
          u: Date.now(),
          v: "0.27.0",
          g: 3,
        }),
      });
      expect(service.hasCachedProfile(memberNumber)).toBe(true);
    }

    blocked.add(123);
    blocked.add(456);
    expect(service.hasCachedProfile(123)).toBe(false);
    expect(service.get(456)).toEqual({
      memberNumber: 456,
      status: "unknown",
      source: "unknown",
      updatedAt: 0,
    });
    expect(service.hasCachedProfile(456)).toBe(false);
    expect(service.get(123).avatarUrl).toBeUndefined();
    service.stop();
  });

  it("fails closed when the relationship reader throws or is unavailable", () => {
    const relationshipReaders = [
      () => {
        throw new Error("Permission denied");
      },
      null,
    ] as const;

    for (const relationshipReader of relationshipReaders) {
      const { bus, service, sendKikiLinkProtocol } = setup({ relationshipReader });
      service.start();
      sendKikiLinkProtocol.mockClear();

      expect(service.request(123, true, true)).toBe(false);
      expect(service.setTyping(123, true)).toBe(false);
      for (const payload of [
        { t: "pq", i: "guarded-query" },
        { t: "pc", v: "0.27.0", g: 3 },
        { t: "ps", s: "online", u: Date.now(), v: "0.27.0", g: 3 },
        { t: "ty", a: 1 },
      ]) {
        bus.emit("bc:protocol", {
          senderNumber: 123,
          channel: "beep",
          payload: JSON.stringify(payload),
        });
      }

      expect(sendKikiLinkProtocol).not.toHaveBeenCalled();
      expect(service.hasCompatiblePeer(123)).toBe(false);
      expect(service.isTyping(123)).toBe(false);
      expect(service.hasCachedProfile(123)).toBe(false);
      service.stop();
    }
  });

  it("survives a throwing room broadcast and still cleans up lifecycle timers", () => {
    vi.useFakeTimers();
    const { service, broadcastKikiLinkProtocol } = setup({ inRoom: true });
    broadcastKikiLinkProtocol.mockImplementation(() => {
      throw new Error("Guarded native transport");
    });

    expect(() => service.start()).not.toThrow();
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(2);
    expect(() => vi.advanceTimersByTime(30_000)).not.toThrow();
    expect(broadcastKikiLinkProtocol).toHaveBeenCalled();

    service.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears cached remote profile fields immediately when reciprocal Presence is disabled", () => {
    const { bus, service } = setup();
    service.start();
    const remoteProfile = {
      t: "ps",
      s: "dnd",
      m: "Private scene",
      a: "https://i.imgur.com/reina.png",
      f: "rose",
      c: "garden",
      u: Date.now(),
      v: "0.24.0",
    };
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify(remoteProfile),
    });
    expect(service.get(123)).toMatchObject({
      status: "dnd",
      statusMessage: "Private scene",
      avatarUrl: "https://i.imgur.com/reina.png",
      avatarFrame: "rose",
      profileStyle: "garden",
    });

    service.setEnabled(false);
    const disabledSnapshot = service.get(123);
    expect(disabledSnapshot.statusMessage).toBeUndefined();
    expect(disabledSnapshot.avatarUrl).toBeUndefined();
    expect(disabledSnapshot.avatarFrame).toBeUndefined();
    expect(disabledSnapshot.profileStyle).toBeUndefined();

    service.setEnabled(true);
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ ...remoteProfile, u: Date.now() + 1 }),
    });
    expect(service.get(123).statusMessage).toBe("Private scene");
    service.stop();
  });

  it("shows bounded saved public profiles after live presence expires without claiming live status", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T12:00:00Z"));
    const storage = new MemoryKeyValueStorage();
    const first = setup({ storage });
    first.service.start();

    first.bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://files.catbox.moe/saved-avatar.webp",
        f: "rose",
        c: "garden",
        u: Date.now(),
        v: "0.26.0",
      }),
    });
    expect(first.service.request(456, true, true)).toBe(true);
    const profileQuery = JSON.parse(
      first.sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;
    first.bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: profileQuery.i,
        h: "https://files.catbox.moe/saved-banner.webp",
        o: "#a11234",
        x: "#112233",
        y: "#445566",
      }),
    });
    first.service.stop();

    vi.advanceTimersByTime(6 * 60_000);
    const second = setup({ storage });
    expect(second.service.hasCachedProfile(456)).toBe(true);
    expect(second.service.get(456)).toMatchObject({
      status: "offline",
      source: "friend-list",
      avatarUrl: "https://files.catbox.moe/saved-avatar.webp",
      avatarFrame: "rose",
      profileStyle: "garden",
      bannerUrl: "https://files.catbox.moe/saved-banner.webp",
      profileOutlineColor: "#a11234",
      profileGradient: { enabled: true, primary: "#112233", secondary: "#445566" },
      addonVersion: "0.26.0",
      profileFromCache: true,
      profileSyncedAt: new Date("2026-08-29T12:00:00Z").getTime(),
    });
  });

  it("throttles persistence for identical presence heartbeats but saves profile changes immediately", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T12:00:00Z"));
    const storage = new MemoryKeyValueStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const { bus, service } = setup({ storage });
    service.start();
    setItem.mockClear();

    const publish = (avatarUrl = "https://files.catbox.moe/reina.webp") => {
      bus.emit("bc:protocol", {
        senderNumber: 123,
        channel: "beep",
        payload: JSON.stringify({
          t: "ps",
          s: "online",
          a: avatarUrl,
          f: "rose",
          c: "garden",
          u: Date.now(),
          v: "0.26.0",
        }),
      });
    };
    const cacheWriteCount = () => setItem.mock.calls.filter(
      ([key]) => key === PUBLIC_PROFILE_CACHE_KEY,
    ).length;

    publish();
    expect(cacheWriteCount()).toBe(1);
    for (let heartbeat = 1; heartbeat < 30; heartbeat += 1) {
      vi.advanceTimersByTime(30_000);
      publish();
    }
    expect(cacheWriteCount()).toBe(1);

    vi.advanceTimersByTime(30_000);
    publish();
    expect(cacheWriteCount()).toBe(2);

    publish("https://files.catbox.moe/reina-new.webp");
    expect(cacheWriteCount()).toBe(3);
    service.stop();
  });

  it("removes a saved public profile when its owner sends a profile withdrawal", () => {
    const storage = new MemoryKeyValueStorage();
    const { bus, service } = setup({ storage });
    service.start();
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://files.catbox.moe/reina.webp",
        u: Date.now(),
        v: "0.26.0",
      }),
    });
    expect(service.hasCachedProfile(123)).toBe(true);

    service.setEnabled(false);
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "offline",
        u: Date.now() + 1,
        v: "0.26.0",
      }),
    });
    service.setEnabled(true);
    expect(service.hasCachedProfile(123)).toBe(false);
    expect(service.get(123).avatarUrl).toBeUndefined();
    service.stop();
  });

  it("does not let a delayed profile-details response resurrect a withdrawn profile", () => {
    const storage = new MemoryKeyValueStorage();
    const { bus, service, sendKikiLinkProtocol } = setup({ storage });
    service.start();
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://files.catbox.moe/reina.webp",
        u: Date.now(),
        v: "0.26.0",
      }),
    });
    expect(service.request(123, true, true)).toBe(true);
    const request = JSON.parse(
      sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "offline",
        u: Date.now() + 1,
        v: "0.26.0",
      }),
    });
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: request.i,
        h: "https://files.catbox.moe/must-stay-withdrawn.webp",
        o: "#123456",
      }),
    });

    expect(service.hasCachedProfile(123)).toBe(false);
    expect(service.get(123).bannerUrl).toBeUndefined();
    expect(service.get(123).profileOutlineColor).toBeUndefined();
    service.stop();
  });

  it("keeps legacy presence packets compatible when profile decoration fields are absent", () => {
    const { bus, service } = setup();
    service.start();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "idle",
        m: "Legacy client",
        u: Date.now(),
        v: "0.23.0",
      }),
    });

    const snapshot = service.get(123);
    expect(snapshot).toMatchObject({
      status: "idle",
      statusMessage: "Legacy client",
      addonVersion: "0.23.0",
      source: "kikilink",
    });
    expect(snapshot.avatarFrame).toBeUndefined();
    expect(snapshot.profileStyle).toBeUndefined();
    expect(service.hasGroupChatPeer(123)).toBe(false);
    service.stop();
  });

  it("negotiates legacy, relay, and managed group capabilities independently", () => {
    const { bus, service } = setup();
    service.start();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pc", v: "0.23.0" }),
    });
    expect(service.hasCompatiblePeer(123)).toBe(true);
    expect(service.hasGroupChatPeer(123)).toBe(false);

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pc", v: "0.24.0", g: 1 }),
    });
    expect(service.hasGroupChatPeer(123)).toBe(true);
    expect(service.hasGroupRelayPeer(123)).toBe(false);
    expect(service.hasGroupManagedPeer(123)).toBe(false);

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pc", v: "0.25.0", g: 2 }),
    });
    expect(service.hasGroupChatPeer(123)).toBe(true);
    expect(service.hasGroupRelayPeer(123)).toBe(true);
    expect(service.hasGroupManagedPeer(123)).toBe(false);

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pc", v: "0.27.0", g: 3 }),
    });
    expect(service.hasGroupChatPeer(123)).toBe(true);
    expect(service.hasGroupRelayPeer(123)).toBe(true);
    expect(service.hasGroupManagedPeer(123)).toBe(true);
    service.stop();
  });

  it("round-trips valid built-in profile decorations and addon version", () => {
    const { bus, service, settings, broadcastKikiLinkProtocol } = setup();
    service.start();
    service.setOwnProfile({
      enabled: true,
      statusMessage: "Open to chat",
      avatarUrl: "",
      bannerUrl: "",
      avatarFrame: "starlight",
      profileStyle: "midnight",
      profileOutlineColor: "",
      autoIdleMinutes: 10,
      afkAutoReply: { enabled: false, message: "Back later!" },
    });

    expect(settings.get().linkPresence).toMatchObject({
      avatarFrame: "starlight",
      profileStyle: "midnight",
    });
    expect(JSON.parse(broadcastKikiLinkProtocol.mock.calls.at(-1)?.[0] ?? "{}")).toMatchObject({
      t: "ps",
      f: "starlight",
      c: "midnight",
      v: "0.11.0",
      g: 3,
    });

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        f: "rose",
        c: "garden",
        u: Date.now(),
        v: "0.24.0",
      }),
    });
    expect(service.get(123)).toMatchObject({
      avatarFrame: "rose",
      profileStyle: "garden",
      addonVersion: "0.24.0",
    });
    service.stop();
  });

  it("accepts every bundled schema-25 avatar decoration and rejects unknown IDs", () => {
    for (const avatarFrame of ["laurel", "thorn", "moon", "ribbon"] as const) {
      const { bus, service } = setup();
      service.start();
      bus.emit("bc:protocol", {
        senderNumber: 123,
        channel: "beep",
        payload: JSON.stringify({
          t: "ps",
          s: "online",
          f: avatarFrame,
          u: Date.now(),
          v: "0.25.0",
        }),
      });
      expect(service.get(123).avatarFrame).toBe(avatarFrame);
      service.stop();
    }
  });

  it("requests profile details only on demand and accepts only the matching exact-key response", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T12:00:00Z"));
    const { bus, service, sendKikiLinkProtocol } = setup();
    service.start();

    expect(service.request(456, true)).toBe(true);
    const ordinaryQuery = JSON.parse(
      sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;
    expect(ordinaryQuery).toMatchObject({ t: "pq" });
    expect(ordinaryQuery).not.toHaveProperty("p");

    // An explicit open upgrades an immediately preceding forced discovery instead of being lost.
    expect(service.request(456, true, true)).toBe(true);
    const explicitQuery = JSON.parse(
      sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;
    expect(explicitQuery).toMatchObject({ t: "pq", p: 1, e: 1 });
    expect(typeof explicitQuery.i).toBe("string");

    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        u: Date.now(),
        v: "0.25.0",
      }),
    });
    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: explicitQuery.i,
        h: "https://files.catbox.moe/reina-banner.webp",
        o: "#C53A71",
        unexpected: "must reject the whole packet",
      }),
    });
    expect(service.get(456).bannerUrl).toBeUndefined();
    expect(service.get(456).profileOutlineColor).toBeUndefined();
    expect(service.get(456).profileGradient).toBeUndefined();

    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: explicitQuery.i,
        x: "#112233",
      }),
    });
    expect(service.get(456).profileGradient).toBeUndefined();

    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: explicitQuery.i,
        h: "https://files.catbox.moe/reina-banner.webp",
        o: "#C53A71",
        x: "#8A1538",
        y: "#2A9D8F",
      }),
    });
    expect(service.get(456)).toMatchObject({
      bannerUrl: "https://files.catbox.moe/reina-banner.webp",
      profileOutlineColor: "#c53a71",
      profileGradient: {
        enabled: true,
        primary: "#8a1538",
        secondary: "#2a9d8f",
      },
    });

    vi.advanceTimersByTime(2_001);
    expect(service.request(456, true, true)).toBe(true);
    const clearQuery = JSON.parse(
      sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;
    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({ t: "pf", i: clearQuery.i }),
    });
    expect(service.get(456).bannerUrl).toBeUndefined();
    expect(service.get(456).profileOutlineColor).toBeUndefined();
    expect(service.get(456).profileGradient).toBeUndefined();
    service.stop();
  });

  it("registers an explicit profile request before a synchronous virtual peer replies", () => {
    const bus = new EventBus<KikiLinkEvents>();
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const sendKikiLinkProtocol = vi.fn((memberNumber: number, payload: string) => {
      const packet = JSON.parse(payload) as Record<string, unknown>;
      if (memberNumber === 123 && packet.t === "pq" && packet.p === 1) {
        bus.emit("bc:protocol", {
          senderNumber: 123,
          channel: "beep",
          payload: JSON.stringify({
            t: "pf",
            i: packet.i,
            h: "https://files.catbox.moe/synchronous.webp",
            o: "#123456",
            x: "#8A1538",
            y: "#2A9D8F",
          }),
        });
      }
      return "beep" as const;
    });
    const adapter = {
      getOwnMemberNumber: () => 999,
      refreshOnlineFriends: () => false,
      getOnlineFriends: () => [],
      hasOnlineFriendSnapshot: () => false,
      isKnownFriend: () => false,
      getPlayerRelationships: () => [],
      isMemberInCurrentRoom: () => false,
      isInChatRoom: () => false,
      getCurrentRoomName: () => undefined,
      sendKikiLinkProtocol,
      broadcastKikiLinkProtocol: vi.fn(() => false),
    } as unknown as BCAdapter;
    const service = new LinkPresenceService(adapter, settings, bus, "0.25.0");
    service.start();
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        u: Date.now(),
        v: "0.25.0",
        g: 2,
      }),
    });

    expect(service.request(123, true, true)).toBe(true);
    expect(service.get(123)).toMatchObject({
      bannerUrl: "https://files.catbox.moe/synchronous.webp",
      profileOutlineColor: "#123456",
      profileGradient: {
        enabled: true,
        primary: "#8a1538",
        secondary: "#2a9d8f",
      },
    });
    service.stop();
  });

  it("persists and shows a correlated profile-details reply before any presence snapshot", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T12:00:00Z"));
    const storage = new MemoryKeyValueStorage();
    const first = setup({ storage });
    first.service.start();

    expect(first.service.request(456, true, true)).toBe(true);
    const query = JSON.parse(
      first.sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;
    first.bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: query.i,
        h: "https://files.catbox.moe/pf-before-ps.webp",
        o: "#123456",
        x: "#8a1538",
        y: "#2a9d8f",
      }),
    });

    expect(first.service.get(456)).toMatchObject({
      status: "offline",
      source: "friend-list",
      bannerUrl: "https://files.catbox.moe/pf-before-ps.webp",
      profileOutlineColor: "#123456",
      profileGradient: {
        enabled: true,
        primary: "#8a1538",
        secondary: "#2a9d8f",
      },
    });
    expect(new ProfileCacheRepository(storage).peek(456)).toMatchObject({
      bannerUrl: "https://files.catbox.moe/pf-before-ps.webp",
      richSyncedAt: Date.now(),
    });
    first.service.stop();

    const restored = setup({ storage });
    expect(restored.service.get(456)).toMatchObject({
      status: "offline",
      source: "friend-list",
      bannerUrl: "https://files.catbox.moe/pf-before-ps.webp",
      profileOutlineColor: "#123456",
      profileFromCache: true,
      profileSyncedAt: Date.now(),
    });
  });

  it("does not renew saved rich-detail age when only basic presence is refreshed", () => {
    vi.useFakeTimers();
    const detailsAt = new Date("2026-01-01T00:00:00Z").getTime();
    vi.setSystemTime(detailsAt);
    const storage = new MemoryKeyValueStorage();
    const { bus, service, sendKikiLinkProtocol } = setup({ storage });
    service.start();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://files.catbox.moe/avatar-one.webp",
        u: Date.now(),
        v: "0.26.0",
      }),
    });
    expect(service.request(123, true, true)).toBe(true);
    const query = JSON.parse(
      sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: query.i,
        h: "https://files.catbox.moe/old-rich-banner.webp",
        o: "#123456",
      }),
    });

    const basicRefreshAt = detailsAt + 30 * 24 * 60 * 60_000;
    vi.setSystemTime(basicRefreshAt);
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://files.catbox.moe/avatar-two.webp",
        u: Date.now(),
        v: "0.26.1",
      }),
    });
    expect(new ProfileCacheRepository(storage).peek(123)).toMatchObject({
      avatarUrl: "https://files.catbox.moe/avatar-two.webp",
      bannerUrl: "https://files.catbox.moe/old-rich-banner.webp",
      syncedAt: basicRefreshAt,
      richSyncedAt: detailsAt,
    });
    expect(service.get(123)).toMatchObject({
      source: "kikilink",
      bannerUrl: "https://files.catbox.moe/old-rich-banner.webp",
      profileFromCache: true,
      profileSyncedAt: detailsAt,
    });

    vi.setSystemTime(detailsAt + MAX_CACHED_PUBLIC_PROFILE_RICH_AGE_MS + 1);
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://files.catbox.moe/avatar-three.webp",
        u: Date.now(),
        v: "0.26.2",
      }),
    });
    const expired = new ProfileCacheRepository(storage).peek(123);
    expect(expired?.avatarUrl).toBe("https://files.catbox.moe/avatar-three.webp");
    expect(expired).not.toHaveProperty("bannerUrl");
    expect(expired).not.toHaveProperty("profileOutlineColor");
    expect(expired).not.toHaveProperty("richSyncedAt");
    expect(service.get(123).bannerUrl).toBeUndefined();
    service.stop();
  });

  it("answers requested profile details independently without broadcasting them", () => {
    const { bus, service, settings, sendKikiLinkProtocol, broadcastKikiLinkProtocol } = setup();
    settings.update((draft) => {
      draft.linkPresence.bannerUrl = "https://files.catbox.moe/kiki-banner.webp";
      draft.linkPresence.profileOutlineColor = "#d71932";
      draft.linkPresence.profileGradient = {
        enabled: true,
        primary: "#8a1538",
        secondary: "#2a9d8f",
      };
    });
    service.start();
    sendKikiLinkProtocol.mockClear();
    broadcastKikiLinkProtocol.mockClear();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "ordinary-request" }),
    });
    expect(sendKikiLinkProtocol.mock.calls.map(([, payload]) => payload))
      .not.toEqual(expect.arrayContaining([expect.stringContaining('"t":"pf"')]));

    // The normal response is still cooling down, but the separate details budget may answer.
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "profile-request", p: 1 }),
    });
    const details = JSON.parse(
      sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;
    expect(details).toEqual({
      t: "pf",
      i: "profile-request",
      h: "https://files.catbox.moe/kiki-banner.webp",
      o: "#d71932",
    });

    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "extended-profile", p: 1, e: 1 }),
    });
    const extendedDetails = JSON.parse(
      sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;
    expect(extendedDetails).toEqual({
      t: "pf",
      i: "extended-profile",
      h: "https://files.catbox.moe/kiki-banner.webp",
      o: "#d71932",
      x: "#8a1538",
      y: "#2a9d8f",
    });
    expect(broadcastKikiLinkProtocol).not.toHaveBeenCalled();
    service.stop();
  });

  it("negotiates a bounded public bio without changing legacy profile-detail packets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T12:00:00Z"));
    const { bus, service, settings, sendKikiLinkProtocol } = setup();
    settings.update((draft) => {
      draft.linkPresence.bio = "  Tea, stories, and quiet rooms.  ";
      draft.linkPresence.bannerUrl = "https://files.catbox.moe/kiki-banner.webp";
    });
    service.start();
    sendKikiLinkProtocol.mockClear();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "legacy-profile", p: 1, e: 1 }),
    });
    const legacyPackets = sendKikiLinkProtocol.mock.calls
      .filter(([target]) => target === 123)
      .map(([, payload]) => JSON.parse(payload) as Record<string, unknown>);
    expect(legacyPackets.some((packet) => packet.t === "pf")).toBe(true);
    expect(legacyPackets.some((packet) => packet.t === "pb")).toBe(false);

    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "bio-profile", p: 1, e: 1, d: 1 }),
    });
    const modernPackets = sendKikiLinkProtocol.mock.calls
      .filter(([target]) => target === 456)
      .map(([, payload]) => JSON.parse(payload) as Record<string, unknown>);
    expect(modernPackets.filter((packet) => packet.t === "pb")).toEqual([{
      t: "pb",
      i: "bio-profile",
      b: "Tea, stories, and quiet rooms.",
    }]);
    expect(modernPackets.some((packet) => packet.t === "pf")).toBe(true);

    sendKikiLinkProtocol.mockClear();
    expect(service.request(456, true, true)).toBe(true);
    const query = JSON.parse(sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}") as {
      i: string;
      d?: number;
    };
    expect(query.d).toBe(1);
    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({ t: "pb", i: query.i, b: "Remote bio" }),
    });
    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: query.i,
        h: "https://files.catbox.moe/remote-banner.webp",
      }),
    });
    expect(service.get(456)).toMatchObject({
      bio: "Remote bio",
      bannerUrl: "https://files.catbox.moe/remote-banner.webp",
    });

    vi.advanceTimersByTime(2_001);
    expect(service.request(456, true, true)).toBe(true);
    const clearQuery = JSON.parse(sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}") as {
      i: string;
    };
    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({ t: "pb", i: clearQuery.i }),
    });
    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({ t: "pf", i: clearQuery.i }),
    });
    expect(service.get(456).bio).toBeUndefined();
    expect(service.get(456).bannerUrl).toBeUndefined();
    service.stop();
  });

  it("never sends or accepts profile details while Presence is disabled", () => {
    const { bus, service, settings, sendKikiLinkProtocol } = setup();
    settings.update((draft) => {
      draft.linkPresence.enabled = false;
      draft.linkPresence.bannerUrl = "https://files.catbox.moe/private-banner.webp";
      draft.linkPresence.profileOutlineColor = "#112233";
      draft.linkPresence.profileGradient = {
        enabled: true,
        primary: "#8a1538",
        secondary: "#2a9d8f",
      };
    });
    service.start();
    sendKikiLinkProtocol.mockClear();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "private-request", p: 1, e: 1 }),
    });
    const payloads = sendKikiLinkProtocol.mock.calls.map(([, payload]) => payload);
    expect(payloads.some((payload) => payload.includes('"t":"pc"'))).toBe(true);
    expect(payloads.some((payload) => payload.includes('"t":"pf"'))).toBe(false);

    expect(service.request(123, true, true)).toBe(true);
    const disabledQuery = JSON.parse(
      sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;
    expect(disabledQuery).toMatchObject({ t: "pq" });
    expect(disabledQuery).not.toHaveProperty("p");
    expect(disabledQuery).not.toHaveProperty("e");

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: "private-request",
        h: "https://files.catbox.moe/remote-banner.webp",
        o: "#abcdef",
        x: "#8a1538",
        y: "#2a9d8f",
      }),
    });
    expect(service.get(123).bannerUrl).toBeUndefined();
    expect(service.get(123).profileOutlineColor).toBeUndefined();
    expect(service.get(123).profileGradient).toBeUndefined();

    service.setEnabled(true);
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: disabledQuery.i,
        h: "https://files.catbox.moe/still-private.webp",
        o: "#abcdef",
      }),
    });
    expect(service.get(123).bannerUrl).toBeUndefined();
    expect(service.get(123).profileOutlineColor).toBeUndefined();
    service.stop();
  });

  it("serializes bounded exact-key profile details and rejects unsafe values", () => {
    const banner = `https://example.com/${"a".repeat(450)}.webp`;
    expect(banner.length).toBeLessThanOrEqual(500);
    const payload = serializeProfileDetailsPacket({
      t: "pf",
      i: "profile-details-1",
      h: banner,
      o: "#A1B2C3",
      x: "#8A1538",
      y: "#2A9D8F",
    });
    expect(new TextEncoder().encode(payload).byteLength).toBeLessThanOrEqual(700);
    expect(JSON.parse(payload)).toEqual({
      t: "pf",
      i: "profile-details-1",
      h: banner,
      o: "#a1b2c3",
      x: "#8a1538",
      y: "#2a9d8f",
    });
    expect(() => serializeProfileDetailsPacket({
      t: "pf",
      i: "profile-details-2",
      h: "http://tracker.example/banner.png",
    })).toThrow("Invalid profile banner URL");
    expect(() => serializeProfileDetailsPacket({
      t: "pf",
      i: "profile-details-3",
      o: "red; background: url(https://tracker.example/x.png)",
    })).toThrow("Invalid profile outline color");
    expect(() => serializeProfileDetailsPacket({
      t: "pf",
      i: "profile-details-4",
      x: "#123456",
    })).toThrow("must be sent together");
    expect(() => serializeProfileDetailsPacket({
      t: "pf",
      i: "profile-details-5",
      x: "red; background:url(https://tracker.example/x.png)",
      y: "#abcdef",
    })).toThrow("Invalid profile gradient color");
  });

  it("serializes profile bios within the protocol ceiling and strips unsafe text", () => {
    const payload = serializeProfileBioPacket({
      t: "pb",
      i: "profile-bio-1",
      b: `${"🌸".repeat(200)}\u202e`,
    });
    const packet = JSON.parse(payload) as { b: string };
    expect([...packet.b]).toHaveLength(160);
    expect(packet.b).not.toContain("\u202e");
    expect(new TextEncoder().encode(payload).byteLength).toBeLessThanOrEqual(700);
    expect(() => serializeProfileBioPacket({ t: "pb", i: "bad id", b: "bio" }))
      .toThrow("Invalid profile-bio request ID");
  });

  it("fails closed when the controller account does not match the readable page identity", () => {
    const storage = new MemoryKeyValueStorage();
    new ProfileCacheRepository(storage).upsert({
      memberNumber: 303,
      displayName: "Account 101 profile",
      avatarUrl: "https://files.catbox.moe/account-101.webp",
    });
    const {
      bus,
      service,
      sendKikiLinkProtocol,
      broadcastKikiLinkProtocol,
    } = setup({
      storage,
      getOwnMemberNumber: () => 202,
      expectedOwnMemberNumber: 101,
    });

    service.start();
    expect(service.hasCachedProfile(303)).toBe(false);
    expect(service.get(303)).toEqual({
      memberNumber: 303,
      status: "unknown",
      source: "unknown",
      updatedAt: 0,
    });
    expect(service.request(303, true, true)).toBe(false);
    bus.emit("bc:protocol", {
      senderNumber: 303,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://files.catbox.moe/account-202.webp",
        u: Date.now(),
        v: "0.26.0",
      }),
    });
    expect(sendKikiLinkProtocol).not.toHaveBeenCalled();
    expect(broadcastKikiLinkProtocol).not.toHaveBeenCalled();
    expect(new ProfileCacheRepository(storage).get(303)?.avatarUrl).toBe(
      "https://files.catbox.moe/account-101.webp",
    );
    service.stop();
  });

  it("irreversibly invalidates the old instance on an authenticated account switch", () => {
    vi.useFakeTimers();
    let ownMemberNumber = 999;
    const {
      bus,
      service,
      settings,
      sendKikiLinkProtocol,
      broadcastKikiLinkProtocol,
    } = setup({ getOwnMemberNumber: () => ownMemberNumber });
    settings.update((draft) => {
      draft.linkPresence.status = "dnd";
      draft.linkPresence.statusMessage = "Old account status";
      draft.linkPresence.avatarUrl = "https://files.catbox.moe/old-avatar.webp";
      draft.linkPresence.bannerUrl = "https://files.catbox.moe/old-banner.webp";
      draft.linkPresence.profileOutlineColor = "#a1b2c3";
    });
    service.start();

    expect(service.request(456, true, true)).toBe(true);
    const profileRequest = JSON.parse(
      sendKikiLinkProtocol.mock.calls.at(-1)?.[1] ?? "{}",
    ) as Record<string, unknown>;
    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "https://files.catbox.moe/remote-avatar.webp",
        u: Date.now(),
        v: "0.25.0",
      }),
    });
    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "pf",
        i: profileRequest.i,
        h: "https://files.catbox.moe/remote-banner.webp",
        o: "#445566",
      }),
    });
    expect(service.get(456)).toMatchObject({
      avatarUrl: "https://files.catbox.moe/remote-avatar.webp",
      bannerUrl: "https://files.catbox.moe/remote-banner.webp",
      profileOutlineColor: "#445566",
    });

    sendKikiLinkProtocol.mockClear();
    broadcastKikiLinkProtocol.mockClear();
    expect(service.requestMany([123, 321])).toBe(1);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);

    ownMemberNumber = 1_000;
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "new-account-profile", p: 1 }),
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);
    expect(broadcastKikiLinkProtocol).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);

    expect(service.get(1_000)).toEqual({
      memberNumber: 1_000,
      status: "unknown",
      source: "unknown",
      updatedAt: 0,
    });
    expect(service.get(456).avatarUrl).toBeUndefined();
    expect(service.get(456).bannerUrl).toBeUndefined();
    expect(service.get(456).profileOutlineColor).toBeUndefined();
    expect(service.getOwnStatus()).toBe("offline");
    expect(service.getOwnStatusMessage()).toBe("");
    expect(service.getOwnAvatarUrl()).toBe("");
    expect(service.getOwnBannerUrl()).toBe("");
    expect(service.getOwnProfileOutlineColor()).toBe("");
    expect(service.getOwnProfileGradient()).toBeUndefined();

    // Even restoring the old number cannot revive an instance that observed a valid switch.
    ownMemberNumber = 999;
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "must-stay-invalid", p: 1 }),
    });
    expect(service.request(123, true, true)).toBe(false);
    expect(service.hasCompatiblePeer(123)).toBe(false);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);
    expect(settings.get().linkPresence.bannerUrl).toBe(
      "https://files.catbox.moe/old-banner.webp",
    );
    service.stop();
  });

  it("stays silent during a guarded identity read and recovers for the same account", () => {
    let identityGuarded = false;
    const { bus, service, settings, sendKikiLinkProtocol } = setup({
      getOwnMemberNumber: () => {
        if (identityGuarded) throw new Error("Player proxy temporarily revoked");
        return 999;
      },
    });
    settings.update((draft) => {
      draft.linkPresence.status = "dnd";
      draft.linkPresence.statusMessage = "Same account";
      draft.linkPresence.avatarUrl = "https://files.catbox.moe/same-avatar.webp";
      draft.linkPresence.bannerUrl = "https://files.catbox.moe/same-banner.webp";
      draft.linkPresence.profileOutlineColor = "#123456";
    });
    identityGuarded = true;
    service.start();
    const listener = vi.fn();
    service.subscribe(listener);
    sendKikiLinkProtocol.mockClear();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "guarded-profile", p: 1 }),
    });
    expect(service.request(456, true, true)).toBe(false);
    expect(service.get(999)).toEqual({
      memberNumber: 999,
      status: "unknown",
      source: "unknown",
      updatedAt: 0,
    });
    expect(sendKikiLinkProtocol).not.toHaveBeenCalled();

    identityGuarded = false;
    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "recovered-profile", p: 1 }),
    });
    const recoveredPackets = sendKikiLinkProtocol.mock.calls.map(([, payload]) =>
      JSON.parse(payload) as Record<string, unknown>
    );
    expect(recoveredPackets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        t: "ps",
        s: "dnd",
        m: "Same account",
        a: "https://files.catbox.moe/same-avatar.webp",
      }),
      {
        t: "pf",
        i: "recovered-profile",
        h: "https://files.catbox.moe/same-banner.webp",
        o: "#123456",
      },
    ]));
    expect(service.hasCompatiblePeer(123)).toBe(true);
    expect(service.get(999)).toMatchObject({
      status: "dnd",
      statusMessage: "Same account",
      avatarUrl: "https://files.catbox.moe/same-avatar.webp",
      bannerUrl: "https://files.catbox.moe/same-banner.webp",
      profileOutlineColor: "#123456",
    });
    expect(listener).toHaveBeenCalledWith(123);
    service.stop();
  });

  it("does not publish a stale typing member after an authenticated account switch", () => {
    vi.useFakeTimers();
    let ownMemberNumber = 999;
    const { bus, service, sendKikiLinkProtocol } = setup({
      getOwnMemberNumber: () => ownMemberNumber,
    });
    service.start();
    const listener = vi.fn();
    service.subscribe(listener);

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "ty", a: 1 }),
    });
    expect(service.isTyping(123)).toBe(true);
    expect(listener).toHaveBeenLastCalledWith(123);
    listener.mockClear();
    sendKikiLinkProtocol.mockClear();

    ownMemberNumber = 1_000;
    vi.advanceTimersByTime(5_526);

    // Account invalidation may issue one generic cache-reset notification, but the old typing
    // sender is never exposed and no old-account stop/request packet is sent through the new one.
    expect(listener).not.toHaveBeenCalledWith(123);
    expect(listener.mock.calls.every(([memberNumber]) => memberNumber === undefined)).toBe(true);
    expect(sendKikiLinkProtocol).not.toHaveBeenCalled();
    expect(service.isTyping(123)).toBe(false);
    service.stop();
  });

  it("ignores unknown decoration IDs without discarding an otherwise valid packet", () => {
    const { bus, service } = setup();
    service.start();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "dnd",
        f: "remote-css",
        c: "animated-external-theme",
        u: Date.now(),
        v: "0.24.0",
      }),
    });

    const snapshot = service.get(123);
    expect(snapshot).toMatchObject({
      status: "dnd",
      addonVersion: "0.24.0",
      source: "kikilink",
    });
    expect(snapshot.avatarFrame).toBeUndefined();
    expect(snapshot.profileStyle).toBeUndefined();
    service.stop();
  });

  it("bounds worst-case presence serialization while preserving required fields", () => {
    const payload = serializePresencePacket({
      t: "ps",
      i: "request-id-that-is-deliberately-long",
      s: "dnd",
      m: `${"\\\"".repeat(160)}${"🌸".repeat(160)}`,
      a: `https://example.com/${"a".repeat(900)}.webp`,
      f: "starlight",
      c: "midnight",
      u: 1_777_777_777_777,
      v: "0.24.0",
    });

    expect(new TextEncoder().encode(payload).byteLength).toBeLessThanOrEqual(700);
    expect(JSON.parse(payload)).toMatchObject({
      t: "ps",
      s: "dnd",
      u: 1_777_777_777_777,
      v: "0.24.0",
    });
  });

  it("strips C0 and bidi controls and rejects presence with an empty sanitized version", () => {
    const { bus, service } = setup();
    service.start();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        m: "  Ready\u0000\u001f \u202eevil\u2069 chat  ",
        u: Date.now(),
        v: "0.24\u202e.0",
      }),
    });
    const accepted = service.get(123);
    expect(accepted.statusMessage).toBe("Ready evil chat");
    expect(accepted.addonVersion).toBe("0.24 .0");
    expect(`${accepted.statusMessage}${accepted.addonVersion}`).not.toMatch(
      /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u,
    );

    for (const [senderNumber, version] of [[777, ""], [778, "\u202e\u2066"]] as const) {
      bus.emit("bc:protocol", {
        senderNumber,
        channel: "beep",
        payload: JSON.stringify({
          t: "ps",
          s: "online",
          u: Date.now(),
          v: version,
        }),
      });
      expect(service.hasCompatiblePeer(senderNumber)).toBe(false);
      expect(service.get(senderNumber)).toMatchObject({ status: "unknown", source: "unknown" });
    }
    service.stop();
  });

  it("reannounces presence in an unchanged room so late-loading peers get Blossom", () => {
    vi.useFakeTimers();
    const { service, broadcastKikiLinkProtocol } = setup({ inRoom: true });
    service.start();
    const initialPackets = broadcastKikiLinkProtocol.mock.calls.length;
    expect(initialPackets).toBeGreaterThanOrEqual(2);

    vi.advanceTimersByTime(30_000);
    expect(broadcastKikiLinkProtocol).toHaveBeenCalledTimes(initialPackets + 1);
    expect(broadcastKikiLinkProtocol.mock.calls.at(-1)?.[0]).toContain('"t":"ps"');
    service.stop();
  });

  it("discovers the addon while Presence sharing is disabled without accepting profile data", () => {
    const {
      bus,
      service,
      settings,
      sendKikiLinkProtocol,
      broadcastKikiLinkProtocol,
    } = setup({ inRoom: true });
    settings.update((draft) => {
      draft.linkPresence.enabled = false;
    });
    service.start();

    const initialPackets = broadcastKikiLinkProtocol.mock.calls.map(([payload]) => payload);
    expect(initialPackets.some((payload) => payload.includes('"t":"pq"'))).toBe(true);
    expect(initialPackets.some((payload) => payload.includes('"t":"pc"'))).toBe(true);
    expect(initialPackets.some((payload) => payload.includes('"t":"ps"'))).toBe(false);

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pq", i: "capability-only" }),
    });
    expect(service.hasCompatiblePeer(123)).toBe(true);
    expect(sendKikiLinkProtocol).toHaveBeenLastCalledWith(
      123,
      JSON.stringify({ t: "pc", v: "0.11.0", g: 3 }),
    );
    expect(service.requestMany([123])).toBe(0);

    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "dnd",
        m: "Must stay private",
        a: "https://litter.catbox.moe/private.webp",
        f: "rose",
        c: "garden",
        u: Date.now(),
        v: "0.22.12",
      }),
    });
    expect(service.hasCompatiblePeer(456)).toBe(true);
    const privateSnapshot = service.get(456);
    expect(privateSnapshot).toMatchObject({
      status: "online",
      source: "room",
      addonVersion: "0.22.12",
    });
    expect(privateSnapshot.statusMessage).toBeUndefined();
    expect(privateSnapshot.avatarUrl).toBeUndefined();
    expect(privateSnapshot.avatarFrame).toBeUndefined();
    expect(privateSnapshot.profileStyle).toBeUndefined();

    expect(service.request(321, true)).toBe(true);
    expect(service.request(321, true)).toBe(false);
    expect(sendKikiLinkProtocol).toHaveBeenLastCalledWith(
      321,
      expect.stringContaining('"t":"pq"'),
    );
    service.stop();
  });

  it("requires a valid KikiLink capability packet before showing a peer Blossom", () => {
    const { bus, service } = setup();
    service.start();

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pc", v: "" }),
    });
    expect(service.hasCompatiblePeer(123)).toBe(false);

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "pc", v: "0.22.12" }),
    });
    expect(service.hasCompatiblePeer(123)).toBe(true);
    service.stop();
  });

  it("fails closed instead of throwing when native presence objects are guarded", () => {
    const guarded = Proxy.revocable<{ memberNumber: number; roomName: string }>(
      { memberNumber: 123, roomName: "Hidden" },
      {},
    );
    guarded.revoke();
    const adapter = {
      getOwnMemberNumber: () => 999,
      getOnlineFriend: () => guarded.proxy,
      getOnlineFriends: () => [guarded.proxy],
      hasOnlineFriendSnapshot: () => {
        throw new Error("Permission denied");
      },
      isKnownFriend: () => {
        throw new Error("Permission denied");
      },
      isMemberInCurrentRoom: () => {
        throw new Error("Permission denied");
      },
      getCurrentRoomName: () => {
        throw new Error("Permission denied");
      },
      refreshOnlineFriends: () => false,
      sendKikiLinkProtocol: vi.fn(() => "beep" as const),
      broadcastKikiLinkProtocol: vi.fn(() => false),
    } as unknown as BCAdapter;
    const service = new LinkPresenceService(
      adapter,
      new SettingsStore(new MemoryKeyValueStorage()),
      new EventBus<KikiLinkEvents>(),
      "0.24.0",
    );

    expect(() => service.get(123)).not.toThrow();
    expect(service.get(123)).toMatchObject({ status: "unknown", source: "unknown" });
    expect(() => service.hasCompatiblePeer(123)).not.toThrow();
  });

  it("publishes user-selected status without changing Bondage Club state", () => {
    const { service, settings } = setup();
    service.setOwnStatus("offline");

    expect(service.getOwnStatus()).toBe("offline");
    expect(settings.get().linkPresence.status).toBe("offline");
  });

  it("shares a bounded direct avatar URL and ignores unsafe remote avatars", () => {
    const { bus, service, settings, broadcastKikiLinkProtocol } = setup();
    service.start();
    service.setOwnAvatarUrl("https://litter.catbox.moe/kiki.webp");

    expect(settings.get().linkPresence.avatarUrl).toBe(
      "https://litter.catbox.moe/kiki.webp",
    );
    expect(
      broadcastKikiLinkProtocol.mock.calls.some(
        ([payload]) =>
          typeof payload === "string" &&
          payload.includes('"a":"https://litter.catbox.moe/kiki.webp"'),
      ),
    ).toBe(true);

    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "online",
        a: "http://tracker.example/avatar.png",
        u: Date.now(),
        v: "0.20.0",
      }),
    });
    expect(service.get(456).avatarUrl).toBeUndefined();
    service.stop();
  });

  it("publishes a saved profile once and clears remote profile fields when disabled", () => {
    const { service, settings, broadcastKikiLinkProtocol } = setup();

    service.setOwnProfile({
      enabled: true,
      statusMessage: "Open to chat",
      avatarUrl: "https://litter.catbox.moe/kiki.webp",
      bannerUrl: "",
      profileOutlineColor: "",
      autoIdleMinutes: 7,
      afkAutoReply: { enabled: true, message: "Back later!" },
    });

    expect(broadcastKikiLinkProtocol).toHaveBeenCalledOnce();
    expect(broadcastKikiLinkProtocol).toHaveBeenLastCalledWith(
      expect.stringContaining('"a":"https://litter.catbox.moe/kiki.webp"'),
    );
    expect(settings.get().linkPresence).toMatchObject({
      statusMessage: "Open to chat",
      avatarUrl: "https://litter.catbox.moe/kiki.webp",
      autoIdleMinutes: 7,
      afkAutoReply: { enabled: true, message: "Back later!" },
    });

    service.setOwnProfile({
      enabled: false,
      statusMessage: "",
      avatarUrl: "",
      bannerUrl: "",
      profileOutlineColor: "",
      autoIdleMinutes: 7,
      afkAutoReply: { enabled: true, message: "Back later!" },
    });
    expect(broadcastKikiLinkProtocol).toHaveBeenCalledTimes(2);
    const disabledPacket = broadcastKikiLinkProtocol.mock.calls.at(-1)?.[0] ?? "";
    expect(disabledPacket).toContain('"s":"offline"');
    expect(disabledPacket).not.toContain('"a":');
    expect(disabledPacket).not.toContain('"m":');
  });

  it("never serializes local-only roster or relationship data in a profile packet", () => {
    const { service, broadcastKikiLinkProtocol } = setup();
    const profile = {
      enabled: true,
      statusMessage: "Available",
      avatarUrl: "https://litter.catbox.moe/kiki.webp",
      bannerUrl: "",
      avatarFrame: "blossom" as const,
      profileStyle: "garden" as const,
      profileOutlineColor: "",
      profileGradient: {
        enabled: true,
        primary: "#8a1538",
        secondary: "#2a9d8f",
      },
      autoIdleMinutes: 10,
      afkAutoReply: { enabled: false, message: "Back later!" },
      privateTags: ["secret-sub"],
      privateNote: "do-not-share-this-note",
      localAlias: "private-alias",
      lastRoomName: "private-room-name",
      relationships: ["lover"],
    };

    service.setOwnProfile(profile);
    const packet = JSON.parse(
      broadcastKikiLinkProtocol.mock.calls.at(-1)?.[0] ?? "{}",
    ) as Record<string, unknown>;

    expect(Object.keys(packet).sort()).toEqual(["a", "c", "f", "g", "m", "s", "t", "u", "v"]);
    expect(service.getOwnProfileGradient()).toEqual({
      enabled: true,
      primary: "#8a1538",
      secondary: "#2a9d8f",
    });
    expect(JSON.stringify(packet)).not.toMatch(
      /secret-sub|do-not-share-this-note|private-alias|private-room-name|lover/u,
    );
  });

  it("moves Online to Idle and publishes one immediate Online update after interaction", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"));
    const { service, settings, broadcastKikiLinkProtocol } = setup();
    const listener = vi.fn();
    service.subscribe(listener);
    settings.update((draft) => {
      draft.linkPresence.autoIdleMinutes = 1;
    });
    service.start();
    expect(service.getOwnStatus()).toBe("online");

    vi.advanceTimersByTime(60_001);
    expect(service.getOwnStatus()).toBe("idle");
    const broadcastsWhileIdle = broadcastKikiLinkProtocol.mock.calls.length;

    window.dispatchEvent(new KeyboardEvent("keydown"));
    expect(service.getOwnStatus()).toBe("online");
    expect(listener).toHaveBeenLastCalledWith(999);
    expect(broadcastKikiLinkProtocol).toHaveBeenCalledTimes(broadcastsWhileIdle + 1);

    vi.advanceTimersByTime(15_000);
    expect(broadcastKikiLinkProtocol).toHaveBeenCalledTimes(broadcastsWhileIdle + 1);
    service.stop();
  });

  it("shares throttled typing state only through short-lived KikiLink packets", () => {
    vi.useFakeTimers();
    const { bus, service, sendKikiLinkProtocol } = setup();
    service.start();

    expect(service.setTyping(123, true)).toBe(true);
    expect(sendKikiLinkProtocol).toHaveBeenLastCalledWith(
      123,
      JSON.stringify({ t: "ty", a: 1 }),
    );
    expect(service.setTyping(123, true)).toBe(false);
    vi.advanceTimersByTime(1_801);
    expect(service.setTyping(123, true)).toBe(true);
    expect(service.setTyping(123, false)).toBe(true);
    expect(sendKikiLinkProtocol).toHaveBeenLastCalledWith(
      123,
      JSON.stringify({ t: "ty", a: 0 }),
    );

    bus.emit("bc:protocol", {
      senderNumber: 123,
      channel: "beep",
      payload: JSON.stringify({ t: "ty", a: 1 }),
    });
    expect(service.isTyping(123)).toBe(true);
    vi.advanceTimersByTime(5_526);
    expect(service.isTyping(123)).toBe(false);
    service.stop();
  });

  it("discovers only route-reachable visible players with a long background backoff", () => {
    vi.useFakeTimers();
    const { service, sendKikiLinkProtocol } = setup();

    expect(service.requestMany([123, 456, 123, 999, 0, -1, Number.NaN])).toBe(1);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);
    expect(sendKikiLinkProtocol).toHaveBeenLastCalledWith(
      123,
      expect.stringContaining('"t":"pq"'),
    );

    expect(service.request(0, true, true)).toBe(false);
    expect(service.setTyping(0, true)).toBe(false);
    expect(service.request(123, true, true)).toBe(true);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(20_001);
    expect(service.requestMany([123, 456])).toBe(0);
    vi.advanceTimersByTime(15 * 60_000 - 20_000);
    expect(service.requestMany([123])).toBe(1);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(3);
    service.stop();
  });

  it("discovers a newly online friend once and deduplicates repeated snapshots", () => {
    vi.useFakeTimers();
    const startedAt = new Date("2026-08-29T12:00:00Z").getTime();
    vi.setSystemTime(startedAt);
    let onlineFriendNumbers: number[] = [];
    const { bus, service, sendKikiLinkProtocol } = setup({
      getOnlineFriendNumbers: () => onlineFriendNumbers,
    });
    service.start();
    sendKikiLinkProtocol.mockClear();
    const emitOnlineFriends = () => {
      bus.emit("bc:online-friends", {
        friends: onlineFriendNumbers.map((memberNumber) => ({
          memberNumber,
          memberName: `Member ${memberNumber}`,
          roomName: "Moon Garden",
          privateRoom: false,
        })),
        receivedAt: Date.now(),
      });
    };

    onlineFriendNumbers = [123];
    emitOnlineFriends();
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);
    expect(sendKikiLinkProtocol).toHaveBeenLastCalledWith(
      123,
      expect.stringContaining('"t":"pq"'),
    );

    emitOnlineFriends();
    vi.setSystemTime(startedAt + 16 * 60_000);
    emitOnlineFriends();
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);

    onlineFriendNumbers = [];
    emitOnlineFriends();
    onlineFriendNumbers = [123];
    emitOnlineFriends();
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(2);
    service.stop();
  });

  it("rechecks route and compatibility before draining a queued background query", () => {
    vi.useFakeTimers();
    let onlineFriendNumbers = [123, 456, 321];
    const { bus, service, sendKikiLinkProtocol } = setup({
      getOnlineFriendNumbers: () => onlineFriendNumbers,
    });
    service.start();
    sendKikiLinkProtocol.mockClear();

    expect(service.requestMany([123, 456, 321])).toBe(3);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);
    expect(sendKikiLinkProtocol).toHaveBeenLastCalledWith(
      123,
      expect.stringContaining('"t":"pq"'),
    );

    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({ t: "pc", v: "0.26.0", g: 2 }),
    });
    onlineFriendNumbers = [123, 456];
    vi.advanceTimersByTime(140);

    expect(service.hasCompatiblePeer(456)).toBe(true);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);
    service.stop();
  });
});
