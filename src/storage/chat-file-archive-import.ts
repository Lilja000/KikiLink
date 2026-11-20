import { chatFileDatabaseName, checkChatFile, chatFileHash, inspectChatFile, type ChatFile } from './chat-file-model';
import { CHAT_FILES, CHAT_FILE_IMPORTS, checkChatFileLayout, openChatFileDatabase } from './chat-file-database';
import { chatFileKeys, prepareChatFiles, planChatFiles, prepareChatFileCopy, checkChatFileCopies,
  type ChatFileSource, type ChatFileCopy, type ChatFileRow } from './chat-file-model';
import { exportValueEncoder } from './device-data-export';
import { storedZip, type ZipFile } from '../utils/stored-zip';

export interface ChatFileImportReview { readonly files: number; readonly kept: number; readonly excluded: number; readonly bytes: number; readonly recoveryBytes: number }
export interface ChatFileInventory { readonly files: readonly {readonly id:string;readonly bytes:number}[]; readonly bytes:number }
export class ChatFileSaveUncertainError extends Error {
  constructor() { super('The file write completed, but could not be confirmed. Review saved files before retrying.'); }
}
interface State { rows: ChatFileRow[]; copies: ChatFileCopy[] }
const journalState = (copies: ChatFileCopy[]) => JSON.stringify(copies.map(copy => [copy.id,copy.createdAt,copy.bytes]).sort((a,b) => a[0]!-b[0]!));

export class ChatFileArchiveImporter {
  readonly name: string;
  #pending: {review: ChatFileImportReview; source: ChatFileSource; images: ChatFile[]; keys: string; journal: string; added: string} | undefined;
  constructor(readonly owner: number, readonly factory: IDBFactory = indexedDB) {
    if (!Number.isSafeInteger(owner) || owner <= 0) throw new Error('A signed-in account is required.'); this.name = chatFileDatabaseName(owner);
  }
  async get(id:string,current:()=>boolean,signal:AbortSignal):Promise<ChatFile|undefined> {
    const check=()=>this.#check(current,signal),state=await this.#read(check,signal),file=state.rows.find(r=>r.key===id)?.value;
    if(file===undefined)return;checkChatFile(file);if(await chatFileHash(file.blob,check)!==file.sha256)throw new Error('The saved chat file is damaged.');return file;
  }
  async inventory(current:()=>boolean,signal:AbortSignal):Promise<ChatFileInventory> {
    const state=await this.#read(()=>this.#check(current,signal),signal);chatFileKeys(state.rows);checkChatFileCopies(state.copies,this.owner);
    const files=state.rows.map(row=>{const file=row.value as ChatFile;return Object.freeze({id:file.id,bytes:file.blob.size});});
    return Object.freeze({files:Object.freeze(files),bytes:files.reduce((n,file)=>n+file.bytes,0)});
  }
  async save(file:ChatFile,current:()=>boolean,signal:AbortSignal):Promise<boolean> {
    const check=()=>this.#check(current,signal);check();checkChatFile(file);await inspectChatFile(file.blob,file.kind,signal);check();
    if(await chatFileHash(file.blob,check)!==file.sha256)throw new Error('The chat file changed before saving.');
    await this.#inventory(check);const db=await openChatFileDatabase(this.name,this.factory,true,check,signal);let added=false;
    try{await this.#transaction(db,'readwrite',check,signal,state=>{
      checkChatFileCopies(state.copies,this.owner);const plan=planChatFiles([file],state.rows),old=state.rows.find(r=>r.key===file.id)?.value as ChatFile|undefined;
      if(old){if(old.sha256!==file.sha256)throw new Error('A different saved copy already exists. It was kept.');return;}
      if(plan.added.length!==1)throw new Error('Saved chat files reached the 100-file or 128 MiB limit.');
      return tx=>{check();tx.objectStore(CHAT_FILES).add(file);added=true;check();};
    });}finally{db.close();}
    try { const saved=await this.get(file.id,current,signal);if(saved?.sha256!==file.sha256)throw new Error(); }
    catch { throw new ChatFileSaveUncertainError(); }
    return added;
  }
  async remove(id:string,current:()=>boolean,signal:AbortSignal):Promise<void> {
    const check=()=>this.#check(current,signal);if(!await this.#inventory(check))return;
    const db=await openChatFileDatabase(this.name,this.factory,false,check,signal);
    try{await this.#transaction(db,'readwrite',check,signal,()=>tx=>{check();tx.objectStore(CHAT_FILES).delete(id);check();});}finally{db.close();}
  }
  cancel(): void { this.#pending = undefined; }
  #check(current: () => boolean, signal: AbortSignal): void { if (!current() || signal.aborted) throw new Error('Chat file import cancelled.'); }
  async review(source: ChatFileSource, current: () => boolean, signal: AbortSignal): Promise<ChatFileImportReview> {
    this.cancel(); const check = () => this.#check(current,signal), images = await prepareChatFiles(source,this.owner,check,signal), state = await this.#read(check,signal);
    check(); checkChatFileCopies(state.copies,this.owner); const plan = planChatFiles(images,state.rows);
    const copy = plan.added.length ? prepareChatFileCopy(state.copies,this.owner,state.rows,source,plan.added) : undefined;
    const review = Object.freeze({files:plan.added.length,kept:plan.kept,excluded:plan.excluded,bytes:plan.bytes,recoveryBytes:copy?.bytes ?? 0});
    this.#pending = {review,source,images,keys:chatFileKeys(state.rows),journal:journalState(state.copies),added:JSON.stringify(plan.added.map(image => image.id))}; return review;
  }
  async apply(review: ChatFileImportReview, current: () => boolean, signal: AbortSignal): Promise<number> {
    const pending = this.#pending; this.cancel(); const check = () => this.#check(current,signal);
    if (!pending || pending.review !== review || !review.files) throw new Error('This Chat file review expired. Review the archive again.');
    check(); await this.#inventory(check); const db = await openChatFileDatabase(this.name,this.factory,true,check,signal);
    let copy: ChatFileCopy | undefined;
    try {
      await this.#transaction(db,'readwrite',check,signal,state => {
        if (chatFileKeys(state.rows) !== pending.keys || journalState(state.copies) !== pending.journal) throw new Error('Chat file contents or recovery copies changed. Review the archive again.');
        const plan = planChatFiles(pending.images,state.rows);
        if (JSON.stringify(plan.added.map(image => image.id)) !== pending.added) throw new Error('Chat file capacity changed. Review the archive again.');
        copy = prepareChatFileCopy(state.copies,this.owner,state.rows,pending.source,plan.added);
        if (copy.bytes !== review.recoveryBytes) throw new Error('The Chat file recovery size changed. Review the archive again.');
        return tx => {
          check(); tx.objectStore(CHAT_FILE_IMPORTS).add(copy!);
          for (const image of plan.added) { check(); tx.objectStore(CHAT_FILES).add(image); }
          check();
        };
      });
    } finally { db.close(); }
    try {
      const result = await this.inspectLast(current,signal);
      if (result.id !== copy!.id || result.state !== 'present') throw new Error();
    } catch { throw new Error('The Chat file write completed, but its result could not be confirmed. Reload and check the last Chat file import before retrying.'); }
    return copy!.id;
  }
  async recoveryCount(current: () => boolean, signal: AbortSignal): Promise<number> {
    const state = await this.#read(() => this.#check(current,signal),signal); return state.copies.length;
  }
  async inspectLast(current: () => boolean, signal: AbortSignal): Promise<{id:number;state:'present'|'changed'}> {
    const check = () => this.#check(current,signal), state = await this.#read(check,signal); checkChatFileCopies(state.copies,this.owner);
    const copy = [...state.copies].sort((a,b) => a.id-b.id).at(-1); if (!copy) throw new Error('There are no saved Chat file import copies.');
    const rows = new Map(state.rows.map(row => [row.key,row.value]));
    for (const expected of copy.added) {
      check(); const actual = rows.get(expected.id) as ChatFile | undefined;
      if (!actual || ['id','kind','assetId','mimeType','sha256','createdAt'].some(key => (actual as any)[key] !== (expected as any)[key]) || !(actual.blob instanceof Blob) || actual.blob.size !== expected.blob.size || actual.blob.type !== expected.blob.type) return {id:copy.id,state:'changed'};
      const a = new Uint8Array(await actual.blob.arrayBuffer()), b = new Uint8Array(await expected.blob.arrayBuffer()); check();
      if (a.some((value,index) => value !== b[index])) return {id:copy.id,state:'changed'};
    }
    return {id:copy.id,state:'present'};
  }
  async recoveryDownload(current: () => boolean, signal: AbortSignal): Promise<Blob> {
    const check = () => this.#check(current,signal), state = await this.#read(check,signal);
    if (!state.copies.length) throw new Error('There are no saved Chat file import copies.');
    const files: ZipFile[] = [], encode = exportValueEncoder(files,check);
    const metadata = {format:'kikilink-chat-file-recovery',version:1,owner:this.owner,database:this.name,copies:encode(state.copies)};
    files.push({name:'recovery.json',blob:new Blob([JSON.stringify(metadata)],{type:'application/json'})});
    files.push({name:'README.txt',blob:new Blob(['Private Chat file import recovery copies. Includes original image and audio bytes and pre-import records. Not a device import ZIP. No automatic rollback is provided.\n'])});
    return storedZip(files,check);
  }
  async #inventory(check: () => void): Promise<IDBDatabaseInfo | undefined> {
    check(); if (typeof this.factory.databases !== 'function') throw new Error('This browser cannot safely inspect Chat file storage.');
    const entry = (await this.factory.databases()).find(db => db.name === this.name); check();
    if (entry && entry.version !== 1) throw new Error('Chat file storage needs a newer KikiLink version.'); return entry;
  }
  async #read(check: () => void, signal: AbortSignal): Promise<State> {
    if (!await this.#inventory(check)) return {rows:[],copies:[]};
    const db = await openChatFileDatabase(this.name,this.factory,false,check,signal); let state: State | undefined;
    try { await this.#transaction(db,'readonly',check,signal,value => { state = value; }); } finally { db.close(); }
    check(); return state!;
  }
  #transaction(db: IDBDatabase, mode: IDBTransactionMode, check: () => void, signal: AbortSignal, ready: (state: State) => ((tx: IDBTransaction) => void) | void): Promise<void> {
    return new Promise((resolve,reject) => {
      check(); const names = [CHAT_FILES,CHAT_FILE_IMPORTS], tx = db.transaction(names,mode);
      let reason = 'The Chat file transaction failed. No partial import was committed.';
      const abort = () => { try { tx.abort(); } catch { /* Already settled. */ } };
      const timer = setTimeout(abort,30000); signal.addEventListener('abort',abort,{once:true}); db.onversionchange = abort;
      const finish = () => { clearTimeout(timer); signal.removeEventListener('abort',abort); };
      tx.onabort = () => { finish(); reject(new Error(reason)); };
      tx.oncomplete = () => { finish(); resolve(); };
      const state: State = {rows:[],copies:[]}; let done = 0;
      try {
        checkChatFileLayout(db,tx);
        for (const name of names) {
          const request = tx.objectStore(name).openCursor();
          request.onsuccess = () => {
            try {
              check(); const cursor = request.result;
              if (!cursor) { if (++done === names.length) ready(state)?.(tx); return; }
              if (name === CHAT_FILES) {
                if (state.rows.length >= 100) throw new Error('Current Chat file exceeds its file limit.');
                state.rows.push({key:cursor.primaryKey,value:cursor.value});
              } else {
                if (state.copies.length >= 3 || cursor.value?.id !== cursor.primaryKey) throw new Error('Chat file recovery storage is unsupported.');
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
