import { pageAction } from './page-action';
import { preserveSelectionFocus } from "./browse-focus";
import { markMemberAvatar } from "../link-chat/avatar-presence";
import { ShellActionMenu, type ShellAction } from './action-menu';
import { MatchingSearch, matchCardReasons, matchWeeklyOverlap, matchConnectionsButton, matchEmptySuggestions, matchFilterButton, matchingBrowseSelection, matchOptionsButton, matchOptionsSelector, matchScopeControls, matchSuggestionCount, type MatchingBrowseSelection } from './matching-browse-controls';
import { matchingBreakdown } from './matching-breakdown';
import { matchingCatalogError, matchingCatalogLoading, matchingCatalogReadFailed } from './matching-catalog-state';
import { MatchingInformation, matchingInformationButton } from './matching-information';
import { MatchingHiddenSuggestions } from './matching-hidden-suggestions';
import { MatchingHideSuggestion } from './matching-hide-suggestion';
import { confirmedHide, hiddenSuggestionNotice, hideSuggestionLabel, matchesConfirmedHide, staleHideMessage, type ConfirmedHide } from './matching-hide-undo';
import { focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';
import {matchingReadAt,sameMatchingSource,matchingGroupSource,matchingPendingText,matchingResourceMutation,MatchingGenerationError,type MatchingSource} from './matching-generation';
import {communityManagementRead} from '../../cloud/moderation-generation';
import {CloudError,isTemporaryCloudReadError,type CloudClient} from '../../cloud/client';
import {fitPanelDialog} from './panel-dialog-layout';
import type {KeyValueStorage} from '../../core/settings';
import {element} from '../../cloud/dom';
import {bindClockText} from '../../core/time-format';
import {eventRange,localZone} from './event-time';
import {MATCH_INTENTS,matchLanguageOptions,MATCH_INTERESTS,MATCH_STATES,type MatchOwn} from '../../../cloud/shared/matching.mjs';
import {DEFAULT_MATCH_GROUP,DEFAULT_RESOURCE_FILTERS,type MatchResourceKind,type MatchResource,type OwnedMatchGroup,type GroupMatchRequest,type ResourceFilters,type ResourceChoice} from '../../../cloud/shared/matching-resources.mjs';
import {checkedMatchOwn} from './matching-model';
import {checkedResource,checkedResourcePage,checkedOwnedGroup,checkedOwnedGroups,checkedGroupRequest,checkedGroupRequests,checkedResourceChoices} from './matching-resources-model';
import {MatchingRecovery,type MatchingPending,type MatchingLock} from './matching-recovery';
import {MatchingGroupEditor} from './matching-group-editor';
import { MatchingSignalEditor, matchSettingsLabel, matchingSignalNeededBody, matchingSignalNeededTitle, signalWithExpiry } from './matching-signal-editor';
const note=(text:string)=>element('p',{className:'kl-match-meta',text});
const groupRequestLimit = 240;
class MatchingResourceUnavailable extends Error {
 constructor() { super('This resource is unavailable.'); }
}
interface GroupRequestDraft {
 id: string;
 intent: string;
 message: string;
 resource: MatchResource;
 own: MatchOwn;
 source: MatchingSource;
}
type GroupDecision = 'Accepted' | 'Declined' | 'Cancelled';
type HiddenOpener = 'information' | 'options' | 'empty';
type ResourceDialogLayout = 'group-request' | 'group-details' | 'resource-why' | 'filters' | 'signal-needed';
type SheetSelect = 'intent' | 'language' | 'interest' | 'community' | 'timezone' | 'priority';
type ResourceBrowseFilters = Omit<ResourceFilters, 'priority'> & Pick<MatchingBrowseSelection, 'priority'>;

function resourcePriority(priority: ResourceBrowseFilters['priority']): ResourceFilters['priority'] {
  return priority === 'compatibility' ? 'balanced' : priority;
}

const resourceIcon = { groups: 'users', rooms: 'door', events: 'calendar' } as const;
const resourceTypeLabel = { groups: 'Groups', rooms: 'Rooms', events: 'Events' } as const;
const saveSignalLabel = 'Save your original signal';
interface Options{current():boolean;blocked(n:number):boolean;profile(n:number,name:string):void;privacy?():void;connections?():void;openEventMatches?():void;connectionCount?():number;refreshConnectionCount?():void;preferences?():void;navigation?:HTMLElement;space?(id:string):void;event?(id:string):void;community?(id:string):void;lock?:MatchingLock;busyChanged?(value:boolean):void;
 browseChanged?():void;
}
export class MatchingResourcesPage {
 readonly element=element('section',{className:'kl-match-resources',ariaLabel:'Matching resources'});
 readonly recovery:MatchingRecovery;
 readonly body=element('div');readonly dialog=element('dialog',{className:'kl-match-dialog'});
 readonly results = element('div', { role: 'tabpanel', tabIndex: 0 });
 readonly #cardMenu=new ShellActionMenu('explore');
 readonly #optionsMenu = new ShellActionMenu('explore');
 readonly #hiddenSuggestions = new MatchingHiddenSuggestions();
 readonly #hideSuggestion = new MatchingHideSuggestion();
 #lastHide: ConfirmedHide | undefined;
 readonly #information = new MatchingInformation(
   () => this.current() && this.client.connected,
   () => this.#focusInformationTrigger(),
 );
 #own:MatchOwn|undefined;
 #ownObservedAt = 0;
 #pages = 0;
 #poll: ReturnType<typeof setInterval> | undefined;
 #background: symbol | undefined;
 #checkAgain = false;
 #openSignalAfterRefresh = false;
 #signalEditor: { editor: MatchingSignalEditor; source: MatchingSource; returnFocus: string } | undefined;
 #signalFocusAfterRefresh: string | undefined;
 #pendingSignalOpener: { operationId: string; target: string } | undefined;
 #visible=false;#kind:MatchResourceKind='groups';#page:'browse'|'requests'|'owned'='browse';#busy=false;#epoch=0;#refreshAfter=false;#release:(()=>void)|undefined;#timer:ReturnType<typeof setTimeout>|undefined;readonly unsubscribe:()=>void;
 #pending:MatchingPending|null=null;#storageError='';#error='';#items:MatchResource[]=[];#requests:GroupMatchRequest[]=[];#owned:OwnedMatchGroup[]=[];#next:string|number|null=null;#limited=false;#scope='all';#state='all';#filters:ResourceBrowseFilters=structuredClone(DEFAULT_RESOURCE_FILTERS);#editor:MatchingGroupEditor|undefined;#draft:GroupRequestDraft|undefined;
 readonly #resourceDialogTitleId = `kl-match-resource-dialog-${crypto.randomUUID()}`;
 #resourceDialogReturnFocus: string | undefined;
 #finderRecommendationHost: number | undefined;
 #releaseResourceDialogFit: (() => void) | undefined;
 #restoreFilterFocus = false;
 #catalogState: 'loading' | 'error' | undefined;
 readonly #search = new MatchingSearch(
   () => this.current() && this.#page === 'browse' && !this.#busy,
   () => void this.refresh(),
 );
 #source:MatchingSource={required:false};#sources=new WeakMap<object,MatchingSource>();#editorSource:MatchingSource|undefined;
 bind<T extends object>(value:T,source=this.#source):T{this.#sources.set(value,source);return value;}
 source(value:object):MatchingSource{return this.#sources.get(value)??this.#source;}
 read<T>(path:string,source=this.#source):Promise<T>{return matchingReadAt(this.client,source)<T>(path);}
 constructor(readonly client:CloudClient,storage:KeyValueStorage,readonly options:Options){
   this.recovery=new MatchingRecovery(client,storage,options.current,options.lock);
   this.#cardMenu.element.dataset.matchCardMenu='resources';
   this.body.append(this.results);
   this.element.append(this.body,this.dialog,this.#information.element,this.#cardMenu.element,this.#optionsMenu.element,this.#hiddenSuggestions.element,this.#hideSuggestion.element);
   this.element.hidden=true;
   this.dialog.oncancel = event => {
     event.preventDefault();
     const editor = this.#openEditor();
     if (editor) editor.requestClose();
     else this.dialog.close();
   };
   this.dialog.addEventListener('keydown', event => {
     if (event.key === 'Escape') event.stopPropagation();
   });
   this.dialog.addEventListener('close', () => {
     if (this.dialog.open) return;
     if (this.dialog.dataset.layout === 'resource-why') this.#finderRecommendationHost = undefined;
     const target = this.#resourceDialogReturnFocus;
     this.#clearResourceDialogLayout();
     if (target && !this.#signalFocusAfterRefresh) this.#focusOpener(target);
   });
   this.unsubscribe=client.subscribe((kind, cause)=>{
     if(!options.current()||client.memberNumber!==this.recovery.owner||client.origin!==this.recovery.origin){this.clear(true);return;}
     if(!this.#visible)return;
     if (kind === 'connection' && !client.connected) this.#openSignalAfterRefresh = false;
     if (this.#finderRecommendationHost !== undefined && kind === `profile:${this.#finderRecommendationHost}`) {
       this.#finderRecommendationHost = undefined;
       this.invalidate();
       return;
     }
     if (kind === 'profiles-cleared' && cause === 'ready') return;
     const catalogHint = kind === 'matching' || kind === 'spaces' && this.#kind === 'rooms' ||
       kind === 'calendar' && this.#kind === 'events';
     const reconnect = kind === 'ready' || kind === 'connection' && client.connected;
     if (catalogHint || reconnect) {
       if (kind === 'matching') this.#hiddenSuggestions.refresh();
       const reviewing = this.dialog.open || this.#hideSuggestion.element.open || this.#information.element.open;
       if (reviewing || catalogHint && (this.#busy || this.#page !== 'browse')) this.invalidate(kind === 'matching');
       else void this.#checkBackground();
     } else if (['session','privacy','profiles-cleared','profile-discovery','profile-friends','profile-communities','relationships','communities','connection'].includes(kind)) {
       this.invalidate();
     }
   });
 }
 get busy(){return this.#busy;}
 get browseSelection(): MatchingBrowseSelection {
   return matchingBrowseSelection(this.#filters);
 }
 focusBrowseSearch(): void {
   this.body.querySelector<HTMLInputElement>('.kl-match-search input')?.focus({ preventScroll: true });
 }
 openOwnSignal(): void {
   if (!this.current() || !this.client.connected || !this.element.isConnected ||
     this.dialog.open || this.#search.composing) return;
   this.#openSignalAfterRefresh = true;
   if (!this.#busy) void this.refresh();
 }
 showBrowse(): void {
   if (this.#page === 'browse') return;
   this.#page = 'browse';
   if (this.current()) void this.refresh();
 }
 openFinderRecommendation(id: string, host: number): void {
   if (!this.current() || this.#busy || this.dialog.open || this.#search.composing ||
     !this.client.connected || !this.allowed(host)) return;
   this.#finderRecommendationHost = host;
   void this.why(id, undefined, 'finder', host).finally(() => {
     if (this.#finderRecommendationHost === host &&
       (!this.dialog.open || this.dialog.dataset.layout !== 'resource-why')) this.#finderRecommendationHost = undefined;
   });
 }
 current=()=>this.#visible&&this.options.current()&&this.client.memberNumber===this.recovery.owner&&this.client.origin===this.recovery.origin;
 valid(){const epoch=this.#epoch;return()=>this.current()&&epoch===this.#epoch;}
 allowed(n:number){try{return !this.options.blocked(n);}catch{return false;}}
 #openEditor(): MatchingGroupEditor | MatchingSignalEditor | undefined {
   if (this.#editor && this.dialog.contains(this.#editor.element)) return this.#editor;
   const signal = this.#signalEditor?.editor;
   if (signal && this.dialog.contains(signal.element)) return signal;
 }
 clear(own=false){this.#pages=0;this.#background=undefined;this.#checkAgain=false;this.#finderRecommendationHost=undefined;this.#openSignalAfterRefresh=false;this.#search.cancel();clearTimeout(this.#timer);this.#epoch++;this.#lastHide=undefined;this.#items=[];this.#requests=[];this.#owned=[];this.#own=undefined;this.#next=null;this.#pending=null;this.#busy=false;this.#catalogState=undefined;this.#refreshAfter=false;this.#restoreFilterFocus=false;this.#signalFocusAfterRefresh=undefined;this.#pendingSignalOpener=undefined;this.dialog.close();this.#information.close();this.#hiddenSuggestions.close(false);this.#hideSuggestion.close();if(own){this.#editor=undefined;this.#editorSource=undefined;this.#draft=undefined;this.#signalEditor=undefined;}if(!this.#openEditor())this.dialog.replaceChildren();this.draw();}
 setVisible(value:boolean){if(value===this.#visible)return;this.#visible=value;this.element.hidden=!value;clearTimeout(this.#timer);if(value){this.#release=this.client.retainEvents();this.#poll=setInterval(()=>void this.#checkBackground(),60000);void this.refresh();}else{clearInterval(this.#poll);this.#release?.();this.#release=undefined;this.clear();}}
 setKind(kind: MatchResourceKind, selection?: MatchingBrowseSelection): void {
   const applied = selection && { ...selection, sort: selection.sort === 'compatibility' ? 'recommended' : selection.sort };
   if (kind !== this.#kind) {
     this.#kind = kind;
     this.#page = 'browse';
     this.#filters = structuredClone(DEFAULT_RESOURCE_FILTERS);
   } else if (!applied || (Object.keys(applied) as Array<keyof MatchingBrowseSelection>)
     .every(key => applied[key] === this.#filters[key])) return;
   if (applied) Object.assign(this.#filters, applied);
   this.clear();
   if (this.current()) void this.refresh();
 }
 destroy(){this.setVisible(false);this.unsubscribe();this.clear(true);this.dialog.remove();this.#information.element.remove();this.#hiddenSuggestions.element.remove();this.#hideSuggestion.element.remove();this.#cardMenu.destroy();this.#optionsMenu.destroy();}
 invalidate(keepHidden=false){this.#background=undefined;this.#pages=0;this.#checkAgain=false;this.#hideSuggestion.close();if(!keepHidden)this.#hiddenSuggestions.close(false);this.#information.close();this.#items=[];this.#requests=[];this.#owned=[];this.#own=undefined;this.#next=null;if(!this.#openEditor()){this.dialog.close();this.dialog.replaceChildren();}if(this.#search.composing)this.results.replaceChildren(matchingCatalogLoading());if(this.#busy||this.#search.composing){this.#refreshAfter=true;this.draw();}else void this.refresh();}
 readPending(){this.#storageError='';try{this.#pending=this.recovery.read();}catch(e){this.#pending=null;this.#storageError=e instanceof Error?e.message:'Saved request unavailable.';}}
 button(text:string,fn:()=>void,write=false){const b=element('button',{type:'button',className:'kl-text-button',text});b.dataset.matchWrite=String(write);b.disabled=this.#busy||write&&!!(this.#pending||this.#storageError);b.onclick=()=>{if(b.isConnected&&this.current()&&!this.#busy&&(!write||!this.#pending&&!this.#storageError))fn();};return b;}
 select(label:string,values:readonly string[],value:string,write:(v:string)=>void,labels?:string[]){const s=element('select',{ariaLabel:label});values.forEach((v,i)=>s.append(element('option',{value:v,text:labels?.[i]??v})));s.value=value;s.disabled=this.#busy;s.onchange=()=>{if(s.isConnected&&this.current()&&!this.#busy)write(s.value);};return s;}
 show(...nodes:Node[]){this.#clearResourceDialogLayout();this.dialog.replaceChildren(...nodes);if(!this.dialog.open)this.dialog.showModal();}
 async work(fn:(valid:()=>boolean)=>Promise<void>){
   if(!this.current()||this.#busy)return;
   const valid=this.valid();
   this.#busy=true;this.#error='';this.draw();
   try{await fn(valid);}
   catch(e){if(valid()){this.#error=e instanceof Error?e.message:'Matching action failed.';if(this.dialog.open&&!this.#openEditor())this.dialog.append(element('p',{role:'alert',text:this.#error}));}}
   finally{
     if(valid()){
       this.#busy=false;
       if(this.#catalogState==='loading')this.#catalogState=undefined;
       this.readPending();
       const target = this.#signalFocusAfterRefresh;
       const active = focusedElement(this.body) ?? this.body.ownerDocument.activeElement;
       if (target && active && active !== this.body.ownerDocument.body &&
           !this.dialog.contains(active) && !active.matches(target)) this.#signalFocusAfterRefresh = undefined;
       this.draw();
       if(this.#refreshAfter && !this.#search.composing){this.#refreshAfter=false;void this.refresh();}
       else if (this.#signalFocusAfterRefresh) {
         const opener = this.#signalFocusAfterRefresh;
         this.#signalFocusAfterRefresh = undefined;
         if (!this.dialog.open) this.#focusOpener(opener);
       }
       this.#search.flush();
     }
   }
 }
 #scheduleExpiry(own: MatchOwn): void {
   clearTimeout(this.#timer);
   const expires = own.signal.expiresAt;
   if (own.active && expires !== null && expires > own.serverNow) {
     const valid = this.valid();
     this.#timer = setTimeout(() => { if (valid()) this.invalidate(); },
       Math.max(0, Math.min(2147483647, expires - own.serverNow - (Date.now() - this.#ownObservedAt) + 30)));
   }
 }
 async #readListing(source: MatchingSource, cursor: string | number | null, limit: number, valid: () => boolean) {
   const items: MatchResource[] = [], requests: GroupMatchRequest[] = [];
   let owned: OwnedMatchGroup[] = [], limited = false, pages = 0;
   let next = cursor;
   do {
     if (this.#page === 'owned') {
       owned = checkedOwnedGroups(await this.read('/v1/matching/groups/me', source));
       next = null;
     } else if (this.#page === 'requests') {
       const row = checkedGroupRequests(await this.read(`/v1/matching/group-requests?scope=${this.#scope}&state=${this.#state}&cursor=${next ?? 0}&limit=20`, source));
       requests.push(...row.items.map(request => this.safeRequest(request)));
       next = row.nextCursor;
     } else {
       const q = new URLSearchParams({
         ...Object.fromEntries(Object.entries(this.#filters).map(([key, value]) => [key, String(value)])),
         priority: resourcePriority(this.#filters.priority), limit: '20', cursor: String(next ?? ''),
       });
       const row = checkedResourcePage(await this.read(`/v1/matching/resources/${this.#kind}?${q}`, source), this.#kind);
       items.push(...row.items.filter(resource => this.allowed(resource.host.memberNumber)));
       next = row.nextCursor;
       limited = row.poolLimited;
     }
     if (!valid()) return;
     pages++;
   } while (next !== null && pages < limit);
   return { items, requests, owned, next, limited, pages };
 }
 async #checkBackground(): Promise<void> {
   if (!this.current() || !this.client.connected || this.#busy || this.#search.pending || this.#search.composing) return;
   if (!this.#pages || !this.#own) { void this.refresh(); return; }
   if (this.#background) { this.#checkAgain = true; return; }
   const token = this.#background = Symbol(), revision = this.#search.revision;
   const valid = () => this.#background === token && this.current() && this.client.connected &&
     revision === this.#search.revision && !this.#search.composing && !this.#busy;
   try {
     const { resources: source, people } = await this.recovery.resourceSources(valid);
     if (!valid()) return;
     if (!sameMatchingSource(this.#source, source) || !sameMatchingSource(this.source(this.#own), people)) { this.invalidate(); return; }
     const own = checkedMatchOwn(await this.read('/v1/matching/me', people.required ? people : source), this.recovery.owner);
     if (!valid()) return;
     const observedAt = Date.now();
     const listing = await this.#readListing(source, null, this.#pages, valid);
     if (!listing || !valid() || this.#checkAgain) return;
     const same = JSON.stringify(this.#items) === JSON.stringify(listing.items) &&
       JSON.stringify(this.#requests) === JSON.stringify(listing.requests) &&
       JSON.stringify(this.#owned) === JSON.stringify(listing.owned) &&
       (this.#next === null) === (listing.next === null) && this.#limited === listing.limited &&
       JSON.stringify({ ...this.#own, serverNow: own.serverNow }) === JSON.stringify(own);
     this.#ownObservedAt = observedAt;
     this.#scheduleExpiry(own);
     this.#pages = listing.pages;
     this.#next = listing.next;
     this.#own = this.bind(own, people);
     if (same) return;
     this.#items = listing.items.map(r => this.bind(r, source));
     this.#requests = listing.requests.map(r => this.bind(r, source));
     this.#owned = listing.owned.map(r => this.bind(r, source));
     this.#limited = listing.limited;
     this.draw();
   } catch (error) {
     if (valid() && (!isTemporaryCloudReadError(error) || Date.now() - this.#ownObservedAt >= 60000)) this.invalidate();
   } finally {
     if (this.#background === token) {
       this.#background = undefined;
       if (this.#checkAgain) { this.#checkAgain = false; void this.#checkBackground(); }
     }
   }
 }
 async refresh(more=false){
 if(!this.current()||this.#busy)return;
 if(this.#page==='browse'){
   if(this.#search.composing || more && this.#search.pending)return;
   this.#search.consume();
 }
 const searchRevision = this.#search.revision;
 const currentSearch = () => searchRevision === this.#search.revision;
 this.#hideSuggestion.close();
 const catalogLoading = this.#page === 'browse' && !more;
 this.#catalogState = catalogLoading ? 'loading' : undefined;
 if(!more)this.#pages=0;
 if(catalogLoading){this.#items=[];this.#next=null;this.#limited=false;}
 const current = this.valid();
 let verifiedOwn: MatchOwn | undefined;
 await this.work(async valid => {
 this.#information.close(false);
 if (!more) { this.#items = []; this.#requests = []; this.#owned = []; this.#next = null; }
 this.readPending();
 const { resources: source, people } = await this.recovery.resourceSources(valid);
 if (!valid()) return;
 if (!sameMatchingSource(source, this.#source)) {
   this.#hiddenSuggestions.close(false);
   this.#lastHide = undefined;
   if (more) throw new MatchingGenerationError();
 }
 this.#source = source;
 if (this.#editorSource && !sameMatchingSource(source, this.#editorSource)) this.#editor?.hold();
 if (this.#signalEditor && !sameMatchingSource(people, this.#signalEditor.source)) this.#signalEditor.editor.hold();
 const own = checkedMatchOwn(await this.read('/v1/matching/me', people.required ? people : source), this.recovery.owner);
 if (!valid() || this.#refreshAfter) return;
 this.#own = verifiedOwn = this.bind(own, people);
 this.#ownObservedAt = Date.now();
 this.#scheduleExpiry(own);
 try {
   const listing = await this.#readListing(source, more ? this.#next : null, 1, () => valid() && !this.#refreshAfter && currentSearch());
   if (!listing || !valid() || this.#refreshAfter || !currentSearch()) return;
   this.#items = [...(more ? this.#items : []), ...listing.items.map(r => this.bind(r))];
   this.#requests = [...(more ? this.#requests : []), ...listing.requests.map(r => this.bind(r))];
   this.#owned = listing.owned.map(r => this.bind(r));
   this.#next = listing.next;
   this.#limited = listing.limited;
   this.#pages = (more ? this.#pages : 0) + 1;
 } catch (error) {
   if (!valid() || this.#refreshAfter || !currentSearch()) return;
   if (!catalogLoading || !matchingCatalogReadFailed(error)) throw error;
   this.#catalogState = 'error';
 }
 });
 if (!current() || this.#busy) return;
 const openSignal = this.#openSignalAfterRefresh;
 this.#openSignalAfterRefresh = false;
 if (openSignal && verifiedOwn && this.#own === verifiedOwn && this.client.connected && this.element.isConnected &&
   !this.dialog.open && !this.#pending && !this.#storageError) this.#editOwnSignal('.kl-match-my-signal');
 }
 async fresh(id:string,valid:()=>boolean,kind=this.#kind,source=this.#source){
   const priority = resourcePriority(this.#filters.priority);
   const r = checkedResource(await this.read(`/v1/matching/resources/${kind}/${id}?priority=${priority}`, source), kind);
   if (!valid()) throw new Error('Matching view changed.');
   if (!this.allowed(r.host.memberNumber)) throw new MatchingResourceUnavailable();
   return this.bind(r, source);
 }
 async mutate(method: 'POST' | 'PUT', path: string, body: Record<string, unknown>, valid: () => boolean,
   source: MatchingSource, label: string): Promise<MatchingPending> {
   this.readPending();
   if (this.#pending || this.#storageError) throw new Error(this.#storageError || 'Recover the saved Matching request first.');
   const pending: MatchingPending = {
     format: matchingResourceMutation(path) ? 2 : 3,
     createdAt: Date.now(), method, path, body: structuredClone({ operationId: crypto.randomUUID(), ...body }),
     confirmed: false, source: structuredClone(source), label: label.slice(0, 240),
   };
   await this.recovery.prepare(pending, valid);
   this.readPending();
   await this.recovery.run(pending, valid);
   this.readPending();
   return pending;
 }
 draw(){
 this.#background=undefined;this.#checkAgain=false;
 if (this.#search.composing) return;
 const active = focusedElement(this.body);
 const optionsFocused = !!active && (this.#optionsMenu.element.contains(active) ||
   this.body.contains(active) && active.matches(matchOptionsSelector));
 this.#cardMenu.close(false);
 this.#optionsMenu.close(false);
 this.options.busyChanged?.(this.#busy);
 const navigation = this.#visible ? this.options.navigation : undefined;
 this.results.replaceChildren();
 if (!this.client.connected || !this.options.current() || this.client.memberNumber !== this.recovery.owner || this.client.origin !== this.recovery.origin) {
   this.dialog.close();
   this.#hiddenSuggestions.close(false);
   this.#hideSuggestion.close();
   this.results.append(note('Reconnect to view Matching. Saved requests are kept on this device.'));
   this.body.replaceChildren(...(navigation ? [navigation] : []), this.results);
   if (active && navigation?.contains(active)) active.focus({ preventScroll: true });
   return;
 }
 if(!this.#openEditor())this.dialog.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select').forEach(b=>{b.disabled=this.#busy||b.dataset.matchUnavailable==='true'||b.dataset.matchWrite==='true'&&!!(this.#pending||this.#storageError);});this.element.setAttribute('aria-busy',String(this.#busy));
 const signal = this.button(matchSettingsLabel(this.#own, !!this.#signalEditor),
   () => this.#editOwnSignal('.kl-match-my-signal'), true);
 signal.classList.add('kl-match-my-signal');
 if (!this.#own && !this.#signalEditor) signal.disabled = true;
 if (this.#own?.revision === 0) signal.classList.add('kl-text-button--primary');
 const actions = element('div', { className: 'kl-match-actions' });
 if (this.#page !== 'browse') actions.append(this.button('Browse', () => { this.#page = 'browse'; void this.refresh(); }));
 actions.append(signal);
 const connections = this.options.connections;
 if (this.#page === 'browse' && connections)
   actions.append(matchConnectionsButton(this.button('Connections', connections), this.options.connectionCount?.() ?? 0));
 const menu: ShellAction[] = [];
 const preferences = this.options.preferences;
 if (preferences) menu.push({ label: 'Profile preferences', icon: 'settings', run: preferences });
 if (this.#page === 'browse')
   menu.push({ label: 'Hidden suggestions', icon: 'eye', run: () => this.#openHiddenSuggestions('options') });
 menu.push(
   { label: 'Refresh', icon: 'refresh', separator: true, run: () => {
     this.options.refreshConnectionCount?.();
     void this.refresh();
   } },
   { label: 'Manage saved / hidden', icon: 'bookmark', run: () => void this.choices() },
 );
 if (this.#page === 'browse' && this.#filters.scope !== 'hidden')
   menu.push({ label: 'Hidden resources', icon: 'eye-off', run: () => this.setScope('hidden') });
 if (this.#page === 'browse' && JSON.stringify(this.#filters) !== JSON.stringify(DEFAULT_RESOURCE_FILTERS))
   menu.push({ label: 'Reset filters', icon: 'filter', run: () => this.resetFilters() });
 if(this.#kind==='groups'){
   if(this.#page!=='owned')actions.append(this.button('My groups',()=>{this.#page='owned';void this.refresh();}));
   const requests = () => { this.#page = 'requests'; void this.refresh(); };
   const createLabel = this.#editor ? 'Resume group draft' : 'Create group';
   const create = () => void this.edit();
   if (this.#page === 'owned')
     actions.append(this.button('Group requests', requests), this.button(createLabel, create, true));
   else menu.push(
     { label: 'Group requests', icon: 'requests', separator: true, run: requests },
     { label: createLabel, icon: this.#editor ? 'edit' : 'plus', disabled: !!(this.#pending || this.#storageError), run: create },
   );
 }
 const options = matchOptionsButton(this.#optionsMenu, () => this.current() && this.client.connected && !this.#busy, menu);
 actions.append(options);
 if(this.#own)actions.append(matchingInformationButton(this.button('Matching information',()=>this.#showInformation())));
 if(this.#kind==='groups'&&this.#draft){
   const resume=this.button('Resume group request',()=>{
     const draft=this.#draft;
     if(draft)void this.compose(draft.id,draft.source,'.kl-match-resume-group-request');
   },true);
   resume.classList.add('kl-match-resume-group-request');
   actions.append(resume);
 }
 if (this.#restoreFilterFocus && active && active !== this.body.ownerDocument.body &&
     !active.matches('.kl-match-filter-button') && !this.dialog.contains(active)) this.#restoreFilterFocus = false;
 const activeSearch = active instanceof HTMLInputElement &&
   this.body.contains(active) && active.matches('.kl-match-search input') ? active : undefined;
 this.body.replaceChildren(element('header',{className:'kl-match-header'},element('h1',{text:this.#page==='owned'?'My matching groups':this.#page==='requests'?'Group requests':'Matches'}),actions));
 if (optionsFocused && this.current()) options.focus({ preventScroll: true });
 if(this.#pending){const p=this.#pending;this.body.append(element('section',{className:'kl-match-pending'},element('strong',{text:p.confirmed?'Confirmed request · finish saving locally':'A Matching request is waiting for recovery'}),note('Reload and reconnect never resend. Retry checks the exact saved request. Forget cannot undo a server action.'),this.button('Review saved request',()=>this.review(p)),this.button(p.confirmed?'Finish local cleanup':'Retry saved request',()=>void this.retry(p))));}
 if(this.#storageError||this.#error)this.body.append(element('p',{role:'alert',text:this.#storageError||this.#error}));if(this.#busy&&this.#catalogState!=='loading')this.body.append(element('p',{role:'status',text:'Loading Matching…'}));
 const hide = this.#lastHide;
 if (hide && this.#page === 'browse') {
   this.body.append(hiddenSuggestionNotice(this.button('Undo', () => void this.#undoHide(hide), true)));
 }
 if (navigation) {
   this.body.append(navigation);
   if (active && navigation.contains(active)) active.focus({ preventScroll: true });
 }
 if(this.#page==='owned'){this.body.append(this.results);for(const g of this.#owned)this.results.append(element('article',{className:'kl-match-card'},element('h2',{text:g.group.title}),note(`${g.group.published?'Published':'Paused'} · ${g.members}/${g.group.capacity} members${!g.publishable?' · Publication currently unavailable':''}`),this.button('Edit group',()=>void this.edit(g.id,this.source(g)),true)));if(!this.#owned.length&&!this.#busy)this.results.append(note('No groups yet. Create a group and choose when to publish it.'));return;}
 if (this.#page === 'requests') {
   this.body.append(element('div', { className: 'kl-match-actions' },
     this.select('Group request direction', ['all', 'incoming', 'outgoing'], this.#scope, value => { this.#scope = value; void this.refresh(); }),
     this.select('Group request state', ['all', ...MATCH_STATES], this.#state, value => { this.#state = value; void this.refresh(); })));
   this.body.append(this.results);
   for (const request of this.#requests) {
     const row = this.safeRequest(request);
     const card = element('article', { className: 'kl-match-card' },
       element('h2', { text: row.group?.title ?? 'Unavailable group' }),
       note(`${row.direction} · ${row.state} · ${row.peer?.name ?? 'Unavailable participant'}`),
       this.button('Review group request', () => void this.requestDetail(row.id, this.source(request))));
     card.dataset.groupRequest = row.id;
     this.results.append(card);
   }
   if (!this.#requests.length && !this.#busy) this.results.append(note('No group requests in this view.'));
 }
 else{
   const q=element('input',{type:'search',ariaLabel:'Search matching resources',placeholder:'Search shared names, interests, places…',value:this.#filters.query,maxLength:160});
   const searchControl = this.#search.bind(q, query => {
     if (query === this.#filters.query) return false;
     this.#filters.query = query;
     this.#saveBrowse();
     this.#items = [];
     this.#next = null;
     this.results.replaceChildren(matchingCatalogLoading());
     return true;
   }, () => {
     if (this.#busy) return;
     if (this.#refreshAfter) {
       this.#refreshAfter = false;
       void this.refresh();
     } else if (!this.#search.pending) this.draw();
   });
   const filters = matchFilterButton(this.button('Filters', () => this.filters()), this.#filters, DEFAULT_RESOURCE_FILTERS);
   const toolbar=element('form',{className:'kl-match-toolbar'},
     searchControl,matchScopeControls(this.#filters.scope,(scope,label)=>this.button(label,()=>this.setScope(scope))),filters,
     this.select('Resource sort', ['recommended', 'time', 'name'], this.#filters.sort, value => {
       this.#filters.sort = value as ResourceFilters['sort'];
       this.#applyBrowse();
     }, ['Recommended', 'Shared time', 'Name']));
   toolbar.onsubmit=e=>{e.preventDefault();if(toolbar.isConnected)this.#search.submit();};this.body.append(toolbar, this.results);
   if (this.#restoreFilterFocus && !this.#busy && !this.#refreshAfter && !this.dialog.open) {
     this.#restoreFilterFocus = false;
     if (this.body.getRootNode() === this.body.ownerDocument || active || this.body.ownerDocument.activeElement === this.body.ownerDocument.body) {
       filters.focus({ preventScroll: true });
     }
   }
   if (activeSearch) {
     q.focus({preventScroll:true});
     q.setSelectionRange(activeSearch.selectionStart ?? q.value.length, activeSearch.selectionEnd ?? q.value.length,
       activeSearch.selectionDirection ?? undefined);
   }
   if (this.#catalogState === 'loading' || this.#search.pending) { this.results.append(matchingCatalogLoading()); return; }
   if (this.#catalogState === 'error') {
     const panel = matchingCatalogError(() => {
       if (!panel.isConnected || !this.current() || this.#busy) return;
       if (panel.contains(focusedElement(panel) ?? null)) q.focus({preventScroll:true});
       void this.refresh();
     });
     this.results.append(panel);
     return;
   }
   if(this.#limited)this.results.append(note('Suggestions are limited to 500 accessible resources.'));
   const visible = this.#items.filter(candidate => this.allowed(candidate.host.memberNumber));
   if (!this.#busy && !this.#error)
     this.results.append(matchSuggestionCount(visible.length, this.#next !== null));
   if (visible.length)
     this.results.append(element('div', { className: 'kl-match-grid' }, ...visible.map(candidate => this.card(candidate))));
   else if (!this.#busy && !this.#error && this.#next === null)
     this.results.append(matchEmptySuggestions(this.button('Reset filters', () => {
       q.focus({ preventScroll: true });
       this.resetFilters();
     }), this.#hiddenTrigger('empty')));
 }
 if(this.#next!==null)this.results.append(pageAction(this.button('Load more resources',()=>void this.refresh(true))));
 }
 #saveBrowse(): void {
   if (this.current() && this.#page === 'browse') this.options.browseChanged?.();
 }
 #applyBrowse(): void {
   this.#saveBrowse();
   void preserveSelectionFocus(this.body, () => this.refresh());
 }
 setScope(scope: ResourceFilters['scope']): void {
   if (this.#filters.scope === scope) return;
   this.#filters.scope = scope;
   this.#applyBrowse();
 }
 resetFilters(): void {
   this.#filters = structuredClone(DEFAULT_RESOURCE_FILTERS);
   this.#applyBrowse();
 }
 #focusInformationTrigger():void { this.body.querySelector<HTMLButtonElement>('.kl-match-information-toggle')?.focus({ preventScroll: true }); }
 #showInformation():void {
   const own = this.#own;
   if (!own) return;
   const kind = this.#kind;
   const source = this.#source;
   const connections = kind === 'groups' ? this.button('Group requests', () => {
     this.#information.close();
     if (this.#page === 'requests') return;
     this.#page = 'requests';
     void this.refresh();
   }) : this.options.connections ? this.button('Connections', () => {
     this.#information.close(false);
     this.options.connections?.();
   }) : undefined;
   this.#information.open({
     own,
     connections,
     signal: this.button('My signal', () => {
       this.#information.close(false);
       this.#editOwnSignal('.kl-match-information-toggle');
     }, true),
     hidden: this.#hiddenTrigger('information'),
     detail: kind === 'rooms'
       ? 'Rooms use current Space permissions. Planned capacity is known only when supplied. Live occupancy and free places are unavailable.'
       : kind === 'events'
         ? 'Events use current Calendar access and RSVP. Dates use your device time zone. The original time zone is unavailable.'
         : undefined,
     saved: async () => {
       const choices = checkedResourceChoices(await this.read('/v1/matching/resource-choices', source));
       if (!this.current() || this.#kind !== kind || !sameMatchingSource(source, this.#source)) return [];
       const rows = [];
       for (const choice of choices) {
         if (choice.kind !== kind || !choice.saved || choice.hidden || !choice.title ||
           choice.host === null || !this.allowed(choice.host)) continue;
         const loaded = this.#items.find(candidate => candidate.kind === kind && candidate.id === choice.id &&
           candidate.host.memberNumber === choice.host && candidate.title === choice.title &&
           candidate.saved && !candidate.hidden && candidate.choiceRevision === choice.revision &&
           sameMatchingSource(this.source(candidate), source));
         rows.push({
           title: choice.title, icon: resourceIcon[kind], reason: loaded?.reasons[0],
           open: () => void this.why(choice.id, source, 'information'),
         });
         if (rows.length === 3) break;
       }
       return rows;
     },
   });
 }
 #hiddenTrigger(opener: HiddenOpener): HTMLButtonElement {
   const button = this.button('Hidden suggestions', () => this.#openHiddenSuggestions(opener));
   button.setAttribute('aria-haspopup', 'dialog');
   button.dataset.matchHiddenOpener = opener;
   return button;
 }
 #openHiddenSuggestions(opener: HiddenOpener): void {
   const kind = this.#kind, source = this.#source, valid = this.valid();
   const current = () => valid() && this.client.connected && this.#kind === kind && sameMatchingSource(this.#source, source);
   if (!current() || this.dialog.open || this.#hiddenSuggestions.element.open) return;
   this.#information.close(false);
   this.#hiddenSuggestions.open({
     current,
     focus: () => {
       const options = this.body.querySelector<HTMLElement>(matchOptionsSelector);
       const trigger = opener === 'empty' ? this.body.querySelector<HTMLButtonElement>('[data-match-hidden-opener="empty"]') :
         opener === 'information' ? this.body.querySelector<HTMLButtonElement>('.kl-match-information-toggle') : options;
       (trigger instanceof HTMLButtonElement && trigger.disabled ? options : trigger ?? options)?.focus({ preventScroll: true });
     },
     load: async active => {
       const latest = await this.recovery.gate(active, true);
       if (!sameMatchingSource(latest, source)) throw new MatchingGenerationError();
       const rows = checkedResourceChoices(await this.read('/v1/matching/resource-choices', source));
       return rows.filter(choice => choice.kind === kind && choice.hidden).map(choice => {
         const title = choice.host !== null && this.allowed(choice.host) ? choice.title ?? 'Unavailable resource' : 'Unavailable resource';
         return { key: choice.id, title, restore: () => this.#restoreHidden(choice, title, source, active) };
       });
     },
   });
 }
 async #restoreHidden(choice: ResourceChoice, title: string, source: MatchingSource, current: () => boolean): Promise<void> {
   if (!current() || this.#busy) throw new Error('Matching view changed. Try again.');
   let failure: unknown;
   await this.work(async valid => {
     const active = () => valid() && current();
     try {
       await this.mutate('PUT', `/v1/matching/resource-choices/${choice.kind}/${choice.id}`,
         { revision: choice.revision, saved: choice.saved, hidden: false }, active, source, `Restore · ${title}`);
       if (valid()) this.#refreshAfter = true;
     } catch (error) { failure = error; }
   });
   if (failure !== undefined) throw failure;
 }
 resourceAvatar(c:MatchResource){
   return markMemberAvatar(element('span',{className:'kl-match-avatar',ariaHidden:'true',title:c.host.name,
     text:Array.from(c.host.name.trim()).slice(0,2).join('').toUpperCase()}), c.host.memberNumber, c.host.name);
 }
 resourceMetrics(c:MatchResource){
   const full=c.members!==null&&c.capacity!==null&&c.members>=c.capacity;
   const availability=c.available===null?'Availability not shared':c.available?'Available':
     full?c.kind==='groups'?'Group full':'Event full':c.availability??'Planning ahead';
   const startsAt=c.startsAt,endsAt=c.endsAt;
   const date=c.kind==='events'&&startsAt!==null&&endsAt!==null
     ? element('span',{title:eventRange(startsAt,endsAt)},bindClockText(element('time'),startsAt,'medium-date-time'),localZone(startsAt))
     : undefined;
   return element('div',{className:'kl-match-metrics'},
     element('span',{text:availability}),
     matchWeeklyOverlap(c.overlapMinutes),
     c.kind==='rooms'?element('span',{text:c.capacity===null?'Planned capacity unknown':`${c.capacity} planned places`,title:'Live occupancy unavailable'}):
       c.members!==null&&c.capacity!==null?element('span',{text:`${c.members}/${c.capacity} places`}):undefined,
     date,c.community?element('span',{text:c.community.name}):undefined);
 }
 groupAction(c:MatchResource, returnFocus?: string){
   const membership = c.membership;
   if (membership === 'Pending' || membership === 'Accepted') {
     const opener = returnFocus ?? `[data-resource-id="${CSS.escape(c.id)}"] .kl-match-group-request-trigger`;
     const button = this.button(membership === 'Pending' ? 'Request pending' : 'Connection',
       () => void this.#reviewExistingGroupRequest(c, membership, opener, returnFocus !== undefined));
     button.classList.add('kl-text-button--primary', 'kl-match-group-request-trigger');
     return button;
   }
   const full=c.members!==null&&c.capacity!==null&&c.members>=c.capacity;
   const label=c.canRequest?'Request connection':c.membership==='owner'?'Your group':full?'Group full':'Unavailable';
   const button=this.button(label,()=>void this.compose(c.id,this.source(c),returnFocus),true);
   button.classList.add('kl-text-button--primary','kl-match-group-request-trigger');
   if(!c.canRequest){button.disabled=true;button.dataset.matchUnavailable='true';}
   return button;
 }
 async #readResourceDetail(id: string, kind: MatchResourceKind, source: MatchingSource | undefined, current: () => boolean) {
   const freshSource = await this.recovery.gate(current, true);
   if (source && !sameMatchingSource(source, freshSource)) throw new MatchingGenerationError();
   const resource = await this.fresh(id, current, kind, freshSource);
   if (resource.id !== id) throw new MatchingResourceUnavailable();
   return resource;
 }
 async groupDetails(candidate: MatchResource, fromOptions = false): Promise<void> {
   await this.work(async valid => {
     const current = () => valid() && !this.#refreshAfter && this.#kind === 'groups';
     const source = this.source(candidate);
     const group = await this.#readResourceDetail(candidate.id, 'groups', source, current);
     if (!current()) return;
     const opener = fromOptions ? '.kl-match-card-options' : '.kl-match-name';
     this.#showGroupDetails(group, `[data-resource-id="${CSS.escape(group.id)}"] ${opener}`);
   });
   this.#focusGroupDetails();
 }
 #showGroupDetails(group: MatchResource, returnFocus: string, request?: GroupMatchRequest): void {
   const links = element('div', { className: 'kl-match-group-links' },
     this.button('View host profile', () => void this.#openResourceLink(group, 'host', 'group-details')),
     group.community && this.options.community
       ? this.button('View community', () => void this.#openResourceLink(group, 'community', 'group-details'))
       : undefined);
   const action = request?.direction === 'Outgoing'
     ? this.button('Connection', () => void this.requestDetail(request.id, this.source(request), { group, returnFocus }))
     : this.groupAction(group, returnFocus);
   if (request?.direction === 'Outgoing') action.classList.add('kl-text-button--primary', 'kl-match-group-request-trigger');
   this.#showResourceDialog('A small group to meet',
     element('div', { className: 'kl-match-group-details' },
       element('div', { className: 'kl-match-request-target' },
         element('span', { className: 'kl-match-avatar kl-match-avatar--resource', ariaHidden: 'true' }, kikiIcon('users')),
         element('div', {}, element('h3', { text: group.title }), note(`Hosted by ${group.host.name}`),
           element('p', { text: group.description }))),
       this.resourceMetrics(group), element('p', { text: group.languages.join(' · ') || 'Language not shared' }),
       matchCardReasons(group.reasons, group.overlapMinutes), note('A request does not join the group or reserve a place.'), links),
     element('footer', {}, this.button('Close', () => this.dialog.close()), action), returnFocus, 'group-details');
 }
 #focusGroupDetails(): void {
   if (this.dialog.open && this.dialog.dataset.layout === 'group-details') {
     this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus({ preventScroll: true });
   }
 }
 async #openResourceLink(reviewed: MatchResource, target: 'host' | 'community', layout: 'group-details' | 'resource-why'): Promise<void> {
   await this.work(async valid => {
     const current = () => valid() && !this.#refreshAfter && this.dialog.open && this.dialog.dataset.layout === layout;
     const dismiss = () => {
       this.dialog.close();
       this.dialog.replaceChildren();
     };
     const source = this.source(reviewed);
     let latest: MatchResource;
     try {
       latest = await this.#readResourceDetail(reviewed.id, reviewed.kind, source, current);
     } catch (error) {
       if (!current()) return;
       dismiss();
       if (error instanceof MatchingResourceUnavailable || error instanceof MatchingGenerationError ||
           error instanceof CloudError && [403, 404, 410].includes(error.status)) {
         this.#refreshAfter = true;
         return;
       }
       throw error;
     }
     if (!current()) return;
     dismiss();
     if (latest.host.memberNumber !== reviewed.host.memberNumber ||
         target === 'community' && latest.community?.id !== reviewed.community?.id) {
       this.#refreshAfter = true;
       return;
     }
     if (target === 'host') this.options.profile(latest.host.memberNumber, latest.host.name);
     else if (latest.community) this.options.community?.(latest.community.id);
   });
 }
 card(c:MatchResource){
   const openResource=()=>void this.work(async valid=>{
     const fresh=await this.fresh(c.id,valid,c.kind,this.source(c));
     const open=fresh.kind==='rooms'?this.options.space:this.options.event;
     if(!open)throw new Error('This resource screen is unavailable.');
     if(valid()&&!this.#refreshAfter)open(fresh.id);
   });
   const isGroup=c.kind==='groups';
   const openLabel=isGroup?'View group':c.kind==='rooms'?'Open Space':'View event';
   const open=isGroup?()=>void this.groupDetails(c):openResource;
   const why=()=>void this.why(c.id,this.source(c));
   const more=element('button',{type:'button',className:'kl-icon-button kl-match-card-options',
     ariaLabel:'Resource options',title:'Resource options'},kikiIcon('more'));
   more.setAttribute('aria-haspopup','menu');
   more.setAttribute('aria-expanded','false');
   const current=()=>more.isConnected&&this.current()&&this.client.connected&&!this.#busy&&this.allowed(c.host.memberNumber);
   const run=(action:()=>void,write=false)=>()=>{if(current()&&(!write||!this.#pending&&!this.#storageError))action();};
   more.onclick=()=>{
     if(!current())return;
     const locked=!!(this.#pending||this.#storageError);
     this.#cardMenu.open(more,'Suggestion options',[
       {label:c.saved?'Remove saved suggestion':'Save suggestion',icon:'bookmark',disabled:locked,run:run(()=>void this.choose(c,'saved'),true)},
       {label:'Why this suggestion?',icon:'info',run:run(()=>void this.why(c.id,this.source(c),'options'))},
       {label:openLabel,icon:'arrow-right',run:run(isGroup?()=>void this.groupDetails(c,true):openResource)},
       {label:c.hidden?'Restore suggestion':'Hide suggestion',icon:c.hidden?'eye':'close',disabled:locked,run:run(c.hidden ? () => void this.choose(c,'hidden') : () => this.#confirmHide(c),true)},
     ],undefined,false,false);
   };
   const title=this.button(c.title,open);
   title.className='kl-match-name';title.title=c.title;
   const heading=element('div',{className:'kl-match-person'},
     this.resourceAvatar(c),
     element('div',{},isGroup?element('h2',{className:'kl-match-resource-title'},title):title,
       element('div',{className:'kl-match-card-meta'},element('span',{text:c.languages.join(' · ')||'Language not shared'}),
         c.saved?element('span',{className:'kl-match-card-tag',text:'Saved'}):undefined)),more);
   const primary=isGroup?this.groupAction(c):this.button(openLabel,openResource);
   if(!isGroup)primary.classList.add('kl-text-button--primary');
   const whyButton=this.button('Why this match?',why);
   whyButton.classList.add('kl-match-resource-why');
   const controls=element('div',{className:'kl-match-actions'},primary,whyButton);
   const card=element('article',{className:'kl-match-card'},heading,element('p',{text:c.description}),this.resourceMetrics(c),matchCardReasons(c.reasons, c.overlapMinutes),controls);
   card.dataset.resourceId=c.id;
   return card;
 }
 filters(): void {
   const draft = { ...this.#filters };
   const current = this.valid();
   const languageOptions = matchLanguageOptions([draft.language]);
   const loaded = this.#items.filter(candidate => this.allowed(candidate.host.memberNumber));
   const communities = new Map(loaded.flatMap(candidate => candidate.community
     ? [[candidate.community.id, candidate.community.name] as const] : []));
   if (draft.community && !communities.has(draft.community)) communities.set(draft.community, 'Selected community');
   const controls = new Map<SheetSelect, HTMLSelectElement>();
   const field = <K extends SheetSelect>(key: K, label: string, accessible: string, values: readonly string[], labels: string[]) => {
     const selected = key === 'priority' ? resourcePriority(draft.priority) : draft[key];
     const control = this.select(accessible, values, selected, value => { draft[key] = value as ResourceFilters[K]; }, labels);
     controls.set(key, control);
     return element('label', { className: 'kl-match-field' }, element('span', { text: label }), control);
   };
   const form = element('div', { className: 'kl-match-form-grid' },
     field('intent', 'Looking for', 'Resource intent', ['', ...MATCH_INTENTS], ['Any intent', ...MATCH_INTENTS]),
     field('language', 'Language', 'Resource language', ['', ...languageOptions], ['Any language', ...languageOptions]),
     field('interest', 'Shared interest', 'Resource interest', ['', ...MATCH_INTERESTS.map(item => item.id)], ['Any interest', ...MATCH_INTERESTS.map(item => item.label)]),
     field('community', 'Shared community', 'Resource community', ['', ...communities.keys()], ['Any community', ...communities.values()]),
     field('timezone', 'Time zone', 'Resource time zone', ['any', 'same', 'near'], ['Any time zone', 'Same time zone', 'Within two hours']),
     field('priority', 'Recommendation priority', 'Resource priority', ['balanced', 'time'], ['Balanced', 'Shared time']));
   const available = element('input', { type: 'checkbox', ariaLabel: 'Available now' });
   available.checked = draft.available;
   available.onchange = () => { draft.available = available.checked; };
   const reset = this.button('Reset filters', () => {
     const { query, scope, sort } = draft;
     Object.assign(draft, DEFAULT_RESOURCE_FILTERS, { query, scope, sort });
     for (const [key, control] of controls) control.value = draft[key];
     available.checked = draft.available;
   });
   const returnFocus = '.kl-match-filter-button';
   const apply = this.button('Show suggestions', () => {
     if (!current() || !this.dialog.open || !this.dialog.contains(form)) return;
     this.#filters = draft;
     this.#resourceDialogReturnFocus = undefined;
     this.#restoreFilterFocus = true;
     this.dialog.close();
     this.#applyBrowse();
   });
   apply.classList.add('kl-text-button--primary');
   const count = `${loaded.length} loaded ${loaded.length === 1 ? 'suggestion' : 'suggestions'}`;
   this.#showResourceDialog('Filter shared suggestions',
     element('div', {},
       note(`${resourceTypeLabel[this.#kind]} · filters use only information shared with you.`),
       element('p', { className: 'kl-match-filter-count', role: 'status',
         text: this.#next !== null ? `${count} · More results available` : count }),
       form,
       element('div', { className: 'kl-match-filter-toggles' },
         element('label', { className: 'kl-match-toggle' }, available, element('span', { text: 'Available now' }))),
       note('Availability and time zone filters use shared data. Community choices come from loaded results.')),
     element('footer', {}, reset, this.button('Close', () => this.dialog.close()), apply), returnFocus, 'filters');
 }
 async why(id: string, source = this.#source, returnTo: 'why' | 'options' | 'information' | 'finder' = 'why', finderHost?: number): Promise<void> {
   const kind = this.#kind;
   await this.work(async valid => {
     const current = () => valid() && !this.#refreshAfter && this.client.connected &&
       (finderHost === undefined || this.#finderRecommendationHost === finderHost && this.allowed(finderHost));
     const resource = await this.#readResourceDetail(id, kind, returnTo === 'finder' ? undefined : source, current);
     if (!current()) return;
     if (finderHost !== undefined && (resource.hidden || resource.host.memberNumber !== finderHost)) throw new MatchingResourceUnavailable();

     const control = returnTo === 'options' ? '.kl-match-card-options' : '.kl-match-resource-why';
     const returnFocus = returnTo === 'finder' ? matchOptionsSelector :
       returnTo === 'information' ? '.kl-match-information-toggle' : `[data-resource-id="${CSS.escape(id)}"] ${control}`;
     const profile = this.button('Host profile', () => void this.#openResourceLink(resource, 'host', 'resource-why'));
     profile.classList.add('kl-match-why-profile');
     this.#showResourceDialog('Why this suggestion?',
       element('div', {},
         element('div', { className: 'kl-match-why-summary' },
           element('span', { className: 'kl-match-avatar kl-match-avatar--resource', ariaHidden: 'true' }, kikiIcon(resourceIcon[kind])),
           element('div', {}, element('h3', { text: resource.title }),
             element('p', {}, element('strong', { text: `${resource.score}/100 suggestion score` }), ` · ${resource.coverage}% information coverage`))),
         note('Ranking points from shared information, not a probability. Missing factors add no points.'),
         matchingBreakdown(resource.breakdown), profile),
       element('footer', {}, this.button('Close', () => this.dialog.close())), returnFocus, 'resource-why');
   });
   if (this.dialog.open && this.dialog.dataset.layout === 'resource-why') {
     this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus({ preventScroll: true });
   } else if (returnTo === 'information' && this.current() && this.client.connected && !this.#busy) {
     this.#focusInformationTrigger();
   }
 }
 #confirmHide(candidate: MatchResource): void {
   const valid = this.valid(), source = this.source(candidate);
   const current = () => valid() && this.client.connected && this.#page === 'browse' &&
     this.#kind === candidate.kind && this.#items.includes(candidate) && this.allowed(candidate.host.memberNumber) &&
     sameMatchingSource(source, this.#source) && !candidate.hidden && !this.#busy && !this.#pending && !this.#storageError;
   if (!current() || this.dialog.open || this.#hiddenSuggestions.element.open) return;
   this.#hideSuggestion.open({
     name: candidate.title,
     current,
     focus: () => (this.body.querySelector<HTMLElement>(`[data-resource-id="${candidate.id}"] .kl-match-card-options`) ??
       this.body.querySelector<HTMLElement>(matchOptionsSelector))?.focus({ preventScroll: true }),
     hide: () => { if (current()) void this.choose(candidate, 'hidden'); },
   });
 }
 async choose(c: MatchResource, key: 'saved' | 'hidden'): Promise<void> {
   await this.work(async valid => {
     const label = key === 'saved' ? `${c.saved ? 'Unsave' : 'Save'} · ` : c.hidden ? 'Restore · ' : hideSuggestionLabel;
     const pending = await this.mutate('PUT', `/v1/matching/resource-choices/${c.kind}/${c.id}`, {
       revision: c.choiceRevision, saved: key === 'saved' ? !c.saved : c.saved, hidden: key === 'hidden' ? !c.hidden : c.hidden,
     }, valid, this.source(c), label + c.title);
     if (!valid()) return;
     const hide = confirmedHide(pending, `/v1/matching/resource-choices/${this.#kind}/`);
     if (hide) this.#lastHide = hide;
     this.#refreshAfter = true;
   });
 }
 async #undoHide(hide: ConfirmedHide): Promise<void> {
   await this.work(async valid => {
     const current = () => valid() && this.client.connected && this.#lastHide === hide &&
       this.#page === 'browse' && sameMatchingSource(hide.source, this.#source);
     if (!current()) return;
     const source = await this.recovery.gate(current, true);
     if (!current()) return;
     if (!sameMatchingSource(hide.source, source)) {
       this.#lastHide = undefined;
       throw new MatchingGenerationError();
     }
     const choices = checkedResourceChoices(await this.read('/v1/matching/resource-choices', hide.source));
     if (!current()) return;
     const choice = choices.find(row => hide.path === `/v1/matching/resource-choices/${row.kind}/${row.id}`);
     if (!matchesConfirmedHide(hide, choice)) {
       this.#lastHide = undefined;
       throw new Error(staleHideMessage);
     }
     try {
       await this.mutate('PUT', hide.path, { revision: hide.revision, saved: hide.saved, hidden: false },
         current, hide.source, 'Undo hide suggestion');
       if (!current()) return;
       this.#lastHide = undefined;
       this.#refreshAfter = true;
     } finally {
       if (valid() && this.#pending?.path === hide.path) this.#lastHide = undefined;
     }
   });
 }
 async choices(){await this.work(async valid=>{const rows=checkedResourceChoices(await this.read('/v1/matching/resource-choices')).map(r=>this.bind(r));if(!valid())return;this.show(element('h2',{text:'Saved and hidden resources'}),...rows.map(c=>element('article',{className:'kl-match-card'},element('strong',{text:c.host!==null&&this.allowed(c.host)?c.title??'Unavailable resource':'Unavailable resource'}),note(`${c.kind} · ${c.saved?'Saved ':''}${c.hidden?'Hidden':''}`),this.button('Clear resource choice',()=>void this.clearChoice(c),true))),this.button('Close',()=>this.dialog.close()));});}
 async clearChoice(c:ResourceChoice){await this.work(async valid=>{await this.mutate('PUT',`/v1/matching/resource-choices/${c.kind}/${c.id}`,{revision:c.revision,saved:false,hidden:false},valid,this.source(c),'Clear saved / hidden · '+(c.title??'Unavailable resource'));if(valid()){this.dialog.close();this.#refreshAfter=true;}});}
 async edit(id?:string,source=this.#source){if(this.#editor){this.show(this.#editor.element);return;}await this.work(async valid=>{if(!sameMatchingSource(source,await this.recovery.gate(valid,true)))throw new MatchingGenerationError();const old=id?checkedOwnedGroup(await this.read(`/v1/matching/groups/${id}`,source)):null;const metadata=await this.client.request('GET','/v1/me');if(!sameMatchingSource(source,matchingGroupSource(metadata)))throw new MatchingGenerationError();const communityAccess=communityManagementRead(this.client,metadata);if(!valid())return;const communities:{id:string;name:string}[]=[];let cursor=0;for(let page=0;page<25;page++){const r=await communityAccess.request<{items:{id:string;name:string;membership?:string|null}[];nextCursor:number|null}>('GET',`/v1/communities?scope=mine&cursor=${cursor}&limit=40`);if(!valid())return;if(!Array.isArray(r.items))throw new Error('Community list unavailable.');for(const c of r.items)if(c.membership==='active')communities.push({id:c.id,name:c.name});if(r.nextCursor===null)break;cursor=r.nextCursor;}
 if(old?.group.communityId&&!communities.some(c=>c.id===old.group.communityId))communities.push({id:old.group.communityId,name:'Original community (access unavailable)'});if(!valid())return;const editor=new MatchingGroupEditor(old?.group??DEFAULT_MATCH_GROUP,communities,!!old,{current:()=>this.current()&&this.#editor===editor,writable:()=>!this.#pending&&!this.#storageError,close:()=>{this.#editor=undefined;this.#editorSource=undefined;this.dialog.close();this.draw();},save:async group=>{if(!this.current()||this.#busy)throw new Error('Matching view changed.');const active=this.valid();this.#busy=true;this.draw();try{await this.mutate(old?'PUT':'POST',old?`/v1/matching/groups/${old.id}`:'/v1/matching/groups',{...(old?{revision:old.revision}:{}),group},active,source,(old?'Edit':'Create')+' group · '+group.title);if(active()){this.#editor=undefined;this.dialog.close();this.#page='owned';this.#refreshAfter=true;}}finally{if(active()){this.#busy=false;this.readPending();this.draw();if(this.#refreshAfter){this.#refreshAfter=false;void this.refresh();}}}}});this.#editor=editor;this.#editorSource=source;this.show(editor.element);});}
 #clearResourceDialogLayout(): void {
   this.#releaseResourceDialogFit?.();
   this.#releaseResourceDialogFit = undefined;
   this.#resourceDialogReturnFocus = undefined;
   if (!this.dialog.dataset.layout) return;
   delete this.dialog.dataset.layout;
   this.dialog.removeAttribute('aria-labelledby');
   for (const property of ['inset', 'max-width', 'max-height', '--kl-dialog-viewport-height']) this.dialog.style.removeProperty(property);
 }
 #showResourceDialog(title: string, body: HTMLElement, footer: HTMLElement, returnFocus: string,
   layout: ResourceDialogLayout = 'group-request'): void {
   const heading = element('h2', { text: title });
   heading.id = this.#resourceDialogTitleId;
   const close = this.button('', () => this.dialog.close());
   close.className = 'kl-icon-button';
   close.setAttribute('aria-label', 'Close dialog');
   close.append(kikiIcon('close'));
   body.classList.add('kl-match-dialog-body');
   this.#clearResourceDialogLayout();
   this.dialog.replaceChildren(element('header', { className: 'kl-match-dialog-header' },
     element('div', {}, element('span', { className: 'kl-match-dialog-eyebrow', text: 'KikiLink' }), heading), close),
     body, footer);
   this.dialog.dataset.layout = layout;
   this.dialog.setAttribute('aria-labelledby', heading.id);
   this.#resourceDialogReturnFocus = returnFocus;
   if (!this.dialog.open) this.dialog.showModal();
   this.#releaseResourceDialogFit = fitPanelDialog(this.dialog, {
     layout: (width, height) => layout === 'filters' && width <= 700
       ? { marginX: 0, marginY: 0, maxHeight: height - 20 }
       : { marginX: 12, marginY: 12 },
   });
   (layout === 'filters' ? body.querySelector('select') : footer.querySelector('button'))?.focus({ preventScroll: true });
 }
 #discardGroupRequest(draft: GroupRequestDraft, returnFocus: string, unavailable = false): void {
   this.#showResourceDialog('Discard this unsent group draft?',
     element('div', {}, unavailable ? note('The group is unavailable.') : undefined,
       note('This will clear your introduction and selected intent.')),
     element('footer', {},
       this.button('Keep draft', () => this.dialog.close()),
       this.button('Confirm discard draft', () => {
         if (this.#draft !== draft) return;
         this.#draft = undefined;
         this.dialog.close();
         this.draw();
       })), returnFocus);
 }
 #focusOpener(target: string): void {
   if (!this.current() || !this.client.connected) return;
   const opener = this.body.querySelector<HTMLElement>(target);
   (opener && !opener.matches(':disabled') ? opener :
     this.body.querySelector<HTMLElement>(matchOptionsSelector))?.focus({ preventScroll: true });
 }
 #editOwnSignal(returnFocus: string): void {
   const own = this.#own;
   if (own) this.#editSignal(own, this.source(own), this.#ownObservedAt, returnFocus);
   else if (this.#signalEditor) this.#showSignalEditor(returnFocus);
 }
 #showSignalEditor(returnFocus: string): void {
   const draft = this.#signalEditor;
   if (!draft) return;
   draft.returnFocus = returnFocus;
   this.#clearResourceDialogLayout();
   this.#resourceDialogReturnFocus = returnFocus;
   this.#releaseResourceDialogFit = draft.editor.mount(this.dialog);
 }
 #editSignal(own: MatchOwn, source: MatchingSource, observedAt: number, returnFocus: string): void {
   if (!this.client.connected) return;
   if (!this.#signalEditor) {
     const editor = new MatchingSignalEditor(own, {
       current: () => this.current() && this.dialog.open && this.dialog.contains(editor.element),
       writable: () => !this.#busy && !this.#pending && !this.#storageError,
       close: () => {
         const pending = this.#pending;
         const target = this.#signalEditor?.returnFocus;
         if (pending?.path === '/v1/matching/me' && pending.label === saveSignalLabel && target) {
           this.#pendingSignalOpener = { operationId: pending.body.operationId, target };
         }
         this.#signalEditor = undefined;
         this.draw();
         this.dialog.close();
       },
       privacy: () => {
         this.dialog.close();
         this.options.privacy?.();
       },
       save: async (signal, expiry) => {
         if (!this.current() || !this.client.connected || this.#busy) throw new Error('Matching view changed.');
         let failure: Error | undefined;
         await this.work(async valid => {
           try {
             await this.mutate('PUT', '/v1/matching/me',
               { revision: own.revision, signal: signalWithExpiry(signal, expiry, own.serverNow, observedAt) },
               valid, source, saveSignalLabel);
           } catch (error) {
             failure = error instanceof Error ? error : new Error('Signal could not be saved.');
             return;
           }
           if (!valid()) return;
           this.#finishSignalSave();
         });
         if (failure) throw failure;
       },
     });
     this.#signalEditor = { editor, source, returnFocus };
   }
   this.#showSignalEditor(returnFocus);
 }
 #finishSignalSave(pending?: MatchingPending): void {
   const saved = this.#pendingSignalOpener;
   this.#signalFocusAfterRefresh = this.#signalEditor?.returnFocus ??
     (saved && saved.operationId === pending?.body.operationId ? saved.target : undefined);
   this.#pendingSignalOpener = undefined;
   this.#signalEditor = undefined;
   this.dialog.close();
   this.#refreshAfter = true;
 }
 #requireSignal(own: MatchOwn, source: MatchingSource, returnFocus: string): HTMLButtonElement {
   const observedAt = Date.now();
   const keep = this.button('Keep browsing', () => this.dialog.close());
   const setup = this.button('Set up my signal', () => {
     if (this.dialog.open) this.#editSignal(own, source, observedAt, returnFocus);
   }, true);
   setup.classList.add('kl-text-button--primary');
   this.#showResourceDialog(matchingSignalNeededTitle, matchingSignalNeededBody(),
     element('footer', {}, keep, setup), returnFocus, 'signal-needed');
   return keep;
 }
 async compose(id: string, source = this.#source,
   returnFocus = `[data-resource-id="${CSS.escape(id)}"] .kl-match-group-request-trigger`): Promise<void> {
   if (this.#kind !== 'groups') return;
   let initialFocus: HTMLElement | undefined;
   await this.work(async valid => {
     let draft = this.#draft;
     if (draft && draft.id !== id) throw new Error('Resume or discard the original group request before choosing another group.');
     const current = () => valid() && this.client.connected && !this.#refreshAfter;
     const liveSource = draft ? this.#source : source;
     const sources = await this.recovery.resourceSources(current);
     if (!sameMatchingSource(liveSource, sources.resources)) throw new MatchingGenerationError();
     let group: MatchResource;
     try {
       group = await this.fresh(id, current, 'groups', liveSource);
     } catch (error) {
       if (!current()) return;
       if (draft && !this.allowed(draft.resource.host.memberNumber) || error instanceof MatchingResourceUnavailable ||
           error instanceof CloudError && (error.status === 403 || error.status === 404)) {
         if (draft) {
           this.#discardGroupRequest(draft, returnFocus, true);
           initialFocus = this.dialog.querySelector('footer button') ?? undefined;
           return;
         }
         if (this.dialog.open && this.dialog.dataset.layout === 'group-details') {
           this.dialog.close();
           this.dialog.replaceChildren();
         }
       }
       throw error;
     }
     if (!current() || group.id !== id || !this.allowed(group.host.memberNumber)) return;
     if (!draft) {
       if (!group.canRequest) {
         const full = group.members !== null && group.capacity !== null && group.members >= group.capacity;
         throw new Error(full ? 'This group has no places available.' : 'This group is unavailable for new connection requests.');
       }
       const own = checkedMatchOwn(await this.read('/v1/matching/me', sources.people.required ? sources.people : source), this.recovery.owner);
       if (!current() || !this.allowed(group.host.memberNumber)) return;
       if (!own.active || own.revision === 0) {
         initialFocus = this.#requireSignal(own, sources.people, returnFocus);
         return;
       }
       draft = { id, intent: own.signal.intents[0]!, message: '', resource: group, own, source };
       this.#draft = draft;
     }
     const original = draft;
     const active = () => current() && this.#draft === original && this.allowed(group.host.memberNumber) && !this.#pending;
     const intent = this.select('Group request intent', original.own.signal.intents, original.intent, value => {
       if (active()) original.intent = value;
     });
     const input = element('textarea', { ariaLabel: 'Group request message', maxLength: groupRequestLimit,
       placeholder: 'A little about the conversation you have in mind…', value: original.message });
     input.rows = 3;
     const count = element('small', { className: 'kl-match-meta kl-match-request-count' });
     count.id = `${this.#resourceDialogTitleId}-count`;
     input.setAttribute('aria-describedby', count.id);
     const updateCount = () => { count.textContent = `${original.message.length}/${groupRequestLimit} characters`; };
     updateCount();
     input.oninput = () => {
       if (!input.isConnected || !active() || this.#busy) return;
       original.message = input.value;
       updateCount();
     };
     const error = element('p', { className: 'kl-match-request-error', role: 'alert' });
     const submit = this.button('Confirm group request', () => {
       if (!active()) return;
       if (original.message.length > groupRequestLimit) {
         error.textContent = `Use up to ${groupRequestLimit} characters.`;
         input.focus({ preventScroll: true });
         return;
       }
       error.textContent = '';
       void this.work(async valid => {
         await this.mutate('POST', '/v1/matching/group-requests', {
           groupId: original.id, groupRevision: original.resource.revision, senderRevision: original.own.revision,
           intent: original.intent, message: original.message,
         }, valid, original.source, `Request to join · ${group.title}`);
         if (!valid()) return;
         this.#draft = undefined;
         this.dialog.close();
         this.#page = 'requests';
         this.#refreshAfter = true;
       });
     }, true);
     submit.classList.add('kl-text-button--primary');
     this.#showResourceDialog(`Request to join ${group.title}`,
       element('div', { className: 'kl-match-request-body' },
         element('div', { className: 'kl-match-request-target' },
           element('span', { className: 'kl-match-avatar kl-match-avatar--resource', ariaHidden: 'true' }, kikiIcon('users')),
           element('div', {}, element('strong', { text: group.title }), note('Groups'))),
         element('label', { className: 'kl-match-field' }, element('span', { text: 'Connection intent' }), intent),
         element('label', { className: 'kl-match-field' }, element('span', { text: 'A short introduction · optional' }), input),
         count,
         note('The host reviews your request. Acceptance reserves a matching group place. Chat and Space access are separate.'),
         error),
       element('footer', {},
         this.button('Close', () => this.dialog.close()),
         this.button('Discard group draft', () => this.#discardGroupRequest(original, returnFocus)),
         submit), returnFocus);
     initialFocus = intent;
   });
   if (this.dialog.open && initialFocus?.isConnected) initialFocus.focus({ preventScroll: true });
 }
 safeRequest(r:GroupMatchRequest):GroupMatchRequest{return r.peer&&!this.allowed(r.peer.memberNumber)?{...r,group:r.direction==='Outgoing'?null:r.group,peer:null,intent:null,message:null,senderRevision:null,canAccept:false}:r;}
 async #reviewExistingGroupRequest(group: MatchResource, membership: 'Pending' | 'Accepted',
   returnFocus: string, fromDetails: boolean): Promise<void> {
   await this.work(async valid => {
     const source = this.source(group);
     const current = () => valid() && !this.#refreshAfter && this.#kind === 'groups' && this.#page === 'browse' &&
       this.client.connected && this.allowed(group.host.memberNumber) &&
       (!fromDetails || this.dialog.open && this.dialog.dataset.layout === 'group-details');
     try {
       if (!sameMatchingSource(source, await this.recovery.gate(current, true))) throw new MatchingGenerationError();
       const id = await this.#findActiveGroupRequest(group.id, membership, source, current);
       if (!current()) return;
       if (!id) throw new Error('This group request is no longer available. Refresh Matching to try again.');
       const request = await this.#readGroupRequest(id, source);
       if (!current()) return;
       if (request.direction !== 'Outgoing' || request.group?.id !== group.id ||
           request.peer?.memberNumber !== group.host.memberNumber)
         throw new Error('This group request is no longer available. Refresh Matching to try again.');
       this.#showGroupRequestDetails(this.bind(this.safeRequest(request), source), returnFocus);
     } catch (error) {
       if (current()) throw error;
     }
   });
   this.#focusGroupRequestDetails();
 }
 async #findActiveGroupRequest(groupId: string, membership: 'Pending' | 'Accepted',
   source: MatchingSource, current: () => boolean): Promise<string | undefined> {
   for (const state of [membership, membership === 'Pending' ? 'Accepted' : 'Pending']) {
     let cursor = 0;
     // Cloud caps outgoing active requests at 100, with up to 20 rows per page.
     for (let page = 0; page < 5 && current(); page++) {
       const result = checkedGroupRequests(await this.read(
         `/v1/matching/group-requests?scope=outgoing&state=${state}&cursor=${cursor}&limit=20`, source));
       if (!current()) return;
       if (result.items.some(row => row.direction !== 'Outgoing' || row.state !== state) ||
           result.nextCursor !== null && cursor !== 0 && result.nextCursor >= cursor)
         throw new Error('Matching data could not be verified. Refresh to try again.');
       const request = result.items.find(row => row.groupId === groupId);
       if (request) return request.id;
       if (result.nextCursor === null) break;
       cursor = result.nextCursor;
     }
   }
 }
 async #readGroupRequest(id: string, source: MatchingSource): Promise<GroupMatchRequest> {
   const request = checkedGroupRequest(await this.read(`/v1/matching/group-requests/${id}`, source));
   if (request.id !== id) throw new Error('Matching data could not be verified. Refresh to try again.');
   return request;
 }
 async requestDetail(id: string, source = this.#source, fromGroup?: { group: MatchResource; returnFocus: string }): Promise<void> {
   if (this.#kind !== 'groups') return;
   await this.work(async valid => {
     const current = () => valid() && !this.#refreshAfter &&
       (!fromGroup || this.dialog.open && this.dialog.dataset.layout === 'group-details');
     if (!sameMatchingSource(source, await this.recovery.gate(current, true))) throw new MatchingGenerationError();
     const request = await this.#readGroupRequest(id, source);
     if (!current()) return;
     if (fromGroup && (request.groupId !== fromGroup.group.id || request.direction !== 'Outgoing' ||
         request.peer && request.peer.memberNumber !== fromGroup.group.host.memberNumber))
       throw new MatchingResourceUnavailable();
     this.#showGroupRequestDetails(this.bind(this.safeRequest(request), source), fromGroup?.returnFocus);
   });
   this.#focusGroupRequestDetails();
 }
 #focusGroupRequestDetails(): void {
   if (this.dialog.open && this.dialog.querySelector('.kl-match-group-request-details')) {
     this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus({ preventScroll: true });
   }
 }
 async #viewRequestedGroup(original: GroupMatchRequest, peer: number, returnFocus: string): Promise<void> {
   const stillHere = this.valid();
   let unavailable = false;
   await this.work(async valid => {
     const source = this.source(original);
     const current = () => valid() && !this.#refreshAfter && this.#kind === 'groups' && this.client.connected &&
       this.dialog.open && !!this.dialog.querySelector('.kl-match-group-request-details');
     try {
       if (!sameMatchingSource(source, this.#source) ||
           !sameMatchingSource(source, await this.recovery.gate(current, true))) throw new MatchingGenerationError();
       if (!current()) return;
       const request = await this.#readGroupRequest(original.id, source);
       if (!current()) return;
       if (request.state !== 'Accepted' || request.group?.id !== original.groupId ||
           request.direction !== original.direction || request.peer?.memberNumber !== peer || !this.allowed(peer))
         throw new MatchingResourceUnavailable();
       const group = await this.fresh(request.groupId, current, 'groups', source);
       if (!current()) return;
       const host = request.direction === 'Outgoing' ? peer : this.recovery.owner;
       if (group.id !== request.groupId || group.host.memberNumber !== host || !this.allowed(peer) ||
           group.membership !== (request.direction === 'Outgoing' ? 'Accepted' : 'owner'))
         throw new MatchingResourceUnavailable();
       this.#showGroupDetails(group, returnFocus, this.bind(request, source));
     } catch (error) {
       if (!current()) return;
       if (error instanceof MatchingResourceUnavailable || error instanceof MatchingGenerationError ||
           error instanceof CloudError && [403, 404, 410].includes(error.status)) {
         unavailable = true;
         this.dialog.close();
         this.dialog.replaceChildren();
       }
       throw error;
     }
   });
   if (unavailable && stillHere() && !this.dialog.open) this.#focusOpener(returnFocus);
   else this.#focusGroupDetails();
 }
 #showGroupRequestDetails(original: GroupMatchRequest, returnFocus = `[data-group-request="${original.id}"] button`,
   focusAction?: GroupDecision): void {
   const request = this.safeRequest(original);
   const actions = element('div', { className: 'kl-match-actions kl-match-connection-decisions' });
   let previous: HTMLButtonElement | undefined;
   for (const [action, label, allowed] of [
     ['Accepted', 'Accept group request', request.canAccept],
     ['Declined', 'Decline group request', request.canDecline],
     ['Cancelled', request.state !== 'Accepted' ? 'Cancel group request' :
       request.direction === 'Incoming' ? 'Remove group member' : 'Leave matching group', request.canCancel],
   ] as const) {
     if (!allowed) continue;
     const control = this.button(label, () => this.#confirmGroupDecision(original, action, returnFocus), true);
     if (action === 'Accepted') control.classList.add('kl-text-button--primary');
     if (action === focusAction) previous = control;
     actions.append(control);
   }
   const peer = request.peer;
   const openEventMatches = this.options.openEventMatches;
   if (request.state === 'Accepted' && request.group && peer) {
     actions.append(this.button('View group', () => void this.#viewRequestedGroup(original, peer.memberNumber, returnFocus)));
   }
   if (request.state === 'Accepted' && request.group && peer && openEventMatches) {
     actions.append(this.button('Find an event', () => {
       if (!this.dialog.open || !this.dialog.querySelector('.kl-match-group-request-details') ||
           !this.client.connected || this.#kind !== 'groups' || !this.allowed(peer.memberNumber) ||
           !sameMatchingSource(this.source(original), this.#source)) return;
       this.dialog.close();
       openEventMatches();
     }));
   }
   const avatar = element('span', { className: 'kl-match-avatar kl-match-avatar--resource', ariaHidden: 'true' },
     peer ? Array.from(peer.name.trim()).slice(0, 2).join('').toUpperCase() : kikiIcon('lock'));
   this.#showResourceDialog('Group request details',
     element('div', { className: 'kl-match-connection-details kl-match-group-request-details' },
       element('div', { className: 'kl-match-request-target' }, avatar,
         element('div', {}, element('strong', { text: request.group?.title ?? 'Unavailable group' }),
           note(`${request.direction} · ${request.state}`), note(peer?.name ?? 'Unavailable participant'))),
       element('p', { className: 'kl-match-meta kl-match-connection-dates' },
         element('span', {}, 'Created ', bindClockText(element('time'), request.createdAt, 'medium-date-time')),
         request.state === 'Pending' ? element('span', {}, 'Expires ',
           bindClockText(element('time'), request.expiresAt, 'medium-date-time')) : undefined),
       request.intent ? element('p', {}, element('strong', { text: 'Intent' }), ' · ', request.intent) : undefined,
       peer ? (request.message ? element('p', { className: 'kl-match-request-message', text: request.message }) :
         note('No introduction was added.')) : note('Request content is unavailable.'),
       note(request.group ? `${request.group.members}/${request.group.capacity} group places occupied` : 'The group is no longer readable.'),
       actions.childElementCount ? actions : undefined),
     element('footer', {}, this.button('Close', () => this.dialog.close())), returnFocus);
   if (previous && !previous.disabled) previous.focus({ preventScroll: true });
 }
 #confirmGroupDecision(original: GroupMatchRequest, action: GroupDecision, returnFocus: string): void {
   const source = this.source(original);
   const current = () => {
     if (!this.current() || !this.client.connected || this.#kind !== 'groups' || !sameMatchingSource(source, this.#source)) return;
     const request = this.safeRequest(original);
     if (action === 'Accepted' ? request.canAccept : action === 'Declined' ? request.canDecline : request.canCancel) return request;
   };
   const request = current();
   if (!request) return;
   const { title, label, copy } = action === 'Accepted' ? {
     title: 'Accept this group request?', label: 'Confirm accept',
     copy: 'This reserves a group place for the participant. Chat and other access have separate permissions.',
   } : action === 'Declined' ? {
     title: 'Decline this group request?', label: 'Confirm decline', copy: 'The request will be marked as declined.',
   } : request.state !== 'Accepted' ? {
     title: 'Cancel this group request?', label: 'Confirm cancellation', copy: 'The pending request will be withdrawn.',
   } : request.direction === 'Incoming' ? {
     title: 'Remove this group member?', label: 'Confirm removal', copy: 'This releases the participant’s place in the matching group.',
   } : {
     title: 'Leave this matching group?', label: 'Confirm leave', copy: 'This releases your place in the matching group.',
   };
   const confirm = this.button(label, () => {
     const latest = current();
     if (!latest) { this.dialog.close(); return; }
     void this.work(async valid => {
       await this.mutate('POST', `/v1/matching/group-requests/${original.id}/decision`, {
         revision: original.revision, action, groupRevision: original.group?.revision ?? null, senderRevision: original.senderRevision,
       }, valid, source, `${action} · ${latest.group?.title ?? 'Original group'} · ${latest.peer?.name ?? 'Original participant'}`);
       if (!valid()) return;
       this.dialog.close();
       this.dialog.replaceChildren();
       this.#refreshAfter = true;
     });
   }, true);
   confirm.classList.add(action === 'Accepted' ? 'kl-text-button--primary' : 'kl-match-decision-danger');
   this.#showResourceDialog(title,
     element('div', { className: 'kl-match-connection-confirm' },
       element('p', {}, element('strong', { text: request.group?.title ?? 'Unavailable group' }),
         request.peer ? ` · ${request.peer.name}` : undefined),
       note(copy)),
     element('footer', {}, this.button('Keep request', () => this.#showGroupRequestDetails(original, returnFocus, action)), confirm), returnFocus);
 }
 review(p:MatchingPending){this.show(element('h2',{text:'Saved Matching request'}),note(p.label??'Original Matching choice'),element('pre',{className:'kl-match-original',ariaLabel:'Original Matching values',text:matchingPendingText(p.body)}),note('Only your submitted content is saved here. Forget does not undo a server action.'),...(!p.confirmed?[this.button('Forget saved request',()=>{this.show(element('h2',{text:'Forget this device’s request?'}),note('The server action may already have completed. Refresh afterward to check its state.'),this.button('Confirm forget',()=>void this.work(async valid=>{await this.recovery.forget(p,valid);if(valid())this.#finishRecovery(p);})),this.button('Keep saved request',()=>this.dialog.close()));})]:[]),this.button('Close',()=>this.dialog.close()));}
 async retry(p: MatchingPending): Promise<void> {
   await this.work(async valid => {
     await this.recovery.run(p, valid);
     if (valid()) {
       const hide = confirmedHide(p, `/v1/matching/resource-choices/${this.#kind}/`);
       if (hide && this.#page === 'browse' && sameMatchingSource(hide.source, this.#source)) this.#lastHide = hide;
       this.#finishRecovery(p);
     }
   });
 }
 #finishRecovery(p: MatchingPending): void {
   if (p.path === '/v1/matching/me') {
     if (p.label === saveSignalLabel) {
       this.#finishSignalSave(p);
       return;
     }
   } else {
     this.#editor = undefined;
     this.#editorSource = undefined;
     this.#draft = undefined;
   }
   this.dialog.close();
   this.#refreshAfter = true;
 }
}
