import type { MessageMention } from '../core/types';
import type { MessageTextRange } from '../modules/link-chat/message-actions';
import { appendFormattedText } from '../modules/link-chat/text-format';

export function shiftMentions(bindings: readonly MessageMention[] | undefined, offset: number): MessageMention[] {
  return (bindings ?? []).map(m => ({ ...m, start: m.start - offset, end: m.end - offset }));
}

/** Only server-confirmed spans become mentions; no username lookup during rendering. */
export function appendMentionText<Range extends MessageTextRange>(target: HTMLElement, value: string,
  protectedRanges: readonly Range[] = [], renderProtected?: (range: Range) => Node | undefined,
  bindings: readonly MessageMention[] = [], open?: (member: number) => void): void {
  const mentions = bindings.slice(0, 40).filter(m => Number.isSafeInteger(m.memberNumber) && m.memberNumber > 0 &&
    Number.isInteger(m.start) && Number.isInteger(m.end) && m.start >= 0 && m.end <= value.length &&
    /^[a-z0-9_]{3,24}$/.test(m.username) && value.slice(m.start, m.end).toLowerCase() === `@${m.username}` &&
    !protectedRanges.some(r => m.start < r.end && m.end > r.start));
  appendFormattedText<Range | MessageMention>(target, value, [...protectedRanges, ...mentions], range => {
    if (!('memberNumber' in range)) return renderProtected ? renderProtected(range as Range) : target.ownerDocument.createTextNode(value.slice(range.start, range.end));
    const node = target.ownerDocument.createElement(open ? 'button' : 'span');
    node.className = 'kl-message-mention'; node.textContent = value.slice(range.start, range.end);
    node.dataset.mentionMember = String(range.memberNumber);
    if (node instanceof HTMLButtonElement) {
      node.type = 'button'; node.title = `Open profile #${range.memberNumber}`;
      node.addEventListener('click', event => { event.stopPropagation(); open?.(range.memberNumber); });
    }
    return node;
  });
}
