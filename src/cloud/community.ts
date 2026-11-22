import { ChannelTimedMutes, type ChannelMuteScope } from './channel-timed-mutes';
import {RelationshipActions,RelationshipRecoveryError,relationshipSource,checkedRelationship,type RelationshipSource,type RelationshipAction,type RelationshipIntent} from './relationship-intent';
import {groupManagementSource,type GroupManagementSource} from './group-management-intent';
import { CloudClient } from "./client";
import { ChannelReadRecovery, ChannelRecoveryError, type ChannelReadAccess } from './channel-read-recovery';
import { MailboxRecovery, MailboxRecoveryError, type MailboxAccess } from './mailbox-recovery';
import { FeedReadRecovery, FeedRecoveryError, type FeedReadAccess } from './feed-read-recovery';
import type { BCAdapter } from "../bc/adapter";
import type { KeyValueStorage } from "../core/settings";

export interface Relationship {
  friendSource?:RelationshipSource;
  memberNumber: number; supported: boolean; directMessages: boolean;
  state: "none" | "sent" | "received" | "accepted" | "declined" | "cancelled" | "revoked";
  revision: number; updatedAt: number; canMessage: boolean; nativeSyncRequired: boolean;
}
export interface MailItem {
  friendSource?:RelationshipSource;friendRevision?:number;
  groupManagementSource?:GroupManagementSource;groupInvitedAt?:number;
  groupInvitationStatus?: 'accepted' | 'declined' | 'cancelled';
  groupCanOpen?: boolean; groupTitle?: string; groupInvitationTitle?: string;
  groupInvitationMemberCount?: number; groupInvitationCapacity?: number;
  groupInvitationHistoryPreview?: { members: {memberNumber:number; role:'owner'|'admin'|'member'}[]; avatarId:string|null };
  mailSubject?: string; mailSenderName?: string; mailPreview?: string; mailBody?: string;
  recoveryGeneration?: string;
  id: number; actor: number | null; kind: string; targetType: string; targetId: string;
  count: number; createdAt: number; updatedAt: number; read: boolean; pending: boolean; spaceName?: string; eventTitle?: string; eventStartsAt?: number; postId?: number; groupId?: string; peer?: number; communityId?: string; channelId?: string;
}
export function isPersonalLetter(item: MailItem): boolean {
  return item.kind === 'personal_mail' && item.targetType === 'mail' && typeof item.targetId === 'string' && !!item.targetId &&
    Number.isSafeInteger(item.actor) && (item.actor ?? 0) > 0 && Number.isSafeInteger(item.createdAt) &&
    item.createdAt > 0 && item.createdAt <= 8_640_000_000_000_000 && typeof item.read === 'boolean' &&
    typeof item.mailSubject === 'string' && !!item.mailSubject.trim() &&
    (item.mailSenderName === undefined || typeof item.mailSenderName === 'string') &&
    (item.mailPreview === undefined || typeof item.mailPreview === 'string');
}
export function samePersonalLetter(a: MailItem, b: MailItem): boolean {
  return isPersonalLetter(a) && isPersonalLetter(b) && a.id === b.id && a.targetId === b.targetId && a.actor === b.actor &&
    a.createdAt === b.createdAt && a.recoveryGeneration === b.recoveryGeneration;
}
export function groupInvitationOutcome(item: MailItem): MailItem['groupInvitationStatus'] {
  if (item.pending !== false || item.kind !== 'group_invitation' || item.targetType !== 'group') return;
  const status = item.groupInvitationStatus;
  if (status === 'accepted' || status === 'declined' || status === 'cancelled') return status;
}

function isDatedGroupInvitationHistory(item: MailItem): boolean {
  return item.pending === false && item.kind === 'group_invitation' && item.targetType === 'group' &&
    typeof item.groupInvitedAt === 'number' && Number.isSafeInteger(item.groupInvitedAt) && item.groupInvitedAt > 0;
}

export function groupInvitationTitle(item: MailItem): string | undefined {
  if (!isDatedGroupInvitationHistory(item) || typeof item.groupInvitationTitle !== 'string') return;
  return item.groupInvitationTitle.trim() || undefined;
}

export function groupInvitationCountLabel(item: MailItem): string | undefined {
  const count = item.groupInvitationMemberCount, capacity = item.groupInvitationCapacity;
  if (!isDatedGroupInvitationHistory(item) || typeof count !== 'number' || typeof capacity !== 'number' ||
    !Number.isSafeInteger(count) || !Number.isSafeInteger(capacity) || count < 1 || count > capacity) return;
  return `${count}/${capacity} members`;
}

export function hasGroupInvitationHistory(item: MailItem): boolean {
  return Boolean(groupInvitationOutcome(item) || groupInvitationTitle(item) || groupInvitationCountLabel(item));
}

export function recordedGroupAcceptanceTitle(invitation: MailItem, records: readonly MailItem[]): string | undefined {
  const receipt = records.find(row => row.id === invitation.id);
  if (!receipt || groupInvitationOutcome(receipt) !== 'accepted' ||
    receipt.targetId !== invitation.targetId || receipt.actor !== invitation.actor ||
    receipt.groupInvitedAt !== invitation.groupInvitedAt || receipt.recoveryGeneration !== invitation.recoveryGeneration ||
    (receipt.groupManagementSource?.required ?? false) !== (invitation.groupManagementSource?.required ?? false) ||
    receipt.groupManagementSource?.generation !== invitation.groupManagementSource?.generation) return;
  return groupInvitationTitle(receipt);
}

export function groupInvitationResponseMessage(accepted: boolean, title?: string): string {
  if (!accepted) return 'Invitation declined.';
  const name = typeof title === 'string' ? title.trim() : '';
  return name ? `You joined ${name}.` : 'You joined the group.';
}

export interface ChannelNotice {
  recoveryGeneration?: string;
  communityId: string; channelId: string; title: string; unread: number; mentions: number;
  latest: number; latestMessageId: string | null; latestAuthor: number | null; at: number;
  mode: 'all' | 'mentions' | 'off'; preferenceRevision: number; readSequence: number;
  authors: Array<{ author: number; unread: number; mentions: number; latest: number; latestMention: number; messageId: string; mentionMessageId: string | null; at: number }>;
}
export interface MailPage { items: MailItem[]; unread: number; nextCursor: number | null }

/** One account-pinned source for Profile, Players, picker and Mailbox. */
export class CommunityService {
  readonly relationships = new Map<number, Relationship>();
  friendSource:RelationshipSource={required:false};
  friendReadError="";
  #friendActionsStore:RelationshipActions|undefined;
  #friendActions():RelationshipActions {
    if(!this.#friendActionsStore||!this.#friendActionsStore.identity())this.#friendActionsStore=new RelationshipActions(this.client,this.adapter,this.storage,()=>this.#changed(),(peer,friend)=>{this.#nativeChanging=true;try{this.adapter.setNativeFriend(peer,friend);}finally{this.#nativeChanging=false;}});
    return this.#friendActionsStore;
  }
  get friendActionError():string{return this.#friendActionsStore?.error??'';}
  friendActions():RelationshipIntent[]{return this.#friendActionsStore?.entries()??[];}
  friendActionHeld(peer:number):boolean{return this.#friendActionsStore?.held(peer)??false;}
  friendActionBusy(peer:number):boolean{return this.#friendActionsStore?.busy(peer)??false;}
  discardFriendAction(peer:number):void{this.#friendActions().discard(peer);}
  #acceptFriendMetadata(me:unknown):void {
    try {
    const source=relationshipSource(me);
    if(source.required&&(!me||typeof me!=='object'||(me as {memberNumber?:number}).memberNumber!==this.client.memberNumber))throw new RelationshipRecoveryError();
    if(JSON.stringify(source)!==JSON.stringify(this.friendSource)){this.#relationshipWriteVersion++;this.relationships.clear();this.#known.clear();this.#getting.clear();this.relationshipsLoaded=false;}
    this.friendSource=source;this.friendReadError="";if(source.required)this.#friendActions().observe(source);else this.#friendActionsStore?.observe(source);
    }catch(error){this.friendReadError="Friend requests need a fresh connection before you can act.";this.#friendActionsStore?.hold();this.#relationshipWriteVersion++;this.relationships.clear();this.#known.clear();this.#getting.clear();this.relationshipsLoaded=false;throw error;}
  }
  #friendRow(row:unknown,source:RelationshipSource):Relationship {
    return source.required?checkedRelationship({...row as object,recoveryGeneration:source.generation},source):row as Relationship;
  }
  async #friendRead<T>(method:string,path:string,body:Record<string,unknown>|undefined,source:RelationshipSource):Promise<T>{
    const url=path+(source.required&&method==='GET'?(path.includes('?')?'&':'?')+'recoveryGeneration='+source.generation:'');
    const value=await (method==='GET'?this.client.request<T>(method,url):this.client.request<T>(method,url,source.required?{...body,recoveryGeneration:source.generation}:body));
    if(source.required&&(!value||typeof value!=='object'||(value as {recoveryGeneration?:string}).recoveryGeneration!==source.generation))throw new RelationshipRecoveryError();
    return value;
  }
  retryFriendAction(peer:number,current:()=>boolean):Promise<void>{
    const entry=this.#friendActionsStore?.get(peer);if(!entry)return Promise.reject(new RelationshipRecoveryError());
    return this.action(peer,entry.action,{memberNumber:peer,revision:entry.revision,state:entry.state,friendSource:entry.source},current);
  }
  actionFromMail(item:MailItem,action:'accept'|'decline',current:()=>boolean):Promise<void>{
    if(!this.friendSource.required&&!item.friendSource?.required)return this.action(item.actor!,action);
    if(!item.friendSource?.required||!Number.isSafeInteger(item.friendRevision)||!item.actor)throw new RelationshipRecoveryError();
    return this.action(item.actor,action,{memberNumber:item.actor,revision:item.friendRevision!,state:'received',friendSource:item.friendSource},current);
  }
  relationshipsLoaded = false;
  relationshipsLoading = false;
  relationshipsError = "";
  supported = false;
  directEnabled = false;
  directHistory = false;
  directRecovery: { generation: string; restored: boolean } | undefined;
  mentions = false;
  directMessageMedia = false;
  messageAudio = false;
  messageReactions = false;
  chatReactionChoices = false;
  channelMessaging = false;
  channels: ChannelNotice[] = [];
  readonly #channelMutes: ChannelTimedMutes;
  channelsLoaded = false;
  #channelReadVersion = 0;
  readonly #channelRecovery: ChannelReadRecovery;
  #channelAccess: ChannelReadAccess | undefined;
  get channelRecoveryGeneration(): string | undefined { return this.#channelRecovery.generation; }
  groupManagementSource:GroupManagementSource|undefined;
  mailbox: MailPage = { items: [], unread: 0, nextCursor: null };
  groupInvitationHistoryPreview = false;
  personalMail = false;
  personalMailLoaded = false;
  personalMailRevision = 0;
  mailboxLoaded = false;
  mailboxError = "";
  readonly #mailRecovery: MailboxRecovery;
  #mailAccess: MailboxAccess | undefined;
  get mailboxRecoveryGeneration(): string | undefined { return this.#mailAccess?.generation; }
  feedUnread = 0;
  feedLatest = 0;
  readonly #feedRecovery: FeedReadRecovery;
  #feedAccess: FeedReadAccess | undefined;
  get feedRecoveryGeneration(): string | undefined { return this.#feedAccess?.generation; }
  error = "";
  #listeners = new Set<() => void>();
  #disposers: Array<() => void> = [];
  #boot: Promise<void> | undefined;
  #bootComplete = false;
  #refresh: Promise<void> | undefined;
  #refreshAgain = false;
  #feedReadVersion = 0;
  #mailReadVersion = 0;
  #mailHead = "";
  #mailRevision = 0;
  #mailHeadRevision = -1;
  #relationshipWriteVersion = 0;
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
  constructor(readonly client: CloudClient, readonly adapter: BCAdapter, readonly storage: KeyValueStorage,
    readonly options: { completeMailbox?: boolean } = {}) {
    this.#channelMutes = new ChannelTimedMutes(storage, client.memberNumber, client.origin, () => this.#changed());
    this.#channelRecovery = new ChannelReadRecovery(client);
    this.#feedRecovery = new FeedReadRecovery(client);
    this.#mailRecovery = new MailboxRecovery(client);
    this.#storageKey = `kikilink:cloud:direct-consent:${client.memberNumber}:v1`;
    this.#friendsKey = `kikilink:cloud:native-friends:${client.memberNumber}:v1`;
    this.#nativeFriends = new Set(adapter.ownFriends?.() ?? []);
    try { const old = JSON.parse(storage.getItem(this.#friendsKey) ?? "null"); if (Array.isArray(old)) this.#nativeFriends = new Set(old.filter(n => Number.isSafeInteger(n) && n > 0)); } catch { /* First successful sync records a baseline. */ }
    this.#disposers.push(client.subscribe((kind, cause) => {
      if (kind === 'profiles-cleared' && cause === 'ready') return;
      if (kind === "session") {
        this.groupInvitationHistoryPreview = false;
        this.personalMail = false; this.personalMailLoaded = false; this.personalMailRevision++;
        this.#channelRecovery.invalidate(); this.#channelAccess = undefined;
        this.#mailRecovery.invalidate(); this.#mailAccess = undefined;
        this.#feedRecovery.invalidate(); this.#feedAccess = undefined; this.#feedReadVersion++;
        this.channels = []; this.channelsLoaded = false; this.channelMessaging = false; this.#channelReadVersion++;
        this.#friendActionsStore?.close();this.#friendActionsStore=undefined;this.friendSource={required:false};this.friendReadError="";
        this.#epoch++; this.#boot = undefined; this.#bootComplete = false; this.#refresh = undefined; this.#refreshAgain = false; this.#getting.clear(); this.#known.clear(); this.relationships.clear(); this.supported = false; this.directEnabled = false; this.messageReactions = false; this.chatReactionChoices = false; this.directMessageMedia = false; this.messageAudio = false; this.directHistory = false; this.directRecovery = undefined; this.mentions = false;
        this.mailbox = { items: [], unread: 0, nextCursor: null }; this.mailboxLoaded = false; this.mailboxError = ""; this.#mailHead = ""; this.#mailReadVersion++;
        this.feedUnread = 0; this.feedLatest = 0; this.error = "";
        this.relationshipsLoaded = false; this.relationshipsLoading = false; this.relationshipsError = "";
        this.#releaseEvents?.(); this.#releaseEvents = undefined;
        this.#changed(); if (client.connected) void this.start();
      } else if (["spaces", "calendar", "channel-read", "communities", "channel-messages", "ready", "relationships", "mailbox", "feed", "feed-read", "groups", "read", "profiles-cleared"].includes(kind)) {
        if (this.personalMail && ["ready", "relationships", "profiles-cleared", "mailbox"].includes(kind)) this.#invalidateLetters();
        if (["spaces", "calendar", "channel-read", "communities", "channel-messages", "ready", "mailbox", "read", "profiles-cleared", "groups"].includes(kind)) this.#mailRevision++;
        if (["communities", "relationships", "profiles-cleared"].includes(kind)) { this.channels = []; this.#changed(); }
        this.#resume();
      }
    }), adapter.subscribeFriends?.(members => {
      const previous = this.#nativeFriends; this.#nativeFriends = new Set(members);
      if (this.#nativeChanging || !this.supported || !client.connected || this.friendReadError) return;
      if(this.friendSource.required){
        const source={...this.friendSource},epoch=this.#epoch,current=()=>epoch===this.#epoch&&!this.#destroyed&&JSON.stringify(source)===JSON.stringify(this.friendSource);
        void (async()=>{
          for(const peer of new Set([...previous,...members])){
            if(previous.has(peer)===members.includes(peer))continue;if(!current())throw new RelationshipRecoveryError();
            const value=await this.#friendRead<Relationship>('GET',`/v1/relationships/${peer}`,undefined,source);if(!current())throw new RelationshipRecoveryError();const row=this.#friendRow(value,source);
            if(members.includes(peer)&&!row.supported)continue;
            await this.action(peer,members.includes(peer)?['accepted','sent','received'].includes(row.state)?'sync':'request':'remove',row,current);
          }
        })().catch(error=>{this.error=error instanceof Error?error.message:'Friend sync needs review.';this.#changed();});return;
      }
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
      if (typeof document === "undefined" || document.visibilityState !== "hidden") { this.#mailRevision++; this.#resume(); }
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
    else void this.refresh(false).catch(() => {});
  }
  subscribe(listener: () => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  #changed(): void {
    if (this.#destroyed) return;
    this.#channelMutes.sync(this.channels);
    for (const listener of this.#listeners) listener();
  }

  channelMuteUntil(row: ChannelMuteScope): number { return this.#channelMutes.until(row); }

  canSetChannelMute(row: ChannelMuteScope): boolean {
    return !this.#destroyed && this.channelMessaging && this.channelsLoaded && !!this.#channelAccess?.current() &&
      row.recoveryGeneration === this.#channelAccess.generation && this.#channelMutes.has(row);
  }

  setChannelMute(row: ChannelMuteScope, until: number): void {
    if (!this.canSetChannelMute(row)) throw new Error('Reconnect and reopen an available channel to change its notification timer.');
    this.#channelMutes.set(row, until);
  }
  get pendingCount(): number { return [...this.relationships.values()].filter(r => r.state === "received").length; }
  start(): Promise<void> {
    if (this.#boot) return this.#boot;
    const epoch = this.#epoch;
    const task = (async () => {
      if (!this.client.connected || this.#destroyed) return;
      const feedRevision = this.#feedRecovery.revision, mailRevision = this.#mailRecovery.revision;
      const me = await this.client.request<{ directRecovery?: { generation: string; restored: boolean }; features?: { channelMessaging?: boolean; mentions?: boolean; directHistory?: boolean; community?: boolean; messageAudio?: boolean; directMessageMedia?: boolean; messageReactions?: boolean; chatReactionChoices?: boolean } }>("GET", "/v1/me");
      if (epoch !== this.#epoch || this.#destroyed) return;
      if (feedRevision !== this.#feedRecovery.revision || mailRevision !== this.#mailRecovery.revision) return;
      // Validate all independent recovery contracts before an early bootstrap return.
      const recovery = [() => this.#channelRecovery.accept(me), () => this.#acceptFeedMetadata(me), () => this.#acceptMailMetadata(me), () => this.#acceptFriendMetadata(me)].map(accept => {
        try { accept(); return undefined; } catch (error) { return error; }
      });
      const invalid = recovery.find(error => error !== undefined); if (invalid) throw invalid;
      if (!me.features?.community) {
        this.#bootComplete = true;
        this.error = "Community features are disabled on this Cloud server. Direct delivery and Feed unread counts are unavailable.";
        this.#changed(); return;
      }
      if (me.directRecovery !== undefined && (!me.directRecovery || !/^[a-f0-9]{32}$/u.test(me.directRecovery.generation) || typeof me.directRecovery.restored !== "boolean"))
        throw new Error("Cloud recovery state is invalid.");
      this.directRecovery = me.directRecovery;
      this.channelMessaging = !!me.features.channelMessaging; this.supported = true; this.mentions = !!me.features.mentions; this.directHistory = !!me.features.directHistory; this.messageAudio = !!me.features.messageAudio; this.directMessageMedia = !!me.features.directMessageMedia; this.messageReactions = !!me.features.messageReactions; this.chatReactionChoices = !!me.features.chatReactionChoices;
      await this.client.request<{ directMessages: boolean }>("GET", "/v1/capabilities/me");
      if (epoch !== this.#epoch || this.#destroyed) return;
      await this.client.request("PUT", "/v1/capabilities/me", { friendRequests: true, directMessages: true });
      if (epoch !== this.#epoch || this.#destroyed) return;
      this.directEnabled = true; this.storage.setItem(this.#storageKey, "yes");
      const peers = (this.adapter.ownFriends?.() ?? []).slice(0, 2000);
      // A startup snapshot is not a newly reviewed friend decision. Capable
      // servers use explicit per-contact sync; legacy bootstrap remains intact.
      if(!this.friendSource.required){
      for (const peer of this.#nativeFriends) if (!peers.includes(peer)) {
        if (epoch !== this.#epoch || this.#destroyed) return;
        await this.client.request("DELETE", `/v1/relationships/${peer}`);
      }
      for (let start = 0; start < peers.length; start += 100) {
        if (epoch !== this.#epoch || this.#destroyed) return;
        await this.client.request("POST", "/v1/relationships/confirm", { members: peers.slice(start, start + 100) });
      }
      if (epoch !== this.#epoch || this.#destroyed) return;
      this.storage.setItem(this.#friendsKey, JSON.stringify(peers));
      }
      this.#nativeFriends = new Set(peers);
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
  refresh(reloadMailbox = true): Promise<void> {
    if (reloadMailbox) this.#mailRevision++;
    if (this.#refresh) return this.#refresh;
    if (!this.supported || !this.client.connected || this.#destroyed) return Promise.resolve();
    const epoch = this.#epoch;
    this.relationshipsLoading = true;
    const task = (async () => {
      const current = () => epoch === this.#epoch && !this.#destroyed;
      // Independent surfaces share one metadata request when any is bound.
      const metadata = this.friendSource.required || this.channelMessaging || this.#feedRecovery.generation !== undefined || this.#mailRecovery.generation !== undefined ? this.client.request('GET', '/v1/me') : undefined;
      // These surfaces are independent: a mailbox or relationship error must not
      // discard a successfully fetched unread count after an offline interval.
      const results = await Promise.allSettled([
        (async () => {
          if(metadata){const me=await metadata;if(!current())return;this.#acceptFriendMetadata(me);}
          const source={...this.friendSource};
          const writeVersion = this.#relationshipWriteVersion;
          const rows: Relationship[] = [];
          let cursor: number | null = 0;
          for (let page = 0; page < 100 && cursor !== null; page++) {
            const result: { items: Relationship[]; nextCursor: number | null } = await this.#friendRead("GET", `/v1/relationships?limit=40&cursor=${cursor}`,undefined,source);
            if (!current()) return;
            if (result.nextCursor !== null && (!Number.isSafeInteger(result.nextCursor) || result.nextCursor <= cursor)) throw new Error("Friend list pagination did not advance.");
            rows.push(...result.items); cursor = result.nextCursor;
          }
          if (!current()) return;
          if (cursor !== null) throw new Error("Friend list could not be loaded completely.");
          if (writeVersion !== this.#relationshipWriteVersion) { this.#refreshAgain = true; return; }
          for (const [peer, row] of this.relationships) if (row.state !== "none") this.relationships.delete(peer);
          for (const row of rows) this.relationships.set(row.memberNumber, this.#friendRow(row,source));
          this.relationshipsLoaded = true; this.relationshipsError = "";
          this.#changed();
        })().catch(error => {
          if (current()) { this.relationshipsError = "Friend requests could not refresh. Try again."; this.#changed(); }
          throw error;
        }),
        this.#loadMail(current, metadata),
        this.#loadChannels(current, metadata).catch(error => {
          if (!current()) return;
          if (!this.#channelAccess?.current()) { this.channels = []; this.channelsLoaded = false; this.#changed(); }
          throw error;
        }),
        this.#loadFeed(current, metadata),
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
        this.relationshipsLoading = false; this.#changed();
        if (this.#refreshAgain && !this.#destroyed && epoch === this.#epoch) {
          this.#refreshAgain = false; queueMicrotask(() => { void this.refresh(false).catch(() => {}); });
        }
      });
    this.#refresh = task; return task;
  }
  async #loadChannels(current: () => boolean, metadata: Promise<unknown> | undefined): Promise<void> {
    if (!this.channelMessaging) return;
    const me = await metadata;
    if (!current()) return;
    try {
      if (this.#channelRecovery.accept(me)) {
        this.#channelReadVersion++; this.#channelAccess = undefined; this.channels = []; this.channelsLoaded = false; this.#changed();
      }
    } catch (error) { this.#channelAccess = undefined; this.channels = []; this.channelsLoaded = false; this.#changed(); throw error; }
    const access = this.#channelRecovery.capture();
    const version = this.#channelReadVersion, rows: ChannelNotice[] = [];
    let cursor: number | null = 0;
    for (let page = 0; page < 100 && cursor !== null; page++) {
      const result: { items: ChannelNotice[]; nextCursor: number | null } = await access.request('GET', `/v1/communities/channel-inbox?limit=40&cursor=${cursor}`);
      if (!current()) return;
      if (result.nextCursor !== null && (!Number.isSafeInteger(result.nextCursor) || result.nextCursor <= cursor)) throw new Error('Channel pagination did not advance.');
      rows.push(...result.items.map(row => ({ ...row, ...(access.generation ? { recoveryGeneration: access.generation } : {}) }))); cursor = result.nextCursor;
    }
    if (!current() || !access.current()) return;
    if (cursor !== null) throw new Error('Channel notifications could not load completely.');
    if (version !== this.#channelReadVersion) { this.#refreshAgain = true; return; }
    this.#channelAccess = access; this.channels = rows; this.channelsLoaded = true; this.#changed();
  }
  async readChannel(channelId: string, sequence?: number, observedGeneration?: string): Promise<void> {
    const row = this.channels.find(c => c.channelId === channelId);
    if (!row || !row.latest) return;
    const access = this.#channelAccess;
    if (!access?.current() || row.recoveryGeneration !== access.generation ||
      sequence !== undefined && observedGeneration !== access.generation) throw new ChannelRecoveryError();
    const epoch = this.#epoch, through = sequence ?? row.latest;
    this.#channelReadVersion++;
    try { await access.request('PUT', `/v1/communities/${row.communityId}/channels/${channelId}/read`, { sequence: through }); }
    catch (error) {
      if (epoch === this.#epoch && !this.#destroyed && this.#channelAccess === access && !access.current()) {
        this.channels = []; this.channelsLoaded = false; this.#channelAccess = undefined; this.#changed();
      }
      throw error;
    }
    if (epoch !== this.#epoch || this.#destroyed || !access.current()) return;
    this.#channelReadVersion++; await this.refresh();
  }
  async known(members: number[]): Promise<void> {
    if (!this.supported || !this.client.connected) return;
    const peers = [...new Set(members)].filter(n => n !== this.client.memberNumber && !this.#known.has(n)).slice(0, 100);
    if (!peers.length) return;
    const epoch = this.#epoch,source={...this.friendSource},version=this.#relationshipWriteVersion;
    for (const peer of peers) this.#known.add(peer);
    let result: { items: Relationship[] };
    try { result = await this.#friendRead("POST", "/v1/relationships/known", { members: peers },source); }
    catch (error) { if (epoch === this.#epoch) for (const peer of peers) this.#known.delete(peer); throw error; }
    if (this.#destroyed || epoch !== this.#epoch) return;
    if(version!==this.#relationshipWriteVersion||JSON.stringify(source)!==JSON.stringify(this.friendSource))return;
    for (const row of result.items) this.relationships.set(row.memberNumber, this.#friendRow(row,source));
    this.#changed();
  }
  get(member: number): Promise<Relationship | undefined> {
    if (!this.supported || member === this.client.memberNumber) return Promise.resolve(undefined);
    const old = this.#getting.get(member); if (old) return old;
    const epoch = this.#epoch,source={...this.friendSource},version=this.#relationshipWriteVersion;
    const task = this.#friendRead<Relationship>("GET", `/v1/relationships/${member}`,undefined,source).then(value => {
      if (this.#destroyed || epoch !== this.#epoch) return undefined;
      if(version!==this.#relationshipWriteVersion||JSON.stringify(source)!==JSON.stringify(this.friendSource))return undefined;
      const row=this.#friendRow(value,source);this.relationships.set(member,row);this.#changed();return row;
    }).finally(() => { if (this.#getting.get(member) === task) this.#getting.delete(member); });
    this.#getting.set(member, task); return task;
  }
  action(member:number,action:RelationshipAction,observed?:Pick<Relationship,'memberNumber'|'revision'|'state'|'friendSource'>,current:()=>boolean=()=>true):Promise<void> {
    if(this.friendReadError)return Promise.reject(new RelationshipRecoveryError(this.friendReadError));
    if(this.friendSource.required||observed?.friendSource?.required||this.#friendActionsStore?.get(member)){
      const store=this.#friendActions(),epoch=this.#epoch,source={...this.friendSource};
      const valid=()=>current()&&this.supported&&!this.#destroyed&&epoch===this.#epoch&&store.identity()&&JSON.stringify(source)===JSON.stringify(this.friendSource);
      if(!valid())return Promise.reject(new RelationshipRecoveryError());
      const row=observed??this.relationships.get(member);if(!row||row.memberNumber!==member)return Promise.reject(new RelationshipRecoveryError());
      try{store.capture(action,row);}catch(error){return Promise.reject(error);}
      return store.send(member,valid).then(async value=>{if(!value||!valid())return;this.#relationshipWriteVersion++;this.relationships.set(member,value);this.#changed();await this.refresh();});
    }
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
      this.#relationshipWriteVersion++;
      this.#nativeChanging = true;
      try { this.adapter.setNativeFriend(member, false); } finally { this.#nativeChanging = false; }
    } else {
      if (action !== "sync") {
        const value = await this.client.request<Relationship>("POST", `/v1/relationships/${member}/${action}`, {});
        if (!valid()) throw new Error("Account session changed.");
        this.#relationshipWriteVersion++;
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
    if (!valid()) throw new Error("Account session changed.");
    this.#relationshipWriteVersion++;
    await this.refresh();
  }
  #invalidateLetters(): void {
    this.personalMailRevision++; this.personalMailLoaded = false;
    const hiddenUnread = this.mailbox.items.filter(row => row.kind === 'personal_mail' && !row.read).length;
    this.mailbox = { ...this.mailbox, items: this.mailbox.items.filter(row => row.kind !== 'personal_mail'),
      unread: Math.max(0, this.mailbox.unread - hiddenUnread) };
    this.#mailHead = ''; this.#changed();
  }
  #resetMail(): void {
    this.personalMailRevision++; this.personalMailLoaded = false;
    this.#mailAccess = undefined; this.mailbox = { items: [], unread: 0, nextCursor: null };
    this.mailboxLoaded = false; this.mailboxError = new MailboxRecoveryError().message; this.#mailHead = ''; this.#mailReadVersion++; this.#changed();
  }
  #acceptMailMetadata(me: unknown): void {
    try {
      this.#acceptFriendMetadata(me);
      const source=groupManagementSource(me);
      if(this.#mailRecovery.accept(me))this.#resetMail();
      if(source.required&&source.generation!==this.#mailRecovery.generation)throw new MailboxRecoveryError();
      this.groupManagementSource=source;
      const features = (me as {features?:{personalMail?:boolean;groupInvitationHistoryPreview?:boolean}} | null)?.features;
      this.groupInvitationHistoryPreview = features?.groupInvitationHistoryPreview === true;
      const enabled = features?.personalMail === true;
      if (enabled !== this.personalMail) { this.personalMail = enabled; this.#invalidateLetters(); }
    }
    catch (error) {
      // The independent group metadata check may fail before MailboxRecovery
      // sees it. Revoke existing captures as well as clearing the visible rows.
      this.#mailRecovery.invalidate(); this.groupManagementSource = undefined; this.groupInvitationHistoryPreview = false; this.personalMail = false;
      this.#resetMail(); throw error;
    }
  }
  #mailFailed(error: unknown, epoch: number): never {
    if (epoch === this.#epoch && !this.#destroyed && !this.#mailAccess?.current()) this.#resetMail();
    throw error;
  }
  #mailCurrent(access: MailboxAccess, epoch: number): boolean { return epoch === this.#epoch && !this.#destroyed && access.current(); }
  #mailPage(page: MailPage, access: MailboxAccess): MailPage {
    if (!Array.isArray(page.items) || page.items.length > 500 || !Number.isSafeInteger(page.unread) || page.unread < 0 || page.unread > 500 ||
      page.nextCursor !== null && (!Number.isSafeInteger(page.nextCursor) || page.nextCursor <= 0) ||
      page.items.some(item => !Number.isSafeInteger(item.id) || item.id <= 0)) throw new Error('Inbox page is invalid.');
    return { ...page, items: page.items.map(item => ({...item,...access.generation?{recoveryGeneration:access.generation}:{},...item.kind==='friend_request'&&this.friendSource.required?{friendSource:Object.freeze({...this.friendSource})}:{},...item.kind==='group_invitation'&&this.groupManagementSource?{groupManagementSource:Object.freeze({...this.groupManagementSource})}:{}})) };
  }
  async #loadMail(current: () => boolean, metadata: Promise<unknown> | undefined): Promise<void> {
    const token = this.#mailRecovery.revision, epoch = this.#epoch;
    try {
      if (metadata) { const me = await metadata; if (!current() || token !== this.#mailRecovery.revision) return; this.#acceptMailMetadata(me); }
      const access = this.#mailRecovery.capture(), version = this.#mailReadVersion, revision = this.#mailRevision;
      const letters = this.personalMail && !!this.options.completeMailbox, letterRevision = this.personalMailRevision;
      const scope = letters ? '&scope=all' : '';
      const valid = () => current() && access.current() && version === this.#mailReadVersion &&
        (!letters || letterRevision === this.personalMailRevision);
      const first = this.#mailPage(await access.request<MailPage>('GET', `/v1/mailbox?limit=${this.options.completeMailbox ? 40 : 20}${scope}`), access);
      if (!valid()) return;
      const head = JSON.stringify(first);
      // Full snapshots stay bounded by the server's 500 retained rows. The head
      // cache is discarded on recovery before any older cursor can be reused.
      if (this.options.completeMailbox && this.mailboxLoaded && revision === this.#mailHeadRevision && head === this.#mailHead) return;
      let page = first;
      const items = new Map(first.items.map(item => [item.id, item]));
      if (this.options.completeMailbox) for (let n = 0; page.nextCursor !== null; n++) {
        const cursor = page.nextCursor;
        if (n >= 12) throw new Error('Inbox pagination did not finish.');
        page = this.#mailPage(await access.request<MailPage>('GET', `/v1/mailbox?limit=40&cursor=${cursor}${scope}`), access);
        if (!valid()) return;
        if (page.nextCursor !== null && page.nextCursor >= cursor) throw new Error('Inbox pagination did not advance.');
        for (const item of page.items) items.set(item.id, item);
        if (items.size > 500) throw new Error('Inbox exceeded its limit.');
      }
      if (!valid()) return;
      this.mailbox = this.options.completeMailbox ? { items: [...items.values()], unread: [...items.values()].filter(item => !item.read).length, nextCursor: null } : first;
      this.personalMailLoaded = letters;
      this.#mailAccess = access; this.#mailHead = head; this.#mailHeadRevision = revision; this.mailboxLoaded = true; this.mailboxError = ""; this.#changed();
    } catch (error) { if (current()) this.#mailFailed(error, epoch); }
  }
  #mailAction(observedGeneration?: string): MailboxAccess {
    if (!this.supported || !this.client.connected || this.#destroyed) throw new Error('Inbox is not connected. Please retry when connected.');
    const access = this.#mailRecovery.capture();
    if (observedGeneration !== access.generation) throw new MailboxRecoveryError();
    return access;
  }
  personalMailAccess(): MailboxAccess {
    if (!this.personalMail) throw new Error('Mail is unavailable on this Cloud server.');
    return this.#mailAction(this.mailboxRecoveryGeneration);
  }
  async searchLetters(query: string): Promise<Set<number>> {
    const access = this.personalMailAccess(), epoch = this.#epoch, version = this.personalMailRevision;
    const ids = new Set<number>();
    let cursor: number | null = null;
    for (let page = 0; page < 13; page++) {
      const path = `/v1/mailbox?scope=mail&limit=40&query=${encodeURIComponent(query)}${cursor === null ? '' : `&cursor=${cursor}`}`;
      const result = this.#mailPage(await access.request<MailPage>('GET', path), access);
      if (!this.#mailCurrent(access, epoch) || !this.personalMail || version !== this.personalMailRevision) throw new MailboxRecoveryError();
      for (const row of result.items) if (isPersonalLetter(row)) ids.add(row.id);
      if (result.nextCursor === null) return ids;
      if (cursor !== null && result.nextCursor >= cursor) throw new Error('Mail search pagination did not advance.');
      cursor = result.nextCursor;
    }
    throw new Error('Mail search did not finish.');
  }
  /** Re-resolve an exact notification on its captured database before navigation.
   * Its returned target is authoritative; old numeric IDs are never retagged. */
  async resolveMail(item: MailItem, fresh = false): Promise<MailItem> {
    const access = this.#mailAction(item.recoveryGeneration), epoch = this.#epoch;
    if (!access.generation && !fresh && item.kind !== 'personal_mail') return item;
    try {
      const target = await access.request<MailItem>('GET', `/v1/mailbox/${item.id}`);
      if (!this.#mailCurrent(access, epoch) || target.id !== item.id) throw new MailboxRecoveryError();
      const result = access.generation ? { ...target, recoveryGeneration: access.generation } : target;
      if (item.kind === 'personal_mail' && (!this.personalMail || !samePersonalLetter(item, result) || typeof result.mailBody !== 'string'))
        throw new MailboxRecoveryError();
      return result;
    } catch (error) { return this.#mailFailed(error, epoch); }
  }
  async readMail(id?: number, observedGeneration?: string, scope?: 'mail'): Promise<void> {
    if (scope && !this.personalMail) throw new Error('Mail is unavailable on this Cloud server.');
    const access = this.#mailAction(observedGeneration), epoch = this.#epoch;
    if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0)) throw new Error('Inbox notification is invalid.');
    this.#mailReadVersion++;
    try {
      const readScope = scope ?? (this.personalMail && this.options.completeMailbox ? 'all' : undefined);
      await access.request('POST', '/v1/mailbox/read', { ...(id === undefined ? {} : {id}), ...(readScope ? {scope: readScope} : {}) });
      if (!this.#mailCurrent(access, epoch)) throw new MailboxRecoveryError();
      this.#mailReadVersion++; this.#mailHead = '';
      const affected = (item: MailItem) => (id === undefined || item.id === id) && (scope !== 'mail' || isPersonalLetter(item));
      const changed = this.mailbox.items.filter(item => affected(item) && !item.read).length;
      this.mailbox.items = this.mailbox.items.map(item => affected(item) ? { ...item, read:true } : item);
      this.mailbox.unread = id === undefined && !scope ? 0 : Math.max(0, this.mailbox.unread - changed); this.#changed();
      if (this.#refresh) await this.#refresh.catch(() => {});
      if (!this.#mailCurrent(access, epoch)) throw new MailboxRecoveryError();
      await this.refresh();
      if (!this.#mailCurrent(access, epoch)) throw new MailboxRecoveryError();
    } catch (error) { this.#mailFailed(error, epoch); }
  }
  async changeLetter(item: MailItem, action: 'unread' | 'remove'): Promise<void> {
    if (!this.personalMail || !isPersonalLetter(item)) throw new Error('This letter is unavailable.');
    const access = this.#mailAction(item.recoveryGeneration), epoch = this.#epoch;
    const path = `/v1/mailbox/letters/${item.id}`;
    try {
      const result = action === 'remove' ? await access.request<{id:number;removed?:boolean}>('DELETE', path) :
        await access.request<{id:number;read?:boolean}>('POST', `${path}/unread`, {});
      if (!this.#mailCurrent(access, epoch) || result.id !== item.id ||
        (action === 'remove' ? !('removed' in result && result.removed === true) : !('read' in result && result.read === false)))
        throw new MailboxRecoveryError();
      this.#mailReadVersion++; this.#mailHead = ''; this.personalMailRevision++;
      this.mailbox.items = this.mailbox.items.flatMap(row => !samePersonalLetter(row, item) ? [row] :
        action === 'remove' ? [] : [{ ...row, read: false }]);
      this.mailbox.unread = this.mailbox.items.filter(row => !row.read).length;
      this.#changed();
      if (this.#refresh) await this.#refresh.catch(() => {});
      if (!this.#mailCurrent(access, epoch)) throw new MailboxRecoveryError();
      await this.refresh();
    } catch (error) { this.#mailFailed(error, epoch); }
  }
  async moreMail(): Promise<void> {
    if (this.mailbox.nextCursor === null) return;
    const epoch = this.#epoch, version = this.#mailReadVersion, cursor = this.mailbox.nextCursor;
    const access = this.#mailAction(this.mailboxRecoveryGeneration);
    try {
      const page = this.#mailPage(await access.request<MailPage>('GET', `/v1/mailbox?limit=20&cursor=${cursor}`), access);
      if (!this.#mailCurrent(access, epoch) || version !== this.#mailReadVersion) return;
      if (page.nextCursor !== null && page.nextCursor >= cursor) throw new Error('Inbox pagination did not advance.');
      const unique = new Map([...this.mailbox.items, ...page.items].map(item => [item.id, item]));
      if (unique.size > 500) throw new Error('Inbox exceeded its limit.');
      this.mailbox = { ...page, items: [...unique.values()] }; this.#changed();
    } catch (error) { this.#mailFailed(error, epoch); }
  }
  async readFeedMail(observedGeneration?: string): Promise<void> {
    const epoch = this.#epoch, access = this.#mailAction(observedGeneration);
    const items = this.mailbox.items.filter(item => !item.read && ['post','comment'].includes(item.targetType)).slice(0,500);
    if (items.some(item => item.recoveryGeneration !== access.generation)) throw new MailboxRecoveryError();
    this.#mailReadVersion++;
    try {
      for (const item of items) {
        if (!this.#mailCurrent(access, epoch)) throw new MailboxRecoveryError();
        await access.request('POST', '/v1/mailbox/read', { id:item.id });
        if (!this.#mailCurrent(access, epoch)) throw new MailboxRecoveryError();
        this.mailbox.items = this.mailbox.items.map(row => row.id === item.id ? { ...row, read:true } : row);
      }
    } catch (error) { this.#mailFailed(error, epoch); }
    finally {
      if (this.#mailCurrent(access, epoch)) {
        this.#mailReadVersion++; this.#mailHead = ''; this.mailbox.unread = this.mailbox.items.filter(item => !item.read).length; this.#changed();
        if (this.#refresh) await this.#refresh.catch(() => {});
        if (this.#mailCurrent(access, epoch)) await this.refresh();
      }
    }
  }
  #resetFeed(): void {
    this.#feedAccess = undefined; this.feedUnread = 0; this.feedLatest = 0; this.#feedReadVersion++; this.#changed();
  }
  #acceptFeedMetadata(me: unknown): void {
    try { if (this.#feedRecovery.accept(me)) this.#resetFeed(); }
    catch (error) { this.#resetFeed(); throw error; }
  }
  async #loadFeed(current: () => boolean, metadata: Promise<unknown> | undefined): Promise<void> {
    const revision = this.#feedRecovery.revision;
    try {
      if (metadata) { const me = await metadata; if (!current() || revision !== this.#feedRecovery.revision) return; this.#acceptFeedMetadata(me); }
      const access = this.#feedRecovery.capture(), version = this.#feedReadVersion;
      const feed = await access.request<{ unread: number; latest: number }>('GET', '/v1/feed/unread');
      if (current() && access.current() && version === this.#feedReadVersion) {
        this.#feedAccess = access; this.feedUnread = feed.unread; this.feedLatest = feed.latest; this.#changed();
      }
    } catch (error) {
      if (!current()) return;
      if (!this.#feedAccess?.current()) this.#resetFeed();
      throw error;
    }
  }
  async readFeed(id: number, observedGeneration?: string): Promise<void> {
    if (!this.supported || !this.client.connected || this.#destroyed) throw new Error("Feed is not connected. Please retry when connected.");
    if (!id) return;
    const epoch = this.#epoch;
    // A newly opened view may learn B before the background counter does. Keep
    // its supplied identity through the refresh; never relabel an A number as B.
    if (observedGeneration !== this.#feedRecovery.generation) {
      const revision = this.#feedRecovery.revision;
      const me = await this.client.request('GET', '/v1/me');
      if (epoch !== this.#epoch || this.#destroyed) return;
      if (revision !== this.#feedRecovery.revision) throw new FeedRecoveryError();
      this.#acceptFeedMetadata(me);
    }
    const access = this.#feedRecovery.capture();
    if (observedGeneration !== access.generation) throw new FeedRecoveryError();
    await this.#readFeedThrough(id, access, epoch);
  }
  async #readFeedThrough(id: number, access: FeedReadAccess, epoch: number): Promise<void> {
    this.#feedReadVersion++;
    try { await access.request('PUT', '/v1/read-cursors/feed', { cursor: id }); }
    catch (error) {
      if (epoch === this.#epoch && !this.#destroyed && !this.#feedAccess?.current()) this.#resetFeed();
      throw error;
    }
    if (epoch !== this.#epoch || this.#destroyed || !access.current()) return;
    this.#feedReadVersion++;
    // An older unread request must not restore the badge after the cursor write.
    if (this.#refresh) await this.#refresh.catch(() => {});
    if (epoch === this.#epoch && !this.#destroyed && access.current()) await this.refresh();
  }
  async markAllFeedRead(): Promise<void> {
    if (!this.supported || !this.client.connected || this.#destroyed) throw new Error("Feed is not connected. Please retry when connected.");
    const epoch = this.#epoch;
    if (this.#feedRecovery.generation !== undefined) {
      const revision = this.#feedRecovery.revision;
      const me = await this.client.request('GET', '/v1/me');
      if (epoch !== this.#epoch || this.#destroyed) return;
      if (revision !== this.#feedRecovery.revision) throw new FeedRecoveryError();
      this.#acceptFeedMetadata(me);
    }
    const access = this.#feedRecovery.capture();
    let feed: { latest: number };
    try { feed = await access.request<{ latest: number }>('GET', '/v1/feed/unread'); }
    catch (error) { if (epoch === this.#epoch && !this.#destroyed && !this.#feedAccess?.current()) this.#resetFeed(); throw error; }
    if (epoch !== this.#epoch || this.#destroyed || !access.current()) return;
    if (feed.latest) await this.#readFeedThrough(feed.latest, access, epoch);
    else { this.#feedAccess = access; this.feedUnread = 0; this.feedLatest = 0; this.#changed(); }
  }
  destroy(): void { this.#channelMutes.destroy(); this.#friendActionsStore?.close();this.#mailRecovery.invalidate(); this.#feedRecovery.invalidate(); this.#channelRecovery.invalidate(); this.#releaseEvents?.(); this.#releaseEvents = undefined; this.#destroyed = true; this.#epoch++; for (const dispose of this.#disposers.splice(0)) dispose(); this.#listeners.clear(); this.relationships.clear(); }
}
