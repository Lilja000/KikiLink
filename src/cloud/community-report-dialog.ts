import {ModerationGeneration} from './moderation-generation';
import {captureReportSource,type ReportSource} from './report-source';
import { CloudError, type CloudClient } from './client';
import { element } from './dom';
import { moderationDialog } from './moderation-dialog';
import { reportForm } from './report-form';

interface Community { id: string; name: string; archived?: boolean }

/** The directory only supplies visible targets; reportForm owns the existing idempotent writer. */
export class CommunityReportDialog {
  readonly element: HTMLDialogElement;
  readonly #member: number | undefined;
  readonly #select = element('select', { ariaLabel: 'Community to report' });
  readonly #search = element('input', { type: 'search', ariaLabel: 'Find a community', placeholder: 'Find a community…', maxLength: 80 });
  readonly #status = element('p', { role: 'status', className: 'kl-mod-note' });
  readonly #paging = element('div', { className: 'kl-mod-actions' });
  readonly #discard = element('section', { className: 'kl-mod-notice', hidden: true });
  readonly #form: HTMLElement;
  readonly #find: HTMLButtonElement;
  #source:ReportSource|undefined;
  readonly #management:ModerationGeneration;
  #disposed = false;
  #epoch = 0;
  #loading = true;
  #supported = false;
  #query = '';
  #next: string | null = null;
  #selected: Community | undefined;
  #choices: Community[] = [];
  #state = { busy: false, pending: false, dirty: false };

  constructor(readonly client: CloudClient, readonly options: { current(): boolean; done(id?: number): void }) {
    this.#member = client.memberNumber;
    this.#management=new ModerationGeneration(client,'communityManagementRecoveryGeneration');
    const body = element('div', { className: 'kl-mod-dialog-body kl-community-report-body' });
    const footer = element('footer', { className: 'kl-mod-dialog-footer' });
    this.#find = this.#button('Find', () => { this.#query = this.#search.value.trim(); void this.#load(); });
    this.#search.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); this.#find.click(); } });
    this.#select.addEventListener('change', () => {
      if (!this.#current() || this.#locked()) return;
      this.#selected = this.#choices.find(c => c.id === this.#select.value) ?? (this.#selected?.id === this.#select.value ? this.#selected : undefined);
    });
    this.#form = reportForm(client, 'community', '', true, id => this.#finish(id), () => this.#cancel(), '/v1/reports', {
      source:()=>this.#source, compact: true, current: () => this.#current(), target: () => this.#supported && !this.#loading ? this.#selected?.id : undefined,
      unavailable: () => {
        const id = this.#selected?.id;
        this.#selected = undefined; this.#choices = this.#choices.filter(c => c.id !== id);
        for (const option of this.#select.options) if (option.value === id) option.remove();
        this.#select.value = '';
      },
      state: state => { this.#state = state; this.#sync(); },
    });
    footer.append(this.#form.querySelector('.kl-cloud-actions')!);
    this.#discard.append(element('p', { text: 'Discard this report draft?' }),
      this.#button('Keep editing', () => { this.#discard.hidden = true; this.#form.querySelector<HTMLElement>('textarea')?.focus(); }),
      this.#button('Discard report', () => this.#finish()));
    body.append(element('label', { className: 'kl-report-community-field' }, 'Community', this.#select),
      element('div', { className: 'kl-mod-toolbar kl-mod-target-search' }, this.#search, this.#find), this.#status, this.#paging, this.#form,
      element('p', { className: 'kl-mod-note', text: 'Platform moderators receive your report and the community details visible to you. Private channels and conversations are not included.' }), this.#discard);
    this.element = moderationDialog('Report a community', body, footer, () => this.#cancel());
    this.element.classList.add('kl-mod-report-dialog');
    this.#sync();
    queueMicrotask(() => { if (this.#current()) void this.#load(); });
  }
  #current(): boolean { return !this.#disposed && this.element.isConnected && this.client.connected && this.client.memberNumber === this.#member && this.options.current(); }
  #locked(): boolean { return this.#loading || this.#state.busy || this.#state.pending; }
  #button(label: string, action: () => void): HTMLButtonElement {
    const button = element('button', { type: 'button', className: 'kl-text-button', text: label });
    button.addEventListener('click', () => { if (this.#current() && !button.disabled) action(); }); return button;
  }
  #sync(): void {
    this.#select.disabled = this.#search.disabled = this.#find.disabled = this.#locked();
    for (const b of this.#paging.querySelectorAll<HTMLButtonElement>('button')) b.disabled = this.#locked();
    for (const b of this.#discard.querySelectorAll<HTMLButtonElement>('button')) b.disabled = this.#state.busy;
    this.element?.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')?.toggleAttribute('disabled', this.#state.busy);
  }
  async #load(cursor?: string): Promise<void> {
    if (!this.#current() || this.#state.busy || this.#state.pending) return;
    const epoch = ++this.#epoch;
    this.#loading = true; this.#status.textContent = 'Loading communities…'; this.#sync();
    try {
      const me = await this.client.request<{ features?: { communityDirectory?: boolean; communities?: boolean; reportReasons?: boolean } }>('GET', '/v1/me');
      if (!this.#current() || epoch !== this.#epoch) return;
      this.#supported = !!(me.features?.communityDirectory && me.features.communities && me.features.reportReasons);
      if (!this.#supported) throw new CloudError('community_reporting_unavailable', 409);
      if(this.#management.accept(me)){this.#selected=undefined;cursor=undefined;}
      const access=this.#management.capture();
      const source=captureReportSource(this.client,me,()=>this.#current());
      if(this.#source&&this.#source.generation!==source.generation){this.#selected=undefined;cursor=undefined;}
      const query = new URLSearchParams({ scope: 'all', q: this.#query, limit: '40', sort: 'recommended' });
      if (cursor) query.set('cursor', cursor);
      const page = await access.request<{ items: Community[]; nextCursor: string | null }>('GET', `/v1/community-directory?${query}`);
      if (!this.#current() || epoch !== this.#epoch) return;
      this.#source=source;
      this.#choices = page.items.filter(c => !c.archived); this.#next = page.nextCursor;
      const choices = this.#selected && !this.#choices.some(c => c.id === this.#selected!.id) ? [this.#selected, ...this.#choices] : this.#choices;
      this.#select.replaceChildren(element('option', { value: '', text: 'Choose a community' }), ...choices.map(c => element('option', { value: c.id, text: c.name })));
      this.#select.value = this.#selected?.id ?? '';
      this.#status.textContent = this.#choices.length ? '' : this.#next ? 'No matches in this batch. Continue to search older communities.' : 'No communities found. Try another search.';
      this.#paging.replaceChildren();
      if (this.#next) this.#paging.append(this.#button('More communities', () => void this.#load(this.#next!)));
      if (cursor) this.#paging.append(this.#button('First communities', () => void this.#load()));
    } catch (error) {
      if (!this.#current() || epoch !== this.#epoch) return;
      this.#selected = undefined; this.#choices = []; this.#select.replaceChildren(); this.#paging.replaceChildren();
      this.#status.textContent = error instanceof CloudError && error.code === 'community_reporting_unavailable'
        ? 'Community reporting is unavailable on this connection.' : 'Communities could not load. Your reason and comment are kept.';
      this.#paging.append(this.#button('Retry communities', () => void this.#load()));
    } finally { if (this.#current() && epoch === this.#epoch) { this.#loading = false; this.#sync(); } }
  }
  #cancel(): void {
    if (!this.#current() || this.#state.busy) return;
    if (this.#state.dirty || this.#selected) {
      this.#discard.querySelector('p')!.textContent = this.#state.pending ? 'Your report may already have been received. Close this draft without retrying?' : 'Discard this report draft?';
      this.#discard.hidden = false; this.#discard.querySelector('button')?.focus();
    } else this.#finish();
  }
  #finish(id?: number): void { if (!this.#current()) return; this.destroy(); this.options.done(id); }
  destroy(): void { this.#disposed = true; ++this.#epoch; if (this.element.open) this.element.close(); this.element.remove(); }
}
