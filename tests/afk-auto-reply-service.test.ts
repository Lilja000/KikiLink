import { describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import type { BeepEvent, PresenceStatus } from "../src/core/types";
import {
  AfkAutoReplyService,
  type AfkAutoReplyConfig,
} from "../src/modules/link-chat/afk-auto-reply-service";

function incoming(peerNumber: number): BeepEvent {
  return {
    direction: "incoming",
    peerNumber,
    peerName: `Member ${peerNumber}`,
    content: "Hello",
    sentAt: 1_000,
    includeRoom: false,
  };
}

function setup() {
  let status: PresenceStatus = "idle";
  let config: AfkAutoReplyConfig = {
    enabled: true,
    message: "Привет, я АФК, напишите мне позже!",
  };
  let now = 1_000_000;
  const sendBeep = vi.fn(
    (peerNumber: number, content: string, includeRoom: boolean): BeepEvent => ({
      direction: "outgoing",
      peerNumber,
      peerName: `Member ${peerNumber}`,
      content,
      sentAt: now,
      includeRoom,
    }),
  );
  const service = new AfkAutoReplyService(
    { sendBeep } as Pick<BCAdapter, "sendBeep">,
    {
      getStatus: () => status,
      getConfig: () => config,
      now: () => now,
    },
  );
  return {
    service,
    sendBeep,
    setStatus(value: PresenceStatus) {
      status = value;
      service.syncStatus();
    },
    setConfig(value: AfkAutoReplyConfig) {
      config = value;
    },
    advance(milliseconds: number) {
      now += milliseconds;
    },
  };
}

describe("AfkAutoReplyService", () => {
  it("replies only to incoming Beeps while both Idle and enabled", () => {
    const state = setup();
    state.setStatus("online");
    expect(state.service.handleIncoming(incoming(123))).toBeUndefined();

    state.setStatus("idle");
    state.setConfig({ enabled: false, message: "Away" });
    expect(state.service.handleIncoming(incoming(123))).toBeUndefined();

    state.setConfig({ enabled: true, message: "  Away for now  " });
    const sent = state.service.handleIncoming(incoming(123));
    expect(sent).toMatchObject({
      direction: "outgoing",
      peerNumber: 123,
      content: "Away for now",
      includeRoom: false,
    });
    expect(state.sendBeep).toHaveBeenCalledWith(123, "Away for now", false);

    expect(
      state.service.handleIncoming({ ...incoming(456), direction: "outgoing" }),
    ).toBeUndefined();
  });

  it("replies once per sender per Idle session and preserves a 30-minute cooldown", () => {
    const state = setup();
    expect(state.service.handleIncoming(incoming(123))).toBeDefined();
    state.advance(31 * 60_000);
    expect(state.service.handleIncoming(incoming(123))).toBeUndefined();

    state.setStatus("online");
    state.setStatus("idle");
    expect(state.service.handleIncoming(incoming(123))).toBeDefined();

    state.setStatus("online");
    state.advance(1_000);
    state.setStatus("idle");
    expect(state.service.handleIncoming(incoming(123))).toBeUndefined();
    expect(state.sendBeep).toHaveBeenCalledTimes(2);
  });

  it("limits successful automatic replies to five per minute", () => {
    const state = setup();
    for (const memberNumber of [1, 2, 3, 4, 5]) {
      expect(state.service.handleIncoming(incoming(memberNumber))).toBeDefined();
    }
    expect(state.service.handleIncoming(incoming(6))).toBeUndefined();
    expect(state.sendBeep).toHaveBeenCalledTimes(5);

    state.advance(60_000);
    expect(state.service.handleIncoming(incoming(6))).toBeDefined();
    expect(state.sendBeep).toHaveBeenCalledTimes(6);
  });

  it("does not consume sender or global limits when sending fails", () => {
    const state = setup();
    state.sendBeep.mockImplementationOnce(() => {
      throw new Error("offline");
    });

    expect(state.service.handleIncoming(incoming(123))).toBeUndefined();
    expect(state.service.handleIncoming(incoming(123))).toBeDefined();
    expect(state.sendBeep).toHaveBeenCalledTimes(2);
  });

  it("requires a non-empty reply message and resets session state on Online", () => {
    const state = setup();
    state.setConfig({ enabled: true, message: "   " });
    expect(state.service.handleIncoming(incoming(123))).toBeUndefined();

    state.setConfig({ enabled: true, message: "Away" });
    expect(state.service.handleIncoming(incoming(123))).toBeDefined();
    state.setStatus("online");
    state.advance(30 * 60_000);
    state.setStatus("idle");
    expect(state.service.handleIncoming(incoming(123))).toBeDefined();
  });
});
