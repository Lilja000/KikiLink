import {observeAccountWrites,type AccountWriteObservation} from './account-write-version';
import { KIKILINK_PLATFORM_PREVIEW } from '../core/distribution';
import { scopePersistenceName } from '../core/storage-scope';
import { storedZip, type ZipFile } from '../utils/stored-zip';
import { deviceDataDigest } from './device-data-digest';
import { captureDeviceDatabases, type DeviceDatabaseSnapshot } from './device-data-snapshot';

const MAX_METADATA = 64 * 1024 * 1024, MAX_LOCAL = 32 * 1024 * 1024;
export const isDeviceCredentialKey = (key: string): boolean => /(?:^|:)(?:auth|access-token|refresh-token|token|credentials?|private-key|device-key|secret)(?::|$)/i.test(key);
interface ExportOptions {
  owner: number; version: string; current: () => boolean; signal: AbortSignal; progress?: (message: string) => void;
  storage?: Storage; databases?: IDBFactory; maximumBytes?: number;
}

export function deviceDataDatabases(owner: number, format:1|2|3=2): Array<{ name: string; label: string }> {
  if (!Number.isSafeInteger(owner) || owner <= 0) throw new Error('A signed-in BC account is required.');
  return [
    [`kikilink-account-${owner}`, 'Chat history'], [`kikilink-device-gallery-${owner}`, 'Device gallery'],
    [`kikilink-device-music-${owner}`, 'Device music'], [`kikilink-device-sounds-${owner}`, 'Notification sounds'],
    [`kikilink-feed-drafts-${owner}`, 'Feed draft attachments'],
    [`kikilink-chat-files-${owner}`, 'Saved chat files'],
    [`kikilink-thread-history-${owner}`, 'Saved group/channel history'],
  ].slice(0,format===1?5:format===2?6:7).map(([name, label]) => ({ name: scopePersistenceName(name!), label: label! }));
}

export function readAccountExportStorage(storage: Storage, owner: number): { entries: Array<[string,string]>; excludedKeys: string[] } {
  deviceDataDatabases(owner);
  const prefix = scopePersistenceName(`kikilink:account:${owner}:`), entries: Array<[string,string]> = [], excludedKeys: string[] = [];
  let size = 0;
  for (let i = 0, length = storage.length; i < length; i++) {
    const physical = storage.key(i); if (physical === null) throw new Error('Saved data changed during export. Try again.');
    if (!physical.startsWith(prefix)) continue;
    const key = physical.slice(prefix.length);
    if (isDeviceCredentialKey(key)) { excludedKeys.push(key); continue; }
    const value = storage.getItem(physical); if (value === null) throw new Error('Saved data changed during export. Try again.');
    size += new TextEncoder().encode(key + value).length;
    if (entries.length >= 2000 || key.length > 2048 || size > MAX_LOCAL) throw new Error('Saved account data exceeds the device export limit.');
    entries.push([key, value]);
  }
  entries.sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0); excludedKeys.sort(); return { entries, excludedKeys };
}

/** Tagged values preserve unknown fields, keys and Blob bytes without interpreting saved data. */
export function exportValueEncoder(files: ZipFile[], check: () => void): (value: unknown) => unknown {
  const ancestors = new Set<object>(); let nodes = 0, binary = 0;
  const encode = (value: unknown, depth = 0): unknown => {
    check(); if (++nodes > 2000000 || depth > 64) throw new Error('Saved data is too complex to export safely.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return { type: 'value', value };
    if (typeof value === 'number') return { type: 'number', value: Object.is(value, -0) ? '-0' : Number.isFinite(value) ? value : String(value) };
    if (typeof value === 'undefined') return { type: 'undefined' };
    if (typeof value === 'bigint') return { type: 'bigint', value: value.toString() };
    if (typeof value !== 'object') throw new Error('Saved data contains an unsupported value.');
    if (ancestors.has(value)) throw new Error('Saved data contains a circular value that cannot be exported by this version.');
    ancestors.add(value);
    try {
      if (value instanceof Blob) {
        const path = `binary/${String(++binary).padStart(5,'0')}.bin`; files.push({ name: path, blob: value });
        return typeof File !== 'undefined' && value instanceof File ? { type: 'file', path, mimeType: value.type, name: value.name, lastModified: value.lastModified } : { type: 'blob', path, mimeType: value.type };
      }
      if (value instanceof Date) return { type: 'date', milliseconds: encode(value.getTime(), depth + 1) };
      if (value instanceof ArrayBuffer) {
        const path = `binary/${String(++binary).padStart(5,'0')}.bin`; files.push({ name: path, blob: new Blob([value]) }); return { type: 'array-buffer', path };
      }
      if (ArrayBuffer.isView(value)) return { type: 'array-buffer-view', name: value.constructor.name, byteOffset: value.byteOffset, byteLength: value.byteLength, buffer: encode(value.buffer, depth + 1) };
      if (Array.isArray(value)) return { type: 'array', length: value.length, entries: Object.entries(value).map(([key,item]) => [key,encode(item,depth+1)]) };
      if (value instanceof Map) return { type: 'map', entries: [...value].map(([key,item]) => [encode(key,depth+1),encode(item,depth+1)]) };
      if (value instanceof Set) return { type: 'set', values: [...value].map(item => encode(item,depth+1)) };
      if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error('Saved data contains an unsupported object type.');
      return { type: 'object', entries: Object.entries(value).map(([key,item]) => [key,encode(item,depth+1)]) };
    } finally { ancestors.delete(value); }
  };
  return value => encode(value);
}

async function encodeDatabase(snapshot: DeviceDatabaseSnapshot, encode: (value: unknown) => unknown, check: () => void) {
  const stores: unknown[] = [];
  for (const store of snapshot.stores) {
    const records: unknown[] = [];
    for (let i = 0; i < store.records.length; i++) {
      const row = store.records[i]!; records.push({ key: encode(row.key), value: encode(row.value) });
      if (i % 200 === 0) { await new Promise<void>(resolve => setTimeout(resolve, 0)); check(); }
    }
    stores.push({ ...store, records });
  }
  return { name: snapshot.name, version: snapshot.version, stores };
}

export async function exportDeviceData(options: ExportOptions): Promise<{ blob: Blob; files: number; records: number; owner: number }> {
  let observation:AccountWriteObservation|undefined;
  const check = () => { if (options.signal.aborted || !options.current()) throw new Error('Device export cancelled.'); observation?.check(); };
  check(); const specs = deviceDataDatabases(options.owner,3), startedAt = new Date().toISOString(), maximum = options.maximumBytes ?? 0x7fffffff;
  if (!Number.isSafeInteger(maximum) || maximum <= 0 || maximum > 0x7fffffff) throw new Error('Invalid device archive size limit.');
  const storage = options.storage ?? globalThis.localStorage, factory = options.databases ?? globalThis.indexedDB;
  if (!storage || !factory || typeof factory.databases !== 'function') throw new Error('This browser cannot safely list saved databases for export.');
  observation=observeAccountWrites(options.owner,storage);
  try {
  const account = readAccountExportStorage(storage, options.owner), original = JSON.stringify(account);
  const inventory = async () => (await factory.databases()).filter(db => specs.some(s => s.name === db.name)).map(db => [db.name,db.version]).sort(([a],[b]) => String(a).localeCompare(String(b)));
  const before = await inventory(); check();
  if (before.some(([name,version]) => version !== 1 && !((name === specs[1]!.name || name === specs[2]!.name || name === specs[3]!.name || name === specs[4]!.name) && version === 2))) throw new Error('Saved data needs a newer KikiLink version before it can be exported.');
  const unchanged = async () => {
    check(); const latestInventory = await inventory(); check();
    if (original !== JSON.stringify(readAccountExportStorage(storage, options.owner)) || JSON.stringify(before) !== JSON.stringify(latestInventory))
      throw new Error('Saved data changed during export. Try again when changes have settled.');
    check();
  };
  const capture = async (verification: boolean) => {
    const present = specs.filter(spec => before.some(([name]) => name === spec.name));
    for (const spec of present) {
      check(); options.progress?.(`${verification ? 'Checking saved' : 'Reading'} ${spec.label.toLowerCase()}…`);
    }
    check();
    return captureDeviceDatabases(factory, present.map(spec => ({ name: spec.name, version: Number(before.find(([name]) => name === spec.name)![1]) })), check, options.signal, unchanged);
  };
  const snapshots = await capture(false);
  const files: ZipFile[] = [], encode = exportValueEncoder(files, check), databases: unknown[] = [], budget = { rows: 0 };
  let metadataBytes = 0;
  const jsonFile = (name: string, value: unknown) => {
    const blob = new Blob([JSON.stringify(value)], { type: 'application/json' }); metadataBytes += blob.size;
    if (metadataBytes > MAX_METADATA) throw new Error('Saved metadata exceeds the device export limit.'); files.push({ name, blob });
    if (files.reduce((bytes,file) => bytes+file.blob.size,0) > maximum) throw new Error('Saved device data exceeds the restore point archive size limit.');
  };
  jsonFile('storage/account.json', account);
  for (const [index, spec] of specs.entries()) {
    check(); if (!before.some(([name]) => name === spec.name)) { databases.push({ ...spec, status: 'absent' }); continue; }
    const snapshot = snapshots.find(snapshot => snapshot.name === spec.name)!;
    budget.rows += snapshot.stores.reduce((sum, store) => sum + store.records.length, 0);
    const encoded = await encodeDatabase(snapshot, encode, check), path = `databases/${index}.json`; jsonFile(path, encoded);
    databases.push({ ...spec, status: 'captured', path, stores: snapshot.stores.length, records: snapshot.stores.reduce((sum, store) => sum + store.records.length, 0) });
  }
  snapshots.length = 0; // Encoded files now own the required bytes; release captured row objects.
  jsonFile('manifest.json', { format: 'kikilink-device-data', version: 3, owner: options.owner,
    distribution: KIKILINK_PLATFORM_PREVIEW ? 'platform-preview' : 'stable', addonVersion: options.version, startedAt, capturedAt: new Date().toISOString(),
    consistency: 'Two matching readonly reads of every captured database, including exact encoded metadata and binary bytes, before download. Within each read all existing database scopes are held together until capture and account/inventory checks finish. Native database writers wait; scopes are released before ZIP encoding and hashing. Account key/value data and absent databases are rechecked but not locked. Device write versions and foreign storage events invalidate changed captures, including completed cooperative A-to-B-to-A writes. No atomic transaction across localStorage, multi-step application writes or Cloud restoration.',
    encoding: 'Tagged structured values in database JSON; exact original strings in storage/account.json; raw binary entries. ZIP CRC32 detects damage, not authenticity.',
    exclusions: ['Cloud-only data and media not explicitly saved on this device', 'Unsaved and session-only data', 'Cloud sign-in devices, browser cookies and sessions', 'Other accounts, distributions and prototype stores', 'Credential-named account keys listed in storage/account.json'],
    databases, accountEntries: account.entries.length, records: budget.rows, payloadFiles: files.map(file => ({ path: file.name, bytes: file.blob.size })) });
  files.push({ name: 'README.txt', blob: new Blob(['KikiLink saved device data. This ZIP is not encrypted; keep it private.\nIt contains saved local data for the owner in manifest.json, not a complete Cloud account backup.\nOriginal settings may contain old provider configuration and private details.\nNo import or automatic restore is provided by this export. Do not execute saved pending actions.\nRead manifest.json for scope, encoding, absent databases and exclusions.\n']) });
  const blob = await storedZip(files, check, done => options.progress?.(`Preparing download: ${done}/${files.length} files…`));
  if (blob.size > maximum) throw new Error('Saved device data exceeds the restore point archive size limit.');
  await unchanged();
  // Re-read after ZIP preparation: database names/versions alone cannot detect changed records or same-size media.
  const expected = new Map(files.filter(file => /^(binary|databases)\//.test(file.name)).map(file => [file.name, file.blob]));
  const verifiedSnapshots = await capture(true);
  const verificationFiles: ZipFile[] = [], verifyEncode = exportValueEncoder(verificationFiles, check);
  let verifiedFiles = 0, verificationMetadata = 0;
  for (const [index, spec] of specs.entries()) {
    check(); if (!before.some(([name]) => name === spec.name)) continue;
    const snapshot = verifiedSnapshots.find(snapshot => snapshot.name === spec.name)!;
    const metadata = new Blob([JSON.stringify(await encodeDatabase(snapshot, verifyEncode, check))]);
    verificationMetadata += metadata.size;
    if (verificationMetadata > MAX_METADATA) throw new Error('Saved metadata exceeds the device export limit.');
    verificationFiles.unshift({ name: `databases/${index}.json`, blob: metadata });
    for (const file of verificationFiles) {
      check(); const previous = expected.get(file.name);
      if (!previous || previous.size !== file.blob.size || await deviceDataDigest(previous, check) !== await deviceDataDigest(file.blob, check))
        throw new Error('Saved database data changed during export. No download was created. Try again when changes have settled.');
      verifiedFiles++;
    }
    verificationFiles.length = 0; // Drop the second read's binary references after each database.
    verifiedSnapshots.splice(verifiedSnapshots.indexOf(snapshot), 1);
  }
  if (verifiedFiles !== expected.size) throw new Error('Saved database data changed during export. No download was created.');
  await unchanged();
  check(); return { blob, files: files.length, records: budget.rows, owner: options.owner };
  } finally { observation.close(); }
}
