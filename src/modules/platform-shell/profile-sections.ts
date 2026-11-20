import { element } from "../../utils/dom";

/** Keep the existing editors mounted: switching sections must never reset a draft. */
export class ProfileSections {
  readonly element = element("div", { className: "kl-platform-profile-sections" });
  readonly tabs = element("nav", { className: "kl-platform-profile-tabs", ariaLabel: "Profile sections" });
  readonly #items: Array<{ id: string; button: HTMLButtonElement; panel: HTMLElement }> = [];
  constructor(sections: Array<{ id: string; label: string; content: HTMLElement[]; icon?: Node }>, readonly onSelect?: (id: string) => void,
    options: { namespace?: string; initial?: string } = {}) {
    this.tabs.setAttribute("role", "tablist");
    this.element.append(this.tabs);
    for (const section of sections) {
      const button = element("button", { type: "button" }, ...(section.icon ? [section.icon] : []), element("span", { text: section.label }));
      const panel = element("section", { className: "kl-platform-profile-section" }, ...section.content);
      button.id = `kl-${options.namespace ?? 'own-profile'}-tab-${section.id}`;
      panel.id = `kl-${options.namespace ?? 'own-profile'}-panel-${section.id}`;
      panel.dataset.profileSection = section.id;
      button.setAttribute("role", "tab"); button.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", button.id);
      button.addEventListener("click", () => this.select(section.id));
      button.addEventListener("keydown", event => {
        const index = this.#items.findIndex(item => item.button === button);
        const next = event.key === "ArrowRight" ? (index + 1) % this.#items.length
          : event.key === "ArrowLeft" ? (index + this.#items.length - 1) % this.#items.length
          : event.key === "Home" ? 0 : event.key === "End" ? this.#items.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault(); this.select(this.#items[next]!.id, true);
      });
      this.#items.push({ id: section.id, button, panel }); this.tabs.append(button); this.element.append(panel);
    }
    this.select(this.#items.some(item => item.id === options.initial) ? options.initial! : sections[0]?.id ?? "");
  }
  update(id: string, content: HTMLElement[]): void {
    this.#items.find(item => item.id === id)?.panel.replaceChildren(...content);
  }
  select(id: string, focus = false): void {
    if (!this.#items.some(item => item.id === id)) return;
    for (const item of this.#items) {
      const active = item.id === id;
      item.panel.hidden = !active; item.button.tabIndex = active ? 0 : -1;
      item.button.setAttribute("aria-selected", String(active));
      if (active && focus) item.button.focus({ preventScroll: true });
    }
    this.scrollActiveTabIntoView();
    this.onSelect?.(id);
  }
  scrollActiveTabIntoView(): void {
    if (this.tabs.scrollWidth <= this.tabs.clientWidth) return;
    const active = this.#items.find(item => !item.panel.hidden);
    if (!active) return;
    const strip = this.tabs.getBoundingClientRect(), tab = active.button.getBoundingClientRect();
    if (tab.left < strip.left) this.tabs.scrollLeft += tab.left - strip.left;
    else if (tab.right > strip.right) this.tabs.scrollLeft += tab.right - strip.right;
  }
  reveal(control: HTMLElement): void {
    const item = this.#items.find(item => item.panel.contains(control));
    if (!item) return;
    this.select(item.id);
    // Appearance has its own small tab set. Validation must reveal the real
    // field there as well, without recreating either editor or its draft.
    let ancestor: HTMLElement | null = control.parentElement;
    while (ancestor && ancestor !== item.panel) {
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
      if (ancestor.matches('[data-profile-section][hidden]')) {
        const panel = ancestor;
        const tab = [...(panel.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])]
          .find(button => button.getAttribute('aria-controls') === panel.id);
        tab?.click();
      }
      ancestor = ancestor.parentElement;
    }
  }
}
