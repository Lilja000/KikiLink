import type { ConversationMeta, LinkMessage } from "../core/types";

export interface ChatRepository {
  addMessage(message: LinkMessage): Promise<void>;
  getMessages(peerNumber: number, limit?: number): Promise<LinkMessage[]>;
  getConversation(peerNumber: number): Promise<ConversationMeta | undefined>;
  listConversations(): Promise<ConversationMeta[]>;
  putConversation(conversation: ConversationMeta): Promise<void>;
  deleteConversation(peerNumber: number): Promise<void>;
  /** Deletes one peer's messages at or before a portable deletion tombstone. */
  deleteMessagesForConversationAtOrBefore(peerNumber: number, timestamp: number): Promise<number>;
  deleteMessagesOlderThan(timestamp: number): Promise<number>;
  trimConversation(peerNumber: number, keepNewest: number): Promise<number>;
  clearAll(): Promise<void>;
  /**
   * Clears the active view and reports whether older durable rows can return after a reload.
   * Wrappers that can fall back to session memory should implement this explicitly.
   */
  clearAllDurably?(): Promise<boolean>;
  /**
   * Returns false when reads are only a partial/session fallback and must not replace the
   * account-portable chat snapshot. Repositories without a guard are treated as complete.
   */
  canSafelyCapturePortableSnapshot?(): boolean;
  close(): void;
}
