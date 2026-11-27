import { isTemporaryCloudReadError, type CloudClient } from '../../cloud/client';
import type { BCAdapter } from '../../bc/adapter';
import type { SharedRoom } from '../../cloud/presence';
import { element } from '../../cloud/dom';
import {ownerSettingsSource, ownerSettingsPath, ownerSettingsRead} from '../../cloud/owner-settings-generation';
import { kikiIcon } from '../link-chat/icons';

/** Only the owner's observable public room; never a friend's native location. */
export function sharedCurrentRoom(adapter: Pick<BCAdapter, 'getRoomAdminSnapshot' | 'getCurrentRoomName'>): SharedRoom | null {
  try {
    const snapshot = adapter.getRoomAdminSnapshot();
    if (!snapshot || !snapshot.settings.visibility.includes('All') || snapshot.roomName !== adapter.getCurrentRoomName()) return null;
    const name = snapshot.roomName.trim(), space = snapshot.settings.space;
    if (!name || name.length > 100 || typeof space !== 'string' || space.length > 20 || /[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(name + space)) return null;
    return { name, space };
  } catch { return null; }
}

interface Value { memberNumber: number; room: SharedRoom | null; expiresInMs: number; }
/** A visible profile has an in-memory, expiring room, never a persistent profile field. */
export class ProfileLocation {
  readonly element = element('div', { className: 'kl-addon-profile-fact kl-profile-location', hidden: true });
  readonly #value = element('strong');
  readonly #refresh = element('button', { type: 'button', className: 'kl-icon-button kl-profile-location-refresh', ariaLabel: 'Refresh room', title: 'Refresh room' }, kikiIcon('refresh'));
  readonly #unsubscribe: () => void;
  readonly #poll: ReturnType<typeof setInterval>;
  #expiry: ReturnType<typeof setTimeout> | undefined;
  #release: (() => void) | undefined;
  #visible = false;
  #member = 0;
  #token = 0;
  #queued = false;
  #reading = false;
  #again = false;
  #confirmedUntil = 0;
  constructor(readonly client: CloudClient, readonly current: () => boolean) {
    this.#refresh.onclick = () => void this.refresh();
    this.#unsubscribe = client.subscribe((kind, cause) => {
      if (!current() || kind === 'session' || kind === 'connection' && !client.connected) { this.setVisible(false); return; }
      if (!this.#visible || !['connection','profile-location','privacy','profiles-cleared','profile-discovery','ready'].includes(kind)) return;
      const accessChanged = kind === 'privacy' || kind === 'profile-discovery' || kind === 'profiles-cleared' && cause !== 'ready';
      if (accessChanged) {
        this.#token++;
        this.#reading = false;
        this.#again = false;
        clearTimeout(this.#expiry);
        this.#confirmedUntil = 0;
        this.#render('Checking…');
      }
      if (this.#queued) return;
      this.#queued = true;
      queueMicrotask(() => {
        this.#queued = false;
        if (this.#visible) void this.refresh(true);
      });
    });
    this.#poll = setInterval(() => { if (this.#visible && !this.#reading) void this.refresh(true); }, 60000);
  }
  #active(): boolean { return this.#visible && this.current() && this.client.connected; }
  open(member: number): void {
    if (!this.current()) { this.setVisible(false); return; }
    if (this.#visible && this.#member === member) return;
    this.setVisible(false); this.#member = member; this.#visible = true; this.element.hidden = false;
    this.element.replaceChildren(kikiIcon('door'), element('span', { text: 'Current room', title: 'Shared Cloud room' }), this.#value, this.#refresh);
    this.#render('Checking…');
    this.#release = this.client.retainEvents(); void this.refresh();
  }
  setVisible(_visible: false): void {
    this.#token++; this.#visible = false; this.#reading = false; this.#again = false; this.#confirmedUntil = 0; this.#render(''); clearTimeout(this.#expiry); this.element.replaceChildren(); this.element.hidden = true;
    this.#release?.(); this.#release = undefined;
  }
  destroy(): void { this.setVisible(false); clearInterval(this.#poll); this.#unsubscribe(); }
  #render(text: string): void {
    if (this.#value.textContent !== text) {
      this.#value.textContent = text;
      this.#value.title = text;
    }
  }
  async refresh(background = false): Promise<void> {
    if (!this.#active()) { this.setVisible(false); return; }
    if (this.#reading) { this.#again = true; return; }
    this.#reading = true;
    const token = ++this.#token, member = this.#member, owner = this.client.memberNumber, origin = this.client.origin;
    const valid = () => token === this.#token && this.#active() && owner === this.client.memberNumber && origin === this.client.origin;
    try {
      const me = await this.client.request<{ memberNumber: number; features?: { profileLocation?: boolean } }>('GET', '/v1/me');
      if (!valid()) return;
      if (me.memberNumber !== owner) throw new Error('Account changed');
      if (me.features?.profileLocation !== true) { clearTimeout(this.#expiry); this.#confirmedUntil = 0; this.#render('Unavailable on this server'); return; }
      const started = Date.now();
      const source = ownerSettingsSource(me);
      const value = ownerSettingsRead(await this.client.request('GET', ownerSettingsPath(`/v1/profiles/${member}/location`, source)), source) as Value;
      if (!valid()) return;
      if (!value || value.memberNumber !== member || !Number.isSafeInteger(value.expiresInMs) || value.expiresInMs < 0 || value.expiresInMs > 180000 ||
        value.room !== null && (!value.room || typeof value.room.name !== 'string' || !value.room.name.trim() || value.room.name.length > 100 || typeof value.room.space !== 'string' || value.room.space.length > 20) ||
        value.room === null && value.expiresInMs !== 0) throw new Error('Invalid location');
      const remaining = value.expiresInMs - (Date.now() - started);
      clearTimeout(this.#expiry);
      this.#confirmedUntil = Date.now() + (value.room ? Math.max(remaining, 0) : 60000);
      this.#render(value.room && remaining > 0 ? value.room.name : 'Not shared or offline');
      if (value.room && remaining > 0) this.#expiry = setTimeout(() => this.#render('Not shared or offline'), remaining);
    } catch (error) {
      if (valid() && !(background && isTemporaryCloudReadError(error) && Date.now() < this.#confirmedUntil)) {
        this.#confirmedUntil = 0;
        clearTimeout(this.#expiry);
        this.#render('Unavailable · Refresh to retry');
      }
    } finally {
      if (valid()) {
        this.#reading = false;
        if (this.#again) { this.#again = false; void this.refresh(true); }
      }
    }
  }
}
