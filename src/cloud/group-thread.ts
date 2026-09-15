import { element } from "./dom";
import { SocialUI } from "./social-ui";
import { GroupLiveView } from "./group-live";
import { CloudError } from "./client";
import { MessageInteraction } from "../modules/link-chat/message-interaction";
import { messageActions, copyMessageText, shouldSendMessage } from "../modules/link-chat/message-controls";
import { ReplyComposer, replyPreview } from "../modules/link-chat/reply-composer";
import { parseInlineReplyContext } from "../modules/link-chat/message-reply";
import { kikiIcon } from "../modules/link-chat/icons";
import type { CloudGroup, CloudMessage, CloudPage, CloudGroupLive } from "./types";

export class CloudGroupThread {
  readonly element = element("section", { className: "kl-group-thread", ariaLabel: "Group conversation" });
  readonly #list = element("div", { className: "kl-group-history", role: "log", ariaLabel: "Group messages" });
  #live: GroupLiveView | undefined;
  #version = 0;
  #active = true;
  #olderCursor = 0;
  #lastSequence = 0;
  #count = 0;
  #seen = new Set<string>();
  #loading = false;
  #updating = false;
  #sending = false;
  #updateAgain = false;
  #scroll: HTMLElement | null = null;
  readonly #onScroll = () => {
    if (!this.#browsingPin && this.#canRead() && this.#atBottom()) { this.options.readUntil?.(this.#lastSequence); this.#new.hidden = true; }
  };
  readonly #more: HTMLButtonElement;
  readonly #draft: HTMLTextAreaElement;
  readonly #send: HTMLButtonElement;
  readonly #new: HTMLButtonElement;
  readonly #controls: MessageInteraction;
  readonly #reply: ReplyComposer;
  readonly #messages = new WeakMap<HTMLElement, CloudMessage>();
  readonly #pin = element("button", { type: "button", className: "kl-group-pin-bar", hidden: true });
  readonly #pinRemove = element("button", { type: "button", className: "kl-social-icon-button kl-group-pin-remove", ariaLabel: "Unpin message", title: "Unpin message", hidden: true }, kikiIcon("close"));
  readonly #pinRow = element("div", { className: "kl-group-pin-row", hidden: true }, this.#pin, this.#pinRemove);
  readonly #pinStatus = element("p", { className: "kl-group-pin-status", role: "status", hidden: true });
  #browsingPin = false;
  #pinBusy = false;
  #pinProfile: number | undefined;
  #highlight: ReturnType<typeof setTimeout> | undefined;

  constructor(readonly ui: SocialUI, readonly group: CloudGroup,
    readonly draft: { text: string; clientId: string },
    readonly options: { enterToSend(): boolean; messageChanges?: boolean; groupLive?: boolean; groupPins?: boolean; liveChanged?(live: CloudGroupLive): void; membershipChanged(): Promise<void>; report(row: HTMLElement, id: string): void;
      observed?(messages: CloudMessage[], read: boolean): void; draftChanged?(text: string): void; canRead?(): boolean; readUntil?(sequence: number): void }) {
    if (options.groupLive) this.#live = new GroupLiveView(ui, group, live => options.liveChanged?.(live));
    this.#list.setAttribute("aria-live", "polite");
    this.#more = ui.button("Load earlier messages", () => this.loadOlder(), "previous", "kl-social-button kl-group-load");
    this.#draft = element("textarea", { className: "kl-group-input", value: draft.text, maxLength: 4000, ariaLabel: "Message this Cloud group", placeholder: `Message ${group.title}…` });
    this.#reply = new ReplyComposer(this.#draft, 4000);
    const count = element("span", { className: "kl-composer-count", text: `${draft.text.length} / 4000` });
    this.#draft.addEventListener("input", () => {
      draft.text = this.#reply.value; count.textContent = `${draft.text.length} / 4000`;
      options.draftChanged?.(draft.text); this.#live?.signal(this.#reply.hasContent);
      this.#send.disabled = !this.#reply.hasContent || this.#sending;
    });
    this.#draft.addEventListener("blur", () => this.#live?.signal(false));
    this.#send = ui.button("Send", () => this.send(), "send", "kl-social-button kl-social-primary");
    this.#send.disabled = !this.#reply.hasContent;
    this.#draft.addEventListener("keydown", event => {
      if (shouldSendMessage(event, options.enterToSend())) {
        event.preventDefault(); if (!this.#send.disabled) this.#send.click();
      }
    });
    this.#new = ui.button("New messages", () => this.#browsingPin ? this.#latest() : this.#list.lastElementChild?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }), "unread", "kl-social-button kl-group-new");
    this.#new.hidden = true;
    this.#list.prepend(this.#more);
    this.#pin.addEventListener("click", () => { void this.ui.options.run(() => this.#jumpToPin()); });
    this.#pinRemove.addEventListener("click", () => { void this.ui.options.run(() => this.#setPin(null)); });
    this.#renderPin();
    this.element.append(this.#pinRow, this.#pinStatus, this.#list, this.#new, ...(this.#live ? [this.#live.element] : []),
      element("div", { className: "kl-group-composer" }, this.#reply.element, this.#draft,
        element("div", { className: "kl-group-compose-actions" },
          element("small", { text: "Shift + Enter for a new line" }), count, this.#send)));
    this.#controls = new MessageInteraction(this.element, this.#list, row => this.#contextActions(row));
  }
  pause(): void { this.#version++; this.#active = false; this.#live?.pause(); this.#controls.close(); clearTimeout(this.#highlight); }
  resume(): void { this.#reply.load(this.draft.text); this.#draft.dispatchEvent(new Event("input")); this.#active = true; this.#live?.resume(); this.#onScroll(); }
  stop(): void { this.pause(); this.#controls.destroy(); this.#reply.destroy(); this.#live?.destroy(); this.#scroll?.removeEventListener("scroll", this.#onScroll); this.#scroll = null; }
  #canRead(): boolean { return this.#active && document.visibilityState !== "hidden" && (this.options.canRead?.() ?? true); }
  #atBottom(): boolean { return !this.#scroll || this.#scroll.scrollHeight - this.#scroll.scrollTop - this.#scroll.clientHeight < 180; }
  async loadOlder(): Promise<void> {
    if (this.#loading || !this.#active) return;
    const version = this.#version; this.#loading = true;
    try {
      const page = await this.ui.options.client.request<CloudPage<CloudMessage>>("GET", `/v1/conversations/${this.group.conversationId}/messages?limit=40&direction=backward&cursor=${this.#olderCursor}`);
      if (version !== this.#version) return;
      const fragment = document.createDocumentFragment();
      for (const message of page.items) {
        this.#lastSequence = Math.max(this.#lastSequence, message.sequence);
        if (this.ui.options.isBlocked(message.sender) || this.#seen.has(message.id)) continue;
        this.#seen.add(message.id); fragment.append(this.#row(message)); this.#count++;
      }
      const anchor = this.#list.querySelector<HTMLElement>("[data-message-id]");
      const top = anchor?.getBoundingClientRect().top;
      this.#more.after(fragment); this.#olderCursor = page.nextCursor ?? 0;
      const scroll = this.#list;
      if (!this.#scroll && scroll) { this.#scroll = scroll; scroll.addEventListener("scroll", this.#onScroll, { passive: true }); }
      if (anchor && top !== undefined && scroll) scroll.scrollTop += anchor.getBoundingClientRect().top - top;
      this.#more.hidden = page.nextCursor === null || this.#count >= 200;
      if (!this.#count) this.#list.append(element("p", { className: "kl-group-empty", text: "Say hello. This is the start of your conversation." }));
      if (!anchor) { this.#list.lastElementChild?.scrollIntoView?.({ block: "nearest" }); this.#live?.resume(); }
      this.options.observed?.(page.items, !this.#browsingPin && this.#canRead() && (!anchor || this.#atBottom()));
    } finally { this.#loading = false; }
  }
  async updates(): Promise<void> {
    if (!this.#active) return;
    if (this.#updating) { this.#updateAgain = true; return; }
    const version = this.#version; this.#updating = true;
    try {
      let fresh: CloudGroup;
      try { fresh = await this.ui.options.client.request<CloudGroup>("GET", `/v1/groups/${this.group.id}`); }
      catch (error) { if (error instanceof CloudError && error.status === 404 && version === this.#version) { await this.options.membershipChanged(); return; } throw error; }
      if (version !== this.#version) return;
      this.group.pinnedMessage = fresh.pinnedMessage ?? null; this.group.pinRevision = fresh.pinRevision ?? 0; this.#renderPin();
      if (fresh.membershipVersion !== this.group.membershipVersion || fresh.revision !== this.group.revision) { await this.options.membershipChanged(); return; }
      if (this.#browsingPin || this.#loading) return;
      const first = this.#list.querySelector<HTMLElement>("[data-sequence]");
      const known = this.options.messageChanges && first ? `&knownFrom=${first.dataset.sequence}` : "";
      const page = await this.ui.options.client.request<CloudPage<CloudMessage> & { removedIds?: string[] }>("GET", `/v1/conversations/${this.group.conversationId}/messages?limit=40&direction=forward&cursor=${this.#lastSequence}${known}`);
      if (version !== this.#version) return;
      const removed = new Set(page.removedIds ?? []);
      for (const row of this.#list.querySelectorAll<HTMLElement>("[data-message-id]")) if (removed.has(row.dataset.messageId!)) {
        this.#removeMessage(row);
      }
      const scroll = this.#list;
      const atBottom = !scroll || scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 180;
      for (const message of page.items) {
        this.#lastSequence = Math.max(this.#lastSequence, message.sequence);
        if (this.ui.options.isBlocked(message.sender)) continue;
        if (this.#seen.has(message.id)) continue;
        this.#list.querySelector(".kl-group-empty")?.remove();
        this.#seen.add(message.id); this.#lastSequence = Math.max(this.#lastSequence, message.sequence);
        this.#insert(message); this.#count++;
      }
      while (this.#list.querySelectorAll("[data-message-id]").length > 200) { const first = this.#list.querySelector("[data-message-id]")!; if (first instanceof HTMLElement) this.#seen.delete(first.dataset.messageId ?? ""); first.remove(); this.#count--; }
      this.#new.onclick = null;
      this.#new.hidden = atBottom && page.nextCursor === null;
      if (page.nextCursor !== null) { this.#new.hidden = false; this.#new.onclick = () => void this.ui.options.run(() => this.updates()); }
      if (atBottom) this.#list.lastElementChild?.scrollIntoView?.({ block: "nearest" });
      this.options.observed?.(page.items, this.#canRead() && atBottom);
    } finally {
      this.#updating = false;
      if (this.#updateAgain && this.#active) { this.#updateAgain = false; void this.ui.options.run(() => this.updates()); }
    }
  }
  async send(): Promise<void> {
    if (this.#sending || !this.#active || !this.#reply.hasContent) return;
    const version = this.#version, text = this.draft.text, clientId = this.draft.clientId;
    this.#live?.signal(false);
    this.#sending = true; this.#draft.disabled = true; this.#send.disabled = true;
    try {
      const message = await this.ui.options.client.request<CloudMessage>("POST", `/v1/conversations/${this.group.conversationId}/messages`, {
        text, clientId, membershipVersion: this.group.membershipVersion, keyVersion: this.group.keyVersion,
        schemaVersion: 1, encryption: "server-aes-256-gcm",
      });
      const unchanged = this.draft.text === text && this.draft.clientId === clientId;
      if (unchanged) { this.draft.text = ""; this.draft.clientId = crypto.randomUUID(); this.options.draftChanged?.(""); }
      if (unchanged && this.#reply.value === text) { this.#reply.load(""); this.#draft.dispatchEvent(new Event("input")); }
      if (version !== this.#version) return;
      if (!this.#seen.has(message.id)) { this.#list.querySelector(".kl-group-empty")?.remove(); this.#seen.add(message.id); this.#insert(message); this.#count++; }
      // Keep the receive cursor before this send: another user's intervening
      // messages must still be fetched even if the send response arrived first.
      await this.updates();
      this.#list.lastElementChild?.scrollIntoView?.({ block: "nearest" });
    } finally { this.#sending = false; this.#draft.disabled = false; this.#send.disabled = !this.#reply.hasContent; if (version === this.#version) this.#draft.focus({ preventScroll: true }); }
  }
  #insert(message: CloudMessage): void {
    const next = [...this.#list.children].find(node => node instanceof HTMLElement && Number(node.dataset.sequence) > message.sequence);
    this.#list.insertBefore(this.#row(message), next ?? null);
  }
  #row(message: CloudMessage): HTMLElement {
    if (this.ui.options.isBlocked(message.sender)) return element("div", { hidden: true });
    const author = this.ui.member(message.sender, message.createdAt);
    const content = element("div", { className: "kl-group-message-text" });
    const reply = message.text ? parseInlineReplyContext(message.text) : undefined;
    if (reply) content.append(replyPreview(reply));
    content.append(document.createTextNode(reply?.content ?? message.text ?? "Message removed"));
    const bubble = element("div", { className: "kl-group-message-bubble kl-message-bubble" }, content);
    const line = element("div", { className: "kl-message-line kl-group-message-line" }, bubble);
    const row = element("article", { className: "kl-group-message kl-message-interaction" }, author, line);
    const own = message.sender === this.ui.options.client.memberNumber;
    row.dataset.messageId = message.id; row.dataset.sequence = String(message.sequence); row.dataset.own = String(own);
    row.dataset.direction = line.dataset.direction = own ? "outgoing" : "incoming";
    this.#messages.set(row, message);
    if (message.text) {
      row.dataset.actionable = "true"; bubble.tabIndex = 0;
      const actions = messageActions(
        () => { void this.ui.options.run(async () => this.#replyTo(row)); },
        () => this.#copy(row),
        error => { void this.ui.options.run(() => Promise.reject(error)); },
      );
      line.append(actions);
    }
    return row;
  }
  #replyTo(row: HTMLElement): void {
    const message = this.#messages.get(row);
    if (!this.#active || !message?.text || !row.dataset.actionable || this.ui.options.isBlocked(message.sender)) return;
    const name = row.querySelector(".kl-social-name")?.textContent || `Member ${message.sender}`;
    this.#reply.replyTo(name, message.text); this.#controls.close();
  }
  async #copy(row: HTMLElement): Promise<void> {
    const message = this.#messages.get(row);
    if (!this.#active || !message?.text || !row.dataset.actionable || this.ui.options.isBlocked(message.sender)) return;
    await copyMessageText(message.text);
  }
  #quickActions(row: HTMLElement): HTMLElement[] {
    return [this.ui.button("Reply", () => this.#replyTo(row), "reply"),
      this.ui.button("Copy message", () => this.#copy(row), "copy")];
  }
  #contextActions(row: HTMLElement): HTMLElement[] {
    const message = this.#messages.get(row);
    if (!message?.text || !row.dataset.actionable || this.ui.options.isBlocked(message.sender)) return [];
    const own = this.group.members.find(m => m.memberNumber === this.ui.options.client.memberNumber);
    const actions = this.#quickActions(row);
    if (this.options.groupPins && (own?.role === "owner" || own?.role === "admin")) actions.push(
      this.ui.button(this.group.pinnedMessage?.id === message.id ? "Unpin message" : "Pin message", () => this.#setPin(this.group.pinnedMessage?.id === message.id ? null : message.id), "pin"));
    if (message.text && (message.sender === this.ui.options.client.memberNumber || own?.role === "owner" || own?.role === "admin")) actions.push(
      this.ui.button("Delete message", () => this.ui.confirm(row, "Delete this message?", async () => {
        await this.ui.options.client.request("DELETE", `/v1/conversations/${this.group.conversationId}/messages/${message.id}`);
        this.#removeMessage(row);
      }), "trash"));
    if (message.sender !== this.ui.options.client.memberNumber) actions.push(
      this.ui.button("Report", () => this.options.report(row, message.id), "warning"),
      this.ui.button("Block in Cloud", () => this.ui.confirm(row, "Block this person's Cloud profile and content?", async () => {
        await this.ui.options.client.request("PUT", `/v1/blocks/${message.sender}`, {});
        for (const node of this.#list.querySelectorAll<HTMLElement>(".kl-group-message")) {
          if (this.#messages.get(node)?.sender === message.sender) { this.#seen.delete(node.dataset.messageId!); node.remove(); this.#count--; }
        }
        this.#controls.close();
      }, "Block"), "lock"));
    return actions;
  }
  #removeMessage(row: HTMLElement): void {
    if (this.group.pinnedMessage?.id === row.dataset.messageId) { this.group.pinnedMessage = { ...this.group.pinnedMessage!, text: null }; this.#renderPin(); }
    row.querySelector(".kl-group-message-text")!.textContent = "Message removed";
    row.querySelector(".kl-message-side-actions")?.remove();
    row.querySelector(".kl-message-bubble")?.removeAttribute("tabindex");
    this.#messages.delete(row);
    delete row.dataset.actionable; this.#controls.close();
  }
  #renderPin(): void {
    const pin = this.group.pinnedMessage;
    this.#pin.hidden = !this.options.groupPins || !pin || this.ui.options.isBlocked(pin.sender);
    this.#pinRow.hidden = this.#pin.hidden;
    this.#pinRemove.hidden = true;
    if (this.#pin.hidden || !pin) { this.#pinStatus.hidden = true; return; }
    const own = this.group.members.find(member => member.memberNumber === this.ui.options.client.memberNumber);
    this.#pinRemove.hidden = !(own?.role === "owner" || own?.role === "admin");
    const profile = this.ui.options.client.peekProfile?.(pin.sender);
    if (!profile && this.#pinProfile !== pin.sender) {
      this.#pinProfile = pin.sender; const version = this.#version;
      void this.ui.options.client.profile(pin.sender).then(() => { if (this.#active && version === this.#version && this.group.pinnedMessage?.id === pin.id) this.#renderPin(); }).catch(() => {});
    }
    const author = profile?.displayName || `Member ${pin.sender}`;
    const excerpt = pin.text ? parseInlineReplyContext(pin.text)?.content ?? pin.text : "Message unavailable";
    this.#pin.replaceChildren(kikiIcon("pin"), element("span", { text: `Pinned message · ${author}: ${excerpt.replace(/\s+/gu, " ").slice(0, 160)}` }));
    this.#pin.title = "Go to pinned message";
  }
  async #setPin(messageId: string | null): Promise<void> {
    if (this.#pinBusy || !this.#active) return;
    const version = this.#version; this.#pinBusy = true; this.#pinRemove.disabled = true;
    try {
      const pin = await this.ui.options.client.request<Pick<CloudGroup, "pinnedMessage" | "pinRevision">>("PUT", `/v1/groups/${this.group.id}/pin`, { messageId, revision: this.group.pinRevision ?? 0 });
      if (version !== this.#version) return;
      Object.assign(this.group, pin); this.#renderPin(); this.#controls.close();
    } catch (error) {
      if (version === this.#version && error instanceof CloudError && error.status === 409) await this.updates();
      throw error;
    } finally { this.#pinBusy = false; this.#pinRemove.disabled = false; }
  }
  async #jumpToPin(): Promise<void> {
    const pin = this.group.pinnedMessage;
    if (!this.#active || !pin || this.ui.options.isBlocked(pin.sender) || this.#loading || this.#updating) return;
    if (!pin.text) { this.#pinStatus.textContent = "This pinned message is no longer available."; this.#pinStatus.hidden = false; return; }
    const version = this.#version;
    this.#loading = true; this.#pin.disabled = true;
    try {
      // Recheck access/deletion at navigation time, even if an old row remains cached.
      const original = await this.ui.options.client.request<CloudMessage>("GET", `/v1/conversations/${this.group.conversationId}/messages/${pin.id}`);
      if (version !== this.#version) return;
      if (!original.text || this.ui.options.isBlocked(original.sender)) throw new CloudError("message_unavailable", 404);
      let row = [...this.#list.querySelectorAll<HTMLElement>("[data-message-id]")].find(row => row.dataset.messageId === pin.id);
      if (!row) {
        const page = await this.ui.options.client.request<CloudPage<CloudMessage>>("GET", `/v1/conversations/${this.group.conversationId}/messages?limit=40&direction=backward&cursor=${original.sequence + 1}`);
        if (version !== this.#version) return;
        if (!page.items.some(item => item.id === pin.id && item.text)) throw new CloudError("message_unavailable", 404);
        this.#controls.close(); this.#list.replaceChildren(this.#more); this.#seen.clear(); this.#count = 0;
        for (const message of page.items) if (!this.ui.options.isBlocked(message.sender)) {
          this.#seen.add(message.id); this.#list.append(this.#row(message)); this.#count++;
        }
        this.#olderCursor = page.nextCursor ?? 0; this.#more.hidden = page.nextCursor === null;
        this.#browsingPin = true; this.#new.hidden = false; this.#new.textContent = "Back to latest"; this.#new.onclick = null;
        row = [...this.#list.querySelectorAll<HTMLElement>("[data-message-id]")].find(row => row.dataset.messageId === pin.id);
      }
      this.#pinStatus.hidden = true;
      row?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      if (row) {
        clearTimeout(this.#highlight);
        for (const old of this.#list.querySelectorAll<HTMLElement>("[data-highlight]")) delete old.dataset.highlight;
        row.dataset.highlight = "true";
        this.#highlight = setTimeout(() => { delete row.dataset.highlight; }, 1800);
      }
    } catch (error) {
      if (version !== this.#version) return;
      this.#pinStatus.textContent = error instanceof CloudError && error.status === 404 ? "This pinned message is no longer available." : "Could not load the pinned message. Try again.";
      this.#pinStatus.hidden = false;
    } finally { this.#loading = false; this.#pin.disabled = false; }
  }
  async #latest(): Promise<void> {
    if (this.#loading) return;
    const version = this.#version; this.#loading = true;
    try {
      const page = await this.ui.options.client.request<CloudPage<CloudMessage>>("GET", `/v1/conversations/${this.group.conversationId}/messages?limit=40&direction=backward&cursor=0`);
      if (version !== this.#version) return;
      this.#browsingPin = false; this.#olderCursor = page.nextCursor ?? 0; this.#seen.clear(); this.#count = 0;
      this.#controls.close(); this.#list.replaceChildren(this.#more); this.#new.hidden = true; this.#new.textContent = "New messages";
      for (const message of page.items) {
        this.#lastSequence = Math.max(this.#lastSequence, message.sequence);
        if (this.ui.options.isBlocked(message.sender)) continue;
        this.#seen.add(message.id); this.#list.append(this.#row(message)); this.#count++;
      }
      this.#more.hidden = page.nextCursor === null;
      this.#list.lastElementChild?.scrollIntoView?.({ block: "nearest" });
      this.options.observed?.(page.items, this.#canRead());
    } finally { this.#loading = false; }
  }
}
