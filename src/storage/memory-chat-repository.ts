import type { ConversationMeta, LinkMessage } from "../core/types";
import type { ChatCaptureResult, ChatRepository } from "./chat-repository";
import {hydratePortableMessage,hydratePortableConversation,preparePortableChatRecords,type PortableChatRecords} from './portable-chat-records';

export class MemoryChatRepository implements ChatRepository {
  readonly #messages = new Map<string, LinkMessage>();
  readonly #conversations = new Map<number, ConversationMeta>();

  async hydratePortableChats(records:PortableChatRecords,current:()=>boolean=()=>true):Promise<void> {
    if(!current())throw new Error('Portable chat restoration cancelled.');
    const prepared=preparePortableChatRecords(records),messages:LinkMessage[]=[],conversations:ConversationMeta[]=[];
    for(const row of prepared.messages){const next=hydratePortableMessage(this.#messages.get(row.id),row);if(next)messages.push(structuredClone(next));}
    for(const row of prepared.conversations){const next=hydratePortableConversation(this.#conversations.get(row.peerNumber),row);if(next)conversations.push(structuredClone(next));}
    // Clone every prospective change first: a failure never leaves a partial memory import.
    if(!current())throw new Error('Portable chat restoration cancelled.');
    for(const row of messages)this.#messages.set(row.id,row);
    for(const row of conversations)this.#conversations.set(row.peerNumber,row);
  }

  async captureMessage(message: LinkMessage, conversation: ConversationMeta, keepNewest: number): Promise<ChatCaptureResult> {
    // Prepare both clones before touching either map so a clone failure cannot split the pair.
    const storedMessage = structuredClone(message);
    const storedConversation = structuredClone(conversation);
    const messages = [...this.#messages.values()]
      .filter(row => row.peerNumber === message.peerNumber && row.id !== message.id)
      .concat(storedMessage)
      .sort((left, right) => right.sentAt - left.sentAt);
    const removed = messages.slice(keepNewest);
    this.#messages.set(message.id, storedMessage);
    this.#conversations.set(conversation.peerNumber, storedConversation);
    for (const row of removed) this.#messages.delete(row.id);
    return {
      removed: removed.length,
      oldestRetainedAt: messages.slice(0, keepNewest).at(-1)?.sentAt,
    };
  }

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
