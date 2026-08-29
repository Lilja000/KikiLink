import type { BeepEvent, KikiLinkContext, KikiLinkModule, KikiLinkSettings } from "../../core/types";
import { Logger } from "../../core/logger";
import { ChatService } from "./chat-service";
import { LinkChatView } from "./view";
import { LinkActivitiesService } from "../link-activities/link-activities-service";
import { LinkRosterService } from "../link-roster/link-roster-service";
import { PeopleRepository } from "../../storage/people-repository";
import { LinkPresenceService } from "../link-presence/link-presence-service";
import { AfkAutoReplyService } from "./afk-auto-reply-service";
import { GroupChatService } from "./group-chat-service";
import { MemoryKeyValueStorage } from "../../core/settings";
import { ProfileCacheRepository } from "../../storage/profile-cache-repository";
import { ReleaseNoticeService } from "./release-notice-service";

export class LinkChatModule implements KikiLinkModule {
  readonly id = "link-chat";
  readonly #logger = new Logger("link-chat");
  readonly #unsubscribers: Array<() => void> = [];
  #context: KikiLinkContext | undefined;
  #service: ChatService | undefined;
  #activities: LinkActivitiesService | undefined;
  #roster: LinkRosterService | undefined;
  #presence: LinkPresenceService | undefined;
  #afkAutoReply: AfkAutoReplyService | undefined;
  #releaseNotices: ReleaseNoticeService | undefined;
  #groups: GroupChatService | undefined;
  #view: LinkChatView | undefined;
  #rosterTimer: ReturnType<typeof setInterval> | undefined;

  isEnabled(settings: KikiLinkSettings): boolean {
    return settings.linkChat.enabled;
  }

  start(context: KikiLinkContext): void {
    this.#context = context;
    const accountStorage = context.accountStorage ?? new MemoryKeyValueStorage();
    this.#service = new ChatService(context.repository, context.settings);
    this.#activities = new LinkActivitiesService(context.adapter, context.settings);
    this.#activities.start();
    this.#roster = new LinkRosterService(
      context.adapter,
      new PeopleRepository(context.accountStorage),
      context.settings,
    );
    this.#presence = new LinkPresenceService(
      context.adapter,
      context.settings,
      context.bus,
      context.version,
      new ProfileCacheRepository(accountStorage),
      context.memberNumber,
    );
    this.#presence.start();
    this.#releaseNotices = new ReleaseNoticeService(
      context.adapter,
      this.#presence,
      accountStorage,
      context.version,
    );
    this.#afkAutoReply = new AfkAutoReplyService(context.adapter, {
      getStatus: () => this.#presence?.getOwnStatus() ?? "online",
      getConfig: () => context.settings.get().linkPresence.afkAutoReply,
    });
    this.#afkAutoReply.syncStatus();
    this.#unsubscribers.push(
      this.#presence.subscribe(() => this.#afkAutoReply?.syncStatus()),
    );
    this.#roster.prune();
    this.#groups = new GroupChatService(
      context.adapter,
      accountStorage,
      {
        hasManagedPeer: (memberNumber) =>
          this.#presence?.hasGroupManagedPeer(memberNumber) === true,
      },
    );
    this.#view = new LinkChatView(
      context.adapter,
      this.#service,
      context.settings,
      context.version,
      this.#activities,
      this.#roster,
      this.#presence,
    );
    this.#view.attachGroupChatService(this.#groups);
    this.#view.mount();

    if (typeof window !== "undefined") {
      const flushGroupsOnPageHide = () => this.#view?.flushGroupStateForPageHide();
      window.addEventListener("pagehide", flushGroupsOnPageHide);
      this.#unsubscribers.push(() =>
        window.removeEventListener("pagehide", flushGroupsOnPageHide),
      );
    }

    this.#unsubscribers.push(
      context.bus.on("bc:status", ({ state, message }) =>
        this.#view?.setConnectionState(state, message),
      ),
      context.bus.on("bc:ready", () => {
        this.#activities?.syncFromSettings();
        void this.#importRecentBeeps();
        this.#syncRoster();
      }),
      context.bus.on("beep:received", (event) => void this.#capture(event)),
      context.bus.on("beep:sent", (event) => void this.#capture(event)),
      context.bus.on("bc:protocol", (event) => {
        void this.#captureGroupProtocol(event);
        this.#maybeAnnounceRelease(event.senderNumber);
      }),
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

  async stop(): Promise<void> {
    if (this.#rosterTimer !== undefined) clearInterval(this.#rosterTimer);
    this.#rosterTimer = undefined;
    for (const unsubscribe of this.#unsubscribers.splice(0).reverse()) unsubscribe();
    this.#view?.destroy();
    this.#view = undefined;
    const groups = this.#groups;
    this.#groups = undefined;
    if (groups) {
      const persistence = await groups.destroy();
      if (persistence.degraded) {
        this.#logger.warn("Group changes remain session-only because browser storage is unavailable");
      }
    }
    this.#activities?.stop();
    this.#activities = undefined;
    this.#presence?.stop();
    this.#presence = undefined;
    this.#releaseNotices = undefined;
    this.#afkAutoReply?.reset();
    this.#afkAutoReply = undefined;
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
    const automaticReply =
      event.direction === "incoming" ? this.#afkAutoReply?.handleIncoming(event) : undefined;
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
    if (automaticReply) await this.#capture(automaticReply);
  }

  async #captureGroupProtocol(event: { senderNumber: number; payload: string }): Promise<void> {
    if (!this.#groups) return;
    try {
      await this.#groups.receiveProtocol(event, this.#view?.getActiveGroupId());
    } catch (error) {
      this.#logger.error("Failed to capture a KikiLink group packet", error);
    }
  }

  #maybeAnnounceRelease(memberNumber: number): void {
    const event = this.#releaseNotices?.maybeNotify(memberNumber);
    if (event) void this.#capture(event);
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
