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
  #wasEnabled = false;
  #readTimer: ReturnType<typeof setTimeout> | undefined;
  #readTask: Promise<void> | undefined;
  #syncAgain = false;
  #syncTimer: ReturnType<typeof setTimeout> | undefined;
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
      clearTimeout(this.#readTimer);
      this.#readTimer = setTimeout(() => { this.#readTimer = undefined; void this.#flushReads().catch(() => {}); }, 200);
    };
  }
  #flushReads(): Promise<void> {
    if (this.#readTask) return this.#readTask;
    const task = (async () => {
      if (this.#closed || !this.community.client.connected) return;
      for (let page = 0; page < 20; page++) {
        const items = Object.entries(this.#state.reads).slice(0, 100).map(([scope, cursor]) => ({ scope, cursor }));
        if (!items.length) return;
        await this.community.client.request("PUT", "/v1/read-cursors", { items });
        if (this.#closed) return;
        for (const { scope, cursor } of items) if (this.#state.reads[scope] === cursor) delete this.#state.reads[scope];
        this.#save();
      }
    })().finally(() => { this.#readTask = undefined; });
    this.#readTask = task; return task;
  }
  retryable(localId: string): boolean { return this.#state.outgoing.some(m => m.localId === localId && !m.serverId); }
  async stopRetrying(localId: string): Promise<void> {
    const queued = this.#state.outgoing.find(m => m.localId === localId && !m.serverId); if (!queued) return;
    this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued); this.#save();
    const updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: "failed", deliveryError: "Local retries stopped. A message already accepted by the server may still arrive." });
    this.options.changed(queued.peer, updated);
  }
  clearPending(peer?: number): void { this.#state.outgoing = peer === undefined ? [] : this.#state.outgoing.filter(m => m.peer !== peer); this.#save(); }
  #save(): void { this.storage.setItem(this.#key, JSON.stringify(this.#state)); }
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
    let message: LinkMessage;
    try { ({ message } = await this.#captureOutgoing(queued)); }
    catch { this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued); this.#save(); throw new Error("Could not save your outgoing message. It has not been sent."); }
    this.options.changed(peer, message);
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
    this.options.changed(queued.peer, updated);
    await this.#transmit(queued);
  }
  #transmit(queued: Outgoing): Promise<void> {
    if (this.#sending.has(queued.localId)) return this.#sending.get(queued.localId)!;
    const task = (async () => {
      if (this.#closed || !this.community.client.connected || !this.community.directEnabled || queued.serverId || queued.failed) return;
      if (Date.now() - queued.createdAt > 30 * 86400000) {
        this.#state.outgoing = this.#state.outgoing.filter(m => m !== queued); this.#save();
        const updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: "failed", deliveryError: "Delivery window expired" });
        this.options.changed(queued.peer, updated); return;
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
        queued.failed = definiteFailure; this.#save();
        updated = await this.chat.updateDelivery(queued.peer, queued.localId, { delivery: definiteFailure ? "failed" : "waiting",
          deliveryError: definiteFailure ? "Delivery is not permitted. Check friendship and retry." : "Not confirmed. Retry with the same message ID when connected." });
        if (updated) this.options.changed(queued.peer, updated);
        return;
      }
      if (updated) this.options.changed(queued.peer, updated);
    })().finally(() => { this.#sending.delete(queued.localId); });
    this.#sending.set(queued.localId, task); return task;
  }
  sync(): Promise<void> {
    if (this.#task) return this.#task;
    if (this.#closed || !this.community.supported || !this.community.directEnabled || !this.community.client.connected) return Promise.resolve();
    clearTimeout(this.#syncTimer);
    const task = (async () => {
      for (let pass = 0; pass < 3; pass++) {
        this.#syncAgain = false; await this.#sync();
        if (!this.#syncAgain || this.#closed || !this.community.client.connected) break;
      }
    })().finally(() => {
      if (this.#task !== task) return;
      this.#task = undefined;
      // A hint arriving after an inbox read is not lost just because catch-up is in flight.
      // One bounded follow-up services the event burst; there is no idle or per-peer poll.
      if (this.#syncAgain && !this.#closed) this.#syncTimer = setTimeout(() => { void this.sync().catch(() => {}); }, 1000);
    });
    this.#task = task; return task;
  }
  async #sync(): Promise<void> {
    const client = this.community.client;
    for (let n = 0; n < 25 && !this.#closed; n++) {
      const page = await client.request<{ items: Envelope[]; cursor: number; nextCursor: number | null }>("GET", `/v1/direct/inbox?limit=40&cursor=${this.#state.inbox}`);
      if (this.#closed) return;
      const received: LinkMessage[] = [];
      for (const envelope of page.items) {
        if (envelope.recipient !== client.memberNumber || typeof envelope.text !== "string") throw new Error("Invalid Direct envelope");
        const { message, fresh } = await this.chat.captureCloud({ direction: "incoming", peerNumber: envelope.sender,
          peerName: this.community.adapter.getMemberName(envelope.sender), content: envelope.text, sentAt: envelope.createdAt,
          includeRoom: !!envelope.roomName, ...(envelope.roomName ? { roomName: envelope.roomName } : {}) },
        { id: `cloud-in:${envelope.id}`, cloudId: envelope.id, cloudSequence: envelope.sequence, clientMessageId: envelope.clientMessageId }, this.options.active(envelope.sender));
        // Acknowledge only after local capture, never when the server merely saved it.
        if (fresh) received.push(message);
      }
      if (page.items.length) await client.request("POST", "/v1/direct/acknowledge", { ids: page.items.map(item => item.id) });
      for (const message of received) { this.options.changed(message.peerNumber, message); this.options.incoming(message); }
      this.#state.inbox = page.cursor; this.#save();
      if (page.nextCursor === null) break;
    }
    // Reconcile stable server IDs before consuming receipts, including a POST whose
    // response was lost while the recipient already received/read the message.
    for (const queued of [...this.#state.outgoing]) await this.#transmit(queued);
    for (let n = 0; n < 25 && !this.#closed; n++) {
      const page = await client.request<{ items: Array<{ messageId: string; recipient?: number; state: string }>; cursor: number; nextCursor: number | null }>("GET", `/v1/direct/receipts?limit=40&cursor=${this.#state.receipts}`);
      if (this.#closed) return;
      // A new send can start while this receipt page is loading. Wait for its local
      // history metadata as well; an SSE hint may beat the corresponding HTTP response.
      await Promise.allSettled([...this.#sending.values()]);
      if (this.#closed) return;
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
          if (updated) this.options.changed(peer, updated);
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
        if (updated) this.options.changed(peer, updated);
        else unresolved ||= this.#state.outgoing.some(m => m.peer === peer && !m.serverId);
      }
      // Never advance past a receipt while its send is still ambiguous. It can be
      // safely replayed on reconnect; reconciliation is idempotent.
      if (unresolved) break;
      this.#state.receipts = page.cursor; this.#save(); if (page.nextCursor === null) break;
    }
    await this.#flushReads();
    const reads = await client.request<{ items: Array<{ scope: string; cursor: number }> }>("GET", "/v1/read-cursors");
    if (this.#closed) return;
    for (const read of reads.items) if (read.scope.startsWith("direct:")) await this.chat.reconcileCloudRead(Number(read.scope.slice(7)), read.cursor);
    this.options.changed();
  }
  destroy(): void { this.#closed = true; clearTimeout(this.#readTimer); clearTimeout(this.#syncTimer); this.chat.onCloudRead = undefined; for (const fn of this.#unsubscribers.splice(0)) fn(); }
}
