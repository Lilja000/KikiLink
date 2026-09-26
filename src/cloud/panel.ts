import { element } from "./dom";
import { kikiIcon } from "../modules/link-chat/icons";
import { bindClockText } from "../core/time-format";
import type { KikiLinkSettings } from "../core/types";
import type { KeyValueStorage } from "../core/settings";
import type { GroupConversation } from "../modules/link-chat/group-chat-service";
import { CloudClient, CloudError } from "./client";
import { CloudFeedView, type SocialFeatures } from "./feed-view";
import { SocialUI } from "./social-ui";
import { CloudGroupThread } from "./group-thread";
import { CloudGroupInbox } from "./group-inbox";
import { profileImportDraft, recordCloudMigration } from "./migration";
import type { PeoplePickerRequest } from "../modules/link-chat/people-picker";
import { reportForm } from "./report-form";
import { ContentDialog } from "../modules/link-chat/content-dialog";
import type {
  CloudGroup,
  CloudMessage,
  CloudMedia,
  CloudPage,
  CloudProfile,
} from "./types";

interface PanelOptions {
  choosePeople?(request: PeoplePickerRequest): void;
  readFeed?(id: number): void | Promise<void>;
  canReadFeed?(): boolean;
  settings(): KikiLinkSettings;
  ownName(): string;
  storage: KeyValueStorage;
  legacyGroups(): GroupConversation[];
  isBlocked(member: number): boolean;
  openProfile(member: number, name: string): void;
  openOwnProfile?(): void;
  openGroups?(): void;
  openFeed?(): void;
  openDirectChats?(): void;
  enterToSend?(): boolean;
  embeddedGroups?: boolean;
  groupSelection?(selected: boolean): void;
  groupsChanged?(): void;
  groupIncoming?(group: CloudGroup, message: CloudMessage): void;
  canReadGroup?(): boolean;
  relatedMembers?(): ReadonlySet<number>;
}
const safeColor = (value: string | undefined) =>
  value && /^#[0-9a-f]{6}$/iu.test(value) ? value : "";
export type CloudDestination = "feed" | "groups" | "profile";
type CloudTab = CloudDestination | "moderation";
interface SessionInfo { moderator: boolean; features?: SocialFeatures & { reportReasons?: boolean } }
interface CloudImageEntry { url: string; elements: Set<HTMLElement>; bytes: number; at: number; used: number; ready: Promise<void>; decoded: boolean }

/** Development-only social surface inside the existing KikiLink shell and theme. */
export class CloudPanel {
  readonly element = element("section", {
    className: "kl-feature-page kl-cloud",
    ariaLabel: "KikiLink Feed and groups",
  });
  readonly #status = element("div", { className: "kl-cloud-status" });
  readonly #body = element("div", { className: "kl-cloud-body" });
  readonly #tabs = element("div", { className: "kl-cloud-actions kl-cloud-tabs" });
  readonly #heading = element("h2", { text: "Feed" });
  readonly #ui: SocialUI;
  readonly #feedView: CloudFeedView;
  readonly #reportDialog = new ContentDialog();
  readonly inbox: CloudGroupInbox;
  #chatActive = false;
  #createGroup = false;
  #settingsGroup: string | undefined;
  #surfaces = new Map<CloudTab, { nodes: Node[]; tabs: Node[]; scroll: number }>();
  #completedTab: CloudTab | undefined;
  #groupUpdateTimer: ReturnType<typeof setTimeout> | undefined;
  #feedUpdateTimer: ReturnType<typeof setTimeout> | undefined;
  #feedUpdating = false;
  #feedDirty = false;
  #feedRetries = 0;
  readonly #resumeFeed = () => { if (document.visibilityState !== "hidden") this.#invalidateFeed(); };
  #tab: CloudTab = "feed";
  #renderToken = 0;
  #postNavigation = 0;
  #groupDrafts = new Map<string, { text: string; clientId: string }>();
  #group: CloudGroup | undefined;
  #urls = new Map<string, CloudImageEntry>();
  #urlBytes = 0;
  #imageVersion = 0;
  #observer: IntersectionObserver | undefined;
  #observedImages = new Map<HTMLElement, number>();
  #imageCleanupTimer: ReturnType<typeof setInterval> | undefined;
  #imageQueue: Array<() => Promise<void>> = [];
  #imageRetries = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  #imageActive = 0;
  #destroyed = false;
  #moderator = false;
  #sessionInfo: SessionInfo | undefined;
  #sessionTask: Promise<SessionInfo> | undefined;
  #refreshMessages: (() => Promise<void>) | undefined;
  #thread: CloudGroupThread | undefined;
  readonly #unsubscribe: () => void;

  constructor(
    readonly client: CloudClient,
    private readonly options: PanelOptions,
  ) {
    this.#ui = new SocialUI({ client, run: (action, button) => this.#run(action, button),
      image: (id, alt, className, passive) => this.#image(id, alt, className, undefined, passive),
      openProfile: options.openProfile, isBlocked: member => options.isBlocked(member) || (client.isProfileBlocked?.(member) ?? false) });
    this.inbox = new CloudGroupInbox(client, this.#ui, options.storage, {
      select: group => { this.#group = group; this.#createGroup = false; this.inbox.select(group.id);
        this.options.groupSelection?.(true); if (this.#tab === "groups") void this.#run(() => this.refresh()); },
      changed: () => options.groupsChanged?.(),
      incoming: (group, message) => {
        const reading = this.#group?.id === group.id && !this.element.hidden && this.#tab === "groups" &&
          document.visibilityState !== "hidden" && (this.options.canReadGroup?.() ?? true);
        if (!reading) this.options.groupIncoming?.(group, message);
      },
      inviteChanged: async () => { if (this.#tab === "groups" && !this.element.hidden) await this.refresh(); },
    });
    this.#feedView = new CloudFeedView(this.#ui, {
      openOwnProfile: () => options.openOwnProfile ? options.openOwnProfile() : this.setVisible(true, "profile"),
      openGroups: () => options.openGroups ? options.openGroups() : this.setVisible(true, "groups"),
      report: (container, type, id) => this.#report(container, type, id),
      relatedMembers: () => options.relatedMembers?.() ?? new Set(),
      canPin: () => this.#moderator,
      readFresh: id => options.readFeed?.(id),
      canRead: () => !this.element.hidden && this.#tab === "feed" && (options.canReadFeed?.() ?? true),
    });
    this.element.hidden = true;
    this.#status.setAttribute("role", "status");
    this.#status.setAttribute("aria-live", "polite");
    document.addEventListener("visibilitychange", this.#resumeFeed);
    this.#unsubscribe = client.subscribe((kind) => {
      if (kind === "receipts") {
        if (this.#thread && this.#tab === "groups" && !this.element.hidden)
          void this.#run(() => this.#thread?.refreshReceipts());
        return;
      }
      if (kind === "reports" || kind === "ready") {
        if (kind === "ready") void this.inbox.flushReceipts().catch(() => {});
        if (kind === "ready") this.#invalidateFeed();
        if (this.#moderator && this.#tab === "moderation" && !this.element.hidden) void this.#run(() => this.refresh());
        return;
      }
      if (kind.startsWith("profile:")) return;
      if (kind === "profiles-cleared") {
        this.#surfaces.clear(); this.#completedTab = undefined;
        this.#feedView.removeBlocked(); this.inbox.invalidate();
        return;
      }
      if (kind === "media-invalidated") { this.#releaseImages(); return; }
      if (kind === "connection") {
        if (!this.element.hidden && !client.connected)
          void this.#run(() => this.refresh());
        return;
      }
      if (kind === "session") {
        this.#reportDialog.close();
        this.#sessionInfo = undefined;
        this.#sessionTask = undefined;
        if (client.connected && this.#chatActive) { client.startEvents(); this.inbox.invalidate(); void this.#run(() => this.inbox.refresh()); }
      }
      if (kind === "session" && !client.connected) {
        this.#renderToken++;
        this.inbox.clear(); this.#surfaces.clear(); this.#completedTab = undefined;
        this.#thread?.stop(); this.#thread = undefined;
        this.#releaseImages();
        this.#group = undefined;
        this.#groupDrafts.clear();
        this.#feedView.clear();
        if (!this.element.hidden) void this.refresh();
      } else if (kind === "session" && !this.element.hidden) {
        client.startEvents();
        void this.#run(() => this.refresh());
      } else if (kind === "groups" || kind === "read" || kind === "ready") {
        this.inbox.invalidate();
        if (this.#groupUpdateTimer === undefined) this.#groupUpdateTimer = setTimeout(() => {
          this.#groupUpdateTimer = undefined;
          if (this.#destroyed) return;
          void this.#run(async () => {
            await this.inbox.refresh();
            if (this.#tab === "groups" && !this.element.hidden && this.#group) {
              const current = this.inbox.groups.find(g => g.id === this.#group?.id);
              if (current && (current.revision !== this.#group.revision || current.membershipVersion !== this.#group.membershipVersion)) {
                this.#group = current; await this.refresh();
              } else if (this.#refreshMessages) await this.#refreshMessages();
            }
          });
        }, 500);
      } else if (kind === "feed") this.#invalidateFeed();
    });
    this.element.append(
      element(
        "header",
        { className: "kl-cloud-bar" },
        this.#heading,
        element("small", { className: "kl-cloud-subtitle", text: "KikiLink" }),
      ),
      this.#tabs,
      this.#status,
      this.#body,
    );
  }
  #invalidateFeed(): void {
    this.#feedDirty = true; this.#feedRetries = 0; this.#queueFeedSync();
  }
  #queueFeedSync(delay = 350): void {
    if (!this.#feedDirty || this.#destroyed || this.#feedUpdating || this.#feedUpdateTimer !== undefined ||
        this.element.hidden || this.#tab !== "feed" || this.#completedTab !== "feed" ||
        !this.client.connected || document.visibilityState === "hidden") return;
    this.#feedUpdateTimer = setTimeout(() => {
      this.#feedUpdateTimer = undefined;
      if (this.#destroyed || this.element.hidden || this.#tab !== "feed" || !this.client.connected || document.visibilityState === "hidden") return;
      this.#feedDirty = false; this.#feedUpdating = true;
      void (async () => {
        let retryDelay = 350, failed = false;
        try { if (!await this.#feedView.sync()) this.#feedDirty = true; }
        catch {
          failed = true; this.#feedDirty = true; this.#feedRetries++;
          retryDelay = Math.max(5000, (this.client.retryDelay || 0) + 50);
        } finally {
          this.#feedUpdating = false;
          if (!failed || this.#feedRetries <= 2) this.#queueFeedSync(retryDelay);
        }
      })();
    }, delay);
  }
  async openGroup(id: string): Promise<void> {
    await this.inbox.refresh(true);
    const group = this.inbox.groups.find(g => g.id === id);
    if (!group) { this.#status.textContent = "This group is no longer available. Check invitations."; return; }
    this.#group = group; this.#tab = "groups"; this.options.groupSelection?.(true); await this.refresh();
  }
  async openReports(): Promise<void> { this.#tab = "moderation"; await this.refresh(); }
  async openPost(id: number, comment?: number): Promise<void> {
    const navigation = ++this.#postNavigation;
    this.#tab = "feed"; await this.refresh();
    if (navigation !== this.#postNavigation || this.#tab !== "feed" || this.#destroyed || this.element.hidden) return;
    await this.#feedView.openPost(id, comment);
  }
  setVisible(visible: boolean, destination?: CloudDestination, chatActive = false): void {
    if (this.#destroyed) return;
    if (!visible || (destination && destination !== this.#tab)) this.#postNavigation++;
    const previous = this.#tab, wasVisible = !this.element.hidden;
    if (wasVisible && this.#completedTab === previous) this.#surfaces.set(previous, {
      nodes: [...this.#body.childNodes], tabs: [...this.#tabs.childNodes], scroll: this.element.scrollTop,
    });
    this.#chatActive = chatActive;
    this.element.hidden = !visible;
    if (visible || chatActive) this.client.startEvents(); else this.client.stopEvents();
    if (chatActive && this.options.embeddedGroups) void this.#run(() => this.inbox.refresh());
    if (visible) {
      if (destination) this.#tab = destination;
      if (this.#tab === "profile" && this.options.openOwnProfile) {
        this.#tab = "feed";
        this.options.openOwnProfile();
      }
      this.element.dataset.surface = this.#tab === "groups" ? "groups" : "feed";
      if (this.#tab !== "groups") this.#thread?.pause();
      this.#heading.textContent = this.#tab === "groups" ? "Group chats" : this.#tab === "moderation" ? "Reports" : "Feed";
      const cached = this.#surfaces.get(this.#tab);
      if (cached && this.client.connected) {
        this.#renderToken++;
        this.#body.replaceChildren(...cached.nodes); this.#tabs.replaceChildren(...cached.tabs);
        this.element.scrollTop = cached.scroll; this.#completedTab = this.#tab;
        if (this.#tab === "groups") { this.#thread?.resume(); void this.#run(async () => { await this.inbox.refresh(); await this.#thread?.updates(); }); }
        else { this.#thread?.pause(); this.#feedView.observeFresh(); if (this.#tab === "feed") this.#invalidateFeed(); }
        return;
      }
      if (wasVisible && previous === this.#tab && this.#completedTab === this.#tab) return;
      void this.#run(() => this.refresh());
    } else {
      this.#thread?.pause();
      this.#renderToken++;
    }
  }
  get activeGroupId(): string | undefined { return this.#group?.id; }
  createGroup(): void {
    this.options.openGroups?.(); this.#createGroup = true; this.#group = undefined; this.inbox.select();
    this.options.groupSelection?.(true); if (this.#tab === "groups") void this.#run(() => this.refresh());
  }
  profileUpdated(profile: CloudProfile | undefined): void {
    if (!profile) return;
    this.client.rememberProfile?.(profile);
    this.#ui.refreshAuthor(profile);
    this.#feedView.profileUpdated(profile);
  }
  #button(
    label: string,
    action: () => Promise<unknown> | void,
  ): HTMLButtonElement {
    const button = element("button", {
      className: "kl-text-button",
      type: "button",
      text: label,
    });
    button.addEventListener("click", () => void this.#run(action, button));
    return button;
  }
  async #run(
    action: () => Promise<unknown> | void,
    button?: HTMLButtonElement,
  ): Promise<void> {
    if (this.#destroyed) return;
    if (button) button.disabled = true;
    this.#status.textContent = "";
    try {
      await action();
    } catch (error) {
      if (this.#destroyed) return;
      const code =
        error instanceof CloudError ? error.code : "cloud_request_failed";
      const explanations: Record<string, string> = {
        too_many_images: "Choose up to 4 images for one post.",
        image_size_or_type: "Use PNG, JPEG or WebP, up to 5 MiB each (2 MiB for an avatar).",
        clipboard_unavailable: "Select the text to copy it on this device.",
        verification_pending: "Connecting with your BC account…",
        verification_unavailable:
          "Cloud could not verify your account yet. You can stay here and try again.",
        authentication_required:
          "Connect with your current BC account to use Cloud.",
        session_expired:
          "Your Cloud session expired. Connect again; your server data is preserved.",
        cloud_temporarily_unavailable:
          "Cloud is temporarily unavailable. Your current draft is kept. BC and the existing KikiLink features remain available.",
        revision_conflict:
          "This content changed in another session. Refresh before saving again.",
        membership_changed:
          "The group membership changed. Refresh the group before sending; your draft is kept.",
        development_allowlist:
          "This BC account is not enabled for the private Cloud test.",
        rate_limited:
          "The request limit was reached. Please wait before retrying.",
        invalid_media: "That image cannot be attached to this content.",
        storage_quota: "Your Cloud image storage quota is full.",
        not_found: "This content is unavailable or you no longer have access.",
      };
      this.#status.textContent =
        explanations[code] ??
        `Cloud could not complete this action (${code.replace(/[^a-z_]/gu, "").slice(0, 60)}).`;
    } finally {
      if (button) button.disabled = false;
    }
  }
  async refresh(): Promise<void> {
    if (this.#destroyed || this.element.hidden) return;
    const operation = ++this.#renderToken;
    this.#surfaces.delete(this.#tab); this.#completedTab = undefined;
    if (this.#tab === "groups") { this.#thread?.stop(); this.#thread = undefined; this.#refreshMessages = undefined; }
    else if (this.#tab === "feed") this.#feedView.pause();
    this.element.dataset.surface = this.#tab === "groups" ? "groups" : "feed";
    this.#heading.textContent = this.#tab === "groups" ? "Group chats" : this.#tab === "moderation" ? "Reports" : "Feed";
    this.#tabs.replaceChildren();
    if (!this.client.connected) {
      this.#connection();
      return;
    }
    if (!this.#sessionInfo) {
      const task = this.#sessionTask ??= this.client.request<SessionInfo>("GET", "/v1/me");
      try {
        const info = await task;
        if (operation !== this.#renderToken || this.#destroyed || this.element.hidden) return;
        this.#sessionInfo = info;
        this.inbox.enableMessageReceipts(info.features?.messageReceipts === true);
      } finally { if (this.#sessionTask === task) this.#sessionTask = undefined; }
    }
    this.#moderator = this.#sessionInfo.moderator;
    if (!(this.#tab === "groups" && this.options.embeddedGroups)) {
    for (const [key, label] of [
      ["feed", "Feed"],
      ["groups", "Groups"],
      ["profile", "My profile"],
      ...(this.#moderator ? [["moderation", "Reports"]] : []),
    ] as Array<[CloudTab, string]>) {
      const button = this.#ui.button(label, async () => {
        if (key === "feed" && this.options.openFeed) { this.options.openFeed(); return; }
        if (key === "profile" && this.options.openOwnProfile) { this.options.openOwnProfile(); return; }
        if (key === "groups" && this.options.openGroups) { this.options.openGroups(); return; }
        this.#tab = key;
        this.#group = undefined;
        await this.refresh();
      });
      if (this.#tab === key) button.setAttribute("aria-current", "page");
      this.#tabs.append(button);
    }
    if (this.#tab === "groups" && this.options.openDirectChats && !this.options.embeddedGroups)
      this.#tabs.prepend(this.#ui.button("Direct chats", () => this.options.openDirectChats!(), "chat"));
    this.#tabs.append(this.#ui.menu("Account options", [
      this.#ui.button("Disconnect", () => this.client.logout(), "lock"),
      this.#ui.button("Sign out on all devices", () => this.client.logout(true), "lock"),
    ]));
    }
    if (this.#tab === "feed") await this.#feed(operation);
    else if (this.#tab === "groups") await this.#groups(operation);
    else if (this.#tab === "profile") await this.#profileEditor(operation);
    else await this.#reports(operation);
    if (operation === this.#renderToken) { this.#completedTab = this.#tab; this.#queueFeedSync(); }
  }
  #connection(): void {
    const card = element(
      "div",
      { className: "kl-cloud-card" },
      element("h3", { text: "Connect your BC identity" }),
      element("p", {
        text: "Cloud synchronizes your existing public profile, including supported avatar/banner images, and stores Feed content, accepted group membership, and group messages. Visible profiles can be found by Member Number across rooms. Messages use TLS and server encryption; they are not end-to-end encrypted.",
      }),
      element("p", {
        className: "kl-cloud-note",
        text: "Cloud connects with your logged-in BC account and can remember this browser for up to 30 days. Sign out to pause automatic connection. Your BC password, room history, native chats, Gallery and Music are not uploaded. Existing attachments stay in their chosen storage.",
      }),
      element("p", {
        className: "kl-cloud-note",
        text: "Group messages expire after 30 days (up to 5,000 per group). Reports and moderation records expire after 30 days, operational logs after 7 days, and encrypted backups after 14 days. Administrators can review reported content. Deletion takes effect in the API immediately; disconnected images are cleaned up within 24 hours plus a maintenance interval. Older backups may retain deleted content until expiry.",
      }),
    );
    if (["connecting", "verifying"].includes(this.client.connectionState)) {
      card.append(element("p", { text: "Connecting with your BC account…" }));
    } else {
      if (this.client.connectionState === "unavailable")
        card.append(
          element("p", {
            text:
              this.client.connectionError === "development_allowlist"
                ? "This BC account is not enabled for the private Cloud test."
                : "Cloud is temporarily unavailable. You can stay here and try again.",
          }),
        );
      card.append(
        this.#button("Connect with this BC account", async () => {
          await this.client.connect();
          if (!this.element.hidden) this.client.startEvents();
          await this.refresh();
        }),
      );
    }
    this.#body.replaceChildren(card);
  }
  #field(
    label: string,
    value = "",
    max = 1000,
    multiline = false,
  ): {
    label: HTMLLabelElement;
    input: HTMLInputElement | HTMLTextAreaElement;
  } {
    const input = multiline
      ? document.createElement("textarea")
      : document.createElement("input");
    input.value = value;
    input.maxLength = max;
    const node = element("label", {}, element("span", { text: label }), input);
    return { label: node, input };
  }
  #file(
    label: string,
    multiple = false,
  ): { label: HTMLLabelElement; input: HTMLInputElement } {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.multiple = multiple;
    return {
      label: element("label", {}, element("span", { text: label }), input),
      input,
    };
  }
  async #upload(file: File, kind: CloudMedia["kind"]): Promise<CloudMedia> {
    const max = kind === "avatar" ? 2 * 1024 ** 2 : 5 * 1024 ** 2;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > max
    )
      throw new CloudError("image_size_or_type");
    return this.client.request<CloudMedia>("POST", `/v1/media/${kind}`, file);
  }
  async #feed(_operation: number): Promise<void> {
    this.#body.replaceChildren(this.#feedView.element);
    await this.#feedView.render(this.#sessionInfo?.features);
  }

  #report(container: HTMLElement, type: string, id: string): void {
    if (this.#reportDialog.element.open) return;
    const root = container.getRootNode();
    (root instanceof ShadowRoot ? root : document.body).append(this.#reportDialog.element);
    this.#reportDialog.element.classList.add("kl-report-dialog");
    this.#reportDialog.element.querySelector("button")?.setAttribute("aria-label", "Close report");
    const form = reportForm(this.client, type, id, this.#sessionInfo?.features?.reportReasons === true,
      () => { this.#status.textContent = "Report submitted. Thank you."; }, () => this.#reportDialog.close());
    // The menu has already collapsed. Restore focus to its visible trigger when
    // the modal closes, not to the now-hidden Report action inside it.
    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    active?.closest("details")?.querySelector("summary")?.focus({ preventScroll: true });
    this.#reportDialog.show(`Report ${type}`, form);
    form.querySelector("input")?.focus({ preventScroll: true });
  }
  async #profileEditor(operation: number): Promise<void> {
    let current: CloudProfile | undefined;
    try {
      current = await this.client.profile(this.client.memberNumber, true);
    } catch (error) {
      if (!(error instanceof CloudError) || error.status !== 404) throw error;
    }
    if (operation !== this.#renderToken) return;
    const card = element("div", { className: "kl-cloud-card" }),
      name = this.#field(
        "Display name",
        current?.displayName ?? this.options.ownName(),
        80,
      ),
      bio = this.#field("Bio", current?.bio ?? "", 160, true);
    let customization: Partial<CloudProfile> = current ?? {};
    const avatar = this.#file("Cloud avatar · up to 2 MiB"),
      banner = this.#file("Cloud banner · up to 5 MiB");
    const visible = document.createElement("input");
    visible.type = "checkbox";
    visible.checked = current?.visible ?? true;
    card.append(
      element("h3", { text: "Your Cloud profile" }),
      name.label,
      bio.label,
      avatar.label,
      banner.label,
      element(
        "label",
        { className: "kl-cloud-check" },
        visible,
        "Visible to KikiLink Cloud users",
      ),
      this.#button("Copy existing profile details", () => {
        const imported = profileImportDraft(
          this.options.settings(),
          this.options.ownName(),
        );
        name.input.value = imported.displayName ?? "";
        bio.input.value = imported.bio ?? "";
        customization = imported;
        this.#status.textContent =
          "Profile text and decorations copied into this draft. Existing media and local settings are preserved; choose files above for Cloud images.";
      }),
      this.#button("Save Cloud profile", async () => {
        let avatarId = current?.avatarId ?? null,
          bannerId = current?.bannerId ?? null;
        if (avatar.input.files?.[0])
          avatarId = (await this.#upload(avatar.input.files[0], "avatar")).id;
        if (banner.input.files?.[0])
          bannerId = (await this.#upload(banner.input.files[0], "banner")).id;
        await this.client.request("PUT", "/v1/profiles/me", {
          displayName: name.input.value,
          bio: bio.input.value,
          avatarFrame: customization.avatarFrame ?? "none",
          profileStyle: customization.profileStyle ?? "classic",
          ...(customization.profileOutlineColor
            ? { profileOutlineColor: customization.profileOutlineColor }
            : {}),
          ...(customization.profileGradient
            ? { profileGradient: customization.profileGradient }
            : {}),
          avatarId,
          bannerId,
          visible: visible.checked,
          revision: current?.revision ?? 0,
        });
        await this.refresh();
      }),
      this.#button("Remove Cloud profile", async () => {
        await this.client.request("DELETE", "/v1/profiles/me");
        await this.refresh();
      }),
    );
    const lookup = this.#field("Find a profile by Member Number", "", 16);
    lookup.input.inputMode = "numeric";
    card.append(
      lookup.label,
      this.#button("Find profile", () => {
        const member = Number(lookup.input.value);
        if (!Number.isSafeInteger(member) || member <= 0)
          throw new CloudError("invalid_member_number");
        this.options.openProfile(member, `Member ${member}`);
      }),
    );
    const blocks = await this.client.request<{
      items: Array<{ memberNumber: number }>;
    }>("GET", "/v1/blocks");
    if (operation !== this.#renderToken) return;
    if (blocks.items.length) {
      const list = element(
        "div",
        { className: "kl-cloud-card" },
        element("h3", { text: "Blocked Cloud users" }),
      );
      for (const b of blocks.items)
        list.append(
          this.#button(`Unblock ${b.memberNumber}`, async () => {
            await this.client.request("DELETE", `/v1/blocks/${b.memberNumber}`);
            await this.refresh();
          }),
        );
      card.append(list);
    }
    this.#body.replaceChildren(card);
  }
  async profileCard(member: number): Promise<HTMLElement | undefined> {
    if (!this.client.connected || this.options.isBlocked(member)) return;
    let p: CloudProfile;
    try {
      p = await this.client.profile(member);
    } catch {
      return;
    }
    const card = element("section", {
      className: "kl-cloud-card kl-cloud-profile",
    });
    card.dataset.style = p.profileStyle;
    if (safeColor(p.profileOutlineColor))
      card.style.borderColor = p.profileOutlineColor!;
    if (
      p.profileGradient &&
      safeColor(p.profileGradient.start) &&
      safeColor(p.profileGradient.end)
    )
      card.style.background = `linear-gradient(${p.profileGradient.angle ?? 135}deg,${p.profileGradient.start},${p.profileGradient.end})`;
    if (p.bannerId)
      card.append(this.#image(p.bannerId, "Profile banner", "kl-cloud-banner"));
    const avatar = element("div", {
      className: "kl-avatar kl-addon-profile-avatar",
    });
    avatar.dataset.avatarFrame = p.avatarFrame;
    if (p.avatarId)
      avatar.append(
        this.#image(p.avatarId, "Profile avatar", "kl-cloud-avatar"),
      );
    else avatar.textContent = p.displayName.slice(0, 2);
    card.append(
      avatar,
      element("h3", { text: p.displayName }),
      element("small", {
        text: `KIKILINK PROFILE · #${p.memberNumber}`,
      }),
      element("p", { text: p.bio }),
    );
    if (member === this.client.memberNumber && this.options.openOwnProfile)
      card.append(this.#ui.button("Edit profile", () => this.options.openOwnProfile?.(), "edit"));
    if (member !== this.client.memberNumber)
      card.append(
        this.#button("Report profile", () =>
          this.#report(card, "profile", String(member)),
        ),
        this.#button("Block in Cloud", async () => {
          await this.client.request("PUT", `/v1/blocks/${member}`, {});
          card.replaceChildren(
            element("p", { text: "User blocked in Cloud." }),
          );
        }),
      );
    return card;
  }
  profileImage(id: string, kind: "avatar" | "banner"): HTMLElement {
    return this.#image(id, `Profile ${kind}`, kind === "avatar" ? "kl-unified-preview-image" : "kl-addon-profile-banner-image");
  }
  avatarImage(id: string, own = false): HTMLElement {
    return this.#image(id, "Profile avatar", "kl-social-avatar-image", undefined, true, own);
  }
  profileActions(member: number, card: HTMLElement): HTMLElement[] {
    if (member === this.client.memberNumber) return [];
    return [this.#ui.button("Report profile", () => this.#report(card, "profile", String(member)), "warning"),
      this.#ui.button("Block in Cloud", () => this.#ui.confirm(card, "Block this person's Cloud profile and content?", async () => {
        await this.client.request("PUT", `/v1/blocks/${member}`, {});
        this.#surfaces.clear(); this.#completedTab = undefined;
        card.replaceChildren(element("p", { text: "User blocked in Cloud." }));
      }, "Block"), "lock")];
  }
  async #groups(operation: number): Promise<void> {
    if (this.options.embeddedGroups) {
      await this.inbox.refresh();
      if (operation !== this.#renderToken) return;
      if (this.#group && !this.inbox.groups.some(g => g.id === this.#group?.id)) this.#group = undefined;
    }
    if (this.#group) {
      await this.#groupView(operation, this.#group.id);
      return;
    }
    const [groups, invitations] = this.options.embeddedGroups ? [{ items: this.inbox.groups }, { items: [] }] : await Promise.all([
      this.client.request<{ items: CloudGroup[] }>("GET", "/v1/groups"),
      this.client.request<{
        items: Array<{ id: string; title: string; owner: number }>;
      }>("GET", "/v1/group-invitations"),
    ]);
    if (operation !== this.#renderToken) return;
    const list = element("div", { className: "kl-group-list" });
    for (const invite of invitations.items) {
      if (this.options.isBlocked(invite.owner)) continue;
      list.append(
        element(
          "div",
          { className: "kl-cloud-card" },
          element("h3", { text: invite.title }),
          this.#ui.member(invite.owner),
          element("small", { text: "Invites you to join this group" }),
          this.#button("Accept invitation", async () => {
            await this.client.request(
              "POST",
              `/v1/groups/${invite.id}/accept`,
              {},
            );
            this.inbox.invalidate(); await this.refresh();
          }),
          this.#button("Decline", async () => {
            await this.client.request(
              "DELETE",
              `/v1/groups/${invite.id}/invitation`,
            );
            this.inbox.invalidate(); await this.refresh();
          }),
        ),
      );
    }
    const search = element("input", { type: "search", placeholder: "Find a group…", ariaLabel: "Find a group", maxLength: 60 });
    const tiles = element("div", { className: "kl-group-list" });
    for (const g of groups.items) {
      const tile = element("article", { className: "kl-cloud-card kl-group-tile" },
        element("span", { className: "kl-group-emblem", ariaHidden: "true" }, kikiIcon("users")),
        element("div", { className: "kl-group-tile-copy" }, element("h3", { text: g.title }),
          element("small", { text: `${g.members.filter(m => m.status === "active").length} members · Private group` })),
          this.#ui.button("Open chat", async () => {
            this.#group = g;
            this.inbox.invalidate(); await this.refresh();
          }, "chat"));
      tile.dataset.groupTitle = g.title.normalize("NFKC").toLocaleLowerCase(); tiles.append(tile);
    }
    const empty = element("p", { className: "kl-group-empty", text: groups.items.length ? "No group matches that name." : "Your people, one conversation. Create a group or accept an invitation to begin.", hidden: groups.items.length > 0 });
    search.addEventListener("input", () => {
      const query = search.value.trim().normalize("NFKC").toLocaleLowerCase();
      for (const tile of tiles.children) if (tile instanceof HTMLElement) tile.hidden = !tile.dataset.groupTitle?.includes(query);
      empty.hidden = [...tiles.children].some(tile => tile instanceof HTMLElement && !tile.hidden);
    });
    list.append(search, tiles, empty);
    const create = element("div", { className: "kl-cloud-card" }),
      title = this.#field("Group name", "", 60),
      members = this.#field(
        "Invite 2–4 verified Member Numbers, separated by commas",
        "",
        90,
      );
    members.label.hidden = !!this.options.choosePeople;
    create.append(
      element("h3", { text: "Start a group chat" }),
      title.label,
      members.label,
      this.#button("Create and invite", async () => {
        if (this.options.choosePeople) {
          this.options.choosePeople({ mode: "Create group", minimum: 2, maximum: 4, confirm: async values => {
            this.#group = await this.client.request<CloudGroup>("POST", "/v1/groups", { title: title.input.value, members: values });
            this.inbox.invalidate(); await this.refresh();
          } }); return;
        }
        const values = members.input.value
          .split(",")
          .map((n) => Number(n.trim()));
        if (
          values.some(
            (n) =>
              !Number.isSafeInteger(n) || n <= 0 || this.options.isBlocked(n),
          )
        )
          throw new CloudError("invalid_members");
        this.#group = await this.client.request<CloudGroup>(
          "POST",
          "/v1/groups",
          { title: title.input.value, members: values },
        );
        this.inbox.invalidate(); await this.refresh();
      }),
      element("p", {
        className: "kl-cloud-note",
        text: "Invited people accept with their verified Cloud identity. BC friendships and room locations are not required. Messages are retained for 30 days (up to 5,000 per group).",
      }),
    );
    const legacy = this.options
      .legacyGroups()
      .filter(
        (g) =>
          g.creatorNumber === this.client.memberNumber &&
          g.protocolVersion === 2,
      )
      .slice(0, 20);
    if (legacy.length) {
      create.append(
        element("h3", { text: "Bring an existing group to Cloud" }),
        element("p", {
          className: "kl-cloud-note",
          text: "Creates invitations for the same people. Original group and history stay intact. All members must first register with Cloud; their acceptance is required.",
        }),
      );
      for (const g of legacy)
        create.append(
          this.#button(`Prepare ${g.title}`, async () => {
            const numbers = g.memberNumbers.filter(
              (n) => n !== this.client.memberNumber,
            );
            if (numbers.some((n) => this.options.isBlocked(n)))
              throw new CloudError("blocked_member");
            const fresh = await this.client.request<CloudGroup>(
              "POST",
              "/v1/groups",
              { title: g.title, members: numbers, legacyId: g.groupId },
            );
            recordCloudMigration(
              this.options.storage,
              this.client.memberNumber,
              g.groupId,
              fresh.id,
            );
            this.#group = fresh;
            this.inbox.invalidate(); await this.refresh();
          }),
        );
    }
    create.className = "kl-group-create-content";
    const createPanel = element("details", { className: "kl-cloud-card kl-group-create" },
      element("summary", {}, kikiIcon("plus"), "New group"), create);
    if (this.options.embeddedGroups) {
      this.inbox.select();
      if (this.#createGroup) {
        createPanel.open = true;
        this.#body.replaceChildren(this.#ui.button("Back to groups", () => {
          this.#createGroup = false; this.options.groupSelection?.(false); void this.refresh();
        }, "back"), createPanel);
      } else this.#body.replaceChildren(element("div", { className: "kl-group-empty" },
        kikiIcon("users"), element("h3", { text: "Your group conversations" }),
        element("p", { text: "Choose a group from the list, or start a conversation with your people." }),
        this.#ui.button("Create group", () => this.createGroup(), "plus")));
    } else this.#body.replaceChildren(list, createPanel);
  }
  async #groupView(operation: number, groupId: string): Promise<void> {
    const g = await this.client.request<CloudGroup>(
      "GET",
      `/v1/groups/${groupId}`,
    );
    if (operation !== this.#renderToken) return;
    this.#group = g;
    const own = g.members.find(
        (m) => m.memberNumber === this.client.memberNumber,
      ),
      manage = own?.role === "owner" || own?.role === "admin";
    const online = element("span", { className: "kl-group-online", text: "" });
    const activeMembers = g.members.filter(m => m.status === "active");
    const members = element("div", { className: "kl-group-member-list" });
    const section = (title: string, ...content: Node[]) => element("section", { className: "kl-group-settings-section", ariaLabel: title }, element("h4", { text: title }), ...content);
    const identitySettings = section("Group identity");
    const memberSettings = section("Members & roles", members);
    const notifications = section("Notifications");
    const muted = element("input", { type: "checkbox", ariaLabel: "Mute this group" });
    muted.setAttribute("role", "switch"); muted.checked = this.inbox.isMuted(g.id);
    muted.addEventListener("change", () => { if (muted.checked !== this.inbox.isMuted(g.id)) this.inbox.toggleMuted(g.id); });
    notifications.append(element("label", { className: "kl-group-settings-toggle" }, element("span", { text: "Mute this group" }),
      element("span", { className: "kl-switch" }, muted, element("span", { className: "kl-switch-track" }))));
    const permissions = section("Permissions", element("p", { text: own?.role === "owner" ? "You own this group. Only you can change roles or transfer ownership." :
      own?.role === "admin" ? "You are an admin. You can edit the group, invite or remove members, and manage messages." : "You are a member. Owners and admins manage this group." }),
      element("p", { text: "Only owners and admins can pin messages. Members can delete their own messages." }));
    const destructive = section("Leave or delete"); destructive.classList.add("kl-group-settings-danger");
    const details = element("section", { className: "kl-group-management", hidden: this.#settingsGroup !== g.id, ariaLabel: "Group settings" },
      element("div", { className: "kl-group-management-heading" }, element("h3", { text: "Group settings" }),
        this.#ui.button("Close group settings", () => { details.hidden = true; this.#settingsGroup = undefined; gear.setAttribute("aria-expanded", "false"); gear.focus(); }, "close", "kl-social-icon-button")), identitySettings, memberSettings, notifications, permissions, destructive);
    const toggle = () => { details.hidden = !details.hidden; this.#settingsGroup = details.hidden ? undefined : g.id; gear.setAttribute("aria-expanded", String(!details.hidden)); };
    const avatar = element("span", { className: "kl-avatar kl-group-header-avatar", ariaHidden: "true" }, kikiIcon("users"));
    if (g.avatarId) avatar.replaceChildren(this.#image(g.avatarId, "Group avatar", "kl-social-avatar-image", undefined, true));
    const identity = this.#ui.button("Show group members", toggle, undefined, "kl-group-identity");
    identity.replaceChildren(avatar, element("span", { className: "kl-group-identity-copy" }, element("strong", { text: g.title }),
      element("span", { className: "kl-group-subtitle" }, `${activeMembers.length} members`, online)));
    const stack = element("div", { className: "kl-group-avatar-stack", ariaLabel: "Group members" });
    for (const member of activeMembers.slice(0, 3)) stack.append(this.#ui.member(member.memberNumber, undefined, toggle));
    if (activeMembers.length > 3) stack.append(this.#ui.button(`+${activeMembers.length - 3}`, toggle, undefined, "kl-group-avatar-more"));
    const gear = this.#ui.button("Group settings", toggle, "settings", "kl-social-icon-button kl-group-settings-button");
    gear.setAttribute("aria-expanded", String(!details.hidden));
    details.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.stopPropagation(); details.hidden = true; this.#settingsGroup = undefined; gear.setAttribute("aria-expanded", "false"); gear.focus(); }
    });
    const card = element("header", { className: "kl-group-header" },
      this.#ui.button("Back to groups", async () => {
        this.#group = undefined; this.#createGroup = false; this.#settingsGroup = undefined; this.inbox.select(); this.options.groupSelection?.(false);
        this.inbox.invalidate(); await this.refresh();
      }, "previous", "kl-social-icon-button kl-group-back"), identity, stack, gear);
    for (const m of g.members) {
      const row = element(
        "div",
        { className: "kl-group-member" },
        this.#ui.member(m.memberNumber),
        element("small", { text: `${m.role} · ${m.status}` }),
      );
      if (
        manage &&
        m.role !== "owner" && (own?.role === "owner" || m.role === "member") &&
        m.memberNumber !== this.client.memberNumber
      )
        row.append(
          this.#ui.button("Remove", () => this.#ui.confirm(row, `Remove #${m.memberNumber} from this group?`, async () => {
            await this.client.request(
              "DELETE",
              `/v1/groups/${g.id}/members/${m.memberNumber}`,
            );
            this.inbox.invalidate(); await this.refresh();
          }, "Remove"), "close"),
        );
      if (own?.role === "owner" && m.role !== "owner" && m.status === "active")
        row.append(
          this.#button(
            m.role === "admin" ? "Make member" : "Make admin",
            async () => {
              await this.client.request(
                "PUT",
                `/v1/groups/${g.id}/members/${m.memberNumber}/role`,
                { role: m.role === "admin" ? "member" : "admin" },
              );
              this.inbox.invalidate(); await this.refresh();
            },
          ),
          this.#ui.button("Transfer ownership", () => this.#ui.confirm(row, `Make #${m.memberNumber} the group owner?`, async () => {
            await this.client.request(
              "PUT",
              `/v1/groups/${g.id}/members/${m.memberNumber}/role`,
              { role: "owner" },
            );
            this.inbox.invalidate(); await this.refresh();
          }, "Transfer ownership")),
        );
      members.append(row);
    }
    if (manage && this.#sessionInfo?.features?.groupAvatar) {
      const file = element("input", { type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true });
      file.addEventListener("change", () => void this.#run(async () => {
        const image = file.files?.[0]; if (!image) return;
        if (!/^image\/(png|jpeg|webp)$/u.test(image.type) || image.size > 2 * 1024 ** 2) throw new CloudError("avatar_size_limit");
        const uploaded = await this.client.request<CloudMedia>("POST", "/v1/media/avatar", image);
        await this.client.request("PATCH", `/v1/groups/${g.id}`, { title: g.title, revision: g.revision, avatarId: uploaded.id });
        this.inbox.invalidate(); await this.refresh();
      }));
      identitySettings.append(element("div", { className: "kl-group-settings-actions" }, file,
        this.#ui.button("Change group avatar", () => file.click(), "image"),
        ...(g.avatarId ? [this.#ui.button("Remove avatar", async () => {
          await this.client.request("PATCH", `/v1/groups/${g.id}`, { title: g.title, revision: g.revision, avatarId: null });
          this.inbox.invalidate(); await this.refresh();
        }, "trash")] : [])));
    }
    if (manage) {
      const title = this.#field("Group name", g.title, 60);
      identitySettings.prepend(title.label);
      identitySettings.append(this.#ui.button("Save name", async () => {
        await this.client.request("PATCH", `/v1/groups/${g.id}`, { title: title.input.value.trim(), revision: g.revision });
        this.inbox.invalidate(); await this.refresh();
      }, "check"));
      if (this.options.choosePeople) {
        const add = this.#ui.button("Add members", () => this.options.choosePeople!({ mode: "Add members", maximum: Math.max(0, 5 - g.members.length),
          exclude: g.members.map(member => member.memberNumber), confirm: async members => {
            await this.client.request("POST", `/v1/groups/${g.id}/invitations`, { members });
            this.inbox.invalidate(); await this.refresh();
          } }), "group-add");
        add.disabled = g.members.length >= 5; memberSettings.append(add);
      } else {
      const invite = this.#field("Invite Member Number", "", 16); invite.input.inputMode = "numeric";
      memberSettings.append(element("div", { className: "kl-group-invite-row" }, invite.label,
        this.#ui.button("Invite", async () => {
          const memberNumber = Number(invite.input.value);
          if (this.options.isBlocked(memberNumber)) throw new CloudError("blocked_member");
          await this.client.request("POST", `/v1/groups/${g.id}/invitations`, { memberNumber });
          this.inbox.invalidate(); await this.refresh();
        }, "group-add")));
      }
    } else identitySettings.append(element("strong", { text: g.title }));
    destructive.append(this.#button(own?.role === "owner" ? "Delete group" : "Leave group",
      () => this.#ui.confirm(destructive, own?.role === "owner" ? "Delete this group and its conversation?" : "Leave this group?", async () => {
        await this.client.request("DELETE", own?.role === "owner" ? `/v1/groups/${g.id}` : `/v1/groups/${g.id}/members/${this.client.memberNumber}`);
        this.#group = undefined; this.inbox.invalidate(); await this.refresh();
      }, own?.role === "owner" ? "Delete group" : "Leave group")));
    if (!this.#groupDrafts.has(g.id)) this.#groupDrafts.set(g.id, { text: "", clientId: crypto.randomUUID() });
    const thread = new CloudGroupThread(this.#ui, g, this.#groupDrafts.get(g.id)!, {
      enterToSend: () => this.options.enterToSend?.() ?? false,
      messageChanges: this.#sessionInfo?.features?.messageChanges ?? false,
      groupLive: this.#sessionInfo?.features?.groupLive ?? false,
      groupPins: this.#sessionInfo?.features?.groupPins ?? false,
      messageReceipts: this.#sessionInfo?.features?.messageReceipts ?? false,
      liveChanged: live => {
        const count = live.members.filter(m => m.status !== "unavailable" && !this.options.isBlocked(m.memberNumber)).length;
        online.textContent = ` · ${count} online`;
      },
      membershipChanged: async () => {
        this.inbox.invalidate(); await this.inbox.refresh();
        this.#group = this.inbox.groups.find(group => group.id === g.id);
        if (!this.#group) this.options.groupSelection?.(false);
        await this.refresh();
      },
      observed: (messages, read) => this.inbox.observe(g.id, messages, read),
      acknowledgeReceipts: (deliveredIds, readIds) =>
        this.inbox.acknowledgeReceipts(g.id, g.conversationId, deliveredIds, readIds),
      draftChanged: text => this.inbox.draft(g.id, text),
      canRead: () => !this.element.hidden && this.#tab === "groups" && (this.options.canReadGroup?.() ?? true),
      readUntil: sequence => this.inbox.markRead(g.id, sequence),
      report: (row, id) => this.#report(row, "message", id),
    });
    this.#thread = thread;
    this.inbox.select(g.id);
    this.#body.replaceChildren(card, details, thread.element);
    await thread.loadOlder();
    if (operation === this.#renderToken) this.#refreshMessages = () => thread.updates();
  }
  async #reports(operation: number, cursor = 0, existing?: HTMLElement): Promise<void> {
    const page = await this.client.request<
      CloudPage<{
        id: number;
        target_type: string;
        target_id: string;
        reason: string;
        created_at: number;
        status: string;
      }>
    >("GET", `/v1/moderation/reports?limit=40&cursor=${cursor}`);
    if (operation !== this.#renderToken) return;
    const list = existing ?? element("div", { className: "kl-cloud-body" });
    list.querySelector(".kl-reports-more")?.remove();
    if (!existing) list.append(this.#button("Refresh reports", () => this.refresh()));
    for (const r of page.items) {
      const preview = element("div", {});
      const metadata = element("small");
      metadata.append(
        document.createTextNode(`${r.status} · `),
        bindClockText(element("time"), r.created_at, "numeric-date-time"),
        document.createTextNode(` · ${r.target_type} #${r.target_id}`),
      );
      list.append(
        element(
          "article",
          { className: "kl-cloud-card" },
          element("h3", { text: `Report #${r.id} · ${r.target_type}` }),
          metadata,
          element("p", { text: r.reason }),
          this.#button("Review reported content", async () => {
            let content;
            try { content = await this.client.request<{
              author: number;
              text: string;
              mediaIds: string[];
            }>("GET", `/v1/moderation/reports/${r.id}`); }
            catch (error) {
              if (error instanceof CloudError && error.status === 404) {
                preview.textContent = "The reported content is no longer available. The report can still be dismissed."; return;
              }
              throw error;
            }
            if (operation !== this.#renderToken) return;
            preview.replaceChildren(
              element("small", {
                text: `Reported content by #${content.author}`,
              }),
              element("p", { text: content.text }),
            );
            for (const asset of content.mediaIds)
              preview.append(
                this.#image(asset, "Reported image", "kl-cloud-image", r.id),
              );
          }),
          preview,
          this.#button("Remove reported content", async () => {
            await this.client.request("POST", "/v1/moderation/remove", {
              targetType: r.target_type,
              targetId: r.target_id,
              reason: "Removed after administrator report review",
            });
            await this.refresh();
          }),
          this.#button("Dismiss report", async () => {
            await this.client.request(
              "POST",
              `/v1/moderation/reports/${r.id}/dismiss`,
              {},
            );
            await this.refresh();
          }),
        ),
      );
    }
    if (!page.items.length && !existing)
      list.append(element("p", { text: "No open reports." }));
    if (page.nextCursor !== null) {
      const more = this.#button("Load more reports", () => this.#reports(operation, Number(page.nextCursor), list));
      more.classList.add("kl-reports-more"); list.append(more);
    }
    if (!existing) this.#body.replaceChildren(list);
  }
  #image(
    assetId: string,
    alt: string,
    className = "kl-cloud-image",
    reportId?: number,
    passive = false,
    own = false,
  ): HTMLElement {
    const wrapper = element("div", {}),
      img = element("img", { className, alt });
    const key = `${reportId ?? "profile"}:${assetId}`;
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    wrapper.className = passive ? "kl-social-avatar-media" : "kl-cloud-image-wrap";
    wrapper.dataset.state = "loading";
    const paint = (entry: CloudImageEntry) => {
      if (this.#urls.get(key) !== entry || this.#destroyed || !this.client.connected) return;
      entry.elements.add(wrapper); entry.used = Date.now();
      if (img.src !== entry.url) img.src = entry.url;
      wrapper.dataset.state = "ready"; wrapper.removeAttribute("aria-busy");
      wrapper.replaceChildren(img);
      wrapper.dispatchEvent(new Event("cloud-image-ready"));
      queueMicrotask(() => {
        for (const node of entry.elements) if (!this.#retainsImage(node)) entry.elements.delete(node);
      });
    };
    let loading: Promise<void> | undefined, retries = 0;
    const queue = () => {
      this.#imageQueue.push(async () => { try { await load(); } catch { /* A visible placeholder or explicit retry stays available. */ } });
      this.#pumpImages();
    };
    const load = async () => {
      if (loading) return loading;
      if (this.#destroyed || !this.#retainsImage(wrapper)) return;
      const version = this.#imageVersion;
      wrapper.dataset.state = "loading";
      delete wrapper.dataset.errorStatus;
      loading = (async () => {
      const blob = await this.client.media(assetId, reportId);
      if (version !== this.#imageVersion || this.#destroyed || !this.#retainsImage(wrapper)) return;
      let entry = this.#urls.get(key);
      if (!entry) {
        this.#pruneImages(blob.size);
        if (this.#urls.size >= 80 || this.#urlBytes + blob.size > 24 * 1024 ** 2) throw new CloudError("image_cache_full");
        const url = URL.createObjectURL(blob); img.src = url;
        const ready = typeof img.decode === "function" ? img.decode() : Promise.resolve();
        entry = { url, elements: new Set([wrapper]), bytes: blob.size, at: Date.now(), used: Date.now(), ready, decoded: false };
        this.#urls.set(key, entry); this.#urlBytes += blob.size;
      }
      try { await entry.ready; }
      catch (error) {
        if (this.#urls.get(key) === entry) { URL.revokeObjectURL(entry.url); this.#urls.delete(key); this.#urlBytes -= entry.bytes; }
        throw error;
      }
      entry.decoded = true;
      entry.at = Date.now();
      if (this.#retainsImage(wrapper)) paint(entry);
      })().catch(error => {
        if (version === this.#imageVersion) {
          wrapper.dataset.state = "error"; wrapper.removeAttribute("aria-busy");
          wrapper.dataset.errorStatus = String(error instanceof CloudError ? error.status : 0);
          wrapper.dispatchEvent(new Event("cloud-image-error"));
          // Small avatars have no Show button. Recover from a transient failure
          // without replacing their wrapper or repeatedly retrying denied media.
          const transient = !(error instanceof CloudError) || error.status === 0 || error.status >= 500;
          if (passive && transient && retries < 2 && this.client.connected && this.#retainsImage(wrapper)) {
            const delay = Math.max(retries++ === 0 ? 1000 : 5000, this.client.retryDelay + 50);
            const timer = setTimeout(() => {
              this.#imageRetries.delete(wrapper);
              if (!this.#destroyed && version === this.#imageVersion && this.#retainsImage(wrapper)) queue();
            }, delay);
            this.#imageRetries.set(wrapper, timer);
          }
        }
        throw error;
      }).finally(() => { loading = undefined; });
      return loading;
    };
    const reveal = this.#button(`Show ${alt.toLowerCase()}`, load);
    const preference =
      own ? "always" : this.options.settings().linkPresence.profileImagePreviews;
    if (preference !== "always") wrapper.dataset.state = "hidden";
    if (!passive) wrapper.append(reveal);
    if (preference === "never") {
      reveal.disabled = true;
      reveal.textContent = "Image hidden by your preview setting";
      return wrapper;
    }
    if (preference === "always") {
      const cached = this.#urls.get(key);
      if (cached?.decoded && reportId === undefined && Date.now() - cached.at < 300000 && this.client.connected) {
        paint(cached); return wrapper;
      }
      wrapper.setAttribute("aria-busy", "true");
      if (typeof IntersectionObserver === "function") {
        if (!this.#observer)
          this.#observer = new IntersectionObserver(
            (entries) => {
              for (const e of entries)
                if (e.isIntersecting) {
                  this.#observer?.unobserve(e.target);
                  this.#observedImages.delete(e.target as HTMLElement);
                  (e.target as HTMLElement).dispatchEvent(
                    new Event("cloud-visible"),
                  );
                }
            },
            { rootMargin: "150px" },
          );
        wrapper.addEventListener("cloud-visible", queue, { once: true });
        this.#observedImages.set(wrapper, Date.now());
        this.#observer.observe(wrapper);
        if (this.#imageCleanupTimer === undefined) this.#imageCleanupTimer = setInterval(() => {
          for (const [node, created] of this.#observedImages) {
            // Allow a newly built fragment to attach before treating it as discarded.
            if (Date.now() - created >= 1000 && !this.#retainsImage(node)) {
              this.#observer?.unobserve(node); this.#observedImages.delete(node);
            }
          }
          if (!this.#observedImages.size) {
            clearInterval(this.#imageCleanupTimer); this.#imageCleanupTimer = undefined;
          }
        }, 1000);
      } else setTimeout(queue, 0);
    }
    return wrapper;
  }
  #pruneImages(incoming: number): void {
    for (const [key, entry] of [...this.#urls].sort((a, b) => a[1].used - b[1].used)) {
      // Protect a just-created fragment until it has been attached to its surface.
      if (Date.now() - entry.used < 1000) continue;
      for (const node of entry.elements) if (!this.#retainsImage(node)) entry.elements.delete(node);
      if (entry.elements.size) continue;
      if (Date.now() - entry.at < 300000 && this.#urls.size < 80 && this.#urlBytes + incoming <= 24 * 1024 ** 2) continue;
      URL.revokeObjectURL(entry.url); this.#urls.delete(key); this.#urlBytes -= entry.bytes;
    }
  }
  #retainsImage(node: HTMLElement): boolean {
    return node.isConnected || this.#feedView.element.contains(node) || Boolean(this.#thread?.element.contains(node)) ||
      [...this.#surfaces.values()].some(surface => surface.nodes.some(root => root.contains(node)));
  }
  #pumpImages(): void {
    while (this.#imageActive < 3 && this.#imageQueue.length) {
      const next = this.#imageQueue.shift()!;
      this.#imageActive++;
      void next().finally(() => {
        this.#imageActive--;
        if (!this.#destroyed) this.#pumpImages();
      });
    }
  }
  #releaseImages(): void {
    this.#imageVersion++;
    for (const timer of this.#imageRetries.values()) clearTimeout(timer);
    this.#imageRetries.clear();
    for (const entry of this.#urls.values()) URL.revokeObjectURL(entry.url);
    this.#urls.clear();
    this.#urlBytes = 0;
  }
  destroy(): void {
    document.removeEventListener("visibilitychange", this.#resumeFeed);
    clearTimeout(this.#feedUpdateTimer);
    this.#reportDialog.destroy();
    this.#ui.destroy();
    clearTimeout(this.#groupUpdateTimer); this.inbox.destroy(); this.#surfaces.clear();
    this.#thread?.stop();
    this.#feedView.destroy();
    this.#destroyed = true;
    this.#renderToken++;
    this.#observer?.disconnect();
    this.#observedImages.clear();
    clearInterval(this.#imageCleanupTimer); this.#imageCleanupTimer = undefined;
    this.#imageQueue = [];
    this.#releaseImages();
    this.#groupDrafts.clear();
    this.#unsubscribe();
    this.client.destroy();
    this.element.remove();
  }
}
