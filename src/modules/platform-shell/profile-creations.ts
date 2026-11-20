import { profileOptions } from './profile-controls';
import { CloudError, type CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { kikiIcon } from '../link-chat/icons';
import { profileSectionLocked } from './profile-visibility-view';
import { checkedWorkshopPage, workshopTypeIcons, type WorkshopPage, type WorkshopSummary } from './workshop-model';
export interface ProfileCreationsPage extends WorkshopPage {memberNumber:number;}
export function checkedProfileCreations(page:ProfileCreationsPage,owner:number,cursor=0,limit=20):WorkshopPage {
  if(!page||page.memberNumber!==owner)throw new Error('Invalid creation owner');return checkedWorkshopPage(page,cursor,limit,owner,true);
}

export function profileCreationRow(item:WorkshopSummary,button?:HTMLButtonElement):HTMLElement {
  const row=button??element('article',{className:'kl-profile-creation-row'}),icon=workshopTypeIcons[item.type];
  row.append(element('span',{className:'kl-profile-creation-emblem'},kikiIcon(icon,'kl-icon',icon==='activities')),
    element('span',{className:'kl-profile-creation-copy'},element('strong',{text:item.title,title:item.title}),
      element('small',{text:item.version?`${item.type} · v${item.version}`:item.type})));
  if(button)row.append(kikiIcon('arrow-right'));
  return row;
}

export class ProfileCreations {
  readonly element=element('section',{className:'kl-profile-creations',hidden:true});readonly #unsubscribe:()=>void;
  #visible=false;#member=0;#token=0;#busy=false;#queued=false;#pages=1;#release:(()=>void)|undefined;#timer:ReturnType<typeof setInterval>|undefined;
  constructor(readonly client:CloudClient,readonly options:{current():boolean;open(id?:string,mine?:boolean):void;privacy():void}){
    this.#unsubscribe=client.subscribe(kind=>{if(['session','connection'].includes(kind)||!options.current()){this.setVisible(false);return;}if(this.#visible&&['workshop','privacy','relationships','profiles-cleared','ready'].includes(kind)){this.#token++;this.element.replaceChildren(element('p',{role:'status',text:'Checking shared creations…'}));if(!this.#queued){this.#queued=true;queueMicrotask(()=>{this.#queued=false;if(this.#visible)void this.refresh();});}}});
  }
  open(member:number):void {
    if(!this.options.current())return;if(this.#member!==member)this.setVisible(false);this.#member=member;if(this.#visible)return;this.#visible=true;this.element.hidden=false;this.#release=this.client.retainEvents();this.#timer=setInterval(()=>{if(!this.#busy)void this.refresh();},60000);void this.refresh();
  }
  setVisible(_visible:false):void {this.#visible=false;this.#token++;this.#busy=false;this.#pages=1;this.element.hidden=true;this.element.replaceChildren();this.#release?.();this.#release=undefined;clearInterval(this.#timer);this.#timer=undefined;}
  destroy():void{this.setVisible(false);this.#unsubscribe();}
  #active():boolean{return this.#visible&&this.options.current()&&this.client.connected;}
  #guard(button:HTMLButtonElement,action:()=>void):HTMLButtonElement {
    const token=this.#token,member=this.#member;
    button.addEventListener('click',()=>{
      if(this.#active()&&!this.#busy&&token===this.#token&&member===this.#member&&button.isConnected&&this.element.contains(button))action();
    });
    return button;
  }
  #button(text:string,action:()=>void):HTMLButtonElement {
    return this.#guard(element('button',{type:'button',className:'kl-text-button',text}),action);
  }
  #options():HTMLDetailsElement {
    return profileOptions('Creations options',this.#button('Refresh creations',()=>void this.refresh()),
      ...(this.#member===this.client.memberNumber?[this.#button('Edit activity privacy',this.options.privacy)]:[]));
  }
  async refresh(pages=1):Promise<void>{
    if(!this.#visible)return;if(!this.options.current()){this.setVisible(false);return;}const token=++this.#token,member=this.#member,valid=()=>this.#active()&&token===this.#token;
    this.#busy=true;this.element.replaceChildren(element('p',{role:'status',text:'Checking shared creations…'}));if(!this.client.connected){this.#render('Reconnect to Cloud to see profile creations.');return;}
    try{
      const me=await this.client.request<{memberNumber:number;features?:{profileCreations?:boolean;roomOpening?:boolean;workshopRoomThemes?:boolean;workshopCommunityTemplates?:boolean}}>('GET','/v1/me');if(!valid())return;if(me.memberNumber!==this.client.memberNumber)throw new Error('Wrong account');if(me.features?.profileCreations!==true){this.#render('Profile creations will be available after the pending Cloud update.');return;}
      let cursor=0;const items:WorkshopSummary[]=[],seen=new Set<string>();
      for(let page=0;page<Math.min(pages,10);page++){const result=checkedProfileCreations(await this.client.request<ProfileCreationsPage>('GET',`/v1/profiles/${member}/creations?limit=20&cursor=${cursor}${me.features?.roomOpening===true?'&format=6':me.features?.workshopCommunityTemplates===true?'&format=4':me.features?.workshopRoomThemes===true?'&format=2':''}`),member,cursor);if(!valid())return;for(const item of result.items){if(seen.has(item.id))throw new Error('Repeated creation');seen.add(item.id);items.push(item);}cursor=result.nextCursor??0;if(!cursor)break;}
      this.#pages=pages;this.#render('',{items,nextCursor:cursor||null});
    }catch(error){
      if(!valid())return;
      this.#busy=false;
      if(error instanceof CloudError&&[401,403,404].includes(error.status)){
        this.element.replaceChildren(profileSectionLocked('kl-profile-read-locked','Creations are private','These creations are private or no longer shared with you.',this.#options()));
      }else this.#render('Profile creations could not load.',undefined,true);
    }
  }
  #render(message:string,page:WorkshopPage={items:[],nextCursor:null},retry=false):void {
    this.#busy=false;
    const owner=this.#member===this.client.memberNumber;
    const mine=owner?this.#button('My creations',()=>this.options.open(undefined,true)):undefined;
    mine?.classList.add('kl-profile-creations-mine');
    this.element.replaceChildren(element('header',{className:'kl-profile-section-heading'},element('h3',{text:'From the Workshop'}),mine,this.#options()));
    if(message)this.element.append(element('p',{role:'status',className:'kl-profile-section-note',text:message}));
    else if(!page.items.length)this.element.append(element('p',{className:'kl-profile-section-note',text:'No public Workshop creations yet.'}));
    if(retry)this.element.append(this.#button('Retry',()=>void this.refresh()));
    for(const item of page.items){
      const row=element('button',{type:'button',className:'kl-profile-creation-row',ariaLabel:`View creation: ${item.title}`});
      this.element.append(profileCreationRow(item,this.#guard(row,()=>this.options.open(item.id))));
    }
    if(page.nextCursor&&this.#pages<10)this.element.append(this.#button('More creations',()=>void this.refresh(this.#pages+1)));
    else if(page.nextCursor)this.element.append(element('p',{className:'kl-profile-section-note',text:'Showing up to 200 creations. Open Workshop to explore more.'}));
  }
}
