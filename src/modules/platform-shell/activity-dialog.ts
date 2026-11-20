import { element, focusedElement } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import { fitPanelDialog } from "./panel-dialog-layout";

/** Retains the real activity form while its sections are switched or the sheet is closed. */
export class ActivityEditorDialog {
  readonly element = element("dialog", { className: "kl-dialog kl-activity-dialog" });
  readonly #tabs = element("div", { className: "kl-activity-tabs" });
  readonly #panels: HTMLElement[] = [];
  #returnFocus: HTMLElement | undefined;
  constructor(title: string, sections: Array<{ name: string; content: HTMLElement }>, footer: HTMLElement, onClose: () => void) {
    const heading = element("h2", { className: "kl-dialog-title", text: title });
    heading.id = `kl-activity-title-${crypto.randomUUID()}`;
    this.element.setAttribute("aria-labelledby", heading.id);
    const close = element("button", { className: "kl-icon-button", type: "button", ariaLabel: "Close activity editor", title: "Keep draft and close", onClick: () => this.close() }, kikiIcon("close"));
    this.#tabs.setAttribute("role", "tablist"); this.#tabs.setAttribute("aria-label", "Activity editor sections");
    const body = element("div", { className: "kl-activity-dialog-body" });
    sections.forEach(({ name, content }, index) => {
      const tab = element("button", { className: "kl-activity-tab", type: "button", text: name, onClick: () => this.select(index) });
      tab.id = `${heading.id}-tab-${index}`; tab.setAttribute("role", "tab");
      content.id = `${heading.id}-panel-${index}`; content.setAttribute("role", "tabpanel");
      content.setAttribute("aria-labelledby", tab.id); content.classList.add("kl-activity-tab-panel");
      tab.setAttribute("aria-controls", content.id); this.#tabs.append(tab); this.#panels.push(content); body.append(content);
      tab.addEventListener("keydown", event => {
        const last = sections.length - 1;
        const next = event.key === "ArrowRight" ? (index + 1) % sections.length : event.key === "ArrowLeft" ? (index + last) % sections.length : event.key === "Home" ? 0 : event.key === "End" ? last : undefined;
        if (next === undefined) return; event.preventDefault(); this.select(next); (this.#tabs.children[next] as HTMLButtonElement).focus();
      });
    });
    this.element.append(element("header", { className: "kl-dialog-header" }, heading, close), this.#tabs, body, footer);
    this.element.addEventListener("keydown", event => event.stopPropagation());
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
    this.element.addEventListener("close", () => { onClose(); if (this.#returnFocus?.isConnected) this.#returnFocus.focus({ preventScroll: true }); this.#returnFocus = undefined; });
    this.select(0);
  }
  select(index: number): void {
    this.#panels.forEach((panel, i) => { panel.hidden = i !== index; const tab = this.#tabs.children[i] as HTMLButtonElement;
      tab.tabIndex = i === index ? 0 : -1; tab.setAttribute("aria-selected", String(i === index)); });
  }
  reveal(control: HTMLElement): void {
    const index = this.#panels.findIndex(panel => panel.contains(control)); if (index >= 0) this.select(index);
    control.focus(); control.scrollIntoView?.({ block: "nearest" });
  }
  show(): void {
    if (this.element.open) return;
    this.#returnFocus = focusedElement(this.element);
    this.element.showModal();
    fitPanelDialog(this.element);
  }
  close(): void { if (this.element.open) this.element.close(); }
  destroy(): void { this.#returnFocus = undefined; this.close(); this.element.remove(); }
}
