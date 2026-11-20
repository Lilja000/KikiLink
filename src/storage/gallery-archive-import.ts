import { deviceGalleryDatabaseName, type DeviceGalleryImage } from './device-gallery-store';
import { GALLERY_IMAGES, GALLERY_IMPORTS, checkGalleryLayout, openGalleryDatabase } from './gallery-database';
import { galleryKeys, prepareGalleryImages, planGalleryImport, prepareGalleryCopy, checkGalleryCopies, snapshotGallerySource,
  type GalleryArchiveSource, type GalleryImportCopy, type GalleryRow } from './gallery-import-model';
import { exportValueEncoder } from './device-data-export';
import { storedZip, type ZipFile } from '../utils/stored-zip';

export interface GalleryImportReview { readonly images: number; readonly kept: number; readonly excluded: number; readonly bytes: number; readonly recoveryBytes: number }
interface State { rows: GalleryRow[]; copies: GalleryImportCopy[] }
const journalState = (copies: GalleryImportCopy[]) => JSON.stringify(copies.map(copy => [copy.id,copy.createdAt,copy.bytes]).sort((a,b) => a[0]!-b[0]!));

export class GalleryArchiveImporter {
  readonly name: string;
  #pending: {review: GalleryImportReview; source: GalleryArchiveSource; images: DeviceGalleryImage[]; keys: string; journal: string; added: string} | undefined;
  #generation = 0;
  constructor(readonly owner: number, readonly factory: IDBFactory = indexedDB) {
    if (!Number.isSafeInteger(owner) || owner <= 0) throw new Error('A signed-in account is required.'); this.name = deviceGalleryDatabaseName(owner);
  }
  cancel(): void { ++this.#generation; this.#pending = undefined; }
  #check(current: () => boolean, signal: AbortSignal): void { if (!current() || signal.aborted) throw new Error('Gallery import cancelled.'); }
  async review(source: GalleryArchiveSource, current: () => boolean, signal: AbortSignal): Promise<GalleryImportReview> {
    this.cancel(); const generation = this.#generation, check = () => this.#check(() => generation === this.#generation && current(),signal);
    check(); source = snapshotGallerySource(source);
    const images = await prepareGalleryImages(source,this.owner,check), state = await this.#read(check,signal);
    check(); checkGalleryCopies(state.copies,this.owner); const plan = planGalleryImport(images,state.rows);
    const copy = plan.added.length ? prepareGalleryCopy(state.copies,this.owner,state.rows,source,plan.added) : undefined;
    const review = Object.freeze({images:plan.added.length,kept:plan.kept,excluded:plan.excluded,bytes:plan.bytes,recoveryBytes:copy?.bytes ?? 0});
    this.#pending = {review,source,images,keys:galleryKeys(state.rows),journal:journalState(state.copies),added:JSON.stringify(plan.added.map(image => image.id))}; return review;
  }
  async apply(review: GalleryImportReview, current: () => boolean, signal: AbortSignal): Promise<number> {
    const pending = this.#pending; this.cancel(); const generation = this.#generation, active = () => generation === this.#generation && current(), check = () => this.#check(active,signal);
    if (!pending || pending.review !== review || !review.images) throw new Error('This Gallery review expired. Review the archive again.');
    check(); await this.#inventory(check); const db = await openGalleryDatabase(this.name,this.factory,true,check,signal);
    let copy: GalleryImportCopy | undefined;
    try {
      await this.#transaction(db,'readwrite',check,signal,state => {
        if (galleryKeys(state.rows) !== pending.keys || journalState(state.copies) !== pending.journal) throw new Error('Gallery contents or recovery copies changed. Review the archive again.');
        const plan = planGalleryImport(pending.images,state.rows);
        if (JSON.stringify(plan.added.map(image => image.id)) !== pending.added) throw new Error('Gallery capacity changed. Review the archive again.');
        copy = prepareGalleryCopy(state.copies,this.owner,state.rows,pending.source,plan.added);
        if (copy.bytes !== review.recoveryBytes) throw new Error('The Gallery recovery size changed. Review the archive again.');
        return tx => {
          check(); tx.objectStore(GALLERY_IMPORTS).add(copy!);
          for (const image of plan.added) { check(); tx.objectStore(GALLERY_IMAGES).add(image); }
          check();
        };
      });
    } finally { db.close(); }
    try {
      const result = await this.inspectLast(active,signal);
      if (result.id !== copy!.id || result.state !== 'present') throw new Error();
    } catch { throw new Error('The Gallery write completed, but its result could not be confirmed. Reload and check the last Gallery import before retrying.'); }
    return copy!.id;
  }
  async recoveryCount(current: () => boolean, signal: AbortSignal): Promise<number> {
    const state = await this.#read(() => this.#check(current,signal),signal); return state.copies.length;
  }
  async inspectLast(current: () => boolean, signal: AbortSignal): Promise<{id:number;state:'present'|'changed'}> {
    const check = () => this.#check(current,signal), state = await this.#read(check,signal); checkGalleryCopies(state.copies,this.owner);
    const copy = [...state.copies].sort((a,b) => a.id-b.id).at(-1); if (!copy) throw new Error('There are no saved Gallery import copies.');
    const rows = new Map(state.rows.map(row => [row.key,row.value]));
    for (const expected of copy.added) {
      check(); const actual = rows.get(expected.id) as DeviceGalleryImage | undefined;
      if (!actual || ['id','name','mimeType','width','height','createdAt','archivedFields'].some(key => (actual as any)[key] !== (expected as any)[key]) || !(actual.blob instanceof Blob) || actual.blob.size !== expected.blob.size || actual.blob.type !== expected.blob.type) return {id:copy.id,state:'changed'};
      const a = new Uint8Array(await actual.blob.arrayBuffer()), b = new Uint8Array(await expected.blob.arrayBuffer()); check();
      if (a.some((value,index) => value !== b[index])) return {id:copy.id,state:'changed'};
    }
    return {id:copy.id,state:'present'};
  }
  async recoveryDownload(current: () => boolean, signal: AbortSignal): Promise<Blob> {
    const check = () => this.#check(current,signal), state = await this.#read(check,signal);
    if (!state.copies.length) throw new Error('There are no saved Gallery import copies.');
    const files: ZipFile[] = [], encode = exportValueEncoder(files,check);
    const metadata = {format:'kikilink-gallery-recovery',version:1,owner:this.owner,database:this.name,copies:encode(state.copies)};
    files.push({name:'recovery.json',blob:new Blob([JSON.stringify(metadata)],{type:'application/json'})});
    files.push({name:'README.txt',blob:new Blob(['Private Gallery import recovery copies. Includes original image bytes and pre-import records. Not a device import ZIP. No automatic rollback is provided.\n'])});
    return storedZip(files,check);
  }
  async #inventory(check: () => void): Promise<IDBDatabaseInfo | undefined> {
    check(); if (typeof this.factory.databases !== 'function') throw new Error('This browser cannot safely inspect Gallery storage.');
    const entry = (await this.factory.databases()).find(db => db.name === this.name); check();
    if (entry && entry.version !== 1 && entry.version !== 2) throw new Error('Gallery storage needs a newer KikiLink version.'); return entry;
  }
  async #read(check: () => void, signal: AbortSignal): Promise<State> {
    if (!await this.#inventory(check)) return {rows:[],copies:[]};
    const db = await openGalleryDatabase(this.name,this.factory,false,check,signal); let state: State | undefined;
    try { await this.#transaction(db,'readonly',check,signal,value => { state = value; }); } finally { db.close(); }
    check(); return state!;
  }
  #transaction(db: IDBDatabase, mode: IDBTransactionMode, check: () => void, signal: AbortSignal, ready: (state: State) => ((tx: IDBTransaction) => void) | void): Promise<void> {
    return new Promise((resolve,reject) => {
      check(); const names = db.version === 1 ? [GALLERY_IMAGES] : [GALLERY_IMAGES,GALLERY_IMPORTS], tx = db.transaction(names,mode);
      let reason = 'The Gallery transaction failed. No partial import was committed.';
      const abort = () => { try { tx.abort(); } catch { /* Already settled. */ } };
      const timer = setTimeout(abort,30000); signal.addEventListener('abort',abort,{once:true}); db.onversionchange = abort;
      const finish = () => { clearTimeout(timer); signal.removeEventListener('abort',abort); };
      tx.onabort = () => { finish(); reject(new Error(reason)); };
      tx.oncomplete = () => { finish(); resolve(); };
      const state: State = {rows:[],copies:[]}; let done = 0;
      try {
        checkGalleryLayout(db,tx,db.version === 2);
        for (const name of names) {
          const request = tx.objectStore(name).openCursor();
          request.onsuccess = () => {
            try {
              check(); const cursor = request.result;
              if (!cursor) { if (++done === names.length) ready(state)?.(tx); return; }
              if (name === GALLERY_IMAGES) {
                if (state.rows.length >= 80) throw new Error('Current Gallery exceeds its image limit.');
                state.rows.push({key:cursor.primaryKey,value:cursor.value});
              } else {
                if (state.copies.length >= 3 || cursor.value?.id !== cursor.primaryKey) throw new Error('Gallery recovery storage is unsupported.');
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
