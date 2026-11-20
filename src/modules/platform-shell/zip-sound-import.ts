import type { DeviceImportCheckpoint } from '../../storage/device-restore-point-model';
import { soundsFromDeviceArchive, type DeviceArchiveReview } from '../../storage/device-data-review';
import { SoundArchiveImporter, type SoundImportReview } from '../../storage/sound-archive-import';
import type { NotificationSoundStore } from '../../storage/device-notification-sound-store';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

const fileSize = (bytes: number): string => bytes < 1024 ? `${bytes} B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KiB` : `${(bytes/(1024*1024)).toFixed(1)} MiB`;

export interface SoundImportDestination { store: NotificationSoundStore; changed: () => void }

export class ZipSoundImportPanel {
  readonly element = element('div');
  readonly button = element('button',{type:'button',className:'kl-text-button',text:'Review sound import',onClick:() => { void this.#open(); }});
  readonly dialog = element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Import notification sounds?'});
  readonly #body = element('div',{className:'kl-dialog-body'});
  readonly #status = element('p',{className:'kl-setting-help'});
  readonly #error = element('p',{className:'kl-setting-help'});
  readonly #confirm = element('button',{type:'button',className:'kl-text-button',text:'Add missing sounds',onClick:() => { void this.#apply(); }});
  readonly #check = element('button',{type:'button',className:'kl-text-button',text:'Check last sound import',onClick:() => { void this.#checkLast(); }});
  readonly #download = element('button',{type:'button',className:'kl-text-button',text:'Download sound recovery copies',onClick:() => { void this.#downloadCopies(); }});
  #importer: SoundArchiveImporter | undefined; #archive: DeviceArchiveReview | undefined; #review: SoundImportReview | undefined;
  #controller: AbortController | undefined; #generation = 0; #recoveryGeneration = 0; #destroyed = false; #focus: HTMLElement | undefined;
  constructor(readonly owner: number, readonly current: () => boolean, readonly destination: NotificationSoundStore, readonly changed: () => void = () => {}, readonly checkpoint?: DeviceImportCheckpoint) {
    this.#status.setAttribute('role','status'); this.#error.setAttribute('role','alert'); this.#error.hidden = true; this.button.hidden = true;
    this.#check.hidden = this.#download.hidden = true;
    this.dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Import notification sounds?'}),
      element('button',{type:'button',className:'kl-icon-button',ariaLabel:'Close sound import review',onClick:() => this.close()},kikiIcon('close'))),this.#body,
      element('footer',{className:'kl-dialog-actions'},element('button',{type:'button',className:'kl-text-button',text:'Cancel',onClick:() => this.close()}),this.#confirm));
    this.dialog.addEventListener('cancel',e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown',e => { if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); this.close(); } });
    this.dialog.addEventListener('close',() => {
      if (this.dialog.open) return; this.#review = undefined; this.#importer?.cancel();
      if (this.#active() && this.#focus?.isConnected) this.#focus.focus({preventScroll:true}); this.#focus = undefined;
    });
    this.element.append(this.button,element('div',{className:'kl-setting-tool-buttons'},this.#check,this.#download),this.#status,this.dialog);
  }
  #active(): boolean { return !this.#destroyed && this.current(); }
  #get(): SoundArchiveImporter { return this.#importer ??= new SoundArchiveImporter(this.owner,this.destination); }
  async #recoveryButtons(): Promise<void> {
    const generation = ++this.#recoveryGeneration, current = () => this.#active() && generation === this.#recoveryGeneration;
    try { const count = await this.#get().recoveryCount(current,new AbortController().signal); if (current()) this.#check.hidden = this.#download.hidden = !count; }
    catch { if (current()) this.#check.hidden = this.#download.hidden = true; }
  }
  refresh(): void { void this.#recoveryButtons(); }
  setArchive(archive: DeviceArchiveReview | undefined): void { this.close(); this.#archive = archive; this.button.hidden = !archive?.soundsAvailable; this.#status.textContent = ''; }
  close(): void { ++this.#generation; this.#controller?.abort(); this.#controller = undefined; this.#review = undefined; this.#importer?.cancel(); this.button.disabled = false; if (this.dialog.open) this.dialog.close(); }
  destroy(): void { this.#destroyed = true; this.close(); this.dialog.remove(); }
  #start(): {current: () => boolean; signal: AbortSignal} {
    this.#controller?.abort(); const generation = ++this.#generation; this.#controller = new AbortController();
    return {current:() => this.#active() && generation === this.#generation,signal:this.#controller.signal};
  }
  async #open(): Promise<void> {
    if (!this.#active() || !this.#archive || this.button.disabled) return;
    const job = this.#start(); this.button.disabled = true; this.#status.setAttribute('role','status'); this.#status.textContent = 'Checking saved notification sounds…';
    try {
      const review = await this.#get().review(soundsFromDeviceArchive(this.#archive,this.owner),job.current,job.signal);
      if (!job.current()) return; this.#review = review; this.#confirm.disabled = !review.sounds; this.#error.hidden = true; this.#error.textContent = '';
      this.#body.replaceChildren(element('p',{text:`Account #${this.owner} · Notification sounds on this device`}),
        element('p',{text:`${review.sounds} ${review.sounds === 1 ? 'sound' : 'sounds'} to add · ${fileSize(review.bytes)}`}),
        element('p',{text:`${review.kept} already saved · ${review.excluded} excluded by the 24-sound or 40 MiB limit`}),
        element('p',{text:'Existing sounds stay as they are. If a sound is already saved, the current copy is kept.'}),
        element('p',{text:`A copy of all your current custom sounds is saved together with the additions. Recovery copies need ${fileSize(review.recoveryBytes)} more storage.`}),
        element('p',{text:'New sounds become available under Alerts → Choose sounds. To restore archived choices and volume, use Review sound choices after importing files. This file import keeps current choices and does not play audio.'}),
        element('p',{text:'Additional archived file fields are kept as inactive data with the restored sounds.'}),
        element('p',{text:'Keep the original ZIP. Recovery copies are kept without automatic deletion or undo. Restore only an archive you trust. Each file is checked against the five-second limit without playback.'}),this.#error);
      this.#status.textContent = ''; this.#focus = focusedElement(this.element); this.dialog.showModal(); this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus();
    } catch(e) { if (job.current()) this.#report(e); }
    finally { if (job.current()) this.button.disabled = false; }
  }
  async #apply(): Promise<void> {
    if (!this.#active() || !this.#review) return;
    const review = this.#review, base = this.#start(), job = {...base,current:() => base.current() && this.dialog.open}; this.#review = undefined; this.#confirm.disabled = true;
    this.#error.hidden = false; this.#error.textContent = 'Saving the recovery copy and notification sounds…';
    try {
      const apply = (current=job.current) => this.#get().apply(review,current,job.signal);
      const id = this.checkpoint ? await this.checkpoint('sounds',job.current,job.signal,apply) : await apply(); if (!job.current()) return;
      this.close(); this.#status.setAttribute('role','status'); this.#status.textContent = `Added ${review.sounds} ${review.sounds === 1 ? 'sound' : 'sounds'}. Sound recovery copy ${id} is kept.`;
    } catch(e) { if (job.current()) { this.#error.textContent = e instanceof Error ? e.message : 'Sound import could not be confirmed.'; } }
    finally { this.changed(); void this.#recoveryButtons(); }
  }
  async #checkLast(): Promise<void> {
    if (!this.#active() || this.dialog.open) return; const job = this.#start();
    try { const result = await this.#get().inspectLast(job.current,job.signal); if (!job.current()) return; this.#status.setAttribute('role','status');
      this.#status.textContent = result.state === 'present' ? `All imported sounds from Sound recovery copy ${result.id} are present.` : `Notification sounds changed since import ${result.id}. The recovery copy is kept; review the ZIP again before retrying.`;
    } catch(e) { if (job.current()) this.#report(e); }
  }
  async #downloadCopies(): Promise<void> {
    if (!this.#active() || this.dialog.open || this.#download.disabled) return; const job = this.#start(); this.#download.disabled = true;
    try { const blob = await this.#get().recoveryDownload(job.current,job.signal); if (!job.current()) return;
      const url = URL.createObjectURL(blob), anchor = element('a'); anchor.href = url;
      anchor.download = `KikiLink-sound-recovery-${this.owner}-${new Date().toISOString().slice(0,10)}.zip`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
      this.#status.setAttribute('role','status'); this.#status.textContent = 'Recovery download requested. It contains private sound files; keep it safe.';
    } catch(e) { if (job.current()) this.#report(e); }
    finally { this.#download.disabled = false; }
  }
  #report(e: unknown): void { this.#status.setAttribute('role','alert'); this.#status.textContent = e instanceof Error ? e.message : 'Notification sounds could not be reviewed.'; }
}
