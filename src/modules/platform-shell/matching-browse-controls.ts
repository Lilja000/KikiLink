import type { MatchFilters, MatchOwn } from '../../../cloud/shared/matching.mjs';
import { element } from '../../cloud/dom';
import { bindClockText } from '../../core/time-format';
import { debounce } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';
import type { ShellAction, ShellActionMenu } from './action-menu';

export type MatchingBrowseSelection = Pick<MatchFilters,
  'query' | 'scope' | 'sort' | 'intent' | 'language' | 'interest' | 'community' | 'timezone' | 'available' | 'priority'>;

export function matchingBrowseSelection(filters: MatchingBrowseSelection): MatchingBrowseSelection {
  const { query, scope, sort, intent, language, interest, community, timezone, available, priority } = filters;
  return { query, scope, sort, intent, language, interest, community, timezone, available, priority };
}

export const matchOptionsSelector = '.kl-match-options';

export function matchConnectionsButton(button: HTMLButtonElement, count: number): HTMLButtonElement {
  button.classList.add('kl-match-connections');
  button.setAttribute('aria-label', 'Connections');
  setMatchConnectionsCount(button, count);
  return button;
}

export function setMatchConnectionsCount(button: HTMLButtonElement, count: number): void {
  const badge = button.querySelector<HTMLElement>('.kl-match-connections-count');
  const accessible = button.querySelector<HTMLElement>('.kl-match-connections-description');
  if (!count) {
    badge?.remove();
    accessible?.remove();
    button.removeAttribute('aria-describedby');
    return;
  }
  const countText = String(count);
  const description = `${count} incoming pending request${count === 1 ? '' : 's'}`;
  if (badge && accessible) {
    badge.textContent = countText;
    accessible.textContent = description;
    return;
  }
  const added = element('span', { className: 'kl-match-connections-count', text: countText, ariaHidden: 'true' });
  const label = element('span', { className: 'kl-sr-only kl-match-connections-description', text: description });
  label.id = `kl-match-connections-description-${crypto.randomUUID()}`;
  button.setAttribute('aria-describedby', label.id);
  button.append(added, label);
}

export function matchOptionsButton(menu: ShellActionMenu, current: () => boolean, actions: readonly ShellAction[]): HTMLButtonElement {
  const label = 'Matching options';
  const button = element('button', {
    type: 'button', className: 'kl-icon-button kl-match-options', ariaLabel: label, title: label,
  }, kikiIcon('more'));
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', menu.element.id);
  const ready = () => button.isConnected && current();
  if (!current()) button.setAttribute('aria-disabled', 'true');
  button.onclick = () => {
    if (!ready()) return;
    menu.open(button, label, actions.map(action => ({
      ...action,
      run: () => { if (ready()) action.run(); },
    })), undefined, false, false);
  };
  return button;
}

export function matchScopeControls(scope: MatchFilters['scope'], button: (scope: MatchFilters['scope'], label: string) => HTMLButtonElement): HTMLElement {
  const choices = element('div', { className: 'kl-match-collections', role: 'group', ariaLabel: 'Suggestion collection' });
  for (const [value, label] of [['all', 'All'], ['saved', 'Saved'], ['hidden', 'Hidden']] as const) {
    if (value === 'hidden' && scope !== value) continue;
    const choice = button(value, label);
    choice.setAttribute('aria-pressed', String(scope === value));
    choices.append(choice);
  }
  return choices;
}

export class MatchingSearch {
  #pending = false;
  #ready = false;
  #composition: HTMLInputElement | undefined;
  #revision = 0;
  readonly #debounced = debounce(() => this.submit(), 300);

  constructor(private readonly canApply: () => boolean, private readonly apply: () => void) {}

  get pending(): boolean { return this.#pending; }
  get composing(): boolean { return !!this.#composition?.isConnected; }
  get revision(): number { return this.#revision; }

  consume(): void {
    this.#pending = false;
    this.#ready = false;
    this.#debounced.cancel();
  }

  cancel(): void {
    this.consume();
    this.#composition = undefined;
  }

  submit(): void {
    if (this.composing) return;
    this.#debounced.cancel();
    this.#pending = this.#ready = true;
    this.flush();
  }

  flush(): void {
    if (this.#ready && !this.composing && this.canApply()) this.apply();
  }

  bind(input: HTMLInputElement, update: (query: string) => boolean, redraw: () => void): HTMLElement {
    const edit = () => {
      if (!input.isConnected) return;
      if (update(input.value)) {
        this.#revision++;
        this.#pending = true;
        this.#ready = false;
      }
      if (this.#pending && !this.#ready) this.#debounced();
    };
    input.addEventListener('compositionstart', () => {
      if (!input.isConnected) return;
      this.#composition = input;
      this.#debounced.cancel();
      this.#ready = false;
    });
    input.addEventListener('compositionend', () => {
      if (this.#composition !== input) return;
      this.#composition = undefined;
      edit();
      redraw();
    });
    input.addEventListener('input', event => {
      if (!this.composing && !(event instanceof InputEvent && event.isComposing)) edit();
    });
    return matchSearch(input, () => { if (input.isConnected) this.submit(); });
  }
}

function matchSearch(input: HTMLInputElement, apply: () => void): HTMLElement {
  const search = element('button', { type: 'button', className: 'kl-match-search-button', ariaLabel: 'Search', title: 'Search' }, kikiIcon('search'));
  const clear = element('button', { type: 'button', className: 'kl-match-search-button kl-match-search-clear', ariaLabel: 'Clear search', title: 'Clear search' }, kikiIcon('close'));
  search.addEventListener('click', apply);
  clear.addEventListener('click', () => {
    if (!input.isConnected) return;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    apply();
  });
  return element('div', { className: 'kl-match-search' }, search, input, clear);
}

export function matchSuggestionCount(count: number, hasMore: boolean): HTMLElement {
  const unit = count === 1 ? 'suggestion' : 'suggestions';
  const text = `${count} ${hasMore ? 'loaded ' : ''}${unit} · Ranked by shared information.`;
  return element('p', { className: 'kl-match-results', role: 'status', text });
}

export function matchEmptySuggestions(reset: HTMLButtonElement, hidden: HTMLButtonElement): HTMLElement {
  return element('section', { className: 'kl-match-empty' }, kikiIcon('heart'),
    element('h2', { text: 'No suggestions fit these filters' }),
    element('p', {
      className: 'kl-match-meta',
      text: 'Try a wider language, intent or shared-time filter. Hidden and private information is never used to fill the gaps.',
    }),
    element('div', { className: 'kl-match-actions' }, reset, hidden));
}

export function matchSignalStatus(own: MatchOwn, observedAt: number): 'Available' | 'Expired' | 'Paused' {
  const expiry = own.signal.expiresAt;
  const now = own.serverNow + Math.max(0, Date.now() - observedAt);
  if (own.signal.published && expiry !== null && expiry <= now) return 'Expired';
  return own.active ? 'Available' : 'Paused';
}

export function matchSignalBar(own: MatchOwn, status: ReturnType<typeof matchSignalStatus>, edit: HTMLButtonElement,
  preferences?: HTMLButtonElement): HTMLElement {
  const expiry = own.signal.expiresAt;
  const detail = element('p', { className: 'kl-match-meta' });
  if (status === 'Available') {
    detail.append(own.signal.intents.join(' · '), ' · Until ',
      expiry === null ? 'you pause it' : bindClockText(element('time'), expiry, 'medium-date-time'));
  } else {
    detail.textContent = 'Browse privately. Make your signal available before sending or accepting a connection request.';
  }
  preferences?.classList.add('kl-match-link');
  return element('section', { className: 'kl-match-signal' }, element('div', {},
    element('strong', { text: `Your signal · ${status}` }), detail), edit, preferences);
}
