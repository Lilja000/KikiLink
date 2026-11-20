import { ModerationGeneration, ModerationGenerationError, moderationGenerationConflict, type ModerationAccess } from '../../cloud/moderation-generation';
import { kikiIcon } from '../link-chat/icons';
import { moderationDialog } from '../../cloud/moderation-dialog';
import { decisionControls, decisionHistory, newDecisionDraft, type DecisionReview } from '../../cloud/report-decisions';
import { CloudError, type CloudClient, type MediaReportScope } from '../../cloud/client';
import { assignedLabel, reportStatus, triageControls, triageFilterOptions, type TriageReport, type TriageChange, type TriageRequest } from '../../cloud/report-triage';
import concerns from '../../../cloud/shared/report-reasons.json';
import { MessageAudio } from '../../cloud/message-audio';
import { element } from '../../utils/dom';
import { bindClockText } from '../../core/time-format';
import { ShellActionMenu, type ShellAction } from './action-menu';

interface CommunityChoice { id: string; name: string; role?: string; archived?: boolean }
interface ManagementMember { communityId:string; communityName:string; archived:boolean; revision:number; memberNumber:number; displayName:string|null; username:string|null; role:string; state:string; updatedAt:number; canReview:boolean; roles:string[] }
interface Activity { id:number; communityId:string; communityName:string; archived:boolean; actor:number; action:string; createdAt:number }
interface MemberDraft { member:ManagementMember; action:'approve'|'decline'|'role'; role:string; generation?:string|undefined; held?:boolean; discard?:boolean; pending?:{operationId:string;revision:number;action:string;role?:string} }
interface Report extends TriageReport { communityArchived?: boolean; readOnly?: boolean; communityId?: string; communityName?: string; id: number; channelName: string; archived: boolean; author: number; reporter: number; reason: string; reasonCode?: string; status: string; revision: number; createdAt: number; resolution: string | null; resolvedBy: number | null; message?: { text: string; mediaIds: string[]; audioIds: string[] } | null }
interface Entry { id: number; moderator: number; channelName: string; action: string; reason: string; createdAt: number }
interface Page<T> { items: T[]; nextCursor: number | null }
const memberRoleLabels: Record<string, string> = { owner: 'Owner', admin: 'Administrator', moderator: 'Moderator', member: 'Member' };

/** Private community queue. Only current team/channel permissions expose evidence. */
export class ChannelModerationPanel {
  readonly element = element('section', { className: 'kl-cm-moderation kl-mod-page', ariaLabel: 'Channel moderation' });
  readonly #audio: MessageAudio;
  readonly #generation: ModerationGeneration;
  readonly #memberGeneration:ModerationGeneration;
  #access: ModerationAccess | undefined;
  #recoveredNotes: string[] = [];
  readonly #unsubscribe: () => void;
  #cid: string | undefined;
  #queue = false;
  #workspace = false;
  #context = false;
  readonly #menu = new ShellActionMenu();
  #members:ManagementMember[]=[];
  #activity:Activity[]=[];
  #memberBefore='0.0';
  #memberNext:string|null=null;
  #memberDraft:MemberDraft|undefined;
  #checkingPending = false;
  #search = false;
  #appliedQuery = '';
  #searchTimer: ReturnType<typeof setTimeout> | undefined;
  #communityFilter = '';
  #communityName = '';
  #choices: CommunityChoice[] = [];
  #choiceBefore = 0;
  #choiceNext: number | null = null;
  #epoch = 0;
  #state = 'open';
  #triage = false;
  #decisions = false;
  #review: DecisionReview | undefined;
  #draft = newDecisionDraft();
  #filters = { state: 'active', priority: 'all', assignment: 'all' };
  #triagePending: TriageRequest | undefined;
  #rows: Report[] = [];
  #entries: Entry[] = [];
  #cursor: number | null = null;
  #before = 0;
  #detail: Report | undefined;
  #error = '';
  #query = '';
  #loading = false;
  #busy = false;
  #reason = '';
  #confirm = false;
  #pending: { operationId: string; revision: number; action: string; reason: string } | undefined;
  constructor(readonly client: CloudClient, readonly options: { current(): boolean; back?(): void; platform?(): void; myReports?(): void; name(member: number): string; image?(id: string, scope?: MediaReportScope, generation?: string): HTMLElement }) {
    this.#generation = new ModerationGeneration(client, 'communityModerationRecoveryGeneration');
    this.#memberGeneration=new ModerationGeneration(client,'communityManagementRecoveryGeneration');
    this.#menu.element.id = 'kl-community-moderation-actions';
    this.#audio = new MessageAudio(client, this.element);
    this.element.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented || !this.#context ||
          !(event.target instanceof Element) || event.target.closest('dialog,[role="menu"]')) return;
      event.preventDefault(); event.stopPropagation();
      this.#context = false; this.#render();
      this.element.querySelector<HTMLButtonElement>('[aria-label="Moderation information"]')?.focus({preventScroll:true});
    });
    this.#unsubscribe=client.subscribe(kind=>{
      if(!this.#queue&&!this.#cid)return;
      if(['session','disconnected','profiles-cleared'].includes(kind))this.hide();
      else if(['ready','communities','community-reports','media-invalidated'].includes(kind) && this.options.current())void this.refresh();
    });
  }
  hide(): void { clearTimeout(this.#searchTimer); this.#generation.invalidate();this.#access=undefined;this.#recoveredNotes=[];this.#checkingPending=false;this.#menu.close(false);this.#menu.element.remove();this.#members=[];this.#activity=[];this.#memberBefore='0.0';this.#memberNext=null;this.#memberDraft=undefined;this.#context=false;this.#workspace=false;this.#queue=false; this.#appliedQuery=''; this.#communityFilter=''; this.#communityName=''; this.#choices=[]; this.#choiceBefore=0; this.#choiceNext=null; this.#error=''; this.#cursor=null; this.#before=0; this.#review=undefined; this.#draft=newDecisionDraft(); ++this.#epoch; this.#cid = undefined; this.#detail = undefined; this.#rows = []; this.#entries = []; this.#reason = ''; this.#pending = undefined; this.#confirm = false; this.#busy = false; this.#loading = false; this.#query = ''; this.#triagePending = undefined; this.#filters = { state: 'active', priority: 'all', assignment: 'all' }; this.#audio.pause(); this.element.replaceChildren(); }
  destroy(): void { this.hide();this.#menu.destroy(); this.#audio.destroy(); this.#unsubscribe(); }
  #valid(epoch: number): boolean { return epoch === this.#epoch && (this.#queue || !!this.#cid) && this.options.current() && this.#generation.identityCurrent(); }
  #resetGeneration(): void {
    const note = this.#draft.pending?.reason || this.#draft.reason || this.#pending?.reason || this.#reason;
    if (note.trim() && !this.#recoveredNotes.includes(note)) this.#recoveredNotes.push(note);
    this.#access=undefined;this.#review=undefined;this.#draft=newDecisionDraft();this.#detail=undefined;
    this.#pending=undefined;this.#triagePending=undefined;this.#reason='';this.#confirm=false;
    this.#rows=[];this.#entries=[];this.#members=[];this.#activity=[];if(this.#memberDraft)this.#memberDraft.held=true;
    this.#choices=[];this.#communityFilter=this.#communityName='';this.#choiceBefore=this.#before=0;
    this.#choiceNext=this.#cursor=null;this.#memberBefore='0.0';this.#memberNext=null;this.#audio.pause();
  }
  #request<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
    if (!this.#access?.current()) throw new ModerationGenerationError();
    return this.#access.request<T>(method,path,body as Record<string,unknown> | undefined);
  }
  #base(): string { return `/v1/communities/${this.#detail?.communityId ?? this.#cid}`; }
  #readBase(): string { return this.#base()+(this.#detail?.readOnly || this.#detail?.communityArchived ? '/moderation-history' : ''); }
  async showQueue(): Promise<void> { this.hide(); this.#queue=true; this.#state='open'; await this.refresh(); }
  async show(cid: string): Promise<void> { if (this.#queue || this.#cid !== cid) { this.hide(); this.#cid = cid; this.#state = 'open'; this.#before = 0; } await this.refresh(); }
  async refresh(paintSearch?: () => void): Promise<void> {
    if (!this.#valid(this.#epoch) || this.#busy) return;
    if(this.#draft.pending || this.#memberDraft?.pending&&!this.#memberDraft.held || this.#triagePending || this.#pending){await this.#checkPendingAccess();return;}
    const snapshot=()=>JSON.stringify([paintSearch ? null : this.#rows,this.#entries,this.#detail,this.#error,this.#decisions,this.#triage,this.#search,this.#choices,this.#communityName,this.#workspace,this.#members,this.#activity,paintSearch ? null : this.#cursor,this.#choiceNext,this.#memberNext,this.#review,this.#triagePending,this.#pending,this.#draft.pending,this.#generation.generation]);
    const epoch = ++this.#epoch, previous = snapshot();
    const paintLoading = !this.element.childElementCount;
    this.#loading = true; this.#error = ''; this.element.setAttribute('aria-busy', 'true');
    if (paintLoading) this.#render();
    try {
      const me = await this.client.request<{ features?: { reportTriage?: boolean; reportDecisions?: boolean; moderationQueue?: boolean; moderationWorkspace?: boolean } }>('GET', '/v1/me');
      if (!this.#valid(epoch)) return;
      if(this.#generation.accept(me))this.#resetGeneration();
      this.#access=this.#generation.capture();
      const workspace = this.#queue && me.features?.moderationWorkspace === true;
      if (workspace && !this.#workspace) this.#filters.state = 'unassigned';
      if (!workspace && this.#workspace) this.#filters.state = 'active';
      this.#workspace=workspace; this.#search = me.features?.moderationQueue === true; this.#triage = me.features?.reportTriage === true; this.#decisions = me.features?.reportDecisions === true; if (!this.#decisions) { this.#review=undefined; this.#draft=newDecisionDraft(); }
      if (this.#queue && !this.#search) throw new CloudError('queue_unsupported',404);
      if(!this.#workspace && ['requests','team','activity'].includes(this.#state))throw new CloudError('workspace_unsupported',404);
      if(this.#queue && !this.#detail){
        const choices=await this.#request<Page<CommunityChoice>>('GET',`/v1/me/moderation${this.#workspace?'/communities':''}?limit=40&cursor=${this.#choiceBefore}`);
        if(!this.#valid(epoch))return;this.#choices=choices.items;this.#choiceNext=choices.nextCursor;
        if (this.#workspace && !this.#choices.length && !this.#choiceBefore && this.#choiceNext === null) {
          this.#rows = []; this.#members = []; this.#activity = [];
          this.#memberDraft = undefined; this.#entries = []; this.#cursor = this.#memberNext = null;
          this.#communityName = this.#communityFilter = ''; this.#context = false;
          return;
        }
      }
      if (this.#detail) {
        const detail = await this.#request<Report>('GET', `${this.#readBase()}/reports/${this.#detail.id}`);
        if (!this.#valid(epoch)) return;
        if(detail.id!==this.#detail.id || (this.#access?.generation || detail.communityId!==undefined) && detail.communityId!==(this.#detail.communityId??this.#cid))throw new ModerationGenerationError();
        if (detail.status !== 'open') { this.#pending = undefined; this.#confirm = false; this.#audio.pause(); }
        if (this.#decisions) {
          const review = await this.#request<DecisionReview>('GET', `${this.#readBase()}/reports/${detail.id}/review`);
          if (!this.#valid(epoch)) return;
          if (review.id !== detail.id) throw new ModerationGenerationError();
          if (this.#review && (this.#review.status !== review.status ||
              !detail.message && ['warn','remove'].includes(this.#draft.action))) this.#draft = newDecisionDraft();
          else if (this.#review?.revision !== review.revision) this.#draft.confirm = false;
          this.#review = review;
        }
        this.#detail = detail; this.#triage = this.#triage && detail.priority !== undefined; if (detail.status !== 'open') this.#triagePending = undefined;
      } else if (this.#workspace && ['requests','team','activity'].includes(this.#state)) {
        const query=new URLSearchParams({limit:'40',cursor:this.#state==='activity'?String(this.#before):this.#memberBefore});
        if(this.#communityFilter)query.set('communityId',this.#communityFilter);
        if(this.#state!=='activity')query.set('kind',this.#state);
        const page=await this.#request<{items:ManagementMember[]&Activity[];nextCursor:string|number|null;community:CommunityChoice|null}>('GET',`/v1/me/moderation/workspace/${this.#state==='activity'?'activity':'members'}?${query}`);
        if(!this.#valid(epoch))return;
        this.#communityName=page.community?.name??'';
        if(this.#state==='activity'){this.#activity=page.items;this.#cursor=page.nextCursor as number|null;}
        else {this.#members=page.items;this.#memberNext=page.nextCursor as string|null;}
        if(this.#memberDraft&&!this.#memberDraft.held){
          const fresh=this.#members.find(m=>m.communityId===this.#memberDraft!.member.communityId&&m.memberNumber===this.#memberDraft!.member.memberNumber);
          if(!fresh||fresh.archived||fresh.revision!==this.#memberDraft.member.revision)this.#memberDraft=undefined;
        }
      } else if (this.#state === 'journal') {
        const page = await this.#request<Page<Entry>>('GET', `${this.#base()}/moderation?limit=40&cursor=${this.#before}`);
        if (!this.#valid(epoch)) return;
        this.#entries = page.items; this.#cursor = page.nextCursor;
      } else {
        const endpoint = this.#queue ? `/v1/me/moderation/${this.#workspace?'workspace/':''}reports` : `${this.#base()}/reports`;
        const query = new URLSearchParams({state:this.#triage ? (this.#state==='resolved'?'resolved':this.#filters.state) : this.#state,limit:'40',cursor:String(this.#before)});
        if(this.#triage){query.set('priority',this.#filters.priority);query.set('assignment',this.#filters.assignment);}
        if(this.#search)query.set('q',this.#appliedQuery);
        if(this.#queue && this.#communityFilter)query.set('communityId',this.#communityFilter);
        const page = await this.#request<Page<Report> & {community?:CommunityChoice|null}>('GET', `${endpoint}?${query}`);
        if (!this.#valid(epoch)) return;
        // A complete queue can be ranked locally. Partial pages retain the server's cursor order.
        this.#rows = this.#workspace && this.#before === 0 && page.nextCursor === null
          ? [...page.items].sort((a,b) => Number(b.priority === 'high') - Number(a.priority === 'high') || b.createdAt - a.createdAt)
          : page.items;
        this.#cursor = page.nextCursor; this.#communityName=page.community?.name ?? '';
      }
    } catch (e) {
      if (!this.#valid(epoch)) return;
      if(moderationGenerationConflict(e))this.#resetGeneration();
      this.#members=[];this.#activity=[];if(!this.#memberDraft?.held)this.#memberDraft=undefined;this.#review = undefined; this.#draft = newDecisionDraft(); this.#audio.pause(); this.#detail = undefined; this.#rows = []; this.#entries = []; this.#choices=[]; this.#communityName=''; this.#cursor=null; this.#pending = undefined; this.#triagePending = undefined;
      this.#error = moderationGenerationConflict(e) ? 'Reports changed after recovery. Refresh reports before deciding again.' : e instanceof CloudError && [403,404].includes(e.status) ? 'This moderation view is no longer available to you.' : 'Could not load reports. Try refreshing.';
    } finally {
      if (this.#valid(epoch)) {
        this.#loading = false;
        if (previous !== snapshot() || paintLoading) this.#render();
        else { this.element.setAttribute('aria-busy', 'false'); paintSearch?.(); }
      }
    }
  }
  async #checkPendingAccess():Promise<void> {
    if(this.#checkingPending||!this.#valid(this.#epoch))return;
    const epoch=this.#epoch;this.#checkingPending=true;this.#loading=true;this.element.setAttribute('aria-busy','true');
    try{
      const me=await this.client.request<{features?:{moderationWorkspace?:boolean;reportDecisions?:boolean}}>('GET','/v1/me');
      if(!this.#valid(epoch))return;
      const changed=this.#generation.accept(me);
      if(changed)this.#resetGeneration();
      this.#access=this.#generation.capture();
      if(changed){this.#checkingPending=false;await this.refresh();return;}
      if(this.#memberDraft?.pending){
        if(!me.features?.moderationWorkspace)throw new CloudError('workspace_unavailable',403);
        const c=await this.#request<{archived:boolean;canReview:boolean;canManage:boolean}>('GET',`/v1/communities/${this.#memberDraft.member.communityId}`);
        if(!this.#valid(epoch))return;
        if(c.archived||!c.canReview||this.#memberDraft.action==='role'&&!c.canManage)throw new CloudError('role_revoked',403);
      }else if((this.#draft.pending||this.#triagePending||this.#pending)&&this.#detail){
        if(this.#draft.pending&&!me.features?.reportDecisions)throw new CloudError('decisions_unavailable',403);
        const target=this.#detail;
        const result=await this.#request<Report>('GET',`${this.#base()}/reports/${target.id}`);
        if(!this.#valid(epoch))return;
        if(result.id!==target.id || (this.#access?.generation || result.communityId!==undefined) && result.communityId!==(target.communityId??this.#cid))throw new ModerationGenerationError();
      }
    }catch(e){if(this.#valid(epoch)&&moderationGenerationConflict(e)){this.#resetGeneration();this.#error='Reports changed after recovery. Refresh reports before deciding again.';this.#render();}
    else if(this.#valid(epoch)&&e instanceof CloudError&&[401,403,404].includes(e.status)){
      this.#memberDraft=undefined;this.#draft=newDecisionDraft();this.#review=undefined;this.#detail=undefined;this.#members=[];this.#rows=[];this.#choices=[];this.#activity=[];this.#audio.pause();this.#error='This view or your permissions changed. Refresh to check access.';this.#render();
    }}finally{if(epoch===this.#epoch){this.#checkingPending=false;this.#loading=false;if(this.#error)this.#render();else this.element.setAttribute('aria-busy','false');}}
  }
  #button(label: string, run: () => void, primary = false, accessibleName?: string): HTMLButtonElement {
    const button = element('button', { type: 'button', text: label, className: `kl-text-button${primary ? ' kl-text-button--primary' : ''}`, onClick: () => { if (this.#valid(this.#epoch) && this.element.isConnected && this.element.contains(button) && !this.#busy && !this.#loading) run(); } });
    if(accessibleName)button.setAttribute('aria-label',accessibleName);
    button.disabled = this.#busy || this.#loading || (!!this.#memberDraft?.pending && !['Retry change','Refresh reports','Moderation actions','Discard local attempt','Keep editing','Discard changes'].includes(label)) || (!!this.#draft.pending && !['Retry decision','Refresh reports','Moderation actions'].includes(label)); return button;
  }
  #render():void {
    clearTimeout(this.#searchTimer);
    this.#menu.close(false);
    this.#renderContent();
    if(this.#workspace)for(const b of this.element.querySelectorAll<HTMLButtonElement>(':scope > .kl-mod-header > .kl-mod-actions > button')){
      const name=b.textContent;if(name==='Moderation information'||name==='Refresh reports'){b.setAttribute('aria-label',name);b.title=name;b.classList.add('kl-mod-icon');b.replaceChildren(kikiIcon(name==='Refresh reports'?'refresh':'info'));}
    }
    const aside=this.element.querySelector<HTMLElement>(':scope > .kl-mod-context');
    if(aside){const main=element('div',{className:'kl-mod-content'});while(aside.nextSibling)main.append(aside.nextSibling);const columns=element('div',{className:'kl-mod-columns'},main,aside);this.element.append(columns);}
  }
  #selectView(state:string):void {
    if(!this.#valid(this.#epoch)||this.#busy||this.#loading||this.#draft.pending||this.#memberDraft?.pending)return;
    this.#review=undefined;this.#draft=newDecisionDraft();this.#state=state;this.#before=0;this.#memberBefore='0.0';this.#memberNext=null;this.#memberDraft=undefined;this.#members=[];this.#activity=[];this.#triagePending=undefined;this.#detail=undefined;this.#reason='';this.#appliedQuery=this.#query='';this.#pending=undefined;this.#confirm=false;this.element.replaceChildren();
    const refreshing = this.refresh(), epoch = this.#epoch;
    void refreshing.then(() => {
      if (this.#valid(epoch) && this.#state === state) this.element.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true });
    });
  }
  #moreActions():HTMLButtonElement {
    const b=this.#button('Moderation actions',()=>{
      const entries:ShellAction[]=[{label:'Activity',icon:'history',run:()=>this.#selectView('activity')},{label:'Refresh reports',icon:'refresh',run:()=>{if(this.#valid(this.#epoch))void this.refresh();}}];
      if(this.options.platform)entries.push({label:'Platform reports',icon:'shield',run:()=>{if(this.#valid(this.#epoch))this.options.platform?.();}});
      if(this.#triage&&this.#state==='open'&&!this.#detail)for(const [value,label]of triageFilterOptions[2][2])entries.push({label,icon:'profile',checked:this.#filters.assignment===value,separator:value==='all',run:()=>{if(!this.#valid(this.#epoch))return;this.#filters.assignment=value;this.#before=0;this.element.replaceChildren();void this.refresh();}});
      const epoch=this.#epoch;
      const allowed=this.#draft.pending||this.#memberDraft?.pending||this.#triagePending||this.#pending?entries.filter(action=>action.label==='Refresh reports'):entries;
      this.element.append(this.#menu.element);this.#menu.open(b,'Moderation actions',allowed.map(action=>({...action,run:()=>{if(this.#valid(epoch)&&this.element.isConnected&&this.element.contains(b)&&!this.#loading&&!this.#busy)action.run();}})));
    });b.setAttribute('aria-label','Moderation actions');b.setAttribute('aria-haspopup','menu');b.classList.add('kl-mod-icon');b.replaceChildren(kikiIcon('more'));return b;
  }
  #renderContent(): void {
    this.#audio.pausePlayback();
    this.element.classList.toggle('kl-community-workspace', this.#workspace);
    this.element.replaceChildren(); this.element.setAttribute('aria-busy', String(this.#loading || this.#busy));
    const detail = this.#detail;
    const noAccess = this.#workspace && !this.#loading && !this.#error && !this.#choices.length && !this.#choiceBefore && this.#choiceNext === null;
    if (detail) this.element.append(this.#backToReports(detail.id));
    const info = this.#button('Moderation information', () => {
      this.#context = !this.#context;
      this.#render();
      this.element.querySelector<HTMLButtonElement>('[aria-label="Moderation information"]')?.focus({ preventScroll: true });
    });
    info.setAttribute('aria-expanded', String(this.#context));
    this.element.append(element('header', { className: 'kl-mod-header' }, element('div', {},
      element('span', { className: 'kl-mod-eyebrow', text: 'KIKILINK · COMMUNITY TEAM' }),
      element('h1', { tabIndex: -1, text: detail ? `Report #${detail.id} · #${detail.channelName}` : this.#queue && !this.#workspace ? 'Community reports' : 'Community moderation' }),
      element('p', { className: 'kl-mod-note', text: detail ? `Channel message report${detail.communityName ? ' · '+detail.communityName : ''}` : this.#workspace ? 'Review reports, requests and roles within your current community access.'
        : this.#queue ? 'Reports from the communities you moderate.' : 'Review channel reports and earlier decisions.' })),
      element('div',{className:'kl-mod-actions'}, ...(this.#workspace ? [this.#moreActions(),...(!detail && this.options.myReports?[this.#button('My reports',this.options.myReports)]:[]),info] : this.#queue && this.options.back ? [this.#button('Back to moderation',this.options.back)] : []),...(!this.#workspace?[this.#button('Refresh reports', () => void this.refresh())]:[]))));
    if (!detail && !noAccess) {
      const tabs = element('nav', { className: 'kl-mod-tabs', ariaLabel: this.#workspace ? 'Community moderation' : 'Report views' });
      const views=this.#workspace?[['open','Queue'],['requests','Requests'],['team','Team']]:[['open','Open reports'],['resolved','Resolved reports'],...(this.#queue?[]:[['journal','Moderation log']])];
      tabs.setAttribute('role','tablist');
      for (const [state,label] of views) {
        const b = this.#button(label!, () => this.#selectView(state!));
        b.setAttribute('aria-pressed', String(this.#state === state));b.setAttribute('role','tab');b.setAttribute('aria-selected',String(this.#state===state));b.tabIndex=this.#state===state||this.#state==='activity'&&state==='open'?0:-1;tabs.append(b);
        b.addEventListener('keydown',e=>{const i=views.findIndex(v=>v[0]===state),n=views.length;const next=e.key==='ArrowRight'?(i+1)%n:e.key==='ArrowLeft'?(i+n-1)%n:e.key==='Home'?0:e.key==='End'?n-1:null;if(next===null)return;e.preventDefault();e.stopPropagation();(tabs.children[next] as HTMLButtonElement).click();});
      }
      this.element.append(tabs);
    }
    if (this.#error) {
      const alert = element('p', { className: 'kl-cm-status kl-mod-notice', tabIndex: -1, text: this.#error });
      alert.setAttribute('role', 'alert'); this.element.append(alert);
    }
    for(const note of this.#recoveredNotes)this.element.append(element('section',{className:'kl-mod-recovered-note'},element('p',{className:'kl-mod-note',text:'Saved decision note from before recovery. Review the current report before using it.'}),Object.assign(element('textarea',{ariaLabel:'Saved decision note'}),{readOnly:true,value:note})));
    if (this.#loading) {
      const status = element('p', { text: 'Checking access…' });
      status.setAttribute('role', 'status'); this.element.append(status); return;
    }
    if (this.#error && !this.#detail && !this.#memberDraft) return;
    if(this.#workspace && this.#context)this.element.append(element('aside',{className:'kl-mod-context',ariaLabel:'Moderation information'},element('h2',{text:'A careful review'}),element('p',{className:'kl-mod-note',text:'Your community role and channel permissions determine which reports you can review. The author can read a warning. Other decision notes stay with the moderation team.'}),element('p',{className:'kl-mod-note',text:'Archived communities are read-only. Report and decision history is kept for 30 days. Original content is not opened from archive history.'})));
    if (this.#detail) { this.#renderDetail(this.#detail); return; }
    if (noAccess) {
      this.element.append(element('section', { className:'kl-mod-empty kl-mod-no-access' }, kikiIcon('shield'),
        element('h2', { text:'No moderation access' }),
        element('p', { className:'kl-mod-note', text:'You need a current owner, administrator or moderator role in a joined community.' }),
        this.options.myReports ? this.#button('View my reports', this.options.myReports) : null));
      return;
    }
    if(this.#workspace && ['requests','team','activity'].includes(this.#state)){this.#renderManagement();return;}
    const serverSearch = this.#search && this.#state !== 'journal';
    const search = element('input', { ariaLabel: serverSearch ? 'Search community reports' : 'Search this moderation page' }); search.maxLength=160; search.type = 'search'; search.placeholder = 'Search reports…'; search.value = this.#query;
    const count = element('p', { className: 'kl-mod-count' }); count.setAttribute('role', 'status');
    const rows = element('div', { className: 'kl-cm-rows kl-mod-list' });
    const field = element('div', { className: 'kl-mod-search' }, search);
    const toolbar = element('div', { className: 'kl-mod-toolbar' }, field);
    const pager = element('div');
    let queryEpoch: number | undefined;
    const apply = (focus = true) => {
      clearTimeout(this.#searchTimer);
      if (!this.#valid(this.#epoch) || this.#busy || !this.element.contains(search) ||
          this.#loading && this.#epoch !== queryEpoch) return;
      this.#appliedQuery = search.value.trim(); this.#before = 0;
      if (this.#workspace) {
        rows.replaceChildren(); pager.replaceChildren(); count.textContent = 'Searching…';
      } else this.element.replaceChildren();
      const refreshing = this.refresh(this.#workspace ? paintRows : undefined), epoch = this.#epoch;
      queryEpoch = epoch;
      if (focus) void refreshing.then(() => {
        if (this.#valid(epoch) && !this.#detail) this.element.querySelector<HTMLInputElement>('.kl-mod-search input')?.focus({ preventScroll: true });
      });
    };
    if(serverSearch){
      const applyButton=this.#button('Search',apply);applyButton.setAttribute('aria-label','Search');applyButton.title='Search';applyButton.replaceChildren(kikiIcon('search'));field.append(applyButton);
      search.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();e.stopPropagation();apply();}});
    } else field.prepend(kikiIcon('search'));
    const clear = this.#button('Clear report search', () => {
      search.value = ''; this.#query = ''; clear.hidden = true;
      if (serverSearch) apply(); else { paintRows(); search.focus({ preventScroll:true }); }
    }, false, 'Clear report search');
    clear.title = 'Clear report search'; clear.hidden = !search.value;
    clear.classList.add('kl-mod-clear-search'); clear.replaceChildren(kikiIcon('close')); field.append(clear);
    if(this.#queue&&!this.#triage)this.#communitySelector(toolbar);
    if (this.#triage && this.#state !== 'journal') for (const [key,label,values] of triageFilterOptions) {
      if (key === 'state' && this.#state === 'resolved') continue;
      if (key === 'assignment' && this.#workspace) continue;
      const select = element('select', { ariaLabel: label });
      const options = key === 'state' && this.#workspace
        ? [['all','All'], ['unassigned','Open'], ['in_review','In review'], ['resolved','Resolved'], ['dismissed','Dismissed'], ['active','Open & in review']] as const
        : values;
      for (const [value,label] of options) {
        const text = this.#workspace && key === 'priority' && value === 'all' ? 'All priorities' : label;
        const option = element('option', { text }); option.value = value;
        option.selected = value === this.#filters[key]; select.append(option);
      }
      select.addEventListener('change', () => { if (!this.#valid(this.#epoch) || this.#busy || this.#loading || !this.element.contains(select)) return; this.#filters[key] = select.value; this.#before = 0; this.element.replaceChildren(); void this.refresh(); }); toolbar.append(select);if(key==='state'&&this.#queue)this.#communitySelector(toolbar);
    }
    if(this.#queue&&this.#triage&&this.#state==='resolved')this.#communitySelector(toolbar);
    this.element.append(toolbar, count, rows, pager);
    const paintRows = () => {
      rows.replaceChildren(); const query = this.#query.trim().toLocaleLowerCase(); let matches = 0;
      if (this.#state === 'journal') for (const row of this.#entries) {
        if (!`${row.action} ${row.channelName} ${row.reason}`.toLocaleLowerCase().includes(query)) continue; matches++;
        rows.append(element('article', { className: 'kl-mod-row' }, element('div', { className: 'kl-mod-main' },
          element('h3', { text: `${row.action.replaceAll('_',' ')} · #${row.channelName}` }), element('p', { text: row.reason }),
          element('small', { text: `${this.options.name(row.moderator)} · #${row.moderator} · ` }), bindClockText(element('time'), row.createdAt, 'numeric-date-time'))));
      } else for (const row of this.#rows) {
        if (!serverSearch && !`${row.id} ${row.channelName} ${row.reason}`.toLocaleLowerCase().includes(query)) continue; matches++;
        const priority = row.priority && (!this.#workspace || row.priority === 'high') ? element('span', { className: 'kl-mod-badge', text: row.priority === 'high' ? 'High priority' : 'Standard' }) : undefined;
        if (priority) priority.dataset.priority = row.priority;
        const stamp = element('small', { className: 'kl-mod-row-meta' },
          this.#workspace && row.communityName ? row.communityName + ' · ' : null,
          bindClockText(element('time'), row.createdAt, 'numeric-date-time'),
          row.priority && (!this.#workspace || row.assignedTo != null) ? ` · ${assignedLabel(row, this.client.memberNumber)}` : null);
        rows.append(element('article', { className: 'kl-mod-row' }, element('div', { className: 'kl-mod-main' },
          element('div', { className: 'kl-mod-status' }, element('span', { className: 'kl-mod-badge', text: reportStatus(row) }), priority, element('small', { text: 'Channel message' }), ...(row.communityArchived ? [element('span',{className:'kl-mod-badge',text:'Archived community'})] : []), ...(row.archived ? [element('span', { className: 'kl-mod-badge', text: 'Archived channel' })] : [])),
          element('h3', { text: `${this.#queue && row.communityName ? row.communityName+' · ' : ''}#${row.channelName}` }), element('p', { text: row.reason }), stamp),
          element('div', { className: 'kl-mod-row-actions' }, this.#button('Review report', () => {
            this.#review=undefined; this.#draft=newDecisionDraft(); this.#detail = row; this.#reason = ''; this.#confirm = false;
            this.element.replaceChildren(); const refreshing = this.refresh(), epoch = this.#epoch;
            void refreshing.then(() => {
              if (!this.#valid(epoch) || this.#detail?.id !== row.id) return;
              const settingsPane = this.element.closest<HTMLElement>('.kl-settings-panel');
              if (settingsPane) settingsPane.scrollTop = 0;
              this.element.querySelector<HTMLElement>('.kl-mod-header h1')?.focus({ preventScroll: !!settingsPane });
            });
          },false,`Review report #${row.id}`))));
      }
      count.textContent = `${matches} ${matches === 1 ? 'entry' : 'entries'} on this page${serverSearch ? '' : ' · Search applies to the loaded page.'}${this.#workspace&&this.#filters.assignment!=='all'?' · '+(this.#filters.assignment==='mine'?'Assigned to me':'Unassigned'):''}`;
      if (this.#workspace) {
        count.textContent = `${matches} ${matches === 1 ? 'report' : 'reports'} in communities you moderate` +
          (this.#cursor !== null || this.#before ? ' · This page' : '') +
          (this.#filters.assignment === 'mine' ? ' · Assigned to me' : this.#filters.assignment === 'unassigned' ? ' · Unassigned' : '');
      }
      if (this.#workspace && !matches && !this.#error) {
        rows.append(element('section', {className:'kl-mod-empty'}, kikiIcon('shield'),
          element('h2', {text:'Your queue is clear'}),
          element('p', {className:'kl-mod-note', text:this.#cursor !== null
            ? 'No matches in this batch. Continue to search older reports.' : 'Try another status or community to review earlier decisions.'}),
          this.#button('Reset filters', () => {
            this.#query = this.#appliedQuery = this.#communityFilter = this.#communityName = '';
            this.#filters = {state:'all', priority:'all', assignment:'all'};
            this.#before = this.#choiceBefore = 0;
            this.element.replaceChildren();
            const refresh = this.refresh(), epoch = this.#epoch;
            void refresh.then(() => { if (this.#valid(epoch)) this.element.querySelector<HTMLInputElement>('.kl-mod-search input')?.focus({preventScroll:true}); });
          })));
      } else if (!matches && !this.#error) rows.append(element('section', { className: 'kl-mod-empty' }, kikiIcon('shield'), element('h2', { text: query ? 'No matching entries' : this.#state === 'journal' ? 'No moderation decisions yet.' : 'No reports in this view.' }),
        element('p', { className: 'kl-mod-note', text: serverSearch && this.#cursor !== null ? 'No matches in this batch. Continue to search older reports.' : query ? 'Try another search.' : 'Refresh to check for changes.' })));
      pager.replaceChildren();
      if (this.#cursor !== null) pager.append(this.#button('Older entries', () => { this.#before = this.#cursor!; this.element.replaceChildren(); void this.refresh(); }));
      if (this.#before) pager.append(this.#button('Back to latest', () => { this.#before = 0; this.element.replaceChildren(); void this.refresh(); }));
    };
    const input = (composing: boolean) => {
      if (!this.element.contains(search)) return;
      this.#query = search.value; clear.hidden = !search.value;
      if (!serverSearch) { paintRows(); return; }
      if (!this.#workspace) return;
      clearTimeout(this.#searchTimer);
      if (this.#loading && this.#epoch === queryEpoch) {
        this.#epoch++; this.#loading = false; this.element.setAttribute('aria-busy','false');
      }
      if (!composing) this.#searchTimer = setTimeout(() => apply(false), 250);
    };
    search.addEventListener('input', event => input((event as InputEvent).isComposing));
    search.addEventListener('compositionstart', () => input(true));
    search.addEventListener('compositionend', () => input(false));
    paintRows();
  }
  #communitySelector(toolbar:HTMLElement):void {
      const select=element('select',{ariaLabel:'Community filter'});
      const choices=[{id:'',name:'All communities'},...this.#choices];
      if(this.#communityFilter && !choices.some(c=>c.id===this.#communityFilter))choices.push({id:this.#communityFilter,name:this.#communityName});
      for(const c of choices){const o=element('option',{text:c.name+(c.archived?' · Archived':'')});o.value=c.id;o.selected=c.id===this.#communityFilter;select.append(o);}
      select.addEventListener('change',()=>{if(!this.#valid(this.#epoch)||this.#loading||!this.element.contains(select))return;this.#communityFilter=select.value;this.#before=0;this.#memberBefore='0.0';this.#memberDraft=undefined;this.element.replaceChildren();void this.refresh();});toolbar.append(select);
      if(this.#choiceNext!==null)toolbar.append(this.#button('More communities',()=>{this.#choiceBefore=this.#choiceNext!;this.element.replaceChildren();void this.refresh();}));
      if(this.#choiceBefore)toolbar.append(this.#button('First communities',()=>{this.#choiceBefore=0;this.element.replaceChildren();void this.refresh();}));
  }
  #renderManagement():void {
    const toolbar=element('div',{className:'kl-mod-toolbar'});this.#communitySelector(toolbar);this.element.append(toolbar);
    const activity=this.#state==='activity',requests=this.#state==='requests',rows=element('div',{className:'kl-mod-list'});
    if(activity)this.element.append(element('h2',{text:'Activity'}));
    const summary = element('p', { className: activity ? 'kl-mod-note' : requests ? 'kl-mod-count' : 'kl-mod-team-summary',
      text: activity ? 'Membership and community changes · Last 30 days.' : requests ? `${this.#members.length} pending requests on this page` : `${this.#members.length} members on this page · Roles and membership are shared with community management.` });
    if (!activity) summary.setAttribute('role', 'status');
    this.element.append(summary, rows);
    if(activity){
      for(const r of this.#activity)rows.append(element('article',{className:'kl-mod-row'},element('div',{className:'kl-mod-main'},element('h3',{text:r.action.replaceAll('_',' ')}),element('p',{text:r.communityName+(r.archived?' · Archived':'')}),element('small',{text:`#${r.actor} · `}),bindClockText(element('time'),r.createdAt,'numeric-date-time'))));
    }else for(const m of this.#members){
      const identity=m.displayName??`Member #${m.memberNumber}`;
      const heading=element('h3',{text:identity+(m.memberNumber===this.client.memberNumber?' · You':'')});
      const badge=element('span',{className:'kl-mod-badge',text:requests?'Pending':(memberRoleLabels[m.role]??m.role)});
      if(m.role==='owner'||m.role==='admin')badge.dataset.priority='high';
      const meta = element('small', { text: m.communityName + (m.username ? ` · @${m.username}` : '') });
      if (requests) meta.append(' · ', bindClockText(element('time'), m.updatedAt, 'numeric-date-time'));
      const main=element('div',{className:'kl-mod-main'},element('div',{className:'kl-mod-member-heading kl-mod-status'},heading,requests?badge:null,
        m.archived?element('span',{className:'kl-mod-badge',text:'Archived · Read-only'}):null),meta);
      const card=element('article',{className:`kl-mod-row ${requests?'kl-mod-request-row':'kl-mod-team-row'}`},main);
      const actions=element('div',{className:'kl-mod-row-actions kl-mod-member-actions'});
      const memberButton = (label: string, action: MemberDraft['action'], primary = false) => {
        const button = this.#button(label, () => {
          this.#memberDraft = { member: m, action, role: m.role, generation: this.#access?.generation };
          this.#render();
        }, primary);
        button.dataset.memberAction = JSON.stringify([m.communityId, m.memberNumber, action]);
        return button;
      };
      if(requests){
        if(m.canReview)actions.append(memberButton('Approve…','approve',true),memberButton('Decline…','decline'));
      }else{
        actions.append(badge);
        if(m.roles.length)actions.append(memberButton('Change role…','role'));
        else if(!m.archived)actions.append(element('small',{className:'kl-mod-note',text:m.role==='owner'||m.memberNumber===this.client.memberNumber?'Protected role':m.role==='admin'?'Owner access required':'Administrator access required'}));
      }
      if(actions.childElementCount)card.append(actions);
      rows.append(card);
    }
    if(!(activity?this.#activity:this.#members).length)rows.append(element('section',{className:'kl-mod-empty'},kikiIcon('shield'),element('h2',{text:activity?'No activity in this view':this.#state==='requests'?'No join requests':'No members in this view'}),element('p',{className:'kl-mod-note',text:'Choose another community or refresh to check for changes.'})));
    const next=activity?this.#cursor:this.#memberNext;
    if(next!==null)this.element.append(this.#button('Next page',()=>{if(activity)this.#before=next as number;else this.#memberBefore=next as string;this.element.replaceChildren();void this.refresh();}));
    if(activity?this.#before:this.#memberBefore!=='0.0')this.element.append(this.#button('Back to first page',()=>{this.#before=0;this.#memberBefore='0.0';this.element.replaceChildren();void this.refresh();}));
    if(this.#state==='team'){
      const table=element('table',{className:'kl-mod-role-matrix'}),body=element('tbody');
      const roleColumn = element('th', { text: 'Role' }), permissionsColumn = element('th', { text: 'Community permissions' });
      roleColumn.scope = permissionsColumn.scope = 'col';
      const head = element('thead', {}, element('tr', {}, roleColumn, permissionsColumn));
      for (const [name, description] of [['Moderator','Review channel reports and join requests.'],['Administrator','Also manage member and moderator roles.'],['Owner','Also appoint administrators. Ownership is managed in the community.']]) {
        const role = element('th', { text: name! }); role.scope = 'row';
        body.append(element('tr', {}, role, element('td', { text: description! })));
      }
      table.append(head,body);this.element.append(element('section',{className:'kl-mod-evidence kl-mod-role-guide'},element('h2',{text:'Who can do what?'}),table,element('p',{className:'kl-mod-note',text:'Your own role and the owner are protected. Changes use your current permissions.'})));
    }
    if(this.#memberDraft)this.#renderMemberDialog();
  }
  #focusMemberAction(draft: MemberDraft, epoch: number): void {
    if (!this.#valid(epoch) || this.#memberDraft) return;
    const action = JSON.stringify([draft.member.communityId, draft.member.memberNumber, draft.action]);
    const opener = [...this.element.querySelectorAll<HTMLButtonElement>('button[data-member-action]')]
      .find(button => !button.disabled && button.dataset.memberAction === action);
    (opener ?? this.element.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]'))?.focus({ preventScroll: true });
  }
  #renderMemberDialog():void {
    const d=this.#memberDraft!,m=d.member,role=d.action==='role';
    const close=()=>{const epoch=this.#epoch;this.#memberDraft=undefined;this.#render();queueMicrotask(()=>this.#focusMemberAction(d,epoch));};
    const cancel=()=>{if(this.#busy||d.pending)return;if(role&&d.role!==m.role){d.discard=true;this.#render();}else close();};
    const member = element('strong', { text: m.displayName ?? `Member #${m.memberNumber}` });
    const body=element('div',{className:'kl-mod-dialog-body'});
    const footer=element('footer',{className:'kl-mod-actions kl-mod-dialog-footer'});
    if(role){
      body.append(element('div', { className: 'kl-mod-report-target kl-mod-member-target' }, member,
        element('small', { text: `${m.communityName} · ${memberRoleLabels[m.role] ?? m.role}` })));
      const select=element('select',{ariaLabel:'New role'});
      for(const value of m.roles){const option=element('option',{text:memberRoleLabels[value]??value});option.value=value;select.append(option);}select.value=d.role;select.disabled=this.#busy||!!d.pending||!!d.held;
      select.addEventListener('change',()=>{if(select.isConnected&&!select.disabled){d.role=select.value;this.#render();}});
      body.append(element('label',{},element('span',{text:'New role'}),select),element('p',{className:'kl-mod-note',text:'The member’s community permissions change when you confirm.'}));
    }else body.append(element('div', { className: 'kl-mod-member-confirm' }, member,
      element('p', { text: m.communityName }), element('p', { text: d.action === 'approve'
        ? 'Approve this request and add this person to the community?' : 'Decline this request? They will not join the community.' })));
    if(d.discard){body.append(element('p',{className:'kl-mod-notice',text:d.pending?'The change may already have completed. Discard only this local attempt?':'Discard the unsaved role selection?'}));footer.append(this.#button('Keep editing',()=>{d.discard=false;this.#render();},true),this.#button('Discard changes',close));}
    else if(d.held){body.append(element('p',{className:'kl-mod-notice',text:'The community state changed. The original action is kept here and cannot be retried.'}));footer.append(this.#button('Discard local attempt',()=>{d.discard=true;this.#render();}));}
    else if(d.pending){body.append(element('p',{className:'kl-mod-notice',text:this.#busy?'Saving change…':'The change was not confirmed. Retry sends the same change.'}));footer.append(this.#button('Retry change',()=>void this.#applyMember(),true),this.#button('Discard local attempt',()=>{d.discard=true;this.#render();}));}
    else {const submit=this.#button(role?'Confirm role change':d.action==='approve'?'Approve request':'Decline request',()=>void this.#applyMember(),true);submit.disabled ||= role&&d.role===m.role;footer.append(this.#button('Cancel',cancel),submit);}
    this.element.append(moderationDialog(role?'Change a team role':d.action==='approve'?'Approve this request?':'Decline this request?',body,footer,cancel));
  }
  async #applyMember():Promise<void> {
    const d=this.#memberDraft;if(!d||d.held||!this.#valid(this.#epoch)||this.#busy||this.#loading||d.member.archived)return;
    if(!d.pending&&d.action==='role'&&(!d.member.roles.includes(d.role)||d.role===d.member.role))return;
    const body=d.pending??{operationId:crypto.randomUUID(),revision:d.member.revision,action:d.action,...(d.action==='role'?{role:d.role}:{})};
    d.pending=body;this.#busy=true;this.#error='';const epoch=this.#epoch;this.#render();
    try{
      const me=await this.client.request<{directRecovery?:{generation?:unknown;restored?:unknown}}>('GET','/v1/me');
      if(!this.#valid(epoch)||this.#memberDraft!==d)return;
      this.#memberGeneration.accept(me);const access=this.#memberGeneration.capture();
      if(d.generation&&me.directRecovery?.generation!==d.generation||access.generation&&access.generation!==d.generation||!access.generation&&me.directRecovery?.restored===true)throw new ModerationGenerationError();
      const receipt=await access.request<{communityId:string}>('POST',`/v1/communities/${d.member.communityId}/members/${d.member.memberNumber}`,body);
      if(access.generation&&receipt?.communityId!==d.member.communityId)throw new ModerationGenerationError();
      if(!this.#valid(epoch))return;this.#memberDraft=undefined;this.element.replaceChildren();
    }catch(e){if(!this.#valid(epoch))return;
      if(moderationGenerationConflict(e)&&(this.client.connected||e instanceof CloudError)){d.held=true;this.#error='The community state changed. Review the preserved action before discarding it.';}
      else this.#error='The change was not confirmed. Retry sends the same change.';
    }finally{if(this.#valid(epoch)){
      this.#busy=false;
      if(!this.#error){const refreshing=this.refresh(),refreshEpoch=this.#epoch;await refreshing;this.#focusMemberAction(d,refreshEpoch);}
      else this.#render();
    }}
  }
  #backToReports(reportId: number): HTMLButtonElement {
    const back = this.#button('Back to reports', () => {
      this.#review=undefined; this.#draft=newDecisionDraft(); this.#detail = undefined; this.#pending = undefined; this.#triagePending = undefined; this.#confirm = false;
      this.element.replaceChildren(); const refreshing = this.refresh(), epoch = this.#epoch;
      void refreshing.then(() => {
        if (this.#valid(epoch) && !this.#detail) (this.element.querySelector<HTMLElement>(`[aria-label="Review report #${reportId}"]`) ?? this.element.querySelector<HTMLElement>('.kl-mod-header h1'))?.focus();
      });
    });
    back.classList.add('kl-mod-back'); back.prepend(kikiIcon('back'));
    return back;
  }
  #renderDetail(report: Report): void {
    const concern = concerns.find(reason => reason.id === report.reasonCode)?.label;
    const details = concern && (report.reason === concern || concern.length < 5 && report.reason === concern + ' report') ? ''
      : concern && report.reason.startsWith(concern + ': ') ? report.reason.slice(concern.length + 2) : report.reason;
    const facts = element('dl', { className: 'kl-mod-meta' });
    for (const [label, value] of [
      ...(concern ? [['Reason', concern]] : []),
      ['Submitted', bindClockText(element('time'), report.createdAt, 'numeric-date-time')],
      ['Reporter', report.reporter === this.client.memberNumber ? `You (#${report.reporter})` : `#${report.reporter}`],
      ...(report.priority ? [['Assigned to', report.assignedTo == null ? 'Unassigned' : report.assignedTo === this.client.memberNumber ? 'You' : '#'+report.assignedTo]] : []),
      ...(!report.message || report.readOnly ? [['Message author', `#${report.author}`]] : []),
    ] as [string, string|HTMLElement][]) facts.append(element('div', {}, element('dt', { text: label }), element('dd', {}, value)));
    const priority = report.priority ? element('span', { className: 'kl-mod-badge', text: report.priority === 'high' ? 'High priority' : 'Standard' }) : undefined;
    if (priority) priority.dataset.priority = report.priority;
    const card = element('article', { className: 'kl-cm-report-detail kl-mod-detail' },
      element('div', { className: 'kl-mod-status' }, element('span', { className: 'kl-mod-badge', text: reportStatus(report) }), priority, report.archived ? element('span', { className: 'kl-mod-badge', text: 'Archived channel' }) : null),
      facts, element('h2', { className: 'kl-mod-details-title', text: 'Report details' }), element('p', { className: 'kl-mod-copy', text: details || 'No additional details were provided.' }));
    this.element.append(card);

    if (report.readOnly) this.element.append(element('p', { className: 'kl-mod-notice', text: 'Archived community history · Changes are paused. Original messages and media are unavailable in this read-only view.' }));
    else if (report.message || report.status === 'open') {
      const evidence = element('section', { className: 'kl-mod-evidence' }, element('h2', { text: 'Reported content' }));
      this.element.append(evidence);
      if (report.message) {
        if (report.message.text) evidence.append(element('blockquote', { text: report.message.text }));
        const scope = { communityId: report.communityId ?? this.#cid!, id: report.id };
        if (report.message.mediaIds.length) evidence.append(element('div', { className: 'kl-message-media' }, ...report.message.mediaIds.map(id => (this.#access?.generation ? this.options.image?.(id, scope, this.#access.generation) : this.options.image?.(id, scope)) ?? element('span', { text: 'Reported image' }))));
        for (const id of report.message.audioIds) evidence.append(this.#audio.render(id, `${this.#base()}/reports/${report.id}/audio/${id}/playback`, this.#access));
        evidence.append(element('p', { className: 'kl-mod-note', text: `Message author #${report.author}` }));
      } else evidence.append(element('p', { className: 'kl-mod-copy', text: 'The original message is no longer available. You can close this report with a reason.' }));
    }
    if (!this.#decisions && report.status !== 'open') {
      if (report.resolution || report.resolvedBy != null) this.element.append(element('section', { className: 'kl-mod-evidence' },
        element('h2', { text: 'Latest decision' }), element('p', { className: 'kl-mod-copy', text: report.resolution || 'No note added.' }),
        report.resolvedBy != null ? element('p', { className: 'kl-mod-note', text: `Moderator #${report.resolvedBy}` }) : null));
      return;
    }
    if (this.#decisions && this.#review) {
      if (this.#review.history.items.length) this.element.append(decisionHistory(this.#review.history.items));
      if (this.#review.history.nextCursor !== null) this.element.append(this.#button('Older decisions', () => void this.#olderDecisions()));
    }
    if (report.readOnly) return;
    const controls = this.#decisions && this.#review && !this.#triagePending
      ? decisionControls(this.#review, this.#draft, { available: !!report.message, initialAction: 'warn', disabled: this.#busy || this.#loading,
          button: (label, run, primary) => this.#button(label, run, primary), render: () => this.#render(), submit: () => void this.#applyDecision(),
          target: { title: `#${report.channelName}`, type: 'Channel message', reference: `${report.communityName ? report.communityName + ' · ' : ''}Report #${report.id}` } })
      : undefined;
    if (this.#triage && report.priority && report.status === 'open') this.element.append(triageControls(report, {
      actor: this.client.memberNumber, disabled: this.#busy || this.#loading || !!this.#pending || !!this.#draft.pending, pending: !!this.#triagePending, decision: controls,
      button: (label, run) => { const b = this.#button(label, run); if (this.#pending || this.#draft.pending) b.disabled = true; return b; },
      change: input => void this.#changeTriage(input), retry: () => void this.#changeTriage() }));
    else if (controls) this.element.append(controls);
    if (this.#triagePending || controls) return;
    const decision = element('section', { className: 'kl-mod-decision' }, element('h2', { text: 'Review decision' })); this.element.append(decision);
    const reason = element('textarea', { ariaLabel: 'Decision reason' }); reason.placeholder = 'Explain your decision (at least 5 characters)'; reason.maxLength = 1000; reason.value = this.#reason; reason.disabled = this.#busy || !!this.#pending;
    reason.addEventListener('input', () => { this.#reason = reason.value; }); decision.append(element('label', {}, element('span', { text: 'Decision reason' }), reason));
    const actions = element('div', { className: 'kl-cm-actions kl-mod-actions' }); decision.append(actions);
    if (this.#pending) actions.append(this.#button('Retry decision', () => void this.#resolve(report, this.#pending!.action), true));
    else if (this.#confirm) { decision.append(element('p', { text: 'Remove this message and its attachments for everyone? All open reports for it will be closed.' })); actions.append(this.#button('Confirm removal', () => void this.#resolve(report, 'remove'), true), this.#button('Cancel removal', () => { this.#confirm = false; this.#render(); })); }
    else { actions.append(this.#button(report.message ? 'Dismiss report' : 'Close unavailable report', () => void this.#resolve(report, 'dismiss'))); if (report.message) actions.append(this.#button('Remove message', () => { this.#confirm = true; this.#render(); })); }
  }
  async #changeTriage(input?: TriageChange): Promise<void> {
    const report = this.#detail;
    if (!this.#valid(this.#epoch) || this.#busy || this.#loading || !this.#triage || !!this.#pending || !!this.#draft.pending || report?.readOnly || !report?.revision || report.status !== 'open') return;
    const body = this.#triagePending ?? (input ? { ...input, operationId: crypto.randomUUID(), revision: report.revision } : undefined);
    if (!body) return;
    this.#triagePending = body; this.#busy = true; this.#error = ''; this.#confirm = false;
    const epoch = this.#epoch; this.#render();
    try {
      await this.#request('POST', `${this.#base()}/reports/${report.id}/triage`, body);
      if (!this.#valid(epoch)) return;
      this.#triagePending = undefined;this.element.replaceChildren();
    } catch (e) {
      if (!this.#valid(epoch)) return;
      if(moderationGenerationConflict(e)){this.#resetGeneration();this.#error='Reports changed after recovery. Refresh reports before deciding again.';}
      else if (e instanceof CloudError && [401,403,404,409].includes(e.status)) {
        this.#detail = undefined; this.#triagePending = undefined; this.#pending = undefined; this.#rows = []; this.#cursor = null; this.#audio.pause();
        this.#error = 'This report or your permissions changed. Refresh before changing it again.';
      } else this.#error = 'The change was not confirmed. Retry sends the same change.';
    } finally { if (this.#valid(epoch)) { this.#busy = false; if (!this.#error) await this.refresh(); else this.#render(); } }
  }
  async #applyDecision(): Promise<void> {
    const report = this.#detail;
    if (!this.#valid(this.#epoch) || this.#busy || this.#loading || !this.#decisions || report?.readOnly || !report?.revision || (!this.#draft.confirm && !this.#draft.pending)) return;
    const body = this.#draft.pending ?? { operationId: crypto.randomUUID(), revision: report.revision, action: this.#draft.action, reason: this.#draft.reason.trim() };
    this.#draft.pending = body; this.#busy = true; this.#error = ''; const epoch = this.#epoch; this.#render();
    try {
      await this.#request('POST', `${this.#base()}/reports/${report.id}/decision`, body);
      if (!this.#valid(epoch)) return; this.#draft = newDecisionDraft();
    } catch (e) {
      if (!this.#valid(epoch)) return;
      if(moderationGenerationConflict(e)){this.#resetGeneration();this.#error='Reports changed after recovery. Refresh reports before deciding again.';}
      else if (e instanceof CloudError && [400,401,403,404,409].includes(e.status)) { this.#detail=undefined; this.#review=undefined; this.#draft=newDecisionDraft(); this.#audio.pause(); this.#rows = []; this.#cursor = null; this.#error = 'This report or your permissions changed. Refresh before deciding again.'; }
      else this.#error = 'The decision was not confirmed. Retry sends the same decision.';
    } finally {
      if (this.#valid(epoch)) {
        this.#busy = false;
        if (!this.#error) {
          await this.refresh();
          if (this.options.current() && this.#detail?.id === report.id && !this.element.querySelector('dialog')) {
            const heading = this.element.querySelector<HTMLElement>('.kl-mod-history h2') ?? this.element.querySelector<HTMLElement>('.kl-mod-header h1');
            if (heading) { heading.tabIndex = -1; heading.focus(); }
          }
        } else {
          this.#render();
          if (!this.#detail) this.element.querySelector<HTMLElement>('[role="alert"]')?.focus();
        }
      }
    }
  }
  async #olderDecisions(): Promise<void> {
    if (!this.#detail || !this.#review || this.#review.history.nextCursor === null || this.#busy || this.#draft.pending || this.#memberDraft?.pending) return;
    const epoch=this.#epoch, report=this.#detail, review=this.#review; this.#busy=true;this.#render();
    try {
      const page=await this.#request<DecisionReview['history']>('GET',`${this.#readBase()}/reports/${report.id}/decisions?limit=20&cursor=${review.history.nextCursor}`);
      if (!this.#valid(epoch)) return; review.history={items:[...review.history.items,...page.items],nextCursor:page.nextCursor};
    } catch (e) { if (this.#valid(epoch)) { if(moderationGenerationConflict(e))this.#resetGeneration();this.#detail=undefined; this.#review=undefined; this.#draft=newDecisionDraft(); this.#audio.pause(); this.#rows=[]; this.#cursor=null; this.#error='Decision history is no longer available. Refresh to check access.'; } }
    finally { if (this.#valid(epoch)) { this.#busy=false; this.#render(); } }
  }
  async #resolve(report: Report, action: string): Promise<void> {
    if (this.#busy || this.#loading || !this.#valid(this.#epoch) || report.readOnly || report!==this.#detail) return;
    if (this.#reason.trim().length < 5) { this.#error = 'Add a decision reason of at least 5 characters.'; this.#render(); return; }
    const body = this.#pending ?? { operationId: crypto.randomUUID(), revision: report.revision, action, reason: this.#reason.trim() };
    this.#pending = body; this.#busy = true; this.#error = ''; const epoch = this.#epoch; this.#render();
    try {
      await this.#request('POST', `${this.#base()}/reports/${report.id}/resolve`, body);
      if (!this.#valid(epoch)) return;
      this.#pending = undefined; this.#reason = ''; this.#confirm = false;
    } catch (error) {
      if (!this.#valid(epoch)) return;
      if(moderationGenerationConflict(error)){this.#resetGeneration();this.#error='Reports changed after recovery. Refresh reports before deciding again.';}
      else if (error instanceof CloudError && [403,404,409].includes(error.status)) {
        this.#pending = undefined; this.#detail = undefined; this.#rows = []; this.#audio.pause();
        this.#error = 'This report or your permissions changed. Refresh before deciding again.';
      } else this.#error = 'The decision was not confirmed. Retry sends the same decision.';
    } finally { if (this.#valid(epoch)) { this.#busy = false; if (!this.#error) await this.refresh(); else this.#render(); } }
  }
}
