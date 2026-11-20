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
  const height = surfaceRect.height || 120;
  surface.style.left = `${Math.max(left + 8, Math.min(rect.right - width, right - width - 8))}px`;
  surface.style.top = `${Math.max(top + 8, Math.min(rect.bottom + 6, bottom - height - 8))}px`;
}
