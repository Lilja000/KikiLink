import { bindContextMenuGesture } from "../utils/context-menu-gesture";
import { element } from "./dom";
import { anchorSurface } from "../utils/anchored-surface";

/** One contextual menu and cancellable touch hold for the entire group list. */
export class GroupListMenu {
  readonly element = element("dialog", { className: "kl-cloud-group-menu", ariaLabel: "Group actions" });
  readonly #lifetime = new AbortController();
  readonly #cancelHold: () => void;
  #anchor: HTMLElement | undefined;
  constructor(root: HTMLElement, private readonly actions: (id: string, anchor: HTMLElement) => HTMLElement[], private readonly compact = false) {
    if (compact) {
      this.element.classList.add("kl-chat-options-menu");
      this.element.setAttribute("role", "menu");
    }
    const signal = this.#lifetime.signal;
    const rowAt = (event: Event): HTMLElement | null => event.target instanceof Element ? event.target.closest<HTMLElement>("[data-group-id]") : null;
    this.#cancelHold = bindContextMenuGesture(root, rowAt, row => this.open(row), signal);
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
}
