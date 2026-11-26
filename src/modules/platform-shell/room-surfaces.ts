import { onDialogBackdropClick } from "../../utils/dialog-backdrop";
import type { BCRoomAdminPlayer, BCRoomAdminSnapshot } from "../../bc/adapter";
import { element, focusedElement } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import { fitPanelDialog } from "./panel-dialog-layout";

export type RoomSettingsTab = "settings" | "media" | "people";

/** Retains the actual editors, including unsaved inputs, while the sheet is closed. */
export class RoomSettingsDialog {
  readonly element = element("dialog", { className: "kl-dialog kl-room-settings-dialog" });
  readonly #tabs = new Map<RoomSettingsTab, HTMLButtonElement>();
  readonly #panels = new Map<RoomSettingsTab, HTMLElement>();
  #returnFocus: HTMLElement | undefined;
  constructor(status: HTMLElement, settings: HTMLElement, media: HTMLElement, people: HTMLElement) {
    const id = `kl-room-settings-${crypto.randomUUID()}`;
    const title = element("h2", { text: "Room settings" }); title.id = id;
    this.element.setAttribute("aria-labelledby", id);
    const tabs = element("div", { className: "kl-room-settings-tabs" });
    tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", "Room settings sections");
    const body = element("div", { className: "kl-room-settings-body" });
    for (const [key, label, content] of [["settings", "Settings", settings], ["media", "Media", media], ["people", "People & roles", people]] as const) {
      const button = element("button", { className: "kl-room-settings-tab", type: "button", text: label, onClick: () => this.select(key) });
      button.id = `${id}-${key}-tab`; button.setAttribute("role", "tab"); button.setAttribute("aria-controls", `${id}-${key}`);
      const panel = element("section", { className: "kl-room-settings-panel" }, content);
      panel.id = `${id}-${key}`; panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", button.id);
      this.#tabs.set(key, button); this.#panels.set(key, panel); tabs.append(button); body.append(panel);
      button.addEventListener("keydown", event => {
        const keys = [...this.#tabs.keys()], index = keys.indexOf(key);
        const next = event.key === "Home" ? 0 : event.key === "End" ? keys.length - 1
          : event.key === "ArrowRight" ? (index + 1) % keys.length : event.key === "ArrowLeft" ? (index + keys.length - 1) % keys.length : -1;
        if (next < 0) return;
        event.preventDefault(); this.select(keys[next]!); this.#tabs.get(keys[next]!)?.focus();
      });
    }
    this.element.append(element("header", { className: "kl-dialog-header" }, title,
      element("button", { className: "kl-icon-button", type: "button", ariaLabel: "Close room settings", onClick: () => this.close() }, kikiIcon("close"))), status, tabs, body);
    this.element.addEventListener("keydown", event => { if (event.key === "Escape") event.stopPropagation(); });
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
    onDialogBackdropClick(this.element, () => this.close());
    this.element.addEventListener("close", () => {
      // A queued close event must not move focus out of an already reopened sheet.
      if (this.element.open) return;
      if (this.#returnFocus?.isConnected) this.#returnFocus.focus({ preventScroll: true });
      this.#returnFocus = undefined;
    });
    this.select("settings");
  }
  select(tab: RoomSettingsTab): void {
    for (const [key, button] of this.#tabs) {
      button.setAttribute("aria-selected", String(key === tab)); button.tabIndex = key === tab ? 0 : -1;
      this.#panels.get(key)!.hidden = key !== tab;
    }
  }
  show(tab: RoomSettingsTab = "settings"): void {
    this.select(tab);
    if (!this.element.open) {
      this.#returnFocus = focusedElement(this.element);
      this.element.showModal();
      fitPanelDialog(this.element);
    }
    this.#tabs.get(tab)?.focus();
  }
  close(): void { if (this.element.open) this.element.close(); }
  destroy(): void { this.#returnFocus = undefined; this.close(); this.element.remove(); }
}

/** Native room data only. Stable participant nodes avoid losing focus on refresh. */
export class RoomOverview {
  readonly element = element("div", { className: "kl-room-overview" });
  readonly #summary = element("section", { className: "kl-room-overview-card" });
  readonly #list = element("div", { className: "kl-room-overview-players" });
  readonly #playersHeading: HTMLElement;
  readonly #rows = new Map<number, { signature: string; node: HTMLElement }>();
  #signature = "";
  constructor(private readonly actions: { ownNumber: () => number; browse: () => void; refresh: () => void; settings: () => void; players: () => void;
    backToGame: () => void; player: (player: BCRoomAdminPlayer) => HTMLElement; leave: { button: HTMLButtonElement; status: HTMLElement } }) {
    this.#playersHeading = element("header", { className: "kl-room-players-heading" },
      element("h2", { text: "Players" }),
      element("button", { className: "kl-text-button", type: "button", text: "All players", onClick: actions.players }));
    this.#playersHeading.hidden = this.#list.hidden = true;
    this.element.append(this.#summary, this.#playersHeading, this.#list);
  }
  update(snapshot?: BCRoomAdminSnapshot, error = false): void {
    const signature = JSON.stringify(snapshot ? [snapshot.roomName, snapshot.isAdmin, snapshot.settings.description, snapshot.settings.language,
      snapshot.settings.limit, snapshot.settings.access, snapshot.settings.visibility, snapshot.players.length] : [error]);
    if (signature !== this.#signature) {
      this.#signature = signature;
      this.#summary.dataset.empty = String(!snapshot);
      if (!snapshot) this.#summary.replaceChildren(kikiIcon("activities"),
        element("h2", { text: error ? "Room unavailable" : "You’re not in a room" }),
        ...(error ? [this.actions.leave.status] : []),
        element("button", {
          className: "kl-text-button kl-text-button--primary", type: "button",
          text: error ? "Refresh" : "Browse rooms", onClick: error ? this.actions.refresh : this.actions.browse,
        }));
      else {
        const room = snapshot.settings;
        const locked = !room.access.includes("All"), privateRoom = !room.visibility.includes("All");
        this.#summary.replaceChildren(element("div", { className: "kl-room-overview-identity" },
          element("span", { className: "kl-room-overview-emblem" }, kikiIcon("door")),
          element("div", {}, element("h2", { text: snapshot.roomName }),
            element("div", { className: "kl-room-overview-meta" },
              element("span", { text: room.language || "—" }),
              element("span", { text: `${snapshot.players.length} / ${room.limit}`, ariaLabel: `${snapshot.players.length} of ${room.limit} places` }),
              element("span", { text: locked ? "Locked" : "Open" }),
              ...(privateRoom ? [element("span", { text: "Private" })] : [])))),
          ...(room.description ? [element("p", { className: "kl-room-overview-description", text: room.description })] : []),
          element("div", { className: "kl-room-overview-actions" },
            element("button", { className: "kl-text-button kl-text-button--primary", type: "button", text: "Back to game", onClick: this.actions.backToGame }),
            ...(snapshot.isAdmin ? [element("button", { className: "kl-text-button", type: "button", onClick: this.actions.settings },
              kikiIcon("settings"), "Room settings")] : []), this.actions.leave.button),
          this.actions.leave.status,
          ...(!snapshot.isAdmin ? [element("small", { className: "kl-room-media-note", text: "Room settings are managed by its administrators." })] : []));
      }
    }
    const players = snapshot?.players.filter(player => player.memberNumber !== this.actions.ownNumber()) ?? [];
    this.#playersHeading.hidden = !snapshot;
    this.#list.hidden = !snapshot;
    const live = new Set(players.map(player => player.memberNumber));
    for (const [member, row] of this.#rows) if (!live.has(member)) { row.node.remove(); this.#rows.delete(member); }
    for (const [index, player] of players.entries()) {
      const signature = JSON.stringify(player), previous = this.#rows.get(player.memberNumber);
      let node = previous?.node;
      if (!previous || previous.signature !== signature) {
        node = this.actions.player(player); previous?.node.replaceWith(node); this.#rows.set(player.memberNumber, { signature, node });
      }
      if (this.#list.children[index] !== node) this.#list.insertBefore(node!, this.#list.children[index] ?? null);
    }
    const empty = this.#list.querySelector(".kl-room-overview-empty");
    if (players.length || !snapshot) empty?.remove();
    else if (!empty) this.#list.append(element("p", { className: "kl-room-overview-empty", text: "No other players are in this room." }));
  }
}
