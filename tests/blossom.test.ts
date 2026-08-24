// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import type { SettingsStore } from "../src/core/settings";
import type { KikiLinkSettings } from "../src/core/types";
import type { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";
import {
  resolveMainDrawingContext,
  resolveRoomBadgeRect,
  RoomBlossomBadge,
} from "../src/modules/link-chat/blossom";

type RoomBadgeConfig = Parameters<typeof resolveRoomBadgeRect>[0];

function badgeConfig(
  placement: RoomBadgeConfig["placement"] = "between-addons",
  offsetX = 0,
  offsetY = 0,
  enabled = true,
): RoomBadgeConfig {
  return { enabled, placement, offsetX, offsetY };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("room Blossom canvas compatibility", () => {
  it("uses modern Bondage Club's drawing context directly", () => {
    const context = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;

    expect(resolveMainDrawingContext(context)).toBe(context);
  });

  it("still supports builds that expose the canvas element", () => {
    const canvas = document.createElement("canvas");
    const context = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    vi.spyOn(canvas, "getContext").mockReturnValue(context);

    expect(resolveMainDrawingContext(canvas)).toBe(context);
  });

  it("places the Blossom in safe slots before, between, and after common addon icons", () => {
    expect(resolveRoomBadgeRect(badgeConfig("before-addons"), 0, 0, 1)).toEqual({
      x: 216,
      y: 5,
      size: 32,
    });
    expect(resolveRoomBadgeRect(badgeConfig("between-addons"), 0, 0, 1)).toEqual({
      x: 332,
      y: 5,
      size: 32,
    });
    expect(resolveRoomBadgeRect(badgeConfig("after-addons"), 0, 0, 1)).toEqual({
      x: 417,
      y: 5,
      size: 32,
    });
  });

  it("applies fine offsets, character coordinates, zoom, and safe clamps", () => {
    expect(resolveRoomBadgeRect(badgeConfig("between-addons", 10, 15), 10, 20, 0.5)).toEqual({
      x: 181,
      y: 30,
      size: 16,
    });
    expect(resolveRoomBadgeRect(badgeConfig("before-addons", -1_000, -1_000), 0, 0, 1)).toEqual({
      x: 0,
      y: 0,
      size: 32,
    });
    expect(resolveRoomBadgeRect(badgeConfig("after-addons", 1_000, 1_000), 0, 0, 1)).toEqual({
      x: 468,
      y: 160,
      size: 32,
    });
  });

  it("caches live settings, draws translucently, and releases its subscription", () => {
    class ReadyImage extends EventTarget {
      alt = "";
      decoding = "auto";
      draggable = false;
      complete = true;
      naturalWidth = 64;
      src = "";
    }

    vi.stubGlobal("Image", ReadyImage as unknown as typeof Image);
    const context = {
      drawImage: vi.fn(() => {
        expect(context.globalAlpha).toBeCloseTo(0.82);
      }),
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("MainCanvas", context);
    vi.stubGlobal("ChatRoomHideIconState", 0);

    const unsubscribe = vi.fn();
    let settingsListener: ((settings: KikiLinkSettings) => void) | undefined;
    const settings = {
      get: () => ({ ui: { roomBadge: badgeConfig() } }) as KikiLinkSettings,
      subscribe: vi.fn((listener: (settings: KikiLinkSettings) => void) => {
        settingsListener = listener;
        return unsubscribe;
      }),
    } as unknown as SettingsStore;
    const adapter = { getOwnMemberNumber: () => 999 } as unknown as BCAdapter;
    const presence = { hasCompatiblePeer: () => false } as unknown as LinkPresenceService;
    const badge = new RoomBlossomBadge(adapter, presence, settings);

    badge.draw({ MemberNumber: 999 } as BCCharacter, 100, 20, 0.5);
    expect(context.drawImage).toHaveBeenCalledWith(expect.any(ReadyImage), 266, 22.5, 16, 16);
    expect(context.globalAlpha).toBe(1);

    settingsListener?.({
      ui: { roomBadge: badgeConfig("after-addons", 3, 4, false) },
    } as KikiLinkSettings);
    badge.draw({ MemberNumber: 999 } as BCCharacter, 100, 20, 0.5);
    expect(context.drawImage).toHaveBeenCalledTimes(1);

    badge.destroy();
    badge.destroy();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
