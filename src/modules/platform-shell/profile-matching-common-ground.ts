import type { MatchCandidate } from '../../../cloud/shared/matching.mjs';
import type { CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import type { KeyValueStorage } from '../../core/settings';
import { matchingReadAt } from './matching-generation';
import { checkedMatchCandidate } from './matching-model';
import { MatchingRecovery } from './matching-recovery';

interface Options {
  current(member: number): boolean;
  why(member: number): void;
  connect(member: number): void;
}

export class ProfileMatchingCommonGround {
  readonly element = element('section', { className: 'kl-profile-matching-common-ground', hidden: true });
  readonly #recovery: MatchingRecovery;
  readonly #unsubscribe: () => void;
  #release: (() => void) | undefined;
  #expiryTimer: ReturnType<typeof setTimeout> | undefined;
  #member = 0;
  #token = 0;
  #queued = false;

  constructor(readonly client: CloudClient, storage: KeyValueStorage, readonly options: Options) {
    this.#recovery = new MatchingRecovery(client, storage, () => this.#current(this.#member));
    this.#unsubscribe = client.subscribe(kind => {
      if (!this.#member) return;
      if (kind === 'session' || !this.#sameAccount()) {
        this.setVisible(false);
        return;
      }
      if (['matching', 'connection', 'ready', 'privacy', 'profiles-cleared', 'relationships',
        'profile-discovery', 'profile-friends', 'profile-communities', 'communities', 'preferences',
        `profile:${this.#member}`, `profile:${this.#recovery.owner}`].includes(kind)) this.#reload();
    });
  }

  open(member: number): void {
    if (!Number.isSafeInteger(member) || member <= 0 || member === this.#recovery.owner ||
      !this.#sameAccount() || !this.options.current(member)) {
      this.setVisible(false);
      return;
    }
    if (member === this.#member) return;
    this.setVisible(false);
    this.#member = member;
    this.#release = this.client.retainEvents();
    this.#reload();
  }

  setVisible(_visible: false): void {
    this.#member = 0;
    this.#clear();
    this.#release?.();
    this.#release = undefined;
  }

  destroy(): void {
    this.setVisible(false);
    this.#unsubscribe();
  }

  #sameAccount(): boolean {
    return this.client.memberNumber === this.#recovery.owner && this.client.origin === this.#recovery.origin;
  }

  #current(member: number): boolean {
    return member > 0 && member === this.#member && this.#sameAccount() &&
      this.client.connected && this.options.current(member);
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
    const member = this.#member;
    const token = this.#token;
    const valid = () => token === this.#token && this.#current(member);
    if (!valid()) return;
    try {
      const { source, activeRequests } = await this.#recovery.peopleCapabilities(valid);
      if (!valid()) return;
      const query = new URLSearchParams({ priority: 'balanced' });
      if (activeRequests) query.set('includeConnection', '1');
      const candidate = checkedMatchCandidate(
        await matchingReadAt(this.client, source)(`/v1/matching/people/${member}?${query}`),
        this.#recovery.owner,
      );
      if (!valid() || candidate.memberNumber !== member || candidate.hidden) return;
      const now = Date.now();
      if (candidate.expiresAt !== null && candidate.expiresAt <= now) return;
      this.#render(candidate, activeRequests, valid);
    } catch {
      // Matching availability and projected reasons are optional on a profile.
    }
  }

  #render(candidate: MatchCandidate, activeRequests: boolean, valid: () => boolean): void {
    const member = candidate.memberNumber;
    const now = Date.now();
    const connection = activeRequests && (candidate.activeConnection?.state === 'Accepted' ||
      candidate.activeConnection?.state === 'Pending' && candidate.activeConnection.expiresAt > now)
      ? candidate.activeConnection : undefined;
    const label = connection?.state === 'Accepted' ? 'Connection' :
      connection?.state === 'Pending' ? 'Request pending' :
        candidate.canRequest ? 'Request connection' : candidate.status === 'dnd' ? 'Do not disturb' : 'Unavailable';
    const why = element('button', { type: 'button', className: 'kl-text-button', text: 'Why this match?' });
    const connect = element('button', {
      type: 'button',
      className: !connection && candidate.canRequest ? 'kl-text-button kl-text-button--primary' : 'kl-text-button',
      text: label,
    });
    connect.disabled = !connection && !candidate.canRequest;
    if (connect.disabled) connect.title = 'This person is currently unavailable for new requests.';
    const deadline = Math.min(candidate.expiresAt ?? Infinity, connection?.expiresAt ?? Infinity);
    const canOpen = (button: HTMLButtonElement) => valid() && Date.now() < deadline &&
      button.isConnected && this.element.contains(button) && !button.disabled;
    why.onclick = () => { if (canOpen(why)) this.options.why(member); };
    connect.onclick = () => { if (canOpen(connect)) this.options.connect(member); };
    const reasons = candidate.reasons.slice(0, 2);
    this.element.replaceChildren(
      element('header', { className: 'kl-profile-section-heading' }, element('h3', { text: 'A little common ground' })),
      ...(reasons.length ? [element('ul', { className: 'kl-match-reasons' },
        ...reasons.map(text => element('li', { text })))] : []),
      element('div', { className: 'kl-profile-matching-actions' }, why, connect),
    );
    this.element.hidden = false;
    if (Number.isFinite(deadline)) {
      const delay = Math.min(2_147_483_647, Math.max(1, deadline - now));
      this.#expiryTimer = setTimeout(() => { if (valid()) this.#reload(); }, delay);
    }
  }
}
