/** Select the side of a trigger that can show the most actions within its scrollport. */
export function menuVerticalSpace(trigger: DOMRect, top: number, bottom: number, height: number) {
  const below = bottom - 8 - (trigger.bottom + 6);
  const above = trigger.top - 6 - (top + 8);
  const openAbove = height > below && above > below;
  return { openAbove, available: openAbove ? above : below };
}

/** Keep an open native disclosure's actions inside its scrollable workspace. */
export function trackMenuPlacement(menu: HTMLDetailsElement, trigger: HTMLElement, items: HTMLElement,
  scroller: HTMLElement, heightProperty: string, enabled?: () => boolean): () => void {
  const tracking = new AbortController();
  const stop = () => {
    tracking.abort();
    menu.removeAttribute("data-open-above");
    items.style.removeProperty(heightProperty);
  };
  const place = () => {
    if (!menu.isConnected || !menu.open || enabled && !enabled()) { stop(); return; }
    const frame = scroller.getBoundingClientRect(), anchor = trigger.getBoundingClientRect();
    const viewport = window.visualViewport, viewportTop = viewport?.offsetTop ?? 0;
    const top = Math.max(frame.top, viewportTop);
    const bottom = Math.min(frame.bottom, viewportTop + (viewport?.height ?? innerHeight));
    if (anchor.bottom <= top || anchor.top >= bottom) { menu.open = false; stop(); return; }
    const height = items.scrollHeight + items.offsetHeight - items.clientHeight;
    const { openAbove, available } = menuVerticalSpace(anchor, top, bottom, height);
    menu.toggleAttribute("data-open-above", openAbove);
    items.style.setProperty(heightProperty, `${Math.max(0, available)}px`);
  };
  const options = { signal: tracking.signal, passive: true };
  scroller.addEventListener("scroll", place, options);
  window.addEventListener("resize", place, options);
  window.visualViewport?.addEventListener("resize", place, options);
  window.visualViewport?.addEventListener("scroll", place, options);
  if (enabled) window.matchMedia?.("(hover: hover) and (pointer: fine)").addEventListener("change", place, options);
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(place);
    observer.observe(scroller);
    tracking.signal.addEventListener("abort", () => observer.disconnect(), { once: true });
  }
  place();
  return stop;
}

/** Place a fixed surface in the visible viewport, optionally inside an addon panel. */
export function anchorSurface(surface: HTMLElement, anchor: HTMLElement, boundary?: DOMRect): void {
  const rect = anchor.getBoundingClientRect();
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportRight = viewportLeft + (viewport?.width ?? window.innerWidth);
  const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
  const left = Math.max(viewportLeft, boundary?.left ?? viewportLeft);
  const top = Math.max(viewportTop, boundary?.top ?? viewportTop);
  const right = Math.min(viewportRight, boundary?.right ?? viewportRight);
  const bottom = Math.min(viewportBottom, boundary?.bottom ?? viewportBottom);
  surface.style.setProperty("--kl-surface-width", `${Math.max(0, right - left - 16)}px`);
  surface.style.setProperty("--kl-surface-height", `${Math.max(0, bottom - top - 16)}px`);
  const surfaceRect = surface.getBoundingClientRect();
  const width = surfaceRect.width || 220;
  let height = surfaceRect.height || 120;
  const { openAbove, available } = menuVerticalSpace(rect, top, bottom, height);
  // Keep the trigger visible and let long menus scroll. A trigger covering
  // nearly the whole viewport leaves too little space for even one action.
  if (available < height && available >= 44) {
    surface.style.setProperty("--kl-surface-height", `${available}px`);
    height = surface.getBoundingClientRect().height || height;
  }
  surface.style.left = `${Math.max(left + 8, Math.min(rect.right - width, right - width - 8))}px`;
  const preferredTop = openAbove ? rect.top - 6 - height : rect.bottom + 6;
  surface.style.top = `${Math.max(top + 8, Math.min(preferredTop, bottom - height - 8))}px`;
}
