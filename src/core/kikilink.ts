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
    await waitForAuthenticatedPlayer(() => this.#started);
    if (!this.#started) return;

    this.#desiredMemberNumber = authenticatedMemberNumber();
    await this.#runAccountTransitions();
    if (!this.#started) return;
    this.#accountMonitorTimer = setInterval(() => this.#monitorAccount(), 250);
  }

  async destroy(): Promise<void> {
    if (!this.#started) return;
    this.#started = false;
    if (this.#accountMonitorTimer !== undefined) clearInterval(this.#accountMonitorTimer);
    this.#accountMonitorTimer = undefined;
    this.#desiredMemberNumber = undefined;
    await this.#transitionPromise;
    await this.#deactivateAccount();
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

    this.#adapter.stop();
    await this.#adapterStart;
    this.#adapterStart = undefined;
    await this.#modules.stopAll();
    await this.#accountStorage?.destroy();
    this.#repository?.close();
    this.#repository = undefined;
    this.#settings = undefined;
    this.#accountStorage = undefined;
    this.#activeMemberNumber = undefined;
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
    return typeof ServerIsLoggedIn !== "function" || ServerIsLoggedIn()
      ? Player.MemberNumber
      : undefined;
  } catch {
    return undefined;
  }
}
