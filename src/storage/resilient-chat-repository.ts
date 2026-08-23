import type { ConversationMeta, LinkMessage } from "../core/types";
import type { ChatRepository } from "./chat-repository";

export class ResilientChatRepository implements ChatRepository {
  #usingFallback = false;

  constructor(
    private readonly primary: ChatRepository,
    private readonly fallback: ChatRepository,
  ) {}

  addMessage(message: LinkMessage): Promise<void> {
    return this.#run((repository) => repository.addMessage(message));
  }

  getMessages(peerNumber: number, limit?: number): Promise<LinkMessage[]> {
    return this.#run((repository) => repository.getMessages(peerNumber, limit));
  }

  getConversation(peerNumber: number): Promise<ConversationMeta | undefined> {
    return this.#run((repository) => repository.getConversation(peerNumber));
  }

  listConversations(): Promise<ConversationMeta[]> {
    return this.#run((repository) => repository.listConversations());
  }

  putConversation(conversation: ConversationMeta): Promise<void> {
    return this.#run((repository) => repository.putConversation(conversation));
  }

  deleteMessagesOlderThan(timestamp: number): Promise<number> {
    return this.#run((repository) => repository.deleteMessagesOlderThan(timestamp));
  }

  trimConversation(peerNumber: number, keepNewest: number): Promise<number> {
    return this.#run((repository) => repository.trimConversation(peerNumber, keepNewest));
  }

  clearAll(): Promise<void> {
    return this.#run((repository) => repository.clearAll());
  }

  close(): void {
    this.primary.close();
    this.fallback.close();
  }

  async #run<Result>(operation: (repository: ChatRepository) => Promise<Result>): Promise<Result> {
    if (this.#usingFallback) return operation(this.fallback);

    try {
      return await operation(this.primary);
    } catch (error) {
      this.#usingFallback = true;
      this.primary.close();
      console.warn("[KikiLink:storage] IndexedDB unavailable; using session-only memory storage", error);
      return operation(this.fallback);
    }
  }
}
