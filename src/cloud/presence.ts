import type { CloudClient } from "./client";

/** Shared group availability, with the same opt-out as native KikiLink presence. */
export class CloudPresence {
  #timer: ReturnType<typeof setInterval>;
  #last = "";
  #at = 0;
  #task: Promise<void> | undefined;
  #destroyed = false;
  #unsubscribe: () => void;
  constructor(readonly client: CloudClient, readonly status: () => "online" | "idle" | "dnd" | "offline") {
    this.#unsubscribe = client.subscribe(kind => { if (kind === "session") { this.#last = ""; this.#at = 0; this.update(); } });
    this.#timer = setInterval(() => this.update(), 60000);
    this.update();
  }
  update(): void {
    if (this.#destroyed || !this.client.connected || this.#task) return;
    const status = this.status();
    if (status === this.#last && Date.now() - this.#at < 60000) return;
    this.#last = status; this.#at = Date.now();
    const task = this.client.request("PUT", "/v1/presence", { status }).then(() => {}).catch(() => { this.#last = ""; })
      .finally(() => { if (this.#task === task) this.#task = undefined; });
    this.#task = task;
  }
  destroy(): void { this.#destroyed = true; clearInterval(this.#timer); this.#unsubscribe(); }
}
