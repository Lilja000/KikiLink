import bcModSDK, { type ModSDKModAPI } from "bondage-club-mod-sdk";
import { Logger } from "../core/logger";
import type {
  BeepEvent,
  KikiLinkEvents,
  OnlineFriend,
  RoomCharacter,
} from "../core/types";
import type { EventBus } from "../core/event-bus";

const READY_POLL_MS = 400;
const KIKILINK_BEEP_TYPE = "KikiLink";
const KIKILINK_PROTOCOL_PREFIX = "KIKILINK/1 ";
const MAX_PROTOCOL_PAYLOAD = 700;

export class BCAdapter {
  readonly #logger = new Logger("bc");
  readonly #unhooks: Array<() => void> = [];
  readonly #nicknameCache = new Map<number, string>();
  readonly #onlineFriends = new Map<number, OnlineFriend>();
  #modApi: ModSDKModAPI | undefined;
  #stopped = false;
  #ready = false;
  #sendingViaKikiLink = false;
  #hasOnlineFriendSnapshot = false;

  constructor(
    private readonly bus: EventBus<KikiLinkEvents>,
    private readonly version: string,
  ) {}

  async start(): Promise<void> {
    this.#stopped = false;
    this.bus.emit("bc:status", { state: "connecting" });
    await this.#waitUntilReady();
    if (this.#stopped) return;

    try {
      this.#modApi = bcModSDK.registerMod(
        {
          name: "KikiLink",
          fullName: "KikiLink",
          version: this.version,
        },
        { allowReplace: true },
      );

      this.#unhooks.push(
        this.#modApi.hookFunction("ServerAccountBeep", 0, (args, next) => {
          const result = next(args);
          const data = args[0];
          const protocol = this.#normalizeBeepProtocol(data);
          if (protocol) this.bus.emit("bc:protocol", protocol);
          const event = this.#normalizeIncoming(data);
          if (event) this.bus.emit("beep:received", event);
          return result;
        }),
      );

      if (typeof ServerAccountQueryResult === "function") {
        this.#unhooks.push(
          this.#modApi.hookFunction("ServerAccountQueryResult", 0, (args, next) => {
            const result = next(args);
            this.#captureOnlineFriends(args[0]);
            return result;
          }),
        );
      }

      if (typeof ChatRoomMessage === "function") {
        this.#unhooks.push(
          this.#modApi.hookFunction("ChatRoomMessage", 0, (args, next) => {
            const result = next(args);
            const protocol = this.#normalizeRoomProtocol(args[0]);
            if (protocol) this.bus.emit("bc:protocol", protocol);
            return result;
          }),
        );
      }

      this.#unhooks.push(
        this.#modApi.hookFunction("ServerSendBeepMessage", 0, (args, next) => {
          const result = next(args);
          if (this.#sendingViaKikiLink) return result;
          const [target, message, options] = args;
          const event = this.#normalizeOutgoing(target, message, options);
          if (event) this.bus.emit("beep:sent", event);
          return result;
        }),
      );

      this.#ready = true;
      this.bus.emit("bc:status", { state: "ready" });
      this.bus.emit("bc:ready", { memberNumber: Player.MemberNumber });
      this.#logger.info(`Connected as ${Player.Name} [${Player.MemberNumber}]`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect";
      this.bus.emit("bc:status", { state: "error", message });
      throw error;
    }
  }

  stop(): void {
    this.#stopped = true;
    this.#ready = false;
    this.#onlineFriends.clear();
    this.#hasOnlineFriendSnapshot = false;
    for (const unhook of this.#unhooks.splice(0).reverse()) unhook();
    this.#modApi?.unload();
    this.#modApi = undefined;
  }

  isReady(): boolean {
    return this.#ready;
  }

  canSendBeep(): boolean {
    return typeof ServerSendBeepMessage === "function";
  }

  canUseKikiLinkProtocol(): boolean {
    return typeof ServerSend === "function";
  }

  refreshOnlineFriends(): boolean {
    if (typeof ServerSend !== "function" || !this.#ready) return false;
    ServerSend("AccountQuery", { Query: "OnlineFriends" });
    return true;
  }

  getOnlineFriends(): OnlineFriend[] {
    return [...this.#onlineFriends.values()].map((friend) => ({ ...friend }));
  }

  hasOnlineFriendSnapshot(): boolean {
    return this.#hasOnlineFriendSnapshot;
  }

  isKnownFriend(memberNumber: number): boolean {
    return (
      typeof Player === "object" &&
      Player !== null &&
      Player.FriendNames instanceof Map &&
      Player.FriendNames.has(memberNumber)
    );
  }

  isMemberInCurrentRoom(memberNumber: number): boolean {
    return this.#findRoomCharacter(memberNumber) !== undefined;
  }

  sendKikiLinkProtocol(target: number, payload: string): "room" | "beep" {
    if (!Number.isSafeInteger(target) || target < 0) {
      throw new Error("A valid non-negative member number is required");
    }
    const wire = protocolWire(payload);
    if (typeof ServerSend !== "function") {
      throw new Error("The KikiLink compatibility channel is still loading");
    }

    if (this.isInChatRoom() && this.#findRoomCharacter(target)) {
      ServerSend("ChatRoomChat", {
        Type: "Hidden",
        Content: wire,
        Target: target,
      });
      return "room";
    }

    ServerSend("AccountBeep", {
      MemberNumber: target,
      BeepType: KIKILINK_BEEP_TYPE,
      Message: wire,
      IsSecret: true,
    });
    return "beep";
  }

  broadcastKikiLinkProtocol(payload: string): boolean {
    if (!this.isInChatRoom() || typeof ServerSend !== "function") return false;
    ServerSend("ChatRoomChat", {
      Type: "Hidden",
      Content: protocolWire(payload),
    });
    return true;
  }

  sendBeep(target: number, content: string, includeRoom: boolean): BeepEvent {
    if (!Number.isSafeInteger(target) || target < 0) {
      throw new Error("A valid non-negative member number is required");
    }

    const message = content.trim();
    if (!message) throw new Error("A Beep message cannot be empty");
    if (message.length > 1000) throw new Error("A Beep message cannot exceed 1000 characters");
    if (typeof ServerSendBeepMessage !== "function") {
      throw new Error("KikiLink is still connecting to Bondage Club");
    }

    const event = this.#normalizeOutgoing(target, message, { includeRoom });
    if (!event) throw new Error("Unable to prepare this Beep");

    this.#sendingViaKikiLink = true;
    try {
      ServerSendBeepMessage(target, message, { includeRoom });
    } finally {
      this.#sendingViaKikiLink = false;
    }
    return event;
  }

  getMemberName(memberNumber: number): string {
    const nickname = this.getMemberNickname(memberNumber);
    if (nickname) return nickname;
    if (typeof Player !== "object" || Player === null) return `Member ${memberNumber}`;
    return Player.FriendNames?.get(memberNumber) ?? `Member ${memberNumber}`;
  }

  getMemberNickname(memberNumber: number): string | undefined {
    if (typeof Player === "object" && Player !== null && Player.MemberNumber === memberNumber) {
      const ownNickname = cleanName(Player.Nickname);
      if (ownNickname) this.#nicknameCache.set(memberNumber, ownNickname);
      else this.#nicknameCache.delete(memberNumber);
    }

    if (typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)) {
      const character = ChatRoomCharacter.find((candidate) => candidate.MemberNumber === memberNumber);
      const nickname = cleanName(character?.Nickname);
      if (nickname) this.#nicknameCache.set(memberNumber, nickname);
      else if (character) this.#nicknameCache.delete(memberNumber);
    }
    return this.#nicknameCache.get(memberNumber);
  }

  getOwnMemberNumber(): number {
    if (typeof Player !== "object" || Player === null) return -1;
    return Number.isSafeInteger(Player.MemberNumber) ? Player.MemberNumber : -1;
  }

  getOwnName(): string {
    if (typeof Player !== "object" || Player === null) return "me";
    return cleanName(Player.Nickname) ?? cleanName(Player.Name) ?? "me";
  }

  isInChatRoom(): boolean {
    return (
      typeof CurrentScreen === "string" &&
      CurrentScreen === "ChatRoom" &&
      typeof ChatRoomCharacter !== "undefined" &&
      Array.isArray(ChatRoomCharacter)
    );
  }

  canSendRoomEmote(): boolean {
    return this.isInChatRoom() && typeof ChatRoomSendEmote === "function";
  }

  getRoomCharacters(): RoomCharacter[] {
    if (!this.isInChatRoom()) return [];
    const ownMemberNumber = this.getOwnMemberNumber();

    return ChatRoomCharacter.filter(
      (character) =>
        Number.isSafeInteger(character.MemberNumber) && character.MemberNumber !== ownMemberNumber,
    )
      .map((character) => {
        const accountName = cleanName(character.Name);
        return {
          memberNumber: character.MemberNumber,
          memberName:
            this.getMemberNickname(character.MemberNumber) ??
            accountName ??
            `Member ${character.MemberNumber}`,
          ...(accountName !== undefined ? { accountName } : {}),
          isFriend:
            typeof Player === "object" &&
            Player !== null &&
            Player.FriendNames instanceof Map &&
            Player.FriendNames.has(character.MemberNumber),
        };
      })
      .sort((left, right) => left.memberName.localeCompare(right.memberName));
  }

  sendRoomEmote(content: string): void {
    const message = content.trim();
    if (!message) throw new Error("An activity cannot be empty");
    if (message.length > 1000) {
      throw new Error("An activity cannot exceed 1000 characters after variables are expanded");
    }
    if (!this.isInChatRoom()) throw new Error("Open a Bondage Club chat room first");
    if (typeof ChatRoomSendEmote !== "function") {
      throw new Error("The Bondage Club room chat is still loading");
    }
    ChatRoomSendEmote(message);
  }

  getCurrentRoomName(): string | undefined {
    if (!this.isInChatRoom()) return undefined;
    if (typeof ChatRoomData === "undefined" || ChatRoomData === null) return undefined;
    return cleanName(ChatRoomData.Name);
  }

  startWhisper(memberNumber: number): void {
    if (!this.isInChatRoom()) throw new Error("Open a Bondage Club chat room first");
    if (!this.#findRoomCharacter(memberNumber)) {
      throw new Error("This player is no longer in the room");
    }
    if (typeof ChatRoomSetTarget !== "function") {
      throw new Error("The native Whisper control is still loading");
    }

    ChatRoomSetTarget(memberNumber);
    const input = document.getElementById("InputChat");
    if (input instanceof HTMLElement) input.focus();
  }

  openProfile(memberNumber: number): void {
    if (!this.isInChatRoom()) throw new Error("Profiles can be opened from a chat room");
    const character = this.#findRoomCharacter(memberNumber);
    if (!character) throw new Error("This player is no longer in the room");
    if (typeof InformationSheetLoadCharacter !== "function") {
      throw new Error("The native profile screen is still loading");
    }
    InformationSheetLoadCharacter(character);
  }

  #findRoomCharacter(memberNumber: number): BCCharacter | undefined {
    if (typeof ChatRoomCharacter === "undefined" || !Array.isArray(ChatRoomCharacter)) {
      return undefined;
    }
    return ChatRoomCharacter.find((character) => character.MemberNumber === memberNumber);
  }

  getKnownContacts(): Array<{ memberNumber: number; memberName: string }> {
    const contacts = new Map<number, string>();
    if (typeof Player === "object" && Player !== null && Player.FriendNames instanceof Map) {
      for (const [memberNumber, memberName] of Player.FriendNames) {
        if (Number.isSafeInteger(memberNumber) && cleanName(memberName)) {
          contacts.set(memberNumber, this.getMemberNickname(memberNumber) ?? memberName.trim());
        }
      }
    }

    if (typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)) {
      for (const character of ChatRoomCharacter) {
        if (!Number.isSafeInteger(character.MemberNumber) || character.MemberNumber === this.getOwnMemberNumber()) {
          continue;
        }
        contacts.set(
          character.MemberNumber,
          this.getMemberNickname(character.MemberNumber) ?? cleanName(character.Name) ?? `Member ${character.MemberNumber}`,
        );
      }
    }

    for (const friend of this.#onlineFriends.values()) {
      contacts.set(
        friend.memberNumber,
        this.getMemberNickname(friend.memberNumber) ?? friend.memberName,
      );
    }

    return [...contacts.entries()]
      .map(([memberNumber, memberName]) => ({ memberNumber, memberName }))
      .sort((left, right) => left.memberName.localeCompare(right.memberName));
  }

  getRecentBeeps(limit = 100): BeepEvent[] {
    if (typeof FriendListBeepLog === "undefined" || !Array.isArray(FriendListBeepLog)) return [];

    return FriendListBeepLog.slice(-Math.max(0, limit))
      .map((entry): BeepEvent | null => {
        if (!Number.isSafeInteger(entry.MemberNumber)) return null;
        const timestamp = new Date(entry.Time).getTime();
        const sentAt = Number.isFinite(timestamp) ? timestamp : Date.now();
        const roomName = cleanName(entry.ChatRoomName);
        return {
          direction: entry.Sent ? "outgoing" : "incoming",
          peerNumber: entry.MemberNumber,
          peerName:
            this.getMemberNickname(entry.MemberNumber) ??
            cleanName(entry.MemberName) ??
            `Member ${entry.MemberNumber}`,
          content: typeof entry.Message === "string" ? entry.Message.slice(0, 1000) : "",
          sentAt,
          includeRoom: roomName !== undefined,
          ...(roomName !== undefined ? { roomName } : {}),
        };
      })
      .filter((event): event is BeepEvent => event !== null)
      .sort((left, right) => left.sentAt - right.sentAt);
  }

  #normalizeIncoming(data: BCServerAccountBeepResponse): BeepEvent | null {
    if (!data || (data.BeepType !== undefined && data.BeepType !== "")) return null;
    if (!Number.isSafeInteger(data.MemberNumber) || typeof data.MemberName !== "string") return null;

    const roomName = typeof data.ChatRoomName === "string" ? data.ChatRoomName : undefined;
    return {
      direction: "incoming",
      peerNumber: data.MemberNumber,
      peerName: this.getMemberNickname(data.MemberNumber) ?? data.MemberName,
      content: typeof data.Message === "string" ? data.Message.slice(0, 1000) : "",
      sentAt: Date.now(),
      includeRoom: roomName !== undefined,
      ...(roomName !== undefined ? { roomName } : {}),
    };
  }

  #normalizeBeepProtocol(
    data: BCServerAccountBeepResponse,
  ): KikiLinkEvents["bc:protocol"] | null {
    if (
      !data ||
      data.BeepType !== KIKILINK_BEEP_TYPE ||
      !Number.isSafeInteger(data.MemberNumber) ||
      typeof data.Message !== "string" ||
      !data.Message.startsWith(KIKILINK_PROTOCOL_PREFIX)
    ) {
      return null;
    }
    const payload = data.Message.slice(KIKILINK_PROTOCOL_PREFIX.length);
    if (!payload || payload.length > MAX_PROTOCOL_PAYLOAD) return null;
    return { senderNumber: data.MemberNumber, payload, channel: "beep" };
  }

  #normalizeRoomProtocol(data: BCChatRoomMessage): KikiLinkEvents["bc:protocol"] | null {
    if (
      !data ||
      data.Type !== "Hidden" ||
      typeof data.Sender !== "number" ||
      !Number.isSafeInteger(data.Sender) ||
      data.Sender === this.getOwnMemberNumber() ||
      typeof data.Content !== "string" ||
      !data.Content.startsWith(KIKILINK_PROTOCOL_PREFIX)
    ) {
      return null;
    }
    const payload = data.Content.slice(KIKILINK_PROTOCOL_PREFIX.length);
    if (!payload || payload.length > MAX_PROTOCOL_PAYLOAD) return null;
    return { senderNumber: data.Sender, payload, channel: "room" };
  }

  #captureOnlineFriends(data: BCAccountQueryResponse): void {
    if (!data || data.Query !== "OnlineFriends" || !Array.isArray(data.Result)) return;
    const friends = data.Result
      .map((entry): OnlineFriend | null => {
        if (
          !entry ||
          typeof entry !== "object" ||
          !("MemberNumber" in entry) ||
          !Number.isSafeInteger(entry.MemberNumber) ||
          !("MemberName" in entry) ||
          typeof entry.MemberName !== "string"
        ) {
          return null;
        }
        const nickname = "MemberNickname" in entry ? cleanName(entry.MemberNickname) : undefined;
        if (nickname) this.#nicknameCache.set(entry.MemberNumber, nickname);
        const roomName = "ChatRoomName" in entry ? cleanName(entry.ChatRoomName) : undefined;
        const roomSpace = "ChatRoomSpace" in entry ? cleanName(entry.ChatRoomSpace) : undefined;
        return {
          memberNumber: entry.MemberNumber,
          memberName: nickname ?? (entry.MemberName.trim() || `Member ${entry.MemberNumber}`),
          privateRoom: "Private" in entry && entry.Private === true,
          ...(roomName ? { roomName } : {}),
          ...(roomSpace ? { roomSpace } : {}),
        };
      })
      .filter((entry): entry is OnlineFriend => entry !== null);

    this.#onlineFriends.clear();
    for (const friend of friends) this.#onlineFriends.set(friend.memberNumber, friend);
    this.#hasOnlineFriendSnapshot = true;
    this.bus.emit("bc:online-friends", { friends: this.getOnlineFriends(), receivedAt: Date.now() });
  }

  #normalizeOutgoing(
    target: number,
    message: string | undefined,
    options: { includeRoom?: boolean } | undefined,
  ): BeepEvent | null {
    if (!Number.isSafeInteger(target) || target < 0) return null;

    const includeRoom = options?.includeRoom === true;
    const roomName = includeRoom && typeof ChatRoomData?.Name === "string" ? ChatRoomData.Name : undefined;
    return {
      direction: "outgoing",
      peerNumber: target,
      peerName: this.getMemberName(target),
      content: message ?? "",
      sentAt: Date.now(),
      includeRoom,
      ...(roomName !== undefined ? { roomName } : {}),
    };
  }

  async #waitUntilReady(): Promise<void> {
    while (!this.#stopped && !isBondageClubReady()) {
      await new Promise<void>((resolve) => setTimeout(resolve, READY_POLL_MS));
    }
  }
}

function protocolWire(payload: string): string {
  const value = payload.trim();
  if (!value || value.length > MAX_PROTOCOL_PAYLOAD) {
    throw new Error(`KikiLink protocol payload must be 1-${MAX_PROTOCOL_PAYLOAD} characters`);
  }
  return `${KIKILINK_PROTOCOL_PREFIX}${value}`;
}

function cleanName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.trim();
  return name || undefined;
}

function isBondageClubReady(): boolean {
  return (
    typeof document !== "undefined" &&
    document.body !== null &&
    typeof Player === "object" &&
    Player !== null &&
    Number.isSafeInteger(Player.MemberNumber) &&
    typeof ServerAccountBeep === "function" &&
    typeof ServerSendBeepMessage === "function" &&
    (typeof ServerIsLoggedIn !== "function" || ServerIsLoggedIn())
  );
}
