import { CloudError, type CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { catalog, PREFERENCE_CATEGORIES, PREFERENCE_LEVEL_LABELS, normalizePreferenceRatings, preferenceMatchesSearch, type Preferences } from '../../cloud/preference-model';
import { kikiIcon } from '../link-chat/icons';
import { searchField } from './browse-controls';
import { profilePreferencesLocked } from './profile-visibility-view';

/** Read only profile ratings. Never derive a private rating from compatibility. */
export class ProfilePreferences {
  readonly element = element('section', { className: 'kl-profile-preferences kl-profile-ratings', hidden: true, ariaLabel: 'Profile preferences' });
  readonly #body = element('div');
  readonly #status = element('p', { role: 'status', className: 'kl-profile-section-note' });
  readonly #query = element('input', { type: 'search', ariaLabel: 'Search shared preferences', placeholder: 'Find a preference…', maxLength: 80 });
  readonly #category = element('select', { ariaLabel: 'Preference category' });
  readonly #unsubscribe: () => void;
  #member = 0;
  #visible = false;
  #token = 0;
  #data: Preferences | undefined;
  #release: (() => void) | undefined;
  constructor(readonly client: CloudClient, readonly current: () => boolean, readonly edit: () => void) {
    this.#category.append(element('option', { value: '', text: 'All categories' }), ...PREFERENCE_CATEGORIES.map(value => element('option', { value, text: value })));
    this.#query.addEventListener('input', () => this.#render());
    this.#category.addEventListener('change', () => this.#render());
    this.#query.addEventListener('keydown', event => event.stopPropagation());
    this.#unsubscribe = client.subscribe(kind => {
      if (kind === 'session' || !current()) { this.setVisible(false); return; }
      if (this.#visible && ['preferences', 'relationships', 'profiles-cleared'].includes(kind)) void this.refresh();
    });
    this.element.append(this.#status, this.#body);
  }
  open(member: number): void {
    if (!this.current()) { this.setVisible(false); return; }
    if (this.#member !== member) { this.setVisible(false); this.#query.value = ''; this.#category.value = ''; }
    this.#member = member;
    if (this.#visible) return;
    this.#visible = true; this.element.hidden = false; this.#release = this.client.retainEvents();
    void this.refresh();
  }
  setVisible(visible: false): void {
    this.#visible = visible; this.element.hidden = true; this.#token++; this.#data = undefined;
    this.#body.replaceChildren(); this.#status.replaceChildren(); this.#release?.(); this.#release = undefined;
  }
  destroy(): void { this.setVisible(false); this.#unsubscribe(); }
  async refresh(): Promise<void> {
    if (!this.#visible) return;
    if (!this.current()) { this.setVisible(false); return; }
    const token = ++this.#token, member = this.#member;
    const valid = () => token === this.#token && this.#visible && this.current() && this.client.connected;
    this.#data = undefined; this.#body.replaceChildren(); this.#status.textContent = 'Checking shared preferences…';
    if (!this.client.connected) { this.#status.textContent = 'Reconnect to Cloud to see shared preferences.'; return; }
    try {
      const data = await this.client.request<Preferences>('GET', member === this.client.memberNumber ? '/v1/preferences/me' : `/v1/preferences/${member}`);
      if (!valid()) return;
      this.#data = { ...data, ratings: normalizePreferenceRatings(data.ratings) }; this.#status.textContent = ''; this.#render();
    } catch (error) {
      if (!valid()) return;
      const retry = element('button', { type: 'button', className: 'kl-text-button', text: 'Retry preferences' });
      retry.addEventListener('click', () => void this.refresh());
      if(error instanceof CloudError&&error.status===403){
        this.#status.textContent='';
        const locked=profilePreferencesLocked('kl-profile-preferences-locked','These preferences are private or no longer shared with you.');locked.setAttribute('role','status');
        this.#body.append(locked,element('div',{className:'kl-profile-preferences-retry'},retry));
      }else{
        this.#status.textContent = error instanceof CloudError && [401, 404].includes(error.status)
          ? 'These preferences are private or no longer shared with you.' : 'Preferences could not load. Try again later.';
        this.#body.append(retry);
      }
    }
  }
  #render(): void {
    const data = this.#data; if (!data) return;
    const mounted = this.#body.contains(this.#query);
    if (!mounted) {
      const heading = element('header', { className: 'kl-profile-section-heading' }, element('h3', { text: 'Preferences' }));
      if (this.#member === this.client.memberNumber) {
        const edit = element('button', { type: 'button', className: 'kl-text-button kl-profile-edit-link' }, kikiIcon('edit'), 'Edit preferences');
        edit.addEventListener('click', this.edit); heading.append(edit);
      }
      this.#body.replaceChildren(heading, element('div', { className: 'kl-profile-preference-filters' }, searchField(this.#query), this.#category));
    }
    const list = element('div', { className: 'kl-profile-rating-list' });
    const groups = new Map<string, HTMLElement>();
    for (const item of catalog.items) {
      const level = data.ratings[item.id];
      if (!level || this.#category.value && item.category !== this.#category.value || !preferenceMatchesSearch(item, this.#query.value)) continue;
      let group = groups.get(item.category);
      if (!group) {
        group = element('section', { className: 'kl-profile-rating-group' }, element('h3', { text: item.category }));
        groups.set(item.category, group);
        list.append(group);
      }
      group.append(element('div', { className: 'kl-profile-rating' }, element('strong', { text: item.label }),
        element('span', { className: `kl-profile-rating-value kl-profile-rating--${level}`, text: PREFERENCE_LEVEL_LABELS[level] })));
    }
    if (!groups.size) {
      const hasRatings = Object.keys(data.ratings).length > 0;
      const empty = element('div', { className: 'kl-profile-ratings-empty' }, kikiIcon('heart'),
        element('strong', { text: hasRatings ? 'No matching preferences' : 'No preferences have been rated yet.' }));
      if (hasRatings) {
        const clear = element('button', { type: 'button', className: 'kl-text-button', text: 'Clear preference filters' });
        clear.addEventListener('click', () => { this.#query.value = ''; this.#category.value = ''; this.#render(); this.#query.focus(); });
        empty.append(element('p', { className: 'kl-profile-section-note', text: 'Try a different word or category.' }), clear);
      }
      list.append(empty);
    }
    // Keep the input and selection alive while filtering.
    if (!mounted) this.#body.append(list);
    else this.#body.querySelector('.kl-profile-rating-list')?.replaceWith(list);
  }
}
