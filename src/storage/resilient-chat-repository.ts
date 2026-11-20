import type { ConversationMeta, LinkMessage } from "../core/types";
import type { ChatCaptureResult, ChatRepository } from "./chat-repository";
import {preparePortableChatRecords,type PortableChatRecords} from './portable-chat-records';

export class ResilientChatRepository implements ChatRepository {
  #usingFallback = false;
  #hydrationGeneration=0;

  constructor(
    private readonly primary: ChatRepository,
    private readonly fallback: ChatRepository,
  ) {}

  hydratePortableChats(records:PortableChatRecords,current:()=>boolean=()=>true):Promise<void> {
    const generation=this.#hydrationGeneration,valid=()=>generation===this.#hydrationGeneration&&current(),prepared=preparePortableChatRecords(records);
    return this.#run(repository=>{
      if(!valid())throw new Error('Portable chat restoration cancelled.');
      if(!repository.hydratePortableChats)throw new Error('This chat store cannot safely restore portable history.');
      return repository.hydratePortableChats(prepared,valid);
    },valid);
  }

  captureMessage(message: LinkMessage, conversation: ConversationMeta, keepNewest: number): Promise<ChatCaptureResult> {
    // Retry the whole capture in the active store, never just its failed conversation/trim step.
    return this.#run(repository => repository.captureMessage(message, conversation, keepNewest));
  }

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

  deviceHistoryDatabase(owner: number): string | undefined {
    return this.#usingFallback ? undefined : this.primary.deviceHistoryDatabase?.(owner);
  }

  close(): void {
    ++this.#hydrationGeneration;
    this.primary.close();
    this.fallback.close();
  }

  async #run<Result>(operation: (repository: ChatRepository) => Promise<Result>,current:()=>boolean=()=>true): Promise<Result> {
    if(!current())throw new Error('Portable chat restoration cancelled.');
    if (this.#usingFallback) return operation(this.fallback);

    try {
      const result = await operation(this.primary);
      if(!current())throw new Error('Portable chat restoration cancelled.');
      // Another in-flight operation may have switched stores while this one was awaiting
      // IndexedDB. A successful write must still become visible in the now-active store.
      if (!this.#usingFallback) return result;
    } catch (error) {
      if(!current())throw error;
      this.#useFallback(error);
    }
    if(!current())throw new Error('Portable chat restoration cancelled.');
    return operation(this.fallback);
  }

  #useFallback(error: unknown): void {
    if (this.#usingFallback) return;
    this.#usingFallback = true;
    this.primary.close();
    console.warn("[KikiLink:storage] IndexedDB unavailable; using session-only memory storage", error);
  }
}
