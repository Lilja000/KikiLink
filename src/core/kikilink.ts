import { BCAdapter } from "../bc/adapter";
import { LinkChatModule } from "../modules/link-chat/link-chat-module";
import { LinkReactionsModule } from "../modules/link-reactions/link-reactions-module";
import {
  AccountDataStorage,
  AccountSyncedChatRepository,
  accountChatDatabaseName,
} from "../storage/account-data-storage";
import { IndexedDbChatRepository } from "../storage/indexeddb-chat-repository";
import { MemoryChatRepository } from "../storage/memory-chat-repository";
import { ResilientChatRepository } from "../storage/resilient-chat-repository";
import type { ChatRepository } from "../storage/chat-repository";
import { EventBus } from "./event-bus";
import { Logger } from "./logger";
import { ModuleRegistry } from "./module-registry";
import { SettingsStore } from "./settings";
import type { KikiLinkEvents, KikiLinkPublicApi } from "./types";

const ACCOUNT_MONITOR_MS = 1_000;

export class KikiLinkApp {
  readonly #logger = new Logger("core");
  readonly #bus = new EventBus<KikiLinkEvents>();
  readonly #adapter: BCAdapter;
  readonly #modules = new ModuleRegistry();
  readonly #linkChat = new LinkChatModule();
  readonly #linkReactions = new LinkReactionsModule();
  #settings: SettingsStore | undefined;
  #repository: ChatRepository | undefined;
  #accountStorage: AccountDataStorage | undefined;
  #adapterStart: Promise<void> | undefined;
  #accountMonitorTimer: ReturnType<typeof setInterval> | undefined;
  #activeMemberNumber: number | undefined;
  #desiredMemberNumber: number | undefined;
  #transitionPromise: Promise<void> | undefined;
  #versionBadge: HTMLSpanElement | undefined;
  #started = false;

  constructor(private readonly version: string) {
    this.#adapter = new BCAdapter(this.#bus, version);
    this.#modules.register(this.#linkChat);
    this.#modules.register(this.#linkReactions);
  }

  publicApi(): KikiLinkPublicApi {
    return {
      name: "KikiLink",
      open: () => this.#linkChat.open(),
      openChat: (memberNumber, memberName) => this.#linkChat.openChat(memberNumber, memberName),
      openRoster: () => this.#linkChat.openRoster(),
      openActivities: () => this.#linkChat.openActivities(),
      close: () => this.#linkChat.close(),
      getVersion: () => this.version,
      destroy: () => this.destroy(),
    };
  }

  async start(): Promise<void> {
    if (this.#started) return;
    this.#started = true;
    this.#mountVersionBadge();
    await waitForAuthenticatedPlayer(() => this.#started);
    if (!this.#started) return;

    this.#desiredMemberNumber = authenticatedMemberNumber();
    await this.#runAccountTransitions();
    if (!this.#started) return;
    // Account changes are rare and already have an immediate startup boundary. A one-second
    // monitor avoids four permanent checks per second without making an in-page switch feel slow.
    this.#accountMonitorTimer = setInterval(() => this.#monitorAccount(), ACCOUNT_MONITOR_MS);
  }

  async destroy(): Promise<void> {
    if (!this.#started) return;
    this.#started = false;
    if (this.#accountMonitorTimer !== undefined) clearInterval(this.#accountMonitorTimer);
    this.#accountMonitorTimer = undefined;
    this.#desiredMemberNumber = undefined;
    await this.#transitionPromise;
    await this.#deactivateAccount();
    this.#versionBadge?.remove();
    this.#versionBadge = undefined;
    this.#bus.clear();
    this.#logger.info("Stopped");
  }

  #monitorAccount(): void {
    const memberNumber = authenticatedMemberNumber();
    if (memberNumber === this.#desiredMemberNumber && memberNumber === this.#activeMemberNumber) {
      const host = document.querySelector<HTMLElement>("#kikilink-root");
      if (host) host.hidden = false;
      return;
    }

    const oldHost = document.querySelector<HTMLElement>("#kikilink-root");
    if (oldHost) oldHost.hidden = true;
    this.#desiredMemberNumber = memberNumber;
    void this.#runAccountTransitions();
  }

  #runAccountTransitions(): Promise<void> {
    if (this.#transitionPromise) return this.#transitionPromise;
    const transition = (async () => {
      while (this.#started && this.#desiredMemberNumber !== this.#activeMemberNumber) {
        const target = this.#desiredMemberNumber;
        await this.#deactivateAccount();
        if (!this.#started || target === undefined) continue;
        if (authenticatedMemberNumber() !== target) continue;
        await this.#activateAccount(target);
      }
    })();
    this.#transitionPromise = transition.finally(() => {
      this.#transitionPromise = undefined;
      if (this.#started && this.#desiredMemberNumber !== this.#activeMemberNumber) {
        void this.#runAccountTransitions();
      }
    });
    return this.#transitionPromise;
  }

  async #activateAccount(memberNumber: number): Promise<void> {
    const accountStorage = new AccountDataStorage(memberNumber);
    const settings = new SettingsStore(accountStorage);
    const localRepository: ChatRepository =
      typeof indexedDB === "undefined"
        ? new MemoryChatRepository()
        : new ResilientChatRepository(
            new IndexedDbChatRepository(accountChatDatabaseName(memberNumber)),
            new MemoryChatRepository(),
          );
    await accountStorage.attachChatRepository(localRepository);

    if (
      !this.#started ||
      this.#desiredMemberNumber !== memberNumber ||
      authenticatedMemberNumber() !== memberNumber
    ) {
      localRepository.close();
      await accountStorage.destroy();
      return;
    }

    const repository = new AccountSyncedChatRepository(localRepository, accountStorage);
    this.#settings = settings;
    this.#repository = repository;
    this.#accountStorage = accountStorage;
    await this.#modules.startAll({
      adapter: this.#adapter,
      bus: this.#bus,
      repository,
      settings,
      accountStorage,
      memberNumber,
      version: this.version,
    });

    this.#activeMemberNumber = memberNumber;
    this.#adapterStart = this.#adapter.start().catch((error: unknown) => {
      this.#logger.error("Bondage Club connection failed", error);
    });
    const host = document.querySelector<HTMLElement>("#kikilink-root");
    if (host) host.hidden = false;
    this.#logger.info(`KikiLink ${this.version} ready for account ${memberNumber}`);
  }

  async #deactivateAccount(): Promise<void> {
    if (
      this.#activeMemberNumber === undefined &&
      !this.#settings &&
      !this.#repository &&
      !this.#accountStorage
    ) {
      return;
    }

    try {
      this.#adapter.stop();
    } catch (error) {
      this.#logger.warn("Bondage Club adapter teardown did not finish cleanly", error);
    }
    try {
      await this.#adapterStart;
    } catch (error) {
      this.#logger.warn("Bondage Club adapter startup ended during teardown", error);
    }
    this.#adapterStart = undefined;
    try {
      await this.#modules.stopAll();
    } catch (error) {
      this.#logger.warn("Module teardown did not finish cleanly", error);
    }
    try {
      await this.#accountStorage?.destroy();
    } catch (error) {
      this.#logger.warn("Account storage teardown did not finish cleanly", error);
    }
    try {
      this.#repository?.close();
    } catch (error) {
      this.#logger.warn("Chat storage teardown did not finish cleanly", error);
    }
    this.#repository = undefined;
    this.#settings = undefined;
    this.#accountStorage = undefined;
    this.#activeMemberNumber = undefined;
  }

  #mountVersionBadge(): void {
    const existing = document.getElementById("kikilink-version");
    if (existing) existing.remove();
    const badge = document.createElement("span");
    badge.id = "kikilink-version";
    badge.dataset.kikilinkVersion = this.version;
    badge.textContent = this.version;
    badge.setAttribute("aria-hidden", "true");
    Object.assign(badge.style, {
      position: "fixed",
      left: "3px",
      bottom: "2px",
      zIndex: "2147483646",
      color: "#fff",
      opacity: "0.18",
      font: "7px/1 monospace",
      letterSpacing: "0",
      pointerEvents: "none",
      userSelect: "none",
      mixBlendMode: "difference",
    });
    document.body.append(badge);
    this.#versionBadge = badge;
  }
}

async function waitForAuthenticatedPlayer(keepWaiting: () => boolean): Promise<void> {
  while (keepWaiting() && authenticatedMemberNumber() === undefined) {
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
}

function authenticatedMemberNumber(): number | undefined {
  if (
    typeof document === "undefined" ||
    document.body === null ||
    typeof Player !== "object" ||
    Player === null ||
    !Number.isSafeInteger(Player.MemberNumber) ||
    Player.MemberNumber <= 0
  ) {
    return undefined;
  }
  try {
    if (typeof ServerIsLoggedIn === "function") {
      if (!ServerIsLoggedIn()) return undefined;
      // LianChat initializes its account DB after LoginResponse. Waiting for this object gives us
      // the same boundary and prevents an empty local snapshot from winning before BC has loaded
      // the authenticated account's ExtensionSettings.
      if (
        typeof Player.ExtensionSettings !== "object" ||
        Player.ExtensionSettings === null ||
        Array.isArray(Player.ExtensionSettings)
      ) {
        return undefined;
      }
    }
    return Player.MemberNumber;
  } catch {
    return undefined;
  }
}
