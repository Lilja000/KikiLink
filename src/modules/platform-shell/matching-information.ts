import type { MatchOwn } from '../../../cloud/shared/matching.mjs';
import { element } from '../../cloud/dom';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
import { fitPanelDialog } from './panel-dialog-layout';

interface SavedSuggestion {
  title: string;
  icon: KikiLinkIconName;
  avatar?: HTMLElement | undefined;
  reason?: string | undefined;
  open(): void;
}

interface InformationContent {
  own: MatchOwn;
  signal: HTMLButtonElement;
  connections?: HTMLButtonElement | undefined;
  hidden: HTMLButtonElement;
  detail?: string | undefined;
  saved(): Promise<SavedSuggestion[]>;
}

const title = 'Matching information';

export function matchingInformationButton(button: HTMLButtonElement): HTMLButtonElement {
  button.classList.add('kl-match-information-toggle');
  button.setAttribute('aria-label', title);
  button.setAttribute('aria-haspopup', 'dialog');
  button.title = title;
  button.replaceChildren(kikiIcon('info'));
  return button;
}

export class MatchingInformation {
  readonly element = element('dialog', { className: 'kl-match-dialog', ariaLabel: title });
  #releaseFit: (() => void) | undefined;
  #restoreFocus = true;

  constructor(readonly current: () => boolean, readonly focusTrigger: () => void) {
    this.element.dataset.layout = 'information';
    this.element.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
    this.element.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    this.element.addEventListener('close', () => {
      if (!this.element.open && this.#restoreFocus && this.current()) this.focusTrigger();
    });
  }

  close(restoreFocus = true): void {
    this.#releaseFit?.();
    this.#releaseFit = undefined;
    if (this.element.open) {
      this.#restoreFocus = restoreFocus;
      this.element.close();
    }
    this.element.replaceChildren();
  }

  open({ own, signal, connections, hidden, detail, saved }: InformationContent): void {
    if (!this.current() || this.element.open) return;
    const note = (text: string) => element('p', { className: 'kl-match-meta', text });
    const list = element('div', { className: 'kl-match-information-list', role: 'status' }, note('Loading saved suggestions…'));
    const close = element('button', { type: 'button', className: 'kl-icon-button', ariaLabel: 'Close dialog' }, kikiIcon('close'));
    close.onclick = () => this.close();
    const signalStatus = own.active ? 'available' : own.signal.published && own.signal.expiresAt !== null && own.signal.expiresAt <= own.serverNow ? 'expired' : 'paused';
    connections?.classList.add('kl-match-link');
    hidden.classList.add('kl-match-link');
    this.element.replaceChildren(
      element('header', { className: 'kl-match-dialog-header' }, element('div', {},
        element('span', { className: 'kl-match-dialog-eyebrow', text: 'KikiLink' }), element('h2', { text: title })), close),
      element('div', { className: 'kl-match-dialog-body kl-match-information' },
        element('header', {}, element('h3', { text: 'Matches' }), kikiIcon('heart')),
        element('p', {}, element('strong', { text: `Your signal is ${signalStatus}` })),
        note('Requests require an active signal.'),
        element('div', { className: 'kl-match-actions' }, signal, connections),
        element('hr'),
        note('Scores use shared information only.'), detail ? note(detail) : undefined,
        element('h3', { text: 'Saved for later' }), list, hidden),
    );
    this.element.showModal();
    this.#releaseFit = fitPanelDialog(this.element, { layout: () => ({ marginX: 0, marginY: 0 }) });
    close.focus({ preventScroll: true });

    const visible = () => this.current() && this.element.open && this.element.contains(list);
    void saved().then(rows => {
      if (!visible()) return;
      if (!rows.length) { list.replaceChildren(note('No saved suggestions.')); return; }
      list.replaceChildren(...rows.map(row => {
        const avatar = row.avatar ?? element('span', { className: 'kl-match-avatar kl-match-avatar--resource' }, kikiIcon(row.icon));
        avatar.setAttribute('aria-hidden', 'true');
        const button = element('button', { type: 'button', className: 'kl-text-button kl-match-information-row', title: row.title },
          avatar, element('span', { className: 'kl-match-information-copy' },
            element('strong', { text: row.title }),
            element('small', { text: row.reason?.trim() || 'A shared suggestion' })),
          kikiIcon('arrow-right'));
        button.onclick = () => { if (visible() && button.isConnected) { this.close(false); row.open(); } };
        return button;
      }));
    }).catch(() => { if (visible()) list.replaceChildren(note('Saved suggestions couldn’t load.')); });
  }
}
