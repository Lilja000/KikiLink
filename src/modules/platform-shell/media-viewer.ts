import { element, focusedElement } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import type { RemoteImageLease } from "../link-chat/remote-image-loader";
import { fitPanelDialog } from "./panel-dialog-layout";
import { ShellActionMenu, type ShellAction } from "./action-menu";

export interface MediaViewerItem {
  id: string;
  title: string;
  detail: string;
  caption?: string;
  originalUrl?: string;
  load(signal: AbortSignal): Promise<RemoteImageLease>;
}

/** Loads only the explicitly selected image; every transition owns and releases its lease. */
export class MediaViewer {
  readonly element = element("dialog", { className: "kl-dialog kl-media-viewer" });
  readonly #title = element("h2");
  readonly #stage = element("div", { className: "kl-media-viewer-stage", tabIndex: 0, ariaLabel: "Image preview" });
  readonly #detail = element("p", { className: "kl-media-viewer-detail" });
  readonly #caption = element("p", { className: "kl-media-viewer-caption" });
  readonly #body = element("div", { className: "kl-media-viewer-body" });
  readonly #menu = new ShellActionMenu();
  readonly #more = element("button", { className: "kl-icon-button kl-media-viewer-more", type: "button", ariaLabel: "Image options", onClick: () => this.#openOptions() }, kikiIcon("more"));
  readonly #header: HTMLElement;
  readonly #footer: HTMLElement;
  readonly #close = element("button", { className: "kl-text-button kl-text-button--primary", type: "button", text: "Close", onClick: () => this.close() });
  readonly #counter = element("span");
  readonly #previous = element("button", { className: "kl-text-button", type: "button", ariaLabel: "Previous image", onClick: () => this.#step(-1) }, kikiIcon("back"), "Previous");
  readonly #next = element("button", { className: "kl-text-button", type: "button", ariaLabel: "Next image", onClick: () => this.#step(1) }, "Next", kikiIcon("arrow-right"));
  readonly #size = element("button", { className: "kl-text-button", type: "button", text: "Actual size", onClick: () => this.#toggleSize() });
  readonly #original = element("a", { className: "kl-image-open", text: "Open original ↗" });
  #items: (() => MediaViewerItem[]) | undefined;
  #id = "";
  #controller: AbortController | undefined;
  #lease: RemoteImageLease | undefined;
  #observer: MutationObserver | undefined;
  #returnFocus: HTMLElement | undefined;
  #epoch = 0;
  #actual = false;
  #destroyed = false;
  #album = false;

  constructor() {
    this.#title.id = `kl-media-viewer-${crypto.randomUUID()}`;
    this.#menu.element.id = `kl-media-viewer-options-${crypto.randomUUID()}`;
    this.element.setAttribute("aria-labelledby", this.#title.id);
    this.#counter.setAttribute("aria-live", "polite");
    this.#stage.setAttribute("aria-live", "polite");
    this.#original.target = "_blank"; this.#original.rel = "noopener noreferrer nofollow"; this.#original.referrerPolicy = "no-referrer";
    this.#header = element("header", { className: "kl-dialog-header" },
      element("div", { className: "kl-dialog-heading" }, element("span", { className: "kl-media-viewer-kicker", text: "KikiLink" }), this.#title),
      element("button", { className: "kl-icon-button", type: "button", ariaLabel: "Close image viewer", onClick: () => this.close() }, kikiIcon("close")));
    this.#footer = element("footer", { className: "kl-media-viewer-footer" },
        element("div", { className: "kl-media-viewer-nav" }, this.#previous, this.#counter, this.#next),
        this.#size, this.#original, this.#close);
    this.element.append(this.#header, this.#stage, this.#detail, this.#footer, this.#menu.element);
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
    this.element.addEventListener("close", () => {
      if (this.element.open) return;
      this.#release();
      if (this.#returnFocus?.isConnected && !this.#returnFocus.closest("[hidden]")) this.#returnFocus.focus({ preventScroll: true });
      this.#returnFocus = undefined;
    });
    this.element.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.stopPropagation(); return; }
      if (event.altKey || event.ctrlKey || event.metaKey || this.#actual || (event.target as HTMLElement).matches("input,textarea,select")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); event.stopPropagation(); this.#step(event.key === "ArrowLeft" ? -1 : 1);
      }
    });
  }

  show(items: () => MediaViewerItem[], id: string, presentation?: "space-album"): void {
    if (this.#destroyed) return;
    if (!this.element.open) this.#returnFocus = focusedElement(this.element);
    this.#layout(presentation === "space-album");
    this.#items = items; this.#id = id;
    if (!this.#read().some(item => item.id === id)) { this.close(); return; }
    if (!this.element.open) { this.element.showModal(); fitPanelDialog(this.element); }
    this.#observer?.disconnect();
    this.#observer = new MutationObserver(() => this.refresh());
    this.#observer.observe(this.element.getRootNode(), { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    void this.#load();
  }

  refresh(): void {
    if (!this.element.open) return;
    const items = this.#read(), index = items.findIndex(item => item.id === this.#id);
    if (index < 0) { this.close(); return; }
    this.#navigation(index, items.length);
  }

  close(): void { this.#release(); if (this.element.open) this.element.close(); }
  destroy(): void { this.#destroyed = true; this.#returnFocus = undefined; this.close(); this.#menu.destroy(); this.element.remove(); }
  #layout(album: boolean): void {
    this.#menu.close(false);
    this.#album = album;
    if (album) {
      this.element.dataset.presentation = "space-album";
      this.#body.replaceChildren(this.#stage, this.#detail);
      this.#footer.before(this.#body);
      this.#header.lastElementChild?.before(this.#more);
      this.#size.remove(); this.#original.remove();
    } else {
      delete this.element.dataset.presentation;
      this.#footer.before(this.#stage, this.#detail);
      this.#body.remove(); this.#caption.remove(); this.#more.remove();
      this.#close.before(this.#size, this.#original);
    }
  }
  #openOptions(): void {
    const epoch = this.#epoch, id = this.#id;
    if (!this.#album || !this.element.open || !this.#read().some(item => item.id === id)) return;
    const current = () => this.element.open && this.#album && epoch === this.#epoch && id === this.#id
      ? this.#read().find(item => item.id === id) : undefined;
    const actions: ShellAction[] = [{ label: this.#actual ? "Fit image" : "Actual size", checked: this.#actual, disabled: this.#size.disabled,
      run: () => { if (current() && !this.#size.disabled) this.#toggleSize(); } }];
    const original = this.#read().find(item => item.id === id)?.originalUrl;
    if (original) actions.push({ label: "Open original ↗", run: () => { if (current()?.originalUrl === original) this.#original.click(); } });
    this.#menu.open(this.#more, "Image options", actions, undefined, true, false);
  }
  #read(): MediaViewerItem[] { try { return this.#items?.() ?? []; } catch { return []; } }
  #navigation(index: number, count: number): void {
    const label = `${index + 1} of ${count}`;
    if (this.#counter.textContent !== label) this.#counter.textContent = label;
    this.#previous.disabled = index <= 0; this.#next.disabled = index >= count - 1;
  }
  #step(delta: number): void {
    const items = this.#read(), index = items.findIndex(item => item.id === this.#id), next = items[index + delta];
    if (index < 0) { this.close(); return; }
    if (next) { this.#id = next.id; void this.#load(); }
  }
  #toggleSize(): void {
    this.#actual = !this.#actual; this.#stage.dataset.actual = String(this.#actual);
    this.#size.textContent = this.#actual ? "Fit image" : "Actual size";
    this.#size.setAttribute("aria-pressed", String(this.#actual)); this.#stage.scrollTo?.(0, 0);
  }
  #releaseImage(): void {
    this.#menu.close(false);
    this.#epoch++; this.#controller?.abort(); this.#controller = undefined;
    this.#stage.replaceChildren(); this.#lease?.release(); this.#lease = undefined;
  }
  #release(): void {
    this.#observer?.disconnect(); this.#observer = undefined; this.#releaseImage(); this.#items = undefined;
    this.#original.removeAttribute("href");
    if (this.#album) { this.#caption.remove(); this.#caption.textContent = ""; this.#title.textContent = ""; this.#detail.textContent = ""; }
  }
  async #load(): Promise<void> {
    this.#releaseImage(); const epoch = this.#epoch;
    const items = this.#read(), index = items.findIndex(item => item.id === this.#id), item = items[index];
    if (!item) { this.close(); return; }
    this.#navigation(index, items.length); this.#title.textContent = item.title; this.#detail.textContent = item.detail;
    if (this.#album && item.caption) { this.#caption.textContent = item.caption; this.#detail.before(this.#caption); }
    else { this.#caption.remove(); this.#caption.textContent = ""; }
    this.#actual = false; this.#stage.dataset.actual = "false"; this.#size.textContent = "Actual size";
    this.#size.setAttribute("aria-pressed", "false"); this.#size.disabled = true;
    this.#original.hidden = !item.originalUrl;
    if (item.originalUrl) this.#original.href = item.originalUrl; else this.#original.removeAttribute("href");
    this.#stage.dataset.state = "loading"; this.#stage.setAttribute("aria-busy", "true");
    this.#stage.append(element("p", { text: "Loading image…" }));
    const controller = new AbortController(); this.#controller = controller;
    try {
      const lease = await item.load(controller.signal);
      if (controller.signal.aborted || epoch !== this.#epoch || !this.element.open || !this.#read().some(row => row.id === item.id)) { lease.release(); return; }
      this.#lease = lease;
      const img = element("img", { alt: this.#album ? item.caption || item.title : item.title }); img.decoding = "async"; img.referrerPolicy = "no-referrer";
      const fail = () => {
        if (epoch !== this.#epoch || !this.element.open) return;
        this.#lease?.release(); this.#lease = undefined; this.#error("Image unavailable or link expired.");
      };
      img.addEventListener("error", fail, { once: true });
      img.addEventListener("load", () => {
        if (epoch !== this.#epoch || !this.element.open) return;
        this.#stage.dataset.state = "ready"; this.#stage.removeAttribute("aria-busy"); this.#size.disabled = false;
      }, { once: true });
      img.src = lease.url; this.#stage.replaceChildren(img);
    } catch (error) {
      if (controller.signal.aborted || epoch !== this.#epoch || !this.element.open) return;
      this.#error(error instanceof Error ? error.message : "The image could not be loaded.");
    }
  }
  #error(message: string): void {
    this.#stage.dataset.state = "error"; this.#stage.removeAttribute("aria-busy"); this.#size.disabled = true;
    this.#stage.replaceChildren(element("p", { text: message }),
      element("button", { className: "kl-text-button", type: "button", text: "Retry", onClick: () => { void this.#load(); } }));
  }
}
