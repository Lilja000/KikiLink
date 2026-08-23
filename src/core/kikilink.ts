import { BCAdapter } from "../bc/adapter";
import { LinkChatModule } from "../modules/link-chat/link-chat-module";
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
  #started = false;

  constructor(private readonly version: string) {
    this.#adapter = new BCAdapter(this.#bus, version);
    this.#modules.register(this.#linkChat);
  }

  publicApi(): KikiLinkPublicApi {
    return {
      name: "KikiLink",
      open: () => this.#linkChat.open(),
      openChat: (memberNumber, memberName) => this.#linkChat.openChat(memberNumber, memberName),
      close: () => this.#linkChat.close(),
      getVersion: () => this.version,
      destroy: () => this.destroy(),
    };
  }

  async start(): Promise<void> {
    if (this.#started) return;
    this.#started = true;
    await this.#adapter.start();
    if (!this.#started) return;
    await this.#modules.startAll({
      adapter: this.#adapter,
      bus: this.#bus,
      repository: this.#repository,
      settings: this.#settings,
      version: this.version,
    });
    this.#logger.info(`KikiLink ${this.version} is ready`);
  }

  async destroy(): Promise<void> {
    if (!this.#started) return;
    this.#started = false;
    await this.#modules.stopAll();
    this.#adapter.stop();
    this.#repository.close();
    this.#bus.clear();
    this.#logger.info("Stopped");
  }
}
