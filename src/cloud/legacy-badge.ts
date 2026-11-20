import { element } from './dom';
import { kikiIcon } from '../modules/link-chat/icons';
import type { CloudProfile } from './types';

/** Static emblem from Prototype-17 v4. Never accepts user markup. */
function emblem(): SVGElement {
  const template = document.createElement('template');
  template.innerHTML = "<svg class=\"kl-legacy-badge-mark\" viewBox=\"0 0 32 32\" fill=\"none\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M16 2.5 26.5 8.6v12.1L16 27 5.5 20.7V8.6L16 2.5Z\" stroke=\"currentColor\" stroke-width=\"1.4\"/><path d=\"m11 25-1.5 4.5L16 27l6.5 2.5L21 25\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/><g fill=\"currentColor\"><circle cx=\"16\" cy=\"10.6\" r=\"3.2\"/><circle cx=\"11.7\" cy=\"13.8\" r=\"3.2\"/><circle cx=\"13.4\" cy=\"18.8\" r=\"3.2\"/><circle cx=\"18.6\" cy=\"18.8\" r=\"3.2\"/><circle cx=\"20.3\" cy=\"13.8\" r=\"3.2\"/></g><circle cx=\"16\" cy=\"15\" r=\"2.3\" fill=\"var(--kl-panel, #111113)\"/></svg>";
  return template.content.firstElementChild as SVGElement;
}
export function renderLegacyBadge(profile: CloudProfile | undefined, memberNumber: number): HTMLElement | undefined {
  if (profile?.memberNumber !== memberNumber || profile.legacyBadge !== true) return;
  return element('span', { className: 'kl-legacy-profile-badge', role: 'img', tabIndex: 0,
    title: 'KikiLink Legacy · With KikiLink since 1.x', ariaLabel: 'KikiLink Legacy · With KikiLink since 1.x' }, emblem());
}

/** Only the authenticated server response can enable the display preference. */
export class LegacyBadgeField {
  readonly input = element('input', { type: 'checkbox', ariaLabel: 'Show Legacy badge on my profile' });
  readonly help = element('small');
  readonly #state = element('div', { className: 'kl-legacy-badge-earned' }, this.help);
  readonly #toggle = element('label', { className: 'kl-unified-visibility kl-legacy-badge-toggle' }, this.input, 'Show on my profile');
  readonly element = element('section', { className: 'kl-legacy-badge-field' },
    element('div', { className: 'kl-legacy-badge-card' },
      element('span', { className: 'kl-legacy-badge-emblem', ariaHidden: 'true' }, emblem()),
      element('div', { className: 'kl-legacy-badge-copy' }, element('strong', { text: 'KikiLink Legacy' }),
        element('p', { text: 'For members who moved from KikiLink 1.x to 2.0.' }), this.#state)),
    this.#toggle);
  #eligible = false;
  #saved = false;
  constructor(readonly enabled: boolean) { this.hydrate(undefined); }
  hydrate(profile: CloudProfile | undefined): void {
    const supported = this.enabled && typeof profile?.legacyEligible === 'boolean';
    this.#eligible = supported && profile?.legacyEligible === true;
    this.#saved = this.#eligible && profile?.showLegacyBadge === true;
    this.input.checked = this.#saved; this.element.hidden = !supported;
    this.element.dataset.eligible = String(this.#eligible);
    this.#toggle.hidden = !this.#eligible;
    this.#state.replaceChildren(kikiIcon(this.#eligible ? 'check' : 'lock'), this.help);
    this.help.textContent = this.#eligible ? 'Earned'
      : profile?.legacyCohortReady ? 'This account has no confirmed Legacy badge.'
      : 'Legacy eligibility has not been confirmed yet.';
    this.lock(false);
  }
  lock(locked: boolean): void { this.input.disabled = locked || !this.#eligible; }
  capture(): { showLegacyBadge: boolean } | undefined {
    if (this.#eligible && this.input.checked !== this.#saved) return { showLegacyBadge: this.input.checked };
  }
}
