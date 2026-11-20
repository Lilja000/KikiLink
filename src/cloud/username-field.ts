import { element } from './dom';
import { CloudError } from './client';
import type { CloudProfile } from './types';

/** Inline profile field; the server owns uniqueness and rename permissions. */
export class UsernameField {
  readonly input = element('input', { className: 'kl-search', ariaLabel: 'KikiLink username', maxLength: 24 });
  readonly help = element('small', { className: 'kl-custom-field-help' });
  readonly #required = element('small', { className: 'kl-profile-field-required', text: '(required)' });
  readonly element = element('label', { className: 'kl-presence-field kl-username-field' },
    element('span', { className: 'kl-presence-field-label' }, 'Username ', this.#required), this.input, this.help);
  #saved: string | null = null;
  #revision = 0;
  #available = false;
  constructor(readonly enabled: boolean) {
    this.input.setAttribute('autocapitalize', 'none'); this.input.spellcheck = false;
    this.input.autocomplete = 'off';
    this.input.placeholder = 'Choose a username';
    this.help.id = 'kl-username-help'; this.input.setAttribute('aria-describedby', this.help.id);
    this.input.addEventListener('input', () => this.input.removeAttribute('aria-invalid'));
    this.hydrate(undefined);
  }
  hydrate(profile: CloudProfile | undefined): void {
    this.#available = this.enabled && Number.isSafeInteger(profile?.usernameRevision);
    this.#saved = profile?.username ?? null; this.#revision = profile?.usernameRevision ?? 0;
    this.input.value = this.#saved ?? ''; this.input.removeAttribute('aria-invalid');
    // A registered handle can be renamed but not removed. An older profile may still have no handle.
    this.input.required = this.#available && this.#saved !== null;
    this.#required.hidden = !this.input.required;
    this.element.hidden = !this.enabled;
    this.input.placeholder = this.#available ? 'Choose a username' : 'Unavailable';
    this.lock(false);
    const next = profile?.usernameChangeAllowedAt ?? 0;
    if (!this.#available) {
      this.help.textContent = profile ? 'Unavailable on this Cloud server.' : 'Requires a connected Cloud profile.';
      this.input.title = this.help.textContent;
    } else {
      this.help.textContent = next > Date.now()
        ? `You can change your username after ${new Date(next).toLocaleString()}.`
        : '3–24 letters, numbers or _.';
      this.input.title = 'Changes once per 24 hours. Previous names are held for 30 days.';
    }
  }
  lock(locked: boolean): void { this.input.disabled = locked || !this.#available; }
  capture(): { username: string; usernameRevision: number } | undefined {
    if (!this.#available) return;
    const value = this.input.value.trim();
    if (!value && !this.#saved) return;
    if (!/^[A-Za-z0-9_]{3,24}$/.test(value)) {
      this.input.setAttribute('aria-invalid', 'true'); throw new CloudError('invalid_username');
    }
    const username = value.toLowerCase();
    return username === this.#saved ? undefined : { username, usernameRevision: this.#revision };
  }
}
