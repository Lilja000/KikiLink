// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { KikiLinkEvents } from "../src/core/types";
import { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";

function setup(options: { inRoom?: boolean } = {}) {
  const inRoom = options.inRoom === true;
  const sendKikiLinkProtocol = vi.fn(() => "beep" as const);
  const broadcastKikiLinkProtocol = vi.fn((_payload: string) => false);
  const adapter = {
    getOwnMemberNumber: () => 999,
    refreshOnlineFriends: vi.fn(() => true),
    getOnlineFriends: () => [
      {
        memberNumber: 123,
        memberName: "Reina",
        roomName: "Moon Garden",
        privateRoom: false,
      },
    ],
    hasOnlineFriendSnapshot: () => true,
    isKnownFriend: (memberNumber: number) => memberNumber === 123 || memberNumber === 456,
    isMemberInCurrentRoom: () => inRoom,
    isInChatRoom: () => inRoom,
    getCurrentRoomName: () => (inRoom ? "Moon Garden" : undefined),
    sendKikiLinkProtocol,
    broadcastKikiLinkProtocol,
  } as unknown as BCAdapter;
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  const bus = new EventBus<KikiLinkEvents>();
  const service = new LinkPresenceService(adapter, settings, bus, "0.11.0");
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
    expect(service.hasCompatiblePeer(123)).toBe(true);
    expect(service.hasCompatiblePeer(123, Date.now() + 5 * 60_000 + 1)).toBe(false);
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
      JSON.stringify({ t: "pc", v: "0.11.0" }),
    );
    expect(service.requestMany([123])).toBe(0);

    bus.emit("bc:protocol", {
      senderNumber: 456,
      channel: "beep",
      payload: JSON.stringify({
        t: "ps",
        s: "dnd",
        m: "Must stay private",
        u: Date.now(),
        v: "0.22.12",
      }),
    });
    expect(service.hasCompatiblePeer(456)).toBe(true);
    expect(service.get(456)).toMatchObject({ status: "online", source: "room" });
    expect(service.get(456).statusMessage).toBeUndefined();

    expect(service.request(321, true)).toBe(true);
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
      autoIdleMinutes: 7,
      afkAutoReply: { enabled: true, message: "Back later!" },
    });
    expect(broadcastKikiLinkProtocol).toHaveBeenCalledTimes(2);
    const disabledPacket = broadcastKikiLinkProtocol.mock.calls.at(-1)?.[0] ?? "";
    expect(disabledPacket).toContain('"s":"offline"');
    expect(disabledPacket).not.toContain('"a":');
    expect(disabledPacket).not.toContain('"m":');
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

  it("discovers visible players through a deduplicated, rate-limited queue", () => {
    vi.useFakeTimers();
    const { service, sendKikiLinkProtocol } = setup();

    expect(service.requestMany([123, 456, 123, 999, -1, Number.NaN])).toBe(2);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);
    expect(sendKikiLinkProtocol).toHaveBeenLastCalledWith(
      123,
      expect.stringContaining('"t":"pq"'),
    );

    vi.advanceTimersByTime(139);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(sendKikiLinkProtocol).toHaveBeenCalledTimes(2);
    expect(sendKikiLinkProtocol).toHaveBeenLastCalledWith(
      456,
      expect.stringContaining('"t":"pq"'),
    );
    expect(service.requestMany([123, 456])).toBe(0);
    service.stop();
  });
});
