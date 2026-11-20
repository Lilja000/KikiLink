import type { KeyValueStorage } from "../../core/settings";

export const ACCOUNT_ACTIONS = {
  report_submitted: ["Report", "Submitted a report"],
  report_appealed: ["Report", "Submitted an appeal"],
  moderation_triage: ["Moderation", "Updated report triage"],
  moderation_decision: ["Moderation", "Confirmed a report decision"],
  moderation_restored: ["Moderation", "Restored a restriction"],
  moderation_appeal: ["Moderation", "Reviewed an appeal"],
  moderation_member: ["Moderation", "Updated community membership"],
  moderation_channel: ["Moderation", "Updated a channel archive"],
  sync_paused: ["Sync", "Paused profile and preference sync"],
  sync_resumed: ["Sync", "Resumed profile and preference sync"],
  sync_saved: ["Sync", "Confirmed queued values in Cloud"],
  sync_cancelled: ["Sync", "Cancelled a queued save"],
  sync_resolved: ["Sync", "Resolved a sync conflict"],
  connected: ["Connection", "Connected to Cloud"],
  connection_failed: ["Connection", "Cloud connection failed"],
  disconnected: ["Session", "Disconnected this device"],
  disconnect_unconfirmed: ["Session", "Device disconnected; server sign-out unconfirmed"],
  signed_out_all: ["Session", "Signed out on all devices"],
  sign_out_all_unconfirmed: ["Session", "Device disconnected; all-device sign-out unconfirmed"],
  session_revoked: ["Session", "Signed out selected Cloud access"],
  session_revoke_unconfirmed: ["Session", "Selected Cloud sign-out unconfirmed"],
  profile_privacy_saved: ["Privacy", "Updated Cloud profile audience and availability"],
  direct_retention_saved: ["Privacy", "Updated Direct history period"],
  preference_privacy_saved: ["Privacy", "Updated preference audience"],
  privacy_saved: ["Privacy", "Updated profile visibility"],
  profile_removed: ["Privacy", "Removed saved profile"],
  account_unblocked: ["Privacy", "Unblocked a Cloud account"],
  audit_cleared: ["Privacy", "Audit cleared"],
} as const;
export type AccountAction = keyof typeof ACCOUNT_ACTIONS;
export type AccountActivityKind = (typeof ACCOUNT_ACTIONS)[AccountAction][0];
export interface AccountActivityEntry { id: string; action: AccountAction; time: number; generation?:string; scope?:string; }
const MAX_AGE = 30 * 86400_000;

/** Account-scoped local metadata only. No names, targets, messages, tokens or free text. */
export class AccountActivity {
  readonly #key: string;
  #entries: AccountActivityEntry[] = [];
  #volatile = false;
  constructor(readonly owner: number, readonly storage?: KeyValueStorage, readonly now = Date.now) {
    this.#key = `kikilink:account-activity:${owner}:v1`;
    this.#volatile = !storage;
    try {
      const raw = storage?.getItem(this.#key);
      if (raw && raw.length <= 40_000) {
        const data = JSON.parse(raw);
        if (data.version === 1 && data.owner === owner && Array.isArray(data.entries)) {
          this.#entries = data.entries.filter((e: AccountActivityEntry) => e && typeof e.id === "string" && /^[a-f\d-]{36}$/i.test(e.id)
            && Object.hasOwn(ACCOUNT_ACTIONS, e.action) && Number.isSafeInteger(e.time))
            .map((e: AccountActivityEntry) => ({ id: e.id, action: e.action, time: e.time })).slice(-100);
          const kept = this.list().reverse();
          if (kept.length !== this.#entries.length) this.#persist(kept);
          this.#entries = kept;
        }
      }
    } catch { this.#volatile = true; }
  }
  get volatile(): boolean { return this.#volatile; }
  list(kind?: AccountActivityKind): AccountActivityEntry[] {
    return this.#entries.filter(e => e.time > this.now() - MAX_AGE && e.time <= this.now() + 300_000
      && (!kind || ACCOUNT_ACTIONS[e.action][0] === kind)).slice().reverse();
  }
  #persist(entries: AccountActivityEntry[]): void {
    if (!this.storage) throw new Error("Local storage unavailable");
    const text = JSON.stringify({ version: 1, owner: this.owner, entries });
    this.storage.setItem(this.#key, text);
    if (this.storage.getItem(this.#key) !== text) throw new Error("Local storage write failed");
  }
  record(action: AccountAction): void {
    const entries = [...this.list().reverse(), { id: crypto.randomUUID(), action, time: this.now() }].slice(-100);
    this.#entries = entries;
    try { this.#persist(entries); this.#volatile = false; } catch { this.#volatile = true; }
  }
  clear(ids: ReadonlySet<string>): boolean {
    const current = this.list().reverse();
    const kept = current.filter(e => !ids.has(e.id));
    if (kept.length === current.length) return false;
    // Save the removal and its generic receipt together. A failed write must not
    // clear the in-memory log or claim a successful clear. The snapshot excludes
    // actions recorded after confirmation opened.
    const entries: AccountActivityEntry[] = [...kept, { id: crypto.randomUUID(), action: 'audit_cleared', time: this.now() }];
    this.#persist(entries); this.#entries = entries; this.#volatile = false;
    return true;
  }
}
