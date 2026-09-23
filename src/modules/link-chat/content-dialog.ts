import { element, focusedElement } from "../../utils/dom";
import { kikiIcon } from "./icons";

/** Standard KikiLink modal shell for details and full-size media. */
export class ContentDialog {
  readonly element = element("dialog", { className: "kl-dialog kl-content-dialog" });
  readonly body = element("div", { className: "kl-dialog-body" });
  readonly #title = element("div", { className: "kl-dialog-title" });
  #returnFocus: HTMLElement | undefined;
  #cleanup: (() => void) | undefined;
  constructor() {
    this.#title.id = `kl-content-${crypto.randomUUID()}`; this.element.setAttribute("aria-labelledby", this.#title.id);
    const close = element("button", { type: "button", className: "kl-icon-button", ariaLabel: "Close details", onClick: () => this.close() }, kikiIcon("close"));
    this.element.append(element("header", { className: "kl-dialog-header" }, this.#title, close), this.body);
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
    this.element.addEventListener("click", event => { if (event.target === this.element) this.close(); });
    this.element.addEventListener("close", () => { this.#cleanup?.(); this.#cleanup = undefined; this.body.replaceChildren();
      if (this.#returnFocus?.isConnected) this.#returnFocus.focus({ preventScroll: true }); this.#returnFocus = undefined; });
  }
  show(title: string, content: Node, cleanup?: () => void): void {
    this.#cleanup?.(); this.#cleanup = cleanup; this.#returnFocus = focusedElement(this.element);
    this.#title.textContent = title; this.body.replaceChildren(content);
    if (!this.element.open) this.element.showModal();
  }
  close(): void { this.element.close(); }
  destroy(): void { this.#returnFocus = undefined; this.#cleanup?.(); this.#cleanup = undefined; this.element.remove(); }
}
