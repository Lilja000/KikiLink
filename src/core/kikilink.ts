import { BCAdapter } from "../bc/adapter";
import { LinkChatModule } from "../modules/link-chat/link-chat-module";
import { LinkReactionsModule } from "../modules/link-reactions/link-reactions-module";
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
  readonly #settings = new SettingsStore();
  readonly #repository: ChatRepository =
    typeof indexedDB === "undefined"
      ? new MemoryChatRepository()
      : new ResilientChatRepository(new IndexedDbChatRepository(), new MemoryChatRepository());
  readonly #adapter: BCAdapter;
  readonly #modules = new ModuleRegistry();
  readonly #linkChat = new LinkChatModule();
  readonly #linkReactions = new LinkReactionsModule();
  #adapterStart: Promise<void> | undefined;
  #authVisibilityTimer: ReturnType<typeof setInterval> | undefined;
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

    await this.#modules.startAll({
      adapter: this.#adapter,
      bus: this.#bus,
      repository: this.#repository,
      settings: this.#settings,
      version: this.version,
    });

    this.#adapterStart = this.#adapter.start().catch((error: unknown) => {
      this.#logger.error("Bondage Club connection failed", error);
    });
    this.#syncAuthenticatedVisibility();
    this.#authVisibilityTimer = setInterval(() => this.#syncAuthenticatedVisibility(), 250);
    this.#logger.info(`KikiLink ${this.version} interface is ready`);
  }

  async destroy(): Promise<void> {
    if (!this.#started) return;
    this.#started = false;
    if (this.#authVisibilityTimer !== undefined) clearInterval(this.#authVisibilityTimer);
    this.#authVisibilityTimer = undefined;
    this.#adapter.stop();
    await this.#adapterStart;
    this.#adapterStart = undefined;
    await this.#modules.stopAll();
    this.#repository.close();
    this.#bus.clear();
    this.#logger.info("Stopped");
  }

  #syncAuthenticatedVisibility(): void {
    if (typeof document === "undefined") return;
    const host = document.querySelector<HTMLElement>("#kikilink-root");
    if (!host) return;
    host.hidden = !hasAuthenticatedPlayer();
  }
}

async function waitForAuthenticatedPlayer(keepWaiting: () => boolean): Promise<void> {
  while (keepWaiting() && !hasAuthenticatedPlayer()) {
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
}

function hasAuthenticatedPlayer(): boolean {
  if (
    typeof document === "undefined" ||
    document.body === null ||
    typeof Player !== "object" ||
    Player === null ||
    !Number.isSafeInteger(Player.MemberNumber) ||
    Player.MemberNumber <= 0
  ) {
    return false;
  }
  try {
    return typeof ServerIsLoggedIn !== "function" || ServerIsLoggedIn();
  } catch {
    return false;
  }
}
