import { element } from '../../cloud/dom';
import { kikiIcon } from '../link-chat/icons';
import { fitPanelDialog } from './panel-dialog-layout';

interface HideSuggestion {
  name: string;
  current(): boolean;
  focus(): void;
  hide(): void;
}

const title = 'Hide this suggestion?';

export class MatchingHideSuggestion {
  readonly element = element('dialog', { className: 'kl-match-dialog', ariaLabel: title });
  #releaseFit: (() => void) | undefined;

  constructor() {
    this.element.dataset.layout = 'hide-suggestion';
    this.element.addEventListener('keydown', event => {
      if (event.key === 'Escape') event.stopPropagation();
    });
  }

  close(): void {
    this.element.oncancel = null;
    this.#releaseFit?.();
    this.#releaseFit = undefined;
    if (this.element.open) this.element.close();
    this.element.replaceChildren();
  }

  open({ name, current, focus, hide }: HideSuggestion): void {
    if (!this.element.isConnected || this.element.open || !current()) return;
    const active = () => this.element.open && this.element.contains(keep);
    const cancel = () => {
      if (!active()) return;
      this.close();
      focus();
    };
    const keep = element('button', { type: 'button', className: 'kl-text-button', text: 'Keep suggestion' });
    keep.onclick = cancel;
    const confirm = element('button', { type: 'button', className: 'kl-text-button kl-match-hide-confirm', text: 'Hide suggestion' });
    confirm.onclick = () => {
      if (!active()) return;
      if (!current()) { cancel(); return; }
      this.close();
      hide();
    };
    const dismiss = element('button', { type: 'button', className: 'kl-icon-button', ariaLabel: 'Close dialog' }, kikiIcon('close'));
    dismiss.onclick = cancel;
    this.element.oncancel = event => { event.preventDefault(); cancel(); };
    this.element.replaceChildren(
      element('header', { className: 'kl-match-dialog-header' }, element('div', {},
        element('span', { className: 'kl-match-dialog-eyebrow', text: 'KikiLink' }), element('h2', { text: title })), dismiss),
      element('div', { className: 'kl-match-dialog-body kl-match-hide-body' },
        element('p', {}, element('strong', { text: name }), ' will leave your recommendations and Saved until you restore it.'),
        element('p', { className: 'kl-match-meta', text: 'You can restore it from Hidden suggestions.' })),
      element('footer', {}, keep, confirm),
    );
    this.element.showModal();
    this.#releaseFit = fitPanelDialog(this.element);
    keep.focus({ preventScroll: true });
  }
}
