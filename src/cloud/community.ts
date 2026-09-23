import { CloudClient } from "./client";
import type { BCAdapter } from "../bc/adapter";
import type { KeyValueStorage } from "../core/settings";

export interface Relationship {
  memberNumber: number; supported: boolean; directMessages: boolean;
  state: "none" | "sent" | "received" | "accepted" | "declined" | "cancelled" | "revoked";
  revision: number; updatedAt: number; canMessage: boolean; nativeSyncRequired: boolean;
}
export interface MailItem {
  id: number; actor: number | null; kind: string; targetType: string; targetId: string;
  count: number; createdAt: number; updatedAt: number; read: boolean; pending: boolean; postId?: number;
}
export interface MailPage { items: MailItem[]; unread: number; nextCursor: number | null }

/** One account-pinned source for Profile, Players, picker and Mailbox. */
export class CommunityService {
  readonly relationships = new Map<number, Relationship>();
  supported = false;
  directEnabled = false;
  mailbox: MailPage = { items: [], unread: 0, nextCursor: null };
  feedUnread = 0;
  feedLatest = 0;
  error = "";
  #listeners = new Set<() => void>();
  #disposers: Array<() => void> = [];
  #boot: Promise<void> | undefined;
  #bootComplete = false;
  #refresh: Promise<void> | undefined;
  #refreshAgain = false;
  #destroyed = false;
  #epoch = 0;
  #nativeChanging = false;
  #nativeFriends = new Set<number>();
  #known = new Set<number>();
  #storageKey: string;
  #friendsKey: string;
  #getting = new Map<number, Promise<Relationship | undefined>>();
  #releaseEvents: (() => void) | undefined;
  #actions = new Map<number, Promise<void>>();
  constructor(readonly client: CloudClient, readonly adapter: BCAdapter, readonly storage: KeyValueStorage) {
    this.#storageKey = `kikilink:cloud:direct-consent:${client.memberNumber}:v1`;
    this.#friendsKey = `kikilink:cloud:native-friends:${client.memberNumber}:v1`;
    this.#nativeFriends = new Set(adapter.ownFriends?.() ?? []);
    try { const old = JSON.parse(storage.getItem(this.#friendsKey) ?? "null"); if (Array.isArray(old)) this.#nativeFriends = new Set(old.filter(n => Number.isSafeInteger(n) && n > 0)); } catch { /* First successful sync records a baseline. */ }
    this.#disposers.push(client.subscribe(kind => {
      if (kind === "session") {
        this.#epoch++; this.#boot = undefined; this.#bootComplete = false; this.#refresh = undefined; this.#refreshAgain = false; this.#getting.clear(); this.#known.clear(); this.relationships.clear(); this.supported = false; this.directEnabled = false;
        this.mailbox = { items: [], unread: 0, nextCursor: null }; this.feedUnread = 0; this.feedLatest = 0; this.error = "";
        this.#releaseEvents?.(); this.#releaseEvents = undefined;
        this.#changed(); if (client.connected) void this.start();
      } else if (["ready", "relationships", "mailbox", "feed", "feed-read", "groups"].includes(kind)) {
        this.#resume();
      }
    }), adapter.subscribeFriends?.(members => {
      const previous = this.#nativeFriends; this.#nativeFriends = new Set(members);
      if (this.#nativeChanging || !this.supported || !client.connected) return;
      void (async () => {
        for (const peer of previous) if (!this.#nativeFriends.has(peer)) await client.request("DELETE", `/v1/relationships/${peer}`);
        for (const peer of members) if (!previous.has(peer)) {
          const relation = await this.get(peer);
          if (relation?.supported) {
            if (!["accepted", "received", "sent"].includes(relation.state)) await this.action(peer, "request");
            await client.request("POST", "/v1/relationships/confirm", { members: [peer] });
          }
        }
        this.storage.setItem(this.#friendsKey, JSON.stringify([...this.#nativeFriends]));
        await this.refresh();
      })().catch(() => { this.error = "Friend sync could not finish. Open the profile and retry sync."; this.#changed(); });
    }) ?? (() => {}));
    const resume = () => {
      if (typeof document === "undefined" || document.visibilityState !== "hidden") this.#resume();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", resume);
      this.#disposers.push(() => window.removeEventListener("online", resume));
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", resume);
      this.#disposers.push(() => document.removeEventListener("visibilitychange", resume));
    }
    if (client.connected) void this.start();
  }
  #resume(): void {
    if (!this.client.connected || this.#destroyed) return;
    if (!this.#bootComplete) { void this.start(); return; }
    if (this.#refresh) this.#refreshAgain = true;
    else void this.refresh().catch(() => {});
  }
  subscribe(listener: () => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  #changed(): void { if (!this.#destroyed) for (const listener of this.#listeners) listener(); }
  get pendingCount(): number { return [...this.relationships.values()].filter(r => r.state === "received").length; }
  start(): Promise<void> {
    if (this.#boot) return this.#boot;
    const epoch = this.#epoch;
    const task = (async () => {
      if (!this.client.connected || this.#destroyed) return;
      const me = await this.client.request<{ features?: { community?: boolean } }>("GET", "/v1/me");
      if (epoch !== this.#epoch || this.#destroyed) return;
      if (!me.features?.community) {
        this.#bootComplete = true;
        this.error = "Community features are disabled on this Cloud server. Direct delivery and Feed unread counts are unavailable.";
        this.#changed(); return;
      }
      this.supported = true;
      await this.client.request<{ directMessages: boolean }>("GET", "/v1/capabilities/me");
      if (epoch !== this.#epoch || this.#destroyed) return;
      await this.client.request("PUT", "/v1/capabilities/me", { friendRequests: true, directMessages: true });
      if (epoch !== this.#epoch || this.#destroyed) return;
      this.directEnabled = true; this.storage.setItem(this.#storageKey, "yes");
      const peers = (this.adapter.ownFriends?.() ?? []).slice(0, 2000);
      for (const peer of this.#nativeFriends) if (!peers.includes(peer)) {
        if (epoch !== this.#epoch || this.#destroyed) return;
        await this.client.request("DELETE", `/v1/relationships/${peer}`);
      }
      for (let start = 0; start < peers.length; start += 100) {
        if (epoch !== this.#epoch || this.#destroyed) return;
        await this.client.request("POST", "/v1/relationships/confirm", { members: peers.slice(start, start + 100) });
      }
      if (epoch !== this.#epoch || this.#destroyed) return;
      this.#nativeFriends = new Set(peers);
      this.storage.setItem(this.#friendsKey, JSON.stringify(peers));
      this.#bootComplete = true;
      this.#releaseEvents ??= this.client.retainEvents();
      await this.refresh();
    })().catch(() => { if (epoch === this.#epoch) { this.error = "Community features could not connect. Retry when connected."; this.#changed(); } }).finally(() => { if (this.#boot === task) this.#boot = undefined; });
    this.#boot = task; return task;
  }
  async setDirectEnabled(_enabled: boolean): Promise<void> {
    if (!this.supported) throw new Error("Offline Direct messages require a compatible Cloud server.");
    await this.client.request("PUT", "/v1/capabilities/me", { friendRequests: true, directMessages: true });
    this.storage.setItem(this.#storageKey, "yes"); this.directEnabled = true; this.#changed();
  }
  refresh(): Promise<void> {
    if (this.#refresh) return this.#refresh;
    if (!this.supported || !this.client.connected || this.#destroyed) return Promise.resolve();
    const epoch = this.#epoch;
    const task = (async () => {
      const current = () => epoch === this.#epoch && !this.#destroyed;
      // These surfaces are independent: a mailbox or relationship error must not
      // discard a successfully fetched unread count after an offline interval.
      const results = await Promise.allSettled([
        (async () => {
          const rows: Relationship[] = [];
          let cursor: number | null = 0;
          for (let page = 0; page < 10 && cursor !== null; page++) {
            const result: { items: Relationship[]; nextCursor: number | null } = await this.client.request("GET", `/v1/relationships?limit=40&cursor=${cursor}`);
            if (!current()) return;
            rows.push(...result.items); cursor = result.nextCursor;
          }
          if (!current()) return;
          for (const [peer, row] of this.relationships) if (row.state !== "none") this.relationships.delete(peer);
          for (const row of rows) this.relationships.set(row.memberNumber, row);
          this.#changed();
        })(),
        this.client.request<MailPage>("GET", "/v1/mailbox?limit=20").then(mailbox => {
          if (current()) { this.mailbox = mailbox; this.#changed(); }
        }),
        this.client.request<{ unread: number; latest: number }>("GET", "/v1/feed/unread").then(feed => {
          if (current()) { this.feedUnread = feed.unread; this.feedLatest = feed.latest; this.#changed(); }
        }),
      ]);
      if (!current()) return;
      const failed = results.find(result => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      this.error = "";
      this.#changed();
    })().catch(error => { if (epoch === this.#epoch) { this.error = "Updates could not load. Retry when connected."; this.#changed(); } throw error; })
      .finally(() => {
        if (this.#refresh !== task) return;
        this.#refresh = undefined;
        if (this.#refreshAgain && !this.#destroyed && epoch === this.#epoch) {
          this.#refreshAgain = false; queueMicrotask(() => { void this.refresh().catch(() => {}); });
        }
      });
    this.#refresh = task; return task;
  }
  async known(members: number[]): Promise<void> {
    if (!this.supported || !this.client.connected) return;
    const peers = [...new Set(members)].filter(n => n !== this.client.memberNumber && !this.#known.has(n)).slice(0, 100);
    if (!peers.length) return;
    const epoch = this.#epoch;
    for (const peer of peers) this.#known.add(peer);
    let result: { items: Relationship[] };
    try { result = await this.client.request("POST", "/v1/relationships/known", { members: peers }); }
    catch (error) { if (epoch === this.#epoch) for (const peer of peers) this.#known.delete(peer); throw error; }
    if (this.#destroyed || epoch !== this.#epoch) return;
    for (const row of result.items) this.relationships.set(row.memberNumber, row);
    this.#changed();
  }
  get(member: number): Promise<Relationship | undefined> {
    if (!this.supported || member === this.client.memberNumber) return Promise.resolve(undefined);
    const old = this.#getting.get(member); if (old) return old;
    const epoch = this.#epoch;
    const task = this.client.request<Relationship>("GET", `/v1/relationships/${member}`).then(value => {
      if (this.#destroyed || epoch !== this.#epoch) return undefined;
      this.relationships.set(member, value); this.#changed(); return value;
    }).finally(() => { if (this.#getting.get(member) === task) this.#getting.delete(member); });
    this.#getting.set(member, task); return task;
  }
  action(member: number, action: "request" | "accept" | "decline" | "cancel" | "sync" | "remove"): Promise<void> {
    const existing = this.#actions.get(member); if (existing) return existing;
    const task = this.#performAction(member, action).finally(() => { this.#actions.delete(member); this.#changed(); });
    this.#actions.set(member, task); return task;
  }
  async #performAction(member: number, action: "request" | "accept" | "decline" | "cancel" | "sync" | "remove"): Promise<void> {
    if (!this.supported) throw new Error("Cloud friend requests are unavailable.");
    const epoch = this.#epoch;
    const valid = () => !this.#destroyed && this.client.connected && epoch === this.#epoch && (this.adapter.getOwnMemberNumber?.() ?? this.client.memberNumber) === this.client.memberNumber;
    if (!valid()) throw new Error("Account session changed.");
    if (action === "remove") {
      // Revoke delivery first; native failure is explicit and never restores Cloud permission.
      await this.client.request("DELETE", `/v1/relationships/${member}`);
      if (!valid()) throw new Error("Account session changed.");
      this.#nativeChanging = true;
      try { this.adapter.setNativeFriend(member, false); } finally { this.#nativeChanging = false; }
    } else {
      if (action !== "sync") {
        const value = await this.client.request<Relationship>("POST", `/v1/relationships/${member}/${action}`, {});
        if (!valid()) throw new Error("Account session changed.");
        this.relationships.set(member, value); this.#changed();
      }
      if (["request", "accept", "sync"].includes(action)) {
        if (!valid()) throw new Error("Account session changed.");
        this.#nativeChanging = true;
        try {
          this.adapter.setNativeFriend(member, true);
          await this.client.request("POST", "/v1/relationships/confirm", { members: [member] });
        } catch {
          await this.refresh();
          throw new Error("Cloud state saved; native friend sync did not finish. Retry sync from the profile.");
        } finally { this.#nativeChanging = false; }
      }
    }
    await this.refresh();
  }
  async readMail(id?: number): Promise<void> { await this.client.request("POST", "/v1/mailbox/read", id ? { id } : {}); await this.refresh(); }
  async moreMail(): Promise<void> {
    if (this.mailbox.nextCursor === null) return;
    const page = await this.client.request<MailPage>("GET", `/v1/mailbox?limit=20&cursor=${this.mailbox.nextCursor}`);
    const unique = new Map([...this.mailbox.items, ...page.items].map(item => [item.id, item]));
    this.mailbox = { ...page, items: [...unique.values()] }; this.#changed();
  }
  async readFeed(id: number): Promise<void> {
    if (!this.supported || !id) return;
    await this.client.request("PUT", "/v1/read-cursors/feed", { cursor: id }); await this.refresh();
  }
  destroy(): void { this.#releaseEvents?.(); this.#releaseEvents = undefined; this.#destroyed = true; this.#epoch++; for (const dispose of this.#disposers.splice(0)) dispose(); this.#listeners.clear(); this.relationships.clear(); }
}
