/** Preserve a visible message line when a decoded image changes layout above it. */
export function captureHistoryReadingAnchor(
  history: HTMLElement, bodySelector: string, ignoredSelector: string,
): (() => void) | undefined {
  const viewport = history.getBoundingClientRect();
  const scrollTop = history.scrollTop, width = history.clientWidth, height = history.clientHeight;
  for (const body of history.querySelectorAll<HTMLElement>(bodySelector)) {
    const bounds = body.getBoundingClientRect();
    if (bounds.bottom <= viewport.top || bounds.top >= viewport.bottom) continue;
    const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (!text.nodeValue?.trim() || text.parentElement?.closest(ignoredSelector)) continue;
      const range = body.ownerDocument.createRange(); range.selectNodeContents(text);
      const rects = range.getClientRects?.();
      if (!rects) continue;
      for (let index = 0; index < rects.length; index++) {
        const rect = rects[index]!;
        if (!rect.width || !rect.height || rect.top < viewport.top - .5 || rect.bottom > viewport.bottom + .5) continue;
        const offset = rect.top - viewport.top;
        return () => {
          if (!history.isConnected || !history.contains(text) || history.clientWidth !== width || history.clientHeight !== height) return;
          const next = range.getClientRects()[index];
          if (!next?.width || !next.height) return;
          const delta = next.top - history.getBoundingClientRect().top - offset;
          // Native scroll anchoring may already have kept this line in place.
          // A separate scroll gesture owns any different position meanwhile.
          if (Math.abs(delta) <= .5 || Math.abs(history.scrollTop - scrollTop) > .5) return;
          history.scrollTop += delta;
        };
      }
    }
  }
  return undefined;
}
