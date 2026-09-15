// @vitest-environment happy-dom
// Counts actual calls at the ServerSend boundary, with synthetic BC/socket responses.
// No network connection, wire-size claim, or live BC compatibility claim.
import { afterEach, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { KikiLinkEvents } from "../src/core/types";
import { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";

type Packet = { at: number; event: string; destination: number | "room" | "server"; bytes: number; kind: string; body: string };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("measures deterministic five-minute scenarios at the BC send boundary", async () => {
  const results: Record<string, unknown> = {};
  for (const scenario of ["idle-room", "normal-chat", "profiles-and-ui", "room-and-reconnect"]) {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-14T12:00:00Z"));
    const start = Date.now(), packets: Packet[] = [];
    const listeners = new Map<string, Set<(...args: any[]) => void>>();
    const socket = { connected: true, on: (event: string, fn: (...args: any[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event)!.add(fn);
    }, off: (event: string, fn: (...args: any[]) => void) => { listeners.get(event)?.delete(fn); } };
    const emit = (event: string, data?: unknown) => { for (const listener of listeners.get(event) ?? []) listener(data); };
    vi.stubGlobal("Player", { MemberNumber: 101, Name: "Fixture", FriendNames: new Map(), FriendList: [], BlackList: [], GhostList: [] });
    vi.stubGlobal("ChatRoomData", { Name: "Fixture A", Space: "X" });
    vi.stubGlobal("ChatRoomCharacter", [Player, { MemberNumber: 202, Name: "Peer" }]);
    vi.stubGlobal("ServerIsLoggedIn", () => true); vi.stubGlobal("ServerPlayerIsInChatRoom", () => true);
    vi.stubGlobal("ServerSocket", socket);
    vi.stubGlobal("ServerAccountBeep", () => {}); vi.stubGlobal("ServerAccountQueryResult", () => {});
    vi.stubGlobal("ServerSend", (event: string, data: any) => {
      const body = JSON.stringify(data), wire = data.Content ?? data.Message;
      let kind = event === "AccountQuery" ? "online-friends-query" : "direct-message";
      if (typeof wire === "string" && wire.startsWith("KIKILINK/1 ")) {
        const p = JSON.parse(wire.slice(11)); kind = p.t === "pq" ? (p.b ? "room-discovery" : p.p ? "profile-request" : "presence-request") : p.t;
      }
      packets.push({ at: Date.now() - start, event, destination: data.Target ?? data.MemberNumber ?? (event === "ChatRoomChat" ? "room" : "server"),
        bytes: new TextEncoder().encode(body).length, kind, body });
      if (event === "AccountQuery") emit("AccountQueryResult", { Query: "OnlineFriends", Result: [] });
    });
    vi.stubGlobal("ServerSendBeepMessage", (target: number, message: string) => ServerSend("AccountBeep", { MemberNumber: target, Message: message, BeepType: "" }));
    const bus = new EventBus<KikiLinkEvents>(), adapter = new BCAdapter(bus, "0.29.0");
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update(draft => { draft.linkPresence.autoIdleMinutes = 60; });
    const service = new LinkPresenceService(adapter, settings, bus, "0.29.0");
    await adapter.start(); service.start();
    try {
      for (let second = 1; second <= 300; second++) {
        vi.advanceTimersByTime(1000);
        if (scenario === "normal-chat") {
          (service as LinkPresenceService & { setNativeFriendsVisible?: (visible: boolean) => void }).setNativeFriendsVisible?.(true);
          if (second % 30 < 5) service.setTyping(202, true);
          if (second % 30 === 5) { service.setTyping(202, false, true); adapter.sendBeep(202, `Fixture message ${second}`, false); }
        }
        if (scenario === "profiles-and-ui" && second % 30 === 1) {
          for (let n = 0; n < 3; n++) service.request(202, true, true);
          (service as LinkPresenceService & { setNativeFriendsVisible?: (visible: boolean) => void }).setNativeFriendsVisible?.(true);
        }
        if (scenario === "room-and-reconnect" && second === 100) ChatRoomData!.Name = "Fixture B";
        if (scenario === "room-and-reconnect" && second === 200) {
          socket.connected = false; emit("disconnect"); socket.connected = true; emit("connect");
          bus.emit("bc:ready", { memberNumber: 101 }); bus.emit("bc:ready", { memberNumber: 101 });
          document.dispatchEvent(new Event("visibilitychange"));
        }
      }
      const kinds: Record<string, { count: number; bytes: number }> = {};
      for (const packet of packets) { const row = kinds[packet.kind] ??= { count: 0, bytes: 0 }; row.count++; row.bytes += packet.bytes; }
      const recent = new Map<string, number>();
      let identicalPayloadWithin2s = 0;
      for (const packet of packets) {
        const key = `${packet.event}\u0000${packet.body}`, previous = recent.get(key);
        if (previous !== undefined && packet.at - previous < 2000) identicalPayloadWithin2s++;
        recent.set(key, packet.at);
      }
      results[scenario] = { count: packets.length, bytes: packets.reduce((sum, packet) => sum + packet.bytes, 0), kinds,
        identicalPayloadWithin2s,
        packets: packets.map(({ body: _body, ...meta }) => meta) };
      expect(packets.length).toBeGreaterThan(0);
    } finally { service.stop(); adapter.stop(); vi.unstubAllGlobals(); vi.useRealTimers(); }
  }
  if (process.env.KIKILINK_TRAFFIC_RESULT) writeFileSync(process.env.KIKILINK_TRAFFIC_RESULT, JSON.stringify({ environment: "synthetic BC, real KikiLink send paths, fake clock; JSON UTF-8 payload bytes", results }, null, 2) + "\n");
});
