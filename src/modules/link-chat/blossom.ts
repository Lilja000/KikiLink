import type { SettingsStore } from "../../core/settings";
import type { KikiLinkSettings } from "../../core/types";
import BLOSSOM_ICON_DATA_URL from "../../../design/branding/kikilink-blossom.svg";

const BADGE_HIT_SIZE = 28;
const BADGE_VISUAL_SIZE = 20;
const BADGE_DRAG_THRESHOLD = 6;
const BADGE_OPACITY = 0.78;

export interface NormalizedRoomBadgePosition {
  x: number;
  y: number;
}

export interface RoomBadgePixelPosition {
  left: number;
  top: number;
}

interface RoomBadgeDrag {
  pointerId: number;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  currentLeft: number;
  currentTop: number;
  moved: boolean;
}

type RoomBadgeConfig = KikiLinkSettings["ui"]["roomBadge"];

/**
 * The default is deliberately near the top addon cluster while remaining a
 * viewport position rather than a character/canvas coordinate.
 */
export const DEFAULT_ROOM_BADGE_POSITION: Readonly<NormalizedRoomBadgePosition> = Object.freeze({
  x: 0.6,
  y: 0.055,
});

export { BLOSSOM_ICON_DATA_URL };

/** Resolves a normalized setting to a clamped top-left viewport position. */
export function resolveRoomBadgePosition(
  position: NormalizedRoomBadgePosition | null,
  viewportWidth: number,
  viewportHeight: number,
): RoomBadgePixelPosition {
  const normalized = sanitizePosition(position) ?? DEFAULT_ROOM_BADGE_POSITION;
  const maxLeft = Math.max(0, finiteDimension(viewportWidth) - BADGE_HIT_SIZE);
  const maxTop = Math.max(0, finiteDimension(viewportHeight) - BADGE_HIT_SIZE);
  return {
    left: Math.round(normalized.x * maxLeft),
    top: Math.round(normalized.y * maxTop),
  };
}

/** Converts a clamped pixel position back into portable 0..1 coordinates. */
export function normalizeRoomBadgePosition(
  left: number,
  top: number,
  viewportWidth: number,
  viewportHeight: number,
): NormalizedRoomBadgePosition {
  const maxLeft = Math.max(0, finiteDimension(viewportWidth) - BADGE_HIT_SIZE);
  const maxTop = Math.max(0, finiteDimension(viewportHeight) - BADGE_HIT_SIZE);
  return {
    x: maxLeft === 0 ? 0.5 : clamp(finiteNumber(left) / maxLeft, 0, 1),
    y: maxTop === 0 ? 0.5 : clamp(finiteNumber(top) / maxTop, 0, 1),
  };
}

/**
 * A small screen-space Blossom beside other addon icons. It ignores pointer input during normal
 * play and becomes draggable only after the explicit settings action arms placement mode.
 */
export class RoomBlossomBadge {
  readonly #element = document.createElement("span");
  readonly #image = document.createElement("img");
  readonly #settings: SettingsStore;
  #config: RoomBadgeConfig;
  #drag: RoomBadgeDrag | undefined;
  #settingsUnsubscribe: (() => void) | undefined;
  #placementActive = false;
  #mounted = false;
  #destroyed = false;

  readonly #handlePointerDown = (event: PointerEvent): void => {
    if (
      event.button !== 0 ||
      this.#drag ||
      !this.#config.enabled ||
      !this.#placementActive
    ) {
      return;
    }
    const rect = this.#element.getBoundingClientRect();
    const styleLeft = parsePixel(this.#element.style.left);
    const styleTop = parsePixel(this.#element.style.top);
    const startLeft = rect.width > 0 && Number.isFinite(rect.left) ? rect.left : styleLeft;
    const startTop = rect.height > 0 && Number.isFinite(rect.top) ? rect.top : styleTop;

    this.#drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft,
      startTop,
      currentLeft: startLeft,
      currentTop: startTop,
      moved: false,
    };
    event.preventDefault();
    try {
      this.#element.setPointerCapture(event.pointerId);
    } catch {
      // Capture is an enhancement. Pointer events delivered to the element still work.
    }
  };

  readonly #handlePointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < BADGE_DRAG_THRESHOLD) return;

    drag.moved = true;
    event.preventDefault();
    this.#element.dataset.dragging = "true";
    this.#element.style.cursor = "grabbing";
    const next = clampPixelPosition(
      drag.startLeft + deltaX,
      drag.startTop + deltaY,
      window.innerWidth,
      window.innerHeight,
    );
    drag.currentLeft = next.left;
    drag.currentTop = next.top;
    this.#place(next);
  };

  readonly #handlePointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.#drag = undefined;
    this.#element.dataset.dragging = "false";
    this.#element.style.cursor = this.#placementActive ? "grab" : "default";
    this.#releasePointer(event.pointerId);
    if (!drag.moved) {
      this.#positionFromConfig();
      return;
    }

    const position = normalizeRoomBadgePosition(
      drag.currentLeft,
      drag.currentTop,
      window.innerWidth,
      window.innerHeight,
    );
    const next = this.#settings.update((draft) => {
      draft.ui.roomBadge.position = position;
    });
    this.#config = next.ui.roomBadge;
    this.#positionFromConfig();
    this.#setPlacement(false);
  };

  readonly #handlePointerCancel = (event: PointerEvent): void => {
    if (!this.#drag || this.#drag.pointerId !== event.pointerId) return;
    this.#cancelDrag(true);
    this.#positionFromConfig();
  };

  readonly #handleLostPointerCapture = (event: PointerEvent): void => {
    if (!this.#drag || this.#drag.pointerId !== event.pointerId) return;
    this.#cancelDrag(false);
    this.#positionFromConfig();
  };

  readonly #handleViewportResize = (): void => {
    this.#cancelDrag(true);
    this.#positionFromConfig();
  };

  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.#placementActive || event.key !== "Escape") return;
    event.preventDefault();
    this.#cancelDrag(true);
    this.#positionFromConfig();
    this.#setPlacement(false);
  };

  constructor(settings: SettingsStore) {
    this.#settings = settings;
    this.#config = settings.get().ui.roomBadge;
    this.#buildElement();
    this.#settingsUnsubscribe = settings.subscribe((next) => {
      const config = next.ui.roomBadge;
      const changed =
        config.enabled !== this.#config.enabled ||
        config.position?.x !== this.#config.position?.x ||
        config.position?.y !== this.#config.position?.y;
      this.#config = config;
      if (!changed) return;
      this.#cancelDrag(true);
      if (!config.enabled) this.#setPlacement(false);
      this.#sync();
    });
  }

  /** Mounts the fixed badge into KikiLink's existing ShadowRoot. */
  mount(root: ShadowRoot): void {
    if (this.#destroyed) return;
    if (!this.#mounted) {
      this.#mounted = true;
      window.addEventListener("resize", this.#handleViewportResize);
      window.addEventListener("keydown", this.#handleKeyDown);
    }
    if (this.#element.parentNode !== root) root.append(this.#element);
    this.#sync();
  }

  /** Arms one deliberate drag from the settings screen. */
  beginPlacement(): boolean {
    if (this.#destroyed || !this.#mounted || !this.#config.enabled) return false;
    this.#cancelDrag(true);
    this.#setPlacement(true);
    return true;
  }

  cancelPlacement(): void {
    this.#cancelDrag(true);
    this.#positionFromConfig();
    this.#setPlacement(false);
  }

  /** Restores the documented default without disabling the badge. */
  resetPosition(): void {
    if (this.#destroyed) return;
    const next = this.#settings.update((draft) => {
      draft.ui.roomBadge.position = null;
    });
    this.#config = next.ui.roomBadge;
    this.#cancelDrag(true);
    this.#setPlacement(false);
    this.#sync();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#cancelDrag(true);
    if (this.#mounted) {
      window.removeEventListener("resize", this.#handleViewportResize);
      window.removeEventListener("keydown", this.#handleKeyDown);
    }
    this.#mounted = false;
    this.#settingsUnsubscribe?.();
    this.#settingsUnsubscribe = undefined;
    this.#element.removeEventListener("pointerdown", this.#handlePointerDown);
    this.#element.removeEventListener("pointermove", this.#handlePointerMove);
    this.#element.removeEventListener("pointerup", this.#handlePointerUp);
    this.#element.removeEventListener("pointercancel", this.#handlePointerCancel);
    this.#element.removeEventListener("lostpointercapture", this.#handleLostPointerCapture);
    this.#element.remove();
  }

  #buildElement(): void {
    this.#element.className = "kl-room-blossom";
    this.#element.dataset.dragging = "false";
    this.#element.setAttribute("role", "img");
    this.#element.setAttribute("aria-label", "KikiLink Blossom");
    this.#element.title = "KikiLink Blossom";
    Object.assign(this.#element.style, {
      position: "fixed",
      width: `${BADGE_HIT_SIZE}px`,
      height: `${BADGE_HIT_SIZE}px`,
      margin: "0",
      padding: "0",
      border: "0",
      background: "transparent",
      opacity: String(BADGE_OPACITY),
      cursor: "default",
      pointerEvents: "none",
      touchAction: "none",
      userSelect: "none",
      webkitUserSelect: "none",
      boxSizing: "border-box",
      zIndex: "2147482998",
      filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.32))",
      willChange: "left, top",
    });

    this.#image.className = "kl-room-blossom-image";
    this.#image.src = BLOSSOM_ICON_DATA_URL;
    this.#image.alt = "";
    this.#image.decoding = "async";
    this.#image.draggable = false;
    Object.assign(this.#image.style, {
      position: "absolute",
      left: `${(BADGE_HIT_SIZE - BADGE_VISUAL_SIZE) / 2}px`,
      top: `${(BADGE_HIT_SIZE - BADGE_VISUAL_SIZE) / 2}px`,
      width: `${BADGE_VISUAL_SIZE}px`,
      height: `${BADGE_VISUAL_SIZE}px`,
      pointerEvents: "none",
    });
    this.#element.append(this.#image);
    this.#setPlacement(false);
    this.#element.addEventListener("pointerdown", this.#handlePointerDown);
    this.#element.addEventListener("pointermove", this.#handlePointerMove);
    this.#element.addEventListener("pointerup", this.#handlePointerUp);
    this.#element.addEventListener("pointercancel", this.#handlePointerCancel);
    this.#element.addEventListener("lostpointercapture", this.#handleLostPointerCapture);
  }

  #sync(): void {
    this.#element.hidden = !this.#config.enabled;
    this.#element.style.display = this.#config.enabled ? "block" : "none";
    if (this.#config.enabled) this.#positionFromConfig();
  }

  #setPlacement(active: boolean): void {
    this.#placementActive = active && this.#config.enabled;
    this.#element.dataset.placement = String(this.#placementActive);
    this.#element.style.pointerEvents = this.#placementActive ? "auto" : "none";
    this.#element.style.cursor = this.#placementActive ? "grab" : "default";
    this.#element.style.outline = this.#placementActive
      ? "2px solid rgba(255, 122, 143, 0.78)"
      : "none";
    this.#element.style.outlineOffset = this.#placementActive ? "2px" : "0";
    this.#element.title = this.#placementActive
      ? "Drag Blossom to its new position · Esc to cancel"
      : "KikiLink Blossom";
    this.#element.setAttribute(
      "aria-label",
      this.#placementActive ? "Move KikiLink Blossom" : "KikiLink Blossom",
    );
    this.#element.tabIndex = this.#placementActive ? 0 : -1;
  }

  #positionFromConfig(): void {
    if (!this.#mounted || this.#drag) return;
    this.#place(
      resolveRoomBadgePosition(
        this.#config.position,
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }

  #place(position: RoomBadgePixelPosition): void {
    this.#element.style.left = `${Math.round(position.left)}px`;
    this.#element.style.top = `${Math.round(position.top)}px`;
    this.#element.style.right = "auto";
    this.#element.style.bottom = "auto";
  }

  #cancelDrag(releasePointer: boolean): void {
    const pointerId = this.#drag?.pointerId;
    this.#drag = undefined;
    this.#element.dataset.dragging = "false";
    this.#element.style.cursor = this.#placementActive ? "grab" : "default";
    if (releasePointer && pointerId !== undefined) this.#releasePointer(pointerId);
  }

  #releasePointer(pointerId: number): void {
    try {
      if (!this.#element.hasPointerCapture || this.#element.hasPointerCapture(pointerId)) {
        this.#element.releasePointerCapture(pointerId);
      }
    } catch {
      // Capture may already have been released by the browser.
    }
  }
}

function clampPixelPosition(
  left: number,
  top: number,
  viewportWidth: number,
  viewportHeight: number,
): RoomBadgePixelPosition {
  return {
    left: Math.round(
      clamp(finiteNumber(left), 0, Math.max(0, finiteDimension(viewportWidth) - BADGE_HIT_SIZE)),
    ),
    top: Math.round(
      clamp(finiteNumber(top), 0, Math.max(0, finiteDimension(viewportHeight) - BADGE_HIT_SIZE)),
    ),
  };
}

function sanitizePosition(
  position: NormalizedRoomBadgePosition | null,
): NormalizedRoomBadgePosition | null {
  if (!position) return null;
  return {
    x: clamp(Number.isFinite(position.x) ? position.x : DEFAULT_ROOM_BADGE_POSITION.x, 0, 1),
    y: clamp(Number.isFinite(position.y) ? position.y : DEFAULT_ROOM_BADGE_POSITION.y, 0, 1),
  };
}

function parsePixel(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function finiteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function finiteDimension(value: number): number {
  return Math.max(0, finiteNumber(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
