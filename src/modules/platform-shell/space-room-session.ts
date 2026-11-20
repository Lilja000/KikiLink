import { CloudError, type CloudClient } from '../../cloud/client';
import { sameSpaceSource, spaceRead } from '../../cloud/space-mutation-intent';
import { type ActiveSpaceVisit, type ObservedRoom, type RoomHistory } from './room-history';
import { spaceRoomKey } from './space-directory';
import type { PersistentSpace } from './spaces-page';

export interface SpaceRoomSessionSnapshot { readonly id: string; readonly name: string | null }

/** A Space join establishes the association. Native membership and Cloud access must still agree before showing a name. */
export class SpaceRoomSession {
  readonly #origin: string;
  readonly #unsubscribe: () => void;
  #watching = false;
  #destroyed = false;
  #release: (() => void) | undefined;
  #active: ActiveSpaceVisit | undefined;
  #state: SpaceRoomSessionSnapshot | undefined;
  #revision = 0;
  #retryAt = Infinity;

  constructor(private readonly client: CloudClient, private readonly history: RoomHistory,
    private readonly readRoom: () => ObservedRoom | null, private readonly current: () => boolean,
    private readonly changed: () => void) {
    this.#origin = client.origin;
    this.#unsubscribe = client.subscribe(kind => {
      if (this.#watching && ['session', 'connection', 'ready', 'spaces', 'communities', 'relationships', 'privacy', 'profiles-cleared'].includes(kind)) {
        this.#recheck(true);
      }
    });
  }

  get snapshot(): SpaceRoomSessionSnapshot | undefined {
    return this.#state && this.#binding() === this.#active ? this.#state : undefined;
  }

  #binding(): ActiveSpaceVisit | undefined {
    if (!this.current() || !this.client.connected || this.client.origin !== this.#origin ||
        this.client.memberNumber !== this.history.owner) return;
    try { return this.history.activeSpace(this.#origin, this.readRoom); }
    catch { return; }
  }

  sync(): void {
    if (this.#destroyed) return;
    this.#watching = true;
    this.#recheck(false);
  }

  invalidate(): void {
    this.#watching = false;
    this.#revision++;
    this.#active = undefined;
    this.#release?.();
    this.#release = undefined;
    this.#show(undefined);
  }

  destroy(): void {
    this.#destroyed = true;
    this.#unsubscribe();
    this.invalidate();
  }

  #show(state: SpaceRoomSessionSnapshot | undefined): void {
    if (state?.id === this.#state?.id && state?.name === this.#state?.name) return;
    this.#state = state;
    this.changed();
  }

  #recheck(force: boolean): void {
    const binding = this.#binding();
    if (!binding) {
      if (this.#active) {
        this.invalidate();
        // A visible disconnected client can receive a new ready event without native room movement.
        this.#watching = true;
      }
      return;
    }
    const same = binding === this.#active;
    // A successful read is kept current by the retained event stream (including ready on reconnect).
    // Only an unavailable result gets a bounded retry on a subsequent native observation.
    if (same && !force && Date.now() < this.#retryAt) return;
    const revision = ++this.#revision;
    this.#active = binding;
    this.#retryAt = Infinity;
    this.#release ??= this.client.retainEvents();
    if (force || !same) this.#show(undefined);
    const valid = () => this.#watching && !this.#destroyed && revision === this.#revision && this.#binding() === binding;
    void this.#load(binding, valid).then(state => { if (valid()) this.#show(state); });
  }

  async #load(binding: ActiveSpaceVisit, valid: () => boolean): Promise<SpaceRoomSessionSnapshot | undefined> {
    try {
      const me = await this.client.request<{ memberNumber: number; features?: { persistentSpaces?: boolean } }>('GET', '/v1/me');
      if (!valid() || me?.memberNumber !== this.history.owner || me.features?.persistentSpaces !== true) return;
      const read = spaceRead(this.client, me);
      if (binding.source ? !sameSpaceSource(binding.source, read.source) : read.source.required) return;
      const space = await read.request<PersistentSpace>(`/v1/spaces/${binding.id}`);
      if (!valid() || space?.id !== binding.id) return;
      if (space.canRead === false || space.archived === true || space.spaceArchived === true) return { id: binding.id, name: null };
      const linked = space.room, native = this.readRoom();
      if (space.canRead !== true || space.archived !== false || !native || !linked ||
          typeof linked.name !== 'string' || !linked.name.trim() || linked.name.length > 80 ||
          spaceRoomKey(linked) !== spaceRoomKey({ name: native.name, searchSpace: native.space })) return;
      return { id: binding.id, name: linked.name };
    } catch (error) {
      if (!valid()) return;
      if (error instanceof CloudError && (error.status === 403 || error.status === 404)) return { id: binding.id, name: null };
      this.#retryAt = Date.now() + 30_000;
    }
  }
}
