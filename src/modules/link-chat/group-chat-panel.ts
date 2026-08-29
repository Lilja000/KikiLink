import type { BCAdapter } from "../../bc/adapter";
import type { PresenceSnapshot } from "../../core/types";
import type { LinkPresenceService } from "../link-presence/link-presence-service";
import { kikiIcon } from "./icons";
import {
  GROUP_MESSAGE_MAX_CONTENT,
  GROUP_TITLE_MAX_CHARS,
  type GroupChatService,
  type GroupChatUpdate,
  type GroupConversation,
  type GroupDeliveryFailure,
  type GroupMessage,
  type GroupMutationResult,
  type GroupSendResult,
} from "./group-chat-service";

const GROUP_MIN_REMOTE_MEMBERS = 2;
const GROUP_MAX_REMOTE_MEMBERS = 4;
const DRAFT_SAVE_DELAY_MS = 180;
const INITIAL_MESSAGE_RENDER_LIMIT = 120;
const MESSAGE_RENDER_PAGE_SIZE = 100;
const GROUP_STACK_VISIBLE_MEMBERS = 3;
const GROUP_MAX_MEMBERS = 5;
const GROUP_MIN_MEMBERS = 3;
const GROUP_MENU_LONG_PRESS_MS = 520;
const GROUP_MENU_LONG_PRESS_MOVE_PX = 9;
const GROUP_MENU_CLICK_SUPPRESSION_MS = 700;

export type GroupChatPanelAdapter = Pick<
  BCAdapter,
  "getKnownContacts" | "getMemberName" | "getOwnMemberNumber" | "isKnownFriend"
>;

export type GroupChatPanelPresence = Pick<
  LinkPresenceService,
  "get" | "hasGroupChatPeer" | "request" | "requestMany" | "subscribe"
> & {
  /** Managed protocol v3; absence is treated as incompatible for new invitations. */
  hasGroupManagedPeer?(memberNumber: number): boolean;
  /** Kept for older hosts, but deliberately insufficient for creating a managed group. */
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
  /** Lets a host provide one unified direct/group list without rendering the legacy sidebar. */
  renderSidebar?: boolean;
  /** Optional host hooks; the panel falls back to the corresponding service mutation. */
  onRenameGroup?: GroupTextMutationCallback;
  onSetGroupAvatar?: GroupTextMutationCallback;
  onSetGroupOutlineColor?: GroupTextMutationCallback;
  onAddGroupMember?: GroupMemberMutationCallback;
  onKickGroupMember?: GroupMemberMutationCallback;
  onConvertLegacyGroup?: GroupIdMutationCallback;
  /** Opens the host's privacy-aware file picker/uploader for a group avatar. */
  onPickGroupAvatar?: (groupId: string, returnFocus: HTMLElement) => void | Promise<void>;
  /** Opens the host's shared image composer with a typed group destination. */
  onAttachImage?: (groupId: string, returnFocus: HTMLElement) => void | Promise<void>;
  /** Reuses the host's safe link/image renderer without duplicating remote-load policy here. */
  renderMessageBody?: (message: GroupMessage) => Node | undefined;
  /** Uses the host's privacy-aware group image renderer when available. */
  renderGroupAvatar?: (target: HTMLElement, group: GroupConversation) => void;
  /** Exposes one explicit per-session reveal when the host's preview policy is ask-first. */
  canRevealGroupAvatar?: (group: GroupConversation) => boolean;
  onRevealGroupAvatar?: (groupId: string) => void;
  confirmKickMember?: (
    group: GroupConversation,
    member: GroupChatPanelMemberTarget,
  ) => boolean | Promise<boolean>;
}

type GroupPanelMutationValue = GroupMutationResult | void;
type GroupIdMutationCallback = (
  groupId: string,
) => GroupPanelMutationValue | Promise<GroupPanelMutationValue>;
type GroupTextMutationCallback = (
  groupId: string,
  value: string,
) => GroupPanelMutationValue | Promise<GroupPanelMutationValue>;
type GroupMemberMutationCallback = (
  groupId: string,
  memberNumber: number,
) => GroupPanelMutationValue | Promise<GroupPanelMutationValue>;

export interface GroupChatPanelNodes {
  sidebarSection: HTMLElement;
  chatPane: HTMLElement;
  newGroupDialog: HTMLDialogElement;
  groupActionMenuLayer: HTMLDialogElement;
  groupDetailsDialog: HTMLDialogElement;
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
  readonly groupActionMenuLayer: HTMLDialogElement;
  readonly groupDetailsDialog: HTMLDialogElement;
  readonly newGroupButton: HTMLButtonElement;

  readonly #groupList: HTMLElement;
  readonly #sidebarEmpty: HTMLElement;
  readonly #groupCount: HTMLElement;
  readonly #aggregateUnread: HTMLElement;
  readonly #paneTitle: HTMLElement;
  readonly #headerAvatar: HTMLElement;
  readonly #creatorBadge: HTMLElement;
  readonly #memberSummary: HTMLElement;
  readonly #participantStrip: HTMLElement;
  readonly #transcript: HTMLElement;
  readonly #loadOlderButton: HTMLButtonElement;
  readonly #messageLog: HTMLElement;
  readonly #composer: HTMLTextAreaElement;
  readonly #counter: HTMLElement;
  readonly #sendButton: HTMLButtonElement;
  readonly #attachImageButton: HTMLButtonElement;
  readonly #paneMenuButton: HTMLButtonElement;
  readonly #paneFeedback: HTMLElement;
  readonly #dialogHeading: HTMLElement;
  readonly #dialogBody: HTMLElement;
  readonly #dialogActions: HTMLElement;
  readonly #dialogFeedback: HTMLElement;
  readonly #groupActionMenu: HTMLElement;
  readonly #groupDetailsTitle: HTMLElement;
  readonly #groupDetailsBody: HTMLElement;
  readonly #groupDetailsActions: HTMLElement;
  readonly #unsubscribeGroup: () => void;
  readonly #unsubscribePresence: () => void;
  readonly #groupActionTargetBindings = new WeakMap<
    HTMLElement,
    { cleanup: () => void; reference: WeakRef<HTMLElement> }
  >();
  readonly #groupActionTargetReferences = new Set<WeakRef<HTMLElement>>();
  readonly #suppressedGroupTargetClicks = new WeakMap<HTMLElement, number>();

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
  #detailsActionBusy = false;
  #destroyed = false;
  #draftTimer: ReturnType<typeof setTimeout> | undefined;
  #contactPresenceRenderFrame: number | undefined;
  #pendingDraft: { groupId: string; value: string } | undefined;
  #messageRenderLimit = INITIAL_MESSAGE_RENDER_LIMIT;
  #messageRenderGroupId: string | undefined;
  #messageRenderMemberNamesRevision: number | undefined;
  #menuGroupId: string | undefined;
  #menuReturnFocus: HTMLElement | undefined;
  #detailsGroupId: string | undefined;
  #detailsReturnFocus: HTMLElement | undefined;
  #detailsRenderSignature: string | undefined;
  #detailsLifecycleToken = 0;

  constructor(
    private readonly adapter: GroupChatPanelAdapter,
    private readonly service: GroupChatService,
    private readonly presence: GroupChatPanelPresence,
    private readonly options: GroupChatPanelOptions = {},
  ) {
    this.newGroupButton = button("kl-group-new", "New group", "Create a group chat");
    this.newGroupButton.title = "Create a group chat with 2–4 KikiLink friends";
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
      "No group chats yet. Create one with 2–4 managed-group-compatible KikiLink contacts.",
    );
    this.sidebarSection = node("section", "kl-group-sidebar");
    this.sidebarSection.setAttribute("aria-label", "Group chats");
    this.sidebarSection.append(sidebarHeader, this.#groupList, this.#sidebarEmpty);

    this.#headerAvatar = node("div", "kl-group-header-avatar", "G");
    this.#headerAvatar.setAttribute("aria-hidden", "true");
    this.#paneTitle = node("h2", "kl-group-pane-title", "Group chat");
    this.#creatorBadge = node("span", "kl-group-creator-badge", "Creator");
    this.#creatorBadge.title = "You created this group";
    this.#creatorBadge.hidden = true;
    const titleRow = node("div", "kl-group-pane-title-row");
    titleRow.append(this.#paneTitle, this.#creatorBadge);
    this.#memberSummary = node("p", "kl-group-member-summary");
    this.#participantStrip = node("div", "kl-group-participant-strip");
    this.#participantStrip.setAttribute("role", "list");
    this.#participantStrip.setAttribute("aria-label", "Group members");
    const titleBlock = node("div", "kl-group-pane-heading");
    titleBlock.append(
      node("span", "kl-group-pane-eyebrow", "Group chat"),
      titleRow,
      this.#memberSummary,
      this.#participantStrip,
    );
    this.#paneMenuButton = button(
      "kl-group-pane-menu kl-group-pane-menu-trigger",
      "",
      "Group actions",
    );
    this.#paneMenuButton.title = "Group actions";
    this.#paneMenuButton.append(kikiIcon("more"));
    this.#paneMenuButton.addEventListener("click", () => {
      const groupId = this.#currentGroupId;
      if (groupId) this.openGroupActionMenu(groupId, this.#paneMenuButton);
    });
    const paneHeader = node("header", "kl-group-pane-header");
    paneHeader.append(this.#headerAvatar, titleBlock, this.#paneMenuButton);

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
    this.#composer.className = "kl-composer-input kl-group-composer";
    this.#composer.id = uniqueDomId("kl-group-composer");
    this.#composer.maxLength = GROUP_MESSAGE_MAX_CONTENT;
    this.#composer.rows = 1;
    this.#composer.placeholder = "Write a group message…";
    this.#composer.setAttribute("aria-label", "Message the group");
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
      "kl-counter kl-group-composer-counter",
      `0/${GROUP_MESSAGE_MAX_CONTENT}`,
    );
    this.#counter.setAttribute("aria-live", "polite");
    this.#sendButton = button(
      "kl-text-button kl-text-button--primary kl-send kl-group-send",
      "",
      "Send group message",
    );
    this.#sendButton.append(kikiIcon("send"), node("span", "kl-send-label", "Send"));
    this.#sendButton.disabled = true;
    this.#sendButton.addEventListener("click", () => void this.#sendActiveMessage());
    this.#attachImageButton = button(
      "kl-icon-button kl-attach-image kl-group-composer-attach",
      "",
      "Attach an image to this group",
    );
    this.#attachImageButton.title = "Attach image";
    this.#attachImageButton.append(kikiIcon("image"));
    this.#attachImageButton.addEventListener("click", () => void this.#attachImage());
    const composerRow = node("div", "kl-composer-row kl-group-composer-row");
    composerRow.append(this.#attachImageButton, this.#composer, this.#sendButton);
    const composerFooter = node("div", "kl-composer-options kl-group-composer-footer");
    composerFooter.append(this.#counter);
    const composerArea = node("footer", "kl-composer kl-group-composer-area");
    composerArea.append(composerLabel, composerRow, composerFooter);

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

    this.#groupActionMenu = node("div", "kl-group-menu");
    this.#groupActionMenu.setAttribute("role", "menu");
    this.#groupActionMenu.setAttribute("aria-label", "Group actions");
    this.#groupActionMenu.addEventListener("keydown", (event) => this.#onGroupMenuKeyDown(event));
    this.groupActionMenuLayer = document.createElement("dialog");
    this.groupActionMenuLayer.className = "kl-group-menu-layer";
    this.groupActionMenuLayer.setAttribute("aria-label", "Group actions");
    this.groupActionMenuLayer.append(this.#groupActionMenu);
    this.groupActionMenuLayer.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.#closeGroupActionMenu(true);
    });
    this.groupActionMenuLayer.addEventListener("pointerdown", (event) => {
      if (event.target === this.groupActionMenuLayer) this.#closeGroupActionMenu(true);
    });

    this.#groupDetailsTitle = node("h2", "kl-group-details-title", "Group details");
    this.#groupDetailsTitle.id = uniqueDomId("kl-group-details-title");
    this.#groupDetailsBody = node("div", "kl-group-details-body");
    this.#groupDetailsActions = node("div", "kl-group-details-actions");
    this.groupDetailsDialog = document.createElement("dialog");
    this.groupDetailsDialog.className = "kl-group-details-dialog";
    this.groupDetailsDialog.setAttribute("aria-labelledby", this.#groupDetailsTitle.id);
    this.groupDetailsDialog.append(
      this.#groupDetailsTitle,
      this.#groupDetailsBody,
      this.#groupDetailsActions,
    );
    this.groupDetailsDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      if (this.#detailsActionBusy) return;
      this.#closeGroupDetails(true);
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
      groupActionMenuLayer: this.groupActionMenuLayer,
      groupDetailsDialog: this.groupDetailsDialog,
    };
  }

  get activeGroupId(): string | undefined {
    return this.#currentGroupId;
  }

  /**
   * Adds the same accessible action menu used by the pane header to any host-rendered group row.
   * The returned disposer is idempotent; destroy() also releases bindings that a host forgot.
   */
  bindGroupActionTarget(
    target: HTMLElement,
    groupId: string | (() => string | undefined),
  ): () => void {
    this.#unbindGroupActionTarget(target);
    for (const reference of this.#groupActionTargetReferences) {
      if (!reference.deref()) this.#groupActionTargetReferences.delete(reference);
    }
    const reference = new WeakRef(target);
    const resolveGroupId = typeof groupId === "function" ? groupId : () => groupId;
    let longPressTimer: ReturnType<typeof setTimeout> | undefined;
    let pointerStart: { x: number; y: number } | undefined;

    const clearLongPress = (): void => {
      if (longPressTimer !== undefined) clearTimeout(longPressTimer);
      longPressTimer = undefined;
      pointerStart = undefined;
    };
    const open = (x?: number, y?: number): void => {
      const resolved = resolveGroupId();
      if (resolved) this.openGroupActionMenu(resolved, target, x, y);
    };
    const onContextMenu = (event: MouseEvent): void => {
      if (!resolveGroupId()) return;
      event.preventDefault();
      event.stopPropagation();
      clearLongPress();
      open(event.clientX, event.clientY);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "ContextMenu" && !(event.key === "F10" && event.shiftKey)) return;
      if (!resolveGroupId()) return;
      event.preventDefault();
      event.stopPropagation();
      open();
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      if (!resolveGroupId()) return;
      clearLongPress();
      pointerStart = { x: event.clientX, y: event.clientY };
      const pressX = event.clientX;
      const pressY = event.clientY;
      longPressTimer = setTimeout(() => {
        longPressTimer = undefined;
        this.#suppressedGroupTargetClicks.set(
          target,
          Date.now() + GROUP_MENU_CLICK_SUPPRESSION_MS,
        );
        open(pressX, pressY);
      }, GROUP_MENU_LONG_PRESS_MS);
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!pointerStart) return;
      if (
        Math.abs(event.clientX - pointerStart.x) > GROUP_MENU_LONG_PRESS_MOVE_PX ||
        Math.abs(event.clientY - pointerStart.y) > GROUP_MENU_LONG_PRESS_MOVE_PX
      ) {
        clearLongPress();
      }
    };
    const onSuppressedClick = (event: MouseEvent): void => {
      const suppressUntil = this.#suppressedGroupTargetClicks.get(target) ?? 0;
      if (suppressUntil <= Date.now()) return;
      this.#suppressedGroupTargetClicks.delete(target);
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    target.addEventListener("contextmenu", onContextMenu);
    target.addEventListener("keydown", onKeyDown);
    target.addEventListener("pointerdown", onPointerDown);
    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", clearLongPress);
    target.addEventListener("pointercancel", clearLongPress);
    target.addEventListener("dragstart", clearLongPress);
    target.addEventListener("click", onSuppressedClick, true);

    let active = true;
    const cleanup = (): void => {
      if (!active) return;
      active = false;
      clearLongPress();
      target.removeEventListener("contextmenu", onContextMenu);
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", clearLongPress);
      target.removeEventListener("pointercancel", clearLongPress);
      target.removeEventListener("dragstart", clearLongPress);
      target.removeEventListener("click", onSuppressedClick, true);
      if (this.#groupActionTargetBindings.get(target)?.cleanup === cleanup) {
        this.#groupActionTargetBindings.delete(target);
        this.#groupActionTargetReferences.delete(reference);
      }
    };
    this.#groupActionTargetBindings.set(target, { cleanup, reference });
    this.#groupActionTargetReferences.add(reference);
    return cleanup;
  }

  /** Opens the action menu programmatically; useful for unified host conversation rows. */
  openGroupActionMenu(
    groupId: string,
    returnFocus?: HTMLElement,
    clientX?: number,
    clientY?: number,
  ): boolean {
    if (this.#destroyed) return false;
    const group = this.service.getGroup(groupId);
    if (!group) return false;
    this.#ensureFloatingNodesMounted();
    if (this.groupDetailsDialog.open) this.#closeGroupDetails(false);
    if (this.groupActionMenuLayer.open) this.#closeGroupActionMenu(false);
    this.#menuGroupId = groupId;
    this.#menuReturnFocus = returnFocus;
    this.#renderGroupActionMenu(group);
    openDialog(this.groupActionMenuLayer);
    this.#positionGroupActionMenu(returnFocus, clientX, clientY);
    this.#groupActionMenu
      .querySelector<HTMLButtonElement>("button[role='menuitem']:not(:disabled)")
      ?.focus();
    return true;
  }

  /** Opens owner controls or read-only details, depending on service-authoritative group state. */
  openGroupDetails(groupId: string, returnFocus?: HTMLElement): boolean {
    if (this.#destroyed) return false;
    const group = this.service.getGroup(groupId);
    if (!group) return false;
    this.#ensureFloatingNodesMounted();
    if (this.groupDetailsDialog.open) this.#closeGroupDetails(false);
    this.#detailsGroupId = groupId;
    this.#detailsReturnFocus = returnFocus;
    this.#detailsRenderSignature = undefined;
    this.#renderGroupDetails(group);
    openDialog(this.groupDetailsDialog);
    this.groupDetailsDialog
      .querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled), button:not(:disabled)")
      ?.focus();
    return true;
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
      this.#messageRenderMemberNamesRevision = undefined;
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

  /** Closes transient group UI when the host Link Deck is hidden without discarding chat state. */
  handleHostClose(): void {
    if (this.#destroyed) return;
    this.#detailsLifecycleToken += 1;
    this.#cancelContactPresenceRefresh();
    if (this.newGroupDialog.open) {
      try {
        this.newGroupDialog.close();
      } catch {
        this.newGroupDialog.removeAttribute("open");
      }
    }
    if (!this.#creating) this.#resetCreateDialog();
    this.#closeGroupActionMenu(false);
    this.#closeGroupDetails(false);
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
    if (this.groupDetailsDialog.open && this.#detailsGroupId) {
      const group = this.service.getGroup(this.#detailsGroupId);
      if (group) this.#renderGroupDetails(group);
      else this.#closeGroupDetails(true);
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
    this.#detailsLifecycleToken += 1;
    this.#cancelContactPresenceRefresh();
    this.#unsubscribeGroup();
    this.#unsubscribePresence();
    try {
      if (this.newGroupDialog.open) this.newGroupDialog.close();
    } catch {
      this.newGroupDialog.removeAttribute("open");
    }
    this.#closeGroupActionMenu(false);
    this.#closeGroupDetails(false);
    for (const reference of [...this.#groupActionTargetReferences]) {
      const target = reference.deref();
      if (target) this.#unbindGroupActionTarget(target);
    }
    this.#groupActionTargetReferences.clear();
    this.sidebarSection.remove();
    this.chatPane.remove();
    this.newGroupDialog.remove();
    this.groupActionMenuLayer.remove();
    this.groupDetailsDialog.remove();
  }

  #unbindGroupActionTarget(target: HTMLElement): void {
    this.#groupActionTargetBindings.get(target)?.cleanup();
  }

  #ensureFloatingNodesMounted(): void {
    const parent = this.newGroupDialog.parentNode ?? this.chatPane.parentNode ?? document.body;
    if (!this.groupActionMenuLayer.parentNode) parent.appendChild(this.groupActionMenuLayer);
    if (!this.groupDetailsDialog.parentNode) parent.appendChild(this.groupDetailsDialog);
  }

  #renderGroupActionMenu(group: GroupConversation): void {
    const header = node("div", "kl-group-menu-header");
    const avatar = node("div", "kl-group-header-avatar");
    avatar.setAttribute("aria-hidden", "true");
    this.#renderGroupAvatar(avatar, group);
    const copy = node("div", "kl-group-menu-copy");
    copy.append(
      node("strong", "kl-group-menu-title", group.title),
      node(
        "span",
        "kl-group-menu-meta",
        `${group.memberNumbers.length} members · ${group.protocolVersion === 2 ? "Managed group" : "Legacy group"}`,
      ),
    );
    header.append(avatar, copy);

    const primary = node("div", "kl-group-menu-section");
    primary.append(this.#groupMenuAction(
      this.#isGroupCreator(group) && group.protocolVersion === 2 ? "Manage group" : "Group details",
      "details",
      () => {
        const returnFocus = this.#menuReturnFocus;
        this.#closeGroupActionMenu(false);
        this.openGroupDetails(group.groupId, returnFocus);
      },
    ));
    if (this.options.onAttachImage) {
      primary.append(this.#groupMenuAction("Attach image", "attach-image", () => {
        const returnFocus = this.#menuReturnFocus ?? this.#paneMenuButton;
        this.#closeGroupActionMenu(false);
        void this.#attachGroupImage(group.groupId, returnFocus);
      }));
    }
    let canRevealGroupAvatar = false;
    try {
      canRevealGroupAvatar = this.options.canRevealGroupAvatar?.(structuredClone(group)) === true;
    } catch {
      canRevealGroupAvatar = false;
    }
    if (this.options.onRevealGroupAvatar && canRevealGroupAvatar) {
      primary.append(this.#groupMenuAction("Show group avatar", "show-avatar", () => {
        const returnFocus = this.#menuReturnFocus;
        this.#closeGroupActionMenu(false);
        try {
          this.options.onRevealGroupAvatar?.(group.groupId);
        } catch {
          this.#report({
            tone: "error",
            message: "The group avatar could not be revealed safely.",
            groupId: group.groupId,
          });
        }
        this.#restoreGroupFocus(returnFocus);
      }));
    }
    primary.append(this.#groupMenuAction(
      group.pinned ? "Unpin group" : "Pin group",
      "toggle-pin",
      () => {
        this.#closeGroupActionMenu(true);
        void this.#togglePinned(group.groupId);
      },
    ));
    if (group.groupId === this.#currentGroupId) {
      primary.append(this.#groupMenuAction("Close chat", "close", () => {
        this.#closeGroupActionMenu(false);
        this.closeActive();
      }));
    }

    const danger = node("div", "kl-group-menu-section");
    danger.append(this.#groupMenuAction("Remove from this device", "remove", () => {
      this.#closeGroupActionMenu(true);
      void this.#removeGroup(group.groupId);
    }, true));
    this.#groupActionMenu.replaceChildren(header, primary, danger);
  }

  #groupMenuAction(
    label: string,
    action: string,
    activate: () => void,
    danger = false,
  ): HTMLButtonElement {
    const item = button(
      danger ? "kl-group-menu-action kl-group-menu-action--danger" : "kl-group-menu-action",
      "",
    );
    item.dataset.groupAction = action;
    item.setAttribute("role", "menuitem");
    item.disabled = this.#paneActionBusy;
    const icon = action === "attach-image" || action === "show-avatar"
      ? "image"
      : action === "toggle-pin"
        ? "pin"
        : action === "close"
          ? "close"
          : action === "remove"
            ? "trash"
            : "settings";
    item.append(kikiIcon(icon), node("span", "kl-group-menu-action-label", label));
    item.addEventListener("click", activate);
    return item;
  }

  #onGroupMenuKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.#closeGroupActionMenu(true);
      return;
    }
    const items = [...this.#groupActionMenu.querySelectorAll<HTMLButtonElement>(
      "button[role='menuitem']:not(:disabled)",
    )];
    if (items.length === 0) return;
    const current = items.indexOf(event.target as HTMLButtonElement);
    let next = -1;
    if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % items.length;
    else if (event.key === "ArrowUp") {
      next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next < 0) return;
    event.preventDefault();
    items[next]?.focus();
  }

  #positionGroupActionMenu(
    source?: HTMLElement,
    clientX?: number,
    clientY?: number,
  ): void {
    const rect = source?.getBoundingClientRect();
    const requestedX = Number.isFinite(clientX) && clientX !== undefined
      ? clientX
      : rect?.left ?? 8;
    const requestedY = Number.isFinite(clientY) && clientY !== undefined
      ? clientY
      : (rect?.bottom ?? 8) + 4;
    const viewportWidth = Math.max(0, globalThis.innerWidth ?? 0);
    const viewportHeight = Math.max(0, globalThis.innerHeight ?? 0);
    const measuredWidth = this.#groupActionMenu.offsetWidth || 244;
    const measuredHeight = this.#groupActionMenu.offsetHeight || 260;
    const left = Math.max(8, Math.min(requestedX, Math.max(8, viewportWidth - measuredWidth - 8)));
    const top = Math.max(8, Math.min(requestedY, Math.max(8, viewportHeight - measuredHeight - 8)));
    this.#groupActionMenu.style.left = `${left}px`;
    this.#groupActionMenu.style.top = `${top}px`;
  }

  #closeGroupActionMenu(restoreFocus: boolean): void {
    const returnFocus = restoreFocus ? this.#menuReturnFocus : undefined;
    this.#menuGroupId = undefined;
    this.#menuReturnFocus = undefined;
    closeDialog(this.groupActionMenuLayer);
    if (restoreFocus) this.#restoreGroupFocus(returnFocus);
  }

  #renderGroupDetails(group: GroupConversation): void {
    const signature = JSON.stringify([
      group.groupId,
      group.title,
      group.creatorNumber,
      group.protocolVersion,
      group.epochId,
      group.stateRevision,
      group.appearanceRevision,
      group.memberNamesRevision,
      group.avatarUrl,
      group.outlineColor,
      group.memberNumbers,
    ]);
    if (this.#detailsRenderSignature === signature) return;
    this.#detailsRenderSignature = signature;
    const isCreator = this.#isGroupCreator(group);
    const managed = group.protocolVersion === 2;
    this.#groupDetailsTitle.textContent = isCreator && managed
      ? `Manage ${group.title}`
      : `Group details · ${group.title}`;

    const summary = node("section", "kl-group-details-summary");
    const avatar = node("div", "kl-group-details-avatar");
    avatar.setAttribute("aria-hidden", "true");
    this.#renderGroupAvatar(avatar, group);
    const creatorName = this.#memberName(group, group.creatorNumber);
    const summaryCopy = node("div", "kl-group-details-copy");
    summaryCopy.append(
      node("strong", "kl-group-menu-title", group.title),
      node(
        "span",
        "kl-group-menu-meta",
        `${group.memberNumbers.length} members · Creator: ${creatorName} (#${group.creatorNumber})`,
      ),
    );
    summary.append(avatar, summaryCopy);

    const notice = node("p", "kl-group-manage-notice");
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    if (!isCreator) {
      notice.textContent = `Only ${creatorName}, the group creator, can change its name, avatar, color, or membership.`;
    } else if (!managed) {
      notice.textContent = "This is a legacy group. Its details are read-only until you upgrade it to the managed group protocol.";
    } else {
      notice.textContent = "You created this group. Changes are accepted only from your authenticated BC identity and distributed by the group service.";
    }

    const content = document.createDocumentFragment();
    content.append(summary, notice);
    if (isCreator && managed) content.append(this.#renderManagedGroupFields(group, notice));
    else content.append(this.#renderGroupMemberList(group, false, notice));
    this.#groupDetailsBody.replaceChildren(content);

    const actions = document.createDocumentFragment();
    if (isCreator && !managed) {
      const upgrade = button("kl-group-details-button", "Upgrade to managed group");
      upgrade.dataset.groupDetailsAction = "convert";
      upgrade.addEventListener("click", () => void this.#runGroupMutation(
        group.groupId,
        () => this.options.onConvertLegacyGroup
          ? this.options.onConvertLegacyGroup(group.groupId)
          : this.service.convertLegacyGroup(group.groupId),
        "Group upgraded to the managed protocol.",
      ));
      actions.append(upgrade);
    }
    const close = button("kl-group-details-button", "Close", "Close group details");
    close.dataset.groupDetailsAction = "close";
    close.addEventListener("click", () => this.#closeGroupDetails(true));
    actions.append(close);
    this.#groupDetailsActions.replaceChildren(actions);
    if (this.#detailsActionBusy) this.#setGroupDetailsDisabled(true);
  }

  #renderManagedGroupFields(group: GroupConversation, notice: HTMLElement): HTMLElement {
    const fields = node("div", "kl-group-manage-fields");

    const titleField = node("div", "kl-group-manage-field");
    const titleLabel = node("label", "kl-group-dialog-label", "Group name");
    const titleInput = document.createElement("input");
    titleInput.className = "kl-group-manage-title";
    titleInput.type = "text";
    titleInput.maxLength = GROUP_TITLE_MAX_CHARS;
    titleInput.value = group.title;
    titleInput.id = uniqueDomId("kl-group-manage-title");
    titleLabel.htmlFor = titleInput.id;
    const saveTitle = button("kl-group-manage-save", "Save name");
    saveTitle.dataset.groupDetailsAction = "rename";
    saveTitle.addEventListener("click", () => {
      const value = sliceCompleteUtf16(titleInput.value, GROUP_TITLE_MAX_CHARS).trim();
      if (!value) {
        notice.textContent = "A group name cannot be empty.";
        notice.dataset.tone = "error";
        titleInput.focus();
        return;
      }
      void this.#runGroupMutation(
        group.groupId,
        () => this.options.onRenameGroup
          ? this.options.onRenameGroup(group.groupId, value)
          : this.service.renameGroup(group.groupId, value),
        "Group name updated.",
      );
    });
    titleField.append(titleLabel, titleInput, saveTitle);

    const avatarField = node("div", "kl-group-manage-field");
    const avatarLabel = node("label", "kl-group-dialog-label", "Group avatar link");
    const avatarInput = document.createElement("input");
    avatarInput.className = "kl-group-manage-avatar-url";
    avatarInput.type = "url";
    avatarInput.maxLength = 450;
    avatarInput.value = group.avatarUrl;
    avatarInput.placeholder = "https://… direct image link";
    avatarInput.id = uniqueDomId("kl-group-manage-avatar");
    avatarLabel.htmlFor = avatarInput.id;
    const saveAvatar = button("kl-group-manage-save", "Save avatar");
    saveAvatar.dataset.groupDetailsAction = "set-avatar";
    saveAvatar.addEventListener("click", () => void this.#runGroupMutation(
      group.groupId,
      () => this.options.onSetGroupAvatar
        ? this.options.onSetGroupAvatar(group.groupId, avatarInput.value.trim())
        : this.service.setGroupAvatar(group.groupId, avatarInput.value.trim()),
      avatarInput.value.trim() ? "Group avatar updated." : "Group avatar cleared.",
    ));
    const clearAvatar = button("kl-group-manage-save", "Clear avatar");
    clearAvatar.dataset.groupDetailsAction = "clear-avatar";
    clearAvatar.disabled = !group.avatarUrl;
    clearAvatar.addEventListener("click", () => void this.#runGroupMutation(
      group.groupId,
      () => this.options.onSetGroupAvatar
        ? this.options.onSetGroupAvatar(group.groupId, "")
        : this.service.setGroupAvatar(group.groupId, ""),
      "Group avatar cleared.",
    ));
    avatarField.append(avatarLabel, avatarInput, saveAvatar, clearAvatar);
    if (this.options.onPickGroupAvatar) {
      const uploadHelp = node(
        "p",
        "kl-group-dialog-help kl-group-manage-upload-help",
        "Local files are metadata-stripped, prepared as WebP, then uploaded to a public long-lived Catbox link.",
      );
      const pickAvatar = button("kl-group-manage-save", "Choose & upload to Catbox");
      pickAvatar.dataset.groupDetailsAction = "pick-avatar";
      pickAvatar.title = "Prepare this image and upload it publicly to Catbox";
      pickAvatar.addEventListener("click", () =>
        void this.#pickGroupAvatar(group.groupId, pickAvatar));
      avatarField.append(uploadHelp, pickAvatar);
    }

    const outlineField = node("div", "kl-group-manage-field");
    const outlineLabel = node("label", "kl-group-dialog-label", "Avatar outline color");
    const outlineRow = node("div", "kl-group-manage-outline-row");
    const outlineInput = document.createElement("input");
    outlineInput.className = "kl-group-manage-outline";
    outlineInput.type = "color";
    outlineInput.value = validOutlineColor(group.outlineColor) ?? "#c89b3c";
    outlineInput.id = uniqueDomId("kl-group-manage-outline");
    outlineLabel.htmlFor = outlineInput.id;
    const saveOutline = button("kl-group-manage-save kl-group-manage-outline-save", "Save color");
    saveOutline.dataset.groupDetailsAction = "set-outline";
    saveOutline.addEventListener("click", () => void this.#runGroupMutation(
      group.groupId,
      () => this.options.onSetGroupOutlineColor
        ? this.options.onSetGroupOutlineColor(group.groupId, outlineInput.value)
        : this.service.setGroupOutlineColor(group.groupId, outlineInput.value),
      "Group outline color updated.",
    ));
    const resetOutline = button("kl-group-manage-reset-outline", "Use default");
    resetOutline.dataset.groupDetailsAction = "reset-outline";
    resetOutline.disabled = !group.outlineColor;
    resetOutline.addEventListener("click", () => void this.#runGroupMutation(
      group.groupId,
      () => this.options.onSetGroupOutlineColor
        ? this.options.onSetGroupOutlineColor(group.groupId, "")
        : this.service.setGroupOutlineColor(group.groupId, ""),
      "Group outline color reset.",
    ));
    outlineRow.append(outlineInput, saveOutline, resetOutline);
    outlineField.append(outlineLabel, outlineRow);

    fields.append(
      titleField,
      avatarField,
      outlineField,
      this.#renderGroupMemberList(group, true, notice),
    );
    return fields;
  }

  #renderGroupMemberList(
    group: GroupConversation,
    manageable: boolean,
    notice: HTMLElement,
  ): HTMLElement {
    const section = node("section", "kl-group-manage-members");
    section.append(node("h3", "kl-group-menu-title", "Members"));
    for (const memberNumber of group.memberNumbers) {
      const member = {
        memberNumber,
        memberName: this.#memberName(group, memberNumber),
      };
      const row = node("div", "kl-group-manage-member");
      row.dataset.memberNumber = String(memberNumber);
      const copy = node("div", "kl-group-manage-member-copy");
      copy.append(
        node("strong", "kl-group-contact-name", member.memberName),
        node("span", "kl-group-contact-detail", `#${memberNumber}`),
      );
      if (memberNumber === group.creatorNumber) {
        copy.append(node("span", "kl-group-manage-member-role kl-group-creator-badge", "Creator"));
      }
      row.append(this.#memberProfileTarget(member, "kl-group-manage-member-profile"), copy);
      if (manageable && memberNumber !== group.creatorNumber) {
        const kick = button("kl-group-manage-kick", "Kick", `Remove ${member.memberName} from group`);
        kick.dataset.groupDetailsAction = "kick";
        kick.disabled = group.memberNumbers.length <= GROUP_MIN_MEMBERS;
        kick.addEventListener("click", () => void this.#kickGroupMember(group, member, notice));
        row.append(kick);
      }
      section.append(row);
    }

    if (manageable) {
      const add = node("div", "kl-group-manage-add");
      const select = document.createElement("select");
      select.className = "kl-group-manage-add-select";
      select.setAttribute("aria-label", "Friend to add to group");
      const candidates = this.#knownContacts().filter((contact) =>
        !group.memberNumbers.includes(contact.memberNumber) && this.#isCompatible(contact.memberNumber),
      );
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = candidates.length > 0
        ? "Choose a managed-group-compatible friend"
        : "No compatible friends available";
      select.append(placeholder);
      for (const candidate of candidates) {
        const option = document.createElement("option");
        option.value = String(candidate.memberNumber);
        option.textContent = `${candidate.memberName} (#${candidate.memberNumber})`;
        select.append(option);
      }
      const addButton = button("kl-group-manage-add-button", "Add member");
      addButton.dataset.groupDetailsAction = "add";
      addButton.disabled = candidates.length === 0 ||
        group.memberNumbers.length >= GROUP_MAX_MEMBERS;
      addButton.addEventListener("click", () => {
        const memberNumber = Number(select.value);
        const candidate = candidates.find((entry) => entry.memberNumber === memberNumber);
        if (!candidate) {
          notice.textContent = "Choose a friend to add first.";
          notice.dataset.tone = "error";
          select.focus();
          return;
        }
        void this.#runGroupMutation(
          group.groupId,
          () => this.options.onAddGroupMember
            ? this.options.onAddGroupMember(group.groupId, candidate.memberNumber)
            : this.service.addMember(group.groupId, candidate.memberNumber),
          `${candidate.memberName} was added to the group.`,
        );
      });
      add.append(select, addButton);
      section.append(add);
    }
    return section;
  }
  async #kickGroupMember(
    group: GroupConversation,
    member: GroupChatPanelMemberTarget,
    notice: HTMLElement,
  ): Promise<void> {
    let confirmed = false;
    try {
      confirmed = this.options.confirmKickMember
        ? await this.options.confirmKickMember(group, member)
        : typeof window !== "undefined" &&
          window.confirm(`Remove ${member.memberName} from “${group.title}”?`);
    } catch {
      confirmed = false;
    }
    if (!confirmed) {
      notice.textContent = "Member removal cancelled.";
      return;
    }
    await this.#runGroupMutation(
      group.groupId,
      () => this.options.onKickGroupMember
        ? this.options.onKickGroupMember(group.groupId, member.memberNumber)
        : this.service.kickMember(group.groupId, member.memberNumber),
      `${member.memberName} was removed from the group.`,
    );
  }

  async #pickGroupAvatar(groupId: string, returnFocus: HTMLElement): Promise<void> {
    const pick = this.options.onPickGroupAvatar;
    if (!pick || !this.service.getGroup(groupId)) return;
    try {
      // The host can retain returnFocus through the native file dialog and an async upload.
      // Do not rebuild this details dialog here, or that focus target would become detached.
      await pick(groupId, returnFocus);
    } catch (error) {
      this.#report({
        tone: "error",
        message: errorMessage(error, "The group avatar picker could not be opened."),
        groupId,
      });
    }
  }

  async #runGroupMutation(
    groupId: string,
    mutate: () => GroupPanelMutationValue | Promise<GroupPanelMutationValue>,
    successMessage: string,
    reportSuccess = true,
  ): Promise<void> {
    if (this.#detailsActionBusy) return;
    const lifecycleToken = this.#detailsLifecycleToken;
    const wasActive = this.#currentGroupId === groupId;
    const returnFocus = this.#detailsReturnFocus;
    this.#detailsActionBusy = true;
    this.#setGroupDetailsDisabled(true);
    const notice = this.#groupDetailsBody.querySelector<HTMLElement>(".kl-group-manage-notice");
    if (notice) {
      notice.textContent = "Saving group changes…";
      notice.dataset.tone = "info";
    }
    try {
      const result = await mutate();
      if (lifecycleToken !== this.#detailsLifecycleToken || this.#destroyed) return;
      const mutationResult = result && typeof result === "object" ? result : undefined;
      const resultGroup = mutationResult?.group;
      if (resultGroup && resultGroup.groupId !== groupId) {
        this.#detailsGroupId = resultGroup.groupId;
        if (wasActive) await this.activate(resultGroup.groupId);
      }
      const failures = mutationResult?.failed ?? [];
      if (reportSuccess) {
        const completionMessage = failures.length > 0
          ? `${successMessage} ${failures.length} local delivery handoff${plural(failures.length)} failed.`
          : successMessage;
        this.#report({
          tone: failures.length > 0 ? "warning" : "success",
          message: completionMessage,
          groupId: resultGroup?.groupId ?? groupId,
          ...(mutationResult
            ? {
                handedOffTo: [...mutationResult.handedOffTo],
                failed: failures.map((failure) => ({ ...failure })),
              }
            : {}),
        });
        const completionNotice = this.#groupDetailsBody.querySelector<HTMLElement>(
          ".kl-group-manage-notice",
        );
        if (completionNotice) {
          completionNotice.textContent = completionMessage;
          completionNotice.dataset.tone = failures.length > 0 ? "warning" : "success";
        }
      }
      const nextGroupId = resultGroup?.groupId ?? groupId;
      const nextGroup = this.service.getGroup(nextGroupId);
      if (nextGroup && !this.#destroyed) {
        if (!this.groupDetailsDialog.open) {
          this.openGroupDetails(nextGroupId, returnFocus);
        } else if (this.#detailsGroupId === nextGroupId) {
          this.#renderGroupDetails(nextGroup);
        }
      }
    } catch (error) {
      if (lifecycleToken !== this.#detailsLifecycleToken || this.#destroyed) return;
      const message = errorMessage(error, "The group could not be updated.");
      const currentNotice = this.#groupDetailsBody.querySelector<HTMLElement>(
        ".kl-group-manage-notice",
      );
      if (currentNotice) {
        currentNotice.textContent = message;
        currentNotice.dataset.tone = "error";
      }
      this.#report({ tone: "error", message, groupId });
    } finally {
      this.#detailsActionBusy = false;
      this.#setGroupDetailsDisabled(false);
    }
  }

  #setGroupDetailsDisabled(disabled: boolean): void {
    for (const control of this.groupDetailsDialog.querySelectorAll<
      HTMLButtonElement | HTMLInputElement | HTMLSelectElement
    >("button, input, select")) {
      if (disabled) {
        if (control.dataset.disabledBeforeBusy === undefined) {
          control.dataset.disabledBeforeBusy = String(control.disabled);
        }
        control.disabled = true;
      } else if (control.dataset.disabledBeforeBusy !== undefined) {
        control.disabled = control.dataset.disabledBeforeBusy === "true";
        delete control.dataset.disabledBeforeBusy;
      }
    }
  }

  #closeGroupDetails(restoreFocus: boolean): void {
    const returnFocus = restoreFocus ? this.#detailsReturnFocus : undefined;
    this.#detailsGroupId = undefined;
    this.#detailsReturnFocus = undefined;
    this.#detailsRenderSignature = undefined;
    closeDialog(this.groupDetailsDialog);
    if (restoreFocus) this.#restoreGroupFocus(returnFocus);
  }

  #restoreGroupFocus(preferred?: HTMLElement): void {
    if (preferred?.isConnected) {
      preferred.focus();
      return;
    }
    if (this.#currentGroupId && !this.chatPane.hidden && this.#paneMenuButton.isConnected) {
      this.#paneMenuButton.focus();
      return;
    }
    if (this.newGroupButton.isConnected) this.newGroupButton.focus();
  }

  #renderSidebar(): void {
    if (this.options.renderSidebar === false) return;
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
      : "No group chats yet. Create one with 2–4 managed-group-compatible KikiLink contacts.";
    const fragment = document.createDocumentFragment();
    for (const group of groups) {
      const listEntry = existingEntries.get(group.groupId) ?? this.#createGroupListEntry();
      existingEntries.delete(group.groupId);
      this.#updateGroupListEntry(listEntry, group);
      fragment.append(listEntry);
    }
    for (const staleEntry of existingEntries.values()) {
      const staleTarget = staleEntry.querySelector<HTMLElement>("[data-group-id]");
      if (staleTarget) this.#unbindGroupActionTarget(staleTarget);
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
    this.bindGroupActionTarget(row, () => row.dataset.groupId);
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

  #renderGroupAvatar(target: HTMLElement, group: GroupConversation): void {
    const signature = JSON.stringify([
      group.groupId,
      group.appearanceRevision,
      group.avatarUrl,
      group.outlineColor,
      group.title,
    ]);
    if (target.dataset.groupAvatarSignature === signature) return;
    target.dataset.groupAvatarSignature = signature;
    target.dataset.groupId = group.groupId;
    target.dataset.hasAvatar = String(Boolean(group.avatarUrl));
    target.textContent = avatarText(group.title);
    const outline = validOutlineColor(group.outlineColor);
    if (outline) target.style.setProperty("--kl-group-outline", outline);
    else target.style.removeProperty("--kl-group-outline");
    try {
      this.options.renderGroupAvatar?.(target, structuredClone(group));
    } catch {
      target.textContent = avatarText(group.title);
    }
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
      listItem.dataset.creator = String(member.memberNumber === group.creatorNumber);
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
    const ownMemberNumber = this.#ownMemberNumber();
    this.#creatorBadge.hidden = ownMemberNumber !== group.creatorNumber;
    this.#renderGroupAvatar(this.#headerAvatar, group);
    const creatorName = this.#memberName(group, group.creatorNumber);
    this.#memberSummary.textContent =
      `${group.memberNumbers.length} members · Created by ${creatorName}`;
    this.#renderParticipantStrip(group);
    this.#paneMenuButton.disabled = this.#paneActionBusy;
    this.#paneMenuButton.setAttribute("aria-label", `Actions for ${group.title}`);
    if (syncMessages) this.#renderMessages(group);
    const maxContent = this.#messageMaxContent(group.groupId);
    this.#composer.maxLength = maxContent;
    if (syncDraft) this.#composer.value = group.draft.slice(0, maxContent);
    this.#updateComposerControls();
  }

  #renderMessages(group: GroupConversation): void {
    const changedRenderGroup = this.#messageRenderGroupId !== group.groupId;
    const changedMemberNames =
      !changedRenderGroup &&
      this.#messageRenderMemberNamesRevision !== group.memberNamesRevision;
    const previousScrollTop = this.#messageLog.scrollTop;
    const hadRenderedMessages = this.#messageLog.childElementCount > 0;
    const wasFollowingNewest =
      !hadRenderedMessages ||
      this.#messageLog.scrollHeight - this.#messageLog.scrollTop - this.#messageLog.clientHeight < 48;
    if (changedRenderGroup) {
      this.#messageRenderGroupId = group.groupId;
      this.#messageRenderLimit = INITIAL_MESSAGE_RENDER_LIMIT;
    }
    if (changedRenderGroup || changedMemberNames) {
      this.#messageRenderMemberNamesRevision = group.memberNamesRevision;
      this.#messageLog.replaceChildren();
      this.#messageLog.scrollTop = 0;
    }
    const shouldFollowNewest = changedRenderGroup || wasFollowingNewest;
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
    for (const item of this.#messageLog.querySelectorAll<HTMLElement>("[data-message-key]")) {
      const messageKey = item.dataset.messageKey;
      if (messageKey) existing.set(messageKey, item);
    }
    const desiredIds = visibleMessages.map(groupMessageKey);
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
        fragment.append(existing.get(groupMessageKey(message)) ?? this.#createMessageNode(group, message));
      }
      this.#messageLog.replaceChildren(fragment);
    }
    if (shouldFollowNewest) this.#messageLog.scrollTop = this.#messageLog.scrollHeight;
    else if (changedMemberNames) this.#messageLog.scrollTop = previousScrollTop;
  }

  #createMessageNode(
    group: GroupConversation,
    message: GroupMessage,
  ): HTMLElement {
    const item = node("article", "kl-group-message");
    item.dataset.direction = message.direction;
    item.dataset.messageId = message.id;
    item.dataset.messageKey = groupMessageKey(message);
    item.dataset.groupMemberNumber = String(message.senderNumber);
    const memberName = this.#memberName(group, message.senderNumber);
    const author = message.direction === "outgoing" ? "You" : memberName;
    const authorTarget = this.#memberProfileTarget(
      { memberNumber: message.senderNumber, memberName },
      "kl-group-message-profile",
    );
    authorTarget.classList.add("kl-group-message-profile--large");
    authorTarget
      .querySelector<HTMLElement>("[data-group-member-avatar='true']")
      ?.classList.add("kl-group-message-avatar");
    const authorNode = node("strong", "kl-group-message-author", author);
    const timestamp = document.createElement("time");
    timestamp.className = "kl-group-message-time";
    timestamp.dateTime = new Date(message.sentAt).toISOString();
    timestamp.textContent = formatMessageTime(message.sentAt);
    const meta = node("header", "kl-group-message-meta");
    meta.append(authorNode, timestamp);
    const content = node("div", "kl-group-message-content");
    let rendered = false;
    if (this.options.renderMessageBody) {
      try {
        const body = this.options.renderMessageBody({ ...message });
        if (body) {
          content.append(body);
          rendered = true;
        }
      } catch {
        // A host renderer must never make the transcript unusable; plain text is always safe.
      }
    }
    if (!rendered) content.textContent = message.content;
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
    const maxContent = this.#messageMaxContent(this.#currentGroupId);
    if (this.#composer.value.length > maxContent) {
      this.#composer.value = this.#composer.value.slice(0, maxContent);
    }
    this.#updateComposerControls();
    this.#scheduleDraft(this.#currentGroupId, this.#composer.value);
  }

  #updateComposerControls(): void {
    this.#resizeComposer();
    const length = this.#composer.value.length;
    const maxContent = this.#currentGroupId
      ? this.#messageMaxContent(this.#currentGroupId)
      : GROUP_MESSAGE_MAX_CONTENT;
    this.#counter.textContent = `${length}/${maxContent}`;
    this.#counter.dataset.nearLimit = String(length >= maxContent - 20);
    this.#sendButton.disabled =
      this.#sending || !this.#currentGroupId || this.#composer.value.trim().length === 0;
    this.#composer.disabled = this.#sending || !this.#currentGroupId;
    this.#attachImageButton.disabled =
      this.#sending || !this.#currentGroupId || !this.options.onAttachImage;
  }

  #resizeComposer(): void {
    this.#composer.style.height = "auto";
    this.#composer.style.height = `${Math.min(this.#composer.scrollHeight, 120)}px`;
  }

  #messageMaxContent(groupId: string): number {
    try {
      const value = this.service.getMessageMaxContent(groupId);
      return Number.isSafeInteger(value) && value > 0 ? value : GROUP_MESSAGE_MAX_CONTENT;
    } catch {
      return GROUP_MESSAGE_MAX_CONTENT;
    }
  }

  #attachImage(): Promise<void> {
    const groupId = this.#currentGroupId;
    if (!groupId) return Promise.resolve();
    return this.#attachGroupImage(groupId, this.#attachImageButton);
  }

  async #attachGroupImage(groupId: string, returnFocus: HTMLElement): Promise<void> {
    if (!this.options.onAttachImage || !this.service.getGroup(groupId)) return;
    try {
      await this.options.onAttachImage(groupId, returnFocus);
    } catch (error) {
      this.#report({
        tone: "error",
        message: errorMessage(error, "The image composer could not be opened."),
        groupId,
      });
    }
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

  async #togglePinned(requestedGroupId?: string): Promise<void> {
    const groupId = requestedGroupId ?? this.#currentGroupId;
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

  async #removeGroup(requestedGroupId?: string): Promise<void> {
    const groupId = requestedGroupId ?? this.#currentGroupId;
    const group = groupId ? this.service.getGroup(groupId) : undefined;
    if (!groupId || !group || this.#paneActionBusy) return;
    const confirmed = this.options.confirmRemove
      ? await this.options.confirmRemove(group)
      : typeof window !== "undefined" && window.confirm(`Remove “${group.title}” from KikiLink?`);
    if (!confirmed || !this.service.getGroup(groupId)) return;
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
    if (this.#menuGroupId === groupId) this.#closeGroupActionMenu(false);
    this.#flushDraft();
    this.#currentGroupId = undefined;
    this.#messageRenderGroupId = undefined;
    this.#messageRenderMemberNamesRevision = undefined;
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
    if (update.kind === "group-removed") {
      if (this.#menuGroupId === update.groupId) this.#closeGroupActionMenu(true);
      if (this.#detailsGroupId === update.groupId) this.#closeGroupDetails(true);
    }
    if (update.kind === "cleared") {
      this.#closeGroupActionMenu(true);
      this.#closeGroupDetails(true);
      this.#closeActive(true);
      return;
    }
    if (update.kind === "group-removed" && update.groupId === this.#currentGroupId) {
      this.#closeActive(true);
      return;
    }
    if (
      update.kind === "group-updated" &&
      this.groupDetailsDialog.open &&
      this.#detailsGroupId === update.groupId
    ) {
      const detailsGroup = this.service.getGroup(update.groupId);
      if (detailsGroup) this.#renderGroupDetails(detailsGroup);
    }
    if (!("groupId" in update) || update.groupId !== this.#currentGroupId) return;
    if (update.kind === "message") {
      this.#renderActiveGroup(false, true);
    } else if (update.kind === "group-updated") {
      this.#renderActiveGroup(
        false,
        this.#messageRenderMemberNamesRevision !== update.group.memberNamesRevision,
      );
    }
  }

  #onPresenceUpdate(memberNumber?: number): void {
    if (this.#destroyed) return;
    this.#refreshMemberPresentations(memberNumber);
    if (!this.newGroupDialog.open) return;
    this.#scheduleContactPresenceRefresh();
  }

  #scheduleContactPresenceRefresh(): void {
    if (this.#contactPresenceRenderFrame !== undefined) return;
    this.#contactPresenceRenderFrame = requestAnimationFrame(() => {
      this.#contactPresenceRenderFrame = undefined;
      if (this.#destroyed || !this.newGroupDialog.open || this.#dialogStage !== "select") return;
      this.#contacts = this.#knownContacts();
      this.#renderContactOptions();
    });
  }

  #cancelContactPresenceRefresh(): void {
    if (this.#contactPresenceRenderFrame !== undefined) {
      cancelAnimationFrame(this.#contactPresenceRenderFrame);
    }
    this.#contactPresenceRenderFrame = undefined;
  }

  #refreshMemberPresentations(memberNumber?: number): void {
    const selector = memberNumber === undefined
      ? "[data-group-member-presentation='true']"
      : `[data-group-member-presentation='true'][data-group-member-number="${CSS.escape(String(memberNumber))}"]`;
    for (const target of [
      ...this.sidebarSection.querySelectorAll<HTMLElement>(selector),
      ...this.chatPane.querySelectorAll<HTMLElement>(selector),
      ...this.newGroupDialog.querySelectorAll<HTMLElement>(selector),
      ...this.groupDetailsDialog.querySelectorAll<HTMLElement>(selector),
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
      "Choose 2–4 friends with current managed-group support. Your group will have 3–5 members including you. Compatibility is checked again before sending.",
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
        ? "No managed-group-compatible contacts detected yet. Keep this window open while KikiLink checks current versions."
        : "No managed-group-compatible contacts match this search.";
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
        listItem.dataset.selected = String(selected);
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
      const result = await this.service.createManagedGroup(
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
    this.#cancelContactPresenceRefresh();
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
        typeof this.presence.hasGroupManagedPeer === "function" &&
        this.presence.hasGroupManagedPeer(memberNumber);
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

  #isGroupCreator(group: GroupConversation): boolean {
    const ownMemberNumber = this.#ownMemberNumber();
    return ownMemberNumber !== undefined && ownMemberNumber === group.creatorNumber;
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

function openDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  try {
    dialog.showModal();
  } catch {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog: HTMLDialogElement): void {
  if (!dialog.open) return;
  try {
    dialog.close();
  } catch {
    dialog.removeAttribute("open");
  }
}

let domId = 0;

function uniqueDomId(prefix: string): string {
  domId += 1;
  return `${prefix}-${domId}`;
}

let messageTimeFormatter: Intl.DateTimeFormat | undefined;

function groupMessageKey(message: Pick<GroupMessage, "senderNumber" | "id">): string {
  return `${message.senderNumber}:${message.id}`;
}

function formatMessageTime(value: number): string {
  try {
    messageTimeFormatter ??= new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return messageTimeFormatter.format(new Date(value));
  } catch {
    return "";
  }
}

function validOutlineColor(value: string): string | undefined {
  const normalized = value.trim();
  return /^#[\da-f]{6}$/iu.test(normalized) ? normalized : undefined;
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
