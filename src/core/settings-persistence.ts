import type { KeyValueStorage } from './settings';

export const SETTINGS_RECOVERY_KEY = 'kikilink:settings-recovery:v1';
export const SETTINGS_SOURCE_LIMIT = 2 * 1024 * 1024;
const RECOVERY_LIMIT = 4 * 1024 * 1024;
export interface RecoveryCopy { id: number; createdAt: number; source: string }
export interface SettingsImportBaseline { readonly saved: string | null; readonly journal: string | null; readonly previousCopyId: number | null; readonly importedCopyId: number }
interface Recovery { format: 1; copies: RecoveryCopy[] }
const bytes = (raw: string) => new TextEncoder().encode(raw).length;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => object(v) && Object.keys(v).sort().join(',') === keys.sort().join(',');

/** Reads never rewrite settings. A format conversion first preserves exact source bytes.
 * Recovery copies are local only and never expire or evict each other automatically. */
export class SettingsPersistence {
  #source: string | null = null;
  #blocked = '';
  #issue = '';
  #conversion = false;
  #sourceVersion: string | null = null;
  #imports = new WeakMap<SettingsImportBaseline,string|null>();
  constructor(readonly storage: KeyValueStorage, readonly key: string, readonly schema: number) {}
  #read(key: string, durable = false): string | null {
    try {
      const read = durable && this.storage.getPersistedItemResult ? this.storage.getPersistedItemResult(key) : this.storage.getItemResult?.(key);
      if (read && !read.ok) throw new Error();
      return read ? read.value : this.storage.getItem(key);
    } catch { throw new Error('Saved settings could not be read. They have not been replaced.'); }
  }
  #version(key: string): string | null {
    try { return this.storage.getMutationVersion?.(key) ?? null; }
    catch { throw new Error('Saved settings changes could not be checked. Reload before saving.'); }
  }
  #sameRecovery(raw: string | null, version: string | null): void {
    if (this.recoverySource() !== raw || this.#version(SETTINGS_RECOVERY_KEY) !== version)
      throw new Error('Recovery copies changed. Review the copy again before restoring.');
  }
  load(): unknown {
    try {
      this.#sourceVersion = this.#version(this.key);
      this.#source = this.#read(this.key);
      if (this.#source === null) {
        if (this.storage.getPersistedItemResult && this.#read(this.key, true) !== null)
          this.#blocked = 'The device and account settings copies differ. Reload before saving; both copies are kept.';
        return undefined;
      }
      if (this.#source.length > SETTINGS_SOURCE_LIMIT || bytes(this.#source) > SETTINGS_SOURCE_LIMIT)
        throw new Error('Saved settings are too large for this version. They have been kept unchanged.');
      let value: unknown;
      try { value = JSON.parse(this.#source); }
      catch { throw new Error('Saved settings are unreadable. They have been kept unchanged.'); }
      if (!object(value) || (value.schemaVersion !== undefined && (!Number.isSafeInteger(value.schemaVersion) || Number(value.schemaVersion) < 1)))
        throw new Error('The saved settings format is unsupported. It has been kept unchanged.');
      if (Number(value.schemaVersion) > this.schema)
        throw new Error('Saved settings need a newer KikiLink version. This version will not replace them.');
      if (this.storage.getPersistedItemResult) {
        // A portable mirror can return compact JSON while the device keeps the same
        // document with whitespace. Preserve the exact device copy when they agree.
        try {
          const saved = this.#read(this.key, true);
          if (saved !== this.#source) {
            if (saved !== null && saved.length <= SETTINGS_SOURCE_LIMIT && bytes(saved) <= SETTINGS_SOURCE_LIMIT &&
              JSON.stringify(JSON.parse(saved)) === JSON.stringify(value)) this.#source = saved;
            else this.#blocked = 'The device and account settings copies differ. Reload before saving; both copies are kept.';
          }
        } catch { this.#blocked = 'The device settings copy could not be checked. Your account settings are available for this session only.'; }
      }
      return value;
    } catch (error) { this.#blocked = error instanceof Error ? error.message : 'Saved settings are unavailable.'; return undefined; }
  }
  comparedWith(canonical: string): void { this.#conversion = this.#source !== null && this.#source !== canonical; }
  loadedSource(): string | null { return this.#source; }
  blockWrites(message: string): void { this.#blocked ||= message; }
  status(): { writable: boolean; conversionPending: boolean; message: string } {
    return { writable: !this.#blocked, conversionPending: this.#conversion,
      message: this.#blocked || this.#issue || (this.#conversion ? 'The original settings will be kept in a recovery copy before their format changes.' : '') };
  }
  #recovery(raw: string | null): Recovery {
    if (raw === null) return { format: 1, copies: [] };
    if (raw.length > RECOVERY_LIMIT || bytes(raw) > RECOVERY_LIMIT)
      throw new Error('Settings recovery copies are too large. They have been kept unchanged.');
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw new Error('Settings recovery copies are unreadable. They have been kept unchanged.'); }
    if (!exact(value, ['format','copies']) || value.format !== 1 || !Array.isArray(value.copies) || value.copies.length > 5 ||
      value.copies.some(v => !exact(v, ['id','createdAt','source']) || !Number.isSafeInteger(v.id) || Number(v.id) < 1 || Number(v.id) >= Number.MAX_SAFE_INTEGER ||
        !Number.isSafeInteger(v.createdAt) || Number(v.createdAt) < 1 || Number(v.createdAt) > 8640000000000000 ||
        typeof v.source !== 'string' || bytes(v.source) > SETTINGS_SOURCE_LIMIT) ||
      new Set(value.copies.map(v => v.id)).size !== value.copies.length)
      throw new Error('Settings recovery copies use an unsupported format. They have been kept unchanged.');
    return value as unknown as Recovery;
  }
  #preserve(source: string, expected?: string): string {
    const version=this.#version(SETTINGS_RECOVERY_KEY);
    const original = this.#read(SETTINGS_RECOVERY_KEY, true), recovery = this.#recovery(original);
    if (expected !== undefined && original !== expected) throw new Error('Recovery copies changed. Review the copy again before restoring.');
    if (recovery.copies.some(c => c.source === source)) return original!;
    if (recovery.copies.length >= 5) throw new Error('Five settings recovery copies are already kept. No existing copy or saved settings have been replaced.');
    recovery.copies.push({ id: Math.max(0, ...recovery.copies.map(c => c.id)) + 1, createdAt: Date.now(), source });
    const next = JSON.stringify(recovery);
    if (bytes(next) > RECOVERY_LIMIT) throw new Error('There is no room for another settings recovery copy. Existing copies are kept.');
    if (this.#read(SETTINGS_RECOVERY_KEY, true) !== original || this.#version(SETTINGS_RECOVERY_KEY) !== version)
      throw new Error('Settings recovery copies changed in another tab. Reopen KikiLink before saving.');
    this.#save(SETTINGS_RECOVERY_KEY, next);
    if (this.#read(SETTINGS_RECOVERY_KEY, true) !== next)
      throw new Error('Saving the settings recovery copy could not be confirmed. Original settings are kept.');
    return next;
  }
  #save(key: string, value: string): void {
    try {
      if (this.storage.setItemVerified) this.storage.setItemVerified(key, value);
      else this.storage.setItem(key, value);
    } catch { throw new Error('Could not save on this device; the write could not be confirmed. Check browser storage and try again.'); }
  }
  #unchanged(): void {
    if (this.#read(this.key, true) !== this.#source || this.#version(this.key) !== this.#sourceVersion)
      throw new Error('Saved settings changed in another tab. Reload before saving; the other copy is kept.');
  }
  write(canonical: string, reset = false, expectedRecovery?: string, preserveAdditional?: () => void, expectedRecoveryVersion?: string | null): void {
    try {
      if (this.#blocked) throw new Error(this.#blocked);
      this.#unchanged();
      let recoveryVersion=expectedRecoveryVersion === undefined ? this.#version(SETTINGS_RECOVERY_KEY) : expectedRecoveryVersion;
      if (expectedRecovery !== undefined) this.#sameRecovery(expectedRecovery,recoveryVersion);
      if (this.#source === canonical && !reset) { preserveAdditional?.(); this.#unchanged(); this.#issue = ''; return; }
      if (bytes(canonical) > SETTINGS_SOURCE_LIMIT) throw new Error('These settings are too large to save safely. Existing settings are kept.');
      let recovery = expectedRecovery;
      if (this.#source !== null && (this.#conversion || reset)) { recovery = this.#preserve(this.#source, expectedRecovery); recoveryVersion=this.#version(SETTINGS_RECOVERY_KEY); }
      this.#unchanged();
      if (expectedRecovery !== undefined) this.#sameRecovery(recovery!,recoveryVersion);
      preserveAdditional?.(); this.#unchanged();
      if (expectedRecovery !== undefined) this.#sameRecovery(recovery!,recoveryVersion);
      this.#save(this.key, canonical);
      if (this.#read(this.key, true) !== canonical)
        throw new Error('Saving settings on this device could not be confirmed. Your previous recovery copies are kept.');
      this.#source = canonical; this.#sourceVersion=this.#version(this.key); this.#conversion = false; this.#issue = '';
    } catch (error) {
      this.#issue = error instanceof Error ? error.message : 'Settings could not be saved on this device.';
      throw new Error(this.#issue);
    }
  }
  checkedSource(): string | null { if (this.#blocked) throw new Error(this.#blocked); this.#unchanged(); return this.#source; }
  savedSource(): string | null { return this.#read(this.key, true); }
  recoverySource(): string | null { return this.#read(SETTINGS_RECOVERY_KEY, true); }
  recoveryCount(): number { return this.#recovery(this.recoverySource()).copies.length; }
  recoveryCopies(): RecoveryCopy[] { return this.#recovery(this.recoverySource()).copies; }
  #importJournal(source: string, original: string | null): string {
    if (bytes(source) > SETTINGS_SOURCE_LIMIT) throw new Error('These imported settings are too large to preserve.');
    const recovery = this.#recovery(original);
    // One journal write preserves both originals before touching the active settings.
    for (const raw of [this.#source,source]) {
      if (raw === null || recovery.copies.some(copy => copy.source === raw)) continue;
      if (recovery.copies.length >= 5) throw new Error('There is not enough room to keep both originals. Five recovery copies are already reserved; no settings have been replaced.');
      const id = Math.max(0,...recovery.copies.map(copy => copy.id))+1;
      if (id >= Number.MAX_SAFE_INTEGER) throw new Error('The settings recovery copy limit has been reached. No settings have been replaced.');
      recovery.copies.push({id,createdAt:Date.now(),source:raw});
    }
    const next = JSON.stringify(recovery);
    if (bytes(next) > RECOVERY_LIMIT) throw new Error('There is not enough room to keep both settings originals. No settings have been replaced.');
    return original !== null && this.#recovery(original).copies.length === recovery.copies.length ? original : next;
  }
  reviewImport(source: string): SettingsImportBaseline {
    if (this.#blocked) throw new Error(this.#blocked);
    this.#unchanged(); const version=this.#version(SETTINGS_RECOVERY_KEY), journal = this.recoverySource(), copies = this.#recovery(this.#importJournal(source,journal)).copies;
    this.#sameRecovery(journal,version);
    const review=Object.freeze({saved:this.#source,journal,previousCopyId:copies.find(copy => copy.source === this.#source)?.id ?? null,importedCopyId:copies.find(copy => copy.source === source)!.id});
    this.#imports.set(review,version); return review;
  }
  writeImport(canonical: string, source: string, baseline: SettingsImportBaseline, preserveAdditional?: () => void): void {
    try {
      if (this.#blocked) throw new Error(this.#blocked);
      this.#unchanged(); const journal = this.recoverySource();
      if (!this.#imports.has(baseline)) throw new Error('Review the archive settings again before restoring.');
      let version:string|null=this.#imports.get(baseline) ?? null; this.#sameRecovery(journal,version);
      if (baseline.saved !== this.#source || baseline.journal !== journal) throw new Error('Settings or recovery copies changed. Review the archive settings again.');
      if (bytes(canonical) > SETTINGS_SOURCE_LIMIT) throw new Error('These settings are too large to save safely.');
      const nextJournal = this.#importJournal(source,journal);
      this.#unchanged(); this.#sameRecovery(journal,version);
      if (nextJournal !== journal) { this.#save(SETTINGS_RECOVERY_KEY,nextJournal); version=this.#version(SETTINGS_RECOVERY_KEY); }
      if (this.recoverySource() !== nextJournal) throw new Error('Keeping the two original copies could not be confirmed. Active settings have not been replaced.');
      this.#unchanged(); this.#sameRecovery(nextJournal,version);
      preserveAdditional?.(); this.#unchanged();
      this.#sameRecovery(nextJournal,version);
      this.#save(this.key,canonical);
      let confirmed = false;
      try { confirmed = this.#read(this.key,true) === canonical; } catch { /* The write may already be durable. */ }
      if (!confirmed) throw new Error('The settings write could not be confirmed. Reload and check Settings recovery; both originals are kept.');
      this.#source = canonical; this.#sourceVersion=this.#version(this.key); this.#conversion = false; this.#issue = '';
    } catch (error) {
      this.#issue = error instanceof Error ? error.message : 'Settings could not be restored.'; throw new Error(this.#issue);
    }
  }
  reviewCopy(id: number): { copy: RecoveryCopy; journal: string; saved: string | null; journalVersion: string | null } {
    if (this.#blocked) throw new Error(this.#blocked);
    this.#unchanged();
    const journalVersion=this.#version(SETTINGS_RECOVERY_KEY), journal = this.recoverySource(), copy = this.#recovery(journal).copies.find(c => c.id === id);
    if (!copy || journal === null) throw new Error('That recovery copy is no longer available. Review the saved copies again.');
    this.#sameRecovery(journal,journalVersion);
    return { copy, journal, saved: this.#source, journalVersion };
  }
}
