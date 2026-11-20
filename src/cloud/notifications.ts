import type { KeyValueStorage } from "../core/settings";
import { chatAlertMode } from "../core/chat-alerts";
import type { ConversationMeta, KikiLinkSettings, FeedTabAlerts } from "../core/types";
import { conversationMuted } from "../modules/link-chat/conversation-mute";
import { isPersonalLetter, type ChannelNotice, type CommunityService, type MailItem } from "./community";

export interface InboxChat {
  key: string; recoveryGeneration?: string; peer?: number; groupId?: string; communityId?: string; channelId?: string; latest?: number; channelMode?: 'all' | 'mentions' | 'off'; title: string; unread: number;
  at: number; muted: boolean; mentions: number;
  mentionItems?: MailItem[];
  /** The compact Inbox counts and dates only activity enabled by the current source and tab settings. */
  alertEligible?: boolean; alertUnread?: number; alertAt?: number;
  /** Inbox state is independent of the actual conversation read cursor. */
  noticeUnread?: number;
  noticeSource?: string;
  latestIncoming?: number;
}
export interface GroupNotice { id: string; title: string; unread: number; at: number; muted: boolean; conversationId?: string; latestIncoming?: number }
export interface AlertEvent {
  key: string; category: "direct" | "group" | "channel" | "feed" | "social";
  actor: number | null; at: number; text: string; peer?: number | undefined; groupId?: string | undefined; channelId?: string | undefined;
  mentioned?: boolean; cloud?: boolean; toast?: boolean; mailbox?: boolean;
}
export interface NotificationSnapshot {
  chats: InboxChat[]; mail: MailItem[]; total: number; chat: number; feed: number;
  mutedMail?: ReadonlySet<number>;
}
interface Options {
  settings(): KikiLinkSettings;
  current(): boolean;
  quiet(): boolean;
  blocked(member: number): boolean;
  active(event: AlertEvent): boolean;
  directMuted(peer: number): Promise<boolean>;
  directSourceMuted?(peer: number): boolean;
  groupMuted(id: string): boolean;
  deliver(event: AlertEvent, valid: () => boolean): void;
  openChat(chat: InboxChat): Promise<void>;
  readChat(chat?: InboxChat): Promise<void>;
  refreshChats(): Promise<void>;
}

const MAX_SEEN = 2000, MONTH = 30 * 86400000;
const chatMail = (item: MailItem) => item.kind === "mention" && ["direct_message", "group_message", "community_message"].includes(item.targetType);
function mailKey(item: MailItem): string {
  if (item.targetType === "community_message" && item.channelId) return `channel:${item.channelId}`;
  if (item.targetType === "direct_message" && item.peer) return `direct:${item.peer}`;
  if (item.targetType === "group_message" && item.groupId) return `group:${item.groupId}`;
  return "";
}
const feedMail = (item: MailItem) => ["post", "comment"].includes(item.targetType);
const alertsPaused = (policy: FeedTabAlerts) => policy.mode === "off" || conversationMuted(policy.mutedUntil);
const feedUpdateMuted = (item: MailItem, policy: FeedTabAlerts) =>
  alertsPaused(policy) || policy.mode === "mentions" && item.kind !== "mention" || policy.mode === "personal" && item.kind === "post_comment";

/** One account's alert counts, Inbox projection and consumed sound identities.
 * Only IDs/timestamps are persisted; message text and read authority stay in their sources. */
export class NotificationCenter {
  snapshot: NotificationSnapshot = { chats: [], mail: [], total: 0, chat: 0, feed: 0 };
  #direct: ConversationMeta[] = [];
  #groups: GroupNotice[] = [];
  #seen = new Map<string, number>();
  #noticeReadKey = "";
  #noticeReads = new Map<string, { at: number; unread: number }>();
  #readVisibleTask: Promise<void> | undefined;
  #mail = new Map<number, MailItem>();
  #baseline = false;
  #mailGeneration: string | undefined;
  #mailEpoch = 0;
  #channelBaseline = false;
  #channelGeneration: string | undefined;
  #channelSequences = new Map<string, number>();
  #destroyed = false;
  #epoch = 0;
  #listeners = new Set<() => void>();
  #dispose: Array<() => void> = [];
  readonly #key: string;

  constructor(readonly community: CommunityService, readonly storage: KeyValueStorage, readonly options: Options) {
    this.#key = `kikilink:cloud:notification-seen:${community.client.memberNumber}:v1`;
    try {
      const rows: unknown = JSON.parse(storage.getItem(this.#key) ?? "[]");
      if (Array.isArray(rows)) for (const row of rows.slice(-MAX_SEEN)) {
        if (Array.isArray(row) && typeof row[0] === "string" && row[0].length <= 180 && Number.isSafeInteger(row[1]) && row[1] > Date.now() - MONTH)
          this.#seen.set(row[0], row[1]);
      }
    } catch { /* Memory still deduplicates when device storage is unavailable. */ }
    this.#dispose.push(community.subscribe(() => { this.#observeChannels(); this.#observeMail(); this.update(); }), community.client.subscribe(kind => {
      if (kind === "session") { this.#epoch++; this.#readVisibleTask = undefined; this.#baseline = false; this.#channelBaseline = false; this.#channelSequences.clear(); this.#mail.clear(); this.#groups = []; this.update(); }
      if (kind === "profiles-cleared") this.update();
    }));
    if (typeof window !== "undefined") window.addEventListener("storage", this.#noticeStorageChanged);
    this.#observeChannels(); this.#observeMail(); this.update();
  }

  #loadNoticeReads(): void {
    const key = `kikilink:inbox-notice-reads:${this.community.client.memberNumber}:${encodeURIComponent(this.community.client.origin ?? "")}:${this.community.mailboxRecoveryGeneration ?? "legacy"}`;
    if (key === this.#noticeReadKey) return;
    this.#noticeReadKey = key;
    this.#noticeReads.clear();
    try {
      const rows: unknown = JSON.parse(this.storage.getItem(key) ?? "[]");
      if (Array.isArray(rows)) for (const entry of rows.slice(-MAX_SEEN)) {
        if (!Array.isArray(entry) || typeof entry[0] !== "string" || entry[0].length > 400 ||
            !Number.isSafeInteger(entry[1]?.at) || entry[1].at < 0 || !Number.isSafeInteger(entry[1].unread) || entry[1].unread <= 0) continue;
        this.#noticeReads.set(entry[0], { at: entry[1].at, unread: entry[1].unread });
      }
    } catch { /* Missing local acknowledgements leave the corresponding notices visible. */ }
  }
  readonly #noticeStorageChanged = (event: StorageEvent) => {
    if (!this.#noticeReadKey || event.key !== null && !event.key.endsWith(this.#noticeReadKey)) return;
    this.#noticeReadKey = "";
    this.update();
  };

  subscribe(listener: () => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  update(direct = this.#direct, groups = this.#groups): void {
    if (this.#destroyed) return;
    this.#direct = direct; this.#groups = groups;
    if (!this.options.current()) {
      this.snapshot = { chats: [], mail: [], total: 0, chat: 0, feed: 0 };
      for (const listener of this.#listeners) listener();
      return;
    }
    const settings = this.options.settings(), chatPolicy = settings.ui.tabAlerts.chat, feedPolicy = settings.ui.tabAlerts.feed;
    const directMode = chatAlertMode(chatPolicy, "direct"), groupMode = chatAlertMode(chatPolicy, "groups");
    const channelMode = chatAlertMode(chatPolicy, "channel"), feedPaused = alertsPaused(feedPolicy);
    const mail = this.community.mailbox.items.filter(item => (!item.actor || !this.options.blocked(item.actor)) &&
      (item.kind !== "personal_mail" || this.community.personalMail && isPersonalLetter(item)));
    const mentionItems = new Map<string, MailItem[]>();
    for (const item of mail) {
      if (!chatMail(item)) continue;
      const key = mailKey(item);
      if (!key) continue;
      const items = mentionItems.get(key);
      if (items) items.push(item);
      else mentionItems.set(key, [item]);
    }
    this.#loadNoticeReads();
    const known = new Set<string>();
    const chats: InboxChat[] = [];
    const mutedMail = new Set<number>();
    let chat = 0, acknowledged = 0;
    const addChat = (row: InboxChat, latestVisible = row.at, latestConfirmedMention = 0) => {
      const items = mentionItems.get(row.key) ?? [];
      if (!row.unread && !items.length) return;
      if (items.length) row.mentionItems = items;
      const mode = row.peer ? directMode : row.groupId ? groupMode : channelMode;
      const mentionsOnly = mode === "personal" || row.channelMode === "mentions";
      const sourceMuted = mode === "off" || row.muted;
      row.alertEligible = !sourceMuted && (!mentionsOnly || row.mentions > 0 || items.length > 0);
      row.alertUnread = row.alertEligible ? (mentionsOnly ? row.mentions : row.unread) : 0;
      const latestMention = items.reduce((latest, item) => Math.max(latest, item.updatedAt), latestConfirmedMention);
      row.alertAt = mentionsOnly ? latestMention : Math.max(latestVisible, latestMention);
      row.muted = !row.alertEligible;
      if (sourceMuted) for (const item of items) mutedMail.add(item.id);
      const receipt = this.#noticeReads.get(row.noticeSource ?? row.key);
      if (receipt) {
        const at = row.latestIncoming ?? row.at;
        // A conversation can be read elsewhere and receive fresh notices between two refreshes.
        const remaining = at > receipt.at && row.unread <= receipt.unread ? row.unread : Math.max(0, row.unread - receipt.unread);
        row.noticeUnread = remaining;
        acknowledged += row.alertUnread - Math.min(row.alertUnread, remaining);
      }
      chat += row.alertUnread;
      chats.push(row);
    };
    for (const row of direct) {
      const key = `direct:${row.peerNumber}`; known.add(key);
      if (this.options.blocked(row.peerNumber)) continue;
      const mentions = mentionItems.get(key)?.filter(item => !item.read).length ?? 0;
      addChat({ key, peer: row.peerNumber, title: row.localAlias || row.peerName, unread: row.unread,
        at: row.lastMessageAt, latestIncoming: row.lastDirection === "incoming" ? row.lastMessageAt : 0, muted: conversationMuted(row.muteUntil), mentions });
    }
    for (const row of groups) {
      const key = `group:${row.id}`; known.add(key);
      const mentions = mentionItems.get(key)?.filter(item => !item.read).length ?? 0;
      addChat({ key, groupId: row.id, title: row.title, unread: row.unread, at: row.at, muted: row.muted, noticeSource: JSON.stringify([key, row.conversationId ?? ""]),
        ...(row.latestIncoming === undefined ? {} : { latestIncoming: row.latestIncoming }),
        mentions: Math.min(row.unread, mentions) });
    }
    for (const row of this.community.channels ?? []) {
      const key = `channel:${row.channelId}`; known.add(key);
      const authors = row.authors.filter(author => !this.options.blocked(author.author));
      const unread = authors.reduce((sum, author) => sum + author.unread, 0);
      const mentions = authors.reduce((sum, author) => sum + author.mentions, 0);
      const latestVisible = authors.reduce((at, author) => Math.max(at, author.at), 0);
      const latestMention = authors.reduce((at, author) =>
        author.mentions > 0 && author.latestMention === author.latest ? Math.max(at, author.at) : at, 0);
      addChat({ key, communityId: row.communityId, channelId: row.channelId, latest: row.latest, channelMode: row.mode,
        ...(row.recoveryGeneration ? {recoveryGeneration: row.recoveryGeneration} : {}), title: row.title, unread,
        mentions, at: row.at, latestIncoming: latestVisible, noticeSource: JSON.stringify([key, row.communityId, row.recoveryGeneration ?? "legacy"]), muted: this.#channelMuted(row) }, latestVisible, latestMention);
    }
    const visibleMail = mail.filter(item => !chatMail(item) || !known.has(mailKey(item)) && !(item.channelId && this.community.channelsLoaded));
    let social = 0, personalFeed = 0;
    for (const item of visibleMail) {
      const isChat = chatMail(item);
      const isFeed = feedMail(item);
      const muted = isChat
        ? (item.peer ? directMode : groupMode) === "off" || !mailKey(item) || item.targetType === "community_message" || (item.peer
          ? Boolean(this.options.directSourceMuted?.(item.peer))
          : Boolean(item.groupId && this.options.groupMuted(item.groupId)))
        : item.kind === "group_invitation" ? groupMode === "off" : item.kind === "personal_mail" ? alertsPaused(chatPolicy)
          : isFeed && feedUpdateMuted(item, feedPolicy);
      if (muted) mutedMail.add(item.id);
      if (item.read || muted) continue;
      if (isChat) chat++;
      else {
        social++;
        if (isFeed) personalFeed++;
      }
    }
    this.snapshot = { chats: chats.sort((a,b) => b.at - a.at), mail: visibleMail, chat, total: chat + social - acknowledged,
      feed: feedPaused ? 0 : feedPolicy.mode === "all" ? this.community.feedUnread : personalFeed,
      ...(mutedMail.size ? { mutedMail } : {}) };
    for (const listener of this.#listeners) listener();
  }

  #consume(key: string, save = true): boolean {
    if (this.#seen.has(key)) return false;
    this.#seen.set(key, Date.now());
    for (const [id, at] of this.#seen) if (at < Date.now() - MONTH) this.#seen.delete(id);
    while (this.#seen.size > MAX_SEEN) this.#seen.delete(this.#seen.keys().next().value!);
    if (save) this.#save();
    return true;
  }
  #save(): void { try { this.storage.setItem(this.#key, JSON.stringify([...this.#seen])); } catch { /* Device-only deduplication remains usable in memory. */ } }
  #channelMuted(channel: ChannelNotice): boolean {
    return channel.mode === "off" || conversationMuted(this.community.channelMuteUntil(channel));
  }
  #allowed(event: AlertEvent): boolean {
    if (this.#destroyed || !this.options.current() || this.options.quiet() || event.cloud && !this.community.client.connected ||
      event.actor !== null && (event.actor === this.community.client.memberNumber || this.options.blocked(event.actor)) || this.options.active(event)) return false;
    const settings = this.options.settings();
    const { chat, feed } = settings.ui.tabAlerts;
    const mode = event.category === "direct" || event.category === "group" || event.category === "channel"
      ? chatAlertMode(chat, event.category === "group" ? "groups" : event.category) : undefined;
    if (mode === "off" || event.category === "feed" && (alertsPaused(feed) || feed.mode === "mentions" && !event.mentioned)) return false;
    if (event.category === "group" && (!event.mentioned && mode === "personal" || event.groupId && this.options.groupMuted(event.groupId))) return false;
    if (event.category === 'channel') {
      const channel=this.community.channels?.find(c=>c.channelId===event.channelId);
      if (!channel || this.#channelMuted(channel) || !event.mentioned && (channel.mode === "mentions" || mode === "personal")) return false;
    }
    return !event.peer || !this.options.directSourceMuted?.(event.peer) &&
      !conversationMuted(this.#direct.find(row => row.peerNumber === event.peer)?.muteUntil);
  }
  observeMutedGroupMessage(id: string): void {
    // The server may deliver the corresponding mailbox mention after the user unmutes.
    if (!this.#destroyed && this.options.current()) this.#consume(`group:${id}`);
  }
  async notify(event: AlertEvent, current?: () => boolean): Promise<void> {
    if (this.#destroyed || !this.#consume(event.key)) return;
    const epoch = this.#epoch, generation = this.#channelGeneration, mailEpoch = this.#mailEpoch, mailGeneration = this.#mailGeneration;
    const valid = () => epoch === this.#epoch && (!event.mailbox || mailEpoch === this.#mailEpoch && mailGeneration === this.community.mailboxRecoveryGeneration) &&
      (event.category !== 'channel' || generation === this.community.channelRecoveryGeneration) && this.#allowed(event) && (!current || current());
    if (!valid()) return;
    if (event.peer && await this.options.directMuted(event.peer).catch(() => true)) return;
    if (valid()) this.options.deliver(event, valid);
  }

  #observeChannels(): void {
    if(this.#channelGeneration!==this.community.channelRecoveryGeneration){
      this.#channelGeneration=this.community.channelRecoveryGeneration;this.#channelBaseline=false;this.#channelSequences.clear();
    }
    if(!this.community.channelsLoaded||this.#destroyed)return;
    const next = new Map<string, number>();
    const mentionsOnly = this.options.settings().ui.tabAlerts.chat.mode === "personal";
    let consumed = false;
    for (const channel of this.community.channels ?? []) {
      const silent = !this.#channelBaseline || this.#channelMuted(channel);
      const mentioned = channel.mode === "mentions" || mentionsOnly;
      for (const author of channel.authors) {
        const key = `${channel.channelId}:${author.author}`;
        next.set(key, author.latest);
        if (silent) {
          // A mailbox mention may be delivered after its channel summary and after unmuting.
          for (const id of [author.messageId, author.mentionMessageId]) {
            if (id && this.#consume(`channel:${id}`, false)) consumed = true;
          }
          continue;
        }
        const sequence = mentioned ? author.latestMention : author.latest;
        const id = mentioned ? author.mentionMessageId : author.messageId;
        if (!id || sequence <= (this.#channelSequences.get(key) ?? 0)) continue;
        void this.notify({key: `channel:${id}`, category: "channel", channelId: channel.channelId, actor: author.author, at: author.at,
          text: mentioned ? `${this.community.adapter.getMemberName(author.author)} mentioned you in ${channel.title}` : `New message in ${channel.title}`, mentioned, cloud: true});
      }
    }
    this.#channelSequences = next;
    this.#channelBaseline = true;
    if (consumed) this.#save();
  }
  #observeMail(): void {
    if (this.#mailGeneration !== this.community.mailboxRecoveryGeneration || !this.community.mailboxLoaded && this.#baseline) {
      this.#mailGeneration = this.community.mailboxRecoveryGeneration; this.#mailEpoch++; this.#baseline = false; this.#mail.clear();
    }
    if (!this.community.mailboxLoaded || this.#destroyed) return;
    const next = new Map(this.community.mailbox.items.map(item => [item.id, item]));
    let consumed = false;
    for (const item of next.values()) {
      if (item.channelId && !this.community.channelsLoaded) continue;
      if (item.kind === "personal_mail" && (!this.community.personalMail || !isPersonalLetter(item))) continue;
      const isChat = chatMail(item), previous = this.#mail.get(item.id);
      const key = isChat ? `${item.channelId ? "channel" : item.targetType === "direct_message" ? "direct" : "group"}:${item.targetId}` : `mail:${this.#mailGeneration ? this.#mailGeneration + ":" : ""}${item.id}:${item.updatedAt}`;
      const invitation = item.kind === "group_invitation";
      if (!this.#baseline || item.read || invitation && !item.pending) { consumed = this.#consume(key, false) || consumed; continue; }
      // A watcher/reaction batch that remains unread is still the same alert.
      if (previous && !previous.read) continue;
      const category = isChat ? item.channelId ? "channel" : item.peer ? "direct" : "group" : feedMail(item) ? "feed" : "social";
      const who = item.actor ? this.community.adapter.getMemberName(item.actor) : "KikiLink";
      const label = item.kind === "personal_mail" ? `New mail from ${item.mailSenderName || who}` : item.kind === "space_invitation" ? `${who} invited you to ${item.spaceName ?? "a space"}` : item.kind === "space_request" ? `${who} requested to join ${item.spaceName ?? "your space"}` : item.kind === "space_approved" ? `Your request to join ${item.spaceName ?? "a space"} was approved` : item.kind === "event_reminder" ? `Starting soon: ${item.eventTitle ?? "Your event"}` : item.kind === "event_place" ? `Your place is ready: ${item.eventTitle ?? "Your event"}` : item.kind === "event_updated" ? `Event updated: ${item.eventTitle ?? "Your event"}` : item.kind === "event_cancelled" ? `Event cancelled: ${item.eventTitle ?? "Your event"}` : item.kind === "mention" ? `${who} mentioned you` : item.kind === "comment_reply" ? `${who} replied to your comment` :
        item.kind === "comment" || item.kind === "post_comment" ? `${who} commented on a post you follow` : item.kind === "reaction" ? "New reactions to your post or comment" :
        item.kind === "friend_request" ? `${who} sent a friend request` : item.kind === "group_invitation" ? `${who} invited you to a group` : item.kind === "community_invitation" ? `${who} invited you to a community` : item.kind === "community_request" ? `${who} requested to join your community` : item.kind === "community_approved" ? "Your community join request was approved" : "New KikiLink notification";
      // Settings, access and the invitation state can change after a toast or sound was queued.
      const stillEnabled = () => {
        const { chat, feed } = this.options.settings().ui.tabAlerts;
        if (isChat && !mailKey(item)) return false;
        if (feedMail(item)) return !feedUpdateMuted(item, feed);
        if (item.kind === "personal_mail") return this.community.personalMail && isPersonalLetter(item) && !alertsPaused(chat) &&
          this.community.mailbox.items.some(row => isPersonalLetter(row) && row.id === item.id && row.actor === item.actor && row.targetId === item.targetId && !row.read);
        if (invitation) return chatAlertMode(chat, "groups") !== "off" && this.community.mailbox.items.some(row =>
          row.id === item.id && row.kind === item.kind && row.targetId === item.targetId &&
          row.groupInvitedAt === item.groupInvitedAt && row.pending && !row.read);
        return true;
      };
      void this.notify({ key, category, actor: item.actor, at: item.updatedAt, text: label, peer: item.peer, groupId: item.groupId, channelId: item.channelId, mentioned: item.kind === "mention", cloud: true, mailbox: true }, stillEnabled);
    }
    this.#baseline = true; this.#mail = next;
    if (consumed) this.#save();
  }
  openChat(chat: InboxChat): Promise<void> { return this.options.openChat(chat); }
  async refresh(): Promise<void> { await Promise.all([this.options.refreshChats(), this.community.refresh()]); }
  async readChat(chat: InboxChat): Promise<void> { await this.options.readChat(chat); await this.community.refresh(); }
  /** Bell context actions apply to accessible, enabled notices present when the menu opened. */
  visibleReadAction(): () => Promise<void> {
    const epoch = this.#epoch, generation = this.community.mailboxRecoveryGeneration;
    const current = () => !this.#destroyed && this.options.current() && this.community.client.connected &&
      epoch === this.#epoch && generation === this.community.mailboxRecoveryGeneration;
    const eligible = (row: InboxChat) => (row.alertEligible ?? !row.muted) && row.unread > 0;
    const chats = this.snapshot.chats.filter(eligible);
    const mail = new Map<number, MailItem>();
    for (const item of [...this.snapshot.mail, ...chats.flatMap(row => row.mentionItems ?? [])]) {
      if (!item.read && !this.snapshot.mutedMail?.has(item.id)) mail.set(item.id, item);
    }
    const perform = async () => {
      if (!current()) throw new Error("Reconnect to the same Inbox to mark notifications as read.");
      // Merge other tabs' acknowledgements before publishing this action.
      this.#noticeReadKey = "";
      this.#loadNoticeReads();
      const next = new Map(this.#noticeReads);
      for (const seen of chats) {
        const live = this.snapshot.chats.find(row => row.key === seen.key);
        if (!live || !eligible(live) || live.at !== seen.at || live.latest !== seen.latest ||
            live.noticeSource !== seen.noticeSource || live.recoveryGeneration !== seen.recoveryGeneration || live.unread !== seen.unread) continue;
        const id = seen.noticeSource ?? seen.key;
        next.delete(id);
        next.set(id, { at: seen.latestIncoming ?? seen.at, unread: seen.unread });
      }
      if (chats.length) {
        while (next.size > MAX_SEEN) next.delete(next.keys().next().value!);
        const bytes = JSON.stringify([...next]);
        if (this.storage.setItemVerified) this.storage.setItemVerified(this.#noticeReadKey, bytes);
        else this.storage.setItem(this.#noticeReadKey, bytes);
        if (this.storage.getItem(this.#noticeReadKey) !== bytes) throw new Error("Could not save Inbox read state on this device.");
        this.#noticeReads = next;
        this.update();
      }
      for (const seen of mail.values()) {
        if (!current()) throw new Error("Inbox changed. Reopen notifications to continue.");
        const live = this.community.mailbox.items.find(row => row.id === seen.id);
        const visible = this.snapshot.mail.some(row => row.id === seen.id) ||
          this.snapshot.chats.some(row => eligible(row) && row.mentionItems?.some(item => item.id === seen.id));
        if (visible && live && !live.read && live.targetId === seen.targetId && live.targetType === seen.targetType &&
            live.updatedAt === seen.updatedAt && !this.snapshot.mutedMail?.has(live.id) &&
            (!live.actor || !this.options.blocked(live.actor))) await this.community.readMail(live.id, generation);
      }
    };
    return () => {
      if (!current()) return Promise.reject(new Error("Reconnect to the same Inbox to mark notifications as read."));
      if (this.#readVisibleTask) return this.#readVisibleTask;
      const task = perform().finally(() => { if (this.#readVisibleTask === task) this.#readVisibleTask = undefined; });
      this.#readVisibleTask = task;
      return task;
    };
  }
  async markAllRead(generation = this.community.mailboxRecoveryGeneration): Promise<void> {
    await this.options.readChat();
    await (generation ? this.community.readMail(undefined, generation) : this.community.readMail());
  }
  destroy(): void { if (typeof window !== "undefined") window.removeEventListener("storage", this.#noticeStorageChanged); this.#destroyed = true; this.#epoch++; this.#dispose.splice(0).forEach(dispose => dispose()); this.#listeners.clear(); this.#seen.clear(); this.#mail.clear(); this.#direct = []; this.#groups = []; }
}
