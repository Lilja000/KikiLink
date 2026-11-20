import { checkedWorkshopPage, type WorkshopPage } from "./workshop-model";
import { checkedProfileEvents, profileEventCard, type ProfileEventsPage } from "./profile-events";
import { CloudError, type CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import type { CloudProfile } from '../../cloud/types';
import { catalog, normalizePreferenceRatings, PREFERENCE_CATEGORIES, PREFERENCE_LEVEL_LABELS, preferenceMatchesSearch } from '../../cloud/preference-model';
import { applyAvatarAppearance, applyProfileAppearance } from '../link-chat/appearance-renderer';
import { appendProfileDetails } from './profile-details-view';
import { ProfileSections } from './profile-sections';
import { focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';
import { searchField } from './browse-controls';
import { profileIdentityName, profileIdentityBadges, profilePreferencesLocked, profileSectionLocked } from './profile-visibility-view';
import { profileCommunityRow, type ProfileCommunitySummary } from './profile-communities';
import { profileCreationRow } from './profile-creations';
import { profileActivityRow, type ProfileActivityItem } from './profile-activity';
import { fitPanelDialog } from './panel-dialog-layout';
import type { Album, AlbumRef } from './albums-panel';
import { albumCard } from './album-card';

export type PreviewAudience = 'everyone' | 'friend';
type ViewAudience = PreviewAudience | 'you';
interface PreviewSection<T> { state:'shared'|'private'; items:T[]; nextCursor?:number|string|null; }
type PreviewAlbum = Pick<Album,'title'|'description'|'refs'>;
interface Preview {
  memberNumber:number; audience:PreviewAudience; available:boolean; profile:CloudProfile;
  online:'viewer-dependent'|'private'; location:{room:{name:string;space?:string}|null;expiresInMs:number};
  preferences:{state:'shared'|'private'|'score-only';ratings:Record<string,unknown>};
  communities:PreviewSection<ProfileCommunitySummary>;
  creations?:{state:"shared"|"private"}&WorkshopPage;
  events?:{state:"shared"|"private"}&Omit<ProfileEventsPage,"memberNumber">;
  activity:PreviewSection<Omit<ProfileActivityItem,'id'|'recoveryGeneration'>>;
  albums:PreviewSection<PreviewAlbum>;
}
const note=(text:string)=>element('p',{className:'kl-profile-section-note',text});
const imageId=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
const heading=(text:string,action?:HTMLElement)=>element('header',{className:'kl-profile-section-heading'},element('h3',{text}),action);
const section=(title:string,className:string,...content:HTMLElement[])=>element('section',{className},heading(title),...content);
const previewLimit=(label:string)=>note(`Showing the first 40 visible ${label} in this preview.`);
export function profileViewAsControl(value:ViewAudience,change:(value:ViewAudience)=>void):HTMLElement {
  const select=element('select',{ariaLabel:'View profile as'});
  for(const [value,text] of [['you','You'],['everyone','Everyone'],['friend','A friend']] as const)select.append(element('option',{value,text}));
  select.value=value;select.addEventListener('change',()=>{if(['you','everyone','friend'].includes(select.value))change(select.value as ViewAudience);});
  return element('label',{className:'kl-profile-view-as-control'},kikiIcon('eye'),element('span',{text:'View as'}),select);
}
function checked(data:Preview,member:number,audience:PreviewAudience,eventsSupported:boolean,creationsSupported:boolean):Preview {
  if(!data||data.memberNumber!==member||data.audience!==audience||typeof data.available!=='boolean')throw new Error('Invalid preview identity');
  if(!data.available)return data;
  if(!data.profile||data.profile.memberNumber!==member||data.profile.visible!==true||typeof data.profile.displayName!=='string'||typeof data.profile.bio!=='string'||
    !['viewer-dependent','private'].includes(data.online??'')||!data.location||!Number.isFinite(data.location.expiresInMs)||data.location.expiresInMs<0||data.location.expiresInMs>180000||
    data.location.room!==null&&(typeof data.location.room?.name!=='string'||!data.location.expiresInMs)||!data.preferences||!['shared','private','score-only'].includes(data.preferences.state)||!data.preferences.ratings||typeof data.preferences.ratings!=='object')throw new Error('Invalid preview');
  for(const [key,max] of [['communities',40],['activity',40],['albums',8]] as const){const section=data[key];if(!section||!['shared','private'].includes(section.state)||!Array.isArray(section.items)||section.items.length>max||section.state==='private'&&(section.items.length||section.nextCursor!=null))throw new Error('Invalid preview section');}
  if(data.communities.items.some(item=>!item||typeof item.name!=='string'||typeof item.description!=='string'||!['public','request'].includes(item.access)))throw new Error('Invalid preview community');
  if(data.albums.items.some(album=>!album||typeof album.title!=='string'||typeof album.description!=='string'||!Array.isArray(album.refs)||album.refs.length>20||album.refs.some(ref=>!ref||!imageId(ref.id)||typeof ref.caption!=='string'||typeof ref.spoiler!=='boolean')))throw new Error('Invalid preview album');
  if(eventsSupported){
    if(!data.events||!['shared','private'].includes(data.events.state)||data.events.state==='private'&&(data.events.items?.length||data.events.nextCursor))throw new Error('Invalid preview events');
    checkedProfileEvents({memberNumber:member,items:data.events.items,nextCursor:data.events.nextCursor},member,undefined,40);
  }else delete data.events;
  if(creationsSupported){
    if(!data.creations||!['shared','private'].includes(data.creations.state)||data.creations.state==='private'&&(data.creations.items?.length||data.creations.nextCursor))throw new Error('Invalid preview creations');
    data.creations.items=checkedWorkshopPage({items:data.creations.items,nextCursor:data.creations.nextCursor},0,40,member,true).items;
  }else delete data.creations;
  if(data.preferences.state!=='shared'&&Object.keys(data.preferences.ratings).length)throw new Error('Invalid private preferences');
  return data;
}

/** Transient self-preview. No hypothetical data enters CloudClient's profile cache. */
export class ProfileViewAs {
  readonly element=element('section',{className:'kl-profile-view-as',hidden:true});
  readonly #body=element('div');
  readonly #controls=element('div',{className:'kl-profile-view-as-controls'});
  readonly #audienceSelect:HTMLSelectElement;
  readonly #noticeText=element('span');
  readonly #notice:HTMLElement;
  readonly #extra:HTMLElement;
  readonly #unsubscribe:()=>void;
  #release:(()=>void)|undefined;
  #timer:ReturnType<typeof setInterval>|undefined;
  #locationTimer:ReturnType<typeof setTimeout>|undefined;
  #visible=false; #audience:PreviewAudience='everyone'; #token=0; #busy=false; #queued=false; #section='about';
  #sectionFocus:string|undefined;
  #closeAlbum:((restoreFocus:boolean)=>void)|undefined;
  #preferenceQuery='';
  #preferenceCategory='';
  constructor(readonly client:CloudClient,readonly options:{
    current():boolean;done():void;section?(value:string):void;image(id:string,kind:'avatar'|'banner'|'album'):HTMLElement;
    albumCover?(id:string,title:string,open:(button:HTMLButtonElement)=>void):HTMLElement|undefined;closeAlbumImages?():void;
  }) {
    const audience=profileViewAsControl('everyone',value=>{if(value==='you')this.options.done();else void this.open(value);});
    this.#audienceSelect=audience.querySelector('select')!;
    this.#controls.append(audience);
    this.#notice=element('div',{className:'kl-profile-view-as-notice'},kikiIcon('eye'),this.#noticeText,this.#button('Done',()=>this.options.done()));
    this.#extra=element('div',{className:'kl-profile-view-as-extra'},note('Mutual friends, compatibility, native BC details and membership-specific access depend on the actual visitor. They are not simulated here.'),this.#button('Refresh preview',()=>void this.refresh()));
    this.#unsubscribe=client.subscribe(kind=>{
      if(kind==='session'||!options.current()){this.setVisible(false);return;}
      if(this.#visible&&(['workshop','privacy','preferences','relationships','profiles-cleared','profile-activity','profile-communities','profile-location','albums','communities','ready','connection','media-invalidated'].includes(kind)||kind===`profile:${client.memberNumber}`)){
        this.#clear('Checking audience visibility…');
        if(!this.#queued){this.#queued=true;queueMicrotask(()=>{this.#queued=false;if(this.#visible)void this.refresh();});}
      }
    });
  }
  get active():boolean{return this.#visible;}
  get section():string{return this.#section;}
  get audience():PreviewAudience{return this.#audience;}
  open(audience:PreviewAudience,section='about'):Promise<void> {
    if(!this.options.current())return Promise.resolve();
    if(!this.#visible){this.#visible=true;this.#section=section;this.#preferenceQuery='';this.#preferenceCategory='';this.element.replaceChildren(this.#controls,this.#notice,this.#body,this.#extra);this.element.hidden=false;this.#release=this.client.retainEvents();this.#timer=setInterval(()=>{if(!this.#busy)void this.refresh();},60000);}
    this.#audience=audience;this.#audienceSelect.value=audience;
    this.#noticeText.textContent=`Previewing what ${audience==='friend'?'a friend':'everyone'} can see. Private sections remain hidden.`;
    return this.refresh();
  }
  setVisible(_visible:false):void {
    this.#visible=false;this.#clear();this.#sectionFocus=undefined;this.element.replaceChildren();this.element.hidden=true;this.#body.style.minHeight='';this.#release?.();this.#release=undefined;clearInterval(this.#timer);this.#timer=undefined;
  }
  destroy():void{this.setVisible(false);this.#unsubscribe();}
  #clear(message=''):void {
    this.#token++;this.#busy=false;clearTimeout(this.#locationTimer);this.#locationTimer=undefined;
    const active=focusedElement(this.#body),tab=active&&this.#body.contains(active)?active.closest<HTMLElement>('[role="tab"]'):undefined;
    if(tab?.getAttribute('aria-controls'))this.#sectionFocus=tab.getAttribute('aria-controls')!;
    else if(active&&active!==this.element.ownerDocument.body)this.#sectionFocus=undefined;
    this.#closeAlbum?.(false);
    // Remove revoked values immediately while keeping the reading surface from
    // collapsing underneath the stable audience control during a refresh.
    if(this.#visible&&this.#body.firstElementChild?.matches('[data-preview-audience]'))this.#body.style.minHeight=`${this.#body.getBoundingClientRect().height}px`;
    this.#body.replaceChildren(...message?[element('p',{role:'status',text:message})]:[]);
  }
  #button(text:string,action:()=>void):HTMLButtonElement {
    const button=element('button',{type:'button',className:'kl-text-button',text});
    button.addEventListener('click',()=>{if(this.#visible&&this.options.current()&&button.isConnected&&this.element.contains(button))action();});
    return button;
  }
  async refresh():Promise<void> {
    if(!this.#visible)return;if(!this.options.current()){this.setVisible(false);return;}
    this.#clear('Checking audience visibility…');
    const token=this.#token,audience=this.#audience,member=this.client.memberNumber;
    const valid=()=>this.#visible&&this.options.current()&&this.client.connected&&this.client.memberNumber===member&&token===this.#token;
    if(!this.client.connected){this.#clear('Reconnect to Cloud to preview your profile.');this.#body.style.minHeight='';return;}
    this.#busy=true;
    try{
      const me=await this.client.request<{memberNumber:number;features?:{profileViewAs?:boolean;profileEvents?:boolean;profileCreations?:boolean;roomOpening?:boolean;workshopRoomThemes?:boolean;workshopCommunityTemplates?:boolean}}>('GET','/v1/me');
      if(!valid())return;if(me.memberNumber!==member)throw new Error('Account changed');
      if(me.features?.profileViewAs!==true){this.#busy=false;this.#body.style.minHeight='';this.#body.replaceChildren(note('View as will be available after the pending Cloud update. Your current profile still works.'));return;}
      const preview=checked(await this.client.request<Preview>('GET',`/v1/profiles/me/preview?audience=${audience}${me.features?.roomOpening===true?'&format=6':me.features?.workshopCommunityTemplates===true?'&format=4':me.features?.workshopRoomThemes===true?'&format=2':''}`),member,audience,me.features?.profileEvents===true,me.features?.profileCreations===true);
      if(!valid())return;this.#busy=false;this.#render(preview);
      const expiries=[...preview.location?.room?[preview.location.expiresInMs]:[],...(preview.events?.items??[]).filter(item=>item.endsAt>Date.now()).map(item=>item.endsAt-Date.now())];
      if(expiries.length)this.#locationTimer=setTimeout(()=>{if(valid())void this.refresh();},Math.min(2147483647,Math.max(1,Math.min(...expiries))));
    }catch(error){
      if(!valid())return;this.#busy=false;this.#body.style.minHeight='';this.#body.replaceChildren(note(error instanceof CloudError&&[401,403,404].includes(error.status)?'This preview is unavailable. Refresh or return to your profile.':'The preview could not load. Try Refresh preview.'));
    }
  }
  #render(preview:Preview):void {
    if(!preview.available){this.#body.replaceChildren(note('Your profile is not published. Other members cannot view it.'));this.#body.style.minHeight='';return;}
    const profile=preview.profile,avatar=element('div',{className:'kl-avatar kl-addon-profile-avatar',text:[...profile.displayName.trim()][0]?.toLocaleUpperCase()||'?'});
    if(imageId(profile.avatarId))avatar.replaceChildren(this.options.image(profile.avatarId,'avatar'));applyAvatarAppearance(avatar,profile);
    const banner=element('div',{className:'kl-addon-profile-banner'});banner.dataset.bannerState=imageId(profile.bannerId)?'image':'default';if(imageId(profile.bannerId))banner.append(this.options.image(profile.bannerId,'banner'));
    const badges=profileIdentityBadges(profile,profile.memberNumber);
    const handle=element('div',{className:'kl-addon-profile-handle'},...profile.username?[element('span',{className:'kl-addon-profile-username',text:'@'+profile.username})]:[],element('span',{className:'kl-addon-profile-member',text:`#${profile.memberNumber}`}));
    const identity=element('div',{className:'kl-addon-profile-identity'},profileIdentityName(profile.displayName,profile.memberNumber),handle,badges,
      element('div',{className:'kl-addon-profile-status'},element('strong',{text:preview.online==='private'?'Online status: private':'Online status: depends on the visitor’s access'}),...!profile.aboutHidden&&profile.statusMessage?[element('span',{className:'kl-addon-profile-custom-status',text:profile.statusMessage})]:[]));
    const avatarShell=element('div',{className:'kl-addon-profile-avatar-shell'},avatar);avatarShell.dataset.frame='none';avatarShell.dataset.avatarShape='circle';
    const hero=element('section',{className:'kl-addon-profile-hero'},banner,avatarShell,identity);
    const fact=(label:string,value:string,icon:'door'|'lock'|'clock'|'heart')=>element('div',{className:'kl-addon-profile-fact'},kikiIcon(icon,'kl-icon',icon==='heart'),element('span',{text:label}),element('strong',{text:value}));
    const facts=element('div',{className:'kl-addon-profile-facts'},fact('Current room',preview.location.room?.name||'Not shared',preview.location.room?'door':'lock'),fact('Last seen',preview.online==='private'?'Private':'Depends on visitor','clock'),fact('Compatibility','Depends on visitor','heart'));
    const preferences=element('section',{className:'kl-profile-view-as-preferences'});
    if(preview.preferences.state==='shared'){
      preferences.append(element('header',{className:'kl-profile-section-heading'},element('h3',{text:'Preferences'})));
      const token=this.#token,member=this.client.memberNumber,audience=this.#audience,ratings=normalizePreferenceRatings(preview.preferences.ratings);
      const query=element('input',{type:'search',ariaLabel:'Search shared preferences',placeholder:'Find a preference…',maxLength:80,value:this.#preferenceQuery});
      const category=element('select',{ariaLabel:'Preference category'},element('option',{value:'',text:'All categories'}),...PREFERENCE_CATEGORIES.map(value=>element('option',{value,text:value})));category.value=this.#preferenceCategory;
      const valid=()=>this.#visible&&this.options.current()&&this.client.connected&&this.client.memberNumber===member&&this.#token===token&&this.#audience===audience&&preferences.isConnected;
      const render=()=>{
        const list=element('div',{className:'kl-profile-rating-list'}),groups=new Map<string,HTMLElement>();
        for(const item of catalog.items){const rating=ratings[item.id];if(!rating||category.value&&item.category!==category.value||!preferenceMatchesSearch(item,query.value))continue;let group=groups.get(item.category);if(!group){group=element('section',{className:'kl-profile-rating-group'},element('h3',{text:item.category}));groups.set(item.category,group);list.append(group);}group.append(element('div',{className:'kl-profile-rating'},element('strong',{text:item.label}),element('span',{className:`kl-profile-rating-value kl-profile-rating--${rating}`,text:PREFERENCE_LEVEL_LABELS[rating]})));}
        if(!groups.size){
          const hasRatings=Object.keys(ratings).length>0;
          const empty=element('div',{className:'kl-profile-ratings-empty'},kikiIcon('heart'),element('strong',{text:hasRatings?'No matching preferences':'No preferences have been rated yet.'}));
          if(hasRatings){
            const clear=element('button',{type:'button',className:'kl-text-button',text:'Clear preference filters'});
            clear.addEventListener('click',()=>{if(!valid())return;query.value='';category.value='';this.#preferenceQuery='';this.#preferenceCategory='';render();query.focus({preventScroll:true});});
            empty.append(note('Try a different word or category.'),clear);
          }
          list.append(empty);
        }
        const current=preferences.querySelector('.kl-profile-rating-list');if(current)current.replaceWith(list);else preferences.append(list);
      };
      query.addEventListener('input',()=>{if(valid()){this.#preferenceQuery=query.value;render();}});query.addEventListener('keydown',event=>event.stopPropagation());
      category.addEventListener('change',()=>{if(valid()){this.#preferenceCategory=category.value;render();}});
      preferences.append(element('div',{className:'kl-profile-preference-filters'},searchField(query),category));render();
    }else if(preview.preferences.state==='private')preferences.append(profilePreferencesLocked('kl-profile-view-as-locked','Preferences are private for this audience.',this.#button('Return to your view',()=>this.options.done())));
    else preferences.append(note('Only compatibility may be shared. Individual ratings are hidden.'));
    const viewCommunities=this.#button('View all',()=>sections.select('communities',true));
    const about=this.#about(profile,preview.communities,viewCommunities);
    const communities=preview.communities.state==='private'
      ?this.#locked('Communities are private')
      :section('Your communities','kl-profile-communities',this.#communityList(preview.communities.items,'No visible communities yet.'));
    if(preview.communities.state==='shared'&&preview.communities.nextCursor)communities.append(previewLimit('communities'));
    const events=this.#events(preview.events);
    const creations=this.#creations(preview.creations);
    const activity=preview.activity.state==='private'
      ?this.#locked('Activity is private')
      :section('Recent activity','kl-profile-activity',...preview.activity.items.length?preview.activity.items.map(item=>profileActivityRow(item)):[note('No recent activity shared yet.')]);
    if(preview.activity.state==='shared'&&preview.activity.nextCursor)activity.append(previewLimit('activity entries'));
    const coverLoads:Array<()=>void>=[],albums=this.#albums(preview.albums,coverLoads);
    const loadCovers=()=>{if(albums.isConnected)for(const load of coverLoads.splice(0))load();};
    const sections=new ProfileSections([
      {id:'about',label:'About',content:[about]},{id:'preferences',label:'Preferences',content:[preferences]},
      {id:'communities',label:'Communities',content:[communities]},{id:'events',label:'Events',content:[events]},
      {id:'creations',label:'Creations',content:[creations]},{id:'albums',label:'Albums',content:[albums]},
      {id:'activity',label:'Activity',content:[activity]},
    ],id=>{
      this.#section=id;
      if(id==='albums')loadCovers();else this.#closeAlbum?.(false);
      this.options.section?.(id);
    },{namespace:'preview-profile',initial:this.#section});
    const card=element('article',{className:'kl-addon-profile-card'},element('div',{className:'kl-profile-summary'},hero,facts),sections.element);card.dataset.previewAudience=preview.audience;card.dataset.memberNumber=String(profile.memberNumber);card.dataset.profileOwner='false';
    applyProfileAppearance(card,{profileStyle:profile.profileStyle,...profile.profileOutlineColor?{profileOutlineColor:profile.profileOutlineColor}:{},...profile.profileGradient?{profileGradient:{enabled:profile.profileGradient.enabled!==false,primary:profile.profileGradient.start,secondary:profile.profileGradient.end,angle:profile.profileGradient.angle??135}}:{}});
    const sectionFocus=this.#sectionFocus;this.#sectionFocus=undefined;
    this.#body.replaceChildren(card);
    sections.scrollActiveTabIntoView();
    if(this.#section==='albums')loadCovers();
    this.#body.style.minHeight='';
    const active=focusedElement(this.#body),doc=this.element.ownerDocument,root=this.element.getRootNode();
    if(sectionFocus&&(!active||active===doc.body)&&
      (doc.activeElement===doc.body||root instanceof ShadowRoot&&doc.activeElement===root.host))
      [...sections.tabs.querySelectorAll<HTMLButtonElement>('button')].find(tab=>tab.getAttribute('aria-controls')===sectionFocus)?.focus({preventScroll:true});
  }
  #locked(title:string):HTMLElement {
    return profileSectionLocked('kl-profile-view-as-locked',title,`${title} for this audience.`,this.#button('Return to your view',()=>this.options.done()));
  }
  #communityList(items:ProfileCommunitySummary[],empty:string):HTMLElement {
    return items.length?element('div',{className:'kl-profile-community-list'},...items.map(item=>profileCommunityRow(item))):note(empty);
  }
  #about(profile:CloudProfile,communities:Preview['communities'],viewAll:HTMLButtonElement):HTMLElement {
    if(profile.aboutHidden)return this.#locked('About is private');
    const details=element('dl',{className:'kl-profile-details'});
    appendProfileDetails(details,profile);
    return element('div',{className:'kl-profile-overview'},
      section('About','kl-profile-overview-section',note(profile.bio||'No bio yet.'),element('div',{className:'kl-platform-profile-tags'},...(profile.publicTags??[]).map(text=>element('span',{text})))),
      section('Details','kl-profile-overview-section',details),
      element('section',{className:'kl-profile-overview-section kl-profile-communities'},heading('Your communities',viewAll),
        this.#communityList(communities.state==='shared'?communities.items.slice(0,3):[],'No shared communities to show.')),
      section('Friends','kl-profile-overview-section kl-profile-friends',note('Mutual friends depend on who views your profile.')));
  }
  #events(data:Preview['events']):HTMLElement {
    if(data?.state==='private')return this.#locked('Events are private');
    const events=section('Upcoming events','kl-profile-events');
    if(!data){events.append(note('Profile events will be available after the pending Cloud update.'));return events;}
    const rows=data.items.filter(item=>item.endsAt>Date.now()).map(item=>profileEventCard(item));
    events.append(...rows.length?rows:[note('No upcoming events shared here yet.')]);
    if(data.nextCursor)events.append(previewLimit('upcoming events'));
    return events;
  }
  #creations(data:Preview['creations']):HTMLElement {
    if(data?.state==='private')return this.#locked('Creations are private');
    const creations=section('From the Workshop','kl-profile-creations');
    if(!data){creations.append(note('Profile creations will be available after the pending Cloud update.'));return creations;}
    creations.append(...data.items.length?data.items.map(item=>profileCreationRow(item)):[note('No public Workshop creations yet.')]);
    if(data.nextCursor)creations.append(previewLimit('creations'));
    return creations;
  }
  #albums(data:Preview['albums'],coverLoads:Array<()=>void>):HTMLElement {
    if(data.state==='private')return this.#locked('Albums are private');
    const heading=element('header',{className:'kl-al-heading'},element('h2',{text:'Photo albums'}));
    const albums=element('section',{className:'kl-albums kl-albums--profile',ariaLabel:'Photo albums'});
    const grid=element('div',{className:'kl-al-grid'});
    for(const album of data.items){
      const opener=this.#button('Open album',()=>this.#showAlbum(album,opener,albums));
      opener.setAttribute('aria-label',`Open ${album.title}`);
      const cover=this.#button('',()=>this.#showAlbum(album,cover,albums));
      cover.className='kl-al-placeholder';cover.setAttribute('aria-label',`Open ${album.title} cover`);
      const first=album.refs[0];
      cover.append(kikiIcon(first?.spoiler?'eye-off':'image'),element('span',{text:first?.spoiler?'Hidden image':first?'Open album':'No images yet'}));
      if(first&&!first.spoiler&&this.options.albumCover)coverLoads.push(()=>{
        const preview=this.options.albumCover?.(first.id,album.title,button=>this.#showAlbum(album,button,albums));
        if(preview)cover.replaceWith(element('div',{className:'kl-al-image'},preview));
      });
      grid.append(albumCard(album,cover,'Follows profile album audience',opener));
    }
    const empty=element('div',{className:'kl-al-empty'},kikiIcon('image'),element('h3',{text:'No photo albums yet'}),element('p',{text:'Photos shared here will appear as albums.'}));
    albums.append(element('div',{className:'kl-al-content'},heading,data.items.length?grid:empty));
    return albums;
  }
  #showAlbum(album:PreviewAlbum,opener:HTMLElement,container:HTMLElement):void {
    if(!this.#visible||!this.options.current()||!this.client.connected||this.#section!=='albums'||!opener.isConnected||!this.#body.contains(container)||this.#closeAlbum)return;
    const dialog=element('dialog',{className:'kl-al-view-dialog',ariaLabel:'Photo album'});
    const scroller=this.element.closest<HTMLElement>('.kl-addon-profile-body'),scrollTop=scroller?.scrollTop??0;
    let release:(()=>void)|undefined;
    const close=(restoreFocus:boolean)=>{
      if(this.#closeAlbum!==close)return;
      this.#closeAlbum=undefined;this.options.closeAlbumImages?.();release?.();dialog.close();dialog.remove();
      if(restoreFocus&&opener.isConnected){opener.focus({preventScroll:true});if(scroller)scroller.scrollTop=scrollTop;}
    };
    const closeIcon=this.#button('',()=>close(true));
    closeIcon.className='kl-icon-button';closeIcon.setAttribute('aria-label','Close album viewer');closeIcon.append(kikiIcon('close'));
    const closeButton=this.#button('Close',()=>close(true));
    const head=element('header',{className:'kl-al-view-heading'},element('div',{},element('span',{className:'kl-al-kicker',text:'KikiLink'}),element('h2',{text:album.title})),closeIcon);
    const body=element('div',{className:'kl-al-view-body'},element('p',{className:'kl-al-view-description',text:album.description||'A little collection of moments.'}));
    if(album.refs.length)body.append(element('div',{className:'kl-al-photos'},...album.refs.map(ref=>this.#photo(ref,dialog))));
    else body.append(element('div',{className:'kl-al-empty'},element('h3',{text:'This album is waiting for its first image'}),element('p',{text:'Photos will appear here when they are added.'})));
    dialog.append(element('div',{className:'kl-al-view-content'},head,body,element('footer',{className:'kl-al-actions kl-al-view-actions'},closeButton)));
    dialog.addEventListener('cancel',event=>{event.preventDefault();close(true);});
    dialog.addEventListener('close',()=>close(true),{once:true});
    dialog.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close(true);}});
    container.append(dialog);this.#closeAlbum=close;dialog.showModal();release=fitPanelDialog(dialog);closeButton.focus();
  }
  #photo(ref:AlbumRef,dialog:HTMLDialogElement):HTMLElement {
    const image=element('div',{className:'kl-al-image'}),figure=element('figure',{},image);
    const show=()=>{image.replaceChildren(this.options.image(ref.id,'album'));if(ref.caption)figure.append(element('figcaption',{text:ref.caption}));};
    if(ref.spoiler)image.append(this.#button('Show spoiler photo',()=>{if(dialog.open&&this.client.connected)show();}));
    else show();
    return figure;
  }
}
