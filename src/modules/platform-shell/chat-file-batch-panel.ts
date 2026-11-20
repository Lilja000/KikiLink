import { ChatFileBatchSaver, type ChatFileBatchContext, type ChatFileBatchReview, type ChatFileBatchResult } from '../../cloud/chat-file-batch';
import { CHAT_FILE_LIMIT, CHAT_FILE_TOTAL } from '../../storage/chat-file-model';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

const size = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KiB` : `${(bytes/1024/1024).toFixed(1)} MiB`;
const summary = (r: Readonly<ChatFileBatchResult>) => `${r.saved} saved · ${r.kept} already saved · ${r.unavailable} unavailable · ${r.changed} changed · ${r.tooLarge} too large for remaining space · ${r.remaining} remaining`;

export class ChatFileBatchPanel {
  readonly element = element('div');
  readonly button = element('button',{type:'button',className:'kl-text-button',text:'Save chat files offline',onClick:() => { void this.#open(true); }});
  readonly dialog = element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Save chat files offline?'});
  readonly #body = element('div',{className:'kl-dialog-body'});
  readonly #status = element('p',{className:'kl-setting-help'});
  readonly #progress = element('p',{className:'kl-setting-help'});
  readonly #confirm = element('button',{type:'button',className:'kl-text-button',text:'Save available files',onClick:() => {
    if (this.#review) void this.#save(); else void this.#open(!this.#next);
  }});
  readonly #cancel = element('button',{type:'button',className:'kl-text-button',text:'Cancel',onClick:() => {
    if (this.#saving) { this.#controller?.abort(); this.#cancel.disabled = true; this.#progress.textContent = 'Stopping… Files already saved are kept.'; } else this.close();
  }});
  #saver: ChatFileBatchSaver | undefined;
  #review: ChatFileBatchReview | undefined;
  #controller: AbortController | undefined;
  #generation = 0;
  #destroyed = false;
  #saving = false;
  #modalActive = false;
  #next = false;
  #focus: HTMLElement | undefined;
  #last: Readonly<ChatFileBatchResult> | undefined;
  constructor(readonly owner: number, readonly context: ChatFileBatchContext, readonly current: () => boolean, readonly beforeOpen: () => void = () => {}) {
    this.#status.setAttribute('role','status'); this.#progress.setAttribute('role','status');
    this.dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Save chat files offline?'}),
      element('button',{type:'button',className:'kl-icon-button',ariaLabel:'Close offline file review',onClick:() => this.close()},kikiIcon('close'))),this.#body,
      element('footer',{className:'kl-dialog-actions'},this.#cancel,this.#confirm));
    this.dialog.addEventListener('cancel',event => { event.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown',event => { if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); this.close(); } });
    this.dialog.addEventListener('close',() => { if (this.#modalActive && !this.dialog.open) this.close(); });
    this.element.append(this.button,this.#status,this.dialog);
  }
  #active(): boolean { return !this.#destroyed && this.current(); }
  #get(): ChatFileBatchSaver { return this.#saver ??= new ChatFileBatchSaver(this.owner,this.context); }
  close(): void {
    ++this.#generation; this.#controller?.abort(); this.#controller = undefined; this.#review = undefined; this.#saver?.cancelReview();
    if (this.#saving) this.#status.textContent = `Saving stopped. Confirmed files are kept.${this.#last ? ` ${summary(this.#last)}` : ''}`;
    this.#saving = false; this.button.disabled = false; this.#cancel.disabled = false;
    this.#modalActive = false; if (this.dialog.open) this.dialog.close();
    const focus = this.#focus; this.#focus = undefined;
    if (this.#active() && focus?.isConnected) focus.focus({preventScroll:true});
  }
  destroy(): void { this.#destroyed = true; this.close(); this.dialog.remove(); }
  #start(): {current: () => boolean; signal: AbortSignal} {
    this.#controller?.abort(); const generation = ++this.#generation, controller = new AbortController(); this.#controller = controller;
    return {current:() => this.#active() && generation === this.#generation,signal:controller.signal};
  }
  async #open(restart: boolean): Promise<void> {
    if (!this.#active() || this.#saving || this.button.disabled) return;
    if (restart && !this.dialog.open) this.beforeOpen();
    const job = this.#start(); this.#review = undefined; this.#last = undefined; this.button.disabled = true; this.#confirm.disabled = true;
    this.#status.textContent = 'Reviewing files referenced by saved chats…'; this.#progress.textContent = '';
    try {
      const review = await this.#get().review(job.current,job.signal,restart); if (!job.current()) return;
      this.#review = review; this.#next = false; this.#confirm.textContent = 'Save available files'; this.#cancel.textContent = 'Cancel'; this.#cancel.disabled = false;
      this.#confirm.disabled = !review.queued || review.stored >= CHAT_FILE_LIMIT || review.storedBytes >= CHAT_FILE_TOTAL;
      this.#body.replaceChildren(element('p',{text:`Account #${this.owner} · Files from direct chats saved on this device`}),
        element('p',{text:`${review.images} ${review.images === 1 ? 'image' : 'images'} · ${review.audio} audio ${review.audio === 1 ? 'file' : 'files'} in this batch`}),
        element('p',{text:`${review.alreadySaved} already saved · ${review.remaining} more missing files after this batch`}),
        element('p',{text:`Device storage: ${review.stored} / 100 files · ${size(review.storedBytes)} / 128 MiB`}),
        element('p',{text:'Files are checked with Cloud and saved one at a time, newest first. Their sizes and availability are checked during download. Hidden, deleted and expired history is excluded; Cloud-only history is not loaded.'}),
        element('p',{text:'You can stop at any time. Confirmed files stay saved; existing copies are never replaced. Nothing is sent or played. Include saved files in Download device data and keep that private, unencrypted ZIP separately.'}),this.#progress);
      this.#status.textContent = '';
      if (!this.dialog.open) { this.#focus = focusedElement(this.element); this.dialog.showModal(); this.#modalActive = true; this.#cancel.focus(); }
    } catch(e) { if (job.current()) { this.#status.textContent = e instanceof Error ? e.message : 'Saved chat files could not be reviewed.'; if (this.dialog.open) this.#progress.textContent = this.#status.textContent; } }
    finally { if (job.current()) this.button.disabled = false; }
  }
  async #save(): Promise<void> {
    if (!this.#active() || this.#saving || !this.#review || !this.dialog.open) return;
    const review = this.#review, job = this.#start(); this.#review = undefined; this.#saving = true; this.#confirm.disabled = true; this.button.disabled = true;
    this.#cancel.textContent = 'Stop saving'; this.#progress.textContent = 'Checking the first file…';
    try {
      const result = await this.#get().save(review,job.current,job.signal,progress => { if (job.current()) { this.#last = progress; this.#progress.textContent = summary(progress); } });
      if (!job.current()) return;
      this.#last = result; this.#progress.textContent = `${summary(result)}. ${result.message}`; this.#status.textContent = this.#progress.textContent;
      this.#next = result.reason === 'batch-limit'; this.#confirm.textContent = this.#next ? 'Review next batch' : 'Review again'; this.#confirm.disabled = false;
    } catch(e) { if (job.current()) { this.#progress.textContent = e instanceof Error ? e.message : 'Saving could not be confirmed.'; this.#status.textContent = this.#progress.textContent; this.#next = false; this.#confirm.textContent = 'Review again'; this.#confirm.disabled = false; } }
    finally { if (job.current()) { this.#saving = false; this.#cancel.disabled = false; this.#cancel.textContent = 'Close'; this.button.disabled = false; } }
  }
}
