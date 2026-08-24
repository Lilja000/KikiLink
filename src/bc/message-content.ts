const MAX_BEEP_MESSAGE_LENGTH = 1_000;
const MESSAGE_METADATA_MARKER = "\uf124";
const MAX_METADATA_LENGTH = 128;

interface MessageMetadata {
  messageType: "Message";
  messageColor: string;
}

/**
 * Removes the optional display metadata appended to some incoming Beep messages.
 *
 * The signature is deliberately strict so user-authored JSON or a private-use
 * character elsewhere in a message is preserved verbatim.
 */
export function cleanBeepMessageContent(value: unknown): string {
  if (typeof value !== "string") return "";

  const fallback = value.slice(0, MAX_BEEP_MESSAGE_LENGTH);
  const markerIndex = value.lastIndexOf(MESSAGE_METADATA_MARKER);
  if (markerIndex < 0) return fallback;

  const encodedMetadata = value.slice(markerIndex + MESSAGE_METADATA_MARKER.length).trim();
  if (!encodedMetadata || encodedMetadata.length > MAX_METADATA_LENGTH) return fallback;

  try {
    const metadata: unknown = JSON.parse(encodedMetadata);
    if (!isMessageMetadata(metadata)) return fallback;
  } catch {
    return fallback;
  }

  return value.slice(0, markerIndex).trimEnd().slice(0, MAX_BEEP_MESSAGE_LENGTH);
}

function isMessageMetadata(value: unknown): value is MessageMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const metadata = value as Record<string, unknown>;
  const keys = Object.keys(metadata);
  return (
    keys.length === 2 &&
    keys.includes("messageType") &&
    keys.includes("messageColor") &&
    metadata.messageType === "Message" &&
    typeof metadata.messageColor === "string" &&
    /^#[0-9a-f]{6}$/iu.test(metadata.messageColor)
  );
}
