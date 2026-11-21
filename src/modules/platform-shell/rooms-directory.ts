import { element as makeElement } from '../../cloud/dom';
import { bindClockText } from '../../core/time-format';
import { CloudClient, CloudError } from '../../cloud/client';
import { kikiIcon } from '../link-chat/icons';
import { iconButton, searchField } from './browse-controls';
import { ShellActionMenu } from './action-menu';
import { fitPanelDialog } from './panel-dialog-layout';
import { RoomHistory, type RoomVisit } from './room-history';
import { spaceRead, SpaceRecoveryError } from '../../cloud/space-mutation-intent';
import { spaceAppearance, type SpaceAppearanceSource } from '../../../cloud/shared/space-appearance.mjs';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, props: NonNullable<Parameters<typeof makeElement>[1]> & { onClick?: () => void } = {}, ...children: Array<Node | string>): HTMLElementTagNameMap[K] {
  const { onClick, ...base } = props, node = makeElement(tag, base, ...children);
  if (onClick) node.addEventListener('click', onClick);
  return node;
}

export type RoomsMode = 'current' | 'lobbies' | 'spaces' | 'history';
export const ROOMS_MODE_KEY = 'kikilink:platform:rooms-mode:v1';
const MODES: Array<[RoomsMode, string]> = [['lobbies', 'Lobbies'], ['spaces', 'Spaces'], ['current', 'Current room'], ['history', 'History']];
interface Options {
  lobbies: HTMLElement; currentRoom: HTMLElement; spaces?: HTMLElement; history: RoomHistory; client?: CloudClient;
  current(): boolean; activate(mode: RoomsMode): void; create(): void;
  openLobby(visit: Extract<RoomVisit, { kind: 'lobby' }>): void; openSpace(id: string): void;
  openContext?(): void; closeContext?(): void;
  bindHistoryMenu?(target: HTMLElement, open: () => void): void;
}
interface HistoryRow { visit: RoomVisit; title: string; subtitle: string; appearance?: SpaceAppearanceSource; unavailable?: string }

/** One persistent navigation surface; the native and Cloud pages still own their operations. */
export class RoomsDirectory {
  readonly element = element('section', { className: 'kl-rooms-directory', ariaLabel: 'Rooms', hidden: true });
  readonly #tabs = element('div', { className: 'kl-rooms-modes', role: 'tablist', ariaLabel: 'Room views' });
  readonly #panels = new Map<RoomsMode, HTMLElement>();
  readonly #buttons = new Map<RoomsMode, HTMLButtonElement>();
  readonly #history = element('div', { className: 'kl-room-history' });
  readonly #search = element('input', { type: 'search', ariaLabel: 'Search visit history', placeholder: 'Search rooms…' });
  readonly #status = element('p', { className: 'kl-room-history-status', role: 'status' });
  readonly #results = element('div', { className: 'kl-room-history-results' });
  readonly #dialog = element('dialog', { className: 'kl-room-history-dialog kl-browse-dialog', ariaLabel: 'Clear visit history?' });
  readonly #clearError = element('p', { role: 'alert' });
  readonly #menu = new ShellActionMenu();
  readonly #create: HTMLButtonElement;
  readonly #unsubscribe: (() => void) | undefined;
  readonly #cloudOrigin: string | undefined;
  #visible = false; #mode: RoomsMode = 'lobbies'; #token = 0; #rows: HistoryRow[] = []; #notice = '';
  #release: (() => void) | undefined;
  #timer: ReturnType<typeof setInterval> | undefined;
  constructor(readonly options: Options) {
    this.#cloudOrigin = options.client?.origin;
    this.#create = element('button', { type: 'button', className: 'kl-text-button kl-text-button--primary', onClick: options.create }, kikiIcon('plus'), element('span', { text: 'Create Space' }));
    this.#create.hidden = !options.spaces;
    const context = iconButton('Your Space context', 'info', () => { if(this.#visible&&this.#current())options.openContext?.(); });
    context.classList.add('kl-rooms-context');context.hidden=!options.openContext;context.setAttribute('aria-haspopup','dialog');
    this.element.append(element('header', { className: 'kl-rooms-heading' }, element('h1', { text: 'Rooms' }), this.#create, context), this.#tabs);
    for (const [mode, label] of MODES) {
      const tab = element('button', { type: 'button', role: 'tab', text: label, onClick: () => options.activate(mode) });
      tab.id = `kl-rooms-${mode}`; tab.setAttribute('aria-controls', `kl-rooms-panel-${mode}`);
      this.#buttons.set(mode, tab); this.#tabs.append(tab);
      const panel = element('section', { className: 'kl-rooms-panel', role: 'tabpanel', hidden: true });
      panel.id = `kl-rooms-panel-${mode}`; panel.setAttribute('aria-labelledby', tab.id);
      this.#panels.set(mode, panel); this.element.append(panel);
    }
    this.#panels.get('lobbies')!.append(options.lobbies);
    this.#panels.get('current')!.append(options.currentRoom);
    this.#panels.get('spaces')!.append(options.spaces ?? element('div', { className: 'kl-room-history-empty' }, element('h2', { text: 'Connect to Cloud to view Spaces' })));
    const historyTab=this.#buttons.get('history')!;
    historyTab.title='Right-click or hold for history actions';historyTab.setAttribute('aria-haspopup','menu');
    this.#menu.element.id='kl-room-history-options';
    const openMenu=()=>this.#openHistoryMenu(historyTab);
    if(options.bindHistoryMenu)options.bindHistoryMenu(historyTab,openMenu);
    else {
      historyTab.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();openMenu();});
      historyTab.addEventListener('keydown',event=>{if(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey){event.preventDefault();event.stopPropagation();openMenu();}});
    }
    this.#search.maxLength = 100;
    this.#search.addEventListener('input', () => this.#renderHistory());
    this.#search.addEventListener('keydown', event => event.stopPropagation());
    this.#status.title = 'The last 50 room visits on this device, for this account. Times are local. Spaces appear while you still have access.';
    this.#history.append(element('div', { className: 'kl-room-history-toolbar' }, searchField(this.#search, 'Clear visit search')), this.#status, this.#results);
    this.#dialog.append(element('h2', { text: 'Clear visit history?' }), element('p', { text: 'Remove all saved room visits for this account on this device?' }), this.#clearError,
      element('div', { className: 'kl-room-history-actions' }, element('button', { type: 'button', className: 'kl-text-button', text: 'Cancel', onClick: () => this.#closeDialog(true) }),
        element('button', { type: 'button', className: 'kl-text-button kl-text-button--primary', text: 'Clear history', onClick: () => {
          if (!this.#visible || this.#mode !== 'history' || !this.#current()) { this.#closeDialog(false); return; }
          if (!options.history.clear()) { this.#clearError.textContent = 'History was not cleared. Check device storage, then try again.'; return; }
          this.#closeDialog(true); void this.refreshHistory();
        } })));
    this.#dialog.addEventListener('cancel', event => { event.preventDefault(); this.#closeDialog(true); });
    this.#dialog.addEventListener('keydown', event => event.stopPropagation());
    this.#panels.get('history')!.append(this.#history, this.#dialog);this.element.append(this.#menu.element);
    this.#tabs.addEventListener('keydown', event => {
      const index = MODES.findIndex(([mode]) => this.#buttons.get(mode) === event.target);
      if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? MODES.length - 1 : (index + MODES.length + (event.key === 'ArrowRight' ? 1 : -1)) % MODES.length;
      const mode = MODES[next]![0]; options.activate(mode); this.#buttons.get(mode)!.focus();
    });
    this.#unsubscribe = options.client?.subscribe(kind => {
      if (['session', 'ready', 'spaces', 'communities', 'relationships', 'profiles-cleared'].includes(kind)) {
        this.#menu.close(false);
        this.#create.disabled = !this.#current() || !options.client?.connected;
        // Never retain a previous session's names while access is being rechecked.
        if (this.#visible && this.#mode === 'history') void this.refreshHistory();
      }
    });
  }
  setVisible(visible: boolean, mode: RoomsMode): void {
    const historyChanged = this.#visible !== visible || this.#mode !== mode;
    this.#visible = visible; this.#mode = mode; this.element.hidden = !visible;
    this.#create.disabled = !this.#current() || !this.options.client?.connected;
    for (const [key, button] of this.#buttons) {
      button.setAttribute('aria-selected', String(key === mode)); button.tabIndex = key === mode ? 0 : -1;
      this.#panels.get(key)!.hidden = key !== mode;
    }
    if (historyChanged) {
      this.#menu.close(false);this.options.closeContext?.();
      clearInterval(this.#timer); this.#release?.(); this.#release = undefined;
      if (visible && mode === 'history') {
        this.#release = this.options.client?.retainEvents();
        this.#timer = setInterval(() => void this.refreshHistory(), 30000);
        void this.refreshHistory();
      } else { this.#token++; this.#closeDialog(false); this.#rows = []; this.#results.classList.remove('kl-room-history-loading'); this.#results.setAttribute('aria-busy','false'); this.#results.replaceChildren(); this.#status.textContent = ''; }
    }
  }
  destroy(): void { this.setVisible(false, this.#mode); this.#menu.destroy(); this.#unsubscribe?.(); }
  #current(): boolean { const client=this.options.client;return this.options.current()&&(!client||client.memberNumber===this.options.history.owner&&client.origin===this.#cloudOrigin); }
  #closeDialog(focus: boolean): void {
    if (!this.#dialog.open) return;
    this.#dialog.close();
    if (focus && this.#visible && this.#mode === 'history' && this.#current()) this.#buttons.get('history')!.focus({preventScroll:true});
  }
  #openHistoryMenu(anchor: HTMLButtonElement): void {
    if(!this.#visible||this.#mode!=='history'||!this.#current())return;
    this.#menu.open(anchor,'History actions',[
      {label:'Refresh history',icon:'refresh',run:()=>{if(this.#visible&&this.#mode==='history'&&this.#current())void this.refreshHistory();}},
      {label:'Clear history',icon:'trash',disabled:!this.options.history.items.length,run:()=>{
        if(!this.#visible||this.#mode!=='history'||!this.#current()||!this.options.history.items.length)return;
        this.#clearError.textContent='';this.#dialog.showModal();fitPanelDialog(this.#dialog);
      }},
    ],undefined,true);
  }
  async refreshHistory(): Promise<void> {
    if (!this.#visible || this.#mode !== 'history') return;
    const token = ++this.#token, client = this.options.client, member = client?.memberNumber, origin = client?.origin;
    const identity = () => this.#current() && (!client || client.memberNumber === member && client.origin === origin);
    const valid = () => token === this.#token && this.#visible && this.#mode === 'history' && identity();
    this.#rows = []; this.#notice = ''; this.#renderHistoryLoading(); this.#status.textContent = 'Loading visits…';
    this.#history.setAttribute('aria-busy', 'true');
    if (!identity()) { this.#closeDialog(false); this.#status.textContent = ''; this.#results.classList.remove('kl-room-history-loading'); this.#results.setAttribute('aria-busy','false'); this.#results.replaceChildren(); this.#history.setAttribute('aria-busy', 'false'); return; }
    this.options.history.retrySave();
    const items = this.options.history.items;
    const spaces = new Map<string, { name: string; communityName: string | null } & SpaceAppearanceSource>();
    const ids = [...new Set(items.flatMap(v => v.kind === 'space' && v.origin === origin && origin ? [v.id] : []))];
    let failed = false;
    if (client?.connected && ids.length) {
      let read: ReturnType<typeof spaceRead> | undefined;
      let sourceChanged = false;
      try {
        const metadata = await client.request<unknown>('GET', '/v1/me');
        if (!valid()) return;
        read = spaceRead(client, metadata);
      } catch { failed = true; }
      if (!valid()) return;
      if (read) {
        const checkedRead = read;
        for (let start = 0; start < ids.length; start += 4) {
          await Promise.all(ids.slice(start, start + 4).map(async id => {
            try {
              const space = await checkedRead.request<{ canRead: boolean; name: string; communityName: string | null } & SpaceAppearanceSource>(`/v1/spaces/${id}`);
              if (valid() && client.connected && space.canRead) spaces.set(id, {name:space.name,communityName:space.communityName,...spaceAppearance(space)});
            } catch (error) {
              if (error instanceof SpaceRecoveryError || error instanceof CloudError && error.status === 409) sourceChanged = true;
              if (!(error instanceof CloudError) || ![401, 403, 404].includes(error.status)) failed = true;
            }
          }));
          if (!valid()) return;
          if (sourceChanged) { spaces.clear(); break; }
        }
      }
    }
    if (!valid()) return;
    if (ids.length && !client?.connected) this.#notice = 'Connect to Cloud to see your Space visits.';
    else if (failed) this.#notice = 'Some Space visits could not be checked. Refresh to retry.';
    for (const visit of items) {
      if (visit.kind === 'lobby') this.#rows.push({ visit, title: visit.name, subtitle: `${visit.space === 'X' ? 'Mixed' : visit.space === 'M' ? 'Male' : 'Female'} · BC lobby` });
      else if(!visit.origin||visit.origin!==origin){this.#rows.push({visit,title:'Saved Space',subtitle:visit.id,unavailable:!visit.origin?'Cloud source unknown':!origin?'Connect to Cloud':'From another Cloud'});}
      else { const space = spaces.get(visit.id); if (space) this.#rows.push({ visit, title: space.name, subtitle: space.communityName || 'Independent Space', appearance: space }); }
    }
    this.#history.setAttribute('aria-busy', 'false'); this.#renderHistory();
  }
  #renderHistoryLoading(): void {
    this.#results.classList.add('kl-room-history-loading'); this.#results.setAttribute('aria-busy', 'true');
    this.#results.replaceChildren(...Array.from({ length: 4 }, () => element('div', { className: 'kl-room-history-skeleton', ariaHidden: 'true' },
      element('span', { className: 'kl-room-history-skeleton-icon' }), element('span', { className: 'kl-room-history-skeleton-copy' },
        element('span', { className: 'kl-room-history-skeleton-line' }), element('span', { className: 'kl-room-history-skeleton-line' })))));
  }
  #renderHistory(): void {
    this.#results.classList.remove('kl-room-history-loading'); this.#results.setAttribute('aria-busy', 'false');
    if (!this.#current()) { this.#rows = []; this.#results.replaceChildren(); this.#status.textContent = ''; return; }
    const query = this.#search.value.trim().toLocaleLowerCase();
    const rows = this.#rows.filter(row => `${row.title} ${row.subtitle}`.toLocaleLowerCase().includes(query));
    const notice=[this.options.history.error,this.#notice].filter(Boolean).join(' · ');
    this.#status.dataset.countOnly=String(!notice);
    this.#status.replaceChildren(...(notice?[notice+' · ']:[]),element('span',{className:'kl-room-history-count',text:`${rows.length} ${rows.length === 1 ? 'visit' : 'visits'}`}));
    this.#results.replaceChildren(...rows.map(({ visit, title, subtitle, appearance, unavailable }) => {
      const time = element('time'); bindClockText(time, visit.at, 'medium-date-time'); time.dateTime = new Date(visit.at).toISOString();
      const identity = spaceAppearance(appearance), icon = element('span', { className: 'kl-room-history-icon', ariaHidden: 'true' }, kikiIcon(identity.icon === 'sparkles' ? 'activities' : identity.icon));
      icon.dataset.color = identity.color;
      return element('article', { className: 'kl-room-history-row' }, icon,
        element('div', { className: 'kl-room-history-copy' }, element('strong', { text: title, title: subtitle }), element('small', {}, 'Visited ', time, unavailable?` · ${unavailable}`:'')),
        element('button', { type: 'button', className: 'kl-text-button', text: unavailable?'Unavailable':visit.kind === 'space' ? 'Open' : 'Find room', ariaLabel: `${unavailable?'Unavailable':visit.kind === 'space' ? 'Open' : 'Find'} ${title}`, ...(unavailable?{disabled:true,title:`${unavailable}. Saved Space ID: ${visit.kind==='space'?visit.id:''}`}:{ }), onClick: () => {
          if (unavailable || !this.#current()) return;
          if (visit.kind === 'space') this.options.openSpace(visit.id); else this.options.openLobby(visit);
        } }));
    }));
    if (!rows.length) this.#results.append(element('div', { className: 'kl-room-history-empty' }, kikiIcon('door'), element('h2', { text: query ? 'No matching visits' : 'No visits yet' }),
      element('p', { text: query ? 'Try another name or clear your search.' : 'Rooms you visit will appear here.' }), element('button', { type: 'button', className: 'kl-text-button kl-text-button--primary', text: query ? 'Clear search' : 'Explore rooms', onClick: () => {
        if (query) { this.#search.value = ''; this.#renderHistory(); this.#search.focus(); } else this.options.activate('spaces');
      } })));
  }
}
