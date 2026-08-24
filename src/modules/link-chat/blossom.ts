import type { BCAdapter } from "../../bc/adapter";
import type { LinkPresenceService } from "../link-presence/link-presence-service";
import BLOSSOM_ICON_DATA_URL from "../../../design/branding/kikilink-blossom.svg";

const BADGE_X_OFFSET = 332;
const BADGE_Y_OFFSET = 5;
const BADGE_SIZE = 32;

export { BLOSSOM_ICON_DATA_URL };

export function resolveMainDrawingContext(
  canvas: CanvasRenderingContext2D | HTMLCanvasElement,
): CanvasRenderingContext2D | null {
  return "drawImage" in canvas ? canvas : canvas.getContext("2d");
}

/**
 * Draws KikiLink's quiet room badge in the open slot between common WCE and BCX
 * character indicators. The decoded SVG is cached by the browser and each frame
 * needs only one drawImage call.
 */
export class RoomBlossomBadge {
  readonly #image = new Image();
  #ready = false;
  #canvas: CanvasRenderingContext2D | HTMLCanvasElement | undefined;
  #context: CanvasRenderingContext2D | null = null;

  constructor(
    private readonly adapter: BCAdapter,
    private readonly presence: LinkPresenceService,
  ) {
    this.#image.alt = "";
    this.#image.decoding = "async";
    this.#image.addEventListener("load", () => {
      this.#ready = this.#image.naturalWidth > 0;
    });
    this.#image.src = BLOSSOM_ICON_DATA_URL;
    this.#ready = this.#image.complete && this.#image.naturalWidth > 0;
  }

  draw(character: BCCharacter, characterX: number, characterY: number, zoom: number): void {
    if (
      !this.#ready ||
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

    const size = BADGE_SIZE * zoom;
    this.#context.drawImage(
      this.#image,
      characterX + BADGE_X_OFFSET * zoom,
      characterY + BADGE_Y_OFFSET * zoom,
      size,
      size,
    );
  }
}
