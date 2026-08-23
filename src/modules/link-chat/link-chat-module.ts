import type { BeepEvent, KikiLinkContext, KikiLinkModule, KikiLinkSettings } from "../../core/types";
import { Logger } from "../../core/logger";
import { ChatService } from "./chat-service";
import { LinkChatView } from "./view";
import { LinkActivitiesService } from "../link-activities/link-activities-service";

export class LinkChatModule implements KikiLinkModule {
  readonly id = "link-chat";
  readonly #logger = new Logger("link-chat");
  readonly #unsubscribers: Array<() => void> = [];
  #context: KikiLinkContext | undefined;
  #service: ChatService | undefined;
  #view: LinkChatView | undefined;

  isEnabled(settings: KikiLinkSettings): boolean {
    return settings.linkChat.enabled;
  }

  start(context: KikiLinkContext): void {
    this.#context = context;
    this.#service = new ChatService(context.repository, context.settings);
    const activities = new LinkActivitiesService(context.adapter);
    this.#view = new LinkChatView(
      context.adapter,
      this.#service,
      context.settings,
      context.version,
      activities,
    );
    this.#view.mount();

    this.#unsubscribers.push(
      context.bus.on("bc:status", ({ state, message }) =>
        this.#view?.setConnectionState(state, message),
      ),
      context.bus.on("bc:ready", () => void this.#importRecentBeeps()),
      context.bus.on("beep:received", (event) => void this.#capture(event)),
      context.bus.on("beep:sent", (event) => void this.#capture(event)),
    );
    this.#view.setConnectionState(context.adapter.isReady() ? "ready" : "connecting");
    void this.#service.prune();
  }

  stop(): void {
    for (const unsubscribe of this.#unsubscribers.splice(0).reverse()) unsubscribe();
    this.#view?.destroy();
    this.#view = undefined;
    this.#service = undefined;
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

  openActivities(): void {
    this.#view?.openActivities();
  }

  async #capture(event: BeepEvent): Promise<void> {
    if (!this.#service || !this.#view || !this.#context) return;
    try {
      const active = this.#view.isActiveConversation(event.peerNumber);
      await this.#service.capture(event, active);
      await this.#view.onMessage(event.peerNumber, event.direction === "incoming");
      this.#context.bus.emit("link-chat:updated", { peerNumber: event.peerNumber });
    } catch (error) {
      this.#logger.error("Failed to capture a Beep", error);
    }
  }

  async #importRecentBeeps(): Promise<void> {
    if (!this.#service || !this.#view || !this.#context) return;
    try {
      for (const event of this.#context.adapter.getRecentBeeps()) {
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
