import bcModSDK, { type ModSDKModAPI } from "bondage-club-mod-sdk";
import { Logger } from "../core/logger";
import type { BeepEvent, KikiLinkEvents } from "../core/types";
import type { EventBus } from "../core/event-bus";

const READY_POLL_MS = 400;

export class BCAdapter {
  readonly #logger = new Logger("bc");
  readonly #unhooks: Array<() => void> = [];
  #modApi: ModSDKModAPI | undefined;
  #stopped = false;
  #ready = false;

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

  sendBeep(target: number, content: string, includeRoom: boolean): void {
    if (!Number.isSafeInteger(target) || target < 0) {
      throw new Error("A valid non-negative member number is required");
    }

    const message = content.trim();
    if (!message) throw new Error("A Beep message cannot be empty");
    if (message.length > 1000) throw new Error("A Beep message cannot exceed 1000 characters");
    if (!this.#ready || typeof ServerSendBeepMessage !== "function") {
      throw new Error("KikiLink is still connecting to Bondage Club");
    }

    ServerSendBeepMessage(target, message, { includeRoom });
  }

  getMemberName(memberNumber: number): string {
    if (typeof Player !== "object" || Player === null) return `Member ${memberNumber}`;
    return Player.FriendNames?.get(memberNumber) ?? `Member ${memberNumber}`;
  }

  getOwnMemberNumber(): number {
    if (typeof Player !== "object" || Player === null) return -1;
    return Number.isSafeInteger(Player.MemberNumber) ? Player.MemberNumber : -1;
  }

  getOwnName(): string {
    if (typeof Player !== "object" || Player === null) return "me";
    return typeof Player.Name === "string" && Player.Name.trim() ? Player.Name : "me";
  }

  getKnownContacts(): Array<{ memberNumber: number; memberName: string }> {
    if (typeof Player !== "object" || Player === null || !(Player.FriendNames instanceof Map)) {
      return [];
    }

    return [...Player.FriendNames.entries()]
      .filter(([memberNumber, memberName]) =>
        Number.isSafeInteger(memberNumber) && typeof memberName === "string" && memberName.trim(),
      )
      .map(([memberNumber, memberName]) => ({ memberNumber, memberName }))
      .sort((left, right) => left.memberName.localeCompare(right.memberName));
  }

  #normalizeIncoming(data: BCServerAccountBeepResponse): BeepEvent | null {
    if (!data || (data.BeepType !== undefined && data.BeepType !== "")) return null;
    if (!Number.isSafeInteger(data.MemberNumber) || typeof data.MemberName !== "string") return null;

    const roomName = typeof data.ChatRoomName === "string" ? data.ChatRoomName : undefined;
    return {
      direction: "incoming",
      peerNumber: data.MemberNumber,
      peerName: data.MemberName,
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
