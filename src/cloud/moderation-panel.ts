import { pageAction } from '../modules/platform-shell/page-action';
import { ModerationGeneration, ModerationGenerationError, moderationGenerationConflict, type ModerationAccess } from './moderation-generation';
import { decisionControls, decisionHistory, newDecisionDraft, type DecisionReview, type DecisionEntry } from './report-decisions';
import { CloudError, type CloudClient } from './client';
import { assignedLabel, reportStatus, triageControls, triageFilterOptions, type TriageReport, type TriageChange, type TriageRequest } from './report-triage';
import { element } from './dom';
import { bindClockText } from '../core/time-format';
import { RestorationPanel } from './restoration-panel';
import { kikiIcon } from '../modules/link-chat/icons';
import type { KeyValueStorage } from '../core/settings';

interface Report extends TriageReport { id: number; target_type: string; target_id: string; reason: string; status: string; created_at: number }
interface Evidence { author: number; text: string; mediaIds: string[]; snapshot?: boolean; actionable?: boolean }
interface Restriction { id: string; name: string; revision: number }
interface Page<T> { items: T[]; nextCursor: number | null }
type Decision = 'dismiss' | 'remove' | 'restore';
const title = (r: Report) => `${r.target_type[0]?.toUpperCase()}${r.target_type.slice(1)} #${r.target_id}`;

/** Platform permissions are deliberately separate from community team permissions. */
export class PlatformModerationPanel {
  readonly element = element('section', { className: 'kl-mod-page kl-platform-moderation', ariaLabel: 'Platform moderation' });
  readonly #generation: ModerationGeneration;
  #access: ModerationAccess | undefined;
  #recoveredNotes: string[] = [];
  #active = false;
  #epoch = 0;
  #busy = false;
  #loading = false;
  #directory = false;
  #triage = false;
  #search = false;
  #workshop = false;
  #appliedQuery = '';
  #decisions = false;
  #eventReports=false; #spaceReports=false;
  #review: DecisionReview | undefined;
  #draft = newDecisionDraft();
  #actions: DecisionEntry[] = [];
  #filters = { state: 'active', priority: 'all', assignment: 'all' };
  #triagePending: TriageRequest | undefined;
  #view: 'queue' | 'restrictions' | 'journal' = 'queue';
  #rows: Report[] = [];
  #restrictions: Restriction[] = [];
  #cursor = 0;
  #next: number | null = null;
  #query = '';
  #type = '';
  #report: Report | undefined;
  #restriction: Restriction | undefined;
  #evidence: Evidence | undefined;
  #unavailable = false;
  #decision: Decision | undefined;
  #confirm = false;
  #reason = '';
  #pending: { operationId: string; revision: number; reason: string } | undefined;
  #error = '';
  #restoration: RestorationPanel | undefined;
  constructor(readonly client: CloudClient, readonly options: {
    storage?: KeyValueStorage;
    current(): boolean;
    image(id: string, report: number, generation?: string): HTMLElement;
    releaseImages(): void;
    back?(): void;
    backLabel?(): string;
  }) { this.#generation = new ModerationGeneration(client); }
  hide(): void {
    if (!this.#active && !this.element.childElementCount) return;
    this.#restoration?.destroy(); this.#restoration = undefined;
    this.#generation.invalidate(); this.#access = undefined; this.#recoveredNotes = [];
    ++this.#epoch; this.#active = false; this.#busy = this.#loading = false;
    this.#clearDetail(); this.#rows = []; this.#restrictions = []; this.#cursor = 0;
    this.#filters = { state: 'active', priority: 'all', assignment: 'all' };
    this.#next = null; this.#appliedQuery = ''; this.#query = this.#type = this.#error = ''; this.#view = 'queue';
    this.element.replaceChildren();
  }
  destroy(): void { this.hide(); }
  #current(): boolean { return this.#active && this.#generation.identityCurrent() && this.options.current(); }
  #valid(epoch: number): boolean { return epoch === this.#epoch && this.#current(); }
  #clearDetail(keepNote = false): void {
    const note = this.#draft.pending?.reason || this.#draft.reason || this.#pending?.reason || this.#reason;
    if (keepNote && note.trim() && !this.#recoveredNotes.includes(note)) this.#recoveredNotes.push(note);
    this.#review = undefined; this.#draft = newDecisionDraft(); this.#actions = [];
    this.#triagePending = undefined; this.#report = undefined; this.#restriction = undefined; this.#evidence = undefined;
    this.#unavailable = false; this.#decision = undefined; this.#confirm = false; this.#reason = ''; this.#pending = undefined;
    this.options.releaseImages();
  }
  #resetGeneration(): void {
    this.#clearDetail(true); this.#rows = []; this.#restrictions = []; this.#cursor = 0; this.#next = null; this.#access = undefined;
  }
  #request<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
    if (!this.#access?.current()) throw new ModerationGenerationError();
    return this.#access.request<T>(method, path, body as Record<string, unknown> | undefined);
  }
  async show(): Promise<void> { this.#active = true; await this.refresh(); }
  async refresh(): Promise<void> {
    if (this.#restoration) return;
    if (!this.#current() || this.#busy) return;
    const epoch = ++this.#epoch;
    const keepDraft = !!this.#report && !!this.element.querySelector('.kl-mod-decision') && !this.#error;
    const previous = JSON.stringify([this.#evidence, this.#unavailable, this.#directory, this.#report, this.#decisions]);
    this.#loading = true; this.#error = '';
    if (keepDraft) this.element.setAttribute('aria-busy', 'true'); else this.#render();
    try {
      // Do not use the host's cached role when opening or refreshing sensitive data.
      const me = await this.client.request<{ moderator: boolean; features?: { eventReports?:boolean;spaceReports?:boolean; communityDirectory?: boolean; workshopReports?: boolean; reportTriage?: boolean; reportDecisions?: boolean; moderationQueue?: boolean } }>('GET', '/v1/me');
      if (!this.#valid(epoch)) return;
      if (!me.moderator) throw new CloudError('moderation_access_required', 403);
      if (this.#generation.accept(me)) this.#resetGeneration();
      this.#access = this.#generation.capture();
      // A refresh may detect recovery, but must not replace an uncertain decision.
      if (this.#draft.pending || this.#triagePending || this.#pending) return;
      this.#spaceReports=me.features?.spaceReports===true;if(this.#type==='space'&&!this.#spaceReports)this.#type='';this.#eventReports=me.features?.eventReports===true;this.#workshop = me.features?.workshopReports === true; this.#search = me.features?.moderationQueue === true; this.#directory = me.features?.communityDirectory === true; this.#triage = me.features?.reportTriage === true; this.#decisions = me.features?.reportDecisions === true; if (!this.#decisions) { this.#review=undefined; this.#draft=newDecisionDraft(); }
      if (this.#report) {
        if (this.#decisions) {
          const review = await this.#request<DecisionReview>('GET', `/v1/moderation/reports/${this.#report.id}/review`);
          if (!this.#valid(epoch)) return;
          if (this.#review?.revision !== review.revision) this.#draft.confirm = false;
          this.#review = review; this.#report = { ...this.#report, ...review };
        } else if (this.#triage) {
          const triage = await this.#request<TriageReport>('GET', `/v1/moderation/reports/${this.#report.id}/triage`);
          if (!this.#valid(epoch)) return;
          this.#report = { ...this.#report, ...triage };
          if (triage.status !== 'open') { this.#decision = undefined; this.#confirm = false; this.#triagePending = undefined; }
        }
        try {
          const evidence = await this.#request<Evidence>('GET', `/v1/moderation/reports/${this.#report.id}`);
          if (!this.#valid(epoch)) return;
          this.#evidence = evidence; this.#unavailable = false;
        } catch (e) {
          if (!this.#valid(epoch)) return;
          if (!(e instanceof CloudError) || e.status !== 404) throw e;
          this.#evidence = undefined; this.#unavailable = true; this.options.releaseImages();
        }
      } else if (this.#view === 'journal' && this.#decisions) {
        const page = await this.#request<Page<DecisionEntry>>('GET', `/v1/moderation/actions?limit=40&cursor=${this.#cursor}`);
        if (!this.#valid(epoch)) return; this.#actions = page.items; this.#next = page.nextCursor;
      } else if (this.#view === 'restrictions' && this.#directory) {
        const page = await this.#request<Page<Restriction>>('GET', `/v1/moderation/community-restrictions?limit=40&cursor=${this.#cursor}`);
        if (!this.#valid(epoch)) return;
        this.#restrictions = page.items; this.#next = page.nextCursor;
        if (this.#restriction && !page.items.some(r => r.id === this.#restriction!.id && r.revision === this.#restriction!.revision)) this.#clearDetail();
      } else {
        this.#view = 'queue';
        const page = await this.#request<Page<Report>>('GET', `/v1/moderation/reports?limit=40&cursor=${this.#cursor}${this.#triage ? '&'+new URLSearchParams(this.#filters) : ''}${this.#search ? '&'+new URLSearchParams({q:this.#appliedQuery,type:this.#type||'all'}) : ''}`);
        if (!this.#valid(epoch)) return;
        this.#rows = page.items; this.#next = page.nextCursor;
      }
    } catch (e) {
      if (!this.#valid(epoch)) return;
      this.#rows = []; this.#restrictions = []; this.#next = null; this.#clearDetail(moderationGenerationConflict(e));
      if (moderationGenerationConflict(e)) this.#resetGeneration();
      this.#error = moderationGenerationConflict(e) ? 'Reports changed after recovery. Refresh reports before deciding again.' : e instanceof CloudError && [401,403,404].includes(e.status)
        ? 'This moderation view is no longer available to you.' : 'Could not load this view. Refresh to try again.';
    } finally { if (this.#valid(epoch)) {
      this.#loading = false;
      if (keepDraft && !this.#error && this.#report && previous === JSON.stringify([this.#evidence, this.#unavailable, this.#directory, this.#report, this.#decisions])) this.element.setAttribute('aria-busy', 'false');
      else this.#render();
    } }
  }
  #button(label: string, run: () => void, primary = false): HTMLButtonElement {
    const button = element('button', { type: 'button', text: label, className: `kl-text-button${primary ? ' kl-text-button--primary' : ''}` });
    button.disabled = this.#busy || this.#loading || (!!this.#draft.pending && !['Retry decision','Refresh reports'].includes(label));
    button.addEventListener('click', () => { if (this.#current() && this.element.contains(button) && !this.#busy && !this.#loading) run(); });
    return button;
  }
  #note(text: string): HTMLElement { return element('p', { className: 'kl-mod-note', text }); }
  #badge(text: string, priority?: TriageReport['priority']): HTMLElement {
    const badge = element('span', { className: 'kl-mod-badge', text });
    if (priority) badge.dataset.priority = priority;
    return badge;
  }
  #focus(selector: string): void { queueMicrotask(() => { if (this.#current()) this.element.querySelector<HTMLElement>(selector)?.focus(); }); }
  #render(): void {
    this.element.setAttribute('aria-busy', String(this.#loading || this.#busy));
    this.element.replaceChildren(element('header', { className: 'kl-mod-header' }, element('div', {},
      element('span', { className: 'kl-mod-eyebrow', text: 'KIKILINK · MODERATION' }),
      element('h1', { text: 'Platform moderation' }), this.#note('Review reported content and community restrictions.')),
      element('div', { className: 'kl-mod-actions' }, ...(this.options.back ? [this.#button(this.options.backLabel?.() ?? 'Back to Feed', () => this.options.back!())] : []), this.#button('Refresh reports', () => void this.refresh()))));
    const nav = element('nav', { className: 'kl-mod-tabs', ariaLabel: 'Platform moderation views' });
    for (const [view, label] of [['queue','Queue'], ...(this.#directory ? [['restrictions','Restricted communities']] : []), ...(this.#decisions ? [['journal','Decision history']] : [])]) {
      const b = this.#button(label!, () => { this.#clearDetail(); this.#view = view as 'queue' | 'restrictions' | 'journal'; this.#cursor = 0; this.#appliedQuery = this.#query = this.#type = ''; void this.refresh(); });
      b.setAttribute('aria-pressed', String(this.#view === view)); nav.append(b);
    }
    if (this.options.storage && !this.#error && this.#access?.current()) nav.append(this.#button('Restoration & appeals', () => {
      this.#clearDetail(); this.#rows = []; this.#restrictions = [];
      const panel = new RestorationPanel(this.client, true, { storage: this.options.storage!, current: () => this.#active && this.options.current(), back: () => { panel.destroy(); this.#restoration = undefined; void this.refresh(); } });
      this.#restoration = panel; this.element.replaceChildren(panel.element); void panel.show();
    }));
    if (!this.#error) this.element.append(nav);
    for (const note of this.#recoveredNotes) this.element.append(element('section', { className: 'kl-mod-recovered-note' }, this.#note('Saved decision note from before recovery. Review the current report before using it.'), Object.assign(element('textarea', { ariaLabel: 'Saved decision note', value: note }), { readOnly: true })));
    if (this.#error) this.element.append(element('p', { className: 'kl-mod-notice', role: 'alert', text: this.#error }));
    if (this.#loading) { this.element.append(element('p', { role: 'status', text: 'Checking moderation access…' })); return; }
    if (this.#report || this.#restriction) { this.#detail(); return; }
    if (this.#error) return;
    if (this.#view === 'journal') {
      this.element.append(decisionHistory(this.#actions), this.#note('Platform decisions and earlier audit entries · Kept for 30 days.'));
      if (this.#next !== null) this.element.append(pageAction(this.#button('Older entries', () => { this.#cursor = this.#next!; void this.refresh(); }), 'next'));
      if (this.#cursor) this.element.append(pageAction(this.#button('Back to latest', () => { this.#cursor = 0; void this.refresh(); }), 'previous'));
      return;
    }
    const search = element('input', { type: 'search', ariaLabel: this.#search && this.#view === 'queue' ? 'Search all platform reports' : 'Search this report page', placeholder: 'Search reports…', value: this.#query });
    const field = element('div', { className: 'kl-mod-search' }, search);
    const toolbar = element('div', { className: 'kl-mod-toolbar' }, field), rows = element('div', { className: 'kl-mod-list' });
    const serverSearch = this.#search && this.#view === 'queue';
    search.maxLength = 160;
    const applySearch = () => { if (!this.#current() || this.#loading || this.#busy || !this.element.contains(search)) return; this.#appliedQuery = search.value.trim(); this.#cursor = 0; void this.refresh(); };
    search.addEventListener('input', () => { if (!this.element.contains(search)) return; this.#query = search.value; if (!serverSearch) renderRows(); });
    if (serverSearch) {
      const applyButton = this.#button('Search', applySearch);
      applyButton.setAttribute('aria-label', 'Search'); applyButton.title = 'Search';
      applyButton.replaceChildren(kikiIcon('search')); field.append(applyButton);
      search.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); applySearch(); } });
    } else field.prepend(kikiIcon('search'));
    if (this.#view === 'queue') {
      const types = element('select', { ariaLabel: 'Report content type' });
      for (const [value,label] of [['','All content types'],...['profile','post','comment','group','message','community',...(this.#workshop?['creation','review']:[]),...(this.#eventReports?['event']:[]),...(this.#spaceReports?['space']:[])].map(t => [t,t[0]!.toUpperCase()+t.slice(1)])]) {
        const option = element('option', { value: value!, text: label! }); option.selected = this.#type === value; types.append(option);
      }
      types.addEventListener('change', () => { if (!this.#current() || this.#loading || !this.element.contains(types)) return; this.#type = types.value; if(serverSearch){this.#cursor=0;void this.refresh();}else renderRows(); }); toolbar.append(types);
      if (this.#triage) for (const [key,label,values] of triageFilterOptions) {
        const select = element('select', { ariaLabel: label });
        for (const [value,text] of [...values, ...(key === 'state' && this.#decisions ? [['resolved','Closed reports']] : [])]) { const o = element('option', { value: value!, text: text! }); o.selected = value === this.#filters[key]; select.append(o); }
        select.addEventListener('change', () => { if (!this.#current() || this.#busy || !this.element.contains(select)) return; this.#filters[key] = select.value; this.#cursor = 0; void this.refresh(); });
        toolbar.append(select);
      } else toolbar.append(this.#badge('Open reports'));
    } else search.setAttribute('aria-label', 'Search this restriction page');
    const count = element('p', { className: 'kl-mod-note', role: 'status' });
    const renderRows = () => {
      rows.replaceChildren(); const query = this.#query.trim().toLocaleLowerCase(); let total = 0;
      if (this.#view === 'queue') for (const r of this.#rows) {
        if (!serverSearch && ((this.#type && r.target_type !== this.#type) || !`${r.id} ${r.target_type} ${r.target_id} ${r.reason}`.toLocaleLowerCase().includes(query))) continue;
        ++total;
        rows.append(element('article', { className: 'kl-mod-row' }, element('div', { className: 'kl-mod-main' },
          element('div', { className: 'kl-mod-status' }, this.#badge(reportStatus(r)), ...(r.priority ? [this.#badge(r.priority === 'high' ? 'High priority' : 'Standard', r.priority), this.#note(assignedLabel(r, this.client.memberNumber))] : []), this.#note(`Report #${r.id}`)),
          element('h3', { text: title(r) }), element('p', { text: r.reason }), bindClockText(element('time'), r.created_at, 'numeric-date-time')),
          element('div', { className: 'kl-mod-row-actions' }, this.#button(`Review report #${r.id}`, () => {
            this.#clearDetail(); this.#report = r; void this.refresh().then(() => this.#focus('.kl-mod-detail h2'));
          }))));
      } else for (const r of this.#restrictions) {
        if (!`${r.name} ${r.id}`.toLocaleLowerCase().includes(query)) continue;
        ++total; rows.append(element('article', { className: 'kl-mod-row' }, element('div', { className: 'kl-mod-main' },
          this.#badge('Restricted'), element('h3', { text: r.name }), this.#note('Discovery and community activity are paused.')),
          element('div', { className: 'kl-mod-row-actions' }, this.#button('Review restriction', () => {
            this.#clearDetail(); this.#restriction = r; this.#decision = 'restore'; this.#render(); this.#focus('textarea');
          }))));
      }
      count.textContent = `${total} ${total === 1 ? 'entry' : 'entries'} on this page · ${serverSearch ? 'Search and filters cover all retained platform reports.' : this.#triage ? 'Search and content type apply to the loaded page; review, priority and assignment filters cover the full queue.' : 'Search and filters apply to the loaded page.'}`;
      if (!total) rows.append(element('section', { className: 'kl-mod-empty' }, kikiIcon('shield'), element('h2', { text: query || this.#type ? 'No matching entries' : this.#view === 'queue' ? 'Your queue is clear' : 'No restricted communities' }),
        this.#note(serverSearch && this.#next !== null ? 'No matches in this batch. Continue to search older reports.' : query || this.#type ? 'Try another search or reset the filters.' : 'Refresh to check for changes.'),
        ...(query || this.#type ? [this.#button('Reset filters', () => { this.#appliedQuery = this.#query = this.#type = ''; this.#cursor=0; if(serverSearch)void this.refresh();else this.#render(); this.#focus('input'); })] : [])));
    };
    this.element.append(toolbar, count, rows); renderRows();
    const pagination = element('div', { className: 'kl-mod-actions' });
    if (this.#next !== null) pagination.append(pageAction(this.#button('Next page', () => { this.#cursor = this.#next!; void this.refresh(); }), 'next'));
    if (this.#cursor) pagination.append(pageAction(this.#button('Back to first page', () => { this.#cursor = 0; void this.refresh(); }), 'previous'));
    this.element.append(pagination);
  }
  #detail(): void {
    const report = this.#report;
    const back = this.#button('Back to queue', () => { this.#clearDetail(); void this.refresh(); });
    back.classList.add('kl-mod-back'); back.prepend(kikiIcon('back'));
    this.element.append(back);
    const card = element('section', { className: 'kl-mod-detail' }, element('h2', { tabIndex: -1, text: report ? title(report) : this.#restriction!.name }), this.#badge(report ? reportStatus(report) : 'Restricted community'));
    this.element.append(card);
    if (report) {
      const meta = element('dl', { className: 'kl-mod-meta' });
      for (const [label,value] of [['Report',`#${report.id}`],['Content type',report.target_type]]) meta.append(element('div', {}, element('dt', { text: label! }), element('dd', { text: value! })));
      meta.append(element('div', {}, element('dt', { text: 'Submitted' }), element('dd', {}, bindClockText(element('time'), report.created_at, 'numeric-date-time'))));
      if (report.priority) { card.append(this.#badge(report.priority === 'high' ? 'High priority' : 'Standard')); meta.append(element('div', {}, element('dt', { text: 'Assigned to' }), element('dd', { text: report.assignedTo == null ? 'Unassigned' : report.assignedTo === this.client.memberNumber ? 'You' : `#${report.assignedTo}` }))); }
      card.append(meta, element('h3', { text: 'Report details' }), element('p', { className: 'kl-mod-copy', text: report.reason }));
      const evidence = element('section', { className: 'kl-mod-evidence' }, element('h2', { text: 'Reported content' }));
      if (this.#evidence) {
        evidence.append(this.#note(`Content author #${this.#evidence.author}`), element('blockquote', { text: this.#evidence.text }));
        if(this.#evidence.snapshot)evidence.append(this.#note(this.#evidence.actionable===false?'Reported snapshot. The original changed or is unavailable; only dismissal is possible.':'Reported snapshot. A decision checks this published version again.'));
        for (const id of this.#evidence.mediaIds) evidence.append(this.#access?.generation ? this.options.image(id, report.id, this.#access.generation) : this.options.image(id, report.id));
      } else evidence.append(this.#note('The original content is no longer available. You can dismiss this report.'));
      this.element.append(evidence);
      if (this.#triage && report.priority && report.revision && report.status === 'open') {
        this.element.append(triageControls(report, { actor: this.client.memberNumber, disabled: this.#busy || this.#loading || !!this.#draft.pending, pending: !!this.#triagePending,
          button: (label, run) => { const b = this.#button(label, run); if (this.#draft.pending) b.disabled = true; return b; }, change: input => void this.#changeTriage(input), retry: () => void this.#changeTriage() }));
      }

      if (this.#decisions && this.#review) {
        if (!this.#triagePending) this.element.append(decisionControls(this.#review, this.#draft, { available: !!this.#evidence&&this.#evidence.actionable!==false, workshopTarget: ['creation','review'].includes(report.target_type)?report.target_type as 'creation'|'review':undefined, communityTarget: report.target_type === 'community', spaceTarget:report.target_type==='space', disabled: this.#busy || this.#loading,
          button: (label, run, primary) => this.#button(label, run, primary), render: () => this.#render(), submit: () => void this.#applyDecision(),
          target: { title: title(report), type: report.target_type, reference: `Report #${report.id}` } }));
        this.element.append(decisionHistory(this.#review.history.items));
        if (this.#review.history.nextCursor !== null) this.element.append(pageAction(this.#button('Load more decisions', () => void this.#olderDecisions())));
        return;
      }
      if (report.status !== 'open' || this.#triagePending) return;
      if (!this.#decision) {
        this.element.append(this.#button('Review decision…', () => { this.#decision = 'dismiss'; this.#render(); this.#focus('select[aria-label="Decision"]'); }, true)); return;
      }
    }
    const form = element('section', { className: 'kl-mod-decision' }, element('h2', { text: 'Review decision' }));
    this.element.append(form);
    if (report && !this.#confirm) {
      const select = element('select', { ariaLabel: 'Decision' });
      for (const [value,label] of [['dismiss','Dismiss report'], ...(!this.#unavailable ? [['remove',report.target_type === 'community' ? 'Restrict community' : report.target_type === 'space' ? 'Restrict Space' : 'Remove content']] : [])]) {
        const o = element('option', { value: value!, text: label! }); o.selected = value === this.#decision; select.append(o);
      }
      select.disabled = this.#busy; select.addEventListener('change', () => { if (!this.element.contains(select) || select.disabled) return; this.#decision = select.value as Decision; this.#render(); this.#focus(this.#decision === 'remove' ? 'textarea' : 'select[aria-label="Decision"]'); });
      form.append(element('label', {}, element('span', { text: 'Decision' }), select));
    }
    if (this.#decision !== 'dismiss') {
      const reason = element('textarea', { ariaLabel: 'Decision reason', maxLength: 1000, value: this.#reason, placeholder: 'Explain your decision (at least 5 characters)' });
      reason.disabled = this.#busy || this.#confirm || !!this.#pending;
      reason.addEventListener('input', () => { if (!this.element.contains(reason) || reason.disabled) return; this.#reason = reason.value; });
      form.append(element('label', {}, element('span', { text: 'Decision reason' }), reason));
    }
    const description = this.#decision === 'dismiss' ? 'Dismiss this report without removing the content?'
      : this.#decision === 'restore' ? 'Lift this platform restriction? The community stays archived until its owner restores it.'
      : report?.target_type === 'community' ? 'Restrict this community? Discovery and activity will stop until a platform moderator lifts the restriction.'
      : report?.target_type === 'space' ? 'Restrict access to this Space and close its open reports? Its saved settings and other retained content are kept.'
      : 'Remove the reported content and its attachments for everyone? All open reports for this content will be closed.';
    form.append(this.#note(description));
    const actions = element('div', { className: 'kl-mod-actions' }); form.append(actions);
    if (this.#pending) actions.append(this.#button('Retry decision', () => void this.#submit(), true));
    else if (this.#confirm) actions.append(this.#button('Confirm decision', () => void this.#submit(), true), this.#button('Back to decision', () => { this.#confirm = false; this.#render(); }));
    else actions.append(this.#button('Continue', () => {
      if (this.#decision !== 'dismiss' && this.#reason.trim().length < 5) { this.#error = 'Add a decision reason of at least 5 characters.'; this.#render(); this.#focus('textarea'); return; }
      this.#error = ''; this.#confirm = true; this.#render(); this.#focus('.kl-mod-decision .kl-text-button--primary');
    }, true), this.#button('Cancel decision', () => { this.#decision = undefined; this.#reason = ''; if (this.#restriction) this.#clearDetail(); this.#render(); }));
  }
  async #changeTriage(input?: TriageChange): Promise<void> {
    const report = this.#report;
    if (!this.#current() || this.#busy || this.#loading || !!this.#draft.pending || !this.#triage || !report?.revision || report.status !== 'open') return;
    const body = this.#triagePending ?? (input ? { ...input, operationId: crypto.randomUUID(), revision: report.revision } : undefined);
    if (!body) return;
    this.#triagePending = body; this.#busy = true; this.#error = ''; this.#confirm = false;
    const epoch = this.#epoch; this.#render();
    try {
      await this.#request('POST', `/v1/moderation/reports/${report.id}/triage`, body);
      if (!this.#valid(epoch)) return;
      this.#triagePending = undefined;
    } catch (e) {
      if (!this.#valid(epoch)) return;
      if (moderationGenerationConflict(e)) {
        this.#resetGeneration(); this.#error = 'Reports changed after recovery. Refresh reports before deciding again.';
      } else if (e instanceof CloudError && [401,403,404,409].includes(e.status)) {
        this.#clearDetail(); this.#rows = []; this.#next = null;
        this.#error = 'This report or your permissions changed. Refresh before changing it again.';
      } else this.#error = 'The change was not confirmed. Retry sends the same change.';
    } finally { if (this.#valid(epoch)) { this.#busy = false; if (!this.#error) await this.refresh(); else this.#render(); } }
  }
  async #applyDecision(): Promise<void> {
    const report = this.#report;
    if (!this.#current() || this.#busy || this.#loading || !this.#decisions || !report?.revision || (!this.#draft.confirm && !this.#draft.pending)) return;
    const body = this.#draft.pending ?? { operationId: crypto.randomUUID(), revision: report.revision, action: this.#draft.action, reason: this.#draft.reason.trim() };
    this.#draft.pending = body; this.#busy = true; this.#error = ''; const epoch = this.#epoch; this.#render();
    try {
      await this.#request('POST', `/v1/moderation/reports/${report.id}/decision`, body);
      if (!this.#valid(epoch)) return; this.#draft = newDecisionDraft();
    } catch (e) {
      if (!this.#valid(epoch)) return;
      if (moderationGenerationConflict(e)) { this.#resetGeneration(); this.#error = 'Reports changed after recovery. Refresh reports before deciding again.'; }
      else if (e instanceof CloudError && [400,401,403,404,409].includes(e.status)) { this.#clearDetail(); this.#rows = []; this.#next = null; this.#error = 'This report or your permissions changed. Refresh before deciding again.'; }
      else this.#error = 'The decision was not confirmed. Retry sends the same decision.';
    } finally { if (this.#valid(epoch)) { this.#busy = false; if (!this.#error) await this.refresh(); else this.#render(); } }
  }
  async #olderDecisions(): Promise<void> {
    if (!this.#report || !this.#review || this.#review.history.nextCursor === null || this.#busy || this.#draft.pending) return;
    const epoch=this.#epoch, report=this.#report, review=this.#review; this.#busy=true; this.#render();
    try {
      const page=await this.#request<DecisionReview['history']>('GET',`/v1/moderation/reports/${report.id}/decisions?limit=20&cursor=${review.history.nextCursor}`);
      if (!this.#valid(epoch)) return; review.history={items:[...review.history.items,...page.items],nextCursor:page.nextCursor};
    } catch (e) { if (this.#valid(epoch)) { if (moderationGenerationConflict(e)) this.#resetGeneration(); else this.#clearDetail(); this.#rows=[]; this.#next=null; this.#error='Decision history is no longer available. Refresh to check access.'; } }
    finally { if (this.#valid(epoch)) { this.#busy=false; this.#render(); } }
  }
  async #submit(): Promise<void> {
    if (!this.#current() || this.#busy || !this.#decision || (!this.#confirm && !this.#pending)) return;
    const epoch = this.#epoch, report = this.#report, restriction = this.#restriction, decision = this.#decision;
    this.#busy = true; this.#error = ''; this.#render();
    try {
      if (decision === 'restore' && restriction) {
        this.#pending ??= { operationId: crypto.randomUUID(), revision: restriction.revision, reason: this.#reason.trim() };
        await this.#request('POST', `/v1/moderation/community-restrictions/${restriction.id}/restore`, this.#pending);
      } else if (report) {
        if (decision === 'remove') await this.#request('POST', '/v1/moderation/remove', { targetType: report.target_type, targetId: report.target_id, reason: this.#reason.trim() });
        else await this.#request('POST', `/v1/moderation/reports/${report.id}/dismiss`, {});
      }
      if (!this.#valid(epoch)) return;
      this.#clearDetail();
    } catch (e) {
      if (!this.#valid(epoch)) return;
      if (moderationGenerationConflict(e)) {
        this.#resetGeneration(); this.#error = 'Reports changed after recovery. Refresh reports before deciding again.';
      } else if (e instanceof CloudError && [401,403,404,409].includes(e.status)) {
        this.#clearDetail(); this.#rows = []; this.#restrictions = []; this.#next = null;
        this.#error = 'This report or your permissions changed. Refresh before deciding again.';
      } else if (decision === 'restore') this.#error = 'The decision was not confirmed. Retry sends the same decision.';
      else {
        // These older endpoints have no operation token. Never replay an uncertain removal.
        this.#clearDetail(); this.#rows = []; this.#next = null;
        this.#error = 'The decision was not confirmed. Refresh the queue to check the result before making another decision.';
      }
    } finally { if (this.#valid(epoch)) { this.#busy = false; if (!this.#error) await this.refresh(); else this.#render(); } }
  }
}
