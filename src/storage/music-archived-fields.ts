import { isMusicDurationSeconds } from '../core/settings';
import type { DeviceMusicTrack } from './device-music-store';
import type { MusicArchiveSource } from './music-import-recovery';
import { exportValueEncoder } from './device-data-export';
import { archiveBinaryPath, archiveFieldEntries, archivedFieldBytes, INERT_ARCHIVED_FIELDS_TOTAL, prepareInertArchivedFields, readInertArchivedFields } from './inert-archived-fields';

const knownFile = new Set(['id','name','mimeType','roomExtension','createdAt','blob','archivedFields']);
const knownPlaylist = new Set(['id','name','tracks']);
const knownEntry = new Set(['id','title','source','locator','addedAt']);
const policy = {format:'kikilink-inert-music-fields',kind:'file',knownFields:new Set(['archivedFields'])};
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9_-]{1,64}$/.test(value);
function fail(): never { throw new Error('Additional archived music fields are unsupported or too large. Keep the original ZIP; no music was changed.'); }

/** Context prefixes retain raw field names without putting data into live settings. */
export function readArchivedMusicFields(raw: string, check: () => void = () => {}) {
  const envelope = readInertArchivedFields(raw,policy,check);
  for (const [key] of envelope.fields) {
    const parts = key.split(':');
    if (parts[0] === 'file' && parts.length >= 2 && !knownFile.has(parts.slice(1).join(':'))) continue;
    if (parts[0] === 'playlist' && parts.length >= 3 && validId(parts[1]) && !knownPlaylist.has(parts.slice(2).join(':'))) continue;
    if (parts[0] === 'entry' && parts.length >= 4 && validId(parts[1]) && validId(parts[2]) && !knownEntry.has(parts.slice(3).join(':'))) continue;
    fail();
  }
  return envelope;
}

export function snapshotMusicSource(source: MusicArchiveSource): MusicArchiveSource {
  if (typeof source.metadata !== 'string' || typeof source.settings !== 'string' || !Array.isArray(source.files)) fail();
  return Object.freeze({metadata:source.metadata,settings:source.settings,files:Object.freeze(source.files.map(file => Object.freeze({name:file.name,blob:file.blob})))});
}

/** Called after known-field source validation. File records carry the inactive
 * copy of their own unknown fields and related playlist/entry JSON fields. No
 * extra properties are installed on the active settings objects. */
export async function prepareMusicFields(source: MusicArchiveSource, prepared: readonly DeviceMusicTrack[], check: () => void): Promise<DeviceMusicTrack[]> {
  check(); source = snapshotMusicSource(source);
  if ([source.metadata,source.settings].some(raw => raw.length > 2*1024*1024 || archivedFieldBytes(raw) > 2*1024*1024)) fail();
  const database = JSON.parse(source.metadata), settings = JSON.parse(source.settings);
  const records = database.stores?.find((s: any) => s.name === 'tracks')?.records, playlists = settings.linkMusic?.playlists;
  if (!Array.isArray(records) || records.length > 100 || !Array.isArray(playlists) || playlists.length > 8) fail();
  const files = new Map<string,Blob>();
  for (const file of source.files) { if (!(file.blob instanceof Blob) || files.has(file.name)) fail(); files.set(archiveBinaryPath(file.name),file.blob); }
  const rows = new Map<string,Array<[string,unknown]>>();
  for (const row of records) {
    if (row?.value?.type !== 'object') fail();
    const entries = archiveFieldEntries(row.value.entries), id = new Map(entries).get('id') as any;
    if (id?.type !== 'value' || !validId(id.value) || rows.has(id.value)) fail(); rows.set(id.value,entries);
  }
  const encodedFiles: Array<{name:string;blob:Blob}> = [], encode = exportValueEncoder(encodedFiles,check);
  const output: DeviceMusicTrack[] = []; let total = 0;
  // Prepared records and all tagged nodes belong to this operation before awaits.
  const selected = prepared.map(file => ({...file}));
  for (const file of selected) {
    check(); const original = rows.get(file.id); if (!original) fail();
    const fields: Array<[string,unknown]> = original.filter(([key]) => key === 'archivedFields' || !knownFile.has(key)).map(([key,node]) => [key === 'archivedFields' ? key : 'file:'+key,node]);
    for (const p of playlists) {
      if (!p || !validId(p.id) || !Array.isArray(p.tracks)) fail();
      const references = p.tracks.filter((t: any) => t?.source === 'local' && t.locator === file.id);
      if (!references.length) continue;
      for (const [key,value] of Object.entries(p)) if (!knownPlaylist.has(key)) fields.push(['playlist:'+p.id+':'+key,encode(value)]);
      for (const entry of references) {
        if (!validId(entry.id)) fail();
        for (const [key,value] of Object.entries(entry)) {
          // Older archives may already contain an inert copy of this formerly unknown field.
          if (key === 'durationSeconds' && isMusicDurationSeconds(value)) continue;
          if (!knownEntry.has(key)) fields.push(['entry:'+p.id+':'+entry.id+':'+key,encode(value)]);
        }
      }
    }
    // Raw JSON settings cannot introduce Blob/File objects or binary references.
    if (encodedFiles.length) fail();
    const archivedFields = await prepareInertArchivedFields(archiveFieldEntries(fields),files,policy,check);
    if (archivedFields !== undefined) {
      readArchivedMusicFields(archivedFields,check); total += archivedFieldBytes(archivedFields);
      if (total > INERT_ARCHIVED_FIELDS_TOTAL) fail(); output.push({...file,archivedFields});
    } else output.push(file);
  }
  check(); return output;
}
