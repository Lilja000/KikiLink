import {THREAD_COPY_TOTAL} from './thread-history-copy-model';
import {THREAD_SOURCE_METADATA,type ThreadHistoryDeviceSource} from './thread-history-device-source';
import { CHAT_FILE_METADATA_LIMIT, CHAT_FILE_TOTAL, type ChatFileSource } from './chat-file-model';
import { FEED_DRAFT_METADATA_KEY } from "../cloud/feed-draft-metadata";
import { FEED_SOURCE_METADATA_LIMIT, FEED_SOURCE_BYTES_LIMIT, type FeedArchiveSource } from "./feed-import-model";
import { KIKILINK_PLATFORM_PREVIEW } from '../core/distribution';
import { readStoredZip, verifyEntry, type StoredZipEntry } from '../utils/read-stored-zip';
import { deviceDataDatabases, isDeviceCredentialKey } from './device-data-export';
import { SETTINGS_KEY } from '../core/settings';
import { SETTINGS_SOURCE_LIMIT } from '../core/settings-persistence';
import { SETTINGS_ARCHIVED_SOURCES_KEY, SETTINGS_ARCHIVED_SOURCES_LIMIT } from '../core/settings-archived-sources';
import { GALLERY_SOURCE_METADATA_LIMIT, GALLERY_SOURCE_BYTES_LIMIT, type GalleryArchiveSource } from './gallery-import-model';
import { SOUND_SOURCE_METADATA_LIMIT, SOUND_SOURCE_BYTES_LIMIT, type SoundArchiveSource } from './sound-import-model';
import { MUSIC_SOURCE_METADATA_LIMIT, MUSIC_SOURCE_BYTES_LIMIT, type MusicArchiveSource } from './music-import-recovery';
import { CHAT_IMPORT_SOURCE_LIMIT } from './chat-import-model';
import type {ChatArchiveSource} from './chat-archived-fields';

export interface DeviceArchiveReview {
  readonly owner: number; readonly exportedAt: string; readonly addonVersion: string;
  readonly accountEntries: number; readonly excludedKeys: number; readonly records: number;
  readonly binaryFiles: number; readonly binaryBytes: number; readonly archiveBytes: number;
  readonly settingsAvailable: boolean;
  readonly chatAvailable: boolean;
  readonly galleryAvailable: boolean;
  readonly chatFilesAvailable?: boolean;
  readonly threadHistoryAvailable?: boolean;
  readonly musicAvailable: boolean;
  readonly soundsAvailable: boolean;
  readonly feedAvailable: boolean;
  readonly databases: readonly Readonly<{ label: string; status: 'captured' | 'absent'; records: number }>[];
}
const checkedThreadHistory=new WeakMap<DeviceArchiveReview,{owner:number;source?:ThreadHistoryDeviceSource;tooLarge:boolean}>();
export function threadHistoryFromDeviceArchive(review:DeviceArchiveReview,owner:number):ThreadHistoryDeviceSource {
 const data=checkedThreadHistory.get(review);if(!data||data.owner!==owner)throw new Error('Select and check this account’s archive again.');
 if(data.tooLarge)throw new Error('Saved group/channel history exceeds the 2 MiB metadata or 256 MiB ZIP limit.');
 if(!data.source)throw new Error('This archive contains no saved group/channel history.');return data.source;
}
const checkedChatFiles=new WeakMap<DeviceArchiveReview,{owner:number;source?:ChatFileSource;tooLarge:boolean}>();
export function chatFilesFromDeviceArchive(review:DeviceArchiveReview,owner:number):ChatFileSource {
 const data=checkedChatFiles.get(review);if(!data||data.owner!==owner)throw new Error('Select and check this account’s archive again.');
 if(data.tooLarge)throw new Error('Saved chat files exceed the 2 MiB metadata or 128 MiB file limit.');
 if(!data.source)throw new Error('This archive contains no saved chat files.');return data.source;
}
const checkedSettings = new WeakMap<DeviceArchiveReview,{owner:number;source?:string;tooLarge:boolean;archived?:string;archivedTooLarge:boolean}>();
const checkedChat = new WeakMap<DeviceArchiveReview,{owner:number;source?:string;tooLarge:boolean;files?:ChatArchiveSource['files']}>();
const checkedGallery = new WeakMap<DeviceArchiveReview,{owner:number;source?:GalleryArchiveSource;tooLarge:boolean}>();
const checkedMusic = new WeakMap<DeviceArchiveReview,{owner:number;source?:MusicArchiveSource;tooLarge:boolean}>();
const checkedSounds = new WeakMap<DeviceArchiveReview,{owner:number;source?:SoundArchiveSource;tooLarge:boolean}>();
const checkedFeed = new WeakMap<DeviceArchiveReview,{owner:number;source?:FeedArchiveSource;tooLarge:boolean}>();
export function feedFromDeviceArchive(review:DeviceArchiveReview,owner:number):FeedArchiveSource {
  const data=checkedFeed.get(review);if(!data||data.owner!==owner)throw new Error('Select and check this account’s archive again.');
  if(data.tooLarge)throw new Error('Archived Feed data exceeds its metadata or image limit.');
  if(!data.source)throw new Error('This archive does not contain a saved Feed draft.');return data.source;
}
export function soundsFromDeviceArchive(review: DeviceArchiveReview, owner: number): SoundArchiveSource {
  const data = checkedSounds.get(review);
  if (!data || data.owner !== owner) throw new Error('Select and check this account’s archive again.');
  if (data.tooLarge) throw new Error('Archived sounds exceed this import’s 2 MiB metadata or 40 MiB file limit.');
  if (!data.source) throw new Error('This archive does not contain saved notification sounds.');
  return data.source;
}
export function musicFromDeviceArchive(review: DeviceArchiveReview, owner: number): MusicArchiveSource {
  const data = checkedMusic.get(review);
  if (!data || data.owner !== owner) throw new Error('Select and check this account’s archive again.');
  if (data.tooLarge) throw new Error('Archived music exceeds this import’s metadata, settings or file limit.');
  if (!data.source) throw new Error('This archive does not contain music files and their saved playlists.');
  return data.source;
}
export function galleryFromDeviceArchive(review: DeviceArchiveReview, owner: number): GalleryArchiveSource {
  const data = checkedGallery.get(review);
  if (!data || data.owner !== owner) throw new Error('Select and check this account’s archive again.');
  if (data.tooLarge) throw new Error('The archived Gallery exceeds this import’s 2 MiB metadata or 128 MiB file limit.');
  if (!data.source) throw new Error('This archive does not contain saved Gallery images.');
  return data.source;
}
export function chatFromDeviceArchive(review: DeviceArchiveReview, owner: number): string {
  const data = checkedChat.get(review);
  if (!data || data.owner !== owner) throw new Error('Select and check this account’s archive again.');
  if (data.tooLarge) throw new Error('The archived chat history is too large for this restore.');
  if (!data.source) throw new Error('This archive does not contain saved chat history.');
  return data.source;
}
/** Same checked source plus original binary bytes for inactive additional fields. */
export function chatWithFieldsFromDeviceArchive(review:DeviceArchiveReview,owner:number):ChatArchiveSource {
 const metadata=chatFromDeviceArchive(review,owner),data=checkedChat.get(review)!;
 return Object.freeze({metadata,files:data.files??Object.freeze([])});
}
/** Only a successful reader-issued review exposes its original, with the same owner. */
export function settingsFromDeviceArchive(review: DeviceArchiveReview, owner: number): string {
  const data = checkedSettings.get(review);
  if (!data || data.owner !== owner) throw new Error('Select and check this account’s archive again.');
  if (data.tooLarge) throw new Error('The archived settings are too large for this KikiLink version.');
  if (data.source === undefined) throw new Error('This archive does not contain saved settings.');
  return data.source;
}
/** Additional device-only originals share the same verified ZIP and owner capability. */
export function archivedSettingsFromDeviceArchive(review: DeviceArchiveReview, owner: number): string | undefined {
  settingsFromDeviceArchive(review, owner);
  const data = checkedSettings.get(review)!;
  if (data.archivedTooLarge) throw new Error('Additional archived settings are too large. No settings have been changed.');
  return data.archived;
}
interface ReviewOptions { owner: number; current: () => boolean; signal: AbortSignal; progress?: (message: string) => void }
type Data = Record<string,unknown>;
const invalid = (): never => { throw new Error('The archive contains unsupported or inconsistent data. No saved data was changed.'); };
function requireData(valid: unknown): asserts valid { if (!valid) invalid(); }
const object = (value: unknown): Data => { requireData(value !== null && typeof value === 'object' && !Array.isArray(value)); return value as Data; };
const fields = (value: unknown, names: string[]): Data => { const data = object(value); requireData(Object.keys(data).length === names.length && names.every(name => Object.hasOwn(data,name))); return data; };
const list = (value: unknown): unknown[] => { requireData(Array.isArray(value)); return value; };
const text = (value: unknown): string => { requireData(typeof value === 'string'); return value; };
const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER): number => { requireData(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max); return value; };
const pair = (value: unknown): [unknown,unknown] => { const items = list(value); requireData(items.length === 2); return items as [unknown,unknown]; };
const keyPath = (value: unknown, nullable: boolean): void => { requireData((nullable && value === null) || typeof value === 'string' || (Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string'))); };
const isoDate = (value: unknown): string => { const date = text(value); requireData(date.length === 24 && Number.isFinite(Date.parse(date)) && new Date(date).toISOString() === date); return date; };
const pause = () => new Promise<void>(resolve => setTimeout(resolve,0));

/** Validate tags as inert data. Do not construct objects from saved keys or execute saved values. */
function valueValidator(entries: Map<string,StoredZipEntry>, check: () => void) {
  let nodes = 0; const usedBinary = new Set<string>();
  const binary = (value: unknown): StoredZipEntry => {
    const path = text(value); requireData(/^binary\/[0-9]{5}\.bin$/.test(path) && !usedBinary.has(path));
    const entry = entries.get(path); requireData(entry); usedBinary.add(path); return entry;
  };
  const validate = (value: unknown, depth = 0): void => {
    check(); requireData(++nodes <= 2000000 && depth <= 64); const data = object(value), type = text(data.type);
    switch (type) {
      case 'value': fields(data,['type','value']); requireData(data.value === null || typeof data.value === 'string' || typeof data.value === 'boolean'); break;
      case 'number': fields(data,['type','value']); requireData((typeof data.value === 'number' && Number.isFinite(data.value)) || ['-0','NaN','Infinity','-Infinity'].includes(data.value as string)); break;
      case 'undefined': fields(data,['type']); break;
      case 'bigint': fields(data,['type','value']); requireData(/^(0|-?[1-9][0-9]*)$/.test(text(data.value))); break;
      case 'date': {
        fields(data,['type','milliseconds']); validate(data.milliseconds,depth+1); const n = object(data.milliseconds);
        requireData(n.type === 'number' && (n.value === 'NaN' || (typeof n.value === 'number' && Number.isInteger(n.value) && Math.abs(n.value) <= 8640000000000000))); break;
      }
      case 'blob': fields(data,['type','path','mimeType']); text(data.mimeType); binary(data.path); break;
      case 'file': fields(data,['type','path','mimeType','name','lastModified']); text(data.mimeType); text(data.name); requireData(typeof data.lastModified === 'number' && Number.isFinite(data.lastModified) && Number.isInteger(data.lastModified)); binary(data.path); break;
      case 'array-buffer': fields(data,['type','path']); binary(data.path); break;
      case 'array-buffer-view': {
        fields(data,['type','name','byteOffset','byteLength','buffer']); const name = text(data.name);
        const sizes: Record<string,number> = {Int8Array:1,Uint8Array:1,Uint8ClampedArray:1,Int16Array:2,Uint16Array:2,Float16Array:2,Int32Array:4,Uint32Array:4,Float32Array:4,Float64Array:8,BigInt64Array:8,BigUint64Array:8,DataView:1};
        requireData(Object.hasOwn(sizes,name)); const size = sizes[name]!, offset = integer(data.byteOffset), length = integer(data.byteLength), buffer = object(data.buffer);
        requireData(buffer.type === 'array-buffer'); validate(buffer,depth+1);
        requireData(offset % size === 0 && length % size === 0 && offset+length <= entries.get(text(buffer.path))!.blob.size); break;
      }
      case 'array':
      case 'object': {
        fields(data,type === 'array' ? ['type','length','entries'] : ['type','entries']); const length = type === 'array' ? integer(data.length,0xffffffff) : 0;
        const keys = new Set<string>(); for (const item of list(data.entries)) {
          const [rawKey,child] = pair(item), key = text(rawKey); requireData(!keys.has(key)); keys.add(key);
          if (type === 'array') { requireData(key !== 'length'); if (/^(0|[1-9][0-9]*)$/.test(key) && Number(key) < 0xffffffff) requireData(Number(key) < length); }
          validate(child,depth+1);
        } break;
      }
      case 'map': fields(data,['type','entries']); for (const item of list(data.entries)) { const [key,child] = pair(item); validate(key,depth+1); validate(child,depth+1); } break;
      case 'set': fields(data,['type','values']); for (const child of list(data.values)) validate(child,depth+1); break;
      default: invalid();
    }
  };
  const validKey = (value: unknown): boolean => {
    const data = object(value);
    if (data.type === 'value') return typeof data.value === 'string';
    if (data.type === 'number') return typeof data.value === 'number' || data.value === '-0';
    if (data.type === 'date') return typeof object(data.milliseconds).value === 'number';
    if (data.type === 'array-buffer' || data.type === 'array-buffer-view') return true;
    if (data.type !== 'array') return false;
    const items = list(data.entries); return items.length === data.length && items.every(item => {
      const [key,child] = pair(item); return /^(0|[1-9][0-9]*)$/.test(text(key)) && Number(key) < items.length && validKey(child);
    });
  };
  return { validate, validKey, usedBinary };
}

/** Pure, read-only review of device formats1/2/3. No persistence or Cloud access. */
export async function reviewDeviceArchive(file: Blob, options: ReviewOptions): Promise<DeviceArchiveReview> {
  const check = () => { if (options.signal.aborted || !options.current()) throw new Error('Archive review cancelled.'); };
  check(); deviceDataDatabases(options.owner); options.progress?.('Checking archive layout…');
  const entries = await readStoredZip(file,check); let metadataBytes = 0;
  for (const [name,entry] of entries) {
    requireData(/^(manifest\.json|storage\/account\.json|README\.txt|databases\/[0-6]\.json|binary\/[0-9]{5}\.bin)$/.test(name));
    if (name.endsWith('.json')) metadataBytes += entry.blob.size;
    if (name === 'README.txt') requireData(entry.blob.size <= 4096);
  }
  requireData(metadataBytes <= 64*1024*1024 && entries.has('README.txt'));
  const readJSON = async (name: string): Promise<unknown> => {
    const entry = entries.get(name); requireData(entry); await verifyEntry(entry,check);
    const bytes = await entry.blob.arrayBuffer(); check(); let result: unknown;
    try { result = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); } catch { invalid(); }
    check(); return result;
  };
  const manifest = fields(await readJSON('manifest.json'),['format','version','owner','distribution','addonVersion','startedAt','capturedAt','consistency','encoding','exclusions','databases','accountEntries','records','payloadFiles']);
  requireData(manifest.format === 'kikilink-device-data');
  if (manifest.version !== 1 && manifest.version !== 2 && manifest.version !== 3) throw new Error('This device archive format is not supported by this KikiLink version.');
  const specs=deviceDataDatabases(options.owner,manifest.version);
  for(const name of entries.keys())if(name.startsWith('databases/'))requireData(Number(name.slice(10,-5))<specs.length);
  if (manifest.owner !== options.owner) throw new Error('This archive belongs to another BC account.');
  if (manifest.distribution !== (KIKILINK_PLATFORM_PREVIEW ? 'platform-preview' : 'stable')) throw new Error('This archive belongs to another KikiLink build storage scope.');
  const startedAt = isoDate(manifest.startedAt), exportedAt = isoDate(manifest.capturedAt); requireData(startedAt <= exportedAt);
  const addonVersion = text(manifest.addonVersion); requireData(addonVersion.length > 0 && addonVersion.length <= 256);
  text(manifest.consistency); text(manifest.encoding); for (const note of list(manifest.exclusions)) text(note);
  const accountEntries = integer(manifest.accountEntries,2000), expectedRecords = integer(manifest.records,100000);
  const payload = new Set<string>();
  for (const item of list(manifest.payloadFiles)) {
    const data = fields(item,['path','bytes']), path = text(data.path), entry = entries.get(path);
    requireData(entry && path !== 'manifest.json' && path !== 'README.txt' && !payload.has(path) && integer(data.bytes) === entry.blob.size); payload.add(path);
  }
  requireData(payload.size === entries.size-2 && payload.has('storage/account.json'));
  const account = fields(await readJSON('storage/account.json'),['entries','excludedKeys']), keys = new Set<string>(); let localBytes = 0;
  const localEntries = list(account.entries); requireData(localEntries.length === accountEntries);
  for (const item of localEntries) {
    check(); const [rawKey,rawValue] = pair(item), key = text(rawKey), value = text(rawValue);
    requireData(key.length <= 2048 && !keys.has(key) && !isDeviceCredentialKey(key)); keys.add(key); localBytes += new TextEncoder().encode(key+value).length;
    requireData(localBytes <= 32*1024*1024);
  }
  const excluded = list(account.excludedKeys); for (const raw of excluded) { const key = text(raw); requireData(!keys.has(key) && isDeviceCredentialKey(key)); keys.add(key); }
  const databases: Array<{label:string;status:'captured'|'absent';records:number}> = [], validator = valueValidator(entries,check);
  const rawDatabases = list(manifest.databases); requireData(rawDatabases.length === specs.length); let records = 0, chatSource: string | undefined, chatTooLarge = false;
  let chatFieldsFiles:ChatArchiveSource['files']|undefined;
  let gallerySource: GalleryArchiveSource | undefined, galleryTooLarge = false;
  let chatFileSource: ChatFileSource | undefined, chatFileTooLarge = false;
  let threadSource:ThreadHistoryDeviceSource|undefined,threadTooLarge=false;
  let musicSource: Omit<MusicArchiveSource,'settings'> | undefined, musicTooLarge = false;
  let soundSource: SoundArchiveSource | undefined, soundTooLarge = false;
  let feedSource: Omit<FeedArchiveSource,'draft'> | undefined, feedTooLarge = false;
  for (const [index,spec] of specs.entries()) {
    check(); const status = object(rawDatabases[index]).status;
    const db = fields(rawDatabases[index],status === 'absent' ? ['name','label','status'] : ['name','label','status','path','stores','records']);
    requireData(db.name === spec.name && db.label === spec.label);
    const path = `databases/${index}.json`;
    if (status === 'absent') { requireData(!entries.has(path)); databases.push({label:spec.label,status,records:0}); continue; }
    requireData(status === 'captured' && db.path === path); options.progress?.(`Checking ${spec.label.toLowerCase()}…`);
    const snapshot = fields(await readJSON(path),['name','version','stores']); requireData(snapshot.name === spec.name && (snapshot.version === 1 || ([1,2,3,4].includes(index) && snapshot.version === 2)));
    if (index === 0) { const raw = JSON.stringify(snapshot); chatTooLarge = new TextEncoder().encode(raw).length > CHAT_IMPORT_SOURCE_LIMIT; if (!chatTooLarge) chatSource = raw; }
    const stores = list(snapshot.stores); requireData(stores.length > 0 && stores.length <= 32 && integer(db.stores,32) === stores.length);
    const names = new Set<string>(); let databaseRecords = 0;
    for (const rawStore of stores) {
      const store = fields(rawStore,['name','keyPath','autoIncrement','indexes','records']), name = text(store.name);
      requireData(!names.has(name) && typeof store.autoIncrement === 'boolean'); names.add(name); keyPath(store.keyPath,true);
      const indexes = new Set<string>(); for (const rawIndex of list(store.indexes)) {
        const idx = fields(rawIndex,['name','keyPath','unique','multiEntry']), name = text(idx.name);
        requireData(!indexes.has(name) && typeof idx.unique === 'boolean' && typeof idx.multiEntry === 'boolean'); indexes.add(name); keyPath(idx.keyPath,false);
      }
      const rows = list(store.records); databaseRecords += rows.length; records += rows.length; requireData(records <= 100000);
      const recordKeys = new Set<string>();
      for (const [i,row] of rows.entries()) {
        const record = fields(row,['key','value']); validator.validate(record.key); requireData(validator.validKey(record.key)); validator.validate(record.value);
        const identity = JSON.stringify(record.key); requireData(!recordKeys.has(identity)); recordKeys.add(identity);
        if (i % 200 === 0) { await pause(); check(); }
      }
    }
    if(index===0&&chatSource!==undefined){
      const paths=new Set<string>();const collect=(node:unknown):void=>{if(!node||typeof node!=='object')return;if(!Array.isArray(node)){const data=node as Data;if(['blob','file','array-buffer'].includes(String(data.type))&&typeof data.path==='string')paths.add(data.path);}for(const value of Object.values(node))collect(value);};collect(snapshot);
      chatFieldsFiles=Object.freeze([...paths].map(name=>Object.freeze({name,blob:entries.get(name)!.blob})));
    }
    if(index===6){
      const metadata=JSON.stringify(snapshot),paths=new Set<string>();
      const collect=(node:unknown):void=>{if(!node||typeof node!=='object')return;if(!Array.isArray(node)){const data=node as Data;if(['blob','file','array-buffer'].includes(String(data.type)))paths.add(String(data.path));}for(const value of Object.values(node))collect(value);};collect(snapshot);
      const files=Object.freeze([...paths].map(name=>Object.freeze({name,blob:entries.get(name)!.blob})));
      threadTooLarge=new TextEncoder().encode(metadata).length>THREAD_SOURCE_METADATA||files.reduce((n,f)=>n+f.blob.size,0)>THREAD_COPY_TOTAL;
      if(!threadTooLarge)threadSource=Object.freeze({metadata,files});
    }
    if (index >= 1 && index <= 5) {
      // Recovery copies stay inert; only the active media store is an import source.
      const imageStores = stores.filter(store => object(store).name === (index === 1 ? 'images' : index === 2 ? 'tracks' : index === 3 ? 'sounds' : index === 4 ? 'attachments' : 'files'));
      const selected = {name:snapshot.name,version:snapshot.version,stores:imageStores}, metadata = JSON.stringify(selected), paths = new Set<string>();
      const collect = (node: unknown): void => {
        if (!node || typeof node !== 'object') return;
        if (!Array.isArray(node)) { const data = node as Data; if (['blob','file','array-buffer'].includes(String(data.type)) && typeof data.path === 'string') paths.add(data.path); }
        for (const value of Object.values(node)) collect(value);
      };
      collect(selected);
      const files = [...paths].map(name => Object.freeze({name,blob:entries.get(name)!.blob}));
      const oversized = new TextEncoder().encode(metadata).length > (index === 1 ? GALLERY_SOURCE_METADATA_LIMIT : index === 2 ? MUSIC_SOURCE_METADATA_LIMIT : index === 3 ? SOUND_SOURCE_METADATA_LIMIT : index === 4 ? FEED_SOURCE_METADATA_LIMIT : CHAT_FILE_METADATA_LIMIT) || files.reduce((sum,file) => sum+file.blob.size,0) > (index === 1 ? GALLERY_SOURCE_BYTES_LIMIT : index === 2 ? MUSIC_SOURCE_BYTES_LIMIT : index === 3 ? SOUND_SOURCE_BYTES_LIMIT : index === 4 ? FEED_SOURCE_BYTES_LIMIT : CHAT_FILE_TOTAL);
      if (index === 1) { galleryTooLarge = oversized; if (!oversized) gallerySource = Object.freeze({metadata,files:Object.freeze(files)}); }
      else if (index === 2) { musicTooLarge = oversized; if (!oversized) musicSource = Object.freeze({metadata,files:Object.freeze(files)}); }
      else if(index === 3) { soundTooLarge = oversized; if (!oversized) soundSource = Object.freeze({metadata,files:Object.freeze(files)}); }
      else if(index===4) { feedTooLarge = oversized; if(!oversized) feedSource = Object.freeze({metadata,files:Object.freeze(files)}); }
      else { chatFileTooLarge=oversized;if(!oversized)chatFileSource=Object.freeze({metadata,files:Object.freeze(files)}); }
    }
    requireData(integer(db.records,100000) === databaseRecords); databases.push({label:spec.label,status:'captured',records:databaseRecords});
  }
  requireData(records === expectedRecords);
  const binary = [...entries.values()].filter(entry => entry.name.startsWith('binary/')).sort((a,b) => a.name.localeCompare(b.name));
  requireData(binary.length === validator.usedBinary.size); let mediaBytes = 0;
  for (const [i,entry] of binary.entries()) {
    requireData(entry.name === `binary/${String(i+1).padStart(5,'0')}.bin` && validator.usedBinary.has(entry.name));
    options.progress?.(`Checking file contents: ${i+1}/${binary.length}…`); await verifyEntry(entry,check); mediaBytes += entry.blob.size;
  }
  await verifyEntry(entries.get('README.txt')!,check); check();
  const source = (localEntries as Array<[string,string]>).find(([key]) => key === SETTINGS_KEY)?.[1];
  const archived = (localEntries as Array<[string,string]>).find(([key]) => key === SETTINGS_ARCHIVED_SOURCES_KEY)?.[1];
  const archivedTooLarge = archived !== undefined && (archived.length > SETTINGS_ARCHIVED_SOURCES_LIMIT || new TextEncoder().encode(archived).length > SETTINGS_ARCHIVED_SOURCES_LIMIT);
  const tooLarge = source !== undefined && (source.length > SETTINGS_SOURCE_LIMIT || new TextEncoder().encode(source).length > SETTINGS_SOURCE_LIMIT);
  const feedRaw=(localEntries as Array<[string,string]>).find(([key])=>key===FEED_DRAFT_METADATA_KEY)?.[1];
  feedTooLarge ||= feedRaw!==undefined && new TextEncoder().encode(feedRaw).length>128000;
  if(!feedSource && !feedTooLarge && databases[4]?.status==='absent')feedSource=Object.freeze({metadata:JSON.stringify({name:specs[4]!.name,version:1,stores:[{name:'attachments',keyPath:'id',autoIncrement:false,indexes:[],records:[]}]}),files:Object.freeze([])});
  const result = Object.freeze({owner:options.owner,exportedAt,addonVersion,accountEntries,excludedKeys:excluded.length,records,binaryFiles:binary.length,binaryBytes:mediaBytes,archiveBytes:file.size,settingsAvailable:source !== undefined,chatAvailable:chatSource !== undefined || chatTooLarge,galleryAvailable:gallerySource !== undefined || galleryTooLarge,musicAvailable:source !== undefined && (musicSource !== undefined || musicTooLarge),soundsAvailable:soundSource !== undefined || soundTooLarge,feedAvailable:feedRaw!==undefined,chatFilesAvailable:chatFileSource!==undefined||chatFileTooLarge,threadHistoryAvailable:threadSource!==undefined||threadTooLarge,
    databases:Object.freeze(databases.map(db => Object.freeze(db)))});
  checkedThreadHistory.set(result,{owner:options.owner,tooLarge:threadTooLarge,...(threadSource?{source:threadSource}:{})});
  checkedChatFiles.set(result,{owner:options.owner,tooLarge:chatFileTooLarge,...(chatFileSource?{source:chatFileSource}:{})});
  checkedSettings.set(result,{owner:options.owner,tooLarge,archivedTooLarge,...(source !== undefined && !tooLarge ? {source} : {}),...(archived !== undefined && !archivedTooLarge ? {archived} : {})});
  checkedChat.set(result,{owner:options.owner,tooLarge:chatTooLarge,...(chatSource !== undefined ? {source:chatSource,files:chatFieldsFiles??Object.freeze([])} : {})});
  checkedGallery.set(result,{owner:options.owner,tooLarge:galleryTooLarge,...(gallerySource ? {source:gallerySource} : {})});
  checkedMusic.set(result,{owner:options.owner,tooLarge:musicTooLarge || tooLarge,...(musicSource && source !== undefined && !tooLarge ? {source:Object.freeze({...musicSource,settings:source})} : {})});
  checkedFeed.set(result,{owner:options.owner,tooLarge:feedTooLarge,...(feedSource && feedRaw!==undefined && !feedTooLarge ? {source:Object.freeze({...feedSource,draft:feedRaw})} : {})});
  checkedSounds.set(result,{owner:options.owner,tooLarge:soundTooLarge,...(soundSource ? {source:soundSource} : {})}); return result;
}
