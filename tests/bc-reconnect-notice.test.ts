// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import type { KikiLinkEvents } from "../src/core/types";

afterEach(() => { vi.useRealTimers(); });

  it("keeps the WCE reconnect corner notice but excludes it from hooked and polled chat capture", async () => {
    vi.useFakeTimers();
    globalThis.Player = { MemberNumber: 999, Name: "Kiki", FriendNames: new Map() };
    globalThis.ServerIsLoggedIn = () => true;
    globalThis.ServerSendBeepMessage = vi.fn(); globalThis.ServerSend = vi.fn();
    globalThis.FriendListBeepLog = [];
    const toast = vi.fn();
    const original = vi.fn((data: BCServerAccountBeepResponse) => {
      toast(data.Message);
      FriendListBeepLog.push({ ...data, Sent: false, Time: new Date() });
    });
    globalThis.ServerAccountBeep = original;
    const bus = new EventBus<KikiLinkEvents>(), incoming = vi.fn();
    bus.on("beep:received", incoming);
    const adapter = new BCAdapter(bus, "0.30.0");
    await adapter.start();
    try {
      const notice = { MemberNumber: 999, MemberName: "VOID", ChatRoomName: "VOID", ChatRoomSpace: "",
        Private: true, BeepType: "", Message: "Reconnected!" };
      // WCE calls the original function, so the polling route matters too.
      original({ ...notice });
      ServerAccountBeep({ ...notice });
      await vi.advanceTimersByTimeAsync(1_001);
      expect(toast).toHaveBeenCalledTimes(2); expect(incoming).not.toHaveBeenCalled();
      expect(FriendListBeepLog).toHaveLength(2); expect(adapter.getRecentBeeps()).toEqual([]);
      ServerAccountBeep({ ...notice, Message: "An addon update is available." });
      ServerAccountBeep({ ...notice, MemberNumber: 123, MemberName: "Friend" });
      ServerAccountBeep({ MemberNumber: 999, MemberName: "Kiki", Message: "Reconnected!" });
      ServerAccountBeep({ ...notice, Message: "Reconnected! New update available." });
      await vi.advanceTimersByTimeAsync(1_001);
      expect(incoming).toHaveBeenCalledTimes(4);
      expect(adapter.getRecentBeeps()).toHaveLength(4);
      expect(toast).toHaveBeenCalledTimes(6);
    } finally { adapter.stop(); }
  });
