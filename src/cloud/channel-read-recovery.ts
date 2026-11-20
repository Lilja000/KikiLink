import { CloudError, type CloudClient } from './client';

export class ChannelRecoveryError extends Error {
  constructor() { super('Channel history changed. Read the current channel before syncing read state.'); }
}
export const channelRecoveryConflict = (error: unknown): boolean => error instanceof ChannelRecoveryError ||
  error instanceof CloudError && error.code === 'recovery_generation_required';
export interface ChannelReadAccess {
  readonly generation: string | undefined;
  current(): boolean;
  request<T>(method: 'GET' | 'PUT', path: string, body?: Record<string, unknown>): Promise<T>;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Volatile channel cursors belong to one owner, origin and verified database generation.
 * No channel read queue is persisted or replayed across recovery. */
export class ChannelReadRecovery {
  readonly #owner: number; readonly #origin: string;
  #generation: string | undefined; #observed = false; #ready = false; #revision = 0;
  #rejected: string | undefined;
  constructor(readonly client: CloudClient) { this.#owner = client.memberNumber; this.#origin = client.origin; }
  get generation(): string | undefined { return this.#generation; }
  identityCurrent(): boolean { return this.client.connected && this.client.memberNumber === this.#owner && this.client.origin === this.#origin; }
  invalidate(): void { this.#ready = false; this.#revision++; }
  accept(metadata: unknown): boolean {
    try {
      if (!this.identityCurrent() || !object(metadata)) throw new ChannelRecoveryError();
      const features = metadata.features, flag = object(features) ? features.channelReadRecoveryGeneration : undefined;
      if (flag !== undefined && typeof flag !== 'boolean') throw new ChannelRecoveryError();
      let next: string | undefined;
      if (flag === true) {
        const recovery = metadata.directRecovery;
        if (!this.#origin || !object(recovery) || typeof recovery.generation !== 'string' || !/^[a-f0-9]{32}$/u.test(recovery.generation) || typeof recovery.restored !== 'boolean') throw new ChannelRecoveryError();
        next = recovery.generation;
      } else if (this.#generation !== undefined) throw new ChannelRecoveryError();
      if (next !== undefined && next === this.#rejected) throw new ChannelRecoveryError();
      const changed = this.#observed && next !== this.#generation;
      if (changed || !this.#ready) this.#revision++;
      this.#generation = next; this.#observed = true; this.#ready = true;
      return changed;
    } catch (error) { this.invalidate(); throw error; }
  }
  capture(): ChannelReadAccess {
    const revision = this.#revision, generation = this.#generation;
    const current = () => this.#ready && revision === this.#revision && this.identityCurrent();
    const check = () => { if (!current()) throw new ChannelRecoveryError(); };
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
        if (generation && (!object(result) || result.recoveryGeneration !== generation)) { this.invalidate(); throw new ChannelRecoveryError(); }
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
