import type {
  KeyValueStorage,
  KeyValueStorageReadResult,
} from "../../core/settings";
import type { MessageDirection } from "../../core/types";
import { createId } from "../../utils/id";

export const GROUP_CHAT_STORAGE_KEY = "kikilink:group-chats:v1";
export const GROUP_PACKET_MAX_CHARS = 700;
export const GROUP_TITLE_MAX_CHARS = 60;
export const GROUP_MAX_COUNT = 30;
export const GROUP_MAX_MEMBERS = 5;
export const GROUP_MIN_MEMBERS = 3;
export const GROUP_MAX_MESSAGES = 500;
export const GROUP_INVITE_RATE_BURST = 4;
export const GROUP_INVITE_RATE_REFILL_MS = 15_000;
export const GROUP_MESSAGE_RATE_BURST = 60;
export const GROUP_MESSAGE_RATE_REFILL_MS = 250;
export const GROUP_PERSISTENCE_DELAY_MS = 300;

const GROUP_STORAGE_VERSION = 1;
const GROUP_MAX_TOTAL_MESSAGES = 3_000;
const GROUP_MAX_TOMBSTONES = 60;
const GROUP_MAX_REPLAY_IDS_PER_GROUP = 1_000;
const GROUP_MAX_REPLAY_IDS_TOTAL = 3_000;
const GROUP_MAX_RATE_SENDERS = 128;
const GROUP_RATE_STATE_TTL_MS = 10 * 60_000;
const GROUP_INVITE_REPAIR_INTERVAL_MS = 60_000;
const GROUP_ID_MAX_CHARS = 64;
const MESSAGE_ID_MAX_CHARS = 64;
const REMOTE_TIMESTAMP_SKEW_MS = 5 * 60_000;
const MAX_DATE_TIMESTAMP_MS = 8_640_000_000_000_000;
const GROUP_ID_PATTERN = /^group_[a-z0-9_-]{8,58}$/u;
const MESSAGE_ID_PATTERN = /^gmsg_[a-z0-9_-]{8,57}$/u;
const DISALLOWED_CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const DISALLOWED_CONTROL_PATTERN_GLOBAL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;

/**
 * JSON quotes, slashes, tabs, and newlines can expand to two characters. Unpaired UTF-16
 * surrogates are rejected, so a factor of two is the exact worst case for accepted content.
 */
const WORST_MESSAGE_ENVELOPE_CHARS = JSON.stringify({
  t: "gm",
  v: 1,
  g: "g".repeat(GROUP_ID_MAX_CHARS),
  i: "i".repeat(MESSAGE_ID_MAX_CHARS),
  c: "",
  u: Number.MAX_SAFE_INTEGER,
}).length;

export const GROUP_MESSAGE_MAX_CONTENT = Math.floor(
  (GROUP_PACKET_MAX_CHARS - WORST_MESSAGE_ENVELOPE_CHARS) / 2,
);
export const GROUP_DRAFT_MAX_CHARS = GROUP_MESSAGE_MAX_CONTENT;

export interface GroupConversation {
  groupId: string;
  title: string;
  creatorNumber: number;
  /** Canonical, sorted, immutable membership including the local account. */
  memberNumbers: number[];
  /** Locally resolved display names; never used as identity or authorization. */
  memberNames: Record<string, string>;
  createdAt: number;
  updatedAt: number;
  lastMessage: string;
  lastMessageAt: number;
  lastSenderNumber?: number;
  unread: number;
  pinned: boolean;
  draft: string;
}

/** Public collection item type retained under the concise product-domain name. */
export type Groups = GroupConversation;

export interface GroupMessage {
  id: string;
  groupId: string;
  senderNumber: number;
  senderName: string;
  direction: MessageDirection;
  content: string;
  sentAt: number;
  read: boolean;
}

export interface GroupProtocolEvent {
  senderNumber: number;
  payload: string;
}

export interface GroupChatTransport {
  getOwnMemberNumber(): number;
  getMemberName(memberNumber: number): string;
  sendKikiLinkProtocol(target: number, payload: string): unknown;
  isKnownFriend?(memberNumber: number): boolean;
  /** Room visibility is useful for display only and is never sufficient invitation trust. */
  isMemberInCurrentRoom?(memberNumber: number): boolean;
  getPlayerRelationships?(memberNumber: number): readonly string[];
}

export interface GroupPersistenceState {
  degraded: boolean;
  pendingChanges: boolean;
}

export interface GroupDeliveryFailure {
  memberNumber: number;
  message: string;
}

export interface GroupCreationResult {
  group: GroupConversation;
  handedOffTo: number[];
  failed: GroupDeliveryFailure[];
}

export interface GroupSendResult {
  message: GroupMessage;
  /** False when every local point-to-point handoff failed and the message was not added to history. */
  persisted: boolean;
  handedOffTo: number[];
  failed: GroupDeliveryFailure[];
}

export type GroupChatUpdate =
  | { kind: "group-added"; groupId: string; group: GroupConversation; incoming: boolean }
  | { kind: "message"; groupId: string; message: GroupMessage; incoming: boolean }
  | { kind: "group-updated"; groupId: string; group: GroupConversation }
  | { kind: "group-removed"; groupId: string }
  | { kind: "persistence"; state: GroupPersistenceState }
  | { kind: "cleared" };

export interface GroupChatServiceOptions {
  now?: () => number;
  idFactory?: (prefix: "group" | "gmsg") => string;
  persistenceDelayMs?: number;
}

export interface GroupInvitePacket {
  t: "gi";
  v: 1;
  g: string;
  m: number[];
  n: string;
  u: number;
}

export interface GroupWireMessagePacket {
  t: "gm";
  v: 1;
  g: string;
  i: string;
  c: string;
  u: number;
}

export type GroupChatPacket = GroupInvitePacket | GroupWireMessagePacket;

interface StoredGroupChatState {
  version: 1;
  groups: GroupConversation[];
  messages: GroupMessage[];
  tombstones: Array<{ groupId: string; removedAt: number }>;
  messageTombstones: Array<{ groupId: string; messageId: string; seenAt: number }>;
}

type GroupChatListener = (update: GroupChatUpdate) => void;

interface InboundRateBucket {
  tokens: number;
  refilledAt: number;
}

interface InboundRateState {
  lastSeenAt: number;
  invites: InboundRateBucket;
  messages: InboundRateBucket;
}

/**
 * Addon-only group conversations delivered as one authenticated BC packet per remote member.
 * Membership is immutable in protocol v1, which keeps every participant's authorization view
 * deterministic without relying on a KikiLink server or accepting remote membership rewrites.
 */
export class GroupChatService {
  readonly #groups = new Map<string, GroupConversation>();
  readonly #messages = new Map<string, GroupMessage[]>();
  readonly #tombstones = new Map<string, number>();
  readonly #messageTombstones = new Map<string, Map<string, number>>();
  readonly #inboundRates = new Map<number, InboundRateState>();
  readonly #lastInviteRepairAt = new Map<string, number>();
  readonly #listeners = new Set<GroupChatListener>();
  readonly #mutationQueues = new Map<string, Promise<unknown>>();
  readonly #now: () => number;
  readonly #idFactory: (prefix: "group" | "gmsg") => string;
  readonly #persistenceDelayMs: number;
  readonly #accountMemberNumber: number;
  #accountInvalidated = false;
  #persistenceTimer: ReturnType<typeof setTimeout> | undefined;
  #persistenceDirty = false;
  #persistenceDegraded = false;
  #persistenceWriteBlocked = false;
  #closing = false;
  #destroyed = false;
  #destroyPromise: Promise<GroupPersistenceState> | undefined;

  constructor(
    private readonly transport: GroupChatTransport,
    private readonly storage: KeyValueStorage,
    options: GroupChatServiceOptions = {},
  ) {
    this.#now = options.now ?? Date.now;
    this.#idFactory = options.idFactory ?? ((prefix) => createId(prefix));
    this.#persistenceDelayMs = integerInRange(
      options.persistenceDelayMs,
      0,
      5_000,
      GROUP_PERSISTENCE_DELAY_MS,
    );
    const accountMemberNumber = this.transport.getOwnMemberNumber();
    if (!validMemberNumber(accountMemberNumber)) {
      throw new Error("A valid local BC account is required");
    }
    this.#accountMemberNumber = accountMemberNumber;
    this.#load();
  }

  subscribe(listener: GroupChatListener): () => void {
    if (this.#closing || this.#destroyed) return () => undefined;
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  getPersistenceState(): GroupPersistenceState {
    return {
      degraded: this.#persistenceDegraded,
      pendingChanges: this.#persistenceDirty,
    };
  }

  listGroups(): GroupConversation[] {
    if (!this.#isBoundAccountCurrent()) return [];
    return [...this.#groups.values()]
      .sort(sortGroups)
      .map((group) => cloneGroup(group));
  }

  getGroup(groupId: string): GroupConversation | undefined {
    if (!this.#isBoundAccountCurrent()) return undefined;
    const group = this.#groups.get(groupId);
    return group ? cloneGroup(group) : undefined;
  }

  getMessages(groupId: string, limit = GROUP_MAX_MESSAGES): GroupMessage[] {
    if (!this.#isBoundAccountCurrent()) return [];
    const boundedLimit = integerInRange(limit, 1, GROUP_MAX_MESSAGES, GROUP_MAX_MESSAGES);
    return (this.#messages.get(groupId) ?? [])
      .slice(-boundedLimit)
      .map((message) => structuredClone(message));
  }

  totalUnread(): number {
    if (!this.#isBoundAccountCurrent()) return 0;
    let unread = 0;
    for (const group of this.#groups.values()) unread += group.unread;
    return unread;
  }

  async createGroup(
    selectedMemberNumbers: Iterable<number>,
    requestedTitle = "",
  ): Promise<GroupCreationResult> {
    this.#assertOpen();
    return this.#enqueue("$groups", () => {
      this.#assertBoundAccount();
      if (this.#groups.size >= GROUP_MAX_COUNT) {
        throw new Error(`KikiLink can keep up to ${GROUP_MAX_COUNT} group chats`);
      }
      const ownMemberNumber = this.#ownMemberNumber();
      const members = canonicalMembers([ownMemberNumber, ...selectedMemberNumbers]);
      assertMemberCount(members);
      for (const memberNumber of members) {
        if (memberNumber !== ownMemberNumber && this.#isBlocked(memberNumber)) {
          throw new Error(`Member ${memberNumber} is blocked or ghosted`);
        }
      }

      const groupId = this.#newUniqueId("group", (candidate) =>
        this.#groups.has(candidate) || this.#tombstones.has(candidate),
      );
      const createdAt = safeNow(this.#now);
      const memberNames = this.#memberNames(members);
      const title = normalizeTitle(requestedTitle) || defaultGroupTitle(members, memberNames, ownMemberNumber);
      const group: GroupConversation = {
        groupId,
        title,
        creatorNumber: ownMemberNumber,
        memberNumbers: members,
        memberNames,
        createdAt,
        updatedAt: createdAt,
        lastMessage: "",
        lastMessageAt: 0,
        unread: 0,
        pinned: false,
        draft: "",
      };
      const packet: GroupInvitePacket = {
        t: "gi",
        v: 1,
        g: groupId,
        m: members,
        n: title,
        u: createdAt,
      };
      const payload = serializeGroupChatPacket(packet);

      this.#groups.set(groupId, group);
      this.#messages.set(groupId, []);
      this.#schedulePersistence();
      this.#notify({ kind: "group-added", groupId, group: cloneGroup(group), incoming: false });
      const delivery = this.#multicast(group, payload);
      return { group: cloneGroup(group), ...delivery };
    });
  }

  async receiveProtocol(
    event: GroupProtocolEvent,
    activeGroupId?: string,
  ): Promise<boolean> {
    if (this.#closing || this.#destroyed || !this.#isBoundAccountCurrent()) return false;
    if (!this.#ensurePersistenceWritable()) return false;
    if (!validMemberNumber(event.senderNumber) || event.senderNumber === this.#ownMemberNumber()) {
      return false;
    }
    if (this.#isBlocked(event.senderNumber, true)) return false;
    const packet = parseGroupChatPacket(event.payload);
    if (!packet) return false;
    if (!this.#consumeInboundRate(event.senderNumber, packet.t)) return false;

    return this.#enqueue(packet.g, () => {
      if (!this.#isBoundAccountCurrent()) return false;
      if (packet.t === "gi") return this.#receiveInvite(event.senderNumber, packet);
      return this.#receiveMessage(event.senderNumber, packet, activeGroupId);
    });
  }

  async sendMessage(groupId: string, value: string): Promise<GroupSendResult> {
    this.#assertOpen();
    return this.#enqueue(groupId, () => {
      this.#assertBoundAccount();
      const group = this.#requireGroup(groupId);
      const content = normalizeMessageContent(value);
      if (!content) throw new Error("A group message cannot be empty");
      if (content.length > GROUP_MESSAGE_MAX_CONTENT) {
        throw new Error(
          `A group message cannot exceed ${GROUP_MESSAGE_MAX_CONTENT} characters`,
        );
      }
      const id = this.#newUniqueId("gmsg", (candidate) =>
        this.#hasSeenMessageId(groupId, candidate),
      );
      const sentAt = safeNow(this.#now);
      const ownMemberNumber = this.#ownMemberNumber();
      const message: GroupMessage = {
        id,
        groupId,
        senderNumber: ownMemberNumber,
        senderName: this.#memberName(ownMemberNumber),
        direction: "outgoing",
        content,
        sentAt,
        read: true,
      };
      const payload = serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: groupId,
        i: id,
        c: content,
        u: sentAt,
      });
      this.#repairInvitesBeforeMessage(group, ownMemberNumber, sentAt);
      const delivery = this.#multicast(group, payload);
      const persisted = delivery.handedOffTo.length > 0;
      if (persisted) {
        this.#appendMessage(group, message);
        this.#schedulePersistence();
        this.#notify({ kind: "message", groupId, message: structuredClone(message), incoming: false });
      }
      return { message: structuredClone(message), persisted, ...delivery };
    });
  }

  async markRead(groupId: string): Promise<void> {
    this.#assertOpen();
    await this.#enqueue(groupId, () => {
      this.#assertBoundAccount();
      const group = this.#groups.get(groupId);
      if (!group || group.unread === 0) return;
      const messages = this.#messages.get(groupId) ?? [];
      for (const message of messages) {
        if (message.direction === "incoming") message.read = true;
      }
      group.unread = 0;
      group.updatedAt = safeNow(this.#now);
      this.#schedulePersistence();
      this.#notify({ kind: "group-updated", groupId, group: cloneGroup(group) });
    });
  }

  async setDraft(groupId: string, value: string): Promise<string> {
    this.#assertOpen();
    return this.#enqueue(groupId, () => {
      this.#assertBoundAccount();
      const group = this.#requireGroup(groupId);
      const draft = normalizeDraft(value);
      if (draft === group.draft) return draft;
      group.draft = draft;
      group.updatedAt = safeNow(this.#now);
      this.#schedulePersistence();
      this.#notify({ kind: "group-updated", groupId, group: cloneGroup(group) });
      return draft;
    });
  }

  async togglePinned(groupId: string): Promise<boolean> {
    this.#assertOpen();
    return this.#enqueue(groupId, () => {
      this.#assertBoundAccount();
      const group = this.#requireGroup(groupId);
      group.pinned = !group.pinned;
      group.updatedAt = safeNow(this.#now);
      this.#schedulePersistence();
      this.#notify({ kind: "group-updated", groupId, group: cloneGroup(group) });
      return group.pinned;
    });
  }

  async removeGroup(groupId: string): Promise<boolean> {
    this.#assertOpen();
    return this.#enqueue(groupId, () => {
      this.#assertBoundAccount();
      if (!this.#groups.delete(groupId)) return false;
      this.#messages.delete(groupId);
      this.#messageTombstones.delete(groupId);
      this.#lastInviteRepairAt.delete(groupId);
      this.#tombstones.set(groupId, safeNow(this.#now));
      this.#trimTombstones();
      this.#markPersistenceDirty();
      this.#flushPersistenceNow();
      this.#notify({ kind: "group-removed", groupId });
      return true;
    });
  }

  async clear(): Promise<boolean> {
    this.#assertOpen(true);
    await this.#settleMutations();
    this.#assertBoundAccount();
    this.#groups.clear();
    this.#messages.clear();
    this.#tombstones.clear();
    this.#messageTombstones.clear();
    this.#inboundRates.clear();
    this.#lastInviteRepairAt.clear();
    this.#clearPersistenceTimer();
    this.#persistenceDirty = true;
    // Clear is the one explicit operation allowed to replace storage that could not be parsed or
    // read at startup. A failed clear stays dirty so a later flush retries the validated empty state.
    this.#persistenceWriteBlocked = false;
    const durable = this.#removePersistedState();
    this.#notify({ kind: "cleared" });
    return durable;
  }

  /** Removes stored messages older than the supplied absolute timestamp. */
  async prune(olderThan: number): Promise<number> {
    this.#assertOpen();
    if (!Number.isFinite(olderThan) || olderThan < 0) return 0;
    await this.#settleMutations();
    this.#assertBoundAccount();
    let removed = 0;
    for (const [groupId, messages] of this.#messages) {
      const kept = messages.filter((message) => message.sentAt >= olderThan);
      removed += messages.length - kept.length;
      if (kept.length === messages.length) continue;
      const seenAt = safeNow(this.#now);
      for (const message of messages) {
        if (message.sentAt < olderThan) this.#rememberMessageId(groupId, message.id, seenAt);
      }
      this.#messages.set(groupId, kept);
      const group = this.#groups.get(groupId);
      if (group) this.#recomputeGroupSummary(group, kept);
    }
    if (removed > 0) {
      this.#markPersistenceDirty();
      this.#flushPersistenceNow();
    }
    return removed;
  }

  /** Flushes every mutation that reached the service before this call. */
  async flush(): Promise<GroupPersistenceState> {
    this.#clearPersistenceTimer();
    await this.#settleMutations();
    this.#flushPersistenceNow();
    return this.getPersistenceState();
  }

  /** Synchronous best effort for the browser pagehide boundary. */
  flushNow(): GroupPersistenceState {
    this.#clearPersistenceTimer();
    this.#flushPersistenceNow();
    return this.getPersistenceState();
  }

  destroy(): Promise<GroupPersistenceState> {
    if (this.#destroyPromise) return this.#destroyPromise;
    this.#closing = true;
    this.#clearPersistenceTimer();
    this.#destroyPromise = (async () => {
      await this.#settleMutations();
      this.#flushPersistenceNow();
      this.#listeners.clear();
      this.#destroyed = true;
      return this.getPersistenceState();
    })();
    return this.#destroyPromise;
  }

  #receiveInvite(senderNumber: number, packet: GroupInvitePacket): boolean {
    if (this.#tombstones.has(packet.g)) return false;
    if (!packet.m.includes(this.#ownMemberNumber()) || !packet.m.includes(senderNumber)) return false;
    if (!this.#canAutoAccept(senderNumber)) return false;

    const existing = this.#groups.get(packet.g);
    if (existing) {
      return (
        existing.creatorNumber === senderNumber &&
        sameMembers(existing.memberNumbers, packet.m)
      );
    }
    if (this.#groups.size >= GROUP_MAX_COUNT) return false;

    const receivedAt = safeNow(this.#now);
    const createdAt = clampRemoteTimestamp(packet.u, receivedAt);
    const memberNames = this.#memberNames(packet.m);
    const group: GroupConversation = {
      groupId: packet.g,
      title: packet.n,
      creatorNumber: senderNumber,
      memberNumbers: [...packet.m],
      memberNames,
      createdAt,
      updatedAt: receivedAt,
      lastMessage: "",
      lastMessageAt: 0,
      unread: 0,
      pinned: false,
      draft: "",
    };
    this.#groups.set(packet.g, group);
    this.#messages.set(packet.g, []);
    this.#schedulePersistence();
    this.#notify({ kind: "group-added", groupId: packet.g, group: cloneGroup(group), incoming: true });
    return true;
  }

  #receiveMessage(
    senderNumber: number,
    packet: GroupWireMessagePacket,
    activeGroupId: string | undefined,
  ): boolean {
    const group = this.#groups.get(packet.g);
    if (!group || !group.memberNumbers.includes(senderNumber)) return false;
    if (this.#hasSeenMessageId(packet.g, packet.i)) return false;

    const receivedAt = safeNow(this.#now);
    const message: GroupMessage = {
      id: packet.i,
      groupId: packet.g,
      senderNumber,
      senderName: this.#memberName(senderNumber),
      direction: "incoming",
      content: packet.c,
      sentAt: clampRemoteTimestamp(packet.u, receivedAt),
      read: activeGroupId === packet.g,
    };
    group.memberNames = { ...group.memberNames, [senderNumber]: message.senderName };
    this.#appendMessage(group, message);
    this.#schedulePersistence();
    this.#notify({ kind: "message", groupId: packet.g, message: structuredClone(message), incoming: true });
    return true;
  }

  #appendMessage(group: GroupConversation, message: GroupMessage): void {
    const messages = this.#messages.get(group.groupId) ?? [];
    messages.push(message);
    messages.sort(compareMessages);
    if (messages.length > GROUP_MAX_MESSAGES) {
      const removed = messages.splice(0, messages.length - GROUP_MAX_MESSAGES);
      const seenAt = safeNow(this.#now);
      for (const item of removed) this.#rememberMessageId(group.groupId, item.id, seenAt);
    }
    this.#messages.set(group.groupId, messages);
    this.#recomputeGroupSummary(group, messages);
    this.#trimTotalMessages();
  }

  #recomputeGroupSummary(group: GroupConversation, messages: GroupMessage[]): void {
    const last = messages.at(-1);
    group.lastMessage = last?.content ?? "";
    group.lastMessageAt = last?.sentAt ?? 0;
    if (last) group.lastSenderNumber = last.senderNumber;
    else delete group.lastSenderNumber;
    group.unread = messages.reduce(
      (total, message) => total + Number(message.direction === "incoming" && !message.read),
      0,
    );
    group.updatedAt = safeNow(this.#now);
  }

  #multicast(
    group: GroupConversation,
    payload: string,
  ): Pick<GroupSendResult, "handedOffTo" | "failed"> {
    const ownMemberNumber = this.#ownMemberNumber();
    const handedOffTo: number[] = [];
    const failed: GroupDeliveryFailure[] = [];
    for (const memberNumber of group.memberNumbers) {
      if (memberNumber === ownMemberNumber) continue;
      if (this.#isBlocked(memberNumber)) {
        failed.push({ memberNumber, message: "Member is blocked or ghosted" });
        continue;
      }
      try {
        this.transport.sendKikiLinkProtocol(memberNumber, payload);
        handedOffTo.push(memberNumber);
      } catch (error) {
        failed.push({
          memberNumber,
          message: error instanceof Error ? error.message : "KikiLink packet could not be sent",
        });
      }
    }
    return { handedOffTo, failed };
  }

  #repairInvitesBeforeMessage(
    group: GroupConversation,
    ownMemberNumber: number,
    now: number,
  ): void {
    if (group.creatorNumber !== ownMemberNumber) return;
    const lastRepairAt = this.#lastInviteRepairAt.get(group.groupId);
    if (
      lastRepairAt !== undefined &&
      now >= lastRepairAt &&
      now - lastRepairAt < GROUP_INVITE_REPAIR_INTERVAL_MS
    ) {
      return;
    }
    const payload = serializeGroupChatPacket({
      t: "gi",
      v: 1,
      g: group.groupId,
      m: [...group.memberNumbers],
      n: group.title,
      u: group.createdAt,
    });
    const repair = this.#multicast(group, payload);
    if (repair.handedOffTo.length > 0) this.#lastInviteRepairAt.set(group.groupId, now);
  }

  #consumeInboundRate(senderNumber: number, packetType: GroupChatPacket["t"]): boolean {
    const now = safeNow(this.#now);
    this.#pruneInboundRates(now);
    let state = this.#inboundRates.get(senderNumber);
    if (!state) {
      if (this.#inboundRates.size >= GROUP_MAX_RATE_SENDERS) this.#evictOldestInboundRate();
      state = {
        lastSeenAt: now,
        invites: { tokens: GROUP_INVITE_RATE_BURST, refilledAt: now },
        messages: { tokens: GROUP_MESSAGE_RATE_BURST, refilledAt: now },
      };
      this.#inboundRates.set(senderNumber, state);
    }
    state.lastSeenAt = Math.max(state.lastSeenAt, now);
    return packetType === "gi"
      ? consumeRateToken(
          state.invites,
          GROUP_INVITE_RATE_BURST,
          GROUP_INVITE_RATE_REFILL_MS,
          now,
        )
      : consumeRateToken(
          state.messages,
          GROUP_MESSAGE_RATE_BURST,
          GROUP_MESSAGE_RATE_REFILL_MS,
          now,
        );
  }

  #pruneInboundRates(now: number): void {
    for (const [memberNumber, state] of this.#inboundRates) {
      if (now >= state.lastSeenAt && now - state.lastSeenAt > GROUP_RATE_STATE_TTL_MS) {
        this.#inboundRates.delete(memberNumber);
      }
    }
  }

  #evictOldestInboundRate(): void {
    let oldestMemberNumber: number | undefined;
    let oldestSeenAt = Number.POSITIVE_INFINITY;
    for (const [memberNumber, state] of this.#inboundRates) {
      if (state.lastSeenAt < oldestSeenAt) {
        oldestMemberNumber = memberNumber;
        oldestSeenAt = state.lastSeenAt;
      }
    }
    if (oldestMemberNumber !== undefined) this.#inboundRates.delete(oldestMemberNumber);
  }

  #hasSeenMessageId(groupId: string, messageId: string): boolean {
    if (this.#messageTombstones.get(groupId)?.has(messageId)) return true;
    return (this.#messages.get(groupId) ?? []).some((message) => message.id === messageId);
  }

  #rememberMessageId(groupId: string, messageId: string, seenAt: number): void {
    let ids = this.#messageTombstones.get(groupId);
    if (!ids) {
      ids = new Map<string, number>();
      this.#messageTombstones.set(groupId, ids);
    }
    if (ids.has(messageId)) return;
    ids.set(messageId, seenAt);
    while (ids.size > GROUP_MAX_REPLAY_IDS_PER_GROUP) {
      const oldest = oldestMessageTombstone(ids);
      if (!oldest) break;
      ids.delete(oldest);
    }
    this.#trimMessageTombstones();
  }

  #trimMessageTombstones(): void {
    let total = 0;
    for (const ids of this.#messageTombstones.values()) total += ids.size;
    if (total <= GROUP_MAX_REPLAY_IDS_TOTAL) return;
    const all = [...this.#messageTombstones.entries()]
      .flatMap(([groupId, ids]) =>
        [...ids].map(([messageId, seenAt]) => ({ groupId, messageId, seenAt })),
      );
    all.sort(compareMessageTombstones);
    for (const item of all.slice(0, total - GROUP_MAX_REPLAY_IDS_TOTAL)) {
      const ids = this.#messageTombstones.get(item.groupId);
      ids?.delete(item.messageId);
      if (ids?.size === 0) this.#messageTombstones.delete(item.groupId);
    }
  }

  #canAutoAccept(senderNumber: number): boolean {
    try {
      return this.transport.isKnownFriend?.(senderNumber) === true;
    } catch {
      // A guarded cross-realm BC object must not bypass the explicit friend trust boundary.
      return false;
    }
  }

  #isBlocked(memberNumber: number, failClosed = false): boolean {
    try {
      const relationships = this.transport.getPlayerRelationships?.(memberNumber) ?? [];
      return relationships.some((relationship) =>
        relationship === "blacklist" ||
        relationship === "blacklisted" ||
        relationship === "ghost" ||
        relationship === "ghosted",
      );
    } catch {
      return failClosed;
    }
  }

  #memberNames(memberNumbers: readonly number[]): Record<string, string> {
    const names: Record<string, string> = {};
    for (const memberNumber of memberNumbers) names[memberNumber] = this.#memberName(memberNumber);
    return names;
  }

  #memberName(memberNumber: number): string {
    try {
      return normalizeMemberName(this.transport.getMemberName(memberNumber), memberNumber);
    } catch {
      return `Member ${memberNumber}`;
    }
  }

  #ownMemberNumber(): number {
    return this.#accountMemberNumber;
  }

  #isBoundAccountCurrent(): boolean {
    if (this.#accountInvalidated) return false;
    try {
      const currentMemberNumber = this.transport.getOwnMemberNumber();
      if (currentMemberNumber === this.#accountMemberNumber) return true;
      // A readable, valid different identity is an actual account switch. Invalid/transient
      // reads still fail closed for this call without permanently destroying the bound session.
      if (validMemberNumber(currentMemberNumber)) this.#accountInvalidated = true;
    } catch {
      // Guarded cross-realm account data must not expose state for this call, but can recover.
    }
    return false;
  }

  #assertBoundAccount(): void {
    if (!this.#isBoundAccountCurrent()) {
      throw new Error("This group chat service belongs to a different BC account");
    }
  }

  #assertOpen(allowPersistenceBlocked = false): void {
    if (this.#closing || this.#destroyed) {
      throw new Error("This group chat service has been closed");
    }
    this.#assertBoundAccount();
    if (!allowPersistenceBlocked && !this.#ensurePersistenceWritable()) {
      throw new Error(
        "Group chat storage is unavailable or unsupported; retry after storage recovers or clear group history",
      );
    }
  }

  #ensurePersistenceWritable(): boolean {
    return !this.#persistenceWriteBlocked || this.#recoverPersistenceRead();
  }

  #requireGroup(groupId: string): GroupConversation {
    const group = this.#groups.get(groupId);
    if (!group) throw new Error("This group chat is no longer available");
    return group;
  }

  #newUniqueId(
    prefix: "group" | "gmsg",
    exists: (candidate: string) => boolean,
  ): string {
    const pattern = prefix === "group" ? GROUP_ID_PATTERN : MESSAGE_ID_PATTERN;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = this.#idFactory(prefix);
      if (pattern.test(candidate) && !exists(candidate)) return candidate;
    }
    throw new Error("KikiLink could not create a unique group identifier");
  }

  #enqueue<Result>(groupId: string, operation: () => Result | Promise<Result>): Promise<Result> {
    const previous = this.#mutationQueues.get(groupId) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    const settled = result.then(
      () => undefined,
      () => undefined,
    );
    this.#mutationQueues.set(groupId, settled);
    void settled.finally(() => {
      if (this.#mutationQueues.get(groupId) === settled) this.#mutationQueues.delete(groupId);
    });
    return result;
  }

  async #settleMutations(): Promise<void> {
    while (this.#mutationQueues.size > 0) {
      await Promise.allSettled([...this.#mutationQueues.values()]);
    }
  }

  #notify(update: GroupChatUpdate): void {
    if (!this.#isBoundAccountCurrent()) return;
    for (const listener of [...this.#listeners]) {
      try {
        listener(structuredClone(update));
      } catch (error) {
        console.error("[KikiLink:group-chat] Update listener failed", error);
      }
    }
  }

  #schedulePersistence(): void {
    this.#markPersistenceDirty();
    if (this.#closing || this.#destroyed || this.#persistenceTimer !== undefined) return;
    this.#persistenceTimer = setTimeout(() => {
      this.#persistenceTimer = undefined;
      this.#flushPersistenceNow();
    }, this.#persistenceDelayMs);
  }

  #markPersistenceDirty(): void {
    this.#persistenceDirty = true;
  }

  #clearPersistenceTimer(): void {
    if (this.#persistenceTimer !== undefined) clearTimeout(this.#persistenceTimer);
    this.#persistenceTimer = undefined;
  }

  #flushPersistenceNow(): boolean {
    if (this.#persistenceWriteBlocked && !this.#recoverPersistenceRead()) return false;
    if (!this.#persistenceDirty) {
      this.#setPersistenceDegraded(false);
      return true;
    }
    this.#trimTotalMessages();
    this.#trimMessageTombstones();
    let serialized: string;
    try {
      serialized = JSON.stringify(this.#storedState());
      this.storage.setItem(GROUP_CHAT_STORAGE_KEY, serialized);
      // AccountDataStorage deliberately contains backing-store exceptions. Verify retention so
      // group history can still report a degraded local store instead of promising durability.
      const retained = readStorageItem(this.storage, GROUP_CHAT_STORAGE_KEY);
      if (!retained.ok || retained.value !== serialized) {
        throw new Error("Browser storage did not retain the group state");
      }
    } catch {
      this.#setPersistenceDegraded(true);
      return false;
    }
    this.#persistenceDirty = false;
    this.#setPersistenceDegraded(false);
    return true;
  }

  #removePersistedState(): boolean {
    try {
      this.storage.removeItem(GROUP_CHAT_STORAGE_KEY);
      const retained = readStorageItem(this.storage, GROUP_CHAT_STORAGE_KEY);
      if (!retained.ok || retained.value !== null) {
        throw new Error("Browser storage did not remove the group state");
      }
      this.#persistenceDirty = false;
      this.#setPersistenceDegraded(false);
      return true;
    } catch {
      // A set of the validated empty state is a safe fallback for stores that cannot remove keys.
      return this.#flushPersistenceNow();
    }
  }

  #recoverPersistenceRead(): boolean {
    const read = readStorageItem(this.storage, GROUP_CHAT_STORAGE_KEY);
    if (!read.ok) return false;
    if (read.value) {
      const value = parseStoredGroupChatState(read.value, this.#accountMemberNumber);
      if (!value) return false;
      // Mutations stay blocked while the startup read is unresolved, so restoring here cannot
      // discard newer in-memory group state.
      this.#restoreStoredState(value);
    }
    this.#persistenceWriteBlocked = false;
    this.#setPersistenceDegraded(false);
    return true;
  }

  #setPersistenceDegraded(degraded: boolean): void {
    if (this.#persistenceDegraded === degraded) return;
    this.#persistenceDegraded = degraded;
    this.#notify({ kind: "persistence", state: this.getPersistenceState() });
  }

  #storedState(): StoredGroupChatState {
    const state: StoredGroupChatState = {
      version: GROUP_STORAGE_VERSION,
      groups: [...this.#groups.values()].sort(sortGroups).map((group) => cloneGroup(group)),
      messages: [...this.#messages.values()]
        .flat()
        .sort(compareMessages)
        .map((message) => structuredClone(message)),
      tombstones: [...this.#tombstones]
        .map(([groupId, removedAt]) => ({ groupId, removedAt }))
        .sort((left, right) => right.removedAt - left.removedAt)
        .slice(0, GROUP_MAX_TOMBSTONES),
      messageTombstones: [...this.#messageTombstones.entries()]
        .flatMap(([groupId, ids]) =>
          [...ids].map(([messageId, seenAt]) => ({ groupId, messageId, seenAt })),
        )
        .sort(compareMessageTombstones)
        .slice(-GROUP_MAX_REPLAY_IDS_TOTAL),
    };
    return state;
  }

  #load(): void {
    const read = readStorageItem(this.storage, GROUP_CHAT_STORAGE_KEY);
    if (!read.ok) {
      this.#persistenceWriteBlocked = true;
      this.#persistenceDegraded = true;
      return;
    }
    const raw = read.value;
    if (!raw) return;
    const value = parseStoredGroupChatState(raw, this.#accountMemberNumber);
    if (!value) {
      this.#persistenceWriteBlocked = true;
      this.#persistenceDegraded = true;
      return;
    }
    this.#restoreStoredState(value);
  }

  #restoreStoredState(value: StoredGroupChatState): void {
    this.#groups.clear();
    this.#messages.clear();
    this.#tombstones.clear();
    this.#messageTombstones.clear();
    this.#lastInviteRepairAt.clear();
    const ownMemberNumber = this.#accountMemberNumber;
    const storedGroups = value.groups;
    for (const candidate of storedGroups) {
      if (this.#groups.size >= GROUP_MAX_COUNT) break;
      const group = sanitizeStoredGroup(candidate, ownMemberNumber);
      if (!group || this.#groups.has(group.groupId)) continue;
      this.#groups.set(group.groupId, group);
      this.#messages.set(group.groupId, []);
    }

    {
      for (const candidate of value.messageTombstones.slice(-GROUP_MAX_REPLAY_IDS_TOTAL)) {
        if (
          !isRecord(candidate) ||
          !this.#groups.has(typeof candidate.groupId === "string" ? candidate.groupId : "") ||
          !validMessageId(candidate.messageId) ||
          !validTimestamp(candidate.seenAt)
        ) {
          continue;
        }
        this.#rememberMessageId(candidate.groupId as string, candidate.messageId, candidate.seenAt);
      }
    }

    const seenMessageIds = new Map<string, Set<string>>();
    const storedMessages = value.messages.slice(-GROUP_MAX_TOTAL_MESSAGES);
    for (const candidate of storedMessages) {
      const rawGroupId = isRecord(candidate) && typeof candidate.groupId === "string"
        ? candidate.groupId
        : "";
      const group = this.#groups.get(rawGroupId);
      if (!group) continue;
      const message = sanitizeStoredMessage(candidate, group, ownMemberNumber);
      if (!message) continue;
      const ids = seenMessageIds.get(group.groupId) ?? new Set<string>();
      if (ids.has(message.id)) continue;
      ids.add(message.id);
      seenMessageIds.set(group.groupId, ids);
      const messages = this.#messages.get(group.groupId) ?? [];
      messages.push(message);
      messages.sort(compareMessages);
      if (messages.length > GROUP_MAX_MESSAGES) {
        const evicted = messages.shift();
        if (evicted) {
          this.#rememberMessageId(
            group.groupId,
            evicted.id,
            clampRemoteTimestamp(evicted.sentAt, safeNow(this.#now)),
          );
        }
      }
      this.#messages.set(group.groupId, messages);
    }
    for (const [groupId, messages] of this.#messages) {
      const evictedIds = this.#messageTombstones.get(groupId);
      if (!evictedIds) continue;
      for (const message of messages) evictedIds.delete(message.id);
      if (evictedIds.size === 0) this.#messageTombstones.delete(groupId);
    }
    for (const group of this.#groups.values()) {
      this.#recomputeGroupSummary(group, this.#messages.get(group.groupId) ?? []);
    }

    {
      for (const candidate of value.tombstones.slice(0, GROUP_MAX_TOMBSTONES)) {
        if (!isRecord(candidate) || !validGroupId(candidate.groupId) || !validTimestamp(candidate.removedAt)) {
          continue;
        }
        if (!this.#groups.has(candidate.groupId)) {
          this.#tombstones.set(candidate.groupId, candidate.removedAt);
        }
      }
    }
    this.#trimTotalMessages();
    this.#trimMessageTombstones();
  }

  #trimTotalMessages(): void {
    let total = 0;
    for (const messages of this.#messages.values()) total += messages.length;
    if (total <= GROUP_MAX_TOTAL_MESSAGES) return;

    const chronological = [...this.#messages.entries()]
      .flatMap(([groupId, messages]) =>
        messages.map((message) => ({ groupId, message })),
      )
      .sort((left, right) => compareMessages(left.message, right.message));
    const remove = chronological.slice(0, total - GROUP_MAX_TOTAL_MESSAGES);
    const removedIds = new Map<string, Set<string>>();
    const seenAt = safeNow(this.#now);
    for (const item of remove) {
      const ids = removedIds.get(item.groupId) ?? new Set<string>();
      ids.add(item.message.id);
      removedIds.set(item.groupId, ids);
      this.#rememberMessageId(item.groupId, item.message.id, seenAt);
    }
    for (const [groupId, ids] of removedIds) {
      const kept = (this.#messages.get(groupId) ?? []).filter((message) => !ids.has(message.id));
      this.#messages.set(groupId, kept);
      const group = this.#groups.get(groupId);
      if (group) this.#recomputeGroupSummary(group, kept);
    }
  }

  #trimTombstones(): void {
    if (this.#tombstones.size <= GROUP_MAX_TOMBSTONES) return;
    const keep = [...this.#tombstones.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, GROUP_MAX_TOMBSTONES);
    this.#tombstones.clear();
    for (const [groupId, removedAt] of keep) this.#tombstones.set(groupId, removedAt);
  }
}

function readStorageItem(
  storage: KeyValueStorage,
  key: string,
): KeyValueStorageReadResult {
  try {
    const result = storage.getItemResult?.(key);
    if (result !== undefined) {
      if (result.ok === false) return result;
      return typeof result.value === "string" || result.value === null
        ? result
        : { ok: false };
    }
    const value = storage.getItem(key);
    return typeof value === "string" || value === null
      ? { ok: true, value }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}

function parseStoredGroupChatState(
  raw: string,
  ownMemberNumber: number,
): StoredGroupChatState | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
  if (
    !isRecord(value) ||
    value.version !== GROUP_STORAGE_VERSION ||
    !Array.isArray(value.groups) ||
    !Array.isArray(value.messages) ||
    !Array.isArray(value.tombstones) ||
    !Array.isArray(value.messageTombstones) ||
    value.groups.length > GROUP_MAX_COUNT ||
    value.messages.length > GROUP_MAX_TOTAL_MESSAGES ||
    value.tombstones.length > GROUP_MAX_TOMBSTONES ||
    value.messageTombstones.length > GROUP_MAX_REPLAY_IDS_TOTAL
  ) {
    return undefined;
  }

  const groups: GroupConversation[] = [];
  const groupsById = new Map<string, GroupConversation>();
  for (const candidate of value.groups) {
    const group = sanitizeStoredGroup(candidate, ownMemberNumber);
    if (!group || groupsById.has(group.groupId)) return undefined;
    groups.push(group);
    groupsById.set(group.groupId, group);
  }

  const messages: GroupMessage[] = [];
  const visibleMessageIds = new Set<string>();
  for (const candidate of value.messages) {
    const groupId = isRecord(candidate) && typeof candidate.groupId === "string"
      ? candidate.groupId
      : "";
    const group = groupsById.get(groupId);
    if (!group) return undefined;
    const message = sanitizeStoredMessage(candidate, group, ownMemberNumber);
    const identity = message ? `${message.groupId}\u0000${message.id}` : "";
    if (!message || visibleMessageIds.has(identity)) return undefined;
    visibleMessageIds.add(identity);
    messages.push(message);
  }

  const tombstones: StoredGroupChatState["tombstones"] = [];
  const removedGroupIds = new Set<string>();
  for (const candidate of value.tombstones) {
    if (
      !isRecord(candidate) ||
      !validGroupId(candidate.groupId) ||
      !validTimestamp(candidate.removedAt) ||
      groupsById.has(candidate.groupId) ||
      removedGroupIds.has(candidate.groupId)
    ) {
      return undefined;
    }
    removedGroupIds.add(candidate.groupId);
    tombstones.push({ groupId: candidate.groupId, removedAt: candidate.removedAt });
  }

  const messageTombstones: StoredGroupChatState["messageTombstones"] = [];
  const replayMessageIds = new Set<string>();
  for (const candidate of value.messageTombstones) {
    if (
      !isRecord(candidate) ||
      !validGroupId(candidate.groupId) ||
      !groupsById.has(candidate.groupId) ||
      !validMessageId(candidate.messageId) ||
      !validTimestamp(candidate.seenAt)
    ) {
      return undefined;
    }
    const identity = `${candidate.groupId}\u0000${candidate.messageId}`;
    if (visibleMessageIds.has(identity) || replayMessageIds.has(identity)) return undefined;
    replayMessageIds.add(identity);
    messageTombstones.push({
      groupId: candidate.groupId,
      messageId: candidate.messageId,
      seenAt: candidate.seenAt,
    });
  }

  return {
    version: GROUP_STORAGE_VERSION,
    groups,
    messages,
    tombstones,
    messageTombstones,
  };
}

export function parseGroupChatPacket(payload: string): GroupChatPacket | null {
  if (typeof payload !== "string" || payload.length < 1 || payload.length > GROUP_PACKET_MAX_CHARS) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(payload) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(value) || value.v !== 1 || !validGroupId(value.g) || !validTimestamp(value.u)) {
    return null;
  }

  if (value.t === "gi") {
    if (!hasExactKeys(value, ["t", "v", "g", "m", "n", "u"])) return null;
    if (
      typeof value.n !== "string" ||
      value.n.length < 1 ||
      value.n.length > GROUP_TITLE_MAX_CHARS ||
      DISALLOWED_CONTROL_PATTERN.test(value.n) ||
      hasUnpairedSurrogate(value.n)
    ) {
      return null;
    }
    const members = strictCanonicalMembers(value.m);
    const title = normalizeTitle(value.n);
    if (!members || !title) return null;
    return { t: "gi", v: 1, g: value.g, m: members, n: title, u: value.u };
  }
  if (value.t === "gm") {
    if (!hasExactKeys(value, ["t", "v", "g", "i", "c", "u"])) return null;
    if (!validMessageId(value.i) || typeof value.c !== "string") return null;
    if (
      value.c.length < 1 ||
      value.c.length > GROUP_MESSAGE_MAX_CONTENT ||
      DISALLOWED_CONTROL_PATTERN.test(value.c) ||
      hasUnpairedSurrogate(value.c)
    ) {
      return null;
    }
    const content = normalizeMessageContent(value.c);
    if (!content || content.length > GROUP_MESSAGE_MAX_CONTENT) return null;
    return { t: "gm", v: 1, g: value.g, i: value.i, c: content, u: value.u };
  }
  return null;
}

export function serializeGroupChatPacket(packet: GroupChatPacket): string {
  const payload = JSON.stringify(packet);
  if (!parseGroupChatPacket(payload) || payload.length > GROUP_PACKET_MAX_CHARS) {
    throw new Error("KikiLink group packet exceeds its safe transport bounds");
  }
  return payload;
}

function sanitizeStoredGroup(value: unknown, ownMemberNumber: number): GroupConversation | undefined {
  if (!isRecord(value) || !validGroupId(value.groupId) || !validMemberNumber(value.creatorNumber)) {
    return undefined;
  }
  const members = strictCanonicalMembers(value.memberNumbers);
  const title = normalizeTitle(value.title);
  if (
    !members ||
    !title ||
    !members.includes(ownMemberNumber) ||
    !members.includes(value.creatorNumber) ||
    !validTimestamp(value.createdAt)
  ) {
    return undefined;
  }
  const names: Record<string, string> = {};
  const storedNames = isRecord(value.memberNames) ? value.memberNames : {};
  for (const memberNumber of members) {
    names[memberNumber] = normalizeMemberName(storedNames[memberNumber], memberNumber);
  }
  const updatedAt = validTimestamp(value.updatedAt) ? value.updatedAt : value.createdAt;
  return {
    groupId: value.groupId,
    title,
    creatorNumber: value.creatorNumber,
    memberNumbers: members,
    memberNames: names,
    createdAt: value.createdAt,
    updatedAt,
    lastMessage: "",
    lastMessageAt: 0,
    unread: 0,
    pinned: value.pinned === true,
    draft: normalizeDraft(value.draft),
  };
}

function sanitizeStoredMessage(
  value: unknown,
  group: GroupConversation,
  ownMemberNumber: number,
): GroupMessage | undefined {
  if (
    !isRecord(value) ||
    !validMessageId(value.id) ||
    value.groupId !== group.groupId ||
    !validMemberNumber(value.senderNumber) ||
    !group.memberNumbers.includes(value.senderNumber) ||
    typeof value.content !== "string" ||
    !validTimestamp(value.sentAt)
  ) {
    return undefined;
  }
  if (DISALLOWED_CONTROL_PATTERN.test(value.content) || hasUnpairedSurrogate(value.content)) {
    return undefined;
  }
  const content = normalizeMessageContent(value.content);
  if (!content || content.length > GROUP_MESSAGE_MAX_CONTENT) return undefined;
  const direction: MessageDirection = value.senderNumber === ownMemberNumber ? "outgoing" : "incoming";
  return {
    id: value.id,
    groupId: group.groupId,
    senderNumber: value.senderNumber,
    senderName: normalizeMemberName(value.senderName, value.senderNumber),
    direction,
    content,
    sentAt: value.sentAt,
    read: direction === "outgoing" || value.read === true,
  };
}

function canonicalMembers(values: Iterable<number>): number[] {
  const members = new Set<number>();
  for (const value of values) {
    if (!validMemberNumber(value)) throw new Error("Group members need valid BC member numbers");
    members.add(value);
  }
  return [...members].sort((left, right) => left - right);
}

function strictCanonicalMembers(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || value.length < GROUP_MIN_MEMBERS || value.length > GROUP_MAX_MEMBERS) {
    return undefined;
  }
  const members: number[] = [];
  for (const candidate of value) {
    if (!validMemberNumber(candidate)) return undefined;
    const previous = members.at(-1);
    if (previous !== undefined && previous >= candidate) return undefined;
    members.push(candidate);
  }
  return members;
}

function assertMemberCount(members: readonly number[]): void {
  if (members.length < GROUP_MIN_MEMBERS || members.length > GROUP_MAX_MEMBERS) {
    throw new Error(`A group chat needs ${GROUP_MIN_MEMBERS}-${GROUP_MAX_MEMBERS} total members`);
  }
}

function sameMembers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((member, index) => member === right[index]);
}

function normalizeTitle(value: unknown): string {
  if (typeof value !== "string" || hasUnpairedSurrogate(value)) return "";
  const normalized = value
    .replace(DISALLOWED_CONTROL_PATTERN_GLOBAL, " ")
    .replace(/\s+/gu, " ")
    .trim();
  // String limits are UTF-16 based throughout BC. Do not leave a dangling high surrogate when a
  // valid astral character (for example an emoji) straddles the exact title boundary.
  return sliceCompleteUtf16(normalized, GROUP_TITLE_MAX_CHARS);
}

function normalizeMessageContent(value: string): string {
  return value.replace(/\r\n?/gu, "\n").trim();
}

function normalizeDraft(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/gu, "\n")
    .replace(DISALLOWED_CONTROL_PATTERN_GLOBAL, " ")
    .slice(0, GROUP_DRAFT_MAX_CHARS);
}

function normalizeMemberName(value: unknown, memberNumber: number): string {
  if (typeof value !== "string") return `Member ${memberNumber}`;
  const name = value
    .replace(DISALLOWED_CONTROL_PATTERN_GLOBAL, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80);
  return name || `Member ${memberNumber}`;
}

function defaultGroupTitle(
  members: readonly number[],
  memberNames: Readonly<Record<string, string>>,
  ownMemberNumber: number,
): string {
  const names = members
    .filter((memberNumber) => memberNumber !== ownMemberNumber)
    .map((memberNumber) => memberNames[memberNumber] ?? `Member ${memberNumber}`);
  return normalizeTitle(`Group with ${names.join(", ")}`) || "Group chat";
}

function sortGroups(left: GroupConversation, right: GroupConversation): number {
  if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
  return (right.lastMessageAt || right.createdAt) - (left.lastMessageAt || left.createdAt);
}

function compareMessages(left: GroupMessage, right: GroupMessage): number {
  return left.sentAt - right.sentAt || left.id.localeCompare(right.id);
}

function compareMessageTombstones(
  left: { groupId: string; messageId: string; seenAt: number },
  right: { groupId: string; messageId: string; seenAt: number },
): number {
  return left.seenAt - right.seenAt ||
    left.groupId.localeCompare(right.groupId) ||
    left.messageId.localeCompare(right.messageId);
}

function oldestMessageTombstone(ids: ReadonlyMap<string, number>): string | undefined {
  let oldestId: string | undefined;
  let oldestSeenAt = Number.POSITIVE_INFINITY;
  for (const [messageId, seenAt] of ids) {
    if (seenAt < oldestSeenAt || (seenAt === oldestSeenAt && (oldestId === undefined || messageId < oldestId))) {
      oldestId = messageId;
      oldestSeenAt = seenAt;
    }
  }
  return oldestId;
}

function consumeRateToken(
  bucket: InboundRateBucket,
  capacity: number,
  refillMs: number,
  now: number,
): boolean {
  if (now >= bucket.refilledAt) {
    const elapsed = now - bucket.refilledAt;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed / refillMs);
    bucket.refilledAt = now;
  }
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

function cloneGroup(group: GroupConversation): GroupConversation {
  return {
    ...structuredClone(group),
    memberNumbers: [...group.memberNumbers],
    memberNames: { ...group.memberNames },
  };
}

function clampRemoteTimestamp(remote: number, receivedAt: number): number {
  return Math.abs(remote - receivedAt) <= REMOTE_TIMESTAMP_SKEW_MS ? remote : receivedAt;
}

function safeNow(now: () => number): number {
  const value = now();
  return validTimestamp(value) ? Math.round(value) : Date.now();
}

function validGroupId(value: unknown): value is string {
  return typeof value === "string" && value.length <= GROUP_ID_MAX_CHARS && GROUP_ID_PATTERN.test(value);
}

function validMessageId(value: unknown): value is string {
  return typeof value === "string" && value.length <= MESSAGE_ID_MAX_CHARS && MESSAGE_ID_PATTERN.test(value);
}

function validMemberNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validTimestamp(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_DATE_TIMESTAMP_MS
  );
}

function integerInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function sliceCompleteUtf16(value: string, maxLength: number): string {
  const sliced = value.slice(0, maxLength);
  const finalUnit = sliced.charCodeAt(sliced.length - 1);
  return finalUnit >= 0xd800 && finalUnit <= 0xdbff ? sliced.slice(0, -1) : sliced;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
