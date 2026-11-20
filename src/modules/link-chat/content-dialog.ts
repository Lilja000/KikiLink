import { element, focusedElement } from "../../utils/dom";
import { kikiIcon } from "./icons";

/** Standard KikiLink modal shell for details and full-size media. */
export class ContentDialog {
  readonly element = element("dialog", { className: "kl-dialog kl-content-dialog" });
  readonly body = element("div", { className: "kl-dialog-body" });
  readonly #title = element("div", { className: "kl-dialog-title" });
  #returnFocus: HTMLElement | undefined;
  #cleanup: (() => void) | undefined;
  #dismiss: (() => void) | undefined;
  constructor() {
    this.#title.id = `kl-content-${crypto.randomUUID()}`; this.element.setAttribute("aria-labelledby", this.#title.id);
    const close = element("button", { type: "button", className: "kl-icon-button", ariaLabel: "Close details", onClick: () => this.#requestClose() }, kikiIcon("close"));
    this.element.append(element("header", { className: "kl-dialog-header" }, this.#title, close), this.body);
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.#requestClose(); });
    this.element.addEventListener("click", event => { if (event.target === this.element) this.#requestClose(); });
    this.element.addEventListener("close", () => this.#finishClose());
  }
  #requestClose(): void {
    if (this.#dismiss) this.#dismiss();
    else this.close();
  }
  show(title: string, content: Node, cleanup?: () => void, dismiss?: () => void, origin?: HTMLElement): void {
    if (!this.element.open) this.#returnFocus = origin ?? focusedElement(this.element);
    this.#cleanup?.();
    this.#cleanup = cleanup;
    this.#dismiss = dismiss;
    this.#title.textContent = title; this.body.replaceChildren(content);
    if (!this.element.open) this.element.showModal();
  }
  setTitle(title: string): void { this.#title.textContent = title; }
  close(): void {
    if (!this.element.open) return;
    this.element.close();
    this.#finishClose();
  }
  #finishClose(): void {
    // A native close event can arrive after this dialog has already reopened.
    if (this.element.open) return;
    const cleanup = this.#cleanup;
    const origin = this.#returnFocus;
    this.#cleanup = undefined;
    this.#dismiss = undefined;
    this.#returnFocus = undefined;
    cleanup?.();
    if (this.element.open) return;
    this.body.replaceChildren();
    if (origin?.isConnected) origin.focus({ preventScroll: true });
  }
  destroy(): void { this.#dismiss = undefined; this.#returnFocus = undefined; this.#cleanup?.(); this.#cleanup = undefined; this.element.remove(); }
}
