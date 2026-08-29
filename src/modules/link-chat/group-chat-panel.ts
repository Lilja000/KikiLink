import type { BCAdapter } from "../../bc/adapter";
import type { PresenceSnapshot } from "../../core/types";
import type { LinkPresenceService } from "../link-presence/link-presence-service";
import {
  GROUP_MESSAGE_MAX_CONTENT,
  GROUP_TITLE_MAX_CHARS,
  type GroupChatService,
  type GroupChatUpdate,
  type GroupConversation,
  type GroupDeliveryFailure,
  type GroupMessage,
  type GroupSendResult,
} from "./group-chat-service";

const GROUP_MIN_REMOTE_MEMBERS = 2;
const GROUP_MAX_REMOTE_MEMBERS = 4;
const DRAFT_SAVE_DELAY_MS = 180;
const INITIAL_MESSAGE_RENDER_LIMIT = 120;
const MESSAGE_RENDER_PAGE_SIZE = 100;
const GROUP_STACK_VISIBLE_MEMBERS = 3;

export type GroupChatPanelAdapter = Pick<
  BCAdapter,
  "getKnownContacts" | "getMemberName" | "getOwnMemberNumber" | "isKnownFriend"
>;

export type GroupChatPanelPresence = Pick<
  LinkPresenceService,
  "get" | "hasGroupChatPeer" | "request" | "requestMany" | "subscribe"
> & {
  /** Added by group protocol v2; absence is treated as incompatible for new invitations. */
  hasGroupRelayPeer?(memberNumber: number): boolean;
};

export type GroupChatPanelFeedbackTone = "info" | "success" | "warning" | "error";

export interface GroupChatPanelFeedback {
  tone: GroupChatPanelFeedbackTone;
  message: string;
  groupId?: string;
  handedOffTo?: number[];
  failed?: GroupDeliveryFailure[];
  relayViaCreator?: number;
  relayTargets?: number[];
  unreachable?: number[];
}

export interface GroupChatPanelMemberTarget {
  memberNumber: number;
  memberName: string;
}

export interface GroupChatPanelOptions {
  onActivate?: (groupId: string) => void;
  onClose?: () => void;
  onFeedback?: (feedback: GroupChatPanelFeedback) => void;
  confirmRemove?: (group: GroupConversation) => boolean | Promise<boolean>;
  /** Uses LinkChat's privacy-aware avatar renderer when the panel is hosted by the full view. */
  renderMemberAvatar?: (target: HTMLElement, member: GroupChatPanelMemberTarget) => void;
  /** Adds the host's click, keyboard, context-menu, and long-press profile behavior. */
  bindMemberProfileTarget?: (
    target: HTMLButtonElement,
    member: GroupChatPanelMemberTarget,
  ) => void;
  /** Keeps the group composer consistent with the direct-chat Enter preference. */
  getEnterToSend?: () => boolean;
}

export interface GroupChatPanelNodes {
  sidebarSection: HTMLElement;
  chatPane: HTMLElement;
  newGroupDialog: HTMLDialogElement;
}

interface ContactOption {
  memberNumber: number;
  memberName: string;
}

type CreateDialogStage = "select" | "confirm";

/**
 * Embeddable group-chat UI. The host chooses where to mount the three exposed nodes, while this
 * class owns rendering, subscriptions, drafts, confirmation, and delivery feedback.
 */
export class GroupChatPanel {
  readonly sidebarSection: HTMLElement;
  readonly chatPane: HTMLElement;
  readonly newGroupDialog: HTMLDialogElement;
  readonly newGroupButton: HTMLButtonElement;

  readonly #groupList: HTMLElement;
  readonly #sidebarEmpty: HTMLElement;
  readonly #groupCount: HTMLElement;
  readonly #aggregateUnread: HTMLElement;
  readonly #paneTitle: HTMLElement;
  readonly #memberSummary: HTMLElement;
  readonly #participantStrip: HTMLElement;
  readonly #transcript: HTMLElement;
  readonly #loadOlderButton: HTMLButtonElement;
  readonly #messageLog: HTMLElement;
  readonly #composer: HTMLTextAreaElement;
  readonly #counter: HTMLElement;
  readonly #sendButton: HTMLButtonElement;
  readonly #pinButton: HTMLButtonElement;
  readonly #removeButton: HTMLButtonElement;
  readonly #paneFeedback: HTMLElement;
  readonly #dialogHeading: HTMLElement;
  readonly #dialogBody: HTMLElement;
  readonly #dialogActions: HTMLElement;
  readonly #dialogFeedback: HTMLElement;
  readonly #unsubscribeGroup: () => void;
  readonly #unsubscribePresence: () => void;

  #currentGroupId: string | undefined;
  #contacts: ContactOption[] = [];
  #selectedMembers = new Set<number>();
  #dialogStage: CreateDialogStage = "select";
  #requestedTitle = "";
  #contactQuery = "";
  #groupQuery = "";
  #creating = false;
  #sending = false;
  #paneActionBusy = false;
  #destroyed = false;
  #draftTimer: ReturnType<typeof setTimeout> | undefined;
  #pendingDraft: { groupId: string; value: string } | undefined;
  #messageRenderLimit = INITIAL_MESSAGE_RENDER_LIMIT;
  #messageRenderGroupId: string | undefined;

  constructor(
    private readonly adapter: GroupChatPanelAdapter,
    private readonly service: GroupChatService,
    private readonly presence: GroupChatPanelPresence,
    private readonly options: GroupChatPanelOptions = {},
  ) {
    this.newGroupButton = button("kl-group-new", "New group", "Create a group chat");
    this.newGroupButton.addEventListener("click", () => this.openNewGroupDialog());

    const sidebarHeading = node("h2", "kl-group-sidebar-title", "Groups");
    this.#groupCount = node("span", "kl-group-sidebar-count", "0");
    this.#groupCount.setAttribute("aria-label", "0 group chats");
    this.#aggregateUnread = node("span", "kl-group-sidebar-unread", "0");
    this.#aggregateUnread.hidden = true;
    this.#aggregateUnread.setAttribute("aria-label", "0 unread group messages");
    const sidebarSummary = node("div", "kl-group-sidebar-summary");
    sidebarSummary.append(sidebarHeading, this.#groupCount, this.#aggregateUnread);
    const sidebarHeader = node("div", "kl-group-sidebar-header");
    sidebarHeader.append(sidebarSummary, this.newGroupButton);
    this.#groupList = node("div", "kl-group-list");
    this.#groupList.setAttribute("role", "list");
    this.#groupList.setAttribute("aria-label", "Group conversations");
    this.#sidebarEmpty = node(
      "p",
      "kl-group-list-empty",
      "No group chats yet. Create one with 2–4 relay-capable KikiLink contacts.",
    );
    this.sidebarSection = node("section", "kl-group-sidebar");
    this.sidebarSection.setAttribute("aria-label", "Group chats");
    this.sidebarSection.append(sidebarHeader, this.#groupList, this.#sidebarEmpty);

    const closeButton = button("kl-group-pane-close", "Close", "Close group chat");
    closeButton.addEventListener("click", () => this.closeActive());
    this.#paneTitle = node("h2", "kl-group-pane-title", "Group chat");
    this.#memberSummary = node("p", "kl-group-member-summary");
    this.#participantStrip = node("div", "kl-group-participant-strip");
    this.#participantStrip.setAttribute("role", "list");
    this.#participantStrip.setAttribute("aria-label", "Group members");
    const titleBlock = node("div", "kl-group-pane-heading");
    titleBlock.append(
      node("span", "kl-group-pane-eyebrow", "Group chat"),
      this.#paneTitle,
      this.#memberSummary,
      this.#participantStrip,
    );
    this.#pinButton = button("kl-group-pin", "Pin", "Pin this group");
    this.#pinButton.addEventListener("click", () => void this.#togglePinned());
    this.#removeButton = button("kl-group-remove", "Remove", "Remove this group chat");
    this.#removeButton.addEventListener("click", () => void this.#removeActive());
    const paneActions = node("div", "kl-group-pane-actions");
    paneActions.append(this.#pinButton, this.#removeButton, closeButton);
    const paneHeader = node("header", "kl-group-pane-header");
    paneHeader.append(titleBlock, paneActions);

    this.#messageLog = node("div", "kl-group-message-log");
    this.#messageLog.id = uniqueDomId("kl-group-message-log");
    this.#messageLog.setAttribute("role", "log");
    this.#messageLog.setAttribute("aria-live", "polite");
    this.#messageLog.setAttribute("aria-relevant", "additions text");
    this.#messageLog.tabIndex = 0;
    this.#loadOlderButton = button(
      "kl-group-load-older",
      "Load older messages",
      "Load older group messages",
    );
    this.#loadOlderButton.setAttribute("aria-controls", this.#messageLog.id);
    this.#loadOlderButton.hidden = true;
    this.#loadOlderButton.addEventListener("click", () => this.#loadOlderMessages());
    this.#transcript = node("div", "kl-group-transcript");
    this.#transcript.append(this.#loadOlderButton, this.#messageLog);

    const composerLabel = node("label", "kl-group-composer-label", "Message the group");
    this.#composer = document.createElement("textarea");
    this.#composer.className = "kl-group-composer";
    this.#composer.id = uniqueDomId("kl-group-composer");
    this.#composer.maxLength = GROUP_MESSAGE_MAX_CONTENT;
    this.#composer.rows = 3;
    this.#composer.placeholder = "Write a group message…";
    composerLabel.htmlFor = this.#composer.id;
    this.#composer.addEventListener("input", () => this.#onComposerInput());
    this.#composer.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      const modifiedSend = event.ctrlKey || event.metaKey;
      const enterToSend = safeBooleanOption(this.options.getEnterToSend, true);
      if (!modifiedSend && (!enterToSend || event.shiftKey || event.altKey)) return;
      event.preventDefault();
      void this.#sendActiveMessage();
    });
    this.#counter = node(
      "span",
      "kl-group-composer-counter",
      `0/${GROUP_MESSAGE_MAX_CONTENT}`,
    );
    this.#counter.setAttribute("aria-live", "polite");
    this.#sendButton = button("kl-group-send", "Send", "Send group message");
    this.#sendButton.disabled = true;
    this.#sendButton.addEventListener("click", () => void this.#sendActiveMessage());
    const composerFooter = node("div", "kl-group-composer-footer");
    composerFooter.append(this.#counter, this.#sendButton);
    const composerArea = node("div", "kl-group-composer-area");
    composerArea.append(composerLabel, this.#composer, composerFooter);

    this.#paneFeedback = node("p", "kl-group-feedback");
    this.#paneFeedback.setAttribute("role", "status");
    this.#paneFeedback.setAttribute("aria-live", "polite");
    this.chatPane = node("section", "kl-group-pane");
    this.chatPane.setAttribute("aria-label", "Group chat conversation");
    this.chatPane.hidden = true;
    this.chatPane.append(paneHeader, this.#transcript, composerArea, this.#paneFeedback);

    this.#dialogHeading = node("h2", "kl-group-dialog-title", "New group chat");
    this.#dialogHeading.id = uniqueDomId("kl-group-dialog-title");
    this.#dialogBody = node("div", "kl-group-dialog-body");
    this.#dialogFeedback = node("p", "kl-group-dialog-feedback");
    this.#dialogFeedback.setAttribute("role", "status");
    this.#dialogFeedback.setAttribute("aria-live", "polite");
    this.#dialogActions = node("div", "kl-group-dialog-actions");
    this.newGroupDialog = document.createElement("dialog");
    this.newGroupDialog.className = "kl-group-dialog";
    this.newGroupDialog.setAttribute("aria-labelledby", this.#dialogHeading.id);
    this.newGroupDialog.append(
      this.#dialogHeading,
      this.#dialogBody,
      this.#dialogFeedback,
      this.#dialogActions,
    );
    this.newGroupDialog.addEventListener("cancel", (event) => {
      if (this.#creating) event.preventDefault();
    });
    this.newGroupDialog.addEventListener("close", () => {
      if (!this.#creating) this.#resetCreateDialog();
    });

    this.#unsubscribeGroup = this.service.subscribe((update) => this.#onGroupUpdate(update));
    this.#unsubscribePresence = this.presence.subscribe((memberNumber) =>
      this.#onPresenceUpdate(memberNumber),
    );
    this.refresh();
    const persistence = this.service.getPersistenceState();
    if (persistence.degraded) {
      this.#reportPersistenceState(true, persistence.pendingChanges);
    }
  }

  get nodes(): GroupChatPanelNodes {
    return {
      sidebarSection: this.sidebarSection,
      chatPane: this.chatPane,
      newGroupDialog: this.newGroupDialog,
    };
  }

  get activeGroupId(): string | undefined {
    return this.#currentGroupId;
  }

  /** Applies the host chat search to group titles, members, numbers, and the latest preview. */
  setSearchQuery(value: string): void {
    const query = value.trim().toLocaleLowerCase();
    if (query === this.#groupQuery) return;
    this.#groupQuery = query;
    if (!this.#destroyed) this.#renderSidebar();
  }

  /** Opens discovery/selection. Network group invitations are not sent until the review is confirmed. */
  openNewGroupDialog(): void {
    if (this.#destroyed || this.#creating) return;
    this.#resetCreateDialog();
    this.#contacts = this.#knownContacts();
    try {
      this.presence.requestMany(
        this.#contacts
          .filter((contact) => this.#isKnownFriend(contact.memberNumber))
          .map((contact) => contact.memberNumber),
      );
    } catch {
      // Discovery may be unavailable during BC startup; already-detected peers remain selectable.
    }
    this.#renderSelectionStage();
    if (this.newGroupDialog.open) return;
    try {
      this.newGroupDialog.showModal();
    } catch {
      this.newGroupDialog.setAttribute("open", "");
    }
  }

  async activate(groupId: string): Promise<boolean> {
    if (this.#destroyed) return false;
    const group = this.service.getGroup(groupId);
    if (!group) {
      this.#report({ tone: "error", message: "This group chat is no longer available." });
      return false;
    }
    const changedGroup = this.#currentGroupId !== groupId;
    if (changedGroup) this.#flushDraft();
    this.#currentGroupId = groupId;
    if (changedGroup) {
      // Message identifiers are unique only inside a group. Force the transcript renderer to
      // discard the previous group's keyed nodes before it considers reusing message IDs.
      this.#messageRenderGroupId = undefined;
      this.#messageRenderLimit = INITIAL_MESSAGE_RENDER_LIMIT;
    }
    this.chatPane.hidden = false;
    this.#clearPaneFeedback();
    this.#renderActiveGroup(changedGroup, true);
    // Let the host switch away from a direct conversation before markRead yields. Otherwise the
    // direct and group panes can both remain visible while persistence work is still pending.
    this.options.onActivate?.(groupId);
    try {
      await this.service.markRead(groupId);
    } catch {
      // A concurrent removal is handled by the service update or the second lookup below.
    }
    if (this.#currentGroupId !== groupId) return false;
    if (!this.service.getGroup(groupId)) {
      this.#closeActive(false);
      return false;
    }
    this.#renderSidebar();
    this.#renderActiveGroup(false, false);
    this.#composer.focus();
    return true;
  }

  closeActive(): void {
    this.#closeActive(true);
  }

  /** Clears unread only when the host has made the already-selected group pane visible again. */
  async markVisibleActiveRead(): Promise<void> {
    const groupId = this.#currentGroupId;
    if (this.#destroyed || !groupId || this.chatPane.hidden) return;
    try {
      await this.service.markRead(groupId);
    } catch {
      return;
    }
    if (this.#currentGroupId !== groupId) return;
    this.#renderSidebar();
    this.#renderActiveGroup(false, false);
  }

  refresh(): void {
    if (this.#destroyed) return;
    this.#renderSidebar();
    if (this.#currentGroupId) {
      const hasPendingDraft = this.#pendingDraft?.groupId === this.#currentGroupId;
      this.#renderActiveGroup(!this.#isComposerFocused() && !hasPendingDraft, false);
    }
    if (this.newGroupDialog.open && this.#dialogStage === "select") {
      this.#contacts = this.#knownContacts();
      this.#renderContactOptions();
    }
  }

  /** Commits the panel's shorter UI debounce before a page lifecycle flush. */
  flushPendingDraft(): Promise<void> {
    return this.#flushDraft();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#flushDraft();
    this.#destroyed = true;
    this.#unsubscribeGroup();
    this.#unsubscribePresence();
    try {
      if (this.newGroupDialog.open) this.newGroupDialog.close();
    } catch {
      this.newGroupDialog.removeAttribute("open");
    }
    this.sidebarSection.remove();
    this.chatPane.remove();
    this.newGroupDialog.remove();
  }

  #renderSidebar(): void {
    const allGroups = this.service.listGroups();
    const aggregateUnread = allGroups.reduce((total, group) => total + group.unread, 0);
    this.sidebarSection.dataset.groupCount = String(allGroups.length);
    this.sidebarSection.dataset.unread = String(aggregateUnread);
    this.sidebarSection.dataset.hasUnread = String(aggregateUnread > 0);
    this.#groupCount.textContent = String(allGroups.length);
    this.#groupCount.setAttribute(
      "aria-label",
      `${allGroups.length} group chat${plural(allGroups.length)}`,
    );
    this.#aggregateUnread.hidden = aggregateUnread === 0;
    this.#aggregateUnread.textContent = aggregateUnread > 99 ? "99+" : String(aggregateUnread);
    this.#aggregateUnread.setAttribute(
      "aria-label",
      `${aggregateUnread} unread group message${plural(aggregateUnread)}`,
    );
    const groups = allGroups.filter((group) => this.#matchesGroupQuery(group));
    const root = this.#groupList.getRootNode() as Document | ShadowRoot;
    const focusedGroupId = root.activeElement instanceof HTMLElement &&
      this.#groupList.contains(root.activeElement)
      ? root.activeElement.dataset.groupId
      : undefined;
    const existingEntries = new Map<string, HTMLElement>();
    for (const entry of this.#groupList.querySelectorAll<HTMLElement>(".kl-group-list-entry")) {
      const groupId = entry.querySelector<HTMLElement>("[data-group-id]")?.dataset.groupId;
      if (groupId) existingEntries.set(groupId, entry);
    }
    this.#sidebarEmpty.hidden = groups.length > 0;
    this.#sidebarEmpty.textContent = this.#groupQuery
      ? "No group chats match this search."
      : "No group chats yet. Create one with 2–4 relay-capable KikiLink contacts.";
    const fragment = document.createDocumentFragment();
    for (const group of groups) {
      const listEntry = existingEntries.get(group.groupId) ?? this.#createGroupListEntry();
      this.#updateGroupListEntry(listEntry, group);
      fragment.append(listEntry);
    }
    this.#groupList.replaceChildren(fragment);
    if (focusedGroupId) {
      this.#groupList
        .querySelector<HTMLButtonElement>(`[data-group-id="${CSS.escape(focusedGroupId)}"]`)
        ?.focus();
    }
  }

  #createGroupListEntry(): HTMLElement {
    const row = button("kl-group-list-item", "");
    row.addEventListener("click", () => {
      const groupId = row.dataset.groupId;
      if (groupId) void this.activate(groupId);
    });
    const listEntry = node("div", "kl-group-list-entry");
    listEntry.setAttribute("role", "listitem");
    listEntry.append(row);
    return listEntry;
  }

  #updateGroupListEntry(listEntry: HTMLElement, group: GroupConversation): void {
    const row = listEntry.querySelector<HTMLButtonElement>(".kl-group-list-item");
    if (!row) return;
    row.dataset.groupId = group.groupId;
    row.dataset.active = String(group.groupId === this.#currentGroupId);
    row.dataset.unread = String(group.unread);
    row.dataset.hasUnread = String(group.unread > 0);
    if (group.groupId === this.#currentGroupId) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
    const unreadText = group.unread > 0 ? `, ${group.unread} unread` : "";
    const pinnedText = group.pinned ? ", pinned" : "";
    row.setAttribute(
      "aria-label",
      `${group.title}, ${group.memberNumbers.length} members${pinnedText}${unreadText}`,
    );

    const avatars = this.#groupAvatarStack(
      group,
      row.querySelector<HTMLElement>(".kl-group-avatar-stack") ?? undefined,
    );
    const heading = node("span", "kl-group-list-name", group.title);
    const badges = node("span", "kl-group-list-badges");
    if (group.pinned) {
      const pinned = node("span", "kl-group-list-pinned", "Pinned");
      pinned.title = "Pinned group";
      badges.append(pinned);
    }
    if (group.unread > 0) {
      const unread = node("span", "kl-group-list-unread", String(group.unread));
      unread.setAttribute("aria-label", `${group.unread} unread messages`);
      badges.append(unread);
    }
    const topLine = node("span", "kl-group-list-topline");
    topLine.append(heading, badges);
    const preview = node(
      "span",
      "kl-group-list-preview",
      group.draft
        ? `Draft: ${group.draft}`
        : group.lastMessage
          ? this.#groupPreview(group)
          : `${group.memberNumbers.length} members`,
    );
    if (group.draft) preview.dataset.draft = "true";
    const copy = node("span", "kl-group-list-copy");
    copy.append(topLine, preview);
    const previousCopy = row.querySelector(".kl-group-list-copy");
    if (previousCopy) previousCopy.replaceWith(copy);
    else row.append(copy);
    if (avatars.parentElement !== row) row.prepend(avatars);
  }

  #matchesGroupQuery(group: GroupConversation): boolean {
    if (!this.#groupQuery) return true;
    const searchable = [
      group.title,
      group.lastMessage,
      ...group.memberNumbers.map((memberNumber) => String(memberNumber)),
      ...group.memberNumbers.map((memberNumber) => this.#memberName(group, memberNumber)),
    ];
    return searchable.some((value) => value.toLocaleLowerCase().includes(this.#groupQuery));
  }

  #groupAvatarStack(group: GroupConversation, existing?: HTMLElement): HTMLElement {
    const stack = existing ?? node("span", "kl-group-avatar-stack");
    stack.setAttribute("aria-hidden", "true");
    const ownMemberNumber = this.#ownMemberNumber();
    const members = group.memberNumbers.filter((memberNumber) => memberNumber !== ownMemberNumber);
    const visible = (members.length > 0 ? members : group.memberNumbers)
      .slice(0, GROUP_STACK_VISIBLE_MEMBERS);
    const signature = JSON.stringify(visible.map((memberNumber) => [
      memberNumber,
      this.#memberName(group, memberNumber),
    ]));
    if (stack.dataset.members === signature) return stack;
    stack.dataset.members = signature;
    stack.replaceChildren();
    for (const memberNumber of visible) {
      const member = {
        memberNumber,
        memberName: this.#memberName(group, memberNumber),
      };
      const item = node("span", "kl-group-avatar-stack-item");
      this.#setMemberPresentationData(item, member);
      item.append(this.#memberAvatar(member), this.#memberPresenceDot(memberNumber));
      stack.append(item);
    }
    const remaining = members.length - visible.length;
    if (remaining > 0) {
      stack.append(node("span", "kl-group-avatar-stack-more", `+${remaining}`));
    }
    return stack;
  }

  #renderParticipantStrip(group: GroupConversation): void {
    const members = group.memberNumbers.map((memberNumber) => ({
      memberNumber,
      memberName: this.#memberName(group, memberNumber),
    }));
    const signature = JSON.stringify(members);
    if (this.#participantStrip.dataset.members === signature) return;
    this.#participantStrip.dataset.members = signature;
    const fragment = document.createDocumentFragment();
    for (const member of members) {
      const listItem = node("span", "kl-group-participant-item");
      listItem.setAttribute("role", "listitem");
      listItem.append(this.#memberProfileTarget(member, "kl-group-participant"));
      fragment.append(listItem);
    }
    this.#participantStrip.replaceChildren(fragment);
  }

  #memberProfileTarget(
    member: GroupChatPanelMemberTarget,
    contextClass: string,
  ): HTMLElement {
    const interactive = typeof this.options.bindMemberProfileTarget === "function";
    const status = presenceLabel(this.#presenceSnapshot(member.memberNumber));
    const className = `kl-group-member-target ${contextClass}`;
    const target = interactive
      ? button(className, "", `Open KikiLink profile for ${member.memberName}, ${status}`)
      : node("span", className);
    this.#setMemberPresentationData(target, member);
    target.title = interactive
      ? `${member.memberName} · ${status} · Open profile`
      : `${member.memberName} · ${status}`;
    target.append(this.#memberAvatar(member), this.#memberPresenceDot(member.memberNumber));
    if (target instanceof HTMLButtonElement) {
      try {
        this.options.bindMemberProfileTarget?.(target, { ...member });
      } catch {
        target.disabled = true;
        target.title = `${member.memberName} · Profile actions are temporarily unavailable`;
      }
    }
    return target;
  }

  #memberAvatar(member: GroupChatPanelMemberTarget): HTMLElement {
    const avatar = node("span", "kl-avatar kl-group-member-avatar", avatarText(member.memberName));
    avatar.dataset.groupMemberAvatar = "true";
    try {
      this.options.renderMemberAvatar?.(avatar, { ...member });
    } catch {
      avatar.textContent = avatarText(member.memberName);
    }
    return avatar;
  }

  #memberPresenceDot(memberNumber: number): HTMLElement {
    const dot = node("span", "kl-presence-dot kl-group-member-presence");
    dot.dataset.status = this.#presenceSnapshot(memberNumber)?.status ?? "unknown";
    dot.setAttribute("aria-hidden", "true");
    return dot;
  }

  #setMemberPresentationData(
    target: HTMLElement,
    member: GroupChatPanelMemberTarget,
  ): void {
    target.dataset.groupMemberPresentation = "true";
    target.dataset.groupMemberNumber = String(member.memberNumber);
    target.dataset.groupMemberName = member.memberName;
  }

  #groupPreview(group: GroupConversation): string {
    const own = this.#ownMemberNumber();
    const author = own !== undefined && group.lastSenderNumber === own
      ? "You"
      : group.lastSenderNumber === undefined
        ? ""
        : this.#memberName(group, group.lastSenderNumber);
    const prefix = author ? `${author}: ` : "";
    const available = Math.max(0, 72 - prefix.length);
    const content = group.lastMessage.length > available
      ? `${group.lastMessage.slice(0, Math.max(0, available - 1))}…`
      : group.lastMessage;
    return `${prefix}${content}`;
  }

  #renderActiveGroup(syncDraft: boolean, syncMessages = true): void {
    const groupId = this.#currentGroupId;
    if (!groupId) {
      this.chatPane.hidden = true;
      return;
    }
    const group = this.service.getGroup(groupId);
    if (!group) {
      this.#closeActive(true);
      return;
    }
    this.chatPane.hidden = false;
    this.chatPane.setAttribute("aria-label", `Group chat: ${group.title}`);
    this.#paneTitle.textContent = group.title;
    const members = group.memberNumbers.map((memberNumber) => this.#memberName(group, memberNumber));
    this.#memberSummary.textContent = `${group.memberNumbers.length} members · ${members.join(", ")}`;
    this.#renderParticipantStrip(group);
    this.#pinButton.textContent = group.pinned ? "Unpin" : "Pin";
    this.#pinButton.setAttribute("aria-label", `${group.pinned ? "Unpin" : "Pin"} ${group.title}`);
    this.#pinButton.disabled = this.#paneActionBusy;
    this.#removeButton.disabled = this.#paneActionBusy;
    if (syncMessages) this.#renderMessages(group);
    if (syncDraft) this.#composer.value = group.draft;
    this.#updateComposerControls();
  }

  #renderMessages(group: GroupConversation): void {
    const changedRenderGroup = this.#messageRenderGroupId !== group.groupId;
    if (changedRenderGroup) {
      this.#messageRenderGroupId = group.groupId;
      this.#messageRenderLimit = INITIAL_MESSAGE_RENDER_LIMIT;
      this.#messageLog.replaceChildren();
      this.#messageLog.scrollTop = 0;
    }
    const shouldFollowNewest =
      changedRenderGroup ||
      this.#messageLog.childElementCount === 0 ||
      this.#messageLog.scrollHeight - this.#messageLog.scrollTop - this.#messageLog.clientHeight < 48;
    const messages = this.service.getMessages(group.groupId);
    const hiddenCount = Math.max(0, messages.length - this.#messageRenderLimit);
    const visibleMessages = messages.slice(-this.#messageRenderLimit);
    this.#loadOlderButton.hidden = hiddenCount === 0;
    this.#loadOlderButton.textContent = hiddenCount > 0
      ? `Load older messages (${Math.min(hiddenCount, MESSAGE_RENDER_PAGE_SIZE)})`
      : "Load older messages";
    this.#loadOlderButton.setAttribute(
      "aria-label",
      hiddenCount > 0
        ? `Load ${Math.min(hiddenCount, MESSAGE_RENDER_PAGE_SIZE)} older group messages`
        : "No older group messages",
    );
    if (messages.length === 0) {
      if (!this.#messageLog.querySelector(".kl-group-message-empty")) {
        this.#messageLog.replaceChildren(
          node("p", "kl-group-message-empty", "No messages yet. Say hello to the group."),
        );
      }
      return;
    }

    this.#messageLog.querySelector(".kl-group-message-empty")?.remove();
    const existing = new Map<string, HTMLElement>();
    for (const item of this.#messageLog.querySelectorAll<HTMLElement>("[data-message-id]")) {
      const messageId = item.dataset.messageId;
      if (messageId) existing.set(messageId, item);
    }
    const desiredIds = visibleMessages.map((message) => message.id);
    const existingIds = [...existing.keys()];
    const canAppend =
      existingIds.length <= desiredIds.length &&
      existingIds.every((id, index) => desiredIds[index] === id);
    const canPrepend =
      existingIds.length <= desiredIds.length &&
      existingIds.every(
        (id, index) => desiredIds[desiredIds.length - existingIds.length + index] === id,
      );

    if (canAppend) {
      const fragment = document.createDocumentFragment();
      for (const message of visibleMessages.slice(existingIds.length)) {
        fragment.append(this.#createMessageNode(group, message));
      }
      this.#messageLog.append(fragment);
    } else if (canPrepend) {
      const oldHeight = this.#messageLog.scrollHeight;
      const addedCount = desiredIds.length - existingIds.length;
      const fragment = document.createDocumentFragment();
      for (const message of visibleMessages.slice(0, addedCount)) {
        fragment.append(this.#createMessageNode(group, message));
      }
      this.#messageLog.insertBefore(fragment, this.#messageLog.firstChild);
      this.#messageLog.scrollTop += this.#messageLog.scrollHeight - oldHeight;
    } else {
      const desiredSet = new Set(desiredIds);
      for (const [messageId, item] of existing) {
        if (!desiredSet.has(messageId)) item.remove();
      }
      const fragment = document.createDocumentFragment();
      for (const message of visibleMessages) {
        fragment.append(existing.get(message.id) ?? this.#createMessageNode(group, message));
      }
      this.#messageLog.replaceChildren(fragment);
    }
    if (shouldFollowNewest) this.#messageLog.scrollTop = this.#messageLog.scrollHeight;
  }

  #createMessageNode(
    group: GroupConversation,
    message: GroupMessage,
  ): HTMLElement {
    const item = node("article", "kl-group-message");
    item.dataset.direction = message.direction;
    item.dataset.messageId = message.id;
    item.dataset.groupMemberNumber = String(message.senderNumber);
    const memberName = this.#memberName(group, message.senderNumber);
    const author = message.direction === "outgoing" ? "You" : memberName;
    const authorTarget = this.#memberProfileTarget(
      { memberNumber: message.senderNumber, memberName },
      "kl-group-message-profile",
    );
    const authorNode = node("strong", "kl-group-message-author", author);
    const timestamp = document.createElement("time");
    timestamp.className = "kl-group-message-time";
    timestamp.dateTime = new Date(message.sentAt).toISOString();
    timestamp.textContent = formatMessageTime(message.sentAt);
    const meta = node("header", "kl-group-message-meta");
    meta.append(authorNode, timestamp);
    const content = node("p", "kl-group-message-content", message.content);
    item.append(authorTarget, meta, content);
    return item;
  }

  #loadOlderMessages(): void {
    const groupId = this.#currentGroupId;
    if (!groupId || this.#loadOlderButton.hidden) return;
    const group = this.service.getGroup(groupId);
    if (!group) return;
    this.#messageRenderLimit = Math.min(
      this.service.getMessages(groupId).length,
      this.#messageRenderLimit + MESSAGE_RENDER_PAGE_SIZE,
    );
    this.#renderMessages(group);
    if (this.#loadOlderButton.hidden) this.#messageLog.focus();
    else this.#loadOlderButton.focus();
  }

  #onComposerInput(): void {
    if (!this.#currentGroupId) return;
    if (this.#composer.value.length > GROUP_MESSAGE_MAX_CONTENT) {
      this.#composer.value = this.#composer.value.slice(0, GROUP_MESSAGE_MAX_CONTENT);
    }
    this.#updateComposerControls();
    this.#scheduleDraft(this.#currentGroupId, this.#composer.value);
  }

  #updateComposerControls(): void {
    const length = this.#composer.value.length;
    this.#counter.textContent = `${length}/${GROUP_MESSAGE_MAX_CONTENT}`;
    this.#counter.dataset.nearLimit = String(length >= GROUP_MESSAGE_MAX_CONTENT - 20);
    this.#sendButton.disabled =
      this.#sending || !this.#currentGroupId || this.#composer.value.trim().length === 0;
    this.#composer.disabled = this.#sending || !this.#currentGroupId;
  }

  #isComposerFocused(): boolean {
    const root = this.#composer.getRootNode() as Document | ShadowRoot;
    return root.activeElement === this.#composer;
  }

  #scheduleDraft(groupId: string, value: string): void {
    this.#pendingDraft = { groupId, value };
    if (this.#draftTimer !== undefined) clearTimeout(this.#draftTimer);
    this.#draftTimer = setTimeout(() => {
      this.#draftTimer = undefined;
      this.#flushDraft();
    }, DRAFT_SAVE_DELAY_MS);
  }

  #flushDraft(): Promise<void> {
    if (this.#draftTimer !== undefined) clearTimeout(this.#draftTimer);
    this.#draftTimer = undefined;
    const pending = this.#pendingDraft;
    this.#pendingDraft = undefined;
    if (!pending) return Promise.resolve();
    return this.service.setDraft(pending.groupId, pending.value).then(() => undefined).catch(() => {
      // Draft loss after a concurrent group removal is harmless and should not interrupt typing.
    });
  }

  async #sendActiveMessage(): Promise<void> {
    const groupId = this.#currentGroupId;
    const value = this.#composer.value;
    if (!groupId || this.#sending || !value.trim()) return;
    this.#flushDraft();
    this.#sending = true;
    this.#updateComposerControls();
    this.#clearPaneFeedback();
    try {
      const result = await this.service.sendMessage(groupId, value);
      if (result.persisted) {
        await this.service.setDraft(groupId, "");
        if (this.#currentGroupId === groupId) {
          this.#composer.value = "";
          this.#renderActiveGroup(false, false);
        }
      }
      if (this.#currentGroupId === groupId) this.#reportSendResult(groupId, result);
    } catch (error) {
      if (this.#currentGroupId === groupId) {
        this.#report({
          tone: "error",
          message: errorMessage(error, "The group message could not be sent."),
          groupId,
        });
      }
    } finally {
      this.#sending = false;
      this.#updateComposerControls();
      if (this.#currentGroupId === groupId) this.#composer.focus();
    }
  }

  #reportSendResult(groupId: string, result: GroupSendResult): void {
    const relayTargets = result.relayTargets ?? [];
    const unreachable = result.unreachable ?? [];
    const deliveryDetails = {
      groupId,
      handedOffTo: [...result.handedOffTo],
      failed: result.failed.map((failure) => ({ ...failure })),
      ...(result.relayViaCreator === undefined
        ? {}
        : { relayViaCreator: result.relayViaCreator }),
      ...(relayTargets.length === 0 ? {} : { relayTargets: [...relayTargets] }),
      ...(unreachable.length === 0 ? {} : { unreachable: [...unreachable] }),
    };
    if (!result.persisted) {
      this.#report({
        tone: "error",
        message: unreachable.length > 0
          ? `Message not sent. ${unreachable.length} group member${plural(unreachable.length)} had no direct or creator-relay route.`
          : "Message not sent. KikiLink could not hand it to Bondage Club for any group member.",
        ...deliveryDetails,
      });
      return;
    }
    const directText = `${result.handedOffTo.length} direct local handoff${plural(result.handedOffTo.length)}`;
    const relayText = relayTargets.length > 0 && result.relayViaCreator !== undefined
      ? ` ${relayTargets.length} non-friend or out-of-room participant${plural(relayTargets.length)} routed via the group creator (#${result.relayViaCreator}); the creator must be online with KikiLink active.`
      : "";
    if (unreachable.length > 0) {
      this.#report({
        tone: "warning",
        message: `Message saved after ${directText}.${relayText} ${unreachable.length} participant${plural(unreachable.length)} remain${unreachable.length === 1 ? "s" : ""} unreachable. Delivery is not confirmed.`
          .replace(/\s+/gu, " "),
        ...deliveryDetails,
      });
      return;
    }
    this.#report({
      tone: "success",
      message: `Message saved after ${directText}.${relayText} Delivery is not confirmed.`
        .replace(/\s+/gu, " "),
      ...deliveryDetails,
    });
  }

  async #togglePinned(): Promise<void> {
    const groupId = this.#currentGroupId;
    if (!groupId || this.#paneActionBusy) return;
    this.#paneActionBusy = true;
    this.#renderActiveGroup(false, false);
    try {
      const pinned = await this.service.togglePinned(groupId);
      this.#report({
        tone: "success",
        message: pinned ? "Group pinned." : "Group unpinned.",
        groupId,
      });
    } catch (error) {
      this.#report({
        tone: "error",
        message: errorMessage(error, "The group could not be updated."),
        groupId,
      });
    } finally {
      this.#paneActionBusy = false;
      this.refresh();
    }
  }

  async #removeActive(): Promise<void> {
    const groupId = this.#currentGroupId;
    const group = groupId ? this.service.getGroup(groupId) : undefined;
    if (!groupId || !group || this.#paneActionBusy) return;
    const confirmed = this.options.confirmRemove
      ? await this.options.confirmRemove(group)
      : typeof window !== "undefined" && window.confirm(`Remove “${group.title}” from KikiLink?`);
    if (!confirmed || this.#currentGroupId !== groupId) return;
    this.#paneActionBusy = true;
    this.#renderActiveGroup(false, false);
    try {
      const removed = await this.service.removeGroup(groupId);
      const durable = !this.service.getPersistenceState().pendingChanges;
      if (removed && this.#currentGroupId === groupId) this.#closeActive(true);
      this.#report({
        tone: removed && durable ? "success" : "warning",
        message: removed
          ? durable
            ? "Group removed from this device."
            : "Group removed for this session, but browser storage did not retain the change. It may reappear after reload; KikiLink will retry."
          : "This group was already removed.",
        groupId,
      });
    } catch (error) {
      this.#report({
        tone: "error",
        message: errorMessage(error, "The group could not be removed."),
        groupId,
      });
    } finally {
      this.#paneActionBusy = false;
      this.refresh();
    }
  }

  #closeActive(notify: boolean): void {
    const groupId = this.#currentGroupId;
    if (!groupId) return;
    this.#flushDraft();
    this.#currentGroupId = undefined;
    this.#messageRenderGroupId = undefined;
    this.#messageRenderLimit = INITIAL_MESSAGE_RENDER_LIMIT;
    this.chatPane.hidden = true;
    this.#participantStrip.replaceChildren();
    delete this.#participantStrip.dataset.members;
    this.#loadOlderButton.hidden = true;
    this.#messageLog.replaceChildren();
    this.#composer.value = "";
    this.#updateComposerControls();
    this.#renderSidebar();
    if (notify) this.options.onClose?.();
    const returnTarget = [...this.#groupList.querySelectorAll<HTMLButtonElement>("[data-group-id]")]
      .find((candidate) => candidate.dataset.groupId === groupId);
    (returnTarget ?? this.newGroupButton).focus();
  }

  #onGroupUpdate(update: GroupChatUpdate): void {
    if (this.#destroyed) return;
    if (update.kind === "persistence") {
      this.#reportPersistenceState(update.state.degraded, update.state.pendingChanges);
      return;
    }
    this.#renderSidebar();
    if (update.kind === "cleared") {
      this.#closeActive(true);
      return;
    }
    if (update.kind === "group-removed" && update.groupId === this.#currentGroupId) {
      this.#closeActive(true);
      return;
    }
    if (!("groupId" in update) || update.groupId !== this.#currentGroupId) return;
    if (update.kind === "message") {
      this.#renderActiveGroup(false, true);
    } else if (update.kind === "group-updated") {
      this.#renderActiveGroup(false, false);
    }
  }

  #onPresenceUpdate(memberNumber?: number): void {
    if (this.#destroyed) return;
    this.#refreshMemberPresentations(memberNumber);
    if (!this.newGroupDialog.open) return;
    this.#contacts = this.#knownContacts();
    if (this.#dialogStage === "select") this.#renderContactOptions();
  }

  #refreshMemberPresentations(memberNumber?: number): void {
    const selector = memberNumber === undefined
      ? "[data-group-member-presentation='true']"
      : `[data-group-member-presentation='true'][data-group-member-number="${CSS.escape(String(memberNumber))}"]`;
    for (const target of [
      ...this.sidebarSection.querySelectorAll<HTMLElement>(selector),
      ...this.chatPane.querySelectorAll<HTMLElement>(selector),
      ...this.newGroupDialog.querySelectorAll<HTMLElement>(selector),
    ]) {
      const candidate = Number(target.dataset.groupMemberNumber);
      if (!Number.isSafeInteger(candidate) || candidate <= 0) continue;
      const memberName = target.dataset.groupMemberName?.trim() || `Member ${candidate}`;
      const member = { memberNumber: candidate, memberName };
      const avatar = target.querySelector<HTMLElement>("[data-group-member-avatar='true']");
      if (avatar) {
        try {
          this.options.renderMemberAvatar?.(avatar, { ...member });
        } catch {
          avatar.textContent = avatarText(memberName);
        }
      }
      const snapshot = this.#presenceSnapshot(candidate);
      const status = presenceLabel(snapshot);
      for (const dot of target.querySelectorAll<HTMLElement>(".kl-group-member-presence")) {
        dot.dataset.status = snapshot?.status ?? "unknown";
      }
      if (target instanceof HTMLButtonElement) {
        target.setAttribute("aria-label", `Open KikiLink profile for ${memberName}, ${status}`);
        target.title = `${memberName} · ${status} · Open profile`;
      } else {
        target.title = `${memberName} · ${status}`;
      }
    }
  }

  #renderSelectionStage(): void {
    this.#dialogStage = "select";
    this.#dialogHeading.textContent = "New group chat";
    this.#dialogFeedback.textContent = "";
    this.#dialogFeedback.dataset.tone = "";

    const titleLabel = node("label", "kl-group-dialog-label", "Group title (optional)");
    const titleInput = document.createElement("input");
    titleInput.className = "kl-group-title-input";
    titleInput.type = "text";
    titleInput.maxLength = GROUP_TITLE_MAX_CHARS;
    titleInput.value = this.#requestedTitle;
    titleInput.placeholder = "Weekend crew";
    titleInput.id = uniqueDomId("kl-group-title");
    titleLabel.htmlFor = titleInput.id;
    titleInput.addEventListener("input", () => {
      this.#requestedTitle = sliceCompleteUtf16(titleInput.value, GROUP_TITLE_MAX_CHARS);
    });

    const searchLabel = node("label", "kl-group-dialog-label", "Find a KikiLink contact");
    const searchInput = document.createElement("input");
    searchInput.className = "kl-group-contact-search";
    searchInput.type = "search";
    searchInput.value = this.#contactQuery;
    searchInput.placeholder = "Name or member number";
    searchInput.id = uniqueDomId("kl-group-contact-search");
    searchLabel.htmlFor = searchInput.id;
    searchInput.addEventListener("input", () => {
      this.#contactQuery = searchInput.value;
      this.#renderContactOptions();
    });

    const help = node(
      "p",
      "kl-group-dialog-help",
      "Choose 2–4 relay-capable friends using the current KikiLink group protocol. Your group will have 3–5 members including you. Compatibility is checked again before sending.",
    );
    const selection = node("p", "kl-group-selection-status");
    selection.setAttribute("aria-live", "polite");
    const contactList = node("div", "kl-group-contact-list");
    contactList.setAttribute("role", "list");
    contactList.dataset.contactList = "true";
    this.#dialogBody.replaceChildren(
      titleLabel,
      titleInput,
      searchLabel,
      searchInput,
      help,
      selection,
      contactList,
    );

    const cancel = button("kl-group-dialog-cancel", "Cancel");
    cancel.addEventListener("click", () => this.#closeCreateDialog());
    const review = button("kl-group-dialog-review", "Review group");
    review.dataset.review = "true";
    review.addEventListener("click", () => {
      if (!this.#validSelection()) return;
      this.#renderConfirmationStage();
    });
    this.#dialogActions.replaceChildren(cancel, review);
    this.#renderContactOptions();
  }

  #renderContactOptions(): void {
    if (this.#dialogStage !== "select") return;
    const list = this.#dialogBody.querySelector<HTMLElement>("[data-contact-list='true']");
    const selection = this.#dialogBody.querySelector<HTMLElement>(".kl-group-selection-status");
    const review = this.#dialogActions.querySelector<HTMLButtonElement>("[data-review='true']");
    if (!list || !selection || !review) return;

    const compatible = this.#contacts.filter((contact) => this.#isCompatible(contact.memberNumber));
    const compatibleNumbers = new Set(compatible.map((contact) => contact.memberNumber));
    for (const memberNumber of [...this.#selectedMembers]) {
      if (!compatibleNumbers.has(memberNumber)) this.#selectedMembers.delete(memberNumber);
    }
    const normalizedQuery = this.#contactQuery.trim().toLocaleLowerCase();
    if (normalizedQuery) {
      // The global discovery queue is intentionally bounded. Directly request a handful of
      // searched friends so contacts beyond its first page are still discoverable; Presence's
      // own cooldown deduplicates repeated input events.
      const searchedFriends = this.#contacts
        .filter((contact) =>
          this.#isKnownFriend(contact.memberNumber) &&
          (
            contact.memberName.toLocaleLowerCase().includes(normalizedQuery) ||
            String(contact.memberNumber).includes(normalizedQuery)
          ),
        )
        .slice(0, 8);
      for (const contact of searchedFriends) {
        try {
          this.presence.request(contact.memberNumber);
        } catch {
          break;
        }
      }
    }
    const visible = compatible.filter((contact) =>
      !normalizedQuery ||
      contact.memberName.toLocaleLowerCase().includes(normalizedQuery) ||
      String(contact.memberNumber).includes(normalizedQuery),
    );
    const root = list.getRootNode() as Document | ShadowRoot;
    const focusedElement = root.activeElement instanceof HTMLElement && list.contains(root.activeElement)
      ? root.activeElement
      : undefined;
    const focusedMember = focusedElement?.dataset.memberNumber ??
      focusedElement?.dataset.groupMemberNumber;
    const focusedProfile = focusedElement?.classList.contains("kl-group-contact-profile") === true;
    list.replaceChildren();
    if (visible.length === 0) {
      const message = compatible.length === 0
        ? "No relay-capable contacts detected yet. Keep this window open while KikiLink checks for current versions."
        : "No relay-capable contacts match this search.";
      list.append(node("p", "kl-group-contact-empty", message));
    } else {
      for (const contact of visible) {
        const selected = this.#selectedMembers.has(contact.memberNumber);
        const member = {
          memberNumber: contact.memberNumber,
          memberName: contact.memberName,
        };
        const contactButton = button("kl-group-contact", "");
        contactButton.dataset.memberNumber = String(contact.memberNumber);
        contactButton.setAttribute("aria-pressed", String(selected));
        contactButton.disabled = !selected && this.#selectedMembers.size >= GROUP_MAX_REMOTE_MEMBERS;
        const name = node("span", "kl-group-contact-name", contact.memberName);
        const detail = node(
          "span",
          "kl-group-contact-detail",
          `#${contact.memberNumber} · ${presenceLabel(this.#presenceSnapshot(contact.memberNumber))}`,
        );
        contactButton.append(name, detail);
        contactButton.addEventListener("click", () => {
          if (this.#selectedMembers.has(contact.memberNumber)) {
            this.#selectedMembers.delete(contact.memberNumber);
          } else if (this.#selectedMembers.size < GROUP_MAX_REMOTE_MEMBERS) {
            this.#selectedMembers.add(contact.memberNumber);
          }
          this.#renderContactOptions();
        });
        const listItem = node("div", "kl-group-contact-item");
        listItem.setAttribute("role", "listitem");
        listItem.append(
          this.#memberProfileTarget(member, "kl-group-contact-profile"),
          contactButton,
        );
        list.append(listItem);
      }
    }
    selection.textContent = `${this.#selectedMembers.size} of 2–4 contacts selected`;
    review.disabled = !this.#validSelection();
    if (focusedMember) {
      list
        .querySelector<HTMLButtonElement>(
          focusedProfile
            ? `.kl-group-contact-profile[data-group-member-number="${CSS.escape(focusedMember)}"]`
            : `[data-member-number="${CSS.escape(focusedMember)}"]`,
        )
        ?.focus();
    }
  }

  #renderConfirmationStage(): void {
    if (!this.#validSelection()) {
      this.#renderSelectionStage();
      return;
    }
    this.#dialogStage = "confirm";
    this.#dialogHeading.textContent = "Confirm group chat";
    this.#dialogFeedback.textContent = "";
    const selected = this.#selectedContacts();
    const title = this.#requestedTitle.trim() || defaultTitle(selected);
    const summary = node("p", "kl-group-confirm-summary", title);
    const memberCount = node(
      "p",
      "kl-group-confirm-count",
      `${selected.length + 1} members including you`,
    );
    const memberList = node("ul", "kl-group-confirm-members");
    for (const contact of selected) {
      const member = { memberNumber: contact.memberNumber, memberName: contact.memberName };
      const listItem = node("li", "kl-group-confirm-member");
      listItem.append(
        this.#memberProfileTarget(member, "kl-group-confirm-profile"),
        node(
          "span",
          "kl-group-confirm-member-copy",
          `${contact.memberName} (#${contact.memberNumber})`,
        ),
      );
      memberList.append(listItem);
    }
    const notice = node(
      "p",
      "kl-group-confirm-notice",
      "No invitations have been sent yet. Confirming will send one private KikiLink packet to each selected member.",
    );
    this.#dialogBody.replaceChildren(summary, memberCount, memberList, notice);

    const back = button("kl-group-dialog-back", "Back");
    back.addEventListener("click", () => this.#renderSelectionStage());
    const confirm = button("kl-group-dialog-confirm", "Create & send invitations");
    confirm.dataset.confirmCreate = "true";
    confirm.addEventListener("click", () => void this.#confirmCreate());
    this.#dialogActions.replaceChildren(back, confirm);
  }

  async #confirmCreate(): Promise<void> {
    if (this.#creating || this.#dialogStage !== "confirm") return;
    if (!this.#validSelection()) {
      this.#dialogFeedback.textContent =
        "One or more contacts are no longer detected. Please review the selection again.";
      this.#dialogFeedback.dataset.tone = "error";
      this.#renderSelectionStage();
      return;
    }
    this.#creating = true;
    this.#setDialogDisabled(true);
    this.#dialogFeedback.textContent = "Creating group and handing invitations to Bondage Club…";
    this.#dialogFeedback.dataset.tone = "info";
    try {
      const result = await this.service.createGroup(
        [...this.#selectedMembers],
        this.#requestedTitle,
      );
      this.#creating = false;
      this.#closeCreateDialog();
      await this.activate(result.group.groupId);
      if (result.failed.length > 0) {
        const message = result.handedOffTo.length > 0
          ? `Group created. Handed ${result.handedOffTo.length} invitation${plural(result.handedOffTo.length)} to the local Bondage Club client; ${result.failed.length} local handoff${plural(result.failed.length)} failed.`
          : "Group created locally, but no invitation could be handed to Bondage Club.";
        this.#report({
          tone: result.handedOffTo.length > 0 ? "warning" : "error",
          message,
          groupId: result.group.groupId,
          handedOffTo: [...result.handedOffTo],
          failed: result.failed.map((failure) => ({ ...failure })),
        });
      } else {
        this.#report({
          tone: "success",
          message: `Group created. Handed ${result.handedOffTo.length} invitation${plural(result.handedOffTo.length)} to the local Bondage Club client. Delivery is not confirmed.`,
          groupId: result.group.groupId,
          handedOffTo: [...result.handedOffTo],
          failed: [],
        });
      }
    } catch (error) {
      this.#creating = false;
      this.#setDialogDisabled(false);
      this.#dialogFeedback.textContent = errorMessage(error, "The group could not be created.");
      this.#dialogFeedback.dataset.tone = "error";
    }
  }

  #setDialogDisabled(disabled: boolean): void {
    for (const control of this.newGroupDialog.querySelectorAll<HTMLElement>("button, input")) {
      if (control instanceof HTMLButtonElement || control instanceof HTMLInputElement) {
        control.disabled = disabled;
      }
    }
  }

  #closeCreateDialog(): void {
    if (this.#creating) return;
    try {
      this.newGroupDialog.close();
    } catch {
      this.newGroupDialog.removeAttribute("open");
      this.#resetCreateDialog();
    }
  }

  #resetCreateDialog(): void {
    this.#selectedMembers.clear();
    this.#dialogStage = "select";
    this.#requestedTitle = "";
    this.#contactQuery = "";
    this.#creating = false;
    this.#dialogFeedback.textContent = "";
    this.#dialogFeedback.dataset.tone = "";
    this.#dialogBody.replaceChildren();
    this.#dialogActions.replaceChildren();
  }

  #validSelection(): boolean {
    if (
      this.#selectedMembers.size < GROUP_MIN_REMOTE_MEMBERS ||
      this.#selectedMembers.size > GROUP_MAX_REMOTE_MEMBERS
    ) {
      return false;
    }
    return [...this.#selectedMembers].every((memberNumber) => this.#isCompatible(memberNumber));
  }

  #selectedContacts(): ContactOption[] {
    const selected = this.#selectedMembers;
    return this.#contacts.filter((contact) => selected.has(contact.memberNumber));
  }

  #knownContacts(): ContactOption[] {
    const ownMemberNumber = this.#ownMemberNumber();
    if (ownMemberNumber === undefined) return [];
    const byNumber = new Map<number, ContactOption>();
    try {
      for (const contact of this.adapter.getKnownContacts()) {
        if (
          !Number.isSafeInteger(contact.memberNumber) ||
          contact.memberNumber <= 0 ||
          contact.memberNumber === ownMemberNumber
        ) {
          continue;
        }
        const name = contact.memberName.trim() || `Member ${contact.memberNumber}`;
        byNumber.set(contact.memberNumber, { memberNumber: contact.memberNumber, memberName: name });
      }
    } catch {
      return [];
    }
    return [...byNumber.values()].sort((left, right) =>
      left.memberName.localeCompare(right.memberName) || left.memberNumber - right.memberNumber,
    );
  }

  #isCompatible(memberNumber: number): boolean {
    try {
      return this.#isKnownFriend(memberNumber) &&
        this.presence.hasGroupChatPeer(memberNumber) &&
        typeof this.presence.hasGroupRelayPeer === "function" &&
        this.presence.hasGroupRelayPeer(memberNumber);
    } catch {
      return false;
    }
  }

  #isKnownFriend(memberNumber: number): boolean {
    try {
      return this.adapter.isKnownFriend(memberNumber);
    } catch {
      return false;
    }
  }

  #ownMemberNumber(): number | undefined {
    try {
      const memberNumber = this.adapter.getOwnMemberNumber();
      return Number.isSafeInteger(memberNumber) && memberNumber > 0 ? memberNumber : undefined;
    } catch {
      return undefined;
    }
  }

  #presenceSnapshot(memberNumber: number): PresenceSnapshot | undefined {
    try {
      return this.presence.get(memberNumber);
    } catch {
      return undefined;
    }
  }

  #memberName(group: GroupConversation, memberNumber: number): string {
    const stored = group.memberNames[String(memberNumber)]?.trim();
    if (stored) return stored;
    try {
      return this.adapter.getMemberName(memberNumber).trim() || `Member ${memberNumber}`;
    } catch {
      return `Member ${memberNumber}`;
    }
  }

  #clearPaneFeedback(): void {
    this.#paneFeedback.textContent = "";
    this.#paneFeedback.dataset.tone = "";
  }

  #reportPersistenceState(degraded: boolean, pendingChanges: boolean): void {
    this.#report({
      tone: degraded ? "warning" : "success",
      message: degraded
        ? pendingChanges
          ? "Group changes are available for this session, but browser storage did not save them. KikiLink will retry."
          : "Group chat storage could not be read safely. Changes are paused to protect saved groups; KikiLink will retry."
        : "Group chat storage recovered. Pending changes were saved.",
      ...(this.#currentGroupId ? { groupId: this.#currentGroupId } : {}),
    });
  }

  #report(feedback: GroupChatPanelFeedback): void {
    this.#paneFeedback.textContent = feedback.message;
    this.#paneFeedback.dataset.tone = feedback.tone;
    this.options.onFeedback?.(feedback);
  }
}

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

function button(className: string, text: string, ariaLabel?: string): HTMLButtonElement {
  const result = node("button", className, text);
  result.type = "button";
  if (ariaLabel) result.setAttribute("aria-label", ariaLabel);
  return result;
}

let domId = 0;

function uniqueDomId(prefix: string): string {
  domId += 1;
  return `${prefix}-${domId}`;
}

function formatMessageTime(value: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function presenceLabel(snapshot: PresenceSnapshot | undefined): string {
  switch (snapshot?.status) {
    case "online":
      return "online";
    case "idle":
      return "idle";
    case "dnd":
      return "do not disturb";
    case "offline":
      return "offline";
    default:
      return "KikiLink detected";
  }
}

function avatarText(name: string): string {
  const trimmed = name.trim();
  return trimmed ? [...trimmed][0]?.toLocaleUpperCase() ?? "?" : "?";
}

function safeBooleanOption(option: (() => boolean) | undefined, fallback: boolean): boolean {
  if (!option) return fallback;
  try {
    return option();
  } catch {
    return fallback;
  }
}

function defaultTitle(contacts: readonly ContactOption[]): string {
  const canonicalNames = [...contacts]
    .sort((left, right) => left.memberNumber - right.memberNumber)
    .map((contact) => contact.memberName);
  const normalized = (`Group with ${canonicalNames.join(", ")}`)
    .replace(/\s+/gu, " ")
    .trim();
  return sliceCompleteUtf16(normalized, GROUP_TITLE_MAX_CHARS) || "Group chat";
}

function sliceCompleteUtf16(value: string, maxLength: number): string {
  const sliced = value.slice(0, maxLength);
  const finalUnit = sliced.charCodeAt(sliced.length - 1);
  return finalUnit >= 0xd800 && finalUnit <= 0xdbff ? sliced.slice(0, -1) : sliced;
}

function plural(value: number): string {
  return value === 1 ? "" : "s";
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
