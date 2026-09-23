import { cleanBeepMessageContent } from "../../bc/message-content";
import { isReconnectNotice } from "../../bc/reconnect-notice";
import type { SettingsStore } from "../../core/settings";
import type { BeepEvent, ConversationMeta, LinkMessage } from "../../core/types";
import type { ChatRepository } from "../../storage/chat-repository";
import { sortConversations } from "../../storage/memory-chat-repository";
import { createId } from "../../utils/id";
import { parseMessageLinks } from "./media";
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
  readonly #ephemeralMessages = new Map<number, LinkMessage[]>();
  readonly #ephemeralConversations = new Map<number, ConversationMeta>();
  readonly #peerMutationTails = new Map<number, Promise<void>>();
  #globalMutationTail: Promise<void> = Promise.resolve();
  onCloudRead: ((peer: number, sequence: number) => void) | undefined;

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
    cloud?: Pick<LinkMessage, "id" | "clientMessageId" | "cloudId" | "cloudSequence" | "delivery" | "deliveryError">,
  ): Promise<LinkMessage> {
    const message: LinkMessage = {
      ...canonicalEvent,
      id: cloud?.id ?? createId("beep"),
      ...cloud,
      read: canonicalEvent.direction === "outgoing" || activeConversation,
    };
    const previous = await this.#getStoredConversationUnlocked(canonicalEvent.peerNumber);
    const conversation: ConversationMeta = {
      peerNumber: canonicalEvent.peerNumber,
      peerName: preferredPeerName(
        previous?.peerName,
        canonicalEvent.peerName,
        canonicalEvent.peerNumber,
      ),
      ...(previous?.localAlias ? { localAlias: previous.localAlias } : {}),
      lastMessage: previous && previous.lastMessageAt > canonicalEvent.sentAt ? previous.lastMessage : canonicalEvent.content,
      lastMessageAt: Math.max(previous?.lastMessageAt ?? 0, canonicalEvent.sentAt),
      lastDirection: previous && previous.lastMessageAt > canonicalEvent.sentAt ? previous.lastDirection : canonicalEvent.direction,
      unread:
        canonicalEvent.direction === "incoming" && !activeConversation
          ? (previous?.unread ?? 0) + 1
          : activeConversation ? 0 : (previous?.unread ?? 0),
      pinned: previous?.pinned ?? false,
      draft: previous?.draft ?? "",
      ...(previous?.muteUntil !== undefined ? { muteUntil: previous.muteUntil } : {}),
    };

    const config = this.settings.getSection("linkChat");
    if (config.saveHistory) {
      await this.repository.addMessage(message);
      await this.repository.putConversation(conversation);
      await this.repository.trimConversation(
        canonicalEvent.peerNumber,
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

  async captureCloud(event: BeepEvent, metadata: Pick<LinkMessage, "id" | "clientMessageId" | "cloudId" | "cloudSequence" | "delivery" | "deliveryError">, active: boolean): Promise<{ message: LinkMessage; fresh: boolean }> {
    return this.#enqueuePeerMutation(event.peerNumber, async () => {
      const old = (await this.#getMessagesUnlocked(event.peerNumber, this.settings.getSection("linkChat").maxMessagesPerConversation)).find(m => m.id === metadata.id);
      if (old) return { message: old, fresh: false };
      const message = await this.#captureUnlocked(canonicalizeBeepEvent(event), active, metadata);
      if (active && message.direction === "incoming" && message.cloudSequence) this.onCloudRead?.(event.peerNumber, message.cloudSequence);
      return { message, fresh: true };
    });
  }
  async updateDelivery(peer: number, id: string, metadata: Partial<Pick<LinkMessage, "cloudId" | "cloudSequence" | "delivery" | "deliveryError">>): Promise<LinkMessage | undefined> {
    return this.#enqueuePeerMutation(peer, async () => {
      const message = (await this.#getMessagesUnlocked(peer, this.settings.getSection("linkChat").maxMessagesPerConversation)).find(m => m.id === id);
      if (!message) return;
      const safeMetadata = message.delivery === "read" && metadata.delivery && metadata.delivery !== "read"
        ? { ...metadata, delivery: "read" as const, deliveryError: "" }
        : metadata;
      const updated = { ...message, ...safeMetadata };
      const ephemeral = this.#ephemeralMessages.get(peer);
      if (ephemeral?.some(m => m.id === id)) this.#ephemeralMessages.set(peer, ephemeral.map(m => m.id === id ? updated : m));
      else await this.repository.addMessage(updated);
      return structuredClone(updated);
    });
  }
  async reconcileCloudReceipt(peer: number, cloudId: string, delivery: "delivered" | "read"): Promise<LinkMessage | undefined> {
    return this.#enqueuePeerMutation(peer, async () => {
      const message = (await this.#getMessagesUnlocked(peer, this.settings.getSection("linkChat").maxMessagesPerConversation))
        .find(m => m.direction === "outgoing" && m.cloudId === cloudId);
      if (!message || message.delivery === "read" || message.delivery === delivery) return message ? structuredClone(message) : undefined;
      const updated: LinkMessage = { ...message, delivery, deliveryError: "" };
      const ephemeral = this.#ephemeralMessages.get(peer);
      if (ephemeral?.some(m => m.id === message.id)) this.#ephemeralMessages.set(peer, ephemeral.map(m => m.id === message.id ? updated : m));
      else await this.repository.addMessage(updated);
      return structuredClone(updated);
    });
  }
  async reconcileCloudRead(peer: number, sequence: number): Promise<void> {
    await this.#enqueuePeerMutation(peer, async () => {
      const messages = await this.#getMessagesUnlocked(peer, this.settings.getSection("linkChat").maxMessagesPerConversation);
      const newlyRead = messages.filter(m => m.direction === "incoming" && !m.read && m.cloudSequence && m.cloudSequence <= sequence);
      for (const message of newlyRead) if (!this.#ephemeralMessages.get(peer)?.some(m => m.id === message.id)) await this.repository.addMessage({ ...message, read: true });
      const ephemeral = this.#ephemeralMessages.get(peer);
      if (ephemeral) for (const message of ephemeral) if (message.cloudSequence && message.cloudSequence <= sequence) message.read = true;
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
      return conversation?.hiddenAt === undefined ? conversation : undefined;
    });
  }

  async #getStoredConversationUnlocked(peerNumber: number): Promise<ConversationMeta | undefined> {
    const ephemeral = this.#ephemeralConversations.get(peerNumber);
    if (ephemeral) {
      const canonical = canonicalizeConversationPreview(ephemeral);
      if (canonical !== ephemeral) this.#ephemeralConversations.set(peerNumber, canonical);
      return this.#withoutReconnectPreview(structuredClone(canonical));
    }
    const persisted = await this.repository.getConversation(peerNumber);
    return persisted ? this.#withoutReconnectPreview(await this.#repairConversationPreviewUnlocked(persisted)) : undefined;
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
    return (await Promise.all([...merged.values()].map(conversation => this.#withoutReconnectPreview(conversation))))
      .filter((conversation) => conversation.hiddenAt === undefined)
      .sort(sortConversations);
  }

  async getMessages(peerNumber: number, limit = 300): Promise<LinkMessage[]> {
    return this.#enqueuePeerMutation(peerNumber, () =>
      this.#getMessagesUnlocked(peerNumber, limit),
    );
  }

  async #getMessagesUnlocked(peerNumber: number, limit = 300): Promise<LinkMessage[]> {
    const persisted = await this.repository.getMessages(peerNumber, peerNumber === this.ownMemberNumber
      ? Math.max(limit, this.settings.getSection("linkChat").maxMessagesPerConversation) : limit);
    const ephemeral = this.#ephemeralMessages.get(peerNumber) ?? [];
    const canonicalPersisted = await Promise.all(
      persisted.map((message) => this.#repairStoredMessage(message)),
    );
    const canonicalEphemeral = ephemeral.map(canonicalizeStoredMessage);
    if (canonicalEphemeral.some((message, index) => message !== ephemeral[index])) {
      this.#ephemeralMessages.set(peerNumber, canonicalEphemeral);
    }
    return [...canonicalPersisted, ...canonicalEphemeral]
      .filter(message => !isReconnectNotice(message, this.ownMemberNumber))
      .sort((left, right) => left.sentAt - right.sentAt)
      .slice(-limit);
  }

  /** Hide legacy notices without deleting portable history or other self-messages. */
  async #withoutReconnectPreview(conversation: ConversationMeta): Promise<ConversationMeta> {
    if (conversation.peerNumber !== this.ownMemberNumber) return conversation;
    const records = [
      ...await this.repository.getMessages(conversation.peerNumber, this.settings.getSection("linkChat").maxMessagesPerConversation),
      ...(this.#ephemeralMessages.get(conversation.peerNumber) ?? []),
    ];
    const hidden = records.filter(message => isReconnectNotice(message, this.ownMemberNumber));
    if (!hidden.length) return conversation;
    const visible = records.filter(message => !isReconnectNotice(message, this.ownMemberNumber))
      .sort((left, right) => left.sentAt - right.sentAt);
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

  async markRead(peerNumber: number): Promise<void> {
    await this.#enqueuePeerMutation(peerNumber, async () => {
      const conversation = await this.#getVisibleConversationUnlocked(peerNumber);
      if (!conversation) return;
      const messages = await this.#getMessagesUnlocked(peerNumber, this.settings.getSection("linkChat").maxMessagesPerConversation);
      let sequence = 0;
      for (const message of messages) {
        if (message.direction !== "incoming") continue;
        sequence = Math.max(sequence, message.cloudSequence ?? 0);
        if (!message.read && this.settings.getSection("linkChat").saveHistory) await this.repository.addMessage({ ...message, read: true });
      }
      for (const message of this.#ephemeralMessages.get(peerNumber) ?? []) message.read = true;
      if (conversation.unread) await this.#saveConversation({ ...conversation, unread: 0 });
      if (sequence) this.onCloudRead?.(peerNumber, sequence);
    });
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
        if (conversation.unread > 0) await this.#saveConversation({ ...conversation, unread: 0 });
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
    await this.#enqueuePeerMutation(peerNumber, async () => {
      const previous = await this.#getStoredConversationUnlocked(peerNumber);
      this.#ephemeralMessages.delete(peerNumber);
      this.#ephemeralConversations.delete(peerNumber);
      await this.repository.deleteConversation(peerNumber);
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
    return this.#enqueueGlobalMutation(async () => {
      try {
        return this.repository.clearAllDurably
          ? await this.repository.clearAllDurably()
          : await this.repository.clearAll().then(() => true);
      } finally {
        this.#ephemeralMessages.clear();
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
