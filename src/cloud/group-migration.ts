import type { KeyValueStorage } from '../core/settings';
import type { CloudClient } from './client';
import { matchExact as exact, matchInteger as int, matchUuid as uuid } from '../../cloud/shared/matching.mjs';
import {checkedGroupCreationSource,checkGroupCreationSource,sendGroupCreation,type GroupCreationSource,type GroupCreationDestination} from './group-creation-intent';

export interface GroupMigrationBody { legacyId: string; title: string; members: number[] }
export interface GroupMigrationPending { body: GroupMigrationBody; createdAt: number; source?:GroupCreationSource; operationId?:string }
export interface GroupMigrationState { format: 1; pending: GroupMigrationPending | null; groups: Record<string, string>; bindings?:Record<string,GroupCreationSource> }
export type GroupMigrationLock = (key: string, run: () => Promise<void>) => Promise<unknown>;
type Client = Pick<CloudClient, 'memberNumber' | 'origin' | 'connected' | 'request'>;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const legacy = (id: unknown, owner: number): id is string => typeof id === 'string' &&
  /^group2_[1-9][0-9]*_[a-z0-9_-]{8,31}$/.test(id) && id.startsWith(`group2_${owner}_`);
export function checkedGroupMigration(value: unknown, owner: number): GroupMigrationPending {
  if (!(exact(value, ['body', 'createdAt'])||exact(value,['body','createdAt','source'])||exact(value,['body','createdAt','source','operationId'])) || !int(value.createdAt, 1, 8640000000000000) ||
    !exact(value.body, ['legacyId', 'title', 'members']) || !legacy(value.body.legacyId, owner) ||
    typeof value.body.title !== 'string' || !value.body.title.trim() || value.body.title.length > 60 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value.body.title) ||
    !Array.isArray(value.body.members) || value.body.members.length < 2 || value.body.members.length > 4 ||
    value.body.members.some(n => !int(n, 1) || n === owner) || new Set(value.body.members).size !== value.body.members.length)
    throw new Error('This group migration request is unsupported. Saved data has been kept unchanged.');
  if(value.source!==undefined){const source=checkedGroupCreationSource(value.source);if(source.required?!uuid(value.operationId):value.operationId!==undefined)throw new Error('This group migration request has an invalid operation identity. Saved data has been kept.');}
  return structuredClone(value) as unknown as GroupMigrationPending;
}
function checkedState(value: unknown, owner: number): GroupMigrationState {
  if (!(exact(value, ['format', 'pending', 'groups'])||exact(value,['format','pending','groups','bindings'])) || value.format !== 1 || !value.groups ||
    typeof value.groups !== 'object' || Array.isArray(value.groups) || Object.keys(value.groups).length > 100 ||
    Object.entries(value.groups).some(([id, target]) => !legacy(id, owner) || !uuid(target)))
    throw new Error('The saved group migration data is unsupported. It has been kept unchanged.');
  const pending = value.pending === null ? null : checkedGroupMigration(value.pending, owner);
  if (pending && Object.hasOwn(value.groups, pending.body.legacyId))
    throw new Error('The saved group migration data conflicts. It has been kept unchanged.');
  if(value.bindings!==undefined){
    if(!value.bindings||typeof value.bindings!=='object'||Array.isArray(value.bindings)||Object.keys(value.bindings).some(id=>!Object.hasOwn(value.groups as object,id)))throw new Error('The saved destination identities are unsupported. Their bytes are kept.');
    for(const source of Object.values(value.bindings))checkedGroupCreationSource(source);
  }
  return { format: 1, pending, groups: { ...value.groups } as Record<string, string>,...value.bindings?{bindings:structuredClone(value.bindings) as Record<string,GroupCreationSource>}:{}};
}

/** One frozen intent plus durable destinations, scoped to this account and Cloud origin.
 * The old unscoped v1 marker and all legacy group/history data are read-only to this flow.
 * Loading and reconnecting never send a mutation. */
export class GroupMigrationRecovery {
  readonly owner: number;
  readonly origin: string;
  readonly key: string;
  constructor(readonly client: Client, readonly storage: KeyValueStorage, readonly current: () => boolean,
    readonly isBlocked: (member: number) => boolean = () => false, readonly lock?: GroupMigrationLock) {
    this.owner = client.memberNumber; this.origin = client.origin;
    if (!int(this.owner, 1) || !this.origin) throw new Error('Connect to a Cloud account first.');
    this.key = `kikilink:group-migration:${encodeURIComponent(this.origin)}:${this.owner}:v1`;
  }
  #guard(valid: () => boolean): void {
    if (!this.current() || !valid() || this.client.memberNumber !== this.owner || this.client.origin !== this.origin)
      throw new Error('Your account or group view changed. The saved request is kept.');
  }
  #raw(): string | null {
    try {
      const result = this.storage.getItemResult?.(this.key);
      if (result && !result.ok) throw new Error();
      return result ? result.value : this.storage.getItem(this.key);
    } catch { throw new Error('The saved group migration data could not be read. Nothing has been replaced.'); }
  }
  #snapshot(): { raw: string | null; state: GroupMigrationState } {
    this.#guard(() => true);
    const raw = this.#raw();
    if (raw === null) return { raw, state: { format: 1, pending: null, groups: {} } };
    if (raw.length > 32768) throw new Error('The saved group migration data is too large. It has been kept.');
    let value: unknown;
    try { value = JSON.parse(raw); }
    catch { throw new Error('The saved group migration data is unreadable. It has been kept unchanged.'); }
    return { raw, state: checkedState(value, this.owner) };
  }
  read(): GroupMigrationState { return this.#snapshot().state; }
  #write(expected: string | null, state: GroupMigrationState, valid: () => boolean): void {
    this.#guard(valid);
    if (this.#raw() !== expected) throw new Error('The saved request changed in another tab. Reopen this view.');
    const raw = JSON.stringify(checkedState(state, this.owner));
    try {
      this.storage.setItem(this.key, raw);
      if (this.#raw() !== raw) throw new Error();
    } catch { throw new Error('Saving the group migration on this device could not be confirmed. Reopen this view to check it.'); }
  }
  async #locked(run: () => Promise<void>): Promise<void> {
    if (this.lock) await this.lock(this.key, run);
    else if (globalThis.navigator?.locks) await navigator.locks.request(this.key, run);
    else throw new Error('This browser needs Web Locks to save group migration requests safely.');
  }
  async prepare(value: GroupMigrationPending, valid: () => boolean): Promise<void> {
    const pending = checkedGroupMigration(value, this.owner);
    await this.#locked(async () => {
      this.#guard(valid); const { raw, state } = this.#snapshot();
      if (state.pending) {
        if (!same(state.pending, pending)) throw new Error('Recover the saved group migration request first.');
        return;
      }
      if (state.groups[pending.body.legacyId]) throw new Error('This group already has a saved Cloud destination. Open it from this view.');
      if (Object.keys(state.groups).length >= 100) throw new Error('The saved group migration limit has been reached. Existing destinations are kept.');
      this.#write(raw, { ...state, pending }, valid);
    });
  }
  async run(value: GroupMigrationPending, valid: () => boolean): Promise<string> {
    const expected = checkedGroupMigration(value, this.owner); let groupId = '';
    await this.#locked(async () => {
      this.#guard(valid); const { raw, state } = this.#snapshot();
      if (!state.pending || !same(state.pending, expected)) throw new Error('The saved request changed in another tab. Reopen this view.');
      if (!this.client.connected) throw new Error('Reconnect to retry the saved group migration.');
      const pending=state.pending;
      const receipt=await sendGroupCreation(this.client,'migrate',pending.source,pending.body,pending.operationId,()=>{this.#guard(valid);return true;},()=>{
        if(this.#raw()!==raw)throw new Error('The saved request changed in another tab. Reopen this view.');
        if(pending.body.members.some(this.isBlocked))throw new Error('A person in this saved group is blocked. No migration request was sent.');
      });
      this.#guard(valid);
      groupId = receipt.groupId;
      this.#write(raw, {...state,pending:null,groups:{...state.groups,[pending.body.legacyId]:groupId},
        ...pending.source?{bindings:{...state.bindings,[pending.body.legacyId]:pending.source}}:{}},valid);
    });
    return groupId;
  }
  async destination(legacyId:string,valid:()=>boolean):Promise<GroupCreationDestination>{
    this.#guard(valid);const {raw,state}=this.#snapshot(),groupId=state.groups[legacyId];
    if(!groupId)throw new Error('This saved destination is unavailable.');
    const me=await this.client.request<unknown>('GET','/v1/me');this.#guard(valid);
    if(!me||typeof me!=='object'||(me as {memberNumber?:unknown}).memberNumber!==this.owner)throw new Error('The Cloud account changed. The saved destination is kept.');
    const source=checkGroupCreationSource(state.bindings?.[legacyId],me);
    if(this.#raw()!==raw)throw new Error('The saved destination changed in another tab. Reopen this view.');
    return {groupId,...source.generation?{generation:source.generation}:{}};
  }
  async forget(value: GroupMigrationPending, valid: () => boolean): Promise<void> {
    const expected = checkedGroupMigration(value, this.owner);
    await this.#locked(async () => {
      this.#guard(valid); const { raw, state } = this.#snapshot();
      if (!state.pending || !same(state.pending, expected)) throw new Error('The saved request changed in another tab. Reopen this view.');
      this.#write(raw, { ...state, pending: null }, valid);
    });
  }
}
