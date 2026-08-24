import type { BCAdapter } from "../../bc/adapter";
import type {
  BCConnectionState,
  ConversationMeta,
  KikiLinkSettings,
  QuickAction,
  RoomActivity,
  RoomCharacter,
  RosterEntry,
  SettingsSection,
} from "../../core/types";
import { MemoryKeyValueStorage, type SettingsStore } from "../../core/settings";
import { debounce, element } from "../../utils/dom";
import { LinkActivitiesService } from "../link-activities/link-activities-service";
import {
  LinkRosterService,
  type RosterScope,
  type RosterSyncResult,
} from "../link-roster/link-roster-service";
import { PeopleRepository } from "../../storage/people-repository";
import type { ChatService } from "./chat-service";
import { LINK_CHAT_STYLES } from "./styles";
import KIKILINK_EMBLEM_DATA_URL from "../../../design/references/3929.png";

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
type FinderAction =
  | { kind: "workspace"; target: FeatureTarget }
  | { kind: "new-chat" }
  | { kind: "conversation"; peerNumber: number; peerName: string }
  | { kind: "player"; memberNumber: number }
  | { kind: "activity"; index: number }
  | { kind: "setting"; section: SettingsSection };

interface FinderResult {
  id: string;
  kind: FinderResultKind;
  icon: string;
  category: string;
  title: string;
  detail: string;
  keywords: string;
  priority: number;
  action: FinderAction;
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
    text: "⚙",
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
    title: "Open LinkActivities",
  });
  readonly #conversationList = element("div", { className: "kl-conversations" });
  readonly #search = element("input", { className: "kl-search" });
  readonly #empty = element("div", { className: "kl-empty" });
  readonly #chat = element("section", { className: "kl-chat" });
  readonly #chatAvatar = element("div", { className: "kl-avatar" });
  readonly #chatName = element("div", { className: "kl-chat-name" });
  readonly #chatNumber = element("div", { className: "kl-chat-number" });
  readonly #pinButton = element("button", {
    className: "kl-icon-button",
    type: "button",
    title: "Pin conversation",
    ariaLabel: "Pin conversation",
  });
  readonly #messages = element("div", { className: "kl-messages" });
  readonly #composer = element("textarea", { className: "kl-composer-input" });
  readonly #sendButton = element("button", {
    className: "kl-text-button kl-text-button--primary kl-send",
    type: "button",
    text: "Send",
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
  readonly #activitiesEditor = element("div", {
    className: "kl-action-editor kl-activities-editor",
  });
  readonly #activitiesButton = element("button", {
    className: "kl-nav-item kl-activities-button",
    type: "button",
    title: "LinkActivities",
    ariaLabel: "Open LinkActivities",
  });
  readonly #activitiesPage = element("section", {
    className: "kl-feature-page kl-activities-page",
    ariaLabel: "LinkActivities",
  });
  readonly #activityTargetQuery = element("input", {
    className: "kl-search kl-activity-target-query",
  }) as HTMLInputElement;
  readonly #activityTargetResults = element("div", { className: "kl-activity-targets" });
  readonly #activityLibrary = element("div", { className: "kl-activity-library" });
  readonly #activityStatus = element("div", { className: "kl-activity-status" });
  readonly #activityPreview = element("div", { className: "kl-activity-preview" });
  readonly #performActivityButton = element("button", {
    className: "kl-text-button kl-text-button--primary kl-perform-activity",
    type: "button",
    text: "Perform",
  });
  readonly #newChatDialog = element("dialog", { className: "kl-dialog kl-new-chat-dialog" });
  readonly #newChatQuery = element("input", { className: "kl-search kl-new-chat-query" }) as HTMLInputElement;
  readonly #newChatResults = element("div", { className: "kl-contact-results" });
  readonly #finderDialog = element("dialog", { className: "kl-dialog kl-finder-dialog" });
  readonly #finderQuery = element("input", { className: "kl-finder-query" }) as HTMLInputElement;
  readonly #finderResults = element("div", { className: "kl-finder-results" });
  readonly #finderStatus = element("div", { className: "kl-sr-only" });
  readonly #backButton = element("button", {
    className: "kl-icon-button kl-back",
    type: "button",
    text: "‹",
    title: "Back to conversations",
    ariaLabel: "Back to conversations",
  });
  #activePeer: number | undefined;
  #activeName = "";
  #selectedActivityIndex = 0;
  #selectedActivityTarget: RoomCharacter | undefined;
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

  readonly #handleViewportResize = (): void => {
    this.#positionLauncher();
    this.#updateSettingsTabOrientation();
  };

  readonly #saveDraft = debounce((peerNumber: number, peerName: string, value: string) => {
    void this.service.setDraft(peerNumber, peerName, value);
  }, 250);

  constructor(
    private readonly adapter: BCAdapter,
    private readonly service: ChatService,
    private readonly settings: SettingsStore,
    private readonly version: string,
    private readonly activities = new LinkActivitiesService(adapter),
    private readonly roster = new LinkRosterService(
      adapter,
      new PeopleRepository(new MemoryKeyValueStorage()),
      settings,
    ),
  ) {}

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
    this.#shadow.append(
      style,
      this.#launcher,
      this.#panel,
      this.#newChatDialog,
      this.#finderDialog,
    );
    document.body.append(this.#host);
    this.#positionLauncher();
    window.addEventListener("resize", this.#handleViewportResize);

    void this.refresh();
  }

  destroy(): void {
    if (this.#toastTimer !== undefined) clearTimeout(this.#toastTimer);
    this.#finderDialog.close();
    this.#newChatDialog.close();
    window.removeEventListener("resize", this.#handleViewportResize);
    this.#host.remove();
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
    this.#composer.placeholder = canSend ? "Write a Beep…" : "Connecting to Bondage Club…";
    if (this.#newChatDialog.open) this.#renderKnownContacts();
    if (this.#workspaceView === "activities") this.#renderActivitiesPage();
    if (this.#workspaceView === "roster") this.#renderRoster();
  }

  async onMessage(peerNumber: number, incoming: boolean): Promise<void> {
    if (incoming && this.settings.get().linkChat.openOnIncoming) {
      await this.openChat(peerNumber, this.adapter.getMemberName(peerNumber));
      return;
    }

    await this.refresh();
    if (this.#activePeer === peerNumber) await this.#renderMessages(peerNumber);
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
    if (this.#finderDialog.open) this.#finderDialog.close();
    if (this.#newChatDialog.open) this.#newChatDialog.close();
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
    const name =
      this.adapter.getMemberNickname(memberNumber) ||
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
    this.#presentCount = result.presentCount;
    this.#rosterCount.hidden = result.presentCount === 0;
    this.#rosterCount.textContent = result.presentCount > 99 ? "99+" : result.presentCount.toString();
    this.#rosterButton.title = result.presentCount
      ? `LinkRoster · ${result.presentCount} in room`
      : "LinkRoster";
    this.#renderHomeStatus();
    void this.#renderHome();
    if (this.#workspaceView === "roster" && result.changed) this.#renderRoster();
  }

  async refresh(): Promise<void> {
    await this.#updateUnreadBadge();
    await Promise.all([this.#renderConversations(), this.#renderHome()]);
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
      text: "×",
      title: "Close KikiLink",
      ariaLabel: "Close KikiLink",
      onClick: () => this.close(),
    });
    this.#topbarSettingsButton.addEventListener("click", () => this.#openSettings());
    this.#finderTrigger.replaceChildren(
      element("span", { className: "kl-finder-trigger-icon", text: "⌕" }),
      element("span", { className: "kl-finder-trigger-label", text: "Find" }),
      element("kbd", { className: "kl-finder-shortcut", text: "Ctrl K" }),
    );
    this.#finderTrigger.setAttribute("aria-keyshortcuts", "Control+K Meta+K");
    this.#finderTrigger.addEventListener("click", () => this.#openFinder());
    const topbar = element(
      "header",
      { className: "kl-topbar" },
      brand,
      this.#contextTitle,
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
          text: "+",
          title: "New Beep chat",
          ariaLabel: "New Beep chat",
          onClick: () => this.#openNewChat(),
        }),
      ),
      this.#conversationList,
    );

    this.#empty.append(
      element("div", { className: "kl-empty-mark", text: "↔" }),
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
      if (event.key === "Escape" && !this.#newChatDialog.open && !this.#finderDialog.open) {
        this.close();
      }
    });
  }

  #buildFeatureNavigation(): void {
    this.#configureNavButton(this.#homeNavButton, "⌂", "Home", "home");
    this.#configureNavButton(this.#chatNavButton, "↔", "Chat", "chat");
    this.#configureNavButton(this.#rosterButton, "☷", "Players", "roster");
    this.#configureNavButton(this.#activitiesButton, "✦", "Activities", "activities");
    this.#configureNavButton(this.#settingsNavButton, "⚙", "Settings", "settings");
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
    icon: string,
    label: string,
    target: FeatureTarget,
  ): void {
    button.dataset.target = target;
    button.replaceChildren(
      element("span", { className: "kl-nav-icon", text: icon }),
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
      "↔",
      "START OR CONTINUE",
      "Chat",
      "Read recent Beeps, find conversations, and send a message.",
      this.#homeChatMetric,
      element("span", { className: "kl-feature-card-action", text: "Open Chat" }),
    );
    this.#fillFeatureCard(
      this.#homeRosterCard,
      "☷",
      "SEE WHO IS HERE",
      "Players",
      "Find people in the room, Whisper, and keep private notes.",
      this.#homeRosterMetric,
      this.#homeRosterAction,
    );
    this.#homeRosterCard.addEventListener("click", () => this.#activateFeature("roster"));
    this.#fillFeatureCard(
      this.#homeActivitiesCard,
      "✦",
      "EXPRESS YOURSELF",
      "Activities",
      "Choose a reusable room emote and preview it before sending.",
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
      "⚙",
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
      element("span", { className: "kl-home-privacy-icon", text: "◇" }),
      element(
        "span",
        {},
        "Private by design · chats, notes, favorites, and preferences stay in this browser.",
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
    icon: string,
    kicker: string,
    title: string,
    description: string,
    metric: HTMLElement,
    action: HTMLElement,
  ): void {
    card.replaceChildren(
      element("span", { className: "kl-feature-card-icon", text: icon }),
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
              ? "Activities"
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
    this.#backButton.addEventListener("click", () => this.#showConversationList());
    this.#pinButton.textContent = "◇";
    this.#pinButton.addEventListener("click", () => void this.#togglePin());
    const person = element("div", { className: "kl-chat-person" }, this.#chatName, this.#chatNumber);
    const header = element(
      "header",
      { className: "kl-chat-header" },
      this.#backButton,
      this.#chatAvatar,
      person,
      this.#pinButton,
    );

    this.#composer.maxLength = 1000;
    this.#composer.rows = 1;
    this.#composer.addEventListener("input", () => {
      this.#resizeComposer();
      this.#updateCounter();
      if (this.#activePeer !== undefined) {
        this.#saveDraft(this.#activePeer, this.#activeName, this.#composer.value);
      }
    });
    this.#composer.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void this.#send();
      }
    });
    this.#sendButton.addEventListener("click", () => void this.#send());
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
      this.#quickActions,
      element("div", { className: "kl-composer-row" }, this.#composer, this.#sendButton),
      options,
    );
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
    );
    this.#densitySelect.dataset.setting = "density";
    this.#densitySelect.setAttribute("aria-label", "Interface spacing");
    const density = this.#settingRow(
      "Spacing",
      "Comfortable is easier to tap; Compact fits more on screen.",
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
      "Stored only in this browser profile.",
      historySwitch,
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
      "Store the last room, time, and encounter count only in this browser.",
      rosterTrackingSwitch,
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
      "Control what the player workspace remembers in this browser.",
      rosterEnabled,
      rosterTracking,
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
      "Keep Beep history useful, local, and under your control.",
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
    this.#activitiesToggle.setAttribute("aria-label", "Enable LinkActivities");
    const activitiesEnabled = this.#settingRow(
      "Show Activity Studio shortcut",
      "Optional room-emote studio. Disabled by default to keep the toolbar focused.",
      activitiesSwitch,
    );
    const addActivity = element("button", {
      className: "kl-text-button kl-add-action",
      type: "button",
      text: "+ Add room activity",
      onClick: () => this.#addActivityEditorRow(),
    });
    const activitiesSection = this.#createSettingsPanel(
      "activities",
      "Activities library",
      "Keep reusable room emotes close without crowding the deck when you do not need them.",
      activitiesEnabled,
      element("div", {
        className: "kl-setting-help",
        text: "Create room emotes visible to everyone. Variables: {target}, {member}, {source}.",
      }),
      this.#activitiesEditor,
      addActivity,
    );

    const panels = element(
      "div",
      { className: "kl-settings-panels" },
      appearanceSection,
      navigationSection,
      chatSection,
      rosterSection,
      activitiesSection,
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
        text: "Preferences stay in this browser.",
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
    const labels: Record<SettingsSection, { icon: string; label: string }> = {
      appearance: { icon: "◐", label: "Appearance" },
      navigation: { icon: "⌁", label: "Navigation" },
      chat: { icon: "↔", label: "Chat" },
      players: { icon: "☷", label: "Players" },
      activities: { icon: "✦", label: "Activities" },
    };
    const tab = element(
      "button",
      { className: "kl-settings-tab", type: "button" },
      element("span", { className: "kl-settings-tab-icon", text: labels[section].icon }),
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
      text: "×",
      title: "Close",
      ariaLabel: "Close new chat",
      onClick: () => this.#newChatDialog.close(),
    });
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
      text: "×",
      title: "Close",
      ariaLabel: "Close LinkFinder",
      onClick: () => this.#finderDialog.close(),
    });
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

    const searchIcon = element("span", { className: "kl-finder-search-icon", text: "⌕" });
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
        icon: "⌂",
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
        icon: "↔",
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
        icon: "+",
        category: "Action",
        title: "Start a new chat",
        detail: "Choose a contact or enter a member number",
        keywords: "new beep contact member number send message",
        priority: 92,
        action: { kind: "new-chat" },
      },
      {
        id: "destination-players",
        kind: "destination",
        icon: "☷",
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
        icon: "✦",
        category: "Destination",
        title: "Activities",
        detail: settings.linkActivities.enabled
          ? `${settings.linkActivities.activities.length} saved activities`
          : "Optional room actions · currently off",
        keywords: "activity activities emote room roleplay studio linkactivities",
        priority: 68,
        action: { kind: "workspace", target: "activities" },
      },
      {
        id: "destination-settings",
        kind: "destination",
        icon: "⚙",
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
        icon: "↔",
        category: "Chat",
        title: conversation.peerName,
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
        icon: entry.favorite ? "★" : "☷",
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
        icon: "↔",
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

    settings.linkActivities.activities.forEach((activity, index) => {
      results.push({
        id: `activity-${index}`,
        kind: "activity",
        icon: "✦",
        category: "Activity",
        title: activity.label,
        detail: activity.template,
        keywords: `activity emote room action ${activity.template}`,
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
          icon: "+",
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
      const resultIcon = element("span", { className: "kl-finder-result-icon", text: result.icon });
      resultIcon.setAttribute("aria-hidden", "true");
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
      text: "Notes, tags, favorites, and encounter history stay in this browser profile.",
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
    const badges = element("div", { className: "kl-roster-entry-badges" });
    if (entry.present) badges.append(element("span", { className: "kl-roster-live", text: "HERE" }));
    if (entry.isFriend) badges.append(element("span", { className: "kl-roster-friend", text: "FRIEND" }));
    if (entry.favorite) badges.append(element("span", { className: "kl-roster-favorite", text: "★" }));
    const preview = entry.tags.length
      ? entry.tags.join(" · ")
      : entry.note
        ? entry.note.replace(/\s+/gu, " ")
        : entry.lastRoomName || `Member ${entry.memberNumber}`;
    const button = element(
      "button",
      { className: "kl-roster-entry", type: "button" },
      element("div", { className: "kl-avatar", text: avatarText(entry.displayName) }),
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
      text: entry.favorite ? "★" : "☆",
      title: entry.favorite ? "Remove from favorites" : "Add to favorites",
      ariaLabel: entry.favorite ? "Remove from favorites" : "Add to favorites",
      onClick: () => {
        this.#saveNotebook(false);
        this.roster.toggleFavorite(entry.memberNumber, entry.displayName);
        this.#notebookDirty = false;
        this.#renderRoster();
      },
    });
    const identity = element(
      "div",
      { className: "kl-roster-identity" },
      element("div", { className: "kl-avatar kl-roster-avatar", text: avatarText(entry.displayName) }),
      element(
        "div",
        { className: "kl-roster-identity-copy" },
        element("div", { className: "kl-roster-name", text: entry.displayName }),
        element("div", {
          className: "kl-roster-number",
          text: `Member ${entry.memberNumber}${entry.present ? " · in this room" : ""}`,
        }),
      ),
      favorite,
    );

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
    const header = element(
      "header",
      { className: "kl-feature-page-header" },
      element(
        "div",
        { className: "kl-feature-page-heading" },
        element("div", { className: "kl-feature-page-eyebrow", text: "ROOM TOOLS" }),
        element("h1", { className: "kl-feature-page-title", text: "Activities" }),
        element("p", {
          className: "kl-feature-page-subtitle",
          text: "Choose a person, preview your emote, then send it through the native room chat.",
        }),
      ),
    );

    this.#activityTargetQuery.type = "search";
    this.#activityTargetQuery.placeholder = "Search room characters";
    this.#activityTargetQuery.autocomplete = "off";
    this.#activityTargetQuery.addEventListener("input", () => this.#renderActivitiesPage());
    this.#activityStatus.setAttribute("role", "status");
    this.#activityStatus.setAttribute("aria-live", "polite");

    const targetPane = element(
      "section",
      { className: "kl-activity-pane" },
      element("div", { className: "kl-activity-pane-title", text: "Choose target" }),
      this.#activityTargetQuery,
      this.#activityTargetResults,
    );
    const libraryPane = element(
      "section",
      { className: "kl-activity-pane" },
      element("div", { className: "kl-activity-pane-title", text: "Choose activity" }),
      this.#activityLibrary,
    );
    const studio = element("div", { className: "kl-activity-studio" }, targetPane, libraryPane);
    const preview = element(
      "section",
      { className: "kl-activity-preview-wrap" },
      element("div", { className: "kl-activity-pane-title", text: "Room preview" }),
      this.#activityPreview,
    );
    const body = element(
      "div",
      { className: "kl-activities-body" },
      this.#activityStatus,
      studio,
      preview,
    );

    const edit = element("button", {
      className: "kl-text-button kl-edit-activities",
      type: "button",
      text: "Edit activities",
      onClick: () => this.#openSettings("activities"),
    });
    this.#performActivityButton.addEventListener("click", () => this.#performActivity());
    const actions = element(
      "footer",
      { className: "kl-feature-page-footer kl-activity-actions" },
      element("span", {
        className: "kl-feature-page-footnote",
        text: "Other players see a standard Bondage Club emote.",
      }),
      edit,
      this.#performActivityButton,
    );
    this.#activitiesPage.append(header, body, actions);
  }

  #openActivities(activityIndex?: number): void {
    if (!this.settings.get().linkActivities.enabled) {
      this.#openSettings("activities");
      this.#activitiesToggle.focus();
      this.#toast("Activity Studio is optional. Enable its shortcut here when you want it.");
      return;
    }

    this.#showWorkspace("activities");
    if (activityIndex !== undefined && Number.isInteger(activityIndex) && activityIndex >= 0) {
      this.#selectedActivityIndex = activityIndex;
    }
    this.#activityTargetQuery.value = "";
    const targets = this.activities.getTargets();
    const preferredTarget = targets.find(
      (target) => target.memberNumber === this.#selectedActivityTarget?.memberNumber,
    ) ?? targets.find((target) => target.memberNumber === this.#activePeer);
    this.#selectedActivityTarget = preferredTarget ?? targets[0];
    const activityCount = this.settings.get().linkActivities.activities.length;
    if (this.#selectedActivityIndex >= activityCount) this.#selectedActivityIndex = 0;
    this.#renderActivitiesPage();
    if (activityIndex !== undefined) {
      this.#activityLibrary
        .querySelector<HTMLButtonElement>(`[data-activity-index="${this.#selectedActivityIndex}"]`)
        ?.focus();
    } else {
      this.#activityTargetQuery.focus();
    }
  }

  #renderActivitiesPage(): void {
    const targets = this.activities.getTargets();
    const currentTarget = targets.find(
      (target) => target.memberNumber === this.#selectedActivityTarget?.memberNumber,
    );
    this.#selectedActivityTarget = currentTarget;

    const query = this.#activityTargetQuery.value.trim().toLocaleLowerCase();
    const visibleTargets = targets.filter(
      (target) =>
        !query ||
        target.memberName.toLocaleLowerCase().includes(query) ||
        target.memberNumber.toString().includes(query),
    );
    this.#activityTargetResults.replaceChildren();
    if (visibleTargets.length === 0) {
      this.#activityTargetResults.append(
        element("div", {
          className: "kl-contact-empty",
          text: targets.length === 0 ? "No other characters are available." : "No matching characters.",
        }),
      );
    } else {
      for (const target of visibleTargets) {
        const button = element(
          "button",
          { className: "kl-activity-target", type: "button" },
          element("div", { className: "kl-avatar", text: avatarText(target.memberName) }),
          element(
            "div",
            { className: "kl-contact-copy" },
            element("div", { className: "kl-contact-name", text: target.memberName }),
            element("div", {
              className: "kl-contact-number",
              text: `Member ${target.memberNumber}`,
            }),
          ),
        );
        button.dataset.selected = String(
          target.memberNumber === this.#selectedActivityTarget?.memberNumber,
        );
        button.addEventListener("click", () => {
          this.#selectedActivityTarget = target;
          this.#renderActivitiesPage();
        });
        this.#activityTargetResults.append(button);
      }
    }

    const roomActivities = this.settings.get().linkActivities.activities;
    if (this.#selectedActivityIndex >= roomActivities.length) this.#selectedActivityIndex = 0;
    this.#activityLibrary.replaceChildren();
    if (roomActivities.length === 0) {
      this.#activityLibrary.append(
        element("div", {
          className: "kl-contact-empty",
          text: "Your activity library is empty. Choose Edit activities to create one.",
        }),
      );
    } else {
      roomActivities.forEach((activity, index) => {
        const button = element(
          "button",
          { className: "kl-activity-card", type: "button" },
          element("div", { className: "kl-activity-card-label", text: activity.label }),
          element("div", { className: "kl-activity-card-template", text: activity.template }),
        );
        button.dataset.selected = String(index === this.#selectedActivityIndex);
        button.dataset.activityIndex = index.toString();
        button.addEventListener("click", () => {
          this.#selectedActivityIndex = index;
          this.#renderActivitiesPage();
        });
        this.#activityLibrary.append(button);
      });
    }

    const activity = roomActivities[this.#selectedActivityIndex];
    const target = this.#selectedActivityTarget;
    if (!this.adapter.isInChatRoom()) {
      this.#activityStatus.textContent = "Open Activity Studio while you are inside a chat room.";
      this.#activityStatus.dataset.kind = "error";
    } else if (!this.activities.isAvailable()) {
      this.#activityStatus.textContent = "The native room chat is still loading.";
      this.#activityStatus.dataset.kind = "error";
    } else {
      this.#activityStatus.textContent = `${targets.length} ${targets.length === 1 ? "target" : "targets"} available in this room.`;
      this.#activityStatus.dataset.kind = "ready";
    }

    if (activity && target) {
      this.#activityPreview.textContent = `${this.adapter.getOwnName()} ${this.activities.preview(activity, target)}`;
    } else {
      this.#activityPreview.textContent = activity
        ? "Choose a character to preview this activity."
        : "Create an activity in KikiLink settings first.";
    }
    this.#performActivityButton.disabled = !activity || !target || !this.activities.isAvailable();
  }

  #performActivity(): void {
    const activity = this.settings.get().linkActivities.activities[this.#selectedActivityIndex];
    const target = this.#selectedActivityTarget;
    if (!activity || !target) return;

    try {
      this.activities.perform(activity, target);
      this.#toast(`${activity.label} sent to the room.`);
    } catch (error) {
      this.#renderActivitiesPage();
      this.#toast(error instanceof Error ? error.message : "Unable to perform this activity", "error");
    }
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

  async #renderHome(): Promise<void> {
    const ownName = this.adapter.getOwnName().trim();
    const greeting = greetingForCurrentTime();
    this.#homeGreeting.textContent =
      ownName && ownName.toLocaleLowerCase() !== "me"
        ? `${greeting}, ${ownName}.`
        : `${greeting}.`;

    const conversations = await this.service.listConversations();
    const recent = [...conversations].sort(
      (left, right) => right.lastMessageAt - left.lastMessageAt,
    )[0];
    if (this.#unreadCount > 0) {
      this.#homeChatMetric.textContent = `${this.#unreadCount} unread · ${conversations.length} chats`;
    } else if (recent && recent.lastMessageAt > 0) {
      this.#homeChatMetric.textContent = `Last with ${recent.peerName} · ${formatRelativeTime(recent.lastMessageAt)}`;
    } else if (conversations.length > 0) {
      this.#homeChatMetric.textContent = `${conversations.length} saved ${conversations.length === 1 ? "chat" : "chats"}`;
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
      this.#homeActionIcon.textContent = "↔";
      this.#homeActionTitle.textContent = `${total} unread ${total === 1 ? "Beep" : "Beeps"}`;
      this.#homeActionDescription.textContent =
        total === unread.unread
          ? `Open the conversation with ${unread.peerName} and continue when you are ready.`
          : `Start with ${unread.peerName}, then work through the rest at your pace.`;
      this.#homeActionMeta.textContent =
        total === unread.unread ? `From ${unread.peerName}` : "Across recent chats";
      this.#homeActionButton.textContent = total === 1 ? "Read message" : "Read messages";
    } else if (conversations.length === 0) {
      this.#homeAction = { kind: "new-chat" };
      this.#homeActionIcon.textContent = "+";
      this.#homeActionTitle.textContent = "Start your first chat";
      this.#homeActionDescription.textContent =
        "Choose someone you know or enter a member number. KikiLink keeps the conversation together.";
      this.#homeActionMeta.textContent = "Takes only a moment";
      this.#homeActionButton.textContent = "Start a chat";
    } else if (settings.linkRoster.enabled && inRoom && this.#presentCount > 0) {
      this.#homeAction = { kind: "roster" };
      this.#homeActionIcon.textContent = "☷";
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
      this.#homeActionIcon.textContent = "↔";
      this.#homeActionTitle.textContent = `Continue with ${recent.peerName}`;
      this.#homeActionDescription.textContent = "Pick up your most recent Beep conversation.";
      this.#homeActionMeta.textContent =
        recent.lastMessageAt > 0 ? formatRelativeTime(recent.lastMessageAt) : "Conversation ready";
      this.#homeActionButton.textContent = "Open chat";
    } else {
      this.#homeAction = { kind: "chat" };
      this.#homeActionIcon.textContent = "↔";
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
    this.#homeActivitiesCard.dataset.available = String(settings.linkActivities.enabled);
    this.#homeActivitiesMetric.textContent = settings.linkActivities.enabled
      ? `${settings.linkActivities.activities.length} saved ${settings.linkActivities.activities.length === 1 ? "activity" : "activities"}`
      : "Optional · tap to enable";
    this.#homeActivitiesAction.textContent = settings.linkActivities.enabled
      ? "Choose activity"
      : "Turn on Activities";

    const themeLabel =
      settings.ui.theme === "light"
        ? "Light paper"
        : settings.ui.theme === "system"
          ? "System theme"
          : "Dark lacquer";
    const comfortLabel = settings.ui.density === "compact" ? "Compact" : "Comfortable";
    this.#homeSettingsMetric.textContent = `${themeLabel} · ${comfortLabel} · ${settings.ui.accent.toUpperCase()}`;
  }

  async #renderConversations(): Promise<void> {
    const query = this.#search.value.trim().toLocaleLowerCase();
    const allConversations = await this.service.listConversations();
    for (const conversation of allConversations) {
      const nickname = this.adapter.getMemberNickname(conversation.peerNumber);
      if (!nickname || nickname === conversation.peerName) continue;
      conversation.peerName = nickname;
      await this.service.setPeerName(conversation.peerNumber, nickname);
      if (conversation.peerNumber === this.#activePeer) {
        this.#activeName = nickname;
        this.#chatName.textContent = nickname;
        this.#chatAvatar.textContent = avatarText(nickname);
      }
    }
    const conversations = allConversations.filter((conversation) => {
      if (!query) return true;
      return (
        conversation.peerName.toLocaleLowerCase().includes(query) ||
        conversation.peerNumber.toString().includes(query) ||
        conversation.lastMessage.toLocaleLowerCase().includes(query)
      );
    });

    this.#conversationList.replaceChildren();
    if (conversations.length === 0) {
      this.#conversationList.append(
        element("div", {
          className: "kl-empty-copy",
          text: query ? "No matching chats." : "No conversations yet.",
        }),
      );
      return;
    }

    for (const conversation of conversations) {
      this.#conversationList.append(this.#conversationButton(conversation));
    }
  }

  #conversationButton(conversation: ConversationMeta): HTMLButtonElement {
    const nameRow = element(
      "div",
      { className: "kl-conversation-name-row" },
      element("span", { className: "kl-conversation-name", text: conversation.peerName }),
      conversation.pinned ? element("span", { className: "kl-pin", text: "◆" }) : null,
    );
    const prefix = conversation.lastDirection === "outgoing" ? "You: " : "";
    const preview = conversation.lastMessage
      ? `${prefix}${conversation.lastMessage}`
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
      element("div", { className: "kl-avatar", text: avatarText(conversation.peerName) }),
      main,
      side,
    );
    button.dataset.active = String(conversation.peerNumber === this.#activePeer);
    button.addEventListener("click", () =>
      void this.#selectConversation(conversation.peerNumber, conversation.peerName),
    );
    return button;
  }

  async #selectConversation(peerNumber: number, peerName: string): Promise<void> {
    const displayName = this.adapter.getMemberNickname(peerNumber) ?? peerName;
    this.#activePeer = peerNumber;
    this.#activeName = displayName;
    this.#panel.dataset.mobileView = "chat";
    const conversation = await this.service.ensureConversation(peerNumber, displayName);
    if (displayName !== conversation.peerName) {
      await this.service.setPeerName(peerNumber, displayName);
      conversation.peerName = displayName;
    }
    await this.service.markRead(peerNumber);

    this.#empty.hidden = true;
    this.#chat.hidden = false;
    this.#chatAvatar.textContent = avatarText(displayName);
    this.#chatName.textContent = displayName;
    this.#chatNumber.textContent = `Member ${peerNumber}`;
    this.#pinButton.textContent = conversation.pinned ? "◆" : "◇";
    this.#pinButton.title = conversation.pinned ? "Unpin conversation" : "Pin conversation";
    this.#composer.value = conversation.draft;
    this.#includeRoom.checked = this.settings.get().linkChat.includeRoomByDefault;
    this.#resizeComposer();
    this.#updateCounter();
    await Promise.all([this.#renderMessages(peerNumber), this.refresh()]);
    this.#composer.focus();
  }

  async #renderMessages(peerNumber: number): Promise<void> {
    const messages = await this.service.getMessages(peerNumber);
    this.#messages.replaceChildren();
    if (messages.length === 0) {
      this.#messages.append(
        element("div", {
          className: "kl-empty-copy",
          text: "No Beeps here yet. Send the first one.",
        }),
      );
      return;
    }

    for (const message of messages) {
      const body = element("div", {
        text: message.content || "Beep without a message",
      });
      const meta = element(
        "div",
        { className: "kl-message-meta" },
        message.roomName
          ? element("span", { className: "kl-message-room", text: message.roomName })
          : null,
        element("time", { text: formatMessageTime(message.sentAt) }),
      );
      const bubble = element("div", { className: "kl-message-bubble" }, body, meta);
      const row = element("div", { className: "kl-message-row" }, bubble);
      row.dataset.direction = message.direction;
      this.#messages.append(row);
    }
    requestAnimationFrame(() => {
      this.#messages.scrollTop = this.#messages.scrollHeight;
    });
  }

  async #send(): Promise<void> {
    if (this.#activePeer === undefined) return;
    const message = this.#composer.value.trim();
    if (!message) return;

    let sent = false;
    try {
      const event = this.adapter.sendBeep(
        this.#activePeer,
        message,
        this.#includeRoom.checked,
      );
      sent = true;
      await this.service.capture(event, true);
      this.#composer.value = "";
      await this.service.setDraft(this.#activePeer, this.#activeName, "");
      this.#resizeComposer();
      this.#updateCounter();
      await this.onMessage(this.#activePeer, false);
      this.#composer.focus();
    } catch (error) {
      this.#toast(
        sent
          ? "Beep was sent, but KikiLink could not save it to local history."
          : error instanceof Error
            ? error.message
            : "Unable to send Beep",
        "error",
      );
    }
  }

  async #togglePin(): Promise<void> {
    if (this.#activePeer === undefined) return;
    const pinned = await this.service.togglePinned(this.#activePeer);
    this.#pinButton.textContent = pinned ? "◆" : "◇";
    this.#pinButton.title = pinned ? "Unpin conversation" : "Pin conversation";
    await this.#renderConversations();
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
      const button = element(
        "button",
        { className: "kl-contact", type: "button" },
        element("div", { className: "kl-avatar", text: avatarText(contact.memberName) }),
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
      .replaceAll("{name}", this.#activeName)
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
      text: "×",
      title: "Remove action",
      ariaLabel: "Remove quick action",
    });
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

  #renderActivityEditor(activities: RoomActivity[]): void {
    this.#activitiesEditor.replaceChildren();
    for (const activity of activities) this.#addActivityEditorRow(activity);
  }

  #addActivityEditorRow(activity: RoomActivity = { label: "", template: "" }): void {
    if (this.#activitiesEditor.childElementCount >= 20) {
      this.#toast("You can keep up to 20 room activities.", "error");
      return;
    }

    const label = element("input", { className: "kl-action-label" }) as HTMLInputElement;
    label.placeholder = "Label";
    label.maxLength = 32;
    label.value = activity.label;
    label.dataset.field = "label";
    const template = element("input", { className: "kl-action-template" }) as HTMLInputElement;
    template.placeholder = "Room emote text";
    template.maxLength = 500;
    template.value = activity.template;
    template.dataset.field = "template";
    const remove = element("button", {
      className: "kl-icon-button kl-remove-action",
      type: "button",
      text: "×",
      title: "Remove activity",
      ariaLabel: "Remove room activity",
    });
    const row = element(
      "div",
      { className: "kl-action-editor-row kl-activity-editor-row" },
      label,
      template,
      remove,
    );
    remove.addEventListener("click", () => row.remove());
    this.#activitiesEditor.append(row);
    if (!activity.label && !activity.template) label.focus();
  }

  #readActivityEditor(): RoomActivity[] {
    return [...this.#activitiesEditor.querySelectorAll<HTMLElement>(".kl-activity-editor-row")]
      .map((row) => ({
        label: row.querySelector<HTMLInputElement>('[data-field="label"]')?.value.trim() ?? "",
        template:
          row.querySelector<HTMLInputElement>('[data-field="template"]')?.value.trim() ?? "",
      }))
      .filter((activity) => activity.label && activity.template);
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
    this.#retentionInput.value = settings.linkChat.retentionDays.toString();
    this.#renderQuickActionEditor(settings.linkChat.quickActions);
    this.#rosterEnabledToggle.checked = settings.linkRoster.enabled;
    this.#rosterTrackingToggle.checked = settings.linkRoster.trackEncounters;
    this.#activitiesToggle.checked = settings.linkActivities.enabled;
    this.#renderActivityEditor(settings.linkActivities.activities);
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
    const currentSettings = this.settings.get();
    const launcherSide = this.#launcherSideSelect.value === "left" ? "left" : "right";
    const settings = this.settings.update((draft) => {
      draft.ui.theme =
        this.#themeSelect.value === "light" || this.#themeSelect.value === "system"
          ? this.#themeSelect.value
          : "dark";
      draft.ui.accent = this.#accentInput.value;
      draft.ui.density = this.#densitySelect.value === "compact" ? "compact" : "comfortable";
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
      draft.ui.reducedMotion = this.#reducedMotionToggle.checked;
      draft.ui.settingsSection = this.#settingsSection;
      draft.linkChat.saveHistory = this.#historyToggle.checked;
      draft.linkChat.quickActions = this.#readQuickActionEditor();
      draft.linkRoster.enabled = this.#rosterEnabledToggle.checked;
      draft.linkRoster.trackEncounters = this.#rosterTrackingToggle.checked;
      draft.linkActivities.enabled = this.#activitiesToggle.checked;
      draft.linkActivities.activities = this.#readActivityEditor();
      if (Number.isInteger(retentionDays)) draft.linkChat.retentionDays = retentionDays;
    });
    this.#applyTheme(settings);
    this.#renderQuickActions();
    this.#renderHomeStatus();
    void this.#renderHome();
    this.#showWorkspace(this.#availableWorkspace(this.#settingsReturnView, settings));
    void this.service.prune();
    this.#toast("Settings saved.");
  }

  #resetLauncherPosition(): void {
    const settings = this.settings.update((draft) => {
      draft.ui.launcherPosition = null;
    });
    this.#applyTheme(settings);
    this.#toast("Launcher returned to its default corner.");
  }

  async #clearHistory(): Promise<void> {
    if (!window.confirm("Clear all KikiLink Beep history and conversation drafts?")) return;
    await this.service.clearHistory();
    this.#activePeer = undefined;
    this.#activeName = "";
    this.#chat.hidden = true;
    this.#empty.hidden = false;
    this.#panel.dataset.mobileView = "list";
    await this.refresh();
    this.#toast("LinkChat history cleared.");
  }

  #clearPeople(): void {
    if (!window.confirm("Clear all KikiLink player notes, tags, favorites, and encounter history?")) {
      return;
    }
    this.roster.clear();
    this.#selectedRosterMember = undefined;
    this.#notebookDirty = false;
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
      text: "×",
      title: "Dismiss message",
      ariaLabel: "Dismiss message",
      onClick: () => {
        if (this.#toastTimer !== undefined) clearTimeout(this.#toastTimer);
        this.#toastTimer = undefined;
        toast.remove();
      },
    });
    toast.append(dismiss);
    const surface = this.#newChatDialog.open ? this.#newChatDialog : this.#panel;
    surface.append(toast);
    if (kind === "info") {
      this.#toastTimer = setTimeout(() => {
        toast.remove();
        this.#toastTimer = undefined;
      }, 5000);
    }
  }
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
      detail: "Theme, accent, spacing, text size, Home style, and motion",
      keywords: "light dark system color colour guided focused density font scale reduced motion",
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
      detail: "History, retention, and Quick Actions",
      keywords: "beep messages save storage days clear wave hug boop template",
    },
    {
      section: "players",
      title: "Players & notebook",
      detail: "Roster, encounters, notes, favorites, and tags",
      keywords: "people linkroster tracking private data clear whisper profile",
    },
    {
      section: "activities",
      title: "Activities & templates",
      detail: "Activity Studio and reusable room emotes",
      keywords: "linkactivities action roleplay target source member edit enable",
    },
  ];
  return definitions.map((definition, index) => ({
    id: `setting-${definition.section}`,
    kind: "setting",
    icon: "⚙",
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
