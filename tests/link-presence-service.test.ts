import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { KikiLinkEvents } from "../src/core/types";
import { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";

function setup() {
  const sendKikiLinkProtocol = vi.fn(() => "beep" as const);
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
    isMemberInCurrentRoom: () => false,
    isInChatRoom: () => false,
    getCurrentRoomName: () => undefined,
    sendKikiLinkProtocol,
    broadcastKikiLinkProtocol: vi.fn(() => false),
  } as unknown as BCAdapter;
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  const bus = new EventBus<KikiLinkEvents>();
  const service = new LinkPresenceService(adapter, settings, bus, "0.11.0");
  return { adapter, settings, bus, service, sendKikiLinkProtocol };
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
        u: Date.now(),
        v: "0.11.0",
      }),
    });
    expect(service.get(123)).toMatchObject({
      status: "dnd",
      source: "kikilink",
      statusMessage: "In a scene",
    });
    expect(service.hasCompatiblePeer(123)).toBe(true);
    expect(service.hasCompatiblePeer(123, Date.now() + 5 * 60_000 + 1)).toBe(false);
    service.stop();
  });

  it("publishes user-selected status without changing Bondage Club state", () => {
    const { service, settings } = setup();
    service.setOwnStatus("offline");

    expect(service.getOwnStatus()).toBe("offline");
    expect(settings.get().linkPresence.status).toBe("offline");
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
});
