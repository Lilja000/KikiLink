import type { BCAdapter } from "../../bc/adapter";
import type {
  BCConnectionState,
  ConversationMeta,
  KikiLinkSettings,
  LinkNotification,
  LinkReactionFired,
  LinkMessage,
  NotificationSoundPreset,
  PresenceSnapshot,
  PresenceStatus,
  QuickAction,
  ReactionRule,
  RosterEntry,
  SettingsSection,
} from "../../core/types";
import { MemoryKeyValueStorage, type SettingsStore } from "../../core/settings";
import { EventBus } from "../../core/event-bus";
import { debounce, element } from "../../utils/dom";
import { LinkActivitiesService } from "../link-activities/link-activities-service";
import { CustomActivitiesView } from "../link-activities/custom-activities-view";
import {
  LinkRosterService,
  type RosterScope,
  type RosterSyncResult,
} from "../link-roster/link-roster-service";
import { PeopleRepository } from "../../storage/people-repository";
import { conversationDisplayName, type ChatService } from "./chat-service";
import { LinkPresenceService } from "../link-presence/link-presence-service";
import {
  createDefaultReactionRule,
  MAX_REACTION_COOLDOWN_SECONDS,
  MAX_REACTION_MEMBERS,
  MAX_REACTION_RULES,
} from "../link-reactions/reaction-rules";
import {
  NOTIFICATION_SOUND_LABELS,
  NotificationSoundService,
} from "../link-reactions/notification-sounds";
import { LINK_CHAT_STYLES } from "./styles";
import { normalizeImageUrl, parseMessageLinks } from "./media";
import {
  LitterboxImageUploader,
  normalizeLitterboxUploadConfig,
  type LitterboxUploadConfig,
  type LocalImageUploader,
  type PreparedLocalImage,
} from "./image-upload";
import { kikiIcon, type KikiLinkIconName } from "./icons";
import { RoomBlossomBadge } from "./blossom";
import KIKILINK_EMBLEM_DATA_URL from "../../../design/branding/kikilink-emblem.webp";

type WorkspaceView = "home" | "chat" | "roster" | "activities" | "settings";
type PrimaryWorkspaceView = Exclude<WorkspaceView, "settings">;
type FeatureTarget = WorkspaceView;
type HomeAction =
  | { kind: "new-chat" }
  | { kind: "chat"; peerNumber?: number; peerName?: string }
  | { kind: "roster" }
  | { kind: "activities" }
  | { kind: "settings" };
type FinderResultKind = "destination" | "conversation" | "player" | "activity" | "setting";
type MessageGroupPosition = "single" | "start" | "middle" | "end";
type FinderAction =
  | { kind: "workspace"; target: FeatureTarget }
  | { kind: "new-chat" }
  | { kind: "presence" }
  | { kind: "conversation"; peerNumber: number; peerName: string }
  | { kind: "player"; memberNumber: number }
  | { kind: "activity"; index: number }
  | { kind: "setting"; section: SettingsSection };

interface FinderResult {
  id: string;
  kind: FinderResultKind;
  icon: KikiLinkIconName;
  category: string;
  title: string;
  detail: string;
  keywords: string;
  priority: number;
  action: FinderAction;
}

interface ProfileTarget {
  memberNumber: number;
  displayName: string;
}

export class LinkChatView {
  readonly #host = document.createElement("div");
  readonly #shadow = this.#host.attachShadow({ mode: "open" });
  readonly #launcher = element("button", {
    className: "kl-launcher",
    type: "button",
    title: "Open KikiLink",
    ariaLabel: "Open KikiLink",
  });
  readonly #badge = element("span", { className: "kl-badge" });
  readonly #connection = element("span", { className: "kl-connection" });
  readonly #connectionDot = element("span", { className: "kl-connection-dot" });
  readonly #connectionText = element("span", { className: "kl-connection-text" });
  readonly #panel = element("section", {
    className: "kl-panel",
    ariaLabel: "KikiLink Link Deck",
  });
  readonly #featureNav = element("nav", {
    className: "kl-feature-nav",
    ariaLabel: "KikiLink features",
  });
  readonly #workspace = element("div", { className: "kl-workspace" });
  readonly #home = element("section", { className: "kl-home" });
  readonly #chatLayout = element("div", { className: "kl-layout" });
  readonly #contextTitle = element("div", { className: "kl-topbar-context", text: "Home" });
  readonly #finderTrigger = element("button", {
    className: "kl-text-button kl-finder-trigger",
    type: "button",
    title: "Find anything in KikiLink (Ctrl+K)",
    ariaLabel: "Find chats, players, activities, and settings",
  });
  readonly #topbarSettingsButton = element("button", {
    className: "kl-icon-button kl-topbar-settings",
    type: "button",
    title: "KikiLink settings",
    ariaLabel: "Open KikiLink settings",
  });
  readonly #homeNavButton = element("button", {
    className: "kl-nav-item",
    type: "button",
    title: "Home",
    ariaLabel: "Open KikiLink home",
  });
  readonly #chatNavButton = element("button", {
    className: "kl-nav-item",
    type: "button",
    title: "LinkChat",
    ariaLabel: "Open LinkChat",
  });
  readonly #settingsNavButton = element("button", {
    className: "kl-nav-item",
    type: "button",
    title: "KikiLink settings",
    ariaLabel: "Open KikiLink settings",
  });
  readonly #homeGreeting = element("h1", { className: "kl-home-title" });
  readonly #homeActionIcon = element("span", { className: "kl-home-next-icon" });
  readonly #homeActionTitle = element("h2", { className: "kl-home-next-title" });
  readonly #homeActionDescription = element("p", { className: "kl-home-next-description" });
  readonly #homeActionMeta = element("span", { className: "kl-home-next-meta" });
  readonly #homeActionButton = element("button", {
    className: "kl-text-button kl-text-button--primary kl-home-next-button",
    type: "button",
  });
  readonly #homeConnection = element("span", { className: "kl-home-status-value" });
  readonly #homeRoom = element("span", { className: "kl-home-status-value" });
  readonly #homePresence = element("button", {
    className: "kl-home-status-value kl-home-presence",
    type: "button",
    title: "Change your KikiLink status",
  });
  readonly #homeChatMetric = element("span", { className: "kl-feature-card-metric" });
  readonly #homeRosterMetric = element("span", { className: "kl-feature-card-metric" });
  readonly #homeActivitiesMetric = element("span", { className: "kl-feature-card-metric" });
  readonly #homeSettingsMetric = element("span", { className: "kl-feature-card-metric" });
  readonly #homeRosterAction = element("span", { className: "kl-feature-card-action" });
  readonly #homeActivitiesAction = element("span", { className: "kl-feature-card-action" });
  readonly #homeRosterCard = element("button", {
    className: "kl-feature-card",
    type: "button",
    title: "Open LinkRoster",
  });
  readonly #homeActivitiesCard = element("button", {
    className: "kl-feature-card",
    type: "button",
    title: "Open Custom Activities",
  });
  readonly #conversationList = element("div", { className: "kl-conversations" });
  readonly #search = element("input", { className: "kl-search" });
  readonly #empty = element("div", { className: "kl-empty" });
  readonly #chat = element("section", { className: "kl-chat" });
  readonly #chatAvatar = element("div", { className: "kl-avatar" });
  readonly #chatName = element("div", { className: "kl-chat-name" });
  readonly #chatNumber = element("div", { className: "kl-chat-number" });
  readonly #chatPresence = element("div", { className: "kl-chat-presence" });
  readonly #chatRoom = element("div", { className: "kl-chat-room" });
  readonly #pinButton = element("button", {
    className: "kl-icon-button",
    type: "button",
    title: "Pin conversation",
    ariaLabel: "Pin conversation",
  });
  readonly #profileButton = element("button", {
    className: "kl-icon-button kl-profile-more",
    type: "button",
    title: "Player actions",
    ariaLabel: "Open player actions",
  });
  readonly #messages = element("div", { className: "kl-messages" });
  readonly #typingIndicator = element("div", {
    className: "kl-typing-indicator",
    ariaLabel: "Typing status",
  });
  readonly #composer = element("textarea", { className: "kl-composer-input" });
  readonly #sendButton = element("button", {
    className: "kl-text-button kl-text-button--primary kl-send",
    type: "button",
    text: "Send",
  });
  readonly #attachImageButton = element("button", {
    className: "kl-icon-button kl-attach-image",
    type: "button",
    title: "Send an image",
    ariaLabel: "Send an image",
  });
  readonly #quickActions = element("div", { className: "kl-quick-actions" });
  readonly #includeRoom = element("input") as HTMLInputElement;
  readonly #counter = element("span", { className: "kl-counter" });
  readonly #settingsPage = element("section", {
    className: "kl-settings-page",
    ariaLabel: "KikiLink settings",
  });
  readonly #settingsTabs = element("div", { className: "kl-settings-tabs" });
  readonly #settingsPanels = new Map<SettingsSection, HTMLElement>();
  readonly #historyToggle = element("input") as HTMLInputElement;
  readonly #enterToSendToggle = element("input") as HTMLInputElement;
  readonly #typingIndicatorsToggle = element("input") as HTMLInputElement;
  readonly #imagePreviewSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #imageUploadsToggle = element("input") as HTMLInputElement;
  readonly #imageUploadRetentionSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #imageUploadSettingsOptions = element("div", {
    className: "kl-image-upload-settings-options",
  });
  readonly #roomBadgeToggle = element("input") as HTMLInputElement;
  readonly #retentionInput = element("input", { className: "kl-number-input" }) as HTMLInputElement;
  readonly #saveSettingsButton = element("button", {
    className: "kl-text-button kl-text-button--primary",
    type: "button",
    text: "Save changes",
  });
  readonly #themeSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #accentInput = element("input", { className: "kl-color-input" }) as HTMLInputElement;
  readonly #densitySelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #textScaleSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #homeLayoutSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #launcherSideSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #launcherOpenSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #reducedMotionToggle = element("input") as HTMLInputElement;
  readonly #quickActionsEditor = element("div", { className: "kl-action-editor" });
  readonly #rosterEnabledToggle = element("input") as HTMLInputElement;
  readonly #rosterTrackingToggle = element("input") as HTMLInputElement;
  readonly #rosterRetentionSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #notebookFileInput = element("input") as HTMLInputElement;
  readonly #notebookCount = element("span", { className: "kl-data-tools-count" });
  readonly #rosterButton = element("button", {
    className: "kl-nav-item kl-roster-button",
    type: "button",
    title: "LinkRoster",
    ariaLabel: "Open LinkRoster",
  });
  readonly #rosterCount = element("span", { className: "kl-roster-count" });
  readonly #rosterPage = element("section", {
    className: "kl-feature-page kl-roster-page",
    ariaLabel: "LinkRoster players",
  });
  readonly #rosterSubtitle = element("p", { className: "kl-feature-page-subtitle" });
  readonly #rosterScopes = element("div", { className: "kl-roster-scopes" });
  readonly #rosterSearch = element("input", {
    className: "kl-search kl-roster-search",
  }) as HTMLInputElement;
  readonly #rosterList = element("div", { className: "kl-roster-list" });
  readonly #rosterDetail = element("section", { className: "kl-roster-detail" });
  readonly #rosterNote = element("textarea", {
    className: "kl-roster-note",
  }) as HTMLTextAreaElement;
  readonly #rosterTags = element("input", {
    className: "kl-roster-tags",
  }) as HTMLInputElement;
  readonly #saveNotebookButton = element("button", {
    className: "kl-text-button kl-text-button--primary kl-save-notebook",
    type: "button",
    text: "Save note",
  });
  readonly #activitiesToggle = element("input") as HTMLInputElement;
  readonly #friendOnlineAlertToggle = element("input") as HTMLInputElement;
  readonly #roomJoinAlertToggle = element("input") as HTMLInputElement;
  readonly #notificationSoundsToggle = element("input") as HTMLInputElement;
  readonly #chatSoundSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #friendOnlineSoundSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #roomJoinSoundSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #reactionsToggle = element("input") as HTMLInputElement;
  readonly #reactionRulesEditor = element("div", { className: "kl-reaction-rules-editor" });
  readonly #reactionRuleCount = element("span", { className: "kl-data-tools-count" });
  readonly #activitiesButton = element("button", {
    className: "kl-nav-item kl-activities-button",
    type: "button",
    title: "Custom Activities",
    ariaLabel: "Open Custom Activities",
  });
  readonly #activitiesPage = element("section", {
    className: "kl-feature-page kl-activities-page",
    ariaLabel: "Custom Activities",
  });
  readonly #newChatDialog = element("dialog", { className: "kl-dialog kl-new-chat-dialog" });
  readonly #newChatQuery = element("input", { className: "kl-search kl-new-chat-query" }) as HTMLInputElement;
  readonly #newChatResults = element("div", { className: "kl-contact-results" });
  readonly #finderDialog = element("dialog", { className: "kl-dialog kl-finder-dialog" });
  readonly #finderQuery = element("input", { className: "kl-finder-query" }) as HTMLInputElement;
  readonly #finderResults = element("div", { className: "kl-finder-results" });
  readonly #finderStatus = element("div", { className: "kl-sr-only" });
  readonly #presenceTrigger = element("button", {
    className: "kl-presence-trigger",
    type: "button",
    title: "Change KikiLink status",
    ariaLabel: "Change KikiLink status",
  });
  readonly #presenceTriggerDot = element("span", { className: "kl-presence-dot" });
  readonly #presenceTriggerLabel = element("span", { className: "kl-presence-trigger-label" });
  readonly #presenceDialog = element("dialog", { className: "kl-dialog kl-presence-dialog" });
  readonly #presenceOptions = element("div", { className: "kl-presence-options" });
  readonly #presenceEnabledToggle = element("input") as HTMLInputElement;
  readonly #presenceMessage = element("input", { className: "kl-search kl-presence-message" }) as HTMLInputElement;
  readonly #autoIdleInput = element("input", { className: "kl-number-input" }) as HTMLInputElement;
  readonly #presenceAvatarUrl = element("input", {
    className: "kl-search kl-presence-avatar-url",
  }) as HTMLInputElement;
  readonly #presenceAvatarPreview = element("div", { className: "kl-avatar kl-profile-avatar-preview" });
  readonly #afkAutoReplyToggle = element("input") as HTMLInputElement;
  readonly #afkAutoReplyMessage = element("textarea", {
    className: "kl-custom-activity-template kl-afk-reply-message",
  }) as HTMLTextAreaElement;
  readonly #afkAutoReplyOptions = element("div", { className: "kl-afk-reply-options" });
  readonly #imageDialog = element("dialog", { className: "kl-dialog kl-image-dialog" });
  readonly #imageUrlInput = element("input", { className: "kl-search kl-image-url" }) as HTMLInputElement;
  readonly #imagePreview = element("div", { className: "kl-image-compose-preview" });
  readonly #imageLinkTab = element("button", {
    className: "kl-image-source-tab",
    type: "button",
    text: "Image link",
  });
  readonly #imageFileTab = element("button", {
    className: "kl-image-source-tab",
    type: "button",
    text: "Local file",
  });
  readonly #imageLinkPanel = element("div", { className: "kl-image-source-panel" });
  readonly #imageFilePanel = element("div", { className: "kl-image-source-panel" });
  readonly #imageFileInput = element("input") as HTMLInputElement;
  readonly #chooseImageFileButton = element("button", {
    className: "kl-text-button kl-image-file-choose",
    type: "button",
    text: "Choose image",
  });
  readonly #localImageStatus = element("div", {
    className: "kl-image-compose-preview kl-local-image-status",
  });
  readonly #sendImageButton = element("button", {
    className: "kl-text-button kl-text-button--primary",
    type: "button",
    text: "Send image",
  });
  readonly #profileMenu = element("div", { className: "kl-profile-menu" });
  readonly #aliasDialog = element("dialog", { className: "kl-dialog kl-alias-dialog" });
  readonly #aliasInput = element("input", { className: "kl-search kl-alias-input" }) as HTMLInputElement;
  readonly #saveAliasButton = element("button", {
    className: "kl-text-button kl-text-button--primary",
    type: "button",
    text: "Save nickname",
  });
  readonly #clearAliasButton = element("button", {
    className: "kl-text-button",
    type: "button",
    text: "Use native nickname",
  });
  readonly #removeChatDialog = element("dialog", { className: "kl-dialog kl-remove-chat-dialog" });
  readonly #removeChatName = element("strong", { className: "kl-remove-chat-name" });
  readonly #removeChatButton = element("button", {
    className: "kl-text-button kl-text-button--danger",
    type: "button",
    text: "Remove chat",
  });
  readonly #backButton = element("button", {
    className: "kl-icon-button kl-back",
    type: "button",
    title: "Back to conversations",
    ariaLabel: "Back to conversations",
  });
  #activePeer: number | undefined;
  #activeName = "";
  #activeNativeName = "";
  #selectedActivityIndex = 0;
  #customActivitiesView: CustomActivitiesView | undefined;
  #selectedRosterMember: number | undefined;
  #rosterScope: RosterScope = "current";
  #workspaceView: WorkspaceView = "home";
  #lastWorkspaceView: PrimaryWorkspaceView = "home";
  #settingsReturnView: PrimaryWorkspaceView = "home";
  #settingsSection: SettingsSection = "appearance";
  #presentCount = 0;
  #unreadCount = 0;
  #notebookDirty = false;
  #mounted = false;
  #connectionState: BCConnectionState = "connecting";
  #homeAction: HomeAction = { kind: "new-chat" };
  #finderCatalog: FinderResult[] = [];
  #visibleFinderResults: FinderResult[] = [];
  #finderSelectedIndex = 0;
  #finderRenderToken = 0;
  #toastTimer: ReturnType<typeof setTimeout> | undefined;
  #launcherDrag:
    | {
        pointerId: number;
        startX: number;
        startY: number;
        startLeft: number;
        startTop: number;
        moved: boolean;
      }
    | undefined;
  #suppressLauncherClickUntil = 0;
  #presenceUnsubscribe: (() => void) | undefined;
  #presenceRenderFrame: number | undefined;
  #pendingPresenceAll = false;
  readonly #pendingPresenceMembers = new Set<number>();
  #typingStopTimer: ReturnType<typeof setTimeout> | undefined;
  #messageRenderLimit = 120;
  #messageRenderPeer: number | undefined;
  #loadingOlderMessages = false;
  readonly #renderedMessageIds = new Set<string>();
  readonly #allowedAvatarUrls = new Set<string>();
  readonly #suppressProfileClickUntil = new WeakMap<HTMLElement, number>();
  #profileMenuToken = 0;
  #aliasTarget: { memberNumber: number; nativeName: string } | undefined;
  #removeChatTarget: { memberNumber: number; displayName: string } | undefined;
  #imageSourceMode: "link" | "file" = "link";
  #preparedLocalImage: PreparedLocalImage | undefined;
  #localImageObjectUrl: string | undefined;
  #imageUploadBusy = false;
  #imageUploadToken = 0;
  #imagePrepareToken = 0;
  #localImageError: string | undefined;

  readonly #handleOutsidePointerDown = (event: PointerEvent): void => {
    if (this.#profileMenu.hidden) return;
    if (event.composedPath().includes(this.#host)) return;
    this.#closeProfileMenu();
  };

  readonly #handleViewportResize = (): void => {
    this.#positionLauncher();
    this.#updateSettingsTabOrientation();
    this.#closeProfileMenu();
  };

  readonly #saveDraft = debounce((peerNumber: number, peerName: string, value: string) => {
    void this.service.setDraft(peerNumber, peerName, value);
  }, 250);

  constructor(
    private readonly adapter: BCAdapter,
    private readonly service: ChatService,
    private readonly settings: SettingsStore,
    private readonly version: string,
    private readonly activities = new LinkActivitiesService(adapter, settings),
    private readonly roster = new LinkRosterService(
      adapter,
      new PeopleRepository(new MemoryKeyValueStorage()),
      settings,
    ),
    presence?: LinkPresenceService,
    private readonly imageUploader: LocalImageUploader<LitterboxUploadConfig> = new LitterboxImageUploader(),
  ) {
    this.presence =
      presence ??
      new LinkPresenceService(adapter, settings, new EventBus(), version);
    this.#roomBadge = new RoomBlossomBadge(adapter, settings, this.presence);
  }

  private readonly presence: LinkPresenceService;
  readonly #roomBadge: RoomBlossomBadge;
  readonly #notificationSounds = new NotificationSoundService();

  mount(): void {
    if (this.#mounted) return;
    this.#mounted = true;
    this.#host.id = "kikilink-root";

    const style = document.createElement("style");
    style.textContent = LINK_CHAT_STYLES;
    this.#applyTheme(this.settings.get());
    this.#buildLauncher();
    this.#buildPanel();
    this.#buildNewChatDialog();
    this.#buildFinderDialog();
    this.#buildPresenceDialog();
    this.#buildImageDialog();
    this.#buildAliasDialog();
    this.#buildRemoveChatDialog();
    this.#profileMenu.hidden = true;
    this.#profileMenu.setAttribute("role", "menu");
    this.#profileMenu.setAttribute("aria-label", "Player actions");
    this.#shadow.append(
      style,
      this.#launcher,
      this.#panel,
      this.#newChatDialog,
      this.#finderDialog,
      this.#presenceDialog,
      this.#imageDialog,
      this.#aliasDialog,
      this.#removeChatDialog,
      this.#profileMenu,
    );
    document.body.append(this.#host);
    this.#roomBadge.mount();
    this.#positionLauncher();
    window.addEventListener("resize", this.#handleViewportResize);
    document.addEventListener("pointerdown", this.#handleOutsidePointerDown);
    this.#presenceUnsubscribe = this.presence.subscribe((memberNumber) =>
      this.#schedulePresenceRender(memberNumber),
    );

    void this.refresh();
  }

  destroy(): void {
    this.#saveDraft.cancel();
    this.#imageUploadToken += 1;
    this.#imageUploadBusy = false;
    this.#stopLocalTyping();
    if (this.#toastTimer !== undefined) clearTimeout(this.#toastTimer);
    if (this.#presenceRenderFrame !== undefined) cancelAnimationFrame(this.#presenceRenderFrame);
    this.#presenceRenderFrame = undefined;
    this.#finderDialog.close();
    this.#newChatDialog.close();
    this.#presenceDialog.close();
    this.#imageDialog.close();
    this.#resetLocalImage();
    this.#aliasDialog.close();
    this.#removeChatDialog.close();
    this.#closeProfileMenu();
    window.removeEventListener("resize", this.#handleViewportResize);
    document.removeEventListener("pointerdown", this.#handleOutsidePointerDown);
    this.#presenceUnsubscribe?.();
    this.#presenceUnsubscribe = undefined;
    this.#allowedAvatarUrls.clear();
    this.#roomBadge.destroy();
    this.#host.remove();
    void this.#notificationSounds.destroy();
    this.#mounted = false;
  }

  isActiveConversation(peerNumber: number): boolean {
    return (
      !this.#panel.hidden &&
      this.#workspaceView === "chat" &&
      this.#activePeer === peerNumber
    );
  }

  setConnectionState(state: BCConnectionState, message?: string): void {
    this.#connectionState = state;
    this.#connection.dataset.state = state;
    this.#connectionText.textContent =
      state === "ready" ? "Connected" : state === "error" ? "Connection error" : "Connecting";
    this.#connection.title = message ?? this.#connectionText.textContent ?? "";
    this.#homeConnection.textContent = this.#connectionText.textContent;
    this.#homeConnection.dataset.state = state;
    const canSend = this.adapter.canSendBeep();
    this.#sendButton.disabled = !canSend;
    this.#attachImageButton.disabled = !canSend || this.#activePeer === undefined;
    this.#composer.placeholder = canSend ? "Write a Beep…" : "Connecting to Bondage Club…";
    if (this.#newChatDialog.open) this.#renderKnownContacts();
    if (this.#workspaceView === "activities") this.#renderActivitiesPage();
    if (this.#workspaceView === "roster") this.#renderRoster();
  }

  async onMessage(
    peerNumber: number,
    incoming: boolean,
    message?: LinkMessage,
  ): Promise<void> {
    if (incoming && this.settings.get().linkChat.openOnIncoming) {
      await this.openChat(peerNumber, this.adapter.getMemberName(peerNumber));
      return;
    }

    if (this.#activePeer === peerNumber) {
      if (message && this.#messageRenderPeer === peerNumber) this.#appendMessage(message);
      else await this.#renderMessages(peerNumber);
    }
    await this.refresh();
  }

  onReaction(reaction: LinkReactionFired): void {
    this.#toast(
      reaction.action === "room-emote"
        ? `Reaction “${reaction.ruleLabel}” sent: ${reaction.message}`
        : reaction.message,
    );
  }

  onNotification(notification: LinkNotification): void {
    if (notification.showToast) this.#toast(notification.message);
    const sounds = this.settings.get().linkReactions.sounds;
    if (!sounds.enabled) return;
    const preset =
      notification.kind === "chat"
        ? sounds.chat
        : notification.kind === "friend-online"
          ? sounds.friendOnline
          : sounds.roomJoin;
    void this.#notificationSounds.play(preset);
  }

  async open(): Promise<void> {
    const settings = this.settings.get();
    const preference = settings.ui.launcherOpen;
    const requested =
      preference === "chat" ? "chat" : preference === "last" ? this.#lastWorkspaceView : "home";
    await this.#openPanel(this.#availableWorkspace(requested, settings));
  }

  async #openPanel(view: WorkspaceView): Promise<void> {
    this.#panel.hidden = false;
    this.#launcher.setAttribute("aria-expanded", "true");
    this.#showWorkspace(view);
    await this.refresh();
  }

  close(): void {
    this.#stopLocalTyping();
    if (this.#finderDialog.open) this.#finderDialog.close();
    if (this.#newChatDialog.open) this.#newChatDialog.close();
    if (this.#presenceDialog.open) this.#presenceDialog.close();
    if (this.#imageDialog.open) this.#imageDialog.close();
    if (this.#aliasDialog.open) this.#aliasDialog.close();
    if (this.#removeChatDialog.open) this.#removeChatDialog.close();
    this.#closeProfileMenu();
    this.#panel.hidden = true;
    this.#launcher.setAttribute("aria-expanded", "false");
  }

  #availableWorkspace(
    view: PrimaryWorkspaceView,
    settings = this.settings.get(),
  ): PrimaryWorkspaceView {
    if (view === "roster" && !settings.linkRoster.enabled) return "home";
    if (view === "activities" && !settings.linkActivities.enabled) return "home";
    return view;
  }

  async openChat(memberNumber: number, memberName?: string): Promise<void> {
    const existing = await this.service.getConversation(memberNumber);
    const name =
      this.adapter.getMemberNickname(memberNumber) ||
      existing?.peerName ||
      memberName?.trim() ||
      this.adapter.getMemberName(memberNumber);
    await this.service.ensureConversation(memberNumber, name);
    await this.#openPanel("chat");
    await this.#selectConversation(memberNumber, name);
  }

  openActivities(): void {
    void this.#openPanel(this.#workspaceView).then(() => this.#openActivities());
  }

  openRoster(): void {
    void this.#openPanel(this.#workspaceView).then(() => this.#openRoster());
  }

  onRosterSync(result: RosterSyncResult): void {
    const countChanged = this.#presentCount !== result.presentCount;
    this.#presentCount = result.presentCount;
    this.#rosterCount.hidden = result.presentCount === 0;
    this.#rosterCount.textContent = result.presentCount > 99 ? "99+" : result.presentCount.toString();
    this.#rosterButton.title = result.presentCount
      ? `LinkRoster · ${result.presentCount} in room`
      : "LinkRoster";
    if (countChanged || result.changed) {
      this.#renderHomeStatus();
      void this.#renderHome();
    }
    if (result.changed) {
      for (const memberNumber of new Set([...result.joined, ...result.left])) {
        this.#schedulePresenceRender(memberNumber);
      }
    }
    if (this.#workspaceView === "roster" && result.changed) this.#renderRoster();
  }

  async refresh(): Promise<void> {
    const [, conversations] = await Promise.all([
      this.#updateUnreadBadge(),
      this.service.listConversations(),
    ]);
    await this.#renderConversations(conversations);
    await this.#renderHome(conversations);
  }

  #buildLauncher(): void {
    this.#badge.hidden = true;
    this.#launcher.append(this.#emblem("kl-launcher-emblem"), this.#badge);
    this.#launcher.setAttribute("aria-expanded", "false");
    this.#launcher.addEventListener("click", () => {
      if (Date.now() < this.#suppressLauncherClickUntil) return;
      if (this.#panel.hidden) void this.open();
      else this.close();
    });
    this.#launcher.addEventListener("pointerdown", (event) => this.#startLauncherDrag(event));
    this.#launcher.addEventListener("pointermove", (event) => this.#moveLauncher(event));
    this.#launcher.addEventListener("pointerup", (event) => this.#finishLauncherDrag(event));
    this.#launcher.addEventListener("pointercancel", (event) => this.#cancelLauncherDrag(event));
  }

  #buildPanel(): void {
    this.#panel.hidden = true;
    this.#panel.id = "kikilink-panel";
    this.#panel.setAttribute("role", "region");
    this.#launcher.setAttribute("aria-controls", this.#panel.id);
    this.#panel.dataset.mobileView = "list";
    this.#panel.dataset.workspace = "home";
    this.#connection.append(this.#connectionDot, this.#connectionText);
    this.setConnectionState(this.adapter.isReady() ? "ready" : "connecting");
    const brand = element(
      "div",
      { className: "kl-brand" },
      this.#emblem("kl-brand-emblem"),
      element(
        "div",
        { className: "kl-brand-copy" },
        element("div", { className: "kl-brand-title", text: "KikiLink" }),
        element(
          "div",
          { className: "kl-brand-subtitle" },
          `Personal Link Deck · v${this.version}`,
          this.#connection,
        ),
      ),
    );
    const close = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Close KikiLink",
      ariaLabel: "Close KikiLink",
      onClick: () => this.close(),
    });
    close.append(kikiIcon("close"));
    this.#topbarSettingsButton.append(kikiIcon("settings"));
    this.#topbarSettingsButton.addEventListener("click", () => this.#openSettings());
    this.#finderTrigger.replaceChildren(
      kikiIcon("search", "kl-finder-trigger-icon"),
      element("span", { className: "kl-finder-trigger-label", text: "Find" }),
      element("kbd", { className: "kl-finder-shortcut", text: "Ctrl K" }),
    );
    this.#finderTrigger.setAttribute("aria-keyshortcuts", "Control+K Meta+K");
    this.#finderTrigger.addEventListener("click", () => this.#openFinder());
    this.#presenceTrigger.replaceChildren(this.#presenceTriggerDot, this.#presenceTriggerLabel);
    this.#presenceTrigger.addEventListener("click", () => this.#openPresenceDialog());
    this.#renderOwnPresence();
    const topbar = element(
      "header",
      { className: "kl-topbar" },
      brand,
      this.#contextTitle,
      this.#presenceTrigger,
      this.#finderTrigger,
      this.#topbarSettingsButton,
      close,
    );

    this.#buildFeatureNavigation();
    this.#buildHome();

    this.#search.type = "search";
    this.#search.placeholder = "Search chats";
    this.#search.autocomplete = "off";
    this.#search.addEventListener("input", () => void this.#renderConversations());
    const sidebar = element(
      "aside",
      { className: "kl-sidebar" },
      element("div", { className: "kl-search-wrap" }, this.#search),
      element(
        "div",
        { className: "kl-sidebar-heading" },
        element("span", { text: "Recent chats" }),
        element("button", {
          className: "kl-sidebar-new-chat",
          type: "button",
          title: "New Beep chat",
          ariaLabel: "New Beep chat",
          onClick: () => this.#openNewChat(),
        }, kikiIcon("plus")),
      ),
      this.#conversationList,
    );

    this.#empty.append(
      element("div", { className: "kl-empty-mark" }, kikiIcon("chat")),
      element("h2", { className: "kl-empty-title", text: "Your Beeps, connected" }),
      element("p", {
        className: "kl-empty-copy",
        text: "Choose a conversation or start a new one by member number.",
      }),
      element("button", {
        className: "kl-text-button kl-text-button--primary",
        type: "button",
        text: "New chat",
        onClick: () => this.#openNewChat(),
      }),
    );

    this.#buildChat();
    const main = element("main", { className: "kl-main" }, this.#empty, this.#chat);
    this.#chatLayout.append(sidebar, main);
    this.#buildRosterPage();
    this.#buildActivitiesPage();
    this.#buildSettingsPage();
    this.#workspace.append(
      this.#home,
      this.#chatLayout,
      this.#rosterPage,
      this.#activitiesPage,
      this.#settingsPage,
    );
    const shell = element("div", { className: "kl-shell" }, this.#featureNav, this.#workspace);
    this.#panel.append(topbar, shell);
    this.#showWorkspace("home", false);
    this.#panel.addEventListener("keydown", (event) => {
      const target = event.target;
      const editing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (
        event.key.toLocaleLowerCase() === "k" &&
        (event.ctrlKey || event.metaKey) &&
        !editing
      ) {
        event.preventDefault();
        this.#openFinder();
        return;
      }
      if (event.key === "Escape" && !this.#profileMenu.hidden) {
        this.#closeProfileMenu();
        return;
      }
      if (
        event.key === "Escape" &&
        !this.#newChatDialog.open &&
        !this.#finderDialog.open &&
        !this.#presenceDialog.open &&
        !this.#imageDialog.open &&
        !this.#aliasDialog.open &&
        !this.#removeChatDialog.open
      ) {
        this.close();
      }
    });
    this.#shadow.addEventListener("pointerdown", (event) => {
      if (this.#profileMenu.hidden || event.composedPath().includes(this.#profileMenu)) return;
      this.#closeProfileMenu();
    });
  }

  #buildFeatureNavigation(): void {
    this.#configureNavButton(this.#homeNavButton, "home", "Home", "home");
    this.#configureNavButton(this.#chatNavButton, "chat", "Chat", "chat");
    this.#configureNavButton(this.#rosterButton, "users", "Players", "roster");
    this.#configureNavButton(this.#activitiesButton, "activities", "Custom", "activities");
    this.#configureNavButton(this.#settingsNavButton, "settings", "Settings", "settings");
    this.#rosterCount.hidden = true;
    this.#rosterButton.append(this.#rosterCount);
    this.#featureNav.append(
      this.#homeNavButton,
      this.#chatNavButton,
      this.#rosterButton,
      this.#activitiesButton,
      this.#settingsNavButton,
    );
  }

  #configureNavButton(
    button: HTMLButtonElement,
    icon: KikiLinkIconName,
    label: string,
    target: FeatureTarget,
  ): void {
    button.dataset.target = target;
    button.replaceChildren(
      kikiIcon(icon, "kl-nav-icon"),
      element("span", { className: "kl-nav-label", text: label }),
    );
    button.addEventListener("click", () => this.#activateFeature(target));
  }

  #activateFeature(target: FeatureTarget): void {
    if (target === "home" || target === "chat") {
      this.#showWorkspace(target);
      void this.refresh();
      return;
    }
    if (target === "roster") {
      this.#openRoster();
      return;
    }
    if (target === "activities") {
      this.#openActivities();
      return;
    }
    this.#openSettings();
  }

  #buildHome(): void {
    this.#homePresence.addEventListener("click", () => this.#openPresenceDialog());
    this.#homeActionTitle.id = "kikilink-home-next-title";
    this.#homeActionButton.addEventListener("click", () => void this.#runHomeAction());
    const nextStep = element(
      "section",
      { className: "kl-home-next", ariaLabel: "Suggested next step" },
      this.#homeActionIcon,
      element(
        "div",
        { className: "kl-home-next-copy" },
        element("div", { className: "kl-home-next-kicker", text: "SUGGESTED NEXT STEP" }),
        this.#homeActionTitle,
        this.#homeActionDescription,
      ),
      element(
        "div",
        { className: "kl-home-next-footer" },
        this.#homeActionMeta,
        this.#homeActionButton,
      ),
    );
    nextStep.setAttribute("aria-labelledby", this.#homeActionTitle.id);

    const homeMark = element(
      "div",
      { className: "kl-home-mark" },
      this.#emblem("kl-home-emblem"),
      element("span", { className: "kl-home-orbit" }),
    );
    homeMark.setAttribute("aria-hidden", "true");
    const hero = element(
      "header",
      { className: "kl-home-hero" },
      element(
        "div",
        { className: "kl-home-hero-copy" },
        element("div", { className: "kl-home-eyebrow", text: "KIKILINK HOME" }),
        this.#homeGreeting,
        element("p", {
          className: "kl-home-lead",
          text: "Your Beeps and room tools, organized around what you want to do next.",
        }),
        element(
          "div",
          { className: "kl-home-statuses" },
          this.#homeStatus("Connection", this.#homeConnection),
          this.#homeStatus("My status", this.#homePresence),
          this.#homeStatus("Current room", this.#homeRoom),
        ),
      ),
      nextStep,
      homeMark,
    );

    const chatCard = element("button", {
      className: "kl-feature-card kl-feature-card--primary",
      type: "button",
      title: "Open LinkChat",
      onClick: () => this.#activateFeature("chat"),
    });
    this.#fillFeatureCard(
      chatCard,
      "chat",
      "START OR CONTINUE",
      "Chat",
      "Read recent Beeps, find conversations, and send a message.",
      this.#homeChatMetric,
      element("span", { className: "kl-feature-card-action", text: "Open Chat" }),
    );
    this.#fillFeatureCard(
      this.#homeRosterCard,
      "users",
      "SEE WHO IS HERE",
      "Players",
      "Find people in the room, Whisper, and keep private notes.",
      this.#homeRosterMetric,
      this.#homeRosterAction,
    );
    this.#homeRosterCard.addEventListener("click", () => this.#activateFeature("roster"));
    this.#fillFeatureCard(
      this.#homeActivitiesCard,
      "activities",
      "EXPRESS YOURSELF",
      "Custom Activities",
      "Create personal actions that appear beside vanilla Activities.",
      this.#homeActivitiesMetric,
      this.#homeActivitiesAction,
    );
    this.#homeActivitiesCard.addEventListener("click", () => this.#activateFeature("activities"));
    const settingsCard = element("button", {
      className: "kl-feature-card",
      type: "button",
      title: "KikiLink settings",
      onClick: () => this.#activateFeature("settings"),
    });
    this.#fillFeatureCard(
      settingsCard,
      "settings",
      "MAKE IT YOURS",
      "Settings",
      "Adjust the look, comfort, launcher, privacy, and optional tools.",
      this.#homeSettingsMetric,
      element("span", { className: "kl-feature-card-action", text: "Customize" }),
    );
    const sectionHeading = element(
      "div",
      { className: "kl-home-section-heading" },
      element("h2", { text: "Choose a tool" }),
      element("p", {
        className: "kl-home-section-description",
        text: "Four clear destinations. Home always brings you back here.",
      }),
    );
    const cards = element(
      "section",
      { className: "kl-feature-grid", ariaLabel: "KikiLink tools" },
      chatCard,
      this.#homeRosterCard,
      this.#homeActivitiesCard,
      settingsCard,
    );
    const privacy = element(
      "div",
      { className: "kl-home-privacy" },
      kikiIcon("lock", "kl-home-privacy-icon"),
      element(
        "span",
        {},
        "Account-private by design · data belongs to this BC MemberNumber; presence is shared only with compatible KikiLink users.",
      ),
    );
    this.#home.append(hero, sectionHeading, cards, privacy);
  }

  #homeStatus(label: string, value: HTMLElement): HTMLDivElement {
    return element(
      "div",
      { className: "kl-home-status" },
      element("span", { className: "kl-home-status-label", text: label }),
      value,
    );
  }

  #fillFeatureCard(
    card: HTMLButtonElement,
    icon: KikiLinkIconName,
    kicker: string,
    title: string,
    description: string,
    metric: HTMLElement,
    action: HTMLElement,
  ): void {
    card.replaceChildren(
      kikiIcon(icon, "kl-feature-card-icon"),
      element(
        "span",
        { className: "kl-feature-card-copy" },
        element("span", { className: "kl-feature-card-kicker", text: kicker }),
        element("span", { className: "kl-feature-card-title", text: title }),
        element("span", { className: "kl-feature-card-description", text: description }),
      ),
      element(
        "span",
        { className: "kl-feature-card-footer" },
        metric,
        action,
      ),
    );
  }

  async #runHomeAction(): Promise<void> {
    const action = this.#homeAction;
    if (action.kind === "new-chat") {
      this.#openNewChat();
      return;
    }
    if (action.kind === "chat") {
      if (action.peerNumber !== undefined) {
        await this.openChat(action.peerNumber, action.peerName);
      } else {
        this.#activateFeature("chat");
      }
      return;
    }
    this.#activateFeature(action.kind);
  }

  #showWorkspace(view: WorkspaceView, remember = true): void {
    if (this.#workspaceView === "roster" && view !== "roster") this.#saveNotebook(false);
    this.#workspaceView = view;
    if (remember && view !== "settings") this.#lastWorkspaceView = view;
    this.#panel.dataset.workspace = view;
    this.#home.hidden = view !== "home";
    this.#chatLayout.hidden = view !== "chat";
    this.#rosterPage.hidden = view !== "roster";
    this.#activitiesPage.hidden = view !== "activities";
    this.#settingsPage.hidden = view !== "settings";
    if (view === "chat" && this.#activePeer === undefined) {
      this.#panel.dataset.mobileView = "list";
    }
    this.#contextTitle.textContent =
      view === "home"
        ? "Home"
        : view === "chat"
          ? "Chat"
          : view === "roster"
            ? "Players"
            : view === "activities"
              ? "Custom Activities"
              : "Settings";
    this.#updateNavigation();
  }

  #updateNavigation(): void {
    for (const button of this.#featureNav.querySelectorAll<HTMLButtonElement>(".kl-nav-item")) {
      const active = button.dataset.target === this.#workspaceView;
      button.dataset.active = String(active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    if (this.#workspaceView === "settings") {
      this.#topbarSettingsButton.setAttribute("aria-current", "page");
    } else {
      this.#topbarSettingsButton.removeAttribute("aria-current");
    }
  }

  #buildChat(): void {
    this.#chat.hidden = true;
    this.#backButton.append(kikiIcon("back"));
    this.#backButton.addEventListener("click", () => this.#showConversationList());
    this.#renderPinButton(false);
    this.#pinButton.addEventListener("click", () => void this.#togglePin());
    this.#profileButton.append(kikiIcon("more"));
    this.#attachImageButton.append(kikiIcon("image"));
    this.#sendButton.replaceChildren(
      kikiIcon("send"),
      element("span", { className: "kl-send-label", text: "Send" }),
    );
    const person = element(
      "div",
      { className: "kl-chat-person" },
      this.#chatName,
      element(
        "div",
        { className: "kl-chat-subline" },
        this.#chatNumber,
        this.#chatPresence,
        this.#chatRoom,
      ),
    );
    const header = element(
      "header",
      { className: "kl-chat-header" },
      this.#backButton,
      this.#chatAvatar,
      person,
      this.#pinButton,
      this.#profileButton,
    );
    this.#profileButton.addEventListener("click", () => {
      if (this.#activePeer === undefined) return;
      const bounds = this.#profileButton.getBoundingClientRect();
      void this.#openProfileMenu(
        this.#activePeer,
        this.#activeName,
        bounds.right,
        bounds.bottom + 6,
      );
    });
    this.#bindProfileMenu(this.#chatAvatar, () =>
      this.#activePeer === undefined
        ? undefined
        : { memberNumber: this.#activePeer, displayName: this.#activeName },
    );
    this.#bindProfileMenu(person, () =>
      this.#activePeer === undefined
        ? undefined
        : { memberNumber: this.#activePeer, displayName: this.#activeName },
    );

    this.#composer.maxLength = 1000;
    this.#composer.rows = 1;
    this.#composer.addEventListener("input", () => {
      this.#resizeComposer();
      this.#updateCounter();
      if (this.#activePeer !== undefined) {
        this.#saveDraft(this.#activePeer, this.#activeNativeName, this.#composer.value);
        this.#updateLocalTyping();
      }
    });
    this.#composer.addEventListener("blur", () => this.#stopLocalTyping());
    this.#composer.addEventListener("keydown", (event) => {
      const enterToSend = this.settings.get().linkChat.enterToSend;
      if (
        event.key === "Enter" &&
        !event.isComposing &&
        ((event.ctrlKey || event.metaKey) || (enterToSend && !event.shiftKey && !event.altKey))
      ) {
        event.preventDefault();
        void this.#send();
      }
    });
    this.#sendButton.addEventListener("click", () => void this.#send());
    this.#attachImageButton.addEventListener("click", () => this.#openImageDialog());
    this.#includeRoom.type = "checkbox";
    this.#includeRoom.addEventListener("change", () => {
      this.settings.update((draft) => {
        draft.linkChat.includeRoomByDefault = this.#includeRoom.checked;
      });
    });
    const options = element(
      "div",
      { className: "kl-composer-options" },
      element("label", { className: "kl-check" }, this.#includeRoom, "Share current room"),
      this.#counter,
    );
    const composer = element(
      "footer",
      { className: "kl-composer" },
      this.#typingIndicator,
      this.#quickActions,
      element(
        "div",
        { className: "kl-composer-row" },
        this.#attachImageButton,
        this.#composer,
        this.#sendButton,
      ),
      options,
    );
    this.#typingIndicator.hidden = true;
    this.#typingIndicator.setAttribute("role", "status");
    this.#typingIndicator.setAttribute("aria-live", "polite");
    this.#chat.append(header, this.#messages, composer);
    this.#renderQuickActions();
    this.#updateCounter();
  }

  #buildSettingsPage(): void {
    const header = element(
      "header",
      { className: "kl-feature-page-header" },
      element(
        "div",
        { className: "kl-feature-page-heading" },
        element("div", { className: "kl-feature-page-eyebrow", text: "MAKE IT YOURS" }),
        element("h1", { className: "kl-feature-page-title", text: "Settings" }),
        element("p", {
          className: "kl-feature-page-subtitle",
          text: "Tune KikiLink for your screen, habits, and comfort without changing the game.",
        }),
      ),
    );

    this.#themeSelect.replaceChildren(
      selectOption("dark", "Dark lacquer"),
      selectOption("light", "Light paper"),
      selectOption("system", "Follow system"),
    );
    this.#themeSelect.dataset.setting = "theme";
    this.#themeSelect.setAttribute("aria-label", "Theme");
    const theme = this.#settingRow(
      "Theme",
      "Lacquer black, warm paper, or your system theme.",
      this.#themeSelect,
    );

    this.#accentInput.type = "color";
    this.#accentInput.dataset.setting = "accent";
    this.#accentInput.setAttribute("aria-label", "Custom accent color");
    const accentPresets = element("div", { className: "kl-color-presets" });
    for (const [color, label] of [
      ["#d71932", "Crimson"],
      ["#b63a67", "Sakura"],
      ["#ad7624", "Gold"],
      ["#7557c8", "Violet"],
      ["#247f7a", "Jade"],
    ] as const) {
      const swatch = element("button", {
        className: "kl-color-swatch",
        type: "button",
        title: label,
        ariaLabel: `Use ${label} accent`,
        onClick: () => {
          this.#accentInput.value = color;
          this.#updateAccentPresets();
        },
      });
      swatch.dataset.color = color;
      swatch.setAttribute("aria-pressed", "false");
      swatch.style.setProperty("--kl-swatch", color);
      accentPresets.append(swatch);
    }
    this.#accentInput.addEventListener("input", () => this.#updateAccentPresets());
    const accent = this.#settingRow(
      "Accent color",
      "Choose a preset or any color that feels like yours.",
      element("div", { className: "kl-color-control" }, accentPresets, this.#accentInput),
    );

    this.#densitySelect.replaceChildren(
      selectOption("comfortable", "Comfortable"),
      selectOption("compact", "Compact"),
      selectOption("super-compact", "Super compact"),
    );
    this.#densitySelect.dataset.setting = "density";
    this.#densitySelect.setAttribute("aria-label", "Interface spacing");
    const density = this.#settingRow(
      "Spacing",
      "Comfortable is roomy; Compact fits more; Super compact keeps only the essentials.",
      this.#densitySelect,
    );

    this.#textScaleSelect.replaceChildren(
      selectOption("normal", "Default"),
      selectOption("large", "Large"),
      selectOption("extra-large", "Extra large"),
    );
    this.#textScaleSelect.dataset.setting = "text-scale";
    this.#textScaleSelect.setAttribute("aria-label", "Text size");
    const textScale = this.#settingRow(
      "Text size",
      "Increase labels and supporting text throughout the deck.",
      this.#textScaleSelect,
    );

    this.#homeLayoutSelect.replaceChildren(
      selectOption("showcase", "Guided"),
      selectOption("compact", "Focused"),
    );
    this.#homeLayoutSelect.dataset.setting = "home-layout";
    this.#homeLayoutSelect.setAttribute("aria-label", "Home style");
    const homeLayout = this.#settingRow(
      "Home style",
      "Guided suggests a useful next step; Focused keeps only the essentials.",
      this.#homeLayoutSelect,
    );

    this.#launcherSideSelect.replaceChildren(
      selectOption("right", "Right"),
      selectOption("left", "Left"),
    );
    this.#launcherSideSelect.dataset.setting = "launcher-side";
    this.#launcherSideSelect.setAttribute("aria-label", "Launcher side");
    const launcherSide = this.#settingRow(
      "Launcher side",
      "Choose its default side. You can still drag the emblem anywhere.",
      this.#launcherSideSelect,
    );

    this.#launcherOpenSelect.replaceChildren(
      selectOption("home", "Link Deck home"),
      selectOption("last", "Last section"),
      selectOption("chat", "LinkChat directly"),
    );
    this.#launcherOpenSelect.dataset.setting = "launcher-open";
    this.#launcherOpenSelect.setAttribute("aria-label", "Launcher opens");
    const launcherOpen = this.#settingRow(
      "Launcher opens",
      "Choose what happens when you tap the floating emblem.",
      this.#launcherOpenSelect,
    );

    this.#reducedMotionToggle.type = "checkbox";
    const reducedMotionSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#reducedMotionToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#reducedMotionToggle.setAttribute("aria-label", "Reduced motion");
    const reducedMotion = this.#settingRow(
      "Reduced motion",
      "Disable panel and control animations.",
      reducedMotionSwitch,
    );

    this.#roomBadgeToggle.type = "checkbox";
    this.#roomBadgeToggle.setAttribute("aria-label", "Show KikiLink Blossom");
    const roomBadgeSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#roomBadgeToggle,
      element("span", { className: "kl-switch-track" }),
    );
    const moveRoomBadge = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Move flower",
      onClick: () => this.#beginRoomBadgePlacement(),
    });
    const resetRoomBadge = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Reset flower position",
      onClick: () => this.#resetRoomBadgePosition(),
    });
    const roomBadgeSection = element(
      "section",
      { className: "kl-setting-section kl-room-badge-settings" },
      element("div", { className: "kl-setting-section-title", text: "Blossom badge" }),
      this.#settingRow(
        "Show Blossom flower",
        "A small translucent KikiLink mark beside the addon icons above compatible characters.",
        roomBadgeSwitch,
      ),
      element(
        "div",
        { className: "kl-setting-action-row" },
        element(
          "div",
          { className: "kl-setting-copy" },
          element("div", { className: "kl-setting-name", text: "Flower position" }),
          element("div", {
            className: "kl-setting-help",
            text: "Choose Move flower while you are in a room, then drag the flower above your character once. Normal gameplay cannot move it.",
          }),
        ),
        element("div", { className: "kl-inline-actions" }, moveRoomBadge, resetRoomBadge),
      ),
    );

    this.#historyToggle.type = "checkbox";
    const historySwitch = element(
      "label",
      { className: "kl-switch" },
      this.#historyToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#historyToggle.setAttribute("aria-label", "Save message history");
    const history = this.#settingRow(
      "Save message history",
      "Stored for this BC account; recent history is mirrored to your other devices.",
      historySwitch,
    );

    this.#enterToSendToggle.type = "checkbox";
    const enterToSendSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#enterToSendToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#enterToSendToggle.setAttribute("aria-label", "Send messages with Enter");
    const enterToSend = this.#settingRow(
      "Enter sends",
      "Press Enter to send and Shift+Enter for a new line. Ctrl+Enter always sends.",
      enterToSendSwitch,
    );

    this.#typingIndicatorsToggle.type = "checkbox";
    const typingIndicatorsSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#typingIndicatorsToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#typingIndicatorsToggle.setAttribute("aria-label", "Share typing indicators");
    const typingIndicators = this.#settingRow(
      "Typing indicators",
      "Show and share a short-lived typing signal only with compatible KikiLink users.",
      typingIndicatorsSwitch,
    );

    this.#imagePreviewSelect.replaceChildren(
      selectOption("ask", "Ask before loading"),
      selectOption("always", "Always show"),
      selectOption("never", "Links only"),
    );
    this.#imagePreviewSelect.setAttribute("aria-label", "Remote image previews");
    const imagePreviews = this.#settingRow(
      "Image previews",
      "Remote hosts can see your IP when an image loads. Ask first adds a one-time Show avatar action to player menus.",
      this.#imagePreviewSelect,
    );

    this.#imageUploadsToggle.type = "checkbox";
    this.#imageUploadsToggle.setAttribute("aria-label", "Enable temporary local image uploads");
    this.#imageUploadsToggle.addEventListener("change", () =>
      this.#renderImageUploadSettingsOptions(),
    );
    const imageUploadsSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#imageUploadsToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#imageUploadRetentionSelect.replaceChildren(
      selectOption("1h", "1 hour"),
      selectOption("12h", "12 hours"),
      selectOption("24h", "24 hours"),
      selectOption("72h", "3 days"),
    );
    this.#imageUploadRetentionSelect.setAttribute("aria-label", "Temporary image lifetime");
    const litterboxLink = element("a", {
      className: "kl-inline-link",
      text: "Litterbox by Catbox",
    });
    litterboxLink.href = "https://litterbox.catbox.moe/";
    litterboxLink.target = "_blank";
    litterboxLink.rel = "noopener noreferrer";
    this.#imageUploadSettingsOptions.append(
      this.#settingRow(
        "Link lifetime",
        "The host removes the temporary file after this period.",
        this.#imageUploadRetentionSelect,
      ),
      element(
        "p",
        { className: "kl-image-upload-privacy" },
        kikiIcon("lock"),
        element(
          "span",
          {},
          "Only Upload & send makes a network request. KikiLink removes the filename and metadata, resizes to 2560 px, then sends the public file to ",
          litterboxLink,
          ". Catbox can see your IP and image; expiration cannot remove copies someone already saved.",
        ),
      ),
    );
    const imageUploads = element(
      "section",
      { className: "kl-setting-section kl-image-upload-settings" },
      element("div", {
        className: "kl-setting-section-title",
        text: "Temporary local images",
      }),
      this.#settingRow(
        "Upload local files",
        "Upload through Litterbox without creating an account.",
        imageUploadsSwitch,
      ),
      this.#imageUploadSettingsOptions,
    );

    this.#retentionInput.type = "number";
    this.#retentionInput.min = "1";
    this.#retentionInput.max = "3650";
    this.#retentionInput.dataset.setting = "retention-days";
    this.#retentionInput.setAttribute("aria-label", "Message retention in days");
    const retention = this.#settingRow(
      "Retention",
      "Automatically remove older messages.",
      element("label", {}, this.#retentionInput, " days"),
    );

    const clearHistory = element("button", {
      className: "kl-text-button kl-text-button--danger",
      type: "button",
      text: "Clear all LinkChat history",
      onClick: () => void this.#clearHistory(),
    });
    const appearanceSection = this.#createSettingsPanel(
      "appearance",
      "Appearance & comfort",
      "Choose a look and reading density that stays comfortable during long sessions.",
      theme,
      accent,
      density,
      textScale,
      homeLayout,
      reducedMotion,
      roomBadgeSection,
    );

    const resetLauncher = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Reset launcher position",
      onClick: () => this.#resetLauncherPosition(),
    });
    const navigationSection = this.#createSettingsPanel(
      "navigation",
      "Navigation & launcher",
      "Decide where KikiLink lives and what you see first.",
      launcherOpen,
      launcherSide,
      element(
        "div",
        { className: "kl-setting-action-row" },
        element(
          "div",
          { className: "kl-setting-copy" },
          element("div", { className: "kl-setting-name", text: "Launcher position" }),
          element("div", {
            className: "kl-setting-help",
            text: "A button alternative to dragging: return the emblem to its safe corner.",
          }),
        ),
        resetLauncher,
      ),
    );

    this.#rosterEnabledToggle.type = "checkbox";
    const rosterEnabledSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#rosterEnabledToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#rosterEnabledToggle.setAttribute("aria-label", "Enable LinkRoster");
    const rosterEnabled = this.#settingRow(
      "Enable LinkRoster",
      "Room roster, quick player actions, favorites, and private notes.",
      rosterEnabledSwitch,
    );
    this.#rosterTrackingToggle.type = "checkbox";
    const rosterTrackingSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#rosterTrackingToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#rosterTrackingToggle.setAttribute("aria-label", "Remember player encounters");
    const rosterTracking = this.#settingRow(
      "Remember encounters",
      "Store the last room, time, and encounter count only for this BC account.",
      rosterTrackingSwitch,
    );
    this.#rosterRetentionSelect.replaceChildren(
      selectOption("30", "30 days"),
      selectOption("90", "90 days"),
      selectOption("180", "180 days"),
      selectOption("365", "1 year"),
      selectOption("730", "2 years"),
      selectOption("0", "Keep forever"),
    );
    this.#rosterRetentionSelect.dataset.setting = "roster-retention";
    this.#rosterRetentionSelect.setAttribute("aria-label", "Player encounter retention");
    const rosterRetention = this.#settingRow(
      "Forget old encounters",
      "Applies only to players without notes, tags, or a favorite. Notebook entries stay safe.",
      this.#rosterRetentionSelect,
    );

    this.#notebookFileInput.type = "file";
    this.#notebookFileInput.accept = ".json,application/json";
    this.#notebookFileInput.hidden = true;
    this.#notebookFileInput.addEventListener("change", () => void this.#importNotebookFile());
    const exportNotebook = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Export",
      ariaLabel: "Export player notebook backup",
      onClick: () => this.#exportNotebook(),
    });
    const importNotebook = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Import",
      ariaLabel: "Import player notebook backup",
      onClick: () => this.#notebookFileInput.click(),
    });
    const notebookTools = element(
      "section",
      { className: "kl-data-tools" },
      element(
        "div",
        { className: "kl-data-tools-copy" },
        element("div", { className: "kl-data-tools-title", text: "Notebook backup" }),
        element("div", {
          className: "kl-setting-help",
          text: "Download or merge a manual JSON backup of this account's player notebook.",
        }),
        this.#notebookCount,
      ),
      element(
        "div",
        { className: "kl-data-tools-actions" },
        exportNotebook,
        importNotebook,
        this.#notebookFileInput,
      ),
    );
    const clearPeople = element("button", {
      className: "kl-text-button kl-text-button--danger",
      type: "button",
      text: "Clear player notes & encounter history",
      onClick: () => this.#clearPeople(),
    });
    const rosterSection = this.#createSettingsPanel(
      "players",
      "Players & private notebook",
      "Control what the player workspace remembers for this BC account.",
      rosterEnabled,
      rosterTracking,
      rosterRetention,
      notebookTools,
      clearPeople,
    );
    const addQuickAction = element("button", {
      className: "kl-text-button kl-add-action",
      type: "button",
      text: "+ Add quick action",
      onClick: () => this.#addQuickActionEditorRow(),
    });
    const quickActionsSection = element(
      "section",
      { className: "kl-setting-section kl-setting-editor-section" },
      element("div", { className: "kl-setting-section-title", text: "Quick actions" }),
      element("div", {
        className: "kl-setting-help",
        text: "Insert reusable actions into a Beep. Variables: {name}, {member}, {me}.",
      }),
      this.#quickActionsEditor,
      addQuickAction,
    );
    const chatSection = this.#createSettingsPanel(
      "chat",
      "Chat, history & privacy",
      "Keep this account's Beep history useful and under your control.",
      enterToSend,
      typingIndicators,
      imagePreviews,
      imageUploads,
      history,
      retention,
      quickActionsSection,
      clearHistory,
    );

    this.#activitiesToggle.type = "checkbox";
    const activitiesSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#activitiesToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#activitiesToggle.setAttribute("aria-label", "Show Custom Activities tab");
    const activitiesEnabled = this.#settingRow(
      "Show Custom Activities tab",
      "Keep your personal activity builder in the KikiLink toolbar.",
      activitiesSwitch,
    );
    const openCustomActivities = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Open Custom Activities",
      onClick: () => this.#openActivities(),
    });
    const activitiesSection = this.#createSettingsPanel(
      "activities",
      "Custom Activities",
      "Create personal actions without replacing or cluttering Bondage Club's vanilla Activities.",
      activitiesEnabled,
      element("div", {
        className: "kl-presence-caveat",
        text: "Your account's list starts empty. Blossom marks every custom action in the native menu.",
      }),
      openCustomActivities,
    );

    this.#friendOnlineAlertToggle.type = "checkbox";
    const friendOnlineSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#friendOnlineAlertToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#friendOnlineAlertToggle.setAttribute("aria-label", "Friend online alerts");
    const friendOnlineAlerts = this.#settingRow(
      "Friends come online",
      "Show a small local notice when a friend appears online.",
      friendOnlineSwitch,
    );

    this.#roomJoinAlertToggle.type = "checkbox";
    const roomJoinSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#roomJoinAlertToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#roomJoinAlertToggle.setAttribute("aria-label", "Room join alerts");
    const roomJoinAlerts = this.#settingRow(
      "Someone joins your room",
      "Show a small local notice after a player joins the current room.",
      roomJoinSwitch,
    );

    this.#notificationSoundsToggle.type = "checkbox";
    const notificationSoundsSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#notificationSoundsToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#notificationSoundsToggle.setAttribute("aria-label", "Notification sounds");
    this.#notificationSoundsToggle.addEventListener("change", () => {
      if (this.#notificationSoundsToggle.checked) void this.#notificationSounds.unlock();
    });
    const notificationSounds = this.#settingRow(
      "Notification sounds",
      "Use a different gentle sound for chats and the alerts above.",
      notificationSoundsSwitch,
    );

    const soundEntries = Object.entries(NOTIFICATION_SOUND_LABELS) as Array<
      [NotificationSoundPreset, string]
    >;
    for (const select of [
      this.#chatSoundSelect,
      this.#friendOnlineSoundSelect,
      this.#roomJoinSoundSelect,
    ]) {
      select.replaceChildren(
        ...soundEntries.map(([value, label]) => selectOption(value, label)),
      );
    }
    this.#chatSoundSelect.setAttribute("aria-label", "Chat notification sound");
    this.#friendOnlineSoundSelect.setAttribute("aria-label", "Friend online sound");
    this.#roomJoinSoundSelect.setAttribute("aria-label", "Room join sound");
    const soundChoice = (label: string, select: HTMLSelectElement): HTMLElement =>
      element(
        "div",
        { className: "kl-sound-choice" },
        element("span", { className: "kl-setting-name", text: label }),
        element(
          "div",
          { className: "kl-sound-choice-controls" },
          select,
          element("button", {
            className: "kl-text-button kl-sound-preview",
            type: "button",
            text: "Play",
            ariaLabel: `Preview ${label.toLocaleLowerCase()} sound`,
            onClick: () =>
              void this.#notificationSounds.play(soundPresetOr(select.value, "chime")),
          }),
        ),
      );
    const soundChoices = element(
      "details",
      { className: "kl-settings-disclosure kl-sound-settings" },
      element(
        "summary",
        {},
        element("span", { text: "Choose sounds" }),
        element("span", { className: "kl-disclosure-meta", text: "Optional" }),
      ),
      element(
        "div",
        { className: "kl-sound-choices" },
        soundChoice("Incoming chat", this.#chatSoundSelect),
        soundChoice("Friend online", this.#friendOnlineSoundSelect),
        soundChoice("Room join", this.#roomJoinSoundSelect),
      ),
    );

    this.#reactionsToggle.type = "checkbox";
    const reactionsSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#reactionsToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#reactionsToggle.setAttribute("aria-label", "Enable advanced reaction rules");
    const reactionsEnabled = this.#settingRow(
      "Enable custom rules",
      "Run your own ordered event rules. Leave this off if the quick alerts are enough.",
      reactionsSwitch,
    );
    const addReactionRule = element("button", {
      className: "kl-text-button kl-add-action kl-add-reaction-rule",
      type: "button",
      text: "+ Add event rule",
      onClick: () => this.#addReactionRuleEditorRow(),
    });
    const reactionRules = element(
      "section",
      { className: "kl-setting-section kl-setting-editor-section kl-reaction-rules" },
      element(
        "div",
        { className: "kl-reaction-rules-heading" },
        element("div", { className: "kl-setting-section-title", text: "Custom rules" }),
      ),
      element("div", {
        className: "kl-setting-help",
        text: "Triggers: incoming Beep, room join/leave, or friend online. Variables: {name}, {member}, {message}, {room}, {me}, {event}.",
      }),
      this.#reactionRulesEditor,
      addReactionRule,
    );
    const reactionSafety = element(
      "div",
      { className: "kl-reaction-safety" },
      kikiIcon("lock", "kl-reaction-safety-icon"),
      element(
        "span",
        {},
        "Local notices stay private. Public room emotes never expose {message} and keep the 10-second send guard.",
      ),
    );
    const advancedReactions = element(
      "details",
      { className: "kl-settings-disclosure kl-reaction-advanced" },
      element(
        "summary",
        {},
        element("span", { text: "Advanced" }),
        this.#reactionRuleCount,
      ),
      element(
        "div",
        { className: "kl-reaction-advanced-content" },
        reactionsEnabled,
        reactionSafety,
        reactionRules,
      ),
    );
    const reactionsSection = this.#createSettingsPanel(
      "reactions",
      "Notifications",
      "Turn on only the alerts you want. Everything else stays out of the way.",
      friendOnlineAlerts,
      roomJoinAlerts,
      notificationSounds,
      soundChoices,
      advancedReactions,
    );

    const panels = element(
      "div",
      { className: "kl-settings-panels" },
      appearanceSection,
      navigationSection,
      chatSection,
      rosterSection,
      activitiesSection,
      reactionsSection,
    );

    this.#saveSettingsButton.addEventListener("click", () => this.#saveSettings());
    const cancel = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Discard",
      onClick: () => this.#cancelSettings(),
    });
    const actions = element(
      "footer",
      { className: "kl-settings-actions" },
      element("span", {
        className: "kl-settings-local-note",
        text: "Saved to this BC account.",
      }),
      cancel,
      this.#saveSettingsButton,
    );
    this.#settingsPage.append(
      header,
      element("div", { className: "kl-settings-layout" }, this.#settingsTabs, panels),
      actions,
    );
    this.#updateSettingsTabOrientation();
  }

  #createSettingsPanel(
    section: SettingsSection,
    title: string,
    description: string,
    ...children: Node[]
  ): HTMLElement {
    const tabId = `kikilink-settings-tab-${section}`;
    const panelId = `kikilink-settings-panel-${section}`;
    const labels: Record<SettingsSection, { icon: KikiLinkIconName; label: string }> = {
      appearance: { icon: "appearance", label: "Appearance" },
      navigation: { icon: "navigation", label: "Navigation" },
      chat: { icon: "chat", label: "Chat" },
      players: { icon: "users", label: "Players" },
      activities: { icon: "activities", label: "Activities" },
      reactions: { icon: "reactions", label: "Alerts" },
    };
    const tab = element(
      "button",
      { className: "kl-settings-tab", type: "button" },
      kikiIcon(labels[section].icon, "kl-settings-tab-icon"),
      element("span", { text: labels[section].label }),
    );
    tab.id = tabId;
    tab.dataset.section = section;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panelId);
    tab.setAttribute("aria-selected", "false");
    tab.tabIndex = -1;
    tab.addEventListener("click", () => this.#showSettingsSection(section, true));
    tab.addEventListener("keydown", (event) => this.#handleSettingsTabKey(event));
    this.#settingsTabs.setAttribute("role", "tablist");
    this.#settingsTabs.setAttribute("aria-label", "Settings categories");
    this.#settingsTabs.append(tab);

    const panel = element(
      "section",
      { className: "kl-settings-panel" },
      element("h2", { className: "kl-settings-panel-title", text: title }),
      element("p", { className: "kl-settings-panel-description", text: description }),
      element("div", { className: "kl-settings-panel-body" }, ...children),
    );
    panel.id = panelId;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tabId);
    panel.hidden = true;
    this.#settingsPanels.set(section, panel);
    return panel;
  }

  #handleSettingsTabKey(event: KeyboardEvent): void {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    const tabs = [...this.#settingsTabs.querySelectorAll<HTMLButtonElement>(".kl-settings-tab")];
    const current = tabs.indexOf(event.currentTarget as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (current + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next]?.focus();
    const section = tabs[next]?.dataset.section as SettingsSection | undefined;
    if (section) this.#showSettingsSection(section, true);
  }

  #updateSettingsTabOrientation(): void {
    this.#settingsTabs.setAttribute(
      "aria-orientation",
      window.matchMedia?.("(max-width: 720px)").matches ? "horizontal" : "vertical",
    );
  }

  #buildNewChatDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "New Beep chat" });
    title.id = "kikilink-new-chat-title";
    this.#newChatDialog.setAttribute("aria-labelledby", title.id);
    const close = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Close",
      ariaLabel: "Close new chat",
      onClick: () => this.#newChatDialog.close(),
    });
    close.append(kikiIcon("close"));
    const header = element(
      "header",
      { className: "kl-dialog-header" },
      title,
      close,
    );

    this.#newChatQuery.type = "search";
    this.#newChatQuery.placeholder = "Search name or enter member number";
    this.#newChatQuery.autocomplete = "off";
    this.#newChatQuery.addEventListener("input", () => this.#renderKnownContacts());
    this.#newChatQuery.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void this.#submitNewChat();
    });

    const body = element(
      "div",
      { className: "kl-dialog-body kl-new-chat-body" },
      this.#newChatQuery,
      element("div", { className: "kl-contact-heading", text: "Known contacts" }),
      this.#newChatResults,
    );
    const open = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Open chat",
      onClick: () => void this.#submitNewChat(),
    });
    const cancel = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Cancel",
      onClick: () => this.#newChatDialog.close(),
    });
    this.#newChatDialog.append(
      header,
      body,
      element("footer", { className: "kl-dialog-actions" }, cancel, open),
    );
  }

  #buildFinderDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "Find anything" });
    title.id = "kikilink-finder-title";
    this.#finderDialog.setAttribute("aria-labelledby", title.id);
    const close = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Close",
      ariaLabel: "Close LinkFinder",
      onClick: () => this.#finderDialog.close(),
    });
    close.append(kikiIcon("close"));
    const header = element(
      "header",
      { className: "kl-dialog-header" },
      element(
        "div",
        { className: "kl-dialog-heading" },
        title,
        element("div", {
          className: "kl-dialog-subtitle",
          text: "Jump to a chat, player, activity, or setting.",
        }),
      ),
      close,
    );

    this.#finderResults.id = "kikilink-finder-results";
    this.#finderResults.setAttribute("role", "listbox");
    this.#finderResults.setAttribute("aria-label", "KikiLink search results");
    this.#finderQuery.type = "search";
    this.#finderQuery.placeholder = "Search chats, players, activities, settings…";
    this.#finderQuery.autocomplete = "off";
    this.#finderQuery.spellcheck = false;
    this.#finderQuery.setAttribute("role", "combobox");
    this.#finderQuery.setAttribute("aria-label", "Find anything in KikiLink");
    this.#finderQuery.setAttribute("aria-autocomplete", "list");
    this.#finderQuery.setAttribute("aria-controls", this.#finderResults.id);
    this.#finderQuery.setAttribute("aria-expanded", "false");
    this.#finderQuery.addEventListener("input", () => this.#renderFinderResults());
    this.#finderQuery.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        this.#moveFinderSelection(event.key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (event.key === "Enter" && this.#visibleFinderResults.length > 0) {
        event.preventDefault();
        void this.#chooseFinderResult(this.#finderSelectedIndex);
      }
    });

    this.#finderStatus.setAttribute("role", "status");
    this.#finderStatus.setAttribute("aria-live", "polite");
    this.#finderDialog.addEventListener("close", () => {
      this.#finderRenderToken += 1;
      this.#finderQuery.setAttribute("aria-expanded", "false");
      this.#finderQuery.removeAttribute("aria-activedescendant");
    });

    const searchIcon = kikiIcon("search", "kl-finder-search-icon");
    searchIcon.setAttribute("aria-hidden", "true");
    const body = element(
      "div",
      { className: "kl-finder-body" },
      element("div", { className: "kl-finder-input-wrap" }, searchIcon, this.#finderQuery),
      this.#finderStatus,
      this.#finderResults,
    );
    const footer = element(
      "footer",
      { className: "kl-finder-footer" },
      element("span", { text: "Results stay in this browser" }),
      element(
        "span",
        { className: "kl-finder-keys" },
        element("kbd", { text: "↑↓" }),
        " navigate ",
        element("kbd", { text: "Enter" }),
        " open ",
        element("kbd", { text: "Esc" }),
        " close",
      ),
    );
    this.#finderDialog.append(header, body, footer);
  }

  #buildPresenceDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "Your KikiLink profile" });
    title.id = "kikilink-presence-title";
    this.#presenceDialog.setAttribute("aria-labelledby", title.id);
    const close = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Close",
      ariaLabel: "Close status menu",
      onClick: () => this.#presenceDialog.close(),
    });
    close.append(kikiIcon("close"));
    const header = element(
      "header",
      { className: "kl-dialog-header" },
      element(
        "div",
        { className: "kl-dialog-heading" },
        title,
        element("div", {
          className: "kl-dialog-subtitle",
          text: "Avatar, status, Idle, and a quiet AFK auto-reply in one place.",
        }),
      ),
      close,
    );

    this.#presenceEnabledToggle.type = "checkbox";
    this.#presenceEnabledToggle.setAttribute("aria-label", "Share KikiLink presence");
    this.#presenceEnabledToggle.addEventListener("change", () => this.#renderPresenceDialog());
    const presenceEnabledSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#presenceEnabledToggle,
      element("span", { className: "kl-switch-track" }),
    );

    for (const status of ["online", "idle", "dnd", "offline"] as const) {
      const option = element(
        "button",
        { className: "kl-presence-option", type: "button" },
        presenceDot(status),
        element(
          "span",
          { className: "kl-presence-option-copy" },
          element("span", { className: "kl-presence-option-title", text: presenceLabel(status) }),
          element("span", { className: "kl-presence-option-help", text: presenceHelp(status) }),
        ),
        element("span", { className: "kl-presence-option-check", text: "✓" }),
      );
      option.dataset.status = status;
      option.addEventListener("click", () => {
        this.presence.setOwnStatus(status);
        this.#renderOwnPresence();
        this.#renderPresenceDialog();
      });
      this.#presenceOptions.append(option);
    }

    this.#presenceMessage.type = "text";
    this.#presenceMessage.maxLength = 80;
    this.#presenceMessage.placeholder = "Optional: roleplaying, busy, open to chat…";
    this.#presenceMessage.autocomplete = "off";
    this.#autoIdleInput.type = "number";
    this.#autoIdleInput.min = "0";
    this.#autoIdleInput.max = "120";
    this.#autoIdleInput.step = "1";
    this.#autoIdleInput.setAttribute("aria-label", "Minutes before automatic Idle");

    this.#presenceAvatarUrl.type = "url";
    this.#presenceAvatarUrl.maxLength = 500;
    this.#presenceAvatarUrl.placeholder = "https://i.imgur.com/avatar.png";
    this.#presenceAvatarUrl.autocomplete = "off";
    this.#presenceAvatarUrl.spellcheck = false;
    this.#presenceAvatarUrl.setAttribute("aria-label", "Direct profile avatar URL");
    this.#presenceAvatarUrl.addEventListener("input", () => this.#renderOwnAvatarPreview());

    this.#afkAutoReplyToggle.type = "checkbox";
    this.#afkAutoReplyToggle.setAttribute("aria-label", "Send an automatic reply while Idle");
    this.#afkAutoReplyToggle.addEventListener("change", () => this.#renderPresenceDialog());
    const afkAutoReplySwitch = element(
      "label",
      { className: "kl-switch" },
      this.#afkAutoReplyToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#afkAutoReplyMessage.maxLength = 500;
    this.#afkAutoReplyMessage.placeholder = "Hi, I'm AFK. Message me later!";
    this.#afkAutoReplyOptions.append(
      element("span", { className: "kl-custom-field-label", text: "AFK message" }),
      this.#afkAutoReplyMessage,
      element("span", {
        className: "kl-custom-field-help",
        text: "Sent privately at most once per person during an Idle session; your room is never included.",
      }),
    );

    const body = element(
      "div",
      { className: "kl-dialog-body kl-presence-body" },
      this.#settingRow(
        "Share presence",
        "Answer compatible KikiLink status requests and announce inside your current room.",
        presenceEnabledSwitch,
      ),
      this.#presenceOptions,
      element(
        "label",
        { className: "kl-presence-field" },
        element("span", { className: "kl-presence-field-label", text: "Status note" }),
        this.#presenceMessage,
      ),
      element(
        "section",
        { className: "kl-profile-avatar-field" },
        this.#presenceAvatarPreview,
        element(
          "label",
          { className: "kl-presence-field" },
          element("span", { className: "kl-presence-field-label", text: "Profile avatar" }),
          this.#presenceAvatarUrl,
          element("span", {
            className: "kl-custom-field-help",
            text: "Use a direct HTTPS JPG, PNG, GIF, WebP, or AVIF link from Imgur, Catbox, or another host. Other players' avatars follow your image-preview privacy setting.",
          }),
        ),
      ),
      this.#settingRow(
        "Automatic Idle",
        "Minutes without a tap or keypress. Enter 0 to disable; maximum 120.",
        element("label", {}, this.#autoIdleInput, " min"),
      ),
      this.#settingRow(
        "Reply while AFK",
        "When Automatic Idle is active, privately answer new Beeps for you.",
        afkAutoReplySwitch,
      ),
      this.#afkAutoReplyOptions,
      element(
        "div",
        { className: "kl-presence-caveat" },
        kikiIcon("lock"),
        "Appear Offline changes KikiLink only. Bondage Club can still show your native online state.",
      ),
    );
    const save = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Save profile",
      onClick: () => this.#savePresencePreferences(),
    });
    this.#presenceDialog.append(
      header,
      body,
      element(
        "footer",
        { className: "kl-dialog-actions" },
        element("button", {
          className: "kl-text-button",
          type: "button",
          text: "Close",
          onClick: () => this.#presenceDialog.close(),
        }),
        save,
      ),
    );
  }

  #openPresenceDialog(): void {
    const config = this.settings.get().linkPresence;
    this.#presenceEnabledToggle.checked = config.enabled;
    this.#presenceMessage.value = config.statusMessage;
    this.#presenceAvatarUrl.value = config.avatarUrl;
    this.#autoIdleInput.value = config.autoIdleMinutes.toString();
    this.#afkAutoReplyToggle.checked = config.afkAutoReply.enabled;
    this.#afkAutoReplyMessage.value = config.afkAutoReply.message;
    this.#renderOwnAvatarPreview();
    this.#renderPresenceDialog();
    if (!this.#presenceDialog.open) this.#presenceDialog.showModal();
    this.#presenceOptions.querySelector<HTMLButtonElement>('[data-active="true"]')?.focus();
  }

  #renderPresenceDialog(): void {
    const selected = this.settings.get().linkPresence.status;
    const enabled = this.#presenceEnabledToggle.checked;
    for (const option of this.#presenceOptions.querySelectorAll<HTMLButtonElement>(
      ".kl-presence-option",
    )) {
      const active = option.dataset.status === selected;
      option.dataset.active = String(active);
      option.setAttribute("aria-pressed", String(active));
      option.disabled = !enabled;
    }
    this.#presenceMessage.disabled = !enabled;
    this.#afkAutoReplyMessage.disabled = !this.#afkAutoReplyToggle.checked;
    this.#afkAutoReplyOptions.dataset.disabled = String(!this.#afkAutoReplyToggle.checked);
  }

  #savePresencePreferences(): void {
    const autoIdle = Number(this.#autoIdleInput.value);
    const normalizedAvatarUrl = this.#presenceAvatarUrl.value.trim()
      ? normalizeImageUrl(this.#presenceAvatarUrl.value)
      : null;
    if (
      this.#presenceAvatarUrl.value.trim() &&
      (!normalizedAvatarUrl || normalizedAvatarUrl.length > 500)
    ) {
      this.#presenceAvatarUrl.focus();
      this.#toast("Use a direct HTTPS avatar link up to 500 characters ending in an image extension.", "error");
      return;
    }
    const avatarUrl = normalizedAvatarUrl ?? "";
    if (
      !Number.isInteger(autoIdle) ||
      autoIdle < 0 ||
      autoIdle > 120
    ) {
      this.#autoIdleInput.focus();
      this.#toast("Automatic Idle must be between 0 and 120 minutes.", "error");
      return;
    }
    if (this.#afkAutoReplyToggle.checked && !this.#afkAutoReplyMessage.value.trim()) {
      this.#afkAutoReplyMessage.focus();
      this.#toast("Add a short AFK auto-reply message.", "error");
      return;
    }
    this.presence.setOwnProfile({
      enabled: this.#presenceEnabledToggle.checked,
      statusMessage: this.#presenceMessage.value,
      avatarUrl,
      autoIdleMinutes: autoIdle,
      afkAutoReply: {
        enabled: this.#afkAutoReplyToggle.checked,
        message: this.#afkAutoReplyMessage.value,
      },
    });
    this.#renderOwnPresence();
    this.#presenceDialog.close();
    this.#toast("KikiLink profile saved.");
  }

  #buildImageDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "Send an image" });
    title.id = "kikilink-image-title";
    this.#imageDialog.setAttribute("aria-labelledby", title.id);
    const header = element(
      "header",
      { className: "kl-dialog-header" },
      element(
        "div",
        { className: "kl-dialog-heading" },
        title,
        element("div", {
          className: "kl-dialog-subtitle",
          text: "A normal Beep link for everyone; an inline preview for KikiLink.",
        }),
      ),
      this.#dialogCloseButton("Close image sender", () => this.#requestCloseImageDialog()),
    );
    this.#imageUrlInput.type = "url";
    this.#imageUrlInput.maxLength = 900;
    this.#imageUrlInput.placeholder = "https://example.com/image.webp";
    this.#imageUrlInput.autocomplete = "off";
    this.#imageUrlInput.spellcheck = false;
    this.#imageUrlInput.addEventListener("input", () => this.#renderImageComposePreview());
    this.#imageUrlInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void this.#sendImage();
    });
    this.#imageLinkTab.id = "kikilink-image-source-link";
    this.#imageLinkTab.setAttribute("role", "tab");
    this.#imageLinkTab.setAttribute("aria-controls", "kikilink-image-link-panel");
    this.#imageLinkTab.addEventListener("click", () => this.#setImageSourceMode("link"));
    this.#imageLinkTab.addEventListener("keydown", (event) =>
      this.#handleImageSourceTabKey(event),
    );
    this.#imageFileTab.id = "kikilink-image-source-file";
    this.#imageFileTab.setAttribute("role", "tab");
    this.#imageFileTab.setAttribute("aria-controls", "kikilink-image-file-panel");
    this.#imageFileTab.addEventListener("click", () => this.#setImageSourceMode("file"));
    this.#imageFileTab.addEventListener("keydown", (event) =>
      this.#handleImageSourceTabKey(event),
    );
    this.#imageLinkPanel.id = "kikilink-image-link-panel";
    this.#imageLinkPanel.setAttribute("role", "tabpanel");
    this.#imageLinkPanel.setAttribute("aria-labelledby", this.#imageLinkTab.id);
    this.#imageLinkPanel.append(
      element(
        "label",
        { className: "kl-presence-field" },
        element("span", { className: "kl-presence-field-label", text: "Direct HTTPS image link" }),
        this.#imageUrlInput,
      ),
      this.#imagePreview,
      element("p", {
        className: "kl-image-upload-note",
        text: "Supported links: JPG, PNG, GIF, WebP, and AVIF.",
      }),
    );
    this.#imageFilePanel.id = "kikilink-image-file-panel";
    this.#imageFilePanel.setAttribute("role", "tabpanel");
    this.#imageFilePanel.setAttribute("aria-labelledby", this.#imageFileTab.id);
    this.#imageFileInput.type = "file";
    this.#imageFileInput.accept = "image/jpeg,image/png,image/webp";
    this.#imageFileInput.hidden = true;
    this.#imageFileInput.addEventListener("change", () => {
      const file = this.#imageFileInput.files?.[0];
      if (file) void this.#prepareLocalImage(file);
    });
    this.#chooseImageFileButton.addEventListener("click", () => this.#imageFileInput.click());
    const setupUploads = element("button", {
      className: "kl-text-button kl-image-upload-setup",
      type: "button",
      text: "Set up local uploads",
      onClick: () => {
        this.#imageDialog.close();
        this.#openSettings("chat");
        this.#imageUploadsToggle.focus();
      },
    });
    this.#imageFilePanel.append(
      this.#localImageStatus,
      element(
        "div",
        { className: "kl-image-file-actions" },
        this.#chooseImageFileButton,
        setupUploads,
        this.#imageFileInput,
      ),
      element(
        "p",
        { className: "kl-image-upload-note kl-image-file-privacy" },
        kikiIcon("lock"),
        element("span", {
          text: "Nothing uploads on selection. KikiLink first removes the filename and metadata; Upload & send creates a public temporary Litterbox link.",
        }),
      ),
    );
    const sourceTabs = element(
      "div",
      { className: "kl-image-source-tabs" },
      this.#imageLinkTab,
      this.#imageFileTab,
    );
    sourceTabs.setAttribute("role", "tablist");
    sourceTabs.setAttribute("aria-label", "Image source");
    const body = element(
      "div",
      { className: "kl-dialog-body kl-image-body" },
      sourceTabs,
      this.#imageLinkPanel,
      this.#imageFilePanel,
    );
    this.#sendImageButton.addEventListener("click", () => void this.#sendImage());
    this.#imageDialog.addEventListener("cancel", (event) => {
      if (this.#imageUploadBusy) event.preventDefault();
    });
    this.#imageDialog.addEventListener("close", () => {
      if (!this.#imageUploadBusy) this.#resetLocalImage();
    });
    this.#imageDialog.append(
      header,
      body,
      element(
        "footer",
        { className: "kl-dialog-actions" },
        element("button", {
          className: "kl-text-button",
          type: "button",
          text: "Cancel",
          onClick: () => this.#requestCloseImageDialog(),
        }),
        this.#sendImageButton,
      ),
    );
  }

  #buildAliasDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "Local nickname" });
    title.id = "kikilink-alias-title";
    this.#aliasDialog.setAttribute("aria-labelledby", title.id);
    this.#aliasInput.type = "text";
    this.#aliasInput.maxLength = 40;
    this.#aliasInput.autocomplete = "off";
    this.#aliasInput.spellcheck = false;
    this.#aliasInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      void this.#saveLocalAlias(this.#aliasInput.value);
    });
    this.#saveAliasButton.addEventListener("click", () =>
      void this.#saveLocalAlias(this.#aliasInput.value),
    );
    this.#clearAliasButton.addEventListener("click", () => void this.#saveLocalAlias(""));
    this.#aliasDialog.addEventListener("close", () => {
      this.#aliasTarget = undefined;
    });
    this.#aliasDialog.append(
      element(
        "header",
        { className: "kl-dialog-header" },
        element(
          "div",
          { className: "kl-dialog-heading" },
          title,
          element("div", {
            className: "kl-dialog-subtitle",
            text: "A private label for this KikiLink chat. It is never sent to anyone.",
          }),
        ),
        this.#dialogCloseButton("Close local nickname", () => this.#aliasDialog.close()),
      ),
      element(
        "div",
        { className: "kl-dialog-body kl-alias-body" },
        element(
          "label",
          { className: "kl-presence-field" },
          element("span", { className: "kl-presence-field-label", text: "Nickname you will see" }),
          this.#aliasInput,
        ),
        element(
          "p",
          { className: "kl-local-only-note" },
          kikiIcon("lock"),
          element("span", {
            text: "Bondage Club names, outgoing messages, and the other player's addon stay unchanged.",
          }),
        ),
      ),
      element(
        "footer",
        { className: "kl-dialog-actions kl-alias-actions" },
        this.#clearAliasButton,
        element("span", { className: "kl-dialog-actions-spacer" }),
        element("button", {
          className: "kl-text-button",
          type: "button",
          text: "Cancel",
          onClick: () => this.#aliasDialog.close(),
        }),
        this.#saveAliasButton,
      ),
    );
  }

  #buildRemoveChatDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "Remove recent chat?" });
    title.id = "kikilink-remove-chat-title";
    this.#removeChatDialog.setAttribute("aria-labelledby", title.id);
    this.#removeChatDialog.addEventListener("close", () => {
      this.#removeChatTarget = undefined;
    });
    this.#removeChatButton.addEventListener("click", () => void this.#confirmRemoveChat());
    this.#removeChatDialog.append(
      element(
        "header",
        { className: "kl-dialog-header" },
        element("div", { className: "kl-dialog-heading" }, title),
        this.#dialogCloseButton("Close remove chat confirmation", () =>
          this.#removeChatDialog.close(),
        ),
      ),
      element(
        "div",
        { className: "kl-dialog-body kl-remove-chat-body" },
        element("div", { className: "kl-remove-chat-icon" }, kikiIcon("trash")),
        element(
          "p",
          {},
          "Remove ",
          this.#removeChatName,
          " from KikiLink recent chats and delete this chat's account-scoped KikiLink history?",
        ),
        element("p", {
          className: "kl-remove-chat-safe",
          text: "This does not unfriend them and does not change Bondage Club's native Beep log.",
        }),
      ),
      element(
        "footer",
        { className: "kl-dialog-actions" },
        element("button", {
          className: "kl-text-button",
          type: "button",
          text: "Keep chat",
          onClick: () => this.#removeChatDialog.close(),
        }),
        this.#removeChatButton,
      ),
    );
  }

  #openAliasDialog(conversation: ConversationMeta): void {
    this.#aliasTarget = {
      memberNumber: conversation.peerNumber,
      nativeName: conversation.peerName,
    };
    this.#aliasInput.value = conversation.localAlias ?? "";
    this.#aliasInput.placeholder = conversation.peerName;
    this.#clearAliasButton.hidden = !conversation.localAlias;
    if (!this.#aliasDialog.open) this.#aliasDialog.showModal();
    this.#aliasInput.focus();
    this.#aliasInput.select();
  }

  async #saveLocalAlias(value: string): Promise<void> {
    const target = this.#aliasTarget;
    if (!target) return;
    const alias = await this.service.setLocalAlias(target.memberNumber, value);
    const conversation = await this.service.getConversation(target.memberNumber);
    if (!conversation) {
      this.#aliasDialog.close();
      return;
    }
    if (target.memberNumber === this.#activePeer) {
      const displayName = conversationDisplayName(conversation);
      this.#activeName = displayName;
      this.#activeNativeName = conversation.peerName;
      this.#chatName.textContent = displayName;
      this.#renderAvatar(this.#chatAvatar, displayName, target.memberNumber);
      this.#renderTypingIndicator();
    }
    this.#aliasDialog.close();
    await this.refresh();
    this.#toast(alias ? `Local nickname set to ${alias}.` : "Using the native nickname again.");
  }

  #openRemoveChatDialog(memberNumber: number, displayName: string): void {
    this.#removeChatTarget = { memberNumber, displayName };
    this.#removeChatName.textContent = displayName;
    if (!this.#removeChatDialog.open) this.#removeChatDialog.showModal();
    this.#removeChatButton.focus();
  }

  async #confirmRemoveChat(): Promise<void> {
    const target = this.#removeChatTarget;
    if (!target) return;
    if (target.memberNumber === this.#activePeer) this.#saveDraft.cancel();
    await this.service.removeConversation(target.memberNumber);
    if (target.memberNumber === this.#activePeer) this.#resetActiveConversation();
    this.#removeChatDialog.close();
    await this.refresh();
    this.#toast(`${target.displayName} removed from recent chats.`);
  }

  #openImageDialog(): void {
    if (this.#activePeer === undefined) {
      this.#toast("Choose a conversation first.", "error");
      return;
    }
    this.#resetLocalImage();
    this.#imageUrlInput.value = "";
    this.#renderImageComposePreview();
    this.#setImageSourceMode("link");
    if (!this.#imageDialog.open) this.#imageDialog.showModal();
    this.#imageUrlInput.focus();
  }

  #setImageSourceMode(mode: "link" | "file"): void {
    this.#imageSourceMode = mode;
    const linkActive = mode === "link";
    this.#imageLinkPanel.hidden = !linkActive;
    this.#imageFilePanel.hidden = linkActive;
    this.#imageLinkTab.dataset.active = String(linkActive);
    this.#imageFileTab.dataset.active = String(!linkActive);
    this.#imageLinkTab.setAttribute("aria-selected", String(linkActive));
    this.#imageFileTab.setAttribute("aria-selected", String(!linkActive));
    this.#imageLinkTab.tabIndex = linkActive ? 0 : -1;
    this.#imageFileTab.tabIndex = linkActive ? -1 : 0;
    if (linkActive) this.#renderImageComposePreview();
    else this.#renderLocalImageComposeState();
  }

  #handleImageSourceTabKey(event: KeyboardEvent): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const mode = event.key === "ArrowLeft" || event.key === "Home" ? "link" : "file";
    this.#setImageSourceMode(mode);
    (mode === "link" ? this.#imageLinkTab : this.#imageFileTab).focus();
  }

  #renderImageComposePreview(): void {
    const url = normalizeImageUrl(this.#imageUrlInput.value);
    if (this.#imageSourceMode === "link") {
      this.#sendImageButton.textContent = "Send image";
      this.#sendImageButton.disabled = !url;
    }
    if (!this.#imageUrlInput.value.trim()) {
      this.#imagePreview.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
        element("span", { text: "Paste a direct image link to check it." }),
      );
      this.#imagePreview.dataset.state = "empty";
      return;
    }
    if (!url) {
      this.#imagePreview.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("warning")),
        element("span", { text: "Use a direct HTTPS link ending in a supported image extension." }),
      );
      this.#imagePreview.dataset.state = "error";
      return;
    }
    const parsed = new URL(url);
    this.#imagePreview.replaceChildren(
      element("span", { className: "kl-image-compose-icon" }, kikiIcon("check")),
      element(
        "span",
        {},
        element("strong", { text: "Ready to send" }),
        element("small", { text: `${parsed.hostname}${parsed.pathname}` }),
      ),
    );
    this.#imagePreview.dataset.state = "ready";
  }

  #renderLocalImageComposeState(): void {
    const settings = this.settings.get().linkChat.imageUploads;
    const config = settings.enabled ? normalizeLitterboxUploadConfig(settings) : null;
    const setupButton = this.#imageFilePanel.querySelector<HTMLButtonElement>(
      ".kl-image-upload-setup",
    );
    setupButton?.toggleAttribute("hidden", config !== null);
    this.#chooseImageFileButton.hidden = config === null;
    this.#chooseImageFileButton.disabled = this.#imageUploadBusy;
    this.#chooseImageFileButton.textContent = this.#preparedLocalImage
      ? "Choose another"
      : "Choose image";
    this.#sendImageButton.textContent = "Upload & send";
    this.#sendImageButton.disabled =
      this.#imageUploadBusy || config === null || this.#preparedLocalImage === undefined;

    if (this.#imageUploadBusy) {
      this.#localImageStatus.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
        element(
          "span",
          {},
          element("strong", { text: "Uploading prepared image…" }),
          element("small", { text: "The original local file is not being sent." }),
        ),
      );
      this.#localImageStatus.dataset.state = "loading";
      return;
    }

    if (!config) {
      this.#localImageStatus.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("lock")),
        element(
          "span",
          {},
          element("strong", { text: "Temporary upload is off" }),
          element("small", { text: "Enable Litterbox uploads once in Chat settings." }),
        ),
      );
      this.#localImageStatus.dataset.state = "empty";
      return;
    }

    if (this.#localImageError) {
      this.#localImageStatus.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("warning")),
        element(
          "span",
          {},
          element("strong", { text: "Image not ready" }),
          element("small", { text: this.#localImageError }),
        ),
      );
      this.#localImageStatus.dataset.state = "error";
      return;
    }

    const prepared = this.#preparedLocalImage;
    if (!prepared) {
      this.#localImageStatus.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
        element(
          "span",
          {},
          element("strong", { text: "Choose a local image" }),
          element("small", { text: "JPG, PNG, or WebP · up to 10 MB" }),
        ),
      );
      this.#localImageStatus.dataset.state = "empty";
      return;
    }

    const thumbnail = this.#localImageObjectUrl
      ? element("img", { className: "kl-local-image-thumbnail", ariaLabel: "Prepared image preview" })
      : element("span", { className: "kl-image-compose-icon" }, kikiIcon("check"));
    if (thumbnail instanceof HTMLImageElement && this.#localImageObjectUrl) {
      thumbnail.src = this.#localImageObjectUrl;
      thumbnail.alt = "Prepared local image";
    }
    this.#localImageStatus.replaceChildren(
      thumbnail,
      element(
        "span",
        {},
        element("strong", { text: "Prepared locally" }),
        element("small", {
          text: `${prepared.width} × ${prepared.height} · ${formatBytes(prepared.blob.size)} · metadata removed`,
        }),
      ),
    );
    this.#localImageStatus.dataset.state = "ready";
  }

  async #prepareLocalImage(file: File): Promise<void> {
    this.#resetLocalImage();
    const token = this.#imagePrepareToken;
    this.#chooseImageFileButton.disabled = true;
    this.#sendImageButton.disabled = true;
    this.#localImageStatus.replaceChildren(
      element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
      element(
        "span",
        {},
        element("strong", { text: "Preparing safely…" }),
        element("small", { text: "Removing metadata and the original filename locally." }),
      ),
    );
    this.#localImageStatus.dataset.state = "loading";
    try {
      const prepared = await this.imageUploader.prepare(file);
      if (token !== this.#imagePrepareToken) return;
      this.#preparedLocalImage = prepared;
      if (typeof URL.createObjectURL === "function") {
        this.#localImageObjectUrl = URL.createObjectURL(prepared.blob);
      }
    } catch (error) {
      if (token !== this.#imagePrepareToken) return;
      this.#localImageError = imageUploadErrorMessage(error);
    } finally {
      if (token === this.#imagePrepareToken) {
        this.#imageFileInput.value = "";
        this.#renderLocalImageComposeState();
      }
    }
  }

  #resetLocalImage(): void {
    this.#imagePrepareToken += 1;
    this.#preparedLocalImage = undefined;
    this.#localImageError = undefined;
    this.#imageFileInput.value = "";
    if (this.#localImageObjectUrl && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(this.#localImageObjectUrl);
    }
    this.#localImageObjectUrl = undefined;
  }

  #requestCloseImageDialog(): void {
    if (this.#imageUploadBusy) {
      this.#toast("Wait for the image upload to finish.", "error");
      return;
    }
    this.#imageDialog.close();
  }

  async #sendImage(): Promise<void> {
    if (this.#imageSourceMode === "file") {
      await this.#uploadAndSendLocalImage();
      return;
    }
    const url = normalizeImageUrl(this.#imageUrlInput.value);
    if (!url) {
      this.#renderImageComposePreview();
      return;
    }
    const sent = await this.#sendContent(url, false);
    if (!sent) return;
    this.#imageDialog.close();
    this.#toast("Image link sent.");
  }

  async #uploadAndSendLocalImage(): Promise<void> {
    const image = this.#preparedLocalImage;
    const uploadSettings = this.settings.get().linkChat.imageUploads;
    const config = uploadSettings.enabled
      ? normalizeLitterboxUploadConfig(uploadSettings)
      : null;
    if (!image || !config || this.#imageUploadBusy) {
      this.#renderLocalImageComposeState();
      return;
    }

    this.#imageUploadBusy = true;
    const token = ++this.#imageUploadToken;
    this.#localImageError = undefined;
    this.#renderLocalImageComposeState();
    try {
      const url = await this.imageUploader.upload(image, config);
      if (token !== this.#imageUploadToken) return;
      this.#imageUrlInput.value = url;
      const sent = await this.#sendContent(url, false);
      if (token !== this.#imageUploadToken) return;
      this.#imageUploadBusy = false;
      if (!sent) {
        this.#setImageSourceMode("link");
        this.#toast("Upload finished. The direct link is kept here so it is not lost.", "error");
        return;
      }
      this.#toast(`Private details removed; temporary ${config.retention} link sent.`);
      this.#imageDialog.close();
    } catch (error) {
      if (token !== this.#imageUploadToken) return;
      this.#imageUploadBusy = false;
      this.#localImageError = imageUploadErrorMessage(error);
      this.#renderLocalImageComposeState();
      this.#toast(this.#localImageError, "error");
    }
  }

  async #openFinder(): Promise<void> {
    this.#finderQuery.value = "";
    this.#finderCatalog = [];
    this.#visibleFinderResults = [];
    this.#finderSelectedIndex = 0;
    this.#finderResults.replaceChildren(
      element("div", { className: "kl-finder-loading", text: "Gathering your shortcuts…" }),
    );
    if (!this.#finderDialog.open) this.#finderDialog.showModal();
    this.#finderQuery.setAttribute("aria-expanded", "true");
    this.#finderQuery.focus();

    const token = ++this.#finderRenderToken;
    const catalog = await this.#buildFinderCatalog();
    if (token !== this.#finderRenderToken || !this.#finderDialog.open) return;
    this.#finderCatalog = catalog;
    this.#renderFinderResults();
  }

  async #buildFinderCatalog(): Promise<FinderResult[]> {
    const settings = this.settings.get();
    const conversations = await this.service.listConversations();
    const unread = conversations.reduce((count, conversation) => count + conversation.unread, 0);
    const currentRoomCount = this.adapter.getRoomCharacters().length;
    const results: FinderResult[] = [
      {
        id: "destination-home",
        kind: "destination",
        icon: "home",
        category: "Destination",
        title: "Home",
        detail: "Overview and your suggested next step",
        keywords: "start link deck overview dashboard",
        priority: 52,
        action: { kind: "workspace", target: "home" },
      },
      {
        id: "destination-chat",
        kind: "destination",
        icon: "chat",
        category: "Destination",
        title: "Chat",
        detail: unread > 0 ? `${unread} unread ${unread === 1 ? "Beep" : "Beeps"}` : "Recent Beep conversations",
        keywords: "beep message messages conversation conversations linkchat",
        priority: 76 + Math.min(unread, 20),
        action: { kind: "workspace", target: "chat" },
      },
      {
        id: "new-chat",
        kind: "destination",
        icon: "plus",
        category: "Action",
        title: "Start a new chat",
        detail: "Choose a contact or enter a member number",
        keywords: "new beep contact member number send message",
        priority: 92,
        action: { kind: "new-chat" },
      },
      {
        id: "change-status",
        kind: "destination",
        icon: "status",
        category: "Action",
        title: "Change my status",
        detail: settings.linkPresence.enabled
          ? presenceLabel(this.presence.get(this.adapter.getOwnMemberNumber()).status)
          : "Presence sharing is off",
        keywords: "presence status online idle away dnd do not disturb offline invisible note",
        priority: 84,
        action: { kind: "presence" },
      },
      {
        id: "destination-players",
        kind: "destination",
        icon: "users",
        category: "Destination",
        title: "Players",
        detail: settings.linkRoster.enabled
          ? `${currentRoomCount} ${currentRoomCount === 1 ? "person" : "people"} here now`
          : "Optional player notebook · currently off",
        keywords: "roster people room notes tags favorites whisper profile linkroster",
        priority: 74,
        action: { kind: "workspace", target: "roster" },
      },
      {
        id: "destination-activities",
        kind: "destination",
        icon: "activities",
        category: "Destination",
        title: "Custom Activities",
        detail: settings.linkActivities.enabled
          ? `${settings.linkActivities.customActivities.length} custom activities`
          : "Custom activity builder · currently off",
        keywords: "custom activity activities vanilla body slot arousal blossom",
        priority: 68,
        action: { kind: "workspace", target: "activities" },
      },
      {
        id: "destination-settings",
        kind: "destination",
        icon: "settings",
        category: "Destination",
        title: "Settings",
        detail: "Customize KikiLink",
        keywords: "preferences customize configuration options",
        priority: 62,
        action: { kind: "workspace", target: "settings" },
      },
    ];

    for (const conversation of conversations) {
      const details = [
        "Chat",
        `#${conversation.peerNumber}`,
        conversation.unread > 0 ? `${conversation.unread} unread` : "",
        conversation.lastMessageAt > 0 ? formatRelativeTime(conversation.lastMessageAt) : "",
      ].filter(Boolean);
      results.push({
        id: `conversation-${conversation.peerNumber}`,
        kind: "conversation",
        icon: "chat",
        category: "Chat",
        title: conversationDisplayName(conversation),
        detail: details.join(" · "),
        keywords: `${conversation.peerNumber} beep message conversation ${conversation.lastMessage}`,
        priority: 120 + Math.min(conversation.unread * 8, 40) + (conversation.pinned ? 12 : 0),
        action: {
          kind: "conversation",
          peerNumber: conversation.peerNumber,
          peerName: conversation.peerName,
        },
      });
    }

    const rosterEntries = this.roster.list("known");
    const knownPeople = new Set(rosterEntries.map((entry) => entry.memberNumber));
    for (const entry of rosterEntries) {
      const details = [
        entry.present ? "Here now" : "Player",
        `#${entry.memberNumber}`,
        entry.favorite ? "Favorite" : "",
        entry.tags.slice(0, 2).join(" · "),
      ].filter(Boolean);
      results.push({
        id: `player-${entry.memberNumber}`,
        kind: "player",
        icon: entry.favorite ? "star" : "users",
        category: entry.present ? "In room" : "Player",
        title: entry.displayName,
        detail: details.join(" · "),
        keywords: `${entry.memberNumber} ${entry.note} ${entry.tags.join(" ")} ${entry.lastRoomName} roster player`,
        priority: 104 + (entry.present ? 24 : 0) + (entry.favorite ? 12 : 0),
        action: { kind: "player", memberNumber: entry.memberNumber },
      });
    }

    const conversationNumbers = new Set(conversations.map((conversation) => conversation.peerNumber));
    for (const contact of this.adapter.getKnownContacts()) {
      if (knownPeople.has(contact.memberNumber) || conversationNumbers.has(contact.memberNumber)) continue;
      results.push({
        id: `contact-${contact.memberNumber}`,
        kind: "conversation",
        icon: "chat",
        category: "Contact",
        title: contact.memberName,
        detail: `Known contact · #${contact.memberNumber}`,
        keywords: `${contact.memberNumber} contact friend beep new chat`,
        priority: 90,
        action: {
          kind: "conversation",
          peerNumber: contact.memberNumber,
          peerName: contact.memberName,
        },
      });
    }

    settings.linkActivities.customActivities.forEach((activity, index) => {
      results.push({
        id: `activity-${index}`,
        kind: "activity",
        icon: "activities",
        category: "Custom Activity",
        title: activity.name,
        detail: `${activity.targetGroup} · ${activity.template}`,
        keywords: `custom activity vanilla body slot ${activity.targetGroup} ${activity.image} arousal ${activity.template}`,
        priority: 72,
        action: { kind: "activity", index },
      });
    });

    for (const setting of finderSettingResults()) results.push(setting);
    return results;
  }

  #renderFinderResults(): void {
    const query = normalizeFinderText(this.#finderQuery.value);
    let results: FinderResult[];
    if (!query) {
      const featuredConversation = this.#finderCatalog
        .filter((result) => result.kind === "conversation" && result.id.startsWith("conversation-"))
        .sort((left, right) => right.priority - left.priority)[0];
      const suggestedIds = [
        featuredConversation?.id,
        "new-chat",
        featuredConversation ? undefined : "destination-chat",
        "destination-players",
        "destination-activities",
        "destination-settings",
      ].filter((id): id is string => Boolean(id));
      results = suggestedIds
        .map((id) => this.#finderCatalog.find((result) => result.id === id))
        .filter((result): result is FinderResult => result !== undefined);
    } else {
      results = rankFinderResults(this.#finderCatalog, query);
      const directNumber = Number(query.replace(/^#/u, ""));
      const hasDirectConversation = results.some(
        (result) =>
          result.action.kind === "conversation" && result.action.peerNumber === directNumber,
      );
      if (
        /^#?\d+$/u.test(query) &&
        Number.isSafeInteger(directNumber) &&
        directNumber >= 0 &&
        directNumber !== this.adapter.getOwnMemberNumber() &&
        !hasDirectConversation
      ) {
        results.unshift({
          id: `direct-${directNumber}`,
          kind: "conversation",
          icon: "plus",
          category: "Action",
          title: `Start chat with #${directNumber}`,
          detail: this.adapter.getMemberName(directNumber),
          keywords: query,
          priority: 1000,
          action: {
            kind: "conversation",
            peerNumber: directNumber,
            peerName: this.adapter.getMemberName(directNumber),
          },
        });
      }
      results = results.slice(0, 12);
    }

    this.#visibleFinderResults = results;
    this.#finderSelectedIndex = 0;
    this.#finderResults.replaceChildren();
    if (results.length === 0) {
      this.#finderResults.append(
        element(
          "div",
          { className: "kl-finder-empty" },
          element("div", { className: "kl-finder-empty-title", text: "Nothing matches yet" }),
          element("div", {
            text: "Try a name, member number, feature, activity, or setting.",
          }),
        ),
      );
      this.#finderStatus.textContent = "No KikiLink results found";
      this.#finderQuery.removeAttribute("aria-activedescendant");
      return;
    }

    results.forEach((result, index) => {
      const resultIcon = element(
        "span",
        { className: "kl-finder-result-icon" },
        kikiIcon(result.icon, "kl-finder-result-symbol", result.icon === "star"),
      );
      const option = element(
        "button",
        { className: "kl-finder-result", type: "button" },
        resultIcon,
        element(
          "span",
          { className: "kl-finder-result-copy" },
          element("span", { className: "kl-finder-result-title", text: result.title }),
          element("span", { className: "kl-finder-result-detail", text: result.detail }),
        ),
        element("span", { className: "kl-finder-result-category", text: result.category }),
      );
      option.id = `kikilink-finder-option-${index}`;
      option.dataset.finderKind = result.kind;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === 0));
      option.tabIndex = -1;
      option.addEventListener("pointermove", () => this.#setFinderSelection(index, false));
      option.addEventListener("click", () => void this.#chooseFinderResult(index));
      this.#finderResults.append(option);
    });
    this.#finderStatus.textContent = `${results.length} ${results.length === 1 ? "result" : "results"} available`;
    this.#setFinderSelection(0, false);
  }

  #moveFinderSelection(delta: number): void {
    if (this.#visibleFinderResults.length === 0) return;
    const next =
      (this.#finderSelectedIndex + delta + this.#visibleFinderResults.length) %
      this.#visibleFinderResults.length;
    this.#setFinderSelection(next, true);
  }

  #setFinderSelection(index: number, scroll: boolean): void {
    if (index < 0 || index >= this.#visibleFinderResults.length) return;
    this.#finderSelectedIndex = index;
    const options = [...this.#finderResults.querySelectorAll<HTMLElement>('[role="option"]')];
    options.forEach((option, candidate) => {
      option.dataset.selected = String(candidate === index);
      option.setAttribute("aria-selected", String(candidate === index));
    });
    const selected = options[index];
    if (!selected) return;
    this.#finderQuery.setAttribute("aria-activedescendant", selected.id);
    if (scroll) selected.scrollIntoView?.({ block: "nearest" });
  }

  async #chooseFinderResult(index: number): Promise<void> {
    const result = this.#visibleFinderResults[index];
    if (!result) return;
    this.#finderDialog.close();
    const action = result.action;
    if (action.kind === "workspace") {
      this.#activateFeature(action.target);
    } else if (action.kind === "new-chat") {
      this.#openNewChat();
    } else if (action.kind === "presence") {
      this.#openPresenceDialog();
    } else if (action.kind === "conversation") {
      await this.openChat(action.peerNumber, action.peerName);
    } else if (action.kind === "player") {
      this.#openRoster(action.memberNumber);
    } else if (action.kind === "activity") {
      this.#openActivities(action.index);
    } else {
      this.#openSettings(action.section);
    }
  }

  #buildRosterPage(): void {
    const header = element(
      "header",
      { className: "kl-feature-page-header" },
      element(
        "div",
        { className: "kl-feature-page-heading" },
        element("div", { className: "kl-feature-page-eyebrow", text: "PEOPLE" }),
        element("h1", { className: "kl-feature-page-title", text: "Players" }),
        this.#rosterSubtitle,
      ),
      element("button", {
        className: "kl-text-button",
        type: "button",
        text: "New chat",
        onClick: () => this.#openNewChat(),
      }),
    );

    for (const [scope, label] of [
      ["current", "In room"],
      ["known", "Known"],
      ["favorites", "Favorites"],
    ] as const) {
      const button = element("button", {
        className: "kl-roster-scope",
        type: "button",
        text: label,
      });
      button.dataset.scope = scope;
      button.addEventListener("click", () => {
        this.#saveNotebook(false);
        this.#rosterScope = scope;
        this.#selectedRosterMember = undefined;
        this.#renderRoster();
      });
      this.#rosterScopes.append(button);
    }

    this.#rosterSearch.type = "search";
    this.#rosterSearch.placeholder = "Search name, number, tag, or note";
    this.#rosterSearch.autocomplete = "off";
    this.#rosterSearch.addEventListener("input", () => this.#renderRoster());

    const listPane = element(
      "section",
      { className: "kl-roster-list-pane" },
      this.#rosterScopes,
      this.#rosterSearch,
      this.#rosterList,
    );
    const body = element(
      "div",
      { className: "kl-roster-body" },
      listPane,
      this.#rosterDetail,
    );
    const privacy = element("div", {
      className: "kl-roster-privacy",
      text: "Notes, tags, favorites, and encounter history belong only to this BC account.",
    });
    const footer = element("footer", { className: "kl-feature-page-footer" }, privacy);
    this.#saveNotebookButton.addEventListener("click", () => this.#saveNotebook(true));
    this.#rosterNote.maxLength = 2000;
    this.#rosterNote.rows = 7;
    this.#rosterNote.placeholder = "Private note about this player…";
    this.#rosterNote.addEventListener("input", () => {
      this.#notebookDirty = true;
      this.#saveNotebookButton.disabled = false;
    });
    this.#rosterNote.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.#saveNotebook(true);
      }
    });
    this.#rosterTags.maxLength = 200;
    this.#rosterTags.placeholder = "friend, roleplay, trusted";
    this.#rosterTags.addEventListener("input", () => {
      this.#notebookDirty = true;
      this.#saveNotebookButton.disabled = false;
    });
    this.#rosterPage.append(header, body, footer);
  }

  #openRoster(memberNumber?: number): void {
    if (!this.settings.get().linkRoster.enabled) {
      this.#openSettings("players");
      this.#rosterEnabledToggle.focus();
      this.#toast("Enable LinkRoster here to add it back to your deck.");
      return;
    }
    this.#showWorkspace("roster");
    this.roster.sync();
    this.#rosterSearch.value = "";
    const selectedEntry =
      memberNumber === undefined
        ? undefined
        : this.roster.list("known").find((entry) => entry.memberNumber === memberNumber);
    this.#rosterScope =
      selectedEntry?.present === true
        ? "current"
        : memberNumber !== undefined
          ? "known"
          : this.adapter.isInChatRoom()
            ? "current"
            : "known";
    this.#selectedRosterMember = memberNumber;
    this.#notebookDirty = false;
    this.#renderRoster();
    if (memberNumber !== undefined) {
      this.#rosterList
        .querySelector<HTMLButtonElement>(`[data-member-number="${memberNumber}"]`)
        ?.focus();
    } else {
      this.#rosterSearch.focus();
    }
  }

  #renderRoster(): void {
    const roomName = this.adapter.getCurrentRoomName();
    this.#rosterSubtitle.textContent = roomName
      ? `${roomName} · private player notebook`
      : "Private player notebook";
    for (const button of this.#rosterScopes.querySelectorAll<HTMLButtonElement>(
      ".kl-roster-scope",
    )) {
      button.dataset.active = String(button.dataset.scope === this.#rosterScope);
    }

    const entries = this.roster.list(this.#rosterScope, this.#rosterSearch.value);
    if (!entries.some((entry) => entry.memberNumber === this.#selectedRosterMember)) {
      this.#selectedRosterMember = entries[0]?.memberNumber;
      this.#notebookDirty = false;
    }

    this.#rosterList.replaceChildren();
    if (entries.length === 0) {
      this.#rosterList.append(
        element("div", {
          className: "kl-roster-empty",
          text:
            this.#rosterScope === "current" && !this.adapter.isInChatRoom()
              ? "Join a chat room to see its roster."
              : this.#rosterScope === "favorites"
                ? "No favorite players yet. Use the star on any player."
                : this.#rosterSearch.value
                  ? "No players match this search."
                  : "No players recorded yet.",
        }),
      );
    } else {
      for (const entry of entries) this.#rosterList.append(this.#rosterEntryButton(entry));
    }

    const selected = entries.find(
      (entry) => entry.memberNumber === this.#selectedRosterMember,
    );
    if (!this.#notebookDirty) this.#renderRosterDetail(selected);
  }

  #rosterEntryButton(entry: RosterEntry): HTMLButtonElement {
    const presence = this.presence.get(entry.memberNumber);
    const badges = element("div", { className: "kl-roster-entry-badges" });
    if (entry.present) badges.append(element("span", { className: "kl-roster-live", text: "HERE" }));
    const status = element("span", {
      className: "kl-roster-presence-label",
      text: presenceLabel(presence.status),
    });
    status.dataset.status = presence.status;
    status.dataset.presenceLabel = "true";
    status.hidden = presence.status === "unknown";
    badges.append(status);
    if (entry.isFriend) badges.append(element("span", { className: "kl-roster-friend", text: "FRIEND" }));
    if (entry.favorite) badges.append(kikiIcon("star", "kl-roster-favorite", true));
    const preview = entry.tags.length
      ? entry.tags.join(" · ")
      : entry.note
        ? entry.note.replace(/\s+/gu, " ")
        : entry.lastRoomName || `Member ${entry.memberNumber}`;
    const button = element(
      "button",
      { className: "kl-roster-entry", type: "button" },
      element(
        "div",
        { className: "kl-avatar-wrap" },
        this.#avatar(entry.displayName, entry.memberNumber),
        presenceDot(presence.status),
      ),
      element(
        "div",
        { className: "kl-roster-entry-copy" },
        element(
          "div",
          { className: "kl-roster-entry-name-row" },
          element("span", { className: "kl-roster-entry-name", text: entry.displayName }),
          badges,
        ),
        element("div", { className: "kl-roster-entry-preview", text: preview }),
      ),
      element("span", {
        className: "kl-roster-entry-time",
        text: entry.present ? "now" : formatRelativeTime(entry.lastSeenAt),
      }),
    );
    button.dataset.selected = String(entry.memberNumber === this.#selectedRosterMember);
    button.dataset.memberNumber = entry.memberNumber.toString();
    button.addEventListener("click", () => {
      if (entry.memberNumber === this.#selectedRosterMember) return;
      this.#saveNotebook(false);
      this.#selectedRosterMember = entry.memberNumber;
      this.#notebookDirty = false;
      this.#renderRoster();
    });
    this.#bindProfileMenu(button, () => ({
      memberNumber: entry.memberNumber,
      displayName: entry.displayName,
    }));
    return button;
  }

  #renderRosterDetail(entry: RosterEntry | undefined): void {
    this.#rosterDetail.replaceChildren();
    if (!entry) {
      this.#rosterDetail.append(
        element("div", {
          className: "kl-roster-detail-empty",
          text: "Select a player to open quick actions and private notes.",
        }),
      );
      return;
    }

    const favorite = element("button", {
      className: "kl-icon-button kl-roster-star",
      type: "button",
      title: entry.favorite ? "Remove from favorites" : "Add to favorites",
      ariaLabel: entry.favorite ? "Remove from favorites" : "Add to favorites",
      onClick: () => {
        this.#saveNotebook(false);
        this.roster.toggleFavorite(entry.memberNumber, entry.displayName);
        this.#notebookDirty = false;
        this.#renderRoster();
      },
    });
    favorite.append(kikiIcon("star", "kl-favorite-icon", entry.favorite));
    const presence = this.presence.get(entry.memberNumber);
    const identity = element(
      "div",
      { className: "kl-roster-identity" },
      element(
        "div",
        { className: "kl-avatar-wrap" },
        this.#avatar(entry.displayName, entry.memberNumber, "kl-roster-avatar"),
        presenceDot(presence.status),
      ),
      element(
        "div",
        { className: "kl-roster-identity-copy" },
        element("div", { className: "kl-roster-name", text: entry.displayName }),
        element("div", {
          className: "kl-roster-number",
          text: `Member ${entry.memberNumber}${entry.present ? " · in this room" : ""}`,
        }),
        element(
          "div",
          { className: "kl-roster-detail-presence", title: presenceDescription(presence) },
          presenceDot(presence.status),
          element("span", { text: presenceLabel(presence.status) }),
          presence.statusMessage
            ? element("span", { className: "kl-presence-note", text: presence.statusMessage })
            : null,
        ),
      ),
      favorite,
    );
    identity.dataset.memberNumber = entry.memberNumber.toString();
    const detailPresence = identity.querySelector<HTMLElement>(".kl-roster-detail-presence");
    if (detailPresence) detailPresence.dataset.presenceDescription = "true";
    const detailPresenceLabel = detailPresence?.querySelector<HTMLElement>("span:not(.kl-presence-dot)");
    if (detailPresenceLabel) detailPresenceLabel.dataset.presenceLabel = "true";

    const whisper = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Whisper",
      title: entry.present ? "Set native Whisper target" : "Player is not in this room",
      onClick: () => this.#startRosterWhisper(entry),
    });
    whisper.disabled = !entry.present;
    const beep = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Beep",
      onClick: () => void this.#openRosterBeep(entry),
    });
    const profile = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Profile",
      title: entry.present ? "Open native profile" : "Player is not in this room",
      onClick: () => this.#openRosterProfile(entry),
    });
    profile.disabled = !entry.present;
    const copy = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Copy ID",
      onClick: () => void this.#copyRosterMemberNumber(entry.memberNumber),
    });
    const quickActions = element(
      "div",
      { className: "kl-roster-quick-actions" },
      whisper,
      beep,
      profile,
      copy,
    );

    const stats = element(
      "div",
      { className: "kl-roster-stats" },
      this.#rosterStat("Last seen", entry.present ? "Now" : formatFullSeenTime(entry.lastSeenAt)),
      this.#rosterStat("Last room", entry.lastRoomName || "Not recorded"),
      this.#rosterStat("Encounters", entry.encounterCount.toString()),
    );
    this.#rosterTags.value = entry.tags.join(", ");
    this.#rosterNote.value = entry.note;
    this.#saveNotebookButton.disabled = true;
    const notebook = element(
      "div",
      { className: "kl-roster-notebook" },
      element("label", { className: "kl-roster-field-label" }, "Tags", this.#rosterTags),
      element("label", { className: "kl-roster-field-label" }, "Private note", this.#rosterNote),
      element(
        "div",
        { className: "kl-roster-note-actions" },
        element("span", { className: "kl-setting-help", text: "Ctrl+Enter to save" }),
        this.#saveNotebookButton,
      ),
    );
    this.#rosterDetail.append(identity, quickActions, stats, notebook);
    this.#bindProfileMenu(identity, () => ({
      memberNumber: entry.memberNumber,
      displayName: entry.displayName,
    }));
    this.presence.request(entry.memberNumber);
  }

  #rosterStat(label: string, value: string): HTMLDivElement {
    return element(
      "div",
      { className: "kl-roster-stat" },
      element("div", { className: "kl-roster-stat-label", text: label }),
      element("div", { className: "kl-roster-stat-value", text: value }),
    );
  }

  #saveNotebook(showToast: boolean): void {
    if (!this.#notebookDirty || this.#selectedRosterMember === undefined) return;
    const entry = this.roster
      .list("known")
      .find((candidate) => candidate.memberNumber === this.#selectedRosterMember);
    const displayName = entry?.displayName ?? this.adapter.getMemberName(this.#selectedRosterMember);
    const tags = this.#rosterTags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
    this.roster.saveNotebook(
      this.#selectedRosterMember,
      displayName,
      this.#rosterNote.value,
      tags,
    );
    this.#notebookDirty = false;
    this.#saveNotebookButton.disabled = true;
    if (showToast) this.#toast("Private player note saved.");
    this.#renderRoster();
  }

  #startRosterWhisper(entry: RosterEntry): void {
    this.#saveNotebook(false);
    try {
      this.adapter.startWhisper(entry.memberNumber);
      this.close();
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "Unable to start Whisper", "error");
      this.#renderRoster();
    }
  }

  async #openRosterBeep(entry: RosterEntry): Promise<void> {
    this.#saveNotebook(false);
    await this.openChat(entry.memberNumber, entry.displayName);
  }

  #openRosterProfile(entry: RosterEntry): void {
    this.#saveNotebook(false);
    try {
      this.adapter.openProfile(entry.memberNumber);
      this.close();
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "Unable to open profile", "error");
      this.#renderRoster();
    }
  }

  async #copyRosterMemberNumber(memberNumber: number): Promise<void> {
    try {
      await copyText(memberNumber.toString());
      this.#toast(`Member ${memberNumber} copied.`);
    } catch {
      this.#toast("The browser blocked clipboard access.", "error");
    }
  }

  #buildActivitiesPage(): void {
    this.#customActivitiesView = new CustomActivitiesView(
      this.#activitiesPage,
      this.adapter,
      this.settings,
      this.activities,
      () => {
        this.#renderHomeStatus();
        void this.#renderHome();
      },
      (message, kind) => this.#toast(message, kind),
    );
    this.#customActivitiesView.open();
  }

  #openActivities(activityIndex?: number): void {
    if (!this.settings.get().linkActivities.enabled) {
      this.#openSettings("activities");
      this.#activitiesToggle.focus();
      this.#toast("Turn on the Custom Activities tab to open your activity builder.");
      return;
    }

    this.#showWorkspace("activities");
    const activities = this.settings.get().linkActivities.customActivities;
    this.#selectedActivityIndex =
      activityIndex !== undefined && Number.isInteger(activityIndex) && activityIndex >= 0
        ? activityIndex
        : 0;
    this.#customActivitiesView?.open(
      activityIndex === undefined ? undefined : activities[this.#selectedActivityIndex]?.id,
    );
  }

  #renderActivitiesPage(): void {
    this.#customActivitiesView?.refresh();
  }

  #settingRow(name: string, help: string, control: Node): HTMLDivElement {
    return element(
      "div",
      { className: "kl-setting-row" },
      element(
        "div",
        { className: "kl-setting-copy" },
        element("div", { className: "kl-setting-name", text: name }),
        element("div", { className: "kl-setting-help", text: help }),
      ),
      control,
    );
  }

  #dialogCloseButton(ariaLabel: string, onClick: () => void): HTMLButtonElement {
    const button = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Close",
      ariaLabel,
      onClick,
    });
    button.append(kikiIcon("close"));
    return button;
  }

  async #renderHome(providedConversations?: ConversationMeta[]): Promise<void> {
    const ownName = this.adapter.getOwnName().trim();
    const greeting = greetingForCurrentTime();
    this.#homeGreeting.textContent =
      ownName && ownName.toLocaleLowerCase() !== "me"
        ? `${greeting}, ${ownName}.`
        : `${greeting}.`;

    const conversations = providedConversations ?? await this.service.listConversations();
    const onlineFriendCount =
      typeof this.adapter.getOnlineFriends === "function"
        ? this.adapter.getOnlineFriends().length
        : 0;
    const recent = [...conversations].sort(
      (left, right) => right.lastMessageAt - left.lastMessageAt,
    )[0];
    if (this.#unreadCount > 0) {
      this.#homeChatMetric.textContent = `${this.#unreadCount} unread · ${conversations.length} chats`;
    } else if (recent && recent.lastMessageAt > 0) {
      this.#homeChatMetric.textContent = `Last with ${conversationDisplayName(recent)} · ${formatRelativeTime(recent.lastMessageAt)}`;
    } else if (conversations.length > 0) {
      this.#homeChatMetric.textContent = `${conversations.length} saved ${conversations.length === 1 ? "chat" : "chats"}`;
    } else if (onlineFriendCount > 0) {
      this.#homeChatMetric.textContent = `${onlineFriendCount} ${onlineFriendCount === 1 ? "friend" : "friends"} online`;
    } else {
      this.#homeChatMetric.textContent = "Start your first Beep chat";
    }
    this.#renderHomeStatus();
    this.#renderHomeAction(conversations, recent);
  }

  #renderHomeAction(
    conversations: ConversationMeta[],
    recent: ConversationMeta | undefined,
  ): void {
    const unread = conversations.find((conversation) => conversation.unread > 0);
    const settings = this.settings.get();
    const inRoom =
      typeof this.adapter.isInChatRoom === "function" && this.adapter.isInChatRoom();
    const roomName =
      typeof this.adapter.getCurrentRoomName === "function"
        ? this.adapter.getCurrentRoomName()?.trim()
        : undefined;

    this.#homeActionButton.disabled = false;
    if (unread) {
      const total = Math.max(
        this.#unreadCount,
        conversations.reduce((count, conversation) => count + conversation.unread, 0),
      );
      this.#homeAction = {
        kind: "chat",
        peerNumber: unread.peerNumber,
        peerName: unread.peerName,
      };
      this.#homeActionIcon.replaceChildren(kikiIcon("chat"));
      this.#homeActionTitle.textContent = `${total} unread ${total === 1 ? "Beep" : "Beeps"}`;
      this.#homeActionDescription.textContent =
        total === unread.unread
          ? `Open the conversation with ${conversationDisplayName(unread)} and continue when you are ready.`
          : `Start with ${conversationDisplayName(unread)}, then work through the rest at your pace.`;
      this.#homeActionMeta.textContent =
        total === unread.unread ? `From ${conversationDisplayName(unread)}` : "Across recent chats";
      this.#homeActionButton.textContent = total === 1 ? "Read message" : "Read messages";
    } else if (conversations.length === 0) {
      this.#homeAction = { kind: "new-chat" };
      this.#homeActionIcon.replaceChildren(kikiIcon("plus"));
      this.#homeActionTitle.textContent = "Start your first chat";
      this.#homeActionDescription.textContent =
        "Choose someone you know or enter a member number. KikiLink keeps the conversation together.";
      this.#homeActionMeta.textContent = "Takes only a moment";
      this.#homeActionButton.textContent = "Start a chat";
    } else if (settings.linkRoster.enabled && inRoom && this.#presentCount > 0) {
      this.#homeAction = { kind: "roster" };
      this.#homeActionIcon.replaceChildren(kikiIcon("users"));
      this.#homeActionTitle.textContent = roomName ? `See who is in ${roomName}` : "See who is here";
      this.#homeActionDescription.textContent =
        "Open Players to Whisper, Beep, view a profile, or add a private note.";
      this.#homeActionMeta.textContent = `${this.#presentCount} ${this.#presentCount === 1 ? "person" : "people"} here now`;
      this.#homeActionButton.textContent = "View players";
    } else if (recent) {
      this.#homeAction = {
        kind: "chat",
        peerNumber: recent.peerNumber,
        peerName: recent.peerName,
      };
      this.#homeActionIcon.replaceChildren(kikiIcon("chat"));
      this.#homeActionTitle.textContent = `Continue with ${conversationDisplayName(recent)}`;
      this.#homeActionDescription.textContent = "Pick up your most recent Beep conversation.";
      this.#homeActionMeta.textContent =
        recent.lastMessageAt > 0 ? formatRelativeTime(recent.lastMessageAt) : "Conversation ready";
      this.#homeActionButton.textContent = "Open chat";
    } else {
      this.#homeAction = { kind: "chat" };
      this.#homeActionIcon.replaceChildren(kikiIcon("chat"));
      this.#homeActionTitle.textContent = "Open your chats";
      this.#homeActionDescription.textContent = "Find a conversation or start a new Beep.";
      this.#homeActionMeta.textContent = "Recent chats are kept together";
      this.#homeActionButton.textContent = "Open Chat";
    }
    this.#homeActionButton.dataset.action = this.#homeAction.kind;
  }

  #renderHomeStatus(): void {
    const settings = this.settings.get();
    const inRoom =
      typeof this.adapter.isInChatRoom === "function" && this.adapter.isInChatRoom();
    const roomName =
      typeof this.adapter.getCurrentRoomName === "function"
        ? this.adapter.getCurrentRoomName()
        : undefined;
    this.#homeConnection.textContent = this.#connectionText.textContent || "Connecting";
    this.#homeConnection.dataset.state = this.#connectionState;
    this.#homeRoom.textContent = roomName || (inRoom ? "Unnamed room" : "Not in a chat room");
    this.#renderOwnPresence();

    this.#rosterButton.dataset.available = String(settings.linkRoster.enabled);
    this.#homeRosterCard.dataset.available = String(settings.linkRoster.enabled);
    this.#homeRosterMetric.textContent = settings.linkRoster.enabled
      ? this.#presentCount > 0
        ? `${this.#presentCount} ${this.#presentCount === 1 ? "person" : "people"} here now`
        : inRoom
          ? "No other players in this room"
          : "Open while you are in a room"
      : "Disabled · tap to enable";
    this.#homeRosterAction.textContent = settings.linkRoster.enabled ? "View players" : "Turn on Players";

    this.#activitiesButton.dataset.available = String(settings.linkActivities.enabled);
    this.#activitiesButton.hidden = !settings.linkActivities.enabled;
    this.#homeActivitiesCard.dataset.available = String(settings.linkActivities.enabled);
    this.#homeActivitiesMetric.textContent = settings.linkActivities.enabled
      ? settings.linkActivities.customActivities.length > 0
        ? `${settings.linkActivities.customActivities.length} custom ${settings.linkActivities.customActivities.length === 1 ? "activity" : "activities"}`
        : "No custom activities yet"
      : "Hidden · tap to enable";
    this.#homeActivitiesAction.textContent = settings.linkActivities.enabled
      ? "Manage activities"
      : "Show Custom tab";

    const themeLabel =
      settings.ui.theme === "light"
        ? "Light paper"
        : settings.ui.theme === "system"
          ? "System theme"
          : "Dark lacquer";
    const comfortLabel =
      settings.ui.density === "super-compact"
        ? "Super compact"
        : settings.ui.density === "compact"
          ? "Compact"
          : "Comfortable";
    this.#homeSettingsMetric.textContent = `${themeLabel} · ${comfortLabel} · ${settings.ui.accent.toUpperCase()}`;
  }

  #renderOwnPresence(): void {
    const enabled = this.settings.get().linkPresence.enabled;
    const snapshot = this.presence.get(this.adapter.getOwnMemberNumber());
    const label = enabled ? presenceLabel(snapshot.status) : "Presence off";
    this.#presenceTriggerDot.dataset.status = enabled ? snapshot.status : "unknown";
    this.#presenceTriggerLabel.textContent = label;
    this.#presenceTrigger.title = snapshot.statusMessage
      ? `${label} · ${snapshot.statusMessage}`
      : `KikiLink status: ${label}`;
    this.#homePresence.replaceChildren(
      presenceDot(enabled ? snapshot.status : "unknown"),
      element("span", { text: label }),
    );
    this.#homePresence.title = this.#presenceTrigger.title;
  }

  #renderActivePresence(): void {
    this.#chatPresence.replaceChildren();
    this.#chatRoom.replaceChildren();
    if (this.#activePeer === undefined) {
      this.#renderTypingIndicator();
      return;
    }
    const snapshot = this.presence.get(this.#activePeer);
    this.#renderAvatar(this.#chatAvatar, this.#activeName, this.#activePeer);
    this.#chatPresence.append(
      presenceDot(snapshot.status),
      element("span", { text: presenceLabel(snapshot.status) }),
    );
    if (snapshot.statusMessage) {
      this.#chatPresence.append(
        element("span", { className: "kl-presence-note", text: snapshot.statusMessage }),
      );
    }
    if (snapshot.roomName) {
      this.#chatRoom.replaceChildren(
        kikiIcon("location", "kl-chat-room-icon"),
        element("span", { className: "kl-chat-room-name", text: snapshot.roomName }),
      );
      this.#chatRoom.hidden = false;
      this.#chatRoom.title = `Current room: ${snapshot.roomName}`;
    } else {
      this.#chatRoom.hidden = true;
      this.#chatRoom.removeAttribute("title");
    }
    this.#chatPresence.title = presenceDescription(snapshot);
    this.#renderTypingIndicator();
  }

  #renderTypingIndicator(): void {
    const typing =
      this.settings.get().linkChat.typingIndicators &&
      this.#activePeer !== undefined &&
      this.presence.isTyping(this.#activePeer);
    this.#typingIndicator.hidden = !typing;
    if (!typing) {
      this.#typingIndicator.replaceChildren();
      return;
    }
    this.#typingIndicator.replaceChildren(
      element("span", { className: "kl-typing-name", text: `${this.#activeName} is typing` }),
      element(
        "span",
        { className: "kl-typing-dots", ariaLabel: "" },
        element("i"),
        element("i"),
        element("i"),
      ),
    );
  }

  #updateLocalTyping(): void {
    if (this.#typingStopTimer !== undefined) clearTimeout(this.#typingStopTimer);
    this.#typingStopTimer = undefined;
    if (this.#activePeer === undefined || !this.#composer.value.trim()) {
      this.#stopLocalTyping();
      return;
    }
    this.presence.setTyping(this.#activePeer, true);
    this.#typingStopTimer = setTimeout(() => {
      this.#typingStopTimer = undefined;
      if (this.#activePeer !== undefined) this.presence.setTyping(this.#activePeer, false, true);
    }, 2_400);
  }

  #stopLocalTyping(): void {
    if (this.#typingStopTimer !== undefined) clearTimeout(this.#typingStopTimer);
    this.#typingStopTimer = undefined;
    if (this.#activePeer !== undefined) this.presence.setTyping(this.#activePeer, false, true);
  }

  #schedulePresenceRender(memberNumber?: number): void {
    if (memberNumber === undefined) this.#pendingPresenceAll = true;
    else this.#pendingPresenceMembers.add(memberNumber);
    if (this.#presenceRenderFrame !== undefined) return;
    this.#presenceRenderFrame = requestAnimationFrame(() => {
      this.#presenceRenderFrame = undefined;
      const updateAll = this.#pendingPresenceAll;
      const members = [...this.#pendingPresenceMembers];
      this.#pendingPresenceAll = false;
      this.#pendingPresenceMembers.clear();

      this.#updateVisiblePresence(updateAll ? undefined : members);
      if (
        updateAll ||
        (this.#activePeer !== undefined && members.includes(this.#activePeer))
      ) {
        this.#renderActivePresence();
      }
      const ownMemberNumber = this.adapter.getOwnMemberNumber();
      if (updateAll || members.includes(ownMemberNumber)) this.#renderHomeStatus();
      if (updateAll) void this.#renderHome();
    });
  }

  #updateVisiblePresence(memberNumbers?: number[]): void {
    const filter = memberNumbers ? new Set(memberNumbers) : undefined;
    for (const target of this.#shadow.querySelectorAll<HTMLElement>("[data-member-number]")) {
      const memberNumber = Number(target.dataset.memberNumber);
      if (!Number.isSafeInteger(memberNumber) || (filter && !filter.has(memberNumber))) continue;
      const snapshot = this.presence.get(memberNumber);
      for (const dot of target.querySelectorAll<HTMLElement>(".kl-presence-dot")) {
        dot.dataset.status = snapshot.status;
      }
      for (const label of target.querySelectorAll<HTMLElement>("[data-presence-label]")) {
        label.textContent = presenceLabel(snapshot.status);
        label.dataset.status = snapshot.status;
        label.hidden = snapshot.status === "unknown";
      }
      const description = target.querySelector<HTMLElement>("[data-presence-description]");
      if (description) description.title = presenceDescription(snapshot);
      const avatar = target.querySelector<HTMLElement>("[data-kikilink-avatar]");
      if (avatar) {
        this.#renderAvatar(
          avatar,
          avatar.dataset.avatarName || this.adapter.getMemberName(memberNumber),
          memberNumber,
        );
      }
    }
  }

  async #renderConversations(providedConversations?: ConversationMeta[]): Promise<void> {
    const query = this.#search.value.trim().toLocaleLowerCase();
    const allConversations = providedConversations ?? await this.service.listConversations();
    for (const conversation of allConversations) {
      const nickname = this.adapter.getMemberNickname(conversation.peerNumber);
      if (nickname && nickname !== conversation.peerName) {
        conversation.peerName = nickname;
        void this.service.setPeerName(conversation.peerNumber, nickname);
      }
      if (conversation.peerNumber === this.#activePeer) {
        const displayName = conversationDisplayName(conversation);
        this.#activeName = displayName;
        this.#activeNativeName = conversation.peerName;
        this.#chatName.textContent = displayName;
        this.#renderAvatar(this.#chatAvatar, displayName, conversation.peerNumber);
      }
    }
    const conversations = allConversations.filter((conversation) => {
      if (!query) return true;
      return (
        conversationDisplayName(conversation).toLocaleLowerCase().includes(query) ||
        conversation.peerName.toLocaleLowerCase().includes(query) ||
        conversation.peerNumber.toString().includes(query) ||
        conversation.lastMessage.toLocaleLowerCase().includes(query)
      );
    });

    if (conversations.length === 0) {
      this.#conversationList.replaceChildren(
        element("div", {
          className: "kl-empty-copy",
          text: query ? "No matching chats." : "No conversations yet.",
        }),
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const conversation of conversations) {
      fragment.append(this.#conversationButton(conversation));
    }
    this.#conversationList.replaceChildren(fragment);
  }

  #conversationButton(conversation: ConversationMeta): HTMLButtonElement {
    const presence = this.presence.get(conversation.peerNumber);
    const displayName = conversationDisplayName(conversation);
    const nameRow = element(
      "div",
      { className: "kl-conversation-name-row" },
      element("span", { className: "kl-conversation-name", text: displayName }),
      conversation.pinned ? kikiIcon("pin", "kl-pin", true) : null,
    );
    const prefix = conversation.lastDirection === "outgoing" ? "You: " : "";
    const previewText = messagePreview(conversation.lastMessage);
    const preview = previewText
      ? `${prefix}${previewText}`
      : `Member ${conversation.peerNumber}`;
    const main = element(
      "div",
      { className: "kl-conversation-main" },
      nameRow,
      element("div", { className: "kl-conversation-preview", text: preview }),
    );
    const side = element(
      "div",
      { className: "kl-conversation-side" },
      element("span", {
        className: "kl-time",
        text: conversation.lastMessageAt > 0 ? formatConversationTime(conversation.lastMessageAt) : "",
      }),
      conversation.unread > 0
        ? element("span", {
            className: "kl-unread",
            text: conversation.unread > 99 ? "99+" : conversation.unread.toString(),
          })
        : null,
    );
    const button = element(
      "button",
      { className: "kl-conversation", type: "button" },
      element(
        "div",
        { className: "kl-avatar-wrap" },
        this.#avatar(displayName, conversation.peerNumber),
        presenceDot(presence.status),
      ),
      main,
      side,
    );
    button.dataset.memberNumber = conversation.peerNumber.toString();
    button.dataset.active = String(conversation.peerNumber === this.#activePeer);
    button.addEventListener("click", () =>
      void this.#selectConversation(conversation.peerNumber, conversation.peerName),
    );
    this.#bindProfileMenu(button, () => ({
      memberNumber: conversation.peerNumber,
      displayName,
    }));
    return button;
  }

  async #selectConversation(peerNumber: number, peerName: string): Promise<void> {
    if (this.#activePeer !== undefined && this.#activePeer !== peerNumber) {
      this.#stopLocalTyping();
    }
    const nativeName = this.adapter.getMemberNickname(peerNumber) ?? peerName;
    const conversation = await this.service.ensureConversation(peerNumber, nativeName);
    if (nativeName !== conversation.peerName) {
      await this.service.setPeerName(peerNumber, nativeName);
      conversation.peerName = nativeName;
    }
    const displayName = conversationDisplayName(conversation);
    this.#activePeer = peerNumber;
    this.#activeName = displayName;
    this.#activeNativeName = nativeName;
    this.#panel.dataset.mobileView = "chat";
    await this.service.markRead(peerNumber);

    this.#empty.hidden = true;
    this.#chat.hidden = false;
    this.#chatAvatar.dataset.memberNumber = peerNumber.toString();
    this.#renderAvatar(this.#chatAvatar, displayName, peerNumber);
    this.#chatName.textContent = displayName;
    this.#chatNumber.textContent = `Member ${peerNumber}`;
    this.#messageRenderLimit = 120;
    this.#messageRenderPeer = peerNumber;
    this.#loadingOlderMessages = false;
    this.#renderedMessageIds.clear();
    this.#renderActivePresence();
    this.presence.request(peerNumber);
    this.#renderPinButton(conversation.pinned);
    this.#composer.value = conversation.draft;
    this.#includeRoom.checked = this.settings.get().linkChat.includeRoomByDefault;
    this.#attachImageButton.disabled = !this.adapter.canSendBeep();
    this.#resizeComposer();
    this.#updateCounter();
    await Promise.all([this.#renderMessages(peerNumber), this.refresh()]);
    this.#composer.focus();
  }

  async #renderMessages(peerNumber: number, scrollToBottom = true): Promise<void> {
    const messages = await this.service.getMessages(peerNumber, this.#messageRenderLimit + 1);
    if (this.#activePeer !== peerNumber) return;
    const hasOlder = messages.length > this.#messageRenderLimit;
    const visibleMessages = hasOlder ? messages.slice(-this.#messageRenderLimit) : messages;
    this.#messageRenderPeer = peerNumber;
    this.#renderedMessageIds.clear();
    if (visibleMessages.length === 0) {
      this.#messages.replaceChildren(
        element("div", {
          className: "kl-empty-copy",
          text: "No Beeps here yet. Send the first one.",
        }),
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    if (hasOlder) {
      fragment.append(this.#olderMessagesControl(peerNumber));
    }
    for (const [index, message] of visibleMessages.entries()) {
      this.#renderedMessageIds.add(message.id);
      fragment.append(
        this.#messageNode(
          message,
          messageGroupPosition(
            visibleMessages[index - 1]?.direction,
            message.direction,
            visibleMessages[index + 1]?.direction,
          ),
        ),
      );
    }
    this.#messages.replaceChildren(fragment);
    if (scrollToBottom) {
      this.#messages.scrollTop = this.#messages.scrollHeight;
    }
  }

  async #loadOlderMessages(peerNumber: number): Promise<void> {
    if (this.#activePeer !== peerNumber || this.#loadingOlderMessages) return;
    this.#loadingOlderMessages = true;
    this.#messages.setAttribute("aria-busy", "true");
    const button = this.#messages.querySelector<HTMLButtonElement>(".kl-load-older button");
    if (button) button.disabled = true;
    const previousHeight = this.#messages.scrollHeight;
    const previousTop = this.#messages.scrollTop;
    try {
      const nextLimit = this.#messageRenderLimit + 120;
      const messages = await this.service.getMessages(peerNumber, nextLimit + 1);
      if (this.#activePeer !== peerNumber) return;
      const hasOlder = messages.length > nextLimit;
      const visibleMessages = hasOlder ? messages.slice(-nextLimit) : messages;
      const missingMessages = visibleMessages.filter(
        (message) => !this.#renderedMessageIds.has(message.id),
      );
      const currentControl = this.#messages.querySelector<HTMLElement>(".kl-load-older");
      const fragment = document.createDocumentFragment();
      if (hasOlder) fragment.append(currentControl ?? this.#olderMessagesControl(peerNumber));
      else currentControl?.remove();
      for (const message of missingMessages) {
        this.#renderedMessageIds.add(message.id);
        fragment.append(this.#messageNode(message));
      }
      if (fragment.childNodes.length > 0) this.#messages.prepend(fragment);
      this.#messageRenderLimit = nextLimit;
      this.#syncMessageGrouping();
      this.#messages.scrollTop = previousTop + (this.#messages.scrollHeight - previousHeight);
    } finally {
      this.#loadingOlderMessages = false;
      this.#messages.setAttribute("aria-busy", "false");
      const currentButton = this.#messages.querySelector<HTMLButtonElement>(
        ".kl-load-older button",
      );
      if (currentButton) currentButton.disabled = false;
    }
  }

  #olderMessagesControl(peerNumber: number): HTMLDivElement {
    return element(
      "div",
      { className: "kl-load-older" },
      element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Load earlier messages",
        onClick: () => void this.#loadOlderMessages(peerNumber),
      }),
    );
  }

  #messageNode(
    message: LinkMessage,
    group: MessageGroupPosition = "single",
  ): HTMLDivElement {
    const body = this.#renderMessageBody(message);
    const actions = element(
      "div",
      { className: "kl-message-side-actions" },
      element("button", {
        className: "kl-message-action",
        type: "button",
        title: "Quote this message in your reply",
        ariaLabel: "Reply to message",
        onClick: () => this.#replyToMessage(message),
      }, kikiIcon("reply")),
      element("button", {
        className: "kl-message-action",
        type: "button",
        title: "Copy message",
        ariaLabel: "Copy message",
        onClick: () => void this.#copyMessage(message.content),
      }, kikiIcon("copy")),
    );
    const meta = element(
      "div",
      { className: "kl-message-meta" },
      message.roomName
        ? element("span", { className: "kl-message-room", text: message.roomName })
        : null,
      element("time", { text: formatMessageTime(message.sentAt) }),
    );
    const bubble = element("div", { className: "kl-message-bubble" }, body, meta);
    const row = element("div", { className: "kl-message-row" }, bubble, actions);
    row.dataset.direction = message.direction;
    row.dataset.group = group;
    row.dataset.messageId = message.id;
    return row;
  }

  #appendMessage(message: LinkMessage): void {
    if (
      this.#activePeer !== message.peerNumber ||
      this.#messageRenderPeer !== message.peerNumber ||
      this.#renderedMessageIds.has(message.id)
    ) {
      return;
    }
    const nearBottom =
      this.#messages.scrollHeight - this.#messages.scrollTop - this.#messages.clientHeight < 96;
    const shouldFollowMessage = message.direction === "outgoing" || nearBottom;
    const previousScrollTop = this.#messages.scrollTop;
    this.#messages.querySelector(".kl-empty-copy")?.remove();
    const previous = this.#messages.querySelector<HTMLElement>(".kl-message-row:last-child");
    const row = this.#messageNode(message);
    if (previous?.dataset.direction === message.direction) {
      previous.dataset.group = previous.dataset.group === "single" ? "start" : "middle";
      row.dataset.group = "end";
    }
    this.#messages.append(row);
    this.#renderedMessageIds.add(message.id);

    if (this.#renderedMessageIds.size > this.#messageRenderLimit) {
      if (!this.#messages.querySelector(".kl-load-older")) {
        this.#messages.prepend(this.#olderMessagesControl(message.peerNumber));
      }
      const oldest = this.#messages.querySelector<HTMLElement>(".kl-message-row");
      if (oldest) {
        const heightBeforeRemoval = this.#messages.scrollHeight;
        if (oldest.dataset.messageId) this.#renderedMessageIds.delete(oldest.dataset.messageId);
        oldest.remove();
        this.#repairFirstMessageGrouping();
        if (!shouldFollowMessage) {
          const removedHeight = Math.max(0, heightBeforeRemoval - this.#messages.scrollHeight);
          this.#messages.scrollTop = Math.max(0, previousScrollTop - removedHeight);
        }
      }
    }
    if (shouldFollowMessage) this.#messages.scrollTop = this.#messages.scrollHeight;
  }

  #syncMessageGrouping(): void {
    const rows = [...this.#messages.querySelectorAll<HTMLElement>(".kl-message-row")];
    for (const [index, row] of rows.entries()) {
      row.dataset.group = messageGroupPosition(
        rows[index - 1]?.dataset.direction,
        row.dataset.direction,
        rows[index + 1]?.dataset.direction,
      );
    }
  }

  #repairFirstMessageGrouping(): void {
    const first = this.#messages.querySelector<HTMLElement>(".kl-message-row");
    if (!first) return;
    const next = first.nextElementSibling;
    first.dataset.group =
      next instanceof HTMLElement &&
      next.classList.contains("kl-message-row") &&
      next.dataset.direction === first.dataset.direction
        ? "start"
        : "single";
  }

  async #send(): Promise<void> {
    const message = this.#composer.value.trim();
    if (!message) return;
    await this.#sendContent(message, true);
  }

  async #sendContent(message: string, clearComposer: boolean): Promise<boolean> {
    if (this.#activePeer === undefined) return false;
    let sent = false;
    try {
      const event = this.adapter.sendBeep(
        this.#activePeer,
        message,
        this.#includeRoom.checked,
      );
      sent = true;
      const storedMessage = await this.service.capture(event, true);
      this.#stopLocalTyping();
      if (clearComposer) {
        this.#composer.value = "";
        await this.service.setDraft(this.#activePeer, this.#activeNativeName, "");
        this.#resizeComposer();
        this.#updateCounter();
      }
      await this.onMessage(this.#activePeer, false, storedMessage);
      if (clearComposer) this.#composer.focus();
      return true;
    } catch (error) {
      this.#toast(
        sent
          ? "Beep was sent, but KikiLink could not save it to this account's history."
          : error instanceof Error
            ? error.message
            : "Unable to send Beep",
        "error",
      );
      return false;
    }
  }

  #renderMessageBody(message: LinkMessage): HTMLElement {
    const content = message.content || "Beep without a message";
    const links = parseMessageLinks(content);
    const body = element("div", { className: "kl-message-content" });
    let cursor = 0;
    for (const link of links) {
      if (link.start > cursor) body.append(document.createTextNode(content.slice(cursor, link.start)));
      const anchor = element("a", { className: "kl-message-link", text: content.slice(link.start, link.end) });
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer nofollow";
      anchor.referrerPolicy = "no-referrer";
      body.append(anchor);
      cursor = link.end;
    }
    if (cursor < content.length) body.append(document.createTextNode(content.slice(cursor)));

    const imageUrls = [...new Set(links.filter((link) => link.image).map((link) => link.url))].slice(0, 2);
    if (imageUrls.length === 0 || this.settings.get().linkChat.imagePreviews === "never") return body;
    const media = element("div", { className: "kl-message-media" });
    for (const url of imageUrls) media.append(this.#imageCard(url));
    body.append(media);
    return body;
  }

  #imageCard(url: string): HTMLElement {
    const parsed = new URL(url);
    const preview = element("div", { className: "kl-image-preview" });
    const open = element("a", { className: "kl-image-open", text: "Open original ↗" });
    open.href = url;
    open.target = "_blank";
    open.rel = "noopener noreferrer nofollow";
    open.referrerPolicy = "no-referrer";
    const card = element(
      "figure",
      { className: "kl-image-card" },
      preview,
      element(
        "figcaption",
        { className: "kl-image-caption" },
        element("span", { className: "kl-image-host", text: parsed.hostname }),
        open,
      ),
    );
    if (this.settings.get().linkChat.imagePreviews === "always") {
      this.#loadRemoteImage(preview, url);
    } else {
      preview.append(
        kikiIcon("image", "kl-image-placeholder-icon"),
        element("span", { className: "kl-image-placeholder-title", text: "Remote image" }),
        element("span", {
          className: "kl-image-placeholder-help",
          text: "Load it only when you trust this host.",
        }),
        element("button", {
          className: "kl-text-button kl-image-load",
          type: "button",
          text: "Show image",
          onClick: () => this.#loadRemoteImage(preview, url),
        }),
      );
    }
    return card;
  }

  #loadRemoteImage(preview: HTMLElement, url: string): void {
    const image = document.createElement("img");
    image.alt = "Image shared in LinkChat";
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("load", () => {
      preview.dataset.state = "loaded";
    });
    image.addEventListener("error", () => {
      preview.dataset.state = "error";
      preview.replaceChildren(
        element("span", { className: "kl-image-placeholder-icon", text: "!" }),
        element("span", { text: "This image could not be loaded. You can still open the original link." }),
      );
    });
    preview.dataset.state = "loading";
    preview.replaceChildren(image);
    image.src = url;
  }

  #replyToMessage(message: LinkMessage): void {
    const author = message.direction === "incoming" ? this.#activeNativeName : this.adapter.getOwnName();
    const excerpt = message.content.replace(/\s+/gu, " ").trim().slice(0, 180) || "Beep";
    const quote = `> ${author}: ${excerpt}\n`;
    const separator = this.#composer.value && !this.#composer.value.endsWith("\n") ? "\n" : "";
    if (this.#composer.value.length + separator.length + quote.length > 1000) {
      this.#toast("That reply would exceed the 1000 character Beep limit.", "error");
      return;
    }
    this.#composer.value += `${separator}${quote}`;
    this.#composer.dispatchEvent(new Event("input", { bubbles: true }));
    this.#composer.focus();
    this.#composer.setSelectionRange(this.#composer.value.length, this.#composer.value.length);
  }

  async #copyMessage(content: string): Promise<void> {
    try {
      await copyText(content);
      this.#toast("Message copied.");
    } catch {
      this.#toast("The browser blocked clipboard access.", "error");
    }
  }

  async #togglePin(): Promise<void> {
    if (this.#activePeer === undefined) return;
    const pinned = await this.service.togglePinned(this.#activePeer);
    this.#renderPinButton(pinned);
    await this.#renderConversations();
  }

  #renderPinButton(pinned: boolean): void {
    this.#pinButton.replaceChildren(kikiIcon("pin", "kl-pin-button-icon", pinned));
    this.#pinButton.title = pinned ? "Unpin conversation" : "Pin conversation";
    this.#pinButton.setAttribute(
      "aria-label",
      pinned ? "Unpin conversation" : "Pin conversation",
    );
    this.#pinButton.setAttribute("aria-pressed", String(pinned));
  }

  #bindProfileMenu(target: HTMLElement, profile: () => ProfileTarget | undefined): void {
    if (!(target instanceof HTMLButtonElement)) {
      target.tabIndex = 0;
      target.setAttribute("role", "button");
    }
    target.classList.add("kl-profile-menu-target");
    const existingTitle = target.title.trim();
    target.title = existingTitle
      ? `${existingTitle} · Right-click or hold for actions`
      : "Right-click or hold for player actions";

    target.addEventListener("contextmenu", (event) => {
      const value = profile();
      if (!value) return;
      event.preventDefault();
      event.stopPropagation();
      void this.#openProfileMenu(value.memberNumber, value.displayName, event.clientX, event.clientY);
    });
    target.addEventListener("keydown", (event) => {
      if (event.key !== "ContextMenu" && !(event.key === "F10" && event.shiftKey)) return;
      const value = profile();
      if (!value) return;
      event.preventDefault();
      const bounds = target.getBoundingClientRect();
      void this.#openProfileMenu(
        value.memberNumber,
        value.displayName,
        bounds.left + bounds.width / 2,
        bounds.top + Math.min(bounds.height, 44),
      );
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    let startX = 0;
    let startY = 0;
    const cancel = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };
    target.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" || event.button !== 0) return;
      const value = profile();
      if (!value) return;
      startX = event.clientX;
      startY = event.clientY;
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        this.#suppressProfileClickUntil.set(target, Date.now() + 700);
        void this.#openProfileMenu(value.memberNumber, value.displayName, startX, startY);
      }, 520);
    });
    target.addEventListener("pointermove", (event) => {
      if (timer === undefined) return;
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 9) cancel();
    });
    target.addEventListener("pointerup", cancel);
    target.addEventListener("pointercancel", cancel);
    target.addEventListener(
      "click",
      (event) => {
        if (Date.now() >= (this.#suppressProfileClickUntil.get(target) ?? 0)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true,
    );
  }

  async #openProfileMenu(
    memberNumber: number,
    displayName: string,
    x: number,
    y: number,
  ): Promise<void> {
    const token = ++this.#profileMenuToken;
    this.presence.request(memberNumber);
    const [conversation] = await Promise.all([this.service.getConversation(memberNumber)]);
    if (token !== this.#profileMenuToken) return;
    const nativeName = conversation?.peerName ?? displayName;
    const shownName = conversation ? conversationDisplayName(conversation) : displayName;
    const snapshot = this.presence.get(memberNumber);
    const rosterEntry = this.roster.get(memberNumber, nativeName);
    const inRoom = this.adapter.isMemberInCurrentRoom(memberNumber);
    const header = element(
      "header",
      { className: "kl-profile-menu-header" },
      element(
        "div",
        { className: "kl-avatar-wrap" },
        this.#avatar(shownName, memberNumber),
        presenceDot(snapshot.status),
      ),
      element(
        "div",
        { className: "kl-profile-menu-identity" },
        element("strong", { text: shownName }),
        element(
          "span",
          { title: presenceDescription(snapshot) },
          presenceDot(snapshot.status),
          `${presenceLabel(snapshot.status)} · #${memberNumber}`,
        ),
        snapshot.statusMessage
          ? element("small", { className: "kl-presence-note", text: snapshot.statusMessage })
          : null,
        conversation?.localAlias
          ? element("small", {
              className: "kl-profile-native-name",
              text: `Local nickname · ${conversation.peerName}`,
            })
          : null,
      ),
    );
    const primary = element(
      "div",
      { className: "kl-profile-menu-group" },
      this.#profileMenuAction("chat", "Message", "Open LinkChat", () => {
        void this.openChat(memberNumber, nativeName);
      }),
      snapshot.avatarUrl &&
        this.settings.get().linkChat.imagePreviews === "ask" &&
        !this.#allowedAvatarUrls.has(snapshot.avatarUrl)
        ? this.#profileMenuAction(
            "image",
            "Show profile avatar",
            "Load this remote image once",
            () => {
              if (!snapshot.avatarUrl) return;
              this.#allowedAvatarUrls.add(snapshot.avatarUrl);
              this.#schedulePresenceRender(memberNumber);
              this.#toast("Profile avatar allowed for this session.");
            },
          )
        : null,
      this.#profileMenuAction(
        "whisper",
        "Whisper",
        inRoom ? "Set native Whisper target" : "Available while this player is in your room",
        () => {
          try {
            this.adapter.startWhisper(memberNumber);
            this.close();
          } catch (error) {
            this.#toast(error instanceof Error ? error.message : "Unable to start Whisper", "error");
          }
        },
        !inRoom,
      ),
      this.#profileMenuAction(
        "profile",
        "Native profile",
        inRoom ? "Open the Bondage Club profile" : "Available while this player is in your room",
        () => {
          try {
            this.adapter.openProfile(memberNumber);
            this.close();
          } catch (error) {
            this.#toast(error instanceof Error ? error.message : "Unable to open profile", "error");
          }
        },
        !inRoom,
      ),
    );
    const organize = element(
      "div",
      { className: "kl-profile-menu-group" },
      this.#profileMenuAction(
        "star",
        rosterEntry.favorite ? "Remove favorite" : "Add favorite",
        "Saved in your private player notebook",
        () => {
          this.roster.toggleFavorite(memberNumber, nativeName);
          this.#renderRoster();
          void this.#renderHome();
          this.#toast(rosterEntry.favorite ? "Removed from favorites." : "Added to favorites.");
        },
        false,
        rosterEntry.favorite,
      ),
      this.#profileMenuAction("note", "Player note", "Open private notes and tags", () => {
        this.#openRoster(memberNumber);
      }),
      conversation
        ? this.#profileMenuAction(
            "edit",
            conversation.localAlias ? "Edit local nickname" : "Set local nickname",
            conversation.localAlias
              ? `Only you see “${conversation.localAlias}”`
              : "Cosmetic and visible only to you",
            () => this.#openAliasDialog(conversation),
          )
        : null,
      conversation
        ? this.#profileMenuAction(
            "pin",
            conversation.pinned ? "Unpin chat" : "Pin chat",
            "Organize your recent chats",
            () => void this.#toggleConversationPin(memberNumber),
            false,
            conversation.pinned,
          )
        : null,
      conversation
        ? this.#profileMenuAction("unread", "Mark unread", "Keep this chat in your unread queue", () => {
            void this.#markConversationUnread(memberNumber);
          })
        : null,
      this.#profileMenuAction("id", "Copy member ID", `Copy ${memberNumber}`, () => {
        void this.#copyRosterMemberNumber(memberNumber);
      }),
    );
    const remove = conversation
      ? element(
          "div",
          { className: "kl-profile-menu-group kl-profile-menu-group--danger" },
          this.#profileMenuAction(
            "trash",
            "Remove from recent chats",
            "Deletes only this account's KikiLink history",
            () => this.#openRemoveChatDialog(memberNumber, shownName),
          ),
        )
      : null;
    this.#profileMenu.replaceChildren(header, primary, organize);
    if (remove) this.#profileMenu.append(remove);
    this.#profileMenu.hidden = false;
    this.#profileMenu.style.left = `${x}px`;
    this.#profileMenu.style.top = `${y}px`;
    const bounds = this.#profileMenu.getBoundingClientRect();
    this.#profileMenu.style.left = `${clamp(x, 8, Math.max(8, window.innerWidth - bounds.width - 8))}px`;
    this.#profileMenu.style.top = `${clamp(y, 8, Math.max(8, window.innerHeight - bounds.height - 8))}px`;
    this.#profileMenu.querySelector<HTMLButtonElement>(".kl-profile-menu-action:not(:disabled)")?.focus();
  }

  #profileMenuAction(
    icon: KikiLinkIconName,
    label: string,
    help: string,
    action: () => void,
    disabled = false,
    filled = false,
  ): HTMLButtonElement {
    const button = element(
      "button",
      { className: "kl-profile-menu-action", type: "button" },
      element("span", { className: "kl-profile-menu-icon" }, kikiIcon(icon, "kl-profile-action-icon", filled)),
      element(
        "span",
        { className: "kl-profile-menu-copy" },
        element("span", { className: "kl-profile-menu-label", text: label }),
        element("span", { className: "kl-profile-menu-help", text: help }),
      ),
    );
    button.setAttribute("role", "menuitem");
    button.disabled = disabled;
    button.addEventListener("click", () => {
      this.#closeProfileMenu();
      action();
    });
    return button;
  }

  #closeProfileMenu(): void {
    this.#profileMenuToken += 1;
    this.#profileMenu.hidden = true;
    this.#profileMenu.replaceChildren();
  }

  async #toggleConversationPin(memberNumber: number): Promise<void> {
    const pinned = await this.service.togglePinned(memberNumber);
    if (memberNumber === this.#activePeer) {
      this.#renderPinButton(pinned);
    }
    await this.#renderConversations();
    this.#toast(pinned ? "Chat pinned." : "Chat unpinned.");
  }

  async #markConversationUnread(memberNumber: number): Promise<void> {
    await this.service.markUnread(memberNumber);
    await this.refresh();
    this.#toast("Chat marked unread.");
  }

  #openNewChat(): void {
    this.#newChatQuery.value = "";
    this.#renderKnownContacts();
    if (!this.#newChatDialog.open) this.#newChatDialog.showModal();
    this.#newChatQuery.focus();
  }

  async #submitNewChat(): Promise<void> {
    const query = this.#newChatQuery.value.trim();
    const memberNumber = Number(query.replace(/^#/u, ""));
    if (!Number.isSafeInteger(memberNumber) || memberNumber < 0) {
      const exactContact = this.adapter
        .getKnownContacts()
        .find((contact) => contact.memberName.toLocaleLowerCase() === query.toLocaleLowerCase());
      if (exactContact) {
        this.#newChatDialog.close();
        await this.openChat(exactContact.memberNumber, exactContact.memberName);
        return;
      }
      this.#toast("Choose a contact or enter a valid member number.", "error");
      return;
    }
    if (memberNumber === this.adapter.getOwnMemberNumber()) {
      this.#toast("You cannot Beep yourself.", "error");
      return;
    }
    this.#newChatDialog.close();
    await this.openChat(memberNumber, this.adapter.getMemberName(memberNumber));
  }

  #renderKnownContacts(): void {
    const query = this.#newChatQuery.value.trim().toLocaleLowerCase();
    const contacts = this.adapter
      .getKnownContacts()
      .filter(
        (contact) =>
          !query ||
          contact.memberName.toLocaleLowerCase().includes(query) ||
          contact.memberNumber.toString().includes(query),
      )
      .slice(0, 40);

    this.#newChatResults.replaceChildren();
    if (contacts.length === 0) {
      this.#newChatResults.append(
        element("div", {
          className: "kl-contact-empty",
          text:
            this.#connectionState === "ready"
              ? "No matching known contacts. You can still enter a member number."
              : "Contacts will appear after KikiLink connects to the game.",
        }),
      );
      return;
    }

    for (const contact of contacts) {
      const presence = this.presence.get(contact.memberNumber);
      const button = element(
        "button",
        { className: "kl-contact", type: "button" },
        element(
          "div",
          { className: "kl-avatar-wrap" },
          this.#avatar(contact.memberName, contact.memberNumber),
          presenceDot(presence.status),
        ),
        element(
          "div",
          { className: "kl-contact-copy" },
          element("div", { className: "kl-contact-name", text: contact.memberName }),
          element("div", { className: "kl-contact-number", text: `Member ${contact.memberNumber}` }),
        ),
      );
      button.addEventListener("click", () => {
        this.#newChatDialog.close();
        void this.openChat(contact.memberNumber, contact.memberName);
      });
      this.#bindProfileMenu(button, () => ({
        memberNumber: contact.memberNumber,
        displayName: contact.memberName,
      }));
      this.#newChatResults.append(button);
    }
  }

  #renderQuickActions(): void {
    const actions = this.settings.get().linkChat.quickActions;
    this.#quickActions.replaceChildren();
    this.#quickActions.hidden = actions.length === 0;

    for (const action of actions) {
      this.#quickActions.append(
        element("button", {
          className: "kl-action-chip",
          type: "button",
          text: action.label,
          title: action.template,
          onClick: () => this.#insertQuickAction(action),
        }),
      );
    }
  }

  #insertQuickAction(action: QuickAction): void {
    if (this.#activePeer === undefined) return;
    const expanded = action.template
      .replaceAll("{name}", this.#activeNativeName)
      .replaceAll("{member}", this.#activePeer.toString())
      .replaceAll("{me}", this.adapter.getOwnName());
    const current = this.#composer.value.trimEnd();
    const next = current ? `${current}\n${expanded}` : expanded;
    if (next.length > 1000) {
      this.#toast("This action would exceed the 1000 character Beep limit.", "error");
      return;
    }

    this.#composer.value = next;
    this.#composer.dispatchEvent(new Event("input", { bubbles: true }));
    this.#composer.focus();
  }

  #renderQuickActionEditor(actions: QuickAction[]): void {
    this.#quickActionsEditor.replaceChildren();
    for (const action of actions) this.#addQuickActionEditorRow(action);
  }

  #addQuickActionEditorRow(action: QuickAction = { label: "", template: "" }): void {
    if (this.#quickActionsEditor.childElementCount >= 12) {
      this.#toast("You can keep up to 12 quick actions.", "error");
      return;
    }

    const label = element("input", { className: "kl-action-label" }) as HTMLInputElement;
    label.placeholder = "Label";
    label.maxLength = 24;
    label.value = action.label;
    label.dataset.field = "label";
    const template = element("input", { className: "kl-action-template" }) as HTMLInputElement;
    template.placeholder = "Action text";
    template.maxLength = 500;
    template.value = action.template;
    template.dataset.field = "template";
    const remove = element("button", {
      className: "kl-icon-button kl-remove-action",
      type: "button",
      title: "Remove action",
      ariaLabel: "Remove quick action",
    });
    remove.append(kikiIcon("trash"));
    const row = element("div", { className: "kl-action-editor-row" }, label, template, remove);
    remove.addEventListener("click", () => row.remove());
    this.#quickActionsEditor.append(row);
    if (!action.label && !action.template) label.focus();
  }

  #readQuickActionEditor(): QuickAction[] {
    return [...this.#quickActionsEditor.querySelectorAll<HTMLElement>(".kl-action-editor-row")]
      .map((row) => ({
        label: row.querySelector<HTMLInputElement>('[data-field="label"]')?.value.trim() ?? "",
        template:
          row.querySelector<HTMLInputElement>('[data-field="template"]')?.value.trim() ?? "",
      }))
      .filter((action) => action.label && action.template);
  }

  #renderReactionRuleEditor(rules: ReactionRule[]): void {
    this.#reactionRulesEditor.replaceChildren();
    for (const rule of rules) this.#addReactionRuleEditorRow(rule);
    this.#updateReactionRuleCount();
  }

  #addReactionRuleEditorRow(
    rule: ReactionRule = createDefaultReactionRule(createReactionRuleId()),
  ): void {
    if (this.#reactionRulesEditor.childElementCount >= MAX_REACTION_RULES) {
      this.#toast(`You can keep up to ${MAX_REACTION_RULES} reaction rules.`, "error");
      return;
    }

    const enabled = element("input") as HTMLInputElement;
    enabled.type = "checkbox";
    enabled.checked = rule.enabled;
    enabled.dataset.field = "enabled";
    enabled.setAttribute("aria-label", `Enable ${rule.label}`);
    const enabledLabel = element(
      "label",
      { className: "kl-reaction-rule-enabled" },
      enabled,
      element("span", { text: "On" }),
    );
    const name = element("input", { className: "kl-reaction-name" }) as HTMLInputElement;
    name.value = rule.label;
    name.maxLength = 32;
    name.placeholder = "Rule name";
    name.dataset.field = "label";
    name.setAttribute("aria-label", "Reaction rule name");

    const trigger = element("select", { className: "kl-select" }) as HTMLSelectElement;
    trigger.replaceChildren(
      selectOption("beep-received", "Incoming Beep"),
      selectOption("room-join", "Player joins room"),
      selectOption("room-leave", "Player leaves room"),
      selectOption("friend-online", "Friend comes online"),
    );
    trigger.value = rule.trigger;
    trigger.dataset.field = "trigger";
    const scope = element("select", { className: "kl-select" }) as HTMLSelectElement;
    scope.replaceChildren(
      selectOption("anyone", "Anyone"),
      selectOption("friends", "Friends only"),
      selectOption("members", "Specific members"),
    );
    scope.value = rule.scope;
    scope.dataset.field = "scope";
    const members = element("input", { className: "kl-reaction-input" }) as HTMLInputElement;
    members.value = rule.memberNumbers.join(", ");
    members.placeholder = "12345, 67890";
    members.maxLength = 240;
    members.dataset.field = "members";
    const textMatch = element("input", { className: "kl-reaction-input" }) as HTMLInputElement;
    textMatch.value = rule.textMatch;
    textMatch.placeholder = "Optional words";
    textMatch.maxLength = 80;
    textMatch.dataset.field = "text-match";
    const action = element("select", { className: "kl-select" }) as HTMLSelectElement;
    action.replaceChildren(
      selectOption("notice", "Local notice"),
      selectOption("room-emote", "Send room emote"),
    );
    action.value = rule.action;
    action.dataset.field = "action";
    const cooldown = element("input", {
      className: "kl-number-input kl-reaction-cooldown",
    }) as HTMLInputElement;
    cooldown.type = "number";
    cooldown.min = "0";
    cooldown.max = MAX_REACTION_COOLDOWN_SECONDS.toString();
    cooldown.value = rule.cooldownSeconds.toString();
    cooldown.dataset.field = "cooldown";
    const template = element("textarea", {
      className: "kl-reaction-template",
    }) as HTMLTextAreaElement;
    template.value = rule.template;
    template.maxLength = 500;
    template.rows = 2;
    template.dataset.field = "template";

    const row = element("article", { className: "kl-reaction-rule" });
    row.dataset.ruleId = rule.id;
    const moveUp = element("button", {
      className: "kl-icon-button kl-reaction-move kl-reaction-move--up",
      type: "button",
      title: "Move rule up",
      ariaLabel: `Move ${rule.label} up`,
      onClick: () => {
        const previous = row.previousElementSibling;
        if (previous) this.#reactionRulesEditor.insertBefore(row, previous);
      },
    });
    moveUp.append(kikiIcon("back"));
    const moveDown = element("button", {
      className: "kl-icon-button kl-reaction-move kl-reaction-move--down",
      type: "button",
      title: "Move rule down",
      ariaLabel: `Move ${rule.label} down`,
      onClick: () => {
        const next = row.nextElementSibling;
        if (next) next.after(row);
      },
    });
    moveDown.append(kikiIcon("back"));
    const remove = element("button", {
      className: "kl-icon-button kl-remove-action",
      type: "button",
      title: "Remove reaction rule",
      ariaLabel: `Remove ${rule.label}`,
      onClick: () => {
        row.remove();
        this.#updateReactionRuleCount();
      },
    });
    remove.append(kikiIcon("trash"));
    const note = element("div", { className: "kl-reaction-rule-note" });
    row.append(
      element(
        "header",
        { className: "kl-reaction-rule-header" },
        enabledLabel,
        name,
        element("div", { className: "kl-reaction-rule-order" }, moveUp, moveDown, remove),
      ),
      element(
        "div",
        { className: "kl-reaction-rule-grid" },
        reactionField("When", trigger),
        reactionField("Who", scope),
        reactionField("Member numbers", members, "kl-reaction-members-field"),
        reactionField("Beep contains", textMatch, "kl-reaction-match-field"),
        reactionField("Then", action),
        reactionField("Cooldown (seconds)", cooldown),
        reactionField("Message template", template, "kl-reaction-template-field"),
      ),
      note,
    );
    trigger.addEventListener("change", () => this.#syncReactionRuleEditorRow(row));
    scope.addEventListener("change", () => this.#syncReactionRuleEditorRow(row));
    action.addEventListener("change", () => this.#syncReactionRuleEditorRow(row));
    this.#reactionRulesEditor.append(row);
    this.#syncReactionRuleEditorRow(row);
    this.#updateReactionRuleCount();
    if (!rule.label) name.focus();
  }

  #syncReactionRuleEditorRow(row: HTMLElement): void {
    const trigger = row.querySelector<HTMLSelectElement>('[data-field="trigger"]')?.value;
    const scope = row.querySelector<HTMLSelectElement>('[data-field="scope"]')?.value;
    const action = row.querySelector<HTMLSelectElement>('[data-field="action"]')?.value;
    const members = row.querySelector<HTMLInputElement>('[data-field="members"]');
    const match = row.querySelector<HTMLInputElement>('[data-field="text-match"]');
    const template = row.querySelector<HTMLTextAreaElement>('[data-field="template"]');
    if (members) members.disabled = scope !== "members";
    if (match) match.disabled = trigger !== "beep-received";
    row.querySelector<HTMLElement>(".kl-reaction-members-field")?.toggleAttribute(
      "data-disabled",
      scope !== "members",
    );
    row.querySelector<HTMLElement>(".kl-reaction-match-field")?.toggleAttribute(
      "data-disabled",
      trigger !== "beep-received",
    );
    if (template) {
      template.placeholder =
        action === "room-emote"
          ? "greets {name} as they arrive."
          : "{name} {event}.";
    }
    const note = row.querySelector<HTMLElement>(".kl-reaction-rule-note");
    if (note) {
      note.textContent =
        action === "room-emote"
          ? "Public room action. Private {message} content is always removed before sending."
          : "Private KikiLink notice shown beside the launcher when the panel is closed.";
      note.dataset.public = String(action === "room-emote");
    }
  }

  #readReactionRuleEditor(): ReactionRule[] | undefined {
    const rules: ReactionRule[] = [];
    const rows = [
      ...this.#reactionRulesEditor.querySelectorAll<HTMLElement>(".kl-reaction-rule"),
    ];
    for (const [index, row] of rows.entries()) {
      const label = row.querySelector<HTMLInputElement>('[data-field="label"]')?.value.trim() ?? "";
      const template =
        row.querySelector<HTMLTextAreaElement>('[data-field="template"]')?.value.trim() ?? "";
      if (!label || !template) {
        const control = row.querySelector<HTMLElement>(
          !label ? '[data-field="label"]' : '[data-field="template"]',
        );
        control?.focus();
        this.#toast(`Complete the name and template for reaction rule ${index + 1}.`, "error");
        return undefined;
      }

      const scopeValue = row.querySelector<HTMLSelectElement>('[data-field="scope"]')?.value;
      const scope =
        scopeValue === "friends" || scopeValue === "members" ? scopeValue : "anyone";
      const membersInput = row.querySelector<HTMLInputElement>('[data-field="members"]');
      const memberNumbers =
        scope === "members" ? parseReactionMemberNumbers(membersInput?.value ?? "") : [];
      if (scope === "members" && (!memberNumbers || memberNumbers.length === 0)) {
        membersInput?.focus();
        this.#toast(
          `Enter up to ${MAX_REACTION_MEMBERS} valid member numbers for reaction rule ${index + 1}.`,
          "error",
        );
        return undefined;
      }

      const cooldownInput = row.querySelector<HTMLInputElement>('[data-field="cooldown"]');
      const cooldownSeconds = Number(cooldownInput?.value);
      if (
        !Number.isInteger(cooldownSeconds) ||
        cooldownSeconds < 0 ||
        cooldownSeconds > MAX_REACTION_COOLDOWN_SECONDS
      ) {
        cooldownInput?.focus();
        this.#toast(
          `Reaction cooldown must be between 0 and ${MAX_REACTION_COOLDOWN_SECONDS} seconds.`,
          "error",
        );
        return undefined;
      }

      const triggerValue = row.querySelector<HTMLSelectElement>('[data-field="trigger"]')?.value;
      const actionValue = row.querySelector<HTMLSelectElement>('[data-field="action"]')?.value;
      rules.push({
        id: row.dataset.ruleId || createReactionRuleId(),
        label,
        enabled:
          row.querySelector<HTMLInputElement>('[data-field="enabled"]')?.checked === true,
        trigger:
          triggerValue === "room-join" ||
          triggerValue === "room-leave" ||
          triggerValue === "friend-online"
            ? triggerValue
            : "beep-received",
        scope,
        memberNumbers: memberNumbers ?? [],
        textMatch:
          triggerValue === "beep-received"
            ? row.querySelector<HTMLInputElement>('[data-field="text-match"]')?.value.trim() ?? ""
            : "",
        action: actionValue === "room-emote" ? "room-emote" : "notice",
        template,
        cooldownSeconds,
      });
    }
    return rules;
  }

  #updateReactionRuleCount(): void {
    const count = this.#reactionRulesEditor.childElementCount;
    this.#reactionRuleCount.textContent =
      count === 0 ? "Optional" : `${count} rule${count === 1 ? "" : "s"}`;
  }

  #openSettings(section?: SettingsSection): void {
    const settings = this.settings.get();
    if (this.#workspaceView !== "settings") this.#settingsReturnView = this.#workspaceView;
    this.#themeSelect.value = settings.ui.theme;
    this.#accentInput.value = settings.ui.accent;
    this.#updateAccentPresets();
    this.#densitySelect.value = settings.ui.density;
    this.#textScaleSelect.value = settings.ui.textScale;
    this.#homeLayoutSelect.value = settings.ui.homeLayout;
    this.#launcherSideSelect.value = settings.ui.launcherSide;
    this.#launcherOpenSelect.value = settings.ui.launcherOpen;
    this.#reducedMotionToggle.checked = settings.ui.reducedMotion;
    this.#historyToggle.checked = settings.linkChat.saveHistory;
    this.#enterToSendToggle.checked = settings.linkChat.enterToSend;
    this.#typingIndicatorsToggle.checked = settings.linkChat.typingIndicators;
    this.#imagePreviewSelect.value = settings.linkChat.imagePreviews;
    this.#imageUploadsToggle.checked = settings.linkChat.imageUploads.enabled;
    this.#imageUploadRetentionSelect.value = settings.linkChat.imageUploads.retention;
    this.#renderImageUploadSettingsOptions();
    this.#roomBadgeToggle.checked = settings.ui.roomBadge.enabled;
    this.#retentionInput.value = settings.linkChat.retentionDays.toString();
    this.#renderQuickActionEditor(settings.linkChat.quickActions);
    this.#rosterEnabledToggle.checked = settings.linkRoster.enabled;
    this.#rosterTrackingToggle.checked = settings.linkRoster.trackEncounters;
    this.#rosterRetentionSelect.value = settings.linkRoster.retentionDays.toString();
    this.#updateNotebookCount();
    this.#activitiesToggle.checked = settings.linkActivities.enabled;
    this.#friendOnlineAlertToggle.checked = settings.linkReactions.quickAlerts.friendOnline;
    this.#roomJoinAlertToggle.checked = settings.linkReactions.quickAlerts.roomJoin;
    this.#notificationSoundsToggle.checked = settings.linkReactions.sounds.enabled;
    this.#chatSoundSelect.value = settings.linkReactions.sounds.chat;
    this.#friendOnlineSoundSelect.value = settings.linkReactions.sounds.friendOnline;
    this.#roomJoinSoundSelect.value = settings.linkReactions.sounds.roomJoin;
    this.#reactionsToggle.checked = settings.linkReactions.enabled;
    this.#renderReactionRuleEditor(settings.linkReactions.rules);
    this.#showWorkspace("settings", false);
    this.#showSettingsSection(section ?? settings.ui.settingsSection, false);
    this.#settingsTabs
      .querySelector<HTMLButtonElement>(`[data-section="${this.#settingsSection}"]`)
      ?.focus();
  }

  #showSettingsSection(section: SettingsSection, remember: boolean): void {
    this.#settingsSection = section;
    for (const [candidate, panel] of this.#settingsPanels) {
      panel.hidden = candidate !== section;
    }
    for (const tab of this.#settingsTabs.querySelectorAll<HTMLButtonElement>(".kl-settings-tab")) {
      const selected = tab.dataset.section === section;
      tab.dataset.active = String(selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    if (remember && this.settings.get().ui.settingsSection !== section) {
      this.settings.update((draft) => {
        draft.ui.settingsSection = section;
      });
    }
  }

  #renderImageUploadSettingsOptions(): void {
    const enabled = this.#imageUploadsToggle.checked;
    this.#imageUploadSettingsOptions.hidden = !enabled;
    this.#imageUploadRetentionSelect.disabled = !enabled;
  }

  #updateAccentPresets(): void {
    for (const swatch of this.#settingsPage.querySelectorAll<HTMLButtonElement>(".kl-color-swatch")) {
      const selected = swatch.dataset.color === this.#accentInput.value.toLocaleLowerCase();
      swatch.dataset.selected = String(selected);
      swatch.setAttribute("aria-pressed", String(selected));
    }
  }

  #cancelSettings(): void {
    this.#showWorkspace(this.#availableWorkspace(this.#settingsReturnView));
  }

  #saveSettings(): void {
    const retentionDays = Number(this.#retentionInput.value);
    const reactionRules = this.#readReactionRuleEditor();
    if (!reactionRules) return;
    const currentSettings = this.settings.get();
    const launcherSide = this.#launcherSideSelect.value === "left" ? "left" : "right";
    const settings = this.settings.update((draft) => {
      draft.ui.theme =
        this.#themeSelect.value === "light" || this.#themeSelect.value === "system"
          ? this.#themeSelect.value
          : "dark";
      draft.ui.accent = this.#accentInput.value;
      draft.ui.density =
        this.#densitySelect.value === "compact" ||
        this.#densitySelect.value === "super-compact"
          ? this.#densitySelect.value
          : "comfortable";
      draft.ui.textScale =
        this.#textScaleSelect.value === "large" ||
        this.#textScaleSelect.value === "extra-large"
          ? this.#textScaleSelect.value
          : "normal";
      draft.ui.homeLayout = this.#homeLayoutSelect.value === "compact" ? "compact" : "showcase";
      draft.ui.launcherSide = launcherSide;
      draft.ui.launcherOpen =
        this.#launcherOpenSelect.value === "last" || this.#launcherOpenSelect.value === "chat"
          ? this.#launcherOpenSelect.value
          : "home";
      if (launcherSide !== currentSettings.ui.launcherSide) draft.ui.launcherPosition = null;
      draft.ui.roomBadge = {
        enabled: this.#roomBadgeToggle.checked,
        position: currentSettings.ui.roomBadge.position,
      };
      draft.ui.reducedMotion = this.#reducedMotionToggle.checked;
      draft.ui.settingsSection = this.#settingsSection;
      draft.linkChat.saveHistory = this.#historyToggle.checked;
      draft.linkChat.enterToSend = this.#enterToSendToggle.checked;
      draft.linkChat.typingIndicators = this.#typingIndicatorsToggle.checked;
      draft.linkChat.imagePreviews =
        this.#imagePreviewSelect.value === "always" || this.#imagePreviewSelect.value === "never"
          ? this.#imagePreviewSelect.value
          : "ask";
      draft.linkChat.imageUploads = {
        enabled: this.#imageUploadsToggle.checked,
        retention:
          this.#imageUploadRetentionSelect.value === "1h" ||
          this.#imageUploadRetentionSelect.value === "12h" ||
          this.#imageUploadRetentionSelect.value === "72h"
            ? this.#imageUploadRetentionSelect.value
            : "24h",
      };
      draft.linkChat.quickActions = this.#readQuickActionEditor();
      draft.linkRoster.enabled = this.#rosterEnabledToggle.checked;
      draft.linkRoster.trackEncounters = this.#rosterTrackingToggle.checked;
      const rosterRetentionDays = Number(this.#rosterRetentionSelect.value);
      if (Number.isInteger(rosterRetentionDays)) {
        draft.linkRoster.retentionDays = rosterRetentionDays;
      }
      draft.linkActivities.enabled = this.#activitiesToggle.checked;
      draft.linkReactions.quickAlerts.friendOnline = this.#friendOnlineAlertToggle.checked;
      draft.linkReactions.quickAlerts.roomJoin = this.#roomJoinAlertToggle.checked;
      draft.linkReactions.sounds.enabled = this.#notificationSoundsToggle.checked;
      draft.linkReactions.sounds.chat = soundPresetOr(this.#chatSoundSelect.value, "chime");
      draft.linkReactions.sounds.friendOnline = soundPresetOr(
        this.#friendOnlineSoundSelect.value,
        "sparkle",
      );
      draft.linkReactions.sounds.roomJoin = soundPresetOr(
        this.#roomJoinSoundSelect.value,
        "pop",
      );
      draft.linkReactions.enabled = this.#reactionsToggle.checked;
      draft.linkReactions.rules = reactionRules;
      if (Number.isInteger(retentionDays)) draft.linkChat.retentionDays = retentionDays;
    });
    this.#applyTheme(settings);
    this.#schedulePresenceRender();
    this.activities.syncFromSettings();
    if (settings.linkReactions.sounds.enabled) void this.#notificationSounds.unlock();
    if (!settings.linkChat.typingIndicators) this.#stopLocalTyping();
    const removedPlayers = this.roster.prune();
    this.#updateNotebookCount();
    this.#renderQuickActions();
    if (this.#activePeer !== undefined) void this.#renderMessages(this.#activePeer);
    this.#renderActivePresence();
    this.#renderHomeStatus();
    void this.#renderHome();
    this.#showWorkspace(this.#availableWorkspace(this.#settingsReturnView, settings));
    void this.service.prune();
    this.#toast(
      removedPlayers > 0
        ? `Settings saved. Forgot ${removedPlayers} old encounter${removedPlayers === 1 ? "" : "s"}.`
        : "Settings saved.",
    );
  }

  #resetLauncherPosition(): void {
    const settings = this.settings.update((draft) => {
      draft.ui.launcherPosition = null;
    });
    this.#applyTheme(settings);
    this.#toast("Launcher returned to its default corner.");
  }

  #resetRoomBadgePosition(): void {
    this.#roomBadge.resetPosition();
    this.#toast("Blossom returned beside the character addon icons.");
  }

  #beginRoomBadgePlacement(): void {
    if (!this.settings.get().ui.roomBadge.enabled) {
      this.settings.update((draft) => {
        draft.ui.roomBadge.enabled = true;
      });
      this.#roomBadgeToggle.checked = true;
    }
    if (!this.#roomBadge.beginPlacement()) {
      this.#toast("Enter a chat room and wait until your character is visible, then try again.", "error");
      return;
    }
    this.close();
  }

  async #clearHistory(): Promise<void> {
    if (!window.confirm("Clear all KikiLink Beep history and conversation drafts?")) return;
    await this.service.clearHistory();
    this.#resetActiveConversation();
    await this.refresh();
    this.#toast("LinkChat history cleared.");
  }

  #resetActiveConversation(): void {
    this.#stopLocalTyping();
    this.#activePeer = undefined;
    this.#activeName = "";
    this.#activeNativeName = "";
    this.#messageRenderPeer = undefined;
    this.#loadingOlderMessages = false;
    this.#renderedMessageIds.clear();
    this.#composer.value = "";
    this.#messages.replaceChildren();
    this.#attachImageButton.disabled = true;
    this.#chat.hidden = true;
    this.#empty.hidden = false;
    this.#panel.dataset.mobileView = "list";
  }

  #exportNotebook(): void {
    if (typeof URL.createObjectURL !== "function") {
      this.#toast("This browser cannot create a notebook download.", "error");
      return;
    }
    const backup = this.roster.exportNotebook();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `KikiLink-player-notebook-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.hidden = true;
    this.#shadow.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    this.#toast(
      backup.records.length === 1
        ? "Exported 1 player to a local JSON backup."
        : `Exported ${backup.records.length} players to a local JSON backup.`,
    );
  }

  async #importNotebookFile(): Promise<void> {
    const file = this.#notebookFileInput.files?.[0];
    this.#notebookFileInput.value = "";
    if (!file) return;
    if (file.size > 2_000_000) {
      this.#toast("That notebook backup is larger than the 2 MB safety limit.", "error");
      return;
    }
    if (
      !window.confirm(
        "Merge this KikiLink backup with the current player notebook? Existing notes, tags, and favorites will be preserved.",
      )
    ) {
      return;
    }

    try {
      const result = this.roster.importNotebook(await file.text());
      const removed = this.roster.prune();
      this.#updateNotebookCount();
      this.#selectedRosterMember = undefined;
      this.#notebookDirty = false;
      if (this.#workspaceView === "roster") this.#renderRoster();
      void this.#renderHome();
      const skipped = result.skipped > 0 ? ` ${result.skipped} invalid entr${result.skipped === 1 ? "y was" : "ies were"} skipped.` : "";
      const expired = removed > 0 ? ` ${removed} expired encounter${removed === 1 ? " was" : "s were"} omitted.` : "";
      this.#toast(`Merged ${result.imported} player${result.imported === 1 ? "" : "s"}.${skipped}${expired}`);
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "Could not import that notebook.", "error");
    }
  }

  #updateNotebookCount(): void {
    const count = this.roster.notebookCount();
    this.#notebookCount.textContent = `${count} saved player${count === 1 ? "" : "s"} · JSON stays local`;
  }

  #clearPeople(): void {
    if (!window.confirm("Clear all KikiLink player notes, tags, favorites, and encounter history?")) {
      return;
    }
    this.roster.clear();
    this.#selectedRosterMember = undefined;
    this.#notebookDirty = false;
    this.#updateNotebookCount();
    if (this.#workspaceView === "roster") this.#renderRoster();
    void this.#renderHome();
    this.#toast("LinkRoster notebook cleared.");
  }

  async #updateUnreadBadge(): Promise<void> {
    const unread = await this.service.totalUnread();
    this.#unreadCount = unread;
    this.#badge.hidden = unread === 0;
    this.#badge.textContent = unread > 99 ? "99+" : unread.toString();
  }

  #resizeComposer(): void {
    this.#composer.style.height = "auto";
    this.#composer.style.height = `${Math.min(this.#composer.scrollHeight, 120)}px`;
  }

  #updateCounter(): void {
    const count = this.#composer.value.length;
    this.#counter.textContent = `${count}/1000 · Ctrl+Enter`;
    this.#counter.dataset.over = String(count > 1000);
  }

  #applyTheme(settings: KikiLinkSettings): void {
    this.#host.style.setProperty("--kl-accent", settings.ui.accent);
    this.#host.style.setProperty("--kl-accent-strong", settings.ui.accent);
    this.#host.style.setProperty("--kl-accent-foreground", readableForeground(settings.ui.accent));
    this.#host.dataset.theme = settings.ui.theme;
    this.#host.dataset.density = settings.ui.density;
    this.#host.dataset.textScale = settings.ui.textScale;
    this.#host.dataset.homeLayout = settings.ui.homeLayout;
    this.#host.dataset.reducedMotion = String(settings.ui.reducedMotion);
    this.#launcher.dataset.side = settings.ui.launcherSide;
    this.#panel.dataset.side = settings.ui.launcherSide;
    if (this.#host.isConnected) this.#positionLauncher();
  }

  #startLauncherDrag(event: PointerEvent): void {
    if (event.button !== 0) return;
    const rect = this.#launcher.getBoundingClientRect();
    this.#launcherDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
    try {
      this.#launcher.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is an enhancement; document-level pointer delivery still works without it.
    }
  }

  #moveLauncher(event: PointerEvent): void {
    const drag = this.#launcherDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return;

    drag.moved = true;
    event.preventDefault();
    this.#launcher.dataset.dragging = "true";
    this.#placeLauncher(drag.startLeft + deltaX, drag.startTop + deltaY);
  }

  #finishLauncherDrag(event: PointerEvent): void {
    const drag = this.#launcherDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.#launcherDrag = undefined;
    this.#launcher.dataset.dragging = "false";
    try {
      this.#launcher.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already have been released by the browser.
    }

    if (!drag.moved) return;
    this.#saveLauncherPosition();
    this.#suppressLauncherClickUntil = Date.now() + 500;
  }

  #cancelLauncherDrag(event: PointerEvent): void {
    if (!this.#launcherDrag || this.#launcherDrag.pointerId !== event.pointerId) return;
    this.#launcherDrag = undefined;
    this.#launcher.dataset.dragging = "false";
    this.#positionLauncher();
  }

  #placeLauncher(left: number, top: number): void {
    const width = this.#launcher.offsetWidth || 58;
    const height = this.#launcher.offsetHeight || 58;
    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxTop = Math.max(0, window.innerHeight - height);
    const safeLeft = clamp(left, 0, maxLeft);
    const safeTop = clamp(top, 0, maxTop);
    const side = safeLeft + width / 2 < window.innerWidth / 2 ? "left" : "right";

    this.#launcher.style.left = `${Math.round(safeLeft)}px`;
    this.#launcher.style.top = `${Math.round(safeTop)}px`;
    this.#launcher.style.right = "auto";
    this.#launcher.style.bottom = "auto";
    this.#launcher.dataset.side = side;
    this.#panel.dataset.side = side;
  }

  #saveLauncherPosition(): void {
    const rect = this.#launcher.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - rect.width);
    const maxTop = Math.max(0, window.innerHeight - rect.height);
    const x = maxLeft === 0 ? 0.5 : clamp(rect.left / maxLeft, 0, 1);
    const y = maxTop === 0 ? 0.5 : clamp(rect.top / maxTop, 0, 1);
    const launcherSide = rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right";
    this.settings.update((draft) => {
      draft.ui.launcherPosition = { x, y };
      draft.ui.launcherSide = launcherSide;
    });
  }

  #positionLauncher(): void {
    const ui = this.settings.get().ui;
    if (!ui.launcherPosition) {
      this.#launcher.style.removeProperty("left");
      this.#launcher.style.removeProperty("top");
      this.#launcher.style.removeProperty("right");
      this.#launcher.style.removeProperty("bottom");
      this.#launcher.dataset.side = ui.launcherSide;
      this.#panel.dataset.side = ui.launcherSide;
      return;
    }

    const width = this.#launcher.offsetWidth || 58;
    const height = this.#launcher.offsetHeight || 58;
    this.#placeLauncher(
      ui.launcherPosition.x * Math.max(0, window.innerWidth - width),
      ui.launcherPosition.y * Math.max(0, window.innerHeight - height),
    );
  }

  #showConversationList(): void {
    this.#panel.dataset.mobileView = "list";
    this.#search.focus();
  }

  #emblem(className: string): HTMLSpanElement {
    const image = element("img", { className: "kl-emblem-image" }) as HTMLImageElement;
    image.src = KIKILINK_EMBLEM_DATA_URL;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    return element("span", { className: `kl-emblem ${className}` }, image);
  }

  #avatar(name: string, memberNumber: number, extraClass = ""): HTMLDivElement {
    const avatar = element("div", {
      className: `kl-avatar${extraClass ? ` ${extraClass}` : ""}`,
    });
    this.#renderAvatar(avatar, name, memberNumber);
    return avatar;
  }

  #renderAvatar(
    target: HTMLElement,
    name: string,
    memberNumber: number,
    explicitUrl?: string,
  ): void {
    const own = memberNumber === this.adapter.getOwnMemberNumber();
    const url = explicitUrl ?? this.presence.get(memberNumber).avatarUrl;
    const previewPolicy = this.settings.get().linkChat.imagePreviews;
    const allowedUrl =
      url &&
      (own ||
        previewPolicy === "always" ||
        (previewPolicy === "ask" && this.#allowedAvatarUrls.has(url)))
        ? url
        : "";
    if (
      target.dataset.avatarName === name &&
      target.dataset.avatarUrl === allowedUrl &&
      target.childNodes.length > 0
    ) {
      return;
    }
    target.dataset.kikilinkAvatar = "true";
    target.dataset.avatarName = name;
    target.dataset.avatarUrl = allowedUrl;
    const fallback = (): void => {
      if (target.dataset.avatarName !== name || target.dataset.avatarUrl !== allowedUrl) return;
      target.replaceChildren(document.createTextNode(avatarText(name)));
      target.dataset.avatarState = "initials";
    };
    fallback();
    if (!allowedUrl) return;

    const image = document.createElement("img");
    image.alt = `${name} profile avatar`;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("load", () => {
      if (target.dataset.avatarName !== name || target.dataset.avatarUrl !== allowedUrl) return;
      target.dataset.avatarState = "image";
    }, { once: true });
    image.addEventListener("error", fallback, { once: true });
    target.replaceChildren(image);
    target.dataset.avatarState = "loading";
    image.src = allowedUrl;
  }

  #renderOwnAvatarPreview(): void {
    const url = normalizeImageUrl(this.#presenceAvatarUrl.value);
    this.#renderAvatar(
      this.#presenceAvatarPreview,
      this.adapter.getOwnName(),
      this.adapter.getOwnMemberNumber(),
      url ?? "",
    );
  }

  #toast(message: string, kind: "info" | "error" = "info"): void {
    if (this.#toastTimer !== undefined) clearTimeout(this.#toastTimer);
    this.#toastTimer = undefined;
    this.#shadow.querySelector(".kl-toast")?.remove();
    const toast = element(
      "div",
      { className: "kl-toast" },
      element("span", { className: "kl-toast-message", text: message }),
    );
    toast.dataset.kind = kind;
    toast.setAttribute("role", kind === "error" ? "alert" : "status");
    toast.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    toast.setAttribute("aria-atomic", "true");
    const dismiss = element("button", {
      className: "kl-toast-dismiss",
      type: "button",
      title: "Dismiss message",
      ariaLabel: "Dismiss message",
      onClick: () => {
        if (this.#toastTimer !== undefined) clearTimeout(this.#toastTimer);
        this.#toastTimer = undefined;
        toast.remove();
      },
    });
    dismiss.append(kikiIcon("close"));
    toast.append(dismiss);
    const surface = this.#newChatDialog.open
      ? this.#newChatDialog
      : this.#panel.hidden
        ? this.#shadow
        : this.#panel;
    if (surface === this.#shadow) {
      toast.classList.add("kl-toast--floating");
      toast.dataset.side = this.settings.get().ui.launcherSide;
    }
    surface.append(toast);
    if (kind === "info") {
      this.#toastTimer = setTimeout(() => {
        toast.remove();
        this.#toastTimer = undefined;
      }, 5000);
    }
  }
}

function reactionField(
  label: string,
  control: HTMLElement,
  className = "",
): HTMLLabelElement {
  return element(
    "label",
    { className: `kl-reaction-field${className ? ` ${className}` : ""}` },
    element("span", { className: "kl-reaction-field-label", text: label }),
    control,
  );
}

function parseReactionMemberNumbers(value: string): number[] | undefined {
  const source = value.trim();
  if (!source) return [];
  const memberNumbers: number[] = [];
  for (const token of source.split(/[\s,;]+/u).filter(Boolean)) {
    const normalized = token.replace(/^#/u, "");
    if (!/^\d+$/u.test(normalized)) return undefined;
    const memberNumber = Number(normalized);
    if (!Number.isSafeInteger(memberNumber) || memberNumber < 0) return undefined;
    if (!memberNumbers.includes(memberNumber)) memberNumbers.push(memberNumber);
    if (memberNumbers.length > MAX_REACTION_MEMBERS) return undefined;
  }
  return memberNumbers;
}

function createReactionRuleId(): string {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `reaction-${Date.now().toString(36)}-${random}`;
}

function soundPresetOr(
  value: string,
  fallback: NotificationSoundPreset,
): NotificationSoundPreset {
  return value === "sparkle" || value === "pop" || value === "chime" ? value : fallback;
}

function finderSettingResults(): FinderResult[] {
  const definitions: Array<{
    section: SettingsSection;
    title: string;
    detail: string;
    keywords: string;
  }> = [
    {
      section: "appearance",
      title: "Appearance & comfort",
      detail: "Theme, logo comfort, room Blossom position, spacing, text size, and motion",
      keywords: "light dark system color colour blossom addon badge icon position drag reset guided focused density compact super tiny font scale reduced motion",
    },
    {
      section: "navigation",
      title: "Navigation & launcher",
      detail: "Opening destination, side, and launcher position",
      keywords: "home last chat left right drag reset emblem start screen",
    },
    {
      section: "chat",
      title: "Chat & history",
      detail: "Typing, temporary Catbox images, history, retention, and Quick Actions",
      keywords: "beep messages typing indicator realtime image picture preview upload local catbox litterbox temporary privacy enter send newline save storage days clear wave hug boop template afk idle avatar profile",
    },
    {
      section: "players",
      title: "Players & notebook",
      detail: "Roster, encounters, retention, notes, and notebook backup",
      keywords: "people linkroster tracking private data clear whisper profile export import backup json favorites tags retention",
    },
    {
      section: "activities",
      title: "Custom Activities",
      detail: "Body slots, vanilla pictures, action text, and optional arousal",
      keywords: "custom activities blossom body slot image target me gender pronoun arousal advanced",
    },
    {
      section: "reactions",
      title: "Notifications",
      detail: "Friend, room, and chat alerts with optional sounds and advanced rules",
      keywords:
        "alert sound audio chime sparkle pop linkreactions automation event rule beep join leave online friend notification notice emote advanced cooldown template",
    },
  ];
  return definitions.map((definition, index) => ({
    id: `setting-${definition.section}`,
    kind: "setting",
    icon: "settings",
    category: "Settings",
    title: definition.title,
    detail: definition.detail,
    keywords: definition.keywords,
    priority: 58 - index,
    action: { kind: "setting", section: definition.section },
  }));
}

function normalizeFinderText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/gu, " ");
}

function rankFinderResults(catalog: FinderResult[], query: string): FinderResult[] {
  const terms = query.split(" ").filter(Boolean);
  return catalog
    .map((result) => {
      const title = normalizeFinderText(result.title);
      const detail = normalizeFinderText(result.detail);
      const category = normalizeFinderText(result.category);
      const haystack = `${title} ${detail} ${category} ${normalizeFinderText(result.keywords)}`;
      if (!terms.every((term) => haystack.includes(term))) return undefined;

      let score = result.priority;
      if (title === query) score += 1000;
      else if (title.startsWith(query)) score += 650;
      else if (title.includes(query)) score += 360;
      if (category === query) score += 220;
      else if (category.startsWith(query)) score += 90;
      if (detail.startsWith(query)) score += 80;
      for (const term of terms) {
        if (title.split(" ").some((word) => word.startsWith(term))) score += 35;
      }
      return { result, score };
    })
    .filter((entry): entry is { result: FinderResult; score: number } => entry !== undefined)
    .sort(
      (left, right) =>
        right.score - left.score || left.result.title.localeCompare(right.result.title),
    )
    .map((entry) => entry.result);
}

function selectOption(value: string, label: string): HTMLOptionElement {
  const option = element("option", { text: label });
  option.value = value;
  return option;
}

function presenceLabel(status: PresenceSnapshot["status"]): string {
  if (status === "online") return "Online";
  if (status === "idle") return "Idle";
  if (status === "dnd") return "Do not disturb";
  if (status === "offline") return "Offline";
  return "Status unavailable";
}

function presenceHelp(status: PresenceStatus): string {
  if (status === "online") return "Available and ready to chat";
  if (status === "idle") return "Away for a little while";
  if (status === "dnd") return "Busy and may reply later";
  return "Appear offline inside KikiLink";
}

function presenceDot(status: PresenceSnapshot["status"]): HTMLSpanElement {
  const dot = element("span", { className: "kl-presence-dot" });
  dot.dataset.status = status;
  dot.setAttribute("aria-hidden", "true");
  return dot;
}

function presenceDescription(snapshot: PresenceSnapshot): string {
  const label = presenceLabel(snapshot.status);
  const source =
    snapshot.source === "kikilink"
      ? "shared by KikiLink"
      : snapshot.source === "room"
        ? "currently in your room"
        : snapshot.source === "friend-list"
          ? "Bondage Club friend list"
          : "not available for this player";
  return snapshot.statusMessage
    ? `${label} · ${snapshot.statusMessage} · ${source}`
    : `${label} · ${source}`;
}

function messagePreview(content: string): string {
  const trimmed = content.trim();
  const image = parseMessageLinks(trimmed).find(
    (link) => link.image && link.start === 0 && link.end === trimmed.length,
  );
  return image ? "Image" : content;
}

function messageGroupPosition(
  previousDirection: string | undefined,
  direction: string | undefined,
  nextDirection: string | undefined,
): MessageGroupPosition {
  const joinsPrevious = direction !== undefined && previousDirection === direction;
  const joinsNext = direction !== undefined && nextDirection === direction;
  if (joinsPrevious && joinsNext) return "middle";
  if (joinsPrevious) return "end";
  if (joinsNext) return "start";
  return "single";
}

function avatarText(name: string): string {
  const trimmed = name.trim();
  return trimmed ? [...trimmed][0]?.toLocaleUpperCase() ?? "?" : "?";
}

function formatConversationTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatMessageTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(timestamp),
  );
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "—";
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(timestamp),
  );
}

function greetingForCurrentTime(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still awake";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatFullSeenTime(timestamp: number): string {
  if (!timestamp) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function imageUploadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "Unable to prepare this image";
  return (message || "Unable to prepare this image").slice(0, 180);
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}

function readableForeground(background: string): "#17100d" | "#fff8ee" {
  const channels = [1, 3, 5].map((index) => Number.parseInt(background.slice(index, index + 2), 16));
  const luminance = relativeLuminance(channels);
  const darkContrast = (luminance + 0.05) / 0.057;
  const lightContrast = 1.044 / (luminance + 0.05);
  return darkContrast >= lightContrast ? "#17100d" : "#fff8ee";
}

function relativeLuminance(channels: number[]): number {
  const [red = 0, green = 0, blue = 0] = channels.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
