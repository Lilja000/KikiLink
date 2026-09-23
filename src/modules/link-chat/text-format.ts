import type { MessageTextRange } from "./message-actions";
import { isDirectImageUrl } from "./media";

const tags = { "*": "em", "**": "strong", "__": "u", "~~": "s" } as const;
type Marker = keyof typeof tags;
export const TEXT_FORMAT_HINT = "*italic* · **bold** · __underline__ · ~~strikethrough~~ · # heading at line start; combine styles or use \\ to escape.";

/** Deliberately opt-in: message/post bodies only, never names or profile fields.
 * User input becomes text nodes, not HTML. URLs remain opaque to the parser.
 * A bounded delimiter stack avoids recursive parsing of untrusted content. */
export function appendFormattedText<Range extends MessageTextRange>(
  target: HTMLElement, value: string, protectedRanges: readonly Range[] = [],
  renderProtectedRange?: (range: Range) => Node | undefined,
): void {
  target.classList.add("kl-formatted-text");
  const doc = target.ownerDocument;
  const ranges = new Map<number, Range>();
  let previousEnd = 0;
  for (const range of [...protectedRanges].sort((a, b) => a.start - b.start)) {
    if (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < previousEnd || range.end > value.length || range.end <= range.start) continue;
    ranges.set(range.start, range); previousEnd = range.end;
  }
  const inline = (parent: Node, start: number, end: number) => {
    const frames: Array<{ marker: Marker; content: DocumentFragment }> = [];
    const current = (): Node => frames.at(-1)?.content ?? parent;
    let text = "";
    const flush = () => { if (text) { current().appendChild(doc.createTextNode(text)); text = ""; } };
    for (let i = start; i < end;) {
      const range = ranges.get(i);
      if (range && range.end <= end) {
        flush();
        let resolved = range, protectedEnd = range.end;
        for (const frame of [...frames].reverse()) {
          if (!value.slice(i, protectedEnd).endsWith(frame.marker)) break;
          protectedEnd -= frame.marker.length;
        }
        if (protectedEnd > i && protectedEnd !== range.end) {
          resolved = { ...range, end: protectedEnd };
          if ("url" in resolved && typeof resolved.url === "string") {
            try {
              const url = new URL(value.slice(i, protectedEnd)).href;
              resolved.url = url;
              if ("image" in resolved) resolved.image = isDirectImageUrl(url);
            } catch { resolved = range; }
          }
        }
        const node = renderProtectedRange ? renderProtectedRange(resolved) : doc.createTextNode(value.slice(i, resolved.end));
        if (node) current().appendChild(node);
        i = resolved.end; continue;
      }
      if (value[i] === "\\" && /[*_~#\\]/u.test(value[i + 1] ?? "")) { text += value[i + 1]; i += 2; continue; }
      const top = frames.at(-1);
      // A closing run such as *** closes the innermost marker first.
      const closing = top && value.startsWith(top.marker, i) &&
        (top.marker !== "*" || !value.startsWith("**", i) ||
          (value.startsWith("***", i) && frames.some(frame => frame.marker === "**")));
      const marker: Marker | undefined = closing ? top.marker
        : value.startsWith("**", i) ? "**" : value.startsWith("__", i) ? "__"
        : value.startsWith("~~", i) ? "~~" : value[i] === "*" ? "*" : undefined;
      if (!marker) { text += value[i++]; continue; }
      if (top?.marker === marker) {
        flush(); frames.pop();
        if (top.content.textContent?.trim() || top.content.childElementCount) {
          const node = doc.createElement(tags[marker]);
          node.append(top.content); current().appendChild(node);
        } else { current().appendChild(doc.createTextNode(marker)); current().appendChild(top.content); text += marker; }
      } else if (frames.length < 16 && !frames.some(frame => frame.marker === marker)) {
        flush(); frames.push({ marker, content: doc.createDocumentFragment() });
      } else text += marker;
      i += marker.length;
    }
    flush();
    while (frames.length) {
      const frame = frames.pop()!;
      current().appendChild(doc.createTextNode(frame.marker)); current().appendChild(frame.content);
    }
  };
  let chunkStart = 0;
  for (const match of value.matchAll(/^# [^\r\n]*/gmu)) {
    const start = match.index!;
    if (start > chunkStart) inline(target, chunkStart, start);
    const heading = doc.createElement("span"); heading.className = "kl-format-heading";
    heading.setAttribute("role", "heading"); heading.setAttribute("aria-level", "1");
    inline(heading, start + 2, start + match[0].length); target.append(heading);
    chunkStart = start + match[0].length;
  }
  if (chunkStart < value.length) inline(target, chunkStart, value.length);
}

export const TEXT_FORMAT_STYLES = `
.kl-formatted-text { min-width:0; max-width:100%; white-space:pre-wrap; overflow-wrap:anywhere; unicode-bidi:plaintext; }
.kl-formatted-text strong { font-weight:750; }
.kl-formatted-text em { font-style:italic; color:inherit; }
.kl-formatted-text u { text-decoration:underline; text-underline-offset:0.12em; }
.kl-formatted-text s { text-decoration:line-through; }
.kl-formatted-text .kl-format-heading { font-size:1.5em; font-weight:750; line-height:1.3; }
`;
