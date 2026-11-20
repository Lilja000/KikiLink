import { parseMessageLinks } from "../modules/link-chat/media";
import type { MessageTextRange } from "../modules/link-chat/message-actions";
import type { MessageMention } from '../core/types';
import { appendMentionText, shiftMentions } from './mentions';

interface FeedTextRange extends MessageTextRange {
  spoiler?: string;
  literal?: string;
}

/** Feed-only spoilers reuse the existing safe formatter. Hidden contents are not
 * placed in the DOM (including accessible labels) until explicitly revealed. */
export function appendFeedFormattedText(target: HTMLElement, value: string, mentions?: readonly MessageMention[], open?: (member: number) => void): void {
  const links = parseMessageLinks(value);
  const protectedParts: FeedTextRange[] = [];
  const escaped = (index: number) => {
    let count = 0;
    while (index > 0 && value[--index] === "\\") count++;
    return count % 2 === 1;
  };
  let cursor = 0, linkIndex = 0;
  while (cursor < value.length) {
    const start = value.indexOf("||", cursor);
    if (start < 0) break;
    while ((links[linkIndex]?.end ?? Infinity) <= start) linkIndex++;
    const link = links[linkIndex];
    if (link && link.start <= start && start < link.end) { cursor = link.end; continue; }
    if (escaped(start)) {
      protectedParts.push({ start: start - 1, end: start + 2, literal: "||" });
      cursor = start + 2; continue;
    }
    let end = value.indexOf("||", start + 2);
    while (end >= 0 && escaped(end)) end = value.indexOf("||", end + 2);
    if (end < 0) break;
    const content = value.slice(start + 2, end);
    if (content.trim()) protectedParts.push({ start, end: end + 2, spoiler: content });
    cursor = end + 2;
  }
  const ranges: FeedTextRange[] = [
    ...protectedParts,
    ...links.filter(link => !protectedParts.some(part => link.start < part.end && link.end > part.start)),
  ];
  appendMentionText(target, value, ranges, range => {
    if (range.spoiler === undefined) return target.ownerDocument.createTextNode(range.literal ?? value.slice(range.start, range.end));
    const button = target.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "kl-feed-text-spoiler";
    let revealed = false;
    const render = () => {
      button.replaceChildren();
      button.setAttribute("aria-expanded", String(revealed));
      if (revealed) {
        button.removeAttribute("aria-label");
        button.title = "Hide spoiler";
        // The spoiler is already a button; its revealed mentions are spans, not nested controls.
        appendMentionText(button, range.spoiler!, parseMessageLinks(range.spoiler!), undefined, shiftMentions(mentions, range.start + 2));
      } else {
        button.setAttribute("aria-label", "Reveal spoiler");
        button.title = "Reveal spoiler";
        button.textContent = "Spoiler";
      }
    };
    button.addEventListener("click", () => { revealed = !revealed; render(); });
    render();
    return button;
  }, mentions, open);
}

export const FEED_SPOILER_STYLES = `
.kl-cloud .kl-feed-text-spoiler { display:inline; max-width:100%; padding:1px 6px; border:1px solid var(--kl-border); border-radius:5px; background:var(--kl-surface-2); color:var(--kl-muted); font:inherit; line-height:inherit; text-align:inherit; white-space:pre-wrap; overflow-wrap:anywhere; cursor:pointer; vertical-align:baseline; }
.kl-cloud .kl-feed-text-spoiler[aria-expanded="true"] { color:inherit; background:var(--kl-input-bg); }
.kl-cloud .kl-feed-text-spoiler:focus-visible { outline:2px solid var(--kl-accent); outline-offset:2px; }
`;
