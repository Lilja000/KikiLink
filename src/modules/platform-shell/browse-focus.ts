import { focusedElement } from "../../utils/dom";
import { revealHorizontalTab } from "./detail-section-navigation";

/** Keep a select or a newly chosen scope focused when refreshing replaces its toolbar. */
export async function preserveSelectionFocus(container: HTMLElement, update: () => void | Promise<void>): Promise<void> {
  let control = focusedElement(container);
  const select = control instanceof HTMLSelectElement ? control.getAttribute("aria-label") : undefined;
  const group = control instanceof HTMLButtonElement && control.hasAttribute("aria-pressed")
    ? control.closest('[role="group"][aria-label]')?.getAttribute("aria-label") : undefined;
  const selector = select ? `select[aria-label="${CSS.escape(select)}"]`
    : group ? `[role="group"][aria-label="${CSS.escape(group)}"] button[aria-pressed="true"]` : undefined;
  if (!control || !selector || !container.contains(control)) {
    await update();
    return;
  }

  const doc = container.ownerDocument;
  let moved = false;
  const onFocus = (event: FocusEvent) => { if (event.composedPath()[0] !== control) moved = true; };
  const restore = () => {
    if (moved || control?.isConnected || !container.isConnected || container.closest("[hidden]")) return;
    const root = container.getRootNode();
    if (doc.activeElement && doc.activeElement !== doc.body &&
        !(root instanceof ShadowRoot && doc.activeElement === root.host && !root.activeElement)) return;
    const next = container.querySelector<HTMLElement>(selector);
    if (!next || next.matches(":disabled") || next.closest("[hidden]")) return;
    control = next;
    next.focus({ preventScroll: true });
    const strip = group && next.closest<HTMLElement>('[role="group"]');
    if (strip) revealHorizontalTab(next, strip, 2);
  };
  doc.addEventListener("focusin", onFocus, true);
  try {
    const task = update();
    restore();
    await task;
    restore();
  } finally {
    doc.removeEventListener("focusin", onFocus, true);
  }
}
