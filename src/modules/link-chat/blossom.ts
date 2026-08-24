import type { BCAdapter } from "../../bc/adapter";
import type { SettingsStore } from "../../core/settings";
import type { KikiLinkSettings } from "../../core/types";
import type { LinkPresenceService } from "../link-presence/link-presence-service";
import BLOSSOM_ICON_DATA_URL from "../../../design/branding/kikilink-blossom.svg";

const BADGE_PRESET_X = {
  "before-addons": 216,
  "between-addons": 332,
  "after-addons": 417,
} as const;
const BADGE_BASE_Y = 5;
const BADGE_SIZE = 32;
const BADGE_MAX_X = 500 - BADGE_SIZE;
const BADGE_MAX_Y = 160;
const BADGE_OPACITY = 0.82;

type RoomBadgeConfig = KikiLinkSettings["ui"]["roomBadge"];

export interface RoomBadgeRect {
  x: number;
  y: number;
  size: number;
}

export { BLOSSOM_ICON_DATA_URL };

export function resolveMainDrawingContext(
  canvas: CanvasRenderingContext2D | HTMLCanvasElement,
): CanvasRenderingContext2D | null {
  return "drawImage" in canvas ? canvas : canvas.getContext("2d");
}

/** Resolves a room badge into Bondage Club's scaled character coordinates. */
export function resolveRoomBadgeRect(
  config: RoomBadgeConfig,
  characterX: number,
  characterY: number,
  zoom: number,
): RoomBadgeRect {
  const presetX = BADGE_PRESET_X[config.placement] ?? BADGE_PRESET_X["between-addons"];
  const offsetX = Number.isFinite(config.offsetX) ? config.offsetX : 0;
  const offsetY = Number.isFinite(config.offsetY) ? config.offsetY : 0;
  const localX = clamp(presetX + offsetX, 0, BADGE_MAX_X);
  const localY = clamp(BADGE_BASE_Y + offsetY, 0, BADGE_MAX_Y);

  return {
    x: characterX + localX * zoom,
    y: characterY + localY * zoom,
    size: BADGE_SIZE * zoom,
  };
}

/**
 * Draws KikiLink's quiet room badge in a user-selected slot around common addon
 * indicators. The decoded SVG and validated placement are cached, so each frame
 * needs only one drawImage call.
 */
export class RoomBlossomBadge {
  readonly #image = new Image();
  #ready = false;
  #canvas: CanvasRenderingContext2D | HTMLCanvasElement | undefined;
  #context: CanvasRenderingContext2D | null = null;
  #config: RoomBadgeConfig;
  #settingsUnsubscribe: (() => void) | undefined;

  readonly #handleImageLoad = (): void => {
    this.#ready = this.#image.naturalWidth > 0;
  };

  constructor(
    private readonly adapter: BCAdapter,
    private readonly presence: LinkPresenceService,
    settings: SettingsStore,
  ) {
    this.#config = settings.get().ui.roomBadge;
    this.#settingsUnsubscribe = settings.subscribe((next) => {
      this.#config = next.ui.roomBadge;
    });
    this.#image.alt = "";
    this.#image.decoding = "async";
    this.#image.addEventListener("load", this.#handleImageLoad);
    this.#image.src = BLOSSOM_ICON_DATA_URL;
    this.#ready = this.#image.complete && this.#image.naturalWidth > 0;
  }

  destroy(): void {
    this.#settingsUnsubscribe?.();
    this.#settingsUnsubscribe = undefined;
    this.#image.removeEventListener("load", this.#handleImageLoad);
    this.#ready = false;
    this.#canvas = undefined;
    this.#context = null;
  }

  draw(character: BCCharacter, characterX: number, characterY: number, zoom: number): void {
    if (
      !this.#ready ||
      !this.#config.enabled ||
      !Number.isFinite(characterX) ||
      !Number.isFinite(characterY) ||
      !Number.isFinite(zoom) ||
      zoom <= 0 ||
      (typeof ChatRoomHideIconState === "number" && ChatRoomHideIconState !== 0)
    ) {
      return;
    }

    const memberNumber = character.MemberNumber;
    if (!Number.isSafeInteger(memberNumber)) return;
    if (
      memberNumber !== this.adapter.getOwnMemberNumber() &&
      !this.presence.hasCompatiblePeer(memberNumber)
    ) {
      return;
    }

    if (typeof MainCanvas === "undefined") return;
    if (this.#canvas !== MainCanvas) {
      this.#canvas = MainCanvas;
      this.#context = resolveMainDrawingContext(MainCanvas);
    }
    if (!this.#context) return;

    const rect = resolveRoomBadgeRect(this.#config, characterX, characterY, zoom);
    const previousAlpha = this.#context.globalAlpha;
    this.#context.globalAlpha = previousAlpha * BADGE_OPACITY;
    try {
      this.#context.drawImage(this.#image, rect.x, rect.y, rect.size, rect.size);
    } finally {
      this.#context.globalAlpha = previousAlpha;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
