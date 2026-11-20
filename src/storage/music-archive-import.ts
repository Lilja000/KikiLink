import type { SettingsStore, MusicSettingsBaseline } from '../core/settings';
import { deviceMusicDatabaseName, type MusicStore, type DeviceMusicTrack } from './device-music-store';
import { MUSIC_TRACKS, MUSIC_IMPORTS, checkMusicLayout, openMusicDatabase } from './music-database';
import { musicRowsKey, prepareMusicCopy, prepareMusicAttempt, checkMusicCopies, type MusicArchiveSource, type MusicImportCopy, type MusicRow } from './music-import-recovery';
import { prepareMusicSource, planMusicImport, mergeMusicPatch, type MusicSource } from './music-import-model';
import { exportValueEncoder } from './device-data-export';
import { storedZip, type ZipFile } from '../utils/stored-zip';
import { prepareMusicFields, snapshotMusicSource } from './music-archived-fields';

export interface MusicImportReview { readonly resume: boolean; readonly files: number; readonly entries: number; readonly newPlaylists: number; readonly kept: number; readonly excluded: number; readonly bytes: number; readonly recoveryBytes: number }
interface State { rows: MusicRow[]; copies: MusicImportCopy[] }
interface Pending { review: MusicImportReview; baseline: MusicSettingsBaseline; keys: string; journal: string; source?: MusicArchiveSource; prepared?: MusicSource; additions?: string; copyId?: number }
const journalState = (copies: MusicImportCopy[]) => JSON.stringify(copies.map(copy => [copy.id,copy.createdAt,copy.bytes,copy.phase,copy.settingsAttempts.length]).sort((a,b) => Number(a[0])-Number(b[0])));
const sameBaseline = (a: MusicSettingsBaseline,b: MusicSettingsBaseline) => a.saved === b.saved && a.canonical === b.canonical;

/** Native files are atomic with their recovery copy. Settings are a separate, resumable second step. */
export class MusicArchiveImporter {
  readonly name: string; #pending: Pending | undefined;
  #generation = 0;
  constructor(readonly owner: number, readonly settings: SettingsStore, readonly destination: MusicStore, readonly factory: IDBFactory = indexedDB) {
    if (!Number.isSafeInteger(owner) || owner <= 0) throw new Error('A signed-in account is required.'); this.name = deviceMusicDatabaseName(owner);
  }
  cancel(): void { ++this.#generation; this.#pending = undefined; }
  #check(current: () => boolean, signal: AbortSignal): void { if (!current() || signal.aborted) throw new Error('Music import cancelled.'); }
  #writable(): void { if (!this.destination.archiveImportDestination?.(this.owner)) throw new Error('Music is available for this session only. Reload with device storage available before importing.'); }
  #baseline(expected: MusicSettingsBaseline): void {
    this.#writable(); if (!sameBaseline(this.settings.musicImportSnapshot(),expected)) throw new Error('Settings changed. Review the music import again.');
  }
  async review(source: MusicArchiveSource, current: () => boolean, signal: AbortSignal): Promise<MusicImportReview> {
    this.cancel(); this.#writable(); const generation = this.#generation, check = () => this.#check(() => generation === this.#generation && current(),signal);
    check(); source = snapshotMusicSource(source); const prepared = prepareMusicSource(source,this.owner,check);
    prepared.files = await prepareMusicFields(source,prepared.files,check); const state = await this.#read(check,signal);
    check(); if (state.copies.some(copy => copy.phase === 'pending')) throw new Error('Review and finish the unfinished music import first.');
    const baseline = this.settings.musicImportSnapshot(), plan = planMusicImport(prepared,state.rows,this.settings.getSection('linkMusic').playlists);
    const copy = plan.added.length ? prepareMusicCopy(state.copies,this.owner,state.rows,baseline,source,plan.added,plan.patch) : undefined;
    const review = Object.freeze({resume:false,files:plan.added.length,entries:plan.entries,newPlaylists:plan.newPlaylists,kept:plan.kept,excluded:plan.excluded,bytes:plan.bytes,recoveryBytes:copy?.bytes ?? 0});
    this.#pending = {review,baseline,keys:musicRowsKey(state.rows),journal:journalState(state.copies),source,prepared,additions:JSON.stringify({ids:plan.added.map(file => file.id),patch:plan.patch})}; return review;
  }
  async reviewPending(current: () => boolean, signal: AbortSignal): Promise<MusicImportReview> {
    this.cancel(); this.#writable(); const generation = this.#generation, check = () => this.#check(() => generation === this.#generation && current(),signal), state = await this.#read(check,signal), copy = state.copies.find(copy => copy.phase === 'pending');
    if (!copy) throw new Error('There is no unfinished music import.');
    if (!await this.#filesPresent(copy,state.rows,check)) throw new Error('The unfinished import’s files changed. Keep the recovery copies before retrying.');
    check(); const baseline = this.settings.musicImportSnapshot(), plan = mergeMusicPatch(this.settings.getSection('linkMusic').playlists,copy.patch), next = prepareMusicAttempt(state.copies,copy.id,this.owner,baseline);
    const review = Object.freeze({resume:true,files:copy.added.length,entries:plan.entries,newPlaylists:plan.newPlaylists,kept:0,excluded:0,bytes:copy.added.reduce((n,file) => n+file.blob.size,0),recoveryBytes:next.bytes-copy.bytes});
    this.#pending = {review,baseline,keys:musicRowsKey(state.rows),journal:journalState(state.copies),copyId:copy.id}; return review;
  }
  async apply(review: MusicImportReview, current: () => boolean, signal: AbortSignal): Promise<number> {
    const pending = this.#pending; this.cancel(); const generation = this.#generation, active = () => generation === this.#generation && current(), check = () => this.#check(active,signal);
    if (!pending || pending.review !== review || (!review.resume && !review.files)) throw new Error('This music review expired. Review it again.');
    check(); this.#baseline(pending.baseline); await this.#inventory(check);
    const db = await openMusicDatabase(this.name,this.factory,true,check,signal); let saved: MusicImportCopy | undefined;
    try {
      await this.#transaction(db,'readwrite',check,signal,state => {
        this.#baseline(pending.baseline);
        if (musicRowsKey(state.rows) !== pending.keys || journalState(state.copies) !== pending.journal) throw new Error('Music files or recovery copies changed. Review the import again.');
        if (review.resume) {
          const previous = state.copies.find(copy => copy.id === pending.copyId)!;
          saved = prepareMusicAttempt(state.copies,pending.copyId!,this.owner,pending.baseline);
          if (saved.bytes-previous.bytes !== review.recoveryBytes) throw new Error('The music recovery size changed. Review it again.');
          return tx => { check(); tx.objectStore(MUSIC_IMPORTS).put(saved!); };
        }
        const plan = planMusicImport(pending.prepared!,state.rows,this.settings.getSection('linkMusic').playlists);
        if (JSON.stringify({ids:plan.added.map(file => file.id),patch:plan.patch}) !== pending.additions) throw new Error('Music capacity changed. Review the import again.');
        saved = prepareMusicCopy(state.copies,this.owner,state.rows,pending.baseline,pending.source!,plan.added,plan.patch);
        if (saved.bytes !== review.recoveryBytes) throw new Error('The music recovery size changed. Review the import again.');
        return tx => { check(); tx.objectStore(MUSIC_IMPORTS).add(saved!); for (const file of plan.added) { check(); tx.objectStore(MUSIC_TRACKS).add(file); } };
      });
    } finally { db.close(); }
    try {
      // The durable pending copy protects files through cancellation, reload and settings failure.
      check(); const state = await this.#read(check,signal), copy = state.copies.find(copy => copy.id === saved!.id);
      if (!copy || copy.phase !== 'pending' || journalState([copy]) !== journalState([saved!]) || !await this.#filesPresent(copy,state.rows,check)) throw new Error('Saved music changed.');
      check(); this.#baseline(pending.baseline); const plan = mergeMusicPatch(this.settings.getSection('linkMusic').playlists,copy.patch);
      if (plan.entries) this.settings.applyImportedMusic(plan.playlists,pending.baseline,() => active() && !signal.aborted && Boolean(this.destination.archiveImportDestination?.(this.owner)));
      check(); const completed = await openMusicDatabase(this.name,this.factory,false,check,signal);
      try {
        await this.#transaction(completed,'readwrite',check,signal,next => {
          this.#writable(); this.settings.musicImportSnapshot(); const actual = next.copies.find(c => c.id === copy.id);
          if (!actual || actual.phase !== 'pending' || journalState([actual]) !== journalState([copy]) || mergeMusicPatch(this.settings.getSection('linkMusic').playlists,copy.patch).entries) throw new Error('The import changed before completion.');
          return tx => { check(); tx.objectStore(MUSIC_IMPORTS).put({...actual,phase:'complete'}); };
        });
      } finally { completed.close(); }
      const result = await this.inspectLast(active,signal);
      if (result.id !== saved!.id || result.state !== 'complete') throw new Error('The result changed.');
    } catch {
      throw new Error('Music files and recovery originals were saved, but completion could not be confirmed. Reload, check the last music import and review any unfinished import. Do not start another import yet.');
    }
    return saved!.id;
  }
  async recoveryState(current: () => boolean, signal: AbortSignal): Promise<{count:number;pending:boolean}> {
    const state = await this.#read(() => this.#check(current,signal),signal); return {count:state.copies.length,pending:state.copies.some(copy => copy.phase === 'pending')};
  }
  async inspectLast(current: () => boolean, signal: AbortSignal): Promise<{id:number;state:'complete'|'pending'|'changed'}> {
    const check = () => this.#check(current,signal), state = await this.#read(check,signal), copy = [...state.copies].sort((a,b) => a.id-b.id).at(-1);
    if (!copy) throw new Error('There are no saved music import copies.');
    if (!await this.#filesPresent(copy,state.rows,check)) return {id:copy.id,state:'changed'};
    if (copy.phase === 'pending') return {id:copy.id,state:'pending'};
    try { check(); this.settings.musicImportSnapshot(); if (mergeMusicPatch(this.settings.getSection('linkMusic').playlists,copy.patch).entries) return {id:copy.id,state:'changed'}; }
    catch { return {id:copy.id,state:'changed'}; }
    return {id:copy.id,state:'complete'};
  }
  async #filesPresent(copy: MusicImportCopy, rows: MusicRow[], check: () => void): Promise<boolean> {
    const values = new Map(rows.map(row => [row.key,row.value]));
    for (const expected of copy.added) {
      check(); const actual = values.get(expected.id) as DeviceMusicTrack | undefined;
      if (!actual || ['id','name','mimeType','roomExtension','createdAt','archivedFields'].some(key => (actual as any)[key] !== (expected as any)[key]) || !(actual.blob instanceof Blob) || actual.blob.size !== expected.blob.size || actual.blob.type !== expected.blob.type) return false;
      // Bounded chunks avoid allocating two full-length audio buffers at once.
      for (let offset = 0; offset < expected.blob.size; offset += 1024*1024) {
        const a = new Uint8Array(await actual.blob.slice(offset,offset+1024*1024).arrayBuffer()), b = new Uint8Array(await expected.blob.slice(offset,offset+1024*1024).arrayBuffer()); check();
        if (a.some((value,index) => value !== b[index])) return false;
      }
    }
    return true;
  }
  async recoveryDownload(current: () => boolean, signal: AbortSignal): Promise<Blob> {
    const check = () => this.#check(current,signal), state = await this.#read(check,signal);
    if (!state.copies.length) throw new Error('There are no saved music import copies.');
    const files: ZipFile[] = [], encode = exportValueEncoder(files,check);
    files.push({name:'recovery.json',blob:new Blob([JSON.stringify({format:'kikilink-music-recovery',version:1,owner:this.owner,database:this.name,copies:encode(state.copies)})],{type:'application/json'})});
    files.push({name:'README.txt',blob:new Blob(['Private music import recovery copies: exact source files/settings, native pre-import records and saved settings retry baselines. Not a device import ZIP. No automatic undo. Finish a pending import from Data & about on its original device.\n'])});
    return storedZip(files,check);
  }
  async #inventory(check: () => void): Promise<IDBDatabaseInfo | undefined> {
    check(); if (typeof this.factory.databases !== 'function') throw new Error('This browser cannot safely inspect music storage.');
    const entry = (await this.factory.databases()).find(db => db.name === this.name); check();
    if (entry && entry.version !== 1 && entry.version !== 2) throw new Error('Music storage needs a newer KikiLink version.'); return entry;
  }
  async #read(check: () => void, signal: AbortSignal): Promise<State> {
    if (!await this.#inventory(check)) return {rows:[],copies:[]};
    const db = await openMusicDatabase(this.name,this.factory,false,check,signal); let state: State | undefined;
    try { await this.#transaction(db,'readonly',check,signal,value => { state = value; }); } finally { db.close(); }
    check(); return state!;
  }
  #transaction(db: IDBDatabase, mode: IDBTransactionMode, check: () => void, signal: AbortSignal, ready: (state: State) => ((tx: IDBTransaction) => void) | void): Promise<void> {
    return new Promise((resolve,reject) => {
      check(); const names = db.version === 1 ? [MUSIC_TRACKS] : [MUSIC_TRACKS,MUSIC_IMPORTS], tx = db.transaction(names,mode);
      let reason = 'The music transaction failed. Its files and recovery copy were not partially committed.';
      const abort = () => { try { tx.abort(); } catch { /* Already settled. */ } };
      const timer = setTimeout(abort,30000); signal.addEventListener('abort',abort,{once:true}); db.onversionchange = abort;
      const finish = () => { clearTimeout(timer); signal.removeEventListener('abort',abort); };
      tx.onabort = () => { finish(); reject(new Error(reason)); }; tx.oncomplete = () => { finish(); resolve(); };
      const state: State = {rows:[],copies:[]}; let done = 0;
      try {
        checkMusicLayout(db,tx,db.version === 2);
        for (const name of names) {
          const request = tx.objectStore(name).openCursor();
          request.onsuccess = () => {
            try {
              check(); const cursor = request.result;
              if (!cursor) { if (++done === names.length) { musicRowsKey(state.rows); checkMusicCopies(state.copies,this.owner); ready(state)?.(tx); } return; }
              if (name === MUSIC_TRACKS) { if (state.rows.length >= 100) throw new Error('Current music storage exceeds its file limit.'); state.rows.push({key:cursor.primaryKey,value:cursor.value}); }
              else { if (state.copies.length >= 3 || cursor.value?.id !== cursor.primaryKey) throw new Error('Music recovery storage is unsupported.'); state.copies.push(cursor.value); }
              cursor.continue();
            } catch(e) { reason = e instanceof Error ? e.message : reason; abort(); }
          };
        }
      } catch(e) { reason = e instanceof Error ? e.message : reason; abort(); }
    });
  }
}
