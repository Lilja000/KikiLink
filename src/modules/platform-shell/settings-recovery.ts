import type { SettingsStore, SettingsRestoreReview } from '../../core/settings';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

/** Account-local copies only. Review is passive; restore uses a checked store-issued review. */
export class SettingsRecoveryPanel {
  readonly element = element('section', { className: 'kl-setting-group', ariaLabel: 'Settings recovery' });
  readonly dialog = element('dialog', { className: 'kl-dialog kl-settings-recovery-dialog', ariaLabel: 'Restore settings?' });
  readonly #notice = element('div');
  readonly #count = element('span', { className: 'kl-disclosure-meta' });
  readonly #disclosure = element('details', { className: 'kl-settings-disclosure' });
  readonly #content = element('div');
  readonly #body = element('div', { className: 'kl-dialog-body' });
  readonly #error = element('p', { className: 'kl-setting-help' });
  readonly #confirm = element('button', { type: 'button', className: 'kl-text-button', text: 'Restore settings', onClick: () => this.#restore() });
  #feedback = '';
  #review: SettingsRestoreReview | undefined;
  #returnFocus: HTMLElement | undefined;
  #destroyed = false;
  constructor(readonly store: SettingsStore, readonly owner: number, readonly current: () => boolean) {
    this.#error.setAttribute('role', 'alert'); this.#error.hidden = true;
    this.dialog.append(element('header', { className: 'kl-dialog-header' }, element('h2', { text: 'Restore settings?' }),
      element('button', { type: 'button', className: 'kl-icon-button', ariaLabel: 'Close settings review', onClick: () => this.close() }, kikiIcon('close'))),
      this.#body, element('footer', { className: 'kl-dialog-actions' },
        element('button', { type: 'button', className: 'kl-text-button', text: 'Cancel', onClick: () => this.close() }), this.#confirm));
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); this.close(); }
    });
    this.dialog.addEventListener('close', () => {
      if (this.dialog.open) return;
      this.#review = undefined; this.store.cancelRecoveryReview();
      if (this.#active()) {
        const focus = this.#returnFocus?.isConnected ? this.#returnFocus : this.#content.querySelector<HTMLButtonElement>('button');
        focus?.focus({ preventScroll: true });
      }
      this.#returnFocus = undefined;
    });
    this.#disclosure.append(element('summary', {}, element('span', { text: 'Settings recovery' }), this.#count), this.#content);
    this.element.append(this.#notice, this.#disclosure, this.dialog); this.refresh();
  }
  #active(): boolean { return !this.#destroyed && Number.isSafeInteger(this.owner) && this.owner > 0 && this.current(); }
  close(): void {
    this.#review = undefined; this.store.cancelRecoveryReview();
    if (this.dialog.open) this.dialog.close();
  }
  destroy(): void { this.#destroyed = true; this.close(); this.dialog.remove(); }
  #date(value: number): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', hour12: this.store.getField('ui', 'timeFormat') === '12-hour' }).format(value);
  }
  #openReview(id: number): void {
    if (!this.#active()) return;
    try {
      const review = this.store.reviewRecoveryCopy(id); this.#review = review;
      const sections = element('ul'); for (const name of review.changedSections) sections.append(element('li', { text: name }));
      this.#body.replaceChildren(element('p', { text: `Copy ${review.copyId} · ${this.#date(review.createdAt)}` }),
        element('p', { text: review.changedSections.length ? 'These sections will change:' : 'No supported settings would change.' }), sections,
        element('p', { text: `${review.activities} custom activities · ${review.playlists} playlists · ${review.rules} automatic rules` }),
        element('p', { text: 'Current saved settings will be kept first. Only supported settings are restored; the original copy stays unchanged.' }),
        ...(review.archivedDataChanged ? [element('p', { text: 'Additional original settings data will be kept on this device for future device ZIP exports. It stays inactive.' })] : []),
        element('p', { text: 'History limits and retention stay as they are. Automatic rules and AFK auto-reply will be off.' }),
        element('p', { text: 'Chats and media are separate. Missing files cannot be restored here.' }), this.#error);
      this.#error.hidden = true; this.#error.textContent = ''; this.#confirm.disabled = review.changedSections.length === 0 && !review.archivedDataChanged;
      if (!this.dialog.open) { this.#returnFocus = focusedElement(this.element); this.dialog.showModal(); }
      this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus();
    } catch (error) { this.#feedback = error instanceof Error ? error.message : 'This copy could not be reviewed.'; this.refresh(); }
  }
  #restore(): void {
    if (!this.#active()) { this.close(); return; }
    if (!this.#review) return;
    try {
      this.store.restoreRecoveryCopy(this.#review);
      this.#feedback = 'Settings restored. Existing recovery copies are kept on this device.';
      this.close(); this.refresh();
    } catch (error) {
      this.#error.textContent = `${error instanceof Error ? error.message : 'Settings could not be restored.'} Close this review and review the copy again before retrying.`;
      this.#error.hidden = false; this.#confirm.disabled = true;
    }
  }
  #download(recovery: boolean): void {
    if (!this.#active()) return;
    try {
      const raw = recovery ? this.store.persistence.recoverySource() : this.store.persistence.savedSource();
      if (raw === null) throw new Error(recovery ? 'No recovery copies are saved yet.' : 'There are no saved settings on this device.');
      if (typeof URL.createObjectURL !== 'function') throw new Error('This browser cannot create a settings download.');
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const link = element('a'); link.href = url; link.download = `KikiLink-settings-${recovery ? 'recovery-' : ''}${this.owner}-${new Date().toISOString().slice(0, 10)}.json`;
      link.hidden = true; this.element.append(link);
      try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      this.#feedback = 'Download requested. Keep the file private; it may contain profile details and older settings.';
    } catch (error) { this.#feedback = error instanceof Error ? error.message : 'The settings download could not be prepared.'; }
    this.refresh();
  }
  refresh(): void {
    const note = (text: string) => element('p', { className: 'kl-setting-help', text });
    const feedback = (text: string, role: 'status' | 'alert') => { const p = note(text); p.setAttribute('role', role); return p; };
    const button = (text: string, recovery: boolean) => element('button', { type: 'button', className: 'kl-text-button', text,
      onClick: () => this.#download(recovery) });
    const status = this.store.persistence.status();
    this.#content.replaceChildren(note('Download your saved settings or review an earlier copy. Chat history and media are backed up separately.'));
    this.#notice.replaceChildren();
    if (status.message) this.#notice.append(feedback(status.message, status.writable ? 'status' : 'alert'));
    let copies: ReturnType<SettingsStore['persistence']['recoveryCopies']> = [];
    this.#count.textContent = '';
    try { copies = this.store.persistence.recoveryCopies(); const count = copies.length; this.#count.textContent = `${count} ${count === 1 ? 'copy' : 'copies'}`; this.#content.append(note(count ? `${count} original ${count === 1 ? 'copy' : 'copies'} kept on this device.` : 'No recovery copies yet.')); }
    catch (error) { this.#notice.append(feedback(error instanceof Error ? error.message : 'Recovery copies could not be read.', 'alert')); }
    this.#content.append(element('div', { className: 'kl-setting-tool-buttons' }, button('Download saved settings', false), button('Download recovery copies', true)));
    if (copies.length) {
      this.#content.append(note('Review a copy saved for this account before restoring it. Local music files referenced by these copies are kept on this device.'));
      const list = element('div', { className: 'kl-settings-recovery-copies' });
      for (const copy of copies.slice().reverse()) {
        const review = element('button', { type: 'button', className: 'kl-text-button', text: 'Review', ariaLabel: `Review copy ${copy.id}`, onClick: () => this.#openReview(copy.id) });
        review.disabled = !status.writable;
        list.append(element('div', { className: 'kl-setting-action-row' }, element('span', { text: `Copy ${copy.id} · ${this.#date(copy.createdAt)}` }), review));
      }
      this.#content.append(list);
    }
    if (this.#feedback) this.#notice.append(feedback(this.#feedback, 'status'));
  }
}
