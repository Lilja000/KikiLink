import { element } from "./dom";
import type { CloudClient } from "./client";
import { SocialUI, initials, timeLabel } from "./social-ui";
import type { CloudGroup, CloudMessage, CloudPage } from "./types";
import type { KeyValueStorage } from "../core/settings";
import { kikiIcon } from "../modules/link-chat/icons";
import { GroupListMenu } from "./group-list-menu";

interface Preview { items: CloudMessage[]; at: number }
interface Invitation { id: string; title: string; owner: number }

/** Account-local read cursors; message contents stay in memory, bounded to 40 per group. */
export class CloudGroupInbox {
  readonly element = element("div", { className: "kl-conversations kl-cloud-group-list", ariaLabel: "Group conversations" });
  groups: CloudGroup[] = [];
  #invitations: Invitation[] = [];
  #previews = new Map<string, Preview>();
  #reads = new Map<string, number>();
  #task: Promise<void> | undefined;
  #generation = 0;
  #updatedAt = 0;
  #dirty = true;
  #query = "";
  #selected: string | undefined;
  #rows = new Map<string, HTMLButtonElement>();
  #drafts = new Map<string, string>();
  #storageKey: string;
  #error = "";
  #limit = 20;
  #unreadOnly = false;
  readonly #preferences = new Map<string, { pinned: boolean; muted: boolean }>();
  readonly #menu: GroupListMenu;
  readonly #preferencesKey: string;
  #baseline = false;

  constructor(readonly client: CloudClient, readonly ui: SocialUI, readonly storage: KeyValueStorage,
    readonly options: { select(group: CloudGroup): void; changed(): void; inviteChanged(): Promise<void>; incoming?(group: CloudGroup, message: CloudMessage): void }) {
    this.#storageKey = `kikilink:cloud:group-reads:${client.memberNumber}:v1`;
    try {
      const stored = JSON.parse(storage.getItem(this.#storageKey) ?? "{}");
      for (const [id, sequence] of Object.entries(stored).slice(0, 100))
        if (id.length <= 80 && Number.isSafeInteger(sequence) && (sequence as number) >= 0) this.#reads.set(id, sequence as number);
    } catch { /* A browser storage failure does not prevent reading a group. */ }
    this.#preferencesKey = `kikilink:cloud:group-preferences:${client.memberNumber}:v1`;
    try {
      const stored = JSON.parse(storage.getItem(this.#preferencesKey) ?? "{}");
      for (const [id, value] of Object.entries(stored).slice(0, 100)) {
        if (id.length > 80 || !value || typeof value !== "object") continue;
        const entry = value as { pinned?: unknown; muted?: unknown };
        this.#preferences.set(id, { pinned: entry.pinned === true, muted: entry.muted === true });
      }
    } catch { /* Default preferences remain usable. */ }
    this.#menu = new GroupListMenu(this.element, id => this.groups.some(g => g.id === id) ? [
      this.ui.button(this.isPinned(id) ? "Unpin group" : "Pin group", () => { this.togglePinned(id); this.#menu.close(); }, "pin"),
      this.ui.button(this.isMuted(id) ? "Unmute group" : "Mute group", () => { this.toggleMuted(id); this.#menu.close(); }, "notifications"),
    ] : []);
  }
  isPinned(id: string): boolean { return this.#preferences.get(id)?.pinned ?? false; }
  isMuted(id: string): boolean { return this.#preferences.get(id)?.muted ?? false; }
  togglePinned(id: string): void { this.#setPreference(id, "pinned", !this.isPinned(id)); }
  toggleMuted(id: string): void { this.#setPreference(id, "muted", !this.isMuted(id)); }
  #setPreference(id: string, key: "pinned" | "muted", value: boolean): void {
    if (!this.groups.some(g => g.id === id)) return;
    this.#preferences.set(id, { pinned: this.isPinned(id), muted: this.isMuted(id), [key]: value });
    while (this.#preferences.size > 100) this.#preferences.delete(this.#preferences.keys().next().value!);
    try { this.storage.setItem(this.#preferencesKey, JSON.stringify(Object.fromEntries(this.#preferences))); }
    catch { /* Session preference still suppresses alerts. */ }
    this.render(); this.options.changed();
  }
  get unreadGroups(): number { return this.groups.filter(group => this.hasUnread(group.id)).length; }
  hasUnread(id: string): boolean {
    const read = this.#reads.get(id) ?? 0;
    const group = this.groups.find(g => g.id === id);
    if (group?.incomingSequences) return group.incomingSequences.some(m => m.sequence > read && !this.ui.options.isBlocked(m.memberNumber));
    const summary = group?.lastIncomingSequence;
    if (summary !== undefined) return summary > read;
    return this.#previews.get(id)?.items.some(m => m.sequence > read && m.sender !== this.client.memberNumber && m.text !== null && !this.ui.options.isBlocked(m.sender)) ?? false;
  }
  unreadOnly(value: boolean): void { if (value !== this.#unreadOnly) { this.#unreadOnly = value; this.#limit = 20; this.render(); } }
  async markAllRead(): Promise<void> {
    await this.refresh(true);
    for (const group of this.groups) this.markRead(group.id, group.lastMessage?.sequence ?? this.#previews.get(group.id)?.items.at(-1)?.sequence ?? 0, true);
    this.#saveReads(); this.render(); this.options.changed();
  }
  invalidate(): void { this.#dirty = true; }
  search(query: string): void { if (query === this.#query) return; this.#query = query; this.#limit = 20; this.render(); }
  select(id?: string): void { this.#selected = id; this.render(); }
  draft(id: string, text: string): void { if (text) this.#drafts.set(id, text); else this.#drafts.delete(id); this.render(); }
  observe(id: string, items: CloudMessage[], read = false): void {
    if (!this.client.connected) return;
    const before = this.#previews.get(id)?.items ?? [];
    const merged = new Map(before.map(m => [m.id, m]));
    for (const message of items) merged.set(message.id, message);
    const messages = [...merged.values()].sort((a, b) => a.sequence - b.sequence).slice(-40);
    this.#previews.set(id, { items: messages, at: Date.now() });
    const group = this.groups.find(g => g.id === id);
    if (group && group.lastIncomingSequence !== undefined) {
      for (const m of items) {
        if (m.text !== null && !this.ui.options.isBlocked(m.sender)) {
          if (m.sequence > (group.lastMessage?.sequence ?? 0)) group.lastMessage = m;
          if (m.sender !== this.client.memberNumber) group.lastIncomingSequence = Math.max(group.lastIncomingSequence, m.sequence);
          if (m.sender !== this.client.memberNumber && group.incomingSequences) {
            const entry = group.incomingSequences.find(s => s.memberNumber === m.sender);
            if (entry) entry.sequence = Math.max(entry.sequence, m.sequence);
            else group.incomingSequences.push({memberNumber:m.sender, sequence:m.sequence});
          }
        }
      }
    }
    if (read && items.length) this.markRead(id, Math.max(...items.map(m => m.sequence)));
    else { this.render(); this.options.changed(); }
  }
  markRead(id: string, sequence: number, batch = false): void {
    if (sequence > (this.#reads.get(id) ?? 0)) {
      this.#reads.set(id, sequence);
      while (this.#reads.size > 100) this.#reads.delete(this.#reads.keys().next().value!);
      if (!batch) this.#saveReads();
    }
    if (!batch) { this.render(); this.options.changed(); }
  }
  #saveReads(): void { try { this.storage.setItem(this.#storageKey, JSON.stringify(Object.fromEntries(this.#reads))); } catch { /* Session read state still works. */ } }
  refresh(force = false): Promise<void> {
    if (!this.client.connected) { this.render(); return Promise.resolve(); }
    if (this.#task) return this.#task;
    if (!force && !this.#dirty && Date.now() - this.#updatedAt < 30000) return Promise.resolve();
    const generation = this.#generation;
    const refreshPreviews = force || this.#dirty;
    this.#dirty = false;
    const task = this.#load(generation, refreshPreviews).finally(() => { if (this.#task === task) this.#task = undefined; });
    this.#task = task; return task;
  }
  async #load(generation: number, refreshPreviews: boolean): Promise<void> {
    try {
      const [groups, invitations] = await Promise.all([
        this.client.request<{ items: CloudGroup[] }>("GET", "/v1/groups"),
        this.client.request<{ items: Invitation[] }>("GET", "/v1/group-invitations"),
      ]);
      if (generation !== this.#generation || !this.client.connected) return;
      const previous = new Map(this.groups.map(g => [g.id, g.lastMessage?.sequence ?? 0]));
      this.groups = groups.items.slice(0, 100); this.#invitations = invitations.items.slice(0, 100); this.#error = "";
      if (this.#baseline) for (const group of this.groups) {
        const message = group.lastMessage;
        if (previous.has(group.id) && message?.text && message.sequence > (previous.get(group.id) ?? 0) &&
          message.sender !== this.client.memberNumber && !this.isMuted(group.id) && !this.ui.options.isBlocked(message.sender))
          this.options.incoming?.(group, message);
      }
      this.#baseline = true;
      const ids = new Set(this.groups.map(g => g.id));
      for (const id of this.#previews.keys()) if (!ids.has(id)) { this.#previews.delete(id); this.#drafts.delete(id); }
      this.render();
      // Older servers have no summary. Keep their fallback bounded and coalesced.
      const pending = [...this.groups].sort((a, b) => this.#time(b) - this.#time(a)).slice(0, this.#limit)
        .filter(g => g.lastIncomingSequence === undefined && (refreshPreviews || Date.now() - (this.#previews.get(g.id)?.at ?? 0) >= 30000));
      const worker = async () => {
        while (pending.length && generation === this.#generation && this.client.connected) {
          const group = pending.shift()!;
          try {
            const page = await this.client.request<CloudPage<CloudMessage>>("GET", `/v1/conversations/${group.conversationId}/messages?limit=40&direction=backward&cursor=0`);
            if (generation !== this.#generation || !this.client.connected) return;
            this.#previews.set(group.id, { items: page.items.slice(-40), at: Date.now() });
          } catch { /* Keep the last known preview until the next successful refresh. */ }
        }
      };
      await Promise.all([worker(), worker()]);
      if (generation !== this.#generation) return;
      this.#updatedAt = Date.now(); this.render(); this.options.changed();
    } catch (error) {
      if (generation === this.#generation) { this.#dirty = true; this.#error = "Groups could not refresh."; this.render(); }
      throw error;
    }
  }
  render(): void {
    if (!this.client.connected) { this.element.replaceChildren(element("p", { className: "kl-empty-copy", text: "Connect your KikiLink profile to see your groups." })); return; }
    const query = this.#query.trim().normalize("NFKC").toLocaleLowerCase();
    const nodes: Node[] = [];
    if (this.#error) nodes.push(this.ui.button("Retry group list", () => this.refresh(true), "refresh"));
    for (const invite of this.#invitations) {
      if (this.ui.options.isBlocked(invite.owner) || (query && !invite.title.toLocaleLowerCase().includes(query))) continue;
      nodes.push(element("section", { className: "kl-group-invitation" },
        element("strong", { text: invite.title }), element("small", { text: `Invitation from #${invite.owner}` }),
        element("div", { className: "kl-cloud-actions" },
          this.ui.button("Accept", async () => { await this.client.request("POST", `/v1/groups/${invite.id}/accept`, {}); await this.refresh(true); await this.options.inviteChanged(); }, "check"),
          this.ui.button("Decline", async () => { await this.client.request("DELETE", `/v1/groups/${invite.id}/invitation`); await this.refresh(true); }, "close"))));
    }
    const sorted = [...this.groups].sort((a, b) => Number(this.isPinned(b.id)) - Number(this.isPinned(a.id)) || this.#time(b) - this.#time(a) || a.title.localeCompare(b.title));
    let matches = 0;
    for (const group of sorted) {
      if (this.#unreadOnly && !this.hasUnread(group.id)) continue;
      const latest = group.lastMessage !== undefined
        ? group.lastMessage && !this.ui.options.isBlocked(group.lastMessage.sender) ? group.lastMessage : null
        : this.#previews.get(group.id)?.items.filter(m => !this.ui.options.isBlocked(m.sender)).at(-1);
      if (query && ![group.title, latest?.text ?? "", ...group.members.map(m => String(m.memberNumber))].some(v => v.normalize("NFKC").toLocaleLowerCase().includes(query))) continue;
      if (++matches > this.#limit) continue;
      const draft = this.#drafts.get(group.id);
      const unread = this.hasUnread(group.id);
      const preview = draft ? `Draft · ${draft}` : latest ? `${latest.sender === this.client.memberNumber ? "You: " : ""}${latest.text ?? "Message removed"}` : this.#previews.has(group.id) ? "No messages yet" : "Open to read messages";
      const pinned = this.isPinned(group.id), muted = this.isMuted(group.id);
      const signature = JSON.stringify([group.title, group.avatarId, preview, latest?.createdAt, unread, this.#selected === group.id, group.members, pinned, muted]);
      let row = this.#rows.get(group.id);
      if (!row) {
        row = element("button", { type: "button", className: "kl-conversation kl-cloud-group-row" });
        row.addEventListener("click", () => { const current = this.groups.find(g => g.id === group.id); if (current) this.options.select(current); });
        row.dataset.groupId = group.id; this.#rows.set(group.id, row);
      }
      if (row.dataset.signature !== signature) {
        row.dataset.signature = signature; row.dataset.active = String(this.#selected === group.id);
        row.setAttribute("aria-pressed", String(this.#selected === group.id));
        row.setAttribute("aria-label", `${group.title}${pinned ? ", pinned" : ""}${muted ? ", muted" : ""}${unread ? ", unread messages" : ""}`);
        const avatarKey = group.avatarId ?? `initials:${initials(group.title)}`;
        let avatar = row.querySelector<HTMLElement>(".kl-group-inbox-avatar");
        if (!avatar || avatar.dataset.avatarKey !== avatarKey) {
          avatar = element("span", { className: "kl-avatar kl-group-inbox-avatar", ariaHidden: "true", text: group.avatarId ? "" : initials(group.title) });
          avatar.dataset.avatarKey = avatarKey;
          if (group.avatarId) avatar.append(this.ui.options.image(group.avatarId, "Group avatar", "kl-social-avatar-image", true));
          avatar.append(kikiIcon("users", "kl-group-inbox-mark"));
        }
        const copy = element("span", { className: "kl-group-inbox-copy" }, element("strong", { text: group.title }), element("span", { className: "kl-group-inbox-preview", text: preview.slice(0, 160) }));
        copy.dataset.draft = String(Boolean(draft));
        const meta = element("span", { className: "kl-group-inbox-meta" });
        for (const [show, icon, label] of [[pinned, "pin", "Pinned"], [muted, "muted", "Muted"]] as const) if (show)
          meta.append(element("span", { className: "kl-group-inbox-status", title: label, ariaLabel: label }, kikiIcon(icon)));
        if (latest) meta.append(timeLabel(latest.createdAt));
        if (unread) meta.append(element("span", { className: "kl-group-unread-dot", ariaLabel: "Unread messages" }));
        row.replaceChildren(avatar, copy, meta);
      }
      nodes.push(row);
    }
    for (const id of this.#rows.keys()) if (!this.groups.some(g => g.id === id)) this.#rows.delete(id);
    if (matches > this.#limit) nodes.push(this.ui.button("Load more groups", async () => {
      this.#limit += 20; this.#updatedAt = 0; this.render(); await this.refresh();
    }, "next"));
    if (!nodes.length) nodes.push(element("p", { className: "kl-empty-copy", text: query ? "No matching groups." : this.#unreadOnly ? "No unread groups." : "Your groups will appear here. Use + to create one." }));
    nodes.push(this.#menu.element);
    const focus = (this.element.getRootNode() as ShadowRoot | Document).activeElement;
    let cursor = this.element.firstChild;
    for (const node of nodes) {
      if (node === cursor) cursor = cursor.nextSibling;
      else this.element.insertBefore(node, cursor);
    }
    while (cursor) { const next = cursor.nextSibling; cursor.remove(); cursor = next; }
    if (focus instanceof HTMLElement && this.element.contains(focus)) focus.focus({ preventScroll: true });
  }
  #time(group: CloudGroup): number { return group.lastMessage?.createdAt ?? this.#previews.get(group.id)?.items.at(-1)?.createdAt ?? group.createdAt; }
  clear(): void { this.#menu.close(false); this.#baseline = false; this.#generation++; this.groups = []; this.#invitations = []; this.#previews.clear(); this.#drafts.clear(); this.#rows.clear(); this.#task = undefined; this.#dirty = true; this.#selected = undefined; this.render(); this.options.changed(); }
  destroy(): void { this.clear(); this.#menu.destroy(); this.element.replaceChildren(); }
}
