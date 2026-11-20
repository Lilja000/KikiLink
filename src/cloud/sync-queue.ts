import {checkedProfileSource, requireProfileSource, profileMetadata, profileRead, profilePath, profileBody, profileReceipt, ProfileGenerationError} from './profile-generation';
import {checkedOwnerSettingsSource, requireOwnerSettingsSource, sameOwnerSettingsSource, ownerSettingsMetadata, ownerSettingsRead, ownerSettingsPath, ownerSettingsBody, ownerSettingsReceipt, OwnerSettingsGenerationError, type OwnerSettingsSource} from './owner-settings-generation';
import { validProfileLanguages, validProfileOffset } from "./profile-details-model";
import { CloudError, type CloudClient } from "./client";
import type { KeyValueStorage } from "../core/settings";
import { normalizePreferenceRatings } from "./preference-model";
import type { CloudProfile } from "./types";
import { communityNotificationMetadata, communityNotificationReceipt, notificationPreferencePath, readCommunityNotifications, type CommunityNotificationInput } from './community-notifications';

export type SyncKind = "Profile" | "Preferences" | "Communities";
export type SyncStatus = "Pending" | "Failed" | "Conflict" | "Synced" | "Cancelled";
export type SyncAction = "sync_paused" | "sync_resumed" | "sync_saved" | "sync_cancelled" | "sync_resolved";
type Json = Record<string, any>;
export interface SyncEntry {
  id: string; kind: SyncKind; status: SyncStatus; time: number;
  acknowledged?: boolean;
  targetName?: string;
  reason?: "connection" | "rejected" | "version" | undefined; retryAt?: number | undefined; choice?: "local" | "remote" | undefined;
}
interface Pending extends SyncEntry { method: "PUT" | "PATCH"; input: Json; base?: string; source?: OwnerSettingsSource; confirmed?: Json; }
interface State { version: 1; owner: number; origin: string; paused: boolean; pending: Pending[]; history: SyncEntry[]; }
export interface SyncReview { id: string; kind: SyncKind; fingerprint: string; remote: Json; local: Json; }
type Client = Pick<CloudClient, "memberNumber" | "origin" | "connected" | "request" | "subscribe"> & Partial<Pick<CloudClient, "rememberProfile">>;
const MAX_BYTES = 180_000, HISTORY_AGE = 30 * 86400_000;
const PROFILE_KEYS = new Set(["languages", "utcOffsetMinutes", "displayName", "bio", "statusMessage", "avatarFrame", "avatarDecoration", "publicTags", "profileStyle", "profileOutlineColor", "profileGradient", "visible", "avatarId", "bannerId", "activityVisibility", "username", "usernameRevision", "showLegacyBadge", "revision"]);
const plain = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const revision = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const canonical = (v: any): string => JSON.stringify(v, function (_key, value) {
  return plain(value) ? Object.fromEntries(Object.keys(value).sort().map(k => [k, value[k]])) : value;
});
const equal = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Only the listed revision-guarded settings may enter this queue. Never replay messages, uploads or deletes. */
function validInput(kind: SyncKind, method: string, input: unknown): input is Json {
  if (!plain(input) || !revision(input.revision) || JSON.stringify(input).length > 65_000) return false;
  if (kind === 'Communities') return method === 'PUT' && Object.keys(input).every(k=>['communityId','mode','revision'].includes(k)) &&
    typeof input.communityId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.communityId) && ['important','all'].includes(input.mode);
  if (kind === "Profile") return method === "PUT" && Object.keys(input).every(k => PROFILE_KEYS.has(k)) && typeof input.displayName === "string" && input.displayName.length <= 80 && (input.languages === undefined || validProfileLanguages(input.languages)) && (input.utcOffsetMinutes === undefined || validProfileOffset(input.utcOffsetMinutes));
  if (kind !== "Preferences" || !["PUT", "PATCH"].includes(method)) return false;
  if (!Object.keys(input).every(k => ["mode", "ratings", "updates", "revision"].includes(k))) return false;
  if (input.mode !== undefined && !["private", "score", "friends", "public"].includes(input.mode)) return false;
  const values = method === "PATCH" ? input.updates : input.ratings;
  return plain(values) && Object.keys(values).length <= (method === "PATCH" ? 200 : 500) &&
    Object.entries(values).every(([key, v]) => key.length > 0 && key.length <= 160 && !["__proto__", "constructor", "prototype"].includes(key) &&
      (method === "PATCH" && v === null || ["hate", "dislike", "neutral", "like", "love", "hard_limit", -2, -1, 0, 1, 2].includes(v)));
}

function profileValues(input: Json): Json {
  const result: Json = { bio: "", avatarFrame: "none", profileStyle: "classic", visible: true, avatarId: null, bannerId: null, ...input, displayName: input.displayName.trim() };
  delete result.revision; delete result.usernameRevision;
  // Omitted outline/gradient remove those fields in the full profile PUT.
  result.profileOutlineColor ??= null; result.profileGradient ??= null;
  for (const key of ["profileOutlineColor", "profileGradient", "avatarDecoration"]) {
    const lower = (v: any): any => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase()
      : plain(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, lower(x)])) : v;
    if (Object.hasOwn(result, key)) result[key] = lower(result[key]);
  }
  if (Array.isArray(result.publicTags)) result.publicTags = result.publicTags.map((s: string) => s.trim());
  if (typeof result.username === "string") result.username = result.username.trim().toLowerCase();
  return result;
}
function projected(item: Pending, remote: Json): { local: Json; remote: Json } {
  if (item.kind === 'Communities') return {local:{notifications:item.input.mode},remote:{notifications:remote.mode}};
  if (item.kind === "Profile") {
    const local = profileValues(item.input), theirs: Json = {};
    for (const key of Object.keys(local)) {
      theirs[key] = remote[key] ?? null;
      // A pre-angle client does not change the saved direction.
      if (key === "profileGradient" && plain(local[key]) && local[key].angle === undefined && plain(theirs[key])) {
        theirs[key] = { ...theirs[key] }; delete theirs[key].angle;
      }
    }
    if (remote.isDefault) theirs.profileState = "No saved profile";
    return { local, remote: theirs };
  }
  const ratings = normalizePreferenceRatings(remote.ratings), input = item.input;
  if (item.method === "PUT") return { local: { mode: input.mode, ratings: normalizePreferenceRatings(input.ratings) }, remote: { mode: remote.mode, ratings } };
  const local: Json = {}, theirs: Json = {};
  if (input.mode !== undefined) { local.mode = input.mode; theirs.mode = remote.mode; }
  const normalized = normalizePreferenceRatings(input.updates);
  local.ratings = Object.fromEntries(Object.keys(input.updates).map(k => [k, normalized[k] ?? null]));
  theirs.ratings = Object.fromEntries(Object.keys(input.updates).map(k => [k, ratings[k] ?? null]));
  return { local, remote: theirs };
}

export function syncErrorMessage(error: unknown): string {
  if (error instanceof OwnerSettingsGenerationError || error instanceof ProfileGenerationError) return error.message;
  const code = error instanceof CloudError ? error.code : "";
  if (code === "sync_conflict") return "Cloud has a different version. Review both values in Settings → Cloud.";
  if (code === "sync_pending") return "An earlier save is waiting in Settings → Cloud. Resolve or cancel it before saving new changes.";
  if (code === "sync_paused") return "Saved to this device’s sync queue. Resume in Settings → Cloud to send it.";
  if (code === "sync_storage_error") return "The sync queue could not be saved on this device. Your editor draft is kept. Check browser storage and retry.";
  if (code === "sync_queue_unreadable") return "The saved sync queue could not be read. It has been kept unchanged.";
  if (code === "sync_lock_unavailable") return "This browser cannot safely coordinate the sync queue between tabs. Use a browser with Web Locks support.";
  if (code === "sync_conflict_changed") return "Cloud or this queue changed while you were reviewing. Open the conflict again before choosing.";
  if (code === "sync_busy") return "A sync action is already running. Wait for it to finish.";
  if (code === "sync_retry_later") return "Cloud asked us to wait. Retry after the time shown on this item.";
  if (code === 'sync_queue_full') return 'Twenty community preferences are already waiting. Finish or cancel one before saving another.';
  if (code === 'community_notifications_unavailable') return 'Community notification defaults are not available on this Cloud server yet.';
  return "Save was not confirmed. Your queued changes are kept in Settings → Cloud; reconnect or retry there.";
}

const confirmedSync = new WeakMap<object, Map<string, {raw: string; id: string; value: Json}>>();
/** Device-local durable intent. Cross-tab Web Lock + server CAS; no background retry or revision rebasing. */
export class CloudSyncQueue {
  readonly #key: string;
  readonly #listeners = new Set<() => void>();
  readonly #unsubscribe: () => void;
  #state: State;
  #raw: string | null = null;
  #closed = false;
  #epoch = 0;
  #running = false;
  #error = "";
  constructor(readonly client: Client, readonly storage: KeyValueStorage | undefined, readonly options: {
    current(): boolean;
    record?(action: SyncAction): void;
    now?: () => number;
    lock?: <T>(name: string, action: () => Promise<T>) => Promise<T>;
  }) {
    this.#key = `kikilink:cloud-sync:${encodeURIComponent(client.origin)}:${client.memberNumber}:v1`;
    this.#state = { version: 1, owner: client.memberNumber, origin: client.origin, paused: false, pending: [], history: [] };
    try { this.#read(); } catch { /* Exposed by snapshot; never overwrite unreadable data. */ }
    this.#unsubscribe = client.subscribe(kind => { if (kind === "session") { this.#epoch++; this.#emit(); } });
  }
  #now(): number { return this.options.now?.() ?? Date.now(); }
  #check(epoch = this.#epoch, connected = false): void {
    if (this.#closed || !this.options.current() || epoch !== this.#epoch || this.client.memberNumber !== this.#state.owner || this.client.origin !== this.#state.origin) throw new CloudError("session_changed");
    if (connected && !this.client.connected) throw new CloudError("authentication_required", 401);
  }
  #read(): void {
    try {
      if (!this.storage) throw new Error("No storage");
      const result = this.storage.getItemResult?.(this.#key);
      if (result && !result.ok) throw new Error("Read failed");
      const raw = result ? result.value : this.storage.getItem(this.#key);
      if (raw === null) {
        this.#state = { ...this.#state, paused: false, pending: [], history: [] }; this.#raw = null; this.#error = ""; return;
      }
      if (raw.length > MAX_BYTES) throw new Error("Oversized");
      const data = JSON.parse(raw);
      if (!plain(data) || data.version !== 1 || data.owner !== this.client.memberNumber || data.origin !== this.client.origin || typeof data.paused !== "boolean" ||
        !Array.isArray(data.pending) || data.pending.length > 22 || !Array.isArray(data.history) || data.history.length > 100) throw new Error("Invalid queue");
      const seen = new Set<string>(), kinds = new Set<string>();
      for (const item of [...data.pending, ...data.history]) {
        if (!plain(item) || typeof item.id !== "string" || !/^[a-f0-9-]{36}$/.test(item.id) || seen.has(item.id) ||
          !["Profile", "Preferences", "Communities"].includes(item.kind) || !Number.isSafeInteger(item.time) || item.time < 0 || item.time > this.#now() + 300_000 ||
          (item.reason !== undefined && !["connection", "rejected", "version"].includes(item.reason)) ||
          (item.retryAt !== undefined && !revision(item.retryAt)) || (item.choice !== undefined && !["local", "remote"].includes(item.choice))) throw new Error("Invalid entry");
        seen.add(item.id);
      }
      for (const item of data.pending) {
        if(Object.keys(item).some(k=>!['id','kind','status','time','reason','retryAt','choice','method','input','base','source','confirmed','targetName'].includes(k)))throw new Error('Unsupported intent');
        const key=item.kind==='Communities'?`${item.kind}:${item.input?.communityId}`:item.kind;
        if (!["Pending", "Failed", "Conflict"].includes(item.status) || kinds.has(key) || !validInput(item.kind, item.method, item.input) ||
          (item.base !== undefined && (item.kind !== "Profile" || typeof item.base !== "string" || item.base.length > 65_000))) throw new Error("Invalid intent");
        if (item.source !== undefined) (item.kind === 'Profile' ? checkedProfileSource : checkedOwnerSettingsSource)(item.source);
        if(item.kind==='Communities'&&(!item.source?.required||typeof item.targetName!=='string'||!item.targetName.trim()||item.targetName.length>64))throw new Error('Invalid community intent');
        if(item.kind!=='Communities'&&item.targetName!==undefined)throw new Error('Unexpected target');
        if (item.confirmed !== undefined && (!plain(item.confirmed) || item.confirmed.revision !== item.input.revision + 1 || (item.kind === 'Communities' ? item.confirmed.communityId !== item.input.communityId : item.kind === 'Preferences' ? !plain(item.confirmed.ratings) : item.confirmed.memberNumber !== data.owner || typeof item.confirmed.displayName !== 'string') || !equal(projected(item, item.confirmed).local, projected(item, item.confirmed).remote))) throw new Error('Invalid confirmation');
        kinds.add(key);
      }
      if(data.pending.filter((i:Pending)=>i.kind==='Communities').length>20)throw new Error('Too many communities');
      for (const item of data.history) if (!["Synced", "Cancelled"].includes(item.status) || item.input !== undefined) throw new Error("Invalid history");
      this.#state = data as unknown as State; this.#raw = raw; this.#error = "";
    } catch {
      this.#error = "sync_queue_unreadable"; throw new CloudError(this.#error);
    }
  }
  #persist(state: State, late = false): void {
    if (!late) this.#check();
    else if (this.client.memberNumber !== state.owner || this.client.origin !== state.origin) throw new CloudError("session_changed");
    const raw = JSON.stringify(state);
    try {
      if (!this.storage || raw.length > MAX_BYTES || this.storage.getItem(this.#key) !== this.#raw) throw new Error("Storage changed");
      this.storage.setItem(this.#key, raw);
      if (this.storage.getItem(this.#key) !== raw) throw new Error("Write failed");
      this.#raw = raw; this.#state = state; this.#error = "";
    } catch { this.#error = "sync_storage_error"; throw new CloudError(this.#error); }
    this.#emit();
  }
  #emit(): void { for (const fn of this.#listeners) { try { fn(); } catch { /* Views do not control persistence. */ } } }
  subscribe(fn: () => void): () => void { this.#listeners.add(fn); return () => this.#listeners.delete(fn); }
  snapshot(): { paused: boolean; busy: boolean; error: string; entries: SyncEntry[] } {
    if (this.#closed || !this.options.current() || this.client.memberNumber!==this.#state.owner || this.client.origin!==this.#state.origin) return { paused: true, busy: false, error: "", entries: [] };
    const known = confirmedSync.get(this.client)?.get(this.#key);
    const metadata = (item: SyncEntry): SyncEntry => {
      const {id, kind, status, time, reason, retryAt, choice} = item;
      const acknowledged = this.#state.pending.some(p => p.id === id && (p.confirmed || known?.raw === this.#raw && known.id === id));
      const pending=this.#state.pending.find(p=>p.id===id);
      return {id, kind, status, time, reason, retryAt, choice, ...(pending?.kind==='Communities'?{targetName:pending.targetName}:{}), ...(acknowledged ? {acknowledged:true} : {})};
    };
    return { paused: this.#state.paused, busy: this.#running, error: this.#error, entries: [...this.#state.pending, ...this.#state.history.filter(i => i.time > this.#now() - HISTORY_AGE)].map(metadata) };
  }
  async #locked<T>(action: () => Promise<T>): Promise<T> {
    this.#check(); if (this.#running) throw new CloudError("sync_busy");
    this.#running = true; this.#emit(); const epoch = this.#epoch;
    try {
      const run = async (): Promise<T> => { this.#check(epoch); this.#read(); return action(); };
      if (this.options.lock) return await this.options.lock(this.#key, run);
      if (typeof navigator !== "undefined" && navigator.locks?.request) return await navigator.locks.request(this.#key, run);
      throw new CloudError("sync_lock_unavailable");
    } finally { this.#running = false; this.#emit(); }
  }
  async refresh(): Promise<void> { await this.#locked(async () => {}); }
  async setPaused(paused: boolean): Promise<void> {
    await this.#locked(async () => {
      if (this.#state.paused === paused) return;
      this.#persist({ ...this.#state, paused }); this.options.record?.(paused ? "sync_paused" : "sync_resumed");
    });
  }
  #find(id: string): Pending {
    const item = this.#state.pending.find(i => i.id === id);
    if (!item) throw new CloudError("sync_conflict_changed"); return item;
  }
  #update(item: Pending, patch: Partial<Pending>): Pending {
    const next = { ...item, ...patch, time: this.#now() };
    this.#persist({ ...this.#state, pending: this.#state.pending.map(i => i.id === item.id ? next : i) }); return next;
  }
  #finish(item: Pending, status: "Synced" | "Cancelled", choice?: "local" | "remote"): void {
    const entry: SyncEntry = { id: item.id, kind: item.kind, status, time: this.#now(), ...(choice ? { choice } : {}) };
    this.#persist({ ...this.#state, pending: this.#state.pending.filter(i => i.id !== item.id), history: [entry, ...this.#state.history.filter(i => i.time > this.#now() - HISTORY_AGE)].slice(0, 100) });
    this.options.record?.(choice ? "sync_resolved" : status === "Synced" ? "sync_saved" : "sync_cancelled");
  }
  #unchanged(): void { if (!this.storage || this.storage.getItem(this.#key) !== this.#raw) throw new CloudError('sync_storage_error'); }
  async #preflight(item: Pending, epoch: number): Promise<void> {
    this.#check(epoch, true); this.#unchanged();
    if (item.kind === 'Preferences' || item.kind === 'Communities') {
      const fresh = await (item.kind === 'Communities' ? communityNotificationMetadata : ownerSettingsMetadata)(this.client, () => { this.#check(epoch, true); this.#unchanged(); return true; });
      requireOwnerSettingsSource(item.source, fresh);
    } else {
      const {source}=await profileMetadata(this.client,()=>{this.#check(epoch,true);this.#unchanged();return true;});
      requireProfileSource(item.source,source);
    }
    this.#check(epoch, true); this.#unchanged();
  }
  async #remote(item: Pending, epoch: number): Promise<Json> {
    this.#check(epoch, true);
    if(item.kind==='Communities')return readCommunityNotifications(this.client,item.input.communityId,item.source!,()=>{this.#check(epoch,true);this.#unchanged();return true;});
    await this.#preflight(item, epoch);
    const raw = await this.client.request<Json>('GET', item.kind === 'Profile' ? profilePath(`/v1/profiles/${this.client.memberNumber}`, item.source) : ownerSettingsPath('/v1/preferences/me', item.source ?? {required:false}));
    const remote = (item.kind === 'Preferences' ? ownerSettingsRead(raw, item.source ?? {required:false}) : profileRead(raw, item.source ?? {required:false})) as Json;
    this.#unchanged();
    this.#check(epoch, true);
    if (!plain(remote) || !revision(remote.revision) || (item.kind === "Profile" ? remote.memberNumber !== this.client.memberNumber || typeof remote.displayName !== "string" : !plain(remote.ratings) || !["private", "score", "friends", "public"].includes(remote.mode))) throw new CloudError("invalid_response");
    return remote;
  }
  async write<T>(kind: SyncKind, method: "PUT" | "PATCH", input: unknown, baseline?: unknown, source?: OwnerSettingsSource): Promise<T> {
    return this.#locked(async () => {
      if (source !== undefined) (kind === 'Profile' ? checkedProfileSource : checkedOwnerSettingsSource)(source);
      if (!validInput(kind, method, input)) throw new CloudError("invalid_sync_input");
      if(kind==='Communities'&&!source?.required)throw new CloudError('invalid_sync_input');
      let item = this.#state.pending.find(i => i.kind === kind && (kind!=='Communities'||i.input.communityId===input.communityId));
      if (item && (item.method !== method || !equal(item.input, input) || source !== undefined && !sameOwnerSettingsSource(item.source, source))) throw new CloudError("sync_pending");
      if (!item) {
        if(kind==='Communities'&&this.#state.pending.filter(i=>i.kind==='Communities').length>=20)throw new CloudError('sync_queue_full');
        item = { id: crypto.randomUUID(), kind, method, input: copy(input), status: "Pending", time: this.#now(), ...(source ? {source: copy(source)} : {}) };
        if(kind==='Communities'){
          if(!plain(baseline)||baseline.communityId!==input.communityId||baseline.memberNumber!==this.client.memberNumber||baseline.revision!==input.revision||typeof baseline.communityName!=='string'||!baseline.communityName.trim()||baseline.communityName.length>64)throw new CloudError('invalid_sync_input');
          item.targetName=baseline.communityName;
        }else if (baseline !== undefined) {
          if (kind !== "Profile" || !plain(baseline) || baseline.memberNumber !== this.client.memberNumber || baseline.revision !== input.revision) throw new CloudError("invalid_sync_input");
          item.base = canonical(projected(item, baseline).remote);
        }
        this.#persist({ ...this.#state, pending: [...this.#state.pending, item] });
      }
      return await this.#send(item) as T;
    });
  }
  #rememberConfirmed(item:Pending,saved:Json,before:State,raw:string|null):void {
    if (this.client.memberNumber !== before.owner || this.client.origin !== before.origin || this.storage?.getItem(this.#key) !== raw) throw new CloudError('sync_storage_error');
    let memory = confirmedSync.get(this.client); if (!memory) confirmedSync.set(this.client, memory = new Map());
    memory.set(this.#key, {raw: raw!, id: item.id, value: copy(saved)});
    this.#persist({...before, pending: before.pending.map(p => p.id === item.id ? {...p, confirmed: copy(saved)} : p)}, true);
  }
  async #communityReceipt(item:Pending,epoch:number):Promise<Json|undefined>{
    await this.#preflight(item,epoch);
    try{
      const value=await this.client.request('GET',ownerSettingsPath(notificationPreferencePath(item.input.communityId)+'/operations/'+item.id,item.source!));
      return communityNotificationReceipt(value,item.source!,this.#state.owner,item.id,item.input as CommunityNotificationInput);
    }catch(error){if(error instanceof CloudError&&error.status===404&&error.code==='operation_not_found'){this.#check(epoch,true);this.#unchanged();return undefined;}throw error;}
  }
  async #send(item: Pending, resolved = false): Promise<Json> {
    const known = confirmedSync.get(this.client)?.get(this.#key);
    const confirmed = item.confirmed ?? (known?.raw === this.#raw && known.id === item.id ? known.value : undefined);
    if (confirmed) {
      this.#finish(item, 'Synced', resolved ? 'local' : item.choice); confirmedSync.get(this.client)?.delete(this.#key); return copy(confirmed);
    }
    if (this.#state.paused) throw new CloudError("sync_paused");
    if (item.status === "Conflict" && !resolved) throw new CloudError("sync_conflict");
    if ((item.retryAt ?? 0) > this.#now()) throw new CloudError("sync_retry_later");
    const epoch = this.#epoch;
    try {
      if(item.kind==='Communities'){
        const before=copy(this.#state),raw=this.#raw,receipt=await this.#communityReceipt(item,epoch);
        if(receipt){this.#rememberConfirmed(item,receipt,before,raw);this.#check(epoch,true);this.#finish(item,'Synced',resolved?'local':item.choice);confirmedSync.get(this.client)?.delete(this.#key);return receipt;}
      }
      const remote = await this.#remote(item, epoch), values = projected(item, remote);
      if(item.kind==='Communities'&&!remote.canWrite)throw new CloudError('community_unavailable',403);
      if (item.kind!=='Communities'&&equal(values.local, values.remote)) {
        this.#finish(item, "Synced", resolved ? "local" : item.choice);
        if (item.kind === "Profile") this.client.rememberProfile?.(remote as CloudProfile);
        return remote;
      }
      if (remote.revision !== item.input.revision || (item.kind === "Profile" && remote.autoPublishAllowed === false && !resolved) ||
        (item.base !== undefined && item.base !== canonical(values.remote)) ||
        (item.input.username !== undefined && item.input.usernameRevision !== remote.usernameRevision)) throw new CloudError("sync_conflict");
      item = this.#update(item, { status: "Pending", reason: undefined, retryAt: undefined });
      this.#check(epoch, true);
      await this.#preflight(item, epoch);
      const before = copy(this.#state), raw = this.#raw;
      const body=item.kind==='Communities'?{mode:item.input.mode,revision:item.input.revision}:copy(item.input);
      const response = await this.client.request<Json>(item.method, item.kind === 'Communities'?notificationPreferencePath(item.input.communityId):item.kind === 'Profile' ? '/v1/profiles/me' : '/v1/preferences/me', (item.kind === 'Profile' ? profileBody : ownerSettingsBody)(body, item.source, item.id));
      const saved = (item.kind === 'Communities'?communityNotificationReceipt(response,item.source!,before.owner,item.id,item.input as CommunityNotificationInput):item.kind === 'Preferences' ? ownerSettingsReceipt(response, item.source, before.owner, item.id, item.method === 'PUT' ? 'preferences-put' : 'preferences-patch', false) : profileReceipt(response, item.source, before.owner, item.id, 'profile-put', item.input.revision)) as Json;
      if (!plain(saved) || saved.revision !== item.input.revision + 1 || (item.kind === 'Profile' ? saved.memberNumber !== before.owner : item.kind==='Preferences'&&!plain(saved.ratings)) || !equal(projected(item, saved).local, projected(item, saved).remote)) throw new CloudError('invalid_response');
      this.#rememberConfirmed(item,saved,before,raw);
      this.#check(epoch, true);
      this.#finish(item, "Synced", resolved ? "local" : item.choice); confirmedSync.get(this.client)?.delete(this.#key);
      if (item.kind === "Profile") this.client.rememberProfile?.(saved as CloudProfile);
      return saved;
    } catch (error) {
      if (error instanceof OwnerSettingsGenerationError || error instanceof ProfileGenerationError || (error as {code?:string})?.code === 'recovery_generation_required') throw item.kind === 'Profile' ? new ProfileGenerationError() : new OwnerSettingsGenerationError();
      this.#check(epoch);
      if (this.#state.pending.find(p => p.id === item.id)?.confirmed || confirmedSync.get(this.client)?.get(this.#key)?.raw === this.#raw) throw error;
      this.#unchanged();
      // A committed response whose local acknowledgement failed must leave its original intent intact.
      if (this.#error === "sync_storage_error") throw error;
      const conflict = error instanceof CloudError && ["sync_conflict", "revision_conflict", "preferences_changed_on_another_device", "community_notification_conflict"].includes(error.code);
      this.#update(item, { status: conflict ? "Conflict" : "Failed", reason: conflict ? "version" : error instanceof CloudError && error.status >= 400 && error.status < 500 && ![401, 429].includes(error.status) ? "rejected" : "connection",
        retryAt: error instanceof CloudError && error.status === 429 ? this.#now() + Math.min(86400_000, Math.max(1000, error.retryAfterMs || 60_000)) : undefined });
      if (conflict) throw new CloudError("sync_conflict"); throw new CloudError("sync_failed");
    }
  }
  async retry(id: string): Promise<void> { await this.#locked(async () => { await this.#send(this.#find(id)); }); }
  async syncNow(): Promise<void> {
    await this.#locked(async () => {
      if (this.#state.paused) throw new CloudError("sync_paused");
      const epoch = this.#epoch;
      for (const item of this.#state.pending.slice()) {
        if (item.status === "Conflict" || (item.retryAt ?? 0) > this.#now()) continue;
        try { await this.#send(item); } catch { this.#check(epoch); if (this.#error) break; }
      }
    });
  }
  async cancel(id: string): Promise<void> { await this.#locked(async () => { this.#finish(this.#find(id), "Cancelled"); }); }
  async review(id: string): Promise<SyncReview> {
    return this.#locked(async () => {
      const item = this.#find(id); if (item.status !== "Conflict") throw new CloudError("sync_conflict_changed");
      const remote = await this.#remote(item, this.#epoch);
      return { id, kind: item.kind, fingerprint: canonical(item), remote, local: projected(item, remote).local };
    });
  }
  comparison(review: SyncReview): { local: Json; remote: Json } {
    const item = this.#find(review.id);
    if (canonical(item) !== review.fingerprint) throw new CloudError("sync_conflict_changed");
    return copy(projected(item, review.remote));
  }
  async resolve(review: SyncReview, choice: "local" | "remote"): Promise<void> {
    await this.#locked(async () => {
      if (!["local", "remote"].includes(choice) || this.#state.paused) throw new CloudError("sync_paused");
      let item = this.#find(review.id);
      if (item.status !== "Conflict" || canonical(item) !== review.fingerprint) throw new CloudError("sync_conflict_changed");
      const remote = await this.#remote(item, this.#epoch);
      if (!equal(remote, review.remote)) throw new CloudError("sync_conflict_changed");
      if (choice === "remote") {
        this.#finish(item, "Synced", "remote");
        if (item.kind === "Profile") this.client.rememberProfile?.(remote as CloudProfile);
        return;
      }
      item = this.#update(item, { status: "Pending", ...(item.kind==='Communities'?{id:crypto.randomUUID(),choice:'local' as const}:{}), input: { ...item.input, revision: remote.revision, ...(item.input.username !== undefined ? { usernameRevision: remote.usernameRevision } : {}) },
        ...(item.kind === "Profile" ? { base: canonical(projected(item, remote).remote) } : {}) });
      await this.#send(item, true);
    });
  }
  destroy(): void { this.#closed = true; this.#epoch++; this.#unsubscribe(); this.#listeners.clear(); this.#state = {...this.#state, pending: []}; }
}
