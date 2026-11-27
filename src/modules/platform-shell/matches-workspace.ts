import { CloudError, type CloudClient } from '../../cloud/client';
import { SwipeApi, type SwipeSnapshot } from '../../cloud/matches-swipe';
import type { KeyValueStorage } from '../../core/settings';
import { element } from '../../cloud/dom';
import { focusedElement } from '../../utils/dom';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
import { MatchingPage } from './matching-page';
import { createMatchesSwipeDeck } from './matches-swipe-deck';
import { mountMatchesSwipeEditor } from './matches-swipe-editor';

type View = 'swipe' | 'mutual';
type Options = ConstructorParameters<typeof MatchingPage>[2];

function action(label: string, icon: KikiLinkIconName, className: string, run: (event: MouseEvent) => void) {
  const button = element('button', {type: 'button', className}, kikiIcon(icon, 'ico'), label);
  button.onclick = run;
  return button;
}

/** One Explore route. The prior Matching catalogs also handle existing deep links. */
export class MatchesWorkspace {
  readonly element = element('section', {className: 'kl-matches-workspace'});
  readonly #catalog: MatchingPage;
  readonly #api: SwipeApi;
  readonly #catalogArea = element('div', {className: 'kl-matches-catalog', hidden: true});
  readonly #back = action('Back to swipe', 'back', 'kl-text-button kl-matches-back', () => this.openBrowse());
  readonly #scroll = element('section', {className:'kl-matches-scroll'});
  readonly #section = element('div', {className:'kl-matches-swipe'});
  readonly #browse = action('Browse', 'search', 'button minor', () => this.#showCatalog());
  readonly #edit = action('Edit card', 'edit', 'button minor', event => this.#editCard(event.detail === 0));
  readonly #swipe = action('Swipe', 'appearance', 'tab', () => this.#navigate('swipe'));
  readonly #mutual = action('Mutual likes', 'heart', 'tab', () => this.#navigate('mutual'));
  readonly #count = element('span', {className:'count', text:'0'});
  readonly #tabs = element('nav', {className:'tabs', ariaLabel:'Matches views'}, this.#swipe, this.#mutual);
  readonly #content = element('div');
  readonly #notice = element('div', {className:'swipe-feedback', role:'status', hidden:true});
  #deck: ReturnType<typeof createMatchesSwipeDeck> | undefined;
  #editor: (() => void) | undefined;
  #state: SwipeSnapshot | undefined;
  #view: View = 'swipe';
  #supports: boolean | undefined;
  #visible = false;
  #catalogSelected = false;
  #unwatch: (() => void) | undefined;
  #timer: ReturnType<typeof setInterval> | undefined;
  #pending: AbortController | undefined;
  #lifetime = new AbortController();
  #refreshAgain = false;
  #writing = false;
  #destroyed = false;
  #noticeKey = '';

  constructor(readonly client: CloudClient, storage: KeyValueStorage, readonly options: Options) {
    this.#catalog = new MatchingPage(client, storage, options);
    this.#api = new SwipeApi(client, options.blocked);
    this.#mutual.append(this.#count);
    this.#catalogArea.append(this.#back, this.#catalog.element);
    this.#browse.title = 'Browse people, groups, rooms and events';
    this.#section.append(element('header', {className:'heading'}, element('h1',{text:'Matches'}),
      element('div',{className:'actions'}, this.#browse, this.#edit)), this.#tabs, this.#notice, this.#content);
    this.#scroll.append(this.#section);
    this.element.append(this.#scroll, this.#catalogArea);
    this.#chrome();
  }

  get recovery() { return this.#catalog.recovery; }
  get recommendationPriority() { return this.#catalog.recommendationPriority; }
  #owner() {
    return !this.#destroyed && this.options.current() && this.client.memberNumber === this.recovery.owner &&
      this.client.origin === this.recovery.origin;
  }
  #active() { return this.#visible && this.#owner() && !this.#catalogSelected; }
  #chrome() {
    this.#edit.hidden = !this.#state?.self || !!this.#editor;
    this.#tabs.hidden = this.#edit.hidden;
    for (const [name, tab] of [['swipe',this.#swipe],['mutual',this.#mutual]] as const) {
      if (name === this.#view) tab.setAttribute('aria-current','page');
      else tab.removeAttribute('aria-current');
    }
    const count = String(this.#state?.mutualCount ?? 0);
    if (this.#count.textContent !== count) this.#count.textContent = count;
  }
  #message(text = '', retry = false, link?: {label: string; run: () => void}) {
    const key = JSON.stringify([text, retry, link?.label]);
    if (key === this.#noticeKey) return;
    this.#noticeKey = key;
    this.#notice.hidden = !text;
    this.#notice.replaceChildren(text);
    if (retry) this.#notice.append(action('Retry','refresh','button minor', () => void this.#read()));
    if (link) this.#notice.append(action(link.label,'settings','button minor', link.run));
  }
  #visibilityMessage(snapshot: SwipeSnapshot) {
    if (snapshot.discoverability === 'private') {
      this.#message('Matches needs a visible Cloud profile with profile discovery enabled.', false,
        {label:'Privacy settings', run:this.options.privacy});
    } else if (snapshot.discoverability === 'paused') {
      this.#message('Your match settings are paused or have expired. Update them to see and share cards.', false,
        {label:'Match settings', run:() => this.openOwnSignal()});
    } else this.#message();
  }
  #discardView() {
    this.#editor?.(); this.#editor = undefined;
    this.#deck?.dispose(); this.#deck = undefined;
    this.#state = undefined;
    this.#content.replaceChildren();
    this.#chrome();
  }
  #cancel() {
    this.#pending?.abort(); this.#pending = undefined;
    this.#lifetime.abort(); this.#lifetime = new AbortController();
    this.#writing = this.#refreshAgain = false;
    this.#api.clearPending();
    this.#discardView();
  }
  setVisible(visible: boolean) {
    if (visible === this.#visible || this.#destroyed) return;
    this.#visible = visible;
    if (!visible) {
      this.#cancel();
      this.#unwatch?.(); this.#unwatch = undefined;
      clearInterval(this.#timer);
      this.#catalog.setVisible(false);
      this.#supports = undefined;
      return;
    }
    this.#unwatch = this.#api.watch(reasons => {
      if (!this.#owner()) { this.#cancel(); return; }
      if (this.#catalogSelected) return;
      if (!this.client.connected) {
        this.#cancel(); this.#message('Reconnect to Cloud to open Matches.', true); return;
      }
      if (document.hidden) return;
      const accessChanged = ['relationships', 'privacy', 'profile-discovery', 'profiles-cleared'].some(k => reasons.has(k));
      if (this.#state && accessChanged) {
        // Stop showing a withdrawn or newly blocked profile while permissions are being checked.
        this.#pending?.abort(); this.#pending = undefined;
        this.#state = {...this.#state, deck: [], mutuals: [], mutualCount: 0, lastVote: null};
        if (!this.#editor) { this.#deck?.dispose(); this.#deck = undefined; this.#content.replaceChildren(); }
        this.#chrome();
      }
      void this.#read(!accessChanged);
    });
    this.#timer = setInterval(() => {
      if (this.#active() && !document.hidden && this.client.connected) void this.#read();
    }, 45000);
    if (this.#catalogSelected) this.#showCatalog();
    else this.openBrowse();
  }
  openBrowse() {
    this.#catalogSelected = false;
    this.#catalog.setVisible(false);
    this.#catalogArea.hidden = true;
    this.#scroll.hidden = false;
    if (!this.#active()) return;
    if (this.#supports === false) { this.#showCatalog(true); return; }
    if (!this.#state) this.#message('Loading Matches…');
    void this.#read();
  }
  #showCatalog(fallback = false) {
    this.#cancel();
    this.#catalogSelected = !fallback;
    this.#scroll.hidden = true;
    this.#catalogArea.hidden = false;
    this.#back.hidden = fallback || this.#supports === false;
    this.#catalog.setVisible(this.#visible);
  }
  openOwnSignal() { this.#showCatalog(); this.#catalog.openOwnSignal(); }
  openRecommendation(...args: Parameters<MatchingPage['openRecommendation']>) {
    this.#showCatalog(); this.#catalog.openRecommendation(...args);
  }
  openResourceRecommendation(...args: Parameters<MatchingPage['openResourceRecommendation']>) {
    this.#showCatalog(); this.#catalog.openResourceRecommendation(...args);
  }
  async #read(allowCelebration = true): Promise<void> {
    if (!this.#active()) return;
    if (this.#pending || this.#writing) { this.#refreshAgain = true; return; }
    if (!this.client.connected) { this.#message('Reconnect to Cloud to open Matches.', true); return; }
    const request = new AbortController();
    this.#pending = request;
    const current = () => !request.signal.aborted && this.#active();
    try {
      if (this.#supports === undefined) {
        const me = await this.client.request<{memberNumber:number;features?:{matchingSwipe?:boolean}}>('GET','/v1/me');
        if (!current()) return;
        if (me.memberNumber !== this.recovery.owner) throw new Error('Account changed');
        this.#supports = me.features?.matchingSwipe === true;
      }
      if (!this.#supports) {
        if (this.#catalogArea.hidden) this.#showCatalog(true);
        return;
      }
      const fresh = await this.#api.load(request.signal);
      if (!current()) return;
      const previous = this.#state;
      this.#state = fresh;
      this.#visibilityMessage(fresh);
      if (this.#editor && previous?.self?.revision !== fresh.self?.revision) {
        this.#editor(); this.#editor = undefined;
        this.#message('Your saved card changed on another device.');
      }
      if (!this.#editor) this.#render();
      else this.#chrome();
      if (allowCelebration && this.#deck && previous?.self && fresh.mutualCount > previous.mutualCount) {
        const added = fresh.mutuals.find(p => !previous.mutuals.some(old => old.memberNumber === p.memberNumber));
        if (added) this.#deck.celebrate(added);
        else this.#message('You have a new mutual like.', false, {label:'Mutual likes', run:() => this.#navigate('mutual')});
      }
    } catch (error) {
      if (!current()) return;
      if (error instanceof CloudError && (error.status === 401 || error.status === 403)) this.#discardView();
      this.#message('Matches could not be loaded. Check your Cloud connection and try again.', true);
    } finally {
      if (this.#pending === request) {
        this.#pending = undefined;
        if (this.#refreshAgain) { this.#refreshAgain = false; void this.#read(); }
      }
    }
  }
  #navigate(view: View) {
    if (!this.#active() || !this.#state?.self || this.#writing || view === this.#view) return;
    if (this.#view === 'mutual') this.#state = this.#api.collapseMutualPages(this.#state);
    this.#scroll.scrollTop = 0;
    this.#view = view; this.#render();
  }
  async #write<T>(perform: (signal: AbortSignal) => Promise<T>, cardAction?: 'create' | 'update' | 'remove'): Promise<T> {
    if (!this.#active() || !this.client.connected || this.#writing) throw new Error('Matches is unavailable.');
    const signal = this.#lifetime.signal;
    this.#pending?.abort(); this.#pending = undefined;
    this.#refreshAgain = false; this.#writing = true;
    let updated = false;
    try {
      const result = await perform(signal);
      if (signal.aborted || !this.#active()) throw new Error('Account or view changed.');
      if (cardAction) {
        this.#editor?.(); this.#editor = undefined;
        updated = cardAction === 'update';
        if (!updated) this.#view = 'swipe';
        this.#state = undefined; this.#content.replaceChildren();
        this.#scroll.scrollTop = 0;
        this.#message('Loading your cards…'); this.#chrome();
      }
      return result;
    } finally {
      if (!signal.aborted && this.#active()) {
        this.#writing = false;
        await this.#read(false);
        if (updated && !signal.aborted && this.#active() && !this.#edit.hidden) {
          this.#deck?.notify('Card updated');
          const focused = focusedElement(this.#section);
          if (!focused || focused === document.body) this.#edit.focus({preventScroll:true});
        }
      }
    }
  }
  #editCard(focusHeading = false) {
    if (!this.#active() || this.#editor || !this.#state) return;
    const card = this.#state.self;
    this.#state = this.#api.collapseMutualPages(this.#state);
    this.#scroll.scrollTop = 0;
    this.#deck?.dispose(); this.#deck = undefined;
    this.#editor = mountMatchesSwipeEditor(this.#content, {
      memberNumber: this.recovery.owner, card,
      initialAvailable: this.#state.initialAvailable ?? true,
      loadImage: target => this.#api.image(target),
      onSave: async (draft, signal) => {
        try { await this.#write(() => this.#api.save(draft, card, signal), card ? 'update' : 'create'); }
        catch (error) {
          if (error instanceof CloudError && error.code === 'matching_discovery_required') {
            throw new Error('Enable profile discovery in Privacy settings to share your card.');
          }
          throw error;
        }
      },
      ...(card ? { onCancel: () => {
        this.#api.clearPending();
        this.#editor?.(); this.#editor = undefined; this.#scroll.scrollTop = 0;
        this.#render(); this.#edit.focus({preventScroll:true});
      }, onRemove: (signal:AbortSignal) => this.#write(() => this.#api.remove(card, signal), 'remove') } : {}),
    });
    this.#chrome();
    if (focusHeading) this.#content.querySelector<HTMLElement>('h2')?.focus({preventScroll:true});
  }
  #render() {
    const state = this.#state;
    if (!state || !this.#active()) return;
    if (!state.self) { this.#editCard(); return; }
    if (!this.#deck) this.#deck = createMatchesSwipeDeck(this.#content, {
      current: () => this.#active() && this.client.connected && !this.#editor,
      image: card => this.#api.image(card),
      moreMutuals: cursor => this.#api.moreMutuals(cursor, this.#lifetime.signal),
      navigate: view => this.#navigate(view),
      vote: (card, type, id) => this.#write(signal => this.#api.vote(card, type, id, signal)),
      undo: last => this.#write(signal => this.#api.undo(last, signal)),
    });
    this.#deck.update(state, this.#view);
    this.#chrome();
  }
  destroy() {
    this.setVisible(false);
    this.#destroyed = true;
    this.#catalog.destroy();
    this.element.remove();
  }
}
