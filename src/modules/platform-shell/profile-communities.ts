import { pageAction } from './page-action';
import { sectionLink } from './section-link';
import { ProfileReadContent } from './profile-read-content';
import { profileOptions } from './profile-controls';
import { CloudError, isTemporaryCloudReadError, type CloudClient } from '../../cloud/client';
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
  readonly #content = new ProfileReadContent();
  #confirmed = false;
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
    this.#unsubscribe = client.subscribe((kind, cause) => {
      if (kind === 'session' || kind === 'connection' || !options.current()) { this.setVisible(false); return; }
      if (this.#visible && ['privacy','profile-communities','relationships','profiles-cleared','ready'].includes(kind)) {
        this.#token++;
        const reconnect = kind === 'ready' || kind === 'profiles-cleared' && cause === 'ready';
        if (!reconnect && (this.#items.length || this.#next !== null)) {
          this.#confirmed = false;
          this.#items = [];
          this.#next = null;
          this.#render('', undefined, true);
        }
        if (!this.#refreshQueued) {
          this.#refreshQueued=true;
          queueMicrotask(()=>{this.#refreshQueued=false;if(this.#visible)void this.#load(this.#pages,undefined,true);});
        }
      }
    });
  }
  #active(): boolean { return this.#visible && this.options.current() && this.client.connected; }
  #button(text: string, fn: (button: HTMLButtonElement) => void, className = 'kl-text-button'): HTMLButtonElement {
    const button = element('button', {type:'button',className,text});
    const member = this.#member;
    button.addEventListener('click', () => {
      if (member === this.#member && button.isConnected && this.element.contains(button) && this.#active() && (this.#confirmed || !this.#busy)) fn(button);
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
    this.#confirmed=false; this.#content.clear(); this.element.hidden = true; this.element.replaceChildren(); this.#release?.(); this.#release = undefined;
  }
  destroy(): void { this.setVisible(false); this.#unsubscribe(); }
  async refresh(): Promise<void> { await this.#load(this.#pages); }
  async #load(pages: number, restorePosition?: () => void, automatic=false): Promise<void> {
    if (!this.#visible) return;
    if (!this.options.current()) { this.setVisible(false); return; }
    const token = ++this.#token, member = this.#member, limit = this.options.preview ? 3 : 20;
    const viewer=this.client.memberNumber, origin=this.client.origin;
    const valid = () => this.#active() && token === this.#token && viewer===this.client.memberNumber && origin===this.client.origin;
    this.#busy = true;
    if(!this.#confirmed&&(!automatic||!this.element.childElementCount))this.#render('Checking shared communities…');
    if (!this.client.connected) { this.#confirmed=false; this.#items = []; this.#next=null; this.#busy = false; this.#render('Reconnect to Cloud to see profile communities.'); return; }
    try {
      const me = await this.client.request<{memberNumber:number;features?:{profileCommunities?:boolean}}>('GET','/v1/me');
      if (!valid()) return;
      if (me.memberNumber !== this.client.memberNumber) throw new Error('Account changed');
      if (me.features?.profileCommunities !== true) { this.#confirmed=false; this.#items=[]; this.#next=null; this.#busy=false; this.#render('Profile communities are not available on this Cloud server yet.'); return; }
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
      this.#confirmed=true;
      this.#items = [...items.values()];
      this.#pages = loaded;
      this.#next = cursor;
      this.#busy = false;
      this.#render();
    } catch (error) {
      if (!valid()) return;
      this.#busy=false;
      const denied = error instanceof CloudError && [401,403,404].includes(error.status);
      if (automatic && this.#confirmed && isTemporaryCloudReadError(error)) return;
      this.#confirmed=false;this.#items=[];this.#next=null;
      this.#render(denied ? 'These communities are private or no longer shared with you.' : 'Profile communities could not load.', denied ? 'private' : 'retry');
    }
    restorePosition?.();
  }
  #render(message = '', state?: 'private'|'retry', revalidating=false): void {
    const content=this.#content;
    const retry=()=>this.#button('Retry',()=>void this.refresh(),'kl-text-button kl-profile-read-retry');
    if(state==='private'&&!this.options.preview) {
      content.show(this.element,[content.node('locked',message,()=>profileSectionLocked('kl-profile-view-as-locked','Communities are private',message,retry()))]);
      return;
    }
    const own=this.#member===this.client.memberNumber;
    const title=own?'Your communities':this.options.preview?'Communities in common':`${this.options.displayName?.()||'Profile'}’s communities`;
    const header=content.node('header',title,()=>{
      const node=element('header',{className:'kl-profile-section-heading'},element('h3',{text:title}));
      if(this.options.preview)node.append(sectionLink(this.#button('View all',()=>this.options.viewAll?.())));
      else {
        if(own)node.append(sectionLink(this.#button('Explore communities',()=>this.options.open(),'kl-text-button kl-profile-communities-explore')));
        node.append(profileOptions('Communities options',this.#button('Refresh communities',()=>void this.refresh()),...(own?[this.#button('Edit community privacy',this.options.privacy)]:[])));
      }
      return node;
    });
    const children:HTMLElement[]=[header];
    const note=message||(!revalidating&&!this.#items.length?(own?'No active communities to show.':'No visible communities to show.'):'');
    if(note)children.push(content.node('note',note,()=>element('p',{...(message?{role:'status'}:{}),className:'kl-profile-section-note',text:note})));
    const list=content.node('list','',()=>element('div',{className:'kl-profile-community-list'}));
    const rows=this.#items.map(item=>content.node('community:'+item.id,JSON.stringify([item.name,item.description,item.access,item.icon,item.color,item.shared]),()=>{
      const row=this.#button(item.name,()=>this.options.open(item.id),'kl-profile-community-row');
      row.dataset.communityId=item.id;
      return profileCommunityRow(item,row,own||item.shared);
    }));
    children.push(list);
    if(state==='retry')children.push(content.node('retry','',retry));
    if(!this.options.preview&&this.#next!==null)children.push(content.node('more','',()=>pageAction(this.#button('Load more communities',button=>{
      const seen = new Set(this.#items.map(item=>item.id));
      const restore = preserveProfilePagingPosition(button,()=>{
        const rows = [...this.element.querySelectorAll<HTMLButtonElement>('.kl-profile-community-row')];
        return rows.find(row=>!seen.has(row.dataset.communityId ?? '')) ?? rows.at(-1) ?? this.element.querySelector<HTMLElement>('.kl-profile-read-retry');
      });
      void this.#load(this.#pages+1,restore);
    }))));
    content.show(this.element,children,list,rows);
    for(const button of this.element.querySelectorAll<HTMLButtonElement>('button')){
      const disabled=this.#busy&&!this.#confirmed;
      if(button.disabled!==disabled)button.disabled=disabled;
    }
  }
}
