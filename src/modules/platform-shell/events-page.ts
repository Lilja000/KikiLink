import { calendarCategories, legacyCalendarCategories } from '../../../cloud/shared/calendar-categories.mjs';
import {spaceRead,SpaceRecoveryError} from '../../cloud/space-mutation-intent';
import {reportForm} from '../../cloud/report-form';
import { PROFILE_LANGUAGES } from '../../cloud/profile-details-model';
import {eventTags,eventOutline,eventDetailsError,eventShareUrl,type EventOutline} from './event-details';
import {calendarReadAt} from '../../cloud/calendar-mutation-intent';
import {CalendarMutationIntent,CalendarRecoveryError,calendarRead,sameCalendarSource,calendarChangeText,pendingCalendarChanges,clearCalendarChanges,type CalendarRecoverySource} from '../../cloud/calendar-mutation-intent';
import {communityManagementRead} from '../../cloud/moderation-generation';
import { BrowseFilters, iconButton, searchField } from './browse-controls';
import { CloudClient, CloudError } from '../../cloud/client';
import { element as makeElement } from '../../cloud/dom';
type Props=NonNullable<Parameters<typeof makeElement>[1]>&{disabled?:boolean;onClick?:(event:MouseEvent)=>void;href?:string;download?:string};
function element<K extends keyof HTMLElementTagNameMap>(tag:K,props:Props={},...children:Array<Node|string|undefined>):HTMLElementTagNameMap[K]{
  const {disabled,onClick,href,download,...base}=props,node=makeElement(tag,base,...children);
  if(onClick)node.addEventListener('click',event=>onClick(event as MouseEvent));
  if(disabled)node.setAttribute('disabled','');
  if(href!==undefined)node.setAttribute('href',href);
  if(download!==undefined)node.setAttribute('download',download);
  return node;
}
import { bindClockText, formatClockTime, formatDateTime } from '../../core/time-format';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
import { focusedElement } from '../../utils/dom';
import { eventCalendar, eventClockContext, eventEditorDateTime, eventRange, localDateInput, localZone, parseLocalDate } from './event-time';
import { eventSelectionBadge, eventStateBadge } from './event-badges';
import { fitPanelDialog } from './panel-dialog-layout';
import { revealDetailSection } from './detail-section-navigation';
import { ShellActionMenu, type ShellAction } from './action-menu';
const eventDayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export interface EventPerson {memberNumber:number;displayName:string|null;username:string|null;avatarId:string|null;profileVisible:boolean}
interface Guest extends Partial<EventPerson> {memberNumber:number;state:string;host?:boolean}
export interface CalendarEvent {
  recoverySource?:CalendarRecoverySource;
  tags?:string[];agenda?:EventOutline[];spaceId?:string|null;linkedSpace?:{id:string;name:string}|null;hasLinkedSpace?:boolean;
  id:string; host:number; hostProfile?:EventPerson; communityId:string|null; communityName:string|null; title:string; description:string; room:string;
  category:string; language:string; visibility:'public'|'members'; startsAt:number; endsAt:number; capacity:number;
  status:'scheduled'|'cancelled'; cancellationReason?:string; revision:number; canManage:boolean; archived:boolean;
  going:number; maybe:number; waiting:number; rsvp:'none'|'going'|'maybe'|'waitlist'; rsvpRevision:number; waitPosition:number|null;
  saved:boolean; reminderMinutes:number|null; preferencesRevision:number;
}
interface Page<T> {items:T[];nextCursor:string|null}
interface Host {id:string;name:string;publicAllowed?:boolean}
interface Options {notify?(text:string):void;embedded?:boolean;browseEvents?():void;openEvent?(id:string):void;current():boolean;name(member:number):string;openProfile(member:number):void;openCommunity(id:string):void;openSpace?(id:string):void;changed():void;image?(id:string):HTMLElement}
interface DiscoverOverlayOptions { anchor: HTMLElement; current(): boolean; openMyPlans(): void; openEvent(id: string): void }
interface DiscoverOverlay extends DiscoverOverlayOptions { action: 'create' | 'plans' }
interface EventBrowseState {
  search: string; scope: string; when: string; category: string; language: string; sort: string; layout: string;
  pages: number; queryKey: string; scrollTop: number; focusedEvent?: string | undefined;
}
interface Draft {tags:string;outline:string;spaceId:string;title:string;description:string;room:string;category:string;language:string;communityId:string;visibility:string;start:string;duration:string;capacity:string}
const basicTextFields = ['title', 'description', 'language'] as const;
type BasicTextField = typeof basicTextFields[number];
interface Editor {source:CalendarRecoverySource;touchedText?:Set<BasicTextField>;held?:boolean;event?:CalendarEvent;draft:Draft;baseline:string;step:number;error:string;conflict?:CalendarEvent;discard?:boolean;tagsOpen?:boolean;scheduleDetailsOpen?:boolean;onCancel?:()=>void}
interface Pending {intent?:CalendarMutationIntent;discard?:boolean;method:'POST'|'PUT';path:string;body:Record<string,unknown>;done:(receipt:{eventId:string})=>void}
function categoryChoices(categories: readonly string[]): Array<[string,string]> {
  return [['', 'All categories'], ...categories.map((value): [string,string] => [value, value])];
}
const scopes: Array<[string,string]> = [['all','All'],['plans','My plans'],['saved','Saved'],['hosting','Hosting']];
const periods: Array<[string,string]> = [['upcoming','Upcoming'],['today','Today'],['week','This week'],['past','Past']];
const BASE='/v1/calendar/events';
function retryableGuestRead(error: unknown): boolean {
  if (error instanceof CloudError) return error.status === 408 || error.status === 429 || error.status >= 500;
  return error instanceof TypeError || error instanceof DOMException && ['NetworkError', 'TimeoutError'].includes(error.name);
}
const message=(error:unknown):string=>{
  if(error instanceof CloudError){
    const messages:Record<string,string>={invalid_event_cursor:'The event list changed. Refresh to continue.',event_unavailable:'This event is no longer available.',space_unavailable:'This Space is no longer available.',event_host_required:'You no longer manage this event.',community_archived:'This community is archived. Changes are paused.',event_closed:'This event has ended or was cancelled.',event_started:'This event has already started.',private_community_event:'Choose Members only for a private community.',event_start_must_be_future:'Choose a future start date within the next year.',event_duration_invalid:'Choose a duration between 15 minutes and 24 hours.',capacity_below_attendance:'Capacity cannot be lower than the number already going.',event_limit:'You already host 20 upcoming events.',revision_conflict:'The event changed. Review the latest details.',rsvp_conflict:'Your attendance changed on another device. Review your current RSVP.',preferences_conflict:'Your event preferences changed. Review the latest settings.',community_role_required:'You no longer manage this community.'};
    return messages[error.code]??(error.status===401?'Reconnect to Cloud to continue.':error.status===429?'Please wait a moment before trying again.':'Could not save this change. Please refresh and try again.');
  }
  return 'The result is not confirmed. Retry to check the same request.';
};

export class EventsPage {
  readonly element=element('section',{className:'kl-events-page',ariaLabel:'Events',hidden:true});
  readonly #heading=element('header',{className:'kl-ev-heading'});
  readonly #toolbar=element('div',{className:'kl-ev-toolbar'});
  readonly #tabs=element('div',{className:'kl-ev-tabs'});
  readonly #activeFilters=element('div',{className:'kl-ev-active-filters',ariaLabel:'Selected event filters'});
  readonly #status=element('div',{className:'kl-ev-status',role:'status'});
  readonly #results=element('div',{className:'kl-ev-results'});
  readonly #reminderMenu=new ShellActionMenu();
  readonly #cardActions=new ShellActionMenu('explore');
  readonly #dialog=element('dialog',{className:'kl-ev-dialog',ariaLabel:'Event editor'});
  readonly #search=element('input',{className:'kl-ev-search',type:'search',ariaLabel:'Search events',placeholder:'Search events…'});
  readonly #unsubscribe:()=>void;
  readonly #searchBox:HTMLElement;readonly #filters:BrowseFilters;readonly #context=element('div',{className:'kl-browse-context'});
  #requiresDescription = true;
  #categories = legacyCalendarCategories;
  readonly #categoryFilter = { key: 'category', label: 'Category', choices: categoryChoices(legacyCalendarCategories) };

  #setCategorySupport(extended: boolean): void {
    const choices = extended ? calendarCategories : legacyCalendarCategories;
    if (this.#categories === choices) return;
    this.#categories = choices;
    this.#categoryFilter.choices = categoryChoices(choices);
    if (!choices.includes(this.#category)) this.#category = '';
    this.#filters.close();
  }

  #details=false;#reports=false;#spaceEvents=false;#spaceId:string|undefined;#spaceName='';#spaceContext:{id:string;name:string}|undefined;#places:Array<{id:string;name:string}>=[];#placesCursor:number|null=null;
  readonly #actionsDialog=element('dialog',{className:'kl-ev-dialog',ariaLabel:'Event action'});
  readonly #plansDialog=element('dialog',{className:'kl-ev-dialog kl-ev-plans-drawer',ariaLabel:'Your next plans'});
  #actionKind:'share'|'report'|undefined;#reportState={busy:false,pending:false,dirty:false};
  #language='';#communityName='';#pages=1;#queryKey='';#listScroll=0;#returnId:string|undefined;#restoreList=false;
  #visible=false;#destroyed=false;#token=0;#epoch=0;#loading=false;#supported=false;#error='';#busy=false;
  #catalogLoadError='';
  #discovery=false;#sort='soonest';#scope='all';#when='upcoming';#category='';#layout='cards';#communityId:string|undefined;
  #cardTransition: {id:string;previous?:string|undefined} | undefined;
  #items:CalendarEvent[]=[];#cursor:string|null=null;#selected:string|undefined;#event:CalendarEvent|undefined;#eventUnavailable=false;
  #hosts:Host[]=[];#guests:Guest[]=[];#guestCursor:number|null=null;#showGuests=false;#guestPages=1;#guestKey='';
  #guestLoadError='';
  #detailTabTrigger:HTMLButtonElement|undefined;
  readonly #guestSearch=element('input',{type:'search',ariaLabel:'Search guests',placeholder:'Search guests…'});
  readonly #owner:number;readonly #origin:string;#source:CalendarRecoverySource={required:false};
  #editor:Editor|undefined;#pending:Pending|undefined;#release:(()=>void)|undefined;
  #discoverOverlay: DiscoverOverlay | undefined;
  #browseState: EventBrowseState | undefined;
  #timer:ReturnType<typeof setInterval>|undefined;#searchTimer:ReturnType<typeof setTimeout>|undefined;
  #cancelEvent:CalendarEvent|undefined;#cancelReason='';#withdraw:{event:CalendarEvent;state:'none'|'maybe'}|undefined;
  constructor(readonly client:CloudClient,readonly options:Options){
    this.#owner=client.memberNumber;this.#origin=client.origin;this.element.dataset.embedded=String(!!options.embedded);if(options.embedded)this.element.setAttribute('aria-label','Space events');
    this.#guestSearch.maxLength=80;
    this.#guestSearch.addEventListener('input',()=>{
      if(!this.#valid(this.#token)||!this.#showGuests||!this.#event||this.#busy||this.#pending)return;
      ++this.#token;
      clearTimeout(this.#searchTimer);
      this.#loading=true;
      this.#guestLoadError='';
      this.#render();
      this.#searchTimer=setTimeout(()=>void this.refresh(),250);
    });
    this.#dialog.addEventListener('keydown', event => this.#editorKeydown(event));
    this.#actionsDialog.addEventListener('keydown',e=>e.stopPropagation());this.#actionsDialog.addEventListener('cancel',e=>{e.preventDefault();this.#closeAction();});
    this.#plansDialog.addEventListener('keydown',e=>e.stopPropagation());
    this.#plansDialog.addEventListener('close',()=>{if(!this.#plansDialog.open&&this.#discoverOverlay?.action==='plans')this.#closePlans(true);});
    this.#dialog.addEventListener('close',()=>{if(!this.#dialog.open&&this.#discoverOverlay?.action==='create')this.#dismissDiscoverEditor(true);});
    this.#plansDialog.addEventListener('cancel',e=>{e.preventDefault();this.#closePlans(true);});
    this.#plansDialog.addEventListener('click',event=>{
      if(event.target!==this.#plansDialog)return;
      const bounds=this.#plansDialog.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)this.#closePlans(true);
    });
    this.#guestSearch.addEventListener('keydown',e=>e.stopPropagation());
    this.#search.maxLength=80;this.#searchBox=searchField(this.#search,'Clear event search');
    this.#filters=new BrowseFilters('Filter events',[
      {key:'scope',label:'Show plans',presentation:'chips',choices:scopes},
      {key:'when',label:'When',choices:periods},
      this.#categoryFilter,
      {key:'language',label:'Language',placeholder:'Any language',maxLength:40},
    ],values=>{
      if (!this.#visible || this.#destroyed || !this.options.current() || this.client.memberNumber !== this.#owner ||
          this.client.origin !== this.#origin || this.#selected || this.#busy || this.#pending) return;
      clearTimeout(this.#searchTimer);
      this.#scope = values.scope!;
      this.#when = values.when!;
      this.#category = values.category!;
      this.#language = values.language!;
      void this.refresh();
    },{submitLabel:'Show events'});
    this.#reminderMenu.element.id=options.embedded?'kl-space-event-reminder-menu-'+crypto.randomUUID():'kl-event-reminder-menu';
    this.element.append(this.#heading,this.#context,this.#toolbar,this.#tabs,this.#activeFilters,this.#status,this.#results,this.#dialog,this.#actionsDialog,this.#plansDialog,this.#filters.dialog,this.#reminderMenu.element,this.#cardActions.element);
    this.#search.addEventListener('input',()=>{++this.#token;clearTimeout(this.#searchTimer);this.#searchTimer=setTimeout(()=>void this.refresh(),250);});
    this.#search.addEventListener('keydown',e=>e.stopPropagation());
    this.element.addEventListener('focusin',event=>{
      if(!this.#visible||this.#selected||this.#restoreList||!this.#isGeneralCatalog()||!(event.target instanceof HTMLElement))return;
      const target=event.target;
      if(this.#results.contains(target))this.#returnId=target.closest<HTMLElement>('[data-event-id]')?.dataset.eventId;
      else if(this.#toolbar.contains(target)||this.#tabs.contains(target)||this.#heading.contains(target)||this.#activeFilters.contains(target))this.#returnId=undefined;
    });
    this.#dialog.addEventListener('cancel',e=>{e.preventDefault();this.#requestClose();});
    this.#unsubscribe=client.subscribe(kind=>{
      if (this.#discoverOverlay && (kind === 'session' || !this.#discoverCurrent(this.#discoverOverlay))) this.closeDiscoverOverlay();
      if (this.#discoverOverlay?.action === 'create' && (kind === 'communities' || kind === 'spaces') && !this.#busy) {
        // Re-open against current authorization. A generation-bound draft stays available for review.
        this.#dismissDiscoverEditor(true);
      }
      if(kind==='session'||!client.connected||!this.options.current()){
        this.#reminderMenu.close(false);this.#cardActions.close(false);
      }
      if(!client.connected||!this.options.current()||client.memberNumber!==this.#owner||client.origin!==this.#origin||['session','ready','communities','spaces','relationships','profiles-cleared'].includes(kind))this.#closePlans(!!this.#discoverOverlay);
      else if(kind==='calendar'&&this.#discoverOverlay?.action === 'plans')this.#closePlans(true);
      else if(kind==='calendar'&&this.#selected)this.#closePlans(true);
      if(!this.options.current()||client.memberNumber!==this.#owner||client.origin!==this.#origin){
        this.#browseState=undefined;this.#restoreBrowseState(undefined);this.#layout='cards';this.#restoreList=false;this.element.scrollTop=0;
        this.#closeAction(true);this.#places=[];this.#epoch++;this.#token++;clearTimeout(this.#searchTimer);this.#filters.close();this.#communityId=undefined;this.#spaceId=undefined;this.#spaceName='';this.#spaceContext=undefined;this.#spaceEvents=false;this.#cardTransition=undefined;this.#selected=undefined;this.#communityName='';this.#guestSearch.value='';this.#guestPages=1;this.#items=[];this.#event=undefined;this.#editor=undefined;this.#pending=undefined;this.#busy=false;this.#hosts=[];this.#guests=[];clearCalendarChanges(this.client);this.#source={required:false};this.#close();this.#render();return;
      }
      if(kind==='session'){
        if(!client.connected){
          this.#browseState=undefined;
          if(this.#isGeneralCatalog()){this.#restoreBrowseState(undefined);this.#layout='cards';this.#restoreList=false;this.element.scrollTop=0;}
        }
        this.#epoch++;this.#token++;this.#busy=false;if(!this.#editor?.source.generation)this.#editor=undefined;this.#items=[];this.#event=undefined;this.#guests=[];this.#close(true);
      }
      if(this.#visible&&['session','ready','connection','calendar','spaces','communities','relationships','profiles-cleared'].includes(kind)){
        const recheckGuestAccess=this.#showGuests&&['session','spaces','communities','relationships','profiles-cleared'].includes(kind);
        void this.refresh(false,!recheckGuestAccess);
      }
    });
    this.#render();
  }
  setVisible(visible:boolean):void{this.#setVisible(visible);}
  #setVisible(visible:boolean,reload=true):void{
    if(visible)this.closeDiscoverOverlay();
    else this.#rememberBrowseState();
    this.element.hidden=!visible;if(this.#visible===visible||this.#destroyed)return;this.#visible=visible;
    if(visible){this.#release=this.client.retainEvents();this.#timer=setInterval(()=>{if(!this.#busy)void this.refresh(false,true);},30000);if(reload)void this.refresh();}
    else{this.#reminderMenu.close(false);this.#cardActions.close(false);this.#closePlans();if(this.#actionsDialog.open)this.#actionsDialog.close();++this.#token;this.#filters.close();clearInterval(this.#timer);clearTimeout(this.#searchTimer);this.#release?.();this.#release=undefined;if(!this.#editor?.source.generation)this.#editor=undefined;this.#close(true);this.#items=[];this.#event=undefined;this.#guests=[];this.#detailTabTrigger=undefined;this.#loading=false;this.#results.replaceChildren();}
  }
  createSpacePanel():EventsPage{return new EventsPage(this.client,{...this.options,embedded:true});}
  openSpace(id:string,name=''):boolean{if(this.#destroyed||!this.options.current())return false;if(this.options.embedded&&this.#spaceId===id){this.setVisible(true);return true;}this.closeDiscoverOverlay();return this.#open(undefined,undefined,{id,name});}
  open(id?:string,communityId?:string):void{this.closeDiscoverOverlay();this.#open(id,communityId);}
  openBrowse(id?:string):void {
    if(this.options.embedded||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin)return;
    this.closeDiscoverOverlay();
    this.#open(id,undefined,undefined,{preserveBrowse:true});
  }
  #isGeneralCatalog():boolean{return !this.options.embedded&&!this.#communityId&&!this.#spaceId;}
  #rememberBrowseState():void{
    if(!this.#visible||this.#destroyed||this.#selected||!this.#isGeneralCatalog()||!this.options.current()||!this.client.connected||
      this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin)return;
    this.#browseState={
      search:this.#search.value,scope:this.#scope,when:this.#when,category:this.#category,language:this.#language,sort:this.#sort,
      layout:this.#layout,pages:this.#pages,queryKey:this.#queryKey,
      scrollTop:this.#restoreList?this.#listScroll:this.element.scrollTop,focusedEvent:this.#returnId,
    };
  }
  #restoreBrowseState(state:EventBrowseState|undefined):void{
    this.#search.value=state?.search??'';this.#scope=state?.scope??'all';this.#when=state?.when??'upcoming';
    this.#category=state?.category??'';this.#language=state?.language??'';this.#sort=state?.sort??'soonest';
    this.#pages=state?.pages??1;this.#queryKey=state?.queryKey??'';this.#listScroll=state?.scrollTop??0;
    this.#returnId=state?.focusedEvent;
  }
  #open(id?:string,communityId?:string,space?:{id:string;name:string},{reload=true,preserveBrowse=false}={}):boolean{
    if(this.#destroyed||!this.options.current()||this.#busy||this.#pending)return false;
    this.#closePlans();
    if(this.#editor?.source.generation){this.setVisible(true);this.#paintEditor();this.#showDialog();return false;}
    this.#rememberBrowseState();
    const browse=preserveBrowse?this.#browseState:undefined;
    this.#requestClose(true);this.#filters.close();clearTimeout(this.#searchTimer);
    this.#cardTransition=undefined;this.#selected=id;this.#event=undefined;this.#items=[];this.#cursor=null;
    this.#communityId=communityId;this.#communityName='';this.#spaceId=space?.id;this.#spaceName=space?.name??'';
    this.#spaceContext=undefined;this.#places=[];this.#placesCursor=null;this.#editor=undefined;
    this.#showGuests=false;this.#guestSearch.value='';this.#guestPages=1;
    this.#restoreBrowseState(browse);
    if(preserveBrowse)this.#layout=browse?.layout??'cards';
    this.#restoreList=preserveBrowse&&!id;
    const visible=this.#visible;
    this.#setVisible(true,reload);
    if(preserveBrowse&&id)this.element.scrollTop=0;
    if(visible&&reload)void this.refresh();
    return true;
  }
  openDiscoverAction(action: 'create' | 'plans' | 'my-plans', options?: DiscoverOverlayOptions): void {
    if (this.options.embedded || this.#destroyed || !this.options.current() || !this.client.connected ||
      this.client.memberNumber !== this.#owner || this.client.origin !== this.#origin ||
      this.#busy || this.#dialog.open || this.#actionsDialog.open) return;
    this.#restorePending();
    if (action === 'my-plans') {
      this.closeDiscoverOverlay();
      if (!this.#open(undefined, undefined, undefined, {reload:false})) return;
      this.#layout = 'agenda';
      this.#clearFilters('plans');
      return;
    }
    const host = this.element.parentElement;
    if (!options?.current() || !options.anchor.isConnected || !host || this.#visible || this.#discoverOverlay) return;
    const overlay = this.#discoverOverlay = { ...options, action };
    if (action === 'plans') {
      host.append(this.#plansDialog);
      this.#openPlans(undefined, overlay);
    } else {
      host.append(this.#dialog);
      if (this.#pending) this.#showPendingDiscoverChange();
      else void this.#prepareDiscoverEditor(overlay);
    }
  }
  closeDiscoverOverlay(): void {
    if (this.#discoverOverlay?.action === 'plans') this.#closePlans();
    else if (this.#discoverOverlay) this.#dismissDiscoverEditor();
  }
  #discoverCurrent(overlay: DiscoverOverlay): boolean {
    return this.#discoverOverlay === overlay && !this.#destroyed && this.options.current() && overlay.current() &&
      overlay.anchor.isConnected && this.client.connected && this.client.memberNumber === this.#owner && this.client.origin === this.#origin;
  }
  #finishDiscoverOverlay(overlay: DiscoverOverlay, dialog: HTMLDialogElement, restoreFocus: boolean): void {
    const focus = restoreFocus && this.#discoverCurrent(overlay);
    this.#discoverOverlay = undefined;
    ++this.#token;
    this.element.append(dialog);
    if (focus) overlay.anchor.focus({ preventScroll: true });
  }
  #dismissDiscoverEditor(restoreFocus = false): void {
    if (!this.#editor?.source.generation) this.#editor = undefined;
    this.#close(true, restoreFocus);
  }
  async #prepareDiscoverEditor(overlay: DiscoverOverlay): Promise<void> {
    if (!this.#discoverCurrent(overlay)) return;
    const current = () => this.#discoverCurrent(overlay) && this.#dialog.open;
    const status = element('p',{role:'status',text:'Checking event creation…'});
    this.#frameDialog(this.#dialog,'Create an event',element('div',{className:'kl-ev-dialog-body'},status),undefined,()=>this.#dismissDiscoverEditor(true));
    this.#showDialog();
    try {
      const me = await this.client.request<{memberNumber:number;features?:{eventsRsvp?:boolean;eventDetails?:boolean;extendedEventCategories?:boolean;optionalEventDescription?:boolean}}>('GET','/v1/me');
      if (!current()) return;
      if (me.memberNumber !== this.#owner || me.features?.eventsRsvp !== true) {
        status.textContent = 'Event creation is unavailable.';
        return;
      }
      const access = calendarRead(this.client,me), details = me.features.eventDetails === true;
      const hosts = await access.request<{items:Host[]}>('/v1/calendar/hosts');
      if (!current()) return;
      const places = details ? await access.request<{items:Array<{id:string;name:string}>;nextCursor:number|null}>('/v1/calendar/places') : {items:[],nextCursor:null};
      if (!current()) return;
      this.#supported = true;
      this.#details = details;
      this.#requiresDescription = !me.features.optionalEventDescription;
      this.#setCategorySupport(me.features.extendedEventCategories === true);
      this.#source = access.source;
      this.#hosts = hosts.items;
      this.#places = places.items;
      this.#placesCursor = places.nextCursor;
      this.#restorePending();
      if (this.#pending) { this.#showPendingDiscoverChange(); return; }
      if (this.#editor && !sameCalendarSource(this.#editor.source,access.source)) {
        this.#editor.held = true;
        this.#editor.error = 'This event changed after recovery. Your original draft is kept for review.';
      }
      this.#edit(undefined,undefined,true);
    } catch {
      if (!current()) return;
      status.textContent = 'Event creation couldn’t load.';
      const retry = this.#button('Retry',()=>void this.#prepareDiscoverEditor(overlay));
      status.after(retry);
    }
  }
  async createForCommunity(communityId:string,onCancel?:()=>void):Promise<void>{
    if(this.#destroyed||!this.options.current()||!this.client.connected||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin||this.#busy)return;
    this.#restorePending();
    if(this.#pending)return;
    if(this.#editor){this.setVisible(true);this.#paintEditor();this.#showDialog();return;}
    if(!this.#open(undefined,communityId,undefined,{reload:false}))return;
    this.#hosts=[];
    const token=this.#token+1;
    await this.refresh();
    if(!this.#valid(token)||this.#communityId!==communityId||this.#selected||!this.#supported||this.#error||this.#catalogLoadError||this.#pending||this.#editor)return;
    if(!this.#hosts.some(host=>host.id===communityId)){
      this.#error='You no longer manage this community.';
      this.#paintStatus();
      return;
    }
    this.#edit(undefined,onCancel);
  }
  #openCard(id:string):void{if(this.#busy||this.#pending)return;if(this.options.embedded&&this.options.openEvent){this.options.openEvent(id);return;}this.#closePlans();if(!this.#selected){this.#listScroll=this.element.scrollTop;this.#returnId=id;this.#rememberBrowseState();}this.#cardTransition={id,previous:this.#selected};this.#selected=id;this.#event=undefined;this.#showGuests=false;this.#guestSearch.value='';this.#guestPages=1;clearTimeout(this.#searchTimer);void this.refresh();}
  #backToList():void{this.#cardTransition=undefined;this.#closePlans();this.#selected=undefined;this.#event=undefined;this.#showGuests=false;this.#restoreList=true;void this.refresh();}

  destroy():void{this.closeDiscoverOverlay();this.setVisible(false);this.#reminderMenu.destroy();this.#cardActions.destroy();this.#destroyed=true;this.#epoch++;this.#unsubscribe();this.#editor=undefined;this.#pending=undefined;this.element.replaceChildren();}
  #viewCurrent(): boolean { return this.#visible || !!this.#discoverOverlay && this.#discoverCurrent(this.#discoverOverlay); }
  #controlCurrent(control: HTMLElement): boolean {
    if (this.#visible) return this.element.contains(control);
    const overlay=this.#discoverOverlay;
    return !!overlay && this.#discoverCurrent(overlay) && (overlay.action==='create'?this.#dialog:this.#plansDialog).contains(control);
  }
  #valid(token:number):boolean{return this.#viewCurrent()&&!this.#destroyed&&this.options.current()&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin&&this.client.connected&&token===this.#token;}
  #button(label:string,action:()=>void,icon?:KikiLinkIconName,pressed?:boolean,primary=false):HTMLButtonElement{
    const b=element('button',{type:'button',className:`kl-text-button${primary?' kl-text-button--primary':''}`,onClick:()=>{if(b.isConnected&&this.#controlCurrent(b)&&!this.#destroyed&&this.options.current()&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin&&!b.disabled)action();},disabled:this.#busy||!!this.#pending},...(icon?[kikiIcon(icon)]:[]),element('span',{text:label}));
    if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));return b;
  }
  #select(label:string,options:Array<[string,string]>,value:string,change:(v:string)=>void):HTMLSelectElement{
    const select=element('select',{ariaLabel:label});for(const [v,t]of options)select.append(element('option',{value:v,text:t}));select.value=value;select.addEventListener('change',()=>{if(select.isConnected&&this.#controlCurrent(select)&&this.options.current()&&!select.disabled)change(select.value);});return select;
  }
  #catalogQuery(): URLSearchParams {
    const query = new URLSearchParams({limit:'20',scope:this.#scope,when:this.#when==='past'?'past':'upcoming',q:this.#search.value.trim()});
    if (this.#discovery) query.set('sort', this.#layout === 'agenda' ? 'soonest' : this.#sort);
    if (this.options.embedded) query.set('status', 'scheduled');
    if (this.#spaceId) query.set('spaceId', this.#spaceId);
    if (this.#communityId) query.set('communityId', this.#communityId);
    if (this.#category) query.set('category', this.#category);
    if (this.#language) query.set('language', this.#language);
    if (this.#when === 'today' || this.#when === 'week') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + (this.#when === 'today' ? 1 : 8 - (end.getDay() || 7)));
      query.set('from', String(start.getTime()));
      query.set('to', String(end.getTime()));
    }
    return query;
  }
  async #loadGuests(request: ReturnType<typeof calendarRead>['request'], eventId: string, token: number, append: boolean): Promise<void> {
    const search=this.#discovery?this.#guestSearch.value.trim():'';
    const key=JSON.stringify([eventId,search]);
    if(key!==this.#guestKey){this.#guestKey=key;this.#guestPages=1;append=false;}
    const targetPages=append?this.#guestPages+1:this.#guestPages;
    const guests=append?[...this.#guests]:[];
    let cursor=append?this.#guestCursor:null,next:number|null=null,read=0;
    for(let i=0;i<(append?1:targetPages);i++){
      const query=new URLSearchParams({limit:'40',cursor:String(cursor??0)});
      if(this.#discovery)query.set('q',search);
      let page: {items:Guest[];nextCursor:number|null};
      try{page=await request(`${BASE}/${eventId}/guests?${query}`);}
      catch(error){
        if(!this.#valid(token))return;
        if(!retryableGuestRead(error))throw error;
        this.#guests=[];
        this.#guestCursor=null;
        this.#guestPages=targetPages;
        this.#guestLoadError=error instanceof CloudError&&error.status===429?message(error):'Try again to load the guest list.';
        return;
      }
      if(!this.#valid(token))return;
      guests.push(...page.items.filter(g=>!guests.some(old=>old.memberNumber===g.memberNumber)));
      read++;next=page.nextCursor;
      if(next===null)break;
      cursor=next;
    }
    this.#guests=guests;
    this.#guestCursor=next;
    this.#guestPages=append?this.#guestPages+read:read||1;
  }
  async refresh(append=false,background=false):Promise<void>{
    if(!this.#visible||this.#busy)return;this.#restorePending();const previous=JSON.stringify([this.#items,this.#event,this.#guests,this.#guestLoadError,this.#guestCursor,this.#cursor,this.#error,this.#catalogLoadError,this.#eventUnavailable,this.#supported,this.#discovery,this.#spaceEvents,this.#spaceName,this.#spaceContext]);const token=++this.#token;this.#loading=true;this.#error='';this.#catalogLoadError='';this.#guestLoadError='';this.#eventUnavailable=false;this.element.setAttribute('aria-busy','true');
    if(!this.client.connected||!this.options.current()||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin){this.#supported=false;this.#loading=false;this.#items=[];this.#event=undefined;this.#guests=[];this.#guestCursor=null;this.#guestPages=1;if(!this.#editor?.source.generation)this.#editor=undefined;this.#closePlans();this.#close(true);this.#render();return;}
    if(this.#selected&&this.#showGuests){
      clearTimeout(this.#searchTimer);
      if((!background||!this.#event)&&!this.#results.querySelector('.kl-ev-guests-loading'))this.#render();
    }
    if (!background) {
      // Keep the detail control available until the existing return-to-list focus handoff.
      const leavingDetail = this.#results.firstElementChild?.classList.contains('kl-ev-detail');
      const showCatalogLoading = !append && !this.#selected && !this.#spaceId && !this.options.embedded &&
        !leavingDetail &&
        (!this.#items.length || this.#queryKey !== this.#catalogQuery().toString() ||
          this.#results.firstElementChild?.classList.contains('kl-ev-catalog-loading') === true);
      if (showCatalogLoading) {
        this.#cardActions.close(false);
        this.#paintActiveFilters();
        const grid = this.#loadingGrid('Loading events');
        grid.classList.add('kl-ev-catalog-loading');
        this.#results.replaceChildren(grid);
      }
      this.#paintStatus(showCatalogLoading);
    }
    let detailRequest:string|undefined;
    try{
      const me=await this.client.request<{features?:{eventsRsvp?:boolean;eventDiscovery?:boolean;eventDetails?:boolean;eventReports?:boolean;spaceEvents?:boolean;extendedEventCategories?:boolean;optionalEventDescription?:boolean}}>('GET','/v1/me');if(!this.#valid(token))return;this.#requiresDescription = !me.features?.optionalEventDescription;this.#setCategorySupport(me.features?.extendedEventCategories === true);this.#supported=!!me.features?.eventsRsvp;this.#discovery=!!me.features?.eventDiscovery;if(this.#selected&&this.#details!==!!me.features?.eventDetails)this.#closePlans();this.#details=!!me.features?.eventDetails;this.#reports=!!me.features?.eventReports;this.#spaceEvents=!!me.features?.spaceEvents;if(!this.#supported){this.#closePlans();this.#items=[];this.#event=undefined;return;}
      const access=calendarRead(this.client,me);
      if(!sameCalendarSource(this.#source,access.source)){
        this.#closePlans();
        if(append)throw new CalendarRecoveryError();
        if(this.#selected&&this.#showGuests&&this.#event){
          this.#event=undefined;this.#guests=[];this.#guestCursor=null;this.#guestPages=1;
          this.#render();
        }
      }
      this.#source=access.source;this.#pending?.intent?.observe(access.source);
      if(this.#editor&&!sameCalendarSource(this.#editor.source,access.source)){this.#editor.held=true;this.#editor.error='This event changed after recovery. Your original draft is kept for review.';if(this.#dialog.open)this.#paintEditor();}

      if(this.#spaceId){
        this.#spaceContext=undefined;
        if(!this.#spaceEvents){this.#closePlans();this.#items=[];this.#event=undefined;this.#cursor=null;this.#spaceName='';return;}
        const space=await spaceRead(this.client,me).request<{id:string;name:string;canRead:boolean;archived:boolean}>(`/v1/spaces/${this.#spaceId}`);if(!this.#valid(token))return;
        if(space.id!==this.#spaceId||!space.canRead||space.archived)throw new CloudError('space_unavailable',404);
        this.#spaceName=space.name;this.#spaceContext={id:space.id,name:space.name};
      }
      if(this.#communityId){const community=await communityManagementRead(this.client,me).request<{name:string}>('GET',`/v1/communities/${this.#communityId}`);if(!this.#valid(token))return;this.#communityName=community.name;}
      const hosts=await access.request<{items:Host[]}>('/v1/calendar/hosts');if(!this.#valid(token))return;this.#hosts=hosts.items;
      if(this.#details&&!background){const places=await access.request<{items:Array<{id:string;name:string}>;nextCursor:number|null}>('/v1/calendar/places');if(!this.#valid(token))return;this.#places=places.items;this.#placesCursor=places.nextCursor;}
      if(this.#details&&this.#spaceContext&&!this.#places.some(s=>s.id===this.#spaceContext!.id))this.#places.push(this.#spaceContext);
      if(!this.#editor?.source.generation&&this.#editor?.draft.communityId&&!this.#hosts.some(h=>h.id===this.#editor!.draft.communityId)){this.#editor=undefined;this.#close();this.#error='You no longer manage this community.';}
      if(this.#selected){
        const hadEvent=!!this.#event;detailRequest=this.#selected;
        const e=await access.request<CalendarEvent>(`${BASE}/${this.#selected}`);if(!this.#valid(token))return;e.recoverySource=access.source;
        if(this.#plansDialog.open&&JSON.stringify(this.#event)!==JSON.stringify(e))this.#closePlans(true);
        if(this.#cardTransition?.id===e.id){this.#cardTransition=undefined;this.element.scrollTop=0;}
        this.#event=e;
        if(this.#editor?.event&&(!e.canManage||e.status!=='scheduled'||e.startsAt<=Date.now())){if(this.#editor.source.generation){this.#editor.held=true;this.#editor.error='This event can no longer be edited. Your original draft is kept.';if(this.#dialog.open)this.#paintEditor();}else{this.#editor=undefined;this.#close();}}
        if(this.#cancelEvent&&!this.#cancelEvent.recoverySource?.generation&&(!e.canManage||e.status!=='scheduled'||e.endsAt<=Date.now())||this.#withdraw&&!this.#withdraw.event.recoverySource?.generation&&(e.archived||e.status!=='scheduled'||e.endsAt<=Date.now()))this.#close();
        if(this.#showGuests){
          if(!hadEvent)this.#render();
          await this.#loadGuests(access.request,e.id,token,append);
        }
      }else{
        const query = this.#catalogQuery();
        const key=query.toString();if(key!==this.#queryKey){this.#pages=1;append=false;this.#queryKey=key;}
        const items:CalendarEvent[]=append?[...this.#items]:[];let cursor=append?this.#cursor:null,read=0,next:string|null=null;
        for(let i=0;i<(append?1:this.#pages);i++){if(cursor)query.set('cursor',cursor);else query.delete('cursor');
          const page=await access.request<Page<CalendarEvent>>(`${this.#discovery?'/v1/calendar/discover':BASE}?${query}`);if(!this.#valid(token))return;
          for(const e of page.items)e.recoverySource=access.source;
          items.push(...page.items.filter(e=>!items.some(old=>old.id===e.id)));read++;next=page.nextCursor;if(!next)break;cursor=next;
        }
        this.#items=items;this.#cursor=next;this.#pages=append?this.#pages+read:read||1;
      }
    }catch(error){
      if(this.#valid(token)){
        if(this.#selected)this.#closePlans();
        if(this.#spaceId){this.#spaceName='';this.#spaceContext=undefined;}
        const cloudError=error instanceof CloudError?error:undefined;
        this.#eventUnavailable=!!this.#selected&&cloudError?.code==='event_unavailable';
        if (!this.#selected && !this.#spaceId && !this.options.embedded) {
          this.#catalogLoadError = cloudError && (cloudError.code === 'invalid_event_cursor' || cloudError.status === 401 || cloudError.status === 429)
            ? message(cloudError) : 'Your saved plans are unchanged.';
          this.#cursor = null;
          this.#pages = 1;
        }
        else if(error instanceof SpaceRecoveryError)this.#error=error.message;
        else if(cloudError&&(!this.#selected||cloudError.status<500))this.#error=message(cloudError);
        else this.#error=this.#selected?'Try again to load the event.':'Events couldn’t load. Try again.';
        this.#items=[];this.#event=undefined;this.#guests=[];this.#guestCursor=null;this.#guestPages=1;
        if(error instanceof CalendarRecoveryError||error instanceof SpaceRecoveryError||cloudError&&([401,403,404,409].includes(cloudError.status)||['session_changed','account_changed'].includes(cloudError.code))){
          this.#closePlans();
          if(this.#editor?.source.generation){this.#editor.held=true;this.#editor.error='This event is unavailable. Your original draft is kept.';if(this.#dialog.open)this.#paintEditor();}
          else{this.#editor=undefined;this.#close();}
        }
        const transition=this.#cardTransition;
        if(transition&&transition.id===detailRequest&&!this.#pending&&!this.#editor&&
          (cloudError?.status===404||this.#eventUnavailable)){
          this.#cardTransition=undefined;
          if(transition.previous){this.#selected=transition.previous;void this.refresh();}
          else this.#backToList();
          this.options.notify?.('This event is no longer available.');
        }
      }
    }
    finally{if(this.#valid(token)){this.#loading=false;this.element.setAttribute('aria-busy','false');const current=JSON.stringify([this.#items,this.#event,this.#guests,this.#guestLoadError,this.#guestCursor,this.#cursor,this.#error,this.#catalogLoadError,this.#eventUnavailable,this.#supported,this.#discovery,this.#spaceEvents,this.#spaceName,this.#spaceContext]);if(!background||previous!==current||this.#detailTabTrigger||this.#results.firstElementChild?.classList.contains('kl-ev-catalog-loading')||this.#results.querySelector('.kl-ev-guests-loading'))this.#render();else this.#paintStatus();}}
  }
  #paintStatus(catalogLoading = false):void{
    this.#status.replaceChildren();this.#status.dataset.error=String(!!this.#error);
    if(!this.options.current()||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin)return;
    const pending=this.#pending;
    if(pending?.intent)this.#paintPendingChange(this.#status,pending,()=>this.#paintStatus());
    else if(pending&&!this.#busy){this.#status.append(element('span',{text:this.#error||'The result is not confirmed.'}),this.#button('Retry request',()=>void this.#submit()));(this.#status.lastElementChild as HTMLButtonElement).disabled=false;}
    else if(this.#busy)this.#status.textContent='Saving…';
    else if(this.#loading)this.#status.textContent=catalogLoading?'':'Refreshing…';
    else if(!this.#selected||this.#event||!this.client.connected||!this.#supported||this.#spaceId&&!this.#spaceEvents)this.#status.textContent=this.#error;
    if(!pending&&!this.#dialog.open){
      if(this.#editor?.source.generation)this.#status.append(this.#button('Resume event draft',()=>{this.#paintEditor();this.#showDialog();}));
      else if(this.#cancelEvent?.recoverySource?.generation)this.#status.append(this.#button('Resume cancellation',()=>{this.#paintCancel();this.#showDialog();}));
      else if(this.#withdraw?.event.recoverySource?.generation)this.#status.append(this.#button('Resume attendance decision',()=>{this.#paintWithdraw();this.#showDialog();}));
    }
  }
  #paintPendingChange(target:HTMLElement,pending:Pending,repaint:()=>void):void {
    const intent=pending.intent;
    if (!intent) return;
    target.append(element('strong',{text:'Unfinished event change'}),element('p',{text:this.#busy?'Saving…':intent.notice||this.#error||'The original action is kept until its result is confirmed.'}),element('p',{text:intent.label}),element('pre',{className:'kl-ev-original',ariaLabel:'Original event change',text:calendarChangeText(pending.body)}));
    const control=(label:string,run:()=>void)=>{
      const button=element('button',{type:'button',className:'kl-text-button',text:label,disabled:this.#busy||intent.busy});
      button.onclick=()=>{if(button.isConnected&&!button.disabled&&this.#controlCurrent(button)&&this.options.current()&&this.#pending===pending)run();};
      return button;
    };
    if(!intent.held||intent.confirmed)target.append(control(intent.confirmed?'Finish confirmed event change':'Retry original event change',()=>void this.#submit()));
    target.append(control('Discard event change',()=>{pending.discard=true;repaint();}));
    if(pending.discard)target.append(element('p',{text:'Discard these original details? This does not undo a change that may already have reached the server.'}),control('Keep event change',()=>{pending.discard=false;repaint();}),control('Confirm discard',()=>{intent.release();this.#pending=undefined;this.#editor=undefined;this.#close();void this.refresh();}));
  }
  #showPendingDiscoverChange():void {
    const pending=this.#pending;
    if (!pending || this.#discoverOverlay?.action!=='create') return;
    const body=element('div',{className:'kl-ev-dialog-body kl-ev-status'});
    if(pending.intent)this.#paintPendingChange(body,pending,()=>this.#showPendingDiscoverChange());
    else {
      const retry=this.#button('Retry request',()=>void this.#submit());retry.disabled=this.#busy;
      body.append(element('p',{role:'status',text:this.#error||'The original event change is awaiting confirmation.'}),retry);
    }
    this.#frameDialog(this.#dialog,'Event change',body,undefined,()=>{if(!this.#busy)this.#dismissDiscoverEditor(true);},true);
    this.#showDialog();
  }
  #paintActiveFilters(): void {
    this.#activeFilters.replaceChildren();
    if (this.#selected || !this.#filtered()) return;
    const when = this.#when === 'upcoming' ? '' : periods.find(([value]) => value === this.#when)?.[1];
    const tags = [when, this.#category, this.#language]
      .filter((value): value is string => Boolean(value)).map(value => this.#tag(value));
    this.#activeFilters.append(...tags, this.#button('Clear filters', () => this.#clearFilters()));
  }
  #render():void{
    const detailTabTrigger = this.#detailTabTrigger;
    this.#detailTabTrigger = undefined;
    this.#reminderMenu.close(false);
    this.#cardActions.close(false);
    this.element.dataset.layout = this.#layout;
    this.element.setAttribute('aria-busy',String(this.#loading||this.#busy));this.#paintStatus();
    if(this.#actionKind==='report'&&!this.#actionsDialog.open)this.#status.append(this.#button('Resume event report',()=>this.#showAction()));
    const back=this.#selected?this.#button('Events',()=>this.#backToList(),'back'):undefined;
    back?.classList.add('kl-ev-back-link');
    this.#heading.classList.toggle('kl-ev-path',!!this.#selected);
    const create=this.#button('Create event',()=>this.#edit(),'plus',undefined,true);create.disabled ||= !this.#supported||!this.client.connected||!!this.#spaceId&&(!this.#spaceEvents||!this.#spaceContext||!this.#details);
    this.#heading.replaceChildren(element('div',{},back,...(this.#selected?[]:[element('h1',{text:'Events'})])),element('div',{},iconButton('Refresh','refresh',()=>void this.refresh()),...(this.#selected?[]:[create])));
    const eventCount=`${this.#items.length}${this.#cursor?'+':''} ${this.#items.length===1&&!this.#cursor?'event':'events'}`;
    const filterSummary=this.client.connected&&this.#supported&&!this.#error&&!this.#catalogLoadError?`${eventCount} shown`:'';
    this.#filters.set({scope:this.#scope,when:this.#when,category:this.#category,language:this.#language},filterSummary);this.#filters.button.disabled=this.#busy||!!this.#pending;this.#search.disabled=this.#busy||!!this.#pending;
    this.#context.replaceChildren();if(this.#communityId)this.#context.append(this.#button(this.#communityName||'Community',()=>this.options.openCommunity(this.#communityId!),'users'),iconButton('Clear community filter','close',()=>{if(this.#busy||this.#pending)return;this.#communityId=undefined;this.#communityName='';void this.refresh();}));
    if(this.#spaceId){
      const id=this.#spaceId,clear=this.#button('Clear Space filter',()=>{if(this.#spaceId!==id)return;this.#spaceId=undefined;this.#spaceName='';this.#spaceContext=undefined;this.#cursor=null;this.#items=[];this.#pages=1;this.#restoreList=false;void this.refresh();},'close');
      clear.classList.add('kl-browse-icon');clear.title='Clear Space filter';clear.setAttribute('aria-label','Clear Space filter');clear.querySelector('span')?.classList.add('kl-ev-sr');
      this.#context.append(this.#button(this.#spaceName||'Space',()=>this.options.openSpace?.(id),'door'),clear);
    }
    this.#toolbar.hidden=this.#tabs.hidden=!!this.#selected;
    this.#paintActiveFilters();
    if(!this.#selected){
      const focused=focusedElement(this.#search);
      const plansFocused=focused?.matches('.kl-ev-context-action')&&!this.#plansDialog.open;
      const selection=[this.#search.selectionStart,this.#search.selectionEnd];
      const plans=this.#button('Your plans',()=>this.#openPlans(),'calendar');
      plans.classList.add('kl-ev-context-action');plans.title='Your plans';plans.querySelector('span')?.classList.add('kl-ev-sr');
      plans.setAttribute('aria-haspopup','dialog');
      plans.disabled ||= !this.#supported||!this.client.connected;
      this.#toolbar.replaceChildren(this.#searchBox,this.#filters.button,plans);
      if(focused===this.#search){this.#search.focus({preventScroll:true});this.#search.setSelectionRange(selection[0]??0,selection[1]??0);}
      else if(plansFocused&&!plans.disabled)plans.focus({preventScroll:true});
      const scopeButtons = element('div', { className: 'kl-ev-scopes', role: 'group', ariaLabel: 'Event filters' },
        ...scopes.map(([value,label])=>
          this.#button(label,()=>{this.#scope=value;void this.refresh();},undefined,this.#scope===value)));
      const layout = element('div', { className: 'kl-ev-layout', role: 'group', ariaLabel: 'Event layout' },
        ...(['cards', 'agenda'] as const).map(value => this.#button(value === 'cards' ? 'Cards' : 'Agenda',
          () => { this.#layout = value; void this.refresh(); }, value === 'cards' ? 'feed' : 'calendar', this.#layout === value)));
      const layoutTools = element('div', { className: 'kl-ev-layout-tools' }, layout);
      if (this.#layout === 'cards' && this.#discovery) layoutTools.append(element('label', { className: 'kl-ev-sort' }, 'Sort',
        this.#select('Sort events', [['soonest', 'Soonest'], ['popular', 'Popular']], this.#sort, value => { this.#sort = value; void this.refresh(); })));
      if (this.#layout === 'agenda') layoutTools.append(element('small', { className: 'kl-ev-meta', text: 'By date' }));
      this.#tabs.replaceChildren(scopeButtons, layoutTools);
      if(focused?.matches('.kl-ev-detail-context')&&this.#scope==='plans')scopeButtons.querySelector<HTMLElement>('button[aria-pressed=true]')?.focus({preventScroll:true});
    }
    if(!this.client.connected){this.#results.replaceChildren(this.#empty('Connect to Cloud','Your events and plans will appear here.'));return;}
    if(!this.#supported&&!this.#catalogLoadError){this.#results.replaceChildren(this.#loading?this.#loadingGrid('Loading events'):this.#empty('Events are not available yet','Update the test server to enable Events.'));return;}
    if(this.#spaceId&&!this.#spaceEvents&&!this.#loading){this.#results.replaceChildren(this.#empty('Space events are not available yet','Update Cloud to browse events linked to this Space. Your other events are unchanged.'));return;}
    if(this.#selected){
      if(this.#event){
        const active = focusedElement(this.#results);
        const guestSelection = active===this.#guestSearch ? [this.#guestSearch.selectionStart,this.#guestSearch.selectionEnd] : undefined;
        const activeTabs = active?.closest<HTMLElement>('.kl-ev-detail-tabs');
        const tabFocused = activeTabs?.dataset.eventId === this.#event.id && this.#results.contains(activeTabs);
        this.#results.replaceChildren(this.#detail(this.#event));
        if(tabFocused){
          const tabs = this.#results.querySelector<HTMLElement>('.kl-ev-detail-tabs');
          const selected = tabs?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
          if(tabs && selected){
            if(active === detailTabTrigger)revealDetailSection(selected,tabs,this.element);
            else selected.focus({preventScroll:true});
          }
        }else if(guestSelection&&this.#guestSearch.isConnected){
          this.#guestSearch.focus({preventScroll:true});
          this.#guestSearch.setSelectionRange(guestSelection[0]??0,guestSelection[1]??0);
        }else if(active?.matches('.kl-ev-detail-context'))this.#results.querySelector<HTMLElement>('.kl-ev-detail-context')?.focus({preventScroll:true});
        return;
      }
      if(this.#loading){this.#results.replaceChildren(this.#loadingGrid('Loading event',1));return;}
      const unavailable=this.#eventUnavailable||!this.#error;
      const empty=this.#empty(unavailable?'Event unavailable':'Event couldn’t load',unavailable?'It may have been removed or your access may have changed.':this.#error,unavailable?'calendar':'offline');
      empty.classList.add('kl-explore-empty','kl-ev-detail-error');
      empty.setAttribute('role','alert');
      empty.append(unavailable
        ? this.#button('Explore events', () => this.#backToList(), undefined, undefined, true)
        : this.#button('Retry', () => void this.refresh(), 'refresh', undefined, true));
      this.#results.replaceChildren(empty);return;
    }
    const summary = () => element('div',{className:'kl-browse-summary',role:'status'},
      element('span',{text:`${eventCount}${this.#scope==='plans'?' in your plans':''}`}),
      element('span',{text:`Local time · ${localZone()}`}));
    if (this.#catalogLoadError) {
      const error = this.#empty('Events couldn’t load', this.#catalogLoadError, 'offline');
      error.classList.add('kl-explore-empty', 'kl-ev-catalog-error');
      error.setAttribute('role', 'alert');
      const retry = this.#button('Retry', () => {
        if (this.#loading) return;
        if (focusedElement(this.element) === retry) this.#search.focus({ preventScroll: true });
        void this.refresh();
      }, 'refresh', undefined, true);
      error.append(retry);
      this.#results.replaceChildren(error);
    } else if(!this.#items.length){
      if(this.#loading){this.#results.replaceChildren(this.#loadingGrid('Loading events'));return;}
      const filtered=this.#filtered(), linkedEmpty=!!this.options.embedded&&!this.#error&&!this.#cursor&&!filtered;
      const empty=this.#empty(linkedEmpty?'No events linked yet':this.#error?'Events couldn’t load':this.#cursor?'Keep searching':filtered?'No matching events':'No events yet',linkedEmpty?'Events linked to this room will appear here.':this.#error?'Your saved plans are unchanged.':this.#cursor?'More events are available to search.':filtered?'Try another search or clear your filters.':'Create an event and make a plan.',this.#error?'warning':linkedEmpty?'door':'calendar');
      if(linkedEmpty&&this.options.browseEvents)empty.append(this.#button('Explore events',()=>this.options.browseEvents?.()));
      const directoryEmpty=!this.options.embedded&&!this.#error&&!this.#cursor&&filtered;
      if(directoryEmpty)empty.classList.add('kl-explore-empty');
      if(!this.options.embedded||this.#error||this.#cursor||filtered)empty.append(this.#error?this.#button('Retry',()=>void this.refresh(),'refresh'):this.#cursor?this.#button('Load more events',()=>void this.refresh(true)):filtered?this.#button('Clear filters',()=>{this.#clearFilters();if(directoryEmpty)this.#search.focus({preventScroll:true});},undefined,undefined,directoryEmpty):this.#button('Create an event',()=>this.#edit(),'plus',undefined,true));
      this.#results.replaceChildren(...(directoryEmpty?[summary()]:[]),empty);
    } else {
      const content = this.#layout === 'agenda' ? this.#agenda() : element('div', { className: 'kl-ev-grid' }, ...this.#items.map(event => this.#card(event)));
      this.#results.replaceChildren(...(this.options.embedded?[]:[summary()]),content);if(this.#cursor)this.#results.append(this.#button('Load more events',()=>void this.refresh(true)));
    }
    if (this.#restoreList && !this.#loading) {
      this.#restoreList = false;
      this.element.scrollTop = this.#listScroll;
      const previousCard = this.#returnId
        ? [...this.#results.querySelectorAll<HTMLElement>('[data-event-id]')].find(row=>row.dataset.eventId===this.#returnId)
          ?.querySelector<HTMLButtonElement>('button.kl-ev-title, .kl-ev-row-open')
        : undefined;
      (previousCard ?? this.#search).focus({ preventScroll: true });
    }
  }
  #agenda(): HTMLElement {
    const groups = new Map<string, CalendarEvent[]>();
    const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    for (const event of [...this.#items].sort((a, b) => a.startsAt - b.startsAt)) {
      const date = new Date(event.startsAt).toDateString();
      const group = groups.get(date);
      if (group) group.push(event);
      else groups.set(date, [event]);
    }
    return element('div', { className: 'kl-ev-agenda' }, ...Array.from(groups.values(), events =>
      element('section', { className: 'kl-ev-agenda-day' },
        element('h2', {}, formatter.format(events[0]!.startsAt),
          new Date(events[0]!.startsAt).toDateString() === new Date().toDateString() ? this.#badge('Today',undefined,'gold') : undefined),
        element('div', { className: 'kl-ev-agenda-rows' }, ...events.map(event => this.#row(event))))));
  }
  #filtered():boolean{return !!(this.#search.value||this.#scope!=='all'||this.#when!=='upcoming'||this.#category||this.#language);}
  #clearFilters(scope='all'):void{clearTimeout(this.#searchTimer);this.#search.value='';this.#scope=scope;this.#when='upcoming';this.#category='';this.#language='';this.#sort='soonest';void this.refresh();}
  #empty(title:string,copy:string,icon:KikiLinkIconName='calendar'):HTMLElement{return element('div',{className:'kl-ev-empty'},kikiIcon(icon),element('h2',{text:title}),element('p',{text:copy}));}
  #loadingGrid(label:string,count=4):HTMLElement{
    const grid=element('div',{className:'kl-ev-grid kl-ev-loading',role:'status',ariaLabel:label});grid.setAttribute('aria-busy','true');
    for(let index=0;index<count;index++)grid.append(element('div',{className:'kl-ev-skeleton-card',ariaHidden:'true'},element('div',{className:'kl-ev-skeleton kl-ev-skeleton--avatar'}),element('div',{className:'kl-ev-skeleton kl-ev-skeleton--medium'}),element('div',{className:'kl-ev-skeleton kl-ev-skeleton--short'}),element('div',{className:'kl-ev-skeleton'})));
    return grid;
  }
  #date(event:CalendarEvent):HTMLElement{return element('span',{className:'kl-ev-datebox',role:'img',ariaLabel:formatDateTime(event.startsAt)},element('span',{text:new Intl.DateTimeFormat(undefined,{month:'short'}).format(event.startsAt)}),element('strong',{text:String(new Date(event.startsAt).getDate())}),element('small',{text:new Intl.DateTimeFormat(undefined,{weekday:'short'}).format(event.startsAt)}));}
  #badge(text:string,icon?:KikiLinkIconName,tone?:'gold'|'danger'|'live'):HTMLElement{
    const badge=element('span',{className:'kl-ev-badge'},icon?kikiIcon(icon):undefined,text);
    if(tone)badge.dataset.tone=tone;
    return badge;
  }
  #tag(text:string):HTMLElement{return element('span',{className:'kl-ev-tag',text});}
  #stateBadge(e:CalendarEvent):HTMLElement|undefined{
    const badge=eventStateBadge(e);
    return badge&&this.#badge(badge.label,badge.icon,badge.tone);
  }
  #selectionBadge(e:CalendarEvent):HTMLElement|undefined{
    const badge=eventSelectionBadge(e.rsvp);
    return badge&&this.#badge(badge.label,badge.icon,badge.tone);
  }
  #person(person:EventPerson|undefined,member:number):EventPerson{
    return person??{memberNumber:member,displayName:this.#discovery?null:this.options.name(member),username:null,avatarId:null,profileVisible:!this.#discovery};
  }
  #avatar(person:EventPerson):HTMLElement{
    const avatar=element('span',{className:'kl-ev-avatar'});
    if(person.profileVisible&&person.avatarId&&this.options.image)avatar.append(this.options.image(person.avatarId));
    else avatar.textContent=(person.displayName||'Member').trim().slice(0,1).toUpperCase();
    avatar.setAttribute('aria-hidden','true');return avatar;
  }
  #profile(person:EventPerson,label?:string):HTMLElement{
    const name=label??person.displayName??`Member #${person.memberNumber}`;
    if(!person.profileVisible)return element('span',{className:'kl-ev-private-person',text:name});
    const button=this.#button(name,()=>this.options.openProfile(person.memberNumber));button.classList.add('kl-ev-profile-link');button.title=`Member #${person.memberNumber}`;return button;
  }
  #clock(e:CalendarEvent):string{return `${formatClockTime(e.startsAt)}–${formatClockTime(e.endsAt)}${eventClockContext(e.startsAt,e.endsAt)}`;}
  #rsvp(e:CalendarEvent,state:'none'|'going'|'maybe'):void{
    if(this.#busy||this.#pending)return;
    if(e.rsvp==='going'||e.rsvp==='waitlist'){this.#withdraw={event:e,state:state as 'none'|'maybe'};this.#paintWithdraw();this.#showDialog();}
    else this.#mutate('PUT',`${BASE}/${e.id}/rsvp`,{revision:e.rsvpRevision,eventRevision:e.revision,state},undefined,e.recoverySource,`${state} · ${e.title}`);
  }
  #paintWithdraw():void{
    const pending=this.#withdraw;if(!pending)return;const e=pending.event;
    const title=e.rsvp==='waitlist'?'Leave the waitlist?':'Change your plans?';
    const confirm=this.#button(this.#pending?'Retry RSVP':pending.state==='none'?'Withdraw':'Change to Maybe',()=>{
      if(this.#pending){void this.#submit();return;}
      this.#mutate('PUT',`${BASE}/${e.id}/rsvp`,{revision:e.rsvpRevision,eventRevision:e.revision,state:pending.state},()=>this.#close(),e.recoverySource,`${pending.state} · ${e.title}`);
    });confirm.disabled=this.#busy;confirm.classList.add('kl-ev-danger');
    const body=element('div',{className:'kl-ev-dialog-body'},
      element('p',{text:e.rsvp==='waitlist'?'You will lose your place in the queue.':'Your place will become available to someone else.'}),
      element('p',{className:'kl-ev-withdraw-note',text:pending.state==='none'?e.title:`${e.title} · Change to Maybe`}),
      element('p',{className:'kl-ev-form-error',role:'alert',text:this.#error}));
    const footer=element('footer',{className:'kl-ev-dialog-footer'},this.#button('Keep my plan',()=>this.#close()),confirm);
    this.#frameDialog(this.#dialog,title,body,footer,()=>this.#requestClose());
  }
  #attendance(e:CalendarEvent,...beforeSave:HTMLElement[]):HTMLElement{
    const actions=element('div',{className:'kl-ev-actions'}),closed=e.archived||e.status==='cancelled'||e.endsAt<=Date.now();
    const attending=e.rsvp==='going'||e.rsvp==='waitlist';
    if(closed)actions.append(element('small',{className:'kl-ev-meta',text:e.archived?'Archived community · attendance paused':e.status==='cancelled'?'This event was cancelled.':'Attendance is closed.'}));
    else{
      const waitlist=e.rsvp==='waitlist'||(!attending&&e.going>=e.capacity);
      const label=e.rsvp==='waitlist'?`On waitlist · #${e.waitPosition}`:waitlist?'Join waitlist':'Going';
      actions.append(this.#button(label,()=>this.#rsvp(e,attending?'none':'going'),waitlist?'clock':'check',attending,!attending),this.#button('Maybe',()=>this.#rsvp(e,e.rsvp==='maybe'?'none':'maybe'),undefined,e.rsvp==='maybe'));
    }
    const save=this.#button(e.saved?'Saved':'Save',()=>this.#toggleSaved(e),'bookmark',e.saved);
    save.classList.add('kl-ev-save');save.title=e.saved?'Remove saved event':'Save event';save.setAttribute('aria-label',save.title);save.querySelector('span')?.classList.add('kl-ev-sr');actions.append(...beforeSave,save);return actions;
  }
  #toggleSaved(e: CalendarEvent): void {
    const reminderMinutes = e.startsAt > Date.now() && e.status === 'scheduled' && !e.archived ? e.reminderMinutes : null;
    this.#mutate('PUT', `${BASE}/${e.id}/preferences`, { revision:e.preferencesRevision, saved:!e.saved, reminderMinutes }, undefined,
      e.recoverySource, `${e.saved?'Unsave':'Save'} · ${e.title}`);
  }
  #eventMenu(e: CalendarEvent, detail = false): HTMLButtonElement {
    const current = () => {
      if (!trigger.isConnected || !this.#valid(this.#token) || this.#loading || this.#busy || this.#pending) return;
      if (detail) return this.#selected === e.id && this.#event?.id === e.id ? this.#event : undefined;
      if (!this.#selected) return this.#items.find(item => item.id === e.id);
    };
    const trigger = element('button', { type:'button', className:'kl-ev-menu kl-ev-menu-trigger', ariaLabel:detail?'Event options':`${e.title} options`, title:'Event options',
      disabled:this.#busy||!!this.#pending, onClick:() => {
        const selected = current(); if (!selected) return;
        const run = (action: (event:CalendarEvent) => void) => () => { const live = current(); if (live) action(live); };
        const actions: ShellAction[] = [
          { label:selected.saved?'Remove saved event':'Save event', icon:'bookmark', run:run(event=>this.#toggleSaved(event)) },
        ];
        if (this.#details) actions.push({ label:'Share event', icon:'copy', run:run(event=>this.#share(event)) });
        actions.push({ label:'Add to calendar', icon:'calendar', run:run(event=>this.#export(event)) });
        const manageable = (event:CalendarEvent) => event.canManage && event.status === 'scheduled' && event.endsAt > Date.now();
        if (manageable(selected)) {
          const upcoming = selected.startsAt > Date.now();
          if (upcoming) actions.push({ label:'Edit event', icon:'edit', run:run(event=>{if (manageable(event) && event.startsAt > Date.now()) this.#edit(event);}) });
          actions.push({ label:'Cancel event', icon:'close', run:run(event=>{if (manageable(event)) this.#cancel(event);}) });
        }
        if (this.#reports) actions.push({ label:'Report event', icon:'flag', run:run(event=>this.#report(event)) });
        this.#cardActions.open(trigger,'Event options',actions,undefined,false,false);
      } }, kikiIcon('more'));
    trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');return trigger;
  }
  #card(e:CalendarEvent):HTMLElement{
    const article=element('article',{className:'kl-ev-card'});article.dataset.eventId=e.id;
    const host=this.#person(e.hostProfile,e.host),hostLine=element('div',{className:'kl-ev-host-line'},e.communityId?this.#button(e.communityName||'Community',()=>this.options.openCommunity(e.communityId!)):this.#profile(host,`Hosted by ${host.displayName??`Member #${e.host}`}`));
    const visibility=element('span',{className:'kl-ev-visibility'},kikiIcon(e.visibility==='public'?'globe':'lock'),
      e.visibility==='public'?'Public':'Members only');
    const facts=element('div',{className:'kl-ev-card-facts kl-ev-meta'},
      element('span',{},kikiIcon('clock'),this.#clock(e)),element('span',{},kikiIcon('users'),`${e.going}/${e.capacity} going`),
      element('span',{},kikiIcon('globe'),e.language));
    article.append(this.#date(e),element('h2',{},element('button',{type:'button',className:'kl-ev-title',title:e.title,text:e.title,onClick:()=>this.#openCard(e.id)})),
      hostLine,element('div',{className:'kl-ev-card-category kl-ev-meta'},element('span',{text:e.category}),visibility),this.#eventMenu(e),
      element('p',{className:'kl-ev-description',text:e.description}),facts,
      element('div',{className:'kl-ev-tags'},this.#stateBadge(e),this.#selectionBadge(e),...(e.tags??[]).slice(0,2).map(t=>this.#tag(t))),
      this.#attendance(e));
    return article;
  }
  #row(e:CalendarEvent):HTMLElement{
    const row=element('article',{className:'kl-ev-row'});row.dataset.eventId=e.id;
    row.append(this.#rowOpen(e,()=>this.#openCard(e.id)),element('div',{className:'kl-ev-row-controls'},this.#attendance(e),this.#eventMenu(e)));return row;
  }
  #rowOpen(e:CalendarEvent,openEvent:()=>void):HTMLButtonElement{
    const host=this.#person(e.hostProfile,e.host);
    return element('button',{type:'button',className:'kl-ev-row-open',onClick:openEvent},this.#date(e),
      element('span',{className:'kl-ev-row-copy'},element('strong',{className:'kl-ev-title',title:e.title,text:e.title}),
        element('small',{text:this.#clock(e)}),element('small',{text:e.communityName??host.displayName??`Member #${e.host}`})),
      element('span',{className:'kl-ev-row-end'},this.#selectionBadge(e)??this.#stateBadge(e),kikiIcon('arrow-right')));
  }
  #detail(e:CalendarEvent):HTMLElement{
    const detail=element('div',{className:'kl-ev-detail'}),header=element('section',{className:'kl-ev-panel kl-ev-detail-header'}),host=this.#person(e.hostProfile,e.host);
    const tools=element('div',{className:'kl-ev-detail-tools'});
    if(this.#details){
      const share=this.#button('Share event',()=>this.#share(e),'copy');
      share.classList.add('kl-ev-icon-action');share.title='Share event';share.querySelector('span')?.classList.add('kl-ev-sr');
      tools.append(share);
    }
    tools.append(this.#eventMenu(e, true));
    const headingCopy=element('div',{className:'kl-ev-heading-copy'},
      element('div',{className:'kl-ev-detail-badges'},this.#tag(e.category),
        this.#badge(e.visibility==='public'?'Public':'Members only',e.visibility==='public'?'globe':'lock'),this.#stateBadge(e),
        e.canManage?this.#badge(e.host===this.client.memberNumber?'Host':'Administrator','shield','gold'):undefined),
      element('h1',{text:e.title}),
      element('div',{className:'kl-ev-detail-host'},e.communityId?this.#button(e.communityName||'Community',()=>this.options.openCommunity(e.communityId!)):undefined,
        e.communityId?' · ':undefined,'Hosted by ',this.#profile(host)));
    header.append(element('div',{className:'kl-ev-card-top'},this.#date(e),headingCopy,tools));
    const fact = (icon: KikiLinkIconName, label: string, ...children: HTMLElement[]) =>
      element('div', {}, kikiIcon(icon), element('div', { className: 'kl-ev-fact-copy' }, element('small', { text: label }), ...children));
    header.append(element('div', { className: 'kl-ev-facts' },
      fact('calendar', 'Date & local time', element('strong', { text: eventDayFormat.format(e.startsAt), title: formatDateTime(e.startsAt) }),
        element('span', { title: eventRange(e.startsAt, e.endsAt) }, bindClockText(element('time'), e.startsAt), '–', bindClockText(element('time'), e.endsAt), `${new Date(e.startsAt).toDateString() !== new Date(e.endsAt).toDateString() ? ' (+1 day)' : ''} · ${localZone(e.startsAt)}${localZone(e.startsAt) !== localZone(e.endsAt) ? ` → ${localZone(e.endsAt)}` : ''}`)),
      fact('users', 'Capacity', element('strong', { text: `${e.going} of ${e.capacity} going` }),
        element('span', { text: e.waiting ? `${e.waiting} on waitlist` : `${Math.max(0, e.capacity - e.going)} places available` })),
      fact('globe', 'Language & location', element('strong', { text: e.language }), element('span', { text: e.room || 'Shared by the host' }))));
    const reminderAvailable=()=>remind.isConnected&&!remind.disabled&&this.#visible&&!this.#destroyed&&this.options.current()&&this.client.connected&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin&&this.#selected===e.id&&this.#event?.id===e.id&&!this.#busy&&!this.#pending&&!e.archived&&e.status!=='cancelled'&&e.startsAt>Date.now();
    const remind=this.#button(e.reminderMinutes===null?'Remind me':'Reminder on',()=>{
      if(!reminderAvailable())return;
      this.#reminderMenu.open(remind,'Event reminder',([[null,'Reminder off'],[15,'15 minutes before'],[60,'1 hour before'],[1440,'1 day before']] as const).map(([minutes,label])=>({
        label,checked:e.reminderMinutes===minutes,run:()=>{
          if(!reminderAvailable()||e.reminderMinutes===minutes)return;
          this.#mutate('PUT',`${BASE}/${e.id}/preferences`,{revision:e.preferencesRevision,saved:e.saved,reminderMinutes:minutes},undefined,e.recoverySource,`Reminder · ${e.title}`);
        },
      })));
    },'notifications',e.reminderMinutes!==null);
    remind.classList.add('kl-ev-detail-reminder-button');remind.setAttribute('aria-label','Event reminder');remind.setAttribute('aria-haspopup','menu');remind.setAttribute('aria-expanded','false');
    remind.title=e.reminderMinutes===null?'Remind me':e.reminderMinutes===1440?'1 day before':e.reminderMinutes===60?'1 hour before':'15 minutes before';
    remind.disabled ||= e.archived||e.status==='cancelled'||e.startsAt<=Date.now();
    const detailActions: HTMLElement[] = [];
    if(!this.options.embedded){
      const info=this.#button('Event information',()=>this.#openPlans(e),'info');
      info.classList.add('kl-ev-detail-context');info.title='Event information';info.setAttribute('aria-label','Event information');
      info.setAttribute('aria-haspopup','dialog');info.querySelector('span')?.classList.add('kl-ev-sr');
      detailActions.push(info);
    }
    detailActions.push(element('span',{className:'kl-ev-detail-action-spacer',ariaHidden:'true'}),remind);
    const attendance = this.#attendance(e,...detailActions);
    attendance.classList.add('kl-ev-detail-actions');
    header.append(attendance);
    detail.append(header);
    if(e.status==='cancelled'){
      detail.append(element('div',{className:'kl-ev-detail-notice',role:'status'},kikiIcon('calendar'),
        e.cancellationReason?element('span',{},element('strong',{text:'Cancelled: '}),e.cancellationReason)
          :element('span',{text:'This event has been cancelled. Saved plans remain here for reference.'})));
    }else if(e.rsvp==='waitlist'&&!e.archived&&e.endsAt>Date.now()){
      const label=e.waitPosition===null?'On waitlist.':`On waitlist · #${e.waitPosition}.`;
      detail.append(element('div',{className:'kl-ev-detail-notice',role:'status'},kikiIcon('clock'),
        element('span',{},element('strong',{text:label}),' Your place is assigned automatically when one becomes available.')));
    }
    const tabs=element('div',{className:'kl-ev-detail-tabs',role:'tablist',ariaLabel:'Event sections'});
    tabs.dataset.eventId=e.id;
    for(const [show,label] of [[false,'Overview'],[true,`Guests · ${e.going+e.maybe}`]] as const){
      const button=this.#button(label,()=>{
        if(this.#event?.id!==e.id||this.#selected!==e.id)return;
        if(show===this.#showGuests&&this.#loading)return;
        button.focus({preventScroll:true});
        this.#detailTabTrigger=button;
        const recheckEvent=!show&&this.#showGuests&&this.#loading;
        clearTimeout(this.#searchTimer);
        this.#showGuests=show;
        if(show)void this.refresh();
        else{
          this.#render();
          if(recheckEvent)void this.refresh(false,true);
        }
      });
      button.setAttribute('role','tab');
      button.setAttribute('aria-selected',String(this.#showGuests===show));
      button.tabIndex=this.#showGuests===show?0:-1;
      button.id=show?'kl-ev-guests-tab':'kl-ev-overview-tab';
      button.setAttribute('aria-controls','kl-ev-tab-panel');
      button.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();
        const index=event.key==='Home'?0:event.key==='End'?1:this.#showGuests?0:1;
        (tabs.children[index] as HTMLButtonElement).click();
      });
      tabs.append(button);
    }
    detail.append(tabs);
    const panel=element('section',{role:'tabpanel'});panel.id='kl-ev-tab-panel';panel.setAttribute('aria-labelledby',this.#showGuests?'kl-ev-guests-tab':'kl-ev-overview-tab');
    if(this.#showGuests){
      const guests=element('section',{className:'kl-ev-panel'},element('header',{className:'kl-ev-section-heading'},
        element('div',{},element('h2',{text:'Guests'}),element('p',{className:'kl-ev-section-note',text:`${e.going} going`}))));
      if(this.#discovery){this.#guestSearch.disabled=this.#busy||!!this.#pending;const search=searchField(this.#guestSearch);search.classList.add('kl-ev-guest-search');guests.append(search);}
      const reload=(button:HTMLButtonElement,append=false):void=>{
        if(this.#loading||!this.#showGuests||this.#event?.id!==e.id)return;
        if(focusedElement(this.element)===button){
          const target=this.#guestSearch.isConnected?this.#guestSearch:this.#results.querySelector<HTMLButtonElement>('#kl-ev-guests-tab');
          target?.focus({preventScroll:true});
        }
        void this.refresh(append);
      };
      if(this.#loading){
        const loading=element('p',{className:'kl-ev-section-empty kl-ev-guests-loading',role:'status',ariaLabel:'Loading guests',text:'Loading guests…'});
        loading.setAttribute('aria-busy','true');
        guests.append(loading);
      }else if(this.#guestLoadError){
        const retry=this.#button('Retry',()=>reload(retry),'refresh',undefined,true);
        guests.append(element('div',{className:'kl-ev-guests-error',role:'alert'},
          element('div',{},element('h3',{text:'Guests couldn’t load'}),element('p',{text:this.#guestLoadError})),retry));
      }else{
        const grid=element('div',{className:'kl-ev-guests'});
        for(const g of this.#guests){const person=this.#person(g.profileVisible!==undefined?g as EventPerson:undefined,g.memberNumber),attendance=g.state==='going'?'Going':'Maybe',identity=person.username?'@'+person.username:person.profileVisible?'':'Profile not shared';
          const badge=this.#badge(g.host?'Host':attendance,undefined,g.host?'gold':undefined);if(g.host)badge.title=`Host · ${attendance}`;
          const row=element('article',{className:'kl-ev-person'},this.#avatar(person),element('div',{},this.#profile(person),element('small',{text:g.host?[identity,attendance].filter(Boolean).join(' · '):identity})),badge);row.dataset.rsvp=g.state;grid.append(row);
        }
        if(this.#guests.length)guests.append(grid);
        else guests.append(element('p',{className:'kl-ev-section-empty',role:'status',text:this.#guestCursor?'More guests are available to search.':this.#guestSearch.value?'No guests match that name.':'No guests to show yet.'}));
        if(this.#guestCursor!==null){const more=this.#button('More guests',()=>reload(more,true));guests.append(more);}
      }
      panel.append(guests);
    }else panel.append(element('div',{className:'kl-ev-detail-grid'},
      element('div',{className:'kl-ev-main-column'},element('section',{className:'kl-ev-panel'},element('header',{className:'kl-ev-section-heading'},element('h2',{text:'About'})),element('p',{text:e.description}),element('div',{className:'kl-ev-tags'},...(e.tags??[]).map(t=>this.#tag(t)))),this.#outline(e)),
      element('div',{className:'kl-ev-side-column'},this.#place(e),this.#guidelines(e))));

    detail.append(panel);return detail;
  }
  #export(e:CalendarEvent):void{const url=URL.createObjectURL(new Blob([eventCalendar(e)],{type:'text/calendar;charset=utf-8'}));const a=element('a',{href:url,download:`KikiLink-event-${e.id}.ics`});this.element.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  #restorePending():void{if(this.#pending?.intent&&!this.#pending.intent.active)this.#pending=undefined;if(this.#pending)return;const intent=pendingCalendarChanges(this.client)[0];if(intent)this.#pending={intent,method:intent.method,path:intent.path,body:intent.body,done:()=>{this.#editor=undefined;this.#close();}};}
  #mutate(method:'POST'|'PUT',path:string,body:Record<string,unknown>,done?:Pending['done'],source:CalendarRecoverySource={required:false},label='Event change'):void{
    this.#restorePending();
    if(this.#pending||this.#busy||!this.options.current()||!this.client.connected)return;
    const original=structuredClone({...body,operationId:crypto.randomUUID()});this.#pending={method,path,body:original,done:done??(()=>{}),...source.generation||source.required?{intent:new CalendarMutationIntent(this.client,method,path,original,source,label)}:{}};void this.#submit();
  }
  async #submit():Promise<void>{
    const pending=this.#pending;if(!pending||this.#busy||!this.options.current()||!this.client.connected&&!pending.intent?.confirmed)return;const epoch=this.#epoch,viewToken=++this.#token;
    const overlay=this.#discoverOverlay?.action==='create'?this.#discoverOverlay:undefined;
    let discoveredEvent:string|undefined;
    this.#busy=true;this.#error='';this.#render();
    if(overlay)this.#showPendingDiscoverChange();
    else if(this.#editor)this.#paintEditor();else if(this.#cancelEvent)this.#paintCancel();else if(this.#withdraw)this.#paintWithdraw();
    try{
      const receipt=pending.intent?await pending.intent.send(()=>epoch===this.#epoch&&viewToken===this.#token&&this.#viewCurrent()&&!this.#destroyed&&this.options.current()&&this.#pending===pending):await this.client.request<{eventId:string}>(pending.method,pending.path,pending.body);
      if(!receipt||epoch!==this.#epoch||!this.options.current())return;
      pending.intent?.release();this.#pending=undefined;
      if(overlay&&this.#discoverCurrent(overlay)&&pending.method==='POST'&&pending.path===BASE)discoveredEvent=receipt.eventId;
      else {
        pending.done(receipt);
        if (overlay && this.#discoverCurrent(overlay)) this.#dismissDiscoverEditor(true);
      }
      this.options.changed();
    }
    catch(error){if(epoch!==this.#epoch||!this.options.current())return;const definitive=error instanceof CloudError&&error.status>=400&&error.status<500;this.#error=definitive?message(error):'The result is not confirmed. Retry to check the same request.';
      if(definitive&&!pending.intent){this.#pending=undefined;if(this.#editor){this.#editor.error=this.#error;if(error.status===409&&this.#editor.event){const editor=this.#editor;try{const latest=await this.client.request<CalendarEvent>('GET',`${BASE}/${editor.event!.id}`);if(epoch!==this.#epoch||this.#editor!==editor||!this.options.current())return;if(!latest.canManage||latest.status!=='scheduled'||latest.startsAt<=Date.now()){this.#editor=undefined;this.#close();}else editor.conflict=latest;}catch{if(epoch!==this.#epoch||this.#editor!==editor)return;this.#editor=undefined;this.#close();}}}}
      if(this.#editor)this.#editor.error=this.#error;if(pending.intent&&!overlay)this.#close(true);
    }finally{
      if(epoch===this.#epoch){
        this.#busy=false;
        if(overlay&&this.#discoverCurrent(overlay)){
          if(discoveredEvent){this.#editor=undefined;this.#close(true);overlay.openEvent(discoveredEvent);}
          else if(this.#pending)this.#showPendingDiscoverChange();
          else if(this.#editor)this.#paintEditor();
        }else if(this.#visible){
          const error=this.#error;await this.refresh(false,true);if(error)this.#error=error;this.#render();
          if(!this.#pending?.intent){if(this.#editor)this.#paintEditor();else if(this.#cancelEvent)this.#paintCancel();else if(this.#withdraw)this.#paintWithdraw();}
          else this.element.scrollTop=0;
        }
      }
    }
  }
  #place(event: CalendarEvent): HTMLElement {
    const place = element('section', { className: 'kl-ev-panel kl-ev-place' },
      element('header', { className: 'kl-ev-section-heading' }, element('h2', { text: 'The place' }), kikiIcon('door')),
      element('strong', { className: 'kl-ev-room-title', text: event.room || 'Shared closer to the event' }),
      element('p', { className: 'kl-ev-section-note', text: event.visibility === 'members'
        ? 'The room is shared with community members.' : 'The host will share the room when it is time.' }));
    const space = event.linkedSpace;
    if (space && this.options.openSpace) {
      const status = element('p', { className: 'kl-ev-section-note kl-ev-place-status', role: 'status' });
      const open = this.#button('View Space & room', () => void this.#openPlace(event, space.id, open, status), 'door');
      open.classList.add('kl-ev-place-link');
      place.append(open, element('p', { className: 'kl-ev-section-note', text: space.name }), status);
    } else {
      place.append(element('p', { className: 'kl-ev-section-note',
        text: event.hasLinkedSpace ? 'The linked Space is unavailable.' : 'The host has not linked a persistent Space yet.' }));
    }
    return place;
  }
  #guidelines(event: CalendarEvent): HTMLElement {
    const section = element('section', { className: 'kl-ev-panel' },
      element('header', { className: 'kl-ev-section-heading' }, element('h2', { text: 'Good to know' })),
      element('ul', {}, ...['Respect everyone’s boundaries and privacy.', 'If plans change, update your RSVP to free a place.',
        'Ask the host before sharing screenshots.'].map(text => element('li', {}, text))));
    const community = event.communityId;
    if (community) {
      const open = this.#button('View community', () => this.options.openCommunity(community));
      open.classList.add('kl-ev-community-link');
      section.append(open);
    }
    return section;
  }
  async #openPlace(event: CalendarEvent, spaceId: string, button: HTMLButtonElement, status: HTMLElement): Promise<void> {
    if (button.hasAttribute('aria-busy')) return;
    const token = this.#token;
    const current = () => this.#valid(token) && this.#event === event && button.isConnected;
    if (!current()) return;
    button.setAttribute('aria-busy', 'true');
    status.textContent = '';
    try {
      const fresh = await calendarReadAt(this.client, event.recoverySource)<CalendarEvent>(`${BASE}/${event.id}`);
      if (!current()) return;
      if (fresh.linkedSpace?.id === spaceId) this.options.openSpace?.(spaceId);
      else status.textContent = 'The linked Space is no longer available. Refresh the event to review its place.';
    } catch {
      if (current()) status.textContent = 'Couldn’t check the linked Space. Try again.';
    } finally {
      button.removeAttribute('aria-busy');
    }
  }
  #outline(e:{startsAt:number;agenda?:EventOutline[]}):HTMLElement{
    return element('section',{className:'kl-ev-panel kl-ev-outline'},element('header',{className:'kl-ev-section-heading'},
      element('h2',{text:'A little outline'}),element('small',{className:'kl-ev-meta',text:localZone(e.startsAt)})),e.agenda?.length?element('ol',{},...e.agenda.map(a=>{const when=e.startsAt+a.offsetMinutes*60000,time=element('time',{text:formatClockTime(when)});time.dateTime=new Date(when).toISOString();bindClockText(time,when);return element('li',{},time,element('span',{text:a.label}));})):element('p',{text:'No formal schedule. Arrive when you can and settle in at your own pace.'}));
  }
  async #morePlaces(ed:Editor):Promise<void>{
    const cursor=this.#placesCursor;if(cursor===null)return;const token=this.#token;
    try{const page=await calendarReadAt(this.client,ed.source)<{items:Array<{id:string;name:string}>;nextCursor:number|null}>(`/v1/calendar/places?cursor=${cursor}`);if(!this.#valid(token)||this.#editor!==ed||ed.held)return;this.#places.push(...page.items.filter(s=>!this.#places.some(old=>old.id===s.id)));this.#placesCursor=page.nextCursor;this.#paintEditor();}catch{if(this.#editor===ed){ed.error='Spaces could not load. Your event draft is kept.';this.#paintEditor();}}
  }
  #frameDialog(dialog:HTMLDialogElement,title:string,body:HTMLElement,footer:HTMLElement|undefined,close:()=>void,editor=false):void {
    dialog.setAttribute('aria-label',title);
    dialog.classList.toggle('kl-ev-editor-dialog',editor);
    const closeButton=element('button',{type:'button',className:'kl-ev-dialog-close',ariaLabel:'Close dialog',onClick:close},kikiIcon('close'));
    dialog.replaceChildren(element('header',{className:'kl-ev-dialog-header'},
      element('div',{},element('span',{className:'kl-ev-dialog-eyebrow',text:'KIKILINK'}),element('h2',{text:title})),closeButton),body);
    if(footer)dialog.append(footer);
  }
  #canShowPlans(eventId?:string):boolean {
    return this.#valid(this.#token)&&!this.options.embedded&&this.#supported&&this.#selected===eventId&&
      (eventId===undefined||this.#event?.id===eventId);
  }
  #openPlans(event?:CalendarEvent,overlay?:DiscoverOverlay):void {
    const eventId=event?.id;
    const current=()=>overlay?this.#discoverCurrent(overlay):this.#canShowPlans(eventId);
    if(!current()||this.#plansDialog.open)return;
    const results=element('div',{className:'kl-ev-plans-results'});
    const viewAll=this.#button('View my plans',()=>{
      if(!this.#plansDialog.open||!current()||this.#busy||this.#pending)return;
      if(overlay){this.#closePlans();overlay.openMyPlans();return;}
      this.#closePlans(true);
      if(event){
        this.#selected=undefined;this.#event=undefined;this.#showGuests=false;this.#restoreList=false;this.#returnId=undefined;
        this.element.scrollTop=0;
      }
      this.#layout='agenda';this.#clearFilters('plans');
    });
    viewAll.classList.add('kl-ev-plans-link');
    const body=element('div',{className:'kl-ev-dialog-body kl-ev-plans-body'},
      element('header',{},element('h2',{text:event?'Event details':'Upcoming'}),kikiIcon('calendar')),
      event?this.#planEventDetails(event):undefined,
      element('h3',{text:'My plans'}),results,viewAll);
    this.#frameDialog(this.#plansDialog,event?'Your event plan':'Your next plans',body,undefined,()=>this.#closePlans(true));
    this.#openDialog(this.#plansDialog,true);
    if(this.#plansDialog.open)void this.#loadPlans(results,overlay);
  }
  #planEventDetails(event:CalendarEvent):HTMLElement {
    const current=()=>this.#plansDialog.open&&this.#canShowPlans(event.id)&&!this.#loading&&!this.#busy&&!this.#pending?this.#event:undefined;
    const editable=(e:CalendarEvent)=>e.canManage&&!e.archived&&e.status==='scheduled'&&e.startsAt>Date.now();
    const addToCalendar=this.#button('Add to calendar',()=>{const e=current();if(e)this.#export(e);},'calendar');
    const share=this.#details?this.#button('Share event',()=>{
      const e=current();if(!e||!this.#details)return;
      this.#closePlans(true);this.#share(e);
    },'copy'):undefined;
    const edit=editable(event)?this.#button('Edit event',()=>{
      const e=current();if(!e||!editable(e))return;
      this.#closePlans(true);this.#edit(e);
    },'edit'):undefined;
    const reminder=event.reminderMinutes===null?undefined:event.reminderMinutes===1440?'1 day':event.reminderMinutes===60?'1 hour':`${event.reminderMinutes} minutes`;
    return element('div',{className:'kl-ev-plan-detail'},
      element('p',{className:'kl-ev-plan-note',text:`${eventDayFormat.format(event.startsAt)} · ${this.#clock(event)}`}),this.#selectionBadge(event),
      element('div',{className:'kl-ev-plan-actions'},addToCalendar,share,edit),
      reminder?element('p',{className:'kl-ev-plan-note',text:`Reminder set for ${reminder} before.`}):undefined,
      element('hr'));
  }
  #closePlans(restoreFocus=false):void {
    const overlay=this.#discoverOverlay?.action==='plans'?this.#discoverOverlay:undefined;
    if(!this.#plansDialog.open&&!overlay)return;
    if(this.#plansDialog.open)this.#plansDialog.close();
    this.#plansDialog.replaceChildren();
    if(overlay){this.#finishDiscoverOverlay(overlay,this.#plansDialog,restoreFocus);return;}
    if(restoreFocus&&this.#canShowPlans(this.#selected)){
      const trigger=this.#selected?this.#results.querySelector<HTMLElement>('.kl-ev-detail-context'):this.#toolbar.querySelector<HTMLElement>('.kl-ev-context-action');
      trigger?.focus({preventScroll:true});
    }
  }
  async #loadPlans(results:HTMLElement,overlay?:DiscoverOverlay):Promise<void> {
    const source=this.#source,communityId=overlay?undefined:this.#communityId,spaceId=overlay?undefined:this.#spaceId,eventId=overlay?undefined:this.#selected;
    const current=()=>this.#plansDialog.open&&this.#plansDialog.contains(results)&&
      (overlay?this.#discoverCurrent(overlay):this.#canShowPlans(eventId)&&this.#communityId===communityId&&
        this.#spaceId===spaceId&&sameCalendarSource(source,this.#source));
    if(!current())return;
    results.replaceChildren(element('p',{role:'status',text:'Loading your plans…'}));
    try {
      const me=await this.client.request<{memberNumber?:number;features?:{eventsRsvp?:boolean;eventDiscovery?:boolean}}>('GET','/v1/me');
      if(!current())return;
      const access=calendarRead(this.client,me);
      if(!me.features?.eventsRsvp||(overlay?me.memberNumber!==this.#owner:
        me.memberNumber!==undefined&&me.memberNumber!==this.#owner||!sameCalendarSource(source,access.source)))throw new CalendarRecoveryError();
      const query=new URLSearchParams({scope:'plans',when:'upcoming',status:'scheduled',limit:'20'});
      if(communityId)query.set('communityId',communityId);
      if(spaceId)query.set('spaceId',spaceId);
      const path=me.features.eventDiscovery?'/v1/calendar/discover':BASE;
      const page=await access.request<Page<CalendarEvent>>(`${path}?${query}`);
      if(!current())return;
      const events=page.items.filter(event=>!event.archived).slice(0,3);
      results.replaceChildren(...(events.length?events.map(event=>this.#rowOpen(event,()=>{
        if(!current()||this.#busy||this.#pending)return;
        if(overlay){this.#closePlans();overlay.openEvent(event.id);return;}
        if(event.id===eventId){this.#closePlans(true);return;}
        this.#openCard(event.id);
      })): [element('p',{role:'status',text:page.nextCursor?'More plans are available in My plans.':'No upcoming plans.'})]));
    }catch {
      if(!current())return;
      const retry=this.#button('Retry',()=>void this.#loadPlans(results,overlay));retry.classList.add('kl-ev-plans-link');
      results.replaceChildren(element('p',{role:'alert',text:'Your plans couldn’t load.'}),retry);
    }
  }
  #openDialog(dialog:HTMLDialogElement,drawer=false):void {
    if(dialog.open||!dialog.isConnected)return;
    dialog.showModal();
    fitPanelDialog(dialog,drawer?{layout:()=>({marginX:0,marginY:0})}:undefined);
    this.#focusDialogBody(dialog);
  }
  #focusDialogBody(dialog:HTMLDialogElement):void {
    const input=dialog.querySelector<HTMLElement>('.kl-ev-dialog-body :is(input,textarea,select):not(:disabled)');
    const action=dialog.querySelector<HTMLElement>('.kl-ev-dialog-footer button:not(:disabled)');
    (input??action??dialog.querySelector<HTMLElement>('.kl-ev-dialog-close'))?.focus({preventScroll:true});
  }
  #showAction():void{this.#openDialog(this.#actionsDialog);}
  #closeAction(force=false):void{
    if(!force&&this.#actionKind==='report'&&(this.#reportState.busy||this.#reportState.pending||this.#reportState.dirty)){
      if(this.#reportState.busy)return;
      if(!this.#actionsDialog.querySelector('.kl-ev-discard-report'))this.#actionsDialog.querySelector('.kl-ev-dialog-body')?.append(element('div',{className:'kl-ev-discard-report'},element('p',{text:'Discard this report draft? A pending submission may already have reached the server.'}),this.#button('Keep report',()=>this.#actionsDialog.querySelector('.kl-ev-discard-report')?.remove()),this.#button('Discard report',()=>this.#closeAction(true))));return;
    }
    if(this.#actionsDialog.open)this.#actionsDialog.close();this.#actionsDialog.replaceChildren();this.#actionKind=undefined;this.#reportState={busy:false,pending:false,dirty:false};
  }
  #share(e:CalendarEvent):void{
    if(this.#actionKind==='report'){this.#showAction();return;}
    let url:string;try{url=eventShareUrl(location.href,e.id,this.client.origin);}catch{this.#error='The event link could not be created.';this.#paintStatus();return;}
    this.#actionKind='share';
    const input=element('input',{ariaLabel:'Event link',value:url}),status=element('p',{role:'status'});input.readOnly=true;
    const copy=this.#button('Copy event link',()=>{void navigator.clipboard?.writeText(url).then(()=>{if(input.isConnected)status.textContent='Link copied.';}).catch(()=>{if(input.isConnected){status.textContent='Select and copy the link.';input.focus();input.select();}});if(!navigator.clipboard){status.textContent='Select and copy the link.';input.focus();input.select();}});
    this.#frameDialog(this.#actionsDialog,'Share event',element('div',{className:'kl-ev-dialog-body'},
      element('p',{className:'kl-ev-dialog-note',text:'This link opens the event in KikiLink on the same Cloud. Access is checked when it is opened.'}),
      element('label',{className:'kl-ev-dialog-field'},element('span',{text:'Event link'}),input),status),
      element('footer',{className:'kl-ev-dialog-footer'},this.#button('Close',()=>this.#closeAction()),copy),()=>this.#closeAction());
    this.#showAction();
  }
  #report(e:CalendarEvent):void{
    if(this.#actionKind==='report'){this.#showAction();return;}
    const source=e.recoverySource;if(!source)return;
    this.#actionKind='report';
    const current=()=>!this.#destroyed&&this.options.current()&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;
    const body=element('div',{className:'kl-ev-dialog-body'},element('p',{text:e.title}));
    const form=reportForm(this.client,'event',e.id,true,id=>{this.#reportState={busy:false,pending:false,dirty:false};body.append(element('p',{role:'status',text:`Report #${id} received.`}));},()=>this.#closeAction(),'/v1/reports',{compact:true,source:{generation:source.generation,current},sourceKey:String(e.revision),current,state:state=>{this.#reportState=state;}});
    body.append(form);this.#frameDialog(this.#actionsDialog,'Report event',body,undefined,()=>this.#closeAction());this.#showAction();
  }
  #edit(event?:CalendarEvent,onCancel?:()=>void,personal=false):void{
    if(this.#editor?.source.generation){this.#paintEditor();this.#showDialog();return;}
    if(this.#pending||!this.#supported||!event&&!personal&&this.#spaceId&&(!this.#spaceEvents||!this.#spaceContext||!this.#details))return;if(event&&!event.canManage)return;
    const draft:Draft={tags:(event?.tags??[]).join(', '),outline:(event?.agenda??[]).map(a=>`${a.offsetMinutes} · ${a.label}`).join('\n'),spaceId:event?event.spaceId??'':!personal&&this.#details&&this.#spaceEvents?this.#spaceContext?.id??'':'',title:event?.title??'',description:event?.description??'',room:event?.room??'',category:event?.category??'Social',language:event?.language??'English',communityId:event?.communityId??(personal?'':this.#communityId??''),visibility:event?.visibility??'public',start:localDateInput(event?.startsAt??Date.now()+86400000),duration:String(event?(event.endsAt-event.startsAt)/60000:90),capacity:String(event?.capacity??24)};
    if(draft.communityId&&!this.#hosts.some(h=>h.id===draft.communityId))draft.communityId='';
    if(draft.communityId&&!this.#hosts.find(h=>h.id===draft.communityId)?.publicAllowed)draft.visibility='members';
    this.#editor={source:event?.recoverySource??this.#source,...(event?{event}:{}),...(onCancel?{onCancel}:{}),draft,baseline:JSON.stringify(draft),step:1,error:''};this.#paintEditor();this.#showDialog();
  }
  #showDialog():void{this.#openDialog(this.#dialog);}
  #editorKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (!this.#editor || event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === 'Escape') {
      // A repeated native close request can be non-cancelable even while the draft is dirty.
      event.preventDefault();
      this.#requestClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const first = this.#dialog.querySelector<HTMLButtonElement>('.kl-ev-dialog-close');
    const actions = this.#dialog.querySelectorAll<HTMLButtonElement>('.kl-ev-dialog-footer button:not(:disabled), .kl-ev-editor-warning button:not(:disabled)');
    const last = actions[actions.length - 1] ?? first;
    const target = event.shiftKey ? last : first;
    if (target && event.target === (event.shiftKey ? first : last)) {
      event.preventDefault();
      target.focus();
    }
  }
  #close(preserve=false,restoreFocus=!preserve):void{if(this.#dialog.open)this.#dialog.close();this.#dialog.replaceChildren();if(!preserve||!this.#cancelEvent?.recoverySource?.generation){this.#cancelEvent=undefined;this.#cancelReason='';}if(!preserve||!this.#withdraw?.event.recoverySource?.generation)this.#withdraw=undefined;const overlay=this.#discoverOverlay;if(overlay?.action==='create')this.#finishDiscoverOverlay(overlay,this.#dialog,restoreFocus);}
  #requestClose(force=false,restoreContext=!force):void{
    if(!force&&!this.#busy&&this.#pending&&this.#discoverOverlay?.action==='create'){this.#dismissDiscoverEditor(true);return;}
    if((this.#busy||this.#pending)&&!force)return;
    if(!force&&this.#editor&&JSON.stringify(this.#editor.draft)!==this.#editor.baseline&&!this.#pending){this.#showEditorDiscard(this.#editor);return;}
    const onCancel=restoreContext?this.#editor?.onCancel:undefined;
    this.#editor=undefined;this.#close();onCancel?.();
  }
  #showEditorDiscard(ed: Editor): void {
    if(this.#editor !== ed)return;
    ed.discard = true;
    const existing = this.#dialog.querySelector<HTMLButtonElement>('.kl-ev-editor-warning button');
    if(existing){ existing.focus(); return; }
    const keep = this.#button('Keep editing', ()=>{
      if(this.#editor !== ed)return;
      ed.discard = false;
      warning.remove();
      const primary = ed.step === 3 && this.#dialog.querySelector<HTMLButtonElement>('.kl-ev-dialog-footer .kl-text-button--primary:not(:disabled)');
      if(primary)primary.focus();
      else this.#focusDialogBody(this.#dialog);
    }, undefined, undefined, true);
    const discard = this.#button('Discard changes', ()=>this.#requestClose(true,true));
    discard.classList.add('kl-ev-danger');
    const warning = element('div', {className:'kl-ev-editor-warning'},
      element('div', {className:'kl-ev-warning-card',role:'alert'},
        element('strong', {text:ed.event ? 'Discard your event changes?' : 'Discard this event draft?'}),
        element('p', {text:'Your unsaved details will be lost.'}),
        element('div', {className:'kl-ev-warning-actions'}, keep, discard)));
    this.#dialog.append(warning);
    keep.focus();
  }
  #basicTextErrors(d: Draft): Partial<Record<BasicTextField,string>> {
    const problems: Partial<Record<BasicTextField,string>> = {};
    const title = d.title.trim();
    if (!title) problems.title = 'Add a title to continue';
    else if (d.title.length > 80 || (title.length < 3 && title !== this.#editor?.event?.title.trim())) {
      problems.title = 'Use a title between 3 and 80 characters.';
    }
    if (this.#requiresDescription && !d.description.trim()) problems.description = 'Add a description to continue';
    else if (d.description.length > 600) problems.description = 'Keep the description within 600 characters.';
    if (!d.language.trim()) problems.language = 'Choose a language to continue';
    else if (d.language.length > 40) problems.language = 'Keep the language within 40 characters.';
    return problems;
  }
  #editorError(d:Draft,step:number):string{
    if (step === 1) {
      const textProblem = Object.values(this.#basicTextErrors(d))[0];
      if (textProblem) return textProblem;
      if (!this.#categories.includes(d.category)) return 'Choose a category supported by this server.';
      if (d.communityId && !this.#hosts.some(host => host.id === d.communityId)) return 'You no longer manage this community.';
      return eventDetailsError(d.tags, '', Number(d.duration));
    }
    const start=parseLocalDate(d.start),duration=Number(d.duration),capacity=Number(d.capacity);
    if(start===null)return 'This local date or time does not exist. Choose another time.';
    if(start<=Date.now()||start>Date.now()+365*86400000)return 'Choose a future start date within the next year.';
    if(!Number.isInteger(duration)||duration<15||duration>1440)return 'Duration must be 15–1440 minutes.';
    if(!Number.isInteger(capacity)||capacity<1||capacity>1000)return 'Capacity must be 1–1000.';
    if(this.#editor?.event&&capacity<this.#editor.event.going)return `Keep room for at least ${this.#editor.event.going} people already going.`;
    const detailsError=eventDetailsError(d.tags,d.outline,duration);if(detailsError)return detailsError;
    if(d.room.length>120)return 'Keep the room within 120 characters.';
    if(d.visibility==='members'&&!d.communityId||d.visibility==='public'&&d.communityId&&!this.#hosts.find(h=>h.id===d.communityId)?.publicAllowed)return 'Review who can attend this event.';
    return '';
  }
  #updateEditorHints(ed:Editor):void{
    if(this.#editor!==ed)return;
    const textProblems = ed.step === 1 ? this.#basicTextErrors(ed.draft) : {};
    const inlineErrors = new Set<string>();
    if (ed.step === 1) {
      for (const key of basicTextFields) {
        const message = ed.touchedText?.has(key) ? textProblems[key] ?? '' : '';
        const note = this.#dialog.querySelector<HTMLElement>(`[data-error-for="${key}"]`);
        if (note) note.textContent = message;
        const control = this.#dialog.querySelector<HTMLElement>(`[data-text-field="${key}"]`);
        control?.setAttribute('aria-invalid', String(Boolean(message)));
        if (message) inlineErrors.add(message);
      }
    }
    const primary = this.#dialog.querySelector<HTMLButtonElement>('.kl-ev-dialog-footer .kl-text-button--primary');
    const hint = this.#dialog.querySelector<HTMLElement>('.kl-ev-dialog-note');
    if (primary && hint && !ed.conflict && !this.#pending) {
      const problem = (ed.step !== 2 && this.#editorError(ed.draft, 1)) ||
        (ed.step !== 1 && this.#editorError(ed.draft, 2));
      primary.disabled = this.#busy || !!ed.held || !!problem;
      primary.title = problem || '';
      hint.textContent = problem
        ? (ed.step === 1 && !ed.draft.title.trim() ? 'Add a title to continue' : 'Check the event details')
        : (ed.step === 3 ? 'Ready to save' : 'Step ' + ed.step + ' of 3');
      const error = this.#dialog.querySelector<HTMLElement>('.kl-ev-form-error');
      if (error) {
        // Keep the blank default form quiet. Describe later errors next to the fields.
        const globalError = ed.error || (problem && ed.draft.title.trim() ? problem : '');
        error.textContent = inlineErrors.has(globalError) ? '' : globalError;
      }
    }
    for(const[key,max]of[['title',80],['description',600]] as const){const counter=this.#dialog.querySelector<HTMLElement>(`[data-count="${key}"]`);if(counter)counter.textContent=`${ed.draft[key].length}/${max}`;}
    const preview=this.#dialog.querySelector<HTMLElement>('.kl-ev-schedule-preview > span'),start=parseLocalDate(ed.draft.start),duration=Number(ed.draft.duration);
    const zone = this.#dialog.querySelector<HTMLElement>('.kl-ev-schedule-zone');
    if(zone)zone.textContent = '(' + localZone(start ?? Date.now()) + ')';
    if(preview)preview.textContent=start===null||!Number.isInteger(duration)||duration<15||duration>1440?'Choose a valid date and a duration of 15–1440 minutes.':eventRange(start,start+duration*60000);
  }
  #paintEditor():void{
    const ed=this.#editor;if(!ed)return;const d=ed.draft;
    const title=ed.event?'Edit event':'Create an event';
    const steps=element('ol',{className:'kl-ev-steps',ariaLabel:'Event editor progress'},...['Basics','When & access','Review'].map((text,i)=>{
      const marker=element('span',{ariaHidden:'true'},i+1<ed.step?kikiIcon('check'):String(i+1));
      const li=element('li',{},marker,text);
      if(i+1===ed.step)li.setAttribute('aria-current','step');
      if(i+1<ed.step)li.dataset.complete='true';
      return li;
    }));
    const markTouched = (key: BasicTextField) => { (ed.touchedText ??= new Set()).add(key); };
    const errorNote = (key: BasicTextField) => {
      const note = element('small', {className:'kl-ev-inline-error'});
      note.id = this.#reminderMenu.element.id + '-error-' + key;
      note.dataset.errorFor = key;
      note.setAttribute('aria-live','polite');
      return note;
    };
    const form=element('form',{className:'kl-ev-form'}),field=(key:keyof Draft,label:string,type='text',wide=false)=>{
      const input = type === 'textarea' ? element('textarea', {ariaLabel:label}) : element('input', {type,ariaLabel:label});
      input.value = d[key];
      input.disabled = this.#busy || !!this.#pending || !!ed.held;
      const maxLength = {title:80,description:600,room:120,language:40,tags:160,outline:1800};
      if(key in maxLength)input.maxLength = maxLength[key as keyof typeof maxLength];
      if(key === 'title' || key === 'description' || key === 'language')input.dataset.textField = key;
      input.addEventListener('input',()=>{
        if(this.#editor !== ed || !this.#dialog.contains(input) || this.#busy || this.#pending || ed.held)return;
        d[key] = input.value;
        if(key === 'title' || key === 'description' || key === 'language')markTouched(key);
        ed.error = '';
        this.#updateEditorHints(ed);
      });
      const caption = element('span', {text:label});
      const wrapper = element('label', {className:wide?'wide':''}, caption, input);
      if(key === 'title' || key === 'description'){
        const counter = element('small', {className:'kl-ev-meta'});
        counter.dataset.count = key;
        counter.id = this.#reminderMenu.element.id + '-count-' + key;
        const note = errorNote(key);
        input.setAttribute('aria-describedby', note.id + ' ' + counter.id);
        input.required = key === 'title' || this.#requiresDescription;
        if(key === 'title'){
          caption.append(' ', element('span', {className:'kl-ev-required',text:'(required)'}));
          input.placeholder = 'An evening worth sharing';
          input.setAttribute('autocomplete', 'off');
        }else{
          input.placeholder = 'The plan, the mood, and anything people should know…';
          input.setAttribute('rows', '3');
        }
        wrapper.append(element('div', {className:'kl-ev-field-meta'}, note, counter));
      }
      if(key==='duration'||key==='capacity'){input.setAttribute('min',key==='duration'?'15':'1');input.setAttribute('max',key==='duration'?'1440':'1000');input.setAttribute('step','1');}
      return wrapper;
    };
    const selectField=(key:keyof Draft,label:string,choices:Array<[string,string]>,disabled=false)=>{const select=this.#select(label,choices,d[key],v=>{if(this.#editor!==ed||!this.#dialog.contains(select)||this.#busy||this.#pending||ed.held)return;d[key]=v;if(key==='communityId'){d.visibility=v&&!this.#hosts.find(h=>h.id===v)?.publicAllowed?'members':'public';}ed.error='';this.#updateEditorHints(ed);});select.disabled=disabled||this.#busy||!!this.#pending||!!ed.held;return element('label',{className:key==='communityId'?'wide':''},element('span',{text:label}),select);};
    if(ed.step===1){
      form.classList.add('kl-ev-basics');
      const category = selectField('category', 'Category', this.#categories.map(c=>[c,c]));
      const language = element('div', {className:'kl-ev-basics-language'});
      const custom = field('language', 'Custom language');
      const customInput = custom.querySelector('input')!;
      const known = PROFILE_LANGUAGES.some(name=>name === d.language);
      const languageName = 'Main language';
      const languages: Array<[string,string]> = PROFILE_LANGUAGES.map(name=>[name,name]);
      languages.push(['','Other language…']);
      const picker = this.#select(languageName, languages, known ? d.language : '', value=>{
        if(this.#editor !== ed || !this.#dialog.contains(picker) || this.#busy || this.#pending || ed.held)return;
        custom.hidden = Boolean(value);
        d.language = value || customInput.value;
        markTouched('language');
        ed.error = '';
        this.#updateEditorHints(ed);
        if(!value)customInput.focus();
      });
      picker.disabled = this.#busy || !!this.#pending || !!ed.held;
      custom.hidden = known;
      if(known)customInput.value = '';
      const languageError = errorNote('language');
      customInput.setAttribute('aria-describedby', languageError.id);
      language.append(element('label', {}, element('span', {text:languageName}), picker), custom, languageError);

      const person = ed.event ? this.#person(ed.event.hostProfile, ed.event.host) : undefined;
      const personalName = ed.event && ed.event.host !== this.#owner
        ? person?.displayName ?? `Member #${ed.event.host}` : this.options.name(this.#owner);
      const host = selectField('communityId', 'Hosted by', [
        ['', `${personalName} · Personal event`],
        ...this.#hosts.map(h=>[h.id, h.name + (h.publicAllowed === false ? ' · Members only' : '')] as [string,string]),
      ], !!ed.event);
      const note = element('small', {className:'kl-ev-host-note',text:ed.event
        ? 'The host stays the same when editing an event.' : 'Choose your profile or a community you own or administer.'});
      note.id = this.#reminderMenu.element.id + '-host-note';
      host.querySelector('select')!.setAttribute('aria-describedby', note.id);
      const hostSection = element('div', {className:'wide kl-ev-editor-host'}, host, note);
      if(this.#details){
        const tags = element('details', {className:'kl-ev-editor-tags'}, element('summary', {text:'Event tags'}), field('tags','Tags · separated by commas'));
        tags.open = ed.tagsOpen ?? Boolean(d.tags.trim());
        tags.addEventListener('toggle', ()=>{if(this.#editor===ed && tags.isConnected)ed.tagsOpen = tags.open;});
        hostSection.append(tags);
      }
      form.append(field('title','Event title','text',true), field('description','What’s happening?','textarea',true), category, language, hostSection);
    }
    else if(ed.step===2){
      form.classList.add('kl-ev-schedule');
      const locked = this.#busy || !!this.#pending || !!ed.held;
      const [datePart, timePart] = d.start.split('T');
      const date = element('input', {type:'date', ariaLabel:'Date', value:datePart ?? '', disabled:locked});
      date.required = true;
      date.min = localDateInput(Date.now()).slice(0, 10);
      date.max = localDateInput(Date.now() + 365 * 86400000).slice(0, 10);
      const time = element('input', {type:'time', ariaLabel:'Start time', value:timePart ?? '', disabled:locked});
      time.required = true;
      time.step = '60';
      const updateStart = () => {
        if(this.#editor!==ed || !form.isConnected || this.#busy || this.#pending || ed.held)return;
        d.start = date.value + 'T' + time.value;
        ed.error = '';
        this.#updateEditorHints(ed);
      };
      date.addEventListener('input', updateStart);
      time.addEventListener('input', updateStart);
      const timeZone = element('span', {className:'kl-ev-schedule-zone'});
      timeZone.id = this.#reminderMenu.element.id + '-start-zone';
      time.setAttribute('aria-describedby', timeZone.id);
      const dateField = element('label', {}, element('span', {text:'Date'}), date);
      const timeField = element('label', {}, element('span', {}, 'Start time ', timeZone), time);

      const withNote = (label:HTMLLabelElement, key:string, text:string) => {
        const note = element('small', {className:'kl-ev-field-note', text});
        note.id = this.#reminderMenu.element.id + '-hint-' + key;
        label.querySelector('input,select')!.setAttribute('aria-describedby', note.id);
        label.append(note);
        return label;
      };
      const duration = withNote(field('duration','Duration (minutes)','number'), 'duration', '15 minutes to 24 hours.');
      const capacity = withNote(field('capacity','Capacity (people)','number'), 'capacity', '1–1000 people.');
      const publicCommunity = this.#hosts.find(host=>host.id===d.communityId)?.publicAllowed;
      const access = withNote(selectField('visibility','Who can attend?', [['public','Public'],['members','Members only']],
        !d.communityId || !publicCommunity), 'visibility', !d.communityId
        ? 'Personal events are public. To host a members-only event, select a community in Basics.'
        : publicCommunity ? 'Public events can be discovered by everyone. Members-only events stay within the community.'
        : 'This is a private community. Only community members can see and attend its events.');
      access.classList.add('wide');
      const room = withNote(field('room','Room (optional)'), 'room', 'A meeting place for guests. Adding a room name does not reserve it.');
      const roomInput = room.querySelector('input')!;
      roomInput.placeholder = 'Room name, if you have one';
      roomInput.autocomplete = 'off';
      const roomSection = element('div', {className:'wide kl-ev-schedule-room'}, room);
      for (const [label, name, unit] of [[duration,'Duration','minutes'],[capacity,'Capacity','people'],[room,'Room','optional']] as const) {
        label.querySelector('span')!.replaceChildren(name + ' ', element('span', {className:'kl-ev-schedule-unit', text:'(' + unit + ')'}));
      }
      if(this.#details){
        const places:Array<[string,string]> = [['','No linked Space'], ...this.#places.map(s=>[s.id,s.name] as [string,string])];
        if(d.spaceId && !this.#places.some(s=>s.id===d.spaceId))places.push([d.spaceId,ed.event?.linkedSpace?.name ?? 'Previously linked Space · unavailable']);
        const extras = element('details', {className:'kl-ev-schedule-extras'}, element('summary', {text:'Space and outline'}),
          selectField('spaceId','Linked Space',places),
          this.#placesCursor!==null ? this.#button('More Spaces',()=>void this.#morePlaces(ed)) : undefined,
          field('outline','Outline · minutes after start and activity','textarea'),
          element('small',{className:'kl-ev-field-note',text:'One activity per line, for example: 0 · Welcome, then 30 · Music. Up to 12 activities. Times move with the start of your event.'}));
        extras.open = ed.scheduleDetailsOpen ?? Boolean(d.spaceId || d.outline.trim());
        extras.addEventListener('toggle',()=>{if(this.#editor===ed && extras.isConnected)ed.scheduleDetailsOpen = extras.open;});
        roomSection.append(extras);
      }
      form.append(dateField,timeField,duration,capacity,access,roomSection);
    }
    else{
      const start=parseLocalDate(d.start)!,end=start+Number(d.duration)*60000;
      const access=d.visibility==='members'?'Members only':'Public';
      const host=d.communityId?this.#hosts.find(h=>h.id===d.communityId)?.name??ed.event?.communityName??'Community':
        ed.event&&ed.event.host!==this.#owner?this.#person(ed.event.hostProfile,ed.event.host).displayName??`Member #${ed.event.host}`:this.options.name(this.#owner);
      const agenda=eventOutline(d.outline);
      const card=element('article',{className:'kl-ev-panel kl-ev-review-card'},
        element('header',{className:'kl-ev-review-title'},element('span',{},kikiIcon('calendar')),
          element('div',{},element('h3',{text:d.title.trim()}),element('small',{text:`Hosted by ${host}`})),this.#badge(access)),
        element('p',{text:d.description.trim() || 'A little time set aside for good company.'}),element('div',{className:'kl-ev-review-tags'},...[d.category,d.language,...eventTags(d.tags)].map(tag=>this.#tag(tag))));
      const facts:Array<[string,string]>=[
        ['Starts',`${eventEditorDateTime(start)} · ${localZone(start)}`],['Ends',`${eventEditorDateTime(end)} · ${localZone(end)}`],
        ['Capacity',`${d.capacity} ${Number(d.capacity)===1?'person':'people'}`],['Room',d.room.trim()||'To be announced'],['Access',access],
      ];
      if(d.spaceId)facts.push(['Linked Space',this.#places.find(s=>s.id===d.spaceId)?.name??ed.event?.linkedSpace?.name??'Linked Space unavailable']);
      const details=element('dl',{className:'kl-ev-review-details'},...facts.flatMap(([label,value])=>[element('dt',{text:label}),element('dd',{text:value})]));
      form.append(element('div',{className:'wide kl-ev-review'},card,details,...(agenda.length?[this.#outline({startsAt:start,agenda})]:[])));
    }
    const error=element('p',{className:'kl-ev-form-error',role:'alert',text:ed.error}),actions=element('footer',{className:'kl-ev-dialog-footer'}),back=this.#button(ed.step===1?'Cancel':'Back',()=>{if(ed.step===1)this.#requestClose();else{ed.step--;ed.error='';this.#paintEditor();}},ed.step===1?undefined:'back');back.classList.add('kl-ev-back');
    actions.append(back,element('small',{className:'kl-ev-dialog-note',text:ed.step===3?'Ready to save':`Step ${ed.step} of 3`}));
    if(this.#pending){const retry=this.#button('Retry save',()=>void this.#submit());retry.disabled=this.#busy;actions.append(retry);}
    else if(ed.conflict){form.append(element('p',{className:'wide',text:`Latest version: ${ed.conflict.title} · ${eventRange(ed.conflict.startsAt,ed.conflict.endsAt)} · ${ed.conflict.going}/${ed.conflict.capacity} going.`}));actions.append(this.#button('Use latest details',()=>this.#edit(ed.conflict)),this.#button('Keep my draft',()=>{ed.event=ed.conflict!;delete ed.conflict;ed.error='';ed.step=3;this.#paintEditor();}));}
    else actions.append(this.#button(ed.step===3?(ed.event?'Save changes':'Create event'):'Continue',()=>{
      if(ed.held)return;
      ed.error=this.#editorError(d,ed.step===1?1:2);if(ed.step===3)ed.error=this.#editorError(d,1)||ed.error;if(ed.error){this.#paintEditor();return;}
      if(ed.step<3){ed.step++;this.#paintEditor();return;}const start=parseLocalDate(d.start)!;
      const body={...(this.#details?{tags:eventTags(d.tags),agenda:eventOutline(d.outline),spaceId:d.spaceId||null}:{}),title:d.title.trim(),description:d.description.trim(),category:d.category,language:d.language.trim(),room:d.room.trim(),visibility:d.visibility,startsAt:start,endsAt:start+Number(d.duration)*60000,capacity:Number(d.capacity),...(ed.event?{revision:ed.event.revision}:{communityId:d.communityId||null})};
      this.#mutate(ed.event?'PUT':'POST',ed.event?`${BASE}/${ed.event.id}`:BASE,body,receipt=>{this.#editor=undefined;this.#close();this.#selected=receipt.eventId;this.#showGuests=false;},ed.source,`${ed.event?'Edit':'Create'} · ${d.title} · ${d.communityId?this.#hosts.find(h=>h.id===d.communityId)?.name??'Original community':'Personal event'}`);
    },ed.step===3?undefined:'arrow-right',undefined,true));
    form.addEventListener('submit',event=>event.preventDefault());
    const intro=ed.step===1?'Give people a reason to look forward to being together.':ed.event?'One last look before saving your changes.':'One last look before making it a date.';
    const scheduleNote=element('div',{className:'kl-ev-clock-note'},kikiIcon('clock'),element('span',{},element('strong',{text:'Times use your device timezone.'}), ` ${Intl.DateTimeFormat().resolvedOptions().timeZone} · ${eventEditorDateTime(Date.now())}.`));
    const content=element('fieldset',{className:'kl-ev-editor-content'},ed.step===2?scheduleNote:element('p',{className:'kl-ev-editor-intro',text:intro}),form,error);
    const body=element('div',{className:'kl-ev-dialog-body'},steps,content);
    this.#frameDialog(this.#dialog,title,body,actions,()=>this.#requestClose(),true);
    if(ed.step===2){const preview=element('div',{className:'kl-ev-schedule-preview',role:'status'},kikiIcon('calendar'),element('span'));form.after(preview);}
    if(ed.step===3&&!this.#pending&&!ed.conflict){
      const changeStep=(step:number)=>{ed.step=step;this.#paintEditor();};
      form.append(element('div',{className:'wide kl-ev-review-edit'},this.#button('Edit basics',()=>changeStep(1)),this.#button('Edit schedule',()=>changeStep(2))),
        element('p',{className:'wide kl-ev-review-note',text:(ed.event?'Existing RSVPs are kept. ':'')+'This event will be saved to Cloud and shared with the selected audience.'}));
    }
    this.#updateEditorHints(ed);
    if(ed.held){for(const button of actions.querySelectorAll<HTMLButtonElement>('button'))if(['Continue','Save changes','Create event','Retry save'].includes(button.textContent??''))button.disabled=true;actions.append(this.#button('Discard original draft',()=>this.#showEditorDiscard(ed)));}
    if(ed.discard)this.#showEditorDiscard(ed);
    else if(this.#dialog.open&&!this.#busy)this.#focusDialogBody(this.#dialog);
  }
  #cancel(e:CalendarEvent):void{if(this.#busy||this.#pending)return;this.#cancelReason='';this.#cancelEvent=e;this.#paintCancel();this.#showDialog();}
  #paintCancel():void{
    const e=this.#cancelEvent;if(!e)return;const reason=element('textarea',{ariaLabel:'Cancellation reason'});reason.value=this.#cancelReason;reason.addEventListener('input',()=>{if(this.#cancelEvent===e&&this.#dialog.contains(reason)&&!this.#pending&&!this.#busy)this.#cancelReason=reason.value;});reason.maxLength=300;reason.placeholder='Let your guests know why';reason.disabled=this.#busy||!!this.#pending;
    const error=element('p',{className:'kl-ev-form-error',role:'alert',text:this.#error});
    const confirm=this.#button(this.#pending?'Retry cancellation':'Cancel event',()=>{if(this.#pending){void this.#submit();return;}if(!reason.value.trim()){error.textContent='Add a reason for your guests.';return;}this.#mutate('POST',`${BASE}/${e.id}/cancel`,{revision:e.revision,reason:reason.value.trim()},()=>this.#close(),e.recoverySource,`Cancel · ${e.title}`);});confirm.disabled=this.#busy;
    confirm.classList.add('kl-ev-danger');
    this.#frameDialog(this.#dialog,'Cancel this event?',element('div',{className:'kl-ev-dialog-body'},
      element('p',{text:`“${e.title}” will close for attendance. Guests will see your reason in the event.`}),
      element('label',{className:'kl-ev-dialog-field'},element('span',{text:'Cancellation reason'}),reason),error),
      element('footer',{className:'kl-ev-dialog-footer'},this.#button('Keep event',()=>this.#close()),confirm),()=>this.#requestClose());
  }
}
