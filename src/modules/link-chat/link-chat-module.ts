import type { BeepEvent, KikiLinkContext, KikiLinkModule, KikiLinkSettings } from "../../core/types";
import { Logger } from "../../core/logger";
import { ChatService } from "./chat-service";
import { LinkChatView } from "./view";
import { LinkActivitiesService } from "../link-activities/link-activities-service";
import { LinkRosterService } from "../link-roster/link-roster-service";
import { PeopleRepository } from "../../storage/people-repository";
import { LinkPresenceService } from "../link-presence/link-presence-service";
import { RoomBlossomBadge } from "./blossom";

export class LinkChatModule implements KikiLinkModule {
  readonly id = "link-chat";
  readonly #logger = new Logger("link-chat");
  readonly #unsubscribers: Array<() => void> = [];
  #context: KikiLinkContext | undefined;
  #service: ChatService | undefined;
  #roster: LinkRosterService | undefined;
  #presence: LinkPresenceService | undefined;
  #roomBadge: RoomBlossomBadge | undefined;
  #roomBadgeUnsubscribe: (() => void) | undefined;
  #view: LinkChatView | undefined;
  #rosterTimer: ReturnType<typeof setInterval> | undefined;

  isEnabled(settings: KikiLinkSettings): boolean {
    return settings.linkChat.enabled;
  }

  start(context: KikiLinkContext): void {
    this.#context = context;
    this.#service = new ChatService(context.repository, context.settings);
    const activities = new LinkActivitiesService(context.adapter);
    this.#roster = new LinkRosterService(
      context.adapter,
      new PeopleRepository(),
      context.settings,
    );
    this.#presence = new LinkPresenceService(
      context.adapter,
      context.settings,
      context.bus,
      context.version,
    );
    this.#presence.start();
    this.#roomBadge = new RoomBlossomBadge(context.adapter, this.#presence);
    this.#roomBadgeUnsubscribe = context.adapter.registerCharacterOverlay(
      (character, characterX, characterY, zoom) =>
        this.#roomBadge?.draw(character, characterX, characterY, zoom),
    );
    this.#roster.prune();
    this.#view = new LinkChatView(
      context.adapter,
      this.#service,
      context.settings,
      context.version,
      activities,
      this.#roster,
      this.#presence,
    );
    this.#view.mount();

    this.#unsubscribers.push(
      context.bus.on("bc:status", ({ state, message }) =>
        this.#view?.setConnectionState(state, message),
      ),
      context.bus.on("bc:ready", () => {
        void this.#importRecentBeeps();
        this.#syncRoster();
      }),
      context.bus.on("beep:received", (event) => void this.#capture(event)),
      context.bus.on("beep:sent", (event) => void this.#capture(event)),
      context.bus.on("link-reactions:notification", (event) =>
        this.#view?.onNotification(event),
      ),
      context.bus.on("link-reactions:fired", (event) => this.#view?.onReaction(event)),
    );
    this.#view.setConnectionState(context.adapter.isReady() ? "ready" : "connecting");
    void this.#service.prune();
    this.#syncRoster();
    this.#rosterTimer = setInterval(() => this.#syncRoster(), 2_000);
  }

  stop(): void {
    if (this.#rosterTimer !== undefined) clearInterval(this.#rosterTimer);
    this.#rosterTimer = undefined;
    for (const unsubscribe of this.#unsubscribers.splice(0).reverse()) unsubscribe();
    this.#view?.destroy();
    this.#view = undefined;
    this.#roomBadgeUnsubscribe?.();
    this.#roomBadgeUnsubscribe = undefined;
    this.#roomBadge = undefined;
    this.#presence?.stop();
    this.#presence = undefined;
    this.#service = undefined;
    this.#roster = undefined;
    this.#context = undefined;
  }

  open(): void {
    void this.#view?.open();
  }

  close(): void {
    this.#view?.close();
  }

  openChat(memberNumber: number, memberName?: string): void {
    void this.#view?.openChat(memberNumber, memberName);
  }

  openRoster(): void {
    this.#view?.openRoster();
  }

  openActivities(): void {
    this.#view?.openActivities();
  }

  async #capture(event: BeepEvent): Promise<void> {
    if (!this.#service || !this.#view || !this.#context) return;
    try {
      if (this.#context.settings.get().linkRoster.enabled) {
        this.#roster?.observePerson(event.peerNumber, event.peerName, event.sentAt);
      }
      const active = this.#view.isActiveConversation(event.peerNumber);
      const message = await this.#service.capture(event, active);
      await this.#view.onMessage(event.peerNumber, event.direction === "incoming", message);
      this.#context.bus.emit("link-chat:updated", { peerNumber: event.peerNumber });
    } catch (error) {
      this.#logger.error("Failed to capture a Beep", error);
    }
  }

  #syncRoster(): void {
    if (!this.#roster || !this.#view || !this.#context) return;
    if (!this.#context.settings.get().linkRoster.enabled) {
      this.#view.onRosterSync({ changed: false, presentCount: 0, joined: [], left: [] });
      return;
    }
    try {
      this.#view.onRosterSync(this.#roster.sync());
    } catch (error) {
      this.#logger.error("Failed to synchronize LinkRoster", error);
    }
  }

  async #importRecentBeeps(): Promise<void> {
    if (!this.#service || !this.#view || !this.#context) return;
    try {
      for (const event of this.#context.adapter.getRecentBeeps()) {
        if (this.#context.settings.get().linkRoster.enabled) {
          this.#roster?.observePerson(event.peerNumber, event.peerName, event.sentAt);
        }
        await this.#service.captureRecent(event);
        const nickname = this.#context.adapter.getMemberNickname(event.peerNumber);
        if (nickname) await this.#service.setPeerName(event.peerNumber, nickname);
      }
      await this.#view.refresh();
    } catch (error) {
      this.#logger.error("Failed to import recent Beeps", error);
    }
  }
}
