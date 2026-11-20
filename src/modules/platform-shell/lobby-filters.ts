import type { BCLobbyRoom } from '../../bc/adapter';
import { element as makeElement } from '../../cloud/dom';
function element<K extends keyof HTMLElementTagNameMap>(tag: K, props: NonNullable<Parameters<typeof makeElement>[1]> & { onClick?: () => void } = {}, ...children: Array<Node | string>): HTMLElementTagNameMap[K] {
  const { onClick, ...base } = props, node = makeElement(tag, base, ...children);
  if (onClick) node.addEventListener('click', onClick);
  return node;
}
import { kikiIcon } from '../link-chat/icons';
import { lobbyLanguageKey, lobbyLanguageLabel, type LobbyDetailFilters } from '../link-chat/social-directory';
import { iconButton } from './browse-controls';
import { fitPanelDialog } from './panel-dialog-layout';

/** Live filters over the supplied BC snapshot; never searches for additional private rooms. */
export class LobbyFilters {
  readonly button = element('button', { type: 'button', className: 'kl-text-button kl-browse-filter kl-lobby-filter-button', onClick: () => this.#open() }, kikiIcon('filter'), element('span', { text: 'Filters' }));
  readonly dialog = element('dialog', { className: 'kl-browse-dialog kl-lobby-filter-dialog', ariaLabel: 'Filter lobbies' });
  readonly summary = element('div', { className: 'kl-lobby-filter-summary', hidden: true });
  readonly #language = element('select', { ariaLabel: 'Language' });
  readonly #access = element('select', { ariaLabel: 'Access' });
  readonly #count = element('p', { role: 'status' });
  #value: LobbyDetailFilters = { language: null, access: 'all' };
  #returnFocus = true;
  #languageSignature = '';
  constructor(readonly change: () => void, readonly reset: () => void, readonly platform = false) {
    this.button.setAttribute('aria-haspopup', 'dialog');
    this.#count.setAttribute('aria-live', 'polite');
    for (const [value, text] of [['all', 'All rooms'], ['public', 'Public'], ['private', 'Private']] as const) this.#access.append(element('option', { value, text }));
    this.#language.addEventListener('change', () => { this.#value.language = this.#language.value === '*' ? null : this.#language.value.slice(2); change(); });
    this.#access.addEventListener('change', () => { this.#value.access = this.#access.value as LobbyDetailFilters['access']; change(); });
    const title = element('h2', { text: 'Filter lobbies' });
    const help = element('p', { className: 'kl-lobby-filter-help', text: 'Filters apply to the loaded BC room list. Your current room stays above the results. Refresh to check availability.' });
    const fields = [element('label', {}, 'Language', this.#language), element('label', {}, 'Access', this.#access), this.#count, help];
    if (platform) {
      help.hidden = true;
      help.id = 'kl-lobby-filter-help';
      this.dialog.setAttribute('aria-describedby', help.id);
      this.dialog.classList.add('kl-room-dialog', 'kl-explore-filter-dialog');
      this.dialog.append(element('header', { className: 'kl-room-dialog-heading' },
        element('div', {}, element('span', { className: 'kl-sp-eyebrow', text: 'KIKILINK' }), title),
        iconButton('Close dialog', 'close', () => this.close())),
      element('div', { className: 'kl-room-dialog-body' }, ...fields));
    } else this.dialog.append(title, ...fields);
    this.dialog.append(element('footer', {}, element('button', { type: 'button', className: 'kl-text-button', text: 'Reset filters', onClick: reset }),
        element('button', { type: 'button', className: 'kl-text-button kl-text-button--primary', text: 'Show rooms', onClick: () => this.close() })));
    this.dialog.addEventListener('keydown', event => event.stopPropagation());
    this.dialog.addEventListener('close', () => { if (this.#returnFocus && this.button.isConnected) this.button.focus({ preventScroll: true }); this.#returnFocus = true; });
  }
  get value(): LobbyDetailFilters { return { ...this.#value }; }
  set(value: LobbyDetailFilters): void { this.#value = { ...value }; }
  #open(): void {
    if (this.dialog.open) return;
    this.dialog.showModal();
    if (this.platform) {
      fitPanelDialog(this.dialog, { layout: (width, height) => width <= 700 || width <= 900 && height <= 500
        ? { marginX: 0, marginY: 0, maxHeight: height - 20 }
        : { marginX: 12, marginY: 12 } });
      this.#language.focus({ preventScroll: true });
    }
  }
  close(focus = true): void { if (this.dialog.open) { this.#returnFocus = focus; this.dialog.close(); } }
  update(source: BCLobbyRoom[], count: number, status: string): void {
    const languages = new Set(source.slice(0, 500).map(room => lobbyLanguageKey(room.language)));
    if (this.#value.language !== null) languages.add(this.#value.language);
    const keys = [...languages].sort(), signature = JSON.stringify(keys);
    if (signature !== this.#languageSignature) {
      this.#language.replaceChildren(element('option', { value: '*', text: 'All languages' }), ...keys.map(key => element('option', { value: 'l:' + key, text: this.platform ? lobbyLanguageLabel(key) : key ? key.toLocaleUpperCase() : 'Unspecified' })));
      this.#languageSignature = signature;
    }
    this.#language.value = this.#value.language === null ? '*' : 'l:' + this.#value.language;
    this.#access.value = this.#value.access;
    const countText = `${count} ${count === 1 ? 'room matches' : 'rooms match'}`;
    this.#count.textContent = this.platform && status === 'Loaded BC room list' ? countText : `${countText} · ${status}`;
    const labels = [this.#value.language !== null ? (this.platform ? lobbyLanguageLabel(this.#value.language) : this.#value.language.toLocaleUpperCase() || 'Unspecified') : '', this.#value.access === 'all' ? '' : this.#value.access === 'public' ? 'Public' : 'Private'].filter(Boolean);
    this.button.lastElementChild!.textContent = labels.length ? `Filters · ${labels.length}` : 'Filters';
    this.summary.hidden = !labels.length;
    this.summary.replaceChildren(...labels.map(text => element('span', { text })), element('button', { type: 'button', className: 'kl-text-button', text: 'Clear filters', onClick: this.reset }));
  }
}
