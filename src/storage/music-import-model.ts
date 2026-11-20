import { DEFAULT_SETTINGS, isMusicDurationSeconds } from '../core/settings';
import type { MusicPlaylist, MusicTrack } from '../core/types';
import { deviceMusicDatabaseName, MAX_LOCAL_MUSIC_BYTES, MAX_LOCAL_MUSIC_TOTAL_BYTES, type DeviceMusicTrack } from './device-music-store';
import { MUSIC_SOURCE_METADATA_LIMIT, MUSIC_SOURCE_BYTES_LIMIT, musicRowsKey, validMusicId, type MusicArchiveSource, type MusicRow } from './music-import-recovery';

export interface MusicSource { files: DeviceMusicTrack[]; playlists: MusicPlaylist[]; excluded: number }
export interface MusicPlan { added: DeviceMusicTrack[]; patch: MusicPlaylist[]; playlists: MusicPlaylist[]; kept: number; excluded: number; entries: number; newPlaylists: number; bytes: number }
const requireValue = (ok: unknown): void => { if (!ok) throw new Error('The archived music data is unsupported or inconsistent.'); };
const object = (value: any): Record<string,any> => { requireValue(value && typeof value === 'object' && !Array.isArray(value)); return value; };
const scalar = (node: any): any => { const value = object(node); requireValue(value.type === 'value' || value.type === 'number'); return value.value; };
const boundedText = (value: unknown, limit: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value) && value.trim() === value && !/\s{2}/.test(value);
const timestamp = (value: unknown): boolean => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 8640000000000000;

/** Read known fields only. Unknown tagged values and raw settings remain in the recovery source. */
export function prepareMusicSource(source: MusicArchiveSource, owner: number, check: () => void): MusicSource {
  check(); const size = (value: string) => new TextEncoder().encode(value).length;
  requireValue(size(source.metadata) <= MUSIC_SOURCE_METADATA_LIMIT && size(source.settings) <= MUSIC_SOURCE_METADATA_LIMIT);
  const snapshot = object(JSON.parse(source.metadata)), settings = object(JSON.parse(source.settings));
  requireValue(snapshot.name === deviceMusicDatabaseName(owner) && [1,2].includes(snapshot.version) && Array.isArray(snapshot.stores) && snapshot.stores.length === 1);
  requireValue(settings.schemaVersion === undefined || (Number.isSafeInteger(settings.schemaVersion) && settings.schemaVersion >= 1 && settings.schemaVersion <= DEFAULT_SETTINGS.schemaVersion));
  const store = object(snapshot.stores[0]);
  requireValue(store.name === 'tracks' && store.keyPath === 'id' && store.autoIncrement === false && Array.isArray(store.indexes) && !store.indexes.length && Array.isArray(store.records) && store.records.length <= 100);
  const payload = new Map(source.files.map(file => [file.name,file.blob]));
  requireValue(payload.size === source.files.length && source.files.reduce((n,file) => n+file.blob.size,0) <= MUSIC_SOURCE_BYTES_LIMIT);
  const files: DeviceMusicTrack[] = [], ids = new Set<string>();
  for (const row of store.records) {
    check(); const node = object(row.value); requireValue(node.type === 'object' && Array.isArray(node.entries));
    const fields = new Map<string,any>(node.entries); requireValue(fields.size === node.entries.length);
    const id = scalar(fields.get('id')), name = scalar(fields.get('name')), mimeType = scalar(fields.get('mimeType')), createdAt = scalar(fields.get('createdAt'));
    const extension = fields.has('roomExtension') && fields.get('roomExtension').type !== 'undefined' ? scalar(fields.get('roomExtension')) : undefined;
    requireValue(validMusicId(id) && scalar(row.key) === id && !ids.has(id)); ids.add(id);
    requireValue(typeof name === 'string' && name.length > 0 && name.length <= 80 && !/[\u0000-\u001f\u007f]/.test(name) && timestamp(createdAt));
    requireValue(typeof mimeType === 'string' && (mimeType.toLowerCase().startsWith('audio/') || ['video/mp4','application/octet-stream',''].includes(mimeType)) && (extension === undefined || extension === 'mp3' || extension === 'mp4'));
    const tag = object(fields.get('blob')), file = payload.get(tag.path);
    requireValue(['blob','file'].includes(tag.type) && typeof tag.mimeType === 'string' && (tag.mimeType === mimeType || (mimeType === 'application/octet-stream' && tag.mimeType === '')) && file instanceof Blob && file.size > 0 && file.size <= MAX_LOCAL_MUSIC_BYTES);
    files.push({id,name,mimeType,...(extension ? {roomExtension:extension} : {}),createdAt,blob:file!.slice(0,file!.size,tag.mimeType)});
  }
  const raw = object(settings.linkMusic).playlists; requireValue(Array.isArray(raw) && raw.length <= 8);
  const playlists: MusicPlaylist[] = [], playlistIds = new Set<string>(); let count = 0, excluded = 0;
  for (const item of raw) {
    check(); const p = object(item); requireValue(validMusicId(p.id) && !playlistIds.has(p.id) && boundedText(p.name,60) && Array.isArray(p.tracks)); playlistIds.add(p.id);
    count += p.tracks.length; requireValue(count <= 100); const tracks: MusicTrack[] = [], trackIds = new Set<string>();
    for (const item of p.tracks) {
      const track = object(item); if (track.source !== 'local') { excluded++; continue; }
      requireValue(validMusicId(track.id) && !trackIds.has(track.id) && boundedText(track.title,80) && validMusicId(track.locator) && timestamp(track.addedAt)); trackIds.add(track.id);
      tracks.push({
        id: track.id, title: track.title, source: 'local', locator: track.locator, addedAt: track.addedAt,
        ...(isMusicDurationSeconds(track.durationSeconds) ? {durationSeconds: track.durationSeconds} : {}),
      });
    }
    playlists.push({id:p.id,name:p.name,tracks});
  }
  return {files,playlists,excluded};
}

/** Fresh imports only attach newly restored files; an existing file ID keeps its current meaning. */
export function planMusicImport(source: MusicSource, rows: MusicRow[], current: MusicPlaylist[]): MusicPlan {
  const stored = new Set<string>(JSON.parse(musicRowsKey(rows))), available = new Map(source.files.map(file => [file.id,file]));
  let bytes = rows.reduce((n,row) => n+(row.value as DeviceMusicTrack).blob.size,0), entries = current.reduce((n,p) => n+p.tracks.length,0), excluded = source.excluded;
  if (bytes > MAX_LOCAL_MUSIC_TOTAL_BYTES) throw new Error('Current music storage exceeds its byte limit.');
  const playlists = structuredClone(current), added = new Map<string,DeviceMusicTrack>(), patch: MusicPlaylist[] = []; let newPlaylists = 0;
  for (const archived of source.playlists) {
    let target = playlists.find(p => p.id === archived.id); const changes: MusicTrack[] = [];
    for (const track of archived.tracks) {
      const file = available.get(track.locator);
      if (!file || stored.has(track.locator) || target?.tracks.some(t => t.id === track.id) || entries >= 100 || (!target && playlists.length >= 8) || (!added.has(file.id) && (rows.length+added.size >= 100 || bytes+file.blob.size > MAX_LOCAL_MUSIC_TOTAL_BYTES))) { excluded++; continue; }
      if (!target) { target = {id:archived.id,name:archived.name,tracks:[]}; playlists.push(target); newPlaylists++; }
      if (!added.has(file.id)) { added.set(file.id,file); bytes += file.blob.size; }
      target.tracks.push({...track}); changes.push({...track}); entries++;
    }
    if (changes.length) patch.push({id:archived.id,name:archived.name,tracks:changes});
  }
  const files = [...added.values()];
  return {added:files,patch,playlists,kept:source.files.filter(file => stored.has(file.id)).length,excluded,entries:patch.reduce((n,p) => n+p.tracks.length,0),newPlaylists,bytes:files.reduce((n,file) => n+file.blob.size,0)};
}

/** An interrupted import must finish its entire saved patch or leave current playlists untouched. */
export function mergeMusicPatch(current: MusicPlaylist[], patch: MusicPlaylist[]): {playlists:MusicPlaylist[];entries:number;newPlaylists:number} {
  const playlists = structuredClone(current); let entries = 0, newPlaylists = 0;
  for (const saved of patch) {
    let target = playlists.find(p => p.id === saved.id);
    if (!target) { if (playlists.length >= 8) throw new Error('There is no room for the unfinished import’s playlists.'); target = {id:saved.id,name:saved.name,tracks:[]}; playlists.push(target); newPlaylists++; }
    for (const track of saved.tracks) {
      const existing = target.tracks.find(t => t.id === track.id);
      if (existing) { if (existing.source !== 'local' || existing.locator !== track.locator) throw new Error('A current playlist entry conflicts with the unfinished import.'); continue; }
      target.tracks.push({...track}); entries++;
    }
  }
  if (playlists.reduce((n,p) => n+p.tracks.length,0) > 100) throw new Error('There is no room for all unfinished playlist entries.');
  return {playlists,entries,newPlaylists};
}
