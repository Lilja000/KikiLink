import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../src/core/event-bus";

interface TestEvents {
  ping: { value: number };
  empty: undefined;
}

describe("EventBus", () => {
  it("delivers typed payloads and unsubscribes", () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    const unsubscribe = bus.on("ping", listener);

    bus.emit("ping", { value: 7 });
    unsubscribe();
    bus.emit("ping", { value: 8 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ value: 7 });
  });

  it("supports one-shot listeners", () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    bus.once("empty", listener);

    bus.emit("empty", undefined);
    bus.emit("empty", undefined);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
