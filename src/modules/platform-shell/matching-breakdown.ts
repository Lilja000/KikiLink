import type { MatchCandidate } from '../../../cloud/shared/matching.mjs';
import { element } from '../../cloud/dom';

export function matchingBreakdown(factors: MatchCandidate['breakdown']): HTMLElement {
  return element('div', { className: 'kl-match-breakdown' }, ...factors.map(factor =>
    element('article', {},
      element('div', {}, element('strong', { text: factor.label }),
        element('span', { text: `${factor.points}/${factor.max} points · ${factor.available ? 'Available' : 'Not used or not shared'}` })),
      element('p', { className: 'kl-match-meta', text: factor.explanation }),
    ),
  ));
}
