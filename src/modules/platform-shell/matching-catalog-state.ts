import { CloudError } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { kikiIcon } from '../link-chat/icons';
import { MatchingGenerationError } from './matching-generation';

export function matchingCatalogReadFailed(error: unknown): boolean {
  return !(error instanceof MatchingGenerationError ||
    error instanceof CloudError && [401, 403, 429].includes(error.status));
}

export function matchingCatalogLoading(): HTMLElement {
  const cards = Array.from({ length: 4 }, () => element('div', {
    className: 'kl-match-skeleton-card', ariaHidden: 'true',
  }, element('div', { className: 'kl-match-skeleton' }),
  element('div', { className: 'kl-match-skeleton kl-match-skeleton--short' }),
  element('div', { className: 'kl-match-skeleton' })));
  const grid = element('div', {
    className: 'kl-match-grid kl-match-catalog-loading', role: 'status', ariaLabel: 'Loading matches',
  }, ...cards);
  grid.setAttribute('aria-busy', 'true');
  return grid;
}

export function matchingCatalogError(retry: () => void): HTMLElement {
  const button = element('button', { type: 'button', className: 'kl-text-button kl-text-button--primary', text: 'Retry' });
  button.addEventListener('click', retry);
  return element('section', { className: 'kl-match-catalog-error kl-explore-empty', role: 'alert' },
    kikiIcon('heart'), element('h2', { text: 'Matches couldn’t load' }),
    element('p', { text: 'Your signal and requests are unchanged.' }), button);
}
