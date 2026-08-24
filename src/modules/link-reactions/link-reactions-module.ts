import { Logger } from "../../core/logger";
import type {
  KikiLinkContext,
  KikiLinkModule,
  KikiLinkSettings,
  LinkReactionEvent,
  OnlineFriend,
  RoomCharacter,
} from "../../core/types";
import { LinkReactionsService } from "./link-reactions-service";

const ROOM_POLL_MS = 2_000;

export class LinkReactionsModule implements KikiLinkModule {
  readonly id = "link-reactions";
  readonly #logger = new Logger("link-reactions");
  readonly #unsubscribers: Array<() => void> = [];
  readonly #roomMembers = new Map<number, RoomCharacter>();
  #context: KikiLinkContext | undefined;
  #service: LinkReactionsService | undefined;
  #roomTimer: ReturnType<typeof setInterval> | undefined;
  #roomName: string | undefined;
  #onlineMembers: Set<number> | undefined;

  isEnabled(_settings: KikiLinkSettings): boolean {
    return true;
  }

  start(context: KikiLinkContext): void {
    this.#context = context;
    this.#service = new LinkReactionsService(context.adapter, context.settings);
    this.#unsubscribers.push(
      context.bus.on("bc:ready", () => this.#resetBaselines()),
      context.bus.on("beep:received", (event) => {
        this.#run({
          trigger: "beep-received",
          memberNumber: event.peerNumber,
          memberName: event.peerName,
          isFriend: context.adapter.isKnownFriend(event.peerNumber),
          occurredAt: event.sentAt,
          content: event.content,
          ...(event.roomName ? { roomName: event.roomName } : {}),
        });
      }),
      context.bus.on("bc:online-friends", ({ friends, receivedAt }) =>
        this.#syncOnlineFriends(friends, receivedAt),
      ),
    );
    this.#syncRoom();
    this.#roomTimer = setInterval(() => this.#syncRoom(), ROOM_POLL_MS);
  }

  stop(): void {
    if (this.#roomTimer !== undefined) clearInterval(this.#roomTimer);
    this.#roomTimer = undefined;
    for (const unsubscribe of this.#unsubscribers.splice(0).reverse()) unsubscribe();
    this.#roomMembers.clear();
    this.#roomName = undefined;
    this.#onlineMembers = undefined;
    this.#service = undefined;
    this.#context = undefined;
  }

  #resetBaselines(): void {
    this.#roomMembers.clear();
    this.#roomName = undefined;
    this.#onlineMembers = undefined;
    this.#syncRoom();
  }

  #syncRoom(): void {
    const context = this.#context;
    if (!context) return;
    if (!context.adapter.isInChatRoom()) {
      this.#roomMembers.clear();
      this.#roomName = undefined;
      return;
    }

    const roomName = context.adapter.getCurrentRoomName() ?? "Unnamed room";
    const current = new Map(
      context.adapter
        .getRoomCharacters()
        .map((character) => [character.memberNumber, character] as const),
    );
    if (this.#roomName !== roomName) {
      this.#roomName = roomName;
      this.#replaceRoomMembers(current);
      return;
    }

    const joined = [...current.values()].filter(
      (character) => !this.#roomMembers.has(character.memberNumber),
    );
    const left = [...this.#roomMembers.values()].filter(
      (character) => !current.has(character.memberNumber),
    );
    this.#replaceRoomMembers(current);
    const occurredAt = Date.now();
    for (const character of joined) {
      this.#run(roomEvent("room-join", character, roomName, occurredAt));
    }
    for (const character of left) {
      this.#run(roomEvent("room-leave", character, roomName, occurredAt));
    }
  }

  #replaceRoomMembers(current: Map<number, RoomCharacter>): void {
    this.#roomMembers.clear();
    for (const [memberNumber, character] of current) {
      this.#roomMembers.set(memberNumber, character);
    }
  }

  #syncOnlineFriends(friends: OnlineFriend[], occurredAt: number): void {
    const current = new Set(friends.map((friend) => friend.memberNumber));
    const previous = this.#onlineMembers;
    this.#onlineMembers = current;
    if (!previous) return;

    for (const friend of friends) {
      if (previous.has(friend.memberNumber)) continue;
      this.#run({
        trigger: "friend-online",
        memberNumber: friend.memberNumber,
        memberName: friend.memberName,
        isFriend: true,
        occurredAt,
        ...(friend.roomName ? { roomName: friend.roomName } : {}),
      });
    }
  }

  #run(event: LinkReactionEvent): void {
    const context = this.#context;
    const service = this.#service;
    if (!context || !service) return;
    try {
      const fired = service.react(event);
      if (fired) context.bus.emit("link-reactions:fired", fired);
    } catch (error) {
      this.#logger.error("Failed to run a reaction rule", error);
    }
  }
}

function roomEvent(
  trigger: "room-join" | "room-leave",
  character: RoomCharacter,
  roomName: string,
  occurredAt: number,
): LinkReactionEvent {
  return {
    trigger,
    memberNumber: character.memberNumber,
    memberName: character.memberName,
    isFriend: character.isFriend === true,
    roomName,
    occurredAt,
  };
}
