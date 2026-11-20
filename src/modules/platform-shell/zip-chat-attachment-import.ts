import type { DeviceImportCheckpoint } from '../../storage/device-restore-point-model';
import type { ChatService } from '../link-chat/chat-service';
import { chatFromDeviceArchive, type DeviceArchiveReview } from '../../storage/device-data-review';
import { ChatAttachmentArchiveImporter, type ChatAttachmentImportReview } from '../../storage/chat-attachment-archive-import';
import type { ChatImportRules } from '../../storage/chat-import-model';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

export class ZipChatAttachmentImportPanel {
  readonly element = element('div');
  readonly button = element('button',{type:'button',className:'kl-text-button',text:'Review chat attachments',onClick:() => { void this.#open(); }});
  readonly dialog = element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Restore chat attachment references?'});
  readonly #body = element('div',{className:'kl-dialog-body'});
  readonly #status = element('p',{className:'kl-setting-help'});
  readonly #error = element('p',{className:'kl-setting-help'});
  readonly #confirm = element('button',{type:'button',className:'kl-text-button',text:'Restore references',onClick:() => { void this.#apply(); }});
  readonly #check = element('button',{type:'button',className:'kl-text-button',text:'Check last chat attachment import',onClick:() => { void this.#checkLast(); }});
  readonly #download = element('button',{type:'button',className:'kl-text-button',text:'Download chat attachment recovery copies',onClick:() => this.#downloadCopies()});
  #importer: ChatAttachmentArchiveImporter | undefined; #archive: DeviceArchiveReview | undefined;
  #review: ChatAttachmentImportReview | undefined; #rules: ChatImportRules | undefined;
  #controller: AbortController | undefined; #generation = 0; #destroyed = false; #focus: HTMLElement | undefined;
  constructor(readonly service: ChatService, readonly owner: number, readonly current: () => boolean, readonly changed: () => void = () => {}, readonly checkpoint?: DeviceImportCheckpoint) {
    this.#status.setAttribute('role','status'); this.#error.setAttribute('role','alert'); this.#error.hidden = true; this.button.hidden = true;
    this.dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Restore chat attachment references?'}),
      element('button',{type:'button',className:'kl-icon-button',ariaLabel:'Close chat attachment review',onClick:() => this.close()},kikiIcon('close'))),this.#body,
      element('footer',{className:'kl-dialog-actions'},element('button',{type:'button',className:'kl-text-button',text:'Cancel',onClick:() => this.close()}),this.#confirm));
    this.dialog.addEventListener('cancel',e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown',e => { if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); this.close(); } });
    this.dialog.addEventListener('close',() => {
      if (this.dialog.open) return;
      this.#review = undefined; this.#importer?.cancel();
      if (this.#active()) this.#focus?.isConnected && this.#focus.focus({preventScroll:true}); this.#focus = undefined;
    });
    this.element.append(this.button,element('div',{className:'kl-setting-tool-buttons'},this.#check,this.#download),this.#status,this.dialog); this.#recoveryButtons();
  }
  #active(): boolean { return !this.#destroyed && this.current(); }
  #get(): ChatAttachmentArchiveImporter { return this.#importer ??= new ChatAttachmentArchiveImporter(this.owner); }
  #recoveryButtons(): void { try { this.#check.hidden = this.#download.hidden = !this.#get().recoverySource(); } catch { this.#check.hidden = this.#download.hidden = true; } }
  setArchive(archive: DeviceArchiveReview | undefined): void { this.close(); this.#archive = archive; this.button.hidden = !archive?.chatAvailable; this.#status.textContent = ''; this.#recoveryButtons(); }
  close(): void { ++this.#generation; this.#controller?.abort(); this.#controller = undefined; this.#review = undefined; this.#importer?.cancel(); this.button.disabled = false; if (this.dialog.open) this.dialog.close(); this.#recoveryButtons(); }
  destroy(): void { this.#destroyed = true; this.close(); this.dialog.remove(); }
  #start(): {current: () => boolean; signal: AbortSignal} {
    this.#controller?.abort(); const generation = ++this.#generation; this.#controller = new AbortController();
    return {current:() => this.#active() && generation === this.#generation,signal:this.#controller.signal};
  }
  async #open(): Promise<void> {
    if (!this.#active() || !this.#archive || this.button.disabled) return;
    const job = this.#start(); this.button.disabled = true; this.#status.setAttribute('role','status'); this.#status.textContent = 'Checking saved chat attachment references…';
    try {
      const rules = this.service.deviceHistoryImportRules(this.owner), review = await this.#get().review(chatFromDeviceArchive(this.#archive,this.owner),rules,job.current,job.signal);
      if (!job.current()) return; this.#review = review; this.#rules = rules; this.#confirm.disabled = !review.messages && !review.updated; this.#error.hidden = true; this.#error.textContent = '';
      this.#body.replaceChildren(element('p',{text:`Account #${this.owner} · This device`}),
        element('p',{text:`${review.attachments} attachment references · ${review.messages} new messages · ${review.updated} existing messages to complete`}),
        element('p',{text:`${review.duplicates} already saved · ${review.conflicts} ${review.conflicts === 1 ? 'conflict' : 'conflicts'} · ${review.excluded} excluded by history limits or unsupported content`}),
        element('p',{text:'New messages and missing attachment references are restored. Existing text, read state and chat preferences are preserved. Conflicts keep the current copy.'}),
        element('p',{text:'This ZIP contains image and audio IDs, not their files. Open restored references in the chat to request files from Cloud. Expired, deleted or inaccessible files may be unavailable.'}),
        element('p',{text:'A recovery copy of current history is saved first. New messages are marked read. Nothing is sent or loaded automatically; receipts, reactions and retries stay inactive. Hidden and deleted history stays protected. Restore only a trusted archive.'}),this.#error);
      this.#status.textContent = ''; this.#focus = focusedElement(this.element); this.dialog.showModal(); this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus();
    } catch(e) { if (job.current()) this.#report(e); }
    finally { if (job.current()) this.button.disabled = false; }
  }
  async #apply(): Promise<void> {
    if (!this.#active() || !this.#review || !this.#rules) return;
    const review = this.#review, rules = this.#rules, base = this.#start(), job = {...base,current:() => base.current() && this.dialog.open}; this.#review = undefined; this.#confirm.disabled = true;
    this.#error.hidden = false; this.#error.textContent = 'Saving history originals and attachment references…';
    try {
      const apply = (current=job.current) => this.service.importDeviceHistory(this.owner,rules,current,(guard,committed) => this.#get().apply(review,rules,current,job.signal,guard,committed));
      const id = this.checkpoint ? await this.checkpoint('chat-attachments',job.current,job.signal,apply) : await apply();
      if (!job.current()) return; this.close(); this.#status.setAttribute('role','status');
      this.#status.textContent = `Restored ${review.attachments} attachment references. Recovery copy ${id} is kept. No messages were sent or files downloaded.`; this.changed();
    } catch(e) { if (job.current()) { this.#error.textContent = `${e instanceof Error ? e.message : 'Chat import could not be confirmed.'} Close this review and check the last chat attachment import before retrying.`; this.#recoveryButtons(); } }
  }
  async #checkLast(): Promise<void> {
    if (!this.#active() || this.dialog.open) return; const job = this.#start();
    try { const rules = this.service.deviceHistoryImportRules(this.owner), result = await this.#get().inspectLast(rules.database,job.current,job.signal);
      if (!job.current()) return; this.#status.setAttribute('role','status');
      this.#status.textContent = result.state === 'present' ? `All restored references from chat attachment recovery copy ${result.id} are present.` : result.state === 'not-applied' ? `Chat attachment import ${result.id} was not applied. The previous history is intact; select the ZIP and review it again to retry.` : `History changed since chat import ${result.id}. The recovery copy is kept; no automatic retry or rollback was performed.`;
    } catch(e) { if (job.current()) this.#report(e); }
  }
  #downloadCopies(): void {
    if (!this.#active()) return;
    try { const raw = this.#get().recoverySource(); if (raw === null) throw new Error('There are no saved chat attachment import copies.');
      const url = URL.createObjectURL(new Blob([raw],{type:'application/json'})), anchor = element('a'); anchor.href = url;
      anchor.download = `KikiLink-chat-attachment-recovery-${this.owner}-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
      this.#status.setAttribute('role','status'); this.#status.textContent = 'Recovery download requested. It contains private chat history; keep it safe.';
    } catch(e) { this.#report(e); }
  }
  #report(e: unknown): void { this.#status.setAttribute('role','alert'); this.#status.textContent = e instanceof Error ? e.message : 'Chat history could not be reviewed.'; }
}
