import { CloudError } from "./client";
import type { CommunityService } from "./community";
import type { ChatService } from "../modules/link-chat/chat-service";
import type { KeyValueStorage } from "../core/settings";
import type { LinkMessage } from "../core/types";

interface Envelope {
  id: string; clientMessageId: string; sequence: number; sender: number; recipient: number;
  createdAt: number; text?: string; roomName?: string; state: "sent" | "delivered" | "revoked" | "expired";
}
interface Outgoing { peer: number; name: string; localId: string; clientMessageId: string; text: string; createdAt: number; roomName?: string; serverId?: string; failed?: boolean }
interface DirectState { inbox: number; receipts: number; outgoing: Outgoing[]; cloudPeers: number[]; reads: Record<string, number> }
const empty = (): DirectState => ({ inbox: 0, receipts: 0, outgoing: [], cloudPeers: [], reads: {} });

/** Delivery for confirmed Cloud friends, separate from the historical chat import path. */
export class CloudDirect {
  #state = empty();
  #key: string;
  #closed = false;
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
    readonly options: { active(peer: number): boolean; changed(peer?: number, message?: LinkMessage): void; incoming(message: LinkMessage): void }) {
    this.#key = `kikilink:cloud:direct-queue:${community.client.memberNumber}:v1`;
    try {
      const state: DirectState = JSON.parse(storage.getItem(this.#key) ?? "null");
      if (state && Number.isSafeInteger(state.inbox) && state.inbox >= 0 && Number.isSafeInteger(state.receipts) && state.receipts >= 0 && Array.isArray(state.outgoing))
        this.#state = { ...state, reads: Object.fromEntries(Object.entries(state.reads ?? {}).filter(([key, value]) => /^direct:[1-9]\d*$/u.test(key) && Number.isSafeInteger(value) && value >= 0).slice(-2000)), cloudPeers: Array.isArray(state.cloudPeers) ? state.cloudPeers.filter(n => Number.isSafeInteger(n) && n > 0).slice(-2000) : [], outgoing: state.outgoing.filter(m => Number.isSafeInteger(m.peer) && m.peer > 0 && typeof m.text === "string" && m.text.length <= 4000 && typeof m.clientMessageId === "string" && /^[a-f0-9-]{36}$/u.test(m.clientMessageId)).slice(0, 100) };
    } catch { /* A malformed old queue cannot be sent. */ }
    this.#unsubscribers.push(community.client.subscribe(kind => {
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
    chat.onCloudRead = (peer, sequence) => {
      if (!community.supported || !community.directEnabled || this.#closed) return;
      const scope = `direct:${peer}`;
      this.#state.reads[scope] = Math.max(this.#state.reads[scope] ?? 0, sequence);
      this.#save();
      // Bound batching latency even while an active chat keeps receiving messages.
      if (this.#readTimer !== undefined) return;
      this.#readTimer = setTimeout(() => { this.#readTimer = undefined; void this.#flushReads().catch(() => {}); }, 200);
    };
  }
  #flushReads(): Promise<void> {
    if (this.#readTask) return this.#readTask;
    const task = (async () => {
      if (this.#closed || !this.community.client.connected || Date.now() < this.#retryNotBefore) return;
      for (let page = 0; page < 20; page++) {
        if (Date.now() < this.#retryNotBefore) return;
        const items = Object.entries(this.#state.reads).slice(0, 100).map(([scope, cursor]) => ({ scope, cursor }));
        if (!items.length) return;
        await this.community.client.request("PUT", "/v1/read-cursors", { items });
        if (this.#closed) return;
        for (const { scope, cursor } of items) if (this.#state.reads[scope] === cursor) delete this.#state.reads[scope];
        this.#save();
      }
    })().catch(error => { this.#scheduleRetry(error); throw error; })
      .finally(() => { this.#readTask = undefined; });
    this.#readTask = task; return task;
  }
  retryable(localId: string): boolean { return this.#state.outgoing.some(m => m.localId === localId && !m.serverId); }
  async stopRetrying(localId: string): Promise<void> {
    const queued = this.#state.outgoing.find(m => m.localId === localId && !m.serverId); if (!queued) return;
    this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued); this.#save();
    const updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: "failed", deliveryError: "Local retries stopped. A message already accepted by the server may still arrive." });
    this.#changed(queued.peer, updated);
  }
  clearPending(peer?: number): void { this.#state.outgoing = peer === undefined ? [] : this.#state.outgoing.filter(m => m.peer !== peer); this.#save(); }
  #save(): void { this.storage.setItem(this.#key, JSON.stringify(this.#state)); }
  #changed(peer?: number, message?: LinkMessage): void {
    try { this.options.changed(peer, message); } catch { /* View failures cannot change delivery acceptance. */ }
  }
  #incoming(message: LinkMessage): void {
    try { this.options.incoming(message); } catch { /* Notifications are independent of durable inbox delivery. */ }
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
  canUse(peer: number): boolean {
    const relation = this.community.relationships.get(peer);
    return this.community.supported && this.community.directEnabled && !!relation?.directMessages && relation.canMessage;
  }
  async send(peer: number, name: string, text: string, roomName?: string): Promise<LinkMessage> {
    if (!this.canUse(peer)) throw new Error("Offline Direct delivery requires a confirmed Cloud friendship.");
    if (this.#state.outgoing.length >= 100) throw new Error("The local delivery queue is full. Wait for delivery or stop retrying failed messages first.");
    const clientMessageId = crypto.randomUUID(), localId = `cloud-out:${clientMessageId}`, createdAt = Date.now();
    const queued: Outgoing = { peer, name, localId, clientMessageId, text, createdAt, ...(roomName ? { roomName } : {}) };
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
        read: true, delivery: "waiting", deliveryError: "Saved in the local delivery queue. Waiting for chat storage." };
    } finally { this.#preparing.delete(localId); }
    this.#changed(peer, message);
    void this.#transmit(queued).catch(() => {});
    return message;
  }
  #captureOutgoing(queued: Outgoing): Promise<{ message: LinkMessage; fresh: boolean }> {
    return this.chat.captureCloud({ direction: "outgoing", peerNumber: queued.peer, peerName: queued.name, content: queued.text,
      sentAt: queued.createdAt, includeRoom: !!queued.roomName, ...(queued.roomName ? { roomName: queued.roomName } : {}) },
      { id: queued.localId, clientMessageId: queued.clientMessageId, delivery: "waiting" }, false);
  }
  async retry(localId: string): Promise<void> {
    const queued = this.#state.outgoing.find(m => m.localId === localId); if (!queued) return;
    queued.failed = false; this.#save();
    const updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: "waiting", deliveryError: "" });
    this.#changed(queued.peer, updated);
    await this.#transmit(queued);
  }
  #transmit(queued: Outgoing): Promise<void> {
    if (this.#preparing.has(queued.localId) || !this.#state.outgoing.includes(queued)) return Promise.resolve();
    if (this.#sending.has(queued.localId)) return this.#sending.get(queued.localId)!;
    const task = (async () => {
      if (this.#closed || !this.community.client.connected || !this.community.directEnabled || queued.serverId || queued.failed) return;
      if (Date.now() < this.#retryNotBefore) { this.#scheduleRetry(); return; }
      if (Date.now() - queued.createdAt > 30 * 86400000) {
        this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued); this.#save();
        const updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: "failed", deliveryError: "Delivery window expired" });
        this.#changed(queued.peer, updated); return;
      }
      let updated: LinkMessage | undefined;
      try {
        await this.#captureOutgoing(queued);
        if (this.#closed || !this.#state.outgoing.includes(queued)) return;
        const result = await this.community.client.request<Envelope>("POST", `/v1/direct/${queued.peer}/messages`, {
          clientMessageId: queued.clientMessageId, text: queued.text, createdAt: queued.createdAt, ...(queued.roomName ? { roomName: queued.roomName } : {}),
        });
        if (this.#closed || !this.#state.outgoing.includes(queued)) return;
        const failed = result.state === "revoked" || result.state === "expired";
        updated = await this.chat.updateDelivery(queued.peer, queued.localId, { cloudId: result.id, cloudSequence: result.sequence,
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
          deliveryError: definiteFailure ? "Delivery is not permitted. Check friendship and retry." : "Not confirmed. Retry with the same message ID when connected." });
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
    // Read checks can be patched while inbox catch-up or an outgoing POST is pending.
    // Capture both outcomes immediately so a slow inbox cannot leave a rejection unhandled.
    const receipts = this.#syncReceipts().then(unresolved => ({ unresolved }), error => ({ error }));
    for (let n = 0; n < 25 && !this.#closed; n++) {
      if (Date.now() < this.#retryNotBefore) return;
      const page = await client.request<{ items: Envelope[]; cursor: number; nextCursor: number | null }>("GET", `/v1/direct/inbox?limit=40&cursor=${this.#state.inbox}`);
      if (this.#closed) return;
      for (const envelope of page.items) {
        if (envelope.recipient !== client.memberNumber || typeof envelope.text !== "string") throw new Error("Invalid Direct envelope");
        const { message, fresh } = await this.chat.captureCloud({ direction: "incoming", peerNumber: envelope.sender,
          peerName: this.community.adapter.getMemberName(envelope.sender), content: envelope.text, sentAt: envelope.createdAt,
          includeRoom: !!envelope.roomName, ...(envelope.roomName ? { roomName: envelope.roomName } : {}) },
        { id: `cloud-in:${envelope.id}`, cloudId: envelope.id, cloudSequence: envelope.sequence, clientMessageId: envelope.clientMessageId }, this.options.active(envelope.sender));
        if (this.#closed) return;
        // Show each captured message immediately. An acknowledgement failure or a
        // later storage error in this page must not hide messages already received.
        if (fresh) { this.#changed(message.peerNumber, message); this.#incoming(message); }
      }
      // A parallel receipt request may have established a server cooldown.
      if (Date.now() < this.#retryNotBefore) return;
      // Acknowledge only after local capture, never when the server merely saved it.
      if (page.items.length) await client.request("POST", "/v1/direct/acknowledge", { ids: page.items.map(item => item.id) });
      if (this.#closed) return;
      this.#state.inbox = page.cursor; this.#save();
      if (page.nextCursor === null) break;
    }
    // A receipt whose stable server ID was not known yet is replayed after its send
    // is reconciled. Already identified messages never wait for these POST requests.
    for (const queued of [...this.#state.outgoing]) await this.#transmit(queued);
    const receiptResult = await receipts;
    if ("error" in receiptResult) throw receiptResult.error;
    if (Date.now() < this.#retryNotBefore) return;
    if (receiptResult.unresolved) await this.#syncReceipts();
    await this.#flushReads();
    if (Date.now() < this.#retryNotBefore) return;
    const reads = await client.request<{ items: Array<{ scope: string; cursor: number }> }>("GET", "/v1/read-cursors");
    if (this.#closed) return;
    for (const read of reads.items) if (read.scope.startsWith("direct:")) await this.chat.reconcileCloudRead(Number(read.scope.slice(7)), read.cursor);
    this.#changed();
  }
  #syncReceipts(): Promise<boolean> {
    if (this.#closed || !this.community.supported || !this.community.directEnabled || !this.community.client.connected || Date.now() < this.#retryNotBefore)
      return Promise.resolve(false);
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
    const client = this.community.client;
    for (let n = 0; n < 25 && !this.#closed; n++) {
      const page = await client.request<{ items: Array<{ messageId: string; recipient?: number; state: string }>; cursor: number; nextCursor: number | null }>("GET", `/v1/direct/receipts?limit=40&cursor=${this.#state.receipts}`);
      if (this.#closed) return false;
      let unresolved = false;
      for (const receipt of page.items) {
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
        if (queued) this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued);
        if (updated) this.#changed(peer, updated);
        else unresolved ||= this.#state.outgoing.some(m => m.peer === peer && !m.serverId);
      }
      // Never advance past a receipt while its send is still ambiguous. It can be
      // safely replayed on reconnect; reconciliation is idempotent.
      if (unresolved) return true;
      this.#state.receipts = page.cursor; this.#save(); if (page.nextCursor === null) break;
    }
    return false;
  }
  destroy(): void { this.#closed = true; clearTimeout(this.#readTimer); clearTimeout(this.#receiptTimer); clearTimeout(this.#syncTimer); clearTimeout(this.#retryTimer); this.chat.onCloudRead = undefined; for (const fn of this.#unsubscribers.splice(0)) fn(); }
}
