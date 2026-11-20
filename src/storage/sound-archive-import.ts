import { deviceSoundDatabaseName, type DeviceNotificationSound, type NotificationSoundStore } from './device-notification-sound-store';
import { SOUND_RECORDS, SOUND_IMPORTS, checkSoundLayout, openSoundDatabase } from './sound-database';
import { soundKeys, prepareSounds, planSoundImport, prepareSoundCopy, checkSoundCopies, snapshotSoundSource,
  type SoundArchiveSource, type SoundImportCopy, type SoundRow } from './sound-import-model';
import { exportValueEncoder } from './device-data-export';
import { storedZip, type ZipFile } from '../utils/stored-zip';

export interface SoundImportReview { readonly sounds: number; readonly kept: number; readonly excluded: number; readonly bytes: number; readonly recoveryBytes: number }
interface State { rows: SoundRow[]; copies: SoundImportCopy[] }
const journalState = (copies: SoundImportCopy[]) => JSON.stringify(copies.map(copy => [copy.id,copy.createdAt,copy.bytes]).sort((a,b) => a[0]!-b[0]!));

export class SoundArchiveImporter {
  readonly name: string;
  #pending: {review: SoundImportReview; source: SoundArchiveSource; sounds: DeviceNotificationSound[]; keys: string; journal: string; added: string} | undefined;
  #generation = 0;
  constructor(readonly owner: number, readonly destination: NotificationSoundStore, readonly factory: IDBFactory = indexedDB) {
    if (!Number.isSafeInteger(owner) || owner <= 0) throw new Error('A signed-in account is required.'); this.name = deviceSoundDatabaseName(owner);
  }
  #writable(): void { if (!this.destination.archiveImportDestination?.(this.owner)) throw new Error('Custom sounds are available for this session only. Reload with device storage available before importing.'); }
  cancel(): void { ++this.#generation; this.#pending = undefined; }
  #check(current: () => boolean, signal: AbortSignal): void { if (!current() || signal.aborted) throw new Error('Sound import cancelled.'); }
  async review(source: SoundArchiveSource, current: () => boolean, signal: AbortSignal): Promise<SoundImportReview> {
    this.cancel(); this.#writable(); const generation = this.#generation, check = () => this.#check(() => generation === this.#generation && current(),signal);
    check(); source = snapshotSoundSource(source);
    const sounds = await prepareSounds(source,this.owner,check,signal), state = await this.#read(check,signal);
    check(); checkSoundCopies(state.copies,this.owner); const plan = planSoundImport(sounds,state.rows);
    const copy = plan.added.length ? prepareSoundCopy(state.copies,this.owner,state.rows,source,plan.added) : undefined;
    const review = Object.freeze({sounds:plan.added.length,kept:plan.kept,excluded:plan.excluded,bytes:plan.bytes,recoveryBytes:copy?.bytes ?? 0});
    this.#pending = {review,source,sounds,keys:soundKeys(state.rows),journal:journalState(state.copies),added:JSON.stringify(plan.added.map(sound => sound.id))}; return review;
  }
  async apply(review: SoundImportReview, current: () => boolean, signal: AbortSignal): Promise<number> {
    const pending = this.#pending; this.cancel(); const generation = this.#generation, active = () => generation === this.#generation && current(), check = () => this.#check(active,signal);
    if (!pending || pending.review !== review || !review.sounds) throw new Error('This Sound review expired. Review the archive again.');
    check(); this.#writable(); await this.#inventory(check); const db = await openSoundDatabase(this.name,this.factory,true,check,signal);
    let copy: SoundImportCopy | undefined;
    try {
      await this.#transaction(db,'readwrite',check,signal,state => {
        this.#writable();
        if (soundKeys(state.rows) !== pending.keys || journalState(state.copies) !== pending.journal) throw new Error('Sound contents or recovery copies changed. Review the archive again.');
        const plan = planSoundImport(pending.sounds,state.rows);
        if (JSON.stringify(plan.added.map(sound => sound.id)) !== pending.added) throw new Error('Sound capacity changed. Review the archive again.');
        copy = prepareSoundCopy(state.copies,this.owner,state.rows,pending.source,plan.added);
        if (copy.bytes !== review.recoveryBytes) throw new Error('The Sound recovery size changed. Review the archive again.');
        return tx => {
          check(); tx.objectStore(SOUND_IMPORTS).add(copy!);
          for (const sound of plan.added) { check(); tx.objectStore(SOUND_RECORDS).add(sound); }
          check();
        };
      });
    } finally { db.close(); }
    try {
      const result = await this.inspectLast(active,signal);
      if (result.id !== copy!.id || result.state !== 'present') throw new Error();
    } catch { throw new Error('The Sound write completed, but its result could not be confirmed. Reload and check the last Sound import before retrying.'); }
    return copy!.id;
  }
  async recoveryCount(current: () => boolean, signal: AbortSignal): Promise<number> {
    const state = await this.#read(() => this.#check(current,signal),signal); return state.copies.length;
  }
  async inspectLast(current: () => boolean, signal: AbortSignal): Promise<{id:number;state:'present'|'changed'}> {
    const check = () => this.#check(current,signal), state = await this.#read(check,signal); checkSoundCopies(state.copies,this.owner);
    const copy = [...state.copies].sort((a,b) => a.id-b.id).at(-1); if (!copy) throw new Error('There are no saved Sound import copies.');
    const rows = new Map(state.rows.map(row => [row.key,row.value]));
    for (const expected of copy.added) {
      check(); const actual = rows.get(expected.id) as DeviceNotificationSound | undefined;
      if (!actual || ['id','name','mimeType','durationMs','createdAt','archivedFields'].some(key => (actual as any)[key] !== (expected as any)[key]) || !(actual.blob instanceof Blob) || actual.blob.size !== expected.blob.size || actual.blob.type !== expected.blob.type) return {id:copy.id,state:'changed'};
      for (let offset = 0; offset < expected.blob.size; offset += 1024*1024) {
        const a = new Uint8Array(await actual.blob.slice(offset,offset+1024*1024).arrayBuffer()), b = new Uint8Array(await expected.blob.slice(offset,offset+1024*1024).arrayBuffer()); check();
        if (a.some((value,index) => value !== b[index])) return {id:copy.id,state:'changed'};
      }
    }
    return {id:copy.id,state:'present'};
  }
  async recoveryDownload(current: () => boolean, signal: AbortSignal): Promise<Blob> {
    const check = () => this.#check(current,signal), state = await this.#read(check,signal);
    if (!state.copies.length) throw new Error('There are no saved Sound import copies.');
    const files: ZipFile[] = [], encode = exportValueEncoder(files,check);
    const metadata = {format:'kikilink-sound-recovery',version:1,owner:this.owner,database:this.name,copies:encode(state.copies)};
    files.push({name:'recovery.json',blob:new Blob([JSON.stringify(metadata)],{type:'application/json'})});
    files.push({name:'README.txt',blob:new Blob(['Private Sound import recovery copies. Includes original sound bytes and pre-import records. Not a device import ZIP. No automatic rollback is provided.\n'])});
    return storedZip(files,check);
  }
  async #inventory(check: () => void): Promise<IDBDatabaseInfo | undefined> {
    check(); if (typeof this.factory.databases !== 'function') throw new Error('This browser cannot safely inspect Notification sound storage.');
    const entry = (await this.factory.databases()).find(db => db.name === this.name); check();
    if (entry && entry.version !== 1 && entry.version !== 2) throw new Error('Notification sound storage needs a newer KikiLink version.'); return entry;
  }
  async #read(check: () => void, signal: AbortSignal): Promise<State> {
    if (!await this.#inventory(check)) return {rows:[],copies:[]};
    const db = await openSoundDatabase(this.name,this.factory,false,check,signal); let state: State | undefined;
    try { await this.#transaction(db,'readonly',check,signal,value => { state = value; }); } finally { db.close(); }
    check(); return state!;
  }
  #transaction(db: IDBDatabase, mode: IDBTransactionMode, check: () => void, signal: AbortSignal, ready: (state: State) => ((tx: IDBTransaction) => void) | void): Promise<void> {
    return new Promise((resolve,reject) => {
      check(); const names = db.version === 1 ? [SOUND_RECORDS] : [SOUND_RECORDS,SOUND_IMPORTS], tx = db.transaction(names,mode);
      let reason = 'The Sound transaction failed. No partial import was committed.';
      const abort = () => { try { tx.abort(); } catch { /* Already settled. */ } };
      const timer = setTimeout(abort,30000); signal.addEventListener('abort',abort,{once:true}); db.onversionchange = abort;
      const finish = () => { clearTimeout(timer); signal.removeEventListener('abort',abort); };
      tx.onabort = () => { finish(); reject(new Error(reason)); };
      tx.oncomplete = () => { finish(); resolve(); };
      const state: State = {rows:[],copies:[]}; let done = 0;
      try {
        checkSoundLayout(db,tx,db.version === 2);
        for (const name of names) {
          const request = tx.objectStore(name).openCursor();
          request.onsuccess = () => {
            try {
              check(); const cursor = request.result;
              if (!cursor) { if (++done === names.length) ready(state)?.(tx); return; }
              if (name === SOUND_RECORDS) {
                if (state.rows.length >= 24) throw new Error('Current Sound exceeds its sound limit.');
                state.rows.push({key:cursor.primaryKey,value:cursor.value});
              } else {
                if (state.copies.length >= 3 || cursor.value?.id !== cursor.primaryKey) throw new Error('Sound recovery storage is unsupported.');
                state.copies.push(cursor.value);
              }
              cursor.continue();
            } catch(e) { reason = e instanceof Error ? e.message : reason; abort(); }
          };
        }
      } catch(e) { reason = e instanceof Error ? e.message : reason; abort(); }
    });
  }
}
