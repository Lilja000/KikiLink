import {CommunityEditIntent,type CommunityEditSource} from '../../cloud/community-edit-intent';
import {checkedCommunityTemplate,checkedInitialCommunityChannels,type CommunityTemplateChannel} from '../../../cloud/shared/community-template.mjs';
import { CloudError, type CloudClient } from '../../cloud/client';
import { element, focusedElement } from '../../utils/dom';
import { iconButton } from './browse-controls';
import { COMMUNITY_COLORS, COMMUNITY_ICONS, communityIcon, communityTags, type CommunityDesign } from './community-design';
import { kikiIcon } from '../link-chat/icons';
import { fitPanelDialog } from './panel-dialog-layout';

export interface EditableCommunity extends CommunityDesign {
  id:string; name:string; description:string; language:string; access:'public'|'request'|'private';
  discoverable:boolean; invitationPermission:'admins'|'members'; rules:string[]; revision:number;
  canManage:boolean; archived:boolean; membership:string; restricted?:boolean; memberCount?:number;
  role?:'owner'|'admin'|'moderator'|'member'|null;
}
export type CommunityManagerSection = 'members'|'invitations'|'requests'|'ownership'|'archive';
export type CommunityManagerTab = 'settings'|CommunityManagerSection;
export interface CommunityManagerNavigation {
  initial:'settings'|'archive';
  sections:readonly {id:CommunityManagerTab; label:string}[];
  select(section:CommunityManagerTab):void;
  panel(section:CommunityManagerSection):{body:HTMLElement;action?:HTMLElement};
  permitted(section:CommunityManagerTab):boolean;
  dirty():boolean;
  returnFocus():HTMLElement|null;
}
const roleLabel={owner:'Owner',admin:'Administrator',moderator:'Moderator',member:'Member'};
type Draft = Record<'name'|'description'|'language'|'access'|'discoverable'|'invitationPermission'|'rules'|'icon'|'color'|'tags'|'announcement',string>;
const draftOf = (c?:EditableCommunity):Draft => ({name:c?.name??'',description:c?.description??'',language:c?.language??'English',access:c?.access??'public',discoverable:String(c?.discoverable??true),invitationPermission:c?.invitationPermission??'admins',rules:c?.rules.join('\n')??'',icon:c?.icon??'users',color:c?.color??'rose',tags:c?.tags?.join(', ')??'',announcement:c?.announcement??''});
const tagsOf=(d:Draft)=>d.tags.split(',').map(t=>t.trim()).filter(Boolean);
const rulesOf=(d:Draft)=>d.rules.split('\n').map(t=>t.trim()).filter(Boolean);
const accessLabel=(v:string)=>v==='public'?'Public':v==='request'?'Request only':'Private';

/** Account-bound editor. A lost response freezes the exact operation until retry. */
export class CommunityEditor {
  readonly element=element('dialog',{className:'kl-cm-design-dialog'});
  #draft:Draft|undefined;#baseline='';#original:EditableCommunity|undefined;#latest:EditableCommunity|undefined;
  #initialChannels:CommunityTemplateChannel[]|undefined;#templateSource:string|undefined;
  #step=1;#error='';#discard=false;#busy=false;#epoch=0;
  #colorOptionsOpen=false;#additionalOpen=false;
  #intent:CommunityEditIntent|undefined;#accessHold=false;#returnFocus:HTMLElement|undefined;
  #manager:CommunityManagerNavigation|undefined;
  #managerTab:CommunityManagerTab='settings';
  #managerReturnFocus:CommunityManagerNavigation['returnFocus']|undefined;
  #afterDiscard:(()=>void)|undefined;
  #saveStatus='';
  readonly #owner:number;readonly #origin:string;
  get #pending():Readonly<Record<string,unknown>>|undefined{return this.#intent?.pending;}
  get #held():boolean{return this.#accessHold||!!this.#intent?.held;}
  get busy():boolean{return this.#busy;}
  get unfinished():boolean{return !!this.#draft&&this.#identity();}
  #identity():boolean{return this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
  constructor(readonly client:CloudClient,readonly options:{current:()=>boolean;saved:(id:string)=>void;updated?:()=>void;failed:(message:string)=>void;changed?:()=>void}) {
    this.#owner=client.memberNumber;this.#origin=client.origin;
    this.element.addEventListener('keydown',e=>e.stopPropagation());
    this.element.addEventListener('cancel',e=>{e.preventDefault();this.#requestClose();});
    this.element.addEventListener('close',()=>{
      if(this.active)return;
      const target=this.#returnFocus?.isConnected?this.#returnFocus:this.#managerReturnFocus?.();
      target?.focus({preventScroll:true});
    });
  }
  get active():boolean{return this.element.open;}
  get managing():boolean{return this.active&&!!this.#manager;}
  get managerTab():CommunityManagerTab|undefined{return this.managing&&!this.#held?this.#managerTab:undefined;}
  open(c?:EditableCommunity,focusField:keyof Draft='name',source:CommunityEditSource={required:false},manager?:CommunityManagerNavigation):void {
    if(!this.#identity()||!this.options.current()||c&&(!c.canManage||c.restricted||c.membership!=='active'||c.archived&&!(c.role==='owner'&&manager?.initial==='archive')))return;
    if(this.unfinished){this.resume();return;}
    this.close();this.#intent=new CommunityEditIntent(this.client,{method:c?'PUT':'POST',path:c?`/v1/communities/${c.id}`:'/v1/communities',communityId:c?.id,revision:c?.revision},source);this.#returnFocus=focusedElement(this.element);this.#original=c?structuredClone(c):undefined;this.#draft=draftOf(c);this.#baseline=JSON.stringify(this.#draft);this.#step=1;
    this.#manager=c?manager:undefined;
    this.#managerReturnFocus=this.#manager?.returnFocus;
    this.#additionalOpen=!!this.#manager&&focusField==='announcement';
    if(this.#manager?.initial==='archive')this.#activateManagerTab('archive');
    this.#render();this.#show();
    if(this.#managerTab==='archive'){this.refreshManagerPanel();this.#focusManagerTab();}
    else this.element.querySelector<HTMLInputElement>(`[data-community-field="${focusField}"]`)?.focus();
  }
  openTemplate(value:unknown,sourceTitle:string,source:CommunityEditSource={required:false}):void {
    if(!this.#identity()||!this.options.current()||this.unfinished)throw new Error('Finish or discard your current community draft first.');
    const payload=checkedCommunityTemplate(value);this.open(undefined,'name',source);
    this.#draft={...draftOf(),name:payload.name,description:payload.description,tags:payload.tags.join(', '),rules:payload.rules.join('\n'),access:payload.visibility==='Public'?'public':payload.visibility==='Private'?'private':'request',discoverable:String(payload.visibility!=='Private')};
    this.#initialChannels=payload.channels;this.#templateSource=sourceTitle;this.#render();this.element.querySelector<HTMLInputElement>('[data-community-field="name"]')?.focus();
  }
  close():void {++this.#epoch;this.#initialChannels=undefined;this.#templateSource=undefined;this.#draft=undefined;this.#original=undefined;this.#latest=undefined;this.#intent=undefined;this.#accessHold=false;this.#busy=false;this.#error='';this.#discard=false;this.#colorOptionsOpen=false;this.#additionalOpen=false;this.#resetManagerTab();this.#manager=undefined;this.#afterDiscard=undefined;this.#saveStatus='';if(this.element.open)this.element.close();this.element.replaceChildren();}
  observe(source:CommunityEditSource):void{const held=this.#held;this.#intent?.observe(source);if(!held&&this.#held&&this.active)this.#render();}
  hold():void{if(this.#draft){this.#intent?.hold();if(this.active)this.#render();}}
  hide():void{
    if(this.#manager&&!this.#dirty&&!this.#pending){this.close();this.options.changed?.();return;}
    ++this.#epoch;this.#afterDiscard=undefined;this.#discard=false;this.#resetManagerTab();if(this.element.open)this.element.close();this.element.replaceChildren();this.options.changed?.();
  }
  resume():void{if(!this.unfinished||!this.options.current())return;this.#render();if(!this.element.open)this.#show();}
  refreshManagerPanel():void {
    if(this.managing&&this.#managerTab!=='settings')this.#render();
  }
  selectManagerTab(section:CommunityManagerTab):void {
    if(this.managing)this.#switchManagerTab(section);
  }
  canActInManager(section:CommunityManagerSection):boolean {
    return this.managerTab===section&&!this.#discard&&!this.#busy;
  }
  leaveManager(run:()=>void):void {
    if(this.managing)this.#requestClose(run);
  }
  #show(): void {
    this.element.showModal();
    fitPanelDialog(this.element);
  }
  sync(c:EditableCommunity,source?:CommunityEditSource):void {
    if(this.#original?.id!==c.id)return;
    if(source)this.#intent?.observe(source);
    const manager=this.#manager;
    if(!c.canManage||c.restricted||c.membership!=='active'||c.archived&&!(c.role==='owner'&&manager&&!this.#dirty&&!this.#pending))this.#accessLost();
    else if(this.#held&&this.active)this.#render();
    else if(this.#manager&&!this.#held&&!this.#busy&&!this.#latest&&!this.#pending&&!this.#dirty&&c.revision>=this.#original.revision){
      const previous=this.#original;
      const next=draftOf(c),baseline=JSON.stringify(next);
      const changed=baseline!==this.#baseline||c.revision>previous.revision||c.role!==previous.role||c.memberCount!==previous.memberCount||c.archived!==previous.archived;
      if(!changed)return;
      this.#original=structuredClone(c);this.#draft=next;this.#baseline=baseline;
      if(c.revision>previous.revision)this.#intent=this.#intent?.revised(c.revision);
      const lostOwner=previous.role==='owner'&&c.role!=='owner'&&(this.#managerTab==='ownership'||this.#managerTab==='archive');
      const fallback=manager&&(!manager.permitted(this.#managerTab)||lostOwner);
      if(fallback)this.#activateManagerTab(c.archived?'archive':'settings');
      if(this.active){this.#render();if(fallback)this.#focusManagerTab();}
    }
  }
  #accessLost():void{this.#accessHold=true;this.#error='Community editing is no longer available with your current access. Your draft is kept for copying or explicit discard.';if(this.active)this.#render();this.options.failed(this.#error);}
  #valid(epoch:number):boolean{return epoch===this.#epoch&&!!this.#draft&&this.#identity()&&this.element.isConnected&&this.active&&this.options.current();}
  #button(action:string,text:string,run:()=>void,primary=false):HTMLButtonElement {
    const b=element('button',{type:'button',className:`kl-text-button${primary?' kl-text-button--primary':''}`,text,onClick:()=>{if(b.isConnected&&this.#valid(this.#epoch)&&!this.#busy&&!b.disabled)run();}});b.dataset.communityAction=action;b.disabled=this.#busy;return b;
  }
  get #dirty():boolean{return !!this.#draft&&JSON.stringify(this.#draft)!==this.#baseline;}
  #guardTransition(transition:()=>void):void {
    if(!this.#valid(this.#epoch)||this.#busy)return;
    if(this.#pending||this.#templateSource||this.#dirty||this.#manager?.dirty()){this.#afterDiscard=transition;this.#discard=true;this.#render();this.element.querySelector<HTMLButtonElement>('[data-community-action="keep-editing"]')?.focus();}
    else transition();
  }
  #requestClose(afterClose?:()=>void):void {
    this.#guardTransition(()=>{this.close();this.options.changed?.();afterClose?.();});
  }
  #resetManagerTab():void {
    if(this.#managerTab==='settings')return;
    this.#activateManagerTab('settings');
  }
  #activateManagerTab(section:CommunityManagerTab):void {
    this.#managerTab=section;
    this.#manager?.select(section);
  }
  #focusManagerTab():void {
    this.element.querySelector<HTMLButtonElement>(`[data-community-action="manager-${this.#managerTab}"]`)?.focus({preventScroll:true});
  }
  #switchManagerTab(section:CommunityManagerTab):void {
    const manager=this.#manager;
    if(!manager||section===this.#managerTab||this.#held||!manager.permitted(section))return;
    this.#guardTransition(()=>{
      if(this.#held||!manager.permitted(section))return;
      if(this.#pending||this.#dirty){
        const original=this.#latest??this.#original!;
        this.#intent=this.#intent?.revised(original.revision);
        this.#original=original;
        this.#draft=draftOf(original);
        this.#baseline=JSON.stringify(this.#draft);
        this.#latest=undefined;
        this.#error='';
        this.#saveStatus='';
      }
      this.#activateManagerTab(section);
      this.#render();
      const body=this.element.querySelector<HTMLElement>('.kl-cm-design-body');
      if(body)body.scrollTop=0;
      this.#focusManagerTab();
    });
  }
  #validate():boolean {
    const d=this.#draft!,tags=tagsOf(d),rules=rulesOf(d);
    this.#error=!d.name.trim()?'Enter a community name.':!d.language.trim()?'Enter a primary language.':
      tags.length>3||tags.some(t=>t.length>28)?'Use up to 3 tags, with 28 characters each.':new Set(tags.map(t=>t.toLowerCase())).size!==tags.length?'Use distinct tags.':
      rules.length>8||rules.some(r=>r.length>180)?'Use up to 8 rules, with 180 characters each.':d.announcement.length>400?'Keep the announcement within 400 characters.':'';
    if(!this.#error&&this.#initialChannels)try{checkedInitialCommunityChannels(this.#initialChannels);}catch(e){this.#error=(e as Error).message;}
    if(this.#error){this.#render();return false;}return true;
  }
  #field(root:HTMLElement,key:keyof Draft,label:string,max:number,options?:Record<string,string>,multiline=false,hint=''):void {
    const input=options?element('select'):multiline?element('textarea'):element('input');input.dataset.communityField=key;input.setAttribute('aria-label',label);
    if(options)for(const[value,text]of Object.entries(options)){const o=element('option',{text});o.value=value;input.append(o);}
    if(input instanceof HTMLInputElement||input instanceof HTMLTextAreaElement){input.maxLength=max;if(input instanceof HTMLInputElement)input.type='text';else input.rows=key==='rules'?(this.#manager?5:4):3;}
    if(this.#manager&&input instanceof HTMLInputElement&&['name','language'].includes(key))input.required=true;
    input.value=this.#draft![key];input.disabled=this.#busy||(input instanceof HTMLSelectElement&&(!!this.#pending||!!this.#latest||this.#held));if(input instanceof HTMLInputElement||input instanceof HTMLTextAreaElement)input.readOnly=!!this.#pending||!!this.#latest||this.#held;
    const counter=element('small',{className:'kl-cm-field-note'}),draft=this.#draft!;
    counter.textContent=hint||(!options?`${input.value.length}/${max}`:'');
    const update=()=>{if(!input.isConnected||!this.#valid(this.#epoch)||this.#draft!==draft||this.#busy||this.#pending||this.#latest||this.#held)return;draft[key]=input.value;counter.textContent=hint||(!options?`${input.value.length}/${max}`:'');this.#saveStatus='';this.#updateManagerStatus();};
    input.addEventListener('input',update);input.addEventListener('change',update);
    const title=element('span',{className:'kl-cm-field-label',text:label});
    const field=element('label',{className:!this.#original&&['name','description'].includes(key)?'wide':''},title,input);
    if(!this.#original&&this.#step===1){
      if(key==='name'){input.required=true;title.append(' ',element('span',{className:'kl-muted',text:'(required)'}));input.setAttribute('placeholder','Give your people a place');field.append(element('div',{className:'kl-cm-field-meta'},element('span'),counter));}
      else if(key==='description'){input.setAttribute('placeholder','What brings this community together?');counter.classList.add('kl-cm-field-count');field.append(counter);}
      else if(key==='tags'){input.setAttribute('placeholder','Social, cozy, creativity');field.append(counter);}
    }else if(!this.#manager||counter.textContent&&key!=='language'){
      if(this.#manager&&['name','description'].includes(key))counter.classList.add('kl-cm-manager-count');
      if(this.#original||counter.textContent)field.append(counter);
    }
    root.append(field);
  }
  #basics(root:HTMLElement):void {
    const d=this.#draft!,creating=!this.#original,form=creating?element('div',{className:'kl-cm-form-grid'}):root;
    if(creating)root.append(form);
    const choices=element('fieldset',{className:'kl-cm-choices'},element('legend',{text:'Community icon'}));
    COMMUNITY_ICONS.forEach((icon,index)=>{const b=this.#button(`icon-${icon}`, '',()=>{d.icon=icon;if(creating)d.color=COMMUNITY_COLORS[index]!;this.#saveStatus='';this.#render();});b.append(communityIcon({icon,color:creating?(d.icon===icon?d.color:COMMUNITY_COLORS[index]!):d.color}));b.setAttribute('aria-label',`${icon} icon`);b.setAttribute('aria-pressed',String(d.icon===icon));b.disabled ||=!!this.#pending||!!this.#latest||this.#held;choices.append(b);});
    const colors=element('fieldset',{className:'kl-cm-choices kl-cm-colors'},element('legend',{text:'Color'}));
    for(const color of COMMUNITY_COLORS){const b=this.#button(`color-${color}`,'',()=>{d.color=color;this.#saveStatus='';this.#render();});b.classList.add('kl-cm-emblem',`kl-cm-color-${color}`);b.append(element('span',{text:'●'}));b.setAttribute('aria-label',`${color} color`);b.setAttribute('aria-pressed',String(d.color===color));b.disabled ||=!!this.#pending||!!this.#latest||this.#held;colors.append(b);}
    if(creating){
      const extra=element('details',{className:'kl-cm-color-options'},element('summary',{text:'Customize icon color'}),colors);extra.open=this.#colorOptionsOpen;
      extra.addEventListener('toggle',()=>{if(extra.isConnected&&this.#draft===d)this.#colorOptionsOpen=extra.open;});
      form.append(element('div',{className:'kl-cm-icon-field wide'},choices,extra));
    }else form.append(choices,colors);
    if(!this.#manager){this.#field(form,'name','Community name',64);this.#field(form,'description','Short description',180,undefined,true);}
    this.#field(form,'tags','Tags',90,undefined,false,'Up to 3 tags, separated by commas.');
    if(!this.#manager)this.#field(form,'language','Primary language',40);
  }
  #access(root:HTMLElement):void {
    const d=this.#draft!;
    if(this.#original){
      this.#field(root,'access','Access',0,{public:'Public — anyone can join',request:'Request only — approval required',private:'Private — invitation required'});
      this.#field(root,'discoverable','Show in discovery',0,{true:'Yes',false:'No'},false,'Shows the community card. Channels and announcements stay with members.');
      this.#field(root,'invitationPermission','Who can invite?',0,{admins:'Administrators only',members:'All members'});
      this.#field(root,'rules','Community rules',1447,undefined,true,'One rule per line. Up to 8 rules of 180 characters.');
      this.#field(root,'announcement','Announcement',400,undefined,true,'Shown to members in Overview. Leave empty to remove it.');
      if(this.#initialChannels)this.#channelFields(root);
      return;
    }
    const frozen=this.#busy||!!this.#pending||!!this.#latest||this.#held;
    const choices=element('fieldset',{className:'kl-cm-access-options'},element('legend',{text:'Who can join?'}));
    const discoveryNote=element('small',{text:d.access==='private'?'Show the name and description. An invitation is still required.':'Help people find your community in search.'});
    const options=[['public','Public','globe','Anyone can discover and join.'],['request','Request only','shield','People ask to join. Your team reviews requests.'],['private','Private','lock','An invitation is needed to join.']] as const;
    for(const[value,title,icon,copy]of options){
      const radio=element('input',{ariaLabel:title});radio.type='radio';radio.name='kl-community-access';radio.value=value;radio.disabled=frozen;radio.dataset.communityField='access';radio.checked=d.access===value;
      const option=element('label',{className:'kl-cm-access-option'},radio,kikiIcon(icon),element('span',{className:'kl-cm-access-copy'},element('strong',{text:title}),element('small',{text:copy})));
      option.classList.toggle('selected',radio.checked);
      radio.addEventListener('change',()=>{if(!radio.isConnected||!radio.checked||radio.disabled||!this.#valid(this.#epoch)||this.#draft!==d||this.#pending||this.#latest||this.#held)return;d.access=value;for(const row of choices.querySelectorAll('label'))row.classList.toggle('selected',!!row.querySelector('input')?.checked);discoveryNote.textContent=value==='private'?'Show the name and description. An invitation is still required.':'Help people find your community in search.';});
      choices.append(option);
    }
    const discovery=element('input',{ariaLabel:'Show in discovery'});discovery.type='checkbox';discovery.disabled=frozen;discovery.dataset.communityField='discoverable';discovery.checked=d.discoverable==='true';
    discovery.addEventListener('change',()=>{if(discovery.isConnected&&!discovery.disabled&&this.#valid(this.#epoch)&&this.#draft===d&&!this.#pending&&!this.#latest&&!this.#held)d.discoverable=String(discovery.checked);});
    root.append(choices,element('label',{className:'kl-cm-discover-field'},discovery,element('span',{},element('strong',{text:'Discoverable in Explore'}),discoveryNote)));
    this.#field(root,'invitationPermission','Who can invite people?',0,{admins:'Administrators only',members:'All members'});
    const extra=element('details',{className:'kl-cm-additional-settings'},element('summary',{text:'Additional community settings'})),fields=element('div',{className:'kl-cm-extra-fields'});extra.open=this.#additionalOpen;
    extra.addEventListener('toggle',()=>{if(extra.isConnected&&this.#draft===d)this.#additionalOpen=extra.open;});
    this.#field(fields,'rules','Community rules',1447,undefined,true,'One rule per line. Up to 8 rules of 180 characters.');
    this.#field(fields,'announcement','Announcement',400,undefined,true,'Shown to members in Overview. Leave empty to remove it.');
    if(this.#initialChannels)this.#channelFields(fields);
    extra.append(fields);root.append(extra);
  }
  #managerShell(body:HTMLElement,original:EditableCommunity):void {
    const manager=this.#manager!;
    const summary=element('section',{className:'kl-cm-manager-summary'},
      element('div',{},element('strong',{text:original.name}),element('small',{text:[accessLabel(original.access),original.archived?'Archived':'Active',
        typeof original.memberCount==='number'?`${original.memberCount} ${original.memberCount===1?'member':'members'}`:null].filter(Boolean).join(' · ')})));
    if(original.role)summary.append(element('span',{className:'kl-cm-role kl-cm-role--gold',text:roleLabel[original.role]}));
    const nav=element('nav',{className:'kl-cm-manager-nav',ariaLabel:'Community management sections'});
    for(const section of manager.sections){
      if(!manager.permitted(section.id))continue;
      const button=this.#button(`manager-${section.id}`,section.label,()=>this.#switchManagerTab(section.id));
      if(section.id===this.#managerTab)button.setAttribute('aria-current','page');
      button.disabled ||= this.#held||this.#discard;
      nav.append(button);
    }
    nav.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      const buttons=[...nav.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const index=buttons.indexOf(event.target as HTMLButtonElement);
      if(index<0)return;
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
        (index+(event.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;
      buttons[next]?.focus();
    });
    body.append(summary,nav);
  }
  #managerSettings(body:HTMLElement):void {
    const draft=this.#draft!;
    const fields=element('section',{className:'kl-cm-design-fields kl-cm-manager-panel',ariaLabel:'Settings'});
    const basics=element('div',{className:'kl-cm-manager-grid'});
    this.#field(basics,'name','Community name',64);this.#field(basics,'language','Primary language',40);
    fields.append(basics);this.#field(fields,'description','Short description',180,undefined,true);
    const access=element('div',{className:'kl-cm-manager-grid'});
    this.#field(access,'access','Access',0,{public:'Public',request:'Request only',private:'Private'},false,
      'Public: anyone can join. Request only: approval required. Private: invitation required.');
    this.#field(access,'invitationPermission','Who can invite?',0,{admins:'Administrators only',members:'All members'});
    const discovery=element('input',{ariaLabel:'Show in discovery'});discovery.type='checkbox';
    discovery.dataset.communityField='discoverable';discovery.checked=draft.discoverable==='true';
    discovery.disabled=this.#busy||!!this.#pending||!!this.#latest||this.#held;
    discovery.addEventListener('change',()=>{
      if(!discovery.isConnected||discovery.disabled||!this.#valid(this.#epoch)||this.#draft!==draft||this.#pending||this.#latest||this.#held)return;
      draft.discoverable=String(discovery.checked);this.#saveStatus='';this.#updateManagerStatus();
    });
    fields.append(access,element('label',{className:'kl-cm-manager-discovery'},discovery,
      element('span',{},element('strong',{text:'Show in discovery'}),
        element('small',{text:'Show the community card in Explore. Channels and announcements stay with members.'}))));
    this.#field(fields,'rules','Community rules',1447,undefined,true,'One rule per line. Up to 8 rules, 180 characters each.');
    const status=element('p',{className:'kl-cm-field-note kl-cm-manager-status'});status.setAttribute('role','status');fields.append(status);
    const additional=element('details',{className:'kl-cm-manager-customization'},element('summary',{text:'Customize community'}));
    additional.open=this.#additionalOpen;
    additional.addEventListener('toggle',()=>{if(additional.isConnected&&this.#draft===draft)this.#additionalOpen=additional.open;});
    const extras=element('div',{className:'kl-cm-extra-fields'});
    this.#basics(extras);this.#field(extras,'announcement','Announcement',400,undefined,true,'Shown to members in Overview. Leave empty to remove it.');
    additional.append(extras);fields.append(additional);
    body.append(fields);
  }
  #updateManagerStatus():void {
    if(!this.#manager||!this.#draft)return;
    const save=this.element.querySelector<HTMLButtonElement>('[data-community-action="save"]');
    const status=this.element.querySelector('.kl-cm-manager-status');
    const valid=!!this.#draft.name.trim()&&!!this.#draft.language.trim();
    if(save)save.disabled=this.#busy||!!this.#latest||this.#held||!this.#pending&&(!this.#dirty||!valid);
    if(status)status.textContent=this.#busy?'Saving settings…':this.#held?'Saving is unavailable.':this.#pending?'Retry to confirm the previous save.':this.#saveStatus||
      (valid?(this.#dirty?'Your changes apply when you save.':'Change a setting to enable Save.'):'Enter a community name and primary language.');
  }
  #channelFields(root:HTMLElement):void {
    const channels=this.#initialChannels!,frozen=this.#busy||!!this.#pending||this.#held;
    root.append(element('h3',{text:'Initial channels'}),element('p',{text:'Up to 8 channels for members. With no entries, a general channel will be created.'}));
    channels.forEach((channel,i)=>{
      const box=element('fieldset',{},element('legend',{text:`Channel ${i+1}`}));
      for(const key of ['name','description'] as const){const input=key==='name'?element('input'):element('textarea');input.value=channel[key];input.maxLength=key==='name'?32:160;input.disabled=this.#busy;input.readOnly=frozen;input.setAttribute('aria-label',`Initial channel ${i+1} ${key}`);input.dataset.initialChannel=`${i}-${key}`;input.addEventListener('input',()=>{if(input.isConnected&&this.#valid(this.#epoch)&&this.#initialChannels===channels&&!frozen)channel[key]=input.value;});box.append(element('label',{},element('span',{text:key==='name'?'Name':'Description'}),input));}
      const remove=this.#button(`remove-initial-channel-${i}`,'Remove channel',()=>{channels.splice(i,1);this.#render();});remove.disabled=frozen;box.append(remove);root.append(box);
    });
    if(channels.length<8){const add=this.#button('add-initial-channel','Add channel',()=>{channels.push({name:'',description:''});this.#render();this.element.querySelector<HTMLInputElement>(`[data-initial-channel="${channels.length-1}-name"]`)?.focus();});add.disabled=frozen;root.append(add);}
  }
  #review(root:HTMLElement,d:Draft):void {
    if(!this.#original)root.append(element('p',{className:'kl-cm-review-intro',text:'Here’s your new corner of KikiLink. Ready to make it yours?'}));
    const identity=element('div',{},element('h3',{text:d.name.trim()}),element('small',{className:'kl-cm-review-visibility'},kikiIcon(d.access==='public'?'globe':'lock'),accessLabel(d.access)));
    root.append(element('article',{className:'kl-cm-review'},element('div',{className:'kl-cm-card-top'},communityIcon({icon:d.icon,color:d.color}),identity,!this.#original?element('span',{className:'kl-cm-role kl-cm-role--gold',text:'Owner'}):null),element('p',{text:d.description||'A little place to call your own.'}),communityTags(tagsOf(d))));
    const details=element('dl',{className:'kl-cm-facts kl-cm-review-settings'});
    for(const[k,v]of[['Primary language',d.language],['Discoverable',d.discoverable==='true'?'Yes':'No · invitation link only'],['Can invite',d.invitationPermission==='admins'?'Administrators only':'All members'],...(!this.#original?[['Your role','Owner']]:[])])details.append(element('dt',{text:k!}),element('dd',{text:v!}));
    root.append(details);
    if(d.rules)root.append(element('h3',{text:'Community rules'}),element('ol',{},...rulesOf(d).map(text=>element('li',{text}))));
    if(this.#initialChannels){root.append(element('h3',{text:'Initial channels'}));for(const channel of this.#initialChannels.length?this.#initialChannels:[{name:'general',description:''}])root.append(element('p',{text:`# ${channel.name}${channel.description?` · ${channel.description}`:''}`}));}
    if(d.announcement)root.append(element('h3',{text:'Announcement'}),element('p',{text:d.announcement}));
    if(!this.#original)root.append(element('p',{className:'kl-cm-review-note',text:'Your community and these settings will be saved to Cloud.'}));
  }
  #render():void {
    if(!this.#draft)return;
    const focus=focusedElement(this.element),field=focus?.dataset.communityField,action=focus?.dataset.communityAction;
    const selection=(focus instanceof HTMLInputElement||focus instanceof HTMLTextAreaElement)&&focus.selectionStart!==null&&focus.selectionEnd!==null
      ?{start:focus.selectionStart,end:focus.selectionEnd,type:focus.type}:undefined;
    const scroll=this.element.querySelector('.kl-cm-design-body')?.scrollTop??0,d=this.#draft,editing=!!this.#original;
    const managing=!!this.#manager;
    const title=managing?'Community management':editing?'Community settings':'Create a community';this.element.setAttribute('aria-label',title);this.element.setAttribute('aria-busy',String(this.#busy));
    this.element.classList.toggle('kl-cm-design-create', !editing);
    this.element.classList.toggle('kl-cm-manager-dialog',managing);
    const close=iconButton(managing?'Close dialog':'Close community editor','close',()=>this.#requestClose());close.disabled=this.#busy;
    const form=element('form'),body=element('div',{className:'kl-cm-design-body'});
    form.append(element('header', {}, element('div', { className: 'kl-cm-design-title' },
      element('span', { text: editing ? 'KIKILINK' : 'A LITTLE PLACE OF YOUR OWN' }), element('h2', { text: title })), close), body);
    if (!editing) {
      const steps = element('ol', { className: 'kl-cm-steps', ariaLabel: 'Create community progress' });
      ['Basics', 'Access', 'Review'].forEach((name, index) => {
        const step = index + 1;
        const complete = step < this.#step;
        const marker = element('span', {}, complete ? kikiIcon('check') : String(step));
        marker.setAttribute('aria-hidden', 'true');
        const item = element('li', { className: complete ? 'kl-cm-step-done' : '' }, marker, name);
        if (step === this.#step) item.setAttribute('aria-current', 'step');
        steps.append(item);
      });
      body.append(steps);
    }
    if(this.#templateSource)body.append(element('p',{className:'kl-cm-field-note',text:`From template: ${this.#templateSource}. Edit this independent draft before creating the community.`}));
    const settings=!this.#manager||this.#managerTab==='settings';
    let managerAction:HTMLElement|undefined;
    if(this.#manager&&this.#original){
      this.#managerShell(body,this.#original);
      if(this.#managerTab==='settings')this.#managerSettings(body);
      else if(!this.#held&&this.#manager.permitted(this.#managerTab)){
        const panel=this.#manager.panel(this.#managerTab);
        body.append(panel.body);managerAction=panel.action;
      }
      else body.append(element('p',{className:'kl-cm-design-error',text:'This section is unavailable with your current access.'}));
    }
    else{
      const content=element('div',{className:'kl-cm-design-fields'});body.append(content);
      if(editing||this.#step===1)this.#basics(content);
      if(editing||this.#step===2)this.#access(content);
      if(!editing&&this.#step===3)this.#review(content,d);
    }
    if(this.#intent?.held)body.append(element('p',{className:'kl-cm-design-error',text:'This draft belongs to an earlier or unverified community state. Its fields are kept here. Discard it and reopen current information before starting a new save.'}));
    if(this.#error)body.append(element('p',{className:'kl-cm-design-error',text:this.#error}));
    if(this.#latest&&!this.#held){const latest=this.#latest;const conflict=element('section',{className:'kl-cm-conflict'},element('h3',{text:'This community changed'}),element('p',{text:'Review the latest version before choosing which changes to save.'}));
      const preview=element('details',{},element('summary',{text:'Latest saved version'}));this.#review(preview,draftOf(latest));conflict.append(preview,this.#button('use-latest','Use latest version',()=>{this.#intent=this.#intent!.revised(latest.revision);this.#original=structuredClone(latest);this.#draft=draftOf(latest);this.#baseline=JSON.stringify(this.#draft);this.#latest=undefined;this.#error='';this.#render();}),this.#button('keep-draft','Keep my draft',()=>{this.#intent=this.#intent!.revised(latest.revision);this.#original=structuredClone(latest);this.#baseline=JSON.stringify(draftOf(latest));this.#latest=undefined;this.#error='';this.#render();}));body.append(conflict);
    }
    const footer=element('footer');
    if(editing||this.#step===1)footer.append(this.#button('cancel-editor',managing?'Close':'Cancel',()=>this.#requestClose()));
    if(!editing&&this.#step>1){const back=this.#button('editor-back','Back',()=>{--this.#step;this.#render();});back.disabled ||=!!this.#pending;footer.append(back);}
    if (!editing) footer.append(element('span', { className: 'kl-cm-step-count', text: `Step ${this.#step} of 3` }));
    if(settings){
      const submit=this.#button(!editing&&this.#step<3?'editor-next':'save',this.#pending?'Retry save':!editing&&this.#step<3?'Continue':managing?'Save settings':editing?'Save changes':'Create community',()=>void this.#submit(),true);
      if (!editing && this.#step < 3) submit.append(kikiIcon('arrow-right'));
      submit.disabled ||=!!this.#latest||this.#held;footer.append(submit);
    }
    if(managerAction){if(managerAction instanceof HTMLButtonElement&&this.#discard)managerAction.disabled=true;footer.append(managerAction);}
    form.append(footer);
    if(this.#discard){const warning=element('section',{className:'kl-cm-discard'},element('h3',{text:'Discard your changes?'}),element('p',{text:this.#pending?'This save may already have completed. Discarding this local attempt cannot undo it.':'Your unsaved changes will be lost.'}),this.#button('keep-editing','Keep editing',()=>{this.#discard=false;this.#afterDiscard=undefined;this.#render();}),settings?this.#button('keep-editor-later','Close and keep',()=>this.hide()):null,this.#button('discard-editor','Discard changes',()=>{const next=this.#afterDiscard;this.#discard=false;this.#afterDiscard=undefined;next?.();if(this.active)this.#render();}));form.append(warning);}
    form.addEventListener('submit',e=>{e.preventDefault();if(settings&&form.isConnected)void this.#submit();});this.element.replaceChildren(form);
    this.#updateManagerStatus();
    const restored=field?this.element.querySelector<HTMLInputElement|HTMLTextAreaElement>(`[data-community-field="${field}"]`):action?this.element.querySelector<HTMLButtonElement>(`[data-community-action="${action}"]`):undefined;
    if(restored){restored.focus({preventScroll:true});if(selection&&(restored instanceof HTMLInputElement||restored instanceof HTMLTextAreaElement)&&restored.type===selection.type)restored.setSelectionRange(selection.start,selection.end);}body.scrollTop=scroll;
  }
  async #submit():Promise<void> {
    if(this.#busy||this.#latest||this.#held||!this.#draft||!this.#intent||this.#manager&&!this.#pending&&!this.#dirty||!this.#valid(this.#epoch)||!this.#validate())return;
    if(!this.#original&&this.#step<3){++this.#step;this.#render();this.element.querySelector<HTMLInputElement|HTMLSelectElement>('[data-community-field]')?.focus();return;}
    const d=this.#draft,original=this.#original,intent=this.#intent,epoch=this.#epoch,current=()=>this.#valid(epoch)&&this.#intent===intent;
    const body={...d,tags:tagsOf(d),rules:rulesOf(d),discoverable:d.discoverable==='true',...(!original&&this.#initialChannels?{initialChannels:structuredClone(this.#initialChannels)}:{})};
    this.#busy=true;this.#error='';this.#render();
    try {
      const receipt=await intent.send(body,current);if(!current()||!receipt)return;
      if(this.#initialChannels&&!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(receipt.communityId)){intent.hold();throw new Error('Invalid community receipt');}
      if(this.#manager&&original&&receipt.revision&&Number.isSafeInteger(receipt.revision)&&receipt.revision>original.revision){
        this.#intent=intent.revised(receipt.revision);
        this.#original={...original,...body,name:d.name.trim(),description:d.description.trim(),language:d.language.trim(),announcement:d.announcement.trim(),
          access:d.access as EditableCommunity['access'],invitationPermission:d.invitationPermission as EditableCommunity['invitationPermission'],revision:receipt.revision};
        this.#draft=draftOf(this.#original);this.#baseline=JSON.stringify(this.#draft);
        this.#busy=false;this.#saveStatus='Settings saved.';this.#render();this.options.updated?.();return;
      }
      this.close();this.options.saved(receipt.communityId);
    }catch(error){
      if(!current())return;
      if(error instanceof CloudError&&[401,403,404].includes(error.status)){this.#accessLost();return;}
      if(error instanceof CloudError&&error.code==='revision_conflict'&&original&&!intent.held){
        try{const latest=await intent.latest<EditableCommunity>(current);if(!latest||!current())return;if(latest.id!==original.id||!Number.isSafeInteger(latest.revision)){intent.hold();return;}if(!latest.canManage||latest.restricted||latest.archived||latest.membership!=='active'){this.#accessLost();return;}this.#latest=structuredClone(latest);this.#error='';}
        catch{if(current())this.#error='The latest version could not load. The original save and draft are kept.';}
      }else this.#error='The save could not be confirmed. Its original fields and operation are kept; retry when connected, or explicitly discard this attempt.';
    }finally{if(this.#intent===intent){this.#busy=false;if(current())this.#render();else this.options.changed?.();}}
  }
}
