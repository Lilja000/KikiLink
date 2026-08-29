import type {
  KeyValueStorage,
  KeyValueStorageReadResult,
} from "../../core/settings";
import type { MessageDirection } from "../../core/types";
import { createSecureId } from "../../utils/id";
import { normalizeImageUrl } from "./media";

export const GROUP_CHAT_STORAGE_KEY = "kikilink:group-chats:v1";
export const GROUP_PACKET_MAX_CHARS = 700;
export const GROUP_TITLE_MAX_CHARS = 60;
export const GROUP_MAX_COUNT = 30;
export const GROUP_MAX_MEMBERS = 5;
export const GROUP_MIN_MEMBERS = 3;
export const GROUP_MAX_MESSAGES = 500;
export const GROUP_INVITE_RATE_BURST = 5;
export const GROUP_INVITE_RATE_REFILL_MS = 15_000;
export const GROUP_MESSAGE_RATE_BURST = 60;
export const GROUP_MESSAGE_RATE_REFILL_MS = 250;
export const GROUP_PERSISTENCE_DELAY_MS = 300;
/** Prevents a steady stream of drafts/messages from postponing durable state forever. */
export const GROUP_PERSISTENCE_MAX_WAIT_MS = 1_800;
export const GROUP_RELAY_QUEUE_CAPACITY = 60;
export const GROUP_RELAY_INTERVAL_MS = 210;
export const GROUP_RELAY_TTL_MS = 15_000;
export const GROUP_MEMBER_NAME_MAX_CHARS = 40;
export const GROUP_MANAGED_AVATAR_URL_MAX_CHARS = 450;

const GROUP_STORAGE_VERSION = 3;
const GROUP_MAX_TOTAL_MESSAGES = 3_000;
const GROUP_MAX_MANAGED_REMOTE_PER_OWNER = 5;
const GROUP_RESERVED_LOCAL_SLOTS = 5;
/** Small records; a larger horizon makes removed/revoked managed groups costly to replay. */
const GROUP_MAX_TOMBSTONES = 512;
const GROUP_MAX_REPLAY_IDS_PER_GROUP = 1_000;
const GROUP_MAX_REPLAY_IDS_TOTAL = 3_000;
const GROUP_MAX_RATE_SENDERS = 128;
const GROUP_RATE_STATE_TTL_MS = 10 * 60_000;
const GROUP_ORIGIN_RATE_BURST = 12;
const GROUP_ORIGIN_RATE_REFILL_MS = 500;
const GROUP_AGGREGATE_RATE_BURST = 20;
const GROUP_AGGREGATE_RATE_REFILL_MS = 250;
const GROUP_METADATA_RATE_BURST = 12;
const GROUP_METADATA_RATE_REFILL_MS = 5_000;
const GROUP_INVITE_REPAIR_INTERVAL_MS = 60_000;
const GROUP_REVOCATION_RETRY_INTERVAL_MS = 30_000;
const GROUP_REVOCATION_RETRY_MAX_INTERVAL_MS = 6 * 60 * 60_000;
const GROUP_REVOCATION_RETRY_HORIZON_MS = 7 * 24 * 60 * 60_000;
const GROUP_REVOCATION_MAX_ATTEMPTS = 36;
const GROUP_MAX_PENDING_REVOCATIONS = GROUP_MAX_COUNT * (GROUP_MAX_MEMBERS - 1);
const GROUP_ID_MAX_CHARS = 64;
const MESSAGE_ID_MAX_CHARS = 64;
const REMOTE_TIMESTAMP_SKEW_MS = 5 * 60_000;
const MAX_DATE_TIMESTAMP_MS = 8_640_000_000_000_000;
const GROUP_ID_PATTERN = /^group_[a-z0-9_-]{8,58}$/u;
const MANAGED_GROUP_ID_PATTERN = /^group2_([1-9][0-9]{0,15})_([a-z0-9_-]{8,31})$/u;
const GROUP_EPOCH_PATTERN = /^ge_[a-z0-9_-]{8,40}$/u;
const MESSAGE_ID_PATTERN = /^gmsg_[a-z0-9_-]{8,57}$/u;
const MESSAGE_IDENTITY_SEPARATOR = "\u0000";
const DISALLOWED_CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const DISALLOWED_CONTROL_PATTERN_GLOBAL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;

/**
 * JSON quotes, slashes, tabs, and newlines can expand to two characters. Unpaired UTF-16
 * surrogates are rejected, so a factor of two is the exact worst case for accepted content.
 */
const WORST_DIRECT_MESSAGE_ENVELOPE_CHARS = JSON.stringify({
  t: "gm",
  v: 1,
  g: "g".repeat(GROUP_ID_MAX_CHARS),
  i: "i".repeat(MESSAGE_ID_MAX_CHARS),
  c: "",
  u: Number.MAX_SAFE_INTEGER,
}).length;

const WORST_RELAY_MESSAGE_ENVELOPE_CHARS = JSON.stringify({
  t: "gr",
  v: 1,
  g: "g".repeat(GROUP_ID_MAX_CHARS),
  o: Number.MAX_SAFE_INTEGER,
  i: "i".repeat(MESSAGE_ID_MAX_CHARS),
  c: "",
  u: Number.MAX_SAFE_INTEGER,
}).length;

/** Old direct v1 packets remain readable even though newly authored messages must also fit `gr`. */
const GROUP_LEGACY_DIRECT_MESSAGE_MAX_CONTENT = Math.floor(
  (GROUP_PACKET_MAX_CHARS - WORST_DIRECT_MESSAGE_ENVELOPE_CHARS) / 2,
);

export const GROUP_MESSAGE_MAX_CONTENT = Math.floor(
  (GROUP_PACKET_MAX_CHARS - WORST_RELAY_MESSAGE_ENVELOPE_CHARS) / 2,
);

const WORST_MANAGED_RELAY_MESSAGE_ENVELOPE_BYTES = utf8ByteLength(JSON.stringify({
  t: "gr",
  v: 2,
  g: `group2_${Number.MAX_SAFE_INTEGER}_${"g".repeat(31)}`,
  e: `ge_${"e".repeat(40)}`,
  o: Number.MAX_SAFE_INTEGER,
  i: "i".repeat(MESSAGE_ID_MAX_CHARS),
  c: "",
  u: Number.MAX_SAFE_INTEGER,
}));

/** ASCII/escaped-content ceiling; the serializer additionally enforces the exact UTF-8 budget. */
export const GROUP_MANAGED_MESSAGE_MAX_CONTENT = Math.floor(
  (GROUP_PACKET_MAX_CHARS - WORST_MANAGED_RELAY_MESSAGE_ENVELOPE_BYTES) / 2,
);
export const GROUP_DRAFT_MAX_CHARS = GROUP_MESSAGE_MAX_CONTENT;

export interface GroupConversation {
  groupId: string;
  title: string;
  creatorNumber: number;
  /** Legacy v1 memberships are immutable; managed v2 memberships are owner-authoritative. */
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
  protocolVersion: 1 | 2;
  epochId?: string;
  stateRevision: number;
  appearanceRevision: number;
  memberNamesRevision: number;
  avatarUrl: string;
  outlineColor: string;
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

export interface GroupMutationResult {
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
  /** Creator that was handed the authored packet for one-hop delivery to `relayTargets`. */
  relayViaCreator?: number;
  /** Remote members covered by the creator relay path. Delivery remains unconfirmed. */
  relayTargets?: number[];
  /** Members with neither a successful direct handoff nor a successful creator-relay handoff. */
  unreachable?: number[];
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
  /** Capability is checked again at the service boundary, never only in the picker UI. */
  hasManagedPeer?: (memberNumber: number) => boolean;
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

export interface GroupRelayMessagePacket {
  t: "gr";
  v: 1;
  g: string;
  /** Original, authenticated-at-the-creator sender. Display identity only at recipients. */
  o: number;
  i: string;
  c: string;
  u: number;
}

export interface GroupMemberNamesPacket {
  t: "gn";
  v: 1;
  g: string;
  /** Canonical `[MemberNumber, display name]` tuples for the immutable membership. */
  d: Array<[number, string]>;
  u: number;
}

export interface ManagedGroupStatePacket {
  t: "gs";
  v: 2;
  g: string;
  o: number;
  e: string;
  r: number;
  m: number[];
  n: string;
  /** Empty for a fresh group; a legacy ID only for an explicit safe conversion. */
  p: string;
  u: number;
}

export interface ManagedGroupAppearancePacket {
  t: "ga";
  v: 2;
  g: string;
  o: number;
  e: string;
  r: number;
  /** Empty clears the avatar. */
  a: string;
  /** Empty restores the default outline. */
  c: string;
  u: number;
}

export interface ManagedGroupMemberNamesPacket {
  t: "gn";
  v: 2;
  g: string;
  o: number;
  e: string;
  r: number;
  d: Array<[number, string]>;
  u: number;
}

export interface ManagedGroupWireMessagePacket {
  t: "gm";
  v: 2;
  g: string;
  e: string;
  i: string;
  c: string;
  u: number;
}

export interface ManagedGroupRelayMessagePacket {
  t: "gr";
  v: 2;
  g: string;
  e: string;
  o: number;
  i: string;
  c: string;
  u: number;
}

export interface ManagedGroupRemovalPacket {
  t: "gx";
  v: 2;
  g: string;
  o: number;
  /** Epoch the removed participant must currently hold. */
  e: string;
  /** New state revision after removal. */
  r: number;
  u: number;
}

export type GroupChatPacket =
  | GroupInvitePacket
  | GroupWireMessagePacket
  | GroupRelayMessagePacket
  | GroupMemberNamesPacket
  | ManagedGroupStatePacket
  | ManagedGroupAppearancePacket
  | ManagedGroupMemberNamesPacket
  | ManagedGroupWireMessagePacket
  | ManagedGroupRelayMessagePacket
  | ManagedGroupRemovalPacket;

interface GroupRemovalTombstone {
  removedAt: number;
  kind: "local" | "revoked";
  creatorNumber?: number;
  epochId?: string;
  stateRevision?: number;
}

interface PendingManagedRevocation {
  groupId: string;
  creatorNumber: number;
  targetNumber: number;
  epochId: string;
  stateRevision: number;
  createdAt: number;
  queuedAt: number;
  lastAttemptAt: number;
  attempts: number;
}

interface StoredMessageTombstone {
  groupId: string;
  /** Missing only on migrated v1/v2 replay records, where the old ID applied to every origin. */
  originNumber?: number;
  messageId: string;
  seenAt: number;
}

interface StoredGroupChatState {
  version: 3;
  groups: GroupConversation[];
  messages: GroupMessage[];
  tombstones: Array<{ groupId: string } & GroupRemovalTombstone>;
  messageTombstones: StoredMessageTombstone[];
  pendingRevocations: PendingManagedRevocation[];
}

interface PreviousStoredGroupChatState {
  version: 2;
  groups: unknown[];
  messages: unknown[];
  tombstones: unknown[];
  messageTombstones: unknown[];
  pendingRevocations?: unknown[];
}

interface LegacyStoredGroupChatState {
  version: 1;
  groups: unknown[];
  messages: unknown[];
  tombstones: Array<{ groupId: string; removedAt: number }>;
  messageTombstones: Array<{ groupId: string; messageId: string; seenAt: number }>;
  pendingRevocations?: never;
}

type ReadableStoredGroupChatState =
  | LegacyStoredGroupChatState
  | PreviousStoredGroupChatState
  | StoredGroupChatState;

type GroupChatListener = (update: GroupChatUpdate) => void;

interface InboundRateBucket {
  tokens: number;
  refilledAt: number;
}

interface InboundRateState {
  lastSeenAt: number;
  invites: InboundRateBucket;
  metadata: InboundRateBucket;
  messages: InboundRateBucket;
}

interface GroupInboundRateState {
  lastSeenAt: number;
  aggregate: InboundRateBucket;
  origins: Map<number, InboundRateBucket>;
}

interface RelayQueueItem {
  groupId: string;
  epochId?: string;
  originNumber: number;
  targetNumber: number;
  payload: string;
  expiresAt: number;
}

/**
 * Addon-only group conversations delivered as one authenticated BC packet per remote member.
 * Membership is immutable in protocol v1, which keeps every participant's authorization view
 * deterministic without relying on a KikiLink server or accepting remote membership rewrites.
 */
export class GroupChatService {
  readonly #groups = new Map<string, GroupConversation>();
  readonly #messages = new Map<string, GroupMessage[]>();
  readonly #visibleMessageIds = new Map<string, Set<string>>();
  readonly #tombstones = new Map<string, GroupRemovalTombstone>();
  readonly #messageTombstones = new Map<string, Map<string, number>>();
  readonly #pendingRevocations = new Map<string, PendingManagedRevocation>();
  readonly #inboundRates = new Map<number, InboundRateState>();
  readonly #groupInboundRates = new Map<string, GroupInboundRateState>();
  readonly #relayQueue: RelayQueueItem[] = [];
  readonly #relayFlowTurns = new Map<string, number>();
  readonly #lastStateHandoffAt = new Map<string, Map<number, number>>();
  readonly #listeners = new Set<GroupChatListener>();
  readonly #mutationQueues = new Map<string, Promise<unknown>>();
  readonly #now: () => number;
  readonly #idFactory: (prefix: "group" | "gmsg") => string;
  readonly #hasManagedPeer: ((memberNumber: number) => boolean) | undefined;
  readonly #persistenceDelayMs: number;
  readonly #accountMemberNumber: number;
  #accountInvalidated = false;
  #persistenceTimer: ReturnType<typeof setTimeout> | undefined;
  #persistenceMaxWaitTimer: ReturnType<typeof setTimeout> | undefined;
  #relayTimer: ReturnType<typeof setTimeout> | undefined;
  #relayTurn = 0;
  #revocationTimer: ReturnType<typeof setTimeout> | undefined;
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
    // Creator authority and membership generations must never fall back to timestamp IDs.
    this.#idFactory = options.idFactory ?? ((prefix) => createSecureId(prefix));
    this.#hasManagedPeer = options.hasManagedPeer;
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
    this.#scheduleRevocationRetry();
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
        if (memberNumber === ownMemberNumber) continue;
        if (!this.#isKnownFriend(memberNumber)) {
          throw new Error(`Member ${memberNumber} must be a known BC friend`);
        }
        if (this.#isBlocked(memberNumber, true)) {
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
        protocolVersion: 1,
        stateRevision: 0,
        appearanceRevision: 0,
        memberNamesRevision: 0,
        avatarUrl: "",
        outlineColor: "",
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
      this.#visibleMessageIds.set(groupId, new Set());
      this.#schedulePersistence();
      this.#notify({ kind: "group-added", groupId, group: cloneGroup(group), incoming: false });
      const delivery = this.#multicastDirect(group, payload);
      this.#sendMemberNames(group, delivery.handedOffTo);
      this.#recordStateHandoffs(group, delivery.handedOffTo, createdAt);
      return { group: cloneGroup(group), ...delivery };
    });
  }

  /** Creates a creator-bound managed group. Every remote member must have advertised g3. */
  async createManagedGroup(
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
      this.#assertManagedMembers(members, ownMemberNumber);
      const createdAt = safeNow(this.#now);
      const memberNames = this.#memberNames(members);
      const group: GroupConversation = {
        groupId: this.#newManagedGroupId(ownMemberNumber),
        title: normalizeTitle(requestedTitle) || defaultGroupTitle(members, memberNames, ownMemberNumber),
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
        protocolVersion: 2,
        epochId: this.#newEpochId(),
        stateRevision: 1,
        appearanceRevision: 1,
        memberNamesRevision: 1,
        avatarUrl: "",
        outlineColor: "",
      };
      this.#prepareAuthoritativeMutation();
      this.#groups.set(group.groupId, group);
      this.#messages.set(group.groupId, []);
      this.#visibleMessageIds.set(group.groupId, new Set());
      this.#commitAuthoritativeMutation(() => {
        this.#groups.delete(group.groupId);
        this.#messages.delete(group.groupId);
        this.#visibleMessageIds.delete(group.groupId);
      });
      this.#notify({
        kind: "group-added",
        groupId: group.groupId,
        group: cloneGroup(group),
        incoming: false,
      });
      const delivery = this.#sendManagedState(group, "");
      if (delivery.handedOffTo.length > 0) {
        this.#sendManagedAppearance(group, delivery.handedOffTo);
        this.#sendManagedMemberNames(group, delivery.handedOffTo);
        this.#recordStateHandoffs(group, delivery.handedOffTo, createdAt);
      }
      return { group: cloneGroup(group), ...delivery };
    });
  }

  /** Explicitly replaces an ambiguous legacy group with a creator-bound managed group ID. */
  async convertLegacyGroup(groupId: string): Promise<GroupMutationResult> {
    this.#assertOpen();
    return this.#enqueue(groupId, () => {
      this.#assertBoundAccount();
      const legacy = this.#requireGroup(groupId);
      this.#assertCreator(legacy);
      if (legacy.protocolVersion !== 1) {
        return { group: cloneGroup(legacy), handedOffTo: [], failed: [] };
      }
      this.#assertManagedMembers(legacy.memberNumbers, legacy.creatorNumber);
      const now = safeNow(this.#now);
      const managed: GroupConversation = {
        ...cloneGroup(legacy),
        groupId: this.#newManagedGroupId(legacy.creatorNumber),
        protocolVersion: 2,
        epochId: this.#newEpochId(),
        stateRevision: 1,
        appearanceRevision: 1,
        memberNamesRevision: 1,
        avatarUrl: legacy.avatarUrl || "",
        outlineColor: legacy.outlineColor || "",
        updatedAt: now,
      };
      this.#prepareAuthoritativeMutation();
      const oldMessages = this.#messages.get(groupId) ?? [];
      const oldVisibleIds = this.#visibleMessageIds.get(groupId) ?? new Set<string>();
      const migratedMessages = oldMessages.map((message) => ({
        ...structuredClone(message),
        groupId: managed.groupId,
      }));
      this.#groups.delete(groupId);
      this.#messages.delete(groupId);
      this.#visibleMessageIds.delete(groupId);
      this.#groupInboundRates.delete(groupId);
      this.#removeQueuedRelaysForGroup(groupId);
      this.#lastStateHandoffAt.delete(groupId);
      this.#removePendingRevocationsForGroup(groupId);
      const replayIds = this.#messageTombstones.get(groupId);
      this.#messageTombstones.delete(groupId);
      if (replayIds) this.#messageTombstones.set(managed.groupId, replayIds);
      this.#tombstones.set(groupId, { removedAt: now, kind: "local" });
      this.#groups.set(managed.groupId, managed);
      this.#messages.set(managed.groupId, migratedMessages);
      this.#visibleMessageIds.set(
        managed.groupId,
        new Set(migratedMessages.map(messageIdentity)),
      );
      this.#trimTombstones();
      this.#commitAuthoritativeMutation(() => {
        this.#groups.delete(managed.groupId);
        this.#messages.delete(managed.groupId);
        this.#visibleMessageIds.delete(managed.groupId);
        this.#messageTombstones.delete(managed.groupId);
        this.#groups.set(groupId, legacy);
        this.#messages.set(groupId, oldMessages);
        this.#visibleMessageIds.set(groupId, oldVisibleIds);
        if (replayIds) this.#messageTombstones.set(groupId, replayIds);
        this.#tombstones.delete(groupId);
      });
      this.#notify({ kind: "group-removed", groupId });
      this.#notify({
        kind: "group-added",
        groupId: managed.groupId,
        group: cloneGroup(managed),
        incoming: false,
      });
      const delivery = this.#sendManagedState(managed, groupId);
      if (delivery.handedOffTo.length > 0) {
        this.#sendManagedAppearance(managed, delivery.handedOffTo);
        this.#sendManagedMemberNames(managed, delivery.handedOffTo);
        this.#recordStateHandoffs(managed, delivery.handedOffTo, now);
      }
      return { group: cloneGroup(managed), ...delivery };
    });
  }

  async renameGroup(groupId: string, requestedTitle: string): Promise<GroupMutationResult> {
    return this.#mutateManagedAppearance(groupId, (group) => {
      const title = normalizeTitle(requestedTitle);
      if (!title) throw new Error("A group name cannot be empty");
      if (title === group.title) return false;
      const stateRevision = nextRevision(group.stateRevision);
      group.title = title;
      group.stateRevision = stateRevision;
      return true;
    }, "state");
  }

  async setGroupAvatar(groupId: string, value: string): Promise<GroupMutationResult> {
    return this.#mutateManagedAppearance(groupId, (group) => {
      const avatarUrl = normalizeManagedAvatarUrl(value);
      if (value.trim() && !avatarUrl) {
        throw new Error("Choose a direct HTTPS image link up to 450 characters");
      }
      if (avatarUrl === group.avatarUrl) return false;
      const appearanceRevision = nextRevision(group.appearanceRevision);
      group.avatarUrl = avatarUrl;
      group.appearanceRevision = appearanceRevision;
      return true;
    }, "appearance");
  }

  async setGroupOutlineColor(groupId: string, value: string): Promise<GroupMutationResult> {
    return this.#mutateManagedAppearance(groupId, (group) => {
      const outlineColor = normalizeGroupOutlineColor(value);
      if (value.trim() && !outlineColor) {
        throw new Error("Choose a valid six-digit HEX group outline color");
      }
      if (outlineColor === group.outlineColor) return false;
      const appearanceRevision = nextRevision(group.appearanceRevision);
      group.outlineColor = outlineColor;
      group.appearanceRevision = appearanceRevision;
      return true;
    }, "appearance");
  }

  async addMember(groupId: string, memberNumber: number): Promise<GroupMutationResult> {
    this.#assertOpen();
    return this.#enqueue(groupId, () => {
      this.#assertBoundAccount();
      const group = this.#requireManagedCreatorGroup(groupId);
      if (!validMemberNumber(memberNumber)) throw new Error("Choose a valid BC member");
      if (group.memberNumbers.includes(memberNumber)) {
        throw new Error("This member is already in the group");
      }
      if (group.memberNumbers.length >= GROUP_MAX_MEMBERS) {
        throw new Error(`A group chat can have at most ${GROUP_MAX_MEMBERS} members`);
      }
      const members = canonicalMembers([...group.memberNumbers, memberNumber]);
      this.#assertManagedMembers(members, group.creatorNumber);
      const epochId = this.#newEpochId(group.epochId);
      const stateRevision = nextRevision(group.stateRevision);
      const memberNames = {
        ...group.memberNames,
        [memberNumber]: this.#memberName(memberNumber),
      };
      this.#prepareAuthoritativeMutation();
      const previousGroup = cloneGroup(group);
      const revocationKey = pendingRevocationKey(groupId, memberNumber);
      const previousRevocation = this.#pendingRevocations.get(revocationKey);
      group.memberNumbers = members;
      group.memberNames = memberNames;
      group.epochId = epochId;
      group.stateRevision = stateRevision;
      group.memberNamesRevision = group.stateRevision;
      group.updatedAt = safeNow(this.#now);
      this.#pendingRevocations.delete(revocationKey);
      this.#commitAuthoritativeMutation(() => {
        this.#groups.set(groupId, previousGroup);
        if (previousRevocation) {
          this.#pendingRevocations.set(revocationKey, previousRevocation);
        }
      });
      this.#scheduleRevocationRetry(true);
      this.#groupInboundRates.delete(group.groupId);
      this.#removeQueuedRelaysForGroup(group.groupId);
      this.#notify({ kind: "group-updated", groupId, group: cloneGroup(group) });
      const delivery = this.#sendManagedState(group, "");
      if (delivery.handedOffTo.length > 0) {
        this.#sendManagedAppearance(group, delivery.handedOffTo);
        this.#sendManagedMemberNames(group, delivery.handedOffTo);
        this.#recordStateHandoffs(group, delivery.handedOffTo, group.updatedAt);
      }
      this.#retryManagedRevocations(group.groupId);
      return { group: cloneGroup(group), ...delivery };
    });
  }

  async kickMember(groupId: string, memberNumber: number): Promise<GroupMutationResult> {
    this.#assertOpen();
    return this.#enqueue(groupId, () => {
      this.#assertBoundAccount();
      const group = this.#requireManagedCreatorGroup(groupId);
      if (!group.memberNumbers.includes(memberNumber)) {
        throw new Error("This member is no longer in the group");
      }
      if (memberNumber === group.creatorNumber) throw new Error("The group owner cannot be kicked");
      if (group.memberNumbers.length - 1 < GROUP_MIN_MEMBERS) {
        throw new Error(`A group chat needs at least ${GROUP_MIN_MEMBERS} members`);
      }
      const previousEpoch = group.epochId!;
      const nextStateRevision = nextRevision(group.stateRevision);
      const nextEpoch = this.#newEpochId(previousEpoch);
      const memberNumbers = group.memberNumbers.filter((candidate) => candidate !== memberNumber);
      const memberNames = { ...group.memberNames };
      delete memberNames[memberNumber];
      this.#prepareAuthoritativeMutation();
      const previousGroup = cloneGroup(group);
      const previousPendingRevocations = new Map(
        [...this.#pendingRevocations].map(([key, revocation]) => [
          key,
          structuredClone(revocation),
        ]),
      );
      group.memberNumbers = memberNumbers;
      group.memberNames = memberNames;
      group.epochId = nextEpoch;
      group.stateRevision = nextStateRevision;
      group.memberNamesRevision = nextStateRevision;
      group.updatedAt = safeNow(this.#now);
      const removalKey = this.#rememberManagedRemoval(
        group,
        memberNumber,
        previousEpoch,
        nextStateRevision,
      );
      this.#commitAuthoritativeMutation(() => {
        this.#groups.set(groupId, previousGroup);
        this.#pendingRevocations.clear();
        for (const [key, revocation] of previousPendingRevocations) {
          this.#pendingRevocations.set(key, revocation);
        }
      });
      this.#groupInboundRates.delete(group.groupId);
      this.#removeQueuedRelaysForGroup(group.groupId);
      this.#notify({ kind: "group-updated", groupId, group: cloneGroup(group) });
      const delivery = this.#sendManagedState(group, "");
      if (delivery.handedOffTo.length > 0) {
        this.#sendManagedAppearance(group, delivery.handedOffTo);
        this.#sendManagedMemberNames(group, delivery.handedOffTo);
        this.#recordStateHandoffs(group, delivery.handedOffTo, group.updatedAt);
      }
      const removal = this.#deliverManagedRemoval(removalKey);
      if (removal.handedOffTo.length > 0) delivery.handedOffTo.push(memberNumber);
      delivery.failed.push(...removal.failed);
      this.#retryManagedRevocations(group.groupId);
      return { group: cloneGroup(group), ...delivery };
    });
  }

  getMessageMaxContent(groupId: string): number {
    const group = this.getGroup(groupId);
    return group?.protocolVersion === 2
      ? GROUP_MANAGED_MESSAGE_MAX_CONTENT
      : GROUP_MESSAGE_MAX_CONTENT;
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
      if (packet.v === 2) {
        if (packet.t === "gs") return this.#receiveManagedState(event.senderNumber, packet);
        if (packet.t === "ga") return this.#receiveManagedAppearance(event.senderNumber, packet);
        if (packet.t === "gx") return this.#receiveManagedRemoval(event.senderNumber, packet);
        if (packet.t === "gn") return this.#receiveManagedMemberNames(event.senderNumber, packet);
        if (packet.t === "gr") return this.#receiveRelay(event.senderNumber, packet, activeGroupId);
        return this.#receiveMessage(event.senderNumber, packet, activeGroupId);
      }
      if (packet.t === "gi") return this.#receiveInvite(event.senderNumber, packet);
      if (packet.t === "gn") return this.#receiveMemberNames(event.senderNumber, packet);
      if (packet.t === "gr") return this.#receiveRelay(event.senderNumber, packet, activeGroupId);
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
      const maxContent = group.protocolVersion === 2
        ? GROUP_MANAGED_MESSAGE_MAX_CONTENT
        : GROUP_MESSAGE_MAX_CONTENT;
      if (content.length > maxContent) {
        throw new Error(
          `A group message cannot exceed ${maxContent} characters`,
        );
      }
      const ownMemberNumber = this.#ownMemberNumber();
      const id = this.#newUniqueId("gmsg", (candidate) =>
        this.#hasSeenMessageId(groupId, ownMemberNumber, candidate),
      );
      const sentAt = safeNow(this.#now);
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
      let payload: string;
      try {
        payload = group.protocolVersion === 2
          ? serializeGroupChatPacket({
              t: "gm",
              v: 2,
              g: groupId,
              e: group.epochId!,
              i: id,
              c: content,
              u: sentAt,
            })
          : serializeGroupChatPacket({
              t: "gm",
              v: 1,
              g: groupId,
              i: id,
              c: content,
              u: sentAt,
            });
      } catch (error) {
        if (group.protocolVersion !== 2) throw error;
        throw new Error("This message is too large after safe UTF-8 encoding; shorten it");
      }
      this.#repairInvitesBeforeMessage(group, ownMemberNumber, sentAt);
      this.#retryManagedRevocations(group.groupId);
      const delivery = this.#routeAuthoredMessage(group, payload);
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
      const draft = normalizeDraft(
        value,
        group.protocolVersion === 2
          ? GROUP_MANAGED_MESSAGE_MAX_CONTENT
          : GROUP_DRAFT_MAX_CHARS,
      );
      if (draft === group.draft) return draft;
      group.draft = draft;
      group.updatedAt = safeNow(this.#now);
      this.#schedulePersistence(false);
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
      this.#visibleMessageIds.delete(groupId);
      this.#messageTombstones.delete(groupId);
      this.#groupInboundRates.delete(groupId);
      this.#removeQueuedRelaysForGroup(groupId);
      this.#lastStateHandoffAt.delete(groupId);
      this.#removePendingRevocationsForGroup(groupId);
      this.#scheduleRevocationRetry(true);
      this.#tombstones.set(groupId, { removedAt: safeNow(this.#now), kind: "local" });
      this.#trimTombstones();
      this.#markPersistenceDirty();
      this.#clearPersistenceTimers();
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
    this.#visibleMessageIds.clear();
    this.#tombstones.clear();
    this.#messageTombstones.clear();
    this.#pendingRevocations.clear();
    this.#inboundRates.clear();
    this.#groupInboundRates.clear();
    this.#clearRelayQueue();
    this.#clearRevocationTimer();
    this.#lastStateHandoffAt.clear();
    this.#clearPersistenceTimers();
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
        if (message.sentAt < olderThan) {
          this.#rememberMessageId(groupId, message.senderNumber, message.id, seenAt);
        }
      }
      this.#messages.set(groupId, kept);
      this.#visibleMessageIds.set(groupId, new Set(kept.map(messageIdentity)));
      const group = this.#groups.get(groupId);
      if (group) this.#recomputeGroupSummary(group, kept);
    }
    if (removed > 0) {
      this.#markPersistenceDirty();
      this.#clearPersistenceTimers();
      this.#flushPersistenceNow();
    }
    return removed;
  }

  /** Flushes every mutation that reached the service before this call. */
  async flush(): Promise<GroupPersistenceState> {
    this.#clearPersistenceTimers();
    await this.#settleMutations();
    // A mutation already queued when flush started can schedule timers while it settles.
    this.#clearPersistenceTimers();
    this.#flushPersistenceNow();
    return this.getPersistenceState();
  }

  /** Synchronous best effort for the browser pagehide boundary. */
  flushNow(): GroupPersistenceState {
    this.#clearPersistenceTimers();
    this.#flushPersistenceNow();
    return this.getPersistenceState();
  }

  destroy(): Promise<GroupPersistenceState> {
    if (this.#destroyPromise) return this.#destroyPromise;
    this.#closing = true;
    this.#clearPersistenceTimers();
    this.#clearRelayQueue();
    this.#clearRevocationTimer();
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
    for (const memberNumber of packet.m) {
      if (memberNumber !== this.#ownMemberNumber() && this.#isBlocked(memberNumber, true)) {
        return false;
      }
    }

    const existing = this.#groups.get(packet.g);
    if (existing) {
      return (
        existing.creatorNumber === senderNumber &&
        sameMembers(existing.memberNumbers, packet.m)
      );
    }
    if (this.#groups.size >= GROUP_MAX_COUNT - GROUP_RESERVED_LOCAL_SLOTS) return false;

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
      protocolVersion: 1,
      stateRevision: 0,
      appearanceRevision: 0,
      memberNamesRevision: 0,
      avatarUrl: "",
      outlineColor: "",
    };
    this.#groups.set(packet.g, group);
    this.#messages.set(packet.g, []);
    this.#visibleMessageIds.set(packet.g, new Set());
    this.#schedulePersistence();
    this.#notify({ kind: "group-added", groupId: packet.g, group: cloneGroup(group), incoming: true });
    return true;
  }

  #receiveMemberNames(senderNumber: number, packet: GroupMemberNamesPacket): boolean {
    const group = this.#groups.get(packet.g);
    if (
      !group ||
      group.protocolVersion !== 1 ||
      senderNumber !== group.creatorNumber ||
      Math.abs(packet.u - group.createdAt) > REMOTE_TIMESTAMP_SKEW_MS
    ) {
      return false;
    }
    if (!sameMembers(group.memberNumbers, packet.d.map(([memberNumber]) => memberNumber))) {
      return false;
    }
    const names = Object.fromEntries(packet.d.map(([memberNumber, name]) => [memberNumber, name]));
    if (sameMemberNames(group.memberNames, names, group.memberNumbers)) return true;
    group.memberNames = names;
    group.updatedAt = safeNow(this.#now);
    this.#schedulePersistence();
    this.#notify({ kind: "group-updated", groupId: group.groupId, group: cloneGroup(group) });
    return true;
  }

  #receiveManagedState(senderNumber: number, packet: ManagedGroupStatePacket): boolean {
    if (senderNumber !== packet.o || managedGroupOwner(packet.g) !== packet.o) return false;
    const ownMemberNumber = this.#ownMemberNumber();
    if (!packet.m.includes(ownMemberNumber) || !packet.m.includes(packet.o)) return false;
    for (const memberNumber of packet.m) {
      if (memberNumber !== ownMemberNumber && this.#isBlocked(memberNumber, true)) return false;
    }

    const tombstone = this.#tombstones.get(packet.g);
    let clearsRevokedTombstone = false;
    if (tombstone) {
      if (tombstone.kind === "local") return false;
      if (
        tombstone.creatorNumber !== packet.o ||
        packet.r <= (tombstone.stateRevision ?? 0) ||
        packet.e === tombstone.epochId
      ) {
        return false;
      }
      if (!this.#canAutoAccept(senderNumber)) return false;
      clearsRevokedTombstone = true;
    }

    const existing = this.#groups.get(packet.g);
    if (existing) {
      if (
        existing.protocolVersion !== 2 ||
        existing.creatorNumber !== senderNumber ||
        packet.p !== ""
      ) {
        return false;
      }
      if (packet.r < existing.stateRevision) return false;
      if (packet.r === existing.stateRevision) {
        return (
          packet.e === existing.epochId &&
          packet.n === existing.title &&
          sameMembers(packet.m, existing.memberNumbers)
        );
      }
      const membershipChanged = !sameMembers(packet.m, existing.memberNumbers);
      if (membershipChanged && packet.e === existing.epochId) return false;
      try {
        this.#prepareAuthoritativeMutation();
      } catch {
        return false;
      }
      const previousGroup = cloneGroup(existing);
      existing.memberNumbers = [...packet.m];
      existing.memberNames = this.#mergeCurrentMemberNames(existing.memberNames, packet.m);
      existing.title = packet.n;
      existing.epochId = packet.e;
      existing.stateRevision = packet.r;
      existing.memberNamesRevision = 0;
      existing.updatedAt = safeNow(this.#now);
      try {
        this.#commitAuthoritativeMutation(() => {
          this.#groups.set(existing.groupId, previousGroup);
        });
      } catch {
        return false;
      }
      if (membershipChanged) {
        this.#groupInboundRates.delete(existing.groupId);
        this.#removeQueuedRelaysForGroup(existing.groupId);
      }
      this.#notify({
        kind: "group-updated",
        groupId: existing.groupId,
        group: cloneGroup(existing),
      });
      return true;
    }

    if (!this.#canAutoAccept(senderNumber)) return false;
    const predecessor = packet.p ? this.#groups.get(packet.p) : undefined;
    const canConvertPredecessor = Boolean(
      predecessor &&
      predecessor.protocolVersion === 1 &&
      predecessor.creatorNumber === senderNumber &&
      sameMembers(predecessor.memberNumbers, packet.m),
    );
    if (packet.p && !canConvertPredecessor) return false;
    if (!canConvertPredecessor) {
      const remoteFromOwner = [...this.#groups.values()].filter((group) =>
        group.protocolVersion === 2 &&
        group.creatorNumber === senderNumber &&
        group.creatorNumber !== ownMemberNumber,
      ).length;
      if (
        remoteFromOwner >= GROUP_MAX_MANAGED_REMOTE_PER_OWNER ||
        this.#groups.size >= GROUP_MAX_COUNT - GROUP_RESERVED_LOCAL_SLOTS
      ) {
        return false;
      }
    }

    const receivedAt = safeNow(this.#now);
    const createdAt = clampRemoteTimestamp(packet.u, receivedAt);
    const group: GroupConversation = {
      groupId: packet.g,
      title: packet.n,
      creatorNumber: packet.o,
      memberNumbers: [...packet.m],
      memberNames: this.#memberNames(packet.m),
      createdAt,
      updatedAt: receivedAt,
      lastMessage: "",
      lastMessageAt: 0,
      unread: 0,
      pinned: predecessor?.pinned ?? false,
      draft: predecessor?.draft ?? "",
      protocolVersion: 2,
      epochId: packet.e,
      stateRevision: packet.r,
      appearanceRevision: 0,
      memberNamesRevision: 0,
      avatarUrl: predecessor?.avatarUrl ?? "",
      outlineColor: predecessor?.outlineColor ?? "",
    };
    let messages: GroupMessage[] = [];
    try {
      this.#prepareAuthoritativeMutation();
    } catch {
      return false;
    }
    const previousTombstones = new Map(
      [...this.#tombstones].map(([groupId, item]) => [groupId, structuredClone(item)]),
    );
    const predecessorMessages = predecessor
      ? this.#messages.get(predecessor.groupId) ?? []
      : [];
    const predecessorVisibleIds = predecessor
      ? this.#visibleMessageIds.get(predecessor.groupId) ?? new Set<string>()
      : new Set<string>();
    const predecessorReplayIds = predecessor
      ? this.#messageTombstones.get(predecessor.groupId)
      : undefined;
    const managedReplayIds = this.#messageTombstones.get(group.groupId);
    if (canConvertPredecessor && predecessor) {
      messages = predecessorMessages.map((message) => ({
        ...structuredClone(message),
        groupId: group.groupId,
      }));
      this.#groups.delete(predecessor.groupId);
      this.#messages.delete(predecessor.groupId);
      this.#visibleMessageIds.delete(predecessor.groupId);
      this.#messageTombstones.delete(predecessor.groupId);
      if (predecessorReplayIds) {
        this.#messageTombstones.set(group.groupId, predecessorReplayIds);
      }
      this.#tombstones.set(predecessor.groupId, { removedAt: receivedAt, kind: "local" });
    }
    if (clearsRevokedTombstone) this.#tombstones.delete(packet.g);
    this.#groups.set(group.groupId, group);
    this.#messages.set(group.groupId, messages);
    this.#visibleMessageIds.set(group.groupId, new Set(messages.map(messageIdentity)));
    this.#recomputeGroupSummary(group, messages);
    this.#trimTombstones();
    try {
      this.#commitAuthoritativeMutation(() => {
        this.#groups.delete(group.groupId);
        this.#messages.delete(group.groupId);
        this.#visibleMessageIds.delete(group.groupId);
        this.#messageTombstones.delete(group.groupId);
        this.#tombstones.clear();
        for (const [groupId, item] of previousTombstones) this.#tombstones.set(groupId, item);
        if (canConvertPredecessor && predecessor) {
          this.#groups.set(predecessor.groupId, predecessor);
          this.#messages.set(predecessor.groupId, predecessorMessages);
          this.#visibleMessageIds.set(predecessor.groupId, predecessorVisibleIds);
          if (predecessorReplayIds) {
            this.#messageTombstones.set(predecessor.groupId, predecessorReplayIds);
          }
        }
        if (managedReplayIds) this.#messageTombstones.set(group.groupId, managedReplayIds);
      });
    } catch {
      return false;
    }
    if (canConvertPredecessor && predecessor) {
      this.#groupInboundRates.delete(predecessor.groupId);
      this.#removeQueuedRelaysForGroup(predecessor.groupId);
      this.#lastStateHandoffAt.delete(predecessor.groupId);
      this.#notify({ kind: "group-removed", groupId: predecessor.groupId });
    }
    this.#notify({
      kind: "group-added",
      groupId: group.groupId,
      group: cloneGroup(group),
      incoming: true,
    });
    return true;
  }

  #receiveManagedAppearance(
    senderNumber: number,
    packet: ManagedGroupAppearancePacket,
  ): boolean {
    const group = this.#groups.get(packet.g);
    if (
      !group ||
      group.protocolVersion !== 2 ||
      senderNumber !== packet.o ||
      packet.o !== group.creatorNumber ||
      packet.e !== group.epochId ||
      managedGroupOwner(packet.g) !== packet.o
    ) {
      return false;
    }
    if (packet.r < group.appearanceRevision) return false;
    if (packet.r === group.appearanceRevision) {
      return packet.a === group.avatarUrl && packet.c === group.outlineColor;
    }
    group.avatarUrl = packet.a;
    group.outlineColor = packet.c;
    group.appearanceRevision = packet.r;
    group.updatedAt = safeNow(this.#now);
    this.#schedulePersistence();
    this.#notify({ kind: "group-updated", groupId: group.groupId, group: cloneGroup(group) });
    return true;
  }

  #receiveManagedMemberNames(
    senderNumber: number,
    packet: ManagedGroupMemberNamesPacket,
  ): boolean {
    const group = this.#groups.get(packet.g);
    if (
      !group ||
      group.protocolVersion !== 2 ||
      senderNumber !== packet.o ||
      packet.o !== group.creatorNumber ||
      packet.e !== group.epochId ||
      packet.r !== group.stateRevision ||
      !sameMembers(group.memberNumbers, packet.d.map(([memberNumber]) => memberNumber))
    ) {
      return false;
    }
    const names = Object.fromEntries(packet.d.map(([memberNumber, name]) => [memberNumber, name]));
    if (packet.r < group.memberNamesRevision) return false;
    if (packet.r === group.memberNamesRevision) {
      return sameMemberNames(group.memberNames, names, group.memberNumbers);
    }
    group.memberNames = names;
    group.memberNamesRevision = packet.r;
    group.updatedAt = safeNow(this.#now);
    this.#schedulePersistence();
    this.#notify({ kind: "group-updated", groupId: group.groupId, group: cloneGroup(group) });
    return true;
  }

  #receiveManagedRemoval(senderNumber: number, packet: ManagedGroupRemovalPacket): boolean {
    const group = this.#groups.get(packet.g);
    if (
      !group ||
      group.protocolVersion !== 2 ||
      senderNumber !== packet.o ||
      packet.o !== group.creatorNumber ||
      managedGroupOwner(packet.g) !== packet.o ||
      packet.e !== group.epochId ||
      packet.r <= group.stateRevision
    ) {
      return false;
    }
    try {
      this.#prepareAuthoritativeMutation();
    } catch {
      return false;
    }
    const removedAt = safeNow(this.#now);
    const messages = this.#messages.get(group.groupId) ?? [];
    const visibleIds = this.#visibleMessageIds.get(group.groupId) ?? new Set<string>();
    const messageTombstones = this.#messageTombstones.get(group.groupId);
    const previousTombstones = new Map(
      [...this.#tombstones].map(([groupId, item]) => [groupId, structuredClone(item)]),
    );
    this.#groups.delete(group.groupId);
    this.#messages.delete(group.groupId);
    this.#visibleMessageIds.delete(group.groupId);
    this.#messageTombstones.delete(group.groupId);
    this.#tombstones.set(group.groupId, {
      removedAt,
      kind: "revoked",
      creatorNumber: group.creatorNumber,
      epochId: group.epochId,
      stateRevision: packet.r,
    });
    this.#trimTombstones();
    try {
      this.#commitAuthoritativeMutation(() => {
        this.#tombstones.clear();
        for (const [groupId, item] of previousTombstones) this.#tombstones.set(groupId, item);
        this.#groups.set(group.groupId, group);
        this.#messages.set(group.groupId, messages);
        this.#visibleMessageIds.set(group.groupId, visibleIds);
        if (messageTombstones) {
          this.#messageTombstones.set(group.groupId, messageTombstones);
        }
      });
    } catch {
      return false;
    }
    this.#groupInboundRates.delete(group.groupId);
    this.#removeQueuedRelaysForGroup(group.groupId);
    this.#lastStateHandoffAt.delete(group.groupId);
    this.#notify({ kind: "group-removed", groupId: group.groupId });
    return true;
  }

  #receiveMessage(
    senderNumber: number,
    packet: GroupWireMessagePacket | ManagedGroupWireMessagePacket,
    activeGroupId: string | undefined,
  ): boolean {
    const group = this.#groups.get(packet.g);
    if (
      !group ||
      group.protocolVersion !== packet.v ||
      (packet.v === 2 && packet.e !== group.epochId) ||
      !group.memberNumbers.includes(senderNumber)
    ) {
      return false;
    }
    if (this.#hasSeenMessageId(packet.g, senderNumber, packet.i)) return false;
    if (!this.#consumeGroupMessageRate(packet.g, senderNumber)) return false;

    const receivedAt = safeNow(this.#now);
    const message: GroupMessage = {
      id: packet.i,
      groupId: packet.g,
      senderNumber,
      senderName: this.#displayMemberName(group, senderNumber),
      direction: "incoming",
      content: packet.c,
      sentAt: clampRemoteTimestamp(packet.u, receivedAt),
      read: activeGroupId === packet.g,
    };
    group.memberNames = { ...group.memberNames, [senderNumber]: message.senderName };
    this.#appendMessage(group, message);
    this.#schedulePersistence();
    this.#notify({ kind: "message", groupId: packet.g, message: structuredClone(message), incoming: true });
    if (
      this.#ownMemberNumber() === group.creatorNumber &&
      senderNumber !== group.creatorNumber &&
      packet.c.length <= (packet.v === 2
        ? GROUP_MANAGED_MESSAGE_MAX_CONTENT
        : GROUP_MESSAGE_MAX_CONTENT)
    ) {
      this.#queueRelay(group, senderNumber, packet);
    }
    return true;
  }

  #receiveRelay(
    senderNumber: number,
    packet: GroupRelayMessagePacket | ManagedGroupRelayMessagePacket,
    activeGroupId: string | undefined,
  ): boolean {
    const group = this.#groups.get(packet.g);
    const ownMemberNumber = this.#ownMemberNumber();
    if (
      !group ||
      group.protocolVersion !== packet.v ||
      (packet.v === 2 && packet.e !== group.epochId) ||
      senderNumber !== group.creatorNumber ||
      ownMemberNumber === group.creatorNumber ||
      packet.o === group.creatorNumber ||
      packet.o === ownMemberNumber ||
      !group.memberNumbers.includes(packet.o) ||
      this.#isBlocked(packet.o, true) ||
      this.#hasSeenMessageId(packet.g, packet.o, packet.i)
    ) {
      return false;
    }
    if (!this.#consumeGroupMessageRate(packet.g, packet.o)) return false;

    const receivedAt = safeNow(this.#now);
    const message: GroupMessage = {
      id: packet.i,
      groupId: packet.g,
      senderNumber: packet.o,
      senderName: this.#displayMemberName(group, packet.o),
      direction: "incoming",
      content: packet.c,
      sentAt: clampRemoteTimestamp(packet.u, receivedAt),
      read: activeGroupId === packet.g,
    };
    this.#appendMessage(group, message);
    this.#schedulePersistence();
    this.#notify({ kind: "message", groupId: packet.g, message: structuredClone(message), incoming: true });
    return true;
  }

  #appendMessage(group: GroupConversation, message: GroupMessage): void {
    const messages = this.#messages.get(group.groupId) ?? [];
    const visibleIds = this.#visibleMessageIds.get(group.groupId) ?? new Set<string>();
    messages.push(message);
    visibleIds.add(messageIdentity(message));
    messages.sort(compareMessages);
    if (messages.length > GROUP_MAX_MESSAGES) {
      const removed = messages.splice(0, messages.length - GROUP_MAX_MESSAGES);
      const seenAt = safeNow(this.#now);
      for (const item of removed) {
        visibleIds.delete(messageIdentity(item));
        this.#rememberMessageId(
          group.groupId,
          item.senderNumber,
          item.id,
          seenAt,
        );
      }
    }
    this.#messages.set(group.groupId, messages);
    this.#visibleMessageIds.set(group.groupId, visibleIds);
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

  #multicastDirect(
    group: GroupConversation,
    payload: string,
    targetMemberNumbers: readonly number[] = group.memberNumbers,
  ): Pick<GroupSendResult, "handedOffTo" | "failed"> {
    const ownMemberNumber = this.#ownMemberNumber();
    const handedOffTo: number[] = [];
    const failed: GroupDeliveryFailure[] = [];
    for (const memberNumber of targetMemberNumbers) {
      if (
        memberNumber === ownMemberNumber ||
        !group.memberNumbers.includes(memberNumber)
      ) {
        continue;
      }
      if (this.#isBlocked(memberNumber, true)) {
        failed.push({ memberNumber, message: "Member is blocked or ghosted" });
        continue;
      }
      if (!this.#canDirectSend(memberNumber)) {
        failed.push({
          memberNumber,
          message: "No same-room or known-friend route is available",
        });
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

  #routeAuthoredMessage(
    group: GroupConversation,
    payload: string,
  ): Pick<
    GroupSendResult,
    "handedOffTo" | "failed" | "relayViaCreator" | "relayTargets" | "unreachable"
  > {
    const ownMemberNumber = this.#ownMemberNumber();
    const handedOffTo: number[] = [];
    const failed: GroupDeliveryFailure[] = [];
    const blocked = new Set<number>();
    for (const memberNumber of group.memberNumbers) {
      if (memberNumber === ownMemberNumber) continue;
      if (this.#isBlocked(memberNumber, true)) blocked.add(memberNumber);
    }
    const creatorRelayWouldBypassBlock =
      ownMemberNumber !== group.creatorNumber &&
      [...blocked].some((memberNumber) => memberNumber !== group.creatorNumber);
    for (const memberNumber of group.memberNumbers) {
      if (memberNumber === ownMemberNumber) continue;
      if (blocked.has(memberNumber)) {
        failed.push({ memberNumber, message: "Member is blocked or ghosted" });
        continue;
      }
      if (memberNumber === group.creatorNumber && creatorRelayWouldBypassBlock) {
        failed.push({
          memberNumber,
          message: "Creator relay is disabled while another group member is blocked or ghosted",
        });
        continue;
      }
      if (!this.#canDirectSend(memberNumber)) continue;
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

    const handedOff = new Set(handedOffTo);
    const canUseCreatorRelay =
      ownMemberNumber !== group.creatorNumber && handedOff.has(group.creatorNumber);
    const relayTargets = canUseCreatorRelay
      ? group.memberNumbers.filter((memberNumber) =>
          memberNumber !== ownMemberNumber &&
          memberNumber !== group.creatorNumber &&
          !blocked.has(memberNumber) &&
          !handedOff.has(memberNumber),
        )
      : [];
    const reachable = new Set([...handedOffTo, ...relayTargets]);
    const unreachable = group.memberNumbers.filter((memberNumber) =>
      memberNumber !== ownMemberNumber && !reachable.has(memberNumber),
    );
    for (const memberNumber of unreachable) {
      if (failed.some((failure) => failure.memberNumber === memberNumber)) continue;
      failed.push({
        memberNumber,
        message: memberNumber === group.creatorNumber
          ? "The group creator is unavailable for relay"
          : "No direct route is available and the group creator could not relay",
      });
    }
    return {
      handedOffTo,
      failed,
      ...(relayTargets.length > 0 ? { relayViaCreator: group.creatorNumber, relayTargets } : {}),
      unreachable,
    };
  }

  #canDirectSend(memberNumber: number): boolean {
    try {
      if (this.transport.isMemberInCurrentRoom?.(memberNumber) === true) return true;
    } catch {
      // Continue with the friend route; guarded room state is not proof that it is unavailable.
    }
    try {
      return this.transport.isKnownFriend?.(memberNumber) === true;
    } catch {
      return false;
    }
  }

  #sendMemberNames(group: GroupConversation, memberNumbers: readonly number[]): void {
    if (
      group.protocolVersion !== 1 ||
      group.creatorNumber !== this.#ownMemberNumber() ||
      memberNumbers.length === 0
    ) {
      return;
    }
    let payload: string;
    try {
      payload = serializeGroupChatPacket({
        t: "gn",
        v: 1,
        g: group.groupId,
        d: group.memberNumbers.map((memberNumber) => [
          memberNumber,
          normalizeWireMemberName(group.memberNames[memberNumber], memberNumber),
        ]),
        u: group.createdAt,
      });
    } catch {
      return;
    }
    for (const memberNumber of memberNumbers) {
      try {
        this.transport.sendKikiLinkProtocol(memberNumber, payload);
      } catch {
        // Names are display-only. Invitation delivery remains the authoritative reported operation.
      }
    }
  }

  #sendManagedState(
    group: GroupConversation,
    predecessorId: string,
    targetMemberNumbers: readonly number[] = group.memberNumbers,
  ): Pick<GroupMutationResult, "handedOffTo" | "failed"> {
    const payload = serializeGroupChatPacket(this.#managedStatePacket(group, predecessorId));
    return this.#multicastDirect(group, payload, targetMemberNumbers);
  }

  #sendManagedAppearance(group: GroupConversation, memberNumbers: readonly number[]): void {
    if (
      group.protocolVersion !== 2 ||
      group.creatorNumber !== this.#ownMemberNumber() ||
      memberNumbers.length === 0
    ) {
      return;
    }
    let payload: string;
    try {
      payload = serializeGroupChatPacket(this.#managedAppearancePacket(group));
    } catch {
      return;
    }
    this.#sendDisplayPackets(memberNumbers, payload);
  }

  #sendManagedMemberNames(group: GroupConversation, memberNumbers: readonly number[]): void {
    if (
      group.protocolVersion !== 2 ||
      group.creatorNumber !== this.#ownMemberNumber() ||
      memberNumbers.length === 0
    ) {
      return;
    }
    let payload: string | undefined;
    // UTF-8 can cost 1-3 bytes per UTF-16 unit. Keep ordinary names at the full display limit,
    // shrinking only an unusually expensive five-name envelope until it fits the BC packet cap.
    for (let maxNameLength = GROUP_MEMBER_NAME_MAX_CHARS; maxNameLength >= 1; maxNameLength -= 1) {
      try {
        payload = serializeGroupChatPacket({
          t: "gn",
          v: 2,
          g: group.groupId,
          o: group.creatorNumber,
          e: group.epochId!,
          r: group.stateRevision,
          d: group.memberNumbers.map((memberNumber) => [
            memberNumber,
            normalizeWireMemberName(
              group.memberNames[memberNumber],
              memberNumber,
              maxNameLength,
            ),
          ]),
          u: group.createdAt,
        });
        break;
      } catch {
        // Try the next shorter canonical envelope.
      }
    }
    if (!payload) return;
    this.#sendDisplayPackets(memberNumbers, payload);
  }

  #sendDisplayPackets(memberNumbers: readonly number[], payload: string): void {
    for (const memberNumber of memberNumbers) {
      try {
        this.transport.sendKikiLinkProtocol(memberNumber, payload);
      } catch {
        // The authoritative state packet remains the reported handoff; display repair is optional.
      }
    }
  }

  #rememberManagedRemoval(
    group: GroupConversation,
    memberNumber: number,
    previousEpoch: string,
    stateRevision: number,
  ): string {
    const now = safeNow(this.#now);
    const revocation: PendingManagedRevocation = {
      groupId: group.groupId,
      creatorNumber: group.creatorNumber,
      targetNumber: memberNumber,
      epochId: previousEpoch,
      stateRevision,
      createdAt: group.createdAt,
      queuedAt: now,
      lastAttemptAt: 0,
      attempts: 0,
    };
    const key = pendingRevocationKey(group.groupId, memberNumber);
    this.#pendingRevocations.set(key, revocation);
    this.#trimPendingRevocations();
    return key;
  }

  #deliverManagedRemoval(
    key: string,
  ): Pick<GroupMutationResult, "handedOffTo" | "failed"> {
    const revocation = this.#pendingRevocations.get(key);
    if (!revocation) return { handedOffTo: [], failed: [] };
    const now = safeNow(this.#now);
    revocation.lastAttemptAt = now;
    revocation.attempts += 1;
    const delivery = this.#attemptManagedRemoval(revocation);
    if (delivery.handedOffTo.length > 0) this.#pendingRevocations.delete(key);
    this.#schedulePersistence();
    this.#scheduleRevocationRetry(true);
    return delivery;
  }

  #attemptManagedRemoval(
    revocation: PendingManagedRevocation,
  ): Pick<GroupMutationResult, "handedOffTo" | "failed"> {
    const memberNumber = revocation.targetNumber;
    if (this.#isBlocked(memberNumber, true)) {
      return {
        handedOffTo: [],
        failed: [{ memberNumber, message: "Member is blocked or ghosted" }],
      };
    }
    if (!this.#canDirectSend(memberNumber)) {
      return {
        handedOffTo: [],
        failed: [{ memberNumber, message: "No same-room or known-friend route is available" }],
      };
    }
    const payload = serializeGroupChatPacket({
      t: "gx",
      v: 2,
      g: revocation.groupId,
      o: revocation.creatorNumber,
      e: revocation.epochId,
      r: revocation.stateRevision,
      u: revocation.createdAt,
    });
    try {
      this.transport.sendKikiLinkProtocol(memberNumber, payload);
      return { handedOffTo: [memberNumber], failed: [] };
    } catch (error) {
      return {
        handedOffTo: [],
        failed: [{
          memberNumber,
          message: error instanceof Error ? error.message : "KikiLink packet could not be sent",
        }],
      };
    }
  }

  #retryManagedRevocations(groupId?: string): void {
    if (this.#closing || this.#destroyed || !this.#isBoundAccountCurrent()) {
      this.#clearRevocationTimer();
      return;
    }
    const now = safeNow(this.#now);
    let changed = false;
    for (const [key, revocation] of this.#pendingRevocations) {
      if (groupId !== undefined && revocation.groupId !== groupId) continue;
      if (
        now >= revocation.queuedAt &&
        (now - revocation.queuedAt >= GROUP_REVOCATION_RETRY_HORIZON_MS ||
          revocation.attempts >= GROUP_REVOCATION_MAX_ATTEMPTS)
      ) {
        this.#pendingRevocations.delete(key);
        changed = true;
        continue;
      }
      if (
        now < revocation.lastAttemptAt ||
        now - revocation.lastAttemptAt < revocationRetryDelay(revocation.attempts)
      ) {
        continue;
      }
      revocation.lastAttemptAt = now;
      revocation.attempts += 1;
      changed = true;
      if (this.#attemptManagedRemoval(revocation).handedOffTo.length > 0) {
        this.#pendingRevocations.delete(key);
      }
    }
    if (changed) this.#schedulePersistence();
    this.#scheduleRevocationRetry(true);
  }

  #scheduleRevocationRetry(reset = false): void {
    if (reset) this.#clearRevocationTimer();
    if (
      this.#revocationTimer !== undefined ||
      this.#closing ||
      this.#destroyed ||
      this.#pendingRevocations.size === 0
    ) {
      return;
    }
    const now = safeNow(this.#now);
    let nextAttemptAt = Number.POSITIVE_INFINITY;
    for (const revocation of this.#pendingRevocations.values()) {
      const expiresAt = revocation.queuedAt + GROUP_REVOCATION_RETRY_HORIZON_MS;
      const retryAt = revocation.attempts >= GROUP_REVOCATION_MAX_ATTEMPTS
        ? now
        : Math.min(
            expiresAt,
            (revocation.lastAttemptAt || revocation.queuedAt) +
              revocationRetryDelay(revocation.attempts),
          );
      nextAttemptAt = Math.min(nextAttemptAt, retryAt);
    }
    const delay = Math.max(0, Math.min(nextAttemptAt - now, 2_147_483_647));
    this.#revocationTimer = setTimeout(() => {
      this.#revocationTimer = undefined;
      this.#retryManagedRevocations();
    }, delay);
  }

  #clearRevocationTimer(): void {
    if (this.#revocationTimer !== undefined) clearTimeout(this.#revocationTimer);
    this.#revocationTimer = undefined;
  }

  #removePendingRevocationsForGroup(groupId: string): void {
    for (const [key, revocation] of this.#pendingRevocations) {
      if (revocation.groupId === groupId) this.#pendingRevocations.delete(key);
    }
  }

  #trimPendingRevocations(): void {
    if (this.#pendingRevocations.size <= GROUP_MAX_PENDING_REVOCATIONS) return;
    const remove = [...this.#pendingRevocations.entries()]
      .sort((left, right) => left[1].createdAt - right[1].createdAt)
      .slice(0, this.#pendingRevocations.size - GROUP_MAX_PENDING_REVOCATIONS);
    for (const [key] of remove) this.#pendingRevocations.delete(key);
  }

  #managedStatePacket(
    group: GroupConversation,
    predecessorId: string,
  ): ManagedGroupStatePacket {
    if (group.protocolVersion !== 2 || !group.epochId) {
      throw new Error("This group does not support managed state");
    }
    return {
      t: "gs",
      v: 2,
      g: group.groupId,
      o: group.creatorNumber,
      e: group.epochId,
      r: group.stateRevision,
      m: [...group.memberNumbers],
      n: group.title,
      p: predecessorId,
      u: group.createdAt,
    };
  }

  #managedAppearancePacket(group: GroupConversation): ManagedGroupAppearancePacket {
    if (group.protocolVersion !== 2) {
      throw new Error("This group does not support managed appearance");
    }
    return {
      t: "ga",
      v: 2,
      g: group.groupId,
      o: group.creatorNumber,
      e: group.epochId!,
      r: group.appearanceRevision,
      a: group.avatarUrl,
      c: group.outlineColor,
      u: group.createdAt,
    };
  }

  #queueRelay(
    group: GroupConversation,
    originNumber: number,
    packet: GroupWireMessagePacket | ManagedGroupWireMessagePacket,
  ): void {
    if (
      this.#closing ||
      this.#destroyed ||
      this.#ownMemberNumber() !== group.creatorNumber ||
      originNumber === group.creatorNumber
    ) {
      return;
    }
    let payload: string;
    try {
      payload = packet.v === 2
        ? serializeGroupChatPacket({
            t: "gr",
            v: 2,
            g: packet.g,
            e: packet.e,
            o: originNumber,
            i: packet.i,
            c: packet.c,
            u: packet.u,
          })
        : serializeGroupChatPacket({
            t: "gr",
            v: 1,
            g: packet.g,
            o: originNumber,
            i: packet.i,
            c: packet.c,
            u: packet.u,
          });
    } catch {
      return;
    }
    const now = safeNow(this.#now);
    this.#pruneExpiredRelays(now);
    for (const targetNumber of group.memberNumbers) {
      if (
        targetNumber === group.creatorNumber ||
        targetNumber === originNumber ||
        this.#isBlocked(targetNumber, true) ||
        !this.#canDirectSend(targetNumber)
      ) {
        continue;
      }
      this.#admitQueuedRelay({
        groupId: group.groupId,
        ...(packet.v === 2 ? { epochId: packet.e } : {}),
        originNumber,
        targetNumber,
        payload,
        expiresAt: now + GROUP_RELAY_TTL_MS,
      });
    }
    this.#scheduleRelayDrain();
  }

  #scheduleRelayDrain(): void {
    if (
      this.#closing ||
      this.#destroyed ||
      this.#relayTimer !== undefined ||
      this.#relayQueue.length === 0
    ) {
      return;
    }
    this.#relayTimer = setTimeout(() => {
      this.#relayTimer = undefined;
      this.#drainRelayQueue();
    }, GROUP_RELAY_INTERVAL_MS);
  }

  #drainRelayQueue(): void {
    if (this.#closing || this.#destroyed || !this.#isBoundAccountCurrent()) {
      this.#clearRelayQueue();
      return;
    }
    const now = safeNow(this.#now);
    while (this.#relayQueue.length > 0) {
      const item = this.#takeNextFairRelay();
      if (!item || item.expiresAt <= now) continue;
      const group = this.#groups.get(item.groupId);
      if (
        !group ||
        group.epochId !== item.epochId ||
        group.creatorNumber !== this.#ownMemberNumber() ||
        !group.memberNumbers.includes(item.originNumber) ||
        !group.memberNumbers.includes(item.targetNumber) ||
        item.originNumber === group.creatorNumber ||
        item.targetNumber === group.creatorNumber ||
        item.targetNumber === item.originNumber ||
        this.#isBlocked(item.originNumber, true) ||
        this.#isBlocked(item.targetNumber, true) ||
        !this.#canDirectSend(item.targetNumber)
      ) {
        continue;
      }
      try {
        this.transport.sendKikiLinkProtocol(item.targetNumber, item.payload);
      } catch {
        // The queue is deliberately best-effort and never retries beyond its short lifetime.
      }
      break;
    }
    this.#scheduleRelayDrain();
  }

  #removeQueuedRelaysForGroup(groupId: string): void {
    for (let index = this.#relayQueue.length - 1; index >= 0; index -= 1) {
      if (this.#relayQueue[index]?.groupId === groupId) this.#takeQueuedRelay(index);
    }
    if (this.#relayQueue.length === 0 && this.#relayTimer !== undefined) {
      clearTimeout(this.#relayTimer);
      this.#relayTimer = undefined;
    }
  }

  #clearRelayQueue(): void {
    if (this.#relayTimer !== undefined) clearTimeout(this.#relayTimer);
    this.#relayTimer = undefined;
    this.#relayQueue.splice(0);
    this.#relayFlowTurns.clear();
    this.#relayTurn = 0;
  }

  #takeQueuedRelay(index: number): RelayQueueItem | undefined {
    const [item] = this.#relayQueue.splice(index, 1);
    if (!item) return undefined;
    if (this.#relayQueue.length === 0) {
      this.#relayFlowTurns.clear();
      this.#relayTurn = 0;
      return item;
    }
    const flow = relayFlowKey(item);
    if (!this.#relayQueue.some((candidate) => relayFlowKey(candidate) === flow)) {
      this.#relayFlowTurns.delete(flow);
    }
    return item;
  }

  #pruneExpiredRelays(now: number): void {
    for (let index = this.#relayQueue.length - 1; index >= 0; index -= 1) {
      const item = this.#relayQueue[index];
      if (item && item.expiresAt <= now) this.#takeQueuedRelay(index);
    }
  }

  /**
   * Keeps the bounded queue available to a newly-active `(group, origin)` flow without
   * reserving capacity that an otherwise idle queue could use. At saturation, a quiet flow
   * borrows one slot from a most-represented flow; equally represented flows cannot evict each
   * other. Removing the newest victim preserves FIFO ordering inside every surviving flow.
   */
  #admitQueuedRelay(item: RelayQueueItem): boolean {
    if (this.#relayQueue.length < GROUP_RELAY_QUEUE_CAPACITY) {
      this.#relayQueue.push(item);
      return true;
    }

    const occupancy = new Map<string, number>();
    for (const queued of this.#relayQueue) {
      const flow = relayFlowKey(queued);
      occupancy.set(flow, (occupancy.get(flow) ?? 0) + 1);
    }
    const incomingFlow = relayFlowKey(item);
    const incomingCount = occupancy.get(incomingFlow) ?? 0;
    let largestCount = 0;
    for (const count of occupancy.values()) largestCount = Math.max(largestCount, count);
    if (largestCount <= incomingCount) return false;

    for (let index = this.#relayQueue.length - 1; index >= 0; index -= 1) {
      const candidate = this.#relayQueue[index];
      if (!candidate || occupancy.get(relayFlowKey(candidate)) !== largestCount) continue;
      this.#takeQueuedRelay(index);
      this.#relayQueue.push(item);
      return true;
    }
    return false;
  }

  /** Drains one oldest item from the least-recently-served active flow. */
  #takeNextFairRelay(): RelayQueueItem | undefined {
    let selectedIndex = -1;
    let selectedTurn = Number.POSITIVE_INFINITY;
    const inspectedFlows = new Set<string>();
    for (let index = 0; index < this.#relayQueue.length; index += 1) {
      const item = this.#relayQueue[index];
      if (!item) continue;
      const flow = relayFlowKey(item);
      if (inspectedFlows.has(flow)) continue;
      inspectedFlows.add(flow);
      const turn = this.#relayFlowTurns.get(flow) ?? -1;
      if (turn < selectedTurn) {
        selectedIndex = index;
        selectedTurn = turn;
      }
    }
    if (selectedIndex < 0) return undefined;

    const item = this.#takeQueuedRelay(selectedIndex);
    if (!item) return undefined;
    if (this.#relayQueue.length === 0) return item;
    if (this.#relayTurn >= Number.MAX_SAFE_INTEGER - 1) {
      this.#relayFlowTurns.clear();
      this.#relayTurn = 0;
    }
    this.#relayTurn += 1;
    const flow = relayFlowKey(item);
    if (this.#relayQueue.some((candidate) => relayFlowKey(candidate) === flow)) {
      // Mark the turn before validation/send so an invalid hot flow cannot monopolize drains.
      this.#relayFlowTurns.set(flow, this.#relayTurn);
    }
    return item;
  }

  #repairInvitesBeforeMessage(
    group: GroupConversation,
    ownMemberNumber: number,
    now: number,
  ): void {
    if (group.creatorNumber !== ownMemberNumber) return;
    const handoffs = this.#lastStateHandoffAt.get(group.groupId);
    const repairTargets = group.memberNumbers.filter((memberNumber) => {
      if (memberNumber === ownMemberNumber) return false;
      const lastHandoffAt = handoffs?.get(memberNumber);
      return lastHandoffAt === undefined ||
        now < lastHandoffAt ||
        now - lastHandoffAt >= GROUP_INVITE_REPAIR_INTERVAL_MS;
    });
    if (repairTargets.length === 0) return;
    const repair = group.protocolVersion === 2
      ? this.#sendManagedState(group, "", repairTargets)
      : this.#multicastDirect(group, serializeGroupChatPacket({
          t: "gi",
          v: 1,
          g: group.groupId,
          m: [...group.memberNumbers],
          n: group.title,
          u: group.createdAt,
        }), repairTargets);
    if (repair.handedOffTo.length > 0) {
      if (group.protocolVersion === 2) {
        this.#sendManagedAppearance(group, repair.handedOffTo);
        this.#sendManagedMemberNames(group, repair.handedOffTo);
      } else {
        this.#sendMemberNames(group, repair.handedOffTo);
      }
      this.#recordStateHandoffs(group, repair.handedOffTo, now);
    }
  }

  #recordStateHandoffs(
    group: GroupConversation,
    memberNumbers: readonly number[],
    handedOffAt: number,
  ): void {
    let handoffs = this.#lastStateHandoffAt.get(group.groupId);
    if (!handoffs) {
      handoffs = new Map<number, number>();
      this.#lastStateHandoffAt.set(group.groupId, handoffs);
    }
    const currentMembers = new Set(group.memberNumbers);
    for (const memberNumber of handoffs.keys()) {
      if (!currentMembers.has(memberNumber)) handoffs.delete(memberNumber);
    }
    for (const memberNumber of memberNumbers) {
      if (memberNumber !== this.#ownMemberNumber() && currentMembers.has(memberNumber)) {
        handoffs.set(memberNumber, handedOffAt);
      }
    }
    if (handoffs.size === 0) this.#lastStateHandoffAt.delete(group.groupId);
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
        metadata: { tokens: GROUP_METADATA_RATE_BURST, refilledAt: now },
        messages: { tokens: GROUP_MESSAGE_RATE_BURST, refilledAt: now },
      };
      this.#inboundRates.set(senderNumber, state);
    }
    state.lastSeenAt = Math.max(state.lastSeenAt, now);
    if (packetType === "gi" || packetType === "gs" || packetType === "gx") {
      return consumeRateToken(
        state.invites,
        GROUP_INVITE_RATE_BURST,
        GROUP_INVITE_RATE_REFILL_MS,
        now,
      );
    }
    if (packetType === "ga" || packetType === "gn") {
      return consumeRateToken(
        state.metadata,
        GROUP_METADATA_RATE_BURST,
        GROUP_METADATA_RATE_REFILL_MS,
        now,
      );
    }
    return consumeRateToken(
      state.messages,
      GROUP_MESSAGE_RATE_BURST,
      GROUP_MESSAGE_RATE_REFILL_MS,
      now,
    );
  }

  #consumeGroupMessageRate(groupId: string, originNumber: number): boolean {
    const now = safeNow(this.#now);
    for (const [candidateGroupId, state] of this.#groupInboundRates) {
      if (now >= state.lastSeenAt && now - state.lastSeenAt > GROUP_RATE_STATE_TTL_MS) {
        this.#groupInboundRates.delete(candidateGroupId);
      }
    }
    let state = this.#groupInboundRates.get(groupId);
    if (!state) {
      state = {
        lastSeenAt: now,
        aggregate: { tokens: GROUP_AGGREGATE_RATE_BURST, refilledAt: now },
        origins: new Map(),
      };
      this.#groupInboundRates.set(groupId, state);
    }
    state.lastSeenAt = Math.max(state.lastSeenAt, now);
    let origin = state.origins.get(originNumber);
    if (!origin) {
      origin = { tokens: GROUP_ORIGIN_RATE_BURST, refilledAt: now };
      state.origins.set(originNumber, origin);
    }
    refillRateBucket(
      state.aggregate,
      GROUP_AGGREGATE_RATE_BURST,
      GROUP_AGGREGATE_RATE_REFILL_MS,
      now,
    );
    refillRateBucket(origin, GROUP_ORIGIN_RATE_BURST, GROUP_ORIGIN_RATE_REFILL_MS, now);
    if (state.aggregate.tokens < 1 || origin.tokens < 1) return false;
    state.aggregate.tokens -= 1;
    origin.tokens -= 1;
    return true;
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

  #hasSeenMessageId(groupId: string, originNumber: number, messageId: string): boolean {
    const identity = messageIdentity(originNumber, messageId);
    const replayIds = this.#messageTombstones.get(groupId);
    if (
      replayIds?.has(identity) ||
      replayIds?.has(wildcardMessageIdentity(messageId))
    ) {
      return true;
    }
    return this.#visibleMessageIds.get(groupId)?.has(identity) === true;
  }

  #rememberMessageId(
    groupId: string,
    originNumber: number | undefined,
    messageId: string,
    seenAt: number,
  ): void {
    let ids = this.#messageTombstones.get(groupId);
    if (!ids) {
      ids = new Map<string, number>();
      this.#messageTombstones.set(groupId, ids);
    }
    const identity = originNumber === undefined
      ? wildcardMessageIdentity(messageId)
      : messageIdentity(originNumber, messageId);
    if (ids.has(identity)) return;
    ids.set(identity, seenAt);
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
        [...ids].flatMap(([identity, seenAt]) => {
          const parsed = parseMessageIdentity(identity);
          return parsed ? [{ groupId, ...parsed, seenAt, identity }] : [];
        }),
      );
    all.sort(compareMessageTombstones);
    for (const item of all.slice(0, total - GROUP_MAX_REPLAY_IDS_TOTAL)) {
      const ids = this.#messageTombstones.get(item.groupId);
      ids?.delete(item.identity);
      if (ids?.size === 0) this.#messageTombstones.delete(item.groupId);
    }
  }

  #canAutoAccept(senderNumber: number): boolean {
    return this.#isKnownFriend(senderNumber);
  }

  #isKnownFriend(memberNumber: number): boolean {
    try {
      return this.transport.isKnownFriend?.(memberNumber) === true;
    } catch {
      // A guarded cross-realm BC object must not bypass the explicit friend trust boundary.
      return false;
    }
  }

  #isBlocked(memberNumber: number, failClosed = true): boolean {
    const readRelationships = this.transport.getPlayerRelationships;
    if (typeof readRelationships !== "function") return failClosed;
    try {
      const relationships = readRelationships.call(this.transport, memberNumber);
      if (!Array.isArray(relationships)) return failClosed;
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

  #displayMemberName(group: GroupConversation, memberNumber: number): string {
    const fallback = `Member ${memberNumber}`;
    const locallyResolved = this.#memberName(memberNumber);
    if (locallyResolved !== fallback) return locallyResolved;
    return normalizeMemberName(group.memberNames[memberNumber], memberNumber);
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

  #requireManagedCreatorGroup(groupId: string): GroupConversation {
    const group = this.#requireGroup(groupId);
    this.#assertCreator(group);
    if (group.protocolVersion !== 2 || !group.epochId) {
      throw new Error("Convert this legacy group before using owner controls");
    }
    return group;
  }

  #assertCreator(group: GroupConversation): void {
    if (group.creatorNumber !== this.#ownMemberNumber()) {
      throw new Error("Only the group owner can make this change");
    }
  }

  #assertManagedMembers(members: readonly number[], creatorNumber: number): void {
    for (const memberNumber of members) {
      if (memberNumber === creatorNumber) continue;
      if (!this.#isKnownFriend(memberNumber)) {
        throw new Error(`Member ${memberNumber} must be a known BC friend`);
      }
      if (this.#isBlocked(memberNumber, true)) {
        throw new Error(`Member ${memberNumber} is blocked or ghosted`);
      }
      let compatible = false;
      try {
        compatible = this.#hasManagedPeer?.(memberNumber) === true;
      } catch {
        compatible = false;
      }
      if (!compatible) {
        throw new Error(`Member ${memberNumber} needs managed group support (g3)`);
      }
    }
  }

  async #mutateManagedAppearance(
    groupId: string,
    mutate: (group: GroupConversation) => boolean,
    packet: "state" | "appearance",
  ): Promise<GroupMutationResult> {
    this.#assertOpen();
    return this.#enqueue(groupId, () => {
      this.#assertBoundAccount();
      const group = this.#requireManagedCreatorGroup(groupId);
      this.#prepareAuthoritativeMutation();
      const previousGroup = cloneGroup(group);
      if (!mutate(group)) return { group: cloneGroup(group), handedOffTo: [], failed: [] };
      group.updatedAt = safeNow(this.#now);
      this.#commitAuthoritativeMutation(() => {
        this.#groups.set(groupId, previousGroup);
      });
      this.#notify({ kind: "group-updated", groupId, group: cloneGroup(group) });
      const delivery = packet === "state"
        ? this.#sendManagedState(group, "")
        : this.#multicastDirect(
            group,
            serializeGroupChatPacket(this.#managedAppearancePacket(group)),
          );
      if (packet === "state" && delivery.handedOffTo.length > 0) {
        this.#recordStateHandoffs(group, delivery.handedOffTo, group.updatedAt);
      }
      this.#retryManagedRevocations(group.groupId);
      return { group: cloneGroup(group), ...delivery };
    });
  }

  #newManagedGroupId(ownerNumber: number): string {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = idToken(this.#idFactory("group"), 31);
      const candidate = `group2_${ownerNumber}_${token}`;
      if (
        validManagedGroupId(candidate) &&
        !this.#groups.has(candidate) &&
        !this.#tombstones.has(candidate)
      ) {
        return candidate;
      }
    }
    throw new Error("KikiLink could not create a creator-bound group identifier");
  }

  #newEpochId(previousEpoch?: string): string {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `ge_${idToken(this.#idFactory("group"), 40)}`;
      if (validEpochId(candidate) && candidate !== previousEpoch) return candidate;
    }
    throw new Error("KikiLink could not create a unique group generation");
  }

  #mergeCurrentMemberNames(
    previous: Readonly<Record<string, string>>,
    members: readonly number[],
  ): Record<string, string> {
    const names: Record<string, string> = {};
    for (const memberNumber of members) {
      names[memberNumber] = normalizeMemberName(previous[memberNumber], memberNumber);
      if (names[memberNumber] === `Member ${memberNumber}`) {
        names[memberNumber] = this.#memberName(memberNumber);
      }
    }
    return names;
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

  #schedulePersistence(enforceMaxWait = true): void {
    this.#markPersistenceDirty();
    if (this.#closing || this.#destroyed) return;
    if (this.#persistenceTimer !== undefined) clearTimeout(this.#persistenceTimer);
    this.#persistenceTimer = setTimeout(() => {
      this.#flushScheduledPersistence();
    }, this.#persistenceDelayMs);
    // Draft input already has a UI debounce and can be continuous. Its trailing write remains
    // lifecycle-safe via flush/pagehide/destroy without forcing a full 3k-message JSON rewrite
    // every max-wait interval. Any already-pending non-draft deadline is deliberately retained.
    if (!enforceMaxWait || this.#persistenceMaxWaitTimer !== undefined) return;
    this.#persistenceMaxWaitTimer = setTimeout(() => {
      this.#flushScheduledPersistence();
    }, GROUP_PERSISTENCE_MAX_WAIT_MS);
  }

  /** Rare owner-authoritative changes must start from a durable baseline before any wire send. */
  #prepareAuthoritativeMutation(): void {
    this.#clearPersistenceTimers();
    if (!this.#flushPersistenceNow()) {
      throw new Error("The managed group change could not be saved safely; retry when storage recovers");
    }
  }

  #commitAuthoritativeMutation(rollback: () => void): void {
    this.#markPersistenceDirty();
    this.#clearPersistenceTimers();
    if (this.#flushPersistenceNow()) return;
    rollback();
    // A store can fail after a partial write. Keep the durable rollback dirty so the normal
    // coalesced retry overwrites any ambiguous value before another authoritative mutation.
    this.#schedulePersistence();
    throw new Error("The managed group change could not be saved safely; no packet was sent");
  }

  #markPersistenceDirty(): void {
    this.#persistenceDirty = true;
  }

  #flushScheduledPersistence(): void {
    this.#clearPersistenceTimers();
    this.#flushPersistenceNow();
  }

  #clearPersistenceTimers(): void {
    if (this.#persistenceTimer !== undefined) clearTimeout(this.#persistenceTimer);
    if (this.#persistenceMaxWaitTimer !== undefined) {
      clearTimeout(this.#persistenceMaxWaitTimer);
    }
    this.#persistenceTimer = undefined;
    this.#persistenceMaxWaitTimer = undefined;
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
      this.#scheduleRevocationRetry(true);
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
        .map(([groupId, tombstone]) => ({ groupId, ...structuredClone(tombstone) }))
        .sort((left, right) => right.removedAt - left.removedAt)
        .slice(0, GROUP_MAX_TOMBSTONES),
      messageTombstones: [...this.#messageTombstones.entries()]
        .flatMap(([groupId, ids]) =>
          [...ids].flatMap(([identity, seenAt]) => {
            const parsed = parseMessageIdentity(identity);
            return parsed ? [{ groupId, ...parsed, seenAt }] : [];
          }),
        )
        .sort(compareMessageTombstones)
        .slice(-GROUP_MAX_REPLAY_IDS_TOTAL),
      pendingRevocations: [...this.#pendingRevocations.values()]
        .map((revocation) => structuredClone(revocation))
        .sort((left, right) => left.createdAt - right.createdAt)
        .slice(-GROUP_MAX_PENDING_REVOCATIONS),
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
    this.#visibleMessageIds.clear();
    this.#tombstones.clear();
    this.#messageTombstones.clear();
    this.#pendingRevocations.clear();
    this.#lastStateHandoffAt.clear();
    const ownMemberNumber = this.#accountMemberNumber;
    const storedGroups = value.groups;
    for (const candidate of storedGroups) {
      if (this.#groups.size >= GROUP_MAX_COUNT) break;
      const group = sanitizeStoredGroup(candidate, ownMemberNumber);
      if (!group || this.#groups.has(group.groupId)) continue;
      this.#groups.set(group.groupId, group);
      this.#messages.set(group.groupId, []);
      this.#visibleMessageIds.set(group.groupId, new Set());
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
        this.#rememberMessageId(
          candidate.groupId as string,
          candidate.originNumber,
          candidate.messageId,
          candidate.seenAt,
        );
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
      const identity = messageIdentity(message);
      if (ids.has(identity)) continue;
      ids.add(identity);
      seenMessageIds.set(group.groupId, ids);
      const messages = this.#messages.get(group.groupId) ?? [];
      messages.push(message);
      messages.sort(compareMessages);
      if (messages.length > GROUP_MAX_MESSAGES) {
        const evicted = messages.shift();
        if (evicted) {
          this.#rememberMessageId(
            group.groupId,
            evicted.senderNumber,
            evicted.id,
            clampRemoteTimestamp(evicted.sentAt, safeNow(this.#now)),
          );
        }
      }
      this.#messages.set(group.groupId, messages);
      this.#visibleMessageIds.set(group.groupId, new Set(messages.map(messageIdentity)));
    }
    for (const [groupId, messages] of this.#messages) {
      const evictedIds = this.#messageTombstones.get(groupId);
      if (!evictedIds) continue;
      for (const message of messages) {
        evictedIds.delete(messageIdentity(message));
        evictedIds.delete(wildcardMessageIdentity(message.id));
      }
      if (evictedIds.size === 0) this.#messageTombstones.delete(groupId);
    }
    for (const group of this.#groups.values()) {
      this.#recomputeGroupSummary(group, this.#messages.get(group.groupId) ?? []);
    }

    for (const revocation of value.pendingRevocations.slice(-GROUP_MAX_PENDING_REVOCATIONS)) {
      this.#pendingRevocations.set(
        pendingRevocationKey(revocation.groupId, revocation.targetNumber),
        structuredClone(revocation),
      );
    }

    {
      for (const candidate of value.tombstones.slice(0, GROUP_MAX_TOMBSTONES)) {
        if (!isRecord(candidate) || !validGroupId(candidate.groupId) || !validTimestamp(candidate.removedAt)) {
          continue;
        }
        if (!this.#groups.has(candidate.groupId)) {
          this.#tombstones.set(candidate.groupId, {
            removedAt: candidate.removedAt,
            kind: candidate.kind,
            ...(candidate.creatorNumber === undefined
              ? {}
              : { creatorNumber: candidate.creatorNumber }),
            ...(candidate.epochId === undefined ? {} : { epochId: candidate.epochId }),
            ...(candidate.stateRevision === undefined
              ? {}
              : { stateRevision: candidate.stateRevision }),
          });
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
      ids.add(messageIdentity(item.message));
      removedIds.set(item.groupId, ids);
      this.#rememberMessageId(
        item.groupId,
        item.message.senderNumber,
        item.message.id,
        seenAt,
      );
    }
    for (const [groupId, ids] of removedIds) {
      const kept = (this.#messages.get(groupId) ?? []).filter(
        (message) => !ids.has(messageIdentity(message)),
      );
      this.#messages.set(groupId, kept);
      this.#visibleMessageIds.set(groupId, new Set(kept.map(messageIdentity)));
      const group = this.#groups.get(groupId);
      if (group) this.#recomputeGroupSummary(group, kept);
    }
  }

  #trimTombstones(): void {
    if (this.#tombstones.size <= GROUP_MAX_TOMBSTONES) return;
    const keep = [...this.#tombstones.entries()]
      .sort((left, right) => right[1].removedAt - left[1].removedAt)
      .slice(0, GROUP_MAX_TOMBSTONES);
    this.#tombstones.clear();
    for (const [groupId, tombstone] of keep) this.#tombstones.set(groupId, tombstone);
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
    (value.version !== 1 && value.version !== 2 && value.version !== GROUP_STORAGE_VERSION) ||
    !Array.isArray(value.groups) ||
    !Array.isArray(value.messages) ||
    !Array.isArray(value.tombstones) ||
    !Array.isArray(value.messageTombstones) ||
    (value.version !== 1 &&
      value.pendingRevocations !== undefined &&
      !Array.isArray(value.pendingRevocations)) ||
    value.groups.length > GROUP_MAX_COUNT ||
    value.messages.length > GROUP_MAX_TOTAL_MESSAGES ||
    value.tombstones.length > GROUP_MAX_TOMBSTONES ||
    value.messageTombstones.length > GROUP_MAX_REPLAY_IDS_TOTAL ||
    (Array.isArray(value.pendingRevocations) &&
      value.pendingRevocations.length > GROUP_MAX_PENDING_REVOCATIONS)
  ) {
    return undefined;
  }
  const legacy = value.version === 1;
  const originAware = value.version === GROUP_STORAGE_VERSION;
  const collections = value as unknown as ReadableStoredGroupChatState;
  const rawPendingRevocations = !legacy && Array.isArray(value.pendingRevocations)
    ? value.pendingRevocations
    : [];

  const groups: GroupConversation[] = [];
  const groupsById = new Map<string, GroupConversation>();
  for (const candidate of collections.groups) {
    const group = sanitizeStoredGroup(candidate, ownMemberNumber, legacy);
    if (!group || groupsById.has(group.groupId)) return undefined;
    groups.push(group);
    groupsById.set(group.groupId, group);
  }

  const messages: GroupMessage[] = [];
  const visibleMessageIds = new Set<string>();
  const visibleBareMessageIds = new Set<string>();
  for (const candidate of collections.messages) {
    const groupId = isRecord(candidate) && typeof candidate.groupId === "string"
      ? candidate.groupId
      : "";
    const group = groupsById.get(groupId);
    if (!group) return undefined;
    const message = sanitizeStoredMessage(candidate, group, ownMemberNumber);
    if (!message) return undefined;
    const identity = storedMessageIdentity(
      message.groupId,
      message.senderNumber,
      message.id,
    );
    const bareIdentity = storedBareMessageIdentity(message.groupId, message.id);
    if (
      visibleMessageIds.has(identity) ||
      (!originAware && visibleBareMessageIds.has(bareIdentity))
    ) {
      return undefined;
    }
    visibleMessageIds.add(identity);
    visibleBareMessageIds.add(bareIdentity);
    messages.push(message);
  }

  const tombstones: StoredGroupChatState["tombstones"] = [];
  const removedGroupIds = new Set<string>();
  for (const rawCandidate of collections.tombstones) {
    if (
      !isRecord(rawCandidate) ||
      !validGroupId(rawCandidate.groupId) ||
      !validTimestamp(rawCandidate.removedAt) ||
      groupsById.has(rawCandidate.groupId) ||
      removedGroupIds.has(rawCandidate.groupId)
    ) {
      return undefined;
    }
    const candidate = rawCandidate as unknown as Record<string, unknown>;
    const groupId = candidate.groupId as string;
    const removedAt = candidate.removedAt as number;
    removedGroupIds.add(groupId);
    if (legacy) {
      tombstones.push({
        groupId,
        removedAt,
        kind: "local",
      });
      continue;
    }
    if (candidate.kind !== "local" && candidate.kind !== "revoked") return undefined;
    if (candidate.kind === "local") {
      tombstones.push({
        groupId,
        removedAt,
        kind: "local",
      });
      continue;
    }
    if (
      !validManagedGroupId(candidate.groupId) ||
      !validMemberNumber(candidate.creatorNumber) ||
      candidate.creatorNumber !== managedGroupOwner(candidate.groupId) ||
      !validEpochId(candidate.epochId) ||
      !validRevision(candidate.stateRevision)
    ) {
      return undefined;
    }
    tombstones.push({
      groupId,
      removedAt,
      kind: "revoked",
      creatorNumber: candidate.creatorNumber as number,
      epochId: candidate.epochId as string,
      stateRevision: candidate.stateRevision as number,
    });
  }

  const messageTombstones: StoredGroupChatState["messageTombstones"] = [];
  const replayMessageIds = new Set<string>();
  const replayWildcardMessageIds = new Set<string>();
  const replayBareMessageIds = new Set<string>();
  for (const candidate of collections.messageTombstones) {
    if (
      !isRecord(candidate) ||
      !validGroupId(candidate.groupId) ||
      !groupsById.has(candidate.groupId) ||
      !validMessageId(candidate.messageId) ||
      !validTimestamp(candidate.seenAt)
    ) {
      return undefined;
    }
    const originNumber = originAware && candidate.originNumber !== undefined
      ? candidate.originNumber
      : undefined;
    if (
      (!originAware && candidate.originNumber !== undefined) ||
      (originNumber !== undefined && !validMemberNumber(originNumber))
    ) {
      return undefined;
    }
    const groupId = candidate.groupId;
    const messageId = candidate.messageId;
    const bareIdentity = storedBareMessageIdentity(groupId, messageId);
    if (originNumber === undefined) {
      if (
        visibleBareMessageIds.has(bareIdentity) ||
        replayBareMessageIds.has(bareIdentity)
      ) {
        return undefined;
      }
      replayWildcardMessageIds.add(bareIdentity);
    } else {
      const identity = storedMessageIdentity(groupId, originNumber, messageId);
      if (
        visibleMessageIds.has(identity) ||
        replayMessageIds.has(identity) ||
        replayWildcardMessageIds.has(bareIdentity)
      ) {
        return undefined;
      }
      replayMessageIds.add(identity);
    }
    replayBareMessageIds.add(bareIdentity);
    messageTombstones.push({
      groupId,
      ...(originNumber === undefined ? {} : { originNumber }),
      messageId,
      seenAt: candidate.seenAt,
    });
  }

  const pendingRevocations: PendingManagedRevocation[] = [];
  const pendingKeys = new Set<string>();
  for (const candidate of rawPendingRevocations) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, [
        "groupId",
        "creatorNumber",
        "targetNumber",
        "epochId",
        "stateRevision",
        "createdAt",
        "queuedAt",
        "lastAttemptAt",
        "attempts",
      ]) ||
      !validManagedGroupId(candidate.groupId) ||
      !validMemberNumber(candidate.creatorNumber) ||
      candidate.creatorNumber !== ownMemberNumber ||
      candidate.creatorNumber !== managedGroupOwner(candidate.groupId) ||
      !validMemberNumber(candidate.targetNumber) ||
      candidate.targetNumber === candidate.creatorNumber ||
      !validEpochId(candidate.epochId) ||
      !validRevision(candidate.stateRevision) ||
      !validTimestamp(candidate.createdAt) ||
      !validTimestamp(candidate.queuedAt) ||
      !validTimestamp(candidate.lastAttemptAt) ||
      typeof candidate.attempts !== "number" ||
      !Number.isSafeInteger(candidate.attempts) ||
      candidate.attempts < 0 ||
      candidate.attempts > GROUP_REVOCATION_MAX_ATTEMPTS
    ) {
      return undefined;
    }
    const group = groupsById.get(candidate.groupId);
    if (
      !group ||
      group.protocolVersion !== 2 ||
      group.creatorNumber !== ownMemberNumber ||
      candidate.createdAt !== group.createdAt ||
      candidate.epochId === group.epochId ||
      candidate.stateRevision > group.stateRevision
    ) {
      return undefined;
    }
    const key = pendingRevocationKey(candidate.groupId, candidate.targetNumber);
    if (pendingKeys.has(key)) return undefined;
    pendingKeys.add(key);
    pendingRevocations.push({
      groupId: candidate.groupId,
      creatorNumber: candidate.creatorNumber,
      targetNumber: candidate.targetNumber,
      epochId: candidate.epochId,
      stateRevision: candidate.stateRevision,
      createdAt: candidate.createdAt,
      queuedAt: candidate.queuedAt,
      lastAttemptAt: candidate.lastAttemptAt,
      attempts: candidate.attempts,
    });
  }

  return {
    version: GROUP_STORAGE_VERSION,
    groups,
    messages,
    tombstones,
    messageTombstones,
    pendingRevocations,
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
  if (!isRecord(value) || !validTimestamp(value.u)) {
    return null;
  }
  if (value.v === 2) {
    if (utf8ByteLength(payload) > GROUP_PACKET_MAX_CHARS) return null;
    return parseManagedGroupChatPacket(value);
  }
  if (value.v !== 1 || !validLegacyGroupId(value.g)) return null;

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
      value.c.length > GROUP_LEGACY_DIRECT_MESSAGE_MAX_CONTENT ||
      DISALLOWED_CONTROL_PATTERN.test(value.c) ||
      hasUnpairedSurrogate(value.c)
    ) {
      return null;
    }
    const content = normalizeMessageContent(value.c);
    if (!content || content.length > GROUP_LEGACY_DIRECT_MESSAGE_MAX_CONTENT) return null;
    return { t: "gm", v: 1, g: value.g, i: value.i, c: content, u: value.u };
  }
  if (value.t === "gr") {
    if (!hasExactKeys(value, ["t", "v", "g", "o", "i", "c", "u"])) return null;
    if (
      !validMemberNumber(value.o) ||
      !validMessageId(value.i) ||
      typeof value.c !== "string" ||
      value.c.length < 1 ||
      value.c.length > GROUP_MESSAGE_MAX_CONTENT ||
      DISALLOWED_CONTROL_PATTERN.test(value.c) ||
      hasUnpairedSurrogate(value.c)
    ) {
      return null;
    }
    const content = normalizeMessageContent(value.c);
    if (!content || content.length > GROUP_MESSAGE_MAX_CONTENT) return null;
    return {
      t: "gr",
      v: 1,
      g: value.g,
      o: value.o,
      i: value.i,
      c: content,
      u: value.u,
    };
  }
  if (value.t === "gn") {
    if (!hasExactKeys(value, ["t", "v", "g", "d", "u"])) return null;
    const memberNames = strictCanonicalMemberNames(value.d);
    if (!memberNames) return null;
    return { t: "gn", v: 1, g: value.g, d: memberNames, u: value.u };
  }
  return null;
}

export function serializeGroupChatPacket(packet: GroupChatPacket): string {
  const payload = JSON.stringify(packet);
  if (
    !parseGroupChatPacket(payload) ||
    payload.length > GROUP_PACKET_MAX_CHARS ||
    (packet.v === 2 && utf8ByteLength(payload) > GROUP_PACKET_MAX_CHARS)
  ) {
    throw new Error("KikiLink group packet exceeds its safe transport bounds");
  }
  return payload;
}

function parseManagedGroupChatPacket(value: Record<string, unknown>): GroupChatPacket | null {
  if (!validManagedGroupId(value.g) || managedGroupOwner(value.g) === undefined) return null;
  if (value.t === "gs") {
    if (!hasExactKeys(value, ["t", "v", "g", "o", "e", "r", "m", "n", "p", "u"])) {
      return null;
    }
    const members = strictCanonicalMembers(value.m);
    const title = normalizeTitle(value.n);
    if (
      !validMemberNumber(value.o) ||
      value.o !== managedGroupOwner(value.g) ||
      !validEpochId(value.e) ||
      !validRevision(value.r) ||
      !members ||
      !members.includes(value.o) ||
      typeof value.n !== "string" ||
      title !== value.n ||
      (value.p !== "" && !validLegacyGroupId(value.p))
    ) {
      return null;
    }
    return {
      t: "gs",
      v: 2,
      g: value.g,
      o: value.o,
      e: value.e,
      r: value.r,
      m: members,
      n: title,
      p: value.p,
      u: value.u as number,
    };
  }
  if (value.t === "ga") {
    if (!hasExactKeys(value, ["t", "v", "g", "o", "e", "r", "a", "c", "u"])) {
      return null;
    }
    if (
      !validMemberNumber(value.o) ||
      value.o !== managedGroupOwner(value.g) ||
      !validEpochId(value.e) ||
      !validRevision(value.r) ||
      typeof value.a !== "string" ||
      normalizeManagedAvatarUrl(value.a) !== value.a ||
      typeof value.c !== "string" ||
      normalizeGroupOutlineColor(value.c) !== value.c
    ) {
      return null;
    }
    return {
      t: "ga",
      v: 2,
      g: value.g,
      o: value.o,
      e: value.e,
      r: value.r,
      a: value.a,
      c: value.c,
      u: value.u as number,
    };
  }
  if (value.t === "gn") {
    if (!hasExactKeys(value, ["t", "v", "g", "o", "e", "r", "d", "u"])) return null;
    const memberNames = strictCanonicalMemberNames(value.d);
    if (
      !validMemberNumber(value.o) ||
      value.o !== managedGroupOwner(value.g) ||
      !validEpochId(value.e) ||
      !validRevision(value.r) ||
      !memberNames
    ) {
      return null;
    }
    return {
      t: "gn",
      v: 2,
      g: value.g,
      o: value.o,
      e: value.e,
      r: value.r,
      d: memberNames,
      u: value.u as number,
    };
  }
  if (value.t === "gx") {
    if (!hasExactKeys(value, ["t", "v", "g", "o", "e", "r", "u"])) return null;
    if (
      !validMemberNumber(value.o) ||
      value.o !== managedGroupOwner(value.g) ||
      !validEpochId(value.e) ||
      !validRevision(value.r)
    ) {
      return null;
    }
    return {
      t: "gx",
      v: 2,
      g: value.g,
      o: value.o,
      e: value.e,
      r: value.r,
      u: value.u as number,
    };
  }
  if (value.t === "gm") {
    if (!hasExactKeys(value, ["t", "v", "g", "e", "i", "c", "u"])) return null;
    if (
      !validEpochId(value.e) ||
      !validMessageId(value.i) ||
      typeof value.c !== "string" ||
      value.c.length < 1 ||
      value.c.length > GROUP_MANAGED_MESSAGE_MAX_CONTENT ||
      DISALLOWED_CONTROL_PATTERN.test(value.c) ||
      hasUnpairedSurrogate(value.c)
    ) {
      return null;
    }
    const content = normalizeMessageContent(value.c);
    if (!content || content.length > GROUP_MANAGED_MESSAGE_MAX_CONTENT) return null;
    return {
      t: "gm",
      v: 2,
      g: value.g,
      e: value.e,
      i: value.i,
      c: content,
      u: value.u as number,
    };
  }
  if (value.t === "gr") {
    if (!hasExactKeys(value, ["t", "v", "g", "e", "o", "i", "c", "u"])) return null;
    if (
      !validEpochId(value.e) ||
      !validMemberNumber(value.o) ||
      !validMessageId(value.i) ||
      typeof value.c !== "string" ||
      value.c.length < 1 ||
      value.c.length > GROUP_MANAGED_MESSAGE_MAX_CONTENT ||
      DISALLOWED_CONTROL_PATTERN.test(value.c) ||
      hasUnpairedSurrogate(value.c)
    ) {
      return null;
    }
    const content = normalizeMessageContent(value.c);
    if (!content || content.length > GROUP_MANAGED_MESSAGE_MAX_CONTENT) return null;
    return {
      t: "gr",
      v: 2,
      g: value.g,
      e: value.e,
      o: value.o,
      i: value.i,
      c: content,
      u: value.u as number,
    };
  }
  return null;
}

function sanitizeStoredGroup(
  value: unknown,
  ownMemberNumber: number,
  legacyState = false,
): GroupConversation | undefined {
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
  const protocolVersion = legacyState
    ? 1
    : value.protocolVersion === 1 || value.protocolVersion === 2
      ? value.protocolVersion
      : undefined;
  if (protocolVersion === undefined) return undefined;
  const epochId = protocolVersion === 2 && validEpochId(value.epochId)
    ? value.epochId
    : undefined;
  const stateRevision = protocolVersion === 2 && validRevision(value.stateRevision)
    ? value.stateRevision
    : protocolVersion === 1 && (legacyState || value.stateRevision === 0)
      ? 0
      : undefined;
  const appearanceRevision = protocolVersion === 2 && validNonNegativeRevision(value.appearanceRevision)
    ? value.appearanceRevision
    : protocolVersion === 1 && (legacyState || value.appearanceRevision === 0)
      ? 0
      : undefined;
  const memberNamesRevision = protocolVersion === 2 &&
      validNonNegativeRevision(value.memberNamesRevision) &&
      value.memberNamesRevision <= (stateRevision ?? -1)
    ? value.memberNamesRevision
    : protocolVersion === 1 && (legacyState || value.memberNamesRevision === 0)
      ? 0
      : undefined;
  if (
    stateRevision === undefined ||
    appearanceRevision === undefined ||
    memberNamesRevision === undefined ||
    (protocolVersion === 2 &&
      (epochId === undefined ||
        !validManagedGroupId(value.groupId) ||
        managedGroupOwner(value.groupId) !== value.creatorNumber)) ||
    (protocolVersion === 1 && !validLegacyGroupId(value.groupId))
  ) {
    return undefined;
  }
  const avatarUrl = legacyState ? "" : normalizeManagedAvatarUrl(value.avatarUrl);
  const outlineColor = legacyState ? "" : normalizeGroupOutlineColor(value.outlineColor);
  if (
    !legacyState &&
    (typeof value.avatarUrl !== "string" || avatarUrl !== value.avatarUrl ||
      typeof value.outlineColor !== "string" || outlineColor !== value.outlineColor)
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
    draft: normalizeDraft(
      value.draft,
      protocolVersion === 2 ? GROUP_MANAGED_MESSAGE_MAX_CONTENT : GROUP_DRAFT_MAX_CHARS,
    ),
    protocolVersion,
    ...(epochId ? { epochId } : {}),
    stateRevision,
    appearanceRevision,
    memberNamesRevision,
    avatarUrl,
    outlineColor,
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
    typeof value.content !== "string" ||
    !validTimestamp(value.sentAt)
  ) {
    return undefined;
  }
  if (DISALLOWED_CONTROL_PATTERN.test(value.content) || hasUnpairedSurrogate(value.content)) {
    return undefined;
  }
  const content = normalizeMessageContent(value.content);
  const maxContent = group.protocolVersion === 2
    ? GROUP_MANAGED_MESSAGE_MAX_CONTENT
    : GROUP_LEGACY_DIRECT_MESSAGE_MAX_CONTENT;
  if (
    !content ||
    content.length > maxContent ||
    (group.protocolVersion === 1 && !group.memberNumbers.includes(value.senderNumber))
  ) {
    return undefined;
  }
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

function strictCanonicalMemberNames(value: unknown): Array<[number, string]> | undefined {
  if (!Array.isArray(value) || value.length < GROUP_MIN_MEMBERS || value.length > GROUP_MAX_MEMBERS) {
    return undefined;
  }
  const memberNames: Array<[number, string]> = [];
  for (const candidate of value) {
    if (!Array.isArray(candidate) || candidate.length !== 2) return undefined;
    const [memberNumber, name] = candidate;
    if (
      !validMemberNumber(memberNumber) ||
      typeof name !== "string" ||
      name.length < 1 ||
      name.length > GROUP_MEMBER_NAME_MAX_CHARS ||
      DISALLOWED_CONTROL_PATTERN.test(name) ||
      hasUnpairedSurrogate(name) ||
      normalizeWireMemberName(name, memberNumber) !== name
    ) {
      return undefined;
    }
    const previous = memberNames.at(-1)?.[0];
    if (previous !== undefined && previous >= memberNumber) return undefined;
    memberNames.push([memberNumber, name]);
  }
  return memberNames;
}

function sameMemberNames(
  left: Readonly<Record<string, string>>,
  right: Readonly<Record<string, string>>,
  memberNumbers: readonly number[],
): boolean {
  return memberNumbers.every((memberNumber) => left[memberNumber] === right[memberNumber]);
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

function normalizeDraft(value: unknown, maxLength = GROUP_DRAFT_MAX_CHARS): string {
  if (typeof value !== "string") return "";
  const normalized = value
    .replace(/\r\n?/gu, "\n")
    .replace(DISALLOWED_CONTROL_PATTERN_GLOBAL, " ");
  return sliceCompleteUtf16(normalized, maxLength);
}

function normalizeMemberName(value: unknown, memberNumber: number): string {
  if (typeof value !== "string") return `Member ${memberNumber}`;
  const name = value
    .replace(DISALLOWED_CONTROL_PATTERN_GLOBAL, " ")
    .replace(/\s+/gu, " ")
    .trim();
  const sliced = sliceCompleteUtf16(name, 80);
  return sliced || `Member ${memberNumber}`;
}

function normalizeWireMemberName(
  value: unknown,
  memberNumber: number,
  maxLength = GROUP_MEMBER_NAME_MAX_CHARS,
): string {
  const name = normalizeMemberName(value, memberNumber);
  return sliceCompleteUtf16(name, maxLength);
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
  return left.sentAt - right.sentAt ||
    left.id.localeCompare(right.id) ||
    left.senderNumber - right.senderNumber;
}

function compareMessageTombstones(
  left: StoredMessageTombstone,
  right: StoredMessageTombstone,
): number {
  return left.seenAt - right.seenAt ||
    left.groupId.localeCompare(right.groupId) ||
    left.messageId.localeCompare(right.messageId) ||
    (left.originNumber ?? -1) - (right.originNumber ?? -1);
}

function oldestMessageTombstone(ids: ReadonlyMap<string, number>): string | undefined {
  let oldestIdentity: string | undefined;
  let oldestSeenAt = Number.POSITIVE_INFINITY;
  for (const [identity, seenAt] of ids) {
    if (
      seenAt < oldestSeenAt ||
      (seenAt === oldestSeenAt && (oldestIdentity === undefined || identity < oldestIdentity))
    ) {
      oldestIdentity = identity;
      oldestSeenAt = seenAt;
    }
  }
  return oldestIdentity;
}

function messageIdentity(message: Pick<GroupMessage, "senderNumber" | "id">): string;
function messageIdentity(originNumber: number, messageId: string): string;
function messageIdentity(
  messageOrOrigin: Pick<GroupMessage, "senderNumber" | "id"> | number,
  messageId?: string,
): string {
  const originNumber = typeof messageOrOrigin === "number"
    ? messageOrOrigin
    : messageOrOrigin.senderNumber;
  const id = typeof messageOrOrigin === "number" ? messageId : messageOrOrigin.id;
  return `${originNumber}${MESSAGE_IDENTITY_SEPARATOR}${id ?? ""}`;
}

function wildcardMessageIdentity(messageId: string): string {
  return `*${MESSAGE_IDENTITY_SEPARATOR}${messageId}`;
}

function parseMessageIdentity(
  identity: string,
): Pick<StoredMessageTombstone, "originNumber" | "messageId"> | undefined {
  const separatorAt = identity.indexOf(MESSAGE_IDENTITY_SEPARATOR);
  if (separatorAt <= 0) return undefined;
  const origin = identity.slice(0, separatorAt);
  const messageId = identity.slice(separatorAt + MESSAGE_IDENTITY_SEPARATOR.length);
  if (!validMessageId(messageId)) return undefined;
  if (origin === "*") return { messageId };
  const originNumber = Number(origin);
  return validMemberNumber(originNumber) ? { originNumber, messageId } : undefined;
}

function storedMessageIdentity(
  groupId: string,
  originNumber: number,
  messageId: string,
): string {
  return `${groupId}${MESSAGE_IDENTITY_SEPARATOR}${messageIdentity(originNumber, messageId)}`;
}

function storedBareMessageIdentity(groupId: string, messageId: string): string {
  return `${groupId}${MESSAGE_IDENTITY_SEPARATOR}${messageId}`;
}

function consumeRateToken(
  bucket: InboundRateBucket,
  capacity: number,
  refillMs: number,
  now: number,
): boolean {
  refillRateBucket(bucket, capacity, refillMs, now);
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

function refillRateBucket(
  bucket: InboundRateBucket,
  capacity: number,
  refillMs: number,
  now: number,
): void {
  if (now >= bucket.refilledAt) {
    const elapsed = now - bucket.refilledAt;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed / refillMs);
    bucket.refilledAt = now;
  }
}

function cloneGroup(group: GroupConversation): GroupConversation {
  return {
    ...structuredClone(group),
    memberNumbers: [...group.memberNumbers],
    memberNames: { ...group.memberNames },
  };
}

function clampRemoteTimestamp(remote: number, receivedAt: number): number {
  if (remote > receivedAt) return receivedAt;
  return receivedAt - remote <= REMOTE_TIMESTAMP_SKEW_MS ? remote : receivedAt;
}

function safeNow(now: () => number): number {
  const value = now();
  return validTimestamp(value) ? Math.round(value) : Date.now();
}

function validGroupId(value: unknown): value is string {
  return validLegacyGroupId(value) || validManagedGroupId(value);
}

function validLegacyGroupId(value: unknown): value is string {
  return typeof value === "string" && value.length <= GROUP_ID_MAX_CHARS && GROUP_ID_PATTERN.test(value);
}

function validManagedGroupId(value: unknown): value is string {
  if (typeof value !== "string" || value.length > GROUP_ID_MAX_CHARS) return false;
  const match = MANAGED_GROUP_ID_PATTERN.exec(value);
  if (!match) return false;
  const owner = Number(match[1]);
  return validMemberNumber(owner) && String(owner) === match[1];
}

function managedGroupOwner(value: unknown): number | undefined {
  if (!validManagedGroupId(value)) return undefined;
  const match = MANAGED_GROUP_ID_PATTERN.exec(value);
  const owner = Number(match?.[1]);
  return validMemberNumber(owner) ? owner : undefined;
}

function validEpochId(value: unknown): value is string {
  return typeof value === "string" && GROUP_EPOCH_PATTERN.test(value);
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

function validRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validNonNegativeRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function nextRevision(value: number): number {
  if (!validNonNegativeRevision(value) || value >= Number.MAX_SAFE_INTEGER) {
    throw new Error("This group has reached its safe update limit");
  }
  return value + 1;
}

function normalizeManagedAvatarUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (!candidate) return "";
  if (candidate.length > GROUP_MANAGED_AVATAR_URL_MAX_CHARS) return "";
  const normalized = normalizeImageUrl(candidate);
  return normalized && normalized.length <= GROUP_MANAGED_AVATAR_URL_MAX_CHARS
    ? normalized
    : "";
}

function normalizeGroupOutlineColor(value: unknown): string {
  if (typeof value !== "string") return "";
  const candidate = value.trim().toLocaleLowerCase();
  if (!candidate) return "";
  return /^#[0-9a-f]{6}$/u.test(candidate) ? candidate : "";
}

function idToken(value: string, maxLength: number): string {
  const candidate = value
    .toLocaleLowerCase()
    .replace(/^group_/u, "")
    .replace(/[^a-z0-9_-]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  return candidate.slice(0, maxLength);
}

function pendingRevocationKey(groupId: string, targetNumber: number): string {
  return `${groupId}\u0000${targetNumber}`;
}

function relayFlowKey(item: RelayQueueItem): string {
  return `${item.groupId}\u0000${item.originNumber}`;
}

function revocationRetryDelay(attempts: number): number {
  const exponent = Math.max(0, Math.min(attempts - 1, 20));
  return Math.min(
    GROUP_REVOCATION_RETRY_INTERVAL_MS * (2 ** exponent),
    GROUP_REVOCATION_RETRY_MAX_INTERVAL_MS,
  );
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
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
