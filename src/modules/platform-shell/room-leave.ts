import type { BCAdapter, BCRoomAdminSnapshot, BCRoomLeaveState, BCRoomLeaveTarget } from "../../bc/adapter";
import { element, focusedElement } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import { fitPanelDialog } from "./panel-dialog-layout";

/** A reviewed native action; closing the sheet never calls or cancels BC's leave command. */
export class RoomLeaveAction {
  readonly button = element("button", { className: "kl-text-button kl-room-leave-button", type: "button", text: "Leave room", onClick: () => this.show() });
  readonly status = element("p", { className: "kl-room-leave-status" });
  readonly dialog = element("dialog", { className: "kl-dialog kl-room-leave-dialog" });
  readonly #description = element("p");
  readonly #feedback = element("p", { className: "kl-room-leave-status" });
  readonly #confirm = element("button", { className: "kl-text-button kl-text-button--primary", type: "button", text: "Leave room", onClick: () => { void this.#leave(); } });
  readonly #cancel = element("button", { className: "kl-text-button", type: "button", text: "Cancel", onClick: () => this.close() });
  #current: BCRoomLeaveTarget | undefined;
  #reviewed: BCRoomLeaveTarget | undefined;
  #native: BCRoomLeaveState = { status: "outside" };
  #returnFocus: HTMLElement | undefined;
  #busy = false;
  #destroyed = false;
  #error = "";

  constructor(private readonly adapter: BCAdapter, private readonly settled: (left: boolean) => void) {
    const id = `kl-room-leave-${crypto.randomUUID()}`;
    const title = element("h2", { text: "Leave room?" }); title.id = id;
    this.#description.id = `${id}-description`;
    this.dialog.setAttribute("aria-labelledby", id);
    this.dialog.setAttribute("aria-describedby", this.#description.id);
    for (const node of [this.status, this.#feedback]) { node.setAttribute("role", "status"); node.setAttribute("aria-live", "polite"); }
    this.dialog.append(element("header", { className: "kl-dialog-header" }, element("div", { className: "kl-room-leave-heading" },
      element("span", { text: "KikiLink" }), title),
      element("button", { className: "kl-icon-button", type: "button", ariaLabel: "Close leave room", onClick: () => this.close() }, kikiIcon("close"))),
      element("div", { className: "kl-room-leave-body" }, this.#description, this.#feedback),
      element("footer", { className: "kl-room-leave-footer" }, this.#cancel, this.#confirm));
    this.dialog.addEventListener("keydown", event => { if (event.key === "Escape") event.stopPropagation(); });
    this.dialog.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
    this.dialog.addEventListener("close", () => {
      if (this.dialog.open) return;
      if (this.#returnFocus?.isConnected && !this.#returnFocus.closest("[hidden]")) this.#returnFocus.focus({ preventScroll: true });
      this.#returnFocus = undefined;
    });
  }

  update(snapshot?: BCRoomAdminSnapshot, unavailable = false): void {
    const current = snapshot ? { name: snapshot.roomName, space: snapshot.settings.space, memberNumber: this.adapter.getOwnMemberNumber() } : undefined;
    if (!this.#busy && JSON.stringify(current) !== JSON.stringify(this.#current)) this.#error = "";
    this.#current = current;
    try { this.#native = unavailable ? { status: "unavailable", message: "The current room could not be verified. Refresh to try again." }
      : this.adapter.getRoomLeaveState?.() ?? { status: "unavailable", message: "The native leave controls are unavailable. Use Back to game." }; }
    catch { this.#native = { status: "unavailable", message: "The current room could not be verified. Refresh to try again." }; }
    this.#render();
  }

  show(trigger?: HTMLElement, showRoomName = true): void {
    if (this.#destroyed || this.button.disabled || !this.#current) return;
    if (this.dialog.open) return;
    this.#reviewed = { ...this.#current };
    this.#error = "";
    this.#description.textContent = showRoomName ? `Leave “${this.#reviewed.name}”?` : "Leave your current Bondage Club room?";
    this.#render();
    this.#returnFocus = trigger ?? focusedElement(this.dialog);
    this.dialog.showModal();
    fitPanelDialog(this.dialog);
    this.#cancel.focus();
  }

  close(): void {
    if (this.dialog.open) {
      this.dialog.close();
      this.#description.textContent = "";
    }
  }
  destroy(): void { this.#destroyed = true; this.#returnFocus = undefined; this.close(); this.dialog.remove(); }

  #render(): void {
    const pending = this.#busy || this.#native.status === "leaving";
    const changed = Boolean(this.#reviewed && JSON.stringify(this.#reviewed) !== JSON.stringify(this.#current));
    this.button.textContent = pending ? "Leaving…" : "Leave room";
    this.button.disabled = !this.#current || this.#busy || this.#native.status !== "ready";
    this.button.title = this.#native.message ?? "Leave the current Bondage Club room";
    this.#confirm.disabled = changed || !this.#current || this.#busy || this.#native.status !== "ready";
    this.#confirm.textContent = this.#busy ? "Leaving…" : "Leave room";
    this.#cancel.textContent = this.#busy ? "Close" : "Cancel";
    this.dialog.setAttribute("aria-busy", String(this.#busy));
    const message = this.#busy ? "Waiting for Bondage Club to finish leaving…" : this.#error || this.#native.message || "";
    this.status.textContent = message; this.status.hidden = !message;
    this.status.dataset.state = this.#error ? "error" : this.#native.status;
    this.#feedback.textContent = !this.#busy && changed ? "The room or account changed. Close this window and review the current room." : message;
    this.#feedback.hidden = !this.#feedback.textContent;
    this.#feedback.dataset.state = this.#error || changed ? "error" : this.#native.status;
  }

  async #leave(): Promise<void> {
    if (this.#destroyed || this.#busy || this.#confirm.disabled || !this.#reviewed) return;
    this.#busy = true; this.#error = ""; this.#render();
    let left = false;
    try {
      await this.adapter.leaveRoom(this.#reviewed);
      if (this.#destroyed) return;
      left = true;
      // Completion may arrive after the user has closed the sheet and chosen another page.
      this.close();
    } catch (error) {
      if (this.#destroyed) return;
      this.#error = error instanceof Error ? error.message : "Could not leave this room. Try again.";
    } finally {
      this.#busy = false;
      if (!this.#destroyed) { this.settled(left); this.#render(); }
    }
  }
}
