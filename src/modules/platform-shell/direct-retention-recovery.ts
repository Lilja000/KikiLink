import {checkedOwnerSettingsSource, ownerSettingsSource, requireOwnerSettingsSource, ownerSettingsBody, ownerSettingsReceipt, OwnerSettingsGenerationError, type OwnerSettingsSource} from '../../cloud/owner-settings-generation';
import type { KeyValueStorage } from '../../core/settings';
import type { CloudClient } from '../../cloud/client';
import { matchExact as exact, matchInteger as int, matchUuid as uuid } from '../../../cloud/shared/matching.mjs';
import { directRetentionDays, type DirectRetentionDays } from '../../../cloud/shared/direct-retention.mjs';
export interface DirectRetentionPending {
  format: 1 | 2; source?: OwnerSettingsSource; method: 'PUT'; path: '/v1/direct/retention';
  body: { operationId: string; revision: number; days: DirectRetentionDays };
  createdAt: number; confirmed: boolean;
}
export type DirectRetentionLock = (key: string, run: () => Promise<void>) => Promise<unknown>;
export function checkedRetentionPending(value: unknown): DirectRetentionPending {
  if (!exact(value, ['format','method','path','body','createdAt','confirmed', ...(value as {format?:number})?.format === 2 ? ['source'] : []]) || value.format !== 1 && value.format !== 2 ||
    value.method !== 'PUT' || value.path !== '/v1/direct/retention' || !int(value.createdAt, 1, 8640000000000000) ||
    typeof value.confirmed !== 'boolean' || !exact(value.body, ['operationId','revision','days']) ||
    !uuid(value.body.operationId) || !int(value.body.revision) || value.body.revision >= Number.MAX_SAFE_INTEGER || !directRetentionDays(value.body.days))
    throw new Error('The saved Direct history request is unsupported. It has been kept unchanged.');
  if (value.format === 2) checkedOwnerSettingsSource(value.source);
  return structuredClone(value) as unknown as DirectRetentionPending;
}
const equal = (a: DirectRetentionPending, b: DirectRetentionPending) =>
  JSON.stringify({ ...a, confirmed: false }) ===
  JSON.stringify({ ...b, confirmed: false });
const confirmations = new WeakMap<object, Map<string, {raw: string; pending: DirectRetentionPending}>>();
/** Durable, explicit retry; refresh/reconnect never send a saved mutation. */
export class DirectRetentionRecovery {
  readonly owner: number;
  readonly origin: string;
  readonly key: string;
  constructor(
    readonly client: Pick<CloudClient, "memberNumber" | "origin" | "connected" | "request">,
    readonly storage: KeyValueStorage,
    readonly current: () => boolean,
    readonly lock?: DirectRetentionLock,
  ) {
    this.owner = client.memberNumber;
    this.origin = client.origin;
    if (!int(this.owner, 1) || !this.origin)
      throw new Error("Connect to a Cloud account first.");
    this.key = `kikilink:direct-retention-recovery:${encodeURIComponent(this.origin)}:${this.owner}:v1`;
  }
  #guard(valid: () => boolean): void {
    if (
      !this.current() ||
      !valid() ||
      this.client.memberNumber !== this.owner ||
      this.client.origin !== this.origin
    )
      throw new Error(
        "Your account or Direct history view changed. The saved request is kept.",
      );
  }
  async gate(valid:()=>boolean):Promise<OwnerSettingsSource>{
    this.#guard(valid);
    if(!this.client.connected)throw new Error('Reconnect to use Direct history settings.');
    const me=await this.client.request<{memberNumber:number;features?:{directRetention?:boolean}}>('GET','/v1/me');
    this.#guard(valid);
    if(me.memberNumber!==this.owner||me.features?.directRetention!==true)throw new Error('Direct history settings need the pending Cloud update. Your saved request is kept.');
    return ownerSettingsSource(me);
  }
  #raw(): string | null {
    this.#guard(() => true);
    let raw: string | null;
    try {
      const r = this.storage.getItemResult?.(this.key);
      if (r && !r.ok) throw new Error();
      raw = r ? r.value : this.storage.getItem(this.key);
    } catch {
      throw new Error(
        "The saved Direct history request could not be read. Nothing has been replaced.",
      );
    }
    return raw;
  }
  read(): DirectRetentionPending | null {
    const raw = this.#raw();
    if (raw === null || raw === "null") return null;
    if (raw.length > 16384)
      throw new Error(
        "The saved Direct history request is too large. It has been kept.",
      );
    const pending = checkedRetentionPending(JSON.parse(raw)), known = confirmations.get(this.client)?.get(this.key);
    return known?.raw === raw && equal(known.pending, pending) ? structuredClone(known.pending) : pending;
  }
  #unchanged(raw: string | null): void { if (this.#raw() !== raw) throw new Error("The saved request changed in another tab. Reopen Direct history."); }
  #write(v: DirectRetentionPending | null, valid: () => boolean, expected: string | null): void {
    this.#guard(valid);
    this.#unchanged(expected);
    const raw = JSON.stringify(v);
    try {
      this.storage.setItem(this.key, raw);
      const r = this.storage.getItemResult?.(this.key);
      if (r ? !r.ok || r.value !== raw : this.storage.getItem(this.key) !== raw)
        throw new Error();
    } catch {
      throw new Error(
        "Saving the request on this device could not be confirmed. Reopen Direct history to check it.",
      );
    }
  }
  async #locked(run: () => Promise<void>): Promise<void> {
    if (this.lock) await this.lock(this.key, run);
    else if (globalThis.navigator?.locks)
      await navigator.locks.request(this.key, run);
    else
      throw new Error(
        "This browser needs Web Locks to save Direct history requests safely.",
      );
  }
  async prepare(value: DirectRetentionPending, valid: () => boolean): Promise<void> {
    const next = checkedRetentionPending(value);
    if (next.confirmed)
      throw new Error("A new request cannot already be confirmed.");
    await this.#locked(async () => {
      this.#guard(valid);
      const raw = this.#raw(), old = this.read();
      if (old) {
        if (!equal(old, next))
          throw new Error("Recover the pending Direct history request first.");
        return;
      }
      this.#write(next, valid, raw);
    });
  }
  async run(value: DirectRetentionPending, valid: () => boolean): Promise<void> {
    const expected = checkedRetentionPending(value);
    await this.#locked(async () => {
      this.#guard(valid);
      let raw = this.#raw(), pending = this.read();
      if (!pending || !equal(pending, expected)) throw new Error('The saved request changed in another tab. Reopen Direct history.');
      if (!pending.confirmed) {
        const allowed = () => { this.#guard(valid); this.#unchanged(raw); return true; };
        const fresh = await this.gate(allowed); requireOwnerSettingsSource(pending.source, fresh); allowed();
        let receipt: unknown;
        try { receipt = await this.client.request(pending.method, pending.path, ownerSettingsBody(pending.body, pending.source, pending.body.operationId)); }
        catch (error) { if ((error as {code?:string})?.code === 'recovery_generation_required') throw new OwnerSettingsGenerationError(); throw error; }
        this.#guard(() => true); this.#unchanged(raw);
        const result = ownerSettingsReceipt(receipt, pending.source, this.owner, pending.body.operationId, 'direct-retention-put', false);
        // The operationId belongs to the original durable domain receipt as well.
        const canonical = pending.source?.required && result && typeof result === 'object' ? {...result, operationId: pending.body.operationId} : result;
        if (!exact(canonical, ['operationId','resourceId','revision']) || canonical.operationId !== pending.body.operationId || canonical.resourceId !== `direct-retention:${this.owner}` || canonical.revision !== pending.body.revision + 1)
          throw new Error('The result could not be confirmed. Retry the saved request to check it.');
        pending = {...pending, confirmed: true};
        let known = confirmations.get(this.client); if (!known) confirmations.set(this.client, known = new Map());
        known.set(this.key, {raw: raw!, pending: structuredClone(pending)});
        this.#write(pending, () => true, raw); raw = this.#raw();
      }
      this.#write(null, valid, raw); confirmations.get(this.client)?.delete(this.key);
    });
  }
  async forget(value: DirectRetentionPending, valid: () => boolean): Promise<void> {
    const expected = checkedRetentionPending(value);
    await this.#locked(async () => {
      this.#guard(valid);
      const raw = this.#raw(), pending = this.read();
      if (!pending || !equal(pending, expected) || pending.confirmed)
        throw new Error(
          "The saved request changed or is already confirmed. Reopen Direct history.",
        );
      this.#write(null, valid, raw);
    });
  }
}
