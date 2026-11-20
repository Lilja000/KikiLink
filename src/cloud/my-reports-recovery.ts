import { CloudError, type CloudClient } from './client';

export class MyReportsRecoveryError extends Error {
  constructor() { super('Reports changed after recovery. Refresh reports before opening a receipt.'); }
}
export const myReportsRecoveryConflict = (error: unknown): boolean => error instanceof MyReportsRecoveryError ||
  error instanceof CloudError && error.code === 'recovery_generation_required';
export interface MyReportsAccess {
  readonly generation: string | undefined;
  current(): boolean;
  request<T>(method: 'GET', path: string): Promise<T>;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Volatile report receipts, warnings and safety navigation pages belong to one owner, origin and verified database generation.
 * No report detail, numeric cursor or selected community is carried across recovery. */
export class MyReportsRecovery {
  readonly #owner: number; readonly #origin: string;
  #generation: string | undefined; #observed = false; #ready = false; #revision = 0;
  #rejected: string | undefined;
  constructor(readonly client: CloudClient) { this.#owner = client.memberNumber; this.#origin = client.origin; }
  get generation(): string | undefined { return this.#generation; }
  get revision(): number { return this.#revision; }
  identityMatches(): boolean { return this.client.memberNumber === this.#owner && this.client.origin === this.#origin; }
  identityCurrent(): boolean { return this.client.connected && this.identityMatches(); }
  invalidate(): void { this.#ready = false; this.#revision++; }
  accept(metadata: unknown): boolean {
    try {
      if (!this.identityCurrent() || !object(metadata)) throw new MyReportsRecoveryError();
      const features = metadata.features, flag = object(features) ? features.myReportsRecoveryGeneration : undefined;
      if (flag !== undefined && typeof flag !== 'boolean') throw new MyReportsRecoveryError();
      let next: string | undefined;
      if (flag === true) {
        const recovery = metadata.directRecovery;
        if (!this.#origin || !object(recovery) || typeof recovery.generation !== 'string' || !/^[a-f0-9]{32}$/u.test(recovery.generation) || typeof recovery.restored !== 'boolean') throw new MyReportsRecoveryError();
        next = recovery.generation;
      } else if (this.#generation !== undefined) throw new MyReportsRecoveryError();
      if (next !== undefined && next === this.#rejected) throw new MyReportsRecoveryError();
      const changed = this.#observed && next !== this.#generation;
      if (changed || !this.#ready) this.#revision++;
      this.#generation = next; this.#observed = true; this.#ready = true;
      return changed;
    } catch (error) { this.invalidate(); throw error; }
  }
  capture(): MyReportsAccess {
    const revision = this.#revision, generation = this.#generation;
    const current = () => this.#ready && revision === this.#revision && this.identityCurrent();
    const check = () => { if (!current()) throw new MyReportsRecoveryError(); };
    check();
    return { generation, current, request: async <T>(method: 'GET', path: string): Promise<T> => {
      check();
      if (generation) path += `${path.includes('?') ? '&' : '?'}recoveryGeneration=${generation}`;
      try {
        const result = await this.client.request<T>(method, path);
        check();
        if (generation && (!object(result) || result.recoveryGeneration !== generation)) { this.invalidate(); throw new MyReportsRecoveryError(); }
        return result;
      } catch (error) {
        // A late failure from A must never invalidate an already verified B.
        if (current() && error instanceof CloudError && error.code === 'recovery_generation_required') {
          this.#rejected = generation; this.invalidate();
        }
        throw error;
      }
    } };
  }
}
