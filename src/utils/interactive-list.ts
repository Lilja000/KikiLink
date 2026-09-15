import { focusedElement } from "./dom";

/** Keep live data fresh without moving a row under a pointer, touch, or keyboard focus.
 * One trailing timeout while scrolling/touching; no polling or document observation. */
export class InteractiveList<T> {
  readonly #rows = new Map<string, HTMLElement>();
  #items: T[] = [];
  #hover = false;
  #touch = false;
  #settling = false;
  #timer: ReturnType<typeof setTimeout> | undefined;
  readonly #abort = new AbortController();

  constructor(
    private readonly root: HTMLElement,
    private readonly key: (item: T) => string,
    private readonly create: (item: T) => HTMLElement,
    private readonly update: (row: HTMLElement, item: T) => void,
  ) {
    const options = { signal: this.#abort.signal, passive: true };
    root.addEventListener("pointerenter", (event) => { this.#hover = event.pointerType === "mouse"; }, options);
    root.addEventListener("pointerleave", () => { this.#hover = false; this.#apply(); }, options);
    root.addEventListener("pointerdown", () => { this.#touch = true; }, options);
    const release = (): void => { if (!this.#touch) return; this.#touch = false; this.#settle(); };
    // Release even when a drag or scroll finishes outside the list.
    document.addEventListener("pointerup", release, options);
    document.addEventListener("pointercancel", release, options);
    root.addEventListener("scroll", () => this.#settle(), options);
    root.addEventListener("focusout", () => queueMicrotask(() => this.#apply()), options);
  }

  render(items: T[], force = false): void {
    this.#items = items;
    for (const item of items) {
      const row = this.#rows.get(this.key(item));
      if (row) this.update(row, item);
    }
    this.#apply(force);
  }

  updateVisible(items: T[]): void {
    for (const item of items) {
      const row = this.#rows.get(this.key(item));
      if (row) this.update(row, item);
    }
  }

  destroy(): void {
    this.#abort.abort();
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#rows.clear();
  }

  #settle(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#settling = true;
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      this.#settling = false;
      this.#apply();
    }, 700);
  }

  #apply(force = false): void {
    if (this.#abort.signal.aborted) return;
    const focus = focusedElement(this.root);
    if (!force && (this.#hover || this.#touch || this.#settling || focus && this.root.contains(focus))) return;
    const wanted = new Set(this.#items.map(this.key));
    for (const [key, row] of this.#rows) {
      if (!wanted.has(key)) { row.remove(); this.#rows.delete(key); }
    }
    let index = 0;
    for (const item of this.#items) {
      const key = this.key(item);
      let row = this.#rows.get(key);
      if (!row) {
        row = this.create(item);
        this.#rows.set(key, row);
      }
      if (this.root.children[index] !== row) this.root.insertBefore(row, this.root.children[index] ?? null);
      index += 1;
    }
    if (focus?.isConnected && this.root.contains(focus) && focusedElement(this.root) !== focus) {
      focus.focus({ preventScroll: true });
    }
  }
}
