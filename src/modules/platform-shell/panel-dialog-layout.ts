const activeFits = new WeakMap<HTMLDialogElement, () => void>();

/** Center a native dialog in the visible part of the addon panel. */
export function fitPanelDialog(dialog: HTMLDialogElement, options?: {
  panel?: HTMLElement;
  restoreStyles?: boolean;
  layout?: (width: number, height: number) => { marginX: number; marginY: number; maxHeight?: number };
}): (() => void) | undefined {
  const panel = options?.panel ?? dialog.closest(".kl-panel");
  if (!panel || !dialog.open) return;

  activeFits.get(dialog)?.();
  const previous = options?.restoreStyles ? ["inset", "top", "right", "bottom", "left", "max-width", "max-height", "--kl-dialog-viewport-height"]
    .map(name => ({ name, value: dialog.style.getPropertyValue(name), priority: dialog.style.getPropertyPriority(name) })) : [];
  const lifetime = new AbortController();
  const viewport = window.visualViewport;
  const resize = () => {
    if (lifetime.signal.aborted || !dialog.open || !dialog.isConnected) return;
    const bounds = panel.getBoundingClientRect();
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const left = Math.max(bounds.left, viewportLeft);
    const top = Math.max(bounds.top, viewportTop);
    const right = Math.min(bounds.right, viewportLeft + (viewport?.width ?? innerWidth));
    const bottom = Math.min(bounds.bottom, viewportTop + (viewport?.height ?? innerHeight));
    const width = right - left, height = bottom - top;
    dialog.style.setProperty("--kl-dialog-viewport-height", `${Math.max(0, height)}px`);
    const { marginX, marginY, maxHeight } = options?.layout?.(width, height) ?? { marginX: 12, marginY: 12 };
    dialog.style.inset = `${top + marginY}px ${innerWidth - right + marginX}px ${innerHeight - bottom + marginY}px ${left + marginX}px`;
    dialog.style.maxWidth = `${Math.max(0, width - 2 * marginX)}px`;
    dialog.style.maxHeight = `${Math.max(0, Math.min(height - 2 * marginY, maxHeight ?? Infinity))}px`;
  };

  resize();
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(entries => {
    if (!dialog.isConnected) cleanup();
    else if (entries.some(entry => entry.target === panel)) resize();
  });
  observer?.observe(panel);
  // Some forms replace their open dialog when moving between steps.
  observer?.observe(dialog);
  window.addEventListener("resize", resize, { signal: lifetime.signal });
  viewport?.addEventListener("resize", resize, { signal: lifetime.signal });
  viewport?.addEventListener("scroll", resize, { signal: lifetime.signal });
  const cleanup = () => {
    if (lifetime.signal.aborted) return;
    observer?.disconnect();
    lifetime.abort();
    for (const { name, value, priority } of previous) {
      if (value) dialog.style.setProperty(name, value, priority);
      else dialog.style.removeProperty(name);
    }
    activeFits.delete(dialog);
  };
  activeFits.set(dialog, cleanup);
  dialog.addEventListener("close", () => {
    if (!dialog.open) cleanup();
  }, { signal: lifetime.signal });
  return cleanup;
}
