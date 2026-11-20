import type { KeyValueStorage } from '../../core/settings';

export const SPACE_NOTES_KEY_PREFIX = 'kikilink:platform:space-notes:v1:';
const MAX_NOTES = 100, MAX_NOTE_LENGTH = 1000, MAX_SOURCE_BYTES = 512000;
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/u.test(id);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
interface SavedNotes { raw: string | null; notes: Map<string, string> }
const validOwner = (owner: number): boolean => Number.isSafeInteger(owner) && owner > 0;
function validOrigin(origin: string): boolean {
  try {
    const url = new URL(origin), base = `${url.origin}${url.pathname === '/' ? '' : url.pathname.replace(/\/$/u, '')}`;
    return origin.length <= 512 && url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash &&
      /^\/(?:[A-Za-z0-9._~-]+\/?)*$/u.test(url.pathname) && base === origin;
  } catch { return false; }
}

/** The account storage prefix remains authoritative; the key also separates Cloud namespaces. */
export function spaceNotesKey(owner: number, origin: string): string {
  if (!validOwner(owner) || !validOrigin(origin)) throw new Error('Invalid private note scope.');
  return `${SPACE_NOTES_KEY_PREFIX}${owner}:${encodeURIComponent(origin)}`;
}

/** Device-only private text. Never writes Space metadata, a Cloud request, or the BC account mirror. */
export class SpaceNotes {
  readonly #key: string | undefined;
  #notes = new Map<string, string>();
  error = '';
  constructor(readonly storage: KeyValueStorage | undefined, readonly owner: number, readonly origin: string, readonly current: () => boolean) {
    try { this.#key = spaceNotesKey(owner, origin); }
    catch { this.error = 'Private notes are unavailable for this account or Cloud.'; }
    if (this.#key && current()) this.reload();
  }
  #read(): SavedNotes {
    if (!this.storage || !this.#key) throw new Error();
    const result = this.storage.getPersistedItemResult?.(this.#key) ?? this.storage.getItemResult?.(this.#key);
    if (result && !result.ok) throw new Error();
    const raw = result ? result.value : this.storage.getItem(this.#key);
    if (raw === null) return { raw, notes: new Map() };
    if (raw.length > MAX_SOURCE_BYTES || new TextEncoder().encode(raw).length > MAX_SOURCE_BYTES) throw new Error();
    const value: unknown = JSON.parse(raw);
    if (!object(value) || Object.keys(value).sort().join(',') !== 'format,notes,origin,owner' || value.format !== 1 ||
      value.owner !== this.owner || value.origin !== this.origin || !Array.isArray(value.notes) || value.notes.length > MAX_NOTES) throw new Error();
    const notes = new Map<string, string>();
    for (const row of value.notes) {
      if (!object(row) || Object.keys(row).sort().join(',') !== 'id,text' || !validId(row.id) || notes.has(row.id) ||
        typeof row.text !== 'string' || !row.text.trim() || row.text !== row.text.trim() || row.text.length > MAX_NOTE_LENGTH) throw new Error();
      notes.set(row.id, row.text);
    }
    return { raw, notes };
  }
  /** A retry re-reads originals; it never clears an unreadable or newer format. */
  reload(): boolean {
    if (!this.current() || !this.#key) return false;
    try {
      const saved = this.#read();
      if (!this.current()) return false;
      this.#notes = saved.notes; this.error = ''; return true;
    } catch {
      this.error = 'Private notes could not be read on this device. Your saved data is kept unchanged.';
      return false;
    }
  }
  get(id: string): string {
    if (!this.current() || !validId(id) || !this.reload()) return '';
    return this.#notes.get(id) ?? '';
  }
  /** Pass the text shown when editing began to prevent overwriting a later device edit. */
  save(id: string, text: string, expectedNote?: string): boolean {
    if (!this.current() || !this.#key) return false;
    if (!validId(id) || typeof text !== 'string' || expectedNote !== undefined && typeof expectedNote !== 'string') {
      this.error = 'This private note is unavailable. Your draft is kept.'; return false;
    }
    const note = text.trim();
    if (note.length > MAX_NOTE_LENGTH) { this.error = 'Keep your private note within 1,000 characters. Your draft is kept.'; return false; }
    let saved: SavedNotes;
    try { saved = this.#read(); }
    catch { this.error = 'Private notes could not be read on this device. Your saved data is kept unchanged.'; return false; }
    if (!this.current()) return false;
    const existing = saved.notes.get(id) ?? '';
    // A retry after an interrupted readback can recognize its already saved text.
    if (existing === note) { this.#notes = saved.notes; this.error = ''; return true; }
    if (expectedNote !== undefined && existing !== expectedNote) {
      this.error = 'Your private note changed on this device. Your draft is kept. Reopen the note to review the latest version.'; return false;
    }
    if (note && !saved.notes.has(id) && saved.notes.size >= MAX_NOTES) {
      this.error = 'You already have private notes for 100 Spaces. Remove one before adding another.'; return false;
    }
    const notes = new Map(saved.notes);
    if (note) notes.set(id, note); else notes.delete(id);
    const raw = JSON.stringify({ format: 1, owner: this.owner, origin: this.origin, notes: [...notes].map(([id, text]) => ({ id, text })) });
    if (raw.length > MAX_SOURCE_BYTES || new TextEncoder().encode(raw).length > MAX_SOURCE_BYTES) {
      this.error = 'Private notes exceed this device’s saved-data limit. Your draft is kept.'; return false;
    }
    try {
      if (!this.current()) return false;
      // AccountDataStorage verifies the device write before updating any mirror;
      // unknown keys remain device-only. Other adapters are checked by readback.
      if (this.storage!.setItemVerified) this.storage!.setItemVerified(this.#key, raw);
      else this.storage!.setItem(this.#key, raw);
      if (!this.current()) return false;
      const confirmed = this.#read();
      if (confirmed.raw !== raw) throw new Error();
      if (!this.current()) return false;
      this.#notes = confirmed.notes; this.error = ''; return true;
    } catch {
      this.error = 'Your private note could not be saved on this device. Your draft is kept; try saving again.'; return false;
    }
  }
}
