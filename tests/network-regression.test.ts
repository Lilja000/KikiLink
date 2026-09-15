// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcModSDK from "bondage-club-mod-sdk";
import { BCAdapter } from "../src/bc/adapter";
import { bcTrafficAudit, resetBCTrafficAudit, withBCNetworkReason } from "../src/bc/traffic-audit";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { KikiLinkEvents } from "../src/core/types";
import { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";

let adapter: BCAdapter, presence: LinkPresenceService, bus: EventBus<KikiLinkEvents>, settings: SettingsStore;
let send: ReturnType<typeof vi.fn<(type: string, data: any) => void>>;
let listeners: Map<string, Set<(...args: any[]) => void>>;
function emit(event: string, data?: unknown): void { for (const fn of listeners.get(event) ?? []) fn(data); }
function newSocket() {
  listeners = new Map();
  const own = listeners;
  return { connected: true, on: (event: string, fn: (...args: any[]) => void) => {
    if (!own.has(event)) own.set(event, new Set()); own.get(event)!.add(fn);
  }, off: (event: string, fn: (...args: any[]) => void) => { own.get(event)?.delete(fn); } };
}
const packets = (kind: string) => send.mock.calls.flatMap(([type, data]) => {
  const wire = data.Content ?? data.Message;
  if (typeof wire !== "string" || !wire.startsWith("KIKILINK/1 ")) return [];
  const packet = JSON.parse(wire.slice(11));
  return packet.t === kind ? [{ type, ...data, packet }] : [];
});
const queries = () => send.mock.calls.filter(([type, data]) => type === "AccountQuery" && data.Query === "OnlineFriends");

beforeEach(async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-14T12:00:00Z"));
  vi.stubGlobal("Player", { MemberNumber: 101, Name: "Fixture", FriendNames: new Map(), FriendList: [], BlackList: [], GhostList: [] });
  vi.stubGlobal("ChatRoomData", { Name: "Fixture A", Space: "X" });
  vi.stubGlobal("ChatRoomCharacter", [Player, { MemberNumber: 202, Name: "Peer" }]);
  vi.stubGlobal("ServerIsLoggedIn", () => true); vi.stubGlobal("ServerPlayerIsInChatRoom", () => true);
  vi.stubGlobal("ServerSocket", newSocket()); vi.stubGlobal("ServerAccountBeep", () => {}); vi.stubGlobal("ServerAccountQueryResult", () => {});
  send = vi.fn((type: string, _data: unknown) => { if (type === "AccountQuery") emit("AccountQueryResult", { Query: "OnlineFriends", Result: [] }); });
  // BC globals stay stable across addon reloads; retain the real SDK router between fixture cases.
  vi.stubGlobal("ServerSend", bcModSDK.getPatchingInfo().get("ServerSend")?.sdkEntrypoint ?? ((type: string, data: unknown) => send(type, data)));
  vi.stubGlobal("ServerSendBeepMessage", (target: number, message: string) => ServerSend("AccountBeep", { MemberNumber: target, Message: message }));
  bus = new EventBus<KikiLinkEvents>(); adapter = new BCAdapter(bus, "0.29.0");
  settings = new SettingsStore(new MemoryKeyValueStorage()); settings.update(d => { d.linkPresence.autoIdleMinutes = 0; });
  presence = new LinkPresenceService(adapter, settings, bus, "0.29.0");
  await adapter.start(); presence.start(); send.mockClear();
});
afterEach(() => { presence.stop(); adapter.stop(); resetBCTrafficAudit(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("BC outgoing regression", () => {
  it("sends one rare liveness update, no discovery loop, and one safety query in five idle minutes", () => {
    vi.advanceTimersByTime(5 * 60_000);
    expect(packets("ps")).toHaveLength(1); expect(packets("pq")).toHaveLength(0); expect(queries()).toHaveLength(1);
  });
  it("publishes real changes immediately and coalesces unchanged settings", () => {
    presence.setOwnStatus("dnd"); presence.setOwnStatus("dnd");
    expect(packets("ps")).toHaveLength(1); expect(packets("ps")[0]!.packet.s).toBe("dnd");
    presence.setOwnStatusMessage("Busy"); presence.setOwnStatusMessage("Busy");
    expect(packets("ps")).toHaveLength(2);
    vi.advanceTimersByTime(30_000); expect(packets("ps")).toHaveLength(2);
  });
  it("uses the same single keepalive for disabled sharing and answers a late peer immediately", () => {
    presence.setEnabled(false); send.mockClear(); vi.advanceTimersByTime(4 * 60_000);
    expect(packets("pc")).toHaveLength(1); expect(packets("ps")).toHaveLength(0);
    bus.emit("bc:protocol", { senderNumber: 202, channel: "room", payload: JSON.stringify({ t: "pq", i: "late-peer" }) });
    expect(packets("pc").at(-1)!.Target).toBe(202);
    expect(packets("pc").filter(p => p.Target === undefined)).toHaveLength(1);
  });
  it("refreshes a stale visible list immediately and shares native results between consumers", () => {
    vi.advanceTimersByTime(120_000); expect(queries()).toHaveLength(0);
    presence.setNativeFriendsVisible(true); expect(queries()).toHaveLength(1);
    for (let n = 0; n < 20; n++) { presence.setNativeFriendsVisible(false); presence.setNativeFriendsVisible(true); adapter.refreshOnlineFriends(); }
    expect(queries()).toHaveLength(1);
    vi.advanceTimersByTime(30_000); expect(queries()).toHaveLength(2);
    presence.setNativeFriendsVisible(false); vi.advanceTimersByTime(120_000); expect(queries()).toHaveLength(2);
  });
  it("backs off a missing OnlineFriends response and reuses a fresh native response", () => {
    presence.setNativeFriendsVisible(true); send.mockImplementation(() => {});
    vi.advanceTimersByTime(30_000); expect(queries()).toHaveLength(1);
    for (let n = 0; n < 10; n++) adapter.refreshOnlineFriends(); expect(queries()).toHaveLength(1);
    vi.advanceTimersByTime(20_000); emit("AccountQueryResult", { Query: "OnlineFriends", Result: [] });
    vi.advanceTimersByTime(10_000); expect(queries()).toHaveLength(1);
  });
  it("notifies a reopened UI when an unchanged but stale friend snapshot becomes fresh again", () => {
    const changed = vi.fn(); bus.on("bc:online-friends", changed);
    emit("AccountQueryResult", { Query: "OnlineFriends", Result: [] }); expect(changed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100_000);
    presence.setNativeFriendsVisible(true); expect(changed).toHaveBeenCalledOnce();
    emit("AccountQueryResult", { Query: "OnlineFriends", Result: [] }); expect(changed).toHaveBeenCalledOnce();
  });
  it("does not turn a native room-search failure into a second differently shaped network request", async () => {
    const search = vi.fn(async (_query: string, _request: unknown) => { throw new Error("native request timed out"); });
    vi.stubGlobal("ServerRoomSearch", search);
    await expect(adapter.searchRooms("Fixture")).rejects.toThrow("could not refresh");
    expect(search).toHaveBeenCalledOnce();
  });
  it("coalesces native room sync, polling and ready/visibility signals", async () => {
    ChatRoomData!.Name = "Fixture B"; emit("ChatRoomSync"); await Promise.resolve();
    expect(packets("pq")).toHaveLength(1); expect(packets("ps")).toHaveLength(1);
    bus.emit("bc:ready", { memberNumber: 101 }); document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(2_000); expect(packets("pq")).toHaveLength(1); expect(packets("ps")).toHaveLength(1);
    ChatRoomData!.Space = ""; emit("ChatRoomSync"); await Promise.resolve();
    expect(packets("pq")).toHaveLength(2); // Same room name in another space is another room.
  });
  it("sends one recovery exchange after repeated reconnects and removes replaced socket handlers", () => {
    for (let n = 0; n < 3; n++) {
      vi.advanceTimersByTime(15_000); send.mockClear();
      ServerSocket!.connected = false; emit("disconnect"); ServerSocket!.connected = true; emit("connect"); emit("connect");
      bus.emit("bc:ready", { memberNumber: 101 }); document.dispatchEvent(new Event("visibilitychange"));
      expect(queries()).toHaveLength(1); expect(packets("pq")).toHaveLength(1); expect(packets("ps")).toHaveLength(1);
    }
    const oldListeners = listeners;
    vi.stubGlobal("ServerSocket", newSocket()); vi.advanceTimersByTime(2_001);
    expect([...oldListeners.values()].every(set => set.size === 0)).toBe(true);
    expect([...listeners.values()].every(set => set.size === 1)).toBe(true);
  });
  it("does not rediscover the room on fast foreground changes and stops typing on background", () => {
    presence.setTyping(202, true);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden"); document.dispatchEvent(new Event("visibilitychange"));
    expect(packets("ty").map(p => p.packet.a)).toEqual([1, 0]);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    for (let n = 0; n < 10; n++) document.dispatchEvent(new Event("visibilitychange"));
    expect(packets("pq")).toHaveLength(0); expect(queries()).toHaveLength(0);
  });
  it("coalesces an in-flight rich profile with repeated opens and other state consumers", () => {
    expect(presence.request(202, true, true)).toBe(true);
    for (let n = 0; n < 5; n++) { presence.request(202, true, true); presence.request(202, true); presence.requestMany([202]); vi.advanceTimersByTime(1000); }
    expect(packets("pq")).toHaveLength(1); expect(packets("pq")[0]!.Target).toBe(202);
    vi.advanceTimersByTime(5_001); expect(presence.request(202, true, true)).toBe(true); expect(packets("pq")).toHaveLength(2);
  });
  it("renews overdue liveness once when returning from suspended browser timers", () => {
    // Wall time moves while the browser's task timers remain suspended.
    vi.setSystemTime(Date.now() + 6 * 60_000);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    for (let n = 0; n < 5; n++) document.dispatchEvent(new Event("visibilitychange"));
    expect(packets("ps")).toHaveLength(1); expect(packets("pq")).toHaveLength(0);
    expect(queries()).toHaveLength(1);
    vi.advanceTimersByTime(30_000); expect(packets("ps")).toHaveLength(1);
  });
  it("keeps typing immediate, throttled, targeted and dormant after input stops", () => {
    for (let n = 0; n < 30; n++) { presence.setTyping(202, true); vi.advanceTimersByTime(100); }
    expect(packets("ty").map(p => p.packet.a)).toEqual([1, 1]);
    presence.setTyping(202, false, true); presence.setTyping(202, false, true);
    vi.advanceTimersByTime(30_000); expect(packets("ty").map(p => p.packet.a)).toEqual([1, 1, 0]);
    expect(packets("ty").every(p => p.Target === 202)).toBe(true);
  });
  it("expires a lost remote typing stop and cancels every presence timer on stop", () => {
    bus.emit("bc:protocol", { senderNumber: 202, channel: "room", payload: '{"t":"ty","a":1}' });
    expect(presence.isTyping(202)).toBe(true); vi.advanceTimersByTime(5_501); expect(presence.isTyping(202)).toBe(false);
    presence.stop(); adapter.stop(); send.mockClear(); vi.advanceTimersByTime(10 * 60_000);
    expect(send).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("records only attributed calls, exact UTF-8 payload size and reasons without private contents", () => {
    bcTrafficAudit.start();
    adapter.sendBeep(202, "Private 🦊 text", false);
    ServerSend("AccountBeep", { MemberNumber: 202, Message: "Foreign addon" });
    presence.setTyping(202, true); vi.advanceTimersByTime(1_801); presence.setTyping(202, true); presence.setTyping(202, false, true);
    const audit = bcTrafficAudit.snapshot();
    expect(audit.hookAvailable).toBe(true); expect(audit.total).toBe(4);
    expect(audit.entries.map(e => e.reason)).toEqual(["direct-message", "typing-start", "typing-refresh", "typing-stop"]);
    expect(audit.entries[0]!.payloadBytes).toBe(new TextEncoder().encode(JSON.stringify(send.mock.calls[0]![1])).length);
    expect(JSON.stringify(audit)).not.toMatch(/Private|Foreign|Message|🦊/);
    bcTrafficAudit.stop(); adapter.sendBeep(202, "No recording", false); expect(bcTrafficAudit.snapshot().total).toBe(4);
  });
  it("bounds diagnostic retention and preserves native send exceptions", () => {
    bcTrafficAudit.start();
    for (let n = 0; n < 2005; n++) adapter.sendKikiLinkProtocol(202, '{"t":"ty","a":1}');
    const audit = bcTrafficAudit.snapshot(); expect(audit.entries).toHaveLength(2000); expect(audit.dropped).toBe(5);
    expect(audit.entries.at(-1)!.repeatedWithin2s).toBe(true);
    send.mockImplementation(() => { throw new Error("Native send failure"); });
    expect(() => withBCNetworkReason("test", () => ServerSend("Test", {}))).toThrow("Native send failure");
    expect(bcTrafficAudit.snapshot().entries.at(-1)!.outcome).toBe("threw");
  });
  it("prefers passive outgoing socket events, counts each once, and cleans up its own observer", () => {
    const outgoing = new Set<(event: string, data: unknown) => void>();
    const replacement = { ...newSocket(),
      onAnyOutgoing: (fn: (event: string, data: unknown) => void) => outgoing.add(fn),
      offAnyOutgoing: (fn: (event: string, data: unknown) => void) => outgoing.delete(fn) };
    vi.stubGlobal("ServerSocket", replacement); vi.advanceTimersByTime(2_001);
    send.mockImplementation((event, data) => { for (const fn of outgoing) fn(event, data); });
    bcTrafficAudit.start();
    adapter.sendBeep(202, "Private", false);
    expect(bcTrafficAudit.snapshot()).toMatchObject({ socketObserverAvailable: true, total: 1 });
    expect(bcTrafficAudit.snapshot().entries[0]!.boundary).toBe("socket-outgoing");
    withBCNetworkReason("room-search", () => { for (const fn of outgoing) fn("ChatRoomSearch", { Query: "Room" }); });
    expect(bcTrafficAudit.snapshot().total).toBe(2);
    for (const fn of outgoing) fn("OtherAddonEvent", { value: "unrelated" });
    expect(bcTrafficAudit.snapshot().total).toBe(2);
    const foreign = () => {}; outgoing.add(foreign);
    bcTrafficAudit.stop(); expect([...outgoing]).toEqual([foreign]);
  });
  it("does not queue stale protocol packets while the socket is disconnected", () => {
    ServerSocket!.connected = false; emit("disconnect");
    expect(() => adapter.sendKikiLinkProtocol(202, '{"t":"ty","a":1}')).toThrow("reconnecting");
    expect(adapter.broadcastKikiLinkProtocol('{"t":"pc","v":"0.29.0","g":3}')).toBe(false);
    vi.advanceTimersByTime(4 * 60_000); expect(send).not.toHaveBeenCalled();
    ServerSocket!.connected = true; emit("connect");
    expect(packets("ps")).toHaveLength(1); expect(packets("ty")).toHaveLength(0);
  });
});
