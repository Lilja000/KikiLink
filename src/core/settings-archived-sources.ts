import type { KeyValueStorage } from './settings';
import { SETTINGS_SOURCE_LIMIT } from './settings-persistence';

/** Device-only original JSON. Never spread these values into active preferences. */
export const SETTINGS_ARCHIVED_SOURCES_KEY = 'kikilink:settings-archived-sources:v1';
export const SETTINGS_ARCHIVED_SOURCES_LIMIT = 4 * 1024 * 1024;
export const SETTINGS_ARCHIVED_SOURCES_COUNT = 20;
const POLICY = 'kikilink-inert-settings-sources';
const bytes = (value: string) => new TextEncoder().encode(value).length;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const invalid = (): never => { throw new Error('Additional saved settings data is unsupported or damaged. The original is kept unchanged.'); };

function sourceJSON(raw: string, schema: number): Record<string, unknown> {
  if (raw.length > SETTINGS_SOURCE_LIMIT || bytes(raw) > SETTINGS_SOURCE_LIMIT)
    throw new Error('An additional settings source is too large. The original is kept unchanged.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return invalid(); }
  if (!object(value) || (value.schemaVersion !== undefined && (!Number.isSafeInteger(value.schemaVersion) || Number(value.schemaVersion) < 1 || Number(value.schemaVersion) > schema))) return invalid();
  const pending: Array<[unknown, number]> = [[value, 0]];
  let nodes = 0;
  while (pending.length) {
    const [next, depth] = pending.pop()!;
    if (++nodes > 100_000 || depth > 64) throw new Error('Additional settings data is too complex. The original is kept unchanged.');
    if (next && typeof next === 'object') for (const child of Object.values(next)) pending.push([child, depth + 1]);
  }
  return value;
}

/** Missing defaults do not need a copy. Unknown or normalized original values do. */
function hasOriginalData(source: unknown, active: unknown): boolean {
  if (!source || typeof source !== 'object') return source !== active;
  if (!active || typeof active !== 'object' || Array.isArray(source) !== Array.isArray(active)) return true;
  if (Array.isArray(source) && Array.isArray(active) && source.length !== active.length) return true;
  return Object.keys(source).some(key => !Object.hasOwn(active, key) ||
    hasOriginalData((source as Record<string, unknown>)[key], (active as Record<string, unknown>)[key]));
}

export function parseArchivedSettingsSources(raw: string | null, schema: number): readonly string[] {
  if (raw === null) return [];
  if (raw.length > SETTINGS_ARCHIVED_SOURCES_LIMIT || bytes(raw) > SETTINGS_ARCHIVED_SOURCES_LIMIT)
    throw new Error('There is no room for additional settings data. Existing copies are kept.');
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return invalid(); }
  if (!object(data) || Object.keys(data).sort().join(',') !== 'format,policy,sources' || data.format !== 1 || data.policy !== POLICY ||
    !Array.isArray(data.sources) || !data.sources.length || data.sources.length > SETTINGS_ARCHIVED_SOURCES_COUNT ||
    data.sources.some(raw => typeof raw !== 'string') || new Set(data.sources).size !== data.sources.length) return invalid();
  for (const source of data.sources) sourceJSON(source as string, schema);
  return Object.freeze(data.sources as string[]);
}

export interface SettingsSourcesPlan {
  readonly saved: string | null;
  readonly next: string | null;
  readonly changed: boolean;
  readonly sources: readonly string[];
}

/** Separate from the account mirror. A verified append precedes active settings writes.
 * A later failure can leave extra inert originals, never an automatic replay or deletion. */
export class SettingsArchivedSources {
  #saved: string | null;
  #sources: readonly string[];
  constructor(readonly storage: KeyValueStorage, readonly schema: number, original?: { raw: string; active: unknown }) {
    this.#saved = this.#read();
    this.#sources = parseArchivedSettingsSources(this.#saved, schema);
    if (original) this.#sources = this.#merge(this.#sources, original);
    this.#encode(this.#sources); // Check capacity before any conversion or recovery write.
  }
  #read(): string | null {
    try {
      const read = this.storage.getPersistedItemResult?.(SETTINGS_ARCHIVED_SOURCES_KEY) ?? this.storage.getItemResult?.(SETTINGS_ARCHIVED_SOURCES_KEY);
      if (read && !read.ok) throw new Error();
      return read ? read.value : this.storage.getItem(SETTINGS_ARCHIVED_SOURCES_KEY);
    } catch { throw new Error('Additional saved settings data could not be read. The original is kept unchanged.'); }
  }
  #merge(sources: readonly string[], original?: { raw: string; active: unknown }): readonly string[] {
    if (!original || !hasOriginalData(sourceJSON(original.raw, this.schema), original.active) || sources.includes(original.raw)) return sources;
    return [...sources, original.raw];
  }
  #encode(sources: readonly string[]): string | null {
    if (!sources.length) return null;
    const value = JSON.stringify({ format: 1, policy: POLICY, sources });
    if (sources.length > SETTINGS_ARCHIVED_SOURCES_COUNT || bytes(value) > SETTINGS_ARCHIVED_SOURCES_LIMIT)
      throw new Error('There is no room for additional settings data. Existing copies are kept.');
    return value;
  }
  review(original?: { raw: string; active: unknown }, imported?: string): SettingsSourcesPlan {
    if (this.#read() !== this.#saved) throw new Error('Additional settings data changed in another tab. Reload before restoring or saving.');
    const combined = [...this.#sources];
    for (const raw of parseArchivedSettingsSources(imported ?? null, this.schema)) if (!combined.includes(raw)) combined.push(raw);
    const sources = Object.freeze([...this.#merge(combined, original)]);
    // Keep an existing envelope byte-for-byte, including its whitespace.
    const existing = parseArchivedSettingsSources(this.#saved, this.schema);
    const next = JSON.stringify(existing) === JSON.stringify(sources) ? this.#saved : this.#encode(sources);
    return Object.freeze({ saved: this.#saved, next, changed: next !== this.#saved, sources });
  }
  persist(plan: SettingsSourcesPlan): void {
    if (plan.saved !== this.#saved || this.#read() !== plan.saved) throw new Error('Additional settings data changed. Reload and review again.');
    if (plan.changed) {
      if (plan.next === null) throw new Error('Additional settings originals cannot be removed during a save.');
      try {
        if (this.storage.setItemVerified) this.storage.setItemVerified(SETTINGS_ARCHIVED_SOURCES_KEY, plan.next);
        else this.storage.setItem(SETTINGS_ARCHIVED_SOURCES_KEY, plan.next);
      } catch { throw new Error('Additional settings data could not be saved. Reload and check the saved originals before retrying.'); }
      if (this.#read() !== plan.next) throw new Error('Saving additional settings data could not be confirmed. Original settings are kept.');
    }
    this.#saved = plan.next; this.#sources = plan.sources;
  }
}
