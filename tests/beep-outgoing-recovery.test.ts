// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BCAdapter } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import type { KikiLinkEvents } from "../src/core/types";

type SendHook = (args: any[], next: (args: any[]) => unknown) => unknown;
let liveSdk: unknown;
let sendHook: SendHook | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  liveSdk = (window as unknown as { bcModSdk?: unknown }).bcModSdk;
  Object.defineProperty(window, "bcModSdk", { configurable: true, value: {
    registerMod: () => ({ hookFunction: (name: string, _priority: number, hook: SendHook) => {
      if (name === "ServerSend") sendHook = hook;
      return () => {};
    }, unload: () => {} }),
  } });
  globalThis.Player = { MemberNumber: 999, Name: "Kiki", FriendNames: new Map([[123, "Reina"]]) };
  globalThis.ServerSocket = { connected: true, on: vi.fn(), off: vi.fn() } as BCServerSocket;
  globalThis.ServerIsLoggedIn = () => true;
  globalThis.ChatRoomData = null;
  globalThis.ServerAccountBeep = vi.fn();
  globalThis.FriendListBeepLog = [];
});
afterEach(() => {
  Object.defineProperty(window, "bcModSdk", { configurable: true, value: liveSdk });
  sendHook = undefined;
  for (const key of ["Player", "ChatRoomData", "ServerAccountBeep", "FriendListBeepLog", "ServerSend", "ServerSendBeepMessage", "ServerSocket", "ServerIsLoggedIn"]) {
    Reflect.deleteProperty(globalThis, key); Reflect.deleteProperty(window, key);
  }
  vi.useRealTimers();
});

function setup() {
  const transport = vi.fn();
  globalThis.ServerSend = (...args) => {
    if (sendHook) sendHook(args, forwarded => transport(...forwarded));
    else transport(...args);
  };
  const bus = new EventBus<KikiLinkEvents>(), sent = vi.fn();
  bus.on("beep:sent", sent);
  return { adapter: new BCAdapter(bus, "1.0.2"), sent, transport };
}

it("keeps an accepted Beep accepted if the native helper's later log write throws", async () => {
  globalThis.ServerSendBeepMessage = (target, message) => {
    ServerSend("AccountBeep", { MemberNumber: target, BeepType: "", IsSecret: true, Message: message });
    throw new Error("Native log unavailable after transport handoff");
  };
  const { adapter, transport } = setup();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    await adapter.start();
    expect(adapter.sendBeep(123, "Only send this once", false).content).toBe("Only send this once");
    expect(transport).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalled();
  } finally { adapter.stop(); warning.mockRestore(); }
});

it("retains a rejected Beep when the native helper throws before transport handoff", async () => {
  globalThis.ServerSendBeepMessage = () => { throw new Error("Native send was blocked"); };
  const { adapter, transport } = setup();
  try {
    await adapter.start();
    expect(() => adapter.sendBeep(123, "Keep this draft", false)).toThrow("Native send was blocked");
    expect(transport).not.toHaveBeenCalled();
  } finally { adapter.stop(); }
});

it.each([false, true])("captures a text-transformed native handoff once when later bookkeeping throws: %s", async bookkeepingThrows => {
  globalThis.ServerSendBeepMessage = (target, message) => {
    // A translator or formatter can alter the packet before our transport hook.
    ServerSend("AccountBeep", { MemberNumber: target, BeepType: "", IsSecret: true, Message: "Bonjour" });
    if (bookkeepingThrows) throw new Error("Native log unavailable after translated handoff");
    FriendListBeepLog.push({ MemberNumber: target, MemberName: "Reina", Sent: true,
      Time: new Date(), ...(message !== undefined ? { Message: message } : {}) });
  };
  const { adapter, sent, transport } = setup();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    await adapter.start();
    expect(adapter.sendBeep(123, "Hello", false).content).toBe("Hello");
    expect(transport).toHaveBeenCalledExactlyOnceWith("AccountBeep", expect.objectContaining({ MemberNumber: 123, Message: "Bonjour" }));
    await vi.advanceTimersByTimeAsync(1_001);
    expect(sent).not.toHaveBeenCalled();
    expect(warning.mock.calls.length).toBe(bookkeepingThrows ? 1 : 0);
  } finally { adapter.stop(); warning.mockRestore(); }
});

it("captures unrelated packets and later intentional messages inside a native submission", async () => {
  globalThis.ServerSendBeepMessage = target => {
    ServerSend("AccountBeep", { MemberNumber: 456, BeepType: "", IsSecret: true, Message: "Other conversation" });
    ServerSend("AccountBeep", { MemberNumber: target, BeepType: "", IsSecret: true, Message: "Bonjour" });
    ServerSend("AccountBeep", { MemberNumber: target, BeepType: "", IsSecret: true, Message: "Separate intentional message" });
  };
  const { adapter, sent, transport } = setup();
  try {
    await adapter.start();
    expect(adapter.sendBeep(123, "Hello", false).content).toBe("Hello");
    expect(transport).toHaveBeenCalledTimes(3);
    expect(sent.mock.calls.map(([event]) => [event.peerNumber, event.content])).toEqual([
      [456, "Other conversation"], [123, "Separate intentional message"],
    ]);
  } finally { adapter.stop(); }
});

it.each([
  { label: "room sharing outside a room", includeRoom: true, room: undefined, delay: 0 },
  { label: "a slow first native send", includeRoom: false, room: undefined, delay: 600 },
  { label: "a slow first send with a room", includeRoom: true, room: "Moon Garden", delay: 600 },
])("does not recapture KikiLink's native log with $label", async ({ includeRoom, room, delay }) => {
  globalThis.ChatRoomData = room ? { Name: room, Visibility: ["All"] } : null;
  globalThis.ServerSendBeepMessage = (target, message, options) => {
    ServerSend("AccountBeep", { MemberNumber: target, BeepType: "", IsSecret: !options?.includeRoom, Message: message });
    // BC logs after ServerSend and any other addon's synchronous hooks.
    vi.setSystemTime(Date.now() + delay);
    FriendListBeepLog.push({ MemberNumber: target, MemberName: "Reina", Sent: true,
      Time: new Date(), ...(message !== undefined ? { Message: message } : {}),
      ...(options?.includeRoom && room ? { ChatRoomName: room } : {}) });
  };
  const { adapter, sent, transport } = setup();
  try {
    await adapter.start();
    const first = adapter.sendBeep(123, "Starting a conversation", includeRoom);
    expect(first.content).toBe("Starting a conversation");
    expect(transport).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1_001);
    expect(sent).not.toHaveBeenCalled();
  } finally { adapter.stop(); }
});

it.each(["kikilink", "transport"])("pairs each %s send with one log entry and keeps intentional repeats", async source => {
  const log = () => FriendListBeepLog.push({ MemberNumber: 123, MemberName: "Reina", Sent: true,
    Time: new Date(), Message: "Same message" });
  globalThis.ServerSendBeepMessage = (target, message) => {
    ServerSend("AccountBeep", { MemberNumber: target, BeepType: "", IsSecret: true, Message: message });
    log();
  };
  const { adapter, sent, transport } = setup();
  try {
    await adapter.start();
    for (let i = 0; i < 2; i++) {
      if (source === "kikilink") adapter.sendBeep(123, "Same message", false);
      else ServerSendBeepMessage(123, "Same message", { includeRoom: false });
    }
    expect(transport).toHaveBeenCalledTimes(2);
    const captures = source === "kikilink" ? 0 : 2;
    expect(sent).toHaveBeenCalledTimes(captures);
    // A third real send is observable only through the log, at the same millisecond.
    log();
    await vi.advanceTimersByTimeAsync(1_001);
    expect(sent).toHaveBeenCalledTimes(captures + 1);
    expect(sent).toHaveBeenLastCalledWith(expect.objectContaining({ content: "Same message" }));
  } finally { adapter.stop(); }
});
