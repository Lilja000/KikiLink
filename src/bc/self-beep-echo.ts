import type { BeepEvent, LinkMessage } from "../core/types";
import { parseBeepMessageContent } from "./message-content";

const HISTORY_ECHO_WINDOW_MS = 2_000;

type BeepRecord = BeepEvent & Partial<Pick<LinkMessage, "cloudId" | "clientMessageId">>;

/** Legacy rows lack transport correlation. Require the known trailer and a matching saved send. */
export function legacySelfBeepEchoes<T extends BeepRecord>(records: readonly T[], ownMemberNumber: number | undefined): Set<T> {
  const echoes = new Set<T>();
  if (ownMemberNumber === undefined || ownMemberNumber <= 0) return echoes;
  const nativeSelf = records.filter(record => record.peerNumber === ownMemberNumber && !record.cloudId && !record.clientMessageId);
  const sends = nativeSelf.filter(record => record.direction === "outgoing")
    .map(record => ({ record, ...parseBeepMessageContent(record.content) }));
  for (const record of nativeSelf) {
    if (record.direction !== "incoming") continue;
    const { content, messageId } = parseBeepMessageContent(record.content);
    if (!messageId || !content) continue;
    const match = sends.findIndex(send =>
      (!send.messageId || send.messageId === messageId) && send.content === content &&
      (send.record.roomName ?? "").trim() === (record.roomName ?? "").trim() &&
      Math.abs(send.record.sentAt - record.sentAt) <= HISTORY_ECHO_WINDOW_MS,
    );
    if (match < 0) continue;
    sends.splice(match, 1);
    echoes.add(record);
  }
  return echoes;
}
