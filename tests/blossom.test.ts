// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter, BCCharacterOverlayRenderer } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";
import {
  BLOSSOM_ICON_DATA_URL,
  DEFAULT_ROOM_BADGE_POSITION,
  normalizeRoomBadgePosition,
  resolveRoomBadgePosition,
  RoomBlossomBadge,
} from "../src/modules/link-chat/blossom";

interface BadgeFixture {
  badge: RoomBlossomBadge;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  render: BCCharacterOverlayRenderer;
  unregister: ReturnType<typeof vi.fn>;
  settings: SettingsStore;
  compatible: Set<number>;
}

const activeBadges = new Set<RoomBlossomBadge>();
const blossomSvg = readFileSync(
  resolve(process.cwd(), "design/branding/kikilink-blossom.svg"),
  "utf8",
);

function fixture(options: { inRoom?: boolean } = {}): BadgeFixture {
  const canvas = document.createElement("canvas");
  canvas.id = "MainCanvas";
  canvas.width = 2_000;
  canvas.height = 1_000;
  document.body.append(canvas);
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 2_000,
    bottom: 1_000,
    width: 2_000,
    height: 1_000,
    toJSON: () => ({}),
  });
  Object.defineProperties(canvas, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: () => true },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
  const context = {
    canvas,
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setLineDash: vi.fn(),
    strokeRect: vi.fn(),
    globalAlpha: 1,
    strokeStyle: "",
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
  globalThis.MainCanvas = context;
  globalThis.ChatRoomHideIconState = 0;
  globalThis.DrawImageResize = vi.fn(() => true);
  const compatible = new Set<number>();
  let render: BCCharacterOverlayRenderer | undefined;
  const unregister = vi.fn();
  const adapter = {
    getOwnMemberNumber: () => 999,
    isInChatRoom: () => options.inRoom !== false,
    registerCharacterOverlay: (next: BCCharacterOverlayRenderer) => {
      render = next;
      return unregister;
    },
  } as unknown as BCAdapter;
  const presence = {
    hasCompatiblePeer: (memberNumber: number) => compatible.has(memberNumber),
  } as unknown as LinkPresenceService;
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  const badge = new RoomBlossomBadge(adapter, settings, presence);
  badge.mount();
  activeBadges.add(badge);
  if (!render) throw new Error("Blossom did not register its character overlay");
  return { badge, canvas, context, render, unregister, settings, compatible };
}

afterEach(() => {
  for (const badge of activeBadges) badge.destroy();
  activeBadges.clear();
  for (const key of [
    "MainCanvas",
    "ChatRoomHideIconState",
    "DrawImageResize",
    "ChatRoomCharacterDrawlist",
    "ChatRoomCharacterViewLoopCharacters",
  ]) {
    Reflect.deleteProperty(globalThis, key);
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("room Blossom character positioning", () => {
  it("uses the upright outlined cartoon artwork at every Blossom integration", () => {
    expect(blossomSvg).not.toContain("rotate(");
    expect(blossomSvg).toContain('stroke="#5f1b2a"');
    expect(blossomSvg).toContain('fill="#f3b63f"');
    expect(BLOSSOM_ICON_DATA_URL).toContain("data:image/svg+xml");
  });

  it("resolves and normalizes offsets inside the native 500x1000 character frame", () => {
    const frame = { x: 120, y: 30, zoom: 0.75 };
    expect(resolveRoomBadgePosition(null, frame)).toEqual({
      left: 412.5,
      top: 63.75,
      size: 26.25,
    });
    expect(resolveRoomBadgePosition({ x: 0.25, y: 0.5 }, frame)).toEqual({
      left: 213.75,
      top: 405,
      size: 26.25,
    });
    expect(normalizeRoomBadgePosition(213.75, 405, frame)).toEqual({ x: 0.25, y: 0.5 });
    expect(normalizeRoomBadgePosition(-10_000, 10_000, frame)).toEqual({ x: 0, y: 1 });
    expect(DEFAULT_ROOM_BADGE_POSITION).toEqual({ x: 0.78, y: 0.045 });
  });

  it("draws through the native icon path and never leaves a normal-play DOM overlay", () => {
    const { badge, render, compatible, unregister } = fixture();
    const draw = vi.mocked(globalThis.DrawImageResize);
    globalThis.ChatRoomCharacterViewLoopCharacters = vi.fn();

    render({ MemberNumber: 999, Name: "Kiki" }, 100, 20, 0.5);
    const own = document.querySelector<HTMLImageElement>(".kl-room-blossom");
    expect(own).not.toBeNull();
    expect(own?.src).toBe(BLOSSOM_ICON_DATA_URL);
    expect(own?.hidden).toBe(true);
    expect(own?.style.display).toBe("none");
    expect(draw).toHaveBeenCalledWith(BLOSSOM_ICON_DATA_URL, 295, 42.5, 17.5, 17.5);
    expect(globalThis.ChatRoomCharacterViewLoopCharacters).not.toHaveBeenCalled();

    render({ MemberNumber: 123, Name: "Unknown addon" }, 600, 20, 0.5);
    expect(draw).toHaveBeenCalledTimes(1);
    compatible.add(123);
    render({ MemberNumber: 123, Name: "KikiLink peer" }, 600, 20, 0.5);
    expect(draw).toHaveBeenCalledTimes(2);

    globalThis.ChatRoomHideIconState = 1;
    render({ MemberNumber: 999, Name: "Kiki" }, 100, 20, 0.5);
    expect(own?.hidden).toBe(true);
    expect(draw).toHaveBeenCalledTimes(2);
    badge.destroy();
    expect(own?.isConnected).toBe(false);
    expect(unregister).toHaveBeenCalledOnce();
  });

  it("draws the Blossom immediately from cached canvas paths without loading an image", () => {
    class FakePath2D {
      constructor(readonly path: string) {}
    }
    vi.stubGlobal("Path2D", FakePath2D);
    const { render, context } = fixture();
    Object.assign(context, {
      translate: vi.fn(),
      scale: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      lineJoin: "miter",
      lineCap: "butt",
      fillStyle: "",
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetY: 0,
    });

    render({ MemberNumber: 999, Name: "Kiki" }, 100, 20, 0.5);

    expect(context.save).toHaveBeenCalledOnce();
    expect(context.restore).toHaveBeenCalledOnce();
    expect(context.fill).toHaveBeenCalledTimes(7);
    expect(context.stroke).toHaveBeenCalledTimes(9);
    expect(context.arc).toHaveBeenCalledTimes(2);
    expect(globalThis.DrawImageResize).not.toHaveBeenCalled();
  });

  it("follows enabled settings without exposing a passive fixed DOM badge", () => {
    const { badge, render, settings } = fixture();
    const own = document.querySelector<HTMLImageElement>(".kl-room-blossom");
    expect(own).not.toBeNull();
    render({ MemberNumber: 999, Name: "Kiki" }, 0, 0, 1);
    expect(own?.hidden).toBe(true);
    settings.update((draft) => {
      draft.ui.roomBadge.enabled = false;
    });
    expect(own?.hidden).toBe(true);
    expect(globalThis.DrawImageResize).toHaveBeenCalledOnce();
    badge.destroy();
  });
});

describe("room Blossom settings-armed dragging", () => {
  it("recovers the visible player frame when the overlay hook has not drawn yet", () => {
    const { badge } = fixture();
    globalThis.ChatRoomCharacterDrawlist = [
      { MemberNumber: 999, Name: "Kiki" },
      { MemberNumber: 123, Name: "Reina" },
    ];
    globalThis.ChatRoomCharacterViewLoopCharacters = (callback) => {
      callback(0, 100, 20, 500, 0.75);
      callback(1, 600, 20, 500, 0.75);
    };

    expect(badge.beginPlacement()).toBe(true);
    badge.destroy();
  });

  it("ignores normal pointer input and persists one character-relative drag when armed", () => {
    const { badge, render, settings } = fixture();
    render({ MemberNumber: 999, Name: "Kiki" }, 100, 0, 1);
    const own = document.querySelector<HTMLImageElement>(".kl-room-blossom");
    if (!own) throw new Error("Blossom DOM icon was not mounted");
    const before = settings.get().ui.roomBadge.position;
    own.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 7, button: 0, clientX: 540, clientY: 10 }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 7, clientX: 600, clientY: 100 }),
    );
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7 }));
    expect(settings.get().ui.roomBadge.position).toEqual(before);

    expect(badge.beginPlacement()).toBe(true);
    expect(own.style.cursor).toBe("grab");
    expect(own.style.pointerEvents).toBe("auto");
    own.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: 7,
        button: 0,
        clientX: 540,
        clientY: 10,
      }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 7,
        clientX: 600,
        clientY: 100,
      }),
    );
    window.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 7, clientX: 600, clientY: 100 }),
    );

    expect(settings.get().ui.roomBadge.position).toEqual({ x: 0.9, y: 0.135 });
    expect(own.style.cursor).toBe("");
    expect(own.style.pointerEvents).toBe("none");
    badge.destroy();
  });

  it("requires a visible room character, supports Escape, and resets to the addon row", () => {
    const outside = fixture({ inRoom: false });
    outside.render({ MemberNumber: 999, Name: "Kiki" }, 100, 0, 1);
    expect(outside.badge.beginPlacement()).toBe(false);
    outside.badge.destroy();

    const active = fixture();
    expect(active.badge.beginPlacement()).toBe(false);
    active.render({ MemberNumber: 999, Name: "Kiki" }, 100, 0, 1);
    expect(active.badge.beginPlacement()).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector<HTMLElement>(".kl-room-blossom")?.style.cursor).toBe("");
    active.settings.update((draft) => {
      draft.ui.roomBadge.position = { x: 0.2, y: 0.3 };
    });
    active.badge.resetPosition();
    expect(active.settings.get().ui.roomBadge.position).toBeNull();
    active.badge.destroy();
  });
});
