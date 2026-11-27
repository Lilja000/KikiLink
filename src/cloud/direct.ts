import { CloudError } from "./client";
import type { CommunityService } from "./community";
import type { ChatService } from "../modules/link-chat/chat-service";
import type { KeyValueStorage } from "../core/settings";
import type { LinkMessage, MessageMention } from "../core/types";
import { archiveHistoryPage, archiveWait, type CloudHistoryArchiveAccess } from './history-archive-model';

interface Envelope {
  id: string; clientMessageId: string; sequence: number; sender: number; recipient: number;
  createdAt: number; text?: string; mediaIds?: string[]; audioIds?: string[]; roomName?: string; state: "sent" | "delivered" | "revoked" | "expired";
  readCursor?: number; mentions?: MessageMention[];
}
interface HistoryPage { items: Envelope[]; cursor: number; nextCursor: number | null; readCursor: number; peerReadCursor: number }
interface HistoryState { loaded: boolean; cursor: number; newest: number; hasOlder: boolean; error: string; task?: Promise<void> | undefined }
export type DirectMessageLocation =
  | { kind: "found"; messages: LinkMessage[] }
  | { kind: "more"; cursor: number }
  | { kind: "unavailable" | "cancelled" };
interface Outgoing { peer: number; name: string; localId: string; clientMessageId: string; text: string; mediaIds?: string[]; audioIds?: string[]; createdAt: number; roomName?: string; serverId?: string; failed?: boolean; recoveryHeld?: boolean }
interface DirectState { recoveryGeneration?: string; inbox: number; receipts: number; outgoing: Outgoing[]; cloudPeers: number[]; reads: Record<string, number>; historyClearedAt?: number; historyHidden?: Record<string, number> }
const validMediaIds = (ids: unknown): ids is string[] => Array.isArray(ids) && ids.length <= 4 &&
  ids.every(id => typeof id === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(id)) && new Set(ids).size === ids.length;
const empty = (): DirectState => ({ inbox: 0, receipts: 0, outgoing: [], cloudPeers: [], reads: {} });

/** Delivery for confirmed Cloud friends and mutually matched peers, separate from the historical chat import path. */
export class CloudDirect {
  #state = empty();
  #key: string;
  #closed = false;
  #historyEpoch = 0;
  #recoveryEpoch = 0;
  #histories = new Map<number, HistoryState>();
  #task: Promise<void> | undefined;
  #unsubscribers: Array<() => void> = [];
  #sending = new Map<string, Promise<void>>();
  #preparing = new Set<string>();
  #wasEnabled = false;
  #readTimer: ReturnType<typeof setTimeout> | undefined;
  #readTask: Promise<void> | undefined;
  #receiptTask: Promise<boolean> | undefined;
  #receiptAgain = false;
  #receiptTimer: ReturnType<typeof setTimeout> | undefined;
  #syncAgain = false;
  #syncTimer: ReturnType<typeof setTimeout> | undefined;
  #retryTimer: ReturnType<typeof setTimeout> | undefined;
  #retryAttempt = 0;
  #retryGeneration = 0;
  #retryNotBefore = 0;
  constructor(readonly community: CommunityService, readonly chat: ChatService, readonly storage: KeyValueStorage,
    readonly options: { sendingEnabled?(): boolean; active(peer: number): boolean; changed(peer?: number, message?: LinkMessage): void; incoming(message: LinkMessage): void }) {
    this.#key = `kikilink:cloud:direct-queue:${community.client.memberNumber}:v1`;
    try {
      const state: DirectState = JSON.parse(storage.getItem(this.#key) ?? "null");
      if (state && Number.isSafeInteger(state.inbox) && state.inbox >= 0 && Number.isSafeInteger(state.receipts) && state.receipts >= 0 && Array.isArray(state.outgoing))
        this.#state = { ...state, reads: Object.fromEntries(Object.entries(state.reads ?? {}).filter(([key, value]) => /^direct:[1-9]\d*$/u.test(key) && Number.isSafeInteger(value) && value >= 0).slice(-2000)), cloudPeers: Array.isArray(state.cloudPeers) ? state.cloudPeers.filter(n => Number.isSafeInteger(n) && n > 0).slice(-2000) : [], outgoing: state.outgoing.filter(m => Number.isSafeInteger(m.peer) && m.peer > 0 && typeof m.text === "string" && m.text.length <= 4000 && (m.mediaIds === undefined || validMediaIds(m.mediaIds)) && (m.audioIds === undefined || validMediaIds(m.audioIds) && m.audioIds.length <= 1) && typeof m.clientMessageId === "string" && /^[a-f0-9-]{36}$/u.test(m.clientMessageId)).slice(0, 100) };
    } catch { /* A malformed old queue cannot be sent. */ }
    this.#unsubscribers.push(community.client.subscribe(kind => {
      if (kind === "session") this.#recoveryEpoch++;
      if (kind === "session" || kind === "relationships" || kind === "media-invalidated") {
        this.#historyEpoch++;
        for (const peer of this.#histories.keys()) this.chat.releaseCloudHistory(peer);
        this.#histories.clear();
      }
      if (["session", "ready", "direct", "read"].includes(kind)) { this.#syncAgain = true; void this.sync().catch(() => {}); }
    }), community.subscribe(() => {
      const enabled = community.supported && community.directEnabled;
      if (enabled && !this.#wasEnabled) void this.sync().catch(() => {});
      this.#wasEnabled = enabled;
    }));
    const resume = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      this.#syncAgain = true; void this.sync().catch(() => {});
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", resume);
      this.#unsubscribers.push(() => window.removeEventListener("online", resume));
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", resume);
      this.#unsubscribers.push(() => document.removeEventListener("visibilitychange", resume));
    }
    chat.onCloudRead = (peer, sequence, generation) => {
      if (!community.supported || !community.directEnabled || this.#closed) return;
      this.#prepareRecovery();
      if (generation !== this.#state.recoveryGeneration) return;
      const scope = `direct:${peer}`;
      this.#state.reads[scope] = Math.max(this.#state.reads[scope] ?? 0, sequence);
      this.#save();
      // Bound batching latency even while an active chat keeps receiving messages.
      if (this.#readTimer !== undefined) return;
      this.#readTimer = setTimeout(() => { this.#readTimer = undefined; void this.#flushReads().catch(() => {}); }, 200);
    };
  }
  async flushReadCursors(): Promise<void> {
    await this.#flushReads();
    if (Object.keys(this.#state.reads).length) throw new Error("Read state is saved on this device and will sync when connected.");
  }
  #flushReads(): Promise<void> {
    if (this.#readTask) return this.#readTask;
    const task = (async () => {
      if (this.#closed || !this.community.client.connected || !this.community.directEnabled || Date.now() < this.#retryNotBefore) return;
      this.#prepareRecovery();
      const epoch = this.#recoveryEpoch;
      for (let page = 0; page < 20; page++) {
        if (Date.now() < this.#retryNotBefore) return;
        const items = Object.entries(this.#state.reads).slice(0, 100).map(([scope, cursor]) => ({ scope, cursor }));
        if (!items.length) return;
        await this.#request("PUT", "/v1/read-cursors", { items });
        if (this.#closed || epoch !== this.#recoveryEpoch) return;
        for (const { scope, cursor } of items) if (this.#state.reads[scope] === cursor) delete this.#state.reads[scope];
        this.#save();
      }
    })().catch(error => { this.#scheduleRetry(error); throw error; })
      .finally(() => { this.#readTask = undefined; });
    this.#readTask = task; return task;
  }
  retryable(localId: string): boolean { return this.#state.outgoing.some(m => m.localId === localId && (!m.serverId || m.recoveryHeld)); }
  async stopRetrying(localId: string): Promise<void> {
    const queued = this.#state.outgoing.find(m => m.localId === localId && (!m.serverId || m.recoveryHeld)); if (!queued) return;
    this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued); this.#save();
    const updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: "failed", deliveryError: "Local retries stopped. A message already accepted by the server may still arrive." });
    this.#changed(queued.peer, updated);
  }
  clearPending(peer?: number): void { this.#state.outgoing = peer === undefined ? [] : this.#state.outgoing.filter(m => m.peer !== peer); this.#save(); }
  #prepareRecovery(): void {
    const recovery = this.community.directRecovery;
    if (!recovery) {
      if (this.#state.recoveryGeneration) throw new Error("Cloud recovery state is unavailable. Reconnect before syncing Direct.");
      return;
    }
    if (!/^[a-f0-9]{32}$/u.test(recovery.generation) || typeof recovery.restored !== "boolean") throw new Error("Invalid Cloud recovery generation.");
    const original = this.storage.getItem(this.#key);
    const persisted = original === null ? undefined : JSON.parse(original) as DirectState;
    if (persisted?.recoveryGeneration !== this.#state.recoveryGeneration)
      throw new Error("Direct recovery state changed in another tab. Reload before syncing.");
    if (this.#state.recoveryGeneration === recovery.generation) { this.chat.cloudReadGeneration = recovery.generation; return; }
    const reset = !!this.#state.recoveryGeneration || recovery.restored;
    if (reset && original !== null) {
      if (original.length > 2 * 1024 * 1024) throw new Error("Direct recovery state exceeds the preservation limit.");
      const key = `${this.#key}:recovery:${recovery.generation}`, previous = this.storage.getItem(key);
      if (previous !== null && previous !== original) throw new Error("A different Direct recovery original already exists. Reload before syncing.");
      if (previous === null) this.storage.setItem(key, original);
      if (this.storage.getItem(key) !== original) throw new Error("Could not preserve the original Direct queue.");
    }
    // One active-key write commits the new cursors and held sends together. The
    // exact old bytes remain separately available; no chat rows or drafts clear.
    const next: DirectState = { ...this.#state, recoveryGeneration: recovery.generation,
      ...(reset ? { inbox: 0, receipts: 0, reads: {}, outgoing: this.#state.outgoing.map(m => ({ ...m, recoveryHeld: true })) } : {}) };
    const bytes = JSON.stringify(next);
    if (this.storage.getItem(this.#key) !== original) throw new Error("Direct queue changed during recovery. Reload before syncing.");
    this.storage.setItem(this.#key, bytes);
    if (this.storage.getItem(this.#key) !== bytes) throw new Error("Direct recovery could not be confirmed. Reload before syncing.");
    this.#state = next; this.#recoveryEpoch++; this.#historyEpoch++;
    for (const peer of this.#histories.keys()) this.chat.releaseCloudHistory(peer);
    this.#histories.clear(); this.chat.cloudReadGeneration = recovery.generation;
  }
  async #request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const epoch = this.#recoveryEpoch, generation = this.community.directRecovery?.generation;
    if (generation) {
      if (method === "GET") path += `${path.includes("?") ? "&" : "?"}recoveryGeneration=${generation}`;
      else body = { ...(body as Record<string, unknown>), recoveryGeneration: generation };
    }
    const result = await this.community.client.request<T>(method, path, body);
    if (this.#closed || epoch !== this.#recoveryEpoch || generation !== this.community.directRecovery?.generation)
      throw new CloudError("session_changed");
    return result;
  }
  #save(): void {
    const saved = this.storage.getItem(this.#key);
    if ((saved === null ? undefined : (JSON.parse(saved) as DirectState)?.recoveryGeneration) !== this.#state.recoveryGeneration)
      throw new Error("Direct recovery changed in another tab. Reload before syncing.");
    this.storage.setItem(this.#key, JSON.stringify(this.#state));
  }
  #changed(peer?: number, message?: LinkMessage): void {
    try { this.options.changed(peer, message); } catch { /* View failures cannot change delivery acceptance. */ }
  }
  #incoming(message: LinkMessage): void {
    try { this.options.incoming(message); } catch { /* Notifications are independent of durable inbox delivery. */ }
  }
  historyState(peer: number): { available: boolean; loaded: boolean; hasOlder: boolean; loading: boolean; error: string } {
    const state = this.#histories.get(peer);
    return { available: !!this.community.directHistory && this.canUse(peer), loaded: !!state?.loaded,
      hasOlder: state?.hasOlder ?? true, loading: !!state?.task, error: state?.error ?? "" };
  }
  /** Read-only export access: no capture, acknowledgements, reads, queue updates or history cache. */
  createHistoryArchiveAccess(peer:number,peerName=this.community.adapter.getMemberName(peer)):CloudHistoryArchiveAccess {
    const client=this.community.client,owner=client.memberNumber,epoch=this.#historyEpoch,guard=this.chat.cloudHistoryGuard(peer);
    if(!Number.isSafeInteger(peer)||peer<=0||peer===owner||!this.historyState(peer).available||typeof peerName!=='string'||peerName.length>1000)
      throw new Error('Cloud history is unavailable for this direct chat.');
    const boundary=()=>{
      const raw=this.storage.getItem(this.#key);
      if(raw!==null&&raw.length>2*1024*1024)throw new Error('Saved Cloud history policy is unsupported.');
      const saved=raw===null?{}:JSON.parse(raw);
      const read=(value:DirectState|Partial<DirectState>)=>{
        if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Saved Cloud history policy is unsupported.');
        const hidden=value.historyHidden;
        if(hidden!==undefined&&(!hidden||typeof hidden!=='object'||Array.isArray(hidden)))throw new Error('Saved Cloud history policy is unsupported.');
        const times=[value.historyClearedAt===undefined?0:value.historyClearedAt,hidden?.[peer]===undefined?0:hidden[peer]!];
        if(times.some(t=>!Number.isSafeInteger(t)||t<0||t>8640000000000000))throw new Error('Saved Cloud history policy is unsupported.');
        return Math.max(...times);
      };
      return Math.max(read(this.#state),read(saved),this.chat.cloudArchiveCutoff(peer));
    };
    const cutoff=boundary();
    const current=()=>{try{return !this.#closed&&epoch===this.#historyEpoch&&guard()&&client.memberNumber===owner&&(this.community.adapter.getOwnMemberNumber?.()??owner)===owner&&this.historyState(peer).available&&boundary()===cutoff;}catch{return false;}};
    const community=this.community;
    return {owner,peer,peerName,cutoff,client,current,get recoveryGeneration(){return community.directRecovery?.generation??null;},read:async(cursor,active,signal)=>{
      const check=()=>{if(!current()||!active()||signal.aborted||!client.connected)throw new Error('Connect to Cloud and review this chat again.');};
      check();if(!Number.isSafeInteger(cursor)||cursor<0||cursor>=Number.MAX_SAFE_INTEGER)throw new Error('Invalid Cloud history boundary.');
      const value=await archiveWait(this.#request('GET',`/v1/direct/${peer}/messages?limit=40&direction=backward&cursor=${cursor}`),signal);
      check();return archiveHistoryPage(value,owner,peer,cursor);
    }};
  }
  forgetHistory(peer?: number): void {
    if (peer === undefined) this.#state.historyClearedAt = Date.now();
    else this.#state.historyHidden = { ...this.#state.historyHidden, [peer]: Date.now() };
    this.#save(); this.#historyEpoch++;
    for (const member of this.#histories.keys()) this.chat.releaseCloudHistory(member);
    this.#histories.clear();
  }
  releaseHistory(peer: number): void {
    this.#histories.delete(peer); this.chat.releaseCloudHistory(peer);
  }
  #historyCurrent(peer?: number): () => boolean {
    const epoch = this.#historyEpoch, generation = this.community.directRecovery?.generation, guard = this.chat.cloudHistoryGuard(peer);
    return () => !this.#closed && epoch === this.#historyEpoch && generation === this.community.directRecovery?.generation && this.community.client.connected && guard();
  }
  #validateEnvelope(envelope: Envelope): void {
    if (!Number.isSafeInteger(envelope.sequence) || envelope.sequence <= 0 ||
      !Number.isSafeInteger(envelope.createdAt) || envelope.createdAt <= 0 || typeof envelope.text !== "string" ||
      !validMediaIds([envelope.id]) || !validMediaIds([envelope.clientMessageId]) || !['sent', 'delivered'].includes(envelope.state) ||
      envelope.mediaIds !== undefined && !validMediaIds(envelope.mediaIds) || envelope.audioIds !== undefined && (!validMediaIds(envelope.audioIds) || envelope.audioIds.length > 1))
      throw new Error("Invalid Direct history envelope");
  }
  /** Read-only context: scanning never imports old unread rows, acknowledges or moves a read cursor. */
  async locateMessage(peer: number, id: string, current: () => boolean, cursor = 0): Promise<DirectMessageLocation> {
    if (!validMediaIds([id]) || !Number.isSafeInteger(cursor) || cursor < 0 || !this.historyState(peer).available)
      return { kind: "unavailable" };
    const guard = this.#historyCurrent(peer), valid = () => guard() && current() && this.canUse(peer);
    if (!valid()) return { kind: "cancelled" };
    const cached = cursor === 0 ? (await this.chat.getMessages(peer, Number.MAX_SAFE_INTEGER)).find(m => m.cloudId === id) : undefined;
    if (!valid()) return { kind: "cancelled" };
    const hinted = cached?.cloudGeneration === this.community.directRecovery?.generation && !!cached?.cloudSequence && Number.isSafeInteger(cached.cloudSequence + 1);
    if (hinted) cursor = cached!.cloudSequence! + 1;
    const hiddenAt = Math.max(this.#state.historyClearedAt ?? 0, this.#state.historyHidden?.[peer] ?? 0);
    for (let n = 0; n < 10; n++) {
      let page: HistoryPage;
      try { page = await this.#request<HistoryPage>("GET", `/v1/direct/${peer}/messages?limit=40&direction=backward&cursor=${cursor}`); }
      catch (error) {
        if (!valid()) return { kind: "cancelled" };
        if (error instanceof CloudError && [403, 404, 410].includes(error.status)) return { kind: "unavailable" };
        throw error;
      }
      if (!valid()) return { kind: "cancelled" };
      this.#validatePage(page, cursor, false, peer);
      const target = page.items.find(e => e.id === id);
      if (target) {
        if (target.createdAt <= hiddenAt) return { kind: "unavailable" };
        const messages = page.items.filter(e => e.createdAt > hiddenAt).map((e): LinkMessage => {
          const outgoing = e.sender === this.community.client.memberNumber;
          return { id: outgoing ? `cloud-out:${e.clientMessageId}` : `cloud-in:${e.id}`,
            direction: outgoing ? "outgoing" : "incoming", peerNumber: peer, peerName: this.community.adapter.getMemberName(peer),
            content: e.text!, sentAt: e.createdAt, includeRoom: !!e.roomName, ...(e.roomName ? { roomName: e.roomName } : {}),
            read: outgoing || e.sequence <= page.readCursor, cloudId: e.id, cloudSequence: e.sequence, ...(this.community.directRecovery ? { cloudGeneration: this.community.directRecovery.generation } : {}), clientMessageId: e.clientMessageId,
            ...(e.mentions ? { cloudMentions: e.mentions } : {}), ...(e.mediaIds ? { cloudMediaIds: e.mediaIds } : {}),
            ...(e.audioIds ? { cloudAudioIds: e.audioIds } : {}),
            ...(outgoing ? { delivery: e.state === "sent" ? "sent" : e.sequence <= page.peerReadCursor ? "read" : "delivered" } : {}),
          };
        });
        const visible = this.chat.presentMessages(messages);
        return visible.some(message => message.cloudId === id) ? { kind: "found", messages: visible } : { kind: "unavailable" };
      }
      if (hinted || page.nextCursor === null) return { kind: "unavailable" };
      cursor = page.nextCursor;
    }
    // A finite batch is not proof of deletion: let the user continue the same search.
    return { kind: "more", cursor };
  }
  async #restore(envelope: Envelope, readCursor: number, peerReadCursor: number, current: () => boolean, retain = false) {
    const own = this.community.client.memberNumber, outgoing = envelope.sender === own;
    const peer = outgoing ? envelope.recipient : envelope.sender;
    if (![envelope.sender, envelope.recipient].includes(own) || envelope.sender === envelope.recipient ||
      !Number.isSafeInteger(peer) || peer <= 0 || !Number.isSafeInteger(envelope.sequence) || envelope.sequence <= 0 ||
      !Number.isSafeInteger(envelope.createdAt) || envelope.createdAt <= 0 || typeof envelope.text !== "string" ||
      !validMediaIds([envelope.id]) || !validMediaIds([envelope.clientMessageId]) || !['sent', 'delivered'].includes(envelope.state) ||
      envelope.mediaIds !== undefined && !validMediaIds(envelope.mediaIds) || envelope.audioIds !== undefined && (!validMediaIds(envelope.audioIds) || envelope.audioIds.length > 1))
      throw new Error("Invalid Direct history envelope");
    if (!current() || this.#restricted(peer) || envelope.createdAt <= Math.max(this.#state.historyClearedAt ?? 0, this.#state.historyHidden?.[peer] ?? 0)) return;
    const delivery = envelope.state === "delivered" ? envelope.sequence <= peerReadCursor ? "read" : "delivered" : "sent";
    const result = await this.chat.restoreCloud({ direction: outgoing ? "outgoing" : "incoming", peerNumber: peer,
      peerName: this.community.adapter.getMemberName(peer), content: envelope.text, sentAt: envelope.createdAt,
      includeRoom: !!envelope.roomName, ...(envelope.roomName ? { roomName: envelope.roomName } : {}) }, {
      id: outgoing ? `cloud-out:${envelope.clientMessageId}` : `cloud-in:${envelope.id}`,
      cloudId: envelope.id, cloudSequence: envelope.sequence, ...(this.community.directRecovery ? { cloudGeneration: this.community.directRecovery.generation } : {}), clientMessageId: envelope.clientMessageId, ...(envelope.mentions ? { cloudMentions: envelope.mentions } : {}),
      ...(envelope.mediaIds?.length ? { cloudMediaIds: [...envelope.mediaIds] } : {}),
      ...(envelope.audioIds?.length ? { cloudAudioIds: [...envelope.audioIds] } : {}),
      ...(outgoing ? { delivery, deliveryError: "" } : {}),
    }, outgoing || envelope.sequence <= readCursor, current, retain);
    if (!current() || !result) return;
    const queued = outgoing && this.#state.outgoing.find(m => m.peer === peer && m.clientMessageId === envelope.clientMessageId);
    if (queued) {
      queued.serverId = envelope.id; delete queued.recoveryHeld; queued.failed = false;
      if (envelope.state === "delivered") this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued);
      this.#save();
    }
    return result;
  }
  loadHistory(peer: number, older = false): Promise<void> {
    if (!this.historyState(peer).available) return Promise.resolve();
    try { this.#prepareRecovery(); } catch (error) { return Promise.reject(error); }
    const state = this.#histories.get(peer) ?? { loaded: false, cursor: 0, newest: 0, hasOlder: true, error: "" };
    this.#histories.set(peer, state);
    if (state.task) return state.task;
    if (older && state.loaded && !state.hasOlder) return Promise.resolve();
    const guard = this.#historyCurrent(peer), current = () => guard() && this.#histories.get(peer) === state;
    const cursor = older && state.loaded ? state.cursor : 0;
    const task = (async () => {
      state.error = "";
      const page = await this.#request<HistoryPage>("GET", `/v1/direct/${peer}/messages?limit=40&direction=backward&cursor=${cursor}`);
      if (!current()) return;
      this.#validatePage(page, cursor, false, peer);
      for (const envelope of page.items) await this.#restore(envelope, page.readCursor, page.peerReadCursor, current, true);
      if (!current()) return;
      // Delivery follows successful capture; history reads alone never produce read receipts.
      const incoming = page.items.filter(e => e.recipient === this.community.client.memberNumber && e.state === "sent");
      if (incoming.length) await this.#request("POST", "/v1/direct/acknowledge", { ids: incoming.map(e => e.id) });
      if (!current()) return;
      state.cursor = page.cursor; state.newest = Math.max(state.newest, ...page.items.map(e => e.sequence));
      state.hasOlder = page.nextCursor !== null; state.loaded = true;
    })().catch(error => {
      if (!current()) return;
      state.error = "Cloud history could not load. Retry when connected.";
      throw error;
    }).finally(() => { if (state.task === task) state.task = undefined; });
    state.task = task; return task;
  }
  #validatePage(page: HistoryPage, cursor: number, forward: boolean, peer: number): void {
    const own = this.community.client.memberNumber;
    if (!Array.isArray(page.items) || page.items.length > 40 || !Number.isSafeInteger(page.cursor) || page.cursor < 0 ||
      !Number.isSafeInteger(page.readCursor) || page.readCursor < 0 || !Number.isSafeInteger(page.peerReadCursor) || page.peerReadCursor < 0 ||
      page.items.some((e, i) => !(e.sender === own && e.recipient === peer || e.sender === peer && e.recipient === own) ||
        i > 0 && e.sequence <= page.items[i - 1]!.sequence || (forward ? e.sequence <= cursor : cursor > 0 && e.sequence >= cursor)) ||
      page.cursor !== (page.items.length ? (forward ? page.items.at(-1)!.sequence : page.items[0]!.sequence) : cursor) ||
      page.nextCursor !== null && (page.nextCursor !== page.cursor || !page.items.length)) throw new Error("Invalid Direct history page");
    for (const envelope of page.items) this.#validateEnvelope(envelope);
  }
  async #restoreConversations(): Promise<void> {
    if (!this.community.directHistory) return;
    const current = this.#historyCurrent();
    let cursor = 0;
    for (let n = 0; n < 50 && current(); n++) {
      const page = await this.#request<{ items: Array<{ peer: number; latest: Envelope; readCursor: number; peerReadCursor: number }>; nextCursor: number | null }>("GET", `/v1/direct/conversations?limit=40&cursor=${cursor}`);
      if (!current()) return;
      if (page.nextCursor !== null && (!Number.isSafeInteger(page.nextCursor) || page.nextCursor <= cursor)) throw new Error("Direct conversation pagination did not advance");
      for (const item of page.items) {
        const guard = this.#historyCurrent(item.peer), valid = () => current() && guard();
        if (!(item.latest.sender === item.peer || item.latest.recipient === item.peer)) throw new Error("Invalid Direct conversation");
        const result = await this.#restore(item.latest, item.readCursor, item.peerReadCursor, valid);
        if (!valid()) return;
        this.#state.cloudPeers = [...new Set([...this.#state.cloudPeers, item.peer])].slice(-2000);
        const state = this.#histories.get(item.peer);
        if (state?.loaded && !state.task && item.latest.sequence > state.newest) {
          const pageCurrent = () => valid() && this.#histories.get(item.peer) === state;
          // Fill gaps from other devices without resetting the backward paging boundary.
          for (let p = 0; p < 25 && pageCurrent(); p++) {
            const more = await this.#request<HistoryPage>("GET", `/v1/direct/${item.peer}/messages?limit=40&direction=forward&cursor=${state.newest}`);
            if (!pageCurrent()) break;
            this.#validatePage(more, state.newest, true, item.peer);
            for (const envelope of more.items) await this.#restore(envelope, more.readCursor, more.peerReadCursor, pageCurrent, true);
            if (!pageCurrent()) break;
            state.newest = more.cursor;
            if (more.nextCursor === null) break;
          }
          this.#changed(item.peer);
        } else if (result?.fresh) this.#changed(item.peer);
      }
      this.#save();
      if (page.nextCursor === null) return;
      cursor = page.nextCursor;
    }
  }
  // Recovery runs only after unfinished work fails. Successful catch-up stops it;
  // there is no idle poll and ambiguous sends always retain their original ID.
  #scheduleRetry(error?: unknown): void {
    if (this.#closed || !this.community.client.connected || !this.community.supported || !this.community.directEnabled) return;
    if (error instanceof CloudError && error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status)) return;
    this.#retryGeneration++;
    const serverDelay = error instanceof CloudError ? error.retryAfterMs : 0;
    this.#retryNotBefore = Math.max(this.#retryNotBefore, Date.now() + Math.max(serverDelay, this.community.client.retryDelay ?? 0));
    if (this.#retryTimer !== undefined) return;
    const backoff = Math.min(60000, 5000 * 2 ** Math.min(this.#retryAttempt++, 4));
    const retry = () => {
      const remaining = this.#retryNotBefore - Date.now();
      if (remaining > 0) { this.#retryTimer = setTimeout(retry, remaining); return; }
      this.#retryTimer = undefined;
      void this.sync().catch(() => {});
    };
    this.#retryTimer = setTimeout(retry, Math.max(backoff, this.#retryNotBefore - Date.now()));
  }
  shouldUse(peer: number): boolean {
    return this.#state.cloudPeers.includes(peer) || this.community.supported && this.community.directEnabled && !!this.community.relationships.get(peer)?.directMessages;
  }
  #restricted(peer: number): boolean {
    return this.community.client.isProfileBlocked?.(peer) === true ||
      (this.community.adapter.getPlayerRelationships?.(peer) ?? []).some(kind => kind === "blacklist" || kind === "ghosted");
  }
  canUse(peer: number): boolean {
    const relation = this.community.relationships.get(peer);
    if (!this.community.supported || !this.community.directEnabled || !relation?.directMessages) return false;
    return !this.#restricted(peer) && (relation.canMessage || relation.canMessageMatch === true);
  }
  async send(peer: number, name: string, text: string, roomName?: string, mediaIds: string[] = [], audioIds: string[] = []): Promise<LinkMessage> {
    this.#prepareRecovery();
    if (this.options.sendingEnabled?.() === false) throw new Error("Direct chat is turned off in your settings.");
    if (!this.canUse(peer)) throw new Error("Direct messaging requires a confirmed Cloud friendship or a current mutual like.");
    if (!validMediaIds(mediaIds) || (!text.trim() && !mediaIds.length && !audioIds.length) || !validMediaIds(audioIds) || audioIds.length > 1) throw new Error("Choose an attachment or write a message.");
    if (audioIds.length && !this.community.messageAudio) throw new Error("Audio messages require the updated Cloud server.");
    if (mediaIds.length && !this.community.directMessageMedia) throw new Error("Private Direct images require the updated Cloud server.");
    if (this.#state.outgoing.length >= 100) throw new Error("The local delivery queue is full. Wait for delivery or stop retrying failed messages first.");
    const clientMessageId = crypto.randomUUID(), localId = `cloud-out:${clientMessageId}`, createdAt = Date.now();
    const queued: Outgoing = { peer, name, localId, clientMessageId, text, ...(mediaIds.length ? { mediaIds: [...mediaIds] } : {}), ...(audioIds.length ? { audioIds: [...audioIds] } : {}), createdAt, ...(roomName ? { roomName } : {}) };
    // Persist stable identity before any network side effect.
    this.#state.outgoing.push(queued);
    this.#state.cloudPeers = [...new Set([...this.#state.cloudPeers, peer])].slice(-2000);
    try { this.#save(); } catch { this.#state.outgoing.pop(); throw new Error("Cannot save the local delivery queue. Message has not been sent."); }
    // Catch-up can run while capture awaits storage. It must not transmit an
    // entry whose initial capture can still fail and be rolled back as unsent.
    this.#preparing.add(localId);
    let message: LinkMessage;
    try { ({ message } = await this.#captureOutgoing(queued)); }
    catch {
      const outgoing = this.#state.outgoing;
      this.#state.outgoing = outgoing.filter(m => m !== queued);
      let rolledBack = false;
      try { this.#save(); rolledBack = true; } catch { this.#state.outgoing = outgoing; }
      if (rolledBack) throw new Error("Could not save your outgoing message. It has not been sent.");
      // The durable queue still owns this ID. Reporting an unsent draft here
      // would let the composer create a second send while this one can recover.
      message = { id: localId, clientMessageId, direction: "outgoing", peerNumber: peer, peerName: name,
        content: text, sentAt: createdAt, includeRoom: !!roomName, ...(roomName ? { roomName } : {}),
        read: true, ...(mediaIds.length ? { cloudMediaIds: [...mediaIds] } : {}), ...(audioIds.length ? { cloudAudioIds: [...audioIds] } : {}), delivery: "waiting", deliveryError: "Saved in the local delivery queue. Waiting for chat storage." };
    } finally { this.#preparing.delete(localId); }
    this.#changed(peer, message);
    void this.#transmit(queued).catch(() => {});
    return message;
  }
  #captureOutgoing(queued: Outgoing): Promise<{ message: LinkMessage; fresh: boolean }> {
    return this.chat.captureCloud({ direction: "outgoing", peerNumber: queued.peer, peerName: queued.name, content: queued.text,
      sentAt: queued.createdAt, includeRoom: !!queued.roomName, ...(queued.roomName ? { roomName: queued.roomName } : {}) },
      { id: queued.localId, clientMessageId: queued.clientMessageId, ...(queued.mediaIds?.length ? { cloudMediaIds: [...queued.mediaIds] } : {}), ...(queued.audioIds?.length ? { cloudAudioIds: [...queued.audioIds] } : {}), delivery: "waiting" }, false);
  }
  async retry(localId: string): Promise<void> {
    if (this.options.sendingEnabled?.() === false) throw new Error("Direct chat is turned off in your settings.");
    this.#prepareRecovery();
    const queued = this.#state.outgoing.find(m => m.localId === localId); if (!queued) return;
    if (queued.recoveryHeld) { delete queued.serverId; delete queued.recoveryHeld; }
    queued.failed = false; this.#save();
    const updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: "waiting", deliveryError: "" });
    this.#changed(queued.peer, updated);
    await this.#transmit(queued);
  }
  #transmit(queued: Outgoing): Promise<void> {
    if (this.#preparing.has(queued.localId) || !this.#state.outgoing.includes(queued)) return Promise.resolve();
    if (this.#sending.has(queued.localId)) return this.#sending.get(queued.localId)!;
    const task = (async () => {
      if (this.#closed || !this.community.client.connected || !this.community.directEnabled || this.options.sendingEnabled?.() === false) return;
      this.#prepareRecovery();
      if (!this.#state.outgoing.includes(queued) || queued.recoveryHeld || queued.serverId || queued.failed) return;
      if (Date.now() < this.#retryNotBefore) { this.#scheduleRetry(); return; }
      if (Date.now() - queued.createdAt > 30 * 86400000) {
        this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued); this.#save();
        const updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: "failed", deliveryError: "Delivery window expired" });
        this.#changed(queued.peer, updated); return;
      }
      let updated: LinkMessage | undefined;
      try {
        if (this.#restricted(queued.peer)) throw new CloudError("direct_recipient_unavailable", 403);
        await this.#captureOutgoing(queued);
        if (this.#closed || !this.#state.outgoing.includes(queued) || this.options.sendingEnabled?.() === false) return;
        const result = await this.#request<Envelope>("POST", `/v1/direct/${queued.peer}/messages`, {
          clientMessageId: queued.clientMessageId, text: queued.text, ...(queued.mediaIds?.length ? { mediaIds: queued.mediaIds } : {}), ...(queued.audioIds?.length ? { audioIds: queued.audioIds } : {}), createdAt: queued.createdAt, ...(queued.roomName ? { roomName: queued.roomName } : {}),
        });
        if (this.#closed || !this.#state.outgoing.includes(queued)) return;
        const failed = result.state === "revoked" || result.state === "expired";
        updated = await this.chat.updateDelivery(queued.peer, queued.localId, { cloudId: result.id, cloudSequence: result.sequence, ...(this.community.directRecovery ? { cloudGeneration: this.community.directRecovery.generation } : {}), ...(result.mentions ? { cloudMentions: result.mentions } : {}),
          delivery: failed ? "failed" : result.state === "delivered" ? "delivered" : "sent", deliveryError: failed ? "Delivery permission or retention expired" : "" });
        queued.serverId = result.id; queued.failed = failed;
        if (result.state === "delivered" || failed) this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued);
        this.#save();
      } catch (error) {
        if (this.#closed || !this.#state.outgoing.includes(queued)) return;
        const definiteFailure = error instanceof CloudError && [400, 403, 404, 409, 413].includes(error.status);
        if (!definiteFailure) this.#scheduleRetry(error);
        queued.failed = definiteFailure; this.#save();
        updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: definiteFailure ? "failed" : "waiting",
          deliveryError: error instanceof CloudError && error.code === "too_many_mentions" ? "Use up to 10 different usernames and 40 mentions in one message." : definiteFailure ? "Delivery is unavailable. Check your friendship or mutual like and retry." : "Not confirmed. Retry with the same message ID when connected." });
        if (updated) this.#changed(queued.peer, updated);
        return;
      }
      if (updated) this.#changed(queued.peer, updated);
    })().finally(() => { this.#sending.delete(queued.localId); });
    this.#sending.set(queued.localId, task); return task;
  }
  sync(): Promise<void> {
    if (this.#closed || !this.community.supported || !this.community.directEnabled || !this.community.client.connected) return Promise.resolve();
    if (Date.now() < this.#retryNotBefore) return Promise.resolve();
    if (this.#task) {
      // Recipient receipts must not wait for an unrelated slow inbox/outbox request.
      void this.#syncReceipts().catch(error => this.#scheduleRetry(error));
      return this.#task;
    }
    clearTimeout(this.#syncTimer);
    const retryGeneration = this.#retryGeneration;
    const task = (async () => {
      for (let pass = 0; pass < 3; pass++) {
        if (Date.now() < this.#retryNotBefore) break;
        this.#syncAgain = false; await this.#sync();
        if (!this.#syncAgain || this.#closed || !this.community.client.connected) break;
      }
      if (retryGeneration === this.#retryGeneration && !this.#state.outgoing.some(queued => !queued.serverId && !queued.failed)) {
        clearTimeout(this.#retryTimer); this.#retryTimer = undefined;
        this.#retryAttempt = 0; this.#retryNotBefore = 0;
      }
    })().catch(error => { this.#scheduleRetry(error); throw error; }).finally(() => {
      if (this.#task !== task) return;
      this.#task = undefined;
      // A hint arriving after an inbox read is not lost just because catch-up is in flight.
      // One bounded follow-up services the event burst; there is no idle or per-peer poll.
      if (this.#syncAgain && !this.#closed && this.#retryTimer === undefined) this.#syncTimer = setTimeout(() => { void this.sync().catch(() => {}); }, 1000);
    });
    this.#task = task; return task;
  }
  async #sync(): Promise<void> {
    const client = this.community.client;
    this.#prepareRecovery();
    const epoch = this.#recoveryEpoch;
    for (const queued of this.#state.outgoing.filter(m => m.recoveryHeld)) {
      const updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: "failed", deliveryError: "Cloud was restored. This send is paused. Retry explicitly with the same message ID if needed." });
      if (epoch !== this.#recoveryEpoch || this.#closed) return;
      this.#changed(queued.peer, updated);
    }
    // Read checks can be patched while inbox catch-up or an outgoing POST is pending.
    // Capture both outcomes immediately so a slow inbox cannot leave a rejection unhandled.
    const receipts = this.#syncReceipts().then(unresolved => ({ unresolved }), error => ({ error }));
    for (let n = 0; n < 25 && !this.#closed; n++) {
      if (Date.now() < this.#retryNotBefore) return;
      const useHistory = this.community.directHistory, inboxCurrent = this.#historyCurrent();
      const page = await this.#request<{ items: Envelope[]; cursor: number; nextCursor: number | null }>("GET", `/v1/direct/inbox?limit=40&cursor=${this.#state.inbox}`);
      if (this.#closed || useHistory && !inboxCurrent()) return;
      const visible = page.items.filter(envelope => !this.#restricted(envelope.sender));
      for (const envelope of visible) {
        if (envelope.recipient !== client.memberNumber || typeof envelope.text !== "string" || (envelope.mediaIds !== undefined && !validMediaIds(envelope.mediaIds)) || (envelope.audioIds !== undefined && (!validMediaIds(envelope.audioIds) || envelope.audioIds.length > 1))) throw new Error("Invalid Direct envelope");
        if (useHistory) {
          const guard = this.#historyCurrent(envelope.sender), current = () => inboxCurrent() && guard();
          const result = await this.#restore(envelope, envelope.readCursor ?? 0, 0, current);
          if (result?.fresh) {
            this.#changed(envelope.sender);
            if (envelope.state === "sent" && !result.message.read) this.#incoming(result.message);
          }
        } else {
          const { message, fresh } = await this.chat.captureCloud({ direction: "incoming", peerNumber: envelope.sender,
            peerName: this.community.adapter.getMemberName(envelope.sender), content: envelope.text, sentAt: envelope.createdAt,
            includeRoom: !!envelope.roomName, ...(envelope.roomName ? { roomName: envelope.roomName } : {}) },
          { id: `cloud-in:${envelope.id}`, cloudId: envelope.id, cloudSequence: envelope.sequence, ...(this.community.directRecovery ? { cloudGeneration: this.community.directRecovery.generation } : {}), clientMessageId: envelope.clientMessageId, ...(envelope.mentions ? { cloudMentions: envelope.mentions } : {}), ...(envelope.mediaIds?.length ? { cloudMediaIds: [...envelope.mediaIds] } : {}), ...(envelope.audioIds?.length ? { cloudAudioIds: [...envelope.audioIds] } : {}) }, this.options.active(envelope.sender));
          if (this.#closed) return;
          // Show each captured message immediately. An acknowledgement failure or a
          // later storage error in this page must not hide messages already received.
          if (fresh) { this.#changed(message.peerNumber, message); this.#incoming(message); }
        }
      }
      if (useHistory && !inboxCurrent()) return;
      // A parallel receipt request may have established a server cooldown.
      if (Date.now() < this.#retryNotBefore) return;
      // Acknowledge only after local capture, never when the server merely saved it.
      if (visible.length) await this.#request("POST", "/v1/direct/acknowledge", { ids: visible.map(item => item.id) });
      if (this.#closed || epoch !== this.#recoveryEpoch) return;
      this.#state.inbox = page.cursor; this.#save();
      if (page.nextCursor === null) break;
      if (n === 24) this.#syncAgain = true;
    }
    // A receipt whose stable server ID was not known yet is replayed after its send
    // is reconciled. Already identified messages never wait for these POST requests.
    for (const queued of [...this.#state.outgoing]) {
      if (this.#closed || epoch !== this.#recoveryEpoch) return;
      await this.#transmit(queued);
    }
    const receiptResult = await receipts;
    if (this.#closed || epoch !== this.#recoveryEpoch) return;
    if ("error" in receiptResult) throw receiptResult.error;
    if (Date.now() < this.#retryNotBefore) return;
    if (receiptResult.unresolved) await this.#syncReceipts();
    await this.#flushReads();
    if (Date.now() < this.#retryNotBefore) return;
    const reads = await this.#request<{ items: Array<{ scope: string; cursor: number }> }>("GET", "/v1/read-cursors");
    if (this.#closed || epoch !== this.#recoveryEpoch) return;
    for (const read of reads.items) if (read.scope.startsWith("direct:")) await this.chat.reconcileCloudRead(Number(read.scope.slice(7)), read.cursor, this.#state.recoveryGeneration);
    await this.#restoreConversations();
    this.#changed();
  }
  #syncReceipts(): Promise<boolean> {
    if (this.#closed || !this.community.supported || !this.community.directEnabled || !this.community.client.connected || Date.now() < this.#retryNotBefore)
      return Promise.resolve(false);
    try { this.#prepareRecovery(); } catch (error) { return Promise.reject(error); }
    if (this.#receiptTask) { this.#receiptAgain = true; return this.#receiptTask; }
    clearTimeout(this.#receiptTimer);
    const task = (async () => {
      for (let pass = 0; pass < 3; pass++) {
        this.#receiptAgain = false;
        if (await this.#readReceipts()) return true;
        if (!this.#receiptAgain || this.#closed || !this.community.client.connected) break;
      }
      return false;
    })().finally(() => {
      this.#receiptTask = undefined;
      // Preserve a hint that raced a receipt response without waiting for inbox catch-up.
      if (this.#receiptAgain && !this.#closed && this.#retryTimer === undefined)
        this.#receiptTimer = setTimeout(() => { void this.#syncReceipts().catch(error => this.#scheduleRetry(error)); }, 1000);
    });
    this.#receiptTask = task;
    return task;
  }
  async #readReceipts(): Promise<boolean> {
    const epoch = this.#recoveryEpoch;
    for (let n = 0; n < 25 && !this.#closed; n++) {
      const page = await this.#request<{ items: Array<{ messageId: string; recipient?: number; state: string }>; cursor: number; nextCursor: number | null }>("GET", `/v1/direct/receipts?limit=40&cursor=${this.#state.receipts}`);
      if (this.#closed || epoch !== this.#recoveryEpoch) return false;
      let unresolved = false;
      for (const receipt of page.items) {
        if (this.#closed || epoch !== this.#recoveryEpoch) return false;
        const queued = this.#state.outgoing.find(m => m.serverId === receipt.messageId);
        const peer = queued?.peer ?? receipt.recipient;
        if (!peer) {
          unresolved ||= this.#state.outgoing.some(m => !m.serverId);
          continue;
        }
        if (receipt.state === "read") {
          const updated = await this.chat.reconcileCloudReceipt(peer, receipt.messageId, "read");
          if (updated) this.#changed(peer, updated);
          else unresolved ||= this.#state.outgoing.some(m => m.peer === peer && !m.serverId);
          continue;
        }
        if (!["delivered", "revoked", "expired"].includes(receipt.state)) continue;
        const delivery = receipt.state === "delivered" ? "delivered" : "failed";
        const updated = queued
          ? await this.chat.updateDelivery(peer, queued.localId, { delivery,
            deliveryError: delivery === "delivered" ? "" : "Delivery permission or retention expired" })
          : delivery === "delivered"
            ? await this.chat.reconcileCloudReceipt(peer, receipt.messageId, "delivered")
            : undefined;
        if (this.#closed || epoch !== this.#recoveryEpoch) return false;
        if (queued) this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued);
        if (updated) this.#changed(peer, updated);
        else unresolved ||= this.#state.outgoing.some(m => m.peer === peer && !m.serverId);
      }
      // Never advance past a receipt while its send is still ambiguous. It can be
      // safely replayed on reconnect; reconciliation is idempotent.
      if (this.#closed || epoch !== this.#recoveryEpoch) return false;
      if (unresolved) return true;
      this.#state.receipts = page.cursor; this.#save(); if (page.nextCursor === null) break;
      if (n === 24) this.#receiptAgain = true;
    }
    return false;
  }
  destroy(): void { this.#closed = true; this.#historyEpoch++; for (const peer of this.#histories.keys()) this.chat.releaseCloudHistory(peer); this.#histories.clear(); clearTimeout(this.#readTimer); clearTimeout(this.#receiptTimer); clearTimeout(this.#syncTimer); clearTimeout(this.#retryTimer); this.chat.onCloudRead = undefined; for (const fn of this.#unsubscribers.splice(0)) fn(); }
}
