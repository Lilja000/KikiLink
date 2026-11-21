/** Route a right click, keyboard menu key, or stationary touch hold to the same action. */
export function bindContextMenuGesture(
  root: HTMLElement,
  targetAt: (event: Event) => HTMLElement | null,
  open: (target: HTMLElement) => void,
  signal: AbortSignal,
): () => void {
  let hold: ReturnType<typeof setTimeout> | undefined;
  let origin: { id: number; x: number; y: number; target: HTMLElement } | undefined;
  let held: HTMLElement | undefined;
  let suppressUntil = 0;
  const cancel = () => { clearTimeout(hold); origin = undefined; };
  const consumed = (target: HTMLElement) => target === held && Date.now() < suppressUntil;
  signal.addEventListener("abort", cancel, { once: true });
  root.addEventListener("contextmenu", event => {
    const target = targetAt(event);
    if (!target) return;
    event.preventDefault(); event.stopPropagation();
    const touchHold = origin?.target === target;
    cancel();
    if (consumed(target)) return;
    if (touchHold) { held = target; suppressUntil = Date.now() + 700; }
    open(target);
  }, { signal });
  root.addEventListener("keydown", event => {
    if (event.key !== "ContextMenu" && !(event.key === "F10" && event.shiftKey)) return;
    const target = targetAt(event);
    if (target) { event.preventDefault(); event.stopPropagation(); open(target); }
  }, { signal });
  root.addEventListener("pointerdown", event => {
    cancel(); held = undefined;
    if (event.pointerType === "mouse" || event.button !== 0) return;
    const target = targetAt(event);
    if (!target) return;
    origin = { id: event.pointerId, x: event.clientX, y: event.clientY, target };
    hold = setTimeout(() => {
      if (!target.isConnected || !root.contains(target)) return;
      held = target; suppressUntil = Date.now() + 700; open(target);
    }, 550);
  }, { signal, passive: true });
  root.addEventListener("pointermove", event => {
    if (origin?.id === event.pointerId && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10) cancel();
  }, { signal, passive: true });
  for (const name of ["pointerup", "pointercancel", "pointerleave", "scroll"]) {
    root.addEventListener(name, cancel, { signal, passive: true, capture: name === "scroll" });
  }
  root.addEventListener("click", event => {
    const target = targetAt(event);
    if (target && consumed(target)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, { signal, capture: true });
  return cancel;
}
