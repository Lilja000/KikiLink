const MAX_BEEP_MESSAGE_LENGTH = 1_000;
const MESSAGE_METADATA_MARKER = "\uf124";
const MAX_METADATA_LENGTH = 128;
const MAX_LIKO_MAT_LANGUAGE_LENGTH = 32;
const MAX_TRANSPORT_ENVELOPES = 4;
const BIDI_CONTROLS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;
const LIKO_MAT_TRAILER_PATTERNS = [
  // Normal wire form.
  `\\u2063LikoMAT:([a-zA-Z-]{1,${MAX_LIKO_MAT_LANGUAGE_LENGTH}})(?::tr)?\\u2063`,
  // Liko-MAT intentionally accepts either separator being filtered in transit. Keep at least one
  // invisible separator mandatory here so ordinary authored text ending in "LikoMAT:en" survives.
  `\\u2063LikoMAT:([a-zA-Z-]{1,${MAX_LIKO_MAT_LANGUAGE_LENGTH}})(?::tr)?`,
  `LikoMAT:([a-zA-Z-]{1,${MAX_LIKO_MAT_LANGUAGE_LENGTH}})(?::tr)?\\u2063`,
].map((source) => new RegExp(`${source}[ \\t\\r\\n]*$`, "u"));

interface MessageMetadata {
  messageType: "Message" | "Emote" | "Action";
  messageColor?: string;
  messageId?: string;
}

/**
 * Removes the optional display metadata appended to some incoming Beep messages.
 *
 * The signature is deliberately strict so user-authored JSON or a private-use
 * character elsewhere in a message is preserved verbatim.
 */
export function cleanBeepMessageContent(value: unknown): string {
  return parseBeepMessageContent(value).content;
}

export function parseBeepMessageContent(value: unknown): { content: string; messageId?: string } {
  if (typeof value !== "string") return { content: "" };

  let content = value;
  let messageId: string | undefined;
  for (let index = 0; index < MAX_TRANSPORT_ENVELOPES; index += 1) {
    const withoutLikoMat = stripLikoMatTrailer(content);
    if (withoutLikoMat !== content) {
      content = withoutLikoMat;
      continue;
    }
    const metadata = trailingMessageMetadata(content);
    if (metadata) {
      content = content.slice(0, metadata.start).trimEnd();
      messageId ??= metadata.value.messageId;
      continue;
    }
    break;
  }
  return { content: content.replace(BIDI_CONTROLS, "").slice(0, MAX_BEEP_MESSAGE_LENGTH), ...(messageId ? { messageId } : {}) };
}

function stripLikoMatTrailer(value: string): string {
  for (const pattern of LIKO_MAT_TRAILER_PATTERNS) {
    const match = pattern.exec(value);
    if (match?.index !== undefined) return value.slice(0, match.index);
  }
  return value;
}

function trailingMessageMetadata(value: string): { start: number; value: MessageMetadata } | undefined {
  const markerIndex = value.lastIndexOf(MESSAGE_METADATA_MARKER);
  if (markerIndex < 0) return;

  const encodedMetadata = value.slice(markerIndex + MESSAGE_METADATA_MARKER.length).trim();
  if (!encodedMetadata || encodedMetadata.length > MAX_METADATA_LENGTH) return;
  try {
    const metadata: unknown = JSON.parse(encodedMetadata);
    if (isMessageMetadata(metadata)) return { start: markerIndex, value: metadata };
  } catch {
    return;
  }
}

function isMessageMetadata(value: unknown): value is MessageMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const metadata = value as Record<string, unknown>;
  const keys = Object.keys(metadata);
  const hasColor = keys.includes("messageColor");
  const hasId = keys.includes("messageId");
  return (
    keys.length === 1 + Number(hasColor) + Number(hasId) &&
    keys.includes("messageType") &&
    (metadata.messageType === "Message" ||
      metadata.messageType === "Emote" ||
      metadata.messageType === "Action") &&
    (!hasColor ||
      (typeof metadata.messageColor === "string" &&
        /^#[0-9a-f]{6}$/iu.test(metadata.messageColor))) &&
    (!hasId || (typeof metadata.messageId === "string" && /^[a-zA-Z0-9]{1,32}$/u.test(metadata.messageId)))
  );
}
