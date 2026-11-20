import { CloudError, type CloudClient } from './client';

export class FeedRecoveryError extends Error {
  constructor() { super('Feed history changed. Read the current Feed before syncing read state.'); }
}
export const feedRecoveryConflict = (error: unknown): boolean => error instanceof FeedRecoveryError ||
  error instanceof CloudError && error.code === 'recovery_generation_required';
export interface FeedReadAccess {
  readonly generation: string | undefined;
  current(): boolean;
  request<T>(method: 'GET' | 'PUT', path: string, body?: Record<string, unknown>): Promise<T>;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Volatile Feed cursors belong to one owner, origin and verified database generation.
 * No Feed read queue is persisted or replayed across recovery. */
export class FeedReadRecovery {
  readonly #owner: number; readonly #origin: string;
  #generation: string | undefined; #observed = false; #ready = false; #revision = 0;
  #rejected: string | undefined;
  constructor(readonly client: CloudClient) { this.#owner = client.memberNumber; this.#origin = client.origin; }
  get generation(): string | undefined { return this.#generation; }
  get revision(): number { return this.#revision; }
  identityCurrent(): boolean { return this.client.connected && this.client.memberNumber === this.#owner && this.client.origin === this.#origin; }
  invalidate(): void { this.#ready = false; this.#revision++; }
  accept(metadata: unknown): boolean {
    try {
      if (!this.identityCurrent() || !object(metadata)) throw new FeedRecoveryError();
      const features = metadata.features, read = object(features) ? features.feedReadRecoveryGeneration : undefined, mutation = object(features) ? features.feedMutationRecoveryGeneration : undefined, content = object(features) ? features.feedContentRecoveryGeneration : undefined;
      if(read!==undefined&&typeof read!=='boolean'||mutation!==undefined&&typeof mutation!=='boolean'||content!==undefined&&typeof content!=='boolean')throw new FeedRecoveryError();
      const flag=read===true||mutation===true||content===true;
      let next: string | undefined;
      if (flag === true) {
        const recovery = metadata.directRecovery;
        if (!this.#origin || !object(recovery) || typeof recovery.generation !== 'string' || !/^[a-f0-9]{32}$/u.test(recovery.generation) || typeof recovery.restored !== 'boolean') throw new FeedRecoveryError();
        next = recovery.generation;
      } else if (this.#generation !== undefined) throw new FeedRecoveryError();
      if (next !== undefined && next === this.#rejected) throw new FeedRecoveryError();
      const changed = this.#observed && next !== this.#generation;
      if (changed || !this.#ready) this.#revision++;
      this.#generation = next; this.#observed = true; this.#ready = true;
      return changed;
    } catch (error) { this.invalidate(); throw error; }
  }
  capture(): FeedReadAccess {
    const revision = this.#revision, generation = this.#generation;
    const current = () => this.#ready && revision === this.#revision && this.identityCurrent();
    const check = () => { if (!current()) throw new FeedRecoveryError(); };
    check();
    return { generation, current, request: async <T>(method: 'GET' | 'PUT', path: string, body?: Record<string, unknown>): Promise<T> => {
      check();
      if (generation) {
        if (method === 'GET') path += `${path.includes('?') ? '&' : '?'}recoveryGeneration=${generation}`;
        else body = { ...body, recoveryGeneration: generation };
      }
      try {
        const result = body === undefined ? await this.client.request<T>(method, path) : await this.client.request<T>(method, path, body);
        check();
        if (generation && (!object(result) || result.recoveryGeneration !== generation)) { this.invalidate(); throw new FeedRecoveryError(); }
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
