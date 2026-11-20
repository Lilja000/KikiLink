import type { CloudClient } from "./client";
import { ownerSettingsSource, requireOwnerSettingsSource, ownerSettingsPath, ownerSettingsRead, ownerSettingsBody, type OwnerSettingsSource } from './owner-settings-generation';

export interface SharedRoom { name: string; space: string; }
export interface LocationSource { current(): boolean; room(): SharedRoom | null; }

/** Shared group/community availability, with the same opt-out as native KikiLink presence. */
export class CloudPresence {
  #timer: ReturnType<typeof setInterval>;
  #last = "";
  #at = 0;
  #task: Promise<void> | undefined;
  #destroyed = false;
  #generation = 0;
  #again = false;
  #locationSource: OwnerSettingsSource | undefined;
  #unsubscribe: () => void;
  constructor(readonly client: CloudClient, readonly status: () => "online" | "idle" | "dnd" | "offline", readonly location?: LocationSource) {
    this.#unsubscribe = client.subscribe(kind => { if (["session", "connection", "privacy", "ready", `profile:${client.memberNumber}`].includes(kind)) {
      this.#generation++; this.#last = ""; this.#at = 0; this.#again = true; this.update();
    } });
    this.#timer = setInterval(() => this.update(), 60000);
    this.update();
  }
  update(): void {
    if (this.#destroyed || !this.client.connected || this.#task || this.location && !this.location.current()) return;
    const status = this.status();
    let room: SharedRoom | null = null;
    try { room = this.location?.room() ?? null; } catch { /* Unreadable native room is never uploaded. */ }
    const signature = JSON.stringify([status, room]);
    if (signature === this.#last && Date.now() - this.#at < 60000) return;
    this.#again = false; this.#last = signature; this.#at = Date.now();
    const generation = this.#generation, owner = this.client.memberNumber, origin = this.client.origin;
    const active = () => !this.#destroyed && generation === this.#generation && this.client.connected && this.client.memberNumber === owner && this.client.origin === origin && (!this.location || this.location.current());
    const task = this.client.request("PUT", "/v1/presence", { status }).then(async () => {
      if (!active() || !this.location || status === "offline") return;
      const me = await this.client.request<{ memberNumber: number; features?: { profileLocation?: boolean } }>("GET", "/v1/me");
      if (!active() || me.memberNumber !== owner || me.features?.profileLocation !== true) return;
      const source = ownerSettingsSource(me);
      if (this.#locationSource) requireOwnerSettingsSource(this.#locationSource, source);
      else this.#locationSource = source;
      const policy = ownerSettingsRead(await this.client.request('GET', ownerSettingsPath('/v1/privacy/me', source)), source) as { memberNumber: number; showOnline: boolean; showLocation: boolean; revision: number };
      if (!active() || policy.memberNumber !== owner || policy.showOnline !== true || policy.showLocation !== true || !Number.isSafeInteger(policy.revision) || policy.revision < 0) return;
      let latest: SharedRoom | null = null;
      try { latest = this.location.room(); } catch { /* Clear a room that became unreadable. */ }
      if (!active()) return;
      await this.client.request("PUT", "/v1/profile-location", ownerSettingsBody({ revision: policy.revision, room: latest }, source, crypto.randomUUID()));
    }).catch(() => { this.#last = ""; })
      .finally(() => { if (this.#task === task) { this.#task = undefined; if (this.#again) this.update(); } });
    this.#task = task;
  }
  destroy(): void { this.#destroyed = true; this.#generation++; clearInterval(this.#timer); this.#unsubscribe(); }
}
