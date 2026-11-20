import type { SettingsImportReview, SettingsStore } from '../../core/settings';
import { archivedSettingsFromDeviceArchive, settingsFromDeviceArchive, type DeviceArchiveReview } from '../../storage/device-data-review';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';
import type { DeviceImportCheckpoint } from '../../storage/device-restore-point-model';

/** Explicit settings-only restore. Other ZIP data is never handed to a writer. */
export class ZipSettingsRestorePanel {
  readonly element = element('div');
  readonly button = element('button',{type:'button',className:'kl-text-button',text:'Review settings restore',onClick:() => this.#open()});
  readonly dialog = element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Restore settings from ZIP?'});
  readonly #body = element('div',{className:'kl-dialog-body'});
  readonly #status = element('p',{className:'kl-setting-help'});
  readonly #error = element('p',{className:'kl-setting-help'});
  readonly #confirm = element('button',{type:'button',className:'kl-text-button',text:'Restore settings only',onClick:() => { void this.#restore(); }});
  #archive: DeviceArchiveReview | undefined;
  #review: SettingsImportReview | undefined;
  #focus: HTMLElement | undefined;
  #destroyed = false;
  #controller: AbortController | undefined; #generation = 0;
  constructor(readonly store: SettingsStore, readonly owner: number, readonly current: () => boolean, readonly checkpoint?: DeviceImportCheckpoint) {
    this.#status.setAttribute('role','status'); this.#error.setAttribute('role','alert'); this.#error.hidden = true;
    this.dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Restore settings from ZIP?'}),
      element('button',{type:'button',className:'kl-icon-button',ariaLabel:'Close ZIP settings review',onClick:() => this.close()},kikiIcon('close'))),this.#body,
      element('footer',{className:'kl-dialog-actions'},element('button',{type:'button',className:'kl-text-button',text:'Cancel',onClick:() => this.close()}),this.#confirm));
    this.dialog.addEventListener('cancel',event => { event.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown',event => { if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); this.close(); } });
    this.dialog.addEventListener('close',() => {
      if (this.dialog.open) return; this.close();
      if (this.#active()) (this.#focus?.isConnected ? this.#focus : this.button).focus({preventScroll:true}); this.#focus = undefined;
    });
    this.element.append(this.button,this.#status,this.dialog); this.element.hidden = true;
  }
  #active(): boolean { return !this.#destroyed && this.current(); }
  setArchive(archive: DeviceArchiveReview | undefined): void {
    this.close(); this.#archive = archive; this.element.hidden = !archive?.settingsAvailable; this.#status.textContent = ''; this.#status.setAttribute('role','status');
  }
  close(): void { ++this.#generation; this.#controller?.abort(); this.#controller=undefined; this.#review = undefined; this.store.cancelImportedSettingsReview(); if (this.dialog.open) this.dialog.close(); }
  destroy(): void { this.#destroyed = true; this.setArchive(undefined); this.dialog.remove(); }
  #open(): void {
    if (!this.#active() || !this.#archive) return;
    try {
      const review = this.store.reviewImportedSettings(settingsFromDeviceArchive(this.#archive,this.owner),archivedSettingsFromDeviceArchive(this.#archive,this.owner)); this.#review = review;
      this.#error.hidden = true; this.#error.textContent = ''; this.#confirm.disabled = !review.changedSections.length && !review.archivedDataChanged;
      this.#body.replaceChildren(element('p',{text:review.changedSections.length ? 'These settings sections will change:' : 'No supported settings would change.'}),
        element('ul',{},...review.changedSections.map(name => element('li',{text:name}))),
        element('p',{text:`${review.activities} custom ${review.activities === 1 ? 'activity' : 'activities'} · ${review.rules} automatic ${review.rules === 1 ? 'rule' : 'rules'}`}),
        element('p',{text:'Any current saved settings and the exact settings from the ZIP will be kept in Settings recovery before applying changes. Only sections present in the ZIP are restored.'}),
        ...(review.archivedDataChanged ? [element('p',{text:'Additional original settings data will be kept on this device and included in future device ZIP exports. It stays inactive.'})] : []),
        element('p',{text:'Chat history, music, playlists, sound choices and files stay as they are. History limits stay unchanged. Automatic rules and AFK auto-reply will be off.'}),
        element('p',{text:'Restore only an archive you trust. Saved pending actions are not imported.'}),this.#error);
      if (!this.dialog.open) { this.#focus = focusedElement(this.element); this.dialog.showModal(); }
      this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus();
    } catch (error) { this.#status.setAttribute('role','alert'); this.#status.textContent = error instanceof Error ? error.message : 'The settings could not be reviewed.'; }
  }
  async #restore(): Promise<void> {
    if (!this.#active()) { this.close(); return; }
    if (!this.#review || this.#confirm.disabled) return;
    const review=this.#review, generation=++this.#generation, controller=new AbortController(); this.#controller=controller; this.#review=undefined; this.#confirm.disabled=true;
    const current=()=>generation===this.#generation&&this.#active()&&this.dialog.open;
    try {
      const previous = review.previousCopyId, apply=(guard=current)=>{if(!guard()||controller.signal.aborted)throw new Error('Settings restore cancelled.');this.store.restoreImportedSettings(review);};
      if(this.checkpoint){this.#error.hidden=false;this.#error.textContent='Saving a device restore point before changing settings…';await this.checkpoint('settings',current,controller.signal,apply);}else apply();
      if(!current())return;this.close();
      this.#status.setAttribute('role','status'); this.#status.textContent = previous === null ? 'Settings restored. The imported original is kept in Settings recovery; there were no previous saved settings.' : `Settings restored. Both originals are kept in Settings recovery. Review copy ${previous} to undo.`;
    } catch (error) {
      if(!current())return;
      this.#error.hidden = false; this.#error.textContent = `${error instanceof Error ? error.message : 'Settings could not be restored.'} Close this review and check Settings recovery before trying again.`;
      this.#confirm.disabled = true; this.#review = undefined;
    }
  }
}
