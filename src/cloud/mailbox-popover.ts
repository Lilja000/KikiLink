import { pageAction } from '../modules/platform-shell/page-action';
import { onDialogBackdropClick } from "../utils/dialog-backdrop";
import { sectionLink } from "../modules/platform-shell/section-link";
import { GroupManagementActions, type GroupManagementSource, type GroupManagementDraft } from "./group-management-intent";
import {SocialUI} from './social-ui';
import { element } from "./dom";
import { knownMemberName } from "./profile-data";
import { anchorSurface } from "../utils/anchored-surface";
import { focusedElement } from "../utils/dom";
import { kikiIcon, type KikiLinkIconName } from "../modules/link-chat/icons";
import { countBadge, updateBadge } from "../modules/link-chat/badge";
import { searchField } from "../modules/platform-shell/browse-controls";
import { renderRelationshipControls, renderFriendActionQueue } from "./relationship-controls";
import { personalMailOptions, type PersonalMailDialogs } from "./personal-mail-menu";
import { MailboxRecoveryError } from "./mailbox-recovery";
import { isPersonalLetter, samePersonalLetter, groupInvitationOutcome, groupInvitationResponseMessage, groupInvitationTitle, hasGroupInvitationHistory, recordedGroupAcceptanceTitle, type CommunityService, type MailItem } from "./community";
import { bindClockText, bindClockTitle, formatDateTime } from "../core/time-format";
import type { InboxChat, NotificationCenter } from "./notifications";
import type { GroupInvitation } from "./group-inbox";

interface ChatRow {
  chat: InboxChat; at: number; unread: number; mentionCount: number; mentions: MailItem[]; expanded: boolean;
}
type InboxFilter = "all" | "unread" | "mentions" | "invitations" | "mail";
const INVITATION_KINDS = new Set(["space_invitation", "space_request", "space_approved", "friend_request", "group_invitation", "community_invitation", "community_request"]);
const searchText = (text: string) => text.normalize("NFKC").toLowerCase();

function calendarEventStart(item: MailItem): number | undefined {
  const start = item.eventStartsAt;
  if (item.targetType === "calendar_event" && typeof start === "number" &&
    Number.isSafeInteger(start) && start > 0 && start <= 8_640_000_000_000_000) return start;
}
interface InlineInvitationResponse { key: string; owner: number; origin: string; mail: MailItem; accepted: boolean; title: string | undefined }
interface MailboxOptions {
  open(item: MailItem, source?: "inbox" | "bell"): void | Promise<void>;
  openLetter?(item: MailItem, source: "inbox" | "bell"): void | Promise<void>;
  mailDialogs?: PersonalMailDialogs;
  openInbox?(): void;
  openAlerts?(): void;
  notify?(message: string): void;
  pendingGroupInvitation?(id: string, source?: GroupManagementSource): Readonly<GroupInvitation> | undefined;
  groupManagementActions?(): GroupManagementActions | undefined;
  renderAvatar?(target: HTMLElement, name: string, member: number): void;
  /** Stable keeps its Mailbox label; only the local platform shell opts in. */
  platformPreview?: boolean;
  notifications?: NotificationCenter;
  showUnreadBadges?(): boolean;
}

/** Two surfaces, one account-scoped Cloud source. Opening a view never marks it read. */
export class MailboxPopover {
  readonly button = element("button", { type: "button", className: "kl-icon-button kl-mailbox-trigger", title: "Mailbox", ariaLabel: "Mailbox" }, kikiIcon("notifications"));
  readonly element = element("dialog", { className: "kl-cloud-group-menu kl-mailbox-popover", ariaLabel: "Mailbox" });
  readonly inlineElement = element("section", { className: "kl-inbox-page kl-inbox-surface", ariaLabel: "Inbox", hidden: true });
  readonly toastHost = element("div", { className: "kl-inbox-toast-host" });
  readonly #badge = countBadge();
  readonly #resultsStatus = element("p", { className: "kl-inbox-results-status kl-sr-only", role: "status" });
  readonly #unsubscribe: () => void;
  readonly #unsubscribeProfiles?: () => void;
  readonly #updateActor = new WeakMap<HTMLElement, () => void>();
  readonly #pending = new Set<string>();
  readonly #confirmedInvitations = new Set<string>();
  readonly #invitationAttempts = new WeakMap<GroupManagementDraft, InlineInvitationResponse>();
  #load: Promise<void> | undefined;
  #loading = false;
  #destroyed = false;
  #inlineVisible = false;
  #inlineSession = 0;
  #bellSession = 0;
  #filtersExpanded = false;
  #filter: InboxFilter = "all";
  #query = "";
  #unreadLettersOnly = false;
  #letterSearch: { key: string; ids?: Set<number>; failed?: boolean } | undefined;
  #searchTimer: ReturnType<typeof setTimeout> | undefined;
  #displayLimit = 40;
  readonly #mentionLimits = new Map<string, number>();
  #actionError = "";
  #loadError = "";
  readonly #friendReviewInline=element('section');
  readonly #friendReviewPopover=element('section');
  #groupActions:GroupManagementActions|undefined;
  #groupUI:SocialUI|undefined;
  #anchorRect: DOMRect | undefined;
  #scrollRoot: ShadowRoot | undefined;
  readonly #reposition = (): void => {
    if (!this.element.open) return;
    if (this.#anchorMoved()) this.close(false);
    else anchorSurface(this.element, this.button);
  };
  readonly #resize = (): void => {
    if (this.options.platformPreview) this.close(false);
    else this.#reposition();
  };
  readonly #outsideScroll = (event: Event): void => {
    if (this.element.open && !event.composedPath().includes(this.element) && this.#anchorMoved()) this.close(false);
  };

  constructor(readonly community: CommunityService, readonly options: MailboxOptions) {
    this.#resultsStatus.setAttribute("aria-live", "polite");
    this.#resultsStatus.setAttribute("aria-atomic", "true");
    this.button.append(this.#badge);
    this.button.setAttribute("aria-haspopup", "dialog");
    this.button.setAttribute("aria-expanded", "false");
    if (options.platformPreview) {
      this.button.title = "Inbox";
      this.button.setAttribute("aria-label", "Inbox");
      this.element.setAttribute("aria-label", "Inbox");
      this.element.classList.add("kl-inbox-surface");
      this.element.append(this.toastHost);
      this.element.addEventListener("keydown", event => this.#movePopoverFocus(event));
    }
    this.button.addEventListener("click", () => { if (this.element.open) this.close(); else void this.open(); });
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
    onDialogBackdropClick(this.element, () => this.close());
    this.element.addEventListener("close", () => { if (!this.element.open) this.#resetPopover(); });
    this.#unsubscribe = (options.notifications ?? community).subscribe(() => {
      if (this.#destroyed) return;
      if (this.element.open || this.#inlineVisible) this.render();
      else this.#updateTrigger();
    });
    this.#unsubscribeProfiles = community.client.subscribe?.((kind, cause) => {
      if (!this.#inlineVisible && !this.element.open || kind === "profiles-cleared" && cause === "ready") return;
      const member = kind.startsWith("profile:") ? Number(kind.slice(8)) : undefined;
      if (member === undefined && !["profiles-cleared", "blocks", "session", "disconnected"].includes(kind)) return;
      const selector = member === undefined ? "[data-mail-actor]" : `[data-mail-actor="${member}"]`;
      for (const surface of [this.inlineElement, this.element]) {
        surface.querySelectorAll<HTMLElement>(selector).forEach(row => this.#updateActor.get(row)?.());
      }
    });
    this.#updateTrigger();
  }
  #badgeCount(): number {
    return this.options.showUnreadBadges?.() === false ? 0 : this.options.notifications?.snapshot.total ?? this.community.mailbox.unread;
  }
  #updateTrigger(): void {
    const count = this.#badgeCount();
    updateBadge(this.#badge, count);
    if (this.options.platformPreview) this.button.setAttribute("aria-label", count ? `Inbox, ${count} unread` : "Inbox");
  }

  setInlineVisible(visible: boolean): void {
    if (this.#destroyed) return;
    const changed = visible !== this.#inlineVisible;
    this.#inlineVisible = visible;
    if (changed) this.#inlineSession++;
    this.inlineElement.hidden = !visible;
    if (!visible) {
      if (changed) {
        this.#resultsStatus.textContent = "";
        this.#letterSearch = undefined; clearTimeout(this.#searchTimer);
      }
      return;
    }
    if (changed && !this.#load) void this.#refresh();
    else this.render();
  }

  async open(): Promise<void> {
    if (this.#destroyed || this.options.platformPreview && !this.#anchorAvailable()) return;
    const opening = !this.element.open;
    if (opening) {
      this.#bellSession++;
      this.toastHost.replaceChildren();
    }
    this.render();
    if (opening) {
      this.element.showModal();
      this.#watchPopoverPosition();
    }
    this.#reposition();
    if (!this.element.open) return;
    this.button.setAttribute("aria-expanded", "true");
    const refresh = this.#refresh();
    if (opening && this.element.open && this.options.platformPreview) this.#popoverControls()[0]?.focus({ preventScroll: true });
    await refresh;
  }

  close(restoreFocus = true): void {
    const wasOpen = this.element.open;
    if (wasOpen) this.element.close();
    this.#resetPopover();
    if (wasOpen && restoreFocus && !this.#destroyed && this.#anchorAvailable()) this.button.focus({ preventScroll: true });
  }

  #anchorAvailable(): boolean {
    return this.button.isConnected && !this.button.closest("[hidden], [inert]");
  }

  #anchorMoved(): boolean {
    if (!this.#anchorRect) return false;
    if (!this.#anchorAvailable()) return true;
    const rect = this.button.getBoundingClientRect();
    return Math.abs(rect.x - this.#anchorRect.x) > 1 || Math.abs(rect.y - this.#anchorRect.y) > 1;
  }

  #watchPopoverPosition(): void {
    window.addEventListener("resize", this.#resize);
    window.visualViewport?.addEventListener("resize", this.#reposition);
    window.visualViewport?.addEventListener("scroll", this.#reposition);
    if (!this.options.platformPreview) return;
    this.#anchorRect = this.button.getBoundingClientRect();
    const root = this.button.getRootNode();
    if (root instanceof ShadowRoot) {
      this.#scrollRoot = root;
      root.addEventListener("scroll", this.#outsideScroll, true);
    }
    window.addEventListener("scroll", this.#outsideScroll, true);
  }

  #resetPopover(): void {
    window.removeEventListener("resize", this.#resize);
    window.visualViewport?.removeEventListener("resize", this.#reposition);
    window.visualViewport?.removeEventListener("scroll", this.#reposition);
    window.removeEventListener("scroll", this.#outsideScroll, true);
    this.#scrollRoot?.removeEventListener("scroll", this.#outsideScroll, true);
    this.#scrollRoot = undefined;
    this.#anchorRect = undefined;
    this.toastHost.replaceChildren();
    this.#filtersExpanded = false;
    this.button.setAttribute("aria-expanded", "false");
  }

  #popoverControls(): HTMLElement[] {
    return [...this.element.querySelectorAll<HTMLElement>("button:not(:disabled), summary")].filter(control => {
      if (control.closest('[hidden], [inert], [aria-hidden="true"], [aria-disabled="true"]') ||
        control.hasAttribute("tabindex") && control.tabIndex < 0) return false;
      for (let parent = control.parentElement; parent && parent !== this.element; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement && !parent.open &&
          parent.querySelector(":scope > summary") !== control) return false;
      }
      return true;
    });
  }

  #movePopoverFocus(event: KeyboardEvent): void {
    if (!this.element.open || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey ||
      event.metaKey || event.shiftKey || !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const active = focusedElement(this.element);
    if (active?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    const controls = this.#popoverControls();
    if (!controls.length) return;
    const current = controls.findIndex(control => control === active);
    let next = 0;
    switch (event.key) {
      case "End": next = controls.length - 1; break;
      case "ArrowUp": next = current > 0 ? current - 1 : controls.length - 1; break;
      case "ArrowDown": next = (current + 1) % controls.length; break;
    }
    event.preventDefault();
    event.stopPropagation();
    controls[next]?.focus();
  }

  #current(): boolean {
    return !this.#destroyed && this.community.client.connected &&
      (this.community.adapter.getOwnMemberNumber?.() ?? this.community.client.memberNumber) === this.community.client.memberNumber;
  }

  #refresh(): Promise<void> {
    if (this.#load) return this.#load;
    if (!this.#current()) { this.render(); return Promise.resolve(); }
    this.#loading = true; this.#actionError = ""; this.#loadError = ""; this.render();
    const task = (async () => {
      try {
        if (!this.community.supported) await this.community.start();
        if (this.#current()) await (this.options.notifications?.refresh() ?? this.community.refresh());
      } catch (error) {
        if (this.#current()) this.#loadError = error instanceof Error && error.message ? error.message : "Updates could not load.";
      } finally {
        this.#loading = false;
        if (!this.#destroyed) this.render();
      }
    })();
    this.#load = task;
    void task.finally(() => { if (this.#load === task) this.#load = undefined; });
    return task;
  }

  #action(label: string, key: string, work: () => void | Promise<void>, options: { icon?: KikiLinkIconName; iconOnly?: boolean; lock?: string; local?: boolean } = {}): HTMLButtonElement {
    const button = element("button", {
      type: "button", className: options.iconOnly ? "kl-sidebar-new-chat kl-mailbox-icon-button" : "kl-text-button",
      ...(options.iconOnly ? { title: label, ariaLabel: label } : { text: label }),
    });
    if (options.icon) button.prepend(kikiIcon(options.icon));
    const generation = this.community.mailboxRecoveryGeneration;
    const lock = `${generation ?? "legacy"}:${options.lock ?? key}`;
    button.dataset.mailAction = key; button.dataset.mailLock = lock;
    button.disabled = this.#pending.has(lock) || (!options.local && !this.#current());
    button.addEventListener("click", () => {
      if (this.#destroyed || this.#pending.has(lock) || (!options.local && !this.#current())) return;
      this.#pending.add(lock); this.#actionError = "";
      for (const root of [this.element, this.inlineElement]) for (const control of root.querySelectorAll<HTMLButtonElement>("[data-mail-lock]")) {
        if (control.dataset.mailLock === lock) control.disabled = true;
      }
      void Promise.resolve().then(() => {
        if (!options.local && generation !== this.community.mailboxRecoveryGeneration) throw new MailboxRecoveryError();
        if (!this.#destroyed && (options.local || this.#current())) return work();
      }).catch(error => {
        if (!this.#destroyed && generation === this.community.mailboxRecoveryGeneration) this.#actionError = error instanceof Error ? error.message : "Could not complete the action. Retry.";
      }).finally(() => { this.#pending.delete(lock); if (!this.#destroyed) this.render(); });
    });
    return button;
  }

  #restartResults(): void {
    this.#displayLimit = 40;
    const list = this.inlineElement.querySelector<HTMLElement>(".kl-mailbox-list");
    if (list) list.scrollTop = 0;
  }

  #filters(): HTMLElement {
    const filters = element("div", { className: "kl-inbox-filters", role: "group", ariaLabel: "Filter Inbox" });
    for (const [value, label] of [["all", "All"], ["unread", "Unread"], ["mentions", "Mentions"], ["invitations", "Invites"], ["mail", "Mail"]] as const) {
      const button = element("button", { type: "button", className: "kl-text-button", text: label });
      button.dataset.mailAction = `filter-${value}`; button.dataset.inboxFilter = value;
      button.setAttribute("aria-pressed", String(this.#filter === value));
      button.addEventListener("click", () => { this.#filter = value; this.#restartResults(); this.#actionError = ""; this.render(); });
      filters.append(button);
    }
    return filters;
  }

  #invitationTitle(item: MailItem): string | undefined {
    if (item.kind !== "group_invitation" || item.targetType !== "group" || item.groupInvitedAt === undefined || !this.#current() ||
      item.recoveryGeneration !== this.community.mailboxRecoveryGeneration) return;
    if (!this.#groupInvitationSourceCurrent(item)) return;
    if (!item.pending) return groupInvitationTitle(item);
    const invite = this.options.pendingGroupInvitation?.(item.targetId, this.community.groupManagementSource);
    if (invite?.id === item.targetId && invite.invitedAt === item.groupInvitedAt && typeof invite.title === "string")
      return invite.title.trim() || undefined;
  }

  #samePendingInvitation(item: MailItem): boolean {
    const pending = this.options.pendingGroupInvitation?.(item.targetId, item.groupManagementSource);
    return !pending || pending.invitedAt === item.groupInvitedAt;
  }

  async #confirmedInvitation(response: InlineInvitationResponse, current: () => boolean): Promise<void> {
    const { key, owner, origin, mail, accepted } = response;
    if (this.#confirmedInvitations.has(key)) return;
    this.#confirmedInvitations.add(key);
    if (this.#confirmedInvitations.size > 500) this.#confirmedInvitations.delete(this.#confirmedInvitations.values().next().value!);
    const sameAccount = () => this.#current() && owner === this.community.client.memberNumber && origin === this.community.client.origin;
    if (!sameAccount()) return;
    try {
      await this.community.refresh();
    } finally {
      if (current() && sameAccount() && mail.recoveryGeneration === this.community.mailboxRecoveryGeneration &&
        this.#groupInvitationSourceCurrent(mail) && this.#samePendingInvitation(mail)) {
        const title = accepted ? recordedGroupAcceptanceTitle(mail, this.community.mailbox.items) ?? response.title : undefined;
        this.options.notify?.(groupInvitationResponseMessage(accepted, title));
      }
    }
  }

  #groupInvitationSourceCurrent(item: MailItem): boolean {
    const current = this.community.groupManagementSource;
    const observed = item.groupManagementSource;
    return observed ? observed.required === current?.required && observed.generation === current?.generation : !current?.required;
  }

  #mailCopy(item: MailItem, preview: boolean): { title: string; source: string; icon: KikiLinkIconName; who: string; invitation?: string } {
    const who = item.actor ? knownMemberName(this.community, item.actor, item.mailSenderName) : "KikiLink";
    if (isPersonalLetter(item)) {
      return { title: item.mailSubject!, source: `Mail · ${who}`, who, icon: "mail", invitation: item.mailPreview ?? "" };
    }
    const mentionSource = ({
      group_message: "Group chat", direct_message: "Direct", community_message: "Community channel", comment: "Feed comment",
    } as Record<string, string>)[item.targetType] ?? "Feed post";
    const labels: Record<string, string> = {
      mention: `${who} mentioned you in ${item.targetType === "community_message" ? "a community channel" : item.targetType === "group_message" ? "a group" : item.targetType === "direct_message" ? "Direct" : item.targetType === "comment" ? "a comment" : "a post"}`,
      comment: `${who} commented on your post`, reaction: `${item.count} reaction${item.count === 1 ? "" : "s"} on your ${item.targetType}`,
      comment_reply: `${who} replied to your comment`, post_comment: item.count > 1 ? `${item.count} new comments on a post you follow` : `${who} commented on a post you follow`,
      friend_request: `${who} sent a friend request`, friend_accepted: `${who} accepted your friend request`, group_invitation: `${who} invited you to a group`,
      space_invitation: `${who} invited you to ${item.spaceName ?? "a space"}`, space_request: `${who} requested to join ${item.spaceName ?? "your space"}`, space_approved: `Your request to join ${item.spaceName ?? "a space"} was approved`,
      event_reminder: `Starting soon: ${item.eventTitle ?? "Your event"}`, event_place: `Your place is ready: ${item.eventTitle ?? "Your event"}`, event_updated: `Event updated: ${item.eventTitle ?? "Your event"}`, event_cancelled: `Event cancelled: ${item.eventTitle ?? "Your event"}`,
      community_invitation: `${who} invited you to a community`, community_request: `${who} requested to join your community`, community_approved: "Your community join request was approved",
      report: "New report for review", release: `KikiLink ${item.targetId} is available`,
    };
    const icons: Record<string, KikiLinkIconName> = { space_invitation: "group-add", space_request: "requests", space_approved: "location", event_reminder: "calendar", event_place: "calendar", event_updated: "calendar", event_cancelled: "calendar", community_invitation: "group-add", community_request: "requests", community_approved: "users", friend_request: "requests", friend_accepted: "users", group_invitation: "group-add", reaction: "heart", report: "shield", release: "note" };
    const sources: Record<string, string> = {
      mention: `${mentionSource} · Mention`, comment: "Feed · Comment", reaction: "Feed · Reaction",
      comment_reply: "Feed · Reply", post_comment: "Feed · Followed post",
      friend_request: "Friend request", friend_accepted: "Friends", group_invitation: "Group invitation",
      space_invitation: "Space invitation", space_request: "Space request", space_approved: "Spaces",
      event_reminder: "Event reminder", event_place: "Events", event_updated: "Events", event_cancelled: "Events",
      community_invitation: "Community invitation", community_request: "Community request", community_approved: "Communities",
      report: "Moderation", release: "KikiLink news",
    };
    const title = preview ? this.#invitationTitle(item) : undefined;
    if (preview && item.kind === "group_invitation" && item.targetType === "group" && !item.pending) {
      const outcome = groupInvitationOutcome(item);
      return { title: title || "Group invitation", source: "Group invitation", icon: "group-add", who,
        invitation: outcome ? `Invitation ${outcome}` : "Invitation no longer pending" };
    }
    return { title: title ?? labels[item.kind] ?? "Notification", source: sources[item.kind] ?? "KikiLink",
      icon: icons[item.kind] ?? "reply", who, ...(title ? { invitation: `${who} invited you to join` } : {}) };
  }

  #presentRow(button: HTMLButtonElement, row: { title: string; source: string; icon: KikiLinkIconName; name: string; actor: number | null; at: number; unread: boolean; muted?: boolean; preview?: HTMLElement }): void {
    const visual = element("span", { className: "kl-inbox-item-icon", ariaHidden: "true" });
    if (row.actor) {
      visual.classList.add("kl-avatar");
      visual.textContent = [...row.name.trim()][0]?.toLocaleUpperCase() ?? "?";
      this.options.renderAvatar?.(visual, row.name, row.actor);
    } else visual.append(kikiIcon(row.icon));
    const title = element("span", { className: "kl-inbox-title" }, element("strong", { text: row.title }),
      row.unread ? element("span", { className: "kl-inbox-unread-dot", ariaHidden: "true" }) : undefined);
    const source = element("span", { className: "kl-inbox-source" }, kikiIcon(row.icon), element("span", { text: row.source }));
    const timestamp = row.at > 0 ? bindClockText(element("time"), row.at, "medium-date-time") : undefined;
    if (timestamp) bindClockTitle(timestamp, row.at, "long-date-time-with-zone");
    const meta = element("span", { className: "kl-inbox-meta" }, source, timestamp,
      row.muted ? element("span", { className: "kl-inbox-muted", text: "Muted" }) : undefined);
    const copy = element("span", { className: "kl-inbox-copy" }, title, row.preview, meta);
    button.classList.add("kl-inbox-item-open");
    button.setAttribute("aria-label", `${row.title}${row.unread ? ", unread" : ""}${row.muted ? ", muted" : ""}`);
    button.replaceChildren(visual, copy);
  }

  #row(item: MailItem, surface: HTMLElement, preview: boolean): HTMLElement {
    const { title, source, icon, who, invitation } = this.#mailCopy(item, preview);
    const row = element("article", { className: "kl-mailbox-item" });
    row.dataset.mailId = String(item.id); row.dataset.unread = String(!item.read);
    const lock = `mail-${item.id}`;
    const bell = surface === this.element;
    const review = preview && item.kind === "group_invitation" && item.targetType === "group";
    const surfaceSession = bell ? this.#bellSession : this.#inlineSession;
    const owner = this.community.client.memberNumber, origin = this.community.client.origin;
    const reviewingHere = () => this.#current() && this.community.client.memberNumber === owner && this.community.client.origin === origin &&
      (bell ? this.element.open && this.#bellSession === surfaceSession : this.#inlineVisible && this.#inlineSession === surfaceSession);
    const letter = preview && this.community.personalMail && isPersonalLetter(item);
    const letterCurrent = () => reviewingHere() && this.community.personalMail &&
      item.recoveryGeneration === this.community.mailboxRecoveryGeneration && !!item.actor && !this.community.client.isProfileBlocked?.(item.actor);
    const visibleLetter = () => letterCurrent() && this.community.mailbox.items.some(row => samePersonalLetter(row, item));
    const read = (target: MailItem) => target.recoveryGeneration ? this.community.readMail(target.id, target.recoveryGeneration) : this.community.readMail(target.id);
    const open = this.#action(title, `open-${item.id}`, async () => {
      if (letter) {
        if (!row.isConnected || !visibleLetter()) return;
        let revision = this.community.personalMailRevision;
        let detail = await this.community.resolveMail(item, true);
        if (!visibleLetter() || revision !== this.community.personalMailRevision || !samePersonalLetter(item, detail)) return;
        if (!detail.read) await this.community.readMail(item.id, item.recoveryGeneration, "mail");
        if (!letterCurrent()) return;
        if (revision !== this.community.personalMailRevision) {
          revision = this.community.personalMailRevision;
          detail = await this.community.resolveMail(item, true);
        }
        if (!letterCurrent() || revision !== this.community.personalMailRevision || !samePersonalLetter(item, detail) ||
          typeof detail.mailBody !== "string" || this.community.personalMailLoaded && !visibleLetter()) return;
        if (bell) this.close(false);
        await this.options.openLetter?.(detail, bell ? "bell" : "inbox");
        return;
      }
      if (review && !reviewingHere()) return;
      if (review && !this.#groupInvitationSourceCurrent(item)) throw new MailboxRecoveryError();
      const target = item.recoveryGeneration !== undefined || this.community.mailboxRecoveryGeneration !== undefined ? await this.community.resolveMail(item) : item;
      if (review) {
        if (!reviewingHere()) return;
        if (target.id !== item.id || target.actor !== item.actor || target.kind !== item.kind || target.targetType !== item.targetType ||
          target.targetId !== item.targetId || target.groupInvitedAt !== item.groupInvitedAt || target.recoveryGeneration !== item.recoveryGeneration ||
          target.recoveryGeneration !== this.community.mailboxRecoveryGeneration || !this.#groupInvitationSourceCurrent(item) ||
          target.groupManagementSource && !this.#groupInvitationSourceCurrent(target) || !item.pending && target.pending) throw new MailboxRecoveryError();
        if (item.pending && !target.pending && !hasGroupInvitationHistory(target))
          throw new Error("This group invitation is no longer pending.");
      }
      if (!target.read) await read(target);
      if (!this.#current()) return;
      if (target.recoveryGeneration !== this.community.mailboxRecoveryGeneration) throw new MailboxRecoveryError();
      if (review) {
        if (!reviewingHere()) return;
        if (!this.#groupInvitationSourceCurrent(item)) throw new MailboxRecoveryError();
        if (bell) this.close();
        const reviewed = { ...target };
        if (item.groupManagementSource) reviewed.groupManagementSource = item.groupManagementSource;
        else delete reviewed.groupManagementSource;
        await this.options.open(reviewed, bell ? "bell" : "inbox");
        return;
      }
      if (bell) this.close();
      await this.options.open(target);
    }, { lock: review ? `invitation-${item.id}` : lock });
    row.append(open);
    if (letter) row.dataset.inboxKind = "mail";
    if (preview) {
      const muted = this.options.notifications?.snapshot.mutedMail?.has(item.id) ?? false;
      const start = calendarEventStart(item);
      const eventPreview = start === undefined ? undefined : element("span", { className: "kl-inbox-preview" }, "Starts ",
        bindClockText(element("time", { className: "kl-inbox-event-start" }), start, "medium-date-time"));
      const invitationText = review && item.pending && item.groupInvitedAt === undefined ? "Review current invitations in Groups" : invitation;
      const description = eventPreview ?? (invitationText ? element("span", { className: "kl-inbox-preview", text: invitationText }) : undefined);
      if (description) {
        description.id = `kl-inbox-${surface === this.element ? "popover" : "page"}-${eventPreview ? "event-start" : "group-invitation"}-${item.id}`;
        open.setAttribute("aria-describedby", description.id);
      }
      this.#presentRow(open, { title, source, icon, name: who, actor: item.actor, at: letter ? item.createdAt : item.updatedAt, unread: !item.read, muted,
        ...(description ? { preview: description } : {}) });
      if (item.actor) {
        const actor = item.actor;
        row.dataset.mailActor = String(actor);
        let name = who;
        this.#updateActor.set(row, () => {
          const copy = this.#mailCopy(item, true);
          if (copy.who === name) return;
          name = copy.who;
          open.querySelector(".kl-inbox-title strong")!.textContent = copy.title;
          open.querySelector(".kl-inbox-source > span")!.textContent = copy.source;
          open.setAttribute("aria-label", `${copy.title}${item.read ? "" : ", unread"}${muted ? ", muted" : ""}`);
          if (description && invitationText === invitation && invitation && copy.invitation) description.textContent = copy.invitation;
          const avatar = open.querySelector<HTMLElement>(".kl-inbox-item-icon")!;
          if (this.options.renderAvatar) this.options.renderAvatar(avatar, name, actor);
          else avatar.textContent = [...name][0]?.toLocaleUpperCase() ?? "?";
        });
      }
      if (!item.read) row.append(this.#action("Mark as read", `read-${item.id}`, () => {
        if (!letter) return read(item);
        if (row.isConnected && visibleLetter()) return this.community.readMail(item.id, item.recoveryGeneration, "mail");
      }, { icon: "read-all", iconOnly: true, lock }));
      if (letter && !bell && this.options.mailDialogs) {
        row.append(personalMailOptions({ subject: title, read: item.read, dialogs: this.options.mailDialogs, current: letterCurrent,
          setRead: async value => {
            if (!visibleLetter()) throw new Error("This letter is unavailable.");
            if (value) await this.community.readMail(item.id, item.recoveryGeneration, "mail");
            else await this.community.changeLetter(item, "unread");
          },
          remove: async () => {
            if (!visibleLetter()) throw new Error("This letter is unavailable.");
            await this.community.changeLetter(item, "remove");
          }, notify: message => this.options.notify?.(message) }));
      }
    } else row.append(bindClockText(element("time"), item.updatedAt, "medium-date-time"));
    if (item.pending && item.kind === "friend_request" && item.actor) {
      const peer = item.actor;
      const respond=(action:'accept'|'decline')=>{
        if(!row.isConnected||!(surface===this.element?this.element.open:this.#inlineVisible))return;
        return item.friendSource?.required||this.community.friendSource?.required?this.community.actionFromMail(item,action,()=>this.#current()&&surface.isConnected&&(surface===this.element?this.element.open:this.#inlineVisible)):this.community.action(peer,action);
      };
      if (preview || item.friendSource?.required || this.community.friendSource?.required) row.append(element("div", { className: "kl-cloud-actions kl-inbox-invitation-actions" },
          this.#action("Accept", `accept-${item.id}`, () => respond("accept"), { icon: "check", lock: `invitation-${item.id}` }),
          this.#action("Decline", `decline-${item.id}`, () => respond("decline"), { icon: "close", lock: `invitation-${item.id}` })));
      else {
        const controls = element("div");
        renderRelationshipControls(controls, peer, this.community, this.community.adapter); row.append(controls);
      }
    }
    if (item.pending && item.kind === "group_invitation" && (!review || item.groupInvitedAt !== undefined)) {
      const source=item.groupManagementSource;
      if(source&&!this.#groupActions){
        this.#groupActions=this.options.groupManagementActions?.()??new GroupManagementActions(this.community.client);
        this.#groupUI=new SocialUI({client:this.community.client,run:async(action,button)=>{if(button)button.disabled=true;try{await action();}catch(error){this.#actionError=error instanceof Error?error.message:'Could not confirm the change.';}finally{if(button)button.disabled=false;this.render();}},image:()=>element('span'),openProfile:()=>{},isBlocked:()=>false});
      }
      const entries=source&&this.#groupActions?Object.fromEntries((['accept','decline'] as const).map(action=>[action,this.#groupActions!.capture(`invitation:${item.targetId}`,{action,groupId:item.targetId,...item.groupInvitedAt!==undefined?{invitedAt:item.groupInvitedAt}:{},label:`Group invitation · ${action}`},source)])):undefined;
      const responseKey = review ? JSON.stringify([owner, origin, item.recoveryGeneration, source?.generation, item.targetId, item.groupInvitedAt]) : undefined;
      // An unbound endpoint can acknowledge a repeat while an old pending row is still cached.
      if (responseKey && this.#confirmedInvitations.has(responseKey)) return row;
      const respond = async (accept: boolean) => {
        const current = () => reviewingHere() && (!review || item.recoveryGeneration === this.community.mailboxRecoveryGeneration &&
          this.#groupInvitationSourceCurrent(item));
        if (!row.isConnected || !current() || (responseKey && this.#confirmedInvitations.has(responseKey)) ||
          (review && !this.#samePendingInvitation(item))) return;
        const response = responseKey ? { key: responseKey, owner, origin, mail: item, accepted: accept,
          title: accept ? this.#invitationTitle(item) : undefined } : undefined;
        if (entries && this.#groupActions) {
          const entry = entries[accept ? 'accept' : 'decline']!;
          if (entry.intent.pending || entry.intent.target.action !== (accept ? 'accept' : 'decline') ||
            entry.intent.target.invitedAt !== item.groupInvitedAt) return;
          if (response) this.#invitationAttempts.set(entry, response);
          if (!await this.#groupActions.perform(entry, current)) return;
        } else {
          const target = encodeURIComponent(item.targetId);
          if (accept) await this.community.client.request('POST', `/v1/groups/${target}/accept`, {});
          else await this.community.client.request('DELETE', `/v1/groups/${target}/invitation`);
        }
        if (response) return this.#confirmedInvitation(response, current);
        if (this.#current() && owner === this.community.client.memberNumber && origin === this.community.client.origin)
          await this.community.refresh();
      };
      row.append(element("div", { className: "kl-cloud-actions kl-inbox-invitation-actions" },
        this.#action("Accept", `accept-${item.id}`, () => respond(true), { icon: "check", lock: `invitation-${item.id}` }),
        this.#action("Decline", `decline-${item.id}`, () => respond(false), { icon: "close", lock: `invitation-${item.id}` })));
    }
    return row;
  }

  #chatSource(chat: InboxChat): string {
    return chat.channelId ? "Community channel" : chat.groupId ? "Group chat" : "Direct";
  }

  #chatRow({ chat, at, unread, mentionCount, mentions, expanded }: ChatRow, surface: HTMLElement): HTMLElement {
    const row = element("article", { className: "kl-mailbox-item kl-inbox-chat" });
    row.dataset.inboxChat = chat.key; row.dataset.unread = String(unread > 0);
    const muted = (surface !== this.element || !this.options.platformPreview) && (chat.muted || chat.alertEligible === false);
    const detailsText = [unread ? `${unread} unread` : "", mentionCount ? `${mentionCount} mention${mentionCount === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ");
    const lock = `chat-${chat.key}`;
    const open = this.#action(chat.title, lock, async () => {
      if (surface === this.element) this.close();
      await this.options.notifications?.openChat(chat);
    }, { lock });
    this.#presentRow(open, { title: chat.title, source: this.#chatSource(chat), icon: chat.groupId ? "group-add" : "chat",
      name: chat.title, actor: chat.peer ?? null, at, unread: unread > 0, muted,
      ...(detailsText ? { preview: element("span", { className: "kl-inbox-preview", text: detailsText }) } : {}) });
    if (detailsText) open.setAttribute("aria-label", `${chat.title} · ${detailsText}${muted ? ", muted" : ""}`);
    row.append(open);
    if (unread > 0) row.append(this.#action("Mark as read", `read-${chat.key}`, () => this.options.notifications?.readChat(chat),
      { icon: "read-all", iconOnly: true, lock }));
    if (mentions.length) {
      const summary = element("summary", { text: `Mentions (${mentions.length})` });
      summary.dataset.mailAction = `mention-toggle-${chat.key}`;
      const details = element("details", { className: "kl-inbox-mentions" }, summary);
      const list = element("div");
      const populate = () => {
        const limit = this.#mentionLimits.get(chat.key) || 20;
        list.replaceChildren(...mentions.slice(0, limit).map(item => this.#row(item, surface, true)));
        if (limit < mentions.length) {
          list.append(this.#action("More mentions", `mentions-${chat.key}`, () => {
            this.#mentionLimits.set(chat.key, Math.min(limit + 20, mentions.length));
          }, { local: true }));
        }
      };
      details.open = expanded || !!this.#mentionLimits.get(chat.key);
      if (details.open) populate();
      details.addEventListener("toggle", () => {
        if (!details.isConnected) return;
        if (!expanded) this.#mentionLimits.set(chat.key, details.open ? this.#mentionLimits.get(chat.key) || 20 : 0);
        if (details.open && !list.childElementCount) populate();
        this.#reposition();
      });
      details.append(list); row.append(details);
    }
    return row;
  }

  #updateLetterSearch(query: string, filter: InboxFilter): void {
    const enabled = this.#inlineVisible && this.#current() && this.community.personalMail && this.community.personalMailLoaded &&
      query && (filter === 'mail' || filter === 'all' || filter === 'unread');
    const key = enabled ? JSON.stringify([this.community.client.origin, this.community.client.memberNumber,
      this.community.mailboxRecoveryGeneration, this.community.personalMailRevision, query]) : undefined;
    if (key === this.#letterSearch?.key) return;
    clearTimeout(this.#searchTimer);
    this.#letterSearch = undefined;
    if (!key) return;
    const search: { key:string; ids?: Set<number>; failed?: boolean } = { key };
    this.#letterSearch = search;
    this.#searchTimer = setTimeout(async () => {
      try {
        const ids = await this.community.searchLetters(query);
        if (this.#letterSearch === search) search.ids = ids;
      } catch {
        if (this.#letterSearch === search) search.failed = true;
      }
      if (this.#letterSearch === search && !this.#destroyed && this.#inlineVisible) this.#renderSurface(this.inlineElement, true);
    }, 150);
  }

  #mailTools(generation: string | undefined): HTMLElement {
    const input = element("input", { type: "checkbox" });
    input.checked = this.#unreadLettersOnly;
    input.dataset.mailAction = "letters-unread-only";
    input.addEventListener("change", () => { this.#unreadLettersOnly = input.checked; this.#restartResults(); this.render(); });
    const mark = this.#action("Mark mail as read", "letters-read-all", async () => {
      if (!this.#inlineVisible || this.#filter !== 'mail' || !this.community.personalMail) return;
      await this.community.readMail(undefined, generation, "mail");
    });
    mark.disabled ||= !this.community.mailbox.items.some(item => isPersonalLetter(item) && !item.read);
    return element("div", {className: "kl-inbox-mail-tools"}, element("label", {}, input, "Unread only"), mark);
  }

  #searchToolbar(): HTMLElement {
    const search = element("input", { type: "search", value: this.#query, placeholder: "Search Inbox", ariaLabel: "Search Inbox", maxLength: 160 });
    search.dataset.mailAction = "search";
    const update = () => {
      if (this.#query === search.value) return;
      this.#query = search.value;
      this.#restartResults();
      this.#renderSurface(this.inlineElement, true);
    };
    search.addEventListener("input", event => { if (!(event as InputEvent).isComposing) update(); });
    search.addEventListener("compositionend", update);
    const field = searchField(search, "Clear Inbox search");
    field.classList.add("kl-inbox-search");
    return element("div", { className: "kl-inbox-toolbar" }, field, this.#filters());
  }

  #renderSurface(surface: HTMLElement, inline: boolean): void {
    const preview = inline || !!this.options.platformPreview;
    const compact = preview && !inline;
    const filter = preview ? this.#filter : "all";
    const mailOnly = filter === "mail";
    const unavailableMail = mailOnly && !this.community.personalMail;
    const pageScroll = surface.scrollTop;
    const listScroll = surface.querySelector(".kl-mailbox-list")?.scrollTop ?? 0;
    const active = focusedElement(surface);
    const focused = active && surface.contains(active) ? active : null;
    const focusKey = focused?.dataset.mailAction;
    const toolbar = inline ? surface.querySelector(".kl-inbox-toolbar") : null;
    const generation = this.community.mailboxRecoveryGeneration;
    const snapshot = this.options.notifications?.snapshot;
    const paged = this.community.mailbox.nextCursor !== null;
    const title = inline ? element("h1", { text: "Inbox" }) : element("strong", { text: preview ? "Inbox" : "Mailbox" });
    if (inline) title.setAttribute("aria-label", this.options.showUnreadBadges?.() === false ? "Inbox" : `Inbox, ${this.#badgeCount()} unread`);
    else if (preview) { const badge = countBadge(); updateBadge(badge, this.#badgeCount()); title.append(badge); }
    const header = element("header", { className: "kl-mailbox-header" }, title);
    if (!unavailableMail) {
      const markAll = this.#action("Mark all read", "read-all", async () => {
        if (preview && this.#filter === "mail" && !this.community.personalMail) return;
        const { origin, memberNumber } = this.community.client;
        await (this.options.notifications?.markAllRead(generation) ??
          (generation ? this.community.readMail(undefined, generation) : this.community.readMail()));
        if (preview && this.#current() && origin === this.community.client.origin &&
          memberNumber === this.community.client.memberNumber && generation === this.community.mailboxRecoveryGeneration) {
          this.options.notify?.("Inbox marked as read.");
        }
      }, { icon: "read-all", iconOnly: true });
      markAll.disabled ||= this.#loading || (snapshot ? !snapshot.chats.some(chat => chat.unread > 0) && !snapshot.mail.some(item => !item.read) : this.community.mailbox.unread === 0);
      header.append(markAll);
      if (inline) header.append(this.#action("Refresh Inbox", "refresh", () => this.#refresh(), { icon: "refresh", iconOnly: true }));
    }
    if (preview && this.options.openAlerts) header.append(this.#action("Alert settings", "alerts", () => {
      if (!inline) this.close();
      this.options.openAlerts?.();
    }, { icon: "settings", iconOnly: true, local: true }));
    const popupFilters = preview && !inline ? this.#filters() : undefined;
    if (popupFilters) {
      popupFilters.id = "kl-inbox-popover-filters";
      popupFilters.hidden = !this.#filtersExpanded;
      const toggle = element("button", { type: "button", className: "kl-sidebar-new-chat kl-mailbox-icon-button",
        title: "Filter Inbox", ariaLabel: "Filter Inbox" }, kikiIcon("filter"));
      toggle.dataset.mailAction = "toggle-filters";
      toggle.dataset.inboxFiltered = String(this.#filter !== "all");
      toggle.setAttribute("aria-controls", popupFilters.id);
      toggle.setAttribute("aria-expanded", String(this.#filtersExpanded));
      toggle.addEventListener("click", () => {
        this.#filtersExpanded = !this.#filtersExpanded;
        popupFilters.hidden = !this.#filtersExpanded;
        toggle.setAttribute("aria-expanded", String(this.#filtersExpanded));
        this.#reposition();
      });
      header.append(toggle);
    }
    if (!inline) header.append(this.#action("Close", "close", () => this.close(), { icon: "close", iconOnly: true, local: true }));
    const status = element("p", { className: "kl-mailbox-status kl-cloud-status", role: "status" });
    const list = element("div", { className: "kl-mailbox-list" }); list.setAttribute("aria-busy", String(this.#loading && !unavailableMail));
    const showMail = (item: MailItem) => !compact || !snapshot?.mutedMail?.has(item.id);
    const sourceChats = mailOnly ? [] : (snapshot?.chats ?? []).filter(chat => !compact || (chat.alertEligible ?? !chat.muted));
    const mail = (snapshot?.mail ?? this.community.mailbox.items).filter(item => showMail(item) && (item.kind === "personal_mail"
      ? preview && this.#current() && !!this.community.personalMail && isPersonalLetter(item) && !this.community.client.isProfileBlocked?.(item.actor!)
      : !mailOnly));
    const emptyInbox = inline && !mail.length && !sourceChats.length;
    const showLoadError = emptyInbox && !unavailableMail && !this.#loading && !this.#actionError &&
      !!this.#loadError && this.#current();
    const error = this.#actionError || this.#loadError || this.community.mailboxError || this.community.error;
    if (!this.community.client.connected) status.textContent = `Connect your KikiLink profile to open ${preview ? "Inbox" : "Mailbox"}.`;
    else if (unavailableMail) status.textContent = "Mail is unavailable on this Cloud server.";
    else if (emptyInbox && this.#loading) status.textContent = "Loading notifications…";
    else if (showLoadError) {
      list.append(element("section", { className: "kl-mailbox-empty kl-inbox-load-error" },
        kikiIcon("notifications"),
        element("h2", { text: "Inbox couldn’t load" }),
        element("p", { className: "kl-inbox-load-diagnostic", role: "status", text: this.#loadError }),
        this.#action("Retry", "retry", () => this.#refresh())));
    } else if (error) {
      status.append(document.createTextNode(error), this.#action("Retry", "retry", () => this.#refresh()));
    } else if (this.#loading) status.textContent = "Loading notifications…";
    else if (!this.community.supported) status.textContent = `${preview ? "Inbox" : "Mailbox"} is not supported by this Cloud server yet.`;
    const query = inline ? searchText(this.#query.trim()) : "";
    if (inline) {
      this.#updateLetterSearch(this.#query.trim(), filter);
      if (this.#letterSearch && !this.#letterSearch.ids && !status.textContent) {
        if (this.#letterSearch.failed) status.append("Mail search could not load. ", this.#action("Retry", "letter-search-retry", () => {
          this.#letterSearch = undefined; this.render();
        }, {local:true}));
        else status.textContent = "Searching mail…";
      }
    }
    const matchesMail = (item: MailItem) => {
      if (!query || isPersonalLetter(item) && this.#letterSearch?.ids?.has(item.id)) return true;
      const { title, source, who, invitation } = this.#mailCopy(item, preview);
      const start = calendarEventStart(item);
      const date = start === undefined ? "" : ` Starts ${formatDateTime(start)}`;
      return searchText(`${title} ${source} ${who}${date} ${invitation ?? ""}`).includes(query);
    };
    const mentionMail = filter === "mentions" ? [...new Map([...mail, ...sourceChats.flatMap(chat => (chat.mentionItems ?? []).filter(showMail))].map(item => [item.id, item])).values()] : mail;
    const items = mentionMail.filter(item => matchesMail(item) && (filter === "all" || mailOnly && (!this.#unreadLettersOnly || !item.read) || filter === "unread" && !item.read ||
      filter === "mentions" && item.kind === "mention" || filter === "invitations" &&
      (item.pending && INVITATION_KINDS.has(item.kind) || item.kind === "group_invitation" && item.targetType === "group")));
    const chats = sourceChats.flatMap((chat): ChatRow[] => {
      const unread = Math.min(chat.noticeUnread ?? chat.unread, compact ? chat.alertUnread ?? chat.unread : chat.unread);
      const at = compact ? chat.alertAt ?? chat.at : chat.at;
      const children = chat.mentionItems ?? [];
      const mentions = children.filter(item => showMail(item) && (filter !== "unread" || !item.read));
      const mentionCount = compact ? Math.max(0, chat.mentions - children.filter(item => !item.read && !showMail(item)).length) : chat.mentions;
      // Exact mentions have their own entries on the Mentions tab. A hidden child must not reappear as a chat fallback.
      if (filter === "invitations" || filter === "unread" && !unread || filter === "mentions" && (!mentionCount || children.length)) return [];
      const row = { chat, at, unread, mentionCount, mentions, expanded: false };
      if (!query || searchText(`${chat.title} ${this.#chatSource(chat)}`).includes(query)) return [row];
      const matchingMentions = mentions.filter(matchesMail);
      return matchingMentions.length ? [{ ...row, mentions: matchingMentions, expanded: true }] : [];
    });
    if (!items.length && !chats.length && !status.textContent && !showLoadError) {
      const label = query ? (paged ? "No matching updates loaded." : "No matching updates.") :
        mailOnly ? "No mail yet." : filter === "invitations" ? (paged ? "No invitations loaded." : "No invitations yet.") :
        filter === "mentions" ? (paged ? "No mentions loaded." : "No mentions yet.") :
        filter === "unread" && paged ? "No unread notifications loaded." : "You're all caught up.";
      const empty = element("div", { className: "kl-mailbox-empty" },
        inline ? kikiIcon("notifications") : preview ? undefined : kikiIcon("read-all"),
        element(inline ? "h2" : "strong", { text: label }));
      if (inline && (query || filter !== "all")) {
        const showAll = element("button", { type: "button", className: "kl-text-button", text: "Show all" });
        showAll.addEventListener("click", () => {
          this.#filter = "all";
          this.#query = ""; this.#unreadLettersOnly = false;
          this.#restartResults();
          const input = this.inlineElement.querySelector<HTMLInputElement>('.kl-inbox-search input');
          if (input) input.value = "";
          this.render();
          input?.focus({ preventScroll: true });
        });
        empty.append(showAll);
      }
      list.append(empty);
      if (!preview) list.firstElementChild?.append(element("span", { text: "New KikiLink notifications will appear here." }));
    }
    if (inline && !items.length && !chats.length && this.#loading && status.textContent === "Loading notifications…") {
      status.classList.add("kl-sr-only");
      const skeleton = element("div", { className: "kl-inbox-rows kl-inbox-loading", ariaHidden: "true" });
      for (let i = 0; i < 4; i++) skeleton.append(element("div", { className: "kl-inbox-skeleton" },
        element("span"), element("div", {}, element("span"), element("span"))));
      list.append(skeleton);
    }
    const rows = [...items.map(item => ({ at: isPersonalLetter(item) ? item.createdAt : item.updatedAt, node: () => this.#row(item, surface, preview) })),
      ...chats.map(row => ({ at: row.at, node: () => this.#chatRow(row, surface) }))];
    const sorted = snapshot || preview && this.community.personalMail || compact ? rows.sort((a,b) => b.at - a.at) : rows;
    const displayed = compact ? sorted.slice(0, 6) : snapshot ? sorted.slice(0, this.#displayLimit) : sorted;
    const truncated = displayed.length < sorted.length;
    const rowsTarget = preview && sorted.length ? element("div", { className: "kl-inbox-rows", ariaLabel: "Inbox updates", role: "region" }) : list;
    for (const item of displayed) rowsTarget.append(item.node());
    if (rowsTarget !== list) list.append(rowsTarget);
    if (!unavailableMail) {
      if (!compact) {
        const moreLabel = mailOnly ? "Load more letters" : "Load more updates";
        if (truncated) list.append(pageAction(this.#action(moreLabel, "more", () => { this.#displayLimit += 40; this.render(); }, { local: true })));
        else if (paged && !showLoadError) list.append(pageAction(this.#action(moreLabel, "more", () => this.community.moreMail())));
      }
      if (!mailOnly && this.#groupActions && this.#groupUI) {
        const session = inline ? this.#inlineSession : this.#bellSession;
        const current = () => this.#current() && generation === this.community.mailboxRecoveryGeneration &&
          (inline ? this.#inlineVisible && session === this.#inlineSession : this.element.open && session === this.#bellSession);
        list.append(this.#groupActions.surface(inline ? 'inline' : 'popover', this.#groupUI, current, entry => {
          const response = preview && entry ? this.#invitationAttempts.get(entry) : undefined;
          return response ? this.#confirmedInvitation(response, current) : this.community.refresh();
        }));
      }
      if (!mailOnly) {
        const friendReview=inline?this.#friendReviewInline:this.#friendReviewPopover;
        renderFriendActionQueue(friendReview,this.community);list.append(friendReview);
      }
    }
    const footer = !inline && preview && this.options.openInbox ? element("footer", { className: "kl-inbox-footer" },
      sectionLink(this.#action("Open Inbox", "open-inbox", () => { this.close(); this.options.openInbox?.(); }, { local: true }))) : undefined;
    if (toolbar) {
      surface.querySelector(".kl-mailbox-header")?.replaceWith(header);
      surface.querySelector(".kl-mailbox-status")?.replaceWith(status);
      surface.querySelector(".kl-mailbox-list")?.replaceWith(list);
      for (const control of toolbar.querySelectorAll<HTMLElement>("[data-inbox-filter]"))
        control.setAttribute("aria-pressed", String(control.dataset.inboxFilter === this.#filter));
    } else {
      const children = [header, ...(inline ? [status, this.#searchToolbar(), this.#resultsStatus] :
        popupFilters ? [popupFilters, status] : [status]), list, ...(footer ? [footer] : [])];
      if (this.toastHost.parentElement === surface) {
        for (const child of [...surface.children]) if (child !== this.toastHost) child.remove();
        this.toastHost.before(...children);
      } else surface.replaceChildren(...children);
    }
    if (inline) {
      const tools = surface.querySelector(".kl-inbox-toolbar")!;
      const previous = tools.querySelector(".kl-inbox-mail-tools");
      if (mailOnly && !unavailableMail) {
        const controls = this.#mailTools(generation);
        if (previous) previous.replaceWith(controls); else tools.append(controls);
      } else previous?.remove();
      const count = displayed.length;
      const announcement = this.#inlineVisible && this.community.mailboxLoaded && !status.textContent && !showLoadError && this.#current()
        ? `${count} ${count === 1 ? "update" : "updates"}${paged || truncated ? " shown" : ""}` : "";
      if (this.#resultsStatus.textContent !== announcement) this.#resultsStatus.textContent = announcement;
    }
    if (inline) surface.scrollTop = pageScroll;
    list.scrollTop = listScroll;
    if (focusKey && !toolbar?.contains(focused)) {
      const popoverControls = !inline && preview ? this.#popoverControls() : undefined;
      const actions = popoverControls ?? [...surface.querySelectorAll<HTMLButtonElement | HTMLInputElement>("[data-mail-action]")]
        .filter(control => !control.disabled);
      const replacement = actions.find(control => control.dataset.mailAction === focusKey);
      (replacement ?? surface.querySelector<HTMLButtonElement>('.kl-inbox-filters:not([hidden]) [aria-pressed="true"]') ??
        (popoverControls ? popoverControls[0] : surface.querySelector<HTMLButtonElement>('button:not(:disabled)')))?.focus({ preventScroll: true });
    }
  }

  render(): void {
    if (this.#destroyed) return;
    if(!this.community.client.connected)this.#groupActions?.clear();
    else if(this.community.groupManagementSource)this.#groupActions?.observe(this.community.groupManagementSource);
    const keys = new Set(this.options.notifications?.snapshot.chats.filter(chat => chat.mentionItems?.length).map(chat => chat.key));
    for (const key of this.#mentionLimits.keys()) if (!keys.has(key)) this.#mentionLimits.delete(key);
    this.#updateTrigger();
    this.#renderSurface(this.element, false);
    if (this.#inlineVisible) this.#renderSurface(this.inlineElement, true);
    this.#reposition();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true; clearTimeout(this.#searchTimer); this.#letterSearch = undefined; this.#unsubscribe(); this.#unsubscribeProfiles?.(); this.close(false);this.#groupActions?.clear();this.#groupUI?.destroy();
    this.element.remove(); this.inlineElement.remove(); this.button.remove();
  }
}
