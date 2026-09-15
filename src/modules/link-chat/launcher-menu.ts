import type { SettingsStore } from "../../core/settings";
import { element } from "../../utils/dom";
import { kikiIcon } from "./icons";

export function notificationsAreMuted(until: number, now = Date.now()): boolean {
  return until === -1 || until > now;
}

/** The launcher owns the gesture; this small dialog owns its accessible controls and focus. */
export class LauncherMenu {
  readonly element = document.createElement("dialog");
  #anchor: HTMLElement | undefined;
  #destroyed = false;
  #reading = false;
  #muteTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly settings: SettingsStore,
    private readonly markAllRead: () => Promise<void>,
    private readonly isDoNotDisturb: () => boolean = () => false,
  ) {
    this.element.className = "kl-launcher-menu";
    this.element.setAttribute("aria-label", "KikiLink quick actions");
    this.element.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
    this.element.addEventListener("click", (event) => {
      if (event.target !== this.element) return;
      const rect = this.element.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) this.close();
    });
  }

  open(anchor: HTMLElement): void {
    if (this.#destroyed) return;
    this.#anchor = anchor;
    this.#render();
    if (!this.element.open) {
      try { this.element.showModal(); } catch { this.element.setAttribute("open", ""); }
    }
    const rect = anchor.getBoundingClientRect();
    const width = this.element.offsetWidth || 284;
    const height = this.element.offsetHeight || 300;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = Math.max(8, Math.min(
      rect.top >= height + 16 ? rect.top - height - 10 : rect.bottom + 10,
      window.innerHeight - height - 8,
    ));
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
    this.element.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }

  close(restoreFocus = true): void {
    clearTimeout(this.#muteTimer);
    if (!this.element.open) return;
    try { this.element.close(); } catch { this.element.removeAttribute("open"); }
    if (restoreFocus && !this.#destroyed) this.#anchor?.focus({ preventScroll: true });
  }

  destroy(): void {
    this.#destroyed = true;
    this.close(false);
    this.element.remove();
    this.#anchor = undefined;
  }

  #render(): void {
    const ui = this.settings.getSection("ui");
    const heading = element("div", { className: "kl-launcher-menu-heading" },
      element("strong", { text: "Quick actions" }),
      element("button", { className: "kl-icon-button", type: "button", ariaLabel: "Close quick actions", onClick: () => this.close() }, kikiIcon("close")),
    );
    const feedback = element("p", { className: "kl-launcher-menu-feedback" });
    feedback.setAttribute("role", "status");
    const read = element("button", {
      className: "kl-launcher-read-all", type: "button", text: "Mark all as read",
      onClick: () => {
        if (this.#reading) return;
        this.#reading = true;
        read.disabled = true;
        void this.markAllRead().then(() => {
          if (this.#destroyed) return;
          feedback.textContent = "All chats marked as read.";
        }).catch(() => {
          if (!this.#destroyed) feedback.textContent = "Some chats could not be marked as read. Please retry.";
        }).finally(() => {
          this.#reading = false;
          read.disabled = false;
        });
      },
    });
    read.prepend(kikiIcon("check"));
    read.disabled = this.#reading;
    const notificationStatus = element("p", { className: "kl-launcher-mute-status" });
    notificationStatus.setAttribute("role", "status");
    const muteOptions = element("div", { className: "kl-launcher-mute-options" });
    const resume = element("button", {
      className: "kl-text-button kl-launcher-unmute", type: "button", text: "Unmute notifications",
      onClick: () => {
        this.settings.update((draft) => { draft.ui.notificationsMutedUntil = 0; });
        describeMute(); muteOptions.querySelector<HTMLButtonElement>("button")?.focus();
      },
    });
    const describeMute = (): void => {
      const until = this.settings.getSection("ui").notificationsMutedUntil;
      const muted = notificationsAreMuted(until);
      notificationStatus.textContent = muted
        ? until === -1 ? "Muted until you unmute" : `Muted until ${new Date(until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : this.isDoNotDisturb() ? "Paused by Do Not Disturb" : "Notifications on";
      muteOptions.hidden = muted;
      resume.hidden = !muted;
      clearTimeout(this.#muteTimer);
      if (muted && until !== -1) this.#muteTimer = setTimeout(describeMute, Math.min(2147483647, Math.max(1, until - Date.now() + 20)));
    };
    describeMute();
    for (const [label, minutes] of [["1 hour", 60], ["8 hours", 480], ["Until I unmute", -1]] as const) {
      muteOptions.append(element("button", {
        className: "kl-text-button", type: "button", text: label,
        ariaLabel: minutes === -1 ? "Mute until I unmute" : `Mute for ${label}`,
        onClick: () => {
          this.settings.update((draft) => { draft.ui.notificationsMutedUntil = minutes === -1 ? -1 : Date.now() + minutes * 60_000; });
          describeMute(); resume.focus();
        },
      }));
    }
    const size = document.createElement("input");
    size.type = "range";
    size.min = "40";
    size.max = "88";
    size.step = "2";
    size.value = String(ui.launcherSize);
    size.setAttribute("aria-label", "Pop-up icon size");
    const output = element("output", { text: `${ui.launcherSize} px` });
    size.addEventListener("input", () => {
      const value = Number(size.value);
      output.textContent = `${value} px`;
      this.settings.update((draft) => { draft.ui.launcherSize = value; });
    });
    this.element.replaceChildren(heading, read,
      element("div", { className: "kl-launcher-menu-section" },
        element("strong", { text: "Notifications" }), notificationStatus, muteOptions, resume),
      element("label", { className: "kl-launcher-menu-section kl-launcher-size" },
        element("span", { text: "Pop-up icon size" }), output, size),
      feedback,
    );
  }
}
