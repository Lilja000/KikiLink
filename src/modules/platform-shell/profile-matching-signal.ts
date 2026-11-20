import type { MatchOwn } from '../../../cloud/shared/matching.mjs';
import type { CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import type { KeyValueStorage } from '../../core/settings';
import { matchSignalStatus } from './matching-browse-controls';
import { matchingReadAt } from './matching-generation';
import { checkedMatchOwn } from './matching-model';
import { MatchingRecovery } from './matching-recovery';

const statusText: Record<ReturnType<typeof matchSignalStatus>, string> = {
  Available: 'Available for connection requests.',
  Paused: 'Paused. You can browse privately and set up your signal when you want.',
  Expired: 'Expired. You can browse privately and set up your signal again.',
};

export class ProfileMatchingSignal {
  readonly element = element('section', { className: 'kl-profile-matching-signal', hidden: true });
  readonly #recovery: MatchingRecovery;
  readonly #unsubscribe: () => void;
  #release: (() => void) | undefined;
  #expiryTimer: ReturnType<typeof setTimeout> | undefined;
  #visible = false;
  #token = 0;
  #queued = false;

  constructor(
    readonly client: CloudClient,
    storage: KeyValueStorage,
    readonly options: { current(): boolean; edit(): void },
  ) {
    this.#recovery = new MatchingRecovery(client, storage, options.current);
    this.#unsubscribe = client.subscribe(kind => {
      if (!this.#visible) return;
      if (!this.#current()) {
        this.setVisible(false);
        return;
      }
      if (['matching', 'session', 'connection', 'ready', 'profile-discovery', 'privacy',
        'profiles-cleared', `profile:${this.#recovery.owner}`].includes(kind)) this.#reload();
    });
  }

  setVisible(visible: boolean): void {
    const active = visible && this.#current();
    if (active === this.#visible) return;
    this.#visible = active;
    if (active) {
      this.#release = this.client.retainEvents();
      this.#reload();
    } else {
      this.#clear();
      this.#release?.();
      this.#release = undefined;
    }
  }

  destroy(): void {
    this.setVisible(false);
    this.#unsubscribe();
  }

  #current(): boolean {
    return this.options.current() && this.client.memberNumber === this.#recovery.owner &&
      this.client.origin === this.#recovery.origin;
  }

  #clear(): void {
    this.#token++;
    clearTimeout(this.#expiryTimer);
    this.#expiryTimer = undefined;
    this.element.hidden = true;
    this.element.replaceChildren();
  }

  #reload(): void {
    this.#clear();
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      void this.#load();
    });
  }

  async #load(): Promise<void> {
    const token = this.#token;
    const valid = () => this.#visible && this.#current() && token === this.#token && this.client.connected;
    if (!valid()) return;
    try {
      const source = await this.#recovery.gate(valid);
      if (!valid()) return;
      const own = checkedMatchOwn(await matchingReadAt(this.client, source)('/v1/matching/me'), this.#recovery.owner);
      if (valid()) this.#render(own, valid);
    } catch {
      // Only a verified signal belongs on the profile.
    }
  }

  #render(own: MatchOwn, valid: () => boolean): void {
    const edit = element('button', { type: 'button', className: 'kl-text-button', text: 'My signal' });
    edit.onclick = () => {
      if (valid() && edit.isConnected && this.element.contains(edit)) this.options.edit();
    };
    const status = element('p', { className: 'kl-profile-section-note' });
    const observedAt = Date.now();
    const updateStatus = () => {
      if (!valid()) return;
      const current = matchSignalStatus(own, observedAt);
      status.textContent = statusText[current];
      const expiry = own.signal.expiresAt;
      if (own.signal.published && current !== 'Expired' && expiry !== null) {
        const remaining = expiry - own.serverNow - (Date.now() - observedAt);
        this.#expiryTimer = setTimeout(updateStatus, Math.min(2_147_483_647, Math.max(1, remaining)));
      }
    };
    updateStatus();
    this.element.replaceChildren(
      element('header', { className: 'kl-profile-section-heading' }, element('h3', { text: 'Your matching signal' }), edit),
      status,
    );
    this.element.hidden = false;
  }
}
