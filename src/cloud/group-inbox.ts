import { pageAction } from '../modules/platform-shell/page-action';
import { GroupMessagePresentation } from './group-message-presentation';
import { ScopedTimedMutes } from './scoped-timed-mutes';
import { conversationMuted } from '../modules/link-chat/conversation-mute';
import {ConversationArchive, type ArchiveTarget, type ArchivedGroupDraft} from '../modules/link-chat/conversation-archive';
import {GroupManagementActions,groupManagementSource,type GroupManagementDraft,type GroupManagementSource} from './group-management-intent';
import {groupCreationSource,type GroupCreationSource} from './group-creation-intent';
import { element } from "./dom";
import { reconcileChildren } from "../utils/dom";
import { bindClockTitle } from "../core/time-format";
import { CloudError, type CloudClient } from "./client";
import { SocialUI, initials, timeLabel } from "./social-ui";
import type { CloudGroup, CloudMessage, CloudPage } from "./types";
import type { KeyValueStorage } from "../core/settings";
import { kikiIcon } from "../modules/link-chat/icons";
import { GroupListMenu } from "./group-list-menu";
import {GroupReadState,type PendingGroupReceipt,type GroupRecovery} from './group-read-state';
import {groupMutationSource,type GroupMutationSource} from './group-mutation-intent';
import type { MailItem } from './community';

export type GroupOption = 'members' | 'edit' | 'remove-local' | 'leave';
export interface GroupMuteScope { readonly owner: number; readonly id: string; readonly conversationId: string; readonly generation: string; readonly origin: string }

interface Preview { items: CloudMessage[]; at: number }
export interface GroupInvitation {
  id: string; title: string; owner: number; invitedAt?: number;
  members?: { memberNumber: number; role: 'owner' | 'admin' | 'member' }[];
  capacity?: number;
  avatarId?: string | null;
}
interface GroupInvitationReviewOptions {
  current(): boolean;
  accepted(title?: string): void;
  declined(): void;
  inviter?: string;
  details?: { icon: HTMLElement; count: HTMLElement; roster: HTMLElement };
}
export interface GroupHistoryAccess {readonly generation?:string|undefined;readonly mutationSource?:GroupMutationSource;readonly managementSource?:GroupManagementSource;current():boolean;request<T>(method:string,path:string,body?:unknown):Promise<T>}

/** Account-local read cursors; message contents stay in memory, bounded to 40 per group. */
export class CloudGroupInbox {
  readonly element = element("div", { className: "kl-conversations kl-cloud-group-list", ariaLabel: "Group conversations" });
  groups: CloudGroup[] = [];
  #removed = new Map<string, CloudGroup>();
  #invitations: GroupInvitation[] = [];
  #invitationCacheSource: GroupManagementSource | undefined;
  readonly #confirmedInvitationResponses = new Map<string, { action: 'accept' | 'decline'; title: string | undefined }>();
  #previews = new Map<string, Preview>();
  #reads = new Map<string, number>();
  #task: Promise<void> | undefined;
  #generation = 0;
  #updatedAt = 0;
  #dirty = true;
  #query = "";
  #selected: string | undefined;
  #rows = new Map<string, HTMLButtonElement>();
  readonly #rowFrames = new WeakMap<HTMLButtonElement, HTMLElement>();
  #drafts = new Map<string, string>();
  #storageKey: string;
  #error = "";
  #limit = 20;
  #unreadOnly = false;
  #showUnreadBadges = true;
  #archivedOnly = false;
  readonly archive: ConversationArchive;
  readonly presentation: GroupMessagePresentation;
  readonly #preferences = new Map<string, { pinned: boolean; muted: boolean }>();
  readonly #mutes: ScopedTimedMutes<GroupMuteScope>;
  readonly #menu: GroupListMenu;
  readonly #preferencesKey: string;
  readonly #receiptKey: string;
  readonly #receiptQueue = new Map<string, PendingGroupReceipt>();
  readonly #acknowledgedReceipts = new Map<string, "delivered" | "read">();
  #receiptsEnabled = false;
  #receiptTask: Promise<void> | undefined;
  #baseline = false;
  readonly #state:GroupReadState;readonly #owner:number;readonly #origin:string;
  #closed=false;#ready=false;#recoveryTask:Promise<number>|undefined;#rejected:string|undefined;
  #mutationSource:GroupMutationSource={required:false};
  readonly management:GroupManagementActions;
  #managementSource:GroupManagementSource={required:false};
  #creationSource:GroupCreationSource={required:false};
  get creationSource():GroupCreationSource{return Object.freeze({...this.#creationSource});}
  get managementSource():GroupManagementSource{return Object.freeze({...this.#managementSource});}
  get invitations():ReadonlyArray<GroupInvitation>{return this.#invitations;}

  pendingInvitation(id: string, source?: GroupManagementSource): Readonly<GroupInvitation> | undefined {
    const cached = this.#invitationCacheSource;
    if (!this.client.connected || !this.#canObserve() || !cached ||
      cached.required !== this.#managementSource.required || cached.generation !== this.#managementSource.generation ||
      cached.required !== (source?.required ?? false) || cached.generation !== source?.generation) return;
    return this.#invitations.find(invitation => invitation.id === id);
  }

  constructor(readonly client: CloudClient, readonly ui: SocialUI, readonly storage: KeyValueStorage,
    readonly options: { platformPreview?: boolean; retentionDays?():number; openGroupOption?(action: GroupOption, group: CloudGroup, anchor: HTMLElement): void; openGroupMute?(scope: GroupMuteScope, anchor: HTMLElement): void; resetFilters?(): void; createGroup?(): void; select(group: CloudGroup): void; changed(): void; inviteChanged(): Promise<void>; incoming?(group: CloudGroup, message: CloudMessage): void; mutedMessage?(messageId: string): void; recoveryChanged?():void; archiveGroup?(group:CloudGroup,target:ArchiveTarget):void|Promise<void> }) {
    this.presentation = new GroupMessagePresentation(storage,client.memberNumber,client.origin,options.retentionDays);
    this.archive=new ConversationArchive(client.memberNumber,storage,()=>!this.#closed&&client.memberNumber===this.#owner&&client.origin===this.#origin);
    this.management=new GroupManagementActions(client);
    this.#owner=client.memberNumber;this.#origin=client.origin;this.#state=new GroupReadState(storage,this.#owner,this.#origin);
    this.#mutes = new ScopedTimedMutes(storage, `kikilink:group-mute:${this.#owner}:${encodeURIComponent(this.#origin)}:`,
      row => `${row.generation}:${encodeURIComponent(row.id)}:${encodeURIComponent(row.conversationId)}`, 'Group',
      () => { this.render(); this.options.changed(); });
    this.#storageKey = `kikilink:cloud:group-reads:${client.memberNumber}:v1`;
    try {
      const stored = JSON.parse(storage.getItem(this.#storageKey) ?? "{}");
      for (const [id, sequence] of Object.entries(stored).slice(0, 100))
        if (id.length <= 80 && Number.isSafeInteger(sequence) && (sequence as number) >= 0) this.#reads.set(id, sequence as number);
    } catch { /* A browser storage failure does not prevent reading a group. */ }
    this.#preferencesKey = `kikilink:cloud:group-preferences:${client.memberNumber}:v1`;
    try { this.#reloadPreferences(); } catch { /* Default preferences remain usable. */ }
    window.addEventListener('storage', this.#preferencesChanged);
    this.#receiptKey = `kikilink:cloud:group-receipts:${client.memberNumber}:v1`;
    try {
      const stored = JSON.parse(storage.getItem(this.#receiptKey) ?? "[]");
      if (Array.isArray(stored)) for (const item of stored.slice(-500)) {
        if (!item || typeof item !== "object") continue;
        const value = item as { messageId?: unknown; groupId?: unknown; conversationId?: unknown; state?: unknown };
        if (typeof value.messageId !== "string" || value.messageId.length > 80 ||
          typeof value.groupId !== "string" || value.groupId.length > 80 ||
          typeof value.conversationId !== "string" || value.conversationId.length > 80 ||
          (value.state !== "delivered" && value.state !== "read")) continue;
        this.#receiptQueue.set(value.messageId, { groupId: value.groupId, conversationId: value.conversationId, state: value.state });
      }
    } catch { /* A malformed retry queue cannot acknowledge anything. */ }
    this.#menu = new GroupListMenu(this.element, (id, anchor) => this.conversationActions(id, () => this.#menu.close(), anchor), options.platformPreview === true);
  }
  #check(epoch=this.#generation):void {
    if(this.#closed||epoch!==this.#generation||!this.client.connected||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin)throw new CloudError('session_changed');
    this.#state.check();
  }
  async #prepareRecovery(force=false):Promise<number> {
    this.#check();if(this.#ready&&!force)return this.#generation;
    if(this.#recoveryTask)return this.#recoveryTask;
    const epoch=this.#generation;this.#ready=false;
    const task=(async()=>{
      const me=await this.client.request<{features?:{groupReadRecoveryGeneration?:unknown};directRecovery?:GroupRecovery}>('GET','/v1/me');this.#check(epoch);
      if(!me||typeof me!=='object'||Array.isArray(me)||me.features?.groupReadRecoveryGeneration!==undefined&&typeof me.features.groupReadRecoveryGeneration!=='boolean')throw new Error('Cloud group recovery identity is unavailable.');
      const supported=me.features?.groupReadRecoveryGeneration===true,recovery=supported?me.directRecovery:undefined;
      if(supported&&(!recovery||!/^[a-f0-9]{32}$/u.test(recovery.generation)||typeof recovery.restored!=='boolean'))throw new Error('Cloud group recovery identity is unavailable.');
      if(recovery&&this.#rejected===recovery.generation)throw new Error('Cloud group history changed. Reconnect before continuing.');
      const mutationSource=groupMutationSource(me);
      if(mutationSource.required&&(!supported||mutationSource.generation!==recovery?.generation))throw new Error('Cloud group mutation identity is unavailable.');
      this.#mutationSource=mutationSource;
      const managementSource=groupManagementSource(me);
      if(managementSource.required&&(!supported||managementSource.generation!==recovery?.generation))throw new Error('Cloud group management identity is unavailable.');
      this.#managementSource=managementSource;this.management.observe(managementSource);
      const creationSource=groupCreationSource(me);
      if(creationSource.required&&(!supported||creationSource.generation!==recovery?.generation))throw new Error('Cloud group creation identity is unavailable.');
      this.#creationSource=creationSource;
      const result=this.#state.prepare(recovery);
      if(result.applied&&result.state){
        this.#reads=new Map(result.state.reads);this.#readUpdates=new Map(result.state.pendingReads);this.#receiptQueue.clear();
        for(const [id,receipt]of result.state.receipts)this.#receiptQueue.set(id,{...receipt});this.#acknowledgedReceipts.clear();
      }
      if(result.reset){
        this.#generation++;this.#baseline=false;this.#previews.clear();this.groups=[];this.#mutes.sync([]);this.#invitations=[];this.#rows.clear();this.#readTask=undefined;this.#receiptTask=undefined;this.#task=undefined;this.#dirty=true;
        this.options.recoveryChanged?.();
      }
      this.#ready=true;return this.#generation;
    })().finally(()=>{if(this.#recoveryTask===task)this.#recoveryTask=undefined;});
    this.#recoveryTask=task;return task;
  }
  async #request<T>(method:string,path:string,body?:unknown,epoch=this.#generation):Promise<T> {
    this.#check(epoch);if(!this.#ready)throw new Error('Refresh groups before syncing read state.');
    const recovery=this.#state.generation;
    if(recovery){if(method==='GET')path+=`${path.includes('?')?'&':'?'}recoveryGeneration=${recovery}`;else body={...(body as Record<string,unknown>),recoveryGeneration:recovery};}
    try{
      const result=await this.client.request<T>(method,path,body);this.#check(epoch);
      if(recovery&&(!result||typeof result!=='object'||(result as {recoveryGeneration?:unknown}).recoveryGeneration!==recovery))throw new Error('Cloud group response has no matching recovery identity.');
      return result;
    }catch(error){this.#check(epoch);if(error instanceof CloudError&&error.code==='recovery_generation_required'){this.#rejected=recovery;this.#ready=false;this.#dirty=true;}throw error;}
  }
  async historyAccess():Promise<GroupHistoryAccess> {
    const epoch=await this.#prepareRecovery(true);
    return {generation:this.#state.generation,mutationSource:Object.freeze({...this.#mutationSource}),managementSource:this.managementSource,current:()=>{try{this.#check(epoch);return this.#ready;}catch{return false;}},request:<T>(method:string,path:string,body?:unknown)=>this.#request<T>(method,path,body,epoch)};
  }
  #canObserve():boolean{return !this.#closed&&(this.#ready||!this.client.connected)&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin&&this.#state.current()&&(!this.#state.hasCheckpoint||this.#state.bound);}
  #saveBound():boolean {
    if(!this.#state.bound){if(this.#state.hasCheckpoint)throw new Error('Refresh groups before updating their saved state.');return false;}
    this.#state.save(this.#reads,this.#readUpdates,this.#receiptQueue);return true;
  }
  async readyForArchive():Promise<void> {await this.#prepareRecovery();}
  archiveTarget(group: CloudGroup): ArchiveTarget {
    this.#check(); if(!this.#ready) throw new Error('Refresh groups before archiving this conversation.');
    return this.#savedArchiveTarget(group);
  }
  #savedArchiveTarget(group:CloudGroup):ArchiveTarget {
    if(this.#closed||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin||!this.#state.current()||(!this.#ready&&!this.#state.bound&&!this.#baseline))throw new Error('The saved group identity is unavailable.');
    const known=this.groups.find(g=>g.id===group.id);if(known&&known.conversationId!==group.conversationId)throw new Error('This group conversation changed. Reopen it before archiving.');
    return {kind:'group',origin:this.#origin,generation:this.#state.generation??'legacy',id:group.id,conversationId:group.conversationId};
  }
  isArchived(id: string): boolean {
    const group=this.groups.find(g=>g.id===id);if(!group)return false;
    try{return this.archive.archived(this.#savedArchiveTarget(group));}catch{return false;}
  }
  archivedOnly(value:boolean):void {if(this.#archivedOnly===value)return;this.#archivedOnly=value;this.#limit=20;this.#menu.close(false);this.render();}
  conversationActions(id: string, close: () => void, anchor: HTMLElement): HTMLElement[] {
    const group = this.groups.find(item => item.id === id);
    if (!group) return [];
    const compact = this.options.platformPreview;
    const pinned = this.isPinned(id), muted = this.isMuted(id);
    const targetLabel = compact ? "conversation" : "group";
    const timed = compact && this.options.openGroupMute;
    const scope = timed ? this.muteScope(group) : undefined;
    const actions = [
      this.ui.button(`${pinned ? "Unpin" : "Pin"} ${targetLabel}`,
        () => { close(); this.togglePinned(id); }, "pin"),
      this.ui.button(timed ? (muted ? "Manage mute…" : "Mute conversation…") : `${muted ? "Unmute" : "Mute"} ${targetLabel}`, () => {
        close();
        if (timed && scope) {
          if (this.hasMuteScope(scope)) timed(scope, anchor);
        } else this.toggleMuted(id);
      }, compact && !muted ? "muted" : "notifications"),
      ...this.#archiveMenu(id, close),
    ];
    if (compact) {
      const read = this.ui.button("Mark as read", () => {
        close();
        const current = this.groups.find(item => item.id === id);
        if (!current || current.conversationId !== group.conversationId) return;
        this.markRead(id, current.lastMessage?.sequence ?? this.#previews.get(id)?.items.at(-1)?.sequence ?? 0);
      }, "read-all");
      read.disabled = !this.unreadCount(id) || !this.#canObserve();
      actions.push(read);
      if (this.options.openGroupOption) {
        const identity = this.muteScope(group);
        const owner = group.owner === this.client.memberNumber;
        const option = (action: GroupOption, label: string, icon: 'users' | 'edit' | 'logout') => this.ui.button(label, () => {
          close();
          const latest = this.groups.find(row => row.id === group.id);
          if (latest && this.hasMuteScope(identity) && latest.owner === group.owner)
            this.options.openGroupOption?.(action, latest, anchor);
        }, icon);
        actions.push(option('members', 'View members', 'users'));
        if (owner) actions.push(option('edit', 'Edit group', 'edit'));
        actions.push(option(owner ? 'remove-local' : 'leave', owner ? 'Remove local group…' : 'Leave group…', 'logout'));
      }
    }
    return actions;
  }
  #archiveMenu(id:string,close:()=>void):HTMLButtonElement[] {
    const group=this.groups.find(g=>g.id===id);if(!group||!this.options.archiveGroup)return[];
    let target:ArchiveTarget;try{target=this.archiveTarget(group);}catch{return[];}
    return [this.ui.button(this.isArchived(id)?'Restore conversation':'Archive conversation',async()=>{close();await this.options.archiveGroup?.(group,target);},this.options.platformPreview?'bookmark':'archive')];
  }
  setArchived(group:CloudGroup,target:ArchiveTarget,value:boolean,draft?:ArchivedGroupDraft):void {
    const current=this.archiveTarget(group);
    if(JSON.stringify(current)!==JSON.stringify(target))throw new Error('This group changed. Reopen it before changing its archive state.');
    this.archive.set(target,value,draft);this.render();this.options.changed();
  }
  get archivedUnreadMessages():number {return this.groups.filter(g=>this.isArchived(g.id)&&!this.isMuted(g.id)).reduce((n,g)=>n+this.unreadCount(g.id),0);}
  isPinned(id: string): boolean { return this.#preferences.get(id)?.pinned ?? false; }
  muteScope(group: CloudGroup): GroupMuteScope {
    return { owner: this.#owner, id: group.id, conversationId: group.conversationId, generation: this.#state.generation ?? 'legacy', origin: this.#origin };
  }
  hasMuteScope(scope: GroupMuteScope): boolean {
    return !this.#closed && this.client.memberNumber === this.#owner && this.client.origin === this.#origin &&
      scope.owner === this.#owner && scope.origin === this.#origin && scope.generation === (this.#state.generation ?? 'legacy') &&
      this.#mutes.has(scope) && this.groups.some(group => group.id === scope.id && group.conversationId === scope.conversationId);
  }
  canSetMute(scope: GroupMuteScope): boolean {
    return this.client.connected && this.#ready && this.hasMuteScope(scope) && this.#state.current();
  }
  muteUntil(scope: GroupMuteScope): number {
    if (!this.hasMuteScope(scope)) return 0;
    return this.#mutes.until(scope) || (this.#preferences.get(scope.id)?.muted ? -1 : 0);
  }
  isMuted(id: string): boolean {
    if (this.#removed.has(id) || this.#preferences.get(id)?.muted) return true;
    const group = this.groups.find(row => row.id === id);
    return !!group && conversationMuted(this.#mutes.until(this.muteScope(group)));
  }
  setMute(scope: GroupMuteScope, until: number): void {
    if (!this.canSetMute(scope)) throw new Error('This group is no longer available. Reopen the conversation to change its mute.');
    if (until !== 0 && (!Number.isSafeInteger(until) || !conversationMuted(until))) throw new Error('Choose a current mute duration.');
    this.#reloadPreferences();
    if (this.#preferences.get(scope.id)?.muted) {
      // Anchor the old indefinite pause to this conversation before retiring its unscoped boolean.
      // A failed write at any step leaves the active conversation quiet and the change retryable.
      if (!this.#mutes.until(scope)) this.#mutes.set(scope, -1);
      this.#savePreference(scope.id, 'muted', false, true);
    }
    this.#mutes.set(scope, until);
  }
  #removedKey(group: CloudGroup): string {
    const scope = this.muteScope(group);
    return `kikilink:removed-group:${scope.owner}:${encodeURIComponent(scope.origin)}:${scope.generation}:${encodeURIComponent(group.id)}:${encodeURIComponent(group.conversationId)}`;
  }
  #removedOnDevice(group: CloudGroup): boolean {
    const key = this.#removedKey(group);
    const read = this.storage.getPersistedItemResult?.(key) ?? this.storage.getItemResult?.(key);
    if (read && !read.ok) throw new Error('Could not read the groups removed on this device.');
    return (read ? read.value : this.storage.getItem(key)) === '1';
  }
  removeLocalGroup(group: CloudGroup, scope: GroupMuteScope): void {
    const known = this.groups.find(row => row.id === group.id);
    if (!this.canSetMute(scope) || known?.conversationId !== group.conversationId || known.owner !== this.#owner)
      throw new Error('Reopen the current group before removing it from this device.');
    const key = this.#removedKey(known);
    if (this.storage.setItemVerified) this.storage.setItemVerified(key, '1');
    else this.storage.setItem(key, '1');
    if (!this.#removedOnDevice(known)) throw new Error('Could not save the change on this device.');
    this.#removed.set(known.id, known);
    this.groups = this.groups.filter(row => row !== known);
    this.#previews.delete(known.id); this.#drafts.delete(known.id);
    this.#mutes.sync(this.groups.map(row => this.muteScope(row)));
    this.render(); this.options.changed();
  }
  restoreRemovedGroup(id: string): void {
    const group = this.#removed.get(id);
    if (!group || !this.#canObserve() || !this.client.connected) return;
    this.storage.removeItem(this.#removedKey(group));
    if (this.#removedOnDevice(group)) throw new Error('Could not restore the group to this device.');
    this.#removed.delete(id);
    this.groups = [...this.groups, group];
    this.#mutes.sync(this.groups.map(row => this.muteScope(row)));
    this.render(); this.options.changed();
  }
  togglePinned(id: string): void { this.#setPreference(id, 'pinned'); }
  toggleMuted(id: string): void {
    const group = this.groups.find(row => row.id === id);
    if (!group) return;
    const scope = this.muteScope(group);
    if (this.#mutes.until(scope)) this.setMute(scope, 0);
    else this.#setPreference(id, 'muted');
  }
  #reloadPreferences(): void {
    const key = this.#preferencesKey;
    const read = this.storage.getPersistedItemResult?.(key) ?? this.storage.getItemResult?.(key);
    if (read && !read.ok) throw new Error('Group preferences could not be read on this device.');
    const raw = read ? read.value : this.storage.getItem(key);
    let stored: unknown;
    try { stored = JSON.parse(raw ?? '{}'); } catch { /* A corrupt legacy record cannot describe an active mute. */ }
    this.#preferences.clear();
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return;
    for (const [id, value] of Object.entries(stored).slice(0, 100)) {
      if (id.length > 80 || !value || typeof value !== 'object') continue;
      const entry = value as { pinned?: unknown; muted?: unknown };
      this.#preferences.set(id, { pinned: entry.pinned === true, muted: entry.muted === true });
    }
  }
  removedLocally(id: string): boolean { return this.#removed.has(id); }
  readonly #preferencesChanged = (event: StorageEvent): void => {
    if (event.key === null || event.key.includes(`kikilink:removed-group:${this.#owner}:${encodeURIComponent(this.#origin)}:`)) {
      this.invalidate();
      if (this.client.connected) void this.refresh(true).catch(() => {});
    }
    if (event.key !== null && !event.key.endsWith(this.#preferencesKey)) return;
    try { this.#reloadPreferences(); } catch { return; }
    this.render(); this.options.changed();
  };
  #savePreference(id: string, key: 'pinned' | 'muted', value: boolean, verified: boolean): void {
    const next = new Map(this.#preferences);
    next.set(id, { pinned: false, muted: false, ...next.get(id), [key]: value });
    while (next.size > 100) next.delete(next.keys().next().value!);
    const bytes = JSON.stringify(Object.fromEntries(next));
    const write = () => {
      if (this.storage.setItemVerified) this.storage.setItemVerified(this.#preferencesKey, bytes);
      else this.storage.setItem(this.#preferencesKey, bytes);
      if (verified) {
        this.#reloadPreferences();
        if (this.#preferences.get(id)?.[key] !== value) throw new Error('Group preferences could not be saved on this device.');
      }
    };
    if (verified) write();
    else {
      try { write(); } catch { /* Legacy controls keep a session-only preference when browser storage is full. */ }
      this.#preferences.clear();
      for (const [id, entry] of next) this.#preferences.set(id, entry);
    }
  }
  #setPreference(id: string, key: 'pinned' | 'muted'): void {
    if (!this.groups.some(g => g.id === id)) return;
    try { this.#reloadPreferences(); } catch { /* Preserve the last readable state. */ }
    this.#savePreference(id, key, !this.#preferences.get(id)?.[key], false);
    this.render(); this.options.changed();
  }
  get unreadMessages(): number {
    return this.groups.filter(g => !this.isMuted(g.id) && !this.isArchived(g.id)).reduce((sum, g) => sum + this.unreadCount(g.id), 0);
  }
  unreadCount(id: string): number {
    const g = this.groups.find(group => group.id === id);
    if (!g) return 0;
    return g.unreadMessages !== undefined
      ? g.unreadBySender ? g.unreadBySender.filter(m => !this.ui.options.isBlocked(m.memberNumber)).reduce((n, m) => n + m.count, 0) : g.unreadMessages
      : (this.#previews.get(g.id)?.items ?? []).filter(m => m.sequence > (this.#reads.get(g.id) ?? 0) && m.sender !== this.client.memberNumber && m.text !== null && !this.ui.options.isBlocked(m.sender)).length;
  }
  enableMessageReceipts(enabled: boolean): void {
    this.#receiptsEnabled = enabled;
    if (enabled) void this.flushReceipts().catch(() => {});
  }
  acknowledgeReceipts(groupId: string, conversationId: string, deliveredIds: string[], readIds: string[]): void {
    if (!this.#receiptsEnabled || !this.#canObserve()) return;
    for (const messageId of deliveredIds) if (!this.#receiptQueue.has(messageId) && !this.#acknowledgedReceipts.has(messageId))
      this.#receiptQueue.set(messageId, { groupId, conversationId, state: "delivered" });
    for (const messageId of readIds) if (this.#receiptQueue.get(messageId)?.state !== "read" && this.#acknowledgedReceipts.get(messageId) !== "read")
      this.#receiptQueue.set(messageId, { groupId, conversationId, state: "read" });
    while (this.#receiptQueue.size > 500) this.#receiptQueue.delete(this.#receiptQueue.keys().next().value!);
    this.#saveReceiptQueue();
    void this.flushReceipts().catch(() => {});
  }
  #saveReceiptQueue(): void {
    if(this.#saveBound())return;
    const rows = [...this.#receiptQueue].map(([messageId, value]) => ({ messageId, ...value }));
    try { this.storage.setItem(this.#receiptKey, JSON.stringify(rows)); }
    catch { /* The in-memory retry queue remains usable for this session. */ }
  }
  flushReceipts(): Promise<void> {
    if (this.#receiptTask) return this.#receiptTask;
    if (!this.#receiptsEnabled || !this.client.connected || !this.#receiptQueue.size) return Promise.resolve();
    const task = (async () => {
      const epoch=await this.#prepareRecovery();
      while (epoch===this.#generation && this.#receiptsEnabled && this.client.connected && this.#receiptQueue.size) {
        const first = this.#receiptQueue.entries().next().value as [string, PendingGroupReceipt] | undefined;
        if (!first) return;
        const [, seed] = first;
        const batch = [...this.#receiptQueue].filter(([, value]) => value.conversationId === seed.conversationId).slice(0, 40);
        const deliveredIds = batch.filter(([, value]) => value.state === "delivered").map(([id]) => id);
        const readIds = batch.filter(([, value]) => value.state === "read").map(([id]) => id);
        try {
          await this.#request("PUT", `/v1/conversations/${seed.conversationId}/receipts`, { deliveredIds, readIds },epoch);
        } catch (error) {
          this.#check(epoch);
          if (error instanceof CloudError && [403, 404].includes(error.status)) {
            for (const [messageId, value] of [...this.#receiptQueue]) if (value.groupId === seed.groupId) this.#receiptQueue.delete(messageId);
            this.#saveReceiptQueue();
            continue;
          }
          throw error;
        }
        for (const [messageId, sent] of batch) if (this.#receiptQueue.get(messageId)?.state === sent.state) {
          this.#receiptQueue.delete(messageId);
          this.#acknowledgedReceipts.delete(messageId);
          this.#acknowledgedReceipts.set(messageId, sent.state);
        }
        while (this.#acknowledgedReceipts.size > 1000)
          this.#acknowledgedReceipts.delete(this.#acknowledgedReceipts.keys().next().value!);
        this.#saveReceiptQueue();
      }
    })().finally(() => { if (this.#receiptTask === task) this.#receiptTask = undefined; });
    this.#receiptTask = task;
    return task;
  }
  get unreadGroups(): number { return this.groups.filter(group => !this.isArchived(group.id)&&this.hasUnread(group.id)).length; }
  hasUnread(id: string): boolean {
    const read = this.#reads.get(id) ?? 0;
    const group = this.groups.find(g => g.id === id);
    if (group?.incomingSequences) return group.incomingSequences.some(m => m.sequence > read && !this.ui.options.isBlocked(m.memberNumber));
    const summary = group?.lastIncomingSequence;
    if (summary !== undefined) return summary > read;
    return this.#previews.get(id)?.items.some(m => m.sequence > read && m.sender !== this.client.memberNumber && m.text !== null && !this.ui.options.isBlocked(m.sender)) ?? false;
  }
  unreadOnly(value: boolean): void { if (value !== this.#unreadOnly) { this.#unreadOnly = value; this.#limit = 20; this.render(); } }
  showUnreadBadges(value: boolean): void {
    if (this.#showUnreadBadges === value) return;
    this.#showUnreadBadges = value;
    this.render();
  }
  async markAllRead(): Promise<void> {
    await this.refresh(true);
    for (const group of this.groups.filter(g=>!this.isArchived(g.id))) this.markRead(group.id, group.lastMessage?.sequence ?? this.#previews.get(group.id)?.items.at(-1)?.sequence ?? 0, true);
    this.#saveReads(); this.render(); this.options.changed();
    await this.flushReadCursors();
  }
  invalidate(): void { this.#dirty = true; }
  search(query: string): void { if (query === this.#query) return; this.#query = query; this.#limit = 20; this.render(); }
  select(id?: string): void { this.#selected = id; this.render(); }
  draft(id: string, text: string): void { if (text) this.#drafts.set(id, text); else this.#drafts.delete(id); this.render(); }
  observe(id: string, items: CloudMessage[], read = false): void {
    if (!this.client.connected || !this.#canObserve()) return;
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
          if (m.sender !== this.client.memberNumber) {
            if (m.sequence > group.lastIncomingSequence && group.unreadMessages !== undefined) {
              group.unreadMessages++;
              const count = group.unreadBySender?.find(s => s.memberNumber === m.sender);
              if (count) count.count++; else group.unreadBySender?.push({ memberNumber: m.sender, count: 1 });
            }
            group.lastIncomingSequence = Math.max(group.lastIncomingSequence, m.sequence);
          }
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
  #readUpdates = new Map<string, number>();
  #readFlush = false;
  #readTask: Promise<void> | undefined;
  #queueRead(id: string, sequence: number): void {
    this.#readUpdates.set(id, Math.max(this.#readUpdates.get(id) ?? 0, sequence));
    if (this.#readFlush) return;
    this.#readFlush = true;
    queueMicrotask(() => {
      this.#readFlush = false;
      void this.flushReadCursors().catch(() => { this.#dirty = true; });
    });
  }
  flushReadCursors(): Promise<void> {
    if (this.#readTask) return this.#readTask;
    if (!this.#readUpdates.size) return Promise.resolve();
    if (!this.client.connected) return Promise.reject(new Error("Read state will sync when connected."));
    const task = (async () => {
      const generation=await this.#prepareRecovery();
      while (generation === this.#generation && this.#readUpdates.size && this.client.connected) {
        const items = [...this.#readUpdates].slice(0, 100).map(([id, cursor]) => ({ scope: `group:${id}`, cursor }));
        await this.#request("PUT", "/v1/read-cursors", { items },generation);
        if (generation !== this.#generation) return;
        for (const item of items) if (this.#readUpdates.get(item.scope.slice(6)) === item.cursor) this.#readUpdates.delete(item.scope.slice(6));
        this.#saveReads();
      }
    })().finally(() => { if (this.#readTask === task) this.#readTask = undefined; });
    this.#readTask = task; return task;
  }
  markRead(id: string, sequence: number, batch = false): void {
    if(!this.#canObserve()||!Number.isSafeInteger(sequence)||sequence<0)return;
    if (sequence > (this.#reads.get(id) ?? 0)) {
      this.#reads.set(id, sequence);
      const group = this.groups.find(g => g.id === id);
      if (group?.readCursor !== undefined) {
        if (sequence >= (group.lastIncomingSequence ?? 0)) { group.unreadMessages = 0; group.unreadBySender = []; }
        group.readCursor = Math.max(group.readCursor, sequence);
        this.#queueRead(id, sequence);
      }
      while (this.#reads.size > 100) this.#reads.delete(this.#reads.keys().next().value!);
      if (!batch) this.#saveReads();
    }
    if (!batch) { this.render(); this.options.changed(); }
  }
  #saveReads(): void { if(this.#saveBound())return;try { this.storage.setItem(this.#storageKey, JSON.stringify(Object.fromEntries(this.#reads))); } catch { /* Session read state still works. */ } }
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
  async refreshInvitationReview(current: () => boolean): Promise<void> {
    // A refresh started before the dialog opened or access changed may contain an older roster.
    if (this.#task) await this.#task.catch(() => {});
    if (current()) await this.refresh(true);
  }
  async #load(generation: number, refreshPreviews: boolean): Promise<void> {
    try {
      generation=await this.#prepareRecovery(true);
      const invitationSource = this.#managementSource;
      const [groups, invitations] = await Promise.all([
        this.#request<{ items: CloudGroup[] }>("GET", "/v1/groups",undefined,generation),
        invitationSource.required?this.#request<{items:GroupInvitation[]}>("GET","/v1/group-invitations",undefined,generation):this.client.request<{ items: GroupInvitation[] }>("GET", "/v1/group-invitations"),
      ]);
      if (generation !== this.#generation || !this.client.connected) return;
      const previous = new Map(this.groups.map(g => [g.id, g.lastMessage?.sequence ?? 0]));
      const roster = groups.items.slice(0, 100);
      this.#removed = new Map(roster.filter(group => {
        try { return this.#removedOnDevice(group); }
        catch { return this.#removed.get(group.id)?.conversationId === group.conversationId; }
      }).map(group => [group.id, group]));
      this.groups = roster.filter(group => !this.#removed.has(group.id)); this.#invitations = invitations.items.slice(0, 100); this.#error = "";
      this.#mutes.sync(this.groups.map(group => this.muteScope(group)));
      this.#invitationCacheSource = invitationSource;
      for (const group of this.groups) if (group.readCursor !== undefined) {
        const local = this.#reads.get(group.id) ?? 0;
        if (local > group.readCursor) {
          this.#reads.set(group.id, group.readCursor); this.markRead(group.id, local, true);
        } else this.#reads.set(group.id, group.readCursor);
      }
      this.#saveReads();
      if(this.#receiptsEnabled)void this.flushReceipts().catch(()=>{});
      if(this.#readUpdates.size)void this.flushReadCursors().catch(()=>{this.#dirty=true;});
      for (const group of this.groups) {
        const message = group.lastMessage;
        if (!message || message.sender === this.client.memberNumber || this.ui.options.isBlocked(message.sender)) continue;
        if (this.isMuted(group.id)) {
          this.options.mutedMessage?.(message.id);
        } else if (this.#baseline && previous.has(group.id) && message.text && message.sequence > (previous.get(group.id) ?? 0) && !this.isArchived(group.id)) {
          this.options.incoming?.(group, message);
        }
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
            const page = await this.#request<CloudPage<CloudMessage>>("GET", `/v1/conversations/${group.conversationId}/messages?limit=40&direction=backward&cursor=0`,undefined,generation);
            if (generation !== this.#generation || !this.client.connected) return;
            this.#previews.set(group.id, { items: page.items.slice(-40), at: Date.now() });
          } catch { /* Keep the last known preview until the next successful refresh. */ }
        }
      };
      await Promise.all([worker(), worker()]);
      if (generation !== this.#generation) return;
      this.#updatedAt = Date.now(); this.render(); this.options.changed();
    } catch (error) {
      if(generation!==this.#generation||!this.client.connected||this.#closed||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin)return;
      if (generation === this.#generation) { this.#dirty = true; this.#error = "Groups could not refresh."; this.render(); }
      throw error;
    }
  }
  render(): void {
    if (!this.client.connected) { this.element.replaceChildren(element("p", { className: "kl-empty-copy", text: "Connect your KikiLink profile to see your groups." })); return; }
    const query = this.#query.trim().normalize("NFKC").toLocaleLowerCase();
    const nodes: Node[] = [];
    if (this.#error) nodes.push(this.ui.button("Retry group list", () => this.refresh(true), "refresh"));
    for (const invite of this.#archivedOnly ? [] : this.#invitations) {
      if (this.ui.options.isBlocked(invite.owner) || (query && !invite.title.toLocaleLowerCase().includes(query))) continue;
      nodes.push(this.invitationCard(invite));
    }
    const sorted = [...this.groups].sort((a, b) => Number(this.isPinned(b.id)) - Number(this.isPinned(a.id)) || this.#time(b) - this.#time(a) || a.title.localeCompare(b.title));
    let matches = 0;
    for (const group of sorted) {
      if(this.isArchived(group.id)!==this.#archivedOnly)continue;
      if (this.#unreadOnly && !this.hasUnread(group.id)) continue;
      const candidates = this.#previews.get(group.id)?.items ?? [];
      const localMessage = (message: CloudMessage) => this.ui.options.isBlocked(message.sender) ? undefined :
        this.options.platformPreview ? this.presentation.project(group, this.#state.generation, message) : message;
      let latest = group.lastMessage ? localMessage(group.lastMessage) : undefined;
      if (!latest && group.lastMessage !== null && (!group.lastMessage || !this.ui.options.isBlocked(group.lastMessage.sender))) {
        for (let index=candidates.length-1; index>=0 && !latest; index--) {
          const candidate=candidates[index];
          if (candidate && (!group.lastMessage || candidate.sequence < group.lastMessage.sequence)) latest=localMessage(candidate);
        }
      }
      if (query && ![group.title, latest?.text ?? "", ...group.members.map(m => String(m.memberNumber))].some(v => v.normalize("NFKC").toLocaleLowerCase().includes(query))) continue;
      if (++matches > this.#limit) continue;
      let saved:ArchivedGroupDraft|undefined;try{saved=this.archive.draft(this.#savedArchiveTarget(group));}catch{}
      const draft = this.#drafts.get(group.id)??(saved?.text||(saved?.audioIds?.length?"Audio":saved?.mediaIds?.length?"Image":""));
      const unread = this.hasUnread(group.id) ? (this.options.platformPreview ? Math.max(1, this.unreadCount(group.id)) : 1) : 0;
      const preview = draft ? `Draft · ${draft}` : latest ? `${latest.sender === this.client.memberNumber ? "You: " : ""}${latest.text ?? "Message removed"}${latest.audioIds?.length ? `${latest.text ? " · " : ""}Audio` : ""}${latest.mediaIds?.length ? `${latest.text ? " · " : ""}${latest.mediaIds.length === 1 ? "Image" : `${latest.mediaIds.length} images`}` : ""}` : this.#previews.has(group.id) ? "No messages yet" : "Open to read messages";
      const pinned = this.isPinned(group.id), muted = this.isMuted(group.id);
      const badgeCount = this.#showUnreadBadges && (!this.options.platformPreview || !muted) ? unread : 0;
      const until = muted && this.options.platformPreview ? this.muteUntil(this.muteScope(group)) : 0;
      const signature = JSON.stringify([group.title, group.avatarId, preview, latest?.createdAt, badgeCount, this.#selected === group.id, group.members, pinned, muted, until]);
      let row = this.#rows.get(group.id);
      if (!row) {
        row = element("button", { type: "button", className: "kl-conversation kl-cloud-group-row" });
        row.addEventListener("click", () => { const current = this.groups.find(g => g.id === group.id); if (current) this.options.select(current); });
        row.dataset.groupId = group.id; this.#rows.set(group.id, row);
      }
      if (row.dataset.signature !== signature) {
        row.dataset.signature = signature; row.dataset.active = String(this.#selected === group.id);
        row.setAttribute("aria-pressed", String(this.#selected === group.id));
        row.setAttribute("aria-label", `${group.title}${pinned ? ", pinned" : ""}${muted ? ", muted" : ""}${badgeCount ? ", unread messages" : ""}`);
        const avatarKey = group.avatarId ?? (this.options.platformPreview ? "group" : `initials:${initials(group.title)}`);
        let avatar = row.querySelector<HTMLElement>(".kl-group-inbox-avatar");
        if (!avatar || avatar.dataset.avatarKey !== avatarKey) {
          avatar = element("span", { className: "kl-avatar kl-group-inbox-avatar", ariaHidden: "true", text: group.avatarId || this.options.platformPreview ? "" : initials(group.title) });
          avatar.dataset.avatarKey = avatarKey;
          if (group.avatarId) avatar.append(this.ui.options.image(group.avatarId, "Group avatar", "kl-social-avatar-image", true));
          if (!this.options.platformPreview || !group.avatarId) avatar.append(kikiIcon("users", "kl-group-inbox-mark"));
        }
        const snippet = this.options.platformPreview && draft
          ? element("span", { className: "kl-group-inbox-preview" }, element("span", { className: "kl-group-inbox-draft-label", text: "Draft:" }), ` ${draft.slice(0, 154)}`)
          : element("span", { className: "kl-group-inbox-preview", text: preview.slice(0, 160) });
        const copy = element("span", { className: "kl-group-inbox-copy" }, element("strong", { text: group.title, title: group.title }), snippet);
        copy.dataset.draft = String(Boolean(draft));
        const meta = element("span", { className: "kl-group-inbox-meta" });
        for (const [show, icon, label] of [[pinned, "pin", "Pinned"], [muted, "muted", "Muted"]] as const) if (show) {
          const flag = element("span", { className: "kl-group-inbox-status", title: label, ariaLabel: label }, kikiIcon(icon));
          if (icon === "muted" && until === -1) flag.title = "Muted until you turn it back on";
          if (icon === "muted" && until > 0) bindClockTitle(flag, until, "muted-date-time");
          meta.append(flag);
        }
        if (this.options.platformPreview) {
          row.title = latest ? new Date(latest.createdAt).toLocaleString() : "";
          if (badgeCount) meta.append(element("span", { className: "kl-unread", ariaLabel: `${badgeCount} unread`, text: badgeCount > 99 ? "99+" : String(badgeCount) }));
          if (meta.childElementCount) copy.append(meta);
          row.replaceChildren(avatar, copy);
        } else {
          if (latest) meta.append(timeLabel(latest.createdAt));
          if (badgeCount) meta.append(element("span", { className: "kl-group-unread-dot", ariaLabel: "Unread messages" }));
          row.replaceChildren(avatar, copy, meta);
        }
      }
      nodes.push(this.options.platformPreview ? this.#rowFrame(row, group.title) : row);
    }
    for (const id of this.#rows.keys()) if (!this.groups.some(g => g.id === id)) this.#rows.delete(id);
    if (matches > this.#limit) nodes.push(pageAction(this.ui.button("Load more groups", async () => {
      this.#limit += 20; this.#updatedAt = 0; this.render(); await this.refresh();
    })));
    if (!nodes.length) nodes.push(this.options.platformPreview ? this.#empty(Boolean(query || this.#unreadOnly)) :
      element("p", { className: "kl-empty-copy", text: query ? "No matching groups." : this.#archivedOnly ? "No archived groups." : this.#unreadOnly ? "No unread groups." : "Your groups will appear here. Use + to create one." }));
    nodes.push(this.management.surface("inbox",this.ui,()=>!this.#closed&&this.client.connected&&this.element.isConnected,async()=>{await this.refresh(true);await this.options.inviteChanged();},e=>['accept','decline'].includes(e.intent.target.action)),this.#menu.element);
    const focus = (this.element.getRootNode() as ShadowRoot | Document).activeElement;
    reconcileChildren(this.element, nodes);
    if (focus instanceof HTMLElement && this.element.contains(focus)) focus.focus({ preventScroll: true });
  }
  #rowFrame(row: HTMLButtonElement, title: string): HTMLElement {
    let frame = this.#rowFrames.get(row);
    if (!frame) {
      const trigger = this.ui.button("Conversation options", () => this.#menu.open(row, trigger), "more", "kl-icon-button kl-chat-row-options", false);
      trigger.querySelector("span")?.remove();
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", "false");
      frame = element("article", { className: "kl-chat-list-row" }, row, trigger);
      this.#rowFrames.set(row, frame);
    }
    frame.lastElementChild?.setAttribute("aria-label", `Conversation options for ${title}`);
    return frame;
  }
  #empty(filtered: boolean): HTMLElement {
    const empty = element("div", { className: "kl-chat-list-empty kl-group-list-empty" },
      element("h2", { text: "No conversations here" }),
      element("p", { text: filtered ? "Try another name or reset your filters." : this.#archivedOnly ? "Archived conversations will appear here." : "No conversations yet." }));
    if (filtered && this.options.resetFilters) empty.append(this.ui.button("Reset filters", this.options.resetFilters, undefined, "kl-text-button", false));
    if (!filtered && !this.#archivedOnly && this.options.createGroup) empty.append(this.ui.button("Create group", this.options.createGroup, undefined, "kl-text-button", false));
    return empty;
  }
  reviewInvitation(item: MailItem, options: GroupInvitationReviewOptions): HTMLElement | undefined {
    if (!options.current() || !item.pending || item.kind !== 'group_invitation' || item.targetType !== 'group') return;
    const invite = this.pendingInvitation(item.targetId, item.groupManagementSource);
    if (!invite || invite.invitedAt !== item.groupInvitedAt || this.ui.options.isBlocked(invite.owner)) return;
    return this.invitationCard(invite, options);
  }
  #invitationEntry(invite: GroupInvitation, action: 'accept' | 'decline', source: GroupManagementSource): GroupManagementDraft {
    return this.management.capture(`invitation:${invite.id}`, { action, groupId: invite.id,
      ...(invite.invitedAt !== undefined ? { invitedAt: invite.invitedAt } : {}),
      label: `${invite.title} · ${action} invitation` }, source);
  }
  invitationCard(invite:GroupInvitation, review?: GroupInvitationReviewOptions):HTMLElement {
    const card=element('section',{className:review ? 'kl-group-invitation kl-group-invitation-review-card' : 'kl-group-invitation'});
    if (review) {
      const summary = element('div', { className: 'kl-group-invitation-review-summary' },
        review.details?.icon ?? element('span', { className: 'kl-group-invitation-review-icon', ariaHidden: 'true' }, kikiIcon('users')),
        element('h3', { text: invite.title }), element('p', { text: review.inviter ? `${review.inviter} invited you` : `Invitation from #${invite.owner}` }),
        review.details?.count);
      card.append(element('div', { className: 'kl-group-invitation-review-body' }, summary, review.details?.roster));
    }
    else card.append(element('strong',{text:invite.title}),element('small',{text:`Invitation from #${invite.owner}`}));
    const source=this.managementSource;
    if (review) return this.#reviewInvitationCard(card, invite, source, review);
    for(const [action,label,icon]of [['accept','Accept','check'],['decline','Decline','close']] as const){
      const entry=this.#invitationEntry(invite,action,source);
      const control=this.ui.button(label,async()=>{
        if(entry.intent.pending)return;
        try{if(await this.management.perform(entry,()=>!this.#closed&&card.isConnected&&this.#invitations.includes(invite))){await this.refresh(true);await this.options.inviteChanged();}}
        finally{this.render();}
      },icon);
      control.disabled=entry.intent.held||!!entry.intent.pending;card.append(control);
    }
    return card;
  }
  #reviewInvitationCard(card: HTMLElement, invite: GroupInvitation, source: GroupManagementSource, options: GroupInvitationReviewOptions): HTMLElement {
    const epoch = this.#generation;
    const controls = element('div', { className: 'kl-cloud-actions' });
    const status = element('p', { className: 'kl-empty-copy', role: 'status' });
    card.firstElementChild!.append(status);
    card.append(controls);
    const entries = (['accept', 'decline'] as const).map(action => this.#invitationEntry(invite, action, source));
    const responseKey = JSON.stringify([source.required, source.generation, invite.id, invite.invitedAt]);
    let busy = false;
    let confirmed = this.#confirmedInvitationResponses.get(responseKey);
    const current = () => card.isConnected && options.current() && epoch === this.#generation &&
      this.client.connected && this.#canObserve() && !this.ui.options.isBlocked(invite.owner) &&
      source.required === this.#managementSource.required && source.generation === this.#managementSource.generation;
    const matches = () => {
      const pending = this.pendingInvitation(invite.id, source);
      return pending !== undefined && pending.invitedAt === invite.invitedAt;
    };
    const originalCurrent = () => {
      const replacement = this.pendingInvitation(invite.id, source);
      return current() && (!replacement || replacement.invitedAt === invite.invitedAt);
    };
    const complete = async () => {
      // Wait out an earlier list request before requiring the post-action snapshot.
      if (this.#task) await this.#task;
      if (!current()) return;
      await this.refresh(true);
      if (!current()) return;
      await this.options.inviteChanged();
      if (!current()) return;
      if (confirmed?.action === 'accept' && !this.groups.some(group => group.id === invite.id))
        throw new Error('This group is no longer available. Refresh the invitation.');
      this.#confirmedInvitationResponses.delete(responseKey);
      if (confirmed?.action === 'accept') options.accepted(confirmed.title);
      else options.declined();
    };
    const run = async (entry?: GroupManagementDraft) => {
      if (busy || !current()) return;
      if (entry && (entry.intent.target.invitedAt !== invite.invitedAt || !originalCurrent() || !entry.intent.pending && !matches())) {
        status.textContent = 'This group invitation changed. Reopen it before responding.';
        render();
        return;
      }
      busy = true;
      status.textContent = '';
      render();
      try {
        if (entry) {
          const latest = this.pendingInvitation(invite.id, source);
          const title = latest && latest.invitedAt === invite.invitedAt ? latest.title : undefined;
          if (!await this.management.perform(entry, originalCurrent)) return;
          const action = entry.intent.target.action;
          if (action !== 'accept' && action !== 'decline') return;
          confirmed = { action, title };
          this.#confirmedInvitationResponses.set(responseKey, confirmed);
          while (this.#confirmedInvitationResponses.size > 100)
            this.#confirmedInvitationResponses.delete(this.#confirmedInvitationResponses.keys().next().value!);
        }
        await complete();
      } catch (error) {
        if (current()) status.textContent = error instanceof Error ? error.message : 'Could not confirm the invitation. Retry when connected.';
      } finally {
        busy = false;
        if (current()) render();
      }
    };
    const render = () => {
      card.setAttribute('aria-busy', String(busy));
      card.toggleAttribute('data-invitation-response-pending', busy || confirmed !== undefined || entries.some(entry => !!entry.intent.pending));
      controls.replaceChildren();
      if (confirmed) {
        const retry = this.ui.button('Retry refresh', () => run(), 'refresh');
        retry.disabled = busy;
        controls.append(retry);
        return;
      }
      const retained = entries.find(entry => entry.intent.pending);
      if (retained) {
        const sameInvitation = retained.intent.target.invitedAt === invite.invitedAt;
        if (!status.textContent) status.textContent = retained.intent.notice;
        if (!sameInvitation) status.textContent = 'An earlier response is kept in Groups. Review it before responding to this invitation.';
        const retry = this.ui.button('Retry original group change', () => run(retained), 'refresh');
        retry.disabled = busy || retained.intent.busy || retained.intent.held || !sameInvitation;
        controls.append(retry);
        return;
      }
      for (const [index, label] of [[1, 'Decline'], [0, 'Accept invitation']] as const) {
        const entry = entries[index]!;
        const control = this.ui.button(label, () => run(entry), undefined, 'kl-text-button');
        if (index === 0) control.classList.add('kl-text-button--primary');
        control.disabled = busy || entry.intent.held;
        controls.append(control);
      }
    };
    render();
    return card;
  }
  #time(group: CloudGroup): number { return group.lastMessage?.createdAt ?? this.#previews.get(group.id)?.items.at(-1)?.createdAt ?? group.createdAt; }
  clear(): void { this.presentation.clearSession(); this.#removed.clear(); this.management.clear();this.#confirmedInvitationResponses.clear();this.#menu.close(false); this.#baseline = false; this.#generation++;this.#ready=false;this.#recoveryTask=undefined;this.#receiptTask=undefined;this.#readTask=undefined; this.groups = []; this.#mutes.sync([]); this.#invitations = []; this.#previews.clear(); this.#drafts.clear(); this.#rows.clear(); this.#task = undefined; this.#dirty = true; this.#selected = undefined; this.render(); this.options.changed(); }
  destroy(): void { this.#closed=true;this.clear(); this.#mutes.destroy(); window.removeEventListener('storage', this.#preferencesChanged); this.#menu.destroy(); this.element.replaceChildren(); }
}
