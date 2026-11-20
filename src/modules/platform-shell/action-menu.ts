import { element } from "../../utils/dom";
import { anchorSurface } from "../../utils/anchored-surface";
import { kikiIcon, type KikiLinkIconName } from "../link-chat/icons";

export interface ShellAction {
  label: string;
  icon?: KikiLinkIconName;
  run: () => void;
  separator?: boolean;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  emojiArt?: string;
  quickAction?: boolean;
}

let exploreMenuId = 0;

/** One top-layer menu for the shell. It never owns application data or permissions. */
export class ShellActionMenu {
  readonly element = element("dialog", { className: "kl-shell-menu" });
  #anchor: HTMLElement | undefined;
  #destroyed = false;
  #query = "";
  #typedAt = 0;
  #scrollRoot: Node | undefined;
  #anchorRect: DOMRect | undefined;
  readonly #resize = () => this.close();
  readonly #scroll = (event: Event) => {
    if (!this.#anchor || !this.#anchorRect || event.target instanceof Node && this.element.contains(event.target)) return;
    const rect = this.#anchor.getBoundingClientRect();
    if (!this.#anchor.isConnected || Math.abs(rect.x - this.#anchorRect.x) > 1 || Math.abs(rect.y - this.#anchorRect.y) > 1) this.close();
  };

  constructor(private readonly variant?: "explore") {
    this.element.id = variant === "explore" ? `kl-explore-action-menu-${++exploreMenuId}` : "kl-shell-menu";
    if (variant === "explore") this.element.classList.add("kl-explore-action-menu");
    this.element.setAttribute("role", "menu");
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
    this.element.addEventListener("keydown", event => {
      // The surrounding addon and the native game must not consume menu keys.
      event.stopPropagation();
      const buttons = [...this.element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const current = buttons.indexOf(this.element.getRootNode() instanceof ShadowRoot
        ? (this.element.getRootNode() as ShadowRoot).activeElement as HTMLButtonElement
        : document.activeElement as HTMLButtonElement);
      if (event.key === "Escape" || event.key === "Tab") {
        if (event.key === "Escape") event.preventDefault();
        // Closing first lets native Tab navigation continue from the trigger.
        this.close(); return;
      }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
          (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[index]?.focus(); return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== " ") {
        event.preventDefault();
        this.#query = (Date.now() - this.#typedAt > 700 ? "" : this.#query) + event.key.toLocaleLowerCase();
        this.#typedAt = Date.now();
        const ordered = [...buttons.slice(current + 1), ...buttons.slice(0, current + 1)];
        ordered.find(button => button.textContent?.trim().toLocaleLowerCase().startsWith(this.#query))?.focus();
      }
    });
    this.element.addEventListener("click", event => {
      if (event.target !== this.element) return;
      const r = this.element.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) this.close();
    });
  }

  open(anchor: HTMLElement, title: string, actions: readonly ShellAction[], detail?: string, compact = false, showHeading: boolean | string = !compact): void {
    if (this.#destroyed) return;
    if (this.element.open && this.#anchor === anchor) { this.close(); return; }
    this.close(false);
    this.#anchor = anchor; this.#query = "";
    anchor.setAttribute("aria-controls", this.element.id);
    anchor.setAttribute("aria-expanded", "true");
    this.element.setAttribute("aria-label", title);
    this.element.classList.toggle("kl-chat-options-menu", compact);
    this.element.replaceChildren();
    if (showHeading) {
      const heading = element("div", { className: "kl-shell-menu-heading" }, element("strong", { text: typeof showHeading === "string" ? showHeading : title }));
      if (detail) heading.append(element("small", { text: detail }));
      this.element.append(heading);
    }
    const emojiGrid = element("div", { className: "kl-chat-emoji-grid", ariaLabel: "Emoji" });
    emojiGrid.setAttribute("role", "group");
    const quickActions = element("div", { className: "kl-chat-menu-quick-actions", ariaLabel: "Quick actions" },
      element("span", { className: "kl-chat-menu-quick-label", text: "Quick actions" }));
    quickActions.setAttribute("role", "group");
    for (const action of actions) {
      if (action.separator) { const line = element("div", { className: "kl-shell-menu-separator" }); line.setAttribute("role", "separator"); this.element.append(line); }
      const button = element("button", { type: "button", className: "kl-shell-menu-item", onClick: () => {
        if (!this.element.open || !this.element.contains(button) || button.disabled) return;
        this.close(); action.run();
      } }, action.icon ? kikiIcon(action.icon) : null, element("span", { text: action.label }));
      button.disabled = !!action.disabled;
      if (action.danger) button.dataset.danger = "true";
      button.setAttribute("role", action.checked === undefined ? "menuitem" : compact ? "menuitemcheckbox" : "menuitemradio");
      if (action.checked !== undefined) button.setAttribute('aria-checked', String(action.checked));
      if (action.emojiArt) {
        if (!emojiGrid.parentElement) this.element.append(emojiGrid);
        button.setAttribute("aria-label", `Insert ${action.label}`);
        const image = element("img", { src: action.emojiArt, alt: "" });
        image.draggable = false;
        button.replaceChildren(element("span", { className: "kl-sr-only", text: action.label }), image);
        emojiGrid.append(button);
      } else if (action.quickAction) {
        if (!quickActions.parentElement) this.element.append(quickActions);
        quickActions.append(button);
      } else this.element.append(button);
    }
    this.element.showModal();
    anchorSurface(this.element, anchor, anchor.closest(".kl-panel")?.getBoundingClientRect());
    if (this.variant === "explore") {
      this.#anchorRect = anchor.getBoundingClientRect();
      this.#scrollRoot = anchor.getRootNode();
      this.#scrollRoot.addEventListener("scroll", this.#scroll, true);
    }
    window.addEventListener("resize", this.#resize);
    window.visualViewport?.addEventListener("resize", this.#resize);
    window.visualViewport?.addEventListener("scroll", this.#resize);
    this.element.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }

  close(restoreFocus = true): void {
    window.removeEventListener("resize", this.#resize);
    window.visualViewport?.removeEventListener("resize", this.#resize);
    window.visualViewport?.removeEventListener("scroll", this.#resize);
    this.#scrollRoot?.removeEventListener("scroll", this.#scroll, true);
    this.#scrollRoot = undefined;
    this.#anchorRect = undefined;
    if (!this.element.open) return;
    this.element.close();
    const anchor = this.#anchor; this.#anchor = undefined;
    anchor?.setAttribute("aria-expanded", "false");
    if (restoreFocus && !this.#destroyed && anchor?.isConnected) anchor.focus({ preventScroll: true });
  }
  destroy(): void { this.#destroyed = true; this.close(false); this.element.remove(); }
}
