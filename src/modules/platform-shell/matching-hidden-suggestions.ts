import { element } from '../../cloud/dom';
import { focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';
import { fitPanelDialog } from './panel-dialog-layout';

interface HiddenSuggestion {
  key: string;
  title: string;
  restore(): Promise<void>;
}

interface HiddenSuggestionsView {
  current(): boolean;
  focus(): void;
  load(active: () => boolean): Promise<HiddenSuggestion[]>;
}

const title = 'Hidden suggestions';
const note = (text: string) => element('p', { className: 'kl-match-meta', text });

export class MatchingHiddenSuggestions {
  readonly element = element('dialog', { className: 'kl-match-dialog', ariaLabel: title });
  #view: HiddenSuggestionsView | undefined;
  #refresh: (() => void) | undefined;
  #releaseFit: (() => void) | undefined;

  constructor() {
    this.element.dataset.layout = 'hidden-suggestions';
    this.element.addEventListener('keydown', event => {
      if (event.key === 'Escape') event.stopPropagation();
    });
    this.element.addEventListener('cancel', event => {
      event.preventDefault();
      this.close(true);
    });
  }

  refresh(): void { this.#refresh?.(); }

  close(restoreFocus = false): void {
    const view = this.#view;
    this.#view = undefined;
    this.#refresh = undefined;
    this.#releaseFit?.();
    this.#releaseFit = undefined;
    if (this.element.open) this.element.close();
    this.element.replaceChildren();
    if (restoreFocus && view?.current()) view.focus();
  }

  open(view: HiddenSuggestionsView): void {
    if (!view.current() || this.element.open) return;
    this.#view = view;
    const active = () => this.#view === view && this.element.open && view.current();
    const button = (label: string, action: () => void) => {
      const control = element('button', { type: 'button', className: 'kl-text-button', text: label });
      control.onclick = () => { if (control.isConnected && !control.disabled && active()) action(); };
      return control;
    };
    const close = button('Close', () => this.close(true));
    const dismiss = element('button', { type: 'button', className: 'kl-icon-button', ariaLabel: 'Close dialog' }, kikiIcon('close'));
    dismiss.onclick = () => this.close(true);
    const list = element('div', { className: 'kl-match-hidden-list' });
    const status = element('p', { className: 'kl-match-meta kl-match-hidden-status', role: 'status' });
    let working = false;
    let refreshQueued = false;
    const fail = (error: unknown, fallback: string, restoreFocus: boolean) => {
      list.replaceChildren();
      status.textContent = error instanceof Error ? error.message : fallback;
      const retry = button('Retry', () => void load());
      list.append(retry);
      if (restoreFocus) retry.focus({ preventScroll: true });
    };
    const load = async (previousIndex?: number) => {
      if (!active() || working) return;
      working = true;
      refreshQueued = false;
      const restoreFocus = list.contains(focusedElement(list) ?? null);
      if (restoreFocus) close.focus({ preventScroll: true });
      list.replaceChildren();
      status.textContent = 'Loading hidden suggestions…';
      try {
        const rows = await view.load(active);
        if (!active() || refreshQueued) return;
        status.textContent = rows.length ? '' : 'You have not hidden any suggestions.';
        const controls: HTMLButtonElement[] = [];
        for (const [index, row] of rows.entries()) {
          const restore = button('Restore', () => void (async () => {
            if (working) return;
            working = true;
            controls.forEach(control => { control.disabled = true; });
            if (list.contains(focusedElement(list) ?? null)) close.focus({ preventScroll: true });
            status.textContent = 'Restoring suggestion…';
            try {
              await row.restore();
            } catch (error) {
              if (active()) fail(error, 'The suggestion could not be restored.', focusedElement(list) === close);
              return;
            } finally {
              working = false;
            }
            if (active()) await load(index);
          })());
          controls.push(restore);
          const entry = element('div', { className: 'kl-match-hidden-row', role: 'group', ariaLabel: row.title },
            element('strong', { text: row.title, title: row.title }), restore);
          entry.dataset.suggestion = row.key;
          list.append(entry);
        }
        if ((restoreFocus || previousIndex !== undefined) && focusedElement(list) === close && controls.length)
          controls[Math.min(previousIndex ?? 0, controls.length - 1)]?.focus({ preventScroll: true });
      } catch (error) {
        if (active() && !refreshQueued) fail(error, 'Hidden suggestions could not load.', restoreFocus && focusedElement(list) === close);
      } finally {
        working = false;
        if (active() && refreshQueued) void load(previousIndex);
      }
    };
    this.#refresh = () => {
      if (!active()) return;
      if (working) {
        refreshQueued = true;
        if (list.contains(focusedElement(list) ?? null)) close.focus({ preventScroll: true });
        list.replaceChildren();
        return;
      }
      void load();
    };
    this.element.replaceChildren(
      element('header', { className: 'kl-match-dialog-header' }, element('div', {},
        element('span', { className: 'kl-match-dialog-eyebrow', text: 'KikiLink' }), element('h2', { text: title })), dismiss),
      element('div', { className: 'kl-match-dialog-body kl-match-hidden-body' },
        note('Only you can see your hidden suggestions. Restoring respects current sharing settings.'), list, status),
      element('footer', {}, close),
    );
    this.element.showModal();
    this.#releaseFit = fitPanelDialog(this.element);
    close.focus({ preventScroll: true });
    void load();
  }
}
