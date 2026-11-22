import type { CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { ContentDialog } from '../link-chat/content-dialog';
import { readPeopleDirectoryPages, type PeopleDirectoryPerson } from './people-directory';

/** Explicit Cloud discovery, separate from native friends and the private notebook. */
export class PeopleDiscovery {
  readonly #dialog = new ContentDialog();
  readonly element = this.#dialog.element;
  readonly #search = element('input', { type:'search', ariaLabel:'Search shared profiles', placeholder:'Name, username or member number', maxLength:80 });
  readonly #results = element('section', { className:'kl-people-discovery-results' });
  readonly #submit = element('button', { type:'submit', className:'kl-text-button', text:'Search profiles' });
  readonly #unsubscribe: () => void;
  #visible = false;
  #busy = false;
  #token = 0;
  #queued = false;
  #pages = 0;
  #items: PeopleDirectoryPerson[] = [];
  #next: number | null = null;
  #release: (()=>void) | undefined;
  constructor(readonly client: CloudClient, readonly options: {
    current(): boolean; profile(member:number,name:string):void; privacy():void;
  }) {
    this.element.classList.add('kl-people-discovery');
    this.#unsubscribe = client.subscribe((kind, cause) => {
      if (!options.current() || kind==='session' || kind==='connection') { this.close(); return; }
      if (this.#visible && ['profile-discovery','privacy','profiles-cleared','ready'].includes(kind)) {
        if (kind === 'profiles-cleared' && cause === 'ready' || kind === 'ready' && this.#busy) return;
        if (kind !== 'ready') {
          this.#clear(); this.#busy = true; this.#render('Loading shared profiles…');
        }
        if (!this.#queued) {
          this.#queued = true;
          queueMicrotask(() => { this.#queued = false; if (this.#visible) void this.#load(0, this.#pages > 0); });
        }
      }
    });
    this.#search.addEventListener('input',()=>{this.#clear();this.#render('Search to update results.');});
  }
  #active(): boolean { return this.#visible && this.options.current() && this.client.connected; }
  #clear(): void { this.#token++; this.#items=[];this.#next=null;this.#pages=0;this.#busy=false; }
  #button(label:string,fn:()=>void):HTMLButtonElement {
    const button=element('button',{type:'button',className:'kl-text-button',text:label});
    button.addEventListener('click',()=>{if(this.#active()&&!this.#busy)fn();});return button;
  }
  open(): void {
    if (!this.options.current() || this.#visible) return;
    this.#visible=true;this.#search.value='';this.#release=this.client.retainEvents();
    const form=element('form',{className:'kl-people-discovery-search'},this.#search,this.#submit);
    form.addEventListener('submit',e=>{e.preventDefault();if(!this.#busy)void this.#load();});
    this.#dialog.show('Discover people',element('div',{},
      form,this.#results,this.#button('Edit profile discovery',()=>{this.close();this.options.privacy();})),()=>this.#hidden());
    void this.#load();
  }
  #hidden(): void { this.#visible=false;this.#clear();this.#results.replaceChildren();this.#search.value='';this.#release?.();this.#release=undefined; }
  close(): void { this.#hidden();this.#dialog.close(); }
  destroy(): void { this.close();this.#unsubscribe();this.#dialog.destroy(); }
  #day = 0;
  async #load(cursor=0,quiet=false): Promise<void> {
    if (!this.#visible) return;
    if (!this.options.current()) {this.close();return;}
    const token=++this.#token, query=this.#search.value.trim();
    const current=()=>this.#active()&&token===this.#token;
    const pages = quiet ? this.#pages : 1;
    if (!cursor) {
      if (!quiet) { this.#items = []; this.#next = null; this.#pages = 0; }
      this.#day = Math.floor(Date.now()/86400000);
    }
    if (!quiet) { this.#busy=true;this.#render('Loading shared profiles…'); }
    if (!this.client.connected) {this.#clear();this.#render('Connect to Cloud to discover shared profiles.');return;}
    try {
      const me=await this.client.request<{memberNumber:number;features?:{profileDiscovery?:boolean;peopleSuggestions?:boolean}}>('GET','/v1/me');
      if (!current()) return;
      if (me.memberNumber!==this.client.memberNumber) throw new Error('Account changed');
      if (me.features?.profileDiscovery!==true) {this.#clear();this.#render('Profile discovery is not available on this Cloud server yet.');return;}
      const page=await readPeopleDirectoryPages(this.client,me.memberNumber,query,cursor,pages,me.features.peopleSuggestions===true && !query ? this.#day : undefined,current);
      if (!page || !current()) return;
      if (quiet && page.nextCursor === this.#next && JSON.stringify(page.items) === JSON.stringify(this.#items)) return;
      this.#pages = cursor ? this.#pages + 1 : pages;
      this.#items=cursor ? [...this.#items,...page.items] : page.items;this.#next=page.nextCursor;this.#busy=false;this.#render();
    } catch {
      if (!current()) return;
      this.#clear();this.#render('Shared profiles could not load. Refresh to try again.');
    }
  }
  #render(message=''): void {
    this.#submit.disabled=this.#busy;
    this.#results.replaceChildren();
    if(message)this.#results.append(element('p',{role:'status',className:'kl-setting-help',text:message}));
    if(!message&&!this.#items.length)this.#results.append(element('p',{role:'status',text:'No shared profiles found.'}));
    for(const person of this.#items){
      const row=this.#button(person.displayName,()=>{this.close();this.options.profile(person.memberNumber,person.displayName);});
      row.classList.add('kl-people-discovery-person');row.dataset.member=String(person.memberNumber);
      row.replaceChildren(element('strong',{text:person.displayName}),element('span',{text:[person.username?`@${person.username}`:'',`#${person.memberNumber}`].filter(Boolean).join(' · ')}));
      row.disabled=this.#busy;this.#results.append(row);
    }
    const actions=element('div',{className:'kl-setting-tool-buttons'},this.#button('Refresh profiles',()=>void this.#load()));
    if(this.#next!==null)actions.append(this.#button('More profiles',()=>void this.#load(this.#next!)));
    for(const b of actions.querySelectorAll<HTMLButtonElement>('button'))b.disabled=this.#busy;
    this.#results.append(actions);
  }
}
