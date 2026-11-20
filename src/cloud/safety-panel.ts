import { MyReportsRecovery, MyReportsRecoveryError, myReportsRecoveryConflict } from './my-reports-recovery';
import { CloudClient, CloudError } from './client';
import { element } from './dom';
import { bindClockText } from '../core/time-format';
import { ShellActionMenu, type ShellAction } from '../modules/platform-shell/action-menu';
import { kikiIcon } from '../modules/link-chat/icons';
import { CommunityReportDialog } from './community-report-dialog';
import { RestorationPanel } from './restoration-panel';
import type { KeyValueStorage } from '../core/settings';
import reasons from '../../cloud/shared/report-reasons.json';

type Mode = 'moderation' | 'my-reports';
interface Receipt { id: number; scope: 'platform'|'community'; targetType: string; targetId: string; reason: string; reasonCode: string|null; status: string; createdAt: number; resolvedAt: number|null; targetTitle?:string; targetAvailable?:boolean; communityId?:string|null; communityName?:string|null }
interface ReportCommunity {id:string;name:string|null;label:string}
interface Warning { id: number; scope: string; message: string; createdAt: number }
interface Community { id: string; name: string; role: string }
const status = (s: string) => ({open:'Open',in_review:'In review',resolved:'Resolved',removed:'Content removed',dismissed:'Dismissed',unavailable:'Content unavailable'}[s] ?? s);
/** Settings navigation and reporter receipts, with a distinct server-authorized reviewer surface. */
export class SafetyPanel {
  readonly element = element('section', { className: 'kl-mod-page kl-safety', ariaLabel: 'Reports and moderation' });
  readonly #recovery: MyReportsRecovery;
  #mode: Mode | undefined;
  #queue = false;
  #workspace = false;
  #epoch = 0; #loading = false; #error = ''; #unsupported = false; #triage = false;
  #warnings: Warning[] = []; #warningView = false; #decisions = false;
  #items: Receipt[] = []; #communities: Community[] = []; #platform = false;
  #cursor = ''; #next: string|null = null; #scope = 'all'; #state = 'all';
  #detail: Receipt|undefined; #reviewing = false;
  #search=false; #query=''; #applied=''; #communityFilter='';
  #choices:ReportCommunity[]=[]; #choiceBefore=''; #choiceNext:string|null=null; #selected:ReportCommunity|null=null;
  readonly #menu = new ShellActionMenu();
  #composer: CommunityReportDialog | undefined;
  #canReportCommunity = false;
  #context = false;
  #restoration: RestorationPanel | undefined;
  readonly #unsubscribe: () => void;
  constructor(readonly client: CloudClient, readonly options: {
    storage?: KeyValueStorage;
    current(): boolean;
    reviewPlatform(host: HTMLElement, current: () => boolean, back: () => void): Promise<void>;
    hidePlatform(): void;
    reviewQueue?(host: HTMLElement, current: () => boolean, back: () => void, actions?: { platform?: () => void; myReports: () => void }): Promise<void>;
    hideQueue?(): void;
    reviewCommunity(id: string): void;
    connect(): void;
    myReports?(): void;
  }) {
    this.#recovery = new MyReportsRecovery(client);
    this.#menu.element.id = 'kl-safety-actions';
    this.#unsubscribe = client.subscribe(kind => {
      if (['session','disconnected','profiles-cleared'].includes(kind)) {
        const mode = this.#mode; this.hide(); if (mode && options.current()) void this.show(mode);
      } else if ((kind === 'ready' || this.#search&&this.#mode==='my-reports'&&['communities','community-reports','reports','profiles','relationships','groups','spaces'].includes(kind)) && this.#mode && !this.#reviewing) void this.refresh();
    });
  }
  hide(): void { this.#recovery.invalidate();this.#restoration?.destroy();this.#restoration=undefined;this.#composer?.destroy();this.#composer=undefined;this.#menu.close(false);this.#menu.element.remove();this.#canReportCommunity=false;this.#context=false;this.#search=false;this.#query=this.#applied=this.#communityFilter=this.#choiceBefore='';this.#choices=[];this.#choiceNext=null;this.#selected=null;this.#warnings=[]; this.#warningView=false; ++this.#epoch; this.#mode = undefined; this.#loading = false; this.#items=[]; this.#communities=[]; this.#detail=undefined; this.#reviewing=false; this.#cursor=''; this.#next=null; this.#scope=this.#state='all'; this.options.hidePlatform();this.options.hideQueue?.(); this.element.replaceChildren(); }
  destroy(): void { this.hide(); this.#menu.destroy();this.#unsubscribe(); }
  async show(mode: Mode): Promise<void> { if(this.#mode===mode) return; this.hide(); this.#mode=mode; await this.refresh(); }
  #current(epoch=this.#epoch): boolean { return this.#recovery.identityMatches() && epoch===this.#epoch && !!this.#mode && this.options.current() && this.element.isConnected; }
  #resetGeneration(): void {
    this.#items=[];this.#warnings=[];this.#communities=[];this.#detail=undefined;this.#choices=[];this.#selected=null;
    this.#cursor=this.#choiceBefore=this.#communityFilter='';this.#next=this.#choiceNext=null;this.#platform=false;
  }
  async refresh(): Promise<void> {
    if(this.#restoration)return;
    if(!this.#current()||this.#composer)return;
    const epoch=++this.#epoch; this.options.hidePlatform();this.options.hideQueue?.();this.#reviewing=false;this.#loading=true;this.#error='';this.#unsupported=false;this.#render();
    try {
      if(!this.client.connected)throw new CloudError('connect_required',401);
      const me=await this.client.request<{features?:{communityDirectory?:boolean;reportReasons?:boolean;myReports?:boolean;myReportsSearch?:boolean;reportTriage?:boolean;reportDecisions?:boolean;moderationQueue?:boolean;moderationWorkspace?:boolean;communities?:boolean}}>('GET','/v1/me');
      if(!this.#current(epoch))return;
      if(this.#recovery.accept(me))this.#resetGeneration();
      const access=this.#recovery.capture();
      this.#workspace=me.features?.moderationWorkspace===true;this.#queue=me.features?.moderationQueue===true && me.features?.communities===true;this.#triage=me.features?.reportTriage===true;this.#decisions=me.features?.reportDecisions===true;
      this.#search=me.features?.myReportsSearch===true;this.#canReportCommunity=!!(me.features?.communities&&me.features.communityDirectory&&me.features.reportReasons);
      if(!this.#search){if(this.#applied||this.#communityFilter)this.#cursor='';this.#query=this.#applied=this.#communityFilter=this.#choiceBefore='';this.#choices=[];this.#choiceNext=null;this.#selected=null;}
      if(!this.#decisions&&this.#warningView){this.#warningView=false;this.#warnings=[];this.#cursor='';}
      if(!this.#triage&&this.#state==='in_review'){this.#state='all';this.#cursor='';}
      if(!me.features?.myReports){this.#unsupported=true;this.#items=[];this.#communities=[];this.#detail=undefined;return;}
      if(this.#mode==='moderation') {
        const p=await access.request<{platform:boolean;items:Community[];nextCursor:number|null}>('GET',`/v1/me/moderation?limit=40&cursor=${this.#cursor||'0'}`);
        if(!this.#current(epoch))return;this.#platform=p.platform;this.#communities=p.items;this.#next=p.nextCursor===null?null:String(p.nextCursor);
      } else if(this.#warningView) {
        const p=await access.request<{items:Warning[];nextCursor:number|null}>('GET',`/v1/me/warnings?limit=40&cursor=${this.#cursor||'0'}`);
        if(!this.#current(epoch))return;this.#warnings=p.items;this.#next=p.nextCursor===null?null:String(p.nextCursor);
      } else if(this.#detail) {
        const r=await access.request<Receipt>('GET',`/v1/me/reports/${this.#detail.scope}/${this.#detail.id}`);
        if(!this.#current(epoch))return;
        if(r.id!==this.#detail!.id||r.scope!==this.#detail!.scope)throw new MyReportsRecoveryError();
        this.#detail=r;
      } else {
        const q=new URLSearchParams({limit:'40',scope:this.#scope,state:this.#state});if(this.#cursor)q.set('cursor',this.#cursor);
        if(this.#search){
          const choices=await access.request<{items:ReportCommunity[];nextCursor:string|null}>('GET',`/v1/me/reports/communities?limit=40${this.#choiceBefore?'&cursor='+encodeURIComponent(this.#choiceBefore):''}`);
          if(!this.#current(epoch))return;this.#choices=choices.items;this.#choiceNext=choices.nextCursor;
          q.set('q',this.#applied);if(this.#communityFilter)q.set('communityId',this.#communityFilter);
        }
        const p=await access.request<{items:Receipt[];nextCursor:string|null;community?:ReportCommunity|null}>('GET',`/v1/me/reports?${q}`);
        if(!this.#current(epoch))return;this.#items=p.items;this.#next=p.nextCursor;this.#selected=p.community??null;
      }
    } catch(e) { if(!this.#current(epoch))return;this.#warnings=[];this.#items=[];this.#communities=[];this.#choices=[];this.#selected=null;this.#detail=undefined;this.#next=null;
      if(myReportsRecoveryConflict(e))this.#resetGeneration();
      this.#error=myReportsRecoveryConflict(e) ? 'Reports changed after recovery. Refresh to read the current reports.' : e instanceof CloudError && e.status===404 ? 'This report is no longer available.' : !this.client.connected ? 'Connect your Cloud account to view reports.' : 'Reports could not load. Refresh to try again.';
    } finally {if(this.#current(epoch)){this.#loading=false;this.#render();}}
  }
  #button(label:string,run:()=>void,accessibleName?:string):HTMLButtonElement {const b=element('button',{type:'button',className:'kl-text-button',text:label});if(accessibleName)b.setAttribute('aria-label',accessibleName);b.disabled=this.#loading;b.addEventListener('click',()=>{if(this.#current()&&this.element.contains(b)&&!this.#loading)run();});return b;}
  #back(run: () => void): HTMLButtonElement {
    const back = this.#button('My reports', run, 'Back to my reports');
    back.classList.add('kl-mod-back');
    back.prepend(kikiIcon('back'));
    return back;
  }
  #note(text:string):HTMLElement{return element('p',{className:'kl-mod-note',text});}
  #title(r:Receipt):string{if(this.#search&&r.targetTitle)return r.targetTitle;if(r.targetType==='message')return r.scope==='community'?'Channel message':'Message';if(['community','group'].includes(r.targetType))return r.targetType==='group'?'Group':'Community';return `${r.targetType[0]?.toUpperCase()}${r.targetType.slice(1)} #${r.targetId}`;}
  #targetLabel(r: Receipt): string {
    if (r.targetType === 'message' && r.scope === 'community') return 'Channel message';
    return r.targetType.charAt(0).toUpperCase() + r.targetType.slice(1);
  }
  #refreshFocus(selector: string): void {
    const pending = this.refresh(), epoch = this.#epoch;
    void pending.then(() => {
      if (this.#current(epoch)) this.element.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
    });
  }
  #filtered():boolean{return !!(this.#query||this.#applied||this.#communityFilter||this.#scope!=='all'||this.#state!=='all');}
  #reset():void{this.#query=this.#applied=this.#communityFilter=this.#choiceBefore=this.#cursor='';this.#scope=this.#state='all';this.#selected=null;void this.refresh();}
  #compose():void {
    if(!this.#current()||!this.client.connected||this.#error||this.#composer||!this.#canReportCommunity)return;
    this.#composer=new CommunityReportDialog(this.client,{current:()=>this.#current()&&this.#mode==='my-reports',done:id=>{
      this.#composer=undefined;
      if(id){this.#warningView=false;this.#detail={id,scope:'platform',targetType:'community',targetId:'',reason:'',reasonCode:null,status:'open',createdAt:0,resolvedAt:null};}
      void this.refresh().then(() => this.element.querySelector<HTMLElement>(id ? '.kl-mod-detail h2' : '.kl-mod-report-community')?.focus());
    }});this.element.append(this.#composer.element);
  }
  #showMyReports = (): void => {
    if (this.options.myReports) this.options.myReports();
    else void this.show('my-reports');
  };
  #actions(noAccess = false):HTMLElement {
    const actions=element('div',{className:'kl-mod-actions'});
    if(this.#mode!=='my-reports'){
      const refresh = this.#button('Refresh', () => void this.refresh());
      if (noAccess) {
        actions.append(this.#button('My reports', this.#showMyReports));
        refresh.setAttribute('aria-label', 'Refresh'); refresh.title = 'Refresh'; refresh.classList.add('kl-mod-icon');
        refresh.replaceChildren(kikiIcon('refresh'));
      }
      actions.append(refresh);return actions;
    }
    if (!this.#warningView && !this.#detail && this.#canReportCommunity && this.client.connected && !this.#error) {
      const report = this.#button('Report a community', () => this.#compose());
      report.classList.add('kl-mod-report-community');
      actions.append(report);
    }
    const information = this.#button('Reports information', () => {
      this.#context = !this.#context;
      this.#render();
      this.element.querySelector<HTMLButtonElement>('button[aria-label="Reports information"]')?.focus();
    });
    information.setAttribute('aria-label','Reports information');information.setAttribute('aria-expanded',String(this.#context));information.classList.add('kl-mod-icon');information.replaceChildren(kikiIcon('info'));
    const more=this.#button('Report actions',()=>{
      const entries:ShellAction[]=[{label:'Refresh',icon:'refresh',run:()=>void this.refresh()}];
      if(this.#decisions)entries.push({label:this.#warningView?'Submitted reports':'Warnings',icon:'shield',run:()=>{if(!this.#current())return;this.#warningView=!this.#warningView;this.#detail=undefined;this.#cursor='';this.#next=null;void this.refresh();}});
      const storage = this.options.storage;
      if (storage) entries.push({ label: 'Restrictions & appeals', icon: 'shield', run: () => {
        const panel = new RestorationPanel(this.client, false, { storage, current: () => this.#current(), back: () => {
          panel.destroy(); this.#restoration = undefined; void this.refresh();
        } });
        this.#restoration = panel; this.element.replaceChildren(panel.element); void panel.show();
      } });
      if(!this.#warningView&&!this.#detail)for(const [scope,label]of [['all','All reports'],['platform','Platform reports'],['community','Community reports']] as const)entries.push({label,icon:'flag',checked:this.#scope===scope,separator:scope==='all',run:()=>{if(!this.#current())return;this.#scope=scope;this.#cursor='';void this.refresh();}});
      const epoch=this.#epoch;
      this.element.append(this.#menu.element);this.#menu.open(more,'Report actions',entries.map(action=>({...action,run:()=>{if(this.#current(epoch)&&this.element.contains(more)&&!this.#loading)action.run();}})));
    });more.setAttribute('aria-label','Report actions');more.setAttribute('aria-haspopup','menu');more.classList.add('kl-mod-icon');more.replaceChildren(kikiIcon('more'));
    actions.append(information,more);return actions;
  }
  #render():void {
    this.#menu.close(false);this.#renderContent();
  }
  #renderContent():void {
    const noAccess = this.#mode === 'moderation' && !this.#loading && !this.#error && !this.#unsupported && !this.#platform
      && !(this.#queue && this.options.reviewQueue) && !this.#communities.length && !this.#cursor && this.#next === null;
    this.element.classList.toggle('kl-my-reports', this.#mode === 'my-reports');
    this.element.classList.toggle('kl-safety-no-access', noAccess);
    this.element.setAttribute('aria-busy',String(this.#loading));
    const detail = !this.#loading && !this.#error && !this.#unsupported ? this.#detail : undefined;
    const title = detail ? this.#title(detail) : noAccess ? 'Community moderation' : this.#mode === 'moderation' ? 'Moderation' : this.#warningView ? 'Warnings' : 'My reports';
    const subtitle = detail ? `${this.#targetLabel(detail)} report · Your report #${detail.id}`
      : noAccess ? 'Review reports, requests and roles within your current community access.'
      : this.#mode === 'moderation' ? 'Review platform reports and the communities you moderate.' : 'Track the reports you submitted during the last 30 days.';
    this.element.replaceChildren();
    if (detail) this.element.append(this.#back(() => {
      this.#detail = undefined;
      this.#refreshFocus(`[data-report-receipt="${detail.scope}-${detail.id}"]`);
    }));
    this.element.append(element('header',{className:'kl-mod-header'},element('div',{},element('span',{className:'kl-mod-eyebrow',text:noAccess?'KIKILINK · COMMUNITY TEAM':'SETTINGS · SAFETY'}),
      element('h1',{text:title}),this.#note(subtitle)), this.#actions(noAccess)));
    if(this.#loading){this.element.append(element('p',{role:'status',text:'Checking access…'}));return;}
    if(this.#error){this.element.append(element('p',{role:'alert',text:this.#error}));if(!this.client.connected)this.element.append(this.#button('Cloud & sessions',this.options.connect));else if(this.#filtered())this.element.append(this.#button('Reset filters',()=>this.#reset()));return;}
    if(this.#unsupported){this.element.append(this.#note('This server does not support report history yet. Install the supplied server update, then refresh.'));return;}
    if(this.#mode==='my-reports'&&this.#context)this.element.append(element('aside',{className:'kl-mod-context',ariaLabel:'Reports information'},element('h2',{text:'Your reports'}),this.#note('Only your submitted reports are shown. Private evidence and internal moderation notes stay with the moderation team. Reports and warnings are kept for 30 days.')));
    if(this.#mode==='moderation'){
      if(this.#workspace&&this.#queue&&this.options.reviewQueue){
        this.#reviewing=true;this.element.replaceChildren();
        const platform=this.#platform?()=>{this.options.hideQueue?.();this.element.replaceChildren();void this.options.reviewPlatform(this.element,()=>this.#current()&&this.#reviewing,()=>void this.refresh());}:undefined;
        void this.options.reviewQueue(this.element,()=>this.#current()&&this.#reviewing,()=>void this.refresh(),{...(platform?{platform}:{}),myReports:this.#showMyReports});return;
      }
      if (noAccess) {
        this.element.append(element('section', { className: 'kl-mod-empty kl-mod-no-access' }, kikiIcon('shield'),
          element('h2', { text: 'No moderation access' }), this.#note('You need a current owner, administrator or moderator role in a joined community.'),
          this.#button('View my reports', this.#showMyReports)));
        return;
      }
      if(this.#platform)this.element.append(element('article',{className:'kl-mod-row'},element('div',{},element('h2',{text:'Platform reports'}),this.#note('Reported content and restricted communities.')),
        this.#button('Open platform queue',()=>{this.#reviewing=true;this.element.replaceChildren();void this.options.reviewPlatform(this.element,()=>this.#current()&&this.#reviewing,()=>void this.refresh());})));
      if(this.#queue && this.options.reviewQueue)this.element.append(element('article',{className:'kl-mod-row'},element('div',{},element('h2',{text:'Community reports'}),this.#note('One queue for the communities you moderate.')),
        this.#button('Open community queue',()=>{this.#reviewing=true;this.element.replaceChildren();void this.options.reviewQueue!(this.element,()=>this.#current()&&this.#reviewing,()=>void this.refresh());})));
      this.element.append(element('h2',{text:'Communities'}));
      for(const c of this.#communities)this.element.append(element('article',{className:'kl-mod-row'},element('div',{},element('h3',{text:c.name}),this.#note(c.role)),this.#button('Review community reports',()=>this.options.reviewCommunity(c.id))));
      if(!this.#communities.length)this.element.append(this.#note('No active communities to moderate on this page.'));
    } else if(this.#warningView){
      this.element.append(this.#back(()=>{this.#warningView=false;this.#cursor='';void this.refresh();}));
      this.element.append(this.#note('Warnings addressed to you · Kept for 30 days. Earlier warnings remain in this history if a report is reopened.'));
      for(const w of this.#warnings)this.element.append(element('article',{className:'kl-mod-row'},element('div',{className:'kl-mod-main'},element('h2',{text:w.scope==='community'?'Community warning':'Platform warning'}),element('p',{className:'kl-mod-copy',text:w.message}),bindClockText(element('time'),w.createdAt,'numeric-date-time'))));
      if(!this.#warnings.length)this.element.append(element('p',{className:'kl-mod-note',text:'No warnings to show.'}));
    } else if (this.#detail) {
      const r = this.#detail;
      const knownReason = reasons.find(item => item.id === r.reasonCode)?.label;
      const prefix = knownReason ? `${knownReason}: ` : '';
      let details = '';
      if (knownReason && r.reason !== knownReason && r.reason !== `${knownReason} report`)
        details = r.reason.startsWith(prefix) ? r.reason.slice(prefix.length) : r.reason;
      const meta = element('dl', { className: 'kl-mod-meta' },
        element('div', {}, element('dt', { text: 'Reason' }), element('dd', { text: knownReason ?? r.reason })),
        element('div', {}, element('dt', { text: 'Submitted' }), element('dd', {}, bindClockText(element('time'), r.createdAt, 'numeric-date-time'))));
      if (r.resolvedAt !== null) meta.append(element('div', {}, element('dt', { text: 'Closed' }),
        element('dd', {}, bindClockText(element('time'), r.resolvedAt, 'numeric-date-time'))));
      if (this.#search && r.communityName && r.targetType !== 'community') meta.append(element('div', {},
        element('dt', { text: 'Community' }), element('dd', { text: r.communityName })));
      const card = element('section', { className: 'kl-mod-detail kl-mod-receipt' },
        element('div', { className: 'kl-mod-status' }, element('span', { className: 'kl-mod-badge', text: status(r.status) })),
        meta, element('h2', { text: 'Your details', tabIndex: -1 }),
        element('p', { className: 'kl-mod-copy', text: details || 'No additional details were provided.' }));
      if(this.#search&&r.targetAvailable===false)card.append(this.#note('The original is unavailable or outside your current access. Your report remains here.'));
      const resolution=element('section',{className:'kl-mod-evidence'},element('h2',{text:'Report status'}),this.#note(r.status==='open'?'Your report is waiting for review.':r.status==='in_review'?'Your report is being reviewed.':r.status==='dismissed'?'Your report has been dismissed.':r.status==='unavailable'?'The reported content is no longer available.':'Your report has been resolved.'),this.#note('This receipt does not include private evidence or internal moderation notes.'));
      this.element.append(card,resolution);return;
    } else {
      const toolbar=element('div',{className:'kl-mod-toolbar'});
      if(this.#search){
        const search=element('input',{ariaLabel:'Search my reports',placeholder:'Search your reports…',value:this.#query});search.type='search';search.maxLength=160;
        const apply = () => { this.#applied = this.#query.trim(); this.#cursor = ''; this.#refreshFocus('[aria-label="Search my reports"]'); };
        const clear = this.#button('Clear report search', () => { this.#query = ''; apply(); });
        clear.classList.add('kl-report-clear'); clear.title = 'Clear report search';
        clear.setAttribute('aria-label', 'Clear report search'); clear.replaceChildren(kikiIcon('close')); clear.hidden = !this.#query;
        search.addEventListener('input', () => {
          if (this.#current() && this.element.contains(search)) { this.#query = search.value; clear.hidden = !this.#query; }
        });
        search.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&!e.isComposing){e.preventDefault();if(this.#current()&&!this.#loading&&this.element.contains(search))apply();}});
        const applyButton=this.#button('Search',apply);applyButton.setAttribute('aria-label','Search');applyButton.title='Search';applyButton.replaceChildren(kikiIcon('search'));toolbar.append(element('div',{className:'kl-mod-search'},applyButton,search,clear));
      }
      for(const [label,values] of [['Report status',[['all','All'],['open','Open'],['in_review','In review'],['resolved','Resolved'],['dismissed','Dismissed']]]] as const){
        const select=element('select',{ariaLabel:label});
        for(const [value,text]of values){if(value==='in_review'&&!this.#triage)continue;const o=element('option',{value,text});o.selected=value===this.#state;select.append(o);}
        select.addEventListener('change',()=>{if(!this.#current()||!this.element.contains(select))return;this.#state=select.value;this.#cursor='';void this.refresh();});toolbar.append(select);
      }
      if(this.#search){
        const select=element('select',{ariaLabel:'Report community'}),all=element('option',{value:'',text:'All communities'});select.append(all);
        const choices=this.#selected&&!this.#choices.some(c=>c.id===this.#selected?.id)?[this.#selected,...this.#choices]:this.#choices;
        for(const c of choices)select.append(element('option',{value:c.id,text:c.label}));select.value=this.#communityFilter;
        select.addEventListener('change',()=>{if(!this.#current()||this.#loading||!this.element.contains(select))return;this.#communityFilter=select.value;this.#cursor='';void this.refresh();});toolbar.append(select);
      }
      this.element.append(toolbar);
      if(this.#search){
        const actions=element('div',{className:'kl-mod-actions'});
        if(this.#choiceNext)actions.append(this.#button('More communities',()=>{this.#choiceBefore=this.#choiceNext!;void this.refresh();}));
        if(this.#choiceBefore)actions.append(this.#button('First communities',()=>{this.#choiceBefore='';void this.refresh();}));
        if(this.#items.length && this.#filtered())actions.append(this.#button('Reset filters',()=>this.#reset()));if(actions.childElementCount)this.element.append(actions);
      }
      this.element.append(element('p',{className:'kl-mod-count',text:`${this.#items.length} ${this.#items.length===1?'report':'reports'} submitted by you${this.#next||this.#cursor?' on this page':''}${this.#scope==='all'?'':this.#scope==='platform'?' · Platform':' · Communities'}`}));
      const receipts = element('div', { className: 'kl-mod-list' });
      for (const r of this.#items) {
        const review = this.#button('View report', () => {
          this.#detail = r;
          this.#refreshFocus('.kl-mod-detail h2');
        }, `View ${r.scope} report #${r.id}`);
        review.dataset.reportReceipt = `${r.scope}-${r.id}`;
        receipts.append(element('article', { className: 'kl-mod-row' }, element('div', { className: 'kl-mod-main' },
          element('div', { className: 'kl-mod-status' }, element('span', { className: 'kl-mod-badge', text: status(r.status) }), element('small', { text: this.#targetLabel(r) })),
          element('h3', { text: this.#title(r) }), element('p', { text: r.reason.length > 180 ? r.reason.slice(0, 180) + '…' : r.reason }),
          element('small', { className: 'kl-mod-row-meta' }, this.#search && r.communityName && r.targetType !== 'community' ? `${r.communityName} · ` : '',
            bindClockText(element('time'), r.createdAt, 'numeric-date-time'))), element('div', { className: 'kl-mod-row-actions' }, review)));
      }
      if (this.#items.length) this.element.append(receipts);
      else this.element.append(element('section', { className: 'kl-mod-empty' }, kikiIcon('shield'),
        element('h2', { text: this.#applied ? 'No matching reports' : 'No reports in this view' }),
        this.#note(this.#search && this.#next !== null ? 'No matches in this batch. Continue to search older reports.' : 'Reports you submit from profiles, communities, posts or messages appear here.'),
        this.#button('Reset filters', () => this.#reset())));
    }
    const pages=element('div',{className:'kl-mod-actions'});
    if(this.#next!==null)pages.append(this.#button('Next page',()=>{this.#cursor=this.#next!;void this.refresh();}));
    if(this.#cursor)pages.append(this.#button('Back to first page',()=>{this.#cursor='';void this.refresh();}));this.element.append(pages);
  }
}
