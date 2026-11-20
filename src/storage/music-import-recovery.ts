import type { MusicSettingsBaseline } from '../core/settings';
import type { MusicPlaylist } from '../core/types';
import type { DeviceMusicTrack } from './device-music-store';
import { exportValueEncoder } from './device-data-export';
import type { ZipFile } from '../utils/stored-zip';
import { readArchivedMusicFields } from './music-archived-fields';
import { archivedFieldBytes, INERT_ARCHIVED_FIELDS_TOTAL } from './inert-archived-fields';

export const MUSIC_SOURCE_METADATA_LIMIT = 2*1024*1024;
export const MUSIC_SOURCE_BYTES_LIMIT = 512*1024*1024;
export const MUSIC_RECOVERY_BYTES_LIMIT = 1536*1024*1024;
export interface MusicArchiveSource { readonly metadata: string; readonly settings: string; readonly files: readonly Readonly<ZipFile>[] }
export interface MusicRow { key: IDBValidKey; value: unknown }
export interface MusicImportCopy {
  format: 1; id: number; owner: number; createdAt: number; phase: 'pending'|'complete';
  before: MusicRow[]; beforeSettings: MusicSettingsBaseline; settingsAttempts: MusicSettingsBaseline[]; source: MusicArchiveSource;
  added: DeviceMusicTrack[]; patch: MusicPlaylist[]; bytes: number;
}
export const validMusicId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9_-]{1,64}$/.test(value);
export function musicRowsKey(rows: MusicRow[]): string {
  if (rows.length > 100 || rows.some(row => !validMusicId(row.key) || !row.value || typeof row.value !== 'object' || (row.value as any).id !== row.key || !((row.value as any).blob instanceof Blob))) throw new Error('Current music storage has unsupported records.');
  return JSON.stringify(rows.map(row => row.key).sort());
}
export function musicCopyBytes(value: unknown): number {
  const files: ZipFile[] = [], encode = exportValueEncoder(files,()=>{});
  return new TextEncoder().encode(JSON.stringify(encode(value))).length + files.reduce((sum,file) => sum+file.blob.size,0);
}
const body = (copy: Pick<MusicImportCopy,'before'|'beforeSettings'|'settingsAttempts'|'source'|'added'|'patch'>) => ({before:copy.before,beforeSettings:copy.beforeSettings,settingsAttempts:copy.settingsAttempts,source:copy.source,added:copy.added,patch:copy.patch});
const validBaseline = (value: MusicSettingsBaseline): boolean => !!value && typeof value.canonical === 'string' && (value.saved === null || typeof value.saved === 'string') && [value.canonical,value.saved ?? ''].every(raw => new TextEncoder().encode(raw).length <= MUSIC_SOURCE_METADATA_LIMIT);
export function checkMusicCopies(copies: MusicImportCopy[], owner: number): void {
  const ids = new Set<number>(); let bytes = 0;
  for (const copy of copies) {
    if (copy.format !== 1 || copy.owner !== owner || !Number.isSafeInteger(copy.id) || copy.id < 1 || ids.has(copy.id) || !Number.isSafeInteger(copy.createdAt) || !['pending','complete'].includes(copy.phase) || !Array.isArray(copy.before) || !copy.beforeSettings || typeof copy.beforeSettings.canonical !== 'string' || !(copy.beforeSettings.saved === null || typeof copy.beforeSettings.saved === 'string') || !copy.source || typeof copy.source.metadata !== 'string' || typeof copy.source.settings !== 'string' || !Array.isArray(copy.source.files) || !Array.isArray(copy.added) || !copy.added.length || copy.added.length > 100 || !Array.isArray(copy.patch) || !copy.patch.length || copy.patch.length > 8) throw new Error('Saved music recovery copies are unsupported. Keep them before retrying.');
    if (!validBaseline(copy.beforeSettings) || !Array.isArray(copy.settingsAttempts) || copy.settingsAttempts.length > 5 || !copy.settingsAttempts.every(validBaseline)) throw new Error('Saved music settings copies are unsupported.');
    musicRowsKey(copy.before); ids.add(copy.id);
    let archivedBytes = 0;
    for (const file of copy.added) if (file.archivedFields !== undefined) {
      if (typeof file.archivedFields !== 'string') throw new Error('Saved music fields are unsupported.');
      readArchivedMusicFields(file.archivedFields); archivedBytes += archivedFieldBytes(file.archivedFields);
      if (archivedBytes > INERT_ARCHIVED_FIELDS_TOTAL) throw new Error('Saved music fields exceed their limit.');
    }
    const added = new Set(copy.added.map(track => track.id));
    if (added.size !== copy.added.length || copy.added.some(track => !validMusicId(track.id) || !(track.blob instanceof Blob)) || copy.source.files.some(file => typeof file?.name !== 'string' || !(file.blob instanceof Blob)) || copy.patch.some(playlist => !validMusicId(playlist.id) || typeof playlist.name !== 'string' || !Array.isArray(playlist.tracks) || playlist.tracks.some(track => !validMusicId(track.id) || track.source !== 'local' || !added.has(track.locator)))) throw new Error('Saved music recovery copies are inconsistent.');
    if (new Set(copy.patch.map(p => p.id)).size !== copy.patch.length || copy.patch.reduce((n,p) => n+p.tracks.length,0) > 100 || copy.patch.some(p => !p.tracks.length || new Set(p.tracks.map(t => t.id)).size !== p.tracks.length) || copy.added.some(file => !copy.patch.some(p => p.tracks.some(t => t.locator === file.id)))) throw new Error('Saved music playlist copies are inconsistent.');
    const size = musicCopyBytes(body(copy)); if (size !== copy.bytes) throw new Error('Saved music recovery sizes are inconsistent.'); bytes += size;
  }
  if (copies.length > 3 || bytes > MUSIC_RECOVERY_BYTES_LIMIT || copies.filter(copy => copy.phase === 'pending').length > 1) throw new Error('Saved music recovery copies exceed their limit.');
}
export function prepareMusicCopy(copies: MusicImportCopy[], owner: number, before: MusicRow[], beforeSettings: MusicSettingsBaseline, source: MusicArchiveSource, added: DeviceMusicTrack[], patch: MusicPlaylist[]): MusicImportCopy {
  checkMusicCopies(copies,owner);
  if (copies.some(copy => copy.phase === 'pending')) throw new Error('Finish the unfinished music import before starting another.');
  const settingsAttempts: MusicSettingsBaseline[] = [], id = Math.max(0,...copies.map(copy => copy.id))+1, bytes = musicCopyBytes({before,beforeSettings,settingsAttempts,source,added,patch});
  if (!added.length || !patch.length || !Number.isSafeInteger(id) || copies.length >= 3 || bytes+copies.reduce((sum,copy) => sum+copy.bytes,0) > MUSIC_RECOVERY_BYTES_LIMIT) throw new Error('Music recovery storage is full. No files were changed.');
  const copy: MusicImportCopy = {format:1,id,owner,createdAt:Date.now(),phase:'pending',before,beforeSettings,settingsAttempts,source,added,patch,bytes}; checkMusicCopies([...copies,copy],owner); return copy;
}
/** Preserve each different durable baseline before a retry, without replacing earlier originals. */
export function prepareMusicAttempt(copies: MusicImportCopy[], id: number, owner: number, baseline: MusicSettingsBaseline): MusicImportCopy {
  checkMusicCopies(copies,owner); const copy = copies.find(copy => copy.id === id);
  if (!copy || copy.phase !== 'pending') throw new Error('This unfinished music import changed. Review it again.');
  if ([copy.beforeSettings,...copy.settingsAttempts].some(previous => previous.canonical === baseline.canonical && previous.saved === baseline.saved)) return copy;
  if (copy.settingsAttempts.length >= 5) throw new Error('Five different settings copies are already kept for this import. No copy was removed.');
  const next = {...copy,settingsAttempts:[...copy.settingsAttempts,baseline]}; next.bytes = musicCopyBytes(body(next));
  checkMusicCopies(copies.map(item => item.id === id ? next : item),owner); return next;
}
/** Automatic cleanup keeps imports; explicit removal is blocked only while unfinished. */
export function musicRecoveryHoldIds(copies: MusicImportCopy[], owner: number, pendingOnly = false): Set<string> {
  checkMusicCopies(copies,owner);
  return new Set(copies.filter(copy => !pendingOnly || copy.phase === 'pending').flatMap(copy => copy.added.map(track => track.id)));
}
