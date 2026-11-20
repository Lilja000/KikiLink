import { type SettingsStore, type SoundSettingsReview } from '../core/settings';
import { SOUND_EVENTS } from '../core/sound-settings-import';
import type { NotificationSoundStore } from './device-notification-sound-store';
import { DurableSoundAssignmentFiles, type SoundAssignmentFiles, type AssignmentFile } from './sound-assignment-files';

export interface SoundAssignmentReview extends SoundSettingsReview { readonly files: readonly AssignmentFile[] }

/** Settings and sound bytes remain separate restores. No downloads, file writes or playback. */
export class SoundAssignmentRestorer {
  #generation = 0;
  #pending: {review: SoundAssignmentReview; settings: SoundSettingsReview; ids: string[]; generation: number} | undefined;
  constructor(readonly owner: number, readonly settings: SettingsStore, readonly destination: NotificationSoundStore,
    readonly files: SoundAssignmentFiles = new DurableSoundAssignmentFiles(owner)) {}
  cancel(): void { ++this.#generation; this.#pending = undefined; this.settings.cancelImportedSoundSettingsReview(); }
  #check(generation: number, current: () => boolean, signal: AbortSignal, custom: boolean): void {
    if (!Number.isSafeInteger(this.owner) || this.owner < 1 || generation !== this.#generation || !current() || signal.aborted)
      throw new Error('Sound choices review cancelled.');
    if (custom && !this.destination.archiveImportDestination?.(this.owner))
      throw new Error('Custom sounds are available for this session only. Reload with device storage available before restoring sound choices.');
  }
  async review(raw: string, current: () => boolean, signal: AbortSignal, archivedSource?: string): Promise<SoundAssignmentReview> {
    this.cancel(); const generation = this.#generation;
    this.#check(generation,current,signal,false);
    const settings = this.settings.reviewImportedSoundSettings(raw, archivedSource);
    const ids = [...new Set(SOUND_EVENTS.map(key => settings.after[key]).filter(value => value.startsWith('custom:')).map(value => value.slice(7)))].sort();
    const check = () => this.#check(generation,current,signal,ids.length > 0); check();
    const files = await this.files.read(ids,() => { check(); return true; },signal); check();
    const review = Object.freeze({...settings,files}); this.#pending = {review,settings,ids,generation}; return review;
  }
  async apply(review: SoundAssignmentReview, current: () => boolean, signal: AbortSignal): Promise<void> {
    const pending = this.#pending; this.#pending = undefined;
    if (!pending || pending.review !== review) throw new Error('This sound review expired. Review the archive again.');
    const check = () => this.#check(pending.generation,current,signal,pending.ids.length > 0); check();
    const files = await this.files.read(pending.ids,() => { check(); return true; },signal); check();
    if (JSON.stringify(files) !== JSON.stringify(review.files)) throw new Error('Custom sound files changed. Review the archive choices again.');
    this.settings.restoreImportedSoundSettings(pending.settings,() => { check(); return true; });
  }
}
