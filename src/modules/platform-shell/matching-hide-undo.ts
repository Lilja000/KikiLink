import { element } from '../../cloud/dom';
import type { MatchingSource } from './matching-generation';
import type { MatchingPending } from './matching-recovery';

export const hideSuggestionLabel = 'Hide suggestion · ';
export const staleHideMessage = 'This suggestion changed after it was hidden. Refresh to see its current state.';

export interface ConfirmedHide {
  path: string;
  source: MatchingSource;
  revision: number;
  saved: boolean;
}

/** Called only after recovery has verified the operation and finished local cleanup. */
export function confirmedHide(pending: MatchingPending, pathPrefix: string): ConfirmedHide | undefined {
  if (pending.method !== 'PUT' || !pending.path.startsWith(pathPrefix) || !pending.label?.startsWith(hideSuggestionLabel) ||
      !pending.source || pending.body.hidden !== true || typeof pending.body.saved !== 'boolean' ||
      typeof pending.body.revision !== 'number') return;
  return {
    path: pending.path,
    source: pending.source,
    revision: pending.body.revision + 1,
    saved: pending.body.saved,
  };
}

export function matchesConfirmedHide(hide: ConfirmedHide, choice?: { revision: number; saved: boolean; hidden: boolean }): boolean {
  return choice?.hidden === true && choice.revision === hide.revision && choice.saved === hide.saved;
}

export function hiddenSuggestionNotice(undo: HTMLButtonElement): HTMLElement {
  return element('div', { className: 'kl-match-hide-notice' },
    element('span', { role: 'status', text: 'Suggestion hidden from your recommendations.' }), undo);
}
