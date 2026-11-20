import { profileOptions } from './profile-controls';
import { CloudError, type CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { ProfileActivityRecovery, ProfileActivityRecoveryError, profileActivityRecoveryConflict, type ProfileActivityAccess } from '../../cloud/profile-activity-recovery';
import { bindClockText } from '../../core/time-format';
import { kikiIcon } from '../link-chat/icons';
import { profileSectionLocked } from './profile-visibility-view';

export interface ProfileActivityItem { kind:'post'|'event'|'album'; id:string; title:string; text:string; createdAt:number; recoveryGeneration?:string; }
interface Page { memberNumber:number; days:number; items:ProfileActivityItem[]; nextCursor:string|null; }
const cursorPattern = /^\d{1,16}:[123]:\d{1,16}$/;
const sourceIcons={post:'chat',event:'calendar',album:'image'} as const;

export function profileActivityRow(item:Omit<ProfileActivityItem,'id'>,source?:HTMLButtonElement):HTMLElement {
  const emblem=source??element('span',{className:'kl-profile-activity-source',ariaHidden:'true'});
  emblem.append(kikiIcon(sourceIcons[item.kind]??'chat'));
  const text=item.text&&item.text!==item.title?`${item.title} · ${item.text}`:item.title;
  return element('article',{className:'kl-profile-activity-row'},emblem,element('div',{className:'kl-profile-activity-copy'},
    element('p',{text}),bindClockText(element('time'),item.createdAt,'medium-date-time')));
}
function checked(page:Page, owner:number, cursor:string|undefined):Page {
  const cursorValid = (v:string) => cursorPattern.test(v) && v.split(':').every(n=>Number.isSafeInteger(Number(n)));
  if (!page || page.memberNumber!==owner || page.days!==30 || !Array.isArray(page.items) || page.items.length>20 ||
    page.nextCursor!==null && (typeof page.nextCursor!=='string' || !cursorValid(page.nextCursor) || page.nextCursor===cursor) ||
    !page.items.length && page.nextCursor!==null) throw new Error('Invalid activity page');
  const ids=new Set<string>();
  let previous=Number.MAX_SAFE_INTEGER;
  for(const item of page.items){
    if(!item || !['post','event','album'].includes(item.kind) || typeof item.id!=='string' ||
      !(item.kind==='post'?/^[1-9]\d{0,15}$/.test(item.id)&&Number.isSafeInteger(Number(item.id)):/^[a-f0-9-]{36}$/.test(item.id)) ||
      typeof item.title!=='string' || !item.title || item.title.length>80 || typeof item.text!=='string' || item.text.length>180 ||
      !Number.isSafeInteger(item.createdAt) || item.createdAt<=0 || item.createdAt>8640000000000000 || item.createdAt>previous || ids.has(item.kind+':'+item.id)) throw new Error('Invalid activity item');
    ids.add(item.kind+':'+item.id); previous=item.createdAt;
  }
  if(cursor && page.nextCursor!==null){
    const a=page.nextCursor.split(':').map(Number),b=cursor.split(':').map(Number);
    if(!(a[0]!<b[0]! || a[0]===b[0]&&(a[1]!<b[1]! || a[1]===b[1]&&a[2]!<b[2]!))) throw new Error('Non-advancing activity');
  }
  return page;
}

/** Visible-only live content. No persisted activity cache or speculative entries. */
export class ProfileActivity {
  readonly element=element('section',{className:'kl-profile-activity',hidden:true});
  readonly #unsubscribe:()=>void;
  readonly #recovery:ProfileActivityRecovery;
  #access:ProfileActivityAccess|undefined;
  #release:(()=>void)|undefined; #timer:ReturnType<typeof setInterval>|undefined;
  #visible=false; #member=0; #token=0; #busy=false; #queued=false;
  #items:ProfileActivityItem[]=[]; #pages=1; #next:string|null=null; #limited=false;
  constructor(readonly client:CloudClient,readonly options:{current():boolean;open(item:ProfileActivityItem):void;privacy():void}){
    this.#recovery=new ProfileActivityRecovery(client);
    this.#unsubscribe=client.subscribe(kind=>{
      if(['session','connection'].includes(kind)||!options.current()){this.setVisible(false);return;}
      if(this.#visible && ['profile-activity','privacy','relationships','profiles-cleared','ready'].includes(kind)){
        this.#token++;this.#access=undefined;this.#items=[];this.#next=null;this.#busy=true;this.#render('Checking shared activity…');
        if(!this.#queued){this.#queued=true;queueMicrotask(()=>{this.#queued=false;if(this.#visible)void this.refresh();});}
      }
    });
  }
  #active():boolean{return this.#visible&&this.options.current()&&this.client.connected;}
  open(member:number):void{
    if(!this.options.current()){this.setVisible(false);return;}
    if(member!==this.#member)this.setVisible(false);this.#member=member;if(this.#visible)return;
    this.#visible=true;this.element.hidden=false;this.#release=this.client.retainEvents();
    this.#timer=setInterval(()=>{if(!this.#busy)void this.refresh();},60000);void this.refresh();
  }
  setVisible(_visible:false):void{this.#visible=false;this.#token++;this.#recovery.invalidate();this.#access=undefined;this.#busy=false;this.#items=[];this.#pages=1;this.#next=null;this.#limited=false;this.element.hidden=true;this.element.replaceChildren();this.#release?.();this.#release=undefined;clearInterval(this.#timer);}
  destroy():void{this.setVisible(false);this.#unsubscribe();}
  async refresh():Promise<void>{await this.#load();}
  async #load(pages=1):Promise<void>{
    if(!this.#visible)return;if(!this.options.current()){this.setVisible(false);return;}
    const token=++this.#token,member=this.#member,valid=()=>this.#active()&&token===this.#token;
    this.#busy=true;
    // Re-read the complete loaded slice on More: previous rows may have lost
    // access since the last page. Never append stale content after an ACL check.
    this.#access=undefined;this.#items=[];this.#next=null;this.#limited=false;this.#render('Checking shared activity…');
    if(!this.client.connected){this.#busy=false;this.#render('Reconnect to Cloud to see profile activity.');return;}
    try{
      const me=await this.client.request<{memberNumber:number;features?:{profileActivity?:boolean}}>('GET','/v1/me');
      if(!valid())return;if(me.memberNumber!==this.client.memberNumber)throw new Error('Account changed');
      if(this.#recovery.accept(me))pages=1;
      if(me.features?.profileActivity!==true){this.#busy=false;this.#render('Profile activity is not available on this Cloud server yet.');return;}
      const access=this.#recovery.capture();
      let next:string|undefined,items:ProfileActivityItem[]=[];
      for(let page=0;page<Math.min(pages,10);page++){
        const result=checked(await access.request<Page>('GET',`/v1/profiles/${member}/activity?limit=20${next?'&cursor='+encodeURIComponent(next):''}`),member,next);
        if(!valid())return;
        const captured=result.items.map(item=>{const row={...item};delete row.recoveryGeneration;if(access.generation)row.recoveryGeneration=access.generation;return row;});
        items=[...new Map([...items,...captured].map(item=>[item.kind+':'+item.id,item])).values()];
        next=result.nextCursor??undefined;if(!next)break;
      }
      this.#access=access;this.#items=items;this.#pages=pages;this.#limited=pages>=10&&!!next;this.#next=this.#limited?null:next??null;this.#busy=false;this.#render();
    }catch(error){
      if(!valid())return;this.#access=undefined;this.#items=[];this.#next=null;this.#busy=false;
      if(profileActivityRecoveryConflict(error))this.#render(new ProfileActivityRecoveryError().message,true);
      else if(error instanceof CloudError&&[401,403,404].includes(error.status)){
        this.element.replaceChildren(profileSectionLocked('kl-profile-read-locked','Activity is private','This activity is private or no longer shared with you.',this.#options()));
      }else this.#render('Profile activity could not load.',true);
    }
  }
  #button(text:string,action:()=>void):HTMLButtonElement{
    return this.#guard(element('button',{type:'button',className:'kl-text-button',text}),action);
  }
  #guard(button:HTMLButtonElement,action:()=>void):HTMLButtonElement{
    const token=this.#token,member=this.#member;
    button.addEventListener('click',()=>{
      if(this.#active()&&!this.#busy&&token===this.#token&&member===this.#member&&button.isConnected&&this.element.contains(button))action();
    });
    return button;
  }
  #options():HTMLDetailsElement {
    return profileOptions('Activity options',this.#button('Refresh activity',()=>void this.refresh()),
      ...(this.#member===this.client.memberNumber?[this.#button('Edit activity privacy',this.options.privacy)]:[]));
  }
  #render(message='',retry=false):void{
    const header=element('header',{className:'kl-profile-section-heading'},element('h3',{text:'Recent activity'}),this.#options());
    this.element.replaceChildren(header);
    if(message)this.element.append(element('p',{role:'status',className:'kl-profile-section-note',text:message}));
    else if(!this.#items.length)this.element.append(element('p',{className:'kl-profile-section-note',text:'No recent activity shared yet.'}));
    if(retry)this.element.append(this.#button('Retry',()=>void this.refresh()));
    for(const item of this.#items){
      const access=this.#access;
      const label=`Open ${item.kind}: ${item.title}`;
      const source=this.#guard(element('button',{type:'button',className:'kl-profile-activity-source',ariaLabel:label,title:label}),()=>{
        if(!access?.current()||item.recoveryGeneration!==access.generation){
          this.#token++;this.#access=undefined;this.#items=[];this.#next=null;this.#limited=false;
          this.#render(new ProfileActivityRecoveryError().message,true);return;
        }
        this.options.open(item);
      });
      this.element.append(profileActivityRow(item,source));
    }
    if(this.#next)this.element.append(this.#button('More activity',()=>void this.#load(this.#pages+1)));
    if(this.#limited)this.element.append(element('p',{className:'kl-profile-section-note',text:'Showing up to 200 visible items. Open Feed, Events or Albums for more.'}));
    for(const b of this.element.querySelectorAll<HTMLButtonElement>('button'))b.disabled=this.#busy;
  }
}
