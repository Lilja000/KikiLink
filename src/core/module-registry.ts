import { Logger } from "./logger";
import type { KikiLinkContext, KikiLinkModule } from "./types";

export class ModuleRegistry {
  readonly #modules = new Map<string, KikiLinkModule>();
  readonly #started = new Set<string>();
  readonly #logger = new Logger("modules");

  register(module: KikiLinkModule): void {
    if (this.#modules.has(module.id)) {
      throw new Error(`Module '${module.id}' is already registered`);
    }
    this.#modules.set(module.id, module);
  }

  async startAll(context: KikiLinkContext): Promise<void> {
    for (const module of this.#modules.values()) {
      if (!module.isEnabled(context.settings.get())) continue;

      try {
        await module.start(context);
        this.#started.add(module.id);
        this.#logger.info(`Started ${module.id}`);
      } catch (error) {
        this.#logger.error(`Failed to start ${module.id}`, error);
      }
    }
  }

  async stopAll(): Promise<void> {
    const startedModules = [...this.#started].reverse();
    for (const id of startedModules) {
      const module = this.#modules.get(id);
      if (!module) continue;

      try {
        await module.stop();
      } catch (error) {
        this.#logger.error(`Failed to stop ${id}`, error);
      }
    }
    this.#started.clear();
  }
}
