const MAX_BEEP_MESSAGE_LENGTH = 1_000;
const MESSAGE_METADATA_MARKER = "\uf124";
const MAX_METADATA_LENGTH = 128;
const MAX_LIKO_MAT_LANGUAGE_LENGTH = 32;
const MAX_TRANSPORT_ENVELOPES = 4;
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
}

/**
 * Removes the optional display metadata appended to some incoming Beep messages.
 *
 * The signature is deliberately strict so user-authored JSON or a private-use
 * character elsewhere in a message is preserved verbatim.
 */
export function cleanBeepMessageContent(value: unknown): string {
  if (typeof value !== "string") return "";

  let content = value;
  for (let index = 0; index < MAX_TRANSPORT_ENVELOPES; index += 1) {
    const withoutLikoMat = stripLikoMatTrailer(content);
    if (withoutLikoMat !== content) {
      content = withoutLikoMat;
      continue;
    }
    const withoutMessageMetadata = stripMessageMetadata(content);
    if (withoutMessageMetadata !== content) {
      content = withoutMessageMetadata;
      continue;
    }
    break;
  }
  return content.slice(0, MAX_BEEP_MESSAGE_LENGTH);
}

function stripLikoMatTrailer(value: string): string {
  for (const pattern of LIKO_MAT_TRAILER_PATTERNS) {
    const match = pattern.exec(value);
    if (match?.index !== undefined) return value.slice(0, match.index);
  }
  return value;
}

function stripMessageMetadata(value: string): string {
  const markerIndex = value.lastIndexOf(MESSAGE_METADATA_MARKER);
  if (markerIndex < 0) return value;

  const encodedMetadata = value.slice(markerIndex + MESSAGE_METADATA_MARKER.length).trim();
  if (!encodedMetadata || encodedMetadata.length > MAX_METADATA_LENGTH) return value;
  try {
    const metadata: unknown = JSON.parse(encodedMetadata);
    return isMessageMetadata(metadata) ? value.slice(0, markerIndex).trimEnd() : value;
  } catch {
    return value;
  }
}

function isMessageMetadata(value: unknown): value is MessageMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const metadata = value as Record<string, unknown>;
  const keys = Object.keys(metadata);
  const hasColor = keys.includes("messageColor");
  return (
    (keys.length === 1 || keys.length === 2) &&
    keys.includes("messageType") &&
    (keys.length === 1 || hasColor) &&
    (metadata.messageType === "Message" ||
      metadata.messageType === "Emote" ||
      metadata.messageType === "Action") &&
    (!hasColor ||
      (typeof metadata.messageColor === "string" &&
        /^#[0-9a-f]{6}$/iu.test(metadata.messageColor)))
  );
}
