import { deviceSoundDatabaseName, readAudioDurationMs, MAX_NOTIFICATION_SOUND_BYTES, MAX_NOTIFICATION_SOUND_DURATION_MS,
  type DeviceNotificationSound } from './device-notification-sound-store';
import { openSoundDatabase, SOUND_RECORDS } from './sound-database';
import { validSoundId } from './sound-import-model';

export interface AssignmentFile { readonly id: string; readonly name: string; readonly signature: string }
export interface SoundAssignmentFiles {
  read(ids: readonly string[], current: () => boolean, signal: AbortSignal): Promise<readonly AssignmentFile[]>;
}

/** Inventory-first, readonly and version-preserving. The ordinary store may create a DB or fall back to memory. */
export class DurableSoundAssignmentFiles implements SoundAssignmentFiles {
  constructor(readonly owner: number, readonly factory: IDBFactory | undefined = globalThis.indexedDB,
    readonly inspect = readAudioDurationMs) {}
  async read(ids: readonly string[], current: () => boolean, signal: AbortSignal): Promise<readonly AssignmentFile[]> {
    const check = () => { if (!current() || signal.aborted) throw new Error('Sound choices review cancelled.'); };
    check();
    if (ids.length > 3 || ids.some(id => !validSoundId(id)) || new Set(ids).size !== ids.length)
      throw new Error('These custom sound references are unsupported.');
    if (!ids.length) return Object.freeze([]);
    if (!Number.isSafeInteger(this.owner) || this.owner < 1 || !this.factory?.databases)
      throw new Error('This browser cannot safely check saved custom sounds.');
    const name = deviceSoundDatabaseName(this.owner), inventory = await this.factory.databases(); check();
    const entry = inventory.find(db => db.name === name);
    if (!entry) throw new Error('Custom sound files are missing. Import missing sound files first, then review choices again.');
    if (entry.version !== 1 && entry.version !== 2) throw new Error('Custom sound storage needs a newer KikiLink version.');
    const db = await openSoundDatabase(name,this.factory,false,check,signal);
    let rows: DeviceNotificationSound[];
    try {
      check();
      rows = await new Promise<DeviceNotificationSound[]>((resolve,reject) => {
        const tx = db.transaction(SOUND_RECORDS,'readonly'), values: DeviceNotificationSound[] = [];
        let reason: unknown;
        const abort = () => { reason = new Error('Sound file check cancelled or timed out.'); try { tx.abort(); } catch {} };
        const timer = setTimeout(abort,10000); signal.addEventListener('abort',abort,{once:true});
        const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort',abort); };
        tx.onabort = tx.onerror = () => { cleanup(); reject(reason ?? tx.error ?? new Error('Saved sounds could not be read.')); };
        tx.oncomplete = () => { cleanup(); try { check(); resolve(values); } catch(e) { reject(e); } };
        for (const id of ids) {
          const request = tx.objectStore(SOUND_RECORDS).get(id);
          request.onsuccess = () => {
            try { check(); if (!request.result || request.result.id !== id) throw new Error('Custom sound files are missing. Import missing sound files first, then review choices again.'); values.push(request.result); }
            catch(e) { reason = e; try { tx.abort(); } catch {} }
          };
        }
      });
    } finally { db.close(); }
    const result: AssignmentFile[] = [];
    for (const row of rows.sort((a,b) => a.id.localeCompare(b.id))) {
      check();
      if (typeof row.name !== 'string' || !row.name.length || row.name.length > 60 || /[\u0000-\u001f\u007f]/.test(row.name) ||
        typeof row.mimeType !== 'string' || (!row.mimeType.toLowerCase().startsWith('audio/') && !['','application/octet-stream','video/mp4'].includes(row.mimeType)) ||
        !(row.blob instanceof Blob) || !row.blob.size || row.blob.size > MAX_NOTIFICATION_SOUND_BYTES || row.blob.type !== row.mimeType ||
        !Number.isSafeInteger(row.durationMs) || row.durationMs <= 0 || row.durationMs > MAX_NOTIFICATION_SOUND_DURATION_MS ||
        !Number.isSafeInteger(row.createdAt) || row.createdAt < 0 || row.createdAt > 8640000000000000)
        throw new Error('A saved custom sound is unsupported. Its file has been kept unchanged.');
      const duration = await this.inspect(row.blob,signal); check();
      if (!Number.isSafeInteger(duration) || duration <= 0 || duration > MAX_NOTIFICATION_SOUND_DURATION_MS || Math.abs(duration-row.durationMs) > 100)
        throw new Error('A saved custom sound is unreadable or its duration changed.');
      const bytes = await row.blob.arrayBuffer(); check();
      const hash = await crypto.subtle.digest('SHA-256',bytes); check();
      const digest = Array.from(new Uint8Array(hash),v => v.toString(16).padStart(2,'0')).join('');
      result.push(Object.freeze({id:row.id,name:row.name,signature:JSON.stringify([row.id,row.name,row.mimeType,row.durationMs,row.createdAt,row.blob.size,digest])}));
    }
    return Object.freeze(result);
  }
}
