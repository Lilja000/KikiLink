import { cleanBeepMessageContent } from "../bc/message-content";
import {
  MemoryKeyValueStorage,
  SETTINGS_KEY,
  type KeyValueStorage,
  type KeyValueStorageReadResult,
} from "../core/settings";
import type { ConversationMeta, LinkMessage } from "../core/types";
import type { ChatRepository } from "./chat-repository";
import { PEOPLE_KEY } from "./people-repository";

const CLOUD_EXTENSION_KEY = "KikiLink";
const CLOUD_MIRROR_KEY = "kikilink:cloud-mirror:v1";
const CHAT_DIRTY_KEY = "kikilink:chat-dirty:v1";
const CHAT_CLEAR_MARKER_KEY = "kikilink:chat-cleared-at:v1";
const CLOUD_FORMAT_PREFIX = "KIKILINK/1:";
const JSON_FORMAT_PREFIX = "JSON:";
const CLOUD_SYNC_DELAY_MS = 5_000;
const MAX_CLOUD_PAYLOAD_CHARS = 120_000;
const MAX_CLOUD_CONVERSATIONS = 100;
const MAX_CLOUD_MESSAGES = 600;
const MAX_CLOUD_MESSAGES_PER_CONVERSATION = 100;
const MAX_CHAT_DELETION_TOMBSTONES = 500;
const MAX_PORTABLE_STATE_JSON_CHARS = 512_000;

interface PortableChatState {
  conversations: ConversationMeta[];
  messages: LinkMessage[];
}

interface PortableChatPolicy {
  /** Deletes every message at or before this time, including on another device. */
  clearedAt: number;
  /** Deletes messages strictly before this account-wide retention boundary. */
  prunedBefore: number;
  /** Per-conversation deletions remain monotonic so stale devices cannot restore old rows. */
  deletedPeers: Array<[peerNumber: number, deletedAt: number]>;
  /** Per-conversation trims remove rows strictly before the retained boundary. */
  prunedPeers: Array<[peerNumber: number, prunedBefore: number]>;
}

interface PortableAccountState {
  version: 1;
  owner: number;
  updatedAt: number;
  settings?: unknown;
  people?: unknown[];
  chats?: PortableChatState;
  chatPolicy?: PortableChatPolicy;
}

/**
 * Prefixes every browser key with the authenticated BC MemberNumber. Old unscoped keys are
 * deliberately never read: they do not contain enough information to assign them safely.
 */
export class AccountKeyValueStorage implements KeyValueStorage {
  readonly #prefix: string;

  constructor(
    memberNumber: number,
    private readonly backing: KeyValueStorage = defaultBackingStorage(),
  ) {
    if (!validMemberNumber(memberNumber)) throw new Error("A valid BC account is required");
    this.#prefix = `kikilink:account:${memberNumber}:`;
  }

  getItem(key: string): string | null {
    return this.backing.getItem(this.#key(key));
  }

  getItemResult(key: string): KeyValueStorageReadResult {
    const scopedKey = this.#key(key);
    try {
      return this.backing.getItemResult?.(scopedKey) ?? {
        ok: true,
        value: this.backing.getItem(scopedKey),
      };
    } catch {
      return { ok: false };
    }
  }

  setItem(key: string, value: string): void {
    this.backing.setItem(this.#key(key), value);
  }

  removeItem(key: string): void {
    this.backing.removeItem(this.#key(key));
  }

  #key(key: string): string {
    return `${this.#prefix}${key}`;
  }
}

/**
 * Account-scoped local storage with a bounded mirror in BC ExtensionSettings. Settings,
 * Custom Activities, profiles/notebook data, and recent chat state therefore follow the same
 * MemberNumber to another browser without ever being shared with a different account.
 */
export class AccountDataStorage implements KeyValueStorage {
  readonly #local: AccountKeyValueStorage;
  #state: PortableAccountState;
  #repository: ChatRepository | undefined;
  #syncTimer: ReturnType<typeof setTimeout> | undefined;
  #flushChain = Promise.resolve();
  #generation = 0;
  #chatSnapshotGeneration = 0;
  #chatDirty = false;
  #destroyed = false;
  #destroyPromise: Promise<void> | undefined;
  #unsafeChatSnapshotWarningShown = false;

  constructor(
    readonly memberNumber: number,
    backing?: KeyValueStorage,
  ) {
    this.#local = new AccountKeyValueStorage(memberNumber, backing);
    const remote = this.#readRemoteState();
    const mirror = parsePortableState(this.getItem(CLOUD_MIRROR_KEY), memberNumber);
    const selected = newestState(remote, mirror);
    this.#state =
      selected ?? {
        version: 1,
        owner: memberNumber,
        updatedAt: 0,
      };
    const mergedPolicy = mergeChatPolicies(remote?.chatPolicy, mirror?.chatPolicy);
    if (hasChatPolicy(mergedPolicy)) this.#state.chatPolicy = mergedPolicy;
    const chatClearMarker = parseChatClearMarker(this.#readLocalItem(CHAT_CLEAR_MARKER_KEY));
    const chatClearMarkerApplied = chatClearMarker !== undefined &&
      chatClearMarker > (this.#state.chatPolicy?.clearedAt ?? 0);
    if (chatClearMarkerApplied) {
      this.#state.updatedAt = Math.max(this.#state.updatedAt, chatClearMarker);
      this.#state.chats = { conversations: [], messages: [] };
      this.#state.chatPolicy = {
        clearedAt: chatClearMarker,
        prunedBefore: Math.max(
          chatClearMarker + 1,
          this.#state.chatPolicy?.prunedBefore ?? 0,
        ),
        deletedPeers: [],
        prunedPeers: [],
      };
    }

    if (selected) {
      this.#restorePortableKey(SETTINGS_KEY, this.#state.settings);
      this.#restorePortableKey(PEOPLE_KEY, this.#state.people);
      this.#persistMirror();
      if (selected === mirror && (!remote || mirror.updatedAt > remote.updatedAt)) {
        this.#markDirty();
      }
    } else {
      this.#adoptLocalKey(SETTINGS_KEY, "settings");
      this.#adoptLocalKey(PEOPLE_KEY, "people");
      if (this.#state.settings !== undefined || this.#state.people !== undefined) {
        this.#touch();
        this.#markDirty();
      }
    }
    if (chatClearMarkerApplied && (!remote || chatClearMarker > remote.updatedAt)) {
      this.#markDirty();
    }

    // Unlike the debounce timer, this account-scoped marker survives a page reload. The local
    // chat repository is attached immediately afterwards and can then recapture the rows that
    // were already committed before the previous page disappeared.
    this.#chatDirty = this.getItem(CHAT_DIRTY_KEY) === "1";
  }

  getItem(key: string): string | null {
    const portable = this.#portableValue(key);
    if (portable.matched) return portable.value;
    return this.#readLocalItem(key);
  }

  #readLocalItem(key: string): string | null {
    try {
      return this.#local.getItem(key);
    } catch {
      return null;
    }
  }

  getItemResult(key: string): KeyValueStorageReadResult {
    const portable = this.#portableValue(key);
    if (portable.matched) return { ok: true, value: portable.value };
    return this.#local.getItemResult(key);
  }

  setItem(key: string, value: string): void {
    try {
      this.#local.setItem(key, value);
    } catch {
      // Continue with the authenticated BC account mirror when browser storage is unavailable.
    }
    if (key === SETTINGS_KEY) this.#setPortableValue("settings", value);
    if (key === PEOPLE_KEY) this.#setPortableValue("people", value);
  }

  removeItem(key: string): void {
    try {
      this.#local.removeItem(key);
    } catch {
      // The portable account state can still be reset.
    }
    if (key === SETTINGS_KEY) this.#removePortableValue("settings");
    if (key === PEOPLE_KEY) this.#removePortableValue("people");
  }

  /** Applies portable deletions before importing a bounded account snapshot. */
  async attachChatRepository(repository: ChatRepository): Promise<void> {
    this.#repository = repository;
    const policy = this.#state.chatPolicy;
    if (policy) await applyChatPolicyToRepository(repository, policy);
    const chats = applyChatPolicyToPortableChats(this.#state.chats, policy);
    if (chats) this.#state.chats = chats;
    else delete this.#state.chats;
    if (chats) {
      for (const message of chats.messages) await repository.addMessage(message);
      for (const remoteConversation of chats.conversations) {
        const localConversation = await repository.getConversation(remoteConversation.peerNumber);
        if (!localConversation || remoteConversation.lastMessageAt >= localConversation.lastMessageAt) {
          await repository.putConversation(remoteConversation);
        }
      }
    }

    if (policy) await repairConversationPreviews(repository, policy);

    if (this.#chatDirty) this.#markDirty();
  }

  markChatChanged(): void {
    if (this.#destroyed) return;
    this.#chatSnapshotGeneration += 1;
    this.#chatDirty = true;
    try {
      this.#local.setItem(CHAT_DIRTY_KEY, "1");
    } catch {
      // The in-memory dirty flag still covers the current page when local storage is unavailable.
    }
    this.#markDirty();
  }

  /** Records a per-peer deletion synchronously in the verified local mirror. */
  commitConversationDelete(peerNumber: number, deletedAt = Date.now()): boolean {
    if (this.#destroyed || !validMemberNumber(peerNumber) || !validTime(deletedAt)) return false;
    const knownPortableTimestamp = Math.max(
      ...((this.#state.chats?.messages ?? [])
        .filter((message) => message.peerNumber === peerNumber)
        .map((message) => message.sentAt)),
      ...((this.#state.chats?.conversations ?? [])
        .filter((conversation) => conversation.peerNumber === peerNumber)
        .map((conversation) => conversation.lastMessageAt)),
      0,
    );
    deletedAt = Math.max(deletedAt, knownPortableTimestamp);
    const policy = this.#chatPolicy();
    const deletedPeers = new Map(policy.deletedPeers);
    deletedPeers.set(peerNumber, Math.max(deletedPeers.get(peerNumber) ?? 0, deletedAt));
    policy.deletedPeers = trimDeletedPeerTombstones(deletedPeers);
    this.#state.chatPolicy = policy;
    const chats = applyChatPolicyToPortableChats(this.#state.chats, policy);
    if (chats) this.#state.chats = chats;
    else delete this.#state.chats;
    return this.#commitChatPolicyMutation();
  }

  /** Records a monotonic retention boundary even if this device had no matching rows. */
  commitChatPrune(prunedBefore: number): boolean {
    if (this.#destroyed || !validTime(prunedBefore)) return false;
    const policy = this.#chatPolicy();
    if (prunedBefore <= policy.prunedBefore) return true;
    policy.prunedBefore = prunedBefore;
    this.#state.chatPolicy = policy;
    const chats = applyChatPolicyToPortableChats(this.#state.chats, policy);
    if (chats) this.#state.chats = chats;
    else delete this.#state.chats;
    return this.#commitChatPolicyMutation();
  }

  commitConversationPrune(peerNumber: number, prunedBefore: number): boolean {
    if (this.#destroyed || !validMemberNumber(peerNumber) || !validTime(prunedBefore)) {
      return false;
    }
    const policy = this.#chatPolicy();
    const prunedPeers = new Map(policy.prunedPeers);
    if (prunedBefore <= (prunedPeers.get(peerNumber) ?? 0)) return true;
    prunedPeers.set(peerNumber, prunedBefore);
    policy.prunedPeers = trimPeerTimestamps(prunedPeers);
    this.#state.chatPolicy = policy;
    const chats = applyChatPolicyToPortableChats(this.#state.chats, policy);
    if (chats) this.#state.chats = chats;
    else delete this.#state.chats;
    return this.#commitChatPolicyMutation();
  }

  /** Commits an explicit all-chat tombstone before a stale account mirror can be re-imported. */
  async commitChatHistoryClear(observedAt = Date.now()): Promise<boolean> {
    if (this.#destroyed) return false;
    this.#chatSnapshotGeneration += 1;
    const clearedAt = Math.max(
      Date.now(),
      observedAt,
      ...(this.#state.chats?.messages.map((message) => message.sentAt) ?? []),
      ...(this.#state.chats?.conversations.map((conversation) => conversation.lastMessageAt) ?? []),
    );
    this.#chatDirty = false;
    this.#state.chats = { conversations: [], messages: [] };
    this.#state.updatedAt = Math.max(this.#state.updatedAt, clearedAt);
    this.#touch();
    this.#state.chatPolicy = {
      clearedAt,
      prunedBefore: Math.max(
        nextTimestamp(clearedAt),
        this.#state.chatPolicy?.prunedBefore ?? 0,
      ),
      deletedPeers: [],
      prunedPeers: [],
    };
    const markerPersisted = this.#writeVerifiedLocal(
      CHAT_CLEAR_MARKER_KEY,
      String(clearedAt),
    );
    const mirrorPersisted = this.#persistMirror();
    if (markerPersisted || mirrorPersisted) {
      try {
        this.#local.removeItem(CHAT_DIRTY_KEY);
      } catch {
        // A stale dirty marker only causes a safe recapture from the already-cleared repository.
      }
    }
    this.#markDirty();
    try {
      await this.flush();
    } catch {
      // The verified local marker/mirror determines this method's durability result. Account sync
      // remains queued and can recover independently without turning the UI callback into a throw.
    }
    return markerPersisted || mirrorPersisted;
  }

  #chatPolicy(): PortableChatPolicy {
    return this.#state.chatPolicy
      ? structuredClone(this.#state.chatPolicy)
      : { clearedAt: 0, prunedBefore: 0, deletedPeers: [], prunedPeers: [] };
  }

  #commitChatPolicyMutation(): boolean {
    this.#chatSnapshotGeneration += 1;
    this.#chatDirty = true;
    this.#touch();
    try {
      this.#local.setItem(CHAT_DIRTY_KEY, "1");
    } catch {
      // The verified mirror or pending account sync can still retain the deletion policy.
    }
    const mirrorPersisted = this.#persistMirror();
    this.#markDirty();
    return mirrorPersisted;
  }

  flush(): Promise<void> {
    const pending = this.#flushChain.then(() => this.#flushOnce());
    // Keep the public promise rejectable so explicit callers can react, while healing the
    // private queue so one transient repository failure cannot poison every later flush.
    this.#flushChain = pending.catch((error: unknown) => {
      console.warn("[KikiLink:storage] Account sync failed; local account data is safe", error);
    });
    return pending;
  }

  destroy(): Promise<void> {
    if (this.#destroyPromise) return this.#destroyPromise;
    this.#destroyed = true;
    if (this.#syncTimer !== undefined) clearTimeout(this.#syncTimer);
    this.#syncTimer = undefined;
    this.#destroyPromise = (async () => {
      try {
        await this.flush();
      } catch {
        // flush() already records the failure on its healed private queue. Teardown must still
        // release the repository so a hot reload cannot retain a stale account instance.
      } finally {
        if (this.#syncTimer !== undefined) clearTimeout(this.#syncTimer);
        this.#syncTimer = undefined;
        this.#repository = undefined;
      }
    })();
    return this.#destroyPromise;
  }

  #setPortableValue(key: "settings" | "people", raw: string): void {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (key === "people" && !Array.isArray(parsed)) return;
      this.#state[key] = parsed as never;
      this.#touch();
      this.#persistMirror();
      this.#markDirty();
    } catch {
      // SettingsStore and PeopleRepository keep malformed values out; ignore external writes too.
    }
  }

  #removePortableValue(key: "settings" | "people"): void {
    delete this.#state[key];
    this.#touch();
    this.#persistMirror();
    this.#markDirty();
  }

  #restorePortableKey(key: string, value: unknown): void {
    if (value === undefined) {
      try {
        this.#local.removeItem(key);
      } catch {
        // Keep the portable state even if this browser denies persistent storage.
      }
      return;
    }
    try {
      this.#local.setItem(key, JSON.stringify(value));
    } catch {
      // The in-memory portable state remains usable even when browser storage is unavailable.
    }
  }

  #adoptLocalKey(key: string, field: "settings" | "people"): void {
    const raw = this.#readLocalItem(key);
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (field === "people" && !Array.isArray(parsed)) return;
      this.#state[field] = parsed as never;
    } catch {
      // Ignore malformed account-local data and let the normal repositories fall back safely.
    }
  }

  #touch(): void {
    this.#state.updatedAt = Math.max(Date.now(), this.#state.updatedAt + 1);
  }

  #markDirty(): void {
    this.#generation += 1;
    if (this.#destroyed) return;
    if (this.#syncTimer !== undefined) clearTimeout(this.#syncTimer);
    this.#syncTimer = setTimeout(() => {
      this.#syncTimer = undefined;
      void this.flush();
    }, CLOUD_SYNC_DELAY_MS);
  }

  async #flushOnce(): Promise<void> {
    if (this.#syncTimer !== undefined) clearTimeout(this.#syncTimer);
    this.#syncTimer = undefined;
    if (this.#generation === 0) return;
    const generation = this.#generation;

    const latestRemotePolicy = this.#readRemoteState()?.chatPolicy;
    if (latestRemotePolicy) {
      const merged = mergeChatPolicies(this.#state.chatPolicy, latestRemotePolicy);
      if (!chatPoliciesEqual(merged, this.#state.chatPolicy)) {
        this.#state.chatPolicy = merged;
        const chats = applyChatPolicyToPortableChats(this.#state.chats, merged);
        if (chats) this.#state.chats = chats;
        else delete this.#state.chats;
        if (this.#repository) await applyChatPolicyToRepository(this.#repository, merged);
        this.#chatDirty = true;
      }
    }

    if (this.#chatDirty && this.#repository) {
      if (!canSafelyCapturePortableSnapshot(this.#repository)) {
        this.#warnUnsafeChatSnapshot();
      } else {
        let captured = false;
        const chatSnapshotGeneration = this.#chatSnapshotGeneration;
        this.#chatDirty = false;
        try {
          const chats = await capturePortableChats(
            this.#repository,
            this.#state.chatPolicy,
          );
          if (chatSnapshotGeneration === this.#chatSnapshotGeneration) {
            this.#state.chats = chats;
            captured = true;
          } else {
            // A mutation or explicit clear finished while this snapshot was reading. Never let
            // the older rows overwrite it; the already-queued flush will capture current state.
            this.#chatDirty = true;
          }
        } catch (error) {
          // The attempted snapshot did not cover the dirty state. Retain it for the next flush.
          this.#chatDirty = true;
          if (!canSafelyCapturePortableSnapshot(this.#repository)) {
            this.#warnUnsafeChatSnapshot();
          } else {
            throw error;
          }
        }
        if (captured) {
          this.#touch();
          const mirrorPersisted = this.#persistMirror();
          if (!this.#chatDirty && mirrorPersisted) {
            try {
              this.#local.removeItem(CHAT_DIRTY_KEY);
            } catch {
              // A stale marker only causes a safe extra recapture on the next page load.
            }
          }
        }
      }
    }

    if (!this.#isCurrentAccount()) return;
    const encoded = encodePortableState(fitPortableState(this.#state));
    if (!encoded || encoded.length > MAX_CLOUD_PAYLOAD_CHARS) {
      console.warn("[KikiLink:storage] Account sync payload is too large; keeping the full local copy");
      return;
    }

    try {
      Player.ExtensionSettings ??= {};
      Player.ExtensionSettings[CLOUD_EXTENSION_KEY] = encoded;
      if (typeof ServerPlayerExtensionSettingsSync !== "function") return;
      ServerPlayerExtensionSettingsSync(CLOUD_EXTENSION_KEY);
      if (generation === this.#generation) this.#generation = 0;
    } catch (error) {
      console.warn("[KikiLink:storage] BC account sync unavailable; local account data is safe", error);
    }
  }

  #persistMirror(): boolean {
    try {
      return this.#writeVerifiedLocal(CLOUD_MIRROR_KEY, JSON.stringify(this.#state));
    } catch {
      // Account-local stores still retain their full data independently.
      return false;
    }
  }

  #writeVerifiedLocal(key: string, value: string): boolean {
    try {
      this.#local.setItem(key, value);
      const retained = this.#local.getItemResult(key);
      return retained.ok && retained.value === value;
    } catch {
      return false;
    }
  }

  #portableValue(key: string): { matched: boolean; value: string | null } {
    const value = key === SETTINGS_KEY
      ? this.#state?.settings
      : key === PEOPLE_KEY
        ? this.#state?.people
        : undefined;
    if (key !== SETTINGS_KEY && key !== PEOPLE_KEY) return { matched: false, value: null };
    if (value === undefined) return { matched: true, value: null };
    try {
      return { matched: true, value: JSON.stringify(value) };
    } catch {
      return { matched: true, value: null };
    }
  }

  #readRemoteState(): PortableAccountState | undefined {
    if (!this.#isCurrentAccount() || !Player.ExtensionSettings) return undefined;
    return parsePortableState(Player.ExtensionSettings[CLOUD_EXTENSION_KEY], this.memberNumber);
  }

  #isCurrentAccount(): boolean {
    return (
      typeof Player === "object" &&
      Player !== null &&
      Player.MemberNumber === this.memberNumber
    );
  }

  #warnUnsafeChatSnapshot(): void {
    if (this.#unsafeChatSnapshotWarningShown) return;
    this.#unsafeChatSnapshotWarningShown = true;
    console.warn(
      "[KikiLink:storage] Session fallback is active; preserving the last portable chat snapshot",
    );
  }
}

/** Adds account sync notifications around the full local repository. */
export class AccountSyncedChatRepository implements ChatRepository {
  constructor(
    private readonly repository: ChatRepository,
    private readonly account: AccountDataStorage,
  ) {}

  async addMessage(message: LinkMessage): Promise<void> {
    await this.repository.addMessage(message);
    this.account.markChatChanged();
  }

  getMessages(peerNumber: number, limit?: number): Promise<LinkMessage[]> {
    return this.repository.getMessages(peerNumber, limit);
  }

  getConversation(peerNumber: number): Promise<ConversationMeta | undefined> {
    return this.repository.getConversation(peerNumber);
  }

  listConversations(): Promise<ConversationMeta[]> {
    return this.repository.listConversations();
  }

  async putConversation(conversation: ConversationMeta): Promise<void> {
    await this.repository.putConversation(conversation);
    this.account.markChatChanged();
  }

  async deleteConversation(peerNumber: number): Promise<void> {
    let messages: LinkMessage[] = [];
    let conversation: ConversationMeta | undefined;
    try {
      [messages, conversation] = await Promise.all([
        this.repository.getMessages(peerNumber, Number.MAX_SAFE_INTEGER),
        this.repository.getConversation(peerNumber),
      ]);
    } catch {
      // The account mirror supplies another observed timestamp; still attempt the deletion.
    }
    const deletedAt = Math.max(
      Date.now(),
      conversation?.lastMessageAt ?? 0,
      ...messages.map((message) => message.sentAt),
    );
    await this.repository.deleteConversation(peerNumber);
    this.account.commitConversationDelete(peerNumber, deletedAt);
  }

  async deleteMessagesOlderThan(timestamp: number): Promise<number> {
    const removed = await this.repository.deleteMessagesOlderThan(timestamp);
    this.account.commitChatPrune(timestamp);
    return removed;
  }

  async deleteMessagesForConversationAtOrBefore(
    peerNumber: number,
    timestamp: number,
  ): Promise<number> {
    const removed = await this.repository.deleteMessagesForConversationAtOrBefore(
      peerNumber,
      timestamp,
    );
    this.account.commitConversationDelete(peerNumber, timestamp);
    return removed;
  }

  async trimConversation(peerNumber: number, keepNewest: number): Promise<number> {
    const removed = await this.repository.trimConversation(peerNumber, keepNewest);
    if (removed > 0) {
      const retained = await this.repository.getMessages(peerNumber, keepNewest);
      const prunedBefore = retained[0]?.sentAt;
      if (prunedBefore !== undefined) {
        this.account.commitConversationPrune(peerNumber, prunedBefore);
      } else {
        this.account.commitConversationDelete(peerNumber);
      }
    }
    return removed;
  }

  async clearAll(): Promise<void> {
    await this.clearAllDurably();
  }

  async clearAllDurably(): Promise<boolean> {
    let conversations: ConversationMeta[] = [];
    try {
      conversations = await this.repository.listConversations();
    } catch {
      // Clearing remains more important than deriving a future-skew-aware timestamp.
    }
    const observedAt = Math.max(
      Date.now(),
      ...conversations.map((conversation) => conversation.lastMessageAt),
    );
    const repositoryDurable = this.repository.clearAllDurably
      ? await this.repository.clearAllDurably()
      : await this.repository.clearAll().then(() => true);
    const accountDurable = await this.account.commitChatHistoryClear(observedAt);
    return repositoryDurable && accountDurable;
  }

  canSafelyCapturePortableSnapshot(): boolean {
    return this.repository.canSafelyCapturePortableSnapshot?.() !== false;
  }

  close(): void {
    this.repository.close();
  }
}

export function accountChatDatabaseName(memberNumber: number): string {
  if (!validMemberNumber(memberNumber)) throw new Error("A valid BC account is required");
  return `kikilink-account-${memberNumber}`;
}

async function capturePortableChats(
  repository: ChatRepository,
  policy?: PortableChatPolicy,
): Promise<PortableChatState> {
  if (!canSafelyCapturePortableSnapshot(repository)) {
    throw new Error("KikiLink portable chat snapshot source is incomplete");
  }
  const conversations = (await repository.listConversations())
    .slice(0, MAX_CLOUD_CONVERSATIONS)
    .map((conversation) => ({
      ...conversation,
      lastMessage: cleanBeepMessageContent(conversation.lastMessage),
    }));
  const messages: LinkMessage[] = [];
  for (const conversation of conversations) {
    messages.push(
      ...(await repository.getMessages(
        conversation.peerNumber,
        MAX_CLOUD_MESSAGES_PER_CONVERSATION,
      )).map((message) => ({
        ...message,
        content: cleanBeepMessageContent(message.content),
      })),
    );
  }
  messages.sort((left, right) => right.sentAt - left.sentAt);
  if (!canSafelyCapturePortableSnapshot(repository)) {
    throw new Error("KikiLink portable chat snapshot source changed during capture");
  }
  return applyChatPolicyToPortableChats({
    conversations: conversations.map((conversation) => structuredClone(conversation)),
    messages: messages
      .slice(0, MAX_CLOUD_MESSAGES)
      .sort((left, right) => left.sentAt - right.sentAt)
      .map((message) => structuredClone(message)),
  }, policy) ?? { conversations: [], messages: [] };
}

function canSafelyCapturePortableSnapshot(repository: ChatRepository): boolean {
  return repository.canSafelyCapturePortableSnapshot?.() !== false;
}

function newestState(
  remote: PortableAccountState | undefined,
  mirror: PortableAccountState | undefined,
): PortableAccountState | undefined {
  if (!remote) return mirror;
  if (!mirror) return remote;
  return mirror.updatedAt > remote.updatedAt ? mirror : remote;
}

function parsePortableState(value: unknown, owner: number): PortableAccountState | undefined {
  let parsed: unknown = value;
  if (typeof value === "string") {
    if (value.length > MAX_PORTABLE_STATE_JSON_CHARS) return undefined;
    try {
      if (value.startsWith(CLOUD_FORMAT_PREFIX)) {
        if (typeof LZString !== "object" || typeof LZString.decompressFromBase64 !== "function") {
          return undefined;
        }
        const json = LZString.decompressFromBase64(value.slice(CLOUD_FORMAT_PREFIX.length));
        if (!json || json.length > MAX_PORTABLE_STATE_JSON_CHARS) return undefined;
        parsed = JSON.parse(json) as unknown;
      } else if (value.startsWith(JSON_FORMAT_PREFIX)) {
        const json = value.slice(JSON_FORMAT_PREFIX.length);
        if (json.length > MAX_PORTABLE_STATE_JSON_CHARS) return undefined;
        parsed = JSON.parse(json) as unknown;
      } else {
        parsed = JSON.parse(value) as unknown;
      }
    } catch {
      return undefined;
    }
  }
  if (!isRecord(parsed) || parsed.version !== 1 || parsed.owner !== owner) return undefined;
  const updatedAt = validTime(parsed.updatedAt) ? parsed.updatedAt : 0;
  const state: PortableAccountState = { version: 1, owner, updatedAt };
  if (isRecord(parsed.settings)) state.settings = structuredClone(parsed.settings);
  if (Array.isArray(parsed.people)) state.people = structuredClone(parsed.people);
  const chats = sanitizePortableChats(parsed.chats);
  if (chats) state.chats = chats;
  const chatPolicy = sanitizePortableChatPolicy(parsed.chatPolicy);
  if (hasChatPolicy(chatPolicy)) state.chatPolicy = chatPolicy;
  return state;
}

function sanitizePortableChats(value: unknown): PortableChatState | undefined {
  if (!isRecord(value) || !Array.isArray(value.conversations) || !Array.isArray(value.messages)) {
    return undefined;
  }
  const conversations = value.conversations
    .slice(0, MAX_CLOUD_CONVERSATIONS)
    .map(sanitizeConversation)
    .filter((item): item is ConversationMeta => item !== undefined);
  const allowedPeers = new Set(conversations.map((conversation) => conversation.peerNumber));
  const messages = value.messages
    .slice(-MAX_CLOUD_MESSAGES)
    .map(sanitizeMessage)
    .filter(
      (item): item is LinkMessage => item !== undefined && allowedPeers.has(item.peerNumber),
    );
  return { conversations, messages };
}

function sanitizePortableChatPolicy(value: unknown): PortableChatPolicy {
  if (!isRecord(value)) {
    return { clearedAt: 0, prunedBefore: 0, deletedPeers: [], prunedPeers: [] };
  }
  const clearedAt = validTime(value.clearedAt) ? value.clearedAt : 0;
  const prunedBefore = validTime(value.prunedBefore) ? value.prunedBefore : 0;
  const deleted = new Map<number, number>();
  const pruned = new Map<number, number>();
  if (Array.isArray(value.deletedPeers)) {
    for (const candidate of value.deletedPeers.slice(-MAX_CHAT_DELETION_TOMBSTONES * 4)) {
      if (
        !Array.isArray(candidate) ||
        candidate.length !== 2 ||
        !validMemberNumber(candidate[0]) ||
        !validTime(candidate[1]) ||
        candidate[1] <= clearedAt
      ) {
        continue;
      }
      deleted.set(candidate[0], Math.max(deleted.get(candidate[0]) ?? 0, candidate[1]));
    }
  }
  if (Array.isArray(value.prunedPeers)) {
    for (const candidate of value.prunedPeers.slice(-MAX_CHAT_DELETION_TOMBSTONES * 4)) {
      if (
        !Array.isArray(candidate) ||
        candidate.length !== 2 ||
        !validMemberNumber(candidate[0]) ||
        !validTime(candidate[1])
      ) {
        continue;
      }
      pruned.set(candidate[0], Math.max(pruned.get(candidate[0]) ?? 0, candidate[1]));
    }
  }
  return {
    clearedAt,
    prunedBefore: Math.max(prunedBefore, clearedAt > 0 ? nextTimestamp(clearedAt) : 0),
    deletedPeers: trimDeletedPeerTombstones(deleted),
    prunedPeers: trimPeerTimestamps(pruned),
  };
}

function mergeChatPolicies(
  left: PortableChatPolicy | undefined,
  right: PortableChatPolicy | undefined,
): PortableChatPolicy {
  const clearedAt = Math.max(left?.clearedAt ?? 0, right?.clearedAt ?? 0);
  const deleted = new Map<number, number>();
  const pruned = new Map<number, number>();
  for (const policy of [left, right]) {
    for (const [peerNumber, deletedAt] of policy?.deletedPeers ?? []) {
      if (deletedAt <= clearedAt) continue;
      deleted.set(peerNumber, Math.max(deleted.get(peerNumber) ?? 0, deletedAt));
    }
    for (const [peerNumber, prunedBefore] of policy?.prunedPeers ?? []) {
      pruned.set(peerNumber, Math.max(pruned.get(peerNumber) ?? 0, prunedBefore));
    }
  }
  return {
    clearedAt,
    prunedBefore: Math.max(
      left?.prunedBefore ?? 0,
      right?.prunedBefore ?? 0,
      clearedAt > 0 ? nextTimestamp(clearedAt) : 0,
    ),
    deletedPeers: trimDeletedPeerTombstones(deleted),
    prunedPeers: trimPeerTimestamps(pruned),
  };
}

function hasChatPolicy(policy: PortableChatPolicy): boolean {
  return policy.clearedAt > 0 ||
    policy.prunedBefore > 0 ||
    policy.deletedPeers.length > 0 ||
    policy.prunedPeers.length > 0;
}

function chatPoliciesEqual(
  left: PortableChatPolicy,
  right: PortableChatPolicy | undefined,
): boolean {
  if (!right || left.clearedAt !== right.clearedAt || left.prunedBefore !== right.prunedBefore) {
    return false;
  }
  if (
    left.deletedPeers.length !== right.deletedPeers.length ||
    left.prunedPeers.length !== right.prunedPeers.length
  ) {
    return false;
  }
  return left.deletedPeers.every(([peerNumber, deletedAt], index) => {
    const candidate = right.deletedPeers[index];
    return candidate?.[0] === peerNumber && candidate[1] === deletedAt;
  }) && left.prunedPeers.every(([peerNumber, prunedBefore], index) => {
    const candidate = right.prunedPeers[index];
    return candidate?.[0] === peerNumber && candidate[1] === prunedBefore;
  });
}

function trimDeletedPeerTombstones(deleted: Map<number, number>): Array<[number, number]> {
  return trimPeerTimestamps(deleted);
}

function trimPeerTimestamps(values: Map<number, number>): Array<[number, number]> {
  return [...values]
    .sort((left, right) => right[1] - left[1] || left[0] - right[0])
    .slice(0, MAX_CHAT_DELETION_TOMBSTONES)
    .sort((left, right) => left[0] - right[0]);
}

function applyChatPolicyToPortableChats(
  chats: PortableChatState | undefined,
  policy: PortableChatPolicy | undefined,
): PortableChatState | undefined {
  if (!chats) return undefined;
  if (!policy || !hasChatPolicy(policy)) return structuredClone(chats);
  const deletedPeers = new Map(policy.deletedPeers);
  const prunedPeers = new Map(policy.prunedPeers);
  const messages = chats.messages.filter((message) => messageSurvivesPolicy(
    message,
    policy,
    deletedPeers,
    prunedPeers,
  ));
  const messagesByPeer = new Map<number, LinkMessage[]>();
  for (const message of messages) {
    const peerMessages = messagesByPeer.get(message.peerNumber) ?? [];
    peerMessages.push(message);
    messagesByPeer.set(message.peerNumber, peerMessages);
  }

  const conversations: ConversationMeta[] = [];
  for (const candidate of chats.conversations) {
    const peerDeletedAt = deletedPeers.get(candidate.peerNumber) ?? 0;
    const peerPrunedBefore = prunedPeers.get(candidate.peerNumber) ?? 0;
    const destructiveBoundary = Math.max(policy.clearedAt, peerDeletedAt);
    const peerMessages = messagesByPeer.get(candidate.peerNumber) ?? [];
    const newest = peerMessages.at(-1);
    if (!newest && destructiveBoundary > 0 && candidate.lastMessageAt <= destructiveBoundary) {
      continue;
    }
    if (newest && candidate.lastMessageAt <= destructiveBoundary) {
      conversations.push(conversationWithPreview(candidate, peerMessages));
      continue;
    }
    if (!newest && candidate.lastMessageAt < Math.max(policy.prunedBefore, peerPrunedBefore)) {
      conversations.push(clearConversationPreview(candidate));
      continue;
    }
    if (newest && candidate.lastMessageAt < Math.max(policy.prunedBefore, peerPrunedBefore)) {
      conversations.push(conversationWithPreview(candidate, peerMessages));
      continue;
    }
    conversations.push(structuredClone(candidate));
  }
  return {
    conversations,
    messages: messages.map((message) => structuredClone(message)),
  };
}

function messageSurvivesPolicy(
  message: LinkMessage,
  policy: PortableChatPolicy,
  deletedPeers = new Map(policy.deletedPeers),
  prunedPeers = new Map(policy.prunedPeers),
): boolean {
  if (
    message.sentAt <= policy.clearedAt ||
    message.sentAt < policy.prunedBefore ||
    message.sentAt < (prunedPeers.get(message.peerNumber) ?? 0)
  ) {
    return false;
  }
  return message.sentAt > (deletedPeers.get(message.peerNumber) ?? 0);
}

async function applyChatPolicyToRepository(
  repository: ChatRepository,
  policy: PortableChatPolicy,
): Promise<void> {
  if (policy.prunedBefore > 0) await repository.deleteMessagesOlderThan(policy.prunedBefore);
  for (const [peerNumber, prunedBefore] of policy.prunedPeers) {
    if (prunedBefore > 0) {
      await repository.deleteMessagesForConversationAtOrBefore(
        peerNumber,
        previousTimestamp(prunedBefore),
      );
    }
  }
  for (const [peerNumber, deletedAt] of policy.deletedPeers) {
    await repository.deleteMessagesForConversationAtOrBefore(peerNumber, deletedAt);
  }
  await repairConversationPreviews(repository, policy);
}

async function repairConversationPreviews(
  repository: ChatRepository,
  policy: PortableChatPolicy,
): Promise<void> {
  const deletedPeers = new Map(policy.deletedPeers);
  const prunedPeers = new Map(policy.prunedPeers);
  for (const conversation of await repository.listConversations()) {
    const messages = await repository.getMessages(conversation.peerNumber, Number.MAX_SAFE_INTEGER);
    const newest = messages.at(-1);
    const destructiveBoundary = Math.max(
      policy.clearedAt,
      deletedPeers.get(conversation.peerNumber) ?? 0,
    );
    const pruneBoundary = Math.max(
      policy.prunedBefore,
      prunedPeers.get(conversation.peerNumber) ?? 0,
    );
    if (!newest && destructiveBoundary > 0 && conversation.lastMessageAt <= destructiveBoundary) {
      await repository.deleteConversation(conversation.peerNumber);
      continue;
    }
    if (newest && (
      conversation.lastMessageAt <= destructiveBoundary ||
      conversation.lastMessageAt < pruneBoundary
    )) {
      await repository.putConversation(conversationWithPreview(conversation, messages));
      continue;
    }
    if (!newest && conversation.lastMessageAt < pruneBoundary) {
      await repository.putConversation(clearConversationPreview(conversation));
    }
  }
}

function conversationWithPreview(
  conversation: ConversationMeta,
  messages: LinkMessage[],
): ConversationMeta {
  const newest = messages.at(-1);
  if (!newest) return clearConversationPreview(conversation);
  const visible = structuredClone(conversation);
  delete visible.hiddenAt;
  return {
    ...visible,
    peerName: newest.peerName || conversation.peerName,
    lastMessage: cleanBeepMessageContent(newest.content),
    lastMessageAt: newest.sentAt,
    lastDirection: newest.direction,
    unread: messages.filter((message) => message.direction === "incoming" && !message.read).length,
  };
}

function clearConversationPreview(conversation: ConversationMeta): ConversationMeta {
  return {
    ...conversation,
    lastMessage: "",
    lastMessageAt: 0,
    lastDirection: "incoming",
    unread: 0,
  };
}

function nextTimestamp(value: number): number {
  return value >= Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : Math.floor(value) + 1;
}

function previousTimestamp(value: number): number {
  return value <= 0 ? 0 : Math.max(0, Math.ceil(value) - 1);
}

function sanitizeConversation(value: unknown): ConversationMeta | undefined {
  if (!isRecord(value) || !validMemberNumber(value.peerNumber)) return undefined;
  const peerName = cleanText(value.peerName, 80) || `Member ${value.peerNumber}`;
  const lastDirection = value.lastDirection === "outgoing" ? "outgoing" : "incoming";
  const localAlias = cleanText(value.localAlias, 80);
  const hiddenAt = validTime(value.hiddenAt) ? value.hiddenAt : undefined;
  return {
    peerNumber: value.peerNumber,
    peerName,
    ...(localAlias ? { localAlias } : {}),
    ...(hiddenAt !== undefined ? { hiddenAt } : {}),
    lastMessage: cleanText(cleanBeepMessageContent(value.lastMessage), 1000),
    lastMessageAt: validTime(value.lastMessageAt) ? value.lastMessageAt : 0,
    lastDirection,
    unread: integerInRange(value.unread, 0, 100_000, 0),
    pinned: value.pinned === true,
    draft: cleanText(value.draft, 1000),
  };
}

function sanitizeMessage(value: unknown): LinkMessage | undefined {
  if (
    !isRecord(value) ||
    !validMemberNumber(value.peerNumber) ||
    typeof value.id !== "string" ||
    !value.id.trim() ||
    value.id.length > 200 ||
    !validTime(value.sentAt)
  ) {
    return undefined;
  }
  const roomName = cleanText(value.roomName, 100);
  return {
    id: value.id,
    direction: value.direction === "outgoing" ? "outgoing" : "incoming",
    peerNumber: value.peerNumber,
    peerName: cleanText(value.peerName, 80) || `Member ${value.peerNumber}`,
    content: cleanText(cleanBeepMessageContent(value.content), 1000),
    sentAt: value.sentAt,
    includeRoom: value.includeRoom === true,
    ...(roomName ? { roomName } : {}),
    read: value.read === true,
  };
}

function fitPortableState(state: PortableAccountState): PortableAccountState {
  const fitted = structuredClone(state);
  let encoded = encodePortableState(fitted);
  while (
    encoded &&
    encoded.length > MAX_CLOUD_PAYLOAD_CHARS &&
    fitted.chats &&
    fitted.chats.messages.length > 0
  ) {
    const remove = Math.max(1, Math.ceil(fitted.chats.messages.length / 5));
    fitted.chats.messages.splice(0, remove);
    encoded = encodePortableState(fitted);
  }
  if (encoded && encoded.length <= MAX_CLOUD_PAYLOAD_CHARS) return fitted;

  if (fitted.chats) {
    delete fitted.chats;
    encoded = encodePortableState(fitted);
  }
  if (encoded && encoded.length <= MAX_CLOUD_PAYLOAD_CHARS) return fitted;

  if (Array.isArray(fitted.people)) {
    fitted.people = prioritizePortablePeople(fitted.people);
    while (fitted.people.length > 0) {
      fitted.people.length = Math.floor(fitted.people.length * 0.8);
      encoded = encodePortableState(fitted);
      if (encoded && encoded.length <= MAX_CLOUD_PAYLOAD_CHARS) return fitted;
    }
    delete fitted.people;
  }
  return fitted;
}

function prioritizePortablePeople(values: unknown[]): unknown[] {
  return [...values].sort((left, right) => personPriority(right) - personPriority(left));
}

function personPriority(value: unknown): number {
  if (!isRecord(value)) return 0;
  const notebook =
    value.favorite === true ||
    cleanText(value.note, 1).length > 0 ||
    (Array.isArray(value.tags) && value.tags.length > 0);
  const lastSeen = validTime(value.lastSeenAt) ? value.lastSeenAt : 0;
  return (notebook ? 10 ** 15 : 0) + lastSeen;
}

function encodePortableState(state: PortableAccountState): string | undefined {
  try {
    const json = JSON.stringify(state);
    if (typeof LZString === "object" && typeof LZString.compressToBase64 === "function") {
      return `${CLOUD_FORMAT_PREFIX}${LZString.compressToBase64(json)}`;
    }
    return `${JSON_FORMAT_PREFIX}${json}`;
  } catch {
    return undefined;
  }
}

function defaultBackingStorage(): KeyValueStorage {
  if (typeof localStorage === "undefined") return new MemoryKeyValueStorage();
  try {
    localStorage.getItem("kikilink:account-storage-probe");
    return localStorage;
  } catch {
    return new MemoryKeyValueStorage();
  }
}

function validMemberNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseChatClearMarker(value: string | null): number | undefined {
  if (!value || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function integerInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function cleanText(value: unknown, limit: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit)
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
