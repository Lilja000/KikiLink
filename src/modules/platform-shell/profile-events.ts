import { pageAction } from './page-action';
import { calendarCategories, legacyCalendarCategories } from '../../../cloud/shared/calendar-categories.mjs';
import { profileOptions } from './profile-controls';
import { CloudError, type CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { bindClockText } from '../../core/time-format';
import { kikiIcon } from '../link-chat/icons';
import { profileSectionLocked } from './profile-visibility-view';

export interface ProfileEvent { id:string;title:string;description:string;startsAt:number;endsAt:number;role:'hosting'|'going';category:string;categoryDetail?:string;language:string;communityName:string|null; }
export interface ProfileEventsPage { memberNumber:number;items:ProfileEvent[];nextCursor:string|null; }
const validCursor=(value:unknown):value is string=>typeof value==='string'&&/^\d{1,16}:\d{1,16}$/.test(value)&&value.split(':').every(n=>Number.isSafeInteger(Number(n)));
export function checkedProfileEvents(page:ProfileEventsPage,owner:number,cursor?:string,limit=20):ProfileEventsPage {
  if(!page||page.memberNumber!==owner||!Array.isArray(page.items)||page.items.length>limit||page.nextCursor!==null&&!validCursor(page.nextCursor)||!page.items.length&&page.nextCursor!==null)throw new Error('Invalid events page');
  const seen=new Set<string>();let previous=cursor?Number(cursor.split(':')[0]):0;
  for(const item of page.items){
    if (item?.categoryDetail !== undefined && (item.category !== 'Other' || !calendarCategories.includes(item.categoryDetail) || legacyCalendarCategories.includes(item.categoryDetail))) {
      throw new Error('Invalid profile event category');
    }
    if(!item||typeof item.id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(item.id)||seen.has(item.id)||typeof item.title!=='string'||!item.title||item.title.length>80||typeof item.description!=='string'||item.description.length>600||!['hosting','going'].includes(item.role)||!calendarCategories.includes(item.category)||typeof item.language!=='string'||!item.language||item.language.length>40||item.communityName!==null&&(typeof item.communityName!=='string'||item.communityName.length>80)||!Number.isSafeInteger(item.startsAt)||item.startsAt<=0||item.startsAt<previous||!Number.isSafeInteger(item.endsAt)||item.endsAt<=item.startsAt||item.endsAt>8640000000000000)throw new Error('Invalid profile event');
    seen.add(item.id);previous=item.startsAt;
  }
  if(page.nextCursor){const [at,sequence]=page.nextCursor.split(':').map(Number),[beforeAt,beforeSequence]=cursor?cursor.split(':').map(Number):[0,0];if(at!==page.items.at(-1)?.startsAt||!sequence||!(at!>beforeAt!||at===beforeAt&&sequence>beforeSequence!))throw new Error('Non-advancing events page');}
  return page;
}
export function profileEventCard(item:ProfileEvent,open?:()=>void):HTMLElement {
  const details=`${item.categoryDetail ?? item.category} · ${item.language}${item.communityName?' · '+item.communityName:''}`;
  const time=element('small',{className:'kl-profile-event-time',title:details},
    bindClockText(element('time'),item.startsAt,'medium-date-time'),
    ` · ${item.role==='hosting'?'Hosting':'Going'}`,
    element('span',{className:'kl-sr-only'},` · ${details} · Ends `,bindClockText(element('time'),item.endsAt,'medium-date-time')));
  const card=element('article',{className:'kl-profile-activity-row kl-profile-event-row'},
    element('div',{className:'kl-profile-event-date'},kikiIcon('calendar')),
    element('div',{className:'kl-profile-event-copy'},element('h3',{text:item.title}),
      element('p',{text:item.description||item.communityName||''}),time));
  if(open){
    const button=element('button',{type:'button',className:'kl-text-button kl-profile-event-open',text:'View event'});
    button.addEventListener('click',()=>{if(button.isConnected)open();});
    card.append(button);
  }
  return card;
}

/** Only a visible projection; navigation reuses Calendar's independent ACL checks. */
export class ProfileEvents {
  readonly element=element('section',{className:'kl-profile-events',hidden:true});
  readonly #unsubscribe:()=>void;
  #release:(()=>void)|undefined;#timer:ReturnType<typeof setInterval>|undefined;#expiry:ReturnType<typeof setTimeout>|undefined;
  #visible=false;#member=0;#token=0;#busy=false;#queued=false;#pages=1;#items:ProfileEvent[]=[];#next:string|null=null;#limited=false;
  constructor(readonly client:CloudClient,readonly options:{current():boolean;privacy():void;open(id:string):void}) {
    this.#unsubscribe=client.subscribe(kind=>{
      if(['session','connection'].includes(kind)||!options.current()){this.setVisible(false);return;}
      if(this.#visible&&['profile-activity','privacy','relationships','profiles-cleared','ready'].includes(kind)){
        this.#token++;this.#clear();this.#busy=true;this.#render('Checking shared events…');
        if(!this.#queued){this.#queued=true;queueMicrotask(()=>{this.#queued=false;if(this.#visible)void this.refresh();});}
      }
    });
  }
  #active():boolean{return this.#visible&&this.options.current()&&this.client.connected;}
  #clear():void{this.#items=[];this.#next=null;this.#limited=false;clearTimeout(this.#expiry);this.#expiry=undefined;}
  open(member:number):void {
    if(!this.options.current()){this.setVisible(false);return;}
    if(member!==this.#member)this.setVisible(false);this.#member=member;if(this.#visible)return;
    this.#visible=true;this.element.hidden=false;this.#release=this.client.retainEvents();this.#timer=setInterval(()=>{if(!this.#busy)void this.refresh();},60000);void this.refresh();
  }
  setVisible(_visible:false):void {
    this.#visible=false;this.#token++;this.#busy=false;this.#clear();this.#pages=1;this.element.hidden=true;this.element.replaceChildren();this.#release?.();this.#release=undefined;clearInterval(this.#timer);this.#timer=undefined;
  }
  destroy():void{this.setVisible(false);this.#unsubscribe();}
  async refresh():Promise<void>{await this.#load(1);}
  async #load(pages:number):Promise<void> {
    if(!this.#visible)return;if(!this.options.current()){this.setVisible(false);return;}
    const token=++this.#token,member=this.#member,valid=()=>this.#active()&&token===this.#token;
    this.#busy=true;this.#clear();this.#render('Checking shared events…');
    if(!this.client.connected){this.#busy=false;this.#render('Reconnect to Cloud to see profile events.');return;}
    try{
      const me=await this.client.request<{memberNumber:number;features?:{profileEvents?:boolean}}>('GET','/v1/me');
      if(!valid())return;if(me.memberNumber!==this.client.memberNumber)throw new Error('Account changed');
      if(me.features?.profileEvents!==true){this.#busy=false;this.#render('Profile events will be available after the pending Cloud update.');return;}
      let cursor:string|undefined;const items:ProfileEvent[]=[],seen=new Set<string>();
      for(let page=0;page<Math.min(pages,10);page++){
        const result=checkedProfileEvents(await this.client.request<ProfileEventsPage>('GET',`/v1/profiles/${member}/events?limit=20${cursor?'&cursor='+encodeURIComponent(cursor):''}`),member,cursor);
        if(!valid())return;for(const item of result.items){if(seen.has(item.id))throw new Error('Repeated event');seen.add(item.id);items.push(item);}
        cursor=result.nextCursor??undefined;if(!cursor)break;
      }
      this.#pages=pages;this.#items=items.filter(item=>item.endsAt>Date.now());this.#limited=pages>=10&&!!cursor;this.#next=this.#limited?null:cursor??null;this.#busy=false;this.#render();
      if(this.#items.length)this.#expiry=setTimeout(()=>{if(valid())void this.refresh();},Math.min(2147483647,Math.max(1,Math.min(...this.#items.map(item=>item.endsAt))-Date.now())));
    }catch(error){
      if(!valid())return;
      this.#clear();this.#busy=false;
      if(error instanceof CloudError&&[401,403,404].includes(error.status)){
        this.element.replaceChildren(profileSectionLocked('kl-profile-read-locked','Events are private','These events are private or no longer shared with you.',this.#options()));
      }else this.#render('Profile events could not load.','retry');
    }
  }
  #button(text:string,action:()=>void):HTMLButtonElement {
    const token=this.#token,member=this.#member;
    const button=element('button',{type:'button',className:'kl-text-button',text});
    button.addEventListener('click',()=>{if(this.#active()&&!this.#busy&&token===this.#token&&member===this.#member&&button.isConnected&&this.element.contains(button))action();});
    return button;
  }
  #options():HTMLDetailsElement {
    return profileOptions('Events options',this.#button('Refresh events',()=>void this.refresh()),
      ...(this.#member===this.client.memberNumber?[this.#button('Edit activity privacy',this.options.privacy)]:[]));
  }
  #render(message='',status?:'retry'):void {
    const token=this.#token,member=this.#member;
    this.element.replaceChildren(element('header',{className:'kl-profile-section-heading'},element('h3',{text:'Upcoming events'}),this.#options()));
    if(message)this.element.append(element('p',{role:'status',className:'kl-profile-section-note',text:message}));else if(!this.#items.length)this.element.append(element('p',{className:'kl-profile-section-note',text:'No upcoming events shared here yet.'}));
    if(status==='retry')this.element.append(this.#button('Retry',()=>void this.refresh()));
    for(const item of this.#items){
      const card=profileEventCard(item,()=>{
        if(this.#active()&&!this.#busy&&token===this.#token&&member===this.#member&&this.element.contains(card)&&item.endsAt>Date.now())this.options.open(item.id);
      });
      this.element.append(card);
    }
    if(this.#next)this.element.append(pageAction(this.#button('Load more events',()=>void this.#load(this.#pages+1))));if(this.#limited)this.element.append(element('p',{className:'kl-profile-section-note',text:'Showing up to 200 visible events. Open Events to explore more.'}));
    for(const button of this.element.querySelectorAll('button'))button.disabled=this.#busy;
  }
}
