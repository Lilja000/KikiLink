import type { ConversationMeta, LinkMessage } from "../core/types";
import type { ChatRepository } from "./chat-repository";

export class MemoryChatRepository implements ChatRepository {
  readonly #messages = new Map<string, LinkMessage>();
  readonly #conversations = new Map<number, ConversationMeta>();

  async addMessage(message: LinkMessage): Promise<void> {
    this.#messages.set(message.id, structuredClone(message));
  }

  async getMessages(peerNumber: number, limit = 200): Promise<LinkMessage[]> {
    return [...this.#messages.values()]
      .filter((message) => message.peerNumber === peerNumber)
      .sort((left, right) => left.sentAt - right.sentAt)
      .slice(-limit)
      .map((message) => structuredClone(message));
  }

  async getConversation(peerNumber: number): Promise<ConversationMeta | undefined> {
    const conversation = this.#conversations.get(peerNumber);
    return conversation ? structuredClone(conversation) : undefined;
  }

  async listConversations(): Promise<ConversationMeta[]> {
    return [...this.#conversations.values()]
      .sort(sortConversations)
      .map((conversation) => structuredClone(conversation));
  }

  async putConversation(conversation: ConversationMeta): Promise<void> {
    this.#conversations.set(conversation.peerNumber, structuredClone(conversation));
  }

  async deleteConversation(peerNumber: number): Promise<void> {
    this.#conversations.delete(peerNumber);
    for (const [id, message] of this.#messages) {
      if (message.peerNumber === peerNumber) this.#messages.delete(id);
    }
  }

  async deleteMessagesOlderThan(timestamp: number): Promise<number> {
    let removed = 0;
    for (const [id, message] of this.#messages) {
      if (message.sentAt >= timestamp) continue;
      this.#messages.delete(id);
      removed += 1;
    }
    return removed;
  }

  async deleteMessagesForConversationAtOrBefore(
    peerNumber: number,
    timestamp: number,
  ): Promise<number> {
    let removed = 0;
    for (const [id, message] of this.#messages) {
      if (message.peerNumber !== peerNumber || message.sentAt > timestamp) continue;
      this.#messages.delete(id);
      removed += 1;
    }
    return removed;
  }

  async trimConversation(peerNumber: number, keepNewest: number): Promise<number> {
    const messages = [...this.#messages.values()]
      .filter((message) => message.peerNumber === peerNumber)
      .sort((left, right) => right.sentAt - left.sentAt);

    let removed = 0;
    for (const message of messages.slice(keepNewest)) {
      this.#messages.delete(message.id);
      removed += 1;
    }
    return removed;
  }

  async clearAll(): Promise<void> {
    this.#messages.clear();
    this.#conversations.clear();
  }

  close(): void {}
}

export function sortConversations(left: ConversationMeta, right: ConversationMeta): number {
  if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
  return right.lastMessageAt - left.lastMessageAt;
}
