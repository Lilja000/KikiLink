import { cleanBeepMessageContent } from "../../bc/message-content";
import { isReconnectNotice } from "../../bc/reconnect-notice";
import { legacySelfBeepEchoes } from "../../bc/self-beep-echo";
import type { SettingsStore } from "../../core/settings";
import type { BeepEvent, ConversationMeta, LinkMessage } from "../../core/types";
import type { ChatRepository } from "../../storage/chat-repository";
import type { ChatImportRules } from '../../storage/chat-import-model';
import { sortConversations } from "../../storage/memory-chat-repository";
import { createId } from "../../utils/id";
import { remainingDraftAfterSend } from "../../utils/sent-draft";
import { parseMessageLinks } from "./media";
import { DirectPresentation } from "./direct-presentation";
import { conversationMuted } from "./conversation-mute";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ChatMediaItem {
  url: string;
  provider: "catbox" | "litterbox" | "other";
  peerNumber: number;
  peerName: string;
  direction: LinkMessage["direction"];
  sentAt: number;
  messageId: string;
}

export class ChatService {
  // Explicitly paged Cloud history can outlive the durable device retention window.
  presentation: DirectPresentation | undefined;
  readonly #cloudHistory = new Map<number, Map<string, LinkMessage>>();
  #historyGeneration = 0;
  readonly #peerHistoryGeneration = new Map<number, number>();
  readonly #ephemeralMessages = new Map<number, LinkMessage[]>();
  readonly #ephemeralConversations = new Map<number, ConversationMeta>();
  readonly #peerMutationTails = new Map<number, Promise<void>>();
  #globalMutationTail: Promise<void> = Promise.resolve();
  cloudReadGeneration: string | undefined;
  onCloudRead: ((peer: number, sequence: number, generation?: string) => void) | undefined;

  deviceHistoryImportRules(owner: number): ChatImportRules {
    const database = this.repository.deviceHistoryDatabase?.(owner), settings = this.settings.getSection('linkChat');
    if (!database || this.repository.canSafelyCapturePortableSnapshot?.() === false || this.ownMemberNumber !== undefined && this.ownMemberNumber !== owner)
      throw new Error('Durable chat storage is unavailable for this account. Reload before importing.');
    return {database,saveHistory:settings.saveHistory,retentionDays:settings.retentionDays,maxMessages:settings.maxMessagesPerConversation,
      policy:this.repository.deviceHistoryImportPolicy?.() ?? {clearedAt:0,prunedBefore:0,deletedPeers:[],prunedPeers:[]}};
  }
  importDeviceHistory<T>(owner: number, expected: ChatImportRules, current: () => boolean, operation: (guard: () => void, prepared: () => void) => Promise<T>): Promise<T> {
    return this.#enqueueGlobalMutation(async () => {
      const guard = () => { if (!current() || JSON.stringify(this.deviceHistoryImportRules(owner)) !== JSON.stringify(expected)) throw new Error('The account or history policy changed. Review the archive again.'); };
      guard(); return operation(guard,() => { this.repository.prepareDeviceHistoryImport?.(); this.#historyGeneration++; });
    });
  }

  constructor(
    private readonly repository: ChatRepository,
    private readonly settings: SettingsStore,
    private readonly ownMemberNumber?: number,
  ) {}

  async capture(event: BeepEvent, activeConversation: boolean): Promise<LinkMessage> {
    const canonicalEvent = canonicalizeBeepEvent(event);
    return this.#enqueuePeerMutation(canonicalEvent.peerNumber, () =>
      this.#captureUnlocked(canonicalEvent, activeConversation),
    );
  }

  async #captureUnlocked(
    canonicalEvent: BeepEvent,
    activeConversation: boolean,
    cloud?: Pick<LinkMessage, "id" | "clientMessageId" | "cloudMediaIds" | "cloudAudioIds" | "cloudMentions" | "cloudId" | "cloudSequence" | "cloudGeneration" | "delivery" | "deliveryError">,
    historicalRead?: boolean,
    current?: () => boolean,
  ): Promise<LinkMessage> {
    const message: LinkMessage = {
      ...canonicalEvent,
      id: cloud?.id ?? createId("beep"),
      ...cloud,
      read: canonicalEvent.direction === "outgoing" || (historicalRead ?? activeConversation),
    };
    const previous = await this.#getStoredConversationUnlocked(canonicalEvent.peerNumber);
    if (current && !current()) throw new Error("History request is no longer current");
    const conversation: ConversationMeta = {
      peerNumber: canonicalEvent.peerNumber,
      peerName: preferredPeerName(
        previous?.peerName,
        canonicalEvent.peerName,
        canonicalEvent.peerNumber,
      ),
      ...(previous?.localAlias ? { localAlias: previous.localAlias } : {}),
      ...(previous?.archivedFields !== undefined ? { archivedFields: previous.archivedFields } : {}),
      lastMessage: previous && previous.lastMessageAt > canonicalEvent.sentAt ? previous.lastMessage : canonicalEvent.content || (cloud?.cloudAudioIds?.length ? "Audio" : cloud?.cloudMediaIds?.length ? "Image" : ""),
      lastMessageAt: Math.max(previous?.lastMessageAt ?? 0, canonicalEvent.sentAt),
      lastDirection: previous && previous.lastMessageAt > canonicalEvent.sentAt ? previous.lastDirection : canonicalEvent.direction,
      unread:
        canonicalEvent.direction === "incoming" && !message.read
          ? (previous?.unread ?? 0) + 1
          : activeConversation && historicalRead === undefined ? 0 : (previous?.unread ?? 0),
      pinned: previous?.pinned ?? false,
      draft: previous?.draft ?? "",
      ...(previous?.muteUntil !== undefined ? { muteUntil: previous.muteUntil } : {}),
    };

    const config = this.settings.getSection("linkChat");
    if (config.saveHistory) {
      await this.repository.captureMessage(
        message,
        conversation,
        config.maxMessagesPerConversation,
      );
    } else {
      const messages = this.#ephemeralMessages.get(canonicalEvent.peerNumber) ?? [];
      messages.push(message);
      this.#ephemeralMessages.set(
        canonicalEvent.peerNumber,
        messages.slice(-config.maxMessagesPerConversation),
      );
      this.#ephemeralConversations.set(canonicalEvent.peerNumber, conversation);
    }

    return message;
  }

  async captureCloud(event: BeepEvent, metadata: Pick<LinkMessage, "id" | "clientMessageId" | "cloudMediaIds" | "cloudAudioIds" | "cloudMentions" | "cloudId" | "cloudSequence" | "cloudGeneration" | "delivery" | "deliveryError">, active: boolean): Promise<{ message: LinkMessage; fresh: boolean }> {
    return this.#enqueuePeerMutation(event.peerNumber, async () => {
      const old = (await this.#getMessagesUnlocked(event.peerNumber, this.settings.getSection("linkChat").maxMessagesPerConversation)).find(m => m.id === metadata.id);
      if (old) return { message: old, fresh: false };
      const message = await this.#captureUnlocked(canonicalizeBeepEvent(event), active, metadata);
      if (active && message.direction === "incoming" && message.cloudSequence) this.#notifyCloudRead(event.peerNumber, message.cloudSequence, message.cloudGeneration);
      return { message, fresh: true };
    });
  }
  cloudHistoryGuard(peer?: number): () => boolean {
    const global = this.#historyGeneration, generation = peer === undefined ? 0 : this.#peerHistoryGeneration.get(peer) ?? 0;
    return () => global === this.#historyGeneration && (peer === undefined || generation === (this.#peerHistoryGeneration.get(peer) ?? 0));
  }
  /** An explicit Cloud archive can exceed device retention, but never a clear/delete boundary. */
  cloudArchiveCutoff(peer:number):number {
    const policy=this.repository.deviceHistoryImportPolicy?.();
    if(!policy)return 0;
    const time=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=8640000000000000;
    if(!time(policy.clearedAt)||!Array.isArray(policy.deletedPeers)||policy.deletedPeers.some(pair=>!Array.isArray(pair)||pair.length!==2||!Number.isSafeInteger(pair[0])||pair[0]<=0||!time(pair[1])))
      throw new Error('Saved history deletion policy could not be checked.');
    return Math.max(policy.clearedAt,...policy.deletedPeers.filter(([member])=>member===peer).map(([,at])=>at));
  }
  /** Imports a server envelope without sending, notifying or manufacturing a read receipt. */
  async restoreCloud(event: BeepEvent, metadata: Pick<LinkMessage, "id" | "clientMessageId" | "cloudMediaIds" | "cloudAudioIds" | "cloudMentions" | "cloudId" | "cloudSequence" | "cloudGeneration" | "delivery" | "deliveryError">,
    read: boolean, current: () => boolean = () => true, retain = false): Promise<{ message: LinkMessage; fresh: boolean } | undefined> {
    return this.#enqueuePeerMutation(event.peerNumber, async () => {
      if (!current()) return;
      const previous = await this.#getStoredConversationUnlocked(event.peerNumber);
      if (!current() || previous?.hiddenAt !== undefined && event.sentAt <= previous.hiddenAt) return;
      const messages = await this.#getMessagesUnlocked(event.peerNumber, Number.MAX_SAFE_INTEGER);
      if (!current()) return;
      const old = messages.find(m => m.direction === event.direction && (m.id === metadata.id ||
        !!metadata.cloudId && m.cloudId === metadata.cloudId || !!metadata.clientMessageId && m.clientMessageId === metadata.clientMessageId));
      let message: LinkMessage;
      if (old && previous) {
        const rank = { waiting: 0, failed: 0, sent: 1, delivered: 2, read: 3 };
        const delivery = old.delivery && metadata.delivery && rank[old.delivery] > rank[metadata.delivery] ? old.delivery : metadata.delivery ?? old.delivery;
        message = { ...old, ...metadata, id: old.id, read: old.read || read, ...(delivery ? { delivery } : {}) };
        if (this.#ephemeralMessages.get(event.peerNumber)?.some(m => m.id === old.id)) {
          this.#ephemeralMessages.set(event.peerNumber, this.#ephemeralMessages.get(event.peerNumber)!.map(m => m.id === old.id ? message : m));
        } else if (this.settings.getSection("linkChat").saveHistory) {
          // A session-only older row must not bypass the durable retention cap.
          await this.repository.captureMessage(message, previous, this.settings.getSection("linkChat").maxMessagesPerConversation);
        }
        if (!old.read && message.read && previous) await this.#saveConversation({ ...previous, unread: Math.max(0, previous.unread - 1) });
      } else {
        message = await this.#captureUnlocked(canonicalizeBeepEvent(event), false, metadata, read, current);
      }
      if (!current()) return;
      if (retain || this.#cloudHistory.get(event.peerNumber)?.has(message.id)) {
        const history = this.#cloudHistory.get(event.peerNumber) ?? new Map<string, LinkMessage>();
        history.set(message.id, message); this.#cloudHistory.set(event.peerNumber, history);
      }
      return { message: structuredClone(message), fresh: !old };
    });
  }
  releaseCloudHistory(peer: number): void { this.#cloudHistory.delete(peer); }
  async #replaceRetainedMessage(message: LinkMessage): Promise<void> {
    const peer = message.peerNumber, ephemeral = this.#ephemeralMessages.get(peer);
    if (ephemeral?.some(m => m.id === message.id)) {
      this.#ephemeralMessages.set(peer, ephemeral.map(m => m.id === message.id ? message : m));
    } else {
      // Updating a session-only old receipt must not reinsert it beyond retention.
      const session = this.#cloudHistory.get(peer)?.has(message.id);
      if (!session || (await this.repository.getMessages(peer, Number.MAX_SAFE_INTEGER)).some(m => m.id === message.id))
        await this.repository.addMessage(message);
    }
    // A failed durable write must remain retryable rather than looking applied in memory.
    if (this.#cloudHistory.get(peer)?.has(message.id)) this.#cloudHistory.get(peer)!.set(message.id, message);
  }
  async changeLocalMessage(target: LinkMessage, text: string | null, current: () => boolean, located = false): Promise<void> {
    await this.#enqueuePeerMutation(target.peerNumber, async () => {
      if (!current() || !this.presentation || target.direction !== "outgoing") throw new Error("This message is no longer available.");
      const raw = (await this.#getMessagesUnlocked(target.peerNumber, Number.MAX_SAFE_INTEGER)).find(row =>
        row.id === target.id && row.direction === "outgoing" && row.cloudGeneration === target.cloudGeneration);
      const source = raw ?? (located ? target : undefined);
      if (!source || !current() || this.presentation.project(source)?.content !== target.content)
        throw new Error("This message changed. Reopen it before saving.");
      this.presentation.change(source, text, this.settings.getSection("linkChat").saveHistory);
    });
  }

  async setMessagePinned(target: LinkMessage, pinned: boolean, current: () => boolean): Promise<void> {
    await this.#enqueuePeerMutation(target.peerNumber, async () => {
      if (!current()) return;
      const messages = await this.#getMessagesUnlocked(target.peerNumber, Number.MAX_SAFE_INTEGER);
      const message = messages.find(item => item.id === target.id && item.cloudGeneration === target.cloudGeneration &&
        item.sentAt === target.sentAt && item.direction === target.direction);
      if (!message || !current()) throw new Error("This message is no longer available.");
      if (Boolean(message.localPin) === pinned) return;
      const replacement = { ...message };
      if (pinned) replacement.localPin = true;
      else delete replacement.localPin;
      await this.#replaceRetainedMessage(replacement);
    });
  }

  async updateDelivery(peer: number, id: string, metadata: Partial<Pick<LinkMessage, "cloudMentions" | "cloudId" | "cloudSequence" | "cloudGeneration" | "delivery" | "deliveryError">>): Promise<LinkMessage | undefined> {
    return this.#enqueuePeerMutation(peer, async () => {
      const message = (await this.#getMessagesUnlocked(peer, Number.MAX_SAFE_INTEGER)).find(m => m.id === id);
      if (!message) return;
      const safeMetadata = message.delivery === "read" && metadata.delivery && metadata.delivery !== "read"
        ? { ...metadata, delivery: "read" as const, deliveryError: "" }
        : metadata;
      const updated = { ...message, ...safeMetadata };
      await this.#replaceRetainedMessage(updated);
      return structuredClone(updated);
    });
  }
  async reconcileCloudReceipt(peer: number, cloudId: string, delivery: "delivered" | "read"): Promise<LinkMessage | undefined> {
    return this.#enqueuePeerMutation(peer, async () => {
      const message = (await this.#getMessagesUnlocked(peer, Number.MAX_SAFE_INTEGER))
        .find(m => m.direction === "outgoing" && m.cloudId === cloudId);
      if (!message || message.delivery === "read" || message.delivery === delivery) return message ? structuredClone(message) : undefined;
      const updated: LinkMessage = { ...message, delivery, deliveryError: "" };
      await this.#replaceRetainedMessage(updated);
      return structuredClone(updated);
    });
  }
  async reconcileCloudRead(peer: number, sequence: number, generation?: string): Promise<void> {
    await this.#enqueuePeerMutation(peer, async () => {
      const messages = await this.#getMessagesUnlocked(peer, Number.MAX_SAFE_INTEGER);
      const newlyRead = messages.filter(m => m.direction === "incoming" && !m.read && (generation === undefined || m.cloudGeneration === generation) && m.cloudSequence && m.cloudSequence <= sequence);
      for (const message of newlyRead) await this.#replaceRetainedMessage({ ...message, read: true });
      const conversation = await this.#getVisibleConversationUnlocked(peer);
      if (conversation && newlyRead.length) await this.#saveConversation({ ...conversation, unread: Math.max(0, conversation.unread - newlyRead.length) });
    });
  }

  async captureRecent(event: BeepEvent): Promise<boolean> {
    if (isReconnectNotice(event, this.ownMemberNumber)) return false;
    const canonicalEvent = canonicalizeBeepEvent(event);
    return this.#enqueuePeerMutation(canonicalEvent.peerNumber, async () => {
      const stored = await this.#getStoredConversationUnlocked(canonicalEvent.peerNumber);
      if (stored?.hiddenAt !== undefined && canonicalEvent.sentAt <= stored.hiddenAt) return false;
      const messages = await this.#getMessagesUnlocked(canonicalEvent.peerNumber, 500);
      const duplicate = messages.some(
        (message) =>
          message.direction === canonicalEvent.direction &&
          message.content === canonicalEvent.content &&
          message.roomName === canonicalEvent.roomName &&
          Math.abs(message.sentAt - canonicalEvent.sentAt) <= 2000,
      );
      if (duplicate) return false;
      await this.#captureUnlocked(canonicalEvent, true);
      return true;
    });
  }

  async ensureConversation(peerNumber: number, peerName: string): Promise<ConversationMeta> {
    return this.#enqueuePeerMutation(peerNumber, () =>
      this.#ensureConversationUnlocked(peerNumber, peerName),
    );
  }

  async #ensureConversationUnlocked(
    peerNumber: number,
    peerName: string,
  ): Promise<ConversationMeta> {
    const existing = await this.#getStoredConversationUnlocked(peerNumber);
    if (existing && existing.hiddenAt === undefined) return existing;

    const conversation: ConversationMeta = {
      peerNumber,
      peerName,
      lastMessage: "",
      lastMessageAt: 0,
      lastDirection: "incoming",
      unread: 0,
      pinned: false,
      draft: "",
    };
    await this.#saveConversation(conversation);
    return conversation;
  }

  async getConversation(peerNumber: number): Promise<ConversationMeta | undefined> {
    return this.#enqueuePeerMutation(peerNumber, async () => {
      const conversation = await this.#getStoredConversationUnlocked(peerNumber);
      return conversation && conversation.hiddenAt === undefined ? this.#presentConversation(conversation) : undefined;
    });
  }

  async #getStoredConversationUnlocked(peerNumber: number): Promise<ConversationMeta | undefined> {
    const ephemeral = this.#ephemeralConversations.get(peerNumber);
    if (ephemeral) {
      const canonical = canonicalizeConversationPreview(ephemeral);
      if (canonical !== ephemeral) this.#ephemeralConversations.set(peerNumber, canonical);
      return this.#withoutHiddenSelfPreview(structuredClone(canonical));
    }
    const persisted = await this.repository.getConversation(peerNumber);
    return persisted ? this.#withoutHiddenSelfPreview(await this.#repairConversationPreviewUnlocked(persisted)) : undefined;
  }

  async listConversations(): Promise<ConversationMeta[]> {
    const persisted = await this.repository.listConversations();
    const canonicalPersisted = await Promise.all(
      persisted.map((conversation) => {
        const canonical = canonicalizeConversationPreview(conversation);
        if (canonical === conversation) return conversation;
        return this.#enqueuePeerMutation(conversation.peerNumber, async () => {
          // The list snapshot may have been read while a capture was still being committed.
          // Repair the newest row inside the peer queue instead of writing stale metadata back.
          const current = await this.repository.getConversation(conversation.peerNumber);
          return current
            ? this.#repairConversationPreviewUnlocked(current)
            : canonical;
        });
      }),
    );
    const merged = new Map(
      canonicalPersisted.map((conversation) => [conversation.peerNumber, conversation]),
    );
    for (const conversation of this.#ephemeralConversations.values()) {
      const canonical = canonicalizeConversationPreview(conversation);
      if (canonical !== conversation) {
        this.#ephemeralConversations.set(conversation.peerNumber, canonical);
      }
      merged.set(canonical.peerNumber, structuredClone(canonical));
    }
    return (await Promise.all([...merged.values()].map(async conversation => this.#presentConversation(await this.#withoutHiddenSelfPreview(conversation)))))
      .filter((conversation) => conversation.hiddenAt === undefined)
      .sort(sortConversations);
  }

  async getMessages(peerNumber: number, limit = 300): Promise<LinkMessage[]> {
    return this.#enqueuePeerMutation(peerNumber, async () => {
      if (!this.presentation?.hasPeer(peerNumber)) return this.#getMessagesUnlocked(peerNumber, limit);
      const messages = await this.#getMessagesUnlocked(peerNumber, Number.MAX_SAFE_INTEGER);
      return this.presentMessages(messages).slice(-limit);
    });
  }
  presentMessages(messages: LinkMessage[]): LinkMessage[] {
    const presentation = this.presentation;
    return presentation ? messages.flatMap(message => presentation.project(message) ?? []) : messages;
  }
  async #presentConversation(conversation: ConversationMeta): Promise<ConversationMeta> {
    if (!this.presentation?.hasPeer(conversation.peerNumber)) return conversation;
    const raw = await this.#getMessagesUnlocked(conversation.peerNumber, Number.MAX_SAFE_INTEGER);
    if (raw.at(-1)?.sentAt !== conversation.lastMessageAt) return conversation;
    const last = this.presentMessages(raw).at(-1);
    return { ...conversation, lastMessage: last?.content || (last?.cloudAudioIds?.length ? "Audio" : last?.cloudMediaIds?.length ? "Image" : ""),
      lastMessageAt: last?.sentAt ?? 0, lastDirection: last?.direction ?? "incoming" };
  }

  async #getMessagesUnlocked(peerNumber: number, limit = 300): Promise<LinkMessage[]> {
    const persisted = await this.repository.getMessages(peerNumber, peerNumber === this.ownMemberNumber
      ? Math.max(limit, this.settings.getSection("linkChat").maxMessagesPerConversation) : limit);
    const ephemeral = this.#ephemeralMessages.get(peerNumber) ?? [];
    const echoes = peerNumber === this.ownMemberNumber ? legacySelfBeepEchoes([...persisted, ...ephemeral], this.ownMemberNumber) : undefined;
    // Keep the envelope on a hidden legacy echo so later reads can still pair it to the send.
    const canonicalPersisted = await Promise.all(
      persisted.filter(message => !echoes?.has(message)).map((message) => this.#repairStoredMessage(message)),
    );
    const canonicalEphemeral = ephemeral.map(message => echoes?.has(message) ? message : canonicalizeStoredMessage(message));
    if (canonicalEphemeral.some((message, index) => message !== ephemeral[index])) {
      this.#ephemeralMessages.set(peerNumber, canonicalEphemeral);
    }
    const merged = new Map([...canonicalPersisted, ...canonicalEphemeral.filter(message => !echoes?.has(message)), ...(this.#cloudHistory.get(peerNumber)?.values() ?? [])].map(m => [m.id, m]));
    return [...merged.values()]
      .filter(message => !isReconnectNotice(message, this.ownMemberNumber))
      .sort((left, right) => left.sentAt - right.sentAt)
      .slice(-limit);
  }

  /** Derive the visible self-chat preview without deleting raw history. */
  async #withoutHiddenSelfPreview(conversation: ConversationMeta): Promise<ConversationMeta> {
    if (conversation.peerNumber !== this.ownMemberNumber) return conversation;
    const records = [
      ...await this.repository.getMessages(conversation.peerNumber, this.settings.getSection("linkChat").maxMessagesPerConversation),
      ...(this.#ephemeralMessages.get(conversation.peerNumber) ?? []),
    ];
    const echoes = legacySelfBeepEchoes(records, this.ownMemberNumber);
    const visible = records.filter(message => !echoes.has(message) && !isReconnectNotice(message, this.ownMemberNumber))
      .sort((left, right) => left.sentAt - right.sentAt);
    if (visible.length === records.length) return conversation;
    const newest = visible.at(-1);
    return { ...conversation,
      lastMessage: newest ? cleanBeepMessageContent(newest.content) : "",
      lastMessageAt: newest?.sentAt ?? 0,
      lastDirection: newest?.direction ?? "incoming",
      unread: Math.min(conversation.unread, visible.filter(message => message.direction === "incoming" && !message.read).length),
    };
  }

  async listMedia(limit = 300): Promise<ChatMediaItem[]> {
    const conversations = await this.listConversations();
    const media = new Map<string, ChatMediaItem>();
    // Keep IndexedDB work bounded on accounts with a large chat list. Eight parallel reads are
    // quick in practice without opening hundreds of transactions at once.
    for (let index = 0; index < conversations.length; index += 8) {
      const messageGroups = await Promise.all(
        conversations.slice(index, index + 8).map(async (conversation) => ({
          conversation,
          messages: await this.getMessages(conversation.peerNumber, 500),
        })),
      );
      for (const { conversation, messages } of messageGroups) {
        for (const message of messages) {
          for (const link of parseMessageLinks(message.content)) {
            if (!link.image) continue;
            const item: ChatMediaItem = {
              url: link.url,
              provider: galleryMediaProvider(link.url),
              peerNumber: conversation.peerNumber,
              peerName: conversationDisplayName(conversation),
              direction: message.direction,
              sentAt: message.sentAt,
              messageId: message.id,
            };
            const previous = media.get(item.url);
            if (!previous || previous.sentAt < item.sentAt) media.set(item.url, item);
          }
        }
      }
    }
    return [...media.values()]
      .sort((left, right) => right.sentAt - left.sentAt)
      .slice(0, Math.max(1, Math.min(1_000, limit)));
  }

  #notifyCloudRead(peer: number, sequence: number, generation?: string): void {
    if (generation === undefined) this.onCloudRead?.(peer, sequence);
    else this.onCloudRead?.(peer, sequence, generation);
  }

  async markRead(peerNumber: number): Promise<void> {
    await this.#enqueuePeerMutation(peerNumber, () => this.#markReadUnlocked(peerNumber));
  }

  async #markReadUnlocked(peerNumber: number): Promise<void> {
    const conversation = await this.#getVisibleConversationUnlocked(peerNumber);
    if (!conversation) return;
    const messages = await this.#getMessagesUnlocked(peerNumber, this.settings.getSection("linkChat").maxMessagesPerConversation);
    let sequence = 0;
    for (const message of messages) {
      if (message.direction !== "incoming") continue;
      if (this.cloudReadGeneration === undefined || message.cloudGeneration === this.cloudReadGeneration)
        sequence = Math.max(sequence, message.cloudSequence ?? 0);
      if (!message.read && this.settings.getSection("linkChat").saveHistory) await this.repository.addMessage({ ...message, read: true });
    }
    for (const message of this.#ephemeralMessages.get(peerNumber) ?? []) message.read = true;
    for (const message of this.#cloudHistory.get(peerNumber)?.values() ?? []) if (message.direction === "incoming") message.read = true;
    if (conversation.unread) await this.#saveConversation({ ...conversation, unread: 0 });
    if (sequence) this.#notifyCloudRead(peerNumber, sequence, this.cloudReadGeneration);
  }

  async markUnread(peerNumber: number): Promise<void> {
    await this.#enqueuePeerMutation(peerNumber, async () => {
      const conversation = await this.#getVisibleConversationUnlocked(peerNumber);
      if (!conversation || conversation.unread > 0) return;
      await this.#saveConversation({ ...conversation, unread: 1 });
    });
  }

  /** Shares the global mutation barrier with incoming messages and history changes. */
  async markAllRead(): Promise<void> {
    await this.#enqueueGlobalMutation(async () => {
      for (const conversation of await this.listConversations()) {
        await this.#markReadUnlocked(conversation.peerNumber);
      }
    });
  }

  async setPeerName(peerNumber: number, peerName: string): Promise<void> {
    const name = peerName.trim();
    if (!name) return;
    await this.#enqueuePeerMutation(peerNumber, async () => {
      const conversation = await this.#getVisibleConversationUnlocked(peerNumber);
      if (!conversation || conversation.peerName === name) return;
      await this.#saveConversation({ ...conversation, peerName: name });
    });
  }

  async setLocalAlias(peerNumber: number, value: string): Promise<string | undefined> {
    const localAlias = normalizeLocalAlias(value);
    return this.#enqueuePeerMutation(peerNumber, async () => {
      const conversation = await this.#getVisibleConversationUnlocked(peerNumber);
      if (!conversation) return undefined;
      if (conversation.localAlias === localAlias) return localAlias;
      const updated = { ...conversation };
      if (localAlias) updated.localAlias = localAlias;
      else delete updated.localAlias;
      await this.#saveConversation(updated);
      return localAlias;
    });
  }

  async removeConversation(peerNumber: number): Promise<void> {
    this.#peerHistoryGeneration.set(peerNumber, (this.#peerHistoryGeneration.get(peerNumber) ?? 0) + 1);
    await this.#enqueuePeerMutation(peerNumber, async () => {
      const previous = await this.#getStoredConversationUnlocked(peerNumber);
      this.#ephemeralMessages.delete(peerNumber);
      this.#cloudHistory.delete(peerNumber);
      this.#ephemeralConversations.delete(peerNumber);
      await this.repository.deleteConversation(peerNumber);
      this.presentation?.forget(row => row.peer === peerNumber);
      if (!previous) return;
      await this.#saveConversation({
        peerNumber,
        peerName: previous.peerName,
        hiddenAt: Date.now(),
        lastMessage: "",
        lastMessageAt: 0,
        lastDirection: "incoming",
        unread: 0,
        pinned: false,
        draft: "",
      });
    });
  }

  async setDraft(peerNumber: number, peerName: string, draft: string): Promise<void> {
    await this.#enqueuePeerMutation(peerNumber, async () => {
      const conversation =
        (await this.#getVisibleConversationUnlocked(peerNumber)) ??
        (await this.#ensureConversationUnlocked(peerNumber, peerName));
      await this.#saveConversation({ ...conversation, draft });
    });
  }

  async consumeSentDraft(peerNumber: number, submitted: string): Promise<void> {
    await this.#enqueuePeerMutation(peerNumber, async () => {
      const conversation = await this.#getVisibleConversationUnlocked(peerNumber);
      if (!conversation) return;
      const draft = remainingDraftAfterSend(conversation.draft, submitted);
      if (draft !== conversation.draft) await this.#saveConversation({ ...conversation, draft });
    });
  }

  async togglePinned(peerNumber: number): Promise<boolean> {
    return this.#enqueuePeerMutation(peerNumber, async () => {
      const conversation = await this.#getVisibleConversationUnlocked(peerNumber);
      if (!conversation) return false;
      const pinned = !conversation.pinned;
      await this.#saveConversation({ ...conversation, pinned });
      return pinned;
    });
  }

  async totalUnread(): Promise<number> {
    const conversations = await this.listConversations();
    return conversations.reduce((total, conversation) => total + (conversationMuted(conversation.muteUntil) ? 0 : conversation.unread), 0);
  }

  async mute(peerNumber: number, until: number): Promise<void> {
    if (!Number.isSafeInteger(until) || until < -1) throw new Error("Invalid mute duration");
    await this.#enqueuePeerMutation(peerNumber, async () => {
      const conversation = await this.#getVisibleConversationUnlocked(peerNumber);
      if (conversation) await this.#saveConversation({ ...conversation, muteUntil: until });
    });
  }

  async prune(): Promise<number> {
    const config = this.settings.getSection("linkChat");
    if (!config.saveHistory) return 0;
    const cutoff = Date.now() - config.retentionDays * DAY_MS;
    return this.#enqueueGlobalMutation(async () => {
      const removed = await this.repository.deleteMessagesOlderThan(cutoff);
      // Dropped text obeys device retention. Content-free deletion records still hide the same Cloud archive rows.
      this.presentation?.forget(row => row.at < cutoff && row.text !== null);
      for (const conversation of await this.repository.listConversations()) {
        if (conversation.lastMessageAt >= cutoff) continue;
        const messages = await this.repository.getMessages(
          conversation.peerNumber,
          config.maxMessagesPerConversation,
        );
        const newest = messages.at(-1);
        await this.repository.putConversation(newest
          ? {
              ...conversation,
              peerName: newest.peerName || conversation.peerName,
              lastMessage: newest.content,
              lastMessageAt: newest.sentAt,
              lastDirection: newest.direction,
              unread: messages.filter(
                (message) => message.direction === "incoming" && !message.read,
              ).length,
            }
          : {
              ...conversation,
              lastMessage: "",
              lastMessageAt: 0,
              lastDirection: "incoming",
              unread: 0,
            });
      }
      return removed;
    });
  }

  async clearHistory(): Promise<boolean> {
    this.#historyGeneration++;
    return this.#enqueueGlobalMutation(async () => {
      try {
        const durable = this.repository.clearAllDurably
          ? await this.repository.clearAllDurably()
          : await this.repository.clearAll().then(() => true);
        if (durable) this.presentation?.clear();
        return durable;
      } finally {
        this.#ephemeralMessages.clear();
        this.#cloudHistory.clear();
        this.#ephemeralConversations.clear();
      }
    });
  }

  async #getVisibleConversationUnlocked(
    peerNumber: number,
  ): Promise<ConversationMeta | undefined> {
    const conversation = await this.#getStoredConversationUnlocked(peerNumber);
    return conversation?.hiddenAt === undefined ? conversation : undefined;
  }

  #enqueuePeerMutation<T>(peerNumber: number, mutation: () => Promise<T>): Promise<T> {
    // Capture the global barrier synchronously. Maintenance requested after this call waits for
    // this peer tail; peer work requested after maintenance waits for its new global tail.
    const global = this.#globalMutationTail;
    const previous = this.#peerMutationTails.get(peerNumber) ?? Promise.resolve();
    const result = Promise.all([global, previous]).then(() => mutation());
    // Store an always-fulfilled tail so one failed repository write cannot poison later work.
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.#peerMutationTails.set(peerNumber, tail);
    void tail.then(() => {
      // A newer operation may already have installed its own tail for this peer.
      if (this.#peerMutationTails.get(peerNumber) === tail) {
        this.#peerMutationTails.delete(peerNumber);
      }
    });
    return result;
  }

  #enqueueGlobalMutation<T>(mutation: () => Promise<T>): Promise<T> {
    const previousGlobal = this.#globalMutationTail;
    const activePeers = [...this.#peerMutationTails.values()];
    const result = Promise.all([previousGlobal, ...activePeers]).then(() => mutation());
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    // Installing the barrier before yielding ensures subsequently requested peer work cannot
    // pass clear/prune, while the peer snapshot above contains every earlier mutation.
    this.#globalMutationTail = tail;
    void tail.then(() => {
      if (this.#globalMutationTail === tail) this.#globalMutationTail = Promise.resolve();
    });
    return result;
  }

  async #saveConversation(conversation: ConversationMeta): Promise<void> {
    if (this.settings.getSection("linkChat").saveHistory) {
      await this.repository.putConversation(conversation);
      this.#ephemeralConversations.delete(conversation.peerNumber);
    } else {
      this.#ephemeralConversations.set(conversation.peerNumber, structuredClone(conversation));
    }
  }

  async #repairConversationPreviewUnlocked(
    conversation: ConversationMeta,
  ): Promise<ConversationMeta> {
    const canonical = canonicalizeConversationPreview(conversation);
    if (canonical === conversation) return conversation;
    try {
      await this.repository.putConversation(canonical);
    } catch {
      // Rendering old history must not fail merely because a best-effort metadata repair could
      // not be committed. The cleaned preview is still returned for this session.
    }
    return canonical;
  }

  async #repairStoredMessage(message: LinkMessage): Promise<LinkMessage> {
    const canonical = canonicalizeStoredMessage(message);
    if (canonical === message) return message;
    try {
      // Chat repositories use message ids as put keys, so this replaces the legacy row rather
      // than adding a duplicate. Account-synced wrappers also mark the cleaned snapshot dirty.
      await this.repository.addMessage(canonical);
    } catch {
      // A read remains useful even when a best-effort legacy-row repair cannot be committed.
    }
    return canonical;
  }
}

export function conversationDisplayName(conversation: ConversationMeta): string {
  return conversation.localAlias?.trim() || conversation.peerName;
}

function preferredPeerName(
  previousName: string | undefined,
  eventName: string,
  peerNumber: number,
): string {
  const fallback = `Member ${peerNumber}`;
  const previous = previousName?.trim();
  const incoming = eventName.trim();
  if (previous && previous !== fallback) return previous;
  return incoming || previous || fallback;
}

function normalizeLocalAlias(value: string): string | undefined {
  const alias = value.replace(/[\u0000-\u001f\u007f]/gu, "").replace(/\s+/gu, " ").trim().slice(0, 40);
  return alias || undefined;
}

function canonicalizeBeepEvent(event: BeepEvent): BeepEvent {
  const content = cleanBeepMessageContent(event.content);
  return content === event.content ? event : { ...event, content };
}

function canonicalizeConversationPreview(conversation: ConversationMeta): ConversationMeta {
  const lastMessage = cleanBeepMessageContent(conversation.lastMessage);
  return lastMessage === conversation.lastMessage
    ? conversation
    : { ...conversation, lastMessage };
}

function canonicalizeStoredMessage(message: LinkMessage): LinkMessage {
  const content = cleanBeepMessageContent(message.content);
  return content === message.content ? message : { ...message, content };
}

export function galleryMediaProvider(value: string): ChatMediaItem["provider"] {
  try {
    const host = new URL(value).hostname.toLocaleLowerCase();
    if (host === "files.catbox.moe") return "catbox";
    if (host === "litter.catbox.moe") return "litterbox";
  } catch {
    // parseMessageLinks already validates URLs; keep a harmless fallback for hostile globals.
  }
  return "other";
}
