import { markAvatarPresence } from "../modules/link-chat/avatar-presence";
import {confirmCloudBlock} from './account-control-ui';
import {AccountControlIntent, AccountControlGenerationError, AccountControlUnconfirmedError, reviewAccountControl, accountControlRead, accountControlPath} from './account-control-generation';
import {FeedContentError} from './feed-content-intent';
import {FeedInteractionError} from './feed-interaction-intent';
import {GroupCreationDraft,GroupCreationRecoveryError,type GroupCreationDestination} from './group-creation-intent';
import {groupCreationView} from './group-creation-view';
import type {GroupManagementDraft,GroupManagementTarget} from './group-management-intent';
import type {ReportSource} from './report-source';
import { element } from "./dom";
import { PlatformModerationPanel } from "./moderation-panel";
import { kikiIcon } from "../modules/link-chat/icons";
import type { MediaViewerItem } from "../modules/platform-shell/media-viewer";
import type { KikiLinkSettings } from "../core/types";
import type { KeyValueStorage } from "../core/settings";
import type { GroupConversation } from "../modules/link-chat/group-chat-service";
import { CloudClient, CloudError, mediaReportKey, type MediaReportScope } from "./client";
import { CloudFeedView, type SocialFeatures } from "./feed-view";
import { SocialUI } from "./social-ui";
import type {ArchiveTarget} from "../modules/link-chat/conversation-archive";
import { CloudGroupThread, groupArchiveDraft, type GroupDraft } from "./group-thread";
import { showGroupOptions } from './group-options-dialog';
import { CloudGroupInbox, type GroupOption, type GroupMuteScope } from "./group-inbox";
import { profileImportDraft } from "./migration";
import { groupMigrationView } from "./group-migration-view";
import type { PeoplePickerRequest } from "../modules/link-chat/people-picker";
import { reportForm } from "./report-form";
import { targetReportDialog } from "./target-report-dialog";
import { ContentDialog } from "../modules/link-chat/content-dialog";
import type {
  CloudGroup,
  CloudMessage,
  CloudMedia,
  CloudProfile,
} from "./types";

interface PanelOptions {
  platformPreview?: boolean;
  resetChatFilters?(): void;
  openGroupMute?(scope: GroupMuteScope, anchor: HTMLElement): void;
  openImageViewer?(items: () => MediaViewerItem[], id: string): void;
  closeImageViewer?(): void;
  choosePeople?(request: PeoplePickerRequest): void;
  readFeed?(id: number, recoveryGeneration?: string): void | Promise<void>;
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
  openUpcomingEvents?(anchor: HTMLButtonElement, current: () => boolean): void;
  openModeration?(): void;
  openSaved?(): void;
  openCommunity?(id: string): void;
  openDirectChats?(): void;
  openNewMessage?(): void;
  enterToSend?(): boolean;
  embeddedGroups?: boolean;
  groupSelection?(selected: boolean, returnGroup?: string): void;
  groupArchiveChanged?(archived:boolean):void;
  groupsChanged?(): void;
  mutedGroupMessage?(messageId: string): void;
  groupIncoming?(group: CloudGroup, message: CloudMessage): void;
  canReadGroup?(): boolean;
  relatedMembers?(): ReadonlySet<number>;
  inviteContacts?(): {memberNumber:number; memberName:string}[];
  memberPresence?(member:number): string | undefined;
}
const safeColor = (value: string | undefined) =>
  value && /^#[0-9a-f]{6}$/iu.test(value) ? value : "";
export type CloudDestination = "feed" | "saved" | "groups" | "profile";
type CloudTab = CloudDestination | "moderation";
interface SessionInfo { moderator: boolean; features?: SocialFeatures & { reportReasons?: boolean; communityDirectory?: boolean } }
interface CloudImageEntry { url: string; elements: Set<HTMLElement>; bytes: number; at: number; used: number; ready: Promise<void>; decoded: boolean; width?: number; height?: number }

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
  readonly #moderation: PlatformModerationPanel;
  readonly #ui: SocialUI;
  readonly #feedView: CloudFeedView;
  readonly #savedView: CloudFeedView | undefined;
  readonly #reportDialog = new ContentDialog();
  readonly #groupOptionDialog = new ContentDialog();
  #closeFeedReport: (() => void) | undefined;
  readonly inbox: CloudGroupInbox;
  get activeGroup(): CloudGroup | undefined {
    const active = this.#group;
    return active && this.inbox.groups.some(g => g.id === active.id && g.conversationId === active.conversationId) ? active : undefined;
  }
  clearGroupSelection(): void {
    if (!this.#group && !this.#createGroup) return;
    this.#groupNavigation++; this.#renderToken++; this.#groupOptionDialog.close(); this.#thread?.stop();
    this.#thread = undefined; this.#group = undefined; this.#groupTarget = undefined; this.#settingsGroup = undefined;
    this.#createGroup = false; this.#syncGroupMute = undefined; this.#refreshMessages = undefined;
    this.inbox.select(); this.#surfaces.delete('groups'); this.options.groupSelection?.(false);
    if (this.#tab === 'groups' && !this.element.hidden) void this.#run(() => this.refresh());
  }
  showActiveGroupMembers(anchor: HTMLElement): void {
    const group = this.activeGroup;
    if (group) this.#openGroupOption('members',group,anchor);
  }
  #openGroupOption(action: GroupOption, group: CloudGroup, anchor: HTMLElement): void {
    const navigation = this.#groupNavigation;
    const current = () => !this.#destroyed && !this.element.hidden && this.#tab === 'groups' && this.#groupNavigation === navigation;
    const root = this.element.getRootNode();
    if (!current() || !this.client.connected) return;
    (root instanceof ShadowRoot ? root : document.body).append(this.#groupOptionDialog.element);
    showGroupOptions(this.#groupOptionDialog, this.inbox, this.#ui, {
      action, group, anchor, current, canUploadAvatar: this.#sessionInfo?.features?.groupAvatar === true,
      contacts: () => this.options.inviteContacts?.() ?? [],
      presence: member => this.options.memberPresence?.(member),
      refresh: async removed => {
        if (!current()) return;
        if (removed && this.#group?.id === group.id) {
          this.#group = undefined; this.#groupTarget = undefined; this.#settingsGroup = undefined;
          this.inbox.select(); this.options.groupSelection?.(false);
        }
        this.inbox.invalidate(); await this.refresh();
        if (removed && current() && !anchor.isConnected) this.inbox.element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
      },
    });
  }
  isReadingGroup(id: string): boolean { return this.#group?.id === id && !!this.#thread?.isReading(); }
  #chatActive = false;
  #syncGroupMute: (() => void) | undefined;
  #createGroup = false;
  #creationDraft:GroupCreationDraft|undefined;
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
  #groupNavigation = 0;
  #groupTarget: { groupId: string; messageId: string } | undefined;
  #openingGroupMessage: object | undefined;
  #groupDrafts = new Map<string, GroupDraft>();
  #group: CloudGroup | undefined;
  #urls = new Map<string, CloudImageEntry>();
  #urlBytes = 0;
  #imageVersion = 0;
  #reportImageVersion = 0;
  readonly #viewerItems = new WeakMap<HTMLElement, MediaViewerItem>();
  #observer: IntersectionObserver | undefined;
  #observedImages = new Map<HTMLElement, number>();
  #imageCleanupTimer: ReturnType<typeof setInterval> | undefined;
  #imageQueue: Array<() => Promise<void>> = [];
  #imageRetries = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  #imageActive = 0;
  #destroyed = false;
  #moderator = false;
  #externalModeration: { current(): boolean; back(): void } | undefined;
  #sessionInfo: SessionInfo | undefined;
  #sessionTask: Promise<SessionInfo> | undefined;
  #refreshMessages: (() => Promise<void>) | undefined;
  #thread: CloudGroupThread | undefined;
  readonly #unsubscribe: () => void;

  async #toggleGroupArchive(group:CloudGroup,target:ArchiveTarget):Promise<void> {
    if(this.#destroyed)return;
    try {
    await this.inbox.readyForArchive();
    if(this.#destroyed)return;
    const archived=this.inbox.archive.archived(target);
    const draft=this.#groupDrafts.get(group.id);
    const snapshot=!archived&&draft?groupArchiveDraft(draft,target):undefined;
    this.inbox.setArchived(group,target,!archived,snapshot);
    if(this.#group?.id===group.id)this.#thread?.archiveChanged();
    else this.options.groupSelection?.(false);
    this.options.groupArchiveChanged?.(!archived);
    }catch(error){if(!this.#destroyed)this.#status.textContent=error instanceof Error?error.message:"The archive preference could not be saved. Your draft is kept.";}
  }

  constructor(
    readonly client: CloudClient,
    private readonly options: PanelOptions,
  ) {
    this.#moderation = new PlatformModerationPanel(client, {
      storage: options.storage,
      current: () => !this.#destroyed && (this.#externalModeration ? this.#externalModeration.current() : !this.element.hidden && this.#tab === 'moderation'),
      image: (id, report, generation) => this.#image(id, 'Reported image', 'kl-cloud-image', report, false, false, undefined, generation),
      releaseImages: () => this.#releaseReportImages(),
      backLabel: () => this.#externalModeration ? 'Back to moderation' : 'Back to Feed',
      back: () => { if (this.#externalModeration) this.#externalModeration.back(); else if (options.openFeed) options.openFeed(); else { this.#tab = 'feed'; void this.#run(() => this.refresh()); } },
    });
    this.#ui = new SocialUI({ client, run: (action, button) => this.#run(action, button),
      image: (id, alt, className, passive) => this.#image(id, alt, className, undefined, passive),
      openProfile: options.openProfile, isBlocked: member => options.isBlocked(member) || (client.isProfileBlocked?.(member) ?? false) });
    this.inbox = new CloudGroupInbox(client, this.#ui, options.storage, {
      retentionDays: () => options.settings().linkChat.retentionDays,
      platformPreview: options.platformPreview === true,
      resetFilters: () => options.resetChatFilters?.(),
      ...(options.platformPreview ? {openGroupOption:(action:GroupOption, group:CloudGroup, anchor:HTMLElement) => this.#openGroupOption(action,group,anchor)} : {}),
      ...(options.openGroupMute ? { openGroupMute: options.openGroupMute } : {}),
      createGroup: () => this.createGroup(),
      archiveGroup:(group,target)=>this.#toggleGroupArchive(group,target),
      select: group => { this.#groupNavigation++; this.#groupTarget = undefined; this.#group = group; this.#createGroup = false; this.inbox.select(group.id);
        this.options.groupSelection?.(true); if (this.#tab === "groups") void this.#run(() => this.refresh()); },
      changed: () => {
        if (this.inbox) this.#creationDraft?.observe(this.inbox.creationSource);
        if (this.#group && this.inbox.removedLocally(this.#group.id)) this.clearGroupSelection();
        this.#syncGroupMute?.(); options.groupsChanged?.();
      },
      mutedMessage: id => options.mutedGroupMessage?.(id),
      incoming: (group, message) => {
        const reading = this.isReadingGroup(group.id);
        if (!reading) this.options.groupIncoming?.(group, message);
      },
      inviteChanged: async () => { if (this.#tab === "groups" && !this.element.hidden) await this.refresh(); },
      recoveryChanged: () => {
        this.#groupOptionDialog.close();
        if(!this.#thread)return;
        this.#thread.stop();this.#thread=undefined;this.#refreshMessages=undefined;this.#groupTarget=undefined;this.#surfaces.delete('groups');
        if(this.#tab==='groups'&&!this.element.hidden)this.#body.replaceChildren(
          element('p',{className:'kl-empty-copy',text:'Cloud history changed. Your current draft is kept.'}),
          this.#ui.button('Read current group',()=>this.refresh(),'refresh'));
      },
    });
    const upcomingFrom = (tab: "feed" | "saved") => (anchor: HTMLButtonElement, surfaceCurrent: () => boolean) => {
      const current = () => this.#tab === tab && !this.#destroyed && !this.element.hidden
        && this.#body.contains(anchor) && surfaceCurrent();
      if (current()) options.openUpcomingEvents?.(anchor, current);
    };
    this.#feedView = new CloudFeedView(this.#ui, {
      platformPreview: options.platformPreview === true,
      ...(options.openCommunity ? { openCommunity: options.openCommunity } : {}),
      ...(options.openSaved ? { openSaved: options.openSaved } : {}),
      ...(options.openUpcomingEvents ? { openUpcomingEvents: upcomingFrom("feed") } : {}),
      openOwnProfile: () => options.openOwnProfile ? options.openOwnProfile() : this.setVisible(true, "profile"),
      openGroups: () => options.openGroups ? options.openGroups() : this.setVisible(true, "groups"),
      report: (container, type, id, source) => this.#report(container, type, id, source),
      relatedMembers: () => options.relatedMembers?.() ?? new Set(),
      canPin: () => this.#moderator,
      readFresh: (id, generation) => generation ? options.readFeed?.(id, generation) : options.readFeed?.(id),
      canRead: () => !this.element.hidden && this.#tab === "feed" && (options.canReadFeed?.() ?? true),
    });
    if (options.openSaved) this.#savedView = new CloudFeedView(this.#ui, {
      platformPreview: options.platformPreview === true,
      savedOnly: true,
      ...(options.openCommunity ? { openCommunity: options.openCommunity } : {}),
      ...(options.platformPreview ? { draftHost: this.#feedView } : {}),
      ...(options.openUpcomingEvents ? { openUpcomingEvents: upcomingFrom("saved") } : {}),
      relatedMembers: () => options.relatedMembers?.() ?? new Set(),
      openFeed: () => options.openFeed ? options.openFeed() : this.setVisible(true, "feed"),
      openOwnProfile: () => options.openOwnProfile?.(),
      openGroups: () => options.openGroups?.(),
      report: (container, type, id, source) => this.#report(container, type, id, source),
      canPin: () => this.#moderator,
      // Reading bookmarks must not advance the main Feed's unread cursor.
      canRead: () => false,
    });
    this.element.hidden = true;
    this.#status.setAttribute("role", "status");
    this.#status.setAttribute("aria-live", "polite");
    document.addEventListener("visibilitychange", this.#resumeFeed);
    this.#unsubscribe = client.subscribe((kind, cause) => {
      if (['session', 'disconnected', 'profiles-cleared'].includes(kind)) this.#moderation.hide();
      if (kind === "receipts") {
        if (this.#thread && this.#tab === "groups" && !this.element.hidden)
          void this.#run(() => this.#thread?.refreshReceipts());
        return;
      }
      if (kind === "reports" || kind === "ready") {
        if(this.#externalModeration?.current()) void this.#moderation.refresh();
        if (kind === "ready") void this.inbox.flushReceipts().catch(() => {});
        if (kind === "ready") this.#invalidateFeed();
        if (this.#moderator && this.#tab === "moderation" && !this.element.hidden) void this.#run(() => this.refresh());
        if (kind !== "ready") return;
      }
      if (kind.startsWith("profile:")) return;
      if (kind === "profiles-cleared") {
        // The paired ready event reconciles the displayed feed and thread in place.
        if (cause === "ready") return;
        this.#surfaces.clear(); this.#completedTab = undefined;
        this.#feedView.removeBlocked(); this.#savedView?.removeBlocked(); this.inbox.invalidate();
        return;
      }
      if (kind === "media-invalidated") { this.#releaseImages(); return; }
      if (kind === "connection") {
        if (!this.element.hidden && !client.connected)
          void this.#run(() => this.refresh());
        return;
      }
      if (kind === "session") {
        this.#groupNavigation++; this.#groupTarget = undefined;
        this.#reportDialog.close(); this.#groupOptionDialog.close();
        this.#closeFeedReport?.();
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
        this.#groupDrafts.clear();this.#creationDraft=undefined;
        this.#feedView.clear();
        this.#savedView?.clear();
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
  async prepareFeedDraftImport(owner:number) {
    if(this.#destroyed || this.client.memberNumber!==owner)throw new Error("The Feed account changed.");
    return this.#feedView.prepareDraftImport(owner);
  }
  #activeFeedView(): CloudFeedView | undefined {
    return this.#tab === "feed" ? this.#feedView : this.#tab === "saved" ? this.#savedView : undefined;
  }
  #queueFeedSync(delay = 350): void {
    if (!this.#feedDirty || this.#destroyed || this.#feedUpdating || this.#feedUpdateTimer !== undefined ||
        this.element.hidden || !this.#activeFeedView() || this.#completedTab !== this.#tab ||
        !this.client.connected || document.visibilityState === "hidden") return;
    this.#feedUpdateTimer = setTimeout(() => {
      this.#feedUpdateTimer = undefined;
      const view = this.#activeFeedView();
      if (this.#destroyed || this.element.hidden || !view || !this.client.connected || document.visibilityState === "hidden") return;
      this.#feedDirty = false; this.#feedUpdating = true;
      void (async () => {
        let retryDelay = 350, failed = false;
        try { if (!await view.sync()) this.#feedDirty = true; }
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
  async openGroupMessage(id: string, messageId: string): Promise<void> {
    const opening = {};
    this.#openingGroupMessage = opening; this.#thread?.pause();
    this.options.openGroups?.();
    try { await this.openGroup(id, messageId); }
    finally { if (this.#openingGroupMessage === opening) this.#openingGroupMessage = undefined; }
  }
  async openGroup(id: string, messageId?: string): Promise<void> {
    const navigation = ++this.#groupNavigation;
    const owner = this.client.memberNumber, origin = this.client.origin, source = this.inbox.managementSource;
    this.#groupTarget = messageId ? { groupId: id, messageId } : undefined;
    this.#renderToken++; this.#thread?.pause();
    await this.inbox.refresh(true);
    if (navigation !== this.#groupNavigation || this.#destroyed || this.element.hidden || this.#tab !== "groups") return;
    if (!this.client.connected || this.client.memberNumber !== owner || this.client.origin !== origin ||
      (source.required && source.generation !== this.inbox.managementSource.generation)) return;
    this.inbox.restoreRemovedGroup(id);
    const group = this.inbox.groups.find(g => g.id === id);
    if (!group) { this.#group = undefined; this.#groupTarget = undefined; this.#body.replaceChildren(); this.#status.textContent = "This group is no longer available. Check invitations."; return; }
    this.#group = group; this.#tab = "groups"; this.options.groupSelection?.(true); await this.refresh();
  }
  async showSettingsModeration(host: HTMLElement, current: () => boolean, back: () => void): Promise<void> {
    this.#moderation.hide(); this.#externalModeration = { current, back }; host.append(this.#moderation.element); await this.#moderation.show();
  }
  hideSettingsModeration(): void { if(this.#externalModeration) { this.#moderation.hide(); this.#externalModeration=undefined; } }
  async openReports(): Promise<void> { if(this.options.openModeration){this.options.openModeration();return;} this.#tab = "moderation"; await this.refresh(); }
  async openPost(id: number, comment?: number, recoveryGeneration?: string): Promise<void> {
    const navigation = ++this.#postNavigation;
    this.#tab = "feed"; await this.refresh();
    if (navigation !== this.#postNavigation || this.#tab !== "feed" || this.#destroyed || this.element.hidden) return;
    await this.#feedView.openPost(id, comment, recoveryGeneration);
  }
  #syncFeedShell(): void {
    const preview = this.options.platformPreview && this.client.connected && Boolean(this.#activeFeedView());
    this.element.toggleAttribute("data-platform-feed", preview);
  }
  setVisible(visible: boolean, destination?: CloudDestination, chatActive = false): void {
    if (this.#destroyed) return;
    if (destination === "saved" && !this.#savedView) destination = "feed";
    if (!visible || (destination && destination !== this.#tab)) { this.#postNavigation++; this.#groupNavigation++; this.#groupOptionDialog.close(); }
    const previous = this.#tab, wasVisible = !this.element.hidden;
    if (!visible || (destination && destination !== previous)) this.#activeFeedView()?.closeDialogs();
    if ((!visible || destination) && !this.#externalModeration) this.#moderation.hide();
    if (wasVisible && previous !== "moderation" && this.#completedTab === previous) this.#surfaces.set(previous, {
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
      this.element.dataset.surface = this.#tab === "groups" ? "groups" : this.#tab === "saved" ? "saved" : this.#tab === "moderation" ? "moderation" : "feed";
      this.#syncFeedShell();
      if (this.#tab !== "groups") this.#thread?.pause();
      this.#heading.textContent = this.#tab === "groups" ? "Group chats" : this.#tab === "moderation" ? "Reports" : this.#tab === "saved" ? "Saved" : "Feed";
      const cached = this.#surfaces.get(this.#tab);
      if (cached && this.client.connected) {
        this.#renderToken++;
        this.#body.replaceChildren(...cached.nodes); this.#tabs.replaceChildren(...cached.tabs);
        this.element.scrollTop = cached.scroll; this.#completedTab = this.#tab;
        if (this.#tab === "groups") { this.#thread?.resume(); void this.#run(async () => { await this.inbox.refresh(); await this.#thread?.updates(); }); }
        else {
          this.#thread?.pause();
          const feed = this.#activeFeedView();
          feed?.refreshContentSurface();
          feed?.observeFresh();
          if (feed) this.#invalidateFeed();
        }
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
    this.#groupNavigation++; this.#groupTarget = undefined;
    this.options.openGroups?.(); this.#createGroup = true; this.#group = undefined; this.inbox.select();
    this.options.groupSelection?.(true); if (this.#tab === "groups") void this.#run(() => this.refresh());
  }
  profileUpdated(profile: CloudProfile | undefined): void {
    if (!profile) return;
    this.client.rememberProfile?.(profile);
    this.#ui.refreshAuthor(profile);
    this.#feedView.profileUpdated(profile);
    this.#savedView?.profileUpdated(profile);
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
      if(error instanceof AccountControlGenerationError||error instanceof AccountControlUnconfirmedError){this.#status.textContent=error.message;return;}
      if(error instanceof FeedContentError||error instanceof FeedInteractionError){this.#status.textContent="Review the saved Feed action below before continuing.";return;}
      const code =
        error instanceof CloudError ? error.code : "cloud_request_failed";
      const explanations: Record<string, string> = {
        too_many_mentions: "Use up to 10 different usernames and 40 mentions in one message.",
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
        recovery_generation_required:
          "Cloud history changed. Refresh groups before continuing; your draft is kept.",
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
    if (this.#tab === "groups") { this.#thread?.stop(); this.#thread = undefined; this.#refreshMessages = undefined; this.#syncGroupMute = undefined; }
    else this.#activeFeedView()?.pause();
    if (this.#tab !== "moderation" && !this.#externalModeration) this.#moderation.hide();
    this.element.dataset.surface = this.#tab === "groups" ? "groups" : this.#tab === "saved" ? "saved" : this.#tab === "moderation" ? "moderation" : "feed";
    this.#syncFeedShell();
    this.#heading.textContent = this.#tab === "groups" ? "Group chats" : this.#tab === "moderation" ? "Reports" : this.#tab === "saved" ? "Saved" : "Feed";
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
    if (!this.element.hasAttribute("data-platform-feed") && !(this.#tab === "groups" && this.options.embeddedGroups)) {
    for (const [key, label] of [
      ["feed", "Feed"],
      ...(this.#savedView ? [["saved", "Saved"]] : []),
      ["groups", "Groups"],
      ["profile", "My profile"],
      ...(this.#moderator ? [["moderation", "Reports"]] : []),
    ] as Array<[CloudTab, string]>) {
      const button = this.#ui.button(label, async () => {
        if (key === "moderation" && this.options.openModeration) { this.options.openModeration(); return; }
        if (key === "feed" && this.options.openFeed) { this.options.openFeed(); return; }
        if (key === "saved" && this.options.openSaved) { this.options.openSaved(); return; }
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
    const accountCurrent=()=>!this.#destroyed&&!this.element.hidden&&operation===this.#renderToken;
    const confirmLogout=async(all:boolean)=>{
      if(!accountCurrent())return;const accountReview=await reviewAccountControl(this.client,accountCurrent);
      if(!accountCurrent())return;let box:Element|null=null,attempted=false;
      this.#ui.confirm(this.#body,all?'Sign out of KikiLink Cloud on every device?':'Disconnect this device from KikiLink Cloud?',async()=>{
        if(!accountCurrent()||!box?.isConnected||attempted)return;attempted=true;
        await this.client.logout(all,accountReview);
      },all?'Sign out everywhere':'Disconnect');box=this.#body.querySelector('.kl-social-confirm');
    };
    this.#tabs.append(this.#ui.menu("Account options", [
      this.#ui.button("Disconnect", () => confirmLogout(false), "lock"),
      this.#ui.button("Sign out on all devices", () => confirmLogout(true), "lock"),
    ]));
    }
    if (this.#activeFeedView()) await this.#feed(operation);
    else if (this.#tab === "groups") await this.#groups(operation);
    else if (this.#tab === "profile") await this.#profileEditor(operation);
    else { this.#body.replaceChildren(this.#moderation.element); await this.#moderation.show(); }
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
    const view = this.#activeFeedView()!;
    this.#body.replaceChildren(view.element);
    // A new surface starts at its heading, not at the old Feed's scroll offset.
    // Cached returns restore their own position in setVisible instead.
    this.element.scrollTop = 0;
    await view.render(this.#sessionInfo?.features);
  }

  #report(container: HTMLElement, type: string, id: string, source?:ReportSource): void {
    if (this.#reportDialog.element.open || this.#closeFeedReport) return;
    const root = container.getRootNode();
    if (this.options.platformPreview && (type === "post" || type === "comment")) {
      this.#reportFeed(container, type, id, root instanceof ShadowRoot ? root : document.body, source);
      return;
    }
    (root instanceof ShadowRoot ? root : document.body).append(this.#reportDialog.element);
    this.#reportDialog.element.classList.add("kl-report-dialog");
    this.#reportDialog.element.querySelector("button")?.setAttribute("aria-label", "Close report");
    const form = reportForm(this.client, type, id, this.#sessionInfo?.features?.reportReasons === true,
      () => { this.#status.textContent = "Report submitted. Thank you."; }, () => this.#reportDialog.close(),'/v1/reports',{source,current:()=>this.#reportDialog.element.open});
    // The menu has already collapsed. Restore focus to its visible trigger when
    // the modal closes, not to the now-hidden Report action inside it.
    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    active?.closest("details")?.querySelector("summary")?.focus({ preventScroll: true });
    this.#reportDialog.show(`Report ${type}`, form);
    form.querySelector("input")?.focus({ preventScroll: true });
  }
  #reportFeed(container: HTMLElement, type: "post" | "comment", id: string, root: ShadowRoot | HTMLElement, source?: ReportSource): void {
    const label = type === "post" ? "Post" : "Comment";
    const returnFocus = container.querySelector<HTMLElement>(":scope > header summary");
    const author = container.querySelector(":scope > header .kl-social-name")?.textContent?.trim();
    const copy = container.querySelector(":scope > p")?.cloneNode(true) as HTMLElement | undefined;
    copy?.querySelectorAll(".kl-feed-text-spoiler").forEach(spoiler => spoiler.remove());
    const text = copy?.textContent?.replace(/\s+/gu, " ").trim().slice(0, 80);
    const close = () => {
      this.#closeFeedReport = undefined;
      if (dialog.open) dialog.close();
      dialog.remove();
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
    const dialog = targetReportDialog(this.client, {
      type, id, label, title: `Report ${type}`,
      summary: [author, text].filter(Boolean).join(": ") || `${label} #${id}`,
      notice: "Platform moderators can review your reason and the reported content.",
      structured: this.#sessionInfo?.features?.reportReasons === true,
      source, panel: container.closest<HTMLElement>('.kl-panel') ?? undefined,
      current: () => this.#closeFeedReport === close, close,
      submitted: () => { this.#status.textContent = "Report submitted. Thank you."; },
    });
    this.#closeFeedReport = close;
    returnFocus?.focus({ preventScroll: true });
    root.append(dialog);
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
    const blockReview=await reviewAccountControl(this.client,()=>operation===this.#renderToken&&!this.#destroyed);
    const blocks=accountControlRead<{items:Array<{memberNumber:number}>}>(await this.client.request('GET',accountControlPath('/v1/blocks',blockReview)),blockReview);
    if (operation !== this.#renderToken) return;
    if (blocks.items.length) {
      const list = element(
        "div",
        { className: "kl-cloud-card" },
        element("h3", { text: "Blocked Cloud users" }),
      );
      for (const b of blocks.items) {
        const intent=new AccountControlIntent(this.client,blockReview,{action:'unblock',member:b.memberNumber});
        list.append(this.#button(`Unblock ${b.memberNumber}`,async()=>{
          const current=()=>operation===this.#renderToken&&!this.#destroyed&&list.isConnected&&!this.element.hidden;
          await intent.run(current);if(!current())return;this.client.rememberBlock(b.memberNumber,false);await this.refresh();
        }));
      }
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
    markAvatarPresence(avatar, p.memberNumber);
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
        this.#button("Block in Cloud", () => confirmCloudBlock(this.#ui,card,member,()=>!this.#destroyed,()=>{
          card.replaceChildren(element('p',{text:'User blocked in Cloud.'}));
        })),
      );
    return card;
  }
  messageImage(id: string, reportId?: MediaReportScope, generation?: string): HTMLElement {
    return this.#image(id, "Message image", "kl-cloud-image", reportId, false, false, this.options.settings().linkChat.imagePreviews, generation);
  }
  profileAlbumCover(id: string, title: string, open: (button: HTMLButtonElement) => void): HTMLElement {
    return this.#image(id, title, "kl-cloud-image", undefined, false, false, this.options.settings().linkChat.imagePreviews, undefined, open);
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
      this.#ui.button("Block in Cloud", () => confirmCloudBlock(this.#ui,card,member,()=>!this.#destroyed,()=>{
        this.#surfaces.clear(); this.#completedTab = undefined;
        card.replaceChildren(element("p", { text: "User blocked in Cloud." }));
      }), "lock")];
  }
  async #groups(operation: number): Promise<void> {
    {
      await this.inbox.refresh();
      if (operation !== this.#renderToken) return;
      if (this.#group && !this.inbox.groups.some(g => g.id === this.#group?.id)) this.#group = undefined;
    }
    if (this.#group) {
      await this.#groupView(operation, this.#group.id);
      return;
    }
    const groups={items:this.inbox.groups};
    if(operation!==this.#renderToken)return;
    const list=element('div',{className:'kl-group-list'});
    if(!this.options.embeddedGroups)for(const invite of this.inbox.invitations){
      if(!this.options.isBlocked(invite.owner))list.append(this.inbox.invitationCard(invite));
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
    const source=this.inbox.creationSource;
    if(!this.#creationDraft||!this.#creationDraft.dirty)this.#creationDraft=new GroupCreationDraft(this.client,source);
    const draft=this.#creationDraft;draft.observe(source);
    const currentMigrationView=()=>!this.#destroyed&&!this.element.hidden&&this.#tab==='groups'&&operation===this.#renderToken;
    const openCreated=async(destination:GroupCreationDestination)=>{
      const access=await this.inbox.historyAccess();
      if(!currentMigrationView())return;
      if(destination.generation!==undefined&&destination.generation!==access.generation)throw new GroupCreationRecoveryError();
      const group=await access.request<CloudGroup>('GET',`/v1/groups/${destination.groupId}`);
      if(!currentMigrationView()||!access.current())return;
      if(group.id!==destination.groupId)throw new GroupCreationRecoveryError();
      this.#group=group;this.inbox.invalidate();await this.refresh();
    };
    const create=element('div',{className:'kl-cloud-card'});
    create.append(groupCreationView({draft,current:currentMigrationView,isBlocked:n=>this.options.isBlocked(n),open:openCreated,
      discard:async()=>{if(!currentMigrationView()||this.#creationDraft!==draft)return;this.#creationDraft=undefined;this.inbox.invalidate();await this.refresh();},
      ...this.options.choosePeople?{choosePeople:this.options.choosePeople}:{}}));
    create.append(groupMigrationView({client:this.client,storage:this.options.storage,source,
      groups:this.options.legacyGroups(),current:currentMigrationView,sourceCurrent:()=>this.inbox.creationSource,isBlocked:n=>this.options.isBlocked(n),
      refresh:async()=>{if(!currentMigrationView())return;this.inbox.invalidate();await this.refresh();},
      open:async(id,generation)=>openCreated({groupId:id,...generation?{generation}:{}}),
    }));
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
      } else if (this.options.platformPreview) {
        this.#body.replaceChildren(element("div", { className: "kl-empty kl-group-thread-empty" },
          element("div", { className: "kl-empty-mark" }, kikiIcon("chat")),
          element("h2", { className: "kl-empty-title", text: "Choose a conversation" }),
          this.options.openNewMessage
            ? this.#ui.button("New message", this.options.openNewMessage, undefined, "kl-text-button", false)
            : this.#ui.button("New group", () => this.createGroup(), undefined, "kl-text-button", false)));
      } else this.#body.replaceChildren(element("div", { className: "kl-group-empty" },
        kikiIcon("users"), element("h3", { text: "Your group conversations" }),
        element("p", { text: "Choose a group from the list, or start a conversation with your people." }),
        this.#ui.button("Create group", () => this.createGroup(), "plus")));
    } else this.#body.replaceChildren(list, createPanel);
    this.#body.append(this.inbox.management.surface("panel",this.#ui,()=>!this.#destroyed&&!this.element.hidden&&this.#tab==="groups"&&operation===this.#renderToken,async()=>{this.inbox.invalidate();await this.refresh();},e=>!this.options.embeddedGroups||!['accept','decline'].includes(e.intent.target.action)));
  }
  async #groupView(operation: number, groupId: string): Promise<void> {
    const history=await this.inbox.historyAccess();
    const g = await history.request<CloudGroup>(
      "GET",
      `/v1/groups/${groupId}`,
    );
    if (operation !== this.#renderToken) return;
    this.#group = g;
    const queue=this.inbox.management,source=history.managementSource??{required:false};
    let mounted=false;
    const current=()=>!this.#destroyed&&!this.element.hidden&&this.#tab==='groups'&&operation===this.#renderToken&&this.#group?.id===g.id&&(!mounted||details.isConnected);
    const capture=(key:string,action:GroupManagementTarget['action'],data:Record<string,unknown>={},memberNumber?:number)=>queue.capture(`${g.id}:${key}`,{action,groupId:g.id,membershipVersion:g.membershipVersion,...memberNumber===undefined?{}:{memberNumber},label:`${g.title} · ${key}`},source,data);
    const perform=async(entry:GroupManagementDraft)=>{
      if(entry.intent.pending||!current())return false;
      if(!await queue.perform(entry,current))return false;
      this.inbox.invalidate();await this.refresh();return true;
    };
    const own = g.members.find(
        (m) => m.memberNumber === this.client.memberNumber,
      ),
      manage = own?.role === "owner" || own?.role === "admin";
    const online = element("span", { className: "kl-group-online", text: "" });
    const activeMembers = g.members.filter(m => m.status === "active");
    const preview = this.options.platformPreview === true;
    const members = element("div", { className: "kl-group-member-list" });
    const section = (title: string, ...content: Node[]) => element("section", { className: "kl-group-settings-section", ariaLabel: title }, element("h4", { text: title }), ...content);
    const identitySettings = section("Group identity");
    const memberSettings = section("Members & roles", members);
    const notifications = section("Notifications");
    const muteIndicator = element("span");
    const timed = preview && this.options.openGroupMute;
    const muteScope = timed ? this.inbox.muteScope(g) : undefined;
    if (timed && muteScope) {
      const button = this.#ui.button("Mute conversation…", () => {
        if (this.inbox.hasMuteScope(muteScope)) timed(muteScope, button);
      }, undefined, "kl-social-button", false);
      notifications.append(button);
      this.#syncGroupMute = () => {
        const muted = this.inbox.hasMuteScope(muteScope) && this.inbox.isMuted(g.id);
        const label = muted ? "Manage mute…" : "Mute conversation…";
        if (button.title === label) return;
        muteIndicator.textContent = muted ? " · Muted" : "";
        button.querySelector("span")!.textContent = label;
        button.title = label;
        button.setAttribute("aria-label", label);
      };
      this.#syncGroupMute();
    } else {
      const muted = element("input", { type: "checkbox", ariaLabel: "Mute this group" });
      muted.setAttribute("role", "switch"); muted.checked = this.inbox.isMuted(g.id);
      muted.addEventListener("change", () => { if (muted.checked !== this.inbox.isMuted(g.id)) this.inbox.toggleMuted(g.id); });
      notifications.append(element("label", { className: "kl-group-settings-toggle" }, element("span", { text: "Mute this group" }),
        element("span", { className: "kl-switch" }, muted, element("span", { className: "kl-switch-track" }))));
    }
    const permissions = section("Permissions", element("p", { text: own?.role === "owner" ? "You own this group. Only you can change roles or transfer ownership." :
      own?.role === "admin" ? "You are an admin. You can edit the group, invite or remove members, and manage messages." : "You are a member. Owners and admins manage this group." }),
      element("p", { text: "Only owners and admins can pin messages. Members can delete their own messages." }));
    const destructive = section("Leave or delete"); destructive.classList.add("kl-group-settings-danger");
    const details = element("section", { className: "kl-group-management", hidden: this.#settingsGroup !== g.id, ariaLabel: "Group settings" },
      element("div", { className: "kl-group-management-heading" }, element("h3", { text: "Group settings" }),
        this.#ui.button("Close group settings", () => { details.hidden = true; this.#settingsGroup = undefined; settingsButton.setAttribute("aria-expanded", "false"); settingsButton.focus(); }, "close", "kl-social-icon-button")), identitySettings, memberSettings, notifications, permissions, destructive);
    const orderSettings = () => {
      const rosterFirst = preview && getComputedStyle(details).getPropertyValue("--kl-group-roster-first").trim() === "1";
      const first = rosterFirst ? memberSettings : identitySettings;
      const second = rosterFirst ? identitySettings : memberSettings;
      if (second.previousElementSibling !== first) details.insertBefore(first, second);
      return rosterFirst;
    };
    const toggle = () => {
      details.hidden = !details.hidden;
      this.#settingsGroup = details.hidden ? undefined : g.id;
      settingsButton.setAttribute("aria-expanded", String(!details.hidden));
      if (!details.hidden && orderSettings()) {
        details.scrollTop = 0;
        memberSettings.tabIndex = -1;
        memberSettings.focus({ preventScroll: true });
      }
    };
    const avatar = element("span", { className: "kl-avatar kl-group-header-avatar", ariaHidden: "true" }, kikiIcon("users"));
    if (g.avatarId) avatar.replaceChildren(this.#image(g.avatarId, "Group avatar", "kl-social-avatar-image", undefined, true));
    const identity = preview ? element("div", { className: "kl-group-identity" }) : this.#ui.button("Show group members", toggle, undefined, "kl-group-identity");
    identity.replaceChildren(avatar, element("span", { className: "kl-group-identity-copy" }, element(preview ? "h2" : "strong", { text: g.title }),
      element("span", { className: "kl-group-subtitle" }, `${activeMembers.length} members${preview && own?.role === "owner" ? " · You own this group" : ""}`, muteIndicator, online)));
    const stack = element("div", { className: "kl-group-avatar-stack", ariaLabel: "Group members" });
    if (!preview) {
      for (const member of activeMembers.slice(0, 3)) stack.append(this.#ui.member(member.memberNumber, undefined, toggle));
      if (activeMembers.length > 3) stack.append(this.#ui.button(`+${activeMembers.length - 3}`, toggle, undefined, "kl-group-avatar-more"));
    }
    const settingsButton = this.#ui.button(preview ? "Group members" : "Group settings", toggle, preview ? "users" : "settings", "kl-social-icon-button kl-group-settings-button");
    settingsButton.setAttribute("aria-expanded", String(!details.hidden));
    details.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.stopPropagation(); details.hidden = true; this.#settingsGroup = undefined; settingsButton.setAttribute("aria-expanded", "false"); settingsButton.focus(); }
    });
    const card = element("header", { className: "kl-group-header" },
      this.#ui.button(this.options.platformPreview ? "Back to conversations" : "Back to groups", async () => {
        this.#group = undefined; this.#createGroup = false; this.#settingsGroup = undefined; this.inbox.select(); this.options.groupSelection?.(false, g.id);
        this.inbox.invalidate(); await this.refresh();
      }, this.options.platformPreview ? "back" : "previous", "kl-social-icon-button kl-group-back"), identity, ...(preview ? [] : [stack]), settingsButton);
    for(const m of g.members){
      const row=element('div',{className:'kl-group-member'},this.#ui.member(m.memberNumber),element('small',{text:`${m.role} · ${m.status}`}));
      if(manage&&m.role!=='owner'&&(own?.role==='owner'||m.role==='member')&&m.memberNumber!==this.client.memberNumber){
        const remove=capture(`remove #${m.memberNumber}`,'remove',{},m.memberNumber);
        row.append(this.#ui.button('Remove',()=>{if(current())this.#ui.confirm(row,`Remove #${m.memberNumber} from this group?`,()=>perform(remove),'Remove');},'close'));
      }
      if(own?.role==='owner'&&m.role!=='owner'&&m.status==='active'){
        const role=capture(`role #${m.memberNumber}`,'role',{role:m.role==='admin'?'member':'admin'},m.memberNumber);
        const transfer=capture(`transfer ownership to #${m.memberNumber}`,'role',{role:'owner'},m.memberNumber);
        row.append(this.#button(m.role==='admin'?'Make member':'Make admin',()=>perform(role)),
          this.#ui.button('Transfer ownership',()=>{if(current())this.#ui.confirm(row,`Make #${m.memberNumber} the group owner?`,()=>perform(transfer),'Transfer ownership');}));
      }
      members.append(row);
    }
    if(manage&&this.#sessionInfo?.features?.groupAvatar){
      const avatarChange=capture('change avatar','settings',{title:g.title,revision:g.revision});
      const file=element('input',{type:'file',accept:'image/png,image/jpeg,image/webp',hidden:true});
      file.addEventListener('change',()=>void this.#run(async()=>{
        if(!current()||!queue.available(avatarChange)||avatarChange.intent.pending||avatarChange.intent.held||avatarChange.preparing)return;
        const image=file.files?.[0];if(!image)return;
        if(!/^image\/(png|jpeg|webp)$/u.test(image.type)||image.size>2*1024**2)throw new CloudError('avatar_size_limit');
        queue.prepare(avatarChange,true);
        try{
          const uploaded=await this.client.request<CloudMedia>('POST','/v1/media/avatar',image);
          queue.attachment(avatarChange,uploaded.id);
          if(current())await perform(avatarChange);
        }finally{queue.prepare(avatarChange,false);}
      }));
      const removeAvatar=capture('remove avatar','settings',{title:g.title,revision:g.revision,avatarId:null});
      identitySettings.append(element('div',{className:'kl-group-settings-actions'},file,
        this.#ui.button('Change group avatar',()=>{if(current()&&!avatarChange.intent.pending&&!avatarChange.intent.held)file.click();},'image'),
        ...(g.avatarId?[this.#ui.button('Remove avatar',()=>perform(removeAvatar),'trash')]:[])));
    }
    if(manage){
      const name=capture('name','settings',{title:g.title,revision:g.revision});
      const title=this.#field('Group name',String(name.data.title??g.title),60);
      title.input.readOnly=name.intent.held||!!name.intent.pending;
      title.input.addEventListener('input',()=>{if(!current()||!queue.edit(name,{...name.data,title:title.input.value})){title.input.value=String(name.data.title??g.title);}});
      identitySettings.prepend(title.label);
      identitySettings.append(this.#ui.button('Save name',async()=>{try{await perform(name);}finally{title.input.readOnly=name.intent.held||!!name.intent.pending;}},'check'));
      const invitations=capture('invite members','invite');
      if(this.options.choosePeople){
        const add=this.#ui.button('Add members',()=>{if(current()&&!invitations.intent.pending&&!invitations.intent.held)this.options.choosePeople!({mode:'Add members',maximum:Math.max(0,5-g.members.length),exclude:g.members.map(m=>m.memberNumber),confirm:async members=>{
          if(!current()||!queue.edit(invitations,{members}))return;await perform(invitations);
        }});},'group-add');add.disabled=g.members.length>=5;memberSettings.append(add);
      }else{
        const invite=this.#field('Invite Member Number',String(invitations.data.memberNumber??''),16);invite.input.inputMode='numeric';
        invite.input.readOnly=invitations.intent.held||!!invitations.intent.pending;
        invite.input.addEventListener('input',()=>{if(!current()||!queue.edit(invitations,{memberNumber:invite.input.value})){invite.input.value=String(invitations.data.memberNumber??'');}});
        memberSettings.append(element('div',{className:'kl-group-invite-row'},invite.label,this.#ui.button('Invite',async()=>{
          const memberNumber=Number(invitations.data.memberNumber??invite.input.value);
          if(this.options.isBlocked(memberNumber))throw new CloudError('blocked_member');
          if(!current()||!queue.edit(invitations,{memberNumber}))return;
          try{await perform(invitations);}finally{invite.input.readOnly=invitations.intent.held||!!invitations.intent.pending;}
        },'group-add')));
      }
    }else identitySettings.append(element('strong',{text:g.title}));
    const leaving=capture(own?.role==='owner'?'delete group':'leave group',own?.role==='owner'?'delete':'remove',{},own?.role==='owner'?undefined:this.client.memberNumber);
    destructive.append(this.#button(own?.role==='owner'?'Delete group':'Leave group',()=>{
      if(current())this.#ui.confirm(destructive,own?.role==='owner'?'Delete this group and its conversation?':'Leave this group?',async()=>{
        if(leaving.intent.pending||!await queue.perform(leaving,current))return;
        this.#group=undefined;this.inbox.invalidate();await this.refresh();
      },own?.role==='owner'?'Delete group':'Leave group');
    }));
    const archiveTarget=this.inbox.archiveTarget(g);
    if (!this.#groupDrafts.has(g.id)) this.#groupDrafts.set(g.id, this.inbox.archive.draft(archiveTarget)??{ text: "", clientId: crypto.randomUUID() });
    const thread = new CloudGroupThread(this.#ui, g, this.#groupDrafts.get(g.id)!, {
      ...(preview ? { presentation:this.inbox.presentation, persistLocalChanges:()=>this.options.settings().linkChat.saveHistory,
        localChanged:()=>this.inbox.render() } : {}),
      platformPreview: preview,
      history,management:queue,
      archived:()=>this.inbox.archive.archived(archiveTarget),restoreArchive:()=>this.#toggleGroupArchive(g,archiveTarget),
      beforeDraftChange:()=>this.inbox.archive.forgetDraft(archiveTarget),
      mentions: this.#sessionInfo?.features?.mentions ?? false,
      enterToSend: () => this.options.enterToSend?.() ?? false,
      messageChanges: this.#sessionInfo?.features?.messageChanges ?? false,
      groupLive: this.#sessionInfo?.features?.groupLive ?? false,
      groupPins: this.#sessionInfo?.features?.groupPins ?? false,
      messageReceipts: this.#sessionInfo?.features?.messageReceipts ?? false,
      groupMessageMedia: this.#sessionInfo?.features?.groupMessageMedia ?? false,
      messageAudio: this.#sessionInfo?.features?.messageAudio ?? false,
      messageReactions: this.#sessionInfo?.features?.messageReactions ?? false,
      chatReactionChoices: this.#sessionInfo?.features?.chatReactionChoices ?? false,
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
      observed: (messages, read) => {if(history.current())this.inbox.observe(g.id, messages, read);},
      acknowledgeReceipts: (deliveredIds, readIds) =>
        {if(history.current())this.inbox.acknowledgeReceipts(g.id, g.conversationId, deliveredIds, readIds);},
      draftChanged: text => this.inbox.draft(g.id, text),
      canRead: () => !this.#openingGroupMessage && !this.element.hidden && this.#tab === "groups" && (this.options.canReadGroup?.() ?? true),
      readUntil: sequence => {if(history.current())this.inbox.markRead(g.id, sequence);},
      messageTargetChanged: messageId => { this.#groupTarget = messageId ? { groupId: g.id, messageId } : undefined; },
      report: (row, id) => this.#report(row, "message", id, history),
    });
    if (preview) {
      const tools = section('Conversation history');
      details.insertBefore(tools, destructive);
      card.append(thread.conversationOptions((id, close, anchor) =>
        muteScope && !this.inbox.hasMuteScope(muteScope) ? [] : this.inbox.conversationActions(id, close, anchor), tools));
    }
    this.#thread = thread;
    this.inbox.select(g.id);
    this.#body.replaceChildren(card, details,queue.surface("panel",this.#ui,current,async()=>{this.inbox.invalidate();await this.refresh();},e=>!this.options.embeddedGroups||!['accept','decline'].includes(e.intent.target.action)),thread.element);mounted=true;
    if (!details.hidden) orderSettings();
    if (this.#groupTarget?.groupId === g.id) await thread.openMessage(this.#groupTarget.messageId);
    else await thread.loadOlder();
    if (operation === this.#renderToken) this.#refreshMessages = () => thread.updates();
  }
  #image(
    assetId: string,
    alt: string,
    className = "kl-cloud-image",
    reportId?: MediaReportScope,
    passive = false,
    own = false,
    preview?: "always" | "ask" | "never",
    generation?: string,
    openPreview?: (button: HTMLButtonElement) => void,
  ): HTMLElement {
    const wrapper = element("div", {}),
      img = element("img", { className, alt });
    const key = `${mediaReportKey(reportId)}:${assetId}${generation ? `:${generation}` : ''}`;
    const reportVersion = typeof reportId === 'number' ? this.#reportImageVersion : undefined;
    const reportCurrent = () => reportVersion === undefined || reportVersion === this.#reportImageVersion;
    if (reportVersion !== undefined) wrapper.dataset.platformReport = String(reportId);
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    wrapper.className = passive ? "kl-social-avatar-media" : "kl-cloud-image-wrap";
    wrapper.dataset.state = "loading";
    const paint = (entry: CloudImageEntry) => {
      if (!reportCurrent() || this.#urls.get(key) !== entry || this.#destroyed || !this.client.connected) return;
      entry.elements.add(wrapper); entry.used = Date.now();
      wrapper.dispatchEvent(new Event("cloud-image-before-paint"));
      if (img.src !== entry.url) img.src = entry.url;
      const width = img.naturalWidth || entry.width, height = img.naturalHeight || entry.height;
      if (width && height) {
        entry.width = img.width = width; entry.height = img.height = height;
        wrapper.style.setProperty("--kl-chat-image-ratio", `${width} / ${height}`);
      }
      wrapper.dataset.state = "ready"; wrapper.removeAttribute("aria-busy");
      if (openPreview) {
        const open = element("button", { className: "kl-cloud-full-image", type: "button", ariaLabel: `Open ${alt}` }, img);
        open.addEventListener("click", () => { if (open.isConnected && wrapper.contains(open) && !wrapper.closest("[hidden]")) openPreview(open); });
        wrapper.replaceChildren(open);
      } else if (!passive && this.options.openImageViewer) {
        const version = this.#imageVersion;
        const available = () => reportCurrent() && !this.#destroyed && this.client.connected && version === this.#imageVersion && wrapper.isConnected && !wrapper.closest("[hidden]");
        const item: MediaViewerItem = { id: key, title: alt, detail: "KikiLink image", load: async signal => {
          if (!available() || signal.aborted) throw new Error("This image is no longer available.");
          // Re-authorize the original, including report access; never expose an asset URL.
          const blob = await this.client.media(assetId, reportId, { fresh: true, ...(generation ? { recoveryGeneration: generation } : {}) });
          if (!available() || signal.aborted) throw new Error("This image is no longer available.");
          const url = URL.createObjectURL(blob); let released = false;
          return { url, release: () => { if (!released) { released = true; URL.revokeObjectURL(url); } } };
        } };
        this.#viewerItems.set(wrapper, item);
        const open = element("button", { className: "kl-cloud-full-image", type: "button", ariaLabel: `View ${alt.toLowerCase()}` });
        open.append(img);
        open.addEventListener("click", () => this.options.openImageViewer?.(() => {
          if (!available()) return [];
          const context = wrapper.closest(".kl-group-message-images,.kl-message-media,.kl-feed-media");
          const nodes = context ? [...context.querySelectorAll<HTMLElement>(".kl-cloud-image-wrap")] : [wrapper];
          return nodes.filter(node => node.isConnected && !node.closest("[hidden]") && node.dataset.state === "ready")
            .flatMap(node => { const image = this.#viewerItems.get(node); return image ? [image] : []; });
        }, key));
        wrapper.replaceChildren(open);
      } else wrapper.replaceChildren(img);
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
      if (!reportCurrent() || this.#destroyed || !this.#retainsImage(wrapper)) return;
      const version = this.#imageVersion;
      wrapper.dataset.state = "loading";
      delete wrapper.dataset.errorStatus;
      loading = (async () => {
      const blob = generation ? await this.client.media(assetId, reportId, { recoveryGeneration: generation }) : await this.client.media(assetId, reportId);
      if (!reportCurrent() || version !== this.#imageVersion || this.#destroyed || !this.#retainsImage(wrapper)) return;
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
      preview ?? (own ? "always" : this.options.settings().linkPresence.profileImagePreviews);
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
    return node.isConnected || this.#feedView.element.contains(node) || Boolean(this.#savedView?.element.contains(node)) || Boolean(this.#thread?.element.contains(node)) ||
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
  #releaseReportImages(): void {
    this.#reportImageVersion++;
    this.options.closeImageViewer?.();
    for (const [node,timer] of this.#imageRetries) if (node.dataset.platformReport) { clearTimeout(timer); this.#imageRetries.delete(node); }
    for (const [key,entry] of this.#urls) if (/^\d+:/u.test(key)) { URL.revokeObjectURL(entry.url); this.#urls.delete(key); this.#urlBytes -= entry.bytes; }
  }
  #releaseImages(): void {
    this.#imageVersion++;
    this.options.closeImageViewer?.();
    for (const timer of this.#imageRetries.values()) clearTimeout(timer);
    this.#imageRetries.clear();
    for (const entry of this.#urls.values()) URL.revokeObjectURL(entry.url);
    this.#urls.clear();
    this.#urlBytes = 0;
  }
  destroy(): void {
    document.removeEventListener("visibilitychange", this.#resumeFeed);
    clearTimeout(this.#feedUpdateTimer);
    this.#moderation.destroy();
    this.#reportDialog.destroy(); this.#groupOptionDialog.destroy();
    this.#closeFeedReport?.();
    this.#ui.destroy();
    clearTimeout(this.#groupUpdateTimer); this.inbox.destroy(); this.#surfaces.clear();
    this.#thread?.stop();
    this.#feedView.destroy();
    this.#savedView?.destroy();
    this.#destroyed = true;
    this.#renderToken++;
    this.#observer?.disconnect();
    this.#observedImages.clear();
    clearInterval(this.#imageCleanupTimer); this.#imageCleanupTimer = undefined;
    this.#imageQueue = [];
    this.#releaseImages();
    this.#groupDrafts.clear();this.#creationDraft=undefined;
    this.#unsubscribe();
    this.client.destroy();
    this.element.remove();
  }
}
