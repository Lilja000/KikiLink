import { deviceSoundDatabaseName, readAudioDurationMs, MAX_NOTIFICATION_SOUNDS, MAX_NOTIFICATION_SOUND_BYTES, MAX_NOTIFICATION_SOUND_TOTAL_BYTES, MAX_NOTIFICATION_SOUND_DURATION_MS, type DeviceNotificationSound } from './device-notification-sound-store';
import { exportValueEncoder } from './device-data-export';
import type { ZipFile } from '../utils/stored-zip';
import { archiveBinaryPath, archiveFieldEntries, archivedFieldBytes, INERT_ARCHIVED_FIELDS_TOTAL, prepareInertArchivedFields } from './inert-archived-fields';
import { soundFieldPolicy, readArchivedSoundFields } from './sound-archived-fields';

export const SOUND_SOURCE_METADATA_LIMIT = 2*1024*1024;
export const SOUND_SOURCE_BYTES_LIMIT = 40*1024*1024;
export const SOUND_RECOVERY_BYTES_LIMIT = 240*1024*1024;
export interface SoundArchiveSource { readonly metadata: string; readonly files: readonly Readonly<ZipFile>[] }
export interface SoundRow { key: IDBValidKey; value: unknown }
export interface SoundImportCopy { format:1; id:number; createdAt:number; owner:number; before:SoundRow[]; source:SoundArchiveSource; added:DeviceNotificationSound[]; bytes:number }
export interface SoundPlan { added:DeviceNotificationSound[]; kept:number; excluded:number; bytes:number }
const requireValue = (ok: unknown): void => { if (!ok) throw new Error('The archived notification sounds are unsupported or inconsistent.'); };
const object = (value: any): Record<string,any> => { requireValue(value && typeof value === 'object' && !Array.isArray(value)); return value; };
const scalar = (node: any): any => { const value = object(node); requireValue(value.type === 'value' || value.type === 'number'); return value.value; };
export const validSoundId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9_-]{1,64}$/i.test(value);
export function soundKeys(rows: SoundRow[]): string {
  requireValue(rows.length <= MAX_NOTIFICATION_SOUNDS);
  return JSON.stringify(rows.map(row => { requireValue(validSoundId(row.key) && object(row.value).id === row.key && object(row.value).blob instanceof Blob); return row.key; }).sort());
}

export function snapshotSoundSource(source: SoundArchiveSource): SoundArchiveSource {
  requireValue(typeof source.metadata === 'string' && Array.isArray(source.files));
  return Object.freeze({metadata:source.metadata,files:Object.freeze(source.files.map(file => Object.freeze({name:file.name,blob:file.blob})))});
}

/** Decode known fields, retain extras as inactive data and inspect audio without playing it. */
export async function prepareSounds(source: SoundArchiveSource, owner: number, check: () => void, signal: AbortSignal, inspect = readAudioDurationMs): Promise<DeviceNotificationSound[]> {
  check(); source = snapshotSoundSource(source); requireValue(source.metadata.length <= SOUND_SOURCE_METADATA_LIMIT && archivedFieldBytes(source.metadata) <= SOUND_SOURCE_METADATA_LIMIT);
  const snapshot = object(JSON.parse(source.metadata));
  requireValue(snapshot.name === deviceSoundDatabaseName(owner) && [1,2].includes(snapshot.version) && Array.isArray(snapshot.stores) && snapshot.stores.length === 1);
  const store = object(snapshot.stores[0]);
  requireValue(store.name === 'sounds' && store.keyPath === 'id' && store.autoIncrement === false && Array.isArray(store.indexes) && !store.indexes.length && Array.isArray(store.records) && store.records.length <= MAX_NOTIFICATION_SOUNDS);
  const files = new Map(source.files.map(file => { requireValue(file.blob instanceof Blob); return [archiveBinaryPath(file.name),file.blob] as const; }));
  requireValue(files.size === source.files.length && source.files.reduce((n,file) => n+file.blob.size,0) <= SOUND_SOURCE_BYTES_LIMIT);
  const ids = new Set<string>(), result: DeviceNotificationSound[] = []; let archivedBytes = 0;
  for (const row of store.records) {
    check(); const node = object(row.value); requireValue(node.type === 'object' && Array.isArray(node.entries));
    const entries = archiveFieldEntries(node.entries), fields = new Map<string,any>(entries);
    const id = scalar(fields.get('id')), name = scalar(fields.get('name')), mimeType = scalar(fields.get('mimeType')), durationMs = scalar(fields.get('durationMs')), createdAt = scalar(fields.get('createdAt'));
    requireValue(validSoundId(id) && scalar(row.key) === id && !ids.has(id)); ids.add(id);
    requireValue(typeof name === 'string' && name.length > 0 && name.length <= 60 && !/[\u0000-\u001f\u007f]/.test(name));
    requireValue(typeof mimeType === 'string' && (mimeType.toLowerCase().startsWith('audio/') || ['', 'application/octet-stream','video/mp4'].includes(mimeType)));
    requireValue(Number.isSafeInteger(durationMs) && durationMs > 0 && durationMs <= MAX_NOTIFICATION_SOUND_DURATION_MS && Number.isSafeInteger(createdAt) && createdAt >= 0 && createdAt <= 8640000000000000);
    const tag = object(fields.get('blob')), file = files.get(tag.path);
    requireValue(['blob','file'].includes(tag.type) && tag.mimeType === mimeType && file instanceof Blob && file.size > 0 && file.size <= MAX_NOTIFICATION_SOUND_BYTES);
    const archivedFields = await prepareInertArchivedFields(entries,files,soundFieldPolicy,check);
    if (archivedFields !== undefined) { archivedBytes += archivedFieldBytes(archivedFields); requireValue(archivedBytes <= INERT_ARCHIVED_FIELDS_TOTAL); }
    const blob = file!.slice(0,file!.size,mimeType), measured = await inspect(blob,signal); check();
    // Small browser/container rounding differences are allowed; the five-second limit is strict.
    if (!Number.isSafeInteger(measured) || measured <= 0 || measured > MAX_NOTIFICATION_SOUND_DURATION_MS || Math.abs(measured-durationMs) > 100) throw new Error('A saved sound’s duration does not match its audio or exceeds five seconds.');
    result.push({id,name,mimeType,durationMs,createdAt,blob,...(archivedFields !== undefined ? {archivedFields} : {})});
  }
  return result;
}

export function planSoundImport(sounds: DeviceNotificationSound[], current: SoundRow[]): SoundPlan {
  const keys = new Set<string>(JSON.parse(soundKeys(current))); let total = current.reduce((n,row) => n+(row.value as DeviceNotificationSound).blob.size,0);
  if (total > MAX_NOTIFICATION_SOUND_TOTAL_BYTES) throw new Error('Current notification sounds exceed their storage limit.');
  const added: DeviceNotificationSound[] = []; let kept = 0, excluded = 0;
  for (const sound of [...sounds].sort((a,b) => b.createdAt-a.createdAt || a.id.localeCompare(b.id))) {
    if (keys.has(sound.id)) { kept++; continue; }
    if (current.length+added.length >= MAX_NOTIFICATION_SOUNDS || total+sound.blob.size > MAX_NOTIFICATION_SOUND_TOTAL_BYTES) { excluded++; continue; }
    added.push(sound); total += sound.blob.size;
  }
  return {added,kept,excluded,bytes:added.reduce((n,sound) => n+sound.blob.size,0)};
}
export function soundCopyBytes(value: unknown): number {
  const files: ZipFile[] = [], encode = exportValueEncoder(files,() => {});
  return new TextEncoder().encode(JSON.stringify(encode(value))).length+files.reduce((n,file) => n+file.blob.size,0);
}
export function checkSoundCopies(copies: SoundImportCopy[], owner: number): void {
  const ids = new Set<number>(); let total = 0;
  for (const copy of copies) {
    if (copy.format !== 1 || copy.owner !== owner || !Number.isSafeInteger(copy.id) || copy.id < 1 || ids.has(copy.id) || !Number.isSafeInteger(copy.createdAt) || !Array.isArray(copy.before) || !Array.isArray(copy.added) || !copy.added.length || copy.added.length > MAX_NOTIFICATION_SOUNDS || !copy.source || typeof copy.source.metadata !== 'string' || !Array.isArray(copy.source.files)) throw new Error('Saved sound recovery copies are unsupported. Keep them before retrying.');
    if (copy.added.some(sound => !validSoundId(sound.id) || !(sound.blob instanceof Blob)) || new Set(copy.added.map(sound => sound.id)).size !== copy.added.length || copy.source.files.some(file => typeof file?.name !== 'string' || !(file.blob instanceof Blob))) throw new Error('Saved sound recovery copies are inconsistent.');
    soundKeys(copy.before);
    let archivedBytes = 0;
    for (const sound of copy.added) if (sound.archivedFields !== undefined) {
      requireValue(typeof sound.archivedFields === 'string'); readArchivedSoundFields(sound.archivedFields);
      archivedBytes += archivedFieldBytes(sound.archivedFields); requireValue(archivedBytes <= INERT_ARCHIVED_FIELDS_TOTAL);
    }
    ids.add(copy.id); const bytes = soundCopyBytes({before:copy.before,source:copy.source,added:copy.added});
    if (bytes !== copy.bytes) throw new Error('Saved sound recovery sizes are inconsistent.'); total += bytes;
  }
  if (copies.length > 3 || total > SOUND_RECOVERY_BYTES_LIMIT) throw new Error('Saved sound recovery copies exceed their limit.');
}
export function prepareSoundCopy(copies: SoundImportCopy[], owner: number, before: SoundRow[], source: SoundArchiveSource, added: DeviceNotificationSound[]): SoundImportCopy {
  checkSoundCopies(copies,owner); const bytes = soundCopyBytes({before,source,added}), id = Math.max(0,...copies.map(copy => copy.id))+1;
  if (!added.length || !Number.isSafeInteger(id) || copies.length >= 3 || bytes+copies.reduce((n,copy) => n+copy.bytes,0) > SOUND_RECOVERY_BYTES_LIMIT) throw new Error('Sound recovery storage is full. No sounds were changed.');
  const copy: SoundImportCopy = {format:1,id,createdAt:Date.now(),owner,before,source,added,bytes}; checkSoundCopies([...copies,copy],owner); return copy;
}
