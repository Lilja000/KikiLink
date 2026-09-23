import type { BeepEvent, LinkMessage } from "../core/types";
import { cleanBeepMessageContent } from "./message-content";

/** WCE's local reconnect toast is also appended to BC's native Beep log.
 * Match its self/VOID/exact-text signature, never self-messages in general.
 * Filtering happens only in KikiLink; BC and other addons still receive it.
 */
export function isReconnectNotice(
  event: Pick<BeepEvent, "direction" | "peerNumber" | "content"> & { roomName?: string | undefined } & Partial<Pick<LinkMessage, "cloudId" | "clientMessageId">>,
  ownMemberNumber: number | undefined,
): boolean {
  return typeof ownMemberNumber === "number" && Number.isSafeInteger(ownMemberNumber) && ownMemberNumber > 0 &&
    event.direction === "incoming" && event.peerNumber === ownMemberNumber &&
    event.roomName === "VOID" && !event.cloudId && !event.clientMessageId &&
    cleanBeepMessageContent(event.content) === "Reconnected!";
}
