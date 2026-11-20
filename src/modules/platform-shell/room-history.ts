import type { KeyValueStorage } from '../../core/settings';
import { sameSpaceSource, type SpaceRecoverySource } from '../../cloud/space-mutation-intent';

export type RoomVisit = { at: number } & ({ kind: 'lobby'; name: string; space: '' | 'X' | 'M' } | { kind: 'space'; id: string; origin?: string });
export interface ObservedRoom { name: string; space: '' | 'X' | 'M' }
export interface ActiveSpaceVisit { readonly id: string; readonly origin: string; readonly source?: SpaceRecoverySource }
export const ROOM_HISTORY_KEY = 'kikilink:platform:room-history:v1';
const roomKey = (name: string, space: string): string => JSON.stringify([space, name.trim().toUpperCase()]);
const spaceId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
function cloudOrigin(value: unknown): value is string {
  if(typeof value!=='string'||value.length>512)return false;
  try{const url=new URL(value),base=`${url.origin}${url.pathname==='/'?'':url.pathname.replace(/\/$/u,'')}`;
    return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&/^\/(?:[A-Za-z0-9._~-]+\/?)*$/u.test(url.pathname)&&base===value;
  }catch{return false;}
}
function validVisit(value: unknown): value is RoomVisit {
  if (!value || typeof value !== 'object') return false;
  const v = value as RoomVisit;
  return Number.isSafeInteger(v.at) && v.at > 0 && v.at <= Date.now() + 60000 &&
    (v.kind === 'space' ? spaceId(v.id) && (v.origin === undefined || cloudOrigin(v.origin)) : v.kind === 'lobby' && typeof v.name === 'string' && !!v.name.trim() && v.name.length <= 100 && ['', 'X', 'M'].includes(v.space));
}
function validSource(source: SpaceRecoverySource): boolean {
  return !!source && typeof source.required === 'boolean' &&
    (source.generation === undefined ? !source.required : typeof source.generation === 'string' && /^[a-f0-9]{32}$/u.test(source.generation)) &&
    (source.restored === undefined || typeof source.restored === 'boolean');
}

/** Device history of observed native membership. Cloud visits keep a source and identifier, never cached Space metadata. */
export class RoomHistory {
  #items: RoomVisit[] = [];
  #lastRoom: string | null = null;
  #active: ActiveSpaceVisit | undefined;
  #readFailed = false;
  #writePending = false;
  error = '';
  constructor(readonly storage: KeyValueStorage | undefined, readonly owner: number, readonly current: () => boolean) {
    if (!current()) return;
    try {
      const result = storage?.getItemResult?.(ROOM_HISTORY_KEY);
      if (result && !result.ok) throw new Error('Storage is not readable');
      const raw = result?.ok ? result.value : storage?.getItem(ROOM_HISTORY_KEY);
      if (!raw || raw.length > 40000) return;
      const saved = JSON.parse(raw);
      if (saved.owner !== owner || !Array.isArray(saved.items)) return;
      this.#items = saved.items.filter(validVisit).sort((a: RoomVisit, b: RoomVisit) => b.at - a.at).slice(0, 50);
      this.#lastRoom = typeof saved.lastRoom === 'string' && saved.lastRoom.length <= 250 ? saved.lastRoom : null;
      // A historical visit can survive a native departure. Restore only an explicit active association.
      const active = saved.activeSpace;
      if (this.#lastRoom && active && spaceId(active.id) && cloudOrigin(active.origin) &&
          validSource(active.source)) {
        this.#active = Object.freeze({ id: active.id, origin: active.origin,
          ...(active.source && { source: Object.freeze({ ...active.source }) }) });
      }
    } catch { this.#readFailed = true; this.error = 'Visit history could not be read. Reload the game to try again.'; }
  }
  get items(): RoomVisit[] { return this.current() ? this.#items.map(v => ({ ...v })) : []; }
  activeSpace(origin: string, readRoom: () => ObservedRoom | null): ActiveSpaceVisit | undefined {
    if (this.#active?.origin !== origin || !this.current()) return;
    const room = readRoom();
    return room && this.#lastRoom === roomKey(room.name, room.space) ? this.#active : undefined;
  }
  retrySave(): void { if (this.#writePending && !this.#readFailed) this.#save(); }
  observe(room: ObservedRoom | null, id?: string, origin?: string, source?: SpaceRecoverySource): boolean {
    if (!this.current()) return false;
    if (!room) {
      if (this.#lastRoom !== null) {
        this.#lastRoom = null; this.#active = undefined;
        if (!this.#readFailed) this.#save();
      }
      return false;
    }
    const name = room.name.trim();
    if (!name || name.length > 100 || !['', 'X', 'M'].includes(room.space)) return false;
    // Never resolve an unproven Space identifier against a guessed Cloud.
    if(id!==undefined&&(!spaceId(id)||!cloudOrigin(origin)||source && !validSource(source)))return false;
    const key = roomKey(name, room.space), sameRoom = key === this.#lastRoom;
    const previous = this.#active;
    this.#lastRoom = key;
    if (!sameRoom) this.#active = undefined;
    if (id && origin && (this.#active?.id !== id || this.#active.origin !== origin ||
        source && (!this.#active.source || !sameSpaceSource(source, this.#active.source)))) {
      this.#active = Object.freeze({ id, origin, ...(source && { source: Object.freeze({ ...source }) }) });
    }
    if (this.#readFailed) return false;
    // A successful Space join may be observed by BC before its promise settles.
    // Replace that one native visit, without retaining the private Space name.
    const first = this.#items[0];
    const replaceLobby = sameRoom && first?.kind === 'lobby' && roomKey(first.name, first.space) === key;
    const newSpace = first?.kind === 'space' && (first.id !== id || first.origin !== origin);
    if (sameRoom && (!id || !replaceLobby && !newSpace)) {
      // Keep an active association when the user clears history while still in the room.
      if (this.#active !== previous) this.#save();
      return false;
    }
    const at = replaceLobby ? first.at : Date.now();
    if (replaceLobby) this.#items.shift();
    const visit: RoomVisit = spaceId(id) ? { kind: 'space', id, origin:origin!, at } : { kind: 'lobby', name, space: room.space, at };
    this.#items.unshift(visit); this.#items.length = Math.min(this.#items.length, 50);
    this.#save(); return true;
  }
  clear(): boolean {
    if (!this.current() || this.#readFailed) return false;
    const previous = this.#items; this.#items = [];
    if (!this.#save()) { this.#items = previous; return false; }
    // Keep the current room marker: refreshing must not undo an explicit clear.
    return true;
  }
  #save(): boolean {
    if (!this.current()) return false;
    try {
      const saved = JSON.stringify({ owner: this.owner, lastRoom: this.#lastRoom, activeSpace: this.#active ?? null, items: this.#items });
      this.storage?.setItem(ROOM_HISTORY_KEY, saved);
      if (this.storage && this.storage.getItem(ROOM_HISTORY_KEY) !== saved) throw new Error('Write was not retained');
      this.#writePending = false;
      this.error = this.storage ? '' : 'Visit history is available for this session only.';
      return true;
    } catch { this.#writePending = true; this.error = 'Visit history could not be saved. Refresh history to retry.'; return false; }
  }
}
