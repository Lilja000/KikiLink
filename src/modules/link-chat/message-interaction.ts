import { element } from "../../cloud/dom";

/** One menu and one cancellable hold timer for the whole conversation. */
export class MessageInteraction {
  readonly #lifetime = new AbortController();
  readonly #menu = element("div", { className: "kl-group-message-menu", role: "menu", ariaLabel: "Message options", hidden: true });
  #hold: ReturnType<typeof setTimeout> | undefined;
  #selected: HTMLElement | undefined;
  #anchor: HTMLElement | undefined;
  #suppressClickUntil = 0;

  constructor(readonly root: HTMLElement, readonly history: HTMLElement,
    readonly actions?: (row: HTMLElement) => HTMLElement[]) {
    if (actions) root.append(this.#menu);
    const signal = this.#lifetime.signal;
    const rowAt = (event: Event): HTMLElement | undefined => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target.closest("button,a,input,textarea,summary")) return;
      const row = target.closest<HTMLElement>(".kl-message-interaction[data-actionable]");
      return row && history.contains(row) ? row : undefined;
    };
    history.addEventListener("click", event => {
      if (Date.now() < this.#suppressClickUntil) { event.preventDefault(); event.stopPropagation(); return; }
      const row = rowAt(event);
      this.#menu.hidden = true;
      if (this.#selected === row) { this.close(); return; }
      this.close();
      if (row) { this.#selected = row; row.dataset.actions = "true"; }
    }, { signal });
    history.addEventListener("contextmenu", event => {
      const row = rowAt(event); if (!row || !this.actions) return;
      event.preventDefault(); event.stopPropagation(); this.#cancelHold(); this.#open(row);
    }, { signal });
    history.addEventListener("keydown", event => {
      const row = rowAt(event);
      if (event.key === "Escape") {
        if (this.#selected) { event.preventDefault(); event.stopPropagation(); }
        this.close(); return;
      }
      if (!row) return;
      if (this.actions && (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey))) {
        event.preventDefault(); this.#open(row);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); this.close(); this.#selected = row; row.dataset.actions = "true";
        row.querySelector<HTMLButtonElement>(".kl-message-side-actions button")?.focus();
      }
    }, { signal });
    let x = 0, y = 0;
    history.addEventListener("pointerdown", event => {
      this.#cancelHold();
      if (!this.actions || event.pointerType === "mouse" || event.button !== 0) return;
      const row = rowAt(event); if (!row) return;
      x = event.clientX; y = event.clientY;
      this.#hold = setTimeout(() => {
        this.#hold = undefined;
        if (!row.isConnected || !history.contains(row) || !row.dataset.actionable) return;
        this.#suppressClickUntil = Date.now() + 700; this.#open(row);
      }, 550);
    }, { signal, passive: true });
    history.addEventListener("pointermove", event => {
      if (Math.hypot(event.clientX - x, event.clientY - y) > 10) this.#cancelHold();
    }, { signal, passive: true });
    for (const name of ["pointerup", "pointercancel", "pointerleave"])
      history.addEventListener(name, () => this.#cancelHold(), { signal, passive: true });
    history.addEventListener("scroll", () => this.close(), { signal, passive: true });
    root.addEventListener("pointerdown", event => {
      if (this.#menu.hidden || !(event.target instanceof Node) || this.#menu.contains(event.target)) return;
      this.#menu.hidden = true;
    }, { signal });
    this.#menu.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.close(true); return; }
      const buttons = [...this.#menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      const index = buttons.indexOf(event.target as HTMLButtonElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault(); buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      } else if (event.key === "Tab") this.close(true);
    }, { signal });
  }
  #open(row: HTMLElement): void {
    this.close();
    const actions = this.actions?.(row) ?? []; if (!actions.length) return;
    this.#anchor = row.querySelector<HTMLElement>(".kl-message-bubble") ?? row;
    for (const action of actions) {
      action.setAttribute("role", "menuitem");
      action.addEventListener("click", () => { this.#menu.hidden = true; });
    }
    this.#menu.replaceChildren(...actions); this.#menu.hidden = false;
    const root = this.root.getBoundingClientRect(), anchor = this.#anchor.getBoundingClientRect();
    const width = this.#menu.offsetWidth || Math.min(240, root.width - 16);
    this.#menu.style.left = `${Math.max(8, Math.min(anchor.left - root.left, root.width - width - 8))}px`;
    this.#menu.style.top = `${Math.max(8, Math.min(anchor.bottom - root.top + 4, root.height - this.#menu.offsetHeight - 8))}px`;
    this.#menu.querySelector<HTMLButtonElement>("button")?.focus();
  }
  #cancelHold(): void { clearTimeout(this.#hold); this.#hold = undefined; }
  close(focus = false): void {
    this.#cancelHold(); this.#menu.hidden = true;
    if (this.#selected) delete this.#selected.dataset.actions;
    this.#selected = undefined;
    if (focus) this.#anchor?.focus({ preventScroll: true });
    this.#anchor = undefined;
  }
  destroy(): void { this.close(); this.#lifetime.abort(); this.#menu.remove(); }
}
