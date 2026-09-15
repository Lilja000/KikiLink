import { element } from "./dom";
import { CloudError } from "./client";
import { SocialUI, REACTIONS, type Reaction } from "./social-ui";
import { kikiIcon } from "../modules/link-chat/icons";
import type { CloudComment, CloudMedia, CloudPage, CloudPost, CloudProfile, CloudReactions } from "./types";

interface FeedOptions {
  openOwnProfile(): void;
  openGroups(): void;
  report(container: HTMLElement, type: string, id: string): void;
  relatedMembers?(): ReadonlySet<number>;
}
export interface SocialFeatures { groupPins?: boolean; groupLive?: boolean; groupInbox?: boolean; groupAvatar?: boolean; fullProfile?: boolean; feedSearch?: boolean; messageChanges?: boolean; reactions?: string[] }

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
  readonly #discussion = element("section", { className: "kl-cloud-card kl-feed-discussions", ariaLabel: "From your circle" });

  constructor(readonly ui: SocialUI, readonly options: FeedOptions) {}

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

  pause(): void { this.#generation++; this.#releasePreviews(); }
  clear(): void {
    this.pause(); this.#draft = ""; this.#files = []; this.#commentDrafts.clear();
    this.#uploaded = new WeakMap(); this.#query = ""; this.#filter = "all";
    this.#clientId = crypto.randomUUID(); this.element.replaceChildren();
    this.#loaded.clear(); this.#discussion.replaceChildren();
  }
  #releasePreviews(): void {
    for (const url of this.#previews.values()) URL.revokeObjectURL(url);
    this.#previews.clear();
  }
  async render(features: SocialFeatures = {}): Promise<void> {
    this.#features = features;
    const generation = ++this.#generation;
    this.#releasePreviews();
    this.#loaded.clear();
    const main = element("div", { className: "kl-feed-main" });
    const sidebar = element("aside", { className: "kl-feed-aside", ariaLabel: "Your KikiLink" },
      element("div", { className: "kl-cloud-card kl-feed-self" },
        this.ui.member(this.ui.options.client.memberNumber),
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
    const load = async () => {
      if (busy || !hasMore || generation !== this.#generation) return;
      busy = true; more.disabled = true; loading.hidden = false;
      const q = this.#filter === "mine" ? `#${this.ui.options.client.memberNumber}` : this.#query;
      const params = new URLSearchParams({ limit: "20", cursor: String(cursor) });
      if (q && this.#features.feedSearch) params.set("q", q);
      try {
        const page = await this.ui.options.client.request<CloudPage<CloudPost>>("GET", `/v1/feed?${params}`);
        if (generation !== this.#generation) return;
        // Retain a bounded DOM. Continue explicitly to the next window when full.
        if (total >= 100) { list.replaceChildren(); total = 0; seen.clear(); this.#loaded.clear(); }
        for (const post of page.items) {
          if (seen.has(post.id) || this.ui.options.isBlocked(post.author)) continue;
          seen.add(post.id);
          if (this.#filter === "mine" && post.author !== this.ui.options.client.memberNumber) continue;
          if (this.#query) {
            const member = /^#\d+$/u.test(this.#query) ? Number(this.#query.slice(1)) : 0;
            if (member ? post.author !== member : !this.#query.normalize("NFKC").toLowerCase().split(/\s+/u).every(word => post.text.normalize("NFKC").toLowerCase().includes(word))) continue;
          }
          this.#loaded.set(post.id, post); list.append(this.#post(post)); total++;
        }
        this.#renderDiscussions();
        if (page.nextCursor !== null && (page.nextCursor <= 0 || (cursor > 0 && page.nextCursor >= cursor)))
          throw new CloudError("invalid_cursor");
        cursor = page.nextCursor ?? 0; hasMore = page.nextCursor !== null;
        more.hidden = !hasMore;
        more.querySelector("span")!.textContent = total >= 100 ? "Continue to older posts" : "Load more posts";
        status.textContent = total ? `${total} ${total === 1 ? "post" : "posts"}${this.#query ? ` matching “${this.#query}”` : ""}` : "";
        list.querySelector(".kl-feed-empty")?.remove();
        if (!total) list.append(element("div", { className: "kl-feed-empty" },
          element("h3", { text: this.#query || this.#filter === "mine" ? "No matches here yet" : "A little quiet here" }),
          element("p", { text: hasMore ? "Load more to look through older posts." : this.#query ? "Try another phrase or a member number." : "Share a thought or a photo to start the conversation." })));
      } finally {
        busy = false;
        if (generation === this.#generation) { more.disabled = false; loading.hidden = true; }
      }
    };
    const more = this.ui.button("Load more posts", load, "next", "kl-social-button kl-feed-more");
    main.append(more);
    await load();
  }
  #composer(): HTMLElement {
    const card = element("section", { className: "kl-cloud-card kl-feed-composer", ariaLabel: "Create a post" });
    const text = element("textarea", { placeholder: "What's on your mind?", ariaLabel: "Share a post", maxLength: 4000, value: this.#draft });
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
      posting = true; update(); text.disabled = true; attach.disabled = true;
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
        await this.ui.options.client.request("POST", "/v1/feed", { text: draft, mediaIds, clientId });
        if (!this.ui.options.client.connected || clientId !== this.#clientId) return;
        this.#draft = ""; this.#files = []; this.#clientId = crypto.randomUUID();
        if (card.isConnected) await this.render(this.#features);
      } finally { posting = false; text.disabled = false; attach.disabled = false; update(); }
    }, "send", "kl-social-button kl-social-primary");
    const attach = this.ui.button("Photo", () => files.click(), "image");
    text.addEventListener("keydown", event => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); if (!post.disabled) post.click(); }
    });
    card.append(this.ui.member(this.ui.options.client.memberNumber), text, previews,
      element("div", { className: "kl-feed-compose-actions" }, attach, files, remaining, post),
      element("small", { className: "kl-feed-compose-hint", text: "Up to 4 images · 5 MiB each · Ctrl + Enter to post" }));
    renderFiles(); return card;
  }
  #post(post: CloudPost): HTMLElement {
    const card = element("article", { className: "kl-cloud-card kl-feed-post" });
    card.dataset.postId = String(post.id);
    const body = element("p", { className: "kl-feed-post-text", text: post.text });
    if (post.text.length > 500) {
      body.dataset.collapsed = "true";
      const expand = this.ui.button("Read more", () => { delete body.dataset.collapsed; expand.remove(); });
      card.append(body, expand);
    } else card.append(body);
    const actions: HTMLElement[] = [];
    const copy = this.ui.button("Copy text", async () => {
      if (!navigator.clipboard?.writeText) throw new CloudError("clipboard_unavailable");
      await navigator.clipboard.writeText(post.text);
      copy.querySelector("span")!.textContent = "Copied";
    }, "copy");
    actions.push(copy);
    if (post.author === this.ui.options.client.memberNumber) {
      actions.push(this.ui.button("Edit post", () => this.#edit(card, post.text, 4000, async text => {
        const next = await this.ui.options.client.request<CloudPost>("PATCH", `/v1/feed/${post.id}`, { text, mediaIds: post.mediaIds, revision: post.revision });
        if (card.isConnected) { this.#loaded.set(next.id, next); card.replaceWith(this.#post(next)); this.#renderDiscussions(); }
      }), "edit"), this.ui.button("Delete post", () => this.ui.confirm(card, "Delete this post?", async () => {
        await this.ui.options.client.request("DELETE", `/v1/feed/${post.id}`); card.remove(); this.#loaded.delete(post.id); this.#renderDiscussions();
      }), "trash"));
    } else actions.push(this.ui.button("Report post", () => this.options.report(card, "post", String(post.id)), "warning"),
      this.ui.button("Block author", async () => {
        await this.ui.options.client.request("PUT", `/v1/blocks/${post.author}`, {});
        await this.render(this.#features);
      }, "lock"));
    card.prepend(element("header", { className: "kl-feed-post-header" }, this.ui.author(post.profile, post.createdAt), this.ui.menu("Post options", actions)));
    if (post.updatedAt > post.createdAt) body.after(element("small", { className: "kl-social-edited", text: "Edited" }));
    if (post.mediaIds.length) {
      const images = element("div", { className: "kl-cloud-images kl-feed-media" }); images.dataset.count = String(post.mediaIds.length);
      for (const id of post.mediaIds) images.append(this.ui.options.image(id, "Feed image"));
      card.append(images);
    }
    const comments = this.ui.button(`Comments${post.commentCount !== undefined ? ` · ${post.commentCount}` : ""}`, async () => {
      const open = card.querySelector(".kl-cloud-comments");
      if (open) { open.remove(); comments.setAttribute("aria-expanded", "false"); return; }
      comments.setAttribute("aria-expanded", "true"); await this.#comments(card, post.id);
    }, "chat");
    comments.setAttribute("aria-expanded", "false");
    comments.classList.add("kl-post-comments-button");
    const footer = element("footer", { className: "kl-feed-post-actions" }, this.#reactions("post", post.id, post.reactions), comments);
    card.append(footer); return card;
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
  async #comments(card: HTMLElement, postId: number): Promise<void> {
    const box = element("section", { className: "kl-cloud-comments", ariaLabel: "Comments" });
    card.append(box);
    const list = element("div", { className: "kl-comment-list" });
    const draft = element("textarea", { placeholder: "Write a comment…", ariaLabel: "Comment", maxLength: 1000, value: this.#commentDrafts.get(postId) ?? "" });
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
          const row = element("article", { className: "kl-social-comment" }, this.ui.author(comment.profile, comment.createdAt), element("p", { text: comment.text }));
          const actions = [this.ui.button("Reply", () => { draft.value = `@${comment.profile.displayName} ${draft.value}`.slice(0, 1000); draft.dispatchEvent(new Event("input")); draft.focus(); }, "reply")];
          if (comment.author === this.ui.options.client.memberNumber) actions.push(
            this.ui.button("Edit", () => this.#edit(row, comment.text, 1000, async text => {
              const next = await this.ui.options.client.request<CloudComment>("PATCH", `/v1/comments/${comment.id}`, { text, revision: comment.revision });
              comment.text = next.text; comment.revision = next.revision; row.querySelector("p")!.textContent = next.text;
            }), "edit"),
            this.ui.button("Delete", () => this.ui.confirm(row, "Delete this comment?", async () => {
              await this.ui.options.client.request("DELETE", `/v1/comments/${comment.id}`); row.remove(); this.#commentCount(card, postId, -1);
            }), "trash"));
          else actions.push(this.ui.button("Report", () => this.options.report(row, "comment", String(comment.id)), "warning"));
          row.append(element("div", { className: "kl-comment-actions" }, this.#reactions("comment", comment.id, comment.reactions), ...actions));
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
        this.#commentCount(card, postId, 1);
        this.#commentDrafts.delete(postId);
        box.remove(); if (card.isConnected) await this.#comments(card, postId);
      } finally { draft.disabled = false; }
    }, "send", "kl-social-button kl-social-primary");
    box.append(list, more, element("div", { className: "kl-comment-compose" }, draft, send));
    try { await load(); } catch (error) { box.remove(); throw error; }
  }
  #commentCount(card: HTMLElement, id: number, delta: number): void {
    const post = this.#loaded.get(id);
    if (!post || post.commentCount === undefined) return;
    post.commentCount = Math.max(0, post.commentCount + delta);
    const button = card.querySelector<HTMLButtonElement>(".kl-post-comments-button");
    const label = `Comments · ${post.commentCount}`;
    button?.setAttribute("aria-label", label); button?.setAttribute("title", label);
    const copy = button?.querySelector("span"); if (copy) copy.textContent = label;
    this.#renderDiscussions();
  }
  #renderDiscussions(): void {
    const circle = this.options.relatedMembers?.() ?? new Set<number>();
    const posts = [...this.#loaded.values()].filter(p => circle.has(p.author) && p.author !== this.ui.options.client.memberNumber && !this.ui.options.isBlocked(p.author))
      .sort((a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0) || b.createdAt - a.createdAt).slice(0, 3);
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
      this.#discussion.append(element("div", { className: "kl-circle-post" }, this.ui.author(post.profile), link,
        element("small", { text: `${post.commentCount ?? 0} comments · ${post.reactions.counts.reduce((sum, r) => sum + r.count, 0)} reactions` })));
    }
  }
}
