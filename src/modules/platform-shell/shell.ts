import { element } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import { PLATFORM_AREAS, PLATFORM_DESTINATIONS, platformAreaHidden, platformDestination, visiblePlatformDestinations, type PlatformArea, type PlatformNavigationState, type PlatformRoute } from "./navigation";

/** Navigation only: all content and writes remain owned by the existing addon services. */
export class PlatformShell {
  readonly primary = element("nav", { className: "kl-platform-rail", ariaLabel: "KikiLink areas" });
  readonly secondary = element("nav", { className: "kl-platform-context", ariaLabel: "Home sections" });
  readonly #title = element("h2", { className: "kl-platform-context-title", text: "Home" });
  readonly #links = element("div", { className: "kl-platform-links" });
  readonly brand = element("button", { className: "kl-platform-brand", type: "button", ariaLabel: "KikiLink home" });
  readonly options = element("button", { className: "kl-platform-options", type: "button", ariaLabel: "Home options" }, kikiIcon("more"));
  readonly #connection = element("button", { className: "kl-platform-connection", type: "button" });
  readonly #primaryButtons = new Map<PlatformArea, HTMLButtonElement>();
  readonly #routeButtons = new Map<PlatformRoute, HTMLButtonElement>();
  readonly #lastRoutes = new Map<PlatformArea, PlatformRoute>();
  readonly #resizeObserver: ResizeObserver | undefined;
  #workshopNavigation: HTMLElement | undefined;
  #settingsNavigation: HTMLElement | undefined;
  #destroyed = false;
  #state: PlatformNavigationState = { route: "home", hiddenTabs: [], activitiesEnabled: true, hasCloud: false };
  #activeSection: PlatformRoute = "home";

  constructor(private readonly activate: (route: PlatformRoute) => void,
    options?: { openOptions: (anchor: HTMLButtonElement) => void; openConnection: () => void; openProfile?: (anchor: HTMLButtonElement) => void }) {
    this.brand.addEventListener("click", () => this.activate(visiblePlatformDestinations(this.#state).some(route => route.id === "feed") ? "feed" : "home"));
    this.primary.append(this.brand);
    this.options.setAttribute("aria-haspopup", "menu"); this.options.setAttribute("aria-expanded", "false");
    this.options.addEventListener("click", () => options?.openOptions(this.options));
    this.#connection.addEventListener("click", () => options?.openConnection());
    for (const area of PLATFORM_AREAS) {
      const button = element("button", { className: "kl-platform-area", type: "button", title: area.label,
        ariaLabel: area.label, onClick: () => {
          if (area.id === "you" && options?.openProfile) { options.openProfile(button); return; }
          const available = visiblePlatformDestinations(this.#state).filter(item => item.area === area.id && !item.action);
          const remembered = this.#lastRoutes.get(area.id);
          const route = available.find(item => item.id === remembered) ?? available[0];
          if (area.id === "you" && !remembered) {
            this.sync({ ...this.#state, route: "profile" });
            this.activate("profile");
          }
          else if (route) this.activate(route.id);
        } }, kikiIcon(area.icon), element("span", { className: "kl-platform-area-label", text: area.label }));
      button.dataset.area = area.id;
      if (area.id === "you" && options?.openProfile) button.setAttribute("aria-haspopup", "dialog");
      this.#primaryButtons.set(area.id, button);
      this.primary.append(button);
    }
    for (const route of PLATFORM_DESTINATIONS) {
      const button = element("button", { className: "kl-platform-link", type: "button", title: route.label,
        onClick: () => this.activate(route.id) }, kikiIcon(route.icon), element("span", { text: route.label }));
      button.dataset.route = route.id;
      if (route.action && route.id !== "find-people" && route.id !== "owner-view") button.setAttribute("aria-haspopup", "dialog");
      this.#routeButtons.set(route.id, button);
      this.#links.append(button);
    }
    this.secondary.append(element("div", { className: "kl-platform-wordmark" }, element("strong", { text: "KikiLink" }), element("span", { text: "2.0" })),
      element("div", { className: "kl-platform-context-heading" }, this.#title, this.options), this.#links, this.#connection);
    this.#bindArrowNavigation(this.primary, ".kl-platform-area");
    this.#bindArrowNavigation(this.secondary, ".kl-platform-link");
    this.#links.addEventListener("focusin", event => {
      if (this.secondary.dataset.area === "home" && this.#links.scrollWidth > this.#links.clientWidth &&
          event.target instanceof HTMLButtonElement) {
        event.target.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      }
    });
    // Unread badges arrive after mount and change item widths without resizing the strip.
    this.#resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => this.#revealActive());
    this.#resizeObserver?.observe(this.#links);
    for (const button of this.#routeButtons.values()) this.#resizeObserver?.observe(button);
  }

  sync(state: PlatformNavigationState): void {
    state = { ...state, route: platformDestination(state.route).id };
    this.#state = state;
    const destination = platformDestination(state.route);
    const visible = visiblePlatformDestinations(state);
    const visibleIds = new Set(visible.map(item => item.id));
    const hasPeople = visibleIds.has("people");
    this.#activeSection = hasPeople && (state.route === "matching" || state.route === "requests") ? "people" : state.route;
    this.#lastRoutes.set(destination.area, state.route);
    this.#title.textContent = PLATFORM_AREAS.find(area => area.id === destination.area)!.label;
    this.secondary.dataset.area = destination.area;
    this.secondary.setAttribute("aria-label", `${this.#title.textContent} sections`);
    this.options.setAttribute("aria-label", `${state.route === "feed" ? "Feed" : this.#title.textContent} options`);
    const settings = destination.area === "settings" && !!this.#settingsNavigation;
    this.secondary.hidden = destination.area === "settings" && !settings;
    const workshop = destination.area === "create" && !!this.#workshopNavigation;
    this.#links.hidden = workshop || settings;
    if (this.#workshopNavigation) this.#workshopNavigation.hidden = !workshop;
    if (this.#settingsNavigation) this.#settingsNavigation.hidden = !settings;
    for (const [area, button] of this.#primaryButtons) {
      button.hidden = platformAreaHidden(area, state.hiddenTabs) || !visible.some(item => item.area === area && !item.action);
      if (area === destination.area) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    for (const [route, button] of this.#routeButtons) {
      const insidePeople = hasPeople && (route === "matching" || route === "requests");
      button.hidden = insidePeople || !visibleIds.has(route) || platformDestination(route).area !== destination.area;
      if (route === this.#activeSection) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    this.#revealActive();
    // Initial sync can run before the shell is attached. Measure again after mount,
    // using layout coordinates rather than the panel's animated screen coordinates.
    queueMicrotask(() => this.#revealActive());
  }

  #revealActive(): void {
    if (this.#destroyed) return;
    const links = this.#workshopNavigation && !this.#workshopNavigation.hidden ? this.#workshopNavigation : this.#links;
    const active = links === this.#workshopNavigation ? links.querySelector<HTMLElement>('[aria-current="page"]') : this.#routeButtons.get(this.#activeSection);
    if (active && links.scrollWidth > links.clientWidth && links.clientWidth > 0) {
      const left = active.offsetLeft, right = left + active.offsetWidth;
      if (right > links.scrollLeft + links.clientWidth) links.scrollLeft = right - links.clientWidth + 8;
      else if (left < links.scrollLeft) links.scrollLeft = left - 8;
    }
  }

  destroy(): void { this.#destroyed = true; this.#resizeObserver?.disconnect(); }

  get sectionTitle(): string { return this.#title.textContent ?? "Home"; }
  attachCommunities(node: HTMLElement): void { this.#connection.before(node); }
  attachWorkshop(node: HTMLElement): void {
    this.#workshopNavigation = node;
    node.classList.add("kl-platform-links");
    this.#links.after(node);
    this.#resizeObserver?.observe(node);
    node.addEventListener("click", () => queueMicrotask(() => this.#revealActive()));
    this.sync(this.#state);
  }
  attachSettings(node: HTMLElement): void {
    this.#settingsNavigation = node;
    this.#links.after(node);
    this.sync(this.#state);
  }
  get sections() { return visiblePlatformDestinations(this.#state).filter(item => item.area === platformDestination(this.#state.route).area); }
  setConnection(label: string, connected: boolean): void {
    this.#connection.textContent = label; this.#connection.title = `${label} · Cloud & sessions`;
    this.#connection.dataset.connected = String(connected);
  }

  /** Reuse the existing unread counters instead of inventing a second badge source. */
  attachBadge(route: PlatformRoute, badge: HTMLElement): void { this.#routeButtons.get(route)?.append(badge); }
  attachAreaBadge(area: PlatformArea, badge: HTMLElement): void { this.#primaryButtons.get(area)?.append(badge); }

  #bindArrowNavigation(root: HTMLElement, selector: string): void {
    root.addEventListener("keydown", event => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = [...root.querySelectorAll<HTMLButtonElement>(selector)].filter(button => !button.closest("[hidden]") && !button.disabled && getComputedStyle(button).display !== "none" && getComputedStyle(button).visibility !== "hidden");
      const current = buttons.indexOf(event.target as HTMLButtonElement);
      if (current < 0 || !buttons.length) return;
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
        (current + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
      event.preventDefault(); event.stopPropagation(); buttons[next]?.focus();
    });
  }
}
