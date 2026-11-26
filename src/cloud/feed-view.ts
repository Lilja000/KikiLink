import { pageAction } from '../modules/platform-shell/page-action';
import { bindSearchEscape } from "../modules/platform-shell/browse-controls";
import { preserveSelectionFocus } from "../modules/platform-shell/browse-focus";
import {MediaUploadIntent} from './media-upload-intent';
import {confirmCloudBlock} from './account-control-ui';
import {FeedContentDrafts,FeedContentError,feedContentSource,type FeedContentSource,type FeedContentTarget} from './feed-content-intent';
import {FeedInteractionActions,feedInteractionSource,type FeedInteractionSource,type FeedInteractionTarget} from './feed-interaction-intent';
import {captureReportSource,type ReportSource} from './report-source';
import { element } from "./dom";
import { CloudError } from "./client";
import { FeedReadRecovery, feedRecoveryConflict, type FeedReadAccess } from './feed-read-recovery';
import { SocialUI, REACTIONS, type Reaction } from "./social-ui";
import { kikiIcon } from "../modules/link-chat/icons";
import { FeedCommentsDialog } from "./feed-comments-dialog";
import { ContentDialog } from "../modules/link-chat/content-dialog";
import { bindContextMenuGesture } from "../utils/context-menu-gesture";
import { trackMenuPlacement } from "../utils/anchored-surface";
import { appendFeedFormattedText } from "./feed-spoilers";
import { FeedPollView, pollEditor, validPollDraft } from "./feed-poll";
import { parseMetadata } from "./feed-draft-metadata";
import type { FeedImportSession } from "../storage/feed-archive-import";
import { FeedDraftStore, type FeedDraft } from "./feed-drafts";
import { remainingDraftAfterSend } from "../utils/sent-draft";
import { bindClockText } from "../core/time-format";
import { MentionPicker } from './mention-picker';
import type { CloudComment, CloudFeedPage, CloudPage, CloudPost, CloudProfile, CloudReactions, CloudReactionMember, CloudPollDraft } from "./types";

function updateFeedPageAction(button: HTMLButtonElement, replacePage: boolean, appendLabel: string, nextLabel: string): void {
  const label = replacePage ? nextLabel : appendLabel;
  if (button.getAttribute("aria-label") !== label) {
    button.querySelector("span")!.textContent = label;
    button.setAttribute("aria-label", label);
    button.title = label;
  }
  pageAction(button, replacePage ? "next" : "more");
}

function insertSpoiler(field: HTMLTextAreaElement): void {
  const start = field.selectionStart, end = field.selectionEnd;
  const content = field.value.slice(start, end) || "your text";
  if (field.maxLength >= 0 && field.value.length - (end - start) + content.length + 4 > field.maxLength) return;
  field.setRangeText(`||${content}||`, start, end, "select");
  field.focus({ preventScroll: true }); field.setSelectionRange(start + 2, start + 2 + content.length);
  field.dispatchEvent(new Event("input"));
}

interface FeedOptions {
  platformPreview?: boolean;
  savedOnly?: boolean;
  draftHost?: CloudFeedView;
  openFeed?(): void;
  openSaved?(): void;
  openCommunity?(id: string): void;
  openUpcomingEvents?(anchor: HTMLButtonElement, current: () => boolean): void;
  openOwnProfile(): void;
  openGroups(): void;
  report(container: HTMLElement, type: string, id: string, source?: ReportSource): void;
  relatedMembers?(): ReadonlySet<number>;
  readFresh?(id: number, recoveryGeneration?: string): void | Promise<void>;
  canRead?(): boolean;
  canPin?(): boolean;
}
type FeedFilter = "all" | "friends" | "following" | "mine" | "saved" | "hidden";
type FeedCommentAttempt = { text: string; parent: number | null; clientId: string };
interface PendingFeedPost { text: string; files: File[]; spoilerFiles: File[]; poll: CloudPollDraft | null; clientId: string; mediaIds?: string[]; spoilerMediaIds?: string[] }
export interface SocialFeatures { feedContentRecoveryGeneration?:boolean; feedMutationRecoveryGeneration?: boolean; reportCreationRecoveryGeneration?: boolean; feedReadRecoveryGeneration?: boolean; mentions?: boolean; messageReactions?: boolean; chatReactionChoices?: boolean; groupMessageMedia?: boolean; messageAudio?: boolean; feedPins?: boolean; feedFeatured?: boolean; feedBookmarks?: boolean; feedReplies?: boolean; feedFilters?: boolean; feedFollowing?: boolean; feedPolls?: boolean; feedPollClose?: boolean; feedWatch?: boolean; feedHide?: boolean; feedSpoilers?: boolean; reactionDetails?: boolean; groupPins?: boolean; groupLive?: boolean; groupInbox?: boolean; groupAvatar?: boolean; fullProfile?: boolean; feedSearch?: boolean; messageChanges?: boolean; messageReceipts?: boolean; reactions?: string[] }

/** One bounded page at a time. Reactions and comments never rebuild the whole feed. */
export class CloudFeedView {
  #imageIntents=new WeakMap<Blob,MediaUploadIntent>();
  readonly element = element("div", { className: "kl-feed-layout" });
  #generation = 0;
  readonly #recovery: FeedReadRecovery;
  readonly #interactions:FeedInteractionActions;
  #interactionSource:FeedInteractionSource={required:false};
  #contentDraftsStore:FeedContentDrafts|undefined;
  #contentSource:FeedContentSource={required:false};
  #postSourceMissing=false;
  readonly #draftHost: CloudFeedView;
  #draftGuest: CloudFeedView | undefined;
  #contentDrafts():FeedContentDrafts {
    if (this.#draftHost !== this) return this.#draftHost.#contentDrafts();
    if(!this.#contentDraftsStore||!this.#contentDraftsStore.identity())this.#contentDraftsStore=new FeedContentDrafts(this.ui.options.client);
    return this.#contentDraftsStore;
  }
  #postKey():string{return `create:post:${this.#clientId}`;}
  #contentCurrent(anchor:HTMLElement):()=>boolean {
    const generation=this.#generation,epoch=this.#accountEpoch,owner=this.ui.options.client.memberNumber,source={...this.#contentSource};
    return ()=>anchor.isConnected&&(!anchor.closest('dialog')||anchor.closest('dialog')!.open)&&!anchor.closest('[hidden]')&&generation===this.#generation&&epoch===this.#accountEpoch&&owner===this.ui.options.client.memberNumber&&!this.#recoveryHold&&JSON.stringify(source)===JSON.stringify(this.#contentSource);
  }
  #contentSurface():HTMLElement {
    const epoch=this.#accountEpoch,generation=this.#generation,drafts=this.#draftHost;
    return this.#contentDrafts().surface(this.element,this.ui,()=>this.element.isConnected&&!this.element.closest('[hidden]')&&epoch===this.#accountEpoch&&generation===this.#generation,()=>this.render(this.#features),async(e,confirmed)=>{
      if(e.type==='post'&&e.action==='create'&&e.key===drafts.#postKey()){
        drafts.#pendingPost=undefined;drafts.#clientId=crypto.randomUUID();drafts.#postSourceMissing=true;drafts.#uploaded=new WeakMap();drafts.#saveDraft(this);await drafts.#draftStore?.flush();
      }
      if(e.type==='comment'&&e.action==='create'&&e.postId){
        const remaining=confirmed?remainingDraftAfterSend(String(e.data.text??''),String(e.pending?.payload.text??'')):'';
        if(remaining)this.#commentDrafts.set(e.postId,remaining);else this.#commentDrafts.delete(e.postId);
        this.#commentAttempts.delete(e.postId);this.#commentReplies.delete(e.postId);
        this.#reconcileCachedComment(e.postId, e.source, String((confirmed ? e.pending?.payload.text : e.data.text) ?? ''), confirmed);
      }
    });
  }
  #reconcileCachedComment(postId: number, source: FeedContentSource, submitted: string, confirmed: boolean): void {
    const peer = this.#draftHost === this ? this.#draftGuest : this.#draftHost;
    if (!peer || !submitted || source.generation !== peer.#contentSource.generation || source.required !== peer.#contentSource.required) return;
    const text = peer.#commentDrafts.get(postId);
    if (text === undefined || (confirmed ? !text.startsWith(submitted) : text !== submitted)) return;
    const remaining = confirmed ? remainingDraftAfterSend(text, submitted) : '';
    if (remaining) peer.#commentDrafts.set(postId, remaining); else peer.#commentDrafts.delete(postId);
    peer.#commentAttempts.delete(postId); peer.#commentReplies.delete(postId);
    const card = peer.element.querySelector(`[data-post-id="${postId}"]`);
    if (peer.#commentsDialog?.card === card) peer.#commentsDialog?.close();
    else card?.querySelector('.kl-cloud-comments')?.remove();
    card?.querySelector('.kl-post-comments-button')?.setAttribute('aria-expanded', 'false');
  }
  async #writeContent<T>(anchor:HTMLElement,key:string,target:FeedContentTarget,source:FeedContentSource,data:Record<string,unknown>):Promise<T|undefined>{
    const current=this.#contentCurrent(anchor);if(!current())return;const store=this.#contentDrafts();store.save(key,target,source,data);store.stage(key,data);return store.send<T>(key,current);
  }
  #readAccess: FeedReadAccess | undefined;
  #reportSource:ReportSource|undefined;
  #recoveryHold = false;
  #forceMetadata = false;
  #retiredComments: Array<{ generation: string | undefined; drafts: Map<number, string>; attempts: Map<number, FeedCommentAttempt>; replies: Map<number, CloudComment> }> = [];
  #draft = "";
  #files: File[] = [];
  #spoilerFiles = new Set<File>();
  #pollDraft: CloudPollDraft | null = null;
  #draftStore: FeedDraftStore | undefined;
  #draftOwner = 0;
  #draftVersion = 0;
  #accountEpoch = 0;
  #draftReady = false;
  #activePosts = 0;
  #draftLoad: Promise<void> | undefined;
  #draftStatus: HTMLElement | undefined;
  #draftButton: HTMLButtonElement | undefined;
  #composeDialog: ContentDialog | undefined;
  #pollViews = new Map<number, FeedPollView>();
  #clientId: string = crypto.randomUUID();
  #pendingPost: PendingFeedPost | undefined;
  #uploaded = new WeakMap<File, string>();
  #previews = new Map<File, string>();
  #commentDrafts = new Map<number, string>();
  #commentAttempts = new Map<number, FeedCommentAttempt>();
  #commentReplies = new Map<number, CloudComment>();
  #commentsDialog: FeedCommentsDialog | undefined;
  #commentPruners = new WeakMap<HTMLElement, () => void>();
  #query = "";
  #filter: FeedFilter = "all";
  #features: SocialFeatures = {};
  #loaded = new Map<number, CloudPost>();
  #fresh: number | undefined;
  #observer: IntersectionObserver | undefined;
  #stopAsideSizing: (() => void) | undefined;
  #readTask: Promise<void> | undefined;
  #retryReadAfter = 0;
  #scrollSurface: HTMLElement | undefined;
  #postCreated: ((post: CloudPost) => void) | undefined;
  #postDeleted: ((id: number) => void) | undefined;
  #syncPosts: (() => Promise<boolean>) | undefined;
  #syncTask: Promise<boolean> | undefined;
  #contentVersion = 0;
  #discussionSignature: string | undefined;
  readonly #menuGestures = new AbortController();
  #stopMenuTracking: (() => void) | undefined;
  readonly #postDialog = new ContentDialog();
  readonly #mentions: MentionPicker;
  readonly #reactionDialog = new ContentDialog();
  #promotionTimer: ReturnType<typeof setTimeout> | undefined;
  readonly #discussion = element("section", { className: "kl-cloud-card kl-feed-discussions", ariaLabel: "From your circle" });

  readonly #onVisible = () => this.observeFresh();
  readonly #onOnline = () => { this.#retryReadAfter = 0; this.observeFresh(); };
  constructor(readonly ui: SocialUI, readonly options: FeedOptions) {
    this.#draftHost = options.draftHost ?? this;
    if (options.draftHost) options.draftHost.#draftGuest = this;
    this.#recovery = new FeedReadRecovery(ui.options.client);
    this.#interactions = new FeedInteractionActions(ui.options.client);
    this.#mentions = new MentionPicker(ui.options.client, member => ui.options.isBlocked(member));
    this.#filter = options.savedOnly ? "saved" : "all";
    if (options.platformPreview) this.element.classList.add("kl-platform-feed");
    bindContextMenuGesture(this.element, event => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("dialog, .kl-cloud-comments, input, textarea, select, [contenteditable=true]")) return null;
      if (event.type === "pointerdown" && target.closest("button, a, summary, [role=button]")) return null;
      return target.closest<HTMLElement>(".kl-feed-post");
    }, card => {
      const menu = card.querySelector<HTMLDetailsElement>(":scope > .kl-feed-post-header > details");
      if (!menu || !card.isConnected || card.closest("[hidden]") || this.#commentsDialog?.card === card) return;
      for (const previous of this.element.querySelectorAll<HTMLDetailsElement>(".kl-feed-post-header > details[open]")) {
        if (previous !== menu) previous.open = false;
      }
      menu.open = true;
      menu.querySelector<HTMLButtonElement>("button:not(:disabled):not([hidden]):not([inert])")?.focus({ preventScroll: true });
    }, this.#menuGestures.signal);
    if (options.savedOnly) this.element.dataset.saved = "true";
    document.addEventListener("visibilitychange", this.#onVisible);
    window.addEventListener("online", this.#onOnline);
  }
  destroy(): void {
    this.#menuGestures.abort(); this.#mentions.destroy(); document.removeEventListener("visibilitychange", this.#onVisible); window.removeEventListener("online", this.#onOnline);
    this.clear(); this.#postDialog.destroy(); this.#reactionDialog.destroy();
    if (this.#draftHost.#draftGuest === this) this.#draftHost.#draftGuest = undefined;
  }
  async sync(): Promise<boolean> {
    if (this.#syncTask) return this.#syncTask;
    if (!this.#syncPosts) return true;
    const task = this.#syncPosts(); this.#syncTask = task;
    const generation = this.#generation;
    try { return await task; }
    catch (error) { if (generation === this.#generation && feedRecoveryConflict(error)) { this.#holdFeed(); return true; } throw error; }
    finally { if (this.#syncTask === task) this.#syncTask = undefined; }
  }
  refreshContentSurface(): void { this.#draftHost.#contentDraftsStore?.refreshSurfaces(); }
  observeFresh(): void {
    const access = this.#readAccess;
    if (this.#recoveryHold || !access?.current() || !this.#fresh || this.#readTask || Date.now() < this.#retryReadAfter || document.visibilityState === "hidden" || !this.options.canRead?.()) return;
    const card = this.element.querySelector<HTMLElement>(`[data-post-id="${this.#fresh}"]`);
    if (!card?.isConnected) return;
    const bounds = card.getBoundingClientRect();
    const scrollSurface = this.element.closest<HTMLElement>(".kl-cloud");
    const clip = scrollSurface?.getBoundingClientRect();
    const top = Math.max(0, clip?.top ?? 0), bottom = Math.min(window.innerHeight, clip?.bottom ?? window.innerHeight);
    if (bounds.bottom > top && bounds.top < bottom && bounds.width > 0) {
      const id = this.#fresh, generation = this.#generation;
      const task = Promise.resolve().then(async () => {
        // Recheck at dispatch: queued observers can outlive a hidden or replaced view.
        if (generation !== this.#generation || !access.current() || this.#recoveryHold || document.visibilityState === 'hidden' || !this.options.canRead?.()) return false;
        await (access.generation ? this.options.readFresh?.(id, access.generation) : this.options.readFresh?.(id)); return true;
      }).then(acknowledged => {
        if (acknowledged && generation === this.#generation && access.current() && this.#fresh === id) {
          this.#fresh = undefined; this.#stopObserving();
        }
      }).catch(error => { if (generation === this.#generation) { if (feedRecoveryConflict(error)) this.#holdFeed(); else this.#retryReadAfter = Date.now() + 3_000; } })
        .finally(() => {
          if (this.#readTask !== task) return;
          this.#readTask = undefined;
          if (this.#fresh !== id || generation !== this.#generation) this.observeFresh();
        });
      this.#readTask = task;
    }
  }
  #stopObserving(): void {
    this.#observer?.disconnect();
    this.#scrollSurface?.removeEventListener("scroll", this.#onVisible);
    this.#scrollSurface = undefined;
  }
  #currentDraftSurface(): boolean {
    return this.#draftHost === this && !this.#draftGuest || this.element.isConnected && !this.element.closest('[hidden]');
  }
  async #prepareRead(generation: number, explicit = false): Promise<FeedReadAccess | undefined> {
    try {
      const metadata = this.#features.feedContentRecoveryGeneration || this.#features.feedMutationRecoveryGeneration || this.#features.reportCreationRecoveryGeneration || this.#features.feedReadRecoveryGeneration || this.#recovery.generation !== undefined || this.#forceMetadata
        ? await this.ui.options.client.request('GET', '/v1/me') : { features: this.#features };
      if (generation !== this.#generation) return;
      const changed = this.#recovery.accept(metadata);
      this.#interactionSource=feedInteractionSource(metadata);this.#interactions.observe(this.#interactionSource);
      this.#contentSource=feedContentSource(metadata);
      if (this.#currentDraftSurface()) this.#contentDrafts().observe(this.#contentSource);
      this.#reportSource=captureReportSource(this.ui.options.client,metadata,()=>generation===this.#generation);
      if (changed && !explicit) { this.#holdFeed(); return; }
      if (explicit) this.#recoveryHold = false;
      if (this.#recoveryHold) { this.#showRecoveryHold(); return; }
      return this.#recovery.capture();
    } catch (error) {
      if (generation !== this.#generation) return;
      if (feedRecoveryConflict(error)) { this.#holdFeed(); return; }
      throw error;
    }
  }
  #holdFeed(): void {
    this.#interactions.hold();
    if (this.#currentDraftSurface()) this.#draftHost.#contentDraftsStore?.hold();
    const oldGeneration = this.#readAccess?.generation;
    if (this.#commentDrafts.size || this.#commentAttempts.size || this.#commentReplies.size) {
      // Retain old discussion drafts in-session, without attaching their numeric
      // post IDs or pending attempts to a recovered branch with reused IDs.
      this.#retiredComments.push({ generation: oldGeneration, drafts: this.#commentDrafts, attempts: this.#commentAttempts, replies: this.#commentReplies });
      this.#commentDrafts = new Map(); this.#commentAttempts = new Map(); this.#commentReplies = new Map();
    }
    this.pause(); this.#contentVersion++; this.#recoveryHold = true; this.#forceMetadata = true;
    this.#postCreated = undefined; this.#postDeleted = undefined; this.#loaded.clear();
    this.#discussion.replaceChildren(); this.#discussionSignature = undefined;
    this.#showRecoveryHold();
  }
  #showRecoveryHold(): void {
    this.element.replaceChildren(element('div', { className: 'kl-feed-main' },
      element('p', { className: 'kl-cloud-note', role: 'status', text: 'Feed history changed. Your post draft is kept. Open the current Feed before marking posts read.' }),
      this.ui.button('Read current Feed', () => { this.#query = ''; this.#filter = this.options.savedOnly ? 'saved' : 'all'; return this.render(this.#features, true); }, 'refresh')));
    this.element.firstElementChild!.append(this.#interactionSurface(),this.#contentSurface());
    const drafts = this.#preservedDiscussions(); if (drafts) this.element.firstElementChild!.append(drafts);
  }
  #preservedDiscussions(): HTMLElement | undefined {
    const texts = this.#retiredComments.flatMap(group => [...new Set([...group.drafts.values(), ...[...group.attempts.values()].map(attempt => attempt.text)])].filter(Boolean));
    if (!texts.length) return;
    const details = element('details', { className: 'kl-cloud-card' }, element('summary', { text: 'Saved discussion drafts' }),
      element('p', { className: 'kl-cloud-note', text: 'These drafts are from the previous Feed. Copy the text after checking the current discussion.' }));
    for (const text of texts) { const draft = element('textarea', { ariaLabel: 'Previous discussion draft', value: text }); draft.readOnly = true; details.append(draft); }
    return details;
  }
  #watchFresh(id: number): void {
    this.#stopObserving(); this.#fresh = id;
    this.#scrollSurface = this.element.closest<HTMLElement>(".kl-cloud") ?? this.element;
    this.#scrollSurface.addEventListener("scroll", this.#onVisible, { passive: true });
    const card = this.element.querySelector(`[data-post-id="${id}"]`);
    if (card && typeof IntersectionObserver !== "undefined") {
      this.#observer = new IntersectionObserver(() => this.observeFresh(), { root: this.#scrollSurface });
      this.#observer.observe(card);
    }
    this.observeFresh();
  }
  #sizeAside(sidebar: HTMLElement): void {
    const viewport = this.element.closest<HTMLElement>(".kl-cloud");
    if (!viewport || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const set = (property: string, value: string) => {
      if (sidebar.style.getPropertyValue(property) !== value) sidebar.style.setProperty(property, value);
    };
    const update = () => {
      frame = 0;
      if (!this.element.isConnected || !viewport.clientHeight) return;
      // Use the sidebar's actual sticky position, not the scrolled-away Feed
      // origin, so the viewport's bottom padding always stays below its cards.
      const offset = sidebar.getBoundingClientRect().top - viewport.getBoundingClientRect().top - viewport.clientTop;
      const bottom = parseFloat(getComputedStyle(viewport).paddingBottom) || 0;
      const height = Math.max(0, Math.floor(viewport.clientHeight - Math.max(0, offset) - bottom));
      const visibleHeight = Math.min(height, sidebar.scrollHeight);
      set("--kl-feed-aside-height", `${height}px`);
      set("--kl-feed-aside-fade-top", sidebar.scrollTop > 1 ? "16px" : "0px");
      set("--kl-feed-aside-fade-bottom", sidebar.scrollHeight - sidebar.scrollTop - visibleHeight > 1 ? "16px" : "0px");
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    observer.observe(this.element);
    observer.observe(sidebar);
    for (const child of sidebar.children) observer.observe(child);
    for (const child of viewport.children) if (!child.contains(this.element)) observer.observe(child);
    viewport.addEventListener("scroll", schedule, { passive: true });
    sidebar.addEventListener("scroll", schedule, { passive: true });
    this.#stopAsideSizing = () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", schedule);
      sidebar.removeEventListener("scroll", schedule);
      if (frame) cancelAnimationFrame(frame);
      this.#stopAsideSizing = undefined;
    };
    update();
  }
  async openPost(id: number, commentId?: number, observedGeneration?: string): Promise<void> {
    this.#readTask = undefined; this.#readAccess = undefined; this.#syncTask = undefined;
    this.#mentions.close();
    this.#stopAsideSizing?.();
    const generation = ++this.#generation;
    this.#stopObserving(); this.#fresh = undefined;
    this.#syncPosts = undefined; this.#postCreated = undefined; this.#postDeleted = undefined;
    this.closeDialogs(); clearTimeout(this.#promotionTimer);
    this.#clearPollViews();
    this.element.dataset.focusedPost = "true";
    const main = element("div", { className: "kl-feed-main" }, this.#interactionSurface(),this.#contentSurface());
    main.append(this.ui.button("Back to latest Feed", () => this.render(this.#features), "back"),
      element("p", { className: "kl-cloud-note", text: "Loading post…", role: "status" }));
    this.element.replaceChildren(main);
    this.#loaded.clear();
    const unavailable = () => {
      this.#syncPosts = undefined; this.#loaded.clear(); this.#clearPollViews(); clearTimeout(this.#promotionTimer);
      main.replaceChildren(this.#interactionSurface(),this.#contentSurface(),element("p", { className: "kl-cloud-note", text: "This content is no longer available." }), this.ui.button("Back to Feed", () => this.render(this.#features)));
    };
    try {
      if (observedGeneration !== undefined) this.#forceMetadata = true;
      const access = await this.#prepareRead(generation, observedGeneration !== undefined);
      if (!access || generation !== this.#generation) return;
      if (observedGeneration !== undefined && observedGeneration !== access.generation) { this.#holdFeed(); return; }
      this.#readAccess = access;
      const post = await access.request<CloudPost>("GET", `/v1/feed/${id}`);
      if (generation !== this.#generation) return;
      const card = this.#post(post); this.#loaded.set(post.id, post);
      main.lastElementChild!.replaceWith(card);
      this.#postDeleted = unavailable;
      this.#syncPosts = async () => {
        const version = this.#contentVersion;
        try {
          if (!await this.#prepareRead(generation) || generation !== this.#generation) return true;
          const next = await access.request<CloudPost>("GET", `/v1/feed/${id}`);
          if (generation !== this.#generation || version !== this.#contentVersion || !this.#loaded.has(id)) return false;
          this.#patchPost(card, post, next); this.#schedulePromotionSync();
          return true;
        } catch (error) {
          if (generation !== this.#generation) return false;
          if (error instanceof CloudError && (error.status === 404 || error.status === 403)) { unavailable(); return true; }
          throw error;
        }
      };
      this.#fresh = undefined; this.#observer?.disconnect();
      card.tabIndex = -1; card.focus({ preventScroll: true });
      card.scrollIntoView?.({ block: "start" });
      card.querySelector(".kl-post-comments-button")?.setAttribute("aria-expanded", "true");
      await this.#comments(card, id, commentId, observedGeneration ? access : undefined);
      if (generation === this.#generation) this.#schedulePromotionSync();
    } catch (error) {
      if (generation !== this.#generation) return;
      if (feedRecoveryConflict(error)) this.#holdFeed(); else unavailable();
    }
  }

  profileUpdated(profile: CloudProfile): void {
    for (const post of this.#loaded.values()) if (post.author === profile.memberNumber) post.profile = profile;
    for (const node of this.element.querySelectorAll<HTMLElement>(".kl-social-author[data-cloud-member]"))
      if (Number(node.dataset.cloudMember) === profile.memberNumber)
        this.ui.updateAuthor(node, profile);
  }
  removeBlocked(): void {
    const blocked = (member: number) => this.ui.options.isBlocked(member) || this.ui.options.client.isProfileBlocked(member);
    for (const [id, post] of this.#loaded) if (blocked(post.author)) {
      this.#loaded.delete(id); this.element.querySelector(`[data-post-id="${id}"]`)?.remove();
      this.#pollViews.get(id)?.destroy(); this.#pollViews.delete(id);
    }
    for (const box of this.element.querySelectorAll<HTMLElement>(".kl-cloud-comments")) this.#commentPruners.get(box)?.();
    for (const row of this.element.querySelectorAll<HTMLElement>(".kl-social-comment")) {
      if (blocked(Number(row.querySelector<HTMLElement>("[data-cloud-member]")?.dataset.cloudMember))) row.remove();
      const context = row.querySelector<HTMLElement>(":scope > .kl-comment-parent");
      if (context?.dataset.replyAuthor && blocked(Number(context.dataset.replyAuthor))) { context.textContent = "Reply to an unavailable comment"; context.removeAttribute("title"); }
    }
    this.#renderDiscussions();
  }

  closeDialogs(): void {
    this.#stopMenuTracking?.();
    this.#mentions.close();
    const composer = this.#draftHost.#composeDialog;
    if (composer?.element.parentElement === this.element) this.#draftHost.#disposeComposer();
    this.#reactionDialog.close(); this.#postDialog.close(); this.#commentsDialog?.close();
  }
  pause(): void { this.#readAccess = undefined; this.#readTask = undefined; this.#syncTask = undefined; this.#stopAsideSizing?.(); this.#stopObserving(); this.#fresh = undefined; clearTimeout(this.#promotionTimer); this.closeDialogs(); this.#generation++; this.#syncPosts = undefined; if (!this.#composeDialog) this.#releasePreviews(); this.#clearPollViews(); }
  clear(): void {
    this.#interactions.clear();
    this.#disposeComposer();
    this.#recovery.invalidate(); this.#recoveryHold = false; this.#retiredComments = [];
    this.#postCreated = undefined; this.#postDeleted = undefined;
    this.#observer?.disconnect(); this.#fresh = undefined;
    this.pause(); this.#draft = ""; this.#files = []; this.#spoilerFiles.clear(); this.#pollDraft = null; this.#commentDrafts.clear(); this.#commentAttempts.clear(); this.#commentReplies.clear();
    this.#draftHost.#contentDraftsStore?.releaseSurface(this.element);
    this.#contentDraftsStore?.close();this.#contentDraftsStore=undefined;this.#postSourceMissing=false;
    this.#draftStore?.close(); this.#draftStore = undefined; this.#draftOwner = 0; this.#draftReady = false; this.#draftLoad = undefined; this.#draftVersion++; this.#accountEpoch++;
    this.#uploaded = new WeakMap(); this.#query = ""; this.#filter = this.options.savedOnly ? "saved" : "all";
    this.#clientId = crypto.randomUUID(); this.#pendingPost = undefined; this.element.replaceChildren();
    this.#draftButton = undefined;
    this.#loaded.clear(); this.#discussion.replaceChildren(); this.#discussionSignature = undefined;
  }
  async prepareDraftImport(owner:number):Promise<FeedImportSession> {
    if(owner!==this.ui.options.client.memberNumber || this.#activePosts)throw new Error("Wait for the current Feed post before importing a draft.");
    await this.#loadDraft();const store=this.#draftStore;if(!store)throw new Error("Feed draft storage is unavailable.");await store.flush();
    const version=this.#draftVersion,epoch=this.#accountEpoch;
    const current=()=>this.#draftStore===store && this.#draftOwner===owner && this.ui.options.client.memberNumber===owner && this.#draftVersion===version && this.#accountEpoch===epoch && !this.#activePosts;
    return {current,matches:raw=>{
      if(!current())return false;const saved=parseMetadata(raw),empty=!this.#draft && !this.#files.length && !this.#pollDraft && !this.#pendingPost;
      if(!saved || (!saved.text&&!saved.files.length&&!saved.poll&&!saved.pending))return empty;
      return !saved.pending && !this.#pendingPost && saved.text===this.#draft && saved.clientId===this.#clientId && JSON.stringify(saved.poll)===JSON.stringify(this.#pollDraft) && saved.files.length===this.#files.length && saved.files.every((m,i)=>{const f=this.#files[i]!;return m.name===f.name&&m.type===f.type&&m.size===f.size&&m.lastModified===f.lastModified&&m.spoiler===this.#spoilerFiles.has(f);});
    },invalidate:()=>{
      if(!current())return;store.close();this.#draftStore=undefined;this.#draftOwner=0;this.#draftReady=false;this.#draftLoad=undefined;this.#draftVersion++;this.#releasePreviews();
      this.#draft="";this.#files=[];this.#spoilerFiles.clear();this.#pollDraft=null;this.#pendingPost=undefined;this.#uploaded=new WeakMap();this.#clientId=crypto.randomUUID();
    }};
  }
  #releasePreviews(): void {
    for (const url of this.#previews.values()) URL.revokeObjectURL(url);
    this.#previews.clear();
  }
  #clearPollViews(): void {
    for (const view of this.#pollViews.values()) view.destroy();
    this.#pollViews.clear();
  }
  #removePoll(id: number): void { this.#pollViews.get(id)?.destroy(); this.#pollViews.delete(id); }
  async #loadDraft(): Promise<void> {
    const member = this.ui.options.client.memberNumber;
    if (!member) return;
    if (this.#draftOwner !== member) {
      this.#draftStore?.close(); this.#draftOwner = member; this.#draftReady = false;
      this.#draftStore = new FeedDraftStore(member);
      this.#draftStore.subscribe(() => this.#updateDraftStatus());
      this.#draftLoad = undefined;
    }
    if (this.#draftReady) return;
    if (!this.#draftLoad) {
      const version = this.#draftVersion, store = this.#draftStore!;
      this.#draftLoad = store.load().then(draft => {
        if (this.#draftOwner !== member || this.#draftStore !== store) return;
        this.#draftReady = true;
        if (!draft || version !== this.#draftVersion) return;
        this.#draft = draft.text; this.#clientId = draft.clientId; this.#pollDraft = draft.poll;
        this.#postSourceMissing=!this.#contentDrafts().get(this.#postKey());
        this.#files = draft.files.map(item => item.file);
        this.#spoilerFiles = new Set(draft.files.filter(item => item.spoiler).map(item => item.file));
        this.#pendingPost = draft.pending ? { text: draft.pending.text, clientId: draft.pending.clientId, poll: draft.pending.poll,
          files: draft.pending.files.map(item => item.file), spoilerFiles: draft.pending.files.filter(item => item.spoiler).map(item => item.file),
          ...(draft.pending.mediaIds ? { mediaIds: draft.pending.mediaIds } : {}), ...(draft.pending.spoilerMediaIds ? { spoilerMediaIds: draft.pending.spoilerMediaIds } : {}) } : undefined;
      }).catch(() => { if (this.#draftStore === store) this.#draftReady = true; });
    }
    await this.#draftLoad;
  }
  #saveDraft(surface: CloudFeedView = this): void {
    this.#draftVersion++;
    if (!this.#draftStore || this.#draftOwner !== this.ui.options.client.memberNumber) return;
    const draft: FeedDraft = { text: this.#draft, clientId: this.#clientId, poll: this.#pollDraft,
      files: this.#files.map(file => ({ file, spoiler: this.#spoilerFiles.has(file) })),
      ...(this.#pendingPost ? { pending: { text: this.#pendingPost.text, clientId: this.#pendingPost.clientId, poll: this.#pendingPost.poll,
        files: this.#pendingPost.files.map(file => ({ file, spoiler: this.#pendingPost!.spoilerFiles.includes(file) })),
        ...(this.#pendingPost.mediaIds ? { mediaIds: this.#pendingPost.mediaIds } : {}), ...(this.#pendingPost.spoilerMediaIds ? { spoilerMediaIds: this.#pendingPost.spoilerMediaIds } : {}) } } : {}) };
    try { this.#draftStore.save(draft); } catch { /* The draft stays in this composer when device storage is unavailable. */ }
    if(!this.#postSourceMissing){
      const key=this.#postKey(),source=this.#contentDrafts().get(key)?.source??surface.#contentSource;
      try{this.#contentDrafts().save(key,{action:'create',type:'post',targetId:null,postId:null},source,{text:this.#draft,clientId:this.#clientId,mediaIds:[],...(surface.#features.feedSpoilers?{spoilerMediaIds:[]}:{}),...(this.#pollDraft?{poll:structuredClone(this.#pollDraft)}:{})});}catch{/* Keep the original Feed metadata and attachment bytes even if its source binding cannot be saved. */}
    }
    this.#updateDraftStatus();
  }
  #updateDraftStatus(): void {
    const present = Boolean(this.#draft || this.#files.length || this.#pollDraft || this.#pendingPost);
    const label = present ? "Resume draft" : "Post";
    const buttons = [this.#draftButton];
    if (this.#draftGuest) buttons.push(this.#draftGuest.#draftButton);
    for (const button of buttons) if (button) {
      button.querySelector("span")!.textContent = label;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.disabled = this.#activePosts > 0;
    }
    if (!this.#draftStatus) return;
    this.#draftStatus.textContent = this.#draftStore?.status === "error" ? "Draft could not be fully saved on this device. Keep this page open." : present ? this.#draftStore?.status === "pending" ? "Saving draft…" : "Draft saved on this device" : "";
    this.#draftStatus.dataset.error = String(this.#draftStore?.status === "error");
  }
  async render(features: SocialFeatures = {}, currentHistory = false): Promise<void> {
    this.#readTask = undefined; this.#readAccess = undefined; this.#syncTask = undefined;
    this.#mentions.close();
    this.#stopAsideSizing?.();
    this.#stopObserving(); this.#fresh = undefined;
    this.closeDialogs(); clearTimeout(this.#promotionTimer);
    delete this.element.dataset.focusedPost;
    this.#features = features;
    if (this.#filter === "following" && !features.feedFollowing) this.#filter = features.feedFilters ? "friends" : "all";
    const generation = ++this.#generation;
    const saved = this.options.savedOnly === true;
    const preview = this.options.platformPreview === true;
    const canCompose = !saved || preview && this.#draftHost !== this;
    this.#syncPosts = undefined; this.#postCreated = undefined; this.#postDeleted = undefined;
    if (saved && (!features.feedBookmarks || !features.feedFilters)) {
      this.#loaded.clear(); this.#clearPollViews();
      this.element.replaceChildren(element("div", { className: "kl-cloud-card", role: "status" },
        element("h3", { text: "Saved posts are unavailable" }),
        element("p", { className: "kl-cloud-note", text: "This Cloud connection does not support saved posts yet." })));
      return;
    }
    const drafts = this.#draftHost;
    if (canCompose && (!drafts.#draftReady || drafts.#draftOwner !== this.ui.options.client.memberNumber)) await drafts.#loadDraft();
    if (generation !== this.#generation) return;
    const access = await this.#prepareRead(generation, currentHistory);
    if (!access || generation !== this.#generation) return;
    this.#readAccess = access;
    this.#clearPollViews();
    if (!features.feedFilters && !["all", "mine"].includes(this.#filter)) this.#filter = "all";
    if (!this.#composeDialog) this.#releasePreviews();
    this.#loaded.clear();
    const main = element("div", { className: "kl-feed-main" }, this.#interactionSurface(),this.#contentSurface());
    const preserved = this.#preservedDiscussions(); if (preserved) main.append(preserved);
    const sidebar = saved || preview ? undefined : element("aside", { className: "kl-feed-aside", ariaLabel: "Your KikiLink", tabIndex: 0 },
      element("div", { className: "kl-cloud-card kl-feed-self" },
        this.ui.member(this.ui.options.client.memberNumber, undefined, undefined, true),
        this.ui.button("Edit profile", () => this.options.openOwnProfile(), "edit")),
      element("div", { className: "kl-cloud-card kl-feed-group-link" },
        this.ui.button("Open groups", () => this.options.openGroups(), "users")), this.#discussion);
    this.#renderDiscussions();
    const list = element("div", { className: "kl-feed-posts", ariaLabel: "Posts" });
    const search = element("input", { type: "search", className: "kl-feed-search", placeholder: preview ? "Search posts" : saved ? "Search saved posts or #member" : "Search posts or #member", ariaLabel: saved ? "Search saved posts" : preview ? "Search feed" : "Search posts", maxLength: 100, value: this.#query });
    const searchButton = element("button", { type: "submit", className: "kl-social-button", ariaLabel: "Search", title: "Search posts or #member" }, kikiIcon("search"), preview ? undefined : element("span", { text: "Search" }));
    const clearSearch = preview ? element("button", { type: "button", className: "kl-feed-search-clear", ariaLabel: "Clear search", title: "Clear search", hidden: !search.value }, kikiIcon("close")) : undefined;
    const searchForm = element("form", { className: "kl-feed-search-form", role: "search" }, ...(preview ? [searchButton, search, clearSearch] : [search, searchButton]));
    searchForm.addEventListener("submit", event => {
      event.preventDefault(); this.#query = search.value.trim();
      void this.ui.options.run(() => this.render(this.#features));
    });
    if (clearSearch) {
      bindSearchEscape(searchForm, search, clearSearch);
      search.addEventListener("input", () => { clearSearch.hidden = !search.value; });
      clearSearch.addEventListener("click", () => {
        search.value = "";
        search.focus();
        clearSearch.hidden = true;
        if (!this.#query) return;
        this.#query = "";
        const root = this.element.getRootNode() as Document | ShadowRoot;
        void this.ui.options.run(async () => {
          const rendering = this.render(this.#features);
          const clearing = this.#generation;
          await rendering;
          if (clearing === this.#generation && this.element.isConnected && !this.element.closest("[hidden]") &&
              (!root.activeElement || root.activeElement === document.body || root.activeElement === search))
            this.element.querySelector<HTMLInputElement>(".kl-feed-search")?.focus({ preventScroll: true });
        });
      });
    }
    const filter = element("div", { className: "kl-feed-filter", role: "group", ariaLabel: "Show posts" });
    const filters = [["all", preview ? "All" : "Everyone"], ...(preview && features.feedFollowing ? [["following", "Following"]] : features.feedFilters ? [["friends", "Friends"]] : []), ["mine", "My posts"],
      ...(features.feedFilters && features.feedBookmarks && (!preview || !this.options.openSaved) ? [["saved", "Saved"]] : []), ...(features.feedFilters && features.feedHide ? [["hidden", "Hidden"]] : [])] as Array<[FeedFilter, string]>;
    const additionalFilters: HTMLButtonElement[] = [];
    for (const [key, title] of filters) {
      const button = this.ui.button(title, () => {
        if (key === "saved" && this.options.openSaved) { this.options.openSaved(); return; }
        if (this.#filter === key) return;
        this.#filter = key;
        return preserveSelectionFocus(this.element, () => this.render(this.#features));
      }, undefined, "kl-social-button", false);
      button.setAttribute("aria-pressed", String(this.#filter === key));
      if (preview && key !== "all" && key !== "friends" && key !== "following") additionalFilters.push(button);
      else filter.append(button);
    }
    const resetFilters = () => {
      this.#query = "";
      this.#filter = saved ? "saved" : "all";
      return this.render(this.#features);
    };
    const reset = this.ui.button(preview ? "Clear filters" : saved ? "All saved posts" : "Latest posts", resetFilters, "refresh");
    const filterMenu = preview ? saved ? undefined : this.ui.menu("More Feed filters", [...additionalFilters, reset]) : reset;
    if (preview && additionalFilters.some(button => button.getAttribute("aria-pressed") === "true"))
      filterMenu?.classList.add("kl-feed-more-filter-active");
    const toolbar = element("div", { className: "kl-feed-tools" }, searchForm,
      filterMenu ? element("div", { className: "kl-feed-filter-row" }, saved ? undefined : filter, filterMenu) : undefined);
    const status = element("p", { className: `kl-cloud-note kl-feed-results${preview ? " kl-sr-only" : ""}`, role: "status" });
    const loading = element("div", { className: "kl-feed-loading", role: "status", text: "Loading posts…" });
    let introduction: HTMLElement;
    if (preview) {
      const compose: HTMLButtonElement | undefined = canCompose ? this.ui.button("Post", () => {
        if (generation === this.#generation) this.#draftHost.#openComposer(compose!, this);
      }, "edit", "kl-social-button kl-social-primary", false) : undefined;
      compose?.setAttribute("aria-haspopup", "dialog");
      this.#draftButton = compose; this.#draftHost.#updateDraftStatus();
      let actions: HTMLElement | undefined = compose;
      const openUpcomingEvents = this.options.openUpcomingEvents;
      if (compose && openUpcomingEvents) {
        const client = this.ui.options.client;
        const owner = client.memberNumber, origin = client.origin, epoch = this.#accountEpoch;
        const upcoming = element("button", {
          type: "button",
          className: "kl-social-icon-button kl-feed-upcoming",
          ariaLabel: "Upcoming events",
          title: "Upcoming events",
        }, kikiIcon("calendar"));
        upcoming.setAttribute("aria-haspopup", "dialog");
        const current = () => upcoming.isConnected && this.element.contains(upcoming) && !upcoming.closest("[hidden]")
          && generation === this.#generation && epoch === this.#accountEpoch && !this.#recoveryHold
          && client.connected && owner === client.memberNumber && origin === client.origin;
        upcoming.addEventListener("click", () => { if (current()) openUpcomingEvents(upcoming, current); });
        actions = element("div", { className: "kl-feed-heading-actions" }, compose, upcoming);
      }
      introduction = element("header", { className: "kl-feed-heading" }, element("h1", { text: saved ? "Saved" : "Feed" }), actions);
    } else introduction = saved ? element("div", { className: "kl-cloud-card kl-saved-intro" },
      kikiIcon("bookmark"), element("h3", { text: "Saved posts" })) : this.#composer();
    if (preview) main.prepend(introduction); else main.append(introduction);
    main.append(toolbar, status, list, loading);
    this.element.replaceChildren(main, ...(sidebar ? [sidebar] : []));
    this.refreshContentSurface();
    if (sidebar) this.#sizeAside(sidebar);
    let cursor = 0, total = 0, hasMore = true, busy = false;
    const seen = new Set<number>();
    const matches = (post: CloudPost) => {
      if (this.ui.options.isBlocked(post.author) || (this.#filter === "mine" && post.author !== this.ui.options.client.memberNumber)) return false;
      if (this.#filter === "hidden" ? !post.hidden : post.hidden) return false;
      if (this.#filter === "saved" && !post.bookmarked) return false;
      if (!this.#query) return true;
      const member = /^#\d+$/u.test(this.#query) ? Number(this.#query.slice(1)) : 0;
      const searchable = [post.text, post.profile.displayName, post.community?.name ?? "", post.poll?.question ?? "", ...(post.poll?.options.map(option => option.text) ?? [])].join(" ").normalize("NFKC").toLowerCase();
      return member ? post.author === member : this.#query.normalize("NFKC").toLowerCase().split(/\s+/u)
        .every(word => searchable.includes(word));
    };
    const updateStatus = () => {
      status.textContent = total ? `${total} ${total === 1 ? "post" : "posts"}${this.#query ? ` matching “${this.#query}”` : ""}` : "";
      list.querySelector(".kl-feed-empty")?.remove();
      if (total) return;
      const browseFeed = saved && this.options.openFeed ? this.ui.button("Browse Feed", () => this.options.openFeed!(),
        preview ? undefined : "feed", preview ? "kl-social-button kl-social-primary" : "kl-social-button") : undefined;
      if (preview) {
        list.append(element("div", { className: "kl-feed-empty" }, kikiIcon("feed"),
          element("h2", { text: saved ? "No saved posts" : "No posts found" }),
          saved && !this.#query ? element("p", { text: "Save a post from its menu to keep it here." }) : undefined,
          element("div", { className: "kl-feed-empty-actions" }, this.ui.button("Clear filters", resetFilters), browseFeed)));
        return;
      }
      list.append(element("div", { className: "kl-feed-empty" },
        element("h3", { text: this.#filter === "saved" ? "Your saved posts" : this.#filter === "hidden" ? "Nothing hidden" : this.#filter === "friends" ? "Your friends’ posts" : this.#query || this.#filter === "mine" ? "No matches here yet" : "No posts yet" }),
        this.#query ? element("p", { text: "Search by text or member number." }) : this.#filter === "saved" ? element("p", { text: "Save a post from its menu to keep it here." }) : undefined, browseFeed));
    };
    this.#postDeleted = id => {
      if (!seen.delete(id)) return;
      total--; updateStatus();
      updateFeedPageAction(more, total >= 100, "Load more posts", "Continue to older posts");
    };
    this.#postCreated = post => {
      this.#contentVersion++;
      if (this.#filter === "friends" || this.#filter === "following") { void this.ui.options.run(() => this.sync()); return; }
      if (seen.has(post.id) || !matches(post)) return;
      seen.add(post.id); this.#loaded.set(post.id, post);
      list.querySelector(".kl-feed-empty")?.remove();
      list.prepend(this.#post(post)); total++; this.#orderPosts(list);
      // Update only the post list; replacing the composer or its parent loses
      // keyboard focus and can discard text typed while the request was pending.
      while (total > 100) {
        const last = list.lastElementChild as HTMLElement;
        const id = Number(last.dataset.postId);
        last.remove(); seen.delete(id); this.#loaded.delete(id); this.#removePoll(id); total--;
      }
      updateFeedPageAction(more, total >= 100, "Load more posts", "Continue to older posts");
      updateStatus(); this.#renderDiscussions();
    };
    const load = async () => {
      if (busy || !hasMore || generation !== this.#generation) return;
      busy = true; more.disabled = true; loading.hidden = false;
      const q = this.#filter === "mine" && !this.#features.feedFilters ? `#${this.ui.options.client.memberNumber}` : this.#query;
      const params = new URLSearchParams({ limit: "20", cursor: String(cursor) });
      if (this.#features.feedFilters) params.set("filter", this.#filter);
      if (q && this.#features.feedSearch) params.set("q", q);
      try {
        const page = await access.request<CloudFeedPage>("GET", `/v1/feed?${params}`);
        if (generation !== this.#generation) return;
        // Retain a bounded DOM. Continue explicitly to the next window when full.
        if (total >= 100) {
          for (const [id, post] of this.#loaded) if (!this.#promoted(post)) {
            list.querySelector(`[data-post-id="${id}"]`)?.remove(); this.#loaded.delete(id); seen.delete(id); this.#removePoll(id);
          }
          total = this.#loaded.size;
        }
        for (const post of [...(page.promoted ?? []), ...page.items]) {
          if (seen.has(post.id) || !matches(post)) continue;
          seen.add(post.id);
          this.#loaded.set(post.id, post); list.append(this.#post(post)); total++;
        }
        this.#orderPosts(list); this.#schedulePromotionSync();
        if (cursor === 0 && !this.#query && this.#filter === "all") {
          const newest = Math.max(0, ...this.#loaded.keys());
          if (newest) this.#watchFresh(newest);
        }
        this.#renderDiscussions();
        if (page.nextCursor !== null && (page.nextCursor <= 0 || (cursor > 0 && page.nextCursor >= cursor)))
          throw new CloudError("invalid_cursor");
        cursor = page.nextCursor ?? 0; hasMore = page.nextCursor !== null;
        more.hidden = !hasMore;
        updateFeedPageAction(more, total >= 100, "Load more posts", "Continue to older posts");
        updateStatus();
      } catch (error) {
        if (generation === this.#generation && feedRecoveryConflict(error)) this.#holdFeed();
        else if (generation === this.#generation) throw error;
      } finally {
        busy = false;
        if (generation === this.#generation) { more.disabled = false; loading.hidden = true; }
      }
    };
    const more = pageAction(this.ui.button("Load more posts", load, undefined, "kl-social-button kl-feed-more"));
    main.append(more);
    if (preview && !saved) main.append(element("details", { className: "kl-feed-circle" },
      element("summary", { text: "From your circle" }), this.#discussion));
    this.#syncPosts = async () => {
      if (busy || generation !== this.#generation) return false;
      if (!await this.#prepareRead(generation) || generation !== this.#generation) return true;
      const version = this.#contentVersion;
      const ordinary = [...this.#loaded.values()].filter(post => !this.#promoted(post));
      const oldest = ordinary.length ? Math.min(...ordinary.map(post => post.id)) : 0;
      const incoming = new Map<number, CloudPost>();
      let before = 0, coveredFrom = Infinity, exhausted = false;
      // Revalidate the visible window with at most three bounded pages. An
      // invalidation carries no content and must never trigger media reloads.
      for (let pageNumber = 0; pageNumber < 3; pageNumber++) {
        const params = new URLSearchParams({ limit: "40", cursor: String(before) });
        if (this.#features.feedFilters) params.set("filter", this.#filter);
        const query = this.#filter === "mine" && !this.#features.feedFilters ? `#${this.ui.options.client.memberNumber}` : this.#query;
        if (query && this.#features.feedSearch) params.set("q", query);
        const page = await access.request<CloudFeedPage>("GET", `/v1/feed?${params}`);
        if (generation !== this.#generation || version !== this.#contentVersion) return false;
        for (const post of [...(page.promoted ?? []), ...page.items]) if (matches(post)) incoming.set(post.id, post);
        if (page.nextCursor === null) { exhausted = true; coveredFrom = 0; break; }
        if (page.nextCursor <= 0 || (before > 0 && page.nextCursor >= before)) throw new CloudError("invalid_cursor");
        coveredFrom = page.nextCursor;
        if (!oldest || coveredFrom <= oldest) break;
        before = page.nextCursor;
      }
      if (generation !== this.#generation || version !== this.#contentVersion) return false;
      const scroll = this.element.closest<HTMLElement>(".kl-cloud") ?? this.element;
      const top = scroll.getBoundingClientRect().top;
      const rows = [...list.querySelectorAll<HTMLElement>(".kl-feed-post")];
      const anchor = scroll.scrollTop > 0 ? rows.find(row => row.getBoundingClientRect().bottom > top) : undefined;
      const anchorTop = anchor?.getBoundingClientRect().top;
      const active = (this.element.getRootNode() as Document | ShadowRoot).activeElement;
      let fresh: number | undefined;
      for (const [id, post] of this.#loaded) {
        if (incoming.has(id) || (id < coveredFrom && !post.pinnedAt && !post.featuredUntil)) continue;
        list.querySelector(`[data-post-id="${id}"]`)?.remove();
        this.#loaded.delete(id); this.#removePoll(id); if (seen.delete(id)) total--;
      }
      for (const next of [...incoming.values()].sort((a, b) => b.id - a.id)) {
        const post = this.#loaded.get(next.id);
        if (post) {
          const card = list.querySelector<HTMLElement>(`[data-post-id="${post.id}"]`);
          if (card) this.#patchPost(card, post, next);
        } else if (this.#promoted(next) || (!oldest && total < 20) || next.id > oldest) {
          const after = [...list.children].find(node => Number((node as HTMLElement).dataset.postId) < next.id);
          list.insertBefore(this.#post(next), after ?? null);
          this.#loaded.set(next.id, next); seen.add(next.id); total++;
          fresh = Math.max(fresh ?? 0, next.id);
        }
      }
      this.#orderPosts(list); this.#schedulePromotionSync();
      let trimmedThrough = 0;
      while (total > 100) {
        const tail = [...list.querySelectorAll<HTMLElement>(".kl-feed-post")].reverse()
          .find(row => !this.#promoted(this.#loaded.get(Number(row.dataset.postId))!) && row !== anchor && !row.contains(active) && row.dataset.postId !== (this.#postDialog.element.open ? this.#postDialog.element.dataset.postId : undefined));
        if (!tail) break;
        const id = Number(tail.dataset.postId);
        tail.remove(); this.#loaded.delete(id); this.#removePoll(id); seen.delete(id); total--; trimmedThrough = Math.max(trimmedThrough, id);
      }
      if (trimmedThrough) {
        // A protected reading anchor may sit below the contiguous new window.
        // Continue before the first trimmed row, not after that old anchor.
        cursor = Math.min(...[...this.#loaded.keys()].filter(id => id > trimmedThrough)); hasMore = true;
      } else if (oldest && coveredFrom > oldest) { cursor = coveredFrom; hasMore = true; }
      else if (!oldest || exhausted) {
        cursor = this.#loaded.size ? Math.min(...this.#loaded.keys()) : 0;
        hasMore = !exhausted || [...incoming.keys()].some(id => id < cursor);
      }
      more.hidden = !hasMore;
      updateFeedPageAction(more, total >= 100, "Load more posts", "Continue to older posts");
      updateStatus(); this.#renderDiscussions();
      if (anchor?.isConnected && anchorTop !== undefined) scroll.scrollTop += anchor.getBoundingClientRect().top - anchorTop;
      if ((fresh || (this.#fresh && !this.#loaded.has(this.#fresh))) && !this.#query && this.#filter === "all") {
        const newest = Math.max(0, ...this.#loaded.keys());
        if (newest) this.#watchFresh(newest);
        else { this.#fresh = undefined; this.#stopObserving(); }
      }
      this.observeFresh();
      return true;
    };
    await load();
  }
  #feedMenu(label: string, actions: HTMLElement[]): HTMLElement {
    const menu = this.ui.menu(label, actions) as HTMLDetailsElement;
    if (!this.options.platformPreview) return menu;
    const summary = menu.querySelector("summary")!;
    const items = menu.querySelector<HTMLElement>(".kl-social-menu-items")!;
    let release: (() => void) | undefined;
    const stop = () => {
      release?.();
      release = undefined;
      if (this.#stopMenuTracking === stop) this.#stopMenuTracking = undefined;
    };
    menu.addEventListener("toggle", () => {
      if (!menu.open) { stop(); return; }
      this.#stopMenuTracking?.();
      const scroller = menu.closest<HTMLElement>(".kl-comment-dialog-scroll, .kl-cloud");
      const enabled = () => Boolean(getComputedStyle(items).getPropertyValue("--kl-fit-feed-menu").trim());
      if (scroller && enabled()) {
        this.#stopMenuTracking = stop;
        release = trackMenuPlacement(menu, summary, items, scroller, "--kl-feed-menu-height", enabled);
      }
      if (menu.open) items.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
    });
    return menu;
  }
  #personalPinKey(post: CloudPost): string | undefined {
    const { client } = this.ui.options;
    if (!this.options.platformPreview || !client.connected || post.author !== client.memberNumber || post.pinnedAt || (this.#features.feedPins && this.options.canPin?.())) return;
    const source = this.#contentSource;
    if (source.required && !source.generation) return;
    return ["kikilink:feed:personal-pin:v1", client.origin, client.memberNumber, source.generation ?? "legacy", post.id, post.createdAt].join(":");
  }
  #personallyPinned(post: CloudPost): boolean {
    try { const key = this.#personalPinKey(post); return !!key && localStorage.getItem(key) === "1"; }
    catch { return false; }
  }
  #promoted(post: CloudPost): boolean {
    return Boolean(post.pinnedAt || (post.featuredUntil ?? 0) > Date.now());
  }
  #orderPosts(list: HTMLElement): void {
    const active = (list.getRootNode() as Document | ShadowRoot).activeElement as HTMLElement | null;
    const nodes = [...list.querySelectorAll<HTMLElement>(":scope > .kl-feed-post")];
    const personal = new Set([...this.#loaded.values()].filter(post => this.#personallyPinned(post)).map(post => post.id));
    const rank = (post: CloudPost) => personal.has(post.id) ? 3 : post.pinnedAt ? 2 : this.#promoted(post) ? 1 : 0;
    nodes.sort((a, b) => {
      const left = this.#loaded.get(Number(a.dataset.postId))!, right = this.#loaded.get(Number(b.dataset.postId))!;
      return rank(right) - rank(left) || ((right.pinnedAt ?? 0) - (left.pinnedAt ?? 0)) || right.id - left.id;
    });
    for (const [index, row] of nodes.entries()) if (list.children[index] !== row) list.insertBefore(row, list.children[index] ?? null);
    if (active?.isConnected && list.contains(active) && (list.getRootNode() as Document | ShadowRoot).activeElement !== active) active.focus({ preventScroll: true });
  }
  #highlightPost(card: HTMLElement, post: CloudPost): void {
    if (this.#commentsDialog?.card === card) card = this.#commentsDialog.subject;
    const featured = (post.featuredUntil ?? 0) > Date.now();
    const pinned = Boolean(post.pinnedAt) || this.#personallyPinned(post);
    const changed = card.dataset.pinned !== String(pinned) || card.dataset.featured !== String(featured);
    card.dataset.pinned = String(pinned); card.dataset.featured = String(featured);
    const authorMeta = this.options.platformPreview ? card.querySelector<HTMLElement>(":scope > .kl-feed-post-header .kl-social-meta") : null;
    let badges = (authorMeta ?? card).querySelector<HTMLElement>(":scope > .kl-feed-highlights");
    if (!pinned && !featured) badges?.remove();
    else if (changed || !badges) {
      if (!badges) {
        badges = element("span", { className: "kl-feed-highlights" });
        if (authorMeta) authorMeta.append(badges); else card.prepend(badges);
      }
      badges.replaceChildren();
      if (pinned) badges.append(element("span", {}, kikiIcon("pin"), "Pinned"));
      if (featured) badges.append(element("span", { title: "Most reactions in the preceding 24 hours · featured for 12 hours" }, kikiIcon("star"), "Featured"));
    }
    const personal = card.querySelector<HTMLButtonElement>(".kl-post-personal-pin");
    if (personal) {
      const label = this.#personallyPinned(post) ? "Unpin your post" : "Pin your post";
      personal.hidden = !!post.pinnedAt || !!post.community?.archived;
      personal.setAttribute("aria-label", label); personal.title = label; personal.querySelector("span")!.textContent = label;
    }
    const pin = card.querySelector<HTMLButtonElement>(".kl-post-pin-action");
    if (pin) {
      const label = post.pinnedAt ? "Unpin post" : "Pin post";
      pin.setAttribute("aria-label", label); pin.title = label;
      const text = pin.querySelector("span"); if (text && text.textContent !== label) text.textContent = label;
    }
  }
  #schedulePromotionSync(): void {
    clearTimeout(this.#promotionTimer);
    const expiries = [...this.#loaded.values()].map(post => post.featuredUntil ?? 0).filter(at => at > Date.now());
    if (!expiries.length) return;
    this.#promotionTimer = setTimeout(() => {
      for (const post of this.#loaded.values()) {
        const card = this.element.querySelector<HTMLElement>(`[data-post-id="${post.id}"]`);
        if (card) this.#highlightPost(card, post);
      }
      const list = this.element.querySelector<HTMLElement>(".kl-feed-posts"); if (list) this.#orderPosts(list);
      void this.ui.options.run(() => this.sync());
    }, Math.min(2147483647, Math.max(1, Math.min(...expiries) - Date.now() + 1)));
  }
  #showReactions(anchor: HTMLElement, type: "post" | "comment", id: number): void {
    const access=this.#readAccess;if(!anchor.isConnected||!access?.current())return;
    const dialog = this.#reactionDialog, root = anchor.getRootNode();
    (root instanceof ShadowRoot ? root : document.body).append(dialog.element);
    dialog.element.classList.add("kl-reaction-details-dialog");
    const list = element("div", { className: "kl-reaction-members", ariaLabel: "People who reacted" });
    const status = element("p", { className: "kl-cloud-note", role: "status" });
    let cursor = 0, busy = false, active = true, count = 0;
    const seen = new Set<number>();
    const load = async () => {
      if (!active || busy) return;
      busy = true; more.disabled = true; status.textContent = "Loading reactions…";
      try {
        const page = await access.request<CloudPage<CloudReactionMember>>("GET", `/v1/reactions/${type}/${id}?cursor=${cursor}&limit=40`);
        if (!active || !anchor.isConnected || !access.current()) return;
        if (page.nextCursor !== null && page.nextCursor <= cursor) throw new CloudError("invalid_cursor");
        if (count >= 200) { list.replaceChildren(); seen.clear(); count = 0; }
        for (const item of page.items) {
          if (seen.has(item.memberNumber) || this.ui.options.isBlocked(item.memberNumber) || this.ui.options.client.isProfileBlocked?.(item.memberNumber)) continue;
          seen.add(item.memberNumber); count++;
          const reaction = REACTIONS.find(([key]) => key === item.reaction);
          list.append(element("div", { className: "kl-reaction-member" }, this.ui.author(item.profile),
            element("span", { className: "kl-reaction-member-emoji", ariaLabel: reaction?.[2] ?? item.reaction, role: "img", text: reaction?.[1] ?? "?" })));
        }
        cursor = page.nextCursor ?? cursor; more.hidden = page.nextCursor === null;
        updateFeedPageAction(more, count >= 200, "Load more reactions", "Next reactions");
        status.textContent = !count ? "No reactions to show." : "";
      } catch { if (active) status.textContent = "Could not load reactions. Try again."; }
      finally { busy = false; more.disabled = false; }
    };
    const more = pageAction(this.ui.button("Load more reactions", load));
    const body = element("div", { className: "kl-cloud kl-reaction-details" }, status, list, more);
    anchor.querySelector<HTMLElement>(".kl-social-menu > summary")?.focus({ preventScroll: true });
    dialog.show(this.options.platformPreview ? "Who reacted" : "Reactions", body, () => { active = false; });
    void load();
  }
  #openComposer(anchor: HTMLButtonElement, surface: CloudFeedView): void {
    const client = this.ui.options.client;
    if (!client.connected || this.#draftOwner !== client.memberNumber || !surface.element.contains(anchor) ||
      !surface.#contentCurrent(anchor)() || this.#composeDialog || this.#activePosts) return;
    const dialog = new ContentDialog();
    this.#composeDialog = dialog;
    dialog.element.classList.add("kl-feed-compose-dialog");
    dialog.element.querySelector("button")?.setAttribute("aria-label", "Close post composer");
    dialog.element.addEventListener("keydown", event => {
      if (event.key === "Escape") event.stopPropagation();
    });
    const composer = this.#composer(() => dialog.close(), surface);
    surface.element.append(dialog.element);
    anchor.focus({ preventScroll: true });
    dialog.show("New post", composer, () => {
      dialog.element.remove();
      if (this.#composeDialog !== dialog) return;
      this.#composeDialog = undefined;
      surface.#mentions.close(); this.#releasePreviews(); this.#draftStatus = undefined;
      this.#updateDraftStatus();
    });
    composer.querySelector("textarea")?.focus({ preventScroll: true });
  }
  #disposeComposer(): void {
    const composer = this.#composeDialog;
    composer?.destroy();
    composer?.close();
  }
  #composer(close?: () => void, surface: CloudFeedView = this): HTMLElement {
    const card = element("section", { className: "kl-cloud-card kl-feed-composer", ariaLabel: "Create a post" });
    const features = surface.#features, contentSource = surface.#contentSource;
    const client = this.ui.options.client, origin = client.origin, epoch = this.#accountEpoch;
    const surfaceCurrent = surface.#contentCurrent(card);
    const current = () => surfaceCurrent() && client.connected && client.origin === origin && this.#accountEpoch === epoch;
    const text = element("textarea", { placeholder: "What's on your mind?", ariaLabel: "Share a post", maxLength: close ? Math.max(2000, this.#draft.length) : 4000, value: this.#draft });
    surface.#bindMentions(text);
    const remaining = element("span", { className: "kl-composer-count" });
    const files = element("input", { type: "file", accept: "image/png,image/jpeg,image/webp", multiple: true, hidden: true, ariaLabel: "Attach up to 4 images" });
    const previews = element("div", { className: "kl-feed-attachments" });
    const pollSlot = element("div", { className: "kl-feed-poll-compose" });
    const errorStatus = element("p", { className: "kl-feed-action-error", role: "alert" });
    this.#draftStatus = element("small", { className: "kl-feed-draft-status", role: "status" });
    let posting = false;
    const update = () => {
      if (close) text.maxLength = Math.max(2000, this.#draft.length);
      remaining.textContent = `${this.#draft.length} / ${text.maxLength}`;
      post.disabled = posting || Boolean(contentSource.required&&this.#draftStore?.error) || Boolean(this.#contentDrafts().error) || this.#contentDrafts().blocked(this.#postKey()) || this.#postSourceMissing&&contentSource.required || (!this.#pendingPost && ((!this.#draft.trim() && !this.#files.length && !this.#pollDraft) || !validPollDraft(this.#pollDraft)
        || Boolean(this.#pollDraft && !features.feedPolls) || Boolean(this.#spoilerFiles.size && !features.feedSpoilers)));
      pollButton?.setAttribute("aria-pressed", String(Boolean(this.#pollDraft)));
      if (pollButton) pollButton.disabled = posting;
      discard.disabled = posting || (!this.#draft && !this.#files.length && !this.#pollDraft);
      for (const control of previews.querySelectorAll<HTMLButtonElement>("button")) control.disabled = posting;
      post.title = this.#pendingPost ? "Retry the previous post; new edits stay in your draft" : "Post";
      post.querySelector("span")!.textContent = this.#pendingPost && !posting ? "Retry post" : "Post";
      this.#updateDraftStatus();
    };
    const change = () => { this.#saveDraft(surface); update(); };
    const renderPoll = () => {
      pollSlot.replaceChildren();
      if (!this.#pollDraft) return;
      const draft = structuredClone(this.#pollDraft);
      pollSlot.append(pollEditor(this.ui, draft, () => {
        if (!current() || posting) return;
        this.#pollDraft = structuredClone(draft); change();
      }), this.ui.button("Remove poll", () => {
        if (!current() || posting) return;
        this.#pollDraft = null; renderPoll(); change();
      }, "close"));
    };
    const renderFiles = () => {
      this.#releasePreviews(); previews.replaceChildren();
      for (const file of this.#files) {
        const url = URL.createObjectURL(file); this.#previews.set(file, url);
        const remove = this.ui.button(`Remove ${file.name}`, () => { if (!current() || posting) return; this.#files = this.#files.filter(f => f !== file); this.#spoilerFiles.delete(file); renderFiles(); change(); }, "close", "kl-social-icon-button");
        const attachment = element("div", { className: "kl-feed-attachment" },
          element("div", { className: "kl-feed-attachment-image" }, element("img", { src: url, alt: file.name })), remove);
        if (features.feedSpoilers || this.#spoilerFiles.has(file)) {
          const updateSpoiler = () => {
            const hidden = this.#spoilerFiles.has(file), label = `${hidden ? "Remove spoiler from" : "Mark as spoiler:"} ${file.name}`;
            spoiler.setAttribute("aria-pressed", String(hidden)); spoiler.setAttribute("aria-label", label); spoiler.title = label;
            attachment.dataset.spoiler = String(hidden);
          };
          const spoiler = this.ui.button(`Mark as spoiler: ${file.name}`, () => {
            if (!current() || posting) return;
            if (this.#spoilerFiles.has(file)) this.#spoilerFiles.delete(file); else this.#spoilerFiles.add(file);
            updateSpoiler(); change();
          }, "eye-off", "kl-social-icon-button kl-feed-attachment-spoiler");
          updateSpoiler(); attachment.append(spoiler);
        }
        previews.append(attachment);
      }
      update();
    };
    files.addEventListener("change", () => void this.ui.options.run(() => {
      if (!current() || posting) return;
      const selected = [...(files.files ?? [])]; files.value = "";
      if (this.#files.length + selected.length > 4) {
        if (close) errorStatus.textContent = "Choose up to 4 images for one post.";
        throw new CloudError("too_many_images");
      }
      for (const file of selected) if (!/^image\/(png|jpeg|webp)$/u.test(file.type) || file.size > 5 * 1024 ** 2) {
        if (close) errorStatus.textContent = "Use PNG, JPEG or WebP, up to 5 MiB each.";
        throw new CloudError("image_size_or_type");
      }
      errorStatus.textContent = "";
      this.#files.push(...selected); renderFiles(); change();
    }));
    text.addEventListener("input", () => { if (current()) { this.#draft = text.value; change(); } });
    const post = this.ui.button("Post", async () => {
      if (!current() || posting) return;
      if(this.#postSourceMissing&&contentSource.required)throw new FeedContentError();
      const attempt: PendingFeedPost = this.#pendingPost ?? { text: this.#draft, files: [...this.#files], clientId: this.#clientId,
        poll: this.#pollDraft ? structuredClone(this.#pollDraft) : null, spoilerFiles: this.#files.filter(file => this.#spoilerFiles.has(file)) };
      const owner = client.memberNumber;
      const { text: draft, files: selected, clientId, poll, spoilerFiles } = attempt, pollSnapshot = JSON.stringify(poll);
      text.focus({ preventScroll: true });
      errorStatus.textContent = "";
      posting = true; this.#activePosts++; update();
      let closeAfterPost = false;
      for (const control of pollSlot.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input,select,button")) control.disabled = true;
      const key=this.#postKey(),store=this.#contentDrafts(),source=store.get(key)?.source??contentSource;
      try {
        this.#pendingPost=attempt;this.#saveDraft(surface);
        const payload={text:draft,clientId,mediaIds:[...(attempt.mediaIds??[])],...(features.feedSpoilers?{spoilerMediaIds:[...(attempt.spoilerMediaIds??[])]}:{}),...(poll?{poll}:{})};
        if(!store.get(key))store.save(key,{action:'create',type:'post',targetId:null,postId:null},source,payload);
        store.stage(key,payload,!!attempt.mediaIds);if(source.required)await this.#draftStore?.flush();
        const created=await store.send<CloudPost>(key,current,async original=>{
          const mediaIds:string[]=[],spoilerMediaIds:string[]=[];
          for(const file of selected){
            let asset=this.#uploaded.get(file);
            if(!asset){let intent=this.#imageIntents.get(file);if(!intent){intent=new MediaUploadIntent(this.ui.options.client,file,source.generation);this.#imageIntents.set(file,intent);}
              const uploaded=await intent.send(current,{transport:'request'});if(!current())throw new FeedContentError();asset=uploaded.id;this.#uploaded.set(file,asset);}
            mediaIds.push(asset);if(spoilerFiles.includes(file))spoilerMediaIds.push(asset);
          }
          if(!current())throw new FeedContentError();this.#pendingPost={...attempt,mediaIds,spoilerMediaIds};this.#saveDraft(surface);if(source.required)await this.#draftStore?.flush();
          return {...original,mediaIds,...features.feedSpoilers?{spoilerMediaIds}:{}};
        });
        if(!created)return;
        if (!client.connected || client.memberNumber !== owner || client.origin !== origin || this.#accountEpoch !== epoch || clientId !== this.#clientId) return;
        this.#draft = remainingDraftAfterSend(this.#draft, draft); text.value = this.#draft;
        this.#files = this.#files.filter(file => !selected.includes(file));
        for (const file of selected) this.#spoilerFiles.delete(file);
        if (JSON.stringify(this.#pollDraft) === pollSnapshot) this.#pollDraft = null;
        this.#pendingPost = undefined;
        this.#clientId = crypto.randomUUID();
        if (!this.#draft && !this.#files.length && !this.#pollDraft) {
          this.#draftVersion++; await this.#draftStore?.clear();
        } else {this.#saveDraft(surface);await this.#draftStore?.flush();}
        store.complete(key);
        closeAfterPost = Boolean(close && !this.#draft && !this.#files.length && !this.#pollDraft);
        if (card.isConnected && !closeAfterPost) { renderFiles(); renderPoll(); }
        if (surface === this || !this.#recoveryHold && this.#readAccess?.current() && this.#filter !== "friends" &&
          JSON.stringify(this.#contentSource) === JSON.stringify(contentSource)) this.#postCreated?.(created);
      } catch (error) {
        // The durable original request remains until a verified result or explicit discard.
        if (close) errorStatus.textContent = error instanceof FeedContentError ? error.message : "Could not confirm the post. Your draft is kept. Retry when ready.";
        throw error;
      } finally {
        posting = false; this.#activePosts--;
        for (const control of pollSlot.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input,select,button")) {
          const label = control.getAttribute("aria-label"), count = this.#pollDraft?.options.length ?? 0;
          control.disabled = label === "Add option" ? count >= 6 : Boolean(label?.startsWith("Remove option ") && count <= 2);
        }
        if (current()) update();
        else this.#updateDraftStatus();
        if (closeAfterPost && card.isConnected) close?.();
      }
    }, "send", "kl-social-button kl-social-primary", false);
    const attach = this.ui.button(close ? "Images" : "Photo", () => { if (current()) files.click(); }, "image");
    const pollButton = features.feedPolls ? this.ui.button("Poll", () => {
      if (!current() || posting) return;
      if (!this.#pollDraft) this.#pollDraft = { question: "", options: ["", ""], multiple: false, closesAt: Date.now() + 86_400_000 };
      renderPoll(); change(); pollSlot.querySelector<HTMLInputElement>("input")?.focus();
    }, "poll") : undefined;
    const spoiler = features.feedSpoilers && !close ? this.ui.button("Spoiler text", () => { if (current()) insertSpoiler(text); }, "eye-off") : undefined;
    const discard = this.ui.button("Discard draft", () => void this.ui.confirm(card, "Discard this saved draft and its attachments? This does not undo a post that may already be on the server.", async () => {
      if (!current() || posting) return;
      const key=this.#postKey(),store=this.#contentDrafts();
      this.#activePosts++; posting = true; text.disabled = true; update();
      try {
        await this.#draftStore?.clear();await store.discard(key);
        if (!store.identity() || this.#accountEpoch !== epoch || this.#postKey() !== key) return;
        this.#postSourceMissing=false; this.#draft = ""; this.#files = []; this.#spoilerFiles.clear(); this.#pollDraft = null;
        this.#clientId = crypto.randomUUID(); this.#pendingPost = undefined; this.#draftVersion++;
        if (current()) { text.value = ""; renderFiles(); renderPoll(); }
      } finally {
        this.#activePosts--; posting = false; text.disabled = false;
        if (current()) update(); else this.#updateDraftStatus();
      }
    }, "Discard"), "trash", "kl-social-button kl-feed-discard");
    text.addEventListener("keydown", event => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); if (!post.disabled) post.click(); }
    });
    if(this.#postSourceMissing&&contentSource.required){
      const review=element('div',{className:'kl-cloud-note'},element('p',{text:this.#pendingPost?'We could not identify the Feed used for this older send attempt. Your text and images are kept. Discard the uncertain attempt before preparing a new post.':'Review this saved draft and its attachments before using it in the current Feed.'}));
      review.append(this.ui.button(this.#pendingPost?'Discard older send attempt':'Use reviewed draft in current Feed',()=>void this.ui.confirm(review,this.#pendingPost?'The previous post may already exist. Discard only its send attempt and keep the draft?':'Use this reviewed draft as a new post in the current Feed?',async()=>{
        if(!current()||posting)return;this.#pendingPost=undefined;this.#clientId=crypto.randomUUID();this.#uploaded=new WeakMap();this.#postSourceMissing=false;this.#saveDraft(surface);await this.#draftStore?.flush();if(current())await surface.render(features);
      },'Continue'),'check'));card.append(review);
    }
    const tools = element("div", { className: "kl-feed-compose-tools", role: "group", ariaLabel: "Add to your post" }, attach, pollButton, spoiler, files);
    const draftRow = element("div", { className: "kl-feed-draft-row" }, this.#draftStatus, discard);
    const author = this.ui.member(this.ui.options.client.memberNumber, undefined, undefined, true);
    if (close) card.append(author, element("div", { className: "kl-feed-compose-field" }, text,
      element("div", { className: "kl-feed-compose-actions" }, tools, remaining)), errorStatus, previews, pollSlot, draftRow,
      element("footer", { className: "kl-feed-compose-footer" }, this.ui.button("Cancel", close), post));
    else card.append(author, text, previews, pollSlot, element("div", { className: "kl-feed-compose-actions" }, tools,
      element("div", { className: "kl-feed-compose-submit" }, remaining, post)), draftRow);
    if ((!features.feedPolls && this.#pollDraft) || (!features.feedSpoilers && this.#spoilerFiles.size))
      card.append(element("p", { className: "kl-cloud-note", text: "This saved draft uses features not available on this Cloud yet. You can remove its poll or spoiler markings to post." }));
    renderFiles(); renderPoll(); return card;
  }
  #interactionSurface():HTMLElement {
    const generation=this.#generation,epoch=this.#accountEpoch;
    return this.#interactions.surface(this.ui,()=>this.element.isConnected&&!this.element.closest('[hidden]')&&this.#generation===generation&&this.#accountEpoch===epoch,()=>this.render(this.#features));
  }
  async #interact<T>(anchor:HTMLElement,source:FeedInteractionSource,target:FeedInteractionTarget,data:Record<string,unknown>):Promise<T|undefined> {
    const generation=this.#generation,epoch=this.#accountEpoch,access=this.#readAccess;
    const current=()=>anchor.isConnected&&!anchor.closest('[hidden]')&&this.#generation===generation&&this.#accountEpoch===epoch&&!this.#recoveryHold&&!!access?.current();
    return this.#interactions.perform<T>(target,source,data,current);
  }
  #post(post: CloudPost): HTMLElement {
    const source={...this.#interactionSource};
    const reportSource=this.#readAccess?.generation?this.#readAccess:this.#reportSource;
    const card = element("article", { className: "kl-cloud-card kl-feed-post" });
    card.dataset.postId = String(post.id);
    const author = this.ui.author(post.profile, post.createdAt, undefined, true);
    const stamp = author.querySelector("time");
    if (this.options.platformPreview && stamp) bindClockText(stamp, post.createdAt, "short-date-and-time");
    card.append(element("header", { className: "kl-feed-post-header" }, author),
      element("p", { className: "kl-feed-post-text" }));
    this.#updatePostText(card, post);
    this.#updatePostCommunity(card, post);
    const actions: HTMLElement[] = [];
    let quickSave: HTMLButtonElement | undefined;
    const copy = this.ui.button("Copy text", async () => {
      if (!navigator.clipboard?.writeText) throw new CloudError("clipboard_unavailable");
      await navigator.clipboard.writeText(post.text);
      copy.querySelector("span")!.textContent = "Copied";
    }, "copy");
    actions.push(copy);
    const preference = (key: "bookmark" | "watch" | "hide", field: "bookmarked" | "watching" | "hidden", icon: "bookmark" | "notifications" | "eye-off", on: string, off: string) => {
      const button = this.ui.button(post[field] ? on : off, async () => {
        const epoch = this.#accountEpoch;
        const next = await this.#interact<CloudPost>(card,source,{action:key,type:"post",id:post.id,label:`${post[field]?on:off} · post #${post.id}`},{[field]:!post[field]});
        if(!next)return;
        if (epoch !== this.#accountEpoch || !card.isConnected || !this.ui.options.client.connected) return;
        this.#contentVersion++; this.#patchPost(card, post, next);
        const disappears = key === "hide" || (key === "bookmark" && this.#filter === "saved" && !next.bookmarked);
        if (!disappears || this.element.dataset.focusedPost === "true") return;
        const parent = card.parentElement;
        const notice = element("div", { className: "kl-feed-undo", role: "status" }, element("span", { text: key === "hide" ? next.hidden ? "Post hidden from your Feed." : "Post restored to your Feed." : "Post removed from Saved." }));
        if (key === "hide" || key === "bookmark") notice.append(this.ui.button("Undo", async () => {
          const restored = await this.#interact<CloudPost>(notice,source,{action:key,type:"post",id:post.id,label:`Undo ${key} · post #${post.id}`},{[field]:!next[field]});
          if(!restored)return;
          if (epoch !== this.#accountEpoch || !this.ui.options.client.connected) return;
          this.#contentVersion++; notice.remove(); this.#postCreated?.(restored);
        }, "back"));
        notice.append(this.ui.button("Dismiss", () => notice.remove(), "close", "kl-social-icon-button"));
        parent?.querySelector(".kl-feed-undo")?.remove(); card.before(notice);
        card.remove(); this.#loaded.delete(post.id); this.#postDeleted?.(post.id); this.#pollViews.get(post.id)?.destroy(); this.#pollViews.delete(post.id); this.#renderDiscussions();
        notice.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
      }, icon);
      button.dataset.feedPreference = field; button.dataset.onLabel = on; button.dataset.offLabel = off;
      button.setAttribute("aria-pressed", String(Boolean(post[field])));
      if (key === "bookmark" && this.options.platformPreview) {
        button.classList.replace("kl-social-button", "kl-social-icon-button");
        button.classList.add("kl-feed-quick-save");
        quickSave = button;
      } else actions.push(button);
    };
    if (this.#features.feedBookmarks) preference("bookmark", "bookmarked", "bookmark", "Unsave post", "Save post");
    if (this.#features.feedWatch) preference("watch", "watching", "notifications", "Unfollow comments", "Follow comments");
    if (this.#features.feedHide) preference("hide", "hidden", "eye-off", "Restore post", "Hide post");
    if (!this.options.platformPreview && this.#features.reactionDetails) actions.push(this.ui.button("Reactions", () => this.#showReactions(card, "post", post.id), "reactions"));
    const canPin = this.#features.feedPins && this.options.canPin?.();
    if (canPin) {
      const pin = this.ui.button(post.pinnedAt ? "Unpin post" : "Pin post", async () => {
        const next = await this.#interact<CloudPost>(card,source,{action:"pin",type:"post",id:post.id,label:`${post.pinnedAt?"Unpin":"Pin"} post #${post.id}`},{pinned:!post.pinnedAt});
        if(!next)return;
        if (!card.isConnected) return;
        this.#contentVersion++; this.#patchPost(card, post, next);
        const list = card.closest<HTMLElement>(".kl-feed-posts"); if (list) this.#orderPosts(list);
      }, "pin");
      pin.classList.add("kl-post-pin-action", "kl-feed-write"); actions.push(pin);
    }
    if (post.author === this.ui.options.client.memberNumber) {
      actions.push(this.ui.button("Edit post", () => this.#postAction(card, post, "edit"), "edit", "kl-social-button kl-feed-write", false),
        this.ui.button("Delete post", () => this.#postAction(card, post, "delete"), "trash", "kl-social-button kl-feed-write kl-social-danger", false));
    } else actions.push(this.ui.button("Report post", () => this.options.report(card, "post", String(post.id), reportSource), "warning"),
      this.ui.button("Block author", () => confirmCloudBlock(this.ui,card,post.author,()=>card.isConnected&&!this.#recoveryHold,async()=>{await this.render(this.#features);}), "lock"));
    if (this.options.platformPreview) {
      const open = this.ui.button("Open conversation", () => comments.click(), "chat", "kl-social-button", false);
      const who = this.ui.button("Who reacted", () => this.#showReactions(card, "post", post.id), "users");
      who.disabled = !this.#features.reactionDetails;
      const primary: HTMLElement[] = [open, who];
      if (quickSave) {
        const label = post.bookmarked ? "Remove from saved" : "Save post";
        const save = this.ui.button(label, () => quickSave?.click(), "bookmark", "kl-social-button", false);
        Object.assign(save.dataset, { feedPreference: "bookmarked", onLabel: "Remove from saved", offLabel: "Save post" });
        primary.push(save);
      }
      const use = (original: string, label: string) => {
        const action = actions.find(node => node.getAttribute("aria-label") === original);
        if (!action) return;
        actions.splice(actions.indexOf(action), 1);
        action.setAttribute("aria-label", label); action.title = label; action.querySelector("span")!.textContent = label;
        primary.push(action);
      };
      if (post.author === this.ui.options.client.memberNumber) {
        use("Edit post", "Edit post");
        if (!canPin) {
          const current = this.#contentCurrent(card);
          primary.push(this.ui.button("Pin your post", () => {
            const key = this.#personalPinKey(post);
            if (!key || !current() || post.community?.archived) return;
            if (this.#personallyPinned(post)) localStorage.removeItem(key); else localStorage.setItem(key, "1");
            this.#highlightPost(card, post);
            const list = card.closest<HTMLElement>(".kl-feed-posts"); if (list) this.#orderPosts(list);
          }, "pin", "kl-social-button kl-feed-write kl-post-personal-pin"));
        }
        use("Delete post", "Delete post…");
      } else use("Report post", "Report post…");
      card.firstElementChild!.append(this.#feedMenu("Post options", [...primary, ...actions]));
    } else card.firstElementChild!.append(this.#feedMenu("Post options", actions));
    this.#postMedia(card, post.mediaIds, post.spoilerMediaIds);
    this.#postPoll(card, post);
    const comments = this.ui.button(`Comments${post.commentCount !== undefined ? ` · ${post.commentCount}` : ""}`, async () => {
      const open = card.querySelector(".kl-cloud-comments");
      if (open) { if (this.#commentsDialog?.card === card) this.#commentsDialog.close(); else open.remove(); comments.setAttribute("aria-expanded", "false"); return; }
      comments.setAttribute("aria-expanded", "true"); await this.#comments(card, post.id);
    }, "chat", "kl-social-button", !this.options.platformPreview);
    comments.setAttribute("aria-expanded", "false");
    if (this.options.platformPreview) comments.setAttribute("aria-haspopup", "dialog");
    comments.classList.add("kl-post-comments-button");
    if (this.options.platformPreview && post.commentCount !== undefined) comments.querySelector("span")!.textContent = String(post.commentCount);
    const footer = element("footer", { className: "kl-feed-post-actions" }, this.#reactions("post", post.id, post.reactions), comments, quickSave);
    card.append(footer); this.#highlightPost(card, post); this.#setPostArchive(card, post); return card;
  }
  #postPoll(card: HTMLElement, post: CloudPost): void {
    let poll = this.#pollViews.get(post.id);
    if (!post.poll) { poll?.destroy(); poll?.element.remove(); this.#pollViews.delete(post.id); return; }
    if (poll) { poll.update(post.poll, Boolean(post.community?.archived)); if (!card.contains(poll.element)) card.insertBefore(poll.element, card.querySelector(":scope > .kl-feed-post-actions")); return; }
    const source={...this.#interactionSource};
    poll = new FeedPollView(this.ui, post.poll, async optionIds => {
      const next = await this.#interact<CloudPost>(card,source,{action:"vote",type:"post",id:post.id,label:`Vote · post #${post.id}`,choiceLabel:optionIds.length?"Answers: "+post.poll!.options.filter(option=>optionIds.includes(option.id)).map(option=>option.text).join(", "):"Remove vote"},{optionIds:[...optionIds].sort((a,b)=>a-b)});
      if(!next)return;
      if (!card.isConnected || !this.ui.options.client.connected) return;
      this.#contentVersion++; this.#patchPost(card, post, next);
    }, this.options.platformPreview, this.#features.feedPollClose && post.author === this.ui.options.client.memberNumber
      ? anchor => this.#confirmClosePoll(card, post, source, anchor) : undefined, Boolean(post.community?.archived));
    this.#pollViews.set(post.id, poll); card.insertBefore(poll.element, card.querySelector(":scope > .kl-feed-post-actions"));
  }
  #confirmClosePoll(card: HTMLElement, post: CloudPost, source: FeedInteractionSource, anchor: HTMLButtonElement): void {
    const dialog = this.#postDialog;
    if (dialog.element.open || !anchor.isConnected || !post.poll || post.poll.closed || post.community?.archived) return;
    const current = this.#contentCurrent(card);
    if (!current()) return;
    const root = card.getRootNode();
    (root instanceof ShadowRoot ? root : document.body).append(dialog.element);
    dialog.element.classList.add("kl-feed-action-dialog");
    dialog.element.querySelector("button")?.setAttribute("aria-label", "Close confirmation");
    const status = element("p", { className: "kl-feed-action-error", role: "alert" });
    const cancel = this.ui.button("Keep open", () => dialog.close(), undefined, "kl-text-button", false);
    const confirm = this.ui.button("Close poll", async () => {
      if (confirm.disabled || !current() || !dialog.element.open) return;
      confirm.disabled = true;
      try {
        const next = await this.#interact<CloudPost>(card, source, {action:"closePoll",type:"post",id:post.id,label:"Close poll"}, {});
        if (!current()) return;
        if (!next) {
          status.textContent = "Review the unfinished action in Feed before trying again.";
          return;
        }
        const returnFocus = dialog.element.open && dialog.body.contains(confirm);
        if (returnFocus) dialog.close();
        this.#contentVersion++;
        this.#patchPost(card, post, next);
        if (returnFocus) {
          const question = card.querySelector<HTMLElement>(".kl-feed-poll h3, .kl-feed-poll h4");
          if (question) { question.tabIndex = -1; question.focus({ preventScroll: true }); }
        }
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Could not close the poll.";
      } finally { confirm.disabled = false; }
    }, undefined, "kl-text-button kl-danger", false);
    anchor.focus({ preventScroll: true });
    dialog.show("Close this poll?", element("div", { className: "kl-cloud kl-feed-action-body" },
      element("p", { text: "Its current results will stay visible. No further votes can be added or changed." }),
      status, element("div", { className: "kl-dialog-actions" }, cancel, confirm)));
    cancel.focus({ preventScroll: true });
  }
  #postMedia(card: HTMLElement, ids: string[], spoilerIds: string[] = []): void {
    let images = card.querySelector<HTMLElement>(":scope > .kl-feed-media");
    if (!ids.length) { images?.remove(); return; }
    if (!images) {
      images = element("div", { className: "kl-cloud-images kl-feed-media" });
      card.insertBefore(images, card.querySelector(":scope > .kl-feed-post-actions"));
    }
    images.dataset.count = String(ids.length);
    const existing = new Map([...images.children].map(node => [(node as HTMLElement).dataset.assetId, node]));
    for (const id of ids) {
      const spoiler = spoilerIds.includes(id);
      let node = existing.get(id) as HTMLElement | undefined;
      if (!node || node.dataset.spoiler !== String(spoiler)) {
        node?.remove(); node = element("div", { className: "kl-feed-media-slot" });
        node.dataset.assetId = id; node.dataset.spoiler = String(spoiler);
        const slot = node;
        if (spoiler) {
          const reveal = this.ui.button("Reveal image spoiler", () => {
            slot.dataset.revealed = "true"; slot.replaceChildren(this.ui.options.image(id, "Feed image"));
          }, "eye-off", "kl-social-button kl-feed-spoiler-reveal");
          slot.append(reveal);
        } else slot.append(this.ui.options.image(id, "Feed image"));
      }
      images.append(node); existing.delete(id);
    }
    for (const node of existing.values()) node.remove();
  }
  #patchPost(card: HTMLElement, post: CloudPost, next: CloudPost): void {
    if (next.revision < post.revision) return;
    const archiveChanged = Boolean(post.community?.archived) !== Boolean(next.community?.archived);
    if (this.#commentsDialog?.card === card) {
      if (archiveChanged) this.#commentsDialog.close();
      else card = this.#commentsDialog.subject;
    }
    const textChanged = next.text !== post.text || next.updatedAt !== post.updatedAt;
    const mediaChanged = JSON.stringify([next.mediaIds, next.spoilerMediaIds]) !== JSON.stringify([post.mediaIds, post.spoilerMediaIds]);
    const author = card.querySelector<HTMLElement>(".kl-social-author");
    if (author) this.ui.updateAuthor(author, next.profile);
    const reactions = card.querySelector<HTMLElement>(":scope > .kl-feed-post-actions > .kl-reactions");
    if (reactions && reactions.dataset.snapshot !== JSON.stringify(next.reactions) &&
        !reactions.matches(":focus-within") && !reactions.querySelector("details[open]"))
      reactions.replaceWith(this.#reactions("post", next.id, next.reactions));
    const communityChanged = next.community?.id !== post.community?.id || next.community?.name !== post.community?.name;
    Object.assign(post, next);
    if (!next.community) delete post.community;
    if (communityChanged || archiveChanged) this.#updatePostCommunity(card, post);
    this.#highlightPost(card, post);
    for (const button of card.querySelectorAll<HTMLButtonElement>("[data-feed-preference]")) {
      const value = post[button.dataset.feedPreference as "bookmarked" | "watching" | "hidden"];
      const label = (value ? button.dataset.onLabel : button.dataset.offLabel)!;
      button.title = label; button.setAttribute("aria-label", label); button.setAttribute("aria-pressed", String(Boolean(value))); button.querySelector("span")!.textContent = label;
    }
    if (textChanged) this.#updatePostText(card, post);
    if (mediaChanged) this.#postMedia(card, post.mediaIds, post.spoilerMediaIds);
    this.#postPoll(card, post);
    this.#commentCount(card, post.id, 0, false);
    this.#setPostArchive(card, post);
  }
  #setPostArchive(card: HTMLElement, post: CloudPost): void {
    const archived = Boolean(post.community?.archived);
    card.dataset.communityArchived = String(archived);
    for (const control of card.querySelectorAll<HTMLElement>(".kl-feed-write, .kl-reactions")) control.inert = archived;
  }
  #updatePostCommunity(card: HTMLElement, post: CloudPost): void {
    card.querySelector(":scope > .kl-feed-community")?.remove();
    card.querySelector(":scope > .kl-feed-archive-note")?.remove();
    const community = post.community;
    if (!community) return;
    const open = this.options.openCommunity;
    const row = open
      ? this.ui.button(community.name, () => { if (card.isConnected) open(community.id); }, "users", "kl-feed-community", false)
      : element("span", { className: "kl-feed-community" }, kikiIcon("users"), community.name);
    card.querySelector(":scope > header")?.after(row);
    if (community.archived) row.after(element("p", { className: "kl-cloud-note kl-feed-archive-note", text: "Archived · changes paused" }));
  }
  #updatePostText(card: HTMLElement, post: CloudPost): void {
    const body = card.querySelector<HTMLElement>(".kl-feed-post-text")!;
    const collapsed = body.dataset.collapsed === "true" || body.textContent!.length <= 500;
    body.replaceChildren(); this.#formatMentionBody(body, post);
    card.querySelector(":scope > .kl-feed-expand")?.remove();
    if (post.text.length > 500 && collapsed) {
      body.dataset.collapsed = "true";
      const expand = this.ui.button("Read more", () => { delete body.dataset.collapsed; expand.remove(); });
      expand.classList.add("kl-feed-expand"); body.after(expand);
    } else delete body.dataset.collapsed;
    if (post.updatedAt > post.createdAt) {
      const authorMeta = this.options.platformPreview ? card.querySelector(":scope > .kl-feed-post-header .kl-social-meta") : null;
      if ((authorMeta ?? card).querySelector(":scope > .kl-social-edited")) return;
      const edited = element("small", { className: "kl-social-edited", text: "Edited" });
      if (authorMeta) authorMeta.querySelector("time")?.after(edited); else body.after(edited);
    }
  }
  #postAction(card: HTMLElement, post: CloudPost, kind: "edit" | "delete"): void {
    const dialog = this.#postDialog, client = this.ui.options.client;
    if (dialog.element.open || post.author !== client.memberNumber) return;
    const root = card.getRootNode(), generation = this.#generation;
    const revision = post.revision, initialText = post.text,source={...this.#contentSource},key=`${kind}:post:${post.id}`,store=this.#contentDrafts();
    const saved=store.get(key),savedText=saved&&JSON.stringify(saved.source)===JSON.stringify(source)&&typeof saved.data.text==='string'?saved.data.text:post.text;
    const spoilerMediaIds = new Set(saved&&JSON.stringify(saved.source)===JSON.stringify(source)&&Array.isArray(saved.data.spoilerMediaIds)?saved.data.spoilerMediaIds as string[]:post.spoilerMediaIds ?? []), initialSpoilers = JSON.stringify(post.spoilerMediaIds??[]);
    (root instanceof ShadowRoot ? root : document.body).append(dialog.element);
    dialog.element.classList.add("kl-feed-action-dialog");
    dialog.element.dataset.postId = String(post.id);
    dialog.element.querySelector("button")?.setAttribute("aria-label", kind === "edit" ? "Close post editor" : "Close delete confirmation");
    const field = kind === "edit" ? element("textarea", { value: savedText, maxLength: this.options.platformPreview ? Math.max(2000, savedText.length) : 4000, ariaLabel: "Post text" }) : undefined;
    if (field) this.#bindMentions(field, () => (post.mentions ?? []).map(m => m.memberNumber));
    const status = element("p", { className: "kl-feed-action-error", role: "alert" });
    const mediaOptions = element("div", { className: "kl-feed-edit-media" });
    let busy = false, active = true;
    const payload=()=>({text:field?.value??'',mediaIds:[...post.mediaIds],revision,...this.#features.feedSpoilers?{spoilerMediaIds:[...spoilerMediaIds]}:{}});
    const remember=()=>{if(!field)return;try{store.save(key,{action:'edit',type:'post',targetId:post.id,postId:post.id,preview:initialText},source,payload());}catch(error){status.textContent=error instanceof Error?error.message:'Could not save this draft.';}};
    const update = () => {
      submit.disabled = busy || store.blocked(key) || Boolean(field && ((field.value === initialText && JSON.stringify([...spoilerMediaIds]) === initialSpoilers) || (!field.value.trim() && !post.mediaIds.length && !post.poll)));
      if (field) field.readOnly = busy;
      for (const input of mediaOptions.querySelectorAll("input")) input.disabled = busy;
      form.setAttribute("aria-busy", String(busy));
    };
    const cancel = this.ui.button("Cancel", () => dialog.close());
    const submit = this.ui.button(kind === "edit" ? "Save changes" : "Delete post", async () => {
      if (busy) return;
      busy = true; status.textContent = ""; update();
      try {
        if (field) {
          const next=await this.#writeContent<CloudPost>(form,key,{action:'edit',type:'post',targetId:post.id,postId:post.id,preview:initialText},source,payload());if(!next)return;
          store.complete(key);
          this.#contentVersion++;
          if (generation === this.#generation && card.isConnected && client.connected && client.memberNumber === post.author && next.revision > post.revision) {
            // Keep decoded images, comments and reactions mounted. Later edits
            // use the acknowledged revision, including after closing the modal.
            this.#patchPost(card, post, next); this.#loaded.set(post.id, post); this.#renderDiscussions();
          }
          if (active) dialog.close();
        } else {
          const result=await this.#writeContent(form,key,{action:'delete',type:'post',targetId:post.id,postId:post.id,preview:initialText},source,{revision});if(!result)return;
          store.complete(key);
          this.#contentVersion++;
          const focus = card.nextElementSibling?.querySelector<HTMLElement>("summary") ?? card.previousElementSibling?.querySelector<HTMLElement>("summary") ?? this.element.querySelector<HTMLElement>(".kl-feed-search");
          if (generation === this.#generation && card.isConnected && client.connected && client.memberNumber === post.author) {
            card.remove(); this.#loaded.delete(post.id); this.#postDeleted?.(post.id); this.#pollViews.get(post.id)?.destroy(); this.#pollViews.delete(post.id); this.#renderDiscussions();
          }
          if (active) { dialog.close(); focus?.focus({ preventScroll: true }); }
        }
      } catch (error) {
        const code = error instanceof CloudError ? error.code : "network_error";
        const explanations: Record<string, string> = {
          revision_conflict: "This post changed in another session. Copy your changes before refreshing Feed.",
          owner_required: "Only the author can edit or delete this post.",
          not_found: "This post is no longer available. Close this window and refresh Feed.",
          authentication_required: "Reconnect to Cloud with the account that created this post, then try again.",
          session_expired: "Your Cloud session expired. Reconnect, then try again.",
          rate_limited: "Too many requests. Wait a moment, then try again.",
        };
        status.textContent = explanations[code] ?? `${field ? "Could not save this post. Your changes are still here." : "Could not delete this post."} Try again (${code.replace(/[^a-z_]/gu, "").slice(0, 60)}).`;
      } finally { busy = false; update(); }
    }, kind === "edit" ? "check" : "trash", kind === "edit" ? "kl-social-button kl-social-primary" : "kl-social-button kl-social-danger", false);
    if (field && this.#features.feedSpoilers) for (const [index, id] of post.mediaIds.entries()) {
      const input = element("input", { type: "checkbox", ariaLabel: `Image ${index + 1} is a spoiler` }); input.checked = spoilerMediaIds.has(id);
      input.addEventListener("change", () => { if (input.checked) spoilerMediaIds.add(id); else spoilerMediaIds.delete(id); remember();update(); });
      mediaOptions.append(element("label", { className: "kl-feed-check" }, input, `Image ${index + 1} · Spoiler`));
    }
    const form = element("div", { className: "kl-cloud-card kl-feed-action-form" },
      ...(field ? [field] : [element("p", { text: "Delete this post and its comments? This cannot be undone." })]),
      ...(field ? [mediaOptions, ...(post.poll ? [element("p", { className: "kl-cloud-note", text: "Your poll and votes are preserved. Published poll questions and answers cannot be changed." })] : [])] : []),
      status, element("div", { className: "kl-cloud-actions" }, cancel, submit));
    field?.addEventListener("input",()=>{remember();update();}); update();
    // The action lives in a collapsed menu; return to its visible trigger.
    card.querySelector<HTMLElement>('.kl-social-menu > summary')?.focus({ preventScroll: true });
    dialog.show(kind === "edit" ? "Edit post" : "Delete post?", form, () => { active = false; this.#mentions.close(); });
    (field ?? cancel).focus({ preventScroll: true });
  }
  #reactions(type: "post" | "comment", id: number, initial: CloudReactions): HTMLElement {
    const source={...this.#interactionSource};
    const root = element("div", { className: "kl-reactions" });
    let state = initial, busy = false;
    const allowed = this.#features.reactions ?? ["heart", "like", "laugh", "support"];
    const react = async (reaction: Reaction) => {
      if (busy) return;
      busy = true; root.setAttribute("aria-busy", "true");
      for (const button of root.querySelectorAll<HTMLButtonElement>("button")) button.disabled = true;
      try {
        const next=await this.#interact<CloudReactions>(root,source,{action:"reaction",type,id,label:`Reaction · ${type} #${id}`,choiceLabel:state.mine===reaction?"Remove reaction":"Reaction: "+(REACTIONS.find(([key])=>key===reaction)?.[2]??reaction)},{reaction:state.mine===reaction?null:reaction});
        if(!next)return;state=next;
        this.#contentVersion++;
        if (type === "post") { const post = this.#loaded.get(id); if (post) post.reactions = state; this.#renderDiscussions(); }
        if (root.isConnected) {
          const active = (root.getRootNode() as Document | ShadowRoot).activeElement, ownedFocus = !!active && root.contains(active);
          render();
          if (ownedFocus) (root.querySelector<HTMLElement>(`:scope > [data-reaction="${reaction}"]`) ?? root.querySelector<HTMLElement>("summary"))?.focus({ preventScroll: true });
        }
      } finally {
        busy = false; root.removeAttribute("aria-busy");
        for (const button of root.querySelectorAll<HTMLButtonElement>("button")) button.disabled = false;
      }
    };
    const reactionButton = (key: Reaction, emoji: string, label: string, count?: number) => {
      const button = this.ui.button(label, () => react(key), undefined, "kl-reaction");
      button.replaceChildren(element("span", { text: emoji, ariaHidden: "true" }), ...(count ? [element("span", { text: String(count) })] : []));
      button.setAttribute("aria-pressed", String(state.mine === key));
      button.dataset.reaction = key;
      button.setAttribute("aria-label", `${label}${count ? `: ${count}` : ""}${state.mine === key ? " · your reaction" : ""}`);
      return button;
    };
    const render = () => {
      root.dataset.snapshot = JSON.stringify(state);
      root.replaceChildren();
      for (const [key, emoji, label] of REACTIONS) {
        const count = state.counts.find(r => r.reaction === key)?.count ?? 0;
        if (count || state.mine === key) root.append(reactionButton(key, emoji, label, count));
      }
      // Share menus' outside-click and touch-safe focus handling. Twenty
      // choices stay inside the picker; only existing reactions occupy the row.
      const buttons = REACTIONS.filter(([key]) => allowed.includes(key)).map(([key, emoji, label]) => reactionButton(key, emoji, label));
      const picker = this.ui.menu("Add a reaction", buttons) as HTMLDetailsElement;
      picker.className = "kl-reaction-picker";
      const summary = picker.querySelector("summary")!;
      summary.replaceChildren(kikiIcon("add-reaction"));
      const choices = picker.querySelector<HTMLElement>(".kl-social-menu-items")!;
      choices.className = "kl-reaction-choices"; choices.setAttribute("role", "group"); choices.setAttribute("aria-label", "Choose a reaction");
      summary.addEventListener("keydown", event => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault(); event.stopPropagation(); picker.open = true;
        (event.key === "ArrowUp" ? buttons.at(-1) : buttons.find(button => button.getAttribute("aria-pressed") === "true") ?? buttons[0])?.focus();
      });
      choices.addEventListener("keydown", event => {
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (index < 0) return;
        const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 };
        let target: number;
        if (event.key === "Home") target = 0;
        else if (event.key === "End") target = buttons.length - 1;
        else if (event.key in offsets) target = Math.max(0, Math.min(buttons.length - 1, index + offsets[event.key]!));
        else return;
        event.preventDefault(); event.stopPropagation(); buttons[target]?.focus();
      });
      if (this.options.platformPreview) root.append(picker);
      else root.prepend(picker);
    };
    render(); return root;
  }
  #edit(container: HTMLElement, initial: string, max: number, save: (text: string) => Promise<void>,remember?: (text:string)=>void): void {
    if (container.querySelector(".kl-social-editor")) return;
    const field = element("textarea", { value: initial, maxLength: max, ariaLabel: "Edit text" });
    this.#bindMentions(field);
    const status=element('small',{role:'status'});
    field.addEventListener('input',()=>{try{remember?.(field.value);status.textContent='Draft saved on this device';}catch(error){status.textContent=error instanceof Error?error.message:'Could not save the draft';}});
    const editor: HTMLDivElement = element("div", { className: "kl-social-editor" }, field,status,
      element("div", { className: "kl-cloud-actions" }, this.ui.button("Cancel", () => { this.#mentions.close(); editor.remove(); }),
        this.ui.button("Save changes", async () => { await save(field.value); this.#mentions.close(); editor.remove(); }, "check", "kl-social-button kl-social-primary")));
    container.append(editor); field.focus();
  }
  #formatMentionBody(body: HTMLElement, item: Pick<CloudPost, "text" | "mentions">): void {
    appendFeedFormattedText(body, item.text, item.mentions, member => {
      if (!this.ui.options.isBlocked(member)) this.ui.options.openProfile(member, `Member ${member}`);
    });
  }
  #bindMentions(field: HTMLTextAreaElement, extra: () => number[] = () => []): void {
    this.#mentions.bind(field, () => this.#features.mentions ? { key: `feed:${this.#accountEpoch}`, exact: true,
      members: [...extra(), ...[...this.#loaded.values()].flatMap(p => [p.author, ...(p.mentions ?? []).map(m => m.memberNumber)]), ...(this.options.relatedMembers?.() ?? [])],
    } : undefined);
  }
  async #comments(card: HTMLElement, postId: number, highlightId?: number, targetAccess?: FeedReadAccess): Promise<void> {
    const owner = this.ui.options.client.memberNumber, epoch = this.#accountEpoch;
    const drafts = this.#commentDrafts, replies = this.#commentReplies, attempts = this.#commentAttempts;
    const source={...this.#contentSource},store=this.#contentDrafts(),key=`create:comment:${postId}`,savedDraft=store.get(key);
    const saved=savedDraft&&JSON.stringify(savedDraft.source)===JSON.stringify(source)?savedDraft:undefined;
    if(saved&&typeof saved.data.text==='string'&&!drafts.has(postId))drafts.set(postId,saved.data.text);
    let savedParent=typeof saved?.data.parentId==='number'?saved.data.parentId:undefined;
    const box = element("section", { className: "kl-cloud-comments", ariaLabel: "Comments" });
    const readOnly = () => card.dataset.communityArchived === "true";
    let presentation: FeedCommentsDialog | undefined;
    if (this.options.platformPreview) {
      this.#commentsDialog?.close();
      presentation = new FeedCommentsDialog(card, box, () => { this.#commentsDialog = undefined; this.#mentions.close(); });
      this.#commentsDialog = presentation;
      this.#commentCount(card, postId, 0, false);
    } else card.append(box);
    const list = element("div", { className: "kl-comment-list" });
    const draft = element("textarea", { placeholder: presentation ? "" : "Write a comment…", ariaLabel: "Comment", maxLength: presentation ? Math.max(500, (drafts.get(postId) ?? "").length) : 1000, value: drafts.get(postId) ?? "" });
    draft.disabled = readOnly();
    const replyBar = element("div", { className: "kl-comment-reply-bar" });
    let replyTo = this.#features.feedReplies ? replies.get(postId) : undefined;
    const updateReply = () => {
      replyBar.replaceChildren();
      if (!replyTo&&!savedParent) return;
      replyBar.append(kikiIcon("reply"), element("span", { text: replyTo?`Replying to ${replyTo.profile.displayName}`:`Replying to comment #${savedParent}` }), this.ui.button("Cancel reply", () => {
        if (readOnly()) return;
        replyTo = undefined;savedParent=undefined; replies.delete(postId);remember(); updateReply(); draft.focus({ preventScroll: true });
      }, "close", "kl-social-icon-button"));
    };
    const remember = () => {
      drafts.set(postId, draft.value);
      const clientId=store.get(key)?.data.clientId??crypto.randomUUID(),parentId=replyTo?.id??savedParent;
      try{store.save(key,{action:'create',type:'comment',targetId:postId,postId},source,{text:draft.value,...this.#features.mentions||source.required?{clientId}:{},...this.#features.feedReplies&&parentId?{parentId}:{}});}catch{/* Keep the in-session text while storage conflict prevents sending. */}
      if (drafts.size > 100) { const oldest = drafts.keys().next().value!; drafts.delete(oldest); replies.delete(oldest); attempts.delete(oldest); }
    };
    draft.addEventListener("input", remember);
    let cursor = 0, total = 0, busy = false, sending = false;
    const comments = new Map<number, CloudComment>(), rows = new Map<number, HTMLElement>();
    const placeThreads = () => {
      const blocked = (member: number) => this.ui.options.isBlocked(member) || Boolean(this.ui.options.client.isProfileBlocked?.(member));
      const removed: HTMLElement[] = [];
      for (const [id, comment] of comments) if (blocked(comment.author)) {
        const row = rows.get(id); if (row) removed.push(row);
        comments.delete(id); rows.delete(id); total--;
      }
      if (replyTo && blocked(replyTo.author)) { replyTo = undefined;savedParent=undefined; replies.delete(postId);remember(); updateReply(); }
      const active = (box.getRootNode() as Document | ShadowRoot).activeElement as HTMLElement | null;
      const selection = active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement ? [active.selectionStart, active.selectionEnd] : undefined;
      // One visual indent even when replying to a reply. The explicit reply
      // context preserves the relationship without nesting beyond mobile width.
      for (const comment of comments.values()) {
        const row = rows.get(comment.id)!;
        if (comment.replyTo && blocked(comment.replyTo.author)) {
          comment.replyTo = null;
          const context = row.querySelector<HTMLButtonElement>(":scope > .kl-comment-parent");
          if (context) { context.textContent = "Reply to an unavailable comment"; context.setAttribute("aria-label", "Reply to an unavailable comment"); context.removeAttribute("title"); delete context.dataset.replyAuthor; context.disabled = true; }
        }
        let parent = comment.parentId ? comments.get(comment.parentId) : undefined;
        const visited = new Set([comment.id]);
        while (parent?.parentId && comments.has(parent.parentId) && !visited.has(parent.id)) {
          visited.add(parent.id); parent = comments.get(parent.parentId);
        }
        if (parent && !visited.has(parent.id)) {
          const parentRow = rows.get(parent.id)!;
          let thread = parentRow.querySelector<HTMLElement>(":scope > .kl-comment-thread");
          if (!thread) { thread = element("div", { className: "kl-comment-thread", ariaLabel: "Replies" }); parentRow.append(thread); }
          if (row.parentElement !== thread) thread.append(row); row.dataset.reply = "true";
        } else { if (row.parentElement !== list) list.append(row); row.dataset.reply = String(Boolean(comment.parentId)); }
      }
      for (const row of removed) row.remove();
      for (const thread of list.querySelectorAll(".kl-comment-thread")) if (!thread.children.length) thread.remove();
      if (active?.isConnected && box.contains(active) && (box.getRootNode() as Document | ShadowRoot).activeElement !== active) {
        active.focus({ preventScroll: true });
        if (selection && (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement)) active.setSelectionRange(selection[0] ?? 0, selection[1] ?? 0);
      }
    };
    this.#commentPruners.set(box, placeThreads);
    const addComment = (comment: CloudComment) => {
      const reportSource=this.#readAccess?.generation?this.#readAccess:this.#reportSource;
      if (comments.has(comment.id) || this.ui.options.isBlocked(comment.author) || this.ui.options.client.isProfileBlocked?.(comment.author)) return;
      const body = element("p"); this.#formatMentionBody(body, comment);
      const row = element("article", { className: "kl-social-comment" }, body);
      row.dataset.commentId = String(comment.id);
      if (comment.id === highlightId) row.classList.add("kl-highlighted-comment");
      const reply = this.ui.button("Reply", () => {
        if (readOnly()) return;
        if (this.#features.feedReplies) { replyTo = comment;savedParent=comment.id; replies.set(postId, comment);remember(); updateReply(); }
        else { draft.value = `@${comment.profile.displayName} ${draft.value}`.slice(0, draft.maxLength); remember(); }
        draft.focus({ preventScroll: true }); draft.scrollIntoView?.({ block: "nearest" });
      }, "reply");
      reply.disabled = readOnly();
      const actions: HTMLElement[] = [];
      if (this.#features.reactionDetails) actions.push(this.ui.button(this.options.platformPreview ? "Who reacted" : "Reactions", () => this.#showReactions(row, "comment", comment.id), "reactions"));
      if (this.options.platformPreview) {
        const menuReply = this.ui.button("Reply", () => reply.click(), "reply", "kl-social-button", false);
        menuReply.disabled = readOnly(); actions.push(menuReply);
      }
      if (comment.author === this.ui.options.client.memberNumber && !readOnly()) actions.push(
        this.ui.button("Edit", () => {
          const editKey=`edit:comment:${comment.id}`,entry=store.get(editKey),revision=comment.revision;
          const initial=entry&&JSON.stringify(entry.source)===JSON.stringify(source)&&typeof entry.data.text==='string'?entry.data.text:comment.text;
          this.#edit(row,initial,this.options.platformPreview ? Math.max(500, initial.length) : 1000,async text=>{
            const next=await this.#writeContent<CloudComment>(row,editKey,{action:'edit',type:'comment',targetId:comment.id,postId,preview:comment.text},source,{text,revision});if(!next)throw new FeedContentError();
            store.complete(editKey);comment.text=next.text;comment.mentions=next.mentions??[];comment.revision=next.revision;body.replaceChildren();this.#formatMentionBody(body,next);
          },text=>{store.save(editKey,{action:'edit',type:'comment',targetId:comment.id,postId,preview:comment.text},source,{text,revision});});
        }, "edit"),
        this.ui.button("Delete", () => void this.ui.confirm(row, "Delete this comment?", async () => {
          const deleteKey=`delete:comment:${comment.id}`,result=await this.#writeContent(row,deleteKey,{action:'delete',type:'comment',targetId:comment.id,postId,preview:comment.text},source,{revision:comment.revision});if(!result)return;
          store.complete(deleteKey);
          comments.delete(comment.id); rows.delete(comment.id); placeThreads(); row.remove(); total--; this.#commentCount(card, postId, -1);
          if (replyTo?.id === comment.id) { replyTo = undefined; replies.delete(postId); updateReply(); }
          for (const child of comments.values()) if (child.parentId === comment.id) {
            child.replyTo = null;
            const context = rows.get(child.id)?.querySelector<HTMLElement>(":scope > .kl-comment-parent");
            if (context) { context.textContent = "Reply to an unavailable comment"; context.setAttribute("aria-label", "Reply to an unavailable comment"); context.removeAttribute("title"); delete context.dataset.replyAuthor; }
          }
        }), "trash", "kl-social-button kl-social-danger"));
      else if (comment.author !== this.ui.options.client.memberNumber) actions.push(this.ui.button("Report", () => this.options.report(row, "comment", String(comment.id), reportSource), "warning"));
      row.prepend(element("header", { className: "kl-comment-header" }, this.ui.author(comment.profile, comment.createdAt, undefined, true), this.#feedMenu("Comment options", actions)));
      if (comment.parentId) {
        const context = this.ui.button(comment.replyTo ? `Reply to ${comment.replyTo.profile.displayName}` : "Reply to an unavailable comment", () => {
          const target = rows.get(comment.parentId!);
          if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); target.scrollIntoView?.({ block: "center" }); }
          else if (comment.replyTo) return this.openPost(postId, comment.parentId!, targetAccess?.generation);
        }, "reply", "kl-social-button kl-comment-parent");
        if (comment.replyTo) context.dataset.replyAuthor = String(comment.replyTo.author);
        body.before(context);
      }
      const reactions = this.#reactions("comment", comment.id, comment.reactions);
      reactions.inert = readOnly();
      row.append(element("div", { className: "kl-comment-actions" }, reactions, reply));
      list.append(row); comments.set(comment.id, comment); rows.set(comment.id, row); total++;
    };
    const load = async () => {
      if (busy || !box.isConnected) return;
      busy = true;
      try {
        const path = `/v1/feed/${postId}/comments?cursor=${cursor}&limit=20`;
        const page = targetAccess ? await targetAccess.request<CloudPage<CloudComment>>('GET', path) : await this.ui.options.client.request<CloudPage<CloudComment>>('GET', path);
        if (!box.isConnected) return;
        for (const comment of page.items) if (total < 100) addComment(comment);
        placeThreads();
        if (page.nextCursor !== null && (page.nextCursor <= 0 || (cursor > 0 && page.nextCursor <= cursor))) throw new CloudError("invalid_cursor");
        cursor = page.nextCursor ?? 0; more.hidden = page.nextCursor === null;
        updateFeedPageAction(more, total >= 100, "Load more comments", "Next comments");
      } catch (error) {
        if (box.isConnected && targetAccess && feedRecoveryConflict(error)) this.#holdFeed();
        else if (box.isConnected) throw error;
      } finally { busy = false; }
    };
    const more = pageAction(this.ui.button("Load more comments", async () => {
      if (total >= 100) { list.replaceChildren(); comments.clear(); rows.clear(); total = 0; }
      await load();
    }));
    const send = this.ui.button("Send comment", async () => {
      if (readOnly() || drafts !== this.#commentDrafts || !box.isConnected) return;
      if (sending || !draft.value.trim()) { draft.focus(); return; }
      remember();const entry=store.get(key);if(!entry)throw new FeedContentError();
      store.stage(key,entry.data);const pending=store.get(key)!.pending!,submitted=String(pending.payload.text),parentId=typeof pending.payload.parentId==='number'?pending.payload.parentId:null;
      attempts.set(postId,{text:submitted,parent:parentId,clientId:String(pending.payload.clientId??pending.operationId)});
      sending = true; send.disabled = true; draft.focus({ preventScroll: true });
      try {
        const created=await store.send<CloudComment>(key,this.#contentCurrent(box));if(!created)return;
        if (!this.ui.options.client.connected || this.ui.options.client.memberNumber !== owner || this.#accountEpoch !== epoch || drafts !== this.#commentDrafts) return;
        attempts.delete(postId);store.complete(key);
        this.#reconcileCachedComment(postId, source, submitted, true);
        this.#contentVersion++; if (!comments.has(created.id)) this.#commentCount(card, postId, 1);
        const current = drafts.get(postId) ?? draft.value;
        const remaining = remainingDraftAfterSend(current, submitted);
        if (remaining) drafts.set(postId, remaining); else drafts.delete(postId);
        if (replies.get(postId)?.id === parentId) replies.delete(postId);
        if (box.isConnected) {
          draft.value = remaining;
          if (replyTo?.id === parentId) replyTo = undefined;
          if(savedParent===parentId)savedParent=undefined;
          updateReply();
          if (created?.id) {
            if (total >= 100) { list.replaceChildren(); comments.clear(); rows.clear(); total = 0; }
            addComment(created); placeThreads();
          }
        }
      } catch (error) {
        // Keep uncertain and rejected requests for explicit review; never mint a new identity automatically.
        throw error;
      } finally { sending = false; send.disabled = readOnly() || Boolean(presentation && !draft.value.trim()); }
    }, "send", "kl-social-button kl-social-primary", false);
    draft.addEventListener("keydown", event => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); if (!sending) send.click(); }
    });
    const composer = element("div", { className: "kl-comment-compose" }, draft, send);
    this.#bindMentions(draft, () => [...comments.values()].flatMap(c => [c.author, ...(c.mentions ?? []).map(m => m.memberNumber)]));
    if (this.#features.feedSpoilers && !presentation && !readOnly()) composer.append(this.ui.button("Spoiler comment text", () => insertSpoiler(draft), "eye-off", "kl-social-button kl-comment-spoiler-tool"));
    box.append(list, more, replyBar, composer);
    if (presentation) {
      const label = element("label", { text: "Add a comment" });
      draft.id = `kl-comment-${crypto.randomUUID()}`; label.htmlFor = draft.id;
      const counter = element("small", { className: "kl-comment-counter" });
      counter.id = `${draft.id}-count`; draft.setAttribute("aria-describedby", counter.id);
      const sync = () => {
        counter.textContent = `${draft.value.length} / ${draft.maxLength}`;
        label.textContent = replyTo || savedParent ? "Your reply" : "Add a comment";
        const copy = send.querySelector("span"); if (copy) copy.textContent = replyTo || savedParent ? "Reply" : "Comment";
        send.disabled = readOnly() || sending || !draft.value.trim();
      };
      composer.prepend(label); draft.after(counter);
      const close = this.ui.button("Close", () => presentation?.close(), undefined, "kl-text-button", false);
      presentation.dialog.body.append(element("footer", { className: "kl-dialog-actions kl-comment-dialog-footer" }, close, send));
      draft.addEventListener("input", sync);
      const observer = new MutationObserver(sync); observer.observe(replyBar, { childList: true });
      presentation.dialog.element.addEventListener("close", () => observer.disconnect(), { once: true });
      sync();
    }
    if (readOnly()) { send.disabled = true; box.append(element("p", { className: "kl-cloud-note", text: "This conversation is read-only." })); }
    updateReply();
    try {
      if (highlightId) {
        try {
          const comment = targetAccess?await targetAccess.request<CloudComment>('GET',`/v1/comments/${highlightId}`):await this.ui.options.client.request<CloudComment>('GET',`/v1/comments/${highlightId}`);
          if (comment.postId !== postId) throw new CloudError("content_unavailable");
          if (!box.isConnected) return;
          cursor = Math.max(0, highlightId - 1);
          box.prepend(this.ui.button("Show all comments", async () => { if (presentation) presentation.close(); else box.remove(); await this.#comments(card, postId); }));
        } catch {
          if (!box.isConnected) return;
          box.prepend(element("p", { className: "kl-cloud-note", text: "The notified comment is no longer available." }));
        }
      }
      await load();
      const highlighted = list.querySelector<HTMLElement>(".kl-highlighted-comment");
      if (highlighted) { highlighted.tabIndex = -1; highlighted.focus({ preventScroll: true }); highlighted.scrollIntoView?.({ block: "center" }); }
    } catch (error) { if (presentation) presentation.close(); else box.remove(); throw error; }
  }
  #commentCount(card: HTMLElement, id: number, delta: number, updateDiscussion = true): void {
    const post = this.#loaded.get(id);
    if (!post || post.commentCount === undefined) return;
    if (delta) this.#contentVersion++;
    post.commentCount = Math.max(0, post.commentCount + delta);
    const button = card.querySelector<HTMLButtonElement>(".kl-post-comments-button");
    const context = this.#commentsDialog;
    if (context && (context.card === card || context.subject === card))
      context.count.textContent = `${post.commentCount} ${post.commentCount === 1 ? "comment" : "comments"}`;
    const label = `Comments · ${post.commentCount}`;
    button?.setAttribute("aria-label", label); button?.setAttribute("title", label);
    const copy = button?.querySelector("span"); if (copy) copy.textContent = this.options.platformPreview ? String(post.commentCount) : label;
    if (updateDiscussion) this.#renderDiscussions();
  }
  #renderDiscussions(): void {
    const circle = this.options.relatedMembers?.() ?? new Set<number>();
    const posts = [...this.#loaded.values()].filter(p => circle.has(p.author) && p.author !== this.ui.options.client.memberNumber && !this.ui.options.isBlocked(p.author))
      .sort((a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0) || b.createdAt - a.createdAt).slice(0, 3);
    const signature = JSON.stringify(posts.map(p => [p.id, p.text, p.profile, p.commentCount, p.reactions.counts]));
    if (signature === this.#discussionSignature) return;
    this.#discussionSignature = signature;
    this.#discussion.replaceChildren(element("h3", {}, kikiIcon("chat"), "From your circle"));
    if (!posts.length) {
      this.#discussion.append(element("p", { className: "kl-cloud-note", text: "Posts from people you know will appear here as you browse." })); return;
    }
    for (const post of posts) {
      const link = this.ui.button(post.text.includes("||") ? "Post with spoiler" : post.text || post.poll?.question || "Photo post", async () => {
        const card = this.element.querySelector<HTMLElement>(`.kl-feed-post[data-post-id="${post.id}"]`);
        if (!card) return;
        card.scrollIntoView?.({ block: "start", behavior: "smooth" });
        const button = card.querySelector<HTMLButtonElement>(".kl-post-comments-button"); button?.focus({ preventScroll: true });
        if (!card.querySelector(".kl-cloud-comments")) { button?.setAttribute("aria-expanded", "true"); await this.#comments(card, post.id); }
      }, undefined, "kl-circle-post-link");
      this.#discussion.append(element("div", { className: "kl-circle-post" }, this.ui.author(post.profile, undefined, undefined, true), link,
        element("small", { text: `${post.commentCount ?? 0} comments · ${post.reactions.counts.reduce((sum, r) => sum + r.count, 0)} reactions` })));
    }
  }
}
