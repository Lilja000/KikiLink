import type { BeepEvent, ConversationMeta, LinkMessage } from "../../core/types";
import type { SettingsStore } from "../../core/settings";
import type { ChatRepository } from "../../storage/chat-repository";
import { sortConversations } from "../../storage/memory-chat-repository";
import { createId } from "../../utils/id";

const DAY_MS = 24 * 60 * 60 * 1000;

export class ChatService {
  readonly #ephemeralMessages = new Map<number, LinkMessage[]>();
  readonly #ephemeralConversations = new Map<number, ConversationMeta>();

  constructor(
    private readonly repository: ChatRepository,
    private readonly settings: SettingsStore,
  ) {}

  async capture(event: BeepEvent, activeConversation: boolean): Promise<LinkMessage> {
    const message: LinkMessage = {
      ...event,
      id: createId("beep"),
      read: event.direction === "outgoing" || activeConversation,
    };
    const previous = await this.getConversation(event.peerNumber);
    const conversation: ConversationMeta = {
      peerNumber: event.peerNumber,
      peerName: event.peerName || previous?.peerName || `Member ${event.peerNumber}`,
      lastMessage: event.content,
      lastMessageAt: event.sentAt,
      lastDirection: event.direction,
      unread:
        event.direction === "incoming" && !activeConversation ? (previous?.unread ?? 0) + 1 : 0,
      pinned: previous?.pinned ?? false,
      draft: previous?.draft ?? "",
    };

    const config = this.settings.get().linkChat;
    if (config.saveHistory) {
      await this.repository.addMessage(message);
      await this.repository.putConversation(conversation);
      await this.repository.trimConversation(event.peerNumber, config.maxMessagesPerConversation);
    } else {
      const messages = this.#ephemeralMessages.get(event.peerNumber) ?? [];
      messages.push(message);
      this.#ephemeralMessages.set(
        event.peerNumber,
        messages.slice(-config.maxMessagesPerConversation),
      );
      this.#ephemeralConversations.set(event.peerNumber, conversation);
    }

    return message;
  }

  async ensureConversation(peerNumber: number, peerName: string): Promise<ConversationMeta> {
    const existing = await this.getConversation(peerNumber);
    if (existing) return existing;

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
    const ephemeral = this.#ephemeralConversations.get(peerNumber);
    return ephemeral ? structuredClone(ephemeral) : this.repository.getConversation(peerNumber);
  }

  async listConversations(): Promise<ConversationMeta[]> {
    const persisted = await this.repository.listConversations();
    const merged = new Map(persisted.map((conversation) => [conversation.peerNumber, conversation]));
    for (const conversation of this.#ephemeralConversations.values()) {
      merged.set(conversation.peerNumber, structuredClone(conversation));
    }
    return [...merged.values()].sort(sortConversations);
  }

  async getMessages(peerNumber: number, limit = 300): Promise<LinkMessage[]> {
    const persisted = await this.repository.getMessages(peerNumber, limit);
    const ephemeral = this.#ephemeralMessages.get(peerNumber) ?? [];
    return [...persisted, ...ephemeral]
      .sort((left, right) => left.sentAt - right.sentAt)
      .slice(-limit);
  }

  async markRead(peerNumber: number): Promise<void> {
    const conversation = await this.getConversation(peerNumber);
    if (!conversation || conversation.unread === 0) return;
    await this.#saveConversation({ ...conversation, unread: 0 });
  }

  async setDraft(peerNumber: number, peerName: string, draft: string): Promise<void> {
    const conversation =
      (await this.getConversation(peerNumber)) ?? (await this.ensureConversation(peerNumber, peerName));
    await this.#saveConversation({ ...conversation, draft });
  }

  async togglePinned(peerNumber: number): Promise<boolean> {
    const conversation = await this.getConversation(peerNumber);
    if (!conversation) return false;
    const pinned = !conversation.pinned;
    await this.#saveConversation({ ...conversation, pinned });
    return pinned;
  }

  async totalUnread(): Promise<number> {
    const conversations = await this.listConversations();
    return conversations.reduce((total, conversation) => total + conversation.unread, 0);
  }

  async prune(): Promise<number> {
    const config = this.settings.get().linkChat;
    if (!config.saveHistory) return 0;
    return this.repository.deleteMessagesOlderThan(Date.now() - config.retentionDays * DAY_MS);
  }

  async clearHistory(): Promise<void> {
    await this.repository.clearAll();
    this.#ephemeralMessages.clear();
    this.#ephemeralConversations.clear();
  }

  async #saveConversation(conversation: ConversationMeta): Promise<void> {
    if (this.settings.get().linkChat.saveHistory) {
      await this.repository.putConversation(conversation);
      this.#ephemeralConversations.delete(conversation.peerNumber);
    } else {
      this.#ephemeralConversations.set(conversation.peerNumber, structuredClone(conversation));
    }
  }
}
