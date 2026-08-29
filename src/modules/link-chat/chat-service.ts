import { cleanBeepMessageContent } from "../../bc/message-content";
import type { SettingsStore } from "../../core/settings";
import type { BeepEvent, ConversationMeta, LinkMessage } from "../../core/types";
import type { ChatRepository } from "../../storage/chat-repository";
import { sortConversations } from "../../storage/memory-chat-repository";
import { createId } from "../../utils/id";
import { parseMessageLinks } from "./media";

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

  constructor(
    private readonly repository: ChatRepository,
    private readonly settings: SettingsStore,
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
  ): Promise<LinkMessage> {
    const message: LinkMessage = {
      ...canonicalEvent,
      id: createId("beep"),
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
      lastMessage: canonicalEvent.content,
      lastMessageAt: canonicalEvent.sentAt,
      lastDirection: canonicalEvent.direction,
      unread:
        canonicalEvent.direction === "incoming" && !activeConversation
          ? (previous?.unread ?? 0) + 1
          : 0,
      pinned: previous?.pinned ?? false,
      draft: previous?.draft ?? "",
    };

    const config = this.settings.get().linkChat;
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

  async captureRecent(event: BeepEvent): Promise<boolean> {
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
      return structuredClone(canonical);
    }
    const persisted = await this.repository.getConversation(peerNumber);
    return persisted ? this.#repairConversationPreviewUnlocked(persisted) : undefined;
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
    return [...merged.values()]
      .filter((conversation) => conversation.hiddenAt === undefined)
      .sort(sortConversations);
  }

  async getMessages(peerNumber: number, limit = 300): Promise<LinkMessage[]> {
    return this.#enqueuePeerMutation(peerNumber, () =>
      this.#getMessagesUnlocked(peerNumber, limit),
    );
  }

  async #getMessagesUnlocked(peerNumber: number, limit = 300): Promise<LinkMessage[]> {
    const persisted = await this.repository.getMessages(peerNumber, limit);
    const ephemeral = this.#ephemeralMessages.get(peerNumber) ?? [];
    const canonicalPersisted = await Promise.all(
      persisted.map((message) => this.#repairStoredMessage(message)),
    );
    const canonicalEphemeral = ephemeral.map(canonicalizeStoredMessage);
    if (canonicalEphemeral.some((message, index) => message !== ephemeral[index])) {
      this.#ephemeralMessages.set(peerNumber, canonicalEphemeral);
    }
    return [...canonicalPersisted, ...canonicalEphemeral]
      .sort((left, right) => left.sentAt - right.sentAt)
      .slice(-limit);
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
      if (!conversation || conversation.unread === 0) return;
      await this.#saveConversation({ ...conversation, unread: 0 });
    });
  }

  async markUnread(peerNumber: number): Promise<void> {
    await this.#enqueuePeerMutation(peerNumber, async () => {
      const conversation = await this.#getVisibleConversationUnlocked(peerNumber);
      if (!conversation || conversation.unread > 0) return;
      await this.#saveConversation({ ...conversation, unread: 1 });
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
    return conversations.reduce((total, conversation) => total + conversation.unread, 0);
  }

  async prune(): Promise<number> {
    const config = this.settings.get().linkChat;
    if (!config.saveHistory) return 0;
    const cutoff = Date.now() - config.retentionDays * DAY_MS;
    return this.#enqueueGlobalMutation(() => this.repository.deleteMessagesOlderThan(cutoff));
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
    if (this.settings.get().linkChat.saveHistory) {
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
