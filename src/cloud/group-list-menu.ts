import { element } from "./dom";
import { anchorSurface } from "../utils/anchored-surface";

/** One contextual menu and cancellable touch hold for the entire group list. */
export class GroupListMenu {
  readonly element = element("dialog", { className: "kl-cloud-group-menu", ariaLabel: "Group actions" });
  readonly #lifetime = new AbortController();
  #hold: ReturnType<typeof setTimeout> | undefined;
  #anchor: HTMLElement | undefined;
  #suppressUntil = 0;
  constructor(root: HTMLElement, private readonly actions: (id: string, anchor: HTMLElement) => HTMLElement[], private readonly compact = false) {
    if (compact) {
      this.element.classList.add("kl-chat-options-menu");
      this.element.setAttribute("role", "menu");
    }
    const signal = this.#lifetime.signal;
    const rowAt = (event: Event): HTMLElement | null => event.target instanceof Element ? event.target.closest<HTMLElement>("[data-group-id]") : null;
    root.addEventListener("contextmenu", event => { const row = rowAt(event); if (!row) return;
      event.preventDefault(); event.stopPropagation(); this.#cancelHold(); this.open(row); }, { signal });
    root.addEventListener("click", event => { if (rowAt(event) && Date.now() < this.#suppressUntil) {
      event.preventDefault(); event.stopImmediatePropagation(); } }, { signal, capture: true });
    let x = 0, y = 0;
    root.addEventListener("pointerdown", event => {
      this.#cancelHold(); const row = rowAt(event);
      if (!row || event.pointerType === "mouse" || event.button !== 0) return;
      x = event.clientX; y = event.clientY;
      this.#hold = setTimeout(() => { this.#hold = undefined; if (!root.contains(row) || !row.isConnected) return;
        this.#suppressUntil = Date.now() + 700; this.open(row); }, 550);
    }, { signal, passive: true });
    root.addEventListener("pointermove", event => { if (Math.hypot(event.clientX - x, event.clientY - y) > 10) this.#cancelHold(); }, { signal, passive: true });
    for (const name of ["pointerup", "pointercancel", "pointerleave", "scroll"]) root.addEventListener(name, () => this.#cancelHold(), { signal, passive: true });
    root.addEventListener("keydown", event => { const row = rowAt(event); if (row && (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey))) {
      event.preventDefault(); event.stopPropagation(); this.open(row); } }, { signal });
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.close(); }, { signal });
    this.element.addEventListener("click", event => {
      if (event.target !== this.element) return;
      const bounds = this.element.getBoundingClientRect();
      if (!compact || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)
        this.close();
    }, { signal });
    this.element.addEventListener("keydown", event => {
      if (compact) event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.close(); }
      if (compact && event.key === "Tab") { event.preventDefault(); this.close(); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const buttons = [...this.element.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      const i = buttons.indexOf(event.target as HTMLButtonElement);
      const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
        (i + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      event.preventDefault(); buttons[index]?.focus();
    }, { signal });
  }
  open(row: HTMLElement, anchor = row): void {
    const id = row.dataset.groupId;
    if (!id) return;
    if (this.compact && this.#anchor === anchor && this.element.open) { this.close(); return; }
    this.close(false);
    const items = this.actions(id, anchor);
    if (!items.length) return;
    this.#anchor = anchor;
    if (anchor.hasAttribute("aria-haspopup")) anchor.setAttribute("aria-expanded", "true");
    if (this.compact) for (const item of items) {
      if (item instanceof HTMLButtonElement) item.setAttribute("role", "menuitem");
    }
    this.element.replaceChildren(...items);
    this.element.setAttribute("aria-label", this.compact ? "Conversation options" : `Group actions: ${row.getAttribute("aria-label") ?? "Group"}`);
    try { this.element.showModal(); } catch { this.element.setAttribute("open", ""); }
    const boundary = this.compact ? anchor.closest(".kl-panel")?.getBoundingClientRect() : undefined;
    anchorSurface(this.element, anchor, boundary);
    this.element.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }
  close(focus = true): void {
    this.#cancelHold();
    try { this.element.close(); } catch { this.element.removeAttribute("open"); }
    if (this.#anchor?.hasAttribute("aria-haspopup")) this.#anchor.setAttribute("aria-expanded", "false");
    if (focus && this.#anchor?.isConnected) this.#anchor.focus({ preventScroll: true });
    this.#anchor = undefined;
  }
  destroy(): void { this.close(false); this.#lifetime.abort(); this.element.remove(); }
  #cancelHold(): void { clearTimeout(this.#hold); this.#hold = undefined; }
}
