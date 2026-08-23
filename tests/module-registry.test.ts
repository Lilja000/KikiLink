import { describe, expect, it, vi } from "vitest";
import { ModuleRegistry } from "../src/core/module-registry";
import type { KikiLinkContext, KikiLinkModule, KikiLinkSettings } from "../src/core/types";
import { DEFAULT_SETTINGS } from "../src/core/settings";

function moduleFixture(id: string, enabled = true): KikiLinkModule {
  return {
    id,
    isEnabled: vi.fn(() => enabled),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

describe("ModuleRegistry", () => {
  it("starts enabled modules and stops them in reverse order", async () => {
    const order: string[] = [];
    const first = moduleFixture("first");
    const second = moduleFixture("second");
    first.start = () => {
      order.push("start:first");
    };
    first.stop = () => {
      order.push("stop:first");
    };
    second.start = () => {
      order.push("start:second");
    };
    second.stop = () => {
      order.push("stop:second");
    };
    const registry = new ModuleRegistry();
    registry.register(first);
    registry.register(second);

    const context = {
      settings: { get: () => structuredClone(DEFAULT_SETTINGS) as KikiLinkSettings },
    } as KikiLinkContext;
    await registry.startAll(context);
    await registry.stopAll();

    expect(order).toEqual(["start:first", "start:second", "stop:second", "stop:first"]);
  });

  it("skips disabled modules", async () => {
    const disabled = moduleFixture("disabled", false);
    const registry = new ModuleRegistry();
    registry.register(disabled);

    const context = {
      settings: { get: () => structuredClone(DEFAULT_SETTINGS) },
    } as KikiLinkContext;
    await registry.startAll(context);

    expect(disabled.start).not.toHaveBeenCalled();
  });
});
