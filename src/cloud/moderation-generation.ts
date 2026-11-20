import {confirmedSafetyActivity} from './safety-activity-events';
import { CloudError, type CloudClient } from './client';

export class ModerationGenerationError extends Error {
  constructor() { super('Moderation changed after recovery. Refresh reports before making a decision.'); }
}
export const moderationGenerationConflict = (error: unknown): boolean => error instanceof ModerationGenerationError ||
  error instanceof CloudError && error.code === 'recovery_generation_required';
export interface ModerationAccess {
  readonly generation: string | undefined;
  current(): boolean;
  request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, body?: Record<string, unknown>): Promise<T>;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Volatile moderation targets and cursors belong to one owner, origin and verified database generation.
 * No moderation decision is retargeted or replayed across recovery. */
export class ModerationGeneration {
  readonly #owner: number; readonly #origin: string;
  #generation: string | undefined; #observed = false; #ready = false; #revision = 0;
  #rejected: string | undefined;
  constructor(readonly client: CloudClient, readonly feature: 'platformModerationRecoveryGeneration' | 'communityModerationRecoveryGeneration' | 'restorationRecoveryGeneration' | 'reportCreationRecoveryGeneration' | 'communityManagementRecoveryGeneration' | 'communityMembershipRecoveryGeneration' | 'communityEditingRecoveryGeneration' | 'channelMutationRecoveryGeneration' | 'groupMutationRecoveryGeneration' | 'groupManagementRecoveryGeneration' = 'platformModerationRecoveryGeneration') { this.#owner = client.memberNumber; this.#origin = client.origin; }
  get generation(): string | undefined { return this.#generation; }
  get revision(): number { return this.#revision; }
  identityCurrent(): boolean { return this.client.connected && this.client.memberNumber === this.#owner && this.client.origin === this.#origin; }
  invalidate(): void { this.#ready = false; this.#revision++; }
  accept(metadata: unknown): boolean {
    try {
      if (!this.identityCurrent() || !object(metadata)) throw new ModerationGenerationError();
      const features = metadata.features, flag = object(features) ? features[this.feature] : undefined;
      if (flag !== undefined && typeof flag !== 'boolean') throw new ModerationGenerationError();
      let next: string | undefined;
      if (flag === true) {
        const recovery = metadata.directRecovery;
        if (!this.#origin || !object(recovery) || typeof recovery.generation !== 'string' || !/^[a-f0-9]{32}$/u.test(recovery.generation) || typeof recovery.restored !== 'boolean') throw new ModerationGenerationError();
        next = recovery.generation;
      } else if (this.#generation !== undefined) throw new ModerationGenerationError();
      if (next !== undefined && next === this.#rejected) throw new ModerationGenerationError();
      const changed = this.#observed && next !== this.#generation;
      if (changed || !this.#ready) this.#revision++;
      this.#generation = next; this.#observed = true; this.#ready = true;
      return changed;
    } catch (error) { this.invalidate(); throw error; }
  }
  capture(): ModerationAccess {
    const revision = this.#revision, generation = this.#generation;
    const current = () => this.#ready && revision === this.#revision && this.identityCurrent();
    const check = () => { if (!current()) throw new ModerationGenerationError(); };
    check();
    return { generation, current, request: async <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, body?: Record<string, unknown>): Promise<T> => {
      check();
      if (generation) {
        if (method === 'GET') path += `${path.includes('?') ? '&' : '?'}recoveryGeneration=${generation}`;
        else body = { ...body, recoveryGeneration: generation };
      }
      try {
        const result = body === undefined ? await this.client.request<T>(method, path) : await this.client.request<T>(method, path, body);
        check();
        if (generation && (!object(result) || result.recoveryGeneration !== generation)) { this.invalidate(); throw new ModerationGenerationError(); }
        if(method==='POST'&&generation)await confirmedSafetyActivity(this.client,method,path,body,result,generation,current);
        check();return result;
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

/** Capture management reads from already fetched metadata; never use this to retag an old write. */
export function communityManagementRead(client:CloudClient, metadata:unknown):ModerationAccess {
  const guard=new ModerationGeneration(client,'communityManagementRecoveryGeneration');
  guard.accept(metadata);return guard.capture();
}
