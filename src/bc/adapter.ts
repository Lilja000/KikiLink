import "bondage-club-mod-sdk";
import type { ModSDKGlobalAPI, ModSDKModAPI } from "bondage-club-mod-sdk";
import { Logger } from "../core/logger";
import type {
  BeepEvent,
  KikiLinkEvents,
  OnlineFriend,
  PlayerRelationship,
  RoomPresetData,
  RoomCharacter,
} from "../core/types";
import type { EventBus } from "../core/event-bus";
import { cleanBeepMessageContent } from "./message-content";

const READY_POLL_MS = 400;
const ACTIVITY_HOOK_RETRY_MS = 500;
const CHARACTER_OVERLAY_HOOK_RETRY_MS = 500;
const SOCKET_REBIND_MS = 2_000;
const BEEP_LOG_POLL_MS = 1_000;
const RECENT_INCOMING_TTL_MS = 10_000;
const RECENT_OUTGOING_TTL_MS = 10_000;
const OUTGOING_DEDUPE_WINDOW_MS = 250;
const KIKILINK_BEEP_TYPE = "KikiLink";
const KIKILINK_PROTOCOL_PREFIX = "KIKILINK/1 ";
const MAX_PROTOCOL_PAYLOAD = 700;
const CUSTOM_ACTIVITY_HOOK_COUNT = 6;
const CHARACTER_OVERLAY_HOOK_NAME = "ChatRoomDrawCharacterStatusIcons";

interface RecentIncoming {
  fingerprint: string;
  capturedAt: number;
}

interface RecentOutgoing {
  fingerprint: string;
  sentAt: number;
  capturedAt: number;
  source: "transport" | "log" | "kikilink";
}

type ResilientHook = (args: any[], next: (args: any[]) => any) => any;

interface DirectHookRegistration {
  isCurrent(): boolean;
  unhook(): void;
}

export type BCCharacterOverlayRenderer = (
  character: BCCharacter,
  characterX: number,
  characterY: number,
  zoom: number,
) => void;

export interface BCCustomActivityIntegration {
  isCustomActivity?(activityName: string): boolean;
  extendAllowedActivities?(
    character: BCCharacter,
    groupName: string,
    activities: BCItemActivity[],
  ): BCItemActivity[];
  resolveText(keyword: string): string | undefined;
  resolveImage(activityName: string): string | undefined;
  run(
    actor: BCCharacter,
    acted: BCCharacter,
    targetGroup: BCAssetGroup,
    itemActivity: BCItemActivity,
  ): boolean;
  decorateButton(button: HTMLButtonElement, itemActivity: BCItemActivity): void;
  onRoomMessage(message: BCChatRoomMessage): void;
}

export interface BCRoomCustomization {
  imageUrl: string;
  musicUrl: string;
  sizeMode: number;
  musicSync: boolean;
}

export interface BCRoomAdminPlayer extends RoomCharacter {
  admin: boolean;
  whitelisted: boolean;
}

export interface BCRoomAdminSnapshot {
  roomName: string;
  isAdmin: boolean;
  customization: BCRoomCustomization;
  settings: RoomPresetData;
  players: BCRoomAdminPlayer[];
}

export interface BCLobbyFriend {
  memberNumber: number;
  memberName: string;
}

export interface BCLobbyRoom {
  name: string;
  creator?: string;
  description: string;
  language: string;
  memberCount: number;
  memberLimit: number;
  canJoin: boolean;
  locked: boolean;
  privateRoom: boolean;
  mapType: string;
  friends: BCLobbyFriend[];
}

export type BCRoomSearchSpace = "" | "X" | "M";

export type BCRoomMemberAction = "kick" | "promote" | "demote" | "whitelist" | "unwhitelist";

export class BCAdapter {
  readonly #logger = new Logger("bc");
  readonly #unhooks: Array<() => void> = [];
  readonly #nicknameCache = new Map<number, string>();
  readonly #onlineFriends = new Map<number, OnlineFriend>();
  readonly #recentIncoming: RecentIncoming[] = [];
  readonly #recentOutgoing: RecentOutgoing[] = [];
  readonly #characterOverlayRenderers = new Set<BCCharacterOverlayRenderer>();
  readonly #customActivityIntegrations = new Set<BCCustomActivityIntegration>();
  readonly #installedActivityHooks = new Set<string>();
  readonly #installedOutgoingHooks = new Set<string>();
  readonly #resilientHooks = new Map<string, ResilientHook>();
  readonly #directHookRegistrations = new Map<string, DirectHookRegistration>();
  #modApi: ModSDKModAPI | undefined;
  #socket: BCServerSocket | undefined;
  #socketRebindTimer: ReturnType<typeof setInterval> | undefined;
  #beepLogTimer: ReturnType<typeof setInterval> | undefined;
  #activityHookRetryTimer: ReturnType<typeof setInterval> | undefined;
  #characterOverlayHookRetryTimer: ReturnType<typeof setInterval> | undefined;
  readonly #characterOverlayHookNames = new Set<string>();
  readonly #overlayRenderSignatures = new Set<string>();
  #overlayRenderResetQueued = false;
  #beepLogCursor = 0;
  #seenIncomingPayloads = new WeakSet<object>();
  #seenRoomProtocolPayloads = new WeakSet<object>();
  #stopped = false;
  #ready = false;
  #sendingViaKikiLink = false;
  #hasOnlineFriendSnapshot = false;
  #onlineFriendSignature: string | undefined;
  #compatibilityHooksInitialized = false;
  #roomMessageHookInstalled = false;

  readonly #socketBeepListener = (data: BCServerAccountBeepResponse): void => {
    this.#captureIncomingPayload(data);
  };

  readonly #socketQueryListener = (data: BCAccountQueryResponse): void => {
    this.#captureOnlineFriends(data);
  };

  readonly #socketRoomMessageListener = (data: BCChatRoomMessage): void => {
    this.#captureRoomProtocolPayload(data);
  };

  constructor(
    private readonly bus: EventBus<KikiLinkEvents>,
    private readonly version: string,
  ) {}

  async start(): Promise<void> {
    this.#stopped = false;
    this.bus.emit("bc:status", { state: "connecting" });
    await this.#waitUntilReady();
    if (this.#stopped) return;

    this.#initializeBeepLogCursor();
    this.#attachSocketListeners();
    this.#installCompatibilityHooks();
    this.#socketRebindTimer = setInterval(
      () => this.#attachSocketListeners(),
      SOCKET_REBIND_MS,
    );
    this.#beepLogTimer = setInterval(() => {
      this.#ensureOutgoingBeepHooks();
      this.#captureNewBeepLogEntries();
    }, BEEP_LOG_POLL_MS);

    this.#ready = true;
    this.bus.emit("bc:status", { state: "ready" });
    this.bus.emit("bc:ready", { memberNumber: Player.MemberNumber });
    this.#logger.info(`Connected as ${Player.Name} [${Player.MemberNumber}]`);
  }

  stop(): void {
    this.#stopped = true;
    this.#ready = false;
    this.#onlineFriends.clear();
    this.#nicknameCache.clear();
    this.#recentIncoming.splice(0);
    this.#recentOutgoing.splice(0);
    this.#seenIncomingPayloads = new WeakSet<object>();
    this.#seenRoomProtocolPayloads = new WeakSet<object>();
    this.#hasOnlineFriendSnapshot = false;
    this.#onlineFriendSignature = undefined;
    if (this.#socketRebindTimer !== undefined) clearInterval(this.#socketRebindTimer);
    if (this.#beepLogTimer !== undefined) clearInterval(this.#beepLogTimer);
    if (this.#activityHookRetryTimer !== undefined) clearInterval(this.#activityHookRetryTimer);
    if (this.#characterOverlayHookRetryTimer !== undefined) {
      clearInterval(this.#characterOverlayHookRetryTimer);
    }
    this.#socketRebindTimer = undefined;
    this.#beepLogTimer = undefined;
    this.#activityHookRetryTimer = undefined;
    this.#characterOverlayHookRetryTimer = undefined;
    this.#detachSocketListeners();
    for (const unhook of this.#unhooks.splice(0).reverse()) unhook();
    this.#modApi?.unload();
    this.#modApi = undefined;
    this.#compatibilityHooksInitialized = false;
    this.#roomMessageHookInstalled = false;
    this.#installedActivityHooks.clear();
    this.#installedOutgoingHooks.clear();
    this.#resilientHooks.clear();
    this.#directHookRegistrations.clear();
    this.#characterOverlayHookNames.clear();
    this.#overlayRenderSignatures.clear();
    this.#overlayRenderResetQueued = false;
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

  registerCharacterOverlay(renderer: BCCharacterOverlayRenderer): () => void {
    this.#characterOverlayRenderers.add(renderer);
    if (this.#compatibilityHooksInitialized) this.#ensureCharacterOverlayHook();
    return () => this.#characterOverlayRenderers.delete(renderer);
  }

  registerCustomActivityIntegration(integration: BCCustomActivityIntegration): () => void {
    this.#customActivityIntegrations.add(integration);
    if (this.#compatibilityHooksInitialized) this.#ensureActivityHooks();
    return () => this.#customActivityIntegrations.delete(integration);
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
    if (typeof Player !== "object" || Player === null) return false;
    if (Array.isArray(Player.FriendList)) return Player.FriendList.includes(memberNumber);
    return Player.FriendNames instanceof Map && Player.FriendNames.has(memberNumber);
  }

  getPlayerRelationships(memberNumber: number): PlayerRelationship[] {
    if (
      !Number.isSafeInteger(memberNumber) ||
      memberNumber < 0 ||
      typeof Player !== "object" ||
      Player === null
    ) {
      return [];
    }

    const relationships: PlayerRelationship[] = [];
    if (Player.Ownership?.MemberNumber === memberNumber) relationships.push("owner");
    if (
      Array.isArray(Player.Lovership) &&
      Player.Lovership.some((relationship) => relationship?.MemberNumber === memberNumber)
    ) {
      relationships.push("lover");
    }
    if (Array.isArray(Player.WhiteList) && Player.WhiteList.includes(memberNumber)) {
      relationships.push("whitelist");
    }
    if (Array.isArray(Player.BlackList) && Player.BlackList.includes(memberNumber)) {
      relationships.push("blacklist");
    }
    if (Array.isArray(Player.GhostList) && Player.GhostList.includes(memberNumber)) {
      relationships.push("ghosted");
    }
    return relationships;
  }

  isMemberInCurrentRoom(memberNumber: number): boolean {
    return this.isInChatRoom() && this.#findRoomCharacter(memberNumber) !== undefined;
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

    // LinkChat saves the returned event itself. Remember it so the low-level AccountBeep hook and
    // BC's native FriendListBeepLog recovery cannot save the same message a second time.
    this.#rememberOutgoing(event, "kikilink");

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
    if (typeof ServerPlayerIsInChatRoom === "function") {
      return ServerPlayerIsInChatRoom();
    }
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
          isFriend: this.isKnownFriend(character.MemberNumber),
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

  getRoomAdminSnapshot(): BCRoomAdminSnapshot | undefined {
    if (!this.isInChatRoom() || typeof ChatRoomData !== "object" || ChatRoomData === null) {
      return undefined;
    }
    try {
      const admins = Array.isArray(ChatRoomData.Admin) ? ChatRoomData.Admin : [];
      const whitelist = Array.isArray(ChatRoomData.Whitelist) ? ChatRoomData.Whitelist : [];
      const custom = ChatRoomData.Custom;
      return {
        roomName: cleanName(ChatRoomData.Name) ?? "Current room",
        isAdmin: this.#isRoomAdmin(admins),
        customization: {
          imageUrl: cleanName(custom?.ImageURL) ?? "",
          musicUrl: cleanName(custom?.MusicURL) ?? "",
          sizeMode:
            typeof custom?.SizeMode === "number" &&
            Number.isInteger(custom.SizeMode) &&
            custom.SizeMode >= 1 &&
            custom.SizeMode <= 3
              ? custom.SizeMode
              : 1,
          musicSync: typeof custom?.MusicStart === "number",
        },
        settings: {
          name: cleanName(ChatRoomData.Name) ?? "Current room",
          description: cleanText(ChatRoomData.Description, 200),
          background: cleanText(ChatRoomData.Background, 120),
          limit: boundedInteger(ChatRoomData.Limit, 2, 20, 10),
          game: cleanText(ChatRoomData.Game, 40),
          space: cleanText(ChatRoomData.Space, 20),
          language: cleanText(ChatRoomData.Language, 12),
          visibility: cleanStringArray(ChatRoomData.Visibility, 8, 30),
          access: cleanStringArray(ChatRoomData.Access, 8, 30),
          blockCategory: cleanStringArray(ChatRoomData.BlockCategory, 24, 40),
          admins: cleanMemberNumberArray(admins, 20),
          whitelist: cleanMemberNumberArray(whitelist, 100),
          blacklist: cleanMemberNumberArray(ChatRoomData.Ban, 100),
          custom: {
            imageUrl: cleanText(custom?.ImageURL, 500),
            imageFilter: cleanText(custom?.ImageFilter, 120),
            musicUrl: cleanText(custom?.MusicURL, 500),
            sizeMode: boundedInteger(custom?.SizeMode, 1, 3, 1),
            musicSync: typeof custom?.MusicStart === "number",
          },
        },
        players: this.getRoomCharacters().map((character) => ({
          ...character,
          admin: admins.includes(character.memberNumber),
          whitelisted: whitelist.includes(character.memberNumber),
        })),
      };
    } catch (error) {
      this.#logger.warn("Room administration data was not readable", error);
      return undefined;
    }
  }

  updateRoomCustomization(customization: BCRoomCustomization): void {
    const snapshot = this.getRoomAdminSnapshot();
    if (!snapshot) throw new Error("Open a Bondage Club chat room first");
    if (!snapshot.isAdmin) throw new Error("Only a room administrator can change room media");
    if (typeof ServerSend !== "function") throw new Error("Bondage Club is still connecting");
    const imageUrl = normalizeRoomMediaUrl(customization.imageUrl, "image");
    const musicUrl = normalizeRoomMediaUrl(customization.musicUrl, "audio");
    const sizeMode = Number.isInteger(customization.sizeMode)
      ? Math.min(3, Math.max(1, customization.sizeMode))
      : 1;
    const room =
      typeof ChatRoomGetSettings === "function"
        ? ChatRoomGetSettings(ChatRoomData as BCChatRoomData)
        : { ...(ChatRoomData as BCChatRoomData) };
    const custom: NonNullable<BCChatRoomData["Custom"]> = {
      ...(ChatRoomData?.Custom ?? {}),
      SizeMode: sizeMode,
    };
    if (customization.musicSync) {
      const existingMusicUrl = cleanName(ChatRoomData?.Custom?.MusicURL);
      const existingMusicStart = ChatRoomData?.Custom?.MusicStart;
      custom.MusicStart =
        musicUrl === existingMusicUrl &&
        typeof existingMusicStart === "number" &&
        Number.isFinite(existingMusicStart)
          ? existingMusicStart
          : typeof CurrentTime === "number" && Number.isFinite(CurrentTime)
            ? CurrentTime
            : Date.now();
    } else {
      delete custom.MusicStart;
    }
    if (imageUrl) custom.ImageURL = imageUrl;
    else delete custom.ImageURL;
    if (musicUrl) custom.MusicURL = musicUrl;
    else delete custom.MusicURL;
    room.Custom = custom;
    ServerSend("ChatRoomAdmin", {
      MemberNumber:
        typeof Player.ID === "number" && Number.isSafeInteger(Player.ID)
          ? Player.ID
          : Player.MemberNumber,
      Room: room,
      Action: "Update",
    });
  }

  applyRoomPreset(preset: RoomPresetData): void {
    const snapshot = this.getRoomAdminSnapshot();
    if (!snapshot) throw new Error("Open a Bondage Club chat room first");
    if (!snapshot.isAdmin) throw new Error("Only a room administrator can apply room presets");
    if (typeof ServerSend !== "function") throw new Error("Bondage Club is still connecting");

    const current = ChatRoomData as BCChatRoomData;
    const room = typeof ChatRoomGetSettings === "function"
      ? ChatRoomGetSettings(current)
      : { ...current };
    const ownMemberNumber = this.getOwnMemberNumber();
    const admins = cleanMemberNumberArray(preset.admins, 20);
    if (!admins.includes(ownMemberNumber)) admins.unshift(ownMemberNumber);
    room.Name = cleanText(preset.name, 80) || snapshot.roomName;
    room.Description = cleanText(preset.description, 200);
    room.Background = cleanText(preset.background, 120);
    room.Limit = boundedInteger(preset.limit, 2, 20, 10);
    room.Game = cleanText(preset.game, 40);
    room.Space = cleanText(preset.space, 20);
    room.Language = cleanText(preset.language, 12);
    room.Visibility = cleanStringArray(preset.visibility, 8, 30);
    room.Access = cleanStringArray(preset.access, 8, 30);
    room.BlockCategory = cleanStringArray(preset.blockCategory, 24, 40);
    room.Admin = admins;
    room.Whitelist = cleanMemberNumberArray(preset.whitelist, 100);
    room.Ban = cleanMemberNumberArray(preset.blacklist, 100);

    const custom: NonNullable<BCChatRoomData["Custom"]> = {
      ...(current.Custom ?? {}),
      SizeMode: boundedInteger(preset.custom.sizeMode, 1, 3, 1),
    };
    const imageUrl = normalizeRoomMediaUrl(preset.custom.imageUrl, "image");
    const musicUrl = normalizeRoomMediaUrl(preset.custom.musicUrl, "audio");
    if (imageUrl) custom.ImageURL = imageUrl;
    else delete custom.ImageURL;
    if (musicUrl) custom.MusicURL = musicUrl;
    else delete custom.MusicURL;
    const imageFilter = cleanText(preset.custom.imageFilter, 120);
    if (imageFilter) custom.ImageFilter = imageFilter;
    else delete custom.ImageFilter;
    if (preset.custom.musicSync && musicUrl) {
      custom.MusicStart = typeof CurrentTime === "number" && Number.isFinite(CurrentTime)
        ? CurrentTime
        : Date.now();
    } else {
      delete custom.MusicStart;
    }
    room.Custom = custom;
    ServerSend("ChatRoomAdmin", {
      MemberNumber:
        typeof Player.ID === "number" && Number.isSafeInteger(Player.ID)
          ? Player.ID
          : Player.MemberNumber,
      Room: room,
      Action: "Update",
    });
  }

  getRoomSearchSpace(): BCRoomSearchSpace {
    let roomSpace: unknown;
    try {
      roomSpace = typeof ChatRoomData === "object" && ChatRoomData !== null
        ? ChatRoomData.Space
        : undefined;
    } catch {
      // Another addon's cross-realm wrapper can make one source unreadable; use the account fallback.
    }
    if (roomSpace === "" || roomSpace === "X" || roomSpace === "M") {
      return roomSpace;
    }
    try {
      const lastRoomSpace = typeof Player === "object" && Player !== null
        ? Player.LastChatRoom?.Space
        : undefined;
      return normalizeRoomSearchSpace(lastRoomSpace);
    } catch {
      return "";
    }
  }

  async searchRooms(
    query = "",
    space: BCRoomSearchSpace = this.getRoomSearchSpace(),
  ): Promise<BCLobbyRoom[]> {
    if (typeof ServerRoomSearch !== "function") {
      throw new Error("Bondage Club's room search is still loading");
    }
    const normalizedQuery = query.trim().slice(0, 40).toLocaleUpperCase();
    const request: BCServerRoomSearchRequest = {
      Query: normalizedQuery,
      Language: "",
      Space: normalizeRoomSearchSpace(space),
      Game: "",
      FullRooms: true,
      ShowLocked: true,
      SearchDescs: true,
    };
    try {
      const search = ServerRoomSearch as unknown as {
        (data: BCServerRoomSearchRequest): Promise<BCServerRoomSearchResult>;
        (query: string, data: BCServerRoomSearchRequest): Promise<BCServerRoomSearchResult>;
      };
      let response: BCServerRoomSearchResult;
      try {
        // Current BC accepts a query identity followed by the actual bounded request. Calling this
        // shape first also survives wrappers whose Function.length was erased by another addon.
        response = await search(normalizedQuery, request);
      } catch {
        // Compatibility with older clients that exposed only the request argument.
        response = await search(request);
      }
      if (
        response &&
        !Array.isArray(response) &&
        typeof response === "object" &&
        (response.err || response.error)
      ) {
        throw new Error("Room search returned an error");
      }
      const value = Array.isArray(response)
        ? response
        : response && typeof response === "object" && Array.isArray(response.value)
          ? response.value
          : [];
      return value
        .map((candidate) => normalizeLobbyRoom(candidate))
        .filter((candidate): candidate is BCLobbyRoom => candidate !== undefined)
        .sort((left, right) =>
          Number(right.friends.length > 0) - Number(left.friends.length > 0) ||
          right.friends.length - left.friends.length ||
          Number(right.canJoin) - Number(left.canJoin) ||
          left.name.localeCompare(right.name),
        );
    } catch (error) {
      this.#logger.warn("Room directory could not be read", error);
      throw new Error("Bondage Club could not refresh the room list");
    }
  }

  joinRoom(name: string): void {
    const roomName = cleanText(name, 80);
    if (!roomName) throw new Error("Choose a room first");
    if (typeof ServerSend !== "function") throw new Error("Bondage Club is still connecting");
    ServerSend("ChatRoomJoin", { Name: roomName });
  }

  runRoomMemberAction(memberNumber: number, action: BCRoomMemberAction): void {
    const snapshot = this.getRoomAdminSnapshot();
    if (!snapshot) throw new Error("Open a Bondage Club chat room first");
    if (!snapshot.isAdmin) throw new Error("Only a room administrator can manage players");
    if (!snapshot.players.some((player) => player.memberNumber === memberNumber)) {
      throw new Error("This player is no longer in the room");
    }
    if (memberNumber === this.getOwnMemberNumber()) throw new Error("Choose another player");
    if (typeof ServerSend !== "function") throw new Error("Bondage Club is still connecting");
    const nativeAction: Record<BCRoomMemberAction, string> = {
      kick: "Kick",
      promote: "Promote",
      demote: "Demote",
      whitelist: "Whitelist",
      unwhitelist: "Unwhitelist",
    };
    ServerSend("ChatRoomAdmin", {
      MemberNumber: memberNumber,
      Action: nativeAction[action],
      ...(action === "kick" ? { Publish: true } : {}),
    });
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

  #isRoomAdmin(admins: number[]): boolean {
    try {
      if (typeof ChatRoomPlayerIsAdmin === "function") return ChatRoomPlayerIsAdmin();
    } catch {
      // Fall back to the room's public admin list when a replaced native helper throws.
    }
    return admins.includes(this.getOwnMemberNumber());
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

    if (typeof Player === "object" && Player !== null && Array.isArray(Player.FriendList)) {
      for (const memberNumber of Player.FriendList) {
        if (!Number.isSafeInteger(memberNumber)) continue;
        contacts.set(memberNumber, this.getMemberName(memberNumber));
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
      .map((entry) => this.#normalizeBeepLogEntry(entry))
      .filter((event): event is BeepEvent => event !== null)
      .sort((left, right) => left.sentAt - right.sentAt);
  }

  #installCompatibilityHooks(): void {
    let modApi: ModSDKModAPI | undefined;
    try {
      modApi = currentModSdk().registerMod(
        {
          name: "KikiLink",
          fullName: "KikiLink",
          version: this.version,
        },
        { allowReplace: true },
      );
      this.#modApi = modApi;
    } catch (error) {
      this.#modApi = undefined;
      this.#logger.warn("ModSDK hooks unavailable; direct Bondage Club hooks remain active", error);
    }
    this.#compatibilityHooksInitialized = true;

    if (modApi) {
      this.#tryInstallHook("ServerAccountBeep", () =>
        modApi.hookFunction("ServerAccountBeep", 0, (args, next) => {
          this.#captureIncomingPayload(args[0]);
          return next(args);
        }),
      );
      if (typeof ServerAccountQueryResult === "function") {
        this.#tryInstallHook("ServerAccountQueryResult", () =>
          modApi.hookFunction("ServerAccountQueryResult", 0, (args, next) => {
            this.#captureOnlineFriends(args[0]);
            return next(args);
          }),
        );
      }
      if (typeof FriendListLoadFriendList === "function") {
        this.#tryInstallHook("FriendListLoadFriendList", () =>
          modApi.hookFunction("FriendListLoadFriendList", 0, (args, next) => {
            this.#captureOnlineFriends(args[0]);
            return next(args);
          }),
        );
      }
    }

    // LianChat and similar messenger addons bypass ServerSendBeepMessage and publish AccountBeep
    // directly through ServerSend. Listening at that shared transport boundary captures native and
    // addon-originated messages without interpreting their private UI implementations.
    this.#ensureOutgoingBeepHooks();

    this.#ensureActivityHooks();
    if (this.#activityHookRetryTimer === undefined) {
      this.#activityHookRetryTimer = setInterval(
        () => this.#ensureActivityHooks(),
        ACTIVITY_HOOK_RETRY_MS,
      );
    }
    this.#ensureCharacterOverlayHook();
    if (this.#characterOverlayHookRetryTimer === undefined) {
      this.#characterOverlayHookRetryTimer = setInterval(
        () => this.#ensureCharacterOverlayHook(),
        CHARACTER_OVERLAY_HOOK_RETRY_MS,
      );
    }
  }

  #ensureOutgoingBeepHooks(): void {
    if (!this.#compatibilityHooksInitialized) return;
    const name = "ServerSend";
    const existing = this.#resilientHooks.get(name);
    if (this.#installedOutgoingHooks.has(name)) {
      if (!this.#modApi && existing) this.#ensureDirectHook(name, existing);
      return;
    }
    if (typeof ServerSend !== "function") return;

    const hook: ResilientHook = (args, next) => {
      const result = next(args);
      if (!this.#sendingViaKikiLink) this.#captureOutgoingServerPacket(args[0], args[1]);
      return result;
    };
    if (this.#installIntegrationHook(name, 0, hook)) {
      this.#installedOutgoingHooks.add(name);
    }
  }

  #ensureCharacterOverlayHook(): void {
    if (!this.#compatibilityHooksInitialized) return;
    const name = CHARACTER_OVERLAY_HOOK_NAME;
    const existing = this.#resilientHooks.get(name);
    if (this.#characterOverlayHookNames.has(name)) {
      // A direct wrapper is used only when ModSDK registration is completely unavailable. Keep
      // that fallback healthy if BC loads or replaces the native function after login.
      if (!this.#modApi && existing) this.#ensureDirectHook(name, existing);
      return;
    }
    if (typeof ChatRoomDrawCharacterStatusIcons !== "function") return;

    // Echo Activities uses this exact native status-icon entrypoint. Joining the shared ModSDK
    // chain avoids placing an untracked wrapper around BCX, WCE, Echo, or AFC functions.
    const hook: ResilientHook = (args, next) => {
      const result = next(args);
      this.#renderCharacterOverlays(args[0], args[1], args[2], args[3]);
      return result;
    };
    if (this.#installIntegrationHook(name, 10, hook)) {
      this.#characterOverlayHookNames.add(name);
    }
  }

  #ensureActivityHooks(): void {
    if (!this.#compatibilityHooksInitialized) return;
    this.#ensureRoomMessageHook();
    if (!this.#modApi) {
      for (const name of this.#installedActivityHooks) {
        const hook = this.#resilientHooks.get(name);
        if (hook) this.#ensureDirectHook(name, hook);
      }
    }
    if (this.#installedActivityHooks.size === CUSTOM_ACTIVITY_HOOK_COUNT) return;

    const allowedHook: ResilientHook = (args, next) => {
      const activities = next(args);
      if (!Array.isArray(activities)) return activities;
      return this.#extendAllowedActivities(args[0], args[1], activities);
    };
    this.#tryInstallActivityHook(
      "ActivityAllowedForGroup",
      typeof ActivityAllowedForGroup === "function",
      10,
      allowedHook,
    );

    const dialogBuildHook: ResilientHook = (args, next) => {
      const result = next(args);
      if (!Array.isArray(DialogActivity)) return result;
      const character = args[0];
      const groupName = character?.FocusGroup?.Name;
      if (typeof groupName !== "string") return result;
      const extended = this.#extendAllowedActivities(character, groupName, DialogActivity);
      if (extended === DialogActivity) return result;
      DialogActivity = extended;
      if ((args[1] ?? true) && DialogMenuMode === "activities") {
        try {
          const reload = DialogMenuMapping?.activities?.Reload;
          if (typeof reload === "function") {
            const pending = reload.call(DialogMenuMapping.activities, null, {
              reset: true,
              resetDialogItems: false,
            });
            if (pending && typeof pending.catch === "function") {
              void pending.catch((error: unknown) =>
                this.#logger.warn("Native custom activity grid refresh failed", error),
              );
            }
          }
        } catch (error) {
          this.#logger.warn("Native custom activity grid refresh failed", error);
        }
      }
      return result;
    };
    this.#tryInstallActivityHook(
      "DialogBuildActivities",
      typeof DialogBuildActivities === "function",
      -10,
      dialogBuildHook,
    );

    const dictionaryHook: ResilientHook = (args, next) => {
      const keyword = typeof args[0] === "string" ? args[0] : "";
      for (const integration of [...this.#customActivityIntegrations]) {
        const resolved = this.#callActivityIntegration(integration, () =>
          integration.resolveText(keyword),
        );
        if (resolved !== undefined) return resolved;
      }
      return next(args);
    };
    this.#tryInstallActivityHook(
      "ActivityDictionaryText",
      typeof ActivityDictionaryText === "function",
      10,
      dictionaryHook,
    );

    const runHook: ResilientHook = (args, next) => {
      for (const integration of [...this.#customActivityIntegrations]) {
        const handled = this.#callActivityIntegration(integration, () =>
          integration.run(args[0], args[1], args[2], args[3]),
        );
        if (handled) return undefined;
      }
      return next(args);
    };
    this.#tryInstallActivityHook(
      "ActivityRun",
      typeof ActivityRun === "function",
      10,
      runHook,
    );

    const activityButtonHook: ResilientHook = (args, next) => {
      const itemActivity = args[1];
      const activityName = itemActivity?.Activity?.Name;
      if (typeof activityName === "string") {
        for (const integration of [...this.#customActivityIntegrations]) {
          const image = this.#callActivityIntegration(integration, () =>
            integration.resolveImage(activityName),
          );
          if (image !== undefined) {
            args[4] = { ...(args[4] ?? {}), image };
            break;
          }
        }
      }
      const button = next(args);
      for (const integration of [...this.#customActivityIntegrations]) {
        this.#callActivityIntegration(integration, () => {
          integration.decorateButton(button, itemActivity);
        });
      }
      return button;
    };
    this.#tryInstallActivityHook(
      "ElementButton.CreateForActivity",
      typeof ElementButton === "object" &&
        ElementButton !== null &&
        typeof ElementButton.CreateForActivity === "function",
      10,
      activityButtonHook,
    );

    const preferenceHook: ResilientHook = (args, next) => {
      const activityName = typeof args[1] === "string" ? args[1] : "";
      for (const integration of [...this.#customActivityIntegrations]) {
        const custom = this.#callActivityIntegration(
          integration,
          () => integration.isCustomActivity?.(activityName) ?? false,
        );
        if (custom) return 2;
      }
      return next(args);
    };
    this.#tryInstallActivityHook(
      "PreferenceGetActivityFactor",
      typeof PreferenceGetActivityFactor === "function",
      10,
      preferenceHook,
    );

    // BC initializes some menu functions lazily. The timer retries only the entrypoints that did
    // not exist yet; hooks already registered in ModSDK stay inside its shared router.
  }

  #tryInstallActivityHook(
    name: string,
    available: boolean,
    priority: number,
    hook: ResilientHook,
  ): void {
    if (!available || this.#installedActivityHooks.has(name)) return;
    if (this.#installIntegrationHook(name, priority, hook)) {
      this.#installedActivityHooks.add(name);
    }
  }

  #ensureRoomMessageHook(): void {
    const name = "ChatRoomMessage";
    if (this.#roomMessageHookInstalled) {
      if (!this.#modApi) {
        const existing = this.#resilientHooks.get(name);
        if (existing) this.#ensureDirectHook(name, existing);
      }
      return;
    }
    if (typeof ChatRoomMessage !== "function") return;
    const hook: ResilientHook = (args, next) => {
      this.#captureRoomProtocolPayload(args[0]);
      this.#notifyCustomActivityMessage(args[0]);
      return next(args);
    };
    if (this.#installIntegrationHook(name, 0, hook)) {
      this.#roomMessageHookInstalled = true;
    }
  }

  #renderCharacterOverlays(
    character: BCCharacter,
    characterX: number,
    characterY: number,
    zoom: number,
  ): void {
    const signature = `${character?.MemberNumber ?? "?"}:${characterX}:${characterY}:${zoom}`;
    if (this.#overlayRenderSignatures.has(signature)) return;
    this.#overlayRenderSignatures.add(signature);
    if (!this.#overlayRenderResetQueued) {
      this.#overlayRenderResetQueued = true;
      queueMicrotask(() => {
        this.#overlayRenderSignatures.clear();
        this.#overlayRenderResetQueued = false;
      });
    }
    for (const renderer of [...this.#characterOverlayRenderers]) {
      try {
        renderer(character, characterX, characterY, zoom);
      } catch (error) {
        this.#logger.warn("Character overlay renderer failed for this frame", error);
      }
    }
  }

  #extendAllowedActivities(
    character: BCCharacter,
    groupName: string,
    activities: BCItemActivity[],
  ): BCItemActivity[] {
    let extended = activities;
    for (const integration of [...this.#customActivityIntegrations]) {
      const candidate = this.#callActivityIntegration(integration, () =>
        integration.extendAllowedActivities?.(character, groupName, extended),
      );
      if (Array.isArray(candidate)) extended = candidate;
    }
    return extended;
  }

  #notifyCustomActivityMessage(message: BCChatRoomMessage): void {
    for (const integration of [...this.#customActivityIntegrations]) {
      this.#callActivityIntegration(integration, () => integration.onRoomMessage(message));
    }
  }

  #callActivityIntegration<T>(
    integration: BCCustomActivityIntegration,
    call: () => T,
  ): T | undefined {
    try {
      return call();
    } catch (error) {
      // A menu/canvas can be replaced while BC is drawing it. One transient failure must not
      // permanently remove every custom activity until the entire userscript is reloaded.
      this.#logger.warn(
        `${integration.constructor.name || "Custom activity integration"} failed for this call`,
        error,
      );
      return undefined;
    }
  }

  #installIntegrationHook(name: string, priority: number, hook: ResilientHook): boolean {
    this.#resilientHooks.set(name, hook);
    const installed = this.#modApi
      ? this.#tryInstallHook(name, () =>
          this.#modApi!.hookFunction(name, priority, hook as never),
        )
      : this.#ensureDirectHook(name, hook);
    if (!installed) this.#resilientHooks.delete(name);
    return installed;
  }

  #tryInstallHook(
    name: string,
    install: () => () => void,
  ): boolean {
    try {
      const sdkUnhook = install();
      this.#unhooks.push(sdkUnhook);
      return true;
    } catch (error) {
      this.#logger.warn(`${name} hook unavailable; retrying after native load`, error);
      return false;
    }
  }

  #ensureDirectHook(name: string, hook: ResilientHook): boolean {
    const existing = this.#directHookRegistrations.get(name);
    if (existing?.isCurrent()) return true;
    const registration = this.#installDirectHook(name, hook);
    if (!registration) return false;
    this.#directHookRegistrations.set(name, registration);
    this.#unhooks.push(registration.unhook);
    this.#logger.info(`${name} live hook installed`);
    return true;
  }

  #installDirectHook(name: string, hook: ResilientHook): DirectHookRegistration | undefined {
    const path = name.split(".");
    let context: Record<string, any> = window as unknown as Record<string, any>;
    for (const key of path.slice(0, -1)) {
      const next = context[key];
      if (!next || (typeof next !== "object" && typeof next !== "function")) return undefined;
      context = next as Record<string, any>;
    }
    const property = path.at(-1);
    if (!property) return undefined;
    const original = context[property];
    if (typeof original !== "function") return undefined;

    const adapter = this;
    const wrapper = function (this: unknown, ...args: any[]): any {
      if (adapter.#stopped) return original.apply(this, args);
      return hook(args, (nextArgs) => original.apply(this, nextArgs));
    };
    context[property] = wrapper;
    return {
      isCurrent: () => context[property] === wrapper,
      unhook: () => {
        if (context[property] === wrapper) context[property] = original;
      },
    };
  }

  #attachSocketListeners(): void {
    const socket =
      typeof ServerSocket === "object" && ServerSocket !== null ? ServerSocket : undefined;
    if (socket === this.#socket) return;
    this.#detachSocketListeners();
    if (!socket || typeof socket.on !== "function") return;
    this.#socket = socket;
    try {
      socket.on("AccountBeep", this.#socketBeepListener);
      socket.on("AccountQueryResult", this.#socketQueryListener);
      socket.on("ChatRoomMessage", this.#socketRoomMessageListener);
      if (this.#ready) this.refreshOnlineFriends();
    } catch (error) {
      this.#detachSocketListeners();
      this.#logger.warn("Direct Bondage Club socket listeners unavailable", error);
    }
  }

  #detachSocketListeners(): void {
    const socket = this.#socket;
    this.#socket = undefined;
    if (!socket) return;
    if (typeof socket.off === "function") {
      socket.off("AccountBeep", this.#socketBeepListener);
      socket.off("AccountQueryResult", this.#socketQueryListener);
      socket.off("ChatRoomMessage", this.#socketRoomMessageListener);
      return;
    }
    socket.removeListener?.("AccountBeep", this.#socketBeepListener);
    socket.removeListener?.("AccountQueryResult", this.#socketQueryListener);
    socket.removeListener?.("ChatRoomMessage", this.#socketRoomMessageListener);
  }

  #captureOutgoingServerPacket(messageType: unknown, payload: unknown): void {
    if (messageType !== "AccountBeep" || !payload || typeof payload !== "object") return;
    try {
      const data = payload as {
        MemberNumber?: unknown;
        BeepType?: unknown;
        IsSecret?: unknown;
        Message?: unknown;
      };
      if (data.BeepType != null && data.BeepType !== "") return;
      if (!Number.isSafeInteger(data.MemberNumber) || (data.MemberNumber as number) < 0) return;
      const event = this.#normalizeOutgoing(
        data.MemberNumber as number,
        typeof data.Message === "string" ? data.Message : undefined,
        { includeRoom: data.IsSecret === false },
      );
      if (event) this.#captureOutgoing(event, "transport");
    } catch (error) {
      // Firefox can expose objects owned by another addon through a guarded compartment. A single
      // inaccessible packet must not interrupt ServerSend or any other messenger's hook chain.
      this.#logger.warn("Outgoing AccountBeep metadata was not readable", error);
    }
  }

  #captureRoomProtocolPayload(data: BCChatRoomMessage): void {
    if (!data || typeof data !== "object") return;
    try {
      if (this.#seenRoomProtocolPayloads.has(data)) return;
      this.#seenRoomProtocolPayloads.add(data);
      const protocol = this.#normalizeRoomProtocol(data);
      if (protocol) this.bus.emit("bc:protocol", protocol);
    } catch (error) {
      this.#logger.warn("Hidden KikiLink room packet was not readable", error);
    }
  }

  #captureIncomingPayload(data: BCServerAccountBeepResponse): void {
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    if (this.#seenIncomingPayloads.has(data)) return;
    this.#seenIncomingPayloads.add(data);

    const protocol = this.#normalizeBeepProtocol(data);
    if (protocol) this.bus.emit("bc:protocol", protocol);
    const event = this.#normalizeIncoming(data);
    if (!event) return;
    this.#rememberIncoming(event);
    this.bus.emit("beep:received", event);
  }

  #initializeBeepLogCursor(): void {
    this.#beepLogCursor =
      typeof FriendListBeepLog !== "undefined" && Array.isArray(FriendListBeepLog)
        ? FriendListBeepLog.length
        : 0;
  }

  #captureNewBeepLogEntries(): void {
    if (typeof FriendListBeepLog === "undefined" || !Array.isArray(FriendListBeepLog)) return;
    if (FriendListBeepLog.length < this.#beepLogCursor) this.#beepLogCursor = 0;
    const entries = FriendListBeepLog.slice(this.#beepLogCursor);
    this.#beepLogCursor = FriendListBeepLog.length;
    for (const entry of entries) {
      const event = this.#normalizeBeepLogEntry(entry);
      if (!event) continue;
      if (entry.Sent) {
        this.#captureOutgoing(event, "log");
      } else if (!this.#consumeRememberedIncoming(event)) {
        this.bus.emit("beep:received", event);
      }
    }
    this.#pruneRememberedIncoming();
    this.#pruneRememberedOutgoing();
  }

  #normalizeBeepLogEntry(entry: BCFriendListBeepLogMessage): BeepEvent | null {
    if (!entry || !Number.isSafeInteger(entry.MemberNumber)) return null;
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
      content: cleanBeepMessageContent(entry.Message),
      sentAt,
      includeRoom: roomName !== undefined,
      ...(roomName !== undefined ? { roomName } : {}),
    };
  }

  #rememberIncoming(event: BeepEvent): void {
    this.#recentIncoming.push({
      fingerprint: incomingFingerprint(event),
      capturedAt: event.sentAt,
    });
    this.#pruneRememberedIncoming();
  }

  #consumeRememberedIncoming(event: BeepEvent): boolean {
    const fingerprint = incomingFingerprint(event);
    const index = this.#recentIncoming.findIndex(
      (candidate) =>
        candidate.fingerprint === fingerprint &&
        Math.abs(candidate.capturedAt - event.sentAt) <= RECENT_INCOMING_TTL_MS,
    );
    if (index < 0) return false;
    this.#recentIncoming.splice(index, 1);
    return true;
  }

  #pruneRememberedIncoming(now = Date.now()): void {
    while (this.#recentIncoming.length > 0) {
      const first = this.#recentIncoming[0];
      if (!first || now - first.capturedAt <= RECENT_INCOMING_TTL_MS) break;
      this.#recentIncoming.shift();
    }
  }

  #captureOutgoing(event: BeepEvent, source: RecentOutgoing["source"]): void {
    this.#pruneRememberedOutgoing();
    const fingerprint = outgoingFingerprint(event);
    if (
      this.#recentOutgoing.some(
        (candidate) =>
          candidate.source !== source &&
          candidate.fingerprint === fingerprint &&
          Math.abs(candidate.sentAt - event.sentAt) <= OUTGOING_DEDUPE_WINDOW_MS,
      )
    ) {
      return;
    }
    this.#rememberOutgoing(event, source);
    this.bus.emit("beep:sent", event);
  }

  #rememberOutgoing(event: BeepEvent, source: RecentOutgoing["source"]): void {
    this.#recentOutgoing.push({
      fingerprint: outgoingFingerprint(event),
      sentAt: event.sentAt,
      capturedAt: Date.now(),
      source,
    });
    this.#pruneRememberedOutgoing();
  }

  #pruneRememberedOutgoing(now = Date.now()): void {
    while (this.#recentOutgoing.length > 0) {
      const first = this.#recentOutgoing[0];
      if (!first || now - first.capturedAt <= RECENT_OUTGOING_TTL_MS) break;
      this.#recentOutgoing.shift();
    }
  }

  #normalizeIncoming(data: BCServerAccountBeepResponse): BeepEvent | null {
    if (!data || (data.BeepType != null && data.BeepType !== "")) return null;
    if (!Number.isSafeInteger(data.MemberNumber) || typeof data.MemberName !== "string") return null;

    const roomName = typeof data.ChatRoomName === "string" ? data.ChatRoomName : undefined;
    return {
      direction: "incoming",
      peerNumber: data.MemberNumber,
      peerName: this.getMemberNickname(data.MemberNumber) ?? data.MemberName,
      content: cleanBeepMessageContent(data.Message),
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

  #captureOnlineFriends(data: BCAccountQueryResponse | BCOnlineFriendInfo[]): void {
    const result = Array.isArray(data)
      ? data
      : data && data.Query === "OnlineFriends" && Array.isArray(data.Result)
        ? data.Result
        : undefined;
    if (!result) return;
    const friends = result
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

    const signature = friends
      .map((friend) =>
        [
          friend.memberNumber,
          friend.memberName,
          friend.roomName ?? "",
          friend.roomSpace ?? "",
          friend.privateRoom ? 1 : 0,
        ].join("\u001f"),
      )
      .sort()
      .join("\u001e");

    this.#onlineFriends.clear();
    for (const friend of friends) this.#onlineFriends.set(friend.memberNumber, friend);
    this.#hasOnlineFriendSnapshot = true;
    if (signature === this.#onlineFriendSignature) return;
    this.#onlineFriendSignature = signature;
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
      content: cleanBeepMessageContent(message),
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

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/gu, " ").trim().slice(0, maxLength)
    : "";
}

function boundedInteger(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function cleanStringArray(value: unknown, limit: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const result = new Set<string>();
  for (const candidate of value) {
    const text = cleanText(candidate, maxLength);
    if (text) result.add(text);
    if (result.size >= limit) break;
  }
  return [...result];
}

function cleanMemberNumberArray(value: unknown, limit: number): number[] {
  if (!Array.isArray(value)) return [];
  const result = new Set<number>();
  for (const candidate of value) {
    if (typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0) {
      result.add(candidate);
    }
    if (result.size >= limit) break;
  }
  return [...result];
}

function normalizeLobbyRoom(value: BCServerRoomSearchData): BCLobbyRoom | undefined {
  try {
    if (!value || typeof value !== "object") return undefined;
    const name = cleanText(value.Name, 80);
    if (!name) return undefined;
    const friends: BCLobbyFriend[] = [];
    const friendIds = new Set<number>();
    if (Array.isArray(value.Friends)) {
      for (const friend of value.Friends.slice(0, 12)) {
        if (!friend || typeof friend !== "object") continue;
        const memberNumber = friend.MemberNumber;
        if (!Number.isSafeInteger(memberNumber) || memberNumber < 0 || friendIds.has(memberNumber)) {
          continue;
        }
        friends.push({
          memberNumber,
          memberName:
            cleanText(friend.MemberNickname, 80) ||
            cleanText(friend.MemberName, 80) ||
            `Member ${memberNumber}`,
        });
        friendIds.add(memberNumber);
      }
    }
    const visibility = cleanStringArray(value.Visibility, 8, 30);
    const access = cleanStringArray(value.Access, 8, 30);
    return {
      name,
      ...(cleanText(value.Creator, 80) ? { creator: cleanText(value.Creator, 80) } : {}),
      description: cleanText(value.Description, 200),
      language: cleanText(value.Language, 12),
      memberCount: boundedInteger(value.MemberCount, 0, 100, 0),
      memberLimit: boundedInteger(value.MemberLimit, 1, 100, 10),
      canJoin: value.CanJoin === true,
      locked: value.Locked === true || (access.length > 0 && !access.includes("All")),
      privateRoom: value.Private === true || (visibility.length > 0 && !visibility.includes("All")),
      mapType: cleanText(value.MapType, 40),
      friends,
    };
  } catch {
    // Firefox can deny reads from objects created in another userscript compartment.
    return undefined;
  }
}

function normalizeRoomSearchSpace(value: unknown): BCRoomSearchSpace {
  return value === "X" || value === "M" ? value : "";
}

function normalizeRoomMediaUrl(value: string, kind: "image" | "audio"): string | undefined {
  const candidate = value.trim();
  if (!candidate) return undefined;
  if (candidate.length > 250) throw new Error("Room media links can be at most 250 characters");
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid HTTPS room media link");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Room media must use a public HTTPS link");
  }
  const extension = url.pathname.toLocaleLowerCase();
  const supported =
    kind === "image"
      ? /\.(?:jpe?g|png|webp)$/u.test(extension)
      : /\.(?:mp3|mp4)$/u.test(extension);
  if (!supported) {
    throw new Error(
      kind === "image"
        ? "Room backgrounds must be JPG, PNG, or WebP files"
        : "Bondage Club room music links must end in .mp3 or .mp4",
    );
  }
  return url.href;
}

function incomingFingerprint(event: BeepEvent): string {
  return [event.peerNumber, event.content, event.roomName ?? ""].join("\u001f");
}

function outgoingFingerprint(event: BeepEvent): string {
  return [event.peerNumber, event.content, event.includeRoom ? 1 : 0].join("\u001f");
}

function isBondageClubReady(): boolean {
  return (
    typeof document !== "undefined" &&
    document.body !== null &&
    typeof Player === "object" &&
    Player !== null &&
    Number.isSafeInteger(Player.MemberNumber) &&
    Player.MemberNumber > 0 &&
    typeof ServerSendBeepMessage === "function"
  );
}

function currentModSdk(): ModSDKGlobalAPI {
  const sdk = (window as typeof window & { bcModSdk?: ModSDKGlobalAPI }).bcModSdk;
  if (!sdk || typeof sdk.registerMod !== "function") {
    throw new Error("Bondage Club ModSDK is unavailable");
  }
  return sdk;
}
