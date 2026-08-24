import {
  MemoryKeyValueStorage,
  SETTINGS_KEY,
  type KeyValueStorage,
} from "../core/settings";
import type { ConversationMeta, LinkMessage } from "../core/types";
import type { ChatRepository } from "./chat-repository";
import { PEOPLE_KEY } from "./people-repository";

const CLOUD_EXTENSION_KEY = "KikiLink";
const CLOUD_MIRROR_KEY = "kikilink:cloud-mirror:v1";
const CLOUD_FORMAT_PREFIX = "KIKILINK/1:";
const JSON_FORMAT_PREFIX = "JSON:";
const CLOUD_SYNC_DELAY_MS = 750;
const MAX_CLOUD_PAYLOAD_CHARS = 120_000;
const MAX_CLOUD_CONVERSATIONS = 100;
const MAX_CLOUD_MESSAGES = 600;
const MAX_CLOUD_MESSAGES_PER_CONVERSATION = 100;

interface PortableChatState {
  conversations: ConversationMeta[];
  messages: LinkMessage[];
}

interface PortableAccountState {
  version: 1;
  owner: number;
  updatedAt: number;
  settings?: unknown;
  people?: unknown[];
  chats?: PortableChatState;
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
  #chatDirty = false;
  #destroyed = false;

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

    if (selected) {
      this.#restorePortableKey(SETTINGS_KEY, selected.settings);
      this.#restorePortableKey(PEOPLE_KEY, selected.people);
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
  }

  getItem(key: string): string | null {
    try {
      return this.#local.getItem(key);
    } catch {
      return null;
    }
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

  /** Imports a newer portable snapshot without clearing newer account-local history. */
  async attachChatRepository(repository: ChatRepository): Promise<void> {
    this.#repository = repository;
    const chats = this.#state.chats;
    if (!chats) return;

    for (const message of chats.messages) await repository.addMessage(message);
    for (const remoteConversation of chats.conversations) {
      const localConversation = await repository.getConversation(remoteConversation.peerNumber);
      if (!localConversation || remoteConversation.lastMessageAt >= localConversation.lastMessageAt) {
        await repository.putConversation(remoteConversation);
      }
    }
  }

  markChatChanged(): void {
    if (this.#destroyed) return;
    this.#chatDirty = true;
    this.#markDirty();
  }

  flush(): Promise<void> {
    this.#flushChain = this.#flushChain.then(() => this.#flushOnce());
    return this.#flushChain;
  }

  async destroy(): Promise<void> {
    if (this.#destroyed) return;
    await this.flush();
    this.#destroyed = true;
    if (this.#syncTimer !== undefined) clearTimeout(this.#syncTimer);
    this.#syncTimer = undefined;
    this.#repository = undefined;
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
    const raw = this.getItem(key);
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

    if (this.#chatDirty && this.#repository) {
      this.#state.chats = await capturePortableChats(this.#repository);
      this.#chatDirty = false;
      this.#touch();
      this.#persistMirror();
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

  #persistMirror(): void {
    try {
      this.#local.setItem(CLOUD_MIRROR_KEY, JSON.stringify(this.#state));
    } catch {
      // Account-local stores still retain their full data independently.
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
    await this.repository.deleteConversation(peerNumber);
    this.account.markChatChanged();
  }

  async deleteMessagesOlderThan(timestamp: number): Promise<number> {
    const removed = await this.repository.deleteMessagesOlderThan(timestamp);
    if (removed > 0) this.account.markChatChanged();
    return removed;
  }

  async trimConversation(peerNumber: number, keepNewest: number): Promise<number> {
    const removed = await this.repository.trimConversation(peerNumber, keepNewest);
    if (removed > 0) this.account.markChatChanged();
    return removed;
  }

  async clearAll(): Promise<void> {
    await this.repository.clearAll();
    this.account.markChatChanged();
  }

  close(): void {
    this.repository.close();
  }
}

export function accountChatDatabaseName(memberNumber: number): string {
  if (!validMemberNumber(memberNumber)) throw new Error("A valid BC account is required");
  return `kikilink-account-${memberNumber}`;
}

async function capturePortableChats(repository: ChatRepository): Promise<PortableChatState> {
  const conversations = (await repository.listConversations()).slice(0, MAX_CLOUD_CONVERSATIONS);
  const messages: LinkMessage[] = [];
  for (const conversation of conversations) {
    messages.push(
      ...(await repository.getMessages(
        conversation.peerNumber,
        MAX_CLOUD_MESSAGES_PER_CONVERSATION,
      )),
    );
  }
  messages.sort((left, right) => right.sentAt - left.sentAt);
  return {
    conversations: conversations.map((conversation) => structuredClone(conversation)),
    messages: messages
      .slice(0, MAX_CLOUD_MESSAGES)
      .sort((left, right) => left.sentAt - right.sentAt)
      .map((message) => structuredClone(message)),
  };
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
    try {
      if (value.startsWith(CLOUD_FORMAT_PREFIX)) {
        if (typeof LZString !== "object" || typeof LZString.decompressFromBase64 !== "function") {
          return undefined;
        }
        const json = LZString.decompressFromBase64(value.slice(CLOUD_FORMAT_PREFIX.length));
        if (!json) return undefined;
        parsed = JSON.parse(json) as unknown;
      } else if (value.startsWith(JSON_FORMAT_PREFIX)) {
        parsed = JSON.parse(value.slice(JSON_FORMAT_PREFIX.length)) as unknown;
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
    lastMessage: cleanText(value.lastMessage, 1000),
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
    content: cleanText(value.content, 1000),
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
