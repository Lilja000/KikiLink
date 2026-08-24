// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import {
  BLOSSOM_ICON_DATA_URL,
  DEFAULT_ROOM_BADGE_POSITION,
  normalizeRoomBadgePosition,
  resolveRoomBadgePosition,
  RoomBlossomBadge,
} from "../src/modules/link-chat/blossom";

function setViewport(width: number, height: number): void {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
}

function mountedBadge(settings = new SettingsStore(new MemoryKeyValueStorage())): {
  badge: RoomBlossomBadge;
  element: HTMLSpanElement;
  root: ShadowRoot;
  settings: SettingsStore;
} {
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  document.body.append(host);
  const badge = new RoomBlossomBadge(settings);
  badge.mount(root);
  const element = root.querySelector<HTMLSpanElement>(".kl-room-blossom");
  if (!element) throw new Error("Missing room Blossom");
  return { badge, element, root, settings };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("room Blossom viewport positioning", () => {
  it("resolves defaults, normalized positions, and viewport clamps", () => {
    expect(resolveRoomBadgePosition(null, 500, 900)).toEqual({ left: 283, top: 48 });
    expect(resolveRoomBadgePosition({ x: 0.25, y: 0.5 }, 500, 300)).toEqual({
      left: 118,
      top: 136,
    });
    expect(resolveRoomBadgePosition({ x: -4, y: 7 }, 100, 100)).toEqual({
      left: 0,
      top: 72,
    });
    expect(resolveRoomBadgePosition({ x: 1, y: 1 }, 20, 20)).toEqual({ left: 0, top: 0 });
  });

  it("normalizes pixels into portable 0..1 settings", () => {
    expect(normalizeRoomBadgePosition(236, 136, 500, 300)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalizeRoomBadgePosition(-100, 9_999, 500, 300)).toEqual({ x: 0, y: 1 });
    expect(normalizeRoomBadgePosition(0, 0, 20, 20)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("mounts a quiet fixed image in KikiLink's ShadowRoot and has no click action", () => {
    setViewport(500, 900);
    const { badge, element, root, settings } = mountedBadge();
    const image = element.querySelector("img");

    expect(element.style.position).toBe("fixed");
    expect(element.style.opacity).toBe("0.78");
    expect(element.style.width).toBe("28px");
    expect(element.style.pointerEvents).toBe("none");
    expect(element.style.left).toBe("283px");
    expect(element.style.top).toBe("48px");
    expect(element.getAttribute("role")).toBe("img");
    expect(image?.getAttribute("src")).toBe(BLOSSOM_ICON_DATA_URL);
    expect(image?.draggable).toBe(false);

    const before = settings.get().ui.roomBadge;
    const beforeLeft = element.style.left;
    element.click();
    element.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 1, button: 0, clientX: 10, clientY: 10 }),
    );
    element.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 1, clientX: 120, clientY: 120 }),
    );
    element.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    expect(settings.get().ui.roomBadge).toEqual(before);
    expect(element.style.left).toBe(beforeLeft);
    expect(root.querySelectorAll(".kl-room-blossom")).toHaveLength(1);
    badge.mount(root);
    expect(root.querySelectorAll(".kl-room-blossom")).toHaveLength(1);
    badge.destroy();
  });

  it("follows enabled settings live", () => {
    const { badge, element, settings } = mountedBadge();
    expect(element.hidden).toBe(false);

    settings.update((draft) => {
      draft.ui.roomBadge.enabled = false;
    });
    expect(element.hidden).toBe(true);
    expect(element.style.display).toBe("none");

    settings.update((draft) => {
      draft.ui.roomBadge.enabled = true;
    });
    expect(element.hidden).toBe(false);
    expect(element.style.display).toBe("block");
    badge.destroy();
  });
});

describe("room Blossom dragging", () => {
  it("uses a movement threshold, pointer capture, viewport clamps, and normalized persistence", () => {
    setViewport(300, 200);
    const { badge, element, settings } = mountedBadge();
    const capture = vi.fn();
    const release = vi.fn();
    Object.defineProperties(element, {
      setPointerCapture: { configurable: true, value: capture },
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: release },
    });
    const initialLeft = element.style.left;
    const initialTop = element.style.top;
    expect(badge.beginPlacement()).toBe(true);
    expect(element.style.pointerEvents).toBe("auto");

    element.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, button: 0, clientX: 10, clientY: 10 }),
    );
    element.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, pointerId: 7, clientX: 13, clientY: 14 }),
    );
    expect(element.style.left).toBe(initialLeft);
    expect(element.style.top).toBe(initialTop);
    expect(settings.get().ui.roomBadge.position).toBeNull();

    element.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, pointerId: 7, clientX: 900, clientY: 900 }),
    );
    expect(element.style.left).toBe("272px");
    expect(element.style.top).toBe("172px");
    expect(element.dataset.dragging).toBe("true");
    element.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 7, clientX: 900, clientY: 900 }),
    );

    expect(capture).toHaveBeenCalledWith(7);
    expect(release).toHaveBeenCalledWith(7);
    expect(settings.get().ui.roomBadge.position).toEqual({ x: 1, y: 1 });
    expect(element.dataset.dragging).toBe("false");
    expect(element.dataset.placement).toBe("false");
    expect(element.style.pointerEvents).toBe("none");
    badge.destroy();
  });

  it("restores the saved position when a drag is cancelled", () => {
    setViewport(300, 200);
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.ui.roomBadge.position = { x: 0.25, y: 0.5 };
    });
    const { badge, element } = mountedBadge(settings);
    const left = element.style.left;
    const top = element.style.top;
    badge.beginPlacement();

    element.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 2, button: 0, clientX: 20, clientY: 20 }),
    );
    element.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, pointerId: 2, clientX: 100, clientY: 100 }),
    );
    element.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: 2 }));

    expect(element.style.left).toBe(left);
    expect(element.style.top).toBe(top);
    expect(settings.get().ui.roomBadge.position).toEqual({ x: 0.25, y: 0.5 });
    badge.destroy();
  });

  it("repositions on resize and resets to the documented default", () => {
    setViewport(300, 200);
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.ui.roomBadge.position = { x: 0.5, y: 0.5 };
    });
    const { badge, element } = mountedBadge(settings);
    expect(element.style.left).toBe("136px");
    expect(element.style.top).toBe("86px");

    vi.spyOn(window, "innerWidth", "get").mockReturnValue(500);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(300);
    window.dispatchEvent(new Event("resize"));
    expect(element.style.left).toBe("236px");
    expect(element.style.top).toBe("136px");

    badge.resetPosition();
    expect(settings.get().ui.roomBadge.position).toBeNull();
    expect(element.style.left).toBe(
      `${Math.round(DEFAULT_ROOM_BADGE_POSITION.x * (500 - 28))}px`,
    );
    expect(element.style.top).toBe(
      `${Math.round(DEFAULT_ROOM_BADGE_POSITION.y * (300 - 28))}px`,
    );
    badge.destroy();
  });

  it("removes DOM, resize handling, pointer listeners, and its subscription on destroy", () => {
    setViewport(300, 200);
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const unsubscribe = vi.fn();
    const originalSubscribe = settings.subscribe.bind(settings);
    vi.spyOn(settings, "subscribe").mockImplementation((listener) => {
      const dispose = originalSubscribe(listener);
      return () => {
        unsubscribe();
        dispose();
      };
    });
    const { badge, element, root } = mountedBadge(settings);
    const left = element.style.left;

    badge.destroy();
    badge.destroy();
    expect(root.querySelector(".kl-room-blossom")).toBeNull();
    expect(unsubscribe).toHaveBeenCalledOnce();

    vi.spyOn(window, "innerWidth", "get").mockReturnValue(700);
    window.dispatchEvent(new Event("resize"));
    expect(element.style.left).toBe(left);
    element.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 3, button: 0, clientX: 0, clientY: 0 }),
    );
    element.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, pointerId: 3, clientX: 90, clientY: 90 }),
    );
    expect(element.style.left).toBe(left);
  });
});
