import type { DeviceImportCheckpoint } from '../../storage/device-restore-point-model';
import { chatFilesFromDeviceArchive, type DeviceArchiveReview } from '../../storage/device-data-review';
import { ChatFileArchiveImporter, type ChatFileImportReview } from '../../storage/chat-file-archive-import';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

const fileSize = (bytes: number): string => bytes < 1024 ? `${bytes} B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KiB` : `${(bytes/(1024*1024)).toFixed(1)} MiB`;

export class ZipChatFileImportPanel {
  readonly element = element('div');
  readonly button = element('button',{type:'button',className:'kl-text-button',text:'Review saved chat files',onClick:() => { void this.#open(); }});
  readonly dialog = element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Restore saved chat files?'});
  readonly #body = element('div',{className:'kl-dialog-body'});
  readonly #status = element('p',{className:'kl-setting-help'});
  readonly #error = element('p',{className:'kl-setting-help'});
  readonly #confirm = element('button',{type:'button',className:'kl-text-button',text:'Add missing files',onClick:() => { void this.#apply(); }});
  readonly #check = element('button',{type:'button',className:'kl-text-button',text:'Check last chat file import',onClick:() => { void this.#checkLast(); }});
  readonly #download = element('button',{type:'button',className:'kl-text-button',text:'Download chat file recovery copies',onClick:() => { void this.#downloadCopies(); }});
  #importer: ChatFileArchiveImporter | undefined; #archive: DeviceArchiveReview | undefined; #review: ChatFileImportReview | undefined;
  #controller: AbortController | undefined; #generation = 0; #recoveryGeneration = 0; #destroyed = false; #focus: HTMLElement | undefined;
  constructor(readonly owner: number, readonly current: () => boolean, readonly changed: () => void = () => {}, readonly checkpoint?: DeviceImportCheckpoint) {
    this.#status.setAttribute('role','status'); this.#error.setAttribute('role','alert'); this.#error.hidden = true; this.button.hidden = true;
    this.#check.hidden = this.#download.hidden = true;
    this.dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Restore saved chat files?'}),
      element('button',{type:'button',className:'kl-icon-button',ariaLabel:'Close chat file import review',onClick:() => this.close()},kikiIcon('close'))),this.#body,
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
  #get(): ChatFileArchiveImporter { return this.#importer ??= new ChatFileArchiveImporter(this.owner); }
  async #recoveryButtons(): Promise<void> {
    const generation = ++this.#recoveryGeneration, current = () => this.#active() && generation === this.#recoveryGeneration;
    try { const count = await this.#get().recoveryCount(current,new AbortController().signal); if (current()) this.#check.hidden = this.#download.hidden = !count; }
    catch { if (current()) this.#check.hidden = this.#download.hidden = true; }
  }
  refresh(): void { void this.#recoveryButtons(); }
  setArchive(archive: DeviceArchiveReview | undefined): void { this.close(); this.#archive = archive; this.button.hidden = !archive?.chatFilesAvailable; this.#status.textContent = ''; }
  close(): void { ++this.#generation; this.#controller?.abort(); this.#controller = undefined; this.#review = undefined; this.#importer?.cancel(); this.button.disabled = false; if (this.dialog.open) this.dialog.close(); }
  destroy(): void { this.#destroyed = true; this.close(); this.dialog.remove(); }
  #start(): {current: () => boolean; signal: AbortSignal} {
    this.#controller?.abort(); const generation = ++this.#generation; this.#controller = new AbortController();
    return {current:() => this.#active() && generation === this.#generation,signal:this.#controller.signal};
  }
  async #open(): Promise<void> {
    if (!this.#active() || !this.#archive || this.button.disabled) return;
    const job = this.#start(); this.button.disabled = true; this.#status.setAttribute('role','status'); this.#status.textContent = 'Checking saved chat files…';
    try {
      const review = await this.#get().review(chatFilesFromDeviceArchive(this.#archive,this.owner),job.current,job.signal);
      if (!job.current()) return; this.#review = review; this.#confirm.disabled = !review.files; this.#error.hidden = true; this.#error.textContent = '';
      this.#body.replaceChildren(element('p',{text:`Account #${this.owner} · saved chat files on this device`}),
        element('p',{text:`${review.files} ${review.files === 1 ? 'file' : 'files'} to add · ${fileSize(review.bytes)}`}),
        element('p',{text:`${review.kept} already saved · ${review.excluded} excluded by the 100-file / 128 MiB limit`}),
        element('p',{text:'Existing saved files stay as they are. Matching IDs keep the current copy, even if the archived bytes differ.'}),
        element('p',{text:`A copy of your current saved chat files is kept together with the additions. Recovery copies need ${fileSize(review.recoveryBytes)} more storage.`}),
        element('p',{text:'Only saved chat file bytes are added. Restore chat history and attachment references separately to reconnect them to messages. No Cloud requests, uploads or playback occur.'}),
        element('p',{text:'Keep the original ZIP. Recovery copies are kept without automatic deletion or undo. Restore only an archive you trust.'}),this.#error);
      this.#status.textContent = ''; this.#focus = focusedElement(this.element); this.dialog.showModal(); this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus();
    } catch(e) { if (job.current()) this.#report(e); }
    finally { if (job.current()) this.button.disabled = false; }
  }
  async #apply(): Promise<void> {
    if (!this.#active() || !this.#review) return;
    const review = this.#review, base = this.#start(), job = {...base,current:() => base.current() && this.dialog.open}; this.#review = undefined; this.#confirm.disabled = true;
    this.#error.hidden = false; this.#error.textContent = 'Saving the recovery copy and chat files…';
    try {
      const apply = (current=job.current) => this.#get().apply(review,current,job.signal);
      const id = this.checkpoint ? await this.checkpoint('chat-files',job.current,job.signal,apply) : await apply(); if (!job.current()) return;
      this.close(); this.#status.setAttribute('role','status'); this.#status.textContent = `Added ${review.files} ${review.files === 1 ? 'file' : 'files'}. chat file recovery copy ${id} is kept.`; this.changed();
    } catch(e) { if (job.current()) { this.#error.textContent = e instanceof Error ? e.message : 'chat file import could not be confirmed.'; } }
    finally { void this.#recoveryButtons(); }
  }
  async #checkLast(): Promise<void> {
    if (!this.#active() || this.dialog.open) return; const job = this.#start();
    try { const result = await this.#get().inspectLast(job.current,job.signal); if (!job.current()) return; this.#status.setAttribute('role','status');
      this.#status.textContent = result.state === 'present' ? `All imported files from chat file recovery copy ${result.id} are present.` : `Saved chat files changed since import ${result.id}. The recovery copy is kept; review the ZIP again before retrying.`;
    } catch(e) { if (job.current()) this.#report(e); }
  }
  async #downloadCopies(): Promise<void> {
    if (!this.#active() || this.dialog.open || this.#download.disabled) return; const job = this.#start(); this.#download.disabled = true;
    try { const blob = await this.#get().recoveryDownload(job.current,job.signal); if (!job.current()) return;
      const url = URL.createObjectURL(blob), anchor = element('a'); anchor.href = url;
      anchor.download = `KikiLink-chat-file-recovery-${this.owner}-${new Date().toISOString().slice(0,10)}.zip`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
      this.#status.setAttribute('role','status'); this.#status.textContent = 'Recovery download requested. It contains private files; keep it safe.';
    } catch(e) { if (job.current()) this.#report(e); }
    finally { this.#download.disabled = false; }
  }
  #report(e: unknown): void { this.#status.setAttribute('role','alert'); this.#status.textContent = e instanceof Error ? e.message : 'Saved chat files could not be reviewed.'; }
}
