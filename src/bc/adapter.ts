import bcModSDK, { type ModSDKModAPI } from "bondage-club-mod-sdk";
import { Logger } from "../core/logger";
import type { BeepEvent, KikiLinkEvents, RoomCharacter } from "../core/types";
import type { EventBus } from "../core/event-bus";

const READY_POLL_MS = 400;

export class BCAdapter {
  readonly #logger = new Logger("bc");
  readonly #unhooks: Array<() => void> = [];
  readonly #nicknameCache = new Map<number, string>();
  #modApi: ModSDKModAPI | undefined;
  #stopped = false;
  #ready = false;
  #sendingViaKikiLink = false;

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
          const event = this.#normalizeIncoming(data);
          if (event) this.bus.emit("beep:received", event);
          return result;
        }),
      );

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
