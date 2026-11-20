import { groupInvitationCountLabel, groupInvitationOutcome, groupInvitationTitle, type CommunityService, type MailItem } from "../../cloud/community";
import { CloudError } from "../../cloud/client";
import { element } from "../../cloud/dom";
import type { CloudGroupInbox } from "../../cloud/group-inbox";
import type { CloudGroup } from "../../cloud/types";
import type { GroupInvitationPreview } from "./group-invitation-preview";

interface HistoryOptions {
  current(): boolean;
  blocked(member: number): boolean;
  close(): void;
  openGroup(): void;
}

/** A fresh exact mailbox receipt controls the historical preview independently of current group membership. */
export class GroupInvitationHistory {
  readonly element: HTMLElement;
  readonly #actions = element("div", { className: "kl-cloud-actions" });
  readonly #open = element("button", { type: "button", className: "kl-text-button kl-text-button--primary",
    text: "Open group", ariaLabel: "Open group" });
  #version = 0;
  #snapshot: MailItem | undefined;

  constructor(private readonly mail: MailItem, private readonly community: CommunityService,
    private readonly inbox: CloudGroupInbox, private readonly preview: GroupInvitationPreview, private readonly options: HistoryOptions) {
    const outcome = groupInvitationOutcome(mail);
    const summary = element("div", { className: "kl-group-invitation-review-summary" },
      preview.icon,
      element("h3", { text: groupInvitationTitle(mail) ?? "Group invitation" }));
    if (mail.actor && !options.blocked(mail.actor)) summary.append(element("p", { text: `${community.adapter.getMemberName(mail.actor)} invited you` }));
    const countLabel = groupInvitationCountLabel(mail);
    if (countLabel) summary.append(element("span", { className: "kl-group-invitation-count", text: countLabel }));
    const result = element("p", { className: "kl-group-invitation-outcome", role: "status",
      text: outcome ? `Invitation ${outcome}.` : "Invitation no longer pending." });
    const close = element("button", { type: "button", className: "kl-text-button", text: "Close", ariaLabel: "Close" });
    close.addEventListener("click", () => { if (options.current()) options.close(); });
    this.#open.addEventListener("click", () => { if (this.#actions.contains(this.#open)) void this.refresh(true); });
    this.#actions.append(close);
    this.element = element("section", { className: "kl-group-invitation kl-group-invitation-review-card" },
      element("div", { className: "kl-group-invitation-review-body" }, summary, preview.roster, result),
      this.#actions);
  }

  sync(): void {
    const snapshot = this.#snapshot;
    if (!snapshot) return;
    if (!this.options.current() || !this.community.groupInvitationHistoryPreview ||
      snapshot.groupInvitationHistoryPreview?.members.some(member => !Number.isSafeInteger(member?.memberNumber) || this.options.blocked(member.memberNumber))) {
      this.#snapshot = undefined;
      this.preview.clear();
      return;
    }
    this.preview.updateHistory(snapshot);
  }

  async refresh(open = false): Promise<void> {
    const version = ++this.#version;
    const current = () => this.options.current() && version === this.#version;
    this.#open.remove();
    this.#snapshot = undefined;
    this.preview.clear();
    const mail = this.mail;
    const canOpen = groupInvitationOutcome(mail) === "accepted" && mail.groupCanOpen === true;
    if (!current() || (!this.community.groupInvitationHistoryPreview && !canOpen) ||
      typeof mail.groupInvitedAt !== "number" || !Number.isSafeInteger(mail.groupInvitedAt) || mail.groupInvitedAt <= 0 || (mail.actor && this.options.blocked(mail.actor))) return;
    let fresh: MailItem;
    try {
      fresh = await this.community.resolveMail(mail, true);
    } catch (error) {
      if (current() && this.community.groupInvitationHistoryPreview && error instanceof CloudError &&
        [403, 404, 410].includes(error.status)) this.options.close();
      return;
    }
    try {
      if (!current() || fresh.kind !== "group_invitation" || fresh.targetType !== "group" || fresh.pending !== false ||
        fresh.id !== mail.id || fresh.targetId !== mail.targetId || fresh.actor !== mail.actor ||
        fresh.groupInvitedAt !== mail.groupInvitedAt || fresh.recoveryGeneration !== mail.recoveryGeneration ||
        groupInvitationOutcome(fresh) !== groupInvitationOutcome(mail) ||
        fresh.groupManagementSource && (fresh.groupManagementSource.required !== mail.groupManagementSource?.required ||
          fresh.groupManagementSource.generation !== mail.groupManagementSource?.generation)) return;
      if (this.community.groupInvitationHistoryPreview && Array.isArray(fresh.groupInvitationHistoryPreview?.members) &&
        fresh.groupInvitationMemberCount === mail.groupInvitationMemberCount && fresh.groupInvitationCapacity === mail.groupInvitationCapacity) {
        this.#snapshot = fresh;
        this.sync();
      }
      if (!canOpen || fresh.groupCanOpen !== true) return;
      const access = await this.inbox.historyAccess();
      if (!current() || !access.current() || (mail.recoveryGeneration && access.generation !== mail.recoveryGeneration)) return;
      const group = await access.request<CloudGroup>("GET", `/v1/groups/${encodeURIComponent(mail.targetId)}`);
      if (!current() || !access.current() || group.id !== mail.targetId || this.options.blocked(group.owner) ||
        !group.members.some(member => member.memberNumber === this.community.client.memberNumber && member.status === "active")) return;
      if (open) { this.options.openGroup(); return; }
      this.#actions.append(this.#open);
    } catch { /* Preserve the recorded outcome and Close when current group access cannot be confirmed. */ }
  }
}
