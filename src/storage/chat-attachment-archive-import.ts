import {writeAccountValue} from './account-write-version';
import { scopePersistenceName } from '../core/storage-scope';
import { chatRowsFingerprint, type ChatImportRules, type ChatRecoveryCopy, type ChatRows } from './chat-import-model';
import { CHAT_ATTACHMENT_RECOVERY_KEY, planChatAttachmentImport, prepareChatAttachmentRecovery, readChatAttachmentRecovery, sameChatAttachmentBase, sameChatAttachmentReferences, type ChatAttachmentPlan } from './chat-attachment-import-model';

export interface ChatAttachmentImportReview { readonly messages: number; readonly conversations: number; readonly duplicates: number; readonly conflicts: number; readonly excluded: number; readonly updated:number; readonly attachments:number }
const checkCurrent = (current: () => boolean, signal: AbortSignal) => { if (signal.aborted || !current()) throw new Error('Chat attachment import cancelled.'); };
const matches = (a: unknown,b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sameImportedMessage = (value: unknown, expected: Record<string,unknown>): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = value as Record<string,unknown>, keys = Object.keys(actual).filter(k => actual[k] !== undefined);
  return keys.length === Object.keys(expected).length && keys.every(k => Object.hasOwn(expected,k) && (k==='archivedAttachments' ? sameChatAttachmentReferences(actual[k],expected[k]) : Object.is(actual[k],expected[k])));
};
/** One account, existing schema1 chat database only. No database creation or upgrades. */
export class ChatAttachmentArchiveImporter {
  readonly key: string;
  #pending: {review: ChatAttachmentImportReview; plan: ChatAttachmentPlan; rules: string; journal: string|null} | undefined;
  constructor(readonly owner: number, readonly storage: Storage = localStorage, readonly factory: IDBFactory = indexedDB) {
    if (!Number.isSafeInteger(owner) || owner <= 0) throw new Error('A signed-in account is required.');
    this.key = scopePersistenceName(`kikilink:account:${owner}:`)+CHAT_ATTACHMENT_RECOVERY_KEY;
  }
  cancel(): void { this.#pending = undefined; }
  recoverySource(): string | null { return this.storage.getItem(this.key); }
  async review(source: string, rules: ChatImportRules, current: () => boolean, signal: AbortSignal): Promise<ChatAttachmentImportReview> {
    this.cancel(); const rows = await this.#read(rules.database,current,signal); checkCurrent(current,signal);
    const plan = planChatAttachmentImport(source,rows,rules,Date.now()), journal = this.recoverySource();
    if (plan.messages.length || plan.updates.length) prepareChatAttachmentRecovery(journal,plan);
    const review = Object.freeze({messages:plan.messages.length,conversations:plan.conversations.length,duplicates:plan.duplicates,conflicts:plan.conflicts,excluded:plan.excluded,updated:plan.updates.length,attachments:plan.attachments});
    this.#pending = {review,plan,rules:JSON.stringify(rules),journal}; return review;
  }
  async apply(review: ChatAttachmentImportReview, rules: ChatImportRules, current: () => boolean, signal: AbortSignal, guard: () => void, preparedForSync: () => void): Promise<number> {
    const pending = this.#pending; this.cancel();
    if (!pending || pending.review !== review || pending.rules !== JSON.stringify(rules) || !pending.plan.messages.length && !pending.plan.updates.length) throw new Error('This chat attachment review expired. Review the archive again.');
    checkCurrent(current,signal); guard();
    const db = await this.#open(rules.database,current,signal); let copy: ChatRecoveryCopy | undefined;
    try {
      await new Promise<void>((resolve,reject) => {
        const tx = db.transaction(['messages','conversations'],'readwrite'); let reason = 'The chat transaction failed. No partial import was committed.';
        const abort = () => { try { tx.abort(); } catch { /* Already finished. */ } };
        const cancelled = () => { reason = 'Chat attachment import cancelled. Check the saved recovery copy before retrying.'; abort(); };
        const timer = setTimeout(abort,30000); signal.addEventListener('abort',cancelled,{once:true}); db.onversionchange = abort;
        const finish = () => { clearTimeout(timer); signal.removeEventListener('abort',cancelled); };
        tx.onabort = () => { finish(); reject(new Error(reason)); };
        tx.oncomplete = () => { finish(); resolve(); };
        this.#rows(tx,rows => {
          try {
            checkCurrent(current,signal); guard();
            if (chatRowsFingerprint(rows) !== pending.plan.before || this.recoverySource() !== pending.journal) throw new Error('History or recovery copies changed. Review the archive again.');
            const fresh = planChatAttachmentImport(pending.plan.source,rows,rules,Date.now());
            if (!matches(fresh.messages,pending.plan.messages) || !matches(fresh.conversations,pending.plan.conversations) || !matches(fresh.updates,pending.plan.updates)) throw new Error('History limits changed the result. Review the archive again.');
            const prepared = prepareChatAttachmentRecovery(pending.journal,pending.plan); copy = prepared.copy;
            if (prepared.raw !== pending.journal) writeAccountValue(this.storage,this.owner,CHAT_ATTACHMENT_RECOVERY_KEY,prepared.raw);
            if (this.recoverySource() !== prepared.raw) throw new Error('The chat recovery copy could not be confirmed. No history was changed.');
            checkCurrent(current,signal); guard();
            preparedForSync();
            // The transaction owns both stores throughout preservation and insertion.
            for (const m of pending.plan.messages) tx.objectStore('messages').add(m);
            for (const update of pending.plan.updates) {
              const old=rows.messages.find(row=>row.key===update.id)!.value as Record<string,unknown>;
              tx.objectStore('messages').put({...old,archivedAttachments:update.archivedAttachments});
            }
            for (const c of pending.plan.conversations) tx.objectStore('conversations').add(c);
          } catch (error) { reason = error instanceof Error ? error.message : reason; abort(); }
        },error => { reason = error; abort(); });
      });
    } finally { db.close(); }
    try {
      if (await this.#inspect(copy!,rules.database,current,signal) !== 'present') throw new Error();
    } catch { throw new Error('The chat write completed, but its current result could not be confirmed. Reload and check the last chat attachment import before retrying.'); }
    return copy!.id;
  }
  async inspectLast(database: string, current: () => boolean, signal: AbortSignal): Promise<{id: number; state: 'present'|'not-applied'|'changed'}> {
    const copy = readChatAttachmentRecovery(this.recoverySource()).at(-1); if (!copy) throw new Error('There are no saved chat attachment import copies.');
    return {id:copy.id,state:await this.#inspect(copy,database,current,signal)};
  }
  async #inspect(copy: ChatRecoveryCopy, database: string, current: () => boolean, signal: AbortSignal): Promise<'present'|'not-applied'|'changed'> {
    const rows = await this.#read(database,current,signal), added = JSON.parse(copy.added);
    const messages = new Map(rows.messages.map(r => [r.key,r.value])), conversations = new Map(rows.conversations.map(r => [r.key,r.value]));
    // Display names, drafts and mute state may legitimately refresh after import.
    if (added.messages.every((m: any) => sameImportedMessage(messages.get(m.id),m)) && added.updates.every((m:any)=>sameChatAttachmentBase(messages.get(m.id),m) && sameChatAttachmentReferences((messages.get(m.id) as any)?.archivedAttachments,m.archivedAttachments)) && added.conversations.every((c: any) => conversations.has(c.peerNumber))) return 'present';
    if (chatRowsFingerprint(rows) === copy.before) return 'not-applied';
    return 'changed';
  }
  async #read(name: string, current: () => boolean, signal: AbortSignal): Promise<ChatRows> {
    const db = await this.#open(name,current,signal);
    try { return await new Promise<ChatRows>((resolve,reject) => {
      const tx = db.transaction(['messages','conversations'],'readonly'); let rows: ChatRows | undefined, error = 'Saved chat history could not be read completely.';
      const abort = () => { try { tx.abort(); } catch { /* Already settled. */ } };
      const timer = setTimeout(abort,30000); signal.addEventListener('abort',abort,{once:true}); db.onversionchange = abort;
      const finish = () => { clearTimeout(timer); signal.removeEventListener('abort',abort); };
      tx.onabort = () => { finish(); reject(new Error(error)); };
      tx.oncomplete = () => { finish(); try { checkCurrent(current,signal); if (!rows) throw new Error(error); resolve(rows); } catch(e) { reject(e); } };
      this.#rows(tx,value => { rows = value; },message => { error = message; abort(); });
    }); } finally { db.close(); }
  }
  #rows(tx: IDBTransaction, ready: (rows: ChatRows) => void, failed: (message: string) => void): void {
    const rows: ChatRows = {messages:[],conversations:[]}; let complete = 0, count = 0;
    try { for (const name of ['messages','conversations'] as const) {
      const store = tx.objectStore(name);
      if (store.keyPath !== (name === 'messages' ? 'id' : 'peerNumber') || store.autoIncrement) throw new Error('The current chat database layout is unsupported.');
      const request = store.openCursor(); request.onsuccess = () => {
        try {
          const cursor = request.result;
          if (!cursor) { if (++complete === 2) ready(rows); return; }
          if (++count > 20000) throw new Error('There are too many saved chat records for this recovery copy.');
          rows[name].push({key:cursor.primaryKey,value:cursor.value}); cursor.continue();
        } catch (error) { failed(error instanceof Error ? error.message : 'Chat history could not be read.'); }
      };
    } } catch(error) { failed(error instanceof Error ? error.message : 'Chat history could not be read.'); }
  }
  async #open(name: string, current: () => boolean, signal: AbortSignal): Promise<IDBDatabase> {
    if (name !== scopePersistenceName(`kikilink-account-${this.owner}`)) throw new Error('The chat destination does not match this account.');
    checkCurrent(current,signal);
    if (typeof this.factory.databases !== 'function' || !(await this.factory.databases()).some(db => db.name === name && db.version === 1)) throw new Error('Supported saved chat storage is unavailable. Reload before importing.');
    checkCurrent(current,signal);
    return new Promise((resolve,reject) => {
      let settled = false; const request = this.factory.open(name);
      const fail = () => { if (settled) return; settled = true; clearTimeout(timer); signal.removeEventListener('abort',fail); reject(new Error('Chat storage could not be opened safely.')); };
      const timer = setTimeout(fail,10000); signal.addEventListener('abort',fail,{once:true});
      request.onupgradeneeded = () => { request.transaction?.abort(); fail(); }; request.onerror = request.onblocked = fail;
      request.onsuccess = () => {
        const db = request.result;
        if (settled) { db.close(); return; }
        try { checkCurrent(current,signal); if (db.version !== 1 || !db.objectStoreNames.contains('messages') || !db.objectStoreNames.contains('conversations')) throw new Error(); }
        catch { db.close(); fail(); return; }
        settled = true; clearTimeout(timer); signal.removeEventListener('abort',fail); db.onversionchange = () => db.close(); resolve(db);
      };
    });
  }
}
