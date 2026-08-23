import type { ConversationMeta, LinkMessage } from "../core/types";

export interface ChatRepository {
  addMessage(message: LinkMessage): Promise<void>;
  getMessages(peerNumber: number, limit?: number): Promise<LinkMessage[]>;
  getConversation(peerNumber: number): Promise<ConversationMeta | undefined>;
  listConversations(): Promise<ConversationMeta[]>;
  putConversation(conversation: ConversationMeta): Promise<void>;
  deleteMessagesOlderThan(timestamp: number): Promise<number>;
  trimConversation(peerNumber: number, keepNewest: number): Promise<number>;
  clearAll(): Promise<void>;
  close(): void;
}
