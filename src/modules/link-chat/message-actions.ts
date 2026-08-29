export interface MessageTextRange {
  start: number;
  end: number;
}

export interface MessageActionSegment extends MessageTextRange {
  action: boolean;
}

interface NormalizedProtectedRange<Range extends MessageTextRange> extends MessageTextRange {
  source: Range;
}

/**
 * Splits text into ordinary and `*action*` ranges without applying Markdown or HTML.
 * Protected ranges (normally parsed links) are opaque, so URL asterisks cannot become
 * action delimiters. Delimiters remain part of the rendered text for exact copy/reply text.
 */
export function parseMessageActionSegments(
  value: string,
  protectedRanges: readonly MessageTextRange[] = [],
): MessageActionSegment[] {
  if (value.length === 0) return [];
  const ranges = normalizeProtectedRanges(value.length, protectedRanges);
  const actions: MessageTextRange[] = [];
  let rangeIndex = 0;
  let cursor = 0;

  const nextDelimiter = (from: number): number => {
    let candidate = value.indexOf("*", from);
    while (candidate >= 0) {
      while ((ranges[rangeIndex]?.end ?? Number.POSITIVE_INFINITY) <= candidate) {
        rangeIndex += 1;
      }
      const protectedRange = ranges[rangeIndex];
      if (
        protectedRange &&
        candidate >= protectedRange.start &&
        candidate < protectedRange.end
      ) {
        candidate = value.indexOf("*", protectedRange.end);
        continue;
      }
      return candidate;
    }
    return -1;
  };

  while (cursor < value.length) {
    const start = nextDelimiter(cursor);
    if (start < 0) break;
    const endDelimiter = nextDelimiter(start + 1);
    if (endDelimiter < 0) break;
    const end = endDelimiter + 1;
    if (endDelimiter > start + 1 && value.slice(start + 1, endDelimiter).trim()) {
      actions.push({ start, end });
    }
    cursor = end;
  }

  if (actions.length === 0) return [{ start: 0, end: value.length, action: false }];
  const segments: MessageActionSegment[] = [];
  cursor = 0;
  for (const action of actions) {
    if (action.start > cursor) {
      segments.push({ start: cursor, end: action.start, action: false });
    }
    segments.push({ ...action, action: true });
    cursor = action.end;
  }
  if (cursor < value.length) {
    segments.push({ start: cursor, end: value.length, action: false });
  }
  return segments;
}

/**
 * Appends safe text nodes and semantic action emphasis. A caller may render protected
 * ranges as anchors (or omit an image URL that is represented by a preview) without
 * allowing those ranges to influence action parsing.
 */
export function appendActionFormattedText<Range extends MessageTextRange>(
  target: Node,
  value: string,
  protectedRanges: readonly Range[] = [],
  renderProtectedRange?: (range: Range) => Node | undefined,
): void {
  if (!value) return;
  const ownerDocument = target.ownerDocument;
  if (!ownerDocument) return;
  const ranges = normalizeProtectedRanges(value.length, protectedRanges);
  const segments = parseMessageActionSegments(value, ranges);
  let rangeIndex = 0;

  for (const segment of segments) {
    const segmentTarget = segment.action
      ? ownerDocument.createElement("em")
      : target;
    if (segment.action) (segmentTarget as HTMLElement).className = "kl-message-action-text";
    let cursor = segment.start;

    while ((ranges[rangeIndex]?.end ?? Number.POSITIVE_INFINITY) <= segment.start) {
      rangeIndex += 1;
    }
    while (rangeIndex < ranges.length && ranges[rangeIndex]!.start < segment.end) {
      const range = ranges[rangeIndex]!;
      // Delimiters inside protected ranges are ignored, so a valid range cannot be split
      // by an action boundary. Fall back to literal text if a malformed caller range is.
      if (range.start < segment.start || range.end > segment.end) break;
      if (range.start > cursor) {
        segmentTarget.appendChild(ownerDocument.createTextNode(value.slice(cursor, range.start)));
      }
      const rendered = renderProtectedRange?.(range.source);
      if (rendered) segmentTarget.appendChild(rendered);
      else if (!renderProtectedRange) {
        segmentTarget.appendChild(ownerDocument.createTextNode(value.slice(range.start, range.end)));
      }
      cursor = range.end;
      rangeIndex += 1;
    }
    if (cursor < segment.end) {
      segmentTarget.appendChild(ownerDocument.createTextNode(value.slice(cursor, segment.end)));
    }
    if (segment.action) target.appendChild(segmentTarget);
  }
}

function normalizeProtectedRanges<Range extends MessageTextRange>(
  valueLength: number,
  ranges: readonly Range[],
): NormalizedProtectedRange<Range>[] {
  const normalized: NormalizedProtectedRange<Range>[] = [];
  for (const source of [...ranges].sort((left, right) => left.start - right.start)) {
    if (!Number.isInteger(source.start) || !Number.isInteger(source.end)) continue;
    const start = Math.max(0, source.start);
    const end = Math.min(valueLength, source.end);
    if (start >= end || start < (normalized.at(-1)?.end ?? 0)) continue;
    normalized.push({ start, end, source });
  }
  return normalized;
}
