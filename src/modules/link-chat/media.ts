export interface MessageLink {
  start: number;
  end: number;
  url: string;
  image: boolean;
}

const URL_PATTERN = /https:\/\/[^\s<>"'[\]]+/giu;
const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)$/iu;
const TRAILING_PUNCTUATION = /[),.;!?\]}]+$/u;

export function parseMessageLinks(message: string): MessageLink[] {
  const links: MessageLink[] = [];
  for (const match of message.matchAll(URL_PATTERN)) {
    if (match.index === undefined) continue;
    const candidate = trimTrailingPunctuation(match[0]);
    const url = normalizeHttpsUrl(candidate);
    if (!url) continue;
    links.push({
      start: match.index,
      end: match.index + candidate.length,
      url,
      image: isDirectImageUrl(url),
    });
  }
  return links;
}

export function normalizeImageUrl(value: string): string | null {
  const direct = normalizeHttpsUrl(value.trim());
  if (direct && isDirectImageUrl(direct)) return direct;

  // Clipboard contents can include Markdown, BBCode/color wrappers, or surrounding prose.
  // Send only the first direct image URL so formatting fragments never leak into a Beep.
  for (const match of value.matchAll(URL_PATTERN)) {
    const url = normalizeHttpsUrl(trimTrailingPunctuation(match[0]));
    if (url && isDirectImageUrl(url)) return url;
  }
  return null;
}

export function isDirectImageUrl(value: string): boolean {
  const url = normalizeHttpsUrl(value);
  if (!url) return false;
  return IMAGE_EXTENSION.test(new URL(url).pathname);
}

function normalizeHttpsUrl(value: string): string | null {
  if (!value || value.length > 900) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}

function trimTrailingPunctuation(value: string): string {
  let candidate = value;
  while (TRAILING_PUNCTUATION.test(candidate)) {
    const final = candidate.at(-1);
    if (final === ")" && count(candidate, "(") >= count(candidate, ")")) break;
    if (final === "]" && count(candidate, "[") >= count(candidate, "]")) break;
    if (final === "}" && count(candidate, "{") >= count(candidate, "}")) break;
    candidate = candidate.slice(0, -1);
  }
  return candidate;
}

function count(value: string, character: string): number {
  return [...value].filter((candidate) => candidate === character).length;
}
