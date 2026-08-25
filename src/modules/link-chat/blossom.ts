import type { BCAdapter, BCCharacterOverlayRenderer } from "../../bc/adapter";
import type { SettingsStore } from "../../core/settings";
import type { KikiLinkSettings } from "../../core/types";
import type { LinkPresenceService } from "../link-presence/link-presence-service";
import BLOSSOM_ICON_DATA_URL from "../../../design/branding/kikilink-blossom.svg";

const CHARACTER_WIDTH = 500;
const CHARACTER_HEIGHT = 1_000;
const BADGE_SIZE = 35;
const BADGE_OPACITY = 0.78;
const BADGE_DRAG_THRESHOLD = 5;
const DOM_SYNC_INTERVAL_MS = 33;
const CANVAS_FALLBACK_GRACE_MS = 250;

export interface NormalizedRoomBadgePosition {
  x: number;
  y: number;
}

export interface CharacterCanvasFrame {
  x: number;
  y: number;
  zoom: number;
}

export interface RoomBadgeCanvasPosition {
  left: number;
  top: number;
  size: number;
}

interface RoomBadgeDrag {
  pointerId: number;
  startCanvasX: number;
  startCanvasY: number;
  offsetX: number;
  offsetY: number;
  moved: boolean;
}

type RoomBadgeConfig = KikiLinkSettings["ui"]["roomBadge"];

/** The same small character-relative icon row used by BCX and native status icons. */
export const DEFAULT_ROOM_BADGE_POSITION: Readonly<NormalizedRoomBadgePosition> = Object.freeze({
  x: 0.84,
  y: 0.005,
});

export { BLOSSOM_ICON_DATA_URL };

/** Resolves the portable character-relative setting into Bondage Club canvas coordinates. */
export function resolveRoomBadgePosition(
  position: NormalizedRoomBadgePosition | null,
  frame: CharacterCanvasFrame,
): RoomBadgeCanvasPosition {
  const normalized = sanitizePosition(position) ?? DEFAULT_ROOM_BADGE_POSITION;
  const zoom = finitePositive(frame.zoom, 1);
  return {
    left: finiteNumber(frame.x) + normalized.x * CHARACTER_WIDTH * zoom,
    top: finiteNumber(frame.y) + normalized.y * CHARACTER_HEIGHT * zoom,
    size: BADGE_SIZE * zoom,
  };
}

/** Converts a canvas top-left point back into a portable offset from the character. */
export function normalizeRoomBadgePosition(
  left: number,
  top: number,
  frame: CharacterCanvasFrame,
): NormalizedRoomBadgePosition {
  const zoom = finitePositive(frame.zoom, 1);
  return {
    x: clamp((finiteNumber(left) - finiteNumber(frame.x)) / (CHARACTER_WIDTH * zoom), 0, 1),
    y: clamp((finiteNumber(top) - finiteNumber(frame.y)) / (CHARACTER_HEIGHT * zoom), 0, 1),
  };
}

/**
 * Draws Blossom in the native character overlay. During normal play it has no DOM hit target;
 * the settings button deliberately arms one canvas drag and Escape cancels it.
 */
export class RoomBlossomBadge {
  readonly #settings: SettingsStore;
  readonly #adapter: BCAdapter;
  readonly #presence: LinkPresenceService;
  readonly #element = document.createElement("img");
  readonly #fallbackImage = typeof Image === "function" ? new Image() : undefined;
  #config: RoomBadgeConfig;
  #ownFrame: CharacterCanvasFrame | undefined;
  #previewPosition: NormalizedRoomBadgePosition | undefined;
  #drag: RoomBadgeDrag | undefined;
  #canvas: HTMLCanvasElement | undefined;
  #previousCursor = "";
  #previousTouchAction = "";
  #settingsUnsubscribe: (() => void) | undefined;
  #unregisterOverlay: (() => void) | undefined;
  #domSyncTimer: ReturnType<typeof setInterval> | undefined;
  #ownCanvasRenderedAt = 0;
  #placementActive = false;
  #mounted = false;
  #destroyed = false;

  readonly #renderer: BCCharacterOverlayRenderer = (character, x, y, zoom) => {
    if (!character || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom)) return;
    const own = character.MemberNumber === this.#adapter.getOwnMemberNumber();
    if (own) {
      this.#ownFrame = { x, y, zoom };
      if (this.#config.enabled && this.#iconsAreVisible()) {
        if (this.#draw(resolveRoomBadgePosition(this.#config.position, this.#ownFrame))) {
          this.#ownCanvasRenderedAt = Date.now();
        }
      }
      this.#syncOwnElement();
      return;
    }
    if (!this.#config.enabled || !this.#iconsAreVisible()) return;
    if (!this.#presence.hasCompatiblePeer(character.MemberNumber)) return;

    const position = resolveRoomBadgePosition(this.#config.position, { x, y, zoom });
    this.#draw(position);
  };

  readonly #handlePointerDown = (event: PointerEvent): void => {
    if (
      !this.#placementActive ||
      this.#drag ||
      event.button !== 0 ||
      !this.#ownFrame ||
      !this.#canvas
    ) {
      return;
    }
    const point = eventCanvasPoint(event, this.#canvas);
    if (!point) return;
    const position = resolveRoomBadgePosition(
      this.#previewPosition ?? this.#config.position,
      this.#ownFrame,
    );

    this.#drag = {
      pointerId: event.pointerId,
      startCanvasX: point.x,
      startCanvasY: point.y,
      offsetX: point.x - position.left,
      offsetY: point.y - position.top,
      moved: false,
    };
    this.#consumePointer(event);
    try {
      this.#element.setPointerCapture(event.pointerId);
    } catch {
      // Window listeners below still keep the deliberate drag working.
    }
  };

  readonly #handlePointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    const frame = this.#ownFrame;
    const canvas = this.#canvas;
    if (!drag || drag.pointerId !== event.pointerId || !frame || !canvas) return;
    const point = eventCanvasPoint(event, canvas);
    if (!point) return;
    if (
      !drag.moved &&
      Math.hypot(point.x - drag.startCanvasX, point.y - drag.startCanvasY) <
        BADGE_DRAG_THRESHOLD
    ) {
      return;
    }
    drag.moved = true;
    this.#previewPosition = normalizeRoomBadgePosition(
      point.x - drag.offsetX,
      point.y - drag.offsetY,
      frame,
    );
    this.#syncOwnElement();
    this.#consumePointer(event);
  };

  readonly #handlePointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.#consumePointer(event);
    this.#releasePointer(event.pointerId);
    this.#drag = undefined;
    if (!drag.moved || !this.#previewPosition) return;

    const saved = this.#previewPosition;
    this.#settings.update((draft) => {
      draft.ui.roomBadge.position = saved;
    });
    this.#previewPosition = undefined;
    this.#setPlacement(false);
    this.#syncOwnElement();
  };

  readonly #handlePointerCancel = (event: PointerEvent): void => {
    if (!this.#drag || this.#drag.pointerId !== event.pointerId) return;
    this.#consumePointer(event);
    this.#releasePointer(event.pointerId);
    this.#drag = undefined;
    this.#previewPosition = undefined;
    this.#syncOwnElement();
  };

  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.#placementActive || event.key !== "Escape") return;
    event.preventDefault();
    this.cancelPlacement();
  };

  constructor(adapter: BCAdapter, settings: SettingsStore, presence: LinkPresenceService) {
    this.#adapter = adapter;
    this.#settings = settings;
    this.#presence = presence;
    this.#config = settings.get().ui.roomBadge;
    if (this.#fallbackImage) this.#fallbackImage.src = BLOSSOM_ICON_DATA_URL;
    this.#element.className = "kl-room-blossom";
    this.#element.src = BLOSSOM_ICON_DATA_URL;
    this.#element.alt = "";
    this.#element.draggable = false;
    this.#element.hidden = true;
    this.#element.setAttribute("aria-hidden", "true");
    Object.assign(this.#element.style, {
      position: "fixed",
      display: "none",
      pointerEvents: "none",
      opacity: String(BADGE_OPACITY),
      zIndex: "2147483000",
      userSelect: "none",
      touchAction: "none",
      filter: "drop-shadow(0 1px 3px rgba(0, 0, 0, .75))",
    });
    this.#settingsUnsubscribe = settings.subscribe((next) => {
      this.#config = next.ui.roomBadge;
      if (!this.#config.enabled) this.cancelPlacement();
      this.#syncOwnElement();
    });
  }

  mount(): void {
    if (this.#destroyed || this.#mounted) return;
    this.#mounted = true;
    document.body.append(this.#element);
    if (typeof this.#adapter.registerCharacterOverlay === "function") {
      this.#unregisterOverlay = this.#adapter.registerCharacterOverlay(this.#renderer);
    }
    this.#domSyncTimer = setInterval(() => this.#syncOwnElement(), DOM_SYNC_INTERVAL_MS);
    this.#syncOwnElement();
    window.addEventListener("keydown", this.#handleKeyDown);
  }

  /** Arms a single drag of the flower above the authenticated player's character. */
  beginPlacement(): boolean {
    const liveFrame = visibleCharacterFrame(this.#adapter.getOwnMemberNumber());
    if (liveFrame) this.#ownFrame = liveFrame;
    this.#syncOwnElement();
    if (
      this.#destroyed ||
      !this.#mounted ||
      !this.#config.enabled ||
      typeof this.#adapter.isInChatRoom !== "function" ||
      !this.#adapter.isInChatRoom() ||
      !this.#ownFrame
    ) {
      return false;
    }
    const canvas = mainCanvasElement();
    if (!canvas) return false;
    this.cancelPlacement();
    this.#canvas = canvas;
    this.#setPlacement(true);
    this.#syncOwnElement();
    return true;
  }

  cancelPlacement(): void {
    this.#releasePointer(this.#drag?.pointerId);
    this.#drag = undefined;
    this.#previewPosition = undefined;
    this.#setPlacement(false);
  }

  resetPosition(): void {
    if (this.#destroyed) return;
    this.cancelPlacement();
    this.#settings.update((draft) => {
      draft.ui.roomBadge.position = null;
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.cancelPlacement();
    window.removeEventListener("keydown", this.#handleKeyDown);
    this.#settingsUnsubscribe?.();
    this.#settingsUnsubscribe = undefined;
    this.#unregisterOverlay?.();
    this.#unregisterOverlay = undefined;
    if (this.#domSyncTimer !== undefined) clearInterval(this.#domSyncTimer);
    this.#domSyncTimer = undefined;
    this.#element.remove();
    this.#ownFrame = undefined;
    this.#mounted = false;
  }

  #draw(position: RoomBadgeCanvasPosition): boolean {
    const context = mainCanvasContext();
    if (!context) return false;
    try {
      // Echo and current BC R129 both use DrawImageResize for this exact character icon row.
      if (typeof DrawImageResize === "function") {
        return DrawImageResize(
          BLOSSOM_ICON_DATA_URL,
          position.left,
          position.top,
          position.size,
          position.size,
        );
      } else if (typeof DrawImageCanvas === "function") {
        return DrawImageCanvas(BLOSSOM_ICON_DATA_URL, context, position.left, position.top, {
          Width: position.size,
          Height: position.size,
          Alpha: BADGE_OPACITY,
        });
      } else if (this.#fallbackImage?.complete && this.#fallbackImage.naturalWidth > 0) {
        context.save();
        context.globalAlpha = BADGE_OPACITY;
        context.drawImage(
          this.#fallbackImage,
          position.left,
          position.top,
          position.size,
          position.size,
        );
        context.restore();
        return true;
      }
    } catch {
      // A canvas can be replaced between room frames; the next overlay render retries naturally.
    }
    return false;
  }

  #iconsAreVisible(): boolean {
    return typeof ChatRoomHideIconState !== "number" || ChatRoomHideIconState === 0;
  }

  #syncOwnElement(): void {
    if (this.#destroyed || !this.#mounted) return;
    const inRoom =
      typeof this.#adapter.isInChatRoom === "function" && this.#adapter.isInChatRoom();
    if (!this.#config.enabled || !this.#iconsAreVisible() || !inRoom) {
      this.#element.hidden = true;
      this.#element.style.display = "none";
      return;
    }

    const liveFrame = visibleCharacterFrame(this.#adapter.getOwnMemberNumber());
    if (liveFrame) this.#ownFrame = liveFrame;
    const frame = this.#ownFrame;
    const canvas = mainCanvasElement();
    if (!frame || !canvas) {
      this.#element.hidden = true;
      this.#element.style.display = "none";
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
      this.#element.hidden = true;
      this.#element.style.display = "none";
      return;
    }

    const position = resolveRoomBadgePosition(
      this.#previewPosition ?? this.#config.position,
      frame,
    );
    // The native canvas icon is authoritative. The fixed DOM copy is only a resilient fallback
    // (or the explicit one-drag handle), so normal rendering never doubles the flower.
    if (
      !this.#placementActive &&
      Date.now() - this.#ownCanvasRenderedAt <= CANVAS_FALLBACK_GRACE_MS
    ) {
      this.#element.hidden = true;
      this.#element.style.display = "none";
      return;
    }
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    this.#element.hidden = false;
    this.#element.style.display = "block";
    this.#element.style.left = `${rect.left + position.left * scaleX}px`;
    this.#element.style.top = `${rect.top + position.top * scaleY}px`;
    this.#element.style.width = `${position.size * scaleX}px`;
    this.#element.style.height = `${position.size * scaleY}px`;
  }

  #setPlacement(active: boolean): void {
    if (active === this.#placementActive) return;
    this.#placementActive = active;
    const canvas = this.#canvas;
    if (active && canvas) {
      this.#previousCursor = this.#element.style.cursor;
      this.#previousTouchAction = this.#element.style.touchAction;
      this.#element.style.cursor = "grab";
      this.#element.style.touchAction = "none";
      this.#element.style.pointerEvents = "auto";
      this.#element.style.outline = "1px dashed rgba(255, 135, 153, .9)";
      this.#element.style.outlineOffset = "3px";
      this.#element.addEventListener("pointerdown", this.#handlePointerDown, true);
      window.addEventListener("pointermove", this.#handlePointerMove, true);
      window.addEventListener("pointerup", this.#handlePointerUp, true);
      window.addEventListener("pointercancel", this.#handlePointerCancel, true);
      return;
    }
    this.#element.removeEventListener("pointerdown", this.#handlePointerDown, true);
    this.#element.style.cursor = this.#previousCursor;
    this.#element.style.touchAction = this.#previousTouchAction;
    this.#element.style.pointerEvents = "none";
    this.#element.style.outline = "";
    this.#element.style.outlineOffset = "";
    window.removeEventListener("pointermove", this.#handlePointerMove, true);
    window.removeEventListener("pointerup", this.#handlePointerUp, true);
    window.removeEventListener("pointercancel", this.#handlePointerCancel, true);
    this.#canvas = undefined;
  }

  #consumePointer(event: PointerEvent): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  #releasePointer(pointerId: number | undefined): void {
    if (pointerId === undefined) return;
    try {
      if (!this.#element.hasPointerCapture || this.#element.hasPointerCapture(pointerId)) {
        this.#element.releasePointerCapture(pointerId);
      }
    } catch {
      // The browser may already have released capture.
    }
  }
}

function mainCanvasContext(): CanvasRenderingContext2D | undefined {
  if (typeof MainCanvas === "undefined" || MainCanvas === null) return undefined;
  if (typeof (MainCanvas as CanvasRenderingContext2D).drawImage === "function") {
    return MainCanvas as CanvasRenderingContext2D;
  }
  return (MainCanvas as HTMLCanvasElement).getContext?.("2d") ?? undefined;
}

function mainCanvasElement(): HTMLCanvasElement | undefined {
  const context = mainCanvasContext();
  if (context?.canvas) return context.canvas;
  if (
    typeof MainCanvas !== "undefined" &&
    typeof (MainCanvas as HTMLCanvasElement).getContext === "function"
  ) {
    return MainCanvas as HTMLCanvasElement;
  }
  const byId = document.getElementById("MainCanvas");
  return byId instanceof HTMLCanvasElement ? byId : undefined;
}

function eventCanvasPoint(
  event: PointerEvent,
  canvas: HTMLCanvasElement,
): { x: number; y: number } | undefined {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

/**
 * Recovers the authenticated character's current native canvas frame even if an addon replaced
 * the overlay entrypoint after KikiLink installed its hook. BC uses this same loop to draw and hit
 * test every visible character; calling it once from the explicit settings action is harmless.
 */
function visibleCharacterFrame(memberNumber: number): CharacterCanvasFrame | undefined {
  if (
    !Number.isSafeInteger(memberNumber) ||
    typeof ChatRoomCharacterViewLoopCharacters !== "function" ||
    typeof ChatRoomCharacterDrawlist === "undefined" ||
    !Array.isArray(ChatRoomCharacterDrawlist)
  ) {
    return undefined;
  }
  let frame: CharacterCanvasFrame | undefined;
  try {
    ChatRoomCharacterViewLoopCharacters((characterIndex, x, y, _space, zoom) => {
      if (ChatRoomCharacterDrawlist[characterIndex]?.MemberNumber !== memberNumber) return;
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom) || zoom <= 0) return;
      frame = { x, y, zoom };
      return true;
    });
  } catch {
    return undefined;
  }
  return frame;
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

function finiteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
