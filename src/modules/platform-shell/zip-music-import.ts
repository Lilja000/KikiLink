import type { DeviceImportCheckpoint } from '../../storage/device-restore-point-model';
import { musicFromDeviceArchive, type DeviceArchiveReview } from '../../storage/device-data-review';
import { MusicArchiveImporter, type MusicImportReview } from '../../storage/music-archive-import';
import type { SettingsStore } from '../../core/settings';
import type { MusicStore } from '../../storage/device-music-store';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

const fileSize = (bytes: number): string => bytes < 1024 ? `${bytes} B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KiB` : `${(bytes/(1024*1024)).toFixed(1)} MiB`;

export class ZipMusicImportPanel {
  readonly element = element('div');
  readonly button = element('button',{type:'button',className:'kl-text-button',text:'Review Music import',onClick:() => { void this.#open(); }});
  readonly dialog = element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Import Music files?'});
  readonly #body = element('div',{className:'kl-dialog-body'});
  readonly #status = element('p',{className:'kl-setting-help'});
  readonly #error = element('p',{className:'kl-setting-help'});
  readonly #confirm = element('button',{type:'button',className:'kl-text-button',text:'Add music and playlist entries',onClick:() => { void this.#apply(); }});
  readonly #check = element('button',{type:'button',className:'kl-text-button',text:'Check last Music import',onClick:() => { void this.#checkLast(); }});
  readonly #resume = element('button',{type:'button',className:'kl-text-button',text:'Review unfinished music import',onClick:() => { void this.#open(true); }});
  readonly #download = element('button',{type:'button',className:'kl-text-button',text:'Download Music recovery copies',onClick:() => { void this.#downloadCopies(); }});
  #importer: MusicArchiveImporter | undefined; #archive: DeviceArchiveReview | undefined; #review: MusicImportReview | undefined;
  #controller: AbortController | undefined; #generation = 0; #recoveryGeneration = 0; #destroyed = false; #focus: HTMLElement | undefined;
  constructor(readonly owner: number, readonly current: () => boolean, readonly settings: SettingsStore, readonly destination: MusicStore, readonly changed: () => void = () => {}, readonly checkpoint?: DeviceImportCheckpoint) {
    this.#status.setAttribute('role','status'); this.#error.setAttribute('role','alert'); this.#error.hidden = true; this.button.hidden = true;
    this.#check.hidden = this.#download.hidden = this.#resume.hidden = true;
    this.dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Import Music files?'}),
      element('button',{type:'button',className:'kl-icon-button',ariaLabel:'Close Music import review',onClick:() => this.close()},kikiIcon('close'))),this.#body,
      element('footer',{className:'kl-dialog-actions'},element('button',{type:'button',className:'kl-text-button',text:'Cancel',onClick:() => this.close()}),this.#confirm));
    this.dialog.addEventListener('cancel',e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown',e => { if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); this.close(); } });
    this.dialog.addEventListener('close',() => {
      if (this.dialog.open) return; this.#review = undefined; this.#importer?.cancel();
      if (this.#active() && this.#focus?.isConnected) this.#focus.focus({preventScroll:true}); this.#focus = undefined;
    });
    this.element.append(this.button,element('div',{className:'kl-setting-tool-buttons'},this.#check,this.#download,this.#resume),this.#status,this.dialog);
  }
  #active(): boolean { return !this.#destroyed && this.current(); }
  #get(): MusicArchiveImporter { return this.#importer ??= new MusicArchiveImporter(this.owner,this.settings,this.destination); }
  async #recoveryButtons(): Promise<void> {
    const generation = ++this.#recoveryGeneration, current = () => this.#active() && generation === this.#recoveryGeneration;
    try { const state = await this.#get().recoveryState(current,new AbortController().signal); if (current()) { this.#check.hidden = this.#download.hidden = !state.count; this.#resume.hidden = !state.pending; } }
    catch { if (current()) this.#check.hidden = this.#download.hidden = this.#resume.hidden = true; }
  }
  refresh(): void { void this.#recoveryButtons(); }
  setArchive(archive: DeviceArchiveReview | undefined): void { this.close(); this.#archive = archive; this.button.hidden = !archive?.musicAvailable; this.#status.textContent = ''; }
  close(): void { ++this.#generation; this.#controller?.abort(); this.#controller = undefined; this.#review = undefined; this.#importer?.cancel(); this.button.disabled = this.#resume.disabled = false; if (this.dialog.open) this.dialog.close(); }
  destroy(): void { this.#destroyed = true; this.close(); this.dialog.remove(); }
  #start(): {current: () => boolean; signal: AbortSignal} {
    this.#controller?.abort(); const generation = ++this.#generation; this.#controller = new AbortController();
    return {current:() => this.#active() && generation === this.#generation,signal:this.#controller.signal};
  }
  async #open(resume = false): Promise<void> {
    if (!this.#active() || (!resume && !this.#archive) || this.button.disabled || this.#resume.disabled) return;
    const job = this.#start(); this.button.disabled = this.#resume.disabled = true; this.#status.setAttribute('role','status'); this.#status.textContent = 'Checking saved Music files…';
    try {
      const review = resume ? await this.#get().reviewPending(job.current,job.signal) : await this.#get().review(musicFromDeviceArchive(this.#archive!,this.owner),job.current,job.signal);
      if (!job.current()) return; this.#review = review; this.#confirm.disabled = !review.resume && !review.files; this.#confirm.textContent = review.resume ? 'Finish music import' : 'Add music and playlist entries'; this.#error.hidden = true; this.#error.textContent = '';
      this.#body.replaceChildren(element('p',{text:`Account #${this.owner} · Music on this device`}),
        element('p',{text:review.resume ? `${review.files} saved files · ${review.entries} playlist entries still to add` : `${review.files} files to add · ${fileSize(review.bytes)}`}),
        element('p',{text:`${review.entries} playlist entries · ${review.newPlaylists} new ${review.newPlaylists === 1 ? 'playlist' : 'playlists'}`}),
        element('p',{text:`${review.kept} ${review.kept === 1 ? 'file' : 'files'} already saved · ${review.excluded} entries excluded`}),
        element('p',{text:'Current files and playlist entries are kept. Only local entries backed by newly restored files are added; URL and Catbox tracks are excluded.'}),
        element('p',{text:'Additional file and playlist fields are kept with the restored files as inactive data.'}),
        element('p',{text:`Recovery originals need ${fileSize(review.recoveryBytes)} more storage. Files are saved first, then playlists. An interrupted import can be finished here after reloading.`}),
        element('p',{text:'Importing does not start playback, share music or change the active playlist, volume, shuffle or repeat. File bytes are checked; browser playback support may vary.'}),
        element('p',{text:'Keep the original ZIP. Recovery copies are kept without automatic deletion or undo. Restore only an archive you trust.'}),this.#error);
      this.#status.textContent = ''; this.#focus = focusedElement(this.element); this.dialog.showModal(); this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus();
    } catch(e) { if (job.current()) this.#report(e); }
    finally { if (job.current()) this.button.disabled = this.#resume.disabled = false; }
  }
  async #apply(): Promise<void> {
    if (!this.#active() || !this.#review) return;
    const review = this.#review, base = this.#start(), job = {...base,current:() => base.current() && this.dialog.open}; this.#review = undefined; this.#confirm.disabled = true;
    this.#error.hidden = false; this.#error.textContent = 'Saving music recovery originals, files and playlist entries…';
    try {
      const apply = (current=job.current) => this.#get().apply(review,current,job.signal);
      const id = this.checkpoint && !review.resume ? await this.checkpoint('music',job.current,job.signal,apply) : await apply(); if (!job.current()) return;
      this.close(); this.#status.setAttribute('role','status'); this.#status.textContent = `Music import ${id} completed. ${review.entries} playlist entries added. Recovery originals are kept.`;
    } catch(e) { if (job.current()) { this.#error.textContent = e instanceof Error ? e.message : 'Music import could not be confirmed.'; } }
    finally { this.changed(); void this.#recoveryButtons(); }
  }
  async #checkLast(): Promise<void> {
    if (!this.#active() || this.dialog.open) return; const job = this.#start();
    try { const result = await this.#get().inspectLast(job.current,job.signal); if (!job.current()) return; this.#status.setAttribute('role','status');
      this.#status.textContent = result.state === 'complete' ? `Music import ${result.id} is complete: files and playlist references are present.` : result.state === 'pending' ? `Music import ${result.id} is unfinished. Files are protected; review the unfinished import to complete its playlists.` : `Music files or playlists changed since import ${result.id}. Recovery originals are kept.`;
    } catch(e) { if (job.current()) this.#report(e); }
  }
  async #downloadCopies(): Promise<void> {
    if (!this.#active() || this.dialog.open || this.#download.disabled) return; const job = this.#start(); this.#download.disabled = true;
    try { const blob = await this.#get().recoveryDownload(job.current,job.signal); if (!job.current()) return;
      const url = URL.createObjectURL(blob), anchor = element('a'); anchor.href = url;
      anchor.download = `KikiLink-music-recovery-${this.owner}-${new Date().toISOString().slice(0,10)}.zip`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
      this.#status.setAttribute('role','status'); this.#status.textContent = 'Recovery download requested. It contains private music and settings; keep it safe.';
    } catch(e) { if (job.current()) this.#report(e); }
    finally { this.#download.disabled = false; }
  }
  #report(e: unknown): void { this.#status.setAttribute('role','alert'); this.#status.textContent = e instanceof Error ? e.message : 'Music could not be reviewed.'; }
}
