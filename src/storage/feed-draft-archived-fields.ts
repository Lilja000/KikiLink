import { exportValueEncoder } from './device-data-export';
import { archivedFieldBytes, readInertArchivedFields, type Envelope } from './inert-archived-fields';
import type { DraftMetadata, SnapshotMetadata } from '../cloud/feed-draft-metadata';
import type { ZipFile } from '../utils/stored-zip';

export const FEED_DRAFT_FIELDS_LIMIT = 16 * 1024;
const policy = { format: 'kikilink-inert-feed-draft-fields', kind: 'draft', knownFields: new Set(['archivedFields']) };
const rootKnown = new Set(['version','revision','text','clientId','files','poll','pending','cleared','archivedFields']);
const pendingKnown = new Set(['text','clientId','files','poll','mediaIds','spoilerMediaIds']);
const pollKnown = new Set(['question','options','multiple','closesAt']);
const fileKnown = new Set(['id','name','type','size','lastModified','spoiler']);
const fail = (): never => { throw new Error('Additional Feed draft fields are unsupported, conflicting or too large. Keep the original draft or ZIP; no data was changed.'); };
const validId = (id: string | undefined) => typeof id === 'string' && /^[a-z0-9_-]{1,128}$/i.test(id);

/** Context labels retain source file IDs even after the active draft is remapped. */
export function readArchivedFeedDraftFields(raw: string): Envelope {
  if (typeof raw !== 'string' || raw.length > FEED_DRAFT_FIELDS_LIMIT || archivedFieldBytes(raw) > FEED_DRAFT_FIELDS_LIMIT) fail();
  const envelope = readInertArchivedFields(raw, policy);
  if (envelope.files.length) fail(); // Draft JSON never introduces binary references.
  for (const [key] of envelope.fields) {
    const parts = key.split(':');
    if (parts[0] === 'pending') parts.shift();
    const kind = parts.shift();
    if (kind === 'draft' && parts.length && !(key.startsWith('pending:') ? pendingKnown : rootKnown).has(parts.join(':'))) continue;
    if (kind === 'poll' && parts.length && !pollKnown.has(parts.join(':'))) continue;
    if (kind === 'file' && validId(parts.shift()) && parts.length && !fileKnown.has(parts.join(':'))) continue;
    fail();
  }
  return envelope;
}

/** Synchronous JSON-only preparation, used both before import awaits and editor saves.
 * Tagged nodes stay inside a string; none are decoded into live values. */
export function prepareFeedDraftFields(metadata: DraftMetadata, retained?: string): string | undefined {
  let result = retained, envelope = retained === undefined ? undefined : readArchivedFeedDraftFields(retained);
  const fields = new Map(envelope?.fields ?? []);
  const merge = (added: Array<[string, unknown]>) => {
    let changed = false;
    for (const [key, value] of added) {
      if (fields.has(key)) { if (JSON.stringify(fields.get(key)) !== JSON.stringify(value)) fail(); }
      else { fields.set(key, value); changed = true; }
    }
    return changed;
  };
  let changed = false;
  if (metadata.archivedFields !== undefined) {
    const incoming = readArchivedFeedDraftFields(metadata.archivedFields);
    if (!envelope) { result = metadata.archivedFields; envelope = incoming; for (const pair of incoming.fields) fields.set(...pair); }
    else changed = merge(incoming.fields);
  }
  const binary: ZipFile[] = [], encode = exportValueEncoder(binary, () => {}), additional: Array<[string, unknown]> = [];
  const extras = (value: object, known: Set<string>, prefix: string) => {
    for (const [key, valueAtKey] of Object.entries(value)) if (!known.has(key)) additional.push([prefix + key, encode(valueAtKey)]);
  };
  const snapshot = (value: SnapshotMetadata, prefix: string) => {
    if (value.poll) extras(value.poll, pollKnown, prefix + 'poll:');
    for (const file of value.files) extras(file, fileKnown, prefix + 'file:' + file.id + ':');
  };
  extras(metadata, rootKnown, 'draft:'); snapshot(metadata, '');
  if (metadata.pending) { extras(metadata.pending, pendingKnown, 'pending:draft:'); snapshot(metadata.pending, 'pending:'); }
  if (binary.length) fail();
  changed = merge(additional) || changed;
  if (!fields.size) return undefined;
  if (changed || result === undefined) result = JSON.stringify({format:policy.format,version:1,kind:policy.kind,fields:[...fields],files:[]});
  readArchivedFeedDraftFields(result);
  return result;
}
