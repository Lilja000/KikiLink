import { profileOptions } from './profile-controls';
import { CloudError, type CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { kikiIcon } from '../link-chat/icons';
import { communityIcon } from './community-design';
import { preserveProfilePagingPosition } from './profile-read-paging';
import { profileSectionLocked } from './profile-visibility-view';

export interface ProfileCommunitySummary { name: string; description: string; access: 'public'|'request'|'private'; icon?: string; color?: string; }
interface Item extends ProfileCommunitySummary { id: string; shared: boolean; }
interface Page { memberNumber: number; items: Item[]; nextCursor: number | null; }
const ACCESS_LABELS = { public: 'Public', request: 'Request only', private: 'Private' };

export function profileCommunityRow(item:ProfileCommunitySummary,button?:HTMLButtonElement,member=false):HTMLElement {
  const row=button??element('article',{className:'kl-profile-community-row'});
  const details=[ACCESS_LABELS[item.access],item.description,member?'You’re a member':''].filter(Boolean).join(' · ');
  row.replaceChildren(communityIcon(item),element('span',{className:'kl-profile-row-copy'},
    element('strong',{text:item.name}),element('small',{text:details,title:details})),...(button?[kikiIcon('arrow-right')]:[]));
  return row;
}
function checked(data: Page, member: number, limit: number, cursor: number): Page {
  if (!data || data.memberNumber !== member || !Array.isArray(data.items) || data.items.length > limit ||
    (data.nextCursor !== null && (!data.items.length || !Number.isSafeInteger(data.nextCursor) || data.nextCursor <= 0 || cursor > 0 && data.nextCursor >= cursor))) throw new Error('Invalid communities');
  const ids = new Set<string>();
  for (const item of data.items) {
    if (!item || typeof item.id !== 'string' || !/^[a-f0-9-]{36}$/.test(item.id) || ids.has(item.id) ||
      typeof item.name !== 'string' || !item.name || item.name.length > 64 || typeof item.description !== 'string' || item.description.length > 180 ||
      !['public','request','private'].includes(item.access) || typeof item.shared !== 'boolean') throw new Error('Invalid community');
    ids.add(item.id);
  }
  return data;
}

/** No persistent membership cache. Every page is filtered by the server's live ACL. */
export class ProfileCommunities {
  readonly element = element('section', { className: 'kl-profile-communities', hidden: true });
  readonly #unsubscribe: () => void;
  #member = 0;
  #visible = false;
  #token = 0;
  #busy = false;
  #refreshQueued = false;
  #pages = 1;
  #items: Item[] = [];
  #next: number | null = null;
  #release: (() => void) | undefined;
  constructor(readonly client: CloudClient, readonly options: {
    current(): boolean; open(id?: string): void; privacy(): void; displayName?(): string; preview?: boolean; viewAll?(): void;
  }) {
    this.#unsubscribe = client.subscribe(kind => {
      if (kind === 'session' || kind === 'connection' || !options.current()) { this.setVisible(false); return; }
      if (this.#visible && ['privacy','profile-communities','relationships','profiles-cleared','ready'].includes(kind)) {
        this.#token++; this.#items=[]; this.#next=null; this.#busy=true; this.#render('Checking shared communities…');
        if (!this.#refreshQueued) {
          this.#refreshQueued=true;
          queueMicrotask(()=>{this.#refreshQueued=false;if(this.#visible)void this.refresh();});
        }
      }
    });
  }
  #active(): boolean { return this.#visible && this.options.current() && this.client.connected; }
  #button(text: string, fn: (button: HTMLButtonElement) => void, className = 'kl-text-button'): HTMLButtonElement {
    const button = element('button', {type:'button',className,text});
    const token = this.#token, member = this.#member;
    button.addEventListener('click', () => {
      if (token === this.#token && member === this.#member && button.isConnected && this.element.contains(button) && this.#active() && !this.#busy) fn(button);
    });
    return button;
  }
  open(member: number): void {
    if (!this.options.current()) { this.setVisible(false); return; }
    if (this.#member !== member) this.setVisible(false);
    this.#member = member;
    if (this.#visible) return;
    this.#visible = true; this.element.hidden = false; this.#release = this.client.retainEvents(); void this.refresh();
  }
  setVisible(_visible: false): void {
    this.#visible = false; this.#token++; this.#busy = false; this.#items = []; this.#next = null; this.#pages = 1;
    this.element.hidden = true; this.element.replaceChildren(); this.#release?.(); this.#release = undefined;
  }
  destroy(): void { this.setVisible(false); this.#unsubscribe(); }
  async refresh(): Promise<void> { await this.#load(1); }
  async #load(pages: number, restorePosition?: () => void): Promise<void> {
    if (!this.#visible) return;
    if (!this.options.current()) { this.setVisible(false); return; }
    const token = ++this.#token, member = this.#member, limit = this.options.preview ? 3 : 20;
    const valid = () => this.#active() && token === this.#token;
    this.#busy = true;
    this.#items = [];
    this.#next = null;
    this.#render('Checking shared communities…');
    if (!this.client.connected) { this.#items = []; this.#busy = false; this.#render('Reconnect to Cloud to see profile communities.'); return; }
    try {
      const me = await this.client.request<{memberNumber:number;features?:{profileCommunities?:boolean}}>('GET','/v1/me');
      if (!valid()) return;
      if (me.memberNumber !== this.client.memberNumber) throw new Error('Account changed');
      if (me.features?.profileCommunities !== true) { this.#items=[]; this.#next=null; this.#busy=false; this.#render('Profile communities are not available on this Cloud server yet.'); return; }
      const scope = this.options.preview && member !== this.client.memberNumber ? 'mutual' : 'all';
      const items = new Map<string, Item>();
      let cursor: number | null = 0, loaded = 0;
      while (loaded < pages && cursor !== null) {
        const result = checked(await this.client.request<Page>('GET',`/v1/profiles/${member}/communities?scope=${scope}&limit=${limit}&cursor=${cursor}`),member,limit,cursor);
        if (!valid()) return;
        for (const item of result.items) {
          if (items.has(item.id)) throw new Error('Duplicate community across pages');
          items.set(item.id,item);
        }
        cursor = result.nextCursor;
        loaded++;
      }
      this.#items = [...items.values()];
      this.#pages = loaded;
      this.#next = cursor;
      this.#busy = false;
      this.#render();
    } catch (error) {
      if (!valid()) return;
      this.#items=[]; this.#next=null; this.#busy=false;
      const denied = error instanceof CloudError && [401,403,404].includes(error.status);
      this.#render(denied ? 'These communities are private or no longer shared with you.' : 'Profile communities could not load.', denied ? 'private' : 'retry');
    }
    restorePosition?.();
  }
  #render(message = '', state?: 'private'|'retry'): void {
    const retry = () => this.#button('Retry',()=>void this.refresh(),'kl-text-button kl-profile-read-retry');
    if (state === 'private' && !this.options.preview) {
      this.element.replaceChildren(profileSectionLocked('kl-profile-view-as-locked','Communities are private',message,retry()));
      return;
    }
    const own = this.#member === this.client.memberNumber;
    const title = own ? 'Your communities' : this.options.preview ? 'Communities in common' : `${this.options.displayName?.() || 'Profile'}’s communities`;
    const header = element('header', {className:'kl-profile-section-heading'}, element('h3',{text:title}));
    if (this.options.preview) header.append(this.#button('View all',()=>this.options.viewAll?.()));
    else {
      if (own) header.append(this.#button('Explore communities',()=>this.options.open(),'kl-text-button kl-profile-communities-explore'));
      header.append(profileOptions('Communities options', this.#button('Refresh communities',()=>void this.refresh()), ...(own ? [this.#button('Edit community privacy',this.options.privacy)] : [])));
    }
    this.element.replaceChildren(header);
    if (message) this.element.append(element('p',{role:'status',className:'kl-profile-section-note',text:message}));
    if (!message && !this.#items.length) this.element.append(element('p',{className:'kl-profile-section-note',text:own?'No active communities to show.':'No visible communities to show.'}));
    const list = element('div',{className:'kl-profile-community-list'});
    for(const item of this.#items) {
      const button = this.#button(item.name,()=>this.options.open(item.id),'kl-profile-community-row');
      button.dataset.communityId = item.id;
      list.append(profileCommunityRow(item,button,own||item.shared));
    }
    this.element.append(list);
    if(state==='retry')this.element.append(retry());
    if(!this.options.preview&&this.#next!==null)this.element.append(this.#button('More communities',button=>{
      const seen = new Set(this.#items.map(item=>item.id));
      const restore = preserveProfilePagingPosition(button,()=>{
        const rows = [...this.element.querySelectorAll<HTMLButtonElement>('.kl-profile-community-row')];
        return rows.find(row=>!seen.has(row.dataset.communityId ?? '')) ?? rows.at(-1) ?? this.element.querySelector<HTMLElement>('.kl-profile-read-retry');
      });
      void this.#load(this.#pages+1,restore);
    }));
    for(const button of this.element.querySelectorAll<HTMLButtonElement>('button'))button.disabled=this.#busy;
  }
}
