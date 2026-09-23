import { element } from "./dom";
import type { SocialUI } from "./social-ui";
import type { CloudGroup, CloudGroupLive } from "./types";

/** Bounded hints only: no draft contents, durable typing records or per-member polling. */
export class GroupLiveView {
  readonly element = element("div", { className: "kl-typing-indicator kl-group-typing", role: "status", hidden: true });
  readonly #names = element("span", { className: "kl-typing-name" });
  #active = false;
  #disposed = false;
  #task: Promise<void> | undefined;
  #timer: ReturnType<typeof setInterval> | undefined;
  #refreshTimer: ReturnType<typeof setTimeout> | undefined;
  #stopTimer: ReturnType<typeof setTimeout> | undefined;
  #expires: ReturnType<typeof setTimeout> | undefined;
  #sent = false;
  #lastSent = 0;
  #version = 0;
  #signalTask: Promise<unknown> = Promise.resolve();
  #unsubscribe: () => void;
  readonly #visibility = () => { if (document.visibilityState === "hidden") this.signal(false); else if (this.#active) void this.refresh(); };
  constructor(readonly ui: SocialUI, readonly group: CloudGroup, readonly changed: (live: CloudGroupLive) => void) {
    this.element.append(this.#names, element("span", { className: "kl-typing-dots", ariaHidden: "true" }, element("i"), element("i"), element("i")));
    this.#unsubscribe = ui.options.client.subscribe(kind => {
      if (kind === "typing" && this.#active && !this.#refreshTimer) this.#refreshTimer = setTimeout(() => {
        this.#refreshTimer = undefined; void this.refresh();
      }, 700);
    });
    document.addEventListener("visibilitychange", this.#visibility);
  }
  resume(): void {
    if (this.#disposed || this.#active) return;
    this.#active = true; void this.refresh();
    this.#timer = setInterval(() => void this.refresh(), 15000);
  }
  pause(): void {
    this.signal(false); this.#active = false; this.#version++;
    clearInterval(this.#timer); clearTimeout(this.#refreshTimer); clearTimeout(this.#expires);
    this.#timer = undefined; this.#refreshTimer = undefined; this.element.hidden = true;
  }
  destroy(): void { this.pause(); this.#disposed = true; this.#unsubscribe(); document.removeEventListener("visibilitychange", this.#visibility); }
  signal(typing: boolean): void {
    clearTimeout(this.#stopTimer);
    typing = typing && this.#active && document.visibilityState !== "hidden";
    if (typing) this.#stopTimer = setTimeout(() => this.signal(false), 5000);
    if (!this.ui.options.client.connected || (!typing && !this.#sent) || (typing && this.#sent && Date.now() - this.#lastSent < 3000)) return;
    this.#lastSent = Date.now(); this.#sent = typing;
    this.#signalTask = this.#signalTask.then(() => this.ui.options.client.request("PUT", `/v1/conversations/${this.group.conversationId}/typing`, { typing })).catch(() => {});
  }
  refresh(): Promise<void> {
    if (!this.#active || document.visibilityState === "hidden" || !this.ui.options.client.connected) return Promise.resolve();
    if (this.#task) return this.#task;
    const version = this.#version;
    const task = this.ui.options.client.request<CloudGroupLive>("GET", `/v1/groups/${this.group.id}/live`).then(async live => {
      if (!this.#active || version !== this.#version) return;
      this.changed(live);
      const receipt = Date.now();
      const typists = live.typing.filter(t => !this.ui.options.isBlocked(t.memberNumber)).slice(0, 4);
      const names = await Promise.all(typists.map(t => this.ui.options.client.profile(t.memberNumber).then(p => p.displayName).catch(() => `Member ${t.memberNumber}`)));
      if (!this.#active || version !== this.#version) return;
      clearTimeout(this.#expires);
      const paint = () => {
        const valid = typists.flatMap((t, i) => t.expiresInMs > Date.now() - receipt ? [names[i]!] : []);
        this.element.hidden = !valid.length;
        const text = valid.length ? `${valid.join(", ")} ${valid.length === 1 ? "is" : "are"} typing` : "";
        if (this.#names.textContent !== text) this.#names.textContent = text;
        const remaining = typists.map(t => t.expiresInMs - (Date.now() - receipt)).filter(ms => ms > 0);
        if (remaining.length) this.#expires = setTimeout(paint, Math.min(...remaining) + 20);
      };
      paint();
    }).catch(() => { if (version === this.#version) this.element.hidden = true; }).finally(() => { if (this.#task === task) this.#task = undefined; });
    this.#task = task; return task;
  }
}
