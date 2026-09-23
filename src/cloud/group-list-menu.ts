import { element } from "./dom";

export function anchorSurface(surface: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
  const viewportWidth = viewport?.width ?? window.innerWidth, viewportHeight = viewport?.height ?? window.innerHeight;
  surface.style.setProperty("--kl-surface-width", `${Math.max(0, viewportWidth - 16)}px`);
  surface.style.setProperty("--kl-surface-height", `${Math.max(0, viewportHeight - 16)}px`);
  const width = surface.offsetWidth || 220, height = surface.offsetHeight || 120;
  const minimumLeft = left + 8, maximumLeft = Math.max(minimumLeft, left + viewportWidth - width - 8);
  const minimumTop = top + 8, maximumTop = Math.max(minimumTop, top + viewportHeight - height - 8);
  surface.style.left = `${Math.max(minimumLeft, Math.min(rect.right - width, maximumLeft))}px`;
  surface.style.top = `${Math.max(minimumTop, Math.min(rect.bottom + 6, maximumTop))}px`;
}

/** One contextual menu and cancellable touch hold for the entire group list. */
export class GroupListMenu {
  readonly element = element("dialog", { className: "kl-cloud-group-menu", ariaLabel: "Group actions" });
  readonly #lifetime = new AbortController();
  #hold: ReturnType<typeof setTimeout> | undefined;
  #anchor: HTMLElement | undefined;
  #suppressUntil = 0;
  constructor(root: HTMLElement, actions: (id: string) => HTMLElement[]) {
    const signal = this.#lifetime.signal;
    const rowAt = (event: Event): HTMLElement | null => event.target instanceof Element ? event.target.closest<HTMLElement>("[data-group-id]") : null;
    const open = (row: HTMLElement): void => {
      this.close(false);
      const items = actions(row.dataset.groupId!); if (!items.length) return;
      this.#anchor = row; this.element.replaceChildren(...items);
      this.element.setAttribute("aria-label", `Group actions: ${row.getAttribute("aria-label") ?? "Group"}`);
      try { this.element.showModal(); } catch { this.element.setAttribute("open", ""); }
      anchorSurface(this.element, row);
      this.element.querySelector<HTMLButtonElement>("button")?.focus();
    };
    root.addEventListener("contextmenu", event => { const row = rowAt(event); if (!row) return;
      event.preventDefault(); event.stopPropagation(); this.#cancelHold(); open(row); }, { signal });
    root.addEventListener("click", event => { if (rowAt(event) && Date.now() < this.#suppressUntil) {
      event.preventDefault(); event.stopImmediatePropagation(); } }, { signal, capture: true });
    let x = 0, y = 0;
    root.addEventListener("pointerdown", event => {
      this.#cancelHold(); const row = rowAt(event);
      if (!row || event.pointerType === "mouse" || event.button !== 0) return;
      x = event.clientX; y = event.clientY;
      this.#hold = setTimeout(() => { this.#hold = undefined; if (!root.contains(row) || !row.isConnected) return;
        this.#suppressUntil = Date.now() + 700; open(row); }, 550);
    }, { signal, passive: true });
    root.addEventListener("pointermove", event => { if (Math.hypot(event.clientX - x, event.clientY - y) > 10) this.#cancelHold(); }, { signal, passive: true });
    for (const name of ["pointerup", "pointercancel", "pointerleave", "scroll"]) root.addEventListener(name, () => this.#cancelHold(), { signal, passive: true });
    root.addEventListener("keydown", event => { const row = rowAt(event); if (row && (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey))) {
      event.preventDefault(); event.stopPropagation(); open(row); } }, { signal });
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.close(); }, { signal });
    this.element.addEventListener("click", event => { if (event.target === this.element) this.close(); }, { signal });
    this.element.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.close(); }
      if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
      const buttons = [...this.element.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      const i = buttons.indexOf(event.target as HTMLButtonElement);
      event.preventDefault(); buttons[(i + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }, { signal });
  }
  close(focus = true): void {
    this.#cancelHold();
    try { this.element.close(); } catch { this.element.removeAttribute("open"); }
    if (focus && this.#anchor?.isConnected) this.#anchor.focus({ preventScroll: true });
    this.#anchor = undefined;
  }
  destroy(): void { this.close(false); this.#lifetime.abort(); this.element.remove(); }
  #cancelHold(): void { clearTimeout(this.#hold); this.#hold = undefined; }
}
