import type { DeviceImportCheckpoint } from '../../storage/device-restore-point-model';
import type { SettingsStore } from '../../core/settings';
import { SOUND_EVENTS, SOUND_EVENT_LABELS } from '../../core/sound-settings-import';
import type { NotificationSoundChoice } from '../../core/types';
import { archivedSettingsFromDeviceArchive, settingsFromDeviceArchive, type DeviceArchiveReview } from '../../storage/device-data-review';
import { SoundAssignmentRestorer, type SoundAssignmentReview } from '../../storage/sound-assignment-restore';
import type { NotificationSoundStore } from '../../storage/device-notification-sound-store';
import { NOTIFICATION_SOUND_LABELS } from '../link-reactions/notification-sounds';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

export class ZipSoundAssignmentsPanel {
  readonly element = element('div');
  readonly button = element('button',{type:'button',className:'kl-text-button',text:'Review sound choices',onClick:() => { void this.#open(); }});
  readonly dialog = element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Restore sound choices?'});
  readonly #body = element('div',{className:'kl-dialog-body'});
  readonly #status = element('p',{className:'kl-setting-help'});
  readonly #error = element('p',{className:'kl-setting-help'});
  readonly #confirm = element('button',{type:'button',className:'kl-text-button',text:'Restore sound choices',onClick:() => { void this.#apply(); }});
  #restorer: SoundAssignmentRestorer | undefined; #archive: DeviceArchiveReview | undefined; #review: SoundAssignmentReview | undefined;
  #controller: AbortController | undefined; #generation = 0; #destroyed = false; #modalActive = false; #focus: HTMLElement | undefined;
  constructor(readonly owner: number, readonly current: () => boolean, readonly settings: SettingsStore,
    readonly destination: NotificationSoundStore, readonly changed: () => void = () => {}, readonly checkpoint?: DeviceImportCheckpoint) {
    this.#body.style.overflowWrap = 'anywhere'; this.element.hidden = true; this.#status.setAttribute('role','status'); this.#error.setAttribute('role','alert');
    this.dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Restore sound choices?'}),
      element('button',{type:'button',className:'kl-icon-button',ariaLabel:'Close sound choices review',onClick:() => this.close()},kikiIcon('close'))),this.#body,
      element('footer',{className:'kl-dialog-actions'},element('button',{type:'button',className:'kl-text-button',text:'Cancel',onClick:() => this.close()}),this.#confirm));
    this.dialog.addEventListener('cancel',e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown',e => { if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); this.close(); } });
    this.dialog.addEventListener('close',() => {
      if (this.dialog.open) return;
      if (this.#modalActive) this.close();
      if (this.#active() && this.#focus?.isConnected) this.#focus.focus({preventScroll:true}); this.#focus = undefined;
    });
    this.element.append(this.button,this.#status,this.dialog);
  }
  #active(): boolean { return !this.#destroyed && this.current(); }
  #get(): SoundAssignmentRestorer { return this.#restorer ??= new SoundAssignmentRestorer(this.owner,this.settings,this.destination); }
  setArchive(archive: DeviceArchiveReview | undefined): void { this.close(); this.#archive = archive; this.element.hidden = !archive?.settingsAvailable; this.#status.textContent = ''; }
  close(): void {
    ++this.#generation; this.#controller?.abort(); this.#controller = undefined; this.#review = undefined;
    this.#restorer?.cancel(); this.button.disabled = false; this.#modalActive = false;
    this.element.removeAttribute('aria-busy'); if (this.dialog.open) this.dialog.close();
  }
  destroy(): void { this.#destroyed = true; this.close(); this.dialog.remove(); }
  #start(): {current: () => boolean; signal: AbortSignal} {
    this.#controller?.abort(); const controller = new AbortController(), generation = ++this.#generation; this.#controller = controller;
    return {current:() => generation === this.#generation && this.#active(),signal:controller.signal};
  }
  async #open(): Promise<void> {
    if (!this.#active() || !this.#archive || this.button.disabled) return;
    const job = this.#start(); this.button.disabled = true; this.element.setAttribute('aria-busy','true');
    this.#status.setAttribute('role','status'); this.#status.textContent = 'Checking sound choices and saved custom files…';
    try {
      const review = await this.#get().review(settingsFromDeviceArchive(this.#archive,this.owner),job.current,job.signal,archivedSettingsFromDeviceArchive(this.#archive,this.owner));
      if (!job.current()) return; this.#review = review; this.#confirm.disabled = !review.changed;
      this.#error.hidden = true; this.#error.textContent = '';
      const label = (choice: NotificationSoundChoice) => choice.startsWith('custom:')
        ? `Custom: ${review.files.find(file => file.id === choice.slice(7))?.name ?? choice.slice(7)}`
        : NOTIFICATION_SOUND_LABELS[choice as keyof typeof NOTIFICATION_SOUND_LABELS] ?? choice;
      this.#body.replaceChildren(element('p',{text:`Account #${this.owner} · Sound choices on this device`}),
        element('p',{text:review.changed ? 'Current → From archive' : 'These sound settings already match the archive.'}),
        element('ul',{},element('li',{text:`Notification sounds: ${review.before.enabled ? 'On' : 'Off'} → ${review.after.enabled ? 'On' : 'Off'}`}),
          element('li',{text:`Volume: ${review.before.volume}% → ${review.after.volume}%`}),
          ...SOUND_EVENTS.map(key => element('li',{text:`${SOUND_EVENT_LABELS[key]}: ${label(review.before[key])} → ${label(review.after[key])}`}))),
        element('p',{text:review.files.length ? 'Custom choices use the named files currently saved on this device. Import missing sound files first. A file already saved under the same ID is kept.' : 'These choices use built-in sounds.'}),
        element('p',{text:'Both the current saved settings and the exact settings from this ZIP are kept in Settings recovery before applying changes.'}),
        ...(review.archivedDataChanged ? [element('p',{text:'Additional original settings data will be kept on this device for future device ZIP exports. It stays inactive.'})] : []),
        element('p',{text:review.after.enabled ? 'After confirmation, future notifications may use these sounds at the shown volume. This restore does not play a preview.' : 'Notification sounds will be off. This restore does not play a preview.'}),
        element('p',{text:'Only sound choices, volume and the sound on/off setting change. Alert triggers, automatic rules and all files keep their current settings.'}),this.#error);
      this.#status.textContent = ''; this.#focus = focusedElement(this.element); this.#modalActive = true;
      if (!this.dialog.open) this.dialog.showModal(); this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus();
    } catch(e) { if (job.current()) { this.#status.setAttribute('role','alert'); this.#status.textContent = e instanceof Error ? e.message : 'Sound choices could not be reviewed.'; } }
    finally { if (job.current()) { this.button.disabled = false; this.element.removeAttribute('aria-busy'); } }
  }
  async #apply(): Promise<void> {
    if (!this.#active()) { this.close(); return; }
    const review = this.#review; if (!review || this.#confirm.disabled) return;
    this.#review = undefined; this.#confirm.disabled = true; const base = this.#start(), job = {...base,current:() => base.current() && this.dialog.open};
    this.#error.hidden = false; this.#error.textContent = 'Checking files and preserving both settings originals…';
    try {
      const apply = (current=job.current) => this.#get().apply(review,current,job.signal);
      if (this.checkpoint) await this.checkpoint('sound-choices',job.current,job.signal,apply); else await apply(); if (!job.current()) return;
      this.close(); this.#status.setAttribute('role','status');
      this.#status.textContent = review.previousCopyId === null ? 'Sound choices restored. The archived original is kept in Settings recovery; there were no previous saved settings.' : `Sound choices restored. Both originals are kept in Settings recovery; previous settings are in copy ${review.previousCopyId}.`;
      try { this.changed(); } catch { /* A refresh failure must not replay a confirmed settings write. */ }
    } catch(e) { if (job.current()) { this.#error.hidden = false; this.#error.textContent = `${e instanceof Error ? e.message : 'Sound choices could not be restored.'} Close this review and check Settings recovery before trying again.`; } }
  }
}
