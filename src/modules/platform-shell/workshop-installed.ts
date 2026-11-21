import {type WorkshopSource} from './workshop-engagement';
import type {WorkshopInstallSharing,SharedInstallations} from './workshop-install-sharing';
import {WorkshopSpaceReview} from './workshop-space-review';
import {applyWorkshopUITheme,workshopUIFingerprint} from './workshop-destinations-model';
import {WORKSHOP_DESTINATION_TYPES,workshopPaletteReadable,type WorkshopUIPayload} from '../../core/workshop-destinations';
import {WORKSHOP_FILE_MAX_BYTES,parseWorkshopPackageFile,exportWorkshopPackageFile,workshopFilePlan,resolveWorkshopPlan,verifyWorkshopPlan,downloadWorkshopPackageFile} from './workshop-package-files';
import {CloudError,type CloudClient} from '../../cloud/client';
import {element} from '../../cloud/dom';
import {kikiIcon} from '../link-chat/icons';
import {focusedElement} from '../../utils/dom';
import type {KeyValueStorage,SettingsStore} from '../../core/settings';
import {WORKSHOP_TYPES,workshopNote as note,workshopPayloadView,workshopTypePreview,type WorkshopDetail,type WorkshopRelease} from './workshop-model';
import {WorkshopLibrary,checkedWorkshopRelease,compareWorkshopVersions,installedFingerprint,workshopProfilePatch,workshopActivityCopies,addWorkshopActivities,type InstalledWorkshopPackage,type WorkshopIdentity,type WorkshopInstallationPlan,type WorkshopProfilePatch} from './workshop-installation-model';
import {workshopPermissionList} from './workshop-overview';
import {fitPanelDialog} from './panel-dialog-layout';
import {ShellActionMenu,type ShellAction} from './action-menu';
import type {WorkshopBookmarks} from './workshop-discovery';
export interface WorkshopInstallationOptions {storage:KeyValueStorage;settings:SettingsStore;updatesChanged?(count:number):void;profile(patch:WorkshopProfilePatch,current:()=>boolean):Promise<void>;openSpace?(id:string):void;communityTemplate?(item:InstalledWorkshopPackage,current:()=>boolean):Promise<void>;}
interface CatalogActions {
  primary: HTMLElement;
  versions: ReadonlyMap<WorkshopRelease, HTMLElement>;
  guard(action:()=>void): void;
  showOverview(): void;
  reviewPublished(): void;
  showInstalledList(): void;
}
export class WorkshopInstalled {
  readonly element=element('section',{className:'kl-workshop-installed',ariaLabel:'Installed packages'});
  readonly library:WorkshopLibrary;
  #discoverySupported=false;#sharingSource:WorkshopSource|undefined;readonly #installedSources=new Map<string,WorkshopSource>();
  setDiscoverySupported(value:boolean):void{this.#discoverySupported=value;}
  #dependenciesSupported=false;#roomThemesSupported=false;#communityTemplatesSupported=false;
  setCommunityTemplatesSupported(value:boolean):void{this.#communityTemplatesSupported=value;}
  setRoomThemesSupported(value:boolean):void{this.#roomThemesSupported=value;}
  setDependenciesSupported(value:boolean):void{this.#dependenciesSupported=value;}
  #token=0;#review=false;#busy=false;#query='';#type='';#back:(()=>void)|undefined;readonly #updates=new Map<string,string>();
  #savedOnly=false;#sort:'newest'|'title'='newest';
  readonly #availableUpdates=new Map<string,{detail:WorkshopDetail;release:WorkshopRelease}>();
  readonly #menu=new ShellActionMenu();
  #catalog: {detail:WorkshopDetail;actions:CatalogActions} | undefined;
  #dialog: HTMLDialogElement | undefined;
  #reviewAnchor: HTMLElement | undefined;
  constructor(readonly client:CloudClient,readonly options:WorkshopInstallationOptions,readonly active:()=>boolean,readonly sharing?:WorkshopInstallSharing,readonly bookmarks?:WorkshopBookmarks,readonly browse?:()=>void){this.library=new WorkshopLibrary(options.storage,client.memberNumber,client.origin,()=>active()&&client.connected);this.#menu.element.id=`kl-workshop-installed-menu-${crypto.randomUUID()}`;}
  get reviewing():boolean{return this.#review||this.#busy;}
  cancel():void{
    this.#clear();
    if(this.#catalog){this.#catalog.actions.primary.replaceChildren();for(const slot of this.#catalog.actions.versions.values())slot.replaceChildren();}
    this.#catalog=undefined;
  }
  #clear():void{
    this.#token++;this.#review=false;this.#busy=false;
    this.#menu.close(false);
    this.#dialog?.close();this.#dialog=undefined;this.#reviewAnchor=undefined;this.element.replaceChildren();
    this.element.classList.remove('kl-workshop-installed-library');
  }
  #button(text:string,action:()=>void):HTMLButtonElement {const button=element('button',{type:'button',className:'kl-text-button',text});button.addEventListener('click',()=>{if(this.active()&&!this.#busy)action();});return button;}
  #error(error:unknown,container=this.element):void{const message=note(error instanceof CloudError&&[403,404].includes(error.status)?'This publication is private or no longer available. Your installed copy is kept.':error instanceof Error?error.message:'The action could not finish.');message.setAttribute('role','alert');container.append(message);}
  #run(action:()=>Promise<unknown>,done:()=>void):void {
    const token=this.#token;this.#busy=true;
    const controls=[...(this.#dialog??this.element).querySelectorAll<HTMLButtonElement|HTMLInputElement|HTMLSelectElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
    for(const control of controls)control.disabled=true;
    const unlock=()=>{this.#busy=false;for(const control of controls)control.disabled=false;};
    void action().then(()=>{if(this.active()&&token===this.#token){unlock();this.#review=false;this.#notifyUpdates();done();}}).catch(error=>{
      if(!this.active()||token!==this.#token)return;
      unlock();
      if(this.#dialog?.open){
        const body=this.#dialog.querySelector<HTMLElement>('.kl-workshop-install-body')!;
        body.replaceChildren();this.#error(error,body);
        this.#dialog.querySelector('footer')?.replaceChildren(this.#button('Close',()=>this.#closeReview()));
        this.#dialog.querySelector<HTMLButtonElement>('footer button')?.focus();
      }else{
        this.#review=false;this.element.replaceChildren(this.#button('Back to Installed',()=>this.list()));this.#error(error);
      }
    });
  }
  clearUpdateNotices():void {
    this.#availableUpdates.clear();
    this.#updates.clear();
    this.options.updatesChanged?.(0);
  }
  #notifyUpdates():void {
    if (!this.options.updatesChanged || !this.#availableUpdates.size) {
      this.options.updatesChanged?.(0);
      return;
    }
    try {
      const count = this.library.list().filter(item => {
        const update = this.#availableUpdates.get(item.id);
        return update && compareWorkshopVersions(update.release.version, item.release.version) > 0;
      }).length;
      this.options.updatesChanged(count);
    } catch { this.options.updatesChanged(0); }
  }
  list():void {
    this.cancel();this.#sharingSource=undefined;this.#back=()=>this.list();
    this.element.classList.add('kl-workshop-installed-library');
    try{
      const search=element('input',{type:'search',ariaLabel:'Search installed packages',placeholder:'Search creations, creators or tags…',maxLength:80,value:this.#query}),type=element('select',{ariaLabel:'Installed package type'});type.append(element('option',{value:'',text:'All types'}),...WORKSHOP_TYPES.map(value=>element('option',{value,text:value})));type.value=this.#type;
      const filter=(focusSearch=false)=>{
        if(!this.active()||this.#busy||!search.isConnected)return;
        const selection=[search.selectionStart,search.selectionEnd],focusType=focusedElement(this.element)===type;this.#query=search.value;this.#type=type.value;this.list();
        if(focusSearch){const next=this.element.querySelector<HTMLInputElement>('.kl-workshop-search-field input');next?.focus({preventScroll:true});if(next&&selection[0]!==null&&selection[1]!==null)next.setSelectionRange(selection[0]!,selection[1]!);}
        else if(focusType)this.element.querySelector<HTMLSelectElement>('[aria-label="Installed package type"]')?.focus({preventScroll:true});
      };
      type.addEventListener('change',()=>filter());
      const searchButton=element('button',{type:'submit',className:'kl-text-button kl-workshop-search-submit',ariaLabel:'Search installed',title:'Search installed'},kikiIcon('search'));
      const clearSearch=this.#button('Clear installed search',()=>{search.value='';filter(true);});
      clearSearch.classList.add('kl-workshop-search-clear');clearSearch.setAttribute('aria-label','Clear installed search');clearSearch.title='Clear installed search';clearSearch.replaceChildren(kikiIcon('close'));
      const updateClear=()=>{clearSearch.hidden=!search.value;};search.addEventListener('input',event=>{updateClear();if(!(event as InputEvent).isComposing)filter(true);});search.addEventListener('compositionend',()=>filter(true));updateClear();
      const form=element('form',{className:'kl-workshop-search',ariaLabel:'Filter installed packages'},element('div',{className:'kl-workshop-search-field'},searchButton,search,clearSearch),type);
      form.addEventListener('submit',event=>{event.preventDefault();filter(true);});
      const update=this.#button('Check for updates',()=>this.#checkUpdates());update.classList.add('kl-workshop-update-button');update.prepend(kikiIcon('refresh'));
      const toolbar=element('div',{className:'kl-workshop-library-toolbar'},update,note('Updates are reviewed before any version changes.'));
      const filters=element('div',{className:'kl-workshop-filter-row'});
      if(this.bookmarks){
        const scopes=element('div',{className:'kl-workshop-scopes',role:'group',ariaLabel:'Installed library filters'});
        for(const [label,saved] of [['All',false],['Saved',true]] as const){const control=this.#button(label,()=>{this.#savedOnly=saved;this.list();});control.setAttribute('aria-pressed',String(this.#savedOnly===saved));scopes.append(control);}
        filters.append(scopes);
      }
      const sort=element('select',{ariaLabel:'Sort installed creations'});sort.append(element('option',{value:'newest',text:'Newest'}),element('option',{value:'title',text:'Title A–Z'}));sort.value=this.#sort;
      sort.addEventListener('change',()=>{if(!this.active()||this.#busy||!sort.isConnected)return;const restoreFocus=focusedElement(this.element)===sort;this.#sort=sort.value==='title'?'title':'newest';this.list();if(restoreFocus)this.element.querySelector<HTMLSelectElement>('[aria-label="Sort installed creations"]')?.focus({preventScroll:true});});
      filters.append(element('div',{className:'kl-workshop-sort-controls'},element('label',{},'Sort',sort)));
      const clear=()=>{this.#query='';this.#type='';this.#savedOnly=false;this.list();};
      const activeFilters=element('div',{className:'kl-workshop-active-filters'});if(this.#query||this.#type||this.#savedOnly){if(this.#type)activeFilters.append(element('span',{className:'kl-workshop-tag',text:this.#type}));activeFilters.append(this.#button('Clear filters',clear));}
      this.element.append(element('h2',{className:'kl-workshop-installed-title',text:'Installed'}),form,filters,activeFilters,toolbar);
      const saved=this.#savedOnly?this.bookmarks?.list():undefined;
      const installed=this.library.list(),byId=new Map(installed.map(item=>[item.id,item])),ready=new Map<string,boolean>();
      const usable=(item:InstalledWorkshopPackage,path=new Set<string>()):boolean=>{if(ready.has(item.id))return ready.get(item.id)!;if(path.has(item.id))return false;const next=new Set(path).add(item.id);const valid=item.enabled&&item.release.permissions.every(permission=>item.grantedPermissions.includes(permission))&&(item.release.deps??[]).every(dep=>{const child=byId.get(dep.id);return !!child&&compareWorkshopVersions(child.release.version,dep.minVersion)>=0&&usable(child,next);});ready.set(item.id,valid);return valid;};
      const query=this.#query.normalize('NFKC').trim().toLowerCase();
      const items=installed.filter(item=>(!this.#type||item.release.type===this.#type)&&(!saved||saved.includes(item.id))&&`${item.release.title} ${item.authorName} ${item.release.tags.join(' ')}`.normalize('NFKC').toLowerCase().includes(query));
      items.sort((a,b)=>this.#sort==='title'?a.release.title.localeCompare(b.release.title)||a.id.localeCompare(b.id):b.installedAt-a.installedAt||a.id.localeCompare(b.id));
      this.element.append(element('p',{className:'kl-workshop-results',role:'status',text:`${items.length} ${items.length===1?'creation':'creations'}`}));
      if(!items.length){
        const clearFilters=this.#button('Clear filters',clear),browse=this.browse?this.#button('Browse Workshop',this.browse):undefined;browse?.classList.add('kl-workshop-action-primary');
        this.element.append(element('section',{className:'kl-workshop-empty'},kikiIcon('brush'),element('h2',{text:'Your library starts here'}),note('Try another search, clear a filter, or browse the Workshop.'),clearFilters,browse),this.#menu.element);
        return;
      }
      const list=element('div',{className:'kl-workshop-installed-list'}),listToken=this.#token;
      const unchanged=(item:InstalledWorkshopPackage)=>{try{return this.active()&&listToken===this.#token&&installedFingerprint(this.library.get(item.id))===installedFingerprint(item);}catch{return false;}};
      for(const item of items){
        const state=item.enabled?(usable(item)?'Enabled':'Needs attention'):'Disabled';
        const available=this.#availableUpdates.get(item.id),hasUpdate=available&&compareWorkshopVersions(available.release.version,item.release.version)>0;
        const updateMessage=this.#updates.get(item.id);
        const open=()=>this.installed(item.id);
        const title=this.#button(item.release.title,open);title.className='kl-workshop-title';title.title=item.release.title;
        const toggle=this.#button(item.enabled?'Disable':'Enable',()=>{if(unchanged(item))item.enabled?this.#remove(item,false,true):this.#installReview(item,item.release,false,toggle);});toggle.setAttribute('aria-pressed',String(item.enabled));
        const more=this.#button('',()=>this.#openOptions(item,more));more.classList.add('kl-workshop-installed-options');more.setAttribute('aria-label',`${item.release.title} library options`);more.title=`${item.release.title} library options`;more.setAttribute('aria-haspopup','menu');more.setAttribute('aria-expanded','false');more.append(kikiIcon('more'));
        const actions=element('div',{className:'kl-workshop-installed-actions'},toggle);
        if(hasUpdate){const review=this.#button('Review update',()=>{if(unchanged(item))this.#installReview(available.detail,available.release,true,review);});review.classList.add('kl-workshop-action-primary');actions.append(review);}
        actions.append(more);
        const row=element('article',{className:'kl-workshop-card kl-workshop-installed-row'},workshopTypePreview(item.release.type),
          element('div',{className:'kl-workshop-installed-copy'},element('h3',{},title),
            note(`v${item.release.version} · ${item.release.type} · ${state}`),hasUpdate?element('span',{className:'kl-workshop-badge kl-workshop-badge--update',text:`v${available.release.version} available`}):updateMessage?note(updateMessage):undefined),actions);
        row.dataset.packageId=item.id;row.dataset.enabled=String(item.enabled);list.append(row);
      }
      this.element.append(list,this.#menu.element);
    }catch(error){this.#error(error);}
  }
  #openOptions(item:InstalledWorkshopPackage,anchor:HTMLElement):void {
    if(!anchor.isConnected||!this.active()||this.#busy)return;
    const token=this.#token,valid=()=>{try{return this.active()&&token===this.#token&&installedFingerprint(this.library.get(item.id))===installedFingerprint(item);}catch{return false;}};
    const run=(action:()=>void)=>()=>{if(valid())action();};
    const entries:ShellAction[]=[{label:'Open installed package',icon:'brush',run:run(()=>this.installed(item.id))},{label:'Review published versions',icon:'refresh',run:run(()=>this.#published(item.id))},
      {label:item.enabled?'Disable package':'Enable package',icon:'check',run:run(()=>item.enabled?this.#remove(item,false,true):this.#installReview(item,item.release,false,anchor))}];
    if(this.bookmarks){try{const saved=this.bookmarks.list().includes(item.id);entries.unshift({label:saved?'Remove saved creation':'Save creation',icon:'bookmark',run:run(()=>this.#run(()=>this.bookmarks!.set(item.id,!saved,saved),()=>this.list()))});}catch(error){this.#error(error);}}
    if(item.previous)entries.push({label:`Review rollback to ${item.previous.version}`,icon:'refresh',run:run(()=>this.#installReview(item,item.previous!,false,anchor))});
    if(this.#dependenciesSupported)entries.push({label:'Export package file',icon:'copy',run:run(()=>{try{downloadWorkshopPackageFile(exportWorkshopPackageFile(this.client.origin,item.id,this.library.list()),item.id);}catch(error){this.#error(error);}})});
    entries.push({label:'Uninstall',icon:'close',separator:true,run:run(()=>this.#uninstallReview(item,anchor))});
    this.#menu.open(anchor,'Creation options',entries,undefined,true,false);
  }
  #checkUpdates():void {
    const token=this.#token;this.#run(async()=>{
      for(const item of this.library.list()){
        if(!this.active()||token!==this.#token)return;
        try{const detail=await this.client.request<WorkshopDetail>('GET','/v1/workshop/'+item.id);if(!this.active()||token!==this.#token)return;if(installedFingerprint(this.library.get(item.id))!==installedFingerprint(item)){this.#availableUpdates.delete(item.id);continue;}this.#availableUpdates.delete(item.id);if(detail.id!==item.id||detail.author!==item.author||detail.type!==item.release.type)throw new Error('Identity changed');const release=detail.versions.find(version=>version.version===detail.version);if(detail.status!=='published'||!release){this.#updates.set(item.id,'No accessible published update.');continue;}checkedWorkshopRelease(release);this.#availableUpdates.set(item.id,{detail,release});this.#updates.set(item.id,compareWorkshopVersions(release.version,item.release.version)>0?`Version ${release.version} is available. Open the package to review it.`:'No newer published version.');}
        catch(error){if(!this.active()||token!==this.#token)return;this.#availableUpdates.delete(item.id);this.#updates.set(item.id,error instanceof CloudError&&[403,404].includes(error.status)?'Publication is no longer accessible. Your installed copy is kept.':'Update check could not finish. Try again later.');if(error instanceof CloudError&&error.status===429)break;}
      }
    },()=>this.list());
  }
  catalog(detail:WorkshopDetail,source?:WorkshopSource,actions?:CatalogActions):void {
    this.#sharingSource=source;
    this.cancel();this.#back=()=>this.catalog(detail,source,actions);
    try{
      if(actions){this.#catalog={detail,actions};this.#renderCatalogActions();return;}
      const installed=this.library.get(detail.id);if(installed)this.element.append(note(`Installed ${installed.release.version} · ${installed.enabled?'Enabled':'Disabled'}`),this.#button('View installed version',()=>this.installed(detail.id)));if(detail.status!=='published')return;
      for(const release of [...detail.versions].sort((a,b)=>compareWorkshopVersions(b.version,a.version)))if(installed?.release.version!==release.version)this.element.append(this.#versionButton(detail,release,installed,false));
    }catch(error){this.#error(error);}
  }
  #versionButton(detail:WorkshopDetail,release:WorkshopRelease,installed:InstalledWorkshopPackage|undefined,primary:boolean):HTMLButtonElement {
    const label=`${installed?'Review version':'Install version'} ${release.version}`;
    const button=this.#button(primary?(installed?'Review update':'Install'):label,()=>{
      const review=()=>this.#installReview(detail,release,true,button);
      if(this.#catalog)this.#catalog.actions.guard(()=>{if(button.isConnected)review();});else review();
    });
    if(primary){
      button.classList.add('kl-workshop-action-primary');
      button.setAttribute('aria-label',label);
      button.prepend(kikiIcon(installed?'refresh':'plus'));
    }
    return button;
  }
  #renderCatalogActions():void {
    if(!this.#catalog)return;
    const {detail,actions}=this.#catalog;
    const installed=this.library.get(detail.id);
    actions.primary.replaceChildren();
    if(installed){
      const open=this.#button(installed.enabled?'Installed':'Installed · Disabled',()=>actions.guard(()=>{if(open.isConnected)this.installed(detail.id);}));
      open.setAttribute('aria-label','View installed version');
      open.prepend(kikiIcon('check'));
      open.classList.add('kl-workshop-action-installed');
      actions.primary.append(open);
    }
    const latest=detail.versions.find(release=>release.version===detail.version);
    if(detail.status==='published'&&latest&&installed?.release.version!==latest.version)
      actions.primary.append(this.#versionButton(detail,latest,installed,true));
    for(const [release,slot] of actions.versions){
      slot.replaceChildren();
      if(installed?.release.version===release.version)slot.append(element('span',{className:'kl-workshop-badge',text:'Installed'}));
      else if(detail.status==='published')slot.append(this.#versionButton(detail,release,installed,false));
    }
  }
  installed(id:string):void {
    const afterReview=this.#dialog?.open===true;
    this.#clear();this.#sharingSource=this.#installedSources.get(id);this.#back=()=>this.installed(id);
    try{
      this.#renderCatalogActions();
      const item=this.library.get(id);if(!item){this.list();return;}
      const heading=element('h2',{text:item.release.title,tabIndex:-1});
      this.element.append(heading,note(`${item.release.type} · Installed version ${item.release.version} · ${item.enabled?'Enabled':'Disabled'} · ${item.authorName}`),note(item.release.description),workshopPayloadView(item.release),this.#button('Back to Installed',()=>this.#showInstalledList()),this.#button('Review published versions',()=>{if(this.#catalog)this.#catalog.actions.reviewPublished();else this.#published(id);}));
      const options=element('details',{className:'kl-workshop-secondary-actions'},element('summary',{text:'Installation options'}));this.element.append(options);
      options.append(item.enabled?this.#button('Disable package',()=>this.#remove(item,false)):this.#button('Review permissions and enable',()=>this.#installReview(item,item.release,false)));
      if(item.previous)options.append(this.#button(`Review rollback to ${item.previous.version}`,()=>this.#installReview(item,item.previous!,false)));
      if(this.#dependenciesSupported)options.append(this.#button('Export package file',()=>{try{downloadWorkshopPackageFile(exportWorkshopPackageFile(this.client.origin,item.id,this.library.list()),item.id);}catch(error){this.#error(error);}}));
      options.append(this.#button('Uninstall package',()=>this.#uninstallReview(item)));
      if(item.enabled&&item.release.permissions.every(permission=>item.grantedPermissions.includes(permission)))this.element.append(this.#button(item.release.type==='Community template'?'Create from template':item.release.type==='Activity pack'?'Review activity copies':item.release.type==='Profile theme'?'Review profile theme':item.release.type==='Room preset'?'Review Space preset':item.release.type==='Background'?'Review Space background':item.release.type==='UI theme'?'Review interface theme':'Choose a status',()=>this.#applyReview(item)));
      if(item.release.type==='Status & emoji'&&!item.release.payload.statuses?.length)this.element.append(note('This version contains emoji previews only; it has no status line to apply.'));
      this.#catalog?.actions.showOverview();
      if(afterReview||this.#catalog)heading.focus();
    }catch(error){this.#error(error);}
  }
  #published(id:string):void {
    const token=this.#token,original=installedFingerprint(this.library.get(id));
    this.#run(async()=>{const detail=await this.client.request<WorkshopDetail>('GET','/v1/workshop/'+id);if(!this.active()||token!==this.#token)return;
      const installed=this.library.get(id);if(installedFingerprint(installed)!==original)throw new Error('This installation changed. Refresh Installed before reviewing versions.');
      if(detail.id!==id||!installed||detail.author!==installed.author||detail.type!==installed.release.type)throw new Error('Package identity changed.');if(detail.status!=='published')throw new Error('This creation is not currently published. Your installed copy is kept.');this.#back=()=>this.installed(id);this.#busy=false;this.catalog(detail);},()=>{});
  }

  #showInstalledList():void{if(this.#catalog)this.#catalog.actions.showInstalledList();else this.list();}
  #installReview(identity:WorkshopIdentity,release:WorkshopRelease,remote:boolean,anchor=focusedElement(this.element)):void {
    if(this.#review||this.#busy)return;
    this.#reviewAnchor=anchor;
    try{
      const checked=checkedWorkshopRelease(release),items=this.library.list();
      if((WORKSHOP_DESTINATION_TYPES as readonly string[]).includes(checked.type)&&!this.#roomThemesSupported)throw new Error('Room, background and interface packages require the pending Cloud update.');
      if(checked.deps?.length){
        if(!this.#dependenciesSupported)throw new Error('Dependencies require the pending Cloud update.');const token=this.#token;let plan:WorkshopInstallationPlan;this.#review=true;this.#run(async()=>{plan=await resolveWorkshopPlan(this.client,identity,checked,remote,items,()=>this.active()&&token===this.#token);},()=>this.#planReview(plan));
      }else this.#planReview({rootId:identity.id,entries:[{meta:{id:identity.id,author:identity.author,authorName:identity.authorName},release:checked,remote}],expectedState:JSON.stringify(items)});
    }catch(error){this.#error(error);}
  }
  #planReview(plan:WorkshopInstallationPlan):void {
    if(plan.entries.some(e=>e.release.type==='Community template')&&!this.#communityTemplatesSupported)throw new Error('Community templates require the pending Cloud update.');
    if(plan.entries.some(entry=>(WORKSHOP_DESTINATION_TYPES as readonly string[]).includes(entry.release.type))&&!this.#roomThemesSupported)throw new Error('Room, background and interface packages require the pending Cloud update.');
    const root=plan.entries.find(entry=>entry.meta.id===plan.rootId)!,installed=this.library.get(plan.rootId),multiple=plan.entries.length>1;this.#review=true;
    const shared=plan.entries.filter(e=>e.release.visibility==='public').map(e=>({packageId:e.meta.id,version:e.release.version})),share=this.#discoverySupported&&this.sharing&&shared.length?element('input',{type:'checkbox',ariaLabel:'Share this installation'}):undefined;
    const sharingSource=this.#sharingSource,sharingToken=this.#token,sharingCurrent=()=>this.active()&&sharingToken===this.#token;let sharingReview:Promise<SharedInstallations>|undefined;
    const capture=()=>{const task=this.sharing!.shareReview(sharingSource,sharingCurrent);void task.catch(()=>{});return task;};
    share?.addEventListener('change',()=>{if(sharingCurrent()&&!this.#busy)sharingReview=share.checked?capture():undefined;});
    const label=multiple?'Allow these package permissions and dependencies':'Allow this package permission',consent=element('input',{type:'checkbox',ariaLabel:label}),confirm=this.#button(installed?'Apply reviewed version':'Install reviewed version',()=>{
      if(!consent.checked)return;const token=this.#token,current=()=>this.active()&&token===this.#token,wantsSharing=share?.checked===true,originalSharing=wantsSharing?(sharingReview??capture()):undefined;let sharingMessage='';
      this.#run(async()=>{await verifyWorkshopPlan(this.client,plan,current);if(!current())throw new Error('Review closed.');await this.library.installPlan(plan,current);if(sharingSource)for(const entry of plan.entries)this.#installedSources.set(entry.meta.id,sharingSource);if(wantsSharing){try{await this.sharing!.share(shared,current,sharingSource,await originalSharing!);sharingMessage='Installation shared. Reinstalls count once per account.';}catch{sharingMessage='Installed successfully. Installation sharing could not finish. Open Install sharing to review or retry a pending report.';}}},()=>{this.installed(plan.rootId);if(sharingMessage)this.element.append(note(sharingMessage));});
    });confirm.disabled=true;consent.addEventListener('change',()=>{confirm.disabled=!consent.checked;});
    confirm.classList.add('kl-workshop-action-primary');
    const title=installed?'Review version change':'Review installation';
    const body=element('div',{className:'kl-workshop-install-body'},
      element('p',{className:'kl-workshop-install-subtitle',text:`${root.release.title} · v${root.release.version}`}),
    );
    const list=element('div',{className:'kl-workshop-install-list'});
    for(const entry of plan.entries){
      const saved=this.library.get(entry.meta.id),selected=entry.meta.id===plan.rootId;
      const change=saved?.release.version===entry.release.version?(saved.enabled?'Already installed':'Will be enabled'):saved?`Update from ${saved.release.version}`:'New install';
      list.append(element('article',{className:'kl-workshop-card kl-workshop-install-row'},
        element('div',{},element('h3',{text:entry.release.title}),
          element('small',{text:`${selected?'Selected creation':'Required dependency'} · v${entry.release.version} · ${change}`})),
        workshopPermissionList(entry.release,saved?.grantedPermissions??[]),
        element('details',{className:'kl-workshop-install-preview'},element('summary',{ariaLabel:'Preview package contents',title:'Preview package contents'},kikiIcon('image')),note(`By ${entry.meta.authorName}`),note(entry.release.changelog),workshopPayloadView(entry.release)),
      ));
    }
    body.append(list,element('label',{className:'kl-workshop-consent kl-workshop-install-consent'},consent,
      element('span',{},element('strong',{text:label}),element('small',{text:'Only these reviewed versions will be saved together. Applying a package is a separate action.'})),
    ));
    if(share)body.append(element('label',{className:'kl-workshop-consent kl-workshop-install-consent'},share,
      element('span',{},element('strong',{text:'Share this installation'}),
        element('small',{text:`Optional. Report these ${shared.length} public package(s) after saving. Unlisted packages are excluded. Manage reports in Install sharing.`})),
    ));
    const cancel=this.#button('Cancel installation',()=>this.#closeReview());
    const close=this.#button('',()=>this.#closeReview());close.setAttribute('aria-label','Close installation review');close.title='Close installation review';close.append(kikiIcon('close'));
    this.#dialog?.close();this.#dialog?.remove();
    const dialog=element('dialog',{className:'kl-workshop-install-dialog',ariaLabel:title},
      element('header',{className:'kl-workshop-install-header'},
        element('div',{},element('span',{className:'kl-workshop-install-eyebrow',text:'KIKILINK',ariaHidden:'true'}),element('h2',{text:title})),close),
      body,element('footer',{className:'kl-workshop-install-footer'},cancel,confirm),
    );
    dialog.addEventListener('keydown',event=>event.stopPropagation());
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(!this.#busy)this.#closeReview();});
    this.#dialog=dialog;this.element.append(dialog);dialog.showModal();fitPanelDialog(dialog);cancel.focus();
  }
  #closeReview():void {
    const anchor=this.#reviewAnchor;
    this.#dialog?.close();this.#dialog?.remove();this.#dialog=undefined;this.#reviewAnchor=undefined;this.#review=false;
    if(anchor?.isConnected){anchor.focus({preventScroll:true});return;}
    this.#back?.();
  }
  #importField():HTMLElement {
    const input=element('input',{type:'file',accept:'.json,application/json',ariaLabel:'Import Workshop package file'});
    input.addEventListener('change',()=>{
      const file=input.files?.[0];if(!file||!this.active()||this.#busy)return;input.value='';const token=this.#token,current=()=>this.active()&&token===this.#token;let plan:WorkshopInstallationPlan;this.#review=true;
      this.#run(async()=>{if(file.size>WORKSHOP_FILE_MAX_BYTES)throw new Error('Package files must be at most 256 KiB.');const parsed=parseWorkshopPackageFile(await file.text(),this.client.origin);if(!current())throw new Error('Review closed.');plan=workshopFilePlan(parsed,this.library.list());await verifyWorkshopPlan(this.client,plan,current);},()=>this.#planReview(plan));
    });return element('label',{className:'kl-workshop-import'},element('strong',{text:'Import package file'}),note('Choose a Workshop JSON file (up to 256 KiB, 32 packages). Releases and authors are verified on this Cloud service before review. No package is installed or published automatically.'),input);
  }
  #remove(item:InstalledWorkshopPackage,uninstall:boolean,returnToList=false):void {const token=this.#token,current=()=>this.active()&&token===this.#token;this.#run(()=>uninstall?this.library.uninstall(item.id,installedFingerprint(item),current):this.library.disable(item.id,installedFingerprint(item),current),()=>uninstall?this.#showInstalledList():returnToList?this.list():this.installed(item.id));}
  #plainDialog(title:string,body:HTMLElement,footer:HTMLElement,kind:string,anchor=focusedElement(this.element)):void {
    this.#dialog?.close();this.#dialog?.remove();this.#review=true;this.#reviewAnchor=anchor;
    const close=this.#button('',()=>this.#closeReview());close.setAttribute('aria-label','Close dialog');close.append(kikiIcon('close'));
    const dialog=element('dialog',{className:`kl-workshop-install-dialog ${kind}`,ariaLabel:title},element('header',{className:'kl-workshop-install-header'},element('div',{},element('span',{className:'kl-workshop-install-eyebrow',text:'KIKILINK',ariaHidden:'true'}),element('h2',{text:title})),close),body,footer);
    dialog.addEventListener('keydown',event=>event.stopPropagation());dialog.addEventListener('cancel',event=>{event.preventDefault();if(!this.#busy)this.#closeReview();});this.#dialog=dialog;this.element.append(dialog);dialog.showModal();fitPanelDialog(dialog);footer.querySelector<HTMLButtonElement>('button')?.focus();
  }
  importFile(anchor?:HTMLElement):void {
    if(!this.active()||this.#busy||this.#review||!this.#dependenciesSupported)return;
    const body=element('div',{className:'kl-workshop-install-body'},this.#importField()),close=this.#button('Close',()=>this.#closeReview());
    this.#plainDialog('Import a creation',body,element('footer',{className:'kl-workshop-install-footer'},close),'kl-workshop-import-dialog',anchor);
  }
  #uninstallReview(item:InstalledWorkshopPackage,anchor=focusedElement(this.element)):void {
    if(this.#busy||this.#review)return;
    const confirm=this.#button('Uninstall',()=>this.#remove(item,true));confirm.setAttribute('aria-label','Confirm uninstall');confirm.classList.add('kl-workshop-danger');
    const keep=this.#button('Keep installed',()=>this.#closeReview());
    this.#plainDialog('Uninstall this creation?',element('div',{className:'kl-workshop-install-body'},element('p',{},'Remove ',element('strong',{text:item.release.title}),' from your local installed library?'),note('Saved copies already applied to a profile, Space or community draft remain there. Your review and bookmark are kept.')),element('footer',{className:'kl-workshop-install-footer'},keep,confirm),'kl-workshop-uninstall-dialog',anchor);
  }

  #applyReview(item:InstalledWorkshopPackage):void {
    const token=this.#token,fingerprint=installedFingerprint(item),current=()=>{try{if(!this.active()||token!==this.#token)return false;this.library.usable(item.id,fingerprint);return true;}catch{return false;}};
    this.#review=true;this.element.replaceChildren(element('h2',{text:'Review application'}),note(`${item.release.title} · Installed ${item.release.version}`),workshopPayloadView(item.release),this.#button('Cancel application',()=>this.installed(item.id)));
    if(item.release.type==='Community template'){
      if(!this.#communityTemplatesSupported||!this.options.communityTemplate){this.element.append(note('Community templates need the pending Cloud update.'));return;}
      this.element.append(note('Opens a new community draft with this name, access, tags, rules and channels. Review and edit it before choosing Create community. You will be the only initial member and owner.'),this.#button('Review community draft',()=>this.#run(async()=>{this.library.usable(item.id,fingerprint);await this.options.communityTemplate!(item,current);},()=>this.installed(item.id))));return;
    }
    if(item.release.type==='Activity pack'){
      const generation=this.#token;this.#busy=true;void workshopActivityCopies(this.client.origin,item.id,item.release).then(copies=>{
        if(!this.active()||generation!==this.#token)return;this.#busy=false;this.element.append(note('These exact copies will be added to Custom Activities. Names use the destination’s 40-character limit; line breaks and spacing are normalized below. Existing copies from this version keep your edits.'));
        for(const copy of copies)this.element.append(element('article',{className:'kl-workshop-card'},element('strong',{text:copy.name}),note(copy.template),note(copy.targetMode==='self'?'Target: Self':'Target: Other')));
        this.element.append(this.#button('Add reviewed activities',()=>{try{this.library.usable(item.id,fingerprint);const result=addWorkshopActivities(this.options.settings,copies,current);this.#review=false;this.installed(item.id);this.element.append(note(`Added ${result.added} activities; kept ${result.kept} existing copies. Open Custom Activities to choose when to use them.`));}catch(error){this.#error(error);}}));
      }).catch(error=>{if(this.active()&&generation===this.#token){this.#busy=false;this.#review=false;this.#error(error);}});return;
    }
    if((WORKSHOP_DESTINATION_TYPES as readonly string[]).includes(item.release.type)&&!this.#roomThemesSupported){this.element.append(note('This application needs the pending Cloud update.'));return;}
    if(item.release.type==='Room preset'||item.release.type==='Background'){
      this.element.replaceChildren(new WorkshopSpaceReview(this.client,item,current,{cancel:()=>this.installed(item.id),openSpace:id=>{if(current())this.options.openSpace?.(id);}}).element);return;
    }
    if(item.release.type==='UI theme'){
      const before=workshopUIFingerprint(this.options.settings),palette=item.release.payload as WorkshopUIPayload;
      this.element.append(note('Applies these panel colours, accent and spacing on this device in Dark mode. Profile decoration, text size and other settings are kept. Restore the original palette in Settings → General.'));
      if(!workshopPaletteReadable(palette)){this.element.append(note('Choose darker panels and a visible accent before applying this theme.'));return;}
      this.element.append(this.#button('Apply interface theme',()=>{try{applyWorkshopUITheme(this.options.settings,item,before,current);this.installed(item.id);this.element.append(note('Interface theme applied on this device.'));}catch(error){this.#error(error);}}));return;
    }
    const status=element('select',{ariaLabel:'Status to apply'});
    if(item.release.type==='Status & emoji'){const statuses=item.release.payload.statuses!;if(!statuses.length){this.element.append(note('Emoji previews have no status text to apply.'));return;}status.append(...statuses.map((line,index)=>element('option',{value:String(index),text:line.text})));this.element.append(status);}
    this.element.append(note('Opens your profile editor with the selected fields. Review and save to apply; cancelling leaves your saved profile unchanged.'),this.#button('Review in profile editor',()=>this.#run(async()=>{this.library.usable(item.id,fingerprint);await this.options.profile(workshopProfilePatch(item.release,Number(status.value)),current);},()=>{this.installed(item.id);this.element.append(note('Prepared in your profile editor. Save there to apply, or discard the draft.'));})));
  }
}
