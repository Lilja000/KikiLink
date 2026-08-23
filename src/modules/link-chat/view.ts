import type { BCAdapter } from "../../bc/adapter";
import type {
  BCConnectionState,
  ConversationMeta,
  KikiLinkSettings,
  QuickAction,
} from "../../core/types";
import type { SettingsStore } from "../../core/settings";
import { debounce, element } from "../../utils/dom";
import type { ChatService } from "./chat-service";
import { LINK_CHAT_STYLES } from "./styles";
import KIKILINK_EMBLEM_DATA_URL from "../../../design/references/3929.png";

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
    ariaLabel: "KikiLink Beep chat",
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
  readonly #settingsDialog = element("dialog", { className: "kl-dialog" });
  readonly #historyToggle = element("input") as HTMLInputElement;
  readonly #retentionInput = element("input", { className: "kl-number-input" }) as HTMLInputElement;
  readonly #saveSettingsButton = element("button", {
    className: "kl-text-button kl-text-button--primary",
    type: "button",
    text: "Save",
  });
  readonly #themeSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #launcherSideSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #reducedMotionToggle = element("input") as HTMLInputElement;
  readonly #quickActionsEditor = element("div", { className: "kl-action-editor" });
  readonly #newChatDialog = element("dialog", { className: "kl-dialog kl-new-chat-dialog" });
  readonly #newChatQuery = element("input", { className: "kl-search kl-new-chat-query" }) as HTMLInputElement;
  readonly #newChatResults = element("div", { className: "kl-contact-results" });
  readonly #backButton = element("button", {
    className: "kl-icon-button kl-back",
    type: "button",
    text: "‹",
    title: "Back to conversations",
    ariaLabel: "Back to conversations",
  });
  #activePeer: number | undefined;
  #activeName = "";
  #mounted = false;
  #connectionState: BCConnectionState = "connecting";
  #toastTimer: ReturnType<typeof setTimeout> | undefined;

  readonly #saveDraft = debounce((peerNumber: number, peerName: string, value: string) => {
    void this.service.setDraft(peerNumber, peerName, value);
  }, 250);

  constructor(
    private readonly adapter: BCAdapter,
    private readonly service: ChatService,
    private readonly settings: SettingsStore,
    private readonly version: string,
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
    this.#buildSettingsDialog();
    this.#buildNewChatDialog();
    this.#shadow.append(
      style,
      this.#launcher,
      this.#panel,
      this.#settingsDialog,
      this.#newChatDialog,
    );
    document.body.append(this.#host);

    void this.refresh();
  }

  destroy(): void {
    if (this.#toastTimer !== undefined) clearTimeout(this.#toastTimer);
    this.#settingsDialog.close();
    this.#newChatDialog.close();
    this.#host.remove();
    this.#mounted = false;
  }

  isActiveConversation(peerNumber: number): boolean {
    return !this.#panel.hidden && this.#activePeer === peerNumber;
  }

  setConnectionState(state: BCConnectionState, message?: string): void {
    this.#connectionState = state;
    this.#connection.dataset.state = state;
    this.#connectionText.textContent =
      state === "ready" ? "Connected" : state === "error" ? "Connection error" : "Connecting";
    this.#connection.title = message ?? this.#connectionText.textContent ?? "";
    this.#sendButton.disabled = state !== "ready";
    this.#composer.placeholder = state === "ready" ? "Write a Beep…" : "Connecting to Bondage Club…";
    if (this.#newChatDialog.open) this.#renderKnownContacts();
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
    this.#panel.hidden = false;
    this.#launcher.setAttribute("aria-expanded", "true");
    await this.refresh();
  }

  close(): void {
    this.#panel.hidden = true;
    this.#launcher.setAttribute("aria-expanded", "false");
  }

  async openChat(memberNumber: number, memberName?: string): Promise<void> {
    const name = memberName?.trim() || this.adapter.getMemberName(memberNumber);
    await this.service.ensureConversation(memberNumber, name);
    await this.open();
    await this.#selectConversation(memberNumber, name);
  }

  async refresh(): Promise<void> {
    await Promise.all([this.#renderConversations(), this.#updateUnreadBadge()]);
  }

  #buildLauncher(): void {
    this.#badge.hidden = true;
    this.#launcher.append(this.#emblem("kl-launcher-emblem"), this.#badge);
    this.#launcher.setAttribute("aria-expanded", "false");
    this.#launcher.addEventListener("click", () => {
      if (this.#panel.hidden) void this.open();
      else this.close();
    });
  }

  #buildPanel(): void {
    this.#panel.hidden = true;
    this.#panel.dataset.mobileView = "list";
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
          `LinkChat · v${this.version}`,
          this.#connection,
        ),
      ),
    );
    const newChat = element("button", {
      className: "kl-icon-button",
      type: "button",
      text: "+",
      title: "New Beep chat",
      ariaLabel: "New Beep chat",
      onClick: () => this.#openNewChat(),
    });
    const settings = element("button", {
      className: "kl-icon-button",
      type: "button",
      text: "⚙",
      title: "LinkChat settings",
      ariaLabel: "LinkChat settings",
      onClick: () => this.#openSettings(),
    });
    const close = element("button", {
      className: "kl-icon-button",
      type: "button",
      text: "×",
      title: "Close KikiLink",
      ariaLabel: "Close KikiLink",
      onClick: () => this.close(),
    });
    const topbar = element("header", { className: "kl-topbar" }, brand, newChat, settings, close);

    this.#search.type = "search";
    this.#search.placeholder = "Search chats";
    this.#search.autocomplete = "off";
    this.#search.addEventListener("input", () => void this.#renderConversations());
    const sidebar = element(
      "aside",
      { className: "kl-sidebar" },
      element("div", { className: "kl-search-wrap" }, this.#search),
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
    const layout = element("div", { className: "kl-layout" }, sidebar, main);
    this.#panel.append(topbar, layout);
    this.#panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.#settingsDialog.open) this.close();
    });
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

  #buildSettingsDialog(): void {
    const close = element("button", {
      className: "kl-icon-button",
      type: "button",
      text: "×",
      title: "Close settings",
      ariaLabel: "Close settings",
      onClick: () => this.#settingsDialog.close(),
    });
    const header = element(
      "header",
      { className: "kl-dialog-header" },
      element("div", { className: "kl-dialog-title", text: "LinkChat settings" }),
      close,
    );

    this.#themeSelect.replaceChildren(
      selectOption("dark", "Dark lacquer"),
      selectOption("light", "Light paper"),
      selectOption("system", "Follow system"),
    );
    const theme = this.#settingRow(
      "Appearance",
      "Lacquer black, warm paper, or your system theme.",
      this.#themeSelect,
    );

    this.#launcherSideSelect.replaceChildren(
      selectOption("right", "Right"),
      selectOption("left", "Left"),
    );
    const launcherSide = this.#settingRow(
      "Launcher side",
      "Keep the emblem clear of your usual game controls.",
      this.#launcherSideSelect,
    );

    this.#reducedMotionToggle.type = "checkbox";
    const reducedMotionSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#reducedMotionToggle,
      element("span", { className: "kl-switch-track" }),
    );
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
    const history = this.#settingRow(
      "Save message history",
      "Stored only in this browser profile.",
      historySwitch,
    );

    this.#retentionInput.type = "number";
    this.#retentionInput.min = "1";
    this.#retentionInput.max = "3650";
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
    const appearanceSection = element(
      "section",
      { className: "kl-setting-section" },
      element("div", { className: "kl-setting-section-title", text: "Interface" }),
      theme,
      launcherSide,
      reducedMotion,
    );
    const privacySection = element(
      "section",
      { className: "kl-setting-section" },
      element("div", { className: "kl-setting-section-title", text: "History & privacy" }),
      history,
      retention,
      clearHistory,
    );
    const addQuickAction = element("button", {
      className: "kl-text-button kl-add-action",
      type: "button",
      text: "+ Add quick action",
      onClick: () => this.#addQuickActionEditorRow(),
    });
    const quickActionsSection = element(
      "section",
      { className: "kl-setting-section" },
      element("div", { className: "kl-setting-section-title", text: "Quick actions" }),
      element("div", {
        className: "kl-setting-help",
        text: "Insert reusable actions into a Beep. Variables: {name}, {member}, {me}.",
      }),
      this.#quickActionsEditor,
      addQuickAction,
    );
    const body = element(
      "div",
      { className: "kl-dialog-body" },
      appearanceSection,
      quickActionsSection,
      privacySection,
    );

    this.#saveSettingsButton.addEventListener("click", () => this.#saveSettings());
    const cancel = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Cancel",
      onClick: () => this.#settingsDialog.close(),
    });
    const actions = element("footer", { className: "kl-dialog-actions" }, cancel, this.#saveSettingsButton);
    this.#settingsDialog.append(header, body, actions);
  }

  #buildNewChatDialog(): void {
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
      element("div", { className: "kl-dialog-title", text: "New Beep chat" }),
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

  async #renderConversations(): Promise<void> {
    const query = this.#search.value.trim().toLocaleLowerCase();
    const conversations = (await this.service.listConversations()).filter((conversation) => {
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
    this.#activePeer = peerNumber;
    this.#activeName = peerName;
    this.#panel.dataset.mobileView = "chat";
    const conversation = await this.service.ensureConversation(peerNumber, peerName);
    await this.service.markRead(peerNumber);

    this.#empty.hidden = true;
    this.#chat.hidden = false;
    this.#chatAvatar.textContent = avatarText(peerName);
    this.#chatName.textContent = peerName;
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

    try {
      this.adapter.sendBeep(this.#activePeer, message, this.#includeRoom.checked);
      this.#composer.value = "";
      await this.service.setDraft(this.#activePeer, this.#activeName, "");
      this.#resizeComposer();
      this.#updateCounter();
      this.#composer.focus();
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "Unable to send Beep", "error");
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

  #openSettings(): void {
    const settings = this.settings.get();
    this.#themeSelect.value = settings.ui.theme;
    this.#launcherSideSelect.value = settings.ui.launcherSide;
    this.#reducedMotionToggle.checked = settings.ui.reducedMotion;
    this.#historyToggle.checked = settings.linkChat.saveHistory;
    this.#retentionInput.value = settings.linkChat.retentionDays.toString();
    this.#renderQuickActionEditor(settings.linkChat.quickActions);
    if (!this.#settingsDialog.open) this.#settingsDialog.showModal();
  }

  #saveSettings(): void {
    const retentionDays = Number(this.#retentionInput.value);
    const settings = this.settings.update((draft) => {
      draft.ui.theme =
        this.#themeSelect.value === "light" || this.#themeSelect.value === "system"
          ? this.#themeSelect.value
          : "dark";
      draft.ui.launcherSide = this.#launcherSideSelect.value === "left" ? "left" : "right";
      draft.ui.reducedMotion = this.#reducedMotionToggle.checked;
      draft.linkChat.saveHistory = this.#historyToggle.checked;
      draft.linkChat.quickActions = this.#readQuickActionEditor();
      if (Number.isInteger(retentionDays)) draft.linkChat.retentionDays = retentionDays;
    });
    this.#applyTheme(settings);
    this.#renderQuickActions();
    this.#settingsDialog.close();
    void this.service.prune();
    this.#toast("Settings saved.");
  }

  async #clearHistory(): Promise<void> {
    if (!window.confirm("Clear all KikiLink Beep history and conversation drafts?")) return;
    await this.service.clearHistory();
    this.#activePeer = undefined;
    this.#activeName = "";
    this.#chat.hidden = true;
    this.#empty.hidden = false;
    this.#panel.dataset.mobileView = "list";
    this.#settingsDialog.close();
    await this.refresh();
    this.#toast("LinkChat history cleared.");
  }

  async #updateUnreadBadge(): Promise<void> {
    const unread = await this.service.totalUnread();
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
    this.#host.dataset.theme = settings.ui.theme;
    this.#host.dataset.reducedMotion = String(settings.ui.reducedMotion);
    this.#launcher.dataset.side = settings.ui.launcherSide;
    this.#panel.dataset.side = settings.ui.launcherSide;
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
    this.#shadow.querySelector(".kl-toast")?.remove();
    const toast = element("div", { className: "kl-toast", text: message });
    toast.dataset.kind = kind;
    const surface = this.#newChatDialog.open
      ? this.#newChatDialog
      : this.#settingsDialog.open
        ? this.#settingsDialog
        : this.#panel;
    surface.append(toast);
    this.#toastTimer = setTimeout(() => toast.remove(), 3200);
  }
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
