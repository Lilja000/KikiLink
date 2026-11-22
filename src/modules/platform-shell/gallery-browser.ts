import type { KeyValueStorage } from "../../core/settings";
import type { ChatMediaItem } from "../link-chat/chat-service";
import { element, focusedElement } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import { fitPanelDialog } from "./panel-dialog-layout";

export interface GalleryItem {
  url: string;
  provider: ChatMediaItem["provider"] | "device";
  sortAt: number;
  saved: boolean;
  expiresAt?: number;
  localId?: string;
  chat?: ChatMediaItem;
  group?: { groupId: string; groupTitle: string; senderName: string; direction: "incoming" | "outgoing"; sentAt: number };
}
export const galleryKey = (item: GalleryItem): string => item.localId ? `device:${item.localId}` : item.url;
const sources = ["all", "saved", "device", "direct", "groups"] as const;
type Source = typeof sources[number];
const preferenceKey = "kikilink:platform:gallery:v1";

export class GalleryBrowser {
  readonly toolbar = element("div", { className: "kl-gallery-toolbar" });
  readonly status = element("div", { className: "kl-gallery-status" });
  readonly dialog = element("dialog", { className: "kl-dialog kl-gallery-remove-dialog" });
  readonly #query = element("input", { className: "kl-input", ariaLabel: "Search Gallery" });
  readonly #source = element("select", { className: "kl-select", ariaLabel: "Image source" });
  readonly #sort = element("select", { className: "kl-select", ariaLabel: "Image order" });
  readonly #description = element("p");
  readonly #error = element("p", { className: "kl-gallery-action-error" });
  readonly #remove = element("button", { className: "kl-text-button kl-text-button--danger", type: "button", text: "Remove", onClick: () => { void this.#commitRemoval(); } });
  readonly #rows = new Map<string, { signature: string; node: HTMLElement }>();
  #items: GalleryItem[] = [];
  #loaded = false;
  #admin = false;
  #target: GalleryItem | undefined;
  #busy = false;
  #destroyed = false;
  #returnFocus: HTMLElement | undefined;

  constructor(private readonly grid: HTMLElement, private readonly count: HTMLElement, private readonly options: {
    storage?: KeyValueStorage | undefined;
    card: (item: GalleryItem, admin: boolean) => HTMLElement;
    add: () => void;
    refresh: () => void;
    remove: (item: GalleryItem) => Promise<void>;
    changed: () => void;
  }) {
    this.#query.maxLength = 120; this.#query.type = "search"; this.#query.placeholder = "Search images, names or hosts";
    this.status.setAttribute("role", "status"); this.#error.setAttribute("role", "alert");
    for (const [index, label] of ["All images", "My library", "On this device", "Direct chats", "Groups"].entries()) this.#source.append(Object.assign(element("option", { text: label }), { value: sources[index]! }));
    this.#sort.append(Object.assign(element("option", { text: "Newest first" }), { value: "newest" }), Object.assign(element("option", { text: "Oldest first" }), { value: "oldest" }));
    try {
      const saved = JSON.parse(options.storage?.getItem(preferenceKey) ?? "null");
      if (saved && typeof saved === "object") {
        if (typeof saved.query === "string") this.#query.value = saved.query.slice(0, 120);
        if (sources.includes(saved.source)) this.#source.value = saved.source;
        if (saved.sort === "oldest") this.#sort.value = "oldest";
      }
    } catch { /* Session filtering remains available when storage is unavailable. */ }
    for (const control of [this.#query, this.#source, this.#sort]) control.addEventListener(control === this.#query ? "input" : "change", () => {
      try { options.storage?.setItem(preferenceKey, JSON.stringify({ query: this.#query.value, source: this.#source.value, sort: this.#sort.value })); } catch { /* Keep the current session usable. */ }
      this.#render(); options.changed();
    });
    this.toolbar.append(element("div", { className: "kl-gallery-search" }, kikiIcon("search"), this.#query), this.#source, this.#sort);
    const title = element("h2", { text: "Remove image?" }); title.id = `kl-gallery-remove-${crypto.randomUUID()}`;
    this.dialog.setAttribute("aria-labelledby", title.id);
    this.dialog.append(element("header", { className: "kl-dialog-header" }, title,
      element("button", { className: "kl-icon-button", type: "button", ariaLabel: "Close image removal", onClick: () => this.dialog.close() }, kikiIcon("close"))),
      element("div", { className: "kl-dialog-body" }, this.#description, this.#error),
      element("footer", { className: "kl-dialog-actions" }, element("button", { className: "kl-text-button", type: "button", text: "Cancel", onClick: () => this.dialog.close() }), this.#remove));
    this.dialog.addEventListener("keydown", event => { if (event.key === "Escape") event.stopPropagation(); });
    this.dialog.addEventListener("cancel", event => { event.preventDefault(); this.dialog.close(); });
    this.dialog.addEventListener("close", () => {
      if (this.dialog.open) return;
      if (this.#returnFocus?.isConnected && !this.#returnFocus.closest("[hidden]")) this.#returnFocus.focus({ preventScroll: true });
      else if (!this.grid.closest("[hidden]")) this.#query.focus({ preventScroll: true });
      this.#returnFocus = undefined;
    });
    this.status.hidden = true;
  }

  showDeviceImages(): void {
    this.#query.value = "";
    this.#source.value = "device";
    this.#source.dispatchEvent(new Event("change"));
  }

  get visibleItems(): GalleryItem[] {
    const source = this.#source.value as Source, query = this.#query.value.trim().toLocaleLowerCase();
    return this.#items.filter(item => (source === "all" || source === "saved" && item.saved || source === "device" && item.localId || source === "direct" && item.chat || source === "groups" && item.group) &&
      (!query || `${item.provider} ${item.localId ? "On this device" : item.url} ${item.chat?.peerName ?? ""} ${item.chat?.peerNumber ?? ""} ${item.group?.groupTitle ?? ""} ${item.group?.senderName ?? ""}`.toLocaleLowerCase().includes(query)))
      .sort((a, b) => (a.sortAt - b.sortAt) * (this.#sort.value === "oldest" ? 1 : -1));
  }
  loading(explicit: boolean): void {
    this.grid.setAttribute("aria-busy", "true");
    if (this.#loaded && !explicit) return;
    this.status.hidden = false;
    this.status.textContent = this.#loaded ? "Refreshing images…" : "Loading images…";
  }
  setItems(items: GalleryItem[], admin: boolean, warning?: string): void {
    this.#items = items; this.#loaded = true; this.#admin = admin; this.grid.setAttribute("aria-busy", "false");
    this.#status(warning); this.#render(); this.options.changed();
  }
  failed(message: string): void { this.grid.setAttribute("aria-busy", "false"); this.#status(message); }
  #status(message?: string): void {
    if (!message && this.status.hidden) return;
    if (message && this.status.firstElementChild?.textContent === message) return;
    this.status.replaceChildren(); this.status.hidden = !message;
    if (message) this.status.append(element("span", { text: message }), element("button", { className: "kl-text-button", type: "button", text: "Retry", onClick: this.options.refresh }));
  }
  confirmRemove(item: GalleryItem): void {
    if (this.#busy || !this.#items.some(row => galleryKey(row) === galleryKey(item))) return;
    this.#target = item; this.#error.textContent = ""; this.#remove.disabled = false;
    this.#description.textContent = item.localId ? "Permanently delete this image from this device?" : "Remove this image from your Gallery? Its original message and hosted file will stay available.";
    if (!this.dialog.open) { this.#returnFocus = focusedElement(this.dialog); this.dialog.showModal(); fitPanelDialog(this.dialog); }
    this.dialog.querySelector<HTMLButtonElement>("footer button")?.focus();
  }
  clear(): void { if (this.dialog.open) this.dialog.close(); this.#items = []; this.#loaded = false; this.#rows.clear(); this.grid.replaceChildren(); this.#status(); this.options.changed(); }
  destroy(): void { this.#destroyed = true; this.#returnFocus = undefined; if (this.dialog.open) this.dialog.close(); this.dialog.remove(); this.#rows.clear(); this.#items = []; }

  #render(): void {
    const visible = this.visibleItems, live = new Set(visible.map(galleryKey));
    const count = `${visible.length} of ${this.#items.length} images`;
    if (this.count.textContent !== count) this.count.textContent = count;
    const empty = this.grid.querySelector<HTMLElement>(".kl-gallery-empty");
    const emptyState = this.#items.length ? "filtered" : "empty";
    if (empty && !visible.length && empty.dataset.state === emptyState) return;
    empty?.remove();
    for (const [id, row] of this.#rows) if (!live.has(id)) { row.node.remove(); this.#rows.delete(id); }
    for (const [index, item] of visible.entries()) {
      const id = galleryKey(item), signature = JSON.stringify([item, this.#admin]);
      let row = this.#rows.get(id);
      if (!row || row.signature !== signature) {
        const previous = row?.node, focused = previous?.contains(focusedElement(this.grid) ?? null);
        const node = this.options.card(item, this.#admin);
        const actions = node.querySelector<HTMLElement>(".kl-gallery-actions")!;
        actions.id = `kl-gallery-actions-${crypto.randomUUID()}`; actions.hidden = true;
        const more = element("button", { className: "kl-icon-button kl-gallery-more", type: "button", ariaLabel: "More image actions" }, kikiIcon("more"));
        more.setAttribute("aria-controls", actions.id); more.setAttribute("aria-expanded", "false");
        more.addEventListener("click", () => { actions.hidden = !actions.hidden; more.setAttribute("aria-expanded", String(!actions.hidden)); });
        node.addEventListener("keydown", event => { if (event.key === "Escape" && !actions.hidden) { event.preventDefault(); event.stopPropagation(); actions.hidden = true; more.setAttribute("aria-expanded", "false"); more.focus(); } });
        node.querySelector(".kl-gallery-meta")?.append(more);
        previous?.replaceWith(node); row = { signature, node }; this.#rows.set(id, row);
        if (focused) more.focus({ preventScroll: true });
      }
      if (this.grid.children[index] !== row.node) this.grid.insertBefore(row.node, this.grid.children[index] ?? null);
    }
    if (visible.length) return;
    const placeholder = element("div", { className: "kl-gallery-empty" },
      kikiIcon("image"),
      element("strong", { text: this.#items.length ? "No matching images" : "Your Gallery is empty" }),
      element("button", { className: "kl-text-button", type: "button", text: this.#items.length ? "Clear filters" : "Add the first image", onClick: () => {
        if (!this.#items.length) { this.options.add(); return; }
        this.#query.value = ""; this.#source.value = "all"; this.#query.dispatchEvent(new Event("input")); this.#query.focus();
      } }));
    placeholder.dataset.state = emptyState;
    this.grid.append(placeholder);
  }
  async #commitRemoval(): Promise<void> {
    const target = this.#target;
    if (this.#busy || !target || this.#destroyed) return;
    if (!this.#items.some(item => galleryKey(item) === galleryKey(target))) { this.dialog.close(); return; }
    this.#busy = true; this.#remove.disabled = true; this.#error.textContent = "";
    try { await this.options.remove(target); if (!this.#destroyed && this.dialog.open) this.dialog.close(); }
    catch (error) { if (!this.#destroyed) this.#error.textContent = error instanceof Error ? error.message : "The image could not be removed. Try again."; }
    finally { this.#busy = false; if (!this.#destroyed) this.#remove.disabled = false; }
  }
}
