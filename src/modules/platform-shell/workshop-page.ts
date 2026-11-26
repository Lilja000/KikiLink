import { focusPageResults, pageResult } from './page-result-focus';
import { pageAction } from './page-action';
import { bindSearchEscape } from "./browse-controls";
import { removableFilter } from './applied-filter';
import { preserveSelectionFocus } from "./browse-focus";
import { kikiIcon } from '../link-chat/icons';
import {workshopEngagementSource} from './workshop-engagement';
import {workshopSource,workshopAccessAt,requireWorkshopSource,type WorkshopSource} from './workshop-generation';
import {captureReportSource,type ReportSource} from '../../cloud/report-source';
import {extendedRoomDraft} from '../../../cloud/shared/room-contract.mjs';
import {WorkshopFeaturedPanel} from './workshop-featured';
import {WorkshopInstallSharing} from './workshop-install-sharing';
import {WorkshopInstallSharingPanel} from './workshop-install-sharing-panel';
import {WorkshopAutomaticSync,WorkshopSyncSettings} from './workshop-sync';
import {WorkshopSyncPanel} from './workshop-sync-panel';
import {WorkshopDraftCloud,WorkshopCloudDraftPanel} from './workshop-cloud-drafts';
import {WorkshopAutosave} from './workshop-autosave';
import {WorkshopOutbox,checkedWorkshopPendingSave,checkedWorkshopReceipt,workshopSaveLabel,type WorkshopPendingSave} from './workshop-outbox';
import {checkedWorkshopCatalog,type WorkshopCatalogPage} from './workshop-catalog';
import {WorkshopDrafts,type LocalWorkshopDraft} from './workshop-drafts';
import {WorkshopBookmarks,sortWorkshop,remixWorkshop,type WorkshopSort} from './workshop-discovery';
import {WorkshopReportDialog} from './workshop-report-dialog';
import {WorkshopReviews} from './workshop-reviews';
import {WorkshopInstalled,type WorkshopInstallationOptions} from './workshop-installed';
import {compareWorkshopVersions, WorkshopLibrary} from './workshop-installation-model';
import { CloudError, type CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { WorkshopEditor } from './workshop-editor';
import { workshopOverview } from './workshop-overview';
import { ShellActionMenu, type ShellAction } from './action-menu';
import { WORKSHOP_TYPES, checkedWorkshopDetail, checkedWorkshopPage, copyWorkshopDraft, newWorkshopDraft, nextWorkshopVersion, workshopCard, workshopTypePreview, workshopId, workshopNote as note, workshopPayloadView, type WorkshopDraft, type WorkshopDetail, type WorkshopPage as Page, type WorkshopRelease, type WorkshopSummary } from './workshop-model';

type WorkshopCardAction = 'install' | 'installed' | 'edit' | 'remix' | 'report';

export class WorkshopPage {
  readonly element=element('section',{className:'kl-workshop-page',hidden:true,ariaLabel:'Workshop'});
  readonly noticeArea = element('div', {className:'kl-workshop-notices'});
  readonly navigation=element('nav',{className:'kl-workshop-secondary-nav',ariaLabel:'Workshop sections'});
  readonly #member:number;readonly #origin:string;#source:WorkshopSource|undefined;readonly #reviewSources=new WeakMap<WorkshopDetail,WorkshopSource>();readonly #engagementSources=new WeakMap<WorkshopDetail,WorkshopSource>();
  readonly #installation:WorkshopInstalled|undefined;
  readonly #body=element('div',{className:'kl-workshop-body'});readonly #status=element('div',{role:'status'});readonly #unsubscribe:()=>void;
  readonly #catalogMenu = new ShellActionMenu();
  #headerMenu: HTMLDetailsElement | undefined;
  #searchTimer: ReturnType<typeof setTimeout> | undefined;
  #searchForm: HTMLFormElement | undefined;
  readonly #outsideHeaderMenu = (event: Event): void => {
    if (this.#visible && this.#headerMenu?.open && !event.composedPath().includes(this.#headerMenu)) this.#headerMenu.open = false;
  };
  readonly #outbox:WorkshopOutbox|undefined;#pending:WorkshopPendingSave|undefined;#pendingMessage:string|undefined;#saveGeneration=0;#preparing=false;
  readonly #cloudDrafts:WorkshopCloudDraftPanel|undefined;#draftSyncSupported=false;
  readonly #automaticSync:WorkshopAutomaticSync|undefined;readonly #syncPanel:WorkshopSyncPanel|undefined;
  #autosave:WorkshopAutosave|undefined;
  readonly #visibility=():void=>{if(document.visibilityState==='hidden'){this.#automaticSync?.cancel();this.#autosave?.flushPending();}else this.#automaticSync?.schedule();};
  readonly #unload=(event:BeforeUnloadEvent):void=>{if(this.#preparing||this.#autosave?.unsaved){event.preventDefault();event.returnValue='';}};
  readonly #drafts:WorkshopDrafts|undefined;#checkpoint:{id:string;expected:string}|undefined;#draftTypesSupported=false;
  readonly #bookmarks:WorkshopBookmarks|undefined;#sort:WorkshopSort='newest';#browseSort:WorkshopSort='recommended';#remixSupported=false;#unavailable:string[]=[];
  #provenanceSupported=false;
  #remixFocus:{packageId:string;version:string;from:string}|undefined;
  readonly #installSharing:WorkshopInstallSharing|undefined;readonly #sharingPanel:WorkshopInstallSharingPanel|undefined;#featured:WorkshopFeaturedPanel|undefined;#discoverySupported=false;#moderator=false;#collection:'all'|'featured'='all';
  #detailTab:'overview'|'versions'|'reviews'='overview';
  #catalogSupported=false;#catalogCursors:string[]=[''];#catalogIndex=0;
  #release:(()=>void)|undefined;#timer:ReturnType<typeof setInterval>|undefined;
  #reportSource:ReportSource|undefined;
  #report:WorkshopReportDialog|undefined;#reportsSupported=false;
  #reviews:WorkshopReviews|undefined;#reviewsSupported=false;
  #roomOpeningSupported=false;#dependenciesSupported=false;#roomThemesSupported=false;#communityTemplatesSupported=false;#visible=false;#token=0;#busy=false;#queued=false;#scope:'browse'|'mine'|'installed'|'saved'|'local'|'cloud'|'sync'|'sharing'='browse';#query='';#type='';#filter='all';#pages=1;
  #package:string|undefined;#editor:WorkshopEditor|undefined;#retry:(()=>Promise<void>)|undefined;
  #publicPackage: string | undefined;
  constructor(readonly client:CloudClient,readonly options:{current():boolean;activities():void;installation?:WorkshopInstallationOptions}){
    this.#catalogMenu.element.id = 'kl-workshop-catalog-menu';
    document.addEventListener('pointerdown', this.#outsideHeaderMenu, true);
    const member=client.memberNumber,origin=client.origin;this.#origin=origin;this.#member=member;this.#drafts=options.installation?new WorkshopDrafts(options.installation.storage,member,client.origin,()=>options.current()&&client.memberNumber===member&&client.origin===origin):undefined;
    const access=new WorkshopDraftCloud(client,()=>options.current());
    if(this.#drafts&&options.installation){
      const settings=new WorkshopSyncSettings(options.installation.storage,member,client.origin,()=>options.current()&&client.memberNumber===member&&client.origin===origin);
      this.#automaticSync=new WorkshopAutomaticSync(settings,this.#drafts,access,{current:()=>this.#active()&&document.visibilityState!=='hidden'&&!this.#cloudDrafts?.reviewing&&!this.#retry&&!this.#preparing,editing:id=>!!this.#editor&&(!this.#checkpoint||this.#checkpoint.id===id),updated:localChanged=>{this.#syncPanel?.refresh();if(this.#localActive()&&this.#editor)this.#connectionNote();if(localChanged&&this.#localActive()&&this.#scope==='local'&&!this.#editor&&!this.#busy&&!this.#retry&&!this.#status.querySelector('button')){this.#connectionNote();this.#localDrafts();}}});
      this.#syncPanel=new WorkshopSyncPanel(this.#automaticSync,{current:()=>this.#localActive()&&this.#scope==='sync',connected:()=>client.connected,review:id=>this.#openCloudDrafts(id)});
    }
    this.#cloudDrafts=this.#drafts?new WorkshopCloudDraftPanel(this.#drafts,access,()=>this.#active()&&this.#scope==='cloud',this.#automaticSync):undefined;
    this.#outbox=options.installation?new WorkshopOutbox(options.installation.storage,member,client.origin,()=>options.current()&&client.memberNumber===member&&client.origin===origin,undefined,client):undefined;
    globalThis.addEventListener?.('beforeunload',this.#unload);document.addEventListener('visibilitychange',this.#visibility);
    this.#bookmarks=options.installation?new WorkshopBookmarks(options.installation.storage,client.memberNumber,client.origin,()=>this.#active()):undefined;
    this.#installSharing=options.installation?new WorkshopInstallSharing(client,options.installation.storage,()=>options.current()&&client.memberNumber===member&&client.origin===origin):undefined;
    this.#sharingPanel=this.#installSharing?new WorkshopInstallSharingPanel(this.#installSharing,()=>this.#localActive()&&this.#scope==='sharing'):undefined;
    this.#installation=options.installation?new WorkshopInstalled(client,options.installation,()=>this.#active(),this.#installSharing,this.#bookmarks,()=>this.#clearCatalogFilters()):undefined;
    for (const [scope, label, icon] of [
      ['browse', 'Browse', 'brush'], ['installed', 'Installed', 'check'], ['mine', 'My creations', 'profile'],
    ] as const) {
      if (scope === 'installed' && !this.#installation) continue;
      const button = this.#button(label, () => this.openSection(scope));
      button.className = 'kl-platform-link';
      button.dataset.workshopSection = scope;
      button.replaceChildren(kikiIcon(icon), element('span', {text: label}));
      this.navigation.append(button);
    }
    this.#unsubscribe=client.subscribe(kind=>{
      if (kind === 'session' || kind === 'workshop-moderation' || kind === 'profiles-cleared') this.#installation?.clearUpdateNotices();
      if(kind==='session'||kind==='connection'){if(client.connected)this.#automaticSync?.schedule();else this.#automaticSync?.cancel();}
      if(!options.current()||client.memberNumber!==this.#member||client.origin!==this.#origin){this.#reset();return;}
      if((kind==='session'||kind==='connection')&&this.#editor&&(!this.#retry||this.#preparing)&&this.#autosave){
        this.#editor.cloudAvailable(client.connected);this.#autosave.flushPending();this.#connectionNote();return;
      }
      if(this.#visible&&(this.#scope==='local'||this.#scope==='sync'||this.#scope==='sharing')&&!this.#editor&&!this.#retry){
        if(kind==='session'||kind==='connection'){this.#shell();this.#connectionNote();this.#syncPanel?.refresh();this.#sharingPanel?.changed();}return;
      }
      if(this.#pending&&this.#retry&&(kind==='session'||kind==='connection'&&!client.connected)){this.#saveGeneration++;this.#busy=false;if(this.#visible)this.#pendingView(this.#pending);return;}
      if(kind==='session'){this.#reset();return;}
      if(kind==='connection'&&!client.connected){
        this.#token++;this.#cloudDrafts?.hide();this.#report?.destroy();this.#report=undefined;this.#reviews?.dispose();this.#reviews=undefined;this.#installation?.cancel();
        if(this.#pending&&this.#retry){if(!this.#busy)this.#pendingView(this.#pending);return;}
        this.#busy=false;if(this.#visible)void this.refresh();return;
      }
      if(this.#visible&&this.#cloudDrafts?.reviewing)return;
      if(this.#featured?.reviewing){if(['session','connection','privacy','relationships','profiles-cleared','workshop-moderation'].includes(kind)){this.#featured.dispose();this.#featured=undefined;}else return;}
      if(this.#visible&&kind==='workshop-moderation'){if(this.#pending&&this.#retry){if(!this.#busy)this.#pendingView(this.#pending);return;}this.#installation?.cancel();this.#body.replaceChildren(...this.#reviews?.reviewing?[this.#reviews.element]:[]);this.#reviews?.invalidate();this.#status.replaceChildren(note('Workshop moderation changed. Refresh to check current access.'));if(!this.#report&&!this.#editor&&!this.#retry&&!this.#reviews?.reviewing)void this.refresh();return;}
      if(this.#visible&&['workshop','profiles-cleared','privacy','relationships','ready','connection'].includes(kind)){
        if(this.#report){if(['profiles-cleared','privacy','relationships'].includes(kind)){this.#body.replaceChildren();this.#reviews?.invalidate();}return;}
        if(this.#reviews?.reviewing){if(['profiles-cleared','privacy','relationships'].includes(kind))this.#body.replaceChildren(this.#reviews.element);this.#reviews.invalidate();return;}
        if(this.#editor||this.#retry||this.#installation?.reviewing){if(this.#pending&&this.#retry){if(!this.#busy)this.#pendingView(this.#pending);return;}if(!this.#busy)this.#status.replaceChildren(note('Workshop changed. Your review is kept; confirmation checks the selected version and access again.'));return;}
        this.#token++;this.#body.replaceChildren(note('Checking Workshop access…'));if(!this.#queued){this.#queued=true;queueMicrotask(()=>{this.#queued=false;if(this.#visible)void this.refresh();});}
      }
    });
  }
  setVisible(value:boolean):void {
    if(value===this.#visible)return;this.#visible=value;this.element.hidden=!value;
    if(!value){clearTimeout(this.#searchTimer);this.#searchForm=undefined;this.#catalogMenu.close(false);if(this.#headerMenu)this.#headerMenu.open=false;}
    if(!value){this.#editor?.hide();this.#featured?.dispose();this.#featured=undefined;this.#sharingPanel?.hide();this.#automaticSync?.cancel();this.#syncPanel?.hide();this.#cloudDrafts?.hide();this.#autosave?.flushPending();this.#report?.destroy();this.#report=undefined;this.#reviews?.pause();this.#installation?.cancel();this.#token++;this.#release?.();this.#release=undefined;clearInterval(this.#timer);this.#timer=undefined;if(!this.#editor&&!this.#retry&&!this.#reviews?.reviewing)this.#body.replaceChildren();return;}
    if(!this.options.current()){this.#reset();return;}this.#release=this.client.retainEvents();this.#automaticSync?.schedule();this.#timer=setInterval(()=>{this.#automaticSync?.schedule();if(this.#scope!=='local'&&this.#scope!=='sync'&&this.#scope!=='sharing'&&!this.#featured?.reviewing&&!this.#busy&&!this.#report&&!this.#editor&&!this.#retry&&!this.#installation?.reviewing)void this.refresh();},60000);
    if(this.#editor||this.#reviews?.reviewing)this.#shell();else if(this.#pending&&this.#outbox){try{const pending=this.#outbox.read();if(pending)this.#pendingView(pending);}catch{this.#pendingView(this.#pending);}}else if(!this.#retry)void this.refresh();
  }
  #stopAutosave():void{this.#autosave?.dispose();this.#autosave=undefined;}
  #closeEditor():void{this.#editor?.hide();this.#editor?.element.remove();this.#editor=undefined;}
  #reset():void {this.#automaticSync?.cancel();this.#syncPanel?.hide();this.#cloudDrafts?.hide();this.#stopAutosave();this.#saveGeneration++;this.#preparing=false;this.#pending=undefined;this.#pendingMessage=undefined;this.#remixFocus=undefined;this.#resetCatalog();this.#reviews?.dispose();this.#reviews=undefined;this.setVisible(false);this.#token++;this.#closeEditor();this.#checkpoint=undefined;this.#retry=undefined;this.#package=undefined;this.#publicPackage=undefined;this.#busy=false;this.#body.replaceChildren();this.#status.replaceChildren();}
  destroy():void{this.#reset();this.#catalogMenu.destroy();this.#unsubscribe();globalThis.removeEventListener?.('beforeunload',this.#unload);document.removeEventListener('visibilitychange',this.#visibility);document.removeEventListener('pointerdown',this.#outsideHeaderMenu,true);}
  async activityCopyTitles(): Promise<Map<string, string>> {
    const storage = this.options.installation?.storage;
    if (!storage) return new Map();
    const current = () => this.options.current() && this.client.memberNumber === this.#member && this.client.origin === this.#origin;
    return new WorkshopLibrary(storage, this.#member, this.#origin, current).activityCopyTitles();
  }
  open(id?:string,mine=false,options?:{publicOnly:boolean}):void {
    if(this.#editor||this.#retry)return;this.#remixFocus=undefined;this.#open(id,mine,options?.publicOnly);
  }
  #open(id:string|undefined,mine:boolean,publicOnly=false):void {
    if(id!==this.#package)this.#detailTab='overview';
    this.#package=id&&workshopId(id)?id:undefined;
    this.#publicPackage=publicOnly?this.#package:undefined;
    this.#installation?.cancel();this.#scope=mine?'mine':'browse';this.#pages=1;this.#resetCatalog();
    if(this.#visible)void this.refresh();else this.setVisible(true);
  }
  openSection(scope:'browse'|'mine'|'installed'|'saved'):void {
    if(this.#editor||this.#retry)return;this.#installation?.cancel();this.#package=undefined;this.#publicPackage=undefined;this.#scope=scope;this.#collection='all';this.#pages=1;this.#resetCatalog();if(this.#visible)void preserveSelectionFocus(this.#body,()=>this.refresh());else this.setVisible(true);
  }
  #resetCatalog():void{this.#catalogCursors=[''];this.#catalogIndex=0;}
  #clearCatalogFilters():void {
    this.#installation?.cancel();
    this.#query='';this.#type='';this.#filter='all';this.#collection='all';this.#pages=1;
    if(this.#scope!=='mine')this.#scope='browse';
    this.#resetCatalog();
    this.#refreshAndFocus(()=>this.#body.querySelector<HTMLInputElement>('.kl-workshop-search-field input'));
  }
  #catalogMode():boolean{return this.#catalogSupported&&(this.#scope==='browse'||this.#scope==='mine');}
  #localActive():boolean{return this.#visible&&this.options.current()&&this.client.memberNumber===this.#member&&this.client.origin===this.#origin;}
  #active():boolean{return this.#localActive()&&this.client.connected;}
  #connectionNote():void{let automatic=false;try{automatic=this.#automaticSync?.settings.read().mode==='automatic';}catch{}this.#status.replaceChildren(note(automatic?(this.client.connected?(this.#automaticSync?.message||'Automatic sync is enabled for linked private drafts. Open Sync settings to pause or review it.'):'Cloud is disconnected. Linked drafts will sync when you reconnect with Workshop open. Local autosave stays available.'):this.client.connected?'Local edits stay on this device. Cloud actions require an explicit save or sync.':'Cloud is disconnected. Local drafts and autosave are available on this device. Reconnect to use Cloud actions.'));}
  #button(text:string,action:()=>void,local=false):HTMLButtonElement {
    const button=element('button',{type:'button',className:'kl-text-button',text});button.disabled=!local&&!this.client.connected;button.addEventListener('click',()=>{if((this.element.contains(button)||this.navigation.contains(button))&&(local?this.#localActive():this.#active())&&(!this.#busy||local&&text==='Local drafts'&&!this.#retry&&!this.#editor)&&(!this.#retry||['Retry save','Finish confirmed save','Forget pending save','Confirm forget pending save','Keep pending save','Reopen Workshop','Local drafts'].includes(text))){if(this.#reviews?.reviewing)this.#reviews.confirmLeave(action);else {this.#featured?.dispose();this.#featured=undefined;action();}}});return button;
  }
  #openLocalDrafts():void{this.#syncPanel?.hide();this.#token++;this.#cloudDrafts?.hide();this.#installation?.cancel();this.#retry=undefined;this.#pending=undefined;this.#scope='local';this.#package=undefined;void this.refresh();}
  #syncNavigation(): void {
    const active = ['local', 'cloud', 'sync'].includes(this.#scope) ? 'mine'
      : this.#scope === 'sharing' ? 'installed' : this.#scope === 'saved' ? 'browse' : this.#scope;
    for (const button of this.navigation.querySelectorAll<HTMLButtonElement>('button')) {
      button.disabled = !this.client.connected;
      if (button.dataset.workshopSection === active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  }
  #shell():void {
    this.element.classList.toggle('kl-workshop-catalog-page',!this.#package&&['browse','saved','mine'].includes(this.#scope));
    this.#syncNavigation();
    this.element.classList.toggle('kl-workshop-library-page',this.#scope==='installed'&&!this.#package);
    if(this.#editor){
      if(this.#editor.element.parentElement!==this.element)this.element.append(this.#editor.element);
      this.#editor.show(this.#status);
      return;
    }
    this.#catalogMenu.close(false);
    this.#headerMenu=undefined;
    const header=element('header',{className:'kl-workshop-heading'},element('h1',{text:this.#scope==='mine'?'My creations':this.#scope==='installed'?'Installed':'Workshop'}));
    header.hidden=!!this.#package;
    // Keep the shared notice and its focused controls mounted when the catalogue refreshes.
    if (this.noticeArea.parentElement !== this.element) this.element.prepend(this.noticeArea);
    for (const child of [...this.element.children]) if (child !== this.noticeArea && child !== this.#body) child.remove();
    this.noticeArea.after(header,this.#status);
    if(this.#body.parentElement!==this.element)this.element.append(this.#body);
    this.element.append(this.#catalogMenu.element);
    if(this.#retry)return;
    const create=this.#button('New creation',()=>this.#edit());create.prepend(kikiIcon('plus'));create.classList.add('kl-workshop-primary');create.disabled=this.#busy||!this.client.connected;
    const trigger=element('summary',{ariaLabel:'Workshop information',title:'Workshop information'},kikiIcon('info'));
    const menu=element('details',{className:'kl-workshop-menu'},trigger);
    this.#headerMenu=menu;
    menu.addEventListener('keydown',event=>{
      if(event.key!=='Escape'||!menu.open)return;
      event.preventDefault();event.stopPropagation();menu.open=false;trigger.focus({preventScroll:true});
    });
    const options=element('div',{className:'kl-workshop-menu-body'});
    if(this.#drafts)options.append(this.#button('Local drafts',()=>this.#openLocalDrafts(),true));
    if(this.#cloudDrafts)options.append(this.#button('Cloud drafts',()=>this.#openCloudDrafts()));
    if(this.#syncPanel)options.append(this.#button('Sync settings',()=>this.#openSyncSettings(),true));
    if(this.#sharingPanel)options.append(this.#button('Install sharing',()=>{this.#installation?.cancel();this.#scope='sharing';this.#package=undefined;void this.refresh();},true));
    if(this.#installation&&this.#dependenciesSupported){const imported=this.#button('Import a creation',()=>{menu.open=false;this.#installation?.importFile(trigger);});options.append(imported);}
    options.append(this.#button('Refresh Workshop',()=>{
      this.#installation?.cancel();this.#resetCatalog();
      this.#refreshAndFocus(()=>this.#headerMenu?.querySelector<HTMLElement>('summary'));
    },true),this.#button('Open Custom Activities',this.options.activities,true));
    const id=element('input',{ariaLabel:'Package ID',placeholder:'Paste a creation ID',maxLength:36});
    options.append(element('div',{className:'kl-workshop-open-id'},id,this.#button('Open package ID',()=>{if(workshopId(id.value))this.open(id.value);else this.#status.replaceChildren(note('Enter a complete creation ID.'));})));
    menu.append(options);header.append(create,menu);
    const remix=this.#remixFocus;if(remix&&remix.packageId===this.#package)this.element.insertBefore(this.#button('Back to remix',()=>{if(this.#remixFocus===remix)this.open(remix.from);}),this.#status);

  }
  #catalogContent(...nodes:Node[]):void {
    const keep=this.#searchForm;
    if(!keep||keep.parentElement!==this.#body){this.#body.replaceChildren(...nodes);return;}
    for(const child of [...this.#body.children])if(child!==keep)child.remove();
    this.#body.append(...nodes);
  }
  async refresh(cardAction?:WorkshopCardAction,searchForm?:HTMLFormElement):Promise<void>{
    if(!this.#visible||this.#report||this.#editor||this.#retry||this.#reviews?.reviewing||this.#featured?.reviewing||this.#scope==='cloud'&&this.#cloudDrafts?.reviewing)return;this.#featured?.dispose();this.#featured=undefined;this.#cloudDrafts?.hide();this.#reviews?.dispose();this.#reviews=undefined;if(!this.options.current()||this.client.memberNumber!==this.#member||this.client.origin!==this.#origin){this.#reset();return;}
    const token=++this.#token,id=this.#package,valid=()=>this.#active()&&token===this.#token;
    clearTimeout(this.#searchTimer);
    this.#searchForm=searchForm?.parentElement===this.#body?searchForm:undefined;
    this.#busy=true;this.#status.replaceChildren();this.#shell();
    this.#catalogContent(note('Loading Workshop…'));
    if(this.#scope==='sharing'&&this.#sharingPanel){this.#busy=false;this.#body.replaceChildren(this.#sharingPanel.element);this.#sharingPanel.open();return;}this.#sharingPanel?.hide();
    if(this.#scope==='sync'&&this.#syncPanel){this.#busy=false;this.#body.replaceChildren(this.#syncPanel.element);this.#syncPanel.open();return;}
    this.#syncPanel?.hide();
    if(this.#outbox&&this.#scope!=='local'&&this.client.connected){try{const pending=this.#outbox.read();if(pending){this.#busy=false;this.#pendingView(pending);return;}}catch(error){this.#busy=false;this.#body.replaceChildren(note(error instanceof Error?error.message:'Saved request unavailable.'),this.#button('Local drafts',()=>this.#openLocalDrafts(),true));return;}}
    if(this.#drafts&&(this.#scope==='local'||!this.client.connected)){this.#scope='local';this.#package=undefined;this.#busy=false;this.#syncNavigation();this.#connectionNote();this.#localDrafts();return;}
    if(!this.client.connected){this.#busy=false;this.#body.replaceChildren(note('Reconnect to Cloud to open Workshop.'));return;}
    try{
      const me=await this.client.request<{memberNumber:number;moderator?:boolean;features?:{workshopDiscovery?:boolean;workshopDraftSync?:boolean;workshopRemixProvenance?:boolean;workshopCatalog?:boolean;workshopDraftTypeChanges?:boolean;workshopRemix?:boolean;workshopReports?:boolean;workshopReviews?:boolean;workshopPublications?:boolean;workshopDependencies?:boolean;roomOpening?:boolean;workshopRoomThemes?:boolean;workshopCommunityTemplates?:boolean;}}>('GET','/v1/me');if(!valid())return;if(me.memberNumber!==this.client.memberNumber)throw new Error('Account changed');
      const source=workshopSource(me);if(this.#source&&JSON.stringify(source)!==JSON.stringify(this.#source)){this.#resetCatalog();this.#pages=1;}this.#source=source;const access=workshopAccessAt(this.client,source,valid);
      this.#reportSource=captureReportSource(this.client,me,()=>this.#active());
      if(me.features?.workshopPublications!==true){this.#busy=false;this.#body.replaceChildren(note('Workshop publications will be available after the pending Cloud update.'));return;}
      this.#discoverySupported=me.features.workshopDiscovery===true;this.#moderator=me.moderator===true;this.#installation?.setDiscoverySupported(this.#discoverySupported);if(this.#scope==='browse'){
        const ranked=this.#discoverySupported&&me.features.workshopCatalog===true;
        this.#sort=!ranked&&['recommended','installs'].includes(this.#browseSort)?'newest':this.#browseSort;
      }else if(this.#sort==='recommended'||this.#sort==='installs')this.#sort='newest';
      if(!this.#discoverySupported||me.features.workshopCatalog!==true||this.#scope!=='browse')this.#collection='all';
      this.#draftSyncSupported=me.features.workshopDraftSync===true;
      this.#provenanceSupported=me.features.workshopRemixProvenance===true;
      if(this.#catalogSupported!==(me.features.workshopCatalog===true))this.#resetCatalog();this.#catalogSupported=me.features.workshopCatalog===true;
      this.#draftTypesSupported=me.features.workshopDraftTypeChanges===true;this.#remixSupported=me.features.workshopRemix===true;this.#reportsSupported=me.features.workshopReports===true;this.#reviewsSupported=me.features.workshopReviews===true;this.#communityTemplatesSupported=me.features.workshopCommunityTemplates===true;this.#installation?.setCommunityTemplatesSupported(this.#communityTemplatesSupported);this.#roomOpeningSupported=me.features.roomOpening===true;this.#roomThemesSupported=me.features.workshopRoomThemes===true;this.#installation?.setRoomThemesSupported(this.#roomThemesSupported);this.#dependenciesSupported=me.features.workshopDependencies===true;this.#installation?.setDependenciesSupported(this.#dependenciesSupported);this.#shell();
      const pending=this.#outbox?.read();if(pending){this.#busy=false;this.#pendingView(pending);return;}
      if(this.#scope==='cloud'&&this.#cloudDrafts){this.#busy=false;this.#openCloudDrafts();return;}
      if(this.#scope==='installed'&&this.#installation){this.#busy=false;const create=this.element.querySelector<HTMLButtonElement>('.kl-workshop-primary');if(create)create.disabled=false;this.#body.replaceChildren(this.#installation.element);this.#installation.list();return;}
      if(id){
        const detail=checkedWorkshopDetail(await access.request<WorkshopDetail>('GET','/v1/workshop/'+id));
        if(!valid())return;
        if(detail.id!==id)throw new Error('Wrong package');
        if(this.#scope==='browse'&&this.#publicPackage===id&&
          (detail.status!=='published'||detail.visibility!=='public'||this.client.isProfileBlocked(detail.author))){
          throw new CloudError('workshop_unavailable',404);
        }
        this.#reviewSources.set(detail,source);this.#engagementSources.set(detail,workshopEngagementSource(me));this.#busy=false;this.#detail(detail,cardAction);return;
      }
      this.#unavailable=[];
      if(this.#scope==='saved'&&this.#bookmarks){
        const ids=this.#bookmarks.list(),selected=ids.slice(0,Math.min(this.#pages*20,100)),items:WorkshopSummary[]=[];
        for(const saved of selected){
          if(!valid())return;
          try{const candidate=await access.request<WorkshopDetail>('GET','/v1/workshop/'+saved);if(!valid())return;if(candidate.id!==saved)throw new Error('Wrong package');if(['Scene pack','Automation preset'].includes(candidate.type))continue;const value=checkedWorkshopDetail(candidate);if((!this.#type||value.type===this.#type)&&[value.title,value.summary,...value.tags].join(' ').toLowerCase().includes(this.#query.toLowerCase()))items.push(value);}
          catch(error){if(!valid())return;if(error instanceof CloudError&&[403,404].includes(error.status))this.#unavailable.push(saved);else throw error;}
        }
        this.#busy=false;this.#list({items,nextCursor:ids.length>selected.length?1:null});return;
      }
      if(this.#catalogMode()&&(this.#scope==='browse'||this.#scope==='mine')){
        const scope=this.#scope,sort=this.#sort;
        const fetchPage=async()=>{const cursor=this.#catalogCursors[this.#catalogIndex]!,params=new URLSearchParams({scope,sort,limit:'20',cursor,q:this.#query,status:scope==='mine'?this.#filter:'all',format:this.#roomOpeningSupported?'6':this.#communityTemplatesSupported?'4':this.#roomThemesSupported?'2':'1'});if(this.#type)params.set('type',this.#type);if(this.#discoverySupported)params.set('collection',this.#collection);
          return checkedWorkshopCatalog(await this.client.request<WorkshopCatalogPage>('GET','/v1/workshop/catalog?'+params),sort,scope,this.client.memberNumber,cursor,this.#collection);
        };
        let page:WorkshopCatalogPage,restarted=false;
        try{page=await fetchPage();}catch(error){if(!valid()||!(error instanceof CloudError)||error.status!==409||error.code!=='workshop_catalog_changed'||!this.#catalogIndex)throw error;this.#resetCatalog();restarted=true;page=await fetchPage();}
        if(!valid())return;this.#busy=false;this.#list(page);if(restarted)this.#status.replaceChildren(note('The catalogue changed or this page expired. Showing the first page with current access.'));return;
      }
      let cursor=0;const items:WorkshopSummary[]=[],seen=new Set<string>();
      for(let page=0;page<Math.min(this.#pages,10);page++){
        const query=new URLSearchParams({scope:this.#scope,limit:'20',cursor:String(cursor),q:this.#query,status:this.#scope==='mine'?this.#filter:'all'});if(this.#type)query.set('type',this.#type);if(this.#roomOpeningSupported)query.set('format','6');else if(this.#communityTemplatesSupported)query.set('format','4');else if(this.#roomThemesSupported)query.set('format','2');
        const result=checkedWorkshopPage(await access.request<Page>('GET','/v1/workshop?'+query),cursor,20,this.#scope==='mine'?this.client.memberNumber:undefined,this.#scope==='browse');if(!valid())return;
        for(const item of result.items){if(seen.has(item.id))throw new Error('Repeated package');seen.add(item.id);items.push(item);}cursor=result.nextCursor??0;if(!cursor)break;
      }
      this.#busy=false;this.#list({items,nextCursor:cursor||null});
    }catch(error){if(!valid())return;this.#busy=false;
      this.#catalogContent(note(error instanceof CloudError&&[403,404].includes(error.status)?'This creation is private or no longer available.':'Workshop could not load. Try refreshing.'));
      if (!id && this.#catalogMode()) {
        const retry = this.#button('Retry', () => void focusPageResults(this.#body, () => this.refresh(), true));
        retry.dataset.pageRetry = '';
        this.#body.append(retry);
      }
    }
  }
  #openCard(id:string,action?:WorkshopCardAction):void {
    if(!this.#active()||this.#busy||this.#editor||this.#retry||this.#package)return;
    this.#package=id;
    this.#publicPackage=undefined;
    this.#remixFocus=undefined;
    this.#detailTab='overview';
    this.#installation?.cancel();
    if(action)void this.refresh(action);
    else this.#refreshAndFocus(()=>this.#body.querySelector<HTMLElement>('.kl-workshop-detail-heading h1'));
  }
  #returnToCatalog():void {
    const id=this.#package;
    this.#installation?.cancel();
    this.#package=undefined;
    this.#remixFocus=undefined;
    this.#refreshAndFocus(()=>this.#body.querySelector<HTMLElement>(`[data-package-id="${id}"] .kl-workshop-title`)
      ??this.#body.querySelector<HTMLInputElement>('.kl-workshop-search-field input'));
  }
  #refreshAndFocus(target:()=>HTMLElement|null|undefined):void {
    const token=this.#token+1;
    void this.refresh().then(()=>{
      if(this.#token!==token||!this.#localActive())return;
      const root=this.element.getRootNode();
      let active=document.activeElement;
      while(active?.shadowRoot?.activeElement)active=active.shadowRoot.activeElement;
      if(active&&active!==document.body&&!(root instanceof ShadowRoot&&active===root.host))return;
      target()?.focus({preventScroll:true});
    });
  }
  #list(page:{items:WorkshopSummary[];nextCursor:number|string|null}):void {
    const create=this.element.querySelector<HTMLButtonElement>('.kl-workshop-primary');if(create)create.disabled=!this.client.connected;
    const catalog=this.#catalogMode();
    const sort=element('select',{ariaLabel:catalog?'Sort catalogue':'Sort loaded creations'});
    const ranked=catalog&&this.#discoverySupported&&this.#scope==='browse';
    if(ranked)sort.append(element('option',{value:'recommended',text:'Recommended'}),element('option',{value:'installs',text:'Popular'}));
    for(const [value,text] of [['newest','Newest'],['rating','Highest rated'],['title','Title A–Z']] as const)sort.append(element('option',{value,text}));
    sort.value=this.#sort;
    sort.addEventListener('change',()=>{
      if(!this.#active()||this.#busy||!this.element.contains(sort))return;
      this.#sort=sort.value as WorkshopSort;
      if(this.#scope==='browse')this.#browseSort=this.#sort;
      void preserveSelectionFocus(this.#body,()=>{
        if(!catalog)return this.#list(page);
        this.#resetCatalog();return this.refresh();
      });
    });
    const search=element('input',{type:'search',ariaLabel:'Search Workshop',placeholder:'Search creations, creators or tags…',value:this.#query,maxLength:80}),type=element('select',{ariaLabel:'Filter package type'}),status=element('select',{ariaLabel:'Filter creation status'});
    search.autocomplete='off';
    type.append(element('option',{value:'',text:'All types'}),...WORKSHOP_TYPES.filter(value=>(this.#roomThemesSupported||!['Room preset','Background','UI theme'].includes(value))&&(this.#communityTemplatesSupported||value!=='Community template')).map(value=>element('option',{value,text:value})));
    type.value=this.#type;
    for(const [value,text] of [['all','All creations'],['draft','Drafts'],['published','Published'],['archived','Archived']] as const)status.append(element('option',{value,text}));
    status.value=this.#filter;
    const filter=(keepForm=false)=>{
      if(!this.#active()||this.#busy&&this.#searchForm!==toolbar||!toolbar.isConnected)return;
      clearTimeout(this.#searchTimer);
      this.#query=search.value.trim();this.#type=type.value;
      this.#filter=this.#body.querySelector<HTMLSelectElement>('[aria-label="Filter creation status"]')?.value??this.#filter;
      this.#pages=1;this.#resetCatalog();
      if(keepForm)void this.refresh(undefined,toolbar);
      else void preserveSelectionFocus(this.#body,()=>this.refresh());
    };
    type.addEventListener('change',()=>filter());
    const searchButton=element('button',{type:'submit',className:'kl-text-button kl-workshop-search-submit',ariaLabel:'Search',title:'Search Workshop'},kikiIcon('search'));
    const clearSearch=element('button',{type:'button',className:'kl-text-button',text:'Clear Workshop search'});
    clearSearch.addEventListener('click',()=>{search.value='';updateClear();search.focus();filter(true);});
    clearSearch.classList.add('kl-workshop-search-clear');
    clearSearch.setAttribute('aria-label','Clear Workshop search');
    clearSearch.title='Clear Workshop search';
    clearSearch.replaceChildren(kikiIcon('close'));
    const updateClear=()=>{clearSearch.hidden=!search.value;};
    updateClear();
    const toolbar=element('form',{className:'kl-workshop-search',ariaLabel:'Filter Workshop'},element('div',{className:'kl-workshop-search-field'},searchButton,search,clearSearch),type);
    bindSearchEscape(toolbar, search, clearSearch);
    const scheduleSearch=(composing=false)=>{
      if(!this.#active()||!this.#body.contains(toolbar))return;
      updateClear();
      clearTimeout(this.#searchTimer);
      if(this.#searchForm===toolbar&&this.#busy){this.#token++;this.#busy=false;}
      if(!composing)this.#searchTimer=setTimeout(()=>filter(true),250);
    };
    search.addEventListener('input',event=>scheduleSearch((event as InputEvent).isComposing));
    search.addEventListener('compositionend',()=>scheduleSearch());
    toolbar.addEventListener('submit',event=>{event.preventDefault();search.focus();filter(true);});
    status.addEventListener('change',()=>{
      if(!this.#active()||this.#busy||!this.#body.contains(status))return;
      this.#filter=status.value;
      this.#query=this.#body.querySelector<HTMLInputElement>('input[type=search]')?.value.trim()??this.#query;
      this.#pages=1;this.#resetCatalog();void preserveSelectionFocus(this.#body,()=>this.refresh());
    });
    const filters=element('div',{className:'kl-workshop-filter-row'});
    if(this.#bookmarks&&(this.#scope==='browse'||this.#scope==='saved')){
      const scopes=element('div',{className:'kl-workshop-scopes',role:'group',ariaLabel:'Workshop filters'});
      for(const [label,scope] of [['All','browse'],['Saved','saved']] as const){
        const button=this.#button(label,()=>this.openSection(scope));
        button.setAttribute('aria-pressed',String(this.#scope===scope));
        scopes.append(button);
      }
      filters.append(scopes);
    }
    const menuBody=this.#headerMenu?.querySelector('.kl-workshop-menu-body');
    menuBody?.querySelector('.kl-workshop-collection-field')?.remove();
    if(ranked&&menuBody){
      const collection=element('select',{ariaLabel:'Workshop collection'});
      collection.append(element('option',{value:'all',text:'All creations'}),element('option',{value:'featured',text:'Featured'}));
      collection.value=this.#collection;
      collection.addEventListener('change',()=>{
        if(!this.#active()||this.#busy||!this.element.contains(collection))return;
        this.#collection=collection.value==='featured'?'featured':'all';
        this.#resetCatalog();
        this.#refreshAndFocus(()=>this.#headerMenu?.querySelector('summary'));
      });
      menuBody.prepend(element('label',{className:'kl-workshop-collection-field'},'Collection',collection));
    }
    const sortControls=element('div',{className:'kl-workshop-sort-controls'});
    if(this.#scope==='mine')sortControls.append(element('label',{},'Show',status));
    sortControls.append(element('label',{},'Sort',sort));
    filters.append(sortControls);
    const count=element('p',{className:'kl-workshop-results',role:'status',text:`${page.items.length} ${page.items.length===1?'creation':'creations'}${catalog?` · Page ${this.#catalogIndex+1}`:''}`});
    const activeFilters=element('div',{className:'kl-workshop-active-filters'});
    const filtered=!!(this.#query||this.#type||this.#scope==='mine'&&this.#filter!=='all'||this.#scope==='saved'||this.#collection==='featured');
    const hasRows=page.items.length>0||this.#unavailable.length>0;
    const clearFilters=()=>this.#clearCatalogFilters();
    if(filtered){
      const chip = (label: string, unset: () => void) => {
        const button = removableFilter(this.#button(label, () => {
          const input = this.#body.querySelector<HTMLInputElement>('.kl-workshop-search-field input');
          if (input) this.#query = input.value.trim();
          unset();
          this.#pages = 1;
          this.#resetCatalog();
          this.#refreshAndFocus(() => this.#body.querySelector<HTMLInputElement>('.kl-workshop-search-field input'));
        }), label);
        button.classList.add('kl-workshop-tag');
        activeFilters.append(button);
      };
      if(this.#collection==='featured')chip('Featured', () => { this.#collection = 'all'; });
      if(this.#type)chip(this.#type, () => { this.#type = ''; });
      if(hasRows)activeFilters.append(this.#button('Clear filters',clearFilters));
    }
    const keptForm=this.#searchForm;
    if(keptForm&&keptForm.parentElement===this.#body){
      // Keep the focused input, its caret and any composition mounted across Cloud reads.
      const keptType=keptForm.querySelector('select');
      if(keptType){keptType.replaceChildren(...type.options);keptType.value=this.#type;}
      this.#catalogContent(filters,activeFilters,count);
    }else this.#body.replaceChildren(toolbar,filters,activeFilters,count);
    const grid=element('div',{className:'kl-workshop-grid'});
    if(hasRows)this.#body.append(grid);
    else {
      const savedOnly=this.#scope==='saved'&&!this.#query&&!this.#type;
      let title='No creations yet';
      let description=this.#scope==='mine'?'Your creations will appear here.':'Published creations will appear here.';
      if(savedOnly){
        title='No saved creations here';
        description='Save a creation in Workshop to find it here.';
      }else if(filtered){
        title='No matching creations';
        description='Try another search or clear your filters.';
      }
      const action=filtered?this.#button(savedOnly?'Browse Workshop':'Clear filters',clearFilters):undefined;
      action?.classList.add('kl-text-button--primary');
      this.#body.append(element('section',{className:'kl-workshop-empty kl-explore-empty kl-explore-catalog-empty'},kikiIcon(filtered&&!savedOnly?'search':'brush'),
        element('h2',{text:title}),note(description),action));
    }
    const installed = new Map<string,{enabled:boolean;version:string}>();
    let installationAvailable=false;
    if(this.#installation)try{
      for(const item of this.#installation.library.list())installed.set(item.id,{enabled:item.enabled,version:item.release.version});
      installationAvailable=true;
    }catch{/* The catalog remains readable if its local library cannot be opened. */}
    for(const item of catalog?page.items:sortWorkshop(page.items,this.#sort)){
      const card=workshopCard(item,()=>this.#openCard(item.id),'Details');
      card.dataset.packageId=item.id;
      pageResult(card.querySelector<HTMLButtonElement>('.kl-workshop-title')!, item.id);
      const footer=card.querySelector('.kl-workshop-card-footer')!;
      const saved=this.#bookmarks?this.#bookmark(item.id):undefined;
      const own=this.#scope==='mine'&&item.author===this.client.memberNumber&&!!item.revision;
      if(this.#scope==='mine'&&item.visibility==='unlisted')card.querySelector('.kl-workshop-tags')!.append(element('span',{className:'kl-workshop-tag',text:'Unlisted'}));
      if(own)footer.prepend(this.#button(item.hasDraft?'Resume edits':'Edit creation',()=>this.#openCard(item.id,'edit')));
      else if(installationAvailable&&item.status==='published'&&item.version){
        const copy=installed.get(item.id);
        const current=copy?.version===item.version;
        const install=this.#button(current?(copy.enabled?'Installed':'Disabled'):copy?'Review update':'Install',()=>this.#openCard(item.id,current?'installed':'install'));
        install.classList.add(current?'kl-workshop-action-installed':'kl-workshop-action-primary');
        install.setAttribute('aria-label',`${install.textContent} ${item.title}`);
        install.prepend(kikiIcon(current?'check':copy?'refresh':'plus'));
        footer.prepend(install);
      }
      if(saved)footer.append(saved);
      const options:ShellAction[]=[];
      if(saved instanceof HTMLButtonElement)options.push({label:saved.title,icon:'bookmark',run:()=>saved.click()});
      if(this.#remixSupported&&item.status==='published')options.push({label:'Make a remix',icon:'brush',run:()=>this.#openCard(item.id,'remix')});
      if(own)options.push({label:item.hasDraft?'Resume unpublished edits':'Edit creation',icon:'edit',run:()=>this.#openCard(item.id,'edit')});
      if(this.#reportsSupported&&item.status==='published'&&item.version)options.push({label:'Report creation',icon:'flag',run:()=>this.#openCard(item.id,'report')});
      if(options.length){
        const trigger=this.#button(`${item.title} options`,()=>this.#catalogMenu.open(trigger,'Creation options',options,undefined,true));
        trigger.classList.add('kl-workshop-card-options');
        trigger.setAttribute('aria-label',`${item.title} options`);
        trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');
        trigger.replaceChildren(kikiIcon('more'));
        card.querySelector('.kl-workshop-card-heading')!.append(trigger);
      }
      grid.append(card);
    }
    for(const id of this.#unavailable)grid.append(element('article',{className:'kl-workshop-card kl-workshop-unavailable'},note('Saved creation is private or no longer available.'),note('Package ID: '+id),this.#bookmark(id)));
    const loadPage = () => void focusPageResults(this.#body, () => this.refresh(), catalog);
    if (catalog) {
      const navigation = element('nav', { className: 'kl-page-navigation', ariaLabel: 'Workshop pages' });
      if (this.#catalogIndex > 0) navigation.append(pageAction(this.#button('Previous page', () => {
        this.#catalogIndex--;
        loadPage();
      }), 'previous'));
      const next = page.nextCursor;
      if (typeof next === 'string') navigation.append(pageAction(this.#button('Next page', () => {
        this.#catalogCursors = this.#catalogCursors.slice(0, this.#catalogIndex + 1);
        this.#catalogCursors.push(next);
        this.#catalogIndex++;
        loadPage();
      }), 'next'));
      if (navigation.childElementCount) this.#body.append(navigation);
    } else if (page.nextCursor && this.#pages < 10) {
      this.#body.append(pageAction(this.#button('Load more creations', () => { this.#pages++; loadPage(); })));
    } else if (page.nextCursor) this.#body.append(note('Showing up to 200 packages. Narrow the search to continue.'));
  }
  #detail(detail:WorkshopDetail,cardAction?:WorkshopCardAction):void {
    const create=this.element.querySelector<HTMLButtonElement>('.kl-workshop-primary');if(create)create.disabled=!this.client.connected;
    const reportSource=this.#reportSource;
    this.#reviews?.dispose();this.#reviews=undefined;
    const overview=element('section',{className:'kl-workshop-overview'}),versions=element('section',{className:'kl-workshop-versions'}),reviews=element('section',{className:'kl-workshop-review-panel'});
    const metadata=element('div',{className:'kl-workshop-detail-meta'},
      element('span',{text:`By ${detail.authorName}`}),
      detail.version?element('span',{text:`Latest v${detail.version}`}):undefined,
      element('span',{className:'kl-workshop-badge',text:detail.status[0]!.toUpperCase()+detail.status.slice(1)}),
      detail.discovery?.featured?element('span',{className:'kl-workshop-badge kl-workshop-badge--featured',text:'Featured'}):undefined,
      detail.visibility==='unlisted'?element('span',{className:'kl-workshop-badge',text:'Unlisted'}):undefined,
    );
    const identity=element('div',{className:'kl-workshop-detail-heading'},workshopTypePreview(detail.type),
      element('div',{className:'kl-workshop-heading-copy'},element('h1',{text:detail.title,tabIndex:-1}),metadata),
    );
    const primary=element('div',{className:'kl-workshop-catalog-actions'});
    const actions=element('div',{className:'kl-workshop-detail-actions'},primary);
    const heading=element('section',{className:'kl-workshop-detail-header'},identity,
      element('p',{className:'kl-workshop-detail-summary',text:detail.summary}),actions,
    );
    const back=this.#button('Workshop',()=>this.#returnToCatalog());back.prepend(kikiIcon('back'));
    this.#body.replaceChildren(element('div',{className:'kl-workshop-path'},back,element('span',{text:detail.type})),heading);
    const extra=element('div',{className:'kl-workshop-creation-menu-body'},note('Creation ID: '+detail.id),
      detail.discovery?note(`${detail.discovery.installs} reported installs`):undefined);
    const menuTrigger=element('summary',{ariaLabel:'Creation options',title:'Creation options'},kikiIcon('more'));
    const menu=element('details',{className:'kl-workshop-creation-menu'},menuTrigger,extra);
    menu.addEventListener('keydown',event=>{
      if(event.key!=='Escape'||!menu.open)return;
      event.preventDefault();event.stopPropagation();menu.open=false;menuTrigger.focus();
    });
    menu.addEventListener('focusout',event=>{if(event.relatedTarget instanceof Node&&!menu.contains(event.relatedTarget))menu.open=false;});
    identity.append(menu);
    if(this.#discoverySupported&&this.#moderator&&detail.visibility==='public'&&detail.status==='published'){const token=this.#token;this.#featured=new WorkshopFeaturedPanel(this.client,detail.id,()=>this.#active()&&token===this.#token&&this.#package===detail.id);extra.append(this.#featured.element);}
    const focus=this.#remixFocus?.packageId===detail.id?this.#remixFocus:undefined;
    if(focus)overview.append(note(`Recorded source version: ${focus.version}`));
    if(this.#provenanceSupported&&detail.remixSource){
      const info=detail.remixSource,token=this.#token,panel=element('section',{className:'kl-workshop-card',ariaLabel:'Recorded remix source'},element('h3',{text:'Remix source'}));
      if(info.available)panel.append(note(`${info.title} · v${info.version} · ${info.authorName}`),note('Source recorded by Workshop. This link stays with the remix when its description changes.'),this.#button('Open source version',()=>{if(token===this.#token&&this.#package===detail.id)void this.#openRemixSource(detail);}));
      else panel.append(note('The recorded source is private or no longer available.'));
      overview.append(panel);
    }
    const editable=detail.author===this.client.memberNumber&&!!detail.revision;
    if(editable){actions.append(this.#button(detail.draft?'Edit draft':'Create next version',()=>this.#edit(detail)));if(detail.draft)actions.append(this.#button('Review publication',()=>this.#confirm(detail,'publish')));if(detail.draft)extra.append(this.#button('Discard saved draft',()=>this.#confirm(detail,'discard')));if(detail.status==='published')extra.append(this.#button('Archive creation',()=>this.#confirm(detail,'archive')));}
    const remixAction=this.#remixSupported&&detail.status==='published'?this.#button('Make a remix',()=>{try{this.#installation?.cancel();this.#edit(undefined,remixWorkshop(detail),{id:detail.id,version:detail.version!},undefined,false,this.#reviewSources.get(detail));}catch(error){this.#status.replaceChildren(note(error instanceof Error?error.message:'Could not prepare remix.'));}}):undefined;
    if(remixAction)(editable?extra:actions).append(remixAction);
    if(this.#bookmarks)actions.append(this.#bookmark(detail.id));
    const reportAction=this.#reportsSupported&&detail.status==='published'&&detail.version?this.#button('Report creation',()=>this.#reportTarget('creation',detail.id,detail.title,detail.version!,reportSource)):undefined;
    if(reportAction)extra.append(reportAction);
    if(detail.draft)overview.append(element('section',{className:'kl-workshop-saved-draft'},element('h3',{text:'Private saved draft'}),note(`${detail.draft.title} · ${detail.draft.version} · ${detail.draft.visibility}`),note(detail.draft.description),workshopPayloadView(detail.draft)));
    if(this.#reviewsSupported&&detail.version){this.#reviews=new WorkshopReviews(this.client,detail.id,()=>this.#active()&&this.#package===detail.id&&this.#detailTab==='reviews'&&reviews.isConnected,this.#reportsSupported?r=>this.#reportTarget('review',String(r.sequence),`Review by ${r.authorName} · ${detail.title}`,String(r.revision),reportSource):undefined);reviews.append(this.#reviews.element);}
    const latest=detail.versions.find(release=>release.version===detail.version);
    if(latest)overview.append(workshopOverview(latest,{dependencies:this.#dependenciesSupported,roomThemes:this.#roomThemesSupported,communityTemplates:this.#communityTemplatesSupported}));
    const versionList=element('section',{className:'kl-workshop-section kl-workshop-version-list'},element('h2',{text:'Version history'}));
    versions.append(versionList);if(!detail.versions.length)versionList.append(note('Nothing has been published yet.'));
    const versionActions=new Map<WorkshopRelease,HTMLElement>();
    for(const release of [...detail.versions].sort((a,b)=>compareWorkshopVersions(b.version,a.version))){
      const install=element('div',{className:'kl-workshop-version-actions'});
      versionActions.set(release,install);
      const preview=element('details',{className:'kl-workshop-release'},element('summary',{text:'Preview',ariaLabel:`Preview version ${release.version}`}),note(release.summary),note(release.description),workshopPayloadView(release));
      preview.open=focus?.version===release.version;preview.dataset.version=release.version;
      versionList.append(element('article',{className:'kl-workshop-version-row'},
        element('div',{className:'kl-workshop-version-copy'},
          element('h3',{},`v${release.version}`,release.version===detail.version?element('span',{className:'kl-workshop-badge kl-workshop-badge--featured',text:'Latest'}):undefined),
          note(release.changelog),note(`${release.permissions.length} ${release.permissions.length===1?'permission':'permissions'} · ${release.deps?.length??0} dependencies`),
        ),preview,install,
      ));
    }
    if(focus&&!detail.versions.some(release=>release.version===focus.version))versions.append(note('The recorded source version is no longer available.'));
    const tabs=element('div',{className:'kl-workshop-detail-tabs',role:'tablist',ariaLabel:'Creation sections'});
    const sections:Array<{key:'overview'|'versions'|'reviews';label:string;panel:HTMLElement}>=[{key:'overview',label:'Overview',panel:overview},{key:'versions',label:'Versions',panel:versions},...this.#reviews?[{key:'reviews' as const,label:'Reviews',panel:reviews}]:[]];
    const select=(key:'overview'|'versions'|'reviews',focusTab=false)=>{
      if(!this.#active()||this.#package!==detail.id||!tabs.isConnected)return;
      this.#detailTab=key;
      sections.forEach(({key:id,panel},index)=>{const button=tabs.children[index] as HTMLButtonElement,selected=id===key;panel.hidden=!selected;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;if(selected&&focusTab)button.focus({preventScroll:true});});
      if(key==='reviews')void this.#reviews?.refresh();else this.#reviews?.pause();
    };
    for(const [index,{key,label,panel}] of sections.entries()){
      const button=this.#button(label,()=>select(key));button.id=`kl-creation-tab-${key}`;button.setAttribute('role','tab');panel.id=`kl-creation-panel-${key}`;button.setAttribute('aria-controls',panel.id);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);
      button.addEventListener('click',event=>{if(button.getAttribute('aria-selected')==='true')event.stopImmediatePropagation();},true);
      button.addEventListener('keydown',event=>{const next=event.key==='ArrowRight'?(index+1)%sections.length:event.key==='ArrowLeft'?(index+sections.length-1)%sections.length:event.key==='Home'?0:event.key==='End'?sections.length-1:-1;if(next<0)return;event.preventDefault();if(sections[next]!.key===this.#detailTab){button.focus({preventScroll:true});return;}const change=()=>select(sections[next]!.key,true);if(this.#reviews?.reviewing)this.#reviews.confirmLeave(change);else change();});tabs.append(button);
    }
    this.#body.append(tabs);
    if(this.#installation)this.#body.append(this.#installation.element);
    this.#body.append(...sections.map(item=>item.panel));
    this.#installation?.catalog(detail,this.#engagementSources.get(detail),{
      primary,versions:versionActions,showOverview:()=>select('overview'),
      guard:action=>{
        if(this.#reviews?.reviewing)this.#reviews.confirmLeave(()=>{select('overview');action();});
        else action();
      },
      reviewPublished:()=>{this.#detailTab='versions';void this.refresh();},
      showInstalledList:()=>this.openSection('installed'),
    });
    select(focus?'versions':this.#reviews?.reviewing?'reviews':sections.some(item=>item.key===this.#detailTab)?this.#detailTab:'overview');
    if(cardAction==='install')primary.querySelector<HTMLButtonElement>('.kl-workshop-action-primary')?.click();
    else if(cardAction==='installed')primary.querySelector<HTMLButtonElement>('.kl-workshop-action-installed')?.click();
    else if(cardAction==='edit'&&editable)this.#edit(detail);
    else if(cardAction==='remix')remixAction?.click();
    else if(cardAction==='report')reportAction?.click();
  }
  async #openRemixSource(detail:WorkshopDetail):Promise<void>{
    const original=detail.remixSource;if(!original?.available||!this.#active())return;
    const token=++this.#token,valid=()=>this.#active()&&this.#token===token&&this.#package===detail.id;
    this.#busy=true;this.#installation?.cancel();this.#reviews?.dispose();this.#reviews=undefined;this.#body.replaceChildren(note('Checking the remix and source access…'));this.#status.replaceChildren();
    try{
      const fresh=checkedWorkshopDetail(await workshopAccessAt(this.client,this.#reviewSources.get(detail)??{required:false},valid).request<WorkshopDetail>('GET','/v1/workshop/'+detail.id));if(!valid())return;
      if(fresh.id!==detail.id)throw new Error('Wrong package');
      const source=fresh.remixSource;this.#busy=false;
      if(!source?.available){const originalSource=this.#reviewSources.get(detail);if(originalSource)this.#reviewSources.set(fresh,originalSource);this.#detail(fresh);return;}
      if(source.packageId!==original.packageId||source.version!==original.version)throw new Error('The recorded source changed. Refresh Workshop.');
      this.#remixFocus={packageId:source.packageId,version:source.version,from:detail.id};this.#open(source.packageId,false);
    }catch(error){if(valid()){this.#busy=false;this.#body.replaceChildren(note(error instanceof CloudError&&[403,404].includes(error.status)?'The remix or its source is no longer available.':'Could not check the remix source. Refresh Workshop to try again.'));}}
  }
  #openSyncSettings():void{if(!this.#syncPanel||this.#editor||this.#retry)return;this.#cloudDrafts?.hide();this.#installation?.cancel();this.#scope='sync';this.#package=undefined;this.#token++;void this.refresh();}
  #openCloudDrafts(id?:string):void{if(!this.#cloudDrafts||this.#editor||this.#retry)return;this.#automaticSync?.cancel();this.#syncPanel?.hide();this.#scope='cloud';this.#package=undefined;this.#installation?.cancel();this.#status.replaceChildren();this.#shell();this.#body.replaceChildren(this.#cloudDrafts.element);this.#cloudDrafts.open(id);}
  #localDrafts():void {
    this.#body.replaceChildren(element('h2',{text:'Local drafts'}),note('Up to 20 unfinished drafts on this device, separate for each account and Cloud service. Unlinked drafts stay on this device. Linked copies follow Sync settings. Nothing is published.'),this.#button('Create local draft',()=>this.#edit(undefined,undefined,undefined,undefined,true),true));
    try{const pending=this.#outbox?.read();if(pending)this.#body.append(note('A Workshop save is pending. Its submitted copy is kept separately; editing a local draft does not change or resend it.'),this.#button('Review pending save',()=>this.#pendingView(pending),true));}
    catch(error){this.#body.append(note(error instanceof Error?error.message:'The pending save could not be read.'));}
    try{const drafts=this.#drafts!.list();if(!drafts.length)this.#body.append(note('No local drafts yet. Use Save on this device while editing.'));
      for(const saved of drafts)this.#body.append(element('article',{className:'kl-workshop-card'},element('h3',{text:saved.draft.title||'Untitled draft'}),note(saved.draft.type),this.#button('Resume local draft',()=>this.#edit(undefined,undefined,undefined,saved),true),this.#button('Review as new creation',()=>void this.#reviewCopy(saved)),...this.#draftSyncSupported?[this.#button('Review Cloud sync',()=>this.#openCloudDrafts(saved.id))]:[],this.#button('Delete local draft',()=>{
        this.#status.replaceChildren(note('Delete this local draft and its saved type variants?'),this.#button('Confirm delete local draft',()=>{
          const token=this.#token,valid=()=>this.#localActive()&&this.#scope==='local'&&token===this.#token;this.#busy=true;
          void this.#drafts!.put(null,saved.id,JSON.stringify(saved),valid).then(()=>{if(valid()){this.#connectionNote();this.#localDrafts();}}).catch(error=>{if(valid())this.#status.replaceChildren(note(error instanceof Error?error.message:'Could not delete local draft.'));}).finally(()=>{if(token===this.#token)this.#busy=false;});
        },true),this.#button('Keep local draft',()=>this.#connectionNote(),true));
      },true)));
    }catch(error){this.#body.append(note(error instanceof Error?error.message:'Local drafts are unavailable.'));}
  }
  #bookmark(id:string):HTMLElement {
    try{const saved=this.#bookmarks!.list().includes(id),button=this.#button(saved?'Remove saved creation':'Save creation',()=>{
      const token=this.#token;this.#busy=true;
      void this.#bookmarks!.set(id,!saved,saved).then(()=>{if(!this.#active()||token!==this.#token)return;this.#busy=false;void this.refresh();}).catch(error=>{if(!this.#active()||token!==this.#token)return;this.#busy=false;this.#status.replaceChildren(note(error instanceof Error?error.message:'Could not save bookmark.'));});
    });button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',saved?'Remove saved creation':'Save creation');button.title=saved?'Remove saved creation':'Save creation';button.classList.add('kl-workshop-bookmark');button.replaceChildren(kikiIcon('bookmark'),element('span',{className:'kl-workshop-sr-only',text:saved?'Remove saved creation':'Save creation'}));return button;}catch(error){return note(error instanceof Error?error.message:'Bookmarks are unavailable.');}
  }
  #reportTarget(type:'creation'|'review',id:string,title:string,sourceKey:string,source?:ReportSource):void{
    if(this.#report||!this.#active())return;
    const root=this.element.getRootNode();
    const active=root instanceof ShadowRoot?root.activeElement:document.activeElement;
    const returnFocus=active instanceof HTMLElement&&this.element.contains(active)
      ? active.closest('details')?.querySelector('summary')??active : undefined;
    this.#report=new WorkshopReportDialog(this.client,type,id,title,sourceKey,{source,current:()=>this.#active(),done:report=>{
      this.#report=undefined;
      if(report)this.#status.replaceChildren(note(`Report #${report} submitted. Follow its status in My reports.`));
      if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    }});
    this.element.append(this.#report.element);
  }
  async #reviewCopy(saved:LocalWorkshopDraft):Promise<void>{
    if(!this.#drafts||!this.#active()||this.#retry)return;
    const raw=JSON.stringify(saved),token=++this.#token,valid=()=>this.#active()&&this.#scope==='local'&&this.#token===token&&JSON.stringify(this.#drafts!.list().find(v=>v.id===saved.id))===raw;
    this.#busy=true;this.#status.replaceChildren(note('Checking a new copy and its dependencies…'));
    try{
      const me=await this.client.request<{memberNumber:number;features?:Record<string,boolean>}>('GET','/v1/me');if(!valid())return;
      if(me.memberNumber!==this.#member||me.features?.workshopPublications!==true)throw new Error('Workshop publication is unavailable.');
      const source=workshopSource(me),access=workshopAccessAt(this.client,source,valid),dependencies:string[]=[];
      for(const dep of saved.draft.deps??[]){const detail=checkedWorkshopDetail(await access.request('GET','/v1/workshop/'+dep.id));if(detail.id!==dep.id||detail.status!=='published')throw new Error('A dependency is unavailable. Keep the original and review its dependencies.');dependencies.push(`${detail.title} · current ${detail.version} · requires ${dep.minVersion}`);}
      if(!valid())return;this.#busy=false;
      this.#status.replaceChildren(note(`Review a separate new creation from “${saved.draft.title||'Untitled draft'}”? The original local draft is kept. This copy will not update its previous package or retain its remix link. Nothing is published.`),...dependencies.map(note),this.#button('Create reviewed copy',()=>{
        if(!valid())return;this.#busy=true;const copy:LocalWorkshopDraft={...structuredClone(saved),id:crypto.randomUUID(),context:{fixedType:false,packageId:null,revision:null,remix:null,source}};
        void this.#drafts!.put(copy,copy.id,null,valid).then(()=>{if(valid()){this.#busy=false;this.#edit(undefined,undefined,undefined,copy);}}).catch(error=>{if(this.#localActive()){this.#busy=false;this.#status.replaceChildren(note(error instanceof Error?error.message:'Could not keep the new copy.'));}});
      }),this.#button('Keep original draft',()=>this.#connectionNote(),true));
    }catch(error){if(this.#localActive()){this.#busy=false;this.#status.replaceChildren(note(error instanceof Error?error.message:'Could not review the copy.'));}}finally{if(this.#token===token)this.#busy=false;}
  }
  #edit(detail?:WorkshopDetail,prepared?:WorkshopDraft,remix?:{id:string;version:string},local?:LocalWorkshopDraft,localOnly=false,originalSource?:WorkshopSource):void {
    const release=detail?.versions.find(version=>version.version===detail.version),draft=local?.draft??prepared??(detail?.draft?copyWorkshopDraft(detail.draft):release?{...copyWorkshopDraft(release),version:nextWorkshopVersion(release.version),changelog:''}:newWorkshopDraft());
    const captured=originalSource??(detail?this.#reviewSources.get(detail):this.#source);
    const context=local?.context??{fixedType:!!detail?.version||!!detail?.remixSource||!!remix,packageId:detail?.id??null,revision:detail?.revision??null,remix:remix??null,...captured?{source:captured}:{}},localId=local?.id??crypto.randomUUID();
    this.#stopAutosave();this.#checkpoint=local?{id:local.id,expected:JSON.stringify(local)}:undefined;
    this.#status.replaceChildren();this.#editor=new WorkshopEditor(draft,{title:context.remix?'Remix a package':context.packageId||local?'Edit your package':'Create a package',fixedType:context.fixedType||!!context.packageId&&!local&&!this.#draftTypesSupported,...local?{state:local}:{},...this.#drafts?{
      changed:state=>this.#autosave?.changed(state),retryAutosave:()=>{void this.#autosave?.flush().catch(()=>{});},checkpoint:async state=>{
        const editor=this.#editor,autosave=this.#autosave;
        if(!editor||!autosave)throw new Error('This editor closed.');
        await autosave.flush(state);
        if(!this.options.current()||editor!==this.#editor)return;
        this.#stopAutosave();this.#closeEditor();this.#checkpoint=undefined;this.#package=undefined;this.#scope='local';if(this.#visible)await this.refresh();
      }}:{},roomOpening:!!local||localOnly||this.#roomOpeningSupported,roomThemes:!!local||localOnly||this.#roomThemesSupported,communityTemplates:!!local||localOnly||this.#communityTemplatesSupported,dependencies:!!local||localOnly||this.#dependenciesSupported,...context.packageId?{packageId:context.packageId}:{},searchDependencies:async query=>{
      const editor=this.#editor;if(!this.#active())throw new Error('Review closed');const params=new URLSearchParams({q:query,limit:'20',...(this.#roomOpeningSupported?{format:'6'}:this.#communityTemplatesSupported?{format:'4'}:this.#roomThemesSupported?{format:'2'}:{})}),page=checkedWorkshopPage(await workshopAccessAt(this.client,context.source??{required:false},()=>this.#active()&&this.#editor===editor).request<Page>('GET','/v1/workshop?'+params),0,20,undefined,true);if(!this.#active()||this.#editor!==editor)throw new Error('Review closed');return page.items;
    },save:value=>{const body={operationId:crypto.randomUUID(),...context.packageId?{revision:context.revision}:{},...context.remix?{version:context.remix.version}:{},draft:value};this.#save(context.packageId?'PUT':'POST',context.packageId?`/v1/workshop/${context.packageId}/draft`:context.remix?`/v1/workshop/${context.remix.id}/remix`:'/v1/workshop',body,context.source,value.title||'Untitled draft');},cancel:()=>{this.#stopAutosave();this.#closeEditor();this.#checkpoint=undefined;void this.refresh();}});
    if(this.#drafts){
      const editor=this.#editor,member=this.client.memberNumber;
      this.#autosave=new WorkshopAutosave(this.#drafts,{id:localId,context,...local?{initial:local}:{},current:()=>this.options.current()&&member===this.client.memberNumber&&editor===this.#editor,status:value=>editor.autosaveStatus(value),committed:value=>{this.#checkpoint={id:value.id,expected:JSON.stringify(value)};this.#automaticSync?.schedule();}});
      editor.autosaveStatus({state:local?'saved':'idle',message:local?'Saved on this device.':'Edits will be saved on this device.'});
    }
    this.#editor.cloudAvailable(this.client.connected);if(!this.client.connected)this.#connectionNote();this.#shell();
  }
  #confirm(detail:WorkshopDetail,action:'publish'|'archive'|'discard'):void {
    const label=action==='publish'?'Publish this version':action==='archive'?'Confirm archive':'Confirm discard';
    this.#status.replaceChildren(note(action==='publish'?`Publish ${detail.draft!.title} ${detail.draft!.version} as ${detail.draft!.visibility}? Published versions cannot be edited. You can archive the creation later.`:action==='archive'?'Archive this creation and remove it from browsing and profiles?':'Discard the saved draft? Published versions are kept.'),this.#button(label,()=>this.#save('POST',`/v1/workshop/${detail.id}/${action}`,{operationId:crypto.randomUUID(),revision:detail.revision},this.#reviewSources.get(detail),`${detail.draft?.title??detail.title} · v${detail.draft?.version??detail.version??'draft'}`)),this.#button('Keep creation',()=>this.#status.replaceChildren()));
  }
  #save(method:'PUT'|'POST',path:string,body:unknown,source?:WorkshopSource,label='Workshop creation'):void {
    if(!this.#outbox){this.#legacySave(method,path,body,source,label);return;}
    if(this.#retry||!this.#active())return;
    const member=this.client.memberNumber,generation=++this.#saveGeneration,valid=()=>this.options.current()&&this.client.memberNumber===member&&this.#saveGeneration===generation;
    const editor=this.#editor,autosave=this.#autosave,frozen=structuredClone(body);
    this.#busy=true;this.#preparing=true;editor?.busy(true);this.#retry=async()=>{};this.#status.replaceChildren(note('Keeping this request on your device before sending…'));
    void (async()=>{
      if(autosave&&editor)await autosave.flush(editor.snapshot());
      if(!valid())return;
      const pending=checkedWorkshopPendingSave({format:source?.required?2:1,...source?.required?{source,label}:{},method,path,body:frozen,createdAt:Date.now(),checkpoint:this.#checkpoint?JSON.parse(this.#checkpoint.expected):null,receipt:null});
      await this.#outbox!.prepare(pending,valid);
      if(!valid())return;this.#preparing=false;this.#busy=false;this.#pendingView(pending);
      if(this.#active())await this.#runPending(pending);
    })().catch(error=>{
      if(!valid())return;this.#preparing=false;this.#busy=false;this.#retry=undefined;this.#editor?.busy(false);
      this.#status.replaceChildren(note(error instanceof Error?error.message:'Could not keep this request.'),note('Nothing was sent. Your draft stays open. If another save is pending, cancel editing and reopen Workshop to recover it.'));
    });
  }
  #pendingView(pending:WorkshopPendingSave,message?:string):void {
    this.#pendingMessage=message??(this.#pending?.body.operationId===pending.body.operationId?this.#pendingMessage:undefined);
    this.#stopAutosave();this.#pending=pending;this.#retry=()=>this.#runPending(pending);this.#closeEditor();this.#shell();
    const draft=pending.body.draft;
    this.#body.replaceChildren(element('section',{className:'kl-workshop-card',ariaLabel:'Pending Workshop save'},element('h2',{text:'Pending Workshop save'}),element('h3',{text:workshopSaveLabel(pending)}),...draft?[note(draft.title),note(`${draft.type} · v${draft.version} · ${draft.visibility}`),note(draft.description)]:[note(pending.label??'Previously reviewed creation')],note(pending.receipt?'Cloud confirmed this request. Retry finishes its local cleanup without sending it again.':'Saved on this device. Cloud may already have completed it. Retry uses the same request.'),...draft?[element('details',{},element('summary',{text:'Submitted content'}),workshopPayloadView(draft))]:[]));
    this.#status.replaceChildren(...this.#pendingMessage?[note(this.#pendingMessage)]:[],element('div',{className:'kl-workshop-actions'},this.#button(pending.receipt&&pending.format===2?'Finish confirmed save':'Retry save',()=>void this.#runPending(pending),!!pending.receipt),...pending.receipt?[]:[this.#button('Forget pending save',()=>{
      this.#status.replaceChildren(note('Cloud may already have completed this request. Forgetting removes this submitted request from your device; it does not undo anything in Cloud. Existing local drafts are kept. Check My creations before starting another save.'),this.#button('Confirm forget pending save',()=>void this.#forgetPending(pending),true),this.#button('Keep pending save',()=>this.#pendingView(pending),true));
    },true)],...this.#drafts?[this.#button('Local drafts',()=>this.#openLocalDrafts(),true)]:[],this.#button('Reopen Workshop',()=>{this.#retry=undefined;this.#pending=undefined;void this.refresh();},true)));
  }
  async #runPending(pending:WorkshopPendingSave):Promise<void>{
    if(!this.#outbox||!this.#localActive()||!pending.receipt&&!this.client.connected)return;
    const member=this.client.memberNumber,generation=this.#saveGeneration,valid=()=>this.#localActive()&&member===this.client.memberNumber&&generation===this.#saveGeneration;
    this.#busy=true;this.#pending=pending;this.#pendingMessage=undefined;this.#retry=()=>this.#runPending(pending);this.#status.replaceChildren(note(pending.receipt?'Finishing local recovery…':'Checking the saved request…'));
    try{
      const result=await this.#outbox.run(pending,valid,async (record,unchanged)=>{
        const me=await this.client.request<{memberNumber:number;features?:Record<string,boolean>}>('GET','/v1/me');
        if(!valid()||!this.client.connected||me.memberNumber!==member)throw new Error('Your Cloud session changed. The saved request is kept.');
        requireWorkshopSource(record.source,workshopSource(me));unchanged();
        const type=record.body.draft?.type,feature=type==='Community template'?'workshopCommunityTemplates':['Room preset','Background','UI theme'].includes(type??'')?'workshopRoomThemes':undefined;
        if(extendedRoomDraft(record.body.draft)&&me.features?.roomOpening!==true)throw new Error('These room settings need the pending Cloud update. The saved request is kept.');
        if(me.features?.workshopPublications!==true||feature&&me.features?.[feature]!==true||record.body.draft?.deps?.length&&me.features?.workshopDependencies!==true)throw new Error('This saved request needs the pending Cloud update. It is kept on this device.');
        unchanged();return this.client.request(record.method,record.path,{...record.body,...record.source?.required?{recoveryGeneration:record.source.generation}:{}});
      },async (record,unchanged)=>{
        if(!record.checkpoint||!this.#drafts)return'';
        const actual=this.#drafts.list().find(draft=>draft.id===record.checkpoint!.id);
        if(!actual)return'';
        if(JSON.stringify(actual)!==JSON.stringify(record.checkpoint))return'Saved to Cloud. Another tab changed the local checkpoint, so it was kept. Review Local drafts before reusing it.';
        await this.#drafts.put(null,actual.id,JSON.stringify(actual),()=>{unchanged();return valid();});return'';
      });
      if(!valid())return;this.#pending=undefined;this.#retry=undefined;this.#checkpoint=undefined;this.#closeEditor();this.#busy=false;this.#package=result.receipt.deleted?undefined:result.receipt.packageId;this.#scope='mine';this.#resetCatalog();
      if(pending.receipt){this.#shell();this.#body.replaceChildren(note('Confirmed Workshop save finished on this device.'),this.#button('Reopen Workshop',()=>void this.refresh(),true));if(result.warning)this.#status.replaceChildren(note(result.warning));return;}
      if(this.#visible){await this.refresh();if(result.warning)this.#status.replaceChildren(note(result.warning));}
    }catch(error){
      if(!valid()){if(this.#localActive()&&this.#pending?.body.operationId===pending.body.operationId&&!this.#busy){try{const saved=this.#outbox.read();if(saved?.receipt)this.#pendingView(saved);}catch{}}return;}this.#busy=false;let latest=pending;
      try{const saved=this.#outbox.read();if(!saved){this.#retry=undefined;this.#pending=undefined;this.#checkpoint=undefined;this.#closeEditor();if(this.#visible)await this.refresh();return;}latest=saved;}catch{/* Keep the frozen review; storage errors never reset it. */}
      const message=error instanceof CloudError?(error.status===429?'Too many requests. Wait a moment, then retry the saved request.':error.status>=400&&error.status<500&&error.status!==408?'Cloud rejected this request. The saved request is kept; reconnect or review the creation before forgetting it.':'The result is uncertain. The same request is saved on this device for retry.'):error instanceof Error?error.message:'The saved request could not be completed.';
      this.#pendingView(latest,message);
    }
  }
  async #forgetPending(pending:WorkshopPendingSave):Promise<void>{
    if(!this.#outbox||!this.#localActive())return;
    const member=this.client.memberNumber,generation=this.#saveGeneration,valid=()=>this.options.current()&&member===this.client.memberNumber&&generation===this.#saveGeneration;
    this.#busy=true;
    try{await this.#outbox.forget(pending,valid);if(!valid())return;this.#pending=undefined;this.#retry=undefined;this.#checkpoint=undefined;this.#closeEditor();this.#busy=false;this.#package=undefined;this.#scope='mine';this.#resetCatalog();if(this.#visible){await this.refresh();this.#status.replaceChildren(note('Local retry record forgotten. Any Cloud result and existing local drafts were kept.'));}}
    catch(error){if(valid()){this.#busy=false;this.#pendingView(pending,error instanceof Error?error.message:'Could not forget the local retry record.');}}
  }
  #legacySave(method:'PUT'|'POST',path:string,body:unknown,source?:WorkshopSource,label='Workshop creation'):void {
    if(this.#retry)return;const member=this.client.memberNumber;
    const attempt=async()=>{
      if(!this.#active()||this.client.memberNumber!==member)return;this.#busy=true;this.#editor?.busy(true);this.#status.replaceChildren(note('Saving…'));
      try{
        const me=await this.client.request<unknown>('GET','/v1/me');if(!this.#active()||member!==this.client.memberNumber)return;requireWorkshopSource(source,workshopSource(me));const pending=checkedWorkshopPendingSave({format:source?.required?2:1,...source?.required?{source,label}:{},method,path,body,createdAt:Date.now(),checkpoint:null,receipt:null});
        const receipt=checkedWorkshopReceipt(await this.client.request<unknown>(method,path,{...body as object,...source?.required?{recoveryGeneration:source.generation}:{}}),pending);if(!this.options.current()||this.client.memberNumber!==member)return;
        if(!workshopId(receipt.packageId)||!receipt.deleted&&(!Number.isSafeInteger(receipt.revision)||receipt.revision!<=0))throw new Error('Invalid receipt');
        let cleanup='';const checkpoint=this.#checkpoint;this.#checkpoint=undefined;
        if(checkpoint&&this.#drafts)try{await this.#drafts.put(null,checkpoint.id,checkpoint.expected);}catch{cleanup='Saved to Cloud. The local checkpoint could not be removed; review Local drafts before reusing it.';}
        if(!this.options.current()||this.client.memberNumber!==member)return;
        this.#retry=undefined;this.#closeEditor();this.#busy=false;this.#package=receipt.deleted?undefined:receipt.packageId;this.#scope='mine';this.#resetCatalog();if(this.#visible){await this.refresh();if(cleanup)this.#status.replaceChildren(note(cleanup));}
      }catch(error){
        if(!this.options.current())return;this.#busy=false;
        if(error instanceof CloudError&&error.status>=400&&error.status<500&&error.status!==408){this.#retry=undefined;this.#editor?.busy(false);this.#status.replaceChildren(note(error.status===409?`Could not save: ${error.code}. Your unsaved draft is kept. Cancel editing and reload to resolve a newer revision, or choose a higher version before publishing.`:error.status===429?'Too many requests. Wait a moment, then try again.':'Could not save. Check your fields and Cloud access.'));}
        else this.#status.replaceChildren(note('The save result is uncertain. Retry the same operation to recover it safely.'),this.#button('Retry save',()=>void attempt()));
      }
    };
    this.#retry=attempt;void attempt();
  }
}
