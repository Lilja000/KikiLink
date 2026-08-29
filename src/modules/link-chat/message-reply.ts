const REPLY_PREFIX = "> Reply to ";
const REPLY_AUTHOR_MAX_CHARS = 64;
const REPLY_EXCERPT_MAX_CHARS = 180;
const REPLY_PREFIX_MAX_CHARS =
  REPLY_PREFIX.length + REPLY_AUTHOR_MAX_CHARS + 2 + REPLY_EXCERPT_MAX_CHARS;

export interface InlineReplyContext {
  author: string;
  excerpt: string;
  content: string;
}

/**
 * Parses only KikiLink's bounded, single-line reply prefix. Requiring the explicit marker,
 * canonical whitespace, and a non-empty response keeps ordinary Markdown-style quotes intact.
 */
export function parseInlineReplyContext(value: string): InlineReplyContext | undefined {
  const parsed = parseBoundedReplyPrefix(value);
  return parsed && parsed.content.trim().length > 0 ? parsed : undefined;
}

/** Removes a generated prefix from a draft so choosing another Reply replaces it cleanly. */
export function stripInlineReplyDraft(value: string): string {
  return parseBoundedReplyPrefix(value)?.content ?? value;
}

function parseBoundedReplyPrefix(value: string): InlineReplyContext | undefined {
  const newline = value.indexOf("\n");
  if (newline < 0 || newline > REPLY_PREFIX_MAX_CHARS) return undefined;
  const firstLine = value.slice(0, newline);
  if (firstLine.includes("\r") || !firstLine.startsWith(REPLY_PREFIX)) return undefined;
  const separator = firstLine.indexOf(": ", REPLY_PREFIX.length);
  if (separator < 0) return undefined;

  const author = firstLine.slice(REPLY_PREFIX.length, separator);
  const excerpt = firstLine.slice(separator + 2);
  const content = value.slice(newline + 1);
  if (
    author.length === 0 ||
    author.length > REPLY_AUTHOR_MAX_CHARS ||
    excerpt.length === 0 ||
    excerpt.length > REPLY_EXCERPT_MAX_CHARS ||
    canonicalAuthor(author) !== author ||
    canonicalExcerpt(excerpt) !== excerpt
  ) {
    return undefined;
  }
  return { author, excerpt, content };
}

/** Produces a readable fallback for older clients while giving newer clients a strict marker. */
export function formatInlineReplyPrefix(author: string, quotedContent: string): string {
  const normalizedAuthor = sliceCompleteUtf16(canonicalAuthor(author), REPLY_AUTHOR_MAX_CHARS) || "Unknown";
  const nestedReply = parseInlineReplyContext(quotedContent);
  const excerptSource = nestedReply?.content ?? quotedContent;
  const excerpt =
    sliceCompleteUtf16(canonicalExcerpt(excerptSource), REPLY_EXCERPT_MAX_CHARS) || "Beep";
  return `${REPLY_PREFIX}${normalizedAuthor}: ${excerpt}\n`;
}

function canonicalAuthor(value: string): string {
  return value.replace(/[:\r\n]+/gu, " ").replace(/\s+/gu, " ").trim();
}

function canonicalExcerpt(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function sliceCompleteUtf16(value: string, maxLength: number): string {
  const sliced = value.slice(0, maxLength);
  const finalUnit = sliced.charCodeAt(sliced.length - 1);
  return finalUnit >= 0xd800 && finalUnit <= 0xdbff ? sliced.slice(0, -1) : sliced;
}
