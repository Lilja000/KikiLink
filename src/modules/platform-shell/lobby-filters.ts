import { removableFilter } from './applied-filter';
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
  readonly #resetButton = element('button', { type: 'button', className: 'kl-text-button', text: 'Reset filters' });
  #value: LobbyDetailFilters = { language: null, access: 'all' };
  #returnFocus = true;
  #languageSignature = '';
  #summarySignature = '';
  constructor(readonly change: () => void, readonly reset: () => void, readonly platform = false) {
    this.dialog.id = 'kl-lobby-filters';
    this.button.setAttribute('aria-controls', this.dialog.id);
    this.button.setAttribute('aria-haspopup', 'dialog');
    this.button.setAttribute('aria-expanded', 'false');
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
    this.#resetButton.addEventListener('click', () => {
      if (!this.dialog.open) return;
      this.reset();
      this.#language.focus({ preventScroll: true });
    });
    this.dialog.append(element('footer', {}, this.#resetButton,
        element('button', { type: 'button', className: 'kl-text-button kl-text-button--primary', text: 'Show rooms', onClick: () => this.close() })));
    this.dialog.addEventListener('keydown', event => event.stopPropagation());
    this.dialog.addEventListener('close', () => {
      if (this.dialog.open) return;
      this.button.setAttribute('aria-expanded', 'false');
      if (this.#returnFocus && this.button.isConnected) this.button.focus({ preventScroll: true });
      this.#returnFocus = true;
    });
  }
  get value(): LobbyDetailFilters { return { ...this.#value }; }
  set(value: LobbyDetailFilters): void { this.#value = { ...value }; }
  #open(): void {
    if (this.dialog.open) return;
    this.dialog.showModal();
    this.button.setAttribute('aria-expanded', 'true');
    if (this.platform) {
      fitPanelDialog(this.dialog, { layout: (width, height) => width <= 700 || width <= 900 && height <= 500
        ? { marginX: 0, marginY: 0, maxHeight: height - 20 }
        : { marginX: 12, marginY: 12 } });
      this.#language.focus({ preventScroll: true });
    }
  }
  close(focus = true): void { if (this.dialog.open) { this.#returnFocus = focus; this.dialog.close(); } }
  update(source: BCLobbyRoom[], count: number, status: string, showReset: boolean, hasFilters: boolean): void {
    this.#resetButton.disabled = !hasFilters;
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
    const { language, access } = this.#value;
    const filterCount = Number(language !== null) + Number(access !== 'all');
    this.button.dataset.active = String(filterCount > 0);
    this.button.lastElementChild!.textContent = filterCount ? `Filters · ${filterCount}` : 'Filters';
    this.summary.hidden = !filterCount;
    const summarySignature = JSON.stringify([language, access, showReset]);
    if (summarySignature === this.#summarySignature) return;
    this.#summarySignature = summarySignature;
    const chip = (label: string, remove: () => void) => removableFilter(element('button', {
      type: 'button', className: 'kl-text-button', onClick: () => {
        this.button.focus({ preventScroll: true });
        remove();
        this.change();
      },
    }), label);
    this.summary.replaceChildren();
    if (language !== null) {
      const label = this.platform ? lobbyLanguageLabel(language) : language.toLocaleUpperCase() || 'Unspecified';
      this.summary.append(chip(label, () => { this.#value.language = null; }));
    }
    if (access !== 'all') this.summary.append(chip(access === 'public' ? 'Public' : 'Private', () => { this.#value.access = 'all'; }));
    if (showReset && filterCount) this.summary.append(element('button', { type: 'button', className: 'kl-text-button', text: 'Clear filters', onClick: this.reset }));
  }
}
