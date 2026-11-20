import {reviewOwnerSettings, OwnerSettingsGenerationError, type OwnerSettingsSource} from '../../cloud/owner-settings-generation';
import type { CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { ContentDialog } from '../link-chat/content-dialog';
import { checkedDirectRetention, DIRECT_RETENTION_DAYS, directRetentionDays, type DirectRetention } from '../../../cloud/shared/direct-retention.mjs';
import { DirectRetentionRecovery, type DirectRetentionLock, type DirectRetentionPending } from './direct-retention-recovery';
import type { AccountActivity } from './account-activity';

type Client = Pick<CloudClient, 'memberNumber' | 'origin' | 'connected' | 'request' | 'subscribe'>;
const labels = { 30: '30 days', 90: '90 days', 365: '1 year' };

/** Account policy for new messages only. Reads/reconnects never replay a write. */
export class DirectRetentionPanel {
  readonly element = element('section', { className: 'kl-account-section' });
  readonly #dialog = new ContentDialog();
  readonly #recovery: DirectRetentionRecovery | undefined;
  readonly #unsubscribe: () => void;
  readonly #origin: string;
  #source: OwnerSettingsSource | undefined;
  #visible = false;
  #enabled = false;
  #generation = 0;
  #busy = false;
  #value: DirectRetention | undefined;
  #pending: DirectRetentionPending | null = null;
  #error = '';
  #message = '';
  #draft: { days: 30 | 90 | 365; revision: number; source?: OwnerSettingsSource } | undefined;
  constructor(readonly client: Client, readonly activity: AccountActivity, lock?: DirectRetentionLock) {
    this.#origin = client.origin;
    this.#recovery = activity.storage ? new DirectRetentionRecovery(client, activity.storage, () => this.client.memberNumber === this.activity.owner && this.client.origin === this.#origin, lock) : undefined;
    this.#unsubscribe = client.subscribe(kind => {
      if (kind === 'session' || kind === 'connection') { this.#draft = undefined; this.hide(); }
      else if (['ready','direct-retention'].includes(kind) && this.#active() && !this.#busy && !this.#dialog.element.open) void this.refresh();
    });
  }
  #active(): boolean { return this.#visible && this.client.memberNumber === this.activity.owner && this.client.origin === this.#origin; }
  #note(text: string): HTMLElement { return element('p', { className: 'kl-setting-help', text }); }
  #button(text: string, action: () => void): HTMLButtonElement {
    const b = element('button', { type: 'button', className: 'kl-text-button', text });
    b.disabled = this.#busy; b.addEventListener('click', () => { if (this.#active() && !this.#busy && this.element.isConnected && this.element.contains(b)) action(); }); return b;
  }
  show(enabled: boolean): void {
    if (this.#visible && this.#enabled === enabled) return;
    this.hide(); this.#visible = true; this.#enabled = enabled; void this.refresh();
  }
  hide(): void {
    this.#visible = false; this.#generation++; this.#busy = false; this.#value = undefined; this.#source = undefined; this.#pending = null;
    this.#error = ''; this.#message = ''; this.#dialog.close(); this.element.replaceChildren();
  }
  destroy(): void { this.hide(); this.#draft = undefined; this.#unsubscribe(); this.#dialog.destroy(); }
  #readPending(): void {
    this.#error = ''; this.#pending = null;
    if (!this.#recovery) { this.#error = 'Device storage is unavailable. Direct history settings cannot be saved safely.'; return; }
    try { this.#pending = this.#recovery.read(); }
    catch (error) { this.#error = error instanceof Error ? error.message : 'The saved request could not be read.'; }
  }
  async refresh(): Promise<void> {
    if (!this.#active() || this.#busy) return;
    const generation = ++this.#generation;
    this.#readPending(); this.#value = undefined;
    if (!this.#enabled) { this.#render(); return; }
    this.#busy = true; this.#message = 'Loading Direct history setting…'; this.#render();
    try {
      const review = await reviewOwnerSettings(this.client, '/v1/direct/retention', () => this.#active() && generation === this.#generation);
      const value = checkedDirectRetention(review.value, this.activity.owner);
      if (!this.#active() || generation !== this.#generation) return;
      this.#value = value; this.#source = review.source; this.#message = '';
    } catch {
      if (this.#active() && generation === this.#generation) this.#message = 'Direct history setting could not load. Retry when connected.';
    } finally {
      if (this.#active() && generation === this.#generation) { this.#busy = false; this.#render(); }
    }
  }
  #render(): void {
    if (!this.#active()) return;
    this.element.replaceChildren(element('h3', { text: 'Direct history' }));
    this.element.append(this.#note('Choose how long new Cloud Direct messages may stay on the server. Both people choose; the shorter period applies.'));
    if (!this.#enabled) this.element.append(this.#note('This Cloud server does not support extended Direct history yet.'));
    if (this.#value) this.element.append(element('div', { className: 'kl-account-row' },
      element('strong', { text: 'Your maximum' }), element('span', { text: labels[this.#value.days] })));
    this.element.append(this.#note('Existing messages keep their original expiry. This does not recover expired messages or change copies already saved on a device.'));
    if (this.#error) this.element.append(element('p', { className: 'kl-setting-help', role: 'alert', text: this.#error }));
    if (this.#message) this.element.append(element('p', { className: 'kl-setting-help', role: 'status', text: this.#message }));
    if (this.#pending) {
      const pending = this.#pending;
      this.element.append(this.#note(`Saved request: ${labels[pending.body.days]}. ${pending.confirmed ? 'Cloud confirmed it; finish device cleanup.' : 'Its result may be unknown. Retry uses the same request.'}`));
      this.element.append(this.#button(pending.confirmed ? 'Finish history request' : 'Retry history request', () => void this.#submit(pending)));
      if (!pending.confirmed) this.element.append(this.#button('Forget history request…', () => {
        this.#dialog.show('Forget saved history request?', element('div', {}, this.#note('This removes only the saved request on this device. A setting already saved in Cloud will stay there.'),
          this.#button('Cancel', () => this.#dialog.close()), this.#button('Forget saved request', () => void this.#forget(pending))));
      }));
    } else if (this.#value && this.#enabled && !this.#error) {
      this.element.append(this.#button(this.#draft ? 'Resume history choice' : 'Edit Direct history', () => this.#edit()));
    }
    this.element.append(this.#button('Reload Direct history', () => { this.#dialog.close(); void this.refresh(); }), this.#dialog.element);
  }
  #edit(): void {
    if (!this.#value || this.#pending || !this.#enabled) return;
    this.#draft ??= { days: this.#value.days, revision: this.#value.revision, ...(this.#source ? {source: this.#source} : {}) };
    const draft = this.#draft;
    const select = element('select', { className: 'kl-select', ariaLabel: 'Direct history maximum' });
    for (const days of DIRECT_RETENTION_DAYS) select.append(element('option', { value: String(days), text: labels[days] }));
    select.value = String(draft.days);
    const current = this.#value;
    const save = this.#button('Save Direct history', () => {
      if (!this.#recovery || !this.#draft || !directRetentionDays(Number(select.value))) return;
      const pending: DirectRetentionPending = { format: draft.source?.generation || draft.source?.required ? 2 : 1, ...(draft.source?.generation || draft.source?.required ? {source: draft.source} : {}), method: 'PUT', path: '/v1/direct/retention',
        body: { operationId: crypto.randomUUID(), revision: draft.revision, days: draft.days }, createdAt: Date.now(), confirmed: false };
      void this.#submit(pending, true);
    });
    save.disabled = draft.days === current.days;
    select.addEventListener('change', () => {
      const days = Number(select.value); if (directRetentionDays(days)) draft.days = days;
      save.disabled = this.#busy || draft.days === current.days;
    });
    this.#dialog.show('Cloud Direct history', element('div', {}, element('label', {}, 'Keep new messages for up to ', select),
      this.#note('The shorter choice wins. If you choose 1 year and the other person keeps 30 days, new messages still expire after 30 days. Images and audio expire with their message.'),
      this.#note('Your choice applies to future messages across your Cloud devices. Earlier messages keep their original deadline.'),
      element('div', { className: 'kl-setting-tool-buttons' }, this.#button('Close history choice', () => this.#dialog.close()),
        this.#button('Discard history choice', () => {
          this.#dialog.show('Discard history choice?', element('div', {}, this.#note('Discard this unsaved choice? Cloud is unchanged.'),
            this.#button('Keep editing', () => this.#edit()), this.#button('Discard choice', () => { this.#draft = undefined; this.#dialog.close(); this.#render(); })));
        }), save)), () => { if (this.#active() && !this.#busy) this.#render(); });
  }
  async #submit(pending: DirectRetentionPending, prepare = false): Promise<void> {
    if (!this.#recovery || !this.#active() || this.#busy) return;
    const generation = ++this.#generation, valid = () => this.#active() && generation === this.#generation;
    let confirmed = false;
    this.#busy = true; this.#dialog.close(); this.#message = 'Saving Direct history setting…'; this.#render();
    try {
      if (prepare) await this.#recovery.prepare(pending, valid);
      await this.#recovery.run(pending, valid);
      if (!valid()) return;
      confirmed = true;
      this.#draft = undefined; this.activity.record('direct_retention_saved');
      if (pending.confirmed) {
        this.#value = undefined; this.#source = undefined;
        this.#message = 'Your request was confirmed. Device cleanup finished. Reload Direct history when connected to review the current setting.';
        return;
      }
      const review = await reviewOwnerSettings(this.client, '/v1/direct/retention', valid);
      const value = checkedDirectRetention(review.value, this.activity.owner);
      if (!valid()) return;
      this.#value = value; this.#source = review.source;
      this.#message = this.#value.days === pending.body.days ? 'Direct history setting saved.' : 'Request confirmed. Cloud now has a newer history choice.';
    } catch (error) {
      if (!valid()) return;
      this.#value = undefined;
      this.#message = confirmed ? 'Your request was confirmed, but the current setting could not reload. Reload Direct history to check it.' : error instanceof OwnerSettingsGenerationError ? error.message : (error as { status?: number })?.status === 409
        ? 'Cloud has a different revision. Review the current setting before forgetting the pending request and choosing again.'
        : `Save was not confirmed. ${error instanceof Error ? error.message : 'Review the saved request.'}`;
    } finally {
      if (valid()) { this.#busy = false; this.#readPending(); this.#render(); }
    }
  }
  async #forget(pending: DirectRetentionPending): Promise<void> {
    if (!this.#recovery || this.#busy) return;
    const generation = ++this.#generation;
    this.#busy = true; this.#dialog.close(); this.#render();
    try { await this.#recovery.forget(pending, () => this.#active() && generation === this.#generation); this.#draft = undefined; }
    catch (error) { if (generation === this.#generation) this.#message = error instanceof Error ? error.message : 'Request could not be removed.'; }
    finally {
      if (this.#active() && generation === this.#generation) { this.#busy = false; await this.refresh(); }
    }
  }
}
