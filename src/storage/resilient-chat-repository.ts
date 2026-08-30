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

  deleteConversation(peerNumber: number): Promise<void> {
    return this.#run((repository) => repository.deleteConversation(peerNumber));
  }

  deleteMessagesOlderThan(timestamp: number): Promise<number> {
    return this.#run((repository) => repository.deleteMessagesOlderThan(timestamp));
  }

  deleteMessagesForConversationAtOrBefore(
    peerNumber: number,
    timestamp: number,
  ): Promise<number> {
    return this.#run((repository) =>
      repository.deleteMessagesForConversationAtOrBefore(peerNumber, timestamp));
  }

  trimConversation(peerNumber: number, keepNewest: number): Promise<number> {
    return this.#run((repository) => repository.trimConversation(peerNumber, keepNewest));
  }

  clearAll(): Promise<void> {
    return this.#run((repository) => repository.clearAll());
  }

  async clearAllDurably(): Promise<boolean> {
    if (this.#usingFallback) {
      await this.fallback.clearAll();
      return false;
    }

    try {
      if (this.primary.clearAllDurably) return await this.primary.clearAllDurably();
      await this.primary.clearAll();
      return true;
    } catch (error) {
      this.#useFallback(error);
      await this.fallback.clearAll();
      return false;
    }
  }

  canSafelyCapturePortableSnapshot(): boolean {
    return (
      !this.#usingFallback &&
      this.primary.canSafelyCapturePortableSnapshot?.() !== false
    );
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
      this.#useFallback(error);
      return operation(this.fallback);
    }
  }

  #useFallback(error: unknown): void {
    if (this.#usingFallback) return;
    this.#usingFallback = true;
    this.primary.close();
    console.warn("[KikiLink:storage] IndexedDB unavailable; using session-only memory storage", error);
  }
}
