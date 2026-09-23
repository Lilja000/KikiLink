import { element } from "./dom";
import { CloudError } from "./client";
import { SocialUI, REACTIONS, type Reaction } from "./social-ui";
import { kikiIcon } from "../modules/link-chat/icons";
import { ContentDialog } from "../modules/link-chat/content-dialog";
import { appendFormattedText, TEXT_FORMAT_HINT } from "../modules/link-chat/text-format";
import { parseMessageLinks } from "../modules/link-chat/media";
import type { CloudComment, CloudFeedPage, CloudMedia, CloudPage, CloudPost, CloudProfile, CloudReactions, CloudReactionMember } from "./types";

interface FeedOptions {
  openOwnProfile(): void;
  openGroups(): void;
  report(container: HTMLElement, type: string, id: string): void;
  relatedMembers?(): ReadonlySet<number>;
  readFresh?(id: number): void;
  canRead?(): boolean;
  canPin?(): boolean;
}
export interface SocialFeatures { feedPins?: boolean; feedFeatured?: boolean; reactionDetails?: boolean; groupPins?: boolean; groupLive?: boolean; groupInbox?: boolean; groupAvatar?: boolean; fullProfile?: boolean; feedSearch?: boolean; messageChanges?: boolean; messageReceipts?: boolean; reactions?: string[] }

/** One bounded page at a time. Reactions and comments never rebuild the whole feed. */
export class CloudFeedView {
  readonly element = element("div", { className: "kl-feed-layout" });
  #generation = 0;
  #draft = "";
  #files: File[] = [];
  #clientId = crypto.randomUUID();
  #uploaded = new WeakMap<File, string>();
  #previews = new Map<File, string>();
  #commentDrafts = new Map<number, string>();
  #query = "";
  #filter: "all" | "mine" = "all";
  #features: SocialFeatures = {};
  #loaded = new Map<number, CloudPost>();
  #fresh: number | undefined;
  #observer: IntersectionObserver | undefined;
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
  constructor(readonly ui: SocialUI, readonly options: FeedOptions) {
    document.addEventListener("visibilitychange", this.#onVisible);
  }
  destroy(): void { document.removeEventListener("visibilitychange", this.#onVisible); this.clear(); this.#postDialog.destroy(); this.#reactionDialog.destroy(); }
  async sync(): Promise<boolean> {
    if (this.#syncTask) return this.#syncTask;
    if (!this.#syncPosts) return true;
    const task = this.#syncPosts(); this.#syncTask = task;
    try { return await task; } finally { if (this.#syncTask === task) this.#syncTask = undefined; }
  }
  observeFresh(): void {
    if (!this.#fresh || document.visibilityState === "hidden" || !this.options.canRead?.()) return;
    const card = this.element.querySelector<HTMLElement>(`[data-post-id="${this.#fresh}"]`);
    if (!card?.isConnected) return;
    const bounds = card.getBoundingClientRect();
    const scrollSurface = this.element.closest<HTMLElement>(".kl-cloud");
    const clip = scrollSurface?.getBoundingClientRect();
    if (clip && (bounds.top < clip.top || bounds.top >= clip.bottom)) return;
    if (bounds.bottom > 0 && bounds.top >= 0 && bounds.top < window.innerHeight && bounds.width > 0) {
      this.options.readFresh?.(this.#fresh); this.#fresh = undefined; this.#observer?.disconnect();
    }
  }
  async openPost(id: number, commentId?: number): Promise<void> {
    const generation = ++this.#generation;
    this.#syncPosts = undefined; this.#postCreated = undefined; this.#postDeleted = undefined;
    this.#postDialog.close(); this.#reactionDialog.close(); clearTimeout(this.#promotionTimer);
    this.element.dataset.focusedPost = "true";
    const main = element("div", { className: "kl-feed-main" });
    main.append(this.ui.button("Back to latest Feed", () => this.render(this.#features), "back"),
      element("p", { className: "kl-cloud-note", text: "Loading post…", role: "status" }));
    this.element.replaceChildren(main);
    this.#loaded.clear();
    const unavailable = () => {
      this.#syncPosts = undefined; this.#loaded.clear(); clearTimeout(this.#promotionTimer);
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
    }
    for (const row of this.element.querySelectorAll<HTMLElement>(".kl-social-comment")) {
      if (blocked(Number(row.querySelector<HTMLElement>("[data-cloud-member]")?.dataset.cloudMember))) row.remove();
    }
    this.#renderDiscussions();
  }

  pause(): void { clearTimeout(this.#promotionTimer); this.#reactionDialog.close(); this.#generation++; this.#syncPosts = undefined; this.#releasePreviews(); this.#postDialog.close(); }
  clear(): void {
    this.#postCreated = undefined; this.#postDeleted = undefined;
    this.#observer?.disconnect(); this.#fresh = undefined;
    this.pause(); this.#draft = ""; this.#files = []; this.#commentDrafts.clear();
    this.#uploaded = new WeakMap(); this.#query = ""; this.#filter = "all";
    this.#clientId = crypto.randomUUID(); this.element.replaceChildren();
    this.#loaded.clear(); this.#discussion.replaceChildren(); this.#discussionSignature = undefined;
  }
  #releasePreviews(): void {
    for (const url of this.#previews.values()) URL.revokeObjectURL(url);
    this.#previews.clear();
  }
  async render(features: SocialFeatures = {}): Promise<void> {
    this.#postDialog.close(); this.#reactionDialog.close(); clearTimeout(this.#promotionTimer);
    delete this.element.dataset.focusedPost;
    this.#features = features;
    const generation = ++this.#generation;
    this.#releasePreviews();
    this.#loaded.clear();
    const main = element("div", { className: "kl-feed-main" });
    const sidebar = element("aside", { className: "kl-feed-aside", ariaLabel: "Your KikiLink" },
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
    for (const [key, title] of [["all", "Everyone"], ["mine", "My posts"]] as const) {
      const button = this.ui.button(title, () => { if (this.#filter === key) return; this.#filter = key; return this.render(this.#features); });
      button.setAttribute("aria-pressed", String(this.#filter === key)); filter.append(button);
    }
    const reset = this.ui.button("Latest posts", () => { this.#query = ""; this.#filter = "all"; return this.render(this.#features); }, "refresh");
    const toolbar = element("div", { className: "kl-feed-tools" }, searchForm, element("div", { className: "kl-feed-filter-row" }, filter, reset));
    const status = element("p", { className: "kl-cloud-note kl-feed-results", role: "status" });
    const loading = element("div", { className: "kl-feed-loading", role: "status", text: "Loading posts…" });
    main.append(this.#composer(), toolbar, status, list, loading);
    this.element.replaceChildren(main, sidebar);
    let cursor = 0, total = 0, hasMore = true, busy = false;
    const seen = new Set<number>();
    const matches = (post: CloudPost) => {
      if (this.ui.options.isBlocked(post.author) || (this.#filter === "mine" && post.author !== this.ui.options.client.memberNumber)) return false;
      if (!this.#query) return true;
      const member = /^#\d+$/u.test(this.#query) ? Number(this.#query.slice(1)) : 0;
      return member ? post.author === member : this.#query.normalize("NFKC").toLowerCase().split(/\s+/u)
        .every(word => post.text.normalize("NFKC").toLowerCase().includes(word));
    };
    const updateStatus = () => {
      status.textContent = total ? `${total} ${total === 1 ? "post" : "posts"}${this.#query ? ` matching “${this.#query}”` : ""}` : "";
      list.querySelector(".kl-feed-empty")?.remove();
      if (!total) list.append(element("div", { className: "kl-feed-empty" },
        element("h3", { text: this.#query || this.#filter === "mine" ? "No matches here yet" : "A little quiet here" }),
        element("p", { text: hasMore ? "Load more to look through older posts." : this.#query ? "Try another phrase or a member number." : "Share a thought or a photo to start the conversation." })));
    };
    this.#postDeleted = id => {
      if (!seen.delete(id)) return;
      total--; updateStatus();
      more.querySelector("span")!.textContent = total >= 100 ? "Continue to older posts" : "Load more posts";
    };
    this.#postCreated = post => {
      this.#contentVersion++;
      if (seen.has(post.id) || !matches(post)) return;
      seen.add(post.id); this.#loaded.set(post.id, post);
      list.querySelector(".kl-feed-empty")?.remove();
      list.prepend(this.#post(post)); total++; this.#orderPosts(list);
      // Update only the post list; replacing the composer or its parent loses
      // keyboard focus and can discard text typed while the request was pending.
      while (total > 100) {
        const last = list.lastElementChild as HTMLElement;
        const id = Number(last.dataset.postId);
        last.remove(); seen.delete(id); this.#loaded.delete(id); total--;
      }
      more.querySelector("span")!.textContent = total >= 100 ? "Continue to older posts" : "Load more posts";
      updateStatus(); this.#renderDiscussions();
    };
    const load = async () => {
      if (busy || !hasMore || generation !== this.#generation) return;
      busy = true; more.disabled = true; loading.hidden = false;
      const q = this.#filter === "mine" ? `#${this.ui.options.client.memberNumber}` : this.#query;
      const params = new URLSearchParams({ limit: "20", cursor: String(cursor) });
      if (q && this.#features.feedSearch) params.set("q", q);
      try {
        const page = await this.ui.options.client.request<CloudFeedPage>("GET", `/v1/feed?${params}`);
        if (generation !== this.#generation) return;
        // Retain a bounded DOM. Continue explicitly to the next window when full.
        if (total >= 100) {
          for (const [id, post] of this.#loaded) if (!this.#promoted(post)) {
            list.querySelector(`[data-post-id="${id}"]`)?.remove(); this.#loaded.delete(id); seen.delete(id);
          }
          total = this.#loaded.size;
        }
        for (const post of [...(page.promoted ?? []), ...page.items]) {
          if (seen.has(post.id) || !matches(post)) continue;
          seen.add(post.id);
          this.#loaded.set(post.id, post); list.append(this.#post(post)); total++;
        }
        if (cursor === 0 && !this.#query && this.#filter === "all" && page.items[0]) {
          this.#fresh = page.items[0].id; this.#observer?.disconnect();
          if (typeof IntersectionObserver !== "undefined") {
            this.#observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) this.observeFresh(); });
            const first = list.querySelector("[data-post-id]"); if (first) this.#observer.observe(first);
          }
          this.observeFresh();
        }
        this.#orderPosts(list); this.#schedulePromotionSync();
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
        const query = this.#filter === "mine" ? `#${this.ui.options.client.memberNumber}` : this.#query;
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
        this.#loaded.delete(id); if (seen.delete(id)) total--;
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
        tail.remove(); this.#loaded.delete(id); seen.delete(id); total--; trimmedThrough = Math.max(trimmedThrough, id);
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
      if (fresh && !this.#query && this.#filter === "all") {
        this.#fresh = fresh; this.#observer?.disconnect();
        if (typeof IntersectionObserver !== "undefined") {
          this.#observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) this.observeFresh(); });
          const first = list.querySelector(`[data-post-id="${fresh}"]`); if (first) this.#observer.observe(first);
        }
        this.observeFresh();
      }
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
    let posting = false;
    const update = () => { remaining.textContent = `${this.#draft.length} / 4000`; post.disabled = posting || (!this.#draft.trim() && !this.#files.length); };
    const renderFiles = () => {
      this.#releasePreviews(); previews.replaceChildren();
      for (const file of this.#files) {
        const url = URL.createObjectURL(file); this.#previews.set(file, url);
        const remove = this.ui.button(`Remove ${file.name}`, () => { if (posting) return; this.#files = this.#files.filter(f => f !== file); renderFiles(); }, "close", "kl-social-icon-button");
        previews.append(element("div", { className: "kl-feed-attachment" },
          element("img", { src: url, alt: file.name }), remove));
      }
      update();
    };
    files.addEventListener("change", () => void this.ui.options.run(() => {
      const selected = [...(files.files ?? [])]; files.value = "";
      if (this.#files.length + selected.length > 4) throw new CloudError("too_many_images");
      for (const file of selected) if (!/^image\/(png|jpeg|webp)$/u.test(file.type) || file.size > 5 * 1024 ** 2) throw new CloudError("image_size_or_type");
      this.#files.push(...selected); renderFiles();
    }));
    text.addEventListener("input", () => { this.#draft = text.value; update(); });
    const post = this.ui.button("Post", async () => {
      if (posting) return;
      const draft = this.#draft, selected = [...this.#files], clientId = this.#clientId;
      text.focus({ preventScroll: true });
      posting = true; update(); attach.disabled = true;
      try {
        const mediaIds: string[] = [];
        for (const file of selected) {
          let asset = this.#uploaded.get(file);
          if (!asset) {
            asset = (await this.ui.options.client.request<CloudMedia>("POST", "/v1/media/feed", file)).id;
            this.#uploaded.set(file, asset);
          }
          mediaIds.push(asset);
        }
        const created = await this.ui.options.client.request<CloudPost>("POST", "/v1/feed", { text: draft, mediaIds, clientId });
        if (!this.ui.options.client.connected || clientId !== this.#clientId) return;
        if (this.#draft === draft) { this.#draft = ""; text.value = ""; }
        this.#files = this.#files.filter(file => !selected.includes(file));
        this.#clientId = crypto.randomUUID();
        if (card.isConnected) renderFiles();
        this.#postCreated?.(created);
      } catch (error) {
        // Retry an unchanged attempt with its original idempotency key. Text or
        // files added during that attempt form a different post, with a new key.
        if (this.#clientId === clientId && (this.#draft !== draft ||
          this.#files.length !== selected.length || this.#files.some((file, index) => file !== selected[index]))) {
          this.#clientId = crypto.randomUUID();
        }
        throw error;
      } finally { posting = false; attach.disabled = false; update(); }
    }, "send", "kl-social-button kl-social-primary", false);
    const attach = this.ui.button("Photo", () => files.click(), "image");
    text.addEventListener("keydown", event => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); if (!post.disabled) post.click(); }
    });
    card.append(this.ui.member(this.ui.options.client.memberNumber, undefined, undefined, true), text, previews,
      element("div", { className: "kl-feed-compose-actions" }, attach, files, remaining, post),
      element("small", { className: "kl-feed-compose-hint", text: "Up to 4 images · 5 MiB each · Ctrl + Enter to post" }));
    renderFiles(); return card;
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
    this.#postMedia(card, post.mediaIds);
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
  #postMedia(card: HTMLElement, ids: string[]): void {
    let images = card.querySelector<HTMLElement>(":scope > .kl-feed-media");
    if (!ids.length) { images?.remove(); return; }
    if (!images) {
      images = element("div", { className: "kl-cloud-images kl-feed-media" });
      card.insertBefore(images, card.querySelector(":scope > .kl-feed-post-actions"));
    }
    images.dataset.count = String(ids.length);
    const existing = new Map([...images.children].map(node => [(node as HTMLElement).dataset.assetId, node]));
    for (const id of ids) {
      const node = existing.get(id) ?? this.ui.options.image(id, "Feed image");
      (node as HTMLElement).dataset.assetId = id; images.append(node); existing.delete(id);
    }
    for (const node of existing.values()) node.remove();
  }
  #patchPost(card: HTMLElement, post: CloudPost, next: CloudPost): void {
    if (next.revision < post.revision) return;
    const textChanged = next.text !== post.text || next.updatedAt !== post.updatedAt;
    const mediaChanged = JSON.stringify(next.mediaIds) !== JSON.stringify(post.mediaIds);
    const author = card.querySelector<HTMLElement>(".kl-social-author");
    if (author) this.ui.updateAuthor(author, next.profile);
    const reactions = card.querySelector<HTMLElement>(":scope > .kl-feed-post-actions > .kl-reactions");
    if (reactions && reactions.dataset.snapshot !== JSON.stringify(next.reactions) &&
        !reactions.matches(":focus-within") && !reactions.querySelector("details[open]"))
      reactions.replaceWith(this.#reactions("post", next.id, next.reactions));
    Object.assign(post, next); this.#highlightPost(card, post);
    if (textChanged) this.#updatePostText(card, post);
    if (mediaChanged) this.#postMedia(card, post.mediaIds);
    this.#commentCount(card, post.id, 0, false);
  }
  #updatePostText(card: HTMLElement, post: CloudPost): void {
    const body = card.querySelector<HTMLElement>(".kl-feed-post-text")!;
    const collapsed = body.dataset.collapsed === "true" || body.textContent!.length <= 500;
    body.replaceChildren(); appendFormattedText(body, post.text, parseMessageLinks(post.text));
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
    (root instanceof ShadowRoot ? root : document.body).append(dialog.element);
    dialog.element.classList.add("kl-feed-action-dialog");
    dialog.element.dataset.postId = String(post.id);
    dialog.element.querySelector("button")?.setAttribute("aria-label", kind === "edit" ? "Close post editor" : "Close delete confirmation");
    const field = kind === "edit" ? element("textarea", { value: post.text, maxLength: 4000, ariaLabel: "Post text" }) : undefined;
    const status = element("p", { className: "kl-feed-action-error", role: "alert" });
    let busy = false, active = true;
    const update = () => {
      submit.disabled = busy || Boolean(field && (field.value === initialText || (!field.value.trim() && !post.mediaIds.length)));
      if (field) field.readOnly = busy;
      form.setAttribute("aria-busy", String(busy));
    };
    const cancel = this.ui.button("Cancel", () => dialog.close());
    const submit = this.ui.button(kind === "edit" ? "Save changes" : "Delete post", async () => {
      if (busy) return;
      busy = true; status.textContent = ""; update();
      try {
        if (field) {
          const next = await client.request<CloudPost>("PATCH", `/v1/feed/${post.id}`, { text: field.value, mediaIds: post.mediaIds, revision });
          this.#contentVersion++;
          if (generation === this.#generation && card.isConnected && client.connected && client.memberNumber === post.author && next.revision > post.revision) {
            // Keep decoded images, comments and reactions mounted. Later edits
            // use the acknowledged revision, including after closing the modal.
            Object.assign(post, { text: next.text, revision: next.revision, updatedAt: next.updatedAt }); this.#loaded.set(post.id, post);
            this.#updatePostText(card, post); this.#renderDiscussions();
          }
          if (active) dialog.close();
        } else {
          await client.request("DELETE", `/v1/feed/${post.id}`);
          this.#contentVersion++;
          const focus = card.nextElementSibling?.querySelector<HTMLElement>("summary") ?? card.previousElementSibling?.querySelector<HTMLElement>("summary") ?? this.element.querySelector<HTMLElement>(".kl-feed-search");
          if (generation === this.#generation && card.isConnected && client.connected && client.memberNumber === post.author) {
            card.remove(); this.#loaded.delete(post.id); this.#postDeleted?.(post.id); this.#renderDiscussions();
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
    const form = element("div", { className: "kl-cloud-card kl-feed-action-form" },
      ...(field ? [field] : [element("p", { text: "Delete this post and its comments? This cannot be undone." })]),
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
      try {
        state = await this.ui.options.client.request<CloudReactions>("PUT", `/v1/reactions/${type}/${id}`, { reaction: state.mine === reaction ? null : reaction });
        this.#contentVersion++;
        if (type === "post") { const post = this.#loaded.get(id); if (post) post.reactions = state; this.#renderDiscussions(); }
        if (root.isConnected) render();
      } finally { busy = false; root.removeAttribute("aria-busy"); }
    };
    const reactionButton = (key: Reaction, emoji: string, label: string, count?: number) => {
      const button = this.ui.button(label, () => react(key), undefined, "kl-reaction");
      button.replaceChildren(element("span", { text: emoji, ariaHidden: "true" }), ...(count ? [element("span", { text: String(count) })] : []));
      button.setAttribute("aria-pressed", String(state.mine === key));
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
      const picker = element("details", { className: "kl-reaction-picker" });
      picker.append(element("summary", { title: "Add a reaction", ariaLabel: "Add a reaction" }, kikiIcon("add-reaction")));
      const choices = element("div", { className: "kl-reaction-choices", role: "group", ariaLabel: "Choose a reaction" });
      for (const [key, emoji, label] of REACTIONS) if (allowed.includes(key)) choices.append(reactionButton(key, emoji, label));
      picker.append(choices);
      picker.addEventListener("keydown", event => { if (event.key === "Escape") { event.stopPropagation(); picker.open = false; picker.querySelector("summary")!.focus(); } });
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
    const box = element("section", { className: "kl-cloud-comments", ariaLabel: "Comments" });
    card.append(box);
    const list = element("div", { className: "kl-comment-list" });
    const draft = element("textarea", { placeholder: "Write a comment…", ariaLabel: "Comment", maxLength: 1000, value: this.#commentDrafts.get(postId) ?? "", title: TEXT_FORMAT_HINT });
    draft.addEventListener("input", () => { this.#commentDrafts.set(postId, draft.value); if (this.#commentDrafts.size > 100) this.#commentDrafts.delete(this.#commentDrafts.keys().next().value!); });
    let cursor = 0, total = 0, busy = false;
    const load = async () => {
      if (busy || !box.isConnected) return;
      busy = true;
      try {
        const page = await this.ui.options.client.request<CloudPage<CloudComment>>("GET", `/v1/feed/${postId}/comments?cursor=${cursor}&limit=20`);
        if (!box.isConnected) return;
        for (const comment of page.items) {
          if (this.ui.options.isBlocked(comment.author)) continue;
          const body = element("p"); appendFormattedText(body, comment.text, parseMessageLinks(comment.text));
          const row = element("article", { className: "kl-social-comment" }, body);
          row.dataset.commentId = String(comment.id);
          if (comment.id === highlightId) row.classList.add("kl-highlighted-comment");
          const reply = this.ui.button("Reply", () => { draft.value = `@${comment.profile.displayName} ${draft.value}`.slice(0, 1000); draft.dispatchEvent(new Event("input")); draft.focus(); }, "reply");
          const actions: HTMLElement[] = [];
          if (this.#features.reactionDetails) actions.push(this.ui.button("Reactions", () => this.#showReactions(row, "comment", comment.id), "reactions"));
          if (comment.author === this.ui.options.client.memberNumber) actions.push(
            this.ui.button("Edit", () => this.#edit(row, comment.text, 1000, async text => {
              const next = await this.ui.options.client.request<CloudComment>("PATCH", `/v1/comments/${comment.id}`, { text, revision: comment.revision });
              comment.text = next.text; comment.revision = next.revision; body.replaceChildren(); appendFormattedText(body, next.text, parseMessageLinks(next.text));
            }), "edit"),
            this.ui.button("Delete", () => this.ui.confirm(row, "Delete this comment?", async () => {
              await this.ui.options.client.request("DELETE", `/v1/comments/${comment.id}`); row.remove(); this.#commentCount(card, postId, -1);
            }), "trash"));
          else actions.push(this.ui.button("Report", () => this.options.report(row, "comment", String(comment.id)), "warning"));
          row.prepend(element("header", { className: "kl-comment-header" }, this.ui.author(comment.profile, comment.createdAt, undefined, true), this.ui.menu("Comment options", actions)));
          row.append(element("div", { className: "kl-comment-actions" }, this.#reactions("comment", comment.id, comment.reactions), reply));
          list.append(row); total++;
        }
        if (page.nextCursor !== null && (page.nextCursor <= 0 || (cursor > 0 && page.nextCursor <= cursor))) throw new CloudError("invalid_cursor");
        cursor = page.nextCursor ?? 0; more.hidden = page.nextCursor === null || total >= 100;
      } finally { busy = false; }
    };
    const more = this.ui.button("More comments", load, "next");
    const send = this.ui.button("Send comment", async () => {
      if (!draft.value.trim()) { draft.focus(); return; }
      draft.disabled = true;
      try {
        await this.ui.options.client.request("POST", `/v1/feed/${postId}/comments`, { text: draft.value });
        this.#contentVersion++;
        this.#commentCount(card, postId, 1);
        this.#commentDrafts.delete(postId);
        box.remove(); if (card.isConnected) await this.#comments(card, postId);
      } finally { draft.disabled = false; }
    }, "send", "kl-social-button kl-social-primary");
    box.append(list, more, element("div", { className: "kl-comment-compose" }, draft, send));
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
      const link = this.ui.button(post.text || "Photo post", async () => {
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
