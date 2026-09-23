import { element } from "./dom";
import { anchorSurface } from "./group-list-menu";
import { kikiIcon } from "../modules/link-chat/icons";
import { countBadge, updateBadge } from "../modules/link-chat/badge";
import { renderRelationshipControls } from "./relationship-controls";
import type { CommunityService, MailItem } from "./community";
import { bindClockText } from "../core/time-format";

export class MailboxPopover {
  readonly button = element("button", { type: "button", className: "kl-icon-button kl-mailbox-trigger", title: "Mailbox", ariaLabel: "Mailbox" }, kikiIcon("notifications"));
  readonly element = element("dialog", { className: "kl-cloud-group-menu kl-mailbox-popover", ariaLabel: "Mailbox" });
  readonly #badge = countBadge();
  #unsubscribe: () => void;
  #loading = false;
  #closed = false;
  readonly #reposition = (): void => { if (this.element.open) anchorSurface(this.element, this.button); };
  constructor(readonly community: CommunityService, readonly options: { open(item: MailItem): void | Promise<void> }) {
    this.button.append(this.#badge); this.button.setAttribute("aria-haspopup", "dialog");
    this.button.addEventListener("click", () => { if (this.element.open) this.close(); else void this.open(); });
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
    this.element.addEventListener("click", event => { if (event.target === this.element) this.close(); });
    window.addEventListener("resize", this.#reposition);
    window.visualViewport?.addEventListener("resize", this.#reposition);
    window.visualViewport?.addEventListener("scroll", this.#reposition);
    this.#unsubscribe = community.subscribe(() => { updateBadge(this.#badge, community.mailbox.unread); if (this.element.open && !this.#loading) this.render(); });
  }
  async open(): Promise<void> {
    this.#loading = true; this.render(); this.element.showModal(); this.button.setAttribute("aria-expanded", "true"); anchorSurface(this.element, this.button);
    try { if (!this.community.supported) await this.community.start(); await this.community.refresh(); }
    catch { /* Render the shared error with an explicit retry. */ }
    finally { this.#loading = false; if (!this.#closed) this.render(); }
  }
  close(): void { this.element.close(); this.button.setAttribute("aria-expanded", "false"); if (this.button.isConnected) this.button.focus({ preventScroll: true }); }
  #action(label: string, work: () => void | Promise<void>): HTMLButtonElement {
    const button = element("button", { type: "button", className: "kl-text-button", text: label });
    button.addEventListener("click", () => {
      button.disabled = true;
      void Promise.resolve().then(work).catch(error => {
        const status = this.element.querySelector(".kl-mailbox-status");
        if (status) status.textContent = error instanceof Error ? error.message : "Could not complete the action. Retry.";
      }).finally(() => { button.disabled = false; });
    }); return button;
  }
  #iconAction(label: string, icon: "read-all" | "close", work: () => void | Promise<void>): HTMLButtonElement {
    const button = element("button", { type: "button", className: "kl-sidebar-new-chat kl-mailbox-icon-button", title: label, ariaLabel: label }, kikiIcon(icon));
    button.addEventListener("click", () => {
      button.disabled = true;
      void Promise.resolve().then(work).catch(error => {
        const status = this.element.querySelector(".kl-mailbox-status");
        if (status) status.textContent = error instanceof Error ? error.message : "Could not complete the action. Retry.";
      }).finally(() => { button.disabled = false; });
    });
    return button;
  }
  render(): void {
    const scroll = this.element.querySelector(".kl-mailbox-list")?.scrollTop ?? 0;
    const focused = (this.element.getRootNode() as ShadowRoot).activeElement as HTMLElement | null;
    const focusId = focused?.closest<HTMLElement>("[data-mail-id]")?.dataset.mailId;
    const focusLabel = focused?.textContent;
    const markAll = this.#iconAction("Mark all read", "read-all", () => this.community.readMail());
    markAll.disabled = this.#loading || this.community.mailbox.unread === 0;
    const header = element("header", { className: "kl-mailbox-header" }, element("strong", { text: "Mailbox" }),
      markAll, this.#iconAction("Close", "close", () => this.close()));
    const status = element("p", { className: "kl-mailbox-status kl-cloud-status", role: "status" });
    const list = element("div", { className: "kl-mailbox-list" });
    if (this.#loading) status.textContent = "Loading notifications…";
    else if (!this.community.client.connected) status.textContent = "Connect your KikiLink profile to open Mailbox.";
    else if (this.community.error) { status.textContent = this.community.error; list.append(this.#action("Retry", () => this.community.refresh())); }
    else if (!this.community.supported) status.textContent = "Mailbox is not supported by this Cloud server yet.";
    else if (!this.community.mailbox.items.length) list.append(element("div", { className: "kl-mailbox-empty" },
      kikiIcon("read-all"), element("strong", { text: "You're all caught up." }), element("span", { text: "New KikiLink notifications will appear here." })));
    for (const item of this.community.mailbox.items) {
      const who = item.actor ? this.community.adapter.getMemberName(item.actor) : "KikiLink";
      const labels: Record<string, string> = { comment: `${who} commented on your post`, reaction: `${item.count} reaction${item.count === 1 ? "" : "s"} on your ${item.targetType}`,
        friend_request: `${who} sent a friend request`, friend_accepted: `${who} accepted your friend request`, group_invitation: `${who} invited you to a group`,
        report: "New report for review", release: `KikiLink ${item.targetId} is available` };
      const row = element("article", { className: "kl-mailbox-item" }); row.dataset.mailId = String(item.id); row.dataset.unread = String(!item.read);
      row.append(this.#action(labels[item.kind] ?? "Notification", async () => { await this.community.readMail(item.id); this.close(); await this.options.open(item); }),
        bindClockText(element("time"), item.updatedAt, "medium-date-time"));
      if (item.pending && item.kind === "friend_request" && item.actor) {
        const controls = element("div"); renderRelationshipControls(controls, item.actor, this.community, this.community.adapter); row.append(controls);
      }
      if (item.pending && item.kind === "group_invitation") row.append(element("div", { className: "kl-cloud-actions" },
        this.#action("Accept", async () => { await this.community.client.request("POST", `/v1/groups/${item.targetId}/accept`, {}); await this.community.refresh(); }),
        this.#action("Decline", async () => { await this.community.client.request("DELETE", `/v1/groups/${item.targetId}/invitation`); await this.community.refresh(); })));
      list.append(row);
    }
    if (this.community.mailbox.nextCursor !== null) list.append(this.#action("Load more", () => this.community.moreMail()));
    this.element.replaceChildren(header, status, list); list.scrollTop = scroll;
    if (focusId && focusLabel) [...this.element.querySelectorAll<HTMLButtonElement>(`[data-mail-id="${focusId}"] button`)].find(b => b.textContent === focusLabel)?.focus({ preventScroll: true });
    if (this.element.open) anchorSurface(this.element, this.button);
  }
  destroy(): void {
    this.#closed = true; this.#unsubscribe();
    window.removeEventListener("resize", this.#reposition);
    window.visualViewport?.removeEventListener("resize", this.#reposition);
    window.visualViewport?.removeEventListener("scroll", this.#reposition);
    this.element.remove(); this.button.remove();
  }
}
