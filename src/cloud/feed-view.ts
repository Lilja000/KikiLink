import { element } from "./dom";
import { CloudError } from "./client";
import { SocialUI, REACTIONS, type Reaction } from "./social-ui";
import { kikiIcon } from "../modules/link-chat/icons";
import { ContentDialog } from "../modules/link-chat/content-dialog";
import { TEXT_FORMAT_HINT } from "../modules/link-chat/text-format";
import { appendFeedFormattedText } from "./feed-spoilers";
import { FeedPollView, pollEditor, validPollDraft } from "./feed-poll";
import { FeedDraftStore, type FeedDraft } from "./feed-drafts";
import { remainingDraftAfterSend } from "../utils/sent-draft";
import type { CloudComment, CloudFeedPage, CloudMedia, CloudPage, CloudPost, CloudProfile, CloudReactions, CloudReactionMember, CloudPollDraft } from "./types";

function insertSpoiler(field: HTMLTextAreaElement): void {
  const start = field.selectionStart, end = field.selectionEnd;
  const content = field.value.slice(start, end) || "your text";
  if (field.maxLength >= 0 && field.value.length - (end - start) + content.length + 4 > field.maxLength) return;
  field.setRangeText(`||${content}||`, start, end, "select");
  field.focus({ preventScroll: true }); field.setSelectionRange(start + 2, start + 2 + content.length);
  field.dispatchEvent(new Event("input"));
}

interface FeedOptions {
  openOwnProfile(): void;
  openGroups(): void;
  report(container: HTMLElement, type: string, id: string): void;
  relatedMembers?(): ReadonlySet<number>;
  readFresh?(id: number): void | Promise<void>;
  canRead?(): boolean;
  canPin?(): boolean;
}
type FeedFilter = "all" | "friends" | "mine" | "saved" | "hidden";
interface PendingFeedPost { text: string; files: File[]; spoilerFiles: File[]; poll: CloudPollDraft | null; clientId: string; mediaIds?: string[]; spoilerMediaIds?: string[] }
export interface SocialFeatures { feedPins?: boolean; feedFeatured?: boolean; feedBookmarks?: boolean; feedReplies?: boolean; feedFilters?: boolean; feedPolls?: boolean; feedWatch?: boolean; feedHide?: boolean; feedSpoilers?: boolean; reactionDetails?: boolean; groupPins?: boolean; groupLive?: boolean; groupInbox?: boolean; groupAvatar?: boolean; fullProfile?: boolean; feedSearch?: boolean; messageChanges?: boolean; messageReceipts?: boolean; reactions?: string[] }

/** One bounded page at a time. Reactions and comments never rebuild the whole feed. */
export class CloudFeedView {
  readonly element = element("div", { className: "kl-feed-layout" });
  #generation = 0;
  #draft = "";
  #files: File[] = [];
  #spoilerFiles = new Set<File>();
  #pollDraft: CloudPollDraft | null = null;
  #draftStore: FeedDraftStore | undefined;
  #draftOwner = 0;
  #draftVersion = 0;
  #accountEpoch = 0;
  #draftReady = false;
  #draftLoad: Promise<void> | undefined;
  #draftStatus: HTMLElement | undefined;
  #pollViews = new Map<number, FeedPollView>();
  #clientId: string = crypto.randomUUID();
  #pendingPost: PendingFeedPost | undefined;
  #uploaded = new WeakMap<File, string>();
  #previews = new Map<File, string>();
  #commentDrafts = new Map<number, string>();
  #commentReplies = new Map<number, CloudComment>();
  #commentPruners = new WeakMap<HTMLElement, () => void>();
  #query = "";
  #filter: FeedFilter = "all";
  #features: SocialFeatures = {};
  #loaded = new Map<number, CloudPost>();
  #fresh: number | undefined;
  #observer: IntersectionObserver | undefined;
  #asideObserver: ResizeObserver | undefined;
  #readTask: Promise<void> | undefined;
  #retryReadAfter = 0;
  #scrollSurface: HTMLElement | undefined;
  #postCreated: ((post: CloudPost) => void) | undefined;
  #postDeleted: ((id: number) => void) | undefined;
  #syncPosts: (() => Promise<boolean>) | undefined;
  #syncTask: Promise<boolean> | undefined;
  #contentVersion = 0;
  #discussionSignature: string | undefined;
  readonly #postDialog = new ContentDialog();
  readonly #reactionDialog = new ContentDialog();
  #promotionTimer: ReturnType<typeof setTimeout> | undefined;
  readonly #discussion = element("section", { className: "kl-cloud-card kl-feed-discussions", ariaLabel: "From your circle" });

  readonly #onVisible = () => this.observeFresh();
  readonly #onOnline = () => { this.#retryReadAfter = 0; this.observeFresh(); };
  constructor(readonly ui: SocialUI, readonly options: FeedOptions) {
    document.addEventListener("visibilitychange", this.#onVisible);
    window.addEventListener("online", this.#onOnline);
  }
  destroy(): void { document.removeEventListener("visibilitychange", this.#onVisible); window.removeEventListener("online", this.#onOnline); this.clear(); this.#draftStore?.close(); this.#postDialog.destroy(); this.#reactionDialog.destroy(); }
  async sync(): Promise<boolean> {
    if (this.#syncTask) return this.#syncTask;
    if (!this.#syncPosts) return true;
    const task = this.#syncPosts(); this.#syncTask = task;
    try { return await task; } finally { if (this.#syncTask === task) this.#syncTask = undefined; }
  }
  observeFresh(): void {
    if (!this.#fresh || this.#readTask || Date.now() < this.#retryReadAfter || document.visibilityState === "hidden" || !this.options.canRead?.()) return;
    const card = this.element.querySelector<HTMLElement>(`[data-post-id="${this.#fresh}"]`);
    if (!card?.isConnected) return;
    const bounds = card.getBoundingClientRect();
    const scrollSurface = this.element.closest<HTMLElement>(".kl-cloud");
    const clip = scrollSurface?.getBoundingClientRect();
    const top = Math.max(0, clip?.top ?? 0), bottom = Math.min(window.innerHeight, clip?.bottom ?? window.innerHeight);
    if (bounds.bottom > top && bounds.top < bottom && bounds.width > 0) {
      const id = this.#fresh, generation = this.#generation;
      const task = Promise.resolve().then(() => this.options.readFresh?.(id)).then(() => {
        if (generation === this.#generation && this.#fresh === id) {
          this.#fresh = undefined; this.#stopObserving();
        }
      }).catch(() => { if (generation === this.#generation) this.#retryReadAfter = Date.now() + 3_000; })
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
    const update = () => {
      if (!this.element.isConnected || !viewport.clientHeight) return;
      // Keep the existing Feed scroll owner. Reserve its headings and padding
      // so the entire separate sidebar fits even before the Feed is scrolled.
      const offset = this.element.getBoundingClientRect().top - viewport.getBoundingClientRect().top - viewport.clientTop + viewport.scrollTop;
      const bottom = parseFloat(getComputedStyle(viewport).paddingBottom) || 0;
      const height = `${Math.max(0, Math.floor(viewport.clientHeight - Math.max(0, offset) - bottom))}px`;
      if (sidebar.style.getPropertyValue("--kl-feed-aside-height") !== height) sidebar.style.setProperty("--kl-feed-aside-height", height);
    };
    this.#asideObserver = new ResizeObserver(update);
    this.#asideObserver.observe(viewport);
    this.#asideObserver.observe(this.element);
    for (const child of viewport.children) if (!child.contains(this.element)) this.#asideObserver.observe(child);
    update();
  }
  async openPost(id: number, commentId?: number): Promise<void> {
    this.#asideObserver?.disconnect(); this.#asideObserver = undefined;
    const generation = ++this.#generation;
    this.#stopObserving(); this.#fresh = undefined;
    this.#syncPosts = undefined; this.#postCreated = undefined; this.#postDeleted = undefined;
    this.#postDialog.close(); this.#reactionDialog.close(); clearTimeout(this.#promotionTimer);
    this.#clearPollViews();
    this.element.dataset.focusedPost = "true";
    const main = element("div", { className: "kl-feed-main" });
    main.append(this.ui.button("Back to latest Feed", () => this.render(this.#features), "back"),
      element("p", { className: "kl-cloud-note", text: "Loading post…", role: "status" }));
    this.element.replaceChildren(main);
    this.#loaded.clear();
    const unavailable = () => {
      this.#syncPosts = undefined; this.#loaded.clear(); this.#clearPollViews(); clearTimeout(this.#promotionTimer);
      main.replaceChildren(element("p", { className: "kl-cloud-note", text: "This content is no longer available." }), this.ui.button("Back to Feed", () => this.render(this.#features)));
    };
    try {
      const post = await this.ui.options.client.request<CloudPost>("GET", `/v1/feed/${id}`);
      if (generation !== this.#generation) return;
      const card = this.#post(post); this.#loaded.set(post.id, post);
      main.lastElementChild!.replaceWith(card);
      this.#postDeleted = unavailable;
      this.#syncPosts = async () => {
        const version = this.#contentVersion;
        try {
          const next = await this.ui.options.client.request<CloudPost>("GET", `/v1/feed/${id}`);
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
      await this.#comments(card, id, commentId);
      if (generation === this.#generation) this.#schedulePromotionSync();
    } catch {
      if (generation !== this.#generation) return;
      unavailable();
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

  pause(): void { this.#asideObserver?.disconnect(); this.#asideObserver = undefined; this.#stopObserving(); this.#fresh = undefined; clearTimeout(this.#promotionTimer); this.#reactionDialog.close(); this.#generation++; this.#syncPosts = undefined; this.#releasePreviews(); this.#postDialog.close(); this.#clearPollViews(); }
  clear(): void {
    this.#postCreated = undefined; this.#postDeleted = undefined;
    this.#observer?.disconnect(); this.#fresh = undefined;
    this.pause(); this.#draft = ""; this.#files = []; this.#spoilerFiles.clear(); this.#pollDraft = null; this.#commentDrafts.clear(); this.#commentReplies.clear();
    this.#draftStore?.close(); this.#draftStore = undefined; this.#draftOwner = 0; this.#draftReady = false; this.#draftLoad = undefined; this.#draftVersion++; this.#accountEpoch++;
    this.#uploaded = new WeakMap(); this.#query = ""; this.#filter = "all";
    this.#clientId = crypto.randomUUID(); this.#pendingPost = undefined; this.element.replaceChildren();
    this.#loaded.clear(); this.#discussion.replaceChildren(); this.#discussionSignature = undefined;
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
        this.#files = draft.files.map(item => item.file);
        this.#spoilerFiles = new Set(draft.files.filter(item => item.spoiler).map(item => item.file));
        this.#pendingPost = draft.pending ? { text: draft.pending.text, clientId: draft.pending.clientId, poll: draft.pending.poll,
          files: draft.pending.files.map(item => item.file), spoilerFiles: draft.pending.files.filter(item => item.spoiler).map(item => item.file),
          ...(draft.pending.mediaIds ? { mediaIds: draft.pending.mediaIds } : {}), ...(draft.pending.spoilerMediaIds ? { spoilerMediaIds: draft.pending.spoilerMediaIds } : {}) } : undefined;
      }).catch(() => { if (this.#draftStore === store) this.#draftReady = true; });
    }
    await this.#draftLoad;
  }
  #saveDraft(): void {
    this.#draftVersion++;
    if (!this.#draftStore || this.#draftOwner !== this.ui.options.client.memberNumber) return;
    const draft: FeedDraft = { text: this.#draft, clientId: this.#clientId, poll: this.#pollDraft,
      files: this.#files.map(file => ({ file, spoiler: this.#spoilerFiles.has(file) })),
      ...(this.#pendingPost ? { pending: { text: this.#pendingPost.text, clientId: this.#pendingPost.clientId, poll: this.#pendingPost.poll,
        files: this.#pendingPost.files.map(file => ({ file, spoiler: this.#pendingPost!.spoilerFiles.includes(file) })),
        ...(this.#pendingPost.mediaIds ? { mediaIds: this.#pendingPost.mediaIds } : {}), ...(this.#pendingPost.spoilerMediaIds ? { spoilerMediaIds: this.#pendingPost.spoilerMediaIds } : {}) } } : {}) };
    try { this.#draftStore.save(draft); } catch { /* The draft stays in this composer when device storage is unavailable. */ }
    this.#updateDraftStatus();
  }
  #updateDraftStatus(): void {
    if (!this.#draftStatus) return;
    const present = Boolean(this.#draft || this.#files.length || this.#pollDraft);
    this.#draftStatus.textContent = this.#draftStore?.status === "error" ? "Draft could not be fully saved on this device. Keep this page open." : present ? this.#draftStore?.status === "pending" ? "Saving draft…" : "Draft saved on this device" : "";
    this.#draftStatus.dataset.error = String(this.#draftStore?.status === "error");
  }
  async render(features: SocialFeatures = {}): Promise<void> {
    this.#asideObserver?.disconnect(); this.#asideObserver = undefined;
    this.#stopObserving(); this.#fresh = undefined;
    this.#postDialog.close(); this.#reactionDialog.close(); clearTimeout(this.#promotionTimer);
    delete this.element.dataset.focusedPost;
    this.#features = features;
    const generation = ++this.#generation;
    if (!this.#draftReady || this.#draftOwner !== this.ui.options.client.memberNumber) await this.#loadDraft();
    if (generation !== this.#generation) return;
    this.#clearPollViews();
    if (!features.feedFilters && !["all", "mine"].includes(this.#filter)) this.#filter = "all";
    this.#releasePreviews();
    this.#loaded.clear();
    const main = element("div", { className: "kl-feed-main" });
    const sidebar = element("aside", { className: "kl-feed-aside", ariaLabel: "Your KikiLink", tabIndex: 0 },
      element("div", { className: "kl-cloud-card kl-feed-self" },
        this.ui.member(this.ui.options.client.memberNumber, undefined, undefined, true),
        element("p", { className: "kl-cloud-note", text: "Your profile, wherever you are." }),
        this.ui.button("Edit profile", () => this.options.openOwnProfile(), "edit")),
      element("div", { className: "kl-cloud-card kl-feed-group-link" },
        element("h3", { text: "Keep the conversation going" }),
        element("p", { className: "kl-cloud-note", text: "Your group chats stay together across rooms." }),
        this.ui.button("Open groups", () => this.options.openGroups(), "users")), this.#discussion);
    this.#renderDiscussions();
    const list = element("div", { className: "kl-feed-posts", ariaLabel: "Posts" });
    const search = element("input", { type: "search", className: "kl-feed-search", placeholder: "Search posts or #member", ariaLabel: "Search posts", maxLength: 100, value: this.#query });
    const searchForm = element("form", { className: "kl-feed-search-form" }, search);
    const searchButton = this.ui.button("Search", () => searchForm.requestSubmit(), "search");
    searchForm.append(searchButton);
    searchForm.addEventListener("submit", event => {
      event.preventDefault(); this.#query = search.value.trim();
      void this.ui.options.run(() => this.render(this.#features));
    });
    const filter = element("div", { className: "kl-feed-filter", role: "group", ariaLabel: "Show posts" });
    const filters = [["all", "Everyone"], ...(features.feedFilters ? [["friends", "Friends"]] : []), ["mine", "My posts"],
      ...(features.feedFilters && features.feedBookmarks ? [["saved", "Saved"]] : []), ...(features.feedFilters && features.feedHide ? [["hidden", "Hidden"]] : [])] as Array<[FeedFilter, string]>;
    for (const [key, title] of filters) {
      const button = this.ui.button(title, () => { if (this.#filter === key) return; this.#filter = key; return this.render(this.#features); });
      button.setAttribute("aria-pressed", String(this.#filter === key)); filter.append(button);
    }
    const reset = this.ui.button("Latest posts", () => { this.#query = ""; this.#filter = "all"; return this.render(this.#features); }, "refresh");
    const toolbar = element("div", { className: "kl-feed-tools" }, searchForm, element("div", { className: "kl-feed-filter-row" }, filter, reset));
    const status = element("p", { className: "kl-cloud-note kl-feed-results", role: "status" });
    const loading = element("div", { className: "kl-feed-loading", role: "status", text: "Loading posts…" });
    main.append(this.#composer(), toolbar, status, list, loading);
    this.element.replaceChildren(main, sidebar);
    this.#sizeAside(sidebar);
    let cursor = 0, total = 0, hasMore = true, busy = false;
    const seen = new Set<number>();
    const matches = (post: CloudPost) => {
      if (this.ui.options.isBlocked(post.author) || (this.#filter === "mine" && post.author !== this.ui.options.client.memberNumber)) return false;
      if (this.#filter === "hidden" ? !post.hidden : post.hidden) return false;
      if (this.#filter === "saved" && !post.bookmarked) return false;
      if (!this.#query) return true;
      const member = /^#\d+$/u.test(this.#query) ? Number(this.#query.slice(1)) : 0;
      const searchable = [post.text, post.poll?.question ?? "", ...(post.poll?.options.map(option => option.text) ?? [])].join(" ").normalize("NFKC").toLowerCase();
      return member ? post.author === member : this.#query.normalize("NFKC").toLowerCase().split(/\s+/u)
        .every(word => searchable.includes(word));
    };
    const updateStatus = () => {
      status.textContent = total ? `${total} ${total === 1 ? "post" : "posts"}${this.#query ? ` matching “${this.#query}”` : ""}` : "";
      list.querySelector(".kl-feed-empty")?.remove();
      if (!total) list.append(element("div", { className: "kl-feed-empty" },
        element("h3", { text: this.#filter === "saved" ? "Your saved posts" : this.#filter === "hidden" ? "Nothing hidden" : this.#filter === "friends" ? "Your friends’ posts" : this.#query || this.#filter === "mine" ? "No matches here yet" : "A little quiet here" }),
        element("p", { text: hasMore ? "Load more to look through older posts." : this.#query ? "Try another phrase or a member number." : this.#filter === "saved" ? "Save a post from its menu to keep it here." : this.#filter === "hidden" ? "Posts you hide appear here. You can restore them anytime." : this.#filter === "friends" ? "Posts from your KikiLink friends will appear here." : "Share a thought or a photo to start the conversation." })));
    };
    this.#postDeleted = id => {
      if (!seen.delete(id)) return;
      total--; updateStatus();
      more.querySelector("span")!.textContent = total >= 100 ? "Continue to older posts" : "Load more posts";
    };
    this.#postCreated = post => {
      this.#contentVersion++;
      if (this.#filter === "friends") { void this.ui.options.run(() => this.sync()); return; }
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
      more.querySelector("span")!.textContent = total >= 100 ? "Continue to older posts" : "Load more posts";
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
        const page = await this.ui.options.client.request<CloudFeedPage>("GET", `/v1/feed?${params}`);
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
        more.querySelector("span")!.textContent = total >= 100 ? "Continue to older posts" : "Load more posts";
        updateStatus();
      } finally {
        busy = false;
        if (generation === this.#generation) { more.disabled = false; loading.hidden = true; }
      }
    };
    const more = this.ui.button("Load more posts", load, "next", "kl-social-button kl-feed-more");
    main.append(more);
    this.#syncPosts = async () => {
      if (busy || generation !== this.#generation) return false;
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
        const page = await this.ui.options.client.request<CloudFeedPage>("GET", `/v1/feed?${params}`);
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
      more.querySelector("span")!.textContent = total >= 100 ? "Continue to older posts" : "Load more posts";
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
  #promoted(post: CloudPost): boolean {
    return Boolean(post.pinnedAt || (post.featuredUntil ?? 0) > Date.now());
  }
  #orderPosts(list: HTMLElement): void {
    const active = (list.getRootNode() as Document | ShadowRoot).activeElement as HTMLElement | null;
    const nodes = [...list.querySelectorAll<HTMLElement>(":scope > .kl-feed-post")];
    const rank = (post: CloudPost) => post.pinnedAt ? 2 : this.#promoted(post) ? 1 : 0;
    nodes.sort((a, b) => {
      const left = this.#loaded.get(Number(a.dataset.postId))!, right = this.#loaded.get(Number(b.dataset.postId))!;
      return rank(right) - rank(left) || ((right.pinnedAt ?? 0) - (left.pinnedAt ?? 0)) || right.id - left.id;
    });
    for (const [index, row] of nodes.entries()) if (list.children[index] !== row) list.insertBefore(row, list.children[index] ?? null);
    if (active?.isConnected && list.contains(active) && (list.getRootNode() as Document | ShadowRoot).activeElement !== active) active.focus({ preventScroll: true });
  }
  #highlightPost(card: HTMLElement, post: CloudPost): void {
    const featured = (post.featuredUntil ?? 0) > Date.now();
    const pinned = Boolean(post.pinnedAt);
    const changed = card.dataset.pinned !== String(pinned) || card.dataset.featured !== String(featured);
    card.dataset.pinned = String(pinned); card.dataset.featured = String(featured);
    let badges = card.querySelector<HTMLElement>(":scope > .kl-feed-highlights");
    if (!post.pinnedAt && !featured) badges?.remove();
    else if (changed || !badges) {
      if (!badges) { badges = element("div", { className: "kl-feed-highlights" }); card.prepend(badges); }
      badges.replaceChildren();
      if (post.pinnedAt) badges.append(element("span", {}, kikiIcon("pin"), "Pinned"));
      if (featured) badges.append(element("span", { title: "Most reactions in the preceding 24 hours · featured for 12 hours" }, kikiIcon("star"), "Featured"));
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
        const page = await this.ui.options.client.request<CloudPage<CloudReactionMember>>("GET", `/v1/reactions/${type}/${id}?cursor=${cursor}&limit=40`);
        if (!active || !this.ui.options.client.connected) return;
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
        more.querySelector("span")!.textContent = count >= 200 ? "Next reactions" : "More reactions";
        status.textContent = !count ? "No reactions to show." : "";
      } catch { if (active) status.textContent = "Could not load reactions. Try again."; }
      finally { busy = false; more.disabled = false; }
    };
    const more = this.ui.button("More reactions", load, "next");
    const body = element("div", { className: "kl-cloud kl-reaction-details" }, status, list, more);
    anchor.querySelector<HTMLElement>(".kl-social-menu > summary")?.focus({ preventScroll: true });
    dialog.show("Reactions", body, () => { active = false; });
    void load();
  }
  #composer(): HTMLElement {
    const card = element("section", { className: "kl-cloud-card kl-feed-composer", ariaLabel: "Create a post" });
    const text = element("textarea", { placeholder: "What's on your mind?", ariaLabel: "Share a post", maxLength: 4000, value: this.#draft, title: TEXT_FORMAT_HINT });
    const remaining = element("span", { className: "kl-composer-count" });
    const files = element("input", { type: "file", accept: "image/png,image/jpeg,image/webp", multiple: true, hidden: true, ariaLabel: "Attach up to 4 images" });
    const previews = element("div", { className: "kl-feed-attachments" });
    const pollSlot = element("div", { className: "kl-feed-poll-compose" });
    this.#draftStatus = element("small", { className: "kl-feed-draft-status", role: "status" });
    let posting = false;
    const update = () => {
      remaining.textContent = `${this.#draft.length} / 4000`;
      post.disabled = posting || (!this.#pendingPost && ((!this.#draft.trim() && !this.#files.length && !this.#pollDraft) || !validPollDraft(this.#pollDraft)
        || Boolean(this.#pollDraft && !this.#features.feedPolls) || Boolean(this.#spoilerFiles.size && !this.#features.feedSpoilers)));
      pollButton?.setAttribute("aria-pressed", String(Boolean(this.#pollDraft)));
      if (pollButton) pollButton.disabled = posting;
      discard.disabled = posting || (!this.#draft && !this.#files.length && !this.#pollDraft);
      for (const control of previews.querySelectorAll<HTMLButtonElement>("button")) control.disabled = posting;
      post.title = this.#pendingPost ? "Retry the previous post; new edits stay in your draft" : "Post";
      post.querySelector("span")!.textContent = this.#pendingPost && !posting ? "Retry post" : "Post";
      this.#updateDraftStatus();
    };
    const change = () => { this.#saveDraft(); update(); };
    const renderPoll = () => {
      pollSlot.replaceChildren();
      if (this.#pollDraft) pollSlot.append(pollEditor(this.ui, this.#pollDraft, change),
        this.ui.button("Remove poll", () => { if (posting) return; this.#pollDraft = null; renderPoll(); change(); }, "close"));
    };
    const renderFiles = () => {
      this.#releasePreviews(); previews.replaceChildren();
      for (const file of this.#files) {
        const url = URL.createObjectURL(file); this.#previews.set(file, url);
        const remove = this.ui.button(`Remove ${file.name}`, () => { if (posting) return; this.#files = this.#files.filter(f => f !== file); this.#spoilerFiles.delete(file); renderFiles(); change(); }, "close", "kl-social-icon-button");
        const attachment = element("div", { className: "kl-feed-attachment" },
          element("div", { className: "kl-feed-attachment-image" }, element("img", { src: url, alt: file.name })), remove);
        if (this.#features.feedSpoilers || this.#spoilerFiles.has(file)) {
          const updateSpoiler = () => {
            const hidden = this.#spoilerFiles.has(file), label = `${hidden ? "Remove spoiler from" : "Mark as spoiler:"} ${file.name}`;
            spoiler.setAttribute("aria-pressed", String(hidden)); spoiler.setAttribute("aria-label", label); spoiler.title = label;
            attachment.dataset.spoiler = String(hidden);
          };
          const spoiler = this.ui.button(`Mark as spoiler: ${file.name}`, () => {
            if (posting) return;
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
      const selected = [...(files.files ?? [])]; files.value = "";
      if (this.#files.length + selected.length > 4) throw new CloudError("too_many_images");
      for (const file of selected) if (!/^image\/(png|jpeg|webp)$/u.test(file.type) || file.size > 5 * 1024 ** 2) throw new CloudError("image_size_or_type");
      this.#files.push(...selected); renderFiles(); change();
    }));
    text.addEventListener("input", () => { this.#draft = text.value; change(); });
    const post = this.ui.button("Post", async () => {
      if (posting) return;
      const attempt: PendingFeedPost = this.#pendingPost ?? { text: this.#draft, files: [...this.#files], clientId: this.#clientId,
        poll: this.#pollDraft ? structuredClone(this.#pollDraft) : null, spoilerFiles: this.#files.filter(file => this.#spoilerFiles.has(file)) };
      const owner = this.ui.options.client.memberNumber, epoch = this.#accountEpoch;
      const { text: draft, files: selected, clientId, poll, spoilerFiles } = attempt, pollSnapshot = JSON.stringify(poll);
      text.focus({ preventScroll: true });
      posting = true; update();
      for (const control of pollSlot.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input,select,button")) control.disabled = true;
      try {
        const mediaIds: string[] = [...(attempt.mediaIds ?? [])];
        const spoilerMediaIds: string[] = [...(attempt.spoilerMediaIds ?? [])];
        for (const file of attempt.mediaIds ? [] : selected) {
          let asset = this.#uploaded.get(file);
          if (!asset) {
            asset = (await this.ui.options.client.request<CloudMedia>("POST", "/v1/media/feed", file)).id;
            this.#uploaded.set(file, asset);
          }
          mediaIds.push(asset);
          if (spoilerFiles.includes(file)) spoilerMediaIds.push(asset);
        }
        if (!this.ui.options.client.connected || this.ui.options.client.memberNumber !== owner || this.#accountEpoch !== epoch || clientId !== this.#clientId) return;
        this.#pendingPost = { ...attempt, mediaIds, spoilerMediaIds }; this.#saveDraft();
        const created = await this.ui.options.client.request<CloudPost>("POST", "/v1/feed", { text: draft, mediaIds, clientId,
          ...(this.#features.feedSpoilers ? { spoilerMediaIds } : {}), ...(poll ? { poll } : {}) });
        if (!this.ui.options.client.connected || this.ui.options.client.memberNumber !== owner || this.#accountEpoch !== epoch || clientId !== this.#clientId) return;
        this.#draft = remainingDraftAfterSend(this.#draft, draft); text.value = this.#draft;
        this.#files = this.#files.filter(file => !selected.includes(file));
        for (const file of selected) this.#spoilerFiles.delete(file);
        if (JSON.stringify(this.#pollDraft) === pollSnapshot) this.#pollDraft = null;
        this.#pendingPost = undefined;
        this.#clientId = crypto.randomUUID();
        if (!this.#draft && !this.#files.length && !this.#pollDraft) {
          this.#draftVersion++; void this.#draftStore?.clear().catch(() => this.#updateDraftStatus());
        } else this.#saveDraft();
        if (card.isConnected) { renderFiles(); renderPoll(); }
        this.#postCreated?.(created);
      } catch (error) {
        // A lost response may follow a committed post. Resolve exactly that
        // attempt using its original id; newer typing remains the next draft.
        if (this.#clientId === clientId && this.#accountEpoch === epoch && error instanceof CloudError && error.code !== "idempotency_conflict" && error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status)) {
          this.#pendingPost = undefined;
          this.#clientId = crypto.randomUUID();
          this.#saveDraft();
        }
        throw error;
      } finally {
        posting = false;
        for (const control of pollSlot.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input,select,button")) {
          const label = control.getAttribute("aria-label"), count = this.#pollDraft?.options.length ?? 0;
          control.disabled = label === "Add option" ? count >= 6 : Boolean(label?.startsWith("Remove option ") && count <= 2);
        }
        update();
      }
    }, "send", "kl-social-button kl-social-primary", false);
    const attach = this.ui.button("Photo", () => files.click(), "image");
    const pollButton = this.#features.feedPolls ? this.ui.button("Poll", () => {
      if (posting) return;
      if (!this.#pollDraft) this.#pollDraft = { question: "", options: ["", ""], multiple: false, closesAt: Date.now() + 86_400_000 };
      renderPoll(); change(); pollSlot.querySelector<HTMLInputElement>("input")?.focus();
    }, "poll") : undefined;
    const spoiler = this.#features.feedSpoilers ? this.ui.button("Spoiler text", () => insertSpoiler(text), "eye-off") : undefined;
    const discard = this.ui.button("Discard draft", () => this.ui.confirm(card, "Discard this saved draft and its attachments?", async () => {
      if (posting) return;
      await this.#draftStore?.clear(); this.#draft = ""; text.value = ""; this.#files = []; this.#spoilerFiles.clear(); this.#pollDraft = null;
      this.#clientId = crypto.randomUUID(); this.#pendingPost = undefined; this.#draftVersion++; renderFiles(); renderPoll(); update();
    }, "Discard"), "trash", "kl-social-button kl-feed-discard");
    text.addEventListener("keydown", event => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); if (!post.disabled) post.click(); }
    });
    card.append(this.ui.member(this.ui.options.client.memberNumber, undefined, undefined, true), text, previews, pollSlot,
      element("div", { className: "kl-feed-compose-actions" },
        element("div", { className: "kl-feed-compose-tools", role: "group", ariaLabel: "Add to your post" }, attach, pollButton, spoiler, files),
        element("div", { className: "kl-feed-compose-submit" }, remaining, post)),
      element("div", { className: "kl-feed-draft-row" }, this.#draftStatus, discard),
      element("small", { className: "kl-feed-compose-hint", text: "Up to 4 images · 5 MiB each · Ctrl + Enter to post" }));
    if ((!this.#features.feedPolls && this.#pollDraft) || (!this.#features.feedSpoilers && this.#spoilerFiles.size))
      card.append(element("p", { className: "kl-cloud-note", text: "This saved draft uses features not available on this Cloud yet. You can remove its poll or spoiler markings to post." }));
    renderFiles(); renderPoll(); return card;
  }
  #post(post: CloudPost): HTMLElement {
    const card = element("article", { className: "kl-cloud-card kl-feed-post" });
    card.dataset.postId = String(post.id);
    card.append(element("p", { className: "kl-feed-post-text" }));
    this.#updatePostText(card, post);
    const actions: HTMLElement[] = [];
    const copy = this.ui.button("Copy text", async () => {
      if (!navigator.clipboard?.writeText) throw new CloudError("clipboard_unavailable");
      await navigator.clipboard.writeText(post.text);
      copy.querySelector("span")!.textContent = "Copied";
    }, "copy");
    actions.push(copy);
    const preference = (key: "bookmark" | "watch" | "hide", field: "bookmarked" | "watching" | "hidden", icon: "bookmark" | "notifications" | "eye-off", on: string, off: string) => {
      const button = this.ui.button(post[field] ? on : off, async () => {
        const next = await this.ui.options.client.request<CloudPost>("PUT", `/v1/feed/${post.id}/${key}`, { [field]: !post[field] });
        if (!card.isConnected || !this.ui.options.client.connected) return;
        this.#contentVersion++; this.#patchPost(card, post, next);
        const disappears = key === "hide" || (key === "bookmark" && this.#filter === "saved" && !next.bookmarked);
        if (!disappears || this.element.dataset.focusedPost === "true") return;
        const parent = card.parentElement;
        const notice = element("div", { className: "kl-feed-undo", role: "status" }, element("span", { text: key === "hide" ? next.hidden ? "Post hidden from your Feed." : "Post restored to your Feed." : "Post removed from Saved." }));
        if (key === "hide") notice.append(this.ui.button("Undo", async () => {
          const restored = await this.ui.options.client.request<CloudPost>("PUT", `/v1/feed/${post.id}/hide`, { hidden: !next.hidden });
          this.#contentVersion++; notice.remove(); this.#postCreated?.(restored);
        }, "back"));
        notice.append(this.ui.button("Dismiss", () => notice.remove(), "close", "kl-social-icon-button"));
        parent?.querySelector(".kl-feed-undo")?.remove(); card.before(notice);
        card.remove(); this.#loaded.delete(post.id); this.#postDeleted?.(post.id); this.#pollViews.get(post.id)?.destroy(); this.#pollViews.delete(post.id); this.#renderDiscussions();
        notice.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
      }, icon);
      button.dataset.feedPreference = field; button.dataset.onLabel = on; button.dataset.offLabel = off;
      button.setAttribute("aria-pressed", String(Boolean(post[field]))); actions.push(button);
    };
    if (this.#features.feedBookmarks) preference("bookmark", "bookmarked", "bookmark", "Unsave post", "Save post");
    if (this.#features.feedWatch) preference("watch", "watching", "notifications", "Unfollow comments", "Follow comments");
    if (this.#features.feedHide) preference("hide", "hidden", "eye-off", "Restore post", "Hide post");
    if (this.#features.reactionDetails) actions.push(this.ui.button("Reactions", () => this.#showReactions(card, "post", post.id), "reactions"));
    if (this.#features.feedPins && this.options.canPin?.()) {
      const pin = this.ui.button(post.pinnedAt ? "Unpin post" : "Pin post", async () => {
        const next = await this.ui.options.client.request<CloudPost>("PUT", `/v1/feed/${post.id}/pin`, { pinned: !post.pinnedAt });
        if (!card.isConnected) return;
        this.#contentVersion++; this.#patchPost(card, post, next);
        const list = card.closest<HTMLElement>(".kl-feed-posts"); if (list) this.#orderPosts(list);
      }, "pin");
      pin.classList.add("kl-post-pin-action"); actions.push(pin);
    }
    if (post.author === this.ui.options.client.memberNumber) {
      actions.push(this.ui.button("Edit post", () => this.#postAction(card, post, "edit"), "edit", "kl-social-button", false),
        this.ui.button("Delete post", () => this.#postAction(card, post, "delete"), "trash", "kl-social-button", false));
    } else actions.push(this.ui.button("Report post", () => this.options.report(card, "post", String(post.id)), "warning"),
      this.ui.button("Block author", async () => {
        await this.ui.options.client.request("PUT", `/v1/blocks/${post.author}`, {});
        await this.render(this.#features);
      }, "lock"));
    card.prepend(element("header", { className: "kl-feed-post-header" }, this.ui.author(post.profile, post.createdAt, undefined, true), this.ui.menu("Post options", actions)));
    this.#postMedia(card, post.mediaIds, post.spoilerMediaIds);
    this.#postPoll(card, post);
    const comments = this.ui.button(`Comments${post.commentCount !== undefined ? ` · ${post.commentCount}` : ""}`, async () => {
      const open = card.querySelector(".kl-cloud-comments");
      if (open) { open.remove(); comments.setAttribute("aria-expanded", "false"); return; }
      comments.setAttribute("aria-expanded", "true"); await this.#comments(card, post.id);
    }, "chat");
    comments.setAttribute("aria-expanded", "false");
    comments.classList.add("kl-post-comments-button");
    const footer = element("footer", { className: "kl-feed-post-actions" }, this.#reactions("post", post.id, post.reactions), comments);
    card.append(footer); this.#highlightPost(card, post); return card;
  }
  #postPoll(card: HTMLElement, post: CloudPost): void {
    let poll = this.#pollViews.get(post.id);
    if (!post.poll) { poll?.destroy(); poll?.element.remove(); this.#pollViews.delete(post.id); return; }
    if (poll) { poll.update(post.poll); if (!card.contains(poll.element)) card.insertBefore(poll.element, card.querySelector(":scope > .kl-feed-post-actions")); return; }
    poll = new FeedPollView(this.ui, post.poll, async optionIds => {
      const next = await this.ui.options.client.request<CloudPost>("PUT", `/v1/feed/${post.id}/poll/vote`, { optionIds });
      if (!card.isConnected || !this.ui.options.client.connected) return;
      this.#contentVersion++; this.#patchPost(card, post, next);
    });
    this.#pollViews.set(post.id, poll); card.insertBefore(poll.element, card.querySelector(":scope > .kl-feed-post-actions"));
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
    const textChanged = next.text !== post.text || next.updatedAt !== post.updatedAt;
    const mediaChanged = JSON.stringify([next.mediaIds, next.spoilerMediaIds]) !== JSON.stringify([post.mediaIds, post.spoilerMediaIds]);
    const author = card.querySelector<HTMLElement>(".kl-social-author");
    if (author) this.ui.updateAuthor(author, next.profile);
    const reactions = card.querySelector<HTMLElement>(":scope > .kl-feed-post-actions > .kl-reactions");
    if (reactions && reactions.dataset.snapshot !== JSON.stringify(next.reactions) &&
        !reactions.matches(":focus-within") && !reactions.querySelector("details[open]"))
      reactions.replaceWith(this.#reactions("post", next.id, next.reactions));
    Object.assign(post, next); this.#highlightPost(card, post);
    for (const button of card.querySelectorAll<HTMLButtonElement>("[data-feed-preference]")) {
      const value = post[button.dataset.feedPreference as "bookmarked" | "watching" | "hidden"];
      const label = (value ? button.dataset.onLabel : button.dataset.offLabel)!;
      button.title = label; button.setAttribute("aria-label", label); button.setAttribute("aria-pressed", String(Boolean(value))); button.querySelector("span")!.textContent = label;
    }
    if (textChanged) this.#updatePostText(card, post);
    if (mediaChanged) this.#postMedia(card, post.mediaIds, post.spoilerMediaIds);
    this.#postPoll(card, post);
    this.#commentCount(card, post.id, 0, false);
  }
  #updatePostText(card: HTMLElement, post: CloudPost): void {
    const body = card.querySelector<HTMLElement>(".kl-feed-post-text")!;
    const collapsed = body.dataset.collapsed === "true" || body.textContent!.length <= 500;
    body.replaceChildren(); appendFeedFormattedText(body, post.text);
    card.querySelector(":scope > .kl-feed-expand")?.remove();
    if (post.text.length > 500 && collapsed) {
      body.dataset.collapsed = "true";
      const expand = this.ui.button("Read more", () => { delete body.dataset.collapsed; expand.remove(); });
      expand.classList.add("kl-feed-expand"); body.after(expand);
    } else delete body.dataset.collapsed;
    if (post.updatedAt > post.createdAt && !card.querySelector(":scope > .kl-social-edited"))
      body.after(element("small", { className: "kl-social-edited", text: "Edited" }));
  }
  #postAction(card: HTMLElement, post: CloudPost, kind: "edit" | "delete"): void {
    const dialog = this.#postDialog, client = this.ui.options.client;
    if (dialog.element.open || post.author !== client.memberNumber) return;
    const root = card.getRootNode(), generation = this.#generation;
    const revision = post.revision, initialText = post.text;
    const spoilerMediaIds = new Set(post.spoilerMediaIds ?? []), initialSpoilers = JSON.stringify([...spoilerMediaIds]);
    (root instanceof ShadowRoot ? root : document.body).append(dialog.element);
    dialog.element.classList.add("kl-feed-action-dialog");
    dialog.element.dataset.postId = String(post.id);
    dialog.element.querySelector("button")?.setAttribute("aria-label", kind === "edit" ? "Close post editor" : "Close delete confirmation");
    const field = kind === "edit" ? element("textarea", { value: post.text, maxLength: 4000, ariaLabel: "Post text" }) : undefined;
    const status = element("p", { className: "kl-feed-action-error", role: "alert" });
    const mediaOptions = element("div", { className: "kl-feed-edit-media" });
    let busy = false, active = true;
    const update = () => {
      submit.disabled = busy || Boolean(field && ((field.value === initialText && JSON.stringify([...spoilerMediaIds]) === initialSpoilers) || (!field.value.trim() && !post.mediaIds.length && !post.poll)));
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
          const next = await client.request<CloudPost>("PATCH", `/v1/feed/${post.id}`, { text: field.value, mediaIds: post.mediaIds, revision,
            ...(this.#features.feedSpoilers ? { spoilerMediaIds: [...spoilerMediaIds] } : {}) });
          this.#contentVersion++;
          if (generation === this.#generation && card.isConnected && client.connected && client.memberNumber === post.author && next.revision > post.revision) {
            // Keep decoded images, comments and reactions mounted. Later edits
            // use the acknowledged revision, including after closing the modal.
            this.#patchPost(card, post, next); this.#loaded.set(post.id, post); this.#renderDiscussions();
          }
          if (active) dialog.close();
        } else {
          await client.request("DELETE", `/v1/feed/${post.id}`);
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
      input.addEventListener("change", () => { if (input.checked) spoilerMediaIds.add(id); else spoilerMediaIds.delete(id); update(); });
      mediaOptions.append(element("label", { className: "kl-feed-check" }, input, `Image ${index + 1} · Spoiler`));
    }
    const form = element("div", { className: "kl-cloud-card kl-feed-action-form" },
      ...(field ? [field] : [element("p", { text: "Delete this post and its comments? This cannot be undone." })]),
      ...(field ? [mediaOptions, ...(post.poll ? [element("p", { className: "kl-cloud-note", text: "Your poll and votes are preserved. Published poll questions and answers cannot be changed." })] : [])] : []),
      status, element("div", { className: "kl-cloud-actions" }, cancel, submit));
    field?.addEventListener("input", update); update();
    // The action lives in a collapsed menu; return to its visible trigger.
    card.querySelector<HTMLElement>('.kl-social-menu > summary')?.focus({ preventScroll: true });
    dialog.show(kind === "edit" ? "Edit post" : "Delete post?", form, () => { active = false; });
    (field ?? cancel).focus({ preventScroll: true });
  }
  #reactions(type: "post" | "comment", id: number, initial: CloudReactions): HTMLElement {
    const root = element("div", { className: "kl-reactions" });
    let state = initial, busy = false;
    const allowed = this.#features.reactions ?? ["heart", "like", "laugh", "support"];
    const react = async (reaction: Reaction) => {
      if (busy) return;
      busy = true; root.setAttribute("aria-busy", "true");
      for (const button of root.querySelectorAll<HTMLButtonElement>("button")) button.disabled = true;
      try {
        state = await this.ui.options.client.request<CloudReactions>("PUT", `/v1/reactions/${type}/${id}`, { reaction: state.mine === reaction ? null : reaction });
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
      root.prepend(picker);
    };
    render(); return root;
  }
  #edit(container: HTMLElement, initial: string, max: number, save: (text: string) => Promise<void>): void {
    if (container.querySelector(".kl-social-editor")) return;
    const field = element("textarea", { value: initial, maxLength: max, ariaLabel: "Edit text" });
    const editor: HTMLDivElement = element("div", { className: "kl-social-editor" }, field,
      element("div", { className: "kl-cloud-actions" }, this.ui.button("Cancel", () => editor.remove()),
        this.ui.button("Save changes", async () => { await save(field.value); editor.remove(); }, "check", "kl-social-button kl-social-primary")));
    container.append(editor); field.focus();
  }
  async #comments(card: HTMLElement, postId: number, highlightId?: number): Promise<void> {
    const owner = this.ui.options.client.memberNumber, epoch = this.#accountEpoch;
    const box = element("section", { className: "kl-cloud-comments", ariaLabel: "Comments" });
    card.append(box);
    const list = element("div", { className: "kl-comment-list" });
    const draft = element("textarea", { placeholder: "Write a comment…", ariaLabel: "Comment", maxLength: 1000, value: this.#commentDrafts.get(postId) ?? "", title: TEXT_FORMAT_HINT });
    const replyBar = element("div", { className: "kl-comment-reply-bar" });
    let replyTo = this.#features.feedReplies ? this.#commentReplies.get(postId) : undefined;
    const updateReply = () => {
      replyBar.replaceChildren();
      if (!replyTo) return;
      replyBar.append(kikiIcon("reply"), element("span", { text: `Replying to ${replyTo.profile.displayName}` }), this.ui.button("Cancel reply", () => {
        replyTo = undefined; this.#commentReplies.delete(postId); updateReply(); draft.focus({ preventScroll: true });
      }, "close", "kl-social-icon-button"));
    };
    const remember = () => {
      this.#commentDrafts.set(postId, draft.value);
      if (this.#commentDrafts.size > 100) { const oldest = this.#commentDrafts.keys().next().value!; this.#commentDrafts.delete(oldest); this.#commentReplies.delete(oldest); }
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
      if (replyTo && blocked(replyTo.author)) { replyTo = undefined; this.#commentReplies.delete(postId); updateReply(); }
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
      if (comments.has(comment.id) || this.ui.options.isBlocked(comment.author) || this.ui.options.client.isProfileBlocked?.(comment.author)) return;
      const body = element("p"); appendFeedFormattedText(body, comment.text);
      const row = element("article", { className: "kl-social-comment" }, body);
      row.dataset.commentId = String(comment.id);
      if (comment.id === highlightId) row.classList.add("kl-highlighted-comment");
      const reply = this.ui.button("Reply", () => {
        if (this.#features.feedReplies) { replyTo = comment; this.#commentReplies.set(postId, comment); updateReply(); }
        else { draft.value = `@${comment.profile.displayName} ${draft.value}`.slice(0, 1000); remember(); }
        draft.focus({ preventScroll: true }); draft.scrollIntoView?.({ block: "nearest" });
      }, "reply");
      const actions: HTMLElement[] = [];
      if (this.#features.reactionDetails) actions.push(this.ui.button("Reactions", () => this.#showReactions(row, "comment", comment.id), "reactions"));
      if (comment.author === this.ui.options.client.memberNumber) actions.push(
        this.ui.button("Edit", () => this.#edit(row, comment.text, 1000, async text => {
          const next = await this.ui.options.client.request<CloudComment>("PATCH", `/v1/comments/${comment.id}`, { text, revision: comment.revision });
          comment.text = next.text; comment.revision = next.revision; body.replaceChildren(); appendFeedFormattedText(body, next.text);
        }), "edit"),
        this.ui.button("Delete", () => this.ui.confirm(row, "Delete this comment?", async () => {
          await this.ui.options.client.request("DELETE", `/v1/comments/${comment.id}`);
          comments.delete(comment.id); rows.delete(comment.id); placeThreads(); row.remove(); total--; this.#commentCount(card, postId, -1);
          if (replyTo?.id === comment.id) { replyTo = undefined; this.#commentReplies.delete(postId); updateReply(); }
          for (const child of comments.values()) if (child.parentId === comment.id) {
            child.replyTo = null;
            const context = rows.get(child.id)?.querySelector<HTMLElement>(":scope > .kl-comment-parent");
            if (context) { context.textContent = "Reply to an unavailable comment"; context.setAttribute("aria-label", "Reply to an unavailable comment"); context.removeAttribute("title"); delete context.dataset.replyAuthor; }
          }
        }), "trash"));
      else actions.push(this.ui.button("Report", () => this.options.report(row, "comment", String(comment.id)), "warning"));
      row.prepend(element("header", { className: "kl-comment-header" }, this.ui.author(comment.profile, comment.createdAt, undefined, true), this.ui.menu("Comment options", actions)));
      if (comment.parentId) {
        const context = this.ui.button(comment.replyTo ? `Reply to ${comment.replyTo.profile.displayName}` : "Reply to an unavailable comment", () => {
          const target = rows.get(comment.parentId!);
          if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); target.scrollIntoView?.({ block: "center" }); }
          else if (comment.replyTo) return this.openPost(postId, comment.parentId!);
        }, "reply", "kl-social-button kl-comment-parent");
        if (comment.replyTo) context.dataset.replyAuthor = String(comment.replyTo.author);
        body.before(context);
      }
      row.append(element("div", { className: "kl-comment-actions" }, this.#reactions("comment", comment.id, comment.reactions), reply));
      list.append(row); comments.set(comment.id, comment); rows.set(comment.id, row); total++;
    };
    const load = async () => {
      if (busy || !box.isConnected) return;
      busy = true;
      try {
        const page = await this.ui.options.client.request<CloudPage<CloudComment>>("GET", `/v1/feed/${postId}/comments?cursor=${cursor}&limit=20`);
        if (!box.isConnected) return;
        for (const comment of page.items) if (total < 100) addComment(comment);
        placeThreads();
        if (page.nextCursor !== null && (page.nextCursor <= 0 || (cursor > 0 && page.nextCursor <= cursor))) throw new CloudError("invalid_cursor");
        cursor = page.nextCursor ?? 0; more.hidden = page.nextCursor === null;
        more.querySelector("span")!.textContent = total >= 100 ? "Next comments" : "More comments";
      } finally { busy = false; }
    };
    const more = this.ui.button("More comments", async () => {
      if (total >= 100) { list.replaceChildren(); comments.clear(); rows.clear(); total = 0; }
      await load();
    }, "next");
    const send = this.ui.button("Send comment", async () => {
      if (sending || !draft.value.trim()) { draft.focus(); return; }
      const submitted = draft.value, parent = replyTo;
      sending = true; send.disabled = true; draft.focus({ preventScroll: true });
      try {
        const created = await this.ui.options.client.request<CloudComment>("POST", `/v1/feed/${postId}/comments`, { text: submitted,
          ...(this.#features.feedReplies && parent ? { parentId: parent.id } : {}) });
        if (!this.ui.options.client.connected || this.ui.options.client.memberNumber !== owner || this.#accountEpoch !== epoch) return;
        this.#contentVersion++; this.#commentCount(card, postId, 1);
        const current = this.#commentDrafts.get(postId) ?? draft.value;
        const remaining = remainingDraftAfterSend(current, submitted);
        if (remaining) this.#commentDrafts.set(postId, remaining); else this.#commentDrafts.delete(postId);
        if (this.#commentReplies.get(postId)?.id === parent?.id) this.#commentReplies.delete(postId);
        if (box.isConnected) {
          draft.value = remaining;
          if (replyTo?.id === parent?.id) replyTo = undefined;
          updateReply();
          if (created?.id) {
            if (total >= 100) { list.replaceChildren(); comments.clear(); rows.clear(); total = 0; }
            addComment(created); placeThreads();
          }
        }
      } finally { sending = false; send.disabled = false; }
    }, "send", "kl-social-button kl-social-primary", false);
    draft.addEventListener("keydown", event => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); if (!sending) send.click(); }
    });
    const composer = element("div", { className: "kl-comment-compose" }, draft, send);
    if (this.#features.feedSpoilers) composer.append(this.ui.button("Spoiler comment text", () => insertSpoiler(draft), "eye-off", "kl-social-button kl-comment-spoiler-tool"));
    box.append(list, more, replyBar, composer); updateReply();
    try {
      if (highlightId) {
        try {
          const comment = await this.ui.options.client.request<CloudComment>("GET", `/v1/comments/${highlightId}`);
          if (comment.postId !== postId) throw new CloudError("content_unavailable");
          if (!box.isConnected) return;
          cursor = Math.max(0, highlightId - 1);
          box.prepend(this.ui.button("Show all comments", async () => { box.remove(); await this.#comments(card, postId); }));
        } catch {
          if (!box.isConnected) return;
          box.prepend(element("p", { className: "kl-cloud-note", text: "The notified comment is no longer available." }));
        }
      }
      await load();
      const highlighted = list.querySelector<HTMLElement>(".kl-highlighted-comment");
      if (highlighted) { highlighted.tabIndex = -1; highlighted.focus({ preventScroll: true }); highlighted.scrollIntoView?.({ block: "center" }); }
    } catch (error) { box.remove(); throw error; }
  }
  #commentCount(card: HTMLElement, id: number, delta: number, updateDiscussion = true): void {
    const post = this.#loaded.get(id);
    if (!post || post.commentCount === undefined) return;
    if (delta) this.#contentVersion++;
    post.commentCount = Math.max(0, post.commentCount + delta);
    const button = card.querySelector<HTMLButtonElement>(".kl-post-comments-button");
    const label = `Comments · ${post.commentCount}`;
    button?.setAttribute("aria-label", label); button?.setAttribute("title", label);
    const copy = button?.querySelector("span"); if (copy) copy.textContent = label;
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
