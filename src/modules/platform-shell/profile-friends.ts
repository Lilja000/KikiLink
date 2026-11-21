import { markAvatarPresence } from "../link-chat/avatar-presence";
import { profileOptions } from './profile-controls';
import { CloudError, type CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { kikiIcon } from '../link-chat/icons';
import { preserveProfilePagingPosition } from './profile-read-paging';

export interface ProfileFriend { memberNumber:number; displayName:string; username:string|null; }
interface Page { memberNumber:number; scope:'own'|'mutual'; items:ProfileFriend[]; nextCursor:number|null; }
function checked(page:Page, owner:number, viewer:number, cursor:number):Page {
  if (!page || page.memberNumber!==owner || page.scope!==(owner===viewer?'own':'mutual') || !Array.isArray(page.items) || page.items.length>3 ||
    page.nextCursor!==null && (!Number.isSafeInteger(page.nextCursor) || page.nextCursor<=0 || cursor>0 && page.nextCursor>=cursor) ||
    !page.items.length && page.nextCursor!==null) throw new Error('Invalid friends page');
  let previous=cursor||Number.POSITIVE_INFINITY;
  for (const item of page.items) {
    if (!item || !Number.isSafeInteger(item.memberNumber) || item.memberNumber<=0 || item.memberNumber>=previous || item.memberNumber===owner || item.memberNumber===viewer ||
      typeof item.displayName!=='string' || !item.displayName.trim() || item.displayName.length>80 || item.username!==null && (typeof item.username!=='string' || !/^[a-z0-9_]{3,24}$/.test(item.username))) throw new Error('Invalid friend');
    previous=item.memberNumber;
  }
  if (page.nextCursor!==null && page.nextCursor!==page.items.at(-1)?.memberNumber) throw new Error('Invalid friends cursor');
  return page;
}

/** Reconstructed from the verified Local58 client; keeps every page access check live. */
export class ProfileFriends {
  readonly element=element('section',{className:'kl-profile-friends',hidden:true});
  readonly #unsubscribe:()=>void;
  #release:(()=>void)|undefined;
  #timer:ReturnType<typeof setInterval>|undefined;
  #nativeTimer:ReturnType<typeof setInterval>|undefined;
  #visible=false; #member=0; #token=0; #busy=false; #queued=false; #pages=1;
  #items:ProfileFriend[]=[]; #next:number|null=null;
  constructor(readonly client:CloudClient, readonly options:{current():boolean;blocked(member:number):boolean;open(member:number,name:string):void;privacy():void}) {
    this.#unsubscribe=client.subscribe(kind=>{
      if (['session','connection'].includes(kind)||!options.current()) {this.setVisible(false);return;}
      if(this.#visible&&['profile-friends','privacy','relationships','profiles-cleared','ready'].includes(kind)) {
        this.#token++;this.#items=[];this.#next=null;this.#busy=true;this.#render('Checking shared friends…');
        if(!this.#queued){this.#queued=true;queueMicrotask(()=>{this.#queued=false;if(this.#visible)void this.refresh();});}
      }
    });
  }
  #active():boolean{return this.#visible&&this.options.current()&&this.client.connected;}
  open(member:number):void {
    if(!this.options.current()){this.setVisible(false);return;}
    if(member!==this.#member)this.setVisible(false);this.#member=member;if(this.#visible)return;
    this.#visible=true;this.element.hidden=false;this.#release=this.client.retainEvents();
    this.#timer=setInterval(()=>{if(!this.#busy)void this.refresh();},60000);
    this.#nativeTimer=setInterval(()=>this.#filterNative(),1000);void this.refresh();
  }
  setVisible(_visible:false):void {
    this.#visible=false;this.#token++;this.#busy=false;this.#items=[];this.#next=null;this.#pages=1;
    this.element.hidden=true;this.element.replaceChildren();this.#release?.();this.#release=undefined;
    clearInterval(this.#timer);clearInterval(this.#nativeTimer);
  }
  destroy():void{this.setVisible(false);this.#unsubscribe();}
  #filterNative():void {
    if(!this.#active()){this.setVisible(false);return;}
    if(this.options.blocked(this.#member)){this.#token++;this.#items=[];this.#next=null;this.#busy=false;this.#render('These friends are private or no longer shared with you.');return;}
    const next=this.#items.filter(item=>!this.options.blocked(item.memberNumber));
    if(next.length!==this.#items.length){this.#items=next;this.#render();}
  }
  async refresh():Promise<void>{await this.#load(1);}
  async #load(pages:number, restorePosition?:()=>void):Promise<void>{
    if(!this.#visible)return;if(!this.options.current()){this.setVisible(false);return;}
    const token=++this.#token,member=this.#member,current=()=>this.#active()&&token===this.#token;
    this.#busy=true;this.#items=[];this.#next=null;this.#render('Checking shared friends…');
    if(!this.client.connected){this.#busy=false;this.#render('Reconnect to Cloud to see profile friends.');return;}
    try{
      if(this.options.blocked(member))throw new CloudError('profile_friends_private',403);
      const me=await this.client.request<{memberNumber:number;features?:{profileFriends?:boolean}}>('GET','/v1/me');
      if(!current())return;if(me.memberNumber!==this.client.memberNumber)throw new Error('Account changed');
      if(me.features?.profileFriends!==true){this.#busy=false;this.#render('Profile friends are not available on this Cloud server yet.');return;}
      let cursor=0,loaded=0;const items:ProfileFriend[]=[];
      while(loaded<Math.min(pages,20)){
        const result=checked(await this.client.request<Page>('GET',`/v1/profiles/${member}/friends?limit=3&cursor=${cursor}`),member,this.client.memberNumber,cursor);
        if(!current())return;items.push(...result.items);loaded++;cursor=result.nextCursor??0;if(!cursor)break;
      }
      this.#items=items.filter(item=>!this.options.blocked(item.memberNumber));this.#pages=loaded;this.#next=loaded<20&&cursor||null;
      this.#busy=false;this.#render();this.#filterNative();restorePosition?.();
    }catch(error){
      if(!current())return;this.#items=[];this.#next=null;this.#busy=false;
      const denied=error instanceof CloudError&&[401,403,404].includes(error.status);
      this.#render(denied?'These friends are private or no longer shared with you.':'Profile friends could not load.',!denied);
      restorePosition?.();
    }
  }
  #button(text:string,action:(button:HTMLButtonElement)=>void,className='kl-text-button'):HTMLButtonElement{
    const button=element('button',{type:'button',className,text});
    const token=this.#token,member=this.#member;
    button.addEventListener('click',()=>{
      if(token===this.#token&&member===this.#member&&button.isConnected&&this.element.contains(button)&&this.#active()&&!this.#busy)action(button);
    });
    return button;
  }
  #render(message='',retry=false):void{
    const own=this.#member===this.client.memberNumber;
    this.element.replaceChildren(element('header',{className:'kl-profile-section-heading'},element('h3',{text:own?'Friends':'Mutual friends'}),
      profileOptions('Friends options', this.#button('Refresh friends',()=>void this.refresh()), ...(own ? [this.#button('Edit About privacy',this.options.privacy)] : []))));
    if(message)this.element.append(element('p',{role:'status',className:'kl-profile-section-note',text:message}));
    else if(!this.#items.length)this.element.append(element('p',{className:'kl-profile-section-note',text:own?'No confirmed friends with a shared profile yet.':'No mutual friends shared with you.'}));
    const list=element('div',{className:'kl-profile-friend-list'});
    for(const item of this.#items){
      const row=this.#button(item.displayName,()=>{
        if(this.options.blocked(this.#member)||this.options.blocked(item.memberNumber)){this.#filterNative();return;}
        this.options.open(item.memberNumber,item.displayName);
      },'kl-profile-friend-row');
      row.dataset.memberNumber=String(item.memberNumber);
      row.setAttribute('aria-label',`Open profile of ${item.displayName}`);
      row.replaceChildren(markAvatarPresence(element('span',{className:'kl-profile-friend-avatar',ariaHidden:'true',text:Array.from(item.displayName.trim())[0]??'?'}), item.memberNumber),
        element('span',{className:'kl-profile-row-copy'},element('strong',{text:item.displayName}),element('small',{text:item.username?`@${item.username}`:`#${item.memberNumber}`})),
        kikiIcon('arrow-right'));
      list.append(row);
    }
    this.element.append(list);
    if(retry)this.element.append(this.#button('Retry',()=>void this.refresh(),'kl-text-button kl-profile-read-retry'));
    if(this.#next)this.element.append(this.#button('More friends',button=>{
      const seen=new Set(this.#items.map(item=>String(item.memberNumber)));
      const restore=preserveProfilePagingPosition(button,()=>{
        const rows=[...this.element.querySelectorAll<HTMLButtonElement>('.kl-profile-friend-row')];
        return rows.find(row=>!seen.has(row.dataset.memberNumber??''))??rows.at(-1)??
          this.element.querySelector<HTMLElement>('.kl-profile-read-retry')??this.element.querySelector('summary');
      });
      void this.#load(this.#pages+1,restore);
    }));
    if(this.#pages>=20&&!message)this.element.append(element('p',{className:'kl-profile-section-note',text:'Showing up to 60 shared friends.'}));
    for(const button of this.element.querySelectorAll<HTMLButtonElement>('button'))button.disabled=this.#busy;
  }
}
