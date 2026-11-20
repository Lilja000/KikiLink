import type { DeviceImportCheckpoint } from '../../storage/device-restore-point-model';
import { galleryFromDeviceArchive, type DeviceArchiveReview } from '../../storage/device-data-review';
import { GalleryArchiveImporter, type GalleryImportReview } from '../../storage/gallery-archive-import';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

const fileSize = (bytes: number): string => bytes < 1024 ? `${bytes} B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KiB` : `${(bytes/(1024*1024)).toFixed(1)} MiB`;

export class ZipGalleryImportPanel {
  readonly element = element('div');
  readonly button = element('button',{type:'button',className:'kl-text-button',text:'Review Gallery import',onClick:() => { void this.#open(); }});
  readonly dialog = element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Import Gallery images?'});
  readonly #body = element('div',{className:'kl-dialog-body'});
  readonly #status = element('p',{className:'kl-setting-help'});
  readonly #error = element('p',{className:'kl-setting-help'});
  readonly #confirm = element('button',{type:'button',className:'kl-text-button',text:'Add missing images',onClick:() => { void this.#apply(); }});
  readonly #check = element('button',{type:'button',className:'kl-text-button',text:'Check last Gallery import',onClick:() => { void this.#checkLast(); }});
  readonly #download = element('button',{type:'button',className:'kl-text-button',text:'Download Gallery recovery copies',onClick:() => { void this.#downloadCopies(); }});
  #importer: GalleryArchiveImporter | undefined; #archive: DeviceArchiveReview | undefined; #review: GalleryImportReview | undefined;
  #controller: AbortController | undefined; #generation = 0; #recoveryGeneration = 0; #destroyed = false; #focus: HTMLElement | undefined;
  constructor(readonly owner: number, readonly current: () => boolean, readonly changed: () => void = () => {}, readonly checkpoint?: DeviceImportCheckpoint) {
    this.#status.setAttribute('role','status'); this.#error.setAttribute('role','alert'); this.#error.hidden = true; this.button.hidden = true;
    this.#check.hidden = this.#download.hidden = true;
    this.dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Import Gallery images?'}),
      element('button',{type:'button',className:'kl-icon-button',ariaLabel:'Close Gallery import review',onClick:() => this.close()},kikiIcon('close'))),this.#body,
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
  #get(): GalleryArchiveImporter { return this.#importer ??= new GalleryArchiveImporter(this.owner); }
  async #recoveryButtons(): Promise<void> {
    const generation = ++this.#recoveryGeneration, current = () => this.#active() && generation === this.#recoveryGeneration;
    try { const count = await this.#get().recoveryCount(current,new AbortController().signal); if (current()) this.#check.hidden = this.#download.hidden = !count; }
    catch { if (current()) this.#check.hidden = this.#download.hidden = true; }
  }
  refresh(): void { void this.#recoveryButtons(); }
  setArchive(archive: DeviceArchiveReview | undefined): void { this.close(); this.#archive = archive; this.button.hidden = !archive?.galleryAvailable; this.#status.textContent = ''; }
  close(): void { ++this.#generation; this.#controller?.abort(); this.#controller = undefined; this.#review = undefined; this.#importer?.cancel(); this.button.disabled = false; if (this.dialog.open) this.dialog.close(); }
  destroy(): void { this.#destroyed = true; this.close(); this.dialog.remove(); }
  #start(): {current: () => boolean; signal: AbortSignal} {
    this.#controller?.abort(); const generation = ++this.#generation; this.#controller = new AbortController();
    return {current:() => this.#active() && generation === this.#generation,signal:this.#controller.signal};
  }
  async #open(): Promise<void> {
    if (!this.#active() || !this.#archive || this.button.disabled) return;
    const job = this.#start(); this.button.disabled = true; this.#status.setAttribute('role','status'); this.#status.textContent = 'Checking saved Gallery images…';
    try {
      const review = await this.#get().review(galleryFromDeviceArchive(this.#archive,this.owner),job.current,job.signal);
      if (!job.current()) return; this.#review = review; this.#confirm.disabled = !review.images; this.#error.hidden = true; this.#error.textContent = '';
      this.#body.replaceChildren(element('p',{text:`Account #${this.owner} · Gallery on this device`}),
        element('p',{text:`${review.images} ${review.images === 1 ? 'image' : 'images'} to add · ${fileSize(review.bytes)}`}),
        element('p',{text:`${review.kept} already saved · ${review.excluded} excluded by the 80-image limit`}),
        element('p',{text:'Existing images stay as they are. If an image is already saved, the current copy is kept.'}),
        element('p',{text:'Additional archived fields are kept as inactive data.'}),
        element('p',{text:`A copy of your current Gallery is saved together with the additions. Recovery copies need ${fileSize(review.recoveryBytes)} more storage.`}),
        element('p',{text:'Only device Gallery images are added. Nothing is shared or posted. Music, sounds, chat attachments and settings stay unchanged.'}),
        element('p',{text:'Keep the original ZIP. Recovery copies are kept without automatic deletion or undo. Restore only an archive you trust.'}),this.#error);
      this.#status.textContent = ''; this.#focus = focusedElement(this.element); this.dialog.showModal(); this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus();
    } catch(e) { if (job.current()) this.#report(e); }
    finally { if (job.current()) this.button.disabled = false; }
  }
  async #apply(): Promise<void> {
    if (!this.#active() || !this.#review) return;
    const review = this.#review, base = this.#start(), job = {...base,current:() => base.current() && this.dialog.open}; this.#review = undefined; this.#confirm.disabled = true;
    this.#error.hidden = false; this.#error.textContent = 'Saving the Gallery recovery copy and images…';
    try {
      const apply = (current=job.current) => this.#get().apply(review,current,job.signal);
      const id = this.checkpoint ? await this.checkpoint('gallery',job.current,job.signal,apply) : await apply(); if (!job.current()) return;
      this.close(); this.#status.setAttribute('role','status'); this.#status.textContent = `Added ${review.images} ${review.images === 1 ? 'image' : 'images'}. Gallery recovery copy ${id} is kept.`; this.changed();
    } catch(e) { if (job.current()) { this.#error.textContent = e instanceof Error ? e.message : 'Gallery import could not be confirmed.'; } }
    finally { void this.#recoveryButtons(); }
  }
  async #checkLast(): Promise<void> {
    if (!this.#active() || this.dialog.open) return; const job = this.#start();
    try { const result = await this.#get().inspectLast(job.current,job.signal); if (!job.current()) return; this.#status.setAttribute('role','status');
      this.#status.textContent = result.state === 'present' ? `All imported images from Gallery recovery copy ${result.id} are present.` : `Gallery images changed since import ${result.id}. The recovery copy is kept; review the ZIP again before retrying.`;
    } catch(e) { if (job.current()) this.#report(e); }
  }
  async #downloadCopies(): Promise<void> {
    if (!this.#active() || this.dialog.open || this.#download.disabled) return; const job = this.#start(); this.#download.disabled = true;
    try { const blob = await this.#get().recoveryDownload(job.current,job.signal); if (!job.current()) return;
      const url = URL.createObjectURL(blob), anchor = element('a'); anchor.href = url;
      anchor.download = `KikiLink-gallery-recovery-${this.owner}-${new Date().toISOString().slice(0,10)}.zip`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
      this.#status.setAttribute('role','status'); this.#status.textContent = 'Recovery download requested. It contains private images; keep it safe.';
    } catch(e) { if (job.current()) this.#report(e); }
    finally { this.#download.disabled = false; }
  }
  #report(e: unknown): void { this.#status.setAttribute('role','alert'); this.#status.textContent = e instanceof Error ? e.message : 'Gallery images could not be reviewed.'; }
}
